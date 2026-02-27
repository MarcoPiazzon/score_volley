import { STAT } from "../enums.js";

export default class Sset {
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

  static fromJSON(json) {
    console.log(json);

    const set = new Sset(json.number);

    set.scoreA = json.scoreA;
    set.scoreB = json.scoreB;
    set.winner = json.winner;

    set.startingLineUp = {
      A: [...json.startingLineUp.A],
      B: [...json.startingLineUp.B],
    };

    console.log(json);

    set.stats.players = new Map();
    for (const playerId in json.stats.players) {
      set.stats.players.set(playerId, {
        ...json.stats.players[playerId],
      });
    }

    // Squad stats
    set.stats.squads = {
      A: { ...json.stats.squads.A },
      B: { ...json.stats.squads.B },
    };

    // Eventi
    set.events = json.events.map((e) => ({ ...e }));

    return set;
  }

  _emptySquadStats() {
    return {
      [STAT.TOUCHES]: 0, //palloni toccati durante la partita intera

      //Attack
      [STAT.ATTACK_WIN]: 0, //attacchi vinti
      [STAT.ATTACK_OUT]: 0, //attacchi sbagliati (solo fuori)
      [STAT.ATTACK_NOT_SUCCESSFUL]: 0,
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
      [STAT.BLOCK_SUCCESSFUL]: 0,
      [STAT.BLOCK_NOT_SUCCESSFUL]: 0,
      [STAT.TOTAL_BLOCK]: 0,

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

      //Set Point
      [STAT.TOTAL_SET_POINTS]: 0,
      [STAT.SET_POINTS_WIN]: 0,
      [STAT.SET_POINTS_ERR]: 0,
      [STAT.SET_POINTS_CANCELLED]: 0,

      //Match Point
      [STAT.TOTAL_MATCH_POINTS]: 0,
      [STAT.MATCH_POINTS_WIN]: 0,
      [STAT.MATCH_POINTS_ERR]: 0,
      [STAT.MATCH_POINTS_CANCELLED]: 0,
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

  toJSON() {
    return {
      number: this.number,

      scoreA: this.scoreA,
      scoreB: this.scoreB,

      startingLineUp: this.startingLineup,

      stats: {
        players: this.stats.players, // playerId -> stats snapshot del set
        squads: {
          A: this.stats.squads.A,
          B: this.stats.squads.B,
        },
      },
      events: this.events, // eventi SOLO di questo set
      winner: this.winner,
    };
  }
}
