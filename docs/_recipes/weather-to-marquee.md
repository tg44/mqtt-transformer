---
name: Weather2MQTT -> mqtt-marquee-scroller
layout: recipies
tools:
  - weather2mqtt
  - mqtt-marquee-scroller
tags:
  - weather
  - marquee-scroller
  - marquee-message
---

This will repeat the weather infos on your marquee scroller in every minute, with the weather description, the min-max temp, and the feel-like temp.
 
```json
{
  "fromTopic": "export/weather",
  "toTopic": "tele/marquee-scroller",
  "emitInterval": 60,
  "emitType": "repeat",
  "template": {"message": "OUT ${weather[0].description} ${main.temp_min}/${main.temp_max} ${main.feels_like}C"}
}
```
