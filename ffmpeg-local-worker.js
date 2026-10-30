/* Same-origin FFmpeg.wasm 0.12.15 module worker.
   Adapted from the upstream FFmpeg.wasm worker source. */
import { CORE_URL, FFMessageType } from "./ffmpeg-local-const.js";
import {
  ERROR_UNKNOWN_MESSAGE_TYPE,
  ERROR_NOT_LOADED,
  ERROR_IMPORT_FAILURE
} from "./ffmpeg-local-errors.js";

let ffmpeg;

async function load(config={}) {
  let coreURL=config.coreURL||CORE_URL;
  const wasmURL=config.wasmURL||coreURL.replace(/\.js$/i,".wasm");
  const workerURL=config.workerURL||coreURL.replace(/\.js$/i,".worker.js");
  let createCore;
  try {
    // Module workers do not expose importScripts; dynamically import the
    // ESM FFmpeg core instead. The caller supplies blob URLs to satisfy CORS.
    if (typeof importScripts === "function") {
      try { importScripts(coreURL); } catch {}
    }
    createCore=self.createFFmpegCore;
    if (!createCore) {
      const coreModule=await import(/* @vite-ignore */ coreURL);
      createCore=coreModule.default||self.createFFmpegCore;
    }
    if (typeof createCore!=="function") throw ERROR_IMPORT_FAILURE;
  } catch (error) {
    throw new Error("Could not import the FFmpeg ESM core: "+String(error?.message||error));
  }
  ffmpeg=await createCore({
    mainScriptUrlOrBlob:coreURL+"#"+btoa(JSON.stringify({wasmURL,workerURL}))
  });
  ffmpeg.setLogger(data=>self.postMessage({type:FFMessageType.LOG,data}));
  ffmpeg.setProgress(data=>self.postMessage({type:FFMessageType.PROGRESS,data}));
  return true;
}

function exec({args,timeout=-1}) {
  ffmpeg.setTimeout(timeout);ffmpeg.exec(...args);
  const code=ffmpeg.ret;ffmpeg.reset();return code;
}
function ffprobe({args,timeout=-1}) {
  ffmpeg.setTimeout(timeout);ffmpeg.ffprobe(...args);
  const code=ffmpeg.ret;ffmpeg.reset();return code;
}
function writeFile({path,data}) { ffmpeg.FS.writeFile(path,data);return true; }
function readFile({path,encoding}) { return ffmpeg.FS.readFile(path,{encoding}); }
function deleteFile({path}) { ffmpeg.FS.unlink(path);return true; }
function rename({oldPath,newPath}) { ffmpeg.FS.rename(oldPath,newPath);return true; }
function createDir({path}) { ffmpeg.FS.mkdir(path);return true; }
function listDir({path}) {
  return ffmpeg.FS.readdir(path).map(name=>{
    const stat=ffmpeg.FS.stat(path+"/"+name);
    return {name,isDir:ffmpeg.FS.isDir(stat.mode)};
  });
}
function deleteDir({path}) { ffmpeg.FS.rmdir(path);return true; }
function mount({fsType,options,mountPoint}) {
  const filesystem=ffmpeg.FS.filesystems[fsType];
  if(!filesystem)return false;
  ffmpeg.FS.mount(filesystem,options,mountPoint);return true;
}
function unmount({mountPoint}) { ffmpeg.FS.unmount(mountPoint);return true; }

self.onmessage=async event=>{
  const {id,type,data}=event.data||{};
  let result;
  try {
    if(type!==FFMessageType.LOAD&&!ffmpeg)throw ERROR_NOT_LOADED;
    switch(type){
      case FFMessageType.LOAD: result=await load(data||{});break;
      case FFMessageType.EXEC: result=exec(data||{});break;
      case FFMessageType.FFPROBE: result=ffprobe(data||{});break;
      case FFMessageType.WRITE_FILE: result=writeFile(data||{});break;
      case FFMessageType.READ_FILE: result=readFile(data||{});break;
      case FFMessageType.DELETE_FILE: result=deleteFile(data||{});break;
      case FFMessageType.RENAME: result=rename(data||{});break;
      case FFMessageType.CREATE_DIR: result=createDir(data||{});break;
      case FFMessageType.LIST_DIR: result=listDir(data||{});break;
      case FFMessageType.DELETE_DIR: result=deleteDir(data||{});break;
      case FFMessageType.MOUNT: result=mount(data||{});break;
      case FFMessageType.UNMOUNT: result=unmount(data||{});break;
      default: throw ERROR_UNKNOWN_MESSAGE_TYPE;
    }
    const transfer=result instanceof Uint8Array?[result.buffer]:[];
    self.postMessage({id,type,data:result},transfer);
  } catch(error) {
    self.postMessage({id,type:FFMessageType.ERROR,data:String(error?.message||error)});
  }
};
