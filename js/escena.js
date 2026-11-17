'use strict';
// ═══════════════════════════════════════════════════════════════════
//  DIBUJO DEL LIENZO: ESCENARIO, ESTELA, VECTORES Y GRÁFICAS
// ═══════════════════════════════════════════════════════════════════
const CV_W = 1050, CV_H = 700;
const BANNER_H = 44;
const K_V = 3;      // píxeles por cada m/s en las flechas de velocidad
const K_A = 4.5;    // píxeles por cada m/s² en la flecha de aceleración
const PLAT_PX = 64; // ancho de la plataforma (no está a escala)

let VIEW = null;    // { k (px/m), ox, oy (píxeles del origen), rect, paso (m) }

// ── Transformación mundo → lienzo ─────────────────────────────────
const sx = (x) => VIEW.ox + x * VIEW.k;
const sy = (y) => VIEW.oy - y * VIEW.k;

function rectEscena() {
    const bottom = S.graficas ? 440 : S.mode === 'reto' ? CV_H - 52 : CV_H - 34;
    return { l: 58, r: CV_W - 22, t: BANNER_H + 14, b: bottom };
}

// Paso «redondo» de la cuadrícula para que haya entre 4 y 10 líneas.
function pasoRedondo(rango, objetivo) {
    const bruto = rango / objetivo;
    const p = Math.pow(10, Math.floor(Math.log10(bruto)));
    const f = bruto / p;
    return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * p;
}

// Calcula la escala para que quepa todo lo que hay que dibujar. La escala se
// redondea a escalones (×1,19) para que no tiemble al mover un deslizador.
function calcularVista(trays) {
    const R = rectEscena();
    let xMax = 0, yMax = 2;
    for (const tr of trays) {
        if (!tr) continue;
        yMax = Math.max(yMax, tr.yMax, tr.p.h);
        for (const q of tr.pts) xMax = Math.max(xMax, q.x);
    }
    if (S.mode === 'reto' && S.reto) {
        if (S.reto.D) xMax = Math.max(xMax, S.reto.D + 1.5);
        if (S.reto.H) yMax = Math.max(yMax, S.reto.H * 1.15);
    }
    let k, ox;
    const H = R.b - R.t;
    if (S.mode === 'vertical') {
        yMax = Math.max(yMax, 8);
        k = H / (yMax * 1.1);
        ox = R.l + (R.r - R.l) * 0.40;
    } else {
        ox = R.l + PLAT_PX + 8;
        const W = R.r - ox - 30;
        xMax = Math.max(xMax, 8);
        yMax = Math.max(yMax, 4);
        k = Math.min(W / (xMax * 1.04), H / (yMax * 1.12));
    }
    k = Math.pow(2, Math.floor(Math.log2(k) * 4) / 4);
    const paso = pasoRedondo(H / k, 6);
    VIEW = { k, ox, oy: R.b, rect: R, paso };
}

// ── Escenario ─────────────────────────────────────────────────────
function dibujarEscenario() {
    const R = VIEW.rect;
    // Suelo
    noStroke(); fill(THEME.ground);
    rect(0, R.b, CV_W, (S.graficas ? 452 : CV_H) - R.b);
    stroke(THEME.groundEdge); strokeWeight(2);
    line(0, R.b, CV_W, R.b);
    // Cuadrícula en metros
    strokeWeight(1);
    textSize(11);
    textAlign(RIGHT, CENTER);
    for (let y = 0; sy(y) >= R.t - 1; y += VIEW.paso) {
        stroke(THEME.grid);
        line(R.l, sy(y), R.r, sy(y));
        noStroke(); fill(THEME.textDim);
        text(i18n.num(+y.toFixed(6)), R.l - 8, sy(y));
    }
    if (S.mode !== 'vertical') {
        textAlign(CENTER, TOP);
        for (let x = VIEW.paso; sx(x) <= R.r; x += VIEW.paso) {
            stroke(THEME.grid);
            line(sx(x), R.t, sx(x), R.b - 1);
            noStroke(); fill(THEME.textDim);
            text(i18n.num(+x.toFixed(6)), sx(x), R.b + 6);
        }
    }

    // Plataforma o edificio desde el que se lanza
    const h0 = S.trays.main ? S.trays.main.p.h : 0;
    if (h0 > 0) {
        const ancho = S.mode === 'vertical' ? 110 : PLAT_PX;
        const x0 = sx(0) - ancho;
        stroke(THEME.platformEdge); strokeWeight(1.5); fill(THEME.platform);
        rect(x0, sy(h0), ancho, h0 * VIEW.k);
        // Ventanas si el edificio es alto, para que se lea como edificio
        if (h0 * VIEW.k > 60) {
            noStroke(); fill(THEME.window);
            const plantas = Math.floor(h0 / 3);
            for (let i = 0; i < plantas; i++) {
                const yy = sy(3 * i + 2.2);
                if (3 * VIEW.k < 7) break;
                for (let c = 0; c < (ancho > 80 ? 3 : 2); c++) {
                    rect(x0 + 10 + c * (ancho - 20) / (ancho > 80 ? 3 : 2), yy, Math.min(14, (ancho - 30) / 3), Math.min(1.2 * VIEW.k, 10));
                }
            }
        }
    }
    // Persona de 1,7 m como referencia de tamaño
    dibujarPersona(sx(0) - (S.mode === 'vertical' ? 70 : 34), sy(h0), 1.7 * VIEW.k);

    // Ejes con su origen
    dibujarEjes();
}

