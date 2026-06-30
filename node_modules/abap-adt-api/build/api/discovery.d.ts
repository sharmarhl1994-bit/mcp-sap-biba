import { AdtHTTP } from "../AdtHTTP";
export interface AdtDiscoveryResult {
    collection: Array<{
        href: string;
        templateLinks: Array<{
            rel: string;
            template: string;
            title?: string;
            type?: string;
        }>;
        title?: string;
    }>;
    title: string;
}
export interface AdtCoreDiscoveryResult {
    title: string;
    collection: {
        href: string;
        title: string;
        category: string;
    };
}
export interface AdtGraphNode {
    nameSpace: string;
    name: string;
}
export interface AdtCompatibilityGraph {
    nodes: AdtGraphNode[];
    edges: Array<{
        sourceNode: AdtGraphNode;
        targetNode: AdtGraphNode;
    }>;
}
export declare function adtDiscovery(h: AdtHTTP): Promise<AdtDiscoveryResult[]>;
export declare function adtCoreDiscovery(h: AdtHTTP): Promise<AdtCoreDiscoveryResult[]>;
export declare function adtCompatibilityGraph(h: AdtHTTP): Promise<AdtCompatibilityGraph>;
export interface ObjectTypeDescriptor {
    name: string;
    description: string;
    type: string;
    usedBy: string[];
}
export declare function objectTypes(h: AdtHTTP): Promise<ObjectTypeDescriptor[]>;
//# sourceMappingURL=discovery.d.ts.map