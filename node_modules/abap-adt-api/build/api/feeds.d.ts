import { Link } from ".";
import { AdtHTTP } from "../AdtHTTP";
export interface Feed {
    author: string;
    href: string;
    published: Date;
    summary: string;
    title: string;
    updated: Date;
    accept: string;
    refresh: FeedRefresh;
    paging?: number;
    operators: FeedOperator[];
    dataTypes: FeedDataType[];
    attributes: FeedAttribute[];
    queryIsObligatory?: boolean;
    queryDepth?: number;
    queryVariants: FeedQueryVariant[];
}
export interface FeedDataType {
    id: string;
    label: string;
    operators: string[];
}
export interface FeedAttribute extends FeedDataType {
    dataType: string;
}
export interface FeedOperator {
    id: string;
    numberOfOperands: number;
    kind: string;
    label: string;
}
export interface FeedQueryVariant {
    queryString: string;
    title: string;
    isDefault: boolean;
}
export interface FeedRefresh {
    value: number;
    unit: string;
}
export interface DumpsFeed {
    href: string;
    title: string;
    updated: Date;
    dumps: Dump[];
}
export interface Dump {
    categories: DumpCategory[];
    links: Link[];
    id: string;
    author?: string;
    text: string;
    type: string;
}
export interface DumpCategory {
    term: string;
    label: "ABAP runtime error" | "Terminated ABAP program";
}
export declare function feeds(h: AdtHTTP): Promise<Feed[]>;
export declare function dumps(h: AdtHTTP, query?: string): Promise<DumpsFeed>;
//# sourceMappingURL=feeds.d.ts.map