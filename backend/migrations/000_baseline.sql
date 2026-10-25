--
-- PostgreSQL database dump
--

\restrict 4Lrat0DHqca0LfPY84PdSCkECfG1N27WhMa2nIHbtKyVkGoPChMnA1iBn9EBMEc

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

-- Started on 2026-10-25 23:34:13

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
-- TOC entry 237 (class 1255 OID 16933)
-- Name: notify_file_received(integer, integer); Type: PROCEDURE; Schema: public; Owner: postgres
--

CREATE OR REPLACE PROCEDURE public.notify_file_received(IN p_file_id integer, IN p_recipient_id integer)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_filename VARCHAR(255);
BEGIN

    -- Confirm that the user has received this file
    SELECT f.original_name
    INTO v_filename
    FROM shares s
    JOIN files f ON f.id = s.file_id
    WHERE s.file_id = p_file_id
      AND s.shared_with = p_recipient_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Valid file share not found';
    END IF;

    -- Record the received notification
    INSERT INTO notifications (
        recipient_id,
        file_id,
        type,

    )
    VALUES (
        p_recipient_id,
        p_file_id,
        'file_received',
        jsonb_build_object(
            'filename', v_filename,
            'message', 'A file was shared with you'
        )
    );

END;
$$;


ALTER PROCEDURE public.notify_file_received(IN p_file_id integer, IN p_recipient_id integer) OWNER TO securedocs;

--
-- TOC entry 238 (class 1255 OID 16934)
-- Name: on_file_shared(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.on_file_shared() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN

    CALL notify_file_received(
        NEW.file_id,
        NEW.shared_with
    );

    RETURN NEW;

END;
$$;


ALTER FUNCTION public.on_file_shared() OWNER TO securedocs;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 226 (class 1259 OID 16769)
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id bigint NOT NULL,
    actor_id integer,
    action text NOT NULL,
    file_id integer,
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_logs_action_check CHECK ((action = ANY (ARRAY['upload'::text, 'download'::text, 'rename'::text, 'delete'::text, 'share'::text, 'revoke'::text, 'account_disabled'::text, 'account_enabled'::text, 'folder_create'::text, 'folder_rename'::text, 'folder_delete'::text, 'file_move'::text, 'mfa_enabled'::text, 'mfa_disabled'::text])))
);


ALTER TABLE public.audit_logs OWNER TO securedocs;

--
-- TOC entry 225 (class 1259 OID 16768)
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audit_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_logs_id_seq OWNER TO securedocs;

--
-- TOC entry 5140 (class 0 OID 0)
-- Dependencies: 225
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- TOC entry 232 (class 1259 OID 16871)
-- Name: file_tags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.file_tags (
    id bigint NOT NULL,
    owner_id integer NOT NULL,
    file_id integer NOT NULL,
    tag_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.file_tags OWNER TO securedocs;

--
-- TOC entry 231 (class 1259 OID 16870)
-- Name: file_tags_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.file_tags_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.file_tags_id_seq OWNER TO securedocs;

--
-- TOC entry 5141 (class 0 OID 0)
-- Dependencies: 231
-- Name: file_tags_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.file_tags_id_seq OWNED BY public.file_tags.id;


--
-- TOC entry 222 (class 1259 OID 16408)
-- Name: files; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.files (
    id integer NOT NULL,
    owner_id integer NOT NULL,
    original_name character varying(255) NOT NULL,
    stored_name character varying(255) NOT NULL,
    file_path text NOT NULL,
    mime_type character varying(100) NOT NULL,
    file_size integer NOT NULL,
    uploaded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    folder_id bigint
);


ALTER TABLE public.files OWNER TO securedocs;

--
-- TOC entry 221 (class 1259 OID 16407)
-- Name: files_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.files_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.files_id_seq OWNER TO securedocs;

--
-- TOC entry 5142 (class 0 OID 0)
-- Dependencies: 221
-- Name: files_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.files_id_seq OWNED BY public.files.id;


--
-- TOC entry 228 (class 1259 OID 16805)
-- Name: folders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.folders (
    id bigint NOT NULL,
    owner_id integer NOT NULL,
    parent_id bigint,
    name character varying(100) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT folders_name_valid CHECK ((length(TRIM(BOTH FROM name)) > 0))
);


ALTER TABLE public.folders OWNER TO securedocs;

--
-- TOC entry 227 (class 1259 OID 16804)
-- Name: folders_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.folders_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.folders_id_seq OWNER TO securedocs;

--
-- TOC entry 5143 (class 0 OID 0)
-- Dependencies: 227
-- Name: folders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.folders_id_seq OWNED BY public.folders.id;


--
-- TOC entry 234 (class 1259 OID 16900)
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id bigint NOT NULL,
    recipient_id integer NOT NULL,
    file_id integer,
    type character varying(30) NOT NULL,
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT notifications_type_check CHECK (((type)::text = ANY ((ARRAY['file_received'::character varying, 'share_revoked'::character varying, 'system'::character varying])::text[])))
);


