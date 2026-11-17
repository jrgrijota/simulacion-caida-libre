'use strict';
// ═══════════════════════════════════════════════════════════════════
//  CAÍDA LIBRE Y TIRO PARABÓLICO
//  Estado, controles, animación y textos. La física está en js/fisica.js,
//  el dibujo en js/escena.js y los retos en js/reto.js.
// ═══════════════════════════════════════════════════════════════════

const S = {
    mode: 'vertical',
    obj: 'tenis', obj2: 'acero', lugar: 'tierra', aire: false,
    comparar: false, soltar: false, conservar: false,
    vectores: true, proy: false, estela: 0.2, pausaCima: false, ocultar: false,
    graficas: false, speed: 1,
    trays: { main: null, otro: null, soltada: null, vacio: null },
    fantasmas: [],
    t: 0, estado: 'listo', cimaPausada: false,
    reto: null, retoTipo: 'balcon', retoIntentos: 0, retoX: null,
};
let THEME = {};
const $ = (id) => document.getElementById(id);

// ─────────────────────────────────────────────────────────────────
function setup() {
    const canvas = createCanvas(CV_W, CV_H);
    canvas.parent('canvas-container');
    canvas.elt.setAttribute('role', 'img');
    canvas.elt.setAttribute('aria-label', i18n.t('Simulación de lanzamientos: el objeto, su estela cada cierto tiempo y sus vectores velocidad y aceleración. Los avisos de la simulación se leen en voz alta.'));
    textFont('monospace');
    frameRate(60);

    llenarDesplegables();
    setupControles();
    setupThemeSelector();
    setMode('vertical');
    fitCanvas();

    // Ajustes de la dirección (fichas de actividades): ver js/parametros.js.
    // h, v y angulo se aplican al modo en el que se abra.
    const pulsar = (sel) => (v) => { const b = document.querySelector(sel(v)); if (b) b.click(); };
    const deslizador = (nombre) => (v) => {
        const id = { h: 'slider-h-', v: 'slider-v-', a: 'slider-a-' }[nombre] + (S.mode === 'parab' ? 'parab' : 'vert');
        urlParam.range(id)(v);
    };
    aplicarParametrosUrl({
        tema:         (v) => { const t = { simulaciencia: 'marca', marca: 'marca', claro: 'light', oscuro: 'dark', contraste: 'contrast' }[v];
                                   const b = t && document.querySelector(`.theme-opt[data-theme="${t}"]`); if (b) b.click(); },
        modo:         urlParam.click({ vertical: 'mode-vertical', parabolico: 'mode-parab', parab: 'mode-parab', reto: 'mode-reto' }),
        h:            deslizador('h'),
        v:            deslizador('v'),
        angulo:       deslizador('a'),
        objeto:       urlParam.select('select-objeto'),
        lugar:        urlParam.select('select-lugar'),
        aire:         urlParam.toggle('check-aire', (c) => c.checked),
        comparar:     urlParam.toggle('check-comparar', (c) => c.checked),
        objeto2:      urlParam.select('select-objeto2'),
        soltar:       urlParam.toggle('check-soltar', (c) => c.checked),
        conservar:    urlParam.toggle('check-conservar', (c) => c.checked),
        vectores:     urlParam.toggle('check-vectores', (c) => c.checked),
        proyecciones: urlParam.toggle('check-proyecciones', (c) => c.checked),
        estela:       pulsar((v) => `[data-estela="${parseFloat(v.replace(',', '.'))}"]`),
        pausa:        urlParam.toggle('check-pausa-cima', (c) => c.checked),
        ocultar:      urlParam.toggle('check-ocultar', (c) => c.checked),
        graficas:     urlParam.toggle('btn-graficas', (b) => b.getAttribute('aria-pressed') === 'true'),
        velocidad:    pulsar((v) => `[data-speed="${parseFloat(v.replace(',', '.'))}"]`),
        reto:         pulsar((v) => `[data-reto="${v}"]`),
    });
}

function draw() {
    updateTheme();
    background(THEME.canvasBg);
    avanzarTiempo();

    const m = S.trays.main;
    calcularVista([m, S.trays.otro, S.trays.soltada, S.trays.vacio, ...S.fantasmas.map((f) => f.tr)]);
    dibujarEscenario();
    if (S.mode === 'reto') dibujarReto();
    const objMain = S.mode === 'reto' ? 'tenis' : S.obj;
    const rM = OBJETOS[objMain].r;
    dibujarFantasmas(rM);
    if (S.aire && S.mode === 'parab') dibujarReferenciaVacio(S.trays.vacio, rM);

    const t = S.t;
    // Objeto que se compara (modo vertical) y bola soltada (modo parabólico)
    if (S.trays.otro) dibujarEstela(S.trays.otro, Math.min(t, S.trays.otro.tf), THEME.obj2Trail, 90, OBJETOS[S.obj2].r);
    if (S.trays.soltada) {
        dibujarEstela(S.trays.soltada, Math.min(t, S.trays.soltada.tf), THEME.drop, 0, 7, 3.5);
        dibujarParejas(m, S.trays.soltada, t, rM);
    }
    if (m) {
        if (S.proy && S.mode !== 'vertical') dibujarProyecciones(m, Math.min(t, m.tf), rM);
        dibujarEstela(m, Math.min(t, m.tf), THEME.trail, 0, rM);
        dibujarMarcas(m, Math.min(t, m.tf));
    }
    if (S.trays.otro) {
        const o = S.trays.otro, e = o.estadoEn(Math.min(t, o.tf));
        dibujarObjeto(S.obj2, sx(0) + 90, sy(e.y), e.vx, e.vy);
        if (S.vectores && t < o.tf) dibujarVectores(e, sx(0) + 90, sy(e.y) - OBJETOS[S.obj2].r, false);
        etiquetaObjeto(S.obj2, sx(0) + 90, sy(e.y) - 2 * OBJETOS[S.obj2].r - 6);
    }
    if (S.trays.soltada) {
        const e = S.trays.soltada.estadoEn(Math.min(t, S.trays.soltada.tf));
        dibujarBolaAuxiliar(sx(e.x), sy(e.y));
    }
    if (m) {
        const e = m.estadoEn(Math.min(t, m.tf));
        const parado = !m.valido || t >= m.tf;
        dibujarObjeto(objMain, sx(e.x), sy(e.y), e.vx, e.vy);
        if (S.vectores && m.valido && !parado) dibujarVectores(e, sx(e.x), sy(e.y) - rM, S.mode !== 'vertical');
        if (S.trays.otro) etiquetaObjeto(S.obj, sx(e.x), sy(e.y) - 2 * OBJETOS[S.obj].r - 6);
    }
    if (S.graficas) dibujarGraficas(m, Math.min(t, m ? m.tf : 0));
    const [tit, sub] = textoFranja();
    dibujarFranja(tit, sub);
    if (frameCount % 3 === 0) actualizarDatos();
}

