import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  Zap,
  Square,
  Sparkles,
  Gamepad2,
  Copy,
  Check,
  Settings,
  TrendingUp,
  TrendingDown,
  X,
  RefreshCw,
  AlertCircle,
  CircleCheck,
  Film,
  Plus,
  Pencil,
  Trash2,
  Search,
  Type,
  Lock,
  Upload,
  UserCog,
  Crown,
  Eye,
} from "lucide-react";

// Polyfill window.storage with localStorage when running outside Claude.ai.
// Real Claude.ai environments inject their own window.storage which we leave alone.
if (typeof window !== "undefined" && !window.storage) {
  window.storage = {
    get: async (key) => {
      try {
        const v = localStorage.getItem(key);
        return v == null ? null : { key, value: v };
      } catch { return null; }
    },
    set: async (key, value) => {
      try { localStorage.setItem(key, value); return { key, value }; }
      catch { return null; }
    },
    delete: async (key) => {
      try { localStorage.removeItem(key); return { key, deleted: true }; }
      catch { return null; }
    },
    list: async (prefix = "") => {
      try {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(prefix)) keys.push(k);
        }
        return { keys, prefix };
      } catch { return null; }
    },
  };
}

// ============================================================
// CONFIGURATION
// Faceit Client-side API key. Rotate this when going to production
// and route calls through a Node backend so the key isn't in the bundle.
// ============================================================
export const FACEIT_API_KEY = "f9d1c9d6-548a-44c2-8b03-a69baac4d705";

const FACEIT_BASE = "https://open.faceit.com/data/v4";

// ============================================================
// Curated Google Fonts
// ============================================================
const GOOGLE_FONTS = [
  { name: "Default",            value: "",                    desc: "use template font" },
  { name: "Bebas Neue",         value: "Bebas Neue",          desc: "tall display" },
  { name: "Orbitron",           value: "Orbitron",            desc: "futuristic" },
  { name: "Press Start 2P",     value: "Press Start 2P",      desc: "8-bit pixel" },
  { name: "VT323",              value: "VT323",               desc: "terminal" },
  { name: "Russo One",          value: "Russo One",           desc: "anime / gaming" },
  { name: "Rubik Mono One",     value: "Rubik Mono One",      desc: "heavy mono" },
  { name: "Anton",              value: "Anton",               desc: "heavy condensed" },
  { name: "Audiowide",          value: "Audiowide",           desc: "electronic" },
  { name: "Black Ops One",      value: "Black Ops One",       desc: "military" },
  { name: "Monoton",            value: "Monoton",             desc: "retro neon" },
  { name: "Faster One",         value: "Faster One",          desc: "speed lines" },
  { name: "Bungee",             value: "Bungee",              desc: "sign painter" },
  { name: "Rajdhani",           value: "Rajdhani",            desc: "tech sleek" },
  { name: "Teko",               value: "Teko",                desc: "sport condensed" },
  { name: "Major Mono Display", value: "Major Mono Display",  desc: "bold mono" },
];

// ============================================================
// Builtin Templates
// ============================================================
export const BUILTIN_TEMPLATES = [
  { id: "tpl-neon",   name: "Neon Pulse",    design: "neon",   defaultAccent: "#ff00ea", mp4Url: "", defaultFont: "", builtin: true, price: 0, desc: "Cyberpunk · scan lines · glow" },
  { id: "tpl-brutal", name: "Brutal Mono",   design: "brutal", defaultAccent: "#d9f99d", mp4Url: "", defaultFont: "", builtin: true, price: 0, desc: "Hard shadows · raw type" },
  { id: "tpl-anime",  name: "Anime Burst",   design: "anime",  defaultAccent: "#ff6ec7", mp4Url: "", defaultFont: "", builtin: true, price: 0, desc: "Gacha card · iridescent · burst aura" },
  { id: "tpl-pixel",  name: "Pixel Arcade",  design: "pixel",  defaultAccent: "#fbbf24", mp4Url: "", defaultFont: "", builtin: true, price: 0, desc: "8-bit · chunky · arcade" },
];

const DESIGN_ICONS = { neon: Zap, brutal: Square, anime: Sparkles, pixel: Gamepad2 };

// ============================================================
// Hooks
// ============================================================
export const useBaseFonts = () => {
  useEffect(() => {
    const id = "widget-studio-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;700;800&family=Space+Grotesk:wght@400;500;700&family=Archivo+Black&family=Press+Start+2P&family=VT323&family=Russo+One&display=swap";
    document.head.appendChild(link);
  }, []);
};

