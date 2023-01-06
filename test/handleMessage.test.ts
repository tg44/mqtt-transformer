import { suite, test } from '@testdeck/mocha';
import chai from 'chai';
import {CombineLatestOps, ConstantDef, MapOps} from "../src/types";
import {handleMessage} from "../src/handleMessage";
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
        const metrics = new Map()
        const dataOut = []
        const mqttPublish = (topic: string, message: string) => {
            dataOut.push({topic, message})
        };
        const d = {k: {i: 5}}
        const str = JSON.stringify(d)
        handleMessage("t", str, 100, [mapOps], [], data, timerData, metrics, mqttPublish, false)

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
        const metrics = new Map()
        const dataOut = []
        const mqttPublish = (topic: string, message: string) => {
            dataOut.push({topic, message})
        };
        const d = {k: {i: 5}}
        const str = JSON.stringify(d)
        handleMessage("t", str, 0, [mapOps], constants, data, timerData, metrics, mqttPublish, false)

        dataOut.should.be.eql([{topic: "out", message: "{\"message\":\"I 5, 1, 4\"}"}])
    }

    @test 'should handle constants with raw data'() {
        const ops: CombineLatestOps = {
            emitType: "combineLatest",
            id: 1,
            fromTopics: ["t1", "t2"],
            //topicKeyToMessage?: string,
            toTopicTemplate: "out",
            //wrapper?: string,
            template: {"message": "I ${messages[0]}, ${messages[1]}, ${f}"},
            useConstants: {"f": "a"}
        }
        const constants: ConstantDef[] = [
            {
                emitType: "constant",
                id: 1,
                name: "a",
                value: 1,
            }
        ]
        const timerData = new Map()
        const data = new Map()
        const metrics = new Map()
        const dataOut = []
        const mqttPublish = (topic: string, message: string) => {
            dataOut.push({topic, message})
        };
        const d1 = 14
        const d2 = 76
        const str1 = JSON.stringify(d1)
        const str2 = JSON.stringify(d2)
        handleMessage("t1", str1, 0, [ops], constants, data, timerData, metrics, mqttPublish, false)
        handleMessage("t2", str2, 0, [ops], constants, data, timerData, metrics, mqttPublish, false)

        dataOut.should.be.eql([{topic: "out", message: "{\"message\":\"I 14, 76, 1\"}"}])
    }


    @test 'should handle metrics'() {
        const mapOps: MapOps = {
            emitType: "map",
            id: 1,
            fromTopics: ["t"],
            toTopicTemplate: "out",
            template: {"message": "I ${k.i}, ${mc}, ${fm}, ${pm}, ${lm}"},
            useMetrics: {
                "mc": "messageCount",
                "fm":"firstMessageTime",
                "pm":"prevMessageTime",
                "lm":"lastMessageTime"
            }
        }
        const timerData = new Map()
        const data = new Map()
        const metrics = new Map()
        const dataOut = []
        const mqttPublish = (topic: string, message: string) => {
            dataOut.push({topic, message})
        };
        const d = {k: {i: 5}}
        const str = JSON.stringify(d)
        handleMessage("t", str, 0, [mapOps], [], data, timerData, metrics, mqttPublish, false)

        dataOut.should.be.eql([{topic: "out", message: "{\"message\":\"I 5, 1, 0, 0, 0\"}"}])
        dataOut.pop()

        handleMessage("t", str, 10, [mapOps], [], data, timerData, metrics, mqttPublish, false)
        dataOut.should.be.eql([{topic: "out", message: "{\"message\":\"I 5, 2, 0, 0, 10\"}"}])
        dataOut.pop()

        handleMessage("t", str, 30, [mapOps], [], data, timerData, metrics, mqttPublish, false)
        dataOut.should.be.eql([{topic: "out", message: "{\"message\":\"I 5, 3, 0, 10, 30\"}"}])
    }

    @test 'should handle raw data'() {
        const mapOps: MapOps = {
            emitType: "map",
            id: 1,
            fromTopics: ["t"],
            toTopicTemplate: "out",
            wrapper: "k",
            template: {"message": "I ${k}"},
        }
        const timerData = new Map()
        const data = new Map()
        const metrics = new Map()
        const dataOut = []
        const mqttPublish = (topic: string, message: string) => {
            dataOut.push({topic, message})
        };
        let str = JSON.stringify(5)
        handleMessage("t", str, 0, [mapOps], [], data, timerData, metrics, mqttPublish, false)

        dataOut.should.be.eql([{topic: "out", message: "{\"message\":\"I 5\"}"}])
        dataOut.pop()

        str = JSON.stringify("test")
        handleMessage("t", str, 0, [mapOps], [], data, timerData, metrics, mqttPublish, false)
        dataOut.should.be.eql([{topic: "out", message: "{\"message\":\"I test\"}"}])
        dataOut.pop()

        str = JSON.stringify(false)
        handleMessage("t", str, 0, [mapOps], [], data, timerData, metrics, mqttPublish, false)
        dataOut.should.be.eql([{topic: "out", message: "{\"message\":\"I false\"}"}])
    }

    @test 'should handle in topic'() {
        const mapOps: MapOps = {
            emitType: "map",
            id: 1,
            fromTopics: ["t/+/f"],
            toTopicTemplate: "out",
            topicKeyToMessage: "topic",
            template: {"message": "I ${topic}"},
        }
        const timerData = new Map()
        const data = new Map()
        const metrics = new Map()
        const dataOut = []
        const mqttPublish = (topic: string, message: string) => {
            dataOut.push({topic, message})
        };
        let str = JSON.stringify({k: {i: 5}})
        handleMessage("t/test/f", str, 0, [mapOps], [], data, timerData, metrics, mqttPublish, false)

        dataOut.should.be.eql([{topic: "out", message: "{\"message\":\"I t/test/f\"}"}])
    }

    @test 'should handle out topic'() {
        const mapOps: MapOps = {
            emitType: "map",
            id: 1,
            fromTopics: ["t"],
            toTopicTemplate: "t_${k.i}_out",
            template: {"message": "I ${k.i}"},
        }
        const timerData = new Map()
        const data = new Map()
        const metrics = new Map()
        const dataOut = []
        const mqttPublish = (topic: string, message: string) => {
            dataOut.push({topic, message})
        };
        let str = JSON.stringify({k: {i: 5}})
        handleMessage("t", str, 0, [mapOps], [], data, timerData, metrics, mqttPublish, false)

        dataOut.should.be.eql([{topic: "t_5_out", message: "{\"message\":\"I 5\"}"}])
    }
}