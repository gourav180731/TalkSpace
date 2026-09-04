import { useEffect, useRef } from "react";
import { socket } from "../../../apis/socket";
import { useGlobalCall } from "../../../context/CallContext";

export function useCall(remoteVideoRef: any, localVideoRef: any, remoteAudioRef: any) {
  const ctx = useGlobalCall();
  const peerRef = ctx.peerRef as React.MutableRefObject<RTCPeerConnection|null>;
  const localStreamRef = ctx.localStreamRef as React.MutableRefObject<MediaStream|null>;
  const remoteStreamRef = ctx.remoteStreamRef as React.MutableRefObject<MediaStream|null>;

  const { setActiveCallUserId, activeCallUserId } = ctx;
  const callSocket = ctx;

  const callerIceQueueRef = useRef<any[]>([]);
  const receiverIceQueueRef = useRef<any[]>([]);

  const setRemoteAnswerRef = useRef<((answer: any) => Promise<void>) | undefined>(undefined);
  const addIceCandidateRef = useRef<((candidate: any) => Promise<void>) | undefined>(undefined);
  const cleanupRef = useRef<(() => void) | undefined>(undefined);

  // Mute / camera / speaker state refs
  const isMutedRef = useRef(false);
  const isSpeakerMutedRef = useRef(false);

  // SOCKET LISTENERS
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

  // Helper to attach with retry (handles ref not mounted yet)
  const attachWithRetry = (ref:any, stream:MediaStream|null, isLocal=false) => {
    if(!ref || !stream) return;
    const tryAttach = () => {
      if(ref.current){
        ref.current.srcObject = stream;
        if(isLocal){
          ref.current.muted = true;
          ref.current.volume = 0;
        } else {
          // remote should not be muted
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

  // CREATE PEER
  const createPeer = (remoteId: string) => {
    remoteStreamRef.current = new MediaStream();

    const peer = new RTCPeerConnection({
      iceServers: [
        { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"] },
        // Fallback TURN - free openrelay for dev (replace with your own in prod)
        {
          urls: ["turn:openrelay.metered.ca:80", "turn:openrelay.metered.ca:443", "turn:openrelay.metered.ca:443?transport=tcp"],
          username: "openrelayproject",
          credential: "openrelayproject",
        },
        // Original metered - keep as secondary (may be expired)
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
        socket.emit("ice-candidate", { to: remoteId, candidate: e.candidate });
      }
    };

    peer.ontrack = (event) => {
      console.log("📥 ontrack", event.track.kind, "from", remoteId, "track id", event.track.id);
      // Ensure remoteStream exists
      if(!remoteStreamRef.current) remoteStreamRef.current = new MediaStream();
      remoteStreamRef.current.addTrack(event.track);
      // Video track → remoteVideo, Audio track → remoteAudio (and also video element for unified stream)
      if(event.track.kind === "video"){
        attachWithRetry(remoteVideoRef, remoteStreamRef.current, false);
        // Also ensure video element is visible and plays
        if(remoteVideoRef.current){
          remoteVideoRef.current.muted = false;
          remoteVideoRef.current.playsInline = true;
        }
      } else if(event.track.kind === "audio"){
        attachWithRetry(remoteAudioRef, remoteStreamRef.current, false);
        // Also attach to video element's srcObject for browsers that need audio via video
        attachWithRetry(remoteVideoRef, remoteStreamRef.current, false);
      }
      console.log("📥 remoteStream tracks:", remoteStreamRef.current.getTracks().map(t=> t.kind + ":" + t.id));
    };

    peer.onconnectionstatechange = () => {
      console.log("🔗 connection:", peer.connectionState);
    };

    return peer;
  };

  // ICE GATHER HELPER
  const waitForIceGathering = (peer: RTCPeerConnection): Promise<void> => {
    return new Promise((resolve) => {
      if (peer.iceGatheringState === "complete") {
        resolve();
        return;
      }

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

  // START CALL
  const startCall = async (to: string, user: any, type: "audio" | "video" = "audio") => {
    if (peerRef.current) {
      cleanup();
    }

    callerIceQueueRef.current = [];
    receiverIceQueueRef.current = [];
    isMutedRef.current = false;
    isSpeakerMutedRef.current = false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: type === "video",
      });

      localStreamRef.current = stream;
      setActiveCallUserId(to);

      attachWithRetry(localVideoRef, stream, true);

      const peer = createPeer(to);
      peerRef.current = peer;

      for (const track of stream.getTracks()) {
        peer.addTrack(track, stream);
      }

      await peer.setLocalDescription(await peer.createOffer());
      await waitForIceGathering(peer);

      callSocket.setCallType(type);
      callSocket.setCallStatus("calling");
      callSocket.setCallUser(user);

      socket.emit("call-user", { to, offer: peer.localDescription, user, type });
      console.log("📤 call-user emitted to", to, "as", (user as any)?.username);
    } catch (err:any) {
      console.error("❌ getUserMedia error", err);
      const msg = err?.name === "NotAllowedError" ? "Microphone/Camera permission denied" : err?.name === "NotFoundError" ? "No camera/mic found" : "Failed to start call";
      // Use global call context to show toast if available
      try { 
        const evt = new CustomEvent("call-error", { detail: msg });
        window.dispatchEvent(evt);
      } catch {}
      // Reset call state
      setActiveCallUserId(null);
      callSocket.setCallStatus("idle");
      callSocket.setCallUser(null);
    }
  };

  // ACCEPT CALL
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
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: type === "video",
    });

    localStreamRef.current = stream;
    setActiveCallUserId(from);

    attachWithRetry(localVideoRef, stream, true);

    const peer = createPeer(from);
    peerRef.current = peer;

    for (const track of stream.getTracks()) {
      peer.addTrack(track, stream);
    }

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

  // ANSWER RECEIVED
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

  // ICE
  const addIceCandidate = async (candidate: any) => {
    if (!peerRef.current) return;

    if (!peerRef.current.remoteDescription) {
      callerIceQueueRef.current.push(candidate);
      receiverIceQueueRef.current.push(candidate);
      return;
    }

    try {
      await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      console.log("ICE error", e);
    }
  };
  addIceCandidateRef.current = addIceCandidate;

  // CLEANUP
  const cleanup = () => {

    if (peerRef.current) {
      peerRef.current.ontrack = null;
      peerRef.current.onicecandidate = null;
      peerRef.current.close();
      peerRef.current = null;
    }

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
      // Group call end
      const dur = (callSocket as any).connectedAtRef?.current ? Math.floor((Date.now() - (callSocket as any).connectedAtRef.current)/1000) : 0;
      socket.emit("group-call-end", { groupId: targetId, callId: cid, duration: dur });
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

  // 🎤 TOGGLE MUTE
  const toggleMute = () => {
    if (!localStreamRef.current) return false;
    isMutedRef.current = !isMutedRef.current;
    localStreamRef.current.getAudioTracks().forEach((t) => {
      t.enabled = !isMutedRef.current;
    });
    return isMutedRef.current;
  };

  // SWITCH CAMERA (front <-> rear)
  const facingModeRef = useRef<"user" | "environment">("user");

  const switchCamera = async (): Promise<boolean> => {
    if (!localStreamRef.current || !peerRef.current) return false;

    facingModeRef.current =
      facingModeRef.current === "user" ? "environment" : "user";

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingModeRef.current },
        audio: false,
      });

      const newVideoTrack = newStream.getVideoTracks()[0];

      // replaceTrack swaps the track on the peer without renegotiation
      const sender = peerRef.current
        .getSenders()
        .find((s) => s.track?.kind === "video");

      if (sender) {
        await sender.replaceTrack(newVideoTrack);
      }

      // Stop old track and swap into localStream
      const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
      if (oldVideoTrack) {
        oldVideoTrack.stop();
        localStreamRef.current.removeTrack(oldVideoTrack);
      }
      localStreamRef.current.addTrack(newVideoTrack);

      // Update local preview
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }

      return true;
    } catch (err) {
      console.error("switchCamera error", err);
      // Revert facing mode on failure
      facingModeRef.current =
        facingModeRef.current === "user" ? "environment" : "user";
      return false;
    }
  };

  // 🔊 TOGGLE SPEAKER
  const toggleSpeaker = () => {
    isSpeakerMutedRef.current = !isSpeakerMutedRef.current;
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = isSpeakerMutedRef.current;
    }
    return isSpeakerMutedRef.current;
  };

  return {
    startCall,
    acceptCall,
    setRemoteAnswer,
    addIceCandidate,
    endCall,
    toggleMute,
    switchCamera,
    toggleSpeaker,
    localStreamRef,
    remoteStreamRef,
    attachWithRetry,
  };
}