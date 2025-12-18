--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

-- Started on 2025-12-17 16:10:40

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 923 (class 1247 OID 53672)
-- Name: enum_allocations_allocation_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_allocations_allocation_type AS ENUM (
    'annual',
    'replacement',
    'emergency',
    'new-employee'
);


--
-- TOC entry 926 (class 1247 OID 53682)
-- Name: enum_allocations_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_allocations_status AS ENUM (
    'active',
    'expired',
    'replaced',
    'returned'
);


--
-- TOC entry 935 (class 1247 OID 53728)
-- Name: enum_budgets_period; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_budgets_period AS ENUM (
    'annual',
    'half-year',
    'quarterly',
    'monthly'
);


--
-- TOC entry 932 (class 1247 OID 53721)
-- Name: enum_budgets_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_budgets_status AS ENUM (
    'active',
    'expired',
    'draft'
);


--
-- TOC entry 956 (class 1247 OID 53838)
-- Name: enum_documents_doc_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_documents_doc_type AS ENUM (
    'ppe-card',
    'certificate',
    'report',
    'invoice',
    'other'
);


--
-- TOC entry 941 (class 1247 OID 53758)
-- Name: enum_failure_reports_failure_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_failure_reports_failure_type AS ENUM (
    'damage',
    'defect',
    'lost',
    'wear'
);


--
-- TOC entry 944 (class 1247 OID 53768)
-- Name: enum_failure_reports_severity; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_failure_reports_severity AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
);


--
-- TOC entry 947 (class 1247 OID 53778)
-- Name: enum_failure_reports_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_failure_reports_status AS ENUM (
    'pending-sheq-review',
    'sheq-approved',
    'stores-processing',
    'resolved',
    'replaced'
);


--
-- TOC entry 893 (class 1247 OID 53463)
-- Name: enum_ppe_items_item_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_ppe_items_item_type AS ENUM (
    'PPE',
    'CONSUMABLE',
    'EQUIPMENT',
    'LABORATORY'
);


--
-- TOC entry 914 (class 1247 OID 53584)
-- Name: enum_requests_request_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_requests_request_type AS ENUM (
    'new',
    'replacement',
    'emergency',
    'annual'
);


--
-- TOC entry 911 (class 1247 OID 53564)
-- Name: enum_requests_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_requests_status AS ENUM (
    'pending',
    'dept-rep-review',
    'hod-review',
    'stores-review',
    'approved',
    'fulfilled',
    'rejected',
    'cancelled',
    'sheq-review'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 242 (class 1259 OID 54005)
-- Name: SequelizeMeta; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SequelizeMeta" (
    name character varying(255) NOT NULL
);


--
-- TOC entry 235 (class 1259 OID 53691)
-- Name: allocations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.allocations (
    id uuid NOT NULL,
    quantity integer NOT NULL,
    size character varying(50),
    unit_cost numeric(12,2),
    total_cost numeric(12,2),
    issue_date timestamp with time zone NOT NULL,
    next_renewal_date timestamp with time zone,
    expiry_date timestamp with time zone,
    allocation_type public.enum_allocations_allocation_type DEFAULT 'replacement'::public.enum_allocations_allocation_type,
    status public.enum_allocations_status DEFAULT 'active'::public.enum_allocations_status,
    notes text,
    replacement_frequency integer,
    stock_id uuid,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    ppe_item_id uuid,
    employee_id uuid,
    issued_by_id uuid,
    request_id uuid
);


--
-- TOC entry 5184 (class 0 OID 0)
-- Dependencies: 235
-- Name: COLUMN allocations.replacement_frequency; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.allocations.replacement_frequency IS 'Replacement frequency in months';


--
-- TOC entry 5185 (class 0 OID 0)
-- Dependencies: 235
-- Name: COLUMN allocations.stock_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.allocations.stock_id IS 'Reference to the specific stock item allocated';


--
-- TOC entry 238 (class 1259 OID 53825)
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid NOT NULL,
    action character varying(255) NOT NULL,
    entity_type character varying(100),
    entity_id uuid,
    changes jsonb,
    meta jsonb,
    ip_address character varying(45),
    user_agent text,
    created_at timestamp with time zone NOT NULL,
    user_id uuid
);


--
-- TOC entry 5186 (class 0 OID 0)
-- Dependencies: 238
-- Name: COLUMN audit_logs.entity_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.audit_logs.entity_type IS 'Type of entity affected (e.g., Request, Allocation)';


--
-- TOC entry 5187 (class 0 OID 0)
-- Dependencies: 238
-- Name: COLUMN audit_logs.changes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.audit_logs.changes IS 'Before and after values';


--
-- TOC entry 5188 (class 0 OID 0)
-- Dependencies: 238
-- Name: COLUMN audit_logs.meta; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.audit_logs.meta IS 'Additional metadata';


--
-- TOC entry 236 (class 1259 OID 53737)
-- Name: budgets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.budgets (
    id uuid NOT NULL,
    department_id uuid NOT NULL,
    section_id uuid,
    fiscal_year integer NOT NULL,
    total_budget numeric(14,2) NOT NULL,
    allocated_budget numeric(14,2) DEFAULT 0 NOT NULL,
    remaining_budget numeric(14,2) NOT NULL,
    status public.enum_budgets_status DEFAULT 'active'::public.enum_budgets_status,
    period public.enum_budgets_period DEFAULT 'annual'::public.enum_budgets_period,
    quarter integer,
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    notes text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    company_budget_id uuid,
    allocated_amount numeric(15,2) DEFAULT 0,
    total_spent numeric(15,2) DEFAULT 0,
    month integer,
    CONSTRAINT budgets_month_check CHECK (((month >= 1) AND (month <= 12)))
);


--
-- TOC entry 241 (class 1259 OID 53973)
-- Name: company_budgets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_budgets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    fiscal_year integer NOT NULL,
    total_budget numeric(15,2) DEFAULT 0 NOT NULL,
    allocated_to_departments numeric(15,2) DEFAULT 0 NOT NULL,
    total_spent numeric(15,2) DEFAULT 0 NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    notes text,
    created_by_id uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    start_date date,
    end_date date,
    CONSTRAINT company_budgets_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'active'::character varying, 'closed'::character varying])::text[])))
);


--
-- TOC entry 224 (class 1259 OID 53384)
-- Name: cost_centers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cost_centers (
    id uuid NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    department_id uuid,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- TOC entry 5189 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN cost_centers.code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cost_centers.code IS 'Cost center code';


--
-- TOC entry 5190 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN cost_centers.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cost_centers.name IS 'Cost center name';


--
-- TOC entry 5191 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN cost_centers.department_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cost_centers.department_id IS 'Associated department';


--
-- TOC entry 222 (class 1259 OID 53359)
-- Name: departments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.departments (
    id uuid NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(20),
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- TOC entry 239 (class 1259 OID 53849)
-- Name: documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documents (
    id uuid NOT NULL,
    original_filename character varying(255) NOT NULL,
    stored_filename character varying(255) NOT NULL,
    storage_path character varying(500) NOT NULL,
    file_size integer,
    mime_type character varying(100),
    doc_type public.enum_documents_doc_type DEFAULT 'other'::public.enum_documents_doc_type,
    description text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    employee_id uuid,
    uploaded_by_id uuid
);


--
-- TOC entry 226 (class 1259 OID 53417)
-- Name: employees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employees (
    id uuid NOT NULL,
    "worksNumber" character varying(50) NOT NULL,
    "employeeId" character varying(50),
    "firstName" character varying(100) NOT NULL,
    "lastName" character varying(100) NOT NULL,
    email character varying(255),
    "phoneNumber" character varying(20),
    "sectionId" uuid NOT NULL,
    "costCenterId" uuid,
    "jobTitleId" uuid,
    "jobTitle" character varying(100),
    "jobType" character varying(100),
    gender character varying(20),
    "contractType" character varying(50),
    "dateOfBirth" timestamp with time zone,
    "dateJoined" timestamp with time zone,
    "isActive" boolean DEFAULT true,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- TOC entry 5192 (class 0 OID 0)
-- Dependencies: 226
-- Name: COLUMN employees."costCenterId"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.employees."costCenterId" IS 'Cost center for budget tracking';


--
-- TOC entry 5193 (class 0 OID 0)
-- Dependencies: 226
-- Name: COLUMN employees."jobTitleId"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.employees."jobTitleId" IS 'Reference to JobTitle entity';


--
-- TOC entry 5194 (class 0 OID 0)
-- Dependencies: 226
-- Name: COLUMN employees."jobTitle"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.employees."jobTitle" IS 'Legacy field - use jobTitleId instead';


--
-- TOC entry 5195 (class 0 OID 0)
-- Dependencies: 226
-- Name: COLUMN employees."jobType"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.employees."jobType" IS 'NEC or Salaried';


--
-- TOC entry 5196 (class 0 OID 0)
-- Dependencies: 226
-- Name: COLUMN employees."contractType"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.employees."contractType" IS 'e.g., PERMANENT, TERMINATED, CONTRACT';


--
-- TOC entry 237 (class 1259 OID 53789)
-- Name: failure_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.failure_reports (
    id uuid NOT NULL,
    employee_id uuid NOT NULL,
    ppe_item_id uuid NOT NULL,
    allocation_id uuid,
    stock_id uuid,
    replacement_stock_id uuid,
    description text NOT NULL,
    failure_type public.enum_failure_reports_failure_type DEFAULT 'damage'::public.enum_failure_reports_failure_type,
    observed_at character varying(255),
    reported_date timestamp with time zone NOT NULL,
    failure_date timestamp with time zone,
    brand character varying(255),
    remarks text,
    reviewed_by_s_h_e_q boolean DEFAULT false,
    sheq_decision text,
    sheq_review_date timestamp with time zone,
    action_taken text,
    severity public.enum_failure_reports_severity DEFAULT 'medium'::public.enum_failure_reports_severity,
    status public.enum_failure_reports_status DEFAULT 'pending-sheq-review'::public.enum_failure_reports_status,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- TOC entry 5197 (class 0 OID 0)
-- Dependencies: 237
-- Name: COLUMN failure_reports.stock_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.failure_reports.stock_id IS 'The stock item that failed';


--
-- TOC entry 5198 (class 0 OID 0)
-- Dependencies: 237
-- Name: COLUMN failure_reports.replacement_stock_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.failure_reports.replacement_stock_id IS 'The replacement stock item allocated';


--
-- TOC entry 5199 (class 0 OID 0)
-- Dependencies: 237
-- Name: COLUMN failure_reports.observed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.failure_reports.observed_at IS 'Location or section where failure observed';


--
-- TOC entry 5200 (class 0 OID 0)
-- Dependencies: 237
-- Name: COLUMN failure_reports.failure_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.failure_reports.failure_date IS 'Date when the failure occurred';


--
-- TOC entry 5201 (class 0 OID 0)
-- Dependencies: 237
-- Name: COLUMN failure_reports.brand; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.failure_reports.brand IS 'Brand or type of the PPE that failed';


--
-- TOC entry 5202 (class 0 OID 0)
-- Dependencies: 237
-- Name: COLUMN failure_reports.remarks; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.failure_reports.remarks IS 'Additional remarks or notes';


--
-- TOC entry 5203 (class 0 OID 0)
-- Dependencies: 237
-- Name: COLUMN failure_reports.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.failure_reports.status IS 'Workflow: Section Rep -> SHEQ Review -> Stores Processing -> Resolved/Replaced';


--
-- TOC entry 240 (class 1259 OID 53867)
-- Name: forecasts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.forecasts (
    id uuid NOT NULL,
    period_year integer NOT NULL,
    period_quarter integer,
    forecast_quantity integer NOT NULL,
    actual_quantity integer DEFAULT 0,
    variance integer,
    notes text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    department_id uuid,
    ppe_item_id uuid
);


--
-- TOC entry 231 (class 1259 OID 53521)
-- Name: job_title_ppe_matrix; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_title_ppe_matrix (
    id uuid NOT NULL,
    "jobTitleId" uuid,
    job_title character varying(100),
    ppe_item_id uuid NOT NULL,
    quantity_required integer DEFAULT 1 NOT NULL,
    replacement_frequency integer,
    heavy_use_frequency integer,
    is_mandatory boolean DEFAULT true,
    category character varying(50),
    notes text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- TOC entry 5204 (class 0 OID 0)
-- Dependencies: 231
-- Name: COLUMN job_title_ppe_matrix."jobTitleId"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.job_title_ppe_matrix."jobTitleId" IS 'Reference to JobTitle entity (new approach)';


--
-- TOC entry 5205 (class 0 OID 0)
-- Dependencies: 231
-- Name: COLUMN job_title_ppe_matrix.job_title; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.job_title_ppe_matrix.job_title IS 'Legacy: Job title string (deprecated - use jobTitleId instead)';


--
-- TOC entry 5206 (class 0 OID 0)
-- Dependencies: 231
-- Name: COLUMN job_title_ppe_matrix.ppe_item_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.job_title_ppe_matrix.ppe_item_id IS 'Reference to PPE item';


--
-- TOC entry 5207 (class 0 OID 0)
-- Dependencies: 231
-- Name: COLUMN job_title_ppe_matrix.quantity_required; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.job_title_ppe_matrix.quantity_required IS 'Quantity of this PPE item required per issue';


--
-- TOC entry 5208 (class 0 OID 0)
-- Dependencies: 231
-- Name: COLUMN job_title_ppe_matrix.replacement_frequency; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.job_title_ppe_matrix.replacement_frequency IS 'Standard replacement frequency in months (e.g., 8 months)';


--
-- TOC entry 5209 (class 0 OID 0)
-- Dependencies: 231
-- Name: COLUMN job_title_ppe_matrix.heavy_use_frequency; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.job_title_ppe_matrix.heavy_use_frequency IS 'Heavy use replacement frequency in months (e.g., 4 months)';


--
-- TOC entry 5210 (class 0 OID 0)
-- Dependencies: 231
-- Name: COLUMN job_title_ppe_matrix.is_mandatory; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.job_title_ppe_matrix.is_mandatory IS 'Whether this PPE is mandatory for this job title';


--
-- TOC entry 5211 (class 0 OID 0)
-- Dependencies: 231
-- Name: COLUMN job_title_ppe_matrix.category; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.job_title_ppe_matrix.category IS 'PPE category (BODY/TORSO, EARS, EYES/FACE, FEET, HANDS, etc.)';


--
-- TOC entry 5212 (class 0 OID 0)
-- Dependencies: 231
-- Name: COLUMN job_title_ppe_matrix.notes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.job_title_ppe_matrix.notes IS 'Additional notes or specifications for this job title';


--
-- TOC entry 225 (class 1259 OID 53401)
-- Name: job_titles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_titles (
    id uuid NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(20),
    description text,
    "sectionId" uuid NOT NULL,
    "isActive" boolean DEFAULT true,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- TOC entry 5213 (class 0 OID 0)
-- Dependencies: 225
-- Name: COLUMN job_titles."sectionId"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.job_titles."sectionId" IS 'Job titles belong to sections';


--
-- TOC entry 228 (class 1259 OID 53471)
-- Name: ppe_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ppe_items (
    id uuid NOT NULL,
    item_code character varying(50),
    item_ref_code character varying(50),
    name character varying(255) NOT NULL,
    product_name character varying(255),
    item_type public.enum_ppe_items_item_type DEFAULT 'PPE'::public.enum_ppe_items_item_type NOT NULL,
    category character varying(100),
    description text,
    unit character varying(50) DEFAULT 'EA'::character varying,
    replacement_frequency integer,
    heavy_use_frequency integer,
    is_mandatory boolean DEFAULT true,
    account_code character varying(50),
    account_description character varying(255),
    supplier character varying(255),
    has_size_variants boolean DEFAULT false,
    has_color_variants boolean DEFAULT false,
    size_scale character varying(50),
    available_sizes jsonb,
    available_colors jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- TOC entry 5214 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN ppe_items.item_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ppe_items.item_code IS 'Internal item code for reference';


--
-- TOC entry 5215 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN ppe_items.item_ref_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ppe_items.item_ref_code IS 'External reference code (e.g., ITMREF_0 like SS053926002)';


--
-- TOC entry 5216 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN ppe_items.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ppe_items.name IS 'Product name or description';


--
-- TOC entry 5217 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN ppe_items.product_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ppe_items.product_name IS 'Full product name (ITMDES1_0 from inventory)';


--
-- TOC entry 5218 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN ppe_items.item_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ppe_items.item_type IS 'Type of item: PPE, CONSUMABLE, EQUIPMENT, or LABORATORY';


--
-- TOC entry 5219 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN ppe_items.category; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ppe_items.category IS 'PPE category (BODY/TORSO, EARS, EYES/FACE, FEET, HANDS, etc.) or item category (CONS, GESP)';


--
-- TOC entry 5220 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN ppe_items.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ppe_items.description IS 'Detailed description of the item';


--
-- TOC entry 5221 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN ppe_items.unit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ppe_items.unit IS 'Unit of measure (EA, KG, M, etc.)';


--
-- TOC entry 5222 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN ppe_items.replacement_frequency; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ppe_items.replacement_frequency IS 'Standard replacement frequency in months';


--
-- TOC entry 5223 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN ppe_items.heavy_use_frequency; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ppe_items.heavy_use_frequency IS 'Heavy use replacement frequency in months';


--
-- TOC entry 5224 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN ppe_items.account_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ppe_items.account_code IS 'Accounting code (e.g., PPEQ, PSS05, CONS)';


--
-- TOC entry 5225 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN ppe_items.account_description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ppe_items.account_description IS 'Account description (e.g., Personal Protective Equipment)';


--
-- TOC entry 5226 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN ppe_items.has_size_variants; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ppe_items.has_size_variants IS 'Whether this item comes in different sizes';


--
-- TOC entry 5227 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN ppe_items.has_color_variants; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ppe_items.has_color_variants IS 'Whether this item comes in different colors';


--
-- TOC entry 5228 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN ppe_items.size_scale; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ppe_items.size_scale IS 'References size_scales.code to indicate which size set applies';


--
-- TOC entry 5229 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN ppe_items.available_sizes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ppe_items.available_sizes IS 'JSON array of available sizes for this item (e.g., ["S", "M", "L", "XL"])';


--
-- TOC entry 5230 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN ppe_items.available_colors; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ppe_items.available_colors IS 'JSON array of available colors for this item (e.g., ["Blue", "Red", "Yellow"])';


--
-- TOC entry 234 (class 1259 OID 53653)
-- Name: request_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.request_items (
    id uuid NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    size character varying(50),
    reason text,
    approved_quantity integer,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    request_id uuid,
    ppe_item_id uuid
);


--
-- TOC entry 233 (class 1259 OID 53593)
-- Name: requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.requests (
    id uuid NOT NULL,
    status public.enum_requests_status DEFAULT 'pending'::public.enum_requests_status NOT NULL,
    section_rep_approval_date timestamp with time zone,
    section_rep_comment text,
    request_type public.enum_requests_request_type DEFAULT 'replacement'::public.enum_requests_request_type,
    is_emergency_visitor boolean DEFAULT false NOT NULL,
    comment text,
    rejection_reason text,
    dept_rep_approval_date timestamp with time zone,
    dept_rep_comment text,
    hod_approval_date timestamp with time zone,
    hod_comment text,
    stores_approval_date timestamp with time zone,
    stores_comment text,
    sheq_approval_date timestamp with time zone,
    sheq_comment text,
    sheq_approver_id uuid,
    fulfilled_date timestamp with time zone,
    fulfilled_by_user_id uuid,
    rejected_by_id uuid,
    rejected_at timestamp with time zone,
    employee_id uuid,
    requested_by_id uuid NOT NULL,
    department_id uuid,
    section_id uuid,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    section_rep_approver_id uuid,
    dept_rep_approver_id uuid,
    hod_approver_id uuid,
    stores_approver_id uuid
);


--
-- TOC entry 221 (class 1259 OID 53349)
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id uuid NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    permissions jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- TOC entry 223 (class 1259 OID 53371)
-- Name: sections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sections (
    id uuid NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(20),
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    department_id uuid
);


--
-- TOC entry 243 (class 1259 OID 54010)
-- Name: settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.settings (
    id uuid NOT NULL,
    category character varying(255) NOT NULL,
    key character varying(255) NOT NULL,
    value text,
    value_type character varying(255) DEFAULT 'string'::character varying NOT NULL,
    description character varying(255),
    is_secret boolean DEFAULT false,
    updated_by uuid,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- TOC entry 229 (class 1259 OID 53493)
-- Name: size_scales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.size_scales (
    id uuid NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    category_group character varying(50),
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- TOC entry 5231 (class 0 OID 0)
-- Dependencies: 229
-- Name: COLUMN size_scales.code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.size_scales.code IS 'Identifier for the size scale (e.g., GARMENT_NUM, ALPHA)';


--
-- TOC entry 5232 (class 0 OID 0)
-- Dependencies: 229
-- Name: COLUMN size_scales.category_group; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.size_scales.category_group IS 'High-level PPE category grouping (BODY, FEET, HANDS, etc.)';


--
-- TOC entry 230 (class 1259 OID 53505)
-- Name: sizes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sizes (
    id uuid NOT NULL,
    scale_id uuid NOT NULL,
    value character varying(50) NOT NULL,
    label character varying(50),
    sort_order integer DEFAULT 0,
    eu_size character varying(20),
    us_size character varying(20),
    uk_size character varying(20),
    meta jsonb,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- TOC entry 5233 (class 0 OID 0)
-- Dependencies: 230
-- Name: COLUMN sizes.scale_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sizes.scale_id IS 'FK to size_scales.id';


--
-- TOC entry 5234 (class 0 OID 0)
-- Dependencies: 230
-- Name: COLUMN sizes.value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sizes.value IS 'Canonical value, e.g., 34, XS, 10, Std';


--
-- TOC entry 5235 (class 0 OID 0)
-- Dependencies: 230
-- Name: COLUMN sizes.label; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sizes.label IS 'Display label if different from value';


--
-- TOC entry 232 (class 1259 OID 53545)
-- Name: stocks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stocks (
    id uuid NOT NULL,
    quantity integer DEFAULT 0 NOT NULL,
    min_level integer DEFAULT 10,
    max_level integer,
    reorder_point integer,
    unit_cost numeric(12,2),
    unit_price_u_s_d numeric(12,2),
    total_value_u_s_d numeric(15,2),
    stock_account character varying(50),
    location character varying(100) DEFAULT 'Main Store'::character varying,
    bin_location character varying(50),
    batch_number character varying(100),
    expiry_date timestamp with time zone,
    size character varying(50),
    color character varying(50),
    last_restocked timestamp with time zone,
    last_stock_take timestamp with time zone,
    notes text,
    eligible_departments uuid[],
    eligible_sections uuid[],
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    ppe_item_id uuid
);


--
-- TOC entry 5236 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN stocks.min_level; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stocks.min_level IS 'Minimum stock level for alerts';


--
-- TOC entry 5237 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN stocks.max_level; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stocks.max_level IS 'Maximum stock level for ordering';


--
-- TOC entry 5238 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN stocks.reorder_point; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stocks.reorder_point IS 'Reorder point to trigger purchase requests';


--
-- TOC entry 5239 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN stocks.unit_cost; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stocks.unit_cost IS 'Unit cost in local currency';


--
-- TOC entry 5240 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN stocks.unit_price_u_s_d; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stocks.unit_price_u_s_d IS 'Unit price in USD';


--
-- TOC entry 5241 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN stocks.total_value_u_s_d; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stocks.total_value_u_s_d IS 'Total stock value (quantity × unit price) in USD';


--
-- TOC entry 5242 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN stocks.stock_account; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stocks.stock_account IS 'Stock accounting account (e.g., 710019, 710021)';


--
-- TOC entry 5243 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN stocks.bin_location; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stocks.bin_location IS 'Specific bin or shelf location in warehouse';


--
-- TOC entry 5244 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN stocks.size; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stocks.size IS 'Size variant (e.g., S, M, L, XL, 6, 7, 8, etc.)';


--
-- TOC entry 5245 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN stocks.color; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stocks.color IS 'Color variant (e.g., Blue, Red, Yellow, etc.)';


--
-- TOC entry 5246 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN stocks.last_stock_take; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stocks.last_stock_take IS 'Last physical stock count date';


--
-- TOC entry 5247 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN stocks.eligible_departments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stocks.eligible_departments IS 'Array of department IDs that can access this stock. NULL means all departments';


--
-- TOC entry 5248 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN stocks.eligible_sections; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stocks.eligible_sections IS 'Array of section IDs that can access this stock. NULL means all sections';


--
-- TOC entry 227 (class 1259 OID 53442)
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    username character varying(100) NOT NULL,
    password_hash character varying(255) NOT NULL,
    employee_id uuid,
    role_id uuid NOT NULL,
    is_active boolean DEFAULT true,
    last_login timestamp with time zone,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    department_id uuid,
    section_id uuid
);


--
-- TOC entry 5249 (class 0 OID 0)
-- Dependencies: 227
-- Name: COLUMN users.employee_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.employee_id IS 'Link to Employee record - source of personal data';


--
-- TOC entry 5177 (class 0 OID 54005)
-- Dependencies: 242
-- Data for Name: SequelizeMeta; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SequelizeMeta" (name) FROM stdin;
\.


--
-- TOC entry 5170 (class 0 OID 53691)
-- Dependencies: 235
-- Data for Name: allocations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.allocations (id, quantity, size, unit_cost, total_cost, issue_date, next_renewal_date, expiry_date, allocation_type, status, notes, replacement_frequency, stock_id, created_at, updated_at, ppe_item_id, employee_id, issued_by_id, request_id) FROM stdin;
\.


--
-- TOC entry 5173 (class 0 OID 53825)
-- Dependencies: 238
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_logs (id, action, entity_type, entity_id, changes, meta, ip_address, user_agent, created_at, user_id) FROM stdin;
9d40467c-6468-40d6-b2c0-0b05f1e97a4f	LOGIN	User	37510ceb-5798-4c70-b7f5-341a18aa99ec	\N	{"ip": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-16 10:20:38.977+02	37510ceb-5798-4c70-b7f5-341a18aa99ec
f706d29b-bb51-4614-a248-3a6956741d35	CREATE	Department	006d417e-663f-46e3-89a8-1c59e71a2c3e	{"body": {"code": "SS", "name": "Shared Services", "description": "Shared Services Department"}, "query": {}, "params": {}}	{"url": "/api/v1/departments", "method": "POST"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-16 10:30:41.516+02	37510ceb-5798-4c70-b7f5-341a18aa99ec
cb186ae4-2c86-4f08-a2a2-425f334b2f2f	CREATE	Section	6b72e8dd-f8ee-4c2a-8e44-ea44e4794041	{"body": {"name": "Security", "description": "security section", "departmentId": "006d417e-663f-46e3-89a8-1c59e71a2c3e"}, "query": {}, "params": {}}	{"url": "/api/v1/sections", "method": "POST"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-16 10:31:40.153+02	37510ceb-5798-4c70-b7f5-341a18aa99ec
23c35779-152a-4b36-8608-b81056ff3c42	BULK_CREATE	Department	\N	{"body": {"departments": [{"code": "001", "name": "MINING TECHNICAL SERVICES", "description": "Mining technical services including geology, survey and planning"}, {"code": "002", "name": "LABORATORY", "description": "Laboratory services and testing"}, {"code": "003", "name": "PROCESSING", "description": "Processing plant operations"}, {"code": "004", "name": "SHARED SERVICES", "description": "Shared services including HR, IT, Security, Training, SHEQ"}, {"code": "005", "name": "HEAD OFFICE", "description": "Head office administration"}, {"code": "006", "name": "MAINTENANCE", "description": "Maintenance department including mechanical, electrical, civils"}, {"code": "007", "name": "MINING", "description": "Mining operations"}], "skipDuplicates": true}, "query": {}, "params": {}}	{"url": "/api/v1/departments/bulk-upload", "method": "POST"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-16 11:16:36.896+02	37510ceb-5798-4c70-b7f5-341a18aa99ec
fcacb9e7-ccec-426f-9108-70e896873a10	BULK_CREATE	Section	\N	{"body": {"sections": [{"name": "GEOLOGY", "department": "001", "description": "Geological services and exploration"}, {"name": "GEOTECHNICAL ENGINEERING", "department": "001", "description": "Geotechnical engineering services"}, {"name": "PLANNING", "department": "001", "description": "Mine planning and scheduling"}, {"name": "SURVEY", "department": "001", "description": "Survey and mapping services"}, {"name": "LABORATORY", "department": "002", "description": "Laboratory testing and analysis"}, {"name": "PROCESSING", "department": "003", "description": "Processing plant operations"}, {"name": "TAILS STORAGE FACILITY", "department": "003", "description": "Tailings storage facility operations"}, {"name": "ADMINISTRATION", "department": "004", "description": "Administrative services"}, {"name": "CSIR", "department": "004", "description": "CSIR related activities"}, {"name": "FINANCE", "department": "004", "description": "Financial services"}, {"name": "HUMAN RESOURCES", "department": "004", "description": "Human resources management"}, {"name": "I.T", "department": "004", "description": "Information technology services"}, {"name": "SECURITY", "department": "004", "description": "Security services"}, {"name": "SHEQ", "department": "004", "description": "Safety, Health, Environment and Quality"}, {"name": "SITE COORDINATION", "department": "004", "description": "Site coordination activities"}, {"name": "STORES", "department": "004", "description": "Stores and inventory management"}, {"name": "TRAINING", "department": "004", "description": "Training and development"}, {"name": "HEAD OFFICE", "department": "005", "description": "Head office operations"}, {"name": "CIVILS", "department": "006", "description": "Civil maintenance and construction"}, {"name": "ELECTRICAL", "department": "006", "description": "Electrical maintenance"}, {"name": "MECHANICAL", "department": "006", "description": "Mechanical maintenance"}, {"name": "MM PLANNING", "department": "006", "description": "Maintenance planning"}, {"name": "MOBILE WORKSHOP", "department": "006", "description": "Mobile workshop and field maintenance"}, {"name": "TAILS STORAGE FACILITY", "department": "006", "description": "TSF maintenance"}, {"name": "MINING", "department": "007", "description": "Mining operations"}], "skipDuplicates": true}, "query": {}, "params": {}}	{"url": "/api/v1/sections/bulk-upload", "method": "POST"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-16 11:23:42.181+02	37510ceb-5798-4c70-b7f5-341a18aa99ec
975c2624-259a-495f-bd3a-d5e4e5fe5a58	BULK_CREATE	Employee	\N	{"body": {"employees": [{"Code": "DG028", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MUZAVAZI", "Contract": "TERMINATED", "FirstName": "ALBERT", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG135", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "WIZIMANI", "Contract": "TERMINATED", "FirstName": "ADMIRE", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG505", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "CHIMHARE", "Contract": "TERMINATED", "FirstName": "RODRECK", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG508", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "NGWENYA", "Contract": "TERMINATED", "FirstName": "WILSHER", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG628", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "NHAMOYEBONDE", "Contract": "TERMINATED", "FirstName": "MUNYARADZI", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG631", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "CHAMBA", "Contract": "TERMINATED", "FirstName": "SILAS", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG635", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MKANDAWIRE", "Contract": "TERMINATED", "FirstName": "DARLISON", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG749", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MAKAVA", "Contract": "TERMINATED", "FirstName": "TINEVIMBO", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG579", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "MAZHAMBE", "Contract": "TERMINATED", "FirstName": "PARTSON", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG590", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "MAZHAMBE", "Contract": "TERMINATED", "FirstName": "TAWANDA", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG593", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "GUMBURA", "Contract": "TERMINATED", "FirstName": "PASSMORE", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG621", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "CHIPFUNDE", "Contract": "TERMINATED", "FirstName": "HILLARY", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG725", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "CHIVEREVERE", "Contract": "TERMINATED", "FirstName": "TAFADZWA", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG740", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "BOTE", "Contract": "TERMINATED", "FirstName": "TINOBONGA", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG741", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MATASVA", "Contract": "TERMINATED", "FirstName": "MITCHELL", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG746", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MACHEKERA", "Contract": "TERMINATED", "FirstName": "NICOLE", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG748", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "BOME", "Contract": "TERMINATED", "FirstName": "TANAKA", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG761", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MAZHAMBE", "Contract": "TERMINATED", "FirstName": "SHUMIRAI", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG763", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MUNYUKI", "Contract": "TERMINATED", "FirstName": "ANESU", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG784", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "GWATINETSA", "Contract": "TERMINATED", "FirstName": "EMMANUEL", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DGZ062", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "CHIRIGA", "Contract": "ACTIVE", "FirstName": "TONDERAI", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "LABORATORY", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ063", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "NDIMANDE", "Contract": "ACTIVE", "FirstName": "NOVUYO", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "LABORATORY", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ064", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "MURAIRWA", "Contract": "ACTIVE", "FirstName": "JANIEL ANDREW", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "LABORATORY", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ088", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "MATEWA", "Contract": "ACTIVE", "FirstName": "SANDRA", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "LABORATORY", "Nec/ Salaried": "SALARIED"}, {"Code": "DP166", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "SHAPURE", "Contract": "ACTIVE", "FirstName": "AUGUSTINE", "Job Title": "MINE ASSAYER", "Cost centre": "LABORATORY", "Nec/ Salaried": "SALARIED"}, {"Code": "DP198", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "HOKO", "Contract": "ACTIVE", "FirstName": "FARAI", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "LABORATORY", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ013", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "CHIDO", "Contract": "ACTIVE", "FirstName": "STANWELL", "Job Title": "CHARGEHAND BUILDERS", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP071", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "NYATI", "Contract": "ACTIVE", "FirstName": "AGRIA", "Job Title": "CARPENTER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP082", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "NYAMBALO", "Contract": "ACTIVE", "FirstName": "WILLARD", "Job Title": "CIVILS SUPERVISOR", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ011", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "KONDO", "Contract": "ACTIVE", "FirstName": "SIBONGILE", "Job Title": "ELECTRICIAN CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ031", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "CHAPARAPATA", "Contract": "ACTIVE", "FirstName": "JOHNSON", "Job Title": "ELECTRICIAN CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP073", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "MWENYE", "Contract": "ACTIVE", "FirstName": "GAUNJE", "Job Title": "SENIOR ELECTRICAL AND INSTRUMENTATION SUPT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP197", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "NCUBE", "Contract": "ACTIVE", "FirstName": "JOSEPH", "Job Title": "CHARGEHAND INSTRUMENTATION", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP213", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "GOTEKA", "Contract": "ACTIVE", "FirstName": "TINASHE", "Job Title": "JUNIOR ELECTRICAL ENGINEER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP218", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "JAKARASI", "Contract": "ACTIVE", "FirstName": "TRYMORE", "Job Title": "ELECTRICAL MANAGER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP226", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "SUMANI", "Contract": "ACTIVE", "FirstName": "TAMARA", "Job Title": "JUNIOR INSTRUMENTATION ENGINEER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP245", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "KUBVORUNO", "Contract": "ACTIVE", "FirstName": "HEBERT", "Job Title": "INSTRUMENTATION TECHNICIAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP282", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "MASAMBA", "Contract": "ACTIVE", "FirstName": "GODFREY", "Job Title": "ELECTRICIAN CLASS 2", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP294", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "NLEYA", "Contract": "ACTIVE", "FirstName": "PROSPER", "Job Title": "INSTRUMENTATION TECHNICAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP296", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "MARINGIRENI", "Contract": "ACTIVE", "FirstName": "NESBERT", "Job Title": "ELECTRICIAN CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP303", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "MOYO", "Contract": "ACTIVE", "FirstName": "LAWRENCE", "Job Title": "CHARGEHAND ELECTRICAL", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP331", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "KASEMBE", "Contract": "ACTIVE", "FirstName": "ALI", "Job Title": "ELECTRICIAN CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP353", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "MUKO", "Contract": "ACTIVE", "FirstName": "BLESSING", "Job Title": "INSTRUMENTATION TECHNICIAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP355", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "CHAKWIZIRA", "Contract": "ACTIVE", "FirstName": "FISHER", "Job Title": "ELECTRICIAN CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP356", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "CHUDU", "Contract": "ACTIVE", "FirstName": "COSTA", "Job Title": "ELECTRICIAN CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP357", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "LANGWANI", "Contract": "ACTIVE", "FirstName": "TALENT", "Job Title": "ELECTRICIAN CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP358", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "MAKAYA", "Contract": "ACTIVE", "FirstName": "GIFT", "Job Title": "ELECTRICIAN CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ018", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "SHERENI", "Contract": "ACTIVE", "FirstName": "LISIAS", "Job Title": "FITTER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ019", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "CHATAIRA", "Contract": "ACTIVE", "FirstName": "JOHN", "Job Title": "FITTER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ024", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MATARUTSE", "Contract": "ACTIVE", "FirstName": "AMBROSE", "Job Title": "DRY PLANT FOREMAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ061", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MOTLOGWA", "Contract": "ACTIVE", "FirstName": "MOLISA", "Job Title": "PLUMBER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ075", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MUKANDE", "Contract": "ACTIVE", "FirstName": "ELISHA", "Job Title": "FITTER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ091", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MAFAIROSI", "Contract": "ACTIVE", "FirstName": "ANTHONY", "Job Title": "FITTER CLASS 2", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP089", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MUTONGA", "Contract": "ACTIVE", "FirstName": "PETRO", "Job Title": "STRUCTURAL FITTING FOREMAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP119", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MTUTU", "Contract": "ACTIVE", "FirstName": "WARREN", "Job Title": "MAINTENANCE ENGINEER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP175", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "TONGERA", "Contract": "ACTIVE", "FirstName": "MISI", "Job Title": "BELTS MAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP200", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MWAZHA", "Contract": "ACTIVE", "FirstName": "ELIAS", "Job Title": "MECHANICAL MANAGER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP214", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MACHIMBIRIKE", "Contract": "ACTIVE", "FirstName": "TINASHE", "Job Title": "ASSISTANT MECHANICAL ENGINEER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP236", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MUDZAMIRI", "Contract": "ACTIVE", "FirstName": "TARIRO", "Job Title": "JUNIOR MECHANICAL ENGINEER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP254", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MAJUTA", "Contract": "ACTIVE", "FirstName": "KNOWLEDGE", "Job Title": "FITTER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP255", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MUTANDWA", "Contract": "ACTIVE", "FirstName": "TERRENCE", "Job Title": "CHARGEHAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP330", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MUGUDA", "Contract": "ACTIVE", "FirstName": "EVARISTO", "Job Title": "FITTER CLASS 2", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP351", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "EZALA", "Contract": "ACTIVE", "FirstName": "LOVEMORE", "Job Title": "CHARGE HAND FITTING WET PLANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP010", "Gender": "MALE", "SECTION": "MM PLANNING", "Surname": "MUPINDUKI", "Contract": "ACTIVE", "FirstName": "FARAI", "Job Title": "DRAUGHTSMAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP112", "Gender": "MALE", "SECTION": "MM PLANNING", "Surname": "STEVENAGE", "Contract": "ACTIVE", "FirstName": "JAMES", "Job Title": "MAINTENANCE PLANNER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP167", "Gender": "MALE", "SECTION": "MM PLANNING", "Surname": "MUSENGEZI", "Contract": "ACTIVE", "FirstName": "STANFORD", "Job Title": "MAINTENANCE MANAGER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP190", "Gender": "MALE", "SECTION": "MM PLANNING", "Surname": "MAGWAZA", "Contract": "ACTIVE", "FirstName": "AGNES", "Job Title": "PLANNING FOREMAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP237", "Gender": "MALE", "SECTION": "MM PLANNING", "Surname": "JESE", "Contract": "ACTIVE", "FirstName": "GAMUCHIRAI", "Job Title": "JUNIOR  PLANNING ENGINEER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ001", "Gender": "MALE", "SECTION": "MECHANICAL", "Surname": "CHALEKA", "Contract": "ACTIVE", "FirstName": "COURAGE", "Job Title": "BOILERMAKER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ003", "Gender": "MALE", "SECTION": "MECHANICAL", "Surname": "JIRI", "Contract": "ACTIVE", "FirstName": "GODKNOWS", "Job Title": "BOILERMAKER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ010", "Gender": "MALE", "SECTION": "MECHANICAL", "Surname": "GADZE", "Contract": "ACTIVE", "FirstName": "ADMIRE", "Job Title": "CHARGEHAND BOILERMAKERS", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ016", "Gender": "MALE", "SECTION": "MECHANICAL", "Surname": "MHLANGA", "Contract": "ACTIVE", "FirstName": "NDABEZINHLE", "Job Title": "BOILERMAKER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ020", "Gender": "MALE", "SECTION": "MECHANICAL", "Surname": "CHENGO", "Contract": "ACTIVE", "FirstName": "DANIEL", "Job Title": "WELDER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ025", "Gender": "MALE", "SECTION": "MECHANICAL", "Surname": "ZINYAMA", "Contract": "ACTIVE", "FirstName": "SHEPHERD", "Job Title": "WELDER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ027", "Gender": "MALE", "SECTION": "MECHANICAL", "Surname": "MKWAIKI", "Contract": "ACTIVE", "FirstName": "ROBERT", "Job Title": "BOILER MAKER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ036", "Gender": "MALE", "SECTION": "MECHANICAL", "Surname": "KAPFUNDE", "Contract": "ACTIVE", "FirstName": "ARTHUR", "Job Title": "BOILERMAKER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ039", "Gender": "MALE", "SECTION": "MECHANICAL", "Surname": "NEZUNGAI", "Contract": "ACTIVE", "FirstName": "GEORGE", "Job Title": "BOILERMAKER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ041", "Gender": "MALE", "SECTION": "MECHANICAL", "Surname": "ALFONSO", "Contract": "ACTIVE", "FirstName": "OWEN", "Job Title": "CODED WELDER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ050", "Gender": "MALE", "SECTION": "MECHANICAL", "Surname": "TICHARWA", "Contract": "ACTIVE", "FirstName": "GABRIEL", "Job Title": "BOILERMAKER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ054", "Gender": "MALE", "SECTION": "MECHANICAL", "Surname": "CHINODA", "Contract": "ACTIVE", "FirstName": "COSTEN", "Job Title": "WELDER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ077", "Gender": "MALE", "SECTION": "MECHANICAL", "Surname": "MWASANGA", "Contract": "ACTIVE", "FirstName": "RAMUS", "Job Title": "BOILERMAKER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ079", "Gender": "MALE", "SECTION": "MECHANICAL", "Surname": "MANDIZHA", "Contract": "ACTIVE", "FirstName": "CLAYTON", "Job Title": "BOILERMAKER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP072", "Gender": "MALE", "SECTION": "MECHANICAL", "Surname": "MANJONDA", "Contract": "ACTIVE", "FirstName": "GIBSON", "Job Title": "FABRICATION FOREMAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ017", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "NGWENYA", "Contract": "ACTIVE", "FirstName": "ARTASHASTAH", "Job Title": "PLUMBER CLASS 2", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ028", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MUTODZA", "Contract": "ACTIVE", "FirstName": "MUNASHE", "Job Title": "RIGGER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ029", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "TAGA-DAGA", "Contract": "ACTIVE", "FirstName": "REUBEN", "Job Title": "BOILERMAKER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ084", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MANDIGORA", "Contract": "ACTIVE", "FirstName": "AARON", "Job Title": "PLUMBER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP174", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "NJANJENI", "Contract": "ACTIVE", "FirstName": "EMMANUEL", "Job Title": "RIGGER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP201", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "HANHART", "Contract": "ACTIVE", "FirstName": "JOHN", "Job Title": "TRANSPORT & SERVICES MANAGER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP244", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MHARIWA", "Contract": "ACTIVE", "FirstName": "ENOCK", "Job Title": "TRANSPORT AND SERVICES CHARGE HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP297", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "JEREMIAH", "Contract": "ACTIVE", "FirstName": "KOROFATI", "Job Title": "PLUMBER CLASS 2", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP298", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MHEMBERE", "Contract": "ACTIVE", "FirstName": "WALTER", "Job Title": "PLUMBER CLASS 2", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP300", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "JIM", "Contract": "ACTIVE", "FirstName": "PROSPER", "Job Title": "AUTO ELECTRICIAN CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP301", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "NYAMUROWA", "Contract": "ACTIVE", "FirstName": "VICTOR", "Job Title": "DIESEL PLANT FITTER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP322", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "TEMBO", "Contract": "ACTIVE", "FirstName": "KARL", "Job Title": "RIGGER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP323", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "GUNDA", "Contract": "ACTIVE", "FirstName": "KASSAN", "Job Title": "RIGGER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP354", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "NYONI", "Contract": "ACTIVE", "FirstName": "PETER", "Job Title": "AUTO ELECTRICIAN CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP363", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MTEKI", "Contract": "ACTIVE", "FirstName": "TANAKA", "Job Title": "DIESEL PLANT FITTER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP212", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "SAUNGWEME", "Contract": "ACTIVE", "FirstName": "TINASHE", "Job Title": "CIVIL ENGINEER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP305", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "USHE", "Contract": "ACTIVE", "FirstName": "TAFADZWA", "Job Title": "CIVIL TECHNICIAN TSF", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP156", "Gender": "MALE", "SECTION": "MINING", "Surname": "CHUMA", "Contract": "ACTIVE", "FirstName": "OLIVER SIMBA", "Job Title": "MINING ENGINEER", "Cost centre": "MINING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP159", "Gender": "MALE", "SECTION": "MINING", "Surname": "CHAWIRA", "Contract": "ACTIVE", "FirstName": "DESMOND", "Job Title": "SENIOR MINING ENGINEER", "Cost centre": "MINING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP165", "Gender": "MALE", "SECTION": "MINING", "Surname": "MAZANA", "Contract": "ACTIVE", "FirstName": "TAWEDZEGWA", "Job Title": "SENIOR PIT SUPERINTENDENT", "Cost centre": "MINING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP178", "Gender": "MALE", "SECTION": "MINING", "Surname": "NCUBE", "Contract": "ACTIVE", "FirstName": "STANLEY", "Job Title": "PIT SUPERINTENDENT", "Cost centre": "MINING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP234", "Gender": "MALE", "SECTION": "MINING", "Surname": "KATANDA", "Contract": "ACTIVE", "FirstName": "COBURN", "Job Title": "MINING MANAGER", "Cost centre": "MINING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP274", "Gender": "MALE", "SECTION": "MINING", "Surname": "MASONA", "Contract": "ACTIVE", "FirstName": "RYAN", "Job Title": "JUNIOR PIT SUPERINTENDENT", "Cost centre": "MINING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP359", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "ZENGENI", "Contract": "ACTIVE", "FirstName": "ELAINE", "Job Title": "EXPLORATION GEOLOGICAL TECHNICIAN", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP360", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "SAUNGWEME", "Contract": "ACTIVE", "FirstName": "LUCKSTONE", "Job Title": "EXPLORATION PROJECT MANAGER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP361", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "MUDZINGWA", "Contract": "ACTIVE", "FirstName": "TINASHE", "Job Title": "EXPLORATION GEOLOGIST", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP117", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "GEREMA", "Contract": "ACTIVE", "FirstName": "NYASHA", "Job Title": "DATABASE ADMINISTRATOR", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP163", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "LESAYA", "Contract": "ACTIVE", "FirstName": "WISDOM", "Job Title": "GEOLOGICAL TECHNICIAN", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP181", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "MUONEKA", "Contract": "ACTIVE", "FirstName": "BENEFIT", "Job Title": "RESIDENT GEOLOGIST", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP186", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "PORE", "Contract": "ACTIVE", "FirstName": "TATENDA", "Job Title": "JUNIOR GEOLOGIST", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP235", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "MATEVEKE", "Contract": "ACTIVE", "FirstName": "MARTIN", "Job Title": "GEOLOGIST", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP265", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "CHAKAWA", "Contract": "ACTIVE", "FirstName": "KUDAKWASHE", "Job Title": "GEOLOGICAL TECHNICIAN", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP139", "Gender": "MALE", "SECTION": "GEOTECHNICAL ENGINEERING", "Surname": "LULA", "Contract": "ACTIVE", "FirstName": "GUNUKA LUZIBO", "Job Title": "GEOTECHNICAL ENGINEERING TECHNICIAN", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP158", "Gender": "MALE", "SECTION": "GEOTECHNICAL ENGINEERING", "Surname": "GUNYANJA", "Contract": "ACTIVE", "FirstName": "TAKUDZWA", "Job Title": "GEOTECHNICAL ENGINEERING TECHNICIAN", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP306", "Gender": "MALE", "SECTION": "GEOTECHNICAL ENGINEERING", "Surname": "NYAMANDE", "Contract": "ACTIVE", "FirstName": "PARDON", "Job Title": "GEOTECHNICAL ENGINEER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP110", "Gender": "MALE", "SECTION": "PLANNING ", "Surname": "NEMADIRE", "Contract": "ACTIVE", "FirstName": "TINASHE", "Job Title": "MINE PLANNING SUPERINTENDENT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP128", "Gender": "MALE", "SECTION": "PLANNING ", "Surname": "ZVARAYA", "Contract": "ACTIVE", "FirstName": "MICHAEL", "Job Title": "MINING TECHNICAL SERVICES MANAGER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP157", "Gender": "MALE", "SECTION": "PLANNING ", "Surname": "TARWIREI", "Contract": "ACTIVE", "FirstName": "TINASHE", "Job Title": "JUNIOR MINE PLANNING ENGINEER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP219", "Gender": "MALE", "SECTION": "PLANNING ", "Surname": "NYIRENDA", "Contract": "ACTIVE", "FirstName": "ROBERT", "Job Title": "MINE PLANNING ENGINEER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP097", "Gender": "MALE", "SECTION": "SURVEY", "Surname": "MKANDLA", "Contract": "ACTIVE", "FirstName": "MZAMO", "Job Title": "SURVEYOR", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP100", "Gender": "MALE", "SECTION": "SURVEY", "Surname": "NGULUBE", "Contract": "ACTIVE", "FirstName": "COLLETTE", "Job Title": "CHIEF SURVEYOR", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP215", "Gender": "MALE", "SECTION": "SURVEY", "Surname": "MUJAJATI", "Contract": "ACTIVE", "FirstName": "GAMUCHIRAI", "Job Title": "SURVEYOR", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP266", "Gender": "MALE", "SECTION": "SURVEY", "Surname": "MUSHONGA", "Contract": "ACTIVE", "FirstName": "HILARY", "Job Title": "SENIOR SURVEYOR", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ090", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "NOKO", "Contract": "ACTIVE", "FirstName": "TSEPO", "Job Title": "METALLURGICAL TECHNICIAN", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP251", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "NGIRANDI", "Contract": "ACTIVE", "FirstName": "BRIDGET", "Job Title": "METALLURGICAL TECHNICIAN", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP131", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "CHIKEREMA", "Contract": "ACTIVE", "FirstName": "VICTOR", "Job Title": "PLANT PRODUCTION SUPERINTENDENT", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP136", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "SITHOLE", "Contract": "ACTIVE", "FirstName": "STEWARD", "Job Title": "METALLURGICAL SUPERINTENDENT", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP137", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "CHIBAMU", "Contract": "ACTIVE", "FirstName": "GERALDINE", "Job Title": "PROCESS CONTROL SUPERVISOR", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP161", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "NYABANGA", "Contract": "ACTIVE", "FirstName": "THELMA", "Job Title": "METALLURGICAL ENGINEER", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP188", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "CHIORESO", "Contract": "ACTIVE", "FirstName": "ABGAIL", "Job Title": "PROCESS CONTROL METALLURGIST", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP228", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "MAGANGA", "Contract": "ACTIVE", "FirstName": "RUTENDO", "Job Title": "PLANT LABORATORY METALLURGIST", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP240", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "MAPOSAH", "Contract": "ACTIVE", "FirstName": "MICHELLE", "Job Title": "PROCESS CONTROL METALLURGIST", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP307", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "NCUBE", "Contract": "ACTIVE", "FirstName": "PRINCESS", "Job Title": "PROCESS CONTROL METALLURGIST", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP332", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "DUBE", "Contract": "ACTIVE", "FirstName": "BUKHOSI", "Job Title": "PLANT LABORATORY TECHNICIAN", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP334", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "KHOWA", "Contract": "ACTIVE", "FirstName": "LOUIS", "Job Title": "PROCESSING SYSTEMS ANALYST", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP335", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "MAZVIYO", "Contract": "ACTIVE", "FirstName": "RUMBIDZAI", "Job Title": "PLANT LABORATORY MET TECHNICIAN", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP125", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "JERE", "Contract": "ACTIVE", "FirstName": "ROBERT", "Job Title": "PLANT SUPERVISOR", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP134", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "ZINHU", "Contract": "ACTIVE", "FirstName": "TANYARADZWA", "Job Title": "PLANT SUPERVISOR", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP187", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "MUREVERWI", "Contract": "ACTIVE", "FirstName": "LIONEL", "Job Title": "PLANT SUPERVISOR", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP320", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "MUNODAWAFA", "Contract": "ACTIVE", "FirstName": "OBERT", "Job Title": "PROCESSING MANAGER", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP339", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "MUSAPINGURA", "Contract": "ACTIVE", "FirstName": "VISION", "Job Title": "METALLURGICAL ENGINEER", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP129", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "KHUPE", "Contract": "ACTIVE", "FirstName": "MALVIN", "Job Title": "TSF SUPERVISOR", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP252", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MANDIZIBA", "Contract": "ACTIVE", "FirstName": "JOHANNES", "Job Title": "TSF SUPERVISOR", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP299", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MAHACHI", "Contract": "ACTIVE", "FirstName": "CHAKANETSA", "Job Title": "PLANT MANAGER", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP108", "Gender": "MALE", "SECTION": "ADMINISTRATION", "Surname": "BANDA", "Contract": "ACTIVE", "FirstName": "NELSON", "Job Title": "GENERAL MANAGER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP284", "Gender": "MALE", "SECTION": "ADMINISTRATION", "Surname": "SICHAKALA", "Contract": "ACTIVE", "FirstName": "GIVEMORE", "Job Title": "SHARED SERVICES MANAGER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP325", "Gender": "MALE", "SECTION": "CSIR", "Surname": "SIATULUBE", "Contract": "ACTIVE", "FirstName": "ANYWAY", "Job Title": "BOME HOUSES CONSTRUCTION SUPERVISOR", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP169", "Gender": "MALE", "SECTION": "ADMINISTRATION", "Surname": "MADADANGOMA", "Contract": "ACTIVE", "FirstName": "VIMBAI", "Job Title": "BUSINESS IMPROVEMENT MANAGER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP243", "Gender": "MALE", "SECTION": "ADMINISTRATION", "Surname": "MAYUNI", "Contract": "ACTIVE", "FirstName": "JOHN", "Job Title": "BUSINESS IMPROVEMENT OFFICER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP065", "Gender": "MALE", "SECTION": "CSIR", "Surname": "KHUMALO", "Contract": "ACTIVE", "FirstName": "LINDELWE", "Job Title": "COMMUNITY RELATIONS COORDINATOR", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP241", "Gender": "MALE", "SECTION": "CSIR", "Surname": "HUNGOIDZA", "Contract": "ACTIVE", "FirstName": "RUGARE", "Job Title": "ASSISTANT COMMUNITY RELATIONS OFFICER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP258", "Gender": "MALE", "SECTION": "CSIR", "Surname": "TAVENHAVE", "Contract": "ACTIVE", "FirstName": "DAPHNE", "Job Title": "COMMUNITY RELATIONS OFFICER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP040", "Gender": "MALE", "SECTION": "FINANCE", "Surname": "SAWAYA", "Contract": "ACTIVE", "FirstName": "ALEXIO", "Job Title": "BOOK KEEPER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP087", "Gender": "MALE", "SECTION": "FINANCE", "Surname": "KUHAMBA", "Contract": "ACTIVE", "FirstName": "DUNCAN", "Job Title": "FINANCE & ADMINISTRATION MANAGER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP191", "Gender": "MALE", "SECTION": "FINANCE", "Surname": "CHANDAVENGERWA", "Contract": "ACTIVE", "FirstName": "ELLEN", "Job Title": "ASSISTANT ACCOUNTANT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP145", "Gender": "MALE", "SECTION": "HUMAN RESOURCES", "Surname": "TINAGO", "Contract": "ACTIVE", "FirstName": "TINAGO", "Job Title": "HUMAN CAPITAL SUPPORT SERVICES MANAGER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP164", "Gender": "MALE", "SECTION": "HUMAN RESOURCES", "Surname": "MUWAIRI", "Contract": "ACTIVE", "FirstName": "BENJAMIN", "Job Title": "HR ADMINISTRATOR", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP216", "Gender": "MALE", "SECTION": "HUMAN RESOURCES", "Surname": "SAMURIWO", "Contract": "ACTIVE", "FirstName": "CARLTON", "Job Title": "HUMAN RESOURCES ASSISTANT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP333", "Gender": "MALE", "SECTION": "HUMAN RESOURCES", "Surname": "MAGOMANA", "Contract": "ACTIVE", "FirstName": "FREEDMORE", "Job Title": "HUMAN RESOURCES SUPERINTENDENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP130", "Gender": "MALE", "SECTION": "I.T", "Surname": "MUKWEBWA", "Contract": "ACTIVE", "FirstName": "NEIL", "Job Title": "IT OFFICER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP140", "Gender": "MALE", "SECTION": "I.T", "Surname": "GWINYAI", "Contract": "ACTIVE", "FirstName": "POUND", "Job Title": "IT SUPERINTENDENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP329", "Gender": "MALE", "SECTION": "I.T", "Surname": "DANDAVARE", "Contract": "ACTIVE", "FirstName": "FELIX", "Job Title": "SUPPORT TECHNICIAN", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP336", "Gender": "MALE", "SECTION": "STORES", "Surname": "CHINAKIDZWA", "Contract": "ACTIVE", "FirstName": "DERICK", "Job Title": "ISSUING OFFICER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP242", "Gender": "MALE", "SECTION": "STORES", "Surname": "CHIGARIRO", "Contract": "ACTIVE", "FirstName": "ASHLEY", "Job Title": "ASSISTANT EXPEDITER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP312", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "MATANDARE", "Contract": "ACTIVE", "FirstName": "SIMBARASHE", "Job Title": "SECURITY OFFICER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP313", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "WERENGANI", "Contract": "ACTIVE", "FirstName": "JANUARY", "Job Title": "SECURITY MANAGER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP084", "Gender": "MALE", "SECTION": "SHEQ", "Surname": "MUNYENYIWA", "Contract": "ACTIVE", "FirstName": "NYASHA", "Job Title": "SHE MANAGER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP148", "Gender": "MALE", "SECTION": "SHEQ", "Surname": "ZHOU", "Contract": "ACTIVE", "FirstName": "ELVIS", "Job Title": "SHE OFFICER PLANT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP162", "Gender": "MALE", "SECTION": "SHEQ", "Surname": "BASU", "Contract": "ACTIVE", "FirstName": "REST", "Job Title": "ENVIRONMENTAL & HYGIENE OFFICER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP193", "Gender": "MALE", "SECTION": "SHEQ", "Surname": "MURIMBA", "Contract": "ACTIVE", "FirstName": "NYASHA", "Job Title": "SHE ADMINISTRATOR", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP247", "Gender": "MALE", "SECTION": "SHEQ", "Surname": "MBOFANA", "Contract": "ACTIVE", "FirstName": "TINASHE", "Job Title": "SHEQ SUPERINTENDENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP249", "Gender": "MALE", "SECTION": "SHEQ", "Surname": "MARAMBANYIKA", "Contract": "ACTIVE", "FirstName": "TAWANDA", "Job Title": "SHEQ AND ENVIRONMENTAL OFFICER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP253", "Gender": "MALE", "SECTION": "SHEQ", "Surname": "TAHWA", "Contract": "ACTIVE", "FirstName": "TAFADZWA", "Job Title": "SHE ASSISTANT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP053", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "CHIRIMANI", "Contract": "ACTIVE", "FirstName": "OWEN", "Job Title": "DRIVER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP085", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "MUDUKA", "Contract": "ACTIVE", "FirstName": "ITAI", "Job Title": "CHEF", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP150", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "SENZERE", "Contract": "ACTIVE", "FirstName": "ARTLEY", "Job Title": "SITE COORDINATION OFFICER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP328", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "YONA", "Contract": "ACTIVE", "FirstName": "SIMON", "Job Title": "CATERING AND HOUSEKEEPING SUPERVISOR", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP041", "Gender": "MALE", "SECTION": "STORES", "Surname": "WAMBE", "Contract": "ACTIVE", "FirstName": "IGNATIOUS", "Job Title": "STORES CONTROLLER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP091", "Gender": "MALE", "SECTION": "STORES", "Surname": "DENGENDE", "Contract": "ACTIVE", "FirstName": "TENDAI", "Job Title": "STORES MANAGER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP172", "Gender": "MALE", "SECTION": "STORES", "Surname": "MADONDO", "Contract": "ACTIVE", "FirstName": "MUNYARADZI", "Job Title": "ISSUING OFFICER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP173", "Gender": "MALE", "SECTION": "STORES", "Surname": "HAMANDISHE", "Contract": "ACTIVE", "FirstName": "VIOLET", "Job Title": "STORES CONTROLLER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP246", "Gender": "MALE", "SECTION": "STORES", "Surname": "MOYO", "Contract": "ACTIVE", "FirstName": "MESULI", "Job Title": "RECEIVING OFFICER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP267", "Gender": "MALE", "SECTION": "STORES", "Surname": "BALENI", "Contract": "ACTIVE", "FirstName": "RAYNARD", "Job Title": "PYLOG ADMINISTRATOR", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP233", "Gender": "MALE", "SECTION": "TRAINING ", "Surname": "MUSADEMBA", "Contract": "ACTIVE", "FirstName": "GAYNOR", "Job Title": "GRADUATE TRAINEE", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP238", "Gender": "MALE", "SECTION": "TRAINING ", "Surname": "CHAPUNZA", "Contract": "ACTIVE", "FirstName": "IRVIN", "Job Title": "GRADUATE TRAINEE METALLURGY", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP239", "Gender": "MALE", "SECTION": "TRAINING ", "Surname": "MAZARA", "Contract": "ACTIVE", "FirstName": "SOLOMON", "Job Title": "GRADUATE TRAINEE METALLURGY", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP273", "Gender": "MALE", "SECTION": "TRAINING ", "Surname": "MAGADU", "Contract": "ACTIVE", "FirstName": "TAFADZWA", "Job Title": "GRADUATE TRAINEE", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP278", "Gender": "MALE", "SECTION": "TRAINING ", "Surname": "GOMBEDZA", "Contract": "ACTIVE", "FirstName": "LISA", "Job Title": "ASSAY LABORATORY TECHNICIAN TRAINEE", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP283", "Gender": "MALE", "SECTION": "TRAINING ", "Surname": "MAGOMO", "Contract": "ACTIVE", "FirstName": "SAMUEL", "Job Title": "SHEQ GRADUATE TRAINEE", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP288", "Gender": "MALE", "SECTION": "TRAINING ", "Surname": "MUKOVA", "Contract": "ACTIVE", "FirstName": "SAVIOUS", "Job Title": "GRADUATE TRAINEE MINING", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP289", "Gender": "MALE", "SECTION": "TRAINING ", "Surname": "DOBBIE", "Contract": "ACTIVE", "FirstName": "TERRENCE", "Job Title": "GRADUATE TRAINEE MINING", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP290", "Gender": "MALE", "SECTION": "TRAINING ", "Surname": "MAVURU", "Contract": "ACTIVE", "FirstName": "CHANTELLE", "Job Title": "GRADUATE TRAINEE MINING", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP291", "Gender": "MALE", "SECTION": "TRAINING ", "Surname": "SAUNYAMA", "Contract": "ACTIVE", "FirstName": "ANDY", "Job Title": "GRADUATE TRAINEE METALLURGY", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP292", "Gender": "MALE", "SECTION": "TRAINING ", "Surname": "NYIKA", "Contract": "ACTIVE", "FirstName": "TANAKA", "Job Title": "GRADUATE TRAINEE METALLURGY", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP293", "Gender": "MALE", "SECTION": "TRAINING ", "Surname": "MLAMBO", "Contract": "ACTIVE", "FirstName": "PRIMROSE", "Job Title": "GRADUATE TRAINEE METALLURGY", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP311", "Gender": "MALE", "SECTION": "TRAINING ", "Surname": "MOYO", "Contract": "ACTIVE", "FirstName": "NYASHA", "Job Title": "TRAINING AND DEVELOPMENT OFFICER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP324", "Gender": "MALE", "SECTION": "TRAINING ", "Surname": "MUPAMBA", "Contract": "ACTIVE", "FirstName": "ZIVANAI", "Job Title": "GT MECHANICAL ENGINEERING", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP352", "Gender": "MALE", "SECTION": "TRAINING ", "Surname": "TSORAI", "Contract": "ACTIVE", "FirstName": "TONDERAI", "Job Title": "GRADUATE TRAINEE ACCOUNTING", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DG223", "Gender": "MALE", "SECTION": "HEAD OFFICE", "Surname": "NYAWANGA", "Contract": "ACTIVE", "FirstName": "INNOCENT", "Job Title": "WAREHOUSE ASSISTANT", "Cost centre": "HEAD OFFICE", "Nec/ Salaried": "NEC"}, {"Code": "DG224", "Gender": "MALE", "SECTION": "HEAD OFFICE", "Surname": "NGOROSHA", "Contract": "ACTIVE", "FirstName": "LOVEMORE", "Job Title": "WAREHOUSE ASSISTANT", "Cost centre": "HEAD OFFICE", "Nec/ Salaried": "NEC"}, {"Code": "DG478", "Gender": "MALE", "SECTION": "HEAD OFFICE", "Surname": "NYAHOKO", "Contract": "ACTIVE", "FirstName": "PHIBION", "Job Title": "GENERAL HAND", "Cost centre": "HEAD OFFICE", "Nec/ Salaried": "NEC"}, {"Code": "DG627", "Gender": "MALE", "SECTION": "HEAD OFFICE", "Surname": "SANGARE", "Contract": "ACTIVE", "FirstName": "MIRIAM", "Job Title": "OFFICE CLEANER", "Cost centre": "HEAD OFFICE", "Nec/ Salaried": "NEC"}, {"Code": "DG006", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "CHATAMBUDZIKI", "Contract": "ACTIVE", "FirstName": "GEORGE", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG014", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "DIRE", "Contract": "ACTIVE", "FirstName": "GANIZANI", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG015", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "GREYA", "Contract": "ACTIVE", "FirstName": "NEVER", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG045", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "GANDIWA", "Contract": "ACTIVE", "FirstName": "MICHAEL", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG077", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "CHIKUNI", "Contract": "ACTIVE", "FirstName": "TADIWANASHE", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG080", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "CHANDIWANA", "Contract": "ACTIVE", "FirstName": "RAPHAEL", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG081", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "MASIKINYE", "Contract": "ACTIVE", "FirstName": "TAPIWA", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG149", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "KADZIMA", "Contract": "ACTIVE", "FirstName": "DOCTOR", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG157", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "CHIGODHO", "Contract": "ACTIVE", "FirstName": "CURRENCY", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG249", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "NYANKUNI", "Contract": "ACTIVE", "FirstName": "TONDERAI", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG250", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "MASIYA", "Contract": "ACTIVE", "FirstName": "MALVERN", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG251", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "CHIORESE", "Contract": "ACTIVE", "FirstName": "TALENT", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG252", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "CHIBANDA", "Contract": "ACTIVE", "FirstName": "NGONI", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG253", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "VENGERE", "Contract": "ACTIVE", "FirstName": "TRUST", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG254", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "BOX", "Contract": "ACTIVE", "FirstName": "RACCELL", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG255", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "MAKOSA", "Contract": "ACTIVE", "FirstName": "PALMER", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG277", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "MARISA", "Contract": "ACTIVE", "FirstName": "CLINTON MUNYARADZI", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG284", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "CHIKOVO", "Contract": "ACTIVE", "FirstName": "TAFADZWA", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG297", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "KAVENDA", "Contract": "ACTIVE", "FirstName": "TAKUNDA", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG301", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "MARIMO", "Contract": "ACTIVE", "FirstName": "STANLEY", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG357", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "CHIRIMANI", "Contract": "ACTIVE", "FirstName": "CHENGETAI", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG358", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "MARATA", "Contract": "ACTIVE", "FirstName": "LINCORN", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG428", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "NHAMOYEBONDE", "Contract": "ACTIVE", "FirstName": "MICHAEL", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG600", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "MUKUMBAREZA", "Contract": "ACTIVE", "FirstName": "PROSPER", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG059", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "NHEMACHENA", "Contract": "ACTIVE", "FirstName": "ELWED", "Job Title": "BUILDER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG147", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "MUFENGI", "Contract": "ACTIVE", "FirstName": "EZRA", "Job Title": "SEMI- SKILLED BUILDER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG019", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "MADZVITI", "Contract": "ACTIVE", "FirstName": "FRANK", "Job Title": "ELECTRICIAN ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG034", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "NYARIRI", "Contract": "ACTIVE", "FirstName": "COLLINS", "Job Title": "SEMI- SKILLED ELECTRICIAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG104", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "KAMANGE", "Contract": "ACTIVE", "FirstName": "ERNEST", "Job Title": "ELECTRICIAN ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG105", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "KAZUNGA", "Contract": "ACTIVE", "FirstName": "TENDEKAI", "Job Title": "ELECTRICIAN ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG106", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "KASINGANETE", "Contract": "ACTIVE", "FirstName": "PERFORMANCE", "Job Title": "ELECTRICIAN ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG317", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "MAJONGA", "Contract": "ACTIVE", "FirstName": "GODFREY", "Job Title": "ELECTRICAL ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG379", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "PAGAN'A", "Contract": "ACTIVE", "FirstName": "TINEI", "Job Title": "ELECTRICAL ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG578", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "NGWENYA", "Contract": "ACTIVE", "FirstName": "TAKUNDA", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG581", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "CHIMANIKIRE", "Contract": "ACTIVE", "FirstName": "SYDNEY", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG587", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "CHAPONDA", "Contract": "ACTIVE", "FirstName": "MEKELANI", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG605", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "HOVE", "Contract": "ACTIVE", "FirstName": "STUDY", "Job Title": "INSTRUMENTS TECHS ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG644", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "MAPOPE", "Contract": "ACTIVE", "FirstName": "KUDZAI", "Job Title": "INSTRUMENTATIONS ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG647", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "RAVU", "Contract": "ACTIVE", "FirstName": "REGIS", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG650", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "DENHERE", "Contract": "ACTIVE", "FirstName": "JOHN", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG654", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "GWETA", "Contract": "ACTIVE", "FirstName": "TANYARADZWA", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG655", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "MAZVAZVA", "Contract": "ACTIVE", "FirstName": "NOMORE", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG707", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "CHIANGWA", "Contract": "ACTIVE", "FirstName": "CHARMAINE", "Job Title": "INSTRUMENTATIONS ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG732", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "TYRMORE", "Contract": "ACTIVE", "FirstName": "NGOCHO", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG739", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "CHAPONDA", "Contract": "ACTIVE", "FirstName": "TROUBLE", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG029", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MUZVONDIWA", "Contract": "ACTIVE", "FirstName": "BRIGHTON", "Job Title": "FITTERS ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG124", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "JINYA", "Contract": "ACTIVE", "FirstName": "TINOTENDA", "Job Title": "FITTER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG192", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MUNENGIWA", "Contract": "ACTIVE", "FirstName": "SIMON", "Job Title": "FITTERS ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG242", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "KANYERA", "Contract": "ACTIVE", "FirstName": "CARLOS", "Job Title": "FITTER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG349", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MUGUTI", "Contract": "ACTIVE", "FirstName": "DAVID", "Job Title": "FITTER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG359", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MACHACHA", "Contract": "ACTIVE", "FirstName": "ADMIRE", "Job Title": "FITTER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG392", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "CHIMANGA", "Contract": "ACTIVE", "FirstName": "EDMORE", "Job Title": "FITTER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG604", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MATOROFA", "Contract": "ACTIVE", "FirstName": "NYASHA", "Job Title": "FITTER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG614", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "CHIGWADA", "Contract": "ACTIVE", "FirstName": "ENOCK", "Job Title": "PLUMBER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG706", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MAPFUMO", "Contract": "ACTIVE", "FirstName": "NGONIDZASHE", "Job Title": "FITTERS ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG335", "Gender": "MALE", "SECTION": "PLANNING", "Surname": "BANGANYIKA", "Contract": "ACTIVE", "FirstName": "TAFADZWA DYLAN", "Job Title": "PLANNING CLERK", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG479", "Gender": "MALE", "SECTION": "PLANNING", "Surname": "ZHOU", "Contract": "ACTIVE", "FirstName": "SHARON", "Job Title": "PLANNING CLERK", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG535", "Gender": "MALE", "SECTION": "PLANNING", "Surname": "GWAMATSA", "Contract": "ACTIVE", "FirstName": "HANDSON", "Job Title": "CLASS 2 DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG603", "Gender": "MALE", "SECTION": "PLANNING", "Surname": "NYANDORO", "Contract": "ACTIVE", "FirstName": "TAKESURE", "Job Title": "STANDBY DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG021", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MARUNGISA", "Contract": "ACTIVE", "FirstName": "DOUGLAS", "Job Title": "BOILERMAKER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG022", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MARUNGISA", "Contract": "ACTIVE", "FirstName": "MUCHENJE", "Job Title": "BOILERMAKER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG051", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MUROYIWA", "Contract": "ACTIVE", "FirstName": "LAMECK", "Job Title": "SCAFFOLDER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG064", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "KAJARI", "Contract": "ACTIVE", "FirstName": "AUSTIN", "Job Title": "SEMI SKILLED PAINTER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG066", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "TANDI", "Contract": "ACTIVE", "FirstName": "TAPFUMANEI", "Job Title": "SCAFFOLDER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG176", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MAODZWA", "Contract": "ACTIVE", "FirstName": "PADDINGTON F", "Job Title": "BOILERMAKER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG177", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "GOROMONZI", "Contract": "ACTIVE", "FirstName": "EMMANUEL", "Job Title": "BOILERMAKER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG182", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "CHITIMA", "Contract": "ACTIVE", "FirstName": "CLEMENCE", "Job Title": "BOILERMAKER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG246", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MASUKU", "Contract": "ACTIVE", "FirstName": "SHINGIRAI", "Job Title": "BOILERMAKER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG303", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MAPIRA", "Contract": "ACTIVE", "FirstName": "AARON", "Job Title": "SCAFFOLDER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG351", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MUDAVANHU", "Contract": "ACTIVE", "FirstName": "STEADY", "Job Title": "BOILERMAKER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG495", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "NGWENYA", "Contract": "ACTIVE", "FirstName": "THEMBINKOSI", "Job Title": "BOILERMAKERS ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG529", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MHONYERA", "Contract": "ACTIVE", "FirstName": "GEORGE", "Job Title": "SEMI SKILLED PAINTER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG594", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "SIBANDA", "Contract": "ACTIVE", "FirstName": "TACHIONA", "Job Title": "FITTER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG656", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "CHITUMBURA", "Contract": "ACTIVE", "FirstName": "TAKUNDA", "Job Title": "BOILERMAKER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG008", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "CHIGODHO", "Contract": "ACTIVE", "FirstName": "DAVID", "Job Title": "TRACTOR DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG024", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MUTIKITSI", "Contract": "ACTIVE", "FirstName": "ROBERT", "Job Title": "UD TRUCK DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG041", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MAZHAMBE", "Contract": "ACTIVE", "FirstName": "GOOD", "Job Title": "TLB OPERATOR", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG047", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "LAVU", "Contract": "ACTIVE", "FirstName": "THOMAS", "Job Title": "EXCAVATOR OPERATOR", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG087", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MKANDAWIRE", "Contract": "ACTIVE", "FirstName": "FRIDAY", "Job Title": "FRONT END LOADER OPERATOR", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG096", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "ZVENYIKA", "Contract": "ACTIVE", "FirstName": "TANAKA", "Job Title": "CRANE OPERATOR", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG100", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "CHAKASARA", "Contract": "ACTIVE", "FirstName": "WORKERS", "Job Title": "TRACTOR DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG101", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "CEPHAS", "Contract": "ACTIVE", "FirstName": "PASSMORE", "Job Title": "ASSISTANT PLUMBER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG108", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "NGOMA", "Contract": "ACTIVE", "FirstName": "BRIGHTON", "Job Title": "FRONT END LOADER OPERATOR", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG125", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "CHATIZA", "Contract": "ACTIVE", "FirstName": "PAUL", "Job Title": "PLUMBERS ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG218", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "KAMAMBO", "Contract": "ACTIVE", "FirstName": "TINEI", "Job Title": "BUS DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG243", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "NDIRA", "Contract": "ACTIVE", "FirstName": "PISIRAI", "Job Title": "PLUMBERS ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG312", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MUGOCHI", "Contract": "ACTIVE", "FirstName": "BRENDO", "Job Title": "WORKSHOP ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG334", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MAPETESE", "Contract": "ACTIVE", "FirstName": "MAZVITA", "Job Title": "BUS DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG405", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MARIKANO", "Contract": "ACTIVE", "FirstName": "ISAAC", "Job Title": "EXCAVATOR OPERATOR", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG446", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "NTALA", "Contract": "ACTIVE", "FirstName": "KUDAKWASHE", "Job Title": "CRANE OPERATOR", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG447", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MUROMBO", "Contract": "ACTIVE", "FirstName": "PAIMETY", "Job Title": "CRANE OPERATOR", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG490", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "PHIRI", "Contract": "ACTIVE", "FirstName": "BHEU", "Job Title": "UD CLASS 2 DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG491", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "KATSANDE", "Contract": "ACTIVE", "FirstName": "SAMUAEL", "Job Title": "STANDBY DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG526", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "CHIPENGO", "Contract": "ACTIVE", "FirstName": "LEONARD", "Job Title": "BUS DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG534", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "CHIWOCHA", "Contract": "ACTIVE", "FirstName": "STANLEY", "Job Title": "MOBIL CRANE OPERATOR", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG538", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MUZHONA", "Contract": "ACTIVE", "FirstName": "ONISMO", "Job Title": "SEMI SKILLED PLUMBER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG547", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MUTWIRA", "Contract": "ACTIVE", "FirstName": "STEVEN", "Job Title": "BUS DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG548", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "DZIMIRI", "Contract": "ACTIVE", "FirstName": "EVEREST", "Job Title": "BUS DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG573", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MAJENGWA", "Contract": "ACTIVE", "FirstName": "EDMORE", "Job Title": "TLB OPERATOR", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG574", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "ZISO", "Contract": "ACTIVE", "FirstName": "SIMBARASHE", "Job Title": "TELEHANDLER OPERATOR", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG694", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "ZODZIWA", "Contract": "ACTIVE", "FirstName": "MAVUTO", "Job Title": "BUS DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG708", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "JIMU", "Contract": "ACTIVE", "FirstName": "TONDERAI", "Job Title": "FEL OPERATOR", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG719", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "CHIFAMBA", "Contract": "ACTIVE", "FirstName": "COURAGE", "Job Title": "WORKSHOP CLERK", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG736", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "DZIMBANHETE", "Contract": "ACTIVE", "FirstName": "MARTIN", "Job Title": "CLASS 1 BUS DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG737", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "JAKACHIRA", "Contract": "ACTIVE", "FirstName": "WISDOM", "Job Title": "CLASS 1 BUS DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG738", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "NYABADZA", "Contract": "ACTIVE", "FirstName": "JONATHAN", "Job Title": "CLASS 1 BUS DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG758", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "GWESHE", "Contract": "ACTIVE", "FirstName": "DOUBT", "Job Title": "TELEHANDLER OPERATOR", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG778", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MAHLENGEZANA", "Contract": "ACTIVE", "FirstName": "STANLEY", "Job Title": "EXCAVATOR OPERATOR", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG098", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "KURUDZA", "Contract": "ACTIVE", "FirstName": "MONEYWORK", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG129", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "MANHANGA", "Contract": "ACTIVE", "FirstName": "WILBERT", "Job Title": "SEMI-SKILLED BUILDER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG145", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "KURUDZA", "Contract": "ACTIVE", "FirstName": "FARAI", "Job Title": "BUILDER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG159", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "CHIGODHO", "Contract": "ACTIVE", "FirstName": "SIMBARASHE", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG160", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "MUPUNGA", "Contract": "ACTIVE", "FirstName": "MACDONALD", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG258", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "MURINGAYI", "Contract": "ACTIVE", "FirstName": "FIDELIS", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG261", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "MBURUMA", "Contract": "ACTIVE", "FirstName": "EPHRAIM", "Job Title": "SEMI-SKILLED BUILDER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG263", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "MARERWA", "Contract": "ACTIVE", "FirstName": "OBINISE", "Job Title": "SEMI-SKILLED BUILDER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG272", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "MUJERI", "Contract": "ACTIVE", "FirstName": "GARIKAI", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG275", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "RUNZIRA", "Contract": "ACTIVE", "FirstName": "DOMINIC", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG292", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "JAIROS", "Contract": "ACTIVE", "FirstName": "RAYMOND", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG294", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "KAKORE", "Contract": "ACTIVE", "FirstName": "CRY", "Job Title": "SEMI-SKILLED BUILDER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG318", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "WEBSTER", "Contract": "ACTIVE", "FirstName": "JOSHUA", "Job Title": "SEMI-SKILLED BUILDER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG319", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "FRANCIS", "Contract": "ACTIVE", "FirstName": "MAZVANARA", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG325", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "FURAWU", "Contract": "ACTIVE", "FirstName": "KENNY", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG329", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "MAGUSVI", "Contract": "ACTIVE", "FirstName": "TAFADZWA", "Job Title": "SEMI- SKILLED CARPENTER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG331", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "MUZAVA", "Contract": "ACTIVE", "FirstName": "ADMIRE", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG387", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "CHAKUINGA", "Contract": "ACTIVE", "FirstName": "HOWARD", "Job Title": "SEMI-SKILLED BUILDER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG398", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "THOM", "Contract": "ACTIVE", "FirstName": "SIMBARASHE", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG406", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "VARETA", "Contract": "ACTIVE", "FirstName": "TIGHT", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG484", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "NYAMAYARO", "Contract": "ACTIVE", "FirstName": "CLEVER", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG487", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "MUNYARADZI", "Contract": "ACTIVE", "FirstName": "STANLEY", "Job Title": "BUILDER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG504", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "PFUPA", "Contract": "ACTIVE", "FirstName": "PROSPERITY", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG507", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "SIMUDZIRAYI", "Contract": "ACTIVE", "FirstName": "LOVEMORE", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG512", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "CHIKOYA", "Contract": "ACTIVE", "FirstName": "VITALIS", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG537", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "CHIKOYA", "Contract": "ACTIVE", "FirstName": "NIGEL", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG542", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "MBUNDURE", "Contract": "ACTIVE", "FirstName": "EMETI", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG563", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "CHIPENGO", "Contract": "ACTIVE", "FirstName": "PARTSON", "Job Title": "SEMI- SKILLED BUILDER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG564", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "MAKAYI", "Contract": "ACTIVE", "FirstName": "IGNATIOUS", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG613", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "KAMBEWU", "Contract": "ACTIVE", "FirstName": "HARMONY", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG659", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "CHIYANGE", "Contract": "ACTIVE", "FirstName": "GIVEMORE", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG693", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "CHIDHAWU", "Contract": "ACTIVE", "FirstName": "RANGANAI", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG709", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "MUCHEMERANWA", "Contract": "ACTIVE", "FirstName": "JOSHUA", "Job Title": "SCAFFOLDERS ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG710", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "MURONZI", "Contract": "ACTIVE", "FirstName": "EVANS", "Job Title": "SEMI SKILLED BUILDER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG102", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "KADZIMA", "Contract": "ACTIVE", "FirstName": "RICHMORE", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG130", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "KAZUNGA", "Contract": "ACTIVE", "FirstName": "ITAYI", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG154", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MANHANGA", "Contract": "ACTIVE", "FirstName": "STANLEY", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG186", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MAHOVO", "Contract": "ACTIVE", "FirstName": "COURAGE", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG193", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MUSIWA", "Contract": "ACTIVE", "FirstName": "EFTON", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG219", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MUZA", "Contract": "ACTIVE", "FirstName": "CHAMUNORWA", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG226", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "NYAMUKWATURA", "Contract": "ACTIVE", "FirstName": "SIMON", "Job Title": "TEAM LEADER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG326", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "GANDIWA", "Contract": "ACTIVE", "FirstName": "OWEN", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG339", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MAVHUNGA", "Contract": "ACTIVE", "FirstName": "PAUL", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG347", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "KASEKE", "Contract": "ACTIVE", "FirstName": "DYLLAN", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG380", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MANYAMBA", "Contract": "ACTIVE", "FirstName": "SIWASHIRO", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG383", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MUSORA", "Contract": "ACTIVE", "FirstName": "TRUST", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG386", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MATAI", "Contract": "ACTIVE", "FirstName": "TAFADZWA", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG426", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "PHIRI", "Contract": "ACTIVE", "FirstName": "NAPHTALI", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG427", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MAZHAMBE", "Contract": "ACTIVE", "FirstName": "MATHEW", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG439", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MAGWAZA", "Contract": "ACTIVE", "FirstName": "GEORGE", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG445", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "NHAMOYEBONDE", "Contract": "ACTIVE", "FirstName": "KELVIN", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG450", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "HARUMBWI", "Contract": "ACTIVE", "FirstName": "TINASHE", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG451", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MUKWENYA", "Contract": "ACTIVE", "FirstName": "VIRIMAI ANESU", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG492", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "CHAMONYONGA", "Contract": "ACTIVE", "FirstName": "WHITEHEAD", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG493", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "SIREWU", "Contract": "ACTIVE", "FirstName": "CARLINGTON", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG494", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "ARUTURA", "Contract": "ACTIVE", "FirstName": "WELLINGTON", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG496", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "KAMU", "Contract": "ACTIVE", "FirstName": "EDSON", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG497", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "NGULUWE", "Contract": "ACTIVE", "FirstName": "MALVERN", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG498", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MUNANGA", "Contract": "ACTIVE", "FirstName": "BRADELY", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG513", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "KATURA", "Contract": "ACTIVE", "FirstName": "TONDERAI", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG515", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "GOROMONZI", "Contract": "ACTIVE", "FirstName": "TAFADZWA", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG517", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "TEMBO", "Contract": "ACTIVE", "FirstName": "GIFT", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG536", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MOYO", "Contract": "ACTIVE", "FirstName": "THABANI", "Job Title": "DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG624", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "RUSWA", "Contract": "ACTIVE", "FirstName": "PANASHE", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG629", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "NGIRAZI", "Contract": "ACTIVE", "FirstName": "LAMECK", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG630", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "DANDAWA", "Contract": "ACTIVE", "FirstName": "EVIDENCE", "Job Title": "STANDBY DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG632", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "CHIGODO", "Contract": "ACTIVE", "FirstName": "ANYWAY", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG633", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MUDHINDO", "Contract": "ACTIVE", "FirstName": "LIBERTY", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG637", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "FUSIRA", "Contract": "ACTIVE", "FirstName": "REMEMBER", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG657", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MASHIKI", "Contract": "ACTIVE", "FirstName": "ALBERT", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG702", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "TOGAREPI", "Contract": "ACTIVE", "FirstName": "JABULANI", "Job Title": "CLASS 4 DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG733", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "CHIRIMA", "Contract": "ACTIVE", "FirstName": "TATENDA", "Job Title": "ELECTRICIAN ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG757", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "GOZHO", "Contract": "ACTIVE", "FirstName": "ZVIKOMBORERO", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG291", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "GUNJA", "Contract": "ACTIVE", "FirstName": "LEAN", "Job Title": "CORE SHED ATTENDANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG004", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "BHOBHO", "Contract": "ACTIVE", "FirstName": "COLLEN", "Job Title": "TRAINEE GEO TECH", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG013", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "CHITUMBA", "Contract": "ACTIVE", "FirstName": "BIGGIE", "Job Title": "TRAINEE GEO TECH", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG017", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "KARISE", "Contract": "ACTIVE", "FirstName": "KENNETH", "Job Title": "TRAINEE GEO TECH", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG067", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "MAPORISA", "Contract": "ACTIVE", "FirstName": "CHARLES", "Job Title": "SAMPLER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG069", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "CHIDORA", "Contract": "ACTIVE", "FirstName": "PRUDENCE", "Job Title": "SAMPLER RC DRILLING", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG153", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "MAPOSA", "Contract": "ACTIVE", "FirstName": "SHELLINGTON", "Job Title": "SAMPLER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG208", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "CHIMANIKIRE", "Contract": "ACTIVE", "FirstName": "VENGAI", "Job Title": "SAMPLER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG268", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "TAULO", "Contract": "ACTIVE", "FirstName": "ANHTONY", "Job Title": "SAMPLER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG270", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "NDORO", "Contract": "ACTIVE", "FirstName": "TINASHE", "Job Title": "SAMPLER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG280", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "CHAPUKA", "Contract": "ACTIVE", "FirstName": "TAKAWIRA", "Job Title": "SAMPLER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG282", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "CHIKORE", "Contract": "ACTIVE", "FirstName": "ANDERSON", "Job Title": "SAMPLER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG298", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "MADZIVANZIRA", "Contract": "ACTIVE", "FirstName": "NEBIA", "Job Title": "SAMPLER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG302", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "CHINYAMA", "Contract": "ACTIVE", "FirstName": "LINDSAY", "Job Title": "DATA CAPTURE CLERK", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG313", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "GUNI", "Contract": "ACTIVE", "FirstName": "DARLINGTON", "Job Title": "SAMPLER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG321", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "MASHONGANYIKA", "Contract": "ACTIVE", "FirstName": "NIGEL", "Job Title": "SAMPLER (RC DRILLING)", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG381", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "NYANHETE", "Contract": "ACTIVE", "FirstName": "ARCHBORD", "Job Title": "SAMPLER RC DRILLING", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG418", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "NHAURIRO", "Contract": "ACTIVE", "FirstName": "ENIFA", "Job Title": "SAMPLER RC DRILLING", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG453", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "MUCHAZIVEPI", "Contract": "ACTIVE", "FirstName": "MALVERN", "Job Title": "SAMPLER RC DRILLING", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG500", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "MUGARI", "Contract": "ACTIVE", "FirstName": "ABEL", "Job Title": "SAMPLER RC DRILLING", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG501", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "NGOCHO", "Contract": "ACTIVE", "FirstName": "TATENDA", "Job Title": "DATA CAPTURE CLERK", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG502", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "NZVAURA", "Contract": "ACTIVE", "FirstName": "GRACIOUS", "Job Title": "SAMPLER RC DRILLING", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG651", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "NHAMOYEBONDE", "Contract": "ACTIVE", "FirstName": "NYASHA", "Job Title": "SAMPLER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG666", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "MUROIWA", "Contract": "ACTIVE", "FirstName": "MUNYARADZI", "Job Title": "RC SAMPLER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG048", "Gender": "MALE", "SECTION": "SURVEY ", "Surname": "KADZIMA", "Contract": "ACTIVE", "FirstName": "POWERMAN", "Job Title": "SURVEY ASSISTANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG288", "Gender": "MALE", "SECTION": "SURVEY ", "Surname": "CHIZANGA", "Contract": "ACTIVE", "FirstName": "TAURAI", "Job Title": "SURVEY ASSISTANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG300", "Gender": "MALE", "SECTION": "SURVEY ", "Surname": "MASONDO", "Contract": "ACTIVE", "FirstName": "AUSTIN", "Job Title": "SURVEY ASSISTANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG338", "Gender": "MALE", "SECTION": "SURVEY ", "Surname": "NCUBE", "Contract": "ACTIVE", "FirstName": "THABANI", "Job Title": "SURVEY ASSISTANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG416", "Gender": "MALE", "SECTION": "SURVEY ", "Surname": "MAZHAMBE", "Contract": "ACTIVE", "FirstName": "KUDAKWASHE", "Job Title": "SURVEY ASSISTANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG435", "Gender": "MALE", "SECTION": "SURVEY ", "Surname": "DAWA", "Contract": "ACTIVE", "FirstName": "LIBERTY", "Job Title": "SURVEY ASSISTANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG648", "Gender": "MALE", "SECTION": "SURVEY ", "Surname": "MARARA", "Contract": "ACTIVE", "FirstName": "DOMINIC", "Job Title": "SURVEY ASSISTANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG649", "Gender": "MALE", "SECTION": "SURVEY ", "Surname": "SIBANDA", "Contract": "ACTIVE", "FirstName": "VALENTINE", "Job Title": "DRIVER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG730", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "DHAMBUZA", "Contract": "ACTIVE", "FirstName": "KUDZAISHE", "Job Title": "CORE SHED ATTENDANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG770", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "CHINZOU", "Contract": "ACTIVE", "FirstName": "PANASHE", "Job Title": "DRILL RIG ASSISTANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG771", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "CHIKUKWA", "Contract": "ACTIVE", "FirstName": "ANTHONY", "Job Title": "DRILL RIG ASSISTANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG772", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "MUTSIKIWA", "Contract": "ACTIVE", "FirstName": "JEMITINOS", "Job Title": "CORE SHED ATTENDANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG773", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "JAVANGWE", "Contract": "ACTIVE", "FirstName": "REJOICE", "Job Title": "DRILL RIG ASSISTANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG774", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "MUNYENYIWA", "Contract": "ACTIVE", "FirstName": "TATENDA", "Job Title": "DRILL RIG ASSISTANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG775", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "MAVHURA", "Contract": "ACTIVE", "FirstName": "TONDERAI", "Job Title": "DRILL RIG ASSISTANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG776", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "MASVANHISE", "Contract": "ACTIVE", "FirstName": "PRINCE", "Job Title": "DRILL RIG ASSISTANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG112", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MAPULAZI", "Contract": "ACTIVE", "FirstName": "MANUEL", "Job Title": "CIL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG200", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KASEKE", "Contract": "ACTIVE", "FirstName": "NYASHA", "Job Title": "RELIEF CREW ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG370", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "NYASULO", "Contract": "ACTIVE", "FirstName": "BESON", "Job Title": "CIL OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG403", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIHWAKU", "Contract": "ACTIVE", "FirstName": "DADIRAI", "Job Title": "GENERAL ASSISTANT CIL", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG480", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIBHAGU", "Contract": "ACTIVE", "FirstName": "THELMA", "Job Title": "GENERAL PLANT ATTENDANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG521", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "WANJOWA", "Contract": "ACTIVE", "FirstName": "MAXWELL", "Job Title": "CIL OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG551", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "GUDO", "Contract": "ACTIVE", "FirstName": "LAWRENCIOUS", "Job Title": "GENERAL PLANT ATTENDANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG247", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KADAIRA", "Contract": "ACTIVE", "FirstName": "HILTON", "Job Title": "ELUTION & REAGENTS ASSIST", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG371", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "PITCHES", "Contract": "ACTIVE", "FirstName": "UMALI", "Job Title": "ELUTION OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG373", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "PARADZAYI", "Contract": "ACTIVE", "FirstName": "EMMANUEL", "Job Title": "ELUTION OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG375", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MUZIRA", "Contract": "ACTIVE", "FirstName": "FARAI", "Job Title": "ELUTION OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG420", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIKOYA", "Contract": "ACTIVE", "FirstName": "MELODY", "Job Title": "RELIEF CREW ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG466", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MANYANGE", "Contract": "ACTIVE", "FirstName": "VENGESAI", "Job Title": "ELUTION ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG011", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHINGUWA", "Contract": "ACTIVE", "FirstName": "AUGUSTINE", "Job Title": "BALLMILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG052", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MUSIIWA", "Contract": "ACTIVE", "FirstName": "DUNGISANI", "Job Title": "HOUSE KEEPING ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG183", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIZANGA", "Contract": "ACTIVE", "FirstName": "KUDZAI", "Job Title": "HOUSE KEEPING ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG211", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MURANDA", "Contract": "ACTIVE", "FirstName": "NATHANIEL", "Job Title": "HOUSE KEEPING ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG213", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "NGWENYA", "Contract": "ACTIVE", "FirstName": "SAFASONGE", "Job Title": "LEAVE RELIEF CREW", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG461", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KATUMBA", "Contract": "ACTIVE", "FirstName": "ASHWIN", "Job Title": "LEAVE RELIEF CREW", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG485", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KADZVITI", "Contract": "ACTIVE", "FirstName": "LAWRENCE", "Job Title": "RELIEF CREW ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG486", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "BAKACHEZA", "Contract": "ACTIVE", "FirstName": "ELASTO", "Job Title": "GENERAL MILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG514", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MANHANGA", "Contract": "ACTIVE", "FirstName": "LOVEJOY", "Job Title": "HOUSE KEEPING ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG568", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "DZIMBIRI", "Contract": "ACTIVE", "FirstName": "CARLTON", "Job Title": "GENERAL PLANT ATTENDANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG570", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KADZIMA", "Contract": "ACTIVE", "FirstName": "FURTHERSTEP", "Job Title": "HOUSE KEEPING ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG589", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MUBAIWA", "Contract": "ACTIVE", "FirstName": "NOBERT", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG597", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "TINANI", "Contract": "ACTIVE", "FirstName": "TENDAI", "Job Title": "HOUSE KEEPING ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG598", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIGODO", "Contract": "ACTIVE", "FirstName": "BEHAVE", "Job Title": "BALLMILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG672", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MASERE", "Contract": "ACTIVE", "FirstName": "DARLINGTON", "Job Title": "PLUMBER ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG287", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIRUME", "Contract": "ACTIVE", "FirstName": "LATIFAN", "Job Title": "METALLURGICAL CLERK", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG583", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "ZAMANI", "Contract": "ACTIVE", "FirstName": "NYASHA", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG703", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "TAPOMWA", "Contract": "ACTIVE", "FirstName": "TAFADZWA", "Job Title": "PLANT LAB ATTENDANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG063", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "SHERENI", "Contract": "ACTIVE", "FirstName": "PETROS", "Job Title": "GENERAL MILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG072", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KASIMO", "Contract": "ACTIVE", "FirstName": "ADMIRE", "Job Title": "TAILINGS STORAGE FACILITY ASSIST", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG194", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "NHAMOYEBONDE", "Contract": "ACTIVE", "FirstName": "ANTONY", "Job Title": "BALLMILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG195", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "NYAZIKA", "Contract": "ACTIVE", "FirstName": "SELBORNE CHENGETAI", "Job Title": "BALLMILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG205", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MASANGO", "Contract": "ACTIVE", "FirstName": "DONALD", "Job Title": "BALLMILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG266", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHESANGO", "Contract": "ACTIVE", "FirstName": "LIBERTY", "Job Title": "TAILINGS STORAGE FACILITY ASSIST", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG279", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "BRIAN", "Contract": "ACTIVE", "FirstName": "LAMECK", "Job Title": "BALLMILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG327", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "NYIKADZINO", "Contract": "ACTIVE", "FirstName": "WELLINGTON", "Job Title": "HOUSE KEEPING ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG333", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "GOVHA", "Contract": "ACTIVE", "FirstName": "BELIEVE", "Job Title": "BALLMILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG336", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "NYIKADZINO", "Contract": "ACTIVE", "FirstName": "CLEMENCE KURAUONE", "Job Title": "BALLMILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG345", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "BGWANYA", "Contract": "ACTIVE", "FirstName": "TARUVINGA", "Job Title": "BALLMILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG353", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "GONDO", "Contract": "ACTIVE", "FirstName": "MAXWELL", "Job Title": "BALLMILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG374", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MAGWENZI", "Contract": "ACTIVE", "FirstName": "ANYWAY", "Job Title": "MILL OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG376", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIYANDO", "Contract": "ACTIVE", "FirstName": "SHADRECK", "Job Title": "MILL OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG401", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIPATO", "Contract": "ACTIVE", "FirstName": "FARAI", "Job Title": "MILL OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG539", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIRIMUJIRI", "Contract": "ACTIVE", "FirstName": "KELVIN", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG541", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KARAMBWE", "Contract": "ACTIVE", "FirstName": "ELISHA", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG546", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MGUQUKA", "Contract": "ACTIVE", "FirstName": "NKOSIYABO", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG010", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIMUTU", "Contract": "ACTIVE", "FirstName": "JOFFREY", "Job Title": "BALLMILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG030", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "NGONI", "Contract": "ACTIVE", "FirstName": "ELISHA", "Job Title": "PRIMARY CRUSHER OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG079", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KAKONO", "Contract": "ACTIVE", "FirstName": "DAIROD", "Job Title": "PRIMARY CRUSHER OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG131", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MUZHONA", "Contract": "ACTIVE", "FirstName": "GRACIOUS", "Job Title": "PRIMARY CRUSHER ATTENDANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG134", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHARAMBIRA", "Contract": "ACTIVE", "FirstName": "GAINMORE", "Job Title": "PRIMARY CRUSHER ATTENDANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG199", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "LAPKEN", "Contract": "ACTIVE", "FirstName": "KENNETH", "Job Title": "PRIMARY CRUSHER ATTENDANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG276", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "ZILAKA", "Contract": "ACTIVE", "FirstName": "SOLOMON", "Job Title": "PRIMARY CRUSHER ATTENDANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG278", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "BOTE", "Contract": "ACTIVE", "FirstName": "TERRENCE", "Job Title": "PRIMARY CRUSHING OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG293", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KAHUMWE", "Contract": "ACTIVE", "FirstName": "DAVIES", "Job Title": "PRIMARY CRUSHER ATTENDANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG742", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KAISI", "Contract": "ACTIVE", "FirstName": "JAMES", "Job Title": "THICKENER OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG743", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHANYUKA", "Contract": "ACTIVE", "FirstName": "ANDREW", "Job Title": "THICKENER OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG744", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MKANDAWIRE", "Contract": "ACTIVE", "FirstName": "DIVASON", "Job Title": "THICKENER OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG722", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MUNYORO", "Contract": "ACTIVE", "FirstName": "NEHEMIAH", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG035", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "PHIRI", "Contract": "ACTIVE", "FirstName": "ENOCK", "Job Title": "HOUSE KEEPING ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG074", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIHOKO", "Contract": "ACTIVE", "FirstName": "CYRUS", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG377", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "GWATA", "Contract": "ACTIVE", "FirstName": "TINASHE", "Job Title": "REAGENTS & SMELTING CONTROLLER", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG457", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIDEMO", "Contract": "ACTIVE", "FirstName": "AGGRIPPA", "Job Title": "REAGENTS & SMELTING ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG058", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MUDIWA", "Contract": "ACTIVE", "FirstName": "ALBERT", "Job Title": "GENERAL SECONDARY & TERTIARY CRUSHING ASSIST", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG142", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MATAMA", "Contract": "ACTIVE", "FirstName": "MCNELL", "Job Title": "GENERAL SECONDARY & TERTIARY CRUSHING ASSIST", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG143", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "NZVAURA", "Contract": "ACTIVE", "FirstName": "ADDLIGHT", "Job Title": "SECONDARY & TERTIARY CRUSHER OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG181", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHITANHAMAPIRA", "Contract": "ACTIVE", "FirstName": "JACOB", "Job Title": "GENERAL SECONDARY & TERTIARY CRUSHING ASSIST", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG184", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KUGOTSI", "Contract": "ACTIVE", "FirstName": "HAMLET", "Job Title": "SECONDARY & TERTIARY CRUSHER OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG188", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MARIME", "Contract": "ACTIVE", "FirstName": "FOSTER", "Job Title": "SECONDARY & TERTIARY CRUSHER OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG237", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHANETSA", "Contract": "ACTIVE", "FirstName": "PRAISE K", "Job Title": "GENERAL MILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG281", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIGWADA", "Contract": "ACTIVE", "FirstName": "FORGET", "Job Title": "GENERAL SECONDARY & TERTIARY CRUSHING ASSIST", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG355", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MAPURANGA", "Contract": "ACTIVE", "FirstName": "TATENDA", "Job Title": "GENERAL SECONDARY & TERTIARY CRUSHING ASSIST", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG003", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "BHANDA", "Contract": "ACTIVE", "FirstName": "BHANDASON", "Job Title": "TAILINGS STORAGE FACILITY OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG036", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "PHIRI", "Contract": "ACTIVE", "FirstName": "GIVEMORE", "Job Title": "TAILINGS STORAGE FACILITY OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG065", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "RUNZIRA", "Contract": "ACTIVE", "FirstName": "KUDAKWASHE", "Job Title": "TAILINGS STORAGE FACILITY OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG071", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MAPIRA", "Contract": "ACTIVE", "FirstName": "ALBERT", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG103", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MUTAYI", "Contract": "ACTIVE", "FirstName": "FIDELIS", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG127", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "BUNGU", "Contract": "ACTIVE", "FirstName": "LEONARD", "Job Title": "GENERAL MILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG128", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KAVINGA", "Contract": "ACTIVE", "FirstName": "FRIDAY", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG133", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KUMBONJE", "Contract": "ACTIVE", "FirstName": "LAMECK", "Job Title": "GENERAL HAND", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG144", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "TAULO", "Contract": "ACTIVE", "FirstName": "NOEL", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG146", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MUNETSI", "Contract": "ACTIVE", "FirstName": "ELISHA", "Job Title": "BALLMILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG156", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KOMBONI", "Contract": "ACTIVE", "FirstName": "MAKOMBORERO", "Job Title": "TAILINGS STORAGE FACILITY ASSIST", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG189", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MARIMO", "Contract": "ACTIVE", "FirstName": "ELIAS", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG285", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIMANIKIRE", "Contract": "ACTIVE", "FirstName": "COSMAS", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG296", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KASEKE", "Contract": "ACTIVE", "FirstName": "TAKUDZWA", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG340", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MACHAKARI", "Contract": "ACTIVE", "FirstName": "AMOS", "Job Title": "TEAM LEADER", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG343", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KUSIKWENYU", "Contract": "ACTIVE", "FirstName": "STACIOUS", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG394", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "NHAUCHURU", "Contract": "ACTIVE", "FirstName": "PRINCE", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG433", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MUKWENYA", "Contract": "ACTIVE", "FirstName": "TAWANDA", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG503", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KAZUNGA", "Contract": "ACTIVE", "FirstName": "RICHARD", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG506", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "JACK", "Contract": "ACTIVE", "FirstName": "COASTER", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG509", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIGODHO", "Contract": "ACTIVE", "FirstName": "MILTON", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG511", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "TAMBUDZA", "Contract": "ACTIVE", "FirstName": "WISE", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG639", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MARAMBA", "Contract": "ACTIVE", "FirstName": "ELVIS", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG640", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "PARWARINGIRA", "Contract": "ACTIVE", "FirstName": "TINOTENDA", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG641", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MAKREYA", "Contract": "ACTIVE", "FirstName": "TAFADZWA", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG664", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MUFUMBIRA", "Contract": "ACTIVE", "FirstName": "TENDEKAI", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG717", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIHLABA", "Contract": "ACTIVE", "FirstName": "TANAKA", "Job Title": "GENERAL PLANT ATTENDANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG718", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MAVESERE", "Contract": "ACTIVE", "FirstName": "TANAKA", "Job Title": "GENERAL PLANT ATTENDANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG132", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "NYAMAVABVU", "Contract": "ACTIVE", "FirstName": "KELVIN KUDAKWASHE", "Job Title": "CCTV OPERATOR", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG221", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "CHITIKI", "Contract": "ACTIVE", "FirstName": "MARGARET", "Job Title": "CCTV OPERATOR", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG419", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "CHIFWAFWA", "Contract": "ACTIVE", "FirstName": "AUDREY", "Job Title": "CCTV OPERATOR", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG434", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "BENNY", "Contract": "ACTIVE", "FirstName": "CHONDE", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG476", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "VELLEM", "Contract": "ACTIVE", "FirstName": "NIXON", "Job Title": "CCTV OPERATOR", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG530", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "MAGURA", "Contract": "ACTIVE", "FirstName": "TONGAI", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG545", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "GUNJA", "Contract": "ACTIVE", "FirstName": "SYLVESTER", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG571", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "KUGOTSI", "Contract": "ACTIVE", "FirstName": "CHRISTOPHER", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG580", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "KAZUNGA", "Contract": "ACTIVE", "FirstName": "SIMBARASHE", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG588", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "MBUNDURE", "Contract": "ACTIVE", "FirstName": "SINCEWELL", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG591", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "MAZHAMBE", "Contract": "ACTIVE", "FirstName": "IRVINE", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG620", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "CHAPANDA", "Contract": "ACTIVE", "FirstName": "TADIWANASHE", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG652", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "MBEREKO", "Contract": "ACTIVE", "FirstName": "LYTON", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG720", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "REVAI", "Contract": "ACTIVE", "FirstName": "EDMORE", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG723", "Gender": "MALE", "SECTION": "SHEQ", "Surname": "NATANI", "Contract": "ACTIVE", "FirstName": "BIANCAH", "Job Title": "FIRST AID TRAINER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG049", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "CHIKOYA", "Contract": "ACTIVE", "FirstName": "PHILLIP", "Job Title": "HANDYMAN", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG050", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "CHIKOYA", "Contract": "ACTIVE", "FirstName": "MARK", "Job Title": "WELFARE WORKER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG090", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "CHIGWENJERE", "Contract": "ACTIVE", "FirstName": "TANATSA", "Job Title": "COOK", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG091", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "CHIMBUMU", "Contract": "ACTIVE", "FirstName": "VINCENT", "Job Title": "COOK", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG093", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "CHITIKI", "Contract": "ACTIVE", "FirstName": "MASS", "Job Title": "TEAM LEADER HOUSEKEEPING", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG094", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "CHIDANGURO", "Contract": "ACTIVE", "FirstName": "GLADYS", "Job Title": "HOUSEKEEPER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG095", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "MUKANDAVANHU", "Contract": "ACTIVE", "FirstName": "RANGANAI", "Job Title": "LAUNDRY ATTENDANT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG099", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "BUNGU", "Contract": "ACTIVE", "FirstName": "JIMMINIC", "Job Title": "TEAM LEADER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG180", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "CHIMANIKIRE", "Contract": "ACTIVE", "FirstName": "TAFIRENYIKA", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG206", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "CHIDENYIKA", "Contract": "ACTIVE", "FirstName": "GUESFORD", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG236", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "BUNGU", "Contract": "ACTIVE", "FirstName": "SILENT", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG290", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "GARINGA", "Contract": "ACTIVE", "FirstName": "CHRISTOPHER", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG364", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "MAZHAMBE", "Contract": "ACTIVE", "FirstName": "RICHMORE", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG389", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "KAPIYA", "Contract": "ACTIVE", "FirstName": "SILENT", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG399", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "MANDIVAVARIRA", "Contract": "ACTIVE", "FirstName": "LUWESI", "Job Title": "HOUSEKEEPER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG400", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "CHINYAMA", "Contract": "ACTIVE", "FirstName": "GETRUDE", "Job Title": "HOUSEKEEPER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG436", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "JACK", "Contract": "ACTIVE", "FirstName": "ELIZARY", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG454", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "MUSHONGA", "Contract": "ACTIVE", "FirstName": "CLARA", "Job Title": "LAUNDRY ATTENDANT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG458", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "JENGENI", "Contract": "ACTIVE", "FirstName": "SHARON", "Job Title": "HOUSEKEEPER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG459", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "SITHOLE", "Contract": "ACTIVE", "FirstName": "LILY", "Job Title": "COOK", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG460", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "GWANDE", "Contract": "ACTIVE", "FirstName": "KURAUONE", "Job Title": "COOK", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG462", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "CHIMBAMBO", "Contract": "ACTIVE", "FirstName": "SIMBARASHE", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG463", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "NYAMBO", "Contract": "ACTIVE", "FirstName": "ANGELINE", "Job Title": "HOUSEKEEPER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG464", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "MAHASO", "Contract": "ACTIVE", "FirstName": "MOREBLESSING", "Job Title": "LAUNDRY ATTENDANT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG518", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "GAUKA", "Contract": "ACTIVE", "FirstName": "TRUSTER", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG549", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "MANYIKA", "Contract": "ACTIVE", "FirstName": "LIANA", "Job Title": "HOUSEKEEPER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG599", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "NYAHUMA", "Contract": "ACTIVE", "FirstName": "IGNATIOUS", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG653", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "KONDO", "Contract": "ACTIVE", "FirstName": "WESLEY", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG658", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "CHIRAPA", "Contract": "ACTIVE", "FirstName": "LUXMORE", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG660", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "THOMAS", "Contract": "ACTIVE", "FirstName": "IGNATIOUS", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG661", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "KADAIRA", "Contract": "ACTIVE", "FirstName": "INNOCENT", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG662", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "TONGOFA", "Contract": "ACTIVE", "FirstName": "PRECIOUS", "Job Title": "HOUSE KEEPER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG687", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "KAWARA", "Contract": "ACTIVE", "FirstName": "AGATHA", "Job Title": "HOUSE KEEPER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG715", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "KARASA", "Contract": "ACTIVE", "FirstName": "SHARON", "Job Title": "KITCHEN PORTER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG716", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "CHIKOYA", "Contract": "ACTIVE", "FirstName": "THERESA", "Job Title": "KITCHEN PORTER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG759", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "MAFAIROSI", "Contract": "ACTIVE", "FirstName": "LEARNMORE", "Job Title": "HOUSE KEEPER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG768", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "MENAD", "Contract": "ACTIVE", "FirstName": "ELENA", "Job Title": "HOUSEKEEPER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG769", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "CHAMBURUMBUDZA", "Contract": "ACTIVE", "FirstName": "TSITSI", "Job Title": "HOUSEKEEPER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG783", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "MACHIPISA", "Contract": "ACTIVE", "FirstName": "MILLICENT", "Job Title": "COOK", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG785", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "MATYORAUTA", "Contract": "ACTIVE", "FirstName": "JOSEPHINE", "Job Title": "HOUSE KEEPER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG786", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "MUTSVENGURI", "Contract": "ACTIVE", "FirstName": "FOYLINE", "Job Title": "HOUSE KEEPER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG002", "Gender": "MALE", "SECTION": "STORES", "Surname": "BANDERA", "Contract": "ACTIVE", "FirstName": "MARK", "Job Title": "SENIOR STORES CLERK", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG038", "Gender": "MALE", "SECTION": "STORES", "Surname": "RUWO", "Contract": "ACTIVE", "FirstName": "TAMBURAI", "Job Title": "STORES CLERK", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG070", "Gender": "MALE", "SECTION": "STORES", "Surname": "MAVUNGA", "Contract": "ACTIVE", "FirstName": "JUSTICE", "Job Title": "STORES CLERK", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG086", "Gender": "MALE", "SECTION": "STORES", "Surname": "SIMANI", "Contract": "ACTIVE", "FirstName": "RASHEED", "Job Title": "STORES CLERK", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG197", "Gender": "MALE", "SECTION": "STORES", "Surname": "WAMBE", "Contract": "ACTIVE", "FirstName": "INNOCENT", "Job Title": "STORES CLERK", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG240", "Gender": "MALE", "SECTION": "STORES", "Surname": "CHIBAGU", "Contract": "ACTIVE", "FirstName": "CALISTO", "Job Title": "STOREKEEPER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG262", "Gender": "MALE", "SECTION": "STORES", "Surname": "CHINYAMA", "Contract": "ACTIVE", "FirstName": "ROBSON", "Job Title": "STORES CLERK", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG341", "Gender": "MALE", "SECTION": "STORES", "Surname": "MASHONGANYIKA", "Contract": "ACTIVE", "FirstName": "RAPHAEL", "Job Title": "STORES CLERK", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG366", "Gender": "MALE", "SECTION": "STORES", "Surname": "MUFENGI", "Contract": "ACTIVE", "FirstName": "MAXWELL", "Job Title": "STORES CLERK", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG404", "Gender": "MALE", "SECTION": "STORES", "Surname": "TARUVINGA", "Contract": "ACTIVE", "FirstName": "EUNICE", "Job Title": "SENIOR STORES CLERK", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG582", "Gender": "MALE", "SECTION": "STORES", "Surname": "MARANGE", "Contract": "ACTIVE", "FirstName": "CECIL", "Job Title": "STORES CLERK", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG075", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "BHANDA", "Contract": "ACTIVE", "FirstName": "THEOPHELOUS", "Job Title": "APPRENTICE", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG158", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MATIBIRI", "Contract": "ACTIVE", "FirstName": "PROSPER A", "Job Title": "APPRENTICE", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG320", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "DHINGA", "Contract": "ACTIVE", "FirstName": "WELCOME", "Job Title": "APPRENTICE", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG346", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "CHIFAMBA", "Contract": "ACTIVE", "FirstName": "CALVIN", "Job Title": "APPRENTICE", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG488", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "TAULO", "Contract": "ACTIVE", "FirstName": "RONALD", "Job Title": "APPRENTICE BOILERMAKER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG682", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MAZANI", "Contract": "ACTIVE", "FirstName": "FUNGISAI", "Job Title": "APPRENTICE", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG683", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MACHEKA", "Contract": "ACTIVE", "FirstName": "ELIAS", "Job Title": "APPRENTICE", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG684", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "CHIGWESHE", "Contract": "ACTIVE", "FirstName": "TANDIRAYI", "Job Title": "APPRENTICE", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG685", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MANYANGE", "Contract": "ACTIVE", "FirstName": "BYL", "Job Title": "APPRENTICE", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG686", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MAZARA", "Contract": "ACTIVE", "FirstName": "TAKUNDA", "Job Title": "APPRENTICE", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG747", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MAIMBE", "Contract": "ACTIVE", "FirstName": "CEPHAS", "Job Title": "STUDENT ON ATTACHEMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG750", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MAKUNDE", "Contract": "ACTIVE", "FirstName": "CONSTANCE", "Job Title": "STUDENT ON ATTACHEMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG751", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "ZENGEYA", "Contract": "ACTIVE", "FirstName": "GILBERT", "Job Title": "STUDENT ON ATTACHEMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG752", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "BHENHURA", "Contract": "ACTIVE", "FirstName": "TRACEY", "Job Title": "STUDENT ON ATTACHEMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG753", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "NGWARU", "Contract": "ACTIVE", "FirstName": "TANAKA", "Job Title": "STUDENT ON ATTACHEMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG754", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "ARUBINU", "Contract": "ACTIVE", "FirstName": "MANUEL", "Job Title": "STUDENT ON ATTACHEMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG755", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MUNOCHIWEYI", "Contract": "ACTIVE", "FirstName": "LEVONIA", "Job Title": "STUDENT ON ATTACHEMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG756", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "TENENE", "Contract": "ACTIVE", "FirstName": "ANESU", "Job Title": "STUDENT ON ATTACHEMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG762", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MADZVAMUSE", "Contract": "ACTIVE", "FirstName": "MUFARO", "Job Title": "STUDENT ON ATTACHMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG764", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "GATSI", "Contract": "ACTIVE", "FirstName": "DONALD", "Job Title": "STUDENT ON ATTACHMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG765", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "DZURO", "Contract": "ACTIVE", "FirstName": "ASHGRACE", "Job Title": "STUDENT ON ATTACHMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG766", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MUSARURWA", "Contract": "ACTIVE", "FirstName": "MOTION", "Job Title": "STUDENT ON ATTACHMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG767", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "DHLEMBEU", "Contract": "ACTIVE", "FirstName": "DADISO", "Job Title": "STUDENT ON ATTACHMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG777", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MAKULUNGA", "Contract": "ACTIVE", "FirstName": "TADIWANASHE", "Job Title": "STUDENT ON ATTACHMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG779", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "NDLOVU", "Contract": "ACTIVE", "FirstName": "SHINGIRIRAI", "Job Title": "STUDENT ON ATTACHMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG780", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "KADYE", "Contract": "ACTIVE", "FirstName": "TENDAI", "Job Title": "STUDENT ON ATTACHMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG781", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "KUMHANDA", "Contract": "ACTIVE", "FirstName": "DESMOND", "Job Title": "STUDENT ON ATTACHMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG782", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MAREGERE", "Contract": "ACTIVE", "FirstName": "TIVAKUDZE", "Job Title": "STUDENT ON ATTACHMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}], "skipDuplicates": true}, "query": {}, "params": {}}	{"url": "/api/v1/employees/bulk-upload", "method": "POST"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-16 15:04:11.501+02	37510ceb-5798-4c70-b7f5-341a18aa99ec
e344e973-f98a-4a52-8326-aaf85fc0a23e	BULK_CREATE	Employee	\N	{"body": {"employees": [{"Code": "DG028", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MUZAVAZI", "Contract": "TERMINATED", "FirstName": "ALBERT", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG135", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "WIZIMANI", "Contract": "TERMINATED", "FirstName": "ADMIRE", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG505", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "CHIMHARE", "Contract": "TERMINATED", "FirstName": "RODRECK", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG508", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "NGWENYA", "Contract": "TERMINATED", "FirstName": "WILSHER", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG628", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "NHAMOYEBONDE", "Contract": "TERMINATED", "FirstName": "MUNYARADZI", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG631", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "CHAMBA", "Contract": "TERMINATED", "FirstName": "SILAS", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG635", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MKANDAWIRE", "Contract": "TERMINATED", "FirstName": "DARLISON", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG749", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MAKAVA", "Contract": "TERMINATED", "FirstName": "TINEVIMBO", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG579", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "MAZHAMBE", "Contract": "TERMINATED", "FirstName": "PARTSON", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG590", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "MAZHAMBE", "Contract": "TERMINATED", "FirstName": "TAWANDA", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG593", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "GUMBURA", "Contract": "TERMINATED", "FirstName": "PASSMORE", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG621", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "CHIPFUNDE", "Contract": "TERMINATED", "FirstName": "HILLARY", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG725", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "CHIVEREVERE", "Contract": "TERMINATED", "FirstName": "TAFADZWA", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG740", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "BOTE", "Contract": "TERMINATED", "FirstName": "TINOBONGA", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG741", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MATASVA", "Contract": "TERMINATED", "FirstName": "MITCHELL", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG746", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MACHEKERA", "Contract": "TERMINATED", "FirstName": "NICOLE", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG748", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "BOME", "Contract": "TERMINATED", "FirstName": "TANAKA", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG761", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MAZHAMBE", "Contract": "TERMINATED", "FirstName": "SHUMIRAI", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG763", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MUNYUKI", "Contract": "TERMINATED", "FirstName": "ANESU", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG784", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "GWATINETSA", "Contract": "TERMINATED", "FirstName": "EMMANUEL", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DGZ062", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "CHIRIGA", "Contract": "ACTIVE", "FirstName": "TONDERAI", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "LABORATORY", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ063", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "NDIMANDE", "Contract": "ACTIVE", "FirstName": "NOVUYO", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "LABORATORY", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ064", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "MURAIRWA", "Contract": "ACTIVE", "FirstName": "JANIEL ANDREW", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "LABORATORY", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ088", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "MATEWA", "Contract": "ACTIVE", "FirstName": "SANDRA", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "LABORATORY", "Nec/ Salaried": "SALARIED"}, {"Code": "DP166", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "SHAPURE", "Contract": "ACTIVE", "FirstName": "AUGUSTINE", "Job Title": "MINE ASSAYER", "Cost centre": "LABORATORY", "Nec/ Salaried": "SALARIED"}, {"Code": "DP198", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "HOKO", "Contract": "ACTIVE", "FirstName": "FARAI", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "LABORATORY", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ013", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "CHIDO", "Contract": "ACTIVE", "FirstName": "STANWELL", "Job Title": "CHARGEHAND BUILDERS", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP071", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "NYATI", "Contract": "ACTIVE", "FirstName": "AGRIA", "Job Title": "CARPENTER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP082", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "NYAMBALO", "Contract": "ACTIVE", "FirstName": "WILLARD", "Job Title": "CIVILS SUPERVISOR", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ011", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "KONDO", "Contract": "ACTIVE", "FirstName": "SIBONGILE", "Job Title": "ELECTRICIAN CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ031", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "CHAPARAPATA", "Contract": "ACTIVE", "FirstName": "JOHNSON", "Job Title": "ELECTRICIAN CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP073", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "MWENYE", "Contract": "ACTIVE", "FirstName": "GAUNJE", "Job Title": "SENIOR ELECTRICAL AND INSTRUMENTATION SUPT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP197", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "NCUBE", "Contract": "ACTIVE", "FirstName": "JOSEPH", "Job Title": "CHARGEHAND INSTRUMENTATION", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP213", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "GOTEKA", "Contract": "ACTIVE", "FirstName": "TINASHE", "Job Title": "JUNIOR ELECTRICAL ENGINEER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP218", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "JAKARASI", "Contract": "ACTIVE", "FirstName": "TRYMORE", "Job Title": "ELECTRICAL MANAGER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP226", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "SUMANI", "Contract": "ACTIVE", "FirstName": "TAMARA", "Job Title": "JUNIOR INSTRUMENTATION ENGINEER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP245", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "KUBVORUNO", "Contract": "ACTIVE", "FirstName": "HEBERT", "Job Title": "INSTRUMENTATION TECHNICIAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP282", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "MASAMBA", "Contract": "ACTIVE", "FirstName": "GODFREY", "Job Title": "ELECTRICIAN CLASS 2", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP294", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "NLEYA", "Contract": "ACTIVE", "FirstName": "PROSPER", "Job Title": "INSTRUMENTATION TECHNICAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP296", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "MARINGIRENI", "Contract": "ACTIVE", "FirstName": "NESBERT", "Job Title": "ELECTRICIAN CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP303", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "MOYO", "Contract": "ACTIVE", "FirstName": "LAWRENCE", "Job Title": "CHARGEHAND ELECTRICAL", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP331", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "KASEMBE", "Contract": "ACTIVE", "FirstName": "ALI", "Job Title": "ELECTRICIAN CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP353", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "MUKO", "Contract": "ACTIVE", "FirstName": "BLESSING", "Job Title": "INSTRUMENTATION TECHNICIAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP355", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "CHAKWIZIRA", "Contract": "ACTIVE", "FirstName": "FISHER", "Job Title": "ELECTRICIAN CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP356", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "CHUDU", "Contract": "ACTIVE", "FirstName": "COSTA", "Job Title": "ELECTRICIAN CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP357", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "LANGWANI", "Contract": "ACTIVE", "FirstName": "TALENT", "Job Title": "ELECTRICIAN CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP358", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "MAKAYA", "Contract": "ACTIVE", "FirstName": "GIFT", "Job Title": "ELECTRICIAN CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ018", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "SHERENI", "Contract": "ACTIVE", "FirstName": "LISIAS", "Job Title": "FITTER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ019", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "CHATAIRA", "Contract": "ACTIVE", "FirstName": "JOHN", "Job Title": "FITTER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ024", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MATARUTSE", "Contract": "ACTIVE", "FirstName": "AMBROSE", "Job Title": "DRY PLANT FOREMAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ061", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MOTLOGWA", "Contract": "ACTIVE", "FirstName": "MOLISA", "Job Title": "PLUMBER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ075", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MUKANDE", "Contract": "ACTIVE", "FirstName": "ELISHA", "Job Title": "FITTER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ091", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MAFAIROSI", "Contract": "ACTIVE", "FirstName": "ANTHONY", "Job Title": "FITTER CLASS 2", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP089", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MUTONGA", "Contract": "ACTIVE", "FirstName": "PETRO", "Job Title": "STRUCTURAL FITTING FOREMAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP119", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MTUTU", "Contract": "ACTIVE", "FirstName": "WARREN", "Job Title": "MAINTENANCE ENGINEER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP175", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "TONGERA", "Contract": "ACTIVE", "FirstName": "MISI", "Job Title": "BELTS MAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP200", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MWAZHA", "Contract": "ACTIVE", "FirstName": "ELIAS", "Job Title": "MECHANICAL MANAGER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP214", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MACHIMBIRIKE", "Contract": "ACTIVE", "FirstName": "TINASHE", "Job Title": "ASSISTANT MECHANICAL ENGINEER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP236", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MUDZAMIRI", "Contract": "ACTIVE", "FirstName": "TARIRO", "Job Title": "JUNIOR MECHANICAL ENGINEER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP254", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MAJUTA", "Contract": "ACTIVE", "FirstName": "KNOWLEDGE", "Job Title": "FITTER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP255", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MUTANDWA", "Contract": "ACTIVE", "FirstName": "TERRENCE", "Job Title": "CHARGEHAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP330", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MUGUDA", "Contract": "ACTIVE", "FirstName": "EVARISTO", "Job Title": "FITTER CLASS 2", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP351", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "EZALA", "Contract": "ACTIVE", "FirstName": "LOVEMORE", "Job Title": "CHARGE HAND FITTING WET PLANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP010", "Gender": "MALE", "SECTION": "MM PLANNING", "Surname": "MUPINDUKI", "Contract": "ACTIVE", "FirstName": "FARAI", "Job Title": "DRAUGHTSMAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP112", "Gender": "MALE", "SECTION": "MM PLANNING", "Surname": "STEVENAGE", "Contract": "ACTIVE", "FirstName": "JAMES", "Job Title": "MAINTENANCE PLANNER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP167", "Gender": "MALE", "SECTION": "MM PLANNING", "Surname": "MUSENGEZI", "Contract": "ACTIVE", "FirstName": "STANFORD", "Job Title": "MAINTENANCE MANAGER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP190", "Gender": "MALE", "SECTION": "MM PLANNING", "Surname": "MAGWAZA", "Contract": "ACTIVE", "FirstName": "AGNES", "Job Title": "PLANNING FOREMAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP237", "Gender": "MALE", "SECTION": "MM PLANNING", "Surname": "JESE", "Contract": "ACTIVE", "FirstName": "GAMUCHIRAI", "Job Title": "JUNIOR  PLANNING ENGINEER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ001", "Gender": "MALE", "SECTION": "MECHANICAL", "Surname": "CHALEKA", "Contract": "ACTIVE", "FirstName": "COURAGE", "Job Title": "BOILERMAKER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ003", "Gender": "MALE", "SECTION": "MECHANICAL", "Surname": "JIRI", "Contract": "ACTIVE", "FirstName": "GODKNOWS", "Job Title": "BOILERMAKER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ010", "Gender": "MALE", "SECTION": "MECHANICAL", "Surname": "GADZE", "Contract": "ACTIVE", "FirstName": "ADMIRE", "Job Title": "CHARGEHAND BOILERMAKERS", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ016", "Gender": "MALE", "SECTION": "MECHANICAL", "Surname": "MHLANGA", "Contract": "ACTIVE", "FirstName": "NDABEZINHLE", "Job Title": "BOILERMAKER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ020", "Gender": "MALE", "SECTION": "MECHANICAL", "Surname": "CHENGO", "Contract": "ACTIVE", "FirstName": "DANIEL", "Job Title": "WELDER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ025", "Gender": "MALE", "SECTION": "MECHANICAL", "Surname": "ZINYAMA", "Contract": "ACTIVE", "FirstName": "SHEPHERD", "Job Title": "WELDER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ027", "Gender": "MALE", "SECTION": "MECHANICAL", "Surname": "MKWAIKI", "Contract": "ACTIVE", "FirstName": "ROBERT", "Job Title": "BOILER MAKER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ036", "Gender": "MALE", "SECTION": "MECHANICAL", "Surname": "KAPFUNDE", "Contract": "ACTIVE", "FirstName": "ARTHUR", "Job Title": "BOILERMAKER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ039", "Gender": "MALE", "SECTION": "MECHANICAL", "Surname": "NEZUNGAI", "Contract": "ACTIVE", "FirstName": "GEORGE", "Job Title": "BOILERMAKER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ041", "Gender": "MALE", "SECTION": "MECHANICAL", "Surname": "ALFONSO", "Contract": "ACTIVE", "FirstName": "OWEN", "Job Title": "CODED WELDER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ050", "Gender": "MALE", "SECTION": "MECHANICAL", "Surname": "TICHARWA", "Contract": "ACTIVE", "FirstName": "GABRIEL", "Job Title": "BOILERMAKER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ054", "Gender": "MALE", "SECTION": "MECHANICAL", "Surname": "CHINODA", "Contract": "ACTIVE", "FirstName": "COSTEN", "Job Title": "WELDER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ077", "Gender": "MALE", "SECTION": "MECHANICAL", "Surname": "MWASANGA", "Contract": "ACTIVE", "FirstName": "RAMUS", "Job Title": "BOILERMAKER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ079", "Gender": "MALE", "SECTION": "MECHANICAL", "Surname": "MANDIZHA", "Contract": "ACTIVE", "FirstName": "CLAYTON", "Job Title": "BOILERMAKER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP072", "Gender": "MALE", "SECTION": "MECHANICAL", "Surname": "MANJONDA", "Contract": "ACTIVE", "FirstName": "GIBSON", "Job Title": "FABRICATION FOREMAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ017", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "NGWENYA", "Contract": "ACTIVE", "FirstName": "ARTASHASTAH", "Job Title": "PLUMBER CLASS 2", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ028", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MUTODZA", "Contract": "ACTIVE", "FirstName": "MUNASHE", "Job Title": "RIGGER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ029", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "TAGA-DAGA", "Contract": "ACTIVE", "FirstName": "REUBEN", "Job Title": "BOILERMAKER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ084", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MANDIGORA", "Contract": "ACTIVE", "FirstName": "AARON", "Job Title": "PLUMBER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP174", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "NJANJENI", "Contract": "ACTIVE", "FirstName": "EMMANUEL", "Job Title": "RIGGER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP201", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "HANHART", "Contract": "ACTIVE", "FirstName": "JOHN", "Job Title": "TRANSPORT & SERVICES MANAGER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP244", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MHARIWA", "Contract": "ACTIVE", "FirstName": "ENOCK", "Job Title": "TRANSPORT AND SERVICES CHARGE HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP297", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "JEREMIAH", "Contract": "ACTIVE", "FirstName": "KOROFATI", "Job Title": "PLUMBER CLASS 2", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP298", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MHEMBERE", "Contract": "ACTIVE", "FirstName": "WALTER", "Job Title": "PLUMBER CLASS 2", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP300", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "JIM", "Contract": "ACTIVE", "FirstName": "PROSPER", "Job Title": "AUTO ELECTRICIAN CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP301", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "NYAMUROWA", "Contract": "ACTIVE", "FirstName": "VICTOR", "Job Title": "DIESEL PLANT FITTER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP322", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "TEMBO", "Contract": "ACTIVE", "FirstName": "KARL", "Job Title": "RIGGER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP323", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "GUNDA", "Contract": "ACTIVE", "FirstName": "KASSAN", "Job Title": "RIGGER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP354", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "NYONI", "Contract": "ACTIVE", "FirstName": "PETER", "Job Title": "AUTO ELECTRICIAN CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP363", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MTEKI", "Contract": "ACTIVE", "FirstName": "TANAKA", "Job Title": "DIESEL PLANT FITTER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP212", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "SAUNGWEME", "Contract": "ACTIVE", "FirstName": "TINASHE", "Job Title": "CIVIL ENGINEER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP305", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "USHE", "Contract": "ACTIVE", "FirstName": "TAFADZWA", "Job Title": "CIVIL TECHNICIAN TSF", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP156", "Gender": "MALE", "SECTION": "MINING", "Surname": "CHUMA", "Contract": "ACTIVE", "FirstName": "OLIVER SIMBA", "Job Title": "MINING ENGINEER", "Cost centre": "MINING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP159", "Gender": "MALE", "SECTION": "MINING", "Surname": "CHAWIRA", "Contract": "ACTIVE", "FirstName": "DESMOND", "Job Title": "SENIOR MINING ENGINEER", "Cost centre": "MINING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP165", "Gender": "MALE", "SECTION": "MINING", "Surname": "MAZANA", "Contract": "ACTIVE", "FirstName": "TAWEDZEGWA", "Job Title": "SENIOR PIT SUPERINTENDENT", "Cost centre": "MINING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP178", "Gender": "MALE", "SECTION": "MINING", "Surname": "NCUBE", "Contract": "ACTIVE", "FirstName": "STANLEY", "Job Title": "PIT SUPERINTENDENT", "Cost centre": "MINING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP234", "Gender": "MALE", "SECTION": "MINING", "Surname": "KATANDA", "Contract": "ACTIVE", "FirstName": "COBURN", "Job Title": "MINING MANAGER", "Cost centre": "MINING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP274", "Gender": "MALE", "SECTION": "MINING", "Surname": "MASONA", "Contract": "ACTIVE", "FirstName": "RYAN", "Job Title": "JUNIOR PIT SUPERINTENDENT", "Cost centre": "MINING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP359", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "ZENGENI", "Contract": "ACTIVE", "FirstName": "ELAINE", "Job Title": "EXPLORATION GEOLOGICAL TECHNICIAN", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP360", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "SAUNGWEME", "Contract": "ACTIVE", "FirstName": "LUCKSTONE", "Job Title": "EXPLORATION PROJECT MANAGER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP361", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "MUDZINGWA", "Contract": "ACTIVE", "FirstName": "TINASHE", "Job Title": "EXPLORATION GEOLOGIST", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP117", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "GEREMA", "Contract": "ACTIVE", "FirstName": "NYASHA", "Job Title": "DATABASE ADMINISTRATOR", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP163", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "LESAYA", "Contract": "ACTIVE", "FirstName": "WISDOM", "Job Title": "GEOLOGICAL TECHNICIAN", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP181", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "MUONEKA", "Contract": "ACTIVE", "FirstName": "BENEFIT", "Job Title": "RESIDENT GEOLOGIST", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP186", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "PORE", "Contract": "ACTIVE", "FirstName": "TATENDA", "Job Title": "JUNIOR GEOLOGIST", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP235", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "MATEVEKE", "Contract": "ACTIVE", "FirstName": "MARTIN", "Job Title": "GEOLOGIST", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP265", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "CHAKAWA", "Contract": "ACTIVE", "FirstName": "KUDAKWASHE", "Job Title": "GEOLOGICAL TECHNICIAN", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP139", "Gender": "MALE", "SECTION": "GEOTECHNICAL ENGINEERING", "Surname": "LULA", "Contract": "ACTIVE", "FirstName": "GUNUKA LUZIBO", "Job Title": "GEOTECHNICAL ENGINEERING TECHNICIAN", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP158", "Gender": "MALE", "SECTION": "GEOTECHNICAL ENGINEERING", "Surname": "GUNYANJA", "Contract": "ACTIVE", "FirstName": "TAKUDZWA", "Job Title": "GEOTECHNICAL ENGINEERING TECHNICIAN", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP306", "Gender": "MALE", "SECTION": "GEOTECHNICAL ENGINEERING", "Surname": "NYAMANDE", "Contract": "ACTIVE", "FirstName": "PARDON", "Job Title": "GEOTECHNICAL ENGINEER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP110", "Gender": "MALE", "SECTION": "PLANNING ", "Surname": "NEMADIRE", "Contract": "ACTIVE", "FirstName": "TINASHE", "Job Title": "MINE PLANNING SUPERINTENDENT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP128", "Gender": "MALE", "SECTION": "PLANNING ", "Surname": "ZVARAYA", "Contract": "ACTIVE", "FirstName": "MICHAEL", "Job Title": "MINING TECHNICAL SERVICES MANAGER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP157", "Gender": "MALE", "SECTION": "PLANNING ", "Surname": "TARWIREI", "Contract": "ACTIVE", "FirstName": "TINASHE", "Job Title": "JUNIOR MINE PLANNING ENGINEER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP219", "Gender": "MALE", "SECTION": "PLANNING ", "Surname": "NYIRENDA", "Contract": "ACTIVE", "FirstName": "ROBERT", "Job Title": "MINE PLANNING ENGINEER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP097", "Gender": "MALE", "SECTION": "SURVEY", "Surname": "MKANDLA", "Contract": "ACTIVE", "FirstName": "MZAMO", "Job Title": "SURVEYOR", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP100", "Gender": "MALE", "SECTION": "SURVEY", "Surname": "NGULUBE", "Contract": "ACTIVE", "FirstName": "COLLETTE", "Job Title": "CHIEF SURVEYOR", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP215", "Gender": "MALE", "SECTION": "SURVEY", "Surname": "MUJAJATI", "Contract": "ACTIVE", "FirstName": "GAMUCHIRAI", "Job Title": "SURVEYOR", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP266", "Gender": "MALE", "SECTION": "SURVEY", "Surname": "MUSHONGA", "Contract": "ACTIVE", "FirstName": "HILARY", "Job Title": "SENIOR SURVEYOR", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ090", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "NOKO", "Contract": "ACTIVE", "FirstName": "TSEPO", "Job Title": "METALLURGICAL TECHNICIAN", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP251", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "NGIRANDI", "Contract": "ACTIVE", "FirstName": "BRIDGET", "Job Title": "METALLURGICAL TECHNICIAN", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP131", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "CHIKEREMA", "Contract": "ACTIVE", "FirstName": "VICTOR", "Job Title": "PLANT PRODUCTION SUPERINTENDENT", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP136", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "SITHOLE", "Contract": "ACTIVE", "FirstName": "STEWARD", "Job Title": "METALLURGICAL SUPERINTENDENT", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP137", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "CHIBAMU", "Contract": "ACTIVE", "FirstName": "GERALDINE", "Job Title": "PROCESS CONTROL SUPERVISOR", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP161", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "NYABANGA", "Contract": "ACTIVE", "FirstName": "THELMA", "Job Title": "METALLURGICAL ENGINEER", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP188", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "CHIORESO", "Contract": "ACTIVE", "FirstName": "ABGAIL", "Job Title": "PROCESS CONTROL METALLURGIST", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP228", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "MAGANGA", "Contract": "ACTIVE", "FirstName": "RUTENDO", "Job Title": "PLANT LABORATORY METALLURGIST", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP240", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "MAPOSAH", "Contract": "ACTIVE", "FirstName": "MICHELLE", "Job Title": "PROCESS CONTROL METALLURGIST", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP307", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "NCUBE", "Contract": "ACTIVE", "FirstName": "PRINCESS", "Job Title": "PROCESS CONTROL METALLURGIST", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP332", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "DUBE", "Contract": "ACTIVE", "FirstName": "BUKHOSI", "Job Title": "PLANT LABORATORY TECHNICIAN", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP334", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "KHOWA", "Contract": "ACTIVE", "FirstName": "LOUIS", "Job Title": "PROCESSING SYSTEMS ANALYST", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP335", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "MAZVIYO", "Contract": "ACTIVE", "FirstName": "RUMBIDZAI", "Job Title": "PLANT LABORATORY MET TECHNICIAN", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP125", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "JERE", "Contract": "ACTIVE", "FirstName": "ROBERT", "Job Title": "PLANT SUPERVISOR", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP134", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "ZINHU", "Contract": "ACTIVE", "FirstName": "TANYARADZWA", "Job Title": "PLANT SUPERVISOR", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP187", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "MUREVERWI", "Contract": "ACTIVE", "FirstName": "LIONEL", "Job Title": "PLANT SUPERVISOR", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP320", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "MUNODAWAFA", "Contract": "ACTIVE", "FirstName": "OBERT", "Job Title": "PROCESSING MANAGER", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP339", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "MUSAPINGURA", "Contract": "ACTIVE", "FirstName": "VISION", "Job Title": "METALLURGICAL ENGINEER", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP129", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "KHUPE", "Contract": "ACTIVE", "FirstName": "MALVIN", "Job Title": "TSF SUPERVISOR", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP252", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MANDIZIBA", "Contract": "ACTIVE", "FirstName": "JOHANNES", "Job Title": "TSF SUPERVISOR", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP299", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MAHACHI", "Contract": "ACTIVE", "FirstName": "CHAKANETSA", "Job Title": "PLANT MANAGER", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP108", "Gender": "MALE", "SECTION": "ADMINISTRATION", "Surname": "BANDA", "Contract": "ACTIVE", "FirstName": "NELSON", "Job Title": "GENERAL MANAGER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP284", "Gender": "MALE", "SECTION": "ADMINISTRATION", "Surname": "SICHAKALA", "Contract": "ACTIVE", "FirstName": "GIVEMORE", "Job Title": "SHARED SERVICES MANAGER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP325", "Gender": "MALE", "SECTION": "CSIR", "Surname": "SIATULUBE", "Contract": "ACTIVE", "FirstName": "ANYWAY", "Job Title": "BOME HOUSES CONSTRUCTION SUPERVISOR", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP169", "Gender": "MALE", "SECTION": "ADMINISTRATION", "Surname": "MADADANGOMA", "Contract": "ACTIVE", "FirstName": "VIMBAI", "Job Title": "BUSINESS IMPROVEMENT MANAGER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP243", "Gender": "MALE", "SECTION": "ADMINISTRATION", "Surname": "MAYUNI", "Contract": "ACTIVE", "FirstName": "JOHN", "Job Title": "BUSINESS IMPROVEMENT OFFICER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP065", "Gender": "MALE", "SECTION": "CSIR", "Surname": "KHUMALO", "Contract": "ACTIVE", "FirstName": "LINDELWE", "Job Title": "COMMUNITY RELATIONS COORDINATOR", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP241", "Gender": "MALE", "SECTION": "CSIR", "Surname": "HUNGOIDZA", "Contract": "ACTIVE", "FirstName": "RUGARE", "Job Title": "ASSISTANT COMMUNITY RELATIONS OFFICER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP258", "Gender": "MALE", "SECTION": "CSIR", "Surname": "TAVENHAVE", "Contract": "ACTIVE", "FirstName": "DAPHNE", "Job Title": "COMMUNITY RELATIONS OFFICER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP040", "Gender": "MALE", "SECTION": "FINANCE", "Surname": "SAWAYA", "Contract": "ACTIVE", "FirstName": "ALEXIO", "Job Title": "BOOK KEEPER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP087", "Gender": "MALE", "SECTION": "FINANCE", "Surname": "KUHAMBA", "Contract": "ACTIVE", "FirstName": "DUNCAN", "Job Title": "FINANCE & ADMINISTRATION MANAGER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP191", "Gender": "MALE", "SECTION": "FINANCE", "Surname": "CHANDAVENGERWA", "Contract": "ACTIVE", "FirstName": "ELLEN", "Job Title": "ASSISTANT ACCOUNTANT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP145", "Gender": "MALE", "SECTION": "HUMAN RESOURCES", "Surname": "TINAGO", "Contract": "ACTIVE", "FirstName": "TINAGO", "Job Title": "HUMAN CAPITAL SUPPORT SERVICES MANAGER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP164", "Gender": "MALE", "SECTION": "HUMAN RESOURCES", "Surname": "MUWAIRI", "Contract": "ACTIVE", "FirstName": "BENJAMIN", "Job Title": "HR ADMINISTRATOR", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP216", "Gender": "MALE", "SECTION": "HUMAN RESOURCES", "Surname": "SAMURIWO", "Contract": "ACTIVE", "FirstName": "CARLTON", "Job Title": "HUMAN RESOURCES ASSISTANT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP333", "Gender": "MALE", "SECTION": "HUMAN RESOURCES", "Surname": "MAGOMANA", "Contract": "ACTIVE", "FirstName": "FREEDMORE", "Job Title": "HUMAN RESOURCES SUPERINTENDENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP130", "Gender": "MALE", "SECTION": "I.T", "Surname": "MUKWEBWA", "Contract": "ACTIVE", "FirstName": "NEIL", "Job Title": "IT OFFICER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP140", "Gender": "MALE", "SECTION": "I.T", "Surname": "GWINYAI", "Contract": "ACTIVE", "FirstName": "POUND", "Job Title": "IT SUPERINTENDENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP329", "Gender": "MALE", "SECTION": "I.T", "Surname": "DANDAVARE", "Contract": "ACTIVE", "FirstName": "FELIX", "Job Title": "SUPPORT TECHNICIAN", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP336", "Gender": "MALE", "SECTION": "STORES", "Surname": "CHINAKIDZWA", "Contract": "ACTIVE", "FirstName": "DERICK", "Job Title": "ISSUING OFFICER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP242", "Gender": "MALE", "SECTION": "STORES", "Surname": "CHIGARIRO", "Contract": "ACTIVE", "FirstName": "ASHLEY", "Job Title": "ASSISTANT EXPEDITER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP312", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "MATANDARE", "Contract": "ACTIVE", "FirstName": "SIMBARASHE", "Job Title": "SECURITY OFFICER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP313", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "WERENGANI", "Contract": "ACTIVE", "FirstName": "JANUARY", "Job Title": "SECURITY MANAGER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP084", "Gender": "MALE", "SECTION": "SHEQ", "Surname": "MUNYENYIWA", "Contract": "ACTIVE", "FirstName": "NYASHA", "Job Title": "SHE MANAGER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP148", "Gender": "MALE", "SECTION": "SHEQ", "Surname": "ZHOU", "Contract": "ACTIVE", "FirstName": "ELVIS", "Job Title": "SHE OFFICER PLANT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP162", "Gender": "MALE", "SECTION": "SHEQ", "Surname": "BASU", "Contract": "ACTIVE", "FirstName": "REST", "Job Title": "ENVIRONMENTAL & HYGIENE OFFICER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP193", "Gender": "MALE", "SECTION": "SHEQ", "Surname": "MURIMBA", "Contract": "ACTIVE", "FirstName": "NYASHA", "Job Title": "SHE ADMINISTRATOR", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP247", "Gender": "MALE", "SECTION": "SHEQ", "Surname": "MBOFANA", "Contract": "ACTIVE", "FirstName": "TINASHE", "Job Title": "SHEQ SUPERINTENDENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP249", "Gender": "MALE", "SECTION": "SHEQ", "Surname": "MARAMBANYIKA", "Contract": "ACTIVE", "FirstName": "TAWANDA", "Job Title": "SHEQ AND ENVIRONMENTAL OFFICER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP253", "Gender": "MALE", "SECTION": "SHEQ", "Surname": "TAHWA", "Contract": "ACTIVE", "FirstName": "TAFADZWA", "Job Title": "SHE ASSISTANT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP053", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "CHIRIMANI", "Contract": "ACTIVE", "FirstName": "OWEN", "Job Title": "DRIVER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP085", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "MUDUKA", "Contract": "ACTIVE", "FirstName": "ITAI", "Job Title": "CHEF", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP150", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "SENZERE", "Contract": "ACTIVE", "FirstName": "ARTLEY", "Job Title": "SITE COORDINATION OFFICER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP328", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "YONA", "Contract": "ACTIVE", "FirstName": "SIMON", "Job Title": "CATERING AND HOUSEKEEPING SUPERVISOR", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP041", "Gender": "MALE", "SECTION": "STORES", "Surname": "WAMBE", "Contract": "ACTIVE", "FirstName": "IGNATIOUS", "Job Title": "STORES CONTROLLER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP091", "Gender": "MALE", "SECTION": "STORES", "Surname": "DENGENDE", "Contract": "ACTIVE", "FirstName": "TENDAI", "Job Title": "STORES MANAGER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP172", "Gender": "MALE", "SECTION": "STORES", "Surname": "MADONDO", "Contract": "ACTIVE", "FirstName": "MUNYARADZI", "Job Title": "ISSUING OFFICER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP173", "Gender": "MALE", "SECTION": "STORES", "Surname": "HAMANDISHE", "Contract": "ACTIVE", "FirstName": "VIOLET", "Job Title": "STORES CONTROLLER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP246", "Gender": "MALE", "SECTION": "STORES", "Surname": "MOYO", "Contract": "ACTIVE", "FirstName": "MESULI", "Job Title": "RECEIVING OFFICER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP267", "Gender": "MALE", "SECTION": "STORES", "Surname": "BALENI", "Contract": "ACTIVE", "FirstName": "RAYNARD", "Job Title": "PYLOG ADMINISTRATOR", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP233", "Gender": "MALE", "SECTION": "TRAINING ", "Surname": "MUSADEMBA", "Contract": "ACTIVE", "FirstName": "GAYNOR", "Job Title": "GRADUATE TRAINEE", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP238", "Gender": "MALE", "SECTION": "TRAINING ", "Surname": "CHAPUNZA", "Contract": "ACTIVE", "FirstName": "IRVIN", "Job Title": "GRADUATE TRAINEE METALLURGY", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP239", "Gender": "MALE", "SECTION": "TRAINING ", "Surname": "MAZARA", "Contract": "ACTIVE", "FirstName": "SOLOMON", "Job Title": "GRADUATE TRAINEE METALLURGY", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP273", "Gender": "MALE", "SECTION": "TRAINING ", "Surname": "MAGADU", "Contract": "ACTIVE", "FirstName": "TAFADZWA", "Job Title": "GRADUATE TRAINEE", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP278", "Gender": "MALE", "SECTION": "TRAINING ", "Surname": "GOMBEDZA", "Contract": "ACTIVE", "FirstName": "LISA", "Job Title": "ASSAY LABORATORY TECHNICIAN TRAINEE", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP283", "Gender": "MALE", "SECTION": "TRAINING ", "Surname": "MAGOMO", "Contract": "ACTIVE", "FirstName": "SAMUEL", "Job Title": "SHEQ GRADUATE TRAINEE", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP288", "Gender": "MALE", "SECTION": "TRAINING ", "Surname": "MUKOVA", "Contract": "ACTIVE", "FirstName": "SAVIOUS", "Job Title": "GRADUATE TRAINEE MINING", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP289", "Gender": "MALE", "SECTION": "TRAINING ", "Surname": "DOBBIE", "Contract": "ACTIVE", "FirstName": "TERRENCE", "Job Title": "GRADUATE TRAINEE MINING", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP290", "Gender": "MALE", "SECTION": "TRAINING ", "Surname": "MAVURU", "Contract": "ACTIVE", "FirstName": "CHANTELLE", "Job Title": "GRADUATE TRAINEE MINING", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP291", "Gender": "MALE", "SECTION": "TRAINING ", "Surname": "SAUNYAMA", "Contract": "ACTIVE", "FirstName": "ANDY", "Job Title": "GRADUATE TRAINEE METALLURGY", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP292", "Gender": "MALE", "SECTION": "TRAINING ", "Surname": "NYIKA", "Contract": "ACTIVE", "FirstName": "TANAKA", "Job Title": "GRADUATE TRAINEE METALLURGY", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP293", "Gender": "MALE", "SECTION": "TRAINING ", "Surname": "MLAMBO", "Contract": "ACTIVE", "FirstName": "PRIMROSE", "Job Title": "GRADUATE TRAINEE METALLURGY", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP311", "Gender": "MALE", "SECTION": "TRAINING ", "Surname": "MOYO", "Contract": "ACTIVE", "FirstName": "NYASHA", "Job Title": "TRAINING AND DEVELOPMENT OFFICER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP324", "Gender": "MALE", "SECTION": "TRAINING ", "Surname": "MUPAMBA", "Contract": "ACTIVE", "FirstName": "ZIVANAI", "Job Title": "GT MECHANICAL ENGINEERING", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP352", "Gender": "MALE", "SECTION": "TRAINING ", "Surname": "TSORAI", "Contract": "ACTIVE", "FirstName": "TONDERAI", "Job Title": "GRADUATE TRAINEE ACCOUNTING", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DG223", "Gender": "MALE", "SECTION": "HEAD OFFICE", "Surname": "NYAWANGA", "Contract": "ACTIVE", "FirstName": "INNOCENT", "Job Title": "WAREHOUSE ASSISTANT", "Cost centre": "HEAD OFFICE", "Nec/ Salaried": "NEC"}, {"Code": "DG224", "Gender": "MALE", "SECTION": "HEAD OFFICE", "Surname": "NGOROSHA", "Contract": "ACTIVE", "FirstName": "LOVEMORE", "Job Title": "WAREHOUSE ASSISTANT", "Cost centre": "HEAD OFFICE", "Nec/ Salaried": "NEC"}, {"Code": "DG478", "Gender": "MALE", "SECTION": "HEAD OFFICE", "Surname": "NYAHOKO", "Contract": "ACTIVE", "FirstName": "PHIBION", "Job Title": "GENERAL HAND", "Cost centre": "HEAD OFFICE", "Nec/ Salaried": "NEC"}, {"Code": "DG627", "Gender": "MALE", "SECTION": "HEAD OFFICE", "Surname": "SANGARE", "Contract": "ACTIVE", "FirstName": "MIRIAM", "Job Title": "OFFICE CLEANER", "Cost centre": "HEAD OFFICE", "Nec/ Salaried": "NEC"}, {"Code": "DG006", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "CHATAMBUDZIKI", "Contract": "ACTIVE", "FirstName": "GEORGE", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG014", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "DIRE", "Contract": "ACTIVE", "FirstName": "GANIZANI", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG015", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "GREYA", "Contract": "ACTIVE", "FirstName": "NEVER", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG045", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "GANDIWA", "Contract": "ACTIVE", "FirstName": "MICHAEL", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG077", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "CHIKUNI", "Contract": "ACTIVE", "FirstName": "TADIWANASHE", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG080", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "CHANDIWANA", "Contract": "ACTIVE", "FirstName": "RAPHAEL", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG081", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "MASIKINYE", "Contract": "ACTIVE", "FirstName": "TAPIWA", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG149", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "KADZIMA", "Contract": "ACTIVE", "FirstName": "DOCTOR", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG157", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "CHIGODHO", "Contract": "ACTIVE", "FirstName": "CURRENCY", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG249", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "NYANKUNI", "Contract": "ACTIVE", "FirstName": "TONDERAI", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG250", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "MASIYA", "Contract": "ACTIVE", "FirstName": "MALVERN", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG251", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "CHIORESE", "Contract": "ACTIVE", "FirstName": "TALENT", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG252", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "CHIBANDA", "Contract": "ACTIVE", "FirstName": "NGONI", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG253", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "VENGERE", "Contract": "ACTIVE", "FirstName": "TRUST", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG254", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "BOX", "Contract": "ACTIVE", "FirstName": "RACCELL", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG255", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "MAKOSA", "Contract": "ACTIVE", "FirstName": "PALMER", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG277", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "MARISA", "Contract": "ACTIVE", "FirstName": "CLINTON MUNYARADZI", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG284", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "CHIKOVO", "Contract": "ACTIVE", "FirstName": "TAFADZWA", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG297", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "KAVENDA", "Contract": "ACTIVE", "FirstName": "TAKUNDA", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG301", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "MARIMO", "Contract": "ACTIVE", "FirstName": "STANLEY", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG357", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "CHIRIMANI", "Contract": "ACTIVE", "FirstName": "CHENGETAI", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG358", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "MARATA", "Contract": "ACTIVE", "FirstName": "LINCORN", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG428", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "NHAMOYEBONDE", "Contract": "ACTIVE", "FirstName": "MICHAEL", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG600", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "MUKUMBAREZA", "Contract": "ACTIVE", "FirstName": "PROSPER", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG059", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "NHEMACHENA", "Contract": "ACTIVE", "FirstName": "ELWED", "Job Title": "BUILDER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG147", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "MUFENGI", "Contract": "ACTIVE", "FirstName": "EZRA", "Job Title": "SEMI- SKILLED BUILDER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG019", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "MADZVITI", "Contract": "ACTIVE", "FirstName": "FRANK", "Job Title": "ELECTRICIAN ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG034", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "NYARIRI", "Contract": "ACTIVE", "FirstName": "COLLINS", "Job Title": "SEMI- SKILLED ELECTRICIAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG104", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "KAMANGE", "Contract": "ACTIVE", "FirstName": "ERNEST", "Job Title": "ELECTRICIAN ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG105", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "KAZUNGA", "Contract": "ACTIVE", "FirstName": "TENDEKAI", "Job Title": "ELECTRICIAN ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG106", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "KASINGANETE", "Contract": "ACTIVE", "FirstName": "PERFORMANCE", "Job Title": "ELECTRICIAN ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG317", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "MAJONGA", "Contract": "ACTIVE", "FirstName": "GODFREY", "Job Title": "ELECTRICAL ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG379", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "PAGAN'A", "Contract": "ACTIVE", "FirstName": "TINEI", "Job Title": "ELECTRICAL ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG578", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "NGWENYA", "Contract": "ACTIVE", "FirstName": "TAKUNDA", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG581", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "CHIMANIKIRE", "Contract": "ACTIVE", "FirstName": "SYDNEY", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG587", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "CHAPONDA", "Contract": "ACTIVE", "FirstName": "MEKELANI", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG605", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "HOVE", "Contract": "ACTIVE", "FirstName": "STUDY", "Job Title": "INSTRUMENTS TECHS ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG644", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "MAPOPE", "Contract": "ACTIVE", "FirstName": "KUDZAI", "Job Title": "INSTRUMENTATIONS ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG647", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "RAVU", "Contract": "ACTIVE", "FirstName": "REGIS", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG650", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "DENHERE", "Contract": "ACTIVE", "FirstName": "JOHN", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG654", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "GWETA", "Contract": "ACTIVE", "FirstName": "TANYARADZWA", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG655", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "MAZVAZVA", "Contract": "ACTIVE", "FirstName": "NOMORE", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG707", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "CHIANGWA", "Contract": "ACTIVE", "FirstName": "CHARMAINE", "Job Title": "INSTRUMENTATIONS ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG732", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "TYRMORE", "Contract": "ACTIVE", "FirstName": "NGOCHO", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG739", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "CHAPONDA", "Contract": "ACTIVE", "FirstName": "TROUBLE", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG029", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MUZVONDIWA", "Contract": "ACTIVE", "FirstName": "BRIGHTON", "Job Title": "FITTERS ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG124", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "JINYA", "Contract": "ACTIVE", "FirstName": "TINOTENDA", "Job Title": "FITTER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG192", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MUNENGIWA", "Contract": "ACTIVE", "FirstName": "SIMON", "Job Title": "FITTERS ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG242", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "KANYERA", "Contract": "ACTIVE", "FirstName": "CARLOS", "Job Title": "FITTER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG349", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MUGUTI", "Contract": "ACTIVE", "FirstName": "DAVID", "Job Title": "FITTER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG359", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MACHACHA", "Contract": "ACTIVE", "FirstName": "ADMIRE", "Job Title": "FITTER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG392", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "CHIMANGA", "Contract": "ACTIVE", "FirstName": "EDMORE", "Job Title": "FITTER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG604", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MATOROFA", "Contract": "ACTIVE", "FirstName": "NYASHA", "Job Title": "FITTER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG614", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "CHIGWADA", "Contract": "ACTIVE", "FirstName": "ENOCK", "Job Title": "PLUMBER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG706", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MAPFUMO", "Contract": "ACTIVE", "FirstName": "NGONIDZASHE", "Job Title": "FITTERS ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG335", "Gender": "MALE", "SECTION": "PLANNING", "Surname": "BANGANYIKA", "Contract": "ACTIVE", "FirstName": "TAFADZWA DYLAN", "Job Title": "PLANNING CLERK", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG479", "Gender": "MALE", "SECTION": "PLANNING", "Surname": "ZHOU", "Contract": "ACTIVE", "FirstName": "SHARON", "Job Title": "PLANNING CLERK", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG535", "Gender": "MALE", "SECTION": "PLANNING", "Surname": "GWAMATSA", "Contract": "ACTIVE", "FirstName": "HANDSON", "Job Title": "CLASS 2 DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG603", "Gender": "MALE", "SECTION": "PLANNING", "Surname": "NYANDORO", "Contract": "ACTIVE", "FirstName": "TAKESURE", "Job Title": "STANDBY DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG021", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MARUNGISA", "Contract": "ACTIVE", "FirstName": "DOUGLAS", "Job Title": "BOILERMAKER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG022", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MARUNGISA", "Contract": "ACTIVE", "FirstName": "MUCHENJE", "Job Title": "BOILERMAKER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG051", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MUROYIWA", "Contract": "ACTIVE", "FirstName": "LAMECK", "Job Title": "SCAFFOLDER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG064", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "KAJARI", "Contract": "ACTIVE", "FirstName": "AUSTIN", "Job Title": "SEMI SKILLED PAINTER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG066", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "TANDI", "Contract": "ACTIVE", "FirstName": "TAPFUMANEI", "Job Title": "SCAFFOLDER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG176", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MAODZWA", "Contract": "ACTIVE", "FirstName": "PADDINGTON F", "Job Title": "BOILERMAKER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG177", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "GOROMONZI", "Contract": "ACTIVE", "FirstName": "EMMANUEL", "Job Title": "BOILERMAKER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG182", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "CHITIMA", "Contract": "ACTIVE", "FirstName": "CLEMENCE", "Job Title": "BOILERMAKER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG246", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MASUKU", "Contract": "ACTIVE", "FirstName": "SHINGIRAI", "Job Title": "BOILERMAKER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG303", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MAPIRA", "Contract": "ACTIVE", "FirstName": "AARON", "Job Title": "SCAFFOLDER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG351", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MUDAVANHU", "Contract": "ACTIVE", "FirstName": "STEADY", "Job Title": "BOILERMAKER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG495", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "NGWENYA", "Contract": "ACTIVE", "FirstName": "THEMBINKOSI", "Job Title": "BOILERMAKERS ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG529", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MHONYERA", "Contract": "ACTIVE", "FirstName": "GEORGE", "Job Title": "SEMI SKILLED PAINTER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG594", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "SIBANDA", "Contract": "ACTIVE", "FirstName": "TACHIONA", "Job Title": "FITTER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG656", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "CHITUMBURA", "Contract": "ACTIVE", "FirstName": "TAKUNDA", "Job Title": "BOILERMAKER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG008", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "CHIGODHO", "Contract": "ACTIVE", "FirstName": "DAVID", "Job Title": "TRACTOR DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG024", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MUTIKITSI", "Contract": "ACTIVE", "FirstName": "ROBERT", "Job Title": "UD TRUCK DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG041", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MAZHAMBE", "Contract": "ACTIVE", "FirstName": "GOOD", "Job Title": "TLB OPERATOR", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG047", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "LAVU", "Contract": "ACTIVE", "FirstName": "THOMAS", "Job Title": "EXCAVATOR OPERATOR", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG087", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MKANDAWIRE", "Contract": "ACTIVE", "FirstName": "FRIDAY", "Job Title": "FRONT END LOADER OPERATOR", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG096", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "ZVENYIKA", "Contract": "ACTIVE", "FirstName": "TANAKA", "Job Title": "CRANE OPERATOR", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG100", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "CHAKASARA", "Contract": "ACTIVE", "FirstName": "WORKERS", "Job Title": "TRACTOR DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG101", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "CEPHAS", "Contract": "ACTIVE", "FirstName": "PASSMORE", "Job Title": "ASSISTANT PLUMBER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG108", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "NGOMA", "Contract": "ACTIVE", "FirstName": "BRIGHTON", "Job Title": "FRONT END LOADER OPERATOR", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG125", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "CHATIZA", "Contract": "ACTIVE", "FirstName": "PAUL", "Job Title": "PLUMBERS ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG218", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "KAMAMBO", "Contract": "ACTIVE", "FirstName": "TINEI", "Job Title": "BUS DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG243", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "NDIRA", "Contract": "ACTIVE", "FirstName": "PISIRAI", "Job Title": "PLUMBERS ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG312", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MUGOCHI", "Contract": "ACTIVE", "FirstName": "BRENDO", "Job Title": "WORKSHOP ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG334", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MAPETESE", "Contract": "ACTIVE", "FirstName": "MAZVITA", "Job Title": "BUS DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG405", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MARIKANO", "Contract": "ACTIVE", "FirstName": "ISAAC", "Job Title": "EXCAVATOR OPERATOR", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG446", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "NTALA", "Contract": "ACTIVE", "FirstName": "KUDAKWASHE", "Job Title": "CRANE OPERATOR", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG447", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MUROMBO", "Contract": "ACTIVE", "FirstName": "PAIMETY", "Job Title": "CRANE OPERATOR", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG490", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "PHIRI", "Contract": "ACTIVE", "FirstName": "BHEU", "Job Title": "UD CLASS 2 DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG491", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "KATSANDE", "Contract": "ACTIVE", "FirstName": "SAMUAEL", "Job Title": "STANDBY DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG526", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "CHIPENGO", "Contract": "ACTIVE", "FirstName": "LEONARD", "Job Title": "BUS DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG534", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "CHIWOCHA", "Contract": "ACTIVE", "FirstName": "STANLEY", "Job Title": "MOBIL CRANE OPERATOR", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG538", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MUZHONA", "Contract": "ACTIVE", "FirstName": "ONISMO", "Job Title": "SEMI SKILLED PLUMBER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG547", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MUTWIRA", "Contract": "ACTIVE", "FirstName": "STEVEN", "Job Title": "BUS DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG548", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "DZIMIRI", "Contract": "ACTIVE", "FirstName": "EVEREST", "Job Title": "BUS DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG573", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MAJENGWA", "Contract": "ACTIVE", "FirstName": "EDMORE", "Job Title": "TLB OPERATOR", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG574", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "ZISO", "Contract": "ACTIVE", "FirstName": "SIMBARASHE", "Job Title": "TELEHANDLER OPERATOR", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG694", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "ZODZIWA", "Contract": "ACTIVE", "FirstName": "MAVUTO", "Job Title": "BUS DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG708", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "JIMU", "Contract": "ACTIVE", "FirstName": "TONDERAI", "Job Title": "FEL OPERATOR", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG719", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "CHIFAMBA", "Contract": "ACTIVE", "FirstName": "COURAGE", "Job Title": "WORKSHOP CLERK", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG736", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "DZIMBANHETE", "Contract": "ACTIVE", "FirstName": "MARTIN", "Job Title": "CLASS 1 BUS DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG737", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "JAKACHIRA", "Contract": "ACTIVE", "FirstName": "WISDOM", "Job Title": "CLASS 1 BUS DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG738", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "NYABADZA", "Contract": "ACTIVE", "FirstName": "JONATHAN", "Job Title": "CLASS 1 BUS DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG758", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "GWESHE", "Contract": "ACTIVE", "FirstName": "DOUBT", "Job Title": "TELEHANDLER OPERATOR", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG778", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MAHLENGEZANA", "Contract": "ACTIVE", "FirstName": "STANLEY", "Job Title": "EXCAVATOR OPERATOR", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG098", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "KURUDZA", "Contract": "ACTIVE", "FirstName": "MONEYWORK", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG129", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "MANHANGA", "Contract": "ACTIVE", "FirstName": "WILBERT", "Job Title": "SEMI-SKILLED BUILDER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG145", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "KURUDZA", "Contract": "ACTIVE", "FirstName": "FARAI", "Job Title": "BUILDER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG159", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "CHIGODHO", "Contract": "ACTIVE", "FirstName": "SIMBARASHE", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG160", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "MUPUNGA", "Contract": "ACTIVE", "FirstName": "MACDONALD", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG258", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "MURINGAYI", "Contract": "ACTIVE", "FirstName": "FIDELIS", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG261", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "MBURUMA", "Contract": "ACTIVE", "FirstName": "EPHRAIM", "Job Title": "SEMI-SKILLED BUILDER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG263", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "MARERWA", "Contract": "ACTIVE", "FirstName": "OBINISE", "Job Title": "SEMI-SKILLED BUILDER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG272", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "MUJERI", "Contract": "ACTIVE", "FirstName": "GARIKAI", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG275", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "RUNZIRA", "Contract": "ACTIVE", "FirstName": "DOMINIC", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG292", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "JAIROS", "Contract": "ACTIVE", "FirstName": "RAYMOND", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG294", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "KAKORE", "Contract": "ACTIVE", "FirstName": "CRY", "Job Title": "SEMI-SKILLED BUILDER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG318", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "WEBSTER", "Contract": "ACTIVE", "FirstName": "JOSHUA", "Job Title": "SEMI-SKILLED BUILDER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG319", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "FRANCIS", "Contract": "ACTIVE", "FirstName": "MAZVANARA", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG325", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "FURAWU", "Contract": "ACTIVE", "FirstName": "KENNY", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG329", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "MAGUSVI", "Contract": "ACTIVE", "FirstName": "TAFADZWA", "Job Title": "SEMI- SKILLED CARPENTER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG331", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "MUZAVA", "Contract": "ACTIVE", "FirstName": "ADMIRE", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG387", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "CHAKUINGA", "Contract": "ACTIVE", "FirstName": "HOWARD", "Job Title": "SEMI-SKILLED BUILDER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG398", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "THOM", "Contract": "ACTIVE", "FirstName": "SIMBARASHE", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG406", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "VARETA", "Contract": "ACTIVE", "FirstName": "TIGHT", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG484", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "NYAMAYARO", "Contract": "ACTIVE", "FirstName": "CLEVER", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG487", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "MUNYARADZI", "Contract": "ACTIVE", "FirstName": "STANLEY", "Job Title": "BUILDER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG504", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "PFUPA", "Contract": "ACTIVE", "FirstName": "PROSPERITY", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG507", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "SIMUDZIRAYI", "Contract": "ACTIVE", "FirstName": "LOVEMORE", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG512", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "CHIKOYA", "Contract": "ACTIVE", "FirstName": "VITALIS", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG537", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "CHIKOYA", "Contract": "ACTIVE", "FirstName": "NIGEL", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG542", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "MBUNDURE", "Contract": "ACTIVE", "FirstName": "EMETI", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG563", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "CHIPENGO", "Contract": "ACTIVE", "FirstName": "PARTSON", "Job Title": "SEMI- SKILLED BUILDER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG564", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "MAKAYI", "Contract": "ACTIVE", "FirstName": "IGNATIOUS", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG613", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "KAMBEWU", "Contract": "ACTIVE", "FirstName": "HARMONY", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG659", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "CHIYANGE", "Contract": "ACTIVE", "FirstName": "GIVEMORE", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG693", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "CHIDHAWU", "Contract": "ACTIVE", "FirstName": "RANGANAI", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG709", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "MUCHEMERANWA", "Contract": "ACTIVE", "FirstName": "JOSHUA", "Job Title": "SCAFFOLDERS ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG710", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "MURONZI", "Contract": "ACTIVE", "FirstName": "EVANS", "Job Title": "SEMI SKILLED BUILDER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG102", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "KADZIMA", "Contract": "ACTIVE", "FirstName": "RICHMORE", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG130", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "KAZUNGA", "Contract": "ACTIVE", "FirstName": "ITAYI", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG154", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MANHANGA", "Contract": "ACTIVE", "FirstName": "STANLEY", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG186", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MAHOVO", "Contract": "ACTIVE", "FirstName": "COURAGE", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG193", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MUSIWA", "Contract": "ACTIVE", "FirstName": "EFTON", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG219", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MUZA", "Contract": "ACTIVE", "FirstName": "CHAMUNORWA", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG226", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "NYAMUKWATURA", "Contract": "ACTIVE", "FirstName": "SIMON", "Job Title": "TEAM LEADER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG326", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "GANDIWA", "Contract": "ACTIVE", "FirstName": "OWEN", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG339", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MAVHUNGA", "Contract": "ACTIVE", "FirstName": "PAUL", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG347", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "KASEKE", "Contract": "ACTIVE", "FirstName": "DYLLAN", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG380", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MANYAMBA", "Contract": "ACTIVE", "FirstName": "SIWASHIRO", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG383", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MUSORA", "Contract": "ACTIVE", "FirstName": "TRUST", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG386", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MATAI", "Contract": "ACTIVE", "FirstName": "TAFADZWA", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG426", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "PHIRI", "Contract": "ACTIVE", "FirstName": "NAPHTALI", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG427", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MAZHAMBE", "Contract": "ACTIVE", "FirstName": "MATHEW", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG439", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MAGWAZA", "Contract": "ACTIVE", "FirstName": "GEORGE", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG445", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "NHAMOYEBONDE", "Contract": "ACTIVE", "FirstName": "KELVIN", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG450", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "HARUMBWI", "Contract": "ACTIVE", "FirstName": "TINASHE", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG451", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MUKWENYA", "Contract": "ACTIVE", "FirstName": "VIRIMAI ANESU", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG492", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "CHAMONYONGA", "Contract": "ACTIVE", "FirstName": "WHITEHEAD", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG493", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "SIREWU", "Contract": "ACTIVE", "FirstName": "CARLINGTON", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG494", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "ARUTURA", "Contract": "ACTIVE", "FirstName": "WELLINGTON", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG496", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "KAMU", "Contract": "ACTIVE", "FirstName": "EDSON", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG497", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "NGULUWE", "Contract": "ACTIVE", "FirstName": "MALVERN", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG498", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MUNANGA", "Contract": "ACTIVE", "FirstName": "BRADELY", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG513", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "KATURA", "Contract": "ACTIVE", "FirstName": "TONDERAI", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG515", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "GOROMONZI", "Contract": "ACTIVE", "FirstName": "TAFADZWA", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG517", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "TEMBO", "Contract": "ACTIVE", "FirstName": "GIFT", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG536", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MOYO", "Contract": "ACTIVE", "FirstName": "THABANI", "Job Title": "DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG624", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "RUSWA", "Contract": "ACTIVE", "FirstName": "PANASHE", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG629", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "NGIRAZI", "Contract": "ACTIVE", "FirstName": "LAMECK", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG630", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "DANDAWA", "Contract": "ACTIVE", "FirstName": "EVIDENCE", "Job Title": "STANDBY DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG632", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "CHIGODO", "Contract": "ACTIVE", "FirstName": "ANYWAY", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG633", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MUDHINDO", "Contract": "ACTIVE", "FirstName": "LIBERTY", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG637", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "FUSIRA", "Contract": "ACTIVE", "FirstName": "REMEMBER", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG657", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MASHIKI", "Contract": "ACTIVE", "FirstName": "ALBERT", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG702", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "TOGAREPI", "Contract": "ACTIVE", "FirstName": "JABULANI", "Job Title": "CLASS 4 DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG733", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "CHIRIMA", "Contract": "ACTIVE", "FirstName": "TATENDA", "Job Title": "ELECTRICIAN ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG757", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "GOZHO", "Contract": "ACTIVE", "FirstName": "ZVIKOMBORERO", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG291", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "GUNJA", "Contract": "ACTIVE", "FirstName": "LEAN", "Job Title": "CORE SHED ATTENDANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG004", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "BHOBHO", "Contract": "ACTIVE", "FirstName": "COLLEN", "Job Title": "TRAINEE GEO TECH", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG013", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "CHITUMBA", "Contract": "ACTIVE", "FirstName": "BIGGIE", "Job Title": "TRAINEE GEO TECH", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG017", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "KARISE", "Contract": "ACTIVE", "FirstName": "KENNETH", "Job Title": "TRAINEE GEO TECH", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG067", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "MAPORISA", "Contract": "ACTIVE", "FirstName": "CHARLES", "Job Title": "SAMPLER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG069", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "CHIDORA", "Contract": "ACTIVE", "FirstName": "PRUDENCE", "Job Title": "SAMPLER RC DRILLING", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG153", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "MAPOSA", "Contract": "ACTIVE", "FirstName": "SHELLINGTON", "Job Title": "SAMPLER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG208", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "CHIMANIKIRE", "Contract": "ACTIVE", "FirstName": "VENGAI", "Job Title": "SAMPLER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG268", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "TAULO", "Contract": "ACTIVE", "FirstName": "ANHTONY", "Job Title": "SAMPLER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG270", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "NDORO", "Contract": "ACTIVE", "FirstName": "TINASHE", "Job Title": "SAMPLER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG280", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "CHAPUKA", "Contract": "ACTIVE", "FirstName": "TAKAWIRA", "Job Title": "SAMPLER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG282", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "CHIKORE", "Contract": "ACTIVE", "FirstName": "ANDERSON", "Job Title": "SAMPLER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG298", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "MADZIVANZIRA", "Contract": "ACTIVE", "FirstName": "NEBIA", "Job Title": "SAMPLER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG302", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "CHINYAMA", "Contract": "ACTIVE", "FirstName": "LINDSAY", "Job Title": "DATA CAPTURE CLERK", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG313", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "GUNI", "Contract": "ACTIVE", "FirstName": "DARLINGTON", "Job Title": "SAMPLER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG321", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "MASHONGANYIKA", "Contract": "ACTIVE", "FirstName": "NIGEL", "Job Title": "SAMPLER (RC DRILLING)", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG381", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "NYANHETE", "Contract": "ACTIVE", "FirstName": "ARCHBORD", "Job Title": "SAMPLER RC DRILLING", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG418", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "NHAURIRO", "Contract": "ACTIVE", "FirstName": "ENIFA", "Job Title": "SAMPLER RC DRILLING", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG453", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "MUCHAZIVEPI", "Contract": "ACTIVE", "FirstName": "MALVERN", "Job Title": "SAMPLER RC DRILLING", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG500", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "MUGARI", "Contract": "ACTIVE", "FirstName": "ABEL", "Job Title": "SAMPLER RC DRILLING", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG501", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "NGOCHO", "Contract": "ACTIVE", "FirstName": "TATENDA", "Job Title": "DATA CAPTURE CLERK", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG502", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "NZVAURA", "Contract": "ACTIVE", "FirstName": "GRACIOUS", "Job Title": "SAMPLER RC DRILLING", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG651", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "NHAMOYEBONDE", "Contract": "ACTIVE", "FirstName": "NYASHA", "Job Title": "SAMPLER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG666", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "MUROIWA", "Contract": "ACTIVE", "FirstName": "MUNYARADZI", "Job Title": "RC SAMPLER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG048", "Gender": "MALE", "SECTION": "SURVEY ", "Surname": "KADZIMA", "Contract": "ACTIVE", "FirstName": "POWERMAN", "Job Title": "SURVEY ASSISTANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG288", "Gender": "MALE", "SECTION": "SURVEY ", "Surname": "CHIZANGA", "Contract": "ACTIVE", "FirstName": "TAURAI", "Job Title": "SURVEY ASSISTANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG300", "Gender": "MALE", "SECTION": "SURVEY ", "Surname": "MASONDO", "Contract": "ACTIVE", "FirstName": "AUSTIN", "Job Title": "SURVEY ASSISTANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG338", "Gender": "MALE", "SECTION": "SURVEY ", "Surname": "NCUBE", "Contract": "ACTIVE", "FirstName": "THABANI", "Job Title": "SURVEY ASSISTANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG416", "Gender": "MALE", "SECTION": "SURVEY ", "Surname": "MAZHAMBE", "Contract": "ACTIVE", "FirstName": "KUDAKWASHE", "Job Title": "SURVEY ASSISTANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG435", "Gender": "MALE", "SECTION": "SURVEY ", "Surname": "DAWA", "Contract": "ACTIVE", "FirstName": "LIBERTY", "Job Title": "SURVEY ASSISTANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG648", "Gender": "MALE", "SECTION": "SURVEY ", "Surname": "MARARA", "Contract": "ACTIVE", "FirstName": "DOMINIC", "Job Title": "SURVEY ASSISTANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG649", "Gender": "MALE", "SECTION": "SURVEY ", "Surname": "SIBANDA", "Contract": "ACTIVE", "FirstName": "VALENTINE", "Job Title": "DRIVER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG730", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "DHAMBUZA", "Contract": "ACTIVE", "FirstName": "KUDZAISHE", "Job Title": "CORE SHED ATTENDANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG770", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "CHINZOU", "Contract": "ACTIVE", "FirstName": "PANASHE", "Job Title": "DRILL RIG ASSISTANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG771", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "CHIKUKWA", "Contract": "ACTIVE", "FirstName": "ANTHONY", "Job Title": "DRILL RIG ASSISTANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG772", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "MUTSIKIWA", "Contract": "ACTIVE", "FirstName": "JEMITINOS", "Job Title": "CORE SHED ATTENDANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG773", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "JAVANGWE", "Contract": "ACTIVE", "FirstName": "REJOICE", "Job Title": "DRILL RIG ASSISTANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG774", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "MUNYENYIWA", "Contract": "ACTIVE", "FirstName": "TATENDA", "Job Title": "DRILL RIG ASSISTANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG775", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "MAVHURA", "Contract": "ACTIVE", "FirstName": "TONDERAI", "Job Title": "DRILL RIG ASSISTANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG776", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "MASVANHISE", "Contract": "ACTIVE", "FirstName": "PRINCE", "Job Title": "DRILL RIG ASSISTANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG112", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MAPULAZI", "Contract": "ACTIVE", "FirstName": "MANUEL", "Job Title": "CIL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG200", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KASEKE", "Contract": "ACTIVE", "FirstName": "NYASHA", "Job Title": "RELIEF CREW ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG370", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "NYASULO", "Contract": "ACTIVE", "FirstName": "BESON", "Job Title": "CIL OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG403", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIHWAKU", "Contract": "ACTIVE", "FirstName": "DADIRAI", "Job Title": "GENERAL ASSISTANT CIL", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG480", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIBHAGU", "Contract": "ACTIVE", "FirstName": "THELMA", "Job Title": "GENERAL PLANT ATTENDANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG521", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "WANJOWA", "Contract": "ACTIVE", "FirstName": "MAXWELL", "Job Title": "CIL OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG551", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "GUDO", "Contract": "ACTIVE", "FirstName": "LAWRENCIOUS", "Job Title": "GENERAL PLANT ATTENDANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG247", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KADAIRA", "Contract": "ACTIVE", "FirstName": "HILTON", "Job Title": "ELUTION & REAGENTS ASSIST", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG371", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "PITCHES", "Contract": "ACTIVE", "FirstName": "UMALI", "Job Title": "ELUTION OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG373", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "PARADZAYI", "Contract": "ACTIVE", "FirstName": "EMMANUEL", "Job Title": "ELUTION OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG375", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MUZIRA", "Contract": "ACTIVE", "FirstName": "FARAI", "Job Title": "ELUTION OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG420", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIKOYA", "Contract": "ACTIVE", "FirstName": "MELODY", "Job Title": "RELIEF CREW ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG466", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MANYANGE", "Contract": "ACTIVE", "FirstName": "VENGESAI", "Job Title": "ELUTION ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG011", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHINGUWA", "Contract": "ACTIVE", "FirstName": "AUGUSTINE", "Job Title": "BALLMILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG052", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MUSIIWA", "Contract": "ACTIVE", "FirstName": "DUNGISANI", "Job Title": "HOUSE KEEPING ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG183", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIZANGA", "Contract": "ACTIVE", "FirstName": "KUDZAI", "Job Title": "HOUSE KEEPING ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG211", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MURANDA", "Contract": "ACTIVE", "FirstName": "NATHANIEL", "Job Title": "HOUSE KEEPING ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG213", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "NGWENYA", "Contract": "ACTIVE", "FirstName": "SAFASONGE", "Job Title": "LEAVE RELIEF CREW", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG461", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KATUMBA", "Contract": "ACTIVE", "FirstName": "ASHWIN", "Job Title": "LEAVE RELIEF CREW", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG485", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KADZVITI", "Contract": "ACTIVE", "FirstName": "LAWRENCE", "Job Title": "RELIEF CREW ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG486", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "BAKACHEZA", "Contract": "ACTIVE", "FirstName": "ELASTO", "Job Title": "GENERAL MILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG514", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MANHANGA", "Contract": "ACTIVE", "FirstName": "LOVEJOY", "Job Title": "HOUSE KEEPING ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG568", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "DZIMBIRI", "Contract": "ACTIVE", "FirstName": "CARLTON", "Job Title": "GENERAL PLANT ATTENDANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG570", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KADZIMA", "Contract": "ACTIVE", "FirstName": "FURTHERSTEP", "Job Title": "HOUSE KEEPING ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG589", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MUBAIWA", "Contract": "ACTIVE", "FirstName": "NOBERT", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG597", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "TINANI", "Contract": "ACTIVE", "FirstName": "TENDAI", "Job Title": "HOUSE KEEPING ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG598", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIGODO", "Contract": "ACTIVE", "FirstName": "BEHAVE", "Job Title": "BALLMILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG672", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MASERE", "Contract": "ACTIVE", "FirstName": "DARLINGTON", "Job Title": "PLUMBER ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG287", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIRUME", "Contract": "ACTIVE", "FirstName": "LATIFAN", "Job Title": "METALLURGICAL CLERK", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG583", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "ZAMANI", "Contract": "ACTIVE", "FirstName": "NYASHA", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG703", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "TAPOMWA", "Contract": "ACTIVE", "FirstName": "TAFADZWA", "Job Title": "PLANT LAB ATTENDANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG063", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "SHERENI", "Contract": "ACTIVE", "FirstName": "PETROS", "Job Title": "GENERAL MILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG072", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KASIMO", "Contract": "ACTIVE", "FirstName": "ADMIRE", "Job Title": "TAILINGS STORAGE FACILITY ASSIST", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG194", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "NHAMOYEBONDE", "Contract": "ACTIVE", "FirstName": "ANTONY", "Job Title": "BALLMILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG195", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "NYAZIKA", "Contract": "ACTIVE", "FirstName": "SELBORNE CHENGETAI", "Job Title": "BALLMILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG205", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MASANGO", "Contract": "ACTIVE", "FirstName": "DONALD", "Job Title": "BALLMILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG266", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHESANGO", "Contract": "ACTIVE", "FirstName": "LIBERTY", "Job Title": "TAILINGS STORAGE FACILITY ASSIST", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG279", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "BRIAN", "Contract": "ACTIVE", "FirstName": "LAMECK", "Job Title": "BALLMILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG327", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "NYIKADZINO", "Contract": "ACTIVE", "FirstName": "WELLINGTON", "Job Title": "HOUSE KEEPING ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG333", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "GOVHA", "Contract": "ACTIVE", "FirstName": "BELIEVE", "Job Title": "BALLMILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG336", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "NYIKADZINO", "Contract": "ACTIVE", "FirstName": "CLEMENCE KURAUONE", "Job Title": "BALLMILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG345", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "BGWANYA", "Contract": "ACTIVE", "FirstName": "TARUVINGA", "Job Title": "BALLMILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG353", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "GONDO", "Contract": "ACTIVE", "FirstName": "MAXWELL", "Job Title": "BALLMILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG374", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MAGWENZI", "Contract": "ACTIVE", "FirstName": "ANYWAY", "Job Title": "MILL OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG376", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIYANDO", "Contract": "ACTIVE", "FirstName": "SHADRECK", "Job Title": "MILL OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG401", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIPATO", "Contract": "ACTIVE", "FirstName": "FARAI", "Job Title": "MILL OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG539", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIRIMUJIRI", "Contract": "ACTIVE", "FirstName": "KELVIN", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG541", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KARAMBWE", "Contract": "ACTIVE", "FirstName": "ELISHA", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG546", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MGUQUKA", "Contract": "ACTIVE", "FirstName": "NKOSIYABO", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG010", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIMUTU", "Contract": "ACTIVE", "FirstName": "JOFFREY", "Job Title": "BALLMILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG030", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "NGONI", "Contract": "ACTIVE", "FirstName": "ELISHA", "Job Title": "PRIMARY CRUSHER OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG079", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KAKONO", "Contract": "ACTIVE", "FirstName": "DAIROD", "Job Title": "PRIMARY CRUSHER OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG131", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MUZHONA", "Contract": "ACTIVE", "FirstName": "GRACIOUS", "Job Title": "PRIMARY CRUSHER ATTENDANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG134", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHARAMBIRA", "Contract": "ACTIVE", "FirstName": "GAINMORE", "Job Title": "PRIMARY CRUSHER ATTENDANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG199", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "LAPKEN", "Contract": "ACTIVE", "FirstName": "KENNETH", "Job Title": "PRIMARY CRUSHER ATTENDANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG276", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "ZILAKA", "Contract": "ACTIVE", "FirstName": "SOLOMON", "Job Title": "PRIMARY CRUSHER ATTENDANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG278", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "BOTE", "Contract": "ACTIVE", "FirstName": "TERRENCE", "Job Title": "PRIMARY CRUSHING OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG293", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KAHUMWE", "Contract": "ACTIVE", "FirstName": "DAVIES", "Job Title": "PRIMARY CRUSHER ATTENDANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG742", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KAISI", "Contract": "ACTIVE", "FirstName": "JAMES", "Job Title": "THICKENER OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG743", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHANYUKA", "Contract": "ACTIVE", "FirstName": "ANDREW", "Job Title": "THICKENER OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG744", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MKANDAWIRE", "Contract": "ACTIVE", "FirstName": "DIVASON", "Job Title": "THICKENER OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG722", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MUNYORO", "Contract": "ACTIVE", "FirstName": "NEHEMIAH", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG035", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "PHIRI", "Contract": "ACTIVE", "FirstName": "ENOCK", "Job Title": "HOUSE KEEPING ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG074", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIHOKO", "Contract": "ACTIVE", "FirstName": "CYRUS", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG377", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "GWATA", "Contract": "ACTIVE", "FirstName": "TINASHE", "Job Title": "REAGENTS & SMELTING CONTROLLER", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG457", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIDEMO", "Contract": "ACTIVE", "FirstName": "AGGRIPPA", "Job Title": "REAGENTS & SMELTING ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG058", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MUDIWA", "Contract": "ACTIVE", "FirstName": "ALBERT", "Job Title": "GENERAL SECONDARY & TERTIARY CRUSHING ASSIST", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG142", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MATAMA", "Contract": "ACTIVE", "FirstName": "MCNELL", "Job Title": "GENERAL SECONDARY & TERTIARY CRUSHING ASSIST", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG143", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "NZVAURA", "Contract": "ACTIVE", "FirstName": "ADDLIGHT", "Job Title": "SECONDARY & TERTIARY CRUSHER OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG181", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHITANHAMAPIRA", "Contract": "ACTIVE", "FirstName": "JACOB", "Job Title": "GENERAL SECONDARY & TERTIARY CRUSHING ASSIST", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG184", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KUGOTSI", "Contract": "ACTIVE", "FirstName": "HAMLET", "Job Title": "SECONDARY & TERTIARY CRUSHER OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG188", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MARIME", "Contract": "ACTIVE", "FirstName": "FOSTER", "Job Title": "SECONDARY & TERTIARY CRUSHER OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG237", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHANETSA", "Contract": "ACTIVE", "FirstName": "PRAISE K", "Job Title": "GENERAL MILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG281", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIGWADA", "Contract": "ACTIVE", "FirstName": "FORGET", "Job Title": "GENERAL SECONDARY & TERTIARY CRUSHING ASSIST", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG355", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MAPURANGA", "Contract": "ACTIVE", "FirstName": "TATENDA", "Job Title": "GENERAL SECONDARY & TERTIARY CRUSHING ASSIST", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG003", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "BHANDA", "Contract": "ACTIVE", "FirstName": "BHANDASON", "Job Title": "TAILINGS STORAGE FACILITY OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG036", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "PHIRI", "Contract": "ACTIVE", "FirstName": "GIVEMORE", "Job Title": "TAILINGS STORAGE FACILITY OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG065", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "RUNZIRA", "Contract": "ACTIVE", "FirstName": "KUDAKWASHE", "Job Title": "TAILINGS STORAGE FACILITY OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG071", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MAPIRA", "Contract": "ACTIVE", "FirstName": "ALBERT", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG103", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MUTAYI", "Contract": "ACTIVE", "FirstName": "FIDELIS", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG127", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "BUNGU", "Contract": "ACTIVE", "FirstName": "LEONARD", "Job Title": "GENERAL MILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG128", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KAVINGA", "Contract": "ACTIVE", "FirstName": "FRIDAY", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG133", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KUMBONJE", "Contract": "ACTIVE", "FirstName": "LAMECK", "Job Title": "GENERAL HAND", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG144", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "TAULO", "Contract": "ACTIVE", "FirstName": "NOEL", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG146", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MUNETSI", "Contract": "ACTIVE", "FirstName": "ELISHA", "Job Title": "BALLMILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG156", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KOMBONI", "Contract": "ACTIVE", "FirstName": "MAKOMBORERO", "Job Title": "TAILINGS STORAGE FACILITY ASSIST", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG189", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MARIMO", "Contract": "ACTIVE", "FirstName": "ELIAS", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG285", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIMANIKIRE", "Contract": "ACTIVE", "FirstName": "COSMAS", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG296", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KASEKE", "Contract": "ACTIVE", "FirstName": "TAKUDZWA", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG340", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MACHAKARI", "Contract": "ACTIVE", "FirstName": "AMOS", "Job Title": "TEAM LEADER", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG343", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KUSIKWENYU", "Contract": "ACTIVE", "FirstName": "STACIOUS", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG394", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "NHAUCHURU", "Contract": "ACTIVE", "FirstName": "PRINCE", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG433", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MUKWENYA", "Contract": "ACTIVE", "FirstName": "TAWANDA", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG503", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KAZUNGA", "Contract": "ACTIVE", "FirstName": "RICHARD", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG506", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "JACK", "Contract": "ACTIVE", "FirstName": "COASTER", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG509", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIGODHO", "Contract": "ACTIVE", "FirstName": "MILTON", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG511", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "TAMBUDZA", "Contract": "ACTIVE", "FirstName": "WISE", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG639", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MARAMBA", "Contract": "ACTIVE", "FirstName": "ELVIS", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG640", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "PARWARINGIRA", "Contract": "ACTIVE", "FirstName": "TINOTENDA", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG641", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MAKREYA", "Contract": "ACTIVE", "FirstName": "TAFADZWA", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG664", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MUFUMBIRA", "Contract": "ACTIVE", "FirstName": "TENDEKAI", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG717", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIHLABA", "Contract": "ACTIVE", "FirstName": "TANAKA", "Job Title": "GENERAL PLANT ATTENDANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG718", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MAVESERE", "Contract": "ACTIVE", "FirstName": "TANAKA", "Job Title": "GENERAL PLANT ATTENDANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG132", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "NYAMAVABVU", "Contract": "ACTIVE", "FirstName": "KELVIN KUDAKWASHE", "Job Title": "CCTV OPERATOR", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG221", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "CHITIKI", "Contract": "ACTIVE", "FirstName": "MARGARET", "Job Title": "CCTV OPERATOR", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG419", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "CHIFWAFWA", "Contract": "ACTIVE", "FirstName": "AUDREY", "Job Title": "CCTV OPERATOR", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG434", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "BENNY", "Contract": "ACTIVE", "FirstName": "CHONDE", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG476", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "VELLEM", "Contract": "ACTIVE", "FirstName": "NIXON", "Job Title": "CCTV OPERATOR", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG530", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "MAGURA", "Contract": "ACTIVE", "FirstName": "TONGAI", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG545", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "GUNJA", "Contract": "ACTIVE", "FirstName": "SYLVESTER", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG571", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "KUGOTSI", "Contract": "ACTIVE", "FirstName": "CHRISTOPHER", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG580", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "KAZUNGA", "Contract": "ACTIVE", "FirstName": "SIMBARASHE", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG588", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "MBUNDURE", "Contract": "ACTIVE", "FirstName": "SINCEWELL", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG591", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "MAZHAMBE", "Contract": "ACTIVE", "FirstName": "IRVINE", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG620", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "CHAPANDA", "Contract": "ACTIVE", "FirstName": "TADIWANASHE", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG652", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "MBEREKO", "Contract": "ACTIVE", "FirstName": "LYTON", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG720", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "REVAI", "Contract": "ACTIVE", "FirstName": "EDMORE", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG723", "Gender": "MALE", "SECTION": "SHEQ", "Surname": "NATANI", "Contract": "ACTIVE", "FirstName": "BIANCAH", "Job Title": "FIRST AID TRAINER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG049", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "CHIKOYA", "Contract": "ACTIVE", "FirstName": "PHILLIP", "Job Title": "HANDYMAN", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG050", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "CHIKOYA", "Contract": "ACTIVE", "FirstName": "MARK", "Job Title": "WELFARE WORKER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG090", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "CHIGWENJERE", "Contract": "ACTIVE", "FirstName": "TANATSA", "Job Title": "COOK", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG091", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "CHIMBUMU", "Contract": "ACTIVE", "FirstName": "VINCENT", "Job Title": "COOK", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG093", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "CHITIKI", "Contract": "ACTIVE", "FirstName": "MASS", "Job Title": "TEAM LEADER HOUSEKEEPING", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG094", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "CHIDANGURO", "Contract": "ACTIVE", "FirstName": "GLADYS", "Job Title": "HOUSEKEEPER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG095", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "MUKANDAVANHU", "Contract": "ACTIVE", "FirstName": "RANGANAI", "Job Title": "LAUNDRY ATTENDANT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG099", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "BUNGU", "Contract": "ACTIVE", "FirstName": "JIMMINIC", "Job Title": "TEAM LEADER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG180", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "CHIMANIKIRE", "Contract": "ACTIVE", "FirstName": "TAFIRENYIKA", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG206", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "CHIDENYIKA", "Contract": "ACTIVE", "FirstName": "GUESFORD", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG236", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "BUNGU", "Contract": "ACTIVE", "FirstName": "SILENT", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG290", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "GARINGA", "Contract": "ACTIVE", "FirstName": "CHRISTOPHER", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG364", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "MAZHAMBE", "Contract": "ACTIVE", "FirstName": "RICHMORE", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG389", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "KAPIYA", "Contract": "ACTIVE", "FirstName": "SILENT", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG399", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "MANDIVAVARIRA", "Contract": "ACTIVE", "FirstName": "LUWESI", "Job Title": "HOUSEKEEPER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG400", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "CHINYAMA", "Contract": "ACTIVE", "FirstName": "GETRUDE", "Job Title": "HOUSEKEEPER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG436", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "JACK", "Contract": "ACTIVE", "FirstName": "ELIZARY", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG454", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "MUSHONGA", "Contract": "ACTIVE", "FirstName": "CLARA", "Job Title": "LAUNDRY ATTENDANT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG458", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "JENGENI", "Contract": "ACTIVE", "FirstName": "SHARON", "Job Title": "HOUSEKEEPER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG459", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "SITHOLE", "Contract": "ACTIVE", "FirstName": "LILY", "Job Title": "COOK", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG460", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "GWANDE", "Contract": "ACTIVE", "FirstName": "KURAUONE", "Job Title": "COOK", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG462", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "CHIMBAMBO", "Contract": "ACTIVE", "FirstName": "SIMBARASHE", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG463", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "NYAMBO", "Contract": "ACTIVE", "FirstName": "ANGELINE", "Job Title": "HOUSEKEEPER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG464", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "MAHASO", "Contract": "ACTIVE", "FirstName": "MOREBLESSING", "Job Title": "LAUNDRY ATTENDANT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG518", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "GAUKA", "Contract": "ACTIVE", "FirstName": "TRUSTER", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG549", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "MANYIKA", "Contract": "ACTIVE", "FirstName": "LIANA", "Job Title": "HOUSEKEEPER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG599", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "NYAHUMA", "Contract": "ACTIVE", "FirstName": "IGNATIOUS", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG653", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "KONDO", "Contract": "ACTIVE", "FirstName": "WESLEY", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG658", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "CHIRAPA", "Contract": "ACTIVE", "FirstName": "LUXMORE", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG660", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "THOMAS", "Contract": "ACTIVE", "FirstName": "IGNATIOUS", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG661", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "KADAIRA", "Contract": "ACTIVE", "FirstName": "INNOCENT", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG662", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "TONGOFA", "Contract": "ACTIVE", "FirstName": "PRECIOUS", "Job Title": "HOUSE KEEPER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG687", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "KAWARA", "Contract": "ACTIVE", "FirstName": "AGATHA", "Job Title": "HOUSE KEEPER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG715", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "KARASA", "Contract": "ACTIVE", "FirstName": "SHARON", "Job Title": "KITCHEN PORTER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG716", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "CHIKOYA", "Contract": "ACTIVE", "FirstName": "THERESA", "Job Title": "KITCHEN PORTER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG759", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "MAFAIROSI", "Contract": "ACTIVE", "FirstName": "LEARNMORE", "Job Title": "HOUSE KEEPER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG768", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "MENAD", "Contract": "ACTIVE", "FirstName": "ELENA", "Job Title": "HOUSEKEEPER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG769", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "CHAMBURUMBUDZA", "Contract": "ACTIVE", "FirstName": "TSITSI", "Job Title": "HOUSEKEEPER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG783", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "MACHIPISA", "Contract": "ACTIVE", "FirstName": "MILLICENT", "Job Title": "COOK", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG785", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "MATYORAUTA", "Contract": "ACTIVE", "FirstName": "JOSEPHINE", "Job Title": "HOUSE KEEPER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG786", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "MUTSVENGURI", "Contract": "ACTIVE", "FirstName": "FOYLINE", "Job Title": "HOUSE KEEPER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG002", "Gender": "MALE", "SECTION": "STORES", "Surname": "BANDERA", "Contract": "ACTIVE", "FirstName": "MARK", "Job Title": "SENIOR STORES CLERK", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG038", "Gender": "MALE", "SECTION": "STORES", "Surname": "RUWO", "Contract": "ACTIVE", "FirstName": "TAMBURAI", "Job Title": "STORES CLERK", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG070", "Gender": "MALE", "SECTION": "STORES", "Surname": "MAVUNGA", "Contract": "ACTIVE", "FirstName": "JUSTICE", "Job Title": "STORES CLERK", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG086", "Gender": "MALE", "SECTION": "STORES", "Surname": "SIMANI", "Contract": "ACTIVE", "FirstName": "RASHEED", "Job Title": "STORES CLERK", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG197", "Gender": "MALE", "SECTION": "STORES", "Surname": "WAMBE", "Contract": "ACTIVE", "FirstName": "INNOCENT", "Job Title": "STORES CLERK", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG240", "Gender": "MALE", "SECTION": "STORES", "Surname": "CHIBAGU", "Contract": "ACTIVE", "FirstName": "CALISTO", "Job Title": "STOREKEEPER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG262", "Gender": "MALE", "SECTION": "STORES", "Surname": "CHINYAMA", "Contract": "ACTIVE", "FirstName": "ROBSON", "Job Title": "STORES CLERK", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG341", "Gender": "MALE", "SECTION": "STORES", "Surname": "MASHONGANYIKA", "Contract": "ACTIVE", "FirstName": "RAPHAEL", "Job Title": "STORES CLERK", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG366", "Gender": "MALE", "SECTION": "STORES", "Surname": "MUFENGI", "Contract": "ACTIVE", "FirstName": "MAXWELL", "Job Title": "STORES CLERK", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG404", "Gender": "MALE", "SECTION": "STORES", "Surname": "TARUVINGA", "Contract": "ACTIVE", "FirstName": "EUNICE", "Job Title": "SENIOR STORES CLERK", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG582", "Gender": "MALE", "SECTION": "STORES", "Surname": "MARANGE", "Contract": "ACTIVE", "FirstName": "CECIL", "Job Title": "STORES CLERK", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG075", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "BHANDA", "Contract": "ACTIVE", "FirstName": "THEOPHELOUS", "Job Title": "APPRENTICE", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG158", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MATIBIRI", "Contract": "ACTIVE", "FirstName": "PROSPER A", "Job Title": "APPRENTICE", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG320", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "DHINGA", "Contract": "ACTIVE", "FirstName": "WELCOME", "Job Title": "APPRENTICE", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG346", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "CHIFAMBA", "Contract": "ACTIVE", "FirstName": "CALVIN", "Job Title": "APPRENTICE", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG488", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "TAULO", "Contract": "ACTIVE", "FirstName": "RONALD", "Job Title": "APPRENTICE BOILERMAKER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG682", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MAZANI", "Contract": "ACTIVE", "FirstName": "FUNGISAI", "Job Title": "APPRENTICE", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG683", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MACHEKA", "Contract": "ACTIVE", "FirstName": "ELIAS", "Job Title": "APPRENTICE", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG684", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "CHIGWESHE", "Contract": "ACTIVE", "FirstName": "TANDIRAYI", "Job Title": "APPRENTICE", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG685", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MANYANGE", "Contract": "ACTIVE", "FirstName": "BYL", "Job Title": "APPRENTICE", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG686", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MAZARA", "Contract": "ACTIVE", "FirstName": "TAKUNDA", "Job Title": "APPRENTICE", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG747", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MAIMBE", "Contract": "ACTIVE", "FirstName": "CEPHAS", "Job Title": "STUDENT ON ATTACHEMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG750", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MAKUNDE", "Contract": "ACTIVE", "FirstName": "CONSTANCE", "Job Title": "STUDENT ON ATTACHEMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG751", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "ZENGEYA", "Contract": "ACTIVE", "FirstName": "GILBERT", "Job Title": "STUDENT ON ATTACHEMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG752", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "BHENHURA", "Contract": "ACTIVE", "FirstName": "TRACEY", "Job Title": "STUDENT ON ATTACHEMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG753", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "NGWARU", "Contract": "ACTIVE", "FirstName": "TANAKA", "Job Title": "STUDENT ON ATTACHEMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG754", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "ARUBINU", "Contract": "ACTIVE", "FirstName": "MANUEL", "Job Title": "STUDENT ON ATTACHEMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG755", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MUNOCHIWEYI", "Contract": "ACTIVE", "FirstName": "LEVONIA", "Job Title": "STUDENT ON ATTACHEMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG756", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "TENENE", "Contract": "ACTIVE", "FirstName": "ANESU", "Job Title": "STUDENT ON ATTACHEMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG762", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MADZVAMUSE", "Contract": "ACTIVE", "FirstName": "MUFARO", "Job Title": "STUDENT ON ATTACHMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG764", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "GATSI", "Contract": "ACTIVE", "FirstName": "DONALD", "Job Title": "STUDENT ON ATTACHMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG765", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "DZURO", "Contract": "ACTIVE", "FirstName": "ASHGRACE", "Job Title": "STUDENT ON ATTACHMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG766", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MUSARURWA", "Contract": "ACTIVE", "FirstName": "MOTION", "Job Title": "STUDENT ON ATTACHMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG767", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "DHLEMBEU", "Contract": "ACTIVE", "FirstName": "DADISO", "Job Title": "STUDENT ON ATTACHMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG777", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MAKULUNGA", "Contract": "ACTIVE", "FirstName": "TADIWANASHE", "Job Title": "STUDENT ON ATTACHMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG779", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "NDLOVU", "Contract": "ACTIVE", "FirstName": "SHINGIRIRAI", "Job Title": "STUDENT ON ATTACHMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG780", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "KADYE", "Contract": "ACTIVE", "FirstName": "TENDAI", "Job Title": "STUDENT ON ATTACHMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG781", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "KUMHANDA", "Contract": "ACTIVE", "FirstName": "DESMOND", "Job Title": "STUDENT ON ATTACHMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG782", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MAREGERE", "Contract": "ACTIVE", "FirstName": "TIVAKUDZE", "Job Title": "STUDENT ON ATTACHMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}], "skipDuplicates": true}, "query": {}, "params": {}}	{"url": "/api/v1/employees/bulk-upload", "method": "POST"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-16 15:16:40.698+02	37510ceb-5798-4c70-b7f5-341a18aa99ec
033e1d84-3b43-4aba-aad8-9cc932c60e1b	CREATE	User	c38cc55b-0530-405b-b48d-02465d7a402b	{"body": {"roleId": "368f923b-981d-4eee-a55f-09e1d71d65ee", "password": "qwerty123", "username": "dp130", "sectionId": "", "employeeId": "ec717f73-15e6-44f7-ad7e-67ffa5c7d61f", "departmentId": ""}, "query": {}, "params": {}}	{"url": "/api/v1/users/promote-employee", "method": "POST"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-16 16:41:54.625+02	37510ceb-5798-4c70-b7f5-341a18aa99ec
13ba52f9-c355-441d-9eeb-e9145b19467b	LOGIN	User	c38cc55b-0530-405b-b48d-02465d7a402b	\N	{"ip": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-16 16:42:56.101+02	c38cc55b-0530-405b-b48d-02465d7a402b
09ff28e3-7210-467f-beb3-a9beff76e66b	BULK_CREATE	PPEItem	\N	{"body": {"items": [{"name": "Aluminised Thermal Suit", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-ALUTHERM", "sizeScale": "CLOTHING", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Amour Bunker Suit", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-AMBUNK", "sizeScale": "CLOTHING", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Bee Catcher's Suit", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-BEECATCH", "sizeScale": "CLOTHING", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Chef's Jacket", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-CHEFJKT", "sizeScale": "CLOTHING", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Cotton Worksuit Blue Elastic Cuff", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-CWSBLUE", "sizeScale": "CLOTHING", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Firefighting Suit", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-FIRESUIT", "sizeScale": "CLOTHING", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Ladies' Worksuit Blue", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-LWSBLUE", "sizeScale": "CLOTHING", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Ladies' Worksuit Reflective", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-LWSREFL", "sizeScale": "CLOTHING", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Life Jacket Adult Size", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-LIFEJKT", "sizeScale": "CLOTHING", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "PVC Rain Suits", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-PVCRAIN", "sizeScale": "CLOTHING", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Rain Suits", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-RAINSUT", "sizeScale": "CLOTHING", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Reflective Cotton Worksuits White", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-RCWSWHT", "sizeScale": "CLOTHING", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Reflective Blue Worksuit", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-RWSBLUE", "sizeScale": "CLOTHING", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Reflective Vest", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-REFLVST", "sizeScale": "CLOTHING", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Reflective Vest Long Sleeve", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-REFLVLS", "sizeScale": "CLOTHING", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Shirt Cotton Orange & Navy", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-SHRTORN", "sizeScale": "CLOTHING", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Shirt Cotton Lime & Navy", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-SHRTLMN", "sizeScale": "CLOTHING", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Shirt Short Navy & Lime", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-SHSTNVL", "sizeScale": "CLOTHING", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Shirt Short Orange & Lime", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-SHSTORL", "sizeScale": "CLOTHING", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Sinking Suit Reflective", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-SINKREF", "sizeScale": "CLOTHING", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Thermal Trousers", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-THERMTR", "sizeScale": "CLOTHING", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Trousers Cotton Navy", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-TRSCNVY", "sizeScale": "CLOTHING", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Welding Jacket", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-WELDJKT", "sizeScale": "CLOTHING", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "White Lab Coats", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-LABCOAT", "sizeScale": "CLOTHING", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Winter Jacket Reflective", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-WINJKTR", "sizeScale": "CLOTHING", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Winter Suit", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-WINSUT", "sizeScale": "CLOTHING", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Winter Jacket", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-WINJKT", "sizeScale": "CLOTHING", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Worksuit Blue Cotton", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-WSBLCOT", "sizeScale": "CLOTHING", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Worksuit Green Acid Proof", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-WSGRACID", "sizeScale": "CLOTHING", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Worksuit Navy Flame Retardant", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-WSNVFR", "sizeScale": "CLOTHING", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Worksuit White Cotton", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-WSWHTCOT", "sizeScale": "CLOTHING", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Worksuit Yellow Cotton", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-WSYELCOT", "sizeScale": "CLOTHING", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Worksuit Cotton Blue", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-WSCOTBL", "sizeScale": "CLOTHING", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Worksuit Red Flame Retardant", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-WSREDFR", "sizeScale": "CLOTHING", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Worksuite Green Cotton", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-WSGRCOT", "sizeScale": "CLOTHING", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Black Jean (Pair)", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-JEANBLK", "sizeScale": "CLOTHING", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Blue Jean (Pair)", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-JEANBLU", "sizeScale": "CLOTHING", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Safety Harness", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-SAFHARNS", "sizeScale": "CLOTHING", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Kidney Belts", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-KIDNBELT", "sizeScale": "CLOTHING", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Leather Apron", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-LTHRAPN", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "PVC Apron", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-PVCAPRON", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Ear Muffs Red", "unit": "EA", "category": "EARS", "itemCode": "EA-EARMUFR", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Earplugs", "unit": "EA", "category": "EARS", "itemCode": "EA-EARPLUG", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Gum Shoe Steel Toe", "unit": "EA", "category": "FEET", "itemCode": "FT-GUMSHOS", "sizeScale": "SHOES", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Ladies Safety Shoe", "unit": "EA", "category": "FEET", "itemCode": "FT-LADSAF", "sizeScale": "SHOES", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Ladies Safety Shoe High Cut", "unit": "EA", "category": "FEET", "itemCode": "FT-LADSAFHC", "sizeScale": "SHOES", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Safety Shoe Executive", "unit": "EA", "category": "FEET", "itemCode": "FT-SAFEXEC", "sizeScale": "SHOES", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Safety Shoe Steel Toe", "unit": "EA", "category": "FEET", "itemCode": "FT-SAFSTOE", "sizeScale": "SHOES", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Safety Shoe High Cut", "unit": "EA", "category": "FEET", "itemCode": "FT-SAFHICUT", "sizeScale": "SHOES", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Viking Fire Fighting Boots", "unit": "EA", "category": "FEET", "itemCode": "FT-VIKFIRE", "sizeScale": "SHOES", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Electrical Rubber Gloves", "unit": "EA", "category": "HANDS", "itemCode": "HD-ELECRUB", "sizeScale": "GLOVES", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Household Gloves", "unit": "EA", "category": "HANDS", "itemCode": "HD-HOUSEHD", "sizeScale": "GLOVES", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Leather Gloves Long", "unit": "EA", "category": "HANDS", "itemCode": "HD-LTHRLNG", "sizeScale": "GLOVES", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Leather Gloves Short", "unit": "EA", "category": "HANDS", "itemCode": "HD-LTHRSHT", "sizeScale": "GLOVES", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Nylon Gloves", "unit": "EA", "category": "HANDS", "itemCode": "HD-NYLONGL", "sizeScale": "GLOVES", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Pig Skin Gloves", "unit": "EA", "category": "HANDS", "itemCode": "HD-PIGSKIN", "sizeScale": "GLOVES", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Fire Fighting Gloves", "unit": "EA", "category": "HANDS", "itemCode": "HD-FIREGLV", "sizeScale": "GLOVES", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "PVC Gloves Long", "unit": "EA", "category": "HANDS", "itemCode": "HD-PVCLNG", "sizeScale": "GLOVES", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "PVC Gloves Short", "unit": "EA", "category": "HANDS", "itemCode": "HD-PVCSHT", "sizeScale": "GLOVES", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Red Heat Resistant Gloves", "unit": "EA", "category": "HANDS", "itemCode": "HD-HEATRES", "sizeScale": "GLOVES", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Thermal Winter Gloves", "unit": "EA", "category": "HANDS", "itemCode": "HD-THERMWN", "sizeScale": "GLOVES", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "6 Point Hard Hat Liner", "unit": "EA", "category": "HEAD", "itemCode": "HE-6PTLINR", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Balaclava", "unit": "EA", "category": "HEAD", "itemCode": "HE-BALCLVA", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Balaclava Hat", "unit": "EA", "category": "HEAD", "itemCode": "HE-BALCHAT", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Fire Fighting Helmet", "unit": "EA", "category": "HEAD", "itemCode": "HE-FIREHLM", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Cordless Caplamp", "unit": "EA", "category": "HEAD", "itemCode": "HE-CAPLAMP", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Hard Hat", "unit": "EA", "category": "HEAD", "itemCode": "HE-HARDHAT", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Hard Hat Chin Straps", "unit": "EA", "category": "HEAD", "itemCode": "HE-HHCHIN", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Hard Hat Liner", "unit": "EA", "category": "HEAD", "itemCode": "HE-HHLINER", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Hard Hat Gray", "unit": "EA", "category": "HEAD", "itemCode": "HE-HHGRAY", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Sun Brim", "unit": "EA", "category": "HEAD", "itemCode": "HE-SUNBRIM", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Sun Visor", "unit": "EA", "category": "HEAD", "itemCode": "HE-SUNVISR", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Thermal Woolen Hat", "unit": "EA", "category": "HEAD", "itemCode": "HE-THERMWL", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Welding Helmet", "unit": "EA", "category": "HEAD", "itemCode": "HE-WELDHLM", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Welding Helmet Inner Cap", "unit": "EA", "category": "HEAD", "itemCode": "HE-WHLMCAP", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Knee Cap", "unit": "EA", "category": "LEGS/LOWER/KNEES", "itemCode": "LK-KNEECAP", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Leather Spats", "unit": "EA", "category": "LEGS/LOWER/KNEES", "itemCode": "LK-LTHSPAT", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Chef's Neckerchief", "unit": "EA", "category": "NECK", "itemCode": "NK-CHEFNCK", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Neckerchief", "unit": "EA", "category": "NECK", "itemCode": "NK-NECKCHF", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Welding Neck Protector", "unit": "EA", "category": "NECK", "itemCode": "NK-WELDNCK", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "3M Respirator Cartridge", "unit": "EA", "category": "RESPIRATORY", "itemCode": "RS-3MCART", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "3M Respirator Filters", "unit": "EA", "category": "RESPIRATORY", "itemCode": "RS-3MFILT", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "3M Respirator Full Face", "unit": "EA", "category": "RESPIRATORY", "itemCode": "RS-3MFULL", "sizeScale": "RESPIRATOR", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "3M Respirator Half Mask", "unit": "EA", "category": "RESPIRATORY", "itemCode": "RS-3MHALF", "sizeScale": "RESPIRATOR", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "3M Respirator Retainers", "unit": "EA", "category": "RESPIRATORY", "itemCode": "RS-3MRETN", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "CPR Mouth Piece", "unit": "EA", "category": "RESPIRATORY", "itemCode": "RS-CPRMTH", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Dust Mask FFP2", "unit": "EA", "category": "RESPIRATORY", "itemCode": "RS-DUSTFFP2", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Anti-Fog Goggles", "unit": "EA", "category": "EYES/FACE", "itemCode": "EF-ANTIFOG", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Face Shield (Clear)", "unit": "EA", "category": "EYES/FACE", "itemCode": "EF-FCSHCLR", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Safety Glasses Clear", "unit": "EA", "category": "EYES/FACE", "itemCode": "EF-SAFGLSC", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Safety Glasses Dark", "unit": "EA", "category": "EYES/FACE", "itemCode": "EF-SAFGLSD", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Welding Lenses (Clear)", "unit": "EA", "category": "EYES/FACE", "itemCode": "EF-WELDLNC", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Welding Lenses (Dark)", "unit": "EA", "category": "EYES/FACE", "itemCode": "EF-WELDLND", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}], "updateExisting": false}, "query": {}, "params": {}}	{"url": "/api/v1/ppe/bulk-upload", "method": "POST"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-16 17:12:19.705+02	c38cc55b-0530-405b-b48d-02465d7a402b
5ce8e2fb-ae82-4571-9772-b1c7cce17839	BULK_UPLOAD	SizeScale	\N	{"body": {"scales": [{"code": "BODY_NUMERIC", "name": "Body/Torso Numeric (34-50)", "sizes": [{"label": "34", "value": "34"}, {"label": "36", "value": "36"}, {"label": "38", "value": "38"}, {"label": "40", "value": "40"}, {"label": "42", "value": "42"}, {"label": "44", "value": "44"}, {"label": "46", "value": "46"}, {"label": "48", "value": "48"}, {"label": "50", "value": "50"}, {"label": "Standard", "value": "Std"}], "description": "Numeric sizing for body/torso garments (worksuits, jackets, etc.)", "categoryGroup": "BODY/TORSO"}, {"code": "BODY_ALPHA", "name": "Body/Torso Alpha (XS-3XL)", "sizes": [{"label": "Extra Small", "value": "XS"}, {"label": "Small", "value": "S"}, {"label": "Medium", "value": "M"}, {"label": "Large", "value": "L"}, {"label": "Extra Large", "value": "XL"}, {"label": "2X Large", "value": "2XL"}, {"label": "3X Large", "value": "3XL"}, {"label": "Standard", "value": "Std"}], "description": "Alpha sizing for body/torso garments (XS, S, M, L, XL, 2XL, 3XL)", "categoryGroup": "BODY/TORSO"}, {"code": "FEET", "name": "Footwear (4-13)", "sizes": [{"label": "4", "value": "4", "ukSize": "4"}, {"label": "5", "value": "5", "ukSize": "5"}, {"label": "6", "value": "6", "ukSize": "6"}, {"label": "7", "value": "7", "ukSize": "7"}, {"label": "8", "value": "8", "ukSize": "8"}, {"label": "9", "value": "9", "ukSize": "9"}, {"label": "10", "value": "10", "ukSize": "10"}, {"label": "11", "value": "11", "ukSize": "11"}, {"label": "12", "value": "12", "ukSize": "12"}, {"label": "13", "value": "13", "ukSize": "13"}, {"label": "Standard", "value": "Std"}], "description": "Footwear sizing (UK sizes 4-13)", "categoryGroup": "FEET"}, {"code": "GLOVES", "name": "Gloves (S-XL)", "sizes": [{"label": "Small", "value": "S"}, {"label": "Medium", "value": "M"}, {"label": "Large", "value": "L"}, {"label": "Extra Large", "value": "XL"}, {"label": "Standard/One Size", "value": "Std"}], "description": "Glove sizing", "categoryGroup": "HANDS"}, {"code": "HEAD", "name": "Head Gear", "sizes": [{"label": "Small", "value": "S"}, {"label": "Medium", "value": "M"}, {"label": "Large", "value": "L"}, {"label": "Standard/Adjustable", "value": "Std"}], "description": "Head gear sizing (hard hats, helmets)", "categoryGroup": "HEAD"}, {"code": "RESPIRATOR", "name": "Respirator", "sizes": [{"label": "Small", "value": "S"}, {"label": "Medium", "value": "M"}, {"label": "Large", "value": "L"}, {"label": "Standard/One Size", "value": "Std"}], "description": "Respirator face piece sizing", "categoryGroup": "RESPIRATORY"}, {"code": "ONESIZE", "name": "One Size / Standard", "sizes": [{"label": "Standard", "value": "Std"}, {"label": "One Size", "value": "One Size"}], "description": "Items that come in standard/one size only", "categoryGroup": "GENERAL"}, {"code": "EYEWEAR", "name": "Eye Protection", "sizes": [{"label": "Standard", "value": "Std"}, {"label": "Narrow Fit", "value": "Narrow"}, {"label": "Wide Fit", "value": "Wide"}], "description": "Safety glasses and eye protection sizing", "categoryGroup": "EYES/FACE"}], "updateExisting": false}, "query": {}, "params": {}}	{"url": "/api/v1/sizes/bulk-upload", "method": "POST"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-16 17:48:44.733+02	c38cc55b-0530-405b-b48d-02465d7a402b
dd821dc6-c97f-473e-9498-dd163b49074e	BULK_CREATE	PPEItem	\N	{"body": {"items": [{"name": "Aluminised Thermal Suit", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-ALUTHERM", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Amour Bunker Suit", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-AMBUNK", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Bee Catcher's Suit", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-BEECATCH", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Chef's Jacket", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-CHEFJKT", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Cotton Worksuit Blue Elastic Cuff", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-CWSBLUE", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Firefighting Suit", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-FIRESUIT", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Ladies' Worksuit Blue", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-LWSBLUE", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Ladies' Worksuit Reflective", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-LWSREFL", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Life Jacket Adult Size", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-LIFEJKT", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "PVC Rain Suits", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-PVCRAIN", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Rain Suits", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-RAINSUT", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Reflective Cotton Worksuits White", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-RCWSWHT", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Reflective Blue Worksuit", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-RWSBLUE", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Reflective Vest", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-REFLVST", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Reflective Vest Long Sleeve", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-REFLVLS", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Shirt Cotton Orange & Navy", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-SHRTORN", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Shirt Cotton Lime & Navy", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-SHRTLMN", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Shirt Short Navy & Lime", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-SHSTNVL", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Shirt Short Orange & Lime", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-SHSTORL", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Sinking Suit Reflective", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-SINKREF", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Thermal Trousers", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-THERMTR", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Trousers Cotton Navy", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-TRSCNVY", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Welding Jacket", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-WELDJKT", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "White Lab Coats", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-LABCOAT", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Winter Jacket Reflective", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-WINJKTR", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Winter Suit", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-WINSUT", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Winter Jacket", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-WINJKT", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Worksuit Blue Cotton", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-WSBLCOT", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Worksuit Green Acid Proof", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-WSGRACID", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Worksuit Navy Flame Retardant", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-WSNVFR", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Worksuit White Cotton", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-WSWHTCOT", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Worksuit Yellow Cotton", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-WSYELCOT", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Worksuit Cotton Blue", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-WSCOTBL", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Worksuit Red Flame Retardant", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-WSREDFR", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Worksuite Green Cotton", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-WSGRCOT", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Black Jean (Pair)", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-JEANBLK", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Blue Jean (Pair)", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-JEANBLU", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Safety Harness", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-SAFHARNS", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Kidney Belts", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-KIDNBELT", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Leather Apron", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-LTHRAPN", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "PVC Apron", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-PVCAPRON", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Ear Muffs Red", "unit": "EA", "category": "EARS", "itemCode": "EA-EARMUFR", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Earplugs", "unit": "EA", "category": "EARS", "itemCode": "EA-EARPLUG", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Anti-Fog Goggles", "unit": "EA", "category": "EYES/FACE", "itemCode": "EF-ANTIFOG", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Face Shield (Clear)", "unit": "EA", "category": "EYES/FACE", "itemCode": "EF-FCSHCLR", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Safety Glasses Clear", "unit": "EA", "category": "EYES/FACE", "itemCode": "EF-SAFGLSC", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Safety Glasses Dark", "unit": "EA", "category": "EYES/FACE", "itemCode": "EF-SAFGLSD", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Welding Lenses (Clear)", "unit": "EA", "category": "EYES/FACE", "itemCode": "EF-WELDLNC", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Welding Lenses (Dark)", "unit": "EA", "category": "EYES/FACE", "itemCode": "EF-WELDLND", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Gum Shoe Steel Toe", "unit": "EA", "category": "FEET", "itemCode": "FT-GUMSHOS", "sizeScale": "FEET", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Ladies Safety Shoe", "unit": "EA", "category": "FEET", "itemCode": "FT-LADSAF", "sizeScale": "FEET", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Ladies Safety Shoe High Cut", "unit": "EA", "category": "FEET", "itemCode": "FT-LADSAFHC", "sizeScale": "FEET", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Safety Shoe Executive", "unit": "EA", "category": "FEET", "itemCode": "FT-SAFEXEC", "sizeScale": "FEET", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Safety Shoe Steel Toe", "unit": "EA", "category": "FEET", "itemCode": "FT-SAFSTOE", "sizeScale": "FEET", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Safety Shoe High Cut", "unit": "EA", "category": "FEET", "itemCode": "FT-SAFHICUT", "sizeScale": "FEET", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Viking Fire Fighting Boots", "unit": "EA", "category": "FEET", "itemCode": "FT-VIKFIRE", "sizeScale": "FEET", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Electrical Rubber Gloves", "unit": "EA", "category": "HANDS", "itemCode": "HD-ELECRUB", "sizeScale": "GLOVES", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Household Gloves", "unit": "EA", "category": "HANDS", "itemCode": "HD-HOUSEHD", "sizeScale": "GLOVES", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Leather Gloves Long", "unit": "EA", "category": "HANDS", "itemCode": "HD-LTHRLNG", "sizeScale": "GLOVES", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Leather Gloves Short", "unit": "EA", "category": "HANDS", "itemCode": "HD-LTHRSHT", "sizeScale": "GLOVES", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Nylon Gloves", "unit": "EA", "category": "HANDS", "itemCode": "HD-NYLONGL", "sizeScale": "GLOVES", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Pig Skin Gloves", "unit": "EA", "category": "HANDS", "itemCode": "HD-PIGSKIN", "sizeScale": "GLOVES", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Fire Fighting Gloves", "unit": "EA", "category": "HANDS", "itemCode": "HD-FIREGLV", "sizeScale": "GLOVES", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "PVC Gloves Long", "unit": "EA", "category": "HANDS", "itemCode": "HD-PVCLNG", "sizeScale": "GLOVES", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "PVC Gloves Short", "unit": "EA", "category": "HANDS", "itemCode": "HD-PVCSHT", "sizeScale": "GLOVES", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Red Heat Resistant Gloves", "unit": "EA", "category": "HANDS", "itemCode": "HD-HEATRES", "sizeScale": "GLOVES", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Thermal Winter Gloves", "unit": "EA", "category": "HANDS", "itemCode": "HD-THERMWN", "sizeScale": "GLOVES", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "6 Point Hard Hat Liner", "unit": "EA", "category": "HEAD", "itemCode": "HE-6PTLINR", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Balaclava", "unit": "EA", "category": "HEAD", "itemCode": "HE-BALCLVA", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Balaclava Hat", "unit": "EA", "category": "HEAD", "itemCode": "HE-BALCHAT", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Fire Fighting Helmet", "unit": "EA", "category": "HEAD", "itemCode": "HE-FIREHLM", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Cordless Caplamp", "unit": "EA", "category": "HEAD", "itemCode": "HE-CAPLAMP", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Hard Hat", "unit": "EA", "category": "HEAD", "itemCode": "HE-HARDHAT", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Hard Hat Chin Straps", "unit": "EA", "category": "HEAD", "itemCode": "HE-HHCHIN", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Hard Hat Liner", "unit": "EA", "category": "HEAD", "itemCode": "HE-HHLINER", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Hard Hat Gray", "unit": "EA", "category": "HEAD", "itemCode": "HE-HHGRAY", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Sun Brim", "unit": "EA", "category": "HEAD", "itemCode": "HE-SUNBRIM", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Sun Visor", "unit": "EA", "category": "HEAD", "itemCode": "HE-SUNVISR", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Thermal Woolen Hat", "unit": "EA", "category": "HEAD", "itemCode": "HE-THERMWL", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Welding Helmet", "unit": "EA", "category": "HEAD", "itemCode": "HE-WELDHLM", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Welding Helmet Inner Cap", "unit": "EA", "category": "HEAD", "itemCode": "HE-WHLMCAP", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Knee Cap", "unit": "EA", "category": "LEGS/LOWER/KNEES", "itemCode": "LK-KNEECAP", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Leather Spats", "unit": "EA", "category": "LEGS/LOWER/KNEES", "itemCode": "LK-LTHSPAT", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Chef's Neckerchief", "unit": "EA", "category": "NECK", "itemCode": "NK-CHEFNCK", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Neckerchief", "unit": "EA", "category": "NECK", "itemCode": "NK-NECKCHF", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Welding Neck Protector", "unit": "EA", "category": "NECK", "itemCode": "NK-WELDNCK", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "3M Respirator Cartridge", "unit": "EA", "category": "RESPIRATORY", "itemCode": "RS-3MCART", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "3M Respirator Filters", "unit": "EA", "category": "RESPIRATORY", "itemCode": "RS-3MFILT", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "3M Respirator Full Face", "unit": "EA", "category": "RESPIRATORY", "itemCode": "RS-3MFULL", "sizeScale": "RESPIRATOR", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "3M Respirator Half Mask", "unit": "EA", "category": "RESPIRATORY", "itemCode": "RS-3MHALF", "sizeScale": "RESPIRATOR", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "3M Respirator Retainers", "unit": "EA", "category": "RESPIRATORY", "itemCode": "RS-3MRETN", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "CPR Mouth Piece", "unit": "EA", "category": "RESPIRATORY", "itemCode": "RS-CPRMTH", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Dust Mask FFP2", "unit": "EA", "category": "RESPIRATORY", "itemCode": "RS-DUSTFFP2", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}], "updateExisting": false}, "query": {}, "params": {}}	{"url": "/api/v1/ppe/bulk-upload", "method": "POST"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-16 18:02:15.26+02	c38cc55b-0530-405b-b48d-02465d7a402b
0e174b20-05d1-4827-9d19-89b13fb733af	REPLACE	matrix	\N	{"body": {"entries": [{"isActive": true, "jobTitle": "IT OFFICER", "ppeItemId": "e4a9c32a-c93f-4312-8ea0-9055f8f18ebc", "jobTitleId": "4eb0b83f-8975-4f14-b594-dd1d1083f70c", "isMandatory": true, "quantityRequired": 1, "replacementFrequency": 12}, {"isActive": true, "jobTitle": "IT OFFICER", "ppeItemId": "2d79b3a3-6e62-4484-8913-14b141381da9", "jobTitleId": "4eb0b83f-8975-4f14-b594-dd1d1083f70c", "isMandatory": true, "quantityRequired": 1, "replacementFrequency": 12}, {"isActive": true, "jobTitle": "IT OFFICER", "ppeItemId": "9fe8ed70-040e-427b-b599-55cec4071265", "jobTitleId": "4eb0b83f-8975-4f14-b594-dd1d1083f70c", "isMandatory": true, "quantityRequired": 1, "replacementFrequency": 12}, {"isActive": true, "jobTitle": "IT OFFICER", "ppeItemId": "44619c3c-b387-47c8-a03f-9c1d5d7446ac", "jobTitleId": "4eb0b83f-8975-4f14-b594-dd1d1083f70c", "isMandatory": true, "quantityRequired": 1, "replacementFrequency": 12}, {"isActive": true, "jobTitle": "IT OFFICER", "ppeItemId": "231192eb-813a-4053-ab45-77f593d2ef24", "jobTitleId": "4eb0b83f-8975-4f14-b594-dd1d1083f70c", "isMandatory": true, "quantityRequired": 1, "replacementFrequency": 12}]}, "query": {}, "params": {}}	{"url": "/api/v1/matrix/replace", "method": "POST"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-16 18:07:25.512+02	c38cc55b-0530-405b-b48d-02465d7a402b
14ffd63f-fcde-424c-9b00-17113662f2b2	BULK_UPLOAD	Stock	\N	{"body": {"items": [{"unit": "EA", "location": "Main Store", "minLevel": 20, "quantity": 100, "unitPrice": 5.5, "accountCode": "PPEQ", "itemRefCode": "SS053926002", "productName": "EARPLUGS", "fullDescription": "REUSABLES EARPLUGS (MINIMUM 33DBA NOISE REDUCTION FACTOR)", "accountDescription": "Personal Protective Equipment"}, {"size": "38", "unit": "EA", "color": "Navy", "location": "Main Store", "minLevel": 10, "quantity": 50, "unitPrice": 45, "accountCode": "PPEQ", "itemRefCode": "SS056203001", "productName": "WORKSUIT NAVY,FLAME RETARDANT", "fullDescription": "WORKSUIT NAVY,FLAME RETARDANT,REFLECTIVE,ELASTICATED CUFFS SIZE 38", "accountDescription": "Personal Protective Equipment"}, {"size": "40", "unit": "EA", "color": "Navy", "location": "Main Store", "minLevel": 10, "quantity": 30, "unitPrice": 45, "accountCode": "PPEQ", "itemRefCode": "SS056203002", "productName": "WORKSUIT NAVY,FLAME RETARDANT", "fullDescription": "WORKSUIT NAVY,FLAME RETARDANT,REFLECTIVE,ELASTICATED CUFFS SIZE 40", "accountDescription": "Personal Protective Equipment"}, {"size": "6", "unit": "EA", "location": "Main Store", "minLevel": 5, "quantity": 25, "unitPrice": 85, "accountCode": "PPEQ", "itemRefCode": "SS056402009", "productName": "SAFETY SHOE", "fullDescription": "SAFETY SHOE(STEEL TOE CAPPED OIL RESISTANT AND NON SLIP SOLE SIZE 6", "accountDescription": "Personal Protective Equipment"}], "updateExisting": false}, "query": {}, "params": {}}	{"url": "/api/v1/stock/bulk-upload", "method": "POST"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-16 20:13:19.589+02	c38cc55b-0530-405b-b48d-02465d7a402b
25680622-6634-456c-a7e9-12c89ac307da	BULK_UPLOAD	Stock	\N	{"body": {"items": [{"unit": "EA", "location": "Main Store", "minLevel": 20, "quantity": 100, "unitPrice": 5.5, "accountCode": "PPEQ", "itemRefCode": "SS053926002", "productName": "EARPLUGS", "fullDescription": "REUSABLES EARPLUGS (MINIMUM 33DBA NOISE REDUCTION FACTOR)", "accountDescription": "Personal Protective Equipment"}, {"size": "38", "unit": "EA", "color": "Navy", "location": "Main Store", "minLevel": 10, "quantity": 50, "unitPrice": 45, "accountCode": "PPEQ", "itemRefCode": "SS056203001", "productName": "WORKSUIT NAVY,FLAME RETARDANT", "fullDescription": "WORKSUIT NAVY,FLAME RETARDANT,REFLECTIVE,ELASTICATED CUFFS SIZE 38", "accountDescription": "Personal Protective Equipment"}, {"size": "40", "unit": "EA", "color": "Navy", "location": "Main Store", "minLevel": 10, "quantity": 30, "unitPrice": 45, "accountCode": "PPEQ", "itemRefCode": "SS056203002", "productName": "WORKSUIT NAVY,FLAME RETARDANT", "fullDescription": "WORKSUIT NAVY,FLAME RETARDANT,REFLECTIVE,ELASTICATED CUFFS SIZE 40", "accountDescription": "Personal Protective Equipment"}, {"size": "6", "unit": "EA", "location": "Main Store", "minLevel": 5, "quantity": 25, "unitPrice": 85, "accountCode": "PPEQ", "itemRefCode": "SS056402009", "productName": "SAFETY SHOE", "fullDescription": "SAFETY SHOE(STEEL TOE CAPPED OIL RESISTANT AND NON SLIP SOLE SIZE 6", "accountDescription": "Personal Protective Equipment"}], "updateExisting": false}, "query": {}, "params": {}}	{"url": "/api/v1/stock/bulk-upload", "method": "POST"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-16 20:14:07.16+02	c38cc55b-0530-405b-b48d-02465d7a402b
1f3bd841-e809-411c-aa12-4f1d102445ef	BULK_UPLOAD	Stock	\N	{"body": {"items": [{"unit": "EA", "location": "Main Store", "minLevel": 20, "quantity": 100, "unitPrice": 5.5, "accountCode": "PPEQ", "itemRefCode": "SS053926002", "productName": "EARPLUGS", "fullDescription": "REUSABLES EARPLUGS (MINIMUM 33DBA NOISE REDUCTION FACTOR)", "accountDescription": "Personal Protective Equipment"}, {"size": "38", "unit": "EA", "color": "Navy", "location": "Main Store", "minLevel": 10, "quantity": 50, "unitPrice": 45, "accountCode": "PPEQ", "itemRefCode": "SS056203001", "productName": "WORKSUIT NAVY,FLAME RETARDANT", "fullDescription": "WORKSUIT NAVY,FLAME RETARDANT,REFLECTIVE,ELASTICATED CUFFS SIZE 38", "accountDescription": "Personal Protective Equipment"}, {"size": "40", "unit": "EA", "color": "Navy", "location": "Main Store", "minLevel": 10, "quantity": 30, "unitPrice": 45, "accountCode": "PPEQ", "itemRefCode": "SS056203002", "productName": "WORKSUIT NAVY,FLAME RETARDANT", "fullDescription": "WORKSUIT NAVY,FLAME RETARDANT,REFLECTIVE,ELASTICATED CUFFS SIZE 40", "accountDescription": "Personal Protective Equipment"}, {"size": "6", "unit": "EA", "location": "Main Store", "minLevel": 5, "quantity": 25, "unitPrice": 85, "accountCode": "PPEQ", "itemRefCode": "SS056402009", "productName": "SAFETY SHOE", "fullDescription": "SAFETY SHOE(STEEL TOE CAPPED OIL RESISTANT AND NON SLIP SOLE SIZE 6", "accountDescription": "Personal Protective Equipment"}], "updateExisting": false}, "query": {}, "params": {}}	{"url": "/api/v1/stock/bulk-upload", "method": "POST"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-16 20:18:44.883+02	c38cc55b-0530-405b-b48d-02465d7a402b
43fa3c0b-593a-4208-bd03-9fbb363607f1	LOGIN	User	37510ceb-5798-4c70-b7f5-341a18aa99ec	\N	{"ip": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-17 09:08:12.64+02	37510ceb-5798-4c70-b7f5-341a18aa99ec
b27d7181-8e5e-494e-a489-1ac9de3fd1d2	LOGIN	User	c38cc55b-0530-405b-b48d-02465d7a402b	\N	{"ip": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-17 09:09:00.863+02	c38cc55b-0530-405b-b48d-02465d7a402b
19b2a674-ba4d-4add-95cf-04373246f16f	BULK_TOPUP	Stock	\N	{"body": {"items": [{"size": "6", "reason": "Restock from order", "stockId": "659955ea-df6e-4220-8720-3789564d1560", "itemName": "Ladies Safety Shoe", "quantity": 10}, {"size": "38", "color": "Navy", "reason": "Restock from order", "stockId": "c5ec5a74-adbd-4bc9-8374-afef26ca7bca", "itemName": "Worksuit Navy Flame Retardant", "quantity": 5}, {"size": "40", "color": "Navy", "reason": "Restock from order", "stockId": "28cb0f52-d88c-4c42-b3a8-3fe10dda5322", "itemName": "Worksuit Navy Flame Retardant", "quantity": 4}, {"color": "Red", "reason": "Restock from order", "stockId": "3124841b-bbb3-4f2c-a64b-dd5baade53c5", "itemName": "Earplugs", "quantity": 20}]}, "query": {}, "params": {}}	{"url": "/api/v1/stock/bulk-topup", "method": "POST"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-17 09:23:20.435+02	c38cc55b-0530-405b-b48d-02465d7a402b
cd1a28b5-a9b1-4390-94e1-0b3239a25470	LOGIN	User	37510ceb-5798-4c70-b7f5-341a18aa99ec	\N	{"ip": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-17 11:54:34.265+02	37510ceb-5798-4c70-b7f5-341a18aa99ec
2036e55a-2f5d-43f4-98dc-3a3844b4b6eb	CREATE	CompanyBudget	eb64f3b8-a8ec-4618-8098-7cc126b706ff	{"body": {"notes": "PPE Budget For year 2025", "status": "active", "fiscalYear": 2025, "totalBudget": 100000}, "query": {}, "params": {}}	{"url": "/api/v1/budgets/company", "method": "POST"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-17 12:41:48.493+02	37510ceb-5798-4c70-b7f5-341a18aa99ec
f178f8af-1ba6-4cb9-a42e-76169cc41422	CREATE	Budget	0bf738ba-ff96-4775-9806-33f89dfbfcae	{"body": {"status": "active", "fiscalYear": 2025, "departmentId": "b8a936f4-8438-4e20-aa35-8013ebb9b567", "allocatedAmount": 10000, "companyBudgetId": "eb64f3b8-a8ec-4618-8098-7cc126b706ff"}, "query": {}, "params": {}}	{"url": "/api/v1/budgets", "method": "POST"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-17 12:49:53.029+02	37510ceb-5798-4c70-b7f5-341a18aa99ec
e6ca6f86-c3ea-47f7-bb61-0fa1556fe525	LOGIN	User	c38cc55b-0530-405b-b48d-02465d7a402b	\N	{"ip": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-17 13:07:44.601+02	c38cc55b-0530-405b-b48d-02465d7a402b
3f692e63-76a6-4039-a8a8-d6b2dbea30d6	LOGIN	User	37510ceb-5798-4c70-b7f5-341a18aa99ec	\N	{"ip": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-17 14:47:46.282+02	37510ceb-5798-4c70-b7f5-341a18aa99ec
b07e8e4f-9ecb-4e93-906f-47f73f736665	CREATE	Budget	284991a4-e040-44db-b1ae-90ae0f8e988e	{"body": {"status": "active", "fiscalYear": 2025, "departmentId": "9fde7fdd-ba43-4e40-b78f-83bd3576698c", "allocatedAmount": 15000, "companyBudgetId": "eb64f3b8-a8ec-4618-8098-7cc126b706ff"}, "query": {}, "params": {}}	{"url": "/api/v1/budgets", "method": "POST"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-17 14:52:28.396+02	37510ceb-5798-4c70-b7f5-341a18aa99ec
\.


--
-- TOC entry 5171 (class 0 OID 53737)
-- Dependencies: 236
-- Data for Name: budgets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.budgets (id, department_id, section_id, fiscal_year, total_budget, allocated_budget, remaining_budget, status, period, quarter, start_date, end_date, notes, created_at, updated_at, company_budget_id, allocated_amount, total_spent, month) FROM stdin;
0bf738ba-ff96-4775-9806-33f89dfbfcae	b8a936f4-8438-4e20-aa35-8013ebb9b567	\N	2025	10000.00	0.00	10000.00	active	annual	\N	\N	\N	\N	2025-12-17 12:49:53.012+02	2025-12-17 12:49:53.012+02	eb64f3b8-a8ec-4618-8098-7cc126b706ff	10000.00	0.00	\N
284991a4-e040-44db-b1ae-90ae0f8e988e	9fde7fdd-ba43-4e40-b78f-83bd3576698c	\N	2025	15000.00	0.00	15000.00	active	annual	\N	\N	\N	\N	2025-12-17 14:52:28.388+02	2025-12-17 14:52:28.388+02	eb64f3b8-a8ec-4618-8098-7cc126b706ff	15000.00	0.00	\N
\.


--
-- TOC entry 5176 (class 0 OID 53973)
-- Dependencies: 241
-- Data for Name: company_budgets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.company_budgets (id, fiscal_year, total_budget, allocated_to_departments, total_spent, status, notes, created_by_id, created_at, updated_at, start_date, end_date) FROM stdin;
eb64f3b8-a8ec-4618-8098-7cc126b706ff	2025	100000.00	25000.00	0.00	active	PPE Budget For year 2025	37510ceb-5798-4c70-b7f5-341a18aa99ec	2025-12-17 12:41:48.459+02	2025-12-17 15:08:36.581+02	2025-01-01	2025-12-31
\.


--
-- TOC entry 5159 (class 0 OID 53384)
-- Dependencies: 224
-- Data for Name: cost_centers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cost_centers (id, code, name, description, department_id, is_active, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5157 (class 0 OID 53359)
-- Dependencies: 222
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.departments (id, name, code, description, is_active, created_at, updated_at) FROM stdin;
0f93c3e0-3819-489b-9bb6-74d09ef46360	MINING TECHNICAL SERVICES	001	Mining technical services including geology, survey and planning	t	2025-12-16 11:16:36.866+02	2025-12-16 11:16:36.866+02
3eb308ba-47a9-41dc-8056-8003cd8e7800	LABORATORY	002	Laboratory services and testing	t	2025-12-16 11:16:36.875+02	2025-12-16 11:16:36.875+02
777ee300-2f13-4446-b897-fbf105bf8452	PROCESSING	003	Processing plant operations	t	2025-12-16 11:16:36.881+02	2025-12-16 11:16:36.881+02
b8a936f4-8438-4e20-aa35-8013ebb9b567	HEAD OFFICE	005	Head office administration	t	2025-12-16 11:16:36.886+02	2025-12-16 11:16:36.886+02
792bf532-4c67-4293-81a6-5f6e73d1d356	MAINTENANCE	006	Maintenance department including mechanical, electrical, civils	t	2025-12-16 11:16:36.889+02	2025-12-16 11:16:36.889+02
9fde7fdd-ba43-4e40-b78f-83bd3576698c	MINING	007	Mining operations	t	2025-12-16 11:16:36.892+02	2025-12-16 11:16:36.892+02
006d417e-663f-46e3-89a8-1c59e71a2c3e	Shared Services	004	Shared Services Department	t	2025-12-16 10:30:41.505+02	2025-12-16 10:30:41.505+02
\.


--
-- TOC entry 5174 (class 0 OID 53849)
-- Dependencies: 239
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.documents (id, original_filename, stored_filename, storage_path, file_size, mime_type, doc_type, description, created_at, updated_at, employee_id, uploaded_by_id) FROM stdin;
\.


--
-- TOC entry 5161 (class 0 OID 53417)
-- Dependencies: 226
-- Data for Name: employees; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.employees (id, "worksNumber", "employeeId", "firstName", "lastName", email, "phoneNumber", "sectionId", "costCenterId", "jobTitleId", "jobTitle", "jobType", gender, "contractType", "dateOfBirth", "dateJoined", "isActive", "createdAt", "updatedAt") FROM stdin;
6c36c8ae-785c-4ed8-8085-36eaa593ee63	DG028	\N	ALBERT	MUZAVAZI	\N	\N	2d6cfca3-62e2-483e-a808-b22057f2c39f	\N	fabda062-af9a-4824-91ff-452c49ba1b59	LABORATORY TECHNICIAN	NEC	MALE	TERMINATED	\N	\N	f	2025-12-16 15:04:09.944+02	2025-12-16 15:04:09.944+02
26582d25-8173-40e7-ad04-9a0bf39baae8	DG135	\N	ADMIRE	WIZIMANI	\N	\N	2d6cfca3-62e2-483e-a808-b22057f2c39f	\N	fabda062-af9a-4824-91ff-452c49ba1b59	LABORATORY TECHNICIAN	NEC	MALE	TERMINATED	\N	\N	f	2025-12-16 15:04:09.969+02	2025-12-16 15:04:09.969+02
16bbc23e-ec7a-4748-9125-e571212645bd	DG505	\N	RODRECK	CHIMHARE	\N	\N	2d6cfca3-62e2-483e-a808-b22057f2c39f	\N	fabda062-af9a-4824-91ff-452c49ba1b59	LABORATORY TECHNICIAN	NEC	MALE	TERMINATED	\N	\N	f	2025-12-16 15:04:09.976+02	2025-12-16 15:04:09.976+02
22234ccb-b574-43af-bbba-1a14987bdcfa	DG508	\N	WILSHER	NGWENYA	\N	\N	2d6cfca3-62e2-483e-a808-b22057f2c39f	\N	fabda062-af9a-4824-91ff-452c49ba1b59	LABORATORY TECHNICIAN	NEC	MALE	TERMINATED	\N	\N	f	2025-12-16 15:04:09.983+02	2025-12-16 15:04:09.983+02
826a201b-15f7-4f0b-ab8c-2a234f57028d	DG628	\N	MUNYARADZI	NHAMOYEBONDE	\N	\N	2d6cfca3-62e2-483e-a808-b22057f2c39f	\N	fabda062-af9a-4824-91ff-452c49ba1b59	LABORATORY TECHNICIAN	NEC	MALE	TERMINATED	\N	\N	f	2025-12-16 15:04:09.99+02	2025-12-16 15:04:09.99+02
a38a707a-aef8-4169-915e-5da975916017	DG631	\N	SILAS	CHAMBA	\N	\N	2d6cfca3-62e2-483e-a808-b22057f2c39f	\N	fabda062-af9a-4824-91ff-452c49ba1b59	LABORATORY TECHNICIAN	NEC	MALE	TERMINATED	\N	\N	f	2025-12-16 15:04:09.995+02	2025-12-16 15:04:09.995+02
c5cf5281-17bb-4896-a75e-e585953c2281	DG635	\N	DARLISON	MKANDAWIRE	\N	\N	2d6cfca3-62e2-483e-a808-b22057f2c39f	\N	fabda062-af9a-4824-91ff-452c49ba1b59	LABORATORY TECHNICIAN	NEC	MALE	TERMINATED	\N	\N	f	2025-12-16 15:04:10.001+02	2025-12-16 15:04:10.001+02
0c780cc8-c8b2-4f80-b54a-77f96e0e9930	DG749	\N	TINEVIMBO	MAKAVA	\N	\N	2d6cfca3-62e2-483e-a808-b22057f2c39f	\N	fabda062-af9a-4824-91ff-452c49ba1b59	LABORATORY TECHNICIAN	NEC	MALE	TERMINATED	\N	\N	f	2025-12-16 15:04:10.007+02	2025-12-16 15:04:10.007+02
62840ed9-7c4c-45d5-961e-ee794d7cd66e	DG579	\N	PARTSON	MAZHAMBE	\N	\N	6b72e8dd-f8ee-4c2a-8e44-ea44e4794041	\N	fabda062-af9a-4824-91ff-452c49ba1b59	LABORATORY TECHNICIAN	NEC	MALE	TERMINATED	\N	\N	f	2025-12-16 15:04:10.011+02	2025-12-16 15:04:10.011+02
22d6683d-5551-4b2b-b70e-e44c6bfb6462	DG590	\N	TAWANDA	MAZHAMBE	\N	\N	6b72e8dd-f8ee-4c2a-8e44-ea44e4794041	\N	fabda062-af9a-4824-91ff-452c49ba1b59	LABORATORY TECHNICIAN	NEC	MALE	TERMINATED	\N	\N	f	2025-12-16 15:04:10.016+02	2025-12-16 15:04:10.016+02
10820ec4-36d9-46a0-9082-79941ecda576	DG593	\N	PASSMORE	GUMBURA	\N	\N	6b72e8dd-f8ee-4c2a-8e44-ea44e4794041	\N	fabda062-af9a-4824-91ff-452c49ba1b59	LABORATORY TECHNICIAN	NEC	MALE	TERMINATED	\N	\N	f	2025-12-16 15:04:10.021+02	2025-12-16 15:04:10.021+02
82baf5a8-b5a2-42b0-8e1b-472627a334ac	DG621	\N	HILLARY	CHIPFUNDE	\N	\N	6b72e8dd-f8ee-4c2a-8e44-ea44e4794041	\N	fabda062-af9a-4824-91ff-452c49ba1b59	LABORATORY TECHNICIAN	NEC	MALE	TERMINATED	\N	\N	f	2025-12-16 15:04:10.025+02	2025-12-16 15:04:10.025+02
277e8349-462e-42cc-ac59-4cbd6425a8ec	DG725	\N	TAFADZWA	CHIVEREVERE	\N	\N	b30c7026-796a-4dc7-89fd-48dc74c0d9c2	\N	fabda062-af9a-4824-91ff-452c49ba1b59	LABORATORY TECHNICIAN	NEC	MALE	TERMINATED	\N	\N	f	2025-12-16 15:04:10.029+02	2025-12-16 15:04:10.029+02
441c2149-8858-4633-a3a1-0a5178b340fc	DG740	\N	TINOBONGA	BOTE	\N	\N	b30c7026-796a-4dc7-89fd-48dc74c0d9c2	\N	fabda062-af9a-4824-91ff-452c49ba1b59	LABORATORY TECHNICIAN	NEC	MALE	TERMINATED	\N	\N	f	2025-12-16 15:04:10.033+02	2025-12-16 15:04:10.033+02
09c4bd1b-4db5-4b88-ba74-edc82778148a	DG741	\N	MITCHELL	MATASVA	\N	\N	b30c7026-796a-4dc7-89fd-48dc74c0d9c2	\N	fabda062-af9a-4824-91ff-452c49ba1b59	LABORATORY TECHNICIAN	NEC	MALE	TERMINATED	\N	\N	f	2025-12-16 15:04:10.037+02	2025-12-16 15:04:10.037+02
f7af839b-5d1c-4eb9-a8fe-bc16ddeb3287	DG746	\N	NICOLE	MACHEKERA	\N	\N	b30c7026-796a-4dc7-89fd-48dc74c0d9c2	\N	fabda062-af9a-4824-91ff-452c49ba1b59	LABORATORY TECHNICIAN	NEC	MALE	TERMINATED	\N	\N	f	2025-12-16 15:04:10.041+02	2025-12-16 15:04:10.041+02
c816da11-23a3-48ea-b911-4cc518d54738	DG748	\N	TANAKA	BOME	\N	\N	b30c7026-796a-4dc7-89fd-48dc74c0d9c2	\N	fabda062-af9a-4824-91ff-452c49ba1b59	LABORATORY TECHNICIAN	NEC	MALE	TERMINATED	\N	\N	f	2025-12-16 15:04:10.045+02	2025-12-16 15:04:10.045+02
716ae964-edb9-4275-830f-ca20f82a352c	DG761	\N	SHUMIRAI	MAZHAMBE	\N	\N	b30c7026-796a-4dc7-89fd-48dc74c0d9c2	\N	fabda062-af9a-4824-91ff-452c49ba1b59	LABORATORY TECHNICIAN	NEC	MALE	TERMINATED	\N	\N	f	2025-12-16 15:04:10.051+02	2025-12-16 15:04:10.051+02
5972e3a8-6254-44fc-a177-8b32ade5b6cc	DG763	\N	ANESU	MUNYUKI	\N	\N	b30c7026-796a-4dc7-89fd-48dc74c0d9c2	\N	fabda062-af9a-4824-91ff-452c49ba1b59	LABORATORY TECHNICIAN	NEC	MALE	TERMINATED	\N	\N	f	2025-12-16 15:04:10.055+02	2025-12-16 15:04:10.055+02
d1512922-cf87-477e-83c0-5c7160261803	DG784	\N	EMMANUEL	GWATINETSA	\N	\N	b30c7026-796a-4dc7-89fd-48dc74c0d9c2	\N	fabda062-af9a-4824-91ff-452c49ba1b59	LABORATORY TECHNICIAN	NEC	MALE	TERMINATED	\N	\N	f	2025-12-16 15:04:10.059+02	2025-12-16 15:04:10.059+02
de277e1d-1859-4eb3-981c-e1ad59f08c5e	DGZ062	\N	TONDERAI	CHIRIGA	\N	\N	6355b60b-6c2c-4aa1-9417-5c66fd8065d9	\N	fabda062-af9a-4824-91ff-452c49ba1b59	LABORATORY TECHNICIAN	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.062+02	2025-12-16 15:04:10.062+02
86673193-b750-48d2-a0f4-b9e3df6d5180	DGZ063	\N	NOVUYO	NDIMANDE	\N	\N	6355b60b-6c2c-4aa1-9417-5c66fd8065d9	\N	fabda062-af9a-4824-91ff-452c49ba1b59	LABORATORY TECHNICIAN	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.066+02	2025-12-16 15:04:10.066+02
48b1f131-5b9c-48aa-a370-ee8d4fd655d7	DGZ064	\N	JANIEL ANDREW	MURAIRWA	\N	\N	6355b60b-6c2c-4aa1-9417-5c66fd8065d9	\N	fabda062-af9a-4824-91ff-452c49ba1b59	LABORATORY TECHNICIAN	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.071+02	2025-12-16 15:04:10.071+02
5fb90ef6-0f1d-4d26-86ca-85633942aa10	DGZ088	\N	SANDRA	MATEWA	\N	\N	6355b60b-6c2c-4aa1-9417-5c66fd8065d9	\N	fabda062-af9a-4824-91ff-452c49ba1b59	LABORATORY TECHNICIAN	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.074+02	2025-12-16 15:04:10.074+02
80f4e56c-caed-4025-9b5d-8821d2e92ada	DP166	\N	AUGUSTINE	SHAPURE	\N	\N	6355b60b-6c2c-4aa1-9417-5c66fd8065d9	\N	8cc39f68-c832-4693-8c85-7f019a1bbfe2	MINE ASSAYER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.078+02	2025-12-16 15:04:10.078+02
e7e073f6-b5ad-4131-b416-4014968427b0	DP198	\N	FARAI	HOKO	\N	\N	6355b60b-6c2c-4aa1-9417-5c66fd8065d9	\N	fabda062-af9a-4824-91ff-452c49ba1b59	LABORATORY TECHNICIAN	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.082+02	2025-12-16 15:04:10.082+02
6b60d2fd-3889-477f-81cb-4dfe8b47db03	DP010	\N	FARAI	MUPINDUKI	\N	\N	94ed84a7-76cb-400f-9396-9770e5d0b51a	\N	eea01d9f-6bce-4e1e-8e3b-52c7bddc7ac3	DRAUGHTSMAN	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.135+02	2025-12-16 15:04:10.135+02
3b335ab2-0ea1-4ac7-9775-5f7037ddc9e1	DP112	\N	JAMES	STEVENAGE	\N	\N	94ed84a7-76cb-400f-9396-9770e5d0b51a	\N	1bd3f538-0b45-4ce2-87cc-6b776d8ae253	MAINTENANCE PLANNER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.139+02	2025-12-16 15:04:10.139+02
2e027c4c-75c4-4c19-8973-fd0bbda251aa	DP167	\N	STANFORD	MUSENGEZI	\N	\N	94ed84a7-76cb-400f-9396-9770e5d0b51a	\N	ebc1f47c-8947-43ba-bb0c-230f7efd7441	MAINTENANCE MANAGER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.143+02	2025-12-16 15:04:10.143+02
fa899132-b52e-4368-b2f6-478b1087bcde	DP190	\N	AGNES	MAGWAZA	\N	\N	94ed84a7-76cb-400f-9396-9770e5d0b51a	\N	99e85d36-6685-4e9d-827f-050cbd28dfb8	PLANNING FOREMAN	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.147+02	2025-12-16 15:04:10.147+02
e3ae8915-2cb2-4558-b876-054761492fba	DP237	\N	GAMUCHIRAI	JESE	\N	\N	94ed84a7-76cb-400f-9396-9770e5d0b51a	\N	\N	JUNIOR  PLANNING ENGINEER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.15+02	2025-12-16 15:04:10.15+02
448f1cf4-85d7-4449-aa97-802889ae192f	DGZ001	\N	COURAGE	CHALEKA	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	\N	8e3fad1d-e793-4702-ae16-98d9bd7c0507	BOILERMAKER CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.154+02	2025-12-16 15:04:10.154+02
1542b0a0-fd46-4a48-8afd-68ef9208c6a2	DGZ003	\N	GODKNOWS	JIRI	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	\N	8e3fad1d-e793-4702-ae16-98d9bd7c0507	BOILERMAKER CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.158+02	2025-12-16 15:04:10.158+02
01a1300c-4f9c-415a-8cec-8a34ab5f6721	DGZ010	\N	ADMIRE	GADZE	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	\N	9d5cd3c9-d018-4c85-b863-cec3546813d9	CHARGEHAND BOILERMAKERS	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.162+02	2025-12-16 15:04:10.162+02
6c165ff2-dc71-495c-bfab-a76772535762	DGZ016	\N	NDABEZINHLE	MHLANGA	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	\N	8e3fad1d-e793-4702-ae16-98d9bd7c0507	BOILERMAKER CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.166+02	2025-12-16 15:04:10.166+02
e42eeb0d-121d-4a09-8f03-9731b04292ca	DGZ020	\N	DANIEL	CHENGO	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	\N	fd920717-9312-4b33-9f26-62bf5dee557a	WELDER CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.17+02	2025-12-16 15:04:10.17+02
3a93fa06-a8ac-4d1e-a3eb-0a37d56f53ae	DGZ025	\N	SHEPHERD	ZINYAMA	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	\N	fd920717-9312-4b33-9f26-62bf5dee557a	WELDER CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.174+02	2025-12-16 15:04:10.174+02
6756ac86-2ace-48d2-95e5-83d651fd1a46	DGZ027	\N	ROBERT	MKWAIKI	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	\N	b7df3fdd-5371-4783-96e4-50702154de0f	BOILER MAKER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.178+02	2025-12-16 15:04:10.178+02
946dcb0d-0572-4120-87e3-7c9080a0b5b0	DGZ036	\N	ARTHUR	KAPFUNDE	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	\N	8e3fad1d-e793-4702-ae16-98d9bd7c0507	BOILERMAKER CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.181+02	2025-12-16 15:04:10.181+02
db872ffd-48b1-47d0-a085-19bce7f659e3	DGZ039	\N	GEORGE	NEZUNGAI	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	\N	8e3fad1d-e793-4702-ae16-98d9bd7c0507	BOILERMAKER CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.185+02	2025-12-16 15:04:10.185+02
d4eb6910-863c-4ddc-9716-2a115bf06d8a	DGZ041	\N	OWEN	ALFONSO	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	\N	589ae473-be31-4d27-8d0b-fe1b0fff0b46	CODED WELDER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.189+02	2025-12-16 15:04:10.189+02
9dd4466d-5a67-4f14-bba1-07f443e495bf	DGZ050	\N	GABRIEL	TICHARWA	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	\N	8e3fad1d-e793-4702-ae16-98d9bd7c0507	BOILERMAKER CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.194+02	2025-12-16 15:04:10.194+02
2f724ce3-492d-486f-a8c5-6c14187d8894	DGZ054	\N	COSTEN	CHINODA	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	\N	fd920717-9312-4b33-9f26-62bf5dee557a	WELDER CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.197+02	2025-12-16 15:04:10.197+02
2fc137c1-2ef5-4555-a46f-9a148748b0c1	DGZ077	\N	RAMUS	MWASANGA	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	\N	8e3fad1d-e793-4702-ae16-98d9bd7c0507	BOILERMAKER CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.202+02	2025-12-16 15:04:10.202+02
feae15ce-7624-4917-a28f-5ece0157301c	DGZ079	\N	CLAYTON	MANDIZHA	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	\N	8e3fad1d-e793-4702-ae16-98d9bd7c0507	BOILERMAKER CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.207+02	2025-12-16 15:04:10.207+02
3cb69e2e-8a1b-4268-b4c3-5e2393bd7567	DP072	\N	GIBSON	MANJONDA	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	\N	72134660-10fa-43a0-9c66-03177bfefa89	FABRICATION FOREMAN	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.21+02	2025-12-16 15:04:10.21+02
8e7a01ad-ec0f-4f54-9c4a-d25c8ba82d1f	DGZ017	\N	ARTASHASTAH	NGWENYA	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	\N	3493baeb-9779-4b29-a0b3-508cb568b1f3	PLUMBER CLASS 2	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.214+02	2025-12-16 15:04:10.214+02
245ead0b-570a-4cea-a098-3d175306cc5e	DGZ028	\N	MUNASHE	MUTODZA	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	\N	de0ec78a-0872-41cb-82dd-df92f0a7850c	RIGGER CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.219+02	2025-12-16 15:04:10.219+02
64335535-8c09-4df5-87ef-f50937904fd0	DGZ029	\N	REUBEN	TAGA-DAGA	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	\N	8e3fad1d-e793-4702-ae16-98d9bd7c0507	BOILERMAKER CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.223+02	2025-12-16 15:04:10.223+02
83d311c5-f08f-4dd3-a509-d6f40ddc63a1	DGZ084	\N	AARON	MANDIGORA	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	\N	d659dcf0-d192-4f5c-b87a-db693eafcda5	PLUMBER CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.229+02	2025-12-16 15:04:10.229+02
8acbc08a-29a9-4496-a8a3-f898d07d308e	DP174	\N	EMMANUEL	NJANJENI	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	\N	de0ec78a-0872-41cb-82dd-df92f0a7850c	RIGGER CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.232+02	2025-12-16 15:04:10.232+02
9c2159da-7141-4b18-98f9-103683817ff3	DP201	\N	JOHN	HANHART	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	\N	6d3b0729-23d0-47db-98c2-593e2bef2f60	TRANSPORT & SERVICES MANAGER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.236+02	2025-12-16 15:04:10.236+02
ac77090a-8b80-46b7-92a2-303948ae4fa7	DP244	\N	ENOCK	MHARIWA	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	\N	9d1fd5d3-7d38-48cd-a9c0-b1966fbef9d5	TRANSPORT AND SERVICES CHARGE HAND	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.239+02	2025-12-16 15:04:10.239+02
cc7231ae-5e0e-4604-8158-bed0c3ecc9ef	DP297	\N	KOROFATI	JEREMIAH	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	\N	3493baeb-9779-4b29-a0b3-508cb568b1f3	PLUMBER CLASS 2	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.243+02	2025-12-16 15:04:10.243+02
dcee33bf-cb79-4071-ad37-b56ed0d37734	DP298	\N	WALTER	MHEMBERE	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	\N	3493baeb-9779-4b29-a0b3-508cb568b1f3	PLUMBER CLASS 2	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.246+02	2025-12-16 15:04:10.246+02
04008c7e-4880-467e-9d64-03cd76cbdf51	DP300	\N	PROSPER	JIM	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	\N	9bef3d6f-aab6-4dfb-8389-c52dd9cdbbe4	AUTO ELECTRICIAN CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.249+02	2025-12-16 15:04:10.249+02
b52e4a46-33ba-4f11-a3ba-7a37abb3880d	DP301	\N	VICTOR	NYAMUROWA	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	\N	b0047157-fc8a-428a-9aae-07c0adac8a71	DIESEL PLANT FITTER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.253+02	2025-12-16 15:04:10.253+02
24a476fa-71c7-4878-bd53-f5189cd7b385	DP322	\N	KARL	TEMBO	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	\N	de0ec78a-0872-41cb-82dd-df92f0a7850c	RIGGER CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.256+02	2025-12-16 15:04:10.256+02
c80051b2-365b-4822-927a-60be803b2eb0	DP323	\N	KASSAN	GUNDA	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	\N	de0ec78a-0872-41cb-82dd-df92f0a7850c	RIGGER CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.26+02	2025-12-16 15:04:10.26+02
949a1340-4d09-4a3b-8692-16f89d4b088a	DP354	\N	PETER	NYONI	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	\N	9bef3d6f-aab6-4dfb-8389-c52dd9cdbbe4	AUTO ELECTRICIAN CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.264+02	2025-12-16 15:04:10.264+02
327b45b8-ff3c-4b77-9023-724ddb3c7d38	DP363	\N	TANAKA	MTEKI	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	\N	b0047157-fc8a-428a-9aae-07c0adac8a71	DIESEL PLANT FITTER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.269+02	2025-12-16 15:04:10.269+02
d6b8ef5f-14ec-4d81-811d-7061818b03e1	DP212	\N	TINASHE	SAUNGWEME	\N	\N	2d6cfca3-62e2-483e-a808-b22057f2c39f	\N	80680f2f-6239-470c-9467-57d1e6a8542d	CIVIL ENGINEER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.273+02	2025-12-16 15:04:10.273+02
1244f4fc-a8ea-4335-bd5b-1bff5d52f165	DP305	\N	TAFADZWA	USHE	\N	\N	2d6cfca3-62e2-483e-a808-b22057f2c39f	\N	5172b454-a55d-47e0-bb70-bbc56e3f00d6	CIVIL TECHNICIAN TSF	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.277+02	2025-12-16 15:04:10.277+02
ee3fe43f-30e6-4189-a772-94dd8388b31e	DP156	\N	OLIVER SIMBA	CHUMA	\N	\N	c9ddfe4e-3356-4c51-b917-b07321fbfc00	\N	584780da-81b7-48a9-8f11-4517d6b17cf6	MINING ENGINEER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.28+02	2025-12-16 15:04:10.28+02
c0496162-9858-456b-a8e8-e4fb52aa9ff5	DP159	\N	DESMOND	CHAWIRA	\N	\N	c9ddfe4e-3356-4c51-b917-b07321fbfc00	\N	2fc29e02-6bbc-4248-8089-a650f68d8c37	SENIOR MINING ENGINEER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.284+02	2025-12-16 15:04:10.284+02
dad4eb85-8a10-4394-9a87-2cf37150a34c	DP165	\N	TAWEDZEGWA	MAZANA	\N	\N	c9ddfe4e-3356-4c51-b917-b07321fbfc00	\N	f6b29a77-7a62-4cac-9575-b05ab4424793	SENIOR PIT SUPERINTENDENT	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.287+02	2025-12-16 15:04:10.287+02
900177c2-74d6-4a0a-902b-06cc570cb32f	DP178	\N	STANLEY	NCUBE	\N	\N	c9ddfe4e-3356-4c51-b917-b07321fbfc00	\N	3b19fc64-81b3-4d21-9d1c-d767e55433df	PIT SUPERINTENDENT	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.291+02	2025-12-16 15:04:10.291+02
bb01ba1f-4242-426f-8868-89e0abe7f923	DP234	\N	COBURN	KATANDA	\N	\N	c9ddfe4e-3356-4c51-b917-b07321fbfc00	\N	0f70a630-de93-4a1b-937d-a4fa608d7d35	MINING MANAGER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.294+02	2025-12-16 15:04:10.294+02
4c2fc3d6-a03b-4df6-8016-ad20ab39bac0	DP274	\N	RYAN	MASONA	\N	\N	c9ddfe4e-3356-4c51-b917-b07321fbfc00	\N	cb7dc4a7-6435-4512-ba8a-5c4d57a198c8	JUNIOR PIT SUPERINTENDENT	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.297+02	2025-12-16 15:04:10.297+02
ac022cdb-c34e-44a6-9171-67e1a52b15ed	DP359	\N	ELAINE	ZENGENI	\N	\N	fa570fb8-b13c-4fe5-8da9-e49f7f01dede	\N	b771a695-324e-4566-95a8-32168480a11f	EXPLORATION GEOLOGICAL TECHNICIAN	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.301+02	2025-12-16 15:04:10.301+02
752694c8-e7a6-4fc5-b5a6-24f28eaf3fcd	DP360	\N	LUCKSTONE	SAUNGWEME	\N	\N	fa570fb8-b13c-4fe5-8da9-e49f7f01dede	\N	10c33b51-1f0c-4ae1-9de5-43616a5b50fc	EXPLORATION PROJECT MANAGER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.304+02	2025-12-16 15:04:10.304+02
a390abfa-8dc0-4340-8140-f1cbdaea0530	DP361	\N	TINASHE	MUDZINGWA	\N	\N	fa570fb8-b13c-4fe5-8da9-e49f7f01dede	\N	42cfe725-d976-42ed-a407-f6492148d91f	EXPLORATION GEOLOGIST	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.307+02	2025-12-16 15:04:10.307+02
1cfafc0d-9000-4bb5-be23-297bbd06ca85	DP117	\N	NYASHA	GEREMA	\N	\N	fa570fb8-b13c-4fe5-8da9-e49f7f01dede	\N	9f81d9ab-7cd4-427c-bac9-13c6afd0b65d	DATABASE ADMINISTRATOR	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.31+02	2025-12-16 15:04:10.31+02
73637f16-d4cf-4d6b-af90-ef230e646c2a	DP163	\N	WISDOM	LESAYA	\N	\N	fa570fb8-b13c-4fe5-8da9-e49f7f01dede	\N	25339f27-36db-4cc3-b220-8a832a22d632	GEOLOGICAL TECHNICIAN	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.313+02	2025-12-16 15:04:10.313+02
a7b625cc-a060-4da0-8d12-3e86061d0ee6	DP181	\N	BENEFIT	MUONEKA	\N	\N	fa570fb8-b13c-4fe5-8da9-e49f7f01dede	\N	a8ecbecd-62bf-4feb-a102-9594c2b5bea7	RESIDENT GEOLOGIST	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.316+02	2025-12-16 15:04:10.316+02
d2bc51a3-1a33-46a0-a2c9-f051aa348cce	DP186	\N	TATENDA	PORE	\N	\N	fa570fb8-b13c-4fe5-8da9-e49f7f01dede	\N	6b518870-7023-4060-85e3-019f85db57f3	JUNIOR GEOLOGIST	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.32+02	2025-12-16 15:04:10.32+02
96aebffe-f31c-49cc-93f1-2b99e103f11c	DP235	\N	MARTIN	MATEVEKE	\N	\N	fa570fb8-b13c-4fe5-8da9-e49f7f01dede	\N	edf91274-51de-419e-b782-95e0b2f1bb80	GEOLOGIST	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.323+02	2025-12-16 15:04:10.323+02
89cf3ac6-45c1-4b37-a249-b9e5d5845b28	DP265	\N	KUDAKWASHE	CHAKAWA	\N	\N	fa570fb8-b13c-4fe5-8da9-e49f7f01dede	\N	25339f27-36db-4cc3-b220-8a832a22d632	GEOLOGICAL TECHNICIAN	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.326+02	2025-12-16 15:04:10.326+02
19182073-bffb-46a6-97d6-7322574549f9	DP139	\N	GUNUKA LUZIBO	LULA	\N	\N	8581817b-a52e-4214-9326-bef9028675e6	\N	2f0578d8-2f1a-4105-bda2-1a092d1be687	GEOTECHNICAL ENGINEERING TECHNICIAN	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.33+02	2025-12-16 15:04:10.33+02
4bb1d7aa-0e0d-476a-acfa-e7208a42a1bf	DP158	\N	TAKUDZWA	GUNYANJA	\N	\N	8581817b-a52e-4214-9326-bef9028675e6	\N	2f0578d8-2f1a-4105-bda2-1a092d1be687	GEOTECHNICAL ENGINEERING TECHNICIAN	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.333+02	2025-12-16 15:04:10.333+02
9db06ab7-2d22-420c-a428-dd7f5d97cc58	DP306	\N	PARDON	NYAMANDE	\N	\N	8581817b-a52e-4214-9326-bef9028675e6	\N	10d7cd99-0f39-4485-ba0e-f15bc3d8fa19	GEOTECHNICAL ENGINEER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.337+02	2025-12-16 15:04:10.337+02
06715c13-4bdf-4eec-92ac-26d993169a46	DP097	\N	MZAMO	MKANDLA	\N	\N	79981ee7-9928-4667-aac4-59cba3a31ddc	\N	097ff8e7-d404-4cfc-9177-ef9e9e77a0e8	SURVEYOR	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.347+02	2025-12-16 15:04:10.347+02
deb78ddb-ab43-4e56-b57b-cab58268731b	DP100	\N	COLLETTE	NGULUBE	\N	\N	79981ee7-9928-4667-aac4-59cba3a31ddc	\N	fc3a2826-d1ea-489b-9e83-279eef82abf3	CHIEF SURVEYOR	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.351+02	2025-12-16 15:04:10.351+02
334322a5-695e-44d8-bc4c-515a0fe95cf2	DP215	\N	GAMUCHIRAI	MUJAJATI	\N	\N	79981ee7-9928-4667-aac4-59cba3a31ddc	\N	097ff8e7-d404-4cfc-9177-ef9e9e77a0e8	SURVEYOR	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.355+02	2025-12-16 15:04:10.355+02
7997ef59-1cea-44db-b4cc-cd38e565197f	DP266	\N	HILARY	MUSHONGA	\N	\N	79981ee7-9928-4667-aac4-59cba3a31ddc	\N	392b8957-2899-4511-9d54-2f3da35092c6	SENIOR SURVEYOR	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.359+02	2025-12-16 15:04:10.359+02
41028e87-005f-4279-985c-795fe6bce357	DGZ090	\N	TSEPO	NOKO	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	6f42442c-12c3-4f8f-874c-0364e2ac7494	METALLURGICAL TECHNICIAN	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.362+02	2025-12-16 15:04:10.362+02
7af86c52-8cfa-46cc-af96-a11e8298a9b0	DP251	\N	BRIDGET	NGIRANDI	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	6f42442c-12c3-4f8f-874c-0364e2ac7494	METALLURGICAL TECHNICIAN	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.365+02	2025-12-16 15:04:10.365+02
2f1ac919-b424-4e07-8d48-4e9478bf9868	DP131	\N	VICTOR	CHIKEREMA	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	45acd4c6-436f-4dfd-9a40-cedab985e14d	PLANT PRODUCTION SUPERINTENDENT	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.368+02	2025-12-16 15:04:10.368+02
e30ea831-d5ef-4ad3-8ba3-62d51d266f0a	DP136	\N	STEWARD	SITHOLE	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	3e68b871-0d8b-4ed5-aa07-46b46b96cafe	METALLURGICAL SUPERINTENDENT	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.371+02	2025-12-16 15:04:10.371+02
644337aa-992c-4007-8ffc-8863a5c9ea31	DP137	\N	GERALDINE	CHIBAMU	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	279413bf-77a2-40c3-af1c-b92fe5abe28d	PROCESS CONTROL SUPERVISOR	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.374+02	2025-12-16 15:04:10.374+02
ba36669c-7ce8-4bb0-b24a-de831fafd3e9	DP161	\N	THELMA	NYABANGA	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	e7ed4312-cc0f-4145-ad7b-df493c6f8caa	METALLURGICAL ENGINEER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.378+02	2025-12-16 15:04:10.378+02
67493a10-9504-44f7-bada-ecd8fe487884	DP188	\N	ABGAIL	CHIORESO	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	789c3fcf-014f-4aa8-88c1-9fcd8df55445	PROCESS CONTROL METALLURGIST	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.38+02	2025-12-16 15:04:10.38+02
89bfd9d9-6334-4841-9e03-86d42da62bc6	DP228	\N	RUTENDO	MAGANGA	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	55422d16-d1e7-4f4c-ad3e-ba54d4d2c703	PLANT LABORATORY METALLURGIST	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.384+02	2025-12-16 15:04:10.384+02
7f04460d-6a16-4082-963e-cb63200652ce	DP240	\N	MICHELLE	MAPOSAH	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	789c3fcf-014f-4aa8-88c1-9fcd8df55445	PROCESS CONTROL METALLURGIST	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.387+02	2025-12-16 15:04:10.387+02
63cd0021-41ad-4e78-88bc-bbe5cc3ae7bc	DP307	\N	PRINCESS	NCUBE	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	789c3fcf-014f-4aa8-88c1-9fcd8df55445	PROCESS CONTROL METALLURGIST	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.39+02	2025-12-16 15:04:10.39+02
6e3b8709-ad1b-40d7-9a25-5ff3ff7556eb	DP332	\N	BUKHOSI	DUBE	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	d6c215a5-ebe5-4e65-9b0a-be47c043afaf	PLANT LABORATORY TECHNICIAN	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.392+02	2025-12-16 15:04:10.392+02
857da3b0-869a-4446-99e5-b18e08ba3532	DP334	\N	LOUIS	KHOWA	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	11601d80-e543-4fb3-b2e9-44e3f288a276	PROCESSING SYSTEMS ANALYST	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.394+02	2025-12-16 15:04:10.394+02
21abe4c8-9602-43e9-970c-2852c443f8eb	DP335	\N	RUMBIDZAI	MAZVIYO	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	676b82b0-f1ed-480f-84ed-206e537cb2db	PLANT LABORATORY MET TECHNICIAN	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.397+02	2025-12-16 15:04:10.397+02
8b945f8f-54b7-4787-8c7e-aa287c48f445	DP125	\N	ROBERT	JERE	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	30a411f0-e148-4def-9ffc-623336f1b355	PLANT SUPERVISOR	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.403+02	2025-12-16 15:04:10.403+02
7800d93f-46b8-4ef8-b0cf-679d01d30083	DP134	\N	TANYARADZWA	ZINHU	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	30a411f0-e148-4def-9ffc-623336f1b355	PLANT SUPERVISOR	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.406+02	2025-12-16 15:04:10.406+02
6b30a8e2-f0e0-4f8a-be67-cf49bb44807f	DP187	\N	LIONEL	MUREVERWI	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	30a411f0-e148-4def-9ffc-623336f1b355	PLANT SUPERVISOR	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.409+02	2025-12-16 15:04:10.409+02
ea14dd48-d5dc-47f8-b32a-f41c3ae30607	DP320	\N	OBERT	MUNODAWAFA	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	ffd7c3d7-513b-495f-a821-0a69ca4d48ce	PROCESSING MANAGER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.412+02	2025-12-16 15:04:10.412+02
23b9a278-fe2b-4333-b03a-2e2c2ade77b1	DP339	\N	VISION	MUSAPINGURA	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	e7ed4312-cc0f-4145-ad7b-df493c6f8caa	METALLURGICAL ENGINEER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.414+02	2025-12-16 15:04:10.414+02
f3a09a75-c2bf-49eb-ac00-36345ff04fdd	DP129	\N	MALVIN	KHUPE	\N	\N	2d6cfca3-62e2-483e-a808-b22057f2c39f	\N	e38e1f8e-7395-48d2-bbe8-0ea754632082	TSF SUPERVISOR	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.418+02	2025-12-16 15:04:10.418+02
80985014-12b4-4853-b3d4-f732381d0360	DP252	\N	JOHANNES	MANDIZIBA	\N	\N	2d6cfca3-62e2-483e-a808-b22057f2c39f	\N	e38e1f8e-7395-48d2-bbe8-0ea754632082	TSF SUPERVISOR	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.421+02	2025-12-16 15:04:10.421+02
df902345-4c58-4de1-ae69-166a320d46c9	DP299	\N	CHAKANETSA	MAHACHI	\N	\N	2d6cfca3-62e2-483e-a808-b22057f2c39f	\N	543f2fcf-9bfd-457a-92b9-6e110ce4056a	PLANT MANAGER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.424+02	2025-12-16 15:04:10.424+02
12895980-1cec-4a45-89ec-a85d3fb37727	DP108	\N	NELSON	BANDA	\N	\N	96d7a388-f0f6-4078-a5ea-e2efea09bdca	\N	582201fe-29e5-4bcb-acaa-81f27a6413c9	GENERAL MANAGER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.428+02	2025-12-16 15:04:10.428+02
9284c9a6-3f8a-43e8-92fa-6ef20ad31ffd	DP284	\N	GIVEMORE	SICHAKALA	\N	\N	96d7a388-f0f6-4078-a5ea-e2efea09bdca	\N	3a833193-4c32-4423-8dd1-068648feaf84	SHARED SERVICES MANAGER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.432+02	2025-12-16 15:04:10.432+02
3ea36807-0b37-46b7-9e09-20faa50eecd3	DP325	\N	ANYWAY	SIATULUBE	\N	\N	5c7eb5a5-ed24-46bf-ba13-61fe4a2c1fa4	\N	709a888d-ab11-49f5-bed7-6b79d4f1ccd3	BOME HOUSES CONSTRUCTION SUPERVISOR	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.437+02	2025-12-16 15:04:10.437+02
50691ee7-c2d5-4b2f-a32c-f2e7104f96de	DP169	\N	VIMBAI	MADADANGOMA	\N	\N	96d7a388-f0f6-4078-a5ea-e2efea09bdca	\N	6dcd99f9-3b98-4f0c-bff8-6c9c82815df8	BUSINESS IMPROVEMENT MANAGER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.44+02	2025-12-16 15:04:10.44+02
6d2a980f-9bf8-47b5-947e-e31dff87a002	DP243	\N	JOHN	MAYUNI	\N	\N	96d7a388-f0f6-4078-a5ea-e2efea09bdca	\N	036f5aff-b729-4cf1-acfb-0c6128500810	BUSINESS IMPROVEMENT OFFICER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.443+02	2025-12-16 15:04:10.443+02
ab0233d3-ef07-4146-9bab-b36b978e18f5	DP065	\N	LINDELWE	KHUMALO	\N	\N	5c7eb5a5-ed24-46bf-ba13-61fe4a2c1fa4	\N	fd265ea9-19ee-47ce-a133-8348b46b5dca	COMMUNITY RELATIONS COORDINATOR	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.445+02	2025-12-16 15:04:10.445+02
7ac3348c-0802-4c15-989c-9dad41b42fbe	DP241	\N	RUGARE	HUNGOIDZA	\N	\N	5c7eb5a5-ed24-46bf-ba13-61fe4a2c1fa4	\N	1e6fed25-4754-4d87-9e36-9fb69ce223ec	ASSISTANT COMMUNITY RELATIONS OFFICER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.448+02	2025-12-16 15:04:10.448+02
c9edf2bc-0c43-4e08-9cfb-51e60f1f3223	DP258	\N	DAPHNE	TAVENHAVE	\N	\N	5c7eb5a5-ed24-46bf-ba13-61fe4a2c1fa4	\N	189fa3a5-70b1-444e-8008-9a20292fd262	COMMUNITY RELATIONS OFFICER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.454+02	2025-12-16 15:04:10.454+02
026fc999-2408-42b5-85ec-8465e6534900	DP040	\N	ALEXIO	SAWAYA	\N	\N	e3a72f1c-88a2-4bc2-8c56-4bc99819e288	\N	d39efc53-26c6-4092-aece-f37351be4cc9	BOOK KEEPER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.458+02	2025-12-16 15:04:10.458+02
30251bc1-fefb-4e69-a455-b5172a151ac0	DP087	\N	DUNCAN	KUHAMBA	\N	\N	e3a72f1c-88a2-4bc2-8c56-4bc99819e288	\N	ffc4e2e7-c929-4bc0-9f77-41edfc96ea92	FINANCE & ADMINISTRATION MANAGER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.462+02	2025-12-16 15:04:10.462+02
67d8d82d-d16e-4706-8940-9807e40152c0	DP191	\N	ELLEN	CHANDAVENGERWA	\N	\N	e3a72f1c-88a2-4bc2-8c56-4bc99819e288	\N	f4782a3b-ea0f-4922-b309-5ac3b8273d74	ASSISTANT ACCOUNTANT	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.465+02	2025-12-16 15:04:10.465+02
c33f5969-721b-40c4-8b5f-e13929a80429	DP145	\N	TINAGO	TINAGO	\N	\N	eddee19c-15aa-4b45-947b-505fb6170f25	\N	1a4f824a-cc77-4633-83e8-80df2c24d6bc	HUMAN CAPITAL SUPPORT SERVICES MANAGER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.47+02	2025-12-16 15:04:10.47+02
b9c97589-04d8-49dd-9331-91d06e41b25a	DP164	\N	BENJAMIN	MUWAIRI	\N	\N	eddee19c-15aa-4b45-947b-505fb6170f25	\N	27746636-a463-418c-a9c6-18923873841f	HR ADMINISTRATOR	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.473+02	2025-12-16 15:04:10.473+02
f760172d-f8bd-4bf3-8516-beed437332a8	DP216	\N	CARLTON	SAMURIWO	\N	\N	eddee19c-15aa-4b45-947b-505fb6170f25	\N	fd785264-8a40-4115-8892-a7010ab5319d	HUMAN RESOURCES ASSISTANT	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.476+02	2025-12-16 15:04:10.476+02
fd590a90-b492-41db-83b7-689df7a4e0f5	DP333	\N	FREEDMORE	MAGOMANA	\N	\N	eddee19c-15aa-4b45-947b-505fb6170f25	\N	9e86e2cb-6877-49b3-80ef-3e86b5d11c3b	HUMAN RESOURCES SUPERINTENDENT	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.479+02	2025-12-16 15:04:10.479+02
ec717f73-15e6-44f7-ad7e-67ffa5c7d61f	DP130	\N	NEIL	MUKWEBWA	\N	\N	cb578a83-35f3-4456-ac28-268691ef036e	\N	4eb0b83f-8975-4f14-b594-dd1d1083f70c	IT OFFICER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.483+02	2025-12-16 15:04:10.483+02
633311da-08c9-44eb-8cca-881d1f03bd73	DP140	\N	POUND	GWINYAI	\N	\N	cb578a83-35f3-4456-ac28-268691ef036e	\N	05bf1a83-a00a-49c8-834c-0f38999224ff	IT SUPERINTENDENT	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.487+02	2025-12-16 15:04:10.487+02
85e334de-83e6-43a8-9487-d2f1c0f0de86	DP329	\N	FELIX	DANDAVARE	\N	\N	cb578a83-35f3-4456-ac28-268691ef036e	\N	690c4a74-1c53-4a55-af68-8bbdd94e1f3d	SUPPORT TECHNICIAN	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.49+02	2025-12-16 15:04:10.49+02
3c2f1dcc-bd70-44a7-a024-dbedb7affbfc	DP336	\N	DERICK	CHINAKIDZWA	\N	\N	b8fc0096-6d33-4564-bdca-9a5aa455de19	\N	95e05bc4-555d-4c25-a47a-516bfd0fd5d5	ISSUING OFFICER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.493+02	2025-12-16 15:04:10.493+02
086887ea-36c5-47d1-a335-d876aa49673b	DP242	\N	ASHLEY	CHIGARIRO	\N	\N	b8fc0096-6d33-4564-bdca-9a5aa455de19	\N	53807579-7366-4e68-86db-5131d1e02f57	ASSISTANT EXPEDITER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.496+02	2025-12-16 15:04:10.496+02
8e4fe129-9182-403d-a612-a492a00b81f3	DP312	\N	SIMBARASHE	MATANDARE	\N	\N	6b72e8dd-f8ee-4c2a-8e44-ea44e4794041	\N	d96fa97a-a49e-4f7c-a9c8-615fa5beb6a0	SECURITY OFFICER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.5+02	2025-12-16 15:04:10.5+02
2d4ba660-1b73-46b8-90e4-5d356a24b03f	DP313	\N	JANUARY	WERENGANI	\N	\N	6b72e8dd-f8ee-4c2a-8e44-ea44e4794041	\N	a44a4ebd-cec8-43ba-88e5-25950349da33	SECURITY MANAGER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.504+02	2025-12-16 15:04:10.504+02
a9943ffa-d49e-4829-9299-f03008b296ac	DP084	\N	NYASHA	MUNYENYIWA	\N	\N	b11dd169-6f33-44d4-91c1-c64c41c36038	\N	2d7efe45-8cff-4daf-a12c-5e8798725042	SHE MANAGER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.508+02	2025-12-16 15:04:10.508+02
8f1717f4-e9f2-44fe-bab5-fef059e37ad1	DP148	\N	ELVIS	ZHOU	\N	\N	b11dd169-6f33-44d4-91c1-c64c41c36038	\N	4177c27d-8f41-40eb-b504-6d9c0be18625	SHE OFFICER PLANT	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.511+02	2025-12-16 15:04:10.511+02
2b0b1c9b-e28a-4fe5-84e3-05b3a5327043	DP162	\N	REST	BASU	\N	\N	b11dd169-6f33-44d4-91c1-c64c41c36038	\N	76e30c9e-5c8f-4ca2-b103-035eacb0061a	ENVIRONMENTAL & HYGIENE OFFICER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.514+02	2025-12-16 15:04:10.514+02
a7dde0bb-4816-4699-a0f8-435566039a68	DP193	\N	NYASHA	MURIMBA	\N	\N	b11dd169-6f33-44d4-91c1-c64c41c36038	\N	fb9e9f19-e712-46c1-a15a-e31f82e85bdb	SHE ADMINISTRATOR	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.517+02	2025-12-16 15:04:10.517+02
bd4be666-be08-45ad-bf4f-7ec62b33f1a2	DP247	\N	TINASHE	MBOFANA	\N	\N	b11dd169-6f33-44d4-91c1-c64c41c36038	\N	27507348-8d85-465c-9f4d-eb2de330f6c6	SHEQ SUPERINTENDENT	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.521+02	2025-12-16 15:04:10.521+02
42868007-f1ff-4cf3-987b-0bdad6b15c3d	DP249	\N	TAWANDA	MARAMBANYIKA	\N	\N	b11dd169-6f33-44d4-91c1-c64c41c36038	\N	1b0fa5f6-26af-4ff8-95e4-f6082215843f	SHEQ AND ENVIRONMENTAL OFFICER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.524+02	2025-12-16 15:04:10.524+02
c31b1e6b-51e2-4ba4-92b0-b5a7f5ab8ed0	DP253	\N	TAFADZWA	TAHWA	\N	\N	b11dd169-6f33-44d4-91c1-c64c41c36038	\N	0d76c3b6-ad7b-42ae-a891-2e1a6963a6ec	SHE ASSISTANT	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.527+02	2025-12-16 15:04:10.527+02
55cc7c36-6726-4e5f-9cfb-afb38d20633e	DP053	\N	OWEN	CHIRIMANI	\N	\N	0a7efdc6-3068-41ae-8813-a1247c2124f2	\N	0738f426-6126-4ff1-adf8-6ee9825199e6	DRIVER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.53+02	2025-12-16 15:04:10.53+02
ff705e66-5361-4f51-b369-042159a45e05	DP085	\N	ITAI	MUDUKA	\N	\N	0a7efdc6-3068-41ae-8813-a1247c2124f2	\N	718b6f05-a279-4546-a60e-fb56474528ee	CHEF	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.534+02	2025-12-16 15:04:10.534+02
3faad866-f934-47c6-a35a-ad3f5ef531ef	DP150	\N	ARTLEY	SENZERE	\N	\N	0a7efdc6-3068-41ae-8813-a1247c2124f2	\N	fcf4ae2f-46cc-4986-a35e-3a900f144ab8	SITE COORDINATION OFFICER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.538+02	2025-12-16 15:04:10.538+02
b7143a34-5c7d-4521-a471-b3a3cd2f39f3	DP328	\N	SIMON	YONA	\N	\N	0a7efdc6-3068-41ae-8813-a1247c2124f2	\N	a0d2c1c1-71d3-41df-a41b-82571805518b	CATERING AND HOUSEKEEPING SUPERVISOR	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.541+02	2025-12-16 15:04:10.541+02
67e91816-2fa5-4101-a72a-32ea41ee127f	DP041	\N	IGNATIOUS	WAMBE	\N	\N	b8fc0096-6d33-4564-bdca-9a5aa455de19	\N	3bc01602-f307-4fd0-8f36-c72cff13eff3	STORES CONTROLLER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.545+02	2025-12-16 15:04:10.545+02
160040c2-7abc-4bca-a337-12b9e31502c8	DP091	\N	TENDAI	DENGENDE	\N	\N	b8fc0096-6d33-4564-bdca-9a5aa455de19	\N	33394210-a5fd-4c6c-9868-68a4e133e580	STORES MANAGER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.549+02	2025-12-16 15:04:10.549+02
36c69855-4073-44d3-91ca-e7210376f053	DP172	\N	MUNYARADZI	MADONDO	\N	\N	b8fc0096-6d33-4564-bdca-9a5aa455de19	\N	95e05bc4-555d-4c25-a47a-516bfd0fd5d5	ISSUING OFFICER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.553+02	2025-12-16 15:04:10.553+02
77c611b3-4093-43cd-bec4-1d63a11ee58f	DP173	\N	VIOLET	HAMANDISHE	\N	\N	b8fc0096-6d33-4564-bdca-9a5aa455de19	\N	3bc01602-f307-4fd0-8f36-c72cff13eff3	STORES CONTROLLER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.556+02	2025-12-16 15:04:10.556+02
4e0eed3e-dac1-4b03-919d-6a7812e0b397	DP246	\N	MESULI	MOYO	\N	\N	b8fc0096-6d33-4564-bdca-9a5aa455de19	\N	d7c4474f-dff6-4abe-af02-9757a744a372	RECEIVING OFFICER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.559+02	2025-12-16 15:04:10.559+02
f466f5ee-0f9f-499b-b1a6-38575471fead	DP267	\N	RAYNARD	BALENI	\N	\N	b8fc0096-6d33-4564-bdca-9a5aa455de19	\N	326ab03b-c787-48e2-80a1-fcab4b3b5225	PYLOG ADMINISTRATOR	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.562+02	2025-12-16 15:04:10.562+02
2145680f-9c9b-4828-91c5-13f0f9fe5830	DG223	\N	INNOCENT	NYAWANGA	\N	\N	e433f419-8e6f-4d86-8eb5-241768ab5cfb	\N	4950ce56-5ffe-47c2-b1c6-832a791fe4ca	WAREHOUSE ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.587+02	2025-12-16 15:04:10.587+02
094619c2-b307-434b-9f9b-be3634d0b853	DG224	\N	LOVEMORE	NGOROSHA	\N	\N	e433f419-8e6f-4d86-8eb5-241768ab5cfb	\N	4950ce56-5ffe-47c2-b1c6-832a791fe4ca	WAREHOUSE ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.59+02	2025-12-16 15:04:10.59+02
92945415-4a0b-4c86-b5c8-c207b3bd1ddf	DG478	\N	PHIBION	NYAHOKO	\N	\N	e433f419-8e6f-4d86-8eb5-241768ab5cfb	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.594+02	2025-12-16 15:04:10.594+02
3460c492-3b83-419f-a510-8baf6c060a76	DG627	\N	MIRIAM	SANGARE	\N	\N	e433f419-8e6f-4d86-8eb5-241768ab5cfb	\N	443d550c-bdab-48d6-b4f0-90a8c7b6440e	OFFICE CLEANER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.597+02	2025-12-16 15:04:10.597+02
64d7ba04-6a73-4c26-9db1-029c14a9435f	DG006	\N	GEORGE	CHATAMBUDZIKI	\N	\N	6355b60b-6c2c-4aa1-9417-5c66fd8065d9	\N	a424ab05-6024-4d14-9626-7058c9da1989	LABORATORY ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.6+02	2025-12-16 15:04:10.6+02
c1d317f1-2fed-4c05-9d02-8cfda8c2a0b8	DG014	\N	GANIZANI	DIRE	\N	\N	6355b60b-6c2c-4aa1-9417-5c66fd8065d9	\N	a424ab05-6024-4d14-9626-7058c9da1989	LABORATORY ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.604+02	2025-12-16 15:04:10.604+02
d2349529-0733-424a-88cc-e2781016e67b	DG015	\N	NEVER	GREYA	\N	\N	6355b60b-6c2c-4aa1-9417-5c66fd8065d9	\N	a424ab05-6024-4d14-9626-7058c9da1989	LABORATORY ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.607+02	2025-12-16 15:04:10.607+02
a13478e2-492b-4824-b842-56dc39b5c1cd	DG045	\N	MICHAEL	GANDIWA	\N	\N	6355b60b-6c2c-4aa1-9417-5c66fd8065d9	\N	a424ab05-6024-4d14-9626-7058c9da1989	LABORATORY ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.61+02	2025-12-16 15:04:10.61+02
eca7d2a7-3616-4ab1-a80d-97bb27fe9d0a	DG077	\N	TADIWANASHE	CHIKUNI	\N	\N	6355b60b-6c2c-4aa1-9417-5c66fd8065d9	\N	a424ab05-6024-4d14-9626-7058c9da1989	LABORATORY ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.614+02	2025-12-16 15:04:10.614+02
b0bdfcf2-ee46-4d8c-9107-10a4c0f3e156	DG080	\N	RAPHAEL	CHANDIWANA	\N	\N	6355b60b-6c2c-4aa1-9417-5c66fd8065d9	\N	a424ab05-6024-4d14-9626-7058c9da1989	LABORATORY ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.617+02	2025-12-16 15:04:10.617+02
65afa8b1-83c0-4997-bb9c-1bf1e5b72487	DG081	\N	TAPIWA	MASIKINYE	\N	\N	6355b60b-6c2c-4aa1-9417-5c66fd8065d9	\N	a424ab05-6024-4d14-9626-7058c9da1989	LABORATORY ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.621+02	2025-12-16 15:04:10.621+02
a3c0f298-e3fd-4eff-af66-17cceb930524	DG149	\N	DOCTOR	KADZIMA	\N	\N	6355b60b-6c2c-4aa1-9417-5c66fd8065d9	\N	a424ab05-6024-4d14-9626-7058c9da1989	LABORATORY ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.625+02	2025-12-16 15:04:10.625+02
e809c127-b42e-429b-9be8-82fb0af256e5	DG157	\N	CURRENCY	CHIGODHO	\N	\N	6355b60b-6c2c-4aa1-9417-5c66fd8065d9	\N	a424ab05-6024-4d14-9626-7058c9da1989	LABORATORY ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.629+02	2025-12-16 15:04:10.629+02
c70ef7d7-47af-4967-aa00-752cc2e581c8	DG249	\N	TONDERAI	NYANKUNI	\N	\N	6355b60b-6c2c-4aa1-9417-5c66fd8065d9	\N	a424ab05-6024-4d14-9626-7058c9da1989	LABORATORY ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.633+02	2025-12-16 15:04:10.633+02
2a27406a-3e0e-4228-9e88-708f435ae39e	DG250	\N	MALVERN	MASIYA	\N	\N	6355b60b-6c2c-4aa1-9417-5c66fd8065d9	\N	a424ab05-6024-4d14-9626-7058c9da1989	LABORATORY ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.637+02	2025-12-16 15:04:10.637+02
d43c7452-a38b-4d70-b791-11c8ef58062c	DG251	\N	TALENT	CHIORESE	\N	\N	6355b60b-6c2c-4aa1-9417-5c66fd8065d9	\N	a424ab05-6024-4d14-9626-7058c9da1989	LABORATORY ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.64+02	2025-12-16 15:04:10.64+02
8ad94711-65cc-481e-a994-49bc605eede8	DG252	\N	NGONI	CHIBANDA	\N	\N	6355b60b-6c2c-4aa1-9417-5c66fd8065d9	\N	a424ab05-6024-4d14-9626-7058c9da1989	LABORATORY ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.645+02	2025-12-16 15:04:10.645+02
97667a20-dc56-40ee-ab1d-e3f12cd01817	DG253	\N	TRUST	VENGERE	\N	\N	6355b60b-6c2c-4aa1-9417-5c66fd8065d9	\N	a424ab05-6024-4d14-9626-7058c9da1989	LABORATORY ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.648+02	2025-12-16 15:04:10.648+02
7b857c52-4dcb-41e2-b859-2af4419d7b35	DG254	\N	RACCELL	BOX	\N	\N	6355b60b-6c2c-4aa1-9417-5c66fd8065d9	\N	a424ab05-6024-4d14-9626-7058c9da1989	LABORATORY ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.652+02	2025-12-16 15:04:10.652+02
0fa47220-e9c3-4d54-921a-511a3394619e	DG255	\N	PALMER	MAKOSA	\N	\N	6355b60b-6c2c-4aa1-9417-5c66fd8065d9	\N	a424ab05-6024-4d14-9626-7058c9da1989	LABORATORY ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.655+02	2025-12-16 15:04:10.655+02
33a5fef1-b4e8-4641-941a-43ff89c2da49	DG277	\N	CLINTON MUNYARADZI	MARISA	\N	\N	6355b60b-6c2c-4aa1-9417-5c66fd8065d9	\N	a424ab05-6024-4d14-9626-7058c9da1989	LABORATORY ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.659+02	2025-12-16 15:04:10.659+02
6e3c7b9d-e341-4ed3-869e-fc89bd30037c	DG284	\N	TAFADZWA	CHIKOVO	\N	\N	6355b60b-6c2c-4aa1-9417-5c66fd8065d9	\N	a424ab05-6024-4d14-9626-7058c9da1989	LABORATORY ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.663+02	2025-12-16 15:04:10.663+02
660bcc74-94c7-4e0c-a203-7cba8930db01	DG297	\N	TAKUNDA	KAVENDA	\N	\N	6355b60b-6c2c-4aa1-9417-5c66fd8065d9	\N	a424ab05-6024-4d14-9626-7058c9da1989	LABORATORY ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.666+02	2025-12-16 15:04:10.666+02
c845d312-ec9b-49e0-9ae3-614ba71572c8	DG301	\N	STANLEY	MARIMO	\N	\N	6355b60b-6c2c-4aa1-9417-5c66fd8065d9	\N	a424ab05-6024-4d14-9626-7058c9da1989	LABORATORY ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.669+02	2025-12-16 15:04:10.669+02
c2d52b8a-7a45-4a9a-94f9-372a8edce3cf	DG357	\N	CHENGETAI	CHIRIMANI	\N	\N	6355b60b-6c2c-4aa1-9417-5c66fd8065d9	\N	a424ab05-6024-4d14-9626-7058c9da1989	LABORATORY ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.673+02	2025-12-16 15:04:10.673+02
6d6d8b2a-7488-4470-bb6d-2310343d8e5e	DG358	\N	LINCORN	MARATA	\N	\N	6355b60b-6c2c-4aa1-9417-5c66fd8065d9	\N	a424ab05-6024-4d14-9626-7058c9da1989	LABORATORY ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.676+02	2025-12-16 15:04:10.676+02
84c76b2d-0653-499d-89ec-207efcf58dd3	DG428	\N	MICHAEL	NHAMOYEBONDE	\N	\N	6355b60b-6c2c-4aa1-9417-5c66fd8065d9	\N	a424ab05-6024-4d14-9626-7058c9da1989	LABORATORY ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.679+02	2025-12-16 15:04:10.679+02
553a48c7-81a4-48fa-9f74-15580f2515de	DG600	\N	PROSPER	MUKUMBAREZA	\N	\N	6355b60b-6c2c-4aa1-9417-5c66fd8065d9	\N	a424ab05-6024-4d14-9626-7058c9da1989	LABORATORY ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.682+02	2025-12-16 15:04:10.682+02
bb8170bb-60dd-43cb-874b-f5ca8e82329b	DG335	\N	TAFADZWA DYLAN	BANGANYIKA	\N	\N	3abc1952-b1e0-4069-a517-75c0706e2721	\N	78a44413-02f2-4f5b-bf9a-fac917ac1124	PLANNING CLERK	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.721+02	2025-12-16 15:04:10.721+02
bb47f522-7f6e-4bac-91f6-d5da61a71b21	DG479	\N	SHARON	ZHOU	\N	\N	3abc1952-b1e0-4069-a517-75c0706e2721	\N	78a44413-02f2-4f5b-bf9a-fac917ac1124	PLANNING CLERK	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.724+02	2025-12-16 15:04:10.724+02
ed1a0f72-f24a-4dbb-b647-976c308a9bfd	DG535	\N	HANDSON	GWAMATSA	\N	\N	3abc1952-b1e0-4069-a517-75c0706e2721	\N	081d7f22-d95f-4956-beaa-8478c1aa9ef5	CLASS 2 DRIVER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.727+02	2025-12-16 15:04:10.727+02
20480784-7c31-4257-a541-dd09f7ccefbd	DG603	\N	TAKESURE	NYANDORO	\N	\N	3abc1952-b1e0-4069-a517-75c0706e2721	\N	b2f18726-2c09-44a5-aaae-88773248d6b2	STANDBY DRIVER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.73+02	2025-12-16 15:04:10.73+02
fd761180-a2f0-44be-b01d-c6e34c5310cc	DG008	\N	DAVID	CHIGODHO	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	\N	c8f7c1e0-14d7-4c38-9431-ffa9dafc4093	TRACTOR DRIVER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.751+02	2025-12-16 15:04:10.751+02
1aecafb5-5c18-48ba-ab8b-7277826ebb27	DG024	\N	ROBERT	MUTIKITSI	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	\N	f328533c-f091-4ae8-8bf2-2c265f34749c	UD TRUCK DRIVER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.754+02	2025-12-16 15:04:10.754+02
18e0da41-a49c-4068-b1a5-31dc6a262043	DG041	\N	GOOD	MAZHAMBE	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	\N	d0e73106-99e4-4399-b8fb-ed9f58f770c8	TLB OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.757+02	2025-12-16 15:04:10.757+02
51b87249-8456-4c43-a393-b7a7976e43bb	DG047	\N	THOMAS	LAVU	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	\N	3fbd9022-5bf7-4b81-81b2-c84c15f2d5f0	EXCAVATOR OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.76+02	2025-12-16 15:04:10.76+02
5eda85ec-5784-42ee-bd05-1ed9930b99f2	DG087	\N	FRIDAY	MKANDAWIRE	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	\N	a7d25710-c3a0-4955-898c-cb700dc12ae6	FRONT END LOADER OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.762+02	2025-12-16 15:04:10.762+02
3e6358c4-004a-4e96-a4ac-f0b710ba9fe1	DG096	\N	TANAKA	ZVENYIKA	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	\N	8e2645fc-fa1a-45f6-954e-266155e9286c	CRANE OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.766+02	2025-12-16 15:04:10.766+02
dc3bd771-270f-475d-8b05-1b390f73f30c	DG100	\N	WORKERS	CHAKASARA	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	\N	c8f7c1e0-14d7-4c38-9431-ffa9dafc4093	TRACTOR DRIVER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.769+02	2025-12-16 15:04:10.769+02
e8974355-eba9-47eb-b1a9-167eab46c75b	DG101	\N	PASSMORE	CEPHAS	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	\N	4e35a316-55e0-411e-b7a7-654bec12fec1	ASSISTANT PLUMBER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.772+02	2025-12-16 15:04:10.772+02
19803a05-bb3b-4554-9f15-d2ead0902656	DG108	\N	BRIGHTON	NGOMA	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	\N	a7d25710-c3a0-4955-898c-cb700dc12ae6	FRONT END LOADER OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.775+02	2025-12-16 15:04:10.775+02
9fd5eeda-497a-4a00-aca3-56823ed41ebf	DG125	\N	PAUL	CHATIZA	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	\N	98ea4a46-2240-40de-8d3e-cd9377253075	PLUMBERS ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.778+02	2025-12-16 15:04:10.778+02
da2937ce-8a52-45db-9a86-112c1663e47f	DG218	\N	TINEI	KAMAMBO	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	\N	83eadf52-f600-4267-aecb-c01826cd6767	BUS DRIVER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.781+02	2025-12-16 15:04:10.781+02
f6819d43-4eb7-4ebe-a4c8-7ac7588e429f	DG243	\N	PISIRAI	NDIRA	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	\N	98ea4a46-2240-40de-8d3e-cd9377253075	PLUMBERS ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.784+02	2025-12-16 15:04:10.784+02
a8e47aff-3fa1-4101-8363-6545493bed05	DG312	\N	BRENDO	MUGOCHI	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	\N	1357c5f4-10b7-4ac6-aa20-67d971ad705b	WORKSHOP ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.787+02	2025-12-16 15:04:10.787+02
e42405dc-10fd-4a65-ad60-236c09a411e3	DG334	\N	MAZVITA	MAPETESE	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	\N	83eadf52-f600-4267-aecb-c01826cd6767	BUS DRIVER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.79+02	2025-12-16 15:04:10.79+02
bad09d86-bfdd-42af-8b37-dfa33a2814ab	DG405	\N	ISAAC	MARIKANO	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	\N	3fbd9022-5bf7-4b81-81b2-c84c15f2d5f0	EXCAVATOR OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.795+02	2025-12-16 15:04:10.795+02
649d331e-043b-4ac8-aded-6dc645af4e16	DG446	\N	KUDAKWASHE	NTALA	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	\N	8e2645fc-fa1a-45f6-954e-266155e9286c	CRANE OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.798+02	2025-12-16 15:04:10.798+02
536c7e62-1db4-4cf6-80d8-3d9c8fae479b	DG447	\N	PAIMETY	MUROMBO	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	\N	8e2645fc-fa1a-45f6-954e-266155e9286c	CRANE OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.801+02	2025-12-16 15:04:10.801+02
0e848c57-744f-44b2-9153-ca941da24145	DG490	\N	BHEU	PHIRI	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	\N	ceb61d21-5ad0-4301-84b6-764f05b14640	UD CLASS 2 DRIVER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.804+02	2025-12-16 15:04:10.804+02
637f3709-8f76-428e-8c2a-179b99a93497	DG491	\N	SAMUAEL	KATSANDE	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	\N	b2f18726-2c09-44a5-aaae-88773248d6b2	STANDBY DRIVER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.807+02	2025-12-16 15:04:10.807+02
cf72457f-0706-4e39-acd4-2c5a01cbe84d	DG526	\N	LEONARD	CHIPENGO	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	\N	83eadf52-f600-4267-aecb-c01826cd6767	BUS DRIVER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.81+02	2025-12-16 15:04:10.81+02
d8424445-1002-4015-8e5d-c02530da2426	DG534	\N	STANLEY	CHIWOCHA	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	\N	3bab5434-031a-4963-8a3b-d3b08475ba42	MOBIL CRANE OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.813+02	2025-12-16 15:04:10.813+02
4ff1198f-50df-4943-a60f-4f27b87703b8	DG538	\N	ONISMO	MUZHONA	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	\N	6d1f5aa6-d649-4f33-bfa7-73e58ea30293	SEMI SKILLED PLUMBER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.815+02	2025-12-16 15:04:10.815+02
be3f66df-0324-4e6a-82cd-c137cb4d72da	DG547	\N	STEVEN	MUTWIRA	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	\N	83eadf52-f600-4267-aecb-c01826cd6767	BUS DRIVER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.819+02	2025-12-16 15:04:10.819+02
ab6679bc-641c-47a7-82c4-80d643a1e3b8	DG548	\N	EVEREST	DZIMIRI	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	\N	83eadf52-f600-4267-aecb-c01826cd6767	BUS DRIVER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.822+02	2025-12-16 15:04:10.822+02
8079c5f9-9686-45f4-8ef0-f248c3214394	DG573	\N	EDMORE	MAJENGWA	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	\N	d0e73106-99e4-4399-b8fb-ed9f58f770c8	TLB OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.825+02	2025-12-16 15:04:10.825+02
14559cc6-d281-4496-bd62-1259e898c968	DG574	\N	SIMBARASHE	ZISO	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	\N	d46b6b8f-9002-4239-88f3-73a9e4df0612	TELEHANDLER OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.828+02	2025-12-16 15:04:10.828+02
8cef596a-fa28-4ce4-8684-ba2747569256	DG694	\N	MAVUTO	ZODZIWA	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	\N	83eadf52-f600-4267-aecb-c01826cd6767	BUS DRIVER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.832+02	2025-12-16 15:04:10.832+02
7df2b300-7312-470a-8957-7b66a2631831	DG708	\N	TONDERAI	JIMU	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	\N	0bbc555e-d8ad-45fd-a3e3-3e06a333f2d0	FEL OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.836+02	2025-12-16 15:04:10.836+02
7d2cbdfa-1fbc-4b77-9b70-03fe2f937a7a	DG719	\N	COURAGE	CHIFAMBA	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	\N	b20ff8aa-e703-4812-aaa0-96ab4fd77e57	WORKSHOP CLERK	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.839+02	2025-12-16 15:04:10.839+02
8740a21c-7f5c-4de8-bc0d-887ef9dc8703	DG736	\N	MARTIN	DZIMBANHETE	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	\N	7a7b84a4-486b-4e71-b8da-a7e7e329694b	CLASS 1 BUS DRIVER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.842+02	2025-12-16 15:04:10.842+02
d6f79cd9-65c3-4008-9cca-07f375de80f5	DG737	\N	WISDOM	JAKACHIRA	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	\N	7a7b84a4-486b-4e71-b8da-a7e7e329694b	CLASS 1 BUS DRIVER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.846+02	2025-12-16 15:04:10.846+02
2b85976a-3444-4d9e-9585-0d078d928c64	DG738	\N	JONATHAN	NYABADZA	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	\N	7a7b84a4-486b-4e71-b8da-a7e7e329694b	CLASS 1 BUS DRIVER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.85+02	2025-12-16 15:04:10.85+02
00a10b1f-a7b3-4875-b885-4529e37a31f6	DG758	\N	DOUBT	GWESHE	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	\N	d46b6b8f-9002-4239-88f3-73a9e4df0612	TELEHANDLER OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.854+02	2025-12-16 15:04:10.854+02
82e1ed00-5ddd-4317-a134-ff868f69171f	DG778	\N	STANLEY	MAHLENGEZANA	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	\N	3fbd9022-5bf7-4b81-81b2-c84c15f2d5f0	EXCAVATOR OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.857+02	2025-12-16 15:04:10.857+02
1c6ffe5b-5e70-408c-849c-e236efc9a6bd	DG102	\N	RICHMORE	KADZIMA	\N	\N	2d6cfca3-62e2-483e-a808-b22057f2c39f	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.898+02	2025-12-16 15:04:10.898+02
0f024d03-5697-40b7-a60c-8120c2880845	DG130	\N	ITAYI	KAZUNGA	\N	\N	2d6cfca3-62e2-483e-a808-b22057f2c39f	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.901+02	2025-12-16 15:04:10.901+02
cf3543ab-947c-421f-b241-1170939f7f6e	DG154	\N	STANLEY	MANHANGA	\N	\N	2d6cfca3-62e2-483e-a808-b22057f2c39f	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.904+02	2025-12-16 15:04:10.904+02
284f57f4-8ff0-479d-9468-ce939fcfe549	DG186	\N	COURAGE	MAHOVO	\N	\N	2d6cfca3-62e2-483e-a808-b22057f2c39f	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.908+02	2025-12-16 15:04:10.908+02
025baff0-2a8e-4adc-9a28-e7bf883a8f1f	DG193	\N	EFTON	MUSIWA	\N	\N	2d6cfca3-62e2-483e-a808-b22057f2c39f	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.911+02	2025-12-16 15:04:10.911+02
05b2f0a3-5a73-47f4-a1f2-a4321cb7c5ca	DG219	\N	CHAMUNORWA	MUZA	\N	\N	2d6cfca3-62e2-483e-a808-b22057f2c39f	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.915+02	2025-12-16 15:04:10.915+02
7998b0ca-eb63-42f2-8418-35dc321187fc	DG226	\N	SIMON	NYAMUKWATURA	\N	\N	2d6cfca3-62e2-483e-a808-b22057f2c39f	\N	f35b7fa2-ddd8-42a4-8147-768c710c82c3	TEAM LEADER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.918+02	2025-12-16 15:04:10.918+02
c7b2e5e8-1a0a-4b0c-90c7-f66ac9a2bb88	DG326	\N	OWEN	GANDIWA	\N	\N	2d6cfca3-62e2-483e-a808-b22057f2c39f	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.921+02	2025-12-16 15:04:10.921+02
f4d3b8f5-396d-4854-aff9-c09fd054b105	DG339	\N	PAUL	MAVHUNGA	\N	\N	2d6cfca3-62e2-483e-a808-b22057f2c39f	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.924+02	2025-12-16 15:04:10.924+02
dca95c05-74ee-4fbb-a1f5-9ade6a76159e	DG347	\N	DYLLAN	KASEKE	\N	\N	2d6cfca3-62e2-483e-a808-b22057f2c39f	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.927+02	2025-12-16 15:04:10.927+02
a0292770-2b05-43b2-a757-c5a7e220d83a	DG380	\N	SIWASHIRO	MANYAMBA	\N	\N	2d6cfca3-62e2-483e-a808-b22057f2c39f	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.93+02	2025-12-16 15:04:10.93+02
29e3b96b-9e3f-4266-bb3e-57d888815a57	DG383	\N	TRUST	MUSORA	\N	\N	2d6cfca3-62e2-483e-a808-b22057f2c39f	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.933+02	2025-12-16 15:04:10.933+02
9faaf8e9-eeb5-4e47-b647-b3f42e20ad37	DG386	\N	TAFADZWA	MATAI	\N	\N	2d6cfca3-62e2-483e-a808-b22057f2c39f	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.936+02	2025-12-16 15:04:10.936+02
796a8489-907c-437d-ae4c-02639bc75769	DG426	\N	NAPHTALI	PHIRI	\N	\N	2d6cfca3-62e2-483e-a808-b22057f2c39f	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.939+02	2025-12-16 15:04:10.939+02
e59f9d22-3af6-4962-98ca-38847613224c	DG427	\N	MATHEW	MAZHAMBE	\N	\N	2d6cfca3-62e2-483e-a808-b22057f2c39f	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.942+02	2025-12-16 15:04:10.942+02
5eebf55b-8861-42cb-945d-78874c2e4b7c	DG439	\N	GEORGE	MAGWAZA	\N	\N	2d6cfca3-62e2-483e-a808-b22057f2c39f	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.945+02	2025-12-16 15:04:10.945+02
373264ab-74de-41f7-a59e-c33293a2aaaa	DG445	\N	KELVIN	NHAMOYEBONDE	\N	\N	2d6cfca3-62e2-483e-a808-b22057f2c39f	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.948+02	2025-12-16 15:04:10.948+02
2c40a522-aa24-4059-8e56-d10d1cce8341	DG450	\N	TINASHE	HARUMBWI	\N	\N	2d6cfca3-62e2-483e-a808-b22057f2c39f	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.952+02	2025-12-16 15:04:10.952+02
e2247df2-8d6f-4543-b3b0-79181056ac77	DG451	\N	VIRIMAI ANESU	MUKWENYA	\N	\N	2d6cfca3-62e2-483e-a808-b22057f2c39f	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.955+02	2025-12-16 15:04:10.955+02
693a9eda-b2e4-40d8-a4ec-e508fd0a5e83	DG492	\N	WHITEHEAD	CHAMONYONGA	\N	\N	2d6cfca3-62e2-483e-a808-b22057f2c39f	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.957+02	2025-12-16 15:04:10.957+02
6297b3ba-eab3-489f-8076-27a6158341f3	DG493	\N	CARLINGTON	SIREWU	\N	\N	2d6cfca3-62e2-483e-a808-b22057f2c39f	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.96+02	2025-12-16 15:04:10.96+02
8126a142-a1e6-4381-85f8-79156a73ea6e	DG494	\N	WELLINGTON	ARUTURA	\N	\N	2d6cfca3-62e2-483e-a808-b22057f2c39f	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.964+02	2025-12-16 15:04:10.964+02
58adf4e5-643d-4dc8-bc3b-2891fba32d3e	DG496	\N	EDSON	KAMU	\N	\N	2d6cfca3-62e2-483e-a808-b22057f2c39f	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.968+02	2025-12-16 15:04:10.968+02
f09b91eb-25ff-4546-9d23-ab196eed01d1	DG497	\N	MALVERN	NGULUWE	\N	\N	2d6cfca3-62e2-483e-a808-b22057f2c39f	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.971+02	2025-12-16 15:04:10.971+02
d2ab67b7-4057-4b80-adea-d8b7b614bc21	DG498	\N	BRADELY	MUNANGA	\N	\N	2d6cfca3-62e2-483e-a808-b22057f2c39f	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.974+02	2025-12-16 15:04:10.974+02
f25ed1e5-f6c2-441d-a683-eb6382780d39	DG513	\N	TONDERAI	KATURA	\N	\N	2d6cfca3-62e2-483e-a808-b22057f2c39f	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.977+02	2025-12-16 15:04:10.977+02
47d26c60-5ba2-4c5c-9310-68e9995dcac8	DG515	\N	TAFADZWA	GOROMONZI	\N	\N	2d6cfca3-62e2-483e-a808-b22057f2c39f	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.98+02	2025-12-16 15:04:10.98+02
e7b97f78-5785-4e4d-bb6f-b9b5bd324f0f	DG517	\N	GIFT	TEMBO	\N	\N	2d6cfca3-62e2-483e-a808-b22057f2c39f	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.983+02	2025-12-16 15:04:10.983+02
0eba0d3a-4931-4c7f-aa80-21432f946580	DG536	\N	THABANI	MOYO	\N	\N	2d6cfca3-62e2-483e-a808-b22057f2c39f	\N	0738f426-6126-4ff1-adf8-6ee9825199e6	DRIVER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.987+02	2025-12-16 15:04:10.987+02
e944899a-99d0-4131-a460-b2adb49c9c02	DG624	\N	PANASHE	RUSWA	\N	\N	2d6cfca3-62e2-483e-a808-b22057f2c39f	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.99+02	2025-12-16 15:04:10.99+02
a99d3f36-1fc8-4a58-af18-0fcf9d9682e6	DG629	\N	LAMECK	NGIRAZI	\N	\N	2d6cfca3-62e2-483e-a808-b22057f2c39f	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.993+02	2025-12-16 15:04:10.993+02
1ca99756-93d8-4fae-99c5-c14103c99fd4	DG630	\N	EVIDENCE	DANDAWA	\N	\N	2d6cfca3-62e2-483e-a808-b22057f2c39f	\N	b2f18726-2c09-44a5-aaae-88773248d6b2	STANDBY DRIVER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.997+02	2025-12-16 15:04:10.997+02
028cd299-a4fe-4fb8-887f-562b1272d060	DG632	\N	ANYWAY	CHIGODO	\N	\N	2d6cfca3-62e2-483e-a808-b22057f2c39f	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:10.999+02	2025-12-16 15:04:10.999+02
5ed34ef9-6c28-4e4c-9128-0ccef22cf354	DG633	\N	LIBERTY	MUDHINDO	\N	\N	2d6cfca3-62e2-483e-a808-b22057f2c39f	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.002+02	2025-12-16 15:04:11.002+02
899a6f27-d6c2-4c96-bca5-c311d2984f1d	DG637	\N	REMEMBER	FUSIRA	\N	\N	2d6cfca3-62e2-483e-a808-b22057f2c39f	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.005+02	2025-12-16 15:04:11.005+02
c5ae24d9-d029-4711-acba-99c438de0240	DG657	\N	ALBERT	MASHIKI	\N	\N	2d6cfca3-62e2-483e-a808-b22057f2c39f	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.008+02	2025-12-16 15:04:11.008+02
ab3d5ec6-7ce0-4417-b9b2-617f7b117cf5	DG702	\N	JABULANI	TOGAREPI	\N	\N	2d6cfca3-62e2-483e-a808-b22057f2c39f	\N	70df16fc-c911-4758-9d4f-3b095dd4bb22	CLASS 4 DRIVER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.011+02	2025-12-16 15:04:11.011+02
6e6e33ad-c4cb-4e36-a246-ba13e3b9897c	DG733	\N	TATENDA	CHIRIMA	\N	\N	2d6cfca3-62e2-483e-a808-b22057f2c39f	\N	27454dda-f83c-4844-850d-463c6077aed9	ELECTRICIAN ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.014+02	2025-12-16 15:04:11.014+02
e15d924c-7193-4b4c-9ea7-4cbe1ea19e6d	DG757	\N	ZVIKOMBORERO	GOZHO	\N	\N	2d6cfca3-62e2-483e-a808-b22057f2c39f	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.017+02	2025-12-16 15:04:11.017+02
7b5e3ad4-72c1-46a2-8492-9633481dca50	DG730	\N	KUDZAISHE	DHAMBUZA	\N	\N	fa570fb8-b13c-4fe5-8da9-e49f7f01dede	\N	af2eab91-cc41-44f5-ab9f-7894cf0f013a	CORE SHED ATTENDANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.055+02	2025-12-16 15:04:11.055+02
5f9f2aed-4a01-4485-acde-a8d09bb6ca88	DG770	\N	PANASHE	CHINZOU	\N	\N	fa570fb8-b13c-4fe5-8da9-e49f7f01dede	\N	bef7c808-e9bb-41d7-b9de-27bf67927de0	DRILL RIG ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.059+02	2025-12-16 15:04:11.059+02
107afe57-5817-4f1c-af0e-8a093bac9c15	DG771	\N	ANTHONY	CHIKUKWA	\N	\N	fa570fb8-b13c-4fe5-8da9-e49f7f01dede	\N	bef7c808-e9bb-41d7-b9de-27bf67927de0	DRILL RIG ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.062+02	2025-12-16 15:04:11.062+02
f9841404-b65f-4726-ac82-e4d16f20a204	DG772	\N	JEMITINOS	MUTSIKIWA	\N	\N	fa570fb8-b13c-4fe5-8da9-e49f7f01dede	\N	af2eab91-cc41-44f5-ab9f-7894cf0f013a	CORE SHED ATTENDANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.065+02	2025-12-16 15:04:11.065+02
d5bb5f3c-5b1f-47b4-ba43-dd1b1e98f3ce	DG773	\N	REJOICE	JAVANGWE	\N	\N	fa570fb8-b13c-4fe5-8da9-e49f7f01dede	\N	bef7c808-e9bb-41d7-b9de-27bf67927de0	DRILL RIG ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.071+02	2025-12-16 15:04:11.071+02
7ba9bc4f-8f32-47a1-82b8-83f1bc542215	DG774	\N	TATENDA	MUNYENYIWA	\N	\N	fa570fb8-b13c-4fe5-8da9-e49f7f01dede	\N	bef7c808-e9bb-41d7-b9de-27bf67927de0	DRILL RIG ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.075+02	2025-12-16 15:04:11.075+02
40c448c8-1273-4e27-be8c-3a494691cb63	DG775	\N	TONDERAI	MAVHURA	\N	\N	fa570fb8-b13c-4fe5-8da9-e49f7f01dede	\N	bef7c808-e9bb-41d7-b9de-27bf67927de0	DRILL RIG ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.078+02	2025-12-16 15:04:11.078+02
743a51a3-8e22-4b28-8046-8656b700b8b8	DG776	\N	PRINCE	MASVANHISE	\N	\N	fa570fb8-b13c-4fe5-8da9-e49f7f01dede	\N	bef7c808-e9bb-41d7-b9de-27bf67927de0	DRILL RIG ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.081+02	2025-12-16 15:04:11.081+02
f7955d74-a4d2-4dfa-a4d4-a96fe09e6336	DG132	\N	KELVIN KUDAKWASHE	NYAMAVABVU	\N	\N	6b72e8dd-f8ee-4c2a-8e44-ea44e4794041	\N	0858a6fb-ea68-4dc8-beb4-92f568988eaa	CCTV OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.195+02	2025-12-16 15:04:11.195+02
ab29e1cf-b55c-4cba-9ca3-c669c432e9be	DG221	\N	MARGARET	CHITIKI	\N	\N	6b72e8dd-f8ee-4c2a-8e44-ea44e4794041	\N	0858a6fb-ea68-4dc8-beb4-92f568988eaa	CCTV OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.199+02	2025-12-16 15:04:11.199+02
1d05f1ef-593f-4736-9373-cd3843bbc6f5	DG419	\N	AUDREY	CHIFWAFWA	\N	\N	6b72e8dd-f8ee-4c2a-8e44-ea44e4794041	\N	0858a6fb-ea68-4dc8-beb4-92f568988eaa	CCTV OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.203+02	2025-12-16 15:04:11.203+02
71765269-6275-4add-81a3-90d3a7c98f49	DG434	\N	CHONDE	BENNY	\N	\N	6b72e8dd-f8ee-4c2a-8e44-ea44e4794041	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.206+02	2025-12-16 15:04:11.206+02
5d1e7c79-c174-4fbb-9368-1603ab92af3d	DG476	\N	NIXON	VELLEM	\N	\N	6b72e8dd-f8ee-4c2a-8e44-ea44e4794041	\N	0858a6fb-ea68-4dc8-beb4-92f568988eaa	CCTV OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.209+02	2025-12-16 15:04:11.209+02
553652d2-7d49-4b61-90c2-f38b6bd2b6f2	DG530	\N	TONGAI	MAGURA	\N	\N	6b72e8dd-f8ee-4c2a-8e44-ea44e4794041	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.212+02	2025-12-16 15:04:11.212+02
79bb3233-7314-4fbd-8c77-6cece1bdea5a	DG545	\N	SYLVESTER	GUNJA	\N	\N	6b72e8dd-f8ee-4c2a-8e44-ea44e4794041	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.214+02	2025-12-16 15:04:11.214+02
489f9030-9919-4917-a8ea-3eb58dbf5756	DG571	\N	CHRISTOPHER	KUGOTSI	\N	\N	6b72e8dd-f8ee-4c2a-8e44-ea44e4794041	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.218+02	2025-12-16 15:04:11.218+02
89152e33-b366-43f7-a1c9-63cbae0302d2	DG580	\N	SIMBARASHE	KAZUNGA	\N	\N	6b72e8dd-f8ee-4c2a-8e44-ea44e4794041	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.22+02	2025-12-16 15:04:11.22+02
bb084377-d78c-40b0-b533-614f2d9250d5	DG588	\N	SINCEWELL	MBUNDURE	\N	\N	6b72e8dd-f8ee-4c2a-8e44-ea44e4794041	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.223+02	2025-12-16 15:04:11.223+02
378a01e5-538a-40f5-875f-fd403fc3c240	DG591	\N	IRVINE	MAZHAMBE	\N	\N	6b72e8dd-f8ee-4c2a-8e44-ea44e4794041	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.226+02	2025-12-16 15:04:11.226+02
a7edb3f3-ee52-4f64-b054-41f4aa9b9c57	DG620	\N	TADIWANASHE	CHAPANDA	\N	\N	6b72e8dd-f8ee-4c2a-8e44-ea44e4794041	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.229+02	2025-12-16 15:04:11.229+02
ab9488cb-9474-4b6c-b791-6dabe734f09a	DG652	\N	LYTON	MBEREKO	\N	\N	6b72e8dd-f8ee-4c2a-8e44-ea44e4794041	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.232+02	2025-12-16 15:04:11.232+02
ff25c25a-4100-496e-8cb5-eede3bdfbd22	DG720	\N	EDMORE	REVAI	\N	\N	6b72e8dd-f8ee-4c2a-8e44-ea44e4794041	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.235+02	2025-12-16 15:04:11.235+02
dbcbc482-33f8-4819-9dae-6abe0f6c1238	DG723	\N	BIANCAH	NATANI	\N	\N	b11dd169-6f33-44d4-91c1-c64c41c36038	\N	6b62b2ff-93ba-4fbd-91be-5973fdb93d20	FIRST AID TRAINER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.238+02	2025-12-16 15:04:11.238+02
dc3c6dad-0bbc-4ef9-8c95-0ce442145899	DG049	\N	PHILLIP	CHIKOYA	\N	\N	0a7efdc6-3068-41ae-8813-a1247c2124f2	\N	5fe85b21-e124-4a04-ac23-4554ab0096a4	HANDYMAN	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.241+02	2025-12-16 15:04:11.241+02
d6bdedcd-5a17-4ef6-895e-8b6f87b90bd6	DG050	\N	MARK	CHIKOYA	\N	\N	0a7efdc6-3068-41ae-8813-a1247c2124f2	\N	29512386-8914-47ea-86bc-930440a54d97	WELFARE WORKER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.244+02	2025-12-16 15:04:11.244+02
a8fa13c9-0844-4132-bd6c-e97f56e17c10	DG090	\N	TANATSA	CHIGWENJERE	\N	\N	0a7efdc6-3068-41ae-8813-a1247c2124f2	\N	666e942a-d1cb-4702-8f0d-90e00c03f593	COOK	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.247+02	2025-12-16 15:04:11.247+02
e0bfdb99-2d93-4da5-a39e-40fb335a9752	DG091	\N	VINCENT	CHIMBUMU	\N	\N	0a7efdc6-3068-41ae-8813-a1247c2124f2	\N	666e942a-d1cb-4702-8f0d-90e00c03f593	COOK	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.25+02	2025-12-16 15:04:11.25+02
40ec5692-89ef-4a21-9f6a-cd57b0903b22	DG093	\N	MASS	CHITIKI	\N	\N	0a7efdc6-3068-41ae-8813-a1247c2124f2	\N	43da824f-d0c4-460a-8078-60f51cd4791d	TEAM LEADER HOUSEKEEPING	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.253+02	2025-12-16 15:04:11.253+02
c288c63c-c2ac-482e-9f95-3d0e2f70d9a6	DG094	\N	GLADYS	CHIDANGURO	\N	\N	0a7efdc6-3068-41ae-8813-a1247c2124f2	\N	3fefd9f5-29cd-43fe-8319-df74b22f59be	HOUSEKEEPER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.256+02	2025-12-16 15:04:11.256+02
1757367a-5455-4332-b9f0-91e7abc61239	DG095	\N	RANGANAI	MUKANDAVANHU	\N	\N	0a7efdc6-3068-41ae-8813-a1247c2124f2	\N	31f0669b-27e1-4baa-baa3-1cddc6056b0f	LAUNDRY ATTENDANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.259+02	2025-12-16 15:04:11.259+02
c24d424a-165e-44d2-9609-64c07b933207	DG099	\N	JIMMINIC	BUNGU	\N	\N	0a7efdc6-3068-41ae-8813-a1247c2124f2	\N	f35b7fa2-ddd8-42a4-8147-768c710c82c3	TEAM LEADER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.262+02	2025-12-16 15:04:11.262+02
c66e7479-3ce1-4236-8100-250c2df727cf	DG180	\N	TAFIRENYIKA	CHIMANIKIRE	\N	\N	0a7efdc6-3068-41ae-8813-a1247c2124f2	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.265+02	2025-12-16 15:04:11.265+02
51256668-2b8e-4a62-b730-9c4f0c1f7939	DG206	\N	GUESFORD	CHIDENYIKA	\N	\N	0a7efdc6-3068-41ae-8813-a1247c2124f2	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.267+02	2025-12-16 15:04:11.267+02
270f7150-5118-4ae9-aa10-e75178a942bb	DG236	\N	SILENT	BUNGU	\N	\N	0a7efdc6-3068-41ae-8813-a1247c2124f2	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.27+02	2025-12-16 15:04:11.27+02
4b3989ff-2531-4621-9411-913b87823a68	DG290	\N	CHRISTOPHER	GARINGA	\N	\N	0a7efdc6-3068-41ae-8813-a1247c2124f2	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.273+02	2025-12-16 15:04:11.273+02
6a2edd10-aef0-4086-aed1-4290774c3bed	DG364	\N	RICHMORE	MAZHAMBE	\N	\N	0a7efdc6-3068-41ae-8813-a1247c2124f2	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.276+02	2025-12-16 15:04:11.276+02
f34fb4ed-9130-426f-9158-8228803d972c	DG389	\N	SILENT	KAPIYA	\N	\N	0a7efdc6-3068-41ae-8813-a1247c2124f2	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.279+02	2025-12-16 15:04:11.279+02
3410830a-8242-4786-b0e4-805555352e7a	DG399	\N	LUWESI	MANDIVAVARIRA	\N	\N	0a7efdc6-3068-41ae-8813-a1247c2124f2	\N	3fefd9f5-29cd-43fe-8319-df74b22f59be	HOUSEKEEPER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.283+02	2025-12-16 15:04:11.283+02
d8c7dece-25f4-4def-8001-0244642ecd6a	DG400	\N	GETRUDE	CHINYAMA	\N	\N	0a7efdc6-3068-41ae-8813-a1247c2124f2	\N	3fefd9f5-29cd-43fe-8319-df74b22f59be	HOUSEKEEPER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.286+02	2025-12-16 15:04:11.286+02
d4467046-a1e1-4c42-aa13-f0f13141c935	DG436	\N	ELIZARY	JACK	\N	\N	0a7efdc6-3068-41ae-8813-a1247c2124f2	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.288+02	2025-12-16 15:04:11.288+02
28161f61-eb57-48cf-83ef-763aca0732f4	DG454	\N	CLARA	MUSHONGA	\N	\N	0a7efdc6-3068-41ae-8813-a1247c2124f2	\N	31f0669b-27e1-4baa-baa3-1cddc6056b0f	LAUNDRY ATTENDANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.291+02	2025-12-16 15:04:11.291+02
c5aedd76-f31d-42d9-bc8e-d41c7fe5fb73	DG458	\N	SHARON	JENGENI	\N	\N	0a7efdc6-3068-41ae-8813-a1247c2124f2	\N	3fefd9f5-29cd-43fe-8319-df74b22f59be	HOUSEKEEPER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.294+02	2025-12-16 15:04:11.294+02
f09ae8c4-511a-4505-86e0-78e5e95d89ef	DG459	\N	LILY	SITHOLE	\N	\N	0a7efdc6-3068-41ae-8813-a1247c2124f2	\N	666e942a-d1cb-4702-8f0d-90e00c03f593	COOK	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.298+02	2025-12-16 15:04:11.298+02
8c7db4c5-8f5b-45bd-b1ba-ca61d237da85	DG460	\N	KURAUONE	GWANDE	\N	\N	0a7efdc6-3068-41ae-8813-a1247c2124f2	\N	666e942a-d1cb-4702-8f0d-90e00c03f593	COOK	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.301+02	2025-12-16 15:04:11.301+02
89fddb17-251a-4af3-8950-20120b6e2590	DG462	\N	SIMBARASHE	CHIMBAMBO	\N	\N	0a7efdc6-3068-41ae-8813-a1247c2124f2	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.304+02	2025-12-16 15:04:11.304+02
68f9b729-c8a2-4b60-8287-2130b9225fb4	DG463	\N	ANGELINE	NYAMBO	\N	\N	0a7efdc6-3068-41ae-8813-a1247c2124f2	\N	3fefd9f5-29cd-43fe-8319-df74b22f59be	HOUSEKEEPER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.307+02	2025-12-16 15:04:11.307+02
93b11afc-2cab-422e-b5bc-e3c5383794dc	DG464	\N	MOREBLESSING	MAHASO	\N	\N	0a7efdc6-3068-41ae-8813-a1247c2124f2	\N	31f0669b-27e1-4baa-baa3-1cddc6056b0f	LAUNDRY ATTENDANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.31+02	2025-12-16 15:04:11.31+02
c2c7e417-18fe-4b28-b684-59f971aadcb8	DG518	\N	TRUSTER	GAUKA	\N	\N	0a7efdc6-3068-41ae-8813-a1247c2124f2	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.312+02	2025-12-16 15:04:11.312+02
651c9445-9576-47c5-80f4-4a29381e61b3	DG549	\N	LIANA	MANYIKA	\N	\N	0a7efdc6-3068-41ae-8813-a1247c2124f2	\N	3fefd9f5-29cd-43fe-8319-df74b22f59be	HOUSEKEEPER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.316+02	2025-12-16 15:04:11.316+02
b9e8b2df-3094-4957-9573-366c8c6d03c5	DG599	\N	IGNATIOUS	NYAHUMA	\N	\N	0a7efdc6-3068-41ae-8813-a1247c2124f2	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.319+02	2025-12-16 15:04:11.319+02
0126b3d4-d8e0-410a-a8e6-42689c54a2c4	DG653	\N	WESLEY	KONDO	\N	\N	0a7efdc6-3068-41ae-8813-a1247c2124f2	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.322+02	2025-12-16 15:04:11.322+02
b5ede195-47e6-455c-bbe3-cda35dcb8122	DG658	\N	LUXMORE	CHIRAPA	\N	\N	0a7efdc6-3068-41ae-8813-a1247c2124f2	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.325+02	2025-12-16 15:04:11.325+02
3c713842-ea55-4055-8844-1f6191e83780	DG660	\N	IGNATIOUS	THOMAS	\N	\N	0a7efdc6-3068-41ae-8813-a1247c2124f2	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.328+02	2025-12-16 15:04:11.328+02
f5784603-6f2a-4eb0-a181-7ceb26821296	DG661	\N	INNOCENT	KADAIRA	\N	\N	0a7efdc6-3068-41ae-8813-a1247c2124f2	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.331+02	2025-12-16 15:04:11.331+02
4a90fb86-e92e-49cd-8d2a-d210756c6666	DG662	\N	PRECIOUS	TONGOFA	\N	\N	0a7efdc6-3068-41ae-8813-a1247c2124f2	\N	aeefef6f-544d-4ca5-9776-99d3052b4b22	HOUSE KEEPER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.334+02	2025-12-16 15:04:11.334+02
6d60b7c1-829c-4cb7-9ad6-858d2fa4a333	DG687	\N	AGATHA	KAWARA	\N	\N	0a7efdc6-3068-41ae-8813-a1247c2124f2	\N	aeefef6f-544d-4ca5-9776-99d3052b4b22	HOUSE KEEPER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.337+02	2025-12-16 15:04:11.337+02
cf69e4f2-6448-446e-8d4c-e46d54e994c6	DG715	\N	SHARON	KARASA	\N	\N	0a7efdc6-3068-41ae-8813-a1247c2124f2	\N	a247dffd-d4d8-41c9-8a23-6ed0411dfaea	KITCHEN PORTER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.34+02	2025-12-16 15:04:11.34+02
545a9b10-1de6-4847-9f6d-3151cdb5b981	DG716	\N	THERESA	CHIKOYA	\N	\N	0a7efdc6-3068-41ae-8813-a1247c2124f2	\N	a247dffd-d4d8-41c9-8a23-6ed0411dfaea	KITCHEN PORTER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.342+02	2025-12-16 15:04:11.342+02
d98a18ac-eee6-4cf2-ab79-6540afb6b043	DG759	\N	LEARNMORE	MAFAIROSI	\N	\N	0a7efdc6-3068-41ae-8813-a1247c2124f2	\N	aeefef6f-544d-4ca5-9776-99d3052b4b22	HOUSE KEEPER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.345+02	2025-12-16 15:04:11.345+02
ddeb3752-d321-4324-ad5b-3a86fa937e37	DG768	\N	ELENA	MENAD	\N	\N	0a7efdc6-3068-41ae-8813-a1247c2124f2	\N	3fefd9f5-29cd-43fe-8319-df74b22f59be	HOUSEKEEPER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.348+02	2025-12-16 15:04:11.348+02
c285b08b-c7d1-4ef4-a69d-42708f1709a6	DG769	\N	TSITSI	CHAMBURUMBUDZA	\N	\N	0a7efdc6-3068-41ae-8813-a1247c2124f2	\N	3fefd9f5-29cd-43fe-8319-df74b22f59be	HOUSEKEEPER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.351+02	2025-12-16 15:04:11.351+02
19b7351f-a25c-4336-8877-9db8cc266856	DG783	\N	MILLICENT	MACHIPISA	\N	\N	0a7efdc6-3068-41ae-8813-a1247c2124f2	\N	666e942a-d1cb-4702-8f0d-90e00c03f593	COOK	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.354+02	2025-12-16 15:04:11.354+02
720cd198-cbee-433d-aa2e-a6e5fa6eecd0	DG785	\N	JOSEPHINE	MATYORAUTA	\N	\N	0a7efdc6-3068-41ae-8813-a1247c2124f2	\N	aeefef6f-544d-4ca5-9776-99d3052b4b22	HOUSE KEEPER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.357+02	2025-12-16 15:04:11.357+02
21493604-d5ce-4738-94a8-989bc00fc9a5	DG786	\N	FOYLINE	MUTSVENGURI	\N	\N	0a7efdc6-3068-41ae-8813-a1247c2124f2	\N	aeefef6f-544d-4ca5-9776-99d3052b4b22	HOUSE KEEPER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.36+02	2025-12-16 15:04:11.36+02
424dd77b-e29d-40df-9ab8-a1fd0c0e5725	DG002	\N	MARK	BANDERA	\N	\N	b8fc0096-6d33-4564-bdca-9a5aa455de19	\N	ceb90d63-f953-4a58-821c-63405afafbd1	SENIOR STORES CLERK	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.364+02	2025-12-16 15:04:11.364+02
9fc4520a-401a-47f7-b801-0aa4efd5645a	DG038	\N	TAMBURAI	RUWO	\N	\N	b8fc0096-6d33-4564-bdca-9a5aa455de19	\N	8631cad3-35c2-41d0-a167-b782a172880c	STORES CLERK	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.367+02	2025-12-16 15:04:11.367+02
b266f8c6-7a6e-479a-b8d0-0621c9486a0e	DG070	\N	JUSTICE	MAVUNGA	\N	\N	b8fc0096-6d33-4564-bdca-9a5aa455de19	\N	8631cad3-35c2-41d0-a167-b782a172880c	STORES CLERK	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.371+02	2025-12-16 15:04:11.371+02
b9554253-e698-4383-b45b-e3c0cbcd5999	DG086	\N	RASHEED	SIMANI	\N	\N	b8fc0096-6d33-4564-bdca-9a5aa455de19	\N	8631cad3-35c2-41d0-a167-b782a172880c	STORES CLERK	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.374+02	2025-12-16 15:04:11.374+02
417dda2f-92b8-4e8a-b352-b157deae9043	DG197	\N	INNOCENT	WAMBE	\N	\N	b8fc0096-6d33-4564-bdca-9a5aa455de19	\N	8631cad3-35c2-41d0-a167-b782a172880c	STORES CLERK	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.378+02	2025-12-16 15:04:11.378+02
e8e5bf2b-29c6-442e-8bd2-89c6f45a3f6f	DG240	\N	CALISTO	CHIBAGU	\N	\N	b8fc0096-6d33-4564-bdca-9a5aa455de19	\N	8822c29b-266c-4239-958d-4b03dfa2465c	STOREKEEPER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.381+02	2025-12-16 15:04:11.381+02
5ed44f1d-3497-42c4-8def-f7858e9c7527	DG262	\N	ROBSON	CHINYAMA	\N	\N	b8fc0096-6d33-4564-bdca-9a5aa455de19	\N	8631cad3-35c2-41d0-a167-b782a172880c	STORES CLERK	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.385+02	2025-12-16 15:04:11.385+02
2457710b-9f3c-46f6-b1ae-686a6a51691f	DG341	\N	RAPHAEL	MASHONGANYIKA	\N	\N	b8fc0096-6d33-4564-bdca-9a5aa455de19	\N	8631cad3-35c2-41d0-a167-b782a172880c	STORES CLERK	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.388+02	2025-12-16 15:04:11.388+02
712007b1-c4b4-4353-b525-d04214d3bc77	DG366	\N	MAXWELL	MUFENGI	\N	\N	b8fc0096-6d33-4564-bdca-9a5aa455de19	\N	8631cad3-35c2-41d0-a167-b782a172880c	STORES CLERK	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.391+02	2025-12-16 15:04:11.391+02
9991898f-8e0e-4d8e-8006-928d99a0c92e	DG404	\N	EUNICE	TARUVINGA	\N	\N	b8fc0096-6d33-4564-bdca-9a5aa455de19	\N	ceb90d63-f953-4a58-821c-63405afafbd1	SENIOR STORES CLERK	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.394+02	2025-12-16 15:04:11.394+02
008201d4-dad6-4fd9-8e3b-1797f66801e5	DG582	\N	CECIL	MARANGE	\N	\N	b8fc0096-6d33-4564-bdca-9a5aa455de19	\N	8631cad3-35c2-41d0-a167-b782a172880c	STORES CLERK	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.397+02	2025-12-16 15:04:11.397+02
4a812bed-4bfd-4c81-9a10-bf8e1f0124da	DG075	\N	THEOPHELOUS	BHANDA	\N	\N	b30c7026-796a-4dc7-89fd-48dc74c0d9c2	\N	0e4a9459-df62-4eae-bd7b-662cf6d75454	APPRENTICE	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.403+02	2025-12-16 15:04:11.403+02
4ec02caa-ae3f-4e61-87d3-50f7130a30c2	DG158	\N	PROSPER A	MATIBIRI	\N	\N	b30c7026-796a-4dc7-89fd-48dc74c0d9c2	\N	0e4a9459-df62-4eae-bd7b-662cf6d75454	APPRENTICE	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.406+02	2025-12-16 15:04:11.406+02
d41a6767-c073-4a94-80f9-74e3ae3b3206	DG320	\N	WELCOME	DHINGA	\N	\N	b30c7026-796a-4dc7-89fd-48dc74c0d9c2	\N	0e4a9459-df62-4eae-bd7b-662cf6d75454	APPRENTICE	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.409+02	2025-12-16 15:04:11.409+02
b6d24a78-2b99-4f8d-bc4a-80d4a5025204	DG346	\N	CALVIN	CHIFAMBA	\N	\N	b30c7026-796a-4dc7-89fd-48dc74c0d9c2	\N	0e4a9459-df62-4eae-bd7b-662cf6d75454	APPRENTICE	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.412+02	2025-12-16 15:04:11.412+02
da1f415b-91fa-4f91-817d-503614079271	DG488	\N	RONALD	TAULO	\N	\N	b30c7026-796a-4dc7-89fd-48dc74c0d9c2	\N	501b8d98-36a6-4d82-98d7-9b45b0ee935d	APPRENTICE BOILERMAKER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.416+02	2025-12-16 15:04:11.416+02
d2ad66aa-9de6-487b-8965-5df007dffc59	DG682	\N	FUNGISAI	MAZANI	\N	\N	b30c7026-796a-4dc7-89fd-48dc74c0d9c2	\N	0e4a9459-df62-4eae-bd7b-662cf6d75454	APPRENTICE	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.419+02	2025-12-16 15:04:11.419+02
af2a5bd3-76d3-4b24-8392-ca4327ee2b9d	DG683	\N	ELIAS	MACHEKA	\N	\N	b30c7026-796a-4dc7-89fd-48dc74c0d9c2	\N	0e4a9459-df62-4eae-bd7b-662cf6d75454	APPRENTICE	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.422+02	2025-12-16 15:04:11.422+02
d60eeaad-1850-4108-a417-24fc9947eaa4	DG684	\N	TANDIRAYI	CHIGWESHE	\N	\N	b30c7026-796a-4dc7-89fd-48dc74c0d9c2	\N	0e4a9459-df62-4eae-bd7b-662cf6d75454	APPRENTICE	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.425+02	2025-12-16 15:04:11.425+02
f2269f32-8d57-47e7-9a1c-985e31e26462	DG685	\N	BYL	MANYANGE	\N	\N	b30c7026-796a-4dc7-89fd-48dc74c0d9c2	\N	0e4a9459-df62-4eae-bd7b-662cf6d75454	APPRENTICE	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.427+02	2025-12-16 15:04:11.427+02
ede41a03-7a3f-4c80-957a-652823ccd07d	DG686	\N	TAKUNDA	MAZARA	\N	\N	b30c7026-796a-4dc7-89fd-48dc74c0d9c2	\N	0e4a9459-df62-4eae-bd7b-662cf6d75454	APPRENTICE	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.43+02	2025-12-16 15:04:11.43+02
350fab2d-4a51-4674-82d1-57b64eb97746	DG747	\N	CEPHAS	MAIMBE	\N	\N	b30c7026-796a-4dc7-89fd-48dc74c0d9c2	\N	fefbf76b-2d9d-407e-9155-eed753d8c568	STUDENT ON ATTACHEMENT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.434+02	2025-12-16 15:04:11.434+02
addfd2d9-e669-47f7-a21e-927098aa8e2d	DG750	\N	CONSTANCE	MAKUNDE	\N	\N	b30c7026-796a-4dc7-89fd-48dc74c0d9c2	\N	fefbf76b-2d9d-407e-9155-eed753d8c568	STUDENT ON ATTACHEMENT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.437+02	2025-12-16 15:04:11.437+02
061af1e2-153b-4d3e-9f15-37059bc754ef	DG751	\N	GILBERT	ZENGEYA	\N	\N	b30c7026-796a-4dc7-89fd-48dc74c0d9c2	\N	fefbf76b-2d9d-407e-9155-eed753d8c568	STUDENT ON ATTACHEMENT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.44+02	2025-12-16 15:04:11.44+02
982443f8-4c6c-4e8e-8b6f-6c201e67b520	DG752	\N	TRACEY	BHENHURA	\N	\N	b30c7026-796a-4dc7-89fd-48dc74c0d9c2	\N	fefbf76b-2d9d-407e-9155-eed753d8c568	STUDENT ON ATTACHEMENT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.443+02	2025-12-16 15:04:11.443+02
fc7f1271-e9ca-4701-b252-c7170e04abe9	DG753	\N	TANAKA	NGWARU	\N	\N	b30c7026-796a-4dc7-89fd-48dc74c0d9c2	\N	fefbf76b-2d9d-407e-9155-eed753d8c568	STUDENT ON ATTACHEMENT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.445+02	2025-12-16 15:04:11.445+02
91420067-4ffb-4fe9-bce0-36ecf2f03151	DG754	\N	MANUEL	ARUBINU	\N	\N	b30c7026-796a-4dc7-89fd-48dc74c0d9c2	\N	fefbf76b-2d9d-407e-9155-eed753d8c568	STUDENT ON ATTACHEMENT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.449+02	2025-12-16 15:04:11.449+02
43a430e6-5b6d-4185-a500-a892be3fc560	DG755	\N	LEVONIA	MUNOCHIWEYI	\N	\N	b30c7026-796a-4dc7-89fd-48dc74c0d9c2	\N	fefbf76b-2d9d-407e-9155-eed753d8c568	STUDENT ON ATTACHEMENT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.452+02	2025-12-16 15:04:11.452+02
d5f148b4-6847-44ff-85fd-f4287387fb1c	DG756	\N	ANESU	TENENE	\N	\N	b30c7026-796a-4dc7-89fd-48dc74c0d9c2	\N	fefbf76b-2d9d-407e-9155-eed753d8c568	STUDENT ON ATTACHEMENT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.455+02	2025-12-16 15:04:11.455+02
9db234f8-eea9-4bfd-9600-3b9ef5ea36b1	DG762	\N	MUFARO	MADZVAMUSE	\N	\N	b30c7026-796a-4dc7-89fd-48dc74c0d9c2	\N	a4b3c28b-9614-431b-8333-ffa14713deac	STUDENT ON ATTACHMENT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.458+02	2025-12-16 15:04:11.458+02
b7c3b9db-2520-4746-83e5-cd257082aa35	DG764	\N	DONALD	GATSI	\N	\N	b30c7026-796a-4dc7-89fd-48dc74c0d9c2	\N	a4b3c28b-9614-431b-8333-ffa14713deac	STUDENT ON ATTACHMENT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.46+02	2025-12-16 15:04:11.46+02
437c76e7-1961-445d-9bac-f0a1a7827a52	DG765	\N	ASHGRACE	DZURO	\N	\N	b30c7026-796a-4dc7-89fd-48dc74c0d9c2	\N	a4b3c28b-9614-431b-8333-ffa14713deac	STUDENT ON ATTACHMENT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.463+02	2025-12-16 15:04:11.463+02
3b4f4b57-712c-4fbb-8e23-a412244f9776	DG766	\N	MOTION	MUSARURWA	\N	\N	b30c7026-796a-4dc7-89fd-48dc74c0d9c2	\N	a4b3c28b-9614-431b-8333-ffa14713deac	STUDENT ON ATTACHMENT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.466+02	2025-12-16 15:04:11.466+02
159627ec-51a3-4946-9bc4-19400f58d40f	DG767	\N	DADISO	DHLEMBEU	\N	\N	b30c7026-796a-4dc7-89fd-48dc74c0d9c2	\N	a4b3c28b-9614-431b-8333-ffa14713deac	STUDENT ON ATTACHMENT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.469+02	2025-12-16 15:04:11.469+02
bdcf448f-2204-4089-bf83-b5f0cc6d1a5e	DG777	\N	TADIWANASHE	MAKULUNGA	\N	\N	b30c7026-796a-4dc7-89fd-48dc74c0d9c2	\N	a4b3c28b-9614-431b-8333-ffa14713deac	STUDENT ON ATTACHMENT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.474+02	2025-12-16 15:04:11.474+02
69701333-7fc3-4391-bed8-4aad0022c655	DG779	\N	SHINGIRIRAI	NDLOVU	\N	\N	b30c7026-796a-4dc7-89fd-48dc74c0d9c2	\N	a4b3c28b-9614-431b-8333-ffa14713deac	STUDENT ON ATTACHMENT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.478+02	2025-12-16 15:04:11.478+02
5d744649-801f-4e28-8bf2-0ad61f440c6e	DG780	\N	TENDAI	KADYE	\N	\N	b30c7026-796a-4dc7-89fd-48dc74c0d9c2	\N	a4b3c28b-9614-431b-8333-ffa14713deac	STUDENT ON ATTACHMENT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.482+02	2025-12-16 15:04:11.482+02
d6f79787-f40f-48ad-b398-848127f85cfc	DG781	\N	DESMOND	KUMHANDA	\N	\N	b30c7026-796a-4dc7-89fd-48dc74c0d9c2	\N	a4b3c28b-9614-431b-8333-ffa14713deac	STUDENT ON ATTACHMENT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.487+02	2025-12-16 15:04:11.487+02
974fa427-c7e5-4616-8329-14e917714c82	DG782	\N	TIVAKUDZE	MAREGERE	\N	\N	b30c7026-796a-4dc7-89fd-48dc74c0d9c2	\N	a4b3c28b-9614-431b-8333-ffa14713deac	STUDENT ON ATTACHMENT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:04:11.49+02	2025-12-16 15:04:11.49+02
1c1723e1-d522-417d-86d6-d81f96449e4c	DGZ013	\N	STANWELL	CHIDO	\N	\N	018a9f80-3688-48ee-8dc3-f4d21acc688e	\N	4e24bfa4-2ee9-4deb-95eb-2d27b8fbd7c1	CHARGEHAND BUILDERS	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.326+02	2025-12-16 15:16:39.326+02
bb2a5c86-8b78-4617-ae7e-7e7cf5982451	DP071	\N	AGRIA	NYATI	\N	\N	018a9f80-3688-48ee-8dc3-f4d21acc688e	\N	25b79bbe-cd48-48bd-b3b5-0ce7023ab18b	CARPENTER CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.345+02	2025-12-16 15:16:39.345+02
0cbfe55b-d0af-4f17-ab54-0f75e4d225ce	DP082	\N	WILLARD	NYAMBALO	\N	\N	018a9f80-3688-48ee-8dc3-f4d21acc688e	\N	a16c530b-ce2a-4f9f-9818-53858323aadc	CIVILS SUPERVISOR	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.351+02	2025-12-16 15:16:39.351+02
d016ac0a-00fc-4280-9e76-8972f78d7f46	DGZ011	\N	SIBONGILE	KONDO	\N	\N	49cf5912-e16f-430e-9dbc-e85439b62acc	\N	4622a6df-b6e6-412b-972f-a09f56c0cbf4	ELECTRICIAN CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.358+02	2025-12-16 15:16:39.358+02
249dbfae-ae7d-42db-af25-d8da96fc72d7	DGZ031	\N	JOHNSON	CHAPARAPATA	\N	\N	49cf5912-e16f-430e-9dbc-e85439b62acc	\N	4622a6df-b6e6-412b-972f-a09f56c0cbf4	ELECTRICIAN CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.362+02	2025-12-16 15:16:39.362+02
0cf7795a-f5bc-4fbb-88cc-4c1a61ec8fa9	DP073	\N	GAUNJE	MWENYE	\N	\N	49cf5912-e16f-430e-9dbc-e85439b62acc	\N	2db13e4e-695f-4517-8edf-b7b45afb7583	SENIOR ELECTRICAL AND INSTRUMENTATION SUPT	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.366+02	2025-12-16 15:16:39.366+02
efcb751d-a2b1-4137-9c9a-54c0e03dd225	DP197	\N	JOSEPH	NCUBE	\N	\N	49cf5912-e16f-430e-9dbc-e85439b62acc	\N	88b1bdfd-5185-46cf-b966-cd57dd4f271f	CHARGEHAND INSTRUMENTATION	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.37+02	2025-12-16 15:16:39.37+02
e11e5e30-28a7-42b1-b668-ec0d95c1263b	DP213	\N	TINASHE	GOTEKA	\N	\N	49cf5912-e16f-430e-9dbc-e85439b62acc	\N	f09a5995-e608-455e-be56-b299dd76c238	JUNIOR ELECTRICAL ENGINEER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.374+02	2025-12-16 15:16:39.374+02
3cb081f5-962d-4295-834e-be467c10941d	DP218	\N	TRYMORE	JAKARASI	\N	\N	49cf5912-e16f-430e-9dbc-e85439b62acc	\N	d52f0644-25fd-4a39-a6b9-9f3c9c0736d1	ELECTRICAL MANAGER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.38+02	2025-12-16 15:16:39.38+02
98a26538-19c1-4b7c-95d8-d0703f0aaff0	DP226	\N	TAMARA	SUMANI	\N	\N	49cf5912-e16f-430e-9dbc-e85439b62acc	\N	370eadcd-ce1d-4fe3-a6c6-f48ed4d795a9	JUNIOR INSTRUMENTATION ENGINEER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.384+02	2025-12-16 15:16:39.384+02
3275c806-c254-4c3e-bd21-7ba12451c895	DP245	\N	HEBERT	KUBVORUNO	\N	\N	49cf5912-e16f-430e-9dbc-e85439b62acc	\N	d0132b8a-c874-4b2c-80b9-e80f043348ea	INSTRUMENTATION TECHNICIAN	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.388+02	2025-12-16 15:16:39.388+02
23179d9a-17f1-45db-a1a9-c54a6666bb08	DP282	\N	GODFREY	MASAMBA	\N	\N	49cf5912-e16f-430e-9dbc-e85439b62acc	\N	e18ca6af-c9ee-44b0-9c76-4777d5743dcf	ELECTRICIAN CLASS 2	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.392+02	2025-12-16 15:16:39.392+02
f9cda2f4-098b-493e-8a37-ebfbb9dd351f	DP294	\N	PROSPER	NLEYA	\N	\N	49cf5912-e16f-430e-9dbc-e85439b62acc	\N	78fe5663-4b53-429e-9a59-d7e82c35191e	INSTRUMENTATION TECHNICAN	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.395+02	2025-12-16 15:16:39.395+02
ce4b02bb-6271-45eb-a612-b8425795bda2	DP296	\N	NESBERT	MARINGIRENI	\N	\N	49cf5912-e16f-430e-9dbc-e85439b62acc	\N	4622a6df-b6e6-412b-972f-a09f56c0cbf4	ELECTRICIAN CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.399+02	2025-12-16 15:16:39.399+02
c12a3baf-4640-494e-a053-c0ad7a688d4b	DP303	\N	LAWRENCE	MOYO	\N	\N	49cf5912-e16f-430e-9dbc-e85439b62acc	\N	830e7b04-e124-4149-ac6d-0d8fcc9deb62	CHARGEHAND ELECTRICAL	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.403+02	2025-12-16 15:16:39.403+02
f4f43649-98c5-48a5-bb98-907ef3985b66	DP331	\N	ALI	KASEMBE	\N	\N	49cf5912-e16f-430e-9dbc-e85439b62acc	\N	4622a6df-b6e6-412b-972f-a09f56c0cbf4	ELECTRICIAN CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.407+02	2025-12-16 15:16:39.407+02
d8845e15-6c0f-4166-b73c-25ee68670349	DP353	\N	BLESSING	MUKO	\N	\N	49cf5912-e16f-430e-9dbc-e85439b62acc	\N	d0132b8a-c874-4b2c-80b9-e80f043348ea	INSTRUMENTATION TECHNICIAN	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.411+02	2025-12-16 15:16:39.411+02
1c10f5cf-5996-44eb-b4fa-850ad011ad64	DP355	\N	FISHER	CHAKWIZIRA	\N	\N	49cf5912-e16f-430e-9dbc-e85439b62acc	\N	4622a6df-b6e6-412b-972f-a09f56c0cbf4	ELECTRICIAN CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.414+02	2025-12-16 15:16:39.414+02
f39413c8-074b-4d87-9b59-d2287adba0fc	DP356	\N	COSTA	CHUDU	\N	\N	49cf5912-e16f-430e-9dbc-e85439b62acc	\N	4622a6df-b6e6-412b-972f-a09f56c0cbf4	ELECTRICIAN CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.418+02	2025-12-16 15:16:39.418+02
44670aca-1c05-42ae-9458-a19cdfd8c699	DP357	\N	TALENT	LANGWANI	\N	\N	49cf5912-e16f-430e-9dbc-e85439b62acc	\N	4622a6df-b6e6-412b-972f-a09f56c0cbf4	ELECTRICIAN CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.421+02	2025-12-16 15:16:39.421+02
534a3b25-a901-4ee8-9dc5-2aee1c5f9874	DP358	\N	GIFT	MAKAYA	\N	\N	49cf5912-e16f-430e-9dbc-e85439b62acc	\N	4622a6df-b6e6-412b-972f-a09f56c0cbf4	ELECTRICIAN CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.425+02	2025-12-16 15:16:39.425+02
a383c002-bb39-4ea7-80d2-aa0128f4d43e	DGZ018	\N	LISIAS	SHERENI	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	\N	8a1c8f0b-18e1-4ba4-a435-b4652272c343	FITTER CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.429+02	2025-12-16 15:16:39.429+02
3929f18c-9c04-41c1-bc4c-47d7bc92ca6f	DGZ019	\N	JOHN	CHATAIRA	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	\N	8a1c8f0b-18e1-4ba4-a435-b4652272c343	FITTER CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.432+02	2025-12-16 15:16:39.432+02
6bcf4ea5-e1a4-4ea0-b532-f011afc9f68a	DGZ024	\N	AMBROSE	MATARUTSE	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	\N	69bf06a7-b38a-4bce-b211-105509ac2a2a	DRY PLANT FOREMAN	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.436+02	2025-12-16 15:16:39.436+02
c9d47a36-f7be-4247-b878-080001d950e4	DGZ061	\N	MOLISA	MOTLOGWA	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	\N	d659dcf0-d192-4f5c-b87a-db693eafcda5	PLUMBER CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.44+02	2025-12-16 15:16:39.44+02
b372c9c7-4f60-4672-a48e-d8c1d4394222	DGZ075	\N	ELISHA	MUKANDE	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	\N	8a1c8f0b-18e1-4ba4-a435-b4652272c343	FITTER CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.444+02	2025-12-16 15:16:39.444+02
da8e392c-69e1-45cd-906f-68081890f733	DGZ091	\N	ANTHONY	MAFAIROSI	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	\N	f531b8d6-7315-4952-a34a-91b97d5c3bdd	FITTER CLASS 2	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.448+02	2025-12-16 15:16:39.448+02
7f94e8ab-865c-47bd-8702-a32501e20890	DP089	\N	PETRO	MUTONGA	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	\N	f9a19d21-53da-47d7-8e94-eb5ba6259307	STRUCTURAL FITTING FOREMAN	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.451+02	2025-12-16 15:16:39.451+02
8f8edc8b-c71a-474a-892f-d1c149731ccb	DP119	\N	WARREN	MTUTU	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	\N	579e1c0d-8570-483e-a9e3-998ebe82cf2b	MAINTENANCE ENGINEER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.454+02	2025-12-16 15:16:39.454+02
79b7cbe7-72ab-427c-86e9-75419ae46293	DP175	\N	MISI	TONGERA	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	\N	a890e71c-971b-485a-9c44-b0370a6efea7	BELTS MAN	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.458+02	2025-12-16 15:16:39.458+02
739bdbcf-59f1-4fc0-99e6-49c9f5219bb0	DP200	\N	ELIAS	MWAZHA	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	\N	82941158-5fa8-489c-b471-6b2b632c9fb8	MECHANICAL MANAGER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.462+02	2025-12-16 15:16:39.462+02
397eb6e0-1054-4bc3-ac1a-6873f65092f8	DP214	\N	TINASHE	MACHIMBIRIKE	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	\N	59ab67d5-ec5a-4e22-8132-b47e070fd73d	ASSISTANT MECHANICAL ENGINEER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.465+02	2025-12-16 15:16:39.465+02
c07497a1-5334-4393-9fa3-c02413d58784	DP236	\N	TARIRO	MUDZAMIRI	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	\N	99fb45b4-2bea-450b-ab5f-55c0aca6b576	JUNIOR MECHANICAL ENGINEER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.468+02	2025-12-16 15:16:39.468+02
bfe1f88c-bb3d-4a65-91c1-fff628844c3c	DP254	\N	KNOWLEDGE	MAJUTA	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	\N	8a1c8f0b-18e1-4ba4-a435-b4652272c343	FITTER CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.471+02	2025-12-16 15:16:39.471+02
d1f7e98c-0020-4ff2-94dc-96086e09f564	DP255	\N	TERRENCE	MUTANDWA	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	\N	56e941e4-2666-41cb-8322-7af568bf3369	CHARGEHAND	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.474+02	2025-12-16 15:16:39.474+02
d0c18f97-efee-40aa-9cc8-fb00bc83cb84	DP330	\N	EVARISTO	MUGUDA	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	\N	f531b8d6-7315-4952-a34a-91b97d5c3bdd	FITTER CLASS 2	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.477+02	2025-12-16 15:16:39.477+02
241161c8-85cd-49b3-a6e7-36f48e39770c	DP351	\N	LOVEMORE	EZALA	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	\N	dc1843d1-955a-4929-9df3-0f2ca65fac0a	CHARGE HAND FITTING WET PLANT	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.48+02	2025-12-16 15:16:39.48+02
9307239d-372f-4bf5-97f5-f4773523908f	DP110	\N	TINASHE	NEMADIRE	\N	\N	3abc1952-b1e0-4069-a517-75c0706e2721	\N	76acbf4e-6abf-4bfd-965a-516407f8a8dd	MINE PLANNING SUPERINTENDENT	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.55+02	2025-12-16 15:16:39.55+02
7c7d081d-cd17-4a2f-8536-4616ba5da741	DP128	\N	MICHAEL	ZVARAYA	\N	\N	3abc1952-b1e0-4069-a517-75c0706e2721	\N	12960978-fe6f-454d-9a3f-73ed2dfc2109	MINING TECHNICAL SERVICES MANAGER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.555+02	2025-12-16 15:16:39.555+02
ec33b8aa-7f60-4c68-baac-c189fc2a0fbf	DP157	\N	TINASHE	TARWIREI	\N	\N	3abc1952-b1e0-4069-a517-75c0706e2721	\N	968f5e62-467f-4a31-b976-0f66228c93a9	JUNIOR MINE PLANNING ENGINEER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.558+02	2025-12-16 15:16:39.558+02
8ec89628-e126-493a-a192-e1e83c17ba4f	DP219	\N	ROBERT	NYIRENDA	\N	\N	3abc1952-b1e0-4069-a517-75c0706e2721	\N	bb46fc2d-99bd-4c64-8c8c-7ade70f57efb	MINE PLANNING ENGINEER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.562+02	2025-12-16 15:16:39.562+02
549fc8cc-75c8-4bff-afbc-aaf24e5d8650	DP233	\N	GAYNOR	MUSADEMBA	\N	\N	b30c7026-796a-4dc7-89fd-48dc74c0d9c2	\N	61f9b26c-453f-4a59-a191-3043700ef3c7	GRADUATE TRAINEE	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.648+02	2025-12-16 15:16:39.648+02
5d18c71c-6b8c-45e9-b1a0-53b8d1e190c7	DP238	\N	IRVIN	CHAPUNZA	\N	\N	b30c7026-796a-4dc7-89fd-48dc74c0d9c2	\N	07f124bb-3051-4db2-818d-28604a9c89ca	GRADUATE TRAINEE METALLURGY	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.655+02	2025-12-16 15:16:39.655+02
c763ebcc-039d-4a72-a04b-7832c20d70d9	DP239	\N	SOLOMON	MAZARA	\N	\N	b30c7026-796a-4dc7-89fd-48dc74c0d9c2	\N	07f124bb-3051-4db2-818d-28604a9c89ca	GRADUATE TRAINEE METALLURGY	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.659+02	2025-12-16 15:16:39.659+02
1bbcc23c-fae2-4ba6-acb8-7aa95813c2c0	DP273	\N	TAFADZWA	MAGADU	\N	\N	b30c7026-796a-4dc7-89fd-48dc74c0d9c2	\N	61f9b26c-453f-4a59-a191-3043700ef3c7	GRADUATE TRAINEE	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.663+02	2025-12-16 15:16:39.663+02
303d4375-057c-409f-9f92-e29d35f5233f	DP278	\N	LISA	GOMBEDZA	\N	\N	b30c7026-796a-4dc7-89fd-48dc74c0d9c2	\N	033922e2-24f2-4e33-8991-95b057d9b286	ASSAY LABORATORY TECHNICIAN TRAINEE	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.666+02	2025-12-16 15:16:39.666+02
1190cfba-6759-4c41-b0a0-aa82d7d0cb5e	DP283	\N	SAMUEL	MAGOMO	\N	\N	b30c7026-796a-4dc7-89fd-48dc74c0d9c2	\N	9c64b0e5-30b6-42c2-892c-49c4b338850b	SHEQ GRADUATE TRAINEE	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.67+02	2025-12-16 15:16:39.67+02
cc1a2c59-af95-4017-97b1-0971d2eb0df6	DP288	\N	SAVIOUS	MUKOVA	\N	\N	b30c7026-796a-4dc7-89fd-48dc74c0d9c2	\N	c892baa0-afa6-4f2b-911f-90b28bcadd09	GRADUATE TRAINEE MINING	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.674+02	2025-12-16 15:16:39.674+02
39b6848d-d626-4b18-8da1-994314cb05de	DP289	\N	TERRENCE	DOBBIE	\N	\N	b30c7026-796a-4dc7-89fd-48dc74c0d9c2	\N	c892baa0-afa6-4f2b-911f-90b28bcadd09	GRADUATE TRAINEE MINING	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.677+02	2025-12-16 15:16:39.677+02
9b4bdb21-3898-4807-8212-ddf2c0a8b436	DP290	\N	CHANTELLE	MAVURU	\N	\N	b30c7026-796a-4dc7-89fd-48dc74c0d9c2	\N	c892baa0-afa6-4f2b-911f-90b28bcadd09	GRADUATE TRAINEE MINING	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.68+02	2025-12-16 15:16:39.68+02
bda82663-abab-438f-b829-3fc78f1950ae	DP291	\N	ANDY	SAUNYAMA	\N	\N	b30c7026-796a-4dc7-89fd-48dc74c0d9c2	\N	07f124bb-3051-4db2-818d-28604a9c89ca	GRADUATE TRAINEE METALLURGY	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.683+02	2025-12-16 15:16:39.683+02
dd8ccd3c-7a88-4ba4-91fc-a9a770bf25b4	DP292	\N	TANAKA	NYIKA	\N	\N	b30c7026-796a-4dc7-89fd-48dc74c0d9c2	\N	07f124bb-3051-4db2-818d-28604a9c89ca	GRADUATE TRAINEE METALLURGY	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.686+02	2025-12-16 15:16:39.686+02
481cbf8d-6b7a-441c-91d4-ff6783b3834b	DP293	\N	PRIMROSE	MLAMBO	\N	\N	b30c7026-796a-4dc7-89fd-48dc74c0d9c2	\N	07f124bb-3051-4db2-818d-28604a9c89ca	GRADUATE TRAINEE METALLURGY	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.689+02	2025-12-16 15:16:39.689+02
874a42ee-57de-4f87-a9cf-f8f75ed62199	DP311	\N	NYASHA	MOYO	\N	\N	b30c7026-796a-4dc7-89fd-48dc74c0d9c2	\N	f7fc4e5d-a6da-481f-a44b-32a660abeb5e	TRAINING AND DEVELOPMENT OFFICER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.692+02	2025-12-16 15:16:39.692+02
c2d1ecc7-302f-4133-8383-7deeb48634b2	DP324	\N	ZIVANAI	MUPAMBA	\N	\N	b30c7026-796a-4dc7-89fd-48dc74c0d9c2	\N	b9a22d64-3daf-4e78-b70f-985b445c2fdd	GT MECHANICAL ENGINEERING	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.695+02	2025-12-16 15:16:39.695+02
62a7a3ee-31df-42e0-a2c1-0ae20ae6d9a8	DP352	\N	TONDERAI	TSORAI	\N	\N	b30c7026-796a-4dc7-89fd-48dc74c0d9c2	\N	fb5cd08d-27ce-4823-9666-08e2e4442ac4	GRADUATE TRAINEE ACCOUNTING	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.701+02	2025-12-16 15:16:39.701+02
39b7eeb1-7674-4b90-90e4-a58b3ccb9831	DG059	\N	ELWED	NHEMACHENA	\N	\N	018a9f80-3688-48ee-8dc3-f4d21acc688e	\N	ac03d50a-f77e-46db-b2b7-e8d26a7e0357	BUILDER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.743+02	2025-12-16 15:16:39.743+02
956e9a9c-b63f-4202-a671-8835dfb27c7e	DG147	\N	EZRA	MUFENGI	\N	\N	018a9f80-3688-48ee-8dc3-f4d21acc688e	\N	ce4ae6ee-7cf2-4579-b9da-0e42e3f45ca6	SEMI- SKILLED BUILDER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.746+02	2025-12-16 15:16:39.746+02
0990fa99-c6b6-4fd2-8f30-b6db795c2cde	DG019	\N	FRANK	MADZVITI	\N	\N	49cf5912-e16f-430e-9dbc-e85439b62acc	\N	27454dda-f83c-4844-850d-463c6077aed9	ELECTRICIAN ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.75+02	2025-12-16 15:16:39.75+02
804d93f1-ce28-4533-9df8-e138251c328b	DG034	\N	COLLINS	NYARIRI	\N	\N	49cf5912-e16f-430e-9dbc-e85439b62acc	\N	a69d056a-27ba-49a7-8c6f-0c9532673b3c	SEMI- SKILLED ELECTRICIAN	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.754+02	2025-12-16 15:16:39.754+02
bcf59461-3e43-4cef-ada8-15f0c3ab5d32	DG104	\N	ERNEST	KAMANGE	\N	\N	49cf5912-e16f-430e-9dbc-e85439b62acc	\N	27454dda-f83c-4844-850d-463c6077aed9	ELECTRICIAN ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.758+02	2025-12-16 15:16:39.758+02
fdb48b85-e312-4da6-ab12-e69c8603a1e1	DG105	\N	TENDEKAI	KAZUNGA	\N	\N	49cf5912-e16f-430e-9dbc-e85439b62acc	\N	27454dda-f83c-4844-850d-463c6077aed9	ELECTRICIAN ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.761+02	2025-12-16 15:16:39.761+02
72acc7f8-b743-4cdd-b1d7-0fb0c7c169c6	DG106	\N	PERFORMANCE	KASINGANETE	\N	\N	49cf5912-e16f-430e-9dbc-e85439b62acc	\N	27454dda-f83c-4844-850d-463c6077aed9	ELECTRICIAN ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.764+02	2025-12-16 15:16:39.764+02
87f9ca8b-6e17-4a1c-98a4-bc22539d7cb3	DG317	\N	GODFREY	MAJONGA	\N	\N	49cf5912-e16f-430e-9dbc-e85439b62acc	\N	3e8130ce-2d36-43f3-9d6a-f95d0d3e755c	ELECTRICAL ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.768+02	2025-12-16 15:16:39.768+02
5b68a02f-a48e-4569-875a-d9d3adde02b1	DG379	\N	TINEI	PAGAN'A	\N	\N	49cf5912-e16f-430e-9dbc-e85439b62acc	\N	3e8130ce-2d36-43f3-9d6a-f95d0d3e755c	ELECTRICAL ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.771+02	2025-12-16 15:16:39.771+02
3a8d8390-ab0a-47fa-9397-7cd6b6436f87	DG578	\N	TAKUNDA	NGWENYA	\N	\N	49cf5912-e16f-430e-9dbc-e85439b62acc	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.775+02	2025-12-16 15:16:39.775+02
a1c8da6b-fde4-4bda-81ff-8cfb06fb1144	DG581	\N	SYDNEY	CHIMANIKIRE	\N	\N	49cf5912-e16f-430e-9dbc-e85439b62acc	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.778+02	2025-12-16 15:16:39.778+02
b94335f6-4a3c-4a7c-82a7-59c9082202fb	DG587	\N	MEKELANI	CHAPONDA	\N	\N	49cf5912-e16f-430e-9dbc-e85439b62acc	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.782+02	2025-12-16 15:16:39.782+02
b33f8f83-4769-45ba-9cd0-fddbda977231	DG605	\N	STUDY	HOVE	\N	\N	49cf5912-e16f-430e-9dbc-e85439b62acc	\N	3f2e60b1-5bd7-4576-acd9-c44a7ce4fe9f	INSTRUMENTS TECHS ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.785+02	2025-12-16 15:16:39.785+02
010a88d6-5655-4ef4-b742-5c52759e8cec	DG644	\N	KUDZAI	MAPOPE	\N	\N	49cf5912-e16f-430e-9dbc-e85439b62acc	\N	0b5fb3fc-53a4-440e-a01c-48d19ef7ce62	INSTRUMENTATIONS ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.788+02	2025-12-16 15:16:39.788+02
333361ed-2502-457c-98e3-bab550c4ba6c	DG647	\N	REGIS	RAVU	\N	\N	49cf5912-e16f-430e-9dbc-e85439b62acc	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.792+02	2025-12-16 15:16:39.792+02
8f5ecfca-15da-4c68-a3d2-6e828db00683	DG650	\N	JOHN	DENHERE	\N	\N	49cf5912-e16f-430e-9dbc-e85439b62acc	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.795+02	2025-12-16 15:16:39.795+02
a3507f77-ac57-49f7-9d9e-c2ee3792c841	DG654	\N	TANYARADZWA	GWETA	\N	\N	49cf5912-e16f-430e-9dbc-e85439b62acc	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.797+02	2025-12-16 15:16:39.797+02
03880dfb-b13e-4f48-9316-c3ed721cb8b1	DG655	\N	NOMORE	MAZVAZVA	\N	\N	49cf5912-e16f-430e-9dbc-e85439b62acc	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.8+02	2025-12-16 15:16:39.8+02
1c6c8630-2ad7-4c63-a445-e2378a3ba225	DG707	\N	CHARMAINE	CHIANGWA	\N	\N	49cf5912-e16f-430e-9dbc-e85439b62acc	\N	0b5fb3fc-53a4-440e-a01c-48d19ef7ce62	INSTRUMENTATIONS ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.803+02	2025-12-16 15:16:39.803+02
5d09cd24-bf0e-427b-98e1-d5b0806199ed	DG732	\N	NGOCHO	TYRMORE	\N	\N	49cf5912-e16f-430e-9dbc-e85439b62acc	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.806+02	2025-12-16 15:16:39.806+02
c43adb1d-00dd-4846-94dd-66f97ef84dd1	DG739	\N	TROUBLE	CHAPONDA	\N	\N	49cf5912-e16f-430e-9dbc-e85439b62acc	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.809+02	2025-12-16 15:16:39.809+02
5e9b9a87-c23d-411c-ae0d-db78039988f3	DG029	\N	BRIGHTON	MUZVONDIWA	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	\N	3c6dd029-352f-4918-8e3a-f66bbc4dde86	FITTERS ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.812+02	2025-12-16 15:16:39.812+02
b815fc66-664c-4e82-98f9-787147bbcde0	DG124	\N	TINOTENDA	JINYA	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	\N	21ddf069-b877-429e-80b3-5f09616ff850	FITTER ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.815+02	2025-12-16 15:16:39.815+02
a4d89dc5-095b-4847-b436-8e8916a4bfc5	DG192	\N	SIMON	MUNENGIWA	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	\N	3c6dd029-352f-4918-8e3a-f66bbc4dde86	FITTERS ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.818+02	2025-12-16 15:16:39.818+02
c02096de-525a-424a-915b-bb4e14d64525	DG242	\N	CARLOS	KANYERA	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	\N	21ddf069-b877-429e-80b3-5f09616ff850	FITTER ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.821+02	2025-12-16 15:16:39.821+02
cc55fbfc-99df-432d-967a-877d39c7cd30	DG349	\N	DAVID	MUGUTI	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	\N	21ddf069-b877-429e-80b3-5f09616ff850	FITTER ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.824+02	2025-12-16 15:16:39.824+02
8682553f-c341-4c76-806f-ee84a6839cb5	DG359	\N	ADMIRE	MACHACHA	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	\N	21ddf069-b877-429e-80b3-5f09616ff850	FITTER ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.827+02	2025-12-16 15:16:39.827+02
4f492606-0bd1-4212-b859-248b8e1b9dbb	DG392	\N	EDMORE	CHIMANGA	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	\N	21ddf069-b877-429e-80b3-5f09616ff850	FITTER ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.83+02	2025-12-16 15:16:39.83+02
2f44c0f3-45a8-4aaa-91e2-0aed0887d7e0	DG604	\N	NYASHA	MATOROFA	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	\N	21ddf069-b877-429e-80b3-5f09616ff850	FITTER ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.833+02	2025-12-16 15:16:39.833+02
314f0498-5ad2-4273-ac87-9cdc2a337d1b	DG614	\N	ENOCK	CHIGWADA	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	\N	bb634079-a2d5-431a-9a67-dffcde5f4157	PLUMBER ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.837+02	2025-12-16 15:16:39.837+02
540aed76-55df-4316-80a2-cd224274310e	DG706	\N	NGONIDZASHE	MAPFUMO	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	\N	3c6dd029-352f-4918-8e3a-f66bbc4dde86	FITTERS ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.841+02	2025-12-16 15:16:39.841+02
cca31b18-6107-4cf1-8192-8aa8ce1e080d	DG021	\N	DOUGLAS	MARUNGISA	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	\N	36f99b79-5aa0-4dc0-8706-9ca22a504037	BOILERMAKER ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.848+02	2025-12-16 15:16:39.848+02
499361e0-6736-499f-a129-24224c3b00c5	DG022	\N	MUCHENJE	MARUNGISA	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	\N	36f99b79-5aa0-4dc0-8706-9ca22a504037	BOILERMAKER ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.851+02	2025-12-16 15:16:39.851+02
480172a5-8199-4cf9-a161-4903b78d8b53	DG051	\N	LAMECK	MUROYIWA	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	\N	752ae918-2625-4204-8b5a-c20454cc3cf9	SCAFFOLDER ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.854+02	2025-12-16 15:16:39.854+02
496c3acf-68d2-4b2f-9ccc-39a4e17d975c	DG064	\N	AUSTIN	KAJARI	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	\N	fe37837f-5d19-47a4-98bf-6dc869bc9306	SEMI SKILLED PAINTER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.858+02	2025-12-16 15:16:39.858+02
5a6fd049-d3de-47a8-bda9-592abe43c45d	DG066	\N	TAPFUMANEI	TANDI	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	\N	21794d23-6031-4010-8058-f3ace6626f4b	SCAFFOLDER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.861+02	2025-12-16 15:16:39.861+02
e3f4e3d7-37d1-424f-8655-245dce2e9178	DG208	\N	VENGAI	CHIMANIKIRE	\N	\N	fa570fb8-b13c-4fe5-8da9-e49f7f01dede	\N	2fafe9b0-fafb-475c-9a40-5d7a0f1ad73f	SAMPLER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.13+02	2025-12-16 15:16:40.13+02
d641014f-49af-4b0b-b510-006f37faa59f	DG176	\N	PADDINGTON F	MAODZWA	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	\N	36f99b79-5aa0-4dc0-8706-9ca22a504037	BOILERMAKER ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.863+02	2025-12-16 15:16:39.863+02
30fa2987-c8d0-4d3f-ae2f-588827296385	DG177	\N	EMMANUEL	GOROMONZI	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	\N	36f99b79-5aa0-4dc0-8706-9ca22a504037	BOILERMAKER ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.867+02	2025-12-16 15:16:39.867+02
c087af37-01d9-4b0d-8ce4-48ef3ebf7bc3	DG182	\N	CLEMENCE	CHITIMA	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	\N	36f99b79-5aa0-4dc0-8706-9ca22a504037	BOILERMAKER ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.87+02	2025-12-16 15:16:39.87+02
d8bfecd4-ebc2-4214-9093-322e8ec0c1f6	DG246	\N	SHINGIRAI	MASUKU	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	\N	36f99b79-5aa0-4dc0-8706-9ca22a504037	BOILERMAKER ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.873+02	2025-12-16 15:16:39.873+02
8eaa80f1-710b-4b61-9c4b-f62f1e423120	DG303	\N	AARON	MAPIRA	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	\N	21794d23-6031-4010-8058-f3ace6626f4b	SCAFFOLDER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.876+02	2025-12-16 15:16:39.876+02
518f5eff-ab01-483d-9da4-d28b60409302	DG351	\N	STEADY	MUDAVANHU	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	\N	36f99b79-5aa0-4dc0-8706-9ca22a504037	BOILERMAKER ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.88+02	2025-12-16 15:16:39.88+02
c991e026-b367-49aa-9ece-20508de4883f	DG495	\N	THEMBINKOSI	NGWENYA	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	\N	3f692ef0-608c-48f5-8f68-95dd3b660e97	BOILERMAKERS ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.884+02	2025-12-16 15:16:39.884+02
5cf8eeae-cf4c-44ea-b969-15f55fcea74d	DG529	\N	GEORGE	MHONYERA	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	\N	fe37837f-5d19-47a4-98bf-6dc869bc9306	SEMI SKILLED PAINTER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.887+02	2025-12-16 15:16:39.887+02
01a3b01c-85c3-43e2-ac04-c1b7634f77d0	DG594	\N	TACHIONA	SIBANDA	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	\N	21ddf069-b877-429e-80b3-5f09616ff850	FITTER ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.89+02	2025-12-16 15:16:39.89+02
39f10413-63b8-4cc3-a547-fd5144dbb9f1	DG656	\N	TAKUNDA	CHITUMBURA	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	\N	36f99b79-5aa0-4dc0-8706-9ca22a504037	BOILERMAKER ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.893+02	2025-12-16 15:16:39.893+02
df580b5a-b60a-4820-8e53-6b2f9235e703	DG098	\N	MONEYWORK	KURUDZA	\N	\N	018a9f80-3688-48ee-8dc3-f4d21acc688e	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.939+02	2025-12-16 15:16:39.939+02
064bcf72-7146-48eb-85ed-3f226eac94b7	DG129	\N	WILBERT	MANHANGA	\N	\N	018a9f80-3688-48ee-8dc3-f4d21acc688e	\N	50a6d588-b1c5-4d3f-8e4c-0209282a0161	SEMI-SKILLED BUILDER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.942+02	2025-12-16 15:16:39.942+02
806696ec-9359-4e59-a5a4-cd8f8a2354b7	DG145	\N	FARAI	KURUDZA	\N	\N	018a9f80-3688-48ee-8dc3-f4d21acc688e	\N	ac03d50a-f77e-46db-b2b7-e8d26a7e0357	BUILDER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.946+02	2025-12-16 15:16:39.946+02
9a550bdb-baba-4f3d-bc05-f97260fd0ab2	DG159	\N	SIMBARASHE	CHIGODHO	\N	\N	018a9f80-3688-48ee-8dc3-f4d21acc688e	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.949+02	2025-12-16 15:16:39.949+02
2a6a02e0-2ef3-4784-b96a-f4095774718e	DG160	\N	MACDONALD	MUPUNGA	\N	\N	018a9f80-3688-48ee-8dc3-f4d21acc688e	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.953+02	2025-12-16 15:16:39.953+02
d3caf53d-4874-4d17-88e6-387c183ebc1b	DG258	\N	FIDELIS	MURINGAYI	\N	\N	018a9f80-3688-48ee-8dc3-f4d21acc688e	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.956+02	2025-12-16 15:16:39.956+02
a26ebfff-f066-4840-b1fa-6328d697386f	DG261	\N	EPHRAIM	MBURUMA	\N	\N	018a9f80-3688-48ee-8dc3-f4d21acc688e	\N	50a6d588-b1c5-4d3f-8e4c-0209282a0161	SEMI-SKILLED BUILDER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.959+02	2025-12-16 15:16:39.959+02
bcd69713-e06d-4fa6-930a-e1cb785ba6d2	DG263	\N	OBINISE	MARERWA	\N	\N	018a9f80-3688-48ee-8dc3-f4d21acc688e	\N	50a6d588-b1c5-4d3f-8e4c-0209282a0161	SEMI-SKILLED BUILDER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.962+02	2025-12-16 15:16:39.962+02
70f077b5-91fa-4bcb-887e-f1ace8192dbf	DG272	\N	GARIKAI	MUJERI	\N	\N	018a9f80-3688-48ee-8dc3-f4d21acc688e	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.965+02	2025-12-16 15:16:39.965+02
af15f768-3367-46a9-9932-17f8685d3002	DG275	\N	DOMINIC	RUNZIRA	\N	\N	018a9f80-3688-48ee-8dc3-f4d21acc688e	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.968+02	2025-12-16 15:16:39.968+02
4e915486-74d7-4078-9f12-3685d960fa95	DG292	\N	RAYMOND	JAIROS	\N	\N	018a9f80-3688-48ee-8dc3-f4d21acc688e	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.971+02	2025-12-16 15:16:39.971+02
6621d7cb-2658-4115-ae4e-6750ba7c39c9	DG294	\N	CRY	KAKORE	\N	\N	018a9f80-3688-48ee-8dc3-f4d21acc688e	\N	50a6d588-b1c5-4d3f-8e4c-0209282a0161	SEMI-SKILLED BUILDER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.974+02	2025-12-16 15:16:39.974+02
b3f63b90-0e87-488f-85f4-49167a477cc7	DG318	\N	JOSHUA	WEBSTER	\N	\N	018a9f80-3688-48ee-8dc3-f4d21acc688e	\N	50a6d588-b1c5-4d3f-8e4c-0209282a0161	SEMI-SKILLED BUILDER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.978+02	2025-12-16 15:16:39.978+02
3ec71d1a-94a8-46f8-8833-fbc14ddf8d08	DG319	\N	MAZVANARA	FRANCIS	\N	\N	018a9f80-3688-48ee-8dc3-f4d21acc688e	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.981+02	2025-12-16 15:16:39.981+02
3cde5ee1-7e58-477d-b5e8-941b2c076e58	DG325	\N	KENNY	FURAWU	\N	\N	018a9f80-3688-48ee-8dc3-f4d21acc688e	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.985+02	2025-12-16 15:16:39.985+02
18d04236-497b-489f-939b-99b1ee970c89	DG329	\N	TAFADZWA	MAGUSVI	\N	\N	018a9f80-3688-48ee-8dc3-f4d21acc688e	\N	7f32c3df-4942-4580-a712-2933f39828c1	SEMI- SKILLED CARPENTER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.988+02	2025-12-16 15:16:39.988+02
58b9f4ea-d48d-47a3-ab43-52730d8078a0	DG331	\N	ADMIRE	MUZAVA	\N	\N	018a9f80-3688-48ee-8dc3-f4d21acc688e	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.991+02	2025-12-16 15:16:39.991+02
0be754fd-bf86-47a7-a602-f86feffff87b	DG387	\N	HOWARD	CHAKUINGA	\N	\N	018a9f80-3688-48ee-8dc3-f4d21acc688e	\N	50a6d588-b1c5-4d3f-8e4c-0209282a0161	SEMI-SKILLED BUILDER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:39.994+02	2025-12-16 15:16:39.994+02
6c73a6b6-d493-485c-9d4f-7bb32c311b55	DG398	\N	SIMBARASHE	THOM	\N	\N	018a9f80-3688-48ee-8dc3-f4d21acc688e	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40+02	2025-12-16 15:16:40+02
a5451cdc-f01c-4e06-a47b-f7c0b4e36bf3	DG406	\N	TIGHT	VARETA	\N	\N	018a9f80-3688-48ee-8dc3-f4d21acc688e	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.003+02	2025-12-16 15:16:40.003+02
a4f47fed-f9cb-4dab-a193-1cd65a078150	DG484	\N	CLEVER	NYAMAYARO	\N	\N	018a9f80-3688-48ee-8dc3-f4d21acc688e	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.007+02	2025-12-16 15:16:40.007+02
188ebd54-3fc7-4722-a0ad-126a630336e9	DG487	\N	STANLEY	MUNYARADZI	\N	\N	018a9f80-3688-48ee-8dc3-f4d21acc688e	\N	ac03d50a-f77e-46db-b2b7-e8d26a7e0357	BUILDER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.009+02	2025-12-16 15:16:40.009+02
a0c1110c-5789-47c6-bf20-79f243279969	DG504	\N	PROSPERITY	PFUPA	\N	\N	018a9f80-3688-48ee-8dc3-f4d21acc688e	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.012+02	2025-12-16 15:16:40.012+02
17acf894-1838-4c28-a8c0-e9ad12c361ad	DG507	\N	LOVEMORE	SIMUDZIRAYI	\N	\N	018a9f80-3688-48ee-8dc3-f4d21acc688e	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.015+02	2025-12-16 15:16:40.015+02
204c93ee-d04c-4400-a77b-7c3b64dbb56f	DG512	\N	VITALIS	CHIKOYA	\N	\N	018a9f80-3688-48ee-8dc3-f4d21acc688e	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.017+02	2025-12-16 15:16:40.017+02
e362f79a-0575-41f7-a2a7-7da0504ae89f	DG537	\N	NIGEL	CHIKOYA	\N	\N	018a9f80-3688-48ee-8dc3-f4d21acc688e	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.027+02	2025-12-16 15:16:40.027+02
0005ed49-dabf-47bd-b8a4-8ab5d0eec31c	DG542	\N	EMETI	MBUNDURE	\N	\N	018a9f80-3688-48ee-8dc3-f4d21acc688e	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.03+02	2025-12-16 15:16:40.03+02
1be79dd2-0954-4e08-9e96-fe0e82d6ad48	DG563	\N	PARTSON	CHIPENGO	\N	\N	018a9f80-3688-48ee-8dc3-f4d21acc688e	\N	ce4ae6ee-7cf2-4579-b9da-0e42e3f45ca6	SEMI- SKILLED BUILDER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.033+02	2025-12-16 15:16:40.033+02
e633b9f5-38be-402d-8591-41dd01004a99	DG564	\N	IGNATIOUS	MAKAYI	\N	\N	018a9f80-3688-48ee-8dc3-f4d21acc688e	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.036+02	2025-12-16 15:16:40.036+02
747ce7f7-8a4c-48a5-9909-b6a9faed4000	DG613	\N	HARMONY	KAMBEWU	\N	\N	018a9f80-3688-48ee-8dc3-f4d21acc688e	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.04+02	2025-12-16 15:16:40.04+02
34c35fb6-dbfb-4355-95a4-73f3102bf106	DG659	\N	GIVEMORE	CHIYANGE	\N	\N	018a9f80-3688-48ee-8dc3-f4d21acc688e	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.043+02	2025-12-16 15:16:40.043+02
aedc6c03-b128-413c-9735-539a7ac8fc0f	DG693	\N	RANGANAI	CHIDHAWU	\N	\N	018a9f80-3688-48ee-8dc3-f4d21acc688e	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.046+02	2025-12-16 15:16:40.046+02
f5d3612e-ac31-43d3-a9e9-40fc6e0a3748	DG709	\N	JOSHUA	MUCHEMERANWA	\N	\N	018a9f80-3688-48ee-8dc3-f4d21acc688e	\N	665ab247-95e0-47b5-b7a7-bc5712471552	SCAFFOLDERS ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.049+02	2025-12-16 15:16:40.049+02
5ba5b7a7-c4b1-4b9b-a070-bb26430288f0	DG710	\N	EVANS	MURONZI	\N	\N	018a9f80-3688-48ee-8dc3-f4d21acc688e	\N	\N	SEMI SKILLED BUILDER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.054+02	2025-12-16 15:16:40.054+02
96238173-f01c-4477-894d-e9e1d8c2da3b	DG291	\N	LEAN	GUNJA	\N	\N	fa570fb8-b13c-4fe5-8da9-e49f7f01dede	\N	af2eab91-cc41-44f5-ab9f-7894cf0f013a	CORE SHED ATTENDANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.105+02	2025-12-16 15:16:40.105+02
ebf082f4-c71a-4fb6-a102-9743b88ae527	DG004	\N	COLLEN	BHOBHO	\N	\N	fa570fb8-b13c-4fe5-8da9-e49f7f01dede	\N	16427f1f-650e-4d57-a915-4c73390ae4a4	TRAINEE GEO TECH	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.109+02	2025-12-16 15:16:40.109+02
34aa3575-e36c-4a33-a7a3-ba4d5d055b3a	DG013	\N	BIGGIE	CHITUMBA	\N	\N	fa570fb8-b13c-4fe5-8da9-e49f7f01dede	\N	16427f1f-650e-4d57-a915-4c73390ae4a4	TRAINEE GEO TECH	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.112+02	2025-12-16 15:16:40.112+02
8242afc0-d24c-469e-8153-df0c5f0bde28	DG017	\N	KENNETH	KARISE	\N	\N	fa570fb8-b13c-4fe5-8da9-e49f7f01dede	\N	16427f1f-650e-4d57-a915-4c73390ae4a4	TRAINEE GEO TECH	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.116+02	2025-12-16 15:16:40.116+02
408e3e18-0fb2-4445-a55e-ec9e7cf53f56	DG067	\N	CHARLES	MAPORISA	\N	\N	fa570fb8-b13c-4fe5-8da9-e49f7f01dede	\N	2fafe9b0-fafb-475c-9a40-5d7a0f1ad73f	SAMPLER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.119+02	2025-12-16 15:16:40.119+02
da9fe1d0-5c81-433a-98f4-5b3a942b1694	DG069	\N	PRUDENCE	CHIDORA	\N	\N	fa570fb8-b13c-4fe5-8da9-e49f7f01dede	\N	8426454b-de6a-46dc-852c-884838f33aa5	SAMPLER RC DRILLING	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.123+02	2025-12-16 15:16:40.123+02
b804e9cc-5f21-4a71-ab83-7bb3a41dacba	DG153	\N	SHELLINGTON	MAPOSA	\N	\N	fa570fb8-b13c-4fe5-8da9-e49f7f01dede	\N	2fafe9b0-fafb-475c-9a40-5d7a0f1ad73f	SAMPLER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.127+02	2025-12-16 15:16:40.127+02
6cffe602-fd49-4ac2-9046-6cf2d96f0662	DG268	\N	ANHTONY	TAULO	\N	\N	fa570fb8-b13c-4fe5-8da9-e49f7f01dede	\N	2fafe9b0-fafb-475c-9a40-5d7a0f1ad73f	SAMPLER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.134+02	2025-12-16 15:16:40.134+02
56f887f8-4695-4c2f-8250-073e7348b204	DG270	\N	TINASHE	NDORO	\N	\N	fa570fb8-b13c-4fe5-8da9-e49f7f01dede	\N	2fafe9b0-fafb-475c-9a40-5d7a0f1ad73f	SAMPLER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.138+02	2025-12-16 15:16:40.138+02
05b5a2d6-e9fa-4f2c-a1a2-fb115711c866	DG280	\N	TAKAWIRA	CHAPUKA	\N	\N	fa570fb8-b13c-4fe5-8da9-e49f7f01dede	\N	2fafe9b0-fafb-475c-9a40-5d7a0f1ad73f	SAMPLER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.141+02	2025-12-16 15:16:40.141+02
74b8d09e-4e38-4328-ba03-d026134151a9	DG282	\N	ANDERSON	CHIKORE	\N	\N	fa570fb8-b13c-4fe5-8da9-e49f7f01dede	\N	2fafe9b0-fafb-475c-9a40-5d7a0f1ad73f	SAMPLER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.144+02	2025-12-16 15:16:40.144+02
bf73125a-a89f-4e3d-b5ee-440a48c2847f	DG298	\N	NEBIA	MADZIVANZIRA	\N	\N	fa570fb8-b13c-4fe5-8da9-e49f7f01dede	\N	2fafe9b0-fafb-475c-9a40-5d7a0f1ad73f	SAMPLER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.147+02	2025-12-16 15:16:40.147+02
d24a02b3-f133-412e-a1fe-837acd7552ee	DG302	\N	LINDSAY	CHINYAMA	\N	\N	fa570fb8-b13c-4fe5-8da9-e49f7f01dede	\N	dad5fa37-b33e-40a7-ad7c-4de2e0243f91	DATA CAPTURE CLERK	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.15+02	2025-12-16 15:16:40.15+02
f2369cd9-9177-46da-b46b-f5d17ebb2359	DG313	\N	DARLINGTON	GUNI	\N	\N	fa570fb8-b13c-4fe5-8da9-e49f7f01dede	\N	2fafe9b0-fafb-475c-9a40-5d7a0f1ad73f	SAMPLER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.153+02	2025-12-16 15:16:40.153+02
a8367465-5a6b-48a7-b04a-2942c5144b46	DG321	\N	NIGEL	MASHONGANYIKA	\N	\N	fa570fb8-b13c-4fe5-8da9-e49f7f01dede	\N	733ddd8e-5cbb-4719-ba60-253d93efb3fb	SAMPLER (RC DRILLING)	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.157+02	2025-12-16 15:16:40.157+02
0cabb883-2499-4141-97a3-ad83f03e5efb	DG381	\N	ARCHBORD	NYANHETE	\N	\N	fa570fb8-b13c-4fe5-8da9-e49f7f01dede	\N	8426454b-de6a-46dc-852c-884838f33aa5	SAMPLER RC DRILLING	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.16+02	2025-12-16 15:16:40.16+02
1c0c3a49-dbb5-4716-956c-f13e3be5ad79	DG418	\N	ENIFA	NHAURIRO	\N	\N	fa570fb8-b13c-4fe5-8da9-e49f7f01dede	\N	8426454b-de6a-46dc-852c-884838f33aa5	SAMPLER RC DRILLING	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.163+02	2025-12-16 15:16:40.163+02
33444e74-6448-45f0-b108-1778a0397eb3	DG453	\N	MALVERN	MUCHAZIVEPI	\N	\N	fa570fb8-b13c-4fe5-8da9-e49f7f01dede	\N	8426454b-de6a-46dc-852c-884838f33aa5	SAMPLER RC DRILLING	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.166+02	2025-12-16 15:16:40.166+02
8a502a39-17ff-4c8d-afa1-f3f355af90c9	DG500	\N	ABEL	MUGARI	\N	\N	fa570fb8-b13c-4fe5-8da9-e49f7f01dede	\N	8426454b-de6a-46dc-852c-884838f33aa5	SAMPLER RC DRILLING	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.169+02	2025-12-16 15:16:40.169+02
079a01c5-d7ac-4b9f-8f69-21777da78c0a	DG501	\N	TATENDA	NGOCHO	\N	\N	fa570fb8-b13c-4fe5-8da9-e49f7f01dede	\N	dad5fa37-b33e-40a7-ad7c-4de2e0243f91	DATA CAPTURE CLERK	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.173+02	2025-12-16 15:16:40.173+02
b3992f04-507e-4e8b-859a-8130776cd009	DG502	\N	GRACIOUS	NZVAURA	\N	\N	fa570fb8-b13c-4fe5-8da9-e49f7f01dede	\N	8426454b-de6a-46dc-852c-884838f33aa5	SAMPLER RC DRILLING	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.178+02	2025-12-16 15:16:40.178+02
aa8c8b49-339a-4bcf-9632-02a44b37c09e	DG651	\N	NYASHA	NHAMOYEBONDE	\N	\N	fa570fb8-b13c-4fe5-8da9-e49f7f01dede	\N	2fafe9b0-fafb-475c-9a40-5d7a0f1ad73f	SAMPLER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.181+02	2025-12-16 15:16:40.181+02
4ebaf363-8e0c-471c-8b07-67e32a0fde01	DG666	\N	MUNYARADZI	MUROIWA	\N	\N	fa570fb8-b13c-4fe5-8da9-e49f7f01dede	\N	505c5548-3c53-4ce6-a459-f41ca71f8304	RC SAMPLER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.185+02	2025-12-16 15:16:40.185+02
fade533f-8938-47b4-bf26-d0714bdf391f	DG048	\N	POWERMAN	KADZIMA	\N	\N	79981ee7-9928-4667-aac4-59cba3a31ddc	\N	e7e6f7b9-8ffd-47a4-bd11-5753a59654c7	SURVEY ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.189+02	2025-12-16 15:16:40.189+02
23402ea8-b12f-46bf-a8b6-76bb1d82a7ee	DG288	\N	TAURAI	CHIZANGA	\N	\N	79981ee7-9928-4667-aac4-59cba3a31ddc	\N	e7e6f7b9-8ffd-47a4-bd11-5753a59654c7	SURVEY ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.193+02	2025-12-16 15:16:40.193+02
41453cf4-550a-4c09-a9a0-74bcd5bfc729	DG300	\N	AUSTIN	MASONDO	\N	\N	79981ee7-9928-4667-aac4-59cba3a31ddc	\N	e7e6f7b9-8ffd-47a4-bd11-5753a59654c7	SURVEY ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.197+02	2025-12-16 15:16:40.197+02
754fff9f-cffc-4993-8935-d148d08cbdcc	DG338	\N	THABANI	NCUBE	\N	\N	79981ee7-9928-4667-aac4-59cba3a31ddc	\N	e7e6f7b9-8ffd-47a4-bd11-5753a59654c7	SURVEY ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.201+02	2025-12-16 15:16:40.201+02
c2136ca9-175e-4ede-a356-ff7b4b0e10b6	DG416	\N	KUDAKWASHE	MAZHAMBE	\N	\N	79981ee7-9928-4667-aac4-59cba3a31ddc	\N	e7e6f7b9-8ffd-47a4-bd11-5753a59654c7	SURVEY ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.205+02	2025-12-16 15:16:40.205+02
a2554ae0-f029-4a27-97f2-cf3fa6a6b884	DG435	\N	LIBERTY	DAWA	\N	\N	79981ee7-9928-4667-aac4-59cba3a31ddc	\N	e7e6f7b9-8ffd-47a4-bd11-5753a59654c7	SURVEY ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.208+02	2025-12-16 15:16:40.208+02
da5361da-f8dd-4e22-a468-19775cb7c969	DG648	\N	DOMINIC	MARARA	\N	\N	79981ee7-9928-4667-aac4-59cba3a31ddc	\N	e7e6f7b9-8ffd-47a4-bd11-5753a59654c7	SURVEY ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.212+02	2025-12-16 15:16:40.212+02
ce85f8d9-388d-4047-ae53-40ac667b3dd0	DG649	\N	VALENTINE	SIBANDA	\N	\N	79981ee7-9928-4667-aac4-59cba3a31ddc	\N	0738f426-6126-4ff1-adf8-6ee9825199e6	DRIVER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.215+02	2025-12-16 15:16:40.215+02
e5caf739-59a0-4972-8357-ed84ee4e377e	DG112	\N	MANUEL	MAPULAZI	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	034e0526-f357-4057-8d58-48fa7e1c6e78	CIL ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.229+02	2025-12-16 15:16:40.229+02
1ac14c0e-2260-4a58-90b0-32c71617ba6d	DG200	\N	NYASHA	KASEKE	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	91d11785-69e8-402f-beae-badf3c33d6e5	RELIEF CREW ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.232+02	2025-12-16 15:16:40.232+02
aab3a0aa-896b-4455-8e3e-4d7efee033e4	DG370	\N	BESON	NYASULO	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	15ab175a-a09f-4232-8289-8092281fed17	CIL OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.235+02	2025-12-16 15:16:40.235+02
4be58cc2-ed7d-44e9-84e0-013ce84e9544	DG403	\N	DADIRAI	CHIHWAKU	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	855a6e1d-c0ed-4013-9d31-457721787ed7	GENERAL ASSISTANT CIL	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.239+02	2025-12-16 15:16:40.239+02
1e9b018e-d66c-4533-8631-5866c2e662d4	DG480	\N	THELMA	CHIBHAGU	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	ed8cfe44-01e5-46d1-8f4a-14bfcde0d59a	GENERAL PLANT ATTENDANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.242+02	2025-12-16 15:16:40.242+02
e66df01f-3564-4aa1-bd46-600d8476a640	DG521	\N	MAXWELL	WANJOWA	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	15ab175a-a09f-4232-8289-8092281fed17	CIL OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.245+02	2025-12-16 15:16:40.245+02
f39ff20b-41b4-4b7b-b715-7dbe71862fe1	DG551	\N	LAWRENCIOUS	GUDO	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	ed8cfe44-01e5-46d1-8f4a-14bfcde0d59a	GENERAL PLANT ATTENDANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.248+02	2025-12-16 15:16:40.248+02
2a1144d9-7a12-4908-94c3-6f492c85bd19	DG247	\N	HILTON	KADAIRA	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	298ac7f4-f8c4-496e-bd8f-1f5457d6efa2	ELUTION & REAGENTS ASSIST	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.251+02	2025-12-16 15:16:40.251+02
63eb453e-63ee-466b-b691-9897c45c8e29	DG371	\N	UMALI	PITCHES	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	b4c1ca83-8488-4ad1-a2c3-3f318e02c712	ELUTION OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.254+02	2025-12-16 15:16:40.254+02
a1bcdd49-95bb-4ee6-9838-5b74de1d0194	DG373	\N	EMMANUEL	PARADZAYI	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	b4c1ca83-8488-4ad1-a2c3-3f318e02c712	ELUTION OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.258+02	2025-12-16 15:16:40.258+02
f1b852e8-a3fe-4b60-9a43-9539f529408f	DG375	\N	FARAI	MUZIRA	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	b4c1ca83-8488-4ad1-a2c3-3f318e02c712	ELUTION OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.261+02	2025-12-16 15:16:40.261+02
35a80d74-ae86-4a05-aa54-5a8a47ae8002	DG420	\N	MELODY	CHIKOYA	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	91d11785-69e8-402f-beae-badf3c33d6e5	RELIEF CREW ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.264+02	2025-12-16 15:16:40.264+02
693ff82d-ac5a-4b04-82e0-cc5f27df54a3	DG466	\N	VENGESAI	MANYANGE	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	78e8fba6-243f-4c73-a8fd-5f3b6e3a3822	ELUTION ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.267+02	2025-12-16 15:16:40.267+02
c788b856-ced2-47f8-9ae1-314eb3816f09	DG011	\N	AUGUSTINE	CHINGUWA	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	a7b7694d-11fa-4138-bb85-58af18facc54	BALLMILL ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.27+02	2025-12-16 15:16:40.27+02
79933833-507e-4710-8d3d-204027b0f42e	DG052	\N	DUNGISANI	MUSIIWA	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	889651de-1875-4128-9fdd-69eb7ab17c77	HOUSE KEEPING ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.274+02	2025-12-16 15:16:40.274+02
6a66b1ab-1afe-45a6-9c66-235d6b58794e	DG183	\N	KUDZAI	CHIZANGA	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	889651de-1875-4128-9fdd-69eb7ab17c77	HOUSE KEEPING ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.277+02	2025-12-16 15:16:40.277+02
0453aa20-1198-49c7-a138-e502c17e7c77	DG211	\N	NATHANIEL	MURANDA	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	889651de-1875-4128-9fdd-69eb7ab17c77	HOUSE KEEPING ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.28+02	2025-12-16 15:16:40.28+02
28cb9ebd-4e31-4b73-a6cc-cc8c39b5a29d	DG213	\N	SAFASONGE	NGWENYA	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	566f4ae8-e153-48e9-8197-08b0944e8ad6	LEAVE RELIEF CREW	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.284+02	2025-12-16 15:16:40.284+02
c4050fd6-e70d-4ba1-ad03-6bbb919224e4	DG461	\N	ASHWIN	KATUMBA	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	566f4ae8-e153-48e9-8197-08b0944e8ad6	LEAVE RELIEF CREW	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.287+02	2025-12-16 15:16:40.287+02
65b900ce-9f58-49cf-b3e7-ba87e3bab728	DG485	\N	LAWRENCE	KADZVITI	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	91d11785-69e8-402f-beae-badf3c33d6e5	RELIEF CREW ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.29+02	2025-12-16 15:16:40.29+02
f0f2ab82-5b18-481f-98be-237d6d2ab4dc	DG486	\N	ELASTO	BAKACHEZA	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	32083df7-2d08-49ff-84ac-150f79791748	GENERAL MILL ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.293+02	2025-12-16 15:16:40.293+02
c49cdd26-330a-4383-a279-d53369809ab8	DG514	\N	LOVEJOY	MANHANGA	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	889651de-1875-4128-9fdd-69eb7ab17c77	HOUSE KEEPING ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.296+02	2025-12-16 15:16:40.296+02
dbf7f2a8-9df7-480c-8de0-d79b01f7416f	DG568	\N	CARLTON	DZIMBIRI	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	ed8cfe44-01e5-46d1-8f4a-14bfcde0d59a	GENERAL PLANT ATTENDANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.299+02	2025-12-16 15:16:40.299+02
01e2f813-8cbf-45b4-90ae-0212929f7400	DG570	\N	FURTHERSTEP	KADZIMA	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	889651de-1875-4128-9fdd-69eb7ab17c77	HOUSE KEEPING ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.302+02	2025-12-16 15:16:40.302+02
8953b839-7aa7-4c0c-a898-6b73c1255e43	DG589	\N	NOBERT	MUBAIWA	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	f5a78c96-34e3-4548-bfe7-7b803917eec0	GENERAL PLANT ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.306+02	2025-12-16 15:16:40.306+02
35c43bc3-7bee-41d0-8782-aceda7a244b6	DG597	\N	TENDAI	TINANI	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	889651de-1875-4128-9fdd-69eb7ab17c77	HOUSE KEEPING ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.309+02	2025-12-16 15:16:40.309+02
7b9972f8-a2cf-4301-a5f8-951010b5fc5c	DG598	\N	BEHAVE	CHIGODO	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	a7b7694d-11fa-4138-bb85-58af18facc54	BALLMILL ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.312+02	2025-12-16 15:16:40.312+02
1163b090-85a2-41d2-8eaf-959c6a025252	DG672	\N	DARLINGTON	MASERE	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	bb634079-a2d5-431a-9a67-dffcde5f4157	PLUMBER ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.315+02	2025-12-16 15:16:40.315+02
e5b6b5dd-c1db-40d7-9aa1-c26cfe12911f	DG287	\N	LATIFAN	CHIRUME	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	b16964ff-7d20-490e-9ffb-0f4741a4772b	METALLURGICAL CLERK	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.318+02	2025-12-16 15:16:40.318+02
221cc9cf-5057-4943-bebc-16dbd964ebfb	DG583	\N	NYASHA	ZAMANI	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	f5a78c96-34e3-4548-bfe7-7b803917eec0	GENERAL PLANT ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.321+02	2025-12-16 15:16:40.321+02
87fc637f-7579-4940-bc9f-16652a1fa5bb	DG703	\N	TAFADZWA	TAPOMWA	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	a560feb8-59a2-45ad-84d8-20978bc58541	PLANT LAB ATTENDANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.324+02	2025-12-16 15:16:40.324+02
73c8cbd4-cb32-4fed-a466-5b888c4aa686	DG063	\N	PETROS	SHERENI	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	32083df7-2d08-49ff-84ac-150f79791748	GENERAL MILL ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.327+02	2025-12-16 15:16:40.327+02
d90a378a-f08c-48cf-831b-f2b2c1347407	DG072	\N	ADMIRE	KASIMO	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	b6179d05-618d-4868-b987-2e8ee22b34e7	TAILINGS STORAGE FACILITY ASSIST	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.33+02	2025-12-16 15:16:40.33+02
c46a06e6-8d3f-46cf-a71e-d8b344284a60	DG194	\N	ANTONY	NHAMOYEBONDE	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	a7b7694d-11fa-4138-bb85-58af18facc54	BALLMILL ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.333+02	2025-12-16 15:16:40.333+02
e0362360-27ad-4944-beb6-e1291186a034	DG195	\N	SELBORNE CHENGETAI	NYAZIKA	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	a7b7694d-11fa-4138-bb85-58af18facc54	BALLMILL ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.336+02	2025-12-16 15:16:40.336+02
89fc120d-4498-4c21-8e3b-ed42d66219b4	DG205	\N	DONALD	MASANGO	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	a7b7694d-11fa-4138-bb85-58af18facc54	BALLMILL ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.339+02	2025-12-16 15:16:40.339+02
63bd2f6e-1ac6-41e0-8a42-b9678f6dec09	DG266	\N	LIBERTY	CHESANGO	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	b6179d05-618d-4868-b987-2e8ee22b34e7	TAILINGS STORAGE FACILITY ASSIST	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.342+02	2025-12-16 15:16:40.342+02
fb046981-f7d6-4f4a-afcc-f0d2bb5102e3	DG279	\N	LAMECK	BRIAN	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	a7b7694d-11fa-4138-bb85-58af18facc54	BALLMILL ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.345+02	2025-12-16 15:16:40.345+02
07d44a25-07cd-4f4f-a2f0-d25e9c60056c	DG327	\N	WELLINGTON	NYIKADZINO	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	889651de-1875-4128-9fdd-69eb7ab17c77	HOUSE KEEPING ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.347+02	2025-12-16 15:16:40.347+02
3f00f54a-7977-4245-900b-159b15031b45	DG333	\N	BELIEVE	GOVHA	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	a7b7694d-11fa-4138-bb85-58af18facc54	BALLMILL ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.35+02	2025-12-16 15:16:40.35+02
0e58c860-1088-46f8-8d41-0da855551216	DG336	\N	CLEMENCE KURAUONE	NYIKADZINO	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	a7b7694d-11fa-4138-bb85-58af18facc54	BALLMILL ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.353+02	2025-12-16 15:16:40.353+02
3fcd8913-b16c-4f42-a004-c0267bafbf1f	DG345	\N	TARUVINGA	BGWANYA	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	a7b7694d-11fa-4138-bb85-58af18facc54	BALLMILL ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.356+02	2025-12-16 15:16:40.356+02
1ed984c5-6ba7-4423-9111-c4d84bfadc8e	DG353	\N	MAXWELL	GONDO	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	a7b7694d-11fa-4138-bb85-58af18facc54	BALLMILL ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.359+02	2025-12-16 15:16:40.359+02
333e3e7f-3efd-4253-b5c9-a56078a49947	DG374	\N	ANYWAY	MAGWENZI	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	5bffc26c-380a-4919-91b5-e16927fea0e9	MILL OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.362+02	2025-12-16 15:16:40.362+02
409c3dcf-06d3-46d2-8918-4afd089284e8	DG376	\N	SHADRECK	CHIYANDO	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	5bffc26c-380a-4919-91b5-e16927fea0e9	MILL OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.365+02	2025-12-16 15:16:40.365+02
24ce9f45-a8b4-4d71-8bd5-7b9193b1c2fc	DG401	\N	FARAI	CHIPATO	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	5bffc26c-380a-4919-91b5-e16927fea0e9	MILL OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.368+02	2025-12-16 15:16:40.368+02
d942ea83-230e-408f-9b38-803905cc9dbd	DG539	\N	KELVIN	CHIRIMUJIRI	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	f5a78c96-34e3-4548-bfe7-7b803917eec0	GENERAL PLANT ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.371+02	2025-12-16 15:16:40.371+02
86f2f9fc-64ca-4cff-b466-fb00adb4d618	DG541	\N	ELISHA	KARAMBWE	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	f5a78c96-34e3-4548-bfe7-7b803917eec0	GENERAL PLANT ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.375+02	2025-12-16 15:16:40.375+02
af4bbaf5-37f3-48c1-861e-c4adc0a9f313	DG546	\N	NKOSIYABO	MGUQUKA	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	f5a78c96-34e3-4548-bfe7-7b803917eec0	GENERAL PLANT ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.378+02	2025-12-16 15:16:40.378+02
97fac892-acc7-4b94-9c9a-a1278a248d3f	DG010	\N	JOFFREY	CHIMUTU	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	a7b7694d-11fa-4138-bb85-58af18facc54	BALLMILL ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.38+02	2025-12-16 15:16:40.38+02
745c9e9f-db91-4574-815f-b5b53a68fbfe	DG030	\N	ELISHA	NGONI	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	33a7f161-7c92-4c89-bc5f-68af16aed563	PRIMARY CRUSHER OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.384+02	2025-12-16 15:16:40.384+02
a950bde8-f322-4951-a9e6-b468c4714df6	DG079	\N	DAIROD	KAKONO	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	33a7f161-7c92-4c89-bc5f-68af16aed563	PRIMARY CRUSHER OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.387+02	2025-12-16 15:16:40.387+02
c30ccc9d-d71f-4e50-83aa-0b673caafbee	DG131	\N	GRACIOUS	MUZHONA	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	4955cab1-674b-4da2-ab64-93a484797453	PRIMARY CRUSHER ATTENDANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.39+02	2025-12-16 15:16:40.39+02
fd58a3e2-5759-4326-832b-ae38843f162c	DG134	\N	GAINMORE	CHARAMBIRA	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	4955cab1-674b-4da2-ab64-93a484797453	PRIMARY CRUSHER ATTENDANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.393+02	2025-12-16 15:16:40.393+02
b4af839e-7143-4d1b-8f21-a51f3d14def2	DG199	\N	KENNETH	LAPKEN	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	4955cab1-674b-4da2-ab64-93a484797453	PRIMARY CRUSHER ATTENDANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.396+02	2025-12-16 15:16:40.396+02
798a32d4-e637-4e5c-b3b7-85064c75d919	DG276	\N	SOLOMON	ZILAKA	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	4955cab1-674b-4da2-ab64-93a484797453	PRIMARY CRUSHER ATTENDANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.399+02	2025-12-16 15:16:40.399+02
61210c10-5470-4973-8dc0-0f4a388b78f5	DG278	\N	TERRENCE	BOTE	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	2fe0031b-4d64-4a3b-9f12-503ba3947fa3	PRIMARY CRUSHING OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.401+02	2025-12-16 15:16:40.401+02
cbcb8ae2-8393-4b22-bc76-f9fa845eadce	DG293	\N	DAVIES	KAHUMWE	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	4955cab1-674b-4da2-ab64-93a484797453	PRIMARY CRUSHER ATTENDANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.406+02	2025-12-16 15:16:40.406+02
40ec7766-d3a4-4851-91ff-7736fdf15ff2	DG742	\N	JAMES	KAISI	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	fb0544f9-4a28-4032-befb-0face3e9efc6	THICKENER OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.409+02	2025-12-16 15:16:40.409+02
6cafac78-4a58-4fc4-9ff1-b6e1c9e0d871	DG743	\N	ANDREW	CHANYUKA	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	fb0544f9-4a28-4032-befb-0face3e9efc6	THICKENER OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.414+02	2025-12-16 15:16:40.414+02
dd791b9b-e638-4889-8804-9626c1f14d10	DG744	\N	DIVASON	MKANDAWIRE	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	fb0544f9-4a28-4032-befb-0face3e9efc6	THICKENER OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.418+02	2025-12-16 15:16:40.418+02
b84c2934-a6da-4989-8eb0-f96a8a5f40bb	DG722	\N	NEHEMIAH	MUNYORO	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	f5a78c96-34e3-4548-bfe7-7b803917eec0	GENERAL PLANT ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.422+02	2025-12-16 15:16:40.422+02
2d14e320-7a31-4bbb-9138-9bdfec82a6fb	DG035	\N	ENOCK	PHIRI	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	889651de-1875-4128-9fdd-69eb7ab17c77	HOUSE KEEPING ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.425+02	2025-12-16 15:16:40.425+02
611e7741-a8c2-4c32-83b8-fbd04f6bcfd7	DG074	\N	CYRUS	CHIHOKO	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	f5a78c96-34e3-4548-bfe7-7b803917eec0	GENERAL PLANT ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.428+02	2025-12-16 15:16:40.428+02
71d90223-e62f-46aa-a2bf-524ecd93e594	DG377	\N	TINASHE	GWATA	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	6c80c3f2-c55e-4d7f-bc59-206f09167851	REAGENTS & SMELTING CONTROLLER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.433+02	2025-12-16 15:16:40.433+02
3540567f-974d-4485-bc48-2e280ecd9b61	DG457	\N	AGGRIPPA	CHIDEMO	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	d5b6101f-41e7-4489-97b0-8a25b6d8331a	REAGENTS & SMELTING ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.436+02	2025-12-16 15:16:40.436+02
8b60f047-9eff-435a-8ae7-59472bdfb6db	DG058	\N	ALBERT	MUDIWA	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	85b9637a-0768-490a-84ea-5b25822afac6	GENERAL SECONDARY & TERTIARY CRUSHING ASSIST	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.439+02	2025-12-16 15:16:40.439+02
0196ff62-afca-427f-8df5-75a103dd9a7e	DG142	\N	MCNELL	MATAMA	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	85b9637a-0768-490a-84ea-5b25822afac6	GENERAL SECONDARY & TERTIARY CRUSHING ASSIST	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.442+02	2025-12-16 15:16:40.442+02
be54e1b3-ae5b-4592-86ae-40555ffb9f33	DG143	\N	ADDLIGHT	NZVAURA	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	2881e9e3-65f8-4707-b612-be0b7b62546e	SECONDARY & TERTIARY CRUSHER OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.445+02	2025-12-16 15:16:40.445+02
3b68a0fd-9cb3-418f-9f70-419f01eca56c	DG181	\N	JACOB	CHITANHAMAPIRA	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	85b9637a-0768-490a-84ea-5b25822afac6	GENERAL SECONDARY & TERTIARY CRUSHING ASSIST	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.448+02	2025-12-16 15:16:40.448+02
91c05d82-a3ed-4e17-bfd0-e06e54dc7ae2	DG184	\N	HAMLET	KUGOTSI	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	2881e9e3-65f8-4707-b612-be0b7b62546e	SECONDARY & TERTIARY CRUSHER OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.45+02	2025-12-16 15:16:40.45+02
77890e42-7584-4775-b018-f849a9833858	DG188	\N	FOSTER	MARIME	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	2881e9e3-65f8-4707-b612-be0b7b62546e	SECONDARY & TERTIARY CRUSHER OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.453+02	2025-12-16 15:16:40.453+02
2af9133b-d2cf-4e34-8d9d-c93b2d279dcd	DG237	\N	PRAISE K	CHANETSA	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	32083df7-2d08-49ff-84ac-150f79791748	GENERAL MILL ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.456+02	2025-12-16 15:16:40.456+02
4ee02a94-8083-4363-b73b-6548a481bdf4	DG281	\N	FORGET	CHIGWADA	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	85b9637a-0768-490a-84ea-5b25822afac6	GENERAL SECONDARY & TERTIARY CRUSHING ASSIST	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.459+02	2025-12-16 15:16:40.459+02
dc002845-2f1e-4db7-b470-05142f293a6e	DG355	\N	TATENDA	MAPURANGA	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	85b9637a-0768-490a-84ea-5b25822afac6	GENERAL SECONDARY & TERTIARY CRUSHING ASSIST	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.463+02	2025-12-16 15:16:40.463+02
ebf16696-1eb7-4e51-a4b4-8b0cdc37d69b	DG003	\N	BHANDASON	BHANDA	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	40647015-5ba0-49bb-bb8a-00b7630cd720	TAILINGS STORAGE FACILITY OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.469+02	2025-12-16 15:16:40.469+02
7b22e0e0-5df9-4ac3-8458-29f4c0b985f4	DG036	\N	GIVEMORE	PHIRI	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	40647015-5ba0-49bb-bb8a-00b7630cd720	TAILINGS STORAGE FACILITY OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.476+02	2025-12-16 15:16:40.476+02
bd328ce8-b251-451c-bc86-8c7584640932	DG065	\N	KUDAKWASHE	RUNZIRA	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	40647015-5ba0-49bb-bb8a-00b7630cd720	TAILINGS STORAGE FACILITY OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.479+02	2025-12-16 15:16:40.479+02
20fa0b7f-0fb2-4931-8996-d2a2cbc0c6a2	DG071	\N	ALBERT	MAPIRA	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	f5a78c96-34e3-4548-bfe7-7b803917eec0	GENERAL PLANT ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.481+02	2025-12-16 15:16:40.481+02
c7dc1ca2-8481-459a-91a6-6f763e5aca0e	DG103	\N	FIDELIS	MUTAYI	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	f5a78c96-34e3-4548-bfe7-7b803917eec0	GENERAL PLANT ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.484+02	2025-12-16 15:16:40.484+02
d4352fc8-0deb-4915-9bd9-c8b0d1991b5e	DG127	\N	LEONARD	BUNGU	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	32083df7-2d08-49ff-84ac-150f79791748	GENERAL MILL ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.487+02	2025-12-16 15:16:40.487+02
6036bb84-238f-4fe5-bd7b-6fb280df2e41	DG128	\N	FRIDAY	KAVINGA	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	f5a78c96-34e3-4548-bfe7-7b803917eec0	GENERAL PLANT ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.49+02	2025-12-16 15:16:40.49+02
91267c9c-8995-4239-b4bf-d56482a53545	DG133	\N	LAMECK	KUMBONJE	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.493+02	2025-12-16 15:16:40.493+02
29285aee-819d-4afe-985d-e5ba97d28e1a	DG144	\N	NOEL	TAULO	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	f5a78c96-34e3-4548-bfe7-7b803917eec0	GENERAL PLANT ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.496+02	2025-12-16 15:16:40.496+02
bb549f25-5fa3-4153-85ae-990e75cebf79	DG146	\N	ELISHA	MUNETSI	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	a7b7694d-11fa-4138-bb85-58af18facc54	BALLMILL ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.499+02	2025-12-16 15:16:40.499+02
92b2e78f-6633-447c-9456-2722125a1d89	DG156	\N	MAKOMBORERO	KOMBONI	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	b6179d05-618d-4868-b987-2e8ee22b34e7	TAILINGS STORAGE FACILITY ASSIST	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.502+02	2025-12-16 15:16:40.502+02
3caed6c6-2dd5-4ec5-b88f-b31180cf2fa8	DG189	\N	ELIAS	MARIMO	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	f5a78c96-34e3-4548-bfe7-7b803917eec0	GENERAL PLANT ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.507+02	2025-12-16 15:16:40.507+02
06530a63-80e6-4930-acb2-997ec3cb6f4e	DG285	\N	COSMAS	CHIMANIKIRE	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	f5a78c96-34e3-4548-bfe7-7b803917eec0	GENERAL PLANT ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.511+02	2025-12-16 15:16:40.511+02
ecb4b136-8d0b-4ee4-bb43-122ac6ee7130	DG296	\N	TAKUDZWA	KASEKE	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	f5a78c96-34e3-4548-bfe7-7b803917eec0	GENERAL PLANT ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.513+02	2025-12-16 15:16:40.513+02
aeee90d2-5e75-4071-b523-a043999f7287	DG340	\N	AMOS	MACHAKARI	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	f35b7fa2-ddd8-42a4-8147-768c710c82c3	TEAM LEADER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.516+02	2025-12-16 15:16:40.516+02
1f1b31d2-7602-4c61-ba0b-86cf47ab76c5	DG343	\N	STACIOUS	KUSIKWENYU	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	f5a78c96-34e3-4548-bfe7-7b803917eec0	GENERAL PLANT ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.52+02	2025-12-16 15:16:40.52+02
4fbb4305-21f3-4eec-96fb-f171f03afef4	DG394	\N	PRINCE	NHAUCHURU	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	f5a78c96-34e3-4548-bfe7-7b803917eec0	GENERAL PLANT ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.523+02	2025-12-16 15:16:40.523+02
fa46066b-98e0-42b0-ba3e-339c72efeecf	DG433	\N	TAWANDA	MUKWENYA	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	f5a78c96-34e3-4548-bfe7-7b803917eec0	GENERAL PLANT ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.526+02	2025-12-16 15:16:40.526+02
d0ab0a7a-165d-4638-8664-e9ce1e49c739	DG503	\N	RICHARD	KAZUNGA	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	f5a78c96-34e3-4548-bfe7-7b803917eec0	GENERAL PLANT ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.529+02	2025-12-16 15:16:40.529+02
ecb73ce0-9834-49a7-b1a5-c20df046e78f	DG506	\N	COASTER	JACK	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	f5a78c96-34e3-4548-bfe7-7b803917eec0	GENERAL PLANT ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.531+02	2025-12-16 15:16:40.531+02
10ad6b1b-7e39-4488-bc5d-f7600bb391d2	DG509	\N	MILTON	CHIGODHO	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	f5a78c96-34e3-4548-bfe7-7b803917eec0	GENERAL PLANT ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.534+02	2025-12-16 15:16:40.534+02
84ce28d8-dcd8-4fe1-86ce-86ba60760747	DG511	\N	WISE	TAMBUDZA	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	f5a78c96-34e3-4548-bfe7-7b803917eec0	GENERAL PLANT ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.538+02	2025-12-16 15:16:40.538+02
2be1c440-0d88-4aa6-8502-4f2448e7dcbb	DG639	\N	ELVIS	MARAMBA	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	f5a78c96-34e3-4548-bfe7-7b803917eec0	GENERAL PLANT ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.542+02	2025-12-16 15:16:40.542+02
c65dfb93-2da3-4bcf-8808-9e19ec3c577d	DG640	\N	TINOTENDA	PARWARINGIRA	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	f5a78c96-34e3-4548-bfe7-7b803917eec0	GENERAL PLANT ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.545+02	2025-12-16 15:16:40.545+02
31aa85b0-23f9-43ad-835a-748240c16995	DG641	\N	TAFADZWA	MAKREYA	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	f5a78c96-34e3-4548-bfe7-7b803917eec0	GENERAL PLANT ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.548+02	2025-12-16 15:16:40.548+02
02f92e0c-e059-47fd-be4c-cb70137d3725	DG664	\N	TENDEKAI	MUFUMBIRA	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	f5a78c96-34e3-4548-bfe7-7b803917eec0	GENERAL PLANT ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.551+02	2025-12-16 15:16:40.551+02
fc7667e1-6356-4835-b148-ba50c1df6336	DG717	\N	TANAKA	CHIHLABA	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	ed8cfe44-01e5-46d1-8f4a-14bfcde0d59a	GENERAL PLANT ATTENDANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.555+02	2025-12-16 15:16:40.555+02
1b1367fc-0636-480d-acd0-03808bcb549c	DG718	\N	TANAKA	MAVESERE	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	\N	ed8cfe44-01e5-46d1-8f4a-14bfcde0d59a	GENERAL PLANT ATTENDANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-16 15:16:40.558+02	2025-12-16 15:16:40.558+02
\.


--
-- TOC entry 5172 (class 0 OID 53789)
-- Dependencies: 237
-- Data for Name: failure_reports; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.failure_reports (id, employee_id, ppe_item_id, allocation_id, stock_id, replacement_stock_id, description, failure_type, observed_at, reported_date, failure_date, brand, remarks, reviewed_by_s_h_e_q, sheq_decision, sheq_review_date, action_taken, severity, status, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5175 (class 0 OID 53867)
-- Dependencies: 240
-- Data for Name: forecasts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.forecasts (id, period_year, period_quarter, forecast_quantity, actual_quantity, variance, notes, created_at, updated_at, department_id, ppe_item_id) FROM stdin;
\.


--
-- TOC entry 5166 (class 0 OID 53521)
-- Dependencies: 231
-- Data for Name: job_title_ppe_matrix; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.job_title_ppe_matrix (id, "jobTitleId", job_title, ppe_item_id, quantity_required, replacement_frequency, heavy_use_frequency, is_mandatory, category, notes, is_active, created_at, updated_at) FROM stdin;
83e14cbd-7bc2-4777-a358-6c4f94abb216	4eb0b83f-8975-4f14-b594-dd1d1083f70c	IT OFFICER	e4a9c32a-c93f-4312-8ea0-9055f8f18ebc	1	12	\N	t	FEET	\N	t	2025-12-16 18:07:25.471+02	2025-12-16 18:07:25.471+02
54df38c4-59c6-43a1-835c-87c6f2e9d716	4eb0b83f-8975-4f14-b594-dd1d1083f70c	IT OFFICER	2d79b3a3-6e62-4484-8913-14b141381da9	1	12	\N	t	FEET	\N	t	2025-12-16 18:07:25.471+02	2025-12-16 18:07:25.471+02
c0ea3cc4-a3fc-40c1-a79a-4ce46aad3d1e	4eb0b83f-8975-4f14-b594-dd1d1083f70c	IT OFFICER	9fe8ed70-040e-427b-b599-55cec4071265	1	12	\N	t	FEET	\N	t	2025-12-16 18:07:25.471+02	2025-12-16 18:07:25.471+02
1cff2dba-aea0-402c-97af-2bf83b4039d0	4eb0b83f-8975-4f14-b594-dd1d1083f70c	IT OFFICER	44619c3c-b387-47c8-a03f-9c1d5d7446ac	1	12	\N	t	BODY/TORSO	\N	t	2025-12-16 18:07:25.471+02	2025-12-16 18:07:25.471+02
404b4985-115b-4852-b4a0-73d583041adb	4eb0b83f-8975-4f14-b594-dd1d1083f70c	IT OFFICER	231192eb-813a-4053-ab45-77f593d2ef24	1	12	\N	t	BODY/TORSO	\N	t	2025-12-16 18:07:25.471+02	2025-12-16 18:07:25.471+02
\.


--
-- TOC entry 5160 (class 0 OID 53401)
-- Dependencies: 225
-- Data for Name: job_titles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.job_titles (id, name, code, description, "sectionId", "isActive", "createdAt", "updatedAt") FROM stdin;
fabda062-af9a-4824-91ff-452c49ba1b59	LABORATORY TECHNICIAN	\N	\N	6355b60b-6c2c-4aa1-9417-5c66fd8065d9	t	2025-12-16 13:04:09.921+02	2025-12-16 13:04:09.921+02
8cc39f68-c832-4693-8c85-7f019a1bbfe2	MINE ASSAYER	\N	\N	6355b60b-6c2c-4aa1-9417-5c66fd8065d9	t	2025-12-16 13:04:09.935+02	2025-12-16 13:04:09.935+02
a424ab05-6024-4d14-9626-7058c9da1989	LABORATORY ASSISTANT	\N	\N	6355b60b-6c2c-4aa1-9417-5c66fd8065d9	t	2025-12-16 13:04:09.94+02	2025-12-16 13:04:09.94+02
4e24bfa4-2ee9-4deb-95eb-2d27b8fbd7c1	CHARGEHAND BUILDERS	\N	\N	018a9f80-3688-48ee-8dc3-f4d21acc688e	t	2025-12-16 13:04:09.943+02	2025-12-16 13:04:09.943+02
25b79bbe-cd48-48bd-b3b5-0ce7023ab18b	CARPENTER CLASS 1	\N	\N	018a9f80-3688-48ee-8dc3-f4d21acc688e	t	2025-12-16 13:04:09.946+02	2025-12-16 13:04:09.946+02
a16c530b-ce2a-4f9f-9818-53858323aadc	CIVILS SUPERVISOR	\N	\N	018a9f80-3688-48ee-8dc3-f4d21acc688e	t	2025-12-16 13:04:09.951+02	2025-12-16 13:04:09.951+02
ac03d50a-f77e-46db-b2b7-e8d26a7e0357	BUILDER	\N	\N	018a9f80-3688-48ee-8dc3-f4d21acc688e	t	2025-12-16 13:04:09.954+02	2025-12-16 13:04:09.954+02
50a6d588-b1c5-4d3f-8e4c-0209282a0161	SEMI-SKILLED BUILDER	\N	\N	018a9f80-3688-48ee-8dc3-f4d21acc688e	t	2025-12-16 13:04:09.956+02	2025-12-16 13:04:09.956+02
ce4ae6ee-7cf2-4579-b9da-0e42e3f45ca6	SEMI- SKILLED BUILDER	\N	\N	018a9f80-3688-48ee-8dc3-f4d21acc688e	t	2025-12-16 13:04:09.959+02	2025-12-16 13:04:09.959+02
7f32c3df-4942-4580-a712-2933f39828c1	SEMI- SKILLED CARPENTER	\N	\N	018a9f80-3688-48ee-8dc3-f4d21acc688e	t	2025-12-16 13:04:09.962+02	2025-12-16 13:04:09.962+02
665ab247-95e0-47b5-b7a7-bc5712471552	SCAFFOLDERS ASSISTANT	\N	\N	018a9f80-3688-48ee-8dc3-f4d21acc688e	t	2025-12-16 13:04:09.965+02	2025-12-16 13:04:09.965+02
9ffba8ae-fdc2-43dc-8d5f-5d4d0d6bbb5f	GENERAL HAND	\N	\N	018a9f80-3688-48ee-8dc3-f4d21acc688e	t	2025-12-16 13:04:09.969+02	2025-12-16 13:04:09.969+02
4622a6df-b6e6-412b-972f-a09f56c0cbf4	ELECTRICIAN CLASS 1	\N	\N	49cf5912-e16f-430e-9dbc-e85439b62acc	t	2025-12-16 13:04:09.972+02	2025-12-16 13:04:09.972+02
e18ca6af-c9ee-44b0-9c76-4777d5743dcf	ELECTRICIAN CLASS 2	\N	\N	49cf5912-e16f-430e-9dbc-e85439b62acc	t	2025-12-16 13:04:09.974+02	2025-12-16 13:04:09.974+02
2db13e4e-695f-4517-8edf-b7b45afb7583	SENIOR ELECTRICAL AND INSTRUMENTATION SUPT	\N	\N	49cf5912-e16f-430e-9dbc-e85439b62acc	t	2025-12-16 13:04:09.976+02	2025-12-16 13:04:09.976+02
88b1bdfd-5185-46cf-b966-cd57dd4f271f	CHARGEHAND INSTRUMENTATION	\N	\N	49cf5912-e16f-430e-9dbc-e85439b62acc	t	2025-12-16 13:04:09.978+02	2025-12-16 13:04:09.978+02
830e7b04-e124-4149-ac6d-0d8fcc9deb62	CHARGEHAND ELECTRICAL	\N	\N	49cf5912-e16f-430e-9dbc-e85439b62acc	t	2025-12-16 13:04:09.981+02	2025-12-16 13:04:09.981+02
f09a5995-e608-455e-be56-b299dd76c238	JUNIOR ELECTRICAL ENGINEER	\N	\N	49cf5912-e16f-430e-9dbc-e85439b62acc	t	2025-12-16 13:04:09.984+02	2025-12-16 13:04:09.984+02
d52f0644-25fd-4a39-a6b9-9f3c9c0736d1	ELECTRICAL MANAGER	\N	\N	49cf5912-e16f-430e-9dbc-e85439b62acc	t	2025-12-16 13:04:09.987+02	2025-12-16 13:04:09.987+02
370eadcd-ce1d-4fe3-a6c6-f48ed4d795a9	JUNIOR INSTRUMENTATION ENGINEER	\N	\N	49cf5912-e16f-430e-9dbc-e85439b62acc	t	2025-12-16 13:04:09.989+02	2025-12-16 13:04:09.989+02
d0132b8a-c874-4b2c-80b9-e80f043348ea	INSTRUMENTATION TECHNICIAN	\N	\N	49cf5912-e16f-430e-9dbc-e85439b62acc	t	2025-12-16 13:04:09.992+02	2025-12-16 13:04:09.992+02
78fe5663-4b53-429e-9a59-d7e82c35191e	INSTRUMENTATION TECHNICAN	\N	\N	49cf5912-e16f-430e-9dbc-e85439b62acc	t	2025-12-16 13:04:09.994+02	2025-12-16 13:04:09.994+02
27454dda-f83c-4844-850d-463c6077aed9	ELECTRICIAN ASSISTANT	\N	\N	49cf5912-e16f-430e-9dbc-e85439b62acc	t	2025-12-16 13:04:09.997+02	2025-12-16 13:04:09.997+02
a69d056a-27ba-49a7-8c6f-0c9532673b3c	SEMI- SKILLED ELECTRICIAN	\N	\N	49cf5912-e16f-430e-9dbc-e85439b62acc	t	2025-12-16 13:04:09.999+02	2025-12-16 13:04:09.999+02
3e8130ce-2d36-43f3-9d6a-f95d0d3e755c	ELECTRICAL ASSISTANT	\N	\N	49cf5912-e16f-430e-9dbc-e85439b62acc	t	2025-12-16 13:04:10.001+02	2025-12-16 13:04:10.001+02
3f2e60b1-5bd7-4576-acd9-c44a7ce4fe9f	INSTRUMENTS TECHS ASSISTANT	\N	\N	49cf5912-e16f-430e-9dbc-e85439b62acc	t	2025-12-16 13:04:10.003+02	2025-12-16 13:04:10.003+02
0b5fb3fc-53a4-440e-a01c-48d19ef7ce62	INSTRUMENTATIONS ASSISTANT	\N	\N	49cf5912-e16f-430e-9dbc-e85439b62acc	t	2025-12-16 13:04:10.005+02	2025-12-16 13:04:10.005+02
8a1c8f0b-18e1-4ba4-a435-b4652272c343	FITTER CLASS 1	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	t	2025-12-16 13:04:10.006+02	2025-12-16 13:04:10.006+02
f531b8d6-7315-4952-a34a-91b97d5c3bdd	FITTER CLASS 2	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	t	2025-12-16 13:04:10.008+02	2025-12-16 13:04:10.008+02
69bf06a7-b38a-4bce-b211-105509ac2a2a	DRY PLANT FOREMAN	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	t	2025-12-16 13:04:10.009+02	2025-12-16 13:04:10.009+02
d659dcf0-d192-4f5c-b87a-db693eafcda5	PLUMBER CLASS 1	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	t	2025-12-16 13:04:10.012+02	2025-12-16 13:04:10.012+02
3493baeb-9779-4b29-a0b3-508cb568b1f3	PLUMBER CLASS 2	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	t	2025-12-16 13:04:10.014+02	2025-12-16 13:04:10.014+02
f9a19d21-53da-47d7-8e94-eb5ba6259307	STRUCTURAL FITTING FOREMAN	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	t	2025-12-16 13:04:10.015+02	2025-12-16 13:04:10.015+02
579e1c0d-8570-483e-a9e3-998ebe82cf2b	MAINTENANCE ENGINEER	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	t	2025-12-16 13:04:10.017+02	2025-12-16 13:04:10.017+02
a890e71c-971b-485a-9c44-b0370a6efea7	BELTS MAN	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	t	2025-12-16 13:04:10.018+02	2025-12-16 13:04:10.018+02
82941158-5fa8-489c-b471-6b2b632c9fb8	MECHANICAL MANAGER	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	t	2025-12-16 13:04:10.019+02	2025-12-16 13:04:10.019+02
59ab67d5-ec5a-4e22-8132-b47e070fd73d	ASSISTANT MECHANICAL ENGINEER	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	t	2025-12-16 13:04:10.021+02	2025-12-16 13:04:10.021+02
99fb45b4-2bea-450b-ab5f-55c0aca6b576	JUNIOR MECHANICAL ENGINEER	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	t	2025-12-16 13:04:10.022+02	2025-12-16 13:04:10.022+02
56e941e4-2666-41cb-8322-7af568bf3369	CHARGEHAND	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	t	2025-12-16 13:04:10.024+02	2025-12-16 13:04:10.024+02
dc1843d1-955a-4929-9df3-0f2ca65fac0a	CHARGE HAND FITTING WET PLANT	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	t	2025-12-16 13:04:10.025+02	2025-12-16 13:04:10.025+02
8e3fad1d-e793-4702-ae16-98d9bd7c0507	BOILERMAKER CLASS 1	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	t	2025-12-16 13:04:10.027+02	2025-12-16 13:04:10.027+02
9d5cd3c9-d018-4c85-b863-cec3546813d9	CHARGEHAND BOILERMAKERS	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	t	2025-12-16 13:04:10.028+02	2025-12-16 13:04:10.028+02
fd920717-9312-4b33-9f26-62bf5dee557a	WELDER CLASS 1	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	t	2025-12-16 13:04:10.03+02	2025-12-16 13:04:10.03+02
b7df3fdd-5371-4783-96e4-50702154de0f	BOILER MAKER	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	t	2025-12-16 13:04:10.033+02	2025-12-16 13:04:10.033+02
589ae473-be31-4d27-8d0b-fe1b0fff0b46	CODED WELDER	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	t	2025-12-16 13:04:10.034+02	2025-12-16 13:04:10.034+02
72134660-10fa-43a0-9c66-03177bfefa89	FABRICATION FOREMAN	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	t	2025-12-16 13:04:10.037+02	2025-12-16 13:04:10.037+02
3c6dd029-352f-4918-8e3a-f66bbc4dde86	FITTERS ASSISTANT	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	t	2025-12-16 13:04:10.039+02	2025-12-16 13:04:10.039+02
21ddf069-b877-429e-80b3-5f09616ff850	FITTER ASSISTANT	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	t	2025-12-16 13:04:10.04+02	2025-12-16 13:04:10.04+02
bb634079-a2d5-431a-9a67-dffcde5f4157	PLUMBER ASSISTANT	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	t	2025-12-16 13:04:10.042+02	2025-12-16 13:04:10.042+02
36f99b79-5aa0-4dc0-8706-9ca22a504037	BOILERMAKER ASSISTANT	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	t	2025-12-16 13:04:10.043+02	2025-12-16 13:04:10.043+02
3f692ef0-608c-48f5-8f68-95dd3b660e97	BOILERMAKERS ASSISTANT	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	t	2025-12-16 13:04:10.045+02	2025-12-16 13:04:10.045+02
752ae918-2625-4204-8b5a-c20454cc3cf9	SCAFFOLDER ASSISTANT	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	t	2025-12-16 13:04:10.046+02	2025-12-16 13:04:10.046+02
21794d23-6031-4010-8058-f3ace6626f4b	SCAFFOLDER	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	t	2025-12-16 13:04:10.047+02	2025-12-16 13:04:10.047+02
fe37837f-5d19-47a4-98bf-6dc869bc9306	SEMI SKILLED PAINTER	\N	\N	fbbfd52c-5fa4-4055-985f-be582add4144	t	2025-12-16 13:04:10.049+02	2025-12-16 13:04:10.049+02
eea01d9f-6bce-4e1e-8e3b-52c7bddc7ac3	DRAUGHTSMAN	\N	\N	94ed84a7-76cb-400f-9396-9770e5d0b51a	t	2025-12-16 13:04:10.05+02	2025-12-16 13:04:10.05+02
1bd3f538-0b45-4ce2-87cc-6b776d8ae253	MAINTENANCE PLANNER	\N	\N	94ed84a7-76cb-400f-9396-9770e5d0b51a	t	2025-12-16 13:04:10.052+02	2025-12-16 13:04:10.052+02
ebc1f47c-8947-43ba-bb0c-230f7efd7441	MAINTENANCE MANAGER	\N	\N	94ed84a7-76cb-400f-9396-9770e5d0b51a	t	2025-12-16 13:04:10.053+02	2025-12-16 13:04:10.053+02
99e85d36-6685-4e9d-827f-050cbd28dfb8	PLANNING FOREMAN	\N	\N	94ed84a7-76cb-400f-9396-9770e5d0b51a	t	2025-12-16 13:04:10.054+02	2025-12-16 13:04:10.054+02
02859579-6a21-49e1-8873-0197b7d4737c	JUNIOR PLANNING ENGINEER	\N	\N	94ed84a7-76cb-400f-9396-9770e5d0b51a	t	2025-12-16 13:04:10.055+02	2025-12-16 13:04:10.055+02
78a44413-02f2-4f5b-bf9a-fac917ac1124	PLANNING CLERK	\N	\N	3abc1952-b1e0-4069-a517-75c0706e2721	t	2025-12-16 13:04:10.056+02	2025-12-16 13:04:10.056+02
081d7f22-d95f-4956-beaa-8478c1aa9ef5	CLASS 2 DRIVER	\N	\N	3abc1952-b1e0-4069-a517-75c0706e2721	t	2025-12-16 13:04:10.058+02	2025-12-16 13:04:10.058+02
b2f18726-2c09-44a5-aaae-88773248d6b2	STANDBY DRIVER	\N	\N	3abc1952-b1e0-4069-a517-75c0706e2721	t	2025-12-16 13:04:10.059+02	2025-12-16 13:04:10.059+02
de0ec78a-0872-41cb-82dd-df92f0a7850c	RIGGER CLASS 1	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	t	2025-12-16 13:04:10.061+02	2025-12-16 13:04:10.061+02
6d3b0729-23d0-47db-98c2-593e2bef2f60	TRANSPORT & SERVICES MANAGER	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	t	2025-12-16 13:04:10.062+02	2025-12-16 13:04:10.062+02
9d1fd5d3-7d38-48cd-a9c0-b1966fbef9d5	TRANSPORT AND SERVICES CHARGE HAND	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	t	2025-12-16 13:04:10.064+02	2025-12-16 13:04:10.064+02
9bef3d6f-aab6-4dfb-8389-c52dd9cdbbe4	AUTO ELECTRICIAN CLASS 1	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	t	2025-12-16 13:04:10.066+02	2025-12-16 13:04:10.066+02
b0047157-fc8a-428a-9aae-07c0adac8a71	DIESEL PLANT FITTER	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	t	2025-12-16 13:04:10.067+02	2025-12-16 13:04:10.067+02
c8f7c1e0-14d7-4c38-9431-ffa9dafc4093	TRACTOR DRIVER	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	t	2025-12-16 13:04:10.069+02	2025-12-16 13:04:10.069+02
f328533c-f091-4ae8-8bf2-2c265f34749c	UD TRUCK DRIVER	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	t	2025-12-16 13:04:10.07+02	2025-12-16 13:04:10.07+02
d0e73106-99e4-4399-b8fb-ed9f58f770c8	TLB OPERATOR	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	t	2025-12-16 13:04:10.071+02	2025-12-16 13:04:10.071+02
3fbd9022-5bf7-4b81-81b2-c84c15f2d5f0	EXCAVATOR OPERATOR	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	t	2025-12-16 13:04:10.072+02	2025-12-16 13:04:10.072+02
a7d25710-c3a0-4955-898c-cb700dc12ae6	FRONT END LOADER OPERATOR	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	t	2025-12-16 13:04:10.073+02	2025-12-16 13:04:10.073+02
0bbc555e-d8ad-45fd-a3e3-3e06a333f2d0	FEL OPERATOR	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	t	2025-12-16 13:04:10.075+02	2025-12-16 13:04:10.075+02
8e2645fc-fa1a-45f6-954e-266155e9286c	CRANE OPERATOR	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	t	2025-12-16 13:04:10.076+02	2025-12-16 13:04:10.076+02
3bab5434-031a-4963-8a3b-d3b08475ba42	MOBIL CRANE OPERATOR	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	t	2025-12-16 13:04:10.077+02	2025-12-16 13:04:10.077+02
83eadf52-f600-4267-aecb-c01826cd6767	BUS DRIVER	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	t	2025-12-16 13:04:10.079+02	2025-12-16 13:04:10.079+02
7a7b84a4-486b-4e71-b8da-a7e7e329694b	CLASS 1 BUS DRIVER	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	t	2025-12-16 13:04:10.081+02	2025-12-16 13:04:10.081+02
ceb61d21-5ad0-4301-84b6-764f05b14640	UD CLASS 2 DRIVER	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	t	2025-12-16 13:04:10.083+02	2025-12-16 13:04:10.083+02
d46b6b8f-9002-4239-88f3-73a9e4df0612	TELEHANDLER OPERATOR	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	t	2025-12-16 13:04:10.085+02	2025-12-16 13:04:10.085+02
4e35a316-55e0-411e-b7a7-654bec12fec1	ASSISTANT PLUMBER	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	t	2025-12-16 13:04:10.086+02	2025-12-16 13:04:10.086+02
98ea4a46-2240-40de-8d3e-cd9377253075	PLUMBERS ASSISTANT	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	t	2025-12-16 13:04:10.088+02	2025-12-16 13:04:10.088+02
6d1f5aa6-d649-4f33-bfa7-73e58ea30293	SEMI SKILLED PLUMBER	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	t	2025-12-16 13:04:10.089+02	2025-12-16 13:04:10.089+02
1357c5f4-10b7-4ac6-aa20-67d971ad705b	WORKSHOP ASSISTANT	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	t	2025-12-16 13:04:10.092+02	2025-12-16 13:04:10.092+02
b20ff8aa-e703-4812-aaa0-96ab4fd77e57	WORKSHOP CLERK	\N	\N	46bc90ce-db95-4d9a-b895-8bc06c0fb0df	t	2025-12-16 13:04:10.093+02	2025-12-16 13:04:10.093+02
80680f2f-6239-470c-9467-57d1e6a8542d	CIVIL ENGINEER	\N	\N	2d6cfca3-62e2-483e-a808-b22057f2c39f	t	2025-12-16 13:04:10.095+02	2025-12-16 13:04:10.095+02
5172b454-a55d-47e0-bb70-bbc56e3f00d6	CIVIL TECHNICIAN TSF	\N	\N	2d6cfca3-62e2-483e-a808-b22057f2c39f	t	2025-12-16 13:04:10.097+02	2025-12-16 13:04:10.097+02
f35b7fa2-ddd8-42a4-8147-768c710c82c3	TEAM LEADER	\N	\N	2d6cfca3-62e2-483e-a808-b22057f2c39f	t	2025-12-16 13:04:10.099+02	2025-12-16 13:04:10.099+02
0738f426-6126-4ff1-adf8-6ee9825199e6	DRIVER	\N	\N	2d6cfca3-62e2-483e-a808-b22057f2c39f	t	2025-12-16 13:04:10.1+02	2025-12-16 13:04:10.1+02
70df16fc-c911-4758-9d4f-3b095dd4bb22	CLASS 4 DRIVER	\N	\N	2d6cfca3-62e2-483e-a808-b22057f2c39f	t	2025-12-16 13:04:10.102+02	2025-12-16 13:04:10.102+02
584780da-81b7-48a9-8f11-4517d6b17cf6	MINING ENGINEER	\N	\N	c9ddfe4e-3356-4c51-b917-b07321fbfc00	t	2025-12-16 13:04:10.103+02	2025-12-16 13:04:10.103+02
2fc29e02-6bbc-4248-8089-a650f68d8c37	SENIOR MINING ENGINEER	\N	\N	c9ddfe4e-3356-4c51-b917-b07321fbfc00	t	2025-12-16 13:04:10.105+02	2025-12-16 13:04:10.105+02
f6b29a77-7a62-4cac-9575-b05ab4424793	SENIOR PIT SUPERINTENDENT	\N	\N	c9ddfe4e-3356-4c51-b917-b07321fbfc00	t	2025-12-16 13:04:10.106+02	2025-12-16 13:04:10.106+02
3b19fc64-81b3-4d21-9d1c-d767e55433df	PIT SUPERINTENDENT	\N	\N	c9ddfe4e-3356-4c51-b917-b07321fbfc00	t	2025-12-16 13:04:10.108+02	2025-12-16 13:04:10.108+02
cb7dc4a7-6435-4512-ba8a-5c4d57a198c8	JUNIOR PIT SUPERINTENDENT	\N	\N	c9ddfe4e-3356-4c51-b917-b07321fbfc00	t	2025-12-16 13:04:10.109+02	2025-12-16 13:04:10.109+02
0f70a630-de93-4a1b-937d-a4fa608d7d35	MINING MANAGER	\N	\N	c9ddfe4e-3356-4c51-b917-b07321fbfc00	t	2025-12-16 13:04:10.111+02	2025-12-16 13:04:10.111+02
b771a695-324e-4566-95a8-32168480a11f	EXPLORATION GEOLOGICAL TECHNICIAN	\N	\N	fa570fb8-b13c-4fe5-8da9-e49f7f01dede	t	2025-12-16 13:04:10.112+02	2025-12-16 13:04:10.112+02
10c33b51-1f0c-4ae1-9de5-43616a5b50fc	EXPLORATION PROJECT MANAGER	\N	\N	fa570fb8-b13c-4fe5-8da9-e49f7f01dede	t	2025-12-16 13:04:10.113+02	2025-12-16 13:04:10.113+02
42cfe725-d976-42ed-a407-f6492148d91f	EXPLORATION GEOLOGIST	\N	\N	fa570fb8-b13c-4fe5-8da9-e49f7f01dede	t	2025-12-16 13:04:10.115+02	2025-12-16 13:04:10.115+02
9f81d9ab-7cd4-427c-bac9-13c6afd0b65d	DATABASE ADMINISTRATOR	\N	\N	fa570fb8-b13c-4fe5-8da9-e49f7f01dede	t	2025-12-16 13:04:10.117+02	2025-12-16 13:04:10.117+02
25339f27-36db-4cc3-b220-8a832a22d632	GEOLOGICAL TECHNICIAN	\N	\N	fa570fb8-b13c-4fe5-8da9-e49f7f01dede	t	2025-12-16 13:04:10.118+02	2025-12-16 13:04:10.118+02
a8ecbecd-62bf-4feb-a102-9594c2b5bea7	RESIDENT GEOLOGIST	\N	\N	fa570fb8-b13c-4fe5-8da9-e49f7f01dede	t	2025-12-16 13:04:10.12+02	2025-12-16 13:04:10.12+02
6b518870-7023-4060-85e3-019f85db57f3	JUNIOR GEOLOGIST	\N	\N	fa570fb8-b13c-4fe5-8da9-e49f7f01dede	t	2025-12-16 13:04:10.121+02	2025-12-16 13:04:10.121+02
edf91274-51de-419e-b782-95e0b2f1bb80	GEOLOGIST	\N	\N	fa570fb8-b13c-4fe5-8da9-e49f7f01dede	t	2025-12-16 13:04:10.124+02	2025-12-16 13:04:10.124+02
af2eab91-cc41-44f5-ab9f-7894cf0f013a	CORE SHED ATTENDANT	\N	\N	fa570fb8-b13c-4fe5-8da9-e49f7f01dede	t	2025-12-16 13:04:10.126+02	2025-12-16 13:04:10.126+02
16427f1f-650e-4d57-a915-4c73390ae4a4	TRAINEE GEO TECH	\N	\N	fa570fb8-b13c-4fe5-8da9-e49f7f01dede	t	2025-12-16 13:04:10.127+02	2025-12-16 13:04:10.127+02
2fafe9b0-fafb-475c-9a40-5d7a0f1ad73f	SAMPLER	\N	\N	fa570fb8-b13c-4fe5-8da9-e49f7f01dede	t	2025-12-16 13:04:10.129+02	2025-12-16 13:04:10.129+02
8426454b-de6a-46dc-852c-884838f33aa5	SAMPLER RC DRILLING	\N	\N	fa570fb8-b13c-4fe5-8da9-e49f7f01dede	t	2025-12-16 13:04:10.131+02	2025-12-16 13:04:10.131+02
733ddd8e-5cbb-4719-ba60-253d93efb3fb	SAMPLER (RC DRILLING)	\N	\N	fa570fb8-b13c-4fe5-8da9-e49f7f01dede	t	2025-12-16 13:04:10.132+02	2025-12-16 13:04:10.132+02
505c5548-3c53-4ce6-a459-f41ca71f8304	RC SAMPLER	\N	\N	fa570fb8-b13c-4fe5-8da9-e49f7f01dede	t	2025-12-16 13:04:10.134+02	2025-12-16 13:04:10.134+02
dad5fa37-b33e-40a7-ad7c-4de2e0243f91	DATA CAPTURE CLERK	\N	\N	fa570fb8-b13c-4fe5-8da9-e49f7f01dede	t	2025-12-16 13:04:10.135+02	2025-12-16 13:04:10.135+02
bef7c808-e9bb-41d7-b9de-27bf67927de0	DRILL RIG ASSISTANT	\N	\N	fa570fb8-b13c-4fe5-8da9-e49f7f01dede	t	2025-12-16 13:04:10.137+02	2025-12-16 13:04:10.137+02
2f0578d8-2f1a-4105-bda2-1a092d1be687	GEOTECHNICAL ENGINEERING TECHNICIAN	\N	\N	8581817b-a52e-4214-9326-bef9028675e6	t	2025-12-16 13:04:10.138+02	2025-12-16 13:04:10.138+02
10d7cd99-0f39-4485-ba0e-f15bc3d8fa19	GEOTECHNICAL ENGINEER	\N	\N	8581817b-a52e-4214-9326-bef9028675e6	t	2025-12-16 13:04:10.14+02	2025-12-16 13:04:10.14+02
76acbf4e-6abf-4bfd-965a-516407f8a8dd	MINE PLANNING SUPERINTENDENT	\N	\N	3abc1952-b1e0-4069-a517-75c0706e2721	t	2025-12-16 13:04:10.141+02	2025-12-16 13:04:10.141+02
12960978-fe6f-454d-9a3f-73ed2dfc2109	MINING TECHNICAL SERVICES MANAGER	\N	\N	3abc1952-b1e0-4069-a517-75c0706e2721	t	2025-12-16 13:04:10.143+02	2025-12-16 13:04:10.143+02
968f5e62-467f-4a31-b976-0f66228c93a9	JUNIOR MINE PLANNING ENGINEER	\N	\N	3abc1952-b1e0-4069-a517-75c0706e2721	t	2025-12-16 13:04:10.144+02	2025-12-16 13:04:10.144+02
bb46fc2d-99bd-4c64-8c8c-7ade70f57efb	MINE PLANNING ENGINEER	\N	\N	3abc1952-b1e0-4069-a517-75c0706e2721	t	2025-12-16 13:04:10.146+02	2025-12-16 13:04:10.146+02
097ff8e7-d404-4cfc-9177-ef9e9e77a0e8	SURVEYOR	\N	\N	79981ee7-9928-4667-aac4-59cba3a31ddc	t	2025-12-16 13:04:10.148+02	2025-12-16 13:04:10.148+02
fc3a2826-d1ea-489b-9e83-279eef82abf3	CHIEF SURVEYOR	\N	\N	79981ee7-9928-4667-aac4-59cba3a31ddc	t	2025-12-16 13:04:10.15+02	2025-12-16 13:04:10.15+02
392b8957-2899-4511-9d54-2f3da35092c6	SENIOR SURVEYOR	\N	\N	79981ee7-9928-4667-aac4-59cba3a31ddc	t	2025-12-16 13:04:10.152+02	2025-12-16 13:04:10.152+02
e7e6f7b9-8ffd-47a4-bd11-5753a59654c7	SURVEY ASSISTANT	\N	\N	79981ee7-9928-4667-aac4-59cba3a31ddc	t	2025-12-16 13:04:10.153+02	2025-12-16 13:04:10.153+02
6f42442c-12c3-4f8f-874c-0364e2ac7494	METALLURGICAL TECHNICIAN	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	t	2025-12-16 13:04:10.154+02	2025-12-16 13:04:10.154+02
45acd4c6-436f-4dfd-9a40-cedab985e14d	PLANT PRODUCTION SUPERINTENDENT	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	t	2025-12-16 13:04:10.156+02	2025-12-16 13:04:10.156+02
3e68b871-0d8b-4ed5-aa07-46b46b96cafe	METALLURGICAL SUPERINTENDENT	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	t	2025-12-16 13:04:10.157+02	2025-12-16 13:04:10.157+02
279413bf-77a2-40c3-af1c-b92fe5abe28d	PROCESS CONTROL SUPERVISOR	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	t	2025-12-16 13:04:10.16+02	2025-12-16 13:04:10.16+02
e7ed4312-cc0f-4145-ad7b-df493c6f8caa	METALLURGICAL ENGINEER	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	t	2025-12-16 13:04:10.162+02	2025-12-16 13:04:10.162+02
789c3fcf-014f-4aa8-88c1-9fcd8df55445	PROCESS CONTROL METALLURGIST	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	t	2025-12-16 13:04:10.164+02	2025-12-16 13:04:10.164+02
55422d16-d1e7-4f4c-ad3e-ba54d4d2c703	PLANT LABORATORY METALLURGIST	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	t	2025-12-16 13:04:10.166+02	2025-12-16 13:04:10.166+02
d6c215a5-ebe5-4e65-9b0a-be47c043afaf	PLANT LABORATORY TECHNICIAN	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	t	2025-12-16 13:04:10.168+02	2025-12-16 13:04:10.168+02
676b82b0-f1ed-480f-84ed-206e537cb2db	PLANT LABORATORY MET TECHNICIAN	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	t	2025-12-16 13:04:10.169+02	2025-12-16 13:04:10.169+02
11601d80-e543-4fb3-b2e9-44e3f288a276	PROCESSING SYSTEMS ANALYST	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	t	2025-12-16 13:04:10.17+02	2025-12-16 13:04:10.17+02
30a411f0-e148-4def-9ffc-623336f1b355	PLANT SUPERVISOR	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	t	2025-12-16 13:04:10.172+02	2025-12-16 13:04:10.172+02
ffd7c3d7-513b-495f-a821-0a69ca4d48ce	PROCESSING MANAGER	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	t	2025-12-16 13:04:10.173+02	2025-12-16 13:04:10.173+02
e38e1f8e-7395-48d2-bbe8-0ea754632082	TSF SUPERVISOR	\N	\N	dfc967c3-6d9d-48e7-b6b7-d44ddcf46b02	t	2025-12-16 13:04:10.174+02	2025-12-16 13:04:10.174+02
543f2fcf-9bfd-457a-92b9-6e110ce4056a	PLANT MANAGER	\N	\N	dfc967c3-6d9d-48e7-b6b7-d44ddcf46b02	t	2025-12-16 13:04:10.176+02	2025-12-16 13:04:10.176+02
034e0526-f357-4057-8d58-48fa7e1c6e78	CIL ASSISTANT	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	t	2025-12-16 13:04:10.177+02	2025-12-16 13:04:10.177+02
15ab175a-a09f-4232-8289-8092281fed17	CIL OPERATOR	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	t	2025-12-16 13:04:10.178+02	2025-12-16 13:04:10.178+02
855a6e1d-c0ed-4013-9d31-457721787ed7	GENERAL ASSISTANT CIL	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	t	2025-12-16 13:04:10.18+02	2025-12-16 13:04:10.18+02
91d11785-69e8-402f-beae-badf3c33d6e5	RELIEF CREW ASSISTANT	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	t	2025-12-16 13:04:10.181+02	2025-12-16 13:04:10.181+02
566f4ae8-e153-48e9-8197-08b0944e8ad6	LEAVE RELIEF CREW	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	t	2025-12-16 13:04:10.183+02	2025-12-16 13:04:10.183+02
ed8cfe44-01e5-46d1-8f4a-14bfcde0d59a	GENERAL PLANT ATTENDANT	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	t	2025-12-16 13:04:10.185+02	2025-12-16 13:04:10.185+02
f5a78c96-34e3-4548-bfe7-7b803917eec0	GENERAL PLANT ASSISTANT	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	t	2025-12-16 13:04:10.186+02	2025-12-16 13:04:10.186+02
298ac7f4-f8c4-496e-bd8f-1f5457d6efa2	ELUTION & REAGENTS ASSIST	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	t	2025-12-16 13:04:10.188+02	2025-12-16 13:04:10.188+02
b4c1ca83-8488-4ad1-a2c3-3f318e02c712	ELUTION OPERATOR	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	t	2025-12-16 13:04:10.189+02	2025-12-16 13:04:10.189+02
78e8fba6-243f-4c73-a8fd-5f3b6e3a3822	ELUTION ASSISTANT	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	t	2025-12-16 13:04:10.19+02	2025-12-16 13:04:10.19+02
a7b7694d-11fa-4138-bb85-58af18facc54	BALLMILL ASSISTANT	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	t	2025-12-16 13:04:10.191+02	2025-12-16 13:04:10.191+02
32083df7-2d08-49ff-84ac-150f79791748	GENERAL MILL ASSISTANT	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	t	2025-12-16 13:04:10.192+02	2025-12-16 13:04:10.192+02
5bffc26c-380a-4919-91b5-e16927fea0e9	MILL OPERATOR	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	t	2025-12-16 13:04:10.194+02	2025-12-16 13:04:10.194+02
889651de-1875-4128-9fdd-69eb7ab17c77	HOUSE KEEPING ASSISTANT	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	t	2025-12-16 13:04:10.195+02	2025-12-16 13:04:10.195+02
a560feb8-59a2-45ad-84d8-20978bc58541	PLANT LAB ATTENDANT	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	t	2025-12-16 13:04:10.197+02	2025-12-16 13:04:10.197+02
b16964ff-7d20-490e-9ffb-0f4741a4772b	METALLURGICAL CLERK	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	t	2025-12-16 13:04:10.199+02	2025-12-16 13:04:10.199+02
33a7f161-7c92-4c89-bc5f-68af16aed563	PRIMARY CRUSHER OPERATOR	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	t	2025-12-16 13:04:10.2+02	2025-12-16 13:04:10.2+02
2fe0031b-4d64-4a3b-9f12-503ba3947fa3	PRIMARY CRUSHING OPERATOR	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	t	2025-12-16 13:04:10.202+02	2025-12-16 13:04:10.202+02
4955cab1-674b-4da2-ab64-93a484797453	PRIMARY CRUSHER ATTENDANT	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	t	2025-12-16 13:04:10.204+02	2025-12-16 13:04:10.204+02
fb0544f9-4a28-4032-befb-0face3e9efc6	THICKENER OPERATOR	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	t	2025-12-16 13:04:10.205+02	2025-12-16 13:04:10.205+02
6c80c3f2-c55e-4d7f-bc59-206f09167851	REAGENTS & SMELTING CONTROLLER	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	t	2025-12-16 13:04:10.206+02	2025-12-16 13:04:10.206+02
d5b6101f-41e7-4489-97b0-8a25b6d8331a	REAGENTS & SMELTING ASSISTANT	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	t	2025-12-16 13:04:10.208+02	2025-12-16 13:04:10.208+02
2881e9e3-65f8-4707-b612-be0b7b62546e	SECONDARY & TERTIARY CRUSHER OPERATOR	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	t	2025-12-16 13:04:10.21+02	2025-12-16 13:04:10.21+02
85b9637a-0768-490a-84ea-5b25822afac6	GENERAL SECONDARY & TERTIARY CRUSHING ASSIST	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	t	2025-12-16 13:04:10.212+02	2025-12-16 13:04:10.212+02
40647015-5ba0-49bb-bb8a-00b7630cd720	TAILINGS STORAGE FACILITY OPERATOR	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	t	2025-12-16 13:04:10.213+02	2025-12-16 13:04:10.213+02
b6179d05-618d-4868-b987-2e8ee22b34e7	TAILINGS STORAGE FACILITY ASSIST	\N	\N	5944432b-5987-46de-a2be-5e1f338014ce	t	2025-12-16 13:04:10.215+02	2025-12-16 13:04:10.215+02
582201fe-29e5-4bcb-acaa-81f27a6413c9	GENERAL MANAGER	\N	\N	96d7a388-f0f6-4078-a5ea-e2efea09bdca	t	2025-12-16 13:04:10.217+02	2025-12-16 13:04:10.217+02
3a833193-4c32-4423-8dd1-068648feaf84	SHARED SERVICES MANAGER	\N	\N	96d7a388-f0f6-4078-a5ea-e2efea09bdca	t	2025-12-16 13:04:10.218+02	2025-12-16 13:04:10.218+02
6dcd99f9-3b98-4f0c-bff8-6c9c82815df8	BUSINESS IMPROVEMENT MANAGER	\N	\N	96d7a388-f0f6-4078-a5ea-e2efea09bdca	t	2025-12-16 13:04:10.22+02	2025-12-16 13:04:10.22+02
036f5aff-b729-4cf1-acfb-0c6128500810	BUSINESS IMPROVEMENT OFFICER	\N	\N	96d7a388-f0f6-4078-a5ea-e2efea09bdca	t	2025-12-16 13:04:10.221+02	2025-12-16 13:04:10.221+02
709a888d-ab11-49f5-bed7-6b79d4f1ccd3	BOME HOUSES CONSTRUCTION SUPERVISOR	\N	\N	5c7eb5a5-ed24-46bf-ba13-61fe4a2c1fa4	t	2025-12-16 13:04:10.223+02	2025-12-16 13:04:10.223+02
fd265ea9-19ee-47ce-a133-8348b46b5dca	COMMUNITY RELATIONS COORDINATOR	\N	\N	5c7eb5a5-ed24-46bf-ba13-61fe4a2c1fa4	t	2025-12-16 13:04:10.224+02	2025-12-16 13:04:10.224+02
1e6fed25-4754-4d87-9e36-9fb69ce223ec	ASSISTANT COMMUNITY RELATIONS OFFICER	\N	\N	5c7eb5a5-ed24-46bf-ba13-61fe4a2c1fa4	t	2025-12-16 13:04:10.226+02	2025-12-16 13:04:10.226+02
189fa3a5-70b1-444e-8008-9a20292fd262	COMMUNITY RELATIONS OFFICER	\N	\N	5c7eb5a5-ed24-46bf-ba13-61fe4a2c1fa4	t	2025-12-16 13:04:10.227+02	2025-12-16 13:04:10.227+02
d39efc53-26c6-4092-aece-f37351be4cc9	BOOK KEEPER	\N	\N	e3a72f1c-88a2-4bc2-8c56-4bc99819e288	t	2025-12-16 13:04:10.228+02	2025-12-16 13:04:10.228+02
ffc4e2e7-c929-4bc0-9f77-41edfc96ea92	FINANCE & ADMINISTRATION MANAGER	\N	\N	e3a72f1c-88a2-4bc2-8c56-4bc99819e288	t	2025-12-16 13:04:10.23+02	2025-12-16 13:04:10.23+02
f4782a3b-ea0f-4922-b309-5ac3b8273d74	ASSISTANT ACCOUNTANT	\N	\N	e3a72f1c-88a2-4bc2-8c56-4bc99819e288	t	2025-12-16 13:04:10.232+02	2025-12-16 13:04:10.232+02
1a4f824a-cc77-4633-83e8-80df2c24d6bc	HUMAN CAPITAL SUPPORT SERVICES MANAGER	\N	\N	eddee19c-15aa-4b45-947b-505fb6170f25	t	2025-12-16 13:04:10.234+02	2025-12-16 13:04:10.234+02
27746636-a463-418c-a9c6-18923873841f	HR ADMINISTRATOR	\N	\N	eddee19c-15aa-4b45-947b-505fb6170f25	t	2025-12-16 13:04:10.236+02	2025-12-16 13:04:10.236+02
fd785264-8a40-4115-8892-a7010ab5319d	HUMAN RESOURCES ASSISTANT	\N	\N	eddee19c-15aa-4b45-947b-505fb6170f25	t	2025-12-16 13:04:10.237+02	2025-12-16 13:04:10.237+02
9e86e2cb-6877-49b3-80ef-3e86b5d11c3b	HUMAN RESOURCES SUPERINTENDENT	\N	\N	eddee19c-15aa-4b45-947b-505fb6170f25	t	2025-12-16 13:04:10.238+02	2025-12-16 13:04:10.238+02
4eb0b83f-8975-4f14-b594-dd1d1083f70c	IT OFFICER	\N	\N	cb578a83-35f3-4456-ac28-268691ef036e	t	2025-12-16 13:04:10.24+02	2025-12-16 13:04:10.24+02
05bf1a83-a00a-49c8-834c-0f38999224ff	IT SUPERINTENDENT	\N	\N	cb578a83-35f3-4456-ac28-268691ef036e	t	2025-12-16 13:04:10.241+02	2025-12-16 13:04:10.241+02
690c4a74-1c53-4a55-af68-8bbdd94e1f3d	SUPPORT TECHNICIAN	\N	\N	cb578a83-35f3-4456-ac28-268691ef036e	t	2025-12-16 13:04:10.242+02	2025-12-16 13:04:10.242+02
d96fa97a-a49e-4f7c-a9c8-615fa5beb6a0	SECURITY OFFICER	\N	\N	6b72e8dd-f8ee-4c2a-8e44-ea44e4794041	t	2025-12-16 13:04:10.243+02	2025-12-16 13:04:10.243+02
a44a4ebd-cec8-43ba-88e5-25950349da33	SECURITY MANAGER	\N	\N	6b72e8dd-f8ee-4c2a-8e44-ea44e4794041	t	2025-12-16 13:04:10.245+02	2025-12-16 13:04:10.245+02
0858a6fb-ea68-4dc8-beb4-92f568988eaa	CCTV OPERATOR	\N	\N	6b72e8dd-f8ee-4c2a-8e44-ea44e4794041	t	2025-12-16 13:04:10.246+02	2025-12-16 13:04:10.246+02
2d7efe45-8cff-4daf-a12c-5e8798725042	SHE MANAGER	\N	\N	b11dd169-6f33-44d4-91c1-c64c41c36038	t	2025-12-16 13:04:10.248+02	2025-12-16 13:04:10.248+02
4177c27d-8f41-40eb-b504-6d9c0be18625	SHE OFFICER PLANT	\N	\N	b11dd169-6f33-44d4-91c1-c64c41c36038	t	2025-12-16 13:04:10.249+02	2025-12-16 13:04:10.249+02
76e30c9e-5c8f-4ca2-b103-035eacb0061a	ENVIRONMENTAL & HYGIENE OFFICER	\N	\N	b11dd169-6f33-44d4-91c1-c64c41c36038	t	2025-12-16 13:04:10.251+02	2025-12-16 13:04:10.251+02
fb9e9f19-e712-46c1-a15a-e31f82e85bdb	SHE ADMINISTRATOR	\N	\N	b11dd169-6f33-44d4-91c1-c64c41c36038	t	2025-12-16 13:04:10.252+02	2025-12-16 13:04:10.252+02
27507348-8d85-465c-9f4d-eb2de330f6c6	SHEQ SUPERINTENDENT	\N	\N	b11dd169-6f33-44d4-91c1-c64c41c36038	t	2025-12-16 13:04:10.255+02	2025-12-16 13:04:10.255+02
1b0fa5f6-26af-4ff8-95e4-f6082215843f	SHEQ AND ENVIRONMENTAL OFFICER	\N	\N	b11dd169-6f33-44d4-91c1-c64c41c36038	t	2025-12-16 13:04:10.256+02	2025-12-16 13:04:10.256+02
0d76c3b6-ad7b-42ae-a891-2e1a6963a6ec	SHE ASSISTANT	\N	\N	b11dd169-6f33-44d4-91c1-c64c41c36038	t	2025-12-16 13:04:10.257+02	2025-12-16 13:04:10.257+02
6b62b2ff-93ba-4fbd-91be-5973fdb93d20	FIRST AID TRAINER	\N	\N	b11dd169-6f33-44d4-91c1-c64c41c36038	t	2025-12-16 13:04:10.259+02	2025-12-16 13:04:10.259+02
fcf4ae2f-46cc-4986-a35e-3a900f144ab8	SITE COORDINATION OFFICER	\N	\N	0a7efdc6-3068-41ae-8813-a1247c2124f2	t	2025-12-16 13:04:10.26+02	2025-12-16 13:04:10.26+02
a0d2c1c1-71d3-41df-a41b-82571805518b	CATERING AND HOUSEKEEPING SUPERVISOR	\N	\N	0a7efdc6-3068-41ae-8813-a1247c2124f2	t	2025-12-16 13:04:10.261+02	2025-12-16 13:04:10.261+02
718b6f05-a279-4546-a60e-fb56474528ee	CHEF	\N	\N	0a7efdc6-3068-41ae-8813-a1247c2124f2	t	2025-12-16 13:04:10.262+02	2025-12-16 13:04:10.262+02
5fe85b21-e124-4a04-ac23-4554ab0096a4	HANDYMAN	\N	\N	0a7efdc6-3068-41ae-8813-a1247c2124f2	t	2025-12-16 13:04:10.264+02	2025-12-16 13:04:10.264+02
29512386-8914-47ea-86bc-930440a54d97	WELFARE WORKER	\N	\N	0a7efdc6-3068-41ae-8813-a1247c2124f2	t	2025-12-16 13:04:10.265+02	2025-12-16 13:04:10.265+02
666e942a-d1cb-4702-8f0d-90e00c03f593	COOK	\N	\N	0a7efdc6-3068-41ae-8813-a1247c2124f2	t	2025-12-16 13:04:10.267+02	2025-12-16 13:04:10.267+02
43da824f-d0c4-460a-8078-60f51cd4791d	TEAM LEADER HOUSEKEEPING	\N	\N	0a7efdc6-3068-41ae-8813-a1247c2124f2	t	2025-12-16 13:04:10.268+02	2025-12-16 13:04:10.268+02
3fefd9f5-29cd-43fe-8319-df74b22f59be	HOUSEKEEPER	\N	\N	0a7efdc6-3068-41ae-8813-a1247c2124f2	t	2025-12-16 13:04:10.269+02	2025-12-16 13:04:10.269+02
aeefef6f-544d-4ca5-9776-99d3052b4b22	HOUSE KEEPER	\N	\N	0a7efdc6-3068-41ae-8813-a1247c2124f2	t	2025-12-16 13:04:10.27+02	2025-12-16 13:04:10.27+02
31f0669b-27e1-4baa-baa3-1cddc6056b0f	LAUNDRY ATTENDANT	\N	\N	0a7efdc6-3068-41ae-8813-a1247c2124f2	t	2025-12-16 13:04:10.272+02	2025-12-16 13:04:10.272+02
a247dffd-d4d8-41c9-8a23-6ed0411dfaea	KITCHEN PORTER	\N	\N	0a7efdc6-3068-41ae-8813-a1247c2124f2	t	2025-12-16 13:04:10.273+02	2025-12-16 13:04:10.273+02
95e05bc4-555d-4c25-a47a-516bfd0fd5d5	ISSUING OFFICER	\N	\N	b8fc0096-6d33-4564-bdca-9a5aa455de19	t	2025-12-16 13:04:10.275+02	2025-12-16 13:04:10.275+02
53807579-7366-4e68-86db-5131d1e02f57	ASSISTANT EXPEDITER	\N	\N	b8fc0096-6d33-4564-bdca-9a5aa455de19	t	2025-12-16 13:04:10.276+02	2025-12-16 13:04:10.276+02
3bc01602-f307-4fd0-8f36-c72cff13eff3	STORES CONTROLLER	\N	\N	b8fc0096-6d33-4564-bdca-9a5aa455de19	t	2025-12-16 13:04:10.277+02	2025-12-16 13:04:10.277+02
33394210-a5fd-4c6c-9868-68a4e133e580	STORES MANAGER	\N	\N	b8fc0096-6d33-4564-bdca-9a5aa455de19	t	2025-12-16 13:04:10.279+02	2025-12-16 13:04:10.279+02
d7c4474f-dff6-4abe-af02-9757a744a372	RECEIVING OFFICER	\N	\N	b8fc0096-6d33-4564-bdca-9a5aa455de19	t	2025-12-16 13:04:10.28+02	2025-12-16 13:04:10.28+02
326ab03b-c787-48e2-80a1-fcab4b3b5225	PYLOG ADMINISTRATOR	\N	\N	b8fc0096-6d33-4564-bdca-9a5aa455de19	t	2025-12-16 13:04:10.282+02	2025-12-16 13:04:10.282+02
ceb90d63-f953-4a58-821c-63405afafbd1	SENIOR STORES CLERK	\N	\N	b8fc0096-6d33-4564-bdca-9a5aa455de19	t	2025-12-16 13:04:10.284+02	2025-12-16 13:04:10.284+02
8631cad3-35c2-41d0-a167-b782a172880c	STORES CLERK	\N	\N	b8fc0096-6d33-4564-bdca-9a5aa455de19	t	2025-12-16 13:04:10.285+02	2025-12-16 13:04:10.285+02
8822c29b-266c-4239-958d-4b03dfa2465c	STOREKEEPER	\N	\N	b8fc0096-6d33-4564-bdca-9a5aa455de19	t	2025-12-16 13:04:10.287+02	2025-12-16 13:04:10.287+02
61f9b26c-453f-4a59-a191-3043700ef3c7	GRADUATE TRAINEE	\N	\N	b30c7026-796a-4dc7-89fd-48dc74c0d9c2	t	2025-12-16 13:04:10.288+02	2025-12-16 13:04:10.288+02
07f124bb-3051-4db2-818d-28604a9c89ca	GRADUATE TRAINEE METALLURGY	\N	\N	b30c7026-796a-4dc7-89fd-48dc74c0d9c2	t	2025-12-16 13:04:10.289+02	2025-12-16 13:04:10.289+02
033922e2-24f2-4e33-8991-95b057d9b286	ASSAY LABORATORY TECHNICIAN TRAINEE	\N	\N	b30c7026-796a-4dc7-89fd-48dc74c0d9c2	t	2025-12-16 13:04:10.291+02	2025-12-16 13:04:10.291+02
9c64b0e5-30b6-42c2-892c-49c4b338850b	SHEQ GRADUATE TRAINEE	\N	\N	b30c7026-796a-4dc7-89fd-48dc74c0d9c2	t	2025-12-16 13:04:10.292+02	2025-12-16 13:04:10.292+02
c892baa0-afa6-4f2b-911f-90b28bcadd09	GRADUATE TRAINEE MINING	\N	\N	b30c7026-796a-4dc7-89fd-48dc74c0d9c2	t	2025-12-16 13:04:10.293+02	2025-12-16 13:04:10.293+02
f7fc4e5d-a6da-481f-a44b-32a660abeb5e	TRAINING AND DEVELOPMENT OFFICER	\N	\N	b30c7026-796a-4dc7-89fd-48dc74c0d9c2	t	2025-12-16 13:04:10.295+02	2025-12-16 13:04:10.295+02
b9a22d64-3daf-4e78-b70f-985b445c2fdd	GT MECHANICAL ENGINEERING	\N	\N	b30c7026-796a-4dc7-89fd-48dc74c0d9c2	t	2025-12-16 13:04:10.297+02	2025-12-16 13:04:10.297+02
fb5cd08d-27ce-4823-9666-08e2e4442ac4	GRADUATE TRAINEE ACCOUNTING	\N	\N	b30c7026-796a-4dc7-89fd-48dc74c0d9c2	t	2025-12-16 13:04:10.298+02	2025-12-16 13:04:10.298+02
0e4a9459-df62-4eae-bd7b-662cf6d75454	APPRENTICE	\N	\N	b30c7026-796a-4dc7-89fd-48dc74c0d9c2	t	2025-12-16 13:04:10.3+02	2025-12-16 13:04:10.3+02
501b8d98-36a6-4d82-98d7-9b45b0ee935d	APPRENTICE BOILERMAKER	\N	\N	b30c7026-796a-4dc7-89fd-48dc74c0d9c2	t	2025-12-16 13:04:10.302+02	2025-12-16 13:04:10.302+02
fefbf76b-2d9d-407e-9155-eed753d8c568	STUDENT ON ATTACHEMENT	\N	\N	b30c7026-796a-4dc7-89fd-48dc74c0d9c2	t	2025-12-16 13:04:10.303+02	2025-12-16 13:04:10.303+02
a4b3c28b-9614-431b-8333-ffa14713deac	STUDENT ON ATTACHMENT	\N	\N	b30c7026-796a-4dc7-89fd-48dc74c0d9c2	t	2025-12-16 13:04:10.304+02	2025-12-16 13:04:10.304+02
4950ce56-5ffe-47c2-b1c6-832a791fe4ca	WAREHOUSE ASSISTANT	\N	\N	e433f419-8e6f-4d86-8eb5-241768ab5cfb	t	2025-12-16 13:04:10.305+02	2025-12-16 13:04:10.305+02
443d550c-bdab-48d6-b4f0-90a8c7b6440e	OFFICE CLEANER	\N	\N	e433f419-8e6f-4d86-8eb5-241768ab5cfb	t	2025-12-16 13:04:10.306+02	2025-12-16 13:04:10.306+02
\.


--
-- TOC entry 5163 (class 0 OID 53471)
-- Dependencies: 228
-- Data for Name: ppe_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ppe_items (id, item_code, item_ref_code, name, product_name, item_type, category, description, unit, replacement_frequency, heavy_use_frequency, is_mandatory, account_code, account_description, supplier, has_size_variants, has_color_variants, size_scale, available_sizes, available_colors, is_active, created_at, updated_at) FROM stdin;
f9f8a562-ad9f-4134-9c01-2a58ea69fd98	BT-ALUTHERM	\N	Aluminised Thermal Suit	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-16 18:02:14.797+02	2025-12-16 18:02:14.797+02
60fb6ada-d968-490e-9d0a-372fb859c2ac	BT-AMBUNK	\N	Amour Bunker Suit	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-16 18:02:14.832+02	2025-12-16 18:02:14.832+02
636b5426-5ccd-4762-b6f3-05590ed5d410	BT-BEECATCH	\N	Bee Catcher's Suit	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-16 18:02:14.839+02	2025-12-16 18:02:14.839+02
27373934-4d5f-4309-91d4-2367d8abeca4	BT-CHEFJKT	\N	Chef's Jacket	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-16 18:02:14.845+02	2025-12-16 18:02:14.845+02
231192eb-813a-4053-ab45-77f593d2ef24	BT-CWSBLUE	\N	Cotton Worksuit Blue Elastic Cuff	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-16 18:02:14.849+02	2025-12-16 18:02:14.849+02
326b79f6-0705-4a71-b23e-36a02494d3cc	BT-FIRESUIT	\N	Firefighting Suit	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-16 18:02:14.857+02	2025-12-16 18:02:14.857+02
141f8817-a937-4744-8474-7775ec96d7f6	BT-LWSBLUE	\N	Ladies' Worksuit Blue	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-16 18:02:14.862+02	2025-12-16 18:02:14.862+02
44619c3c-b387-47c8-a03f-9c1d5d7446ac	BT-LWSREFL	\N	Ladies' Worksuit Reflective	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-16 18:02:14.866+02	2025-12-16 18:02:14.866+02
2560d96e-3094-406b-baf6-49b4e1881902	BT-LIFEJKT	\N	Life Jacket Adult Size	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-16 18:02:14.871+02	2025-12-16 18:02:14.871+02
2ac40eb2-e253-4081-82db-b8b9c0ab896f	BT-PVCRAIN	\N	PVC Rain Suits	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-16 18:02:14.876+02	2025-12-16 18:02:14.876+02
410e37b7-582b-49a9-b80f-44893036e0f8	BT-RAINSUT	\N	Rain Suits	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-16 18:02:14.879+02	2025-12-16 18:02:14.879+02
5dbf204f-575f-45f1-8fda-63cf059dad05	BT-RCWSWHT	\N	Reflective Cotton Worksuits White	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-16 18:02:14.884+02	2025-12-16 18:02:14.884+02
b48cb8b2-1721-44c1-8e4b-e3f2746028c8	BT-RWSBLUE	\N	Reflective Blue Worksuit	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-16 18:02:14.889+02	2025-12-16 18:02:14.889+02
6bf26a18-2d53-4185-90f4-d0d2ebd8afb9	BT-REFLVST	\N	Reflective Vest	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-16 18:02:14.894+02	2025-12-16 18:02:14.894+02
4a0f4099-88bf-44f0-ac01-3e7c5ef5775d	BT-REFLVLS	\N	Reflective Vest Long Sleeve	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-16 18:02:14.898+02	2025-12-16 18:02:14.898+02
3e350acf-58f1-4e22-863e-733f00bbadb6	BT-SHRTORN	\N	Shirt Cotton Orange & Navy	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-16 18:02:14.904+02	2025-12-16 18:02:14.904+02
fd57fe7e-2d2e-49f2-bea8-9ef4656dc0a8	BT-SHRTLMN	\N	Shirt Cotton Lime & Navy	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-16 18:02:14.915+02	2025-12-16 18:02:14.915+02
7e0947f6-d783-411f-acea-af1991d87dda	BT-SHSTNVL	\N	Shirt Short Navy & Lime	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-16 18:02:14.92+02	2025-12-16 18:02:14.92+02
87a23f93-68fb-497c-915d-3d08a56e32c7	BT-SHSTORL	\N	Shirt Short Orange & Lime	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-16 18:02:14.925+02	2025-12-16 18:02:14.925+02
836b697f-948f-4353-8b0b-55531d387aba	BT-SINKREF	\N	Sinking Suit Reflective	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-16 18:02:14.929+02	2025-12-16 18:02:14.929+02
bedbef36-618b-41e7-b491-ab70f497c843	BT-THERMTR	\N	Thermal Trousers	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-16 18:02:14.933+02	2025-12-16 18:02:14.933+02
86b20d32-f677-4f07-8e0a-f3abbbda34e4	BT-TRSCNVY	\N	Trousers Cotton Navy	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-16 18:02:14.94+02	2025-12-16 18:02:14.94+02
48efc690-c400-46c5-992f-68fab9681765	BT-WELDJKT	\N	Welding Jacket	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-16 18:02:14.945+02	2025-12-16 18:02:14.945+02
9f1dcaaf-0a61-4f59-8cb9-5e85de6fd48f	BT-LABCOAT	\N	White Lab Coats	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-16 18:02:14.949+02	2025-12-16 18:02:14.949+02
d49e629d-16ac-40fd-abde-b7403524bb32	BT-WINJKTR	\N	Winter Jacket Reflective	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-16 18:02:14.954+02	2025-12-16 18:02:14.954+02
fedb6027-49b9-424a-828a-cf4da595cd98	BT-WINSUT	\N	Winter Suit	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-16 18:02:14.958+02	2025-12-16 18:02:14.958+02
1e4abdf9-05cd-45f4-8d80-8ab221d20727	BT-WINJKT	\N	Winter Jacket	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-16 18:02:14.962+02	2025-12-16 18:02:14.962+02
35fccc89-ea72-49b3-aa1c-407da6bfde5d	BT-WSBLCOT	\N	Worksuit Blue Cotton	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-16 18:02:14.965+02	2025-12-16 18:02:14.965+02
c8a760d0-1cb5-497b-bbd9-9397c9be6682	BT-WSGRACID	\N	Worksuit Green Acid Proof	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-16 18:02:14.969+02	2025-12-16 18:02:14.969+02
a58deca1-aced-48e9-930d-98ccad834ea2	BT-WSNVFR	\N	Worksuit Navy Flame Retardant	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-16 18:02:14.973+02	2025-12-16 18:02:14.973+02
c5322973-5fe6-4a9f-9ea2-737af8f353ba	BT-WSWHTCOT	\N	Worksuit White Cotton	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-16 18:02:14.977+02	2025-12-16 18:02:14.977+02
98660c86-d3e4-4b71-9c29-4c8436d3a475	BT-WSYELCOT	\N	Worksuit Yellow Cotton	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-16 18:02:14.981+02	2025-12-16 18:02:14.981+02
77288465-f2b4-412f-9803-cb76f19f43fc	BT-WSCOTBL	\N	Worksuit Cotton Blue	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-16 18:02:14.984+02	2025-12-16 18:02:14.984+02
ad2e4008-51de-4d1b-a5ef-cb67fb1ddcd4	BT-WSREDFR	\N	Worksuit Red Flame Retardant	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-16 18:02:14.988+02	2025-12-16 18:02:14.988+02
c168741e-9dee-4e07-9de4-e40ab791fb51	BT-WSGRCOT	\N	Worksuite Green Cotton	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-16 18:02:14.993+02	2025-12-16 18:02:14.993+02
7a254105-298e-4f60-9734-d24d8394270e	BT-JEANBLK	\N	Black Jean (Pair)	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-16 18:02:14.996+02	2025-12-16 18:02:14.996+02
589f6be1-b025-4b6b-bffc-8527078d72e5	BT-JEANBLU	\N	Blue Jean (Pair)	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-16 18:02:15+02	2025-12-16 18:02:15+02
92ffc587-94f6-4d7f-a294-e99ca4fdfc5e	BT-SAFHARNS	\N	Safety Harness	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-16 18:02:15.005+02	2025-12-16 18:02:15.005+02
fad762cc-1296-4f9c-8e10-8edd307c6cb8	BT-KIDNBELT	\N	Kidney Belts	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-16 18:02:15.009+02	2025-12-16 18:02:15.009+02
67485929-989a-461c-8234-f94200e4594e	BT-LTHRAPN	\N	Leather Apron	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-16 18:02:15.012+02	2025-12-16 18:02:15.012+02
536e95fe-637a-4904-92d8-349f3651e3fd	BT-PVCAPRON	\N	PVC Apron	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-16 18:02:15.016+02	2025-12-16 18:02:15.016+02
f2419b73-02e8-40fb-b9d6-3bb11ae85bb7	EA-EARMUFR	\N	Ear Muffs Red	\N	PPE	EARS	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-16 18:02:15.022+02	2025-12-16 18:02:15.022+02
fddee851-3498-49f7-b209-5eb5bb67fb9d	EA-EARPLUG	\N	Earplugs	\N	PPE	EARS	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-16 18:02:15.026+02	2025-12-16 18:02:15.026+02
98376805-dfe9-4523-9c8f-40f183676ddd	EF-ANTIFOG	\N	Anti-Fog Goggles	\N	PPE	EYES/FACE	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-16 18:02:15.03+02	2025-12-16 18:02:15.03+02
56a7f21f-8e55-48b7-bd24-68949a5d3f11	EF-FCSHCLR	\N	Face Shield (Clear)	\N	PPE	EYES/FACE	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-16 18:02:15.034+02	2025-12-16 18:02:15.034+02
b714374d-c10d-4b8c-8427-78feeaca7576	EF-SAFGLSC	\N	Safety Glasses Clear	\N	PPE	EYES/FACE	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-16 18:02:15.039+02	2025-12-16 18:02:15.039+02
ef5ea36a-847b-483b-9691-6bc63b5cfa2c	EF-SAFGLSD	\N	Safety Glasses Dark	\N	PPE	EYES/FACE	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-16 18:02:15.043+02	2025-12-16 18:02:15.043+02
dba8fd68-e940-4c06-a20e-390fae4279d4	EF-WELDLNC	\N	Welding Lenses (Clear)	\N	PPE	EYES/FACE	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-16 18:02:15.047+02	2025-12-16 18:02:15.047+02
bb4f8b45-4693-46bb-b5d9-08f6d2f31462	EF-WELDLND	\N	Welding Lenses (Dark)	\N	PPE	EYES/FACE	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-16 18:02:15.051+02	2025-12-16 18:02:15.051+02
e4a9c32a-c93f-4312-8ea0-9055f8f18ebc	FT-GUMSHOS	\N	Gum Shoe Steel Toe	\N	PPE	FEET	\N	EA	12	\N	t	\N	\N	\N	t	f	FEET	\N	\N	t	2025-12-16 18:02:15.055+02	2025-12-16 18:02:15.055+02
2d79b3a3-6e62-4484-8913-14b141381da9	FT-LADSAF	\N	Ladies Safety Shoe	\N	PPE	FEET	\N	EA	12	\N	t	\N	\N	\N	t	f	FEET	\N	\N	t	2025-12-16 18:02:15.059+02	2025-12-16 18:02:15.059+02
9fe8ed70-040e-427b-b599-55cec4071265	FT-LADSAFHC	\N	Ladies Safety Shoe High Cut	\N	PPE	FEET	\N	EA	12	\N	t	\N	\N	\N	t	f	FEET	\N	\N	t	2025-12-16 18:02:15.062+02	2025-12-16 18:02:15.062+02
330c813f-3ffa-4a3d-b8f2-9cc85d827197	FT-SAFEXEC	\N	Safety Shoe Executive	\N	PPE	FEET	\N	EA	12	\N	t	\N	\N	\N	t	f	FEET	\N	\N	t	2025-12-16 18:02:15.066+02	2025-12-16 18:02:15.066+02
8d5c832c-b30a-4f36-8721-7c088db6c040	FT-SAFSTOE	\N	Safety Shoe Steel Toe	\N	PPE	FEET	\N	EA	12	\N	t	\N	\N	\N	t	f	FEET	\N	\N	t	2025-12-16 18:02:15.071+02	2025-12-16 18:02:15.071+02
4f145e88-affc-4c98-baaf-44469268a2d1	FT-SAFHICUT	\N	Safety Shoe High Cut	\N	PPE	FEET	\N	EA	12	\N	t	\N	\N	\N	t	f	FEET	\N	\N	t	2025-12-16 18:02:15.076+02	2025-12-16 18:02:15.076+02
a6115693-f967-421f-8b6a-5094db8035c6	FT-VIKFIRE	\N	Viking Fire Fighting Boots	\N	PPE	FEET	\N	EA	12	\N	t	\N	\N	\N	t	f	FEET	\N	\N	t	2025-12-16 18:02:15.079+02	2025-12-16 18:02:15.079+02
41dd4268-9904-4406-98a5-56f22158fcf2	HD-ELECRUB	\N	Electrical Rubber Gloves	\N	PPE	HANDS	\N	EA	12	\N	t	\N	\N	\N	t	f	GLOVES	\N	\N	t	2025-12-16 18:02:15.083+02	2025-12-16 18:02:15.083+02
39c3bedd-9e4e-4f6d-8067-4e59ba28364d	HD-HOUSEHD	\N	Household Gloves	\N	PPE	HANDS	\N	EA	12	\N	t	\N	\N	\N	t	f	GLOVES	\N	\N	t	2025-12-16 18:02:15.088+02	2025-12-16 18:02:15.088+02
d4c72739-2d78-4e46-b277-8a9657026123	HD-LTHRLNG	\N	Leather Gloves Long	\N	PPE	HANDS	\N	EA	12	\N	t	\N	\N	\N	t	f	GLOVES	\N	\N	t	2025-12-16 18:02:15.094+02	2025-12-16 18:02:15.094+02
d41c4151-a956-47f8-9040-45819d239071	HD-LTHRSHT	\N	Leather Gloves Short	\N	PPE	HANDS	\N	EA	12	\N	t	\N	\N	\N	t	f	GLOVES	\N	\N	t	2025-12-16 18:02:15.098+02	2025-12-16 18:02:15.098+02
ba8a3b29-70be-46fd-9c65-77fd53a89cbf	HD-NYLONGL	\N	Nylon Gloves	\N	PPE	HANDS	\N	EA	12	\N	t	\N	\N	\N	t	f	GLOVES	\N	\N	t	2025-12-16 18:02:15.102+02	2025-12-16 18:02:15.102+02
7f08a38b-9a37-4ddd-8703-8959830b5eec	HD-PIGSKIN	\N	Pig Skin Gloves	\N	PPE	HANDS	\N	EA	12	\N	t	\N	\N	\N	t	f	GLOVES	\N	\N	t	2025-12-16 18:02:15.107+02	2025-12-16 18:02:15.107+02
61718f57-6261-4ab9-b427-94bbf9cba8d8	HD-FIREGLV	\N	Fire Fighting Gloves	\N	PPE	HANDS	\N	EA	12	\N	t	\N	\N	\N	t	f	GLOVES	\N	\N	t	2025-12-16 18:02:15.112+02	2025-12-16 18:02:15.112+02
9158bfe6-d2b0-40a7-bf85-53da8795bb0c	HD-PVCLNG	\N	PVC Gloves Long	\N	PPE	HANDS	\N	EA	12	\N	t	\N	\N	\N	t	f	GLOVES	\N	\N	t	2025-12-16 18:02:15.117+02	2025-12-16 18:02:15.117+02
fc3536e7-0c54-4f98-a5a0-9e062df9ba3d	HD-PVCSHT	\N	PVC Gloves Short	\N	PPE	HANDS	\N	EA	12	\N	t	\N	\N	\N	t	f	GLOVES	\N	\N	t	2025-12-16 18:02:15.123+02	2025-12-16 18:02:15.123+02
5bd9ac49-a9f9-447d-b95d-946dd63507b3	HD-HEATRES	\N	Red Heat Resistant Gloves	\N	PPE	HANDS	\N	EA	12	\N	t	\N	\N	\N	t	f	GLOVES	\N	\N	t	2025-12-16 18:02:15.127+02	2025-12-16 18:02:15.127+02
57e0cce5-562a-482a-bde4-ef2dab5a63b3	HD-THERMWN	\N	Thermal Winter Gloves	\N	PPE	HANDS	\N	EA	12	\N	t	\N	\N	\N	t	f	GLOVES	\N	\N	t	2025-12-16 18:02:15.131+02	2025-12-16 18:02:15.131+02
a20e107a-bfc7-4185-a9bd-b0b67f38ca2b	HE-6PTLINR	\N	6 Point Hard Hat Liner	\N	PPE	HEAD	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-16 18:02:15.136+02	2025-12-16 18:02:15.136+02
4243175a-59da-4c71-8791-06c3a1b0a3a2	HE-BALCLVA	\N	Balaclava	\N	PPE	HEAD	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-16 18:02:15.141+02	2025-12-16 18:02:15.141+02
7128b22d-5632-4930-b5cc-bff8a41b0b84	HE-BALCHAT	\N	Balaclava Hat	\N	PPE	HEAD	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-16 18:02:15.145+02	2025-12-16 18:02:15.145+02
3c99087c-aaa8-46d4-a5a3-6ae6e82c6c75	HE-FIREHLM	\N	Fire Fighting Helmet	\N	PPE	HEAD	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-16 18:02:15.15+02	2025-12-16 18:02:15.15+02
646f0a92-6249-4370-a9f5-3e093031d960	HE-CAPLAMP	\N	Cordless Caplamp	\N	PPE	HEAD	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-16 18:02:15.154+02	2025-12-16 18:02:15.154+02
33473563-5531-4f97-a19f-cacc3f4a3d08	HE-HARDHAT	\N	Hard Hat	\N	PPE	HEAD	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-16 18:02:15.159+02	2025-12-16 18:02:15.159+02
e97b269a-414b-4628-b3a1-0919c7671f55	HE-HHCHIN	\N	Hard Hat Chin Straps	\N	PPE	HEAD	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-16 18:02:15.163+02	2025-12-16 18:02:15.163+02
67d3566f-3cb6-4103-92a2-85cfa5e70437	HE-HHLINER	\N	Hard Hat Liner	\N	PPE	HEAD	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-16 18:02:15.168+02	2025-12-16 18:02:15.168+02
2b94e38a-09b9-4674-8476-868b9273c63a	HE-HHGRAY	\N	Hard Hat Gray	\N	PPE	HEAD	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-16 18:02:15.173+02	2025-12-16 18:02:15.173+02
2a4b0fb9-3c8b-486f-abd1-ee418db3ded9	HE-SUNBRIM	\N	Sun Brim	\N	PPE	HEAD	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-16 18:02:15.177+02	2025-12-16 18:02:15.177+02
7875c8de-4064-4ec8-8ff1-de7316a058f3	HE-SUNVISR	\N	Sun Visor	\N	PPE	HEAD	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-16 18:02:15.181+02	2025-12-16 18:02:15.181+02
000f0269-f634-4c14-bebe-f69da96bdd2e	HE-THERMWL	\N	Thermal Woolen Hat	\N	PPE	HEAD	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-16 18:02:15.187+02	2025-12-16 18:02:15.187+02
e3543703-0eff-49c5-89a2-700ee3e76a9f	HE-WELDHLM	\N	Welding Helmet	\N	PPE	HEAD	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-16 18:02:15.194+02	2025-12-16 18:02:15.194+02
c98aa628-3a6e-4fcf-a66d-db0011dbfe73	HE-WHLMCAP	\N	Welding Helmet Inner Cap	\N	PPE	HEAD	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-16 18:02:15.199+02	2025-12-16 18:02:15.199+02
41b59bcc-0dea-4cab-ab6f-e9b723574661	LK-KNEECAP	\N	Knee Cap	\N	PPE	LEGS/LOWER/KNEES	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-16 18:02:15.207+02	2025-12-16 18:02:15.207+02
a74168a5-3069-4b69-8a9d-808ff1b252b8	LK-LTHSPAT	\N	Leather Spats	\N	PPE	LEGS/LOWER/KNEES	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-16 18:02:15.211+02	2025-12-16 18:02:15.211+02
f8a7631f-e3ac-415b-8065-274734590729	NK-CHEFNCK	\N	Chef's Neckerchief	\N	PPE	NECK	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-16 18:02:15.215+02	2025-12-16 18:02:15.215+02
70e88491-67c1-4d22-873e-91d407fc3ee5	NK-NECKCHF	\N	Neckerchief	\N	PPE	NECK	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-16 18:02:15.22+02	2025-12-16 18:02:15.22+02
1b94f3dd-1b77-492c-881b-37cdbdd5f7cb	NK-WELDNCK	\N	Welding Neck Protector	\N	PPE	NECK	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-16 18:02:15.225+02	2025-12-16 18:02:15.225+02
5e05cd05-af33-4ac5-96df-d1f9d5d2e6d1	RS-3MCART	\N	3M Respirator Cartridge	\N	PPE	RESPIRATORY	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-16 18:02:15.229+02	2025-12-16 18:02:15.229+02
1bb65f81-0196-4f20-b479-923944c271a9	RS-3MFILT	\N	3M Respirator Filters	\N	PPE	RESPIRATORY	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-16 18:02:15.233+02	2025-12-16 18:02:15.233+02
c5c7351e-8320-44f6-9b19-d7178145996c	RS-3MFULL	\N	3M Respirator Full Face	\N	PPE	RESPIRATORY	\N	EA	12	\N	t	\N	\N	\N	t	f	RESPIRATOR	\N	\N	t	2025-12-16 18:02:15.238+02	2025-12-16 18:02:15.238+02
aa155a79-9e1d-4012-b574-eb0ec383f881	RS-3MHALF	\N	3M Respirator Half Mask	\N	PPE	RESPIRATORY	\N	EA	12	\N	t	\N	\N	\N	t	f	RESPIRATOR	\N	\N	t	2025-12-16 18:02:15.243+02	2025-12-16 18:02:15.243+02
add80664-75da-44dc-85e0-e78c9846ba3c	RS-3MRETN	\N	3M Respirator Retainers	\N	PPE	RESPIRATORY	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-16 18:02:15.247+02	2025-12-16 18:02:15.247+02
40cc104e-876d-4bed-a4ce-a369f22a5fc4	RS-CPRMTH	\N	CPR Mouth Piece	\N	PPE	RESPIRATORY	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-16 18:02:15.251+02	2025-12-16 18:02:15.251+02
5c8e4756-3536-4254-9da9-e6618923697d	RS-DUSTFFP2	\N	Dust Mask FFP2	\N	PPE	RESPIRATORY	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-16 18:02:15.256+02	2025-12-16 18:02:15.256+02
\.


--
-- TOC entry 5169 (class 0 OID 53653)
-- Dependencies: 234
-- Data for Name: request_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.request_items (id, quantity, size, reason, approved_quantity, created_at, updated_at, request_id, ppe_item_id) FROM stdin;
\.


--
-- TOC entry 5168 (class 0 OID 53593)
-- Dependencies: 233
-- Data for Name: requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.requests (id, status, section_rep_approval_date, section_rep_comment, request_type, is_emergency_visitor, comment, rejection_reason, dept_rep_approval_date, dept_rep_comment, hod_approval_date, hod_comment, stores_approval_date, stores_comment, sheq_approval_date, sheq_comment, sheq_approver_id, fulfilled_date, fulfilled_by_user_id, rejected_by_id, rejected_at, employee_id, requested_by_id, department_id, section_id, created_at, updated_at, section_rep_approver_id, dept_rep_approver_id, hod_approver_id, stores_approver_id) FROM stdin;
\.


--
-- TOC entry 5156 (class 0 OID 53349)
-- Dependencies: 221
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.roles (id, name, description, permissions, created_at, updated_at) FROM stdin;
1c177e29-a88b-4e05-8898-65d915e808f4	admin	System Administrator - Full access to all features	[]	2025-12-16 10:18:59.677+02	2025-12-16 10:18:59.677+02
368f923b-981d-4eee-a55f-09e1d71d65ee	stores	Stores Department - Manage stock and fulfill requests	[]	2025-12-16 10:18:59.691+02	2025-12-16 10:18:59.691+02
d04c12a5-8ae4-4146-afde-29050b63c557	section-rep	Section Representative - Create requests for section employees	[]	2025-12-16 10:18:59.694+02	2025-12-16 10:18:59.694+02
8c674219-8d8c-48e3-a369-a2a49a39e344	department-rep	Department Representative - Oversee department PPE	[]	2025-12-16 10:18:59.696+02	2025-12-16 10:18:59.696+02
09decd63-65af-4e86-883c-ccc2ca6baecc	hod	Head of Department/Section - Approve requests and view reports	[]	2025-12-16 10:18:59.698+02	2025-12-16 10:18:59.698+02
da612c3f-777f-4fa4-a497-cff916380e07	sheq	SHEQ Officer - Safety compliance and audits	[]	2025-12-16 10:18:59.704+02	2025-12-16 10:18:59.704+02
\.


--
-- TOC entry 5158 (class 0 OID 53371)
-- Dependencies: 223
-- Data for Name: sections; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sections (id, name, code, description, is_active, created_at, updated_at, department_id) FROM stdin;
6b72e8dd-f8ee-4c2a-8e44-ea44e4794041	Security	\N	security section	t	2025-12-16 10:31:40.144+02	2025-12-16 10:31:40.144+02	006d417e-663f-46e3-89a8-1c59e71a2c3e
fa570fb8-b13c-4fe5-8da9-e49f7f01dede	GEOLOGY	\N	Geological services and exploration	t	2025-12-16 11:23:42.119+02	2025-12-16 11:23:42.119+02	0f93c3e0-3819-489b-9bb6-74d09ef46360
8581817b-a52e-4214-9326-bef9028675e6	GEOTECHNICAL ENGINEERING	\N	Geotechnical engineering services	t	2025-12-16 11:23:42.122+02	2025-12-16 11:23:42.122+02	0f93c3e0-3819-489b-9bb6-74d09ef46360
3abc1952-b1e0-4069-a517-75c0706e2721	PLANNING	\N	Mine planning and scheduling	t	2025-12-16 11:23:42.124+02	2025-12-16 11:23:42.124+02	0f93c3e0-3819-489b-9bb6-74d09ef46360
79981ee7-9928-4667-aac4-59cba3a31ddc	SURVEY	\N	Survey and mapping services	t	2025-12-16 11:23:42.127+02	2025-12-16 11:23:42.127+02	0f93c3e0-3819-489b-9bb6-74d09ef46360
6355b60b-6c2c-4aa1-9417-5c66fd8065d9	LABORATORY	\N	Laboratory testing and analysis	t	2025-12-16 11:23:42.129+02	2025-12-16 11:23:42.129+02	3eb308ba-47a9-41dc-8056-8003cd8e7800
5944432b-5987-46de-a2be-5e1f338014ce	PROCESSING	\N	Processing plant operations	t	2025-12-16 11:23:42.132+02	2025-12-16 11:23:42.132+02	777ee300-2f13-4446-b897-fbf105bf8452
dfc967c3-6d9d-48e7-b6b7-d44ddcf46b02	TAILS STORAGE FACILITY	\N	Tailings storage facility operations	t	2025-12-16 11:23:42.137+02	2025-12-16 11:23:42.137+02	777ee300-2f13-4446-b897-fbf105bf8452
96d7a388-f0f6-4078-a5ea-e2efea09bdca	ADMINISTRATION	\N	Administrative services	t	2025-12-16 11:23:42.139+02	2025-12-16 11:23:42.139+02	006d417e-663f-46e3-89a8-1c59e71a2c3e
5c7eb5a5-ed24-46bf-ba13-61fe4a2c1fa4	CSIR	\N	CSIR related activities	t	2025-12-16 11:23:42.14+02	2025-12-16 11:23:42.14+02	006d417e-663f-46e3-89a8-1c59e71a2c3e
e3a72f1c-88a2-4bc2-8c56-4bc99819e288	FINANCE	\N	Financial services	t	2025-12-16 11:23:42.142+02	2025-12-16 11:23:42.142+02	006d417e-663f-46e3-89a8-1c59e71a2c3e
eddee19c-15aa-4b45-947b-505fb6170f25	HUMAN RESOURCES	\N	Human resources management	t	2025-12-16 11:23:42.143+02	2025-12-16 11:23:42.143+02	006d417e-663f-46e3-89a8-1c59e71a2c3e
cb578a83-35f3-4456-ac28-268691ef036e	I.T	\N	Information technology services	t	2025-12-16 11:23:42.147+02	2025-12-16 11:23:42.147+02	006d417e-663f-46e3-89a8-1c59e71a2c3e
b11dd169-6f33-44d4-91c1-c64c41c36038	SHEQ	\N	Safety, Health, Environment and Quality	t	2025-12-16 11:23:42.149+02	2025-12-16 11:23:42.149+02	006d417e-663f-46e3-89a8-1c59e71a2c3e
0a7efdc6-3068-41ae-8813-a1247c2124f2	SITE COORDINATION	\N	Site coordination activities	t	2025-12-16 11:23:42.151+02	2025-12-16 11:23:42.151+02	006d417e-663f-46e3-89a8-1c59e71a2c3e
b8fc0096-6d33-4564-bdca-9a5aa455de19	STORES	\N	Stores and inventory management	t	2025-12-16 11:23:42.152+02	2025-12-16 11:23:42.152+02	006d417e-663f-46e3-89a8-1c59e71a2c3e
b30c7026-796a-4dc7-89fd-48dc74c0d9c2	TRAINING	\N	Training and development	t	2025-12-16 11:23:42.155+02	2025-12-16 11:23:42.155+02	006d417e-663f-46e3-89a8-1c59e71a2c3e
e433f419-8e6f-4d86-8eb5-241768ab5cfb	HEAD OFFICE	\N	Head office operations	t	2025-12-16 11:23:42.156+02	2025-12-16 11:23:42.156+02	b8a936f4-8438-4e20-aa35-8013ebb9b567
018a9f80-3688-48ee-8dc3-f4d21acc688e	CIVILS	\N	Civil maintenance and construction	t	2025-12-16 11:23:42.158+02	2025-12-16 11:23:42.158+02	792bf532-4c67-4293-81a6-5f6e73d1d356
49cf5912-e16f-430e-9dbc-e85439b62acc	ELECTRICAL	\N	Electrical maintenance	t	2025-12-16 11:23:42.159+02	2025-12-16 11:23:42.159+02	792bf532-4c67-4293-81a6-5f6e73d1d356
fbbfd52c-5fa4-4055-985f-be582add4144	MECHANICAL	\N	Mechanical maintenance	t	2025-12-16 11:23:42.16+02	2025-12-16 11:23:42.16+02	792bf532-4c67-4293-81a6-5f6e73d1d356
94ed84a7-76cb-400f-9396-9770e5d0b51a	MM PLANNING	\N	Maintenance planning	t	2025-12-16 11:23:42.165+02	2025-12-16 11:23:42.165+02	792bf532-4c67-4293-81a6-5f6e73d1d356
46bc90ce-db95-4d9a-b895-8bc06c0fb0df	MOBILE WORKSHOP	\N	Mobile workshop and field maintenance	t	2025-12-16 11:23:42.166+02	2025-12-16 11:23:42.166+02	792bf532-4c67-4293-81a6-5f6e73d1d356
2d6cfca3-62e2-483e-a808-b22057f2c39f	TAILS STORAGE FACILITY	\N	TSF maintenance	t	2025-12-16 11:23:42.168+02	2025-12-16 11:23:42.168+02	792bf532-4c67-4293-81a6-5f6e73d1d356
c9ddfe4e-3356-4c51-b917-b07321fbfc00	MINING	\N	Mining operations	t	2025-12-16 11:23:42.171+02	2025-12-16 11:23:42.171+02	9fde7fdd-ba43-4e40-b78f-83bd3576698c
\.


--
-- TOC entry 5178 (class 0 OID 54010)
-- Dependencies: 243
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.settings (id, category, key, value, value_type, description, is_secret, updated_by, created_at, updated_at) FROM stdin;
71770544-3a3a-464f-94ed-3a6923067f6d	general	systemName	PPE Management System	string	System display name	f	\N	2025-12-17 16:01:20.26+02	2025-12-17 16:01:20.26+02
ff9f0fbb-5a35-434d-ad8b-2736ecd5ab94	general	organizationName	Your Organization	string	Organization name	f	\N	2025-12-17 16:01:20.291+02	2025-12-17 16:01:20.291+02
ba0b26c1-ab18-4970-a42a-be22f4aa24a2	general	timezone	Africa/Johannesburg	string	System timezone	f	\N	2025-12-17 16:01:20.295+02	2025-12-17 16:01:20.295+02
dd2a66df-db01-448f-8f95-bd877d995e9e	general	dateFormat	DD/MM/YYYY	string	Date display format	f	\N	2025-12-17 16:01:20.298+02	2025-12-17 16:01:20.298+02
c3a4ff37-694b-4404-80bf-143a47a7338c	general	currency	USD	string	Default currency	f	\N	2025-12-17 16:01:20.301+02	2025-12-17 16:01:20.301+02
aae7933b-5199-4b1a-bff3-21982f6cf97c	general	language	en	string	System language	f	\N	2025-12-17 16:01:20.307+02	2025-12-17 16:01:20.307+02
a792943d-13bb-4ca4-84ff-dd93e2ea26f3	general	fiscalYearStart	January	string	Fiscal year start month	f	\N	2025-12-17 16:01:20.31+02	2025-12-17 16:01:20.31+02
dad621f6-29df-4955-a30c-5f97a7696cf4	general	maintenanceMode	false	boolean	Enable maintenance mode	f	\N	2025-12-17 16:01:20.312+02	2025-12-17 16:01:20.312+02
41c55c74-a49f-4b9f-86a6-2a4a8e125179	notifications	emailNotifications	true	boolean	Enable email notifications	f	\N	2025-12-17 16:01:20.322+02	2025-12-17 16:01:20.322+02
8769a116-de0c-4d38-9170-bbe6d863ad87	notifications	budgetAlerts	true	boolean	Enable budget alerts	f	\N	2025-12-17 16:01:20.325+02	2025-12-17 16:01:20.325+02
6e7eed80-329a-41f0-b8f6-cf48f4aaaf9b	notifications	budgetThreshold	80	number	Budget alert threshold percentage	f	\N	2025-12-17 16:01:20.328+02	2025-12-17 16:01:20.328+02
99da115c-53c8-47a9-9d1e-e6baccc6ede4	notifications	approvalRequests	true	boolean	Notify on approval requests	f	\N	2025-12-17 16:01:20.337+02	2025-12-17 16:01:20.337+02
1348afa5-ab3d-43c6-b227-bf8a5f9794ce	notifications	lowStockAlerts	true	boolean	Enable low stock alerts	f	\N	2025-12-17 16:01:20.339+02	2025-12-17 16:01:20.339+02
0c7814b8-3327-4715-be09-1e29739f8518	notifications	stockThreshold	10	number	Low stock threshold quantity	f	\N	2025-12-17 16:01:20.341+02	2025-12-17 16:01:20.341+02
2da48695-cd63-4b13-b66d-cf428773fc35	notifications	weeklyReports	false	boolean	Send weekly reports	f	\N	2025-12-17 16:01:20.343+02	2025-12-17 16:01:20.343+02
4fce0b86-0f66-4c24-86fd-479b3779d42f	notifications	monthlyReports	true	boolean	Send monthly reports	f	\N	2025-12-17 16:01:20.345+02	2025-12-17 16:01:20.345+02
12c46cea-88fa-41dc-8515-c80bcd1ce193	notifications	ppeExpiryAlerts	true	boolean	Alert before PPE expires	f	\N	2025-12-17 16:01:20.349+02	2025-12-17 16:01:20.349+02
570c932b-b747-4be8-978f-c1caa53b4bde	notifications	expiryDaysBefore	30	number	Days before expiry to alert	f	\N	2025-12-17 16:01:20.353+02	2025-12-17 16:01:20.353+02
0a4a62b0-5c62-4639-ab88-951bdbedb9f6	notifications	newUserAlerts	true	boolean	Alert on new user registration	f	\N	2025-12-17 16:01:20.357+02	2025-12-17 16:01:20.357+02
484acae0-cdba-4827-b638-d5ec2e08216c	notifications	systemAlerts	true	boolean	Enable system alerts	f	\N	2025-12-17 16:01:20.358+02	2025-12-17 16:01:20.358+02
b8138dd8-efdd-4013-96ab-158b4a6b20b8	security	sessionTimeout	30	number	Session timeout in minutes	f	\N	2025-12-17 16:01:20.361+02	2025-12-17 16:01:20.361+02
7ac51f3f-6f66-4818-98c4-eeaeda02800c	security	maxLoginAttempts	5	number	Max failed login attempts	f	\N	2025-12-17 16:01:20.362+02	2025-12-17 16:01:20.362+02
0a6133bd-4b63-4159-b616-aea130f19b07	security	lockoutDuration	15	number	Account lockout duration in minutes	f	\N	2025-12-17 16:01:20.365+02	2025-12-17 16:01:20.365+02
cb57ba41-e02a-479b-97d5-952b61a3c0a7	security	requireMfa	false	boolean	Require multi-factor authentication	f	\N	2025-12-17 16:01:20.368+02	2025-12-17 16:01:20.368+02
cbb01c99-4a11-4664-ba58-dd29d0ac1219	security	passwordMinLength	8	number	Minimum password length	f	\N	2025-12-17 16:01:20.37+02	2025-12-17 16:01:20.37+02
6b5257e6-c059-466d-84b7-440d35778fe7	security	requireUppercase	true	boolean	Require uppercase in password	f	\N	2025-12-17 16:01:20.372+02	2025-12-17 16:01:20.372+02
51b8eeb3-f01c-4732-b2e0-e64f42c0eb3d	security	requireNumbers	true	boolean	Require numbers in password	f	\N	2025-12-17 16:01:20.375+02	2025-12-17 16:01:20.375+02
35a226b7-4476-4958-8ae2-968ace0a34aa	security	requireSpecialChars	true	boolean	Require special chars in password	f	\N	2025-12-17 16:01:20.376+02	2025-12-17 16:01:20.376+02
ef3121d2-06d4-4920-bf18-4f106f5048e1	security	passwordExpiry	90	number	Password expiry in days	f	\N	2025-12-17 16:01:20.378+02	2025-12-17 16:01:20.378+02
6c6d3487-d009-4da3-b861-3b7cc7164ed3	security	ipWhitelisting	false	boolean	Enable IP whitelisting	f	\N	2025-12-17 16:01:20.38+02	2025-12-17 16:01:20.38+02
ecaea14e-b02e-4110-ae82-12e8c5e59a32	security	auditLogging	true	boolean	Enable audit logging	f	\N	2025-12-17 16:01:20.382+02	2025-12-17 16:01:20.382+02
447e8ae4-fc7d-43b9-8469-36f01ccb819e	database	autoBackup	true	boolean	Enable automatic backups	f	\N	2025-12-17 16:01:20.387+02	2025-12-17 16:01:20.387+02
df82e62d-a718-48ed-ad11-2d310506618f	database	backupTime	18:00	string	Daily backup time (24h format)	f	\N	2025-12-17 16:01:20.389+02	2025-12-17 16:01:20.389+02
f952ce01-dfb2-4486-a54a-c3909993d596	database	backupRetention	30	number	Backup retention in days	f	\N	2025-12-17 16:01:20.391+02	2025-12-17 16:01:20.391+02
35d7966e-9170-4ceb-aabd-45ff1534a7ee	database	backupPath	./backups	string	Backup storage path	f	\N	2025-12-17 16:01:20.393+02	2025-12-17 16:01:20.393+02
f4e45390-fbd4-40f9-bc6a-8816680ed18c	email	smtpServer		string	SMTP server address	f	\N	2025-12-17 16:01:20.394+02	2025-12-17 16:01:20.394+02
53c8dfc2-89fa-4c40-9aff-248e1e173ece	email	smtpPort	587	number	SMTP port	f	\N	2025-12-17 16:01:20.396+02	2025-12-17 16:01:20.396+02
74bca305-e0f9-48dc-a3e0-ddf7a731f59c	email	encryption	tls	string	SMTP encryption	f	\N	2025-12-17 16:01:20.399+02	2025-12-17 16:01:20.399+02
77575789-c629-4ec2-a59c-0f38e68e3c5d	email	smtpUsername		string	SMTP username	t	\N	2025-12-17 16:01:20.402+02	2025-12-17 16:01:20.402+02
6f0ddacd-bf14-417a-b710-6e2cc2746ff7	email	smtpPassword		string	SMTP password	t	\N	2025-12-17 16:01:20.404+02	2025-12-17 16:01:20.404+02
bc640c81-725c-4d6a-adbd-dd1a9ad5d8d1	email	fromEmail	noreply@company.com	string	From email address	f	\N	2025-12-17 16:01:20.407+02	2025-12-17 16:01:20.407+02
927c391a-b37e-4c1b-a752-2b7a94ec95e3	email	fromName	PPE Management System	string	From name	f	\N	2025-12-17 16:01:20.409+02	2025-12-17 16:01:20.409+02
15ea4eba-74f8-4ba0-88d3-e7b301b1014d	email	replyTo	support@company.com	string	Reply-to address	f	\N	2025-12-17 16:01:20.411+02	2025-12-17 16:01:20.411+02
cab90776-bd8c-4f09-89f4-aa35f8e530fe	email	maxRetries	3	number	Max email retry attempts	f	\N	2025-12-17 16:01:20.413+02	2025-12-17 16:01:20.413+02
dfd9ecb1-e513-4d28-81b2-4e1f94b0222c	email	rateLimitPerHour	100	number	Max emails per hour	f	\N	2025-12-17 16:01:20.415+02	2025-12-17 16:01:20.415+02
83f5b7cc-24d9-4a35-947b-45663611418b	appearance	theme	system	string	Color theme	f	\N	2025-12-17 16:01:20.419+02	2025-12-17 16:01:20.419+02
c110eb6b-3a4b-4645-b401-0feaf8271edd	appearance	primaryColor	#0066CC	string	Primary brand color	f	\N	2025-12-17 16:01:20.421+02	2025-12-17 16:01:20.421+02
9dbbf2b3-8be5-4f5f-b8a8-3e1dbdbb7d5f	appearance	sidebarPosition	left	string	Sidebar position	f	\N	2025-12-17 16:01:20.423+02	2025-12-17 16:01:20.423+02
136b11d6-6419-478e-afee-89d38b3e214b	appearance	compactMode	false	boolean	Enable compact mode	f	\N	2025-12-17 16:01:20.425+02	2025-12-17 16:01:20.425+02
46fbac3f-8977-4c92-b35e-334198af7cbf	appearance	showBreadcrumbs	true	boolean	Show breadcrumbs	f	\N	2025-12-17 16:01:20.429+02	2025-12-17 16:01:20.429+02
9393f2f8-07dc-4b5c-a8f4-5da2f98422b6	appearance	animationsEnabled	true	boolean	Enable animations	f	\N	2025-12-17 16:01:20.434+02	2025-12-17 16:01:20.434+02
9ea21396-07e2-480c-8727-78ffd79ff16e	appearance	tableRowsPerPage	10	number	Default table rows per page	f	\N	2025-12-17 16:01:20.441+02	2025-12-17 16:01:20.441+02
d750935a-e368-4877-8375-9407ecb7396d	appearance	dateTimeFormat	12h	string	Time format (12h/24h)	f	\N	2025-12-17 16:01:20.443+02	2025-12-17 16:01:20.443+02
a0716582-45c1-4c46-b847-0994a993d095	api	rateLimitEnabled	true	boolean	Enable API rate limiting	f	\N	2025-12-17 16:01:20.451+02	2025-12-17 16:01:20.451+02
1f013ccf-40f9-4773-87e6-6eb3fbda3abd	api	requestsPerMinute	60	number	Max requests per minute	f	\N	2025-12-17 16:01:20.454+02	2025-12-17 16:01:20.454+02
600a59f2-26fa-458e-9515-ea724179a37e	api	requestsPerHour	1000	number	Max requests per hour	f	\N	2025-12-17 16:01:20.456+02	2025-12-17 16:01:20.456+02
1da4b390-a214-4fa1-b51a-3c7c603e130e	users	defaultRole	section_rep	string	Default role for new users	f	\N	2025-12-17 16:01:20.459+02	2025-12-17 16:01:20.459+02
f92ffb22-b0e3-4ffc-8dd9-ee6b0ad35cad	users	requireEmailVerification	true	boolean	Require email verification	f	\N	2025-12-17 16:01:20.461+02	2025-12-17 16:01:20.461+02
cb581e63-6951-4153-ad25-738e866c933d	users	autoActivateAccounts	false	boolean	Auto-activate accounts	f	\N	2025-12-17 16:01:20.463+02	2025-12-17 16:01:20.463+02
d2b3605c-5d4a-4d2e-bbea-b83348ca2aa0	users	welcomeEmailEnabled	true	boolean	Send welcome email	f	\N	2025-12-17 16:01:20.465+02	2025-12-17 16:01:20.465+02
9f64ccf7-249a-4bf9-9e11-c19e8eab8523	users	passwordResetExpiry	24	number	Password reset link expiry in hours	f	\N	2025-12-17 16:01:20.468+02	2025-12-17 16:01:20.468+02
a4bcaa4a-fd17-4023-8801-0baa552193cf	users	defaultDashboard	role_based	string	Default dashboard type	f	\N	2025-12-17 16:01:20.471+02	2025-12-17 16:01:20.471+02
03b22ba4-c047-4c62-b84e-c6407e23ec5d	users	maxPPERequestItems	10	number	Max items per PPE request	f	\N	2025-12-17 16:01:20.473+02	2025-12-17 16:01:20.473+02
4740c704-3c2f-4467-b5f1-4be1e13a4382	users	requireManagerApproval	true	boolean	Require manager approval for requests	f	\N	2025-12-17 16:01:20.475+02	2025-12-17 16:01:20.475+02
3af9d621-40fd-4c37-b452-2817c36ddd85	users	allowSelfRegistration	false	boolean	Allow self registration	f	\N	2025-12-17 16:01:20.477+02	2025-12-17 16:01:20.477+02
\.


--
-- TOC entry 5164 (class 0 OID 53493)
-- Dependencies: 229
-- Data for Name: size_scales; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.size_scales (id, code, name, category_group, description, is_active, created_at, updated_at) FROM stdin;
698c4038-e381-4bce-b14c-07489e69eaf8	BODY_NUMERIC	Body/Torso Numeric (34-50)	BODY/TORSO	Numeric sizing for body/torso garments (worksuits, jackets, etc.)	t	2025-12-16 17:48:44.475+02	2025-12-16 17:48:44.475+02
1d62d66f-365b-41fa-8aa0-2f8fc757c2a9	BODY_ALPHA	Body/Torso Alpha (XS-3XL)	BODY/TORSO	Alpha sizing for body/torso garments (XS, S, M, L, XL, 2XL, 3XL)	t	2025-12-16 17:48:44.549+02	2025-12-16 17:48:44.549+02
00342500-829b-4786-825b-ede25c755cff	FEET	Footwear (4-13)	FEET	Footwear sizing (UK sizes 4-13)	t	2025-12-16 17:48:44.585+02	2025-12-16 17:48:44.585+02
9fb0e9ef-1445-4197-8c93-7c264b637a9d	GLOVES	Gloves (S-XL)	HANDS	Glove sizing	t	2025-12-16 17:48:44.634+02	2025-12-16 17:48:44.634+02
837d57b4-9062-45ff-a08c-c0303cb265ab	HEAD	Head Gear	HEAD	Head gear sizing (hard hats, helmets)	t	2025-12-16 17:48:44.661+02	2025-12-16 17:48:44.661+02
068caa15-7ff2-407b-9470-1232aacd6f62	RESPIRATOR	Respirator	RESPIRATORY	Respirator face piece sizing	t	2025-12-16 17:48:44.682+02	2025-12-16 17:48:44.682+02
76baabbc-daaa-4bb7-8cad-75ceaad8ff52	ONESIZE	One Size / Standard	GENERAL	Items that come in standard/one size only	t	2025-12-16 17:48:44.704+02	2025-12-16 17:48:44.704+02
e59a3854-5c51-4ce0-9c87-88a3dee01c1c	EYEWEAR	Eye Protection	EYES/FACE	Safety glasses and eye protection sizing	t	2025-12-16 17:48:44.717+02	2025-12-16 17:48:44.717+02
\.


--
-- TOC entry 5165 (class 0 OID 53505)
-- Dependencies: 230
-- Data for Name: sizes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sizes (id, scale_id, value, label, sort_order, eu_size, us_size, uk_size, meta, created_at, updated_at) FROM stdin;
303ccd20-ec56-46f0-b860-3c6848aeeb3d	698c4038-e381-4bce-b14c-07489e69eaf8	34	34	0	\N	\N	\N	\N	2025-12-16 17:48:44.498+02	2025-12-16 17:48:44.498+02
e16e3871-3462-4147-9b58-efd324b9d2a5	698c4038-e381-4bce-b14c-07489e69eaf8	36	36	1	\N	\N	\N	\N	2025-12-16 17:48:44.509+02	2025-12-16 17:48:44.509+02
fccdce73-7f88-4ef5-b142-441669f18fe9	698c4038-e381-4bce-b14c-07489e69eaf8	38	38	2	\N	\N	\N	\N	2025-12-16 17:48:44.514+02	2025-12-16 17:48:44.514+02
afd16749-878d-449d-bc51-d2da3ef0c319	698c4038-e381-4bce-b14c-07489e69eaf8	40	40	3	\N	\N	\N	\N	2025-12-16 17:48:44.518+02	2025-12-16 17:48:44.518+02
91b0b165-eab6-4bdc-b133-38ef8fa377bf	698c4038-e381-4bce-b14c-07489e69eaf8	42	42	4	\N	\N	\N	\N	2025-12-16 17:48:44.524+02	2025-12-16 17:48:44.524+02
4753bf01-785d-493a-a61d-7d20b9d850df	698c4038-e381-4bce-b14c-07489e69eaf8	44	44	5	\N	\N	\N	\N	2025-12-16 17:48:44.528+02	2025-12-16 17:48:44.528+02
af7bb384-8b63-4931-8ee8-ef7230bde58c	698c4038-e381-4bce-b14c-07489e69eaf8	46	46	6	\N	\N	\N	\N	2025-12-16 17:48:44.532+02	2025-12-16 17:48:44.532+02
07403bd0-3538-42ae-9baa-530916cda645	698c4038-e381-4bce-b14c-07489e69eaf8	48	48	7	\N	\N	\N	\N	2025-12-16 17:48:44.537+02	2025-12-16 17:48:44.537+02
a179280f-dce5-44e5-b72a-9c3829179842	698c4038-e381-4bce-b14c-07489e69eaf8	50	50	8	\N	\N	\N	\N	2025-12-16 17:48:44.542+02	2025-12-16 17:48:44.542+02
51040525-9de2-4220-b3a2-25a4d8cf5e09	698c4038-e381-4bce-b14c-07489e69eaf8	Std	Standard	9	\N	\N	\N	\N	2025-12-16 17:48:44.546+02	2025-12-16 17:48:44.546+02
84571ce5-a95a-4e58-99a0-7669fcfd0478	1d62d66f-365b-41fa-8aa0-2f8fc757c2a9	XS	Extra Small	0	\N	\N	\N	\N	2025-12-16 17:48:44.553+02	2025-12-16 17:48:44.553+02
26fc35ff-00d7-4a30-a1f5-da6fcf2511a2	1d62d66f-365b-41fa-8aa0-2f8fc757c2a9	S	Small	1	\N	\N	\N	\N	2025-12-16 17:48:44.558+02	2025-12-16 17:48:44.558+02
8b9cfa7e-a655-497f-8c26-2b4f789edaa1	1d62d66f-365b-41fa-8aa0-2f8fc757c2a9	M	Medium	2	\N	\N	\N	\N	2025-12-16 17:48:44.562+02	2025-12-16 17:48:44.562+02
7af20ed2-884a-43b4-9412-5a44136595b7	1d62d66f-365b-41fa-8aa0-2f8fc757c2a9	L	Large	3	\N	\N	\N	\N	2025-12-16 17:48:44.565+02	2025-12-16 17:48:44.565+02
94178183-8b62-48ea-a5de-fae65699b5a1	1d62d66f-365b-41fa-8aa0-2f8fc757c2a9	XL	Extra Large	4	\N	\N	\N	\N	2025-12-16 17:48:44.568+02	2025-12-16 17:48:44.568+02
90386957-6a93-4298-bb7c-d714933bc49f	1d62d66f-365b-41fa-8aa0-2f8fc757c2a9	2XL	2X Large	5	\N	\N	\N	\N	2025-12-16 17:48:44.573+02	2025-12-16 17:48:44.573+02
2e268717-7e93-4d13-bed5-48b376ee23ec	1d62d66f-365b-41fa-8aa0-2f8fc757c2a9	3XL	3X Large	6	\N	\N	\N	\N	2025-12-16 17:48:44.577+02	2025-12-16 17:48:44.577+02
8d193141-c1b2-4596-9f3a-fdabf3d5a435	1d62d66f-365b-41fa-8aa0-2f8fc757c2a9	Std	Standard	7	\N	\N	\N	\N	2025-12-16 17:48:44.581+02	2025-12-16 17:48:44.581+02
cfbe503d-d797-475d-902d-90607a8dee87	00342500-829b-4786-825b-ede25c755cff	4	4	0	\N	\N	4	\N	2025-12-16 17:48:44.589+02	2025-12-16 17:48:44.589+02
e87b4b64-5f4c-4988-9287-d7cc797fe2df	00342500-829b-4786-825b-ede25c755cff	5	5	1	\N	\N	5	\N	2025-12-16 17:48:44.594+02	2025-12-16 17:48:44.594+02
a899f755-4de2-4c55-b634-56ee0d157d07	00342500-829b-4786-825b-ede25c755cff	6	6	2	\N	\N	6	\N	2025-12-16 17:48:44.598+02	2025-12-16 17:48:44.598+02
e1ca2362-e0ee-4845-9399-1a0c22ecf209	00342500-829b-4786-825b-ede25c755cff	7	7	3	\N	\N	7	\N	2025-12-16 17:48:44.601+02	2025-12-16 17:48:44.601+02
d3221617-74d3-4962-9b6c-8d6620f209cb	00342500-829b-4786-825b-ede25c755cff	8	8	4	\N	\N	8	\N	2025-12-16 17:48:44.606+02	2025-12-16 17:48:44.606+02
0bb55399-dc15-47fb-94e3-c56a71d4939f	00342500-829b-4786-825b-ede25c755cff	9	9	5	\N	\N	9	\N	2025-12-16 17:48:44.61+02	2025-12-16 17:48:44.61+02
460f642e-0d07-42c2-9b63-9358c23966f1	00342500-829b-4786-825b-ede25c755cff	10	10	6	\N	\N	10	\N	2025-12-16 17:48:44.614+02	2025-12-16 17:48:44.614+02
ad55cada-f185-4e03-aa4b-094cf76201a4	00342500-829b-4786-825b-ede25c755cff	11	11	7	\N	\N	11	\N	2025-12-16 17:48:44.618+02	2025-12-16 17:48:44.618+02
0754cdd7-1d9d-4159-837e-dc2b248835ab	00342500-829b-4786-825b-ede25c755cff	12	12	8	\N	\N	12	\N	2025-12-16 17:48:44.622+02	2025-12-16 17:48:44.622+02
23b5b902-a2fe-4d32-8bd1-a662178100f3	00342500-829b-4786-825b-ede25c755cff	13	13	9	\N	\N	13	\N	2025-12-16 17:48:44.626+02	2025-12-16 17:48:44.626+02
10dc3dcc-387d-4f15-9de7-0c70a9254518	00342500-829b-4786-825b-ede25c755cff	Std	Standard	10	\N	\N	\N	\N	2025-12-16 17:48:44.63+02	2025-12-16 17:48:44.63+02
7860d44c-bfa2-4e03-8b13-1c8652dc0ff1	9fb0e9ef-1445-4197-8c93-7c264b637a9d	S	Small	0	\N	\N	\N	\N	2025-12-16 17:48:44.639+02	2025-12-16 17:48:44.639+02
249b8999-814d-4abc-9b97-bc6e77541f68	9fb0e9ef-1445-4197-8c93-7c264b637a9d	M	Medium	1	\N	\N	\N	\N	2025-12-16 17:48:44.643+02	2025-12-16 17:48:44.643+02
4bef015e-2435-47b5-b112-5dbab64d1bab	9fb0e9ef-1445-4197-8c93-7c264b637a9d	L	Large	2	\N	\N	\N	\N	2025-12-16 17:48:44.647+02	2025-12-16 17:48:44.647+02
2b460a38-d425-4efe-a1c5-a4644c6eb42c	9fb0e9ef-1445-4197-8c93-7c264b637a9d	XL	Extra Large	3	\N	\N	\N	\N	2025-12-16 17:48:44.652+02	2025-12-16 17:48:44.652+02
e75452ed-9aa3-4dd0-80ed-0da149fdb789	9fb0e9ef-1445-4197-8c93-7c264b637a9d	Std	Standard/One Size	4	\N	\N	\N	\N	2025-12-16 17:48:44.657+02	2025-12-16 17:48:44.657+02
e7e5ad18-ac7a-43d8-a00e-6d9a516cef49	837d57b4-9062-45ff-a08c-c0303cb265ab	S	Small	0	\N	\N	\N	\N	2025-12-16 17:48:44.665+02	2025-12-16 17:48:44.665+02
93c5114c-aa1b-4be5-a946-bd1b4d7f4ad8	837d57b4-9062-45ff-a08c-c0303cb265ab	M	Medium	1	\N	\N	\N	\N	2025-12-16 17:48:44.669+02	2025-12-16 17:48:44.669+02
81a00b44-1ab7-49ca-ab1b-8c9fc8206a4c	837d57b4-9062-45ff-a08c-c0303cb265ab	L	Large	2	\N	\N	\N	\N	2025-12-16 17:48:44.674+02	2025-12-16 17:48:44.674+02
3f40a343-5cd2-4a25-9383-a9ef13cb98f3	837d57b4-9062-45ff-a08c-c0303cb265ab	Std	Standard/Adjustable	3	\N	\N	\N	\N	2025-12-16 17:48:44.678+02	2025-12-16 17:48:44.678+02
5ca4a41b-fe7c-4c6e-ad4a-e1c74fe5113a	068caa15-7ff2-407b-9470-1232aacd6f62	S	Small	0	\N	\N	\N	\N	2025-12-16 17:48:44.687+02	2025-12-16 17:48:44.687+02
199443f3-b6ad-439d-8420-a3c3c861713d	068caa15-7ff2-407b-9470-1232aacd6f62	M	Medium	1	\N	\N	\N	\N	2025-12-16 17:48:44.691+02	2025-12-16 17:48:44.691+02
7593a16a-0fc3-48e6-afa0-4bfb6cc52a4e	068caa15-7ff2-407b-9470-1232aacd6f62	L	Large	2	\N	\N	\N	\N	2025-12-16 17:48:44.696+02	2025-12-16 17:48:44.696+02
579ae7c0-2495-42ef-b0da-3897462e3a5d	068caa15-7ff2-407b-9470-1232aacd6f62	Std	Standard/One Size	3	\N	\N	\N	\N	2025-12-16 17:48:44.699+02	2025-12-16 17:48:44.699+02
015108fc-d57d-407e-9e88-234c8518878e	76baabbc-daaa-4bb7-8cad-75ceaad8ff52	Std	Standard	0	\N	\N	\N	\N	2025-12-16 17:48:44.709+02	2025-12-16 17:48:44.709+02
bb409f87-0294-40cb-b96d-1820458c919a	76baabbc-daaa-4bb7-8cad-75ceaad8ff52	One Size	One Size	1	\N	\N	\N	\N	2025-12-16 17:48:44.713+02	2025-12-16 17:48:44.713+02
fb19c1f2-2778-4386-9097-64503d707b75	e59a3854-5c51-4ce0-9c87-88a3dee01c1c	Std	Standard	0	\N	\N	\N	\N	2025-12-16 17:48:44.721+02	2025-12-16 17:48:44.721+02
109a909e-0340-48dd-bff0-56de67bdc71d	e59a3854-5c51-4ce0-9c87-88a3dee01c1c	Narrow	Narrow Fit	1	\N	\N	\N	\N	2025-12-16 17:48:44.725+02	2025-12-16 17:48:44.725+02
bbc8aacc-0246-4997-80d3-54b47d94fd82	e59a3854-5c51-4ce0-9c87-88a3dee01c1c	Wide	Wide Fit	2	\N	\N	\N	\N	2025-12-16 17:48:44.729+02	2025-12-16 17:48:44.729+02
\.


--
-- TOC entry 5167 (class 0 OID 53545)
-- Dependencies: 232
-- Data for Name: stocks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stocks (id, quantity, min_level, max_level, reorder_point, unit_cost, unit_price_u_s_d, total_value_u_s_d, stock_account, location, bin_location, batch_number, expiry_date, size, color, last_restocked, last_stock_take, notes, eligible_departments, eligible_sections, created_at, updated_at, ppe_item_id) FROM stdin;
659955ea-df6e-4220-8720-3789564d1560	35	5	\N	\N	85.00	85.00	\N	PPEQ	Main Store	\N	\N	\N	6	\N	2025-12-17 09:23:20.396+02	\N	SAFETY SHOE(STEEL TOE CAPPED OIL RESISTANT AND NON SLIP SOLE SIZE 6\n[2025-12-17] Restock from order: +10	\N	\N	2025-12-16 20:18:44.878+02	2025-12-17 09:23:20.397+02	2d79b3a3-6e62-4484-8913-14b141381da9
c5ec5a74-adbd-4bc9-8374-afef26ca7bca	55	10	\N	\N	45.00	45.00	\N	PPEQ	Main Store	\N	\N	\N	38	Navy	2025-12-17 09:23:20.424+02	\N	WORKSUIT NAVY,FLAME RETARDANT,REFLECTIVE,ELASTICATED CUFFS SIZE 38\n[2025-12-17] Restock from order: +5	\N	\N	2025-12-16 20:18:44.851+02	2025-12-17 09:23:20.424+02	a58deca1-aced-48e9-930d-98ccad834ea2
28cb0f52-d88c-4c42-b3a8-3fe10dda5322	34	10	\N	\N	45.00	45.00	\N	PPEQ	Main Store	\N	\N	\N	40	Navy	2025-12-17 09:23:20.428+02	\N	WORKSUIT NAVY,FLAME RETARDANT,REFLECTIVE,ELASTICATED CUFFS SIZE 40\n[2025-12-17] Restock from order: +4	\N	\N	2025-12-16 20:18:44.864+02	2025-12-17 09:23:20.428+02	a58deca1-aced-48e9-930d-98ccad834ea2
3124841b-bbb3-4f2c-a64b-dd5baade53c5	120	20	\N	\N	5.50	5.50	\N	PPEQ	Main Store	\N	\N	\N	\N	Red	2025-12-17 09:23:20.432+02	\N	REUSABLES EARPLUGS (MINIMUM 33DBA NOISE REDUCTION FACTOR)\n[2025-12-17] Restock from order: +20	\N	\N	2025-12-16 20:18:44.814+02	2025-12-17 09:23:20.432+02	fddee851-3498-49f7-b209-5eb5bb67fb9d
\.


--
-- TOC entry 5162 (class 0 OID 53442)
-- Dependencies: 227
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, username, password_hash, employee_id, role_id, is_active, last_login, created_at, updated_at, department_id, section_id) FROM stdin;
c38cc55b-0530-405b-b48d-02465d7a402b	dp130	$2a$10$2zqetSF/W7o05Wq9d3.waOMYbGyS8laQuR3zchNqTxQaJbSRuNQXK	ec717f73-15e6-44f7-ad7e-67ffa5c7d61f	368f923b-981d-4eee-a55f-09e1d71d65ee	t	2025-12-17 13:07:44.58+02	2025-12-16 16:41:54.401+02	2025-12-17 13:07:44.58+02	\N	\N
37510ceb-5798-4c70-b7f5-341a18aa99ec	sysadmin	$2a$10$dH1Ugp.kBPcCnToHSBFVtumvpeZTGj8XYCdm1R1rZ4C/CCV5rAWr6	\N	1c177e29-a88b-4e05-8898-65d915e808f4	t	2025-12-17 14:47:46.263+02	2025-12-16 10:18:59.781+02	2025-12-17 14:47:46.263+02	\N	\N
\.


--
-- TOC entry 4963 (class 2606 OID 54009)
-- Name: SequelizeMeta SequelizeMeta_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SequelizeMeta"
    ADD CONSTRAINT "SequelizeMeta_pkey" PRIMARY KEY (name);


--
-- TOC entry 4945 (class 2606 OID 53699)
-- Name: allocations allocations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocations
    ADD CONSTRAINT allocations_pkey PRIMARY KEY (id);


--
-- TOC entry 4952 (class 2606 OID 53831)
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 4947 (class 2606 OID 53746)
-- Name: budgets budgets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_pkey PRIMARY KEY (id);


--
-- TOC entry 4958 (class 2606 OID 53989)
-- Name: company_budgets company_budgets_fiscal_year_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_budgets
    ADD CONSTRAINT company_budgets_fiscal_year_key UNIQUE (fiscal_year);


--
-- TOC entry 4960 (class 2606 OID 53987)
-- Name: company_budgets company_budgets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_budgets
    ADD CONSTRAINT company_budgets_pkey PRIMARY KEY (id);


--
-- TOC entry 4888 (class 2606 OID 53393)
-- Name: cost_centers cost_centers_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cost_centers
    ADD CONSTRAINT cost_centers_code_key UNIQUE (code);


--
-- TOC entry 4891 (class 2606 OID 53391)
-- Name: cost_centers cost_centers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cost_centers
    ADD CONSTRAINT cost_centers_pkey PRIMARY KEY (id);


--
-- TOC entry 4875 (class 2606 OID 53917)
-- Name: departments departments_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_code_key UNIQUE (code);


--
-- TOC entry 4877 (class 2606 OID 53919)
-- Name: departments departments_code_key1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_code_key1 UNIQUE (code);


--
-- TOC entry 4879 (class 2606 OID 53911)
-- Name: departments departments_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_name_key UNIQUE (name);


--
-- TOC entry 4881 (class 2606 OID 53913)
-- Name: departments departments_name_key1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_name_key1 UNIQUE (name);


--
-- TOC entry 4883 (class 2606 OID 53366)
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- TOC entry 4954 (class 2606 OID 53856)
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- TOC entry 4898 (class 2606 OID 53424)
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- TOC entry 4900 (class 2606 OID 53426)
-- Name: employees employees_worksNumber_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT "employees_worksNumber_key" UNIQUE ("worksNumber");


--
-- TOC entry 4950 (class 2606 OID 53799)
-- Name: failure_reports failure_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.failure_reports
    ADD CONSTRAINT failure_reports_pkey PRIMARY KEY (id);


--
-- TOC entry 4956 (class 2606 OID 53874)
-- Name: forecasts forecasts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forecasts
    ADD CONSTRAINT forecasts_pkey PRIMARY KEY (id);


--
-- TOC entry 4932 (class 2606 OID 53530)
-- Name: job_title_ppe_matrix job_title_ppe_matrix_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_title_ppe_matrix
    ADD CONSTRAINT job_title_ppe_matrix_pkey PRIMARY KEY (id);


--
-- TOC entry 4893 (class 2606 OID 53410)
-- Name: job_titles job_titles_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_titles
    ADD CONSTRAINT job_titles_code_key UNIQUE (code);


--
-- TOC entry 4895 (class 2606 OID 53408)
-- Name: job_titles job_titles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_titles
    ADD CONSTRAINT job_titles_pkey PRIMARY KEY (id);


--
-- TOC entry 4911 (class 2606 OID 53485)
-- Name: ppe_items ppe_items_item_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ppe_items
    ADD CONSTRAINT ppe_items_item_code_key UNIQUE (item_code);


--
-- TOC entry 4913 (class 2606 OID 53487)
-- Name: ppe_items ppe_items_item_ref_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ppe_items
    ADD CONSTRAINT ppe_items_item_ref_code_key UNIQUE (item_ref_code);


--
-- TOC entry 4915 (class 2606 OID 53483)
-- Name: ppe_items ppe_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ppe_items
    ADD CONSTRAINT ppe_items_pkey PRIMARY KEY (id);


--
-- TOC entry 4943 (class 2606 OID 53660)
-- Name: request_items request_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_items
    ADD CONSTRAINT request_items_pkey PRIMARY KEY (id);


--
-- TOC entry 4941 (class 2606 OID 53602)
-- Name: requests requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_pkey PRIMARY KEY (id);


--
-- TOC entry 4869 (class 2606 OID 53903)
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- TOC entry 4871 (class 2606 OID 53905)
-- Name: roles roles_name_key1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key1 UNIQUE (name);


--
-- TOC entry 4873 (class 2606 OID 53356)
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- TOC entry 4885 (class 2606 OID 53378)
-- Name: sections sections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sections
    ADD CONSTRAINT sections_pkey PRIMARY KEY (id);


--
-- TOC entry 4966 (class 2606 OID 54018)
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- TOC entry 4921 (class 2606 OID 53502)
-- Name: size_scales size_scales_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.size_scales
    ADD CONSTRAINT size_scales_code_key UNIQUE (code);


--
-- TOC entry 4923 (class 2606 OID 53500)
-- Name: size_scales size_scales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.size_scales
    ADD CONSTRAINT size_scales_pkey PRIMARY KEY (id);


--
-- TOC entry 4925 (class 2606 OID 53512)
-- Name: sizes sizes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sizes
    ADD CONSTRAINT sizes_pkey PRIMARY KEY (id);


--
-- TOC entry 4937 (class 2606 OID 53554)
-- Name: stocks stocks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stocks
    ADD CONSTRAINT stocks_pkey PRIMARY KEY (id);


--
-- TOC entry 4902 (class 2606 OID 53451)
-- Name: users users_employee_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_employee_id_key UNIQUE (employee_id);


--
-- TOC entry 4904 (class 2606 OID 53447)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4906 (class 2606 OID 53449)
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- TOC entry 4886 (class 1259 OID 53399)
-- Name: cost_centers_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX cost_centers_code ON public.cost_centers USING btree (code);


--
-- TOC entry 4889 (class 1259 OID 53400)
-- Name: cost_centers_department_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cost_centers_department_id ON public.cost_centers USING btree (department_id);


--
-- TOC entry 4948 (class 1259 OID 54004)
-- Name: idx_budgets_company_budget_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budgets_company_budget_id ON public.budgets USING btree (company_budget_id);


--
-- TOC entry 4961 (class 1259 OID 53995)
-- Name: idx_company_budgets_fiscal_year; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_company_budgets_fiscal_year ON public.company_budgets USING btree (fiscal_year);


--
-- TOC entry 4929 (class 1259 OID 53544)
-- Name: job_title_ppe_matrix_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX job_title_ppe_matrix_category ON public.job_title_ppe_matrix USING btree (category);


--
-- TOC entry 4930 (class 1259 OID 53542)
-- Name: job_title_ppe_matrix_job_title; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX job_title_ppe_matrix_job_title ON public.job_title_ppe_matrix USING btree (job_title);


--
-- TOC entry 4933 (class 1259 OID 53543)
-- Name: job_title_ppe_matrix_ppe_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX job_title_ppe_matrix_ppe_item_id ON public.job_title_ppe_matrix USING btree (ppe_item_id);


--
-- TOC entry 4907 (class 1259 OID 53491)
-- Name: ppe_items_account_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ppe_items_account_code ON public.ppe_items USING btree (account_code);


--
-- TOC entry 4908 (class 1259 OID 53490)
-- Name: ppe_items_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ppe_items_category ON public.ppe_items USING btree (category);


--
-- TOC entry 4909 (class 1259 OID 53488)
-- Name: ppe_items_item_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ppe_items_item_code ON public.ppe_items USING btree (item_code);


--
-- TOC entry 4916 (class 1259 OID 53492)
-- Name: ppe_items_size_scale; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ppe_items_size_scale ON public.ppe_items USING btree (size_scale);


--
-- TOC entry 4964 (class 1259 OID 54019)
-- Name: settings_category_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX settings_category_key ON public.settings USING btree (category, key);


--
-- TOC entry 4918 (class 1259 OID 53504)
-- Name: size_scales_category_group; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX size_scales_category_group ON public.size_scales USING btree (category_group);


--
-- TOC entry 4919 (class 1259 OID 53503)
-- Name: size_scales_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX size_scales_code ON public.size_scales USING btree (code);


--
-- TOC entry 4926 (class 1259 OID 53519)
-- Name: sizes_scale_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sizes_scale_id ON public.sizes USING btree (scale_id);


--
-- TOC entry 4927 (class 1259 OID 53518)
-- Name: sizes_scale_id_value; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sizes_scale_id_value ON public.sizes USING btree (scale_id, value);


--
-- TOC entry 4928 (class 1259 OID 53520)
-- Name: sizes_sort_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sizes_sort_order ON public.sizes USING btree (sort_order);


--
-- TOC entry 4935 (class 1259 OID 53562)
-- Name: stocks_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stocks_location ON public.stocks USING btree (location);


--
-- TOC entry 4938 (class 1259 OID 53561)
-- Name: stocks_ppe_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stocks_ppe_item_id ON public.stocks USING btree (ppe_item_id);


--
-- TOC entry 4917 (class 1259 OID 53489)
-- Name: unique_item_ref_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX unique_item_ref_code ON public.ppe_items USING btree (item_ref_code);


--
-- TOC entry 4896 (class 1259 OID 53416)
-- Name: unique_job_title_per_section; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX unique_job_title_per_section ON public.job_titles USING btree (name, "sectionId");


--
-- TOC entry 4934 (class 1259 OID 53541)
-- Name: unique_job_title_ppe_item; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX unique_job_title_ppe_item ON public.job_title_ppe_matrix USING btree (job_title, ppe_item_id);


--
-- TOC entry 4939 (class 1259 OID 53560)
-- Name: unique_stock_variant; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX unique_stock_variant ON public.stocks USING btree (ppe_item_id, size, color, location);


--
-- TOC entry 4993 (class 2606 OID 53705)
-- Name: allocations allocations_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocations
    ADD CONSTRAINT allocations_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4994 (class 2606 OID 53710)
-- Name: allocations allocations_issued_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocations
    ADD CONSTRAINT allocations_issued_by_id_fkey FOREIGN KEY (issued_by_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4995 (class 2606 OID 53700)
-- Name: allocations allocations_ppe_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocations
    ADD CONSTRAINT allocations_ppe_item_id_fkey FOREIGN KEY (ppe_item_id) REFERENCES public.ppe_items(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4996 (class 2606 OID 53715)
-- Name: allocations allocations_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocations
    ADD CONSTRAINT allocations_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.requests(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 5005 (class 2606 OID 53832)
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4997 (class 2606 OID 53996)
-- Name: budgets budgets_company_budget_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_company_budget_id_fkey FOREIGN KEY (company_budget_id) REFERENCES public.company_budgets(id) ON DELETE SET NULL;


--
-- TOC entry 4998 (class 2606 OID 53747)
-- Name: budgets budgets_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4999 (class 2606 OID 53752)
-- Name: budgets budgets_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.sections(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 5010 (class 2606 OID 53990)
-- Name: company_budgets company_budgets_created_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_budgets
    ADD CONSTRAINT company_budgets_created_by_id_fkey FOREIGN KEY (created_by_id) REFERENCES public.users(id);


--
-- TOC entry 4968 (class 2606 OID 53394)
-- Name: cost_centers cost_centers_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cost_centers
    ADD CONSTRAINT cost_centers_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 5006 (class 2606 OID 53857)
-- Name: documents documents_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 5007 (class 2606 OID 53862)
-- Name: documents documents_uploaded_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_uploaded_by_id_fkey FOREIGN KEY (uploaded_by_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4970 (class 2606 OID 53432)
-- Name: employees employees_costCenterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT "employees_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES public.cost_centers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4971 (class 2606 OID 53437)
-- Name: employees employees_jobTitleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT "employees_jobTitleId_fkey" FOREIGN KEY ("jobTitleId") REFERENCES public.job_titles(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4972 (class 2606 OID 53427)
-- Name: employees employees_sectionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT "employees_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES public.sections(id) ON UPDATE CASCADE;


--
-- TOC entry 5000 (class 2606 OID 53810)
-- Name: failure_reports failure_reports_allocation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.failure_reports
    ADD CONSTRAINT failure_reports_allocation_id_fkey FOREIGN KEY (allocation_id) REFERENCES public.allocations(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 5001 (class 2606 OID 53800)
-- Name: failure_reports failure_reports_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.failure_reports
    ADD CONSTRAINT failure_reports_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON UPDATE CASCADE;


--
-- TOC entry 5002 (class 2606 OID 53805)
-- Name: failure_reports failure_reports_ppe_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.failure_reports
    ADD CONSTRAINT failure_reports_ppe_item_id_fkey FOREIGN KEY (ppe_item_id) REFERENCES public.ppe_items(id) ON UPDATE CASCADE;


--
-- TOC entry 5003 (class 2606 OID 53820)
-- Name: failure_reports failure_reports_replacement_stock_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.failure_reports
    ADD CONSTRAINT failure_reports_replacement_stock_id_fkey FOREIGN KEY (replacement_stock_id) REFERENCES public.stocks(id);


--
-- TOC entry 5004 (class 2606 OID 53815)
-- Name: failure_reports failure_reports_stock_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.failure_reports
    ADD CONSTRAINT failure_reports_stock_id_fkey FOREIGN KEY (stock_id) REFERENCES public.stocks(id);


--
-- TOC entry 5008 (class 2606 OID 53875)
-- Name: forecasts forecasts_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forecasts
    ADD CONSTRAINT forecasts_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 5009 (class 2606 OID 53880)
-- Name: forecasts forecasts_ppe_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forecasts
    ADD CONSTRAINT forecasts_ppe_item_id_fkey FOREIGN KEY (ppe_item_id) REFERENCES public.ppe_items(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4978 (class 2606 OID 53531)
-- Name: job_title_ppe_matrix job_title_ppe_matrix_jobTitleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_title_ppe_matrix
    ADD CONSTRAINT "job_title_ppe_matrix_jobTitleId_fkey" FOREIGN KEY ("jobTitleId") REFERENCES public.job_titles(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4979 (class 2606 OID 53536)
-- Name: job_title_ppe_matrix job_title_ppe_matrix_ppe_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_title_ppe_matrix
    ADD CONSTRAINT job_title_ppe_matrix_ppe_item_id_fkey FOREIGN KEY (ppe_item_id) REFERENCES public.ppe_items(id) ON UPDATE CASCADE;


--
-- TOC entry 4969 (class 2606 OID 53411)
-- Name: job_titles job_titles_sectionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_titles
    ADD CONSTRAINT "job_titles_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES public.sections(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4991 (class 2606 OID 53666)
-- Name: request_items request_items_ppe_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_items
    ADD CONSTRAINT request_items_ppe_item_id_fkey FOREIGN KEY (ppe_item_id) REFERENCES public.ppe_items(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4992 (class 2606 OID 53661)
-- Name: request_items request_items_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_items
    ADD CONSTRAINT request_items_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.requests(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4981 (class 2606 OID 53623)
-- Name: requests requests_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4982 (class 2606 OID 53638)
-- Name: requests requests_dept_rep_approver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_dept_rep_approver_id_fkey FOREIGN KEY (dept_rep_approver_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4983 (class 2606 OID 53613)
-- Name: requests requests_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4984 (class 2606 OID 53603)
-- Name: requests requests_fulfilled_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_fulfilled_by_user_id_fkey FOREIGN KEY (fulfilled_by_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4985 (class 2606 OID 53643)
-- Name: requests requests_hod_approver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_hod_approver_id_fkey FOREIGN KEY (hod_approver_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4986 (class 2606 OID 53608)
-- Name: requests requests_rejected_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_rejected_by_id_fkey FOREIGN KEY (rejected_by_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4987 (class 2606 OID 53618)
-- Name: requests requests_requested_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_requested_by_id_fkey FOREIGN KEY (requested_by_id) REFERENCES public.users(id) ON UPDATE CASCADE;


--
-- TOC entry 4988 (class 2606 OID 53628)
-- Name: requests requests_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.sections(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4989 (class 2606 OID 53633)
-- Name: requests requests_section_rep_approver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_section_rep_approver_id_fkey FOREIGN KEY (section_rep_approver_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4990 (class 2606 OID 53648)
-- Name: requests requests_stores_approver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_stores_approver_id_fkey FOREIGN KEY (stores_approver_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4967 (class 2606 OID 53924)
-- Name: sections sections_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sections
    ADD CONSTRAINT sections_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4977 (class 2606 OID 53513)
-- Name: sizes sizes_scale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sizes
    ADD CONSTRAINT sizes_scale_id_fkey FOREIGN KEY (scale_id) REFERENCES public.size_scales(id) ON UPDATE CASCADE;


--
-- TOC entry 4980 (class 2606 OID 53555)
-- Name: stocks stocks_ppe_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stocks
    ADD CONSTRAINT stocks_ppe_item_id_fkey FOREIGN KEY (ppe_item_id) REFERENCES public.ppe_items(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4973 (class 2606 OID 53929)
-- Name: users users_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- TOC entry 4974 (class 2606 OID 53452)
-- Name: users users_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4975 (class 2606 OID 53457)
-- Name: users users_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON UPDATE CASCADE;


--
-- TOC entry 4976 (class 2606 OID 53934)
-- Name: users users_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.sections(id);


-- Completed on 2025-12-17 16:10:40

--
-- PostgreSQL database dump complete
--

