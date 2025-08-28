// src/components/EntregasPorDiaChart.jsx
import React, { useEffect, useMemo, useState } from "react";
import { getUsuario } from "../utils/auth";
import { buscarEntregasPorDia } from "../services/analiticoService";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

const DIAS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
// Mongo $dayOfWeek => 1..7 (Dom=1), JS => 0..6 (Dom=0)
function labelDia(v) {
  if (v == null) return "";
  const s = String(v);
  // número 1..7 (Mongo)
  if (/^[1-7]$/.test(s)) return DIAS_PT[Number(s) - 1];
  // número 0..6 (JS)
  if (/^[0-6]$/.test(s)) return DIAS_PT[Number(s)];
  // ISO date
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    if (!isNaN(d)) return DIAS_PT[d.getDay()];
  }
  // nome já vem do backend (ex: "Seg")
  return s;
}

function ordemSemana(v) {
  // Retorna 0..6 para ordenar de Dom..Sáb
  if (v == null) return 7;
  const s = String(v);
  if (/^[1-7]$/.test(s)) return Number(s) - 1; // 1..7 -> 0..6
  if (/^[0-6]$/.test(s)) return Number(s); // 0..6
  const idx = DIAS_PT.findIndex(
    (d) => d.toLowerCase() === s.toLowerCase().slice(0, 3)
  );
  if (idx >= 0) return idx;
  // tentativa com data
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    if (!isNaN(d)) return d.getDay();
  }
  return 7; // põe no fim se não reconhecido
}

export default function EntregasPorDiaChart({ padariaId }) {
  const [dados, setDados] = useState([]);
  const [erro, setErro] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [temaEscuro, setTemaEscuro] = useState(false);
  const usuario = getUsuario();

  // Não renderiza para entregador (gráfico é visão gerencial)
  const ehEntregador = usuario?.role === "entregador";

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;
    const update = (e) => setTemaEscuro(e.matches);
    setTemaEscuro(mq.matches);
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  useEffect(() => {
    if (!padariaId || ehEntregador) {
      setDados([]);
      setCarregando(false);
      return;
    }
    let alive = true;
    (async () => {
      setCarregando(true);
      setErro(null);
      try {
        const bruto = await buscarEntregasPorDia(padariaId);
        if (!alive) return;

        // Aceita [{ _id, total }] com _id variando de formato
        const normalizado = Array.isArray(bruto)
          ? bruto
              .map((r) => ({
                _id: r?._id,
                total: Number(r?.total) || 0,
              }))
              .sort((a, b) => ordemSemana(a._id) - ordemSemana(b._id))
              .map((r) => ({ ...r, label: labelDia(r._id) }))
          : [];

        setDados(normalizado);
      } catch (e) {
        if (!alive) return;
        console.error("Erro ao buscar entregas por dia:", e);
        setErro("Erro ao carregar dados. Tente novamente.");
        setDados([]);
      } finally {
        if (alive) setCarregando(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [padariaId, ehEntregador]);

  if (ehEntregador) return null;

  if (carregando) return <p>Carregando gráfico...</p>;
  if (erro) return <p className="text-red-600 font-semibold">{erro}</p>;
  if (!dados.length)
    return (
      <p className="text-gray-500">Nenhum dado encontrado para este período.</p>
    );

  return (
    <div
      className={`p-4 rounded-2xl shadow-md mb-4 ${
        temaEscuro ? "bg-gray-800" : "bg-white"
      }`}
    >
      <h3
        className={`text-lg font-bold mb-2 ${
          temaEscuro ? "text-white" : "text-gray-800"
        }`}
      >
        Entregas por dia da semana
      </h3>

      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={dados}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar
            dataKey="total"
            fill={temaEscuro ? "#60a5fa" : "#4f46e5"}
            name="Total"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
