// src/services/entregaService.js
import axios from "axios";
import { getToken } from "../utils/auth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// 👇 (já existia) — só padronizei a URL e passei padariaId via params
export const buscarEntregasTempoReal = async (padariaId) => {
  const token = getToken();
  if (!padariaId || !token) return [];

  const resp = await axios.get(`${API_URL}/analitico/entregas-tempo-real`, {
    headers: { Authorization: `Bearer ${token}` },
    params: { padaria: padariaId },
  });

  return resp.data;
};

// 👇 (nova) — usada pela página /entregador/entregas
export const listarMinhasEntregas = async () => {
  const token = getToken();

  const resp = await axios.get(`${API_URL}/entregas/minhas`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return resp.data || [];
};
