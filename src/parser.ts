import {AllSupportedConfigs} from "./types";
import {createCheckers} from "ts-interface-checker";
import typesTi from "./types-ti";


export const parseConfig = (config: any, isVerbose: boolean): AllSupportedConfigs[] => {
    const {AllSupportedConfigs} = createCheckers(typesTi);
    config.transforms.forEach(function(elem: any, idx: number){
        if(!elem.fromTopics && elem.fromTopic){
            elem.fromTopics = [elem.fromTopic]
        }
        elem.id = idx
        elem.toTopicTemplate = elem.toTopicTemplate ?? elem.toTopic
        if(!AllSupportedConfigs.test(elem)) {
            console.error(`Config parse error on ${JSON.stringify(elem)}`)
            AllSupportedConfigs.check(elem)
        }
    })

    if(isVerbose) {
        console.info("Transformed config: " + JSON.stringify(config))
    }

    return config.transforms
}


