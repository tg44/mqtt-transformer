---
name: OctoPrint -> mqtt-marquee-scroller
layout: recipies
tools:
  - octoprint
  - mqtt-marquee-scroller
tags:
  - 3d-printing
  - print-progress
  - marquee-scroller
  - marquee-message
  - marquee-face
---

This will show the print progress as a message;
 
```json
{
    "fromTopic": "octoPrint/progress/printing",
    "toTopic": "tele/marquee-scroller",
    "emitInterval": 60,
    "emitType": "once",
    "template": {"message": "P ${progress}%"}
}
```

This will make a custom face when print is in progress at least one of the printers.
```json
{
    "fromTopics": ["octoPrint/first/progress/printing", "octoPrint/second/progress/printing"],
    "toTopic": "tele/marquee-scroller/face",
    "emitType": "combineLatest",
    "template": {
        "$if": "messages[0].progress + messages[1].progress > 0 && messages[0].progress + messages[1].progress < 200",
        "then": {"panels": [{"t": 2}, {"t": 0}, {"t": 3, "p": {"$eval": "messages[0].progress"}}, {"t": 3, "p": {"$eval": "messages[1].progress"}}]},
        "else": {"panels": [{"t": 1},{"t": 0},{"t": 0},{"t": 0}]}
    }
}
```
