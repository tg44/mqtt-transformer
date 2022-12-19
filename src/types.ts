type EmitType = 'constant' | 'repeat' | 'once' | 'map' | 'filter' | 'collect' | 'zipLast' | 'combineLatest'
type IOType = 'webserver' | 'mqtt' | 'hookCall'

interface Transformer {
    template: object,
}
interface Filter {
    filterTemplate: object
}

interface Transformation {
    id: number,
    fromTopics: string[],
    topicKeyToMessage?: string,
    toTopicTemplate: string,
    emitType: EmitType,
    wrapper?: string,
    useConstants?: object,
}

export type TransformationOps = RepeatOps | OnceOps | MapOps | CollectOps | ZipLastOps | CombineLatestOps
export type AllSupportedOps = FilterOps | TransformationOps
export type AllSupportedConfigs = ConstantDef | AllSupportedOps
export type AllSupportedIOs = MqttIO | HookCallIO | WebserverIO

export interface ConstantDef {
    emitType: "constant",
    id: number,
    name: string,
    value: any,
}

export interface RepeatOps extends Transformation, Transformer{
    emitType: "repeat",
    emitInterval: number,
}

export interface OnceOps extends Transformation, Transformer {
    emitType: "once",
    emitInterval: number,
}

export interface MapOps extends Transformation, Transformer {
    emitType: "map",
}

export interface FilterOps extends Transformation, Filter {
    emitType: "filter",
}

export interface CollectOps extends Transformation, Transformer, Filter {
    emitType: "collect",
}

export interface ZipLastOps extends Transformation, Transformer {
    emitType: "zipLast",
}

export interface CombineLatestOps extends Transformation, Transformer {
    emitType: "combineLatest",
    defaultValues?: any[],
}

export interface InputOutput {
    id: number,
    type: IOType,
    topicPrefix?: string,
}

export interface WebserverIO extends InputOutput{
    type: "webserver",
    port: number,
}


export interface HookCallIO extends InputOutput{
    type: "hookCall",
    url: string,
    headers?: [string, string][],
    responseTopic?: string,
}

export interface MqttIO extends InputOutput{
    type: "mqtt",
    url: string,
    user?: string,
    password?: string,
    clientId?: string,
}
