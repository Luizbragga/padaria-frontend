// src/components/PainelEntregador.jsx
import { useEffect, useMemo, useState } from "react";
import { getToken, getUsuario } from "../utils/auth";
import {
  concluirEntrega as svcConcluirEntrega,
  registrarPagamento as svcRegistrarPagamento,
  listarMinhasEntregas,
} from "../services/entregaService";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useNavigate } from "react-router-dom";
import { get as httpGet, post as httpPost } from "../services/http";

/* -------- helpers -------- */
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

/* -------- leaflet icons (uma vez) -------- */
try {
  // evita erro caso já tenha sido feito
  // @ts-ignore
  delete L.Icon.Default.prototype._getIconUrl;
} catch {}
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// id pode vir como _id, id, entregaId...
const getEntregaId = (e) => e?._id || e?.id || e?.entregaId || null;

export default function PainelEntregador() {
  /* -------- estados -------- */
  const [entregas, setEntregas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  // modal/rotas
  const [mostrarModalRota, setMostrarModalRota] = useState(false);
  const [rotas, setRotas] = useState([]);
  const [carregandoRotas, setCarregandoRotas] = useState(false);
  const [erroClaim, setErroClaim] = useState("");

  // formulário do popup
  const [mostrarFormulario, setMostrarFormulario] = useState({});
  const [valoresPagamentos, setValoresPagamentos] = useState({});
  const [obsPagamentos, setObsPagamentos] = useState({});

  // IDs de entregas a ocultar imediatamente no mapa após ações locais
  const [ocultas, setOcultas] = useState(new Set());

  const usuario = getUsuario();
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

  const base = Array.isArray(entregas) ? entregas : [];

  // Somente pendentes e NÃO ocultas aparecem no mapa
  const pendentesList = useMemo(
    () => base.filter((e) => !e?.entregue && !ocultas.has(e?._id)),
    [base, ocultas]
  );

  /* -------- API: entregas do entregador -------- */
  // dentro de PainelEntregador.jsx
  async function carregarEntregas() {
    setCarregando(true);
    setErro("");
    try {
      const lista = await listarMinhasEntregas();
      console.log(
        "[UI] entregas carregadas:",
        Array.isArray(lista) ? lista.length : 0,
        lista?.[0]
      );
      setEntregas(Array.isArray(lista) ? lista : []);
      setOcultas(new Set());
      return lista;
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

  /* -------- API: rotas do dia -------- */
  async function listarRotas() {
    try {
      setCarregandoRotas(true);
      setErroClaim("");

      // usa cliente central (adiciona Authorization automaticamente)
      const data = await httpGet("/rotas/disponiveis");

      // aceita tanto [{...}] quanto { rotas: [...] }
      setRotas(Array.isArray(data) ? data : data?.rotas ?? []);
    } catch (e) {
      console.error("Falha ao listar rotas:", e);
      setRotas([]);
      setErroClaim(
        e?.response?.data?.erro ||
          e?.message ||
          "Não foi possível listar as rotas neste momento."
      );
    } finally {
      setCarregandoRotas(false);
    }
  }

  /* -------- API: assumir rota -------- */
  async function assumirRota(rota) {
    try {
      setErroClaim("");

      // usa cliente central
      await httpPost("/rotas/claim", { rota });

      setMostrarModalRota(false);
      await carregarEntregas();
    } catch (e) {
      const msg =
        e?.response?.data?.erro ||
        (e?.response?.status === 409
          ? "Rota já em execução, por favor selecione outra rota."
          : "Falha ao assumir rota.");
      setErroClaim(msg);
      listarRotas(); // atualiza lista após erro
    }
  }

  /* -------- sair (libera rota + limpa + navega) -------- */
  async function handleLogout() {
    try {
      const token = getToken();
      if (token) {
        await httpPost("/rotas/release");
      }
    } catch (e) {
      console.error("Falha ao liberar rota no logout:", e);
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("usuario");
      navigate("/", { replace: true });
    }
  }

  /* -------- fluxo inicial: sempre exigir escolha de rota -------- */
  useEffect(() => {
    setEntregas([]);
    setOcultas(new Set());
    setErro("");
    setCarregando(false);
    setMostrarModalRota(true);
    listarRotas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API_URL]);

  /* -------- ping periódico enquanto a rota estiver assumida -------- */
  useEffect(() => {
    if (mostrarModalRota) return;
    const id = setInterval(() => {
      httpPost("/rotas/ping").catch(() => {});
    }, 60 * 1000);
    return () => clearInterval(id);
  }, [mostrarModalRota]);

  /* -------- contadores -------- */
  const hoje = new Date();
  const feitas = base.filter((e) => !!e?.entregue).length;
  const pendentes = base.filter((e) => !e?.entregue).length;
  const atrasadas = base.filter((e) => {
    if (e?.entregue) return false;
    const prevista = e?.horaPrevista ? new Date(e.horaPrevista) : null;
    return prevista instanceof Date && !isNaN(prevista) && prevista < hoje;
  }).length;

  /* -------- centro do mapa -------- */
  const mapaCenter = useMemo(() => {
    const coords = base
      .map((e) => e?.location)
      .filter(
        (loc) =>
          loc && typeof loc.lat === "number" && typeof loc.lng === "number"
      );
    if (!coords.length) return [-3.7327, -38.527]; // fallback Fortaleza
    const { latSum, lngSum } = coords.reduce(
      (acc, c) => ({ latSum: acc.latSum + c.lat, lngSum: acc.lngSum + c.lng }),
      { latSum: 0, lngSum: 0 }
    );
    return [latSum / coords.length, lngSum / coords.length];
  }, [base]);

  /* -------- ações de entrega -------- */
  async function marcarComoEntregue(id) {
    try {
      if (!id) {
        console.warn("Sem id na entrega");
        return;
      }
      await svcConcluirEntrega(id);
      setOcultas((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      await carregarEntregas(); // ✅ sincroniza com backend
    } catch (err) {
      console.error("❌ ERRO ao concluir entrega:", err);
    }
  }

  async function registrarPagamento(id, valor, observacao) {
    const numero = Number(valor);
    if (!id) {
      console.warn("Sem id na entrega");
      return;
    }
    if (!Number.isFinite(numero) || numero < 0) return;

    try {
      await svcRegistrarPagamento(id, {
        valor: numero,
        forma: (observacao?.trim() || "dinheiro").toLowerCase(),
      });

      setOcultas((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });

      await carregarEntregas(); // ✅ sincroniza com backend
    } catch (err) {
      console.error("Erro ao registrar pagamento:", err);
    }
  }

  const handleTrocarRota = () => {
    setMostrarModalRota(true);
    listarRotas();
  };
  /* -------- header -------- */
  const Header = (
    <div className="flex items-center justify-between mb-4" style={{ gap: 8 }}>
      <h2 className="text-xl font-bold">Painel do Entregador</h2>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          className="text-sm px-3 py-1 rounded border"
          onClick={handleTrocarRota}
          title="Escolher outra rota"
        >
          Trocar rota
        </button>
        <button
          className="text-sm px-3 py-1 rounded border"
          onClick={handleLogout}
          title="Sair"
        >
          Sair
        </button>
      </div>
    </div>
  );

  /* -------- telas de estado -------- */
  if (carregando) {
    return (
      <div className="p-6">
        {Header}
        <p>Carregando entregas…</p>
      </div>
    );
  }
  if (erro) {
    return (
      <div className="p-6">
        {Header}
        <p className="text-red-600 mb-4">{erro}</p>
      </div>
    );
  }

  /* -------- UI -------- */
  return (
    <div className="p-6">
      {Header}

      <div className="flex gap-6">
        <p>Total: {base.length}</p>
        <p>Feitas: {feitas}</p>
        <p>Pendentes: {pendentes}</p>
        <p>Atrasadas: {atrasadas}</p>
      </div>

      <MapContainer
        center={mapaCenter}
        zoom={13}
        style={{ height: "400px", width: "100%", marginTop: "1rem" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />

        {pendentesList.map((entrega, i) => {
          const id = getEntregaId(entrega); // ✅ id robusto
          const lat = entrega?.location?.lat;
          const lng = entrega?.location?.lng;
          const pos =
            typeof lat === "number" && typeof lng === "number"
              ? [lat, lng]
              : mapaCenter;

          const produtos = Array.isArray(entrega?.produtos)
            ? entrega.produtos
            : [];

          const clienteLabel =
            typeof entrega?.cliente === "string"
              ? entrega.cliente
              : entrega?.cliente?.nome || "Cliente";

          return (
            <Marker key={id || i} position={pos}>
              <Popup>
                {/* ... */}
                <button
                  className="bg-green-600 text-white px-2 py-1 rounded mt-2 w-full"
                  onClick={() => marcarComoEntregue(id)}
                >
                  ✅ Entregar
                </button>

                <button
                  className="bg-yellow-400 text-black px-2 py-1 rounded mt-2 w-full"
                  onClick={() =>
                    setMostrarFormulario((prev) => ({
                      ...prev,
                      [id]: !prev[id],
                    }))
                  }
                >
                  💰 Registrar Pagamento
                </button>

                {mostrarFormulario[id] && (
                  <div className="mt-2">
                    <input
                      type="number"
                      min={0}
                      value={valoresPagamentos[id] ?? ""}
                      onChange={(e) =>
                        setValoresPagamentos((prev) => ({
                          ...prev,
                          [id]: Math.max(0, Number(e.target.value)),
                        }))
                      }
                      placeholder="Valor pago"
                      className="border px-2 py-1 w-full mt-1"
                    />
                    <input
                      type="text"
                      value={obsPagamentos[id] ?? ""}
                      onChange={(e) =>
                        setObsPagamentos((prev) => ({
                          ...prev,
                          [id]: e.target.value,
                        }))
                      }
                      placeholder="Observações (ex: cartão)"
                      className="border px-2 py-1 w-full mt-1"
                    />
                    <button
                      className="bg-blue-600 text-white px-2 py-1 rounded mt-2 w-full"
                      onClick={() =>
                        registrarPagamento(
                          id,
                          valoresPagamentos[id],
                          obsPagamentos[id]
                        )
                      }
                    >
                      Salvar Pagamento + Concluir
                    </button>
                    <button
                      className="bg-white border rounded px-3 py-1 shadow mt-2 w-full"
                      onClick={() => navigate("/entregador/entregas")}
                    >
                      Ver em tabela
                    </button>
                  </div>
                )}
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* MODAL: escolha de rota obrigatória */}
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
            <h3 style={{ fontWeight: 700, fontSize: 20, marginBottom: 6 }}>
              Escolha sua rota de hoje
            </h3>
            <p style={{ color: "#555", marginBottom: 12 }}>
              Selecione uma rota livre para iniciar sua entrega.
            </p>

            {erroClaim && (
              <div
                style={{
                  background: "#fdecea",
                  color: "#b71c1c",
                  border: "1px solid #f5c6cb",
                  borderRadius: 8,
                  padding: "8px 10px",
                  marginBottom: 10,
                  fontSize: 14,
                }}
              >
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
                      title={label}
                    >
                      {label}
                    </button>
                  </div>
                );
              })}
            </div>

            {rotas.length === 0 && (
              <p style={{ color: "#555", marginTop: 8 }}>
                Nenhuma entrega pendente hoje para sua padaria.
              </p>
            )}

            <div style={{ marginTop: 12, textAlign: "right" }}>
              <button
                onClick={listarRotas}
                disabled={carregandoRotas}
                style={{
                  background: "transparent",
                  border: "1px solid #d1d5db",
                  borderRadius: 8,
                  padding: "8px 12px",
                  cursor: "pointer",
                }}
                title="Atualizar lista"
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
