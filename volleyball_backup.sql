--
-- PostgreSQL database dump
--

-- Dumped from database version 15.2
-- Dumped by pg_dump version 15.2

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: card_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.card_type_enum AS ENUM (
    'yellow',
    'red'
);


ALTER TYPE public.card_type_enum OWNER TO postgres;

--
-- Name: event_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.event_type_enum AS ENUM (
    'point',
    'timeout',
    'substitution',
    'card'
);


ALTER TYPE public.event_type_enum OWNER TO postgres;

--
-- Name: match_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.match_status_enum AS ENUM (
    'scheduled',
    'in_progress',
    'completed',
    'postponed',
    'cancelled'
);


ALTER TYPE public.match_status_enum OWNER TO postgres;

--
-- Name: matchday_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.matchday_status_enum AS ENUM (
    'scheduled',
    'in_progress',
    'completed'
);


ALTER TYPE public.matchday_status_enum OWNER TO postgres;

--
-- Name: player_role_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.player_role_enum AS ENUM (
    'setter',
    'outside_hitter',
    'opposite',
    'middle_blocker',
    'libero',
    'defensive_specialist'
);


ALTER TYPE public.player_role_enum OWNER TO postgres;

--
-- Name: point_mode_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.point_mode_enum AS ENUM (
    'kill',
    'ace',
    'block',
    'opponent_error',
    'other'
);


ALTER TYPE public.point_mode_enum OWNER TO postgres;

--
-- Name: touch_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.touch_type_enum AS ENUM (
    'serve',
    'reception',
    'set',
    'attack',
    'block',
    'dig',
    'free_ball',
    'other'
);


ALTER TYPE public.touch_type_enum OWNER TO postgres;

--
-- Name: tournament_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.tournament_type_enum AS ENUM (
    'cup',
    'supercup',
    'european',
    'playoff',
    'friendly'
);


ALTER TYPE public.tournament_type_enum OWNER TO postgres;

--
-- Name: user_role_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_role_enum AS ENUM (
    'coach',
    'collaborator'
);


ALTER TYPE public.user_role_enum OWNER TO postgres;

--
-- Name: fn_set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.fn_set_updated_at() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: championship_teams; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.championship_teams (
    id integer NOT NULL,
    season_id integer NOT NULL,
    team_id integer NOT NULL
);


ALTER TABLE public.championship_teams OWNER TO postgres;

--
-- Name: championship_teams_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.championship_teams ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.championship_teams_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: coach_assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.coach_assignments (
    id integer NOT NULL,
    coach_id integer NOT NULL,
    team_id integer NOT NULL,
    season_id integer,
    tournament_id integer,
    start_date date,
    end_date date,
    is_current smallint DEFAULT 0 NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_ca_comp CHECK ((((season_id IS NOT NULL) AND (tournament_id IS NULL)) OR ((season_id IS NULL) AND (tournament_id IS NOT NULL)))),
    CONSTRAINT chk_ca_current CHECK ((is_current = ANY (ARRAY[0, 1])))
);


ALTER TABLE public.coach_assignments OWNER TO postgres;

--
-- Name: COLUMN coach_assignments.season_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.coach_assignments.season_id IS 'FK â†’ seasons (campionato)';


--
-- Name: COLUMN coach_assignments.tournament_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.coach_assignments.tournament_id IS 'FK â†’ tournaments (torneo)';


--
-- Name: COLUMN coach_assignments.is_current; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.coach_assignments.is_current IS '1 = incarico attivo in questa competizione';


--
-- Name: coach_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.coach_assignments ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.coach_assignments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: coach_competition_stats; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.coach_competition_stats (
    id integer NOT NULL,
    coach_id integer NOT NULL,
    team_id integer NOT NULL,
    season_id integer,
    tournament_id integer,
    matches_coached integer DEFAULT 0 NOT NULL,
    matches_won integer DEFAULT 0 NOT NULL,
    matches_lost integer DEFAULT 0 NOT NULL,
    sets_won integer DEFAULT 0 NOT NULL,
    sets_lost integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_ccs_comp CHECK ((((season_id IS NOT NULL) AND (tournament_id IS NULL)) OR ((season_id IS NULL) AND (tournament_id IS NOT NULL))))
);


ALTER TABLE public.coach_competition_stats OWNER TO postgres;

