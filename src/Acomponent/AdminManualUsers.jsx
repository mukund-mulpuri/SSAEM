// src/pages/AdminManualUsers.jsx
import React, { useState } from "react";
const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function AdminManualUsers() {
  // Student form state
  const [s, setS] = useState({
    email: "", name: "", password: "", regNo: "", year: "", semester: "", branch: ""
  });
  const [sBusy, setSBusy] = useState(false);
  const [sMsg, setSMsg] = useState("");

  // Faculty form state
  const [f, setF] = useState({
    email: "", name: "", password: "", department: ""
  });
  const [fBusy, setFBusy] = useState(false);
  const [fMsg, setFMsg] = useState("");

  async function createStudent(e) {
    e.preventDefault();
    setSMsg(""); setSBusy(true);
    try {
      const fd = new FormData();
      fd.append("email", s.email.trim().toLowerCase());
      fd.append("name", s.name.trim());
      fd.append("password", s.password);
      fd.append("regNo", s.regNo.trim());
      fd.append("year", String(s.year));
      fd.append("semester", String(s.semester));
      fd.append("branch", s.branch.trim().toUpperCase());

      const res = await fetch(`${API}/api/admin/create-student`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          "x-test-role": "admin", // remove in prod
          // DO NOT set Content-Type when using FormData
        },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setSMsg(`✅ Created student (id: ${data.id})`);
      setS({ email: "", name: "", password: "", regNo: "", year: "", semester: "", branch: "" });
    } catch (e) {
      setSMsg(`❌ ${e.message}`);
    } finally {
      setSBusy(false);
    }
  }

  async function createFaculty(e) {
    e.preventDefault();
    setFMsg(""); setFBusy(true);
    try {
      const fd = new FormData();
      fd.append("email", f.email.trim().toLowerCase());
      fd.append("name", f.name.trim());
      fd.append("password", f.password);
      fd.append("department", f.department.trim().toUpperCase());

      const res = await fetch(`${API}/api/admin/create-faculty`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          "x-test-role": "admin", // remove in prod
        },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setFMsg(`✅ Created faculty (id: ${data.id})`);
      setF({ email: "", name: "", password: "", department: "" });
    } catch (e) {
      setFMsg(`❌ ${e.message}`);
    } finally {
      setFBusy(false);
    }
  }

  const input = {
    width: "100%", padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 8
  };
  const grid = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };

  return (
    <div className="card" style={{ marginTop: 14 }}>
      <h3>Manual Add – Student & Faculty</h3>

      {/* Student form */}
      <div className="card" style={{ marginTop: 10 }}>
        <h4>➕ Create Student</h4>
        <form onSubmit={createStudent} style={{ display: "grid", gap: 10 }}>
          <div style={grid}>
            <input style={input} placeholder="Email" value={s.email} onChange={e=>setS({...s, email:e.target.value})} />
            <input style={input} placeholder="Name" value={s.name} onChange={e=>setS({...s, name:e.target.value})} />
            <input style={input} placeholder="Password" type="password" value={s.password} onChange={e=>setS({...s, password:e.target.value})} />
            <input style={input} placeholder="Reg No" value={s.regNo} onChange={e=>setS({...s, regNo:e.target.value})} />
            <input style={input} placeholder="Year (e.g. 2)" value={s.year} onChange={e=>setS({...s, year:e.target.value})} />
            <input style={input} placeholder="Semester (e.g. 4)" value={s.semester} onChange={e=>setS({...s, semester:e.target.value})} />
            <input style={input} placeholder="Branch (e.g. CSE)" value={s.branch} onChange={e=>setS({...s, branch:e.target.value})} />
          </div>
          <div>
            <button className="btn-blue" type="submit" disabled={sBusy}>
              {sBusy ? "Creating…" : "Create Student"}
            </button>
            {sMsg && <div style={{ marginTop: 8 }}>{sMsg}</div>}
          </div>
        </form>
      </div>

      {/* Faculty form */}
      <div className="card" style={{ marginTop: 10 }}>
        <h4>➕ Create Faculty (Coordinator)</h4>
        <form onSubmit={createFaculty} style={{ display: "grid", gap: 10 }}>
          <div style={grid}>
            <input style={input} placeholder="Email" value={f.email} onChange={e=>setF({...f, email:e.target.value})} />
            <input style={input} placeholder="Name" value={f.name} onChange={e=>setF({...f, name:e.target.value})} />
            <input style={input} placeholder="Password" type="password" value={f.password} onChange={e=>setF({...f, password:e.target.value})} />
            <input style={input} placeholder="Department (e.g. CSE)" value={f.department} onChange={e=>setF({...f, department:e.target.value})} />
          </div>
          <div>
            <button className="btn-blue" type="submit" disabled={fBusy}>
              {fBusy ? "Creating…" : "Create Faculty"}
            </button>
            {fMsg && <div style={{ marginTop: 8 }}>{fMsg}</div>}
          </div>
        </form>
      </div>
    </div>
  );
}
