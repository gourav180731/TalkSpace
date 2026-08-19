import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Phone, Video, Mic, MessageSquare, Image, Zap, Shield, Bot, ArrowRight, Github, Mail, X } from "lucide-react";

/* ── useInView hook for scroll animations ── */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

/* ── Animated counter ── */
function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const { ref, visible } = useInView();
  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const step = to / 60;
    const t = setInterval(() => {
      start += step;
        if (start >= to) { setVal(to); clearInterval(t); }
      else setVal(Math.floor(start));
    }, 16);
    return () => clearInterval(t);
  }, [visible, to]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

/* ── Floating chat bubble ── */
function ChatMock() {
  const messages = [
    { me: false, text: "Hey! Can you hop on a call? 📞", delay: 0 },
    { me: true,  text: "Sure, starting video call now 🎥", delay: 400 },
    { me: false, text: "Also sending you the voice note 🎙️", delay: 800 },
    { me: true,  text: "Got it! Sounds great ✨", delay: 1200 },
  ];
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const timers = messages.map((m, i) =>
      setTimeout(() => setShown(i + 1), 600 + m.delay)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="relative w-full max-w-[320px] sm:max-w-[360px] mx-auto" style={{ animation: "float 5s ease-in-out infinite" }}>
      {/* Glow behind */}
      <div className="absolute -inset-8 bg-indigo-500/15 blur-[60px] rounded-full pointer-events-none" />

      <div className="relative rounded-2xl bg-[#121520] border border-white/10 shadow-[0_32px_80px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.05)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-white/[0.03]">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-xs font-bold">R</div>
          <div>
            <p className="text-white text-sm font-semibold leading-none">Raj</p>
            <p className="text-emerald-400 text-[10px] mt-0.5">● online</p>
          </div>
          <div className="ml-auto flex gap-3">
            <Phone size={14} className="text-white/40" />
            <Video size={14} className="text-white/40" />
          </div>
        </div>

        {/* Messages */}
        <div className="px-4 py-4 space-y-2.5 min-h-[180px]">
          {messages.slice(0, shown).map((m, i) => (
            <div
              key={i}
              className={`flex ${m.me ? "justify-end" : "justify-start"}`}
              style={{ animation: "msgIn 0.3s ease forwards" }}
            >
              <div className={`max-w-[78%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${m.me ? "bg-indigo-600 text-white rounded-br-sm" : "bg-white/10 text-white/90 rounded-bl-sm"}`}>
                {m.text}
              </div>
            </div>
          ))}

          {/* Voice message preview */}
          {shown >= 3 && (
            <div className="flex justify-start" style={{ animation: "msgIn 0.3s ease forwards" }}>
              <div className="flex items-center gap-2 px-3 py-2 rounded-2xl rounded-bl-sm bg-white/10 w-[160px]">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <div className="w-0 h-0 border-y-[4px] border-y-transparent border-l-[7px] border-l-white ml-0.5" />
                </div>
                <div className="flex items-center gap-[2px] flex-1 h-5">
                  {[0.3,0.7,0.5,1,0.4,0.8,0.6,0.9,0.3,0.7,0.5,0.4].map((h, i) => (
                    <div key={i} className="flex-1 rounded-full bg-white/40" style={{ height: `${h * 100}%` }} />
                  ))}
                </div>
                <span className="text-[9px] text-white/40">0:08</span>
              </div>
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className="px-3 py-2.5 border-t border-white/10 flex items-center gap-2 bg-[#0f1118]/80">
          <div className="flex-1 h-8 rounded-full bg-white/10 px-3 flex items-center">
            <span className="text-white/20 text-xs">Message…</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">
            <Mic size={13} className="text-white" />
          </div>
        </div>
      </div>

      {/* Floating call badge */}
      <div className="absolute -top-4 -right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/90 backdrop-blur-sm shadow-lg shadow-emerald-500/30 border border-emerald-400/30">
        <Video size={11} className="text-white" />
        <span className="text-white text-[10px] font-semibold">Live call</span>
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function HomePage() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const hero = useInView(0.1);
  const features = useInView(0.1);
  const stats = useInView(0.1);
  const steps = useInView(0.1);
  const cta = useInView(0.1);

  return (
    <div
      className="bg-[#0b0d12] text-white min-h-screen overflow-x-hidden"
      style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800&family=Instrument+Serif:ital@0;1&display=swap');

        @keyframes msgIn {
          from { opacity: 0; transform: translateY(8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes float {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-12px); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(32px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes pulse-ring {
          0%   { transform: scale(0.8); opacity: 0.6; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes gridMove {
          from { transform: translateY(0); }
          to   { transform: translateY(60px); }
        }
        .float { animation: float 5s ease-in-out infinite; }
        .shimmer-text {
          background: linear-gradient(90deg, #818cf8, #c7d2fe, #818cf8);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 3s linear infinite;
        }
        .reveal { opacity: 0; }
        .reveal.in { animation: fadeUp 0.7s ease forwards; }
        .reveal-delay-1.in { animation-delay: 0.1s; }
        .reveal-delay-2.in { animation-delay: 0.2s; }
        .reveal-delay-3.in { animation-delay: 0.3s; }
        .reveal-delay-4.in { animation-delay: 0.4s; }
        .reveal-delay-5.in { animation-delay: 0.5s; }
        .reveal-delay-6.in { animation-delay: 0.6s; }
        .feature-card {
          background: linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%);
          border: 1px solid rgba(255,255,255,0.07);
          transition: border-color 0.3s, transform 0.3s, box-shadow 0.3s;
        }
        .feature-card:hover {
          border-color: rgba(99,102,241,0.4);
          transform: translateY(-4px);
          box-shadow: 0 20px 60px rgba(99,102,241,0.12);
        }
        .nav-link {
          position: relative;
          transition: color 0.2s;
        }
        .nav-link::after {
          content: '';
          position: absolute;
          bottom: -2px; left: 0;
          width: 0; height: 1px;
          background: #818cf8;
          transition: width 0.3s;
        }
        .nav-link:hover::after { width: 100%; }
        .nav-link:hover { color: white; }
      `}</style>


      {/* ── NAVBAR ── */}
      <header
        className={`
          fixed top-4 left-1/2 -translate-x-1/2
          w-[94%] max-w-6xl
          z-50
          bg-[#0b0d12]/80 backdrop-blur-xl
          border border-white/10
          rounded-2xl
          transition-all duration-300
          ${scrolled ? "shadow-xl shadow-black/30" : ""}
        `}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <h1
            className="text-lg sm:text-xl font-bold tracking-wide cursor-pointer"
            onClick={() => scrollTo("hero")}
          >
            ChitChat
          </h1>

          {/* DESKTOP NAV */}
          <nav className="hidden sm:flex items-center gap-6 text-sm text-white/80">
            <button onClick={() => scrollTo("features")} className="nav-link">Features</button>
            <button onClick={() => scrollTo("about")} className="nav-link">How it works</button>
            <button onClick={() => scrollTo("contact")} className="nav-link">Contact</button>
            <button
              onClick={() => navigate("/login")}
              className="px-4 py-2 rounded-md bg-white text-black font-medium hover:bg-gray-200 hover:-translate-y-0.5 transition"
            >
              Login
            </button>
          </nav>

          {/* MOBILE HAMBURGER */}
          <button className="sm:hidden flex flex-col gap-1" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
            {menuOpen ? <X size={20} className="text-white" /> : (
              <>
                <span className="w-6 h-[2px] bg-white rounded" />
                <span className="w-6 h-[2px] bg-white rounded" />
                <span className="w-6 h-[2px] bg-white rounded" />
              </>
            )}
          </button>
        </div>

        {/* MOBILE MENU */}
        {menuOpen && (
          <div className="sm:hidden bg-[#0b0d12] border-t border-white/10 rounded-b-2xl">
            <div className="px-4 py-4 flex flex-col gap-4 text-sm text-white/80">
              <button onClick={() => scrollTo("features")}>Features</button>
              <button onClick={() => scrollTo("about")}>How it works?</button>
              <button onClick={() => scrollTo("contact")}>Contact</button>
              <button
                onClick={() => navigate("/login")}
                className="mt-2 px-4 py-2 rounded-md bg-white text-black font-medium"
              >
                Login
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ── HERO ── */}
      <section id="hero" className="relative pt-24 sm:pt-32 px-4" style={{ zIndex: 1 }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-16 grid grid-cols-1 md:grid-cols-2 gap-12 sm:gap-20 items-center">

          {/* LEFT */}
          <div ref={hero.ref} className={`reveal ${hero.visible ? "in" : ""}`}>
            {/* Badge */}
            <div className={`reveal ${hero.visible ? "in" : ""} flex mb-6`}>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Now with HD video & audio calls
              </div>
            </div>

            <h1
              className={`reveal reveal-delay-1 ${hero.visible ? "in" : ""} text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight`}
            >
              <span className="text-white">Chat instantly.</span>
              <br />
              <span className="shimmer-text">No noise.</span>
              <br />
              <span className="text-white">Just people.</span>
            </h1>

            <p className={`reveal reveal-delay-2 ${hero.visible ? "in" : ""} text-white/50 text-base sm:text-lg max-w-xl mt-6 mb-8 sm:mb-10`}>
              Messages, voice notes, HD calls — all in one clean space. No clutter, no ads, no noise.
            </p>

            <div className={`reveal reveal-delay-3 ${hero.visible ? "in" : ""} flex flex-col sm:flex-row gap-4`}>
              <button
                onClick={() => navigate("/register")}
                className="group flex items-center gap-2 px-6 py-3 rounded-md bg-indigo-600 font-semibold hover:bg-indigo-500 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-600/30 transition justify-center"
              >
                Get Started
                <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => scrollTo("features")}
                className="px-6 py-3 rounded-md border border-white/20 hover:bg-white/5 hover:-translate-y-0.5 transition"
              >
                See Features
              </button>
            </div>
          </div>

          {/* RIGHT — Mock */}
          <div className={`reveal reveal-delay-4 ${hero.visible ? "in" : ""} flex justify-center md:justify-end`}>
            <ChatMock />
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section style={{ zIndex: 1, position: "relative" }} className="border-y border-white/10 bg-[#0f1118]/80 py-12 sm:py-16 px-4">
        <div
          ref={stats.ref}
          className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8 text-center"
        >
          {[
            { val: 12400, suffix: "+", label: "Active users" },
            { val: 99,    suffix: ".9%", label: "Uptime" },
            { val: 0,     suffix: " ads", label: "Zero ads. Ever." },
            { val: 256,   suffix: "-bit", label: "Encryption" },
          ].map(({ val, suffix, label }, i) => (
            <div key={i} className={`reveal reveal-delay-${i+1} ${stats.visible ? "in" : ""}`}>
              <p className="text-3xl sm:text-4xl font-bold text-white mb-1" style={{ fontFamily: "'Instrument Serif', serif" }}>
                {stats.visible ? <Counter to={val} suffix={suffix} /> : `0${suffix}`}
              </p>
              <p className="text-white/40 text-xs sm:text-sm">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{ zIndex: 1, position: "relative" }} className="py-20 sm:py-28 px-4">
        <div className="max-w-4xl mx-auto">
          <div ref={features.ref} className={`reveal ${features.visible ? "in" : ""} text-center mb-14`}>
            <p className="text-indigo-400 text-sm font-medium tracking-widest uppercase mb-3">Everything you need</p>
            <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: "clamp(2rem, 4vw, 3rem)" }} className="text-white">
              Built for real conversations
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: <MessageSquare size={20} />, title: "Instant Messaging", desc: "Real-time messages that feel instant. Replies, reactions, and read receipts included.", delay: 1, color: "indigo" },
              { icon: <Video size={20} />, title: "HD Video Calls", desc: "Crystal-clear video calls with front/rear camera switching and no time limits.", delay: 2, color: "violet" },
              { icon: <Phone size={20} />, title: "Voice Calls", desc: "Low-latency audio calls with noise cancellation and mute/speaker controls.", delay: 3, color: "blue" },
              { icon: <Mic size={20} />, title: "Voice Messages", desc: "Record and send voice notes with a custom waveform player.", delay: 4, color: "cyan" },
              { icon: <Image size={20} />, title: "Files & Media", desc: "Share images, videos, PDFs, and documents. Inline preview for everything.", delay: 5, color: "emerald" },
              { icon: <Bot size={20} />, title: "AI Assistant", desc: "Built-in AI chat companion for smart replies, summaries, and assistance.", delay: 6, color: "rose" },
            ].map(({ icon, title, desc, delay, color }) => {
              const colors: any = {
                indigo: "bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20",
                violet: "bg-violet-500/10 text-violet-400 group-hover:bg-violet-500/20",
                blue:   "bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20",
                cyan:   "bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500/20",
                emerald:"bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20",
                rose:   "bg-rose-500/10 text-rose-400 group-hover:bg-rose-500/20",
              };
              return (
                <div
                  key={title}
                  className={`reveal reveal-delay-${delay} ${features.visible ? "in" : ""} feature-card group rounded-2xl p-6`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-colors ${colors[color]}`}>
                    {icon}
                  </div>
                  <h3 className="font-semibold text-white mb-2 text-sm">{title}</h3>
                  <p className="text-white/45 text-sm leading-relaxed">{desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CALL HIGHLIGHT ── */}
      <section style={{ zIndex: 1, position: "relative" }} className="py-16 sm:py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative rounded-3xl overflow-hidden border border-white/[0.08] bg-gradient-to-br from-indigo-900/30 via-[#0d0f1a] to-blue-900/20 p-8 sm:p-12">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 blur-3xl rounded-full pointer-events-none" />

            <div className="grid sm:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  HD Calls — live now
                </div>
                <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: "clamp(1.8rem, 3.5vw, 2.5rem)" }} className="text-white mb-4 leading-tight">
                  Voice & video calls<br/>that just work.
                </h2>
                <p className="text-white/50 text-sm leading-relaxed mb-6">
                  30-second auto-cutoff if unanswered. Instant "busy" detection. Ringtone feedback. Full WebRTC with TURN relay — works through any firewall.
                </p>
                <div className="flex flex-wrap gap-2">
                  {["Auto-cutoff 30s", "Busy detection", "TURN relay", "Noise cancel", "Camera flip"].map(tag => (
                    <span key={tag} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/60 text-xs">{tag}</span>
                  ))}
                </div>
              </div>

              {/* Call UI preview */}
              <div className="flex justify-center">
                <div className="relative w-48">
                  {/* Ripple rings */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    {[1,2,3].map(i => (
                      <div
                        key={i}
                        className="absolute rounded-full border border-indigo-500/20"
                        style={{
                          width: 48 + i * 36, height: 48 + i * 36,
                          animation: `pulse-ring 2s ease-out ${i * 0.5}s infinite`,
                        }}
                      />
                    ))}
                  </div>
                  <div className="relative z-10 w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-2xl shadow-indigo-500/40 border-4 border-white/10">
                    <Video size={28} className="text-white" />
                  </div>
                  <p className="text-center text-white/60 text-xs mt-6">Calling Raj…</p>
                  <div className="flex justify-center gap-4 mt-4">
                    <div className="w-10 h-10 rounded-full bg-red-500/90 flex items-center justify-center shadow-lg shadow-red-500/30">
                      <Phone size={16} className="text-white rotate-[135deg]" />
                    </div>
                    <div className="w-10 h-10 rounded-full bg-emerald-500/90 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                      <Phone size={16} className="text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="about" style={{ zIndex: 1, position: "relative" }} className="py-20 sm:py-28 px-4 border-t border-white/10">
        <div className="max-w-3xl mx-auto text-center">
          <div ref={steps.ref} className={`reveal ${steps.visible ? "in" : ""}`}>
            <p className="text-indigo-400 text-sm font-medium tracking-widest uppercase mb-3">Simple process</p>
            <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: "clamp(2rem, 4vw, 3rem)" }} className="text-white mb-14">
              Up in 30 seconds
            </h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-8 relative">
            {/* Connector line */}
            <div className="hidden sm:block absolute top-8 left-[22%] right-[22%] h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />

            {[
              { n: "01", title: "Create account", desc: "Sign up in seconds. No credit card, no junk mail." },
              { n: "02", title: "Find your people", desc: "Search by username. Send a request, start chatting." },
              { n: "03", title: "Talk freely", desc: "Text, voice note, audio call, or video — your choice." },
            ].map(({ n, title, desc }, i) => (
              <div key={n} className={`reveal reveal-delay-${i+1} ${steps.visible ? "in" : ""} flex flex-col items-center`}>
                <div className="w-16 h-16 rounded-2xl bg-indigo-600/15 border border-indigo-500/20 flex items-center justify-center mb-4">
                  <span style={{ fontFamily: "'Instrument Serif', serif" }} className="text-indigo-400 text-xl font-bold">{n}</span>
                </div>
                <h3 className="font-semibold text-white mb-2">{title}</h3>
                <p className="text-white/45 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ zIndex: 1, position: "relative" }} className="py-20 sm:py-28 px-4">
        <div ref={cta.ref} className="max-w-2xl mx-auto text-center">
          <div className={`reveal ${cta.visible ? "in" : ""} relative rounded-3xl border border-white/[0.08] bg-gradient-to-b from-indigo-900/20 to-transparent p-12 sm:p-16 overflow-hidden`}>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(99,102,241,0.15),transparent_70%)] pointer-events-none" />
            <Zap size={28} className="mx-auto mb-5 text-indigo-400" />
            <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: "clamp(2rem, 4vw, 3rem)" }} className="text-white mb-4 leading-tight">
              Ready to connect?
            </h2>
            <p className="text-white/50 mb-8 text-sm leading-relaxed">
              Join thousands of people having real conversations on ChitChat. Free forever.
            </p>
            <button
              onClick={() => navigate("/register")}
              className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-indigo-600 font-semibold hover:bg-indigo-500 transition-all hover:shadow-2xl hover:shadow-indigo-600/40 hover:-translate-y-0.5"
            >
              Create free account
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <p className="text-white/25 text-xs mt-4">No credit card · No ads · No BS</p>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer id="contact" style={{ zIndex: 1, position: "relative" }} className="border-t border-white/10 py-8 px-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-white/35 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-indigo-600/60 flex items-center justify-center">
              <MessageSquare size={10} className="text-white" />
            </div>
            <span>© {new Date().getFullYear()} ChitChat</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="https://github.com/raj-krr/chitchat" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-white transition">
              <Github size={14} /><span>GitHub</span>
            </a>
            <a href="mailto:mr.rajkumar2468@gmail.com" className="flex items-center gap-1.5 hover:text-white transition">
              <Mail size={14} /><span>Contact</span>
            </a>
            <div className="flex items-center gap-1.5">
              <Shield size={12} className="text-emerald-500/60" />
              <span className="text-emerald-500/60">End-to-end encrypted</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}