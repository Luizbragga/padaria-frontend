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
      return u?.role || null;
    } catch {
      return null;
    }
  }
  // OU decodifique do token, se preferir.
  return null;
};
