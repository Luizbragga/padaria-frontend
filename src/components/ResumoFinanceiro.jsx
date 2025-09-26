// src/components/ResumoFinanceiro.jsx
import React, { useEffect, useRef, useState } from "react";
import { getToken, getUsuario } from "../utils/auth";
import { API_BASE } from "../services/http";

function normalizaResumo(input) {
  const src =
    input && typeof input === "object"
      ? input.data && typeof input.data === "object"
        ? input.data
        : input
      : {};

  return {
    totalRecebido: Number(src.totalRecebido ?? src.recebido ?? 0) || 0,
    totalPendente: Number(src.totalPendente ?? src.pendente ?? 0) || 0,
    clientesPagantes: Number(src.clientesPagantes ?? src.pagantes ?? 0) || 0,
  };
}

function formatValue(valor, tipo = "currency") {
  const n = Number(valor) || 0;
  if (tipo === "currency") {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  }
  if (tipo === "integer") {
    return new Intl.NumberFormat("pt-PT", {
      maximumFractionDigits: 0,
    }).format(Math.round(n));
  }
  return new Intl.NumberFormat("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export default function ResumoFinanceiro({ padariaId }) {
  const [resumo, setResumo] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const usuario = getUsuario();
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;

    async function buscarResumo() {
      setCarregando(true);
      setErro("");

      try {
        if (usuario?.role === "entregador" || !padariaId) {
          setResumo(null);
          return;
        }

        const u = new URL("analitico/resumo-financeiro", API_BASE);
        u.searchParams.set("padaria", padariaId);
        const resp = await fetch(u.href, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });

        // Sem conteúdo ou não encontrado => trata como "sem dados", sem erro visual
        if (resp.status === 204 || resp.status === 404) {
          setResumo(null);
          setErro(""); // não mostra banner vermelho
          return;
        }

        let dados = null;
        try {
          dados = await resp.json();
        } catch {
          dados = null;
        }

        // Qualquer resposta não-OK vira "sem dados" (silencioso)
        if (!resp.ok) {
          setResumo(null);
          setErro(""); // não mostra banner vermelho
          return;
        }

        setResumo(normalizaResumo(dados ?? {}));
      } catch (e) {
        // Falha de rede/rota ausente: mantém experiência limpa
        console.error("Resumo financeiro:", e);
        setResumo(null);
        setErro(""); // não poluir UI com erro quando não é crítico
      } finally {
        setCarregando(false);
      }
    }

    buscarResumo();
    return () => {
      alive.current = false;
    };
  }, [padariaId, usuario?.role]);

  if (usuario?.role === "entregador") return null;

  if (carregando)
    return <p className="text-gray-500">Carregando resumo financeiro...</p>;
  if (erro) return <p className="text-red-600">{erro}</p>;
  if (!resumo) return <p className="text-gray-500">Nenhum dado disponível.</p>;
}
