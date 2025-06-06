let jugadores = [];
let jugadorDelDia = null;
let intentos = [];
let adivinado = false;
let racha = 0;
let ultimaAdivinada = null;

const HEADERS_CON_ICONOS = [
  "👤 Nombre",
  "🌎 Origen",
  "🗓️ Nacimiento",
  "🎽 Equipos",
  "🏆 Campeonatos",
  "🔀 Posición",
];

// Validacion en consola de eventos de GA4
window._gtag_original = window.gtag;

window.gtagEventosDisparados = [];

window.gtag = function (...args) {
  if (args[0] === "event") {
    const [_, eventName, params] = args;
    window.gtagEventosDisparados.push({
      eventName,
      params,
      timestamp: new Date().toISOString(),
    });
    console.log(`[GA4] Evento disparado: ${eventName}`, params);
  }
  window._gtag_original(...args);
};

async function cargarJugadores() {
  const res = await fetch("jugadores.json");
  jugadores = await res.json();
  const { jugador, ahoraUTC } = await elegirJugadorDelDia();
  jugadorDelDia = jugador;
  //   console.log("Jugador del día:", jugadorDelDia);
  document.getElementById("jugadorCorrecto").textContent =
    "Jugador del día: " + jugadorDelDia.nombre_completo;
  renderJugadorInfo(jugadorDelDia, "jugadorCorrecto");

  iniciarContadorUTC(ahoraUTC); // Nuevo contador basado en UTC

  cargarEstadoGuardado();
}

async function elegirJugadorDelDia() {
  const ahoraLocal = new Date();
  const offsetMinutos = ahoraLocal.getTimezoneOffset(); // en minutos
  const ahoraUTC = new Date(ahoraLocal.getTime() + offsetMinutos * 60000);

  const fechaBase = new Date("2025-05-31T00:00:00Z");
  const diffDias = Math.floor((ahoraUTC - fechaBase) / 86400000);
  const index = diffDias % jugadores.length;

  return { jugador: jugadores[index], ahoraUTC };
}

document.addEventListener("DOMContentLoaded", () => {
  const contadorRacha = document.getElementById("contadorRacha");

  cargarJugadores().then(() => {
    // Una vez cargado el estado y la racha, actualizamos el número en el badge
    contadorRacha.textContent = racha;
  });

  const input = document.getElementById("buscador");
  const sugerencias = document.getElementById("sugerencias");

  input.addEventListener("input", () => {
    const texto = input.value.toLowerCase();
    sugerencias.innerHTML = "";
    if (texto.length < 3) {
      sugerencias.classList.add("oculto");
      return;
    }
    sugerencias.classList.remove("oculto");
    const coincidencias = jugadores
      .filter((j) => j.nombre_completo.toLowerCase().includes(texto))
      .filter(
        (j) => !intentos.some((i) => i.nombre_completo === j.nombre_completo)
      )
      .slice(0, 15);
    if (coincidencias.length === 0) {
      const sinResultado = document.createElement("span");
      sinResultado.textContent = "Sin resultados";
      sinResultado.className = "sin-resultados";
      sugerencias.appendChild(sinResultado);
    } else {
      coincidencias.forEach((j) => {
        const li = document.createElement("p");
        li.innerHTML = `
          <img src="imagenes/${j.id}.png" alt="${j.nombre_completo}" class="sugerencia-imagen">
          <span>${j.nombre_completo}</span>
        `;
        li.onclick = () => {
          input.value = j.nombre_completo;
          sugerencias.innerHTML = "";
        };
        sugerencias.appendChild(li);
      });
    }
  });

  document.getElementById("seleccionarBtn").addEventListener("click", () => {
    const nombre = input.value.trim();
    const jugador = jugadores.find((j) => j.nombre_completo === nombre);
    if (jugador) evaluarIntento(jugador);
    input.value = "";
  });

  // Cerrar sugerencias y limpiar campo si se hace clic fuera de #buscador o #sugerencias
  document.addEventListener("click", (e) => {
    const input = document.getElementById("buscador");
    const sugerencias = document.getElementById("sugerencias");

    const clickDentroDelBuscador = input.contains(e.target);
    const clickDentroDeSugerencias = sugerencias.contains(e.target);

    if (!clickDentroDelBuscador && !clickDentroDeSugerencias) {
      sugerencias.innerHTML = "";
      sugerencias.classList.add("oculto");
      //   input.value = "";
    }
  });
});

