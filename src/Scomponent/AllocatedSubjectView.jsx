import React, { useState, useEffect } from "react";
import "./AllocatedSubjectView.css";

const AllocatedSubjectView = ({ allocatedData }) => {
  const [allocation, setAllocation] = useState({
    studentName: "Nihari Nandikam",
    rollNumber: "22CS101",
    branch: "Computer Science and Engineering",
    year: "III Year",
    allocatedSubject: "None",
    confirmationStatus: "Not Allocated",
    allocatedOn: null,
  });

  useEffect(() => {
    if (allocatedData && typeof allocatedData === "object") {
      setAllocation((prev) => ({ ...prev, ...allocatedData }));
    }
  }, [allocatedData]);

  const statusClass =
    `status-badge ${String(allocation.confirmationStatus || "")
      .toLowerCase()
      .replace(/\s+/g, "-")}`;

  return (
    <div className="allocation-container" style={{color:'black'}}>
      <h2 className="allocation-title" style={{color:'black'}}>Elective Allocation Details</h2>
      <div className="allocation-card" style={{color:'black'}}>
        <p style={{color:'black'}}><strong>Name:</strong> {allocation.studentName}</p>
        <p style={{color:'black'}}><strong>Roll No:</strong> {allocation.rollNumber}</p>
        <p style={{color:'black'}}><strong>Branch:</strong> {allocation.branch}</p>
        <p style={{color:'black'}}><strong>Year:</strong> {allocation.year}</p>
        <p style={{color:'black'}}>
          <strong>Allocated Subject:</strong>{" "}
          <span className="subject" style={{color:'black'}}>{allocation.allocatedSubject}</span>
        </p>
        <p style={{color:'black'}}>
          <strong>Status:</strong>{" "}
          <span className={statusClass} style={{color:'black'}}>
            {allocation.confirmationStatus}
          </span>
        </p>
        {allocation.allocatedOn && (
          <p style={{color:'black'}}>
            <strong>Allocated On:</strong>{" "}
            {new Date(allocation.allocatedOn).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
};

export default AllocatedSubjectView;
