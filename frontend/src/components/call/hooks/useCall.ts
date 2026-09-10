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

  // GROUP mesh state – authoritative per-peer
  const groupPeersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const groupStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const groupIceQueuesRef = useRef<Map<string, any[]>>(new Map());
  const pendingGroupOffersRef = useRef<any[]>([]);
  const groupCallIdRef = useRef<string | null>(null);
  // Perfect negotiation per-peer
  const groupMakingOfferRef = useRef<Map<string, boolean>>(new Map());
  const groupPoliteRef = useRef<Map<string, boolean>>(new Map());
  const groupIsSettingRemoteAnswerRef = useRef<Map<string, boolean>>(new Map());
  const [groupTick, setGroupTick] = useState(0);
  const forceGroupUpdate = () => setGroupTick(v=>v+1);
  // expose to context for UI polling
  useEffect(()=>{
    (ctx as any).groupPeersRef = groupPeersRef;
    (ctx as any).groupStreamsRef = groupStreamsRef;
    (ctx as any).groupTick = groupTick;
    (ctx as any).forceGroupUpdate = forceGroupUpdate;
    (ctx as any).groupMakingOfferRef = groupMakingOfferRef;
    (ctx as any).groupPoliteRef = groupPoliteRef;
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
    const myId = getMyId();
    const isPolite = isGroup ? String(myId) < String(remoteId) : true;
    if(isGroup){
      groupPoliteRef.current.set(remoteId, isPolite);
      groupMakingOfferRef.current.set(remoteId, false);
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
      // Robust ontrack: handle both event.streams[0] and event.track
      peer.ontrack = (event) => {
        const track = event.track;
        const streamFromEvent = event.streams && event.streams[0] ? event.streams[0] : null;
        console.log(`[GROUP-CALL] ontrack from ${remoteId} kind=${track.kind} readyState=${track.readyState} enabled=${track.enabled} muted=${track.muted} streamId=${streamFromEvent?.id||'none'} tracks=${streamFromEvent ? streamFromEvent.getTracks().map(t=>t.kind).join(',') : 'no-stream'}`);
        // Prefer adding the track itself to our per-peer MediaStream
        const existingIds = new Set(gStream.getTracks().map(t=> t.id));
        if(!existingIds.has(track.id)){
          try {
            gStream.addTrack(track);
            console.log(`[GROUP-CALL] Added ${track.kind} track to ${remoteId} -> now ${gStream.getTracks().length} tracks (${gStream.getVideoTracks().length} video, ${gStream.getAudioTracks().length} audio)`);
            // Log detailed track info
            track.onended = () => console.log(`[GROUP-CALL] track ended ${remoteId} ${track.kind}`);
            track.onmute = () => console.log(`[GROUP-CALL] track muted ${remoteId} ${track.kind}`);
            track.onunmute = () => console.log(`[GROUP-CALL] track unmuted ${remoteId} ${track.kind} - should now render`);
          } catch(e){ console.error(`[GROUP-CALL] addTrack failed for ${remoteId}`, e); }
        } else {
          console.log(`[GROUP-CALL] duplicate track ignored for ${remoteId} ${track.kind}`);
        }
        // If event provided a stream with multiple tracks, merge all (fallback)
        if(streamFromEvent && streamFromEvent.getTracks().length > 1){
          for(const t of streamFromEvent.getTracks()){
            if(!existingIds.has(t.id) && t.id !== track.id){
              try{ gStream.addTrack(t); console.log(`[GROUP-CALL] merged extra ${t.kind} from stream for ${remoteId}`);}catch{}
            }
          }
        }
        // Force React update
        forceGroupUpdate();
        // Ensure any video element for this participant re-attaches and plays
        // We do not rely solely on global remote ref; per-peer stream will be bound in UI
        // Also keep legacy remote for audio fallback (single audio element)
        if(!remoteStreamRef.current) remoteStreamRef.current = new MediaStream();
        try{ 
          const has = Array.from(remoteStreamRef.current.getTracks()).find(t=> t.id===track.id);
          if(!has) remoteStreamRef.current.addTrack(track); 
        }catch{}
        if(track.kind==="audio" && remoteAudioRef.current){
          attachWithRetry(remoteAudioRef, gStream, false);
        }
        // Detailed sender/receiver audit
        setTimeout(()=>{
          try{
            const senders = peer.getSenders();
            const receivers = peer.getReceivers();
            console.log(`[GROUP-CALL] Peer ${remoteId} senders: ${senders.map(s=> s.track ? s.track.kind+`(${s.track.enabled?'enabled':'disabled'},${s.track.readyState})` : 'no-track').join(', ')}`);
            console.log(`[GROUP-CALL] Peer ${remoteId} receivers: ${receivers.map(r=> r.track ? r.track.kind+`(${r.track.readyState},${(r.track as any).muted?'muted':'unmuted'})` : 'no-track').join(', ')}`);
            console.log(`[GROUP-CALL] gStream ${remoteId} videoTracks=${gStream.getVideoTracks().length} audioTracks=${gStream.getAudioTracks().length} id=${gStream.id}`);
            if(gStream.getVideoTracks().length>0){
              const vt = gStream.getVideoTracks()[0];
              console.log(`[GROUP-CALL] Video track for ${remoteId}: readyState=${vt.readyState} enabled=${vt.enabled} muted=${vt.muted} id=${vt.id}`);
            }
          }catch{}
        }, 300);
      };
      peer.onconnectionstatechange = () => {
        console.log(`[GROUP-CALL] connection ${myId} -> ${remoteId} state=${peer.connectionState} ice=${peer.iceConnectionState} sig=${peer.signalingState}`);
        if(peer.connectionState==="failed"){
          // attempt ICE restart for robustness
          console.warn(`[GROUP-CALL] peer failed, will retry ICE restart for ${remoteId}`);
          // don't auto-clear; let sync/reconciliation recreate if needed
        }
      };
      peer.oniceconnectionstatechange = () => {
        console.log(`[GROUP-CALL] ICE ${remoteId} ${peer.iceConnectionState}`);
      };
      peer.onsignalingstatechange = () => {
        console.log(`[GROUP-CALL] signaling ${remoteId} ${peer.signalingState}`);
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
      peer.onconnectionstatechange = () => {
        console.log("🔗 connection:", peer.connectionState, "with", remoteId, isGroup?"(group)":"");
      };
    }

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

  const processGroupOffer = async ({ groupId, offer, from, type, callId }: any)=>{
    const myId = getMyId();
    if (from && myId && String(from)===String(myId)) return;
    // callId validation – ignore stale calls
    const expectedCallId = groupCallIdRef.current || (callSocket as any).currentCallId;
    if(callId && expectedCallId && String(callId)!==String(expectedCallId)){
      console.warn(`[GROUP-CALL] stale offer ignored callId ${callId} expected ${expectedCallId} from ${from}`);
      // still allow if we have no callId yet (late joiner sync will set it)
      if(groupCallIdRef.current) return;
    }
    console.log(`[GROUP-CALL] Received offer from ${from} group=${groupId} type=${type} polite=${groupPoliteRef.current.get(from)}`);
    let peer = groupPeersRef.current.get(from);
    const polite = groupPoliteRef.current.get(from) ?? (String(myId) < String(from));
    const isMakingOffer = groupMakingOfferRef.current.get(from) || false;
    const signalingState = peer?.signalingState;
    const offerCollision = peer && (isMakingOffer || signalingState !== "stable");
    if(offerCollision){
      if(!polite){
        console.warn(`[GROUP-CALL] Offer collision ignored (impolite) from ${from} state=${signalingState} making=${isMakingOffer}`);
        return;
      }
      console.log(`[GROUP-CALL] Offer collision handled politely for ${from}, rolling back`);
      try{
        if(peer) await peer.setLocalDescription({type:"rollback"} as any);
      }catch{}
    }
    // if peer exists and is connected/connecting and not collision, ignore duplicate
    if(peer && !offerCollision && (peer.connectionState === "connected" || peer.connectionState === "connecting")) {
      console.log(`[GROUP-CALL] duplicate offer ignored, already connected to ${from}`);
      return;
    }
    // clean failed/closed peers before recreating
    if(peer && (peer.connectionState==="failed" || peer.connectionState==="closed" || peer.signalingState==="closed")){
      try{ peer.close(); }catch{}
      groupPeersRef.current.delete(from);
      groupStreamsRef.current.delete(from);
      groupIceQueuesRef.current.delete(from);
      peer = undefined as any;
    }
    if(!peer){
      try{
        let stream = localStreamRef.current;
        if(!stream){
          try{
            stream = await navigator.mediaDevices.getUserMedia({ audio:{echoCancellation:true, noiseSuppression:true, autoGainControl:true}, video: type==="video"});
            localStreamRef.current = stream;
            if(localVideoRef.current && stream) { localVideoRef.current.srcObject = stream; localVideoRef.current.muted=true; localVideoRef.current.playsInline=true; localVideoRef.current.play().catch(()=>{}); (callSocket as any).attachStreams?.(); }
            console.log(`[GROUP-CALL] Acquired local stream for answer to ${from}: ${stream.getTracks().map(t=> t.kind).join(',')} video=${stream.getVideoTracks().length}`);
          }catch(e){
            console.error("[GROUP-CALL] getUserMedia failed for group offer", e);
            return;
          }
        } else {
          console.log(`[GROUP-CALL] Using local stream for answer to ${from}: videoTracks=${stream.getVideoTracks().length} tracks=${stream.getTracks().map(t=>t.kind).join(',')}`);
        }
        if((type==="video" || callSocket.callType==="video") && stream.getVideoTracks().length===0){
          console.warn(`[GROUP-CALL] no video track for answer to ${from}, trying to acquire`);
          try{
            const vs = await navigator.mediaDevices.getUserMedia({ video:true });
            const vt = vs.getVideoTracks()[0];
            if(vt){ stream.addTrack(vt); console.log(`[GROUP-CALL] added missing video track for ${from}`); }
          }catch{}
        }
        peer = createPeer(from, true, groupId);
        groupPeersRef.current.set(from, peer);
        if(!groupStreamsRef.current.has(from)) groupStreamsRef.current.set(from, new MediaStream());
        for(const track of stream.getTracks()){
          try{
            peer.addTrack(track, stream);
            console.log(`[GROUP-CALL] addTrack ${track.kind} to answer peer ${from}`);
          }catch(e){ console.error(`addTrack failed for ${from}`, e); }
        }
        // Log SDP check after answer will be done below
      }catch(e){ console.error("setup peer for offer failed", e); return; }
    }
    try{
      groupIsSettingRemoteAnswerRef.current.set(from, true);
      await peer!.setRemoteDescription(new RTCSessionDescription(offer));
      groupIsSettingRemoteAnswerRef.current.set(from, false);
      const q = groupIceQueuesRef.current.get(from) || [];
      for(const c of q){ try{ await peer!.addIceCandidate(new RTCIceCandidate(c)); }catch(e){ console.warn("queued ICE add failed", e); } }
      groupIceQueuesRef.current.delete(from);
      const answer = await peer!.createAnswer();
      const answerHasVideo = (answer.sdp||'').includes('m=video');
      console.log(`[GROUP-CALL] Answer SDP has video: ${answerHasVideo} for ${from} (type ${type})`);
      if(!answerHasVideo && (type==="video" || callSocket.callType==="video")) console.warn(`[GROUP-CALL] ANSWER MISSING VIDEO for ${from}`);
      await peer!.setLocalDescription(answer);
      console.log(`[GROUP-CALL] Sending answer to ${from} with ${peer!.getSenders().map(s=> s.track ? s.track.kind : 'null').join(',')}`);
      socket.emit("group-call-answer", { groupId, answer: peer!.localDescription, to: from, callId: groupCallIdRef.current || (callSocket as any).currentCallId });
      forceGroupUpdate();
      setTimeout(()=> forceGroupUpdate(), 100);
    }catch(e){ console.error(`[GROUP-CALL] offer handling failed from ${from}`, e); groupIsSettingRemoteAnswerRef.current.set(from,false); }
  };

  // GROUP socket listeners – perfect negotiation + authoritative sync
  useEffect(()=>{
    const onGroupOffer = async (data: any)=>{
      const status = (ctx as any).callStatusRef?.current || callSocket.callStatus;
      const incoming = (ctx as any).incomingCall;
      const isGroupIncoming = incoming?.isGroup;
      const myId = getMyId();
      if (data.from && myId && String(data.from) === String(myId)) return;
      // validate callId
      const myCallId = groupCallIdRef.current || (callSocket as any).currentCallId;
      if(data.callId && myCallId && String(data.callId)!==String(myCallId)){
        console.warn(`[GROUP-CALL] stale offer callId ${data.callId} vs ${myCallId}`);
        if(myCallId) return;
      }
      if(status==="ringing" && isGroupIncoming){
        if (!pendingGroupOffersRef.current.find((p:any)=> String(p.from)===String(data.from))) {
          pendingGroupOffersRef.current.push(data);
          console.log(`[GROUP-CALL] queue offer before accept from ${data.from}`);
        }
        return;
      }
      if(status==="idle"){
        if (!pendingGroupOffersRef.current.find((p:any)=> String(p.from)===String(data.from))) {
          pendingGroupOffersRef.current.push(data);
          setTimeout(()=> {
            pendingGroupOffersRef.current = pendingGroupOffersRef.current.filter((p:any)=> String(p.from)!==String(data.from));
          }, 15000);
        }
        return;
      }
      await processGroupOffer(data);
    };
    const onGroupAnswer = async ({ from, answer, callId }: any)=>{
      const myCallId = groupCallIdRef.current || (callSocket as any).currentCallId;
      if(callId && myCallId && String(callId)!==String(myCallId)) return;
      const peer = groupPeersRef.current.get(from);
      if(!peer || peer.signalingState==="closed"){
        console.warn(`[GROUP-CALL] answer for missing peer ${from}`);
        return;
      }
      console.log(`[GROUP-CALL] Received answer from ${from}`);
      try{
        groupIsSettingRemoteAnswerRef.current.set(from, true);
        await peer.setRemoteDescription(new RTCSessionDescription(answer));
        groupIsSettingRemoteAnswerRef.current.set(from, false);
        groupMakingOfferRef.current.set(from, false);
        const q = groupIceQueuesRef.current.get(from) || [];
        for(const c of q){ try{ await peer.addIceCandidate(new RTCIceCandidate(c)); }catch(e){ console.warn("ice flush failed", e); } }
        groupIceQueuesRef.current.delete(from);
        forceGroupUpdate();
      }catch(e){ console.error("group answer set failed", e); groupIsSettingRemoteAnswerRef.current.set(from,false); }
    };
    const onGroupIce = async ({ from, candidate, callId }: any)=>{
      const myCallId = groupCallIdRef.current || (callSocket as any).currentCallId;
      if(callId && myCallId && String(callId)!==String(myCallId)) { /* ignore stale callId but still try */ }
      const peer = groupPeersRef.current.get(from);
      if(peer && candidate){
        if(peer.remoteDescription && !groupIsSettingRemoteAnswerRef.current.get(from)){
          try{ await peer.addIceCandidate(new RTCIceCandidate(candidate)); }catch(e){ console.warn(`[GROUP-CALL] ICE add failed for ${from}`, e); }
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
    const onParticipantJoined = async ({ groupId, userId, callId }: any)=>{
      const myId = getMyId();
      if(!myId || String(userId)===String(myId)) return;
      console.log(`[GROUP-CALL] participant joined ${userId} in ${groupId}`);
      // update authoritative active map via CallContext (will also be updated via CallContext listener, but ensure here)
      try{ (ctx as any).setActiveGroupParticipants?.((prev: any)=>{
        const n = new Map(prev); 
        // need userInfo – we have from event? fallback to id
        if(!n.has(String(userId))) n.set(String(userId), { username: String(userId).slice(-6), avatar: null });
        return n;
      }); }catch{}
      const existing = groupPeersRef.current.get(userId);
      if(existing){
        if(existing.connectionState === "connected" || existing.connectionState === "connecting") {
          console.log(`[GROUP-CALL] already connected to ${userId}, skip offer`);
          return;
        }
        try{ existing.close(); }catch{}
        groupPeersRef.current.delete(userId);
        groupStreamsRef.current.delete(userId);
        groupIceQueuesRef.current.delete(userId);
        groupMakingOfferRef.current.delete(userId);
      }
      const callUser = (callSocket as any).callUser;
      const isInGroupCall = callUser?.isGroup && String(callUser?._id)===String(groupId) && (callSocket.callStatus==="connected" || callSocket.callStatus==="calling");
      let inRef = isInGroupCall;
      if(!inRef){
        const refStatus = (ctx as any).callStatusRef?.current;
        const refUser = (ctx as any).callUserRef?.current;
        inRef = refUser?.isGroup && String(refUser?._id)===String(groupId) && (refStatus==="connected" || refStatus==="calling");
        if (!inRef) { console.log(`[GROUP-CALL] not in group call ${groupId}, ignore joined ${userId}`); return; }
      }
      // callId sync
      if(callId && (!groupCallIdRef.current || String(groupCallIdRef.current)!==String(callId))){
        groupCallIdRef.current = String(callId);
        if((ctx as any).setCurrentCallId) (ctx as any).setCurrentCallId(String(callId));
      }
      try{
        let stream = localStreamRef.current;
        if(!stream){
          const type = callSocket.callType || "audio";
          stream = await navigator.mediaDevices.getUserMedia({ audio:{echoCancellation:true, noiseSuppression:true, autoGainControl:true}, video: type==="video"});
          localStreamRef.current = stream;
          if(localVideoRef.current){ localVideoRef.current.srcObject = stream; localVideoRef.current.muted=true; localVideoRef.current.playsInline=true; localVideoRef.current.play().catch(()=>{}); (callSocket as any).attachStreams?.(); }
          console.log(`[GROUP-CALL] Acquired local stream for offer to ${userId}: ${stream.getTracks().map(t=> t.kind+`(${t.enabled?'on':'off'},${t.readyState})`).join(', ')}`);
        } else {
          console.log(`[GROUP-CALL] Using existing local stream for ${userId}: ${stream.getTracks().map(t=> t.kind+`(${t.readyState})`).join(', ')} videoTracks=${stream.getVideoTracks().length}`);
        }
        // CRITICAL: ensure video track exists for video calls
        if((callSocket.callType||"audio")==="video" && stream.getVideoTracks().length===0){
          console.warn(`[GROUP-CALL] WARNING: no video track in local stream for ${userId} – requesting video again`);
          try{
            const vStream = await navigator.mediaDevices.getUserMedia({ video: true });
            const vTrack = vStream.getVideoTracks()[0];
            if(vTrack){ stream.addTrack(vTrack); console.log(`[GROUP-CALL] Added missing video track for ${userId}`); }
          }catch(e){ console.error("failed to get video track", e); }
        }
        const peer = createPeer(userId, true, groupId);
        groupPeersRef.current.set(userId, peer);
        if(!groupStreamsRef.current.has(userId)) groupStreamsRef.current.set(userId, new MediaStream());
        // Add every local track to this peer – MUST include video for video calls
        for(const track of stream.getTracks()){
          try{
            peer.addTrack(track, stream);
            console.log(`[GROUP-CALL] addTrack ${track.kind} (${track.id}) to peer ${userId} enabled=${track.enabled} readyState=${track.readyState}`);
          }catch(e){ console.error(`addTrack failed for ${userId}`, e); }
        }
        // Audit senders
        setTimeout(()=> {
          try{ console.log(`[GROUP-CALL] senders for ${userId}: ${peer.getSenders().map(s=> s.track ? s.track.kind : 'null').join(',')}`);}catch{}
        }, 100);
        groupMakingOfferRef.current.set(userId, true);
        const offer = await peer.createOffer();
        // Log SDP contains video
        const sdpHasVideo = (offer.sdp||'').includes('m=video');
        console.log(`[GROUP-CALL] Offer SDP has video: ${sdpHasVideo} for ${userId}`);
        if(!sdpHasVideo && (callSocket.callType==="video")) console.error(`[GROUP-CALL] OFFER MISSING VIDEO m-line for ${userId}!`);
        await peer.setLocalDescription(offer);
        groupMakingOfferRef.current.set(userId, false);
        console.log(`[GROUP-CALL] Creating peer ${myId} -> ${userId} offer type=${callSocket.callType}`);
        socket.emit("group-call-offer", { groupId, to: userId, offer: peer.localDescription, type: callSocket.callType || "audio", callId: groupCallIdRef.current || (callSocket as any).currentCallId });
        forceGroupUpdate();
      }catch(e){ console.error("participant joined offer failed", e); groupMakingOfferRef.current.set(userId,false); }
    };
    const onGroupParticipantLeft = ({ userId, callId }: any)=>{
      if(callId){
        const myCallId = groupCallIdRef.current || (callSocket as any).currentCallId;
        if(myCallId && String(callId)!==String(myCallId)) return;
      }
      console.log(`[GROUP-CALL] Removing peer ${userId} only`);
      const peer = groupPeersRef.current.get(userId);
      if(peer){ try{ peer.ontrack=null; (peer as any).onicecandidate=null; peer.close(); }catch{} groupPeersRef.current.delete(userId); }
      const stream = groupStreamsRef.current.get(userId);
      if(stream){ try{ stream.getTracks().forEach(t=> t.stop()); }catch{} groupStreamsRef.current.delete(userId); }
      groupIceQueuesRef.current.delete(userId);
      groupMakingOfferRef.current.delete(userId);
      groupPoliteRef.current.delete(userId);
      groupIsSettingRemoteAnswerRef.current.delete(userId);
      forceGroupUpdate();
    };
    const onGroupEnded = ({ callId, groupId }: any)=>{
      const myCallId = groupCallIdRef.current || (callSocket as any).currentCallId;
      if(callId && myCallId && String(callId)!==String(myCallId)) return;
      console.log(`[GROUP-CALL] Group ended ${groupId}`);
      for(const [,pc] of groupPeersRef.current){ try{ pc.ontrack=null; (pc as any).onicecandidate=null; pc.close(); }catch{} }
      groupPeersRef.current.clear();
      groupStreamsRef.current.clear();
      groupIceQueuesRef.current.clear();
      groupMakingOfferRef.current.clear();
      groupPoliteRef.current.clear();
      groupIsSettingRemoteAnswerRef.current.clear();
      forceGroupUpdate();
    };
    const onGroupSync = (data: any)=>{
      // authoritative sync from server – reconcile missing peers
      const { callId, participants } = data || {};
      if(callId && !groupCallIdRef.current) groupCallIdRef.current = String(callId);
      if(Array.isArray(participants) && participants.length){
        // participants is from CallContext already, but ensure peers for each
        for(const p of participants){
          const pid = String(p.id);
          const myId = getMyId();
          if(String(pid)===String(myId)) continue;
          if(groupPeersRef.current.has(pid)) continue;
          // if we are in call and missing peer, trigger offer if we are existing participant
          // Actually newcomer should NOT offer to existing; existing offers to newcomer. 
          // But sync is received by newcomer – it will see existing participants, but it should NOT offer; it will wait for offers.
          // So only trigger if we are NOT the newcomer? We can detect: if participants includes us, and we are already connected, we should offer to those we don't have peer for
          // Simplest: do nothing here; the existing participants will have already offered via participant-joined.
          // However if we missed participant-joined, we can request existing to offer again via sync – we can emit a gentle re-sync request
        }
      }
    };
    socket.on("group-call-offer", onGroupOffer);
    socket.on("group-call-answer", onGroupAnswer);
    socket.on("group-ice-candidate", onGroupIce);
    socket.on("group-call-participant-joined", onParticipantJoined);
    socket.on("group-call-participant-left", onGroupParticipantLeft);
    socket.on("group-call-ended", onGroupEnded);
    socket.on("group-call-sync-response", onGroupSync);
    return ()=>{
      socket.off("group-call-offer", onGroupOffer);
      socket.off("group-call-answer", onGroupAnswer);
      socket.off("group-ice-candidate", onGroupIce);
      socket.off("group-call-participant-joined", onParticipantJoined);
      socket.off("group-call-participant-left", onGroupParticipantLeft);
      socket.off("group-call-ended", onGroupEnded);
      socket.off("group-call-sync-response", onGroupSync);
    };
  },[authUser]);

  // Reconciliation: ensure every authoritative active participant has a peer (handles missed participant-joined)
  useEffect(()=>{
    const active = (ctx as any).activeGroupParticipants as Map<string, {username:string, avatar:string|null}> | undefined;
    if(!active || active.size===0) return;
    const status = (ctx as any).callStatusRef?.current || callSocket.callStatus;
    if(status!=="connected" && status!=="calling") return;
    const callUser = (ctx as any).callUserRef?.current || (callSocket as any).callUser;
    if(!callUser?.isGroup) return;
    const groupId = String(callUser._id || callUser.groupId);
    const myId = getMyId();
    // debounce
    const t = setTimeout(async()=>{
      for(const [pid] of active.entries()){
        if(String(pid)===String(myId)) continue;
        if(groupPeersRef.current.has(String(pid))) continue;
        if(pendingGroupOffersRef.current.find((p:any)=> String(p.from)===String(pid))) continue;
        // missing peer – if we are existing participant, create offer as fallback (polite will handle glare)
        // Only create if we have been in call longer than newcomer? To avoid both offering, use polite rule: smaller id offers? Let's use deterministic: only offer if myId < pid  (so one direction)
        // But to ensure connectivity even if that rule fails, allow after 3s second attempt from larger id
        const shouldOffer = String(myId) < String(pid);
        if(!shouldOffer){
          // wait a bit longer for the smaller id to offer; if still missing after another 2s, then offer
          continue;
        }
        console.log(`[GROUP-CALL] Reconciliation: missing peer ${pid}, creating fallback offer`);
        try{
          let stream = localStreamRef.current;
          if(!stream){
            const type = callSocket.callType || "audio";
            stream = await navigator.mediaDevices.getUserMedia({ audio:{echoCancellation:true, noiseSuppression:true, autoGainControl:true}, video: type==="video"});
            localStreamRef.current = stream;
            if(localVideoRef.current){ localVideoRef.current.srcObject = stream; localVideoRef.current.muted=true; localVideoRef.current.playsInline=true; localVideoRef.current.play().catch(()=>{}); }
          }
          const peer = createPeer(String(pid), true, groupId);
          groupPeersRef.current.set(String(pid), peer);
          if(!groupStreamsRef.current.has(String(pid))) groupStreamsRef.current.set(String(pid), new MediaStream());
          for(const track of stream.getTracks()) peer.addTrack(track, stream);
          groupMakingOfferRef.current.set(String(pid), true);
          const offer = await peer.createOffer();
          await peer.setLocalDescription(offer);
          groupMakingOfferRef.current.set(String(pid), false);
          socket.emit("group-call-offer", { groupId, to: String(pid), offer: peer.localDescription, type: callSocket.callType || "audio", callId: groupCallIdRef.current || (callSocket as any).currentCallId });
          forceGroupUpdate();
        }catch(e){ console.error("reconciliation offer failed", e); }
      }
      // second pass for larger ids after 2.5s if still missing (handles case where smaller id never offered due to offline)
      setTimeout(async()=>{
        for(const [pid] of active.entries()){
          if(String(pid)===String(myId)) continue;
          if(groupPeersRef.current.has(String(pid))) continue;
          if(pendingGroupOffersRef.current.find((p:any)=> String(p.from)===String(pid))) continue;
          if(String(myId) < String(pid)) continue; // already handled
          console.log(`[GROUP-CALL] Reconciliation fallback (larger id) for ${pid}`);
          try{
            let stream = localStreamRef.current;
            if(!stream){
              const type = callSocket.callType || "audio";
              stream = await navigator.mediaDevices.getUserMedia({ audio:{echoCancellation:true, noiseSuppression:true, autoGainControl:true}, video: type==="video"});
              localStreamRef.current = stream;
            }
            const peer = createPeer(String(pid), true, groupId);
            groupPeersRef.current.set(String(pid), peer);
            if(!groupStreamsRef.current.has(String(pid))) groupStreamsRef.current.set(String(pid), new MediaStream());
            for(const track of stream.getTracks()) peer.addTrack(track, stream);
            groupMakingOfferRef.current.set(String(pid), true);
            const offer = await peer.createOffer();
            await peer.setLocalDescription(offer);
            groupMakingOfferRef.current.set(String(pid), false);
            socket.emit("group-call-offer", { groupId, to: String(pid), offer: peer.localDescription, type: callSocket.callType || "audio", callId: groupCallIdRef.current || (callSocket as any).currentCallId });
            forceGroupUpdate();
          }catch{}
        }
      }, 2500);
    }, 1200);
    return ()=> clearTimeout(t);
  }, [ (ctx as any).activeGroupParticipants, groupTick, callSocket.callStatus, authUser ]);

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

  // START GROUP CALL (up to 8 participants, mesh) – FIXED: do NOT pre-offer before peers are ready
  // Initiator only signals; actual RTC offers are created when participant-joined fires (after peer has local stream)
  const startGroupCall = async (groupId: string, members: any[], type: "audio" | "video" = "audio") => {
    const myId = getMyId();
    try{
      const stream = await navigator.mediaDevices.getUserMedia({
        audio:{echoCancellation:true, noiseSuppression:true, autoGainControl:true},
        video: type==="video",
      });
      localStreamRef.current = stream;
      if(localVideoRef.current){ localVideoRef.current.srcObject = stream; localVideoRef.current.muted=true; localVideoRef.current.playsInline=true; localVideoRef.current.play().catch(()=>{}); }
      // attach to context helper immediately so minimize/restore works
      (callSocket as any).attachStreams?.();
      // reset group structures
      for(const [,pc] of groupPeersRef.current){ try{ pc.close(); }catch{} }
      groupPeersRef.current.clear();
      groupStreamsRef.current.clear();
      groupIceQueuesRef.current.clear();
      pendingGroupOffersRef.current = [];
      const newCallId = `${groupId}_${myId}_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
      groupCallIdRef.current = newCallId;
      callSocket.setCallType(type);
      if ((callSocket as any).setCurrentCallId) (callSocket as any).setCurrentCallId(newCallId);
      // populate members map for username display (initiator side)
      try{
        const m = new Map<string, {username:string, avatar:string|null}>();
        for(const mem of members){
          const id = typeof mem==="string" ? mem : (mem._id||(mem as any).id||"")?.toString();
          const uname = typeof mem==="string" ? id.slice(-6) : mem.username || mem.name || `${(mem as any).firstName||""} ${(mem as any).lastName||""}`.trim() || id.slice(-6);
          const av = typeof mem==="string" ? null : mem.avatar || null;
          if(id) m.set(String(id), {username: String(uname), avatar: av as any});
        }
        const my = members.find((mm:any)=> String(typeof mm==="string"? mm : mm._id||(mm as any).id)===myId);
        if(my && typeof my!=="string") m.set(myId, {username: (my as any).username || "You", avatar: (my as any).avatar||null});
        else if (!m.has(myId)) m.set(myId, {username: "You", avatar: null});
        (callSocket as any).setGroupCallMembers?.(m);
      }catch{}
      // ensure join group room BEFORE start so participant-joined broadcasts reach us
      socket.emit("join-group", { groupId });
      callSocket.setCallUser({ _id: groupId, username: "Group", isGroup:true, groupId, callId: newCallId });
      callSocket.setCallStatus("connected");
      if ((callSocket as any).connectedAtRef) (callSocket as any).connectedAtRef.current = Date.now();
      setActiveCallUserId(groupId);
      // initialize authoritative active participants with self
      try{
        const selfMap = new Map<string, {username:string, avatar:string|null}>();
        const myInfo = (callSocket as any).groupCallMembers?.get?.(myId) || { username: "You", avatar: null };
        selfMap.set(String(myId), { username: (myInfo as any).username || "You", avatar: (myInfo as any).avatar || null });
        (callSocket as any).setActiveGroupParticipants?.(selfMap);
      }catch{}
      // Force UI to show connected immediately (no "waiting" flicker for initiator alone)
      forceGroupUpdate();
      // Signal members – do NOT create offers yet; offers will be created on participant-joined
      socket.emit("group-call-start", { groupId, type, callId: newCallId });
      // request authoritative sync after short delay to populate active list
      setTimeout(()=> socket.emit("group-call-sync-request", { groupId }), 800);
    }catch(err:any){
      console.error("group start failed", err);
      const msg = err?.name==="NotAllowedError" ? "Mic/Camera denied" : err?.name==="NotFoundError" ? "No mic/camera found" : "Failed to start group call";
      window.dispatchEvent(new CustomEvent("call-error",{detail:msg}));
      callSocket.setCallStatus("idle");
      setActiveCallUserId(null);
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
      if(localVideoRef.current){ localVideoRef.current.srcObject = stream; localVideoRef.current.muted=true; localVideoRef.current.playsInline=true; localVideoRef.current.play().catch(()=>{}); (callSocket as any).attachStreams?.(); }
      // clear stale group structures but preserve pending offers
      for(const [, pc] of groupPeersRef.current){ try{ pc.close(); }catch{} }
      groupPeersRef.current.clear();
      groupStreamsRef.current.clear();
      groupIceQueuesRef.current.clear();
      pendingGroupOffersRef.current = pendingGroupOffersRef.current.filter((p:any)=> String(p.groupId)===String(groupId) || !p.groupId);
      setActiveCallUserId(groupId);
      callSocket.setCallType(type);
      if ((callSocket as any).setCurrentCallId && callId) (callSocket as any).setCurrentCallId(callId);
      groupCallIdRef.current = callId || `${groupId}_${Date.now()}`;
      callSocket.setCallUser({ _id: groupId, username: "Group", isGroup:true, groupId, callId });
      callSocket.setCallStatus("connected");
      if ((callSocket as any).connectedAtRef) (callSocket as any).connectedAtRef.current = Date.now();
      // initialize active map with self before sync
      try{
        const selfMap = new Map<string, {username:string, avatar:string|null}>();
        // try to get self name from auth
        const selfName = (authUser as any)?.username || "You";
        const selfAvatar = (authUser as any)?.avatar || null;
        selfMap.set(String(getMyId()), { username: selfName, avatar: selfAvatar });
        (callSocket as any).setActiveGroupParticipants?.(selfMap);
      }catch{}
      socket.emit("join-group",{ groupId });
      socket.emit("group-call-accept",{ groupId, callId });
      // process any queued offers that arrived before accept (e.g., early trickle from initiator if any)
      const queued = [...pendingGroupOffersRef.current];
      pendingGroupOffersRef.current = [];
      for(const off of queued){
        await processGroupOffer(off);
      }
      forceGroupUpdate();
      // request authoritative sync to get full active list and reconcile missing peers
      setTimeout(()=> socket.emit("group-call-sync-request", { groupId }), 500);
      // also trigger attach retry for local
      setTimeout(()=> { (callSocket as any).attachStreams?.(); forceGroupUpdate(); }, 200);
    }catch(e:any){
      console.error("acceptGroupCall failed", e);
      const msg = e?.name==="NotAllowedError" ? "Mic/Camera permission denied" : e?.name==="NotFoundError" ? "No mic/camera found" : "Failed to join group call";
      window.dispatchEvent(new CustomEvent("call-error",{detail:msg}));
      callSocket.setCallStatus("idle");
      setActiveCallUserId(null);
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
