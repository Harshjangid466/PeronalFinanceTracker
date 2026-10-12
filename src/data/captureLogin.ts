export function captureLoginLink(value:string,projectUrl:string){
  const invalid=()=>new Error('Copy the original Sign in link from your Finance Tracker email. Keep it private.');
  let link:URL;try{link=new URL(value.trim());}catch{throw invalid();}
  const expected=new URL(projectUrl);
  if(value.length>4096||link.protocol!=='https:'||link.origin!==expected.origin||link.username||link.password||link.pathname!=='/auth/v1/verify')throw invalid();
  const token=link.searchParams.get('token_hash')||link.searchParams.get('token');const type=link.searchParams.get('type');
  if(!token||!/^[A-Za-z0-9_-]{16,512}$/.test(token)||!['magiclink','signup'].includes(type||''))throw invalid();
  return {token_hash:token,type:type as 'magiclink'|'signup'};
}
