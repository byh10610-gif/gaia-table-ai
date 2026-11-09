const fs=require('node:fs'),path=require('node:path');
const outDir=process.env.GAIA_AUDIT_OUTPUT||path.join(require('node:os').tmpdir(),'gaia-release-audit-results');fs.mkdirSync(outDir,{recursive:true});
const {loadEngine}=require('./engine-harness.cjs');
const faction=process.argv[2]||'terrans',seed=Number(process.argv[3]||1),difficulty=process.argv[4]==='normal'?'보통':'쉬움',label=difficulty==='보통'?'normal':'easy';
const e=loadEngine(seed),r=e.require;
const defs=e.DB['factions_ko.json'].factions;
const color=f=>f.homePlanet??f.startingPlanet;
const primary=defs.find(f=>f.id===faction),others=[];
for(const d of defs)if(d.id!==faction&&color(d)!==color(primary)&&!others.some(x=>color(x)===color(d))) {others.push(d);if(others.length===2)break;}
let state;const start=Date.now();
try {
 state=r('play_setup').createPlayableGame({players:[primary,...others].map((f,i)=>({id:'p'+i,factionId:f.id,isAi:true})),difficulty});
 const res=r('diagnose_games').runDiagnosticGame(state,{maxSteps:1600});
 const output={faction,seed,complete:res.complete,seconds:(Date.now()-start)/1000,actions:res.actions,steps:res.steps,round:res.round,blocked:res.blocked,scores:res.scores};
 fs.writeFileSync(path.join(outDir,`simulation-${label}-${faction}.json`),JSON.stringify(output,null,2));
 console.log(JSON.stringify(output));
 if(!res.complete)fs.writeFileSync(path.join(outDir,`blocked-${label}-${faction}.json`),JSON.stringify(state));
} catch(err){
 const output={faction,seed,complete:false,seconds:(Date.now()-start)/1000,error:err.message,stack:err.stack};
 fs.writeFileSync(path.join(outDir,`simulation-${label}-${faction}.json`),JSON.stringify(output,null,2));
 if(state)fs.writeFileSync(path.join(outDir,`blocked-${label}-${faction}.json`),JSON.stringify(state));
 console.log(JSON.stringify(output));
}
