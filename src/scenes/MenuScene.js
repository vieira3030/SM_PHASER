import { LARGURA, ALTURA, FONTE, COR } from '../classes/Constantes.js';
import { criarBotao, cartao } from '../classes/UI.js';
import Som from '../classes/Som.js';

export default class MenuScene extends Phaser.Scene {
    constructor() { super('MenuScene'); }

    create() {
        Som.pararTudo();
        // mapa ampliado a cobrir o ecrã, escurecido; os carros passam por trás do cartão
        this.add.image(LARGURA / 2, ALTURA / 2, 'mapa').setScale(LARGURA / 1200).setDepth(-2);
        this.add.rectangle(LARGURA / 2, ALTURA / 2, LARGURA, ALTURA, 0x12151b, 0.55).setDepth(-1);
        const passar = (frame, y, dur, delay, volta, anim) => {
            const s = this.add.sprite(volta ? LARGURA + 50 : -50, y, 'carros', frame).setScale(0.7).setDepth(1);
            if (anim) s.play('anim_amb');
            s.setRotation(volta ? Math.PI : 0);
            this.tweens.add({ targets: s, x: volta ? -60 : LARGURA + 60, duration: dur, delay, repeat: -1, repeatDelay: Phaser.Math.Between(800, 3000) });
        };
        // faixas visíveis acima e abaixo do cartão
        passar(16, 108, 5600, 600, false, true); passar(0, 108, 6600, 3200, false);
        passar(2, 70, 7000, 1500, true); passar(18, 70, 6400, 4200, true);
        passar(8, 378, 6200, 0, false); passar(12, 340, 7200, 2000, true); passar(6, 378, 6800, 4500, false);

        cartao(this, LARGURA / 2 - 230, 110, 460, 270);
        this.add.text(LARGURA / 2, 134, 'VIANA DO CASTELO · CENTRAL DE TRÁFEGO', { fontFamily: FONTE, fontSize: '12px', color: COR.terracotaTxt, fontStyle: 'bold' }).setOrigin(0.5);
        this.add.text(LARGURA / 2, 182, 'Smart Traffic Control', { fontFamily: 'Georgia, serif', fontSize: '36px', color: COR.tintaTxt, fontStyle: 'bold' }).setOrigin(0.5);
        this.add.text(LARGURA / 2, 224, 'Controla os semáforos, dá passagem às ambulâncias\ne encontra o melhor posto para os carros elétricos.', { fontFamily: FONTE, fontSize: '14px', color: COR.cinzaTxt, align: 'center' }).setOrigin(0.5);

        criarBotao(this, LARGURA / 2 - 105, 282, 200, 44, 'JOGAR', () => this.scene.start('JogoScene', { nivel: 1, pontos: 0, vidas: 3 }), { cor: COR.verde, corHover: 0x2d8a5e });
        criarBotao(this, LARGURA / 2 + 105, 282, 200, 44, 'COMO JOGAR', () => this.scene.start('InstrucoesScene'), { cor: COR.papelEscuro, corHover: 0x4a5260 });

        const rotulo = (n, v) => `${n}: ${Math.round(v * 100)}%`;
        const passo = (v) => (v >= 1 ? 0 : v >= 0.5 ? 1 : 0.5);
        const pequeno = { cor: 0x2d333e, corHover: 0x4a5260, txt: COR.tintaTxt, fonte: '13px' };
        const bm = criarBotao(this, LARGURA / 2 - 105, 336, 200, 30, rotulo('Música', Som.vol.m), () => {
            Som.vol.m = passo(Som.vol.m); Som.guardar(); bm.setTexto(rotulo('Música', Som.vol.m));
        }, pequeno);
        const be = criarBotao(this, LARGURA / 2 + 105, 336, 200, 30, rotulo('Efeitos', Som.vol.e), () => {
            Som.vol.e = passo(Som.vol.e); Som.guardar(); be.setTexto(rotulo('Efeitos', Som.vol.e)); Som.tocar('aceitar');
        }, pequeno);

        let recorde = 0;
        try { recorde = Number(localStorage.getItem('stc_recorde') || 0); } catch (e) { /* ignora */ }
        this.add.text(LARGURA / 2, 366, `Recorde: ${recorde} pontos`, { fontFamily: FONTE, fontSize: '12px', color: COR.cinzaTxt }).setOrigin(0.5);
        this.add.text(LARGURA / 2, 462, 'Sistemas Multimédia 2026/27 · Universidade Politécnica de Viana do Castelo', { fontFamily: FONTE, fontSize: '11px', color: '#e8e6df', backgroundColor: '#12151bcc', padding: { x: 8, y: 3 } }).setOrigin(0.5).setDepth(5);
        this.children.each(c => { if (c.depth === 0) c.setDepth(5); });
    }
}
