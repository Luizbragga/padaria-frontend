// src/services/http.js
import axios from "axios";
import { getToken, setToken } from "../utils/auth";

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

// Config de robustez via Vite (com defaults seguros)
const REQUEST_TIMEOUT_MS = Number(
  import.meta.env.VITE_REQUEST_TIMEOUT_MS ?? 20000
);
const MAX_RETRIES = Number(import.meta.env.VITE_MAX_RETRIES ?? 2);

// log só em dev para evitar ruído em produção
const isDev = import.meta.env?.DEV === true;
if (typeof window !== "undefined" && isDev) {
  // Evitar log ruidoso em prod
  console.debug("[HTTP] MODE:", import.meta.env.MODE, "| BASE:", API_BASE);
}

// Header extra p/ ngrok (se aplicável)
const NEEDS_NGROK_HEADER = /^https:\/\/[a-z0-9-]+\.ngrok-free\.app/i.test(HOST);
const baseHeaders = NEEDS_NGROK_HEADER
  ? { "ngrok-skip-browser-warning": "true" }
  : {};

/* ============ CLIENTE AXIOS ============ */
const http = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // mantém contrato atual (refresh via cookie httpOnly)
  timeout: REQUEST_TIMEOUT_MS,
  headers: baseHeaders,
});

// token bearer
http.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`; // mantém contrato
  }
  return config;
});

// helper p/ montar URL absoluta a partir da base do axios
function buildUrl(path) {
  const base = http.defaults.baseURL || API_BASE;
  const u = new URL(String(path || "").replace(/^\/+/, ""), base);
  return u.toString();
}

/* ============ BACKOFF E LOGOUT DURO ============ */
// Backoff exponencial com jitter
function backoffDelay(retry) {
  const base = Math.pow(2, retry) * 500; // 0->500ms, 1->1000ms, 2->2000ms...
  const jitter = Math.floor(Math.random() * 150);
  return base + jitter;
}

// Limpeza total de sessão
function hardLogout() {
  try {
    // tenta apagar o token armazenado
    setToken("");
  } catch {}
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {}
  if (typeof window !== "undefined" && window.location) {
    if (window.location.pathname !== "/login") {
      window.location.replace("/login");
    }
  }
}

/* ============ REFRESH TOKEN + RETRY ROBUSTO ============ */
let refreshing = null;
http.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status = error?.response?.status;
    const original = error?.config || {};

    // 1) 401 → tenta refresh UMA vez
    if (status === 401 && !original._retry) {
      original._retry = true;
      try {
        if (!refreshing) {
          // chama o endpoint de refresh sem enviar refreshToken; o cookie httpOnly será usado
          refreshing = axios.post(
            buildUrl("token/refresh"),
            {},
            {
              withCredentials: true,
              headers: baseHeaders,
              timeout: Math.min(REQUEST_TIMEOUT_MS, 15000),
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

        // sem token novo → encerra sessão
        hardLogout();
        return Promise.reject(error);
      } catch {
        refreshing = null;
        // refresh falhou → encerra sessão
        hardLogout();
        return Promise.reject(error);
      }
    }

    // 2) Retry com backoff para erros transitórios em métodos idempotentes
    const method = String(original.method || "get").toLowerCase();
    const isIdempotent =
      method === "get" || method === "head" || method === "options";

    const retriableStatus =
      status === 0 || // falha de rede
      status === 429 ||
      (typeof status === "number" && status >= 500 && status !== 501);

    original.__retryCount = original.__retryCount || 0;

    if (
      isIdempotent &&
      retriableStatus &&
      original.__retryCount < MAX_RETRIES
    ) {
      const delay = backoffDelay(original.__retryCount);
      original.__retryCount++;
      if (isDev)
        console.debug(
          `[http] retry #${original.__retryCount} in ${delay}ms`,
          original.url
        );
      await new Promise((r) => setTimeout(r, delay));
      return http(original);
    }

    // 3) Demais erros: log leve só em dev
    if (isDev) {
      console.debug("[http] error:", {
        url: original.url,
        method,
        status,
        data: error?.response?.data,
        message: error?.message,
      });
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
