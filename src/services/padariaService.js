// src/services/padariaService.js
import axios from "axios";
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

/** Deleta uma padaria */
export async function deletarPadaria(id) {
  const { data } = await axios.delete(`${API_URL}/padarias/${id}`, {
    headers: authHeader(),
  });
  return data;
}
