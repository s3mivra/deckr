import { useEffect, useRef } from 'react';

// A soft blob that lags behind the pointer. Pointer devices only, and it stays
// out of the way of reduced motion users (hidden via CSS). Disabled on touch.
export default function CursorGlow() {
  const ref = useRef(null);

  useEffect(() => {
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (coarse || reduced) return undefined;

    const el = ref.current;
    if (!el) return undefined;

    let x = -100;
    let y = -100;
    let tx = -100;
    let ty = -100;
    let raf = 0;

    const onMove = (e) => {
      tx = e.clientX;
      ty = e.clientY;
      const interactive = e.target.closest?.(
        'a, button, .btn, .tag, [role="button"], .theme-swatch, input, textarea, select'
      );
      el.classList.toggle('is-active', Boolean(interactive));
    };

    const tick = () => {
      x += (tx - x) * 0.18;
      y += (ty - y) * 0.18;
      el.style.transform = `translate(${x - 13}px, ${y - 13}px)`;
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <div className="cursor-glow" ref={ref} aria-hidden="true" />;
}
