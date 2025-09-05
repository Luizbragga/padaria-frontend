// src/services/entregaService.js
import { http } from "./http";

/**
 * Entregas em tempo real (dashboard gerente)
 * GET /analitico/entregas-tempo-real?padaria=...
 */
export async function buscarEntregasTempoReal(padariaId) {
  if (!padariaId) return [];
  try {
    const { data } = await http.get("/analitico/entregas-tempo-real", {
      params: { padaria: padariaId },
    });
    // backend pode devolver [{...}] ou { entregas:[...] }
    return Array.isArray(data) ? data : data?.entregas ?? [];
  } catch (e) {
    console.error("buscarEntregasTempoReal:", e);
    return [];
  }
}

/**
 * Minhas entregas (entregador)
 * Tenta rota nova /rota-entregador e faz fallback para /entregas/minhas
 */
export async function listarMinhasEntregas() {
  try {
    const { data } = await http.get("/entregas/minhas"); // ✅ _id da coleção Entregas
    return Array.isArray(data) ? data : data?.entregas ?? [];
  } catch {
    // fallback legado (se existir no backend)
    try {
      const { data } = await http.get("/rota-entregador");
      return Array.isArray(data) ? data : data?.entregas ?? [];
    } catch (e) {
      console.error("listarMinhasEntregas:", e);
      return [];
    }
  }
}

/**
 * Concluir entrega
 * PUT /entregas/:id/concluir
 */
export async function concluirEntrega(id) {
  if (!id) return null;
  try {
    const { data } = await http.put(`/entregas/${id}/concluir`, {});
    return data;
  } catch (e) {
    console.error("concluirEntrega:", e);
    throw e;
  }
}

/**
 * Registrar pagamento
 * POST /entregas/:id/registrar-pagamento  { valor, forma }
 */
export async function registrarPagamento(id, { valor, forma }) {
  if (!id) return null;
  try {
    const { data } = await http.post(`/entregas/${id}/registrar-pagamento`, {
      valor,
      forma,
    });
    return data;
  } catch (e) {
    console.error("registrarPagamento:", e);
    throw e;
  }
}
