import {
  createContext, useContext, useEffect, useRef, useState,
} from "react";
import { socket } from "../apis/socket";

type CallStatus = "idle" | "calling" | "ringing" | "connected";

const CallContext = createContext<any>(null);

function makeAudio(src: string, loop = true) {
  const a = new Audio(src);
  a.loop = loop;
  return a;
}

const RINGTONE_SRC  = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
const DIALTONE_SRC  = "https://assets.mixkit.co/active_storage/sfx/209/209-preview.mp3";

/* ─── provider ──────────────────────────────────────────────────────────── */
export const CallProvider = ({ children }: any) => {
  const [incomingCall,    setIncomingCall]    = useState<any>(null);
  const [callStatus,      setCallStatus]      = useState<CallStatus>("idle");
  const [callUser,        setCallUser]        = useState<any>(null);
  const [callType,        setCallType]        = useState<"audio" | "video">("audio");
  const [activeCallUserId,setActiveCallUserId]= useState<string | null>(null);
  const [missedCallMsg,   setMissedCallMsg]   = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localVideoRef  = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  const callStatusRef  = useRef<CallStatus>("idle");
  const timeoutRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ringtoneRef    = useRef<HTMLAudioElement | null>(null);
  const dialtoneRef    = useRef<HTMLAudioElement | null>(null);

  // keep ref in sync
  useEffect(() => { callStatusRef.current = callStatus; }, [callStatus]);

  /* ── audio control ───────────────────────────────────────────────────── */
  const stopAllAudio = () => {
    [ringtoneRef, dialtoneRef].forEach(r => {
      if (r.current) { r.current.pause(); r.current.currentTime = 0; }
    });
  };

  // Ringtone — receiver hears this
  const playRingtone = () => {
    stopAllAudio();
    if (!ringtoneRef.current) ringtoneRef.current = makeAudio(RINGTONE_SRC);
    ringtoneRef.current.play().catch(() => {});
  };

  const playDialtone = () => {
    stopAllAudio();
    if (!dialtoneRef.current) dialtoneRef.current = makeAudio(DIALTONE_SRC);
    dialtoneRef.current.play().catch(() => {});
  };

  /* ── 30s auto-cutoff ─────────────────────────────────────────────────── */
  const startMissedTimer = (toUserId: string, callerName: string) => {
    clearMissedTimer();
    timeoutRef.current = setTimeout(() => {
      if (callStatusRef.current === "calling") {
        socket.emit("call-missed", { to: toUserId });
        stopAllAudio();
        setCallStatus("idle");
        setCallUser(null);
        setActiveCallUserId(null);
        setMissedCallMsg(`${callerName} is not responding right now`);
        setTimeout(() => setMissedCallMsg(null), 4000);
      }
    }, 30_000);
  };

  const clearMissedTimer = () => {
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
  };

  useEffect(() => {
    const onIncoming = ({ from, offer, user, type }: any) => {
      if (callStatusRef.current === "connected") return; // already in a call
      setIncomingCall({ from, offer, type });
      setCallUser(user);
      setCallStatus("ringing");
      setCallType(type);
      playRingtone();
    };

    const onRejected = () => {
      clearMissedTimer();
      stopAllAudio();
      setCallStatus("idle");
      setIncomingCall(null);
      setCallUser(null);
      setActiveCallUserId(null);
      setIsMinimized(false);
      setMissedCallMsg("User declined the call");
      setTimeout(() => setMissedCallMsg(null), 3000);
    };

    const onBusy = () => {
      clearMissedTimer();
      stopAllAudio();
      setCallStatus("idle");
      setCallUser(null);
      setActiveCallUserId(null);
      setIsMinimized(false);
      setMissedCallMsg("User is busy right now");
      setTimeout(() => setMissedCallMsg(null), 4000);
    };

    const onMissed = () => {
      stopAllAudio();
      setIncomingCall(null);
      setCallStatus("idle");
      setIsMinimized(false);
    };

    const onError = (msg:any) => {
      const text = typeof msg === "string" ? msg : msg?.message || "Call error";
      if (text.includes("offline")) {
        clearMissedTimer(); stopAllAudio();
        setMissedCallMsg("User is offline");
        setTimeout(()=> setMissedCallMsg(null), 3000);
        setCallStatus("idle"); setCallUser(null); setActiveCallUserId(null);
      } else if (text.includes("already in a call")) {
        setMissedCallMsg("You are already in a call");
        setTimeout(()=> setMissedCallMsg(null), 3000);
      }
      console.warn("Socket error:", text);
    };
    const onEnded = () => {
      clearMissedTimer(); stopAllAudio();
      setCallStatus("idle"); setIncomingCall(null); setCallUser(null); setActiveCallUserId(null); setIsMinimized(false);
    };

    socket.on("incoming-call",  onIncoming);
    socket.on("call-rejected",  onRejected);
    socket.on("call-missed",    onMissed);
    socket.on("call-busy",      onBusy);
    socket.on("error",          onError);
    socket.on("call-ended",     onEnded);

    return () => {
      socket.off("incoming-call",  onIncoming);
      socket.off("call-rejected",  onRejected);
      socket.off("call-missed",    onMissed);
      socket.off("call-busy",      onBusy);
      socket.off("error",          onError);
      socket.off("call-ended",     onEnded);
    };
  }, []);

  useEffect(() => {
    if (callStatus === "calling") {
      playDialtone();
    } else if (callStatus === "connected" || callStatus === "idle") {
      stopAllAudio();
      clearMissedTimer();
    }
    if (callStatus === "idle") setIsMinimized(false);
  }, [callStatus]);

  const minimizeCall = () => setIsMinimized(true);
  const maximizeCall = () => setIsMinimized(false);

  // Auto-minimize on browser back when call active
  useEffect(()=>{
    const onPopState = ()=>{
      if(callStatusRef.current !== "idle" && !isMinimized){
        // Prevent actual back navigation, minimize instead
        window.history.pushState(null, "");
        setIsMinimized(true);
      }
    };
    if(typeof window !== "undefined"){
      window.addEventListener("popstate", onPopState);
      // Push state when call becomes active to intercept back
      if(callStatus === "calling" || callStatus === "connected" || callStatus === "ringing"){
        window.history.pushState({callMinimized:true}, "");
      }
      return ()=> window.removeEventListener("popstate", onPopState);
    }
  }, [callStatus, isMinimized]);

  return (
    <CallContext.Provider value={{
      incomingCall,    setIncomingCall,
      callStatus,      setCallStatus,
      callUser,        setCallUser,
      activeCallUserId,setActiveCallUserId,
      callType,        setCallType,
      remoteVideoRef,  localVideoRef, remoteAudioRef,
      missedCallMsg,
      isMinimized, setIsMinimized,
      minimizeCall, maximizeCall,
      startMissedTimer,
      clearMissedTimer,
      stopAllAudio,
    }}>
      {children}
    </CallContext.Provider>
  );
};

export const useGlobalCall = () => useContext(CallContext);