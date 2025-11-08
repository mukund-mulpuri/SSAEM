// src/pages/Upload.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { parseCsv } from "../utils/csv.js";
import { Store } from "../utils/store.js";
import "./Upload.css";

const CACHE_KEY = "ssaems-upload-cache-v1";

export default function Upload() {
  const nav = useNavigate();
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState("");
  const [errors, setErrors] = useState([]);
  const [info, setInfo] = useState("");
  const [parsedRows, setParsedRows] = useState(null);
  const [hasCache, setHasCache] = useState(false);
  const inputRef = useRef(null);

  const TEMPLATE_HEADERS = [
    "roll","name","cgpa","preference1","preference2","preference3","preference4","preference5",
  ];

  // Restore cached CSV (if any)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return;
      const { fileName: cachedName, rawCsv } = JSON.parse(raw) || {};
      if (!rawCsv) return;
      setBusy(true);
      const { headers, rows } = parseCsv(rawCsv);
      const errs = validateRows(headers, rows);
      if (errs.length) {
        setErrors(errs); setInfo(""); setParsedRows(null);
      } else {
        setErrors([]); setInfo("Validation passed. Click Next to continue.");
        setParsedRows(rows); setFileName(cachedName || "(cached CSV)");
      }
      setHasCache(true);
    } catch {}
    finally { setBusy(false); }
  }, []);

  function downloadTemplate() {
    const rows = [
      TEMPLATE_HEADERS.join(","),
      "231FA04A0101,Student 01,8.5,DLD,DBMS,DS,MS,P&S",
      "231FA04A0102,Student 02,7.2,DBMS,DLD,P&S,MS,DS",
    ].join("\n");
    const blob = new Blob([rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "students_template.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const onFilePicked = async (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setErrors([{ line: "-", field: "file", message: "Please upload a .csv file" }]);
      setInfo(""); setParsedRows(null); cacheClear();
      return;
    }
    const rawCsv = await file.text();
    setFileName(file.name);
    await validateCsvText(rawCsv, file.name);
  };

  const onInputChange = (e) => {
    const f = e.target.files?.[0];
    if (f) onFilePicked(f);
  };

  const onDrop = useCallback(async (e) => {
    e.preventDefault(); e.stopPropagation(); setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onFilePicked(f);
  }, []);

  // normalize row into our store shape
  function normalizeRow(raw) {
    const prefs = Object.keys(raw)
      .filter((k) => /^preference\d+$/i.test(k))
      .sort((a, b) => Number(a.replace(/\D/g, "")) - Number(b.replace(/\D/g, "")))
      .map((k) => String(raw[k] || "").trim().toUpperCase())
      .filter(Boolean);

    return {
      roll: String(raw.roll || "").trim(),
      name: String(raw.name || "").trim(),
      cgpa: Number(String(raw.cgpa ?? "").trim() || 0),
      preferences: prefs,
    };
  }

  function validateRows(headers, rows) {
    const errs = [];
    const seenRolls = new Set();
    const must = ["roll", "name", "cgpa"];
    for (const h of must) if (!headers.includes(h)) errs.push({ line: 1, field: h, message: "Missing header" });
    const hasPrefHeader = headers.some((h) => /^preference\d+$/i.test(h));
    if (!hasPrefHeader) errs.push({ line: 1, field: "preferences", message: "At least one preference header required" });
    if (errs.length) return errs;

    rows.forEach((raw, idx) => {
      const r = normalizeRow(raw);
      const line = idx + 2;
      if (!r.roll) errs.push({ line, field: "roll", message: "Missing" });
      if (!r.name) errs.push({ line, field: "name", message: "Missing" });
      if (raw.cgpa === undefined || raw.cgpa === "") errs.push({ line, field: "cgpa", message: "Missing" });
      if (!(r.cgpa >= 0 && r.cgpa <= 10)) errs.push({ line, field: "cgpa", message: "CGPA must be 0..10" });
      if (!r.preferences.length) errs.push({ line, field: "preferences", message: "At least one preference required" });
      if (r.roll) {
        if (seenRolls.has(r.roll)) errs.push({ line, field: "roll", message: "Duplicate roll" });
        seenRolls.add(r.roll);
      }
    });
    return errs;
  }

  async function validateCsvText(rawCsv, pickedName = "") {
    try {
      setBusy(true); setErrors([]); setInfo(""); setParsedRows(null);
      const { headers, rows } = parseCsv(rawCsv);
      const errs = validateRows(headers, rows);
      if (errs.length) {
        setErrors(errs); setInfo(""); cacheClear();
      } else {
        setErrors([]); setInfo("Validation passed. Click Next to continue.");
        setParsedRows(rows); cacheSave({ fileName: pickedName, rawCsv });
      }
    } catch (e) {
      setErrors([{ line: "-", field: "file", message: e.message || "Failed to read CSV" }]);
      setInfo(""); setParsedRows(null); cacheClear();
    } finally { setBusy(false); }
  }

  function cacheSave(obj) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(obj)); setHasCache(true); } catch {}
  }
  function cacheClear() {
    try { localStorage.removeItem(CACHE_KEY); setHasCache(false); } catch {}
  }

  // 🚿 Clear EVERYTHING: file selection + cache + in-memory Store
  function clearEverything() {
    // 1) Clear upload UI state
    setFileName("");
    setErrors([]);
    setInfo("");
    setParsedRows(null);
    setDragOver(false);
    setHasCache(false);
    // clear file input
    if (inputRef.current) inputRef.current.value = "";

    // 2) Clear local cache
    cacheClear();

    // 3) Reset in-memory store so Allocation/Results become fresh
    const st = Store.get();
    Store.set({
      ...st,
      students: [],
      allotments: [],   // 👈 this clears allocation/results
      // subjects: st.subjects  // keep subjects; they’re independent of upload
    });

    alert("🗑 Cleared selected file, cache, and in-memory allocation/results.");
  }

  // Save students to Store and move to next step
  function saveAndNext() {
    if (!parsedRows || errors.length) return;
    const students = parsedRows.map(normalizeRow);
    const st = Store.get();
    Store.set({ ...st, students, allotments: [] }); // reset any old results
    nav("/faculty/allocation");
  }

  return (
    <div className="upload-container">
      <h2 className="upload-title"> Upload CSV Here (Validate → Load)</h2>

      <div className="upload-actions">
        <button className="btn" onClick={downloadTemplate} style={{color:'white', backgroundColor:'blue'}}>📄 Download Template</button>
        <button className="btn" onClick={clearEverything} style={{color:'white', backgroundColor:'crimson'}}>🗑 Clear Cache</button>
      </div>

      <div
        className={`drop-zone ${dragOver ? "drag-over" : ""}`}
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
        onClick={() => inputRef.current?.click()}
      >
        <p>Drag & Drop your <b>.csv</b> file here or click to browse</p>
        <input ref={inputRef} type="file" accept=".csv" onChange={onInputChange} hidden />
        {fileName && <div className="file-name">Selected: {fileName}</div>}
        {!fileName && hasCache && <div className="file-name">(restored from cache)</div>}
      </div>

      {busy && <div className="loading">Validating…</div>}

      {errors.length > 0 && (
        <div className="card error-card">
          <h3>Errors Found</h3>
          <table className="error-table">
            <thead>
              <tr><th>Line</th><th>Field</th><th>Message</th></tr>
            </thead>
            <tbody>
              {errors.map((e, i) => (
                <tr key={i}>
                  <td>{e.line}</td><td>{e.field}</td><td>{e.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {errors.length === 0 && info && (
        <div className="card info-card" style={{backgroundColor:'white'}}>
          <div className="info-text">{info}</div>
          <div className="nav-buttons" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
            <button 
              className="btn" 
              onClick={() => nav("/faculty/subjects")}
              style={{ padding: '8px 20px', color:'white', backgroundColor:'blue' }}
            >
              ← Previous (Subjects)
            </button>
            <button 
              className="btn-blue" 
              onClick={saveAndNext}
              style={{ padding: '8px 20px' }}
            >
              Next (Allocation) →
            </button>
          </div>
        </div>
      )}

      <div className="card footer-card" style={{backgroundColor:'white'}}>
        <b>Required headers:</b>
        <p className="headers-list">
          roll, name, cgpa, preference1, preference2, preference3, preference4, preference5
        </p>
        <ul>
          <li><b>CGPA:</b> Range 0.0 – 10.0</li>
          <li>Preferences example: <code>DLD, DBMS, DS, MS, P&amp;S</code></li>
        </ul>
      </div>
    </div>
  );
}
