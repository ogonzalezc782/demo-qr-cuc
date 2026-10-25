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
- **Cambiar la clave del panel:** variable de entorno `ADMIN_KEY`. Por defecto es `cuc2026`.
- **Forzar la URL del QR:** variable `PUBLIC_URL` (útil si Render va detrás de otro dominio).
