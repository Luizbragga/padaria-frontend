import { useEffect, useState } from "react";
import { getToken, getUsuario } from "../utils/auth";
import axios from "axios";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useNavigate } from "react-router-dom";

export default function PainelEntregador() {
  const [entregas, setEntregas] = useState([]);
  const [mostrarFormulario, setMostrarFormulario] = useState({});
  const [valoresPagamentos, setValoresPagamentos] = useState({});
  const [obsPagamentos, setObsPagamentos] = useState({});
  const usuario = getUsuario();
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    async function carregarEntregas() {
      try {
        const token = getToken();
        const resposta = await axios.get(`${API_URL}/rota-entregador`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setEntregas(resposta.data);
      } catch (err) {
        console.error("Erro ao buscar entregas do entregador:", err);
      }
    }
    carregarEntregas();
  }, [API_URL]);

  const feitas = entregas.filter((e) => e.entregue).length;
  const pendentes = entregas.filter((e) => !e.entregue).length;
  const atrasadas = entregas.filter((e) => {
    const hoje = new Date();
    const prevista = new Date(e.horaPrevista);
    return !e.entregue && prevista < hoje;
  }).length;

  async function marcarComoEntregue(id) {
    try {
      const token = getToken();
      const resposta = await axios.put(
        `${API_URL}/entregas/${id}/concluir`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log("✅ Entrega concluída:", resposta.data);
      setEntregas((prev) => prev.filter((e) => e._id !== id));
    } catch (err) {
      console.error("❌ ERRO ao concluir entrega:", err);
    }
  }

  async function registrarPagamento(id, valor, observacao) {
    if (valor < 0 || !valor) return;
    try {
      const token = getToken();
      await axios.post(
        `${API_URL}/entregas/${id}/registrar-pagamento`,
        {
          valor: Number(valor),
          forma: observacao || "não informado",
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log("💰 Pagamento registrado com sucesso");
      marcarComoEntregue(id);
    } catch (err) {
      console.error("Erro ao registrar pagamento:", err);
    }
  }

  // Configuração de ícones do Leaflet
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  });

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Painel do Entregador</h2>
      <p>Total de entregas: {entregas.length}</p>
      <p>Feitas: {feitas}</p>
      <p>Pendentes: {pendentes}</p>
      <p>Atrasadas: {atrasadas}</p>

      <MapContainer
        center={[-3.7327, -38.527]}
        zoom={13}
        style={{ height: "400px", width: "100%", marginTop: "2rem" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        {entregas.map((entrega) => (
          <Marker
            key={entrega._id}
            position={[
              entrega.location?.lat || -3.7327,
              entrega.location?.lng || -38.527,
            ]}
          >
            <Popup>
              <strong>{entrega.cliente}</strong>
              <ul>
                {entrega.produtos.map((p, i) => (
                  <li key={i}>
                    {p.quantidade}x {p.nome}
                  </li>
                ))}
              </ul>

              <button
                className="bg-green-500 text-white px-2 py-1 rounded mt-2 w-full"
                onClick={() => marcarComoEntregue(entrega._id)}
              >
                ✅ Entregar
              </button>

              <button
                className="bg-yellow-500 text-black px-2 py-1 rounded mt-2 w-full"
                onClick={() =>
                  setMostrarFormulario((prev) => ({
                    ...prev,
                    [entrega._id]: !prev[entrega._id],
                  }))
                }
              >
                💰 Registrar Pagamento
              </button>

              {mostrarFormulario[entrega._id] && (
                <div className="mt-2">
                  <input
                    type="number"
                    min={0}
                    value={valoresPagamentos[entrega._id] || ""}
                    onChange={(e) =>
                      setValoresPagamentos((prev) => ({
                        ...prev,
                        [entrega._id]: Math.max(0, Number(e.target.value)),
                      }))
                    }
                    placeholder="Valor pago"
                    className="border px-2 py-1 w-full mt-1"
                  />
                  <input
                    type="text"
                    value={obsPagamentos[entrega._id] || ""}
                    onChange={(e) =>
                      setObsPagamentos((prev) => ({
                        ...prev,
                        [entrega._id]: e.target.value,
                      }))
                    }
                    placeholder="Observações (ex: cartão)"
                    className="border px-2 py-1 w-full mt-1"
                  />
                  <button
                    className="bg-blue-600 text-white px-2 py-1 rounded mt-2 w-full"
                    onClick={() =>
                      registrarPagamento(
                        entrega._id,
                        valoresPagamentos[entrega._id],
                        obsPagamentos[entrega._id]
                      )
                    }
                  >
                    Salvar Pagamento + Concluir
                  </button>
                  <button
                    className="bg-white border rounded px-3 py-1 shadow"
                    onClick={() => navigate("/entregador/entregas")}
                  >
                    Ver em tabela
                  </button>
                </div>
              )}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
