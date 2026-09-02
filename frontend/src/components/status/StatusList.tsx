import { useStatus } from "../../context/StatusContext";
import { useState, useEffect } from "react";
import { createStatus } from "../../apis/status.api";
import StatusViewer from "./StatusViewer";
import { useAuth } from "../../context/AuthContext";
export default function StatusList(){
  const {friendsStatuses, myStatuses, viewStatus}=useStatus();
  const { user } = useAuth();
  const [showCreate,setShowCreate]=useState(false); const [text,setText]=useState(""); const [file,setFile]=useState<File|null>(null); const [preview,setPreview]=useState(""); const [privacy,setPrivacy]=useState("all_friends"); const [loading,setLoading]=useState(false); const [error,setError]=useState("");
  const [viewerStatuses,setViewerStatuses]=useState<any[]|null>(null);
  const [viewerIndex,setViewerIndex]=useState(0);
  useEffect(()=>{ if(file){ const url=URL.createObjectURL(file); setPreview(url); return()=> URL.revokeObjectURL(url); } else setPreview(""); },[file]);
  const submit=async()=>{
    if(!text.trim() && !file) { setError("Add text or media"); return; }
    if(text.length>700){ setError("Max 700 chars"); return; }
    setLoading(true); setError("");
    const fd=new FormData(); if(text) fd.append("textContent",text); if(file) fd.append("media",file); fd.append("contentType", file? (file.type.startsWith("image")?"image":"video"):"text"); fd.append("privacyMode", privacy);
    try{ await createStatus(fd); setShowCreate(false); setText(""); setFile(null); }catch(e:any){ setError(e.response?.data?.msg||"Failed"); } finally{ setLoading(false); }
  };
  // Group friends statuses by user to avoid duplicate avatars and to open viewer with all of that user's statuses
  const grouped = friendsStatuses.reduce((acc:any, s:any)=>{
    const uid = s.userId?._id ? s.userId._id.toString() : s.userId?.toString();
    if(!acc[uid]) acc[uid]=[];
    acc[uid].push(s);
    return acc;
  },{} as Record<string, any[]>);
  const groupedEntries = Object.entries(grouped);
  const handleMyClick=()=>{
    if(myStatuses.length===0) return;
    // Ensure we pass fresh myStatuses with correct owner info (populate if needed)
    const withOwner=myStatuses.map((s:any)=> ({...s, userId: s.userId && typeof s.userId==="object" && s.userId.username ? s.userId : { _id: user?._id, username: user?.username, avatar: user?.avatar }}));
    setViewerStatuses(withOwner);
    setViewerIndex(0);
  };
  const handleFriendClick=(uid:string)=>{
    const list=grouped[uid];
    if(!list) return;
    setViewerStatuses(list);
    setViewerIndex(0);
  };
  return <div className="flex gap-3 overflow-x-auto p-2 scrollbar-thin">
    <button onClick={()=> setShowCreate(true)} className="flex flex-col items-center gap-1 min-w-[64px] shrink-0">
      <div className="w-14 h-14 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xl shadow-md hover:scale-105 transition">+</div>
      <span className="text-xs text-white/70">Add Status</span>
    </button>
    {myStatuses.length>0 && (
      <div onClick={handleMyClick} className="min-w-[64px] flex flex-col items-center gap-1 shrink-0 cursor-pointer">
        <div className="w-14 h-14 rounded-full p-[2px] bg-gradient-to-tr from-indigo-500 to-blue-500"><img src={myStatuses[0].mediaUrl||`https://ui-avatars.com/api/?name=Me`} className="w-full h-full rounded-full object-cover bg-[#121520]" alt="s" /></div>
        <span className="text-xs text-white/60">My</span>
        <span className="text-[9px] text-white/30">{myStatuses.length} · {Math.max(0,24 - Math.floor((Date.now()-new Date(myStatuses[0].createdAt).getTime())/3600000))}h left</span>
      </div>
    )}
    {groupedEntries.map(([uid, list]:any)=> {
      const first=list[0];
      const owner=first.userId || {};
      const name=owner.username || "User";
      const avatar=owner.avatar || `https://ui-avatars.com/api/?name=${name}`;
      const unseen = list.some((s:any)=> !s.viewers?.some((v:any)=> v.userId.toString()===user?._id));
      return (
        <div key={uid} onClick={()=> handleFriendClick(uid)} className="min-w-[64px] flex flex-col items-center gap-1 shrink-0 cursor-pointer">
          <div className={`w-14 h-14 rounded-full p-[2px] ${unseen ? "bg-gradient-to-tr from-emerald-400 to-blue-500" : "bg-white/20"}`}><img src={first.mediaUrl||avatar} className="w-full h-full rounded-full object-cover bg-[#121520]" alt={name} /></div>
          <span className="text-xs truncate w-14 text-center text-white/70">{name}</span>
          <span className="text-[9px] text-white/30">{list.length}</span>
        </div>
      );
    })}
     {showCreate && <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={()=> setShowCreate(false)}>
       <div onClick={e=>e.stopPropagation()} className="w-full max-w-sm rounded-3xl bg-[#121520]/90 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/40 p-6">
         <h3 className="text-white font-semibold text-lg">Create Status</h3>
         <p className="text-white/60 text-xs mb-4">Visible for 24 hours · {text.length}/700</p>
         <textarea placeholder="What's on your mind?" value={text} onChange={e=> setText(e.target.value)} maxLength={700} rows={3} className="w-full bg-[#0b0d12] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/40 text-sm focus:border-indigo-500 outline-none resize-none" />
         <div className="mt-3">
           <label className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 text-sm cursor-pointer">
             {file ? "Change media" : "Add image / video"}
             <input type="file" accept="image/*,video/*" hidden onChange={e=> setFile(e.target.files?.[0]||null)} />
           </label>
           {preview && (
             <div className="mt-3 relative rounded-xl overflow-hidden border border-white/10">
               {file?.type.startsWith("video") ? <video src={preview} controls className="w-full h-40 object-cover"/> : <img src={preview} className="w-full h-40 object-cover" alt="preview"/>}
               <button onClick={()=> setFile(null)} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center">×</button>
             </div>
           )}
         </div>
         <select value={privacy} onChange={e=> setPrivacy(e.target.value)} className="mt-3 w-full bg-[#0b0d12] border border-white/10 rounded-xl px-3 py-2 text-white text-sm">
           <option value="all_friends">All friends</option>
           <option value="friends_except">Friends except…</option>
           <option value="only_share_with">Only share with…</option>
         </select>
         {error && <p className="text-rose-400 text-xs mt-2">{error}</p>}
         <div className="flex gap-3 mt-4">
           <button onClick={()=> setShowCreate(false)} className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm">Cancel</button>
           <button onClick={submit} disabled={loading} className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-white/10 disabled:text-white/30 text-white text-sm font-medium">{loading ? "Posting…" : "Post"}</button>
         </div>
       </div>
     </div>}
     {viewerStatuses && <StatusViewer statuses={viewerStatuses} initialIndex={viewerIndex} onClose={()=> setViewerStatuses(null)} onViewed={(id)=> viewStatus(id)} currentUserId={user?._id} />}
   </div>;
}
