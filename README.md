# Cyber Range Portal — Frontend público

Frontend estático del Cyber Range alojado en GitHub Pages.

## URL pública

https://rafaelcastro7.github.io/cyber-range-portal/

## Cómo funciona

El portal detecta automáticamente si está en local o público:
- **Local**: usa `http://localhost:8090` directo
- **Público (GitHub Pages)**: hace fetch al [Gist registry](https://gist.github.com/rafaelcastro7/4ec6171f3bb46b3e4c82ab3045768687) para obtener el URL actual del tunnel Cloudflare

Backend Docker corriendo localmente expuesto vía Cloudflare Tunnel.

Ver [docs en el repo principal](https://github.com/rafaelcastro7/cyber-range) para arquitectura completa.
