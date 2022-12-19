import {parseIOs, parseTransforms} from "./parser";

const fs = require('fs');
import {initMqtt} from "./io/mqtt"
import {initWebserver} from "./io/webserver";
import {handleMessage, PublishFunc} from "./handleMessage";
import {initHookCall} from "./io/hookCall";
import {AllSupportedIOs, AllSupportedOps, ConstantDef, MetricsData} from "./types";
import {createCheckers} from "ts-interface-checker";
import typesTi from "./types-ti";

const isVerbose = process.env.IS_VERBOSE === 'true'

if(isVerbose) {
  console.info("Verbose mode!")
}

const rawdata = fs.readFileSync('conf/conf.json').toString();
const config = JSON.parse(rawdata);

const ios = parseIOs(config, isVerbose)
const ops = parseTransforms(config, isVerbose)
const {AllSupportedOps, ConstantDef} = createCheckers(typesTi);
const transforms: AllSupportedOps[] = ops.filter((c): c is AllSupportedOps => AllSupportedOps.test(c))
const constants: ConstantDef[] = ops.filter((c): c is ConstantDef => ConstantDef.test(c))

const mqttData = new Map()
const timerData = new Map()
const metricsData: Map<string, MetricsData> = new Map()
const publishers: {io: AllSupportedIOs, publisher?: PublishFunc}[] = []

const globalPublisher = (topic: string, message: string) => {
  publishers.forEach(p => {
    if(p.publisher && topic.startsWith(p.io.topicPrefix || "")) {
      const t = p.io.topicPrefix ? topic.replace(p.io.topicPrefix, "") : topic
      try {
        p.publisher(t, message)
      } catch (e) {
        console.error(`IO(${p.io.id}): publish error to ${t}`)
        console.error(e)
      }
    }
  })
}

const globalHandler = (topic: string, message: string) => {
  const now = new Date().getTime()
  handleMessage(topic, message, now, transforms, constants, mqttData, timerData, metricsData, globalPublisher, isVerbose)
}

ios.forEach(io => {
  if(io.type === 'webserver') {
    publishers.push({
      io,
      publisher: initWebserver(io, ops, globalHandler, isVerbose)
    })
  } else if (io.type === 'mqtt') {
    publishers.push({
      io,
      publisher: initMqtt(io, ops, globalHandler, isVerbose)
    })
  } else if (io.type === 'hookCall') {
    publishers.push({
      io,
      publisher: initHookCall(io, ops, globalHandler, isVerbose)
    })
  } else {
    // @ts-ignore
    console.info('Non valid io type used in ' + io.id + ' (' + io.type + ')');
  }
})

console.info('App started')

function handleAppExit (options: {exit: boolean}, err?: Error) {
  if (err) {
    console.log(err.stack)
  }
  if (options.exit) {
    process.exit()
  }
}

process.on('exit', handleAppExit.bind(null, {
  exit: true
}))
process.on('SIGINT', handleAppExit.bind(null, {
  exit: true
}))
process.on('uncaughtException', handleAppExit.bind(null, {
  exit: true
}))
