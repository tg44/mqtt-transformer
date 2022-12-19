import {AllSupportedConfigs, AllSupportedIOs, MqttIO} from "./types";
import {createCheckers} from "ts-interface-checker";
import typesTi from "./types-ti";


export const parseIOs = (config: any, isVerbose: boolean): AllSupportedIOs[] => {
    const {AllSupportedIOs} = createCheckers(typesTi);

    const mqttFromEnv: MqttIO | undefined = (process.env.MQTT_URL && {
        id: 0,
        type: "mqtt",
        url: process.env.MQTT_URL,
        user: process.env.MQTT_USER,
        password: process.env.MQTT_PW,
        clientId: process.env.MQTT_CLIENT_ID,
    }) || undefined

    if(!config.io || !Array.isArray(config.io)) {
        if(mqttFromEnv) {
            config.io = [mqttFromEnv]
            return [mqttFromEnv]
        } else {
            config.io = []
            return []
        }
    }
    if(mqttFromEnv) {
        config.io.unshift(mqttFromEnv)
    }
    config.io.forEach(function(elem: any, idx: number){
        elem.id = idx
        if(!AllSupportedIOs.test(elem)) {
            console.error(`Config IO parse error on ${JSON.stringify(elem)}`)
            AllSupportedIOs.check(elem)
        }
    })

    if(isVerbose) {
        console.info(`Transformed IO config: ${JSON.stringify(config.io)}`)
    }

    return config.io
}

export const parseTransforms = (config: any, isVerbose: boolean): AllSupportedConfigs[] => {
    const {AllSupportedConfigs} = createCheckers(typesTi);
    config.transforms.forEach(function(elem: any, idx: number){
        if(!elem.fromTopics && elem.fromTopic){
            elem.fromTopics = [elem.fromTopic]
        }
        elem.id = idx
        elem.toTopicTemplate = elem.toTopicTemplate ?? elem.toTopic
        if(!AllSupportedConfigs.test(elem)) {
            console.error(`Config Transform parse error on ${JSON.stringify(elem)}`)
            AllSupportedConfigs.check(elem)
        }
    })

    if(isVerbose) {
        console.info("Transformed config: " + JSON.stringify(config.transforms))
    }

    return config.transforms
}


