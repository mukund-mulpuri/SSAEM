// src/pages/AdminBulkUpload.jsx
import React, { useState, useRef } from "react";
const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function AdminBulkUpload() {
  // Students
  const [stFile, setStFile] = useState(null);
  const [stBusy, setStBusy] = useState(false);
  const [stSummary, setStSummary] = useState(null);
  const [stError, setStError] = useState("");
  const stInputRef = useRef(null);

  // Faculty
  const [faFile, setFaFile] = useState(null);
  const [faBusy, setFaBusy] = useState(false);
  const [faSummary, setFaSummary] = useState(null);
  const [faError, setFaError] = useState("");
  const faInputRef = useRef(null);

  function downloadStudentTemplate() {
    const rows = [
      "email,name,password,regNo,year,semester,branch",
      "231fa04a55@gmail.com,CSE_Student1,Pass1234,231FA04A55,2,4,CSE",
    ].join("\n");
    const blob = new Blob([rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "students_template.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  function downloadFacultyTemplate() {
    const rows = [
      "email,name,password,department",
      "faculty1@college.edu,Dr Sharma,TeachPass1,CSE",
    ].join("\n");
    const blob = new Blob([rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "faculty_template.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  async function uploadStudents(e) {
    e.preventDefault();
    setStError(""); setStSummary(null);
    if (!stFile) return setStError("Choose a CSV file first.");
    try {
      setStBusy(true);
      const fd = new FormData();
      fd.append("file", stFile, stFile.name);
      const res = await fetch(`${API}/api/admin/bulk-students`, {
        method: "POST",
        headers: {
          // real app: send your JWT only; dev hack header below can be removed when backend auth is wired
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          "x-test-role": "admin",
        },
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setStSummary(data?.summary || data);
    } catch (err) {
      setStError(err.message || "Upload failed");
    } finally {
      setStBusy(false);
      // reset input to avoid stale handle
      if (stInputRef.current) stInputRef.current.value = "";
      setStFile(null);
    }
  }

  async function uploadFaculty(e) {
    e.preventDefault();
    setFaError(""); setFaSummary(null);
    if (!faFile) return setFaError("Choose a CSV file first.");
    try {
      setFaBusy(true);
      const fd = new FormData();
      fd.append("file", faFile, faFile.name);
      const res = await fetch(`${API}/api/admin/bulk-faculty`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          "x-test-role": "admin",
        },
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setFaSummary(data?.summary || data);
    } catch (err) {
      setFaError(err.message || "Upload failed");
    } finally {
      setFaBusy(false);
      if (faInputRef.current) faInputRef.current.value = "";
      setFaFile(null);
    }
  }

  const Summary = ({ summary }) => {
    if (!summary) return null;
    const rows = summary.rows || [];
    return (
      <div style={{ marginTop: 10 }}>
        <table className="admin-table mini">
          <thead><tr><th>Line</th><th>Status</th><th>Email</th><th>Reason / ID</th></tr></thead>
          <tbody>
            {rows.slice(0, 200).map((r, i) => (
              <tr key={i}>
                <td>{r.line}</td><td>{r.status}</td><td>{r.email || "-"}</td><td>{r.reason || r.id || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: 6, fontSize: 12 }}>
          <b>Total:</b> {summary.total} &nbsp;|&nbsp;
          <b>Created:</b> {rows.filter(r=>r.status==="created").length} &nbsp;|&nbsp;
          <b>Skipped:</b> {rows.filter(r=>r.status==="skipped").length} &nbsp;|&nbsp;
          <b>Errors:</b> {rows.filter(r=>r.status==="error").length}
        </div>
      </div>
    );
  };

  return (
    <div className="upload-grid" style={{ display: "grid", gap: 14 }}>
      {/* Students */}
      <div className="card upload-card">
        <div className="upload-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3>Bulk Upload – Students</h3>
          <button className="btn" onClick={downloadStudentTemplate}>📄 Template</button>
        </div>
        <form onSubmit={uploadStudents} className="upload-form" style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10 }}>
          <input
            ref={stInputRef}
            type="file"
            accept=".csv"
            onChange={(e) => setStFile(e.target.files?.[0] || null)}
            disabled={stBusy}
          />
          <button className="btn-blue" type="submit" disabled={stBusy || !stFile}>
            {stBusy ? "Uploading…" : "Upload Students CSV"}
          </button>
        </form>
        {stError && <div className="error-message" style={{ marginTop: 8 }}>{stError}</div>}
        <Summary summary={stSummary} />
      </div>

      {/* Faculty */}
      <div className="card upload-card">
        <div className="upload-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3>Bulk Upload – Faculty</h3>
          <button className="btn" onClick={downloadFacultyTemplate}>📄 Template</button>
        </div>
        <form onSubmit={uploadFaculty} className="upload-form" style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10 }}>
          <input
            ref={faInputRef}
            type="file"
            accept=".csv"
            onChange={(e) => setFaFile(e.target.files?.[0] || null)}
            disabled={faBusy}
          />
          <button className="btn-blue" type="submit" disabled={faBusy || !faFile}>
            {faBusy ? "Uploading…" : "Upload Faculty CSV"}
          </button>
        </form>
        {faError && <div className="error-message" style={{ marginTop: 8 }}>{faError}</div>}
        <Summary summary={faSummary} />
      </div>
    </div>
  );
}
