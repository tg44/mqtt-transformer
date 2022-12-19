import {AllSupportedOps, ConstantDef} from "./types";
import mqttMatch from "mqtt-match";
import {evaluateTransformAndEmitLogic} from "./operators";

export type PublishFunc = (topic: string, message: string) => void

export const handleMessage = (
    topic: string,
    message: string,
    transforms: AllSupportedOps[],
    constants: ConstantDef[],
    mqttData: Map<string, any>,
    timerData: Map<number, object>,
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
        }
        evaluateTransformAndEmitLogic(c, mqttData, timerData, publisher, isVerbose)
    })
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