import { VETOR, VEL_NORMAL, VEL_AMB, VEL_EV, CONSUMO_BATERIA } from './Constantes.js';

// Frames da spritesheet 'carros' (72x36): 0-15 = 8 modelos de carro (normal, a travar), 16-17 = ambulância (sirene),
// 18-19 = carro elétrico (normal, a travar).
const FRAME = { AMB: 16, EV: 18 };

function girar(a, alvo, passo) {
    let d = Phaser.Math.Angle.Wrap(alvo - a);
    if (Math.abs(d) <= passo) return alvo;
    return a + Math.sign(d) * passo;
}

// Veículo (carro normal, ambulância ou carro elétrico). Segue uma lista de waypoints com curvas suaves.
// Usa Arcade Physics: sensores à frente (travagem) e zonas de paragem nos semáforos.
export default class Veiculo extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, tipo, caminho) {
        const p0 = caminho.pontos[0];
        const variante = Phaser.Math.Between(0, 7);
        super(scene, p0.x, p0.y, 'carros', tipo === 'AMB' ? FRAME.AMB : tipo === 'EV' ? FRAME.EV : variante * 2);
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.cena = scene;
        this.tipo = tipo;
        this.variante = variante;
        this.pontos = caminho.pontos;
        this.idxMeta = caminho.idxMeta;
        this.ids = caminho.ids;           // nós da rota (o DSS usa-os para saber por onde a ambulância vai passar)
        this.nodoIdx = caminho.nodoIdx;
        this.idx = 1;
        this.metaFeita = false;
        this.parar = false;               // pedido de paragem (semáforo)
        this.bloqueado = false;           // veículo à frente
        this.espera = 0;                  // tempo contínuo parado
        this.idade = 0;
        this.estado = 'ANDAR';            // ANDAR | ESCOLHA (EV à espera de decisão)
        this.travar = false;
        this.v = 0;
        this.velBase = tipo === 'AMB' ? VEL_AMB : tipo === 'EV' ? VEL_EV : Phaser.Math.Between(...VEL_NORMAL);
        this.setScale(0.5);
        this.body.setSize(32, 32);
        this.body.setOffset(20, 2);
        this.setDepth(tipo === 'NORMAL' ? 3 : 4);
        if (tipo === 'AMB') this.play('anim_amb');
        // sensor à frente do veículo (corpo físico) para detetar veículos na mesma faixa
        this.sensor = scene.add.zone(p0.x, p0.y, 10, 10);
        scene.physics.add.existing(this.sensor);
        this.sensor.owner = this;
        scene.sensores.add(this.sensor);
        this.definirDirecao();
        this.setRotation(this.anguloAlvo());
        this.atualizarSensor();
        if (tipo === 'EV') { this.bateria = 0; this.eficiencia = 0; this.entrada = null; }
    }

    anguloAlvo() {
        const p = this.pontos[this.idx];
        return Math.atan2(p.y - this.y, p.x - this.x);
    }

    // direção cardinal do segmento atual (usada na lógica de semáforos e filas)
    definirDirecao() {
        const p = this.pontos[this.idx];
        const dx = p.x - this.x, dy = p.y - this.y;
        this.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'E' : 'W') : (dy > 0 ? 'S' : 'N');
    }

    atualizarSensor() {
        this.sensor.setPosition(this.x + Math.cos(this.rotation) * 26, this.y + Math.sin(this.rotation) * 26);
        this.sensor.body.updateFromGameObject();
    }

    // Chamado uma vez por frame, DEPOIS do passo de física (que preenche parar/bloqueado).
    atualizar(dt) {
        this.idade += dt;
        const aguardar = this.estado === 'ESCOLHA';
        const parado = this.parar || this.bloqueado || aguardar;
        const alvo = parado ? 0 : this.velBase;
        const acel = alvo > this.v ? 160 : 420;
        this.v = this.v < alvo ? Math.min(this.v + acel * dt, alvo) : Math.max(this.v - acel * dt, alvo);
        this.parar = false;
        this.bloqueado = false;

        // luzes de travagem
        const travar = parado || this.v < this.velBase * 0.55;
        if (travar !== this.travar) {
            this.travar = travar;
            if (this.tipo === 'NORMAL') this.setFrame(this.variante * 2 + (travar ? 1 : 0));
            else if (this.tipo === 'EV') this.setFrame(FRAME.EV + (travar ? 1 : 0));
        }
        if (this.v < 4) this.espera += dt; else this.espera = 0;

        if (this.tipo === 'EV' && this.estado === 'ANDAR' && !this.metaFeita) {
            this.bateria = Math.max(0, this.bateria - CONSUMO_BATERIA * dt * (this.v > 4 ? 1 : 0.4));
        }

        let p = this.pontos[this.idx];
        let dx = p.x - this.x, dy = p.y - this.y;
        let dist = Math.hypot(dx, dy);
        if (dist < 4 || (this.v > 0 && dist < this.v * dt)) {
            if (this.idx === this.idxMeta && !this.metaFeita) { this.metaFeita = true; this.cena.aoMeta(this); }
            this.idx++;
            if (this.idx >= this.pontos.length) { this.cena.aoSair(this); return; }
            p = this.pontos[this.idx];
            dx = p.x - this.x; dy = p.y - this.y; dist = Math.hypot(dx, dy) || 1;
            this.definirDirecao();
        }
        if (this.v > 1) this.rotation = girar(this.rotation, Math.atan2(dy, dx), 7 * dt);
        this.body.setVelocity(dx / dist * this.v, dy / dist * this.v);
        this.atualizarSensor();
        this.alpha = aguardar ? 0.7 + 0.3 * Math.sin(this.cena.time.now / 90) : 1;
    }

    // Define uma nova rota (usado pelo EV depois de escolher o posto).
    novaRota(caminho) {
        this.pontos = caminho.pontos;
        this.idxMeta = caminho.idxMeta;
        this.ids = caminho.ids;
        this.nodoIdx = caminho.nodoIdx;
        this.idx = 1;
        this.definirDirecao();
    }

    destroy(fromScene) {
        if (this.sensor) { this.cena.sensores.remove(this.sensor, true, true); this.sensor = null; }
        super.destroy(fromScene);
    }
}
