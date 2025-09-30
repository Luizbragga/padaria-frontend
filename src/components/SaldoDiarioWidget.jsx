import { useEffect, useMemo, useRef, useState } from "react";
import { sd_getSaldo } from "../services/saldoDiarioService";
import SaldoDiarioModal from "./SaldoDiarioModal";

const fmtEUR = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
});

function todayISO() {
  const d = new Date();
  // corrige o fuso para produzir YYYY-MM-DD local
  const tz = d.getTimezoneOffset();
  const local = new Date(d.getTime() - tz * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

export default function SaldoDiarioWidget({ padariaId }) {
  const [open, setOpen] = useState(false);
  const [dataISO, setDataISO] = useState(todayISO());
  const [g, setG] = useState(0);
  const [f, setF] = useState(0);
  const [l, setL] = useState(0);
  const [carregando, setCarregando] = useState(false);

  const vivo = useRef(true);

  async function carregar() {
    if (!padariaId) return;
    setCarregando(true);
    try {
      const resp = await sd_getSaldo({ dataISO, padariaId });
      if (!vivo.current) return;
      setG(Number(resp?.gastos || 0));
      setF(Number(resp?.faturamento || 0));
      setL(Number(resp?.lucro || 0));
    } catch {
      if (!vivo.current) return;
      setG(0);
      setF(0);
      setL(0);
    } finally {
      if (vivo.current) setCarregando(false);
    }
  }
  useEffect(() => {
    const onChanged = (e) => {
      if (e.detail?.padariaId === padariaId && e.detail?.dataISO === dataISO) {
        carregar(); // recarrega os valores exibidos
      }
    };
    window.addEventListener("saldo:changed", onChanged);
    return () => window.removeEventListener("saldo:changed", onChanged);
  }, [padariaId, dataISO]);

  useEffect(() => {
    vivo.current = true;
    carregar();
    return () => {
      vivo.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [padariaId, dataISO]);

  const pills = useMemo(
    () => [
      {
        key: "gastos",
        label: "Gastos",
        value: fmtEUR.format(g),
        text: "text-red-600",
        bg: "bg-red-50",
        border: "border-red-300",
      },
      {
        key: "faturamento",
        label: "Faturamento",
        value: fmtEUR.format(f),
        text: "text-amber-600",
        bg: "bg-amber-50",
        border: "border-amber-300",
      },
      {
        key: "lucro",
        label: "Lucro",
        value: fmtEUR.format(l),
        text: "text-green-600",
        bg: "bg-green-50",
        border: "border-green-300",
      },
    ],
    [g, f, l]
  );

  return (
    <>
      <div className="flex items-end gap-6">
        {/* título do bloco, maior */}
        <div className="hidden sm:block text-base font-semibold text-white/95">
          Saldo diário
        </div>

        {/* Dia */}
        <div className="flex flex-col">
          <span className="text-sm leading-none mb-1 text-white/85">Dia</span>
          <input
            type="date"
            className="border border-white/30 rounded-lg px-3 py-2 text-base bg-white text-gray-900 shadow-sm"
            value={dataISO}
            onChange={(e) => setDataISO(e.target.value)}
            title="Dia"
          />
        </div>

        {/* Métricas ampliadas */}
        <div className="flex items-end gap-4">
          {pills.map((p) => (
            <div key={p.key} className="flex flex-col">
              <span className="text-sm leading-none mb-1 text-white/85">
                {p.label}
              </span>
              <div
                className={`px-3 py-2 rounded-lg border-2 ${p.border} ${p.bg} text-base font-bold ${p.text} shadow-sm`}
                title={p.label}
              >
                {p.value}
              </div>
            </div>
          ))}
        </div>

        {/* Botão maior */}
        <div className="flex flex-col">
          <span className="text-sm leading-none mb-1 text-transparent select-none">
            .
          </span>
          <button
            onClick={() => setOpen(true)}
            className="px-4 py-2 text-base rounded-lg border bg-white text-gray-900 hover:bg-gray-50 shadow-sm"
            disabled={carregando}
            title="Verificar / Registrar informações"
          >
            {carregando ? "…" : "Verificar / Registrar"}
          </button>
        </div>
      </div>

      <SaldoDiarioModal
        open={open}
        onClose={() => {
          setOpen(false);
          setTimeout(() => carregar(), 200);
        }}
        padariaId={padariaId}
        dataISO={dataISO} // ✅ passa o dia atual
        onChangeDataISO={setDataISO} // ✅ mantém widget e modal sincronizados
      />
    </>
  );
}
