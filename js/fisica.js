'use strict';
// ═══════════════════════════════════════════════════════════════════
//  FÍSICA: OBJETOS, LUGARES Y TRAYECTORIAS
// ═══════════════════════════════════════════════════════════════════
// Sistema de referencia: origen en el suelo, justo debajo del punto de
// lanzamiento; eje X horizontal hacia la derecha y eje Y vertical hacia arriba.
//
// Sin aire, la trayectoria se calcula con las ecuaciones exactas del MRU (en x)
// y del MRUA (en y), para que los números coincidan con los del cuaderno.
// Con aire, se integra paso a paso (Runge-Kutta 4, Δt = 2 ms) con rozamiento
// cuadrático: a = −g·ŷ − (g / vₗ²)·|v|·v, donde vₗ es la velocidad límite de
// cada objeto en el aire (la que alcanzaría cayendo desde muy alto).

// Masa en kg, radio de dibujo en píxeles y velocidad límite en el aire (m/s).
// Velocidades límite estimadas con F = ½·ρ·C·A·v² (ρ = 1,2 kg/m³) y datos típicos.
const OBJETOS = {
    acero:      { nombre: 'Bola de acero',        masa: 1,      r: 8,  vl: 105 },
    baloncesto: { nombre: 'Balón de baloncesto',  masa: 0.62,   r: 12, vl: 20 },
    tenis:      { nombre: 'Pelota de tenis',      masa: 0.058,  r: 8,  vl: 22 },
    pingpong:   { nombre: 'Pelota de ping-pong',  masa: 0.0027, r: 7,  vl: 9 },
    papel:      { nombre: 'Bola de papel',        masa: 0.005,  r: 9,  vl: 5 },
    pluma:      { nombre: 'Pluma',                masa: 0.0001, r: 10, vl: 0.8 },
};

// Gravedad en la superficie (valores redondeados de los libros).
const LUGARES = {
    tierra:  { nombre: 'Tierra',  g: 9.8,  aire: true },
    luna:    { nombre: 'Luna',    g: 1.6,  aire: false },
    marte:   { nombre: 'Marte',   g: 3.7,  aire: false },
    jupiter: { nombre: 'Júpiter', g: 24.8, aire: false },
};

// Texto de una masa con la unidad más cómoda («1 kg», «58 g», «0,1 g»).
function textoMasa(m) {
    if (m >= 1) return `${i18n.num(m, m % 1 ? 2 : 0)} kg`;
    const g = Math.round(m * 10000) / 10;
    return `${i18n.num(g, g % 1 ? 1 : 0)} g`;
}

