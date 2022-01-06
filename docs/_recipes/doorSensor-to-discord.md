---
name: DoorSensor -> Discord
layout: recipies
tools:
- tasmota
- mqttwarn
tags:
- IoT
- alerting
- webhook
---

I have multiple door-window sensors from sonoff, and I wanted to get notifications if doors/windows opened/closed.
One of the easiest notification source was discord.

#### Sensor and tasmota
The [sensors](https://www.itead.cc/sonoff-snzb-04-zigbee-wireless-door-window-sensor.html) was paired to an already flashed [ZbBridge](https://www.itead.cc/sonoff-zbbridge.html).
I configured the bridge to send notifications to the tele/bridgeName/sensorName/SENSOR topic.

I used these commmands;
 - [SetOption100 0](https://tasmota.github.io/docs/Commands/#setoption100)
 - [SetOption89 1](https://tasmota.github.io/docs/Commands/#setoption89)
 - [SetOption83 1](https://tasmota.github.io/docs/Commands/#setoption83)

Example topicname (not named sensor); `tele/tasmota_E3210C/E30B/SENSOR`

Example json;
```json
{
  "ZbReceived": {
    "0xE30B": {
      "Device":"0xE30B",
      "0500<00":"010000000000",
      "ZoneStatusChange":1,
      "Contact":1,
      "Endpoint":1,
      "LinkQuality":131
    }
  }
}
```
(Contact is 1 when the sensors are not connected...)

#### Discord
This is the simplest part. You need to create a new server if you don't have a "private" one already.
Add a new channel. At the channel configuration, click the integrations, and add a new webhook, copy the url, it will be sth like `https://discord.com/api/webhooks/<<id>>/<<otherId>>`

Based on the [documentation](https://discord.com/developers/docs/resources/webhook#execute-webhook) our output should be something like;
```json
{"embeds":[
  {
    "color":"10027161",
    "title":":interrobang::unlock: - 0xE30B opened"
  }
]}
```

#### mqttwarn
This is rather easy too. Our output topic will be `transformed/alert/door-window` and we will provide the jsonBody as is.

```ini
[config:http]
timeout = 60
targets = {
          #method     #URL               # query params or None                              # list auth # Json
          'discord'    : [ "post", "https://discord.com/api/webhooks/<<id>>/<<otherId>>", None, None, True ]
          }

[transformed/alert/door-window]
targets = http:discord, log:info
```

#### Transformer
Our list to dos;
 - filter only to the devices with `ZoneStatusChange` attribute
 - opened/closed state logging
 - if they have Name attribute we want `Name (id)` otherwise just `id` logging
 - color change and icon differences for opend/closed events

```json
{
 "fromTopic": "tele/+/+/SENSOR",
 "toTopic": "transformed/alert/door-window",
 "emitType": "collect",
 "filterTemplate": {
    "$let": {
          "$map": {"$eval": "ZbReceived"},
          "each(y)": {
            "key": "${y.key}", 
            "value": {"$eval": "y.val['ZoneStatusChange']"}
          }
    },
    "in": "${value}"
  },
 "template": {
     "$let": {
         "$map": {"$eval": "ZbReceived"},
         "each(y)": {
            "key": "${y.key}",
            "value": {"$eval": "y.val"}
         }
     },
     "in": {
       "$let": {
            "color":  {"$if": "value.Contact == 1",    "then": 10027161, "else": 10066176},
            "state":  {"$if": "value.Contact == 1",    "then": "opened", "else": "closed"},
            "icon":   {"$if": "value.Contact == 1",    "then": ":interrobang::unlock:", "else": ":lock:"},
            "device": {"$if": "value['Name']", "then": "${value.Name} (_${value.Device}_)", "else": "${value.Device}"}
       },
       "in": {
         "embeds": [{
            "color": "${color}",
            "title": "${icon} - ${device} ${state}"
         }]
       }
     }
 }
}
```
