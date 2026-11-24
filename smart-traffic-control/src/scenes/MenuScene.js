import { LARGURA, ALTURA, FONTE, COR } from '../classes/Constantes.js';
import { criarBotao, cartao, titulo } from '../classes/UI.js';
import Som from '../classes/Som.js';

export default class MenuScene extends Phaser.Scene {
    constructor() { super('MenuScene'); }

    create() {
        Som.pararTudo();
        // mapa da cidade como fundo, escurecido, com carros a passar na avenida
        this.add.image(0, 0, 'mapa').setOrigin(0).setScale(0.5);
        this.add.image(600, 0, 'mapa').setOrigin(0).setScale(0.5).setCrop(0, 0, 400, 960);
        this.add.rectangle(LARGURA / 2, ALTURA / 2, LARGURA, ALTURA, 0x1d1f2e, 0.62);
        const passar = (frame, y, dur, delay, volta, anim) => {
            const s = this.add.sprite(volta ? LARGURA + 50 : -50, y, 'carros', frame).setScale(0.62).setDepth(2);
            if (anim) s.play('anim_amb');
            s.setRotation(volta ? Math.PI : 0);
            this.tweens.add({ targets: s, x: volta ? -60 : LARGURA + 60, duration: dur, delay, repeat: -1, repeatDelay: Phaser.Math.Between(400, 2200) });
        };
        passar(16, 144, 5200, 600, false, true);
        passar(0, 144, 6400, 2600, false); passar(6, 144, 6000, 4800, false);
        passar(2, 116, 6800, 1200, true); passar(18, 116, 6200, 3800, true);
        passar(8, 344, 6000, 0, false); passar(12, 316, 7200, 1800, true);

        cartao(this, LARGURA / 2 - 250, 96, 500, 292);
        this.add.text(LARGURA / 2, 120, 'VIANA DO CASTELO · CENTRAL DE TRÁFEGO', { fontFamily: FONTE, fontSize: '12px', color: COR.terracotaTxt, fontStyle: 'bold' }).setOrigin(0.5);
        this.add.text(LARGURA / 2, 168, 'Smart Traffic\nControl', { fontFamily: 'Georgia, serif', fontSize: '46px', color: COR.tintaTxt, fontStyle: 'bold', align: 'center', lineSpacing: -4 }).setOrigin(0.5);
        this.add.text(LARGURA / 2, 228, 'Dá passagem às ambulâncias e encontra o melhor posto\npara carregar cada carro elétrico.', { fontFamily: FONTE, fontSize: '14px', color: COR.cinzaTxt, align: 'center' }).setOrigin(0.5);

        criarBotao(this, LARGURA / 2 - 110, 290, 200, 46, 'JOGAR', () => this.scene.start('JogoScene', { nivel: 1, pontos: 0, vidas: 3 }), { cor: COR.verde, corHover: 0x25805a });
        criarBotao(this, LARGURA / 2 + 110, 290, 200, 46, 'COMO JOGAR', () => this.scene.start('InstrucoesScene'));

        const rotulo = (n, v) => `${n}: ${Math.round(v * 100)}%`;
        const passo = (v) => (v >= 1 ? 0 : v >= 0.5 ? 1 : 0.5);
        const pequeno = { cor: COR.papelEscuro, corHover: 0xd2c49f, txt: COR.tintaTxt, fonte: '14px' };
        const bm = criarBotao(this, LARGURA / 2 - 110, 348, 200, 32, rotulo('Música', Som.vol.m), () => {
            Som.vol.m = passo(Som.vol.m); Som.guardar(); bm.setTexto(rotulo('Música', Som.vol.m));
        }, pequeno);
        const be = criarBotao(this, LARGURA / 2 + 110, 348, 200, 32, rotulo('Efeitos', Som.vol.e), () => {
            Som.vol.e = passo(Som.vol.e); Som.guardar(); be.setTexto(rotulo('Efeitos', Som.vol.e)); Som.tocar('aceitar');
        }, pequeno);

        let recorde = 0;
        try { recorde = Number(localStorage.getItem('stc_recorde') || 0); } catch (e) { /* ignora */ }
        this.add.text(LARGURA / 2, 416, `Recorde: ${recorde} pontos`, { fontFamily: FONTE, fontSize: '13px', color: '#f1e8d2' }).setOrigin(0.5);
        this.add.text(LARGURA / 2, 460, 'Sistemas Multimédia 2026/27 · Universidade Politécnica de Viana do Castelo', { fontFamily: FONTE, fontSize: '11px', color: '#c9c2ad' }).setOrigin(0.5);
    }
}
