'use strict';
/**
 * Simulador de celulares para ensayar la demo sin público.
 * Conecta N clientes falsos con datos variados (iPhone, Android, Windows...).
 *
 *   node scripts/simular.js 50                 -> 50 dispositivos a localhost:3000
 *   node scripts/simular.js 50 https://mi-app.onrender.com
 */
const { io } = require('socket.io-client');

const N = parseInt(process.argv[2], 10) || 50;
const URL = process.argv[3] || 'http://localhost:3000';

const perfiles = [
  { os: 'iOS', osVersion: '18.1', deviceType: 'iPhone', model: '', browser: 'Safari', screen: '390×844', cores: 6, memory: null, gpu: 'Apple GPU' },
  { os: 'iOS', osVersion: '17.5', deviceType: 'iPhone', model: '', browser: 'Safari', screen: '430×932', cores: 6, memory: null, gpu: 'Apple GPU' },
  { os: 'iOS', osVersion: '18.0', deviceType: 'iPhone', model: '', browser: 'Chrome', screen: '393×852', cores: 6, memory: null, gpu: 'Apple GPU' },
  { os: 'Android', osVersion: '14', deviceType: 'Teléfono Android', model: 'SM-A546E', browser: 'Chrome', screen: '412×915', cores: 8, memory: 6, gpu: 'Mali-G68' },
  { os: 'Android', osVersion: '13', deviceType: 'Teléfono Android', model: 'Redmi Note 12', browser: 'Chrome', screen: '393×873', cores: 8, memory: 4, gpu: 'Adreno 610' },
  { os: 'Android', osVersion: '15', deviceType: 'Teléfono Android', model: 'Pixel 8', browser: 'Chrome', screen: '412×915', cores: 9, memory: 8, gpu: 'Mali-G715' },
  { os: 'Android', osVersion: '14', deviceType: 'Teléfono Android', model: 'moto g84', browser: 'Firefox', screen: '393×873', cores: 8, memory: 8, gpu: 'Adreno 619' },
  { os: 'Windows', osVersion: '10/11', deviceType: 'Computadora', model: '', browser: 'Chrome', screen: '1920×1080', cores: 12, memory: 16, gpu: 'Intel Iris Xe' },
  { os: 'Windows', osVersion: '10/11', deviceType: 'Computadora', model: '', browser: 'Edge', screen: '1366×768', cores: 4, memory: 8, gpu: 'Intel UHD 620' },
  { os: 'macOS', osVersion: '15.1', deviceType: 'Mac', model: '', browser: 'Safari', screen: '1512×982', cores: 10, memory: 16, gpu: 'Apple M3' },
];

const tzs = ['America/Costa_Rica', 'America/Costa_Rica', 'America/Costa_Rica', 'America/Managua'];
const langs = ['es-CR', 'es-419', 'es', 'en-US'];
const isps = ['Kölbi', 'Kölbi', 'Kölbi', 'Claro', 'Liberty', 'Liberty', 'Cabletica', 'Tigo'];
const cities = ['San José', 'San José', 'Alajuela', 'Cartago', 'Heredia'];
const apps = ['', '', '', '', '', '', '', '', 'Instagram', 'Facebook', 'TikTok', 'App de Google'];
const a11ys = [[], [], [], [], [], [], [], [], ['largeText'], ['motion'], ['contrast'], ['largeText', 'motion']];
const rnd = (a) => a[Math.floor(Math.random() * a.length)];

const sockets = [];
let connected = 0;

console.log(`Simulando ${N} dispositivos contra ${URL} ...`);

for (let i = 0; i < N; i++) {
  setTimeout(() => {
    const p = { ...rnd(perfiles) };
    const s = io(URL, { transports: ['websocket'], reconnection: false });
    sockets.push(s);
    s.on('connect', () => {
      connected++;
      // huella: casi siempre única; algunos iPhones comparten (modelo idéntico)
      const shared = Math.random() < 0.12;
      const fp = (shared ? 'shared-' + p.model + p.screen : 'uniq-' + Math.random().toString(16).slice(2))
        .padEnd(16, '0').slice(0, 16);
      s.emit('report', {
        visitorId: 'sim-' + i + '-' + Math.random().toString(36).slice(2),
        data: {
          ...p,
          pixelRatio: rnd([2, 3, 1]),
          language: rnd(langs),
          timezone: rnd(tzs),
          battery: Math.floor(Math.random() * 100),
          charging: Math.random() < 0.2,
          touch: p.deviceType.includes('Android') || p.deviceType.includes('iPhone') ? 5 : 0,
          darkMode: Math.random() < 0.5,
          connection: rnd(['4g', '4g', '5g', 'wifi']),
          app: rnd(apps),
          a11y: rnd(a11ys),
          fingerprint: fp,
        },
        // Compañía inventada: el servidor solo la acepta si el simulador corre en la misma compu
        sim: { isp: rnd(isps), city: rnd(cities), mobileNet: Math.random() < 0.6 },
      });
      if (connected === N) console.log(`✓ ${N} dispositivos conectados. Abrí el panel del presentador para verlos.`);
    });
    s.on('connect_error', (e) => console.error('Error de conexión:', e.message));
  }, i * 40); // llegada escalonada, como en la vida real
}

process.on('SIGINT', () => { sockets.forEach((s) => s.close()); process.exit(0); });
console.log('Dejá este proceso corriendo. Ctrl+C para desconectar todos.');
