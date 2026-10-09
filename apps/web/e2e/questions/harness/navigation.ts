export const useRouter=()=>({push:(path:string)=>window.location.assign(path),replace:(path:string)=>window.location.replace(path),refresh:()=>window.location.reload(),back:()=>history.back()});
