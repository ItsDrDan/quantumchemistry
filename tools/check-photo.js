#!/usr/bin/env node
/* Photoelectric Bench checks: runs the PEB-LOGIC block of index.html in Node and checks every
   bench setup against photon physics written independently here.
   Usage: node tools/check-photo.js [draws per family] (default 3000) */
const fs=require('fs'),vm=require('vm'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const a=src.indexOf('/*PEB-LOGIC-START'),b=src.indexOf('/*PEB-LOGIC-END*/');
const ctx={Math,Number,String,Object,Array,JSON,console};vm.createContext(ctx);
vm.runInContext(src.slice(a,b)+'\nthis.pebSpec=pebSpec;this.pebState=pebState;this.PEB_METALS=PEB_METALS;',ctx);
/* independent constants (CODATA, rounded): E(eV) = 1239.84 / λ(nm) */
const hc_eVnm=1239.84,eV=1.602177e-19;
const N=+process.argv[2]||3000;let fails=0,checks=0;const ok=(c,m)=>{checks++;if(!c){fails++;if(fails<30)console.log('FAIL',m)}};
/* the game's own bank uses these metals; the bench must match */
const bankMetals=[['sodium',2.28],['potassium',2.30],['calcium',2.87],['zinc',4.33],['silver',4.26],['cesium',2.14]];
ok(JSON.stringify(ctx.PEB_METALS)===JSON.stringify(bankMetals),'metal list differs from the game bank');
for(const fam of ['dimBelow','dimAbove','wave'])for(let r=0;r<N;r++){const s=ctx.pebSpec(fam),tag=fam+' '+s.metal+' '+JSON.stringify(s.start)+'→'+s.key+'='+s.target;
 const E=nm=>hc_eVnm/nm,on=(nm)=>E(nm)>s.phi;
 ok(s.start.nm>=200&&s.start.nm<=700&&s.start.nm%10===0,tag+': start wavelength off the slider');
 if(s.key==='nm')ok(s.target>=200&&s.target<=700&&s.target%10===0&&s.target<s.start.nm,tag+': target wavelength off the slider');else ok(s.target===5&&s.start.I===1,tag+': brightness move');
 const end={...s.start,[s.key]:s.target};
 /* state agrees with independent physics, within constant rounding (0.1%) */
 for(const [st,model] of [[s.start,s.a],[end,s.b]]){ok(Math.abs(model.E-E(st.nm))<E(st.nm)*1e-3,tag+': photon energy');ok(model.on===on(st.nm),tag+': emission yes/no');ok(Math.abs(model.ke-(model.on?E(st.nm)-s.phi:0))<.01,tag+': KEmax');ok(model.rate===(model.on?st.I*20:0),tag+': electron rate');}
 /* margins: never within 0.15 eV of the threshold, so constant choices can't flip the answer */
 ok(Math.abs(E(s.start.nm)-s.phi)>.15&&Math.abs(E(end.nm)-s.phi)>.15,tag+': too close to threshold');
 if(fam==='dimBelow')ok(!s.a.on&&!s.b.on&&s.predict.answer==='none',tag+': below threshold stays dark');
 if(fam==='dimAbove')ok(s.a.on&&s.b.on&&s.b.rate>s.a.rate&&Math.abs(s.b.ke-s.a.ke)<1e-12&&s.predict.answer==='more',tag+': brighter = more electrons, same KEmax');
 if(fam==='wave'){ok(s.b.on&&s.b.ke>s.a.ke,tag+': shorter wavelength raises KEmax');ok(s.predict.answer===(s.a.on?'faster':'start'),tag+': wave prediction');}
 ok(s.predict.opts.some(o=>o[0]===s.predict.answer)&&s.predict.opts.length>=3,tag+': prediction options');
 ok(s.explain.opts.some(o=>o[0]===s.explain.answer)&&s.explain.opts.filter(o=>o[0]!==s.explain.answer).every(o=>s.explain.why[o[0]]),tag+': explain feedback');
 /* apply */
 const ap=s.apply;
 if(fam==='dimBelow'){ok(ap.unit==='nm'&&Math.abs(ap.value-hc_eVnm/s.phi)<hc_eVnm/s.phi*.003,tag+': threshold wavelength '+ap.value);}
 else{const nm=fam==='wave'?s.target:s.start.nm,want=(E(nm)-s.phi)*eV;ok(ap.unit==='J'&&Math.abs(ap.value-want)<Math.abs(want)*.01&&ap.value>0,tag+': KEmax in J '+ap.value+' vs '+want);}
 ok(!/NaN|undefined|Infinity/.test(JSON.stringify(s)),tag+': junk text');}
console.log(checks+' checks on '+3*N+' bench setups: '+(fails?fails+' FAILED':'all passed'));process.exit(fails?1:0);
