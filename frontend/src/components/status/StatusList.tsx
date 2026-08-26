import { useStatus } from "../../context/StatusContext";
import { useState } from "react";
import { createStatus } from "../../apis/status.api";
export default function StatusList(){
  const {friendsStatuses, myStatuses}=useStatus();
  const [showCreate,setShowCreate]=useState(false); const [text,setText]=useState(""); const [file,setFile]=useState<File|null>(null);
  const submit=async()=>{
    const fd=new FormData(); if(text) fd.append("textContent",text); if(file) fd.append("media",file); fd.append("contentType", file? (file.type.startsWith("image")?"image":"video"):"text");
    try{ await createStatus(fd); setShowCreate(false); setText(""); }catch(e:any){ alert(e.response?.data?.msg||"failed");}
  };
  return <div className="flex gap-3 overflow-x-auto p-2">
    <button onClick={()=> setShowCreate(!showCreate)} className="flex flex-col items-center gap-1 min-w-[60px]"><div className="w-14 h-14 rounded-full bg-orange-500 flex items-center justify-center text-white text-xl">+</div><span className="text-xs">Add Status</span></button>
    {myStatuses.map((s:any)=>(<div key={s._id} className="min-w-[60px] flex flex-col items-center"><div className="w-14 h-14 rounded-full p-[2px] bg-gradient-to-tr from-orange-500 to-pink-500"><img src={s.mediaUrl||`https://ui-avatars.com/api/?name=Me`} className="w-full h-full rounded-full object-cover bg-white" alt="s" /></div><span className="text-xs">My</span></div>))}
    {friendsStatuses.map((s:any)=>(<div key={s._id} className="min-w-[60px] flex flex-col items-center"><div className="w-14 h-14 rounded-full p-[2px] bg-gradient-to-tr from-green-400 to-blue-500"><img src={s.mediaUrl||`https://ui-avatars.com/api/?name=${s.userId}`} className="w-full h-full rounded-full object-cover bg-white" alt="s" /></div><span className="text-xs truncate w-14 text-center">{s.textContent?.slice(0,10)||"status"}</span></div>))}
    {showCreate && <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={()=> setShowCreate(false)}><div onClick={e=>e.stopPropagation()} className="bg-white dark:bg-zinc-900 rounded-2xl p-4 w-full max-w-sm"><h3 className="font-semibold mb-2">Create Status (24h)</h3><input placeholder="Text status" value={text} onChange={e=>setText(e.target.value)} className="w-full border rounded px-3 py-2 mb-2 dark:bg-zinc-800" /><input type="file" accept="image/*,video/*" onChange={e=> setFile(e.target.files?.[0]||null)} className="mb-3" /><button onClick={submit} className="w-full py-2 bg-orange-500 text-white rounded-full">Post</button></div></div>}
  </div>;
}
