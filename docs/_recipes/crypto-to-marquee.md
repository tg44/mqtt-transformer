---
name: Crypto2MQTT -> mqtt-marquee-scroller
layout: recipies
tools:
  - crypto2mqtt
  - mqtt-marquee-scroller
tags:
  - crypto
  - marquee-scroller
  - marquee-message
---

This will repeat the crypto infos on your marquee scroller in every minute, with btc-usd and eth-usd prices.
 
```json
{
  "fromTopic": "export/crypto",
  "toTopic": "tele/marquee-scroller",
  "emitInterval": 60,
  "emitType": "repeat",
  "template": {"message": "BTC ${bitcoin.usd}  ETH ${ethereum.usd}"}
}
```
