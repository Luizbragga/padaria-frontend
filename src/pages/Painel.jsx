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
import PendenciasAtraso from "../components/PendenciasAtraso";
import { getUsuario } from "../utils/auth";
import SaldoDiarioWidget from "../components/SaldoDiarioWidget";
import RotasEmergenciais from "../components/RotasEmergenciais"; // <— aqui

export default function Painel() {
  const location = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams(location.search);
  const padariaQueryId = query.get("padaria") || null;

  const [padariaId, setPadariaId] = useState(null);
  const [role, setRole] = useState(null);
  const [tokenProcessado, setTokenProcessado] = useState(false);
  const usuario = getUsuario();

  // controla o mês escolhido nos cards/a-receber
  const currentYYYYMM = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };
  const [mesSelecionado, setMesSelecionado] = useState(currentYYYYMM());

  // controla o modal de emergência
  const [emergOpen, setEmergOpen] = useState(false);

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
      const h = headerRef.current?.offsetHeight ?? 72;
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

  // carrega usuário/padaria
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

  // admin sem padaria selecionada
  if (role === "admin" && !padariaId) {
    const handleSelecionarPadaria = (id) => {
      setPadariaId(id);
      navigate(`?padaria=${id}`, { replace: true });
    };
    return <ListaPadarias onSelect={handleSelecionarPadaria} />;
  }

  if (!padariaId) return null;

  // entregador
  if (role === "entregador") return <PainelEntregador />;

  // atendente
  if (role === "atendente") return <CaixaAtendente padariaId={padariaId} />;

  // gerente/admin
  return (
    <div className="min-h-screen bg-gray-100 text-gray-800">
      <header
        ref={headerRef}
        className="sticky top-0 z-[1200] bg-blue-600 text-white shadow"
      >
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          {/* título e subtítulo */}
          <div>
            <h1 className="text-2xl font-bold">Painel da Padaria</h1>
            <p className="text-sm text-blue-100">
              {cargo} •{" "}
              <span className="font-semibold">{usuario?.nome || "—"}</span> •{" "}
              {dataFormatada}
            </p>
            {padariaId && (
              <p className="text-xs text-blue-200 mt-1">
                ID da padaria: {padariaId}
              </p>
            )}
          </div>

          {/* saldo diário + botão emergência */}
          <div className="flex items-center gap-3">
            <SaldoDiarioWidget padariaId={padariaId} />
            {(role === "gerente" || role === "admin") && (
              <button
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2 text-white font-medium shadow"
                onClick={() => setEmergOpen(true)}
                title="Juntar/redistribuir rotas (só hoje)"
              >
                <span className="i-lucide-alert-triangle" />
                Emergência
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="p-6 max-w-4xl mx-auto">
        <AReceberPainel
          padariaId={padariaId}
          mes={mesSelecionado}
          onMesChange={setMesSelecionado}
        />
        <PagamentosFiltrados padariaId={padariaId} />
        <FaturamentoMensal
          padariaId={padariaId}
          mesSelecionado={mesSelecionado}
        />
        <PendenciasAtraso padariaId={padariaId} gracaDia={8} />
        <ResumoFinanceiro padariaId={padariaId} />
        <ResumoEntregas padariaId={padariaId} />
        <RankingEntregadores padariaId={padariaId} />
        <InadimplenciaChart padariaId={padariaId} />
        <EntregasPorDiaChart padariaId={padariaId} />
        <EntregasTempoReal padariaId={padariaId} />
        <MapaEntregadores padariaId={padariaId} />
        <NotificacoesRecentes padariaId={padariaId} />

        {/* REMOVA qualquer linha solta como:
            const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
            {(usuario?.role === "gerente" ... ) && ( <RotasEmergenciais /> )}
         */}
      </main>

      {/* Modal centralizado */}
      {(role === "gerente" || role === "admin") && (
        <RotasEmergenciais
          open={emergOpen}
          onClose={() => setEmergOpen(false)}
          padariaId={padariaId}
        />
      )}
    </div>
  );
}
