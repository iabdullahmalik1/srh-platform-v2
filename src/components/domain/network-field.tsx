"use client";

import * as React from "react";

/**
 * Living background: a settlement network. Nodes drift, links form between nearby nodes,
 * and pulses travel along links to suggest value moving between institutions.
 * Pauses off-screen, caps DPR at 2, renders a static frame under reduced motion.
 */
export function NetworkField({ className, density = 70, color = "210, 31, 23", linkDistance = 130 }: { className?: string; density?: number; color?: string; linkDistance?: number }) {
  const ref = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0, h = 0, raf = 0, visible = true;
    type N = { x: number; y: number; vx: number; vy: number; a: number; r: number };
    let nodes: N[] = [];
    type P = { a: number; b: number; t: number; s: number };
    let pulses: P[] = [];
    const pointer = { x: -9999, y: -9999 };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round((density * w * h) / (1200 * 700));
      nodes = Array.from({ length: Math.max(18, Math.min(count, 140)) }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.22, vy: (Math.random() - 0.5) * 0.22, a: 0.15 + Math.random() * 0.5, r: 1 + Math.random() * 1.6 }));
      pulses = [];
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const ld2 = linkDistance * linkDistance;
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (!reduce) {
          n.x += n.vx;
          n.y += n.vy;
          if (n.x < -10) n.x = w + 10; else if (n.x > w + 10) n.x = -10;
          if (n.y < -10) n.y = h + 10; else if (n.y > h + 10) n.y = -10;
          const dx = pointer.x - n.x, dy = pointer.y - n.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 22000) { n.x += dx * 0.0015; n.y += dy * 0.0015; }
        }
        for (let j = i + 1; j < nodes.length; j++) {
          const m = nodes[j];
          const dx = n.x - m.x, dy = n.y - m.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < ld2) {
            const o = (1 - d2 / ld2) * 0.16;
            ctx.strokeStyle = `rgba(${color}, ${o})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(m.x, m.y);
            ctx.stroke();
            if (!reduce && Math.random() < 0.00035 && pulses.length < 14) pulses.push({ a: i, b: j, t: 0, s: 0.008 + Math.random() * 0.01 });
          }
        }
      }
      for (const n of nodes) {
        ctx.fillStyle = `rgba(${color}, ${n.a})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      }
      pulses = pulses.filter((p) => p.t <= 1);
      for (const p of pulses) {
        p.t += p.s;
        const a = nodes[p.a], b = nodes[p.b];
        const x = a.x + (b.x - a.x) * p.t, y = a.y + (b.y - a.y) * p.t;
        const g = ctx.createRadialGradient(x, y, 0, x, y, 7);
        g.addColorStop(0, `rgba(${color}, 0.85)`);
        g.addColorStop(1, `rgba(${color}, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const loop = () => {
      if (visible) draw();
      if (!reduce) raf = requestAnimationFrame(loop);
    };

    resize();
    loop();
    const ro = new ResizeObserver(() => { resize(); if (reduce) draw(); });
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(canvas);
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
    };
  }, [density, color, linkDistance]);

  return <canvas ref={ref} className={className} aria-hidden />;
}
