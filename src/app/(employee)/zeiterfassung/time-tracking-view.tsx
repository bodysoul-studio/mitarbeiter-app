"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

type PauseRecord = {
  id: string;
  pauseStart: string;
  pauseEnd: string | null;
};

type TimeRecord = {
  id: string;
  clockIn: string;
  clockOut: string | null;
  pauses: PauseRecord[];
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function calcPauseMs(pauses: PauseRecord[]): number {
  let totalMs = 0;
  for (const p of pauses) {
    const start = new Date(p.pauseStart).getTime();
    const end = p.pauseEnd ? new Date(p.pauseEnd).getTime() : Date.now();
    totalMs += end - start;
  }
  return totalMs;
}

function calcWorkTime(records: TimeRecord[]): { work: string; pause: string } {
  let totalWorkMs = 0;
  let totalPauseMs = 0;
  for (const r of records) {
    const start = new Date(r.clockIn).getTime();
    const end = r.clockOut ? new Date(r.clockOut).getTime() : Date.now();
    const pauseMs = calcPauseMs(r.pauses);
    totalPauseMs += pauseMs;
    totalWorkMs += end - start - pauseMs;
  }
  const fmtMs = (ms: number) => {
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    return `${h}h ${m.toString().padStart(2, "0")}min`;
  };
  return { work: fmtMs(totalWorkMs), pause: fmtMs(totalPauseMs) };
}

export function TimeTrackingView({
  records: initialRecords,
  employeeId,
  hasOpenRecord: initialOpen,
  hasOpenPause: initialPause,
}: {
  records: TimeRecord[];
  employeeId: string;
  hasOpenRecord: boolean;
  hasOpenPause: boolean;
}) {
  const router = useRouter();
  const [records, setRecords] = useState(initialRecords);
  const [hasOpen, setHasOpen] = useState(initialOpen);
  const [onPause, setOnPause] = useState(initialPause);
  const [wifiAllowed, setWifiAllowed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const update = () =>
      setCurrentTime(
        new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
      );
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function checkWifi() {
      try {
        const res = await fetch("/api/time-tracking/wifi-check");
        const data = await res.json();
        setWifiAllowed(data.allowed);
      } catch {
        setWifiAllowed(false);
      }
    }
    checkWifi();
    const interval = setInterval(checkWifi, 30_000);
    return () => clearInterval(interval);
  }, []);

  const handleClockIn = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/time-tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Einstempeln fehlgeschlagen");
        return;
      }
      const data = await res.json();
      setRecords((prev) => [...prev, { id: data.id, clockIn: data.clockIn, clockOut: null, pauses: [] }]);
      setHasOpen(true);
      router.refresh();
    } catch {
      alert("Verbindungsfehler");
    } finally {
      setLoading(false);
    }
  }, [employeeId, router]);

  const handleClockOut = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/time-tracking/clock-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Ausstempeln fehlgeschlagen");
        return;
      }
      const data = await res.json();
      setRecords((prev) =>
        prev.map((r) => (r.id === data.id ? { ...r, clockOut: data.clockOut } : r))
      );
      setHasOpen(false);
      setOnPause(false);
      router.refresh();
    } catch {
      alert("Verbindungsfehler");
    } finally {
      setLoading(false);
    }
  }, [employeeId, router]);

  const handlePauseStart = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/time-tracking/pause", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Pause starten fehlgeschlagen");
        return;
      }
      const data = await res.json();
      setRecords((prev) =>
        prev.map((r) =>
          !r.clockOut
            ? { ...r, pauses: [...r.pauses, { id: data.id, pauseStart: data.pauseStart, pauseEnd: null }] }
            : r
        )
      );
      setOnPause(true);
      router.refresh();
    } catch {
      alert("Verbindungsfehler");
    } finally {
      setLoading(false);
    }
  }, [employeeId, router]);

  const handlePauseEnd = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/time-tracking/pause-end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Pause beenden fehlgeschlagen");
        return;
      }
      const data = await res.json();
      setRecords((prev) =>
        prev.map((r) =>
          !r.clockOut
            ? {
                ...r,
                pauses: r.pauses.map((p) =>
                  p.id === data.id ? { ...p, pauseEnd: data.pauseEnd } : p
                ),
              }
            : r
        )
      );
      setOnPause(false);
      router.refresh();
    } catch {
      alert("Verbindungsfehler");
    } finally {
      setLoading(false);
    }
  }, [employeeId, router]);

  const { work, pause } = calcWorkTime(records);

  return (
    <div className="p-4 max-w-lg mx-auto space-y-6">
      <h1 className="text-xl font-bold">Zeiterfassung</h1>

      {/* Clock */}
      <div className="text-center">
        <p className="text-5xl font-mono font-bold text-white">{currentTime || "\u00A0"}</p>
        {onPause && (
          <p className="text-amber-400 text-sm mt-2 animate-pulse">In Pause</p>
        )}
      </div>

      {/* WiFi Status */}
      <div className="flex items-center justify-center gap-2">
        <div
          className={`w-3 h-3 rounded-full ${
            wifiAllowed === null
              ? "bg-slate-500 animate-pulse"
              : wifiAllowed
              ? "bg-green-500"
              : "bg-red-500"
          }`}
        />
        <span className="text-sm text-slate-400">
          {wifiAllowed === null
            ? "WiFi wird geprüft..."
            : wifiAllowed
            ? "Im Firmennetzwerk"
            : "Nicht im Firmennetzwerk"}
        </span>
      </div>

      {/* Main action buttons */}
      <div className="flex flex-col items-center gap-4">
        {!hasOpen ? (
          <button
            onClick={handleClockIn}
            disabled={loading || wifiAllowed === false}
            className="w-40 h-40 rounded-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold text-lg transition-colors flex items-center justify-center shadow-lg shadow-blue-900/30"
          >
            {loading ? "..." : "Einstempeln"}
          </button>
        ) : onPause ? (
          <button
            onClick={handlePauseEnd}
            disabled={loading}
            className="w-40 h-40 rounded-full bg-green-600 hover:bg-green-700 disabled:bg-slate-700 text-white font-bold text-lg transition-colors flex items-center justify-center shadow-lg shadow-green-900/30"
          >
            {loading ? "..." : "Weiter\narbeiten"}
          </button>
        ) : (
          <button
            onClick={handleClockOut}
            disabled={loading}
            className="w-40 h-40 rounded-full bg-red-600 hover:bg-red-700 disabled:bg-slate-700 text-white font-bold text-lg transition-colors flex items-center justify-center shadow-lg shadow-red-900/30"
          >
            {loading ? "..." : "Ausstempeln"}
          </button>
        )}

        {/* Pause button (only visible when clocked in and not on pause) */}
        {hasOpen && !onPause && (
          <button
            onClick={handlePauseStart}
            disabled={loading}
            className="px-6 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-700 rounded-lg text-white font-medium transition-colors"
          >
            Pause machen
          </button>
        )}
      </div>

      {/* Today's records */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-300">Heute</h2>
          <div className="text-right">
            <span className="text-sm text-blue-400 font-medium">{work}</span>
            {pause !== "0h 00min" && (
              <span className="text-sm text-amber-400 ml-2">({pause} Pause)</span>
            )}
          </div>
        </div>

        {records.length === 0 && (
          <p className="text-slate-500 text-sm">Noch keine Einträge heute</p>
        )}

        {records.map((r) => (
          <div
            key={r.id}
            className="bg-slate-800 border border-slate-700 rounded-xl p-3 space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14" />
                </svg>
                <span className="text-white">{formatTime(r.clockIn)}</span>
              </div>
              <div className="flex items-center gap-2">
                {r.clockOut ? (
                  <>
                    <span className="text-white">{formatTime(r.clockOut)}</span>
                    <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16l4-4m0 0l-4-4m4 4H3" />
                    </svg>
                  </>
                ) : (
                  <span className="text-sm text-amber-400 animate-pulse">Aktiv</span>
                )}
              </div>
            </div>

            {/* Pausen anzeigen */}
            {r.pauses.length > 0 && (
              <div className="pl-6 space-y-1">
                {r.pauses.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 text-sm text-slate-400">
                    <svg className="w-3 h-3 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>
                      Pause: {formatTime(p.pauseStart)}
                      {p.pauseEnd ? ` – ${formatTime(p.pauseEnd)}` : " (läuft)"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
