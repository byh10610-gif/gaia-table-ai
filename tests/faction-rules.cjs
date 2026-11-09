// Independent, rulebook-based release checks. Failures are audit findings, not accepted behavior.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const outDir=process.env.GAIA_AUDIT_OUTPUT||path.join(require('node:os').tmpdir(),'gaia-release-audit-results');fs.mkdirSync(outDir,{recursive:true});
const {loadEngine}=require('./engine-harness.cjs');
const {require:R,DB}=loadEngine(20261108);
const LA=R('legal_actions'),AA=R('apply_action'),PS=R('play_setup'),IS=R('initial_setup'),RP=R('round_phases');
const defs=DB['factions_ko.json'].factions, results=[], cache=new Map();
const clone=structuredClone, home=f=>f.homePlanet??f.startingPlanet;
function test(faction,name,fn){try{fn();results.push({faction,name,pass:true});}catch(e){results.push({faction,name,pass:false,error:e.message});}}
function setup(fid,count=3){
 const key=fid+':'+count;
 if(!cache.has(key)){
  const chosen=[defs.find(f=>f.id===fid)];
  for(const f of defs)if(!chosen.some(x=>home(x)===home(f))&&chosen.length<count)chosen.push(f);
  cache.set(key,PS.createPlayableGame({players:chosen.map((f,i)=>({id:'p'+i,factionId:f.id,isAi:false})),difficulty:'보통'}));
 }
 return clone(cache.get(key));
}
function fixture(fid,count=3){
 const s=setup(fid,count);s.pendingEffects=[];s.actionLog=[];s.round.phase='actions';s.round.currentPlayerId='p0';s.round.number=1;
 s.globalBoards.roundScoringIds=[];s.map.hexes=[];s.map.shipHexes=[];s.map.satellites=[];
 for(let q=-4;q<=9;q++)for(let r=-3;r<=3;r++)s.map.hexes.push({q,r,content:'empty',sectorId:'01',sectorKind:'space'});
 for(const p of s.players){p.structuresOnMap=[];p.structuresRemaining={mine:8,trading_station:4,research_lab:3,academy:2,planetary_institute:1,gaiaformer:1};p.resources={credits:30,ore:15,knowledge:0,qic:10,vp:30};p.power={bowl1:4,bowl2:4,bowl3:4,gaia:0,brainstone:null};p.researchLevels={terraforming:0,navigation:0,artificial_intelligence:0,gaia_project:1,economy:0,science:0};p.standardTechs=[];p.advancedTechs=[];p.roundBoosterId=null;}
 return s;
}
function put(s,pid,kind,q=0,r=0,planet=null){
 const p=s.players.find(x=>x.id===pid);planet??=home(defs.find(f=>f.id===p.factionId));
 const h=s.map.hexes.find(h=>h.q===q&&h.r===r);Object.assign(h,{content:planet,structure:kind,occupiedBy:pid});
 const rec={q,r,structure:kind,planet,sectorId:h.sectorId,sectorKind:h.sectorKind};p.structuresOnMap.push(rec);p.structuresRemaining[kind]--;return rec;
}
function target(s,planet,q=1,r=0,extra={}){const h=s.map.hexes.find(h=>h.q===q&&h.r===r);Object.assign(h,{content:planet,...extra});return h;}
function mine(s,q=1,r=0){const a=LA.getLegalActions({state:s,playerId:'p0'}).find(a=>a.type==='build_mine'&&a.target.q===q&&a.target.r===r);assert(a,'합법적인 광산 건설 후보 누락');AA.applyAction(s,a);return a;}
function action(s,id){const a=LA.getLegalActions({state:s,playerId:'p0'}).find(a=>a.factionActionId===id||a.freeActionId===id);assert(a,'행동 누락: '+id);return a;}
function free(s,id){const a=LA.getLegalFreeActions({state:s,playerId:'p0'}).find(a=>a.freeActionId===id);assert(a,'자유행동 누락: '+id);AA.applyFreeAction(s,a);return a;}
function clear(s){s.pendingEffects=[];s.round.currentPlayerId='p0';}
// Every faction, actual expansion maps, 2/3/4 players: placement and inventory integration.
for(const f of defs)for(const count of [2,3,4])test(f.id,`${count}인 시작 배치·재고·탐사선`,()=>{
 const s=setup(f.id,count),p=s.players[0],initial=clone(p.resources);
 assert.equal(p.exploration.shuttlesAvailable,(count===2?2:3)-(f.id==='moweyds'?1:0));
 while(s.round.phase==='setup_initial_structures'){
  const id=s.round.currentPlayerId,a=IS.listInitialStructurePlacementActions({state:s,playerId:id})[0];assert(a,'시작 배치 대상 없음');AA.applyAction(s,a);
 }
 const structure=['ivits','tinkeroids'].includes(f.id)?'planetary_institute':'mine',n=f.id==='xenos'?3:f.set==='lost_fleet'||f.id==='ivits'?1:2;
 assert.equal(p.structuresOnMap.length,n);assert(p.structuresOnMap.every(x=>x.structure===structure));
 assert.equal(p.structuresRemaining[structure]+n,structure==='mine'?8:1);assert.deepEqual(p.resources,initial);
 assert(p.structuresOnMap.every(x=>x.planet===home(f)));assert.equal(s.pendingEffects.filter(x=>x.type==='passive_charge_choice').length,0);
 const json=JSON.parse(JSON.stringify(s));assert.equal(json.players[0].factionId,f.id);
});
for(const f of defs)test(f.id,'수입의 자원 상한·토큰 비음수·JSON 복원',()=>{
 const s=fixture(f.id);put(s,'p0','mine');s.round.phase='income';s.players[0].power.bowl3=0;
 const result=R('income').resolvePlayerIncome(s,'p0');assert(result);
 const p=s.players[0];assert(p.resources.credits<=30&&p.resources.ore<=15&&p.resources.knowledge<=15);
 for(const k of ['bowl1','bowl2','bowl3','gaia'])assert(Number.isInteger(p.power[k])&&p.power[k]>=0);
 assert.deepEqual(JSON.parse(JSON.stringify(p.power)),{...p.power});
});
test('terrans','가이아 토큰은 Ⅱ구역으로 복귀',()=>{const s=fixture('terrans');s.round.phase='gaia';s.players[0].power.gaia=4;const before=s.players[0].power.bowl2;RP.resolveGaiaPhase(s);assert.equal(s.players[0].power.bowl2,before+4);assert.equal(s.players[0].power.gaia,0);});
test('terrans','의회 가이아 교환과 토큰 복귀를 함께 처리',()=>{const s=fixture('terrans');put(s,'p0','planetary_institute');s.round.phase='gaia';s.players[0].power.gaia=4;s.players[0].resources.ore=0;s.players[0].resources.credits=0;RP.resolveGaiaPhase(s);const effect=s.pendingEffects.find(e=>e.type==='terrans_gaia_resource_conversion');assert(effect);R('pending_effects').resolvePendingEffect(s,effect.id,{ore:1,credits:1});assert.equal(s.players[0].resources.ore,1);assert.equal(s.players[0].resources.credits,1);assert.equal(s.players[0].power.gaia,0);});
for(const count of [2,3,4])test('lantids',`${count}인 의회 공동 개척 지식·파워`,()=>{const s=fixture('lantids',count);put(s,'p0','planetary_institute');put(s,'p1','mine',1,0,'desert');const a=mine(s);assert(a.sharedOnOpponent);assert.equal(s.players[0].resources.knowledge,2);if(count===3)assert.equal(s.players[0].power.bowl1,3);assert.equal(s.map.hexes.find(h=>h.q===1&&h.r===0).occupiedBy,'p1');});
test('lantids','2인 의회 고향 광산에도 지식 2',()=>{const s=fixture('lantids',2);put(s,'p0','planetary_institute');target(s,'terra');mine(s);assert.equal(s.players[0].resources.knowledge,2);});
test('lantids','공동 광산 업그레이드 및 행성종류 집계 제외',()=>{const s=fixture('lantids');put(s,'p0','mine');put(s,'p1','mine',1,0,'gaia');mine(s);clear(s);assert(!LA.listUpgradeActions({state:s,playerId:'p0'}).some(a=>a.target.q===1&&a.target.r===0));assert.equal(R('final_scoring').finalScoringMetric(s,'p0','base_final_gaia_planets'),0);});
test('xenos','의회 전후 연방 기준 7→6',()=>{const s=fixture('xenos'),p=s.players[0];assert.equal(R('federation').federationThreshold(p),7);put(s,'p0','planetary_institute');assert.equal(R('federation').federationThreshold(p),6);const inc=R('income').listIncomeSources({state:s,playerId:'p0'}).find(x=>x.id==='faction_pi');assert.equal(inc.effect.qic,1);assert(!inc.effect.powerTokensBowl1);});
test('xenos','확장 광석1→Ⅲ구역 토큰1',()=>{const s=fixture('xenos');const a=LA.getLegalFreeActions({state:s,playerId:'p0'}).find(a=>a.gain?.powerTokensBowl3===1||a.freeActionId?.includes('xenos'));assert(a);const before=s.players[0].power.bowl3,ore=s.players[0].resources.ore;AA.applyFreeAction(s,a);assert.equal(s.players[0].power.bowl3,before+1);assert.equal(s.players[0].resources.ore,ore-1);});
test('gleens','큐브 획득을 광석으로, 해금 후 큐브로',()=>{const s=fixture('gleens'),p=s.players[0];p.resources.ore=0;p.resources.qic=0;R('resources').gainResource(p,'qic',2);assert.equal(p.resources.ore,2);assert.equal(p.resources.qic,0);p.factionSpecific.gleensQicUnlocked=true;R('resources').gainResource(p,'qic',1);assert.equal(p.resources.qic,1);});
test('gleens','가이아 입장 광석1·건설2점',()=>{const s=fixture('gleens');put(s,'p0','mine');target(s,'gaia');const a=mine(s);assert.equal(a.cost.ore,2);assert.equal(a.cost.qic,0);assert.equal(s.players[0].resources.vp,32);});
test('gleens','의회 건설 시 전용 연방토큰 1개',()=>{const s=fixture('gleens');put(s,'p0','trading_station');const a=LA.listUpgradeActions({state:s,playerId:'p0'}).find(a=>a.toStructure==='planetary_institute');assert(a);AA.applyAction(s,a);assert.equal(s.players[0].federationTokens.length,1);});
test('taklons','두뇌석은 지불3파워·가이아/위성1토큰',()=>{const s=fixture('taklons'),p=s.players[0];p.power={bowl1:0,bowl2:0,bowl3:0,gaia:0,brainstone:'bowl3'};assert.equal(R('power_spend').availableSpendPower(p),3);assert.equal(R('power').totalCyclePowerTokens(p),1);R('power_spend').spendPower(p,3);assert.equal(p.power.brainstone,'bowl1');});
test('taklons','의회·전부Ⅲ구역에서도 토큰 먼저 받고 충전 가능',()=>{const s=fixture('taklons');put(s,'p0','planetary_institute');put(s,'p1','mine',1,0,'desert');s.players[0].power={bowl1:0,bowl2:0,bowl3:6,gaia:0,brainstone:'bowl3'};const offers=R('passive_charge').listPassiveChargeOffers(s,{sourcePlayerId:'p1',target:{q:1,r:0}});assert(offers.some(x=>x.playerId==='p0'),'의회 토큰 선취득으로 충전할 수 있는데 제안 누락');});
test('taklons','의회 토큰 선취득이 충전 한도에 반영',()=>{const s=fixture('taklons');put(s,'p0','planetary_institute');s.players[0].power={bowl1:0,bowl2:1,bowl3:5,gaia:0,brainstone:'bowl3'};const effects=R('passive_charge').enqueuePassiveChargeOffers(s,{sourcePlayerId:'p1',target:{q:1,r:0}});const e=effects.find(x=>x.playerId==='p0');assert(e);const out=R('passive_charge').resolvePassiveChargeChoice(s,e.id,{accept:true,taklonsGainTiming:'before'});assert.equal(out.charged,3);assert.equal(out.vpPaid,2);});
test('ambas','의회·광산 교환은 무료·충전 없음·라운드1회',()=>{const s=fixture('ambas');put(s,'p0','planetary_institute');put(s,'p0','mine',2,0);const old=clone(s.players[0].resources);AA.applyAction(s,action(s,'ambas_swap_pi_mine'));assert.equal(s.players[0].structuresOnMap.find(x=>x.q===2).structure,'planetary_institute');assert.deepEqual(s.players[0].resources,old);assert.equal(s.pendingEffects.length,0);assert(!LA.listFactionSpecialActions({state:s,playerId:'p0'}).some(a=>a.factionActionId==='ambas_swap_pi_mine'));s.round.number=2;assert(LA.listFactionSpecialActions({state:s,playerId:'p0'}).some(a=>a.factionActionId==='ambas_swap_pi_mine'));});
test('hadsch_hallas','의회 전 교환 잠김·의회 후 크레딧3→광석1',()=>{const s=fixture('hadsch_hallas');assert(!LA.getLegalFreeActions({state:s,playerId:'p0'}).some(a=>a.freeActionId==='hadsch_credits_to_ore'));put(s,'p0','planetary_institute');s.players[0].resources.ore=0;free(s,'hadsch_credits_to_ore');assert.equal(s.players[0].resources.ore,1);assert.equal(s.players[0].resources.credits,27);});
test('ivits','정거장 실제 비용은 사거리 추가 외 무료',()=>{const s=fixture('ivits');put(s,'p0','planetary_institute');s.players[0].resources.qic=0;const a=LA.listFactionSpecialActions({state:s,playerId:'p0'}).find(a=>a.factionActionId==='ivits_space_station'&&a.target.q===1&&a.target.r===0);assert(a,'기본 사거리인데 정보큐브0이면 정거장 선택 불가');assert.equal(a.cost.qic||0,0);});
test('ivits','정거장 사거리 출발점·충전 없음·라운드1회',()=>{const s=fixture('ivits');put(s,'p0','planetary_institute');const a=action(s,'ivits_space_station');AA.applyAction(s,a);assert.equal(s.pendingEffects.length,0);assert(s.players[0].structuresOnMap.some(x=>x.structure==='space_station'));assert(!LA.listFactionSpecialActions({state:s,playerId:'p0'}).some(a=>a.factionActionId==='ivits_space_station'));});
test('ivits','연방 기준은 획득 토큰수, 지형변환5 토큰 제외',()=>{const p=fixture('ivits').players[0];p.federationTokens=[{id:'x',source:'federation'},{id:'x',source:'terraforming_level5'}];assert.equal(R('federation').federationThreshold(p),14);});
test('geodens','의회 후 새로운 종류 지식3·같은 종류 재보상 없음',()=>{const s=fixture('geodens');put(s,'p0','planetary_institute');s.players[0].factionSpecific.geodensPiExcludedPlanetTypes=['volcanic'];target(s,'terra');mine(s);assert.equal(s.players[0].resources.knowledge,3);clear(s);target(s,'terra',0,1);mine(s,0,1);assert.equal(s.players[0].resources.knowledge,3);});
test('bal_taks','의회 전 항해 연구 금지·의회 후 허용',()=>{const s=fixture('bal_taks'),p=s.players[0];p.resources.knowledge=4;assert.equal(R('research').researchAdvanceCheck({state:s,player:p,area:'navigation'}).legal,false);put(s,'p0','planetary_institute');assert.equal(R('research').researchAdvanceCheck({state:s,player:p,area:'navigation'}).legal,true);});
test('bal_taks','가이아포머→큐브 교환·가이아 단계 반환',()=>{const s=fixture('bal_taks'),p=s.players[0];const before=p.resources.qic;free(s,'bal_taks_gaiaformer_to_qic');assert.equal(p.structuresRemaining.gaiaformer,0);assert.equal(p.resources.qic,before+1);s.round.phase='gaia';RP.resolveGaiaPhase(s);assert.equal(p.structuresRemaining.gaiaformer,1);});
test('firaks','의회 전 다운그레이드 잠김',()=>{const s=fixture('firaks');put(s,'p0','research_lab');assert(!LA.listFactionSpecialActions({state:s,playerId:'p0'}).some(a=>a.factionActionId==='firaks_downgrade_research'));});
test('firaks','의회 다운그레이드는 같은 라운드 반복 가능',()=>{const s=fixture('firaks');put(s,'p0','planetary_institute');put(s,'p0','research_lab',1,0);put(s,'p0','research_lab',2,0);AA.applyAction(s,action(s,'firaks_downgrade_research'));clear(s);assert(LA.listFactionSpecialActions({state:s,playerId:'p0'}).some(a=>a.factionActionId==='firaks_downgrade_research'),'다른 연구소가 남아도 두 번째 전환 후보 누락');});
test('bescods','교역소/연구소 수입과 업그레이드 경로 반전',()=>{const s=fixture('bescods');put(s,'p0','trading_station');put(s,'p0','research_lab',1,0);const src=R('income').listIncomeSources({state:s,playerId:'p0'});assert.equal(src.find(x=>x.id==='faction_trading_stations').effect.knowledge,1);assert.equal(src.find(x=>x.id==='faction_research_labs').effect.credits,3);assert.deepEqual([...R('structures').upgradeDestinations('bescods','research_lab')],['planetary_institute']);});
test('bescods','최저 연구만 무료·라운드1회',()=>{const s=fixture('bescods'),p=s.players[0];p.researchLevels.navigation=1;const a=LA.listFactionSpecialActions({state:s,playerId:'p0'}).find(a=>a.factionActionId==='bescods_lowest_research');assert(a);assert.notEqual(a.researchArea,'navigation');AA.applyAction(s,a);assert.equal(p.resources.knowledge,0);assert(!LA.listFactionSpecialActions({state:s,playerId:'p0'}).some(a=>a.factionActionId==='bescods_lowest_research'));});
test('bescods','의회 고향 건물 파워+1·다른 종류 제외',()=>{const s=fixture('bescods');put(s,'p0','planetary_institute');assert.equal(R('federation').structureFederationPower(s.players[0],{structure:'mine',planet:'titanium'}),2);assert.equal(R('federation').structureFederationPower(s.players[0],{structure:'mine',planet:'terra'}),1);});
test('nevlas','의회 전후 토큰당1/2파워·가이아전환1토큰',()=>{const s=fixture('nevlas'),p=s.players[0];p.power.bowl3=2;assert.equal(R('power_spend').availableSpendPower(p),2);put(s,'p0','planetary_institute');assert.equal(R('power_spend').availableSpendPower(p),4);free(s,'nevlas_power_to_gaia_knowledge');assert.equal(p.power.bowl3,1);assert.equal(p.power.gaia,1);assert.equal(p.resources.knowledge,1);});
test('nevlas','연구소당2충전·지식수입 없음',()=>{const s=fixture('nevlas');put(s,'p0','research_lab');put(s,'p0','research_lab',1,0);const effect=R('income').listIncomeSources({state:s,playerId:'p0'}).find(x=>x.id==='faction_research_labs').effect;assert.equal(effect.chargePower,4);assert.equal(effect.knowledge||0,0);});
test('itars','태우기 버리는 토큰은 가이아 구역',()=>{const s=fixture('itars'),p=s.players[0];p.power={bowl1:0,bowl2:4,bowl3:0,gaia:0,brainstone:null};R('power_spend').burnPower(p);assert.equal(p.power.bowl2,2);assert.equal(p.power.bowl3,1);assert.equal(p.power.gaia,1);});
test('itars','의회 가이아토큰4개당 기술 선택',()=>{const s=fixture('itars');put(s,'p0','planetary_institute');s.players[0].power.gaia=8;s.round.phase='gaia';RP.resolveGaiaPhase(s);assert.equal(s.pendingEffects.find(e=>e.type==='itars_gaia_tech_choice').maxTechChoices,2);});
test('itars','지식 아카데미 지식3 수입',()=>{const s=fixture('itars'),a=put(s,'p0','academy');a.academyVariant='knowledge_income';const src=R('income').listIncomeSources({state:s,playerId:'p0'}).find(x=>x.id==='faction_academy_knowledge');assert.equal(src.effect.knowledge,3);});
for(const fid of ['tinkeroids','moweyds'])test(fid,'기본7종 테라포밍 3개는3단계·나머지는1단계',()=>{const s=setup(fid),p=s.players[0],three=p.factionSpecific.threeStepPlanets;assert.equal(three.length,3);for(const f of s.players.slice(1)){const h=defs.find(x=>x.id===f.factionId).homePlanet;if(h)assert(three.includes(h));}for(const planet of ['terra','desert','swamp','oxide','volcanic','titanium','ice'])assert.equal(R('rules').factionTerraformSteps({factionId:fid,targetPlanet:planet,threeStepPlanets:three}),three.includes(planet)?3:1);});
test('tinkeroids','선택한 팅커링은 라운드1회·종료 시 제거',()=>{const s=fixture('tinkeroids'),p=s.players[0];put(s,'p0','planetary_institute');p.factionSpecific.tinkering={selectedTileId:'tinkering_early_qic',selectedRound:1,actionUsedRound:null,removedTileIds:[]};const a=LA.listTinkeringSpecialActions({state:s,playerId:'p0'})[0];assert(a);AA.applyAction(s,a);assert.equal(p.resources.qic,11);assert.equal(LA.listTinkeringSpecialActions({state:s,playerId:'p0'}).length,0);R('tinkering').finishTinkeringRound(s,1);assert(p.factionSpecific.tinkering.removedTileIds.includes('tinkering_early_qic'));});
test('darkanians','일반/깊은우주 신규구역 보상·같은 구역 반복 제외',()=>{const s=fixture('darkanians');put(s,'p0','planetary_institute');target(s,'terra',1,0,{sectorId:'11',sectorKind:'deep_space'});mine(s);assert.equal(s.players[0].resources.knowledge,1);clear(s);target(s,'terra',0,1,{sectorId:'11',sectorKind:'deep_space'});mine(s,0,1);assert.equal(s.players[0].resources.knowledge,1);});
test('darkanians','구역 사이 단일 타일은 신규구역 보상 제외',()=>{const s=fixture('darkanians');put(s,'p0','planetary_institute');target(s,'terra',1,0,{sectorId:'interspace-1',sectorKind:'interspace'});mine(s);assert.equal(s.players[0].resources.knowledge,0);});
test('moweyds','티에프 마스 시작 탐사·탐사선1개 소비',()=>{const s=setup('moweyds');assert(s.players[0].exploration.exploredShipIds.includes('tf_mars'));assert.equal(s.players[0].exploration.shuttlesAvailable,2);});
test('moweyds','파워링+2·같은행성 중복금지·라운드1회',()=>{const s=fixture('moweyds');const pi=put(s,'p0','planetary_institute');const before=R('federation').structureFederationPower(s.players[0],pi);AA.applyAction(s,action(s,'moweyds_power_ring'));assert.equal(R('federation').structureFederationPower(s.players[0],pi),before+2);assert(!LA.listFactionSpecialActions({state:s,playerId:'p0'}).some(a=>a.factionActionId==='moweyds_power_ring'));});
test('space_giants','기본7종2단계·가이아 큐브2',()=>{for(const planet of ['terra','desert','swamp','oxide','volcanic','titanium','ice'])assert.equal(R('rules').factionTerraformSteps({factionId:'space_giants',targetPlanet:planet}),2);assert.equal(R('rules').gaiaEntryCost('space_giants').qic,2);});
test('space_giants','무료2테라포밍·광산비용 유지·라운드1회',()=>{const s=fixture('space_giants');put(s,'p0','mine');target(s,'terra');const a=LA.listExplorationBoardSpecialActions({state:s,playerId:'p0'}).find(a=>a.specialActionId==='space_giants_free_terraform_2'&&a.subAction?.target.q===1&&a.subAction?.target.r===0);assert(a);assert.equal(a.subAction.cost.ore,1);AA.applyAction(s,a);assert(!LA.listExplorationBoardSpecialActions({state:s,playerId:'p0'}).some(a=>a.specialActionId==='space_giants_free_terraform_2'));});
test('space_giants','의회 즉시 기술타일1개 선택',()=>{const s=fixture('space_giants');put(s,'p0','trading_station');const a=LA.listUpgradeActions({state:s,playerId:'p0'}).find(a=>a.toStructure==='planetary_institute');assert(a);AA.applyAction(s,a);assert.equal(s.pendingEffects.filter(e=>e.type==='choose_tech_tile').length,1);});
// PI income expectations are transcribed from official Lost Fleet rulebook p16, not engine data.
for(const f of defs)test(f.id,'의회 인쇄 수입과 일치',()=>{
 const s=fixture(f.id);put(s,'p0','planetary_institute');
 const effect=R('income').listIncomeSources({state:s,playerId:'p0'}).find(x=>x.id==='faction_pi').effect;
 const expected={chargePower:4,powerTokensBowl1:1};
 if(f.id==='lantids')delete expected.powerTokensBowl1;
 if(f.id==='xenos'){delete expected.powerTokensBowl1;expected.qic=1;}
 if(f.id==='gleens'){delete expected.powerTokensBowl1;expected.ore=1;}
 if(['ambas','bescods'].includes(f.id))expected.powerTokensBowl1=2;
 if(f.id==='space_giants')expected.chargePower=6;
 assert.deepEqual(JSON.parse(JSON.stringify(effect)),expected);
});
for(const f of defs)test(f.id,'종족별 탐사 비용과 실제 적용',()=>{
 const s=fixture(f.id),p=s.players[0];put(s,'p0','mine');
 const h=target(s,'ship',1,0,{shipId:'eclipse'});s.map.shipHexes=[{q:1,r:0,shipId:'eclipse'}];
 p.exploration={shuttlesAvailable:2,exploredShipIds:[]};
 if(f.id==='taklons')p.power.brainstone='bowl2';
 const a=LA.listExploreShipActions({state:s,playerId:'p0'})[0];assert(a);
 const vp=p.resources.vp,normal=p.power.bowl1+p.power.bowl2+p.power.bowl3;
 AA.applyAction(s,a);assert.equal(p.resources.vp,vp-(f.id==='bal_taks'?7:5));
 assert(p.exploration.exploredShipIds.includes('eclipse'));assert.equal(p.exploration.shuttlesAvailable,1);
 if(f.id==='taklons')assert.equal(p.power.brainstone,'gaia');
 if(['nevlas','itars'].includes(f.id))assert.equal(p.power.bowl1+p.power.bowl2+p.power.bowl3,normal-1);
});
test('gleens','확장 사거리+2는 건설·가이아·탐사에 사용 가능',()=>{
 const s=fixture('gleens'),p=s.players[0];put(s,'p0','mine');p.resources.qic=0;
 target(s,'desert',3,0);target(s,'transdim',3,-1);target(s,'ship',3,-2,{shipId:'eclipse'});s.map.shipHexes=[{q:3,r:-2,shipId:'eclipse'}];
 const choices=LA.listExplorationBoardSpecialActions({state:s,playerId:'p0'}).filter(a=>a.specialActionId==='gleens_range_plus_2');
 for(const type of ['build_mine','start_gaia_project','explore_ship'])assert(choices.some(a=>a.subAction.type===type),type+' 경로 누락');
});
test('moweyds','파워링은 인접 패시브 충전값에도+2',()=>{
 const s=fixture('moweyds');put(s,'p0','planetary_institute');AA.applyAction(s,action(s,'moweyds_power_ring'));clear(s);
 const offer=R('passive_charge').listPassiveChargeOffers(s,{sourcePlayerId:'p1',target:{q:1,r:0}}).find(x=>x.playerId==='p0');assert.equal(offer.offeredPower,5);
});
test('itars','가이아 토큰8개로 기술2장 연속 실제 획득',()=>{
 const s=fixture('itars'),p=s.players[0];put(s,'p0','planetary_institute');p.power.gaia=8;s.round.phase='gaia';RP.resolveGaiaPhase(s);
 for(let i=0;i<2;i++){
  const effect=s.pendingEffects.find(e=>e.type==='itars_gaia_tech_choice');assert(effect);
  const listing=R('tech_tiles').listTechTileChoices(s,effect.id);
  const choice=listing.standard?.find(c=>c.tileId==='base_std_income_knowledge_credit')??listing.standard?.[0];
  assert(choice,'선택 가능한 기술 없음');
  R('tech_tiles').resolveTechTileChoice(s,effect.id,{kind:'standard',tileId:choice.tileId,source:choice.source,slotId:choice.slotId,researchArea:choice.researchAreas?.[0]});
 }
 assert.equal(p.standardTechs.length,2);assert.equal(p.power.gaia,0);
});

