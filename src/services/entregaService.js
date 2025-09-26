// src/services/entregaService.js
import { http } from "./http";

/**
 * Entregas em tempo real (dashboard do gerente)
 * GET /analitico/entregas-tempo-real?padaria=...
 */
export async function buscarEntregasTempoReal(padariaId) {
  if (!padariaId) return [];
  try {
    const { data } = await http.get("analitico/entregas-tempo-real", {
      params: { padaria: padariaId },
    });
    return Array.isArray(data) ? data : data?.entregas ?? [];
  } catch (e) {
    console.error("buscarEntregasTempoReal:", e);
    return [];
  }
}

/**
 * Minhas entregas (entregador) — SEM fallback silencioso.
 * Se der erro, retornamos [].
 */
export async function listarMinhasEntregas() {
  try {
    const { data } = await http.get("entregas/minhas");
    return Array.isArray(data) ? data : data?.entregas ?? [];
  } catch (e) {
    console.error("listarMinhasEntregas:", e);
    return [];
  }
}

/**
 * Concluir entrega
 * PUT /entregas/:id/concluir
 */
export async function concluirEntrega(id) {
  if (!id) return null;
  try {
    const { data } = await http.put(`entregas/${id}/concluir`, {});
    return data;
  } catch (e) {
    console.error("concluirEntrega:", e);
    throw e;
  }
}

/**
 * Registrar pagamento de UMA entrega
 * POST /entregas/:id/registrar-pagamento  { valor, forma }
 */
export async function registrarPagamento(id, { valor, forma }) {
  if (!id) return null;
  try {
    const { data } = await http.post(`entregas/${id}/registrar-pagamento`, {
      valor,
      forma,
    });
    return data;
  } catch (e) {
    console.error("registrarPagamento:", e);
    throw e;
  }
}

/**
 * ✅ Registrar pagamento direto para um CLIENTE (uso do gerente)
 * POST /pagamentos/cliente/:clienteId  { valor, forma, data, mes }
 */
export async function registrarPagamentoCliente(
  clienteId,
  { valor, forma, data, mes }
) {
  if (!clienteId) throw new Error("clienteId é obrigatório");
  const payload = {
    valor: Number(valor),
    forma,
    data, // "YYYY-MM-DD"
    mes, // opcional
  };
  const { data: resp } = await http.post(
    `pagamentos/cliente/${clienteId}`,
    payload
  );
  return resp;
}

/**
 * Entregas do dia (gerente)
 */
export async function listarEntregasDoDia() {
  try {
    const { data } = await http.get("entregas/hoje");
    return {
      entregasConcluidas: data?.entregasConcluidas ?? [],
      entregasPendentes: data?.entregasPendentes ?? [],
    };
  } catch (e) {
    console.error("listarEntregasDoDia:", e);
    return { entregasConcluidas: [], entregasPendentes: [] };
  }
}
