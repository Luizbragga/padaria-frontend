// src/services/analiticoService.js
import http from "./http";

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
