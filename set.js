import { STAT } from "./enums.js";

export class Sset {
  constructor(number) {
    this.number = number;

    this.scoreA = 0;
    this.scoreB = 0;

    this.startingLineup = {
      A: [], // array di playerId
      B: [],
    };

    this.stats = {
      players: new Map(), // playerId -> stats snapshot del set
      squads: {
        A: this._emptySquadStats(),
        B: this._emptySquadStats(),
      },
    };

    this.events = []; // eventi SOLO di questo set
    this.winner = null; // 'A' | 'B'
  }

  _emptySquadStats() {
    return {
      [STAT.TOUCHES]: 0, //palloni toccati durante la partita intera

      //Attack
      [STAT.ATTACK_WIN]: 0, //attacchi vinti
      [STAT.ATTACK_ERR]: 0, //attacchi sbagliati (solo fuori)
      [STAT.TOTAL_ATTACK]: 0, // attacchi totali fatti nella partita

      //Serve
      [STAT.ACE]: 0, //ace totali
      [STAT.SERVES]: 0,
      [STAT.SERVES_ERR]: 0, //errori totali in battuta
      [STAT.SERVES_ERR_LINE]: 0, //da capire come fare mai gestita
      [STAT.TOTAL_SERVES]: 0, //battute totali

      //Ricezione
      [STAT.DEF_POS]: 0, //ricezioni corrette mai gestita
      [STAT.DEF_NEG]: 0, //ricezioni sbagliate mai gestita
      [STAT.TOTAL_RECEIVE]: 0,

      //Lost Ball
      [STAT.BALL_LOST]: 0, //palle perse o passaggi sbagliati

      //Block
      [STAT.BLOCK_WIN]: 0, //da capire come fare mai gestita

      //Foul WB
      [STAT.FOUL_DOUBLE]: 0, //doppe
      [STAT.FOUL_FOUR_TOUCHES]: 0, //4 tocchi
      [STAT.FOUL_RAISED]: 0, //sollevata

      //Foul WOB
      [STAT.FOUL_POSITION]: 0, //fallo di posizione
      [STAT.FOUL_INVASION]: 0, //fallo di invasione

      [STAT.TOTAL_FOUL]: 0,

      //Card
      [STAT.CARD_YELLOW]: 0, //cartellini gialli
      [STAT.CARD_RED]: 0, //cartelini rossi

      [STAT.TOTAL_CARD]: 0,
    };
  }

  _updateSetPlayerStats(player, key) {
    const ps = this.stats.players;

    if (!ps.has(player.id)) {
      ps.set(player.id, structuredClone(player.stats));
    }

    ps.get(player.id)[key]++;
  }

  _updateSetSquadStats(team, key) {
    this.stats.squads[team][key]++;
  }

  toJSON_stats_squad() {
    return {
      squadA: {
        stats: this.stats.squads.A,
      },
      squadB: {
        stats: this.stats.squads.B,
      },
    };
  }

  toJSON() {
    return {
      number: this.number,

      scoreA: this.scoreA,
      scoreB: this.scoreB,

      startingLineUp: this.startingLineup,

      squadA: {
        players: this.stats.squads.A.players.map((p) => p.toJSON()),
        bench: this.stats.squads.A.bench.map((p) => p.toJSON()),
      },
      squadB: {
        players: this.stats.squads.B.players.map((p) => p.toJSON()),
        bench: this.stats.squads.B.bench.map((p) => p.toJSON()),
      },
      events: this.events, // eventi SOLO di questo set
      winner: this.winner,
    };
  }
}
