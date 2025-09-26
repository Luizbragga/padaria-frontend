// src/services/rotasSplitService.js
import http from "./api";

export async function listarRotas(padariaId) {
  const { data } = await http.get("/rotas/nomes", {
    params: padariaId ? { padaria: padariaId } : undefined,
  });
  // aceita tanto ["A","B","C"] quanto { rotas: [...] }
  return Array.isArray(data) ? data : data?.rotas || [];
}

export async function simularSplit({ rotaAlvo, paraA, paraC, capA, capC }) {
  const payload = { rotaAlvo, paraA, paraC };
  if (capA) payload.capA = Number(capA);
  if (capC) payload.capC = Number(capC);
  const { data } = await http.post("/rotas-split/simular", payload);
  return data;
}

export async function aplicarSplit({ rotaAlvo, paraA, paraC, capA, capC }) {
  const payload = { rotaAlvo, paraA, paraC };
  if (capA) payload.capA = Number(capA);
  if (capC) payload.capC = Number(capC);
  const { data } = await http.post("/rotas-split/aplicar", payload);
  return data;
}
