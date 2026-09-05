import { useState, useEffect, useRef } from "react";
import { getPrivacySettings, updatePrivacySettings, getBlockedUsers, unblockUser } from "../apis/privacy.api";
import { getUserSettings, updateUserSettings, clearCache, getNetworkUsage, submitFeedback } from "../apis/settings.api";
import { setTheme as applyLocalTheme } from "../utils/theme";
import { useProfile } from "./profile/useProfile";
import { ProfileView } from "./profile/ProfileView";
import AppNavbar from "../components/layout/AppNavbar";
import MobileBottomNav from "../components/layout/MobileBottomNav";
import { useScrollDirection } from "../utils/useScrollDirection";
import { User, Lock, MessageCircle, Palette, Bell, Database, Languages, HelpCircle, ChevronRight, UserCircle } from "lucide-react";

const TABS = [
  { id:"account", label:"Account", desc:"Security notifications, change number", icon: UserCircle },
  { id:"privacy", label:"Privacy", desc:"Blocked contacts, disappearing messages", icon: Lock },
  { id:"chats", label:"Chats", desc:"Theme, wallpaper, chat history", icon: MessageCircle },
  { id:"appearance", label:"Appearance", desc:"Theme, chat wallpaper", icon: Palette },
  { id:"notifications", label:"Notifications", desc:"Message, group & call tones", icon: Bell },
  { id:"storage", label:"Storage and data", desc:"Network usage, auto-download", icon: Database },
  { id:"language", label:"App language", desc:"English (device's language)", icon: Languages },
  { id:"help", label:"Help and feedback", desc:"Help center, contact us, privacy policy", icon: HelpCircle },
];

