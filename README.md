# Ruleta Lirón — Sorteos MTG

Web app para sorteos de sobres de Magic: The Gathering con ruleta animada, parser de EventLink, audio y aleatoriedad transparente (`crypto.getRandomValues`).

## Arranque

```bash
npm install
npm run dev
```

## Estructura

- `src/components/Wheel.jsx` — ruleta Canvas + física de desaceleración
- `src/components/Participants.jsx` — importación y gestión de jugadores
- `src/components/Prizes.jsx` — cola de sobres / premios
- `src/components/Config.jsx` — duración, volúmenes, confeti
- `src/components/AuditLog.jsx` / `FairPlayModal.jsx` — transparencia del sorteo
- `src/lib/fairRandom.js` — algoritmo Fair Play
- `src/lib/parseParticipants.js` — parser EventLink
- `src/lib/audio.js` — ticks, fanfarria y música

## Audio personalizado

Coloca archivos en `public/audio/` y pon la ruta en Configuración, por ejemplo:

- `/audio/fondo.mp3`
- `/audio/tension.ogg`

Los ticks de la ruleta y la fanfarria de victoria se generan con Web Audio API (no requieren archivos).