function etiquetaObjeto(tipo, x, y) {
    noStroke(); fill(THEME.textDim); textSize(11); textAlign(CENTER, BOTTOM);
    text(i18n.t(OBJETOS[tipo].nombre), x, y);
}

// ═══════════════════════════════════════════════════════════════════
//  TIEMPO
// ═══════════════════════════════════════════════════════════════════
function tFinal() {
    return Math.max(...Object.values(S.trays).filter((tr) => tr && tr.valido && tr !== S.trays.vacio).map((tr) => tr.tf), 0);
}

function avanzarTiempo() {
    if (S.estado !== 'vuelo') return;
    const m = S.trays.main;
    const antes = S.t;
    S.t += Math.min(deltaTime, 50) / 1000 * S.speed;
    // Pausa opcional justo en la altura máxima
    if (S.pausaCima && m && m.tCima !== null && antes < m.tCima && S.t >= m.tCima) {
        S.t = m.tCima;
        setEstado('pausa');
        anunciarCima(m);
        return;
    }
    if (m && m.tCima !== null && antes < m.tCima && S.t >= m.tCima) anunciarCima(m);
    const tf = tFinal();
    if (S.t >= tf) {
        S.t = tf;
        setEstado('fin');
        alLlegar();
    }
}

function setEstado(e) {
    S.estado = e;
    const txt = { listo: i18n.t('Lanzar'), vuelo: i18n.t('Pausar'), pausa: i18n.t('Reanudar'), fin: i18n.t('Lanzar otra vez') }[e];
    $('btn-lanzar-txt').textContent = txt;
    $('ico-play').style.display = e === 'vuelo' ? 'none' : '';
    $('ico-pausa').style.display = e === 'vuelo' ? '' : 'none';
    $('btn-lanzar').classList.toggle('active', e === 'vuelo');
    const sl = $('slider-instante');
    sl.disabled = e === 'listo';
}

function lanzarOPausar() {
    if (S.mode === 'reto') { if (S.estado === 'vuelo') setEstado('pausa'); else if (S.estado === 'pausa') setEstado('vuelo'); else comprobarReto(); return; }
    const m = S.trays.main;
    if (S.estado === 'vuelo') { setEstado('pausa'); return; }
    if (S.estado === 'pausa') { setEstado('vuelo'); return; }
    if (!m || !m.valido) { anunciar(i18n.t('Desde el suelo, lánzalo hacia arriba: si no, no hay movimiento.')); return; }
    if (S.estado === 'fin') S.t = 0;
    setEstado('vuelo');
}

function reiniciar() {
    S.t = 0;
    setEstado('listo');
}

function irA(t) {
    const tf = tFinal();
    S.t = Math.min(Math.max(0, t), tf);
    setEstado(S.t >= tf - 1e-9 ? 'fin' : 'pausa');
}

function alLlegar() {
    const m = S.trays.main;
    if (!m) return;
    if (S.mode === 'reto') { valorarReto(); return; }
    if (S.conservar && S.mode === 'parab' && !S.fantasmaHecho) {
        S.fantasmas.push({ tr: m, etiqueta: `${i18n.num(m.p.ang)}° · ${i18n.num(m.p.v0, m.p.v0 % 1 ? 1 : 0)} m/s` });
        if (S.fantasmas.length > 5) S.fantasmas.shift();
        S.fantasmaHecho = true;
    }
    if (S.ocultar) anunciar(i18n.t('Ha llegado al suelo.'));
    else if (S.mode === 'parab') anunciar(i18n.t('Ha llegado al suelo: tiempo de vuelo {t} s, alcance {x} m.', { t: i18n.num(m.tf, 2), x: i18n.num(m.xf, 1) }));
    else anunciar(i18n.t('Ha llegado al suelo: tiempo de vuelo {t} s.', { t: i18n.num(m.tf, 2) }));
}

function anunciarCima(m) {
    const e = m.estadoEn(m.tCima);
    const g = i18n.num(m.g, 1);
    if (Math.abs(e.vx) < 0.05) anunciar(i18n.t('Altura máxima: v = 0 m/s; la aceleración sigue siendo {g} m/s² hacia abajo.', { g }));
    else anunciar(i18n.t('Altura máxima: vᵧ = 0, pero la velocidad no es cero: vale vₓ = {vx} m/s.', { vx: i18n.num(e.vx, 1) }));
}

