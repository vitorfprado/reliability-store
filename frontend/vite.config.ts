import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    hmr: {
      // Diz ao cliente HMR no navegador para se conectar pela porta do proxy (80)
      // em vez da porta interna do Vite (5173)
      clientPort: 80,
    },
  },
});
