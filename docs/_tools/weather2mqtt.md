---
name: Weather2MQTT
layout: tools
github: https://github.com/tg44/weather2mqtt
---

Gets weather data from openweathermap and publishes to MQTT.

Weather output format;
```json
{
  "coord":{
    "lon":19.08,
    "lat":47.5
  },
  "weather":[
    {
      "id":520,
      "main":"Rain",
      "description":"light intensity shower rain",
      "icon":"09d"
    }
  ],
  "base":"stations",
  "main":{
    "temp":25,
    "feels_like":26.44,
    "temp_min":24,
    "temp_max":26.11,
    "pressure":1008,
    "humidity":73
  },
  "visibility":10000,
  "wind":{
    "speed":3.1,
    "deg":210
  },
  "clouds":{
    "all":75
  },
  "dt":1597762087,
  "sys":{
    "type":1,
    "id":6663,
    "country":"HU",
    "sunrise":1597722251,
    "sunset":1597773064
  },
  "timezone":7200,
  "id":3054638,
  "name":"Budapest",
  "cod":200
}
```
