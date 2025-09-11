import { useEffect, useMemo, useRef, useState } from "react";
import { getToken, getUsuario } from "../utils/auth";
import {
  concluirEntrega as svcConcluirEntrega,
  registrarPagamento as svcRegistrarPagamento,
  listarMinhasEntregas,
} from "../services/entregaService";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  CircleMarker,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useNavigate } from "react-router-dom";
import { get as httpGet, post as httpPost } from "../services/http";

// abaixo dos imports já existentes…

// calcula rumo (bearing) em graus entre dois pontos lat/lng
function bearingDeg(from, to) {
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;
  const φ1 = toRad(from.lat),
    φ2 = toRad(to.lat);
  const Δλ = toRad(to.lng - from.lng);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  let θ = toDeg(Math.atan2(y, x));
  return (θ + 360) % 360;
}

/* ---------------- helpers ---------------- */
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

// id pode vir como _id, id, entregaId...
const getEntregaId = (e) => e?._id || e?.id || e?.entregaId || null;

/* -------- Leaflet default icons -------- */
try {
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

/* -------- Recalc settings -------- */
const RECALC_DEVIATION_METERS = 120; // distância do GPS à linha para considerar fora da rota
const RECALC_PERSIST_MS = 8000; // tempo mínimo fora da rota para disparar recalc
const RECALC_COOLDOWN_MS = 30000; // intervalo entre recálculos automáticos

// util: converte lat/lng para metros (WebMercator) para medir distâncias
function llToMeters(lat, lng) {
  const R = 6378137;
  const x = ((lng * Math.PI) / 180) * R;
  const y = Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 180 / 2)) * R;
  return { x, y };
}
function distPointToSegMeters(p, a, b) {
  const P = llToMeters(p.lat, p.lng);
  const A = llToMeters(a.lat, a.lng);
  const B = llToMeters(b.lat, b.lng);

  const vx = B.x - A.x,
    vy = B.y - A.y;
  const wx = P.x - A.x,
    wy = P.y - A.y;

  const c1 = vx * wx + vy * wy;
  const c2 = vx * vx + vy * vy;
  let t = c2 === 0 ? 0 : c1 / c2;
  t = Math.max(0, Math.min(1, t));

  const projx = A.x + t * vx,
    projy = A.y + t * vy;
  return Math.hypot(P.x - projx, P.y - projy);
}

