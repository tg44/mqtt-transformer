import express from "express";
import {AllSupportedConfigs, WebserverIO} from "../types";
import {PublishFunc} from "../handleMessage";

export const initWebserver = (webserverConf: WebserverIO,
                              config: AllSupportedConfigs[],
                              publisher: PublishFunc,
                              isVerbose: boolean): PublishFunc => {

    const topicPrefix = webserverConf.topicPrefix || ""
    const app = express()

    app.use(express.json());

    app.post('*', (req, res) => {
        if(isVerbose) {
            `Webserver(${webserverConf.id}): incoming request on path - ${req.path}`
        }
        publisher(topicPrefix + (req.path.startsWith('/') ? req.path.slice(1) : req.path), JSON.stringify(req.body))
        res.send()
    })

    app.listen(webserverConf.port)
    console.info(`Webserver(${webserverConf.id}): Started on port:${webserverConf.port}`)

    return () => {}
}