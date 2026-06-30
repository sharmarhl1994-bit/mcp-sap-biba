import { AdtHTTP } from "../AdtHTTP";
export type ObjectVersion = "active" | "inactive" | "workingArea";
export interface GenericMetaData {
    "abapsource:activeUnicodeCheck"?: boolean;
    "abapsource:fixPointArithmetic"?: boolean;
    "abapsource:sourceUri"?: string;
    "adtcore:changedAt": number;
    "adtcore:changedBy": string;
    "adtcore:createdAt": number;
    "adtcore:description"?: string;
    "adtcore:descriptionTextLimit"?: number;
    "adtcore:language": string;
    "adtcore:masterLanguage"?: string;
    "adtcore:masterSystem"?: string;
    "adtcore:name": string;
    "adtcore:responsible": string;
    "adtcore:type": string;
    "adtcore:version": string;
}
export interface ProgramMetaData extends GenericMetaData {
    "program:lockedByEditor": boolean;
    "program:programType": string;
}
export interface FunctionGroupMetaData extends GenericMetaData {
    "group:lockedByEditor": boolean;
}
export interface ClassMetaData extends GenericMetaData {
    "abapoo:modeled": boolean;
    "class:abstract": boolean;
    "class:category": string;
    "class:final": boolean;
    "class:sharedMemoryEnabled": boolean;
    "class:visibility": string;
}
export interface Link {
    etag?: number;
    href: string;
    rel: string;
    type?: string;
    title?: string;
}
export type classIncludes = "definitions" | "implementations" | "macros" | "testclasses" | "main";
export interface ClassInclude {
    "abapsource:sourceUri": string;
    "adtcore:changedAt": number;
    "adtcore:changedBy": string;
    "adtcore:createdAt": number;
    "adtcore:createdBy": string;
    "adtcore:name": string;
    "adtcore:type": string;
    "adtcore:version": string;
    "class:includeType": classIncludes;
    links: Link[];
}
export type AbapMetaData = GenericMetaData | ProgramMetaData | FunctionGroupMetaData | ClassMetaData;
export interface AbapSimpleStructure {
    objectUrl: string;
    metaData: AbapMetaData;
    links: Link[];
}
export interface AbapClassStructure {
    objectUrl: string;
    metaData: ClassMetaData;
    links?: Link[];
    includes: ClassInclude[];
}
export type AbapObjectStructure = AbapSimpleStructure | AbapClassStructure;
export declare function isClassMetaData(meta: AbapMetaData): meta is ClassMetaData;
export declare function isClassStructure(struc: AbapObjectStructure): struc is AbapClassStructure;
export declare function objectStructure(h: AdtHTTP, objectUrl: string, version?: ObjectVersion): Promise<AbapObjectStructure>;
//# sourceMappingURL=objectstructure.d.ts.map