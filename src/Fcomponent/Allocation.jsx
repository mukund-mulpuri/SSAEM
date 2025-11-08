// src/pages/Allocation.jsx
import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { runAllocation } from "../utils/allocation.js";
import { Store } from "../utils/store.js";
import { downloadSummary, downloadUnassigned } from "../utils/reports.js";
import "./Allocation.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function Allocation() {
  const navigate = useNavigate();
  const [ran, setRan] = useState(false);

  // hydrate subjects into Store if direct load
  useEffect(() => {
    (async () => {
      if ((Store.get().subjects || []).length) return;
      try {
        const res = await fetch(`${API}/api/subjects`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
        });
        const data = await res.json();
        if (Array.isArray(data)) {
          const mapped = data.map((s) => ({
            code: s.code,
            name: s.title || s.name || "",
            capacity: Number(s.capacity) || 0,
          }));
          const st = Store.get();
          Store.set({ ...st, subjects: mapped });
        }
      } catch (e) {
        console.warn("Auto-load subjects failed:", e?.message);
      }
    })();
  }, []);

  const { subjects = [], allotments = [] } = Store.get();

  // summary stats
  const stats = useMemo(() => {
    const byCode = {};
    (subjects || []).forEach(
      (s) => (byCode[s.code] = { name: s.name, cap: Number(s.capacity) || 0, used: 0 })
    );
    (allotments || []).forEach((a) => {
      if (a.status === "ALLOCATED" && a.subjectCode && byCode[a.subjectCode]) byCode[a.subjectCode].used++;
    });

    const rows = Object.entries(byCode).map(([code, v]) => ({
      code, name: v.name, capacity: v.cap, used: v.used,
      utilization: v.cap ? Math.round((v.used / v.cap) * 100) : 0,
    }));

    const unassigned = (allotments || []).filter((a) => a.status === "UNASSIGNED").length;
    const allocated = (allotments || []).filter((a) => a.status === "ALLOCATED").length;
    return { rows, unassigned, allocated };
  }, [subjects, allotments, ran]);

  function doRun() {
    const res = runAllocation();   // updates Store.allotments internally
    setRan(!ran);
    alert(
      `Allocation completed • ${res.filter((r) => r.status === "ALLOCATED").length} allocated, ${
        res.filter((r) => r.status === "UNASSIGNED").length
      } unassigned.`
    );
  }

  // 🔐 finalize -> persist to backend
  async function finalizeAndSave() {
    const st = Store.get();
    const all = st.allotments || [];
    const students = st.students || [];
    const subjectsMap = new Map((st.subjects || []).map(s => [s.code, s.name]));

    // choose a runId: YYYY-MM-semX  (adjust if you have session/semester variables)
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const runId = `${yyyy}-${mm}-sem`; // simple; replace with your session code if available

    const results = all
      .filter(a => a.status === "ALLOCATED")
      .map(a => {
        const stu = students.find(s => s.roll === a.roll) || {};
        const prefs = Array.isArray(stu.preferences) ? stu.preferences : [];
        const preferenceRank = Math.max(1, prefs.findIndex(c => c === a.subjectCode) + 1) || null;
        return {
          roll: a.roll,
          subjectCode: a.subjectCode,
          subjectName: subjectsMap.get(a.subjectCode) || "",
          cgpa: Number(stu.cgpa) || null,
          preferenceRank,
        };
      });

    if (!results.length) {
      alert("No allocations to save. Run allocation first.");
      return;
    }

    const res = await fetch(`${API}/api/allocations/runs/${encodeURIComponent(runId)}/finalize`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
      body: JSON.stringify({ name: `Allocation ${runId}`, results }),
    });

    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      alert("Failed to save allocations: " + (e?.error || res.statusText));
      return;
    }
    const data = await res.json();
    alert(`✅ Saved ${data.count} rows for run ${data.runId}`);
  }

  const canNext = (Store.get().allotments || []).length > 0;

  return (
    <div className="allocation-container">
      <h2 className="allocation-title" style={{color:'black'}}>Allocation (CGPA → Preference)</h2>

      <div className="allocation-actions">
        <button className="btn-blue" onClick={doRun}>▶ Start Allocation</button>
        <button className="btn" onClick={downloadSummary} style={{color:'white', backgroundColor:'blue'}}>⬇ Download Summary.csv</button>
        <button className="btn" onClick={downloadUnassigned} style={{color:'white', backgroundColor:'blue'}}>⬇ Download Unassigned.csv</button>
        <button className="btn" onClick={finalizeAndSave} style={{color:'white', backgroundColor:'green'}}>✅ Finalize & Save</button>
      </div>

      <div className="card allocation-summary" style={{backgroundColor:'white'}}>
        <h3 style={{color:'black'}}>Allocation Summary</h3>
        <p className="summary-counts" style={{color:'black'}}>
          <b>Allocated:</b> {stats.allocated} &nbsp; | &nbsp; <b>Unassigned:</b> {stats.unassigned}
        </p>

        <div className="table-wrapper" style={{color:'black'}}>
          <table className="allocation-table">
            <thead>
              <tr>
                <th>Code</th><th>Name</th><th>Capacity</th><th>Used</th><th>Utilization %</th>
              </tr>
            </thead>
            <tbody>
              {stats.rows.map((r) => (
                <tr key={r.code}>
                  <td>{r.code}</td><td>{r.name}</td><td>{r.capacity}</td><td>{r.used}</td><td>{r.utilization}</td>
                </tr>
              ))}
              {!stats.rows.length && (
                <tr>
                  <td colSpan="5" className="no-data" style={{color:'black'}}>
                    No subjects configured. Add subjects first.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="reminder" style={{color:'black'}}>
          <span className="badge" style={{color:'black'}}>Reminder</span> CSV preferences should exactly
          match Subject <b>Codes</b>. Capacity is enforced.
        </div>
      </div>

      <div className="nav-buttons" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
        <button className="btn" onClick={() => navigate("/faculty/upload")} style={{ padding: '8px 20px', color:'white', backgroundColor:'blue' }}>← Previous (Upload)</button>
        <button className="btn-blue" disabled={!canNext} onClick={() => navigate("/faculty/results")} style={{ padding: '8px 20px' }}>Next (Results) →</button>
      </div>

      {!canNext && <div className="warning-text">⚠ Run allocation once to continue to Results.</div>}
    </div>
  );
}
