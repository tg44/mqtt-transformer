[![Docker Build Status](https://img.shields.io/docker/cloud/build/tg44/mqtt-transformer?style=flat-square)](https://hub.docker.com/r/tg44/mqtt-transformer)

# MQTT TRANSFORMER

This is a small service which subscribes to given topics, 
transforms the jsons with the given patterns, and emits them back to other topics.

Use-case;
 - you own some mqtt emitters (for ex. measure type iot devices)
 - you own some mqtt displayers (for ex. services, or physical devices)
 - the emitters and the displayers are not compatible out of the box
 - you need some bridge to convert the messages
 
## Config syntax

The app works with one `conf.json` which looks like this;
```
{
  "transforms": [
    {
        "fromTopic": "tele/tasmota/STATE",
        "toTopic": "transformed/tasmota-state",
        "emitInterval": 60,
        "emitType": "repeat",
        "template": {"uptime": {"$eval": "UptimeSec"}}
    }
  ]
}
```
You can have multiple transforms in the array, but the from topic should be uniqe!

The `fromTopic` and `toTopic` should be self describing.

The `emitInterval` is the minimum time in seconds between message emits to the toTopic.

The `emitType` could be `repeat` or `once` both will emit for the first seen message, but while 
`once` will not emit until the `emitInterval` is zeroed (and then next emit when it sees a new message in the topic), 
`repeat` will send the last seen message whenever the interval is passed.

The `template` parameter is the trickiest. The app uses [json-e](https://github.com/taskcluster/json-e) underneath, so you need to cook up a valid json-e transformation.
Read [the docs](https://github.com/taskcluster/json-e#language-reference) for reference.
(For concrete examples and use-cases help me by opening an issue or PR.)

## Running the app

### Local install / dev
You need node 12, start with `npm i` and then `node app.js`.
For setting the mqtt server other than localhost you need to `export MQTT_URL="mqtt://myserver:1883"` before the service start.

### Docker and compose
For docker you can run;
```
docker run -e MQTT_URL="mqtt://myserver:1883" -v ${PWD}/conf:/home/node/app/conf tg44/mqtt-transformer
```
For docker compose;
```
version: '3.1'
services:
  mqtt-transformer:
    image: tg44/mqtt-transformer
    restart: unless-stopped
    volumes:
      - /otp/mqtt-transformer/:/home/node/app/conf
    environment:
      - MQTT_URL=mqtt://myserver:1883
```
