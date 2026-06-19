# VisionAR_proyect1

Sitio estático de VisionAR con 3 imágenes precargadas y visor AR basado en `<model-viewer>`.

## Estructura

- `src/RepositorioImagenes/`: imágenes fuente que alimentan el sitio
- `public/RepositorioImagenes/`: copia publicada para GitHub Pages
- `public/modelos/`: modelos `glb` y `usdz` generados para AR

## Ejecutar localmente

```bash
npm install
npm run generate:assets
npm run dev
```

Abre la URL que imprime Vite, normalmente `http://127.0.0.1:5173/`.

## Build

```bash
npm run build
```

## Cómo funciona AR

- El selector solo expone 3 botones, uno por imagen.
- Cada imagen carga un modelo `glb` para navegadores con `WebXR` o Scene Viewer.
- Cada imagen también carga un `usdz` para Quick Look en iPhone.
- `<model-viewer>` se encarga de decidir la ruta AR más compatible disponible.

## Limitaciones reales

- `WebXR` no está disponible de forma uniforme en iPhone.
- Android depende del navegador, del dispositivo y del soporte AR del sistema.
- Si el navegador no soporta una ruta AR concreta, `model-viewer` puede mostrar el modelo sin abrir AR.
- La experiencia depende de HTTPS; GitHub Pages ya cumple este requisito.

## Despliegue en GitHub Pages

1. Crea el repositorio `anican95/VisionAR_proyect1`.
2. Sube el contenido de este proyecto al repositorio.
3. Activa GitHub Pages desde la rama `main` y la carpeta raíz o `dist`.
4. La URL final esperada es:

```text
https://anican95.github.io/VisionAR_proyect1/
```

## Recomendación práctica

Antes de publicar, ejecuta `npm run build` para confirmar que los modelos y assets se generan correctamente.
