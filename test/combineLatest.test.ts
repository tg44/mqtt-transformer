import { suite, test } from '@testdeck/mocha';
import chai from 'chai';
import {CombineLatestOps} from "../src/types";
import {evaluateTransformAndEmitLogic} from "../src/operators";
chai.should();

@suite class CombineLatestTests {
    @test 'should work'() {
        const combineLatestOps: CombineLatestOps = {
            emitType: "combineLatest",
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


        evaluateTransformAndEmitLogic(combineLatestOps, data, timerData, {}, mqttPublish, false)
        dataOut.should.be.eql([{topic: "out", message: "{\"message\":\"2 4\"}"}])
        dataOut.pop()

        data.set("1t1", {k: {i: 3}})
        evaluateTransformAndEmitLogic(combineLatestOps, data, timerData, {}, mqttPublish, false)
        dataOut.should.be.eql([{topic: "out", message: "{\"message\":\"3 4\"}"}])
        dataOut.pop()

        data.set("1t1", {k: {i: 9}})
        evaluateTransformAndEmitLogic(combineLatestOps, data, timerData, {}, mqttPublish, false)
        dataOut.should.be.eql([{topic: "out", message: "{\"message\":\"9 4\"}"}])
        dataOut.pop()

        data.set("1t2", {k: {i: 6}})
        evaluateTransformAndEmitLogic(combineLatestOps, data, timerData, {}, mqttPublish, false)
        dataOut.should.be.eql([{topic: "out", message: "{\"message\":\"9 6\"}"}])
        dataOut.pop()
    }

    @test 'should work with default value'() {
        const combineLatestOps: CombineLatestOps = {
            emitType: "combineLatest",
            id: 1,
            fromTopics: ["t1", "t2"],
            //topicKeyToMessage?: string,
            toTopicTemplate: "out",
            //wrapper?: string,
            template: {"message": "${messages[0].k.i} ${messages[1].k.i}"},
            defaultValues: [null, {k: {i: 4}}]
        }
        const timerData = new Map()
        const data = new Map()
        data.set("1t1", {k: {i: 2}})
        const dataOut = []
        const mqttPublish = (topic: string, message: string) => {
            dataOut.push({topic, message})
        }


        evaluateTransformAndEmitLogic(combineLatestOps, data, timerData, {}, mqttPublish, false)
        dataOut.should.be.eql([{topic: "out", message: "{\"message\":\"2 4\"}"}])
        dataOut.pop()

        data.set("1t1", {k: {i: 3}})
        evaluateTransformAndEmitLogic(combineLatestOps, data, timerData, {}, mqttPublish, false)
        dataOut.should.be.eql([{topic: "out", message: "{\"message\":\"3 4\"}"}])
        dataOut.pop()

        data.set("1t1", {k: {i: 9}})
        evaluateTransformAndEmitLogic(combineLatestOps, data, timerData, {}, mqttPublish, false)
        dataOut.should.be.eql([{topic: "out", message: "{\"message\":\"9 4\"}"}])
        dataOut.pop()

        data.set("1t2", {k: {i: 6}})
        evaluateTransformAndEmitLogic(combineLatestOps, data, timerData, {}, mqttPublish, false)
        dataOut.should.be.eql([{topic: "out", message: "{\"message\":\"9 6\"}"}])
        dataOut.pop()
    }
}