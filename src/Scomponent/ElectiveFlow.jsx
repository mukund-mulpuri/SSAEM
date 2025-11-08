import React, { useEffect, useMemo, useState } from "react";
import {
  getMyProfile,
  updateMe,
  listSubjects,
  getMyPreferences,
  submitPreferences,
  getMyAllotment,
} from "../api/student";
import UserDetailsForm from "./UserDetailsForm";
import PreferenceListView from "./PreferenceListView";
import AllocatedSubjectView from "./AllocatedSubjectView";
import DownloadSlip from "./DownloadSlip";
import "./ElectiveFlow.css";

const SESSION_ID = "";
const preferenceLevels = [1, 2, 3, 4, 5];

// initials for avatar
const getInitials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase?.() || "")
    .slice(0, 2)
    .join("") || "ST";

function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      style={{
        marginTop: 12,
        padding: "8px 12px",
        background: "#ffecec",
        color: "#8b0000",
        border: "1px solid #ffb3b3",
        borderRadius: 6,
      }}
    >
      {message}
    </div>
  );
}

function TinyMeta({ profile }) {
  if (!profile) return null;
  return (
    <div className="tiny-line" style={{ marginBottom: 8, opacity: 0.9 }}>
      <b>Year:</b> {profile.year} &nbsp; | &nbsp; <b>Semester:</b> {profile.semester}
    </div>
  );
}

