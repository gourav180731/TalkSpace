import { useState } from "react";
import { searchMessages } from "../../apis/search.api";
export default function SearchBar({chatId, onJump}:any){
  const [q,setQ]=useState(""); const [results,setResults]=useState<any[]>([]); const [loading,setLoading]=useState(false);
  const doSearch=async()=>{
    if(!q.trim()) return; setLoading(true);
    try{ const r=await searchMessages(chatId, q); setResults(r.data.results||[]);}catch{} finally{setLoading(false);}
  };
  return <div className="border-t p-2 bg-white/50 dark:bg-black/20 backdrop-blur">
    <div className="flex gap-2"><input value={q} onChange={e=> setQ(e.target.value)} onKeyDown={e=> e.key==="Enter" && doSearch()} placeholder="Search in chat..." className="flex-1 px-3 py-1 rounded-full border text-sm dark:bg-zinc-800" /><button onClick={doSearch} className="px-3 py-1 bg-orange-500 text-white rounded-full text-sm">Search</button></div>
    {loading && <p className="text-xs mt-1">Searching...</p>}
    {results.length>0 && <div className="mt-2 max-h-40 overflow-auto space-y-1">{results.map((m:any)=>(<button key={m._id} onClick={()=> onJump(m._id)} className="w-full text-left p-2 rounded bg-white/70 dark:bg-white/10 text-xs truncate">{m.text}</button>))}</div>}
    {results.length===0 && q && !loading && <p className="text-xs opacity-60 mt-1">No results</p>}
  </div>;
}
