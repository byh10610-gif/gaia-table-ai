// Presentation layer only. The game engine, action rules and saved state are unchanged.
const tableExpandedPlayers=new Set();
const tableRemovedCopy=new Set([
 '모든 공용 타일은 이미 추첨했습니다. 아래 그림대로 놓으세요. 시작 건물과 첫 부스터 선택은 다음 화면에서 순서대로 진행합니다.',
 '이전 버전의 백업입니다. 일반 기술 분류가 잘못된 상태를 포함할 수 있어 새 게임으로 테스트하는 것을 권장합니다. 기존 상태는 임의로 변환하지 않습니다.',
 '실물 플레이 전 지도에서 구역 번호·회전과 행성 위치를 비교하고, 실물 타일 세팅을 맞춰 주세요. 새 게임은 인원수에 맞는 확장 배치를 제공합니다.',
 '수입·가이아 단계는 모든 플레이어를 함께 처리합니다. 후속 선택이 나오면 먼저 해결하세요.',
 '그림대로 실물에서 실행하고 완료를 누르세요.',
 '실물과 수치가 달라졌을 때 보정하세요. 보정도 되돌릴 수 있습니다.'
]);
const tableCopyMap=new Map([
 ['플레이어 순서와 종족','플레이어'],['연구 보드 · 위에 고급 기술 / 아래에 일반 기술','연구 보드'],['연구 보드 아래 자유 기술 3칸','자유 기술'],['1 → 6라운드 점수 타일','라운드 점수'],['최종 점수 2개','최종 점수'],['사용할 라운드 부스터','라운드 부스터'],['경제 타일 · 추가 고급 기술 · 테라포밍 보상','경제 · 고급 기술 · 연구 보상'],
 ['광산 건설 행동 1회. 무료 테라포밍 1단계를 제공한다.','광산을 지을 행성을 선택하세요. 테라포밍 1단계는 무료이며, 나머지 건설 비용은 아래와 같습니다.'],
 ['추첨된 세팅 · 실물 배치표','배치표'],['현재 진행','이번 행동'],
 ['실물 보드에 맞춰 지도 편집','지도 편집'],
 ['새 게임의 지도는 확장 규칙서의 2·3·4인 배치와 uiqoo 좌표를 바탕으로 구성합니다. 실물 보드와 비교한 뒤 시작하세요. 시작 건물 배치 전에는 구역 이동·회전과 함대 편집이 가능합니다.','구역 이동·회전은 시작 건물을 놓기 전에 가능합니다.'],
 ['시작 전 실물의 라운드 점수·최종 점수·부스터·기술 타일에 맞추세요. 중간 변경은 이후 점수와 수입에만 영향을 줍니다.','중간 변경은 이후 점수와 수입부터 적용됩니다.']
]);
function tableCopy(text){return tableRemovedCopy.has(text)?null:tableDisplayText(tableCopyMap.get(text)??text);}
function tableHasStatusChange(change){
 if(!change||change.error)return false;
 return ['resources','power','researchLevels'].some(k=>JSON.stringify(change.before[k])!==JSON.stringify(change.after[k]));
}
function tableButtonCopy(text){return {'공용 세팅 배치 완료 · 시작 건물 배치로':'건물 배치 시작','전체 세팅 다시 추첨':'다시 추첨','직접 수정하고 싶어요':'타일 수정','이 지도에서 앱 테스트 바로 시작':'이 지도로 진행','실물에서 수입을 받고 확인':'수입 반영','실물에서 가이아 처리를 마치고 확인':'가이아 처리','라운드 정리하고 다음 단계':'다음 라운드','지도 확인하기':'지도 확인'}[text]??text;}
function tableSetup(){
 view='setup';$('app').hidden=true;$('setup').hidden=false;
 const box=$('players');box.innerHTML='';
 for(let i=0;i<4;i++){
  const div=document.createElement('div');div.className='setupPlayer';
  div.innerHTML=`<span class="seatNumber" aria-hidden="true">${String(i+1).padStart(2,'0')}</span><label>이름<input id="name${i}" value="${i===2?'인공지능':'사람 '+(i+1)}" aria-label="플레이어 ${i+1} 이름"></label><label>종족<select id="faction${i}" aria-label="플레이어 ${i+1} 종족"><option value="random" selected>자동 추첨</option>${options(factions)}</select></label><label>역할<select id="ai${i}" aria-label="플레이어 ${i+1} 역할"><option value="human">사람</option><option value="ai" ${i===2?'selected':''}>인공지능</option></select></label>`;
  box.append(div);
 }
 $('count').onchange=()=>[...box.children].forEach((x,i)=>x.hidden=i>=+$('count').value);
 $('count').onchange();tableSyncView();
}
function tablePortrait(p){
 const art=VISUAL_ASSETS[p.factionId];if(!art)return '';
 return `<svg class="factionPortrait" viewBox="0 0 165 165" role="img" aria-label="${esc(ko(p.factionId))}"><image href="${art.src}" width="${art.w}" height="${art.h}"/></svg>`;
}
function tablePlayerCard(p){
 const current=p.id===state.round.currentPlayerId,pal=playerPalette(p),pow=p.power??{};
 return `<article class="player ${current?'current':''}" style="--player-color:${pal.fill}"><div class="playerTitle">${tablePortrait(p)}<div><strong>${esc(p.name)}</strong><span class="factionName">${esc(ko(p.factionId))}</span></div>${p.passed?'<span class="turnPill passed">패스</span>':current?'<span class="turnPill"><span class="turnDot" aria-hidden="true"></span>지금 차례</span>':''}</div>${gameStatusAmounts(p,{power:false})}<details class="playerDetails" data-player-details="${esc(p.id)}" ${tableExpandedPlayers.has(p.id)?'open':''}><summary><span class="detailToggle"><span class="detailPlus" aria-hidden="true"></span><span>파워 · 연구 · 보너스</span><b class="detailOpenLabel">펼치기</b><b class="detailCloseLabel">접기</b></span><span class="powerMini" aria-label="파워 Ⅰ ${pow.bowl1??0} · Ⅱ ${pow.bowl2??0} · Ⅲ ${pow.bowl3??0}">Ⅰ ${pow.bowl1??0}<i>·</i>Ⅱ ${pow.bowl2??0}<i>·</i>Ⅲ ${pow.bowl3??0}</span></summary><div class="playerDetailContent">${tableNevlasPowerNote(p)}${gameStatusAmounts(p,{research:true,resources:false})}${playerBonuses(p)}</div></details></article>`;
}
function tableSyncView(){
 document.body?.setAttribute('data-view',state?.round.phase==='game_end'&&view==='play'?'results':view);
 if(document.createTreeWalker)tableReplacePlanetText($('panel')); 
 $('undo').disabled=!history.length;$('backup').disabled=!state;
 $('cards')?.querySelectorAll('details[data-player-details]').forEach(d=>{d.ontoggle=()=>{if(d.open)tableExpandedPlayers.add(d.dataset.playerDetails);else tableExpandedPlayers.delete(d.dataset.playerDetails);};});
 if(view==='overview'){const panel=$('panel'),controls=panel.querySelectorAll('.overviewControls')[0];if(controls&&panel.insertBefore&&panel.children[1]!==controls)panel.insertBefore(controls,panel.children[1]??null);}
}

