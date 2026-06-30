import { AdtHTTP } from "../AdtHTTP";
export type NodeParents = "DEVC/K" | "PROG/P" | "FUGR/F" | "PROG/PI";
export declare function isNodeParent(t: string): t is NodeParents;
export interface Node {
    OBJECT_TYPE: string;
    OBJECT_NAME: string;
    TECH_NAME: string;
    OBJECT_URI: string;
    OBJECT_VIT_URI: string;
    EXPANDABLE: string;
    VISIBILITY?: number;
    NODE_ID?: string;
    DESCRIPTION?: string;
    DESCRIPTION_TYPE?: string;
    IS_ABSTRACT?: string;
    IS_CONSTANT?: string;
    IS_CONSTRUCTOR?: string;
    IS_EVENT_HANDLER?: string;
    IS_FINAL?: string;
    IS_FOR_TESTING?: string;
    IS_READ_ONLY?: string;
    IS_REDEFINITION?: string;
    IS_STATIC?: string;
}
export interface NodeCategory {
    CATEGORY: string;
    CATEGORY_LABEL: string;
}
export interface NodeObjectType {
    OBJECT_TYPE: string;
    CATEGORY_TAG: string;
    OBJECT_TYPE_LABEL: string;
    NODE_ID: string;
}
export interface NodeStructure {
    nodes: Node[];
    categories: NodeCategory[];
    objectTypes: NodeObjectType[];
}
export declare function nodeContents(h: AdtHTTP, parent_type: NodeParents, parent_name?: string, user_name?: string, parent_tech_name?: string, rebuild_tree?: boolean, parentnodes?: number[]): Promise<NodeStructure>;
//# sourceMappingURL=nodeContents.d.ts.map