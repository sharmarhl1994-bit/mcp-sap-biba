import { AdtHTTP } from "../AdtHTTP";
import { SyntaxCheckResult } from "./syntax";
export declare function syntaxCheckCDS(h: AdtHTTP, url: string, mainUrl?: string, content?: string): Promise<SyntaxCheckResult[]>;
export declare function annotationDefinitions(h: AdtHTTP): Promise<string>;
export interface DdicAnnotation {
    key: string;
    value: string;
}
export interface DdicProperties {
    elementProps?: {
        ddicIsKey: boolean;
        ddicDataElement: string;
        ddicDataType: string;
        ddicLength: number;
        ddicDecimals?: number;
        ddicHeading?: string;
        ddicLabelShort?: string;
        ddicLabelMedium?: string;
        ddicLabelLong?: string;
        ddicHeadingLength?: number;
        ddicLabelShortLength?: number;
        ddicLabelMediumLength?: number;
        ddicLabelLongLength?: number;
        parentName?: string;
    };
    annotations: DdicAnnotation[];
}
export interface DdicElement {
    type: string;
    name: string;
    properties: DdicProperties;
    children: DdicElement[];
}
export declare function ddicElement(h: AdtHTTP, path: string | string[], getTargetForAssociation?: boolean, getExtensionViews?: boolean, getSecondaryObjects?: boolean): Promise<DdicElement>;
export interface DdicObjectReference {
    uri: string;
    type: string;
    name: string;
    path: string;
}
export declare function ddicRepositoryAccess(h: AdtHTTP, path: string | string[]): Promise<DdicObjectReference[]>;
export declare function publishServiceBinding(h: AdtHTTP, name: string, version: string): Promise<{
    severity: string;
    shortText: string;
    longText: string;
}>;
export declare function unpublishServiceBinding(h: AdtHTTP, name: string, version: string): Promise<{
    severity: string;
    shortText: string;
    longText: string;
}>;
//# sourceMappingURL=cds.d.ts.map