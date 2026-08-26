import React, { createContext, useContext, useEffect, useState } from "react";
import * as settingsApi from "../apis/settings.api";
import * as privacyApi from "../apis/privacy.api";
const Ctx=createContext<any>(undefined);
export const SettingsProvider:React.FC<{children:React.ReactNode}>=({children})=>{
  const [userSettings,setUserSettings]=useState<any>(null); const [privacySettings,setPrivacySettings]=useState<any>(null); const [loading,setLoading]=useState(false);
  const fetch=async()=>{ setLoading(true); try{ const [u,p]=await Promise.all([settingsApi.getUserSettings(), privacyApi.getPrivacySettings()]); setUserSettings(u.data.settings); setPrivacySettings(p.data.settings);}catch{} finally{setLoading(false);} };
  useEffect(()=>{ fetch(); },[]);
  const updateUserSettings=async(data:any)=>{ const r=await settingsApi.updateUserSettings(data); setUserSettings(r.data.settings); return r.data.settings; };
  const updatePrivacySettings=async(data:any)=>{ const r=await privacyApi.updatePrivacySettings(data); setPrivacySettings(r.data.settings); return r.data.settings; };
  return <Ctx.Provider value={{userSettings, privacySettings, loading, fetch, updateUserSettings, updatePrivacySettings}}>{children}</Ctx.Provider>;
};
export const useSettings=()=> useContext(Ctx);
