import {createHandler} from './handler.mjs';

// One initialization per function instance, including simultaneous first
// requests. INIT means this entry point initialized the application handler;
// it does not measure Vercel's VM/module startup before entry-point invocation.
export function createRuntime({initialize=createHandler,clock=()=>performance.now()}={}) {
  let pending=null,ready=false;
  return async(req,res)=>{
    if(!['GET','HEAD'].includes(req.method)) {
      res.writeHead(405,{'Allow':'GET, HEAD','Cache-Control':'no-store'});res.end();return;
    }
    const startedAt=clock();
    const boot=!pending?'INIT':ready?'READY':'WAIT';
    if(!pending) {
      const task=Promise.resolve().then(()=>initialize()).then(handler=>{ready=true;return handler;}).catch(error=>{if(pending===task){pending=null;ready=false;}throw error;});
      pending=task;
    }
    try {
      const handler=await pending;
      return await handler(req,res,{startedAt,initMs:clock()-startedAt,boot});
    } catch {
      res.statusCode=503;res.setHeader('Cache-Control','no-store');
      res.end(req.method==='HEAD'?undefined:'Store temporarily unavailable');
    }
  };
}
