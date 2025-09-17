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

export default function FaturamentoMensal({ padariaId, mesSelecionado }) {
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

  // ====== Derivados ======
  const ano = useMemo(() => {
    const hoje = new Date();
    if (!mesSelecionado) return hoje.getFullYear();
    const [y] = String(mesSelecionado).split("-").map(Number);
    return y || hoje.getFullYear();
  }, [mesSelecionado]);

  const dadosAno = useMemo(() => {
    const mapa = new Map(); // "YYYY-MM" -> valor
    for (const d of Array.isArray(dados) ? dados : []) {
      const mes = String(d?.mes || "");
      const val = Number(d?.valorTotal || 0);
      if (mes.startsWith(`${ano}-`)) {
        mapa.set(mes, (mapa.get(mes) || 0) + val);
      }
    }
    const arr = [];
    for (let m = 1; m <= 12; m++) {
      const label = `${ano}-${String(m).padStart(2, "0")}`;
      const valor = Number(mapa.get(label) || 0);
      arr.push({ mes: label, valorTotal: valor });
    }
    return arr;
  }, [dados, ano]);

  const mesAlvo = useMemo(() => {
    if (mesSelecionado && /^\d{4}-\d{2}$/.test(mesSelecionado))
      return mesSelecionado;
    const hoje = new Date();
    const m = String(hoje.getMonth() + 1).padStart(2, "0");
    return `${ano}-${m}`;
  }, [mesSelecionado, ano]);

  const totalAno = useMemo(
    () =>
      (Array.isArray(dadosAno) ? dadosAno : []).reduce(
        (s, x) => s + (Number(x.valorTotal) || 0),
        0
      ),
    [dadosAno]
  );

  const { max, majorTicks, minorTicks } = useMemo(() => {
    const valores = (Array.isArray(dadosAno) ? dadosAno : []).map(
      (d) => Number(d?.valorTotal) || 0
    );
    const m = Math.max(0, ...valores);

    const majors = [0];
    for (let v = 50; v < m; v += 50) majors.push(v);
    if (majors.at(-1) !== m) majors.push(m);

    const minors = [];
    for (let v = 10; v < m; v += 10) {
      if (v % 50 !== 0) minors.push(v);
    }

    return { max: m, majorTicks: majors, minorTicks: minors };
  }, [dadosAno]);

  return (
    <div className="bg-white shadow rounded p-6 mt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold">📈 Faturamento Anual</h3>
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
      ) : !dadosAno.length ? (
        <p className="text-gray-500">Nenhum dado no ano selecionado.</p>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-2">
            Recebido no ano ({ano}): <strong>{fmtEUR.format(totalAno)}</strong>
          </p>

          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <BarChart
                data={dadosAno}
                margin={{ top: 24, right: 12, left: 0, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis
                  dataKey="mes"
                  ticks={dadosAno.map((d) => d.mes)}
                  interval={0}
                  minTickGap={0}
                  tickMargin={8}
                  tickFormatter={(label) => {
                    const m = Number(String(label).split("-")[1]);
                    const nomes = [
                      "Jan",
                      "Fev",
                      "Mar",
                      "Abr",
                      "Mai",
                      "Jun",
                      "Jul",
                      "Ago",
                      "Set",
                      "Out",
                      "Nov",
                      "Dez",
                    ];
                    return nomes[m - 1] || label;
                  }}
                />

                <YAxis
                  type="number"
                  domain={[0, max]}
                  tick={false}
                  axisLine={{ stroke: "#D1D5DB" }}
                  width={72}
                />

                {/* linhas horizontais auxiliares */}
                {minorTicks.map((y) => (
                  <ReferenceLine
                    key={`minor-${y}`}
                    y={y}
                    stroke="#E5E7EB"
                    strokeDasharray="3 3"
                    ifOverflow="extendDomain"
                  />
                ))}
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
                          fontWeight={700}
                          fill="#111827"
                        >
                          {fmtEUR.format(y)}
                        </text>
                      );
                    }}
                  />
                ))}

                {/* linha vertical do mês selecionado (por baixo) */}
                <ReferenceLine
                  x={mesAlvo}
                  stroke="#2563eb"
                  strokeDasharray="4 4"
                />

                <Tooltip
                  formatter={(value) => fmtEUR.format(value)}
                  labelFormatter={(label) => `Mês: ${label}`}
                />

                {/* barras */}
                <Bar
                  dataKey="valorTotal"
                  fill="#4ade80"
                  name="Faturamento (€)"
                />

                {/* seta azul única (triângulo), por cima das barras */}
                <ReferenceLine
                  x={mesAlvo}
                  isFront
                  ifOverflow="extendDomain"
                  label={({ viewBox }) => {
                    const { x } = viewBox || {};
                    // manter dentro da área do gráfico para não ser "cortado" pelo clipPath
                    const y = 4; // 4px abaixo do topo do plot
                    const w = 8; // metade da base
                    const h = 12; // altura
                    return (
                      <>
                        <style>{`
                          @keyframes bounceArrowBlue {
                            0%, 100% { transform: translateY(0); }
                            50%      { transform: translateY(-6px); }
                          }
                        `}</style>
                        <g
                          transform={`translate(${x},${y})`}
                          style={{ pointerEvents: "none" }}
                        >
                          <g
                            style={{
                              animation:
                                "bounceArrowBlue 1.6s ease-in-out infinite",
                            }}
                          >
                            <polygon
                              points={`${-w},0 ${w},0 0,${h}`}
                              fill="#2563eb"
                            />
                          </g>
                        </g>
                      </>
                    );
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
