// src/api/auth.js
import axios from "axios";
const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export async function loginApi(arg1, arg2) {
  const payload = typeof arg1 === "object" ? arg1 : { email: arg1, password: arg2 };
  const { data } = await axios.post(`${API}/api/auth/login`, payload, { withCredentials: true });
  return data; // { token, role, name, email }
}

export async function registerApi(payload) {
  const { data } = await axios.post(`${API}/api/auth/register`, payload, { withCredentials: true });
  return data;
}
