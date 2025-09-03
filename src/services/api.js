// src/services/api.js
import http from "./http";

export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4001";

// POST genérico usando o cliente central (com refresh automático)
export async function post(path, body, options = {}) {
  const res = await http.post(path, body, options);
  return res?.data ?? {};
}