// ═══════════════════════════════════════════════════════════════════
//  LANZAMIENTO: LEER EL PANEL Y CALCULAR LAS TRAYECTORIAS
// ═══════════════════════════════════════════════════════════════════
function valoresPanel() {
    if (S.mode === 'vertical') {
        const v = parseFloat($('slider-v-vert').value);
        return { h: parseFloat($('slider-h-vert').value), v0: Math.abs(v), ang: v < 0 ? -90 : 90 };
    }
    return { h: parseFloat($('slider-h-parab').value), v0: parseFloat($('slider-v-parab').value), ang: parseFloat($('slider-a-parab').value) };
}

// Recalcula todo con los valores del panel y vuelve al principio.
function recalcular() {
    const lugar = LUGARES[S.lugar];
    const aire = S.aire && lugar.aire;
    if (S.mode === 'reto') {
        S.trays = { main: null, otro: null, soltada: null, vacio: null };
        const r = S.reto;
        const base = RETOS[S.retoTipo].lanzamiento(r, S.retoX ?? 0);
        if (S.retoX !== null) S.trays.main = calcularTrayectoria({ ...base, g: G_RETO, aire: false });
        else S.trays.main = calcularTrayectoria({ ...base, v0: 0, g: G_RETO, aire: false, previa: true });
        if (S.retoX === null) S.trays.main.valido = false;
    } else {
        const p = valoresPanel();
        const base = { ...p, g: lugar.g, aire, vl: OBJETOS[S.obj].vl };
        S.trays.main = calcularTrayectoria(base);
        S.trays.otro = S.mode === 'vertical' && S.comparar ? calcularTrayectoria({ ...base, vl: OBJETOS[S.obj2].vl }) : null;
        S.trays.soltada = S.mode === 'parab' && S.soltar && p.h > 0 ? calcularTrayectoria({ ...base, v0: 0, ang: -90 }) : null;
        S.trays.vacio = aire ? calcularTrayectoria({ ...base, aire: false }) : null;
    }
    S.fantasmaHecho = false;
    reiniciar();
    actualizarEcuaciones();
    actualizarDatos();
}

// ═══════════════════════════════════════════════════════════════════
//  CONTROLES
// ═══════════════════════════════════════════════════════════════════
function llenarDesplegables() {
    const objetos = Object.entries(OBJETOS).map(([k, o]) => `<option value="${k}">${i18n.t(o.nombre)} (${textoMasa(o.masa)})</option>`).join('');
    $('select-objeto').innerHTML = objetos;
    $('select-objeto2').innerHTML = objetos;
    $('select-objeto').value = S.obj;
    $('select-objeto2').value = S.obj2;
    $('select-lugar').innerHTML = Object.entries(LUGARES)
        .map(([k, l]) => `<option value="${k}">${i18n.t(l.nombre)} (g = ${i18n.num(l.g, 1)} m/s²)</option>`).join('');
    $('select-lugar').value = S.lugar;
}

function rellenoDeslizador(sl) {
    const min = parseFloat(sl.min), max = parseFloat(sl.max), v = parseFloat(sl.value);
    if (sl.classList.contains('center-slider')) {
        const c = (0 - min) / (max - min) * 100, p = (v - min) / (max - min) * 100;
        sl.style.setProperty('--from', Math.min(c, p) + '%');
        sl.style.setProperty('--to', Math.max(c, p) + '%');
    } else sl.style.setProperty('--fill', ((v - min) / (max - min) * 100) + '%');
}

function actualizarInsignias() {
    const hV = parseFloat($('slider-h-vert').value), vV = parseFloat($('slider-v-vert').value);
    $('val-h-vert').textContent = `${i18n.num(hV)} m`;
    $('val-v-vert').textContent = vV === 0 ? i18n.t('0 m/s · soltar')
        : vV > 0 ? i18n.t('{v} m/s ↑ hacia arriba', { v: i18n.num(vV, vV % 1 ? 1 : 0) })
                 : i18n.t('{v} m/s ↓ hacia abajo', { v: i18n.num(-vV, vV % 1 ? 1 : 0) });
    $('val-h-parab').textContent = `${i18n.num(parseFloat($('slider-h-parab').value))} m`;
    const vp = parseFloat($('slider-v-parab').value);
    $('val-v-parab').textContent = `${i18n.num(vp, vp % 1 ? 1 : 0)} m/s`;
    const a = parseFloat($('slider-a-parab').value);
    $('val-a-parab').textContent = `${i18n.num(a)}°`;
    document.querySelectorAll('input[type="range"]').forEach(rellenoDeslizador);
}

function marcarGrupo(selector, activo) {
    document.querySelectorAll(selector).forEach((b) => {
        b.classList.toggle('active', b === activo);
        if (b.hasAttribute('aria-checked')) b.setAttribute('aria-checked', String(b === activo));
    });
}

