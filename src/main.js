import { LARGURA, ALTURA, ESCALA } from './classes/Constantes.js';
import PreloadScene from './scenes/PreloadScene.js';
import MenuScene from './scenes/MenuScene.js';
import InstrucoesScene from './scenes/InstrucoesScene.js';
import JogoScene from './scenes/JogoScene.js';
import GameOverScene from './scenes/GameOverScene.js';

// Texto nítido: todos os textos são desenhados com resolução igual à ESCALA da câmara.
const fabricaTexto = Phaser.GameObjects.GameObjectFactory.prototype.text;
Phaser.GameObjects.GameObjectFactory.prototype.text = function (x, y, texto, estilo) {
    return fabricaTexto.call(this, x, y, texto, { resolution: ESCALA, ...estilo });
};

// Configuração principal (Phaser 4). O jogo usa coordenadas 800x480, mas o canvas tem o dobro (1600x960)
// e cada cena aplica zoom 2 à câmara: a imagem fica nítida em ecrãs grandes. Escala FIT: desktop e mobile.
const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: LARGURA * ESCALA,
    height: ALTURA * ESCALA,
    backgroundColor: '#0b1020',
    physics: {
        default: 'arcade',
        arcade: { gravity: { x: 0, y: 0 }, debug: false }
    },
    input: { activePointers: 3 },
    dom: { createContainer: true },
    scene: [PreloadScene, MenuScene, InstrucoesScene, JogoScene, GameOverScene],
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }
};

window.jogo = new Phaser.Game(config);

// ---------------- Ecrã inteiro ----------------
// alterna entre ecrã inteiro e janela (botões "Ecrã inteiro" e tecla F). No telemóvel tenta também
// fixar a orientação na horizontal (só funciona em ecrã inteiro e em browsers que o suportem).
export function alternarEcraInteiro() {
    const sc = window.jogo.scale;
    if (sc.isFullscreen) { sc.stopFullscreen(); return; }
    sc.startFullscreen();
    try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) { /* não suportado */ }
}
window.alternarEcraInteiro = alternarEcraInteiro;

// No telemóvel (ecrã tátil), o primeiro toque põe o jogo em ecrã inteiro (esconde a barra do browser).
// Tem de ser dentro de um toque do utilizador: os browsers não deixam fazê-lo automaticamente.
const tatil = window.matchMedia('(pointer: coarse)').matches;
window.addEventListener('pointerup', () => {
    if (tatil && !window.jogo.scale.isFullscreen) alternarEcraInteiro();
});
// tecla F: ecrã inteiro em qualquer dispositivo
window.addEventListener('keydown', (ev) => {
    if (ev.key === 'f' || ev.key === 'F') { if (document.activeElement && document.activeElement.tagName === 'INPUT') return; alternarEcraInteiro(); }
});
