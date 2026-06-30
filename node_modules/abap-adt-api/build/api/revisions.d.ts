import { AdtHTTP } from "../AdtHTTP";
import { AbapObjectStructure, classIncludes } from "./objectstructure";
export interface Revision {
    uri: string;
    date: string;
    author: string;
    version: string;
    versionTitle: string;
}
export declare function getRevisionLink(struct: AbapObjectStructure, includeName?: classIncludes): string;
export declare function revisions(h: AdtHTTP, objectUrl: string | AbapObjectStructure, includeName?: classIncludes): Promise<Revision[]>;
//# sourceMappingURL=revisions.d.ts.map