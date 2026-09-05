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
  const [currentCallId, setCurrentCallId] = useState<string | null>(null);
  const [missedCallMsg,   setMissedCallMsg]   = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localVideoRef  = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  // Persistent media streams – survive minimize/restore (root cause fix for black video)
  const localStreamRef  = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const peerRef         = useRef<RTCPeerConnection | null>(null);
  const connectedAtRef  = useRef<number | null>(null);

  const callStatusRef  = useRef<CallStatus>("idle");
  const currentCallIdRef = useRef<string | null>(null);
  const timeoutRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ringtoneRef    = useRef<HTMLAudioElement | null>(null);
  const dialtoneRef    = useRef<HTMLAudioElement | null>(null);

  // keep ref in sync
  useEffect(() => { callStatusRef.current = callStatus; }, [callStatus]);
  useEffect(() => { currentCallIdRef.current = currentCallId; }, [currentCallId]);

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
        socket.emit("call-missed", { to: toUserId, callId: currentCallIdRef.current });
        stopAllAudio();
        setCallStatus("idle");
        setCallUser(null);
        setActiveCallUserId(null);
        setCurrentCallId(null);
        setMissedCallMsg(`${callerName} is not responding right now`);
        setTimeout(() => setMissedCallMsg(null), 4000);
      }
    }, 30_000);
  };

  const clearMissedTimer = () => {
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
  };

  useEffect(() => {
    const onInitiated = ({ callId }: any) => {
      if(callId) setCurrentCallId(callId);
    };
    const onIncoming = ({ from, offer, user, type, callId }: any) => {
      if (callStatusRef.current === "connected") return; // already in a call
      setIncomingCall({ from, offer, type, callId });
      if(callId) setCurrentCallId(callId);
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
      setCurrentCallId(null);
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
      setCurrentCallId(null);
      setIsMinimized(false);
      setMissedCallMsg("User is busy right now");
      setTimeout(() => setMissedCallMsg(null), 4000);
    };

    const onMissed = () => {
      stopAllAudio();
      setIncomingCall(null);
      setCallStatus("idle");
      setIsMinimized(false);
      setCurrentCallId(null);
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
      setCallStatus("idle"); setIncomingCall(null); setCallUser(null); setActiveCallUserId(null); setCurrentCallId(null); setIsMinimized(false);
      connectedAtRef.current = null;
    };

    socket.on("call-initiated", onInitiated);
    socket.on("incoming-call",  onIncoming);
    socket.on("call-rejected",  onRejected);
    socket.on("call-missed",    onMissed);
    socket.on("call-busy",      onBusy);
    socket.on("error",          onError);
    socket.on("call-ended",     onEnded);
    // Group call listeners (preserve movable window)
    const onIncomingGroup = ({ groupId, callId, from, type, groupName }: any)=>{
      if(callStatusRef.current === "connected") return;
      setIncomingCall({ from, groupId, callId, type, isGroup:true, groupName });
      if(callId) setCurrentCallId(callId);
      // Use group as callUser for UI
      setCallUser({ _id: groupId, username: groupName || "Group", isGroup:true, groupId });
      setCallType(type||"audio");
      setCallStatus("ringing");
      playRingtone();
    };
    const onGroupEnded = ({ callId }: any)=>{
      if(currentCallIdRef.current && callId && currentCallIdRef.current!==callId) return;
      clearMissedTimer(); stopAllAudio();
      setCallStatus("idle"); setIncomingCall(null); setCallUser(null); setActiveCallUserId(null); setCurrentCallId(null); setIsMinimized(false);
      connectedAtRef.current=null;
    };
    const onGroupStarted = ({ callId }: any)=>{ if(callId) setCurrentCallId(callId); };
    socket.on("incoming-group-call", onIncomingGroup);
    socket.on("group-call-ended", onGroupEnded);
    socket.on("group-call-started", onGroupStarted);
    // also listen for group participant joined to keep UI ticking (handled in useCall but ensure ended clears)
    const onGroupParticipantJoined = () => {
      // no-op, useCall handles mesh; just ensure not idle
    };
    socket.on("group-call-participant-joined", onGroupParticipantJoined);

    return () => {
      socket.off("call-initiated", onInitiated);
      socket.off("incoming-call",  onIncoming);
      socket.off("call-rejected",  onRejected);
      socket.off("call-missed",    onMissed);
      socket.off("call-busy",      onBusy);
      socket.off("error",          onError);
      socket.off("call-ended",     onEnded);
      socket.off("incoming-group-call", onIncomingGroup);
      socket.off("group-call-ended", onGroupEnded);
      socket.off("group-call-started", onGroupStarted);
      socket.off("group-call-participant-joined");
    };
  }, []);

  useEffect(() => {
    if (callStatus === "calling") {
      playDialtone();
    } else if (callStatus === "connected" || callStatus === "idle") {
      stopAllAudio();
      clearMissedTimer();
    }
    if (callStatus === "connected") {
      connectedAtRef.current = Date.now();
    }
    if (callStatus === "idle") {
      setIsMinimized(false);
      connectedAtRef.current = null;
    }
  }, [callStatus]);

  // Keep video elements in sync whenever streams or minimize toggles
  const attachStreams = () => {
    if (localStreamRef.current && localVideoRef.current) {
      if (localVideoRef.current.srcObject !== localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
        localVideoRef.current.muted = true;
        localVideoRef.current.play().catch(()=>{});
      }
    }
    if (remoteStreamRef.current) {
      if (remoteVideoRef.current && remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
        remoteVideoRef.current.muted = false;
        remoteVideoRef.current.playsInline = true;
        (remoteVideoRef.current as any).autoplay = true;
        remoteVideoRef.current.play().catch(()=>{});
      }
      if (remoteAudioRef.current && remoteAudioRef.current.srcObject !== remoteStreamRef.current) {
        remoteAudioRef.current.srcObject = remoteStreamRef.current;
        remoteAudioRef.current.muted = false;
        remoteAudioRef.current.play().catch(()=>{});
      }
    }
  };

  useEffect(()=>{ attachStreams(); }, [isMinimized, callStatus, callType]);
  // also re-attach when refs mount (poll briefly)
  useEffect(()=>{
    if(callStatus==="idle") return;
    const iv=setInterval(attachStreams, 300);
    return ()=> clearInterval(iv);
  }, [callStatus, isMinimized]);

  const minimizeCall = () => setIsMinimized(true);
  const maximizeCall = () => setIsMinimized(false);

  // Browser back: minimize instead of ending, but allow navigation
  useEffect(()=>{
    const onPopState = ()=>{
      if(callStatusRef.current !== "idle" && !isMinimized){
        // Minimize but do NOT block navigation – user can go to list/settings
        setIsMinimized(true);
      }
    };
    if(typeof window !== "undefined"){
      window.addEventListener("popstate", onPopState);
      return ()=> window.removeEventListener("popstate", onPopState);
    }
  }, [isMinimized]);

  // Cleanup only on explicit end, not minimize
  const cleanupStreams = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t=> t.stop());
      localStreamRef.current = null;
    }
    if (remoteStreamRef.current) {
      // do not stop remote tracks? they will be gc with peer
      remoteStreamRef.current = null;
    }
    if (peerRef.current) {
      try{ peerRef.current.ontrack=null; (peerRef.current as any).onicecandidate=null; peerRef.current.close(); }catch{}
      peerRef.current=null;
    }
    if (localVideoRef.current) localVideoRef.current.srcObject=null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject=null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject=null;
  };

  return (
    <CallContext.Provider value={{
      incomingCall,    setIncomingCall,
      callStatus,      setCallStatus,
      callUser,        setCallUser,
      activeCallUserId,setActiveCallUserId,
      currentCallId, setCurrentCallId,
      callType,        setCallType,
      remoteVideoRef,  localVideoRef, remoteAudioRef,
      localStreamRef, remoteStreamRef, peerRef, connectedAtRef,
      attachStreams, cleanupStreams,
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