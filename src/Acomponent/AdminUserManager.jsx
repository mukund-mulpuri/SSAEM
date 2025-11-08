// src/pages/AdminUserManager.jsx
import React, { useEffect, useMemo, useState } from "react";
const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

const roles = [
  { value: "", label: "All" },
  { value: "student", label: "Student" },
  { value: "coordinator", label: "Faculty (Coordinator)" },
  { value: "admin", label: "Admin" },
];

export default function AdminUserManager() {
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [saving, setSaving] = useState(false);
  const [delBusy, setDelBusy] = useState("");

  const pages = useMemo(() => Math.ceil(total / limit) || 1, [total, limit]);

  async function load() {
    setErr("");
    setBusy(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("search", q);
      if (role) params.set("role", role);
      params.set("page", String(page));
      params.set("limit", String(limit));

      const res = await fetch(`${API}/api/admin/users?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          "x-test-role": "admin", // remove in prod
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      setErr(e.message || "Failed to load users");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, role]);
  // debounce search
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); load(); }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [q]);

  function openEdit(u) {
    setEditRow({
      ...u,
      // temp field for new password (optional)
      newPassword: "",
    });
    setEditOpen(true);
  }

  async function saveEdit(e) {
    e?.preventDefault?.();
    if (!editRow?._id) return;
    setSaving(true);
    setErr("");
    try {
      const fd = new FormData(); // FormData to be flexible (backend accepts multipart/JSON)
      fd.append("name", editRow.name || "");
      fd.append("email", (editRow.email || "").toLowerCase().trim());
      fd.append("role", editRow.role || "");
      fd.append("roll", editRow.roll || "");
      fd.append("year", editRow.year || "");
      fd.append("branch", (editRow.branch || "").toUpperCase().trim());
      fd.append("active", String(!!editRow.active));
      if (editRow.newPassword) fd.append("password", editRow.newPassword);

      const res = await fetch(`${API}/api/admin/users/${editRow._id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          "x-test-role": "admin",
        },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      setEditOpen(false);
      setEditRow(null);
      load();
    } catch (e2) {
      setErr(e2.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function doDelete(u) {
    if (!window.confirm(`Hard delete user ${u.email}?`)) return;
    setDelBusy(u._id);
    setErr("");
    try {
      const res = await fetch(`${API}/api/admin/users/${u._id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          "x-test-role": "admin",
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      load();
    } catch (e) {
      setErr(e.message || "Failed to delete");
    } finally {
      setDelBusy("");
    }
  }

  return (
    <div className="card" style={{ background: "white", padding: 16 }}>
      <h3>Users Manager</h3>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
        <input
          placeholder="Search name/email/roll..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="input-field"
          style={{ flex: 1 }}
        />
        <select value={role} onChange={(e) => setRole(e.target.value)} className="input-field" style={{ width: 240 }}>
          {roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      {err && <div className="error-message" style={{ marginBottom: 8 }}>{err}</div>}

      {/* Table */}
      <div className="table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th><th>Email</th><th>Role</th><th>Roll</th><th>Year</th><th>Branch</th><th>Active</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!busy && items.map(u => (
              <tr key={u._id}>
                <td>{u.name || "-"}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>{u.roll || "-"}</td>
                <td>{u.year || "-"}</td>
                <td>{u.branch || "-"}</td>
                <td>{u.active ? "Yes" : "No"}</td>
                <td>
                  <button className="btn small" onClick={() => openEdit(u)}>Edit</button>
                  <button className="btn small" onClick={() => doDelete(u)} disabled={delBusy === u._id}>Delete</button>
                </td>
              </tr>
            ))}
            {!busy && items.length === 0 && (
              <tr><td colSpan="8" className="no-data">No users</td></tr>
            )}
            {busy && (
              <tr><td colSpan="8">Loading…</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pager */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10 }}>
        <button className="btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</button>
        <span>Page {page} / {pages}</span>
        <button className="btn" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next</button>
      </div>

      {/* Edit modal */}
      {editOpen && editRow && (
        <div className="modal-overlay">
          <div className="card modal-card">
            <h3>Edit User</h3>
            <form onSubmit={saveEdit} style={{ display: "grid", gap: 8 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <input className="input-field" placeholder="Name" value={editRow.name || ""} onChange={(e) => setEditRow({ ...editRow, name: e.target.value })} />
                <input className="input-field" placeholder="Email" value={editRow.email || ""} onChange={(e) => setEditRow({ ...editRow, email: e.target.value })} />
                <select className="input-field" value={editRow.role || ""} onChange={(e) => setEditRow({ ...editRow, role: e.target.value })}>
                  <option value="student">Student</option>
                  <option value="coordinator">Coordinator</option>
                  <option value="admin">Admin</option>
                </select>
                <input className="input-field" placeholder="Roll (students)" value={editRow.roll || ""} onChange={(e) => setEditRow({ ...editRow, roll: e.target.value })} />
                <input className="input-field" placeholder="Year" value={editRow.year || ""} onChange={(e) => setEditRow({ ...editRow, year: e.target.value })} />
                <input className="input-field" placeholder="Branch" value={editRow.branch || ""} onChange={(e) => setEditRow({ ...editRow, branch: e.target.value })} />
                <input className="input-field" placeholder="New Password (optional)" type="password" value={editRow.newPassword || ""} onChange={(e) => setEditRow({ ...editRow, newPassword: e.target.value })} />
                <select className="input-field" value={editRow.active ? "true" : "false"} onChange={(e) => setEditRow({ ...editRow, active: e.target.value === "true" })}>
                  <option value="true">Active: Yes</option>
                  <option value="false">Active: No</option>
                </select>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button type="button" className="btn" onClick={() => setEditOpen(false)}>Cancel</button>
                <button type="submit" className="btn-blue" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
