import { useGroup } from "../../context/GroupContext";
export default function GroupList({onSelect}:any){
  const {groups}=useGroup();
  if(groups.length===0) return <p className="text-sm opacity-60 p-3">No groups yet</p>;
  const preview = (g:any)=>{
    const lm=g.lastMessage;
    if(!lm) return `${g.members?.length||0} members · no messages yet`;
    if(lm.file && !lm.text) return `📎 ${lm.mimeType?.startsWith("image/")?"Photo": lm.mimeType?.startsWith("video/")?"Video":"File"}`;
    const t=lm.text||"";
    return t.length>32? t.slice(0,32)+"…": t;
  };
  return <div className="space-y-1 p-2">{groups.map((g:any)=>(<button key={g._id} onClick={()=> onSelect(g)} className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-left">
    <img src={g.avatar||`https://ui-avatars.com/api/?name=${encodeURIComponent(g.name)}`} className="w-10 h-10 rounded-full object-cover" alt="g" />
    <div className="flex-1 min-w-0"><div className="text-sm font-medium truncate flex items-center gap-1">{g.name}<span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10">{g.members?.length}</span></div><div className="text-xs opacity-60 truncate">{preview(g)}</div></div>
    {g.unreadCount? <span className="min-w-[20px] h-5 px-1 flex items-center justify-center rounded-full bg-emerald-500 text-white text-[11px] font-bold">{g.unreadCount}</span> : null}
  </button>))}</div>;
}