const tablePlanetNames={terra:'파란',desert:'노란',swamp:'갈색',oxide:'빨간',volcanic:'주황',titanium:'회색',ice:'흰색',gaia:'가이아',transdim:'보라',asteroid:'소행성',protoplanet:'원시',lost_planet:'잃어버린'};
function tablePlanet(type,{label=true}={}){
 const sprite=planetSprite(type),art=sprite&&VISUAL_ASSETS[sprite.key];
 const name=(tablePlanetNames[type]??ko(type))+(type==='asteroid'?'':' 행성');
 if(!art)return esc(name);
 const r=sprite.r*.86;
 return `<span class="planetChip"><svg class="planetPicture" viewBox="${sprite.cx-r} ${sprite.cy-r} ${2*r} ${2*r}" ${label?'aria-hidden="true"':`role="img" aria-label="${esc(name)}"`}><image href="${art.src}" width="${art.w}" height="${art.h}"/></svg>${label?`<span>${esc(name)}</span>`:''}</span>`;
}
function tableThreeStepNotice(p){
 const d=document.createElement('div');d.className='notice planetNotice';
 d.innerHTML=`<div><b>${esc(ko(p.factionId))}</b><span>테라포밍 3단계</span></div><div class="planetList">${p.factionSpecific.threeStepPlanets.map(t=>tablePlanet(t)).join('')}</div>`;
 $('panel').append(d);
}
function tableReplacePlanetText(root){
 if(!root)return;
 const types=Object.keys(tablePlanetNames).filter(t=>t!=='gaia'),names=new Map(types.map(t=>[ko(t),t]));
 const pattern=new RegExp('('+[...names.keys()].sort((a,b)=>b.length-a.length).join('|')+')(?: 행성)?(?=$|[ ·,/:)])','g');
 const walker=document.createTreeWalker(root,4),nodes=[];let n;
 while(n=walker.nextNode())if(!n.parentElement.closest('svg,button.actionCategory,select,option,input,textarea,.planetChip,.panelTitle,.logActor,.factionName'))nodes.push(n);
 for(const node of nodes){const text=node.nodeValue;pattern.lastIndex=0;if(!pattern.test(text))continue;pattern.lastIndex=0;const span=document.createElement('span');span.className='planetText';let at=0;span.innerHTML=[...text.matchAll(pattern)].map(m=>{const x=esc(text.slice(at,m.index))+tablePlanet(names.get(m[1]));at=m.index+m[0].length;return x}).join('')+esc(text.slice(at));node.replaceWith(span);}
}
function tableRenderLog(){
 heading('행동 기록');
 const entries=[...state.actionLog].reverse().filter(x=>!x.uiHiddenInLog).slice(0,120),list=document.createElement('div');list.className='timeline';
 if(!entries.length){append('아직 기록된 행동이 없습니다.','logEmpty');return;}
 let lastRound=null;
 entries.forEach((x,i)=>{
  const round=x.round??state.round.number,a=x.uiVisual??x.action??x,p=player(x.playerId??a.playerId),leaf=finalAction(a);
  if(round!==lastRound){const h=document.createElement('h3');h.className='logRound';h.textContent=round+'라운드';list.append(h);lastRound=round;}
  const row=document.createElement('article');row.className='timelineEntry'+(i===0?' latest':'');
  if(p)row.style?.setProperty('--log-color',playerPalette(p).fill);
  const title=x.uiVisual&&x.actionType!=='ui_effect_resolved'?actionTitle(x.uiVisual):x.displayName??a.displayName??x.note??ko(x.actionType??x.type??a.type??'처리 완료');
  const parts=tableDisplayText(title).split(' · '),main=parts.shift();
  const head=document.createElement('div');head.className='timelineHead';
  head.innerHTML=`<div class="logActor">${p?tablePortrait(p):''}<strong>${esc(p?.name??'전체')}</strong>${i===0?'<span class="latestLabel">최근 행동</span>':''}</div><h4>${esc(main)}</h4>${parts.length?`<p class="logLocation">${esc(parts.join(' · '))}</p>`:''}${specialActionSummary(a)?`<p class="logMethod">${esc(specialActionSummary(a))}</p>`:''}`;
  const mainRow=document.createElement('div');mainRow.className='logMainRow';const impact=document.createElement('div');impact.className='logImpact';impact.innerHTML=tableLogChangeHTML(x,a,p);mainRow.append(head,impact);row.append(mainRow);
  const detail=document.createElement('details');detail.className='logDetail';detail.innerHTML='<summary><span class="detailPlus" aria-hidden="true"></span>자원 · 배치 상세</summary>';
  const content=document.createElement('div');content.className='logDetailContent';content.innerHTML=renderLogStatus(x);appendComponentGuide(content,a);if(actionPoints(a).length)content.append(locationGuide(a));detail.append(content);row.append(detail);list.append(row);
 });
 $('panel').append(list);
}

