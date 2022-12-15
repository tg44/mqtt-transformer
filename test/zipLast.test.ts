import { suite, test } from '@testdeck/mocha';
import chai from 'chai';
import {ZipLastOps} from "../src/types";
import {evaluateTransformAndEmitLogic} from "../src/operators";
chai.should();

@suite class ZipLastTests {
    @test 'should work'() {
        const zipLastOps: ZipLastOps = {
            emitType: "zipLast",
            id: 1,
            fromTopics: ["t1", "t2"],
            //topicKeyToMessage?: string,
            toTopicTemplate: "out",
            //wrapper?: string,
            template: {"message": "${messages[0].k.i} ${messages[1].k.i}"},
        }
        const timerData = new Map()
        const data = new Map()
        data.set("1t1", {k: {i: 2}})
        data.set("1t2", {k: {i: 4}})
        const dataOut = []
        const mqttPublish = (topic: string, message: string) => {
            dataOut.push({topic, message})
        }


        evaluateTransformAndEmitLogic(zipLastOps, data, timerData, mqttPublish, false)
        dataOut.should.be.eql([{topic: "out", message: "{\"message\":\"2 4\"}"}])
        dataOut.pop()

        data.set("1t1", {k: {i: 3}})
        evaluateTransformAndEmitLogic(zipLastOps, data, timerData, mqttPublish, false)
        dataOut.should.be.empty

        data.set("1t1", {k: {i: 9}})
        evaluateTransformAndEmitLogic(zipLastOps, data, timerData, mqttPublish, false)
        dataOut.should.be.empty

        data.set("1t2", {k: {i: 6}})
        evaluateTransformAndEmitLogic(zipLastOps, data, timerData, mqttPublish, false)
        dataOut.should.be.eql([{topic: "out", message: "{\"message\":\"9 6\"}"}])
        dataOut.pop()
    }

}