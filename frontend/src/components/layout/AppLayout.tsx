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
        from-orange-50 via-amber-50 to-teal-50

        /* Dark */
        dark:from-[#1c1511]
        dark:via-[#221813]
        dark:to-[#0f1d1a]
      "
    >
      {children}
    </div>
  );
}
