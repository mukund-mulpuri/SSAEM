// src/pages/Subjects.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Store } from "../utils/store.js";
import "./Subjects.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function Subjects() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  // Filters (UI kosam matrame)
  const [filters, setFilters] = useState({ year: "", semester: "" });

  // Create form
  const [form, setForm] = useState({
    code: "",
    name: "",
    capacity: "",
    year: "1",
    semester: "1",
    eligibleBranches: "",
  });

  // Edit mode
  const [editing, setEditing] = useState(null);
  const [editData, setEditData] = useState({
    name: "",
    capacity: "",
    year: "1",
    semester: "1",
    eligibleBranches: "",
  });

  const authHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
  });

  const parseBranches = (csv) =>
    (csv || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  function validatePayload({ code, name, capacity, year, semester }) {
    if (!code || !code.trim()) return "Subject code is required";
    if (!name || !name.trim()) return "Subject name is required";
    const cap = Number(capacity);
    const yearNum = Number(year);
    const semNum = Number(semester);
    if (!Number.isFinite(cap) || cap <= 0) return "Capacity must be a positive number";
    if (!Number.isInteger(yearNum) || yearNum < 1 || yearNum > 4) return "Year must be between 1 and 4";
    if (!Number.isInteger(semNum) || semNum < 1 || semNum > 8) return "Semester must be between 1 and 8";
    return "";
  }

  // 🔁 Load & hydrate Store
  async function loadFromServer() {
    setError("");
    try {
      const qs = new URLSearchParams();
      if (filters.year) qs.set("year", String(filters.year));

      const res = await fetch(`${API}/api/subjects?${qs.toString()}`, {
        headers: authHeaders(),
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = { raw: text }; }
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      // FULL list (unfiltered) for Store
      const listAll = Array.isArray(data) ? data : [];

      // UI table ki maaṭrame semester filter
      const listForTable = filters.semester
        ? listAll.filter((s) => String(s.semester || "") === String(filters.semester))
        : listAll;
      setItems(listForTable);

      // Allocation kosam Store.subjects hydrate
      const mappedAll = listAll.map((s) => ({
        code: s.code,
        name: s.title || s.name || "",
        capacity: Number(s.capacity) || 0,
      }));
      const st = Store.get();
      Store.set({ ...st, subjects: mappedAll });
    } catch (e) {
      setError(e.message || "Failed to load subjects");
    }
  }

  async function create() {
    setError("");
    const payloadUI = {
      code: (form.code || "").trim().toUpperCase(),
      name: (form.name || "").trim(),
      capacity: Number(form.capacity) || 0,
      year: parseInt(form.year, 10) || 1,
      semester: parseInt(form.semester, 10) || 1,
      eligibleBranches: parseBranches(form.eligibleBranches),
    };

    const v = validatePayload(payloadUI);
    if (v) return setError(v);

    const body = {
      code: payloadUI.code,
      title: payloadUI.name, // backend expects "title"
      capacity: payloadUI.capacity,
      year: payloadUI.year,
      semester: payloadUI.semester,
      eligibleBranches: payloadUI.eligibleBranches,
      eligibility: { minPercent: 0 },
    };

    try {
      const res = await fetch(`${API}/api/subjects`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = { raw: text }; }
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      setForm({ code: "", name: "", capacity: "", year: "1", semester: "1", eligibleBranches: "" });
      await loadFromServer();
    } catch (e) {
      setError(e.message || "Failed to create subject");
    }
  }

  function startEdit(s) {
    setEditing(s._id);
    setEditData({
      name: s.title || "",
      capacity: String(s.capacity ?? ""),
      year: String(s.year || "1"),
      semester: String(s.semester || "1"),
      eligibleBranches: Array.isArray(s.eligibleBranches) ? s.eligibleBranches.join(", ") : "",
    });
  }

  async function saveEdit(id) {
    setError("");
    const updateUI = {
      name: (editData.name || "").trim(),
      capacity: Number(editData.capacity) || 0,
      year: parseInt(editData.year, 10) || 1,
      semester: parseInt(editData.semester, 10) || 1,
      eligibleBranches: parseBranches(editData.eligibleBranches),
    };

    const v = validatePayload({
      code: "SKIP",
      name: updateUI.name,
      capacity: updateUI.capacity,
      year: String(updateUI.year),
      semester: String(updateUI.semester),
    });
    if (v) return setError(v);

    const body = {
      title: updateUI.name,
      capacity: updateUI.capacity,
      year: updateUI.year,
      semester: updateUI.semester,
      eligibleBranches: updateUI.eligibleBranches,
    };

    try {
      const res = await fetch(`${API}/api/subjects/${id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = { raw: text }; }
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      setEditing(null);
      await loadFromServer();
      navigate("/faculty/upload");
    } catch (e) {
      setError(e.message || "Failed to update subject");
    }
  }

  function removeLocal(s) {
    if (!window.confirm(`Delete subject ${s.code}?`)) return;
    setItems((prev) => prev.filter((x) => x._id !== s._id));
    if (editing === s._id) setEditing(null);
  }

  useEffect(() => { loadFromServer(); /* eslint-disable-next-line */ }, []);
  useEffect(() => { loadFromServer(); /* eslint-disable-next-line */ }, [filters.year, filters.semester]);

  const canNext = items.length > 0;

  return (
    <div className="subjects-container">
      <h2 className="subjects-title">Subjects Details</h2>

      {/* Filter Section */}
      <div className="card filter-card" style={{ marginBottom: "20px", backgroundColor:'white' }}>
        <h3>Filter Subjects</h3>
        <div className="filter-controls" style={{ display: "flex", gap: "15px", alignItems: "center" }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Year</label>
            <select
              name="year"
              value={filters.year}
              onChange={(e) => setFilters((p) => ({ ...p, year: e.target.value }))}
              className="form-input"
            >
              <option value="">All Years</option>
              <option value="1">1st Year</option>
              <option value="2">2nd Year</option>
              <option value="3">3rd Year</option>
              <option value="4">4th Year</option>
            </select>
          </div>

          <div className="form-group" style={{ flex: 1 }}>
            <label>Semester</label>
            <select
              name="semester"
              value={filters.semester}
              onChange={(e) => setFilters((p) => ({ ...p, semester: e.target.value }))}
              className="form-input"
            >
              <option value="">All Semesters</option>
              {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n} Semester</option>)}
            </select>
          </div>

          <button className="btn" onClick={() => setFilters({ year: "", semester: "" })} style={{ marginTop: "22px", color:'black'}}>
            Reset Filters
          </button>
        </div>
      </div>

      {/* Create Form */}
      <div className="card subject-form-card" style={{backgroundColor:'white'}}>
        <h3>Create Subject</h3>
        <div className="subject-form-grid">
          <div className="form-group">
            <label>Subject Code</label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="e.g. IAI"
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label>Subject Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Intro to AI"
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label>Year</label>
            <select
              name="year"
              value={form.year}
              onChange={(e) => setForm({ ...form, year: e.target.value })}
              className="form-input"
              required
            >
              <option value="">Select Year</option>
              <option value="1">1st Year</option>
              <option value="2">2nd Year</option>
              <option value="3">3rd Year</option>
              <option value="4">4th Year</option>
            </select>
          </div>
          <div className="form-group">
            <label>Semester</label>
            <select
              name="semester"
              value={form.semester}
              onChange={(e) => setForm({ ...form, semester: e.target.value })}
              className="form-input"
              required
            >
              <option value="">Select Semester</option>
              {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Capacity</label>
            <input
              type="number"
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })}
              placeholder="e.g. 60"
              className="form-input"
              min="1"
            />
          </div>
          <div className="form-group">
            <label>Eligible Branches (comma separated, optional)</label>
            <input
              type="text"
              value={form.eligibleBranches}
              onChange={(e) => setForm({ ...form, eligibleBranches: e.target.value })}
              className="form-input"
              placeholder="e.g. CSE, IT, ECE"
            />
          </div>

          <button className="btn-blue" onClick={create}>➕ Create Subject</button>
        </div>
        {error && <div className="error-message">{error}</div>}
      </div>

      {/* Subjects Table */}
      <div className="card table-card" style={{backgroundColor:'white'}}>
        <table className="subjects-table">
          <thead>
            <tr style={{backgroundColor:'white',color:'black'}}>
              <th>Code</th><th>Name</th><th>Year</th><th>Semester</th><th>Capacity</th><th>Eligible Branches</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr key={s._id}>
                <td>{s.code}</td>
                <td>
                  {editing === s._id ? (
                    <input
                      className="input-field"
                      value={editData.name}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    />
                  ) : (
                    s.title
                  )}
                </td>
                <td>
                  {editing === s._id ? (
                    <select
                      value={editData.year}
                      onChange={(e) => setEditData({ ...editData, year: e.target.value })}
                      className="edit-input"
                    >
                      <option value="1">1st</option><option value="2">2nd</option><option value="3">3rd</option><option value="4">4th</option>
                    </select>
                  ) : (
                    `Year ${s.year}`
                  )}
                </td>
                <td>
                  {editing === s._id ? (
                    <select
                      value={editData.semester}
                      onChange={(e) => setEditData({ ...editData, semester: e.target.value })}
                      className="edit-input"
                    >
                      {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  ) : (
                    s.semester || "-"
                  )}
                </td>
                <td>
                  {editing === s._id ? (
                    <input
                      type="number"
                      value={editData.capacity}
                      onChange={(e) => setEditData({ ...editData, capacity: e.target.value })}
                      className="edit-input"
                      min="1"
                    />
                  ) : (
                    s.capacity
                  )}
                </td>
                <td>
                  {editing === s._id ? (
                    <input
                      className="input-field"
                      value={editData.eligibleBranches}
                      onChange={(e) =>
                        setEditData({ ...editData, eligibleBranches: e.target.value })
                      }
                    />
                  ) : (
                    (s.eligibleBranches || []).join(", ")
                  )}
                </td>
                <td className="actions">
                  {editing === s._id ? (
                    <>
                      <button className="btn-blue small" onClick={() => saveEdit(s._id)}>💾 Save</button>
                      <button className="btn small" onClick={() => setEditing(null)}>✖ Cancel</button>
                    </>
                  ) : (
                    <>
                      <button className="btn small" onClick={() => startEdit(s)}>✏ Edit</button>
                      <button className="btn small" onClick={() => removeLocal(s)}>🗑 Delete</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {!items.length && (
              <tr>
                <td colSpan="7" className="no-data">No subjects yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Navigation */}
      <div className="nav-buttons" style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
        <button
          className="btn-blue"
          disabled={!items.length}
          onClick={() => navigate("/faculty/upload")}
          style={{ padding: "8px 20px",color:'white', backgroundColor:'blue'  }}
        >
          Next (Upload) →
        </button>
      </div>

      {!items.length && <div className="warning">⚠ Add at least one subject to continue.</div>}
    </div>
  );
}
