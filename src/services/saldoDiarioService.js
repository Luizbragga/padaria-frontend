// Persistência simples em localStorage (por padaria + dia)

const KEY = (padariaId, dataISO) => `saldoDiario:${padariaId}:${dataISO}`;

/**
 * Lê o saldo do dia (inclui lotes).
 * Retorna { gastos, faturamento, lucro, lotes, gastosBase, faturamentoBase }
 */
export async function sd_getSaldo({ padariaId, dataISO }) {
  if (!padariaId || !dataISO) {
    return {
      gastos: 0,
      faturamento: 0,
      lucro: 0,
      lotes: [],
      gastosBase: 0,
      faturamentoBase: 0,
    };
  }

  let store = null;
  try {
    const raw = localStorage.getItem(KEY(padariaId, dataISO));
    store = raw ? JSON.parse(raw) : null;
  } catch {
    store = null;
  }

  const lotes = Array.isArray(store?.lotes) ? store.lotes : [];
  const gastosBase = Number(store?.gastosBase || 0);
  const faturamentoBase = Number(store?.faturamentoBase || 0);

  const gastosLotes = lotes.reduce(
    (s, l) => s + (Number(l.custoTotal) || 0),
    0
  );
  const receitaLotes = lotes.reduce(
    (s, l) =>
      s +
      (Array.isArray(l.vendas)
        ? l.vendas.reduce((ss, v) => ss + (Number(v.valor) || 0), 0)
        : 0),
    0
  );

  const gastos = gastosBase + gastosLotes;
  const faturamento = faturamentoBase + receitaLotes;
  const lucro = faturamento - gastos;

  return {
    gastos,
    faturamento,
    lucro,
    lotes,
    gastosBase,
    faturamentoBase,
  };
}

/**
 * Grava/atualiza o saldo do dia (inclui lotes).
 * payload: { lotes, gastosBase, faturamentoBase }
 */
export async function sd_setSaldo({
  padariaId,
  dataISO,
  lotes = [],
  gastosBase = 0,
  faturamentoBase = 0,
}) {
  if (!padariaId || !dataISO) return;

  const payload = {
    lotes: Array.isArray(lotes) ? lotes : [],
    gastosBase: Number(gastosBase) || 0,
    faturamentoBase: Number(faturamentoBase) || 0,
  };

  localStorage.setItem(KEY(padariaId, dataISO), JSON.stringify(payload));
  return payload;
}
export async function sd_updateVenda(
  vendaId,
  { data, precoVenda, custoUnitario }
) {
  const { data: resp } = await http.patch(`saldo-diario/venda/${vendaId}`, {
    data,
    precoVenda,
    custoUnitario,
  });
  return resp;
}

export async function sd_deleteVenda(vendaId, { data }) {
  const { data: resp } = await http.delete(`saldo-diario/venda/${vendaId}`, {
    params: { data },
  });
  return resp;
}
