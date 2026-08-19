import { useEffect, useRef, useState } from "react";

export function useScrollDirection<T extends HTMLElement>(
  scrollRef?: React.RefObject<T | null>,
  threshold = 10
) {
  const [visible, setVisible] = useState(true);
  const lastScroll = useRef(0);

  useEffect(() => {
    const target = scrollRef?.current || window;

    const getScroll = () => {
      if (target === window) {
        return window.scrollY;
      }
      return (target as HTMLElement).scrollTop;
    };

    const onScroll = () => {
      const current = getScroll();

      if (Math.abs(current - lastScroll.current) < threshold) return;

      if (current > lastScroll.current) {
        setVisible(false); // scrolling down
      } else {
        setVisible(true); // scrolling up
      }

      lastScroll.current = current;
    };

    target.addEventListener("scroll", onScroll, { passive: true });
    return () => target.removeEventListener("scroll", onScroll);
  }, [scrollRef, threshold]);

  return visible;
}