function setupControles() {
    $('mode-vertical').addEventListener('click', () => setMode('vertical'));
    $('mode-parab').addEventListener('click', () => setMode('parab'));
    $('mode-reto').addEventListener('click', () => setMode('reto'));

    ['slider-h-vert', 'slider-v-vert', 'slider-h-parab', 'slider-v-parab', 'slider-a-parab'].forEach((id) => {
        $(id).addEventListener('input', () => { actualizarInsignias(); marcarEjemplo(); recalcular(); });
    });
    // Ejemplos: cargan valores en los deslizadores (no son modos)
    document.querySelectorAll('#ejemplos-vertical .preset-btn').forEach((b) => b.addEventListener('click', () => {
        $('slider-h-vert').value = b.dataset.h; $('slider-v-vert').value = b.dataset.v;
        actualizarInsignias(); marcarEjemplo(); recalcular();
    }));
    document.querySelectorAll('#ejemplos-parab .preset-btn').forEach((b) => b.addEventListener('click', () => {
        $('slider-h-parab').value = b.dataset.h; $('slider-v-parab').value = b.dataset.v; $('slider-a-parab').value = b.dataset.a;
        actualizarInsignias(); marcarEjemplo(); recalcular();
    }));

    $('select-objeto').addEventListener('change', (e) => { S.obj = e.target.value; recalcular(); });
    $('select-objeto2').addEventListener('change', (e) => { S.obj2 = e.target.value; recalcular(); });
    $('select-lugar').addEventListener('change', (e) => { S.lugar = e.target.value; actualizarAire(); recalcular(); });
    $('check-aire').addEventListener('change', (e) => { S.aire = e.target.checked; actualizarAire(); recalcular(); });
    $('check-comparar').addEventListener('change', (e) => { S.comparar = e.target.checked; $('wrap-objeto2').hidden = !S.comparar; recalcular(); });
    $('check-soltar').addEventListener('change', (e) => { S.soltar = e.target.checked; recalcular(); });
    $('check-conservar').addEventListener('change', (e) => { S.conservar = e.target.checked; if (!S.conservar) S.fantasmas = []; });
    $('check-vectores').addEventListener('change', (e) => { S.vectores = e.target.checked; });
    $('check-proyecciones').addEventListener('change', (e) => { S.proy = e.target.checked; });
    $('check-pausa-cima').addEventListener('change', (e) => { S.pausaCima = e.target.checked; });
    $('check-ocultar').addEventListener('change', (e) => { S.ocultar = e.target.checked; actualizarDatos(); });

    document.querySelectorAll('[data-estela]').forEach((b) => b.addEventListener('click', () => {
        S.estela = parseFloat(b.dataset.estela); marcarGrupo('[data-estela]', b);
    }));
    document.querySelectorAll('[data-speed]').forEach((b) => b.addEventListener('click', () => {
        S.speed = parseFloat(b.dataset.speed); marcarGrupo('[data-speed]', b);
    }));
    // En los grupos de opciones, las flechas pasan a la opción vecina
    document.querySelectorAll('[role="radiogroup"]').forEach((grupo) => {
        grupo.addEventListener('keydown', (e) => {
            const paso = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
            if (!paso) return;
            e.preventDefault();
            const btns = [...grupo.querySelectorAll('button')];
            const i = btns.indexOf(document.activeElement);
            const sig = btns[(i + paso + btns.length) % btns.length];
            sig.focus(); sig.click();
        });
    });

    $('btn-lanzar').addEventListener('click', lanzarOPausar);
    $('btn-reiniciar').addEventListener('click', reiniciar);
    $('btn-graficas').addEventListener('click', () => {
        S.graficas = !S.graficas;
        $('btn-graficas').setAttribute('aria-pressed', String(S.graficas));
    });

    // Instante: un solo control del tiempo; − y + avanzan un punto de la estela
    const sl = $('slider-instante');
    sl.addEventListener('input', () => irA(parseFloat(sl.value) / 1000 * tFinal()));
    $('btn-menos').addEventListener('click', () => {
        if (S.estado === 'listo') return;
        const n = Math.ceil(S.t / S.estela - 1e-6) - 1;
        irA(Math.max(0, n) * S.estela);
    });
    $('btn-mas').addEventListener('click', () => {
        if (S.estado === 'listo' && !(S.trays.main && S.trays.main.valido)) return;
        const n = Math.floor(S.t / S.estela + 1e-6) + 1;
        irA(Math.min(n * S.estela, tFinal()));
    });

    // Retos
    document.querySelectorAll('[data-reto]').forEach((b) => b.addEventListener('click', () => nuevoReto(b.dataset.reto)));
    $('reto-nuevo').addEventListener('click', () => nuevoReto(S.retoTipo));
    $('reto-lanzar').addEventListener('click', comprobarReto);
    $('reto-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); comprobarReto(); } });

    // Teclado: barra espaciadora (lanzar o pausar) y R (reiniciar), si el foco no está en un control
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.target.closest('button, input, select, textarea, summary, a')) return;
        if (e.key === ' ') { e.preventDefault(); lanzarOPausar(); }
        else if (e.key === 'r' || e.key === 'R') reiniciar();
    });

    actualizarInsignias();
    actualizarAire();
}

function marcarEjemplo() {
    const marcar = (sel, coincide) => document.querySelectorAll(sel).forEach((b) => b.classList.toggle('active', coincide(b)));
    marcar('#ejemplos-vertical .preset-btn', (b) => b.dataset.h === $('slider-h-vert').value && parseFloat(b.dataset.v) === parseFloat($('slider-v-vert').value));
    marcar('#ejemplos-parab .preset-btn', (b) => b.dataset.h === $('slider-h-parab').value && parseFloat(b.dataset.v) === parseFloat($('slider-v-parab').value) && b.dataset.a === $('slider-a-parab').value);
}

