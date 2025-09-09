// src/services/usuarioService.js
import { http } from "./http";

/**
 * Criar usuário (ADMIN; gerente pode criar entregador)
 * Campos: { nome, senha, role, padaria?, ativo? }
 */
export async function criarUsuario({
  nome,
  senha,
  role,
  padaria,
  ativo = true,
}) {
  const payload = { nome, senha, role, padaria, ativo };
  const { data } = await http.post("/api/usuarios", payload);
  return data;
}

/**
 * Listar usuários
 * - Admin: pode filtrar por ?padaria=...
 * - Gerente: retorna apenas da própria padaria (conforme backend)
 */
export async function listarUsuarios(params = {}) {
  const { data } = await http.get("/api/usuarios", { params });
  return Array.isArray(data) ? data : data?.usuarios ?? data;
}

/** Atualizar usuário (parcial) */
export async function atualizarUsuario(id, payload) {
  const { data } = await http.patch(`/api/usuarios/${id}`, payload);
  return data;
}

/** Alterar senha de um usuário */
export async function alterarSenha(id, senha) {
  const { data } = await http.patch(`/api/usuarios/${id}/senha`, { senha });
  return data;
}

/** Excluir usuário */
export async function excluirUsuario(id) {
  const { data } = await http.delete(`/api/usuarios/${id}`);
  return data;
}

/** Listar padarias para popular dropdowns */
export async function listarPadarias() {
  // sua rota de padarias está sem /api no backend, então mantém assim:
  const { data } = await http.get("/padarias");
  return Array.isArray(data) ? data : data?.padarias ?? [];
}
