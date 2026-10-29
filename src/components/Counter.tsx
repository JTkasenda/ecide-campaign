"use client";

import { useEffect, useRef, useState } from "react";
import { formatNumber } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

/** Compteur animé de 0 à la valeur quand il devient visible ; le texte final est présent sans JS. */
export default function Counter({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState<string | null>(null);
  const { locale } = useI18n();

  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / 1600);
        const eased = 1 - Math.pow(1 - t, 3);
        setDisplay(t < 1 ? formatNumber(Math.round(value * eased), locale) : null);
        if (t < 1) requestAnimationFrame(tick);
      };
      setDisplay("0");
      requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [value, locale]);

  return <span ref={ref}>{display ?? String(value)}</span>;
}

/** « 26 », « 18-35 » ou texte libre : les nombres sont animés, le reste rendu tel quel. */
export function CounterValue({ value }: { value: string }) {
  const parts = value.trim().split("-");
  if (parts.length === 2 && !isNaN(Number(parts[0])) && !isNaN(Number(parts[1]))) {
    return (
      <>
        <Counter value={Number(parts[0])} />-<Counter value={Number(parts[1])} />
      </>
    );
  }
  return !isNaN(Number(value)) && value.trim() !== "" ? <Counter value={Number(value)} /> : <>{value}</>;
}
