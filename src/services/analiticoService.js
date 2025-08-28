// src/services/analiticoService.js
import { getToken } from "../utils/auth";

const API_URL = import.meta.env?.VITE_API_URL || "http://localhost:3000";

function buildQS(params) {
  const u = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") u.set(k, String(v));
  });
  return u.toString();
}

async function apiGet(path, params = {}) {
  const token = getToken();
  const qs = buildQS(params);
  const url = qs ? `${API_URL}${path}?${qs}` : `${API_URL}${path}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (!res.ok) {
    const msg = json?.erro || `Falha (${res.status}) em ${path}`;
    throw new Error(msg);
  }
  return json ?? {};
}

/** Entregas por dia da semana -> [{ _id, total }] */
export async function buscarEntregasPorDia(padariaId) {
  if (!padariaId) return [];
  try {
    const json = await apiGet("/analitico/entregas-por-dia-da-semana", {
      padaria: padariaId,
    });

    const src = Array.isArray(json?.dias)
      ? json.dias
      : Array.isArray(json)
      ? json
      : [];

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
    const json = await apiGet("/analitico/faturamento-mensal", {
      padaria: padariaId,
    });

    const arr = Array.isArray(json?.dados)
      ? json.dados
      : Array.isArray(json)
      ? json
      : [];

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
    const json = await apiGet("/analitico/inadimplencia", {
      padaria: padariaId,
    });
    const pag = Number(json?.pagantes ?? 0);
    const inad = Number(json?.inadimplentes ?? 0);
    return [
      { name: "Pagantes", value: pag },
      { name: "Inadimplentes", value: inad },
    ];
  } catch (e) {
    console.error("buscarInadimplencia:", e);
    return [];
  }
}
