import { AdtHTTP } from "../AdtHTTP";
import { Link } from "./objectstructure";
export interface SyntaxCheckResult {
    uri: string;
    line: number;
    offset: number;
    severity: string;
    text: string;
}
export interface UsageReference {
    uri: string;
    objectIdentifier: string;
    parentUri: string;
    isResult: boolean;
    canHaveChildren: boolean;
    usageInformation: string;
    "adtcore:responsible": string;
    "adtcore:name": string;
    "adtcore:type"?: string;
    "adtcore:description"?: string;
    packageRef: {
        "adtcore:uri": string;
        "adtcore:name": string;
    };
}
export declare function syntaxCheckTypes(h: AdtHTTP): Promise<Map<string, string[]>>;
export declare function parseCheckResults(raw: any): SyntaxCheckResult[];
export declare function syntaxCheck(h: AdtHTTP, inclUrl: string, sourceUrl: string, content: string, mainProgram?: string, version?: string): Promise<SyntaxCheckResult[]>;
export interface CompletionProposal {
    KIND: number;
    IDENTIFIER: string;
    ICON: number;
    SUBICON: number;
    BOLD: number;
    COLOR: number;
    QUICKINFO_EVENT: number;
    INSERT_EVENT: number;
    IS_META: number;
    PREFIXLENGTH: number;
    ROLE: number;
    LOCATION: number;
    GRADE: number;
    VISIBILITY: number;
    IS_INHERITED: number;
    PROP1: number;
    PROP2: number;
    PROP3: number;
    SYNTCNTXT: number;
}
export interface CompletionElementInfo {
    name: string;
    type: string;
    href: string;
    doc: string;
    components: {
        "adtcore:type": string;
        "adtcore:name": string;
        entries: {
            key: string;
            value: string;
        }[];
    }[];
}
export interface DefinitionLocation {
    url: string;
    line: number;
    column: number;
}
export declare function codeCompletion(h: AdtHTTP, url: string, body: string, line: number, offset: number): Promise<CompletionProposal[]>;
export declare function codeCompletionFull(h: AdtHTTP, url: string, body: string, line: number, offset: number, patternKey: string): Promise<string>;
export declare function codeCompletionElement(h: AdtHTTP, url: string, body: string, line: number, offset: number): Promise<CompletionElementInfo | string>;
export declare function findDefinition(h: AdtHTTP, url: string, body: string, line: number, firstof: number, lastof: number, implementation: boolean, mainProgram?: string): Promise<DefinitionLocation>;
export declare function usageReferences(h: AdtHTTP, url: string, line?: number, column?: number): Promise<UsageReference[]>;
export interface Location {
    line: number;
    column: number;
}
export interface ReferenceUri {
    uri: string;
    context?: string;
    start?: Location;
    end?: Location;
    type?: string;
    name?: string;
}
export interface UsageReferenceSnippet {
    objectIdentifier: string;
    snippets: {
        uri: ReferenceUri;
        matches: string;
        content: string;
        description: string;
    }[];
}
export declare function usageReferenceSnippets(h: AdtHTTP, references: UsageReference[]): Promise<UsageReferenceSnippet[]>;
export interface ClassComponent {
    "adtcore:name": string;
    "adtcore:type": string;
    links: Link[];
    visibility: string;
    "xml:base": string;
    components: ClassComponent[];
    constant?: boolean;
    level?: string;
    readOnly?: boolean;
}
export declare function classComponents(h: AdtHTTP, url: string): Promise<ClassComponent>;
export interface FragmentLocation {
    uri: string;
    line: number;
    column: number;
}
export declare function fragmentMappings(h: AdtHTTP, url: string, type: string, name: string): Promise<FragmentLocation>;
export type PrettyPrinterStyle = "toLower" | "toUpper" | "keywordUpper" | "keywordLower" | "keywordAuto" | "none";
export interface PrettyPrinterSettings {
    "abapformatter:indentation": boolean;
    "abapformatter:style": PrettyPrinterStyle;
}
export declare function prettyPrinterSetting(h: AdtHTTP): Promise<PrettyPrinterSettings>;
export declare function setPrettyPrinterSetting(h: AdtHTTP, indent: boolean, style: PrettyPrinterStyle): Promise<string>;
export declare function prettyPrinter(h: AdtHTTP, body: string): Promise<string>;
export interface HierarchyNode {
    hasDefOrImpl: boolean;
    uri: string;
    line: number;
    character: number;
    type: string;
    name: string;
    parentUri: string;
    description: string;
}
export declare function typeHierarchy(h: AdtHTTP, url: string, body: string, line: number, offset: number, superTypes?: boolean): Promise<HierarchyNode[]>;
//# sourceMappingURL=syntax.d.ts.map