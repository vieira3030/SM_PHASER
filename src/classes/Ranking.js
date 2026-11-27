// Top 5 de pontuações (nome, pontos, nível), guardado no browser (localStorage).
const CHAVE = 'stc_top5';

export default class Ranking {
    // lista atual do top 5 (array de { nome, pontos, nivel }), lida do localStorage
    static lista() {
        try { return JSON.parse(localStorage.getItem(CHAVE) || '[]'); } catch (e) { return []; }
    }

    // a pontuação entra no top 5?
    static entra(pontos) {
        const l = Ranking.lista();
        return pontos > 0 && (l.length < 5 || pontos > l[l.length - 1].pontos);
    }

    // guarda e devolve a posição (0-4) da nova entrada
    static guardar(nome, pontos, nivel) {
        const l = Ranking.lista();
        const nova = { nome: (nome || 'Jogador').trim().slice(0, 12) || 'Jogador', pontos, nivel };
        l.push(nova);
        l.sort((a, b) => b.pontos - a.pontos);
        const top = l.slice(0, 5);
        try {
            localStorage.setItem(CHAVE, JSON.stringify(top));
            localStorage.setItem('stc_recorde', String(top[0].pontos));
        } catch (e) { /* sem armazenamento */ }
        return top.indexOf(nova);
    }
}
