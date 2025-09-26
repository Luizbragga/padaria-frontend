// src/services/analiticoService.js
import { http } from "./api";

/* Helpers */
function toArray(x) {
  return Array.isArray(x) ? x : [];
}

/** Entregas por dia da semana -> [{ _id, total }] */
export async function buscarEntregasPorDia(padariaId) {
  if (!padariaId) return [];
  try {
    const { data } = await http.get("analitico/entregas-por-dia-da-semana", {
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
    const { data } = await http.get("analitico/faturamento-mensal", {
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
    const { data } = await http.get("analitico/inadimplencia", {
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

    const { data } = await http.get("analitico/a-receber", { params });
    return data;
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

    const { data } = await http.get("analitico/avulsas", { params });
    // backend: { mes, total, avulsas: [...] }
    return {
      mes: data?.mes ?? mes ?? "",
      total: Number(data?.total ?? 0),
      itens: Array.isArray(data?.avulsas) ? data.avulsas : [],
    };
  } catch (e) {
    console.error("listarAvulsasDoMes:", e);
    return { mes: mes ?? "", total: 0, itens: [] };
  }
}

/** GET /api/clientes/:id/padrao-semanal */
export async function buscarPadraoSemanalCliente(clienteId) {
  if (!clienteId) throw new Error("clienteId inválido");
  const { data } = await http.get(`/api/clientes/${clienteId}/padrao-semanal`);
  return data; // { clienteId, nome, inicioCicloFaturamento, padraoSemanal }
}

/** PUT /api/clientes/:id/padrao-semanal  { padraoSemanal } */
export async function setPadraoSemanalCliente(clienteId, padraoSemanal) {
  if (!clienteId) throw new Error("clienteId inválido");
  const { data } = await http.put(`/api/clientes/${clienteId}/padrao-semanal`, {
    padraoSemanal,
  });
  return data; // { ok: true }
}

/** POST /api/clientes/:id/ajuste-pontual  { data, tipo, itens } (+ ?padaria= ) */
export async function registrarAjustePontual(clienteId, padariaId, payload) {
  if (!clienteId) throw new Error("clienteId inválido");
  const { data } = await http.post(
    `/api/clientes/${clienteId}/ajuste-pontual`,
    payload,
    { params: { padaria: padariaId } }
  );
  return data; // { ok: true, ajuste }
}

/** GET /api/clientes/:id/ajustes?ini=YYYY-MM-DD&fim=YYYY-MM-DD */
export async function listarAjustesPontuais(clienteId, ini, fim) {
  if (!clienteId) throw new Error("clienteId inválido");
  const { data } = await http.get(`/api/clientes/${clienteId}/ajustes`, {
    params: { ini, fim },
  });
  return data; // { ajustes: [...] }
}

/** POST /api/clientes/:id/solicitar-alteracao  { dados } (+ ?padaria= ) */
export async function solicitarAlteracaoCliente(clienteId, padariaId, dados) {
  if (!clienteId) throw new Error("clienteId inválido");
  const { data } = await http.post(
    `/api/clientes/${clienteId}/solicitar-alteracao`,
    { dados },
    { params: { padaria: padariaId } }
  );
  return data; // { ok: true, solicitacaoId }
}
/* ================== PAGAMENTOS ================== */

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

  const { data } = await http.get("analitico/pagamentos", {
    params: {
      padaria: padariaId,
      dataInicial,
      dataFinal,
      forma: "todas",
    },
  });

  const todos = Array.isArray(data?.pagamentos) ? data.pagamentos : [];
  const itens = todos.filter(
    (p) => String(p.clienteId ?? p.cliente ?? "") === String(clienteId)
  );
  const total = itens.reduce((s, p) => s + (Number(p.valor) || 0), 0);

  return { total, pagamentos: itens };
}

/** GET /analitico/pagamentos – detalhado com filtros */
export async function buscarPagamentosDetalhados({
  padariaId,
  dataInicial,
  dataFinal,
  dataEspecifica,
  forma,
}) {
  const params = {};
  if (padariaId) params.padaria = padariaId;

  if (dataEspecifica) {
    params.dataEspecifica = dataEspecifica; // YYYY-MM-DD
  } else {
    if (dataInicial) params.dataInicial = dataInicial;
    if (dataFinal) params.dataFinal = dataFinal;
  }

  if (forma && forma !== "") params.forma = forma;

  const { data } = await http.get("analitico/pagamentos", { params });
  return data; // { pagamentos, totalRecebido, clientesPagantes }
}

/** Registrar pagamento diretamente para um cliente (usado pelo gerente no painel) */
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
    `/clientes/${clienteId}/registrar-pagamento`,
    payload
  );
  return resp;
}

/* =====================  PENDÊNCIAS (NOVO)  ===================== */
export async function buscarPendenciasAno(padariaId, ano, gracaDia = 8) {
  if (!padariaId) throw new Error("padariaId é obrigatório");
  const { data } = await http.get("analitico/pendencias-anuais", {
    params: { padaria: padariaId, ano, gracaDia },
  });
  return data;
}

export async function buscarPendenciasDoMes(padariaId, mes, gracaDia = 8) {
  if (!padariaId) throw new Error("padariaId é obrigatório");
  if (!mes) throw new Error("mes é obrigatório (YYYY-MM)");
  const { data } = await http.get("analitico/pendencias-do-mes", {
    params: { padaria: padariaId, mes, gracaDia },
  });
  return data;
}