// El aire solo se modela en la Tierra
function actualizarAire() {
    const hay = LUGARES[S.lugar].aire;
    const chk = $('check-aire');
    chk.disabled = !hay;
    chk.closest('.check-row').classList.toggle('disabled', !hay);
    if (!hay) {
        $('aire-hint').textContent = S.lugar === 'luna'
            ? i18n.t('En la Luna no hay aire: todo cae igual, como la pluma y el martillo del Apolo 15.')
            : i18n.t('En esta simulación solo se tiene en cuenta el aire de la Tierra.');
    } else {
        $('aire-hint').textContent = i18n.t('Con aire: el rozamiento frena a cada objeto de forma distinta.');
    }
}

// ═══════════════════════════════════════════════════════════════════
//  MODOS
// ═══════════════════════════════════════════════════════════════════
function setMode(mode) {
    S.mode = mode;
    document.body.classList.remove('mode-vertical', 'mode-parab', 'mode-reto');
    document.body.classList.add('mode-' + mode);
    ['vertical', 'parab', 'reto'].forEach((m) => {
        const btn = $('mode-' + m);
        btn.classList.toggle('active', m === mode);
        btn.setAttribute('aria-selected', String(m === mode));
    });
    S.fantasmas = [];
    $('h-vy').textContent = mode === 'vertical' ? i18n.t('Velocidad v') : i18n.t('Velocidad vᵧ');
    if (mode === 'reto') { nuevoReto(S.retoTipo); }
    else { marcarEjemplo(); recalcular(); }
    fitCanvas();
}

// ═══════════════════════════════════════════════════════════════════
//  RETO
// ═══════════════════════════════════════════════════════════════════
function nuevoReto(tipo) {
    S.retoTipo = tipo;
    marcarGrupo('[data-reto]', document.querySelector(`[data-reto="${tipo}"]`));
    S.reto = RETOS[tipo].crear();
    S.retoIntentos = 0;
    S.retoX = null;
    $('reto-enunciado').textContent = RETOS[tipo].enunciado(S.reto);
    $('reto-pregunta').textContent = RETOS[tipo].pregunta();
    $('reto-unidad').textContent = RETOS[tipo].unidad;
    $('reto-input').value = '';
    $('reto-input').disabled = false;
    $('reto-lanzar').disabled = false;
    $('reto-feedback').textContent = '';
    $('reto-feedback').className = 'reto-feedback';
    $('reto-pista').textContent = '';
    recalcular();
}

function comprobarReto() {
    const x = leerNumero($('reto-input').value);
    const def = RETOS[S.retoTipo];
    if (x === null || x < 0 || (S.retoTipo === 'angulos' && x > 90)) {
        $('reto-feedback').textContent = i18n.t('Escribe un número (puedes usar coma decimal).');
        $('reto-feedback').className = 'reto-feedback mal';
        $('reto-input').focus();
        return;
    }
    if (S.retoTipo !== 'tarda' && x <= 0) return;
    S.retoX = x;
    S.retoIntentos++;
    recalcular();
    $('reto-feedback').textContent = i18n.t('Lanzando…');
    $('reto-feedback').className = 'reto-feedback';
    setEstado('vuelo');
}

function valorarReto() {
    const def = RETOS[S.retoTipo];
    const res = def.valorar(S.reto, S.retoX, S.trays.main);
    const fb = $('reto-feedback');
    fb.textContent = res.msg;
    fb.className = 'reto-feedback ' + (res.ok ? 'bien' : 'mal');
    anunciar(res.msg);
    if (res.ok && !res.sigue) {
        $('reto-pista').textContent = i18n.t('Pulsa «Nuevo reto» para otro con datos distintos.');
    } else if (!res.ok && res.fin) {
        $('reto-pista').textContent = def.pista() + ' ' + i18n.t('La respuesta era {s} {u}.', { s: i18n.num(S.reto.sol, 2), u: def.unidad });
        $('reto-input').disabled = true; $('reto-lanzar').disabled = true;
    } else if (!res.ok && S.retoIntentos >= 2) {
        $('reto-pista').textContent = def.pista();
    } else if (res.sigue) {
        $('reto-pista').textContent = '';
        $('reto-input').value = '';
    }
}

// Lo que se dibuja de cada reto: balcón, azotea, mesa, diana y cotas
function dibujarReto() {
    const r = S.reto;
    if (!r) return;
    textSize(13);
    if (S.retoTipo === 'balcon') {
        // Edificio con balcón a la altura H, a la derecha del punto de lanzamiento
        const xE = sx(0) + 46, ancho = 130;
        stroke(THEME.platformEdge); strokeWeight(1.5); fill(THEME.platform);
        rect(xE, sy(r.H + 3), ancho, (r.H + 3) * VIEW.k);
        fill(THEME.balcony); noStroke();
        rect(xE - 30, sy(r.H) - 3, 30, 4);
        stroke(THEME.balcony); strokeWeight(2);
        for (let i = 0; i <= 4; i++) line(xE - 28 + i * 7, sy(r.H) - 3, xE - 28 + i * 7, sy(r.H) - 22);
        line(xE - 30, sy(r.H) - 22, xE, sy(r.H) - 22);
        cota(xE + ancho + 16, sy(0), sy(r.H), `H = ${i18n.num(r.H)} m`, true);
        stroke(THEME.target); strokeWeight(1); drawingContext.setLineDash([6, 5]);
        line(sx(0) - 20, sy(r.H), xE - 30, sy(r.H));
        drawingContext.setLineDash([]);
    } else if (S.retoTipo === 'tarda') {
        cota(sx(0) + 40, sy(0), sy(r.h), `h = ${i18n.num(r.h)} m`);
    } else {
        if (S.retoTipo === 'diana') cota(sx(0) - PLAT_PX + 10, sy(0), sy(r.h), `h = ${i18n.num(r.h, r.h % 1 ? 2 : 0)} m`);
        // Diana en el suelo, de 1 m de diámetro
        const X = sx(r.D), Y = sy(0), w = Math.max(1 * VIEW.k, 14);
        noStroke();
        fill(THEME.target); ellipse(X, Y, w, 9);
        fill(THEME.canvasBg); ellipse(X, Y, w * 0.66, 6);
        fill(THEME.target); ellipse(X, Y, w * 0.33, 3.5);
        stroke(THEME.target); strokeWeight(2); line(X, Y, X, Y - 34);
        noStroke(); fill(THEME.target); triangle(X, Y - 34, X + 16, Y - 29, X, Y - 24);
        cotaH(sx(0), X, Y + 28, `D = ${i18n.num(r.D)} m`);
    }
}

