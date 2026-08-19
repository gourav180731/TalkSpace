import React from "react";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="
        min-h-screen relative overflow-hidden

        /* Light */
        bg-gradient-to-br
        from-indigo-100 via-purple-100 to-pink-100

        /* Dark */
        dark:from-[#1a1a2e]
        dark:via-[#16213e]
        dark:to-[#0f3460]
      "
    >
      {children}
    </div>
  );
}
