import * as t from "io-ts";
import { AdtHTTP } from "../AdtHTTP";
export interface UnitTestStackEntry {
    "adtcore:uri": string;
    "adtcore:type": string;
    "adtcore:name": string;
    "adtcore:description": string;
}
export declare enum UnitTestAlertKind {
    exception = "exception",
    failedAssertion = "failedAssertion",
    warning = "warning"
}
export declare enum UnitTestSeverity {
    critical = "critical",
    fatal = "fatal",
    tolerable = "tolerable",
    tolerant = "tolerant"
}
export interface UnitTestAlert {
    kind: UnitTestAlertKind;
    severity: UnitTestSeverity;
    details: string[];
    stack: UnitTestStackEntry[];
    title: string;
}
export interface UnitTestMethod {
    "adtcore:uri": string;
    "adtcore:type": string;
    "adtcore:name": string;
    executionTime: number;
    uriType: string;
    navigationUri?: string;
    unit: string;
    alerts: UnitTestAlert[];
}
export interface UnitTestClass {
    "adtcore:uri": string;
    "adtcore:type": string;
    "adtcore:name": string;
    uriType: string;
    navigationUri?: string;
    durationCategory: string;
    riskLevel: string;
    testmethods: UnitTestMethod[];
    alerts: UnitTestAlert[];
}
declare const markerCodec: t.TypeC<{
    kind: t.StringC;
    keepsResult: t.BooleanC;
    location: t.TypeC<{
        uri: t.StringC;
        query: t.UnionC<[t.UndefinedC, t.RecordC<t.StringC, t.StringC>]>;
        range: t.TypeC<{
            start: t.TypeC<{
                line: t.NumberC;
                column: t.NumberC;
            }>;
            end: t.TypeC<{
                line: t.NumberC;
                column: t.NumberC;
            }>;
        }>;
        hashparms: t.UnionC<[t.UndefinedC, t.RecordC<t.StringC, t.StringC>]>;
    }>;
}>;
export type UnitTestOccurrenceMarker = t.TypeOf<typeof markerCodec>;
export interface UnitTestRunFlags {
    harmless: boolean;
    dangerous: boolean;
    critical: boolean;
    short: boolean;
    medium: boolean;
    long: boolean;
}
export declare const DefaultUnitTestRunFlags: UnitTestRunFlags;
export declare function runUnitTest(h: AdtHTTP, url: string, flags?: UnitTestRunFlags): Promise<UnitTestClass[]>;
export declare function unitTestEvaluation(h: AdtHTTP, clas: UnitTestClass, flags?: UnitTestRunFlags): Promise<UnitTestMethod[]>;
export declare function unitTestOccurrenceMarkers(h: AdtHTTP, uri: string, source: string): Promise<UnitTestOccurrenceMarker[]>;
export {};
//# sourceMappingURL=unittest.d.ts.map