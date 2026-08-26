import { useEffect, useState } from "react";
import { getAllUsersApi } from "../../apis/friend.api";
import { createGroup } from "../../apis/group.api";
export default function CreateGroupModal({open,onClose,onCreated}:any){
  const [friends,setFriends]=useState<any[]>([]); const [selected,setSelected]=useState<string[]>([]); const [name,setName]=useState(""); const [file,setFile]=useState<File|null>(null);
  useEffect(()=>{ if(open) getAllUsersApi("").then(r=> setFriends(r.data.users||[])).catch(()=>{}); },[open]);
  if(!open) return null;
  const toggle=(id:string)=> setSelected(prev=> prev.includes(id)? prev.filter(x=>x!==id): [...prev,id]);
  const submit=async()=>{
    const fd=new FormData(); fd.append("name",name); fd.append("members", JSON.stringify(selected)); if(file) fd.append("avatar",file);
    try{ const g=await createGroup(fd); onCreated?.(g.data.group); onClose(); }catch(e:any){ alert(e.response?.data?.msg||"Failed"); }
  };
  return <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"><div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-auto">
    <h3 className="font-semibold mb-3">Create Group</h3>
    <input placeholder="Group name" value={name} onChange={e=>setName(e.target.value)} className="w-full border rounded px-3 py-2 mb-3 dark:bg-zinc-800" />
    <input type="file" accept="image/*" onChange={e=> setFile(e.target.files?.[0]||null)} className="mb-3" />
    <div className="space-y-2 max-h-60 overflow-auto">{friends.map((f:any)=>(<label key={f._id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selected.includes(f._id)} onChange={()=>toggle(f._id)} />{f.username}</label>))}</div>
    <div className="flex gap-2 mt-4"><button onClick={onClose} className="flex-1 py-2 rounded-full bg-gray-200">Cancel</button><button onClick={submit} className="flex-1 py-2 rounded-full bg-orange-500 text-white">Create</button></div>
  </div></div>;
}
