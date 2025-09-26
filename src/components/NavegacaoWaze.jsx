// src/components/NavegacaoWaze.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  CircleMarker,
  Popup,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { post as httpPost } from "../services/http";
import {
  listarMinhasEntregas,
  concluirEntrega,
  registrarPagamento,
} from "../services/entregaService";
import { routeMulti } from "../services/tomtomService";

/* =================== CONFIG =================== */
const BOTTOM_UI_PX = 140;
const WHOLE_ROUTE_TIMEOUT_MS = 60000;
const DEFAULT_ZOOM_LOCAL = 17;
const DEFAULT_ZOOM_WIDE = 7;
const TOP_FACTOR = 0.86;
const ENABLE_GPS_PING =
  String(import.meta.env.VITE_ENABLE_GPS_PING || "") === "1";

const CLOSE_LOOP = true; // volta ao ponto inicial
const ORDER_MODE = "angle"; // "angle" | "nearest"

/* =================== UTILS =================== */
function haversine(a, b) {
  const R = 6371e3,
    toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat),
    dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat),
    lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function panWithBottomPadding(map, lat, lng, bottomPx = 180) {
  if (!map) return;
  const size = map.getSize();
  const current = map.latLngToContainerPoint([lat, lng]);
  // queremos o ponto do motorista acima da barra inferior (bottomPx)
  const desired = L.point(size.x / 2, Math.max(0, size.y - bottomPx));
  const offset = desired.subtract(current);
  map.panBy(offset.multiplyBy(-1), { animate: false });
}

function distPointToSegMeters(p, a, b) {
  const A = L.latLng(a.lat, a.lng),
    B = L.latLng(b.lat, b.lng),
    P = L.latLng(p.lat, p.lng);
  const apx = Math.max(
    0,
    Math.min(
      1,
      ((P.lat - A.lat) * (B.lat - A.lat) + (P.lng - A.lng) * (B.lng - A.lng)) /
        ((B.lat - A.lat) ** 2 + (B.lng - A.lng) ** 2 || 1)
    )
  );
  const proj = L.latLng(
    A.lat + apx * (B.lat - A.lat),
    A.lng + apx * (B.lng - A.lng)
  );
  return P.distanceTo(proj);
}

/* ---------- ordem por vizinho mais próximo (loop) ---------- */
function orderNearestLoop(start, stops) {
  const remaining = stops.slice();
  const seq = [];
  let current = { lat: start.lat, lng: start.lng };
  while (remaining.length) {
    let bestIdx = 0,
      best = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversine(current, remaining[i]);
      if (d < best) {
        best = d;
        bestIdx = i;
      }
    }
    const next = remaining.splice(bestIdx, 1)[0];
    seq.push(next);
    current = next;
  }
  return seq;
}

/* ---------- ordem por ângulo (varredura circular) ---------- */
function orderByAngleLoop(start, stops) {
  if (!stops.length) return [];
  const cx = stops.reduce((s, p) => s + p.lat, 0) / stops.length;
  const cy = stops.reduce((s, p) => s + p.lng, 0) / stops.length;
  const angle = (p) => Math.atan2(p.lat - cx, p.lng - cy);

  let firstIdx = 0,
    best = Infinity;
  for (let i = 0; i < stops.length; i++) {
    const d = haversine(start, stops[i]);
    if (d < best) {
      best = d;
      firstIdx = i;
    }
  }
  const first = stops[firstIdx];
  const base = angle(first);

  const list = stops
    .slice()
    .sort((a, b) => angle(a) - base - (angle(b) - base));
  const listCW = list
    .slice()
    .sort(
      (a, b) =>
        Math.atan2(Math.sin(angle(a) - base), Math.cos(angle(a) - base)) -
        Math.atan2(Math.sin(angle(b) - base), Math.cos(angle(b) - base))
    );
  const listCCW = listCW.slice().reverse();

  const cost = (seq) => {
    let c = haversine(start, seq[0]);
    for (let i = 0; i < seq.length - 1; i++) c += haversine(seq[i], seq[i + 1]);
    if (CLOSE_LOOP) c += haversine(seq[seq.length - 1], start);
    return c;
  };
  return cost(listCW) <= cost(listCCW) ? listCW : listCCW;
}

