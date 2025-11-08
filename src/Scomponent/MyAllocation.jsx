// src/pages/Student/MyAllocation.jsx
import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function MyAllocation() {
  const [state, setState] = useState({ loading: true, runId: null, allocation: null, error: "" });

  useEffect(() => {
    const roll = localStorage.getItem("roll") || localStorage.getItem("studentRoll") || "";
    if (!roll) {
      setState({ loading: false, runId: null, allocation: null, error: "Roll not found in session." });
      return;
    }
    fetch(`${API}/api/allocations/students/${encodeURIComponent(roll)}/allocation`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
    })
      .then((r) => r.json())
      .then((data) => setState({ loading: false, runId: data.runId, allocation: data.allocation, error: "" }))
      .catch((e) => setState({ loading: false, runId: null, allocation: null, error: e?.message || "Error" }));
  }, []);

  if (state.loading) return <div style={{ padding: 16 }}>Loading…</div>;
  if (state.error) return <div style={{ padding: 16, color: "crimson" }}>{state.error}</div>;
  if (!state.allocation) return <div style={{ padding: 16 }}>No allocation published yet.</div>;

  const a = state.allocation;
  return (
    <div style={{ padding: 16 }}>
      <h2>My Allocation — {state.runId}</h2>
      <p><b>Subject:</b> {a.subjectCode} — {a.subjectName}</p>
      {a.preferenceRank != null && <p><b>Satisfied Preference:</b> {a.preferenceRank}</p>}
      {a.cgpa != null && <p><b>CGPA (snapshot):</b> {a.cgpa}</p>}
      <p><i>Saved at:</i> {new Date(a.updatedAt || a.createdAt || Date.now()).toLocaleString()}</p>
    </div>
  );
}
