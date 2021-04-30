---
name: Power consumed -> Power provided
layout: recipies
tags:
  - power
  - raw-data
---

This will invert the power consumed from the grid (positive value in Watt) for a wallbox that expects the power provided to the grid (negative value).

```json
{
  "fromTopic": "powermeter/total/effective-power-consumption",
  "toTopic":   "wallbox/grid/effective-supply",
  "emitType":  "map",
  "wrapper":   "power",
  "template":  {"$eval": "-power"}
}
```

Result:

```sh
$ mosquitto_sub -t wallbox/grid/# -v &
$ mosquitto_pub -t powermeter/total/effective-power-consumption -m '42'
wallbox/grid/effective-supply -42
$ mosquitto_pub -t powermeter/total/effective-power-consumption -m '-42'
wallbox/grid/effective-supply 42
```

This will emit the consumed power only and skip values for provided power.

```json
{
  "fromTopic": "powermeter/total/effective-power-consumption",
  "toTopic":   "wallbox/grid/consumption",
  "emitType":  "filter",
  "wrapper":   "power",
  "filterTemplate":  {"$eval": "power > 0"}
}
```

Result:

```sh
$ mosquitto_sub -t wallbox/grid/# -v &
$ mosquitto_pub -t powermeter/total/effective-power-consumption -m '42'
wallbox/grid/consumption 42
$ mosquitto_pub -t powermeter/total/effective-power-consumption -m '-42'
```

This will emit the provided power only and skip values for consumed power.

```json
{
  "fromTopic": "powermeter/total/effective-power-consumption",
  "toTopic":   "wallbox/grid/supply",
  "emitType":  "collect",
  "wrapper":   "power",
  "filterTemplate":  {"$eval": "power < 0"},
  "template":  {"$eval": "-power"}
}
```

Result:

```sh
$ mosquitto_sub -t wallbox/grid/# -v &
$ mosquitto_pub -t powermeter/total/effective-power-consumption -m '42'
$ mosquitto_pub -t powermeter/total/effective-power-consumption -m '-42'
wallbox/grid/supply 42
```
