import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backend = env.VITE_API_URL || "http://localhost:3000";

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        // mapeie aqui todos os endpoints do backend usados no frontend
        "/token": { target: backend, changeOrigin: true },
        "/rotas": { target: backend, changeOrigin: true },
        "/rota-entregador": { target: backend, changeOrigin: true },
        "/entregas": { target: backend, changeOrigin: true },
        "/pagamentos": { target: backend, changeOrigin: true },
        "/padarias": { target: backend, changeOrigin: true },
        "/clientes": { target: backend, changeOrigin: true },
        "/analitico": { target: backend, changeOrigin: true }, // já existente
      },
    },
  };
});
