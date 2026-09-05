import { useEffect, useState } from "react";
import { getGlobalCallHistory, deleteCallHistory, deleteAllCallHistory } from "../../apis/callHistory.api";
import { socket } from "../../apis/socket";
import { PhoneIncoming, PhoneOutgoing, PhoneMissed, Video, Phone, Trash2, CheckSquare } from "lucide-react";
import { useGlobalCall } from "../../context/CallContext";

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
  const [selected,setSelected]=useState<Set<string>>(new Set());
  const [selectMode,setSelectMode]=useState(false);
  const callCtx = useGlobalCall();

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

  const handleQuickCall = (h:any, typeOverride?: string)=>{
    const otherId = h.other?._id?.toString() || h.other?.toString();
    const isGroup = !!h.isGroupCall;
    const callType = typeOverride || h.callType || "audio";
    if(!otherId) return;
    if(isGroup){
      socket.emit("group-call-start", { groupId: otherId, type: callType });
      callCtx.setCallUser({ _id: otherId, username: h.other?.name || h.other?.username || "Group", avatar: h.other?.avatar, isGroup:true });
    } else {
      // find user for call - need to fetch minimal user object
      const target = { _id: otherId, username: h.other?.username || "User", avatar: h.other?.avatar };
      callCtx.setCallUser(target);
    }
    callCtx.setCallType(callType as any);
    callCtx.setCallStatus("calling");
  };
  const handleDelete = async (id:string)=>{
    if(!confirm("Delete this call record?")) return;
    try{ await deleteCallHistory(id); setHistory(prev=> prev.filter(h=> h._id!==id)); }catch{}
  };
  const handleDeleteAll = async()=>{
    if(!confirm("Delete all call history? This will clear your call history.")) return;
    try{ await deleteAllCallHistory(); setHistory([]); setSelected(new Set()); setSelectMode(false); }catch{}
  };
  const toggleSelect = (id:string)=>{
    const ns=new Set(selected);
    if(ns.has(id)) ns.delete(id); else ns.add(id);
    setSelected(ns);
  };
  const handleDeleteSelected = async()=>{
    if(selected.size===0) return;
    if(!confirm(`Delete ${selected.size} selected calls?`)) return;
    for(const id of selected){ try{ await deleteCallHistory(id); }catch{} }
    setHistory(prev=> prev.filter(h=> !selected.has(h._id)));
    setSelected(new Set()); setSelectMode(false);
  };

  const filtered=history.filter((h:any)=>{
    if(filter!=="all" && !(h.status===filter || h.direction===filter)) return false;
    if(typeFilter!=="all" && h.callType!==typeFilter) return false;
    return true;
  });

  if(loading) return <div className="p-6 text-white/60 text-sm">Loading call history…</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        {["all","incoming","outgoing","missed"].map(f=>(
          <button key={f} onClick={()=> setFilter(f as any)} className={`px-3 py-1.5 rounded-full text-xs capitalize border ${filter===f ? "bg-indigo-600 border-indigo-500 text-white" : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"}`}>{f}</button>
        ))}
        <div className="w-px h-6 bg-white/10 mx-1 self-center"/>
        {["all","audio","video"].map(f=>(
          <button key={f} onClick={()=> setTypeFilter(f as any)} className={`px-3 py-1.5 rounded-full text-xs capitalize border ${typeFilter===f ? "bg-indigo-600 border-indigo-500 text-white" : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"}`}>{f}</button>
        ))}
        <div className="ml-auto flex gap-1">
          <button onClick={()=> setSelectMode(!selectMode)} className={`px-3 py-1.5 rounded-full text-xs border ${selectMode?"bg-white/10 border-white/20 text-white":"bg-white/5 border-white/10 text-white/60"}`}><CheckSquare size={12} className="inline mr-1"/>{selectMode?"Cancel":"Select"}</button>
          <button onClick={handleDeleteAll} className="px-3 py-1.5 rounded-full text-xs border bg-rose-500/10 border-rose-500/20 text-rose-300 hover:bg-rose-500/20">Delete All</button>
        </div>
      </div>
      {selectMode && selected.size>0 && (
        <div className="flex items-center justify-between p-2 mb-3 rounded-xl bg-indigo-600/20 border border-indigo-500/30">
          <span className="text-xs text-white/80">{selected.size} selected</span>
          <button onClick={handleDeleteSelected} className="px-3 py-1 rounded-full bg-rose-500 text-white text-xs">Delete Selected</button>
        </div>
      )}

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
              {selectMode && <input type="checkbox" checked={selected.has(h._id)} onChange={()=> toggleSelect(h._id)} className="accent-indigo-600" />}
              <img src={h.other?.avatar||"/avatar-placeholder.png"} className="w-10 h-10 rounded-full object-cover shrink-0" alt={h.other?.name || h.other?.username}/>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{h.other?.name || h.other?.username||"Unknown"} {h.isGroupCall && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-600 text-white ml-1">Group</span>}</p>
                <p className="text-white/60 text-xs flex items-center gap-1.5">
                  <StatusIcon status={h.status} direction={h.direction} callType={h.callType}/>
                  {h.direction} · {h.callType} · {h.status} {h.isGroupCall ? "· Group" : ""}
                </p>
              </div>
              <div className="hidden md:block text-right shrink-0">
                <p className="text-white/80 text-xs">{new Date(h.createdAt).toLocaleDateString()} {new Date(h.createdAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</p>
                <p className="text-white/40 text-xs">{formatDuration(h.duration)} {h.duration ? "· "+h.callType : ""}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={()=> handleQuickCall(h, "audio")} className="w-8 h-8 rounded-full bg-white/5 hover:bg-indigo-600 border border-white/10 hover:border-indigo-500 flex items-center justify-center text-white/70 hover:text-white transition" title="Voice call"><Phone size={14}/></button>
                <button onClick={()=> handleQuickCall(h, "video")} className="w-8 h-8 rounded-full bg-white/5 hover:bg-indigo-600 border border-white/10 hover:border-indigo-500 flex items-center justify-center text-white/70 hover:text-white transition" title="Video call"><Video size={14}/></button>
                <button onClick={()=> handleDelete(h._id)} className="w-8 h-8 rounded-full bg-white/5 hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/30 flex items-center justify-center text-white/40 hover:text-rose-300 transition" title="Delete"><Trash2 size={14}/></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
