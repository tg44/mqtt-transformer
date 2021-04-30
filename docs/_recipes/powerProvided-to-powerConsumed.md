---
name: Power provided -> Power consumed
layout: recipies
tags:
  - power
  - raw-data
---

This will invert the power provided to the grid (positive value in Watt) for a wallbox that expects the power consumed from the grid (negative).

```json
{
  "fromTopic": "powermeter/total/supply-to-grid",
  "toTopic":   "wallbox/grid/supply-from-grid",
  "emitType":  "map",
  "wrapper":   "power",
  "template":  {"$eval": "-power"}
}
```

Result:

```sh
$ mosquitto_pub -t powermeter/total/supply-to-grid -m '-42'
$ mosquitto_sub -t wallbox/grid/supply-from-grid -v
wallbox/grid/supply-from-grid 42
```
