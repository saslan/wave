"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

// ── Easing functions ────────────────────────────────────────────────────────
type EaseFn = (t: number) => number;

const Easing = {
  linear: (t: number) => t,
  easeInQuad: (t: number) => t * t,
  easeOutQuad: (t: number) => t * (2 - t),
  easeInOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeInCubic: (t: number) => t * t * t,
  easeOutCubic: (t: number) => --t * t * t + 1,
  easeInOutCubic: (t: number) =>
    t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  easeOutBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
} satisfies Record<string, EaseFn>;

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

// ── Timeline + Sprite contexts ──────────────────────────────────────────────
type TimelineCtx = {
  time: number;
  duration: number;
  playing: boolean;
  setTime: (t: number) => void;
  setPlaying: (p: boolean) => void;
};

const TimelineContext = createContext<TimelineCtx>({
  time: 0,
  duration: 10,
  playing: false,
  setTime: () => {},
  setPlaying: () => {},
});

const useTime = () => useContext(TimelineContext).time;
const useTimeline = () => useContext(TimelineContext);

type SpriteCtx = {
  localTime: number;
  progress: number;
  duration: number;
  visible: boolean;
};

const SpriteContext = createContext<SpriteCtx>({
  localTime: 0,
  progress: 0,
  duration: 0,
  visible: false,
});

function Sprite({
  start = 0,
  end = Infinity,
  children,
  keepMounted = false,
}: {
  start?: number;
  end?: number;
  children: ReactNode | ((ctx: SpriteCtx) => ReactNode);
  keepMounted?: boolean;
}) {
  const { time } = useTimeline();
  const visible = time >= start && time <= end;
  if (!visible && !keepMounted) return null;
  const duration = end - start;
  const localTime = Math.max(0, time - start);
  const progress =
    duration > 0 && isFinite(duration) ? clamp(localTime / duration, 0, 1) : 0;
  const value: SpriteCtx = { localTime, progress, duration, visible };
  return (
    <SpriteContext.Provider value={value}>
      {typeof children === "function" ? children(value) : children}
    </SpriteContext.Provider>
  );
}

