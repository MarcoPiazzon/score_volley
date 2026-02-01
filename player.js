import { EVENT_STAT_MAP, STAT } from "./enums.js";

export class Player {
  constructor(id, team, role, dom, onCourt) {
    this.id = id; // numero giocatore
    this.team = team; // 'A' o 'B'
    this.role = role; // Palleggiatore, Centrale, ecc.
    this.dom = dom; //Riferimento al div nel campo
    this.position = null;
    this.name = "ciao";
    this.surname = "test";
    this.onCourt = onCourt; //se il giocatore è in campo
    this.stats = {
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

  toJSON() {
    return {
      id: this.id,
      team: this.team,
      role: this.role,
      stats: { ...this.stats },
    };
  }

  /* Stats */

  addRicezioneStats(type) {
    if (type === "pos") this.stats.defensePos++;
    else this.stats.defenseNeg++;

    this.stats.totalRicezione++;
  }

  addStat(type) {
    if (this.stats[type] !== undefined) {
      this.stats[type]++;
    }
  }
}
