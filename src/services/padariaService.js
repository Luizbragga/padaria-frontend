import { get, post, put, del } from "./http";

export async function listarPadarias() {
  const data = await get("/padarias");
  return Array.isArray(data) ? data : data?.padarias ?? data ?? [];
}

export async function criarPadaria(payload) {
  return await post("/padarias", payload);
}

// Lista nomes de rotas da padaria.
// 1) Tenta /rotas/nomes (rotas reais via clientes)
// 2) Se vier vazio, usa rotasDisponiveis salvas na padaria
export async function listarRotasPadaria(padariaId) {
  const data = await get(`/padarias/${padariaId}/rotas`);
  const arr = Array.isArray(data) ? data : data?.rotas ?? [];
  // normaliza: sempre strings MAIÚSCULAS
  return arr
    .map((r) => (typeof r === "string" ? r : r?.nome))
    .filter(Boolean)
    .map((r) => String(r).toUpperCase());
}

export async function criarRota(padariaId, payload) {
  return await post(`/padarias/${padariaId}/rotas`, payload);
}
// --- alterar status (ativa/desativa) ---
export async function alterarStatusPadaria(padariaId, ativo) {
  if (!padariaId) throw new Error("padariaId é obrigatório");
  // tentamos um endpoint específico; se não existir, caímos no update padrão
  try {
    return await put(`/padarias/${padariaId}/status`, {
      ativo: Boolean(ativo),
    });
  } catch (e1) {
    // fallback para PUT direto na padaria (alguns backends aceitam { ativo } no update)
    return await put(`/padarias/${padariaId}`, { ativo: Boolean(ativo) });
  }
}
// --- deletar padaria ---
export async function deletarPadaria(padariaId) {
  if (!padariaId) throw new Error("padariaId é obrigatório");
  return await del(`/padarias/${padariaId}`);
}
