import { useEffect, useState } from "react";
import { getChatCallHistory } from "../../apis/callHistory.api";
import { PhoneIncoming, PhoneOutgoing, PhoneMissed, Video, Phone } from "lucide-react";

function formatDuration(sec?:number){
  if(!sec) return "—";
  const m=Math.floor(sec/60);
  const s=sec%60;
  return `${m}:${String(s).padStart(2,"0")}`;
}

export default function CallHistoryList({ userId }: { userId: string }){
  const [history,setHistory]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    if(!userId) return;
    setLoading(true);
    getChatCallHistory(userId).then(r=> setHistory(r.data.history||[])).catch(()=>{}).finally(()=> setLoading(false));
  },[userId]);

  if(loading) return <div className="p-3 text-white/40 text-xs">Loading calls…</div>;
  if(history.length===0) return <div className="p-3 text-white/30 text-xs text-center">No calls with this person yet</div>;

  return (
    <div className="space-y-1 max-h-64 overflow-auto pr-1">
      {history.map((h:any)=>(
        <div key={h._id} className="flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/10">
          <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
            {h.status==="missed" ? <PhoneMissed size={12} className="text-rose-400"/> : h.direction==="outgoing" ? (h.callType==="video" ? <Video size={12} className="text-emerald-400"/> : <PhoneOutgoing size={12} className="text-emerald-400"/>) : (h.callType==="video" ? <Video size={12} className="text-blue-400"/> : <PhoneIncoming size={12} className="text-blue-400"/>)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white/80 text-xs capitalize">{h.direction} {h.callType} · {h.status}</p>
            <p className="text-white/40 text-[10px]">{new Date(h.createdAt).toLocaleString()} · {formatDuration(h.duration)}</p>
          </div>
          <Phone size={12} className="text-white/20"/>
        </div>
      ))}
    </div>
  );
}
