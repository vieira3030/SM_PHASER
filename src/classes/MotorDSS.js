import { eixoDe, outroEixo, VEL_AMB, CONSUMO_BATERIA, MIN_POR_SEGUNDO } from './Constantes.js';
import { estimarCarga } from './Dados.js';

// Sistema Inteligente de Apoio à Decisão (DSS). Dois conceitos técnicos distintos:
//  1) Motor de regras SE–ENTÃO com explicação (semáforos): cada regra tem condição, pontuação e MOTIVO.
//  2) Pontuação multicritério ponderada (postos de carregamento): tempo total (viagem + espera + carga) e custo,
//     com pesos que mudam consoante o estado (regra: bateria crítica => dar mais peso ao tempo).
export default class MotorDSS {

    // ---------- Conceito 1: motor de regras para semáforos ----------
    // Para cada cruzamento mede o eixo que está vermelho e aplica três regras SE–ENTÃO:
    //   R1 (ALTA)  SE uma ambulância se aproxima de um semáforo vermelho e o cruzamento está na sua rota
    //              ENTÃO dar-lhe verde.
    //   R2 (MÉDIA) SE há 4 ou mais carros parados no eixo vermelho e mais 3 do que no eixo verde
    //              ENTÃO trocar.
    //   R3 (BAIXA) SE há carros à espera há mais de 14 s ENTÃO trocar.
    // Cada regra dá uma pontuação e um MOTIVO (explicação mostrada ao jogador). Fica a sugestão com
    // maior pontuação entre todos os cruzamentos; o jogador decide se a aceita.
    // Mede a fila (veículos parados), a espera máxima e a ambulância mais próxima de uma aproximação.
    static medir(sem, eixo, veiculos) {
        let fila = 0, esperaMax = 0, amb = null;
        for (const v of veiculos) {
            if (eixoDe(v.dir) !== eixo) continue;
            const dx = sem.x - v.x, dy = sem.y - v.y;
            let dist;     // distância ao longo da direção de marcha até ao cruzamento (px)
            let lateral;
            if (v.dir === 'E') { dist = dx; lateral = Math.abs(dy); }
            else if (v.dir === 'W') { dist = -dx; lateral = Math.abs(dy); }
            else if (v.dir === 'S') { dist = dy; lateral = Math.abs(dx); }
            else { dist = -dy; lateral = Math.abs(dx); }
            if (lateral > 40 || dist < 0 || dist > 260) continue;
            if (dist <= 150 && v.v < 8) { fila++; esperaMax = Math.max(esperaMax, v.espera); }
            // só conta a ambulância se este cruzamento fizer parte da sua rota restante
            const naRota = v.tipo === 'AMB' && v.ids && v.ids.slice(v.nodoIdx[Math.min(v.idx, v.nodoIdx.length - 1)] - 1).includes(sem.no);
            if (naRota && (!amb || dist < amb.dist)) amb = { dist, v };
        }
        return { fila, esperaMax, amb };
    }

