import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  buscarPadraoSemanalCliente,
  buscarPagamentosDoMesCliente,
} from "../services/analiticoService";

const fmtEUR = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
});

const diasKeys = [
  "domingo",
  "segunda",
  "terca",
  "quarta",
  "quinta",
  "sexta",
  "sabado",
];
const diasLabel = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function ymd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function labelDia(d) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${day}/${m}`;
}

function calcSubtotalDia(lista) {
  if (!Array.isArray(lista)) return 0;
  return lista.reduce((acc, item) => {
    const preco = Number(item?.preco || 0);
    const q = Number(item?.quantidade || 0);
    const sub = Number(item?.subtotal || 0);
    return acc + (sub || preco * q);
  }, 0);
}

export default function AReceberClienteModal({
  open,
  onClose,
  padariaId,
  clienteId,
  clienteNome,
  mes,
}) {
  const [loading, setLoading] = useState(false);
  const [padrao, setPadrao] = useState(null); // { domingo: [...], segunda: [...], ... }
  const [pagamentos, setPagamentos] = useState([]); // [{data, valor, forma, entregador}, ...]

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);

    (async () => {
      try {
        // 1) padrão semanal (populado com preço)
        const p = await buscarPadraoSemanalCliente(clienteId);
        if (!alive) return;
        setPadrao(p?.padraoSemanal || p || null);

        // 2) pagamentos do mês para este cliente
        const pays = await buscarPagamentosDoMesCliente(
          padariaId,
          clienteId,
          mes
        );
        if (!alive) return;
        setPagamentos(Array.isArray(pays?.pagamentos) ? pays.pagamentos : []);
      } catch (e) {
        console.error("Modal cliente - load:", e);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [open, clienteId, padariaId, mes]);

  // timeline dia-a-dia: previsto vs pago
  const dataChart = useMemo(() => {
    if (!padrao) return [];

    const [y, m] = mes.split("-").map(Number);
    const ini = new Date(y, m - 1, 1);
    const fim = new Date(y, m, 1);

    // pagamentos agrupados por dia
    const pagoPorDia = {};
    for (const pg of pagamentos) {
      const d = new Date(pg.data);
      if (d >= ini && d < fim) {
        const key = ymd(d);
        pagoPorDia[key] = (pagoPorDia[key] || 0) + Number(pg.valor || 0);
      }
    }

    const out = [];
    for (let d = new Date(ini); d < fim; d.setDate(d.getDate() + 1)) {
      const keySemana = diasKeys[d.getDay()];
      const keyData = ymd(d);

      const previsto = calcSubtotalDia(padrao[keySemana]);
      const pago = Number(pagoPorDia[keyData] || 0);
      const pendente = Math.max(0, previsto - pago);

      out.push({
        data: labelDia(d),
        previsto,
        pago,
        pendente,
      });
    }
    return out;
  }, [padrao, pagamentos, mes]);

  const totais = useMemo(() => {
    const prev = dataChart.reduce((a, r) => a + r.previsto, 0);
    const pago = dataChart.reduce((a, r) => a + r.pago, 0);
    const pend = Math.max(0, prev - pago);
    return { prev, pago, pend };
  }, [dataChart]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-auto">
        {/* header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="text-lg font-semibold">Cliente: {clienteNome}</h3>
            <p className="text-sm text-gray-500">Mês: {mes}</p>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded border hover:bg-gray-50"
          >
            Fechar
          </button>
        </div>

        {/* resumo */}
        <div className="grid sm:grid-cols-3 gap-4 p-4">
          <div className="p-3 rounded bg-gray-50">
            <div className="text-xs text-gray-500">Previsto no mês</div>
            <div className="text-xl font-bold">
              {fmtEUR.format(totais.prev)}
            </div>
          </div>
          <div className="p-3 rounded bg-gray-50">
            <div className="text-xs text-gray-500">Pago no mês</div>
            <div className="text-xl font-bold">
              {fmtEUR.format(totais.pago)}
            </div>
          </div>
          <div className="p-3 rounded bg-gray-50">
            <div className="text-xs text-gray-500">Pendente</div>
            <div className="text-xl font-bold">
              {fmtEUR.format(totais.pend)}
            </div>
          </div>
        </div>

        {/* chart */}
        <div className="p-4">
          <h4 className="font-semibold mb-2">Timeline do mês (por dia)</h4>
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <BarChart
                data={dataChart}
                margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="data" />
                <YAxis />
                <Tooltip formatter={(v, n) => [fmtEUR.format(v), n]} />
                <Legend />
                <Bar dataKey="previsto" name="Previsto" />
                <Bar dataKey="pago" name="Pago" />
                <Bar dataKey="pendente" name="Pendente" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* lista de pagamentos */}
        <div className="p-4">
          <h4 className="font-semibold mb-2">Pagamentos do mês</h4>
          {loading ? (
            <div className="text-sm text-gray-500">Carregando…</div>
          ) : pagamentos.length === 0 ? (
            <div className="text-sm text-gray-500">
              Sem pagamentos neste mês.
            </div>
          ) : (
            <div className="overflow-auto rounded border">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-2">Data</th>
                    <th className="text-left p-2">Valor</th>
                    <th className="text-left p-2">Forma</th>
                    <th className="text-left p-2">Entregador</th>
                  </tr>
                </thead>
                <tbody>
                  {pagamentos.map((p) => (
                    <tr key={p._id} className="border-t">
                      <td className="p-2">
                        {new Date(p.data).toLocaleDateString("pt-PT")}
                      </td>
                      <td className="p-2">
                        {fmtEUR.format(Number(p.valor || 0))}
                      </td>
                      <td className="p-2 capitalize">{p.forma}</td>
                      <td className="p-2">{p.entregador || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