function tableActionMatches(a,category){
 if(actionCategory(a)===category)return true;
 if(category==='research'&&(a.researchArea||/research/.test(a.pending??'')))return true;
 if(category==='build'&&['ivits_space_station','ambas_swap_pi_mine','firaks_downgrade_research'].includes(a.factionActionId))return true;
 if(category==='explore'&&a.type==='ship_board_action')return true;
 if(category==='special'&&(a.type?.endsWith('_special_action')||a.type==='faction_special'))return true;
 if(category==='common'&&a.type==='common_board_action')return true;
 return false;
}
let tableBuildingPictureId=0;
function tableBuildingArtwork(kind,p){
 const palette=playerPalette(p),id='building-tint-'+(++tableBuildingPictureId);
 // Map the original miniature's light and shadow to the owner's piece colour.
 // Keep alpha, dark outlines and pale highlights; each SVG owns its filter so
 // replacing a panel cannot remove another panel's colour definitions.
 const channels=[1,3,5].map(i=>parseInt(palette.fill.slice(i,i+2),16)/255);
 const ramps=channels.map(c=>[0,c*.38,c*.76,c,1].map(n=>n.toFixed(4)).join(' '));
 return `<svg class="originalBuilding" viewBox="0 0 44 46" width="44" height="46" role="img" aria-label="${esc(palette.name+' '+ko(kind))}" data-piece-color="${palette.fill}"><defs><filter id="${id}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncR type="table" tableValues="${ramps[0]}"/><feFuncG type="table" tableValues="${ramps[1]}"/><feFuncB type="table" tableValues="${ramps[2]}"/></feComponentTransfer></filter></defs><image href="${gameIconSource(kind)}" x="0" y="0" width="44" height="46" preserveAspectRatio="xMidYMid meet" filter="url(#${id})"/></svg>`;
}
function tableBuilding(kind,p){
 if(!kind)return '';
 const actual=['mine','trading_station','research_lab','academy','planetary_institute','gaiaformer'].includes(kind);
 return `<span class="buildingPicture">${actual?tableBuildingArtwork(kind,p):`<svg viewBox="-24 -31 48 53" role="img" aria-label="${esc(ko(kind))}">${pieceMarker(p,kind,0,0,{compact:false})}</svg>`}<small>${esc(ko(kind))}</small></span>`;
}
function tableCostLabel(key){return {power:'파워',powerTokens:'파워 토큰',bowl2Tokens:'Ⅱ그릇 토큰',bowl3PowerToken:'Ⅲ그릇 토큰',gaiaformer:'가이아포머',brainstone:'두뇌석'}[key]??ko(key);}

