import { get, post, put, del } from "./http";

export async function listarUsuarios(params = {}) {
  const data = await get("/usuarios", params);
  return Array.isArray(data) ? data : data?.usuarios ?? data ?? [];
}

export async function criarUsuario(payload) {
  return await post("/usuarios", payload);
}

export async function atualizarUsuario(id, payload) {
  return await put(`/usuarios/${id}`, payload);
}

export async function excluirUsuario(id) {
  return await del(`/usuarios/${id}`);
}
