import { suite, test } from '@testdeck/mocha';
import chai from 'chai';
import {ConstantDef, MapOps} from "../src/types";
import {handleMessage} from "../src/mqtt";
chai.should();

@suite class HandleMessageTest {
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
        const dataOut = []
        const mqttPublish = (topic: string, message: string) => {
            dataOut.push({topic, message})
        };
        const d = {k: {i: 5}}
        const str = JSON.stringify(d)
        handleMessage("t", Buffer.from(str, "utf-8"), [mapOps], [], data, timerData, mqttPublish, false)

        dataOut.should.be.eql([{topic: "out", message: "{\"message\":\"I 5\"}"}])
    }

    @test 'should handle constants'() {
        const mapOps: MapOps = {
            emitType: "map",
            id: 1,
            fromTopics: ["t"],
            //topicKeyToMessage?: string,
            toTopicTemplate: "out",
            //wrapper?: string,
            template: {"message": "I ${k.i}, ${f}, ${g}"},
            useConstants: {"f": "a", "g": "b", "h": "c"}
        }
        const constants: ConstantDef[] = [
            {
                emitType: "constant",
                id: 1,
                name: "a",
                value: 1,
            },
            {
                emitType: "constant",
                id: 1,
                name: "b",
                value: 4,
            }
        ]
        const timerData = new Map()
        const data = new Map()
        const dataOut = []
        const mqttPublish = (topic: string, message: string) => {
            dataOut.push({topic, message})
        };
        const d = {k: {i: 5}}
        const str = JSON.stringify(d)
        handleMessage("t", Buffer.from(str, "utf-8"), [mapOps], constants, data, timerData, mqttPublish, false)

        dataOut.should.be.eql([{topic: "out", message: "{\"message\":\"I 5, 1, 4\"}"}])
    }

}