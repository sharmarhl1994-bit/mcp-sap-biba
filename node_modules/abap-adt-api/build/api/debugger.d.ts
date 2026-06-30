import { AdtHTTP } from "../AdtHTTP";
import { UriParts } from "./urlparser";
export type DebuggingMode = "user" | "terminal";
export interface DebugMessage {
    text: string;
    lang: string;
}
export interface DebugListenerError {
    namespace: string;
    type: string;
    message: DebugMessage;
    localizedMessage: DebugMessage;
    conflictText: string;
    ideUser: string;
    "com.sap.adt.communicationFramework.subType": string;
    "T100KEY-ID": string;
    "T100KEY-NO": number;
}
export interface Debuggee {
    CLIENT: number;
    DEBUGGEE_ID: string;
    TERMINAL_ID: string;
    IDE_ID: string;
    DEBUGGEE_USER: string;
    PRG_CURR: string;
    INCL_CURR: string;
    LINE_CURR: number;
    RFCDEST: string;
    APPLSERVER: string;
    SYSID: string;
    SYSNR: number;
    DBGKEY: string;
    TSTMP: number;
    DBGEE_KIND: string;
    DUMPID: string;
    DUMPDATE: string;
    DUMPTIME: string;
    DUMPHOST: string;
    DUMPMODNO: number;
    LISTENER_CTX_ID: string;
    IS_ATTACH_IMPOSSIBLE: boolean;
    APPSERVER: string;
    IS_SAME_SERVER: boolean;
    CAN_ADT_CROSS_SERVER: boolean;
    INSTANCE_NAME: string;
    HOST: string;
    DUMP_ID: string;
    DUMP_DATE: string;
    DUMP_TIME: string;
    DUMP_HOST: string;
    DUMP_UNAME: string;
    DUMP_MODNO: number;
    DUMP_CLIENT: string;
    DUMP_URI: string;
    URI: UriParts;
    TYPE: string;
    NAME: string;
    PARENT_URI: string;
    PACKAGE_NAME: string;
    DESCRIPTION: string;
}
export interface DebugBreakpoint {
    kind: string;
    clientId: string;
    id: string;
    nonAbapFlavour: string;
    uri: UriParts;
    type: string;
    name: string;
    condition?: string;
}
export interface DebugBreakpointError {
    kind: string;
    clientId: string;
    errorMessage: string;
    nonAbapFlavour: string;
}
export interface DebugState {
    isRfc: boolean;
    isSameSystem: boolean;
    serverName: string;
    debugSessionId: string;
    processId: number;
    isPostMortem: boolean;
    isUserAuthorizedForChanges: boolean;
    debuggeeSessionId: string;
    abapTraceState: string;
    canAdvancedTableFeatures: boolean;
    isNonExclusive: boolean;
    isNonExclusiveToggled: boolean;
    guiEditorGuid: string;
    sessionTitle: string;
    isSteppingPossible?: boolean;
    isTerminationPossible: boolean;
    actions: DebugAction[];
}
export interface DebugAttach extends DebugState {
    reachedBreakpoints: DebugReachedBreakpoint[];
}
export interface DebugStep extends DebugState {
    isDebuggeeChanged: boolean;
    settings: DebugSettings;
    reachedBreakpoints?: DebugReachedBreakpoint[];
}
export interface DebugAction {
    name: string;
    style: string;
    group: string;
    title: string;
    link: string;
    value: boolean | string;
    disabled: boolean;
}
export interface DebugReachedBreakpoint {
    id: string;
    kind: string;
    unresolvableCondition: string;
    unresolvableConditionErrorOffset: string;
}
export interface DebugSettings {
    systemDebugging: boolean;
    createExceptionObject: boolean;
    backgroundRFC: boolean;
    sharedObjectDebugging: boolean;
    showDataAging: boolean;
    updateDebugging: boolean;
}
export type DebugStackType = "ABAP" | "DYNP" | "ENHANCEMENT";
export type DebugStackSourceType = "ABAP" | "DYNP" | "ST";
export interface DebugStackAbap {
    stackPosition: number;
    stackType: DebugStackType;
    stackUri: string;
    programName: string;
    includeName: number | string;
    line: number;
    eventType: string;
    eventName: number | string;
    sourceType: DebugStackSourceType;
    systemProgram: boolean;
    isVit: false;
    uri: UriParts;
}
export interface DebugStackSimple {
    programName: string;
    includeName: string;
    line: number;
    eventType: string;
    eventName: string;
    stackPosition: number;
    systemProgram: boolean;
    uri: UriParts;
}
export interface DebugStackVit {
    stackPosition: number;
    stackType: DebugStackType;
    stackUri: string;
    programName: string;
    includeName: number | string;
    line: number;
    eventType: string;
    eventName: number | string;
    sourceType: DebugStackSourceType;
    systemProgram: boolean;
    isVit: true;
    uri: UriParts;
    canVitOpen: boolean;
    canVitBreakpoints: boolean;
    canVitBreakpointCondition: boolean;
    canVitJumpToLine: boolean;
    canVitRunToLine: boolean;
    type: string;
    name: string;
}
export type DebugStack = DebugStackAbap | DebugStackVit | DebugStackSimple;
export interface DebugStackInfo {
    isRfc: boolean;
    debugCursorStackIndex?: number;
    isSameSystem: boolean;
    serverName: string;
    stack: DebugStack[];
}
export interface DebugChildVariablesInfo {
    hierarchies: DebugChildVariablesHierarchy[];
    variables: DebugVariable[];
}
export interface DebugChildVariablesHierarchy {
    PARENT_ID: string;
    CHILD_ID: string;
    CHILD_NAME: string;
}
export type DebugMetaTypeSimple = "simple" | "string" | "boxedcomp" | "anonymcomp" | "unknown";
export type DebugMetaTypeComplex = "structure" | "table" | "dataref" | "objectref" | "class" | "object" | "boxref";
export type DebuggerScope = "external" | "debugger";
export type DebugMetaType = DebugMetaTypeSimple | DebugMetaTypeComplex;
export interface DebugVariable {
    ID: string;
    NAME: string;
    DECLARED_TYPE_NAME: string;
    ACTUAL_TYPE_NAME: string;
    KIND: string;
    INSTANTIATION_KIND: string;
    ACCESS_KIND: string;
    META_TYPE: DebugMetaType;
    PARAMETER_KIND: string;
    VALUE: string;
    HEX_VALUE: string;
    READ_ONLY: string;
    TECHNICAL_TYPE: string;
    LENGTH: number;
    TABLE_BODY: string;
    TABLE_LINES: number;
    IS_VALUE_INCOMPLETE: string;
    IS_EXCEPTION: string;
    INHERITANCE_LEVEL: number;
    INHERITANCE_CLASS: string;
}
export type DebugStepType = "stepInto" | "stepOver" | "stepReturn" | "stepContinue" | "stepRunToLine" | "stepJumpToLine" | "terminateDebuggee";
export declare const debugMetaIsComplex: (m: DebugMetaType) => m is DebugMetaTypeComplex;
export declare const isDebugListenerError: (e: any) => e is DebugListenerError;
export declare const isDebuggee: (d: any) => d is Debuggee;
export declare function debuggerListeners(h: AdtHTTP, debuggingMode: DebuggingMode, terminalId: string, ideId: string, requestUser?: string, checkConflict?: boolean): Promise<DebugListenerError | undefined>;
export declare function debuggerListen(h: AdtHTTP, debuggingMode: DebuggingMode, terminalId: string, ideId: string, requestUser?: string, checkConflict?: boolean, isNotifiedOnConflict?: boolean): Promise<DebugListenerError | Debuggee | undefined>;
export declare function debuggerDeleteListener(h: AdtHTTP, debuggingMode: DebuggingMode, terminalId: string, ideId: string, requestUser?: string): Promise<void>;
export declare const isDebuggerBreakpoint: (x: DebugBreakpointError | DebugBreakpoint) => x is DebugBreakpoint;
export declare function debuggerSetBreakpoints(h: AdtHTTP, debuggingMode: DebuggingMode, terminalId: string, ideId: string, clientId: string, breakpoints: (DebugBreakpoint | string)[], requestUser?: string, scope?: DebuggerScope, systemDebugging?: boolean, deactivated?: boolean, syncScopeUri?: string): Promise<(DebugBreakpoint | DebugBreakpointError)[]>;
export declare function debuggerDeleteBreakpoints(h: AdtHTTP, breakpoint: DebugBreakpoint, debuggingMode: DebuggingMode, terminalId: string, ideId: string, requestUser?: string, scope?: DebuggerScope): Promise<void>;
export declare function debuggerAttach(h: AdtHTTP, debuggingMode: DebuggingMode, debuggeeId: string, requestUser?: string, dynproDebugging?: boolean): Promise<DebugAttach>;
export declare function debuggerSaveSettings(h: AdtHTTP, settings: Partial<DebugSettings>): Promise<DebugSettings>;
export declare function debuggerStack(h: AdtHTTP, semanticURIs?: boolean): Promise<DebugStackInfo>;
export declare function simpleDebuggerStack(h: AdtHTTP, semanticURIs?: boolean): Promise<DebugStackInfo>;
export declare function debuggerChildVariables(h: AdtHTTP, parents?: string[]): Promise<DebugChildVariablesInfo>;
export declare function debuggerVariables(h: AdtHTTP, parents: string[]): Promise<DebugVariable[]>;
export declare function debuggerStep(h: AdtHTTP, method: DebugStepType, uri?: string): Promise<DebugStep>;
export declare function debuggerGoToStack(h: AdtHTTP, stackUri: string): Promise<void>;
export declare function debuggerGoToStackOld(h: AdtHTTP, position: number): Promise<void>;
export declare function debuggerSetVariableValue(h: AdtHTTP, variableName: string, value: string): Promise<string>;
//# sourceMappingURL=debugger.d.ts.map