export default function SettingsPage(){
  const [tab, setTab] = useState<string | null>(null);
  const [privacy, setPrivacy] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [blocked, setBlocked] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navVisible = useScrollDirection(scrollRef);
  const profileState = useProfile();
  const [appLang, setAppLang] = useState(()=> localStorage.getItem("appLanguage") || "en");
  const [helpMsg, setHelpMsg] = useState("");
  const [networkUsage, setNetworkUsage] = useState<any>(null);
  const [helpSending, setHelpSending] = useState(false);

  const load = async()=>{
    try{ const p=await getPrivacySettings(); setPrivacy(p.data.settings||p.data); }catch{}
    try{ const s=await getUserSettings(); setSettings(s.data.settings); if(s.data.settings?.theme) applyLocalTheme(s.data.settings.theme); if(s.data.settings?.language) { setAppLang(s.data.settings.language); localStorage.setItem("appLanguage", s.data.settings.language); } }catch{}
    try{ const b=await getBlockedUsers(); setBlocked(b.data.blocked||[]);}catch{}
    try{ const n=await getNetworkUsage(); setNetworkUsage(n.data.usage); }catch{}
  };
  useEffect(()=>{ load(); },[]);
  const updatePrivacy = async(k:string,v:any)=>{ const r=await updatePrivacySettings({[k]:v}); setPrivacy(r.data.settings); };
  const updateSettings = async(k:string,v:any)=>{ const r=await updateUserSettings({[k]:v}); setSettings(r.data.settings); if(k==="theme"){ applyLocalTheme(v); window.dispatchEvent(new Event("theme-change")); } if(k==="language"){ localStorage.setItem("appLanguage", v); setAppLang(v); try{ window.dispatchEvent(new Event("language-change")); }catch{} } };
  const handleLangChange = async (v:string)=>{
    localStorage.setItem("appLanguage", v); setAppLang(v);
    try{ await updateUserSettings({language: v}); }catch(e:any){ console.error(e); }
    // Simple i18n: update document lang attribute
    try{ document.documentElement.lang = v; }catch{}
  };
  const handleHelpSubmit = async ()=>{
    if(!helpMsg.trim()){ alert("Please enter a message"); return; }
    setHelpSending(true);
    try{
      await submitFeedback({ message: helpMsg, category: "general" });
      alert("Thank you for your feedback! Submitted successfully.");
      setHelpMsg("");
    }catch(e:any){ alert(e.response?.data?.msg || "Failed to submit feedback"); }
    finally{ setHelpSending(false); }
  };

  const renderContent = ()=>{
    if(!tab) return null;
    if(tab==="account"){
      return <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 md:p-6 space-y-4">
        <h3 className="font-semibold text-white flex items-center gap-2"><User size={18}/> Account</h3>
        <p className="text-white/60 text-xs">Manage your account information</p>
        <div className="mt-2">{profileState.initializing ? <p className="text-white/60 text-sm">Loading profile…</p> : <ProfileView {...profileState} logout={profileState.handleLogout} />}</div>
        <div className="space-y-2 pt-2 border-t border-white/10">
          <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/10">
            <div><p className="text-sm text-white/80">Change Password</p><p className="text-xs text-white/40">Update your password securely</p></div>
            <button onClick={async()=>{
              const cur=prompt("Current password:"); if(!cur) return;
              const nw=prompt("New password (min 6 chars):"); if(!nw) return;
              const conf=prompt("Confirm new password:"); if(nw!==conf){ alert("Passwords do not match"); return; }
              try{ const { changePasswordApi } = await import("../apis/auth.api"); await changePasswordApi({currentPassword:cur, newPassword:nw}); alert("Password changed"); }catch(e:any){ alert(e.response?.data?.msg||"Failed"); }
            }} className="px-3 py-1.5 rounded-full bg-indigo-600 text-white text-xs">Change</button>
          </div>
          <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/10">
            <div><p className="text-sm text-white/80">Change Email</p><p className="text-xs text-white/40">Update email address</p></div>
            <button onClick={async()=>{
              const em=prompt("New email:"); if(!em) return;
              const pw=prompt("Enter current password to confirm:"); if(!pw) return;
              try{ const { changeEmailApi } = await import("../apis/auth.api"); const r=await changeEmailApi({newEmail:em, password:pw}); alert("Email updated to "+r.data.email); }catch(e:any){ alert(e.response?.data?.msg||"Failed"); }
            }} className="px-3 py-1.5 rounded-full bg-indigo-600 text-white text-xs">Change</button>
          </div>
          <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/10">
            <div><p className="text-sm text-white/80">Security notifications</p><p className="text-xs text-white/40">Get notified about security changes</p></div>
            <input type="checkbox" checked={!!settings?.securityNotifications} onChange={e=> updateSettings("securityNotifications", e.target.checked)} className="accent-indigo-600" />
          </div>
          <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/10">
            <div><p className="text-sm text-white/80">Two-step verification</p><p className="text-xs text-white/40">Add extra security (PIN)</p></div>
            <input type="checkbox" checked={!!settings?.twoStepEnabled} onChange={e=>{
              if(e.target.checked){ const pin=prompt("Set 2FA PIN (min 4):"); if(!pin || pin.length<4){ alert("PIN too short"); return; } }
              updateSettings("twoStepEnabled", e.target.checked);
            }} className="accent-indigo-600" />
          </div>
        </div>
      </div>;
    }
    if(tab==="privacy" && privacy){
      return <div className="space-y-4 bg-white/[0.04] border border-white/10 rounded-2xl p-6">
        <h3 className="font-semibold text-white flex items-center gap-2"><Lock size={18}/> Privacy</h3>
        {(["lastSeenVisibility","onlineStatusVisibility","profilePhotoVisibility","statusVisibility"] as const).map(k=>(
          <div key={k} className="flex justify-between items-center">
            <span className="text-sm text-white/80">{k}</span>
            <select value={privacy[k]} onChange={e=>updatePrivacy(k,e.target.value)} className="bg-[#0b0d12] border border-white/10 rounded-lg px-2 py-1 text-sm text-white">
              <option value="everyone">Everyone</option><option value="friends">My Contacts</option><option value="nobody">Nobody</option>
            </select>
          </div>
        ))}
        <div className="flex justify-between items-center"><span className="text-sm text-white/80">Read Receipts</span><input type="checkbox" checked={privacy.readReceiptEnabled} onChange={e=>updatePrivacy("readReceiptEnabled",e.target.checked)} className="accent-indigo-600" /></div>
        <div><h4 className="font-medium mt-4 text-white">Blocked Users</h4>{blocked.length===0? <p className="text-sm text-white/50">No blocked users</p>: blocked.map((u:any)=>(<div key={u._id} className="flex justify-between py-2 border-b border-white/5"><span className="text-white/80 text-sm">{u.username}</span><button onClick={async()=>{await unblockUser(u._id); load();}} className="text-indigo-400 text-sm">Unblock</button></div>))}</div>
      </div>;
    }
    if(tab==="chats" && settings){
      return <div className="space-y-4 bg-white/[0.04] border border-white/10 rounded-2xl p-6">
        <h3 className="font-semibold text-white flex items-center gap-2"><MessageCircle size={18}/> Chats</h3>
        <div className="flex justify-between items-center"><span className="text-sm text-white/80">Enter to Send</span><input type="checkbox" checked={settings.enterToSend} onChange={e=>updateSettings("enterToSend",e.target.checked)} className="accent-indigo-600" /></div>
        <div className="flex justify-between items-center"><span className="text-sm text-white/80">Font Size</span><select value={settings.fontSize} onChange={e=>updateSettings("fontSize",e.target.value)} className="bg-[#0b0d12] border border-white/10 rounded-lg px-2 py-1 text-sm text-white"><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option></select></div>
        <div className="flex justify-between items-center"><span className="text-sm text-white/80">Keep chats archived</span><input type="checkbox" checked={!!settings.keepChatsArchived} onChange={e=>updateSettings("keepChatsArchived", e.target.checked)} className="accent-indigo-600" /></div>
        <p className="text-xs text-white/40">When enabled, archived chats stay archived even when new messages arrive.</p>
        <button onClick={async()=>{await clearCache(); alert("Cache cleared");}} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-sm">Clear Media Cache</button>
      </div>;
    }
    if(tab==="appearance" && settings){
      return <div className="space-y-6 bg-white/[0.04] border border-white/10 rounded-2xl p-6">
        <h3 className="font-semibold text-white flex items-center gap-2"><Palette size={18}/> Appearance</h3>
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
      </div>;
    }
    if(tab==="notifications" && settings){
      return <div className="space-y-4 bg-white/[0.04] border border-white/10 rounded-2xl p-6">
        <h3 className="font-semibold text-white flex items-center gap-2"><Bell size={18}/> Notifications</h3>
        {["pushNotificationsEnabled","soundEnabled","vibrationEnabled"].map(k=>(
          <div key={k} className="flex justify-between items-center"><span className="text-sm text-white/80">{k}</span><input type="checkbox" checked={settings[k]} onChange={e=>updateSettings(k,e.target.checked)} className="accent-indigo-600" /></div>
        ))}
      </div>;
    }
    if(tab==="storage"){
      return <div className="space-y-4 bg-white/[0.04] border border-white/10 rounded-2xl p-6">
        <h3 className="font-semibold text-white flex items-center gap-2"><Database size={18}/> Storage and data</h3>
        <p className="text-sm text-white/60">Manage storage and network usage. TalkSpace stores media locally for faster access.</p>
        <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
          <p className="text-xs text-white/40">Network usage</p>
          <p className="text-sm text-white/80">Messages: {networkUsage?.messageCount ?? "—"} · Cache: {networkUsage ? `${Math.round((networkUsage.mediaCacheSize||0)/1024)} KB` : "—"}</p>
          <p className="text-xs text-white/30">Last cleared: {networkUsage?.lastCacheClear ? new Date(networkUsage.lastCacheClear).toLocaleString() : "Never"}</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-white/80">Auto-download quality</p>
          {(["photos","videos","documents"] as const).map(k=>(
            <div key={k} className="flex justify-between items-center p-2 rounded-xl bg-white/5 border border-white/10">
              <span className="text-sm text-white/70 capitalize">{k}</span>
              <input type="checkbox" checked={!!settings?.autoDownloadMedia?.[k]} onChange={e=>{
                const cur=settings?.autoDownloadMedia || {photos:true, videos:false, documents:false};
                updateSettings("autoDownloadMedia", {...cur, [k]: e.target.checked});
              }} className="accent-indigo-600" />
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-white/80">Use less data for calls</p>
          <div className="flex justify-between items-center p-2 rounded-xl bg-white/5 border border-white/10">
            <span className="text-sm text-white/70">Low data mode {settings?.audioQuality==="low" && settings?.videoQuality==="low" ? "(On)" : "(Off)"}</span>
            <input type="checkbox" checked={settings?.audioQuality==="low" && settings?.videoQuality==="low"} onChange={e=>{
              const low=e.target.checked;
              updateSettings("audioQuality", low?"low":"medium");
              updateSettings("videoQuality", low?"low":"medium");
            }} className="accent-indigo-600" />
          </div>
          <p className="text-xs text-white/40">When enabled, reduces video resolution and bitrate via WebRTC constraints.</p>
        </div>
        <button onClick={async()=>{await clearCache(); const n=await getNetworkUsage(); setNetworkUsage(n.data.usage); alert("Storage cleared");}} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-sm">Clear Storage Cache</button>
      </div>;
    }
    if(tab==="language"){
      return <div className="space-y-4 bg-white/[0.04] border border-white/10 rounded-2xl p-6">
        <h3 className="font-semibold text-white flex items-center gap-2"><Languages size={18}/> App language</h3>
        <p className="text-sm text-white/60">Select your preferred language. Currently supported: English.</p>
        <select value={appLang} onChange={e=>handleLangChange(e.target.value)} className="w-full bg-[#0b0d12] border border-white/10 rounded-xl px-3 py-2 text-white text-sm">
          <option value="en">English (device's language)</option>
          <option value="en">English</option>
          <option value="hi">Hindi - coming soon</option>
        </select>
        <p className="text-xs text-white/40">Language preference is stored locally and persists after refresh.</p>
      </div>;
    }
    if(tab==="help"){
      return <div className="space-y-4 bg-white/[0.04] border border-white/10 rounded-2xl p-6">
        <h3 className="font-semibold text-white flex items-center gap-2"><HelpCircle size={18}/> Help and feedback</h3>
        <p className="text-sm text-white/60">Need help? Contact support or send feedback.</p>
        <div className="p-3 rounded-xl bg-white/5 border border-white/10">
          <p className="text-xs text-white/40">Support</p><p className="text-sm text-white/80">support@talkspace.app</p>
          <p className="text-xs text-white/40 mt-2">Privacy Policy</p><p className="text-sm text-white/50">Your data is encrypted. Terms apply.</p>
        </div>
        <textarea value={helpMsg} onChange={e=>setHelpMsg(e.target.value)} placeholder="Describe your issue or feedback..." rows={4} className="w-full bg-[#0b0d12] border border-white/10 rounded-xl px-3 py-2 text-white placeholder:text-white/40 text-sm" />
        <button onClick={handleHelpSubmit} disabled={helpSending} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-white/10 disabled:text-white/30 text-white rounded-full text-sm">{helpSending ? "Sending..." : "Submit Feedback"}</button>
        <p className="text-xs text-white/40">Feedback is submitted to backend and persists.</p>
      </div>;
    }
    return <div className="p-6 text-white/60 text-sm">Loading…</div>;
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
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 pb-28 md:pb-6">
          <div className="bg-[#121520]/90 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl shadow-black/40 overflow-hidden">
            <div className="p-6 md:p-8 border-b border-white/10">
              <div className="flex items-center gap-3">
                {tab && <button onClick={()=> setTab(null)} className="p-2 rounded-full hover:bg-white/10 text-white"><ChevronRight className="rotate-180" size={20}/></button>}
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{tab ? TABS.find(t=>t.id===tab)?.label : "Settings"}</h1>
                  <p className="text-sm text-white/60 mt-1">{tab ? TABS.find(t=>t.id===tab)?.desc : "Manage your TalkSpace experience"}</p>
                </div>
              </div>
            </div>
            <div className="p-4 md:p-6">
              {!tab ? (
                <div className="space-y-1">
                  {TABS.map(t=>{
                    const Icon=t.icon;
                    return <button key={t.id} onClick={()=> setTab(t.id)} className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-white/[0.04] border border-transparent hover:border-white/10 transition text-left">
                      <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0"><Icon size={20} className="text-white/80"/></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm">{t.label}</p>
                        <p className="text-white/50 text-xs truncate">{t.desc}</p>
                      </div>
                      <ChevronRight size={16} className="text-white/30"/>
                    </button>;
                  })}
                </div>
              ) : renderContent()}
            </div>
          </div>
        </div>
      </div>
      <MobileBottomNav active="home" visible={navVisible} />
    </div>
  );
}