ALTER TABLE public.notifications OWNER TO securedocs;

--
-- TOC entry 233 (class 1259 OID 16899)
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notifications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO securedocs;

--
-- TOC entry 5144 (class 0 OID 0)
-- Dependencies: 233
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- TOC entry 224 (class 1259 OID 16430)
-- Name: shares; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shares (
    id integer NOT NULL,
    file_id integer NOT NULL,
    shared_with integer NOT NULL,
    shared_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.shares OWNER TO securedocs;

--
-- TOC entry 223 (class 1259 OID 16429)
-- Name: shares_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.shares_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.shares_id_seq OWNER TO securedocs;

--
-- TOC entry 5145 (class 0 OID 0)
-- Dependencies: 223
-- Name: shares_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.shares_id_seq OWNED BY public.shares.id;


--
-- TOC entry 230 (class 1259 OID 16850)
-- Name: tags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tags (
    id bigint NOT NULL,
    owner_id integer NOT NULL,
    name character varying(60) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT valid_tag_name CHECK ((length(TRIM(BOTH FROM name)) > 0))
);


ALTER TABLE public.tags OWNER TO securedocs;

--
-- TOC entry 229 (class 1259 OID 16849)
-- Name: tags_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tags_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tags_id_seq OWNER TO securedocs;

--
-- TOC entry 5146 (class 0 OID 0)
-- Dependencies: 229
-- Name: tags_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tags_id_seq OWNED BY public.tags.id;


--
-- TOC entry 236 (class 1259 OID 16936)
-- Name: user_activity_feed; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.user_activity_feed AS
 SELECT ('a-'::text || audit_logs.id) AS id,
    audit_logs.actor_id AS user_id,
    audit_logs.action,
    audit_logs.file_id,
    audit_logs.details,
    audit_logs.created_at
   FROM public.audit_logs
UNION ALL
 SELECT ('n-'::text || notifications.id) AS id,
    notifications.recipient_id AS user_id,
    notifications.type AS action,
    notifications.file_id,
    notifications.details,
    notifications.created_at
   FROM public.notifications;


ALTER VIEW public.user_activity_feed OWNER TO securedocs;

--
-- TOC entry 220 (class 1259 OID 16390)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash text NOT NULL,
    totp_secret text,
    is_admin boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    role text DEFAULT 'user'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    mfa_secret_enc text,
    mfa_pending_enc text,
    mfa_pending_at timestamp with time zone,
    mfa_enabled boolean DEFAULT false NOT NULL,
    mfa_last_step bigint,
    token_version integer DEFAULT 0 NOT NULL,
    CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['user'::text, 'admin'::text])))
);


ALTER TABLE public.users OWNER TO securedocs;

--
-- TOC entry 235 (class 1259 OID 16928)
-- Name: user_storage_summary; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.user_storage_summary AS
 SELECT u.id AS user_id,
    u.username,
    u.email,
    (count(f.id))::integer AS total_files,
    COALESCE(sum(f.file_size), (0)::bigint) AS total_bytes
   FROM (public.users u
     LEFT JOIN public.files f ON ((u.id = f.owner_id)))
  GROUP BY u.id, u.username, u.email;


ALTER VIEW public.user_storage_summary OWNER TO securedocs;

--
-- TOC entry 219 (class 1259 OID 16389)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO securedocs;

--
-- TOC entry 5147 (class 0 OID 0)
-- Dependencies: 219
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 4913 (class 2604 OID 16772)
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- TOC entry 4920 (class 2604 OID 16874)
-- Name: file_tags id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.file_tags ALTER COLUMN id SET DEFAULT nextval('public.file_tags_id_seq'::regclass);