function cota(x, y1, y2, txt, arriba = false) {
    stroke(THEME.mark); strokeWeight(1);
    line(x, y1, x, y2); line(x - 5, y1, x + 5, y1); line(x - 5, y2, x + 5, y2);
    noStroke(); fill(THEME.mark); textAlign(LEFT, CENTER); textSize(13);
    text(txt, x + 8, arriba ? y2 + 14 : (y1 + y2) / 2);
}
function cotaH(x1, x2, y, txt) {
    stroke(THEME.mark); strokeWeight(1);
    line(x1, y, x2, y); line(x1, y - 5, x1, y + 5); line(x2, y - 5, x2, y + 5);
    noStroke(); fill(THEME.mark); textAlign(CENTER, TOP); textSize(13);
    text(txt, (x1 + x2) / 2, y + 3);
}

// ═══════════════════════════════════════════════════════════════════
//  TEXTOS: FRANJA, DATOS Y ECUACIONES
// ═══════════════════════════════════════════════════════════════════
// Nombre del movimiento, deducido de las condiciones iniciales, y aviso si hay aire
function tipoMovimiento(p, aire) {
    let tipo;
    if (p.v0 === 0) tipo = 'caida';
    else if (p.ang === 90) tipo = 'arriba';
    else if (p.ang === -90) tipo = 'abajo';
    else if (p.ang === 0) tipo = 'horizontal';
    else tipo = p.ang > 0 ? 'oblicuo' : 'oblicuo-abajo';
    const nombres = {
        caida: aire ? i18n.t('Caída con aire') : i18n.t('Caída libre'),
        arriba: i18n.t('Tiro vertical hacia arriba'),
        abajo: i18n.t('Tiro vertical hacia abajo'),
        horizontal: i18n.t('Tiro horizontal'),
        oblicuo: i18n.t('Tiro oblicuo'),
        'oblicuo-abajo': i18n.t('Tiro oblicuo hacia abajo'),
    };
    let aviso = '';
    if (aire) {
        const recto = tipo === 'caida' || tipo === 'arriba' || tipo === 'abajo';
        aviso = tipo === 'caida' ? i18n.t('con aire ya no es caída libre')
              : recto ? i18n.t('con aire ya no es un MRUA')
                      : i18n.t('con aire la trayectoria ya no es una parábola');
    }
    return [nombres[tipo], aviso];
}

function textoFranja() {
    if (S.mode === 'reto') {
        const n = { balcon: 'Reto: hasta el balcón', tarda: 'Reto: ¿cuánto tarda?', diana: 'Reto: a la diana', angulos: 'Reto: dos ángulos' }[S.retoTipo];
        return [i18n.t(n), i18n.t('Calcula, escribe tu respuesta y comprueba')];
    }
    const m = S.trays.main;
    if (!m) return ['', ''];
    if (!m.valido) return [i18n.t('Sin movimiento'), i18n.t('Desde el suelo, lánzalo hacia arriba')];
    const lugar = LUGARES[S.lugar];
    const [nombre, aviso] = tipoMovimiento(m.p, m.aire);
    const sub = `${i18n.t(lugar.nombre)} · g = ${i18n.num(lugar.g, 1)} m/s² · ` + (aviso || i18n.t('sin aire'));
    return [nombre, sub];
}

const dirFlecha = (v) => Math.abs(v) < 0.05 ? '' : v > 0 ? '↑' : '↓';

function actualizarDatos() {
    const m = S.trays.main;
    const e = m ? m.estadoEn(Math.min(S.t, m.tf)) : { t: 0, x: 0, y: 0, vx: 0, vy: 0 };
    const enReposo = !m || !m.valido;
    const cero = (v) => Math.abs(v) < 0.005 ? 0 : v;
    $('m-t').textContent = i18n.num(S.t, 2);
    $('m-x').textContent = i18n.num(cero(e.x), 1);
    $('m-y').textContent = i18n.num(cero(e.y), 1);
    const vy = enReposo ? 0 : e.vy;
    $('m-vx').textContent = i18n.num(cero(e.vx), 1);
    $('m-vy').textContent = (cero(vy) < 0 ? '−' : '') + i18n.num(Math.abs(cero(vy)), 1);
    $('m-vy-dir').textContent = dirFlecha(cero(vy));
    $('m-v').textContent = i18n.num(Math.hypot(e.vx, vy), 1);

    // Instante
    const tf = tFinal();
    const sl = $('slider-instante');
    if (document.activeElement !== sl) sl.value = tf > 0 ? Math.round(S.t / tf * 1000) : 0;
    $('val-instante').textContent = `${i18n.num(S.t, 2)} s`;
    rellenoDeslizador(sl);

    // Resultados
    if (S.mode === 'reto') return;
    const q = (txt) => S.ocultar ? '?' : txt;
    if (enReposo) { ['r-t', 'r-h', 'r-x', 'r-v'].forEach((id) => { $(id).textContent = '—'; }); $('r-otro').hidden = true; return; }
    $('r-t').textContent = q(`${i18n.num(m.tf, 2)} s`);
    $('r-h').textContent = q(`${i18n.num(m.yMax, 1)} m`);
    $('r-x').textContent = q(`${i18n.num(m.xf, 1)} m`);
    if (S.mode === 'vertical') $('r-v').textContent = q(`−${i18n.num(Math.abs(m.vfy), 1)} m/s ↓`);
    else $('r-v').textContent = q(`${i18n.num(Math.hypot(m.vfx, m.vfy), 1)} m/s`);
    const o = S.trays.otro;
    $('r-otro').hidden = !o;
    if (o) $('r-otro').textContent = i18n.t('{obj}: llega al suelo en {t} s', { obj: i18n.t(OBJETOS[S.obj2].nombre), t: q(i18n.num(o.tf, 2)) });
}

