'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto').webcrypto;
const source=fs.readFileSync('party-gaming.js','utf8');
const wait=()=>new Promise(resolve=>setTimeout(resolve,15));
class RoomServer{
 constructor(){this.channels=[]}
 channel(topic,config){const ch={topic,key:config.config.presence.key,handlers:[],server:this,joined:false,data:null,
  on(type,filter,cb){this.handlers.push({type,event:filter.event,cb});return this},
  subscribe(cb){this.joined=true;this.server.channels.push(this);queueMicrotask(()=>cb('SUBSCRIBED'));return this},
  presenceState(){const out={};for(const c of this.server.channels)if(c.joined&&c.topic===this.topic&&c.data)out[c.key]=[c.data];return out},
  async track(data){this.data=data;this.server.sync(this.topic);return 'ok'},
  async send(message){for(const c of this.server.channels)if(c!==this&&c.joined&&c.topic===this.topic)for(const h of c.handlers)if(h.type==='broadcast'&&h.event===message.event)queueMicrotask(()=>h.cb({payload:message.payload}));return 'ok'}
 };return ch}
 sync(topic){for(const c of this.channels)if(c.joined&&c.topic===topic)for(const h of c.handlers)if(h.type==='presence')queueMicrotask(()=>h.cb())}
 remove(c){c.joined=false;this.sync(c.topic);return Promise.resolve()}
}
class FakePeer{
 constructor(){this.localDescription=null;this.remoteDescription=null;this.connectionState='new';this.closed=false}
 addTrack(){} async createOffer(){return{type:'offer',sdp:'offer'}}async createAnswer(){return{type:'answer',sdp:'answer'}}
 async setLocalDescription(d){this.localDescription=d;if(this.onicecandidate)this.onicecandidate({candidate:{candidate:'candidate'}})}
 async setRemoteDescription(d){this.remoteDescription=d;if(d.type==='offer')queueMicrotask(()=>this.ontrack?.({streams:[{id:'remote-stream'}]}))}
 async addIceCandidate(){}close(){this.closed=true;this.connectionState='closed'}
}
function client(server,display){
 const els=new Map();
 class Element{
  constructor(tag='div'){this.tagName=tag;this.children=[];this.value='';this.textContent='';this.dataset={};this.classList={add(){},remove(){},contains:()=>true};this.listeners={};this.parent=null;this.hidden=false}
  append(...children){children.forEach(c=>this.appendChild(c))}appendChild(c){c.parent=this;this.children.push(c);return c}
  replaceChildren(...children){this.children=[];this.append(...children)}setAttribute(){}addEventListener(event,cb){this.listeners[event]=cb}
  querySelector(tag){return this.children.find(x=>x.tagName===tag)||null}getContext(){return{drawImage(){}}}play(){return Promise.resolve()}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this)}
 }
 for(const id of ['partyGuestName','partyJoinCode','partyWorkspaceJoinCode','partyPanel','partyCode','partyWorkspaceCode','partyWorkspaceStatus','partyLiveControls','partyMembers','partyWorkspaceMembers','partyStreams','partyShareStatus','partyShareButton','gameModal'])els.set(id,new Element());
 els.get('partyGuestName').value=display;
 const document={getElementById:id=>els.get(id)||find(id),createElement:tag=>new Element(tag)};
 function find(id){function walk(node){if(node.id===id)return node;for(const c of node.children){const result=walk(c);if(result)return result}return null}for(const el of els.values()){const item=walk(el);if(item)return item}return null}
 const track={kind:'video',stop(){this.stopped=true}};const captured={getTracks:()=>[track],getVideoTracks:()=>[track]};
 const ctx={console,crypto,document,URL,URLSearchParams,location:{href:'https://example.test/',hash:''},setTimeout,clearTimeout,setInterval,clearInterval,queueMicrotask,RTCPeerConnection:FakePeer,navigator:{mediaDevices:{getDisplayMedia:async()=>captured},clipboard:{writeText:async()=>{}}},localStorage:{getItem:()=>null,setItem(){}},addEventListener(){},showToast(){},scrollToId(){},
  currentUser:null,currentProfile:null,currentParty:null,currentGame:null,meetingChannel:null,communityChannels:new Map(),GAMES:[{name:'Reel League',url:'reel'}],gameKey:g=>g.url,
  createParty:async()=>{},joinPartyByCode:async()=>{},leaveParty:async()=>{},renderPartyWorkspaceMembers:async()=>{},loadPartyMembers:async()=>{},openMeeting:async()=>{},openGame(i){ctx.currentGame=ctx.GAMES[i]},closeGame(){ctx.currentGame=null},receiveRemoteStroke(){},clearCanvasLocal(){},closeMeeting(){},supabaseClient:{channel:(topic,config)=>server.channel(topic,config),removeChannel:c=>server.remove(c)}};
 ctx.$=id=>els.get(id);ctx.window=ctx;vm.createContext(ctx);vm.runInContext(source,ctx);return{ctx,els,track};
}
function allText(node){return [node.textContent,...node.children.map(allText)].join(' ')}
(async()=>{
 const server=new RoomServer(),host=client(server,'Host'),guest=client(server,'Guest');
 await host.ctx.createParty();await wait();const code=host.ctx.currentParty.code;assert.equal(code.length,20);
 await host.ctx.togglePartyShare();assert.equal(host.els.get('partyShareButton').textContent,'Stop sharing');
 guest.els.get('partyWorkspaceJoinCode').value=code;await guest.ctx.joinPartyByCode();await wait();await wait();
 assert.match(allText(host.els.get('partyWorkspaceMembers')),/Guest/);assert.match(allText(guest.els.get('partyWorkspaceMembers')),/Host/);
 host.ctx.openGame(0);await wait();assert.match(allText(guest.els.get('partyWorkspaceMembers')),/Playing Reel League/);
 assert.equal(guest.els.get('partyStreams').children.length,1,'A late guest should receive a screen offer');
 await host.ctx.togglePartyShare();await wait();assert.equal(guest.els.get('partyStreams').children.length,0);assert.equal(host.track.stopped,true);
 await guest.ctx.leaveParty();await wait();assert.equal(host.els.get('partyWorkspaceMembers').children.length,1);
 console.log('Party flow passed: guest joins, game status syncs, late guest receives share, stop and leave clean up.');
})().catch(error=>{console.error(error);process.exitCode=1});
