
import { useState, useRef, useEffect } from "react";
import { sendMessageApi } from "../../apis/chat.api";
import { socket } from "../../apis/socket";
import { useAuth } from "../../context/AuthContext";
import { Paperclip, Send, X, Smile, Mic, Square } from "lucide-react";
import EmojiPicker, { Theme } from "emoji-picker-react";

export default function MessageInput({
  chatId,
  receiverId,
  onLocalSend,
  replyTo,
  clearReply,
}: any) {

  const [text, setText] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);

  const [recording, setRecording] = useState(false);
  const [lockedRecording, setLockedRecording] = useState(false);
  const [cancelRecording, setCancelRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);

  const timerRef = useRef<any>(null);
  const mediaRecorderRef = useRef<any>(null);
  const audioChunksRef = useRef<any[]>([]);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  const typingTimeoutRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { user } = useAuth();

  useEffect(() => {
    const close = () => setShowEmoji(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const getPoint = (e: any) => {
    if (e.touches && e.touches.length) return e.touches[0];
    if (e.changedTouches && e.changedTouches.length) return e.changedTouches[0];
    return e;
  };

  const startRecording = async (e: any) => {

    const point = getPoint(e);

    try {

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const recorder = new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (ev: any) => {
        audioChunksRef.current.push(ev.data);
      };

      recorder.onstop = () => {

        clearInterval(timerRef.current);
        stream.getTracks().forEach((track) => track.stop());

        if (cancelRecording) {
          setCancelRecording(false);
          setRecordTime(0);
          return;
        }

        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });

        const audioFile = new File(
          [blob],
          `voice-${Date.now()}.webm`,
          { type: "audio/webm" }
        );

        setPendingFile(audioFile);
        setRecordTime(0);

      };

      recorder.start();

      setRecording(true);

      startPosRef.current = {
        x: point.clientX,
        y: point.clientY,
      };

      setRecordTime(0);

      timerRef.current = setInterval(() => {
        setRecordTime((prev) => prev + 1);
      }, 1000);

    } catch {
      console.log("Mic permission denied");
    }
  };

  const stopRecording = () => {

    if (lockedRecording) return;

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }

    setRecording(false);
  };

  const stopLockedRecording = () => {

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }

    clearInterval(timerRef.current);

    setLockedRecording(false);
    setRecording(false);
  };

  const handleMove = (e: any) => {

    if (!recording || !startPosRef.current) return;

    const point = getPoint(e);

    const dx = point.clientX - startPosRef.current.x;
    const dy = point.clientY - startPosRef.current.y;

    if (dx < -80) {
      setCancelRecording(true);
      stopRecording();
    }

    if (dy < -80) {
      setLockedRecording(true);
    }
  };

  const send = async (retryPayload?: { text: string; file: File | null }) => {

    if (!user || !user._id) return;

    const finalText = retryPayload?.text ?? text;
    const finalFile = retryPayload?.file ?? pendingFile;

    if (!finalText.trim() && !finalFile) return;

    const clientId = crypto.randomUUID();
    const sentAt = performance.now();

    const tempMsg = {
      _id: undefined,
      clientId,
      text: finalText || "",
      senderId: user._id,
      receiverId: receiverId,
      __sentAt: sentAt,
      createdAt: new Date().toISOString(),
      status: "sending",
      isTemp: true,
      replyTo: replyTo
        ? {
            _id: replyTo._id,
            clientId: replyTo.clientId,
            text: replyTo.text,
            senderId: replyTo.senderId,
            senderName:
              replyTo.senderId === user._id
                ? "You"
                : replyTo.senderName,
          }
        : null,
      attachment: finalFile
        ? { name: finalFile.name, type: finalFile.type }
        : undefined,
    };

    onLocalSend((prev: any[]) => [...prev, tempMsg]);

    setText("");
    setPendingFile(null);
    setShowEmoji(false);

    const form = new FormData();
    form.append("text", finalText || " ");
    form.append("clientId", clientId);

    if (finalFile) form.append("file", finalFile);
    if (replyTo?._id) form.append("replyTo", replyTo._id);

    try {
      await sendMessageApi(chatId, form);
      socket.emit("stop-typing", { to: chatId });
      clearReply?.();
    } catch {
      onLocalSend((prev: any[]) =>
        prev.map((m) =>
          m.clientId === clientId ? { ...m, status: "failed" } : m
        )
      );
    }
  };

  return (

    <div
      className="px-0 pt-2 touch-none"
      onPointerMove={handleMove}
      onPointerUp={stopRecording}
    >

      <div className="bg-white/20 backdrop-blur-md rounded-2xl px-2 sm:px-3 py-1.5 sm:py-2">

        {recording && !lockedRecording && (
          <div className="text-xs text-white mb-1 flex justify-between">
            <span>⬅ slide left to cancel</span>
            <span className="font-mono">🎙 {formatTime(recordTime)}</span>
            <span>⬆ slide up to lock</span>
          </div>
        )}

        {lockedRecording && (
          <div className="flex items-center gap-2 mb-1 text-white text-xs">
            <span className="font-mono">🎙 {formatTime(recordTime)}</span>
            <span>🔒 Recording locked</span>

            <button
              onClick={stopLockedRecording}
              className="ml-auto bg-red-500 rounded-full p-1"
            >
              <Square size={14}/>
            </button>
          </div>
        )}

        {replyTo && (
          <div className="mb-1 flex items-center gap-2 px-2 py-0.5 text-xs rounded-lg bg-black/30 text-white">
            <div className="flex-1 min-w-0">
              <div className="opacity-70 truncate">
                {replyTo.senderId === user._id ? "You" : replyTo.senderName || "User"}
              </div>
              <div className="truncate">
                {replyTo.text || replyTo.attachment?.name || "Attachment"}
              </div>
            </div>
            <button onClick={clearReply} className="opacity-70 hover:opacity-100">
              <X size={14}/>
            </button>
          </div>
        )}

        {pendingFile && (
          <div className="mb-1 flex items-center gap-2 px-2 py-1 text-xs rounded-lg bg-white/20 text-white">

            {pendingFile.type.startsWith("audio") ? (
              <audio controls className="flex-1">
                <source src={URL.createObjectURL(pendingFile)} />
              </audio>
            ) : (
              <span className="truncate flex-1">{pendingFile.name}</span>
            )}

            <button onClick={() => setPendingFile(null)} className="text-red-400">
              <X size={14}/>
            </button>

          </div>
        )}

        <div className="relative flex items-center gap-2 min-h-[35px]">

          <label className="cursor-pointer text-white/80">
            <Paperclip size={20}/>
            <input
              ref={fileInputRef}
              type="file"
              hidden
              onChange={(e) => setPendingFile(e.target.files?.[0] || null)}
            />
          </label>

          {!text && !pendingFile && !recording && (
            <button
              onPointerDown={startRecording}
              className="text-white/80"
            >
              <Mic size={20}/>
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowEmoji((prev) => !prev);
            }}
            className="hidden md:flex text-white/80"
          >
            <Smile size={20}/>
          </button>

          <input
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              socket.emit("typing", { to: chatId });
              clearTimeout(typingTimeoutRef.current);
              typingTimeoutRef.current = setTimeout(
                () => socket.emit("stop-typing", { to: chatId }),
                1200
              );
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            className="flex-1 bg-transparent text-white text-sm placeholder-white/50 outline-none"
            placeholder="Type a message..."
          />

          <button
            onClick={() => send()}
            disabled={!text.trim() && !pendingFile}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-indigo-500 text-white disabled:opacity-40"
          >
            <Send size={16}/>
          </button>

          {showEmoji && (
            <div
              className="absolute bottom-12 left-10 z-50 hidden md:block"
              onClick={(e) => e.stopPropagation()}
            >
              <EmojiPicker
                theme={Theme.DARK}
                onEmojiClick={(emojiData) =>
                  setText((prev) => prev + emojiData.emoji)
                }
              />
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
