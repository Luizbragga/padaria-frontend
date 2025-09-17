import { get, post } from "./http";

// opcional: ver override atual
export function getSplitHoje(padariaId) {
  return get(`/rotas/split-hoje?padaria=${padariaId}`);
}

// aplicar override do dia (assignments calculados no front)
export function applySplitHoje({ padaria, dataISO, assignments, from }) {
  return post("/rotas/split-hoje/apply", {
    padaria,
    dataISO,
    assignments,
    from,
  });
}

// limpar override do dia
export function clearSplitHoje({ padaria, dataISO }) {
  return post("/rotas/split-hoje/clear", { padaria, dataISO });
}