function tableCostHTML(cost,p=state?player(state.round.currentPlayerId):null){
 const items=Object.entries(cost??{}).filter(([k,v])=>typeof v==='number'&&v>0);
 return items.length?items.map(([k,v])=>k==='power'&&tableNevlasDoubled(p)?`<span class="actionCost doubledPowerCost">${metricIcon(k)}<b>${Math.ceil(v/2)}</b><small>개 토큰 (${v}파워)</small></span>`:`<span class="actionCost">${metricIcon(k)}<b>${v}</b><small>${esc(tableCostLabel(k))}</small></span>`).join(''):'<span class="noCost">비용 없음</span>';
}
function tableActionKey(a){const x=finalAction(a);return JSON.stringify([x.type,x.target,x.toStructure,x.academyVariant,x.researchArea,x.shipId,x.shipActionId,x.actionSpaceId,x.freeActionId,x.boosterId,x.artifactId,x.factionActionId,x.tokenId,x.type?.endsWith('_special_action')?x.componentActionId??x.tinkeringTileId??x.displayName:null]);}
function tableRenderActionList(){
 const list=$('actionList');if(!list)return;list.innerHTML='';
 if(!humanCategory){list.textContent='행동을 선택하세요.';return;}
 if(humanCategory==='common'){tableRenderCommonBoard(list);return;}
 const h=state.map.hexes[selectedHex],isFree=humanCategory==='free';
 let visible=(isFree?freeChoices:choices).filter(a=>tableActionMatches(a,humanCategory)&&(!filter||tableSearchTitle(a).includes(filter)));
 if(humanCategory==='build'&&tableCommonBuildSpace){visible=visible.filter(a=>a.actionSpaceId===tableCommonBuildSpace);const note=document.createElement('div');note.className='commonBuildNotice';note.textContent='공용 테라포밍 · 지도에서 건설할 행성을 선택하세요.';note.append(button('모든 건설 보기',()=>{tableCommonBuildSpace=null;render()}));list.append(note);}
 if(h&&view==='play')visible=visible.filter(a=>!actionPoints(a).length||actionPoints(a).some(t=>t.q===h.q&&t.r===h.r));
 list.className=(humanCategory==='booster'||humanCategory==='pass'&&state.round.number<6)?'boosterActionList':'';
 const stationActions=(isFree?[]:choices).filter(a=>tableIsStationAction(a)&&tableActionMatches(a,humanCategory)&&(!filter||tableSearchTitle(a).includes(filter)));
 visible=visible.filter(a=>!tableIsStationAction(a));
 if(stationActions.length)list.append(tableStationCard(stationActions));
 const groups=new Map();for(const a of visible.slice(0,180)){const key=tableActionKey(a);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(a);}
 for(const routes of groups.values()){
  const a=routes[0],leaf=finalAction(a),p=player(a.playerId??state.round.currentPlayerId);
  if(a.type==='choose_round_booster'){list.append(tableBoosterChoice(a,a.boosterId,false));continue;}
  if(a.type==='pass'&&state.round.number<6){for(const id of state.globalBoards.availableBoosterIds)list.append(tableBoosterChoice(a,id,true));continue;}
  const card=document.createElement('article');card.className='actionOption';
  const points=actionPoints(leaf),location=points.length===1?placeName(points[0]):'',base=tableActionName(leaf);
  const icon=leaf.componentActionId==='academy_qic'?tableBuilding('academy',p):leaf.type==='build_mine'||leaf.type==='place_initial_structure'?tableBuilding(leaf.structure??'mine',p):leaf.type==='upgrade_structure'?tableBuilding(leaf.fromStructure??p?.structuresOnMap?.find(t=>t.q===leaf.target?.q&&t.r===leaf.target?.r)?.structure??'mine',p)+'<span class="buildingArrow">→</span>'+tableBuilding(leaf.toStructure,p):leaf.type==='research_progress'?metricIcon(leaf.researchArea):'';
  const title=document.createElement('div');title.className='actionOptionHeading';title.innerHTML=`<div class="actionVisual">${icon}</div><div><b>${esc(base)}</b>${location?`<p>${esc(location)}</p>`:''}</div>`;card.append(title);
  for(const route of routes){
   const actual=finalAction(route),method=specialActionSummary(route)||((route.type?.endsWith('_special_action')||route.type==='faction_special_action')?actionSourceLabel(route):''),ids=componentIds(route),b=button('',()=>apply(route,isFree),'actionRoute');
   b.innerHTML=`<span class="routeName">${method?'<span class="routeTag">특수</span>':''}${esc(method?method.replace(/^특수행동 · /,''):routes.length>1?'일반 행동':'실행')}</span><span class="routeCosts">${tableCostHTML(tableActionCost(route),player(route.playerId??state.round.currentPlayerId))}</span>`;
   b.setAttribute?.('aria-label',(method||base)+' · '+location+' · '+costText(tableActionCost(route)));
   if(ids.length){const art=document.createElement('div');art.className='routeTile';art.innerHTML=componentPicture(ids[0]);b.append(art);}
   card.append(b);
  }
  list.append(card);
 }
 if(!visible.length&&!stationActions.length)list.textContent='가능한 행동이 없습니다. 행성 선택이나 검색을 해제하세요.';
}
function tableSearchTitle(a){let text=actionTitle(a)+' '+specialActionSummary(a);for(const [id,color]of Object.entries(tablePlanetNames))text+=' '+(text.includes(ko(id))?color+' 행성':'');return text;}
function tableCaptureLogChanges(old){
 const added=state.actionLog.slice(old.actionLog.length),cursor=new Map(old.players.map(p=>[p.id,E.snapshotPlayerStatus(p)]));
 for(const x of added){if(x.uiHiddenInLog)continue;if(x.statusAfter){x.uiStatusBefore=structuredClone(cursor.get(x.playerId)??null);cursor.set(x.playerId,x.statusAfter);}if(x.playersStatusAfter){x.uiPlayersStatusBefore=[...cursor.values()].map(x=>structuredClone(x));for(const p of x.playersStatusAfter)cursor.set(p.playerId,p);}}
 for(const p of state.players){const rows=added.filter(x=>x.playerId===p.id),last=rows.filter(x=>!x.uiHiddenInLog).at(-1);if(!last)continue;
  if(!last.statusAfter){last.uiStatusBefore=structuredClone(cursor.get(p.id)??null);last.statusAfter=E.snapshotPlayerStatus(p);}
  const prev=old.players.find(x=>x.id===p.id);if(prev){const before=prev.structuresOnMap??[],after=p.structuresOnMap??[];last.uiStructureChanges=after.filter(t=>!before.some(f=>f.q===t.q&&f.r===t.r&&f.structure===t.structure)).map(t=>({q:t.q,r:t.r,from:before.find(f=>f.q===t.q&&f.r===t.r)?.structure??null,to:t.structure}));}
  const passive=rows.find(x=>x.actionType==='passive_charge_resolved');if(passive)last.uiPassiveCharge={charged:passive.charged,vpPaid:passive.vpPaid,sourcePlayerId:passive.sourcePlayerId,gainedPowerToken:passive.gainedPowerToken};
 }
}
function tablePreviousStatus(entry){
 if(entry.uiStatusBefore)return entry.uiStatusBefore;
 const at=state.actionLog.indexOf(entry);for(let i=at-1;i>=0;i--){const x=state.actionLog[i];if(!x.uiHiddenInLog&&x.playerId===entry.playerId&&x.statusAfter)return x.statusAfter;const p=x.playersStatusAfter?.find(p=>p.playerId===entry.playerId);if(p)return p;}
 return null;
}
function tableLogChangeHTML(x,a,p){
 const before=tablePreviousStatus(x),after=x.statusAfter,parts=[];
 let structures=x.uiStructureChanges??[];const leaf=finalAction(a);
 if(!structures.length&&['build_mine','place_initial_structure','upgrade_structure'].includes(leaf.type))structures=[{from:leaf.type==='upgrade_structure'?(leaf.fromStructure??null):null,to:leaf.toStructure??leaf.structure??'mine'}];
 if(!structures.length&&/광산.*→.*교역소/.test(x.displayName??''))structures=[{from:'mine',to:'trading_station'}];
 if(structures.length)parts.push('<div class="logBuildingChange">'+structures.map(t=>(t.from?tableBuilding(t.from,p)+'<span class="buildingArrow">→</span>':'')+tableBuilding(t.to,p)).join('')+'</div>');
 if(before&&after){
  const resources=[];for(const key of ['credits','ore','knowledge','qic','vp']){const f=before.resources?.[key]??0,t=after.resources?.[key]??0;if(f!==t)resources.push(`<span class="logDelta ${t>f?'positive':'negative'}">${metricIcon(key)}<b>${t>f?'+':''}${t-f}${key==='vp'?'점':''}</b><small>${f} → ${t}</small></span>`);}
  if(resources.length)parts.push('<div class="logDeltaStrip">'+resources.join('')+'</div>');
  const research=[];for(const [key,to]of Object.entries(after.researchLevels??{})){const from=before.researchLevels?.[key]??0;if(from!==to)research.push(`<span class="logResearchChange">${metricIcon(key)}<span>${esc(ko(key))}<b>${from}단계 → ${to}단계</b></span></span>`);}
  if(research.length)parts.push('<div class="logResearchChanges">'+research.join('')+'</div>');
  const bowls={bowl1:'Ⅰ그릇',bowl2:'Ⅱ그릇',bowl3:'Ⅲ그릇',gaia:'가이아'};const power=Object.entries(bowls).filter(([k])=>(before.power?.[k]??0)!==(after.power?.[k]??0)).map(([k,label])=>`<span><small>${label}</small><b>${before.power?.[k]??0} → ${after.power?.[k]??0}</b></span>`);
  if(power.length)parts.push('<div class="logPowerChange">'+metricIcon('power')+power.join('')+'</div>');
  if(before.power?.brainstone!==after.power?.brainstone)parts.push('<p class="logEffectText">두뇌석 '+esc(ko(before.power?.brainstone??'없음'))+' → '+esc(ko(after.power?.brainstone??'없음'))+'</p>');
 }
 const prior=state.actionLog[state.actionLog.indexOf(x)-1];const passive=x.uiPassiveCharge??(Number.isFinite(x.charged)?x:prior?.actionType==='passive_charge_resolved'&&prior.playerId===x.playerId?prior:null);if(passive){const who=player(passive.sourcePlayerId);parts.unshift(`<p class="logEffectText">${who?esc(who.name)+' 건설로 ':''}파워 <b>${passive.charged??0} 충전</b> · 승점 <b>−${passive.vpPaid??0}점</b></p>`);}
 if(!before&&after)parts.push('<span class="logHistoricalNote">이전 수치가 없는 기록 · 보유량은 상세에서 확인</span>');
 return parts.join('')||'<span class="logHistoricalNote">자원 변화 없음</span>';
}

function tableActionCost(a){const cost={...(a.cost??{})};if(a.subAction)for(const [k,v]of Object.entries(tableActionCost(a.subAction)))cost[k]=(cost[k]??0)+v;return cost;}

