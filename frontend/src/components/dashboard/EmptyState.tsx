export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center text-[#2b1f16] h-full px-6 dark:text-white">
      <div
        className="relative w-24 h-24 mb-6"
        style={{ animation: "float 5s ease-in-out infinite" }}
      >
        <div className="absolute inset-0 bg-[#ffc545]/25 blur-2xl rounded-full" />
        <img
          src="/talkspace-icon.svg"
          alt="TalkSpace"
          className="relative w-24 h-24 rounded-3xl shadow-xl shadow-[#ffc545]/30 border border-[#ffc545]/30"
        />
        <div className="absolute -right-1 -bottom-1 w-9 h-9 rounded-full bg-[#ffc545] flex items-center justify-center text-lg shadow-lg shadow-[#ffc545]/40">
          👋
        </div>
        <div className="absolute -left-3 -top-2 w-6 h-6 rounded-full bg-[#ffe9a8]/60 flex items-center justify-center text-xs" style={{ animation: "float 3.5s ease-in-out infinite" }}>
          💬
        </div>
      </div>
      <h1
        className="text-4xl font-extrabold tracking-tight"
        style={{ fontFamily: "'Baloo 2', 'Plus Jakarta Sans', system-ui, sans-serif" }}
      >
        Hey, it's quiet in here
      </h1>
      <p className="mt-3 text-[#2b1f16]/60 text-center max-w-xs leading-relaxed dark:text-white/70">
        Pick a conversation on the left, or start a new one with a friend.
        No one to talk to? Echo is always around for a chat.
      </p>
    </div>
  );
}