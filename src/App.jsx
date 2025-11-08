// src/App.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Student pages
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import ElectivePreferenceAllocation from "./Scomponent/ElectivePreferenceAllocation.jsx";
import PreferenceListView from "./Scomponent/PreferenceListView.jsx";
import AllocatedSubjectView from "./Scomponent/AllocatedSubjectView.jsx";
import DownloadSlip from "./Scomponent/DownloadSlip.jsx";
import UserDetailsForm from "./Scomponent/UserDetailsForm.jsx";
import MyAllocation from "./Scomponent/MyAllocation.jsx";
import ElectiveFlow from "./Scomponent/ElectiveFlow.jsx";

// Faculty/Admin pages
import Upload from "./Fcomponent/Upload.jsx";
import Subjects from "./Fcomponent/Subjects.jsx";
import Results from "./Fcomponent/Results.jsx";
import Allocation from "./Fcomponent/Allocation.jsx";
import AdminDashboard from "./Acomponent/AdminDashboard.jsx";

import ProtectedRoute from "./components/ProtectedRoute.jsx";

const App = () => {
  return (
    <Routes>
      {/* Land on landingPage */}
      <Route path="/" element={<Navigate to="/Login" replace />} />

      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Signup />} />

      {/* Student */}
      <Route
        path="/student/details"
        element={
          <ProtectedRoute roles={["student"]}>
            <UserDetailsForm />
          </ProtectedRoute>
        }
      />
      
<Route path="/student/preferences" element={<ElectiveFlow />} />
<Route path="/student/allocation" element={<ElectiveFlow />} />
<Route path="/student/slip" element={<ElectiveFlow />} />
      <Route
        path="/student/preferences"
        element={
          <ProtectedRoute roles={["student"]}>
            <ElectivePreferenceAllocation />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/preference-list"
        element={
          <ProtectedRoute roles={["student"]}>
            <PreferenceListView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/allocated"
        element={
          <ProtectedRoute roles={["student"]}>
            <AllocatedSubjectView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/slip"
        element={
          <ProtectedRoute roles={["student"]}>
            <DownloadSlip />
          </ProtectedRoute>
        }
      />

      {/* Faculty / Coordinator */}
      <Route
        path="/faculty/subjects"
        element={
          <ProtectedRoute roles={["coordinator", "admin"]}>
            <Subjects />
          </ProtectedRoute>
        }
      />
      <Route
        path="/faculty/upload"
        element={
          <ProtectedRoute roles={["coordinator", "admin"]}>
            <Upload />
          </ProtectedRoute>
        }
      />
      <Route
        path="/faculty/allocation"
        element={
          <ProtectedRoute roles={["coordinator", "admin"]}>
            <Allocation />
          </ProtectedRoute>
        }
      />
      <Route
        path="/faculty/results"
        element={
          <ProtectedRoute roles={["coordinator", "admin"]}>
            <Results />
          </ProtectedRoute>
        }
      />

      {/* Admin */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* Redirects */}
      <Route path="/home" element={<Navigate to="/login" replace />} />
      <Route path="/faculty" element={<Navigate to="/faculty/subjects" replace />} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/login" replace />} />
      <Route path="/student/allocation" element={<MyAllocation />} />
    </Routes>
  );
};

export default App;
