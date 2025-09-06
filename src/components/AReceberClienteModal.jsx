// src/components/AReceberClienteModal.jsx
import { useEffect, useMemo, useState } from "react";
import {
  buscarPadraoSemanalCliente,
  buscarPagamentosDoMesCliente,
} from "../services/analiticoService";
import { registrarPagamentoCliente } from "../services/entregaService";
import {
  buscarClienteBasico,
  atualizarCliente,
  atualizarObservacoesCliente,
} from "../services/clienteService";

/* --- helpers de formato --- */
const fmtEUR = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
});

/* domingo..sábado -> para mapear padrão semanal */
const diasKeys = [
  "domingo",
  "segunda",
  "terca",
  "quarta",
  "quinta",
  "sexta",
  "sabado",
];

/* soma do previsto de uma lista de itens (preço * quantidade ou subtotal) */
function calcSubtotalDia(lista) {
  if (!Array.isArray(lista)) return 0;
  return lista.reduce((acc, item) => {
    const preco = Number(item?.preco || 0);
    const q = Number(item?.quantidade || 0);
    const sub = Number(item?.subtotal || 0);
    return acc + (sub || preco * q);
  }, 0);
}

/* soma o previsto do mês a partir do padrão semanal */
function previstoDoMes(padrao, mes) {
  if (!padrao || !mes) return 0;
  const [y, m] = mes.split("-").map(Number);
  const ini = new Date(y, m - 1, 1);
  const fim = new Date(y, m, 1);
  let total = 0;
  for (let d = new Date(ini); d < fim; d.setDate(d.getDate() + 1)) {
    const key = diasKeys[d.getDay()];
    total += calcSubtotalDia(padrao[key]);
  }
  return total;
}

/* confere se uma data está dentro do mês YYYY-MM */
function inMonth(date, mes) {
  const d = new Date(date);
  const [y, m] = mes.split("-").map(Number);
  return d.getFullYear() === y && d.getMonth() + 1 === m;
}

