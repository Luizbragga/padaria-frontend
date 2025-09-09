// src/services/clienteService.js
import { http } from "./http";

/**
 * Busca dados básicos do cliente (endereço, telefone, rota, observações).
 */
export async function buscarClienteBasico(clienteId) {
  try {
    const { data } = await http.get(`/api/clientes/${clienteId}/basico`);
    return data; // { id, nome, endereco, rota, telefone, email, observacoes, location }
  } catch (e1) {
    console.error(
      "GET /api/clientes/:id/basico falhou:",
      e1?.response?.status,
      e1?.response?.data || e1?.message
    );
    // fallback: alguns backends retornam todos os campos no GET /api/clientes/:id
    try {
      const { data } = await http.get(`/api/clientes/${clienteId}`);
      return data;
    } catch (e2) {
      console.error(
        "GET /api/clientes/:id (fallback) falhou:",
        e2?.response?.status,
        e2?.response?.data || e2?.message
      );
      return null;
    }
  }
}

/** Atualiza apenas as observações do cliente. */
export async function atualizarObservacoesCliente(clienteId, observacoes) {
  const { data } = await http.patch(`/api/clientes/${clienteId}/observacoes`, {
    observacoes,
  });
  return data;
}

/** Atualiza dados básicos do cliente (endereco, telefone, rota, email). */
export async function atualizarCliente(clienteId, payload) {
  const { data } = await http.patch(`/api/clientes/${clienteId}`, payload);
  return data;
}

/**
 * Criar cliente
 * body: { nome, endereco, rota, padaria, location: {lat,lng}, telefone?, email?, observacoes?, inicioCicloFaturamento? }
 */
export async function criarCliente(payload) {
  const { data } = await http.post(`/api/clientes`, payload);
  return data;
}

/** Listar clientes (admin pode filtrar por padaria; gerente já recebe da própria) */
export async function listarClientes(params = {}) {
  const { data } = await http.get(`/api/clientes`, { params });
  return Array.isArray(data) ? data : data?.clientes ?? data;
}
