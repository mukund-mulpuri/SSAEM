// src/components/StudentTopNav.jsx
import { useNavigate, NavLink } from "react-router-dom";
import "./StudentTopNav.css";

export default function StudentTopNav() {
  const navigate = useNavigate();
  const name = localStorage.getItem("name") || "Student";
  const role = localStorage.getItem("role") || "student";

  function logout() {
    localStorage.clear();
    navigate("/login");
  }

  return (
    <header className="stu-nav">
      <div className="stu-nav__inner">
        <div className="stu-brand">Smart Elective</div>
        <nav className="stu-links">
          <NavLink to="/student/preferences">Preferences</NavLink>
          <NavLink to="/student/allocation">My Allocation</NavLink>
          <NavLink to="/student/slip">Download Slip</NavLink>
        </nav>
        <div className="stu-me">
          <span className="stu-me__name" title={role}>{name}</span>
          <button className="stu-btn" onClick={logout}>Logout</button>
        </div>
      </div>
    </header>
  );
}
