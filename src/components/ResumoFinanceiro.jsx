import React, { useEffect, useState } from "react";
import { getToken, getUsuario } from "../utils/auth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function ResumoFinanceiro({ padariaId }) {
  const [resumo, setResumo] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const usuario = getUsuario();

  useEffect(() => {
    const buscarResumo = async () => {
      setCarregando(true);
      setErro("");

      try {
        if (usuario?.role === "entregador") return;

        if (!padariaId) {
          console.warn("⚠️ Nenhum padariaId fornecido para resumo financeiro.");
          return;
        }

        const resposta = await fetch(
          `${API_URL}/analitico/resumo-financeiro?padaria=${padariaId}`,
          {
            headers: {
              Authorization: `Bearer ${getToken()}`,
            },
          }
        );

        if (!resposta.ok) throw new Error("Falha ao buscar resumo financeiro");
        const dados = await resposta.json();
        setResumo(dados);
      } catch (err) {
        console.error("Erro ao buscar resumo financeiro:", err);
        setErro("Erro ao carregar resumo financeiro.");
      } finally {
        setCarregando(false);
      }
    };

    buscarResumo();
  }, [padariaId, usuario?.role]);

  if (usuario?.role === "entregador") return null;

  if (carregando)
    return <p className="text-gray-500">Carregando resumo financeiro...</p>;
  if (erro) return <p className="text-red-600">{erro}</p>;
  if (!resumo) return <p className="text-gray-500">Nenhum dado disponível.</p>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
      <Card
        valor={resumo.totalRecebido ?? 0}
        label="Total Recebido"
        cor="text-green-600"
        prefixo="€"
      />
      <Card
        valor={resumo.totalPendente ?? 0}
        label="Total Pendente"
        cor="text-red-600"
        prefixo="€"
      />
      <Card
        valor={resumo.clientesPagantes ?? 0}
        label="Clientes Pagantes"
        cor="text-blue-600"
      />
    </div>
  );
}

function Card({ valor, label, cor, prefixo = "" }) {
  return (
    <div className="bg-white shadow rounded p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold ${cor}`}>
        {prefixo} {valor.toFixed(2)}
      </p>
    </div>
  );
}