    // Avalia todos os semáforos e devolve a melhor recomendação (ou null).
    static avaliarSemaforos(semaforos, veiculos, ignorados) {
        let melhor = null;
        for (const s of semaforos) {
            if (ignorados[s.nome] && ignorados[s.nome] > performance.now()) continue;
            // cada semáforo é independente: avalia cada eixo que tenha pelo menos um vermelho
            for (const eixoVermelho of ['H', 'V']) {
                if (s.verde(eixoVermelho)) continue;
                const a = MotorDSS.medir(s, eixoVermelho, veiculos);             // eixo que está a esperar
                const b = MotorDSS.medir(s, outroEixo(eixoVermelho), veiculos);  // o outro eixo
                const candidatos = [];

                // R1: SE uma ambulância se aproxima por um semáforo vermelho ENTÃO dar-lhe verde (ALTA)
                if (a.amb && !s.verdeDir(a.amb.v.dir) && !(b.amb && b.amb.dist < a.amb.dist)) {
                    const eta = Math.max(1, Math.round(a.amb.dist / VEL_AMB));
                    adicionar(candidatos, 100 + (260 - a.amb.dist) / 4, 'ALTA',
                        `Ambulância a chegar em ~${eta}s a um semáforo vermelho`, a.amb.v.dir);
                }
                // R2: SE a fila no eixo vermelho >= 4 E excede em 3+ a do outro eixo ENTÃO dar verde (MÉDIA)
                if (a.fila >= 4 && a.fila >= b.fila + 3) {
                    adicionar(candidatos, 40 + 6 * a.fila - 4 * b.fila, 'MÉDIA',
                        `${a.fila} veículos parados contra ${b.fila} no outro sentido`);
                }
                // R3: SE a espera máxima no eixo vermelho > 14 s ENTÃO dar verde (BAIXA)
                if (a.esperaMax > 14 && a.fila >= 2) {
                    adicionar(candidatos, 30 + a.esperaMax, 'BAIXA',
                        `Há veículos à espera há ${Math.round(a.esperaMax)}s`);
                }
                for (const c of candidatos) {
                    if (!melhor || c.score > melhor.score) melhor = { sem: s, eixo: eixoVermelho, ...c };
                }
            }
        }
        return melhor;
    }

    // ---------- Conceito 2: pontuação multicritério para postos de carregamento ----------
    // tempoDe(posto) devolve a duração da viagem (s de jogo) do EV até esse posto (rota mais curta).
    // Para cada posto calcula:
    //   total = viagem + espera na fila + duração da carga   (minutos)
    //   score = 100 × ( wT × totalMin / total  +  wC × custoMin / custo )
    // Cada fração vale 1 para o melhor posto nesse critério e menos para os outros (normalização).
    // Pesos: bateria crítica (< 25 %) => wT = 0.8, wC = 0.2; caso contrário wT = 0.55, wC = 0.45.
    // Posto que o carro não consegue alcançar com a bateria atual => score × 0.2.
    // Exemplo para a defesa: mudar os pesos (w) altera o posto recomendado (★).
    static classificarPostos(ev, postos, tempoDe) {
        const dados = postos.map(p => {
            const T = tempoDe(p);
            const c = estimarCarga(p, ev.bateria);
            const viagem = T * MIN_POR_SEGUNDO;
            return { p, T, c, viagem, total: viagem + p.espera + c.minCarga };
        });
        const totMin = Math.min(...dados.map(d => d.total));
        const cusMin = Math.min(...dados.map(d => d.c.custo));
        // regra: bateria crítica (<25%) => o tempo pesa muito mais do que o custo
        const critica = ev.bateria < 25;
        const w = critica ? { t: 0.8, c: 0.2 } : { t: 0.55, c: 0.45 };
        const lista = dados.map(d => {
            const viavel = d.T * CONSUMO_BATERIA < ev.bateria - 3;       // chega lá com a bateria que tem?
            let score = 100 * (w.t * totMin / d.total + w.c * cusMin / d.c.custo);
            if (!viavel) score *= 0.2;                                    // regra: sem bateria suficiente => penalização forte
            const melhorTempo = d.total === totMin, maisBarato = d.c.custo === cusMin;
            const motivo = !viavel ? 'bateria insuficiente' : melhorTempo ? 'mais rápido no total' : maisBarato ? 'mais barato' : 'equilíbrio tempo/custo';
            return { posto: d.p, tempo: d.T, viagem: d.viagem, minCarga: d.c.minCarga, custo: d.c.custo, kwh: d.c.kwh, espera: d.p.espera, score, viavel, motivo };
        });
        lista.sort((a, b) => b.score - a.score);
        return { lista, critica };
    }
}

// junta uma sugestão candidata (pontuação, prioridade, motivo e, se houver, a via da ambulância)
function adicionar(arr, score, prioridade, motivo, dir = null) {
    arr.push({ score, prioridade, motivo, dir });
}