--
-- Name: coach_competition_stats_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.coach_competition_stats ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.coach_competition_stats_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: coach_stats; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.coach_stats (
    id integer NOT NULL,
    coach_id integer NOT NULL,
    team_id integer NOT NULL,
    matches_coached integer DEFAULT 0 NOT NULL,
    matches_won integer DEFAULT 0 NOT NULL,
    matches_lost integer DEFAULT 0 NOT NULL,
    sets_won integer DEFAULT 0 NOT NULL,
    sets_lost integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.coach_stats OWNER TO postgres;

--
-- Name: coach_stats_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.coach_stats ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.coach_stats_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: coach_trophies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.coach_trophies (
    id integer NOT NULL,
    coach_id integer NOT NULL,
    team_id integer NOT NULL,
    season_id integer,
    tournament_id integer,
    awarded_at date NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_ct_comp CHECK ((((season_id IS NOT NULL) AND (tournament_id IS NULL)) OR ((season_id IS NULL) AND (tournament_id IS NOT NULL))))
);


ALTER TABLE public.coach_trophies OWNER TO postgres;

--
-- Name: COLUMN coach_trophies.team_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.coach_trophies.team_id IS 'squadra con cui Ã¨ stato vinto il titolo';


--
-- Name: coach_trophies_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.coach_trophies ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.coach_trophies_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: coaches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.coaches (
    id integer NOT NULL,
    user_id integer NOT NULL,
    name character varying(80) NOT NULL,
    surname character varying(80) NOT NULL,
    phone character varying(30),
    photo_url character varying(255),
    birth_date date,
    nationality character varying(60),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.coaches OWNER TO postgres;

--
-- Name: COLUMN coaches.user_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.coaches.user_id IS 'FK 1:1 â†’ users';


--
-- Name: coaches_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.coaches ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.coaches_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: collaborators; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.collaborators (
    id integer NOT NULL,
    user_id integer NOT NULL,
    team_id integer NOT NULL,
    name character varying(80) NOT NULL,
    surname character varying(80) NOT NULL,
    role_label character varying(100),
    phone character varying(30),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.collaborators OWNER TO postgres;

--
-- Name: COLUMN collaborators.role_label; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.collaborators.role_label IS 'es. Assistente allenatore, Video analyst, Preparatore';


--
-- Name: collaborators_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.collaborators ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.collaborators_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: match_lineups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.match_lineups (
    id integer NOT NULL,
    match_id integer NOT NULL,
    team_id integer NOT NULL,
    player_id integer NOT NULL,
    shirt_number smallint NOT NULL,
    is_starter smallint DEFAULT 0 NOT NULL,
    is_libero smallint DEFAULT 0 NOT NULL,
    position_number smallint,
    CONSTRAINT chk_lu_libero CHECK ((is_libero = ANY (ARRAY[0, 1]))),
    CONSTRAINT chk_lu_pos CHECK (((position_number IS NULL) OR ((position_number >= 1) AND (position_number <= 6)))),
    CONSTRAINT chk_lu_starter CHECK ((is_starter = ANY (ARRAY[0, 1])))
);


ALTER TABLE public.match_lineups OWNER TO postgres;

--
-- Name: COLUMN match_lineups.position_number; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.match_lineups.position_number IS '1-6 posizione rotazione (solo titolari)';


--
-- Name: match_lineups_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.match_lineups ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.match_lineups_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: match_set_event_touches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.match_set_event_touches (
    id integer NOT NULL,
    event_id integer NOT NULL,
    touch_order smallint NOT NULL,
    player_id integer NOT NULL,
    team_side smallint NOT NULL,
    touch_type public.touch_type_enum,
    CONSTRAINT chk_to_side CHECK ((team_side = ANY (ARRAY[1, 2])))
);


ALTER TABLE public.match_set_event_touches OWNER TO postgres;

--
-- Name: match_set_event_touches_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.match_set_event_touches ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.match_set_event_touches_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: match_set_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.match_set_events (
    id integer NOT NULL,
    match_set_id integer NOT NULL,
    event_order integer NOT NULL,
    event_type public.event_type_enum NOT NULL,
    team_side smallint,
    server_player_id integer,
    point_won_by_team smallint,
    point_mode public.point_mode_enum,
    is_ace smallint DEFAULT 0 NOT NULL,
    card_player_id integer,
    card_type public.card_type_enum,
    score_home smallint,
    score_away smallint,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_ev_ace CHECK ((is_ace = ANY (ARRAY[0, 1]))),
    CONSTRAINT chk_ev_side CHECK ((team_side = ANY (ARRAY[1, 2])))
);


ALTER TABLE public.match_set_events OWNER TO postgres;

--
-- Name: COLUMN match_set_events.team_side; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.match_set_events.team_side IS '1=home 2=away';


--
-- Name: COLUMN match_set_events.server_player_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.match_set_events.server_player_id IS 'FK players: chi ha battuto';


--
-- Name: COLUMN match_set_events.card_player_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.match_set_events.card_player_id IS 'FK players: chi ha ricevuto il cartellino';


--
-- Name: match_set_events_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.match_set_events ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.match_set_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: match_set_substitutions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.match_set_substitutions (
    id integer NOT NULL,
    event_id integer NOT NULL,
    team_id integer NOT NULL,
    player_in_id integer NOT NULL,
    player_out_id integer NOT NULL,
    CONSTRAINT chk_sub_diff CHECK ((player_in_id <> player_out_id))
);


ALTER TABLE public.match_set_substitutions OWNER TO postgres;

--
-- Name: match_set_substitutions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.match_set_substitutions ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.match_set_substitutions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: match_sets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.match_sets (
    id integer NOT NULL,
    match_id integer NOT NULL,
    set_number smallint NOT NULL,
    home_score smallint DEFAULT 0 NOT NULL,
    away_score smallint DEFAULT 0 NOT NULL,
    winner_team_id integer,
    duration_min integer,
    started_at timestamp without time zone,
    ended_at timestamp without time zone,
    CONSTRAINT chk_set_n CHECK (((set_number >= 1) AND (set_number <= 5)))
);


ALTER TABLE public.match_sets OWNER TO postgres;

--
-- Name: COLUMN match_sets.set_number; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.match_sets.set_number IS '1-5';


--
-- Name: match_sets_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.match_sets ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.match_sets_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: matchdays; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.matchdays (
    id integer NOT NULL,
    season_id integer,
    tournament_id integer,
    round_number smallint NOT NULL,
    date_from date,
    date_to date,
    status public.matchday_status_enum DEFAULT 'scheduled'::public.matchday_status_enum NOT NULL,
    CONSTRAINT chk_md_one_competition CHECK ((((season_id IS NOT NULL) AND (tournament_id IS NULL)) OR ((season_id IS NULL) AND (tournament_id IS NOT NULL)))),
    CONSTRAINT chk_md_round CHECK ((round_number > 0))
);


ALTER TABLE public.matchdays OWNER TO postgres;

--
-- Name: COLUMN matchdays.season_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.matchdays.season_id IS 'NULL se giornata di torneo';


--
-- Name: COLUMN matchdays.tournament_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.matchdays.tournament_id IS 'NULL se giornata di campionato';


--
-- Name: COLUMN matchdays.round_number; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.matchdays.round_number IS 'es. 1, 2, 3 ...';


--
-- Name: matchdays_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.matchdays ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.matchdays_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: matches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.matches (
    id integer NOT NULL,
    matchday_id integer NOT NULL,
    home_team_id integer NOT NULL,
    away_team_id integer NOT NULL,
    venue_id integer,
    scheduled_at timestamp without time zone,
    played_at timestamp without time zone,
    status public.match_status_enum DEFAULT 'scheduled'::public.match_status_enum NOT NULL,
    home_sets_won smallint DEFAULT 0 NOT NULL,
    away_sets_won smallint DEFAULT 0 NOT NULL,
    home_points smallint DEFAULT 0 NOT NULL,
    away_points smallint DEFAULT 0 NOT NULL,
    raw_json jsonb,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    max_set smallint DEFAULT 5 NOT NULL,
    sets_to_win smallint DEFAULT 3 NOT NULL,
    set_points smallint DEFAULT 25 NOT NULL,
    tiebreak_points smallint DEFAULT 15 NOT NULL,
    CONSTRAINT chk_diff_teams CHECK ((home_team_id <> away_team_id)),
    CONSTRAINT chk_sets_range CHECK ((((home_sets_won >= 0) AND (home_sets_won <= 3)) AND ((away_sets_won >= 0) AND (away_sets_won <= 3))))
);


ALTER TABLE public.matches OWNER TO postgres;

--
-- Name: COLUMN matches.scheduled_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.matches.scheduled_at IS 'data/ora programmata';


--
-- Name: COLUMN matches.played_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.matches.played_at IS 'data/ora effettiva';


--
-- Name: COLUMN matches.raw_json; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.matches.raw_json IS 'payload grezzo dal sistema di raccolta dati';


--
-- Name: matches_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.matches ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.matches_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: players; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.players (
    id integer NOT NULL,
    team_id integer NOT NULL,
    name character varying(80) NOT NULL,
    surname character varying(80) NOT NULL,
    shirt_number smallint NOT NULL,
    role public.player_role_enum NOT NULL,
    birth_date date,
    nationality character varying(60),
    photo_url character varying(255),
    is_active smallint DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_pl_active CHECK ((is_active = ANY (ARRAY[0, 1]))),
    CONSTRAINT chk_pl_shirt CHECK ((shirt_number > 0))
);


ALTER TABLE public.players OWNER TO postgres;

--
-- Name: COLUMN players.team_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.players.team_id IS 'squadra attuale';


--
-- Name: COLUMN players.shirt_number; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.players.shirt_number IS 'numero maglia attuale';


--
-- Name: players_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.players ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.players_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: seasons; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.seasons (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    year_start smallint NOT NULL,
    year_end smallint NOT NULL,
    is_active smallint DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_season_active CHECK ((is_active = ANY (ARRAY[0, 1]))),
    CONSTRAINT chk_season_years CHECK ((year_end >= year_start))
);


ALTER TABLE public.seasons OWNER TO postgres;

--
-- Name: COLUMN seasons.name; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.seasons.name IS 'es. Serie A 2024/25';


--
-- Name: COLUMN seasons.is_active; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.seasons.is_active IS '1 = stagione corrente';


--
-- Name: seasons_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.seasons ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.seasons_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: stats_player_match; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stats_player_match (
    id integer NOT NULL,
    match_id integer NOT NULL,
    player_id integer NOT NULL,
    team_id integer NOT NULL,
    touches smallint DEFAULT 0 NOT NULL,
    attack_win smallint DEFAULT 0 NOT NULL,
    attack_out smallint DEFAULT 0 NOT NULL,
    attack_not_successful smallint DEFAULT 0 NOT NULL,
    ace smallint DEFAULT 0 NOT NULL,
    serves smallint DEFAULT 0 NOT NULL,
    serves_err smallint DEFAULT 0 NOT NULL,
    serves_err_line smallint DEFAULT 0 NOT NULL,
    total_serves smallint DEFAULT 0 NOT NULL,
    def_pos smallint DEFAULT 0 NOT NULL,
    def_neg smallint DEFAULT 0 NOT NULL,
    total_receive smallint DEFAULT 0 NOT NULL,
    ball_lost smallint DEFAULT 0 NOT NULL,
    block_successful smallint DEFAULT 0 NOT NULL,
    block_not_successful smallint DEFAULT 0 NOT NULL,
    foul_double smallint DEFAULT 0 NOT NULL,
    foul_four_touches smallint DEFAULT 0 NOT NULL,
    foul_raised smallint DEFAULT 0 NOT NULL,
    foul_position smallint DEFAULT 0 NOT NULL,
    foul_invasion smallint DEFAULT 0 NOT NULL,
    total_foul smallint DEFAULT 0 NOT NULL,
    card_yellow smallint DEFAULT 0 NOT NULL,
    card_red smallint DEFAULT 0 NOT NULL,
    total_set_points smallint DEFAULT 0 NOT NULL,
    set_points_win smallint DEFAULT 0 NOT NULL,
    set_points_err smallint DEFAULT 0 NOT NULL,
    set_points_cancelled smallint DEFAULT 0 NOT NULL,
    total_match_points smallint DEFAULT 0 NOT NULL,
    match_points_win smallint DEFAULT 0 NOT NULL,
    match_points_err smallint DEFAULT 0 NOT NULL,
    match_points_cancelled smallint DEFAULT 0 NOT NULL,
    total_timeout smallint DEFAULT 0 NOT NULL,
    total_change smallint DEFAULT 0 NOT NULL,
    points_played smallint DEFAULT 0 NOT NULL,
    total_points smallint DEFAULT 0 NOT NULL
);


ALTER TABLE public.stats_player_match OWNER TO postgres;

--
-- Name: stats_player_match_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.stats_player_match ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.stats_player_match_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: stats_player_set; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stats_player_set (
    id integer NOT NULL,
    match_set_id integer NOT NULL,
    player_id integer NOT NULL,
    team_id integer NOT NULL,
    touches smallint DEFAULT 0 NOT NULL,
    attack_win smallint DEFAULT 0 NOT NULL,
    attack_out smallint DEFAULT 0 NOT NULL,
    attack_not_successful smallint DEFAULT 0 NOT NULL,
    ace smallint DEFAULT 0 NOT NULL,
    serves smallint DEFAULT 0 NOT NULL,
    serves_err smallint DEFAULT 0 NOT NULL,
    serves_err_line smallint DEFAULT 0 NOT NULL,
    total_serves smallint DEFAULT 0 NOT NULL,
    def_pos smallint DEFAULT 0 NOT NULL,
    def_neg smallint DEFAULT 0 NOT NULL,
    total_receive smallint DEFAULT 0 NOT NULL,
    ball_lost smallint DEFAULT 0 NOT NULL,
    block_successful smallint DEFAULT 0 NOT NULL,
    block_not_successful smallint DEFAULT 0 NOT NULL,
    foul_double smallint DEFAULT 0 NOT NULL,
    foul_four_touches smallint DEFAULT 0 NOT NULL,
    foul_raised smallint DEFAULT 0 NOT NULL,
    foul_position smallint DEFAULT 0 NOT NULL,
    foul_invasion smallint DEFAULT 0 NOT NULL,
    total_foul smallint DEFAULT 0 NOT NULL,
    card_yellow smallint DEFAULT 0 NOT NULL,
    card_red smallint DEFAULT 0 NOT NULL,
    total_set_points smallint DEFAULT 0 NOT NULL,
    set_points_win smallint DEFAULT 0 NOT NULL,
    set_points_err smallint DEFAULT 0 NOT NULL,
    set_points_cancelled smallint DEFAULT 0 NOT NULL,
    total_match_points smallint DEFAULT 0 NOT NULL,
    match_points_win smallint DEFAULT 0 NOT NULL,
    match_points_err smallint DEFAULT 0 NOT NULL,
    match_points_cancelled smallint DEFAULT 0 NOT NULL,
    total_timeout smallint DEFAULT 0 NOT NULL,
    total_change smallint DEFAULT 0 NOT NULL,
    points_played smallint DEFAULT 0 NOT NULL,
    total_points smallint DEFAULT 0 NOT NULL
);


ALTER TABLE public.stats_player_set OWNER TO postgres;

--
-- Name: stats_player_set_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.stats_player_set ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.stats_player_set_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: stats_team_match; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stats_team_match (
    id integer NOT NULL,
    match_id integer NOT NULL,
    team_id integer NOT NULL,
    is_home smallint DEFAULT 0 NOT NULL,
    touches smallint DEFAULT 0 NOT NULL,
    attack_win smallint DEFAULT 0 NOT NULL,
    attack_out smallint DEFAULT 0 NOT NULL,
    attack_not_successful smallint DEFAULT 0 NOT NULL,
    ace smallint DEFAULT 0 NOT NULL,
    serves smallint DEFAULT 0 NOT NULL,
    serves_err smallint DEFAULT 0 NOT NULL,
    serves_err_line smallint DEFAULT 0 NOT NULL,
    total_serves smallint DEFAULT 0 NOT NULL,
    def_pos smallint DEFAULT 0 NOT NULL,
    def_neg smallint DEFAULT 0 NOT NULL,
    total_receive smallint DEFAULT 0 NOT NULL,
    ball_lost smallint DEFAULT 0 NOT NULL,
    block_successful smallint DEFAULT 0 NOT NULL,
    block_not_successful smallint DEFAULT 0 NOT NULL,
    foul_double smallint DEFAULT 0 NOT NULL,
    foul_four_touches smallint DEFAULT 0 NOT NULL,
    foul_raised smallint DEFAULT 0 NOT NULL,
    foul_position smallint DEFAULT 0 NOT NULL,
    foul_invasion smallint DEFAULT 0 NOT NULL,
    total_foul smallint DEFAULT 0 NOT NULL,
    card_yellow smallint DEFAULT 0 NOT NULL,
    card_red smallint DEFAULT 0 NOT NULL,
    total_set_points smallint DEFAULT 0 NOT NULL,
    set_points_win smallint DEFAULT 0 NOT NULL,
    set_points_err smallint DEFAULT 0 NOT NULL,
    set_points_cancelled smallint DEFAULT 0 NOT NULL,
    total_match_points smallint DEFAULT 0 NOT NULL,
    match_points_win smallint DEFAULT 0 NOT NULL,
    match_points_err smallint DEFAULT 0 NOT NULL,
    match_points_cancelled smallint DEFAULT 0 NOT NULL,
    total_timeout smallint DEFAULT 0 NOT NULL,
    total_change smallint DEFAULT 0 NOT NULL,
    CONSTRAINT chk_stm_home CHECK ((is_home = ANY (ARRAY[0, 1])))
);


ALTER TABLE public.stats_team_match OWNER TO postgres;

--
-- Name: stats_team_match_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.stats_team_match ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.stats_team_match_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: stats_team_set; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stats_team_set (
    id integer NOT NULL,
    match_set_id integer NOT NULL,
    team_id integer NOT NULL,
    is_home smallint DEFAULT 0 NOT NULL,
    touches smallint DEFAULT 0 NOT NULL,
    attack_win smallint DEFAULT 0 NOT NULL,
    attack_out smallint DEFAULT 0 NOT NULL,
    attack_not_successful smallint DEFAULT 0 NOT NULL,
    ace smallint DEFAULT 0 NOT NULL,
    serves smallint DEFAULT 0 NOT NULL,
    serves_err smallint DEFAULT 0 NOT NULL,
    serves_err_line smallint DEFAULT 0 NOT NULL,
    total_serves smallint DEFAULT 0 NOT NULL,
    def_pos smallint DEFAULT 0 NOT NULL,
    def_neg smallint DEFAULT 0 NOT NULL,
    total_receive smallint DEFAULT 0 NOT NULL,
    ball_lost smallint DEFAULT 0 NOT NULL,
    block_successful smallint DEFAULT 0 NOT NULL,
    block_not_successful smallint DEFAULT 0 NOT NULL,
    foul_double smallint DEFAULT 0 NOT NULL,
    foul_four_touches smallint DEFAULT 0 NOT NULL,
    foul_raised smallint DEFAULT 0 NOT NULL,
    foul_position smallint DEFAULT 0 NOT NULL,
    foul_invasion smallint DEFAULT 0 NOT NULL,
    total_foul smallint DEFAULT 0 NOT NULL,
    card_yellow smallint DEFAULT 0 NOT NULL,
    card_red smallint DEFAULT 0 NOT NULL,
    total_set_points smallint DEFAULT 0 NOT NULL,
    set_points_win smallint DEFAULT 0 NOT NULL,
    set_points_err smallint DEFAULT 0 NOT NULL,
    set_points_cancelled smallint DEFAULT 0 NOT NULL,
    total_match_points smallint DEFAULT 0 NOT NULL,
    match_points_win smallint DEFAULT 0 NOT NULL,
    match_points_err smallint DEFAULT 0 NOT NULL,
    match_points_cancelled smallint DEFAULT 0 NOT NULL,
    total_timeout smallint DEFAULT 0 NOT NULL,
    total_change smallint DEFAULT 0 NOT NULL,
    CONSTRAINT chk_sts_home CHECK ((is_home = ANY (ARRAY[0, 1])))
);


ALTER TABLE public.stats_team_set OWNER TO postgres;

--
-- Name: stats_team_set_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.stats_team_set ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.stats_team_set_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: teams; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.teams (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    short_name character varying(10),
    city character varying(100),
    logo_url character varying(255),
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.teams OWNER TO postgres;

--
-- Name: COLUMN teams.short_name; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.teams.short_name IS 'sigla es. MIL, ROM';


--
-- Name: teams_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.teams ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.teams_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: tournament_teams; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tournament_teams (
    id integer NOT NULL,
    tournament_id integer NOT NULL,
    team_id integer NOT NULL
);


ALTER TABLE public.tournament_teams OWNER TO postgres;

--
-- Name: tournament_teams_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.tournament_teams ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.tournament_teams_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: tournaments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tournaments (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    edition character varying(20),
    type public.tournament_type_enum DEFAULT 'cup'::public.tournament_type_enum NOT NULL,
    year smallint NOT NULL,
    is_active smallint DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_t_active CHECK ((is_active = ANY (ARRAY[0, 1]))),
    CONSTRAINT chk_t_year CHECK ((year > 1900))
);


ALTER TABLE public.tournaments OWNER TO postgres;

--
-- Name: tournaments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.tournaments ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.tournaments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    password_hash character varying(255) NOT NULL,
    email character varying(150) NOT NULL,
    role public.user_role_enum NOT NULL,
    is_active smallint DEFAULT 1 NOT NULL,
    last_login timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_u_active CHECK ((is_active = ANY (ARRAY[0, 1])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: COLUMN users.password_hash; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.password_hash IS 'bcrypt hash â€” mai testo in chiaro';


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.users ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: v_current_coaches; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_current_coaches AS
 SELECT t.id AS team_id,
    t.name AS team,
        CASE
            WHEN (ca.season_id IS NOT NULL) THEN 'campionato'::text
            ELSE 'torneo'::text
        END AS competition_type,
    COALESCE(s.name, trn.name) AS competition,
    c.id AS coach_id,
    (((c.surname)::text || ' '::text) || (c.name)::text) AS coach,
    ca.start_date,
    ca.notes
   FROM ((((public.coach_assignments ca
     JOIN public.coaches c ON ((c.id = ca.coach_id)))
     JOIN public.teams t ON ((t.id = ca.team_id)))
     LEFT JOIN public.seasons s ON ((s.id = ca.season_id)))
     LEFT JOIN public.tournaments trn ON ((trn.id = ca.tournament_id)))
  WHERE (ca.is_current = 1)
  ORDER BY t.name;


ALTER TABLE public.v_current_coaches OWNER TO postgres;

--
-- Name: venues; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.venues (
    id integer NOT NULL,
    name character varying(150) NOT NULL,
    city character varying(100),
    address character varying(255),
    capacity integer,
    CONSTRAINT chk_capacity CHECK (((capacity IS NULL) OR (capacity > 0)))
);


ALTER TABLE public.venues OWNER TO postgres;

--
-- Name: v_matchday_results; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_matchday_results AS
 SELECT
        CASE
            WHEN (md.season_id IS NOT NULL) THEN 'campionato'::text
            ELSE 'torneo'::text
        END AS competition_type,
    COALESCE(s.id, trn.id) AS competition_id,
    COALESCE(s.name, trn.name) AS competition_name,
    md.round_number AS giornata,
    md.date_from,
    m.id AS match_id,
    ht.name AS home_team,
    ht.short_name AS home_short,
    at.name AS away_team,
    at.short_name AS away_short,
    ((m.home_sets_won || '-'::text) || m.away_sets_won) AS set_result,
    m.home_points,
    m.away_points,
    m.played_at,
    m.status,
    v.name AS venue
   FROM ((((((public.matches m
     JOIN public.matchdays md ON ((md.id = m.matchday_id)))
     JOIN public.teams ht ON ((ht.id = m.home_team_id)))
     JOIN public.teams at ON ((at.id = m.away_team_id)))
     LEFT JOIN public.venues v ON ((v.id = m.venue_id)))
     LEFT JOIN public.seasons s ON ((s.id = md.season_id)))
     LEFT JOIN public.tournaments trn ON ((trn.id = md.tournament_id)));


ALTER TABLE public.v_matchday_results OWNER TO postgres;

--
-- Name: venues_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.venues ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.venues_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Data for Name: championship_teams; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.championship_teams (id, season_id, team_id) FROM stdin;
1	1	1
2	1	2
3	1	3
4	1	4
5	2	1
6	2	2
7	2	3
8	2	4
\.


--
-- Data for Name: coach_assignments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.coach_assignments (id, coach_id, team_id, season_id, tournament_id, start_date, end_date, is_current, notes, created_at, updated_at) FROM stdin;
1	1	1	1	\N	2023-09-01	2024-05-31	0	Stagione 2023/24	2026-03-04 14:35:59.629447	2026-03-04 14:35:59.629447
2	2	2	1	\N	2023-09-01	2024-05-31	0	Stagione 2023/24	2026-03-04 14:35:59.629447	2026-03-04 14:35:59.629447
3	3	3	1	\N	2023-09-01	2024-05-31	1	Stagione 2023/24	2026-03-04 16:36:44.760493	2026-03-04 16:38:13.344182
9	2	2	\N	1	2025-01-01	2025-01-15	1	Coppa Italia 2024/25	2026-03-04 14:42:42.368721	2026-03-04 16:40:32.343192
\.


--
-- Data for Name: coach_competition_stats; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.coach_competition_stats (id, coach_id, team_id, season_id, tournament_id, matches_coached, matches_won, matches_lost, sets_won, sets_lost, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: coach_stats; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.coach_stats (id, coach_id, team_id, matches_coached, matches_won, matches_lost, sets_won, sets_lost, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: coach_trophies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.coach_trophies (id, coach_id, team_id, season_id, tournament_id, awarded_at, notes, created_at) FROM stdin;
\.


--
-- Data for Name: coaches; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.coaches (id, user_id, name, surname, phone, photo_url, birth_date, nationality, created_at, updated_at) FROM stdin;
1	1	Admin	Sistema	\N	\N	\N	\N	2026-03-03 11:57:18.503009	2026-03-03 11:57:18.503009
2	2	Marco	Piazzon	+393349905332	\N	\N	\N	2026-03-03 12:09:07.182494	2026-03-03 12:09:07.182494
3	3	Coach2	Piazzon	+393349905332	\N	\N	\N	2026-03-04 16:34:07.724454	2026-03-04 16:34:07.724454
\.


--
-- Data for Name: collaborators; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.collaborators (id, user_id, team_id, name, surname, role_label, phone, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: match_lineups; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.match_lineups (id, match_id, team_id, player_id, shirt_number, is_starter, is_libero, position_number) FROM stdin;
6	19	1	6	6	1	0	1
7	19	1	3	3	1	0	2
8	19	1	2	2	1	0	3
9	19	1	1	1	1	0	4
10	19	1	4	4	1	0	5
11	19	1	5	5	1	0	6
12	19	1	7	7	0	1	\N
13	19	1	8	8	0	0	\N
14	19	1	9	9	0	0	\N
15	19	1	10	10	0	0	\N
17	19	2	17	7	1	1	1
18	19	2	13	3	1	0	2
19	19	2	15	5	1	0	3
20	19	2	12	2	1	0	4
21	19	2	14	4	1	0	5
22	19	2	11	1	1	0	6
23	19	2	16	6	0	0	\N
24	19	2	18	8	0	0	\N
25	19	2	19	9	0	0	\N
26	19	2	20	10	0	0	\N
\.


--
-- Data for Name: match_set_event_touches; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.match_set_event_touches (id, event_id, touch_order, player_id, team_side, touch_type) FROM stdin;
\.


--
-- Data for Name: match_set_events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.match_set_events (id, match_set_id, event_order, event_type, team_side, server_player_id, point_won_by_team, point_mode, is_ace, card_player_id, card_type, score_home, score_away, created_at) FROM stdin;
\.


--
-- Data for Name: match_set_substitutions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.match_set_substitutions (id, event_id, team_id, player_in_id, player_out_id) FROM stdin;
\.


--
-- Data for Name: match_sets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.match_sets (id, match_id, set_number, home_score, away_score, winner_team_id, duration_min, started_at, ended_at) FROM stdin;
\.


--
-- Data for Name: matchdays; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.matchdays (id, season_id, tournament_id, round_number, date_from, date_to, status) FROM stdin;
1	1	\N	1	2023-10-07	2023-10-08	completed
2	1	\N	2	2023-10-21	2023-10-22	completed
3	1	\N	3	2023-11-04	2023-11-05	completed
4	1	\N	4	2023-11-18	2023-11-19	completed
5	1	\N	5	2023-12-02	2023-12-03	completed
6	1	\N	6	2023-12-16	2023-12-17	completed
7	2	\N	1	2024-10-05	2024-10-06	completed
8	2	\N	2	2024-10-19	2024-10-20	completed
9	2	\N	3	2024-11-02	2024-11-03	completed
10	2	\N	4	2024-11-16	2024-11-17	scheduled
11	2	\N	5	2024-11-30	2024-12-01	scheduled
12	\N	1	1	2025-01-08	2025-01-08	completed
13	\N	1	2	2025-01-15	2025-01-15	completed
\.


--
-- Data for Name: matches; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.matches (id, matchday_id, home_team_id, away_team_id, venue_id, scheduled_at, played_at, status, home_sets_won, away_sets_won, home_points, away_points, raw_json, notes, created_at, updated_at, max_set, sets_to_win, set_points, tiebreak_points) FROM stdin;
1	1	1	2	1	2023-10-07 18:00:00	2023-10-07 18:00:00	completed	3	1	3	0	\N	\N	2026-03-04 15:04:06.687655	2026-03-04 15:04:06.687655	5	3	25	15
2	1	3	4	3	2023-10-07 18:00:00	2023-10-07 18:00:00	completed	3	0	3	0	\N	\N	2026-03-04 15:04:06.687655	2026-03-04 15:04:06.687655	5	3	25	15
3	2	1	3	1	2023-10-21 18:00:00	2023-10-21 18:00:00	completed	3	2	2	1	\N	\N	2026-03-04 15:04:06.687655	2026-03-04 15:04:06.687655	5	3	25	15
4	2	4	2	4	2023-10-21 18:00:00	2023-10-21 18:00:00	completed	3	0	3	0	\N	\N	2026-03-04 15:04:06.687655	2026-03-04 15:04:06.687655	5	3	25	15
5	3	4	1	4	2023-11-04 18:00:00	2023-11-04 18:00:00	completed	3	1	3	0	\N	\N	2026-03-04 15:04:06.687655	2026-03-04 15:04:06.687655	5	3	25	15
6	3	2	3	2	2023-11-04 18:00:00	2023-11-04 18:00:00	completed	3	2	2	1	\N	\N	2026-03-04 15:04:06.687655	2026-03-04 15:04:06.687655	5	3	25	15
7	4	2	1	2	2023-11-18 18:00:00	2023-11-18 18:00:00	completed	3	0	3	0	\N	\N	2026-03-04 15:04:06.687655	2026-03-04 15:04:06.687655	5	3	25	15
8	4	3	4	3	2023-11-18 18:00:00	2023-11-18 18:00:00	completed	3	1	3	0	\N	\N	2026-03-04 15:04:06.687655	2026-03-04 15:04:06.687655	5	3	25	15
9	5	3	1	3	2023-12-02 18:00:00	2023-12-02 18:00:00	completed	3	0	3	0	\N	\N	2026-03-04 15:04:06.687655	2026-03-04 15:04:06.687655	5	3	25	15
10	5	2	4	2	2023-12-02 18:00:00	2023-12-02 18:00:00	completed	3	1	3	0	\N	\N	2026-03-04 15:04:06.687655	2026-03-04 15:04:06.687655	5	3	25	15
11	6	1	4	1	2023-12-16 18:00:00	2023-12-16 18:00:00	completed	3	2	2	1	\N	\N	2026-03-04 15:04:06.687655	2026-03-04 15:04:06.687655	5	3	25	15
12	6	2	3	2	2023-12-16 18:00:00	2023-12-16 18:00:00	completed	3	0	3	0	\N	\N	2026-03-04 15:04:06.687655	2026-03-04 15:04:06.687655	5	3	25	15
13	7	1	2	1	2024-10-05 18:00:00	2024-10-05 18:00:00	completed	3	0	3	0	\N	\N	2026-03-04 15:04:06.687655	2026-03-04 15:04:06.687655	5	3	25	15
14	7	3	4	3	2024-10-05 18:00:00	2024-10-05 18:00:00	completed	3	1	3	0	\N	\N	2026-03-04 15:04:06.687655	2026-03-04 15:04:06.687655	5	3	25	15
15	8	2	3	2	2024-10-19 18:00:00	2024-10-19 18:00:00	completed	3	1	3	0	\N	\N	2026-03-04 15:04:06.687655	2026-03-04 15:04:06.687655	5	3	25	15
16	8	4	1	4	2024-10-19 18:00:00	2024-10-19 18:00:00	completed	3	2	2	1	\N	\N	2026-03-04 15:04:06.687655	2026-03-04 15:04:06.687655	5	3	25	15
17	9	1	4	1	2024-11-02 18:00:00	2024-11-02 18:00:00	completed	3	1	3	0	\N	\N	2026-03-04 15:04:06.687655	2026-03-04 15:04:06.687655	5	3	25	15
18	9	2	3	2	2024-11-02 18:00:00	2024-11-02 18:00:00	completed	3	0	3	0	\N	\N	2026-03-04 15:04:06.687655	2026-03-04 15:04:06.687655	5	3	25	15
23	12	1	4	1	2025-01-08 18:00:00	2025-01-08 17:00:00	completed	3	1	3	0	\N	\N	2026-03-04 15:04:06.687655	2026-03-04 15:04:06.687655	5	3	25	15
24	12	2	3	2	2025-01-08 18:00:00	2025-01-08 17:00:00	completed	3	2	2	1	\N	\N	2026-03-04 15:04:06.687655	2026-03-04 15:04:06.687655	5	3	25	15
25	13	1	2	1	2025-01-15 18:00:00	2025-01-15 17:00:00	completed	3	2	2	1	\N	\N	2026-03-04 15:04:06.687655	2026-03-04 15:04:06.687655	5	3	25	15
26	13	3	4	3	2025-01-15 18:00:00	2025-01-15 17:00:00	completed	3	1	3	0	\N	\N	2026-03-04 15:04:06.687655	2026-03-04 15:04:06.687655	5	3	25	15
22	11	4	2	4	\N	\N	in_progress	0	0	0	0	\N	\N	2026-03-04 15:04:06.687655	2026-03-04 15:38:45.543259	5	3	25	15
21	11	3	1	3	\N	\N	in_progress	0	0	0	0	\N	\N	2026-03-04 15:04:06.687655	2026-03-04 15:38:48.1391	5	3	25	15
20	10	4	3	4	\N	\N	in_progress	0	0	0	0	\N	\N	2026-03-04 15:04:06.687655	2026-03-04 15:38:50.010541	5	3	25	15
19	10	2	1	2	\N	\N	in_progress	0	0	0	0	\N	\N	2026-03-04 15:04:06.687655	2026-03-04 16:42:37.803089	5	3	25	15
\.


--
-- Data for Name: players; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.players (id, team_id, name, surname, shirt_number, role, birth_date, nationality, photo_url, is_active, created_at) FROM stdin;
1	1	Luca	Romani	1	setter	1992-04-12	Italian	\N	1	2026-03-04 14:32:41.516969
2	1	Matteo	Ferrari	2	opposite	1995-06-21	Italian	\N	1	2026-03-04 14:32:41.516969
3	1	Marco	Bianchi	3	outside_hitter	1994-03-08	Italian	\N	1	2026-03-04 14:32:41.516969
4	1	Andrea	Russo	4	outside_hitter	1997-09-15	Italian	\N	1	2026-03-04 14:32:41.516969
5	1	Giorgio	Verdi	5	middle_blocker	1993-11-30	Italian	\N	1	2026-03-04 14:32:41.516969
6	1	Simone	Conti	6	middle_blocker	1996-02-17	Italian	\N	1	2026-03-04 14:32:41.516969
7	1	Davide	Ricci	7	libero	1991-07-04	Italian	\N	1	2026-03-04 14:32:41.516969
8	1	Fabio	Gallo	8	outside_hitter	1998-05-22	Italian	\N	1	2026-03-04 14:32:41.516969
9	1	Nicola	Moro	9	setter	1999-12-01	Italian	\N	1	2026-03-04 14:32:41.516969
10	1	Pietro	Riva	10	defensive_specialist	1996-08-14	Italian	\N	1	2026-03-04 14:32:41.516969
11	2	Aleksandar	Atanasijevic	1	opposite	1991-01-24	Serbian	\N	1	2026-03-04 14:32:41.516969
12	2	Leon	Wilfredo	2	outside_hitter	1993-07-30	Cuban	\N	1	2026-03-04 14:32:41.516969
13	2	Maxim	Mikhaylov	3	outside_hitter	1988-03-19	Russian	\N	1	2026-03-04 14:32:41.516969
14	2	Fabio	Ricci	4	setter	1990-09-05	Italian	\N	1	2026-03-04 14:32:41.516969
15	2	Dragan	Stankovic	5	middle_blocker	1992-06-12	Serbian	\N	1	2026-03-04 14:32:41.516969
16	2	Roberto	Russo	6	middle_blocker	1994-04-28	Italian	\N	1	2026-03-04 14:32:41.516969
17	2	Massimo	Colaci	7	libero	1987-11-15	Italian	\N	1	2026-03-04 14:32:41.516969
18	2	Luca	Vettori	8	outside_hitter	1996-01-03	Italian	\N	1	2026-03-04 14:32:41.516969
19	2	Giovanni	Saitta	9	setter	1998-07-17	Italian	\N	1	2026-03-04 14:32:41.516969
20	2	Yuri	Romano	10	defensive_specialist	1995-10-22	Italian	\N	1	2026-03-04 14:32:41.516969
21	3	Simone	Giannelli	1	setter	1996-08-09	Italian	\N	1	2026-03-04 14:32:41.516969
22	3	Nimir	Abdel-Aziz	2	opposite	1990-11-16	Dutch	\N	1	2026-03-04 14:32:41.516969
23	3	Aaron	Russell	3	outside_hitter	1993-06-04	American	\N	1	2026-03-04 14:32:41.516969
24	3	Oreste	Cavuto	4	outside_hitter	1998-01-25	Italian	\N	1	2026-03-04 14:32:41.516969
25	3	Srecko	Lisinac	5	middle_blocker	1991-12-08	Serbian	\N	1	2026-03-04 14:32:41.516969
26	3	Davide	Candellaro	6	middle_blocker	1988-03-22	Italian	\N	1	2026-03-04 14:32:41.516969
27	3	Jenia	Grebennikov	7	libero	1990-07-13	French	\N	1	2026-03-04 14:32:41.516969
28	3	Kamil	Rychlicki	8	outside_hitter	1994-09-29	Luxembourgish	\N	1	2026-03-04 14:32:41.516969
29	3	Riccardo	Sbertoli	9	setter	1997-05-14	Italian	\N	1	2026-03-04 14:32:41.516969
30	3	Daniele	Mazzone	10	defensive_specialist	1993-04-18	Italian	\N	1	2026-03-04 14:32:41.516969
31	4	Bruno	Rezende	1	setter	1989-07-07	Brazilian	\N	1	2026-03-04 14:32:41.516969
32	4	Ivan	Zaytsev	2	opposite	1988-10-02	Italian	\N	1	2026-03-04 14:32:41.516969
33	4	Osmany	Juantorena	3	outside_hitter	1984-04-03	Italian	\N	1	2026-03-04 14:32:41.516969
34	4	Tsvetan	Sokolov	4	outside_hitter	1989-09-13	Bulgarian	\N	1	2026-03-04 14:32:41.516969
35	4	Robertlandy	Simon	5	middle_blocker	1986-05-17	Cuban	\N	1	2026-03-04 14:32:41.516969
36	4	Enrico	Cester	6	middle_blocker	1990-11-30	Italian	\N	1	2026-03-04 14:32:41.516969
37	4	Fabio	Balaso	7	libero	1995-10-15	Italian	\N	1	2026-03-04 14:32:41.516969
38	4	Luciano	De Cecco	8	outside_hitter	1994-02-12	Italian	\N	1	2026-03-04 14:32:41.516969
39	4	Jander	Souza	9	setter	1992-03-26	Brazilian	\N	1	2026-03-04 14:32:41.516969
40	4	Mattia	Bottolo	10	defensive_specialist	1999-06-04	Italian	\N	1	2026-03-04 14:32:41.516969
\.


--
-- Data for Name: seasons; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.seasons (id, name, year_start, year_end, is_active, created_at) FROM stdin;
1	Serie A 2023/24	2023	2024	0	2026-03-04 14:32:56.112186
2	Serie A 2024/25	2024	2025	1	2026-03-04 14:32:56.112186
\.


--
-- Data for Name: stats_player_match; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stats_player_match (id, match_id, player_id, team_id, touches, attack_win, attack_out, attack_not_successful, ace, serves, serves_err, serves_err_line, total_serves, def_pos, def_neg, total_receive, ball_lost, block_successful, block_not_successful, foul_double, foul_four_touches, foul_raised, foul_position, foul_invasion, total_foul, card_yellow, card_red, total_set_points, set_points_win, set_points_err, set_points_cancelled, total_match_points, match_points_win, match_points_err, match_points_cancelled, total_timeout, total_change, points_played, total_points) FROM stdin;
\.


--
-- Data for Name: stats_player_set; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stats_player_set (id, match_set_id, player_id, team_id, touches, attack_win, attack_out, attack_not_successful, ace, serves, serves_err, serves_err_line, total_serves, def_pos, def_neg, total_receive, ball_lost, block_successful, block_not_successful, foul_double, foul_four_touches, foul_raised, foul_position, foul_invasion, total_foul, card_yellow, card_red, total_set_points, set_points_win, set_points_err, set_points_cancelled, total_match_points, match_points_win, match_points_err, match_points_cancelled, total_timeout, total_change, points_played, total_points) FROM stdin;
\.


--
-- Data for Name: stats_team_match; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stats_team_match (id, match_id, team_id, is_home, touches, attack_win, attack_out, attack_not_successful, ace, serves, serves_err, serves_err_line, total_serves, def_pos, def_neg, total_receive, ball_lost, block_successful, block_not_successful, foul_double, foul_four_touches, foul_raised, foul_position, foul_invasion, total_foul, card_yellow, card_red, total_set_points, set_points_win, set_points_err, set_points_cancelled, total_match_points, match_points_win, match_points_err, match_points_cancelled, total_timeout, total_change) FROM stdin;
\.


--
-- Data for Name: stats_team_set; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stats_team_set (id, match_set_id, team_id, is_home, touches, attack_win, attack_out, attack_not_successful, ace, serves, serves_err, serves_err_line, total_serves, def_pos, def_neg, total_receive, ball_lost, block_successful, block_not_successful, foul_double, foul_four_touches, foul_raised, foul_position, foul_invasion, total_foul, card_yellow, card_red, total_set_points, set_points_win, set_points_err, set_points_cancelled, total_match_points, match_points_win, match_points_err, match_points_cancelled, total_timeout, total_change) FROM stdin;
\.


--
-- Data for Name: teams; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.teams (id, name, short_name, city, logo_url, created_at) FROM stdin;
1	Powervolley Milano	MIL	Milano	\N	2026-03-04 14:32:31.999812
2	Sir Safety Perugia	PER	Perugia	\N	2026-03-04 14:32:31.999812
3	Itas Trentino	TRE	Trento	\N	2026-03-04 14:32:31.999812
4	Lube Civitanova	CIV	Civitanova Marche	\N	2026-03-04 14:32:31.999812
\.


--
-- Data for Name: tournament_teams; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tournament_teams (id, tournament_id, team_id) FROM stdin;
1	1	1
2	1	2
3	1	3
4	1	4
\.


--
-- Data for Name: tournaments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tournaments (id, name, edition, type, year, is_active, created_at) FROM stdin;
1	Coppa Italia	2024/25	cup	2025	0	2026-03-04 14:33:15.308192
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, password_hash, email, role, is_active, last_login, created_at, updated_at) FROM stdin;
1	admin	$2b$12$K8GNxHb5tJDEHRxfB5DWAe7l6u3eQwPJr9LMfNhbGFvK2.oJvwBuW	admin@volleyball.local	coach	1	\N	2026-03-03 11:57:18.49981	2026-03-03 11:57:18.49981
3	coach2	$2b$12$wQTdyY4.7.hK7qD9MCkseOT6LZRdgzflAS4PogPxdRkvJ1/gHJsvi	coach2@gmail.com	coach	1	\N	2026-03-04 16:34:07.724454	2026-03-04 16:34:07.724454
2	kyratus252	$2b$12$9BpGq0YS9OaDTPoNR7jocutihiQ8eQ1NmSByDEE0vW15B087YvgYe	piazzon83@gmail.com	coach	1	2026-03-09 11:53:32.451928	2026-03-03 12:09:07.182494	2026-03-09 11:53:32.451928
\.


--
-- Data for Name: venues; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.venues (id, name, city, address, capacity) FROM stdin;
1	PalaLido	Milano	Via dei Missaglia 117	4000
2	PalaBarton	Perugia	Via Corcianese 300	5000
3	BLM Group Arena	Trento	Via Fersina 26	4400
4	Eurosuole Forum	Civitanova Marche	Piazza Tifernate	5600
\.


--
-- Name: championship_teams_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.championship_teams_id_seq', 8, true);


--
-- Name: coach_assignments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.coach_assignments_id_seq', 1, false);


--
-- Name: coach_competition_stats_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.coach_competition_stats_id_seq', 1, false);


--
-- Name: coach_stats_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.coach_stats_id_seq', 1, false);


--
-- Name: coach_trophies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.coach_trophies_id_seq', 1, false);


--
-- Name: coaches_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.coaches_id_seq', 3, true);


--
-- Name: collaborators_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.collaborators_id_seq', 1, false);


--
-- Name: match_lineups_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.match_lineups_id_seq', 26, true);


--
-- Name: match_set_event_touches_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.match_set_event_touches_id_seq', 1, false);


--
-- Name: match_set_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.match_set_events_id_seq', 1, false);


--
-- Name: match_set_substitutions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.match_set_substitutions_id_seq', 1, false);


--
-- Name: match_sets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.match_sets_id_seq', 1, false);


--
-- Name: matchdays_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.matchdays_id_seq', 1, false);


--
-- Name: matches_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.matches_id_seq', 1, false);


--
-- Name: players_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.players_id_seq', 1, false);


--
-- Name: seasons_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.seasons_id_seq', 1, false);


--
-- Name: stats_player_match_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.stats_player_match_id_seq', 1, false);


--
-- Name: stats_player_set_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.stats_player_set_id_seq', 1, false);


--
-- Name: stats_team_match_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.stats_team_match_id_seq', 1, false);


--
-- Name: stats_team_set_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.stats_team_set_id_seq', 1, false);


--
-- Name: teams_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.teams_id_seq', 1, false);


--
-- Name: tournament_teams_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tournament_teams_id_seq', 6, true);


--
-- Name: tournaments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tournaments_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 3, true);


--
-- Name: venues_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.venues_id_seq', 1, false);


--
-- Name: coach_assignments pk_ca; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coach_assignments
    ADD CONSTRAINT pk_ca PRIMARY KEY (id);


--
-- Name: coach_competition_stats pk_ccs; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coach_competition_stats
    ADD CONSTRAINT pk_ccs PRIMARY KEY (id);


--
-- Name: coaches pk_coaches; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coaches
    ADD CONSTRAINT pk_coaches PRIMARY KEY (id);


--
-- Name: collaborators pk_collaborators; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.collaborators
    ADD CONSTRAINT pk_collaborators PRIMARY KEY (id);


--
-- Name: coach_stats pk_cs; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coach_stats
    ADD CONSTRAINT pk_cs PRIMARY KEY (id);


--
-- Name: championship_teams pk_ct; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.championship_teams
    ADD CONSTRAINT pk_ct PRIMARY KEY (id);


--
-- Name: coach_trophies pk_ct_trophy; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coach_trophies
    ADD CONSTRAINT pk_ct_trophy PRIMARY KEY (id);


--
-- Name: match_set_events pk_events; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.match_set_events
    ADD CONSTRAINT pk_events PRIMARY KEY (id);


--
-- Name: match_lineups pk_lineups; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.match_lineups
    ADD CONSTRAINT pk_lineups PRIMARY KEY (id);


--
-- Name: matchdays pk_matchdays; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matchdays
    ADD CONSTRAINT pk_matchdays PRIMARY KEY (id);


--
-- Name: matches pk_matches; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT pk_matches PRIMARY KEY (id);


--
-- Name: players pk_players; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT pk_players PRIMARY KEY (id);


--
-- Name: seasons pk_seasons; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seasons
    ADD CONSTRAINT pk_seasons PRIMARY KEY (id);


--
-- Name: match_sets pk_sets; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.match_sets
    ADD CONSTRAINT pk_sets PRIMARY KEY (id);


--
-- Name: stats_player_match pk_spm; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stats_player_match
    ADD CONSTRAINT pk_spm PRIMARY KEY (id);


--
-- Name: stats_player_set pk_sps; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stats_player_set
    ADD CONSTRAINT pk_sps PRIMARY KEY (id);


--
-- Name: stats_team_match pk_stm; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stats_team_match
    ADD CONSTRAINT pk_stm PRIMARY KEY (id);


--
-- Name: stats_team_set pk_sts; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stats_team_set
    ADD CONSTRAINT pk_sts PRIMARY KEY (id);


--
-- Name: match_set_substitutions pk_subs; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.match_set_substitutions
    ADD CONSTRAINT pk_subs PRIMARY KEY (id);


--
-- Name: teams pk_teams; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT pk_teams PRIMARY KEY (id);


--
-- Name: match_set_event_touches pk_touches; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.match_set_event_touches
    ADD CONSTRAINT pk_touches PRIMARY KEY (id);


--
-- Name: tournaments pk_tournaments; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tournaments
    ADD CONSTRAINT pk_tournaments PRIMARY KEY (id);


--
-- Name: tournament_teams pk_tt; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tournament_teams
    ADD CONSTRAINT pk_tt PRIMARY KEY (id);


--
-- Name: users pk_users; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT pk_users PRIMARY KEY (id);


--
-- Name: venues pk_venues; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.venues
    ADD CONSTRAINT pk_venues PRIMARY KEY (id);


--
-- Name: coach_assignments uq_ca_active; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coach_assignments
    ADD CONSTRAINT uq_ca_active UNIQUE (team_id, season_id, tournament_id);


--
-- Name: coach_competition_stats uq_ccs; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coach_competition_stats
    ADD CONSTRAINT uq_ccs UNIQUE (coach_id, team_id, season_id, tournament_id);


--
-- Name: coaches uq_co_user; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coaches
    ADD CONSTRAINT uq_co_user UNIQUE (user_id);


--
-- Name: collaborators uq_col_user; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.collaborators
    ADD CONSTRAINT uq_col_user UNIQUE (user_id);


--
-- Name: coach_stats uq_cs; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coach_stats
    ADD CONSTRAINT uq_cs UNIQUE (coach_id, team_id);


--
-- Name: championship_teams uq_ct; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.championship_teams
    ADD CONSTRAINT uq_ct UNIQUE (season_id, team_id);


--
-- Name: coach_trophies uq_ct_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coach_trophies
    ADD CONSTRAINT uq_ct_unique UNIQUE (coach_id, team_id, season_id, tournament_id);


--
-- Name: users uq_email; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT uq_email UNIQUE (email);


--
-- Name: match_set_events uq_ev_order; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.match_set_events
    ADD CONSTRAINT uq_ev_order UNIQUE (match_set_id, event_order);


--
-- Name: match_lineups uq_lu_player; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.match_lineups
    ADD CONSTRAINT uq_lu_player UNIQUE (match_id, team_id, player_id);


--
-- Name: match_sets uq_ms; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.match_sets
    ADD CONSTRAINT uq_ms UNIQUE (match_id, set_number);


--
-- Name: players uq_player_shirt; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT uq_player_shirt UNIQUE (team_id, shirt_number);


--
-- Name: stats_player_match uq_spm; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stats_player_match
    ADD CONSTRAINT uq_spm UNIQUE (match_id, player_id);


--
-- Name: stats_player_set uq_sps; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stats_player_set
    ADD CONSTRAINT uq_sps UNIQUE (match_set_id, player_id);


--
-- Name: stats_team_match uq_stm; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stats_team_match
    ADD CONSTRAINT uq_stm UNIQUE (match_id, team_id);


--
-- Name: stats_team_set uq_sts; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stats_team_set
    ADD CONSTRAINT uq_sts UNIQUE (match_set_id, team_id);


--
-- Name: teams uq_team_name; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT uq_team_name UNIQUE (name);


--
-- Name: match_set_event_touches uq_touch_order; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.match_set_event_touches
    ADD CONSTRAINT uq_touch_order UNIQUE (event_id, touch_order);


--
-- Name: tournament_teams uq_tt; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tournament_teams
    ADD CONSTRAINT uq_tt UNIQUE (tournament_id, team_id);


--
-- Name: users uq_username; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT uq_username UNIQUE (username);


--
-- Name: idx_ca_coach; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ca_coach ON public.coach_assignments USING btree (coach_id);


--
-- Name: idx_ca_current; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ca_current ON public.coach_assignments USING btree (is_current);


--
-- Name: idx_ca_team; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ca_team ON public.coach_assignments USING btree (team_id);


--
-- Name: idx_ccs_coach; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ccs_coach ON public.coach_competition_stats USING btree (coach_id);


--
-- Name: idx_ccs_team; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ccs_team ON public.coach_competition_stats USING btree (team_id);


--
-- Name: idx_co_surname; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_co_surname ON public.coaches USING btree (surname);


--
-- Name: idx_col_team; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_col_team ON public.collaborators USING btree (team_id);


--
-- Name: idx_cs_coach; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cs_coach ON public.coach_stats USING btree (coach_id);


--
-- Name: idx_ctr_coach; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ctr_coach ON public.coach_trophies USING btree (coach_id);


--
-- Name: idx_ctr_team; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ctr_team ON public.coach_trophies USING btree (team_id);


--
-- Name: idx_ev_point_team; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ev_point_team ON public.match_set_events USING btree (point_won_by_team);


--
-- Name: idx_ev_server; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ev_server ON public.match_set_events USING btree (server_player_id);


--
-- Name: idx_ev_set; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ev_set ON public.match_set_events USING btree (match_set_id);


--
-- Name: idx_ev_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ev_type ON public.match_set_events USING btree (event_type);


--
-- Name: idx_lu_match; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lu_match ON public.match_lineups USING btree (match_id);


--
-- Name: idx_lu_player; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lu_player ON public.match_lineups USING btree (player_id);


--
-- Name: idx_lu_team; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lu_team ON public.match_lineups USING btree (team_id);


--
-- Name: idx_m_away; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_m_away ON public.matches USING btree (away_team_id);


--
-- Name: idx_m_home; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_m_home ON public.matches USING btree (home_team_id);


--
-- Name: idx_m_matchday; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_m_matchday ON public.matches USING btree (matchday_id);


--
-- Name: idx_m_played_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_m_played_at ON public.matches USING btree (played_at);


--
-- Name: idx_m_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_m_status ON public.matches USING btree (status);


--
-- Name: idx_md_season; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_md_season ON public.matchdays USING btree (season_id);


--
-- Name: idx_md_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_md_status ON public.matchdays USING btree (status);


--
-- Name: idx_md_tournament; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_md_tournament ON public.matchdays USING btree (tournament_id);


--
-- Name: idx_ms_match; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ms_match ON public.match_sets USING btree (match_id);


--
-- Name: idx_pl_surname; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pl_surname ON public.players USING btree (surname);


--
-- Name: idx_pl_team; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pl_team ON public.players USING btree (team_id);


--
-- Name: idx_sub_event; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sub_event ON public.match_set_substitutions USING btree (event_id);


--
-- Name: idx_to_event; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_to_event ON public.match_set_event_touches USING btree (event_id);


--
-- Name: idx_to_player; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_to_player ON public.match_set_event_touches USING btree (player_id);


--
-- Name: idx_tourn_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tourn_type ON public.tournaments USING btree (type);


--
-- Name: idx_tourn_year; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tourn_year ON public.tournaments USING btree (year);


--
-- Name: idx_tt_team; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tt_team ON public.tournament_teams USING btree (team_id);


--
-- Name: idx_tt_tournament; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tt_tournament ON public.tournament_teams USING btree (tournament_id);


--
-- Name: idx_u_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_u_active ON public.users USING btree (is_active);


--
-- Name: idx_u_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_u_role ON public.users USING btree (role);


--
-- Name: uq_md_round; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_md_round ON public.matchdays USING btree (season_id, tournament_id, round_number);


--
-- Name: coach_assignments trg_coach_assignments_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_coach_assignments_updated_at BEFORE UPDATE ON public.coach_assignments FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: coach_competition_stats trg_coach_competition_stats_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_coach_competition_stats_updated_at BEFORE UPDATE ON public.coach_competition_stats FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: coach_stats trg_coach_stats_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_coach_stats_updated_at BEFORE UPDATE ON public.coach_stats FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: coaches trg_coaches_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_coaches_updated_at BEFORE UPDATE ON public.coaches FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: collaborators trg_collaborators_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_collaborators_updated_at BEFORE UPDATE ON public.collaborators FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: matches trg_matches_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_matches_updated_at BEFORE UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: users trg_users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: coach_assignments fk_ca_coach; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coach_assignments
    ADD CONSTRAINT fk_ca_coach FOREIGN KEY (coach_id) REFERENCES public.coaches(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: coach_assignments fk_ca_season; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coach_assignments
    ADD CONSTRAINT fk_ca_season FOREIGN KEY (season_id) REFERENCES public.seasons(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: coach_assignments fk_ca_team; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coach_assignments
    ADD CONSTRAINT fk_ca_team FOREIGN KEY (team_id) REFERENCES public.teams(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: coach_assignments fk_ca_tournament; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coach_assignments
    ADD CONSTRAINT fk_ca_tournament FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: coach_competition_stats fk_ccs_coach; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coach_competition_stats
    ADD CONSTRAINT fk_ccs_coach FOREIGN KEY (coach_id) REFERENCES public.coaches(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: coach_competition_stats fk_ccs_season; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coach_competition_stats
    ADD CONSTRAINT fk_ccs_season FOREIGN KEY (season_id) REFERENCES public.seasons(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: coach_competition_stats fk_ccs_team; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coach_competition_stats
    ADD CONSTRAINT fk_ccs_team FOREIGN KEY (team_id) REFERENCES public.teams(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: coach_competition_stats fk_ccs_tourn; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coach_competition_stats
    ADD CONSTRAINT fk_ccs_tourn FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: coaches fk_co_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coaches
    ADD CONSTRAINT fk_co_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: collaborators fk_col_team; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.collaborators
    ADD CONSTRAINT fk_col_team FOREIGN KEY (team_id) REFERENCES public.teams(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: collaborators fk_col_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.collaborators
    ADD CONSTRAINT fk_col_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: coach_stats fk_cs_coach; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coach_stats
    ADD CONSTRAINT fk_cs_coach FOREIGN KEY (coach_id) REFERENCES public.coaches(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: coach_stats fk_cs_team; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coach_stats
    ADD CONSTRAINT fk_cs_team FOREIGN KEY (team_id) REFERENCES public.teams(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: coach_trophies fk_ct_coach; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coach_trophies
    ADD CONSTRAINT fk_ct_coach FOREIGN KEY (coach_id) REFERENCES public.coaches(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: championship_teams fk_ct_season; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.championship_teams
    ADD CONSTRAINT fk_ct_season FOREIGN KEY (season_id) REFERENCES public.seasons(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: coach_trophies fk_ct_season; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coach_trophies
    ADD CONSTRAINT fk_ct_season FOREIGN KEY (season_id) REFERENCES public.seasons(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: championship_teams fk_ct_team; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.championship_teams
    ADD CONSTRAINT fk_ct_team FOREIGN KEY (team_id) REFERENCES public.teams(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: coach_trophies fk_ct_team; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coach_trophies
    ADD CONSTRAINT fk_ct_team FOREIGN KEY (team_id) REFERENCES public.teams(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: coach_trophies fk_ct_tourn; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coach_trophies
    ADD CONSTRAINT fk_ct_tourn FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: match_set_events fk_ev_card; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.match_set_events
    ADD CONSTRAINT fk_ev_card FOREIGN KEY (card_player_id) REFERENCES public.players(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: match_set_events fk_ev_server; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.match_set_events
    ADD CONSTRAINT fk_ev_server FOREIGN KEY (server_player_id) REFERENCES public.players(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: match_set_events fk_ev_set; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.match_set_events
    ADD CONSTRAINT fk_ev_set FOREIGN KEY (match_set_id) REFERENCES public.match_sets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: match_lineups fk_lu_match; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.match_lineups
    ADD CONSTRAINT fk_lu_match FOREIGN KEY (match_id) REFERENCES public.matches(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: match_lineups fk_lu_player; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.match_lineups
    ADD CONSTRAINT fk_lu_player FOREIGN KEY (player_id) REFERENCES public.players(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: match_lineups fk_lu_team; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.match_lineups
    ADD CONSTRAINT fk_lu_team FOREIGN KEY (team_id) REFERENCES public.teams(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: matches fk_m_away; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT fk_m_away FOREIGN KEY (away_team_id) REFERENCES public.teams(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: matches fk_m_home; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT fk_m_home FOREIGN KEY (home_team_id) REFERENCES public.teams(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: matches fk_m_matchday; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT fk_m_matchday FOREIGN KEY (matchday_id) REFERENCES public.matchdays(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: matches fk_m_venue; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT fk_m_venue FOREIGN KEY (venue_id) REFERENCES public.venues(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: matchdays fk_md_season; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matchdays
    ADD CONSTRAINT fk_md_season FOREIGN KEY (season_id) REFERENCES public.seasons(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: matchdays fk_md_tournament; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matchdays
    ADD CONSTRAINT fk_md_tournament FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: match_sets fk_ms_match; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.match_sets
    ADD CONSTRAINT fk_ms_match FOREIGN KEY (match_id) REFERENCES public.matches(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: match_sets fk_ms_winner; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.match_sets
    ADD CONSTRAINT fk_ms_winner FOREIGN KEY (winner_team_id) REFERENCES public.teams(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: players fk_pl_team; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT fk_pl_team FOREIGN KEY (team_id) REFERENCES public.teams(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: stats_player_match fk_spm_match; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stats_player_match
    ADD CONSTRAINT fk_spm_match FOREIGN KEY (match_id) REFERENCES public.matches(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: stats_player_match fk_spm_pl; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stats_player_match
    ADD CONSTRAINT fk_spm_pl FOREIGN KEY (player_id) REFERENCES public.players(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: stats_player_match fk_spm_team; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stats_player_match
    ADD CONSTRAINT fk_spm_team FOREIGN KEY (team_id) REFERENCES public.teams(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: stats_player_set fk_sps_pl; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stats_player_set
    ADD CONSTRAINT fk_sps_pl FOREIGN KEY (player_id) REFERENCES public.players(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: stats_player_set fk_sps_set; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stats_player_set
    ADD CONSTRAINT fk_sps_set FOREIGN KEY (match_set_id) REFERENCES public.match_sets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: stats_player_set fk_sps_team; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stats_player_set
    ADD CONSTRAINT fk_sps_team FOREIGN KEY (team_id) REFERENCES public.teams(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: stats_team_match fk_stm_match; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stats_team_match
    ADD CONSTRAINT fk_stm_match FOREIGN KEY (match_id) REFERENCES public.matches(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: stats_team_match fk_stm_team; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stats_team_match
    ADD CONSTRAINT fk_stm_team FOREIGN KEY (team_id) REFERENCES public.teams(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: stats_team_set fk_sts_set; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stats_team_set
    ADD CONSTRAINT fk_sts_set FOREIGN KEY (match_set_id) REFERENCES public.match_sets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: stats_team_set fk_sts_team; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stats_team_set
    ADD CONSTRAINT fk_sts_team FOREIGN KEY (team_id) REFERENCES public.teams(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: match_set_substitutions fk_sub_event; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.match_set_substitutions
    ADD CONSTRAINT fk_sub_event FOREIGN KEY (event_id) REFERENCES public.match_set_events(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: match_set_substitutions fk_sub_in; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.match_set_substitutions
    ADD CONSTRAINT fk_sub_in FOREIGN KEY (player_in_id) REFERENCES public.players(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: match_set_substitutions fk_sub_out; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.match_set_substitutions
    ADD CONSTRAINT fk_sub_out FOREIGN KEY (player_out_id) REFERENCES public.players(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: match_set_substitutions fk_sub_team; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.match_set_substitutions
    ADD CONSTRAINT fk_sub_team FOREIGN KEY (team_id) REFERENCES public.teams(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: match_set_event_touches fk_to_event; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.match_set_event_touches
    ADD CONSTRAINT fk_to_event FOREIGN KEY (event_id) REFERENCES public.match_set_events(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: match_set_event_touches fk_to_player; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.match_set_event_touches
    ADD CONSTRAINT fk_to_player FOREIGN KEY (player_id) REFERENCES public.players(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: tournament_teams fk_tt_team; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tournament_teams
    ADD CONSTRAINT fk_tt_team FOREIGN KEY (team_id) REFERENCES public.teams(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tournament_teams fk_tt_tournament; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tournament_teams
    ADD CONSTRAINT fk_tt_tournament FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT ALL ON SCHEMA public TO volley_app;


--
-- Name: FUNCTION fn_set_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.fn_set_updated_at() TO volley_app;


--
-- Name: TABLE championship_teams; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.championship_teams TO volley_app;


--
-- Name: SEQUENCE championship_teams_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.championship_teams_id_seq TO volley_app;


--
-- Name: TABLE coach_assignments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.coach_assignments TO volley_app;


--
-- Name: SEQUENCE coach_assignments_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.coach_assignments_id_seq TO volley_app;


--
-- Name: TABLE coach_competition_stats; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.coach_competition_stats TO volley_app;


--
-- Name: SEQUENCE coach_competition_stats_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.coach_competition_stats_id_seq TO volley_app;


--
-- Name: TABLE coach_stats; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.coach_stats TO volley_app;


--
-- Name: SEQUENCE coach_stats_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.coach_stats_id_seq TO volley_app;


--
-- Name: TABLE coach_trophies; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.coach_trophies TO volley_app;


--
-- Name: SEQUENCE coach_trophies_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.coach_trophies_id_seq TO volley_app;


--
-- Name: TABLE coaches; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.coaches TO volley_app;


--
-- Name: SEQUENCE coaches_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.coaches_id_seq TO volley_app;


--
-- Name: TABLE collaborators; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.collaborators TO volley_app;


--
-- Name: SEQUENCE collaborators_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.collaborators_id_seq TO volley_app;


--
-- Name: TABLE match_lineups; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.match_lineups TO volley_app;


--
-- Name: SEQUENCE match_lineups_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.match_lineups_id_seq TO volley_app;


--
-- Name: TABLE match_set_event_touches; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.match_set_event_touches TO volley_app;


--
-- Name: SEQUENCE match_set_event_touches_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.match_set_event_touches_id_seq TO volley_app;


--
-- Name: TABLE match_set_events; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.match_set_events TO volley_app;


--
-- Name: SEQUENCE match_set_events_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.match_set_events_id_seq TO volley_app;


--
-- Name: TABLE match_set_substitutions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.match_set_substitutions TO volley_app;


--
-- Name: SEQUENCE match_set_substitutions_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.match_set_substitutions_id_seq TO volley_app;


--
-- Name: TABLE match_sets; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.match_sets TO volley_app;


--
-- Name: SEQUENCE match_sets_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.match_sets_id_seq TO volley_app;


--
-- Name: TABLE matchdays; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.matchdays TO volley_app;


--
-- Name: SEQUENCE matchdays_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.matchdays_id_seq TO volley_app;


--
-- Name: TABLE matches; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.matches TO volley_app;


--
-- Name: SEQUENCE matches_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.matches_id_seq TO volley_app;


--
-- Name: TABLE players; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.players TO volley_app;


--
-- Name: SEQUENCE players_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.players_id_seq TO volley_app;


--
-- Name: TABLE seasons; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.seasons TO volley_app;


--
-- Name: SEQUENCE seasons_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.seasons_id_seq TO volley_app;


--
-- Name: TABLE stats_player_match; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.stats_player_match TO volley_app;


--
-- Name: SEQUENCE stats_player_match_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.stats_player_match_id_seq TO volley_app;


--
-- Name: TABLE stats_player_set; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.stats_player_set TO volley_app;


--
-- Name: SEQUENCE stats_player_set_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.stats_player_set_id_seq TO volley_app;


--
-- Name: TABLE stats_team_match; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.stats_team_match TO volley_app;


--
-- Name: SEQUENCE stats_team_match_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.stats_team_match_id_seq TO volley_app;


--
-- Name: TABLE stats_team_set; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.stats_team_set TO volley_app;


--
-- Name: SEQUENCE stats_team_set_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.stats_team_set_id_seq TO volley_app;


--
-- Name: TABLE teams; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.teams TO volley_app;


--
-- Name: SEQUENCE teams_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.teams_id_seq TO volley_app;


--
-- Name: TABLE tournament_teams; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.tournament_teams TO volley_app;


--
-- Name: SEQUENCE tournament_teams_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.tournament_teams_id_seq TO volley_app;


--
-- Name: TABLE tournaments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.tournaments TO volley_app;


--
-- Name: SEQUENCE tournaments_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.tournaments_id_seq TO volley_app;


--
-- Name: TABLE users; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.users TO volley_app;


--
-- Name: SEQUENCE users_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.users_id_seq TO volley_app;


--
-- Name: TABLE v_current_coaches; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.v_current_coaches TO volley_app;


--
-- Name: TABLE venues; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.venues TO volley_app;


--
-- Name: TABLE v_matchday_results; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.v_matchday_results TO volley_app;


--
-- Name: SEQUENCE venues_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.venues_id_seq TO volley_app;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES  TO volley_app;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS  TO volley_app;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES  TO volley_app;


--
-- PostgreSQL database dump complete
--

