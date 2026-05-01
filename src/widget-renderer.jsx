import React, { useEffect, useState, useCallback } from "react";
import {
  FACEIT_API_KEY,
  fetchFaceitPlayer,
  DESIGN_COMPONENTS,
  useBaseFonts,
  useGoogleFont,
} from "./widget-studio.jsx";

const FALLBACK = {
  nickname: "player",
  level: 1,
  elo: 0,
  kdr: 0,
  winRate: 0,
  wins: 0,
  losses: 0,
  todayMatches: 0,
  eloChange: 0,
  totalMatches: 0,
};

export default function WidgetRenderer() {
  useBaseFonts();

  // Read URL: /widget/<nickname>?design=...&accent=...&...
  const path = window.location.pathname;
  const nickname = decodeURIComponent(path.replace(/^\/widget\//, "").replace(/\/$/, ""));
  const params = new URLSearchParams(window.location.search);

  const design = params.get("design") || "neon";
  const accent = params.get("accent") || "#ff00ea";
  const bg = params.get("bg") || "";
  const font = params.get("font") || "";
  const displayName = params.get("name") || "";
  const scale = parseFloat(params.get("scale") || "1") || 1;
  const showStats = params.get("stats") !== "0";
  const showEloChange = params.get("elo_change") !== "0";
  const animations = params.get("anim") !== "0";
  const refreshSec = parseInt(params.get("refresh") ?? "30", 10);
  const bgTint = parseFloat(params.get("tint") || "1") || 1;
  const winColor = params.get("win") || "#22ff88";
  const lossColor = params.get("loss") || "#ff4444";

  useGoogleFont(font);

  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const doFetch = useCallback(async () => {
    if (!nickname || !FACEIT_API_KEY) return;
    setLoading(true);
    try {
      const data = await fetchFaceitPlayer(nickname);
      setStats(data);
      setError(null);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [nickname]);

  useEffect(() => {
    doFetch();
    if (refreshSec > 0) {
      const id = setInterval(doFetch, refreshSec * 1000);
      return () => clearInterval(id);
    }
  }, [doFetch, refreshSec]);

  // Make the page transparent for OBS browser source
  useEffect(() => {
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.overflow = "hidden";
  }, []);

  const Component = DESIGN_COMPONENTS[design] || DESIGN_COMPONENTS.neon;

  // Apply display name override
  const rawData = stats || FALLBACK;
  const data = displayName.trim()
    ? { ...rawData, nickname: displayName.trim() }
    : rawData;

  const customization = {
    showStats,
    showEloChange,
    animations,
    bgTint,
    winColor,
    lossColor,
  };

  // Inject animation killer when needed
  const animOffStyle = !animations ? `
    *, *::before, *::after {
      animation: none !important;
      transition: none !important;
    }
  ` : "";

  return (
    <>
      <style>{`
        @keyframes scan { 0% { transform: translateY(-100%); } 100% { transform: translateY(100%); } }
        @keyframes neonPulse { 0%,100% { filter: brightness(1); } 50% { filter: brightness(1.25); } }
        @keyframes pulseHalo { 0%,100% { transform: scale(1); opacity:.6; } 50% { transform: scale(1.15); opacity:.3; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes sparkle { 0%,100% { opacity:0; transform: scale(0.4); } 50% { opacity:1; transform: scale(1); } }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        @keyframes mp4spin { to { transform: rotate(360deg); } }
        @keyframes blink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
        @keyframes animeFlow { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
        ${animOffStyle}
      `}</style>

      {/* Show a tiny error indicator only on first failure, never block render */}
      {error && !stats && (
        <div style={{
          position: "fixed", top: 8, left: 8, padding: "6px 10px",
          background: "rgba(248, 113, 113, 0.95)", color: "#0a0a0a",
          fontFamily: "monospace", fontSize: 11, borderRadius: 4,
        }}>
          {error}
        </div>
      )}

      <div style={{
        width: 440 * scale,
        height: 140 * scale,
        position: "relative",
      }}>
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}>
          <Component
            data={data}
            accent={accent}
            mp4Url={bg}
            mp4Enabled={!!bg}
            customFont={font}
            customization={customization}
          />
        </div>
      </div>
    </>
  );
}
