import { useEffect, useRef, useState } from "react";
import { socket } from "../../../apis/socket";
import { useGlobalCall } from "../../../context/CallContext";
import { useAuth } from "../../../context/AuthContext";

export function useCall(remoteVideoRef: any, localVideoRef: any, remoteAudioRef: any) {
  const ctx = useGlobalCall();
  const peerRef = ctx.peerRef as React.MutableRefObject<RTCPeerConnection|null>;
  const localStreamRef = ctx.localStreamRef as React.MutableRefObject<MediaStream|null>;
  const remoteStreamRef = ctx.remoteStreamRef as React.MutableRefObject<MediaStream|null>;

  const { setActiveCallUserId, activeCallUserId } = ctx;
  const callSocket = ctx;
  const { user: authUser } = useAuth() as any;
  const getMyId = () => authUser?._id?.toString() || (ctx as any).userId || "";

  const callerIceQueueRef = useRef<any[]>([]);
  const receiverIceQueueRef = useRef<any[]>([]);

  const setRemoteAnswerRef = useRef<((answer: any) => Promise<void>) | undefined>(undefined);
  const addIceCandidateRef = useRef<((candidate: any) => Promise<void>) | undefined>(undefined);
  const cleanupRef = useRef<(() => void) | undefined>(undefined);

  const isMutedRef = useRef(false);
  const isSpeakerMutedRef = useRef(false);

  // GROUP mesh state
  const groupPeersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const groupStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const groupIceQueuesRef = useRef<Map<string, any[]>>(new Map());
  const pendingGroupOffersRef = useRef<any[]>([]);
  const groupCallIdRef = useRef<string | null>(null);
  const [groupTick, setGroupTick] = useState(0);
  const forceGroupUpdate = () => setGroupTick(v=>v+1);
  // expose to context for UI polling
  useEffect(()=>{
    (ctx as any).groupPeersRef = groupPeersRef;
    (ctx as any).groupStreamsRef = groupStreamsRef;
    (ctx as any).groupTick = groupTick;
    (ctx as any).forceGroupUpdate = forceGroupUpdate;
  }, [groupTick]);

  // SOCKET LISTENERS 1-1
  useEffect(() => {
    const handleAnswer = ({ answer }: any) => {
      setRemoteAnswerRef.current?.(answer);
    };
    const handleIce = ({ candidate }: any) => {
      addIceCandidateRef.current?.(candidate);
    };
    const handleCallEnded = () => {
      cleanupRef.current?.();
      callSocket.setCallStatus("idle");
      callSocket.setIncomingCall(null);
      callSocket.setCallUser(null);
      setActiveCallUserId(null);
    };
    socket.on("call-answered", handleAnswer);
    socket.on("ice-candidate", handleIce);
    socket.on("call-ended", handleCallEnded);
    return () => {
      socket.off("call-answered", handleAnswer);
      socket.off("ice-candidate", handleIce);
      socket.off("call-ended", handleCallEnded);
    };
  }, []);

  // helper attach
  const attachWithRetry = (ref:any, stream:MediaStream|null, isLocal=false) => {
    if(!ref || !stream) return;
    const tryAttach = () => {
      if(ref.current){
        ref.current.srcObject = stream;
        if(isLocal){
          ref.current.muted = true;
          ref.current.volume = 0;
        } else {
          if(ref.current) ref.current.muted = false;
        }
        ref.current.play().catch(()=>{});
        return true;
      }
      return false;
    };
    if(!tryAttach()){
      let attempts=0;
      const iv=setInterval(()=>{
        if(tryAttach() || ++attempts>20) clearInterval(iv);
      }, 100);
    }
  };

  const createPeer = (remoteId: string, isGroup=false, groupId?:string) => {
    if(!isGroup){
      remoteStreamRef.current = new MediaStream();
    }
    const peer = new RTCPeerConnection({
      iceServers: [
        { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"] },
        {
          urls: ["turn:openrelay.metered.ca:80", "turn:openrelay.metered.ca:443", "turn:openrelay.metered.ca:443?transport=tcp"],
          username: "openrelayproject",
          credential: "openrelayproject",
        },
        {
          urls: [
            "turn:global.relay.metered.ca:80",
            "turn:global.relay.metered.ca:80?transport=tcp",
            "turn:global.relay.metered.ca:443",
            "turns:global.relay.metered.ca:443?transport=tcp",
          ],
          username: "02d63ed20c3a50f2efc67dc5",
          credential: "vcVLobIoZOjeg5L9",
        },
      ],
      iceCandidatePoolSize: 10,
    });

    peer.onicecandidate = (e) => {
      if (e.candidate) {
        if(isGroup && groupId){
          socket.emit("group-ice-candidate", { groupId, to: remoteId, candidate: e.candidate });
        } else {
          socket.emit("ice-candidate", { to: remoteId, candidate: e.candidate });
        }
      }
    };

    if(isGroup){
      if(!groupStreamsRef.current.has(remoteId)){
        groupStreamsRef.current.set(remoteId, new MediaStream());
      }
      const gStream = groupStreamsRef.current.get(remoteId)!;
      peer.ontrack = (event) => {
        gStream.addTrack(event.track);
        forceGroupUpdate();
        // also keep legacy remote for audio fallback
        if(!remoteStreamRef.current) remoteStreamRef.current = new MediaStream();
        try{ remoteStreamRef.current.addTrack(event.track); }catch{}
        if(event.track.kind==="audio" && remoteAudioRef.current){
          attachWithRetry(remoteAudioRef, gStream, false);
        }
      };
    } else {
      peer.ontrack = (event) => {
        if(!remoteStreamRef.current) remoteStreamRef.current = new MediaStream();
        remoteStreamRef.current.addTrack(event.track);
        if(event.track.kind === "video"){
          attachWithRetry(remoteVideoRef, remoteStreamRef.current, false);
          if(remoteVideoRef.current){
            remoteVideoRef.current.muted = false;
            remoteVideoRef.current.playsInline = true;
          }
        } else if(event.track.kind === "audio"){
          attachWithRetry(remoteAudioRef, remoteStreamRef.current, false);
          attachWithRetry(remoteVideoRef, remoteStreamRef.current, false);
        }
      };
    }

    peer.onconnectionstatechange = () => {
      console.log("🔗 connection:", peer.connectionState, "with", remoteId, isGroup?"(group)":"");
      if(peer.connectionState==="failed" || peer.connectionState==="closed"){
        // cleanup peer entry on failure? keep for retry
      }
    };

    return peer;
  };

  // ICE GATHER HELPER
  const waitForIceGathering = (peer: RTCPeerConnection): Promise<void> => {
    return new Promise((resolve) => {
      if (peer.iceGatheringState === "complete") { resolve(); return; }
      const timeout = setTimeout(() => {
        peer.removeEventListener("icegatheringstatechange", checkState);
        resolve();
      }, 2000);
      const checkState = () => {
        if (peer.iceGatheringState === "complete") {
          clearTimeout(timeout);
          peer.removeEventListener("icegatheringstatechange", checkState);
          resolve();
        }
      };
      peer.addEventListener("icegatheringstatechange", checkState);
    });
  };

  const processGroupOffer = async ({ groupId, offer, from, type }: any)=>{
    if(groupPeersRef.current.has(from)) return;
    try{
      let stream = localStreamRef.current;
      if(!stream){
        try{
          stream = await navigator.mediaDevices.getUserMedia({ audio:{echoCancellation:true, noiseSuppression:true}, video: type==="video"});
          localStreamRef.current = stream;
          if(localVideoRef.current && stream) { localVideoRef.current.srcObject = stream; localVideoRef.current.muted=true; localVideoRef.current.play().catch(()=>{}); }
        }catch(e){
          console.error("getUserMedia failed for group offer", e);
          return;
        }
      }
      const peer = createPeer(from, true, groupId);
      groupPeersRef.current.set(from, peer);
      for(const track of stream.getTracks()) peer.addTrack(track, stream);
      await peer.setRemoteDescription(new RTCSessionDescription(offer));
      const q = groupIceQueuesRef.current.get(from) || [];
      for(const c of q){ try{ await peer.addIceCandidate(new RTCIceCandidate(c)); }catch{} }
      groupIceQueuesRef.current.delete(from);
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      await waitForIceGathering(peer);
      socket.emit("group-call-answer", { groupId, answer: peer.localDescription, to: from });
      forceGroupUpdate();
    }catch(e){ console.error("group offer handling failed", e); }
  };

  // GROUP socket listeners
  useEffect(()=>{
    const onGroupOffer = async (data: any)=>{
      // if we haven't yet accepted group call, queue it
      const status = (ctx as any).callStatusRef?.current || callSocket.callStatus;
      const incoming = (ctx as any).incomingCall;
      const isGroupIncoming = incoming?.isGroup;
      // allow offers only after we are in group call (connected/calling) OR we have accepted
      // if still ringing, queue
      if(status==="ringing" && isGroupIncoming){
        pendingGroupOffersRef.current.push(data);
        console.log("queue group offer before accept from", data.from);
        return;
      }
      if(status==="idle"){
        // not in call – ignore or auto queue if we expect to join soon
        pendingGroupOffersRef.current.push(data);
        return;
      }
      await processGroupOffer(data);
    };
    const onGroupAnswer = async ({ from, answer }: any)=>{
      const peer = groupPeersRef.current.get(from);
      if(peer && peer.signalingState!=="closed"){
        try{ await peer.setRemoteDescription(new RTCSessionDescription(answer)); }catch(e){ console.error("group answer set failed", e); }
        const q = groupIceQueuesRef.current.get(from) || [];
        for(const c of q){ try{ await peer.addIceCandidate(new RTCIceCandidate(c)); }catch{} }
        groupIceQueuesRef.current.delete(from);
      }
    };
    const onGroupIce = async ({ from, candidate }: any)=>{
      const peer = groupPeersRef.current.get(from);
      if(peer && candidate){
        if(peer.remoteDescription){
          try{ await peer.addIceCandidate(new RTCIceCandidate(candidate)); }catch{}
        } else {
          const arr = groupIceQueuesRef.current.get(from) || [];
          arr.push(candidate);
          groupIceQueuesRef.current.set(from, arr);
        }
      } else if(candidate){
        const arr = groupIceQueuesRef.current.get(from) || [];
        arr.push(candidate);
        groupIceQueuesRef.current.set(from, arr);
      }
    };
    const onParticipantJoined = async ({ groupId, userId }: any)=>{
      const myId = getMyId();
      if(!myId || userId===myId) return;
      if(groupPeersRef.current.has(userId)) return;
      // only act if we are in that group call
      const isInGroupCall = (callSocket as any).callUser?.isGroup && (callSocket as any).callUser?._id===groupId && (callSocket.callStatus==="connected" || callSocket.callStatus==="calling");
      if(!isInGroupCall) return;
      try{
        let stream = localStreamRef.current;
        if(!stream){
          const type = callSocket.callType || "audio";
          stream = await navigator.mediaDevices.getUserMedia({ audio:{echoCancellation:true, noiseSuppression:true, autoGainControl:true}, video: type==="video"});
          localStreamRef.current = stream;
          if(localVideoRef.current){ localVideoRef.current.srcObject = stream; localVideoRef.current.muted=true; localVideoRef.current.play().catch(()=>{}); }
        }
        const peer = createPeer(userId, true, groupId);
        groupPeersRef.current.set(userId, peer);
        for(const track of stream.getTracks()) peer.addTrack(track, stream);
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        await waitForIceGathering(peer);
        socket.emit("group-call-offer", { groupId, to: userId, offer: peer.localDescription, type: callSocket.callType || "audio" });
        forceGroupUpdate();
      }catch(e){ console.error("participant joined offer failed", e); }
    };
    const onGroupEnded = ()=>{
      // cleanup group peers but keep local stream until explicit end
      for(const [,pc] of groupPeersRef.current){ try{ pc.close(); }catch{} }
      groupPeersRef.current.clear();
      groupStreamsRef.current.clear();
      groupIceQueuesRef.current.clear();
      forceGroupUpdate();
    };
    socket.on("group-call-offer", onGroupOffer);
    socket.on("group-call-answer", onGroupAnswer);
    socket.on("group-ice-candidate", onGroupIce);
    socket.on("group-call-participant-joined", onParticipantJoined);
    socket.on("group-call-ended", onGroupEnded);
    return ()=>{
      socket.off("group-call-offer", onGroupOffer);
      socket.off("group-call-answer", onGroupAnswer);
      socket.off("group-ice-candidate", onGroupIce);
      socket.off("group-call-participant-joined", onParticipantJoined);
      socket.off("group-call-ended", onGroupEnded);
    };
  },[authUser]);

  // START CALL 1-1
  const startCall = async (to: string, user: any, type: "audio" | "video" = "audio") => {
    if (peerRef.current) { cleanup(); }
    callerIceQueueRef.current = [];
    receiverIceQueueRef.current = [];
    isMutedRef.current = false;
    isSpeakerMutedRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: type === "video",
      });
      localStreamRef.current = stream;
      setActiveCallUserId(to);
      attachWithRetry(localVideoRef, stream, true);
      const peer = createPeer(to);
      peerRef.current = peer;
      for (const track of stream.getTracks()) peer.addTrack(track, stream);
      await peer.setLocalDescription(await peer.createOffer());
      await waitForIceGathering(peer);
      callSocket.setCallType(type);
      callSocket.setCallStatus("calling");
      callSocket.setCallUser(user);
      socket.emit("call-user", { to, offer: peer.localDescription, user, type });
    } catch (err:any) {
      console.error("❌ getUserMedia error", err);
      const msg = err?.name === "NotAllowedError" ? "Microphone/Camera permission denied" : err?.name === "NotFoundError" ? "No camera/mic found" : "Failed to start call";
      try { window.dispatchEvent(new CustomEvent("call-error", { detail: msg })); } catch {}
      setActiveCallUserId(null);
      callSocket.setCallStatus("idle");
      callSocket.setCallUser(null);
    }
  };

  // START GROUP CALL (up to 8 participants, mesh)
  const startGroupCall = async (groupId: string, members: any[], type: "audio" | "video" = "audio") => {
    const myId = getMyId();
    const otherMembers = members.filter((m:any)=>{
      const mid = typeof m === 'string' ? m : m._id?.toString() || m?.toString?.() || "";
      return mid && mid!==myId;
    }).slice(0,7);
    try{
      const stream = await navigator.mediaDevices.getUserMedia({
        audio:{echoCancellation:true, noiseSuppression:true, autoGainControl:true},
        video: type==="video",
      });
      localStreamRef.current = stream;
      if(localVideoRef.current){ localVideoRef.current.srcObject = stream; localVideoRef.current.muted=true; localVideoRef.current.play().catch(()=>{}); }
      // reset group structures
      for(const [,pc] of groupPeersRef.current){ try{ pc.close(); }catch{} }
      groupPeersRef.current.clear();
      groupStreamsRef.current.clear();
      groupIceQueuesRef.current.clear();
      groupCallIdRef.current = `${groupId}_${Date.now()}`;
      callSocket.setCallType(type);
      callSocket.setCallUser({ _id: groupId, username: "Group", isGroup:true, groupId });
      // important: set calling BEFORE emitting so participant-joined handler will run
      callSocket.setCallStatus("calling");
      setActiveCallUserId(groupId);
      // Create peer per other member and send offer
      for(const m of otherMembers){
        const mid = typeof m === 'string' ? m : m._id?.toString() || m.toString();
        const peer = createPeer(mid, true, groupId);
        groupPeersRef.current.set(mid, peer);
        for(const track of stream.getTracks()) peer.addTrack(track, stream);
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        await waitForIceGathering(peer);
        socket.emit("group-call-offer", { groupId, to: mid, offer: peer.localDescription, type });
      }
      socket.emit("group-call-start", { groupId, type });
      // join group room for later participant events
      socket.emit("join-group", { groupId });
      groupCallIdRef.current = `${groupId}_${Date.now()}`;
    }catch(err:any){
      console.error("group start failed", err);
      const msg = err?.name==="NotAllowedError" ? "Mic/Camera denied" : "Failed to start group call";
      window.dispatchEvent(new CustomEvent("call-error",{detail:msg}));
      callSocket.setCallStatus("idle");
    }
  };

  // ACCEPT CALL 1-1
  const acceptCall = async (from: string, offer: any, type = "audio") => {
    if (peerRef.current) {
      peerRef.current.ontrack = null;
      peerRef.current.onicecandidate = null;
      peerRef.current.close();
      peerRef.current = null;
    }
    callerIceQueueRef.current = [];
    receiverIceQueueRef.current = [];
    isMutedRef.current = false;
    isSpeakerMutedRef.current = false;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: type === "video",
    });
    localStreamRef.current = stream;
    setActiveCallUserId(from);
    attachWithRetry(localVideoRef, stream, true);
    const peer = createPeer(from);
    peerRef.current = peer;
    for (const track of stream.getTracks()) peer.addTrack(track, stream);
    await peer.setRemoteDescription(new RTCSessionDescription(offer));
    for (const candidate of receiverIceQueueRef.current) {
      await peer.addIceCandidate(new RTCIceCandidate(candidate));
    }
    receiverIceQueueRef.current = [];
    await peer.setLocalDescription(await peer.createAnswer());
    await waitForIceGathering(peer);
    socket.emit("answer-call", { to: from, answer: peer.localDescription });
    callSocket.setCallStatus("connected");
  };

  const setRemoteAnswer = async (answer: any) => {
    if (!peerRef.current) return;
    await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
    for (const candidate of callerIceQueueRef.current) {
      await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
    }
    callerIceQueueRef.current = [];
    callSocket.setCallStatus("connected");
  };
  setRemoteAnswerRef.current = setRemoteAnswer;

  const addIceCandidate = async (candidate: any) => {
    if (!peerRef.current) return;
    if (!peerRef.current.remoteDescription) {
      callerIceQueueRef.current.push(candidate);
      receiverIceQueueRef.current.push(candidate);
      return;
    }
    try { await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) { console.log("ICE error", e); }
  };
  addIceCandidateRef.current = addIceCandidate;

  const acceptGroupCall = async (groupId: string, callId: string, type: "audio"|"video")=>{
    try{
      const stream = await navigator.mediaDevices.getUserMedia({ audio:{echoCancellation:true, noiseSuppression:true, autoGainControl:true}, video: type==="video" });
      localStreamRef.current = stream;
      if(localVideoRef.current){ localVideoRef.current.srcObject = stream; localVideoRef.current.muted=true; localVideoRef.current.play().catch(()=>{}); }
      // also ensure group structures clean
      // do not clear pending offers yet – we will process them
      setActiveCallUserId(groupId);
      callSocket.setCallType(type);
      callSocket.setCallUser({ _id: groupId, username: "Group", isGroup:true, groupId });
      callSocket.setCallStatus("connected");
      socket.emit("join-group",{ groupId });
      socket.emit("group-call-accept",{ groupId, callId });
      // process any queued offers that arrived before accept
      const queued = [...pendingGroupOffersRef.current];
      pendingGroupOffersRef.current = [];
      for(const off of queued){
        await processGroupOffer(off);
      }
      forceGroupUpdate();
    }catch(e:any){
      console.error("acceptGroupCall failed", e);
      const msg = e?.name==="NotAllowedError" ? "Mic/Camera permission denied" : "Failed to join group call";
      window.dispatchEvent(new CustomEvent("call-error",{detail:msg}));
      callSocket.setCallStatus("idle");
    }
  };

  // CLEANUP
  const cleanup = () => {
    if (peerRef.current) {
      peerRef.current.ontrack = null;
      peerRef.current.onicecandidate = null;
      peerRef.current.close();
      peerRef.current = null;
    }
    for(const [,pc] of groupPeersRef.current){ try{ pc.close(); }catch{} }
    groupPeersRef.current.clear();
    groupStreamsRef.current.clear();
    groupIceQueuesRef.current.clear();
    forceGroupUpdate();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    remoteStreamRef.current = null;
  };
  cleanupRef.current = cleanup;

  // END CALL
  const endCall = () => {
    const cid = (callSocket as any).currentCallId;
    const isGroup = !!(callSocket as any).callUser?.isGroup;
    const targetId = activeCallUserId || (callSocket as any).callUser?._id;
    if(isGroup && targetId){
      const dur = (callSocket as any).connectedAtRef?.current ? Math.floor((Date.now() - (callSocket as any).connectedAtRef.current)/1000) : 0;
      socket.emit("group-call-end", { groupId: targetId, callId: cid, duration: dur });
      socket.emit("leave-group", { groupId: targetId });
    } else {
      if (activeCallUserId) {
        socket.emit("end-call", { to: activeCallUserId, callId: cid });
      } else if(cid){
        socket.emit("end-call", { to: (callSocket as any).callUser?._id, callId: cid });
      }
    }
    cleanup();
    if((callSocket as any).setCurrentCallId) (callSocket as any).setCurrentCallId(null);
    callSocket.setCallStatus("idle");
    callSocket.setIncomingCall(null);
    callSocket.setCallUser(null);
    setActiveCallUserId(null);
  };

  const toggleMute = () => {
    if (!localStreamRef.current) return false;
    isMutedRef.current = !isMutedRef.current;
    localStreamRef.current.getAudioTracks().forEach((t) => { t.enabled = !isMutedRef.current; });
    return isMutedRef.current;
  };

  const facingModeRef = useRef<"user" | "environment">("user");
  const switchCamera = async (): Promise<boolean> => {
    if (!localStreamRef.current) return false;
    const senders = peerRef.current ? peerRef.current.getSenders().filter(s=> s.track?.kind==="video") : [];
    const groupSenders: any[] = [];
    for(const [,pc] of groupPeersRef.current){ groupSenders.push(...pc.getSenders().filter((s:any)=> s.track?.kind==="video")); }
    const allSenders = [...senders, ...groupSenders];
    if(allSenders.length===0 && !peerRef.current && groupPeersRef.current.size===0) return false;
    facingModeRef.current = facingModeRef.current === "user" ? "environment" : "user";
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facingModeRef.current }, audio: false });
      const newVideoTrack = newStream.getVideoTracks()[0];
      for(const sender of allSenders){ try{ await sender.replaceTrack(newVideoTrack); }catch{} }
      const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
      if (oldVideoTrack) { oldVideoTrack.stop(); localStreamRef.current.removeTrack(oldVideoTrack); }
      localStreamRef.current.addTrack(newVideoTrack);
      if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
      return true;
    } catch (err) {
      console.error("switchCamera error", err);
      facingModeRef.current = facingModeRef.current === "user" ? "environment" : "user";
      return false;
    }
  };

  const toggleSpeaker = () => {
    isSpeakerMutedRef.current = !isSpeakerMutedRef.current;
    if (remoteAudioRef.current) remoteAudioRef.current.muted = isSpeakerMutedRef.current;
    // also mute all remote audio elements for group
    return isSpeakerMutedRef.current;
  };

  return {
    startCall,
    startGroupCall,
    acceptGroupCall,
    acceptCall,
    setRemoteAnswer,
    addIceCandidate,
    endCall,
    toggleMute,
    switchCamera,
    toggleSpeaker,
    localStreamRef,
    remoteStreamRef,
    groupPeersRef,
    groupStreamsRef,
    pendingGroupOffersRef,
    attachWithRetry,
  };
}
