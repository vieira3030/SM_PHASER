import { MAPA_L, ALTURA, FAIXA, VETOR } from './Constantes.js';

// Grafo da rede viária: cruzamentos (I) e pontos de entrada/saída nas bordas do mapa (B).
// Usado para calcular rotas (Dijkstra) e os pontos de passagem (waypoints) dos veículos.
export default class Grafo {
    // colunas/linhas: coordenadas das avenidas do nível (a grelha cresce de nível para nível: 2x2, 3x2, 3x3)
    constructor(COLUNAS, LINHAS) {
        this.nos = {};
        this.adj = {};
        LINHAS.forEach((y, r) => COLUNAS.forEach((x, c) => this.addNo(`I${r}${c}`, x, y, 'I')));
        LINHAS.forEach((y, r) => {
            this.addNo(`W${r}`, 0, y, 'B');
            this.addNo(`E${r}`, MAPA_L, y, 'B');
            this.ligar(`W${r}`, `I${r}0`);
            for (let c = 0; c < COLUNAS.length - 1; c++) this.ligar(`I${r}${c}`, `I${r}${c + 1}`);
            this.ligar(`I${r}${COLUNAS.length - 1}`, `E${r}`);
        });
        COLUNAS.forEach((x, c) => {
            this.addNo(`N${c}`, x, 0, 'B');
            this.addNo(`S${c}`, x, ALTURA, 'B');
            this.ligar(`N${c}`, `I0${c}`);
            for (let r = 0; r < LINHAS.length - 1; r++) this.ligar(`I${r}${c}`, `I${r + 1}${c}`);
            this.ligar(`I${LINHAS.length - 1}${c}`, `S${c}`);
        });
    }

    addNo(id, x, y, tipo) { this.nos[id] = { id, x, y, tipo }; this.adj[id] = []; }
    ligar(a, b) { this.adj[a].push(b); this.adj[b].push(a); }
    bordas() { return Object.values(this.nos).filter(n => n.tipo === 'B').map(n => n.id); }

    // direção de movimento ao ir do nó a para o nó b
    direcao(a, b) {
        const A = this.nos[a], B = this.nos[b];
        if (B.x > A.x) return 'E';
        if (B.x < A.x) return 'W';
        return B.y > A.y ? 'S' : 'N';
    }

    // Dijkstra. custo(a,b) devolve o tempo estimado (s) para percorrer a aresta a->b.
    // proibido (opcional): nó que a rota não pode usar (evita inversões de marcha ao entrar num destino)
    rota(origem, destino, custo, proibido = null) {
        const dist = { [origem]: 0 }, prev = {}, feito = new Set();
        const fila = [origem];
        while (fila.length) {
            fila.sort((p, q) => dist[p] - dist[q]);
            const u = fila.shift();
            if (feito.has(u)) continue;
            feito.add(u);
            if (u === destino) break;
            for (const v of this.adj[u]) {
                // não atravessar pontos de borda (só são início/fim de viagem)
                if (this.nos[v].tipo === 'B' && v !== destino) continue;
                if (v === proibido) continue;
                const d = dist[u] + custo(u, v);
                if (dist[v] === undefined || d < dist[v]) { dist[v] = d; prev[v] = u; fila.push(v); }
            }
        }
        if (dist[destino] === undefined) return null;
        const ids = [destino];
        while (ids[0] !== origem) ids.unshift(prev[ids[0]]);
        return { ids, tempo: dist[destino] };
    }

    // ponto da faixa (direita) de um nó, dadas as direções de chegada e de saída
    pontoNo(id, dirIn, dirOut) {
        const n = this.nos[id];
        let x = n.x, y = n.y;
        for (const d of [dirIn, dirOut]) {
            if (!d) continue;
            if (d === 'E') y = n.y + FAIXA;
            else if (d === 'W') y = n.y - FAIXA;
            else if (d === 'S') x = n.x - FAIXA;
            else x = n.x + FAIXA;
        }
        return { x, y };
    }

    // Converte uma lista de nós em waypoints (com deslocamento de faixa e curvas suaves nas viragens).
    // Devolve também: idxMeta (waypoint do destino) e nodoIdx (para cada waypoint, o índice do próximo nó da rota).
    caminho(ids) {
        const pts = [], nodoIdx = [];
        const add = (p, n) => { pts.push(p); nodoIdx.push(n); };
        const dirs = [];
        for (let i = 0; i < ids.length - 1; i++) dirs.push(this.direcao(ids[i], ids[i + 1]));
        const d0 = dirs[0], dN = dirs[dirs.length - 1];
        const p0 = this.pontoNo(ids[0], null, d0);
        add({ x: p0.x - VETOR[d0][0] * 40, y: p0.y - VETOR[d0][1] * 40 }, 1);
        add(p0, 1);
        for (let i = 1; i < ids.length - 1; i++) {
            const c = this.pontoNo(ids[i], dirs[i - 1], dirs[i]);
            if (dirs[i - 1] === dirs[i]) { add(c, i + 1); continue; }
            // viragem: curva de Bézier quadrática à volta do canto
            const R = 20, vi = VETOR[dirs[i - 1]], vo = VETOR[dirs[i]];
            const a = { x: c.x - vi[0] * R, y: c.y - vi[1] * R }, b = { x: c.x + vo[0] * R, y: c.y + vo[1] * R };
            for (const t of [0, 0.25, 0.5, 0.75, 1]) {
                const u = 1 - t;
                add({ x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y }, i + 1);
            }
        }
        const pf = this.pontoNo(ids[ids.length - 1], dN, null);
        add(pf, ids.length);
        const idxMeta = pts.length - 1;
        add({ x: pf.x + VETOR[dN][0] * 44, y: pf.y + VETOR[dN][1] * 44 }, ids.length);
        return { pontos: pts, idxMeta, ids, nodoIdx };
    }

    // Rota até um destino (hospital ou posto). O destino fica junto à aresta a->b: o veículo chega a 'a'
    // sem passar por 'b', segue pela aresta a->b e, a meio do quarteirão, vira à direita para a baía k.
    caminhoDestino(origem, dest, k, custo) {
        const r = this.rota(origem, dest.a, custo, dest.b);
        if (!r) return null;
        const ids = [...r.ids, dest.b];
        const cam = this.caminho(ids);
        const { eixo, valor } = dest.corte;
        let corte = null;
        for (let i = cam.pontos.length - 1; i >= 1 && !corte; i--) {
            const p = cam.pontos[i - 1], q = cam.pontos[i];
            if (p[eixo] !== q[eixo] && (p[eixo] - valor) * (q[eixo] - valor) <= 0) {
                const t = (valor - p[eixo]) / (q[eixo] - p[eixo]);
                corte = { i, p: { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t } };
            }
        }
        if (!corte) return null;
        const baia = dest.baias[k % dest.baias.length].map(([x, y]) => ({ x, y }));
        const pontos = [...cam.pontos.slice(0, corte.i), corte.p, ...baia];
        const n = r.ids.length;     // o nó b não é atravessado: a rota termina antes dele
        const nodoIdx = [...cam.nodoIdx.slice(0, corte.i).map(v => Math.min(v, n)), ...Array(baia.length + 1).fill(n + 1)];
        return { pontos, idxMeta: pontos.length - 1, ids: r.ids, nodoIdx, tempo: r.tempo + 1.5 };
    }
}
