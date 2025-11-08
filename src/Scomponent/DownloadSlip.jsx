import React, { useRef } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "./DownloadSlip.css";

const DownloadSlip = ({ allocation }) => {
  const slipRef = useRef();

  const generatePDF = async () => {
    if (!slipRef.current) return;
    const canvas = await html2canvas(slipRef.current, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth - 20; // 10mm margin each side
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let y = 10;
    if (imgHeight > pageHeight - 20) {
      // split over multiple pages if needed
      let remainingHeight = imgHeight;
      const canvasRatio = canvas.width / canvas.height;
      const pageImgHeight = pageHeight - 20;
      while (remainingHeight > 0) {
        pdf.addImage(
          imgData,
          "PNG",
          10,
          y,
          imgWidth,
          Math.min(pageImgHeight, remainingHeight)
        );
        remainingHeight -= pageImgHeight;
        if (remainingHeight > 0) pdf.addPage();
      }
    } else {
      pdf.addImage(imgData, "PNG", 10, y, imgWidth, imgHeight);
    }

    const fileRoll = allocation?.rollNumber || "Student";
    pdf.save(`${fileRoll}_Confirmation_Slip.pdf`);
  };

  const a = allocation || {
    studentName: "Nihari Nandikam",
    rollNumber: "22CS101",
    branch: "Computer Science and Engineering",
    year: "III Year",
    allocatedSubject: "None",
    confirmationStatus: "Not Allocated",
    allocatedOn: null,
  };

  return (
    <div className="download-container">
      {/* Slip Card */}
      <div ref={slipRef} className="slip-card">
        <h2 style={{color:'black'}}>Elective Confirmation Slip</h2>
        <p style={{color:'black'}}><strong>Name:</strong> {a.studentName}</p>
        <p style={{color:'black'}}><strong>Roll No:</strong> {a.rollNumber}</p>
        <p style={{color:'black'}}><strong>Branch:</strong> {a.branch}</p>
        <p style={{color:'black'}}><strong>Year:</strong> {a.year}</p>
        <hr />
        <p style={{color:'black'}}><strong>Allocated Subject:</strong> {a.allocatedSubject}</p>
        <p style={{color:'black'}}><strong>Status:</strong> {a.confirmationStatus}</p>
        <p style={{color:'black'}}>
          <strong>Date:</strong>{" "}
          {a.allocatedOn ? new Date(a.allocatedOn).toLocaleString() : "--"}
        </p>

        <div className="signature-section">
          <div className="signature-box" style={{color:'black', border:'2px, dashed, black',padding:'6px'}}>Student Signature</div>
          <div className="signature-box" style={{color:'black', border:'2px, dashed, black',padding:'6px'}}>Authorized Signature</div>
        </div>
      </div>

      {/* Buttons below the slip */}
      <div className="button-container">
        <button className="download-btn" onClick={generatePDF}style={{color:'black'}}>
          Download Confirmation Slip (PDF)
        </button>
      </div>
    </div>
  );
};

export default DownloadSlip;
