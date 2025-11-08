import React, { useMemo, useState } from "react";
import { Store } from "../utils/store.js";
import { downloadSubjectRoster } from "../utils/reports.js";
import "./AdminDashboard.css";

import AdminBulkUpload from "./AdminBulkUpload.jsx";
import AdminManualUsers from "./AdminManualUsers.jsx";
import AdminUserManager from "./AdminUserManager.jsx";

const SECTIONS = [
  { key: "create", label: "Create Users", icon: "➕" },
  { key: "users", label: "Display Users", icon: "👥" },
  { key: "analytics", label: "Subject Analytics", icon: "📊" },
];

export default function AdminDashboard() {
  const { students = [], subjects = [], allotments = [] } = Store.get();

  const [active, setActive] = useState("create");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState({ key: "code", dir: "asc" });

  const allocated = allotments.filter((a) => a.status === "ALLOCATED");
  const unassigned = allotments.filter((a) => a.status === "UNASSIGNED");

  // ---- subject analytics (base) ----
  const subjectBase = useMemo(() => {
    const map = {};
    subjects.forEach((s) => {
      map[s.code] = {
        code: s.code,
        name: s.name,
        capacity: Number(s.capacity) || 0,
        demand: 0,
        allocated: 0,
        cutoff: null,
      };
    });

    // demand by preferences
    students.forEach((stu) => {
      (stu.preferences || []).forEach((code) => {
        if (map[code]) map[code].demand += 1;
      });
    });

    // allocation + cutoff
    allocated.forEach((a) => {
      const bucket = map[a.subjectCode];
      if (!bucket) return;
      bucket.allocated += 1;
      const stu = students.find((s) => s.roll === a.roll);
      if (stu) {
        const cg = Number(stu.cgpa) || 0;
        bucket.cutoff = bucket.cutoff == null ? cg : Math.min(bucket.cutoff, cg);
      }
    });

    return Object.values(map);
  }, [students, subjects, allocated]);

  // ---- search + sort + derived fields ----
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const enriched = subjectBase
      .map((d) => ({
        ...d,
        utilization: d.capacity > 0 ? Math.round((d.allocated / d.capacity) * 100) : 0,
        cutoffText: d.cutoff == null ? "-" : d.cutoff.toFixed(2),
      }))
      .filter((r) =>
        !q
          ? true
          : [r.code, r.name, String(r.capacity), String(r.demand), String(r.allocated)]
              .join(" ")
              .toLowerCase()
              .includes(q)
      );

    const { key, dir } = sortBy;
    const mul = dir === "asc" ? 1 : -1;
    enriched.sort((a, b) => {
      const va = a[key];
      const vb = b[key];
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * mul;
      return String(va || "").localeCompare(String(vb || "")) * mul;
    });

    return enriched;
  }, [subjectBase, query, sortBy]);

  const kpis = [
    { label: "Students", value: students.length },
    { label: "Subjects", value: subjects.length },
    { label: "Allocated", value: allocated.length },
    { label: "Unassigned", value: unassigned.length },
  ];

  function toggleSort(key) {
    setSortBy((prev) =>
      prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }
    );
  }

  /* ---------- PAGE CONTENTS (by active tab) ---------- */

  // CREATE USERS — NO analytics/KPIs here anymore
  const renderCreateUsers = () => (
    <>
      <div className="bulk-row">
        <AdminBulkUpload />
      </div>
      <div className="manual-row">
        <AdminManualUsers />
      </div>
    </>
  );

  // DISPLAY USERS
  const renderUsers = () => <AdminUserManager />;

  // SUBJECT ANALYTICS
  const renderAnalytics = () => (
    <>
      <div className="kpi-grid" style={{ marginBottom: 10 }}>
        {kpis.map((k) => (
          <div className="kpi-card" key={k.label}>
            <div className="kpi-value">{k.value}</div>
            <div className="kpi-label">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="filter-bar">
        <input
          className="search"
          placeholder="Search code/name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="sort-showing">
          Showing <b>{rows.length}</b> of <b>{subjectBase.length}</b>
        </div>
        {/* export is only in analytics */}
        <button
          className="btn"
          onClick={() => {
            const headers = ["code", "name", "capacity", "demand", "allocated", "cutoff", "utilization"];
            const body = rows.map((r) => [
              r.code,
              r.name,
              r.capacity,
              r.demand,
              r.allocated,
              r.cutoffText,
              `${r.utilization}%`,
            ]);
            const lines = [headers.join(","), ...body.map((a) => a.join(","))].join("\n");
            const blob = new Blob([lines], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "admin_subject_analytics.csv";
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          ⬇ Export Table
        </button>
      </div>

      <div className="card analytics-card">
        <h3>Subject Analytics</h3>
        <table className="admin-table">
          <thead>
            <tr>
              <th onClick={() => toggleSort("code")}>Code</th>
              <th onClick={() => toggleSort("name")}>Name</th>
              <th onClick={() => toggleSort("capacity")}>Capacity</th>
              <th onClick={() => toggleSort("demand")}>Demand</th>
              <th onClick={() => toggleSort("allocated")}>Allocated</th>
              <th onClick={() => toggleSort("cutoff")}>Cutoff CGPA</th>
              <th onClick={() => toggleSort("utilization")}>Utilization</th>
              <th>Roster</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.code}>
                <td className="mono">{s.code}</td>
                <td>{s.name}</td>
                <td className="num">{s.capacity}</td>
                <td className="num">
                  {s.demand}
                  {s.capacity > 0 && (
                    <span className={`pill ${s.demand > s.capacity ? "pill-hot" : "pill-calm"}`}>
                      {s.demand > s.capacity ? "High" : "OK"}
                    </span>
                  )}
                </td>
                <td className="num">{s.allocated}</td>
                <td className="num">{s.cutoffText}</td>
                <td>
                  <div className="bar">
                    <div
                      className={`bar-fill ${s.utilization >= 100 ? "bar-full" : ""}`}
                      style={{ width: `${Math.min(s.utilization, 100)}%` }}
                      title={`${s.utilization}%`}
                    />
                  </div>
                  <span className="util">{s.utilization}%</span>
                </td>
                <td>
                  <button
                    className="btn small"
                    onClick={() => downloadSubjectRoster(s.code)}
                    title="Download roster CSV"
                  >
                    ⬇ CSV
                  </button>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan="8" className="no-data">No subjects or data available.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );

  return (
    <div className="admin-shell">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-title">Admin</div>
        <nav className="nav">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              className={`nav-item ${active === s.key ? "active" : ""}`}
              onClick={() => setActive(s.key)}
            >
              <span className="nav-ico">{s.icon}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main className="content">
        <div className="content-head">
          <h2 className="admin-title">
            {SECTIONS.find((x) => x.key === active)?.label || "Dashboard"}
          </h2>
        </div>

        {active === "create" && renderCreateUsers()}
        {active === "users" && renderUsers()}
        {active === "analytics" && renderAnalytics()}
      </main>
    </div>
  );
}
