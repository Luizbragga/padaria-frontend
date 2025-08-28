// src/components/ResumoFinanceiro.jsx
import React, { useEffect, useRef, useState } from "react";
import { getToken, getUsuario } from "../utils/auth";

const API_URL = import.meta.env.VITE_API_URL ?? "";

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
        if (usuario?.role === "entregador") {
          setResumo(null);
          return;
        }
        if (!padariaId) {
          setResumo(null);
          return;
        }

        const resp = await fetch(
          `${API_URL}/analitico/resumo-financeiro?padaria=${padariaId}`,
          { headers: { Authorization: `Bearer ${getToken()}` } }
        );
        if (!resp.ok) throw new Error("Falha ao buscar resumo financeiro");

        const dados = await resp.json();
        if (!alive.current) return;

        setResumo(normalizaResumo(dados));
      } catch (e) {
        console.error("Erro ao buscar resumo financeiro:", e);
        if (!alive.current) return;
        setErro("Erro ao carregar resumo financeiro.");
        setResumo(null);
      } finally {
        if (alive.current) setCarregando(false);
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

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
      <Card
        valor={resumo.totalRecebido}
        label="Total Recebido"
        tipo="currency"
        cor="text-green-600"
      />
      <Card
        valor={resumo.totalPendente}
        label="Total Pendente"
        tipo="currency"
        cor="text-red-600"
      />
      <Card
        valor={resumo.clientesPagantes}
        label="Clientes Pagantes"
        tipo="integer"
        cor="text-blue-600"
      />
    </div>
  );
}

function Card({ valor, label, cor, tipo = "currency" }) {
  return (
    <div className="bg-white shadow rounded p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold ${cor}`}>{formatValue(valor, tipo)}</p>
    </div>
  );
}
