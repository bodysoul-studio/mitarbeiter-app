"use client";

import { useEffect, useState, useCallback } from "react";

type ShiftAssignment = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  notes: string | null;
  label?: string | null;
  templateId: string | null;
  roleId: string | null;
  template: { id: string; name: string; color: string } | null;
  role: { id: string; name: string; color: string | null } | null;
  swapOfferId?: string | null;
};

type Colleague = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  label: string | null;
  roleName: string;
  roleColor: string | null;
};

type SwapOffer = {
  id: string;
  shiftAssignment: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    template: { name: string; color: string } | null;
    role: { name: string } | null;
  };
  offeredBy: { id: string; name: string };
};

const DAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const DAY_LABELS_LONG = [
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
  "Sonntag",
];

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getWeekNumber(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function WeekView({
  employeeId,
  employeeName,
}: {
  employeeId: string;
  employeeName: string;
}) {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [shifts, setShifts] = useState<ShiftAssignment[]>([]);
  const [colleaguesByDate, setColleaguesByDate] = useState<Record<string, Colleague[]>>({});
  const [swapOffers, setSwapOffers] = useState<SwapOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekNum = getWeekNumber(weekStart);
  const weekEnd = addDays(weekStart, 6);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const ws = formatDate(weekStart);
      const [shiftsRes, swapsRes] = await Promise.all([
        fetch(`/api/shift-assignments/my?weekStart=${ws}`),
        fetch("/api/shift-swaps"),
      ]);
      const shiftsRaw = shiftsRes.ok ? await shiftsRes.json() : { assignments: [], colleaguesByDate: {} };
      const swapsData = swapsRes.ok ? await swapsRes.json() : [];
      // Support both old (array) and new ({assignments, colleaguesByDate}) response shapes
      if (Array.isArray(shiftsRaw)) {
        setShifts(shiftsRaw);
        setColleaguesByDate({});
      } else {
        setShifts(shiftsRaw.assignments || []);
        setColleaguesByDate(shiftsRaw.colleaguesByDate || {});
      }
      setSwapOffers(
        (swapsData as SwapOffer[]).filter((s) => s.offeredBy?.id !== employeeId)
      );
    } catch {
      setShifts([]);
      setColleaguesByDate({});
      setSwapOffers([]);
    }
    setLoading(false);
  }, [weekStart, employeeId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function prevWeek() {
    setWeekStart((prev) => addDays(prev, -7));
  }

  function nextWeek() {
    setWeekStart((prev) => addDays(prev, 7));
  }

  function getShiftForDate(dateStr: string) {
    return shifts.find((s) => s.date === dateStr);
  }

  async function offerSwap(shiftId: string) {
    setActionLoading(shiftId);
    await fetch("/api/shift-swaps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shiftAssignmentId: shiftId }),
    });
    await fetchData();
    setActionLoading(null);
  }

  async function withdrawSwap(swapOfferId: string) {
    setActionLoading(swapOfferId);
    await fetch(`/api/shift-swaps/${swapOfferId}`, {
      method: "DELETE",
    });
    await fetchData();
    setActionLoading(null);
  }

  async function acceptSwap(swapId: string) {
    setActionLoading(swapId);
    await fetch(`/api/shift-swaps/${swapId}/accept`, {
      method: "POST",
    });
    await fetchData();
    setActionLoading(null);
  }

  const fmtShort = (d: Date) =>
    `${d.getDate()}.${d.getMonth() + 1}.`;

  return (
    <div className="p-4 max-w-lg mx-auto">
      {/* Week navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={prevWeek}
          className="p-2 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 text-white transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <div className="text-center">
          <p className="text-white font-semibold text-lg">KW {weekNum}</p>
          <p className="text-sm text-slate-400">
            {fmtShort(weekStart)} – {fmtShort(weekEnd)}
          </p>
        </div>
        <button
          onClick={nextWeek}
          className="p-2 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 text-white transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>

      {loading ? (
        <p className="text-slate-400 text-center">Laden...</p>
      ) : (
        <>
          {/* My Schedule */}
          <div className="space-y-3 mb-8">
            {weekDates.map((d, i) => {
              const dateStr = formatDate(d);
              const shift = getShiftForDate(dateStr);
              return (
                <div
                  key={i}
                  className="bg-slate-800 border border-slate-700 rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-white font-medium">
                        {DAY_LABELS_LONG[i]}
                      </span>
                      <span className="text-slate-400 text-sm ml-2">
                        {fmtShort(d)}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">
                      {DAY_LABELS[i]}
                    </span>
                  </div>

                  {shift ? (
                    <div
                      className="rounded-lg p-3 mt-1"
                      style={{
                        borderLeft: `4px solid ${shift.template?.color || "#3b82f6"}`,
                        backgroundColor: `${shift.template?.color || "#3b82f6"}10`,
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium text-sm">
                            {shift.template?.name || "Schicht"}
                          </p>
                          <p className="text-slate-300 text-sm">
                            {shift.startTime} – {shift.endTime}
                          </p>
                          {shift.role && (
                            <p className="text-slate-400 text-xs mt-0.5">
                              {shift.role.name}
                            </p>
                          )}
                        </div>
                        <div>
                          {shift.swapOfferId ? (
                            <button
                              onClick={() => withdrawSwap(shift.swapOfferId!)}
                              disabled={actionLoading === shift.swapOfferId}
                              className="px-3 py-1.5 bg-orange-600/20 hover:bg-orange-600/40 text-orange-400 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                            >
                              {actionLoading === shift.swapOfferId
                                ? "..."
                                : "Tausch-Angebot zurückziehen"}
                            </button>
                          ) : (
                            <button
                              onClick={() => offerSwap(shift.id)}
                              disabled={actionLoading === shift.id}
                              className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                            >
                              {actionLoading === shift.id
                                ? "..."
                                : "Zum Tausch anbieten"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-500 text-sm mt-1">Frei</p>
                  )}

                  {/* Team working this day (including self) */}
                  {((shift) || (colleaguesByDate[dateStr] && colleaguesByDate[dateStr].length > 0)) && (
                    <div className="mt-3 pt-3 border-t border-slate-700/50">
                      <p className="text-xs text-slate-500 mb-2">Team an diesem Tag:</p>
                      <div className="space-y-1.5">
                        {/* Self first */}
                        {shift && (
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: shift.role?.color || "#3b82f6" }}
                              />
                              <span className="text-blue-400 font-semibold truncate">
                                Du ({employeeName})
                              </span>
                              <span className="text-slate-500 flex-shrink-0">
                                {shift.label || shift.role?.name}
                              </span>
                            </div>
                            <span className="text-slate-300 font-medium ml-2 flex-shrink-0">
                              {shift.startTime}–{shift.endTime}
                            </span>
                          </div>
                        )}

                        {/* Colleagues */}
                        {(colleaguesByDate[dateStr] || []).map((c, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: c.roleColor || "#6b7280" }}
                              />
                              <span className="text-slate-200 font-medium truncate">{c.name}</span>
                              <span className="text-slate-500 flex-shrink-0">
                                {c.label || c.roleName}
                              </span>
                            </div>
                            <span className="text-slate-400 ml-2 flex-shrink-0">
                              {c.startTime}–{c.endTime}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Tauschboerse */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-4">
              Verfügbare Schichten
            </h2>
            {swapOffers.length === 0 ? (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 text-center">
                <p className="text-slate-400 text-sm">
                  Keine Tausch-Angebote verfügbar.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {swapOffers.map((offer) => (
                  <div
                    key={offer.id}
                    className="bg-slate-800 border border-slate-700 rounded-xl p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {offer.shiftAssignment.template && (
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{
                                backgroundColor:
                                  offer.shiftAssignment.template.color,
                              }}
                            />
                          )}
                          <p className="text-white font-medium text-sm">
                            {offer.shiftAssignment.template?.name || "Schicht"}
                          </p>
                        </div>
                        <p className="text-slate-300 text-sm">
                          {offer.shiftAssignment.date} &middot;{" "}
                          {offer.shiftAssignment.startTime} –{" "}
                          {offer.shiftAssignment.endTime}
                        </p>
                        {offer.shiftAssignment.role && (
                          <p className="text-slate-400 text-xs">
                            {offer.shiftAssignment.role.name}
                          </p>
                        )}
                        <p className="text-slate-500 text-xs mt-1">
                          Angeboten von {offer.offeredBy.name}
                        </p>
                      </div>
                      <button
                        onClick={() => acceptSwap(offer.id)}
                        disabled={actionLoading === offer.id}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                      >
                        {actionLoading === offer.id
                          ? "..."
                          : "Übernehmen"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
