'use strict';
// ═══════════════════════════════════════════════════════════════════
//  MODO RETO: SE CALCULA PRIMERO Y SE COMPRUEBA DESPUÉS
// ═══════════════════════════════════════════════════════════════════
// Siempre en la Tierra (g = 9,8 m/s²) y sin aire, para que un cálculo bien
// hecho acierte. La respuesta se escribe (no hay deslizador): así no se
// acierta probando. Tolerancia: diana de 1 m de diámetro en los tiros y un 3 %
// en la magnitud pedida en los verticales.
const G_RETO = 9.8;
const azar = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
// También vale la solución redondeada a dos cifras significativas (14 m/s si es 14,49 m/s).
const redondeoValido = (x, sol) => Math.abs(x - sol) <= 0.5 * Math.pow(10, Math.floor(Math.log10(Math.abs(sol))) - 1) + 1e-9;

const RETOS = {
    // ¿Con qué velocidad lanzar hacia arriba para llegar justo al balcón?
    balcon: {
        crear() { const H = azar(5, 18); return { H, sol: Math.sqrt(2 * G_RETO * H) }; },
        enunciado: (r) => i18n.t('Lanzas una pelota hacia arriba desde el suelo. ¿Con qué velocidad tienes que lanzarla para que llegue justo a la altura del balcón, a {H} m, y empiece a bajar allí?', { H: i18n.num(r.H) }),
        pregunta: () => i18n.t('Velocidad inicial (hacia arriba)'),
        unidad: 'm/s',
        pista: () => i18n.t('Pista: en el punto más alto la velocidad es cero. Usa v² = v₀² − 2·g·h.'),
        lanzamiento: (r, x) => ({ h: 0, v0: x, ang: 90 }),
        valorar(r, x, tr) {
            const dif = tr.yMax - r.H;
            const ok = Math.abs(x - r.sol) / r.sol <= 0.03 || redondeoValido(x, r.sol);
            const msg = ok
                ? i18n.t('¡Justo al balcón! Ha subido hasta {y} m.', { y: i18n.num(tr.yMax, 1) })
                : dif > 0 ? i18n.t('Ha subido hasta {y} m: se ha pasado {d} m.', { y: i18n.num(tr.yMax, 1), d: i18n.num(dif, 1) })
                          : i18n.t('Ha subido hasta {y} m: se ha quedado {d} m por debajo.', { y: i18n.num(tr.yMax, 1), d: i18n.num(-dif, 1) });
            return { ok, msg };
        },
    },
    // ¿Cuánto tarda en caer desde h?
    tarda: {
        crear() { const h = azar(2, 16) * 5; return { h, sol: Math.sqrt(2 * h / G_RETO) }; },
        enunciado: (r) => i18n.t('Sueltas una bola desde una azotea de {h} m de altura. ¿Cuántos segundos tarda en llegar al suelo?', { h: i18n.num(r.h) }),
        pregunta: () => i18n.t('Tiempo de caída'),
        unidad: 's',
        pista: () => i18n.t('Pista: si se suelta, v₀ = 0 y h = ½·g·t².'),
        lanzamiento: (r) => ({ h: r.h, v0: 0, ang: 90 }),
        valorar(r, x, tr) {
            const ok = Math.abs(x - tr.tf) / tr.tf <= 0.03 || redondeoValido(x, r.sol);
            const msg = ok
                ? i18n.t('¡Bien! Ha tardado {t} s.', { t: i18n.num(tr.tf, 2) })
                : i18n.t('Ha tardado {t} s, y tú habías dicho {x} s.', { t: i18n.num(tr.tf, 2), x: i18n.num(x) });
            return { ok, msg, fin: true };
        },
    },
    // Tiro horizontal: ¿con qué velocidad para caer en la diana?
    diana: {
        crear() {
            for (;;) {
                const h = [1, 1.25, 2, 5, 10, 15, 20][azar(0, 6)];
                const D = azar(3, 25);
                const sol = D / Math.sqrt(2 * h / G_RETO);
                if (sol >= 3 && sol <= 28) return { h, D, sol };
            }
        },
        enunciado: (r) => i18n.t('Lanzas una bola en horizontal desde {h} m de altura. La diana está en el suelo, a {D} m. ¿Con qué velocidad tienes que lanzarla?', { h: i18n.num(r.h, r.h % 1 ? 2 : 0), D: i18n.num(r.D) }),
        pregunta: () => i18n.t('Velocidad inicial (horizontal)'),
        unidad: 'm/s',
        pista: () => i18n.t('Pista: el tiempo de caída solo depende de la altura (h = ½·g·t²). En horizontal, x = v₀·t.'),
        lanzamiento: (r, x) => ({ h: r.h, v0: x, ang: 0 }),
        valorar(r, x, tr) {
            const dif = tr.xf - r.D;
            const ok = Math.abs(dif) <= 0.5 || redondeoValido(x, r.sol);
            const msg = ok
                ? i18n.t('¡Diana! Ha caído a {x} m.', { x: i18n.num(tr.xf, 1) })
                : dif > 0 ? i18n.t('Ha caído a {x} m: te has pasado {d} m.', { x: i18n.num(tr.xf, 1), d: i18n.num(dif, 1) })
                          : i18n.t('Ha caído a {x} m: te has quedado {d} m corto.', { x: i18n.num(tr.xf, 1), d: i18n.num(-dif, 1) });
            return { ok, msg };
        },
    },
    // Tiro oblicuo desde el suelo: hay dos ángulos que aciertan
    angulos: {
        crear() {
            for (;;) {
                const v0 = azar(12, 22);
                const R = v0 * v0 / G_RETO;
                const D = azar(Math.ceil(R * 0.35), Math.floor(R * 0.92));
                const a1 = 0.5 * Math.asin(G_RETO * D / (v0 * v0)) * 180 / Math.PI;
                if (a1 > 8 && a1 < 40) return { v0, D, sol: a1, sol2: 90 - a1, acertados: [] };
            }
        },
        enunciado: (r) => i18n.t('Lanzas una pelota desde el suelo a {v} m/s. La diana está a {D} m. ¿Con qué ángulo sobre la horizontal tienes que lanzarla?', { v: i18n.num(r.v0), D: i18n.num(r.D) }),
        pregunta: () => i18n.t('Ángulo de lanzamiento'),
        unidad: '°',
        pista: () => i18n.t('Pista: desde el suelo, el alcance es x = v₀²·sen(2α) / g.'),
        lanzamiento: (r, x) => ({ h: 0, v0: r.v0, ang: x }),
        valorar(r, x, tr) {
            const dif = tr.xf - r.D;
            const ok = Math.abs(dif) <= 0.5 || redondeoValido(x, r.sol) || redondeoValido(x, r.sol2);
            if (!ok) {
                const msg = dif > 0 ? i18n.t('Ha caído a {x} m: te has pasado {d} m.', { x: i18n.num(tr.xf, 1), d: i18n.num(dif, 1) })
                                    : i18n.t('Ha caído a {x} m: te has quedado {d} m corto.', { x: i18n.num(tr.xf, 1), d: i18n.num(-dif, 1) });
                return { ok, msg };
            }
            const cual = Math.abs(x - r.sol) < Math.abs(x - r.sol2) ? 1 : 2;
            if (!r.acertados.includes(cual)) r.acertados.push(cual);
            if (r.acertados.length === 2) return { ok, msg: i18n.t('¡Diana con los dos ángulos! Suman 90°: son complementarios.'), fin: true };
            return { ok, msg: i18n.t('¡Diana! Hay otro ángulo que también acierta. ¿Cuál?'), fin: false, sigue: true };
        },
    },
};

// Lee un número escrito con coma o con punto
function leerNumero(txt) {
    const n = parseFloat(String(txt).trim().replace(',', '.'));
    return isFinite(n) ? n : null;
}