--
-- TOC entry 4909 (class 2604 OID 16411)
-- Name: files id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.files ALTER COLUMN id SET DEFAULT nextval('public.files_id_seq'::regclass);


--
-- TOC entry 4916 (class 2604 OID 16808)
-- Name: folders id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.folders ALTER COLUMN id SET DEFAULT nextval('public.folders_id_seq'::regclass);


--
-- TOC entry 4922 (class 2604 OID 16903)
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- TOC entry 4911 (class 2604 OID 16433)
-- Name: shares id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shares ALTER COLUMN id SET DEFAULT nextval('public.shares_id_seq'::regclass);


--
-- TOC entry 4918 (class 2604 OID 16853)
-- Name: tags id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tags ALTER COLUMN id SET DEFAULT nextval('public.tags_id_seq'::regclass);


--
-- TOC entry 4901 (class 2604 OID 16393)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 4949 (class 2606 OID 16783)
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 4963 (class 2606 OID 16883)
-- Name: file_tags file_tags_file_id_tag_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.file_tags
    ADD CONSTRAINT file_tags_file_id_tag_id_key UNIQUE (file_id, tag_id);


--
-- TOC entry 4965 (class 2606 OID 16881)
-- Name: file_tags file_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.file_tags
    ADD CONSTRAINT file_tags_pkey PRIMARY KEY (id);


--
-- TOC entry 4940 (class 2606 OID 16423)
-- Name: files files_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_pkey PRIMARY KEY (id);


--
-- TOC entry 4955 (class 2606 OID 16816)
-- Name: folders folders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.folders
    ADD CONSTRAINT folders_pkey PRIMARY KEY (id);


--
-- TOC entry 4967 (class 2606 OID 16916)
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- TOC entry 4942 (class 2606 OID 16442)
-- Name: shares shares_file_id_shared_with_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shares
    ADD CONSTRAINT shares_file_id_shared_with_key UNIQUE (file_id, shared_with);


--
-- TOC entry 4945 (class 2606 OID 16440)
-- Name: shares shares_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shares
    ADD CONSTRAINT shares_pkey PRIMARY KEY (id);


--
-- TOC entry 4958 (class 2606 OID 16862)
-- Name: tags tags_id_owner_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_id_owner_id_key UNIQUE (id, owner_id);


--
-- TOC entry 4960 (class 2606 OID 16860)
-- Name: tags tags_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);


--
-- TOC entry 4932 (class 2606 OID 16406)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 4935 (class 2606 OID 16404)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4947 (class 1259 OID 16794)
-- Name: audit_logs_actor_time_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX audit_logs_actor_time_idx ON public.audit_logs USING btree (actor_id, created_at DESC);


--
-- TOC entry 4950 (class 1259 OID 16795)
-- Name: audit_logs_time_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX audit_logs_time_idx ON public.audit_logs USING btree (created_at DESC);


--
-- TOC entry 4936 (class 1259 OID 16841)
-- Name: files_folder_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX files_folder_idx ON public.files USING btree (owner_id, folder_id);


--
-- TOC entry 4937 (class 1259 OID 16869)
-- Name: files_id_owner_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX files_id_owner_unique ON public.files USING btree (id, owner_id);


--
-- TOC entry 4938 (class 1259 OID 16796)
-- Name: files_owner_time_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX files_owner_time_idx ON public.files USING btree (owner_id, uploaded_at DESC);


--
-- TOC entry 4951 (class 1259 OID 16828)
-- Name: folders_child_name_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX folders_child_name_unique ON public.folders USING btree (owner_id, parent_id, lower((name)::text)) WHERE (parent_id IS NOT NULL);


--
-- TOC entry 4952 (class 1259 OID 16830)
-- Name: folders_id_owner_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX folders_id_owner_unique ON public.folders USING btree (id, owner_id);


--
-- TOC entry 4953 (class 1259 OID 16829)
-- Name: folders_parent_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX folders_parent_idx ON public.folders USING btree (owner_id, parent_id);


--
-- TOC entry 4956 (class 1259 OID 16827)
-- Name: folders_root_name_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX folders_root_name_unique ON public.folders USING btree (owner_id, lower((name)::text)) WHERE (parent_id IS NULL);


