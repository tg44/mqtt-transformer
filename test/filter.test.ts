import { suite, test } from '@testdeck/mocha';
import chai from 'chai';
import {FilterOps} from "../src/types";
import {evaluateTransformAndEmitLogic} from "../src/operators";
chai.should();

@suite class FilterTests {
    @test 'should work'() {
        const filterOps: FilterOps = {
            emitType: "filter",
            id: 1,
            fromTopics: ["t"],
            //topicKeyToMessage?: string,
            toTopicTemplate: "out",
            //wrapper?: string,
            filterTemplate: {"$if": "k.i < 3", "then": true, "else": false},
        }
        const timerData = new Map()
        const data = new Map()
        data.set("1t", {k: {i: 2}})
        const dataOut = []
        const mqttPublish = (topic: string, message: string) => {
            dataOut.push({topic, message})
        }


        evaluateTransformAndEmitLogic(filterOps, data, timerData, mqttPublish, false)
        dataOut.should.be.eql([{topic: "out", message: JSON.stringify({k: {i: 2}})}])

        dataOut.pop()
        data.set("1t", {k: {i: 7}})
        evaluateTransformAndEmitLogic(filterOps, data, timerData, mqttPublish, false)
        dataOut.should.be.eql([])
    }

}