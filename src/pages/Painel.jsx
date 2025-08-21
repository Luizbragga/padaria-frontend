import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ListaPadarias from "../components/ListaPadarias";
import ResumoEntregas from "../components/ResumoEntregas";
import RankingEntregadores from "../components/RankingEntregadores";
import ResumoFinanceiro from "../components/ResumoFinanceiro";
import FaturamentoMensal from "../components/FaturamentoMensal";
import InadimplenciaChart from "../components/InadimplenciaChart";
import EntregasPorDiaChart from "../components/EntregasPorDiaChart";
import EntregasTempoReal from "../components/EntregasTempoReal";
import MapaEntregadores from "../components/MapaEntregadores";
import NotificacoesRecentes from "../components/NotificacoesRecentes";
import PainelEntregador from "../components/PainelEntregador";
import { getUsuario } from "../utils/auth";
import PagamentosFiltrados from "../components/PagamentosFiltrados";

export default function Painel() {
  const location = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams(location.search);
  const padariaQueryId = query.get("padaria");

  const [padariaId, setPadariaId] = useState(null);
  const [role, setRole] = useState(null);
  const [tokenProcessado, setTokenProcessado] = useState(false);
  const [filtros, setFiltros] = useState({
    dataInicial: "",
    dataFinal: "",
    forma: "",
  });

  const handleChange = (e) => {
    setFiltros({ ...filtros, [e.target.name]: e.target.value });
  };

  useEffect(() => {
    const usuario = getUsuario();
    if (!usuario) return;

    setRole(usuario.role);

    if (usuario.role === "admin") {
      if (padariaQueryId) {
        setPadariaId(padariaQueryId);
      }
    } else {
      setPadariaId(usuario.padaria);
    }

    setTokenProcessado(true);
  }, [padariaQueryId]);

  // Aguarda o token ser processado
  if (!tokenProcessado) return null;

  // Se for admin e ainda não escolheu padaria → mostra lista
  if (role === "admin" && !padariaId) {
    return <ListaPadarias />;
  }

  // Se ainda não temos padariaId, não renderiza nada
  if (!padariaId) return null;

  // Painel principal
  if (role === "entregador") {
    return <PainelEntregador />;
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800">
      <header className="bg-white shadow p-4 sticky top-0 z-10">
        <h1 className="text-2xl font-bold">Painel da Padaria</h1>
        <p className="text-sm text-gray-500">
          Acesso: {role} | ID da padaria: {padariaId}
        </p>
      </header>

      <main className="p-6 max-w-4xl mx-auto">
        <FaturamentoMensal padariaId={padariaId} />
        {/* FORMULÁRIO DE FILTROS */}
        <div className="bg-white p-4 rounded shadow mb-4">
          <h3 className="font-bold mb-2">Filtrar Pagamentos</h3>
          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <label className="block text-sm">Data Inicial</label>
              <input
                type="date"
                name="dataInicial"
                value={filtros.dataInicial}
                onChange={handleChange}
                className="border p-1 rounded"
              />
            </div>

            <div>
              <label className="block text-sm">Data Final</label>
              <input
                type="date"
                name="dataFinal"
                value={filtros.dataFinal}
                onChange={handleChange}
                className="border p-1 rounded"
              />
            </div>

            <div>
              <label className="block text-sm">Forma de Pagamento</label>
              <select
                name="forma"
                value={filtros.forma}
                onChange={handleChange}
                className="border p-1 rounded"
              >
                <option value="">Todas</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="cartão">Cartão</option>
                <option value="mbway">MB Way</option>
              </select>
            </div>
          </div>
        </div>

        {/* COMPONENTE DE PAGAMENTOS */}
        <PagamentosFiltrados
          dataInicial={filtros.dataInicial}
          dataFinal={filtros.dataFinal}
          forma={filtros.forma}
        />

        <ResumoFinanceiro padariaId={padariaId} />
        <ResumoEntregas padariaId={padariaId} />
        <RankingEntregadores padariaId={padariaId} />
        <InadimplenciaChart padariaId={padariaId} />
        <EntregasPorDiaChart padariaId={padariaId} />
        <EntregasTempoReal padariaId={padariaId} />
        <MapaEntregadores padariaId={padariaId} />
        <NotificacoesRecentes padariaId={padariaId} />
      </main>
    </div>
  );
}
