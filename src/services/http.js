// src/services/http.js
import axios from "axios";
import { getToken, getRefreshToken, setToken } from "../utils/auth";

/* ============ BASE URL PADRONIZADA ============ */
// Usamos VITE_API_URL (ou VITE_API_HOST) e SEMPRE anexamos "/api/".
const HOST =
  (
    import.meta.env.VITE_API_HOST ||
    import.meta.env.VITE_API_URL ||
    ""
  ).trim() || "http://localhost:4001";

// garante 1 barra só entre host e /api/
const API_BASE = HOST.replace(/\/+$/, "") + "/api/";

// log
if (typeof window !== "undefined") {
  console.log("[HTTP] MODE:", import.meta.env.MODE, "| BASE:", API_BASE);
}

// Header extra p/ ngrok
const NEEDS_NGROK_HEADER = /^https:\/\/[a-z0-9-]+\.ngrok-free\.app/i.test(HOST);
const baseHeaders = NEEDS_NGROK_HEADER
  ? { "ngrok-skip-browser-warning": "true" }
  : {};

// cliente axios
const http = axios.create({
  baseURL: API_BASE,
  withCredentials: false,
  timeout: 20000,
  headers: baseHeaders,
});

// token bearer
http.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// helper p/ montar URL absoluta a partir da base do axios
function buildUrl(path) {
  const base = http.defaults.baseURL || API_BASE;
  const u = new URL(path.replace(/^\/+/, ""), base);
  return u.toString();
}

/* ============ REFRESH TOKEN ROBUSTO ============ */
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
          refreshing = axios.post(
            buildUrl("token/refresh"),
            { refreshToken },
            {
              headers: baseHeaders,
              timeout: 15000,
            }
          );
        }
        const { data } = await refreshing;
        refreshing = null;

        if (data?.token) {
          setToken(data.token);
          original.headers = original.headers || {};
          original.headers.Authorization = `Bearer ${data.token}`;
          // repete a requisição original usando o mesmo cliente
          return http(original);
        }
      } catch {
        refreshing = null;
      }
    }
    return Promise.reject(error);
  }
);

/* ============ HELPERS BÁSICOS (sempre data) ============ */
function cleanPath(path = "") {
  if (typeof path !== "string") return "";
  let p = path.trim();
  p = p.replace(/^\/+/, ""); // remove barras iniciais
  if (p === "api") p = "";
  else if (p.startsWith("api/")) p = p.slice(4);
  return p;
}

async function get(path, params = {}) {
  const res = await http.get(cleanPath(path), { params });
  return res?.data ?? null;
}
async function post(path, body = {}, options = {}) {
  const res = await http.post(cleanPath(path), body, options);
  return res?.data ?? null;
}
async function put(path, body = {}, options = {}) {
  const res = await http.put(cleanPath(path), body, options);
  return res?.data ?? null;
}
async function del(path, options = {}) {
  const res = await http.delete(cleanPath(path), options);
  return res?.data ?? null;
}

export { http, get, post, put, del, API_BASE };
export default http;
