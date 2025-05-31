let jugadores = [];
let jugadorDelDia = null;
let intentos = [];
let adivinado = false;

const HEADERS_CON_ICONOS = [
  "👤 Nombre",
  "🌎 Origen",
  "🗓️ Nacimiento",
  "🎽 Equipos",
  "🏆 Campeonatos",
  "🔀 Posición",
];

async function cargarJugadores() {
  const res = await fetch("jugadores.json");
  jugadores = await res.json();
  const { jugador, ahoraUTC } = await elegirJugadorDelDia();
  jugadorDelDia = jugador;
  document.getElementById("jugadorCorrecto").textContent =
    "Jugador del día: " + jugadorDelDia.nombre_completo;
  renderJugadorInfo(jugadorDelDia, "jugadorCorrecto");

  iniciarContadorUTC(ahoraUTC); // Nuevo contador basado en UTC

  cargarEstadoGuardado();
}

async function elegirJugadorDelDia() {
  try {
    const res = await fetch(
      "https://timeapi.io/api/Time/current/zone?timeZone=UTC"
    );
    const data = await res.json();
    const ahoraUTC = new Date(data.dateTime);
    const yyyyMMdd = ahoraUTC.toISOString().slice(0, 10);
    const seed = parseInt(yyyyMMdd.replace(/-/g, ""), 10);
    const index = seed % jugadores.length;
    return { jugador: jugadores[index], ahoraUTC };
  } catch (error) {
    console.error("Error obteniendo hora UTC:", error);
    // Fallback local
    const hoy = new Date();
    const yyyyMMdd = hoy.toISOString().slice(0, 10);
    const seed = parseInt(yyyyMMdd.replace(/-/g, ""), 10);
    const index = seed % jugadores.length;
    return { jugador: jugadores[index], ahoraUTC: hoy };
  }
}

