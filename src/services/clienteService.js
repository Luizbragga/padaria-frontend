import { get, post, put, del } from "./http";

export async function buscarClienteBasico(clienteId) {
  try {
    return await get(`/clientes/${clienteId}/basico`);
  } catch (e1) {
    try {
      return await get(`/clientes/${clienteId}`);
    } catch {
      return null;
    }
  }
}

export async function atualizarObservacoesCliente(clienteId, observacoes) {
  return await put(`/clientes/${clienteId}/observacoes`, { observacoes });
}

export async function atualizarCliente(clienteId, payload) {
  return await put(`/clientes/${clienteId}`, payload);
}

export async function criarCliente(payload) {
  return await post(`/clientes`, payload);
}

export async function listarClientes(params = {}) {
  const data = await get(`/clientes`, params);
  return Array.isArray(data) ? data : data?.clientes ?? data ?? [];
}

export async function excluirCliente(id) {
  return await del(`/clientes/${id}`);
}

export async function obterPadraoCliente(id) {
  // adiciona um parâmetro _ts para evitar 304/ETag do navegador/proxy
  return await get(`/clientes/${id}/padrao-semanal`, { _ts: Date.now() });
}
