-- ================================================================
--  volleyball_init.sql  —  Schema PostgreSQL
--  Conversione completa da MySQL 8 a PostgreSQL 14+
--
--  Come eseguire:
--    1. Crea il database (una sola volta, da psql connesso a postgres):
--          CREATE DATABASE volleyball;
--    2. Importa questo file:
--          psql -U postgres -d volleyball -f volleyball_init.sql
--
--  Ordine tabelle (rispetta le FK):
--    seasons → teams → players → venues
--    → championship_teams → matchdays
--    → matches → match_lineups → match_sets
--    → match_set_events → match_set_event_touches
--    → match_set_substitutions
--    → stats_player_set → stats_player_match
--    → stats_team_set   → stats_team_match
--    → users → coaches → collaborators
--    → tournaments → tournament_teams
--    → coach_assignments → coach_trophies
--    → coach_stats → coach_competition_stats
-- ================================================================

-- Disabilita i check FK durante l'import
SET session_replication_role = 'replica';


-- ================================================================
--  ENUM TYPES
--  PostgreSQL richiede la definizione dei tipi ENUM separata.
--  Usiamo IF NOT EXISTS per sicurezza in caso di re-import parziale.
-- ================================================================

DO $$ BEGIN
    CREATE TYPE player_role_enum AS ENUM (
        'setter', 'outside_hitter', 'opposite',
        'middle_blocker', 'libero', 'defensive_specialist'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE matchday_status_enum AS ENUM (
        'scheduled', 'in_progress', 'completed'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE match_status_enum AS ENUM (
        'scheduled', 'in_progress', 'completed', 'postponed', 'cancelled'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE event_type_enum AS ENUM (
        'point', 'timeout', 'substitution', 'card'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE point_mode_enum AS ENUM (
        'kill', 'ace', 'block', 'opponent_error', 'other'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE card_type_enum AS ENUM ('yellow', 'red');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE touch_type_enum AS ENUM (
        'serve', 'reception', 'set', 'attack',
        'block', 'dig', 'free_ball', 'other'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE user_role_enum AS ENUM ('coach', 'collaborator');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE tournament_type_enum AS ENUM (
        'cup', 'supercup', 'european', 'playoff', 'friendly'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ================================================================
--  FUNZIONE TRIGGER per updated_at automatico
--  Equivalente del trigger automatico su updated_at di MySQL.
-- ================================================================

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ================================================================
--  1 · ANAGRAFICA CORE
-- ================================================================

CREATE TABLE IF NOT EXISTS seasons (
    id          INTEGER         NOT NULL GENERATED ALWAYS AS IDENTITY,
    name        VARCHAR(50)     NOT NULL,
    year_start  SMALLINT        NOT NULL,
    year_end    SMALLINT        NOT NULL,
    is_active   SMALLINT        NOT NULL DEFAULT 0,
    created_at  TIMESTAMP       NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_seasons       PRIMARY KEY (id),
    CONSTRAINT chk_season_years CHECK (year_end >= year_start),
    CONSTRAINT chk_season_active CHECK (is_active IN (0,1))
);
COMMENT ON COLUMN seasons.name       IS 'es. Serie A 2024/25';
COMMENT ON COLUMN seasons.is_active  IS '1 = stagione corrente';


CREATE TABLE IF NOT EXISTS teams (
    id          INTEGER         NOT NULL GENERATED ALWAYS AS IDENTITY,
    name        VARCHAR(100)    NOT NULL,
    short_name  VARCHAR(10),
    city        VARCHAR(100),
    logo_url    VARCHAR(255),
    created_at  TIMESTAMP       NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_teams     PRIMARY KEY (id),
    CONSTRAINT uq_team_name UNIQUE (name)
);
COMMENT ON COLUMN teams.short_name IS 'sigla es. MIL, ROM';


CREATE TABLE IF NOT EXISTS players (
    id              INTEGER             NOT NULL GENERATED ALWAYS AS IDENTITY,
    team_id         INTEGER             NOT NULL,
    name            VARCHAR(80)         NOT NULL,
    surname         VARCHAR(80)         NOT NULL,
    shirt_number    SMALLINT            NOT NULL,
    role            player_role_enum    NOT NULL,
    birth_date      DATE,
    nationality     VARCHAR(60),
    photo_url       VARCHAR(255),
    is_active       SMALLINT            NOT NULL DEFAULT 1,
    created_at      TIMESTAMP           NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_players      PRIMARY KEY (id),
    CONSTRAINT fk_pl_team      FOREIGN KEY (team_id) REFERENCES teams(id)
                                   ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT uq_player_shirt UNIQUE (team_id, shirt_number),
    CONSTRAINT chk_pl_active   CHECK (is_active IN (0,1)),
    CONSTRAINT chk_pl_shirt    CHECK (shirt_number > 0)
);
COMMENT ON COLUMN players.team_id      IS 'squadra attuale';
COMMENT ON COLUMN players.shirt_number IS 'numero maglia attuale';


CREATE TABLE IF NOT EXISTS venues (
    id          INTEGER         NOT NULL GENERATED ALWAYS AS IDENTITY,
    name        VARCHAR(150)    NOT NULL,
    city        VARCHAR(100),
    address     VARCHAR(255),
    capacity    INTEGER,

    CONSTRAINT pk_venues    PRIMARY KEY (id),
    CONSTRAINT chk_capacity CHECK (capacity IS NULL OR capacity > 0)
);


-- ================================================================
--  2 · CAMPIONATO
-- ================================================================

CREATE TABLE IF NOT EXISTS championship_teams (
    id          INTEGER NOT NULL GENERATED ALWAYS AS IDENTITY,
    season_id   INTEGER NOT NULL,
    team_id     INTEGER NOT NULL,

    CONSTRAINT pk_ct        PRIMARY KEY (id),
    CONSTRAINT fk_ct_season FOREIGN KEY (season_id) REFERENCES seasons(id)
                                ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_ct_team   FOREIGN KEY (team_id)   REFERENCES teams(id)
                                ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT uq_ct        UNIQUE (season_id, team_id)
);


CREATE TABLE IF NOT EXISTS matchdays (
    id              INTEGER                 NOT NULL GENERATED ALWAYS AS IDENTITY,
    season_id       INTEGER,
    tournament_id   INTEGER,
    round_number    SMALLINT                NOT NULL,
    date_from       DATE,
    date_to         DATE,
    status          matchday_status_enum    NOT NULL DEFAULT 'scheduled',

    CONSTRAINT pk_matchdays           PRIMARY KEY (id),
    CONSTRAINT chk_md_one_competition CHECK (
        (season_id IS NOT NULL AND tournament_id IS NULL)
        OR
        (season_id IS NULL AND tournament_id IS NOT NULL)
    ),
    CONSTRAINT chk_md_round CHECK (round_number > 0)
);
COMMENT ON COLUMN matchdays.season_id     IS 'NULL se giornata di torneo';
COMMENT ON COLUMN matchdays.tournament_id IS 'NULL se giornata di campionato';
COMMENT ON COLUMN matchdays.round_number  IS 'es. 1, 2, 3 ...';


-- ================================================================
--  3 · PARTITE
-- ================================================================

CREATE TABLE IF NOT EXISTS matches (
    id              INTEGER             NOT NULL GENERATED ALWAYS AS IDENTITY,
    matchday_id     INTEGER             NOT NULL,
    home_team_id    INTEGER             NOT NULL,
    away_team_id    INTEGER             NOT NULL,
    venue_id        INTEGER,
    scheduled_at    TIMESTAMP,
    played_at       TIMESTAMP,
    status          match_status_enum   NOT NULL DEFAULT 'scheduled',
    home_sets_won   SMALLINT            NOT NULL DEFAULT 0,
    away_sets_won   SMALLINT            NOT NULL DEFAULT 0,
    home_points     SMALLINT            NOT NULL DEFAULT 0,
    away_points     SMALLINT            NOT NULL DEFAULT 0,
    raw_json        JSONB,
    notes           TEXT,
    created_at      TIMESTAMP           NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP           NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_matches     PRIMARY KEY (id),
    CONSTRAINT fk_m_matchday  FOREIGN KEY (matchday_id)  REFERENCES matchdays(id)
                                   ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_m_home      FOREIGN KEY (home_team_id) REFERENCES teams(id)
                                   ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_m_away      FOREIGN KEY (away_team_id) REFERENCES teams(id)
                                   ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_m_venue     FOREIGN KEY (venue_id)     REFERENCES venues(id)
                                   ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT chk_diff_teams CHECK (home_team_id <> away_team_id),
    CONSTRAINT chk_sets_range CHECK (
        home_sets_won BETWEEN 0 AND 3
        AND away_sets_won BETWEEN 0 AND 3
    )
);
COMMENT ON COLUMN matches.scheduled_at IS 'data/ora programmata';
COMMENT ON COLUMN matches.played_at    IS 'data/ora effettiva';
COMMENT ON COLUMN matches.raw_json     IS 'payload grezzo dal sistema di raccolta dati';

CREATE TRIGGER trg_matches_updated_at
    BEFORE UPDATE ON matches
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


CREATE TABLE IF NOT EXISTS match_lineups (
    id              INTEGER     NOT NULL GENERATED ALWAYS AS IDENTITY,
    match_id        INTEGER     NOT NULL,
    team_id         INTEGER     NOT NULL,
    player_id       INTEGER     NOT NULL,
    shirt_number    SMALLINT    NOT NULL,
    is_starter      SMALLINT    NOT NULL DEFAULT 0,
    is_libero       SMALLINT    NOT NULL DEFAULT 0,
    position_number SMALLINT,

    CONSTRAINT pk_lineups       PRIMARY KEY (id),
    CONSTRAINT fk_lu_match      FOREIGN KEY (match_id)  REFERENCES matches(id)
                                    ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_lu_team       FOREIGN KEY (team_id)   REFERENCES teams(id)
                                    ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_lu_player     FOREIGN KEY (player_id) REFERENCES players(id)
                                    ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT uq_lu_player     UNIQUE (match_id, team_id, player_id),
    CONSTRAINT chk_lu_starter   CHECK (is_starter IN (0,1)),
    CONSTRAINT chk_lu_libero    CHECK (is_libero IN (0,1)),
    CONSTRAINT chk_lu_pos       CHECK (position_number IS NULL OR position_number BETWEEN 1 AND 6)
);
COMMENT ON COLUMN match_lineups.position_number IS '1-6 posizione rotazione (solo titolari)';


CREATE TABLE IF NOT EXISTS match_sets (
    id              INTEGER     NOT NULL GENERATED ALWAYS AS IDENTITY,
    match_id        INTEGER     NOT NULL,
    set_number      SMALLINT    NOT NULL,
    home_score      SMALLINT    NOT NULL DEFAULT 0,
    away_score      SMALLINT    NOT NULL DEFAULT 0,
    winner_team_id  INTEGER,
    duration_min    INTEGER,
    started_at      TIMESTAMP,
    ended_at        TIMESTAMP,

    CONSTRAINT pk_sets     PRIMARY KEY (id),
    CONSTRAINT fk_ms_match FOREIGN KEY (match_id)      REFERENCES matches(id)
                               ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_ms_winner FOREIGN KEY (winner_team_id) REFERENCES teams(id)
                               ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT uq_ms       UNIQUE (match_id, set_number),
    CONSTRAINT chk_set_n   CHECK (set_number BETWEEN 1 AND 5)
);
COMMENT ON COLUMN match_sets.set_number IS '1-5';


-- ================================================================
--  4 · EVENTI PER SET
-- ================================================================

CREATE TABLE IF NOT EXISTS match_set_events (
    id                  INTEGER             NOT NULL GENERATED ALWAYS AS IDENTITY,
    match_set_id        INTEGER             NOT NULL,
    event_order         INTEGER             NOT NULL,
    event_type          event_type_enum     NOT NULL,
    team_side           SMALLINT,
    server_player_id    INTEGER,
    point_won_by_team   SMALLINT,
    point_mode          point_mode_enum,
    is_ace              SMALLINT            NOT NULL DEFAULT 0,
    card_player_id      INTEGER,
    card_type           card_type_enum,
    score_home          SMALLINT,
    score_away          SMALLINT,
    created_at          TIMESTAMP           NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_events    PRIMARY KEY (id),
    CONSTRAINT fk_ev_set    FOREIGN KEY (match_set_id)      REFERENCES match_sets(id)
                                ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_ev_server FOREIGN KEY (server_player_id)  REFERENCES players(id)
                                ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_ev_card   FOREIGN KEY (card_player_id)    REFERENCES players(id)
                                ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT uq_ev_order  UNIQUE (match_set_id, event_order),
    CONSTRAINT chk_ev_side  CHECK (team_side IN (1,2)),
    CONSTRAINT chk_ev_ace   CHECK (is_ace IN (0,1))
);
COMMENT ON COLUMN match_set_events.team_side         IS '1=home 2=away';
COMMENT ON COLUMN match_set_events.server_player_id  IS 'FK players: chi ha battuto';
COMMENT ON COLUMN match_set_events.card_player_id    IS 'FK players: chi ha ricevuto il cartellino';


CREATE TABLE IF NOT EXISTS match_set_event_touches (
    id          INTEGER             NOT NULL GENERATED ALWAYS AS IDENTITY,
    event_id    INTEGER             NOT NULL,
    touch_order SMALLINT            NOT NULL,
    player_id   INTEGER             NOT NULL,
    team_side   SMALLINT            NOT NULL,
    touch_type  touch_type_enum,

    CONSTRAINT pk_touches      PRIMARY KEY (id),
    CONSTRAINT fk_to_event     FOREIGN KEY (event_id)  REFERENCES match_set_events(id)
                                   ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_to_player    FOREIGN KEY (player_id) REFERENCES players(id)
                                   ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT uq_touch_order  UNIQUE (event_id, touch_order),
    CONSTRAINT chk_to_side     CHECK (team_side IN (1,2))
);


CREATE TABLE IF NOT EXISTS match_set_substitutions (
    id              INTEGER NOT NULL GENERATED ALWAYS AS IDENTITY,
    event_id        INTEGER NOT NULL,
    team_id         INTEGER NOT NULL,
    player_in_id    INTEGER NOT NULL,
    player_out_id   INTEGER NOT NULL,

    CONSTRAINT pk_subs      PRIMARY KEY (id),
    CONSTRAINT fk_sub_event FOREIGN KEY (event_id)      REFERENCES match_set_events(id)
                                ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_sub_team  FOREIGN KEY (team_id)       REFERENCES teams(id)
                                ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_sub_in    FOREIGN KEY (player_in_id)  REFERENCES players(id)
                                ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_sub_out   FOREIGN KEY (player_out_id) REFERENCES players(id)
                                ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_sub_diff CHECK (player_in_id <> player_out_id)
);


-- ================================================================
--  5 · STATISTICHE PRE-AGGREGATE
-- ================================================================

CREATE TABLE IF NOT EXISTS stats_player_set (
    id                  INTEGER NOT NULL GENERATED ALWAYS AS IDENTITY,
    match_set_id        INTEGER NOT NULL,
    player_id           INTEGER NOT NULL,
    team_id             INTEGER NOT NULL,

    touches        SMALLINT NOT NULL DEFAULT 0,
    attack_win                SMALLINT NOT NULL DEFAULT 0,
    attack_out        SMALLINT NOT NULL DEFAULT 0,
    attack_not_successful      SMALLINT NOT NULL DEFAULT 0,
    ace    SMALLINT NOT NULL DEFAULT 0,
    serves    SMALLINT NOT NULL DEFAULT 0,
    serves_err  SMALLINT NOT NULL DEFAULT 0,
    serves_err_line  SMALLINT NOT NULL DEFAULT 0,
    total_serves       SMALLINT NOT NULL DEFAULT 0,
    def_pos        SMALLINT NOT NULL DEFAULT 0,
    def_neg       SMALLINT NOT NULL DEFAULT 0,
    total_receive      SMALLINT NOT NULL DEFAULT 0,
    ball_lost       SMALLINT NOT NULL DEFAULT 0,
    block_successful         SMALLINT NOT NULL DEFAULT 0,
    block_not_successful        SMALLINT NOT NULL DEFAULT 0,
    foul_double          SMALLINT NOT NULL DEFAULT 0,
    foul_four_touches         SMALLINT NOT NULL DEFAULT 0,
    foul_raised          SMALLINT NOT NULL DEFAULT 0,
    foul_position         SMALLINT NOT NULL DEFAULT 0,
    foul_invasion        SMALLINT NOT NULL DEFAULT 0,
    total_foul       SMALLINT NOT NULL DEFAULT 0,
    card_yellow    SMALLINT NOT NULL DEFAULT 0,
    card_red    SMALLINT NOT NULL DEFAULT 0,
    total_set_points    SMALLINT NOT NULL DEFAULT 0,
    set_points_win    SMALLINT NOT NULL DEFAULT 0,
    set_points_err SMALLINT NOT NULL DEFAULT 0,
    set_points_cancelled    SMALLINT NOT NULL DEFAULT 0,
    total_match_points    SMALLINT NOT NULL DEFAULT 0,
    match_points_win    SMALLINT NOT NULL DEFAULT 0,
    match_points_err SMALLINT NOT NULL DEFAULT 0,
    match_points_cancelled    SMALLINT NOT NULL DEFAULT 0,
    total_timeout    SMALLINT NOT NULL DEFAULT 0,
    total_change    SMALLINT NOT NULL DEFAULT 0,
    points_played SMALLINT NOT NULL DEFAULT 0,
    total_points    SMALLINT NOT NULL DEFAULT 0,
    

    CONSTRAINT pk_sps      PRIMARY KEY (id),
    CONSTRAINT fk_sps_set  FOREIGN KEY (match_set_id) REFERENCES match_sets(id)
                               ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_sps_pl   FOREIGN KEY (player_id)   REFERENCES players(id)
                               ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_sps_team FOREIGN KEY (team_id)     REFERENCES teams(id)
                               ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT uq_sps      UNIQUE (match_set_id, player_id)
);


CREATE TABLE IF NOT EXISTS stats_player_match (
    id                  INTEGER NOT NULL GENERATED ALWAYS AS IDENTITY,
    match_id            INTEGER NOT NULL,
    player_id           INTEGER NOT NULL,
    team_id             INTEGER NOT NULL,

    touches        SMALLINT NOT NULL DEFAULT 0,
    attack_win                SMALLINT NOT NULL DEFAULT 0,
    attack_out        SMALLINT NOT NULL DEFAULT 0,
    attack_not_successful      SMALLINT NOT NULL DEFAULT 0,
    ace    SMALLINT NOT NULL DEFAULT 0,
    serves    SMALLINT NOT NULL DEFAULT 0,
    serves_err  SMALLINT NOT NULL DEFAULT 0,
    serves_err_line  SMALLINT NOT NULL DEFAULT 0,
    total_serves       SMALLINT NOT NULL DEFAULT 0,
    def_pos        SMALLINT NOT NULL DEFAULT 0,
    def_neg       SMALLINT NOT NULL DEFAULT 0,
    total_receive      SMALLINT NOT NULL DEFAULT 0,
    ball_lost       SMALLINT NOT NULL DEFAULT 0,
    block_successful         SMALLINT NOT NULL DEFAULT 0,
    block_not_successful        SMALLINT NOT NULL DEFAULT 0,
    foul_double          SMALLINT NOT NULL DEFAULT 0,
    foul_four_touches         SMALLINT NOT NULL DEFAULT 0,
    foul_raised          SMALLINT NOT NULL DEFAULT 0,
    foul_position         SMALLINT NOT NULL DEFAULT 0,
    foul_invasion        SMALLINT NOT NULL DEFAULT 0,
    total_foul       SMALLINT NOT NULL DEFAULT 0,
    card_yellow    SMALLINT NOT NULL DEFAULT 0,
    card_red    SMALLINT NOT NULL DEFAULT 0,
    total_set_points    SMALLINT NOT NULL DEFAULT 0,
    set_points_win    SMALLINT NOT NULL DEFAULT 0,
    set_points_err SMALLINT NOT NULL DEFAULT 0,
    set_points_cancelled    SMALLINT NOT NULL DEFAULT 0,
    total_match_points    SMALLINT NOT NULL DEFAULT 0,
    match_points_win    SMALLINT NOT NULL DEFAULT 0,
    match_points_err SMALLINT NOT NULL DEFAULT 0,
    match_points_cancelled    SMALLINT NOT NULL DEFAULT 0,
    total_timeout    SMALLINT NOT NULL DEFAULT 0,
    total_change    SMALLINT NOT NULL DEFAULT 0,
    points_played SMALLINT NOT NULL DEFAULT 0,
    total_points    SMALLINT NOT NULL DEFAULT 0,

    CONSTRAINT pk_spm       PRIMARY KEY (id),
    CONSTRAINT fk_spm_match FOREIGN KEY (match_id)  REFERENCES matches(id)
                                ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_spm_pl    FOREIGN KEY (player_id) REFERENCES players(id)
                                ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_spm_team  FOREIGN KEY (team_id)   REFERENCES teams(id)
                                ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT uq_spm       UNIQUE (match_id, player_id)
);


CREATE TABLE IF NOT EXISTS stats_team_set (
    id                  INTEGER NOT NULL GENERATED ALWAYS AS IDENTITY,
    match_set_id        INTEGER NOT NULL,
    team_id             INTEGER NOT NULL,
    is_home             SMALLINT NOT NULL DEFAULT 0,

    touches        SMALLINT NOT NULL DEFAULT 0,
    attack_win                SMALLINT NOT NULL DEFAULT 0,
    attack_out        SMALLINT NOT NULL DEFAULT 0,
    attack_not_successful      SMALLINT NOT NULL DEFAULT 0,
    ace    SMALLINT NOT NULL DEFAULT 0,
    serves    SMALLINT NOT NULL DEFAULT 0,
    serves_err  SMALLINT NOT NULL DEFAULT 0,
    serves_err_line  SMALLINT NOT NULL DEFAULT 0,
    total_serves       SMALLINT NOT NULL DEFAULT 0,
    def_pos        SMALLINT NOT NULL DEFAULT 0,
    def_neg       SMALLINT NOT NULL DEFAULT 0,
    total_receive      SMALLINT NOT NULL DEFAULT 0,
    ball_lost       SMALLINT NOT NULL DEFAULT 0,
    block_successful         SMALLINT NOT NULL DEFAULT 0,
    block_not_successful        SMALLINT NOT NULL DEFAULT 0,
    foul_double          SMALLINT NOT NULL DEFAULT 0,
    foul_four_touches         SMALLINT NOT NULL DEFAULT 0,
    foul_raised          SMALLINT NOT NULL DEFAULT 0,
    foul_position         SMALLINT NOT NULL DEFAULT 0,
    foul_invasion        SMALLINT NOT NULL DEFAULT 0,
    total_foul       SMALLINT NOT NULL DEFAULT 0,
    card_yellow    SMALLINT NOT NULL DEFAULT 0,
    card_red    SMALLINT NOT NULL DEFAULT 0,
    total_set_points    SMALLINT NOT NULL DEFAULT 0,
    set_points_win    SMALLINT NOT NULL DEFAULT 0,
    set_points_err SMALLINT NOT NULL DEFAULT 0,
    set_points_cancelled    SMALLINT NOT NULL DEFAULT 0,
    total_match_points    SMALLINT NOT NULL DEFAULT 0,
    match_points_win    SMALLINT NOT NULL DEFAULT 0,
    match_points_err SMALLINT NOT NULL DEFAULT 0,
    match_points_cancelled    SMALLINT NOT NULL DEFAULT 0,
    total_timeout    SMALLINT NOT NULL DEFAULT 0,
    total_change    SMALLINT NOT NULL DEFAULT 0,

    CONSTRAINT pk_sts      PRIMARY KEY (id),
    CONSTRAINT fk_sts_set  FOREIGN KEY (match_set_id) REFERENCES match_sets(id)
                               ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_sts_team FOREIGN KEY (team_id)      REFERENCES teams(id)
                               ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT uq_sts      UNIQUE (match_set_id, team_id),
    CONSTRAINT chk_sts_home CHECK (is_home IN (0,1))
);


CREATE TABLE IF NOT EXISTS stats_team_match (
    id                  INTEGER NOT NULL GENERATED ALWAYS AS IDENTITY,
    match_id            INTEGER NOT NULL,
    team_id             INTEGER NOT NULL,
    is_home             SMALLINT NOT NULL DEFAULT 0,

    touches        SMALLINT NOT NULL DEFAULT 0,
    attack_win                SMALLINT NOT NULL DEFAULT 0,
    attack_out        SMALLINT NOT NULL DEFAULT 0,
    attack_not_successful      SMALLINT NOT NULL DEFAULT 0,
    ace    SMALLINT NOT NULL DEFAULT 0,
    serves    SMALLINT NOT NULL DEFAULT 0,
    serves_err  SMALLINT NOT NULL DEFAULT 0,
    serves_err_line  SMALLINT NOT NULL DEFAULT 0,
    total_serves       SMALLINT NOT NULL DEFAULT 0,
    def_pos        SMALLINT NOT NULL DEFAULT 0,
    def_neg       SMALLINT NOT NULL DEFAULT 0,
    total_receive      SMALLINT NOT NULL DEFAULT 0,
    ball_lost       SMALLINT NOT NULL DEFAULT 0,
    block_successful         SMALLINT NOT NULL DEFAULT 0,
    block_not_successful        SMALLINT NOT NULL DEFAULT 0,
    foul_double          SMALLINT NOT NULL DEFAULT 0,
    foul_four_touches         SMALLINT NOT NULL DEFAULT 0,
    foul_raised          SMALLINT NOT NULL DEFAULT 0,
    foul_position         SMALLINT NOT NULL DEFAULT 0,
    foul_invasion        SMALLINT NOT NULL DEFAULT 0,
    total_foul       SMALLINT NOT NULL DEFAULT 0,
    card_yellow    SMALLINT NOT NULL DEFAULT 0,
    card_red    SMALLINT NOT NULL DEFAULT 0,
    total_set_points    SMALLINT NOT NULL DEFAULT 0,
    set_points_win    SMALLINT NOT NULL DEFAULT 0,
    set_points_err SMALLINT NOT NULL DEFAULT 0,
    set_points_cancelled    SMALLINT NOT NULL DEFAULT 0,
    total_match_points    SMALLINT NOT NULL DEFAULT 0,
    match_points_win    SMALLINT NOT NULL DEFAULT 0,
    match_points_err SMALLINT NOT NULL DEFAULT 0,
    match_points_cancelled    SMALLINT NOT NULL DEFAULT 0,
    total_timeout    SMALLINT NOT NULL DEFAULT 0,
    total_change    SMALLINT NOT NULL DEFAULT 0,

    CONSTRAINT pk_stm       PRIMARY KEY (id),
    CONSTRAINT fk_stm_match FOREIGN KEY (match_id) REFERENCES matches(id)
                                ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_stm_team  FOREIGN KEY (team_id)  REFERENCES teams(id)
                                ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT uq_stm       UNIQUE (match_id, team_id),
    CONSTRAINT chk_stm_home CHECK (is_home IN (0,1))
);


-- ================================================================
--  6 · UTENTI & AUTENTICAZIONE
-- ================================================================

CREATE TABLE IF NOT EXISTS users (
    id              INTEGER         NOT NULL GENERATED ALWAYS AS IDENTITY,
    username        VARCHAR(50)     NOT NULL,
    password_hash   VARCHAR(255)    NOT NULL,
    email           VARCHAR(150)    NOT NULL,
    role            user_role_enum  NOT NULL,
    is_active       SMALLINT        NOT NULL DEFAULT 1,
    last_login      TIMESTAMP,
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP       NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_users    PRIMARY KEY (id),
    CONSTRAINT uq_username UNIQUE (username),
    CONSTRAINT uq_email    UNIQUE (email),
    CONSTRAINT chk_u_active CHECK (is_active IN (0,1))
);
COMMENT ON COLUMN users.password_hash IS 'bcrypt hash — mai testo in chiaro';

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


CREATE TABLE IF NOT EXISTS coaches (
    id              INTEGER     NOT NULL GENERATED ALWAYS AS IDENTITY,
    user_id         INTEGER     NOT NULL,
    name            VARCHAR(80) NOT NULL,
    surname         VARCHAR(80) NOT NULL,
    phone           VARCHAR(30),
    photo_url       VARCHAR(255),
    birth_date      DATE,
    nationality     VARCHAR(60),
    created_at      TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP   NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_coaches  PRIMARY KEY (id),
    CONSTRAINT fk_co_user  FOREIGN KEY (user_id) REFERENCES users(id)
                               ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT uq_co_user  UNIQUE (user_id)
);
COMMENT ON COLUMN coaches.user_id IS 'FK 1:1 → users';

CREATE TRIGGER trg_coaches_updated_at
    BEFORE UPDATE ON coaches
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


CREATE TABLE IF NOT EXISTS collaborators (
    id              INTEGER      NOT NULL GENERATED ALWAYS AS IDENTITY,
    user_id         INTEGER      NOT NULL,
    team_id         INTEGER      NOT NULL,
    name            VARCHAR(80)  NOT NULL,
    surname         VARCHAR(80)  NOT NULL,
    role_label      VARCHAR(100),
    phone           VARCHAR(30),
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_collaborators PRIMARY KEY (id),
    CONSTRAINT fk_col_user      FOREIGN KEY (user_id)  REFERENCES users(id)
                                    ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_col_team      FOREIGN KEY (team_id)  REFERENCES teams(id)
                                    ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT uq_col_user      UNIQUE (user_id)
);
COMMENT ON COLUMN collaborators.role_label IS 'es. Assistente allenatore, Video analyst, Preparatore';

CREATE TRIGGER trg_collaborators_updated_at
    BEFORE UPDATE ON collaborators
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- ================================================================
--  7 · TORNEI
-- ================================================================

CREATE TABLE IF NOT EXISTS tournaments (
    id          INTEGER                 NOT NULL GENERATED ALWAYS AS IDENTITY,
    name        VARCHAR(100)            NOT NULL,
    edition     VARCHAR(20),
    type        tournament_type_enum    NOT NULL DEFAULT 'cup',
    year        SMALLINT                NOT NULL,
    is_active   SMALLINT                NOT NULL DEFAULT 0,
    created_at  TIMESTAMP               NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_tournaments PRIMARY KEY (id),
    CONSTRAINT chk_t_active   CHECK (is_active IN (0,1)),
    CONSTRAINT chk_t_year     CHECK (year > 1900)
);


CREATE TABLE IF NOT EXISTS tournament_teams (
    id              INTEGER NOT NULL GENERATED ALWAYS AS IDENTITY,
    tournament_id   INTEGER NOT NULL,
    team_id         INTEGER NOT NULL,

    CONSTRAINT pk_tt            PRIMARY KEY (id),
    CONSTRAINT fk_tt_tournament FOREIGN KEY (tournament_id) REFERENCES tournaments(id)
                                    ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_tt_team       FOREIGN KEY (team_id)       REFERENCES teams(id)
                                    ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT uq_tt            UNIQUE (tournament_id, team_id)
);


-- Aggiungo le FK su matchdays ora che seasons e tournaments esistono
ALTER TABLE matchdays
    ADD CONSTRAINT fk_md_season
        FOREIGN KEY (season_id) REFERENCES seasons(id)
        ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE matchdays
    ADD CONSTRAINT fk_md_tournament
        FOREIGN KEY (tournament_id) REFERENCES tournaments(id)
        ON DELETE CASCADE ON UPDATE CASCADE;

-- Nota: in PostgreSQL i NULL sono considerati distinti nelle UNIQUE,
-- quindi l'indice funziona correttamente per il vincolo one-or-the-other.
CREATE UNIQUE INDEX uq_md_round
    ON matchdays (season_id, tournament_id, round_number);


-- ================================================================
--  8 · ASSEGNAZIONI ALLENATORI
-- ================================================================

CREATE TABLE IF NOT EXISTS coach_assignments (
    id              INTEGER     NOT NULL GENERATED ALWAYS AS IDENTITY,
    coach_id        INTEGER     NOT NULL,
    team_id         INTEGER     NOT NULL,
    season_id       INTEGER,
    tournament_id   INTEGER,
    start_date      DATE,
    end_date        DATE,
    is_current      SMALLINT    NOT NULL DEFAULT 0,
    notes           TEXT,
    created_at      TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP   NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_ca            PRIMARY KEY (id),
    CONSTRAINT fk_ca_coach      FOREIGN KEY (coach_id)      REFERENCES coaches(id)
                                    ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_ca_team       FOREIGN KEY (team_id)       REFERENCES teams(id)
                                    ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_ca_season     FOREIGN KEY (season_id)     REFERENCES seasons(id)
                                    ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_ca_tournament FOREIGN KEY (tournament_id) REFERENCES tournaments(id)
                                    ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT uq_ca_active     UNIQUE (team_id, season_id, tournament_id),
    CONSTRAINT chk_ca_comp      CHECK (
        (season_id IS NOT NULL AND tournament_id IS NULL)
        OR (season_id IS NULL AND tournament_id IS NOT NULL)
    ),
    CONSTRAINT chk_ca_current   CHECK (is_current IN (0,1))
);
COMMENT ON COLUMN coach_assignments.season_id     IS 'FK → seasons (campionato)';
COMMENT ON COLUMN coach_assignments.tournament_id IS 'FK → tournaments (torneo)';
COMMENT ON COLUMN coach_assignments.is_current    IS '1 = incarico attivo in questa competizione';

CREATE TRIGGER trg_coach_assignments_updated_at
    BEFORE UPDATE ON coach_assignments
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


CREATE TABLE IF NOT EXISTS coach_trophies (
    id              INTEGER     NOT NULL GENERATED ALWAYS AS IDENTITY,
    coach_id        INTEGER     NOT NULL,
    team_id         INTEGER     NOT NULL,
    season_id       INTEGER,
    tournament_id   INTEGER,
    awarded_at      DATE        NOT NULL,
    notes           TEXT,
    created_at      TIMESTAMP   NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_ct_trophy PRIMARY KEY (id),
    CONSTRAINT fk_ct_coach  FOREIGN KEY (coach_id)      REFERENCES coaches(id)
                                ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_ct_team   FOREIGN KEY (team_id)       REFERENCES teams(id)
                                ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_ct_season FOREIGN KEY (season_id)     REFERENCES seasons(id)
                                ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_ct_tourn  FOREIGN KEY (tournament_id) REFERENCES tournaments(id)
                                ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT uq_ct_unique UNIQUE (coach_id, team_id, season_id, tournament_id),
    CONSTRAINT chk_ct_comp  CHECK (
        (season_id IS NOT NULL AND tournament_id IS NULL)
        OR (season_id IS NULL AND tournament_id IS NOT NULL)
    )
);
COMMENT ON COLUMN coach_trophies.team_id IS 'squadra con cui è stato vinto il titolo';


-- ================================================================
--  9 · STATISTICHE ALLENATORI
-- ================================================================

CREATE TABLE IF NOT EXISTS coach_stats (
    id              INTEGER NOT NULL GENERATED ALWAYS AS IDENTITY,
    coach_id        INTEGER NOT NULL,
    team_id         INTEGER NOT NULL,
    matches_coached INTEGER NOT NULL DEFAULT 0,
    matches_won     INTEGER NOT NULL DEFAULT 0,
    matches_lost    INTEGER NOT NULL DEFAULT 0,
    sets_won        INTEGER NOT NULL DEFAULT 0,
    sets_lost       INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_cs       PRIMARY KEY (id),
    CONSTRAINT fk_cs_coach FOREIGN KEY (coach_id) REFERENCES coaches(id)
                               ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_cs_team  FOREIGN KEY (team_id)  REFERENCES teams(id)
                               ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT uq_cs       UNIQUE (coach_id, team_id)
);

CREATE TRIGGER trg_coach_stats_updated_at
    BEFORE UPDATE ON coach_stats
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


CREATE TABLE IF NOT EXISTS coach_competition_stats (
    id              INTEGER NOT NULL GENERATED ALWAYS AS IDENTITY,
    coach_id        INTEGER NOT NULL,
    team_id         INTEGER NOT NULL,
    season_id       INTEGER,
    tournament_id   INTEGER,
    matches_coached INTEGER NOT NULL DEFAULT 0,
    matches_won     INTEGER NOT NULL DEFAULT 0,
    matches_lost    INTEGER NOT NULL DEFAULT 0,
    sets_won        INTEGER NOT NULL DEFAULT 0,
    sets_lost       INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_ccs        PRIMARY KEY (id),
    CONSTRAINT fk_ccs_coach  FOREIGN KEY (coach_id)      REFERENCES coaches(id)
                                 ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_ccs_team   FOREIGN KEY (team_id)       REFERENCES teams(id)
                                 ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_ccs_season FOREIGN KEY (season_id)     REFERENCES seasons(id)
                                 ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_ccs_tourn  FOREIGN KEY (tournament_id) REFERENCES tournaments(id)
                                 ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT uq_ccs        UNIQUE (coach_id, team_id, season_id, tournament_id),
    CONSTRAINT chk_ccs_comp  CHECK (
        (season_id IS NOT NULL AND tournament_id IS NULL)
        OR (season_id IS NULL AND tournament_id IS NOT NULL)
    )
);

CREATE TRIGGER trg_coach_competition_stats_updated_at
    BEFORE UPDATE ON coach_competition_stats
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- ================================================================
--  INDICI
-- ================================================================

CREATE INDEX idx_md_season      ON matchdays (season_id);
CREATE INDEX idx_md_tournament  ON matchdays (tournament_id);
CREATE INDEX idx_md_status      ON matchdays (status);

CREATE INDEX idx_m_matchday     ON matches (matchday_id);
CREATE INDEX idx_m_home         ON matches (home_team_id);
CREATE INDEX idx_m_away         ON matches (away_team_id);
CREATE INDEX idx_m_status       ON matches (status);
CREATE INDEX idx_m_played_at    ON matches (played_at);

CREATE INDEX idx_lu_match       ON match_lineups (match_id);
CREATE INDEX idx_lu_player      ON match_lineups (player_id);
CREATE INDEX idx_lu_team        ON match_lineups (team_id);

CREATE INDEX idx_ms_match       ON match_sets (match_id);

CREATE INDEX idx_ev_set         ON match_set_events (match_set_id);
CREATE INDEX idx_ev_type        ON match_set_events (event_type);
CREATE INDEX idx_ev_server      ON match_set_events (server_player_id);
CREATE INDEX idx_ev_point_team  ON match_set_events (point_won_by_team);

CREATE INDEX idx_to_event       ON match_set_event_touches (event_id);
CREATE INDEX idx_to_player      ON match_set_event_touches (player_id);

CREATE INDEX idx_sub_event      ON match_set_substitutions (event_id);

CREATE INDEX idx_sps_player     ON stats_player_set (player_id);
CREATE INDEX idx_sps_team       ON stats_player_set (team_id);
CREATE INDEX idx_spm_player     ON stats_player_match (player_id);
CREATE INDEX idx_spm_team       ON stats_player_match (team_id);
CREATE INDEX idx_spm_match      ON stats_player_match (match_id);

CREATE INDEX idx_sts_team       ON stats_team_set (team_id);
CREATE INDEX idx_stm_team       ON stats_team_match (team_id);
CREATE INDEX idx_stm_match      ON stats_team_match (match_id);

CREATE INDEX idx_pl_team        ON players (team_id);
CREATE INDEX idx_pl_surname     ON players (surname);

CREATE INDEX idx_u_role         ON users (role);
CREATE INDEX idx_u_active       ON users (is_active);
CREATE INDEX idx_co_surname     ON coaches (surname);
CREATE INDEX idx_col_team       ON collaborators (team_id);

CREATE INDEX idx_tourn_type     ON tournaments (type);
CREATE INDEX idx_tourn_year     ON tournaments (year);
CREATE INDEX idx_tt_tournament  ON tournament_teams (tournament_id);
CREATE INDEX idx_tt_team        ON tournament_teams (team_id);

CREATE INDEX idx_ca_coach       ON coach_assignments (coach_id);
CREATE INDEX idx_ca_team        ON coach_assignments (team_id);
CREATE INDEX idx_ca_current     ON coach_assignments (is_current);

CREATE INDEX idx_ctr_coach      ON coach_trophies (coach_id);
CREATE INDEX idx_ctr_team       ON coach_trophies (team_id);

CREATE INDEX idx_cs_coach       ON coach_stats (coach_id);
CREATE INDEX idx_ccs_coach      ON coach_competition_stats (coach_id);
CREATE INDEX idx_ccs_team       ON coach_competition_stats (team_id);


-- ================================================================
--  VIEW
-- ================================================================

CREATE OR REPLACE VIEW v_matchday_results AS
SELECT
    CASE WHEN md.season_id IS NOT NULL THEN 'campionato' ELSE 'torneo' END  AS competition_type,
    COALESCE(s.id,   trn.id)    AS competition_id,
    COALESCE(s.name, trn.name)  AS competition_name,
    md.round_number             AS giornata,
    md.date_from,
    m.id                        AS match_id,
    ht.name                     AS home_team,
    ht.short_name               AS home_short,
    at.name                     AS away_team,
    at.short_name               AS away_short,
    m.home_sets_won || '-' || m.away_sets_won  AS set_result,
    m.home_points,
    m.away_points,
    m.played_at,
    m.status,
    v.name                      AS venue
FROM matches m
JOIN matchdays  md  ON md.id = m.matchday_id
JOIN teams      ht  ON ht.id = m.home_team_id
JOIN teams      at  ON at.id = m.away_team_id
LEFT JOIN venues        v   ON v.id   = m.venue_id
LEFT JOIN seasons       s   ON s.id   = md.season_id
LEFT JOIN tournaments   trn ON trn.id = md.tournament_id;


CREATE OR REPLACE VIEW v_standings AS
SELECT
    md.season_id,
    t.id                    AS team_id,
    t.name                  AS team,
    t.short_name,
    COUNT(stm.id)           AS matches_played,
    SUM(CASE
          WHEN (stm.is_home = 1 AND m.home_sets_won > m.away_sets_won)
            OR (stm.is_home = 0 AND m.away_sets_won > m.home_sets_won)
          THEN 1 ELSE 0
        END)                AS wins,
    SUM(CASE
          WHEN (stm.is_home = 1 AND m.home_sets_won < m.away_sets_won)
            OR (stm.is_home = 0 AND m.away_sets_won < m.home_sets_won)
          THEN 1 ELSE 0
        END)                AS losses,
    SUM(CASE WHEN stm.is_home = 1 THEN m.home_points ELSE m.away_points END) AS points,
    SUM(stm.aces)           AS total_aces,
    SUM(stm.attack_kills)   AS total_kills,
    SUM(stm.block_kills)    AS total_blocks,
    ROUND(
        SUM(stm.attack_kills)::NUMERIC
        / NULLIF(SUM(stm.attacks_total), 0) * 100,
    1)                      AS attack_eff_pct
FROM stats_team_match stm
JOIN matches    m   ON m.id   = stm.match_id AND m.status = 'completed'
JOIN matchdays  md  ON md.id  = m.matchday_id
JOIN teams      t   ON t.id   = stm.team_id
GROUP BY md.season_id, t.id, t.name, t.short_name
ORDER BY points DESC, total_kills DESC;


CREATE OR REPLACE VIEW v_top_scorers AS
SELECT
    md.season_id,
    t.name              AS team,
    p.surname,
    p.name,
    p.shirt_number,
    p.role,
    COUNT(spm.match_id)     AS matches_played,
    SUM(spm.points_scored)  AS total_points,
    SUM(spm.aces)           AS total_aces,
    SUM(spm.attack_kills)   AS total_kills,
    SUM(spm.block_kills)    AS total_blocks,
    ROUND(
        SUM(spm.attack_kills)::NUMERIC
        / NULLIF(SUM(spm.attacks_total), 0) * 100,
    1)                      AS kill_pct
FROM stats_player_match spm
JOIN matches    m   ON m.id   = spm.match_id AND m.status = 'completed'
JOIN matchdays  md  ON md.id  = m.matchday_id
JOIN players    p   ON p.id   = spm.player_id
JOIN teams      t   ON t.id   = spm.team_id
GROUP BY md.season_id, t.name, p.id, p.surname, p.name, p.shirt_number, p.role
ORDER BY total_points DESC;


CREATE OR REPLACE VIEW v_current_coaches AS
SELECT
    t.id    AS team_id,
    t.name  AS team,
    CASE WHEN ca.season_id IS NOT NULL THEN 'campionato' ELSE 'torneo' END AS competition_type,
    COALESCE(s.name, trn.name)              AS competition,
    c.id    AS coach_id,
    c.surname || ' ' || c.name             AS coach,
    ca.start_date,
    ca.notes
FROM coach_assignments ca
JOIN coaches    c   ON c.id   = ca.coach_id
JOIN teams      t   ON t.id   = ca.team_id
LEFT JOIN seasons       s   ON s.id   = ca.season_id
LEFT JOIN tournaments   trn ON trn.id = ca.tournament_id
WHERE ca.is_current = 1
ORDER BY t.name;


-- ================================================================
--  UTENTE ADMIN DI DEFAULT
--  Password: Admin@1234  (bcrypt rounds=12)
--  !! Cambiala subito dopo il primo accesso !!
-- ================================================================

INSERT INTO users (id, username, password_hash, email, role, is_active)
OVERRIDING SYSTEM VALUE
VALUES (
    1,
    'admin',
    '$2b$12$K8GNxHb5tJDEHRxfB5DWAe7l6u3eQwPJr9LMfNhbGFvK2.oJvwBuW',
    'admin@volleyball.local',
    'coach',
    1
);

INSERT INTO coaches (id, user_id, name, surname)
OVERRIDING SYSTEM VALUE
VALUES (1, 1, 'Admin', 'Sistema');

-- Allinea le sequence dopo l'insert con id esplicito
SELECT setval(pg_get_serial_sequence('users',  'id'), (SELECT MAX(id) FROM users));
SELECT setval(pg_get_serial_sequence('coaches','id'), (SELECT MAX(id) FROM coaches));


-- Riabilita i check FK
SET session_replication_role = 'origin';


-- ================================================================
--  VERIFICA FINALE
-- ================================================================
SELECT
    tablename                           AS tabella,
    pg_size_pretty(
        pg_total_relation_size(quote_ident(tablename))
    )                                   AS dimensione
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
