import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api, type Activity, type Platform } from "../api/client";

const COLORS = [
  "#1a1a1a",
  "#3776ab",
  "#ff6f00",
  "#2e7d32",
  "#6a1b9a",
  "#1565c0",
  "#c62828",
  "#455a64",
  "#ffa116",
];

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [platformId, setPlatformId] = useState<string>("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [a, p] = await Promise.all([
      api<{ activities: Activity[] }>("/activities"),
      api<{ platforms: Platform[] }>("/platforms"),
    ]);
    setActivities(a.activities);
    setPlatforms(p.platforms);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError("");
    try {
      const { activity } = await api<{ activity: Activity }>("/activities", {
        method: "POST",
        body: JSON.stringify({
          name,
          description,
          color,
          platformId: platformId ? Number(platformId) : null,
        }),
      });
      setActivities((prev) => [...prev, activity]);
      setName("");
      setDescription("");
      setPlatformId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add");
    }
  }

  async function remove(id: number) {
    if (!confirm("Delete this activity? Past logs will be removed too.")) return;
    await api(`/activities/${id}`, { method: "DELETE" });
    setActivities((prev) => prev.filter((a) => a.id !== id));
  }

  if (loading) return <p className="page-loading">Loading activities…</p>;

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">Activities</h1>
        <p className="page-desc">Add habits and learning tasks to track daily.</p>
      </header>

      <section className="card form-card">
        <h2>Add activity</h2>
        <form onSubmit={handleAdd} className="inline-form">
          {error && <p className="form-error">{error}</p>}
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            Description
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
            />
          </label>
          <label>
            Platform
            <select value={platformId} onChange={(e) => setPlatformId(e.target.value)}>
              <option value="">None</option>
              {platforms.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Color
            <div className="color-picker">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={color === c ? "color-swatch active" : "color-swatch"}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </label>
          <button type="submit" className="btn btn-primary">
            Add activity
          </button>
        </form>
      </section>

      <section className="card">
        <h2>Your activities ({activities.length})</h2>
        {activities.length === 0 ? (
          <p className="muted">No activities yet. Add one above or use defaults from registration.</p>
        ) : (
          <ul className="item-list">
            {activities.map((a) => (
              <li key={a.id} className="item-row">
                <span className="activity-dot" style={{ background: a.color }} />
                <div className="item-body">
                  <strong>{a.name}</strong>
                  {a.description && <span className="muted"> — {a.description}</span>}
                  {a.platform_name && (
                    <span className="tag" style={{ borderColor: a.platform_color ?? "#ccc" }}>
                      {a.platform_name}
                    </span>
                  )}
                </div>
                <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(a.id)}>
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
