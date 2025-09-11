// utils/auth.js

export const getToken = () => localStorage.getItem("token") || null;
export const setToken = (t) => localStorage.setItem("token", t);

export const getRefreshToken = () =>
  localStorage.getItem("refreshToken") || null;
export const setRefreshToken = (rt) => localStorage.setItem("refreshToken", rt);

// Exemplo de verificação simples de expiração a partir do payload do JWT
export const isTokenExpirado = () => {
  const token = getToken();
  if (!token) return true;
  try {
    const [, payloadB64] = token.split(".");
    const payload = JSON.parse(atob(payloadB64));
    if (!payload?.exp) return true;
    const agora = Math.floor(Date.now() / 1000);
    return payload.exp <= agora;
  } catch {
    return true;
  }
};

export const getRole = () => {
  // Se você salva o usuário:
  const raw = localStorage.getItem("usuario");
  if (raw) {
    try {
      const u = JSON.parse(raw);
      return u?.role ? String(u.role).toLowerCase() : null;
    } catch {
      return null;
    }
  }
  // OU decodifique do token, se preferir.
  return null;
};
export const getUsuario = () => {
  try {
    const raw = localStorage.getItem("usuario");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
// --- URL da API (igual ao resto do app)
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// Libera a rota no backend (se houver token válido)
export async function releaseRoute() {
  try {
    const token = localStorage.getItem("token");
    if (!token) return;
    await fetch(`${API_URL}/rotas/release`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      // keepalive ajuda no fechamento da aba
      keepalive: true,
    });
  } catch {
    // silencioso: mesmo se falhar, seguimos com logout
  }
}

// Faz release e limpa credenciais (sem navegar)
export async function logoutAndRelease() {
  await releaseRoute();
  localStorage.clear(); // limpa token, refreshToken, usuario, etc.
}
