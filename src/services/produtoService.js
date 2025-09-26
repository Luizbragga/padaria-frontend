import { http, get, post, put, del } from "./http";

// GET /produtos?padaria=<id>
export async function listarProdutos(params = {}) {
  const data = await get("/produtos", params);
  return Array.isArray(data) ? data : data?.produtos ?? data ?? [];
}

export async function criarProduto(payload) {
  return await post("/produtos", payload);
}

export async function atualizarProduto(id, payload) {
  return await put(`/produtos/${id}`, payload);
}

export async function excluirProduto(id) {
  return await del(`/produtos/${id}`);
}
