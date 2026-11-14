'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('anime.html','utf8');
const extract=(start,end)=>{const a=html.indexOf(start),b=html.indexOf(end,a+1);assert.ok(a>=0&&b>a);return html.slice(a,b)};
class Element{
 constructor(tag='div'){this.tag=tag;this.children=[];this.dataset={};this.hidden=false;this.value='';this.textContent=''}
 append(...items){this.children.push(...items)}replaceChildren(...items){this.children=items}setAttribute(){}addEventListener(){}load(){}
}
const ids=['playerTitle','playerSubtitle','playerStage','playerNote','ownerLinkPanel','ownerEpisodeTarget','episodeWatchUrl','episodeVideoFile','episodeUploadMeta','uploadEpisodeVideo','hostedVideoResult','hostedVideoUrl','openHostedVideoUrl','removeEpisodeLink','ownerLinkStatus'];
const els=new Map(ids.map(id=>[id,new Element()]));
const cartoon={id:'bluey',kind:'cartoon',title:'Bluey',embedVideoId:'publisher-video',seasons:[{name:'Season 1',episodes:[{number:1,title:'Episode 1'}]}]};
const episode=cartoon.seasons[0].episodes[0],key=(id,season,number)=>[id,season,number].join(':');
const ctx={document:{createElement:tag=>new Element(tag),fullscreenElement:null},$:id=>els.get(id),episodeLinks:new Map(),watchLinkKey:key,selectedEpisode:null,youtubePlayer:null,youtubeRender:0,cartoonAutoPlay:true,setTimeout,clearTimeout,URL,location:{origin:'https://example.test'},getB2PlaybackUrl:async url=>url};
vm.createContext(ctx);
vm.runInContext(extract('function updateOwnerEditor(', ' async function loadEpisodeLinks('),ctx);
vm.runInContext(extract(' function renderPlayer(', ' function seriesProgress('),ctx);
ctx.episodeLinks.set(key('bluey',0,1),{provider:'B2 Storage',watch_url:'https://media.example/video'});
ctx.renderPlayer(cartoon,0,episode);
assert.equal(ctx.selectedEpisode.seriesId,'bluey','Cartoons must be selectable for owner uploads.');
assert.equal(els.get('ownerLinkPanel').hidden,false);
assert.equal(els.get('playerStage').children[0].className,'watch-video-stage','Hosted video must take priority over the publisher embed.');
ctx.episodeLinks.clear();
const guide={...cartoon,embedVideoId:null,episodeGuideUrl:'https://publisher.example/episodes'};
ctx.renderPlayer(guide,0,episode);
assert.equal(els.get('playerStage').children[0].className,'watch-player-placeholder','Publisher guide remains available when no upload exists.');
console.log('Watch player passed: cartoons accept uploads, hosted video takes priority and the official fallback remains.');
