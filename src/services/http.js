// src/services/http.js
import axios from "axios";
import {
  getToken,
  getRefreshToken,
  setToken,
  setRefreshToken,
} from "../utils/auth";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4001";

const http = axios.create({
  baseURL: API_BASE,
  withCredentials: false, // usamos Bearer, não cookies
});

// ---- Request: injeta o token automaticamente
http.interceptors.request.use((config) => {
  const t = getToken();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

// ---- Response: tenta refresh 1x em 401 e repete a requisição original
let isRefreshing = false;
let subscribers = [];

function subscribeTokenRefresh(cb) {
  subscribers.push(cb);
}
function onRefreshed(newToken) {
  subscribers.forEach((cb) => cb(newToken));
  subscribers = [];
}

http.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { response, config } = error;
    if (!response) return Promise.reject(error);

    // evita loop
    if (response.status !== 401 || config.__retry) {
      return Promise.reject(error);
    }

    // se outro refresh já está em andamento, fila a repetição
    if (isRefreshing) {
      return new Promise((resolve) => {
        subscribeTokenRefresh((newToken) => {
          config.headers.Authorization = `Bearer ${newToken}`;
          config.__retry = true;
          resolve(http(config));
        });
      });
    }

    // tenta o refresh agora
    isRefreshing = true;
    try {
      const rt = getRefreshToken();
      if (!rt) throw error;

      const { data } = await axios.post(`${API_BASE}/token/refresh`, {
        refreshToken: rt,
      });

      // salva tokens
      if (data?.token) setToken(data.token);
      if (data?.refreshToken) setRefreshToken(data.refreshToken);

      isRefreshing = false;
      onRefreshed(data.token);

      // repete original
      config.headers.Authorization = `Bearer ${data.token}`;
      config.__retry = true;
      return http(config);
    } catch (e) {
      isRefreshing = false;
      subscribers = [];
      return Promise.reject(error);
    }
  }
);

export default http;