const tableExtraNames={
 ship_free_mine_terraform_1:'광산 건설 · 무료 테라포밍 1단계',
 ship_instant_gaia_project:'즉시 가이아 프로젝트',
 ship_asteroid_mine_without_gaiaformer:'가이아포머 없이 소행성 개척',
 ship_choose_research_progress:'원하는 연구 1단계 진보',
 ship_free_mine_to_trading_station:'광산을 교역소로 무료 업그레이드',
 ship_free_trading_station_to_research_lab:'교역소를 연구소로 무료 업그레이드',
 ship_range_plus_3_followup:'사거리 +3으로 건설·가이아·탐사',
 federation_free_mine_terraform_3:'광산 건설 · 무료 테라포밍 3단계',
 federation_unlimited_range_free_mine:'거리 제한 없이 광산 건설',
 tech_free_mine_terraform_2:'무료 광산 건설 · 테라포밍 2단계',
 rescore_federation_token:'연방 토큰 보상 다시 받기',
 choose_tinkering_tile:'팅커링 타일 선택',
 itars_gaia_tech_choice:'아이타 기술 타일 선택',
 ui_effect_resolved:'추가 행동 완료',
 passive_charge_resolved:'파워 충전 처리',
 bowl2Tokens:'Ⅱ그릇 토큰',powerTokens:'파워 토큰',
 claim_research_federation_token:'테라포밍 연구 보상 받기',
 choose_research_progress:'연구 1단계 진보',
 choose_advanced_tech_tile:'고급 기술 타일 선택'
};
function tableDisplayText(text){return String(text??'').replace(/\b[A-Za-z][A-Za-z0-9]*(?:_[A-Za-z0-9]+)+\b/g,id=>ko(id));}
function tablePendingCanSkip(effect){return ['ship_free_mine_terraform_1','ship_instant_gaia_project','ship_asteroid_mine_without_gaiaformer','ship_choose_research_progress','ship_free_mine_to_trading_station','ship_free_trading_station_to_research_lab','ship_range_plus_3_followup','federation_free_mine_terraform_3','federation_unlimited_range_free_mine','tech_free_mine_terraform_2','rescore_federation_token'].includes(effect.type);}
function tablePendingSkipLabel(effect){return /mine_to|station_to/.test(effect.type)?'업그레이드 없이 계속':/research/.test(effect.type)?'연구 없이 계속':/rescore/.test(effect.type)?'보상 없이 계속':/mine/.test(effect.type)?'건설 없이 계속':'추가 행동 없이 계속';}
function tableFederationChoiceGroups(effect,choices){
 const groups=new Map();
 for(const choice of choices){
  const key=JSON.stringify([choice.tokenId??choice.id,choice.source??'',choice.shipId??'']);
  if(!groups.has(key))groups.set(key,{choice,count:0});
  groups.get(key).count++;
 }
 return [...groups.values()];
}
function tableRenderFederationChoices(effect,choices){
 const list=document.createElement('div');list.className='pendingChoiceList federationChoiceList';
 for(const {choice:c,count} of tableFederationChoiceGroups(effect,choices)){
  const selection=effect.type==='rescore_federation_token'?{tokenIndex:c.index,tokenId:c.id??c.tokenId}:c;
  const name=pendingLabel(c),id=c.tokenId??c.id;
  const source=c.source==='lost_fleet_ship'?ko(c.shipId)+' 보상':effect.type==='rescore_federation_token'?'보유 '+count+'개':effect.type==='choose_federation_token'?'남은 '+count+'개':'';
  const b=button('',()=>resolveEffect(effect,selection),'federationChoice');
  b.innerHTML=`<span class="federationChoiceArt">${componentPicture(id)}</span><span class="federationChoiceText"><b>${esc(name)}</b>${source?`<small>${esc(source)}</small>`:''}</span><span class="federationChoiceSelect">선택</span>`;
  b.setAttribute?.('aria-label',name+' · '+source+' · 선택');list.append(b);
 }
 $('panel').append(list);
}
function tableRenderPendingChoices(effect,listing){
 const all=listing.choices??[],h=state.map.hexes[selectedHex];let visible=all;
 if(all.length&&['choose_federation_token','rescore_federation_token','claim_research_federation_token'].includes(effect.type)){tableRenderFederationChoices(effect,all);return;}
 if(h&&all.some(c=>actionPoints(c).length))visible=all.filter(c=>!actionPoints(c).length||actionPoints(c).some(t=>t.q===h.q&&t.r===h.r));
 if(!visible.length){
  if(all.length){append('선택한 행성에서는 이 행동을 할 수 없습니다. 다른 행성을 고르거나 선택을 해제하세요.','notice');$('panel').append(button('행성 선택 해제',()=>{selectedHex=null;render()}));return;}
  append('현재 자원·사거리·남은 구성물로 실행할 수 있는 대상이 없습니다.','notice');
  if(tablePendingCanSkip(effect))$('panel').append(button(tablePendingSkipLabel(effect),()=>resolveEffect(effect,{skip:true})));
  else append('필요한 선택 대상이 없습니다. 상태 보정에서 실물 상태를 확인해 주세요.','small');return;
 }
 const list=document.createElement('div');list.className='pendingChoiceList';
 for(const c of visible.slice(0,200)){
  const selection=effect.type==='rescore_federation_token'?{tokenIndex:c.index,tokenId:c.id??c.tokenId}:effect.type==='choose_tinkering_tile'?{tileId:c.id}:c;
  const card=document.createElement('article');card.className='actionOption pendingOption';
  const leaf=finalAction(c),p=player(effect.playerId),location=c.target?placeName(c.target):'',name=pendingLabel(c),title=name.split(' · ')[0];
  const kind=leaf.toStructure??(['build_mine','place_initial_structure'].includes(leaf.type)?leaf.structure??'mine':null);
  const from=kind&&leaf.type==='upgrade_structure'?(leaf.fromStructure??p.structuresOnMap.find(t=>t.q===leaf.target?.q&&t.r===leaf.target?.r)?.structure):null;
  const picture=kind?(from?tableBuilding(from,p)+'<span class="buildingArrow">→</span>':'')+tableBuilding(kind,p):leaf.researchArea?metricIcon(leaf.researchArea):'';
  const head=document.createElement('div');head.className='actionOptionHeading';head.innerHTML=`<div class="actionVisual">${picture}</div><div><b>${esc(title)}</b>${location?`<p>${esc(location)}</p>`:''}</div>`;card.append(head);
  const ids=componentIds(c);if(ids.length){const art=document.createElement('div');art.className='pendingArt';art.innerHTML=ids.map(id=>componentPicture(id)).join('');card.append(art);}
  const b=button('',()=>resolveEffect(effect,selection),'actionRoute');
  b.innerHTML=`<span class="routeName">${c.cost?'실행':'선택'}</span><span class="routeCosts">${c.cost?tableCostHTML(c.cost,p):esc(name)}</span>`;
  b.setAttribute?.('aria-label',[name,location,c.cost?costText(c.cost):'선택'].filter(Boolean).join(' · '));card.append(b);list.append(card);
 }
 $('panel').append(list);
}

