const jsone = require('json-e');
const fs = require('fs');

const isVerbose = process.env.IS_VERBOSE || false

let rawdata = fs.readFileSync('conf/conf.json');
const config = JSON.parse(rawdata);
config.transforms.forEach(function(elem, idx){
  if(!elem.fromTopics && elem.fromTopic){
    elem.fromTopics = [elem.fromTopic]
  }
  elem.id = idx
})
if(isVerbose) {
  console.info("Transformed config: " + JSON.stringify(config))
}

const mqttMatch = require('mqtt-match')
const mqtt = require('mqtt')
const mqttUrl = process.env.MQTT_URL || 'mqtt://localhost:1883'

const mqttUser = process.env.MQTT_USER
const mqttPassword = process.env.MQTT_PW
const mqttClientId = process.env.MQTT_CLIENT_ID

const additionalParams = {
  username: mqttUser,
  clientId: mqttClientId,
  password: mqttPassword
}

const client = mqtt.connect(mqttUrl, additionalParams)

const mqttData = new Map()
const timerData = new Map()

console.info('App started')

client.on('connect', () => {
  console.info('MQTT connected to ' + mqttUrl)
  const topics = [...new Set(config.transforms.flatMap(element => element.fromTopics))]
  topics.forEach(element => {
    client.subscribe(element)
    console.info('Subscribed to ' + element)
  })
})

client.on('message', (topic, message) => {
  const configs = config.transforms.filter(element => element.fromTopics.some(subscription => mqttMatch(subscription, topic)));
  let msg;
  try {
    msg = JSON.parse(message)
    if(isVerbose) {
      console.info("")
      console.info("Message from topic " + topic)
      console.info("  parsed: " + JSON.stringify(config, null, 2))
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
    mqttData.set(c.id + c.fromTopics.find(subscription => mqttMatch(subscription, topic)), msg)
    evaluateTransformAndEmitLogic(c)
  })
})

function evaluateTransformAndEmitLogic(c) {
  if(c.emitType === 'repeat') {
    if(!timerData.get(c.id)) {
      mapAndEmitIfHasData(c)
      setRepeatTimer(c)
    }
  } else if(c.emitType === 'once') {
    if(!timerData.get(c.id)) {
      mapAndEmitIfHasData(c)
      setOnceTimer(c)
    }
  } else if(c.emitType === 'map') {
    mapAndEmitIfHasData(c)
  } else if(c.emitType === 'filter') {
    if(filterIfHasData(c)) {
      const data = mqttData.get(c.id+c.fromTopics[0])
      client.publish(c.toTopic, JSON.stringify(data))
    }
  } else if(c.emitType === 'collect') {
    if(filterIfHasData(c)) {
      mapAndEmitIfHasData(c)
    }
  } else if(c.emitType === 'zipLast') {
    const allData = gatherAllData(c)
    if(hasAllDataPredicate(c, allData)){
      mapAndEmit(c, {messages: allData})
      c.fromTopics.forEach(topic => mqttData.delete(c.id + topic))
    }
  } else if(c.emitType === 'combineLatest') {
    const allData = gatherAllData(c)
    if(hasAllDataPredicate(c, allData)){
      mapAndEmit(c, {messages: allData})
    }
  } else {
    console.info('Non valid emit type used in ' + c.id + ' (' + c.emitType + ')');
  }
}

function gatherAllData(c) {
  return c.fromTopics.map(t => mqttData.get(c.id+t));
}
function hasAllDataPredicate(c, gatheredData) {
  return c.fromTopics.length === gatheredData.filter(d => d != null).length
}

function filterIfHasData(c) {
  const rawData = mqttData.get(c.id+c.fromTopics[0])
  if(rawData) {
    try {
      const data = prepareTransformation(c, rawData)
      const out = jsone(c.filterTemplate, data)
      if(isVerbose) {
        console.info("  >>  " +c.id)
        console.info("      " + "Filter template " + JSON.stringify(c.filterTemplate))
        console.info("      " + "On " + JSON.stringify(data))
        console.info("      " + "=> " + JSON.stringify(out))
      }
      return out
    } catch (error) {
      console.error('Data parse error on id' + c.id + ' template was; ' + JSON.stringify(c.filterTemplate) + ' message was; ' + JSON.stringify(rawData))
      console.error(error)
    }
  }
}

function mapAndEmitIfHasData(c) {
  const data = mqttData.get(c.id+c.fromTopics[0])
  if(data) {
    mapAndEmit(c, data)
  }
}

function mapAndEmit(c, rawData) {
  try {
    const data = prepareTransformation(c, rawData)
    const out = jsone(c.template, data)
    const outString = JSON.stringify(out)
    if(isVerbose) {
      console.info("  >>  " + c.id)
      console.info("      " + "Transform template " + JSON.stringify(c.template))
      console.info("      " + "On " + JSON.stringify(data))
      console.info("      " + "=> " + outString)
    }
    client.publish(c.toTopic, outString)
  } catch (error) {
    console.error('Data parse error on id ' + c.id + ' template was; ' + JSON.stringify(c.template) + ' message was; ' + JSON.stringify(data))
    console.error(error)
  }
}

function prepareTransformation(c, data) {
  return typeof c.wrapper === 'string'
    ? Object.defineProperty({}, c.wrapper, {value:data, enumerable:true})
    : data;
}

function setRepeatTimer(c) {
  const newTimer = setInterval(() => {
    mapAndEmitIfHasData(c)
  }, c.emitInterval * 1000);
  timerData.set(c.id, newTimer)
}

function setOnceTimer(c) {
  const newTimer = setTimeout(() => {
    timerData.delete(c.id)
  }, c.emitInterval * 1000);
  timerData.set(c.id, newTimer)
}

function handleAppExit (options, err) {
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
