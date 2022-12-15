[![Build](https://img.shields.io/github/workflow/status/tg44/mqtt-prometheus-message-exporter/ci)](https://github.com/tg44/mqtt-transformer/actions/workflows/build-and-publish.yaml)
[![DockerImage](https://img.shields.io/badge/docker-latest-brightgreen?style=flat-square)](https://github.com/tg44/mqtt-transformer/pkgs/container/mqtt-transformer)
[![Docker Hub](https://img.shields.io/docker/cloud/build/tg44/mqtt-transformer?style=flat-square)](https://hub.docker.com/r/tg44/mqtt-transformer)
[![Docs](https://img.shields.io/badge/Recipes-Documentation%20and%20examples-informational)](https://tg44.github.io/mqtt-transformer/)

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
You can have multiple transforms in the array!

The required fields are; `toTopic` (or `toTopicTemplate` see below the templates), `emitType`, and either `fromTopic` as a string or `fromTopics` as an array of strings. The other fields may vary based on the choosen `emitType`.

The `template` or `filterTemplate` parameter is the trickiest. The app uses [json-e](https://github.com/taskcluster/json-e) underneath, so you need to cook up a valid json-e transformation.
Read [the docs](https://github.com/taskcluster/json-e#language-reference) for reference.
(For concrete examples and use-cases; check the [recipes](https://tg44.github.io/mqtt-transformer/) or help me by opening an issue or PR. For minimal examples you can check the `conf/config.json`.)


### Emit types

#### Transformation - map

Maps with the given `template`.

Data may optionally be wrapped in a root object. This allows transformations on raw values like strings and numbers. The name of the value property in the root object is taken from the configuration parameter `wrapper`. Check the recipe _Power consumed -> Power provided_ for an example.

#### Filter - filter and collect

Filters with the `filterTemplate`. The `filterTemplate` must return with true/false for correctly describe your intention.
(It's javascript and I filter with `if(result)` so technically you can return false/null/undefined/0/empty-string/empty-array for false values and anything else for true, but still...)

Filter will emit the given message as is if the `filterTemplate` returns true, while collect will do a map on it with the `template`. 
If the `filterTemplate` returns false it will not emit.

Data may optionally be wrapped in a root object. This allows filtering of raw values like strings and numbers. The name of the value property in the root object is taken from the configuration parameter `wrapper`. Check the recipe _Power consumed -> Power provided_ for examples.

#### Time driven types - repeat and once

The `emitInterval` is the minimum time in seconds between message emits to the `toTopic`.

Both will emit for the first seen message, but while 
`once` will not emit until the `emitInterval` is zeroed (and then next emit when it sees a new message in the topic), 
`repeat` will send the last seen message whenever the interval is passed.

Both maps with the given `template`.

#### Combine multiple topics - zipLast and combineLatest

CombineLatest works the same as [reactiveX defines it](http://reactivex.io/documentation/operators/combinelatest.html).

ZipLast kinda works like zip. It waits till it gets at least one element in all of its topics, BUT always keeping the last element if it gets more than one in the same topic.
When it gets an element in each topic, it calls the `template`, emits the output, and clears all of the saved elements.

The `template` will get a `{messages: []}` object, the indexes will match to the topic indexes.

### Additional values 

#### Topic
You can add the `topicKeyToMessage` key to the config, and the incoming messages will be enchanced with the key and the topic name.
```
{
    "fromTopic": "tele/+/STATE",
    "toTopicTemplate": "${topic}_NEW",
    "emitInterval": 60,
    "topicKeyToMessage": "topic",
    "emitType": "repeat",
    "template": {"uptime": {"$eval": "UptimeSec"}, "topic": {"$eval": "topic"}}
}
```

## Running the app

### Local install / dev
You need node 12, start with `npm i` and then `node app.ts`.
For setting the mqtt server other than localhost you need to `export MQTT_URL="mqtt://myserver:1883"` before the service start.

For enable debugging you can  `export IS_VERBOSE=true`

### Docker and compose
For docker you can run;
```
docker run -e MQTT_URL="mqtt://myserver:1883" -v ${PWD}/conf:/home/node/app/conf ghcr.io/tg44/mqtt-transformer
```
For docker compose;
```
version: '3.1'
services:
  mqtt-transformer:
    image: ghcr.io/tg44/mqtt-transformer
    restart: unless-stopped
    volumes:
      - /otp/mqtt-transformer/:/home/node/app/conf
    environment:
      - MQTT_URL=mqtt://myserver:1883
```

In the early config/template writing/testing phase, you can add the `IS_VERBOSE` env var too. 
That will log all the incoming messages alongside with the rule id, the applied template, and the resulting output.

`MQTT_USER`, `MQTT_PW`, `MQTT_CLIENT_ID` can be set as env vars too.


## Breaking changes
- 2022.01.06
    - we will permanently move away from dockerhub, the latest images will be pushed, but the documentation and the other infos will only be updated here
        - DH freezes the free builds, while GH-Actions not only build free, but gives us public repositories too


## Contribution
If you have any idea about the base functionality or the config/emitter syntax, just start a new issue/pr and we can talk about the use-cases, pros and cons!
