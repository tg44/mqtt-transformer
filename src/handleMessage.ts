import {AllSupportedOps, ConstantDef, MetricsData} from "./types";
import mqttMatch from "mqtt-match";
import {evaluateTransformAndEmitLogic} from "./operators";
import {hasKey} from "./utils";

export type PublishFunc = (topic: string, message: string) => void

export const parseMessage = (message: string, topic: string, configs: AllSupportedOps[], isVerbose: boolean): undefined | Record<string,any> => {
    let msg: any;
    try {
        msg = JSON.parse(message)
        msg = fixupMessageForJsoneKeys(msg)
        if(isVerbose) {
            console.info("")
            console.info("Message from topic " + topic)
            console.info("  parsed: " + JSON.stringify(configs, null, 2))
        }
    } catch (error) {
        console.error('Json parse on topic ' + topic + ' message was; ' + message)
        console.error(error);
        return undefined;
    }
    return msg;
}

export const handleMessage = (
    topic: string,
    message: string,
    time: number,
    transforms: AllSupportedOps[],
    constants: ConstantDef[],
    mqttData: Map<string, any>,
    timerData: Map<number, object>,
    metricsData: Map<string, MetricsData>,
    publisher: PublishFunc,
    isVerbose: boolean
) => {
    const configs = transforms.filter(element => element.fromTopics.some(subscription => mqttMatch(subscription, topic)));
    const msg = parseMessage(message, topic, configs, isVerbose)
    if(msg === undefined) {
        return
    }
    if(isVerbose) {
        console.info("  Logic will run for " + configs.map(c => c.id))
    }
    configs.forEach( c => {
        let enchancedMsg = msg
        enchancedMsg = prepareTransformation(c, msg)
        const messageIsObject = typeof enchancedMsg === 'object' && !Array.isArray(enchancedMsg) && enchancedMsg !== null
        if(isVerbose && !messageIsObject && (c.topicKeyToMessage || c.useConstants || c.useMetrics)) {
            console.warn(`topicKeyToMessage, useConstants and useMetrics needs scalar values to be wrapped! ${c.id}`)
        }
        if(messageIsObject && c.topicKeyToMessage && c.topicKeyToMessage.trim()){
            enchancedMsg[c.topicKeyToMessage.trim()] = topic
        }
        const additionalConstants: {[key: string]: any} = {}
        if(c.useConstants) {
            Object.entries(c.useConstants).forEach(([k, v]) => {
                const t = constants.find(cons => cons.name === v)
                if(t) {
                    additionalConstants[k] = t.value
                    if(messageIsObject) {
                        enchancedMsg[k] = t.value
                    }
                }
            })
        }
        const topicMatcher = c.fromTopics.find(subscription => mqttMatch(subscription, topic))
        if(topicMatcher) {
            mqttData.set(c.id + topicMatcher, enchancedMsg)
            if(messageIsObject && c.useMetrics) {
                const metrics = updateMetricsData(metricsData, c.id + topicMatcher, time)
                Object.entries(c.useMetrics).forEach(([k, v]) => {
                    if(typeof v === 'string' && hasKey(metrics, v)) {
                        enchancedMsg[k] = metrics[v]
                    }
                })
            }
        }
        evaluateTransformAndEmitLogic(c, mqttData, timerData, additionalConstants, publisher, isVerbose)
    })
}

function updateMetricsData(metricsData: Map<string, MetricsData>, topic: string, time: number): MetricsData {
    const d = metricsData.get(topic)
    if(d) {
        d.prevMessageTime = d.lastMessageTime
        d.lastMessageTime = time
        d.messageCount += 1
        return d
    } else {
        const nd = {
            firstMessageTime: time,
            lastMessageTime: time,
            prevMessageTime: time,
            messageCount: 1,
        }
        metricsData.set(topic, nd)
        return nd
    }
}


function fixupMessageForJsoneKeys(obj: any): any {
    if(typeof(obj) === 'object') {
        if(Array.isArray(obj)) {
            return obj.map(e => fixupMessageForJsoneKeys(e))
        } else {
            return Object.fromEntries(
                Object.entries(obj).map(
                    ([k, v]) => [k.replaceAll("-","_"), fixupMessageForJsoneKeys(v)]
                )
            )
        }
    } else {
        return obj
    }
}

function prepareTransformation(c: AllSupportedOps, data: any) {
    return typeof c.wrapper === 'string'
        ? Object.defineProperty({}, c.wrapper, {value:data, enumerable:true})
        : data;
}