// src/components/PagamentosFiltrados.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  buscarPagamentosDetalhados,
  buscarAReceber,
} from "../services/analiticoService";

const fmtEUR = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
});

function mesAtualStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export default function PagamentosFiltrados({
  padariaId,
  dataEspecifica = "",
  dataInicial = "",
  dataFinal = "",
  forma = "",
}) {
  const [filtros, setFiltros] = useState({
    dataEspecifica,
    dataInicial,
    dataFinal,
    forma,
  });

  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  const [resumoMes, setResumoMes] = useState({
    // totalRecebidoMes NÃO é mais exibido no card (usamos total da listagem)
    totalRecebidoMes: 0,
    pendenciaAnterior: 0,
    inadimplentes: 0,
  });

  const vivo = useRef(true);
  const mesAtual = mesAtualStr();

  function onChangeFiltro(e) {
    setFiltros((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  const aplicouFiltro = useMemo(() => {
    const f = filtros;
    return Boolean(f.dataEspecifica || f.dataInicial || f.dataFinal || f.forma);
  }, [filtros]);

  // resumo (apenas para pendência anterior e inadimplentes)
  useEffect(() => {
    vivo.current = true;
    async function carregarResumo() {
      if (!padariaId) return;
      try {
        const ar = await buscarAReceber(padariaId, mesAtual);
        if (!vivo.current) return;
        setResumoMes({
          totalRecebidoMes: Number(ar?.pagoMes || 0),
          pendenciaAnterior: Number(ar?.pendenciaAnterior || 0),
          inadimplentes: Number(ar?.inadimplentes || 0),
        });
      } catch (e) {
        console.error("Erro no resumo de pagamentos:", e);
        if (!vivo.current) return;
        setResumoMes({
          totalRecebidoMes: 0,
          pendenciaAnterior: 0,
          inadimplentes: 0,
        });
      }
    }
    carregarResumo();
    return () => {
      vivo.current = false;
    };
  }, [padariaId, mesAtual]);

  // lista filtrada
  useEffect(() => {
    vivo.current = true;
    async function carregarLista() {
      if (!padariaId || !aplicouFiltro) {
        setLista([]);
        setErro("");
        return;
      }
      setCarregando(true);
      setErro("");
      try {
        const { dataEspecifica, dataInicial, dataFinal, forma } = filtros;
        const resp = await buscarPagamentosDetalhados({
          padariaId,
          dataEspecifica,
          dataInicial,
          dataFinal,
          forma,
        });
        if (!vivo.current) return;
        const arr = Array.isArray(resp?.pagamentos) ? resp.pagamentos : [];
        setLista(arr);
      } catch (e) {
        console.error("Erro ao filtrar pagamentos:", e);
        if (!vivo.current) return;
        setErro("Erro ao buscar pagamentos.");
        setLista([]);
      } finally {
        if (vivo.current) setCarregando(false);
      }
    }
    carregarLista();
    return () => {
      vivo.current = false;
    };
  }, [padariaId, filtros, aplicouFiltro]);

  // total da listagem filtrada (vai para o card “Valor recebido nesse filtro”)
  const totalLista = useMemo(() => {
    return (lista || []).reduce((s, p) => s + (Number(p?.valor) || 0), 0);
  }, [lista]);

  return (
    <div className="bg-white p-4 rounded shadow mb-4">
      <h3 className="text-lg font-bold mb-4">Pagamentos Filtrados</h3>

      {/* Cards do RESUMO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div className="bg-gray-50 rounded-lg p-4 border-[3px] border-blue-600">
          <div className="text-sm text-gray-600">
            Valor recebido nesse filtro
          </div>
          <div className="text-xl font-semibold">
            {fmtEUR.format(aplicouFiltro ? totalLista : 0)}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 border-[3px] border-blue-600">
          <div className="text-sm text-gray-600">
            Total Pendente (mês anterior)
          </div>
          <div className="text-xl font-semibold text-red-600">
            {fmtEUR.format(resumoMes.pendenciaAnterior || 0)}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 border-[3px] border-blue-600">
          <div className="text-sm text-gray-600">Clientes Inadimplentes</div>
          <div className="text-xl font-semibold text-blue-600">
            {resumoMes.inadimplentes || 0}
          </div>
        </div>
      </div>

      {/* Filtros */}
      <p className="text-sm text-gray-600 mb-2">
        Defina pelo menos um filtro (data específica, ou intervalo de datas, ou
        forma) para ver os resultados da <strong>listagem</strong>.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-2">
        <div>
          <label className="block text-sm font-semibold text-blue-600">
            Data específica
          </label>
          <input
            type="date"
            name="dataEspecifica"
            value={filtros.dataEspecifica}
            onChange={onChangeFiltro}
            className="border p-1 rounded w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-blue-600">
            Data inicial
          </label>
          <input
            type="date"
            name="dataInicial"
            value={filtros.dataInicial}
            onChange={onChangeFiltro}
            className="border p-1 rounded w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-blue-600">
            Data final
          </label>
          <input
            type="date"
            name="dataFinal"
            value={filtros.dataFinal}
            onChange={onChangeFiltro}
            className="border p-1 rounded w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-blue-600">
            Forma de pagamento
          </label>
          <select
            name="forma"
            value={filtros.forma}
            onChange={onChangeFiltro}
            className="border p-1 rounded w-full"
          >
            <option value="">Todas</option>
            <option value="dinheiro">Dinheiro</option>
            <option value="cartao">Cartão</option>
            <option value="mbway">MB Way</option>
          </select>
        </div>
      </div>

      {/* Tabela apenas quando há filtro */}
      {aplicouFiltro && (
        <>
          {carregando ? (
            <p className="text-gray-500">Carregando…</p>
          ) : erro ? (
            <p className="text-red-600">{erro}</p>
          ) : (lista || []).length === 0 ? (
            <p className="text-gray-500">Nenhum pagamento encontrado.</p>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left bg-gray-100">
                    <th className="p-2">Cliente</th>
                    <th className="p-2">Entregador</th>
                    <th className="p-2">Valor</th>
                    <th className="p-2">Forma</th>
                    <th className="p-2">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map((p, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-2">
                        {p.clienteNome || p.cliente || "-"}
                      </td>
                      <td className="p-2">
                        {p.entregadorNome || p.entregador || "-"}
                      </td>
                      <td className="p-2">
                        {fmtEUR.format(Number(p.valor) || 0)}
                      </td>
                      <td className="p-2">{p.forma || "-"}</td>
                      <td className="p-2">
                        {p.data
                          ? new Date(p.data).toLocaleDateString("pt-PT")
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
