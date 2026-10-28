// Scope is fixed for the lifetime of a mounted application. Account changes reload it.
let owner: string | null = null;
export function setStorageOwner(id: string | null) { owner = id; }
export function storageName(name: string) { return owner ? `${name}:user:${owner}` : name; }
export function accountStorageName(name: string, id: string) { return `${name}:user:${id}`; }

let writesBlocked=false;
export const blockAccountWrites=()=>{writesBlocked=true;};
export const accountWritesBlocked=()=>writesBlocked;
