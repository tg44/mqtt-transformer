import {AllSupportedConfigs, AllSupportedOps, ConstantDef} from "./types";
import {evaluateTransformAndEmitLogic} from "./operators";
import {createCheckers} from "ts-interface-checker";
import typesTi from "./types-ti";

const mqttMatch = require('mqtt-match')
const mqtt = require('mqtt')
const mqttUrl = process.env.MQTT_URL || 'mqtt://sigil.tg44.win:1883'

const mqttUser = process.env.MQTT_USER
const mqttPassword = process.env.MQTT_PW
const mqttClientId = process.env.MQTT_CLIENT_ID

const additionalParams = {
    username: mqttUser,
    clientId: mqttClientId,
    password: mqttPassword
}

export type PublishFunc = (topic: string, message: string) => void


export const initMqtt = (config: AllSupportedConfigs[], isVerbose: boolean) => {
    const client = mqtt.connect(mqttUrl, additionalParams)
    const {AllSupportedOps, ConstantDef} = createCheckers(typesTi);

    const transforms: AllSupportedOps[] = config.filter((c): c is AllSupportedOps => AllSupportedOps.test(c))
    const constants: ConstantDef[] = config.filter((c): c is ConstantDef => ConstantDef.test(c))

    const mqttData = new Map()
    const timerData = new Map()

    client.on('connect', () => {
        console.info('MQTT connected to ' + mqttUrl)
        const topics = [...new Set(transforms.flatMap(element => element.fromTopics))]
        topics.forEach(element => {
            client.subscribe(element)
            console.info('Subscribed to ' + element)
        })
    })

    client.on('message', (topic: string, message: Buffer) => {
        handleMessage(topic, message, transforms, constants, mqttData, timerData, client.publish, isVerbose)
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

export const handleMessage = (
    topic: string,
    message: Buffer,
    transforms: AllSupportedOps[],
    constants: ConstantDef[],
    mqttData: Map<string, any>,
    timerData: Map<number, object>,
    mqttPublish: PublishFunc,
    isVerbose: boolean
) => {
    const configs = transforms.filter(element => element.fromTopics.some(subscription => mqttMatch(subscription, topic)));
    let msg: any;
    try {
        msg = JSON.parse(message.toString())
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
        evaluateTransformAndEmitLogic(c, mqttData, timerData, mqttPublish, isVerbose)
    })
}