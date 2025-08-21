import React, { useEffect, useState } from "react";
import axios from "axios";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Corrigir ícones do Leaflet (necessário para renderização correta)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png",
});

export default function LocalizacaoEntregadores() {
  const [entregadores, setEntregadores] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    const buscarLocalizacoes = async () => {
      try {
        const token = localStorage.getItem("token");
        const resposta = await axios.get(
          "http://localhost:3000/api/analitico/localizacao-entregadores",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setEntregadores(resposta.data);
      } catch (err) {
        console.error("Erro ao buscar localizações:", err);
        setErro("Erro ao carregar localizações dos entregadores.");
      } finally {
        setCarregando(false);
      }
    };

    buscarLocalizacoes();
  }, []);

  if (carregando) return <p>Carregando mapa...</p>;
  if (erro) return <p className="text-red-600">{erro}</p>;
  if (entregadores.length === 0)
    return <p>Nenhuma localização de entregadores disponível.</p>;

  const posicaoInicial =
    entregadores[0]?.localizacaoAtual?.latitude &&
    entregadores[0]?.localizacaoAtual?.longitude
      ? entregadores[0].localizacaoAtual
      : { latitude: 41.545, longitude: -8.4307 }; // exemplo: coordenadas de Barcelos

  return (
    <div className="p-4 bg-white rounded shadow mt-4">
      <h2 className="text-lg font-bold mb-2">
        📍 Localização dos Entregadores
      </h2>
      <MapContainer
        center={[posicaoInicial.latitude, posicaoInicial.longitude]}
        zoom={13}
        style={{ height: "400px", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {entregadores.map((entregador) => (
          <Marker
            key={entregador._id}
            position={[
              entregador.localizacaoAtual.latitude,
              entregador.localizacaoAtual.longitude,
            ]}
          >
            <Popup>{entregador.nome}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