// Ecuaciones con los valores ya sustituidos
function actualizarEcuaciones() {
    const m = S.trays.main;
    const cont = $('ecuaciones');
    const nota = $('ecuaciones-nota');
    if (!m || S.mode === 'reto') { cont.innerHTML = ''; return; }
    // Número con su signo como «−» y hasta dos decimales
    const n = (v) => (v < 0 ? '−' : '') + i18n.num(+Math.abs(v).toFixed(2));
    // Término que se suma o se resta: « + 7,5·t», « − 4,9·t²» (nada si es cero)
    const term = (c, txt) => Math.abs(c) < 1e-9 ? '' : (c > 0 ? ' + ' : ' − ') + i18n.num(+Math.abs(c).toFixed(2)) + txt;
    const expr = (c0, ...terms) => {
        let s = Math.abs(c0) < 1e-9 ? '' : n(c0);
        for (const [c, txt] of terms) {
            const t = term(c, txt);
            s += s === '' ? (t.startsWith(' − ') ? '−' + t.slice(3) : t.slice(3)) : t;
        }
        return s || '0';
    };
    const g = m.g;
    const vy = S.mode === 'parab' ? 'vᵧ' : 'v';
    const filas = [];
    if (S.mode === 'parab') {
        filas.push([i18n.t('Posición x'), `x = ${expr(0, [m.vx0, '·t'])}`]);
        filas.push([i18n.t('Velocidad vₓ'), `vₓ = ${n(m.vx0)} ${i18n.t('(constante)')}`]);
    }
    filas.push([i18n.t('Altura y'), `y = ${expr(m.p.h, [m.vy0, '·t'], [-g / 2, '·t²'])}`]);
    filas.push([S.mode === 'parab' ? i18n.t('Velocidad vᵧ') : i18n.t('Velocidad v'), `${vy} = ${expr(m.vy0, [-g, '·t'])}`]);
    filas.push([i18n.t('Aceleración'), `a = −${i18n.num(g, 1)} m/s² ${i18n.t('(siempre)')}`]);
    if (S.mode === 'parab' && Math.abs(m.vx0) > 1e-6) {
        const tanA = m.vy0 / m.vx0, coef = g / (2 * m.vx0 * m.vx0);
        filas.push([i18n.t('Trayectoria'), `y = ${expr(m.p.h, [tanA, '·x'])}${' − ' + i18n.num(+coef.toPrecision(3))}·x²`]);
    }
    cont.innerHTML = filas.map(([a, b]) => `<div class="formula"><span class="formula-name">${a}</span><span class="formula-eq">${b}</span></div>`).join('');
    nota.textContent = m.aire
        ? i18n.t('Con aire estas ecuaciones ya no valen: la simulación calcula el movimiento paso a paso. Son las del mismo lanzamiento sin aire.')
        : i18n.t('Unidades del SI: t en s, posiciones en m y velocidades en m/s. Origen en el suelo, debajo del punto de lanzamiento; sentido positivo hacia arriba.');
}

// ═══════════════════════════════════════════════════════════════════
//  TAMAÑO DEL CANVAS Y ACCESIBILIDAD
// ═══════════════════════════════════════════════════════════════════
function fitCanvas() {
    const cont = $('canvas-container');
    const cv = cont.querySelector('canvas');
    if (!cv) return;
    const cs = getComputedStyle(cont);
    const w = cont.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const apilado = window.matchMedia('(max-width: 1100px)').matches;
    const h = apilado ? Infinity : cont.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const s = Math.max(0.1, Math.min(w / CV_W, h / CV_H));
    cv.style.width = Math.floor(CV_W * s) + 'px';
    cv.style.height = Math.floor(CV_H * s) + 'px';
}
function windowResized() { fitCanvas(); }

function anunciar(txt) { $('anuncio').textContent = txt; }

