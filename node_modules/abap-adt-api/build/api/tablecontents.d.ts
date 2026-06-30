import { AdtHTTP } from "../AdtHTTP";
import { Link } from "./objectstructure";
export declare enum TypeKinds {
    ANY = "~",
    CHAR = "C",
    CLASS = "*",
    CLIKE = "&",
    CSEQUENCE = "?",
    DATA = "#",
    DATE = "D",
    DECFLOAT = "/",
    DECFLOAT16 = "a",
    DECFLOAT34 = "e",
    DREF = "l",
    FLOAT = "F",
    HEX = "X",
    INT = "I",
    INT1 = "b",
    INT8 = "8",
    INT2 = "s",
    INTF = "+",
    IREF = "m",
    NUM = "N",
    NUMERIC = "%",
    OREF = "r",
    PACKED = "P",
    SIMPLE = "$",
    STRING = "g",
    STRUCT1 = "u",
    STRUCT2 = "v",
    TABLE = "h",
    TIME = "T",
    W = "w",
    XSEQUENCE = "!",
    XSTRING = "y",
    BREF = "j"
}
export interface QueryResultColumn {
    name: string;
    type: TypeKinds;
    description: string;
    keyAttribute: boolean;
    colType: string;
    isKeyFigure: boolean;
    length: number;
}
export interface QueryResult {
    columns: QueryResultColumn[];
    values: any[];
}
export interface ServiceBinding {
    releaseSupported: boolean;
    published: boolean;
    repair: boolean;
    bindingCreated: boolean;
    responsible: string;
    masterLanguage: string;
    masterSystem: string;
    name: string;
    type: string;
    changedAt: string;
    version: string;
    createdAt: string;
    changedBy: string;
    createdBy: string;
    description: string;
    language: string;
    packageRef: ServiceBindingPackageRef;
    links: Link[];
    services: ServiceBindingService[];
    binding: ServiceBindingBinding;
}
export interface ServiceBindingBinding {
    type: string;
    version: string;
    category: number;
    implementation: {
        name: string;
    };
}
export interface ServiceBindingPackageRef {
    uri: string;
    type: string;
    name: string;
    description?: string;
}
export interface ServiceBindingService {
    name: string;
    version: number;
    releaseState: string;
    serviceDefinition: ServiceBindingPackageRef;
}
export interface BindingServiceResult {
    link: Link;
    services: BindingService[];
}
export interface BindingService {
    repositoryId: string;
    serviceId: string;
    serviceVersion: string;
    serviceUrl: string;
    annotationUrl: string;
    published: string;
    created: string;
    serviceInformation: BindingServiceInformation;
}
export interface BindingServiceInformation {
    name: string;
    version: string;
    url: string;
    collection: BindingServiceCollection[];
}
export interface BindingServiceCollection {
    name: string;
    navigation: BindingServiceNavigation[];
}
export interface BindingServiceNavigation {
    name: string;
    target: string;
}
export declare const parseServiceBinding: (xml: string) => ServiceBinding;
export declare const extractBindingLinks: (binding: ServiceBinding) => {
    service: ServiceBindingService;
    query: {
        servicename: string;
        serviceversion: number;
        srvdname: string;
    };
    url: string;
}[];
export declare const decodeQueryResult: (original: QueryResult) => QueryResult;
export declare function parseQueryResponse(body: string): {
    columns: QueryResultColumn[];
    values: any[];
};
export declare const parseBindingDetails: (xml: string) => BindingServiceResult;
export declare const servicePreviewUrl: (service: BindingService, collectionName: string) => string | undefined;
export declare function tableContents(h: AdtHTTP, ddicEntityName: string, rowNumber?: number, decode?: boolean, sqlQuery?: string): Promise<QueryResult>;
export declare function runQuery(h: AdtHTTP, sqlQuery: string, rowNumber?: number, decode?: boolean): Promise<QueryResult>;
export declare function bindingDetails(h: AdtHTTP, binding: ServiceBinding, index?: number): Promise<BindingServiceResult>;
//# sourceMappingURL=tablecontents.d.ts.map