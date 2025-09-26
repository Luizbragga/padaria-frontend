// vite.config.js
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backend = env.VITE_API_URL || "http://localhost:4001";

  return {
    plugins: [react()],
    server: {
      port: 5173,
      allowedHosts: true,
      hmr: { clientPort: 443 },

      proxy: {
        "/login": { target: backend, changeOrigin: true },
        "/token": { target: backend, changeOrigin: true },
        "/usuarios": { target: backend, changeOrigin: true },
        "/padarias": { target: backend, changeOrigin: true },
        "/produtos": { target: backend, changeOrigin: true },
        "/api": { target: backend, changeOrigin: true },
        "/entregas": { target: backend, changeOrigin: true },
        "/entregas-avulsas": { target: backend, changeOrigin: true },
        "/rotas": { target: backend, changeOrigin: true },
        "/rota-entregador": { target: backend, changeOrigin: true },
        "/analitico": { target: backend, changeOrigin: true },

        // OSRM público (project-osrm)
        "/osrm": {
          target: "https://router.project-osrm.org",
          changeOrigin: true,
          secure: false,
          proxyTimeout: 20000,
          timeout: 20000,
          rewrite: (p) => p.replace(/^\/osrm/, ""),
          configure: (proxy) => {
            proxy.on("proxyRes", (proxyRes) => {
              proxyRes.headers["access-control-allow-origin"] = "*";
            });
            proxy.on("error", (err) => {
              console.error("[OSRM proxy] erro:", err?.message || err);
            });
          },
        },

        // OSRM alternativo estável (openstreetmap.de)
        "/osrmde": {
          target: "https://routing.openstreetmap.de/routed-car",
          changeOrigin: true,
          secure: false,
          proxyTimeout: 20000,
          timeout: 20000,
          rewrite: (p) => p.replace(/^\/osrmde/, ""),
          configure: (proxy) => {
            proxy.on("proxyRes", (proxyRes) => {
              proxyRes.headers["access-control-allow-origin"] = "*";
            });
          },
        },
      },
    },

    preview: { allowedHosts: true },
  };
});
