import { useEffect, useMemo, useState } from "react";
import { get } from "../services/http"; // usa http.js que já injeta base/headers

// horário limite “padrão” para considerar atraso (13:00). Pode virar prop no futuro.
const HORA_LIMITE_ATRASO = 13;

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

export default function EntregasTempoReal({ padariaId }) {
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  // filtros/abas
  const [aba, setAba] = useState("pendentes"); // pendentes|concluidas|atrasadas|todas
  const [filtroRota, setFiltroRota] = useState("");
  const [filtroEntregador, setFiltroEntregador] = useState("");
  const [search, setSearch] = useState("");

  // auto-refresh a cada 25s
  useEffect(() => {
    if (!padariaId) return;
    let alive = true;

    async function carregar() {
      setCarregando(true);
      setErro("");
      try {
        const dados = await get("/analitico/entregas-tempo-real", {
          padaria: padariaId,
        });
        if (!alive) return;
        setItens(Array.isArray(dados) ? dados : []);
      } catch (e) {
        if (!alive) return;
        console.error(e);
        setErro("Não foi possível carregar as entregas agora.");
      } finally {
        if (alive) setCarregando(false);
      }
    }

    carregar();
    const t = setInterval(carregar, 25000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [padariaId]);

  // util: é atrasada?
  const isAtrasada = (entrega) => {
    if (entrega?.entregue) return false;
    const d = new Date(entrega?.createdAt || Date.now());
    return d.getHours() >= HORA_LIMITE_ATRASO; // simples: passou do limite e ainda não entregou
  };

  // coletar rotas e entregadores para selects
  const rotas = useMemo(() => {
    const s = new Set();
    for (const e of itens) {
      const r = (e?.cliente?.rota || "").toString().toUpperCase().trim();
      if (r) s.add(r);
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b, "pt"));
  }, [itens]);

  const entregadores = useMemo(() => {
    const s = new Set();
    for (const e of itens) {
      const nome = (e?.entregador?.nome || "").trim();
      if (nome) s.add(nome);
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b, "pt"));
  }, [itens]);

  // contadores por status
  const counts = useMemo(() => {
    let pend = 0,
      concl = 0,
      atras = 0,
      total = itens.length;
    for (const e of itens) {
      if (e.entregue) concl++;
      else {
        pend++;
        if (isAtrasada(e)) atras++;
      }
    }
    return { pend, concl, atras, total };
  }, [itens]);

  // aplica filtros/abas
  const listaFiltrada = useMemo(() => {
    const txt = search.trim().toLowerCase();
    return itens.filter((e) => {
      // aba
      if (aba === "pendentes" && e.entregue) return false;
      if (aba === "concluidas" && !e.entregue) return false;
      if (aba === "atrasadas" && !isAtrasada(e)) return false;
      // rota
      if (filtroRota) {
        const r = (e?.cliente?.rota || "").toString().toUpperCase().trim();
        if (r !== filtroRota) return false;
      }
      // entregador
      if (filtroEntregador) {
        const n = (e?.entregador?.nome || "").trim();
        if (n !== filtroEntregador) return false;
      }
      // busca por cliente
      if (txt) {
        const nomeCliente = (e?.cliente?.nome || "").toLowerCase();
        if (!nomeCliente.includes(txt)) return false;
      }
      return true;
    });
  }, [itens, aba, filtroRota, filtroEntregador, search]);

  return (
    <section className="mt-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="i-lucide-rocket mr-1" />
        <h3 className="text-lg font-semibold">Entregas em Tempo Real</h3>
      </div>

      {/* Abas + contadores */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {[
          { key: "pendentes", label: "Pendentes", badge: counts.pend },
          { key: "concluidas", label: "Concluídas", badge: counts.concl },
          { key: "atrasadas", label: "Atrasadas", badge: counts.atras },
          { key: "todas", label: "Todas", badge: counts.total },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setAba(t.key)}
            className={classNames(
              "px-3 py-1.5 rounded-full border text-sm",
              aba === t.key
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-800 hover:bg-gray-50"
            )}
          >
            {t.label}
            <span
              className={classNames(
                "ml-2 inline-flex items-center justify-center px-2 py-[1px] rounded-full text-[11px]",
                aba === t.key ? "bg-white/20" : "bg-gray-200"
              )}
            >
              {t.badge}
            </span>
          </button>
        ))}

        <div className="ml-auto flex gap-2">
          {/* filtro rota */}
          <select
            className="border rounded px-2 py-1 text-sm"
            value={filtroRota}
            onChange={(e) => setFiltroRota(e.target.value)}
            title="Filtrar por rota"
          >
            <option value="">Todas as rotas</option>
            {rotas.map((r) => (
              <option key={r} value={r}>
                Rota {r}
              </option>
            ))}
          </select>

          {/* filtro entregador */}
          <select
            className="border rounded px-2 py-1 text-sm"
            value={filtroEntregador}
            onChange={(e) => setFiltroEntregador(e.target.value)}
            title="Filtrar por entregador"
          >
            <option value="">Todos os entregadores</option>
            {entregadores.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>

          {/* busca cliente */}
          <input
            className="border rounded px-2 py-1 text-sm"
            placeholder="Buscar cliente…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Lista */}
      <div className="rounded border bg-white">
        {carregando && (
          <div className="p-3 text-sm text-gray-500">Carregando…</div>
        )}
        {erro && <div className="p-3 text-sm text-red-600">{erro}</div>}

        {listaFiltrada.length === 0 && !carregando ? (
          <div className="p-4 text-sm text-gray-500">Nada para mostrar.</div>
        ) : (
          <ul>
            {listaFiltrada.map((e) => {
              const nome = e?.cliente?.nome || "Cliente";
              const rota = (e?.cliente?.rota || "").toString().toUpperCase();
              const entNome = e?.entregador?.nome || "—";
              const status = e.entregue
                ? "Concluída"
                : isAtrasada(e)
                ? "Atrasada"
                : "Em andamento";

              const statusClass = e.entregue
                ? "bg-green-100 text-green-700 border-green-300"
                : isAtrasada(e)
                ? "bg-red-100 text-red-700 border-red-300"
                : "bg-amber-100 text-amber-700 border-amber-300";

              return (
                <li
                  key={e._id}
                  className="flex items-center justify-between gap-3 border-b last:border-b-0 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={classNames(
                        "px-2 py-[3px] rounded-full border text-[11px]",
                        statusClass
                      )}
                    >
                      {status}
                    </span>
                    <span className="font-medium text-gray-800">{nome}</span>
                    {rota && (
                      <span className="ml-2 text-xs text-gray-500">
                        • Rota {rota}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    Entregador: <span className="font-medium">{entNome}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
