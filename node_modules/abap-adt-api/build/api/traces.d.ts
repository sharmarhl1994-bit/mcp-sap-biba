import { TraceDBAccessResponse, TraceHitList, TraceParameters, TraceResults, TraceStatementOptions, TraceStatementResponse, TracesCreationConfig, TraceRequestList } from "./tracetypes";
import { AdtHTTP } from "../AdtHTTP";
export { TraceResults, TraceHitList, TraceDBAccessResponse, TraceStatementResponse, TraceStatementOptions, TracesCreationConfig, TraceParameters, traceProcessObjects, TraceRequestList } from "./tracetypes";
export declare const tracesList: (h: AdtHTTP, user: string) => Promise<TraceResults>;
export declare const tracesListRequests: (h: AdtHTTP, user: string) => Promise<TraceRequestList>;
export declare const tracesHitList: (h: AdtHTTP, id: string, withSystemEvents?: boolean) => Promise<TraceHitList>;
export declare const tracesDbAccess: (h: AdtHTTP, id: string, withSystemEvents?: boolean) => Promise<TraceDBAccessResponse>;
export declare const tracesStatements: (h: AdtHTTP, id: string, options?: TraceStatementOptions) => Promise<TraceStatementResponse>;
export declare const tracesSetParameters: (h: AdtHTTP, parameters: TraceParameters) => Promise<string>;
export declare const tracesCreateConfiguration: (h: AdtHTTP, config: TracesCreationConfig) => Promise<TraceRequestList>;
export declare const tracesDeleteConfiguration: (h: AdtHTTP, id: string) => Promise<void>;
export declare const tracesDelete: (h: AdtHTTP, id: string) => Promise<void>;
//# sourceMappingURL=traces.d.ts.map