export const useGoogleFont = (fontName) => {
  useEffect(() => {
    if (!fontName) return;
    const family = fontName.replace(/ /g, "+");
    const id = `gfont-${family}`;
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${family}:wght@400;700&display=swap`;
    document.head.appendChild(link);
  }, [fontName]);
};

const useCountUp = (target, duration = 1200, deps = []) => {
  const [n, setN] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const start = performance.now();
    const from = prev.current;
    const delta = target - from;
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setN(Math.round(from + delta * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
      else prev.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, ...deps]);
  return n;
};

// ============================================================
// Faceit API
// ============================================================
export async function fetchFaceitPlayer(nickname) {
  if (!nickname || !FACEIT_API_KEY) throw new Error("Missing nickname or API key");
  const headers = { Authorization: `Bearer ${FACEIT_API_KEY}` };

  const pRes = await fetch(
    `${FACEIT_BASE}/players?nickname=${encodeURIComponent(nickname)}`,
    { headers }
  );
  if (!pRes.ok) {
    if (pRes.status === 404) throw new Error(`Player "${nickname}" not found`);
    if (pRes.status === 401) throw new Error("Invalid API key");
    if (pRes.status === 403) throw new Error("Use a Client-side API key");
    throw new Error(`Faceit API error ${pRes.status}`);
  }
  const player = await pRes.json();
  const cs2 = player.games?.cs2;
  if (!cs2) throw new Error("This player has no CS2 profile");

  let kdr = null, winRate = null, totalMatches = null;
  try {
    const sRes = await fetch(`${FACEIT_BASE}/players/${player.player_id}/stats/cs2`, { headers });
    if (sRes.ok) {
      const s = await sRes.json();
      kdr = parseFloat(s?.lifetime?.["Average K/D Ratio"]);
      winRate = parseInt(s?.lifetime?.["Win Rate %"], 10);
      totalMatches = parseInt(s?.lifetime?.["Matches"], 10);
    }
  } catch {}

  let wins = 0, losses = 0;
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const fromTs = Math.floor(todayStart.getTime() / 1000);
    const hRes = await fetch(
      `${FACEIT_BASE}/players/${player.player_id}/history?game=cs2&from=${fromTs}&limit=50`,
      { headers }
    );
    if (hRes.ok) {
      const h = await hRes.json();
      for (const m of h.items || []) {
        if (m.status !== "FINISHED") continue;
        const f1 = m.teams?.faction1?.players || [];
        const inF1 = f1.some((p) => p.player_id === player.player_id);
        const winner = m.results?.winner;
        const won = (inF1 && winner === "faction1") || (!inF1 && winner === "faction2");
        if (won) wins++;
        else losses++;
      }
    }
  } catch {}

  let eloChange = 0;
  try {
    const lRes = await fetch(`https://faceit.lcrypt.eu/?n=${encodeURIComponent(nickname)}`);
    if (lRes.ok) {
      const ld = await lRes.json();
      if (typeof ld?.today?.elo === "number") eloChange = ld.today.elo;
    }
  } catch {}

  return {
    nickname: player.nickname,
    level: cs2.skill_level || 1,
    elo: cs2.faceit_elo || 0,
    kdr: kdr || 0,
    winRate: winRate || 0,
    wins,
    losses,
    todayMatches: wins + losses,
    eloChange,
    avatar: player.avatar,
    country: player.country,
    totalMatches: totalMatches || 0,
  };
}

async function searchFaceitPlayers(partial) {
  if (!partial || partial.length < 2 || !FACEIT_API_KEY) return [];
  const res = await fetch(
    `${FACEIT_BASE}/search/players?nickname=${encodeURIComponent(partial)}&game=cs2&offset=0&limit=6`,
    { headers: { Authorization: `Bearer ${FACEIT_API_KEY}` } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.items || [];
}

// ============================================================
// Visual primitives
// ============================================================
const LevelShield = ({ level, size = 56, glow }) => {
  const colors = {
    1: "#EAEAEA", 2: "#7CD16B", 3: "#7CD16B", 4: "#FFC107", 5: "#FFC107",
    6: "#FFC107", 7: "#FF9800", 8: "#FF6B35", 9: "#FF3838", 10: "#FF1744",
  };
  const c = colors[level] || "#FFC107";
  return (
    <svg width={size} height={size} viewBox="0 0 64 64"
      style={{ filter: glow ? `drop-shadow(0 0 12px ${c}aa)` : "none" }}>
      <defs>
        <linearGradient id={`sh-${level}-${size}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity="1" />
          <stop offset="100%" stopColor={c} stopOpacity="0.55" />
        </linearGradient>
      </defs>
      <path d="M32 4 L56 14 L56 32 C56 46 44 56 32 60 C20 56 8 46 8 32 L8 14 Z"
        fill={`url(#sh-${level}-${size})`} stroke={c} strokeWidth="1.5" />
      <text x="32" y="40" textAnchor="middle" fontFamily="Archivo Black, sans-serif" fontSize="22" fill="#0a0a0a">
        {level}
      </text>
    </svg>
  );
};

const MP4Background = ({ url, design }) => {
  if (url) {
    return (
      <video autoPlay loop muted playsInline
        className="absolute inset-0 w-full h-full object-cover rounded-[inherit]"
        src={url} />
    );
  }
  const styles = {
    neon:   { background: "radial-gradient(circle at 20% 30%, #ff00ea44, transparent 50%), radial-gradient(circle at 80% 70%, #00ffea44, transparent 50%), #0a0014" },
    brutal: { background: "repeating-linear-gradient(45deg, #d9f99d 0 24px, #84cc16 24px 48px)" },
    anime:  { background: "conic-gradient(from 45deg at 30% 50%, #ff6ec7, #fbbf24, #5eead4, #a78bfa, #ff6ec7)" },
    pixel:  { background: "repeating-linear-gradient(0deg, #0a0a0a 0 8px, #1a1a1a 8px 16px), repeating-linear-gradient(90deg, transparent 0 8px, rgba(255,255,255,0.02) 8px 16px)" },
  };
  return (
    <div className="absolute inset-0 overflow-hidden rounded-[inherit]">
      <div className="absolute -inset-[20%] opacity-70"
        style={{ ...styles[design], animation: "mp4spin 22s linear infinite", filter: "blur(2px)" }} />
    </div>
  );
};

// ============================================================
// Designs
// ============================================================
const NeonPulse = ({ data, accent, mp4Url, mp4Enabled, customFont, customization = {} }) => {
  const elo = useCountUp(data.elo, 1400, [data.nickname]);
  const titleFont = customFont ? `"${customFont}", JetBrains Mono, monospace` : 'JetBrains Mono, monospace';
  const showStats = customization.showStats !== false;
  const showEloChange = customization.showEloChange !== false;
  const tint = customization.bgTint ?? 1;
  const overlayOpacity = mp4Enabled ? Math.max(0.15, 0.55 * tint) : 1;
  const winColor = customization.winColor || "#22ff88";
  const lossColor = customization.lossColor || "#ff4444";
  return (
    <div className="relative w-[440px] h-[140px] overflow-hidden"
      style={{
        fontFamily: "JetBrains Mono, monospace",
        clipPath: "polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)",
      }}>
      {mp4Enabled && <MP4Background url={mp4Url} design="neon" />}
      <div className="absolute inset-0 bg-[#06000d]" style={{ opacity: overlayOpacity }} />
      <div className="absolute inset-0 pointer-events-none opacity-30 mix-blend-screen"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent 0 2px, rgba(255,255,255,0.04) 2px 3px)",
          animation: "scan 6s linear infinite",
        }} />
      <div className="absolute inset-0 pointer-events-none"
        style={{
          boxShadow: `inset 0 0 0 1px ${accent}, inset 0 0 24px ${accent}55, 0 0 36px ${accent}66`,
          animation: "neonPulse 2.4s ease-in-out infinite",
        }} />
      <span className="absolute top-2 left-2 w-3 h-3 border-t border-l" style={{ borderColor: accent }} />
      <span className="absolute top-2 right-2 w-3 h-3 border-t border-r" style={{ borderColor: accent }} />
      <span className="absolute bottom-2 left-2 w-3 h-3 border-b border-l" style={{ borderColor: accent }} />
      <span className="absolute bottom-2 right-2 w-3 h-3 border-b border-r" style={{ borderColor: accent }} />
      <div className="relative h-full flex items-center px-6 gap-5">
        <div className="relative">
          <LevelShield level={data.level} size={68} glow />
          <div className="absolute -inset-2 rounded-full"
            style={{
              background: `radial-gradient(circle, ${accent}33 0%, transparent 70%)`,
              animation: "pulseHalo 2s ease-in-out infinite",
            }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] tracking-[0.4em] mb-1" style={{ color: accent, textShadow: `0 0 8px ${accent}` }}>
            FACEIT // LVL {data.level}
          </div>
          <div className="text-white text-[22px] font-bold tracking-wider truncate"
            style={{ textShadow: `0 0 12px ${accent}aa`, fontFamily: titleFont }}>
            {data.nickname.toUpperCase()}
          </div>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-[28px] font-extrabold tabular-nums"
              style={{ color: accent, textShadow: `0 0 16px ${accent}`, fontFamily: titleFont }}>
              {elo.toLocaleString()}
            </span>
            <span className="text-white/50 text-[10px] tracking-[0.3em]">ELO</span>
            {showEloChange && (
              <span className="ml-auto text-[12px] font-bold flex items-center gap-1"
                style={{ color: data.eloChange > 0 ? winColor : data.eloChange < 0 ? lossColor : "#ffffff66" }}>
                {data.eloChange !== 0 && (data.eloChange > 0 ? "▲" : "▼")} {data.eloChange === 0 ? "—" : Math.abs(data.eloChange)}
              </span>
            )}
          </div>
        </div>
        {showStats && (
          <div className="flex flex-col gap-1.5 text-right">
            <div className="flex items-center gap-2 justify-end">
              <span className="text-white/40 text-[9px] tracking-[0.25em]">K/D</span>
              <span className="text-white text-sm font-bold tabular-nums">{data.kdr.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <span className="text-white/40 text-[9px] tracking-[0.25em]">W/L</span>
              <span className="font-bold text-sm" style={{ color: winColor }}>{data.wins}</span>
              <span className="text-white/30">·</span>
              <span className="font-bold text-sm" style={{ color: lossColor }}>{data.losses}</span>
            </div>
            <div className="text-[9px] tracking-[0.25em] px-2 py-0.5 border" style={{ borderColor: `${accent}55`, color: accent }}>
              LIVE
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Brutalist = ({ data, accent, mp4Url, mp4Enabled, customFont, customization = {} }) => {
  const elo = useCountUp(data.elo, 900, [data.nickname]);
  const titleFont = customFont ? `"${customFont}", "Bebas Neue", sans-serif` : '"Bebas Neue", sans-serif';
  const showStats = customization.showStats !== false;
  const showEloChange = customization.showEloChange !== false;
  const tint = customization.bgTint ?? 1;
  const overlayOpacity = mp4Enabled ? Math.max(0.3, 0.92 * tint) : 1;
  const winColor = customization.winColor || "#84cc16";
  const lossColor = customization.lossColor || "#fb7185";
  return (
    <div className="relative w-[440px] h-[140px]" style={{ fontFamily: "Archivo Black, sans-serif" }}>
      {mp4Enabled && <MP4Background url={mp4Url} design="brutal" />}
      <div className="absolute inset-0"
        style={{
          background: accent,
          border: "4px solid #0a0a0a",
          boxShadow: "8px 8px 0 #0a0a0a",
          opacity: overlayOpacity,
        }} />
      <div className="absolute top-0 right-0 w-20 h-20 pointer-events-none"
        style={{
          background: "repeating-linear-gradient(45deg, #0a0a0a 0 6px, transparent 6px 12px)",
          clipPath: "polygon(100% 0, 0 0, 100% 100%)",
        }} />
      <div className="absolute -top-3 left-6 px-2 py-0.5 bg-black text-white text-[10px] tracking-[0.3em]"
        style={{ transform: "rotate(-3deg)" }}>
        ● LIVE FACEIT
      </div>
      <div className="relative h-full flex items-center px-5 gap-4">
        <div className="bg-black p-2" style={{ boxShadow: "4px 4px 0 #0a0a0a55" }}>
          <LevelShield level={data.level} size={56} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-black text-[28px] leading-none uppercase truncate"
            style={{ fontFamily: titleFont, letterSpacing: "0.02em" }}>
            {data.nickname}
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-black text-[36px] leading-none tabular-nums"
              style={{ fontFamily: customFont ? `"${customFont}", "Archivo Black", sans-serif` : 'Archivo Black, sans-serif' }}>
              {elo}
            </span>
            <span className="text-black text-[11px] tracking-widest"
              style={{ fontFamily: "Archivo Black, sans-serif" }}>
              ELO
            </span>
          </div>
          {showEloChange && (
            <div className="mt-1 inline-flex items-center gap-1 bg-black px-2 py-0.5 text-[11px]"
              style={{ color: data.eloChange > 0 ? winColor : data.eloChange < 0 ? lossColor : "#fff8" }}>
              {data.eloChange > 0 ? "+" : ""}{data.eloChange} TODAY
            </div>
          )}
        </div>
        {showStats && (
          <div className="text-right">
            <div className="bg-black text-white px-2 py-1 text-[11px] tracking-widest mb-1"
              style={{ fontFamily: "JetBrains Mono, monospace" }}>
              K/D {data.kdr.toFixed(2)}
            </div>
            <div className="flex gap-1">
              {Array.from({ length: Math.max(data.todayMatches, 1) }).map((_, i) => (
                <div key={i} className="w-4 h-4 border-2 border-black"
                  style={{ background: i < data.wins ? "#0a0a0a" : "transparent" }} />
              ))}
            </div>
            <div className="text-black text-[10px] tracking-widest mt-1"
              style={{ fontFamily: "JetBrains Mono, monospace" }}>
              {data.wins}W·{data.losses}L
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================
// ANIME BURST — modern gacha-card aesthetic
// ============================================================
const AnimeBurst = ({ data, accent, mp4Url, mp4Enabled, customFont, customization = {} }) => {
  const elo = useCountUp(data.elo, 1200, [data.nickname]);
  const titleFont = customFont
    ? `"${customFont}", "Russo One", sans-serif`
    : '"Russo One", sans-serif';
  const stars = Math.max(1, Math.min(5, Math.ceil(data.level / 2)));
  const showStats = customization.showStats !== false;
  const showEloChange = customization.showEloChange !== false;
  const tint = customization.bgTint ?? 1;
  const tintAlpha = Math.max(0.15, 0.55 * tint);
  const winColor = customization.winColor || "#4ade80";
  const lossColor = customization.lossColor || "#f472b6";

  return (
    <div className="w-[440px] h-[140px] rounded-xl p-[2px] overflow-hidden relative"
      style={{
        background: 'linear-gradient(115deg, #ff6ec7, #fbbf24, #5eead4, #a78bfa, #ff6ec7, #fbbf24)',
        backgroundSize: '400% 400%',
        animation: 'animeFlow 6s ease infinite',
      }}>
      <div className="relative w-full h-full rounded-[10px] overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #1a0033 0%, #2d0a4d 50%, #4a1a6e 100%)',
          fontFamily: '"Russo One", sans-serif',
        }}>
        {mp4Enabled && <MP4Background url={mp4Url} design="anime" />}
        {mp4Enabled && (
          <div className="absolute inset-0"
            style={{ background: `linear-gradient(135deg, rgba(26,0,51,${tintAlpha}), rgba(74,26,110,${tintAlpha}))` }} />
        )}

        {/* Radial burst from where the level sits */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(circle at 20% 50%, ${accent}66 0%, transparent 45%)` }} />

        {/* Speed lines fanning from left edge */}
        <div className="absolute inset-0 opacity-25 pointer-events-none"
          style={{
            background: `repeating-conic-gradient(from 90deg at 0% 50%, transparent 0deg 4deg, ${accent} 4deg 5deg)`,
          }} />

        {/* Foil shimmer sweep */}
        <div className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-50"
          style={{
            background: 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.35) 50%, transparent 70%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 4s ease-in-out infinite',
          }} />

        {/* Sparkles */}
        {[...Array(7)].map((_, i) => (
          <span
            key={i}
            className="absolute pointer-events-none"
            style={{
              top: `${15 + ((i * 41) % 65)}%`,
              left: `${12 + ((i * 67) % 80)}%`,
              animation: `sparkle ${2 + (i % 3)}s ease-in-out ${i * 0.4}s infinite`,
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10">
              <path d="M5 0 L6 4 L10 5 L6 6 L5 10 L4 6 L0 5 L4 4 Z" fill="white" />
            </svg>
          </span>
        ))}

        {/* Content */}
        <div className="relative h-full flex items-center px-5 gap-4 z-10">
          {/* Level w/ burst aura */}
          <div className="relative flex items-center justify-center" style={{ minWidth: 76, height: 76 }}>
            {/* Soft glow disc */}
            <div className="absolute inset-0 rounded-full"
              style={{
                background: `radial-gradient(circle, ${accent}aa 0%, ${accent}33 35%, transparent 70%)`,
                animation: 'pulseHalo 2.4s ease-in-out infinite',
                filter: 'blur(6px)',
              }} />
            {/* Burst spikes (clockwise) */}
            <svg className="absolute inset-0" viewBox="0 0 100 100"
              style={{ animation: 'spin 14s linear infinite' }}>
              {[...Array(8)].map((_, i) => (
                <polygon key={i} points="50,2 53,40 50,50 47,40"
                  transform={`rotate(${i * 45} 50 50)`}
                  fill={`${accent}cc`} />
              ))}
            </svg>
            {/* Burst spikes (counter-clockwise, offset) */}
            <svg className="absolute inset-0" viewBox="0 0 100 100"
              style={{ animation: 'spin 18s linear infinite reverse' }}>
              {[...Array(8)].map((_, i) => (
                <polygon key={i} points="50,8 52,40 50,50 48,40"
                  transform={`rotate(${i * 45 + 22.5} 50 50)`}
                  fill={`${accent}66`} />
              ))}
            </svg>
            <div className="relative">
              <LevelShield level={data.level} size={56} glow />
            </div>
          </div>

          {/* Nickname & ELO */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-0.5 mb-1">
              {[...Array(5)].map((_, i) => (
                <span key={i}
                  style={{
                    color: i < stars ? accent : 'rgba(255,255,255,0.18)',
                    fontSize: 11,
                    textShadow: i < stars ? `0 0 8px ${accent}` : 'none',
                    lineHeight: 1,
                  }}>★</span>
              ))}
              <span className="text-white/40 text-[8px] tracking-[0.4em] ml-2 uppercase"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Skill Rank
              </span>
            </div>

            <div className="text-white text-[24px] leading-none truncate uppercase"
              style={{
                fontFamily: titleFont,
                letterSpacing: '0.04em',
                textShadow: `0 0 14px ${accent}cc, 2px 2px 0 #000, -1px 1px 0 #000`,
              }}>
              {data.nickname}
            </div>

            <div className="flex items-baseline gap-2 mt-1.5">
              <span className="text-[24px] leading-none tabular-nums"
                style={{
                  fontFamily: titleFont,
                  background: `linear-gradient(180deg, #ffffff 0%, ${accent} 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter: `drop-shadow(0 0 10px ${accent}aa)`,
                }}>
                {elo.toLocaleString()}
              </span>
              <span className="text-white/60 text-[9px] tracking-[0.3em] uppercase"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                ELO
              </span>
              {showEloChange && data.eloChange !== 0 && (
                <span className="text-[10px] flex items-center gap-1 ml-auto px-2 py-0.5 rounded-full font-bold"
                  style={{
                    background: data.eloChange > 0 ? winColor : lossColor,
                    color: '#0a0a0a',
                    fontFamily: titleFont,
                    boxShadow: `0 0 12px ${(data.eloChange > 0 ? winColor : lossColor)}99`,
                  }}>
                  {data.eloChange > 0 ? '↑' : '↓'} {Math.abs(data.eloChange)}
                </span>
              )}
            </div>
          </div>

          {/* Right stats */}
          {showStats && (
            <div className="text-right space-y-0.5"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              <div className="text-white/40 text-[9px] tracking-[0.4em] uppercase mb-1">TODAY</div>
              <div className="flex items-center gap-1.5 justify-end">
                <span className="text-sm font-bold"
                  style={{
                    color: winColor,
                    fontFamily: titleFont,
                    textShadow: `0 0 8px ${winColor}99`,
                  }}>{data.wins}W</span>
                <span className="text-white/30 text-xs">·</span>
                <span className="text-sm font-bold"
                  style={{
                    color: lossColor,
                    fontFamily: titleFont,
                    textShadow: `0 0 8px ${lossColor}99`,
                  }}>{data.losses}L</span>
              </div>
              <div className="text-white/70 text-[10px] tabular-nums">
                K/D <span className="text-white font-bold" style={{ fontFamily: titleFont }}>{data.kdr.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const PixelArcade = ({ data, accent, mp4Url, mp4Enabled, customFont, customization = {} }) => {
  const elo = useCountUp(data.elo, 800, [data.nickname]);
  const nickFont = customFont ? `"${customFont}", "VT323", monospace` : '"VT323", monospace';
  const showStats = customization.showStats !== false;
  const showEloChange = customization.showEloChange !== false;
  const tint = customization.bgTint ?? 1;
  const overlayOpacity = mp4Enabled ? Math.max(0.3, 0.88 * tint) : 1;
  const winColor = customization.winColor || "#4ade80";
  const lossColor = customization.lossColor || "#f87171";
  return (
    <div className="relative w-[440px] h-[140px]" style={{ fontFamily: '"VT323", monospace' }}>
      {mp4Enabled && <MP4Background url={mp4Url} design="pixel" />}
      <div className="absolute inset-0"
        style={{
          background: "#0a0a0a",
          boxShadow: `inset 0 0 0 4px ${accent}, 6px 6px 0 #0a0a0a`,
          opacity: overlayOpacity,
        }} />
      <div className="absolute inset-2 pointer-events-none"
        style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.18)" }} />
      <div className="absolute top-2 left-3 px-1.5 py-0.5 z-10"
        style={{
          background: "#fff", color: "#0a0a0a",
          fontFamily: '"Press Start 2P", monospace',
          fontSize: 7,
          boxShadow: "2px 2px 0 #0a0a0a",
        }}>
        P1
      </div>
      <div className="absolute top-2 right-3 z-10 flex items-center gap-1"
        style={{
          color: accent,
          fontFamily: '"Press Start 2P", monospace',
          fontSize: 7,
        }}>
        <span style={{ animation: "blink 1s steps(2) infinite" }}>▶</span>
        <span style={{ color: "#fff" }}>READY</span>
      </div>
      <div className="relative h-full flex items-center px-5 gap-3 z-10">
        <div className="text-center" style={{ minWidth: 64 }}>
          <div style={{
            fontFamily: '"Press Start 2P", monospace',
            fontSize: 32,
            color: accent,
            textShadow: "3px 3px 0 #000",
            lineHeight: 1,
          }}>
            {data.level}
          </div>
          <div style={{
            fontFamily: '"Press Start 2P", monospace',
            fontSize: 6,
            color: "#fff",
            marginTop: 8,
            letterSpacing: "0.15em",
          }}>
            LEVEL
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="truncate" style={{
            fontFamily: nickFont,
            fontSize: 26,
            color: "#fff",
            lineHeight: 1,
            textShadow: "2px 2px 0 #000",
          }}>
            {data.nickname}
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span style={{
              fontFamily: '"Press Start 2P", monospace',
              fontSize: 16,
              color: accent,
              textShadow: "2px 2px 0 #000",
            }}>
              {elo}
            </span>
            <span style={{
              fontFamily: '"Press Start 2P", monospace',
              fontSize: 7,
              color: "#fff",
            }}>
              ELO
            </span>
          </div>
          {showEloChange && (
            <div className="mt-1 inline-flex items-center gap-1.5">
              <span style={{
                fontFamily: '"Press Start 2P", monospace',
                fontSize: 7,
                color: data.eloChange > 0 ? winColor : data.eloChange < 0 ? lossColor : "#666",
              }}>
                {data.eloChange > 0 ? "▲" : data.eloChange < 0 ? "▼" : "·"}
              </span>
              <span style={{
                fontFamily: '"VT323", monospace',
                fontSize: 18,
                color: data.eloChange > 0 ? winColor : data.eloChange < 0 ? lossColor : "#666",
                lineHeight: 1,
              }}>
                {data.eloChange > 0 ? "+" : ""}{data.eloChange}
              </span>
            </div>
          )}
        </div>
        {showStats && (
          <div className="text-right">
            <div className="flex gap-1 justify-end mb-1.5">
              {Array.from({ length: Math.max(Math.min(data.todayMatches, 5), 1) }).map((_, i) => (
                <div key={i} style={{
                  width: 10, height: 10,
                  background: i < data.wins ? accent : "transparent",
                  border: `2px solid ${i < data.wins ? accent : "#444"}`,
                }} />
              ))}
            </div>
            <div style={{
              fontFamily: '"Press Start 2P", monospace',
              fontSize: 7,
              color: "#fff",
              letterSpacing: "0.05em",
            }}>
              W:{data.wins} L:{data.losses}
            </div>
            <div style={{
              fontFamily: '"VT323", monospace',
              fontSize: 16,
              color: "#aaa",
              marginTop: 4,
              lineHeight: 1,
            }}>
              K/D {data.kdr.toFixed(2)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const DESIGN_COMPONENTS = {
  neon: NeonPulse,
  brutal: Brutalist,
  anime: AnimeBurst,
  pixel: PixelArcade,
};

// ============================================================
// Mock fallback
// ============================================================
const mockData = {
  nickname: "s1mple", level: 10, elo: 3247, kdr: 1.42,
  todayMatches: 5, wins: 3, losses: 2, eloChange: 47,
  winRate: 60, totalMatches: 4521,
};

function timeAgo(d) {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

// ============================================================
// Player Search Autocomplete
// ============================================================
function NicknameSearch({ value, onChange, accent, onResolved }) {
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!FACEIT_API_KEY || !value || value.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const items = await searchFaceitPlayers(value);
        if (!cancelled) {
          setResults(items);
          if (items.length > 0) setOpen(true);
        }
      } catch {} finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [value]);

  const select = (nick) => {
    onChange(nick);
    setOpen(false);
    setResults([]);
    onResolved?.();
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={FACEIT_API_KEY ? "type 2+ letters to search…" : "enter nickname"}
          className="w-full bg-transparent text-white text-base outline-none border-b pb-1 pl-7 pr-7 placeholder:text-white/20"
          style={{ fontFamily: "Space Grotesk, sans-serif", borderColor: accent }}
        />
        {searching && (
          <RefreshCw size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/50 animate-spin" />
        )}
      </div>
      {open && results.length > 0 && (
        <div
          className="absolute top-full left-0 right-0 mt-2 rounded-lg overflow-hidden z-30 max-h-72 overflow-y-auto"
          style={{
            background: "rgba(8,4,16,0.97)",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
            backdropFilter: "blur(12px)",
          }}>
          {results.map((p, i) => {
            const cs2 = p.games?.cs2;
            const lvl = cs2?.skill_level;
            const elo = cs2?.faceit_elo;
            return (
              <button
                key={p.player_id || i}
                onClick={() => select(p.nickname)}
                className="w-full p-2.5 flex items-center gap-3 hover:bg-white/5 transition-colors text-left"
                style={{ borderBottom: i < results.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                {p.avatar ? (
                  <img src={p.avatar} alt="" className="w-8 h-8 rounded-full bg-white/5"
                    onError={(e) => { e.target.style.display = 'none'; }} />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/40 text-xs">
                    {p.nickname?.[0]?.toUpperCase() || "?"}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm truncate"
                    style={{ fontFamily: "Space Grotesk, sans-serif" }}>
                    {p.nickname}
                  </div>
                  {p.country && (
                    <div className="text-white/30 text-[9px] uppercase tracking-widest mt-0.5"
                      style={{ fontFamily: "JetBrains Mono, monospace" }}>
                      {p.country}
                    </div>
                  )}
                </div>
                {lvl && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <LevelShield level={lvl} size={26} />
                    {typeof elo === "number" && elo > 0 && (
                      <div className="flex flex-col items-end leading-none">
                        <span className="text-white text-xs font-bold tabular-nums"
                          style={{ fontFamily: "JetBrains Mono, monospace" }}>
                          {elo.toLocaleString()}
                        </span>
                        <span className="text-white/40 text-[8px] tracking-[0.3em] mt-0.5"
                          style={{ fontFamily: "JetBrains Mono, monospace" }}>
                          ELO
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Font Picker
// ============================================================
function FontPicker({ value, onChange, accent }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    GOOGLE_FONTS.forEach((f) => {
      if (!f.value) return;
      const family = f.value.replace(/ /g, "+");
      const id = `gfont-${family}`;
      if (document.getElementById(id)) return;
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?family=${family}:wght@400;700&display=swap`;
      document.head.appendChild(link);
    });
  }, []);

  const current = GOOGLE_FONTS.find((f) => f.value === value) || GOOGLE_FONTS[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 p-2 rounded-lg text-left transition-colors"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}>
        <div className="flex items-center gap-2 min-w-0">
          <Type size={14} style={{ color: accent }} />
          <span className="text-sm text-white truncate"
            style={{ fontFamily: current.value ? `"${current.value}", system-ui` : "Space Grotesk, sans-serif" }}>
            {current.name}
          </span>
        </div>
        <span className="text-white/30 text-xs">▾</span>
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 rounded-lg overflow-hidden z-30 max-h-64 overflow-y-auto"
          style={{
            background: "rgba(8,4,16,0.97)",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
            backdropFilter: "blur(12px)",
          }}>
          {GOOGLE_FONTS.map((f) => (
            <button key={f.value || "default"}
              onClick={() => { onChange(f.value); setOpen(false); }}
              className="w-full p-2.5 flex items-center justify-between gap-2 hover:bg-white/5 transition-colors text-left"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <span className="text-white text-sm"
                style={{ fontFamily: f.value ? `"${f.value}", system-ui` : "Space Grotesk, sans-serif" }}>
                {f.name}
              </span>
              <span className="text-white/40 text-[10px] uppercase tracking-widest"
                style={{ fontFamily: "JetBrains Mono, monospace" }}>
                {f.desc}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Status Badge
// ============================================================
function StatusBadge({ usingReal, loading, error, hasKey }) {
  let label, color, Icon;
  if (loading)        { label = "FETCHING";   color = "#fbbf24"; Icon = RefreshCw; }
  else if (error)     { label = "ERROR";      color = "#f87171"; Icon = AlertCircle; }
  else if (usingReal) { label = "LIVE";       color = "#34d399"; Icon = CircleCheck; }
  else if (hasKey)    { label = "IDLE";       color = "#94a3b8"; Icon = CircleCheck; }
  else                { label = "DEMO MODE";  color = "#fbbf24"; Icon = AlertCircle; }
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] tracking-[0.3em]"
      style={{
        background: `${color}1a`,
        border: `1px solid ${color}66`,
        color,
        fontFamily: "JetBrains Mono, monospace",
      }}>
      <Icon size={11} className={loading ? "animate-spin" : ""} />
      {label}
    </div>
  );
}

// ============================================================
// Paywall Modal
// ============================================================
function Paywall({ template, onClose, onUnlock }) {
  const [processing, setProcessing] = useState(false);
  const Icon = DESIGN_ICONS[template.design] || Square;

  const mockUnlock = async () => {
    setProcessing(true);
    // Simulated payment flow — replace this with Stripe / NOWPayments / crypto checkout
    await new Promise((r) => setTimeout(r, 700));
    onUnlock(template.id);
    setProcessing(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(10px)" }}
      onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl p-6 relative"
        style={{
          background: "linear-gradient(135deg, #0f0a1a 0%, #1a0a2e 100%)",
          border: `1px solid ${template.defaultAccent}66`,
          boxShadow: `0 20px 60px ${template.defaultAccent}33`,
          animation: "fadeIn 0.3s ease",
        }}
        onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose}
          className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors">
          <X size={20} />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg"
            style={{ background: `${template.defaultAccent}22`, border: `1px solid ${template.defaultAccent}55` }}>
            <Crown size={16} style={{ color: template.defaultAccent }} />
          </div>
          <span className="text-[10px] tracking-[0.4em] uppercase"
            style={{ color: template.defaultAccent, fontFamily: "JetBrains Mono, monospace" }}>
            Premium Template
          </span>
        </div>

        <h3 className="text-white text-3xl mb-2"
          style={{ fontFamily: "Bebas Neue, sans-serif", letterSpacing: "0.02em" }}>
          Unlock {template.name}
        </h3>
        <p className="text-white/50 text-sm mb-6 leading-relaxed"
          style={{ fontFamily: "Space Grotesk, sans-serif" }}>
          {template.desc || "Custom premium template"} · with {template.mp4Url ? "looping video background" : "exclusive styling"}.
          One-time unlock, yours forever.
        </p>

        <div className="rounded-xl p-4 mb-5 flex items-center gap-3"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <Icon size={18} style={{ color: template.defaultAccent }} />
          <div className="flex-1 min-w-0">
            <div className="text-white text-sm font-medium">{template.name}</div>
            <div className="text-[10px] text-white/40 mt-0.5"
              style={{ fontFamily: "JetBrains Mono, monospace" }}>
              {template.design} {template.mp4Url ? "· video bg" : ""} {template.defaultFont ? `· ${template.defaultFont}` : ""}
            </div>
          </div>
          <div className="text-right">
            <div className="text-white text-xl font-bold tabular-nums"
              style={{ fontFamily: "JetBrains Mono, monospace" }}>
              ${(template.price ?? 0).toFixed(2)}
            </div>
            <div className="text-[9px] tracking-widest text-white/40 uppercase mt-0.5"
              style={{ fontFamily: "JetBrains Mono, monospace" }}>
              one-time
            </div>
          </div>
        </div>

        <button onClick={mockUnlock} disabled={processing}
          className="w-full px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2"
          style={{
            background: processing ? "rgba(255,255,255,0.1)" : template.defaultAccent,
            color: processing ? "rgba(255,255,255,0.5)" : "#0a0a0a",
            fontFamily: "JetBrains Mono, monospace",
            letterSpacing: "0.15em",
            boxShadow: processing ? "none" : `0 8px 24px ${template.defaultAccent}55`,
          }}>
          {processing ? (
            <>
              <RefreshCw size={14} className="animate-spin" /> PROCESSING…
            </>
          ) : (
            <>
              <Lock size={14} /> UNLOCK FOR ${(template.price ?? 0).toFixed(2)}
            </>
          )}
        </button>

        <div className="mt-4 p-2 rounded text-[10px] leading-relaxed flex items-start gap-2"
          style={{ background: "rgba(251, 191, 36, 0.06)", border: "1px solid rgba(251, 191, 36, 0.15)" }}>
          <AlertCircle size={11} className="text-amber-400 mt-0.5 shrink-0" />
          <span className="text-amber-200/70">
            Demo: this is a mock unlock — no payment is taken. Wire Stripe / NOWPayments / your crypto
            checkout into <code className="text-amber-200">mockUnlock()</code> when going live.
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Admin Panel
// ============================================================
function AdminPanel({ onClose, customTemplates, saveCustomTemplates, onTest, status, isAdmin, setIsAdmin, unlockedIds, clearUnlocks }) {
  const [editing, setEditing] = useState(null);
  const [showNew, setShowNew] = useState(false);

  const startNew = () => {
    setEditing({
      id: `tpl-${Date.now()}`,
      name: "",
      design: "neon",
      defaultAccent: "#ff00ea",
      mp4Url: "",
      defaultFont: "",
      builtin: false,
      price: 4.99,
      desc: "",
    });
    setShowNew(true);
  };

  const startEdit = (tpl) => {
    setEditing({ ...tpl });
    setShowNew(false);
  };

  const saveTemplate = (tpl) => {
    const exists = customTemplates.find((t) => t.id === tpl.id);
    const next = exists
      ? customTemplates.map((t) => (t.id === tpl.id ? tpl : t))
      : [...customTemplates, tpl];
    saveCustomTemplates(next);
    setEditing(null);
    setShowNew(false);
  };

  const deleteTemplate = (id) => {
    saveCustomTemplates(customTemplates.filter((t) => t.id !== id));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 md:p-10 overflow-auto"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
      onClick={onClose}>
      <div
        className="w-full max-w-3xl rounded-2xl p-6 md:p-8 relative my-auto"
        style={{
          background: "linear-gradient(135deg, #0f0a1a 0%, #1a0a2e 100%)",
          border: "1px solid rgba(255,255,255,0.1)",
          animation: "fadeIn 0.3s ease",
        }}
        onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose}
          className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors">
          <X size={20} />
        </button>

        <div className="mb-6">
          <div className="text-[10px] tracking-[0.5em] uppercase text-white/50 mb-1"
            style={{ fontFamily: "JetBrains Mono, monospace" }}>
            Restricted · Admin Only
          </div>
          <h2 className="text-white text-3xl"
            style={{ fontFamily: "Bebas Neue, sans-serif", letterSpacing: "0.02em" }}>
            Settings
          </h2>
        </div>

        {/* API Key status */}
        <section className="mb-6 p-4 rounded-lg"
          style={{
            background: FACEIT_API_KEY ? "rgba(52, 211, 153, 0.06)" : "rgba(251, 191, 36, 0.06)",
            border: `1px solid ${FACEIT_API_KEY ? "rgba(52, 211, 153, 0.25)" : "rgba(251, 191, 36, 0.25)"}`,
          }}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] tracking-[0.3em] uppercase"
              style={{ fontFamily: "JetBrains Mono, monospace", color: FACEIT_API_KEY ? "#34d399" : "#fbbf24" }}>
              Faceit API Key
            </div>
            <span className="text-[10px] tracking-[0.3em]"
              style={{ fontFamily: "JetBrains Mono, monospace", color: FACEIT_API_KEY ? "#34d399" : "#fbbf24" }}>
              {FACEIT_API_KEY ? "✓ CONFIGURED" : "⚠ NOT SET"}
            </span>
          </div>
          {FACEIT_API_KEY ? (
            <p className="text-[11px] text-white/60 leading-relaxed">
              Live stats are flowing. Status:{" "}
              <span className="text-white">
                {status.error ? <span className="text-red-300">{status.error}</span> :
                 status.loading ? "fetching…" :
                 status.usingReal ? `live · ${status.lastFetch && timeAgo(status.lastFetch)}` :
                 "idle"}
              </span>
              <button onClick={onTest} className="ml-2 underline hover:text-white">refresh</button>
            </p>
          ) : (
            <p className="text-[11px] text-amber-200/80 leading-relaxed">
              Edit <code className="px-1 py-0.5 bg-black/40 rounded text-amber-200">FACEIT_API_KEY</code> at the top of the source file.
              Use a <span className="text-white/90">Client-side</span> key from developers.faceit.com.
              For production, route Faceit calls through a Node backend so the key isn't in the browser bundle.
            </p>
          )}
        </section>

        {/* Mode toggle */}
        <section className="mb-6 p-4 rounded-lg"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] tracking-[0.3em] uppercase text-white/60 mb-1"
                style={{ fontFamily: "JetBrains Mono, monospace" }}>
                Viewing As
              </div>
              <p className="text-[11px] text-white/40 leading-relaxed">
                {isAdmin
                  ? "All premium templates unlocked. Toggle off to test the regular user experience with paywalls."
                  : "Locked premium templates show paywalls. Toggle on to access everything as admin."}
              </p>
            </div>
            <div className="flex rounded-lg overflow-hidden shrink-0"
              style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
              <button onClick={() => setIsAdmin(false)}
                className="px-3 py-1.5 text-[10px] tracking-[0.3em] uppercase transition-colors"
                style={{
                  background: !isAdmin ? "#fff" : "transparent",
                  color: !isAdmin ? "#0a0a0a" : "rgba(255,255,255,0.6)",
                  fontFamily: "JetBrains Mono, monospace",
                }}>
                <Eye size={10} className="inline mr-1" /> User
              </button>
              <button onClick={() => setIsAdmin(true)}
                className="px-3 py-1.5 text-[10px] tracking-[0.3em] uppercase transition-colors"
                style={{
                  background: isAdmin ? "#fbbf24" : "transparent",
                  color: isAdmin ? "#0a0a0a" : "rgba(255,255,255,0.6)",
                  fontFamily: "JetBrains Mono, monospace",
                }}>
                <UserCog size={10} className="inline mr-1" /> Admin
              </button>
            </div>
          </div>
          {unlockedIds.length > 0 && !isAdmin && (
            <div className="mt-3 pt-3 flex items-center justify-between gap-2"
              style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <span className="text-[10px] text-white/50"
                style={{ fontFamily: "JetBrains Mono, monospace" }}>
                {unlockedIds.length} template{unlockedIds.length === 1 ? "" : "s"} unlocked (mock)
              </span>
              <button onClick={clearUnlocks}
                className="text-[10px] tracking-[0.3em] uppercase text-white/60 hover:text-red-300"
                style={{ fontFamily: "JetBrains Mono, monospace" }}>
                Clear unlocks
              </button>
            </div>
          )}
        </section>

        {/* Templates manager */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[10px] tracking-[0.3em] uppercase text-white/60"
                style={{ fontFamily: "JetBrains Mono, monospace" }}>
                Templates
              </div>
              <p className="text-[11px] text-white/40 mt-1 leading-relaxed">
                Bundle a design + accent + MP4 + font + price. Custom templates can be free or paid;
                builtins are always free. Users override accent &amp; font but not the background.
              </p>
            </div>
            <button
              onClick={startNew}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors shrink-0"
              style={{
                background: "#fff",
                color: "#0a0a0a",
                fontFamily: "JetBrains Mono, monospace",
              }}>
              <Plus size={12} /> NEW
            </button>
          </div>

          <div className="space-y-2">
            {[...BUILTIN_TEMPLATES, ...customTemplates].map((t) => {
              const Icon = DESIGN_ICONS[t.design] || Square;
              const isPaid = !t.builtin && (t.price ?? 0) > 0;
              return (
                <div key={t.id}
                  className="flex items-center gap-3 p-3 rounded-lg"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}>
                  <Icon size={14} style={{ color: t.defaultAccent }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white text-sm font-medium truncate">{t.name}</span>
                      {t.builtin && (
                        <span className="text-[9px] tracking-widest uppercase px-1.5 py-0.5 rounded"
                          style={{ background: "rgba(255,255,255,0.06)", color: "#fff8", fontFamily: "JetBrains Mono, monospace" }}>
                          BUILTIN
                        </span>
                      )}
                      {isPaid && (
                        <span className="text-[9px] tracking-widest uppercase px-1.5 py-0.5 rounded flex items-center gap-1"
                          style={{ background: "rgba(251, 191, 36, 0.15)", color: "#fbbf24", fontFamily: "JetBrains Mono, monospace" }}>
                          <Crown size={9} /> ${t.price.toFixed(2)}
                        </span>
                      )}
                      {!t.builtin && !isPaid && (
                        <span className="text-[9px] tracking-widest uppercase px-1.5 py-0.5 rounded"
                          style={{ background: "rgba(52, 211, 153, 0.15)", color: "#34d399", fontFamily: "JetBrains Mono, monospace" }}>
                          FREE
                        </span>
                      )}
                      {t.mp4Url && <Film size={11} className="text-emerald-400" title="has MP4 background" />}
                    </div>
                    <div className="text-[10px] text-white/40 mt-0.5 truncate"
                      style={{ fontFamily: "JetBrains Mono, monospace" }}>
                      {t.design} · {t.defaultAccent}{t.defaultFont ? ` · ${t.defaultFont}` : ""}{t.mp4Url ? (t.mp4Url.startsWith("blob:") ? ` · uploaded` : ` · video`) : ""}
                    </div>
                  </div>
                  {!t.builtin && (
                    <>
                      <button onClick={() => startEdit(t)}
                        className="p-1.5 rounded text-white/60 hover:text-white hover:bg-white/5 transition-colors">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => deleteTemplate(t.id)}
                        className="p-1.5 rounded text-white/60 hover:text-red-300 hover:bg-red-500/10 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {editing && (
            <TemplateEditor
              template={editing}
              isNew={showNew}
              onSave={saveTemplate}
              onCancel={() => { setEditing(null); setShowNew(false); }}
            />
          )}
        </section>

        <div className="flex justify-end">
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm transition-colors"
            style={{
              background: "rgba(255,255,255,0.06)",
              color: "#fff",
              fontFamily: "JetBrains Mono, monospace",
            }}>
            DONE
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Template Editor
// ============================================================
function TemplateEditor({ template, isNew, onSave, onCancel }) {
  const [t, setT] = useState(template);
  const update = (k, v) => setT((p) => ({ ...p, [k]: v }));
  const designs = [
    { id: "neon", name: "Neon Pulse" },
    { id: "brutal", name: "Brutal Mono" },
    { id: "anime", name: "Anime Burst" },
    { id: "pixel", name: "Pixel Arcade" },
  ];
  const valid = t.name.trim().length > 0;

  return (
    <div className="mt-3 p-4 rounded-lg space-y-3"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: `1px solid ${t.defaultAccent}55`,
        animation: "fadeIn 0.2s ease",
      }}>
      <div className="text-[10px] tracking-[0.3em] uppercase text-white/60"
        style={{ fontFamily: "JetBrains Mono, monospace" }}>
        {isNew ? "New Template" : "Edit Template"}
      </div>

      <div>
        <label className="text-[10px] tracking-[0.3em] uppercase text-white/50 block mb-1"
          style={{ fontFamily: "JetBrains Mono, monospace" }}>Name</label>
        <input value={t.name}
          onChange={(e) => update("name", e.target.value)}
          placeholder="e.g. Cyber City"
          className="w-full bg-black/40 text-white p-2 rounded outline-none border placeholder:text-white/20 text-sm"
          style={{ borderColor: "rgba(255,255,255,0.1)", fontFamily: "Space Grotesk, sans-serif" }} />
      </div>

      <div>
        <label className="text-[10px] tracking-[0.3em] uppercase text-white/50 block mb-1"
          style={{ fontFamily: "JetBrains Mono, monospace" }}>Design</label>
        <div className="grid grid-cols-4 gap-1">
          {designs.map((d) => (
            <button key={d.id}
              onClick={() => update("design", d.id)}
              className="p-2 rounded text-xs transition-colors"
              style={{
                background: t.design === d.id ? `${t.defaultAccent}22` : "rgba(255,255,255,0.04)",
                border: `1px solid ${t.design === d.id ? t.defaultAccent : "rgba(255,255,255,0.08)"}`,
                color: t.design === d.id ? t.defaultAccent : "#fff",
              }}>
              {d.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[10px] tracking-[0.3em] uppercase text-white/50 block mb-1"
          style={{ fontFamily: "JetBrains Mono, monospace" }}>Default Accent</label>
        <div className="flex items-center gap-2">
          <input type="color" value={t.defaultAccent}
            onChange={(e) => update("defaultAccent", e.target.value)}
            className="w-10 h-10 rounded cursor-pointer border-0"
            style={{ padding: 0, background: "transparent" }} />
          <input type="text" value={t.defaultAccent}
            onChange={(e) => update("defaultAccent", e.target.value)}
            className="flex-1 bg-black/40 text-white p-2 rounded outline-none border text-sm"
            style={{ borderColor: "rgba(255,255,255,0.1)", fontFamily: "JetBrains Mono, monospace" }} />
        </div>
      </div>

      <div>
        <label className="text-[10px] tracking-[0.3em] uppercase text-white/50 block mb-1"
          style={{ fontFamily: "JetBrains Mono, monospace" }}>Background Video (optional)</label>
        <div className="space-y-2">
          {/* Upload from computer */}
          <label className="flex items-center gap-2 p-2 rounded cursor-pointer transition-colors hover:bg-white/5"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px dashed rgba(255,255,255,0.15)",
            }}>
            <Upload size={14} className="text-white/60 shrink-0" />
            <span className="text-xs text-white/70 flex-1 truncate"
              style={{ fontFamily: "JetBrains Mono, monospace" }}>
              {t.mp4Url?.startsWith("blob:")
                ? `${t._fileName || "uploaded.mp4"} · ${t._fileSize || "session only"}`
                : "Upload from computer (.mp4 / .webm)"}
            </span>
            <input type="file" accept="video/mp4,video/webm,video/quicktime"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (f.size > 20 * 1024 * 1024) {
                  alert("File is over 20MB — for production you'd want to compress it. Loading anyway.");
                }
                const url = URL.createObjectURL(f);
                setT((p) => ({
                  ...p,
                  mp4Url: url,
                  _fileName: f.name,
                  _fileSize: `${(f.size / 1024 / 1024).toFixed(1)} MB`,
                }));
              }} />
          </label>

          {/* OR paste a URL */}
          <input type="url"
            value={t.mp4Url?.startsWith("blob:") ? "" : t.mp4Url}
            onChange={(e) => setT((p) => ({
              ...p,
              mp4Url: e.target.value,
              _fileName: undefined,
              _fileSize: undefined,
            }))}
            placeholder="…or paste CDN URL: https://cdn.example.com/cyber.mp4"
            className="w-full bg-black/40 text-white p-2 rounded outline-none border placeholder:text-white/20 text-sm"
            style={{ borderColor: "rgba(255,255,255,0.1)", fontFamily: "JetBrains Mono, monospace" }} />

          {t.mp4Url?.startsWith("blob:") && (
            <div className="flex items-start gap-2 p-2 rounded text-[10px] leading-relaxed"
              style={{ background: "rgba(251, 191, 36, 0.08)", border: "1px solid rgba(251, 191, 36, 0.2)" }}>
              <AlertCircle size={11} className="text-amber-400 mt-0.5 shrink-0" />
              <span className="text-amber-200/80">
                Uploaded files only persist in this browser session. For production, upload to your CDN
                (S3 / Cloudflare R2 / Bunny) and paste the public URL above.
              </span>
            </div>
          )}
        </div>
      </div>

      <div>
        <label className="text-[10px] tracking-[0.3em] uppercase text-white/50 block mb-1"
          style={{ fontFamily: "JetBrains Mono, monospace" }}>Default Font</label>
        <select value={t.defaultFont}
          onChange={(e) => update("defaultFont", e.target.value)}
          className="w-full bg-black/40 text-white p-2 rounded outline-none border text-sm"
          style={{ borderColor: "rgba(255,255,255,0.1)", fontFamily: "Space Grotesk, sans-serif" }}>
          {GOOGLE_FONTS.map((f) => (
            <option key={f.value || "default"} value={f.value} style={{ background: "#0a0a0a" }}>
              {f.name} {f.desc ? `— ${f.desc}` : ""}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-[10px] tracking-[0.3em] uppercase text-white/50 block mb-1"
          style={{ fontFamily: "JetBrains Mono, monospace" }}>
          Price (USD) <span className="text-white/40 normal-case tracking-normal">— set 0 for free</span>
        </label>
        <div className="flex items-center gap-2">
          <span className="text-white/50 text-sm" style={{ fontFamily: "JetBrains Mono, monospace" }}>$</span>
          <input type="number" min="0" step="0.01"
            value={t.price ?? 4.99}
            onChange={(e) => update("price", parseFloat(e.target.value) || 0)}
            className="flex-1 bg-black/40 text-white p-2 rounded outline-none border text-sm tabular-nums"
            style={{ borderColor: "rgba(255,255,255,0.1)", fontFamily: "JetBrains Mono, monospace" }} />
          {(t.price ?? 4.99) > 0 ? (
            <span className="text-[10px] tracking-widest px-2 py-1 rounded uppercase"
              style={{ background: "rgba(251, 191, 36, 0.15)", color: "#fbbf24", fontFamily: "JetBrains Mono, monospace" }}>
              <Crown size={10} className="inline mr-1" /> Premium
            </span>
          ) : (
            <span className="text-[10px] tracking-widest px-2 py-1 rounded uppercase"
              style={{ background: "rgba(52, 211, 153, 0.15)", color: "#34d399", fontFamily: "JetBrains Mono, monospace" }}>
              Free
            </span>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onCancel}
          className="px-3 py-1.5 rounded text-xs text-white/60 hover:text-white"
          style={{ fontFamily: "JetBrains Mono, monospace" }}>
          CANCEL
        </button>
        <button onClick={() => valid && onSave(t)} disabled={!valid}
          className="px-3 py-1.5 rounded text-xs"
          style={{
            background: valid ? "#fff" : "rgba(255,255,255,0.1)",
            color: valid ? "#0a0a0a" : "rgba(255,255,255,0.3)",
            fontFamily: "JetBrains Mono, monospace",
            cursor: valid ? "pointer" : "not-allowed",
          }}>
          SAVE
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Main App
// ============================================================
export default function WidgetStudio() {
  useBaseFonts();

  const [customTemplates, setCustomTemplates] = useState([]);
  const [templatesLoaded, setTemplatesLoaded] = useState(false);
  const [templateId, setTemplateId] = useState("tpl-anime");
  const [accent, setAccent] = useState("#ff6ec7");
  const [font, setFont] = useState("");
  const [nickname, setNickname] = useState("s1mple");
  const [copied, setCopied] = useState(false);
  const [animKey, setAnimKey] = useState(0);

  const [adminOpen, setAdminOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [unlockedIds, setUnlockedIds] = useState([]);
  const [paywallTemplate, setPaywallTemplate] = useState(null);

  // ====== User customization ======
  const DEFAULT_CUSTOMIZATION = {
    scale: 1.0,           // 0.7 - 1.4
    displayName: "",      // empty = use Faceit nickname
    showStats: true,      // right-side K/D + W/L block
    showEloChange: true,  // today's elo change badge
    animations: true,     // master animation toggle
    refreshSec: 30,       // 15, 30, 60, or 0 for manual only
    bgTint: 1.0,          // 0.1-1.0, multiplier on each design's overlay opacity
    winColor: "#22ff88",  // wins / positive elo change
    lossColor: "#ff4444", // losses / negative elo change
  };
  const [customization, setCustomization] = useState(DEFAULT_CUSTOMIZATION);
  const updateCustom = useCallback((patch) => {
    setCustomization((prev) => {
      const next = { ...prev, ...patch };
      window.storage?.set?.("user_customization", JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);
  const resetCustom = useCallback(() => {
    setCustomization(DEFAULT_CUSTOMIZATION);
    window.storage?.set?.("user_customization", JSON.stringify(DEFAULT_CUSTOMIZATION)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  useGoogleFont(font);

  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage?.get?.("admin_custom_templates");
        if (r?.value) {
          const parsed = JSON.parse(r.value);
          if (Array.isArray(parsed)) setCustomTemplates(parsed);
        }
        const a = await window.storage?.get?.("is_admin_mode");
        if (a?.value === "1") setIsAdmin(true);
        const u = await window.storage?.get?.("unlocked_template_ids");
        if (u?.value) {
          try {
            const ids = JSON.parse(u.value);
            if (Array.isArray(ids)) setUnlockedIds(ids);
          } catch {}
        }
        const c = await window.storage?.get?.("user_customization");
        if (c?.value) {
          try {
            const parsed = JSON.parse(c.value);
            if (parsed && typeof parsed === "object") {
              setCustomization({ ...DEFAULT_CUSTOMIZATION, ...parsed });
            }
          } catch {}
        }
      } catch {}
      setTemplatesLoaded(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveCustomTemplates = useCallback(async (next) => {
    setCustomTemplates(next);
    try {
      await window.storage?.set?.("admin_custom_templates", JSON.stringify(next));
    } catch {}
  }, []);

  const saveIsAdmin = useCallback(async (val) => {
    setIsAdmin(val);
    try { await window.storage?.set?.("is_admin_mode", val ? "1" : "0"); } catch {}
  }, []);

  const unlockTemplate = useCallback(async (id) => {
    setUnlockedIds((prev) => {
      const next = prev.includes(id) ? prev : [...prev, id];
      window.storage?.set?.("unlocked_template_ids", JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const clearUnlocks = useCallback(async () => {
    setUnlockedIds([]);
    try { await window.storage?.set?.("unlocked_template_ids", JSON.stringify([])); } catch {}
  }, []);

  const allTemplates = [...BUILTIN_TEMPLATES, ...customTemplates];

  // Whether a template requires payment for the current user
  const isLocked = useCallback((t) => {
    if (isAdmin) return false;
    if (t.builtin) return false;
    if ((t.price ?? 0) <= 0) return false;
    return !unlockedIds.includes(t.id);
  }, [isAdmin, unlockedIds]);

  const template = allTemplates.find((t) => t.id === templateId) || BUILTIN_TEMPLATES[0];
  const Component = DESIGN_COMPONENTS[template.design] || NeonPulse;

  useEffect(() => {
    setAccent(template.defaultAccent);
    setFont(template.defaultFont || "");
    setAnimKey((k) => k + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  const doFetch = useCallback(async () => {
    if (!FACEIT_API_KEY || !nickname) {
      setStats(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFaceitPlayer(nickname);
      setStats(data);
      setLastFetch(new Date());
    } catch (e) {
      setError(e.message || String(e));
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [nickname]);

  useEffect(() => {
    if (!templatesLoaded) return;
    const t = setTimeout(doFetch, 500);
    let interval = null;
    if (customization.refreshSec > 0) {
      interval = setInterval(doFetch, customization.refreshSec * 1000);
    }
    return () => { clearTimeout(t); if (interval) clearInterval(interval); };
  }, [doFetch, templatesLoaded, customization.refreshSec]);

  const rawData = stats || { ...mockData, nickname: nickname || "player" };
  // Apply display-name override (without changing the searched/fetched nickname)
  const data = customization.displayName?.trim()
    ? { ...rawData, nickname: customization.displayName.trim() }
    : rawData;
  const usingReal = !!stats;

  const embedUrl = (() => {
    const params = new URLSearchParams();
    // Emit resolved design + assets so the URL is self-contained and doesn't
    // require the widget renderer to look up template state from localStorage.
    params.set("design", template.design);
    params.set("accent", accent);
    if (template.mp4Url && !template.mp4Url.startsWith("blob:")) {
      params.set("bg", template.mp4Url);
    }
    if (font) params.set("font", font);
    if (customization.displayName?.trim()) params.set("name", customization.displayName.trim());
    if (customization.scale !== 1) params.set("scale", customization.scale.toFixed(2));
    if (!customization.showStats) params.set("stats", "0");
    if (!customization.showEloChange) params.set("elo_change", "0");
    if (!customization.animations) params.set("anim", "0");
    if (customization.refreshSec !== 30) params.set("refresh", String(customization.refreshSec));
    if (customization.bgTint !== 1) params.set("tint", customization.bgTint.toFixed(2));
    if (customization.winColor !== "#22ff88") params.set("win", customization.winColor);
    if (customization.lossColor !== "#ff4444") params.set("loss", customization.lossColor);
    // Use the current site's origin so the URL works wherever this is hosted
    const origin = typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "https://yourdomain.com";
    return `${origin}/widget/${encodeURIComponent(nickname)}?${params.toString()}`;
  })();

  const copy = () => {
    navigator.clipboard?.writeText(embedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className="min-h-screen w-full p-6 md:p-10"
      style={{
        background: "radial-gradient(ellipse at top left, #1a0033 0%, #050008 40%, #000 100%)",
        fontFamily: "Space Grotesk, sans-serif",
      }}>
      <style>{`
        @keyframes scan { 0% { transform: translateY(-100%); } 100% { transform: translateY(100%); } }
        @keyframes neonPulse { 0%,100% { filter: brightness(1); } 50% { filter: brightness(1.25); } }
        @keyframes pulseHalo { 0%,100% { transform: scale(1); opacity:.6; } 50% { transform: scale(1.15); opacity:.3; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes sparkle { 0%,100% { opacity:0; transform: scale(0.4); } 50% { opacity:1; transform: scale(1); } }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        @keyframes mp4spin { to { transform: rotate(360deg); } }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes blink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
        @keyframes animeFlow { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
        .anim-off, .anim-off *, .anim-off *::before, .anim-off *::after {
          animation: none !important;
          transition: none !important;
        }
      `}</style>

      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex items-baseline justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[10px] tracking-[0.5em] uppercase text-white/50"
              style={{ fontFamily: "JetBrains Mono, monospace" }}>
              Faceit · Stream Widgets · Free
            </div>
            <h1 className="text-white text-4xl md:text-5xl mt-1"
              style={{ fontFamily: "Bebas Neue, sans-serif", letterSpacing: "0.02em" }}>
              Pick a vibe. Make it yours.
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge usingReal={usingReal} loading={loading} error={error} hasKey={!!FACEIT_API_KEY} />
            {isAdmin && (
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] tracking-[0.3em]"
                style={{
                  background: "rgba(251, 191, 36, 0.15)",
                  border: "1px solid rgba(251, 191, 36, 0.4)",
                  color: "#fbbf24",
                  fontFamily: "JetBrains Mono, monospace",
                }}>
                <UserCog size={11} /> ADMIN
              </div>
            )}
            <button onClick={() => setAdminOpen(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-white/70 hover:text-white transition-colors"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                fontFamily: "JetBrains Mono, monospace",
              }}>
              <Settings size={13} /> SETTINGS
            </button>
          </div>
        </header>

        {/* Template Gallery */}
        <div className="mb-8">
          <div className="text-[10px] tracking-[0.3em] uppercase text-white/40 mb-3"
            style={{ fontFamily: "JetBrains Mono, monospace" }}>
            Templates · {allTemplates.length} available
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {allTemplates.map((t) => {
              const Icon = DESIGN_ICONS[t.design] || Square;
              const active = t.id === templateId;
              const locked = isLocked(t);
              const isPaid = !t.builtin && (t.price ?? 0) > 0;
              const isUnlocked = isPaid && !locked;
              return (
                <button key={t.id}
                  onClick={() => {
                    if (locked) {
                      setPaywallTemplate(t);
                    } else {
                      setTemplateId(t.id);
                    }
                  }}
                  className="group text-left p-4 transition-all relative overflow-hidden"
                  style={{
                    background: active ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)",
                    border: `1px solid ${active ? t.defaultAccent : "rgba(255,255,255,0.08)"}`,
                    boxShadow: active ? `0 0 0 1px ${t.defaultAccent}, 0 8px 32px ${t.defaultAccent}33` : "none",
                  }}>
                  {/* Locked overlay shimmer */}
                  {locked && (
                    <div className="absolute inset-0 pointer-events-none"
                      style={{
                        background: `linear-gradient(135deg, transparent 30%, ${t.defaultAccent}11 50%, transparent 70%)`,
                        backgroundSize: "200% 100%",
                        animation: "shimmer 4s ease-in-out infinite",
                      }} />
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    <Icon size={16} style={{ color: active ? t.defaultAccent : locked ? "#fff5" : "#fff8" }} />
                    <span className={`text-sm font-medium truncate ${locked ? "text-white/60" : "text-white"}`}
                      style={{ fontFamily: "Space Grotesk, sans-serif" }}>
                      {t.name}
                    </span>
                    {t.mp4Url && !locked && <Film size={11} className="text-emerald-400 ml-auto" />}
                    {locked && <Lock size={12} className="text-amber-400 ml-auto" />}
                  </div>
                  <p className="text-[11px] text-white/50 leading-relaxed">
                    {t.desc || `${t.design} design`}
                  </p>
                  {/* Top-right badges */}
                  <div className="absolute top-1.5 right-1.5 flex flex-col items-end gap-1">
                    {isPaid && !active && (
                      <span className="text-[8px] tracking-widest uppercase px-1.5 py-0.5 rounded flex items-center gap-1"
                        style={{
                          background: locked ? "rgba(251, 191, 36, 0.18)" : "rgba(52, 211, 153, 0.18)",
                          color: locked ? "#fbbf24" : "#34d399",
                          fontFamily: "JetBrains Mono, monospace",
                        }}>
                        <Crown size={8} />
                        {locked ? `$${t.price.toFixed(2)}` : "OWNED"}
                      </span>
                    )}
                    {!t.builtin && !isPaid && (
                      <span className="text-[8px] tracking-widest text-white/30 uppercase"
                        style={{ fontFamily: "JetBrains Mono, monospace" }}>
                        custom
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Preview */}
        <div className="relative rounded-2xl p-10 mb-6 overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #0a0a14 0%, #1a0a2e 100%)",
            border: "1px solid rgba(255,255,255,0.06)",
            minHeight: "260px",
          }}>
          <div className="absolute inset-0 opacity-30 pointer-events-none"
            style={{
              backgroundImage: "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }} />
          <div className="absolute top-3 left-4 text-[10px] tracking-[0.4em] text-white/40 uppercase"
            style={{ fontFamily: "JetBrains Mono, monospace" }}>
            ◉ OBS Preview · 440×140
          </div>
          {loading && (
            <div className="absolute top-3 right-4 flex items-center gap-1.5 text-[10px] tracking-[0.3em] text-white/60 uppercase"
              style={{ fontFamily: "JetBrains Mono, monospace" }}>
              <RefreshCw size={10} className="animate-spin" /> FETCHING
            </div>
          )}
          {error && !loading && (
            <div className="absolute top-3 right-4 flex items-center gap-1.5 text-[10px] tracking-[0.3em] text-red-300 uppercase max-w-[60%] truncate"
              style={{ fontFamily: "JetBrains Mono, monospace" }}>
              <AlertCircle size={10} /> {error}
            </div>
          )}
          <div className={`relative flex items-center justify-center ${customization.animations ? "" : "anim-off"}`}
            style={{ animation: customization.animations ? "float 6s ease-in-out infinite" : "none" }}>
            <div key={animKey}
              style={{
                width: 440 * customization.scale,
                height: 140 * customization.scale,
                position: "relative",
              }}>
              <div style={{
                position: "absolute",
                top: 0,
                left: 0,
                transform: `scale(${customization.scale})`,
                transformOrigin: "top left",
              }}>
                <Component data={data} accent={accent}
                  mp4Url={template.mp4Url} mp4Enabled={!!template.mp4Url}
                  customFont={font}
                  customization={customization} />
              </div>
            </div>
          </div>
          {!FACEIT_API_KEY && !loading && (
            <div className="text-center mt-4 text-[10px] tracking-[0.3em] text-amber-300/70 uppercase"
              style={{ fontFamily: "JetBrains Mono, monospace" }}>
              ◌ DEMO DATA · set FACEIT_API_KEY in source for live stats
            </div>
          )}
          {usingReal && lastFetch && !loading && (
            <div className="text-center mt-4 text-[10px] tracking-[0.3em] text-emerald-300/70 uppercase"
              style={{ fontFamily: "JetBrains Mono, monospace" }}>
              ● LIVE · updated {timeAgo(lastFetch)} ·{" "}
              {customization.refreshSec > 0 ? `refreshes ${customization.refreshSec}s` : "manual refresh"}
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 rounded-xl"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <label className="text-[10px] tracking-[0.3em] uppercase text-white/50 block mb-2"
              style={{ fontFamily: "JetBrains Mono, monospace" }}>
              Faceit Player
            </label>
            <NicknameSearch value={nickname} onChange={setNickname} accent={accent}
              onResolved={() => setAnimKey((k) => k + 1)} />
            <button onClick={() => { setAnimKey((k) => k + 1); doFetch(); }}
              className="mt-3 text-[10px] tracking-[0.3em] uppercase text-white/60 hover:text-white inline-flex items-center gap-1"
              style={{ fontFamily: "JetBrains Mono, monospace" }}>
              <RefreshCw size={10} /> Refresh now
            </button>
          </div>

          <div className="p-4 rounded-xl"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <label className="text-[10px] tracking-[0.3em] uppercase text-white/50 block mb-3"
              style={{ fontFamily: "JetBrains Mono, monospace" }}>
              Colors
            </label>

            {/* Accent — primary brand color, with curated swatches */}
            <div className="flex items-center gap-2 flex-wrap">
              {[template.defaultAccent, "#ff00ea", "#00ffea", "#fbbf24", "#84cc16", "#a78bfa", "#f472b6"].map((c, i) => (
                <button key={c + i}
                  onClick={() => setAccent(c)}
                  className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                  style={{
                    background: c,
                    boxShadow: accent === c ? `0 0 0 2px #000, 0 0 0 4px ${c}, 0 0 12px ${c}` : "none",
                  }}
                  aria-label={c} />
              ))}
              <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)}
                className="w-7 h-7 rounded-full bg-transparent cursor-pointer border-0"
                style={{ padding: 0 }} />
              <span className="text-[9px] tracking-[0.3em] uppercase text-white/50 ml-1 tabular-nums"
                style={{ fontFamily: "JetBrains Mono, monospace" }}>
                Accent · {accent.toUpperCase()}
              </span>
            </div>

            {/* Win / Loss — semantic colors */}
            <div className="mt-3 pt-3 grid grid-cols-2 gap-3"
              style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-2">
                <input type="color" value={customization.winColor}
                  onChange={(e) => updateCustom({ winColor: e.target.value })}
                  className="w-7 h-7 rounded-full bg-transparent cursor-pointer border-0 shrink-0"
                  style={{ padding: 0 }} />
                <div className="min-w-0">
                  <div className="text-[9px] tracking-[0.3em] uppercase text-white/50"
                    style={{ fontFamily: "JetBrains Mono, monospace" }}>Win</div>
                  <div className="text-[9px] text-white/40 tabular-nums"
                    style={{ fontFamily: "JetBrains Mono, monospace" }}>
                    {customization.winColor.toUpperCase()}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="color" value={customization.lossColor}
                  onChange={(e) => updateCustom({ lossColor: e.target.value })}
                  className="w-7 h-7 rounded-full bg-transparent cursor-pointer border-0 shrink-0"
                  style={{ padding: 0 }} />
                <div className="min-w-0">
                  <div className="text-[9px] tracking-[0.3em] uppercase text-white/50"
                    style={{ fontFamily: "JetBrains Mono, monospace" }}>Loss</div>
                  <div className="text-[9px] text-white/40 tabular-nums"
                    style={{ fontFamily: "JetBrains Mono, monospace" }}>
                    {customization.lossColor.toUpperCase()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <label className="text-[10px] tracking-[0.3em] uppercase text-white/50 block mb-3"
              style={{ fontFamily: "JetBrains Mono, monospace" }}>
              Font (Google Fonts)
            </label>
            <FontPicker value={font} onChange={setFont} accent={accent} />
            <p className="text-[10px] text-white/40 mt-2 leading-relaxed">
              Applies to nickname &amp; ELO. Background MP4 is set by template.
            </p>
          </div>
        </div>

        {/* ===== Second row: Display name / Scale / Refresh ===== */}
        <div className="grid md:grid-cols-3 gap-4 mb-4">
          {/* Display Name */}
          <div className="p-4 rounded-xl"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <label className="text-[10px] tracking-[0.3em] uppercase text-white/50 block mb-2"
              style={{ fontFamily: "JetBrains Mono, monospace" }}>
              Display Name
            </label>
            <input value={customization.displayName}
              onChange={(e) => updateCustom({ displayName: e.target.value })}
              placeholder={`use Faceit name (${rawData.nickname})`}
              className="w-full bg-transparent text-white text-base outline-none border-b pb-1 placeholder:text-white/20"
              style={{ fontFamily: "Space Grotesk, sans-serif", borderColor: accent }} />
            <div className="flex items-center justify-between mt-2">
              <p className="text-[10px] text-white/40 leading-relaxed">
                Override what's shown on stream
              </p>
              {customization.displayName && (
                <button onClick={() => updateCustom({ displayName: "" })}
                  className="text-[10px] tracking-[0.3em] uppercase text-white/60 hover:text-white"
                  style={{ fontFamily: "JetBrains Mono, monospace" }}>
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Scale */}
          <div className="p-4 rounded-xl"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex items-center justify-between mb-3">
              <label className="text-[10px] tracking-[0.3em] uppercase text-white/50"
                style={{ fontFamily: "JetBrains Mono, monospace" }}>
                Widget Scale
              </label>
              <span className="text-[10px] text-white/60 tabular-nums"
                style={{ fontFamily: "JetBrains Mono, monospace" }}>
                {Math.round(customization.scale * 100)}%
              </span>
            </div>
            <input type="range" min="0.7" max="1.4" step="0.05"
              value={customization.scale}
              onChange={(e) => updateCustom({ scale: parseFloat(e.target.value) })}
              className="w-full"
              style={{ accentColor: accent }} />
            <div className="flex justify-between text-[9px] text-white/30 mt-1 tracking-widest"
              style={{ fontFamily: "JetBrains Mono, monospace" }}>
              <span>70%</span><span>100%</span><span>140%</span>
            </div>
          </div>

          {/* Refresh */}
          <div className="p-4 rounded-xl"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <label className="text-[10px] tracking-[0.3em] uppercase text-white/50 block mb-3"
              style={{ fontFamily: "JetBrains Mono, monospace" }}>
              Refresh Rate
            </label>
            <div className="grid grid-cols-4 gap-1">
              {[
                { v: 15, l: "15s" },
                { v: 30, l: "30s" },
                { v: 60, l: "60s" },
                { v: 0,  l: "Off" },
              ].map((opt) => {
                const active = customization.refreshSec === opt.v;
                return (
                  <button key={opt.v}
                    onClick={() => updateCustom({ refreshSec: opt.v })}
                    className="px-2 py-1.5 text-xs transition-colors rounded"
                    style={{
                      background: active ? `${accent}33` : "rgba(255,255,255,0.04)",
                      color: active ? accent : "rgba(255,255,255,0.7)",
                      border: `1px solid ${active ? accent : "rgba(255,255,255,0.08)"}`,
                      fontFamily: "JetBrains Mono, monospace",
                    }}>
                    {opt.l}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-white/40 mt-2 leading-relaxed">
              How often Faceit stats re-fetch
            </p>
          </div>
        </div>

        {/* ===== Toggle strip: Stats / Elo Change / Animations + BG Tint ===== */}
        <div className="rounded-xl p-4 mb-6 flex items-center gap-3 flex-wrap"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <span className="text-[10px] tracking-[0.3em] uppercase text-white/40 shrink-0"
            style={{ fontFamily: "JetBrains Mono, monospace" }}>
            Display
          </span>

          {[
            { k: "showStats",     label: "Stats Panel" },
            { k: "showEloChange", label: "ELO Change" },
            { k: "animations",    label: "Animations" },
          ].map(({ k, label }) => {
            const on = customization[k];
            return (
              <button key={k}
                onClick={() => updateCustom({ [k]: !on })}
                className="px-3 py-1.5 rounded-full text-xs transition-colors flex items-center gap-1.5"
                style={{
                  background: on ? `${accent}22` : "rgba(255,255,255,0.04)",
                  color: on ? accent : "rgba(255,255,255,0.5)",
                  border: `1px solid ${on ? accent : "rgba(255,255,255,0.08)"}`,
                  fontFamily: "JetBrains Mono, monospace",
                }}>
                <span style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: on ? accent : "rgba(255,255,255,0.3)",
                  boxShadow: on ? `0 0 6px ${accent}` : "none",
                }} />
                {label}
              </button>
            );
          })}

          {template.mp4Url && (
            <div className="flex items-center gap-2 ml-2 pl-3"
              style={{ borderLeft: "1px solid rgba(255,255,255,0.08)" }}>
              <span className="text-[10px] tracking-[0.3em] uppercase text-white/40 shrink-0"
                style={{ fontFamily: "JetBrains Mono, monospace" }}>
                Video Tint
              </span>
              <input type="range" min="0.2" max="1" step="0.05"
                value={customization.bgTint}
                onChange={(e) => updateCustom({ bgTint: parseFloat(e.target.value) })}
                className="w-32" style={{ accentColor: accent }} />
              <span className="text-[10px] text-white/60 tabular-nums w-10 text-right"
                style={{ fontFamily: "JetBrains Mono, monospace" }}>
                {Math.round(customization.bgTint * 100)}%
              </span>
            </div>
          )}

          <button onClick={resetCustom}
            className="ml-auto text-[10px] tracking-[0.3em] uppercase text-white/50 hover:text-white shrink-0"
            style={{ fontFamily: "JetBrains Mono, monospace" }}>
            ↻ Reset
          </button>
        </div>

        <div className="rounded-xl p-4 flex items-center gap-3"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <span className="text-[10px] tracking-[0.3em] uppercase text-white/40 shrink-0"
            style={{ fontFamily: "JetBrains Mono, monospace" }}>
            OBS URL
          </span>
          <code className="flex-1 text-sm text-white/80 truncate"
            style={{ fontFamily: "JetBrains Mono, monospace" }}>
            {embedUrl}
          </code>
          <button onClick={copy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors"
            style={{
              background: copied ? `${accent}33` : "rgba(255,255,255,0.06)",
              color: copied ? accent : "#fff",
              border: `1px solid ${copied ? accent : "transparent"}`,
              fontFamily: "JetBrains Mono, monospace",
            }}>
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? "COPIED" : "COPY"}
          </button>
        </div>

        <div className="mt-8 text-[11px] text-white/30 leading-relaxed max-w-2xl"
          style={{ fontFamily: "JetBrains Mono, monospace" }}>
          // 100% free. Templates with MP4 backgrounds are admin-curated.<br />
          // Users pick a template, customize accent &amp; font · auto-refresh 30s.<br />
          // Player search powered by Faceit Data API.
        </div>
      </div>

      {adminOpen && (
        <AdminPanel onClose={() => setAdminOpen(false)}
          customTemplates={customTemplates}
          saveCustomTemplates={saveCustomTemplates}
          onTest={doFetch}
          status={{ usingReal, loading, error, lastFetch }}
          isAdmin={isAdmin}
          setIsAdmin={saveIsAdmin}
          unlockedIds={unlockedIds}
          clearUnlocks={clearUnlocks} />
      )}

      {paywallTemplate && (
        <Paywall
          template={paywallTemplate}
          onClose={() => setPaywallTemplate(null)}
          onUnlock={(id) => { unlockTemplate(id); setTemplateId(id); }} />
      )}
    </div>
  );
}
