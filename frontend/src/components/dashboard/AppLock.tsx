import { useEffect, useState } from "react";
export default function AppLock(){
  const [locked,setLocked]=useState(()=> localStorage.getItem("appLocked")==="true");
  const [input,setInput]=useState("");
  useEffect(()=>{
    const onStorage=()=> setLocked(localStorage.getItem("appLocked")==="true");
    window.addEventListener("storage", onStorage);
    return ()=> window.removeEventListener("storage", onStorage);
  },[]);
  if(!locked) return null;
  return (
    <div className="fixed inset-0 z-[200] bg-[#0b0d12]/90 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#121520] border border-white/10 rounded-3xl p-8 shadow-2xl text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-indigo-600 flex items-center justify-center text-2xl mb-4">🔒</div>
        <h2 className="text-white font-semibold text-lg mb-2">App locked</h2>
        <p className="text-white/60 text-sm mb-4">Enter PIN to unlock TalkSpace</p>
        <input type="password" value={input} onChange={e=> setInput(e.target.value)} placeholder="PIN" className="w-full bg-[#0b0d12] border border-white/10 rounded-xl px-4 py-2 text-white placeholder:text-white/40 mb-3"/>
        <button onClick={()=>{
          const pin=localStorage.getItem("appLockPin");
          if(!pin){ alert("No PIN set. Please set via Chats → ⋮ → App lock"); return; }
          if(input===pin){ localStorage.setItem("appLocked","false"); setLocked(false); setInput(""); }
          else alert("Wrong PIN");
        }} className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white">Unlock</button>
      </div>
    </div>
  );
}
