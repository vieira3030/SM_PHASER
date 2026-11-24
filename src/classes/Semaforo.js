import { COR, FONTE, outroEixo } from './Constantes.js';

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
        this.gfx = scene.add.graphics().setDepth(6);
        this.etiqueta = scene.add.text(x, y, nome.replace('S', ''), { fontFamily: FONTE, fontSize: '16px', color: '#1d1f2b', fontStyle: 'bold', backgroundColor: '#e9b949', padding: { x: 6, y: 2 } })
            .setOrigin(0.5).setDepth(7).setVisible(false);
        this.anel = scene.add.graphics().setDepth(7).setVisible(false);
        this.anel.lineStyle(4, 0xe9b949, 1).strokeCircle(x, y, 40);
        scene.tweens.add({ targets: this.anel, alpha: { from: 1, to: 0.25 }, duration: 420, yoyo: true, repeat: -1 });
        // 4 cabeças de sinal (uma por aproximação), todas clicáveis; clicar em qualquer uma troca o verde do cruzamento
        const c = 38;
        this.cabecas = [[x - c, y + c, 'H'], [x + c, y - c, 'H'], [x - c, y - c, 'V'], [x + c, y + c, 'V']];
        this.zonas = this.cabecas.map(([px, py]) => {
            const z = scene.add.zone(px, py, 34, 40).setInteractive({ useHandCursor: true }).setDepth(8);
            z.on('pointerover', () => { this.hover = true; this.desenhar(); });
            z.on('pointerout', () => { this.hover = false; this.desenhar(); });
            return z;
        });
        this.hover = false;
        this.desenhar();
    }

    aoClicar(fn) { this.zonas.forEach(z => z.on('pointerdown', fn)); }

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

    // cabeça de sinal vista de cima: caixa escura com 3 luzes (só a ativa fica acesa), poste e sombra
    desenhar() {
        const g = this.gfx;
        g.clear();
        const luz = (eixo) => {
            if (this.fase === 'VERMELHO_TODOS' || this.eixo !== eixo) return 0;
            return this.fase === 'VERDE' ? 2 : 1;           // 0 vermelho, 1 amarelo, 2 verde
        };
        this.cabecas.forEach(([px, py, eixo]) => {
            const a = luz(eixo);
            if (this.hover) g.lineStyle(2, 0xffffff, 0.8).strokeRoundedRect(px - 9, py - 17, 18, 34, 5);
            g.fillStyle(0x000000, 0.3).fillRoundedRect(px - 5, py - 12, 14, 28, 4);
            g.fillStyle(0x15171d, 1).fillRoundedRect(px - 7, py - 15, 14, 30, 4);
            g.lineStyle(1, 0x4a4f5c, 1).strokeRoundedRect(px - 7, py - 15, 14, 30, 4);
            [[0xff4a3d, 0], [0xffc83d, 1], [0x3dff8a, 2]].forEach(([cor, i]) => {
                const ly = py - 9 + i * 9, on = (i === 0 && a === 0) || (i === 1 && a === 1) || (i === 2 && a === 2);
                if (on) g.fillStyle(cor, 0.35).fillCircle(px, ly, 8);
                g.fillStyle(on ? cor : 0x2c2f38, 1).fillCircle(px, ly, 3.6);
            });
        });
    }

    destacar(on) { this.anel.setVisible(on); this.etiqueta.setVisible(on); }
}
