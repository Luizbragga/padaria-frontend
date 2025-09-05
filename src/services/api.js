// src/services/api.js
import { post as httpPost } from "./http";

export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4001";

// POST genérico usando o cliente central (com refresh automático)
export async function post(path, body, options = {}) {
  // usa o helper post nomeado do http.js
  return await httpPost(path, body, options);
}
