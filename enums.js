export const STAT = Object.freeze({
  TOUCHES: "touches",
  //ATTACCO
  ATTACK_WIN: "attackWin",
  ATTACK_ERR: "attackErr",
  TOTAL_ATTACK: "totalAttack",
  //BATTUTA
  ACE: "ace",
  SERVES: "serves", //battute non sbagliate e non ace
  SERVES_ERR: "servesErr",
  SERVES_ERR_LINE: "serverErrLine",
  TOTAL_SERVES: "total_serves",

  TOTAL_RECEIVE: "totalRicezione",

  //FALLI
  FOUL_DOUBLE: "foul_double", //doppe
  FOUL_FOUR_TOUCHES: "foul_four_touches", //4 tocchi
  FOUL_RAISED: "foul_raised", //sollevata

  //Foul WOB
  FOUL_POSITION: "foul_position", //fallo di posizione
  FOUL_INVASION: "foul_invasion", //fallo di invasione

  TOTAL_FOUL: "total_foul",

  //DIFESA
  BALL_LOST: "ball_lost",
  DEF_POS: "defensePos",
  DEF_NEG: "defenseNeg",

  //MURO
  BLOCK_WIN: "blockWin",

  //CARTELLINI
  CARD_YELLOW: "card_yellow",
  CARD_RED: "card_red",
  TOTAL_CARD: "totalCard",
});

export const CARD_TYPE = Object.freeze({
  CARD_YELLOW: "card-yellow",
  CARD_RED: "card-red",
});

export const STAT_CATEGORY = Object.freeze({
  GENERAL: "general",
  ATTACK: "attack",
  SERVE: "serve",
  RECEIVE: "receive",
  BLOCK: "block",
  CARD: "card",
});

export const EVENT_STAT_MAP = Object.freeze({
  ATTACK_WIN: {
    player: [STAT.ATTACK_WIN, STAT.TOTAL_ATTACK],
    squad: [STAT.ATTACK_WIN, STAT.TOTAL_ATTACK],
  },
  ACE: {
    player: [STAT.ACE, STAT.SERVES],
    squad: [STAT.ACE, STAT.SERVES],
  },
  CARD_YELLOW: {
    player: [STAT.CARD_YELLOW, STAT.TOTAL_CARD],
    squad: [STAT.TOTAL_CARD],
  },
});
