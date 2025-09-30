// src/components/PainelEntregador.jsx
import { useEffect, useMemo, useState } from "react";
import { getToken, getUsuario } from "../utils/auth";
import {
  concluirEntrega as svcConcluirEntrega,
  registrarPagamento as svcRegistrarPagamento,
  listarMinhasEntregas,
} from "../services/entregaService";
import { useNavigate } from "react-router-dom";
import { get as httpGet, post as httpPost } from "../services/http";

/* =================== CONFIG =================== */
const ENABLE_GPS_PING =
  String(import.meta.env.VITE_ENABLE_GPS_PING || "") === "1";

/* =============== HELPERS =============== */
function normalizeEntregas(data) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    if (Array.isArray(data.entregas)) return data.entregas;
    if (Array.isArray(data.itens)) return data.itens;
    if (Array.isArray(data.data)) return data.data;
    if (Array.isArray(data.results)) return data.results;
  }
  return [];
}

function pickClienteNome(entrega) {
  const c = entrega?.cliente;
  return (
    entrega?.clienteNome ||
    (c && typeof c === "object" && (c.nome || c?.dados?.nome)) ||
    entrega?.nomeCliente ||
    null
  );
}

function normalizaItensPedido(entrega) {
  const src =
    (Array.isArray(entrega?.itens) && entrega.itens) ||
    (Array.isArray(entrega?.produtos) && entrega.produtos) ||
    (Array.isArray(entrega?.pedido) && entrega.pedido) ||
    [];
  return src.map((x, i) => ({
    id: x?.id || x?._id || i,
    nome:
      x?.nome ||
      x?.produtoNome ||
      (typeof x?.produto === "object" ? x.produto?.nome : x?.produto) ||
      "Item",
    qtd: Number(x?.qtd ?? x?.quantidade ?? x?.qty ?? 0) || 0,
    obs: x?.obs || x?.observacao || "",
  }));
}
const getEntregaId = (e) => e?._id || e?.id || e?.entregaId || null;

