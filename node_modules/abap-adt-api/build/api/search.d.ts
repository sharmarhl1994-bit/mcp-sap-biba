import { AdtHTTP } from "../AdtHTTP";
export interface SearchResult {
    "adtcore:description"?: string;
    "adtcore:name": string;
    "adtcore:packageName"?: string;
    "adtcore:type": string;
    "adtcore:uri": string;
}
export interface PathStep {
    "adtcore:name": string;
    "adtcore:type": string;
    "adtcore:uri": string;
    "projectexplorer:category": string;
}
export type PackageValueHelpType = "applicationcomponents" | "softwarecomponents" | "transportlayers" | "translationrelevances";
export interface PackageValueHelpResult {
    name: string;
    description: string;
    data: string;
}
export declare function searchObject(h: AdtHTTP, query: string, objType?: string, maxResults?: number): Promise<SearchResult[]>;
export declare function findObjectPath(h: AdtHTTP, objectUrl: string): Promise<PathStep[]>;
export declare function abapDocumentation(h: AdtHTTP, objectUri: string, body: string, line: number, column: number, language?: string): Promise<string>;
export declare function packageSearchHelp(h: AdtHTTP, type: PackageValueHelpType, name?: string): Promise<PackageValueHelpResult[]>;
//# sourceMappingURL=search.d.ts.map