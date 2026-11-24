import { camaraHD } from '../classes/UI.js';
import { LARGURA, ALTURA, FONTE } from '../classes/Constantes.js';
import Som from '../classes/Som.js';

const SONS = ['semaforo', 'botao', 'aceitar', 'ignorar', 'sucesso', 'erro', 'nivel', 'alerta_ev', 'carregar', 'buzina', 'sirene', 'ambiente', 'musica'];

// Carrega todos os recursos (imagens e sons da pasta assets) com barra de progresso.
export default class PreloadScene extends Phaser.Scene {
    constructor() { super('PreloadScene'); }

    preload() {
        camaraHD(this);
        this.add.rectangle(LARGURA / 2, ALTURA / 2, LARGURA, ALTURA, 0x2b2d42);
        this.add.text(LARGURA / 2, ALTURA / 2 - 70, 'SMART TRAFFIC CONTROL', { fontFamily: 'Georgia, serif', fontSize: '34px', color: '#f1e8d2', fontStyle: 'bold' }).setOrigin(0.5);
        const estado = this.add.text(LARGURA / 2, ALTURA / 2 + 40, 'A carregar...', { fontFamily: FONTE, fontSize: '15px', color: '#c9c2ad' }).setOrigin(0.5);
        this.add.rectangle(LARGURA / 2, ALTURA / 2, 404, 20, 0x1c1e2e).setStrokeStyle(2, 0xf1e8d2, 0.6);
        const barra = this.add.rectangle(LARGURA / 2 - 199, ALTURA / 2, 0, 14, 0xe9b949).setOrigin(0, 0.5);
        this.load.on('progress', (p) => { barra.width = 398 * p; estado.setText(`A carregar... ${Math.round(p * 100)}%`); });

        this.load.setPath('assets/');
        [1, 2, 3].forEach(n => this.load.image('mapa' + n, `img/mapa${n}.png`));
        this.load.json('niveis', 'data/niveis.json');
        this.load.spritesheet('carros', 'img/carros.png', { frameWidth: 72, frameHeight: 36 });
                SONS.forEach(s => this.load.audio(s, [`audio/${s}.ogg`, `audio/${s}.mp3`]));
    }

    create() {
        Som.iniciar(this.game);
        // animação da sirene da ambulância (spritesheet com 2 frames)
        this.anims.create({ key: 'anim_amb', frames: this.anims.generateFrameNumbers('carros', { frames: [16, 17] }), frameRate: 5, repeat: -1 });
        this.time.delayedCall(250, () => this.scene.start('MenuScene'));
    }
}
