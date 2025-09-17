// src/components/AReceberPainel.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import {
  buscarAReceber,
  listarAvulsasDoMes,
} from "../services/analiticoService";
import AvulsasModal from "./AvulsasModal";
import ClientesListaModal from "./ClientesListaModal";
import AReceberClienteModal from "./AReceberClienteModal";

const fmtEUR = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
});

function yyyymm(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function AReceberPainel({
  padariaId,
  mes: mesProp,
  onMesChange,
}) {
  // controla localmente, mas sincroniza com o prop (se vier)
  const [mes, setMes] = useState(mesProp || yyyymm());
  useEffect(() => {
    if (mesProp && mesProp !== mes) setMes(mesProp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesProp]);

  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  // Avulsas
  const [abrirAvulsas, setAbrirAvulsas] = useState(false);
  const [avulsas, setAvulsas] = useState([]);

  // Lista de clientes (modal)
  const [abrirListaClientes, setAbrirListaClientes] = useState(false);

  // Detalhe do cliente
  const [modalOpen, setModalOpen] = useState(false);
  const [selCliente, setSelCliente] = useState({ id: null, nome: "" });

  const vivo = useRef(true);

  async function carregar() {
    if (!padariaId) return;
    setCarregando(true);
    setErro("");
    try {
      const resp = await buscarAReceber(padariaId, mes);
      if (!vivo.current) return;
      setDados(resp);
    } catch (e) {
      if (!vivo.current) return;
      console.error(e);
      setErro("Erro ao carregar A Receber.");
      setDados(null);
    } finally {
      if (vivo.current) setCarregando(false);
    }
  }

  async function abrirModalAvulsas() {
    try {
      const resp = await listarAvulsasDoMes(padariaId, mes);
      // compatível com { avulsas: [...] } ou { itens: [...] }
      setAvulsas(resp?.avulsas || resp?.itens || []);
      setAbrirAvulsas(true);
    } catch (e) {
      console.error(e);
      setAvulsas([]);
      setAbrirAvulsas(true);
    }
  }

  useEffect(() => {
    vivo.current = true;
    carregar();
    return () => {
      vivo.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [padariaId, mes]);

  const clientes = useMemo(
    () => (Array.isArray(dados?.clientes) ? dados.clientes : []),
    [dados]
  );
  const totalClientes = clientes.length;

  // ==== Totais exibidos nos cards (sem atrasados no previsto) ====
  const previstoMesCard = Number(
    dados?.previstoMesAtual ?? dados?.previstoMes ?? 0
  );
  const pagoMes = Number(dados?.pagoMes ?? 0);
  const pendenteMesAtual = Number(dados?.pendenteAtual ?? 0);
  const pendenciaAnterior = Number(dados?.pendenciaAnterior ?? 0);

  return (
    <div className="bg-white shadow rounded p-6 mt-6">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h3 className="text-xl font-bold">💼 A Receber (mês)</h3>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={mes}
            onChange={(e) => {
              const v = e.target.value;
              setMes(v);
              onMesChange?.(v);
            }}
            className="border rounded px-2 py-1"
          />
          <button
            className="text-sm px-3 py-1 rounded border"
            onClick={carregar}
            disabled={carregando}
          >
            {carregando ? "Atualizando…" : "Atualizar"}
          </button>
          <button
            className="text-sm px-3 py-1 rounded border"
            onClick={abrirModalAvulsas}
            disabled={carregando}
            title="Ver entregas avulsas do mês"
          >
            Avulsas do mês
          </button>
          <button
            className="text-sm px-3 py-1 rounded border"
            onClick={() => setAbrirListaClientes(true)}
            disabled={carregando}
            title="Ver lista de clientes"
          >
            Clientes ({totalClientes})
          </button>
        </div>
      </div>

      {!padariaId ? (
        <p className="text-gray-500">Selecione uma padaria.</p>
      ) : carregando ? (
        <p className="text-gray-500">Carregando…</p>
      ) : erro ? (
        <p className="text-red-600">{erro}</p>
      ) : !dados ? (
        <p className="text-gray-500">Sem dados.</p>
      ) : (
        <>
          {/* Cards de totais */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="bg-gray-50 rounded-lg p-4 border-[3px] border-blue-600">
              <div className="text-sm text-gray-500">Previsto no mês</div>
              <div className="text-xl font-semibold">
                {fmtEUR.format(previstoMesCard)}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 border-[3px] border-blue-600">
              <div className="text-sm text-gray-500">
                Pago no mês (incl. avulsas)
              </div>
              <div className="text-xl font-semibold">
                {fmtEUR.format(pagoMes)}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 border-[3px] border-blue-600">
              <div className="text-sm text-gray-500">Pendente (mês atual)</div>
              <div className="text-xl font-semibold">
                {fmtEUR.format(pendenteMesAtual)}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 border-[3px] border-blue-600">
              <div className="text-sm text-gray-500">Pendência anterior</div>
              <div className="text-xl font-semibold">
                {fmtEUR.format(pendenciaAnterior)}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modais */}
      <AvulsasModal
        aberto={abrirAvulsas}
        onClose={() => setAbrirAvulsas(false)}
        itens={avulsas}
      />

      <ClientesListaModal
        aberto={abrirListaClientes}
        onClose={() => setAbrirListaClientes(false)}
        clientes={clientes}
        onSelectCliente={(c) => {
          setSelCliente({ id: c.cliente, nome: c.nome || c.cliente });
          setModalOpen(true);
        }}
      />

      <AReceberClienteModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        padariaId={padariaId}
        clienteId={selCliente.id}
        clienteNome={selCliente.nome}
        mes={mes}
      />
    </div>
  );
}
