// src/components/ResumoEntregas.jsx
import { useEffect, useState } from "react";
import { getUsuario, getToken } from "../utils/auth";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

import axios from "axios";
import { API_BASE } from "../services/http";
const buildUrl = (path, params) => {
  const u = new URL(path.replace(/^\/+/, ""), API_BASE);
  if (params)
    Object.entries(params).forEach(
      ([k, v]) => v != null && u.searchParams.set(k, v)
    );
  return u.href;
};

/** Normaliza saída: aceita já-agrupado OU lista crua de entregas */
function normalizaOuAgrega(input) {
  // Se já no formato agregado
  if (
    Array.isArray(input) &&
    input.length > 0 &&
    "data" in input[0] &&
    ("entregues" in input[0] || "naoEntregues" in input[0])
  ) {
    return input.map((d) => ({
      data: d.data,
      entregues: Number(d.entregues) || 0,
      naoEntregues: Number(d.naoEntregues) || 0,
    }));
  }

  // Se vier objeto { data: [...] }
  if (input && typeof input === "object" && Array.isArray(input.data)) {
    return normalizaOuAgrega(input.data);
  }

  // Caso seja lista crua de entregas -> agregação por YYYY-MM-DD
  if (Array.isArray(input)) {
    const map = new Map();
    for (const e of input) {
      const dt =
        (e?.createdAt && new Date(e.createdAt)) ||
        (e?.horaPrevista && new Date(e.horaPrevista)) ||
        (e?.dataEntrega && new Date(e.dataEntrega)) ||
        null;

      if (!dt || isNaN(dt.getTime())) continue;
      const key = dt.toISOString().slice(0, 10); // YYYY-MM-DD

      if (!map.has(key))
        map.set(key, { data: key, entregues: 0, naoEntregues: 0 });
      const row = map.get(key);
      if (e?.entregue) row.entregues += 1;
      else row.naoEntregues += 1;
    }
    return Array.from(map.values()).sort((a, b) => (a.data < b.data ? -1 : 1));
  }

  return [];
}

export default function ResumoEntregas({ padariaId }) {
  const [entregas, setEntregas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const usuario = getUsuario();

  useEffect(() => {
    let alive = true;

    async function buscar() {
      setCarregando(true);
      setErro("");

      try {
        const token = getToken();
        const auth = { headers: { Authorization: `Bearer ${token}` } };

        let resp;

        if (usuario?.role === "entregador") {
          // 1) tenta endpoint analítico do próprio entregador
          try {
            resp = await axios.get(
              buildUrl("analitico/entregas-por-dia", { mine: 1 }),
              auth
            );
          } catch {
            // 2) fallback: pega lista crua e agregamos aqui
            resp = await axios.get(buildUrl("entregas/minhas"), auth);
          }
        } else {
          if (!padariaId) {
            setEntregas([]);
            setCarregando(false);
            return;
          }
          // 1) tenta endpoint analítico da padaria
          try {
            resp = await axios.get(
              buildUrl("analitico/entregas-por-dia", { padaria: padariaId }),
              auth
            );
          } catch {
            // 2) fallback: pega lista crua por padaria (ajuste se seu backend usar outro caminho)
            resp = await axios.get(
              buildUrl("entregas", { padaria: padariaId }),
              auth
            );
          }
        }

        if (!alive) return;

        const dados = resp?.data ?? [];
        const normalizado = normalizaOuAgrega(dados);
        setEntregas(normalizado);
      } catch (err) {
        if (!alive) return;
        console.error("Erro ao buscar entregas:", err);
        setErro("Erro ao carregar resumo de entregas.");
        setEntregas([]);
      } finally {
        if (alive) setCarregando(false);
      }
    }

    buscar();
    return () => {
      alive = false;
    };
  }, [padariaId, usuario?.role]);

  const ehEntregador = usuario?.role === "entregador";

  return (
    <div className="mt-8">
      <h3 className="text-lg font-bold mb-2">📦 Entregas por Dia</h3>

      {carregando ? (
        <p className="text-gray-500">Carregando dados...</p>
      ) : erro ? (
        <p className="text-red-600">{erro}</p>
      ) : entregas.length === 0 ? (
        <p className="text-gray-500">Nenhuma entrega registrada.</p>
      ) : ehEntregador ? (
        <table className="w-full border-collapse mt-3">
          <thead>
            <tr>
              <th style={estiloCabecalho}>Data</th>
              <th style={estiloCabecalho}>Entregues</th>
              <th style={estiloCabecalho}>Não Entregues</th>
            </tr>
          </thead>
          <tbody>
            {entregas.map((dia) => (
              <tr key={dia.data}>
                <td style={estiloCelula}>
                  {new Date(dia.data).toLocaleDateString()}
                </td>
                <td style={estiloCelula}>{dia.entregues}</td>
                <td style={estiloCelula}>{dia.naoEntregues}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div style={{ width: "100%", height: 400 }}>
          <ResponsiveContainer>
            <BarChart
              data={entregas}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="data" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="entregues" fill="#82ca9d" name="Entregues" />
              <Bar dataKey="naoEntregues" fill="#ff6666" name="Não Entregues" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

const estiloCabecalho = {
  borderBottom: "2px solid #ccc",
  padding: "8px",
  textAlign: "left",
};

const estiloCelula = {
  borderBottom: "1px solid #eee",
  padding: "8px",
};
