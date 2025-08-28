// src/components/LocalizacaoEntregadores.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getToken, getUsuario } from "../utils/auth";

const API_URL = import.meta.env.VITE_API_URL ?? "";

// Corrige ícones do Leaflet (sem quebrar se já foi feito)
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
function normaliza(input) {
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
      } else {
        // fallback raro: alguns backends mandam direto
        lat = e?.lat ?? e?.latitude ?? null;
        lng = e?.lng ?? e?.longitude ?? null;
      }

      if (typeof lat !== "number" || typeof lng !== "number") return null;
      return { id, nome, lat, lng };
    })
    .filter(Boolean);
}

export default function LocalizacaoEntregadores({ padariaId }) {
  const usuario = getUsuario();
  // visão gerencial; oculto para entregador
  if (usuario?.role === "entregador") return null;

  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

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
      setItens(normaliza(data));
    } catch (e) {
      console.error("Erro ao buscar localizações:", e);
      if (!aliveRef.current) return;
      setErro("Erro ao carregar localizações dos entregadores.");
      setItens([]);
    } finally {
      if (aliveRef.current) setCarregando(false);
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
      setCarregando(false);
      setItens([]);
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
    if (!itens.length) return [41.545, -8.4307]; // Barcelos (fallback)
    const { latSum, lngSum } = itens.reduce(
      (acc, e) => ({ latSum: acc.latSum + e.lat, lngSum: acc.lngSum + e.lng }),
      { latSum: 0, lngSum: 0 }
    );
    return [latSum / itens.length, lngSum / itens.length];
  }, [itens]);

  return (
    <div className="p-4 bg-white rounded shadow mt-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold">📍 Localização dos Entregadores</h2>
        <button
          className="text-sm px-3 py-1 rounded border"
          onClick={() => carregar().then(() => startPolling())}
          title="Atualizar agora"
        >
          Atualizar
        </button>
      </div>

      {carregando && <p>Carregando mapa...</p>}
      {erro && <p className="text-red-600">{erro}</p>}

      {!carregando && !erro && itens.length === 0 ? (
        <p>Nenhuma localização de entregadores disponível.</p>
      ) : (
        <MapContainer
          center={center}
          zoom={13}
          style={{ height: "400px", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {itens.map((e) => (
            <Marker key={e.id} position={[e.lat, e.lng]}>
              <Popup>
                <strong>{e.nome}</strong>
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
