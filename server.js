'use strict';
/**
 * Demo QR — "Datos, IA y confianza: lo que pasa cuando nadie está mirando"
 * Todo se guarda SOLO en memoria. No se escribe nada a disco ni se guardan IPs.
 */
const express = require('express');
const http = require('http');
const os = require('os');
const path = require('path');
const { Server } = require('socket.io');
const QRCode = require('qrcode');

const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || 'cuc2026';
const PUBLIC_URL = process.env.PUBLIC_URL || ''; // opcional: fuerza la URL del QR
const MAX_DEVICES = 1000;

const app = express();
app.set('trust proxy', true);
const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 20000 });

/* ---------- Estado en memoria ---------- */
const devices = new Map(); // visitorId -> datos
let phase = 'welcome'; // 'welcome' | 'reveal'

const str = (v, max = 80) => (typeof v === 'string' ? v.slice(0, max) : '');
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

function sanitize(d = {}) {
  return {
    os: str(d.os, 30) || 'Desconocido',
    osVersion: str(d.osVersion, 20),
    browser: str(d.browser, 30) || 'Desconocido',
    deviceType: str(d.deviceType, 20) || 'Desconocido',
    model: str(d.model, 50),
    screen: str(d.screen, 20),
    pixelRatio: num(d.pixelRatio),
    language: str(d.language, 15),
    timezone: str(d.timezone, 50),
    cores: num(d.cores),
    memory: num(d.memory),
    battery: num(d.battery),
    charging: typeof d.charging === 'boolean' ? d.charging : null,
    gpu: str(d.gpu, 100),
    touch: num(d.touch),
    darkMode: d.darkMode === true,
    connection: str(d.connection, 15),
    fingerprint: str(d.fingerprint, 40) || 'sin-huella',
  };
}

function countBy(list, key, fallback = 'Desconocido') {
  const m = {};
  for (const x of list) {
    const k = x[key] || fallback;
    m[k] = (m[k] || 0) + 1;
  }
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
}

function computeStats() {
  const list = [...devices.values()];
  const total = list.length;

  const fpCount = {};
  for (const d of list) fpCount[d.fingerprint] = (fpCount[d.fingerprint] || 0) + 1;
  const uniqueFp = list.filter((d) => fpCount[d.fingerprint] === 1).length;

  const batt = list.filter((d) => d.battery !== null);
  const avgBattery = batt.length
    ? Math.round(batt.reduce((s, d) => s + d.battery, 0) / batt.length)
    : null;
  const withCores = list.filter((d) => d.cores);

  return {
    total,
    phase,
    uniqueFp,
    uniquePct: total ? Math.round((uniqueFp * 100) / total) : 0,
    byOS: countBy(list, 'os'),
    byBrowser: countBy(list, 'browser'),
    byType: countBy(list, 'deviceType'),
    topGpu: countBy(list.filter((d) => d.gpu), 'gpu').slice(0, 5),
    timezones: countBy(list, 'timezone').slice(0, 3),
    languages: countBy(list, 'language').slice(0, 4),
    avgBattery,
    batteryReported: batt.length,
    lowBattery: batt.filter((d) => d.battery <= 20).length,
    charging: list.filter((d) => d.charging === true).length,
    darkPct: total ? Math.round((list.filter((d) => d.darkMode).length * 100) / total) : 0,
    avgCores: withCores.length
      ? Math.round((withCores.reduce((s, d) => s + d.cores, 0) / withCores.length) * 10) / 10
      : null,
    recent: list
      .sort((a, b) => b.t - a.t)
      .slice(0, 14)
      .map((d) => ({
        os: d.os,
        osVersion: d.osVersion,
        browser: d.browser,
        model: d.model,
        deviceType: d.deviceType,
        screen: d.screen,
        battery: d.battery,
        charging: d.charging,
        fp: d.fingerprint.slice(0, 8),
      })),
  };
}

let pending = null;
function broadcastStats() {
  if (pending) return;
  pending = setTimeout(() => {
    pending = null;
    io.to('presenter').emit('stats', computeStats());
  }, 250);
}

function matchesFor(fp) {
  let c = 0;
  for (const d of devices.values()) if (d.fingerprint === fp) c++;
  return Math.max(0, c - 1);
}

function phasePayload(socket) {
  const d = devices.get(socket.data.visitorId);
  return { phase, matches: d ? matchesFor(d.fingerprint) : null, total: devices.size };
}

async function pushPhaseToAll() {
  const sockets = await io.in('participant').fetchSockets();
  for (const s of sockets) s.emit('phase', phasePayload(s));
}

/* ---------- Sockets ---------- */
io.on('connection', (socket) => {
  const { role, key } = socket.handshake.auth || {};

  if (role === 'presenter') {
    if (key !== ADMIN_KEY) {
      socket.emit('auth-error');
      return socket.disconnect(true);
    }
    socket.join('presenter');
    socket.emit('stats', computeStats());

    socket.on('set-phase', async (p) => {
      if (!['welcome', 'reveal'].includes(p)) return;
      phase = p;
      await pushPhaseToAll();
      broadcastStats();
    });

    socket.on('reset', () => {
      devices.clear();
      phase = 'welcome';
      io.to('participant').emit('reset');
      broadcastStats();
    });
    return;
  }

  // Participante
  socket.join('participant');
  socket.emit('phase', { phase });
  let last = 0;

  socket.on('report', (payload) => {
    const now = Date.now();
    if (now - last < 2000) return; // anti-spam básico
    last = now;
    if (!payload || typeof payload !== 'object') return;
    const id = str(payload.visitorId, 40);
    if (!id) return;
    if (!devices.has(id) && devices.size >= MAX_DEVICES) return;

    devices.set(id, { ...sanitize(payload.data), t: now });
    socket.data.visitorId = id;
    socket.emit('phase', phasePayload(socket));
    broadcastStats();
  });
});

/* ---------- Rutas ---------- */
function lanIp() {
  for (const list of Object.values(os.networkInterfaces())) {
    for (const i of list || []) {
      if (i.family === 'IPv4' && !i.internal) return i.address;
    }
  }
  return null;
}

function participantUrl(req) {
  if (PUBLIC_URL) return PUBLIC_URL.replace(/\/?$/, '/');
  let host = req.get('host') || `localhost:${PORT}`;
  // Si se abre en localhost, el QR apunta a la IP de la red local
  if (/^(localhost|127\.0\.0\.1)/.test(host)) {
    const ip = lanIp();
    if (ip) host = host.replace(/^(localhost|127\.0\.0\.1)/, ip);
  }
  return `${req.protocol}://${host}/`;
}

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.get('/presentador', (req, res) => {
  if (req.query.key !== ADMIN_KEY) return res.status(403).send('Acceso denegado');
  res.sendFile(path.join(__dirname, 'public', 'presentador.html'));
});

app.get('/qr.svg', async (req, res) => {
  const svg = await QRCode.toString(participantUrl(req), {
    type: 'svg',
    margin: 1,
    errorCorrectionLevel: 'M',
  });
  res.type('image/svg+xml').set('Cache-Control', 'no-store').send(svg);
});

app.get('/url', (req, res) => res.json({ url: participantUrl(req) }));
app.get('/healthz', (req, res) => res.send('ok'));

server.listen(PORT, () => {
  console.log(`Demo QR corriendo en http://localhost:${PORT}`);
  console.log(`Presentador: http://localhost:${PORT}/presentador?key=${ADMIN_KEY}`);
});
