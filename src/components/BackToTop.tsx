"use client";

import { useEffect, useState } from "react";

export default function BackToTop({ label }: { label: string }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const toggle = () => setVisible(window.scrollY > 500);
    window.addEventListener("scroll", toggle, { passive: true });
    toggle();
    return () => window.removeEventListener("scroll", toggle);
  }, []);
  return (
    <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className={`back-to-top fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-ecideBlue text-white shadow-card hover:bg-ecideDarkBlue ${visible ? "is-visible" : ""}`} aria-label={label}>
      <i className="fa-solid fa-arrow-up" aria-hidden="true"></i>
    </button>
  );
}
