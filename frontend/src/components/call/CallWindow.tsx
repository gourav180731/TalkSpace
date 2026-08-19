import { useEffect, useState } from "react";
import { socket } from "../../apis/socket";
import { useGlobalCall } from "../../context/CallContext";
import { useCall } from "./hooks/useCall";
import { PhoneOff, PhoneMissed } from "lucide-react";

/* ─────────────────────────────────────────
   Global Styles
───────────────────────────────────────── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');

  .cw * { box-sizing: border-box; font-family: 'Outfit', sans-serif; }

  /* ── Keyframes ── */
  @keyframes cw-ping {
    0%   { transform: scale(1);    opacity: .4; }
    70%  { transform: scale(1.6);  opacity: 0;  }
    100% { transform: scale(1.6);  opacity: 0;  }
  }
  @keyframes cw-fade-up {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0);    }
  }
  @keyframes cw-scale-in {
    from { opacity: 0; transform: scale(.96); }
    to   { opacity: 1; transform: scale(1);   }
  }
  @keyframes cw-pulse-dot {
    0%,100% { opacity: 1; } 50% { opacity: .3; }
  }
  @keyframes cw-toast {
    from { opacity: 0; transform: translate(-50%,-14px) scale(.95); }
    to   { opacity: 1; transform: translate(-50%,0)     scale(1);   }
  }
  @keyframes cw-backdrop-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  .cw-anim-fade-up  { animation: cw-fade-up  .38s cubic-bezier(.22,1,.36,1) both; }
  .cw-anim-scale-in { animation: cw-scale-in .38s cubic-bezier(.22,1,.36,1) both; }
  .cw-anim-toast    { animation: cw-toast    .3s  cubic-bezier(.22,1,.36,1) both; }
  .cw-ping-a { animation: cw-ping 2.2s ease-in-out infinite; }
  .cw-ping-b { animation: cw-ping 2.2s ease-in-out infinite .5s; }
  .cw-pulse  { animation: cw-pulse-dot 1.6s ease-in-out infinite; }

  /* ── Backdrop — desktop only ── */
  .cw-backdrop {
    position: fixed; inset: 0; z-index: 998;
    background: rgba(0,0,0,.6);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    animation: cw-backdrop-in .3s ease both;
    display: none;
  }
  @media (min-width: 768px) {
    .cw-backdrop { display: block; }
  }

  /* ── Call window — mobile: full screen ── */
  .cw-window {
    position: fixed; inset: 0; z-index: 999;
    display: flex; flex-direction: column;
    color: #fff;
    background: linear-gradient(170deg,#0a0d14 0%,#111827 55%,#0c1a2e 100%);
  }

  /* ── Call window — desktop: centered card ── */
  @media (min-width: 768px) {
    .cw-window {
      inset: unset !important;
      position: fixed !important;
      top: 50% !important;
      left: 50% !important;
      transform: translate(-50%, -50%) !important;
      width: min(80vw, 920px);
      height: min(80vh, 640px);
      border-radius: 20px;
      overflow: hidden;
      box-shadow:
        0 0 0 1px rgba(255,255,255,.07),
        0 40px 100px rgba(0,0,0,.75),
        0 8px 32px rgba(0,0,0,.5);
    }
    .cw-window.is-video {
      width:  min(86vw, 1080px);
      height: min(86vh, 720px);
    }
  }

  /* ── Incoming window — mobile: full screen ── */
  .cw-incoming-window {
    position: fixed; inset: 0; z-index: 1000;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    color: #fff;
    background: linear-gradient(170deg,#0a0d14 0%,#111827 55%,#0c1a2e 100%);
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }

  /* ── Incoming window — desktop: compact card ── */
  @media (min-width: 768px) {
    .cw-incoming-window {
      inset: unset !important;
      position: fixed !important;
      top: 50% !important;
      left: 50% !important;
      transform: translate(-50%, -50%) !important;
      width: min(80vw, 400px);
      height: min(80vh, 520px);
      border-radius: 20px;
      overflow: hidden;
      box-shadow:
        0 0 0 1px rgba(255,255,255,.07),
        0 40px 100px rgba(0,0,0,.75);
      padding-bottom: 0;
    }
  }

  /* ── Glass surface ── */
  .cw-glass {
    background: rgba(255,255,255,.06);
    border: 1px solid rgba(255,255,255,.1);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  }

  /* ── Desktop title bar ── */
  .cw-titlebar {
    display: none;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px 0;
    flex-shrink: 0;
  }
  @media (min-width: 768px) {
    .cw-titlebar { display: flex; }
  }

  /* ── Controls ── */
  .cw-ctrl-wrap { display:flex; flex-direction:column; align-items:center; gap:5px; }

  .cw-ctrl-btn {
    display: flex; align-items: center; justify-content: center;
    width: 50px; height: 50px; border-radius: 50%;
    border: 1px solid; cursor: pointer;
    transition: transform .14s ease, background .14s ease;
    -webkit-tap-highlight-color: transparent;
  }
  .cw-ctrl-btn:active { transform: scale(.9); }
  .cw-ctrl-btn.off {
    background: rgba(255,255,255,.09);
    border-color: rgba(255,255,255,.12);
    color: #fff;
  }
  .cw-ctrl-btn.off:hover { background: rgba(255,255,255,.16); }
  .cw-ctrl-btn.on {
    background: rgba(239,68,68,.18);
    border-color: rgba(239,68,68,.4);
    color: #f87171;
  }
  .cw-ctrl-label { font-size: 10.5px; color: rgba(255,255,255,.4); letter-spacing:.01em; }

  @media (min-width: 768px) {
    .cw-ctrl-btn { width: 52px; height: 52px; }
  }

  /* ── End button ── */
  .cw-end-btn {
    display: flex; align-items: center; justify-content: center;
    width: 62px; height: 62px; border-radius: 50%;
    background: #ef4444; border: none; cursor: pointer;
    box-shadow: 0 6px 28px rgba(239,68,68,.5);
    transition: transform .14s ease, background .14s ease;
    -webkit-tap-highlight-color: transparent;
  }
  .cw-end-btn:hover  { background: #f97316; }
  .cw-end-btn:active { transform: scale(.9); }

  /* ── Accept / Reject ── */
  .cw-action-btn {
    display: flex; align-items: center; justify-content: center;
    width: 64px; height: 64px; border-radius: 50%;
    border: none; cursor: pointer;
    transition: transform .14s ease, filter .14s ease;
    -webkit-tap-highlight-color: transparent;
  }
  .cw-action-btn:active { transform: scale(.88); }
  .cw-action-btn:hover  { filter: brightness(1.15); }
  .cw-action-btn.accept { background: #22c55e; box-shadow: 0 6px 28px rgba(34,197,94,.45); }
  .cw-action-btn.reject { background: #ef4444; box-shadow: 0 6px 28px rgba(239,68,68,.45); }

  /* ── Avatar ── */
  .cw-avatar {
    width: 88px; height: 88px;
    border-radius: 50%; object-fit: cover;
    border: 3px solid rgba(255,255,255,.15);
    display: block; position: relative; z-index: 2;
  }
  @media (min-width: 768px) {
    .cw-avatar { width: 90px; height: 90px; }
  }
`;

/* ─────────────────────────────────────────
   Main Export
───────────────────────────────────────── */
export default function CallWindow() {
  const callSocket = useGlobalCall();
  const { remoteVideoRef, localVideoRef, remoteAudioRef } = useGlobalCall();
  const call = useCall(remoteVideoRef, localVideoRef, remoteAudioRef);

  const [seconds,        setSeconds]        = useState(0);
  const [isMuted,        setIsMuted]        = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);

  const isVideo     = callSocket.callType === "video";
  const isActive    = callSocket.callStatus === "calling" || callSocket.callStatus === "connected";
  const isConnected = callSocket.callStatus === "connected";

  const remoteUser   = callSocket.callUser;
  const remoteName   = remoteUser?.username || remoteUser?.name || "Unknown";
  const remoteAvatar = remoteUser?.avatar || "/avatar-placeholder.png";

  useEffect(() => {
    if (!isConnected) return;
    const iv = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(iv);
  }, [isConnected]);

  useEffect(() => {
    if (
      callSocket.callStatus === "calling" &&
      callSocket.callUser &&
      !callSocket.activeCallUserId
    ) {
      call.startCall(callSocket.callUser._id, callSocket.callUser, callSocket.callType);
      callSocket.startMissedTimer(callSocket.callUser._id, remoteName);
    }
  }, [callSocket.callStatus, callSocket.callUser]);

  useEffect(() => {
    if (callSocket.callStatus === "idle") {
      setSeconds(0);
      setIsMuted(false);
      setIsSpeakerMuted(false);
    }
  }, [callSocket.callStatus]);

  const fmt = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const handleMute    = () => setIsMuted(call.toggleMute());
  const handleSpeaker = () => setIsSpeakerMuted(call.toggleSpeaker());
  const handleEnd     = () => { callSocket.clearMissedTimer(); call.endCall(); };

  const handleAccept = async () => {
    callSocket.stopAllAudio();
    await call.acceptCall(
      callSocket.incomingCall.from,
      callSocket.incomingCall.offer,
      callSocket.incomingCall.type,
    );
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted  = false;
      remoteAudioRef.current.volume = 1;
      await remoteAudioRef.current.play().catch(() => {});
    }
    callSocket.setIncomingCall(null);
  };

  const handleReject = () => {
    callSocket.stopAllAudio();
    socket.emit("reject-call", { to: callSocket.incomingCall.from });
    callSocket.setIncomingCall(null);
    callSocket.setCallStatus("idle");
  };

  return (
    <>
      <style>{STYLES}</style>
      <div className="cw">
        <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: "none" }} />

        {/* ── MISSED CALL TOAST ── */}
        {callSocket.missedCallMsg && (
          <div
            className="cw-anim-toast cw-glass"
            style={{
              position: "fixed", top: 20, left: "50%",
              transform: "translateX(-50%)",
              zIndex: 1100,
              display: "flex", alignItems: "center", gap: 10,
              padding: "11px 18px", borderRadius: 14,
              whiteSpace: "nowrap",
            }}
          >
            <PhoneMissed size={15} style={{ color: "#f87171", flexShrink: 0 }} />
            <span style={{ color: "#fff", fontSize: 13, fontWeight: 500 }}>
              {callSocket.missedCallMsg}
            </span>
          </div>
        )}

        {/* ── INCOMING CALL ── */}
        {callSocket.incomingCall && (
          <>
            <div className="cw-backdrop" />
            <IncomingCallOverlay
              remoteName={remoteName}
              remoteAvatar={remoteAvatar}
              callType={callSocket.callType}
              onAccept={handleAccept}
              onReject={handleReject}
            />
          </>
        )}

        {/* ── ACTIVE CALL ── */}
        {isActive && (
          <>
            <div className="cw-backdrop" />
            <ActiveCallWindow
              isVideo={isVideo}
              isConnected={isConnected}
              remoteName={remoteName}
              remoteAvatar={remoteAvatar}
              seconds={seconds}
              fmt={fmt}
              isMuted={isMuted}
              isSpeakerMuted={isSpeakerMuted}
              onMute={handleMute}
              onSpeaker={handleSpeaker}
              onEnd={handleEnd}
              onFlip={() => call.switchCamera()}
              remoteVideoRef={remoteVideoRef}
              localVideoRef={localVideoRef}
            />
          </>
        )}
      </div>
    </>
  );
}

/* ─────────────────────────────────────────
   Active Call Window
───────────────────────────────────────── */
function ActiveCallWindow({
  isVideo, isConnected, remoteName, remoteAvatar,
  seconds, fmt, isMuted, isSpeakerMuted,
  onMute, onSpeaker, onEnd, onFlip,
  remoteVideoRef, localVideoRef,
}: any) {
  return (
    <div
      className={`cw-window cw-anim-scale-in${isVideo ? " is-video" : ""}`}
      style={{ position: "fixed" }}
    >
      {/* Desktop title bar */}
      <TitleBar remoteName={remoteName} isConnected={isConnected} isVideo={isVideo} />

      {/* Remote video — fills window on both mobile and desktop */}
      <video
        ref={remoteVideoRef} autoPlay playsInline
        style={isVideo ? {
          position: "absolute", inset: 0,
          width: "100%", height: "100%",
          objectFit: "cover", zIndex: 0,
        } : { display: "none" }}
      />

      {/* Local PiP */}
      <video
        ref={localVideoRef} autoPlay muted playsInline
        style={isVideo ? {
          position: "absolute",
          bottom: "calc(env(safe-area-inset-bottom,0px) + 100px)",
          right: 14,
          width: "clamp(90px,14vw,148px)",
          height: "clamp(126px,19vw,208px)",
          objectFit: "cover",
          borderRadius: 12,
          border: "2px solid rgba(255,255,255,.18)",
          zIndex: 2,
          boxShadow: "0 4px 24px rgba(0,0,0,.6)",
        } : { display: "none" }}
      />

      {/* Main content area */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        zIndex: 1,
        overflow: "hidden",
        paddingTop: isVideo ? 0 : "clamp(16px,3vh,32px)",
      }}>
        {/* Background orbs — audio call only */}
        {!isVideo && (
          <>
            <div style={{
              position: "absolute", top: "-20%", left: "50%",
              transform: "translateX(-50%)",
              width: "clamp(260px,50%,480px)", height: "clamp(260px,50%,480px)",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(79,70,229,.13) 0%, transparent 68%)",
              pointerEvents: "none",
            }} />
            <div style={{
              position: "absolute", bottom: "8%", right: "-5%",
              width: "clamp(160px,28%,300px)", height: "clamp(160px,28%,300px)",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(16,185,129,.1) 0%, transparent 68%)",
              pointerEvents: "none",
            }} />
          </>
        )}

        {/* Audio call: avatar + name centred */}
        {!isVideo && (
          <div className="cw-anim-fade-up" style={{
            display: "flex", flexDirection: "column", alignItems: "center",
          }}>
            <div style={{ position: "relative", marginBottom: 18 }}>
              {isConnected && (
                <div style={{
                  position: "absolute", inset: -10,
                  borderRadius: "50%",
                  background: "rgba(34,197,94,.15)",
                  border: "1px solid rgba(34,197,94,.28)",
                }} />
              )}
              <img src={remoteAvatar} className="cw-avatar" alt={remoteName} />
              {isConnected && (
                <span style={{
                  position: "absolute", bottom: 3, right: 3,
                  width: 13, height: 13, borderRadius: "50%",
                  background: "#22c55e", border: "2px solid #0a0d14",
                }} />
              )}
            </div>

            <h2 style={{
              margin: 0,
              fontSize: "clamp(1.3rem,2.8vw,1.7rem)",
              fontWeight: 600,
              letterSpacing: "-.02em",
            }}>
              {remoteName}
            </h2>

            <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 7 }}>
              {isConnected ? (
                <>
                  <span className="cw-pulse" style={{
                    width: 7, height: 7, borderRadius: "50%",
                    background: "#4ade80", display: "inline-block",
                  }} />
                  <span style={{ color: "#4ade80", fontSize: ".85rem", fontWeight: 500 }}>
                    {fmt(seconds)}
                  </span>
                </>
              ) : (
                <span className="cw-pulse" style={{ color: "rgba(255,255,255,.38)", fontSize: ".85rem" }}>
                  Calling {remoteName}…
                </span>
              )}
            </div>

            {(isMuted || isSpeakerMuted) && (
              <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap", justifyContent: "center" }}>
                {isMuted        && <StatusPill color="red">🔇 Muted</StatusPill>}
                {isSpeakerMuted && <StatusPill color="yellow">🔈 Speaker off</StatusPill>}
              </div>
            )}
          </div>
        )}

        {/* Video call: name overlay at top */}
        {isVideo && (
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0,
            padding: "clamp(14px,2vw,22px) clamp(16px,2.5vw,28px)",
            background: "linear-gradient(180deg,rgba(0,0,0,.65) 0%,transparent 100%)",
            display: "flex", alignItems: "center", gap: 12,
            zIndex: 3,
          }}>
            <img src={remoteAvatar} style={{
              width: 36, height: 36, borderRadius: "50%",
              objectFit: "cover", border: "2px solid rgba(255,255,255,.2)",
            }} alt={remoteName} />
            <div>
              <div style={{ fontWeight: 600, fontSize: ".95rem" }}>{remoteName}</div>
              <div style={{ fontSize: ".75rem", color: "rgba(255,255,255,.5)", marginTop: 1 }}>
                {isConnected ? fmt(seconds) : "Connecting…"}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls bar */}
      <ControlBar
        isVideo={isVideo}
        isMuted={isMuted}
        isSpeakerMuted={isSpeakerMuted}
        onMute={onMute}
        onSpeaker={onSpeaker}
        onEnd={onEnd}
        onFlip={onFlip}
      />
    </div>
  );
}

/* ── Desktop title bar ── */
function TitleBar({ isConnected, isVideo }: any) {
  return (
    <div className="cw-titlebar">
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{
          width: 8, height: 8, borderRadius: "50%",
          background: isConnected ? "#22c55e" : "#f59e0b",
          boxShadow: isConnected
            ? "0 0 8px rgba(34,197,94,.6)"
            : "0 0 8px rgba(245,158,11,.55)",
        }} />
        <span style={{ fontSize: ".78rem", color: "rgba(255,255,255,.4)", fontWeight: 500 }}>
          {isVideo ? "Video" : "Voice"} call
        </span>
      </div>
      {/* macOS-style decorative dots */}
      <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
        {(["#ff5f57","#febc2e","#28c840"] as string[]).map((c, i) => (
          <div key={i} style={{
            width: 12, height: 12, borderRadius: "50%",
            background: c, opacity: .7,
          }} />
        ))}
      </div>
    </div>
  );
}

/* ── Bottom control bar ── */
function ControlBar({ isVideo, isMuted, isSpeakerMuted, onMute, onSpeaker, onEnd, onFlip }: any) {
  return (
    <div
      className="cw-glass"
      style={{
        margin: "0 clamp(12px,3vw,24px)",
        marginBottom: "calc(env(safe-area-inset-bottom,12px) + clamp(12px,2.5vh,24px))",
        borderRadius: 18,
        padding: "clamp(12px,2vw,18px) clamp(14px,3.5vw,28px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "clamp(10px,3vw,28px)",
        flexShrink: 0,
        position: "relative",
        zIndex: 4,
      }}
    >
      <CtrlBtn label={isMuted ? "Unmute" : "Mute"} on={isMuted} onClick={onMute} icon={<MicIcon muted={isMuted} />} />
      <CtrlBtn label={isSpeakerMuted ? "Unmute" : "Speaker"} on={isSpeakerMuted} onClick={onSpeaker} icon={<SpeakerIcon muted={isSpeakerMuted} />} />

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
        <button className="cw-end-btn" onClick={onEnd} aria-label="End call">
          <PhoneOff size={24} color="#fff" />
        </button>
        <span className="cw-ctrl-label">End</span>
      </div>

      {isVideo
        ? <CtrlBtn label="Flip" on={false} onClick={onFlip} icon={<FlipIcon />} />
        : <div style={{ width: 50, height: 50, visibility: "hidden" }} />}

      {/* Mirror spacer so End stays centred */}
      <div style={{ width: 50, height: 50, visibility: "hidden" }} />
    </div>
  );
}

/* ─────────────────────────────────────────
   Incoming Call Overlay
───────────────────────────────────────── */
function IncomingCallOverlay({ remoteName, remoteAvatar, callType, onAccept, onReject }: any) {
  return (
    <div className="cw-incoming-window cw-anim-scale-in" style={{ position: "fixed" }}>
      {/* Orb */}
      <div style={{
        position: "absolute", top: "5%", left: "50%", transform: "translateX(-50%)",
        width: "72%", height: "72%", borderRadius: "50%",
        background: "radial-gradient(circle, rgba(79,70,229,.12) 0%, transparent 65%)",
        pointerEvents: "none",
      }} />

      {/* macOS dots */}
      <div style={{ position: "absolute", top: 16, right: 18, display: "flex", gap: 7 }}>
        {(["#ff5f57","#febc2e","#28c840"] as string[]).map((c, i) => (
          <div key={i} style={{ width: 11, height: 11, borderRadius: "50%", background: c, opacity: .6 }} />
        ))}
      </div>

      {/* Avatar with ping rings */}
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 22 }}>
        <span className="cw-ping-a" style={{
          position: "absolute", width: 148, height: 148,
          borderRadius: "50%", background: "rgba(255,255,255,.05)",
        }} />
        <span className="cw-ping-b" style={{
          position: "absolute", width: 118, height: 118,
          borderRadius: "50%", background: "rgba(255,255,255,.08)",
        }} />
        <img src={remoteAvatar} className="cw-avatar" alt={remoteName} />
      </div>

      <p style={{
        color: "rgba(255,255,255,.4)", fontSize: ".7rem",
        fontWeight: 600, letterSpacing: ".14em",
        textTransform: "uppercase", margin: "0 0 6px",
      }}>
        Incoming {callType} call
      </p>

      <h2 style={{
        margin: "0 0 clamp(28px,5vh,40px)",
        fontSize: "clamp(1.4rem,3.5vw,1.7rem)",
        fontWeight: 700, letterSpacing: "-.03em",
        textAlign: "center", padding: "0 20px",
      }}>
        {remoteName}
      </h2>

      <div style={{ display: "flex", gap: "clamp(32px,10vw,60px)" }}>
        <ActionBtn variant="reject" label="Decline" onClick={onReject}>
          <PhoneOff size={24} color="#fff" />
        </ActionBtn>
        <ActionBtn variant="accept" label="Accept" onClick={onAccept}>
          <PhoneAcceptIcon />
        </ActionBtn>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Reusable small components
───────────────────────────────────────── */
function CtrlBtn({ icon, label, on, onClick }: any) {
  return (
    <div className="cw-ctrl-wrap">
      <button className={`cw-ctrl-btn ${on ? "on" : "off"}`} onClick={onClick} aria-label={label}>
        {icon}
      </button>
      <span className="cw-ctrl-label">{label}</span>
    </div>
  );
}

function ActionBtn({ variant, label, onClick, children }: any) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 9 }}>
      <button className={`cw-action-btn ${variant}`} onClick={onClick} aria-label={label}>
        {children}
      </button>
      <span style={{ color: "rgba(255,255,255,.4)", fontSize: 11.5, fontWeight: 500 }}>{label}</span>
    </div>
  );
}

function StatusPill({ color, children }: any) {
  const s = color === "red"
    ? { background: "rgba(239,68,68,.13)", border: "1px solid rgba(239,68,68,.32)", color: "#f87171" }
    : { background: "rgba(234,179,8,.13)",  border: "1px solid rgba(234,179,8,.32)",  color: "#fbbf24" };
  return (
    <span style={{ ...s, padding: "3px 11px", borderRadius: 99, fontSize: 11.5, fontWeight: 500 }}>
      {children}
    </span>
  );
}

/* ── Icons (unchanged) ── */
function PhoneAcceptIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="white" style={{ width: 26, height: 26 }}>
      <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24 11.47 11.47 0 003.59.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.57a1 1 0 01-.25 1.01l-2.2 2.21z" />
    </svg>
  );
}
function MicIcon({ muted }: { muted: boolean }) {
  return muted ? (
    <svg viewBox="0 0 24 24" style={{ width: 21, height: 21 }} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6" />
      <path d="M17 16.95A7 7 0 015 12v-2m14 0v2a7 7 0 01-.11 1.23M12 19v4M8 23h8" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" style={{ width: 21, height: 21 }} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
      <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />
    </svg>
  );
}
function SpeakerIcon({ muted }: { muted: boolean }) {
  return muted ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 21, height: 21 }}>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 21, height: 21 }}>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14" />
    </svg>
  );
}
function FlipIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 21, height: 21 }}>
      <path d="M23 7l-7 5 7 5V7z" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      <path d="M7 3l-3 3 3 3M4 6h5" />
    </svg>
  );
}