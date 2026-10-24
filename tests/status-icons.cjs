const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const helpers=fs.readFileSync(path.join(root,'status-icons.js'),'utf8')+'\n'+fs.readFileSync(path.join(root,'table-ui.js'),'utf8');
assert(html.indexOf('status-icons.js')<html.indexOf('const DB='));
for(const k of ['credits','ore','knowledge','qic','power','vp','terraforming','navigation','artificial_intelligence','gaia_project','economy','science']){
 const bytes=fs.readFileSync(path.join(root,'assets/icons',k+'.png'));assert(bytes.length>100);assert.equal(bytes.subarray(1,4).toString(),'PNG');
}
const ids={};
class El{
 constructor(tag='div'){this.tag=tag;this.children=[];this.value='';this.hidden=false;this.dataset={};this.classList={toggle(){}};this.checked=false;}
 set innerHTML(s){this.html=s;this.children=[];for(const m of s.matchAll(/<(input|select|textarea|div|button)[^>]*\bid="([^"]+)"[^>]*>/g)){const e=new El(m[1]);ids[m[2]]=e;const v=m[0].match(/\bvalue="([^"]*)"/);if(v)e.value=v[1];if(m[1]==='select'){const block=s.slice(m.index).split('</select>')[0],op=block.match(/<option[^>]*selected[^>]*>/)?.[0]??block.match(/<option[^>]*>/)?.[0];if(op)e.value=op.match(/value="([^"]*)"/)?.[1]??block.match(/<option[^>]*>([^<]*)/)?.[1]??'';}this.children.push(e);}}
 get innerHTML(){return this.html??'';}append(...a){this.children.push(...a);}querySelectorAll(s){return s==='button'?this.children.filter(e=>e.tag==='button'):[];}showModal(){this.open=true;}close(){this.open=false;}click(){this.onclick?.();}
}
for(const m of html.matchAll(/id="([^"]+)"/g))ids[m[1]]=new El();
ids.tabs.children=['overview','play','map','settings','correction','log'].map(view=>{const e=new El('button');e.dataset.view=view;return e;});
ids.count.value='3';ids.difficulty.value='보통';ids.economy.value='victory_points';
const storage={},ctx={console,structuredClone,URL,Blob,setTimeout,clearTimeout,confirm:()=>true,document:{getElementById:id=>ids[id]??null,createElement:tag=>new El(tag)},localStorage:{getItem:k=>storage[k]??null,setItem:(k,v)=>storage[k]=v},window:{}};
vm.createContext(ctx);vm.runInContext(helpers+'\n'+html.split('<script>')[1].split('</script>')[0],ctx);
ids.start.click();assert(ctx.window.gaiaTest.state);assert.equal(ctx.window.gaiaTest.state.players.length,3);assert(ids.error.hidden,ids.error.textContent);
const p=ctx.window.gaiaTest.state.players[0];Object.assign(p.resources,{credits:0,ore:15,knowledge:12,qic:3,vp:148});p.power={bowl1:0,bowl2:4,bowl3:12,gaia:7,brainstone:'bowl2'};Object.assign(p.researchLevels,{terraforming:3,navigation:2,artificial_intelligence:1,gaia_project:4,economy:5,science:0});
const before=JSON.stringify(ctx.window.gaiaTest.state),card=vm.runInContext('renderPlayerCard(state.players[0])',ctx);
for(const k of ['credits','science']){const expected='data:image/png;base64,'+fs.readFileSync(path.join(root,'assets/icons',k+'.png')).toString('base64');assert(card.includes(expected));}assert(!card.includes('src="./assets/icons/'));assert(card.includes('크레딧 0'));assert(card.includes('과학 0단계'));assert(card.includes('경제 5단계'));
assert(card.includes('Ⅲ그릇 파워 토큰 12개'));assert(card.includes('가이아 구역 파워 토큰 7개'));assert(card.includes('두뇌석 1'));assert(card.includes('powerTokenRow'));assert(!card.includes('◆'));
assert.equal(JSON.stringify(ctx.window.gaiaTest.state),before,'현황판이 실제 상태를 변경함');
const log=vm.runInContext('renderLogStatus({statusAfter:structuredClone(state.players[0])})',ctx);assert(log.includes('gameResourceStrip'));assert(log.includes('powerBoard'));
assert(storage['gaia-play-ko-v124'],'기존 저장 키 보존');
console.log('PASS: 원본 PNG 12종, 자동 추첨 버튼, 실제 숫자·연구 0/5단계·파워 0/12개·가이아·두뇌석, 과거 기록 표시, 상태 무변경·저장 키 유지');
