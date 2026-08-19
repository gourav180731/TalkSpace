import { useState } from "react";

export function useProfilePeek() {
  const [user, setUser] = useState<any>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const open = (e: any, u: any) => {
    const PEEK_WIDTH = 260;
    const PEEK_HEIGHT = 320;
    const MARGIN = 12;

    let x = e.clientX + 12;
    let y = e.clientY + 12;

    if (x + PEEK_WIDTH > window.innerWidth) {
      x = window.innerWidth - PEEK_WIDTH - MARGIN;
    }

    if (y + PEEK_HEIGHT > window.innerHeight) {
      y = window.innerHeight - PEEK_HEIGHT - MARGIN;
    }

    setUser(u);
    setPos({ x, y });
  };

  const close = () => setUser(null);

  return { user, pos, open, close };
}
