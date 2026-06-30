import { AdtHTTP } from "../AdtHTTP";
export interface RegistrationInfo {
    developer: {
        "reg:isRequired": boolean;
        "reg:name": string;
        "reg:accessKey": number;
    };
    object: {
        "reg:isRequired": boolean;
        "reg:accessKey": string;
        "reg:transportPGMID": string;
        "reg:transportType": string;
        "reg:transportName": string;
    };
    "reg:release": number;
    "reg:installationNumber": string;
}
export declare function objectRegistrationInfo(h: AdtHTTP, objectUrl: string): Promise<RegistrationInfo>;
export declare function deleteObject(h: AdtHTTP, objectUrl: string, lockHandle: string, transport?: string): Promise<void>;
//# sourceMappingURL=delete.d.ts.map