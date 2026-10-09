"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { Banknote, Building2, Clock, Coins, Lock, Scale, UserRound, Zap } from "lucide-react";

/**
 * Mini settlement diagrams (DvP, atomic, asynchronous). Cash travels as a green dot and the
 * token as a brand dot. Motion uses SVG animateMotion and is removed for reduced motion.
 */

const CASH = "var(--success)";
const TOKEN = "var(--brand)";

function Node({ x, y, icon: Icon, label, primary }: { x: number; y: number; icon: React.ElementType; label?: string; primary?: boolean }) {
  return (
    <g>
      <circle cx={x} cy={y} r={15} fill={primary ? "var(--brand)" : "var(--surface)"} stroke={primary ? "var(--brand)" : "var(--border-strong)"} strokeWidth={1} />
      <Icon x={x - 7.5} y={y - 7.5} size={15} strokeWidth={1.8} className={primary ? "text-white" : "text-muted"} />
      {label && (
        <text x={x} y={y + 27} textAnchor="middle" fontSize={9.5} fontWeight={500} className="fill-muted">
          {label}
        </text>
      )}
    </g>
  );
}

function Path({ d, i = 0, dashed }: { d: string; i?: number; dashed?: boolean }) {
  const reduce = useReducedMotion();
  return (
    <motion.path
      d={d}
      fill="none"
      stroke="var(--border-strong)"
      strokeWidth={1.25}
      strokeDasharray={dashed ? "3 3" : undefined}
      initial={reduce || dashed ? false : { pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.6, delay: 0.1 + i * 0.08, ease: [0.2, 0, 0, 1] }}
    />
  );
}

/** A dot that travels along `path`. `from` and `to` are fractions of the cycle. */
function Dot({ path, color, dur, from = 0, to = 1 }: { path: string; color: string; dur: number; from?: number; to?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return null;
  const kt = [0, from, to, 1].map((n) => Math.min(1, Math.max(0, n)));
  // keyTimes must be strictly increasing for SMIL; nudge equal neighbours apart.
  for (let i = 1; i < kt.length; i++) if (kt[i] <= kt[i - 1]) kt[i] = Math.min(1, kt[i - 1] + 0.001);
  kt[3] = 1;
  const keyTimes = kt.map((n) => n.toFixed(3)).join(";");
  return (
    <circle r={3.5} fill={color} opacity={0}>
      <animateMotion dur={`${dur}s`} repeatCount="indefinite" path={path} keyPoints="0;0;1;1" keyTimes={keyTimes} calcMode="linear" />
      <animate attributeName="opacity" dur={`${dur}s`} repeatCount="indefinite" values="0;1;0;0" keyTimes={keyTimes} calcMode="discrete" />
    </circle>
  );
}

function Frame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 260 132" role="img" aria-label={label} className="h-auto w-full">
      {children}
    </svg>
  );
}

export function DvpDiagram() {
  const cashIn = "M51 30 C 84 30, 84 66, 104 66";
  const tokIn = "M51 102 C 84 102, 84 66, 104 66";
  const cashOut = "M156 66 C 176 66, 176 30, 209 30";
  const tokOut = "M156 66 C 176 66, 176 102, 209 102";
  return (
    <Frame label="Delivery versus payment: cash and token legs meet in the settlement engine and are released together">
      <Path d={cashIn} i={0} />
      <Path d={tokIn} i={1} />
      <Path d={cashOut} i={2} />
      <Path d={tokOut} i={3} />
      <rect x={104} y={50} width={52} height={32} rx={9} fill="var(--brand-soft)" stroke="var(--brand)" strokeOpacity={0.5} />
      <Lock x={122} y={55} size={15} strokeWidth={1.8} className="text-brand-ink" />
      <text x={130} y={78} textAnchor="middle" fontSize={8.5} fontWeight={600} className="fill-brand-ink">DvP</text>
      <Node x={36} y={30} icon={UserRound} label="Investor" />
      <Node x={36} y={102} icon={Building2} label="Issuer" />
      <Node x={224} y={30} icon={Building2} label="Issuer" />
      <Node x={224} y={102} icon={UserRound} label="Investor" />
      <Dot path={cashIn} color={CASH} dur={3.2} from={0} to={0.42} />
      <Dot path={tokIn} color={TOKEN} dur={3.2} from={0} to={0.42} />
      <Dot path={cashOut} color={CASH} dur={3.2} from={0.55} to={0.95} />
      <Dot path={tokOut} color={TOKEN} dur={3.2} from={0.55} to={0.95} />
    </Frame>
  );
}

export function AtomicDiagram() {
  const top = "M66 54 C 100 22, 160 22, 194 54";
  const bottom = "M194 78 C 160 110, 100 110, 66 78";
  return (
    <Frame label="Atomic settlement: cash and token swap in one on-chain transaction">
      <rect x={14} y={8} width={232} height={116} rx={14} fill="none" stroke="var(--border-strong)" strokeDasharray="4 4" />
      <text x={26} y={22} fontSize={8.5} fontWeight={600} className="fill-muted">One transaction</text>
      <Path d={top} i={0} />
      <Path d={bottom} i={1} />
      <g>
        <circle cx={130} cy={66} r={11} fill="var(--warning-soft)" />
        <Zap x={123.5} y={59.5} size={13} strokeWidth={1.9} className="text-warning" />
      </g>
      <Node x={52} y={66} icon={UserRound} label="Investor" />
      <Node x={208} y={66} icon={Building2} label="Issuer" />
      <Dot path={top} color={CASH} dur={2.2} from={0.05} to={0.8} />
      <Dot path={bottom} color={TOKEN} dur={2.2} from={0.05} to={0.8} />
    </Frame>
  );
}

export function AsyncDiagram() {
  const cash = "M51 30 L 170 30 C 190 30, 196 50, 209 58";
  const tok = "M51 102 L 170 102 C 190 102, 196 82, 209 74";
  return (
    <Frame label="Asynchronous settlement: cash first, units allocated later, both legs reconciled afterwards">
      <Path d={cash} i={0} />
      <Path d={tok} i={1} />
      <line x1={110} y1={42} x2={110} y2={90} stroke="var(--border-strong)" strokeDasharray="2 3" />
      <g>
        <circle cx={110} cy={66} r={11} fill="var(--surface-3)" />
        <Clock x={103.5} y={59.5} size={13} strokeWidth={1.9} className="text-muted" />
      </g>
      <text x={82} y={22} fontSize={8.5} fontWeight={600} className="fill-success">T+0</text>
      <text x={130} y={120} fontSize={8.5} fontWeight={600} className="fill-brand-ink">T+n</text>
      <Node x={36} y={30} icon={Banknote} label="" />
      <Node x={36} y={102} icon={Coins} label="" />
      <Node x={224} y={66} icon={Scale} label="Reconcile" primary />
      <Dot path={cash} color={CASH} dur={3.6} from={0} to={0.4} />
      <Dot path={tok} color={TOKEN} dur={3.6} from={0.5} to={0.9} />
    </Frame>
  );
}

export function LegLegend() {
  return (
    <span className="inline-flex items-center gap-3 text-[11.5px] text-muted">
      <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-success" aria-hidden />Cash leg</span>
      <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-brand" aria-hidden />Token leg</span>
    </span>
  );
}