export default function AReceberClienteModal({
  open,
  onClose,
  padariaId,
  clienteId,
  clienteNome,
  mes,
}) {
  /* carregamentos base */
  const [loading, setLoading] = useState(false);
  const [padrao, setPadrao] = useState(null); // padrão semanal com preços
  const [pagamentos, setPagamentos] = useState([]); // pagamentos do mês

  /* ficha do cliente */
  const [editMode, setEditMode] = useState(false);
  const [endereco, setEndereco] = useState("");
  const [rota, setRota] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [salvandoObs, setSalvandoObs] = useState(false);
  const [salvandoCliente, setSalvandoCliente] = useState(false);
  const [erroObs, setErroObs] = useState("");
  const [erroSalvarCliente, setErroSalvarCliente] = useState("");

  /* registrar pagamento (gerente) */
  const [showReg, setShowReg] = useState(false);
  const [valorReg, setValorReg] = useState("");
  const [formaReg, setFormaReg] = useState("dinheiro");
  const [dataReg, setDataReg] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [salvandoReg, setSalvandoReg] = useState(false);
  const [erroReg, setErroReg] = useState("");

  async function recarregarPagamentos() {
    setLoading(true);
    try {
      const pays = await buscarPagamentosDoMesCliente(
        padariaId,
        clienteId,
        mes
      );
      setPagamentos(Array.isArray(pays?.pagamentos) ? pays.pagamentos : []);
    } finally {
      setLoading(false);
    }
  }

  async function salvarPagamentoGerente() {
    setErroReg("");
    const v = Number(valorReg);
    if (!Number.isFinite(v) || v <= 0) {
      setErroReg("Informe um valor válido.");
      return;
    }
    try {
      setSalvandoReg(true);
      await registrarPagamentoCliente(clienteId, {
        valor: v,
        forma: formaReg,
        data: dataReg, // yyyy-mm-dd
        mes,
      });
      setValorReg("");
      await recarregarPagamentos(); // atualiza lista/totais
    } catch (e) {
      setErroReg(e?.response?.data?.erro || "Falha ao registrar pagamento.");
    } finally {
      setSalvandoReg(false);
    }
  }

  /* carga inicial do modal */
  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);

    (async () => {
      try {
        const [p, pays, info] = await Promise.all([
          buscarPadraoSemanalCliente(clienteId),
          buscarPagamentosDoMesCliente(padariaId, clienteId, mes),
          buscarClienteBasico(clienteId),
        ]);
        if (!alive) return;

        setPadrao(p?.padraoSemanal || p || null);
        setPagamentos(Array.isArray(pays?.pagamentos) ? pays.pagamentos : []);

        // >>> preenche a FICHA com o que veio do backend (somente leitura inicialmente)
        setEndereco(info?.endereco || "");
        setRota(info?.rota || "");
        setTelefone(info?.telefone || "");
        setEmail(info?.email || "");
        setObservacoes((info?.observacoes || "").trim());

        setEditMode(false); // começa em modo leitura
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

  /* totais do mês: previsto/pago/pendente (mensal) */
  const totais = useMemo(() => {
    const prev = previstoDoMes(padrao, mes);
    const pago = (Array.isArray(pagamentos) ? pagamentos : [])
      .filter((p) => inMonth(p.data, mes))
      .reduce((s, p) => s + (Number(p.valor) || 0), 0);
    const pend = Math.max(0, prev - pago);
    return { prev, pago, pend };
  }, [padrao, pagamentos, mes]);

  // salvar dados básicos (endereço, rota, telefone, email)
  async function onSalvarDadosCliente() {
    try {
      setErroSalvarCliente("");
      setSalvandoCliente(true);
      await atualizarCliente(clienteId, {
        endereco,
        rota,
        telefone,
        email,
        // observações salvamos no botão dedicado abaixo
      });
      setEditMode(false);
    } catch (e) {
      setErroSalvarCliente(
        e?.response?.data?.erro || "Falha ao salvar dados do cliente."
      );
    } finally {
      setSalvandoCliente(false);
    }
  }

  // salvar observações
  async function onSalvarObservacoes() {
    try {
      setErroObs("");
      setSalvandoObs(true);
      await atualizarObservacoesCliente(clienteId, observacoes || "");
    } catch (e) {
      setErroObs(e?.response?.data?.erro || "Falha ao salvar observações.");
    } finally {
      setSalvandoObs(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-auto">
        {/* Cabeçalho */}
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

        {/* Resumo mensal */}
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
            <div className="text-xs text-gray-500">Pendente (mês)</div>
            <div className="text-xl font-bold">
              {fmtEUR.format(totais.pend)}
            </div>
          </div>
        </div>

        {/* Ficha do cliente */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold">Ficha do cliente</h4>
            <button
              onClick={() => setEditMode((s) => !s)}
              className="px-3 py-1 rounded border hover:bg-gray-50 text-sm"
              title="Habilita edição"
            >
              {editMode ? "Cancelar edição" : "Deseja alterar algum dado?"}
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded border p-3 bg-white">
              <div className="text-sm text-gray-500">Endereço</div>
              <input
                className="w-full border rounded px-2 py-1 mt-1"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                disabled={!editMode}
                placeholder="Rua / nº / bairro..."
              />
            </div>

            <div className="rounded border p-3 bg-white">
              <div className="text-sm text-gray-500">Rota</div>
              <input
                className="w-full border rounded px-2 py-1 mt-1 uppercase"
                value={rota}
                onChange={(e) => setRota(e.target.value.toUpperCase())}
                disabled={!editMode}
                placeholder="A, B, C..."
              />
            </div>

            <div className="rounded border p-3 bg-white">
              <div className="text-sm text-gray-500">Telefone</div>
              <input
                className="w-full border rounded px-2 py-1 mt-1"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                disabled={!editMode}
                placeholder="(xx) xxxxx-xxxx"
              />
            </div>

            <div className="rounded border p-3 bg-white">
              <div className="text-sm text-gray-500">E-mail</div>
              <input
                className="w-full border rounded px-2 py-1 mt-1"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!editMode}
                placeholder="email@exemplo.com"
              />
            </div>
          </div>

          {editMode && (
            <div className="mt-3">
              <button
                onClick={onSalvarDadosCliente}
                disabled={salvandoCliente}
                className="px-3 py-1 rounded bg-blue-600 text-white disabled:opacity-60"
              >
                {salvandoCliente ? "Salvando..." : "Salvar dados do cliente"}
              </button>
              {erroSalvarCliente && (
                <div className="text-red-600 text-sm mt-2">
                  {erroSalvarCliente}
                </div>
              )}
            </div>
          )}

          <div className="mt-4 rounded border p-3 bg-white">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">
                Observações / ponto de referência
              </div>
              <button
                onClick={onSalvarObservacoes}
                className="px-3 py-1 rounded bg-blue-600 text-white disabled:opacity-60"
                disabled={!editMode || salvandoObs}
                title={editMode ? "Salvar observações" : "Habilite a edição"}
              >
                {salvandoObs ? "Salvando..." : "Salvar observações"}
              </button>
            </div>

            <textarea
              rows={3}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="w-full border rounded px-2 py-1"
              placeholder='Ex.: "Casa amarela, portão azul, perto do Mercado X"'
              disabled={!editMode}
            />
            {erroObs && (
              <div className="text-red-600 text-sm mt-2">{erroObs}</div>
            )}
          </div>
        </div>

        {/* Pagamentos + Registrar pagamento */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold">Pagamentos do mês</h4>
            <button
              onClick={() => setShowReg((s) => !s)}
              className="px-3 py-1 rounded border hover:bg-gray-50 text-sm"
              title="Registrar pagamento (gerente)"
            >
              {showReg ? "Fechar registro" : "Registrar pagamento"}
            </button>
          </div>

          {showReg && (
            <div className="border rounded p-3 mb-4">
              <div className="text-sm font-medium mb-2">
                Registrar pagamento (gerente)
              </div>
              <div
                className="grid gap-2"
                style={{ gridTemplateColumns: "140px 1fr 160px auto" }}
              >
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="Valor (€)"
                  value={valorReg}
                  onChange={(e) => setValorReg(e.target.value)}
                  className="border rounded px-2 py-1"
                />
                <select
                  value={formaReg}
                  onChange={(e) => setFormaReg(e.target.value)}
                  className="border rounded px-2 py-1"
                >
                  <option value="dinheiro">Dinheiro</option>
                  <option value="cartão">Cartão</option>
                  <option value="transferencia">Transferência</option>
                  <option value="pix">PIX</option>
                  <option value="outro">Outro</option>
                </select>
                <input
                  type="date"
                  value={dataReg}
                  onChange={(e) => setDataReg(e.target.value)}
                  className="border rounded px-2 py-1"
                />
                <button
                  onClick={salvarPagamentoGerente}
                  disabled={salvandoReg}
                  className="px-3 py-1 rounded bg-blue-600 text-white disabled:opacity-60"
                >
                  {salvandoReg ? "Salvando..." : "Salvar"}
                </button>
              </div>
              {erroReg && (
                <div className="text-red-600 text-sm mt-2">{erroReg}</div>
              )}
            </div>
          )}

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
        {/* fim conteúdo */}
      </div>
      {/* fim overlay */}
    </div>
  );
}
