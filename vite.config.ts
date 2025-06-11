import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    fs: {
      allow: [
        // Tu proyecto actual
        'C:/Users/JesiU/OneDrive/Documents/Tesis-Yavirac-Admin/admin-panelYavirac',
        // El otro proyecto si es necesario
        'C:/Users/JesiU/OneDrive/Documents/Tesis-Yavirac/Yavirac-auth'
      ]
    }
  }
}); 