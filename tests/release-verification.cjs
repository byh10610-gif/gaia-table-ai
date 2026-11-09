const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const out=process.env.GAIA_AUDIT_OUTPUT||path.join(require('node:os').tmpdir(),'gaia-release-fix-results');fs.mkdirSync(out,{recursive:true});
const tests=['status-icons','table-flow','action-context','analytics','play-ui','embedded-images','faction-rules'];
function run(file,args=[]){return new Promise(resolve=>{let stdout='',stderr='';const p=spawn(process.execPath,[file,...args],{cwd:root,env:{...process.env,GAIA_AUDIT_OUTPUT:out}});p.stdout.on('data',b=>stdout+=b);p.stderr.on('data',b=>stderr+=b);p.on('close',code=>resolve({file,args,code,stdout,stderr}));});}
(async()=>{
 const checks=[];for(const t of tests){const r=await run('tests/'+t+'.cjs');checks.push(r);console.log(t,r.code);}
 fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify(checks,null,2));
 if(process.argv.includes('--checks-only')){process.exitCode=checks.some(x=>x.code)?1:0;return;}
 const {DB}=require(path.join(root,'tests/engine-harness.cjs')).loadEngine();
 const jobs=DB['factions_ko.json'].factions.flatMap(f=>[[f.id,'41'],[f.id,'83','normal']]);
 const results=[];let next=0;
 await Promise.all(Array.from({length:3},async()=>{while(next<jobs.length){const args=jobs[next++],r=await run('tests/faction-simulation.cjs',args);results.push(JSON.parse(r.stdout));console.log('simulation',args.join(' '),results.at(-1).complete);}}));
 fs.writeFileSync(path.join(out,'simulation-results.json'),JSON.stringify(results,null,2));
 console.log(JSON.stringify({checks:checks.map(x=>({test:x.file,code:x.code})),simulations:results.length,complete:results.filter(x=>x.complete).length,actions:results.reduce((n,x)=>n+x.actions,0)}));
 process.exitCode=checks.some(x=>x.code)||results.some(x=>!x.complete)?1:0;
})();
