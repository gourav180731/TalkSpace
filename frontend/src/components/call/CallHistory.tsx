import { useEffect, useState } from "react";
import { getGlobalCallHistory } from "../../apis/callHistory.api";
import { socket } from "../../apis/socket";
import { PhoneIncoming, PhoneOutgoing, PhoneMissed, Video, Phone } from "lucide-react";

function formatDuration(sec?:number){
  if(!sec) return "—";
  const m=Math.floor(sec/60);
  const s=sec%60;
  return `${m}:${String(s).padStart(2,"0")}`;
}

function StatusIcon({status, direction, callType}:any){
  const isVideo=callType==="video";
  if(status==="missed") return <PhoneMissed size={14} className="text-rose-400"/>;
  if(status==="rejected") return <PhoneMissed size={14} className="text-amber-400"/>;
  if(direction==="outgoing") return isVideo ? <Video size={14} className="text-emerald-400"/> : <PhoneOutgoing size={14} className="text-emerald-400"/>;
  return isVideo ? <Video size={14} className="text-blue-400"/> : <PhoneIncoming size={14} className="text-blue-400"/>;
}

export default function CallHistory(){
  const [history,setHistory]=useState<any[]>([]);
  const [filter,setFilter]=useState<"all"|"incoming"|"outgoing"|"missed">("all");
  const [typeFilter,setTypeFilter]=useState<"all"|"audio"|"video">("all");
  const [loading,setLoading]=useState(true);

  const load=async()=>{
    setLoading(true);
    try{
      const r=await getGlobalCallHistory();
      setHistory(r.data.history||[]);
    }catch{} finally{ setLoading(false); }
  };
  useEffect(()=>{
    load();
    const onCallEnd=()=> load();
    const onNewCallMsg=(p:any)=>{ if(p?.message?.messageType==="call") load(); };
    socket.on("call-ended", onCallEnd);
    socket.on("call-missed", onCallEnd);
    socket.on("call-rejected", onCallEnd);
    socket.on("new-message", onNewCallMsg);
    return ()=>{ socket.off("call-ended", onCallEnd); socket.off("call-missed", onCallEnd); socket.off("call-rejected", onCallEnd); socket.off("new-message", onNewCallMsg); };
  },[]);

  const filtered=history.filter((h:any)=>{
    if(filter!=="all" && !(h.status===filter || h.direction===filter)) return false;
    if(typeFilter!=="all" && h.callType!==typeFilter) return false;
    return true;
  });

  if(loading) return <div className="p-6 text-white/60 text-sm">Loading call history…</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex gap-2 mb-4 flex-wrap">
        {["all","incoming","outgoing","missed"].map(f=>(
          <button key={f} onClick={()=> setFilter(f as any)} className={`px-3 py-1.5 rounded-full text-xs capitalize border ${filter===f ? "bg-indigo-600 border-indigo-500 text-white" : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"}`}>{f}</button>
        ))}
        <div className="w-px h-6 bg-white/10 mx-1 self-center"/>
        {["all","audio","video"].map(f=>(
          <button key={f} onClick={()=> setTypeFilter(f as any)} className={`px-3 py-1.5 rounded-full text-xs capitalize border ${typeFilter===f ? "bg-indigo-600 border-indigo-500 text-white" : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"}`}>{f}</button>
        ))}
      </div>

      {filtered.length===0 ? (
        <div className="rounded-2xl bg-white/5 border border-white/10 p-8 text-center">
          <Phone size={32} className="mx-auto text-white/20 mb-3"/>
          <p className="text-white/60 text-sm">No calls yet</p>
          <p className="text-white/30 text-xs mt-1">Your call history will appear here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((h:any)=>(
            <div key={h._id} className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition">
              <img src={h.other?.avatar||"/avatar-placeholder.png"} className="w-10 h-10 rounded-full object-cover" alt={h.other?.name || h.other?.username}/>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{h.other?.name || h.other?.username||"Unknown"} {h.isGroupCall && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-600 text-white ml-1">Group</span>}</p>
                <p className="text-white/60 text-xs flex items-center gap-1.5">
                  <StatusIcon status={h.status} direction={h.direction} callType={h.callType}/>
                  {h.direction} · {h.callType} · {h.status} {h.isGroupCall ? "· Group" : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="text-white/80 text-xs">{new Date(h.createdAt).toLocaleDateString()} {new Date(h.createdAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</p>
                <p className="text-white/40 text-xs">{formatDuration(h.duration)} {h.duration ? "· "+h.callType : ""}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
