import { useState, useEffect } from "react";
import { getPrivacySettings, updatePrivacySettings, getBlockedUsers, unblockUser } from "../apis/privacy.api";
import { getUserSettings, updateUserSettings, clearCache } from "../apis/settings.api";
import { syncContacts } from "../apis/contact.api";
import { getStickerPacks } from "../apis/sticker.api";
import { setTheme as applyLocalTheme } from "../utils/theme";
import { useProfile } from "./profile/useProfile";
import { ProfileView } from "./profile/ProfileView";
import AppNavbar from "../components/layout/AppNavbar";
import MobileBottomNav from "../components/layout/MobileBottomNav";
import { useScrollDirection } from "../utils/useScrollDirection";
import { useRef } from "react";

const SettingsPage = () => {
  const [tab, setTab] = useState("appearance");
  const [privacy, setPrivacy] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [blocked, setBlocked] = useState<any[]>([]);
  const [packs, setPacks] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navVisible = useScrollDirection(scrollRef);
  const profileState = useProfile();

  const load = async()=>{
    try{ const p=await getPrivacySettings(); setPrivacy(p.data.settings||p.data); }catch{}
    try{ const s=await getUserSettings(); setSettings(s.data.settings); if(s.data.settings?.theme) applyLocalTheme(s.data.settings.theme); }catch{}
    try{ const b=await getBlockedUsers(); setBlocked(b.data.blocked||[]);}catch{}
    try{ const sp=await getStickerPacks(); setPacks(sp.data.packs||[]);}catch{}
  };
  useEffect(()=>{ load(); },[]);

  const updatePrivacy = async(k:string,v:any)=>{
    const r=await updatePrivacySettings({[k]:v}); setPrivacy(r.data.settings);
  };
  const updateSettings = async(k:string,v:any)=>{
    const r=await updateUserSettings({[k]:v}); setSettings(r.data.settings);
    if(k==="theme"){
      applyLocalTheme(v);
      window.dispatchEvent(new Event("theme-change"));
    }
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
    <div className="min-h-screen relative overflow-hidden bg-[#0b0d12]">
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-indigo-600/20 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute top-40 -right-40 w-[400px] h-[400px] bg-blue-500/20 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute inset-0 bg-grid pointer-events-none opacity-20" />
      <div className="hidden md:block fixed top-1 left-1/2 -translate-x-1/2 w-[94%] max-w-6xl z-[100]">
        <AppNavbar active={"home" as any} />
      </div>
      <div ref={scrollRef} className="relative z-10 md:pt-24 min-h-screen overflow-auto">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 pb-28 md:pb-6">
          <div className="bg-[#121520]/90 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl shadow-black/40 overflow-hidden">
            <div className="p-6 md:p-8 border-b border-white/10">
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Settings</h1>
              <p className="text-sm text-white/60 mt-1">Manage your TalkSpace experience</p>
            </div>
            <div className="px-4 md:px-6 py-4 border-b border-white/5 bg-white/[0.02]">
              <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-1 -mb-1">
                {["profile","privacy","notifications","chats","appearance","contacts","about","founder"].map(t=>(
                  <button key={t} onClick={()=> setTab(t)} className={`px-4 py-2 rounded-full text-sm capitalize whitespace-nowrap font-medium border transition shrink-0 ${tab===t?"bg-indigo-600 text-white border-indigo-500 shadow":"bg-white/5 hover:bg-white/10 text-white/80 border-white/10"}`}>{t==="founder"?"Founder":t}</button>
                ))}
              </div>
            </div>
            <div className="p-4 md:p-6">


      {tab==="profile" && (
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 md:p-6">
          {profileState.initializing ? <p className="text-white/60 text-sm">Loading profile…</p> : <ProfileView {...profileState} logout={profileState.handleLogout} />}
        </div>
      )}

      {tab==="privacy" && privacy && (
        <div className="space-y-4 bg-white/[0.04] border border-white/10 rounded-2xl p-6">
          <h3 className="font-semibold text-white">Privacy Controls</h3>
          {(["lastSeenVisibility","onlineStatusVisibility","profilePhotoVisibility","statusVisibility"] as const).map(k=>(
            <div key={k} className="flex justify-between items-center">
              <span className="text-sm text-white/80">{k}</span>
              <select value={privacy[k]} onChange={e=>updatePrivacy(k,e.target.value)} className="bg-[#0b0d12] border border-white/10 rounded-lg px-2 py-1 text-sm text-white">
                <option value="everyone">Everyone</option><option value="friends">My Contacts</option><option value="nobody">Nobody</option>
              </select>
            </div>
          ))}
          <div className="flex justify-between items-center"><span className="text-sm text-white/80">Read Receipts</span><input type="checkbox" checked={privacy.readReceiptEnabled} onChange={e=>updatePrivacy("readReceiptEnabled",e.target.checked)} className="accent-indigo-600" /></div>
          <div className="flex justify-between items-center"><span className="text-sm text-white/80">Who can message me</span><select value={privacy.allowMessagesFrom} onChange={e=>updatePrivacy("allowMessagesFrom",e.target.value)} className="bg-[#0b0d12] border border-white/10 rounded-lg px-2 py-1 text-sm text-white"><option value="everyone">Everyone</option><option value="friends">Friends</option></select></div>
          <div className="flex justify-between items-center"><span className="text-sm text-white/80">Who can add me to groups</span><select value={privacy.allowGroupInvitesFrom} onChange={e=>updatePrivacy("allowGroupInvitesFrom",e.target.value)} className="bg-[#0b0d12] border border-white/10 rounded-lg px-2 py-1 text-sm text-white"><option value="everyone">Everyone</option><option value="friends">Friends</option></select></div>
          <div><h4 className="font-medium mt-4 text-white">Blocked Users</h4>{blocked.length===0? <p className="text-sm text-white/50">No blocked users</p>: blocked.map((u:any)=>(<div key={u._id} className="flex justify-between py-2 border-b border-white/5"><span className="text-white/80 text-sm">{u.username}</span><button onClick={async()=>{await unblockUser(u._id); load();}} className="text-indigo-400 text-sm">Unblock</button></div>))}</div>
        </div>
      )}

      {tab==="notifications" && settings && (
        <div className="space-y-4 bg-white/[0.04] border border-white/10 rounded-2xl p-6">
          <h3 className="font-semibold text-white">Notifications</h3>
          {["pushNotificationsEnabled","soundEnabled","vibrationEnabled"].map(k=>(
            <div key={k} className="flex justify-between items-center"><span className="text-sm text-white/80">{k}</span><input type="checkbox" checked={settings[k]} onChange={e=>updateSettings(k,e.target.checked)} className="accent-indigo-600" /></div>
          ))}
        </div>
      )}

      {tab==="chats" && settings && (
        <div className="space-y-4 bg-white/[0.04] border border-white/10 rounded-2xl p-6">
          <h3 className="font-semibold text-white">Chats</h3>
          <div className="flex justify-between items-center"><span className="text-sm text-white/80">Enter to Send</span><input type="checkbox" checked={settings.enterToSend} onChange={e=>updateSettings("enterToSend",e.target.checked)} className="accent-indigo-600" /></div>
          <div className="flex justify-between items-center"><span className="text-sm text-white/80">Font Size</span><select value={settings.fontSize} onChange={e=>updateSettings("fontSize",e.target.value)} className="bg-[#0b0d12] border border-white/10 rounded-lg px-2 py-1 text-sm text-white"><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option></select></div>
          <button onClick={async()=>{await clearCache(); alert("Cache cleared");}} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-sm">Clear Media Cache</button>
        </div>
      )}

      {tab==="appearance" && settings && (
        <div className="space-y-6 bg-white/[0.04] border border-white/10 rounded-2xl p-6">
          <h3 className="font-semibold text-white">Appearance</h3>
          <div>
            <p className="text-sm text-white/80 mb-3">Theme — applies instantly, persists after refresh</p>
            <div className="flex gap-2">
              {["light","dark","auto"].map(v=>(
                <button key={v} onClick={()=>updateSettings("theme",v)} className={`flex-1 py-2.5 rounded-xl text-sm capitalize font-medium border transition ${settings.theme===v?"bg-indigo-600 text-white border-indigo-500":"bg-white/5 hover:bg-white/10 text-white border-white/10"}`}>{v}</button>
              ))}
            </div>
            <p className="text-xs text-white/40 mt-2">Light / Dark / System (auto). Visible on mobile and desktop.</p>
          </div>
          <div><p className="text-sm text-white/80 mb-2">Glass Intensity {settings.glassmorphicIntensity}</p><input type="range" min={0} max={100} value={settings.glassmorphicIntensity} onChange={e=>updateSettings("glassmorphicIntensity",parseInt(e.target.value))} className="w-full accent-indigo-600" /></div>
        </div>
      )}

      {tab==="contacts" && (
        <div className="space-y-4 bg-white/[0.04] border border-white/10 rounded-2xl p-6">
          <h3 className="font-semibold text-white">Contact Sync</h3>
          <p className="text-sm text-white/60">Allow TalkSpace to access your contacts to find friends.</p>
          <button onClick={handleContactSync} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full">Allow & Sync Contacts</button>
          <p className="text-xs text-white/40">Unsupported browsers will fallback to email prompt.</p>
          <div><h4 className="font-medium mt-4 text-white">Stickers</h4>{packs.map((p:any)=>(<div key={p._id} className="flex items-center gap-2 py-1"><img src={p.thumbnail} className="w-8 h-8 rounded" alt="thumb" /><span className="text-sm text-white/70">{p.name}</span></div>))}</div>
        </div>
      )}

      {tab==="about" && (
        <div className="space-y-2 bg-white/[0.04] border border-white/10 rounded-2xl p-6">
          <h3 className="font-semibold text-white">About TalkSpace</h3><p className="text-sm text-white/70">Version 1.0.0 • Colorful • Clean</p><p className="text-sm text-white/50">Privacy Policy: Your data is encrypted. Terms apply. Help at support@talkspace.app</p>
        </div>
      )}

      {tab==="founder" && (
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-500 flex items-center justify-center text-white font-bold">Fi</div>
            <div>
              <h3 className="text-white font-semibold text-lg">Founder Information</h3>
              <p className="text-white/60 text-xs">Leadership & vision behind TalkSpace</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-6 flex flex-col items-center text-center gap-4 hover:bg-white/10 transition">
              <img src="/founder-gourav.jpeg" alt="Gourav" className="w-24 h-24 rounded-2xl object-cover border-2 border-indigo-500/20 shadow-lg" onError={(e)=>{ (e.target as HTMLImageElement).src="/founder-gourav.svg"; }} />
              <div>
                <h4 className="text-white font-semibold">Gourav</h4>
                <p className="text-white/40 text-xs mt-1">Co-Founder</p>
              </div>
              <div className="w-full h-px bg-white/10 my-1" />
              <p className="text-white/30 text-xs">Details to be added</p>
            </div>

            <div className="rounded-2xl bg-white/5 border border-white/10 p-6 flex flex-col items-center text-center gap-4 hover:bg-white/10 transition">
              <img src="/founder-anand.jpeg" alt="Anand" className="w-24 h-24 rounded-2xl object-cover border-2 border-sky-500/20 shadow-lg" onError={(e)=>{ (e.target as HTMLImageElement).src="/founder-anand.svg"; }} />
              <div>
                <h4 className="text-white font-semibold">Anand</h4>
                <p className="text-white/40 text-xs mt-1">Co-Founder</p>
              </div>
              <div className="w-full h-px bg-white/10 my-1" />
              <p className="text-white/30 text-xs">Details to be added</p>
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-[#0b0d12] border border-white/10 p-4">
            <p className="text-white/40 text-xs uppercase tracking-wide">About</p>
            <p className="text-white/50 text-sm mt-2 leading-relaxed">
              Founder information is structured to allow easy addition of biography, roles, and links in the future without changing the layout. This section is intentionally minimal.
            </p>
          </div>

          <div className="mt-4 flex items-center justify-center gap-2 text-white/30 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            TalkSpace • Founder section ready
          </div>
        </div>
      )}
            </div>
          </div>
        </div>
      </div>
      <MobileBottomNav active="home" visible={navVisible} />
    </div>
  )
}

export default SettingsPage;
