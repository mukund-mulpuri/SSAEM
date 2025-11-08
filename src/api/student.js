// src/api/student.js
import axios from "axios";
const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

// DEV ONLY: flip to true to bypass JWT using x-test-role
const DEV_BYPASS = false;

const auth = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
    ...(DEV_BYPASS ? { "x-test-role": localStorage.getItem("role") || "student" } : {}),
  },
  withCredentials: true,
});

// ---- Profile ----
export async function getMyProfile() {
  const { data } = await axios.get(`${API}/api/me`, auth());
  return data;
}
export async function updateMe(payload) {
  const { data } = await axios.put(`${API}/api/me`, payload, auth());
  return data;
}

// ---- Subjects (filtered by backend using student year, etc.) ----
export async function listSubjects(sessionId = "", params = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = `${API}/api/subjects/available${qs ? `?${qs}` : ""}`;
  const { data } = await axios.get(url, auth());
  return data; // [{ _id, code, title, year, semester, ...}]
}

// ---- Preferences ----
export async function getMyPreferences(sessionId = "") {
  const { data } = await axios.get(`${API}/api/me/preferences`, auth());
  return data || { sessionId, choices: [], locked: false };
}
export async function submitPreferences(sessionId = "", choices = []) {
  const { data } = await axios.post(`${API}/api/preferences`, { sessionId, choices }, auth());
  return data;
}

// ---- Allocation ----
export async function getMyAllotment(sessionId = "") {
  const { data } = await axios.get(`${API}/api/allotment`, auth());
  return data;
}
