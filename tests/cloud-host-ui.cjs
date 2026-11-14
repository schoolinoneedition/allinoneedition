'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('cloud-host-ui.js','utf8');
class Node{
 constructor(tag){this.tag=tag;this.children=[];this.listeners={};this.dataset={};this.textContent='';this.hidden=false;}
 append(...nodes){this.children.push(...nodes)}
 setAttribute(k,v){this[k]=v}
 addEventListener(k,fn){this.listeners[k]=fn}
 before(node){this.insertedBefore=node}
 querySelector(selector){return selector==='.aio-cloud-grid'?this.grid:null}
}
async function main(){
 const root=new Node('section'),grid=new Node('div');root.grid=grid;
 const site={document:{getElementById:id=>id==='cloud-gaming'?root:null,createElement:tag=>new Node(tag)},window:null,AbortController,clearTimeout,setTimeout};
 site.window=site;
 site.fetch=async()=>({ok:true,json:async()=>({state:'not_configured',sessionAvailable:false})});
 vm.runInNewContext(source,site);
 await new Promise(resolve=>setImmediate(resolve));
 const panel=grid.insertedBefore;
 assert.ok(panel,'GPU preflight should mount in existing cloud section');
 const header=panel.children[0],button=header.children[1],status=panel.children[1];
 assert.equal(status.dataset.cloudState,'not_configured');
 assert.match(status.textContent,/No dedicated GPU host connected/);
 assert.equal(button.disabled,false);
 site.fetch=async()=>({ok:true,json:async()=>({state:'host_online',gpuDetected:true,sessionAvailable:false})});
 await button.listeners.click();
 assert.match(status.textContent,/secure playable session has not been connected/);
 assert.equal(status.dataset.cloudState,'host_online');
 site.fetch=async()=>{throw Error('offline')};
 await button.listeners.click();
 assert.match(status.textContent,/Unable to check/);
 assert.equal(status.dataset.cloudState,'check_error');
 assert.doesNotMatch(source,/\bpassword\s*=|document\.cookie|window\.open\(/i,'No remote user credentials or redirect flow');
 console.log('Cloud host panel passed: no host, GPU reachable but not playable, error recovery, no sign-in capture.');
}
main().catch(error=>{console.error(error);process.exitCode=1});
