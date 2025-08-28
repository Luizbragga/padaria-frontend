// src/pages/Painel.jsx
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
import PagamentosFiltrados from "../components/PagamentosFiltrados";

import { getUsuario } from "../utils/auth";

export default function Painel() {
  const location = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams(location.search);
  const padariaQueryId = query.get("padaria") || null;

  const [padariaId, setPadariaId] = useState(null);
  const [role, setRole] = useState(null);
  const [tokenProcessado, setTokenProcessado] = useState(false);

  const [filtros, setFiltros] = useState({
    dataInicial: "",
    dataFinal: "",
    // padronize SEM acento para o backend: dinheiro | cartao | mbway
    forma: "",
  });

  const handleChange = (e) => {
    setFiltros((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // 1) Processa usuário e decide padaria
  useEffect(() => {
    const usuario = getUsuario();
    if (!usuario) {
      // se não tiver usuário, volta para a tela de login/raiz
      navigate("/", { replace: true });
      return;
    }

    setRole(usuario.role);

    if (usuario.role === "admin") {
      // admin pode alternar padaria via query string
      if (padariaQueryId) {
        setPadariaId(padariaQueryId);
      } else {
        setPadariaId(null);
      }
    } else {
      // gerente / operador / etc: sempre a padaria do usuário
      setPadariaId(usuario.padaria || null);
    }

    setTokenProcessado(true);
  }, [padariaQueryId, navigate]);

  // 2) Enquanto processa token, não renderiza (evita flicker)
  if (!tokenProcessado) return null;

  // 3) Admin sem padaria selecionada: mostra lista (com callback opcional)
  if (role === "admin" && !padariaId) {
    const handleSelecionarPadaria = (id) => {
      // Atualiza estado e URL (?padaria=...)
      setPadariaId(id);
      navigate(`?padaria=${id}`, { replace: true });
    };

    // Se seu ListaPadarias ainda não aceita esse onSelect, ele é opcional.
    return <ListaPadarias onSelect={handleSelecionarPadaria} />;
  }

  // 4) Se ainda não temos padariaId (por qualquer motivo), não renderiza
  if (!padariaId) return null;

  // 5) Entregador usa o painel dedicado
  if (role === "entregador") {
    return <PainelEntregador />;
  }

  // 6) Painel do gerente/admin/operador
  const FORMAS = [
    { value: "", label: "Todas" },
    { value: "dinheiro", label: "Dinheiro" },
    { value: "cartao", label: "Cartão" },
    { value: "mbway", label: "MB Way" },
  ];

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800">
      <header className="bg-white shadow p-4 sticky top-0 z-10">
        <h1 className="text-2xl font-bold">Painel da Padaria</h1>
        <p className="text-sm text-gray-500">
          Acesso: {role} | ID da padaria: {padariaId}
        </p>
      </header>

      <main className="p-6 max-w-4xl mx-auto">
        {/* Faturamento Mensal (geral da padaria) */}
        <FaturamentoMensal padariaId={padariaId} />

        {/* FILTROS DE PAGAMENTOS */}
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
                {FORMAS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* LISTAGEM DE PAGAMENTOS (agora com padariaId) */}
        <PagamentosFiltrados
          padariaId={padariaId}
          dataInicial={filtros.dataInicial}
          dataFinal={filtros.dataFinal}
          forma={filtros.forma}
        />

        {/* Demais widgets */}
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
