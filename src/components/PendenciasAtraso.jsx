import { useEffect, useMemo, useRef, useState } from "react";
import {
  buscarPendenciasAno,
  buscarPendenciasDoMes,
} from "../services/analiticoService";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import AReceberClienteModal from "./AReceberClienteModal";

const fmtEUR = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
});

function yyyymm(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function PendenciasAtraso({ padariaId, gracaDia = 8 }) {
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(yyyymm(hoje));
  const [serie, setSerie] = useState([]); // [{mes, emAtraso, clientesEmAtraso, liberado, ...}]
  const [lista, setLista] = useState({
    clientes: [],
    totalPendente: 0,
    clientesEmAtraso: 0,
    liberado: true,
  });
  const [loadingAno, setLoadingAno] = useState(false);
  const [loadingMes, setLoadingMes] = useState(false);
  const [erro, setErro] = useState("");

  // modal de pagamento (reaproveita seu modal atual)
  const [modalOpen, setModalOpen] = useState(false);
  const [selCliente, setSelCliente] = useState({ id: null, nome: "" });

  const vivo = useRef(true);

  async function carregarAno() {
    if (!padariaId) return;
    setLoadingAno(true);
    setErro("");
    try {
      const resp = await buscarPendenciasAno(padariaId, ano, gracaDia);
      if (!vivo.current) return;
      setSerie(resp?.meses || []);
    } catch (e) {
      if (!vivo.current) return;
      console.error(e);
      setErro("Erro ao carregar pendências anuais.");
      setSerie([]);
    } finally {
      if (vivo.current) setLoadingAno(false);
    }
  }

  async function carregarMes() {
    if (!padariaId || !mes) return;
    setLoadingMes(true);
    setErro("");
    try {
      const resp = await buscarPendenciasDoMes(padariaId, mes, gracaDia);
      if (!vivo.current) return;
      setLista({
        clientes: resp?.clientes || [],
        totalPendente: Number(resp?.totalPendente || 0),
        clientesEmAtraso: Number(resp?.clientesEmAtraso || 0),
        liberado: !!resp?.liberado,
      });
    } catch (e) {
      if (!vivo.current) return;
      console.error(e);
      setErro("Erro ao carregar pendências do mês.");
      setLista({
        clientes: [],
        totalPendente: 0,
        clientesEmAtraso: 0,
        liberado: true,
      });
    } finally {
      if (vivo.current) setLoadingMes(false);
    }
  }

  useEffect(() => {
    vivo.current = true;
    carregarAno();
    return () => {
      vivo.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [padariaId, ano, gracaDia]);

  useEffect(() => {
    vivo.current = true;
    carregarMes();
    return () => {
      vivo.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [padariaId, mes, gracaDia]);

  // ======= Dados do gráfico (sempre 12 meses do ano) =======
  const graficoData = useMemo(() => {
    // Mapa "YYYY-MM" -> { emAtraso, clientes, liberado }
    const mapa = new Map();
    for (const m of Array.isArray(serie) ? serie : []) {
      const key = String(m.mes || "");
      if (key.startsWith(`${ano}-`)) {
        mapa.set(key, {
          emAtraso: Number(m.emAtraso || 0),
          clientes: Number(m.clientesEmAtraso || 0),
          liberado: !!m.liberado,
        });
      }
    }

    const arr = [];
    for (let mm = 1; mm <= 12; mm++) {
      const label = `${ano}-${String(mm).padStart(2, "0")}`;
      const base = mapa.get(label) || {
        emAtraso: 0,
        clientes: 0,
        liberado: true,
      };
      arr.push({ mes: label, ...base });
    }
    return arr;
  }, [serie, ano]);

  return (
    <div className="bg-white shadow rounded p-6 mt-6">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h3 className="text-xl font-bold">📊 Pendências (Atrasos)</h3>
        <div className="flex gap-2">
          <select
            value={ano}
            onChange={(e) => setAno(Number(e.target.value))}
            className="border rounded px-2 py-1"
            title="Ano"
          >
            {[-1, 0, 1]
              .map((off) => hoje.getFullYear() + off)
              .map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
          </select>

          <input
            type="month"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="border rounded px-2 py-1"
            title="Mês para detalhar"
          />

          <button
            className="text-sm px-3 py-1 rounded border"
            onClick={() => {
              carregarAno();
              carregarMes();
            }}
            disabled={loadingAno || loadingMes}
          >
            {loadingAno || loadingMes ? "Atualizando…" : "Atualizar"}
          </button>
        </div>
      </div>

      {erro && <p className="text-red-600 mb-3">{erro}</p>}

      {/* Gráfico anual */}
      <div className="mb-4">
        <div className="text-sm text-gray-500 mb-2">
          Barras: Valor em atraso (R$) • Linha: Nº clientes em atraso{" "}
          <span className="text-gray-400">
            (só após o dia {gracaDia} do mês seguinte).
          </span>
        </div>
        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer>
            <ComposedChart
              data={graficoData}
              margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis
                dataKey="mes"
                ticks={graficoData.map((d) => d.mes)} // garante Jan–Dez
                interval={0} // não pular labels
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

              <YAxis yAxisId="left" tickFormatter={(v) => fmtEUR.format(v)} />
              <YAxis
                yAxisId="right"
                orientation="right"
                allowDecimals={false}
              />

              <Tooltip
                formatter={(value, name) => {
                  if (name === "emAtraso")
                    return [fmtEUR.format(value), "Em atraso"];
                  if (name === "clientes") return [value, "Clientes"];
                  return [value, name];
                }}
                labelFormatter={(label) => `Mês: ${label}`}
              />

              <Legend />

              <Bar yAxisId="left" dataKey="emAtraso" name="Em atraso" />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="clientes"
                name="Clientes"
                dot
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Lista do mês selecionado */}
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold">Detalhe de {mes}</h4>
        <div className="text-sm text-gray-600">
          Total em atraso:{" "}
          <span className="font-semibold">
            {fmtEUR.format(lista.totalPendente || 0)}
          </span>{" "}
          • Clientes:{" "}
          <span className="font-semibold">{lista.clientesEmAtraso || 0}</span>{" "}
          {!lista.liberado && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 text-xs rounded bg-yellow-100 text-yellow-800">
              ainda no prazo (libera após dia {gracaDia})
            </span>
          )}
        </div>
      </div>

      {loadingMes ? (
        <p className="text-gray-500">Carregando lista…</p>
      ) : !lista.liberado ? (
        <p className="text-gray-500">Este mês ainda não está “em atraso”.</p>
      ) : (lista.clientes || []).length === 0 ? (
        <p className="text-gray-500">Nenhum cliente em atraso neste mês.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600">
                <th className="py-2 pr-3">Cliente</th>
                <th className="py-2 pr-3">Rota</th>
                <th className="py-2 pr-3">Pendente</th>
                <th className="py-2 pr-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {lista.clientes.map((c) => (
                <tr key={c.cliente} className="border-t">
                  <td className="py-2 pr-3">{c.nome || c.cliente}</td>
                  <td className="py-2 pr-3">{c.rota || "—"}</td>
                  <td className="py-2 pr-3 font-semibold">
                    {fmtEUR.format(c.pendente || 0)}
                  </td>
                  <td className="py-2 pr-3">
                    <button
                      className="text-sm px-3 py-1 rounded border"
                      title="Registrar pagamento"
                      onClick={() => {
                        setSelCliente({
                          id: c.cliente,
                          nome: c.nome || c.cliente,
                        });
                        setModalOpen(true);
                      }}
                    >
                      Registrar pagamento
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de pagamento */}
      <AReceberClienteModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        padariaId={padariaId}
        clienteId={selCliente.id}
        clienteNome={selCliente.nome}
        mes={mes}
      />
    </div>
  );
}