function dibujarPersona(x, ySuelo, alto) {
    if (alto < 6) {
        // Demasiado pequeña: se dibuja una raya con su altura rotulada al lado
        stroke(THEME.person); strokeWeight(2);
        line(x, ySuelo, x, ySuelo - Math.max(alto, 3));
        return;
    }
    const cab = alto * 0.13;
    stroke(THEME.person); strokeWeight(Math.max(1.5, alto * 0.06)); noFill();
    const yCad = ySuelo - alto * 0.48, yHom = ySuelo - alto * 0.80;
    line(x, yCad, x - alto * 0.12, ySuelo);
    line(x, yCad, x + alto * 0.12, ySuelo);
    line(x, yCad, x, yHom);
    line(x, yHom + alto * 0.04, x - alto * 0.16, yCad + alto * 0.05);
    line(x, yHom + alto * 0.04, x + alto * 0.16, yCad + alto * 0.05);
    noStroke(); fill(THEME.person);
    circle(x, ySuelo - alto + cab, cab * 2);
    if (alto > 26) {
        fill(THEME.textDim); textSize(10); textAlign(CENTER, BOTTOM);
        text(`${i18n.num(1.7, 1)} m`, x, ySuelo - alto - 2);
    }
}

function dibujarEjes() {
    const R = VIEW.rect;
    const x0 = sx(0), y0 = sy(0);
    stroke(THEME.axis); strokeWeight(1.6); fill(THEME.axis);
    // Eje Y
    const yTop = R.t + 4;
    line(x0, y0, x0, yTop);
    triangle(x0, yTop - 7, x0 - 4.5, yTop + 2, x0 + 4.5, yTop + 2);
    noStroke(); textSize(12); textAlign(LEFT, CENTER);
    text(i18n.t('y (m)'), x0 + 8, yTop);
    // Eje X
    if (S.mode !== 'vertical') {
        stroke(THEME.axis);
        line(x0, y0, R.r - 4, y0);
        triangle(R.r + 3, y0, R.r - 6, y0 - 4.5, R.r - 6, y0 + 4.5);
        noStroke(); textAlign(RIGHT, BOTTOM);
        text(i18n.t('x (m)'), R.r, y0 - 6);
    }
    textAlign(RIGHT, TOP); textSize(12); fill(THEME.axis);
    text('O', x0 - 4, y0 + 3);
}

