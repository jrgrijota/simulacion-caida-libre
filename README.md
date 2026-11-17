# Caída Libre y Tiro Parabólico — Simulación Interactiva

Simulación para **Física y Química de 4.º de ESO y 1.º de Bachillerato** sobre los movimientos
de los objetos que se lanzan cerca del suelo: caída libre, tiro vertical, tiro horizontal y tiro
oblicuo. Muestra que todos son el mismo movimiento, con la aceleración de la gravedad siempre
hacia abajo, y que solo cambian las condiciones iniciales.

Forma parte de [SimulaCiencia](https://simulaciencia.es/simulaciones/caida-libre/), donde tiene
su guía docente y su ficha de actividades.

## Modos

- **Vertical (caída libre y tiro vertical):** altura inicial y velocidad hacia arriba o hacia abajo.
  Se pueden soltar dos objetos a la vez (una pluma y una bola de acero, por ejemplo) con aire o sin él,
  en la Tierra, la Luna, Marte o Júpiter.
- **Parabólico (tiro horizontal y oblicuo):** altura, rapidez y ángulo. Componentes de la velocidad,
  proyecciones del movimiento sobre los ejes (MRU en horizontal y MRUA en vertical), una bola que se
  suelta a la vez para comprobar que llegan juntas y trayectorias anteriores para comparar ángulos.
- **Reto:** cuatro problemas con datos al azar (hasta el balcón, ¿cuánto tarda?, a la diana y dos
  ángulos). Se escribe la respuesta calculada y la simulación la comprueba.

En todos: estela estroboscópica (un punto cada 0,1, 0,2 o 0,5 s), vectores velocidad y aceleración,
instante a instante con un deslizador y botones − y +, gráficas posición–tiempo y velocidad–tiempo,
ecuaciones con los valores sustituidos y una casilla para ocultar los resultados.

## Física

Sin aire, la trayectoria se calcula con las ecuaciones exactas, así que los números coinciden con los
de un problema resuelto en el cuaderno (g = 9,8 m/s²). Con aire se integra paso a paso (Runge-Kutta
de orden 4, Δt = 2 ms) con un rozamiento proporcional al cuadrado de la velocidad; cada objeto se
caracteriza por su velocidad límite en el aire. El aire solo se modela en la Tierra.

## Uso

Abre `index.html` en un navegador. No necesita instalación ni conexión: incluye [p5.js](https://p5js.org/)
en `js/vendor/`. Tiene cuatro temas visuales (SimulaCiencia, oscuro, claro y alto contraste) en el
botón del engranaje. Con `?lang=en` en la dirección la interfaz sale en inglés; con `?lang=ca`, en
catalán; con `?lang=eu`, en euskera, y con `?lang=gl`, en gallego.

La dirección también puede abrir la simulación ya preparada (lo usan las fichas de actividades), por
ejemplo `index.html?modo=parabolico&h=0&v=20&angulo=45&proyecciones=1`. Parámetros: `modo`
(`vertical`, `parabolico`, `reto`), `h`, `v` (en el modo vertical, negativa hacia abajo), `angulo`,
`objeto` (`acero`, `baloncesto`, `tenis`, `pingpong`, `papel`, `pluma`), `lugar` (`tierra`, `luna`,
`marte`, `jupiter`), `aire`, `comparar`, `objeto2`, `soltar`, `conservar`, `vectores`, `proyecciones`,
`estela` (`0.1`, `0.2`, `0.5`), `pausa` (pausar en la altura máxima), `ocultar`, `graficas`,
`velocidad` (`0.25`, `0.5`, `1`), `reto` (`balcon`, `tarda`, `diana`, `angulos`) y `tema`.

## Estructura

| Archivo | Contenido |
|---|---|
| `index.html` | Panel de controles de los tres modos |
| `css/style.css` | Estilos y temas (mismo sistema visual que el resto de simulaciones) |
| `js/fisica.js` | Objetos, lugares y cálculo de trayectorias (exactas sin aire, numéricas con aire) |
| `js/escena.js` | Dibujo del lienzo: escenario, estela, vectores, proyecciones y gráficas |
| `js/reto.js` | Modo reto: problemas, comprobación y pistas |
| `js/sketch.js` | Estado, controles, animación, textos, ecuaciones y temas |
| `js/parametros.js` | Ajustes desde la dirección |
| `js/i18n.js`, `js/i18n-en.js`, `js/i18n-ca.js`, `js/i18n-eu.js`, `js/i18n-gl.js` | Idioma de la interfaz y traducciones |
| `js/sello.js`, `js/estadisticas.js` | Sello «simulaciencia.es» y recuento de visitas sin cookies (comunes a todas las simulaciones) |

## Licencia

Juan Ramón Grijota · Código bajo licencia [MIT](LICENSE) y contenido didáctico bajo
[CC BY-SA 4.0](LICENSE-CONTENT.md).