/* =================== COMPONENTE =================== */
export default function PainelEntregador() {
  const usuario = getUsuario();
  const navigate = useNavigate();

  // dados
  const [entregas, setEntregas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  // rotas (seleção no backend)
  const [mostrarModalRota, setMostrarModalRota] = useState(false);
  const [rotas, setRotas] = useState([]);
  const [carregandoRotas, setCarregandoRotas] = useState(false);
  const [erroClaim, setErroClaim] = useState("");

  // UI secundária
  const [mostrarFormulario, setMostrarFormulario] = useState({});
  const [valoresPagamentos, setValoresPagamentos] = useState({});
  const [obsPagamentos, setObsPagamentos] = useState({});
  const [ocultas, setOcultas] = useState(new Set());
  const [listaAberta, setListaAberta] = useState(true);

  // caches
  const [clienteCache, setClienteCache] = useState(new Map());
  const [detalheEntregaCache, setDetalheEntregaCache] = useState(new Map());

  const base = Array.isArray(entregas) ? entregas : [];
  const pendentesList = useMemo(
    () => base.filter((e) => !e?.entregue && !ocultas.has(getEntregaId(e))),
    [base, ocultas]
  );

  /* ---------- fetch preguiçoso + aquecimento ---------- */
  async function ensureClienteNome(entrega) {
    const direto = pickClienteNome(entrega);
    if (direto) return direto;

    const c = entrega?.cliente;
    if (typeof c === "string" && c) {
      if (clienteCache.has(c)) return clienteCache.get(c);
      try {
        const cli = await httpGet(`/clientes/${c}`);
        const nome =
          cli?.nome ||
          cli?.data?.nome ||
          cli?.cliente?.nome ||
          cli?.dados?.nome ||
          null;
        if (nome) {
          setClienteCache((m) => new Map(m).set(c, nome));
          return nome;
        }
      } catch {}
    }
    return "Cliente";
  }

  async function ensureItensEntrega(entrega) {
    const id = getEntregaId(entrega);
    if (!id) return normalizaItensPedido(entrega);

    const inline = normalizaItensPedido(entrega);
    if (inline.length) return inline;

    if (detalheEntregaCache.has(id)) return detalheEntregaCache.get(id);

    try {
      const det = await httpGet(`/entregas/${id}`);
      const itens = normalizaItensPedido(det || det?.data || {});
      setDetalheEntregaCache((m) => new Map(m).set(id, itens));
      return itens;
    } catch {
      return [];
    }
  }

  // aquece cache
  useEffect(() => {
    if (!base?.length) return;
    const run = async () => {
      const tasks = base.map(async (e) => {
        await Promise.all([ensureClienteNome(e), ensureItensEntrega(e)]);
      });
      try {
        await Promise.all(tasks);
      } catch {}
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base.length]);

  /* ---------------- API ---------------- */
  async function carregarEntregas() {
    setCarregando(true);
    setErro("");
    try {
      const lista = await listarMinhasEntregas();
      const arr = Array.isArray(lista) ? lista : [];
      setEntregas(arr);
      setOcultas(new Set());
      return arr;
    } catch (err) {
      console.error("Erro ao buscar entregas do entregador:", err);
      setErro(
        err?.response?.data?.erro ||
          err?.message ||
          "Falha ao carregar entregas."
      );
      setEntregas([]);
      return [];
    } finally {
      setCarregando(false);
    }
  }

  async function listarRotas() {
    try {
      setCarregandoRotas(true);
      setErroClaim("");
      const data = await httpGet("/rotas/disponiveis");
      setRotas(Array.isArray(data) ? data : data?.rotas ?? []);
    } catch (e) {
      console.error("Falha ao listar rotas:", e);
      setErroClaim(
        e?.response?.data?.erro ||
          e?.message ||
          "Não foi possível listar as rotas neste momento."
      );
    } finally {
      setCarregandoRotas(false);
    }
  }

  async function assumirRota(rota) {
    try {
      setErroClaim("");
      await httpPost("/rotas/claim", { rota });
      setMostrarModalRota(false);
      await carregarEntregas();
    } catch (e) {
      const msg =
        e?.response?.data?.erro ||
        (e?.response?.status === 409
          ? "Rota já em execução, por favor selecione outra."
          : "Falha ao assumir rota.");
      setErroClaim(msg);
      listarRotas();
    }
  }

  async function handleLogout() {
    try {
      const token = getToken();
      if (token) await httpPost("/rotas/release");
    } catch (e) {
      console.error("Falha ao liberar rota no logout:", e);
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("usuario");
      navigate("/", { replace: true });
    }
  }

  useEffect(() => {
    setEntregas([]);
    setOcultas(new Set());
    setErro("");
    setCarregando(false);
    setMostrarModalRota(true);
    listarRotas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ping “keep-alive” da rota (opcional)
  useEffect(() => {
    if (mostrarModalRota || !ENABLE_GPS_PING) return;
    const id = setInterval(() => {
      httpPost("/rotas/ping").catch(() => {});
    }, 60_000);
    return () => clearInterval(id);
  }, [mostrarModalRota]);

  const hoje = new Date();
  const feitas = base.filter((e) => !!e?.entregue).length;
  const pendentes = base.filter((e) => !e?.entregue).length;
  const atrasadas = base.filter((e) => {
    if (e?.entregue) return false;
    const prevista = e?.horaPrevista ? new Date(e.horaPrevista) : null;
    return prevista instanceof Date && !isNaN(prevista) && prevista < hoje;
  }).length;

  /* -------- Navegar: monta as paradas e vai para a tela Waze -------- */
  function buildParadas() {
    const origem = pendentesList.length ? pendentesList : base;
    return origem
      .map((e) => ({
        id: e._id || e.id || e.entregaId,
        lat: e?.location?.lat ?? e?.cliente?.location?.lat,
        lng: e?.location?.lng ?? e?.cliente?.location?.lng,
        entrega: e,
      }))
      .filter(
        (p) =>
          Number.isFinite(Number(p.lat)) &&
          Number.isFinite(Number(p.lng)) &&
          Math.abs(Number(p.lat)) <= 90 &&
          Math.abs(Number(p.lng)) <= 180
      );
  }

  async function iniciarNavegacao() {
    let paradas = buildParadas();
    if (!paradas.length) {
      // tenta recarregar e montar de novo
      const fresh = await carregarEntregas();
      const origem = fresh.filter((e) => !e?.entregue);
      paradas = (origem.length ? origem : fresh)
        .map((e) => ({
          id: e._id || e.id || e.entregaId,
          lat: e?.location?.lat ?? e?.cliente?.location?.lat,
          lng: e?.location?.lng ?? e?.cliente?.location?.lng,
          entrega: e,
        }))
        .filter(
          (p) =>
            Number.isFinite(Number(p.lat)) &&
            Number.isFinite(Number(p.lng)) &&
            Math.abs(Number(p.lat)) <= 90 &&
            Math.abs(Number(p.lng)) <= 180
        );
    }
    if (!paradas.length) {
      alert("Sem pontos válidos para traçar rota.");
      return;
    }
    navigate("/navegacao", { state: { paradas } });
  }

  async function marcarComoEntregue(id) {
    try {
      if (!id) return;
      await svcConcluirEntrega(id);
      setOcultas((prev) => new Set(prev).add(id));
      await carregarEntregas();
    } catch (err) {
      console.error("Erro ao concluir entrega:", err);
    }
  }

  async function registrarPagamento(id, valor, observacao) {
    const numero = Number(valor);
    if (!id || !Number.isFinite(numero) || numero < 0) return;
    try {
      await svcRegistrarPagamento(id, {
        valor: numero,
        forma: (observacao?.trim() || "dinheiro").toLowerCase(),
      });
      setOcultas((prev) => new Set(prev).add(id));
      await carregarEntregas();
    } catch (err) {
      console.error("Erro ao registrar pagamento:", err);
    }
  }

  /* ---------------- Header ---------------- */
  const Header = (
    <div className="bg-white sticky top-0 z-10">
      <div className="flex items-start md:items-center justify-between gap-2 p-2 md:p-4">
        <div>
          <h2 className="text-lg md:text-2xl font-bold leading-tight">
            Painel do Entregador
          </h2>
          <p className="text-xs md:text-sm text-gray-500">
            Entregador •{" "}
            <span className="font-medium">{usuario?.nome || "—"}</span>
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            className="px-2 py-1 text-xs md:px-3 md:py-1.5 md:text-sm rounded bg-blue-600 text-white"
            onClick={iniciarNavegacao}
            disabled={carregando}
            title="Abrir navegação estilo Waze"
          >
            Iniciar rota
          </button>

          <button
            className="px-2 py-1 text-xs md:px-3 md:py-1.5 md:text-sm rounded border"
            onClick={() => {
              setMostrarModalRota(true);
              listarRotas();
            }}
            title="Selecionar/Trocar rota no servidor"
          >
            Selecionar rota
          </button>

          <button
            className="px-2 py-1 text-xs md:px-3 md:py-1.5 md:text-sm rounded bg-red-600 text-white"
            onClick={handleLogout}
          >
            Sair
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 px-2 md:px-4 pb-2">
        <div className="p-2 md:p-4 h-16 md:h-24 rounded border bg-white">
          <div className="text-[11px] md:text-sm font-bold text-gray-500">
            Total
          </div>
          <div className="text-xl md:text-2xl font-bold">{base.length}</div>
        </div>

        <div className="p-2 md:p-4 h-16 md:h-24 rounded border bg-white ring-1 ring-green-300">
          <div className="text-[11px] md:text-sm font-bold text-gray-500">
            Feitas
          </div>
          <div className="text-xl md:text-2xl font-bold text-green-600">
            {feitas}
          </div>
        </div>

        <div className="p-2 md:p-4 h-16 md:h-24 rounded border bg-white ring-1 ring-yellow-300">
          <div className="text-[11px] md:text-sm font-bold text-gray-500">
            Pendentes
          </div>
          <div className="text-xl md:text-2xl font-bold text-yellow-600">
            {pendentes}
          </div>
        </div>

        <div className="p-2 md:p-4 h-16 md:h-24 rounded border bg-white ring-1 ring-red-300">
          <div className="text-[11px] md:text-sm font-bold text-gray-500">
            Atrasadas
          </div>
          <div className="text-xl md:text-2xl font-bold text-red-600">
            {atrasadas}
          </div>
        </div>
      </div>
    </div>
  );

  /* ---------------- UI principal ---------------- */
  return (
    <div className="min-h-screen bg-gray-100 text-gray-800">
      {Header}

      <main className="p-4 max-w-6xl mx-auto grid grid-cols-1 gap-4">
        {/* LISTA */}
        <section className="rounded border bg-white p-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setListaAberta((s) => !s)}
              className="px-3 py-2 rounded bg-blue-50 hover:bg-blue-100 border"
            >
              Entregas de hoje ({base.length})
            </button>
            <button
              onClick={carregarEntregas}
              className="px-2 py-1 rounded border text-sm"
              disabled={carregando}
            >
              {carregando ? "Atualizando…" : "Atualizar"}
            </button>
          </div>

          {listaAberta && (
            <div className="mt-3 divide-y">
              {base.length === 0 ? (
                <div className="text-sm text-gray-500 py-8 text-center">
                  Nenhuma entrega hoje.
                </div>
              ) : (
                base.map((e) => {
                  const id = getEntregaId(e);
                  const nome =
                    pickClienteNome(e) ||
                    (typeof e?.cliente === "string"
                      ? clienteCache.get(e.cliente) || "Cliente"
                      : "Cliente");

                  const itensInline = normalizaItensPedido(e);
                  const itens = itensInline.length
                    ? itensInline
                    : detalheEntregaCache.get(id) || [];

                  return (
                    <div key={id} className="py-3 flex items-start gap-3">
                      <div className="flex-1">
                        <div className="font-medium">{nome}</div>
                        <div className="text-xs text-gray-500">
                          {e?.endereco || e?.cliente?.endereco || "—"}
                        </div>

                        {itens.length > 0 && (
                          <ul className="text-sm mt-1 list-disc pl-5 space-y-0.5">
                            {itens.map((it) => (
                              <li key={it.id}>
                                {it.qtd ? `${it.qtd}× ` : ""}
                                {it.nome}
                                {it.obs ? ` — ${it.obs}` : ""}
                              </li>
                            ))}
                          </ul>
                        )}

                        <div className="text-xs mt-1">
                          Status:{" "}
                          <span
                            className={
                              e?.entregue ? "text-green-700" : "text-gray-700"
                            }
                          >
                            {e?.entregue ? "Concluída" : "Pendente"}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 w-44">
                        {!e?.entregue && (
                          <>
                            <button
                              className="px-2 py-1 rounded bg-green-600 text-white"
                              onClick={() => marcarComoEntregue(id)}
                            >
                              Entregar
                            </button>
                            <button
                              className="px-2 py-1 rounded bg-yellow-400 text-black"
                              onClick={() =>
                                setMostrarFormulario((prev) => ({
                                  ...prev,
                                  [id]: !prev[id],
                                }))
                              }
                            >
                              Pagamento
                            </button>
                            {/* navegar até esta entrega específica (opcional) */}
                            <button
                              className="px-2 py-1 rounded border"
                              onClick={() => {
                                const p = {
                                  id,
                                  lat:
                                    e?.location?.lat ??
                                    e?.cliente?.location?.lat,
                                  lng:
                                    e?.location?.lng ??
                                    e?.cliente?.location?.lng,
                                  entrega: e,
                                };
                                if (
                                  Number.isFinite(Number(p.lat)) &&
                                  Number.isFinite(Number(p.lng))
                                ) {
                                  navigate("/navegacao", {
                                    state: { paradas: [p] },
                                  });
                                } else {
                                  alert(
                                    "Este ponto não possui coordenadas válidas."
                                  );
                                }
                              }}
                            >
                              Navegar até aqui
                            </button>
                            {/* FORMULÁRIO DE PAGAMENTO (aparece quando clicar em "Pagamento") */}
                            {mostrarFormulario[id] && (
                              <div className="mt-2 p-2 rounded border bg-gray-50 flex items-center gap-2 flex-wrap">
                                <input
                                  type="number"
                                  step="0.01"
                                  inputMode="decimal"
                                  placeholder="Valor recebido"
                                  value={valoresPagamentos[id] ?? ""}
                                  onChange={(ev) =>
                                    setValoresPagamentos((m) => ({
                                      ...m,
                                      [id]: ev.target.value,
                                    }))
                                  }
                                  className="w-32 px-2 py-1 rounded border bg-white"
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      registrarPagamento(
                                        id,
                                        valoresPagamentos[id],
                                        obsPagamentos[id]
                                      );
                                    }
                                  }}
                                />

                                <select
                                  value={obsPagamentos[id] ?? "dinheiro"}
                                  onChange={(ev) =>
                                    setObsPagamentos((m) => ({
                                      ...m,
                                      [id]: ev.target.value,
                                    }))
                                  }
                                  className="px-2 py-1 rounded border bg-white"
                                  title="Forma de pagamento"
                                >
                                  <option value="dinheiro">Dinheiro</option>
                                  <option value="cartao">Cartão</option>
                                  <option value="mbway">MB Way</option>
                                </select>

                                <button
                                  className="px-3 py-1 rounded bg-yellow-400 text-black"
                                  onClick={() =>
                                    registrarPagamento(
                                      id,
                                      valoresPagamentos[id],
                                      obsPagamentos[id]
                                    )
                                  }
                                >
                                  Confirmar
                                </button>

                                <button
                                  className="px-3 py-1 rounded border"
                                  onClick={() =>
                                    setMostrarFormulario((prev) => ({
                                      ...prev,
                                      [id]: false,
                                    }))
                                  }
                                >
                                  Cancelar
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </section>
      </main>

      {/* MODAL: seleção de rota */}
      {mostrarModalRota && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              width: "min(720px, 92vw)",
              background: "#fff",
              borderRadius: 14,
              padding: 20,
              boxShadow:
                "0 10px 30px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-lg">Escolha sua rota de hoje</h3>
              <button
                className="px-3 py-1 rounded border text-sm"
                onClick={() => setMostrarModalRota(false)}
              >
                Fechar
              </button>
            </div>

            {erroClaim && (
              <div className="bg-red-50 text-red-700 border border-red-200 rounded p-2 mb-2 text-sm">
                {erroClaim}
              </div>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                gap: 10,
              }}
            >
              {rotas.map((r) => {
                const podeClicar =
                  r.status === "livre" || r.stale || r.ocupadaPorMim;
                const label =
                  r.status === "ocupada" && r.stale
                    ? "Assumir (inativa)"
                    : r.ocupadaPorMim
                    ? "Continuar"
                    : r.status === "ocupada"
                    ? "Ocupada"
                    : "Assumir";

                const disabled = !podeClicar || carregandoRotas;
                const bg = disabled ? "#e5e7eb" : "#2563eb";
                const fg = disabled ? "#6b7280" : "#fff";

                return (
                  <div
                    key={String(r.rota)}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 10,
                      padding: 12,
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                      background: "#fafafa",
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>
                      Rota {String(r.rota).toUpperCase()}
                    </div>
                    <div style={{ fontSize: 13, color: "#555" }}>
                      {r.total} entrega(s) — {r.status}
                      {r.entregador ? ` (${r.entregador})` : ""}
                      {r.stale && r.status === "ocupada" ? " — inativa" : ""}
                    </div>
                    <button
                      onClick={() => assumirRota(String(r.rota).toUpperCase())}
                      disabled={disabled}
                      style={{
                        marginTop: 4,
                        background: bg,
                        color: fg,
                        border: "none",
                        borderRadius: 8,
                        padding: "8px 10px",
                        cursor: disabled ? "not-allowed" : "pointer",
                        fontWeight: 600,
                      }}
                    >
                      {label}
                    </button>
                  </div>
                );
              })}
            </div>

            {rotas.length === 0 && (
              <p className="text-sm text-gray-600 mt-2">
                Nenhuma entrega pendente hoje para sua padaria.
              </p>
            )}

            <div style={{ marginTop: 12, textAlign: "right" }}>
              <button
                onClick={listarRotas}
                disabled={carregandoRotas}
                className="px-3 py-1 rounded border"
              >
                {carregandoRotas ? "Atualizando…" : "Atualizar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
