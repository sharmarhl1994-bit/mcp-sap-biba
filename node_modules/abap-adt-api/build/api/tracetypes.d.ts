import * as t from "io-ts";
declare const rawProcessTypes: t.UnionC<[t.LiteralC<"/sap/bc/adt/runtime/traces/abaptraces/processtypes/any">, t.LiteralC<"/sap/bc/adt/runtime/traces/abaptraces/processtypes/http">, t.LiteralC<"/sap/bc/adt/runtime/traces/abaptraces/processtypes/dialog">, t.LiteralC<"/sap/bc/adt/runtime/traces/abaptraces/processtypes/batch">, t.LiteralC<"/sap/bc/adt/runtime/traces/abaptraces/processtypes/rfc">, t.LiteralC<"/sap/bc/adt/runtime/traces/abaptraces/processtypes/sharedobjectsarea">]>;
declare const rawObjectTypes: t.UnionC<[t.LiteralC<"/sap/bc/adt/runtime/traces/abaptraces/objecttypes/any">, t.LiteralC<"/sap/bc/adt/runtime/traces/abaptraces/objecttypes/url">, t.LiteralC<"/sap/bc/adt/runtime/traces/abaptraces/objecttypes/transaction">, t.LiteralC<"/sap/bc/adt/runtime/traces/abaptraces/objecttypes/report">, t.LiteralC<"/sap/bc/adt/runtime/traces/abaptraces/objecttypes/functionmodule">, t.LiteralC<"/sap/bc/adt/runtime/traces/abaptraces/objecttypes/sharedobjectarea">]>;
type RawObjectTypes = t.TypeOf<typeof rawObjectTypes>;
type RawProcessTypes = t.TypeOf<typeof rawProcessTypes>;
export interface TraceResults {
    author: string;
    contributor: string;
    title: string;
    updated: Date;
    runs: TraceRun[];
}
export interface TraceRun {
    id: string;
    author: string;
    title: string;
    published: Date;
    updated: Date;
    authorUri: string;
    type: string;
    src: string;
    lang: string;
    extendedData: ExtendedTraceData;
    links: TraceLink[];
}
export interface ExtendedTraceData {
    host: string;
    size: number;
    runtime: number;
    runtimeABAP: number;
    runtimeSystem: number;
    runtimeDatabase: number;
    expiration: Date;
    system: string;
    client: number;
    isAggregated: boolean;
    aggregationKind?: string;
    objectName: string;
    state: State;
}
export interface State {
    value: string;
    text: string;
}
export interface TraceLink {
    href: string;
    rel: string;
    type: string;
    title: string;
}
export interface TraceHitList {
    parentLink: string;
    entries: HitListEntry[];
}
export interface CallingProgram {
    context: string;
    byteCodeOffset: number;
    uri?: string;
    type?: string;
    name?: string;
    packageName?: string;
    objectReferenceQuery?: string;
}
export interface HitListEntry {
    topDownIndex: number;
    index: number;
    hitCount: number;
    stackCount?: number;
    recursionDepth: number;
    description: string;
    proceduralEntryAnchor?: number;
    dbAccessAnchor?: number;
    callingProgram?: CallingProgram;
    calledProgram: string;
    grossTime: TraceTime;
    traceEventNetTime: TraceTime;
    proceduralNetTime: TraceTime;
}
export interface TraceTime {
    time: number;
    percentage: number;
}
export interface TraceDBAccessResponse {
    parentLink: string;
    dbaccesses: Dbaccess[];
    tables: Table[];
}
export interface Dbaccess {
    index: number;
    tableName: string;
    statement: string;
    type: TraceTableType;
    totalCount: number;
    bufferedCount: number;
    accessTime: AccessTime;
    callingProgram?: CallingProgram;
}
export interface AccessTime {
    total: number;
    applicationServer: number;
    database: number;
    ratioOfTraceTotal: number;
}
export type TraceTableType = "" | "EXEC SQL" | "OpenSQL";
export interface Table {
    name: string;
    type: string;
    description: string;
    bufferMode: string;
    storageType: string;
    package: string;
}
export interface TraceStatement {
    index: number;
    id: number;
    description: string;
    hitCount: number;
    hasDetailSubnodes: boolean;
    hasProcedureLikeSubnodes: boolean;
    callerId: number;
    callLevel: number;
    subnodeCount: number;
    directSubnodeCount: number;
    directSubnodeCountProcedureLike: number;
    isAutoDrillDowned?: boolean;
    isProceduralUnit?: boolean;
    isProcedureLike?: boolean;
    hitlistAnchor: number;
    calltreeAnchor?: number;
    moduleHitlistAnchor?: number;
    callingProgram: CallingProgram;
    grossTime: TraceTime;
    traceEventNetTime: TraceTime;
    proceduralNetTime: TraceTime;
}
export interface TraceStatementResponse {
    withDetails: boolean;
    withSysEvents: boolean;
    count: number;
    parentLink: string;
    statements: TraceStatement[];
}
export type TraceStatementOptions = Partial<{
    id: number;
    withDetails: boolean;
    autoDrillDownThreshold: number;
    withSystemEvents: boolean;
}>;
export interface TraceRequestAuthor {
    name: string;
    role: string;
    uri: string;
}
export interface TraceRequestClient {
    id: number;
    role: string;
}
export interface TraceRequestExecutions {
    maximal: number;
    completed: number;
}
export interface TraceRequestExtendedData {
    description: string;
    executions: TraceRequestExecutions;
    isAggregated: boolean;
    host: string;
    expires: Date;
    processType: TracedProcessType;
    objectType: TracedObjectType;
    requestIndex: number;
    clients: TraceRequestClient[];
}
export interface TraceRequest {
    id: string;
    lang: string;
    title: string;
    published: Date;
    updated: Date;
    links: TraceLink[];
    authors: TraceRequestAuthor[];
    contentSrc: string;
    contentType: string;
    extendedData: TraceRequestExtendedData;
}
export interface TraceRequestList {
    title: string;
    contributorName: string;
    contributorRole: string;
    requests: TraceRequest[];
}
export interface TraceParameters {
    allMiscAbapStatements: boolean;
    allProceduralUnits: boolean;
    allInternalTableEvents: boolean;
    allDynproEvents: boolean;
    description: string;
    aggregate: boolean;
    explicitOnOff: boolean;
    withRfcTracing: boolean;
    allSystemKernelEvents: boolean;
    sqlTrace: boolean;
    allDbEvents: boolean;
    maxSizeForTraceFile: number;
    maxTimeForTracing: number;
}
export type TracedProcessType = "HTTP" | "DIALOG" | "RFC" | "BATCH" | "SHARED_OBJECTS_AREA" | "ANY";
export type TracedObjectType = "FUNCTION_MODULE" | "URL" | "TRANSACTION" | "REPORT" | "SHARED_OBJECTS_AREA" | "ANY";
export declare const traceProcessTypeUris: Record<TracedProcessType, RawProcessTypes>;
export declare const traceObjectTypeUris: Record<TracedObjectType, RawObjectTypes>;
export declare const traceProcessObjects: Record<TracedProcessType, TracedObjectType[]>;
export interface TracesCreationConfig {
    /**
     * server name, use * for all servers
     */
    server?: string;
    description: string;
    traceUser: string;
    traceClient: string;
    processType: TracedProcessType;
    objectType: TracedObjectType;
    expires: Date;
    maximalExecutions: number;
    parametersId: string;
}
export declare const parseTraceResults: (xml: string) => TraceResults;
export declare const parseTraceHitList: (xml: string) => TraceHitList;
export declare const parseTraceDbAccess: (xml: string) => TraceDBAccessResponse;
export declare const parseTraceStatements: (xml: string) => {
    count: number;
    parentLink: string;
    statements: {
        callingProgram: {
            type: string | undefined;
            name: string | undefined;
            context: string;
            byteCodeOffset: number;
            uri: string | undefined;
            packageName: string | undefined;
            objectReferenceQuery: string | undefined;
        };
        grossTime: {
            time: number;
            percentage: number;
        };
        traceEventNetTime: {
            time: number;
            percentage: number;
        };
        proceduralNetTime: {
            time: number;
            percentage: number;
        };
        description: string;
        id: number;
        index: number;
        hitCount: number;
        hasDetailSubnodes: boolean;
        hasProcedureLikeSubnodes: boolean;
        callerId: number;
        callLevel: number;
        subnodeCount: number;
        directSubnodeCount: number;
        directSubnodeCountProcedureLike: number;
        hitlistAnchor: number;
        isProcedureLike: boolean | undefined;
        isProceduralUnit: boolean | undefined;
        isAutoDrillDowned: boolean | undefined;
        calltreeAnchor: number | undefined;
        moduleHitlistAnchor: number | undefined;
    }[];
    withDetails: boolean;
    withSysEvents: boolean;
};
export declare const parseTraceRequestList: (xml: string) => TraceRequestList;
export {};
//# sourceMappingURL=tracetypes.d.ts.map