function evaluarIntento(jugador) {
  intentos.push(jugador);

  agregarIntento(jugador);

  // Mostrar resultado si es correcto
  if (jugador.nombre_completo === jugadorDelDia.nombre_completo) {
    adivinado = true;
    // Actualizar racha y ultimaAdivinada
    const hoy = new Date().toISOString().slice(0, 10);
    const ayer = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (ultimaAdivinada === hoy) {
      // ya contada hoy, no cambiamos racha
    } else if (ultimaAdivinada === ayer) {
      racha = racha + 1;
    } else {
      racha = 1;
    }
    ultimaAdivinada = hoy;
    // Actualizar contador en la UI
    document.getElementById("contadorRacha").textContent = racha;
    guardarEstadoJuego();

    ocultarInputsDeJuego();
    confetti({
      particleCount: 350,
      spread: 100,
      origin: { y: 0.6 },
    });

    gtag("event", "jugador_encontrado", {
      intentos: intentos.length,
      racha,
      jugador_nombre: jugador.nombre_completo,
    });

    mostrarResultadoFinal();
  } else {
    if (typeof gtag === "function") {
      gtag("event", "intento_erroneo", {
        intento_numero: intentos.length, // el intento actual
        jugador_intentado: jugador.nombre_completo,
      });
    }

    guardarEstadoJuego();
  }
}

// Renderiza la información de un jugador en el contenedor dado
function renderJugadorInfo(jugador, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  const tabla = document.createElement("div");
  tabla.className = "tabla-jugador";

  tabla.appendChild(crearEncabezado(HEADERS_CON_ICONOS));
  tabla.appendChild(crearFilaValores(jugador));

  container.appendChild(tabla);
}

function crearEncabezado(headers, includeCircle = false) {
  const filaHeader = document.createElement("div");
  filaHeader.className = "fila-header";

  if (includeCircle) {
    const espacio = document.createElement("div");
    espacio.className = "intento-numero";
    espacio.style.visibility = "hidden";
    filaHeader.appendChild(espacio);
  }

  headers.forEach((texto) => {
    const celda = document.createElement("div");
    celda.className = "celda-header";
    const partes = texto.split(" ");
    if (partes.length > 1) {
      const icono = document.createElement("div");
      icono.className = "icono";
      icono.textContent = partes[0];
      const titulo = document.createElement("div");
      titulo.className = "titulo";
      titulo.textContent = partes.slice(1).join(" ");
      celda.appendChild(icono);
      celda.appendChild(titulo);
    } else {
      celda.textContent = texto;
    }
    filaHeader.appendChild(celda);
  });

  return filaHeader;
}

function crearFilaValores(jugador, intentoNum = null, compararCon = null) {
  const filaValores = document.createElement("div");
  filaValores.className = "fila-valores";

  if (intentoNum !== null) {
    const intentoDiv = document.createElement("div");
    intentoDiv.className = "intento-numero";
    intentoDiv.textContent = intentoNum;
    filaValores.appendChild(intentoDiv);
  }

  const valores = [
    jugador.nombre_completo,
    jugador.pais_nacimiento,
    jugador.año_nacimiento,
    jugador.equipos.join(", "),
    jugador.campeonatos.join(", "),
    jugador.posición_preferida,
  ];
  const headers = HEADERS_CON_ICONOS.map((h) =>
    h.split(" ").slice(1).join(" ")
  );

  valores.forEach((valor, i) => {
    const celda = document.createElement("div");
    celda.className = "celda";

    if (compararCon) {
      switch (headers[i]) {
        case "Nombre":
          celda.classList.add("nombre-con-imagen");
          celda.style.backgroundImage = `url(imagenes/${jugador.id}.png)`;

          break;
        case "Origen":
          celda.classList.add(
            "origen",
            valor === compararCon.pais_nacimiento
              ? "verde"
              : jugador.continente === compararCon.continente
              ? "naranja"
              : "rojo"
          );
          break;
        case "Nacimiento":
          celda.classList.add("nacimiento");
          const añoReal = compararCon.año_nacimiento;
          if (valor === añoReal) {
            celda.classList.add("verde");
          } else {
            celda.classList.add("naranja");
            valor += valor > añoReal ? " ↓" : " ↑";
          }
          break;
        case "Equipos":
          const comunesEq = jugador.equipos.filter((e) =>
            compararCon.equipos.includes(e)
          );
          celda.classList.add(
            comunesEq.length === jugador.equipos.length &&
              comunesEq.length === compararCon.equipos.length
              ? "verde"
              : comunesEq.length > 0
              ? "naranja"
              : "rojo"
          );
          break;
        case "Campeonatos":
          const comunesCamp = jugador.campeonatos.filter((c) =>
            compararCon.campeonatos.includes(c)
          );
          celda.classList.add(
            comunesCamp.length === jugador.campeonatos.length &&
              comunesCamp.length === compararCon.campeonatos.length
              ? "verde"
              : comunesCamp.length > 0
              ? "naranja"
              : "rojo"
          );
          break;
        case "Posición":
          celda.classList.add(
            "posicion",
            valor === compararCon.posición_preferida ? "verde" : "rojo"
          );
          break;
      }
    }

    celda.textContent = valor;

    filaValores.appendChild(celda);
  });

  return filaValores;
}

