import { Navigate } from "react-router-dom";
import {
  getToken,
  getRole,
  isTokenExpirado,
  getRefreshToken,
  setToken,
} from "../utils/auth";
import axios from "axios";

export default function ProtectedRoute({ children, rolesPermitidos = [] }) {
  const token = getToken();

  // Se não houver token, vai pro login
  if (!token) {
    console.warn("🔒 Token ausente. Redirecionando para login...");
    localStorage.clear();
    return <Navigate to="/" replace />;
  }

  // Se o token estiver expirado, tenta renovar
  if (isTokenExpirado()) {
    console.warn("⏳ Token expirado. Tentando renovar...");

    const refreshToken = getRefreshToken();

    if (!refreshToken) {
      console.error("❌ Nenhum refresh token disponível.");
      localStorage.clear();
      return <Navigate to="/" replace />;
    }

    // Faz a chamada de refresh token
    axios
      .post("http://localhost:3000/token/refresh", { refreshToken })
      .then((res) => {
        console.log("✅ Token renovado com sucesso");
        setToken(res.data.token); // Atualiza no localStorage
      })
      .catch((err) => {
        console.error("❌ Erro ao renovar token:", err);
        localStorage.clear();
        window.location.href = "/"; // Redireciona para login
      });
  }

  // Checa a role do usuário
  const role = getRole();
  if (rolesPermitidos.length > 0 && !rolesPermitidos.includes(role)) {
    console.warn("🚫 Acesso negado: role não permitida:", role);
    return <Navigate to="/" replace />;
  }

  return children;
}
