import { useState, useEffect } from "react";
import { getPrivacySettings, updatePrivacySettings, getBlockedUsers, unblockUser } from "../apis/privacy.api";
import { getUserSettings, updateUserSettings, clearCache } from "../apis/settings.api";
import { syncContacts } from "../apis/contact.api";
import { getStickerPacks } from "../apis/sticker.api";

const SettingsPage = () => {
  const [tab, setTab] = useState("privacy");
  const [privacy, setPrivacy] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [blocked, setBlocked] = useState<any[]>([]);
  const [packs, setPacks] = useState<any[]>([]);

  const load = async()=>{
    try{ const p=await getPrivacySettings(); setPrivacy(p.data.settings||p.data); }catch{}
    try{ const s=await getUserSettings(); setSettings(s.data.settings); }catch{}
    try{ const b=await getBlockedUsers(); setBlocked(b.data.blocked||[]);}catch{}
    try{ const sp=await getStickerPacks(); setPacks(sp.data.packs||[]);}catch{}
  };
  useEffect(()=>{ load(); },[]);

  const updatePrivacy = async(k:string,v:any)=>{
    const r=await updatePrivacySettings({[k]:v}); setPrivacy(r.data.settings);
  };
  const updateSettings = async(k:string,v:any)=>{
    const r=await updateUserSettings({[k]:v}); setSettings(r.data.settings);
  };

  const handleContactSync = async()=>{
    // @ts-ignore contact picker
    const nav:any=navigator;
    if(nav.contacts && nav.contacts.select){
      try{
        const contacts=await nav.contacts.select(["name","tel","email"],{multiple:true});
        const mapped=contacts.map((c:any)=>({name:c.name?.[0], phone:c.tel?.[0], email:c.email?.[0]}));
        const r=await syncContacts(mapped); alert(`Found ${r.data.matches.length} contacts on TalkSpace`);
      }catch(e:any){ alert("Contact access denied or failed: "+e.message); }
    } else {
      // fallback email input
      const email=prompt("Enter friend email to simulate contact sync (browser not supported):");
      if(email){ const r=await syncContacts([{email}]); alert(`Matches: ${r.data.matches.length}`); }
    }
  };

  return (
    <div className="min-h-screen p-6 bg-[#FFF8F0] dark:bg-[#121212]">
      <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2 hike-gradient-text">Settings</h1>
      <p className="text-sm opacity-60 mb-4">Make TalkSpace yours — Hike-inspired colorful controls</p>
      <div className="flex gap-2 mb-6 flex-wrap">
        {["privacy","notifications","chats","appearance","contacts","about"].map(t=>(
          <button key={t} onClick={()=> setTab(t)} className={`px-4 py-2 rounded-full text-sm capitalize shadow-sm border transition ${tab===t?"bg-gradient-to-r from-[#FF6B6B] to-[#FF8E53] text-white border-transparent":"bg-white border-black/5 dark:bg-white/10 dark:border-white/10 backdrop-blur"}`}>{t}</button>
        ))}
      </div>

      {tab==="privacy" && privacy && (
        <div className="space-y-4 max-w-xl bg-white/70 dark:bg-white/10 backdrop-blur rounded-2xl p-6">
          <h3 className="font-semibold">Privacy Controls</h3>
          {(["lastSeenVisibility","onlineStatusVisibility","profilePhotoVisibility","statusVisibility"] as const).map(k=>(
            <div key={k} className="flex justify-between items-center">
              <span className="text-sm">{k}</span>
              <select value={privacy[k]} onChange={e=>updatePrivacy(k,e.target.value)} className="border rounded px-2 py-1 text-sm dark:bg-zinc-800">
                <option value="everyone">Everyone</option><option value="friends">My Contacts</option><option value="nobody">Nobody</option>
              </select>
            </div>
          ))}
          <div className="flex justify-between items-center"><span className="text-sm">Read Receipts</span><input type="checkbox" checked={privacy.readReceiptEnabled} onChange={e=>updatePrivacy("readReceiptEnabled",e.target.checked)} /></div>
          <div className="flex justify-between items-center"><span className="text-sm">Who can message me</span><select value={privacy.allowMessagesFrom} onChange={e=>updatePrivacy("allowMessagesFrom",e.target.value)} className="border rounded px-2 py-1 text-sm"><option value="everyone">Everyone</option><option value="friends">Friends</option></select></div>
          <div className="flex justify-between items-center"><span className="text-sm">Who can add me to groups</span><select value={privacy.allowGroupInvitesFrom} onChange={e=>updatePrivacy("allowGroupInvitesFrom",e.target.value)} className="border rounded px-2 py-1 text-sm"><option value="everyone">Everyone</option><option value="friends">Friends</option></select></div>
          <div><h4 className="font-medium mt-4">Blocked Users</h4>{blocked.length===0? <p className="text-sm opacity-60">No blocked users</p>: blocked.map((u:any)=>(<div key={u._id} className="flex justify-between py-1"><span>{u.username}</span><button onClick={async()=>{await unblockUser(u._id); load();}} className="text-orange-600 text-sm">Unblock</button></div>))}</div>
        </div>
      )}

      {tab==="notifications" && settings && (
        <div className="space-y-4 max-w-xl bg-white/70 dark:bg-white/10 backdrop-blur rounded-2xl p-6">
          <h3 className="font-semibold">Notifications</h3>
          {["pushNotificationsEnabled","soundEnabled","vibrationEnabled"].map(k=>(
            <div key={k} className="flex justify-between items-center"><span className="text-sm">{k}</span><input type="checkbox" checked={settings[k]} onChange={e=>updateSettings(k,e.target.checked)} /></div>
          ))}
        </div>
      )}

      {tab==="chats" && settings && (
        <div className="space-y-4 max-w-xl bg-white/70 dark:bg-white/10 backdrop-blur rounded-2xl p-6">
          <h3 className="font-semibold">Chats</h3>
          <div className="flex justify-between items-center"><span className="text-sm">Enter to Send</span><input type="checkbox" checked={settings.enterToSend} onChange={e=>updateSettings("enterToSend",e.target.checked)} /></div>
          <div className="flex justify-between items-center"><span className="text-sm">Font Size</span><select value={settings.fontSize} onChange={e=>updateSettings("fontSize",e.target.value)} className="border rounded px-2 py-1 text-sm"><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option></select></div>
          <button onClick={async()=>{await clearCache(); alert("Cache cleared");}} className="px-4 py-2 bg-orange-500 text-white rounded-full text-sm">Clear Media Cache</button>
        </div>
      )}

      {tab==="appearance" && settings && (
        <div className="space-y-4 max-w-xl bg-white/70 dark:bg-white/10 backdrop-blur rounded-2xl p-6">
          <h3 className="font-semibold">Appearance</h3>
          <div className="flex gap-2">{["light","dark","auto"].map(v=>(<button key={v} onClick={()=>updateSettings("theme",v)} className={`px-3 py-1 rounded-full text-sm capitalize ${settings.theme===v?"bg-orange-500 text-white":"bg-white/60"}`}>{v}</button>))}</div>
          <div>Glass Intensity {settings.glassmorphicIntensity}<input type="range" min={0} max={100} value={settings.glassmorphicIntensity} onChange={e=>updateSettings("glassmorphicIntensity",parseInt(e.target.value))} className="w-full" /></div>
        </div>
      )}

      {tab==="contacts" && (
        <div className="space-y-4 max-w-xl bg-white/70 dark:bg-white/10 backdrop-blur rounded-2xl p-6">
          <h3 className="font-semibold">Contact Sync</h3>
          <p className="text-sm opacity-70">Allow TalkSpace to access your contacts to find friends. We hash locally before matching.</p>
          <button onClick={handleContactSync} className="px-4 py-2 bg-orange-500 text-white rounded-full">Allow & Sync Contacts</button>
          <p className="text-xs opacity-50">Unsupported browsers will fallback to email prompt. Permission denied is handled gracefully.</p>
          <div><h4 className="font-medium mt-4">Stickers</h4>{packs.map((p:any)=>(<div key={p._id} className="flex items-center gap-2 py-1"><img src={p.thumbnail} className="w-8 h-8 rounded" alt="thumb" /><span className="text-sm">{p.name}</span></div>))}</div>
        </div>
      )}

      {tab==="about" && (
        <div className="space-y-2 max-w-xl bg-white dark:bg-white/10 backdrop-blur rounded-2xl p-6 shadow-sm border border-black/5">
          <h3 className="font-semibold">About TalkSpace — Hike Edition</h3><p className="text-sm">Version 1.0.0 • Colorful • Clean • Hike-inspired</p><p className="text-sm opacity-70">Privacy Policy: Your data is encrypted. Terms apply. Help at support@talkspace.app</p>
        </div>
      )}
    </div>
    </div>
  )
}

export default SettingsPage;
