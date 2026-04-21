"use client";

import { useEffect, useState, useRef } from "react";

type Notification = {
  id: string;
  type: string;
  message: string;
  meta: string | null;
  read: boolean;
  createdAt: string;
};

export function AdminNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [popupFor, setPopupFor] = useState<Notification | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());

  async function fetchNotifications() {
    try {
      const res = await fetch("/api/admin/notifications");
      if (res.ok) {
        const data: Notification[] = await res.json();
        setNotifications(data);

        // Check for new unread notifications to trigger popup
        const newUnread = data.find(
          (n) => !n.read && !seenIdsRef.current.has(n.id)
        );
        if (newUnread && seenIdsRef.current.size > 0) {
          // Only show popup for notifications arrived AFTER first load
          setPopupFor(newUnread);
        }
        data.forEach((n) => seenIdsRef.current.add(n.id));
      }
    } catch {}
  }

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  async function markAsRead(ids?: string[]) {
    await fetch("/api/admin/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: ids || [] }),
    });
    setNotifications((prev) =>
      prev.map((n) => (!ids || ids.includes(n.id) ? { ...n, read: true } : n))
    );
  }

  function fmtTime(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "gerade eben";
    if (minutes < 60) return `vor ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `vor ${hours} h`;
    return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <>
      {/* Popup for new notification */}
      {popupFor && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4" onClick={() => { markAsRead([popupFor.id]); setPopupFor(null); }}>
          <div className="bg-slate-800 border border-orange-500/50 rounded-xl p-6 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold mb-1">Schicht wurde getauscht</h3>
                <p className="text-sm text-slate-300">{popupFor.message}</p>
              </div>
            </div>
            <button
              onClick={() => { markAsRead([popupFor.id]); setPopupFor(null); }}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Bell icon with badge */}
      <div className="fixed top-4 right-4 z-40" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="relative p-2 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 text-white transition-colors"
          aria-label="Benachrichtigungen"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[11px] font-bold flex items-center justify-center text-white">
              {unreadCount}
            </span>
          )}
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 top-full mt-2 w-96 max-w-[calc(100vw-2rem)] bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
              <h3 className="font-semibold text-sm text-white">Benachrichtigungen</h3>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAsRead()}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Alle gelesen
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6">Keine Benachrichtigungen</p>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => markAsRead([n.id])}
                    className={`p-3 border-b border-slate-700/50 cursor-pointer hover:bg-slate-700/30 ${
                      !n.read ? "bg-blue-500/5" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.read && <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white">{n.message}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{fmtTime(n.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