export default function ElectiveFlow() {
  const [subjects, setSubjects] = useState([]);
  const [profile, setProfile] = useState(null);

  // preferences map & captured labels (for robust display)
  const [preferences, setPreferences] = useState({});
  const [prefLabels, setPrefLabels] = useState({});

  const [locked, setLocked] = useState(false);
  const [step, setStep] = useState(0);
  const [allocatedData, setAllocatedData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [err, setErr] = useState("");

  // Boot: profile + existing prefs; ensure subjects are loaded BEFORE showing review
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        const me = await getMyProfile();
        setProfile(me || null);

        const prefResp = await getMyPreferences(SESSION_ID).catch(() => null);

        if (prefResp && Array.isArray(prefResp.choices) && prefResp.choices.length) {
          const map = {};
          const labels = {};
          prefResp.choices.forEach((c) => {
            const sid = String(c.subject);
            map[sid] = Number(c.rank);
            if (c.label) labels[sid] = String(c.label);
          });
          setPreferences(map);
          setPrefLabels(labels);
          setLocked(true);

          const y = String(me?.year || "");
          const sem = String(me?.semester || "");
          if (y && sem) {
            try {
              setLoadingSubjects(true);
              const subs = await listSubjects(SESSION_ID, { year: y, semester: sem }).catch(() => []);
              setSubjects(Array.isArray(subs) ? subs : []);
            } finally {
              setLoadingSubjects(false);
            }
          }

          setStep(2); // go to review AFTER subjects are ready
        } else {
          setLocked(false);
        }
      } catch (e) {
        setErr(e?.response?.data?.error || e?.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Fresh user path: load subjects when year/semester available
  useEffect(() => {
    (async () => {
      const y = String(profile?.year || "");
      const sem = String(profile?.semester || "");
      if (!y || !sem) return;

      try {
        setLoadingSubjects(true);
        const subs = await listSubjects(SESSION_ID, { year: y, semester: sem }).catch(() => []);
        setSubjects(Array.isArray(subs) ? subs : []);
      } catch (e) {
        setSubjects([]);
        setErr(e?.response?.data?.error || e?.message || "Failed to load subjects");
      } finally {
        setLoadingSubjects(false);
      }
    })();
  }, [profile?.year, profile?.semester]);

  const filteredSubjects = useMemo(() => {
    if (!Array.isArray(subjects)) return [];
    if (!profile) return subjects;
    const y = String(profile.year || "");
    const sem = String(profile.semester || "");
    return subjects.filter(
      (s) => String(s.year || "") === y && String(s.semester || "") === sem
    );
  }, [subjects, profile]);

  const electives = useMemo(() => {
    return filteredSubjects.map((s) => ({
      id: String(s._id),
      label: s.code ? `${s.code} — ${s.title}` : s.title || "",
    }));
  }, [filteredSubjects]);

  function handlePrefTick(subjectId, level) {
    if (locked) return;
    const sid = String(subjectId);
    setPreferences((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        if (next[k] === level) next[k] = null;
      });
      next[sid] = level;
      return next;
    });
    // capture label at selection time as fallback
    const s = subjects.find((x) => String(x._id) === sid);
    if (s) {
      const lbl = `${s.code ? s.code + " — " : ""}${s.title || s.name || ""}`;
      setPrefLabels((p) => ({ ...p, [sid]: lbl }));
    }
  }

  async function saveDetailsAndPreferences(e) {
    e?.preventDefault?.();
    if (locked) return;

    const chosen = Object.entries(preferences).filter(([, r]) => !!r);
    if (chosen.length < 5) {
      setErr("⚠ Please choose at least 5 preferences.");
      return;
    }

    try {
      setErr("");
      setLoading(true);
      if (profile) {
        await updateMe({
          name: profile.name,
          regNo: profile.regNo || profile.roll || "",
          year: profile.year,
          semester: profile.semester,
          branch: profile.branch,
          cgpa: profile.cgpa,
          previousElective: profile.previousElective,
        });
      }
      const payload = chosen.map(([subject, rank]) => ({
        subject,
        rank: Number(rank),
      }));
      await submitPreferences(SESSION_ID, payload);

      setLocked(true);
      setStep(2);
    } catch (e2) {
      setErr(e2?.response?.data?.error || e2?.message || "Failed to submit");
    } finally {
      setLoading(false);
    }
  }

  async function fetchMyAllocation() {
    try {
      setErr("");
      setLoading(true);
      const res = await getMyAllotment(SESSION_ID);
      if (!res || !res.assigned) {
        setAllocatedData({
          studentName: profile?.name,
          rollNumber: profile?.regNo || profile?.roll,
          branch: profile?.branch,
          year: profile?.year,
          allocatedSubject: "None",
          confirmationStatus: "Not Allocated",
          allocatedOn: null,
        });
      } else {
        setAllocatedData({
          studentName: profile?.name,
          rollNumber: profile?.regNo || profile?.roll,
          branch: profile?.branch,
          year: profile?.year,
          allocatedSubject: `${res.subject?.code ? res.subject.code + " — " : ""}${res.subject?.title || ""}`,
          confirmationStatus: "Allocated",
          allocatedOn: res.savedAt || new Date().toISOString(),
        });
      }
      setStep(3);
    } catch (e) {
      setErr(e?.response?.data?.error || e?.message || "Failed to load allocation");
    } finally {
      setLoading(false);
    }
  }

  // 🔐 LOGOUT
  const handleLogout = () => {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("roll");
      localStorage.removeItem("studentRoll");
      window.location.replace("/login"); // change if your login route is different
    } catch {
      window.location.href = "/login";
    }
  };

  if (loading && !profile) return <div style={{ padding: 16 }}>Loading…</div>;

  return (
    <div className="elective-container" style={{ padding: 16 }}>
      {/* Topbar with profile + logout */}
      <header className="topbar">
        <div className="user-block" title={profile?.email || profile?.roll || ""}>
          <div className="avatar">{getInitials(profile?.name)}</div>
          <div className="user-meta">
            <div className="user-name">{profile?.name || "Student"}</div>
            <div className="user-sub">
              {profile?.roll || profile?.regNo || profile?.email || "—"}
            </div>
          </div>
        </div>
        <button className="logout-btn" onClick={handleLogout} aria-label="Log out">
          Logout
        </button>
      </header>

      <h2 className="title" style={{ marginBottom: 12 }}>Student Elective Portal</h2>

      {/* Step 0 — Details */}
      {!locked && step === 0 && (
        <UserDetailsForm
          onSubmit={(details) => {
            setProfile((prev) => ({ ...(prev || {}), ...details }));
            setStep(1);
          }}
          initial={profile || undefined}
        />
      )}

      {/* Step 1 — Preference selection */}
      {!locked && step === 1 && (
        <form onSubmit={saveDetailsAndPreferences}>
          {profile && <TinyMeta profile={profile} />}

          <h3 className="subtitle">Select Your Top 5 Elective Preferences</h3>

          {loadingSubjects ? (
            <p style={{ marginTop: 12 }}>Loading subjects…</p>
          ) : filteredSubjects.length === 0 ? (
            <p style={{ marginTop: 12 }}>No subjects found for your year/semester.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="elective-table" style={{ width: "100%", marginTop: 12 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left" }}>Elective</th>
                    {preferenceLevels.map((level) => (
                      <th key={level}>{level}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {electives.map((s) => (
                    <tr key={s.id}>
                      <td style={{ paddingRight: 8 }}>{s.label}</td>
                      {preferenceLevels.map((level) => (
                        <td key={level} style={{ textAlign: "center" }}>
                          <input
                            type="radio"
                            name={s.id}
                            checked={preferences[s.id] === level}
                            onChange={() => handlePrefTick(s.id, level)}
                            aria-label={`Set ${s.label} as #${level}`}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <ErrorBanner message={err} />

          <div className="btn-group" style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button type="button" className="back-btn" onClick={() => setStep(0)}>
              ⬅ Back
            </button>
            <button type="submit" className="next-btn" disabled={loading}>
              {loading ? "Saving..." : "Submit Preferences"}
            </button>
          </div>
        </form>
      )}

      {/* Step 2 — Review */}
      {(locked || step === 2) && (
        <div className="step-section" style={{ marginTop: 12 }}>
          <PreferenceListView
            preferences={preferences}
            subjects={subjects}       // full list
            prefLabels={prefLabels}   // fallback labels
            loading={loadingSubjects} // loading flag
          />
          <div className="btn-group" style={{ display: "flex", gap: 8, marginTop: 12 }}>
            {!locked && <button className="back-btn" onClick={() => setStep(1)}>⬅ Back</button>}
            <button className="next-btn" onClick={fetchMyAllocation} disabled={loading}>
              {loading ? "Checking..." : "Next ➡ Allocation"}
            </button>
          </div>
          <ErrorBanner message={err} />
        </div>
      )}

      {/* Step 3 — Allocation */}
      {step === 3 && (
        <div className="step-section" style={{ marginTop: 12 }}>
          <AllocatedSubjectView allocatedData={allocatedData} />
          <div className="btn-group" style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button className="next-btn" onClick={() => setStep(4)}>
              Next ➡ Download Slip
            </button>
          </div>
          <ErrorBanner message={err} />
        </div>
      )}

      {/* Step 4 — Slip */}
      {step === 4 && (
        <div className="step-section" style={{ marginTop: 12 }}>
          <DownloadSlip allocation={allocatedData} />
        </div>
      )}
    </div>
  );
}
