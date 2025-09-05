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
  ReferenceLine,
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

  const alive = useRef(true);

  async function carregar() {
    setCarregando(true);
    setErro("");

    if (role === "entregador" || !padariaId) {
      setDados([]);
      setCarregando(false);
      return;
    }

    try {
      const dadosAPI = await buscarFaturamentoMensal(padariaId);
      if (!alive.current) return;
      setDados(Array.isArray(dadosAPI) ? dadosAPI : []);
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

  // ----- Escala Y: topo = máximo real; majors = 50 em 50 (+ topo); minors = 10 em 10 -----
  const { max, majorTicks, minorTicks } = useMemo(() => {
    const valores = (Array.isArray(dados) ? dados : []).map(
      (d) => Number(d?.valorTotal) || 0
    );
    const m = Math.max(0, ...valores);

    // majors: 0, 50, 100, ... e inclui o topo m (mesmo se não for múltiplo de 50)
    const majors = [0];
    for (let v = 50; v < m; v += 50) majors.push(v);
    if (majors.at(-1) !== m) majors.push(m);

    // minors: 10,20,30,40,60,70,80,90, ... até m (exclui múltiplos de 50)
    const minors = [];
    for (let v = 10; v < m; v += 10) {
      if (v % 50 !== 0) minors.push(v);
    }

    return { max: m, majorTicks: majors, minorTicks: minors };
  }, [dados]);

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

                {/* Eixo Y sem rótulos próprios (vamos rotular via ReferenceLine) */}
                <YAxis
                  type="number"
                  domain={[0, max]}
                  tick={false}
                  axisLine={{ stroke: "#D1D5DB" }}
                  width={72} // dá espaço aos rótulos “manuais”
                />

                {/* Linhas menores (10 em 10) — sem rótulo */}
                {minorTicks.map((y) => (
                  <ReferenceLine
                    key={`minor-${y}`}
                    y={y}
                    stroke="#E5E7EB"
                    strokeDasharray="3 3"
                    ifOverflow="extendDomain"
                  />
                ))}

                {/* Linhas maiores (0, 50, 100, ... e topo) — com rótulo formatado */}
                {majorTicks.map((y) => (
                  <ReferenceLine
                    key={`major-${y}`}
                    y={y}
                    stroke="#D1D5DB"
                    ifOverflow="extendDomain"
                    label={({ viewBox }) => {
                      const { x, y: yy } = viewBox || {};
                      return (
                        <text
                          x={(x ?? 0) - 8}
                          y={yy}
                          dy={3}
                          textAnchor="end"
                          fontSize={12}
                          fontWeight={y === max ? 700 : 700} // pode pôr 900 no topo se quiser
                          fill="#111827"
                        >
                          {fmtEUR.format(y)}
                        </text>
                      );
                    }}
                  />
                ))}

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
