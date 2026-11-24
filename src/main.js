import { LARGURA, ALTURA } from './classes/Constantes.js';
import PreloadScene from './scenes/PreloadScene.js';
import MenuScene from './scenes/MenuScene.js';
import InstrucoesScene from './scenes/InstrucoesScene.js';
import JogoScene from './scenes/JogoScene.js';
import GameOverScene from './scenes/GameOverScene.js';

// Configuração principal (Phaser 4). Ecrã 800x480 com escala FIT: funciona em desktop e mobile.
const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: LARGURA,
    height: ALTURA,
    backgroundColor: '#0b1020',
    physics: {
        default: 'arcade',
        arcade: { gravity: { x: 0, y: 0 }, debug: false }
    },
    input: { activePointers: 3 },
    scene: [PreloadScene, MenuScene, InstrucoesScene, JogoScene, GameOverScene],
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }
};

window.jogo = new Phaser.Game(config);
