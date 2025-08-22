// src/PainelEntregador.jsx
import { useEffect, useMemo, useState } from "react";
import { getToken, getUsuario } from "../utils/auth";
import axios from "axios";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useNavigate } from "react-router-dom";

// ——— helper: normaliza diferentes formatos do backend em um array
function normalizeEntregas(data) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    if (Array.isArray(data.entregas)) return data.entregas;
    if (Array.isArray(data.itens)) return data.itens;
    if (Array.isArray(data.data)) return data.data;
    if (Array.isArray(data.results)) return data.results;
  }
  return [];
}

// ——— configura ícones do Leaflet (uma vez)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

export default function PainelEntregador() {
  const [entregas, setEntregas] = useState([]); // sempre array
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [mostrarFormulario, setMostrarFormulario] = useState({});
  const [valoresPagamentos, setValoresPagamentos] = useState({});
  const [obsPagamentos, setObsPagamentos] = useState({});
  const usuario = getUsuario();
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000"; // fallback dev

  useEffect(() => {
    let ativo = true;
    async function carregarEntregas() {
      setCarregando(true);
      setErro("");
      try {
        const token = getToken();
        const { data } = await axios.get(`${API_URL}/rota-entregador`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const lista = normalizeEntregas(data);
        if (ativo) setEntregas(lista);
      } catch (err) {
        console.error("Erro ao buscar entregas do entregador:", err);
        if (ativo) {
          setErro(
            err?.response?.data?.erro ||
              err?.message ||
              "Falha ao carregar entregas."
          );
          setEntregas([]); // garante array
        }
      } finally {
        if (ativo) setCarregando(false);
      }
    }
    carregarEntregas();
    return () => {
      ativo = false;
    };
  }, [API_URL]);

  // ——— sempre opere sobre um array
  const base = Array.isArray(entregas) ? entregas : [];

  // ——— contadores seguros
  const hoje = new Date();
  const feitas = base.filter((e) => !!e?.entregue).length;
  const pendentes = base.filter((e) => !e?.entregue).length;
  const atrasadas = base.filter((e) => {
    if (e?.entregue) return false;
    const prevista = e?.horaPrevista ? new Date(e.horaPrevista) : null;
    return prevista instanceof Date && !isNaN(prevista) && prevista < hoje;
  }).length;

  // ——— centro do mapa (usa média dos pontos válidos, senão fallback)
  const mapaCenter = useMemo(() => {
    const coords = base
      .map((e) => e?.location)
      .filter(
        (loc) =>
          loc && typeof loc.lat === "number" && typeof loc.lng === "number"
      );
    if (!coords.length) return [-3.7327, -38.527]; // fallback
    const { latSum, lngSum } = coords.reduce(
      (acc, c) => ({ latSum: acc.latSum + c.lat, lngSum: acc.lngSum + c.lng }),
      { latSum: 0, lngSum: 0 }
    );
    return [latSum / coords.length, lngSum / coords.length];
  }, [base]);

  async function marcarComoEntregue(id) {
    try {
      const token = getToken();
      const { data } = await axios.put(
        `${API_URL}/entregas/${id}/concluir`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Atualiza localmente: marca como entregue
      setEntregas((prev) =>
        (Array.isArray(prev) ? prev : []).map((e) =>
          e._id === id ? { ...e, entregue: true } : e
        )
      );
      console.log("✅ Entrega concluída:", data);
    } catch (err) {
      console.error("❌ ERRO ao concluir entrega:", err);
    }
  }

  async function registrarPagamento(id, valor, observacao) {
    const numero = Number(valor);
    if (!Number.isFinite(numero) || numero < 0) return;

    try {
      const token = getToken();
      await axios.post(
        `${API_URL}/entregas/${id}/registrar-pagamento`,
        {
          valor: numero,
          forma: observacao?.trim() || "dinheiro", // padrão desejado
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log("💰 Pagamento registrado com sucesso");
      // Marca como entregue após registrar pagamento
      setEntregas((prev) =>
        (Array.isArray(prev) ? prev : []).map((e) =>
          e._id === id ? { ...e, entregue: true } : e
        )
      );
    } catch (err) {
      console.error("Erro ao registrar pagamento:", err);
    }
  }

  if (carregando) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-bold mb-4">Painel do Entregador</h2>
        <p>Carregando entregas…</p>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-bold mb-2">Painel do Entregador</h2>
        <p className="text-red-600 mb-4">{erro}</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Painel do Entregador</h2>
      <div className="flex gap-6">
        <p>Total: {base.length}</p>
        <p>Feitas: {feitas}</p>
        <p>Pendentes: {pendentes}</p>
        <p>Atrasadas: {atrasadas}</p>
      </div>

      <MapContainer
        center={mapaCenter}
        zoom={13}
        style={{ height: "400px", width: "100%", marginTop: "2rem" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        {base.map((entrega) => {
          const lat = entrega?.location?.lat;
          const lng = entrega?.location?.lng;
          const pos =
            typeof lat === "number" && typeof lng === "number"
              ? [lat, lng]
              : mapaCenter;

          // produtos podem vir como [{ nome, quantidade }] OU [{ produto: {nome}, quantidade }]
          const produtos = Array.isArray(entrega?.produtos)
            ? entrega.produtos
            : [];

          return (
            <Marker key={entrega?._id || Math.random()} position={pos}>
              <Popup>
                <strong>{entrega?.cliente || "Cliente"}</strong>
                <ul className="mt-1">
                  {produtos.map((p, i) => {
                    const nome =
                      p?.nome ??
                      p?.produto?.nome ??
                      p?.produtoNome ??
                      "produto";
                    const qtd = p?.quantidade ?? 1;
                    return (
                      <li key={i}>
                        {qtd}x {nome}
                      </li>
                    );
                  })}
                </ul>

                <button
                  className="bg-green-600 text-white px-2 py-1 rounded mt-2 w-full"
                  onClick={() => marcarComoEntregue(entrega?._id)}
                >
                  ✅ Entregar
                </button>

                <button
                  className="bg-yellow-400 text-black px-2 py-1 rounded mt-2 w-full"
                  onClick={() =>
                    setMostrarFormulario((prev) => ({
                      ...prev,
                      [entrega?._id]: !prev[entrega?._id],
                    }))
                  }
                >
                  💰 Registrar Pagamento
                </button>

                {mostrarFormulario[entrega?._id] && (
                  <div className="mt-2">
                    <input
                      type="number"
                      min={0}
                      value={valoresPagamentos[entrega?._id] ?? ""}
                      onChange={(e) =>
                        setValoresPagamentos((prev) => ({
                          ...prev,
                          [entrega?._id]: Math.max(0, Number(e.target.value)),
                        }))
                      }
                      placeholder="Valor pago"
                      className="border px-2 py-1 w-full mt-1"
                    />
                    <input
                      type="text"
                      value={obsPagamentos[entrega?._id] ?? ""}
                      onChange={(e) =>
                        setObsPagamentos((prev) => ({
                          ...prev,
                          [entrega?._id]: e.target.value,
                        }))
                      }
                      placeholder="Observações (ex: cartão)"
                      className="border px-2 py-1 w-full mt-1"
                    />
                    <button
                      className="bg-blue-600 text-white px-2 py-1 rounded mt-2 w-full"
                      onClick={() =>
                        registrarPagamento(
                          entrega?._id,
                          valoresPagamentos[entrega?._id],
                          obsPagamentos[entrega?._id]
                        )
                      }
                    >
                      Salvar Pagamento + Concluir
                    </button>
                    <button
                      className="bg-white border rounded px-3 py-1 shadow mt-2 w-full"
                      onClick={() => navigate("/entregador/entregas")}
                    >
                      Ver em tabela
                    </button>
                  </div>
                )}
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
