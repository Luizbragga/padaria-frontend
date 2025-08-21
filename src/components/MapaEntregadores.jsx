import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { getToken } from "../utils/auth";

// Corrige os ícones padrão do Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png",
});

export default function MapaEntregadores() {
  const [entregadores, setEntregadores] = useState([]);
  const [erro, setErro] = useState("");

  useEffect(() => {
    const carregarEntregadores = async () => {
      try {
        const token = getToken();
        const resposta = await fetch(
          "http://localhost:3000/analitico/localizacao-entregadores",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const dados = await resposta.json();
        setEntregadores(dados);
      } catch (err) {
        console.error("Erro ao carregar localização:", err);
        setErro("Erro ao buscar localização dos entregadores.");
      }
    };

    carregarEntregadores();
    const intervalo = setInterval(carregarEntregadores, 10000); // atualiza a cada 10s
    return () => clearInterval(intervalo);
  }, []);

  if (erro) return <p className="text-red-600">{erro}</p>;
  if (entregadores.length === 0)
    return <p>Sem dados de localização de entregadores no momento.</p>;

  const centroMapa =
    entregadores[0]?.localizacaoAtual?.lat &&
    entregadores[0]?.localizacaoAtual?.lng
      ? entregadores[0].localizacaoAtual
      : { lat: 41.545, lng: -8.4307 }; // Exemplo: Barcelos

  return (
    <div className="mt-6 bg-white rounded shadow p-4">
      <h2 className="font-bold text-lg mb-2">
        📍 Localização dos Entregadores
      </h2>
      <MapContainer
        center={[centroMapa.lat, centroMapa.lng]}
        zoom={13}
        style={{ height: "400px", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
        />
        {entregadores.map((ent) =>
          ent.localizacaoAtual ? (
            <Marker
              key={ent._id}
              position={[ent.localizacaoAtual.lat, ent.localizacaoAtual.lng]}
            >
              <Popup>
                <strong>{ent.nome}</strong>
                <br />
                Localização Atual
              </Popup>
            </Marker>
          ) : null
        )}
      </MapContainer>
    </div>
  );
}