function tablePendingHeading(effect){const d=document.createElement('div');d.className='pendingHeading';d.innerHTML=`<small>${esc(title(player(effect.playerId)))}</small><h3>${esc(ko(effect.type))}</h3>`;$('panel').append(d);}

function tableBoosterChoice(action,id,pass=false){const b=button('',()=>pass?apply(action,false,{nextRoundBoosterId:id}):apply(action),'boosterChoice');b.innerHTML=componentPicture(id)+`<span class="boosterChooseLabel">${pass?'이 부스터로 교체하고 패스':'이 부스터 선택'}</span>`;b.setAttribute?.('aria-label',ko(id)+' · '+(pass?'교체하고 패스':'첫 라운드 부스터 선택'));return b;}

let tableStationMode=null;
function tableIsStationAction(a){return a.type==='faction_special_action'&&a.factionActionId==='ivits_space_station';}
function tableStationTargets(){
 if(!tableStationMode)return null;
 if(!state||view!=='play'||state.round.phase!=='actions'||state.round.currentPlayerId!==tableStationMode.playerId||state.round.number!==tableStationMode.round){tableStationMode=null;return null;}
 const p=player(tableStationMode.playerId);if(!p||p.isAi||state.pendingEffects.length)return null;
 const actions=E.getLegalActions({state,playerId:p.id}).filter(tableIsStationAction);
 if(!actions.length){tableStationMode=null;return null;}return actions.map(a=>a.target);
}
function tableBeginStationSelection(){tableStationMode={playerId:state.round.currentPlayerId,round:state.round.number};selectedHex=null;filter='';render();}
function tableCancelStationSelection(){tableStationMode=null;selectedHex=null;render();}
function tableStationCard(actions){
 const card=document.createElement('article');card.className='actionOption stationPlacement';const active=tableStationTargets()!==null;
 const h=state.map.hexes[selectedHex],chosen=active&&h?actions.find(a=>a.target.q===h.q&&a.target.r===h.r):null;
 const head=document.createElement('div');head.className='actionOptionHeading';head.innerHTML='<div><b>우주 정거장 설치</b><p>'+ (active?'지도에서 설치할 빈 우주를 누르세요.':'가능한 위치를 지도에서 골라 설치합니다.')+'</p></div>';card.append(head);
 if(active){
  const info=document.createElement('div');info.className='stationSelectionInfo';info.textContent=chosen?'선택한 위치 · '+placeName(chosen.target):h?'이 칸에는 설치할 수 없습니다. 다른 빈 우주를 선택하세요.':'설치할 빈 우주를 지도에서 선택하세요.';card.append(info);
  if(chosen){const b=button('',()=>apply(chosen),'primary stationInstall');b.innerHTML='<span>이 위치에 설치</span><span class="routeCosts">'+tableCostHTML(chosen.cost)+'</span>';b.setAttribute?.('aria-label','선택한 위치에 우주 정거장 설치 · '+costText(chosen.cost));card.append(b);}
  card.append(button('위치 선택 취소',tableCancelStationSelection,'stationCancel'));
 }else card.append(button('지도에서 위치 선택',tableBeginStationSelection,'primary stationBegin'));
 return card;
}

function tableNevlasDoubled(p){return p?.factionId==='nevlas'&&p.structuresOnMap?.some(s=>s.structure==='planetary_institute');}
function tableNevlasPowerNote(p){if(p.factionId!=='nevlas')return '';return `<div class="nevlasPowerNote">${tableNevlasDoubled(p)?`행성 의회 · 토큰 1개 = 2파워<br>Ⅲ그릇 ${p.power?.bowl3??0}개로 ${(p.power?.bowl3??0)*2}파워 사용 가능`:'행성 의회 건설 후 토큰 1개를 2파워로 사용'}</div>`;}

function tableActionName(a){
 const leaf=finalAction(a),shipId=leaf.shipId??leaf.target?.shipId??(leaf.target?state?.map.hexes.find(h=>h.q===leaf.target.q&&h.r===leaf.target.r)?.shipId:null);
 const base=(leaf.displayName??ko(leaf.type)).split(' · ')[0];
 if(!shipId)return base;
 const ship=ko(shipId);
 return leaf.type==='explore_ship'?ship+' 탐사':base.includes(ship)?base:ship+' · '+base;
}
function tableRenderPassiveCharge(effect){
 const p=player(effect.playerId),basis=effect.structure;
 const card=document.createElement('div');card.className='passiveChargeSummary';
 card.innerHTML=`<div class="passiveChargeBasis">${basis?tableBuilding(basis.structure,p):''}<div><b>범위 안의 가장 높은 건물 기준</b><p>건물값 ${effect.offeredPower??0}${basis?' · '+esc(placeName(basis)):''}</p></div></div><div class="passiveChargeNumbers"><b>파워 ${effect.maxCharge} 충전</b><span>승점 ${effect.vpCost}점 지불</span></div>${effect.maxCharge<effect.offeredPower?'<p class="small">현재 파워 그릇과 보유 승점으로 받을 수 있는 충전량입니다.</p>':''}`;
 $('panel').append(card);
 $('panel').append(button('충전 수락',()=>resolveEffect(effect,{accept:true},true),'primary'),button('충전 거절',()=>resolveEffect(effect,{accept:false},true)));
}

