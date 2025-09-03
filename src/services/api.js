// src/services/api.js
export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

// POST genérico com erros decentes
export async function post(path, body, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    body: JSON.stringify(body),
    credentials: "omit", // não precisamos de cookies
  });

  // tenta extrair mensagem útil do backend
  let payload = null;
  try {
    payload = await res.clone().json();
  } catch {
    try {
      payload = await res.text();
    } catch {
      payload = null;
    }
  }

  if (!res.ok) {
    const msg =
      (payload && payload.erro) ||
      (typeof payload === "string" && payload) ||
      `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return typeof payload === "object" ? payload : {};
}
