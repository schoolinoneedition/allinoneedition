'use strict';
/* Builds an offline-capable NEON EXPRESS game package for technical portal review.
 * Needs: npm install --prefix portal/neon-express
 * Does not publish, integrate ads, create a payout account, or contact a portal.
 */
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const out=path.join(root,'dist','neon-express-portal');
const engineDir=path.join(root,'portal','neon-express','node_modules');
async function build(){
 let esbuild;
 try{esbuild=require(path.join(engineDir,'esbuild'))}
 catch{throw Error('Install the pinned build dependencies first: npm install --prefix portal/neon-express');}
 fs.mkdirSync(out,{recursive:true});
 await esbuild.build({
  entryPoints:[path.join(root,'games','neon-express','game.js')],
  bundle:true,
  format:'esm',
  platform:'browser',
  target:['es2022'],
  outfile:path.join(out,'game.js'),
  nodePaths:[engineDir],
  minify:true,
  sourcemap:false,
  legalComments:'none',
  logLevel:'warning'
 });
 let html=fs.readFileSync(path.join(root,'games','neon-express.html'),'utf8');
 const replace=(a,b,label)=>{assert.equal(html.split(a).length-1,1,'Expected one '+label);html=html.replace(a,b)};
 replace('<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.187.0/build/three.module.js"}}</script>','','import map');
 replace('<script>window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments);};</script>','','analytics queue');
 replace('<script defer src="/_vercel/insights/script.js"></script>','','analytics loader');
 replace('<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4571610192955651" crossorigin="anonymous"></script>','','AdSense verification');
 replace('<script type="module" src="/games/neon-express/game.js"></script>','<script type="module" src="./game.js"></script>','source module');
 replace('<a href="/browser-games" class="ghost">All games</a>','<span class="ghost">Original 3D arcade</span>','AIO navigation');
 replace('<a href="/privacy">Privacy</a>','<span>Standalone 3D game</span>','privacy link');
 replace('<link rel="canonical" href="https://allinoneedition.vercel.app/games/neon-express">','','AIO canonical URL');
 replace('<meta property="og:url" content="https://allinoneedition.vercel.app/games/neon-express">','','AIO OG URL');
 // A hosting portal owns its ad placements. The standalone build is entirely
 // neutral until the game is approved and its real SDK has been integrated.
 assert.doesNotMatch(html,/(adsbygoogle|_vercel\/insights|cdn\.jsdelivr\.net|<script[^>]+src="https?:)/i);
 const javascript=fs.readFileSync(path.join(out,'game.js'),'utf8');
 assert.ok(javascript.length>120000,'The bundle must include the local Three.js engine.');
 assert.doesNotMatch(javascript,/https:\/\/cdn\.jsdelivr\.net\/npm\/three/i);
 fs.writeFileSync(path.join(out,'index.html'),html);
 const threeLicense=fs.readFileSync(path.join(engineDir,'three','LICENSE'),'utf8');
 fs.writeFileSync(path.join(out,'THIRD_PARTY_NOTICES.txt'),'Three.js 3D engine — MIT license\n\n'+threeLicense);
 fs.writeFileSync(path.join(out,'README.txt'),[
  'NEON EXPRESS - Original 3D WebGL technical review build',
  '',
  'Start: index.html + game.js together in the same folder.',
  'You can host these as static files over HTTPS or serve locally.',
  'Controls: left/right or A/D to change lanes, mobile touch buttons,',
  'P to pause, optional audio toggle, restart after completing the run.',
  '',
  'Uses the Three.js 3D engine bundled under its MIT license.',
  'All original game logic and procedural 3D artwork belong to AIO.',
  'No external network, accounts, ads, analytics or gameplay API needed.',
  '',
  'This is NOT a portal-approved game. Portal SDK calls and ad controls',
  'must be implemented only after acceptance and on the platform terms.',
  'Do not inject Google AdSense into the hosted portal copy.',
  'Eligible adult/guardian account owner must manage any application,',
  'identity verification, agreements, payments and tax matters.',
  'There is no guarantee of acceptance, audience or advertising revenue.',
  ''
 ].join('\n'));
 console.log('Standalone 3D review build ready: dist/neon-express-portal');
}
build().catch(error=>{console.error(error);process.exitCode=1});
