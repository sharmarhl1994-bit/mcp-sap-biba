import { AdtHTTP } from "../AdtHTTP";
export interface InactiveObject {
    "adtcore:uri": string;
    "adtcore:type": string;
    "adtcore:name": string;
    "adtcore:parentUri": string;
}
export interface InactiveObjectElement extends InactiveObject {
    user: string;
    deleted: boolean;
}
export interface InactiveObjectRecord {
    object?: InactiveObjectElement;
    transport?: InactiveObjectElement;
}
export interface ActivationResultMessage {
    objDescr: string;
    type: string;
    line: number;
    href: string;
    forceSupported: boolean;
    shortText: string;
}
export interface ActivationResult {
    success: boolean;
    messages: ActivationResultMessage[];
    inactive: InactiveObjectRecord[];
}
export interface MainInclude {
    "adtcore:uri": string;
    "adtcore:type": string;
    "adtcore:name": string;
}
export declare function activate(h: AdtHTTP, object: InactiveObject | InactiveObject[], preauditRequested?: boolean): Promise<ActivationResult>;
export declare function activate(h: AdtHTTP, objectName: string, objectUrl: string, mainInclude?: string, preauditRequested?: boolean): Promise<ActivationResult>;
export declare function mainPrograms(h: AdtHTTP, IncludeUrl: string): Promise<MainInclude[]>;
export declare function inactiveObjectsInResults(results: ActivationResult): InactiveObject[];
export declare function inactiveObjects(h: AdtHTTP): Promise<InactiveObjectRecord[]>;
//# sourceMappingURL=activate.d.ts.map