// ── Objetos ───────────────────────────────────────────────────────
function dibujarObjeto(tipo, x, y, vx, vy) {
    const o = OBJETOS[tipo];
    const r = o.r;
    push();
    translate(x, y - r);   // apoyado: el punto (x, y) es la base del objeto
    switch (tipo) {
        case 'acero':
            noStroke(); fill(THEME.steelDark); circle(0, 0, 2 * r);
            fill(THEME.steel); circle(-1, -1, 2 * r - 3);
            fill(255, 255, 255, 180); circle(-r * 0.35, -r * 0.35, r * 0.6);
            break;
        case 'baloncesto':
            stroke(40, 20, 10); strokeWeight(1.2); fill('#e8742a'); circle(0, 0, 2 * r);
            noFill(); line(-r, 0, r, 0); line(0, -r, 0, r);
            arc(-r * 1.15, 0, r * 1.6, r * 2, -0.9, 0.9); arc(r * 1.15, 0, r * 1.6, r * 2, PI - 0.9, PI + 0.9);
            break;
        case 'tenis':
            stroke(THEME.objEdge); strokeWeight(1); fill('#cfe23a'); circle(0, 0, 2 * r);
            stroke(255); strokeWeight(1.4); noFill();
            arc(-r * 1.1, 0, r * 1.5, r * 1.9, -1, 1); arc(r * 1.1, 0, r * 1.5, r * 1.9, PI - 1, PI + 1);
            break;
        case 'pingpong':
            stroke(THEME.objEdge); strokeWeight(1); fill('#ff8c2a'); circle(0, 0, 2 * r);
            noStroke(); fill(255, 255, 255, 150); circle(-r * 0.3, -r * 0.3, r * 0.6);
            break;
        case 'papel': {
            stroke(THEME.objEdge); strokeWeight(1); fill('#e9e6dc');
            beginShape();
            const n = 11;
            for (let i = 0; i < n; i++) {
                const a = TWO_PI * i / n;
                const rr = r * (0.82 + 0.18 * Math.sin(i * 2.7));
                vertex(rr * Math.cos(a), rr * Math.sin(a));
            }
            endShape(CLOSE);
            stroke(150, 145, 130); line(-r * 0.4, -r * 0.3, r * 0.2, r * 0.1); line(-r * 0.1, r * 0.4, r * 0.5, -r * 0.2);
            break;
        }
        case 'pluma': {
            // Orientada según la velocidad (cae «de lado» si va despacio)
            const ang = (Math.hypot(vx, vy) > 0.3) ? Math.atan2(-vy, vx) : -0.4;
            rotate(ang + HALF_PI * 0.6);
            noStroke(); fill(THEME.feather);
            beginShape();
            vertex(0, -r * 1.3); bezierVertex(r * 0.7, -r * 0.6, r * 0.6, r * 0.6, 0, r * 1.3);
            bezierVertex(-r * 0.6, r * 0.6, -r * 0.7, -r * 0.6, 0, -r * 1.3);
            endShape(CLOSE);
            stroke(THEME.featherQuill); strokeWeight(1.2); line(0, -r * 1.3, 0, r * 1.6);
            break;
        }
    }
    pop();
}

// Bola auxiliar (la que se suelta a la vez en el modo parabólico)
function dibujarBolaAuxiliar(x, y) {
    noStroke(); fill(THEME.drop); circle(x, y - 7, 14);
    fill(255, 255, 255, 120); circle(x - 2.5, y - 9.5, 4);
}

// ── Estela estroboscópica ─────────────────────────────────────────
// Un punto cada Δt. En el modo vertical, los puntos de subida van huecos y los
// de bajada rellenos, porque coinciden en la misma vertical.
function dibujarEstela(tr, t, col, desplX = 0, offY = 8, radio = 4) {
    if (!tr || !tr.valido) return;
    const dt = S.estela;
    // Trayectoria recorrida, muy tenue
    stroke(red(col), green(col), blue(col), 60); strokeWeight(1.5); noFill();
    beginShape();
    for (const q of tr.pts) { if (q.t > t) break; vertex(sx(q.x) + desplX, sy(q.y) - offY); }
    const e = tr.estadoEn(t); vertex(sx(e.x) + desplX, sy(e.y) - offY);
    endShape();
    const n = Math.floor(t / dt + 1e-6);
    for (let i = 0; i <= n; i++) {
        const q = tr.estadoEn(i * dt);
        const subiendo = Math.abs(tr.vx0) < 1e-9 && q.vy > 1e-9;
        if (subiendo) { noFill(); stroke(col); strokeWeight(1.6); }
        else { noStroke(); fill(col); }
        circle(sx(q.x) + desplX, sy(q.y) - offY, radio * 2);
    }
}

// Trayectorias que se conservan (en gris, con su ángulo y su rapidez)
function dibujarFantasmas(offY = 8) {
    for (const f of S.fantasmas) {
        stroke(THEME.ghost); strokeWeight(1.5); noFill();
        beginShape();
        for (const q of f.tr.pts) vertex(sx(q.x), sy(q.y) - offY);
        endShape();
        noStroke(); fill(THEME.ghost);
        const n = Math.floor(f.tr.tf / S.estela + 1e-6);
        for (let i = 0; i <= n; i++) {
            const q = f.tr.estadoEn(i * S.estela);
            circle(sx(q.x), sy(q.y) - offY, 4);
        }
        const c = f.tr.estadoEn(f.tr.tCima ?? 0);
        textSize(11); textAlign(CENTER, BOTTOM); fill(THEME.ghostText);
        text(f.etiqueta, sx(c.x), sy(c.y) - offY - 8);
    }
}

