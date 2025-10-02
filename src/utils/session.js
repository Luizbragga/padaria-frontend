// src/utils/session.js
import { setToken } from "./auth";

/**
 * Limpa tokens e dados locais, limpa caches e (opcionalmente) redireciona para /login.
 * Não altera contratos do backend. Pode ser usada em qualquer fluxo de logout.
 */
export async function signOut({ redirect = true } = {}) {
  try {
    // zera token persistido conforme util atual
    try {
      setToken("");
    } catch {}

    // limpa storages locais (mantém segurança se houver dados residuais)
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("usuario");
      localStorage.removeItem("padaria");
      // se você usa outras chaves novas no futuro, adicione aqui
    } catch {}

    try {
      sessionStorage.clear();
    } catch {}

    // limpa caches do Service Worker (se houver)
    try {
      if (typeof caches !== "undefined" && caches.keys) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {
      /* silencioso em navegadores sem SW */
    }

    // aborta eventuais requisições fetch pendentes (opcional; só se você gerencia AbortControllers globais)
    // Ex.: window.__globalAbortController?.abort?.();

    // redireciona para login (rota padrão), sem quebrar SPA
    if (redirect && typeof window !== "undefined" && window.location) {
      const target = "/login";
      if (window.location.pathname !== target) {
        window.location.replace(target);
      }
    }
  } catch {
    // garantir que não explode UI em casos raros
  }
}

/**
 * Apenas limpeza (sem redirect). Útil em fluxos onde a rota atual decide navegar.
 */
export async function clearSession() {
  return signOut({ redirect: false });
}
