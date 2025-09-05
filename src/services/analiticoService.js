// src/services/analiticoService.js
import { http } from "./http";

/* Helpers de normalização iguais aos que você já usava no arquivo antigo */
function toArray(x) {
  return Array.isArray(x) ? x : [];
}

/** Entregas por dia da semana -> [{ _id, total }] */
export async function buscarEntregasPorDia(padariaId) {
  if (!padariaId) return [];
  try {
    const { data } = await http.get("/analitico/entregas-por-dia-da-semana", {
      params: { padaria: padariaId },
    });

    const src = Array.isArray(data?.dias) ? data.dias : toArray(data);
    return src.map((d) => ({
      _id: d._id ?? d.dia ?? d.label ?? d.nome ?? "",
      total: Number(d.total ?? d.qtd ?? d.valor ?? 0),
    }));
  } catch (e) {
    console.error("buscarEntregasPorDia:", e);
    return [];
  }
}

/** Faturamento mensal -> [{ mes, valorTotal }] */
export async function buscarFaturamentoMensal(padariaId) {
  if (!padariaId) return [];
  try {
    const { data } = await http.get("/analitico/faturamento-mensal", {
      params: { padaria: padariaId },
    });

    const arr = Array.isArray(data?.dados) ? data.dados : toArray(data);
    return arr.map((x) => ({
      mes: x.mes ?? x._id ?? x.label ?? "",
      valorTotal: Number(x.valorTotal ?? x.total ?? x.valor ?? 0),
    }));
  } catch (e) {
    console.error("buscarFaturamentoMensal:", e);
    return [];
  }
}

/** Inadimplência -> [{ name: "Pagantes", value }, { name: "Inadimplentes", value }] */
export async function buscarInadimplencia(padariaId) {
  if (!padariaId) return [];
  try {
    const { data } = await http.get("/analitico/inadimplencia", {
      params: { padaria: padariaId },
    });
    const pag = Number(data?.pagantes ?? 0);
    const inad = Number(data?.inadimplentes ?? 0);
    return [
      { name: "Pagantes", value: pag },
      { name: "Inadimplentes", value: inad },
    ];
  } catch (e) {
    console.error("buscarInadimplencia:", e);
    return [];
  }
}

/** GET /analitico/a-receber?padaria=<id>&mes=YYYY-MM */
export async function buscarAReceber(padariaId, mes) {
  try {
    const params = {};
    if (padariaId) params.padaria = padariaId;
    if (mes) params.mes = mes;

    const { data } = await http.get("/analitico/a-receber", { params });
    return data; // { mes, previstoMes, pagoMes, pendenteAtual, pendenciaAnterior, totalPendente, clientes: [...] }
  } catch (e) {
    console.error("buscarAReceber:", e);
    throw e;
  }
}

/** GET /analitico/avulsas?padaria=<id>&mes=YYYY-MM */
export async function listarAvulsasDoMes(padariaId, mes) {
  try {
    const params = {};
    if (padariaId) params.padaria = padariaId;
    if (mes) params.mes = mes;

    const { data } = await http.get("/analitico/avulsas", { params });
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error("listarAvulsasDoMes:", e);
    throw e;
  }
}

/**
 * GET /api/clientes/:id/padrao-semanal
 * Retorna { clienteId, nome, padraoSemanal: { domingo: [...], ... } }
 */
export async function buscarPadraoSemanalCliente(clienteId) {
  if (!clienteId) throw new Error("clienteId inválido");
  const { data } = await http.get(`/api/clientes/${clienteId}/padrao-semanal`);
  return data;
}

/**
 * Pagamentos do mês para UM cliente.
 * Usa /analitico/pagamentos e filtra pelo cliente no front.
 * Retorna { total, pagamentos: [...] }
 */
export async function buscarPagamentosDoMesCliente(padariaId, clienteId, mes) {
  if (!padariaId || !clienteId) {
    throw new Error("padariaId/clienteId inválidos");
  }
  const [y, m] = String(mes || "")
    .split("-")
    .map(Number);
  if (!y || !m) throw new Error("mes inválido (use 'YYYY-MM')");

  const last = new Date(y, m, 0).getDate();
  const dataInicial = `${y}-${String(m).padStart(2, "0")}-01`;
  const dataFinal = `${y}-${String(m).padStart(2, "0")}-${String(last).padStart(
    2,
    "0"
  )}`;

  const { data } = await http.get("/analitico/pagamentos", {
    params: {
      padaria: padariaId,
      dataInicial,
      dataFinal,
      forma: "todas",
    },
  });

  const todos = Array.isArray(data?.pagamentos) ? data.pagamentos : [];
  const itens = todos.filter((p) => String(p.cliente) === String(clienteId));
  const total = itens.reduce((s, p) => s + (Number(p.valor) || 0), 0);

  return { total, pagamentos: itens };
}
