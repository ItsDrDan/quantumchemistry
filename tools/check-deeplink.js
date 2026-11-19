#!/usr/bin/env node
/* Deep-link checks: loads index.html?… in Chromium at phone and desktop sizes and checks that each
   link opens the right topic with no console errors, and that the plain URL still opens the normal start.
   Needs Playwright: NODE_PATH=/path/to/node_modules node tools/check-deeplink.js
   Links: ?course=1A&mode=light&bench=1 (Photoelectric Bench, every question), ?mode=orbitals (Orbital builder) */
const {chromium}=require('playwright'),path=require('path'),{pathToFileURL}=require('url');
const base=pathToFileURL(path.join(__dirname,'..','index.html')).href;
const SIZES={phone:{viewport:{width:390,height:844},hasTouch:true,isMobile:true},desktop:{viewport:{width:1280,height:900}}};
const vis=(p,sel)=>p.locator(sel).first().isVisible();
const CASES=[
 ['?course=1A&mode=light&bench=1',async p=>{const out=[];for(let i=0;i<4;i++){if(i)await p.click('#new');if(!await vis(p,'.peb-svg'))out.push('question '+(i+1)+' is not a bench');}
   if(!await p.locator('[data-mode=light].active').count())out.push('Light & photons not active');return out;}],
 ['?course=1A&mode=light',async p=>await vis(p,'.peb-svg')?[]:['first light question is not a bench']],
 ['?course=3A&mode=light&bench=1',async p=>(await p.locator('.peb-svg').count())?['bench shown in CHEM 3A']:[]],
 ['?mode=orbitals',async p=>{const out=[];if(!await p.locator('[data-mode=orbitals].active').count())out.push('Orbital builder not active');
   if(await p.evaluate(()=>state.mode)!=='orbitals')out.push('state.mode is not orbitals');if(!/orbital/i.test(await p.textContent('#mission')))out.push('mission is not orbitals');
   if(!await vis(p,'#question'))out.push('question not visible');return out;}],
 ['?course=3A&mode=orbitals',async p=>await p.evaluate(()=>state.mode+course)==='orbitals3A'?[]:['3A orbitals did not open']],
 ['?mode=nonsense',async p=>await p.evaluate(()=>state.mode)==='light'?[]:['bad mode changed the start']],
 ['',async p=>{const out=[];if(await p.evaluate(()=>state.mode)!=='light')out.push('plain URL does not start on Light & photons');
   if(await p.evaluate(()=>scrollY)>0)out.push('plain URL scrolled the page');return out;}],
];
(async()=>{const b=await chromium.launch();let fails=0,n=0;
 for(const [size,opts] of Object.entries(SIZES))for(const [q,test] of CASES){const ctx=await b.newContext(opts),p=await ctx.newPage(),errs=[];
  p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});p.on('pageerror',e=>errs.push(e.message));
  await p.goto(base+q);await p.waitForTimeout(600);const out=[...await test(p),...errs.map(e=>'console: '+e)];n++;
  if(out.length){fails++;console.log('FAIL',size,q||'(plain)',out.join('; '));}await ctx.close();}
 await b.close();console.log(n+' deep-link checks: '+(fails?fails+' FAILED':'all passed'));process.exit(fails?1:0);})();
