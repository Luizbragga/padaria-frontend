// src/components/LocalizacaoEntregadores.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getToken, getUsuario } from "../utils/auth";
import { buscarEntregasTempoReal } from "../services/entregaService";

const API_URL = import.meta.env.VITE_API_URL ?? "";

// Corrige ícones do Leaflet (seguro se já tiver sido feito)
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

// Normaliza resposta do backend (inclui rotaAtual)
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

      const rotaAtual = e?.rotaAtual || e?.rota || e?.rotaSelecionada || null;

      return { id, nome, lat, lng, rotaAtual };
    })
    .filter(Boolean);
}

// Cores por rota + ícone colorido
const CORES_ROTA = { A: "#2563eb", B: "#16a34a", C: "#f97316", D: "#a855f7" };
function corDaRota(rota) {
  const r = String(rota || "")
    .trim()
    .toUpperCase();
  return CORES_ROTA[r] || "#334155"; // slate default
}
function iconCor(cor = "#334155") {
  return L.divIcon({
    className: "rota-pin",
    html: `<div style="
      width:18px;height:18px;border-radius:50%;
      background:${cor};border:2px solid white;box-shadow:0 0 6px rgba(0,0,0,.35)
    "></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

export default function LocalizacaoEntregadores({ padariaId }) {
  const usuario = getUsuario();
  if (usuario?.role === "entregador") return null; // visão só do gerente

  const [itens, setItens] = useState([]); // entregadores
  const [entregasDia, setEntregasDia] = useState([]); // pontos dos clientes
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const aliveRef = useRef(true);
  const timerRef = useRef(null);

  async function carregarEntregadores() {
    try {
      setErro("");
      const token = getToken();
      const { data } = await axios.get(
        `${API_URL}´analitico/localizacao-entregadores`,
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

  async function carregarEntregas() {
    try {
      if (!padariaId) {
        setEntregasDia([]);
        return;
      }
      const lista = await buscarEntregasTempoReal(padariaId);
      const norm = (Array.isArray(lista) ? lista : [])
        .map((e, i) => {
          const cli = e?.cliente || {};
          const loc = cli?.location || {};
          const lat = Number(loc.lat),
            lng = Number(loc.lng);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
          return {
            id: e?._id || `cli_${i}`,
            rota: cli?.rota || "",
            nome: cli?.nome || "Cliente",
            lat,
            lng,
          };
        })
        .filter(Boolean);
      setEntregasDia(norm);
    } catch (e) {
      console.warn("Falha ao carregar entregas do dia:", e?.message || e);
      setEntregasDia([]);
    }
  }

  function startPolling() {
    stopPolling();
    if (document.visibilityState === "hidden") return;
    // primeira carga imediata
    carregarEntregadores();
    carregarEntregas();
    // a cada 10s
    timerRef.current = setInterval(() => {
      carregarEntregadores();
      carregarEntregas();
    }, 10_000);
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

    startPolling();

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        stopPolling();
      } else {
        startPolling();
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

  // Centraliza pelos pontos (entregadores + entregas). Se nenhum, fallback.
  const center = useMemo(() => {
    const pontos = [
      ...itens.map((e) => ({ lat: e.lat, lng: e.lng })),
      ...entregasDia.map((p) => ({ lat: p.lat, lng: p.lng })),
    ];
    if (!pontos.length) return [41.545, -8.4307]; // fallback
    const { latSum, lngSum } = pontos.reduce(
      (acc, p) => ({ latSum: acc.latSum + p.lat, lngSum: acc.lngSum + p.lng }),
      { latSum: 0, lngSum: 0 }
    );
    return [latSum / pontos.length, lngSum / pontos.length];
  }, [itens, entregasDia]);

  return (
    <div className="p-4 bg-white rounded shadow mt-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold">📍 Localização dos Entregadores</h2>
        <button
          className="text-sm px-3 py-1 rounded border"
          onClick={() => startPolling()}
          title="Atualizar agora"
        >
          Atualizar
        </button>
      </div>

      {carregando && <p>Carregando mapa...</p>}
      {erro && <p className="text-red-600">{erro}</p>}

      {!carregando &&
      !erro &&
      itens.length === 0 &&
      entregasDia.length === 0 ? (
        <p>Nenhum dado para exibir.</p>
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

          {/* PONTOS DE ENTREGA (cores por rota) */}
          {entregasDia.map((p) => (
            <Marker
              key={`cli_${p.id}`}
              position={[p.lat, p.lng]}
              icon={iconCor(corDaRota(p.rota))}
            >
              <Popup>
                <div>
                  <strong>{p.nome}</strong>
                  <br />
                  Rota: {String(p.rota || "").toUpperCase() || "—"}
                </div>
              </Popup>
            </Marker>
          ))}

          {/* ENTREGADORES (cor da rotaAtual — se vier do backend) */}
          {itens.map((e) => (
            <Marker
              key={e.id}
              position={[e.lat, e.lng]}
              icon={iconCor(corDaRota(e.rotaAtual))}
            >
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