document.addEventListener("DOMContentLoaded", () => {
  cargarJugadores();

  const input = document.getElementById("buscador");
  const sugerencias = document.getElementById("sugerencias");

  input.addEventListener("input", () => {
    const texto = input.value.toLowerCase();
    sugerencias.innerHTML = "";
    sugerencias.classList.remove("oculto");
    const coincidencias = jugadores
      .filter((j) => j.nombre_completo.toLowerCase().includes(texto))
      .slice(0, 15);
    if (coincidencias.length === 0) {
      const sinResultado = document.createElement("span");
      sinResultado.textContent = "Sin resultados";
      sinResultado.className = "sin-resultados";
      sugerencias.appendChild(sinResultado);
    } else {
      coincidencias.forEach((j) => {
        const li = document.createElement("p");
        li.textContent = j.nombre_completo;
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
  guardarEstadoJuego();

  const container = document.getElementById("intentos");

  // Si no hay encabezado aún, agregarlo una vez
  if (!document.querySelector("#intentos .fila-header")) {
    container.appendChild(crearEncabezado(HEADERS_CON_ICONOS, true));
  }

  const filaValores = crearFilaValores(jugador, intentos.length, jugadorDelDia);
  container.insertBefore(filaValores, container.children[1]);

  // Mostrar resultado si es correcto
  if (jugador.nombre_completo === jugadorDelDia.nombre_completo) {
    adivinado = true;
    const buscador = document.getElementById("buscadorContainer");
    buscador.classList.add("oculto");
    guardarEstadoJuego();

    confetti({
      particleCount: 350,
      spread: 100,
      origin: { y: 0.6 },
    });
    const resultado = document.getElementById("resultadoFinal");
    let resuelto = "";
    resultado.classList.remove("oculto");
    if (intentos.length === 1) {
      resuelto = " intento!";
    } else {
      resuelto = " intentos!";
    }
    resultado.innerHTML = `
      <h2>🎉 ${jugadorDelDia.nombre_completo} 🎉</h2>
      <div class="resuelto">
        <p>Resuelto en ${intentos.length}${resuelto}</p>
        <div class="compartir">
            <button id="compartirBtn">Compartir</button>
            <span class="compartir-alert oculto">Copiado al portapapeles</span>
        </div>
    </div>
        
        <div class="proximoJugador">Nuevo jugador en <span id="contadorTiempo"></span></div>
    `;
    // Compartir al hacer clic
    document.addEventListener("click", function (e) {
      if (e.target && e.target.id === "compartirBtn") {
        const fecha = new Date()
          .toISOString()
          .slice(0, 10)
          .split("-")
          .reverse()
          .join("/");
        const intentosRealizados = intentos.length;
        const mensaje = `⚽ Encontré al jugador de fútbol del ${fecha} en solo ${intentosRealizados} intento${
          intentosRealizados > 1 ? "s" : ""
        }!\n🔗 https://mi-juego-futbol.com`;

        navigator.clipboard.writeText(mensaje).then(() => {
          console.log("Mensaje copiado al portapapeles no matter what");
          const alertSpan = document.querySelector(".compartir-alert");
          alertSpan.classList.remove("oculto");
          setTimeout(() => {
            alertSpan.classList.add("oculto");
          }, 3000);
        });

        if (navigator.share) {
          navigator
            .share({
              title: "Jugador del día",
              text: mensaje,
              url: "https://mi-juego-futbol.com",
            })
            .catch((error) => console.log("Error al compartir:", error));
        } else {
          alert("¡Mensaje copiado al portapapeles!");
        }
      }
    });
    // Iniciar el contador con la hora actual UTC
    iniciarContadorUTC(new Date());
    // Asegurarse de que el contador sea visible
    const contadorSpan = document.getElementById("contadorTiempo");
    if (contadorSpan) {
      contadorSpan.classList.remove("oculto");
    }
    // Asegurarse de que el contenedor de resultado final también sea visible
    resultado.classList.remove("oculto");
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
          celda.classList.add(
            "nombre",
            valor === compararCon.nombre_completo ? "verde" : "rojo"
          );
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
  };
  localStorage.setItem("estadoJuego", JSON.stringify(estado));
}

function cargarEstadoGuardado() {
  const estadoGuardado = JSON.parse(localStorage.getItem("estadoJuego"));
  const fechaHoy = obtenerFechaUTCString();

  if (estadoGuardado && estadoGuardado.fecha === fechaHoy) {
    intentos = estadoGuardado.intentos
      .map((nombre) => jugadores.find((j) => j.nombre_completo === nombre))
      .filter(Boolean);
    adivinado = estadoGuardado.adivinado || false;

    intentos.forEach((j) => agregarIntento(j));
    if (adivinado) {
      mostrarResultadoFinal();
      document.getElementById("buscador").style.display = "none";
      document.getElementById("seleccionarBtn").style.display = "none";
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

  const spanContador = document.getElementById("contadorTiempo");
  if (spanContador) spanContador.classList.remove("oculto");

  document.getElementById("buscador").style.display = "none";
  document.getElementById("seleccionarBtn").style.display = "none";

  const btnCompartir = document.getElementById("compartirBtn");
  if (btnCompartir) {
    btnCompartir.addEventListener("click", () => {
      const fecha = new Date()
        .toISOString()
        .slice(0, 10)
        .split("-")
        .reverse()
        .join("/");
      const intentosRealizados = intentos.length;
      const mensaje = `⚽ Encontré al jugador de fútbol del ${fecha} en solo ${intentosRealizados} intento${
        intentosRealizados > 1 ? "s" : ""
      }!\n🔗 https://kel-hendros.github.io/futbol/`;

      navigator.clipboard.writeText(mensaje).then(() => {
        const alertSpan = document.querySelector(".compartir-alert");
        alertSpan.classList.remove("oculto");
        setTimeout(() => {
          alertSpan.classList.add("oculto");
        }, 3000);
      });

      if (navigator.share) {
        navigator
          .share({
            title: "Jugador del día",
            text: mensaje,
            url: "https://mi-juego-futbol.com",
          })
          .catch((error) => console.log("Error al compartir:", error));
      }
    });
  }
}