// ═══════════════════════════════════════════════════════════════════
//  TEMAS (SimulaCiencia · oscuro · claro · alto contraste)
// ═══════════════════════════════════════════════════════════════════
function setupThemeSelector() {
    const themeBtn = $('theme-btn');
    const themePanel = $('theme-panel');
    const themeOpts = document.querySelectorAll('.theme-opt');
    const closePanel = () => {
        themePanel.classList.remove('open');
        themePanel.setAttribute('aria-hidden', 'true');
        themeBtn.classList.remove('active');
        themeBtn.setAttribute('aria-expanded', 'false');
    };
    themeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = themePanel.classList.toggle('open');
        themeBtn.classList.toggle('active', isOpen);
        themeBtn.setAttribute('aria-expanded', String(isOpen));
        themePanel.setAttribute('aria-hidden', String(!isOpen));
    });
    document.addEventListener('click', (e) => {
        if (!themeBtn.contains(e.target) && !themePanel.contains(e.target)) closePanel();
    });
    themeOpts.forEach((btn) => {
        btn.addEventListener('click', () => {
            const theme = btn.dataset.theme;
            document.body.classList.remove('theme-light', 'theme-contrast', 'theme-marca');
            if (theme === 'marca') document.body.classList.add('theme-light', 'theme-marca');
            else if (theme !== 'dark') document.body.classList.add('theme-' + theme);
            themeOpts.forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            closePanel();
        });
    });
}

// Colores del lienzo. Velocidad en cian (el acento) y aceleración en naranja
// en los cuatro temas, para que se asocien siempre igual.
function updateTheme() {
    const b = document.body.classList;
    if (b.contains('theme-marca')) {
        THEME = {
            canvasBg: '#f8fafc', bannerBg: '#ffffff', border: '#e2e8f0', text: '#1e293b', textDim: '#64748b', accent: '#0369a1',
            grid: '#e2e8f0', axis: '#475569', ground: '#e7e5df', groundEdge: '#a8a29e', platform: '#e2e8f0', platformEdge: '#94a3b8', window: '#cbd5e1',
            person: '#64748b', trail: '#0369a1', obj2Trail: '#6d28d9', drop: '#b45309', vel: '#0369a1', vComp: '#38a3d6', acc: '#c2410c',
            proj: '#0f766e', projDots: '#0f766e', projText: '#0f766e', pairs: '#b45309', mark: '#334155', ghost: '#cbd5e1', ghostText: '#64748b',
            vacuum: '#94a3b8', target: '#dc2626', balcony: '#475569', graphBg: '#ffffff', graphX: '#0f766e', graphY: '#0369a1',
            steel: '#9aa4b0', steelDark: '#5a6470', objEdge: '#475569', feather: '#d6d3d1', featherQuill: '#78716c',
        };
    } else if (b.contains('theme-light')) {
        THEME = {
            canvasBg: '#dfe6f0', bannerBg: '#ccd6e8', border: '#a8b8cc', text: '#0d1520', textDim: '#4a5a6a', accent: '#0077a0',
            grid: '#c4cedc', axis: '#3a4a60', ground: '#c9c2b4', groundEdge: '#8a8070', platform: '#b4c0d2', platformEdge: '#6a7a90', window: '#9aa8bc',
            person: '#4a5a70', trail: '#0077a0', obj2Trail: '#7a3fc0', drop: '#b06a00', vel: '#0077a0', vComp: '#3a9ac8', acc: '#c8501a',
            proj: '#127652', projDots: '#127652', projText: '#127652', pairs: '#b06a00', mark: '#1a2a3a', ghost: '#9aa8bc', ghostText: '#4a5a6a',
            vacuum: '#6a7a90', target: '#d02a2a', balcony: '#3a4a60', graphBg: '#e8edf5', graphX: '#127652', graphY: '#0077a0',
            steel: '#a0aab6', steelDark: '#5a6470', objEdge: '#3a4a60', feather: '#f2efe8', featherQuill: '#7a7060',
        };
    } else if (b.contains('theme-contrast')) {
        THEME = {
            canvasBg: '#000000', bannerBg: '#000000', border: '#ffff00', text: '#ffffff', textDim: '#cccccc', accent: '#00ffff',
            grid: '#333300', axis: '#ffffff', ground: '#1a1a1a', groundEdge: '#ffff00', platform: '#000000', platformEdge: '#ffffff', window: '#444444',
            person: '#ffffff', trail: '#00ffff', obj2Trail: '#ff66ff', drop: '#ffff00', vel: '#00ffff', vComp: '#88ffff', acc: '#ffaa00',
            proj: '#00ff88', projDots: '#00ff88', projText: '#00ff88', pairs: '#ffff00', mark: '#ffffff', ghost: '#777777', ghostText: '#cccccc',
            vacuum: '#aaaaaa', target: '#ff3333', balcony: '#ffffff', graphBg: '#000000', graphX: '#00ff88', graphY: '#00ffff',
            steel: '#cccccc', steelDark: '#888888', objEdge: '#ffffff', feather: '#ffffff', featherQuill: '#aaaaaa',
        };
    } else {
        THEME = {
            canvasBg: '#141414', bannerBg: '#181818', border: '#272727', text: '#d8d8d8', textDim: '#8a8a8a', accent: '#00c8ff',
            grid: '#1f262e', axis: '#7a8898', ground: '#2a2620', groundEdge: '#5a5040', platform: '#1c2630', platformEdge: '#3a4a5a', window: '#2a3a4a',
            person: '#8a98a8', trail: '#00c8ff', obj2Trail: '#c08aff', drop: '#ffd24a', vel: '#00c8ff', vComp: '#7adfff', acc: '#ff9a4a',
            proj: '#55cc80', projDots: '#55cc80', projText: '#55cc80', pairs: '#ffd24a', mark: '#e0e0e0', ghost: '#4a5258', ghostText: '#8a9298',
            vacuum: '#8a8a8a', target: '#ff5a5a', balcony: '#9aa8b8', graphBg: '#111111', graphX: '#55cc80', graphY: '#00c8ff',
            steel: '#b8c0c8', steelDark: '#6a7480', objEdge: '#20262c', feather: '#ece8de', featherQuill: '#9a9080',
        };
    }
}
