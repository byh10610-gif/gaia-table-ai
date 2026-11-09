const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
function loadEngine(seed=1) {
  const root=path.resolve(__dirname,'..');
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const script=html.split('<script>')[1].split('</script>')[0].split('const VISUAL_ASSETS=')[0];
  let n=seed>>>0;
  const math=Object.create(Math); math.random=()=>((n=(n*1664525+1013904223)>>>0)/4294967296);
  const ctx={structuredClone,console,Math:math};vm.createContext(ctx);
  vm.runInContext(script+'\nthis.engine={require,DB,modules:__mods};',ctx);
  return ctx.engine;
}
module.exports={loadEngine};
