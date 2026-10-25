# Demo QR — "Datos, IA y confianza: lo que pasa cuando nadie está mirando"

Demo en vivo para la charla en el CUC. Los estudiantes escanean un QR, ven una
pantalla de bienvenida inocente, y vos revelás en el proyector todo lo que sus
celulares entregaron sin pedirles permiso.

**Todo se guarda solo en memoria.** No se escribe nada a disco, no se guardan IPs
ni nombres. Al reiniciar el servidor (o apretar "Borrar todo") desaparece todo.

---

## Qué hay aquí

| Archivo | Qué es |
|---|---|
| `server.js` | El servidor. Recibe los datos y manda las estadísticas al panel. |
| `public/index.html` | Lo que ve el estudiante en el celular. |
| `public/presentador.html` | El panel que proyectás. Tiene el botón "REVELAR". |
| `scripts/simular.js` | Simula 50 celulares para que ensayés sin público. |

---

## Probarlo en tu compu (3 pasos)

Necesitás Node.js 18 o superior (`node --version` para verificar).

```bash
npm install
npm start
```

Vas a ver dos direcciones en la consola:

- **Participante (el QR apunta aquí):** http://localhost:3000
- **Presentador:** http://localhost:3000/presentador?key=cuc2026

Abrí el panel del presentador en una pestaña. En otra, abrí http://localhost:3000
y vas a ver que el contador sube. Apretá **"🔴 REVELAR a todos"** y mirá cómo
cambia la pantalla del participante.

### Ensayo con 50 celulares simulados

Con el servidor corriendo, en otra terminal:

```bash
npm run simular 50
```

Vas a ver el panel llenarse con 50 dispositivos variados (iPhones, Androids,
Windows...). Así ensayás el discurso mirando números realistas. `Ctrl+C` los desconecta.

---


## Notas técnicas

- **iPhone no reporta batería:** Safari bloquea ese dato. Es normal que el promedio
  de batería salga solo de los Androids. De hecho es un buen punto para la charla:
  "Apple bloquea esto, Android no."
- **La huella (fingerprint):** se calcula combinando pantalla, GPU, idioma, zona
  horaria y un dibujo invisible en canvas. Dos dispositivos del mismo modelo exacto
  pueden coincidir; por eso el panel muestra el % de únicos, no un número absoluto.
- **Compañía de internet y ciudad:** se sacan de la IP pública consultando
  [ip-api.com](https://ip-api.com) (gratis, sin clave). La IP se manda a ese servicio
  y se descarta; solo se guarda en memoria el nombre de la compañía, la ciudad y si es
  datos móviles. Para apagarlo: variable `IP_LOOKUP=off`.
  - Si todos están en el **Wi‑Fi del CUC**, todos salen con la misma compañía (la del
    CUC). El dato luce cuando la gente usa **datos móviles**: pedí que apaguen el Wi‑Fi.
  - Corriendo en tu compu (red local) no hay IP pública que consultar: solo aparece en
    Render o con el simulador.
- **Modelo exacto en Android:** Chrome ya no pone el modelo en el user agent, pero lo
  entrega sin pedir permiso con `navigator.userAgentData.getHighEntropyValues`. Lo
  mismo con la versión real de Android y si es Windows 10 u 11. Safari y Firefox no lo dan.
- **"Abriste el link desde":** si el QR o el link se abre dentro de Instagram, Facebook,
  TikTok, la app de Google, etc., se nota en el user agent. Si lo escanean con la cámara
  normal, sale vacío.
- **Accesibilidad:** menos movimiento, más contraste, colores forzados o invertidos se
  leen con media queries. En iPhone también se detecta la letra grande. Buen momento
  para decir: "esto puede insinuar una condición de salud, y nunca te lo pregunté".
- **Cambiar la clave del panel:** variable de entorno `ADMIN_KEY`. Por defecto es `cuc2026`.
- **Forzar la URL del QR:** variable `PUBLIC_URL` (útil si Render va detrás de otro dominio).
