import { useEffect, useState } from "react";
import { getMyFriendsApi } from "../../apis/friend.api";
import { createGroup } from "../../apis/group.api";

export default function CreateGroupModal({open,onClose,onCreated}:any){
  const [friends,setFriends]=useState<any[]>([]); const [selected,setSelected]=useState<string[]>([]); const [name,setName]=useState(""); const [file,setFile]=useState<File|null>(null); const [preview,setPreview]=useState<string>(""); const [search,setSearch]=useState(""); const [loading,setLoading]=useState(false); const [error,setError]=useState("");
  useEffect(()=>{ if(open){ setError(""); setName(""); setSelected([]); setFile(null); setPreview(""); setSearch(""); getMyFriendsApi().then(r=> setFriends(r.data.users||[])).catch(()=>{}); } },[open]);
  useEffect(()=>{ if(file){ const url=URL.createObjectURL(file); setPreview(url); return()=> URL.revokeObjectURL(url); } else setPreview(""); },[file]);
  if(!open) return null;
  const toggle=(id:string)=> setSelected(prev=> prev.includes(id)? prev.filter(x=>x!==id): [...prev,id]);
  const filtered=friends.filter((f:any)=> !search || f.username.toLowerCase().includes(search.toLowerCase()));
  const canCreate=name.trim().length>=2 && selected.length>=1;
  const submit=async()=>{
    if(!canCreate) return;
    setLoading(true); setError("");
    const fd=new FormData(); fd.append("name",name.trim()); fd.append("members", JSON.stringify(selected)); if(file) fd.append("avatar",file);
    try{ const g=await createGroup(fd); onCreated?.(g.data.group); onClose(); }catch(e:any){ setError(e.response?.data?.msg||"Failed to create group"); } finally{ setLoading(false); }
  };
  return <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="w-full max-w-md max-h-[85vh] overflow-hidden rounded-3xl bg-[#121520]/90 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/40 flex flex-col">
      <div className="p-6 pb-4 border-b border-white/10">
        <h3 className="text-white font-semibold text-lg">Create Group</h3>
        <p className="text-white/60 text-xs mt-1">Group name, avatar and members</p>
      </div>
      <div className="p-6 space-y-4 overflow-auto flex-1">
        <div className="flex items-center gap-4">
          <label className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden cursor-pointer hover:bg-white/10 transition shrink-0">
            {preview ? <img src={preview} className="w-full h-full object-cover" alt="preview"/> : <span className="text-white/40 text-xs text-center">Add<br/>avatar</span>}
            <input type="file" accept="image/*" hidden onChange={e=> setFile(e.target.files?.[0]||null)} />
          </label>
          <input placeholder="Group name (min 2 chars)" value={name} onChange={e=>setName(e.target.value)} maxLength={30} className="flex-1 bg-[#0b0d12] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-white/40 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm" />
        </div>
        {selected.length>0 && (
          <div className="flex flex-wrap gap-2">
            {selected.map(id=>{
              const u=friends.find((f:any)=> f._id===id);
              return <span key={id} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-600 text-white text-xs">{u?.username||id}<button onClick={()=> toggle(id)} className="hover:bg-white/20 rounded-full w-4 h-4 flex items-center justify-center">×</button></span>
            })}
          </div>
        )}
        <input placeholder="Search members..." value={search} onChange={e=> setSearch(e.target.value)} className="w-full bg-[#0b0d12] border border-white/10 rounded-xl px-4 py-2 text-white placeholder:text-white/40 text-sm" />
        <div className="space-y-1 max-h-56 overflow-auto pr-1">
          {filtered.map((f:any)=>(
            <label key={f._id} className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition ${selected.includes(f._id) ? "bg-indigo-600/20 border border-indigo-500/30" : "hover:bg-white/5 border border-transparent"}`}>
              <img src={f.avatar||"/avatar-placeholder.png"} className="w-8 h-8 rounded-full object-cover" alt={f.username}/>
              <span className="text-white text-sm flex-1">{f.username}</span>
              <input type="checkbox" checked={selected.includes(f._id)} onChange={()=> toggle(f._id)} className="accent-indigo-600 w-4 h-4" />
            </label>
          ))}
          {filtered.length===0 && <p className="text-white/40 text-xs text-center py-4">No users found</p>}
        </div>
        {error && <p className="text-rose-400 text-xs">{error}</p>}
      </div>
      <div className="p-6 pt-4 border-t border-white/10 flex gap-3">
        <button onClick={onClose} disabled={loading} className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm disabled:opacity-50">Cancel</button>
        <button onClick={submit} disabled={!canCreate||loading} className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-white/10 disabled:text-white/30 text-white text-sm font-medium transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-600/30 disabled:hover:translate-y-0 disabled:shadow-none">
          {loading ? "Creating…" : `Create (${selected.length})`}
        </button>
      </div>
    </div>
  </div>;
}
