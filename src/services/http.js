// src/services/http.js
import axios from "axios";
import { getToken, getRefreshToken, setToken } from "../utils/auth";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4001";

// Cliente axios central
const http = axios.create({
  baseURL: API_BASE,
  withCredentials: false,
  timeout: 20000,
});

// Injeta o Bearer token em todas as requisições
http.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
// --- DEBUG: logar toda request ---
http.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  // 🔎 LOG: método + URL completa + params
  const url = `${config.baseURL || ""}${config.url || ""}`;
  console.log("[HTTP]", config.method?.toUpperCase(), url, {
    params: config.params,
    data: config.data,
  });
  return config;
});

// Refresh automático de token em 401
let refreshing = null;
http.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status = error?.response?.status;
    const original = error?.config;

    if (status === 401 && !original?._retry) {
      original._retry = true;

      try {
        // evita múltiplos refresh em paralelo
        if (!refreshing) {
          const refreshToken = getRefreshToken();
          refreshing = axios.post(`${API_BASE}/token/refresh`, {
            refreshToken,
          });
        }
        const { data } = await refreshing;
        refreshing = null;

        if (data?.token) {
          setToken(data.token);
          original.headers = original.headers || {};
          original.headers.Authorization = `Bearer ${data.token}`;
          return http(original); // repete a chamada original
        }
      } catch {
        refreshing = null;
      }
    }

    // Propaga o erro (quem chamou decide tratar)
    return Promise.reject(error);
  }
);

/* -------- helpers com retorno .data -------- */
async function get(path, params = {}) {
  const res = await http.get(path, { params });
  return res?.data ?? null;
}

async function post(path, body = {}, options = {}) {
  const res = await http.post(path, body, options);
  return res?.data ?? null;
}

async function put(path, body = {}, options = {}) {
  const res = await http.put(path, body, options);
  return res?.data ?? null;
}

/* -------- exports -------- */
// nomeado (para quem usa { get, post, put } ou { http })
export { http, get, post, put };
// default (para quem usa import http from "./http")
export default http;
