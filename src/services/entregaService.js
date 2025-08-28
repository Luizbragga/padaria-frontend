// src/services/entregaService.js
import axios from "axios";
import { getToken } from "../utils/auth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

function auth() {
  return { Authorization: `Bearer ${getToken()}` };
}

/** Entregas em tempo real (dashboard gerente) */
export async function buscarEntregasTempoReal(padariaId) {
  if (!padariaId || !getToken()) return [];
  try {
    const { data } = await axios.get(
      `${API_URL}/analitico/entregas-tempo-real`,
      {
        headers: auth(),
        params: { padaria: padariaId },
      }
    );
    return Array.isArray(data) ? data : data?.entregas ?? [];
  } catch (e) {
    console.error("buscarEntregasTempoReal:", e);
    return [];
  }
}

/** Minhas entregas (tabela do entregador) */
export async function listarMinhasEntregas() {
  if (!getToken()) return [];
  try {
    const { data } = await axios.get(`${API_URL}/entregas/minhas`, {
      headers: auth(),
    });
    return Array.isArray(data) ? data : data?.entregas ?? [];
  } catch (e) {
    console.error("listarMinhasEntregas:", e);
    return [];
  }
}

/* Opcional (para usarmos depois e remover axios direto do componente):
export async function concluirEntrega(id) {
  const { data } = await axios.put(`${API_URL}/entregas/${id}/concluir`, {}, { headers: auth() });
  return data;
}
export async function registrarPagamento(id, { valor, forma }) {
  const { data } = await axios.post(`${API_URL}/entregas/${id}/registrar-pagamento`, { valor, forma }, { headers: auth() });
  return data;
}
*/
