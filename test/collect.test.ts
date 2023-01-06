import { suite, test } from '@testdeck/mocha';
import chai from 'chai';
import {CollectOps} from "../src/types";
import {evaluateTransformAndEmitLogic} from "../src/operators";
chai.should();

@suite class CollectTests {
    @test 'should work'() {
        const collectOps: CollectOps = {
            emitType: "collect",
            id: 1,
            fromTopics: ["t"],
            //topicKeyToMessage?: string,
            toTopicTemplate: "out",
            //wrapper?: string,
            filterTemplate: {"$if": "k.i < 3", "then": true, "else": false},
            template: {"message": "I ${k.i}"},
        }
        const timerData = new Map()
        const data = new Map()
        data.set("1t", {k: {i: 2}})
        const dataOut = []
        const mqttPublish = (topic: string, message: string) => {
            dataOut.push({topic, message})
        }


        evaluateTransformAndEmitLogic(collectOps, data, timerData, {}, mqttPublish, false)
        dataOut.should.be.eql([{topic: "out", message: "{\"message\":\"I 2\"}"}])

        dataOut.pop()
        data.set("1t", {k: {i: 7}})
        evaluateTransformAndEmitLogic(collectOps, data, timerData, {}, mqttPublish, false)
        dataOut.should.be.eql([])
    }

}