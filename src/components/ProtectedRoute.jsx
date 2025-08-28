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
  // opcional: UI enquanto checa/renova token
  fallback = null,
  // rota de redirecionamento quando não autorizado
  redirectTo = "/",
}) {
  const [ready, setReady] = useState(false);
  const [allow, setAllow] = useState(false);
  const triedRefresh = useRef(false);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

  useEffect(() => {
    let alive = true;

    async function ensureAuth() {
      // 1) precisa ter token
      const token = getToken();
      if (!token) {
        if (alive) {
          setAllow(false);
          setReady(true);
        }
        return;
      }

      // 2) se expirou, tenta renovar 1x
      if (isTokenExpirado()) {
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
            const { data } = await axios.post(`${API_URL}/token/refresh`, {
              refreshToken,
            });
            if (!alive) return;

            // salva e injeta o novo token
            setToken(data.token);
            axios.defaults.headers.common.Authorization = `Bearer ${data.token}`;
          } catch (err) {
            if (!alive) return;
            // refresh falhou → força login
            setAllow(false);
            setReady(true);
            return;
          }
        } else {
          // já tentamos renovar e falhou
          if (alive) {
            setAllow(false);
            setReady(true);
          }
          return;
        }
      }

      // 3) valida papéis (se houver restrição)
      const role = getRole();
      if (rolesPermitidos.length > 0 && !rolesPermitidos.includes(role)) {
        if (alive) {
          setAllow(false);
          setReady(true);
        }
        return;
      }

      // 4) autorizado
      if (alive) {
        setAllow(true);
        setReady(true);
      }
    }

    ensureAuth();
    return () => {
      alive = false;
    };
  }, [API_URL, rolesPermitidos]);

  // aguardando checagem/refresh
  if (!ready) return fallback;

  // não autorizado → redireciona
  if (!allow) return <Navigate to={redirectTo} replace />;

  // autorizado → renderiza filhos
  return children;
}