/* ---------------- componente ---------------- */
export default function PainelEntregador() {
  const usuario = getUsuario();
  const navigate = useNavigate();

  // dados
  const [entregas, setEntregas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  // rotas (claim)
  const [mostrarModalRota, setMostrarModalRota] = useState(false);
  const [rotas, setRotas] = useState([]);
  const [carregandoRotas, setCarregandoRotas] = useState(false);
  const [erroClaim, setErroClaim] = useState("");

  // UI secundária
  const [mostrarFormulario, setMostrarFormulario] = useState({});
  const [valoresPagamentos, setValoresPagamentos] = useState({});
  const [obsPagamentos, setObsPagamentos] = useState({});
  const [ocultas, setOcultas] = useState(new Set());
  const [listaAberta, setListaAberta] = useState(false);

  // mapa / gps
  const mapRef = useRef(null);
  const [myPos, setMyPos] = useState(null); // {lat,lng}
  const [followMe, setFollowMe] = useState(true);
  const [heading, setHeading] = useState(0); // rumo atual (0..360)
  const prevGpsRef = useRef(null); // última posição p/ calcular rumo

  // OSRM
  const [routing, setRouting] = useState(false);
  const [routingError, setRoutingError] = useState("");
  const [routeCoords, setRouteCoords] = useState([]); // [[lat,lng],...]
  const [orderedStops, setOrderedStops] = useState([]); // [{id,lat,lng,entrega}...]

  // off-route detector
  const offRouteSinceRef = useRef(null);
  const lastRecalcAtRef = useRef(0);

  const base = Array.isArray(entregas) ? entregas : [];
  const pendentesList = useMemo(
    () => base.filter((e) => !e?.entregue && !ocultas.has(getEntregaId(e))),
    [base, ocultas]
  );

  /* ---------------- API: minhas entregas ---------------- */
  async function carregarEntregas() {
    setCarregando(true);
    setErro("");
    try {
      const lista = await listarMinhasEntregas();
      setEntregas(Array.isArray(lista) ? lista : []);
      setOcultas(new Set());
    } catch (err) {
      console.error("Erro ao buscar entregas do entregador:", err);
      setErro(
        err?.response?.data?.erro ||
          err?.message ||
          "Falha ao carregar entregas."
      );
      setEntregas([]);
    } finally {
      setCarregando(false);
    }
  }

  /* ---------------- API: listar rotas ---------------- */
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

  /* ---------------- API: assumir rota ---------------- */
  async function assumirRota(rota) {
    try {
      setErroClaim("");
      await httpPost("/rotas/claim", { rota });
      setMostrarModalRota(false);
      await carregarEntregas();
      calcularRotaOSRM(); // traça a rota ao iniciar
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

  /* ---------------- logout/liberar rota ---------------- */
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

  /* ---------------- boot: exigir seleção de rota ---------------- */
  useEffect(() => {
    setEntregas([]);
    setOcultas(new Set());
    setErro("");
    setCarregando(false);
    setMostrarModalRota(true);
    listarRotas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- ping enquanto com rota ---------------- */
  useEffect(() => {
    if (mostrarModalRota) return;
    const id = setInterval(() => {
      httpPost("/rotas/ping").catch(() => {});
    }, 60_000);
    return () => clearInterval(id);
  }, [mostrarModalRota]);

  /* ---------------- contadores ---------------- */
  const hoje = new Date();
  const feitas = base.filter((e) => !!e?.entregue).length;
  const pendentes = base.filter((e) => !e?.entregue).length;
  const atrasadas = base.filter((e) => {
    if (e?.entregue) return false;
    const prevista = e?.horaPrevista ? new Date(e.horaPrevista) : null;
    return prevista instanceof Date && !isNaN(prevista) && prevista < hoje;
  }).length;

  /* ---------------- centro do mapa ---------------- */
  const mapaCenter = useMemo(() => {
    const coords = base
      .map((e) => e?.location)
      .filter(
        (loc) => loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lng)
      );
    if (coords.length) {
      const { latSum, lngSum } = coords.reduce(
        (acc, c) => ({
          latSum: acc.latSum + c.lat,
          lngSum: acc.lngSum + c.lng,
        }),
        { latSum: 0, lngSum: 0 }
      );
      return [latSum / coords.length, lngSum / coords.length];
    }
    return [-3.7327, -38.527]; // Fortaleza (fallback)
  }, [base]);

  /* ---------------- concluir / pagamento ---------------- */
  async function marcarComoEntregue(id) {
    try {
      if (!id) return;
      await svcConcluirEntrega(id);
      setOcultas((prev) => new Set(prev).add(id));
      await carregarEntregas();
      calcularRotaOSRM(); // recalcula após concluir
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
      calcularRotaOSRM();
    } catch (err) {
      console.error("Erro ao registrar pagamento:", err);
    }
  }

  /* ---------------- geolocalização + off-route ---------------- */
  useEffect(() => {
    if (mostrarModalRota) return; // só depois que iniciar rota
    if (!("geolocation" in navigator)) return;

    let watchId = null;
    let lastSent = 0;

    const enviar = async (lat, lng) => {
      try {
        await httpPost("/usuarios/atualizar-localizacao", { lat, lng });
      } catch {}
    };

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords || {};
        const agora = Date.now();
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

        const next = { lat: latitude, lng: longitude };
        setMyPos(next);

        // segue no mapa
        // calcula rumo (graus) a partir da última posição
        if (prevGpsRef.current) {
          const prev = prevGpsRef.current;
          const brg = bearingDeg(prev, next);
          if (Number.isFinite(brg)) setHeading(brg);
        }
        prevGpsRef.current = next;

        // segue no mapa COM OFFSET (ponto ~65% da altura)
        if (followMe && mapRef.current) {
          const map = mapRef.current;
          const size = map.getSize(); // pixels
          const currentPt = map.latLngToContainerPoint([next.lat, next.lng]);
          const desiredPt = L.point(size.x / 2, size.y * 0.65); // 65% da altura
          const offset = desiredPt.subtract(currentPt);
          map.panBy(offset, { animate: true });
        }

        // envia p/ backend com throttling
        if (agora - lastSent > 5000) {
          lastSent = agora;
          enviar(latitude, longitude);
        }

        // --- detector de desvio da rota ---
        if (routeCoords && routeCoords.length > 1) {
          let minDist = Infinity;
          for (let i = 0; i < routeCoords.length - 1; i++) {
            const a = { lat: routeCoords[i][0], lng: routeCoords[i][1] };
            const b = {
              lat: routeCoords[i + 1][0],
              lng: routeCoords[i + 1][1],
            };
            const d = distPointToSegMeters(next, a, b);
            if (d < minDist) minDist = d;
            if (minDist <= RECALC_DEVIATION_METERS) break;
          }

          const tooFar = minDist > RECALC_DEVIATION_METERS;
          const now = agora;

          if (tooFar) {
            if (!offRouteSinceRef.current) offRouteSinceRef.current = now;
            const stayedOff = now - (offRouteSinceRef.current || now);
            const canRecalc =
              now - lastRecalcAtRef.current > RECALC_COOLDOWN_MS;

            if (stayedOff > RECALC_PERSIST_MS && canRecalc) {
              lastRecalcAtRef.current = now;
              offRouteSinceRef.current = null;
              calcularRotaOSRM(); // 🔁 recalcula com o ponto atual como partida
            }
          } else {
            offRouteSinceRef.current = null; // voltou para perto da rota
          }
        }
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 4000, timeout: 10000 }
    );

    return () => {
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
    };
  }, [mostrarModalRota, followMe, routeCoords]);

  /* ---------------- OSRM: traçar rota ---------------- */
  async function calcularRotaOSRM() {
    try {
      setRouting(true);
      setRoutingError("");
      setRouteCoords([]);
      setOrderedStops([]);

      // paradas pendentes
      const stops = pendentesList
        .map((e) => ({
          id: getEntregaId(e),
          lat: e?.location?.lat,
          lng: e?.location?.lng,
          entrega: e,
        }))
        .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));

      if (stops.length === 0) {
        setRouting(false);
        return;
      }

      // primeiro ponto: posição atual (se houver), para iniciar dali
      const points = [];
      if (myPos && Number.isFinite(myPos.lat) && Number.isFinite(myPos.lng)) {
        points.push({ type: "start", lat: myPos.lat, lng: myPos.lng });
      } else {
        // fallback: começa na 1ª parada
        points.push({ type: "start", lat: stops[0].lat, lng: stops[0].lng });
      }
      // demais pontos: na ordem atual
      points.push(...stops.map((s) => ({ ...s, type: "stop" })));

      const coordsStr = points.map((p) => `${p.lng},${p.lat}`).join(";");
      const url =
        `https://router.project-osrm.org/route/v1/driving/${coordsStr}` +
        `?geometries=geojson&overview=full&steps=false`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`OSRM ${res.status}`);
      const data = await res.json();

      const coords = data?.routes?.[0]?.geometry?.coordinates;
      if (!coords || !coords.length) throw new Error("Rota não encontrada.");

      // polyline no formato [lat,lng]
      const latlngs = coords.map(([lon, lat]) => [lat, lon]);
      setRouteCoords(latlngs);

      // como usamos /route, a ordem das paradas é a mesma enviada
      setOrderedStops(points.filter((p) => p.type === "stop"));

      // fit bounds
      if (mapRef.current && latlngs.length) {
        const bounds = L.latLngBounds(latlngs.map(([a, b]) => L.latLng(a, b)));
        mapRef.current.fitBounds(bounds.pad(0.1));
      }
    } catch (e) {
      console.error("OSRM rota:", e);
      setRoutingError(e.message || "Falha ao traçar rota.");
    } finally {
      setRouting(false);
    }
  }

  /* ---------------- Header ---------------- */
  const Header = (
    <div className="bg-white sticky top-0 z-10">
      <div className="flex items-center justify-between p-4">
        <div>
          <h2 className="text-2xl font-bold">Painel do Entregador</h2>
          <p className="text-sm text-gray-500">
            Entregador •{" "}
            <span className="font-medium">{usuario?.nome || "—"}</span> •{" "}
            {new Date().toLocaleDateString("pt-PT", {
              weekday: "long",
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex gap-2">
          {mostrarModalRota ? (
            <button
              className="px-3 py-1 rounded bg-blue-600 text-white"
              onClick={() => {
                setMostrarModalRota(true);
                listarRotas();
              }}
            >
              Iniciar
            </button>
          ) : (
            <button
              className="px-3 py-1 rounded bg-red-600 text-white"
              onClick={handleLogout}
            >
              Finalizar
            </button>
          )}
          {!mostrarModalRota && (
            <button
              className="px-3 py-1 rounded border"
              onClick={() => {
                setMostrarModalRota(true);
                listarRotas();
              }}
            >
              Trocar rota
            </button>
          )}
          <button className="px-3 py-1 rounded border" onClick={handleLogout}>
            Sair
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 px-4 pb-2">
        <div className="p-4 rounded border bg-white">
          <div className="text-sm font-bold text-gray-500">Total</div>
          <div className="text-2xl font-bold">{base.length}</div>
        </div>
        <div className="p-4 rounded border bg-white ring-1 ring-green-300">
          <div className="text-sm font-bold text-gray-500">Feitas</div>
          <div className="text-2xl font-bold text-green-600">{feitas}</div>
        </div>
        <div className="p-4 rounded border bg-white ring-1 ring-yellow-300">
          <div className="text-sm font-bold text-gray-500">Pendentes</div>
          <div className="text-2xl font-bold text-yellow-600">{pendentes}</div>
        </div>
        <div className="p-4 rounded border bg-white ring-1 ring-red-300">
          <div className="text-sm font-bold text-gray-500">Atrasadas</div>
          <div className="text-2xl font-bold text-red-600">{atrasadas}</div>
        </div>
      </div>
    </div>
  );

  /* ---------------- Loading/Erro ---------------- */
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

  /* ---------------- UI principal ---------------- */
  return (
    <div className="min-h-screen bg-gray-100 text-gray-800">
      {Header}

      <main className="p-4 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* MAPA */}
        <section className="rounded border bg-white p-3">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
            <h3 className="font-semibold">Mapa das entregas</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={calcularRotaOSRM}
                disabled={routing || mostrarModalRota}
                title="Iniciar rota"
                className="
                  inline-flex items-center gap-2
                  px-3 py-2 rounded-md
                 bg-blue-600 text-white font-semibold
                 shadow-sm hover:bg-blue-700
                 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
                 disabled:opacity-60 disabled:cursor-not-allowed
  "
              >
                {routing ? "Calculando…" : "Iniciar rota"}
              </button>
              <label className="text-sm flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={followMe}
                  onChange={(e) => setFollowMe(e.target.checked)}
                />
                Seguir meu GPS
              </label>
            </div>
          </div>

          {routingError && (
            <div className="bg-red-50 text-red-700 border border-red-200 rounded p-2 mb-2 text-sm">
              {routingError}
            </div>
          )}

          <MapContainer
            center={mapaCenter}
            zoom={12}
            style={{ height: 440, width: "100%", zIndex: 0 }}
            whenCreated={(map) => (mapRef.current = map)}
            scrollWheelZoom
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />

            {/* Minha posição */}
            {myPos && (
              <CircleMarker
                center={[myPos.lat, myPos.lng]}
                radius={7}
                pathOptions={{
                  color: "#2563eb",
                  fillColor: "#2563eb",
                  fillOpacity: 0.8,
                }}
              >
                <Popup>Você está aqui</Popup>
              </CircleMarker>
            )}
            {myPos && (
              <Marker
                position={[myPos.lat, myPos.lng]}
                icon={arrowIcon}
                zIndexOffset={1000}
              />
            )}

            {/* Rota OSRM */}
            {routeCoords.length > 0 && (
              <Polyline
                positions={routeCoords}
                pathOptions={{ color: "#2563eb", weight: 5, opacity: 0.9 }}
              />
            )}

            {/* Marcadores das pendentes (ordenadas conforme a rota enviada) */}
            {(orderedStops.length ? orderedStops : pendentesList).map(
              (entrega, i) => {
                const p = orderedStops.length
                  ? entrega
                  : {
                      id: getEntregaId(entrega),
                      lat: entrega?.location?.lat,
                      lng: entrega?.location?.lng,
                      entrega,
                    };
                const pos =
                  Number.isFinite(p.lat) && Number.isFinite(p.lng)
                    ? [p.lat, p.lng]
                    : mapaCenter;

                const nomeCliente =
                  typeof p.entrega?.cliente === "string"
                    ? p.entrega?.cliente
                    : p.entrega?.cliente?.nome || "Cliente";

                return (
                  <Marker key={p.id || i} position={pos}>
                    <Popup>
                      <div className="font-semibold mb-1">
                        {orderedStops.length ? `${i + 1}. ` : ""}
                        {nomeCliente}
                      </div>
                      <div className="text-xs text-gray-600">
                        {p.entrega?.endereco ||
                          p.entrega?.cliente?.endereco ||
                          "—"}
                      </div>
                      <div className="flex flex-col gap-2 mt-2">
                        <button
                          className="bg-green-600 text-white px-2 py-1 rounded"
                          onClick={() => marcarComoEntregue(p.id)}
                        >
                          ✅ Entregar
                        </button>
                        <button
                          className="bg-yellow-400 text-black px-2 py-1 rounded"
                          onClick={() =>
                            setMostrarFormulario((prev) => ({
                              ...prev,
                              [p.id]: !prev[p.id],
                            }))
                          }
                        >
                          💰 Pagamento
                        </button>

                        {mostrarFormulario[p.id] && (
                          <div>
                            <input
                              type="number"
                              min={0}
                              value={valoresPagamentos[p.id] ?? ""}
                              onChange={(e) =>
                                setValoresPagamentos((prev) => ({
                                  ...prev,
                                  [p.id]: Math.max(0, Number(e.target.value)),
                                }))
                              }
                              placeholder="Valor"
                              className="border px-2 py-1 w-full mt-1"
                            />
                            <input
                              type="text"
                              value={obsPagamentos[p.id] ?? ""}
                              onChange={(e) =>
                                setObsPagamentos((prev) => ({
                                  ...prev,
                                  [p.id]: e.target.value,
                                }))
                              }
                              placeholder="Obs (cartão, pix...)"
                              className="border px-2 py-1 w-full mt-1"
                            />
                            <button
                              className="bg-blue-600 text-white px-2 py-1 rounded mt-2 w-full"
                              onClick={() =>
                                registrarPagamento(
                                  p.id,
                                  valoresPagamentos[p.id],
                                  obsPagamentos[p.id]
                                )
                              }
                            >
                              Salvar Pagamento + Concluir
                            </button>
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                );
              }
            )}
          </MapContainer>
        </section>

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
            >
              Atualizar
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
                  const status = e?.entregue ? "Concluída" : "Pendente";
                  return (
                    <div key={id} className="py-3 flex items-start gap-3">
                      <div className="flex-1">
                        <div className="font-medium break-all">{id || "—"}</div>
                        <div className="text-xs text-gray-500">
                          {e?.endereco || e?.cliente?.endereco || "—"}
                        </div>
                        <div className="text-xs mt-1">
                          Status:{" "}
                          <span
                            className={
                              e?.entregue ? "text-green-700" : "text-gray-700"
                            }
                          >
                            {status}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 w-40">
                        <button
                          className="px-2 py-1 rounded border"
                          onClick={() => {
                            try {
                              const el =
                                document.querySelector(".leaflet-container");
                              el?.scrollIntoView({ behavior: "smooth" });
                            } catch {}
                          }}
                        >
                          Mapa
                        </button>
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
                                  [id]: true,
                                }))
                              }
                            >
                              Pagamento
                            </button>
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
