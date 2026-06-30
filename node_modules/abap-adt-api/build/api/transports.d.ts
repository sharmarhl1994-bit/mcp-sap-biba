import { SAPRC } from "../AdtException";
import { AdtHTTP } from "../AdtHTTP";
import { Link } from "./objectstructure";
interface TransportHeader {
    TRKORR: string;
    TRFUNCTION: string;
    TRSTATUS: string;
    TARSYSTEM: string;
    AS4USER: string;
    AS4DATE: string;
    AS4TIME: string;
    AS4TEXT: string;
    CLIENT: string;
}
interface TransportLock {
    HEADER: TransportHeader;
    TASKS: TransportHeader[];
    OBJECT_KEY: {
        OBJ_NAME: string;
        OBJECT: string;
        PGMID: string;
    };
}
export interface TransportInfo {
    PGMID: string;
    OBJECT: string;
    OBJECTNAME: string;
    OPERATION: string;
    DEVCLASS: string;
    CTEXT: string;
    KORRFLAG: string;
    AS4USER: string;
    PDEVCLASS: string;
    DLVUNIT: string;
    MESSAGES?: {
        SEVERITY: string;
        SPRSL: string;
        ARBGB: string;
        MSGNR: number;
        VARIABLES: string[];
        TEXT: string;
    }[];
    NAMESPACE: string;
    RESULT: string;
    RECORDING: string;
    EXISTING_REQ_ONLY: string;
    TRANSPORTS: TransportHeader[];
    TADIRDEVC?: string;
    URI?: string;
    LOCKS?: TransportLock;
}
export interface TransportConfigurationEntry {
    createdBy: string;
    changedBy: string;
    client: string;
    link: string;
    etag: string;
    createdAt: number;
    changedAt: number;
}
export declare enum TransportDateFilter {
    SinceYesterday = 0,
    SincleTwoWeeks = 1,
    SinceFourWeeks = 2,
    DateRange = 3
}
export interface SimpleTransportConfiguration {
    DateFilter: TransportDateFilter.SinceYesterday | TransportDateFilter.SincleTwoWeeks | TransportDateFilter.SinceFourWeeks;
    WorkbenchRequests: boolean;
    TransportOfCopies: boolean;
    Released: boolean;
    User: string;
    CustomizingRequests: boolean;
    Modifiable: boolean;
}
export interface RangeTransportConfiguration {
    DateFilter: TransportDateFilter;
    FromDate: number;
    ToDate: number;
    WorkbenchRequests: boolean;
    TransportOfCopies: boolean;
    Released: boolean;
    User: string;
    CustomizingRequests: boolean;
    Modifiable: boolean;
}
export type TransportConfiguration = SimpleTransportConfiguration | RangeTransportConfiguration;
export declare function transportInfo(h: AdtHTTP, URI: string, DEVCLASS?: string, OPERATION?: string): Promise<TransportInfo>;
export declare function createTransport(h: AdtHTTP, REF: string, REQUEST_TEXT: string, DEVCLASS: string, OPERATION?: string, transportLayer?: string): Promise<string>;
export interface TransportObject {
    "tm:pgmid": string;
    "tm:type": string;
    "tm:name": string;
    "tm:dummy_uri": string;
    "tm:obj_info": string;
}
export interface TransportTask {
    "tm:number": string;
    "tm:owner": string;
    "tm:desc": string;
    "tm:status": string;
    "tm:uri": string;
    links: Link[];
    objects: TransportObject[];
}
export interface TransportRequest extends TransportTask {
    tasks: TransportTask[];
}
export interface TransportTarget {
    "tm:name": string;
    "tm:desc": string;
    modifiable: TransportRequest[];
    released: TransportRequest[];
}
export interface TransportsOfUser {
    workbench: TransportTarget[];
    customizing: TransportTarget[];
}
export declare function userTransports(h: AdtHTTP, user: string, targets?: boolean): Promise<TransportsOfUser>;
export declare function transportsByConfig(h: AdtHTTP, configUri: string, targets?: boolean): Promise<TransportsOfUser>;
export declare function createTransportsConfig(h: AdtHTTP): Promise<TransportConfiguration>;
export declare function setTransportsConfig(h: AdtHTTP, uri: string, etag: string, config: TransportConfiguration): Promise<TransportConfiguration>;
export declare function transportDelete(h: AdtHTTP, transportNumber: string): Promise<void>;
export interface TransportReleaseMessage {
    "chkrun:uri": string;
    "chkrun:type": SAPRC;
    "chkrun:shortText": string;
}
export interface TransportReleaseReport {
    "chkrun:reporter": string;
    "chkrun:triggeringUri": string;
    "chkrun:status": "released" | "abortrelapifail";
    "chkrun:statusText": string;
    messages: TransportReleaseMessage[];
}
export declare function transportRelease(h: AdtHTTP, transportNumber: string, ignoreLocks?: boolean, IgnoreATC?: boolean): Promise<TransportReleaseReport[]>;
export interface TransportOwnerResponse {
    "tm:targetuser": string;
    "tm:number": string;
}
export declare function transportSetOwner(h: AdtHTTP, transportNumber: string, targetuser: string): Promise<TransportOwnerResponse>;
export interface TransportAddUserResponse {
    "tm:number": string;
    "tm:targetuser": string;
    "tm:uri": string;
    "tm:useraction": string;
}
export declare function transportAddUser(h: AdtHTTP, transportNumber: string, user: string): Promise<TransportAddUserResponse>;
export interface SystemUser {
    id: string;
    title: string;
}
export declare function systemUsers(h: AdtHTTP): Promise<SystemUser[]>;
export declare function transportReference(h: AdtHTTP, pgmid: string, obj_wbtype: string, obj_name: string, tr_number?: string): Promise<string>;
export declare function transportConfigurations(h: AdtHTTP): Promise<TransportConfigurationEntry[]>;
export declare function getTransportConfiguration(h: AdtHTTP, url: string): Promise<TransportConfiguration>;
export {};
//# sourceMappingURL=transports.d.ts.map