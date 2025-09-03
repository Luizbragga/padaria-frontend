// src/components/MapaEntregadores.jsx
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import axios from "axios";
import { getToken, getUsuario } from "../utils/auth";

const API_URL = import.meta.env.VITE_API_URL ?? "";

// Corrige os ícones padrão do Leaflet (sem quebrar se já foi feito)
try {
  // @ts-ignore
  delete L.Icon.Default.prototype._getIconUrl;
} catch {}
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png",
});

// Normaliza diferentes formatos vindos do backend
function normalizaLista(input) {
  const arr = Array.isArray(input)
    ? input
    : Array.isArray(input?.data)
    ? input.data
    : [];
  return arr
    .map((e, i) => {
      const id = e?._id || e?.id || `ent_${i}`;
      const nome =
        e?.nome ||
        e?.entregadorNome ||
        (typeof e?.entregador === "object"
          ? e.entregador?.nome
          : e?.entregador) ||
        "Entregador";
      const loc =
        e?.localizacaoAtual || e?.location || e?.posicao || e?.geo || null;

      let lat = null;
      let lng = null;
      if (loc) {
        lat = loc.lat ?? loc.latitude ?? null;
        lng = loc.lng ?? loc.longitude ?? null;
      }
      if (typeof lat !== "number" || typeof lng !== "number") return null;

      return { id, nome, lat, lng };
    })
    .filter(Boolean);
}

export default function MapaEntregadores({ padariaId }) {
  const usuario = getUsuario();
  // Oculta para entregador (visão gerencial)
  if (usuario?.role === "entregador") return null;

  const [entregadores, setEntregadores] = useState([]);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);

  const aliveRef = useRef(true);
  const timerRef = useRef(null);

  async function carregar() {
    try {
      setErro("");
      const token = getToken();
      const { data } = await axios.get(
        `${API_URL}/analitico/localizacao-entregadores`,
        {
          params: padariaId ? { padaria: padariaId } : {},
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!aliveRef.current) return;
      setEntregadores(normalizaLista(data));
    } catch (e) {
      if (!alive.current) return;

      const code = e?.response?.status ?? null;
      if (code === 404 || code === 204) {
        setEntregadores([]);
        setErro(""); // sem aviso vermelho
      } else {
        console.error("Erro ao buscar localização dos entregadores:", e);
        setErro("Erro ao buscar localização dos entregadores.");
        setEntregadores([]);
      }
    } finally {
      if (alive.current) setCarregando(false);
    }
  }

  function startPolling() {
    stopPolling();
    if (document.visibilityState === "hidden") return;
    timerRef.current = setInterval(carregar, 10_000);
  }
  function stopPolling() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  useEffect(() => {
    aliveRef.current = true;

    if (!padariaId) {
      // sem padaria selecionada, nada a mostrar
      setCarregando(false);
      setEntregadores([]);
      return () => {
        aliveRef.current = false;
      };
    }

    carregar().then(() => startPolling());

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        stopPolling();
      } else {
        carregar().then(() => startPolling());
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      aliveRef.current = false;
      document.removeEventListener("visibilitychange", onVisibility);
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [padariaId]);

  const center = useMemo(() => {
    if (!entregadores.length) return [41.545, -8.4307]; // fallback (Barcelos)
    const { latSum, lngSum } = entregadores.reduce(
      (acc, e) => ({ latSum: acc.latSum + e.lat, lngSum: acc.lngSum + e.lng }),
      { latSum: 0, lngSum: 0 }
    );
    return [latSum / entregadores.length, lngSum / entregadores.length];
  }, [entregadores]);

  return (
    <div className="mt-6 bg-white rounded shadow p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-bold text-lg">📍 Localização dos Entregadores</h2>
        <button
          className="text-sm px-3 py-1 rounded border"
          onClick={() => carregar().then(() => startPolling())}
          title="Atualizar agora"
        >
          Atualizar
        </button>
      </div>

      {carregando && <p className="text-gray-500">Carregando mapa…</p>}
      {erro && <p className="text-red-600">{erro}</p>}

      {!carregando && !erro && entregadores.length === 0 ? (
        <p className="text-gray-600">
          Sem dados de localização de entregadores no momento.
        </p>
      ) : (
        <MapContainer
          center={center}
          zoom={13}
          style={{ height: "400px", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
          />
          {entregadores.map((ent) => (
            <Marker key={ent.id} position={[ent.lat, ent.lng]}>
              <Popup>
                <strong>{ent.nome}</strong>
                <br />
                Localização Atual
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      )}
    </div>
  );
}
