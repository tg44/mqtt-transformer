import jsone from "json-e";
import {CollectOps, TransformationOps, FilterOps, OnceOps, RepeatOps, AllSupportedOps} from "./types";
import {parseMessage, PublishFunc} from "./handleMessage";

export const evaluateTransformAndEmitLogic = (c: AllSupportedOps, mqttData: Map<string, any>, timerData: Map<number, object>, additionalConstants: object, mqttPublish: PublishFunc, isVerbose: boolean) => {
    if(c.emitType === 'repeat') {
        if(!timerData.get(c.id)) {
            mapAndEmitIfHasData(c, mqttData, mqttPublish, isVerbose)
            setRepeatTimer(c, mqttData, timerData, mqttPublish, isVerbose)
        }
    } else if(c.emitType === 'once') {
        if(!timerData.get(c.id)) {
            mapAndEmitIfHasData(c, mqttData, mqttPublish, isVerbose)
            setOnceTimer(c, timerData)
        }
    } else if(c.emitType === 'map') {
        mapAndEmitIfHasData(c, mqttData, mqttPublish, isVerbose)
    } else if(c.emitType === 'filter') {
        if(filterIfHasData(c, mqttData, isVerbose)) {
            const data = mqttData.get(c.id+c.fromTopics[0])
            let toTopic = topicName(c, data)
            mqttPublish(toTopic, JSON.stringify(data))
        }
    } else if(c.emitType === 'collect') {
        if(filterIfHasData(c, mqttData, isVerbose)) {
            mapAndEmitIfHasData(c, mqttData, mqttPublish, isVerbose)
        }
    } else if(c.emitType === 'zipLast') {
        const allData = gatherAllData(c, mqttData)
        if(hasAllDataPredicate(c, allData)){
            mapAndEmit(c, {...additionalConstants, ...{messages: allData}}, mqttPublish, isVerbose)
            c.fromTopics.forEach(topic => mqttData.delete(c.id + topic))
        }
    } else if(c.emitType === 'combineLatest') {
        const allData = gatherAllData(c, mqttData)
        if(hasAllDataPredicate(c, allData)){
            mapAndEmit(c, {...additionalConstants, ...{messages: allData}}, mqttPublish, isVerbose)
        }
    } else if(c.emitType === 'reduce') {
        if(typeof c.toTopicTemplate === 'string') {
            const data = mqttData.get(c.id+c.fromTopics[0])
            const stateData = parseMessage(mqttData.get(c.toTopicTemplate), c.toTopicTemplate, [c], isVerbose)
            if(data) {
                mapAndEmit(c, {...additionalConstants, ...{message: data, state: stateData ?? {}}}, mqttPublish, isVerbose)
            }
        } else {
            console.error('ReduceOps toTopicTemplate must be string')
        }
    } else {
        // @ts-ignore
        console.info('Non valid emit type used in ' + c.id + ' (' + c.emitType + ')');
    }
}

function gatherAllData(c: AllSupportedOps, mqttData: Map<string, any>): any[] {
    return c.fromTopics.map((t, idx) => {
        if(mqttData.has(c.id+t))   {
            return mqttData.get(c.id+t)
        } else {
            if("defaultValues" in c) {
                return c.defaultValues?.[idx]
            }
        }
    });
}
function hasAllDataPredicate(c: AllSupportedOps, gatheredData: any) {
    return c.fromTopics.length === gatheredData.filter((d: any) => d !== null && d!== undefined).length
}

function filterIfHasData(c: CollectOps | FilterOps, mqttData: Map<string, any>, isVerbose: boolean) {
    const data = mqttData.get(c.id+c.fromTopics[0])
    if(data) {
        try {
            const out = jsone(c.filterTemplate, data)
            if(isVerbose) {
                console.info("  >>  " +c.id)
                console.info("      " + "Filter template " + JSON.stringify(c.filterTemplate))
                console.info("      " + "On " + JSON.stringify(data))
                console.info("      " + "=> " + JSON.stringify(out))
            }
            return out
        } catch (error) {
            console.error('Data parse error on id' + c.id + ' template was; ' + JSON.stringify(c.filterTemplate) + ' message was; ' + JSON.stringify(data))
            console.error(error)
        }
    }
}

function mapAndEmitIfHasData(c: TransformationOps, mqttData: Map<string, any>, mqttPublish: PublishFunc, isVerbose: boolean) {
    const data = mqttData.get(c.id+c.fromTopics[0])
    if(data) {
        mapAndEmit(c, data, mqttPublish, isVerbose)
    }
}

function mapAndEmit(c: TransformationOps, data: Record<any, any>, mqttPublish: PublishFunc, isVerbose: boolean) {
    try {
        const out = jsone(c.template, data)
        const outString = JSON.stringify(out)
        let toTopic = topicName(c, data)
        if(isVerbose) {
            console.info("  >>  " + c.id)
            console.info("      " + "Transform template " + JSON.stringify(c.template))
            console.info("      " + "On " + JSON.stringify(data))
            console.info("      " + "=> " + outString)
            console.info("      " + "to " + JSON.stringify(toTopic))
        }
        if(!toTopic) {
            console.error("toTopic is empty on " + c.id)
        } else {
            mqttPublish(toTopic, outString)
        }
    } catch (error) {
        console.error('Data parse error on id ' + c.id + ' template was; ' + JSON.stringify(c.template) + ' message was; ' + JSON.stringify(data))
        console.error(error)
    }
}

const topicName = (c: AllSupportedOps, data: Record<any, any>) => {
    try {
        return jsone(c.toTopicTemplate, data)
    } catch (error){
        console.error('Data parse error on id ' + c.id + ' template was; ' + JSON.stringify(c.toTopicTemplate) + ' message was; ' + JSON.stringify(data))
        console.error(error)
    }
}

function setRepeatTimer(c: RepeatOps, mqttData: Map<string, any>, timerData: Map<number, object>, mqttPublish: PublishFunc, isVerbose: boolean) {
    const newTimer = setInterval(() => {
        mapAndEmitIfHasData(c, mqttData, mqttPublish, isVerbose)
    }, c.emitInterval * 1000);
    timerData.set(c.id, newTimer)
}

function setOnceTimer(c: OnceOps, timerData: Map<number, object>) {
    const newTimer = setTimeout(() => {
        timerData.delete(c.id)
    }, c.emitInterval * 1000);
    timerData.set(c.id, newTimer)
}