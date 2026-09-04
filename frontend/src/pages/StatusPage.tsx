import StatusList from "../components/status/StatusList";
import AppNavbar from "../components/layout/AppNavbar";
import MobileBottomNav from "../components/layout/MobileBottomNav";
import { useRef } from "react";
import { useScrollDirection } from "../utils/useScrollDirection";

export default function StatusPage(){
  const ref=useRef<HTMLDivElement>(null);
  const visible=useScrollDirection(ref as any);
  return (
    <div className="min-h-screen bg-[#0b0d12] relative overflow-hidden">
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-indigo-600/20 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute top-40 -right-40 w-[400px] h-[400px] bg-blue-500/20 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />
      <div className="hidden md:block fixed top-1 left-1/2 -translate-x-1/2 w-[94%] max-w-6xl z-[100]">
        <AppNavbar />
      </div>
      <div className="relative z-10 md:pt-24">
        <div className="max-w-3xl mx-auto h-[calc(100vh)] md:h-[calc(100vh-8rem)] overflow-hidden md:rounded-3xl bg-[#121520]/90 backdrop-blur-xl border border-white/10 shadow-2xl flex flex-col">
          <div className="p-6 border-b border-white/10">
            <h1 className="text-white font-bold text-xl">Status</h1>
            <p className="text-white/60 text-sm mt-1">Share moments that disappear after 24 hours</p>
          </div>
          <div ref={ref as any} className="flex-1 overflow-auto p-4 space-y-4">
            <StatusList />
          </div>
        </div>
      </div>
      <MobileBottomNav active="status" visible={visible} />
    </div>
  );
}
