import React, { useState } from "react";
import "./UserDetailsForm.css";

const UserDetailsForm = ({ onSubmit }) => {
  const [formData, setFormData] = useState({
    name: "",
    regNo: "",
    year: "",        // 1–4 (string)
    semester: "",    // 1–8 (string)
    branch: "",
    cgpa: "",
    previousElective: "",
  });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const { name, regNo, year, semester, branch, cgpa } = formData;
    if (!name || !regNo || !year || !semester || !branch || !cgpa) {
      setError("⚠ Please fill all mandatory fields.");
      return;
    }
    const cg = Number(cgpa);
    if (!Number.isFinite(cg) || cg < 0 || cg > 10) {
      setError("Please enter valid CGPA (0–10).");
      return;
    }
    setError("");
    onSubmit({
      ...formData,
      year: String(year),
      semester: String(semester),
      cgpa: cg,
    });
  };

  return (
    <div className="user-details-container">
      <h2 className="form-title">Student Details</h2>
      <form onSubmit={handleSubmit} className="user-form">
        <div className="form-group">
          <label>Full Name <span className="required">*</span></label>
          <input name="name" placeholder="enter full name" value={formData.name} onChange={handleChange} />
        </div>

        <div className="form-group">
          <label>Register Number <span className="required">*</span></label>
          <input name="regNo" placeholder="enter register number" value={formData.regNo} onChange={handleChange} />
        </div>

        <div className="form-group">
          <label>Year <span className="required">*</span></label>
          <select name="year" value={formData.year} onChange={handleChange} required>
            <option value="">-- Select Year --</option>
            <option value="1">I Year</option>
            <option value="2">II Year</option>
            <option value="3">III Year</option>
            <option value="4">IV Year</option>
          </select>
        </div>

        <div className="form-group">
          <label>Semester <span className="required">*</span></label>
          <select name="semester" value={formData.semester} onChange={handleChange} required>
            <option value="">-- Select Semester --</option>
            {[1,2,3,4,5,6,7,8].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Branch <span className="required">*</span></label>
          <input name="branch" value={formData.branch} onChange={handleChange} placeholder="CSE / ECE / MECH ..." />
        </div>

        <div className="form-group">
          <label>CGPA <span className="required">*</span></label>
          <input type="number" placeholder="eg: 8.2" step="0.01" name="cgpa" value={formData.cgpa} onChange={handleChange} />
        </div>

        <div className="form-group">
          <label>Previous Elective (Optional)</label>
          <input name="previousElective" placeholder="enter previous elective" value={formData.previousElective} onChange={handleChange} />
        </div>

        {error && <p className="error-message">{error}</p>}

        <div className="btn-container">
          <button type="submit" className="next-btn">Next ➡ Continue</button>
        </div>
      </form>
    </div>
  );
};

export default UserDetailsForm;
