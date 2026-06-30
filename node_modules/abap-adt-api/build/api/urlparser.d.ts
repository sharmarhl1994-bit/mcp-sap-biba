import { Clean } from "../utilities";
import * as t from "io-ts";
declare const range: t.TypeC<{
    start: t.TypeC<{
        line: t.NumberC;
        column: t.NumberC;
    }>;
    end: t.TypeC<{
        line: t.NumberC;
        column: t.NumberC;
    }>;
}>;
export declare const uriParts: t.TypeC<{
    uri: t.StringC;
    query: t.UnionC<[t.UndefinedC, t.RecordC<t.StringC, t.StringC>]>;
    range: t.TypeC<{
        start: t.TypeC<{
            line: t.NumberC;
            column: t.NumberC;
        }>;
        end: t.TypeC<{
            line: t.NumberC;
            column: t.NumberC;
        }>;
    }>;
    hashparms: t.UnionC<[t.UndefinedC, t.RecordC<t.StringC, t.StringC>]>;
}>;
export type Range = Clean<t.TypeOf<typeof range>>;
export type UriParts = Clean<t.TypeOf<typeof uriParts>>;
export declare const rangeToString: (range: Range) => string;
export declare const uriPartsToString: (parts: UriParts) => string;
export declare function parseUri(sourceuri: string): UriParts;
export {};
//# sourceMappingURL=urlparser.d.ts.map