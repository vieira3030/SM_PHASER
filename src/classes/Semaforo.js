import { FONTE } from './Constantes.js';

// Cruzamento com 4 semáforos independentes, um por via. Cada um é identificado pelo sentido de marcha
// de quem chega: 'E' (vem de oeste), 'W' (vem de este), 'S' (vem de norte), 'N' (vem de sul).
// Clicar num semáforo troca só esse (verde <-> vermelho). O eixo 'H' = vias E/W; o eixo 'V' = vias N/S.
// Visual: a caixa de cada semáforo e a linha de paragem da sua via mostram a cor atual.
// Se o jogador não intervir, ao fim de 10-15 s todos os semáforos do cruzamento invertem.
export default class Semaforo {
    constructor(scene, nome, x, y) {
        this.scene = scene;
        this.nome = nome;
        this.x = x;
        this.y = y;
        const h = Phaser.Math.RND.pick([true, false]);       // começa com um eixo verde e o outro vermelho
        this.luz = { E: h, W: h, S: !h, N: !h };              // true = verde
        this.t = 0;
        this.tempoVerde = Phaser.Math.FloatBetween(10, 15);
        this.liberados = new Set();   // carros autorizados a atravessar (reserva do cruzamento)
        this.gfx = scene.add.graphics().setDepth(6);
        this.linhas = scene.add.graphics().setDepth(1);   // linhas de paragem coloridas (por baixo dos carros)
        this.anel = scene.add.graphics().setDepth(7).setVisible(false);
        scene.tweens.add({ targets: this.anel, alpha: { from: 1, to: 0.25 }, duration: 420, yoyo: true, repeat: -1 });
        // posição de cada semáforo: no canto à direita de quem chega, junto à linha de paragem
        this.cabecas = [[x - 41, y + 41, 'H', 'E'], [x + 41, y - 41, 'H', 'W'], [x - 41, y - 41, 'V', 'S'], [x + 41, y + 41, 'V', 'N']];
        this.hover = null;
        this.zonas = this.cabecas.map(([px, py, , dir]) => {
            // área de toque (54x54) maior do que o desenho, para ser fácil tocar no telemóvel
            const z = scene.add.zone(px, py, 54, 54).setInteractive({ useHandCursor: true }).setDepth(8);
            z.on('pointerover', () => { this.hover = dir; this.desenhar(); });
            z.on('pointerout', () => { this.hover = null; this.desenhar(); });
            z.dir = dir;
            return z;
        });
        this.desenhar();
    }

    // fn(dir) é chamada com o sentido do semáforo clicado
    aoClicar(fn) { this.zonas.forEach(z => z.on('pointerdown', () => fn(z.dir))); }

    verdeDir(dir) { return this.luz[dir]; }
    // eixo todo verde (os dois semáforos desse eixo)
    verde(eixo) { return eixo === 'H' ? this.luz.E && this.luz.W : this.luz.N && this.luz.S; }

    // jogador: troca só o semáforo clicado
    alternarDir(dir) {
        this.luz[dir] = !this.luz[dir];
        this.t = 0;
        this.desenhar();
    }

    // Assistente (ACEITAR): verde para os dois semáforos de um eixo e vermelho para o outro eixo
    pedirVerde(eixo) {
        const h = eixo === 'H';
        this.luz = { E: h, W: h, S: !h, N: !h };
        this.t = 0;
        this.tempoVerde = Phaser.Math.FloatBetween(10, 15);
        this.desenhar();
    }

    // ciclo automático: se ninguém mexer, todos os semáforos do cruzamento invertem
    update(dt) {
        this.t += dt;
        if (this.t >= this.tempoVerde) {
            for (const d in this.luz) this.luz[d] = !this.luz[d];
            this.t = 0;
            this.tempoVerde = Phaser.Math.FloatBetween(10, 15);
            this.desenhar();
        }
    }

    // caixa do semáforo vista de cima: 2 luzes (vermelha e verde, só a ativa acesa)
    desenhar() {
        const g = this.gfx, x = this.x, y = this.y, L = this.linhas;
        const cor = (d) => (this.luz[d] ? 0x2fd47a : 0xe8402f);
        g.clear();
        // a linha de paragem de cada via fica com a cor do seu semáforo: é aí que o carro para
        L.clear();
        L.fillStyle(cor('E'), 1).fillRect(x - 51, y + 1, 4, 26);
        L.fillStyle(cor('W'), 1).fillRect(x + 47, y - 27, 4, 26);
        L.fillStyle(cor('S'), 1).fillRect(x - 27, y - 51, 26, 4);
        L.fillStyle(cor('N'), 1).fillRect(x + 1, y + 47, 26, 4);
        const cores = [0xff4a3d, 0x3dff8a];
        this.cabecas.forEach(([px, py, eixo, dir]) => {
            const a = this.luz[dir] ? 1 : 0, hz = eixo === 'H';
            const w = hz ? 24 : 14, h = hz ? 14 : 24;
            if (this.hover === dir) g.lineStyle(2, 0xffffff, 0.9).strokeRoundedRect(px - w / 2 - 3, py - h / 2 - 3, w + 6, h + 6, 6);
            g.fillStyle(0x000000, 0.3).fillRoundedRect(px - w / 2 + 2, py - h / 2 + 3, w, h, 4);
            g.fillStyle(0x15171d, 1).fillRoundedRect(px - w / 2, py - h / 2, w, h, 4);
            g.lineStyle(1, 0x4a4f5c, 1).strokeRoundedRect(px - w / 2, py - h / 2, w, h, 4);
            cores.forEach((c, i) => {
                const lx = hz ? px - 5 + i * 10 : px, ly = hz ? py : py - 5 + i * 10, on = a === i;
                if (on) g.fillStyle(c, 0.35).fillCircle(lx, ly, 8);
                g.fillStyle(on ? c : 0x2c2f38, 1).fillCircle(lx, ly, 3.8);
            });
        });
    }

    // destaca (anel amarelo a piscar) os semáforos vermelhos do eixo sugerido (ou só o da via 'dir')
    destacar(on, eixo, dir) {
        this.anel.clear().setVisible(on);
        if (!on) return;
        this.anel.lineStyle(4, 0xe9b949, 1);
        this.cabecas.filter(c => (dir ? c[3] === dir : c[2] === eixo && !this.luz[c[3]]))
            .forEach(([px, py]) => this.anel.strokeCircle(px, py, 20));
    }

    // semáforo (posição) de uma via
    cabeca(dir) { return this.cabecas.find(c => c[3] === dir); }
}
