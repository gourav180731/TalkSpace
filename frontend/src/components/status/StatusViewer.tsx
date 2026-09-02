import { useEffect, useState, useRef } from "react";
import { X, Eye, ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  statuses: any[];
  initialIndex?: number;
  onClose: () => void;
  onViewed?: (id:string)=>void;
  currentUserId?: string;
}

export default function StatusViewer({ statuses, initialIndex=0, onClose, onViewed, currentUserId }: Props){
  const [index,setIndex]=useState(initialIndex);
  const [paused,setPaused]=useState(false);
  const [progress,setProgress]=useState(0);
  const timerRef=useRef<any>(null);
  const progressRef=useRef<any>(null);
  const status=statuses[index];
  const isOwner = currentUserId && status && (status.userId?._id ? status.userId._id.toString()===currentUserId : status.userId?.toString()===currentUserId);

  useEffect(()=>{
    if(!status) return;
    onViewed?.(status._id);
    setProgress(0);
    if(timerRef.current) clearInterval(timerRef.current);
    if(progressRef.current) clearInterval(progressRef.current);
    if(paused) return;
    const duration=5000;
    const step=50;
    let elapsed=0;
    progressRef.current=setInterval(()=>{
      if(paused) return;
      elapsed+=step;
      setProgress(Math.min((elapsed/duration)*100,100));
      if(elapsed>=duration){
        clearInterval(progressRef.current);
        if(index < statuses.length-1){
          setIndex(i=> i+1);
        } else {
          onClose();
        }
      }
    }, step);
    return()=> { clearInterval(progressRef.current); };
  },[index, paused, status?._id]);

  useEffect(()=>{
    const onKey=(e:KeyboardEvent)=>{
      if(e.key==="Escape") onClose();
      if(e.key==="ArrowLeft") setIndex(i=> Math.max(0,i-1));
      if(e.key==="ArrowRight") setIndex(i=> Math.min(statuses.length-1,i+1));
    };
    window.addEventListener("keydown", onKey);
    return()=> window.removeEventListener("keydown", onKey);
  },[]);

  if(!status) return null;
  const owner = status.userId || {};
  const ownerName = owner.username || owner.firstName || "Unknown";
  const ownerAvatar = owner.avatar || `https://ui-avatars.com/api/?name=${ownerName}`;
  const timeLeft = Math.max(0, 24 - Math.floor((Date.now()-new Date(status.createdAt).getTime())/3600000));
  const isExpired = new Date(status.expiryTime) < new Date();

  if(isExpired) return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#121520] border border-white/10 rounded-3xl p-8 text-center">
        <p className="text-white/60">This status has expired</p>
        <button onClick={onClose} className="mt-4 px-4 py-2 rounded-full bg-indigo-600 text-white text-sm">Close</button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-0 md:p-4" onClick={onClose}>
      <div className="relative w-full h-full md:max-w-md md:h-[80vh] md:rounded-3xl overflow-hidden bg-[#0b0d12] border md:border-white/10 shadow-2xl flex flex-col" onClick={e=> e.stopPropagation()} onMouseDown={()=> setPaused(true)} onMouseUp={()=> setPaused(false)} onTouchStart={()=> setPaused(true)} onTouchEnd={()=> setPaused(false)}>
        {/* Progress */}
        <div className="absolute top-0 left-0 right-0 flex gap-1 p-2 z-10">
          {statuses.map((_:any,i:number)=>(
            <div key={i} className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white transition-all duration-50" style={{ width: i<index ? "100%" : i===index ? `${progress}%` : "0%" }} />
            </div>
          ))}
        </div>
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 pt-6 z-10 bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex items-center gap-3">
            <img src={ownerAvatar} className="w-10 h-10 rounded-full object-cover border border-white/20" alt={ownerName}/>
            <div>
              <p className="text-white font-medium text-sm">{ownerName} {isOwner && "(You)"}</p>
              <p className="text-white/60 text-xs">{new Date(status.createdAt).toLocaleTimeString()} · {timeLeft}h left {isExpired ? "· Expired" : ""}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"><X size={16}/></button>
        </div>
        {/* Content */}
        <div className="flex-1 flex items-center justify-center relative bg-black">
          {status.contentType==="text" ? (
            <div className="w-full h-full flex items-center justify-center p-6 text-center" style={{ background: status.backgroundColor || "#4f46e5" }}>
              <p className="text-white text-xl font-medium whitespace-pre-wrap" style={{ fontFamily: status.font || "Inter" }}>{status.textContent}</p>
            </div>
          ) : status.contentType==="image" ? (
            <img src={status.mediaUrl} className="max-w-full max-h-full object-contain" alt="status" />
          ) : (
            <video src={status.mediaUrl} controls autoPlay className="max-w-full max-h-full object-contain" />
          )}
          {/* Caption */}
          {status.textContent && status.contentType!=="text" && (
            <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur rounded-xl p-3">
              <p className="text-white text-sm">{status.textContent}</p>
            </div>
          )}
          {/* Navigation zones */}
          <button onClick={()=> setIndex(i=> Math.max(0,i-1))} className="absolute left-0 top-0 bottom-0 w-1/3 flex items-center justify-start pl-2 opacity-0 hover:opacity-100 transition">
            <ChevronLeft size={32} className="text-white/70 bg-black/30 rounded-full p-1" />
          </button>
          <button onClick={()=> setIndex(i=> i < statuses.length-1 ? i+1 : (onClose(), i))} className="absolute right-0 top-0 bottom-0 w-1/3 flex items-center justify-end pr-2 opacity-0 hover:opacity-100 transition">
            <ChevronRight size={32} className="text-white/70 bg-black/30 rounded-full p-1" />
          </button>
        </div>
        {/* Viewers (owner only) */}
        {isOwner && status.viewers && (
          <div className="p-3 bg-[#121520] border-t border-white/10">
            <p className="text-white/60 text-xs flex items-center gap-1"><Eye size={12}/> {status.viewers.length} views</p>
            {status.viewers.length>0 && (
              <div className="mt-2 max-h-20 overflow-auto space-y-1">
                {status.viewers.map((v:any,i:number)=>(
                  <div key={i} className="text-white/50 text-xs">{v.userId?.toString().slice(-6) || v.userId} · {new Date(v.viewedAt).toLocaleTimeString()}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