// Trayectoria sin aire, discontinua, para comparar cuando hay aire
function dibujarReferenciaVacio(tr, offY = 8) {
    if (!tr || !tr.valido) return;
    stroke(THEME.vacuum); strokeWeight(1.5); noFill();
    drawingContext.setLineDash([6, 6]);
    beginShape();
    for (const q of tr.pts) vertex(sx(q.x), sy(q.y) - offY);
    endShape();
    drawingContext.setLineDash([]);
    const fin = tr.pts[tr.pts.length - 1];
    noStroke(); fill(THEME.vacuum); textSize(11); textAlign(CENTER, BOTTOM);
    text(i18n.t('sin aire'), sx(fin.x), sy(fin.y) - 6);
}

// ── Flechas ───────────────────────────────────────────────────────
function flecha(x1, y1, dx, dy, col, grosor = 2.6, discontinua = false) {
    const L = Math.hypot(dx, dy);
    if (L < 2) return;
    const ux = dx / L, uy = dy / L;
    const pt = Math.min(10, L * 0.45);
    stroke(col); strokeWeight(grosor); noFill();
    if (discontinua) drawingContext.setLineDash([5, 4]);
    line(x1, y1, x1 + dx - ux * pt * 0.6, y1 + dy - uy * pt * 0.6);
    drawingContext.setLineDash([]);
    noStroke(); fill(col);
    const bx = x1 + dx, by = y1 + dy;
    triangle(bx, by, bx - ux * pt - uy * pt * 0.5, by - uy * pt + ux * pt * 0.5, bx - ux * pt + uy * pt * 0.5, by - uy * pt - ux * pt * 0.5);
}

// Rótulo con subíndice: «v» + «x»
function rotulo(base, sub, x, y, col, tam = 15) {
    noStroke(); fill(col); textStyle(BOLD); textSize(tam); textAlign(LEFT, CENTER);
    text(base, x, y);
    if (sub) { textSize(tam * 0.68); text(sub, x + textWidth(base) * 1.55, y + tam * 0.3); }
    textStyle(NORMAL);
}

function dibujarVectores(e, cx, cy, conComponentes) {
    const vx = e.vx * K_V, vy = -e.vy * K_V;
    const L = Math.hypot(vx, vy), maxL = 230;
    const f = L > maxL ? maxL / L : 1;
    if (conComponentes && Math.abs(e.vx) > 0.05 && Math.abs(e.vy) > 0.05) {
        flecha(cx, cy, vx * f, 0, THEME.vComp, 2, true);
        flecha(cx, cy, 0, vy * f, THEME.vComp, 2, true);
        rotulo('v', 'x', cx + vx * f + 4, cy + 10, THEME.vComp, 13);
        rotulo('v', 'y', cx + 6, cy + vy * f + (vy < 0 ? -2 : 8), THEME.vComp, 13);
    }
    if (L * f >= 2) {
        flecha(cx, cy, vx * f, vy * f, THEME.vel, 3);
        rotulo('v', '', cx + vx * f + (vx >= 0 ? 6 : -16), cy + vy * f - 8, THEME.vel);
    }
    // Aceleración (con aire, la total: gravedad + rozamiento)
    const ax = e.ax * K_A, ay = -e.ay * K_A;
    flecha(cx, cy, ax, ay, THEME.acc, 3);
    rotulo('a', '', cx + ax - 18, cy + ay + 2, THEME.acc);
}

// Proyecciones sobre los ejes: «sombras» del objeto en X y en Y, con su estela
function dibujarProyecciones(tr, t, offY = 8) {
    if (!tr || !tr.valido) return;
    const e = tr.estadoEn(t);
    const X = sx(e.x), Y = sy(e.y) - offY, X0 = sx(0), Y0 = sy(0);
    stroke(THEME.proj); strokeWeight(1); drawingContext.setLineDash([3, 4]);
    line(X, Y, X, Y0); line(X, Y, X0, Y);
    drawingContext.setLineDash([]);
    const n = Math.floor(t / S.estela + 1e-6);
    noStroke(); fill(THEME.projDots);
    for (let i = 0; i <= n; i++) {
        const q = tr.estadoEn(i * S.estela);
        rect(sx(q.x) - 1.5, Y0 - 9, 3, 9);       // marcas en el eje X
        rect(X0 - 9, sy(q.y) - offY - 1.5, 9, 3);       // marcas en el eje Y
    }
    fill(THEME.proj);
    circle(X, Y0 - 4, 9); circle(X0 + 4, Y, 9);
    if (!tr.aire && tr.p.v0 > 0) {
        textSize(11); fill(THEME.projText);
        textAlign(LEFT, BOTTOM);
        if (Math.abs(tr.vx0) > 0.05) text(i18n.t('sombra en X: velocidad constante (MRU)'), Math.min(X + 8, VIEW.rect.r - 250), Y0 - 12);
        textAlign(LEFT, TOP);
        text(i18n.t('sombra en Y: MRUA'), X0 + 12, VIEW.rect.t + 2);
    }
}