const modal = document.getElementById("helpModal");
const btn = document.getElementById("helpBtn");
const cerrar = document.getElementById("closeHelpBtn");

btn.addEventListener("click", () => modal.showModal());
cerrar.addEventListener("click", () => modal.close());

// Delegar evento de click para cualquier elemento con clase .icono
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("icono")) {
    modal.showModal();
  }
});

// Nuevo contador basado en UTC
function iniciarContadorUTC(baseDate) {
  const proximaMedianocheUTC = new Date(
    Date.UTC(
      baseDate.getUTCFullYear(),
      baseDate.getUTCMonth(),
      baseDate.getUTCDate() + 1
    )
  );
  const spanContador = document.getElementById("contadorTiempo");
  if (!spanContador) return;

  function actualizarContador() {
    const ahora = new Date();
    const diff = proximaMedianocheUTC.getTime() - ahora.getTime();
    if (diff <= 0) {
      spanContador.textContent = "00:00:00";
      return;
    }
    const horas = String(Math.floor(diff / 3600000)).padStart(2, "0");
    const minutos = String(Math.floor((diff % 3600000) / 60000)).padStart(
      2,
      "0"
    );
    const segundos = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
    spanContador.textContent = `${horas}:${minutos}:${segundos}`;
  }

  actualizarContador();
  setInterval(actualizarContador, 1000);
}

function guardarEstadoJuego() {
  const estado = {
    intentos: intentos.map((j) => j.nombre_completo),
    adivinado,
    fecha: obtenerFechaUTCString(),
    jugadorDelDia: jugadorDelDia.nombre_completo,
    racha,
    ultimaAdivinada,
  };
  localStorage.setItem("estadoJuego", JSON.stringify(estado));
}

function cargarEstadoGuardado() {
  const estadoGuardado = JSON.parse(localStorage.getItem("estadoJuego"));
  // Inicialización de racha antes de procesar la lógica del juego del día
  const ayer = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (estadoGuardado) {
    const {
      racha: rachaGuardada = 0,
      ultimaAdivinada: ultimaAdivinadaGuardada = null,
      fecha: fechaGuardada = null,
    } = estadoGuardado;
    // Si el estado guardado corresponde a un día anterior a hoy
    if (
      fechaGuardada &&
      fechaGuardada < new Date().toISOString().slice(0, 10)
    ) {
      if (ultimaAdivinadaGuardada !== ayer) {
        racha = 0;
      } else {
        racha = rachaGuardada;
      }
    } else {
      // Si es el mismo día o no tiene fecha previa, conservamos la racha guardada
      racha = rachaGuardada;
    }
    ultimaAdivinada = ultimaAdivinadaGuardada;
  }
  const fechaHoy = obtenerFechaUTCString();

  if (estadoGuardado && estadoGuardado.fecha === fechaHoy) {
    if (
      !estadoGuardado.jugadorDelDia ||
      estadoGuardado.jugadorDelDia !== jugadorDelDia.nombre_completo
    ) {
      localStorage.removeItem("estadoJuego");
      return;
    }

    intentos = estadoGuardado.intentos
      .map((nombre) => jugadores.find((j) => j.nombre_completo === nombre))
      .filter(Boolean);
    adivinado = estadoGuardado.adivinado || false;

    intentos.forEach((j) => agregarIntento(j));
    if (adivinado) {
      mostrarResultadoFinal();
    }
  }
}