// ── Stage ───────────────────────────────────────────────────────────────────
function Stage({
  width = 1280,
  height = 720,
  duration = 10,
  background = "#040810",
  loop = true,
  autoplay = true,
  persistKey = "fwstage",
  children,
}: {
  width?: number;
  height?: number;
  duration?: number;
  background?: string;
  loop?: boolean;
  autoplay?: boolean;
  persistKey?: string;
  children: ReactNode;
}) {
  const [time, setTime] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    try {
      const v = parseFloat(localStorage.getItem(persistKey + ":t") || "0");
      return isFinite(v) ? clamp(v, 0, duration) : 0;
    } catch {
      return 0;
    }
  });
  const [playing, setPlaying] = useState(autoplay);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [scale, setScale] = useState(1);
  const stageRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(persistKey + ":t", String(time));
    } catch {
      /* ignore */
    }
  }, [time, persistKey]);

  useEffect(() => {
    if (!stageRef.current) return;
    const el = stageRef.current;
    const measure = () => {
      const barH = 44;
      const s = Math.min(el.clientWidth / width, (el.clientHeight - barH) / height);
      setScale(Math.max(0.05, s));
    };
    measure();
    const r1 = requestAnimationFrame(measure);
    const r2 = setTimeout(measure, 50);
    const r3 = setTimeout(measure, 200);
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(r1);
      clearTimeout(r2);
      clearTimeout(r3);
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [width, height]);

  useEffect(() => {
    if (!playing) {
      lastTsRef.current = null;
      return;
    }
    const step = (ts: number) => {
      if (lastTsRef.current == null) lastTsRef.current = ts;
      const dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;
      setTime((t) => {
        let next = t + dt;
        if (next >= duration) {
          if (loop) next = next % duration;
          else {
            next = duration;
            setPlaying(false);
          }
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastTsRef.current = null;
    };
  }, [playing, duration, loop]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (e.code === "Space") {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.code === "ArrowLeft") {
        setTime((t) => clamp(t - (e.shiftKey ? 1 : 0.1), 0, duration));
      } else if (e.code === "ArrowRight") {
        setTime((t) => clamp(t + (e.shiftKey ? 1 : 0.1), 0, duration));
      } else if (e.key === "0" || e.code === "Home") {
        setTime(0);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [duration]);

  const displayTime = hoverTime != null ? hoverTime : time;
  const ctxValue = useMemo<TimelineCtx>(
    () => ({
      time: displayTime,
      duration,
      playing,
      setTime,
      setPlaying,
    }),
    [displayTime, duration, playing],
  );

  return (
    <div
      ref={stageRef}
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        background: "#000",
      }}
    >
      <div
        style={{
          flex: 1,
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        <div
          style={{
            width,
            height,
            background,
            position: "relative",
            transform: `scale(${scale})`,
            transformOrigin: "center",
            flexShrink: 0,
            boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
            overflow: "hidden",
          }}
        >
          <TimelineContext.Provider value={ctxValue}>{children}</TimelineContext.Provider>
        </div>
      </div>
      <PlaybackBar
        time={displayTime}
        duration={duration}
        playing={playing}
        onPlayPause={() => setPlaying((p) => !p)}
        onReset={() => setTime(0)}
        onSeek={(t) => setTime(t)}
        onHover={(t) => setHoverTime(t)}
      />
    </div>
  );
}

// ── Playback bar ────────────────────────────────────────────────────────────
function PlaybackBar({
  time,
  duration,
  playing,
  onPlayPause,
  onReset,
  onSeek,
  onHover,
}: {
  time: number;
  duration: number;
  playing: boolean;
  onPlayPause: () => void;
  onReset: () => void;
  onSeek: (t: number) => void;
  onHover: (t: number | null) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const timeFromEvent = useCallback(
    (e: MouseEvent | React.MouseEvent) => {
      if (!trackRef.current) return 0;
      const rect = trackRef.current.getBoundingClientRect();
      const x = clamp((e.clientX - rect.left) / rect.width, 0, 1);
      return x * duration;
    },
    [duration],
  );

  useEffect(() => {
    if (!dragging) return;
    const onUp = () => setDragging(false);
    const onMove = (e: MouseEvent) => onSeek(timeFromEvent(e));
    window.addEventListener("mouseup", onUp);
    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("mousemove", onMove);
    };
  }, [dragging, timeFromEvent, onSeek]);

  const pct = duration > 0 ? (time / duration) * 100 : 0;
  const fmt = (t: number) => {
    const total = Math.max(0, t);
    const m = Math.floor(total / 60);
    const s = Math.floor(total % 60);
    const cs = Math.floor((total * 100) % 100);
    return `${m}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
  };
  const mono = "Geist Mono, ui-monospace, monospace";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "8px 16px",
        background: "rgba(20,20,20,0.92)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        width: "100%",
        maxWidth: 680,
        alignSelf: "center",
        borderRadius: 8,
        color: "#f6f4ef",
        userSelect: "none",
        flexShrink: 0,
        fontFamily: "Geist, system-ui, sans-serif",
      }}
    >
      <IconButton onClick={onReset} title="Return to start">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M3 2v10M12 2L5 7l7 5V2z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      </IconButton>
      <IconButton onClick={onPlayPause} title="Play/pause (space)">
        {playing ? (
          <svg width="14" height="14" viewBox="0 0 14 14">
            <rect x="3" y="2" width="3" height="10" fill="currentColor" />
            <rect x="8" y="2" width="3" height="10" fill="currentColor" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14">
            <path d="M3 2l9 5-9 5V2z" fill="currentColor" />
          </svg>
        )}
      </IconButton>
      <div
        style={{
          fontFamily: mono,
          fontSize: 12,
          fontVariantNumeric: "tabular-nums",
          width: 64,
          textAlign: "right",
        }}
      >
        {fmt(time)}
      </div>
      <div
        ref={trackRef}
        onMouseMove={(e) => {
          if (dragging) onSeek(timeFromEvent(e));
          else onHover(timeFromEvent(e));
        }}
        onMouseLeave={() => {
          if (!dragging) onHover(null);
        }}
        onMouseDown={(e) => {
          setDragging(true);
          onSeek(timeFromEvent(e));
          onHover(null);
        }}
        style={{
          flex: 1,
          height: 22,
          position: "relative",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            height: 4,
            background: "rgba(255,255,255,0.12)",
            borderRadius: 2,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            width: `${pct}%`,
            height: 4,
            background: "linear-gradient(90deg,#06b6d4,#3b82f6,#8b5cf6)",
            borderRadius: 2,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: `${pct}%`,
            top: "50%",
            width: 12,
            height: 12,
            marginLeft: -6,
            marginTop: -6,
            background: "#fff",
            borderRadius: 6,
            boxShadow: "0 2px 4px rgba(0,0,0,0.4)",
          }}
        />
      </div>
      <div
        style={{
          fontFamily: mono,
          fontSize: 12,
          fontVariantNumeric: "tabular-nums",
          width: 64,
          textAlign: "left",
          color: "rgba(246,244,239,0.55)",
        }}
      >
        {fmt(duration)}
      </div>
    </div>
  );
}

function IconButton({
  children,
  onClick,
  title,
}: {
  children: ReactNode;
  onClick: () => void;
  title: string;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 28,
        height: 28,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: hover ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 6,
        color: "#f6f4ef",
        cursor: "pointer",
        padding: 0,
        transition: "background 120ms",
      }}
    >
      {children}
    </button>
  );
}

// ── Logos ───────────────────────────────────────────────────────────────────
const W = 1920;
const H = 1080;

function SolanaLogo({
  size = 220,
  opacity = 1,
  glow = 0,
}: {
  size?: number;
  opacity?: number;
  glow?: number;
}) {
  return (
    <svg
      width={size}
      height={size * 0.78}
      viewBox="0 0 397 311"
      style={{
        display: "block",
        opacity,
        filter: glow ? `drop-shadow(0 0 ${glow}px rgba(20,241,149,.7))` : "none",
      }}
    >
      <defs>
        <linearGradient id="solx" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00FFA3" />
          <stop offset="50%" stopColor="#03E1FF" />
          <stop offset="100%" stopColor="#DC1FFF" />
        </linearGradient>
      </defs>
      <g fill="url(#solx)">
        <path d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z" />
        <path d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z" />
        <path d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.6z" />
      </g>
    </svg>
  );
}

function WaveLogoBig({
  size = 320,
  drawProgress = 1,
  glow = 0,
}: {
  size?: number;
  drawProgress?: number;
  glow?: number;
}) {
  const w = size;
  const h = size * 0.72;
  const totalLen = 520;
  const dash = totalLen;
  const offset = totalLen * (1 - drawProgress);
  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 100 72"
      style={{
        display: "block",
        filter: glow ? `drop-shadow(0 0 ${glow}px rgba(59,130,246,.6))` : "none",
      }}
    >
      <defs>
        <linearGradient id="wavex" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="50%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <path
        d="M5 14 Q20 65, 35 36 Q50 12, 65 36 Q80 65, 95 14"
        stroke="url(#wavex)"
        strokeWidth="9"
        strokeLinecap="round"
        fill="none"
        pathLength={totalLen}
        strokeDasharray={dash}
        strokeDashoffset={offset}
      />
    </svg>
  );
}

// ── Backgrounds ─────────────────────────────────────────────────────────────
function AmbientBG() {
  const t = useTime();
  const drift = Math.sin(t * 0.35) * 40;
  const drift2 = Math.cos(t * 0.28) * 60;
  return (
    <div style={{ position: "absolute", inset: 0, background: "#040810", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left: "8%",
          top: "0%",
          width: 1100,
          height: 800,
          transform: `translate(${drift}px, ${drift2 * 0.5}px)`,
          background: "radial-gradient(closest-side, rgba(6,182,212,.28), transparent 70%)",
          filter: "blur(20px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: "0%",
          bottom: "0%",
          width: 1300,
          height: 900,
          transform: `translate(${-drift2 * 0.7}px, ${-drift * 0.4}px)`,
          background: "radial-gradient(closest-side, rgba(139,92,246,.32), transparent 70%)",
          filter: "blur(20px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "40%",
          top: "30%",
          width: 800,
          height: 800,
          transform: `translate(${drift2 * 0.3}px, ${drift * 0.6}px)`,
          background: "radial-gradient(closest-side, rgba(59,130,246,.18), transparent 70%)",
          filter: "blur(30px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.06,
          mixBlendMode: "overlay",
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence baseFrequency='0.9'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,.55) 100%)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

function NeuralWeb({
  entryStart = 0,
  holdEnd = 4,
  exitEnd = 5,
}: {
  entryStart?: number;
  holdEnd?: number;
  exitEnd?: number;
}) {
  const t = useTime();
  const nodes = useMemo(() => {
    const arr: { x: number; y: number; r: number; ph: number }[] = [];
    const seed = (i: number) => (Math.sin(i * 12.9898) * 43758.5453) % 1;
    for (let i = 0; i < 22; i++) {
      arr.push({
        x: 200 + ((seed(i) + 1) * 0.5) * 1520,
        y: 140 + ((seed(i + 99) + 1) * 0.5) * 800,
        r: 3 + ((seed(i + 7) + 1) * 0.5) * 4,
        ph: seed(i + 33),
      });
    }
    return arr;
  }, []);
  let env = 0;
  if (t < entryStart) env = 0;
  else if (t < holdEnd) env = Easing.easeOutCubic(clamp((t - entryStart) / 1.2, 0, 1));
  else if (t < exitEnd)
    env = 1 - Easing.easeInCubic(clamp((t - holdEnd) / (exitEnd - holdEnd), 0, 1));
  else env = 0;
  if (env <= 0.001) return null;
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: env }}>
      <defs>
        <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#00FFA3" stopOpacity=".0" />
          <stop offset="50%" stopColor="#3b82f6" stopOpacity=".7" />
          <stop offset="100%" stopColor="#DC1FFF" stopOpacity=".0" />
        </linearGradient>
        <radialGradient id="nodeGrad">
          <stop offset="0%" stopColor="#fff" stopOpacity="1" />
          <stop offset="40%" stopColor="#3b82f6" stopOpacity=".9" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </radialGradient>
      </defs>
      {nodes.map((n, i) => {
        const others = nodes
          .map((m, j) => ({ j, d: Math.hypot(m.x - n.x, m.y - n.y) }))
          .filter((o) => o.j !== i)
          .sort((a, b) => a.d - b.d)
          .slice(0, 2);
        return others.map((o) => {
          const m = nodes[o.j];
          const flow = (Math.sin(t * 1.4 + i * 0.6) + 1) * 0.5;
          return (
            <line
              key={`${i}-${o.j}`}
              x1={n.x}
              y1={n.y}
              x2={m.x}
              y2={m.y}
              stroke="url(#lineGrad)"
              strokeWidth="1"
              opacity={0.25 + flow * 0.35}
            />
          );
        });
      })}
      {nodes.map((n, i) => {
        const pulse = (Math.sin(t * 2.2 + n.ph * 6.28) + 1) * 0.5;
        const r = n.r * (0.9 + pulse * 0.6);
        const halo = n.r * (3 + pulse * 2.5);
        return (
          <g key={i}>
            <circle cx={n.x} cy={n.y} r={halo} fill="url(#nodeGrad)" opacity={0.25 + pulse * 0.4} />
            <circle cx={n.x} cy={n.y} r={r} fill="#cfe9ff" />
          </g>
        );
      })}
    </svg>
  );
}

function WaveFloor() {
  const t = useTime();
  const paths: { d: string; row: number }[] = [];
  for (let row = 0; row < 6; row++) {
    const yBase = 720 + row * 60;
    let d = `M -50 ${yBase}`;
    for (let x = -50; x <= W + 50; x += 30) {
      const y =
        yBase +
        Math.sin(x * 0.012 + t * 1.6 + row * 0.5) * (10 + row * 4) +
        Math.cos(x * 0.007 - t * 0.9 + row * 0.3) * (8 + row * 3);
      d += ` L ${x} ${y}`;
    }
    paths.push({ d, row });
  }
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: 0.55 }}>
      <defs>
        <linearGradient id="wf" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0" />
          <stop offset="50%" stopColor="#3b82f6" stopOpacity="1" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
        </linearGradient>
      </defs>
      {paths.map((p, i) => (
        <path
          key={i}
          d={p.d}
          stroke="url(#wf)"
          strokeWidth={1.2 + i * 0.15}
          fill="none"
          opacity={0.15 + i * 0.08}
        />
      ))}
    </svg>
  );
}

// ── Scenes ──────────────────────────────────────────────────────────────────
function Scene1() {
  return (
    <Sprite start={0} end={3.7}>
      {({ localTime }) => {
        const titleT = clamp((localTime - 0.5) / 0.9, 0, 1);
        const titleEase = Easing.easeOutCubic(titleT);
        const subT = clamp((localTime - 1.4) / 0.9, 0, 1);
        const subEase = Easing.easeOutCubic(subT);
        const fadeOut = localTime > 3.0 ? clamp((localTime - 3.0) / 0.7, 0, 1) : 0;
        return (
          <>
            <NeuralWeb entryStart={0} holdEnd={3.0} exitEnd={3.7} />
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: 410,
                transform: `translate(-50%, ${(1 - titleEase) * 18}px)`,
                opacity: titleEase * (1 - fadeOut),
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 22px",
                  borderRadius: 999,
                  border: "1px solid rgba(0,255,163,.35)",
                  background: "rgba(0,255,163,.06)",
                  backdropFilter: "blur(20px)",
                  color: "rgba(207, 255, 232, 0.95)",
                  fontFamily: "Geist Mono, ui-monospace, monospace",
                  fontSize: 18,
                  letterSpacing: ".32em",
                  textTransform: "uppercase",
                  fontWeight: 500,
                }}
              >
                <SolanaLogo size={26} />
                <span>Powered by Solana × AI</span>
              </div>
            </div>
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 480,
                transform: `translateY(${(1 - titleEase) * 30}px)`,
                opacity: titleEase * (1 - fadeOut),
                textAlign: "center",
                fontFamily: "Instrument Serif, serif",
                fontStyle: "italic",
                fontSize: 138,
                lineHeight: 0.95,
                letterSpacing: "-0.02em",
                color: "#eef2ff",
              }}
            >
              <span>A wave is </span>
              <span
                style={{
                  background: "linear-gradient(135deg,#06b6d4 0%,#3b82f6 50%,#8b5cf6 100%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  color: "transparent",
                }}
              >
                rising.
              </span>
            </div>
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 690,
                transform: `translateY(${(1 - subEase) * 16}px)`,
                opacity: subEase * (1 - fadeOut),
                textAlign: "center",
                fontFamily: "Geist, sans-serif",
                fontWeight: 300,
                fontSize: 28,
                letterSpacing: ".22em",
                textTransform: "uppercase",
                color: "rgba(148,163,184,.85)",
              }}
            >
              the feed · is · awake
            </div>
          </>
        );
      }}
    </Sprite>
  );
}

function Scene2() {
  return (
    <Sprite start={3.7} end={7.4}>
      {({ localTime }) => {
        const solIn = Easing.easeOutBack(clamp(localTime / 0.8, 0, 1));
        const solOut = clamp((localTime - 1.6) / 0.7, 0, 1);
        const solOpacity = solIn * (1 - Easing.easeInCubic(solOut));
        const solScale = 0.7 + 0.3 * solIn - 0.15 * solOut;
        const drawProgress = Easing.easeInOutCubic(clamp((localTime - 1.6) / 1.2, 0, 1));
        const waveOpacity = clamp((localTime - 1.6) / 0.4, 0, 1);
        const waveExit = localTime > 3.2 ? clamp((localTime - 3.2) / 0.5, 0, 1) : 0;
        const capT = clamp((localTime - 2.6) / 0.8, 0, 1);
        const capEase = Easing.easeOutCubic(capT);
        return (
          <>
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: 360,
                transform: "translateX(-50%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 30,
              }}
            >
              <div style={{ opacity: solOpacity, transform: `scale(${solScale})` }}>
                <SolanaLogo size={260} glow={20 * solIn} />
              </div>
              <div
                style={{
                  position: "absolute",
                  top: 80,
                  opacity: waveOpacity * (1 - waveExit),
                }}
              >
                <WaveLogoBig
                  size={420}
                  drawProgress={drawProgress}
                  glow={localTime > 2.6 ? 30 : 0}
                />
              </div>
            </div>
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 680,
                textAlign: "center",
                opacity: capEase * (1 - waveExit),
                transform: `translateY(${(1 - capEase) * 20}px)`,
              }}
            >
              <div
                style={{
                  fontFamily: "Geist, sans-serif",
                  fontWeight: 200,
                  fontSize: 96,
                  letterSpacing: "-0.04em",
                  color: "#eef2ff",
                }}
              >
                feedwave
              </div>
              <div
                style={{
                  marginTop: 14,
                  fontFamily: "Geist Mono, monospace",
                  fontSize: 18,
                  letterSpacing: ".32em",
                  textTransform: "uppercase",
                  color: "rgba(148,163,184,.7)",
                }}
              >
                the social layer of solana
              </div>
            </div>
          </>
        );
      }}
    </Sprite>
  );
}

function Scene3() {
  return (
    <Sprite start={7.4} end={11.0}>
      {({ localTime }) => {
        const t = localTime;
        const line1 = Easing.easeOutCubic(clamp((t - 0.2) / 0.8, 0, 1));
        const line2 = Easing.easeOutCubic(clamp((t - 1.1) / 0.8, 0, 1));
        const line3 = Easing.easeOutCubic(clamp((t - 2.0) / 0.9, 0, 1));
        const fadeOut = t > 3.1 ? clamp((t - 3.1) / 0.5, 0, 1) : 0;
        const camScale = 1 + clamp(t / 3.5, 0, 1) * 0.04;
        return (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              transform: `scale(${camScale})`,
              opacity: 1 - fadeOut,
            }}
          >
            <div
              style={{
                fontFamily: "Geist Mono, monospace",
                fontSize: 22,
                letterSpacing: ".5em",
                textTransform: "uppercase",
                color: "rgba(20,241,149,.85)",
                opacity: line1,
                transform: `translateY(${(1 - line1) * 12}px)`,
                marginBottom: 32,
              }}
            >
              ▲ whisper from the deep ▲
            </div>
            <div
              style={{
                fontFamily: "Instrument Serif, serif",
                fontStyle: "italic",
                fontSize: 168,
                lineHeight: 0.95,
                letterSpacing: "-0.025em",
                color: "#eef2ff",
                textAlign: "center",
                opacity: line2,
                transform: `translateY(${(1 - line2) * 28}px)`,
              }}
            >
              Are the whales
            </div>
            <div
              style={{
                marginTop: 12,
                fontFamily: "Instrument Serif, serif",
                fontStyle: "italic",
                fontSize: 168,
                lineHeight: 0.95,
                letterSpacing: "-0.025em",
                textAlign: "center",
                opacity: line3,
                transform: `translateY(${(1 - line3) * 28}px)`,
                background: "linear-gradient(135deg,#06b6d4 0%,#3b82f6 50%,#8b5cf6 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
                color: "transparent",
                paddingRight: 40,
                paddingLeft: 40,
                paddingBottom: 18,
                overflow: "visible",
                display: "inline-block",
                width: "100%",
              }}
            >
              ready?
            </div>
          </div>
        );
      }}
    </Sprite>
  );
}

function Scene4() {
  return (
    <Sprite start={11.0} end={14.6}>
      {({ localTime }) => {
        const t = localTime;
        const logoIn = Easing.easeOutBack(clamp(t / 0.6, 0, 1));
        const text = "COMING SOON";
        const letters = text.split("");
        const fadeOut = t > 3.0 ? clamp((t - 3.0) / 0.6, 0, 1) : 0;
        const pulse = 1 + Math.sin(t * 2.2) * 0.012;
        return (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              opacity: 1 - fadeOut,
              transform: `scale(${pulse})`,
            }}
          >
            <div
              style={{
                opacity: logoIn,
                transform: `scale(${0.6 + logoIn * 0.4})`,
                marginBottom: 30,
                filter: `drop-shadow(0 0 60px rgba(59,130,246,${0.5 * logoIn}))`,
              }}
            >
              <WaveLogoBig size={300} drawProgress={1} glow={50} />
            </div>
            <div
              style={{
                opacity: clamp((t - 0.4) / 0.5, 0, 1),
                transform: `translateY(${(1 - clamp((t - 0.4) / 0.5, 0, 1)) * 12}px)`,
                padding: "8px 22px",
                borderRadius: 999,
                background: "linear-gradient(135deg,#06b6d4,#3b82f6 50%,#8b5cf6)",
                color: "#fff",
                fontFamily: "Geist Mono, monospace",
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: ".2em",
                marginBottom: 24,
                boxShadow: "0 8px 40px rgba(59,130,246,.5)",
              }}
            >
              $WAVE · SPL TOKEN
            </div>
            <div
              style={{
                display: "flex",
                gap: 8,
                fontFamily: "Geist, sans-serif",
                fontWeight: 700,
                fontSize: 200,
                letterSpacing: "-0.04em",
                lineHeight: 0.9,
              }}
            >
              {letters.map((ch, i) => {
                const delay = 0.9 + i * 0.06;
                const lt = clamp((t - delay) / 0.45, 0, 1);
                const eased = Easing.easeOutBack(lt);
                const style: CSSProperties = {
                  display: "inline-block",
                  opacity: lt,
                  transform: `translateY(${(1 - eased) * 60}px) rotate(${(1 - eased) * -6}deg)`,
                  color: ch === " " ? "transparent" : "#eef2ff",
                  minWidth: ch === " " ? 50 : "auto",
                  textShadow: lt > 0.5 ? "0 0 40px rgba(59,130,246,.45)" : "none",
                };
                return (
                  <span key={i} style={style}>
                    {ch === " " ? " " : ch}
                  </span>
                );
              })}
            </div>
            <div
              style={{
                marginTop: 30,
                opacity: clamp((t - 1.8) / 0.6, 0, 1),
                transform: `translateY(${(1 - clamp((t - 1.8) / 0.6, 0, 1)) * 18}px)`,
                fontFamily: "Geist Mono, monospace",
                fontSize: 24,
                letterSpacing: ".4em",
                textTransform: "uppercase",
                color: "rgba(148,163,184,.85)",
              }}
            >
              private round · whitelist opens soon
            </div>
          </div>
        );
      }}
    </Sprite>
  );
}

function Scene5() {
  return (
    <Sprite start={14.6} end={18.0}>
      {({ localTime }) => {
        const t = localTime;
        const logoIn = Easing.easeOutCubic(clamp(t / 0.6, 0, 1));
        const dateIn = Easing.easeOutCubic(clamp((t - 0.6) / 0.7, 0, 1));
        const handleIn = Easing.easeOutCubic(clamp((t - 1.3) / 0.7, 0, 1));
        const fadeOut = t > 3.0 ? clamp((t - 3.0) / 0.4, 0, 1) : 0;
        return (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              opacity: 1 - fadeOut,
              gap: 40,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 40,
                opacity: logoIn,
                transform: `translateY(${(1 - logoIn) * 16}px)`,
              }}
            >
              <WaveLogoBig size={150} drawProgress={1} glow={25} />
              <div style={{ width: 1, height: 90, background: "rgba(255,255,255,.2)" }} />
              <SolanaLogo size={120} glow={15} />
            </div>
            <div
              style={{
                textAlign: "center",
                opacity: dateIn,
                transform: `translateY(${(1 - dateIn) * 16}px)`,
              }}
            >
              <div
                style={{
                  fontFamily: "Geist Mono, monospace",
                  fontSize: 22,
                  letterSpacing: ".5em",
                  textTransform: "uppercase",
                  color: "rgba(0,255,163,.85)",
                  marginBottom: 18,
                }}
              >
                save · the · date
              </div>
              <div
                style={{
                  fontFamily: "Instrument Serif, serif",
                  fontStyle: "italic",
                  fontSize: 110,
                  lineHeight: 1,
                  letterSpacing: "-.02em",
                  color: "#eef2ff",
                }}
              >
                Q3{" "}
                <span
                  style={{
                    background: "linear-gradient(135deg,#06b6d4,#3b82f6 50%,#8b5cf6)",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    color: "transparent",
                  }}
                >
                  2026
                </span>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 20,
                opacity: handleIn,
                transform: `translateY(${(1 - handleIn) * 12}px)`,
              }}
            >
              <a
                href="https://x.com/feedwaveio"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 22px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,.18)",
                  background: "rgba(255,255,255,.04)",
                  backdropFilter: "blur(20px)",
                  fontFamily: "Geist Mono, monospace",
                  fontSize: 22,
                  color: "#eef2ff",
                  fontWeight: 500,
                  textDecoration: "none",
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
                  <path d="M18.244 2H21.5l-7.53 8.61L22 22h-6.86l-5.38-7.04L3.5 22H.24l8.06-9.21L2 2h7.04l4.86 6.43L18.244 2z" />
                </svg>
                x.com/feedwaveio
              </a>
              <a
                href="https://t.me/feedwave"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 22px",
                  borderRadius: 999,
                  border: "1px solid rgba(34,158,217,.35)",
                  background: "rgba(34,158,217,.08)",
                  backdropFilter: "blur(20px)",
                  fontFamily: "Geist Mono, monospace",
                  fontSize: 22,
                  color: "#eef2ff",
                  fontWeight: 500,
                  textDecoration: "none",
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#229ED9">
                  <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.56 8.18l-1.85 8.72c-.14.62-.5.77-1.02.48l-2.82-2.08-1.36 1.31c-.15.15-.28.28-.57.28l.2-2.88 5.25-4.74c.23-.2-.05-.32-.35-.12L8.58 13.1l-2.8-.87c-.61-.19-.62-.61.13-.9l10.92-4.21c.5-.19.94.12.78.96z" />
                </svg>
                t.me/feedwave
              </a>
            </div>
          </div>
        );
      }}
    </Sprite>
  );
}

function CornerMark() {
  return (
    <div
      style={{
        position: "absolute",
        left: 60,
        top: 50,
        display: "flex",
        alignItems: "center",
        gap: 14,
        opacity: 0.7,
      }}
    >
      <WaveLogoBig size={56} drawProgress={1} />
      <div
        style={{
          fontFamily: "Geist, sans-serif",
          fontWeight: 300,
          fontSize: 26,
          letterSpacing: "-.03em",
          color: "#eef2ff",
        }}
      >
        feedwave
      </div>
    </div>
  );
}

function CornerSolana() {
  return (
    <div
      style={{
        position: "absolute",
        right: 60,
        top: 56,
        display: "flex",
        alignItems: "center",
        gap: 12,
        opacity: 0.55,
      }}
    >
      <span
        style={{
          fontFamily: "Geist Mono, monospace",
          fontSize: 14,
          letterSpacing: ".32em",
          textTransform: "uppercase",
          color: "rgba(207,255,232,.85)",
        }}
      >
        built on
      </span>
      <SolanaLogo size={70} />
    </div>
  );
}

function FeedWaveTeaser() {
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <AmbientBG />
      <WaveFloor />
      <CornerMark />
      <CornerSolana />
      <Scene1 />
      <Scene2 />
      <Scene3 />
      <Scene4 />
      <Scene5 />
    </div>
  );
}

export function Teaser() {
  return (
    <div style={{ position: "fixed", inset: 0 }}>
      <Stage
        width={1920}
        height={1080}
        duration={18}
        background="#040810"
        persistKey="fw-teaser"
      >
        <FeedWaveTeaser />
      </Stage>
    </div>
  );
}
