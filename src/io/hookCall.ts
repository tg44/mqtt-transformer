import {AllSupportedConfigs, HookCallIO} from "../types";
import {PublishFunc} from "../handleMessage";
import fetch from 'node-fetch';


export const initHookCall = (
    hookConf: HookCallIO,
    config: AllSupportedConfigs[],
    publisher: PublishFunc,
    isVerbose: boolean
): PublishFunc => {
    return async (topic: string, message: string) => {
        const response = await fetch(hookConf.url, {method: "POST", body: message, headers: hookConf.headers || []});
        if(isVerbose && (response.status<200 || response.status >= 300)) {
            console.info(`HookCall(${hookConf.id}): Response was not ok! (${response.status})`)
        }
        if(hookConf.responseTopic) {
            const body = await response.text();
            const p = {
                requestBody: message,
                responseBody: body,
                responseStatus: response.status,
            }
            publisher(hookConf.responseTopic, JSON.stringify(p))
        }
    }
}