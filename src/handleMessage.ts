import {AllSupportedOps, ConstantDef, MetricsData} from "./types";
import mqttMatch from "mqtt-match";
import {evaluateTransformAndEmitLogic} from "./operators";
import {hasKey} from "./utils";

export type PublishFunc = (topic: string, message: string) => void

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
        return
    }
    if(isVerbose) {
        console.info("  Logic will run for " + configs.map(c => c.id))
    }
    configs.forEach( c => {
        let enchancedMsg = msg
        enchancedMsg = prepareTransformation(c, msg)
        if(c.topicKeyToMessage && c.topicKeyToMessage.trim()){
            enchancedMsg[c.topicKeyToMessage.trim()] = topic
        }
        const topicMatcher = c.fromTopics.find(subscription => mqttMatch(subscription, topic))
        if(c.useConstants) {
            Object.entries(c.useConstants).forEach(([k, v]) => {
                const t = constants.find(cons => cons.name === v)
                if(t) {
                    enchancedMsg[k] = t.value
                }
            })
        }
        if(topicMatcher) {
            mqttData.set(c.id + topicMatcher, enchancedMsg)
            if(c.useMetrics) {
                const metrics = updateMetricsData(metricsData, c.id + topicMatcher, time)
                Object.entries(c.useMetrics).forEach(([k, v]) => {
                    if(typeof v === 'string' && hasKey(metrics, v)) {
                        enchancedMsg[k] = metrics[v]
                    }
                })
            }
        }
        evaluateTransformAndEmitLogic(c, mqttData, timerData, publisher, isVerbose)
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