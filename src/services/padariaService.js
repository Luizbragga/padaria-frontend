// src/services/padariaService.js
import axios from "axios";
import { http } from "./http";
import { getToken } from "../utils/auth";

const API_URL = import.meta.env?.VITE_API_URL || "http://localhost:3000";

function authHeader() {
  const token = getToken();
  return { Authorization: `Bearer ${token}` };
}

/** Lista todas as padarias (admin/gerente) */
export async function listarPadarias() {
  const { data } = await axios.get(`${API_URL}/padarias`, {
    headers: authHeader(),
  });
  // backend pode devolver [{...}] ou { padarias:[...] }
  return Array.isArray(data) ? data : data?.padarias ?? [];
}

/**
 * Altera status da padaria
 * acao: "ativar" | "desativar"
 */
export async function alterarStatusPadaria(id, acao) {
  if (!["ativar", "desativar"].includes(acao)) {
    throw new Error("Ação inválida ao alterar status da padaria");
  }
  const { data } = await axios.patch(
    `${API_URL}/padarias/${id}/${acao}`,
    null,
    { headers: authHeader() }
  );
  return data;
}
// (NOVA) criar padaria
export async function criarPadaria({ nome, cidade, ativa = true }) {
  const payload = { nome, cidade, ativa };
  const { data } = await http.post("/padarias", payload);
  return data;
}

export async function atualizarPadaria(id, payload) {
  const { data } = await http.patch(`/padarias/${id}`, payload);
  return data;
}
/** Deleta uma padaria */
export async function deletarPadaria(id) {
  const { data } = await axios.delete(`${API_URL}/padarias/${id}`, {
    headers: authHeader(),
  });
  return data;
}
// ------- Rotas (admin) -------
// ZERO-MOD 2025-09-10: usar /rotas; se o projeto tiver /admin/rotas em outra versão, fazemos fallback
// ZERO-MOD 2025-09-10: usar /rotas; se não existir, tentar /admin/rotas
export async function listarRotasPadaria(padariaId) {
  try {
    const { data } = await http.get("/rotas", {
      params: { padaria: padariaId },
    });
    return Array.isArray(data) ? data : data?.rotas ?? [];
  } catch (e) {
    if (e?.response?.status === 404) {
      const { data } = await http.get("/admin/rotas", {
        params: { padaria: padariaId },
      });
      return Array.isArray(data) ? data : data?.rotas ?? [];
    }
    throw e;
  }
}

export async function criarRota({ padaria, nome, ativa = true }) {
  const { data } = await http.post("/admin/rotas", { padaria, nome, ativa });
  return data;
}
export async function atualizarRota(id, payload) {
  const { data } = await http.patch(`/admin/rotas/${id}`, payload);
  return data;
}
export async function deletarRota(id) {
  const { data } = await http.delete(`/admin/rotas/${id}`);
  return data;
}
