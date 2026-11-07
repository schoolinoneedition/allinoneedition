const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const source = fs.readFileSync("extensions/elementor-browser-bridge/background.js", "utf8");
let listener, enabled = true, allowed = new Set(["https://example.com/*"]);
const tabs = [
  {id:1,url:"https://example.com/page",title:"Example",active:true},
  {id:2,url:"chrome://settings",title:"Settings",active:false},
  {id:3,url:"https://allinoneedition.vercel.app/elementor",title:"Elementor",active:false}
];
const chrome = {
  storage:{local:{get:async()=>({enabled})}},
  runtime:{onMessage:{addListener:fn=>{listener=fn;}},lastError:null},
  permissions:{contains:async({origins})=>origins.every(x=>allowed.has(x))},
  tabs:{
    query:async()=>tabs,
    get:async id=>tabs.find(t=>t.id===id),
    create:async({url})=>({id:4,url}),
    update:async()=>({}),
    captureVisibleTab:async()=>"data:image/png;base64,c2NyZWVu"
  },
  scripting:{executeScript:async()=>[{result:{title:"Example",url:"https://example.com/page",text:"Safe page"}}]}
};
vm.runInNewContext(source,{chrome,URL,Set,Map,Number,String,Error,Promise,console});
function call(command){return new Promise(resolve=>{const keep=listener({type:"ELEMENTOR_BRIDGE_COMMAND",command},{},resolve);assert.equal(keep,true);});}
(async()=>{
  enabled=false;
  let r=await call({action:"status"});
  assert.equal(r.ok,false,"disabled bridge must reject every command");
  enabled=true;
  r=await call({action:"status"});
  assert.equal(r.ok,true);
  r=await call({action:"tabs"});
  assert.deepEqual(r.result.map(t=>t.id),[1],"tab list must exclude browser-internal pages and Elementor");
  r=await call({action:"open",url:"https://unapproved.test"});
  assert.equal(r.ok,false,"opening a site without explicit host permission must fail");
  r=await call({action:"open",url:"javascript:alert(1)"});
  assert.equal(r.ok,false,"non-HTTP protocols must be rejected");
  r=await call({action:"inspect",tabId:1});
  assert.equal(r.result.title,"Example");
  r=await call({action:"screenshot",tabId:1});
  assert.equal(r.result.dataUrl,"data:image/png;base64,c2NyZWVu","screenshot action must return the visible tab capture");
  r=await call({action:"type",tabId:1,selector:"input[name=q]",text:"my password"});
  assert.equal(r.ok,false,"sensitive strings must be blocked");
  console.log("Elementor Browser Bridge tests passed: permission gate, safe tab filtering, URL protocol, host permissions, page inspection, screenshot capture and sensitive-input blocking.");
})().catch(e=>{console.error(e);process.exitCode=1;});
