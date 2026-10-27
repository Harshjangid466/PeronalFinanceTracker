// Beta: server-side guard prevents inherited credentials from enabling financial uploads.
export default async function handler() { return new Response(JSON.stringify({error:'Cloud analysis is disabled in the friends beta.'}),{status:503,headers:{'Content-Type':'application/json'}}); }
export const config={path:'/api/financial-analysis'};