// Líneas que unen, en cada instante de la estela, la bola lanzada y la soltada
function dibujarParejas(trA, trB, t, offA = 8) {
    if (!trA || !trB || !trA.valido || !trB.valido) return;
    const n = Math.floor(Math.min(t, trA.tf, trB.tf) / S.estela + 1e-6);
    stroke(THEME.pairs); strokeWeight(1); drawingContext.setLineDash([2, 4]);
    for (let i = 1; i <= n; i++) {
        const a = trA.estadoEn(i * S.estela), b = trB.estadoEn(i * S.estela);
        line(sx(b.x), sy(b.y) - 7, sx(a.x), sy(a.y) - offA);
    }
    drawingContext.setLineDash([]);
}

// Marca de la altura máxima y del punto de llegada
function dibujarMarcas(tr, t, desplX = 0) {
    if (!tr || !tr.valido) return;
    textSize(12);
    if (tr.tCima !== null && t >= tr.tCima - 1e-6) {
        const c = tr.estadoEn(tr.tCima);
        const X = sx(c.x) + desplX, Y = sy(tr.yMax);
        stroke(THEME.mark); strokeWeight(1); drawingContext.setLineDash([4, 4]);
        line(sx(0), Y, X, Y);
        drawingContext.setLineDash([]);
        noStroke(); fill(THEME.mark);
        const val = S.ocultar ? '?' : `${i18n.num(tr.yMax, 1)} m`;
        const vtxt = S.mode === 'vertical' || Math.abs(c.vx) < 0.05 ? i18n.t('v = 0') : i18n.t('vᵧ = 0');
        textAlign(LEFT, BOTTOM);
        text(`${i18n.t('Altura máxima')}: ${val} · ${vtxt}`, X + 14, Y - 6);
    }
    if (t >= tr.tf - 1e-6 && Math.abs(tr.vx0) > 1e-9) {
        const X = sx(tr.xf);
        stroke(THEME.mark); strokeWeight(2);
        line(X - 5, sy(0) - 5, X + 5, sy(0) + 5); line(X - 5, sy(0) + 5, X + 5, sy(0) - 5);
        noStroke(); fill(THEME.mark); textAlign(CENTER, TOP);
        text(S.ocultar ? 'x = ?' : `x = ${i18n.num(tr.xf, 1)} m`, X, sy(0) + 20);
    }
}

// ── Franja superior: qué movimiento es y leyenda ──────────────────
function dibujarFranja(titulo, sub) {
    noStroke(); fill(THEME.bannerBg);
    rect(0, 0, CV_W, BANNER_H);
    stroke(THEME.border); strokeWeight(1); line(0, BANNER_H, CV_W, BANNER_H);
    noStroke(); fill(THEME.accent); textStyle(BOLD); textSize(16); textAlign(LEFT, CENTER);
    text(titulo, 16, sub ? 15 : BANNER_H / 2);
    textStyle(NORMAL);
    if (sub) { fill(THEME.textDim); textSize(12); text(sub, 16, 33); }
    // Leyenda a la derecha
    textAlign(RIGHT, CENTER); textSize(12);
    let x = CV_W - 16;
    const item = (txt, col, dib) => {
        fill(THEME.text); noStroke(); text(txt, x, BANNER_H / 2);
        x -= textWidth(txt) + 6;
        dib(x - 8, BANNER_H / 2, col);
        x -= 28;
    };
    if (S.vectores) {
        item(i18n.t('flechas a escalas distintas'), THEME.textDim, () => {});
        item(i18n.t('aceleración'), THEME.acc, (cx, cy, c) => flecha(cx - 8, cy, 18, 0, c, 2.4));
        item(i18n.t('velocidad'), THEME.vel, (cx, cy, c) => flecha(cx - 8, cy, 18, 0, c, 2.4));
    }
    item(i18n.t('un punto cada {dt} s', { dt: i18n.num(S.estela, 1) }), THEME.accent, (cx, cy, c) => { noStroke(); fill(c); circle(cx + 2, cy, 8); });
}

