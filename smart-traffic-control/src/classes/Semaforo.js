import { COR, FONTE, outroEixo, DIST_PARAGEM, MEIA_ESTRADA } from './Constantes.js';

// Semáforo de um cruzamento: máquina de estados VERDE -> AMARELO -> VERMELHO_TODOS -> VERDE (eixo trocado).
// O eixo 'H' = avenidas horizontais (E/W); o eixo 'V' = verticais (N/S).
// Visual: barras coloridas nas linhas de paragem, 4 focos nos cantos e um "medalhão" central com setas
// que mostra qual o eixo com verde. Se o jogador não intervir, o ciclo é automático (duração aleatória).
export default class Semaforo {
    constructor(scene, nome, x, y) {
        this.scene = scene;
        this.nome = nome;
        this.x = x;
        this.y = y;
        this.eixo = Phaser.Math.RND.pick(['H', 'V']); // eixo que tem (ou vai ter) verde
        this.fase = 'VERDE';
        this.t = 0;
        this.proximoEixo = null;
        this.tempoVerde = Phaser.Math.FloatBetween(10, 15);
        this.gfx = scene.add.graphics().setDepth(2);
        this.hub = scene.add.graphics().setDepth(6);
        this.etiqueta = scene.add.text(x, y + 25, nome, { fontFamily: FONTE, fontSize: '10px', color: '#fffdf6', fontStyle: 'bold', backgroundColor: '#2b2d42cc', padding: { x: 4, y: 1 } })
            .setOrigin(0.5).setDepth(7);
        this.anel = scene.add.graphics().setDepth(7).setVisible(false);
        this.anel.lineStyle(4, 0xe9b949, 1).strokeCircle(x, y, 27);
        scene.tweens.add({ targets: this.anel, alpha: { from: 1, to: 0.2 }, duration: 420, yoyo: true, repeat: -1 });
        this.zona = scene.add.zone(x, y, 76, 76).setInteractive({ useHandCursor: true });
        this.desenhar();
    }

    verde(eixo) { return this.fase === 'VERDE' && this.eixo === eixo; }

    // Pedido de verde para um eixo (jogador ou DSS). Devolve true se algo mudou.
    pedirVerde(eixo) {
        if (this.fase === 'VERDE') {
            if (this.eixo === eixo) { this.t = 0; return false; }
            this.iniciarTroca();
            return true;
        }
        this.proximoEixo = eixo;   // já em transição: garante que o eixo pedido é o próximo
        return true;
    }

    alternar() { return this.pedirVerde(outroEixo(this.eixo)); }

    iniciarTroca() {
        this.proximoEixo = outroEixo(this.eixo);
        this.fase = 'AMARELO';
        this.t = 0;
        this.desenhar();
    }

    update(dt) {
        this.t += dt;
        if (this.fase === 'VERDE' && this.t >= this.tempoVerde) this.iniciarTroca();
        else if (this.fase === 'AMARELO' && this.t >= 1.1) { this.fase = 'VERMELHO_TODOS'; this.t = 0; this.desenhar(); }
        else if (this.fase === 'VERMELHO_TODOS' && this.t >= 0.8) {
            this.eixo = this.proximoEixo || outroEixo(this.eixo);
            this.proximoEixo = null;
            this.fase = 'VERDE';
            this.t = 0;
            this.tempoVerde = Phaser.Math.FloatBetween(10, 15);
            this.desenhar();
        }
    }

    cor(eixo) {
        if (this.fase === 'VERMELHO_TODOS' || this.eixo !== eixo) return COR.vermelho;
        return this.fase === 'VERDE' ? COR.verde : COR.amarelo;
    }

    desenhar() {
        const g = this.gfx, x = this.x, y = this.y, D = DIST_PARAGEM - 10, M = MEIA_ESTRADA - 1, c = 38;
        g.clear();
        // barras de paragem coloridas (uma por aproximação) por cima da linha branca do mapa
        const cH = this.cor('H'), cV = this.cor('V');
        g.fillStyle(cH, 0.95);
        g.fillRect(x - D - 0.5, y, 4.5, M);               // vindo de oeste (faixa sul)
        g.fillRect(x + D - 4, y - M, 4.5, M);             // vindo de este (faixa norte)
        g.fillStyle(cV, 0.95);
        g.fillRect(x - M, y - D - 0.5, M, 4.5);           // vindo de norte (faixa oeste)
        g.fillRect(x, y + D - 4, M, 4.5);                 // vindo de sul (faixa este)
        // focos nos cantos (apenas a luz ativa acesa)
        const foco = (px, py, cor) => {
            g.fillStyle(0x1d1f2b, 1).fillCircle(px, py, 7.5);
            g.fillStyle(cor, 1).fillCircle(px, py, 5);
            g.fillStyle(0xffffff, 0.35).fillCircle(px - 1.5, py - 1.5, 1.6);
        };
        foco(x - c, y + c, cH); foco(x + c, y - c, cH);
        foco(x - c, y - c, cV); foco(x + c, y + c, cV);
        this.desenharHub();
    }

    // medalhão central: setas na direção do eixo com verde
    desenharHub() {
        const h = this.hub, x = this.x, y = this.y;
        h.clear();
        h.fillStyle(0x000000, 0.25).fillCircle(x + 1.5, y + 2, 16);
        h.fillStyle(0xfffdf6, 0.97).fillCircle(x, y, 15);
        h.lineStyle(2, 0x2b2d42, 1).strokeCircle(x, y, 15);
        if (this.fase === 'VERMELHO_TODOS') {
            h.lineStyle(3.5, COR.vermelho, 1);
            h.lineBetween(x - 6, y - 6, x + 6, y + 6); h.lineBetween(x - 6, y + 6, x + 6, y - 6);
            return;
        }
        const cor = this.fase === 'VERDE' ? COR.verde : COR.amarelo;
        h.lineStyle(3.5, cor, 1).fillStyle(cor, 1);
        if (this.eixo === 'H') {
            h.lineBetween(x - 7, y, x + 7, y);
            h.fillTriangle(x - 11, y, x - 5, y - 5, x - 5, y + 5); h.fillTriangle(x + 11, y, x + 5, y - 5, x + 5, y + 5);
        } else {
            h.lineBetween(x, y - 7, x, y + 7);
            h.fillTriangle(x, y - 11, x - 5, y - 5, x + 5, y - 5); h.fillTriangle(x, y + 11, x - 5, y + 5, x + 5, y + 5);
        }
    }

    destacar(on) { this.anel.setVisible(on); }
}