let tableCommonBuildSpace=null;
function tableCommonUnavailableReason(def,p,routes,used){
 if(used)return title(player(used))+' 사용함';
 const power=require('power_spend').availableSpendPower(p);
 if((def.cost?.power??0)>power)return '파워 '+(def.cost.power-power)+' 부족';
 if((def.cost?.qic??0)>(p.resources.qic??0))return '정보 큐브 '+(def.cost.qic-(p.resources.qic??0))+' 부족';
 if(routes.length)return '';
 if(def.freeTerraformSteps){
  if((p.structuresRemaining?.mine??0)<=0)return '남은 광산 없음';
  const probe=structuredClone(state),rich=probe.players.find(x=>x.id===p.id);
  Object.assign(rich.resources,{credits:30,ore:15,qic:99});
  const candidates=require('legal_actions').listBuildMineActions({state:probe,playerId:p.id,freeTerraformSteps:def.freeTerraformSteps,threeStepPlanets:p.factionSpecific?.threeStepPlanets??[]});
  if(!candidates.length)return '건설 가능한 행성 없음';
  const gaps=candidates.map(a=>Object.entries(a.cost).filter(([k,v])=>v>(p.resources[k]??0)).map(([k,v])=>[k,v-(p.resources[k]??0)]));
  gaps.sort((a,b)=>a.reduce((n,[k,v])=>n+v*({credits:1,ore:2,qic:4}[k]??1),0)-b.reduce((n,[k,v])=>n+v*({credits:1,ore:2,qic:4}[k]??1),0));
  if(gaps[0]?.length)return '건설에 '+gaps[0].map(([k,v])=>ko(k)+' '+v).join('·')+' 부족';
  return '건설 조건 확인 필요';
 }
 if(def.requiresFederationToken&&!(p.federationTokens??[]).length)return '보유 연방 토큰 없음';
 return '현재 행동 조건 미충족';
}

function tableRenderCommonBoard(list){
 list.className='commonBoard';
 const p=player(state.round.currentPlayerId),defs=require('legal_actions').commonActionDefinitions(state);
 for(const def of defs){
  const routes=choices.filter(a=>a.type==='common_board_action'&&a.actionSpaceId===def.id);
  const used=state.globalBoards.actionSpaces?.find(s=>s.id===def.id)?.usedBy;
  const label=def.freeTerraformSteps?'테라포밍 '+def.freeTerraformSteps+'단계 · 건설':def.displayName.replace(/^(파워|정보 큐브) 행동: /,'');
  const b=button('',()=>{if(def.freeTerraformSteps){tableCommonBuildSpace=def.id;humanCategory='build';filter='';selectedHex=null;render();}else apply(routes[0]);},'commonBoardSlot');
  const gain=def.gain?Object.entries(def.gain).map(([k,v])=>metricIcon(k)+'<b>'+v+'</b>').join(''):def.gainPowerTokens?metricIcon('powerTokens')+'<b>'+def.gainPowerTokens+'</b>':def.freeTerraformSteps?metricIcon('terraforming')+'<b>'+def.freeTerraformSteps+'</b>':metricIcon('qic');
  const reason=tableCommonUnavailableReason(def,p,routes,used);
  b.disabled=Boolean(reason);b.title=reason;
  b.innerHTML=`<span class="commonBoardReward">${gain}</span><b class="commonBoardLabel">${esc(label)}</b><span class="commonBoardCost">${tableCostHTML(def.cost,p)}</span><small>${reason?esc(reason):def.freeTerraformSteps?'건설할 행성 선택':'사용하기'}</small>`;
  b.setAttribute?.('aria-label',label+' · '+(reason||'선택'));list.append(b);
 }
}