// ── Gráficas posición–tiempo y velocidad–tiempo ───────────────────
function dibujarGraficas(tr, t) {
    if (!tr || !tr.valido) return;
    const top = 466, bot = CV_H - 36;
    noStroke(); fill(THEME.graphBg); rect(0, 452, CV_W, CV_H - 452);
    stroke(THEME.border); line(0, 452, CV_W, 452);
    const conX = S.mode !== 'vertical';
    // Con los resultados ocultos, el eje de tiempo no debe delatar el tiempo de vuelo
    const tMax = S.ocultar ? Math.ceil(tr.tf * 1.3 / pasoRedondo(tr.tf, 4)) * pasoRedondo(tr.tf, 4) : Math.max(tr.tf, 0.1);
    const series = [
        { titulo: i18n.t('Posición frente al tiempo'), x0: 70, x1: 505,
          y: (q) => q.y, x: conX ? (q) => q.x : null, uy: 'm', ny: 'y', nx: 'x' },
        { titulo: i18n.t('Velocidad frente al tiempo'), x0: 590, x1: CV_W - 30,
          y: (q) => q.vy, x: conX ? (q) => q.vx : null, uy: 'm/s', ny: 'vᵧ', nx: 'vₓ' },
    ];
    for (const s of series) {
        let lo = 0, hi = 0;
        for (const q of tr.pts) {
            lo = Math.min(lo, s.y(q)); hi = Math.max(hi, s.y(q));
            if (s.x) { lo = Math.min(lo, s.x(q)); hi = Math.max(hi, s.x(q)); }
        }
        if (hi - lo < 1) hi = lo + 1;
        const pad = (hi - lo) * 0.08; lo -= lo < 0 ? pad : 0; hi += pad;
        const gx = (tt) => s.x0 + (tt / tMax) * (s.x1 - s.x0);
        const gy = (v) => bot - (v - lo) / (hi - lo) * (bot - top - 16);
        // Ejes
        stroke(THEME.axis); strokeWeight(1.2);
        line(s.x0, top + 8, s.x0, bot); line(s.x0, gy(0), s.x1, gy(0));
        noStroke(); fill(THEME.text); textSize(12); textAlign(LEFT, TOP); textStyle(BOLD);
        text(s.titulo, s.x0, top - 8); textStyle(NORMAL);
        fill(THEME.textDim); textSize(10); textAlign(RIGHT, CENTER);
        const paso = pasoRedondo(hi - lo, 4);
        for (let v = Math.ceil(lo / paso) * paso; v <= hi; v += paso) {
            text(i18n.num(+v.toFixed(6)), s.x0 - 5, gy(v));
            stroke(THEME.grid); line(s.x0, gy(v), s.x1, gy(v)); noStroke();
        }
        textAlign(CENTER, TOP);
        const pt = pasoRedondo(tMax, 6);
        for (let tt = pt; tt <= tMax + 1e-9; tt += pt) text(i18n.num(+tt.toFixed(6)), gx(tt), gy(0) + 3 > bot ? bot + 3 : bot + 3);
        textAlign(RIGHT, TOP); text(i18n.t('t (s)'), s.x1, bot + 16);
        textAlign(LEFT, BOTTOM); text(`(${s.uy})`, s.x0 + 4, top + 22);
        // Solo la parte recorrida: la gráfica se dibuja a la vez que el movimiento
        const curva = (fn, col) => {
            noFill(); stroke(col); strokeWeight(2.4);
            beginShape();
            for (const q of tr.pts) { if (q.t > t) break; vertex(gx(q.t), gy(fn(q))); }
            const e = tr.estadoEn(t); vertex(gx(e.t), gy(fn(e)));
            endShape();
            noStroke(); fill(col); circle(gx(e.t), gy(fn(e)), 7);
        };
        if (s.x) curva(s.x, THEME.graphX);
        curva(s.y, THEME.graphY);
        // Leyenda
        textSize(12); textAlign(RIGHT, TOP); let lx = s.x1;
        fill(THEME.graphY); text(s.ny, lx, top - 8); lx -= textWidth(s.ny) + 14;
        if (s.x) { fill(THEME.graphX); text(s.nx, lx, top - 8); }
    }
}
