import { io } from "socket.io-client";

export const socket = io(import.meta.env.VITE_SOCKET_URL, {
  withCredentials: true,
  autoConnect: false, 
  transports: ["websocket"],
  timeout: 20000,
});


socket.on("connect", () => {
  console.log("🟢 socket connected:", socket.id);
});

socket.on("disconnect", (reason) => {
  console.log("🔴 socket disconnected:", reason);
});

socket.on("connect_error", (err) => {
  console.error("❌ socket connect error:", err.message);
});

socket.io.on("reconnect", () => {
  console.log("♻️ reconnected:", socket.id);
});

socket.on("incoming-call", (data) => {
  console.log("📞 incoming call:", data);
});

socket.on("call-answered", (data) => {
  console.log("✅ call answered:", data);
});

socket.on("ice-candidate", () => {
  console.log("🧊 ICE received");
});

socket.on("call-ended", () => {
  console.log("🔴 call ended");
});