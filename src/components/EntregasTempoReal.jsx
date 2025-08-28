// src/components/EntregasTempoReal.jsx
import React, { useEffect, useRef, useState } from "react";
import { buscarEntregasTempoReal } from "../services/entregaService";

function normalizaLista(input) {
  const arr = Array.isArray(input) ? input : input?.data || [];
  return (
    arr
      .map((e) => {
        const id = e?._id || e?.id || Math.random().toString(36).slice(2);
        const clienteNome =
          typeof e?.cliente === "string"
            ? e.cliente
            : e?.cliente?.nome || e?.clienteNome || "Cliente";
        // status vindo do back (se existir) ou inferido
        const status = e?.status ?? (e?.entregue ? "Entregue" : "Em andamento");
        const atualizadoEm =
          e?.updatedAt || e?.dataAtualizacao || e?.createdAt || null;

        return {
          _id: id,
          cliente: clienteNome,
          status,
          atualizadoEm,
          entregue: !!e?.entregue,
        };
      })
      // ordena: primeiro em andamento, depois entregues; mais recentes primeiro
      .sort((a, b) => {
        if (a.entregue !== b.entregue) return a.entregue ? 1 : -1;
        const ta = a.atualizadoEm ? new Date(a.atualizadoEm).getTime() : 0;
        const tb = b.atualizadoEm ? new Date(b.atualizadoEm).getTime() : 0;
        return tb - ta;
      })
  );
}

export default function EntregasTempoReal({ padariaId }) {
  const [entregas, setEntregas] = useState([]);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);

  const timerRef = useRef(null);
  const aliveRef = useRef(true);

  async function carregar() {
    try {
      setErro("");
      const dados = await buscarEntregasTempoReal(padariaId);
      if (!aliveRef.current) return;
      setEntregas(normalizaLista(dados));
    } catch (e) {
      console.error("Erro ao buscar entregas em tempo real:", e);
      if (!aliveRef.current) return;
      setErro("Erro ao carregar entregas em tempo real.");
    } finally {
      if (aliveRef.current) setCarregando(false);
    }
  }

  // inicia / reinicia o polling a cada 10s
  function startPolling() {
    stopPolling();
    // Se a aba estiver oculta, não polle (economiza rede/bateria)
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
      setEntregas([]);
      setCarregando(false);
      return;
    }

    // primeira carga imediata
    carregar().then(() => startPolling());

    // pausa/retoma quando a aba muda de visibilidade
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

  return (
    <div className="bg-white shadow rounded-lg p-4 mt-6">
      <h2 className="text-lg font-bold mb-2">📦 Entregas em Tempo Real</h2>

      {carregando ? (
        <p className="text-gray-500">Carregando entregas...</p>
      ) : erro ? (
        <p className="text-red-600">{erro}</p>
      ) : entregas.length === 0 ? (
        <p className="text-gray-500">Sem entregas em andamento.</p>
      ) : (
        <ul className="divide-y">
          {entregas.map((entrega) => (
            <li
              key={entrega._id}
              className="py-2 text-sm flex items-center gap-2"
            >
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  entrega.entregue
                    ? "bg-green-100 text-green-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {entrega.status}
              </span>
              <strong className="ml-1">{entrega.cliente}</strong>
              {entrega.atualizadoEm && (
                <span className="text-gray-500 ml-auto">
                  {new Date(entrega.atualizadoEm).toLocaleTimeString()}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
