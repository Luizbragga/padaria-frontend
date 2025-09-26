// src/components/ProtectedRoute.jsx
import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import axios from "axios";
import {
  getToken,
  getRole,
  isTokenExpirado,
  getRefreshToken,
  setToken,
} from "../utils/auth";

/**
 * Uso:
 * <ProtectedRoute rolesPermitidos={["admin","gerente"]}>
 *   <MinhaPagina />
 * </ProtectedRoute>
 */
export default function ProtectedRoute({
  children,
  rolesPermitidos = [],
  fallback = null,
  redirectTo = "/",
}) {
  const [ready, setReady] = useState(false);
  const [allow, setAllow] = useState(false);
  const triedRefresh = useRef(false);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

  useEffect(() => {
    let alive = true;

    async function ensureAuth() {
      const token = getToken();

      // 0) Sem token → bloqueia
      if (!token) {
        if (alive) {
          setAllow(false);
          setReady(true);
        }
        return;
      }

      // injeta SEMPRE o token atual nos headers (para futuras chamadas)
      axios.defaults.headers.common.Authorization = `Bearer ${token}`;

      // 1) Se NÃO expirou → autoriza já (não trava rota à toa)
      if (!isTokenExpirado()) {
        const role = getRole();
        if (rolesPermitidos.length > 0 && !rolesPermitidos.includes(role)) {
          if (alive) {
            setAllow(false);
            setReady(true);
          }
          return;
        }
        if (alive) {
          setAllow(true);
          setReady(true);
        }
        return;
      }

      // 2) Expirou → tenta renovar UMA vez
      if (!triedRefresh.current) {
        triedRefresh.current = true;

        const refreshToken = getRefreshToken();
        if (!refreshToken) {
          if (alive) {
            setAllow(false);
            setReady(true);
          }
          return;
        }

        try {
          const { data } = await axios.post(`/token/refresh`, {
            // <= relativo!
            refreshToken,
          });
          if (!alive) return;

          // salva e injeta o novo token
          setToken(data.token);
          axios.defaults.headers.common.Authorization = `Bearer ${data.token}`;

          // checa roles após refresh
          const role = getRole();
          if (rolesPermitidos.length > 0 && !rolesPermitidos.includes(role)) {
            if (alive) {
              setAllow(false);
              setReady(true);
            }
            return;
          }

          if (alive) {
            setAllow(true);
            setReady(true);
          }
          return;
        } catch (err) {
          if (!alive) return;

          // refresh falhou: só redireciona se for ILEGAL (401/403)
          const status = err?.response?.status;
          if (status === 401 || status === 403) {
            setAllow(false);
            setReady(true);
            return;
          }

          // Erro de rede/CORS/timeout/5xx → NÃO derruba a navegação.
          // Mantém allow=true e deixa o 1º request real decidir (interceptor).
          const role = getRole();
          if (rolesPermitidos.length > 0 && !rolesPermitidos.includes(role)) {
            setAllow(false);
            setReady(true);
            return;
          }
          setAllow(true);
          setReady(true);
          return;
        }
      }

      // 3) Já tentamos e não deu → bloqueia
      if (alive) {
        setAllow(false);
        setReady(true);
      }
    }

    ensureAuth();
    return () => {
      alive = false;
    };
  }, [API_URL, rolesPermitidos]);

  if (!ready) return fallback;
  if (!allow) return <Navigate to={redirectTo} replace />;
  return children;
}