/* ---------- melhoras locais (anti-cruzamento) ---------- */
function routeCost(seq, start, closeLoop = true) {
  if (!seq.length) return 0;
  let c = haversine(start, seq[0]);
  for (let i = 0; i < seq.length - 1; i++) c += haversine(seq[i], seq[i + 1]);
  if (closeLoop) c += haversine(seq[seq.length - 1], start);
  return c;
}
function twoOptLoop(seqIn, start) {
  const s = seqIn.slice();
  const n = s.length;
  if (n < 3) return s;
  let improved = true,
    iter = 0,
    MAX_ITERS = 40;
  while (improved && iter < MAX_ITERS) {
    improved = false;
    iter++;
    for (let i = 0; i < n - 1; i++) {
      const A = i === 0 ? start : s[i - 1];
      const B = s[i];
      for (let j = i + 1; j < n; j++) {
        const C = s[j];
        const D = j === n - 1 ? start : s[j + 1];
        const curr = haversine(A, B) + haversine(C, D);
        const swap = haversine(A, C) + haversine(B, D);
        if (swap + 1e-6 < curr) {
          for (let k = i, m = j; k < m; k++, m--) {
            const tmp = s[k];
            s[k] = s[m];
            s[m] = tmp;
          }
          improved = true;
        }
      }
    }
  }
  return s;
}
function orOpt1(seqIn, start) {
  const s = seqIn.slice();
  const n = s.length;
  if (n < 3) return s;
  let improved = true,
    iter = 0,
    MAX_ITERS = 30;
  while (improved && iter < MAX_ITERS) {
    improved = false;
    iter++;
    for (let i = 0; i < n; i++) {
      const node = s[i];
      const rest = s.slice(0, i).concat(s.slice(i + 1));
      let bestPos = -1,
        bestCost = Infinity;
      for (let pos = 0; pos <= rest.length; pos++) {
        const seqTest = rest.slice(0, pos).concat([node], rest.slice(pos));
        const c = routeCost(seqTest, start, true);
        if (c < bestCost) {
          bestCost = c;
          bestPos = pos;
        }
      }
      if (bestCost + 1e-6 < routeCost(s, start, true) && bestPos >= 0) {
        s.splice(i, 1);
        s.splice(bestPos, 0, node);
        improved = true;
        break;
      }
    }
  }
  return s;
}

