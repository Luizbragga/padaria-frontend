// src/services/clienteService.js
import { http } from "./http";

/**
 * Busca dados básicos do cliente (endereço, telefone, rota, observações).
 * Endpoint real no backend: /api/clientes/:id/basico
 * (mantém fallback para /api/clientes/:id caso o /basico não exista)
 */
export async function buscarClienteBasico(clienteId) {
  try {
    const { data } = await http.get(`/api/clientes/${clienteId}/basico`);
    return data; // { id, nome, endereco, rota, telefone, email, observacoes, location }
  } catch (e1) {
    try {
      const { data } = await http.get(`/api/clientes/${clienteId}`);
      return data;
    } catch (e2) {
      console.error("buscarClienteBasico:", e1 || e2);
      return null;
    }
  }
}

/**
 * Atualiza apenas as observações do cliente.
 * PATCH /api/clientes/:id/observacoes  { observacoes }
 */
export async function atualizarObservacoesCliente(clienteId, observacoes) {
  const { data } = await http.patch(`/api/clientes/${clienteId}/observacoes`, {
    observacoes,
  });
  return data;
}

/**
 * Atualiza dados básicos do cliente (endereco, telefone, rota, ...).
 * PATCH /api/clientes/:id  { endereco?, telefone?, rota?, email?, ... }
 */
export async function atualizarCliente(clienteId, payload) {
  const { data } = await http.patch(`/api/clientes/${clienteId}`, payload);
  return data;
}
