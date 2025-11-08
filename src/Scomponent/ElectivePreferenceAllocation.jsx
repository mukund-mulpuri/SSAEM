import React, { useEffect, useMemo, useState } from "react";
import UserDetailsForm from "./UserDetailsForm";
import PreferenceListView from "./PreferenceListView";
import AllocatedSubjectView from "./AllocatedSubjectView";
import DownloadSlip from "./DownloadSlip";
import "./ElectivePreferenceAllocation.css";

import { updateMe, listSubjects, submitPreferences, getMyAllotment } from "../api/student";

const SESSION_ID = "";
const preferenceLevels = [1, 2, 3, 4, 5];

const ElectivePreferenceAllocation = () => {
  const [subjects, setSubjects] = useState([]);
  const [userDetails, setUserDetails] = useState(null);

  // preferences: { [subjectId]: rank } -- ALWAYS _id
  const [preferences, setPreferences] = useState({});
  // captured labels: { [subjectId]: "CODE — Title" }
  const [prefLabels, setPrefLabels] = useState({});

  const [allocatedData, setAllocatedData] = useState(null);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Build lookup by _id for robust label resolution
  const subjectsById = useMemo(() => {
    const m = new Map();
    (subjects || []).forEach((s) => {
      const id = String(s._id);
      const code = s.code || "";
      const title = s.title || s.name || "";
      m.set(id, { code, title, label: code && title ? `${code} — ${title}` : (code || title || id) });
    });
    return m;
  }, [subjects]);

  // Filter for the pick list visually
  const filteredSubjects = useMemo(() => {
    if (!Array.isArray(subjects)) return [];
    if (!userDetails) return subjects;
    const y = String(userDetails.year || "");
    const sem = String(userDetails.semester || "");
    return subjects.filter(
      (s) => String(s.year || "") === y && String(s.semester || "") === sem
    );
  }, [subjects, userDetails]);

  // Visual rows for the pick table
  const electives = useMemo(() => {
    return filteredSubjects.map((s) => {
      const id = String(s._id); // ✅ _id only
      const info = subjectsById.get(id);
      return {
        id,
        label: info?.label || id,
      };
    });
  }, [filteredSubjects, subjectsById]);

  // Step-0 → save profile immediately, then load subjects
  const handleDetailsSubmit = async (details) => {
    setError("");
    setLoading(true);
    try {
      // Persist profile so backend filtering works
      await updateMe({
        name: details.name,
        regNo: details.regNo,
        year: details.year,
        semester: details.semester,
        branch: details.branch,
        cgpa: details.cgpa,
        previousElective: details.previousElective,
      });
      setUserDetails(details);

      // Load subjects using same year/semester
      const subs = await listSubjects(SESSION_ID, {
        year: details.year,
        semester: details.semester,
      });
      setSubjects(Array.isArray(subs) ? subs : []);
      setStep(1);
    } catch (e) {
      setError(e?.response?.data?.error || "Failed to save details / load subjects");
    } finally {
      setLoading(false);
    }
  };

  // When a rank is selected, record rank and capture label
  const handlePreferenceChange = (subjectId, level) => {
    const sid = String(subjectId); // must be _id
    setPreferences((prev) => {
      const u = { ...prev };
      // keep ranks unique
      for (const key of Object.keys(u)) {
        if (u[key] === level) u[key] = null;
      }
      u[sid] = level;
      return u;
    });

    const info = subjectsById.get(sid);
    if (info) {
      setPrefLabels((prev) => ({ ...prev, [sid]: info.label }));
    }
  };

  // Submit preferences
  const handleSubmitPreferences = async (e) => {
    e.preventDefault();
    const filled = Object.entries(preferences).filter(([, r]) => !!r);
    if (filled.length < 5) {
      setError("⚠ Please select at least 5 preferences before proceeding.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const choices = filled.map(([subjectId, rank]) => ({
        subject: subjectId,               // ✅ _id
        rank: Number(rank),
      }));
      await submitPreferences(SESSION_ID, choices);
      setStep(2);
    } catch (e2) {
      setError(e2?.response?.data?.error || "Failed to submit preferences");
    } finally {
      setLoading(false);
    }
  };

  // Fetch allocation
  const fetchAllocation = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getMyAllotment(SESSION_ID);
      if (!res.assigned) {
        setAllocatedData({
          studentName: userDetails?.name,
          rollNumber: userDetails?.regNo,
          branch: userDetails?.branch,
          year: userDetails?.year,
          allocatedSubject: "None",
          confirmationStatus: "Not Allocated",
          allocatedOn: null,
        });
      } else {
        setAllocatedData({
          studentName: userDetails?.name,
          rollNumber: userDetails?.regNo,
          branch: userDetails?.branch,
          year: userDetails?.year,
          allocatedSubject: `${res.subject.code ? res.subject.code + " — " : ""}${res.subject.title}`,
          confirmationStatus: "Allocated",
          allocatedOn: new Date().toISOString(),
        });
      }
      setStep(3);
    } catch (e3) {
      setError(e3?.response?.data?.error || "Failed to fetch allotment");
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => setStep((p) => p + 1);
  const prevStep = () => setStep((p) => p - 1);

  return (
    <div className="elective-container">
      <h2 className="title">Student Elective Portal</h2>

      {/* Step 0: Student details */}
      {step === 0 && (
        <UserDetailsForm onSubmit={handleDetailsSubmit} />
      )}

      {/* Step 1: Select preferences */}
      {step === 1 && (
        <form onSubmit={handleSubmitPreferences}>
          {userDetails && (
            <div style={{ marginBottom: 12 }}>
              <strong>Year:</strong> {userDetails.year} &nbsp; | &nbsp;
              <strong>Semester:</strong> {userDetails.semester}
            </div>
          )}

          <h3 className="subtitle">Select Your Top 5 Elective Preferences</h3>

          {subjects.length === 0 ? (
            <p style={{ marginTop: 12 }}>{loading ? "Loading subjects…" : "No subjects found for your criteria."}</p>
          ) : (
            <table className="elective-table">
              <thead>
                <tr>
                  <th>Elective</th>
                  {preferenceLevels.map((level) => (
                    <th key={level}>{level}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {electives.map((s) => (
                  <tr key={s.id}>
                    <td>{s.label}</td>
                    {preferenceLevels.map((level) => (
                      <td key={level}>
                        <input
                          type="radio"
                          name={s.id}
                          checked={preferences[s.id] === level}
                          onChange={() => handlePreferenceChange(s.id, level)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {error && <p className="error-message">{error}</p>}

          <div className="btn-group">
            <button type="button" className="back-btn" onClick={prevStep} disabled={loading}>
              ⬅ Back
            </button>
            <button type="submit" className="next-btn" disabled={loading}>
              {loading ? "Saving..." : "Next ➡"}
            </button>
          </div>
        </form>
      )}

      {/* Step 2: Review preferences */}
      {step === 2 && (
        <div className="step-section">
          <PreferenceListView
            preferences={preferences}
            subjects={subjects}              // full list
            prefLabels={prefLabels}          // captured labels
          />
          <div className="btn-group">
            <button className="back-btn" onClick={prevStep} disabled={loading}>⬅ Back</button>
            <button className="next-btn" onClick={fetchAllocation} disabled={loading}>
              {loading ? "Checking..." : "Next ➡ View Allocation Details"}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Allocation */}
      {step === 3 && allocatedData && (
        <div className="step-section">
          <AllocatedSubjectView allocatedData={allocatedData} />
          <div className="btn-group">
            <button className="back-btn" onClick={prevStep}>⬅ Back</button>
            <button className="next-btn" onClick={nextStep}>
              Next ➡ View Confirmation Slip
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Slip */}
      {step === 4 && allocatedData && (
        <div className="step-section">
          <DownloadSlip allocation={allocatedData} onBack={prevStep} />
        </div>
      )}
    </div>
  );
};

export default ElectivePreferenceAllocation;
