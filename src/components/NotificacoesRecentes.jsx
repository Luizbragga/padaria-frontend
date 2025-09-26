import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { getToken, getUsuario } from "../utils/auth";
import { API_BASE } from "../services/http";

const buildUrl = (path, params) => {
  const u = new URL(path.replace(/^\/+/, ""), API_BASE);
  if (params)
    Object.entries(params).forEach(
      ([k, v]) => v != null && u.searchParams.set(k, v)
    );
  return u.href;
};

// Normaliza vários formatos do backend
function normalizaEventos(input) {
  const arr = Array.isArray(input)
    ? input
    : Array.isArray(input?.eventos)
    ? input.eventos
    : [];
  return arr
    .map((ev, i) => {
      const id = ev?._id || ev?.id || `${ev?.tipo || "evt"}_${i}`;
      const tipo = ev?.tipo || ev?.eventType || "Evento";
      const cliente =
        typeof ev?.cliente === "string"
          ? ev.cliente
          : ev?.cliente?.nome || ev?.clienteNome || "Cliente";
      const entregador =
        typeof ev?.entregador === "string"
          ? ev.entregador
          : ev?.entregador?.nome || ev?.entregadorNome || null;
      const rota = ev?.rota || ev?.rotaCodigo || null;
      const horario = ev?.horario || ev?.createdAt || ev?.updatedAt || null;
      return { id, tipo, cliente, entregador, rota, horario };
    })
    .sort((a, b) => {
      const ta = a.horario ? new Date(a.horario).getTime() : 0;
      const tb = b.horario ? new Date(b.horario).getTime() : 0;
      return tb - ta;
    });
}

// Badge por tipo de evento
function badgeClasse(tipo) {
  const t = String(tipo).toLowerCase();
  if (t.includes("pagamento")) return "bg-green-100 text-green-800";
  if (t.includes("problema") || t.includes("erro"))
    return "bg-red-100 text-red-800";
  if (t.includes("rota")) return "bg-blue-100 text-blue-800";
  if (t.includes("entrega")) return "bg-yellow-100 text-yellow-800";
  return "bg-gray-100 text-gray-800";
}

export default function NotificacoesRecentes({ padariaId }) {
  const [eventos, setEventos] = useState([]);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);

  const timerRef = useRef(null);
  const aliveRef = useRef(false);

  const usuario = getUsuario();
  const ehEntregador = usuario?.role === "entregador";

  async function carregar() {
    try {
      setErro("");
      const token = getToken();
      const { data } = await axios.get(
        buildUrl(
          "analitico/notificacoes-recentes",
          padariaId ? { padaria: padariaId } : {}
        ),
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!aliveRef.current) return;
      setEventos(normalizaEventos(data));
    } catch (e) {
      if (!aliveRef.current) return;
      const code = e?.response?.status ?? null;
      if (code === 404 || code === 204) {
        setEventos([]);
        setErro("");
      } else {
        console.error("Erro ao carregar notificações:", e);
        setErro("Erro ao carregar notificações recentes.");
        setEventos([]);
      }
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

    // Oculta para entregador (notificações são visão gerencial)
    if (ehEntregador) {
      setEventos([]);
      setCarregando(false);
      return () => {
        aliveRef.current = false;
      };
    }

    // Sem padaria selecionada, não faz chamadas
    if (!padariaId) {
      setEventos([]);
      setCarregando(false);
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
  }, [padariaId, ehEntregador]);

  if (ehEntregador) return null;

  return (
    <div className="bg-white shadow rounded-lg p-4 mt-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold">🔔 Notificações Recentes</h2>
        <button
          onClick={() => carregar().then(() => startPolling())}
          className="text-sm px-3 py-1 rounded border"
          title="Atualizar agora"
        >
          Atualizar
        </button>
      </div>

      {carregando && <p className="text-gray-500">Carregando notificações…</p>}
      {erro && <p className="text-red-600">{erro}</p>}

      {!carregando && !erro && (eventos?.length ?? 0) === 0 && (
        <p className="text-gray-500">Sem eventos recentes hoje.</p>
      )}

      {(eventos?.length ?? 0) > 0 && (
        <ul className="divide-y">
          {eventos.map((ev) => (
            <li key={ev.id} className="py-2 text-sm flex items-center gap-2">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${badgeClasse(
                  ev.tipo
                )}`}
              >
                {ev.tipo}
              </span>
              <span>
                <strong>{ev.cliente}</strong>
                {ev.entregador ? ` • ${ev.entregador}` : ""}
                {ev.rota ? ` • Rota ${String(ev.rota).toUpperCase()}` : ""}
              </span>
              {ev.horario && (
                <span className="ml-auto text-gray-500">
                  {new Date(ev.horario).toLocaleTimeString("pt-PT", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