function obtenerFechaUTCString() {
  return new Date().toISOString().slice(0, 10);
}

function agregarIntento(jugador) {
  const container = document.getElementById("intentos");

  // Si no hay encabezado aún, agregarlo una vez
  if (!document.querySelector("#intentos .fila-header")) {
    container.appendChild(crearEncabezado(HEADERS_CON_ICONOS, true));
  }

  const filaValores = crearFilaValores(jugador, intentos.length, jugadorDelDia);
  container.insertBefore(filaValores, container.children[1]);
}

function mostrarResultadoFinal() {
  const resultado = document.getElementById("resultadoFinal");
  resultado.classList.remove("oculto");

  let resuelto = "";
  if (intentos.length === 1) {
    resuelto = " intento!";
  } else {
    resuelto = " intentos!";
  }

  resultado.innerHTML = `
    <h2>🎉 ${jugadorDelDia.nombre_completo} 🎉</h2>
    <div class="jugador-image" id="jugadorImageContainer">
        <img class="imagen-jugador" src="imagenes/${jugadorDelDia.id}.png" alt="${jugadorDelDia.nombre_completo}" onerror="this.parentElement.style.display='none'">
    </div>
    <div class="resuelto">
      <p>Resuelto en ${intentos.length}${resuelto}</p>
      <div class="compartir">
          <button id="compartirBtn">Compartir</button>
          <span class="compartir-alert oculto">Copiado al portapapeles</span>
      </div>
    </div>
    <div class="proximoJugador">Nuevo jugador en <span id="contadorTiempo"></span></div>
  `;

  iniciarContadorUTC(new Date());

  ocultarInputsDeJuego();

  const btnCompartir = document.getElementById("compartirBtn");
  if (btnCompartir) {
    btnCompartir.addEventListener("click", manejarCompartir);
  }
}

function ocultarInputsDeJuego() {
  const buscador = document.getElementById("buscador");
  const seleccionarBtn = document.getElementById("seleccionarBtn");
  if (buscador) buscador.style.display = "none";
  if (seleccionarBtn) seleccionarBtn.style.display = "none";
}

function crearMensajeCompartir() {
  const fecha = new Date()
    .toISOString()
    .slice(0, 10)
    .split("-")
    .reverse()
    .join("/");
  const intentosRealizados = intentos.length;
  return `⚽ Encontré al jugador de fútbol del ${fecha} en solo ${intentosRealizados} intento${
    intentosRealizados > 1 ? "s" : ""
  }!\n🔗 https://kel-hendros.github.io/futbol/`;
}

function manejarCompartir() {
  const mensaje = crearMensajeCompartir();

  navigator.clipboard.writeText(mensaje).then(() => {
    const alertSpan = document.querySelector(".compartir-alert");
    if (alertSpan) {
      alertSpan.classList.remove("oculto");
      setTimeout(() => {
        alertSpan.classList.add("oculto");
      }, 3000);
    }
  });

  if (navigator.share) {
    navigator
      .share({
        title: "Jugador del día",
        text: mensaje,
      })
      .catch((error) => console.log("Error al compartir:", error));
  }
}

// Badge de racha
const badge = document.getElementById("contenedorRacha");

let timeoutId = null;
function expandirBadge() {
  // Si ya estaba expandido, reiniciamos el temporizador
  badge.classList.add("desplegado");
  if (timeoutId) {
    clearTimeout(timeoutId);
  }
  // Después de 2 segundos, colapsar
  timeoutId = setTimeout(() => {
    badge.classList.remove("desplegado");
    timeoutId = null;
  }, 5000);
}

// Puedes usar click o mouseover, según prefieras:
badge.addEventListener("mouseover", expandirBadge);
badge.addEventListener("click", expandirBadge);
