import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api, type Platform } from "../api/client";

export default function PlatformsPage() {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [color, setColor] = useState("#1a1a1a");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { platforms } = await api<{ platforms: Platform[] }>("/platforms");
    setPlatforms(platforms);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const { platform } = await api<{ platform: Platform }>("/platforms", {
      method: "POST",
      body: JSON.stringify({ name, url, color }),
    });
    setPlatforms((prev) => [...prev, platform]);
    setName("");
    setUrl("");
  }

  async function remove(id: number) {
    if (!confirm("Delete this platform? Linked activities will be unlinked.")) return;
    await api(`/platforms/${id}`, { method: "DELETE" });
    setPlatforms((prev) => prev.filter((p) => p.id !== id));
  }

  if (loading) return <p className="page-loading">Loading platforms…</p>;

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">Platforms</h1>
        <p className="page-desc">
          Organize activities by where you learn — LeetCode, GitHub, Coursera, and more.
        </p>
      </header>

      <section className="card form-card">
        <h2>Add platform</h2>
        <form onSubmit={handleAdd} className="inline-form">
          <label>
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. LeetCode"
              required
            />
          </label>
          <label>
            URL
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
            />
          </label>
          <label>
            Color
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
          </label>
          <button type="submit" className="btn btn-primary">
            Add platform
          </button>
        </form>
      </section>

      <section className="card">
        <h2>Your platforms ({platforms.length})</h2>
        {platforms.length === 0 ? (
          <p className="muted">No platforms yet.</p>
        ) : (
          <ul className="item-list">
            {platforms.map((p) => (
              <li key={p.id} className="item-row">
                <span className="activity-dot" style={{ background: p.color }} />
                <div className="item-body">
                  <strong>{p.name}</strong>
                  {p.url && (
                    <a href={p.url} target="_blank" rel="noreferrer" className="platform-link">
                      {p.url.replace(/^https?:\/\//, "")}
                    </a>
                  )}
                  <span className="muted">
                    {p.activity_count ?? 0} activit{(p.activity_count ?? 0) === 1 ? "y" : "ies"}
                  </span>
                </div>
                <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(p.id)}>
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
