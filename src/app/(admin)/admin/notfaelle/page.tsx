"use client";

import { useEffect, useState, useRef } from "react";

type Guide = {
  id: string;
  title: string;
  solution: string;
  category: string;
  sortOrder: number;
  mediaUrls: string;
};

function parseMedia(raw: string): string[] {
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function isVideo(url: string) {
  return /\.(mp4|webm|mov|avi)$/i.test(url);
}

export default function NotfaellePage() {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);

  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [solution, setSolution] = useState("");
  const [category, setCategory] = useState("Allgemein");
  const [sortOrder, setSortOrder] = useState(0);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/admin/emergency-guides")
      .then((r) => r.json())
      .then((data: Guide[]) => {
        setGuides(data);
        setLoading(false);
      });
  }, []);

  function resetForm() {
    setEditId(null);
    setTitle("");
    setSolution("");
    setCategory("Allgemein");
    setSortOrder(0);
    setMediaUrls([]);
  }

  function startEdit(guide: Guide) {
    setEditId(guide.id);
    setTitle(guide.title);
    setSolution(guide.solution);
    setCategory(guide.category);
    setSortOrder(guide.sortOrder);
    setMediaUrls(parseMedia(guide.mediaUrls));
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newUrls: string[] = [];

    for (const file of Array.from(files)) {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (res.ok) {
        const { url } = await res.json();
        newUrls.push(url);
      }
    }

    setMediaUrls((prev) => [...prev, ...newUrls]);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  function removeMedia(url: string) {
    setMediaUrls((prev) => prev.filter((u) => u !== url));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const body = { title, solution, category, sortOrder, mediaUrls };

    if (editId) {
      const res = await fetch(`/api/admin/emergency-guides/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const updated = await res.json();
        setGuides((prev) => prev.map((g) => (g.id === editId ? updated : g)));
        resetForm();
      }
    } else {
      const res = await fetch("/api/admin/emergency-guides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const created = await res.json();
        setGuides((prev) => [...prev, created]);
        resetForm();
      }
    }

    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Eintrag wirklich löschen?")) return;
    const res = await fetch(`/api/admin/emergency-guides/${id}`, { method: "DELETE" });
    if (res.ok) {
      setGuides((prev) => prev.filter((g) => g.id !== id));
      if (editId === id) resetForm();
    }
  }

  const grouped = guides.reduce<Record<string, Guide[]>>((acc, g) => {
    if (!acc[g.category]) acc[g.category] = [];
    acc[g.category].push(g);
    return acc;
  }, {});

  const categories = Object.keys(grouped).sort();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Notfall-Handbuch</h1>

      <form
        onSubmit={handleSubmit}
        className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-6 space-y-3"
      >
        <h2 className="text-sm font-semibold text-slate-400">
          {editId ? "Eintrag bearbeiten" : "Neuer Eintrag"}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Problem (z.B. Mikro funktioniert nicht)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 sm:col-span-2"
          />
          <textarea
            placeholder="Lösung / Was tun? (Schritt für Schritt)"
            value={solution}
            onChange={(e) => setSolution(e.target.value)}
            required
            rows={4}
            className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 sm:col-span-2"
          />
          <input
            type="text"
            placeholder="Kategorie (z.B. Technik, Kursraum)"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          />
          <input
            type="number"
            placeholder="Reihenfolge"
            value={sortOrder}
            onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
            className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Media upload */}
        <div className="space-y-2">
          <label className="text-sm text-slate-400 font-medium">Bilder / Videos</label>
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleUpload}
              className="text-sm text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-slate-700 file:text-white hover:file:bg-slate-600"
            />
            {uploading && <span className="text-xs text-blue-400 animate-pulse">Hochladen...</span>}
          </div>

          {mediaUrls.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {mediaUrls.map((url, i) => (
                <div key={i} className="relative group">
                  {isVideo(url) ? (
                    <video
                      src={url}
                      className="w-24 h-24 object-cover rounded-lg border border-slate-600"
                    />
                  ) : (
                    <img
                      src={url}
                      alt=""
                      className="w-24 h-24 object-cover rounded-lg border border-slate-600"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => removeMedia(url)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving || uploading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            {saving ? "Speichern..." : editId ? "Aktualisieren" : "Hinzufügen"}
          </button>
          {editId && (
            <button
              type="button"
              onClick={resetForm}
              className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
            >
              Abbrechen
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <p className="text-slate-400">Laden...</p>
      ) : guides.length === 0 ? (
        <p className="text-slate-400">Noch keine Einträge vorhanden.</p>
      ) : (
        <div className="space-y-6">
          {categories.map((cat) => (
            <div key={cat}>
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">
                {cat}
              </h3>
              <div className="space-y-2">
                {grouped[cat].map((guide) => {
                  const media = parseMedia(guide.mediaUrls);
                  return (
                    <div
                      key={guide.id}
                      className="bg-slate-800 border border-slate-700 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h4 className="font-medium text-red-400 flex items-center gap-2">
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            {guide.title}
                          </h4>
                          <p className="text-sm text-slate-300 mt-2 whitespace-pre-line">
                            {guide.solution}
                          </p>

                          {media.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              {media.map((url, i) =>
                                isVideo(url) ? (
                                  <video
                                    key={i}
                                    src={url}
                                    controls
                                    className="w-32 h-24 object-cover rounded-lg border border-slate-600"
                                  />
                                ) : (
                                  <img
                                    key={i}
                                    src={url}
                                    alt=""
                                    className="w-32 h-24 object-cover rounded-lg border border-slate-600"
                                  />
                                )
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => startEdit(guide)}
                            className="px-3 py-1 text-sm bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 rounded transition-colors"
                          >
                            Bearbeiten
                          </button>
                          <button
                            onClick={() => handleDelete(guide.id)}
                            className="px-3 py-1 text-sm bg-red-600/20 text-red-400 hover:bg-red-600/40 rounded transition-colors"
                          >
                            Löschen
                          </button>
                        </div>
                      </div>
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
