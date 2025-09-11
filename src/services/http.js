// src/services/http.js
import axios from "axios";
import { getToken, getRefreshToken, setToken } from "../utils/auth";

// ====== Resolução robusta da base URL ======
const MODE = import.meta.env.MODE; // "development" | "production" | "preview" ...
let API_BASE = (import.meta.env.VITE_API_URL || "").trim();

// Em dev/preview locais, force localhost se estiver rodando em 127/localhost
const isLocalHost =
  typeof window !== "undefined" &&
  /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname);

// Se o build veio com domínio de produção mas estou em localhost, derrubo para 4001
if (
  isLocalHost &&
  (!API_BASE || /^https?:\/\/api\.seudominio\.com/i.test(API_BASE))
) {
  API_BASE = "http://localhost:4001";
}

// Fallback final de segurança
if (!API_BASE) {
  API_BASE = isLocalHost ? "http://localhost:4001" : "/api";
}

// (opcional) logar uma única vez para conferir o que está indo
// Remova depois de validar.
if (typeof window !== "undefined") {
  console.log(
    "[HTTP] MODE:",
    MODE,
    "| VITE_API_URL:",
    import.meta.env.VITE_API_URL,
    "| usando:",
    API_BASE
  );
}

// ====== Client axios ======
const http = axios.create({
  baseURL: API_BASE.replace(/\/+$/, ""), // evita barra duplicada
  withCredentials: false,
  timeout: 20000,
});

// Injeta Bearer token
http.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Refresh automático em 401
let refreshing = null;

http.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status = error?.response?.status;
    const original = error?.config;

    if (status === 401 && !original?._retry) {
      original._retry = true;
      try {
        if (!refreshing) {
          const refreshToken = getRefreshToken();
          refreshing = axios.post(`${http.defaults.baseURL}/token/refresh`, {
            refreshToken,
          });
        }
        const { data } = await refreshing;
        refreshing = null;
        if (data?.token) {
          setToken(data.token);
          original.headers = original.headers || {};
          original.headers.Authorization = `Bearer ${data.token}`;
          return http(original);
        }
      } catch {
        refreshing = null;
      }
    }
    return Promise.reject(error);
  }
);

// Helpers
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

export { http, get, post, put };
export default http;
