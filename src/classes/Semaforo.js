import { COR, FONTE, outroEixo } from './Constantes.js';

// Semáforo de um cruzamento: um eixo tem verde e o outro vermelho; clicar troca de imediato.
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
        this.t = 0;
        this.tempoVerde = Phaser.Math.FloatBetween(10, 15);
        this.gfx = scene.add.graphics().setDepth(6);
        this.etiqueta = scene.add.text(x, y, '!', { fontFamily: FONTE, fontSize: '16px', color: '#1d1f2b', fontStyle: 'bold', backgroundColor: '#e9b949', padding: { x: 6, y: 2 } })
            .setOrigin(0.5).setDepth(7).setVisible(false);
        this.anel = scene.add.graphics().setDepth(7).setVisible(false);
        scene.tweens.add({ targets: this.anel, alpha: { from: 1, to: 0.25 }, duration: 420, yoyo: true, repeat: -1 });
        // 2 cabeças de sinal: a horizontal (canto sudoeste) controla a avenida horizontal,
        // a vertical (canto nordeste) controla a rua vertical. Clicar em qualquer uma troca o verde.
        this.cabecas = [[x - 41, y + 41, 'H'], [x + 41, y - 41, 'V']];
        this.zonas = this.cabecas.map(([px, py]) => {
            const z = scene.add.zone(px, py, 44, 44).setInteractive({ useHandCursor: true }).setDepth(8);
            z.on('pointerover', () => { this.hover = true; this.desenhar(); });
            z.on('pointerout', () => { this.hover = false; this.desenhar(); });
            return z;
        });
        this.hover = false;
        this.desenhar();
    }

    aoClicar(fn) { this.zonas.forEach(z => z.on('pointerdown', fn)); }

    verde(eixo) { return this.eixo === eixo; }

    // Pedido de verde para um eixo (jogador ou DSS): a troca é imediata (só há verde e vermelho).
    pedirVerde(eixo) {
        this.t = 0;
        if (this.eixo === eixo) return false;
        this.eixo = eixo;
        this.tempoVerde = Phaser.Math.FloatBetween(10, 15);
        this.desenhar();
        return true;
    }

    alternar() { return this.pedirVerde(outroEixo(this.eixo)); }

    // ciclo automático: se ninguém mexer, troca sozinho ao fim de 10-15 s
    update(dt) {
        this.t += dt;
        if (this.t >= this.tempoVerde) this.alternar();
    }

    // cabeça de sinal vista de cima: caixa escura com 3 luzes (só a ativa fica acesa), poste e sombra
    desenhar() {
        const g = this.gfx;
        g.clear();
        const luz = (eixo) => (this.eixo === eixo ? 1 : 0);   // 0 vermelho, 1 verde
        const cores = [0xff4a3d, 0x3dff8a];
        this.cabecas.forEach(([px, py, eixo]) => {
            const a = luz(eixo), hz = eixo === 'H';
            const w = hz ? 24 : 14, h = hz ? 14 : 24;
            if (this.hover) g.lineStyle(2, 0xffffff, 0.9).strokeRoundedRect(px - w / 2 - 3, py - h / 2 - 3, w + 6, h + 6, 6);
            g.fillStyle(0x000000, 0.3).fillRoundedRect(px - w / 2 + 2, py - h / 2 + 3, w, h, 4);
            g.fillStyle(0x15171d, 1).fillRoundedRect(px - w / 2, py - h / 2, w, h, 4);
            g.lineStyle(1, 0x4a4f5c, 1).strokeRoundedRect(px - w / 2, py - h / 2, w, h, 4);
            cores.forEach((cor, i) => {
                const lx = hz ? px - 5 + i * 10 : px, ly = hz ? py : py - 5 + i * 10, on = a === i;
                if (on) g.fillStyle(cor, 0.35).fillCircle(lx, ly, 8);
                g.fillStyle(on ? cor : 0x2c2f38, 1).fillCircle(lx, ly, 3.8);
            });
        });
    }

    // destaca (anel amarelo a piscar) a cabeça do eixo que deve passar a verde
    destacar(on, eixo) {
        this.anel.clear().setVisible(on);
        if (!on) return;
        const [px, py] = this.cabecas.find(c => c[2] === eixo);
        this.anel.lineStyle(4, 0xe9b949, 1).strokeCircle(px, py, 21);
    }
}
