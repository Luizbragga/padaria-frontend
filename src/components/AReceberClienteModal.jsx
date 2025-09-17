import { useEffect, useMemo, useState } from "react";
import {
  buscarPadraoSemanalCliente,
  buscarPagamentosDoMesCliente,
  setPadraoSemanalCliente,
  registrarAjustePontual,
  listarAjustesPontuais,
  solicitarAlteracaoCliente,
} from "../services/analiticoService";
import { registrarPagamentoCliente } from "../services/entregaService";
import {
  buscarClienteBasico,
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

function calcSubtotalDia(lista) {
  if (!Array.isArray(lista)) return 0;
  return lista.reduce((acc, item) => {
    const preco = Number(item?.preco || 0);
    const q = Number(item?.quantidade || 0);
    const sub = Number(item?.subtotal || 0);
    return acc + (sub || preco * q);
  }, 0);
}

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

function inMonth(date, mes) {
  const d = new Date(date);
  const [y, m] = mes.split("-").map(Number);
  return d.getFullYear() === y && d.getMonth() + 1 === m;
}

function padraoVazio() {
  const vazio = {};
  diasKeys.forEach((k) => (vazio[k] = []));
  return vazio;
}

function toEditPadrao(p) {
  const alvo = padraoVazio();
  if (!p) return alvo;
  diasKeys.forEach((k) => {
    const arr = Array.isArray(p[k]) ? p[k] : [];
    alvo[k] = arr.map((i) => ({
      produtoId: String(i.produtoId ?? i.produto ?? ""),
      quantidade: Number(i.quantidade) || 0,
      preco: Number(i.preco || 0),
      subtotal: Number(i.subtotal || 0),
      nome: typeof i.produto === "object" ? i.produto?.nome : i.produto,
    }));
  });
  return alvo;
}

function fromEditPadrao(p) {
  const out = {};
  diasKeys.forEach((k) => {
    out[k] = (p[k] || [])
      .filter((i) => i.produtoId && Number(i.quantidade) > 0)
      .map((i) => ({ produto: i.produtoId, quantidade: Number(i.quantidade) }));
  });
  return out;
}

/* editor de 1 dia */
function DiaEditor({ titulo, itens, onChange, onAdd, onRemove }) {
  return (
    <div className="rounded border p-3 bg-white">
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium">{titulo}</div>
        <button
          onClick={onAdd}
          className="text-sm px-2 py-1 border rounded hover:bg-gray-50"
        >
          + Adicionar item
        </button>
      </div>
      {itens.length === 0 ? (
        <div className="text-sm text-gray-500">Sem itens.</div>
      ) : (
        <div className="space-y-2">
          {itens.map((it, idx) => (
            <div
              key={idx}
              className="grid gap-2"
              style={{ gridTemplateColumns: "1fr 110px 90px auto" }}
            >
              <input
                className="border rounded px-2 py-1 bg-gray-50"
                value={it.nome || "—"}
                title={it.produtoId || ""} // tooltip mantém o ID só como referência
                disabled
              />

              <input
                className="border rounded px-2 py-1"
                type="number"
                min={0}
                step="1"
                placeholder="Qtd"
                value={it.quantidade}
                onChange={(e) =>
                  onChange(idx, {
                    ...it,
                    quantidade: Number(e.target.value || 0),
                  })
                }
              />
              <button
                onClick={() => onRemove(idx)}
                className="px-2 py-1 border rounded hover:bg-gray-50"
              >
                Remover
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
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
  const [padrao, setPadrao] = useState(null);
  const [padraoEdit, setPadraoEdit] = useState(padraoVazio());
  const [pagamentos, setPagamentos] = useState([]);

  // ficha (somente leitura) + observações
  const [endereco, setEndereco] = useState("");
  const [rota, setRota] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [salvandoObs, setSalvandoObs] = useState(false);
  const [erroObs, setErroObs] = useState("");

  // solicitação para admin
  const [mostrarSolicitacao, setMostrarSolicitacao] = useState(false);
  const [solEndereco, setSolEndereco] = useState("");
  const [solRota, setSolRota] = useState("");
  const [solTelefone, setSolTelefone] = useState("");
  const [solEmail, setSolEmail] = useState("");
  const [enviandoSolic, setEnviandoSolic] = useState(false);
  const [msgSolic, setMsgSolic] = useState("");

  // registrar pagamento
  const [showReg, setShowReg] = useState(false);
  const [valorReg, setValorReg] = useState("");
  const [formaReg, setFormaReg] = useState("dinheiro");
  const [dataReg, setDataReg] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [salvandoReg, setSalvandoReg] = useState(false);
  const [erroReg, setErroReg] = useState("");

  // ajuste pontual
  const [ajData, setAjData] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [ajTipo, setAjTipo] = useState("add");
  const [ajItens, setAjItens] = useState([{ produtoId: "", quantidade: 1 }]);
  const [ajMsg, setAjMsg] = useState("");
  const [ajustesMes, setAjustesMes] = useState([]);

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
        data: dataReg,
        mes,
      });
      setValorReg("");
      await recarregarPagamentos();
    } catch (e) {
      setErroReg(e?.response?.data?.erro || "Falha ao registrar pagamento.");
    } finally {
      setSalvandoReg(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);

    (async () => {
      try {
        const [p, pays, info] = await Promise.all([
          buscarPadraoSemanalCliente(clienteId), // GET /api/clientes/:id/padrao-semanal
          buscarPagamentosDoMesCliente(padariaId, clienteId, mes),
          buscarClienteBasico(clienteId),
        ]);
        if (!alive) return;

        const padraoSrv = p?.padraoSemanal || p || null;
        setPadrao(padraoSrv);
        setPadraoEdit(toEditPadrao(padraoSrv));

        setPagamentos(Array.isArray(pays?.pagamentos) ? pays.pagamentos : []);

        setEndereco(info?.endereco || "");
        setRota(info?.rota || "");
        setTelefone(info?.telefone || "");
        setEmail(info?.email || "");
        setObservacoes((info?.observacoes || "").trim());

        setSolEndereco(info?.endereco || "");
        setSolRota(info?.rota || "");
        setSolTelefone(info?.telefone || "");
        setSolEmail(info?.email || "");
        setMsgSolic("");
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

  const totais = useMemo(() => {
    const prev = previstoDoMes(padrao, mes);
    const pago = (Array.isArray(pagamentos) ? pagamentos : [])
      .filter((p) => inMonth(p.data, mes))
      .reduce((s, p) => s + (Number(p.valor) || 0), 0);
    const pend = Math.max(0, prev - pago);
    return { prev, pago, pend };
  }, [padrao, pagamentos, mes]);

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

  async function onSalvarPadrao() {
    const payload = fromEditPadrao(padraoEdit);
    await setPadraoSemanalCliente(clienteId, payload); // PUT /api/clientes/:id/padrao-semanal
    const novo = await buscarPadraoSemanalCliente(clienteId);
    const srv = novo?.padraoSemanal || novo || null;
    setPadrao(srv);
    setPadraoEdit(toEditPadrao(srv));
  }

  async function carregarAjustesDoMes() {
    const [y, m] = mes.split("-").map(Number);
    const ini = `${y}-${String(m).padStart(2, "0")}-01`;
    const last = new Date(y, m, 0).getDate();
    const fim = `${y}-${String(m).padStart(2, "0")}-${String(last).padStart(
      2,
      "0"
    )}`;
    const { ajustes } = await listarAjustesPontuais(clienteId, ini, fim); // GET /api/clientes/:id/ajustes
    setAjustesMes(Array.isArray(ajustes) ? ajustes : []);
  }
  useEffect(() => {
    if (open) carregarAjustesDoMes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mes, clienteId]);

  async function onRegistrarAjuste() {
    setAjMsg("");
    const itens = ajItens
      .filter((i) => i.produtoId && Number(i.quantidade) > 0)
      .map((i) => ({ produto: i.produtoId, quantidade: Number(i.quantidade) }));
    if (!ajData || itens.length === 0) {
      setAjMsg("Informe data e ao menos 1 item (produto e quantidade).");
      return;
    }
    await registrarAjustePontual(clienteId, padariaId, {
      data: ajData,
      tipo: ajTipo,
      itens,
    }); // POST /api/clientes/:id/ajuste-pontual
    setAjMsg("Ajuste pontual registrado.");
    setAjItens([{ produtoId: "", quantidade: 1 }]);
    await carregarAjustesDoMes();
  }

  async function onEnviarSolicitacao() {
    setEnviandoSolic(true);
    setMsgSolic("");
    try {
      const dados = {
        endereco: solEndereco,
        rota: solRota,
        telefone: solTelefone,
        email: solEmail,
      };
      await solicitarAlteracaoCliente(clienteId, padariaId, dados); // POST /api/clientes/:id/solicitar-alteracao
      setMsgSolic("Solicitação enviada ao administrador.");
      setMostrarSolicitacao(false);
    } catch (e) {
      setMsgSolic(
        e?.response?.data?.erro || "Falha ao enviar solicitação ao admin."
      );
    } finally {
      setEnviandoSolic(false);
    }
  }

  // Handlers para editar padrão
  const changeDiaItem = (dia) => (idx, novo) => {
    setPadraoEdit((prev) => {
      const arr = [...prev[dia]];
      arr[idx] = novo;
      return { ...prev, [dia]: arr };
    });
  };
  const addDiaItem = (dia) => () =>
    setPadraoEdit((prev) => ({
      ...prev,
      [dia]: [...prev[dia], { produtoId: "", quantidade: 1 }],
    }));
  const removeDiaItem = (dia) => (idx) =>
    setPadraoEdit((prev) => {
      const arr = prev[dia].slice();
      arr.splice(idx, 1);
      return { ...prev, [dia]: arr };
    });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[3001] flex items-start justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative mt-6 w-full max-w-6xl bg-white rounded-xl shadow-xl overflow-auto max-h-[90vh]">
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
          <div className="p-3 rounded bg-gray-50 border-[3px] border-blue-600">
            <div className="text-xs text-gray-500">Previsto no mês</div>
            <div className="text-xl font-bold">
              {fmtEUR.format(totais.prev)}
            </div>
          </div>
          <div className="p-3 rounded bg-gray-50 border-[3px] border-blue-600">
            <div className="text-xs text-gray-500">Pago no mês</div>
            <div className="text-xl font-bold">
              {fmtEUR.format(totais.pago)}
            </div>
          </div>
          <div className="p-3 rounded bg-gray-50 border-[3px] border-blue-600">
            <div className="text-xs text-gray-500">Pendente (mês)</div>
            <div className="text-xl font-bold">
              {fmtEUR.format(totais.pend)}
            </div>
          </div>
        </div>

        {/* Ficha do cliente (somente leitura) + Solicitação ao admin */}
        <div className="p-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded border p-3 bg-white">
              <div className="text-sm text-gray-500">Endereço</div>
              <input
                className="w-full border rounded px-2 py-1 mt-1"
                value={endereco}
                disabled
              />
            </div>
            <div className="rounded border p-3 bg-white">
              <div className="text-sm text-gray-500">Rota</div>
              <input
                className="w-full border rounded px-2 py-1 mt-1 uppercase"
                value={rota}
                disabled
              />
            </div>
            <div className="rounded border p-3 bg-white">
              <div className="text-sm text-gray-500">Telefone</div>
              <input
                className="w-full border rounded px-2 py-1 mt-1"
                value={telefone}
                disabled
              />
            </div>
            <div className="rounded border p-3 bg-white">
              <div className="text-sm text-gray-500">E-mail</div>
              <input
                className="w-full border rounded px-2 py-1 mt-1"
                value={email}
                disabled
              />
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 mb-2">
            <h4 className="font-semibold">Solicitar alteração cadastral</h4>
            <button
              onClick={() => setMostrarSolicitacao((s) => !s)}
              className="px-3 py-1 rounded border hover:bg-gray-50 text-sm"
              title="Solicitar alteração ao administrador"
            >
              {mostrarSolicitacao ? "Fechar formulário" : "Abrir formulário"}
            </button>
          </div>

          {mostrarSolicitacao && (
            <div className="rounded border p-3 bg-white">
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500">
                    Novo endereço
                  </label>
                  <input
                    className="w-full border rounded px-2 py-1"
                    value={solEndereco}
                    onChange={(e) => setSolEndereco(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500">
                    Nova rota
                  </label>
                  <input
                    className="w-full border rounded px-2 py-1 uppercase"
                    value={solRota}
                    onChange={(e) => setSolRota(e.target.value.toUpperCase())}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500">
                    Novo telefone
                  </label>
                  <input
                    className="w-full border rounded px-2 py-1"
                    value={solTelefone}
                    onChange={(e) => setSolTelefone(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500">
                    Novo e-mail
                  </label>
                  <input
                    className="w-full border rounded px-2 py-1"
                    value={solEmail}
                    onChange={(e) => setSolEmail(e.target.value)}
                  />
                </div>
              </div>
              <div className="mt-3">
                <button
                  onClick={onEnviarSolicitacao}
                  disabled={enviandoSolic}
                  className="px-3 py-1 rounded bg-blue-600 text-white disabled:opacity-60"
                >
                  {enviandoSolic ? "Enviando..." : "Enviar solicitação"}
                </button>
                {msgSolic && <div className="text-sm mt-2">{msgSolic}</div>}
              </div>
            </div>
          )}

          {/* Observações */}
          <div className="mt-4 rounded border p-3 bg-white">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">
                Observações / ponto de referência
              </div>
              <button
                onClick={onSalvarObservacoes}
                className="px-3 py-1 rounded bg-blue-600 text-white disabled:opacity-60"
                disabled={salvandoObs}
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
            />
            {erroObs && (
              <div className="text-red-600 text-sm mt-2">{erroObs}</div>
            )}
          </div>
        </div>

        {/* Padrão semanal */}
        <div className="p-4">
          <h4 className="font-semibold mb-3">Padrão semanal do cliente</h4>
          <div className="grid md:grid-cols-2 gap-3">
            {diasKeys.map((dia) => (
              <DiaEditor
                key={dia}
                titulo={dia.charAt(0).toUpperCase() + dia.slice(1)}
                itens={padraoEdit[dia] || []}
                onChange={(idx, novo) =>
                  setPadraoEdit((prev) => {
                    const arr = [...prev[dia]];
                    arr[idx] = novo;
                    return { ...prev, [dia]: arr };
                  })
                }
                onAdd={() =>
                  setPadraoEdit((prev) => ({
                    ...prev,
                    [dia]: [...prev[dia], { produtoId: "", quantidade: 1 }],
                  }))
                }
                onRemove={(idx) =>
                  setPadraoEdit((prev) => {
                    const arr = prev[dia].slice();
                    arr.splice(idx, 1);
                    return { ...prev, [dia]: arr };
                  })
                }
              />
            ))}
          </div>
          <div className="mt-3">
            <button
              onClick={onSalvarPadrao}
              className="px-3 py-1 rounded bg-blue-600 text-white"
            >
              Salvar padrão semanal
            </button>
          </div>
        </div>

        {/* Ajuste pontual (um dia específico) */}
        <div className="p-4">
          <h4 className="font-semibold mb-3">Ajuste pontual (um dia)</h4>
          <div className="grid gap-2 md:grid-cols-4">
            <div>
              <label className="block text-xs text-gray-500">Data</label>
              <input
                type="date"
                className="border rounded px-2 py-1 w-full"
                value={ajData}
                onChange={(e) => setAjData(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500">Tipo</label>
              <select
                className="border rounded px-2 py-1 w-full"
                value={ajTipo}
                onChange={(e) => setAjTipo(e.target.value)}
              >
                <option value="add">Adicionar ao padrão</option>
                <option value="replace">Substituir o dia</option>
              </select>
            </div>
          </div>

          <div className="mt-2 space-y-2">
            {ajItens.map((it, i) => (
              <div
                key={i}
                className="grid gap-2"
                style={{ gridTemplateColumns: "1fr 120px 90px" }}
              >
                <input
                  className="border rounded px-2 py-1"
                  placeholder="Produto (ID)"
                  value={it.produtoId}
                  onChange={(e) => {
                    const v = e.target.value;
                    setAjItens((prev) => {
                      const arr = prev.slice();
                      arr[i] = { ...arr[i], produtoId: v };
                      return arr;
                    });
                  }}
                />
                <input
                  className="border rounded px-2 py-1"
                  type="number"
                  min={1}
                  step="1"
                  placeholder="Quantidade"
                  value={it.quantidade}
                  onChange={(e) => {
                    const v = Number(e.target.value || 0);
                    setAjItens((prev) => {
                      const arr = prev.slice();
                      arr[i] = { ...arr[i], quantidade: v };
                      return arr;
                    });
                  }}
                />
                <button
                  className="border rounded px-2 py-1 hover:bg-gray-50"
                  onClick={() =>
                    setAjItens((prev) => prev.filter((_, idx) => idx !== i))
                  }
                >
                  Remover
                </button>
              </div>
            ))}
            <button
              className="text-sm px-2 py-1 border rounded hover:bg-gray-50"
              onClick={() =>
                setAjItens((prev) => [
                  ...prev,
                  { produtoId: "", quantidade: 1 },
                ])
              }
            >
              + Adicionar item
            </button>
          </div>

          <div className="mt-3">
            <button
              onClick={onRegistrarAjuste}
              className="px-3 py-1 rounded bg-blue-600 text-white"
            >
              Registrar ajuste pontual
            </button>
            {ajMsg && <div className="text-sm mt-2">{ajMsg}</div>}
          </div>

          {/* Lista de ajustes do mês */}
          <div className="mt-4">
            <div className="text-sm font-medium mb-1">
              Ajustes deste mês ({mes})
            </div>
            {ajustesMes.length === 0 ? (
              <div className="text-sm text-gray-500">Nenhum ajuste.</div>
            ) : (
              <div className="overflow-auto rounded border">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-2">Data</th>
                      <th className="text-left p-2">Tipo</th>
                      <th className="text-left p-2">Itens</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ajustesMes.map((a) => (
                      <tr key={a._id} className="border-t">
                        <td className="p-2">
                          {new Date(a.data).toLocaleDateString("pt-PT")}
                        </td>
                        <td className="p-2">{a.tipo}</td>
                        <td className="p-2">
                          {(a.itens || [])
                            .map(
                              (i) =>
                                `${i?.produto?.nome ?? i.produto}: ${
                                  i.quantidade
                                }`
                            )
                            .join(", ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
                  <option value="mbway">MB Way</option>
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
                      <td className="p-2 capitalize">{p.forma || "-"}</td>
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