for(const f of defs)test(f.id,'최종 정산 합계·연구24점·자원5점·중복 정산 거부',()=>{
 const s=fixture(f.id),p=s.players[0];put(s,'p0','mine');p.resources={credits:10,ore:4,knowledge:1,qic:2,vp:40};
 p.researchLevels={terraforming:3,navigation:4,artificial_intelligence:5,gaia_project:1,economy:2,science:0};
 s.round.phase='final_scoring';const result=RP.resolveFinalScoringPhase(s);assert.equal(s.round.phase,'game_end');
 const row=s.finalScoringResult.players.find(x=>x.playerId==='p0');assert(row);
 assert.equal(row.researchVp,24);assert.equal(row.resourceVp,5);
 assert.equal(p.resources.vp,40+row.finalBonusVp);const vp=p.resources.vp;
 assert.throws(()=>RP.resolveFinalScoringPhase(s));assert.equal(p.resources.vp,vp);
});
for(const timing of ['before','after'])test('taklons','의회 토큰 '+timing+' 미리보기·실제 충전 일치',()=>{
 const s=fixture('taklons');put(s,'p0','planetary_institute');const p=s.players[0];
 p.power={bowl1:0,bowl2:1,bowl3:5,gaia:0,brainstone:'bowl3'};
 const pc=R('passive_charge'),effect=pc.enqueuePassiveChargeOffers(s,{sourcePlayerId:'p1',target:{q:1,r:0}})[0];
 const before=JSON.stringify(s),offer=pc.currentPassiveChargeOffer(s,effect,{taklonsGainTiming:timing});
 assert.equal(JSON.stringify(s),before,'미리보기가 상태를 변경함');assert.equal(offer.maxCharge,timing==='before'?3:1);
 const out=pc.resolvePassiveChargeChoice(s,effect.id,{taklonsGainTiming:timing});
 assert.equal(out.charged,offer.maxCharge);assert.equal(out.vpPaid,offer.vpCost);assert.equal(out.gainedPowerToken,1);
 assert.equal(p.power.bowl1+p.power.bowl2+p.power.bowl3,7);
});
test('taklons','토큰 선취득 충전 AI·승점 한도·거절',()=>{
 const s=fixture('taklons');put(s,'p0','planetary_institute');const p=s.players[0];
 p.power={bowl1:0,bowl2:0,bowl3:6,gaia:0,brainstone:'bowl3'};p.resources.vp=0;
 const pc=R('passive_charge'),effect=pc.enqueuePassiveChargeOffers(s,{sourcePlayerId:'p1',target:{q:1,r:0}})[0];assert(effect);
 const unchanged=JSON.stringify(s);assert.throws(()=>pc.resolvePassiveChargeChoice(s,effect.id,{taklonsGainTiming:'after'}));assert.equal(JSON.stringify(s),unchanged);
 const declined=clone(s),old=JSON.stringify(declined.players[0]);pc.resolvePassiveChargeChoice(declined,effect.id,{accept:false});assert.equal(JSON.stringify(declined.players[0]),old);
 const choice=R('ai_pending').chooseAiPendingEffect(s,effect.id);
 const out=pc.resolvePassiveChargeChoice(s,effect.id,choice.selection);assert.equal(out.charged,1);assert.equal(out.vpPaid,0);assert.equal(out.gainedPowerToken,1);
});
test('firaks','기존 저장의 사용 기록이 있어도 같은 라운드 다시 전환',()=>{
 const s=fixture('firaks');put(s,'p0','planetary_institute');put(s,'p0','research_lab',1,0);
 s.players[0].factionSpecific.specialActionsUsed={firaks_downgrade_research:1};
 AA.applyAction(s,action(s,'firaks_downgrade_research'));
 assert.equal(s.players[0].structuresOnMap.find(x=>x.q===1).structure,'trading_station');
});
const failed=results.filter(x=>!x.pass);
console.log(JSON.stringify({total:results.length,passed:results.length-failed.length,failed:failed.length,findings:failed},null,2));
fs.writeFileSync(path.join(outDir,'faction-rules-results.json'),JSON.stringify(results,null,2));
if(failed.length)process.exitCode=1;
