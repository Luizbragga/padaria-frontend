import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { http } from "../services/http";
import { getToken, getRole, isTokenExpirado, setToken } from "../utils/auth";

export default function ProtectedRoute({
  children,
  rolesPermitidos = [],
  fallback = null,
  redirectTo = "/",
}) {
  const [ready, setReady] = useState(false);
  const [allow, setAllow] = useState(false);
  const triedRefresh = useRef(false);

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

      // injeta SEMPRE o token atual (AQUI é token, não data.token)
      http.defaults.headers.common.Authorization = `Bearer ${token}`;

      // 1) Se NÃO expirou → autoriza já
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
        try {
          // tenta renovar sem enviar refreshToken; cookie httpOnly será usado
          const { data } = await http.post("token/refresh");

          if (!alive) return;

          setToken(data.token);
          http.defaults.headers.common.Authorization = `Bearer ${data.token}`;

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

          const status = err?.response?.status;
          if (status === 401 || status === 403) {
            setAllow(false);
            setReady(true);
            return;
          }

          // Erro de rede/CORS/5xx: não travar navegação
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
  }, [rolesPermitidos]);

  if (!ready) return fallback;
  if (!allow) return <Navigate to={redirectTo} replace />;
  return children;
}
