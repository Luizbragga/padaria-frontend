// src/pages/Painel.jsx
import { useEffect, useRef, useState } from "react";
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

  const cargo = role ? role.charAt(0).toUpperCase() + role.slice(1) : "—";

  const dataFormatada = new Date().toLocaleDateString("pt-PT", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  // mede a altura do header e expõe como --header-h
  const headerRef = useRef(null);
  useEffect(() => {
    const applyHeaderVar = () => {
      const h = headerRef.current?.offsetHeight ?? 72; // fallback
      document.documentElement.style.setProperty("--header-h", `${h}px`);
    };
    applyHeaderVar();

    const ro = new ResizeObserver(applyHeaderVar);
    if (headerRef.current) ro.observe(headerRef.current);
    window.addEventListener("resize", applyHeaderVar);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", applyHeaderVar);
    };
  }, []);

  // 1) Processa usuário e decide padaria
  useEffect(() => {
    const u = getUsuario();
    if (!u) {
      navigate("/", { replace: true });
      return;
    }

    setRole(u.role);

    if (u.role === "admin") {
      if (padariaQueryId) setPadariaId(padariaQueryId);
      else setPadariaId(null);
    } else {
      setPadariaId(u.padaria || null);
    }

    setTokenProcessado(true);
  }, [padariaQueryId, navigate]);

  if (!tokenProcessado) return null;

  // Admin sem padaria escolhida
  if (role === "admin" && !padariaId) {
    const handleSelecionarPadaria = (id) => {
      setPadariaId(id);
      navigate(`?padaria=${id}`, { replace: true });
    };
    return <ListaPadarias onSelect={handleSelecionarPadaria} />;
  }

  if (!padariaId) return null;

  // Entregador
  if (role === "entregador") return <PainelEntregador />;

  // Atendente
  if (role === "atendente") return <CaixaAtendente padariaId={padariaId} />;

  // Gerente/Admin
  return (
    <div className="min-h-screen bg-gray-100 text-gray-800">
      <header
        ref={headerRef}
        className="bg-white shadow p-4 sticky top-0 z-[1200]"
      >
        <h1 className="text-2xl font-bold">Painel da Padaria</h1>
        <p className="text-sm text-gray-500">
          {cargo} • <span className="font-medium">{usuario?.nome || "—"}</span>{" "}
          • {dataFormatada}
        </p>
        {padariaId && (
          <p className="text-xs text-gray-400 mt-1">
            ID da padaria: {padariaId}
          </p>
        )}
      </header>

      <main className="p-6 max-w-4xl mx-auto">
        <AReceberPainel padariaId={padariaId} />
        <FaturamentoMensal padariaId={padariaId} />
        <PagamentosFiltrados padariaId={padariaId} />
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