let tableScorePlayerId=null;
const tableScoreNumber=n=>Number.isInteger(Number(n))?String(Number(n)):String(Number(Number(n).toFixed(2)));
function tableFinalScoreData(){
 let result=state.finalScoringResult;
 if(!result?.players?.length){
  result=require('final_scoring').previewFinalScoring(state);
  if(state.finalScoringApplied||state.round.phase==='game_end')result={...result,players:result.players.map(r=>({...r,currentVp:r.currentVp-r.finalBonusVp,projectedTotalVp:r.currentVp}))};
 }
 const rows=result.players.map(r=>{const p=player(r.playerId),total=p.resources.vp;return {...r,p,total,adjustment:total-r.projectedTotalVp};}).sort((a,b)=>b.total-a.total);
 for(const r of rows)r.rank=1+rows.filter(x=>x.total>r.total).length;
 return {result,rows};
}
function tableFinalGoalFormula(tile,id){
 const own=tile.entries.find(e=>e.playerId===id);if(!own)return {label:'기록 없음',formula:'0점'};
 if(own.metric<=0)return {label:'기록 0',formula:'달성 기록 0 → 0점'};
 const eligible=[...tile.entries.filter(e=>e.metric>0)];
 if(tile.neutralMetric>0)eligible.push({metric:tile.neutralMetric,neutral:true});
 const above=eligible.filter(e=>e.metric>own.metric).length,tied=eligible.filter(e=>e.metric===own.metric).length;
 const slots=Array.from({length:tied},(_,i)=>[18,12,6,0][above+i]??0);
 return {label:'기록 '+tableScoreNumber(own.metric)+' · '+(tied>1?'공동 ':'')+(above+1)+'위',formula:tied>1?'('+slots.join(' + ')+') ÷ '+tied+' = '+tableScoreNumber(own.vp)+'점':(above+1)+'위 → '+tableScoreNumber(own.vp)+'점'};
}
function tableGameScoreAudit(r){
 const lines=[];
 for(const x of state.actionLog??[]){
  if(x.playerId!==r.playerId||x.uiHiddenInLog||x.actionType==='final_scoring_complete')continue;
  const before=tablePreviousStatus(x),after=x.statusAfter;
  if(!before||!after)continue;
  const delta=(after.resources?.vp??0)-(before.resources?.vp??0);if(!delta)continue;
  lines.push({round:x.round??'',label:x.uiVisual?actionTitle(x.uiVisual):tableDisplayText(x.displayName??ko(x.actionType)),delta});
 }
 const known=lines.reduce((n,x)=>n+x.delta,0),base=r.currentVp-known;
 return `<details class="scoreHistory"><summary>게임 중 점수 ${tableScoreNumber(r.currentVp)}점 · 획득/차감 기록</summary><div class="scoreHistoryRows"><div><span>시작·기록 이전 점수 및 보정</span><b>${tableScoreNumber(base)}점</b></div>${lines.map(x=>`<div><span><small>${esc(x.round)}라운드</small>${esc(x.label)}</span><b class="${x.delta<0?'scoreLoss':''}">${x.delta>0?'+':''}${tableScoreNumber(x.delta)}점</b></div>`).join('')}<p class="scoreEquation">${tableScoreNumber(base)} ${lines.map(x=>(x.delta>=0?'+ ':'− ')+tableScoreNumber(Math.abs(x.delta))).join(' ')} = <b>${tableScoreNumber(r.currentVp)}점</b></p></div></details>`;
}
function tableFinalScoreDetail(r,result){
 const research=(r.researchDetails??[]).map(d=>`<div class="scoreCalcRow"><span>${metricIcon(d.researchArea)}<b>${esc(ko(d.researchArea))}</b><small>${d.level}단계</small></span><strong>${d.level>=3?'('+d.level+' − 2) × 4':'점수 대상 0단계 × 4'} = ${tableScoreNumber(d.vp)}점</strong></div>`).join('');
 const goalRows=(r.tiles??[]).map(t=>{
  const tile=result.tiles?.find(x=>x.scoringId===t.scoringId),formula=tile?tableFinalGoalFormula(tile,r.playerId):{label:'기록 '+t.metric,formula:tableScoreNumber(t.vp)+'점'};
  const comparisons=tile?.entries.map(e=>`${esc(player(e.playerId)?.name??'플레이어')} ${tableScoreNumber(e.metric)}`).join(' · ');
  return `<div class="scoreGoal"><div class="scoreGoalArt">${componentPicture(t.scoringId,t.displayName)}</div><div><b>${esc(t.displayName)}</b><p>${esc(formula.label)}</p><strong>${esc(formula.formula)}</strong>${comparisons?`<small>${comparisons}${tile.neutralMetric!==null&&tile.neutralMetric!==undefined?' · 중립 '+tile.neutralMetric:''}</small>`:''}</div></div>`;
 }).join('');
 let resources=r.resourceDetails;
 if(!resources){const actual=r.p.resources;if(['credits','ore','knowledge'].reduce((n,k)=>n+(actual[k]??0),0)===r.remainingResources)resources=actual;}
 const resourceCounts=resources?`<div class="scoreResourceCounts">${['credits','ore','knowledge'].map(k=>`<span>${metricIcon(k)}${esc(ko(k))}<b>${resources[k]??0}</b></span>`).join('')}</div>`:'';
 const resourceEquation=resources?'('+['credits','ore','knowledge'].map(k=>resources[k]??0).join(' + ')+') ÷ 3':tableScoreNumber(r.remainingResources)+' ÷ 3';
 return `<section class="scorePlayerDetail"><div class="scoreDetailTitle"><span>${esc(r.p.name)} · ${esc(ko(r.p.factionId))}</span><b>점수 계산 상세</b></div><div class="scoreEquation scoreTotalEquation">게임 중 ${tableScoreNumber(r.currentVp)} + 목표 ${tableScoreNumber(r.tileVp)} + 연구 ${tableScoreNumber(r.researchVp)} + 자원 ${tableScoreNumber(r.resourceVp)}${r.adjustment?' + 보정 ('+tableScoreNumber(r.adjustment)+')':''} = <strong>${tableScoreNumber(r.total)}점</strong></div><div class="scoreDetailGrid"><section class="scoreSection"><h3>최종 목표 <b>+${tableScoreNumber(r.tileVp)}점</b></h3>${goalRows}<p class="scoreEquation">${(r.tiles??[]).map(t=>tableScoreNumber(t.vp)).join(' + ')||'0'} = <b>${tableScoreNumber(r.tileVp)}점</b></p></section><section class="scoreSection"><h3>연구 트랙 <b>+${tableScoreNumber(r.researchVp)}점</b></h3><p class="scoreHint">3단계부터 한 단계마다 4점</p>${research}<p class="scoreEquation">${(r.researchDetails??[]).map(d=>tableScoreNumber(d.vp)).join(' + ')} = <b>${tableScoreNumber(r.researchVp)}점</b></p></section><section class="scoreSection scoreResources"><h3>남은 자원 <b>+${tableScoreNumber(r.resourceVp)}점</b></h3>${resourceCounts}<p class="scoreEquation">⌊${resourceEquation}⌋ = <b>${tableScoreNumber(r.resourceVp)}점</b> <small>(소수점 버림)</small></p></section></div>${tableGameScoreAudit(r)}</section>`;
}
function tableRenderFinalScore(){
 const {result,rows}=tableFinalScoreData();if(!rows.length)return;
 if(!rows.some(r=>r.playerId===tableScorePlayerId))tableScorePlayerId=rows[0].playerId;
 const winners=rows.filter(r=>r.rank===1),box=document.createElement('div');box.className='finalResults';
 const crown='<svg viewBox="0 0 64 48" aria-hidden="true"><path d="M9 36 4 9l17 12L32 3l11 18L60 9l-5 27Z" fill="currentColor"/><path d="M10 43h44" stroke="currentColor" stroke-width="5" stroke-linecap="round"/></svg>';
 box.innerHTML=`<section class="winnerHero"><div class="winnerEmblem">${crown}<span>${winners.length>1?'공동 우승':'최종 우승'}</span></div><div class="winnerGroup">${winners.map(r=>`<div class="winnerIdentity">${tablePortrait(r.p)}<div><small>${esc(ko(r.p.factionId))}</small><h2>${esc(r.p.name)}</h2></div><div class="winnerScore"><strong>${tableScoreNumber(r.total)}</strong><span>점</span></div></div>`).join('')}</div></section>`;
 const board=document.createElement('div');board.className='scoreRanking';
 for(const r of rows){const b=button('',()=>{tableScorePlayerId=r.playerId;render();},'scoreRankCard '+(r.rank===1?'isWinner ':'')+(r.playerId===tableScorePlayerId?'selected':''));b.setAttribute?.('aria-label',r.p.name+' 점수 상세 보기');b.innerHTML=`<span class="scoreRankNumber">${r.rank}위</span><span class="scoreRankIdentity">${tablePortrait(r.p)}<b>${esc(r.p.name)}</b><small>${esc(ko(r.p.factionId))}</small></span><strong class="scoreRankTotal">${tableScoreNumber(r.total)}<small>점</small></strong><span class="scoreRankParts">게임 중 ${tableScoreNumber(r.currentVp)}<br>최종 보너스 +${tableScoreNumber(r.finalBonusVp)}${r.adjustment?'<br>보정 '+tableScoreNumber(r.adjustment):''}</span><span class="scoreRankSelect">${r.playerId===tableScorePlayerId?'상세 보는 중':'계산식 보기'}</span>`;board.append(b);}
 box.append(board);
 const detail=document.createElement('div');detail.innerHTML=tableFinalScoreDetail(rows.find(r=>r.playerId===tableScorePlayerId),result);box.append(detail);
 const map=document.createElement('details');map.className='scoreFinalMap';map.innerHTML='<summary>최종 은하 지도 보기</summary>'+renderBoard({selected:null});box.append(map);$('panel').append(box);
}
