// src/components/FaturamentoMensal.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { buscarFaturamentoMensal } from "../services/analiticoService";
import { getUsuario } from "../utils/auth";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const fmtEUR = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
});

export default function FaturamentoMensal({ padariaId }) {
  const [dados, setDados] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const usuario = getUsuario();
  const role = usuario?.role ?? null;

  // evita setState pós-unmount
  const alive = useRef(true);

  async function carregar() {
    setCarregando(true);
    setErro("");

    // oculto para entregador ou sem padaria
    if (role === "entregador" || !padariaId) {
      setDados([]);
      setCarregando(false);
      return;
    }

    try {
      const dadosAPI = await buscarFaturamentoMensal(padariaId);
      if (!alive.current) return;
      // esperamos algo como [{ mes: '2025-08', valorTotal: 123.45 }, ...]
      const arr = Array.isArray(dadosAPI) ? dadosAPI : [];
      setDados(arr);
    } catch (e) {
      console.error("Erro ao buscar faturamento mensal:", e);
      if (!alive.current) return;
      setErro("Erro ao carregar faturamento.");
      setDados([]);
    } finally {
      if (alive.current) setCarregando(false);
    }
  }

  useEffect(() => {
    alive.current = true;
    carregar();
    return () => {
      alive.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [padariaId, role]);

  const total = useMemo(
    () => dados.reduce((acc, d) => acc + (Number(d?.valorTotal) || 0), 0),
    [dados]
  );

  return (
    <div className="bg-white shadow rounded p-6 mt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold">📈 Faturamento Mensal</h3>
        <button
          className="text-sm px-3 py-1 rounded border"
          onClick={carregar}
          disabled={carregando}
          title="Atualizar"
        >
          {carregando ? "Atualizando…" : "Atualizar"}
        </button>
      </div>

      {role === "entregador" ? (
        <p className="text-gray-500">Visão disponível apenas para gestão.</p>
      ) : carregando ? (
        <p className="text-gray-500">Carregando faturamento...</p>
      ) : erro ? (
        <p className="text-red-600">{erro}</p>
      ) : !dados.length ? (
        <p className="text-gray-500">Nenhum dado encontrado.</p>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-2">
            Total no período: <strong>{fmtEUR.format(total)}</strong>
          </p>
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <BarChart
                data={dados}
                margin={{ top: 8, right: 12, left: 0, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis tickFormatter={(v) => fmtEUR.format(v)} />
                <Tooltip
                  formatter={(value) => fmtEUR.format(value)}
                  labelFormatter={(label) => `Mês: ${label}`}
                />
                <Bar
                  dataKey="valorTotal"
                  fill="#4ade80"
                  name="Faturamento (€)"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
