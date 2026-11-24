import { BATERIA_KWH, CARGA_ATE, MAX_AC, MAX_DC } from './Constantes.js';

// Postos de carregamento de Viana do Castelo (locais reais). Potências e preços são APROXIMADOS,
// baseados em valores típicos atuais da rede pública portuguesa (carregamento sem contrato, "ad hoc"),
// e servem apenas para o jogo. Não consultam nenhuma API.
// 'no' = ponto do mapa do jogo onde o posto aparece.
export const POSTOS = [
    { id: 'A', nome: 'ESE-IPVC', detalhe: 'Escola Superior de Educação', kW: 22, tipo: 'AC', preco: 0.30, no: 'N0' },
    { id: 'B', nome: 'Continente', detalhe: 'Continente Viana do Castelo', kW: 50, tipo: 'DC', preco: 0.32, no: 'S0' },
    { id: 'C', nome: 'Leroy Merlin', detalhe: 'Powerdot, Viana do Castelo', kW: 100, tipo: 'DC', preco: 0.49, no: 'S2' },
    { id: 'D', nome: 'A28 · Km 372', detalhe: 'Área de serviço Moeve', kW: 300, tipo: 'DC', preco: 0.55, no: 'E1' }
];

// Estimativa de uma sessão de carga: energia a repor, potência efetiva do carro, duração e custo.
export function estimarCarga(posto, bateriaPct) {
    const kwh = Math.max(8, (CARGA_ATE - bateriaPct) / 100 * BATERIA_KWH);
    const kwEf = posto.tipo === 'AC' ? Math.min(posto.kW, MAX_AC) : Math.min(posto.kW, MAX_DC) * 0.8; // 0.8 ≈ perda por curva de carga
    return { kwh, kwEf, minCarga: kwh / kwEf * 60, custo: kwh * posto.preco };
}

// ocupação aleatória (aleatoriedade controlada): fração de 0 a 0.7 -> espera estimada em minutos
export function sortearOcupacao(postos) {
    postos.forEach(p => { p.ocupacao = Math.round(Phaser.Math.FloatBetween(0, 0.7) * 100) / 100; p.espera = Math.round(p.ocupacao * 12); });
}

export const euros = (v) => v.toFixed(2).replace('.', ',') + ' €';

// ---- Entradas nos locais de destino -------------------------------------------------------------
// A rota do grafo termina na borda do mapa. Aqui a rota é cortada na estrada (ao cruzar 'valor' no 'eixo')
// e continua por dentro do parque até à baía de carregamento (ou à baía das ambulâncias do hospital).
const ENTRADAS = {
    A: { eixo: 'y', valor: 62, baias: [160, 184, 208, 232],
         ir: (cx) => [[128, 57], [140, 54], [cx - 14, 54], [cx - 5, 57], [cx, 66], [cx, 76]] },
    B: { eixo: 'y', valor: 414, baias: [160, 184, 208, 232, 256],
         ir: (cx) => [[100, 419], [112, 422], [cx - 14, 422], [cx - 5, 425], [cx, 434], [cx, 451]] },
    C: { eixo: 'y', valor: 420, baias: [537, 561, 585],
         ir: (cx) => [[480, 424], [492, 430], [cx - 14, 430], [cx - 5, 433], [cx, 442], [cx, 455]] },
    D: { eixo: 'x', valor: null, baias: [541, 564, 587],
         ir: (cx) => [[cx - 6, 347], [cx, 354], [cx, 372], [cx, 388]], corte: (cx) => cx - 16 }
};

// devolve o ponto onde a polilinha cruza eixo=valor (procura a partir do fim) e o índice do segmento
function cruzar(pontos, eixo, valor) {
    for (let i = pontos.length - 1; i >= 1; i--) {
        const a = pontos[i - 1], b = pontos[i];
        if ((a[eixo] - valor) * (b[eixo] - valor) <= 0 && a[eixo] !== b[eixo]) {
            const t = (valor - a[eixo]) / (b[eixo] - a[eixo]);
            return { i, p: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t } };
        }
    }
    return null;
}

// rota completa até à baía do posto (índice i das baías, rotativo)
export function ligarAoPosto(pontos, posto, i) {
    const e = ENTRADAS[posto.id];
    const cx = e.baias[i % e.baias.length];
    const c = cruzar(pontos, e.eixo, e.corte ? e.corte(cx) : e.valor);
    if (!c) return pontos;
    return [...pontos.slice(0, c.i), c.p, ...e.ir(cx).map(([x, y]) => ({ x, y }))];
}

// rota até à baía de ambulâncias do hospital (na estrada, junto ao hospital)
export function ligarAoHospital(pontos) {
    const c = cruzar(pontos, 'x', 575);
    return c ? [...pontos.slice(0, c.i), c.p] : pontos;
}