/* ---------- ícones ---------- */
const pinIcon = L.divIcon({
  className: "pin-icon",
  html: `<div style="width:28px;height:28px;display:flex;align-items:center;justify-content:center;transform: translateY(-4px);">
    <svg viewBox="0 0 24 24" width="26" height="26">
      <path d="M12 2c-4.2 0-7.5 3.3-7.5 7.5 0 5.6 7.5 12.5 7.5 12.5S19.5 15.1 19.5 9.5C19.5 5.3 16.2 2 12 2z" fill="#e11d48"/>
      <circle cx="12" cy="9.5" r="3.5" fill="#fff"/>
    </svg>
  </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 26],
});
const arrowIcon = (() => {
  const size = 28,
    half = size / 2;
  return L.divIcon({
    className: "arrow-icon",
    html: `<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;">
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none">
        <path d="M12 2l6 10H6l6-10Z" fill="#2563eb"/><circle cx="12" cy="19" r="3" fill="#2563eb"/>
      </svg></div>`,
    iconSize: [28, 28],
    iconAnchor: [half, half],
  });
})();

/* ---------- throttle TomTom ---------- */
let __tt_lastCallAt = 0;
const TT_MIN_INTERVAL_MS = 900;
async function throttleTomTom() {
  const now = Date.now();
  const elapsed = now - __tt_lastCallAt;
  if (elapsed < TT_MIN_INTERVAL_MS) {
    await new Promise((r) => setTimeout(r, TT_MIN_INTERVAL_MS - elapsed));
  }
  __tt_lastCallAt = Date.now();
}

/* ---------- helpers de exibição ---------- */
function pickClienteNome(entrega) {
  const c = entrega?.cliente;
  return (
    entrega?.clienteNome ||
    (c && typeof c === "object" && (c.nome || c?.dados?.nome)) ||
    entrega?.nomeCliente ||
    "Cliente"
  );
}
function pickEndereco(entrega) {
  return entrega?.endereco || entrega?.cliente?.endereco || "—";
}
function pickObservacoes(entrega) {
  return entrega?.observacoes || entrega?.cliente?.observacoes || "";
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

/* =================== COMPONENTE =================== */
export default function NavegacaoWaze() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const mapRef = useRef(null);

  const [myPos, setMyPos] = useState(null);
  const [cameraMode, setCameraMode] = useState("follow");
  const lastGoodPosRef = useRef(null);
  const lastPanAtRef = useRef(0);

  const [allStops, setAllStops] = useState([]);
  const [orderedStops, setOrderedStops] = useState([]);

  const [routeCoords, setRouteCoords] = useState([]);
  const [navSteps, setNavSteps] = useState([]);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [routing, setRouting] = useState(false);
  const [routingError, setRoutingError] = useState("");

  const [valoresPagamentos, setValoresPagamentos] = useState({});
  const [formasPagamentos, setFormasPagamentos] = useState({}); // dinheiro|cartao|mbway

  const initialTotalRef = useRef(0);
  const offRouteSinceRef = useRef(null);
  const lastRecalcAtRef = useRef(0);
  const hasRoutedWithGpsRef = useRef(false);

  const RECALC_DEVIATION_METERS = 120;
  const RECALC_PERSIST_MS = 8000;
  const RECALC_COOLDOWN_MS = 30000;

  useEffect(() => {
    document.body.classList.add("nav-full");
    return () => document.body.classList.remove("nav-full");
  }, []);
  // carregar paradas
  useEffect(() => {
    (async () => {
      let paradas = Array.isArray(state?.paradas) ? state.paradas : null;

      if (!paradas) {
        try {
          const lista = await listarMinhasEntregas();
          paradas = (Array.isArray(lista) ? lista : []).map((e) => ({
            id: e._id || e.id,
            lat: Number(e?.location?.lat ?? e?.cliente?.location?.lat),
            lng: Number(e?.location?.lng ?? e?.cliente?.location?.lng),
            entrega: e,
          }));
        } catch {
          paradas = [];
        }
      }

      const normalizadas = (paradas || [])
        .map((p) => {
          let lat = Number(p.lat),
            lng = Number(p.lng);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
          if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
          return { ...p, lat, lng };
        })
        .filter(Boolean);

      setAllStops(normalizadas);
      setOrderedStops(normalizadas);
      initialTotalRef.current = normalizadas.length;
    })();
  }, [state?.paradas]);

  // GPS
  useEffect(() => {
    if (!("geolocation" in navigator)) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords || {};
        if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
          const p = { lat: latitude, lng: longitude, accuracy: accuracy ?? 0 };
          setMyPos(p);
          lastGoodPosRef.current = p;
          if (mapRef.current) {
            const z = Math.max(
              mapRef.current.getZoom() || 0,
              DEFAULT_ZOOM_LOCAL
            );
            mapRef.current.setView([p.lat, p.lng], z, { animate: false });
            panWithBottomPadding(mapRef.current, p.lat, p.lng, BOTTOM_UI_PX);
          }
        }
      },
      () => {},
      { enableHighAccuracy: true, timeout: 6000 }
    );

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords || {};
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
        const acc = Number(accuracy) || 9999;
        if (acc > 50) return;
        const next = { lat: latitude, lng: longitude, accuracy: acc };

        const moved =
          !lastGoodPosRef.current ||
          haversine(lastGoodPosRef.current, next) >= 3;
        if (moved) {
          lastGoodPosRef.current = next;
          setMyPos(next);
          if (!hasRoutedWithGpsRef.current && orderedStops.length) {
            hasRoutedWithGpsRef.current = true;
            calcularRota();
          }
          if (cameraMode === "follow" && mapRef.current) {
            const now = Date.now();
            if (now - (lastPanAtRef.current || 0) > 900) {
              lastPanAtRef.current = now;
              const z = Math.max(
                mapRef.current.getZoom() || 0,
                DEFAULT_ZOOM_LOCAL
              );
              mapRef.current.setView([next.lat, next.lng], z, {
                animate: false,
              });
              panWithBottomPadding(mapRef.current, p.lat, p.lng, BOTTOM_UI_PX);
            }
          }
        }

        if (routeCoords && routeCoords.length > 1) {
          let minDist = Infinity;
          for (let i = 0; i < routeCoords.length - 1; i++) {
            const a = { lat: routeCoords[i][0], lng: routeCoords[i][1] };
            const b = {
              lat: routeCoords[i + 1][0],
              lng: routeCoords[i + 1][1],
            };
            const dd = distPointToSegMeters(next, a, b);
            if (dd < minDist) minDist = dd;
            if (minDist <= RECALC_DEVIATION_METERS) break;
          }
          const tooFar = minDist > RECALC_DEVIATION_METERS;
          const now = Date.now();
          if (tooFar) {
            if (!offRouteSinceRef.current) offRouteSinceRef.current = now;
            const stayedOff = now - (offRouteSinceRef.current || now);
            const canRecalc =
              now - lastRecalcAtRef.current > RECALC_COOLDOWN_MS;
            if (stayedOff > RECALC_PERSIST_MS && canRecalc) {
              lastRecalcAtRef.current = now;
              offRouteSinceRef.current = null;
              calcularRota();
            }
          } else offRouteSinceRef.current = null;
        }

        if (ENABLE_GPS_PING) {
          httpPost("/usuarios/atualizar-localizacao", {
            lat: next.lat,
            lng: next.lng,
          }).catch(() => {});
        }
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 4000, timeout: 10000 }
    );

    return () => {
      try {
        navigator.geolocation.clearWatch(watchId);
      } catch {}
    };
  }, [cameraMode, routeCoords, orderedStops.length]);

  useEffect(() => {
    if (orderedStops.length) calcularRota(); // eslint-disable-line
  }, [orderedStops]);
  useEffect(() => {
    if (myPos && orderedStops.length && !hasRoutedWithGpsRef.current) {
      hasRoutedWithGpsRef.current = true;
      calcularRota();
    }
  }, [myPos?.lat, myPos?.lng, orderedStops.length]);

  function sanitizeStops(stops) {
    const out = [];
    for (const p of stops || []) {
      let lat = parseFloat(
        p?.lat ?? p?.location?.lat ?? p?.cliente?.location?.lat
      );
      let lng = parseFloat(
        p?.lng ?? p?.location?.lng ?? p?.cliente?.location?.lng
      );
      if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) {
        const tmp = lat;
        lat = lng;
        lng = tmp;
      }
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      if (Math.abs(lat) > 90 || Math.abs(lng) > 180) continue;
      out.push({ id: p.id || p._id, lat, lng });
    }
    return out;
  }
  function chunkSeq(seq, maxPts = 100) {
    const chunks = [];
    if (!seq || seq.length < 2) return chunks;
    let i = 0;
    while (i < seq.length) {
      const end = Math.min(i + maxPts - 1, seq.length - 1);
      chunks.push(seq.slice(i, end + 1));
      if (end === seq.length - 1) break;
      i = end; // overlap
    }
    return chunks;
  }

  async function calcularRota() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), WHOLE_ROUTE_TIMEOUT_MS);

    try {
      setRouting(true);
      setRoutingError("");
      setRouteCoords([]);
      setNavSteps([]);
      setCurrentStepIdx(0);

      const stops = sanitizeStops(orderedStops);
      if (!stops.length) {
        setRoutingError("Sem pontos válidos para rota.");
        return;
      }

      const start =
        myPos && Number.isFinite(myPos.lat) && Number.isFinite(myPos.lng)
          ? { lat: myPos.lat, lng: myPos.lng }
          : { lat: stops[0].lat, lng: stops[0].lng };

      let seqCore =
        ORDER_MODE === "angle"
          ? orderByAngleLoop(start, stops)
          : orderNearestLoop(start, stops);

      seqCore = twoOptLoop(seqCore, start);
      seqCore = orOpt1(seqCore, start);

      const seq = [start, ...seqCore, ...(CLOSE_LOOP ? [start] : [])];

      const MAX_PER_CALL = 100;
      const chunks = chunkSeq(seq, MAX_PER_CALL);

      const allCoords = [];
      for (let i = 0; i < chunks.length; i++) {
        await throttleTomTom();
        const { coords } = await routeMulti(chunks[i], controller.signal);
        if (!coords || coords.length < 2) continue;
        if (allCoords.length) allCoords.push(...coords.slice(1));
        else allCoords.push(...coords);
      }

      setRouteCoords(allCoords);

      if (mapRef.current) {
        if (myPos) {
          const z = Math.max(mapRef.current.getZoom() || 0, DEFAULT_ZOOM_LOCAL);
          mapRef.current.setView([myPos.lat, myPos.lng], z, { animate: false });
          // usa sempre o mesmo alvo com padding inferior (não deixa ir pro centro)
          panWithBottomPadding(
            mapRef.current,
            myPos.lat,
            myPos.lng,
            BOTTOM_UI_PX
          );
        } else if (allCoords.length) {
          const bounds = L.latLngBounds(
            allCoords.map(([la, lo]) => L.latLng(la, lo))
          );
          mapRef.current.fitBounds(bounds.pad(0.1), { animate: false });
          // leve empurrão pra cima quando ainda sem GPS
          mapRef.current.panBy([0, -BOTTOM_UI_PX / 2], { animate: false });
        }
      }
    } catch (e) {
      console.error("[ROTA] erro:", e);
      setRoutingError(
        e?.name === "AbortError"
          ? "Tempo esgotado ao calcular rota."
          : e?.message || "Falha ao traçar rota."
      );
    } finally {
      clearTimeout(timer);
      setRouting(false);
    }
  }

  // ações do popup
  async function acaoEntregar(id) {
    try {
      await concluirEntrega(id);
      setAllStops((arr) => arr.filter((p) => p.id !== id));
      setOrderedStops((arr) => arr.filter((p) => p.id !== id));
      calcularRota();
    } catch {
      alert("Falha ao concluir entrega.");
    }
  }
  async function acaoPagar(id) {
    const raw = valoresPagamentos[id];
    const forma = (formasPagamentos[id] || "dinheiro").toLowerCase();
    const valor = Number(String(raw ?? "").replace(",", "."));
    if (!Number.isFinite(valor) || valor <= 0) {
      alert("Informe um valor válido.");
      return;
    }
    try {
      await registrarPagamento(id, { valor, forma });
      setAllStops((arr) => arr.filter((p) => p.id !== id));
      setOrderedStops((arr) => arr.filter((p) => p.id !== id));
      calcularRota();
    } catch {
      alert("Falha ao registrar pagamento.");
    }
  }

  const remainingDistance = useMemo(() => {
    if (!navSteps.length) return 0;
    let sum = 0;
    for (let i = currentStepIdx; i < navSteps.length; i++)
      sum += navSteps[i].distance || 0;
    return sum;
  }, [navSteps, currentStepIdx]);

  const remainingDuration = useMemo(() => {
    if (!navSteps.length) return 0;
    let sum = 0;
    for (let i = currentStepIdx; i < navSteps.length; i++)
      sum += navSteps[i].duration || 0;
    return sum;
  }, [navSteps, currentStepIdx]);

  const filteredMode = orderedStops.length < allStops.length;
  const totalParadas = initialTotalRef.current || 0;
  const pendentes = orderedStops.length || 0;
  const feitas = Math.max(0, totalParadas - pendentes);

  return (
    <div className="fixed inset-0 z-[100] bg-black">
      {/* topo: erro */}
      <div className="absolute top-3 left-3 right-3 z-[102] flex items-center justify-between gap-2">
        {routingError && (
          <div className="bg-red-600 text-white px-3 py-2 rounded">
            {routingError}
          </div>
        )}
      </div>

      {/* botão flutuante para voltar a ver todas quando filtrado */}
      {filteredMode && (
        <button
          onClick={() => {
            setOrderedStops(allStops);
            setRoutingError("");
            calcularRota();
          }}
          style={{
            position: "absolute",
            right: 12,
            bottom: 80,
            zIndex: 102,
            padding: "8px 12px",
            borderRadius: 10,
            background: "#fff",
            border: "1px solid #e5e7eb",
            boxShadow: "0 1px 6px rgba(0,0,0,0.15)",
            fontWeight: 600,
          }}
          title="Mostrar todas as paradas novamente"
        >
          Ver todas
        </button>
      )}

      <div className="absolute bottom-3 left-3 right-3 z-[101] flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="px-2 py-1 text-xs rounded border bg-white/95 shadow">
            <b>Restante:</b> {Math.round(remainingDistance)} m
          </div>
          <div className="px-2 py-1 text-xs rounded border bg-white/95 shadow">
            <b>Tempo:</b> {Math.round(remainingDuration / 60)} min
          </div>
          <div className="flex items-center gap-2">
            <div className="px-2 py-1 text-xs rounded border bg-white/95 shadow">
              <b>Restante:</b> {Math.round(remainingDistance)} m
            </div>
            <div className="px-2 py-1 text-xs rounded border bg-white/95 shadow">
              <b>Tempo:</b> {Math.round(remainingDuration / 60)} min
            </div>
            <div className="flex items-center gap-2">
              <div className="px-2 py-1 text-xs rounded border bg-white/95 shadow">
                <b>Total:</b> {totalParadas}
              </div>
              <div className="px-2 py-1 text-xs rounded border bg-white/95 shadow">
                <b>Feitas:</b> {feitas}
              </div>
              <div className="px-2 py-1 text-xs rounded border bg-white/95 shadow">
                <b>Pendentes:</b> {pendentes}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1 text-xs rounded bg-white/95 shadow border"
            onClick={() => {
              if (!mapRef.current) return;
              setCameraMode("follow");
              const p = myPos || lastGoodPosRef.current;
              if (!p) return;
              const z = Math.max(
                mapRef.current.getZoom() || 0,
                DEFAULT_ZOOM_LOCAL
              );

              // centraliza no ponto e aplica apenas UM deslocamento (pixels)
              mapRef.current.setView([p.lat, p.lng], z, { animate: false });
              panWithBottomPadding(mapRef.current, p.lat, p.lng, BOTTOM_UI_PX);

              const currentPt = mapRef.current.latLngToContainerPoint([
                p.lat,
                p.lng,
              ]);
              const desiredPt = L.point(size.x / 2, size.y * TOP_FACTOR);
              const offset = desiredPt.subtract(currentPt);
              mapRef.current.panBy(offset.multiplyBy(-1), { animate: false });
            }}
          >
            Recentrar
          </button>
          <button
            className="px-3 py-1 text-xs rounded bg-black text-white/90 shadow"
            onClick={() => navigate(-1)}
          >
            Fechar
          </button>
        </div>
      </div>

      <MapContainer
        ref={(r) => (mapRef.current = r)}
        center={[0, 0]}
        zoom={DEFAULT_ZOOM_WIDE}
        style={{ height: "100svh", width: "100vw", zIndex: 0 }}
        scrollWheelZoom
        zoomControl={false}
        inertia={false}
        zoomAnimation={false}
        doubleClickZoom={false}
        whenReady={(e) => {
          const m = e.target;
          L.control.zoom({ position: "bottomleft" }).addTo(m);
          const toManual = (ev) => {
            if (ev && ev.originalEvent) setCameraMode("manual");
          };
          m.on("dragstart", toManual);
          m.on("zoomstart", toManual);
        }}
      >
        <TileLayer
          url={`https://api.tomtom.com/map/1/tile/basic/main/{z}/{x}/{y}.png?key=${
            import.meta.env.VITE_TOMTOM_API_KEY
          }`}
          attribution="&copy; TomTom"
        />

        {myPos && (
          <>
            <CircleMarker
              center={[myPos.lat, myPos.lng]}
              radius={7}
              pathOptions={{
                color: "#2563eb",
                fillColor: "#2563eb",
                fillOpacity: 0.8,
              }}
            />
            <Marker position={[myPos.lat, myPos.lng]} icon={arrowIcon} />
          </>
        )}

        {routeCoords.length > 0 && (
          <Polyline
            positions={routeCoords}
            pathOptions={{ color: "#2563eb", weight: 5, opacity: 0.9 }}
          />
        )}

        {orderedStops.map((p) => {
          if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return null;
          const e = p.entrega || {};
          const itens = normalizaItensPedido(e);
          const obs = pickObservacoes(e);
          const formaAtual = formasPagamentos[p.id] || "dinheiro";

          return (
            <Marker
              key={p.id}
              position={[Number(p.lat), Number(p.lng)]}
              icon={pinIcon}
            >
              <Popup minWidth={260} maxWidth={360}>
                <div style={{ fontWeight: 700, marginBottom: 2 }}>
                  {pickClienteNome(e)}
                </div>
                <div style={{ fontSize: 12, color: "#555", marginBottom: 6 }}>
                  {pickEndereco(e)}
                </div>

                {itens.length > 0 && (
                  <ul
                    style={{
                      fontSize: 13,
                      marginBottom: 8,
                      paddingLeft: 18,
                    }}
                  >
                    {itens.map((it) => (
                      <li key={it.id}>
                        {it.qtd ? `${it.qtd}× ` : ""}
                        {it.nome}
                        {it.obs ? ` — ${it.obs}` : ""}
                      </li>
                    ))}
                  </ul>
                )}

                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    marginBottom: 6,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    onClick={() => acaoEntregar(p.id)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 8,
                      background: "#16a34a",
                      color: "#fff",
                      border: 0,
                    }}
                  >
                    Entregar
                  </button>

                  <button
                    onClick={() => {
                      setOrderedStops([p]);
                      setRoutingError("");
                      calcularRota();
                    }}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 8,
                      background: "#111",
                      color: "#fff",
                      border: 0,
                    }}
                  >
                    Navegar até aqui
                  </button>
                </div>

                {/* pagamento: valor + forma (com quebra automática) */}
                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    marginBottom: 6,
                    flexWrap: "wrap",
                  }}
                >
                  <input
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="Valor recebido"
                    value={valoresPagamentos[p.id] ?? ""}
                    onChange={(ev) =>
                      setValoresPagamentos((m) => ({
                        ...m,
                        [p.id]: ev.target.value,
                      }))
                    }
                    style={{
                      flex: "1 1 120px",
                      minWidth: 120,
                      padding: "6px 8px",
                      borderRadius: 8,
                      border: "1px solid #ddd",
                    }}
                  />
                  <select
                    value={formaAtual}
                    onChange={(ev) =>
                      setFormasPagamentos((m) => ({
                        ...m,
                        [p.id]: ev.target.value,
                      }))
                    }
                    style={{
                      flex: "0 0 120px",
                      padding: "6px 8px",
                      borderRadius: 8,
                      border: "1px solid #ddd",
                      background: "#fff",
                    }}
                    title="Forma de pagamento"
                  >
                    <option value="dinheiro">Dinheiro</option>
                    <option value="cartao">Cartão</option>
                    <option value="mbway">MB Way</option>
                  </select>
                  <button
                    onClick={() => acaoPagar(p.id)}
                    style={{
                      flex: "0 0 auto",
                      padding: "6px 10px",
                      borderRadius: 8,
                      background: "#f59e0b",
                      color: "#111",
                      border: 0,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Pagamento
                  </button>
                </div>

                {/* observações do cliente (se existirem) */}
                <div style={{ fontSize: 12, color: "#444" }}>
                  <b>Observações:</b> {obs ? obs : "Sem observações."}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
