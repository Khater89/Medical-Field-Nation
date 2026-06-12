import { useEffect, useRef } from "react";

/**
 * M3 scroll-triggered reveal.
 * Adds `is-visible` class to elements with `.m3-reveal` once they enter the viewport.
 * Respects prefers-reduced-motion automatically via the CSS utility.
 */
export function useM3ScrollReveal<T extends HTMLElement = HTMLElement>(deps: unknown[] = []) {
  const rootRef = useRef<T | null>(null);

  useEffect(() => {
    const root = rootRef.current ?? document.body;
    const targets = root.querySelectorAll<HTMLElement>(".m3-reveal:not(.is-visible)");
    if (targets.length === 0) return;

    if (typeof IntersectionObserver === "undefined") {
      targets.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return rootRef;
}
