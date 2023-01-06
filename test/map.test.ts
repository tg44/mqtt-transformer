import { suite, test } from '@testdeck/mocha';
import chai from 'chai';
import {MapOps} from "../src/types";
import {evaluateTransformAndEmitLogic} from "../src/operators";
chai.should();

@suite class MapTests {
    @test 'should work'() {
        const mapOps: MapOps = {
            emitType: "map",
            id: 1,
            fromTopics: ["t"],
            //topicKeyToMessage?: string,
            toTopicTemplate: "out",
            //wrapper?: string,
            template: {"message": "I ${k.i}"},
        }
        const timerData = new Map()
        const data = new Map()
        data.set("1t", {k: {i: 5}})
        const dataOut = []
        const mqttPublish = (topic: string, message: string) => {
            dataOut.push({topic, message})
        }


        evaluateTransformAndEmitLogic(mapOps, data, timerData, {}, mqttPublish, false)

        dataOut.should.be.eql([{topic: "out", message: "{\"message\":\"I 5\"}"}])
    }

}