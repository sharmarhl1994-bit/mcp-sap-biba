import { AdtHTTP } from "../AdtHTTP";
export interface GitLink {
    href: string;
    rel: string;
    type?: "pull_link" | "stage_link" | "push_link" | "check_link" | "status_link" | "log_link" | string;
}
export interface GitRepo {
    key: string;
    sapPackage: string;
    url: string;
    branch_name: string;
    created_by: string;
    created_at: Date;
    created_email?: string;
    deserialized_by?: string;
    deserialized_email?: string;
    deserialized_at?: Date;
    status?: string;
    status_text?: string;
    links: GitLink[];
}
export interface GitBranch {
    sha1: string;
    name: string;
    type: string;
    is_head: boolean;
    display_name: string;
}
export interface GitExternalInfo {
    access_mode: "PUBLIC" | "PRIVATE";
    branches: GitBranch[];
}
export interface GitObject {
    obj_type: string;
    obj_name: string;
    package: string;
    obj_status: string;
    msg_type: string;
    msg_text: string;
}
export interface GitStagingFile {
    name: string;
    path: string;
    localState: string;
    links: GitLink[];
}
export interface GitStagingObject {
    wbkey: string;
    uri: string;
    type: string;
    name: string;
    abapGitFiles: GitStagingFile[];
}
export interface GitUser {
    name: string;
    email: string;
}
export interface GitStaging {
    staged: GitStagingObject[];
    unstaged: GitStagingObject[];
    ignored: GitStagingObject[];
    comment: string;
    author: GitUser;
    committer: GitUser;
}
/**
 * @deprecated since 1.2.1, duplicate of GitExternalInfo
 */
export interface GitRemoteInfo {
    access_mode: string;
    branches: GitBranch[];
}
export declare function gitRepos(h: AdtHTTP): Promise<GitRepo[]>;
export declare function externalRepoInfo(h: AdtHTTP, repourl: string, user?: string, password?: string): Promise<GitExternalInfo>;
export declare function createRepo(h: AdtHTTP, packageName: string, repourl: string, branch?: string, transport?: string, user?: string, password?: string): Promise<void[]>;
export declare function pullRepo(h: AdtHTTP, repoId: string, branch?: string, transport?: string, user?: string, password?: string): Promise<void[]>;
export declare function unlinkRepo(h: AdtHTTP, repoId: string): Promise<void>;
export declare function checkRepo(h: AdtHTTP, repo: GitRepo, user?: string, password?: string): Promise<void>;
export declare function pushRepo(h: AdtHTTP, repo: GitRepo, staging: GitStaging, user?: string, password?: string): Promise<void>;
export declare function stageRepo(h: AdtHTTP, repo: GitRepo, user?: string, password?: string): Promise<GitStaging>;
/**
 * @deprecated since 1.2.1, duplicate of externalRepoInfo
 */
export declare function remoteRepoInfo(h: AdtHTTP, repo: GitRepo, user?: string, password?: string): Promise<GitRemoteInfo>;
export declare function switchRepoBranch(h: AdtHTTP, repo: GitRepo, branch: string, create?: boolean, user?: string, password?: string): Promise<void>;
//# sourceMappingURL=abapgit.d.ts.map