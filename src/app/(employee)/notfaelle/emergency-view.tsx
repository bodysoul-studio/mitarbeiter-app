"use client";

import { useState } from "react";

type Guide = {
  id: string;
  title: string;
  solution: string;
  category: string;
  mediaUrls: string[];
};

function isVideo(url: string) {
  return /\.(mp4|webm|mov|avi)$/i.test(url);
}

export function EmergencyView({ guides }: { guides: Guide[] }) {
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = search.trim()
    ? guides.filter(
        (g) =>
          g.title.toLowerCase().includes(search.toLowerCase()) ||
          g.solution.toLowerCase().includes(search.toLowerCase()) ||
          g.category.toLowerCase().includes(search.toLowerCase())
      )
    : guides;

  const grouped = filtered.reduce<Record<string, Guide[]>>((acc, g) => {
    if (!acc[g.category]) acc[g.category] = [];
    acc[g.category].push(g);
    return acc;
  }, {});

  const categories = Object.keys(grouped).sort();

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <svg className="w-6 h-6 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <h1 className="text-xl font-bold">Notfälle</h1>
      </div>

      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Problem suchen..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 placeholder-slate-500"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <svg className="w-12 h-12 mx-auto mb-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
          </svg>
          <p>{search ? "Kein Eintrag gefunden" : "Noch keine Notfall-Einträge vorhanden"}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map((cat) => (
            <div key={cat}>
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">
                {cat}
              </h2>
              <div className="space-y-1.5">
                {grouped[cat].map((guide) => {
                  const isOpen = openId === guide.id;
                  return (
                    <div
                      key={guide.id}
                      className="w-full text-left bg-slate-800 border border-slate-700 rounded-xl overflow-hidden transition-colors hover:border-slate-600"
                    >
                      <button
                        onClick={() => setOpenId(isOpen ? null : guide.id)}
                        className="w-full flex items-center justify-between p-3.5"
                      >
                        <div className="flex items-center gap-2.5">
                          <svg
                            className="w-4 h-4 text-red-400 flex-shrink-0"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                          <span className="text-sm font-medium text-white">
                            {guide.title}
                          </span>
                          {guide.mediaUrls.length > 0 && (
                            <span className="text-xs text-slate-500">
                              {guide.mediaUrls.length} {guide.mediaUrls.length === 1 ? "Anhang" : "Anhänge"}
                            </span>
                          )}
                        </div>
                        <svg
                          className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {isOpen && (
                        <div className="px-3.5 pb-3.5 pt-0 space-y-3">
                          <div className="bg-slate-900/60 rounded-lg p-3 border-l-2 border-green-500">
                            <p className="text-xs font-semibold text-green-400 mb-1.5">Lösung:</p>
                            <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
                              {guide.solution}
                            </p>
                          </div>

                          {guide.mediaUrls.length > 0 && (
                            <div className="space-y-2">
                              {guide.mediaUrls.map((url, i) =>
                                isVideo(url) ? (
                                  <video
                                    key={i}
                                    src={url}
                                    controls
                                    playsInline
                                    className="w-full rounded-lg border border-slate-600"
                                  />
                                ) : (
                                  <img
                                    key={i}
                                    src={url}
                                    alt=""
                                    className="w-full rounded-lg border border-slate-600"
                                  />
                                )
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
