// src/pages/CaixaAtendente.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { http } from "../services/http";
import { getUsuario } from "../utils/auth";

const fmtEUR = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
});

// helpers de datas
function hojeYMD() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function mesAtualYM() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
function dataHeaderPT() {
  return new Date().toLocaleDateString("pt-PT", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function CaixaAtendente() {
  // ====== contexto do usuário (atendente) ======
  const usuario = getUsuario();
  const nomeAtendente = usuario?.nome || "—";
  const padariaId = usuario?.padaria || null;

  // ====== estado do pagamento ======
  const [clienteSel, setClienteSel] = useState(null);
  const [valor, setValor] = useState("");
  const [forma, setForma] = useState("dinheiro");
  const [dataPg, setDataPg] = useState(hojeYMD());
  const [mesRef, setMesRef] = useState(mesAtualYM());
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState("");

  // ====== modal de seleção ======
  const [abrirModal, setAbrirModal] = useState(false);

  // filtros do modal
  const [buscaNome, setBuscaNome] = useState("");
  const [buscaEndereco, setBuscaEndereco] = useState("");
  const [rotaFiltro, setRotaFiltro] = useState("");

  // dados do modal
  const [rotas, setRotas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [erroClientes, setErroClientes] = useState("");

  // controle de carregamento “suave” (sem trocar a lista por placeholder)
  const [softLoading, setSoftLoading] = useState(false);
  const [jaCarregouUmaVez, setJaCarregouUmaVez] = useState(false);

  // debounce + controle de requisições (evita aplicar resposta antiga)
  const debounceRef = useRef(null);
  const lastReqId = useRef(0);
  const loaderTimerRef = useRef(null);

  // foco estável no input do nome (evita flicker com StrictMode)
  const nomeInputRef = useRef(null);
  useEffect(() => {
    if (abrirModal) {
      requestAnimationFrame(() => nomeInputRef.current?.focus());
    }
  }, [abrirModal]);

  // ====== carregar rotas quando abrir o modal ======
  useEffect(() => {
    if (!abrirModal) return;
    let vivo = true;

    async function carregarRotas() {
      try {
        const { data } = await http.get("´rotas/nomes", {
          params: padariaId ? { padaria: padariaId } : undefined,
        });
        if (!vivo) return;
        const arr = Array.isArray(data) ? data : [];
        setRotas(arr);
      } catch {
        if (!vivo) return;
        setRotas([]);
      }
    }

    carregarRotas();
    return () => {
      vivo = false;
    };
  }, [abrirModal, padariaId]);

  // ====== buscar clientes (com “soft loading” e anti-race) ======
  async function fetchClientes() {
    if (!abrirModal) return;

    const reqId = ++lastReqId.current;

    // inicia “soft loading” apenas se demorar > 200ms (evita blink)
    if (loaderTimerRef.current) clearTimeout(loaderTimerRef.current);
    loaderTimerRef.current = setTimeout(() => setSoftLoading(true), 200);

    setErroClientes("");
    try {
      const params = { pagina: 1, limit: 50 };
      if (rotaFiltro) params.rota = rotaFiltro;
      if (buscaNome) params.buscaNome = buscaNome;
      if (buscaEndereco) params.buscaEndereco = buscaEndereco;

      const { data } = await http.get("api/clientes", { params });

      if (reqId === lastReqId.current) {
        setClientes(Array.isArray(data) ? data : []);
        setJaCarregouUmaVez(true);
      }
    } catch {
      if (reqId === lastReqId.current) {
        setErroClientes("Erro ao buscar clientes.");
        setClientes([]);
      }
    } finally {
      if (reqId === lastReqId.current) {
        if (loaderTimerRef.current) clearTimeout(loaderTimerRef.current);
        setSoftLoading(false);
      }
    }
  }

  // chama fetchClientes quando abrir o modal ou filtros mudarem (com debounce)
  useEffect(() => {
    if (!abrirModal) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchClientes, 150);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abrirModal, buscaNome, buscaEndereco, rotaFiltro]);

  // ====== ações ======
  function abrirSeletor() {
    setAbrirModal(true);
    setBuscaNome("");
    setBuscaEndereco("");
    setRotaFiltro("");
    setErroClientes("");
    // vamos carregar assim que o effect com debounce disparar
  }

  function escolherCliente(cli) {
    setClienteSel(cli);
    setAbrirModal(false);
  }

  async function onRegistrar(e) {
    e.preventDefault();
    setMsg("");

    if (!clienteSel) {
      setMsg("Selecione um cliente.");
      return;
    }
    const v = parseFloat(String(valor).replace(",", "."));
    if (!Number.isFinite(v) || v <= 0) {
      setMsg("Informe um valor válido.");
      return;
    }

    setEnviando(true);
    try {
      const payload = {
        valor: +v.toFixed(2),
        forma,
        data: dataPg || undefined, // "YYYY-MM-DD"
        mes: mesRef || undefined, // "YYYY-MM"
      };
      await http.post(`/pagamentos/cliente/${clienteSel._id}`, payload);

      setMsg("Pagamento registrado com sucesso!");
      setValor("");
    } catch (e) {
      const status = e?.response?.status;
      if (status === 403) {
        setMsg(
          "Sem permissão para registrar pagamentos (403). Verifique seu perfil de acesso."
        );
      } else if (status === 404) {
        setMsg("Cliente não encontrado (404).");
      } else {
        setMsg("Falha ao registrar pagamento.");
      }
    } finally {
      setEnviando(false);
    }
  }

  // render
  return (
    <div className="min-h-screen bg-gray-100 text-gray-800">
      {/* Header */}
      <header className="bg-white shadow p-4 sticky top-0 z-10">
        <h1 className="text-2xl font-bold">Caixa do Atendente</h1>
        <p className="text-sm text-gray-500">
          Atendente • <span className="font-medium">{nomeAtendente}</span> •{" "}
          {dataHeaderPT()}
        </p>
      </header>

      <main className="p-6 max-w-3xl mx-auto">
        {/* Card Seleção do Cliente */}
        <div className="bg-white rounded shadow p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Cliente</div>
              <div className="text-lg font-semibold">
                {clienteSel ? clienteSel.nome : "— nenhum selecionado —"}
              </div>
            </div>
            <button
              className="px-3 py-2 rounded bg-indigo-600 text-white"
              onClick={abrirSeletor}
            >
              Selecionar cliente
            </button>
          </div>
        </div>

        {/* Card Pagamento */}
        <div className="bg-white rounded shadow p-4">
          <h2 className="text-lg font-semibold mb-3">Registrar pagamento</h2>

          {!clienteSel && (
            <div className="text-sm text-gray-600 mb-3">
              Selecione um cliente para habilitar o formulário.
            </div>
          )}

          <form onSubmit={onRegistrar} className="grid md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <label className="block text-sm mb-1">Valor</label>
              <input
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                className="border rounded px-2 py-1 w-full"
                disabled={!clienteSel || enviando}
                placeholder="0,00"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Forma</label>
              <select
                value={forma}
                onChange={(e) => setForma(e.target.value)}
                className="border rounded px-2 py-1 w-full"
                disabled={!clienteSel || enviando}
              >
                <option value="dinheiro">Dinheiro</option>
                <option value="cartao">Cartão</option>
                <option value="mbway">MB Way</option>
              </select>
            </div>

            <div>
              <label className="block text-sm mb-1">Data (opcional)</label>
              <input
                type="date"
                value={dataPg}
                onChange={(e) => setDataPg(e.target.value)}
                className="border rounded px-2 py-1 w-full"
                disabled={!clienteSel || enviando}
              />
            </div>

            <div>
              <label className="block text-sm mb-1">
                Mês de referência (opcional)
              </label>
              <input
                type="month"
                value={mesRef}
                onChange={(e) => setMesRef(e.target.value)}
                className="border rounded px-2 py-1 w-full"
                disabled={!clienteSel || enviando}
              />
            </div>

            <div className="md:col-span-3 flex items-end">
              <button
                className="px-4 py-2 rounded bg-emerald-600 text-white disabled:opacity-60"
                disabled={!clienteSel || enviando}
              >
                {enviando ? "Registrando..." : "Registrar pagamento"}
              </button>
            </div>

            <div className="md:col-span-4">
              {msg && (
                <div
                  className={`text-sm mt-1 ${
                    msg.toLowerCase().includes("sucesso")
                      ? "text-emerald-700"
                      : "text-red-600"
                  }`}
                >
                  {msg}
                </div>
              )}
              {clienteSel && (
                <div className="text-xs text-gray-500 mt-2">
                  Cliente selecionado: <strong>{clienteSel.nome}</strong>
                </div>
              )}
            </div>
          </form>
        </div>
      </main>

      {/* ===== Modal (sempre montado, só esconde com CSS) ===== */}
      <div
        className={`fixed inset-0 z-50 transition-opacity duration-150 ${
          abrirModal
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!abrirModal}
      >
        {/* backdrop */}
        <div
          className="absolute inset-0 bg-black/40"
          onClick={() => setAbrirModal(false)}
        />
        {/* content */}
        <div
          className={`relative mx-auto mt-12 w-[min(900px,95vw)] rounded bg-white p-4 shadow transition-transform duration-150 ${
            abrirModal ? "translate-y-0" : "translate-y-2"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Selecionar cliente</h3>
            <button
              className="px-3 py-1 border rounded"
              onClick={() => setAbrirModal(false)}
            >
              Fechar
            </button>
          </div>

          {/* filtros */}
          <div className="relative grid md:grid-cols-3 gap-2 mb-3">
            {/* indicador de loading discreto (sem trocar layout) */}
            {softLoading && (
              <div className="absolute right-0 -top-6 text-xs text-gray-500 select-none">
                Carregando…
              </div>
            )}

            <div className="relative">
              <label className="block text-sm mb-1">Buscar por nome</label>
              <input
                ref={nomeInputRef}
                className="border rounded px-8 py-1 w-full"
                placeholder="Digite para filtrar…"
                value={buscaNome}
                onChange={(e) => setBuscaNome(e.target.value)}
              />
              <span className="absolute left-2 top-[30px] text-gray-400">
                🔎
              </span>
            </div>

            <div className="relative">
              <label className="block text-sm mb-1">Buscar por endereço</label>
              <input
                className="border rounded px-8 py-1 w-full"
                placeholder="Rua, avenida…"
                value={buscaEndereco}
                onChange={(e) => setBuscaEndereco(e.target.value)}
              />
              <span className="absolute left-2 top-[30px] text-gray-400">
                🔎
              </span>
            </div>

            <div>
              <label className="block text-sm mb-1">Filtrar por rota</label>
              <select
                className="border rounded px-2 py-1 w-full"
                value={rotaFiltro}
                onChange={(e) => setRotaFiltro(e.target.value)}
              >
                <option value="">Todas</option>
                {rotas.length === 0 ? (
                  <option disabled>Sem rotas</option>
                ) : (
                  rotas.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* lista de clientes (nunca substituída por "Carregando…") */}
          <div className="border rounded max-h-[55vh] overflow-auto">
            {erroClientes ? (
              <div className="p-3 text-sm text-red-600">{erroClientes}</div>
            ) : clientes.length === 0 ? (
              <div className="p-3 text-sm text-gray-500">
                {jaCarregouUmaVez
                  ? "Nenhum cliente encontrado."
                  : "Carregando…"}
              </div>
            ) : (
              <ul>
                {clientes.map((c) => (
                  <li
                    key={c._id}
                    className="flex items-center justify-between p-2 border-b hover:bg-gray-50"
                  >
                    <div className="font-medium">{c.nome}</div>
                    <button
                      className="px-3 py-1 rounded bg-indigo-600 text-white"
                      onClick={() => escolherCliente(c)}
                    >
                      Selecionar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* rodapé */}
          <div className="text-right text-xs text-gray-500 mt-2">
            {clientes.length > 0 && (
              <span>
                {clientes.length} cliente{clientes.length === 1 ? "" : "s"}{" "}
                listado
                {rotaFiltro ? ` • Rota ${rotaFiltro}` : ""}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