// p = { h, v0, ang (grados), g, aire, vl, x0 }
// Devuelve la trayectoria muestreada y los resultados.
function calcularTrayectoria(p) {
    const a = p.ang * Math.PI / 180;
    const vx0 = Math.abs(p.v0) < 1e-9 ? 0 : p.v0 * Math.cos(a);
    const vy0 = Math.abs(p.v0) < 1e-9 ? 0 : p.v0 * Math.sin(a);
    const g = p.g;
    const x0 = p.x0 || 0;
    const tr = { p, vx0, vy0, g, aire: !!p.aire, pts: [], tf: 0, tCima: null, yMax: p.h, xf: x0, vfx: vx0, vfy: vy0, valido: true };

    // Desde el suelo y sin subir no hay movimiento que ver.
    if (p.h <= 0 && vy0 <= 1e-9) {
        tr.valido = false;
        tr.pts.push({ t: 0, x: x0, y: Math.max(0, p.h), vx: vx0, vy: vy0, ax: 0, ay: -g });
        tr.estadoEn = (t) => ({ ...tr.pts[0], t: 0 });
        return tr;
    }

    if (!tr.aire) {
        // Soluciones exactas
        tr.tf = (vy0 + Math.sqrt(vy0 * vy0 + 2 * g * p.h)) / g;
        if (vy0 > 0) { tr.tCima = vy0 / g; tr.yMax = p.h + vy0 * vy0 / (2 * g); }
        tr.xf = x0 + vx0 * tr.tf;
        tr.vfx = vx0;
        tr.vfy = vy0 - g * tr.tf;
        const n = Math.max(2, Math.ceil(tr.tf / 0.01));
        for (let i = 0; i <= n; i++) {
            const t = tr.tf * i / n;
            tr.pts.push({ t, x: x0 + vx0 * t, y: Math.max(0, p.h + vy0 * t - 0.5 * g * t * t), vx: vx0, vy: vy0 - g * t, ax: 0, ay: -g });
        }
        tr.estadoEn = (t) => {
            t = Math.min(Math.max(t, 0), tr.tf);
            return { t, x: x0 + vx0 * t, y: Math.max(0, p.h + vy0 * t - 0.5 * g * t * t), vx: vx0, vy: vy0 - g * t, ax: 0, ay: -g };
        };
        return tr;
    }

    // Con aire: integración numérica
    const k = g / (p.vl * p.vl);
    const acc = (vx, vy) => {
        const v = Math.hypot(vx, vy);
        return [-k * v * vx, -g - k * v * vy];
    };
    const dt = 0.002;
    let t = 0, x = x0, y = p.h, vx = vx0, vy = vy0;
    let [ax, ay] = acc(vx, vy);
    tr.pts.push({ t, x, y, vx, vy, ax, ay });
    let paso = 0;
    while (t < 600) {
        const k1 = acc(vx, vy);
        const k2 = acc(vx + k1[0] * dt / 2, vy + k1[1] * dt / 2);
        const k3 = acc(vx + k2[0] * dt / 2, vy + k2[1] * dt / 2);
        const k4 = acc(vx + k3[0] * dt, vy + k3[1] * dt);
        const nvx = vx + dt / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
        const nvy = vy + dt / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
        const nx = x + dt / 6 * (vx + 2 * (vx + k1[0] * dt / 2) + 2 * (vx + k2[0] * dt / 2) + (vx + k3[0] * dt));
        const ny = y + dt / 6 * (vy + 2 * (vy + k1[1] * dt / 2) + 2 * (vy + k2[1] * dt / 2) + (vy + k3[1] * dt));
        if (vy > 0 && nvy <= 0 && tr.tCima === null) {
            const f = vy / (vy - nvy);
            tr.tCima = t + f * dt;
            tr.yMax = y + f * (ny - y);
        }
        if (ny <= 0) {
            // Interpolación lineal hasta el suelo
            const f = y / (y - ny);
            t += f * dt; x += f * (nx - x); vx += f * (nvx - vx); vy += f * (nvy - vy); y = 0;
            [ax, ay] = acc(vx, vy);
            tr.pts.push({ t, x, y, vx, vy, ax, ay });
            break;
        }
        t += dt; x = nx; y = ny; vx = nvx; vy = nvy;
        paso++;
        if (paso % 5 === 0) { [ax, ay] = acc(vx, vy); tr.pts.push({ t, x, y, vx, vy, ax, ay }); }
    }
    tr.tf = t; tr.xf = x; tr.vfx = vx; tr.vfy = vy;
    tr.estadoEn = (tt) => interpolar(tr.pts, tt);
    return tr;
}

// Estado en un instante cualquiera, interpolando entre muestras.
function interpolar(pts, t) {
    if (t <= pts[0].t) return { ...pts[0] };
    const last = pts[pts.length - 1];
    if (t >= last.t) return { ...last };
    let lo = 0, hi = pts.length - 1;
    while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (pts[mid].t <= t) lo = mid; else hi = mid;
    }
    const A = pts[lo], B = pts[hi];
    const f = (t - A.t) / (B.t - A.t);
    const o = { t };
    for (const k of ['x', 'y', 'vx', 'vy', 'ax', 'ay']) o[k] = A[k] + f * (B[k] - A[k]);
    return o;
}