--
-- TOC entry 4968 (class 1259 OID 16927)
-- Name: notifications_recipient_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX notifications_recipient_idx ON public.notifications USING btree (recipient_id, created_at DESC);


--
-- TOC entry 4943 (class 1259 OID 16798)
-- Name: shares_file_recipient_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX shares_file_recipient_unique ON public.shares USING btree (file_id, shared_with);


--
-- TOC entry 4946 (class 1259 OID 16797)
-- Name: shares_recipient_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX shares_recipient_idx ON public.shares USING btree (shared_with);


--
-- TOC entry 4961 (class 1259 OID 16868)
-- Name: unique_user_tag; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX unique_user_tag ON public.tags USING btree (owner_id, lower((name)::text));


--
-- TOC entry 4933 (class 1259 OID 16799)
-- Name: users_email_lower_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX users_email_lower_unique ON public.users USING btree (lower((email)::text));


--
-- TOC entry 4985 (class 2620 OID 16935)
-- Name: shares trg_file_shared; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_file_shared AFTER INSERT ON public.shares FOR EACH ROW EXECUTE FUNCTION public.on_file_shared();


--
-- TOC entry 4974 (class 2606 OID 16784)
-- Name: audit_logs audit_logs_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4975 (class 2606 OID 16789)
-- Name: audit_logs audit_logs_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_file_id_fkey FOREIGN KEY (file_id) REFERENCES public.files(id) ON DELETE SET NULL;


--
-- TOC entry 4980 (class 2606 OID 16889)
-- Name: file_tags file_tags_file_id_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.file_tags
    ADD CONSTRAINT file_tags_file_id_owner_id_fkey FOREIGN KEY (file_id, owner_id) REFERENCES public.files(id, owner_id) ON DELETE CASCADE;


--
-- TOC entry 4981 (class 2606 OID 16884)
-- Name: file_tags file_tags_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.file_tags
    ADD CONSTRAINT file_tags_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4982 (class 2606 OID 16894)
-- Name: file_tags file_tags_tag_id_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.file_tags
    ADD CONSTRAINT file_tags_tag_id_owner_id_fkey FOREIGN KEY (tag_id, owner_id) REFERENCES public.tags(id, owner_id) ON DELETE CASCADE;


--
-- TOC entry 4969 (class 2606 OID 16836)
-- Name: files files_folder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.folders(id) ON DELETE RESTRICT;


--
-- TOC entry 4970 (class 2606 OID 16842)
-- Name: files files_folder_owner_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_folder_owner_fk FOREIGN KEY (folder_id, owner_id) REFERENCES public.folders(id, owner_id);


--
-- TOC entry 4971 (class 2606 OID 16424)
-- Name: files files_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id);


--
-- TOC entry 4976 (class 2606 OID 16817)
-- Name: folders folders_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.folders
    ADD CONSTRAINT folders_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4977 (class 2606 OID 16822)
-- Name: folders folders_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.folders
    ADD CONSTRAINT folders_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.folders(id) ON DELETE RESTRICT;


--
-- TOC entry 4978 (class 2606 OID 16831)
-- Name: folders folders_parent_owner_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.folders
    ADD CONSTRAINT folders_parent_owner_fk FOREIGN KEY (parent_id, owner_id) REFERENCES public.folders(id, owner_id);


--
-- TOC entry 4983 (class 2606 OID 16922)
-- Name: notifications notifications_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_file_id_fkey FOREIGN KEY (file_id) REFERENCES public.files(id) ON DELETE SET NULL;


--
-- TOC entry 4984 (class 2606 OID 16917)
-- Name: notifications notifications_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4972 (class 2606 OID 16443)
-- Name: shares shares_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shares
    ADD CONSTRAINT shares_file_id_fkey FOREIGN KEY (file_id) REFERENCES public.files(id) ON DELETE CASCADE;


--
-- TOC entry 4973 (class 2606 OID 16448)
-- Name: shares shares_shared_with_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shares
    ADD CONSTRAINT shares_shared_with_fkey FOREIGN KEY (shared_with) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4979 (class 2606 OID 16863)
-- Name: tags tags_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;


-- Completed on 2026-10-25 23:34:13

--
-- PostgreSQL database dump complete
--

\unrestrict 4Lrat0DHqca0LfPY84PdSCkECfG1N27WhMa2nIHbtKyVkGoPChMnA1iBn9EBMEc

