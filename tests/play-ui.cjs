const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const path=require('node:path'),os=require('node:os');
const harness=fs.readFileSync('tests/action-context.cjs','utf8').split('vm.createContext(ctx);')[0];
const {ctx,ids}=vm.runInNewContext(harness+'\n({ctx,ids})',{require,console,structuredClone,URL,Blob,setTimeout,clearTimeout});
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('status-icons.js','utf8')+'\n'+fs.readFileSync('table-ui.js','utf8')+'\n'+fs.readFileSync('index.html','utf8').split('<script>')[1].split('</script>')[0],ctx);
const run=code=>vm.runInContext(code,ctx);
function fixture(faction='terrans'){
 run(`state=E.createPlayableGame({players:[{id:'a',name:'소행성 친구',factionId:'${faction}',isAi:false},{id:'b',name:'연습 AI',factionId:'xenos',isAi:true}]});state.round.phase='actions';state.round.number=1;state.round.currentPlayerId='a';state.round.turnOrder=['a','b'];state.pendingEffects=[];state.uiMapVerified=true;state.actionLog=[];state.players[0].resources={credits:10,ore:5,knowledge:4,qic:3,vp:10};Object.assign(state.players[0].power,{bowl1:0,bowl2:8,bowl3:0,gaia:0,brainstone:null});history=[];view='play';render();humanCategory='free';renderActionList();`);
}
fixture();
const initial=JSON.stringify(ctx.window.gaiaTest.state);
run("var burn=freeChoices.find(a=>a.freeActionId==='burn_power');var burnRuns=tableFreeActionRuns(burn)");
assert.equal(run('burnRuns.length'),4);assert.equal(JSON.stringify(ctx.window.gaiaTest.state),initial,'preview mutated the game');
const burnCard=ids.actionList.children.find(c=>c.children?.[0]?.innerHTML.includes('파워 태우기'));
assert(burnCard);const box=burnCard.children[1],select=box.children[0].children[0],summary=box.children[1],execute=box.children[2];
assert.equal(select.tag,'select');assert.equal(select.value,'1');assert(select.innerHTML.includes('4회 · 최대'));
select.value='3';select.onchange();assert(summary.textContent.includes('Ⅱ그릇 8 → 2'));assert(summary.textContent.includes('Ⅲ그릇 0 → 3'));assert(summary.textContent.includes('3개 반납'));assert.equal(JSON.stringify(ctx.window.gaiaTest.state),initial);
execute.click();assert.equal(ids.error.hidden,true,ids.error.textContent);
assert.equal(run('state.players[0].power.bowl2'),2);assert.equal(run('state.players[0].power.bowl3'),3);assert.equal(run('history.length'),1);assert.equal(run('state.round.currentPlayerId'),'a');
assert.equal(run('state.actionLog.filter(x=>!x.uiHiddenInLog).length'),1);assert.equal(run('state.actionLog.at(-1).uiBatchCount'),3);
ids.undo.click();assert.equal(JSON.stringify(ctx.window.gaiaTest.state),initial,'one undo must restore all repetitions');
run("state.players[0].power.bowl2=2;var changed=JSON.stringify(state);tableApplyFreeBatch(burn,3)");
assert.equal(run('JSON.stringify(state)'),run('changed'));assert.equal(run('history.length'),0,'invalid stale quantity must roll back');
fixture('itars');run("var itarsAction=freeChoices.find(a=>a.freeActionId==='burn_power');tableApplyFreeBatch(itarsAction,2)");
assert.equal(run('state.players[0].power.gaia'),2);assert.equal(run('state.players[0].power.bowl3'),2);
fixture('taklons');run("state.players[0].power.bowl2=3;state.players[0].power.brainstone='bowl2';tableApplyFreeBatch(freeChoices.find(a=>a.freeActionId==='burn_power'),2)");
assert.equal(run('state.players[0].power.brainstone'),'bowl3');assert.equal(run('state.players[0].power.bowl2'),0);assert.equal(run('state.players[0].power.bowl3'),1);
fixture('nevlas');run("state.players[0].structuresOnMap=[{q:0,r:0,structure:'planetary_institute',planet:'ice'}];state.players[0].power.bowl3=3;var singleCredit=E.getLegalFreeActions({state,playerId:'a'}).find(a=>a.freeActionId==='power_to_credit')");
assert.equal(run('tableFreeActionRuns(singleCredit).length'),3,'Nevlas repeats must round each actual payment');
fixture();run("state.players[0].resources.credits=28;var trade=freeChoices.find(a=>a.freeActionId==='ore_to_credit')");
assert.equal(run('tableFreeActionRuns(trade).length'),2,'stop before spending resources for no gain');
run('tableApplyFreeBatch(trade,2)');assert.equal(run('state.players[0].resources.credits'),30);assert.equal(run('state.players[0].resources.ore'),3);
// Single possible action stays one click; impossible gains cannot be executed.
run('state.players[0].resources.credits=29;var one=tableFreeActionControl(trade)');assert.equal(run('one.children.some(x=>x.className===\'freeBatchQuantity\')'),false);
run('state.players[0].resources.credits=30;var none=tableFreeActionControl(trade)');assert.equal(run('none.children.at(-1).disabled'),true);
// Overview captions remain literal; planet pictures still work in actual play.
fixture();let replaced='';const node={nodeValue:'소행성',parentElement:{closest:()=>null},replaceWith:s=>replaced=s.innerHTML};
ctx.document.createTreeWalker=()=>{let first=true;return {nextNode(){if(first){first=false;return node;}return null;}};};ctx.testRoot={};
run("view='overview';tableReplacePlanetText(testRoot)");assert.equal(replaced,'');
run("view='play';tableReplacePlanetText(testRoot)");assert(replaced.includes('planetChip'));delete ctx.document.createTreeWalker;
// Actual AI render path and wrapped plans must include the owner's building artwork.
run("state.players[0].isAi=true;var mine={type:'build_mine',displayName:'광산 건설',playerId:'a',target:{q:0,r:0}};aiDecisionCache={state,chosen:{action:{type:'ai_plan',playerId:'a',freeActions:[],subAction:mine}}};render()");
const proposal=ids.panel.children.find(x=>x.className==='proposal');assert(proposal.innerHTML.includes('aiBuildingGuide'));assert(proposal.innerHTML.includes('originalBuilding'));assert(proposal.innerHTML.includes('data-piece-color='));
run("var upgradeArt=tableAiBuildingHTML({type:'upgrade_structure',toStructure:'research_lab',fromStructure:'trading_station'},state.players[0])");
assert.equal((run('upgradeArt').match(/originalBuilding/g)||[]).length,2);assert(run('upgradeArt').includes('→'));
assert(run("tableAiBuildingHTML({type:'faction_special_action',factionActionId:'ivits_space_station'},state.players[0])").includes('우주 정거장'));
const css=fs.readFileSync('table-ui.css','utf8');assert(css.includes('#actionList.boosterActionList>button.boosterChoice{display:flex;'));assert(css.includes('.boosterChooseLabel{display:block;border:0;'));
// Disposable browser-QA saves contain only synthetic players.
fixture();fs.writeFileSync(path.join(os.tmpdir(),'gaia-ui-free-qa.json'),JSON.stringify({state:ctx.window.gaiaTest.state}));
run("state.round.phase='setup_round_boosters';state.setup={...(state.setup??{}),boosterDraftQueue:['a','b'],boosterDraftIndex:0};state.globalBoards.availableBoosterIds=['booster1','booster2','booster3'];state.players[0].roundBoosterId=null;state.players[1].roundBoosterId=null");
fs.writeFileSync(path.join(os.tmpdir(),'gaia-ui-booster-qa.json'),JSON.stringify({state:ctx.window.gaiaTest.state}));
console.log('PASS: repeat quantity UI/preview, atomic execution/log/undo, caps, stale input, Itars/Taklons/Nevlas, literal overview names, colored AI buildings, booster layout rules');
