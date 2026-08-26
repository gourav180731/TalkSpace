import { useGroup } from "../../context/GroupContext";
export default function GroupList({onSelect}:any){
  const {groups}=useGroup();
  if(groups.length===0) return <p className="text-sm opacity-60 p-3">No groups yet</p>;
  return <div className="space-y-1 p-2">{groups.map((g:any)=>(<button key={g._id} onClick={()=> onSelect(g)} className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-left">
    <img src={g.avatar||`https://ui-avatars.com/api/?name=${g.name}`} className="w-10 h-10 rounded-full" alt="g" />
    <div className="flex-1 min-w-0"><div className="text-sm font-medium truncate">{g.name}</div><div className="text-xs opacity-60 truncate">{g.members?.length} members</div></div>
  </button>))}</div>;
}
