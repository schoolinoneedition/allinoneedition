/* Isolated single-file HTML games. Never run uploaded code in the parent page.
   A CSP and opaque-origin iframe are REQUIRED together. */
(function(global){
 'use strict';
 const MAX_BYTES=524288;
 const PREFIX='aio-html:';
 const ID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 const CSP=[
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  "img-src data: blob:",
  "font-src data:",
  "media-src data: blob:",
  "connect-src 'none'",
  "frame-src 'none'",
  "worker-src 'none'",
  "object-src 'none'",
  "form-action 'none'",
  "base-uri 'none'"
 ].join('; ');
 function extractId(url){
  const raw=String(url||'');
  const id=raw.startsWith(PREFIX)?raw.slice(PREFIX.length):'';
  return ID_RE.test(id)?id:null;
 }
 function renderDocument(html){
  if(typeof html!=='string')throw Error('Game file is unavailable.');
  if(new TextEncoder().encode(html).byteLength>MAX_BYTES)throw Error('This HTML game exceeds the 512 KB limit.');
  const doc=new DOMParser().parseFromString(html,'text/html');
  // Remove attacker-supplied base tags and CSP meta tags before setting ours first.
  doc.querySelectorAll('base, meta[http-equiv="Content-Security-Policy" i]').forEach(el=>el.remove());
  const meta=doc.createElement('meta');
  meta.setAttribute('http-equiv','Content-Security-Policy');
  meta.setAttribute('content',CSP);
  doc.head.prepend(meta);
  return '<!doctype html>\n'+doc.documentElement.outerHTML;
 }
 function loadIntoFrame(frame,html){
  if(!frame)throw Error('The game player is unavailable.');
  frame.setAttribute('sandbox','allow-scripts allow-pointer-lock');
  frame.setAttribute('referrerpolicy','no-referrer');
  frame.removeAttribute('src');
  frame.srcdoc=renderDocument(html);
 }
 function clearFrame(frame){
  if(!frame)return;
  frame.removeAttribute('srcdoc');
  frame.removeAttribute('sandbox');
  frame.setAttribute('referrerpolicy','no-referrer-when-downgrade');
 }
 global.AioHtmlGameSandbox=Object.freeze({MAX_BYTES,PREFIX,extractId,renderDocument,loadIntoFrame,clearFrame});
})(window);
