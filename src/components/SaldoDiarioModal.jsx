import { useEffect, useMemo, useRef, useState } from "react";
import { sd_getSaldo, sd_setSaldo } from "../services/saldoDiarioService";

const fmtEUR = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
});

export default function SaldoDiarioModal({
  open,
  onClose,
  padariaId,
  dataISO,
  onChangeDataISO,
}) {
  // Totais base (futuro backend); por enquanto 0
  const [gBase, setGBase] = useState(0);
  const [fBase, setFBase] = useState(0);

  // Lotes locais
  const [lotes, setLotes] = useState([]);

  // Linha de cadastro
  const [produto, setProduto] = useState("");
  const [qtd, setQtd] = useState(1);
  const [custoTotal, setCustoTotal] = useState("");
  const [precoRevenda, setPrecoRevenda] = useState(""); // opcional

  // Editor de venda inline
  const [editVenda, setEditVenda] = useState(null); // { id, qtd, valor }

  const [carregando, setCarregando] = useState(false);
  const vivo = useRef(true);

  async function carregar() {
    if (!padariaId || !dataISO) return;
    setCarregando(true);
    try {
      const resp = await sd_getSaldo({ dataISO, padariaId });
      if (!vivo.current) return;
      setGBase(Number(resp?.gastosBase || 0));
      setFBase(Number(resp?.faturamentoBase || 0));
      setLotes(Array.isArray(resp?.lotes) ? resp.lotes : []);
    } catch {
      if (!vivo.current) return;
      setGBase(0);
      setFBase(0);
      setLotes([]);
    } finally {
      if (vivo.current) setCarregando(false);
    }
  }

  useEffect(() => {
    vivo.current = true;
    if (open) carregar();
    return () => {
      vivo.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, padariaId, dataISO]);

  // Sempre que lotes/base mudarem, persiste e avisa o widget
  useEffect(() => {
    if (!padariaId || !dataISO) return;
    sd_setSaldo({
      padariaId,
      dataISO,
      lotes,
      gastosBase: gBase,
      faturamentoBase: fBase,
    }).then(() => {
      // Dispara um evento para o widget poder reagir em tempo real
      window.dispatchEvent(
        new CustomEvent("saldo:changed", { detail: { padariaId, dataISO } })
      );
    });
  }, [lotes, gBase, fBase, padariaId, dataISO]);

  // Totais apenas dos lotes (custos e receita de vendas)
  const gastosLotes = useMemo(
    () => lotes.reduce((s, l) => s + (Number(l.custoTotal) || 0), 0),
    [lotes]
  );

  const receitaLotes = useMemo(
    () =>
      lotes.reduce(
        (s, l) =>
          s +
          (Array.isArray(l.vendas)
            ? l.vendas.reduce((ss, v) => ss + (Number(v.valor) || 0), 0)
            : 0),
        0
      ),
    [lotes]
  );

  // Totais exibidos (base + lotes)
  const gastos = gBase + gastosLotes;
  const faturamento = fBase + receitaLotes;
  const lucro = faturamento - gastos;

  function addLote() {
    const nome = String(produto || "").trim();
    const q = Math.max(1, parseInt(qtd, 10) || 1);
    const cTot = Number(custoTotal) || 0;
    const pRev = precoRevenda === "" ? null : Number(precoRevenda);

    if (!nome || cTot <= 0) return;

    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const cUnit = cTot / q;

    setLotes((prev) => [
      ...prev,
      {
        id,
        produto: nome,
        qtd: q,
        vendidos: 0, // começa 0
        custoTotal: cTot,
        custoUnit: cUnit,
        precoRevenda: pRev, // opcional (padrão sugerido)
        vendas: [], // [{ qtd, valor }]
      },
    ]);

    // limpa o formulário
    setProduto("");
    setQtd(1);
    setCustoTotal("");
    setPrecoRevenda("");
  }

  function abrirVenda(l) {
    // sugere valor a partir do preço padrão (se houver)
    const sugerido = l.precoRevenda ? Number(l.precoRevenda) : 0;
    setEditVenda({ id: l.id, qtd: 1, valor: sugerido });
  }

  function confirmarVenda() {
    if (!editVenda) return;
    const { id, qtd: qVend, valor } = editVenda;

    setLotes((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const restante = Math.max(0, l.qtd - l.vendidos);
        const q = Math.max(1, Math.min(restante, parseInt(qVend, 10) || 0));
        const v = Math.max(0, Number(valor) || 0);
        if (q <= 0) return l;

        return {
          ...l,
          vendidos: l.vendidos + q,
          vendas: [...l.vendas, { qtd: q, valor: v }],
        };
      })
    );
    setEditVenda(null);
  }

  function cancelarVenda() {
    setEditVenda(null);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[3002] flex items-start justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative mt-8 w-full max-w-5xl rounded-xl bg-white text-gray-800 shadow-xl overflow-hidden">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between gap-3 p-4 border-b bg-white">
          <div className="flex flex-col">
            <label className="text-xs text-gray-700 mb-1">Dia</label>
            <input
              type="date"
              className="border rounded px-3 py-2 text-gray-900"
              value={dataISO || ""}
              onChange={(e) => onChangeDataISO?.(e.target.value)}
            />
          </div>

          <button
            onClick={onClose}
            className="px-3 py-1 rounded border bg-white text-gray-800 hover:bg-gray-50"
          >
            Fechar
          </button>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-3 p-4">
          <div className="rounded border p-3 bg-white">
            <div className="text-sm text-gray-600">Gastos</div>
            <div className="text-xl font-bold text-red-600">
              {fmtEUR.format(gastos)}
            </div>
          </div>
          <div className="rounded border p-3 bg-white">
            <div className="text-sm text-gray-600">Faturamento</div>
            <div className="text-xl font-bold text-amber-600">
              {fmtEUR.format(faturamento)}
            </div>
          </div>
          <div className="rounded border p-3 bg-white">
            <div className="text-sm text-gray-600">Lucro</div>
            <div className="text-xl font-bold text-green-600">
              {fmtEUR.format(lucro)}
            </div>
          </div>
        </div>

        {/* Linha de cadastro */}
        <div className="p-4 pt-0">
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12 md:col-span-4">
              <label className="text-xs text-gray-700 mb-1 block">
                Produto / descrição
              </label>
              <input
                className="w-full border rounded px-3 py-2 text-gray-900"
                placeholder="Ex.: Bolo 1"
                value={produto}
                onChange={(e) => setProduto(e.target.value)}
              />
            </div>

            <div className="col-span-6 md:col-span-2">
              <label className="text-xs text-gray-700 mb-1 block">Qtd</label>
              <input
                type="number"
                min="1"
                step="1"
                className="w-full border rounded px-3 py-2 text-gray-900"
                value={qtd}
                onChange={(e) => setQtd(e.target.value)}
              />
            </div>

            <div className="col-span-6 md:col-span-3">
              <label className="text-xs text-gray-700 mb-1 block">
                Custo total (€)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="w-full border rounded px-3 py-2 text-gray-900"
                placeholder="0,00"
                value={custoTotal}
                onChange={(e) => setCustoTotal(e.target.value)}
              />
            </div>

            <div className="col-span-6 md:col-span-2">
              <label className="text-xs text-gray-700 mb-1 block">
                Preço de revenda (€){" "}
                <span className="text-gray-400">(opcional)</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="w-full border rounded px-3 py-2 text-gray-900"
                placeholder="0,00"
                value={precoRevenda}
                onChange={(e) => setPrecoRevenda(e.target.value)}
              />
            </div>

            <div className="col-span-6 md:col-span-1 flex items-end justify-end pr-2">
              <button
                className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                onClick={addLote}
              >
                Adicionar lote
              </button>
            </div>
          </div>
        </div>

        {/* Tabela de lotes */}
        <div className="p-4 pt-0">
          <div className="overflow-auto rounded border">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left p-2">Produto</th>
                  <th className="text-right p-2">Qtd</th>
                  <th className="text-right p-2">Vendidos</th>
                  <th className="text-right p-2">Restante</th>
                  <th className="text-right p-2">Custo total</th>
                  <th className="text-right p-2">Custo unit.</th>
                  <th className="text-right p-2">Receita (€)</th>
                  <th className="text-right p-2">Ação</th>
                </tr>
              </thead>
              <tbody>
                {lotes.length === 0 ? (
                  <tr>
                    <td className="p-3 text-gray-500" colSpan={8}>
                      Nenhum lote registrado neste dia.
                    </td>
                  </tr>
                ) : (
                  lotes.map((l) => {
                    const restante = Math.max(0, l.qtd - l.vendidos);
                    const receita = Array.isArray(l.vendas)
                      ? l.vendas.reduce((s, v) => s + (Number(v.valor) || 0), 0)
                      : 0;

                    const isEdit = editVenda?.id === l.id;

                    return (
                      <tr key={l.id} className="border-t">
                        <td className="p-2 text-gray-800">{l.produto}</td>
                        <td className="p-2 text-right text-gray-800">
                          {l.qtd}
                        </td>
                        <td className="p-2 text-right text-gray-800">
                          {l.vendidos}
                        </td>
                        <td className="p-2 text-right text-gray-800">
                          {restante}
                        </td>
                        <td className="p-2 text-right text-gray-800 whitespace-nowrap">
                          {fmtEUR.format(l.custoTotal)}
                        </td>
                        <td className="p-2 text-right text-gray-800 whitespace-nowrap">
                          {fmtEUR.format(l.custoUnit)}
                        </td>
                        <td className="p-2 text-right text-gray-800 whitespace-nowrap">
                          {fmtEUR.format(receita)}
                        </td>
                        <td className="p-2 text-right">
                          {!isEdit ? (
                            <button
                              className="px-2 py-1 rounded border hover:bg-gray-50 disabled:opacity-50 text-gray-800"
                              disabled={restante <= 0}
                              onClick={() => abrirVenda(l)}
                            >
                              Vender
                            </button>
                          ) : (
                            <div className="flex items-end justify-end gap-3">
                              {/* Qtd */}
                              <div className="flex flex-col items-end">
                                <label
                                  htmlFor={`q_${l.id}`}
                                  className="text-[11px] leading-none text-gray-500 mb-1"
                                >
                                  Qtd
                                </label>
                                <input
                                  id={`q_${l.id}`}
                                  type="number"
                                  min={1}
                                  max={restante}
                                  step={1}
                                  className="w-16 border rounded px-2 py-1 text-right"
                                  title="Quantidade vendida"
                                  value={editVenda.qtd}
                                  onChange={(e) => {
                                    const q = Math.max(
                                      1,
                                      Math.min(
                                        restante,
                                        parseInt(e.target.value, 10) || 0
                                      )
                                    );
                                    // Se houver preço padrão, sugere valor = q * preço
                                    const sug =
                                      l.precoRevenda != null
                                        ? Number(l.precoRevenda) * q
                                        : editVenda.valor;
                                    setEditVenda((prev) => ({
                                      ...prev,
                                      qtd: q,
                                      valor: sug,
                                    }));
                                  }}
                                />
                              </div>

                              {/* Preço (total €) */}
                              <div className="flex flex-col items-end">
                                <label
                                  htmlFor={`v_${l.id}`}
                                  className="text-[11px] leading-none text-gray-500 mb-1"
                                >
                                  Preço (total €)
                                </label>
                                <input
                                  id={`v_${l.id}`}
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  className="w-24 border rounded px-2 py-1 text-right"
                                  title="Valor total da venda (€)"
                                  value={editVenda.valor}
                                  onChange={(e) =>
                                    setEditVenda((prev) => ({
                                      ...prev,
                                      valor: e.target.value,
                                    }))
                                  }
                                />
                              </div>

                              <button
                                className="px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                                onClick={confirmarVenda}
                              >
                                OK
                              </button>
                              <button
                                className="px-2 py-1 rounded border hover:bg-gray-50"
                                onClick={cancelarVenda}
                              >
                                Cancelar
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
