import {AllSupportedConfigs, AllSupportedOps, MqttIO} from "../types";
import {createCheckers} from "ts-interface-checker";
import typesTi from "../types-ti";
import {PublishFunc} from "../handleMessage";
import mqtt from "mqtt"

export const initMqtt = (
    mqttConf: MqttIO,
    config: AllSupportedConfigs[],
    publisher: PublishFunc,
    isVerbose: boolean
): PublishFunc => {
    const additionalParams = {
        username: mqttConf.user,
        clientId: mqttConf.clientId,
        password: mqttConf.password,
    }
    if(!mqttConf.url.startsWith("mqtt://")) {
        console.warn(`MQTT(${mqttConf.id}): will probably not start, no mqtt:// protocol in url; ${mqttConf.url}`)
    }
    const client = mqtt.connect(mqttConf.url, additionalParams)
    const topicPrefix = mqttConf.topicPrefix || ""

    const {AllSupportedOps} = createCheckers(typesTi);

    const transforms: AllSupportedOps[] = config.filter((c): c is AllSupportedOps => AllSupportedOps.test(c))

    client.on('connect', () => {
        console.info(`MQTT(${mqttConf.id}): Connected to ${mqttConf.url}`)
        const topics = [...new Set(transforms.flatMap(element => element.fromTopics))]
        topics.forEach(element => {
            client.subscribe(element)
            if(isVerbose) {
                console.info(`MQTT(${mqttConf.id}): Subscribed to ${element}`)
            }
        })
    })

    client.on('error', (error: Error) => {
        console.error(`MQTT(${mqttConf.id}): Error ${error}`)
    })

    client.on('message', (topic: string, message: Buffer) => {
        publisher(topicPrefix + topic, message.toString())
    })

    return (topic: string, message: string) => client.publish(topic, message)
}
