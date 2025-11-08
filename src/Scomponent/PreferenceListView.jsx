// src/Scomponent/PreferenceListView.jsx
import React, { useMemo } from "react";
import "./PreferenceListView.css";

/**
 * props:
 *  - preferences: { [subjectId]: rank }
 *  - subjects:    [{ _id, code, title }, ...]
 *  - prefLabels:  { [subjectId]: "CODE — Title" }
 *  - loading:     boolean  // <-- NEW
 */
const PreferenceListView = ({ preferences = {}, subjects = [], prefLabels = {}, loading = false }) => {
  const byId = useMemo(() => {
    const m = new Map();
    (subjects || []).forEach((s) => {
      const id = String(s?._id ?? "");
      const code = s?.code || "";
      const title = s?.title || s?.name || "";
      const label = code && title ? `${code} — ${title}` : (code || title || id);
      if (id) m.set(id, label);
    });
    return m;
  }, [subjects]);

  const labelOf = (sid) => {
    const id = String(sid || "");
    if (!id) return "(Unknown Subject)";
    if (byId.has(id)) return byId.get(id);
    if (prefLabels && prefLabels[id]) return prefLabels[id];
    return id; // worst-case fallback
  };

  const rows = useMemo(() => {
    return Object.entries(preferences)
      .filter(([, r]) => !!r)
      .sort((a, b) => a[1] - b[1])
      .map(([sid, rank]) => ({ sid, rank, label: labelOf(sid) }));
  }, [preferences, labelOf]);

  return (
    <div className="preference-list-container">
      <h3 className="subtitle" style={{ marginBottom: 8 }}>Your Submitted Preferences</h3>

      {loading && !subjects.length ? (
        <p className="no-preference">Loading subjects…</p>
      ) : !rows.length ? (
        <p className="no-preference">No preferences selected.</p>
      ) : (
        <table className="preference-list-table">
          <thead>
            <tr>
              <th>Preference Rank</th>
              <th>Elective Subject</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.sid}-${r.rank}`}>
                <td>{r.rank}</td>
                <td>{r.label}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default PreferenceListView;
