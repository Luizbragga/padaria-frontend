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
import AReceberPainel from "../components/AReceberPainel";

// 👇 página simples de caixa para o atendente
import CaixaAtendente from "./CaixaAtendente";

import { getUsuario } from "../utils/auth";

export default function Painel() {
  const location = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams(location.search);
  const padariaQueryId = query.get("padaria") || null;

  const [padariaId, setPadariaId] = useState(null);
  const [role, setRole] = useState(null);
  const [tokenProcessado, setTokenProcessado] = useState(false);
  const usuario = getUsuario();

  const cargo = role
    ? role.charAt(0).toUpperCase() + role.slice(1) // "gerente" -> "Gerente"
    : "—";

  const dataFormatada = new Date().toLocaleDateString("pt-PT", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  // 1) Processa usuário e decide padaria
  useEffect(() => {
    const usuario = getUsuario();
    if (!usuario) {
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
      // gerente / atendente / entregador: sempre a padaria do usuário
      setPadariaId(usuario.padaria || null);
    }

    setTokenProcessado(true);
  }, [padariaQueryId, navigate]);

  // 2) Enquanto processa token, não renderiza
  if (!tokenProcessado) return null;

  // 3) Admin sem padaria selecionada: mostra lista
  if (role === "admin" && !padariaId) {
    const handleSelecionarPadaria = (id) => {
      setPadariaId(id);
      navigate(`?padaria=${id}`, { replace: true });
    };
    return <ListaPadarias onSelect={handleSelecionarPadaria} />;
  }

  // 4) Se ainda não temos padariaId, não renderiza
  if (!padariaId) return null;

  // 5) Entregador usa painel dedicado
  if (role === "entregador") {
    return <PainelEntregador />;
  }

  // 5.1) Atendente usa a tela de Caixa (registrar pagamento)
  if (role === "atendente") {
    return <CaixaAtendente padariaId={padariaId} />;
  }

  // 6) Painel do gerente/admin
  return (
    <div className="min-h-screen bg-gray-100 text-gray-800">
      <header className="bg-white shadow p-4 sticky top-0 z-[1200]">
        <h1 className="text-2xl font-bold">Painel da Padaria</h1>

        <p className="text-sm text-gray-500">
          {cargo} • <span className="font-medium">{usuario?.nome || "—"}</span>{" "}
          • {dataFormatada}
        </p>

        {/* opcional: manter o ID da padaria bem discreto */}
        {padariaId && (
          <p className="text-xs text-gray-400 mt-1">
            ID da padaria: {padariaId}
          </p>
        )}
      </header>

      <main className="p-6 max-w-4xl mx-auto">
        {/* A Receber (mês + avulsas + drill-down) */}
        <AReceberPainel padariaId={padariaId} />

        {/* Faturamento Mensal (apenas gráfico + botão) */}
        <FaturamentoMensal padariaId={padariaId} />

        {/* Pagamentos: bloco único com filtros + cards + listagem */}
        <PagamentosFiltrados padariaId={padariaId} />

        {/* Demais widgets (opcionais) */}
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
