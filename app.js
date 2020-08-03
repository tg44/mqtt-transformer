const jsone = require('json-e');
const fs = require('fs');

let rawdata = fs.readFileSync('conf/conf.json');
let config = JSON.parse(rawdata);

const mqtt = require('mqtt')
const mqttUrl = process.env.MQTT_URL || 'mqtt://localhost:1883'

const client = mqtt.connect(mqttUrl)

const mqttData = new Map()
const timerData = new Map()

console.info('App started')

client.on('connect', () => {
  console.info('MQTT connected to ' + mqttUrl)
  config.transforms.forEach(element => {
    client.subscribe(element.fromTopic)
    console.info('Subscribed to ' + element.fromTopic)
  })
})

client.on('message', (topic, message) => {
  const c = config.transforms.find(element => element.fromTopic === topic);
  try {
    const out = jsone(c.template, JSON.parse(message))
    mqttData.set(c.fromTopic, {topic: c.toTopic, message: out})
    setTimerAndSendIfNeeded(c)
  } catch (error) {
    console.error('Data parse error on topic ' + topic + ' template was; ' + c.template + ' message was; ' + message)
    console.error(error);
  }
})

function setTimerAndSendIfNeeded(c) {
  if(!timerData.get(c.fromTopic)) {
    emitIfHasData(c)
    if(c.emitType === 'repeat') {
      setRepeatTimer(c);
    } else if(c.emitType === 'once') {
      setOnceTimer(c)
    } else {
      console.info('Non valid emit type used in ' + c.fromTopic + ' (' + c.emitType + ') fall back to repeat');
      setRepeatTimer(c);
    }
  }
}

function emitIfHasData(c) {
  const data = mqttData.get(c.fromTopic)
  if(data) {
    client.publish(data.topic, JSON.stringify(data.message))
  }
}

function setRepeatTimer(c) {
  const newTimer = setInterval(() => {
    emitIfHasData(c)
  }, c.emitInterval * 1000);
  timerData.set(c.fromTopic, newTimer)
}

function setOnceTimer(c) {
  const newTimer = setTimeout(() => {
    timerData.delete(c.fromTopic)
  }, c.emitInterval * 1000);
  timerData.set(c.fromTopic, newTimer)
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
