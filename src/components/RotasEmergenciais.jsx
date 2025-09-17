// src/components/RotasEmergenciais.jsx
import { useEffect, useMemo, useState } from "react";
import {
  listarRotas, // GET /rotas/nomes?padaria=...
  simularSplit, // POST /rotas-split/simular
  aplicarSplit, // POST /rotas-split/aplicar
} from "../services/rotasSplitService";

export default function RotasEmergenciais({ open, onClose, padariaId }) {
  const [carregando, setCarregando] = useState(false);
  const [rotas, setRotas] = useState([]);

  // campos
  const [rotaFaltou, setRotaFaltou] = useState("");
  const [destA, setDestA] = useState("");
  const [destC, setDestC] = useState(""); // opcional
  const [capA, setCapA] = useState("");
  const [capC, setCapC] = useState("");

  const [resultado, setResultado] = useState(null); // resposta da simulação
  const [aplicando, setAplicando] = useState(false);

  // carrega nomes das rotas ao abrir
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        setCarregando(true);
        const arr = await listarRotas(padariaId); // retorna ["A","B","C",...]
        setRotas(arr || []);
      } finally {
        setCarregando(false);
      }
    })();
  }, [open, padariaId]);

  const rotasDestino = useMemo(
    () => rotas.filter((r) => r !== rotaFaltou),
    [rotas, rotaFaltou]
  );

  const podeSimular =
    rotaFaltou && destA && destA !== rotaFaltou && destA !== destC;

  function limparResultado() {
    setResultado(null);
  }

  async function handleSimular() {
    if (!podeSimular) return;
    try {
      setCarregando(true);
      const payload = {
        rotaAlvo: rotaFaltou,
        paraA: destA || null,
        paraC: destC || null,
        capA: capA ? Number(capA) : undefined,
        capC: capC ? Number(capC) : undefined,
      };
      const res = await simularSplit(payload);
      setResultado(res);
    } finally {
      setCarregando(false);
    }
  }

  async function handleAplicar() {
    if (!podeSimular) return;
    try {
      setAplicando(true);
      const payload = {
        rotaAlvo: rotaFaltou,
        paraA: destA || null,
        paraC: destC || null,
        capA: capA ? Number(capA) : undefined,
        capC: capC ? Number(capC) : undefined,
      };
      await aplicarSplit(payload);
      setResultado({
        ok: true,
        mensagem:
          "Redistribuição aplicada para hoje. Amanhã tudo volta ao padrão.",
      });
    } finally {
      setAplicando(false);
    }
  }

  function trocarAC() {
    const a = destA;
    setDestA(destC);
    setDestC(a);
    limparResultado();
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[2000] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-white rounded-2xl shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="space-y-0.5">
            <h3 className="text-lg font-semibold">
              Juntar/redistribuir rotas{" "}
              <span className="text-gray-500">(somente HOJE)</span>
            </h3>
            <p className="text-xs text-gray-500">
              Use quando uma rota faltar; as entregas de hoje são divididas
              entre as demais.
            </p>
          </div>
          <button
            className="p-2 rounded-lg hover:bg-gray-100"
            onClick={onClose}
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {/* Corpo */}
        <div className="px-5 pt-4 pb-5">
          {/* passo 1 + 2 */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Rota que faltou
              </label>
              <select
                className="w-full rounded-lg border px-3 py-2"
                value={rotaFaltou}
                onChange={(e) => {
                  setRotaFaltou(e.target.value);
                  limparResultado();
                }}
              >
                <option value="">— selecione —</option>
                {rotas.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Enviar para (A)
              </label>
              <select
                className="w-full rounded-lg border px-3 py-2"
                value={destA}
                onChange={(e) => {
                  setDestA(e.target.value);
                  limparResultado();
                }}
                disabled={!rotaFaltou}
              >
                <option value="">— selecione —</option>
                {rotasDestino.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Enviar para (C){" "}
                  <span className="text-gray-400">(opcional)</span>
                </label>
                <select
                  className="w-[280px] max-w-full rounded-lg border px-3 py-2"
                  value={destC}
                  onChange={(e) => {
                    setDestC(e.target.value);
                    limparResultado();
                  }}
                  disabled={!rotaFaltou}
                >
                  <option value="">
                    — deixe vazio para juntar tudo na rota A —
                  </option>
                  {rotasDestino
                    .filter((r) => r !== destA)
                    .map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                </select>
              </div>

              <button
                type="button"
                onClick={trocarAC}
                className="text-blue-600 hover:text-blue-800 text-sm"
                disabled={!destA && !destC}
                title="Trocar A ⇄ C"
              >
                Trocar A ⇄ C
              </button>
            </div>
          </div>

          {/* passo 3: capacidades (opcional) */}
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Cap. A <span className="text-gray-400">(opcional)</span>
              </label>
              <input
                type="number"
                placeholder="Ex.: 120"
                className="w-full rounded-lg border px-3 py-2"
                value={capA}
                onChange={(e) => {
                  setCapA(e.target.value);
                  limparResultado();
                }}
                min={0}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Cap. C <span className="text-gray-400">(opcional)</span>
              </label>
              <input
                type="number"
                placeholder="Ex.: 120"
                className="w-full rounded-lg border px-3 py-2"
                value={capC}
                onChange={(e) => {
                  setCapC(e.target.value);
                  limparResultado();
                }}
                min={0}
              />
            </div>
          </div>

          <p className="text-xs text-gray-500 mt-3">
            Válido <strong>apenas para hoje</strong>. Amanhã volta ao normal.
          </p>

          {/* passo 4: ações */}
          <div className="flex items-center gap-3 mt-5">
            <button
              className="rounded-lg bg-gray-100 hover:bg-gray-200 px-4 py-2 text-sm font-medium"
              onClick={handleSimular}
              disabled={!podeSimular || carregando}
            >
              {carregando ? "Simulando..." : "Simular"}
            </button>
            <button
              className="rounded-lg bg-red-600 hover:bg-red-700 px-4 py-2 text-sm font-medium text-white"
              onClick={handleAplicar}
              disabled={!podeSimular || aplicando}
              title="Aplica a divisão imediatamente para as entregas de HOJE"
            >
              {aplicando ? "Aplicando..." : "Aplicar divisão"}
            </button>
          </div>

          {/* resultado da simulação/aplicação */}
          {resultado && (
            <div className="mt-4 rounded-lg border bg-gray-50 p-3 text-sm">
              <pre className="whitespace-pre-wrap break-words">
                {typeof resultado === "string"
                  ? resultado
                  : JSON.stringify(resultado, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
