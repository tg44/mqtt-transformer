import {parseConfig} from "./parser";

const fs = require('fs');
import {initMqtt} from "./mqtt"

const isVerbose = process.env.IS_VERBOSE === 'true'

const rawdata = fs.readFileSync('conf/conf.json').toString();
const config = JSON.parse(rawdata);

const ops = parseConfig(config, isVerbose)

initMqtt(ops, isVerbose)
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
