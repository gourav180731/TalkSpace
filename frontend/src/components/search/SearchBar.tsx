import { useState, useEffect, useRef } from "react";
import { searchMessages, searchGroupMessages } from "../../apis/search.api";

function highlight(text:string, q:string){
  if(!q) return text;
  const esc=q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts=text.split(new RegExp(`(${esc})`,"gi"));
  return parts.map((p,i)=> p.toLowerCase()===q.toLowerCase() ? <mark key={i} className="bg-indigo-500/30 text-indigo-300 rounded px-0.5">{p}</mark> : p);
}

export default function SearchBar({chatId, isGroup, onJump}:any){
  const [q,setQ]=useState(""); const [results,setResults]=useState<any[]>([]); const [loading,setLoading]=useState(false); const [error,setError]=useState(""); const timerRef=useRef<any>(null);
  const doSearch=async(val:string)=>{
    const query=val.trim();
    if(!query){ setResults([]); setError(""); return; }
    setLoading(true); setError("");
    try{
      const r=isGroup ? await searchGroupMessages(chatId, query) : await searchMessages(chatId, query);
      setResults(r.data.results||[]);
    }catch(e:any){ setError(e.response?.data?.msg||"Search failed"); } finally{setLoading(false);}
  };
  useEffect(()=>{
    if(timerRef.current) clearTimeout(timerRef.current);
    timerRef.current=setTimeout(()=> doSearch(q), 300);
    return ()=> clearTimeout(timerRef.current);
  },[q]);
  const clear=()=> { setQ(""); setResults([]); setError(""); };
  return <div className="border-t border-white/10 p-2 bg-white/5 backdrop-blur-xl">
    <div className="flex gap-2">
      <input value={q} onChange={e=> setQ(e.target.value)} placeholder="Search in chat..." className="flex-1 px-3 py-2 rounded-full bg-[#0b0d12] border border-white/10 text-white placeholder:text-white/40 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none" />
      {q && <button onClick={clear} className="px-3 py-1 bg-white/10 hover:bg-white/15 text-white/70 rounded-full text-xs">Clear</button>}
    </div>
    {loading && <p className="text-xs mt-2 text-white/60">Searching…</p>}
    {error && <p className="text-xs mt-2 text-rose-400">{error}</p>}
    {!loading && !error && results.length>0 && <div className="mt-2 max-h-48 overflow-auto space-y-1 pr-1">
      {results.map((m:any)=>(
        <button key={m._id} onClick={()=> onJump(m._id)} className="w-full text-left p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs">
          <div className="text-white truncate">{highlight(m.text||"", q)} {m.isEdited && <span className="text-white/40 italic">· edited</span>}</div>
          <div className="text-white/40 text-[10px] mt-1">{m.senderId===chatId ? "them" : "you"} · {new Date(m.createdAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</div>
        </button>
      ))}
      <div className="text-[10px] text-white/30 text-center py-1">{results.length} result(s) — click to jump</div>
    </div>}
    {!loading && !error && q.trim() && results.length===0 && <p className="text-xs mt-2 text-white/50">No results for “{q}”</p>}
  </div>;
}
