// src/pages/Results.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Store } from "../utils/store.js";
import { reassign } from "../utils/allocation.js";
import "./Results.css";

export default function Results() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [activeRoll, setActiveRoll] = useState("");
  const [toSubject, setToSubject] = useState("");
  const [reason, setReason] = useState("");

  // 🔎 Build lookups for name-based filtering
  function getLookups() {
    const { students = [], subjects = [] } = Store.get();
    return {
      stuMap: new Map(students.map((s) => [s.roll, s])),
      subMap: new Map(subjects.map((s) => [s.code, s])),
    };
  }

  function matchesAny(a, q, stuMap, subMap) {
    if (!q) return true;
    const s = (q || "").toLowerCase().trim();
    if (!s) return true;

    const stu = stuMap.get(a.roll) || {};
    const sub = subMap.get(a.subjectCode) || {};

    const haystack = [
      a.roll,
      stu.name,
      (stu.cgpa ?? "").toString(),
      a.subjectCode,
      sub.name,
      a.status,
      a.rankGiven?.toString(),
      a.reason,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(s);
  }

  function load() {
    const { allotments = [] } = Store.get();
    const { stuMap, subMap } = getLookups();
    const filtered = allotments.filter((a) =>
      matchesAny(a, query, stuMap, subMap)
    );
    const paged = filtered.slice((page - 1) * 20, page * 20);
    setRows(paged);
  }

  useEffect(() => {
    load();
  }, [page, query]);

  const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

async function finalizeAndSave() {
  const st = Store.get();
  const all = st.allotments || [];
  const students = st.students || [];
  const subjectsMap = new Map((st.subjects || []).map(s => [s.code, s.name]));

  // create a runId like YYYY-MM-semX (adjust as needed)
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const runId = `${yyyy}-${mm}-sem`; // replace with your session code if you have it

  const results = all
    .filter(a => a.status === "ALLOCATED")
    .map(a => {
      const stu = students.find(s => s.roll === a.roll) || {};
      const prefs = Array.isArray(stu.preferences) ? stu.preferences : [];
      // use stored rank if present (rankGiven), else compute
      const computed = Math.max(1, prefs.findIndex(c => c === a.subjectCode) + 1) || null;
      const preferenceRank = a.rankGiven ?? computed ?? null;
      console.log("Finalize payload size:", results.length, results.slice(0,3));
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

  function openReassign(roll) {
    setActiveRoll(roll);
    setToSubject("");
    setReason("");
    setOpen(true);
  }

  function doReassign() {
    try {
      reassign(activeRoll, toSubject, reason);
      setOpen(false);
      load();
      alert("Reassigned successfully.");
    } catch (e) {
      alert(e.message);
    }
  }

  const canPrev = page > 1;
  const canNext = rows.length === 20;

  function downloadAllocatedExcel() {
    const { allotments = [], students = [], subjects = [] } = Store.get();
    const allocated = allotments.filter((a) => a.status === "ALLOCATED");
    if (!allocated.length) return alert("No allocated records to export.");

    const stuMap = new Map(students.map((s) => [s.roll, s]));
    const subMap = new Map(subjects.map((s) => [s.code, s]));

    const head = `
      <tr>
        <th>Roll</th><th>Name</th><th>CGPA</th>
        <th>Subject Code</th><th>Subject Name</th><th>Preference Rank</th>
      </tr>`;

    const esc = (v) =>
      String(v == null ? "" : v)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    const body = allocated
      .map((a) => {
        const s = stuMap.get(a.roll) || {};
        const sub = subMap.get(a.subjectCode) || {};
        return `
        <tr>
          <td>${esc(a.roll)}</td>
          <td>${esc(s.name || "")}</td>
          <td>${esc(s.cgpa ?? "")}</td>
          <td>${esc(a.subjectCode)}</td>
          <td>${esc(sub.name || "")}</td>
          <td>${esc(a.rankGiven || "")}</td>
        </tr>`;
      })
      .join("");

    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:x="urn:schemas-microsoft-com:office:excel"
            xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8" /></head>
      <body><table border="1">${head}${body}</table></body></html>`;

    const blob = new Blob([html], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Allocated.xls";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="results-container">
      <h2 className="results-title">Results</h2>

      {/* Search + Controls */}
      <div className="results-controls">
        <input
          className="input-field search"
          placeholder="Search..."
          value={query}
          onChange={(e) => {
            setPage(1);
            setQuery(e.target.value);
          }}
        />
        <button className="btn" onClick={() => { setQuery(""); setPage(1); }} style={{color:'black'}}>Clear</button>

        <div className="pager">
          <button className="btn" disabled={!canPrev} onClick={() => setPage(p => p - 1)} style={{color:'black'}}>Prev</button>
          <span>Page {page}</span>
          <button className="btn" disabled={!canNext} onClick={() => setPage(p => p + 1)} style={{color:'black'}}>Next</button>
        </div>

        <button className="btn-blue" onClick={downloadAllocatedExcel}>
          ⬇ Download Allocated (Excel)
        </button>
      </div>

      {/* Table */}
      <div className="card table-card" style={{backgroundColor:'white'}}>
        <table className="results-table">
          <thead style={{fontSize:'15px', border:'5px'}}>
            <tr>
              <th>Roll</th><th>Subject</th><th>Status</th>
              <th>Pref#</th><th>Reason</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>{r.roll}</td>
                <td>{r.subjectCode || "-"}</td>
                <td>{r.status}</td>
                <td>{r.rankGiven || "-"}</td>
                <td>{r.reason || "-"}</td>
                <td>
                  <button className="btn-bluesmall" onClick={() => openReassign(r.roll)} style={{color:'black',backgroundColor:'white'}}>
                    Reassign
                  </button>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan="6" className="no-data">No data. Run allocation first.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Reassign Modal */}
      {open && (
        <div className="modal-overlay">
          <div className="card modal-card">
            <h3>Reassign • {activeRoll}</h3>
            <label>Target Subject Code</label>
            <input
              className="input-field"
              value={toSubject}
              onChange={(e) => setToSubject(e.target.value)}
              placeholder="e.g., IAI"
            />
            <label>Reason</label>
            <textarea
              className="input-field"
              rows="3"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Seat balancing or other reason"
            />
            <div className="modal-buttons">
              <button className="btn" onClick={() => setOpen(false)}>Cancel</button>
              <button className="btn-blue" onClick={doReassign}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="nav-buttons" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
        <button 
          className="btn" 
          onClick={() => navigate("/faculty/allocation")}
          style={{ padding: '8px 20px' }}
        >
          ← Previous (Allocation)
        </button>
        <button 
          className="btn-blue" 
          onClick={() => window.location.reload()}
          style={{ padding: '8px 20px' }}
        >
          ↻ Refresh Results
        </button>
      </div>
    </div>
  );
}