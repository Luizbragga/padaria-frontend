// src/components/PagamentosFiltrados.jsx
import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { getToken } from "../utils/auth";

const API_URL = import.meta.env.VITE_API_URL ?? "";

function formatEUR(n) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n) || 0);
}

function normalizaResposta(input) {
  const src = input?.data ?? input ?? {};
  const lista = Array.isArray(src.pagamentos)
    ? src.pagamentos
    : Array.isArray(src.data)
    ? src.data
    : [];

  const pagamentos = lista
    .map((p, i) => {
      const id = p?._id || p?.id || `p_${i}`;
      const cliente =
        typeof p?.cliente === "string"
          ? p.cliente
          : p?.cliente?.nome || p?.clienteNome || "Cliente";
      const entregador =
        typeof p?.entregador === "string"
          ? p.entregador
          : p?.entregador?.nome || p?.entregadorNome || "—";
      const valor = Number(p?.valor ?? p?.amount ?? 0) || 0;
      const forma = (
        p?.forma ??
        p?.metodo ??
        p?.metodoPagamento ??
        ""
      ).toString();
      const data = p?.data || p?.createdAt || p?.updatedAt || null;
      return { id, cliente, entregador, valor, forma, data };
    })
    .sort((a, b) => new Date(b.data || 0) - new Date(a.data || 0));

  return {
    pagamentos,
    totalRecebido: Number(src.totalRecebido ?? src.total ?? 0) || 0,
    clientesPagantes: Number(src.clientesPagantes ?? src.pagantes ?? 0) || 0,
  };
}

export default function PagamentosFiltrados({
  dataInicial,
  dataFinal,
  forma,
  padariaId,
}) {
  const [pagamentos, setPagamentos] = useState([]);
  const [totalRecebido, setTotalRecebido] = useState(0);
  const [clientesPagantes, setClientesPagantes] = useState(0);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    async function buscarPagamentos() {
      setCarregando(true);
      try {
        const token = getToken();
        const params = {};

        if (dataInicial) params.dataInicial = dataInicial;
        if (dataFinal) params.dataFinal = dataFinal;
        if (forma && forma.toLowerCase() !== "todas")
          params.forma = forma.toLowerCase();
        if (padariaId) params.padaria = padariaId;

        const resp = await axios.get(`${API_URL}/analitico/pagamentos`, {
          headers: { Authorization: `Bearer ${token}` },
          params,
        });

        if (!aliveRef.current) return;
        const norm = normalizaResposta(resp.data);

        setPagamentos(norm.pagamentos);
        setTotalRecebido(norm.totalRecebido);
        setClientesPagantes(norm.clientesPagantes);
        setErro("");
      } catch (err) {
        console.error("Erro ao buscar pagamentos:", err);
        if (!aliveRef.current) return;
        setErro("Erro ao buscar pagamentos");
        setPagamentos([]);
        setTotalRecebido(0);
        setClientesPagantes(0);
      } finally {
        if (aliveRef.current) setCarregando(false);
      }
    }

    buscarPagamentos();
  }, [dataInicial, dataFinal, forma, padariaId]);

  return (
    <div className="p-4 bg-white rounded shadow">
      <h2 className="text-xl font-semibold mb-4">Pagamentos Filtrados</h2>

      {carregando ? (
        <p className="text-gray-600">Carregando…</p>
      ) : erro ? (
        <p className="text-red-500">{erro}</p>
      ) : !pagamentos || pagamentos.length === 0 ? (
        <p className="text-gray-600">
          Nenhum pagamento encontrado com esses filtros.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full table-auto border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2 text-left">Cliente</th>
                  <th className="border p-2 text-left">Entregador</th>
                  <th className="border p-2 text-right">Valor</th>
                  <th className="border p-2 text-left">Forma</th>
                  <th className="border p-2 text-left">Data</th>
                </tr>
              </thead>
              <tbody>
                {pagamentos.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="border p-2">{p.cliente}</td>
                    <td className="border p-2">{p.entregador}</td>
                    <td className="border p-2 text-right">
                      {formatEUR(p.valor)}
                    </td>
                    <td className="border p-2 capitalize">{p.forma || "—"}</td>
                    <td className="border p-2">
                      {p.data
                        ? new Date(p.data).toLocaleDateString("pt-PT")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap gap-6">
            <p className="font-medium">
              Total Recebido: {formatEUR(totalRecebido)}
            </p>
            <p className="font-medium">Clientes Pagantes: {clientesPagantes}</p>
          </div>
        </>
      )}
    </div>
  );
}
