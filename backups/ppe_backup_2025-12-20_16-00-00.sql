--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

-- Started on 2025-12-20 18:00:02

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
-- TOC entry 931 (class 1247 OID 18236)
-- Name: enum_allocations_allocation_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_allocations_allocation_type AS ENUM (
    'annual',
    'replacement',
    'emergency',
    'new-employee'
);


--
-- TOC entry 934 (class 1247 OID 18246)
-- Name: enum_allocations_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_allocations_status AS ENUM (
    'active',
    'expired',
    'replaced',
    'returned'
);


--
-- TOC entry 949 (class 1247 OID 18322)
-- Name: enum_budgets_period; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_budgets_period AS ENUM (
    'annual',
    'half-year',
    'quarterly',
    'monthly'
);


--
-- TOC entry 946 (class 1247 OID 18315)
-- Name: enum_budgets_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_budgets_status AS ENUM (
    'active',
    'expired',
    'draft'
);


--
-- TOC entry 940 (class 1247 OID 18290)
-- Name: enum_company_budgets_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_company_budgets_status AS ENUM (
    'draft',
    'active',
    'closed'
);


--
-- TOC entry 997 (class 1247 OID 18588)
-- Name: enum_consumable_request_items_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_consumable_request_items_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'fulfilled',
    'partial'
);


--
-- TOC entry 991 (class 1247 OID 18542)
-- Name: enum_consumable_requests_priority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_consumable_requests_priority AS ENUM (
    'low',
    'normal',
    'high',
    'urgent'
);


--
-- TOC entry 988 (class 1247 OID 18523)
-- Name: enum_consumable_requests_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_consumable_requests_status AS ENUM (
    'pending-hod-approval',
    'hod-approved',
    'hod-rejected',
    'stores-review',
    'stores-approved',
    'stores-rejected',
    'partially-fulfilled',
    'fulfilled',
    'cancelled'
);


--
-- TOC entry 970 (class 1247 OID 18438)
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
-- TOC entry 955 (class 1247 OID 18359)
-- Name: enum_failure_reports_failure_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_failure_reports_failure_type AS ENUM (
    'damage',
    'defect',
    'lost',
    'wear'
);


--
-- TOC entry 958 (class 1247 OID 18368)
-- Name: enum_failure_reports_severity; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_failure_reports_severity AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
);


--
-- TOC entry 961 (class 1247 OID 18378)
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
-- TOC entry 898 (class 1247 OID 18004)
-- Name: enum_ppe_items_item_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_ppe_items_item_type AS ENUM (
    'PPE',
    'CONSUMABLE',
    'EQUIPMENT',
    'LABORATORY'
);


--
-- TOC entry 922 (class 1247 OID 18148)
-- Name: enum_requests_request_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_requests_request_type AS ENUM (
    'new',
    'replacement',
    'emergency',
    'annual'
);


--
-- TOC entry 919 (class 1247 OID 18128)
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
-- TOC entry 236 (class 1259 OID 18255)
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
-- TOC entry 5169 (class 0 OID 0)
-- Dependencies: 236
-- Name: COLUMN allocations.replacement_frequency; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.allocations.replacement_frequency IS 'Replacement frequency in months';


--
-- TOC entry 5170 (class 0 OID 0)
-- Dependencies: 236
-- Name: COLUMN allocations.stock_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.allocations.stock_id IS 'Reference to the specific stock item allocated';


--
-- TOC entry 240 (class 1259 OID 18425)
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
-- TOC entry 5171 (class 0 OID 0)
-- Dependencies: 240
-- Name: COLUMN audit_logs.entity_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.audit_logs.entity_type IS 'Type of entity affected (e.g., Request, Allocation)';


--
-- TOC entry 5172 (class 0 OID 0)
-- Dependencies: 240
-- Name: COLUMN audit_logs.changes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.audit_logs.changes IS 'Before and after values';


--
-- TOC entry 5173 (class 0 OID 0)
-- Dependencies: 240
-- Name: COLUMN audit_logs.meta; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.audit_logs.meta IS 'Additional metadata';


--
-- TOC entry 238 (class 1259 OID 18331)
-- Name: budgets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.budgets (
    id uuid NOT NULL,
    company_budget_id uuid,
    department_id uuid NOT NULL,
    section_id uuid,
    fiscal_year integer NOT NULL,
    allocated_amount numeric(14,2) DEFAULT 0 NOT NULL,
    total_spent numeric(14,2) DEFAULT 0 NOT NULL,
    total_budget numeric(14,2),
    allocated_budget numeric(14,2) DEFAULT 0,
    remaining_budget numeric(14,2),
    status public.enum_budgets_status DEFAULT 'active'::public.enum_budgets_status,
    period public.enum_budgets_period DEFAULT 'annual'::public.enum_budgets_period,
    quarter integer,
    month integer,
    start_date date,
    end_date date,
    notes text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- TOC entry 5174 (class 0 OID 0)
-- Dependencies: 238
-- Name: COLUMN budgets.company_budget_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.budgets.company_budget_id IS 'Link to the company-wide budget this allocation comes from';


--
-- TOC entry 5175 (class 0 OID 0)
-- Dependencies: 238
-- Name: COLUMN budgets.section_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.budgets.section_id IS 'Optional - for section-specific budgets';


--
-- TOC entry 5176 (class 0 OID 0)
-- Dependencies: 238
-- Name: COLUMN budgets.allocated_amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.budgets.allocated_amount IS 'Amount allocated from company budget to this dept/section';


--
-- TOC entry 5177 (class 0 OID 0)
-- Dependencies: 238
-- Name: COLUMN budgets.total_spent; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.budgets.total_spent IS 'Actual amount spent (from fulfilled allocations)';


--
-- TOC entry 5178 (class 0 OID 0)
-- Dependencies: 238
-- Name: COLUMN budgets.total_budget; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.budgets.total_budget IS 'DEPRECATED: Use allocatedAmount instead';


--
-- TOC entry 5179 (class 0 OID 0)
-- Dependencies: 238
-- Name: COLUMN budgets.allocated_budget; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.budgets.allocated_budget IS 'DEPRECATED: Use totalSpent instead';


--
-- TOC entry 5180 (class 0 OID 0)
-- Dependencies: 238
-- Name: COLUMN budgets.remaining_budget; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.budgets.remaining_budget IS 'DEPRECATED: Use remaining virtual field instead';


--
-- TOC entry 237 (class 1259 OID 18297)
-- Name: company_budgets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_budgets (
    id uuid NOT NULL,
    fiscal_year integer NOT NULL,
    total_budget numeric(14,2) NOT NULL,
    allocated_to_departments numeric(14,2) DEFAULT 0 NOT NULL,
    total_spent numeric(14,2) DEFAULT 0 NOT NULL,
    status public.enum_company_budgets_status DEFAULT 'draft'::public.enum_company_budgets_status,
    start_date date,
    end_date date,
    notes text,
    created_by_id uuid,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- TOC entry 5181 (class 0 OID 0)
-- Dependencies: 237
-- Name: COLUMN company_budgets.fiscal_year; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.company_budgets.fiscal_year IS 'Fiscal year (e.g., 2025)';


--
-- TOC entry 5182 (class 0 OID 0)
-- Dependencies: 237
-- Name: COLUMN company_budgets.total_budget; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.company_budgets.total_budget IS 'Total company-wide PPE budget for the fiscal year';


--
-- TOC entry 5183 (class 0 OID 0)
-- Dependencies: 237
-- Name: COLUMN company_budgets.allocated_to_departments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.company_budgets.allocated_to_departments IS 'Total amount allocated to departments';


--
-- TOC entry 5184 (class 0 OID 0)
-- Dependencies: 237
-- Name: COLUMN company_budgets.total_spent; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.company_budgets.total_spent IS 'Total amount spent from allocations (auto-updated)';


--
-- TOC entry 5185 (class 0 OID 0)
-- Dependencies: 237
-- Name: COLUMN company_budgets.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.company_budgets.status IS 'Budget status';


--
-- TOC entry 5186 (class 0 OID 0)
-- Dependencies: 237
-- Name: COLUMN company_budgets.start_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.company_budgets.start_date IS 'Fiscal year start date';


--
-- TOC entry 5187 (class 0 OID 0)
-- Dependencies: 237
-- Name: COLUMN company_budgets.end_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.company_budgets.end_date IS 'Fiscal year end date';


--
-- TOC entry 248 (class 1259 OID 18618)
-- Name: consumable_allocations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.consumable_allocations (
    id uuid NOT NULL,
    consumable_request_id uuid,
    consumable_item_id uuid NOT NULL,
    section_id uuid NOT NULL,
    department_id uuid NOT NULL,
    issued_by_id uuid NOT NULL,
    received_by_id uuid,
    quantity numeric(12,2) NOT NULL,
    unit_price_u_s_d numeric(12,2),
    total_value_u_s_d numeric(15,2),
    issue_date timestamp with time zone NOT NULL,
    batch_number character varying(100),
    purpose text,
    notes text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- TOC entry 5188 (class 0 OID 0)
-- Dependencies: 248
-- Name: COLUMN consumable_allocations.consumable_request_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.consumable_allocations.consumable_request_id IS 'Link to original request (if any)';


--
-- TOC entry 5189 (class 0 OID 0)
-- Dependencies: 248
-- Name: COLUMN consumable_allocations.issued_by_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.consumable_allocations.issued_by_id IS 'Stores user who issued the items';


--
-- TOC entry 5190 (class 0 OID 0)
-- Dependencies: 248
-- Name: COLUMN consumable_allocations.received_by_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.consumable_allocations.received_by_id IS 'User who received the items (optional)';


--
-- TOC entry 244 (class 1259 OID 18495)
-- Name: consumable_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.consumable_items (
    id uuid NOT NULL,
    product_code character varying(50) NOT NULL,
    description character varying(255) NOT NULL,
    category character varying(50) NOT NULL,
    stock_account character varying(20) DEFAULT '710019'::character varying,
    unit character varying(20) DEFAULT 'EA'::character varying NOT NULL,
    unit_price numeric(12,2),
    unit_price_u_s_d numeric(12,2),
    min_level integer DEFAULT 5,
    max_level integer,
    reorder_point integer,
    is_active boolean DEFAULT true NOT NULL,
    notes text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- TOC entry 5191 (class 0 OID 0)
-- Dependencies: 244
-- Name: COLUMN consumable_items.product_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.consumable_items.product_code IS 'Unique product code (e.g., LA030301001)';


--
-- TOC entry 5192 (class 0 OID 0)
-- Dependencies: 244
-- Name: COLUMN consumable_items.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.consumable_items.description IS 'Product description';


--
-- TOC entry 5193 (class 0 OID 0)
-- Dependencies: 244
-- Name: COLUMN consumable_items.category; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.consumable_items.category IS 'Category code (e.g., CONS, GESP)';


--
-- TOC entry 5194 (class 0 OID 0)
-- Dependencies: 244
-- Name: COLUMN consumable_items.stock_account; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.consumable_items.stock_account IS 'Stock accounting code';


--
-- TOC entry 5195 (class 0 OID 0)
-- Dependencies: 244
-- Name: COLUMN consumable_items.unit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.consumable_items.unit IS 'Unit of measure (KG, EA, L, G, etc.)';


--
-- TOC entry 5196 (class 0 OID 0)
-- Dependencies: 244
-- Name: COLUMN consumable_items.unit_price; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.consumable_items.unit_price IS 'Unit price in local currency';


--
-- TOC entry 5197 (class 0 OID 0)
-- Dependencies: 244
-- Name: COLUMN consumable_items.unit_price_u_s_d; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.consumable_items.unit_price_u_s_d IS 'Unit price in USD';


--
-- TOC entry 5198 (class 0 OID 0)
-- Dependencies: 244
-- Name: COLUMN consumable_items.min_level; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.consumable_items.min_level IS 'Minimum stock level for alerts';


--
-- TOC entry 5199 (class 0 OID 0)
-- Dependencies: 244
-- Name: COLUMN consumable_items.max_level; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.consumable_items.max_level IS 'Maximum stock level';


--
-- TOC entry 5200 (class 0 OID 0)
-- Dependencies: 244
-- Name: COLUMN consumable_items.reorder_point; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.consumable_items.reorder_point IS 'Reorder point level';


--
-- TOC entry 247 (class 1259 OID 18599)
-- Name: consumable_request_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.consumable_request_items (
    id uuid NOT NULL,
    consumable_request_id uuid NOT NULL,
    consumable_item_id uuid NOT NULL,
    quantity_requested numeric(12,2) NOT NULL,
    quantity_approved numeric(12,2),
    quantity_fulfilled numeric(12,2) DEFAULT 0,
    unit_price_u_s_d numeric(12,2),
    total_value_u_s_d numeric(15,2),
    status public.enum_consumable_request_items_status DEFAULT 'pending'::public.enum_consumable_request_items_status NOT NULL,
    remarks text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- TOC entry 5201 (class 0 OID 0)
-- Dependencies: 247
-- Name: COLUMN consumable_request_items.quantity_requested; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.consumable_request_items.quantity_requested IS 'Quantity requested';


--
-- TOC entry 5202 (class 0 OID 0)
-- Dependencies: 247
-- Name: COLUMN consumable_request_items.quantity_approved; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.consumable_request_items.quantity_approved IS 'Quantity approved by HOD (may be less than requested)';


--
-- TOC entry 5203 (class 0 OID 0)
-- Dependencies: 247
-- Name: COLUMN consumable_request_items.quantity_fulfilled; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.consumable_request_items.quantity_fulfilled IS 'Quantity actually issued by stores';


--
-- TOC entry 5204 (class 0 OID 0)
-- Dependencies: 247
-- Name: COLUMN consumable_request_items.unit_price_u_s_d; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.consumable_request_items.unit_price_u_s_d IS 'Unit price at time of request';


--
-- TOC entry 5205 (class 0 OID 0)
-- Dependencies: 247
-- Name: COLUMN consumable_request_items.total_value_u_s_d; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.consumable_request_items.total_value_u_s_d IS 'Total value (quantity × unit price)';


--
-- TOC entry 246 (class 1259 OID 18551)
-- Name: consumable_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.consumable_requests (
    id uuid NOT NULL,
    request_number character varying(50),
    section_id uuid NOT NULL,
    department_id uuid NOT NULL,
    requested_by_id uuid NOT NULL,
    status public.enum_consumable_requests_status DEFAULT 'pending-hod-approval'::public.enum_consumable_requests_status NOT NULL,
    priority public.enum_consumable_requests_priority DEFAULT 'normal'::public.enum_consumable_requests_priority NOT NULL,
    request_date timestamp with time zone NOT NULL,
    required_by_date timestamp with time zone,
    purpose text,
    hod_approver_id uuid,
    hod_approval_date timestamp with time zone,
    hod_comments text,
    stores_approver_id uuid,
    stores_approval_date timestamp with time zone,
    stores_comments text,
    fulfilled_date timestamp with time zone,
    total_value_u_s_d numeric(15,2),
    notes text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- TOC entry 5206 (class 0 OID 0)
-- Dependencies: 246
-- Name: COLUMN consumable_requests.request_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.consumable_requests.request_number IS 'Auto-generated request number (e.g., CR-2024-0001)';


--
-- TOC entry 5207 (class 0 OID 0)
-- Dependencies: 246
-- Name: COLUMN consumable_requests.section_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.consumable_requests.section_id IS 'Section making the request';


--
-- TOC entry 5208 (class 0 OID 0)
-- Dependencies: 246
-- Name: COLUMN consumable_requests.department_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.consumable_requests.department_id IS 'Department of the section';


--
-- TOC entry 5209 (class 0 OID 0)
-- Dependencies: 246
-- Name: COLUMN consumable_requests.requested_by_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.consumable_requests.requested_by_id IS 'User who created the request (Section Rep)';


--
-- TOC entry 5210 (class 0 OID 0)
-- Dependencies: 246
-- Name: COLUMN consumable_requests.required_by_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.consumable_requests.required_by_date IS 'Date by which items are needed';


--
-- TOC entry 5211 (class 0 OID 0)
-- Dependencies: 246
-- Name: COLUMN consumable_requests.purpose; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.consumable_requests.purpose IS 'Reason/purpose for the request';


--
-- TOC entry 5212 (class 0 OID 0)
-- Dependencies: 246
-- Name: COLUMN consumable_requests.total_value_u_s_d; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.consumable_requests.total_value_u_s_d IS 'Total estimated value of request in USD';


--
-- TOC entry 245 (class 1259 OID 18508)
-- Name: consumable_stocks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.consumable_stocks (
    id uuid NOT NULL,
    consumable_item_id uuid NOT NULL,
    quantity numeric(12,2) DEFAULT 0 NOT NULL,
    unit_price numeric(12,2),
    unit_price_u_s_d numeric(12,2),
    total_value numeric(15,2),
    total_value_u_s_d numeric(15,2),
    location character varying(100) DEFAULT 'Main Store'::character varying,
    bin_location character varying(50),
    batch_number character varying(100),
    expiry_date timestamp with time zone,
    last_restocked timestamp with time zone,
    last_stock_take timestamp with time zone,
    notes text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- TOC entry 5213 (class 0 OID 0)
-- Dependencies: 245
-- Name: COLUMN consumable_stocks.consumable_item_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.consumable_stocks.consumable_item_id IS 'Reference to the consumable item';


--
-- TOC entry 5214 (class 0 OID 0)
-- Dependencies: 245
-- Name: COLUMN consumable_stocks.quantity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.consumable_stocks.quantity IS 'Current stock quantity (can be decimal for KG, L, etc.)';


--
-- TOC entry 5215 (class 0 OID 0)
-- Dependencies: 245
-- Name: COLUMN consumable_stocks.unit_price; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.consumable_stocks.unit_price IS 'Unit price in local currency';


--
-- TOC entry 5216 (class 0 OID 0)
-- Dependencies: 245
-- Name: COLUMN consumable_stocks.unit_price_u_s_d; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.consumable_stocks.unit_price_u_s_d IS 'Unit price in USD';


--
-- TOC entry 5217 (class 0 OID 0)
-- Dependencies: 245
-- Name: COLUMN consumable_stocks.total_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.consumable_stocks.total_value IS 'Total value (quantity × unit price) in local currency';


--
-- TOC entry 5218 (class 0 OID 0)
-- Dependencies: 245
-- Name: COLUMN consumable_stocks.total_value_u_s_d; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.consumable_stocks.total_value_u_s_d IS 'Total value in USD';


--
-- TOC entry 5219 (class 0 OID 0)
-- Dependencies: 245
-- Name: COLUMN consumable_stocks.bin_location; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.consumable_stocks.bin_location IS 'Specific bin or shelf location';


--
-- TOC entry 224 (class 1259 OID 17915)
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
-- TOC entry 5220 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN cost_centers.code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cost_centers.code IS 'Cost center code';


--
-- TOC entry 5221 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN cost_centers.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cost_centers.name IS 'Cost center name';


--
-- TOC entry 5222 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN cost_centers.department_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cost_centers.department_id IS 'Associated department';


--
-- TOC entry 222 (class 1259 OID 17890)
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
-- TOC entry 241 (class 1259 OID 18449)
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
-- TOC entry 226 (class 1259 OID 17948)
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
-- TOC entry 5223 (class 0 OID 0)
-- Dependencies: 226
-- Name: COLUMN employees."costCenterId"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.employees."costCenterId" IS 'Cost center for budget tracking';


--
-- TOC entry 5224 (class 0 OID 0)
-- Dependencies: 226
-- Name: COLUMN employees."jobTitleId"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.employees."jobTitleId" IS 'Reference to JobTitle entity';


--
-- TOC entry 5225 (class 0 OID 0)
-- Dependencies: 226
-- Name: COLUMN employees."jobTitle"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.employees."jobTitle" IS 'Legacy field - use jobTitleId instead';


--
-- TOC entry 5226 (class 0 OID 0)
-- Dependencies: 226
-- Name: COLUMN employees."jobType"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.employees."jobType" IS 'NEC or Salaried';


--
-- TOC entry 5227 (class 0 OID 0)
-- Dependencies: 226
-- Name: COLUMN employees."contractType"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.employees."contractType" IS 'e.g., PERMANENT, TERMINATED, CONTRACT';


--
-- TOC entry 239 (class 1259 OID 18389)
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
-- TOC entry 5228 (class 0 OID 0)
-- Dependencies: 239
-- Name: COLUMN failure_reports.stock_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.failure_reports.stock_id IS 'The stock item that failed';


--
-- TOC entry 5229 (class 0 OID 0)
-- Dependencies: 239
-- Name: COLUMN failure_reports.replacement_stock_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.failure_reports.replacement_stock_id IS 'The replacement stock item allocated';


--
-- TOC entry 5230 (class 0 OID 0)
-- Dependencies: 239
-- Name: COLUMN failure_reports.observed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.failure_reports.observed_at IS 'Location or section where failure observed';


--
-- TOC entry 5231 (class 0 OID 0)
-- Dependencies: 239
-- Name: COLUMN failure_reports.failure_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.failure_reports.failure_date IS 'Date when the failure occurred';


--
-- TOC entry 5232 (class 0 OID 0)
-- Dependencies: 239
-- Name: COLUMN failure_reports.brand; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.failure_reports.brand IS 'Brand or type of the PPE that failed';


--
-- TOC entry 5233 (class 0 OID 0)
-- Dependencies: 239
-- Name: COLUMN failure_reports.remarks; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.failure_reports.remarks IS 'Additional remarks or notes';


--
-- TOC entry 5234 (class 0 OID 0)
-- Dependencies: 239
-- Name: COLUMN failure_reports.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.failure_reports.status IS 'Workflow: Section Rep -> SHEQ Review -> Stores Processing -> Resolved/Replaced';


--
-- TOC entry 242 (class 1259 OID 18467)
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
-- TOC entry 231 (class 1259 OID 18063)
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
-- TOC entry 5235 (class 0 OID 0)
-- Dependencies: 231
-- Name: COLUMN job_title_ppe_matrix."jobTitleId"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.job_title_ppe_matrix."jobTitleId" IS 'Reference to JobTitle entity (new approach)';


--
-- TOC entry 5236 (class 0 OID 0)
-- Dependencies: 231
-- Name: COLUMN job_title_ppe_matrix.job_title; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.job_title_ppe_matrix.job_title IS 'Legacy: Job title string (deprecated - use jobTitleId instead)';


--
-- TOC entry 5237 (class 0 OID 0)
-- Dependencies: 231
-- Name: COLUMN job_title_ppe_matrix.ppe_item_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.job_title_ppe_matrix.ppe_item_id IS 'Reference to PPE item';


--
-- TOC entry 5238 (class 0 OID 0)
-- Dependencies: 231
-- Name: COLUMN job_title_ppe_matrix.quantity_required; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.job_title_ppe_matrix.quantity_required IS 'Quantity of this PPE item required per issue';


--
-- TOC entry 5239 (class 0 OID 0)
-- Dependencies: 231
-- Name: COLUMN job_title_ppe_matrix.replacement_frequency; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.job_title_ppe_matrix.replacement_frequency IS 'Standard replacement frequency in months (e.g., 8 months)';


--
-- TOC entry 5240 (class 0 OID 0)
-- Dependencies: 231
-- Name: COLUMN job_title_ppe_matrix.heavy_use_frequency; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.job_title_ppe_matrix.heavy_use_frequency IS 'Heavy use replacement frequency in months (e.g., 4 months)';


--
-- TOC entry 5241 (class 0 OID 0)
-- Dependencies: 231
-- Name: COLUMN job_title_ppe_matrix.is_mandatory; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.job_title_ppe_matrix.is_mandatory IS 'Whether this PPE is mandatory for this job title';


--
-- TOC entry 5242 (class 0 OID 0)
-- Dependencies: 231
-- Name: COLUMN job_title_ppe_matrix.category; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.job_title_ppe_matrix.category IS 'PPE category (BODY/TORSO, EARS, EYES/FACE, FEET, HANDS, etc.)';


--
-- TOC entry 5243 (class 0 OID 0)
-- Dependencies: 231
-- Name: COLUMN job_title_ppe_matrix.notes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.job_title_ppe_matrix.notes IS 'Additional notes or specifications for this job title';


--
-- TOC entry 225 (class 1259 OID 17932)
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
-- TOC entry 5244 (class 0 OID 0)
-- Dependencies: 225
-- Name: COLUMN job_titles."sectionId"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.job_titles."sectionId" IS 'Job titles belong to sections';


--
-- TOC entry 228 (class 1259 OID 18013)
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
-- TOC entry 5245 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN ppe_items.item_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ppe_items.item_code IS 'Internal item code for reference';


--
-- TOC entry 5246 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN ppe_items.item_ref_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ppe_items.item_ref_code IS 'External reference code (e.g., ITMREF_0 like SS053926002)';


--
-- TOC entry 5247 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN ppe_items.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ppe_items.name IS 'Product name or description';


--
-- TOC entry 5248 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN ppe_items.product_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ppe_items.product_name IS 'Full product name (ITMDES1_0 from inventory)';


--
-- TOC entry 5249 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN ppe_items.item_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ppe_items.item_type IS 'Type of item: PPE, CONSUMABLE, EQUIPMENT, or LABORATORY';


--
-- TOC entry 5250 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN ppe_items.category; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ppe_items.category IS 'PPE category (BODY/TORSO, EARS, EYES/FACE, FEET, HANDS, etc.) or item category (CONS, GESP)';


--
-- TOC entry 5251 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN ppe_items.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ppe_items.description IS 'Detailed description of the item';


--
-- TOC entry 5252 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN ppe_items.unit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ppe_items.unit IS 'Unit of measure (EA, KG, M, etc.)';


--
-- TOC entry 5253 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN ppe_items.replacement_frequency; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ppe_items.replacement_frequency IS 'Standard replacement frequency in months';


--
-- TOC entry 5254 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN ppe_items.heavy_use_frequency; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ppe_items.heavy_use_frequency IS 'Heavy use replacement frequency in months';


--
-- TOC entry 5255 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN ppe_items.account_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ppe_items.account_code IS 'Accounting code (e.g., PPEQ, PSS05, CONS)';


--
-- TOC entry 5256 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN ppe_items.account_description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ppe_items.account_description IS 'Account description (e.g., Personal Protective Equipment)';


--
-- TOC entry 5257 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN ppe_items.has_size_variants; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ppe_items.has_size_variants IS 'Whether this item comes in different sizes';


--
-- TOC entry 5258 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN ppe_items.has_color_variants; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ppe_items.has_color_variants IS 'Whether this item comes in different colors';


--
-- TOC entry 5259 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN ppe_items.size_scale; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ppe_items.size_scale IS 'References size_scales.code to indicate which size set applies';


--
-- TOC entry 5260 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN ppe_items.available_sizes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ppe_items.available_sizes IS 'JSON array of available sizes for this item (e.g., ["S", "M", "L", "XL"])';


--
-- TOC entry 5261 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN ppe_items.available_colors; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ppe_items.available_colors IS 'JSON array of available colors for this item (e.g., ["Blue", "Red", "Yellow"])';


--
-- TOC entry 235 (class 1259 OID 18217)
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
-- TOC entry 234 (class 1259 OID 18157)
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
-- TOC entry 221 (class 1259 OID 17880)
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
-- TOC entry 232 (class 1259 OID 18087)
-- Name: section_ppe_matrix; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.section_ppe_matrix (
    id uuid NOT NULL,
    section_id uuid NOT NULL,
    ppe_item_id uuid NOT NULL,
    quantity_required integer DEFAULT 1 NOT NULL,
    replacement_frequency integer,
    is_mandatory boolean DEFAULT true,
    notes text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- TOC entry 5262 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN section_ppe_matrix.section_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.section_ppe_matrix.section_id IS 'Reference to Section entity';


--
-- TOC entry 5263 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN section_ppe_matrix.ppe_item_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.section_ppe_matrix.ppe_item_id IS 'Reference to PPE item';


--
-- TOC entry 5264 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN section_ppe_matrix.quantity_required; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.section_ppe_matrix.quantity_required IS 'Quantity of this PPE item required per issue';


--
-- TOC entry 5265 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN section_ppe_matrix.replacement_frequency; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.section_ppe_matrix.replacement_frequency IS 'Standard replacement frequency in months';


--
-- TOC entry 5266 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN section_ppe_matrix.is_mandatory; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.section_ppe_matrix.is_mandatory IS 'Whether this PPE is mandatory for all employees in this section';


--
-- TOC entry 5267 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN section_ppe_matrix.notes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.section_ppe_matrix.notes IS 'Additional notes or specifications';


--
-- TOC entry 223 (class 1259 OID 17902)
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
-- TOC entry 243 (class 1259 OID 18485)
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
-- TOC entry 229 (class 1259 OID 18035)
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
-- TOC entry 5268 (class 0 OID 0)
-- Dependencies: 229
-- Name: COLUMN size_scales.code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.size_scales.code IS 'Identifier for the size scale (e.g., GARMENT_NUM, ALPHA)';


--
-- TOC entry 5269 (class 0 OID 0)
-- Dependencies: 229
-- Name: COLUMN size_scales.category_group; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.size_scales.category_group IS 'High-level PPE category grouping (BODY, FEET, HANDS, etc.)';


--
-- TOC entry 230 (class 1259 OID 18047)
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
-- TOC entry 5270 (class 0 OID 0)
-- Dependencies: 230
-- Name: COLUMN sizes.scale_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sizes.scale_id IS 'FK to size_scales.id';


--
-- TOC entry 5271 (class 0 OID 0)
-- Dependencies: 230
-- Name: COLUMN sizes.value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sizes.value IS 'Canonical value, e.g., 34, XS, 10, Std';


--
-- TOC entry 5272 (class 0 OID 0)
-- Dependencies: 230
-- Name: COLUMN sizes.label; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sizes.label IS 'Display label if different from value';


--
-- TOC entry 233 (class 1259 OID 18109)
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
-- TOC entry 5273 (class 0 OID 0)
-- Dependencies: 233
-- Name: COLUMN stocks.min_level; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stocks.min_level IS 'Minimum stock level for alerts';


--
-- TOC entry 5274 (class 0 OID 0)
-- Dependencies: 233
-- Name: COLUMN stocks.max_level; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stocks.max_level IS 'Maximum stock level for ordering';


--
-- TOC entry 5275 (class 0 OID 0)
-- Dependencies: 233
-- Name: COLUMN stocks.reorder_point; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stocks.reorder_point IS 'Reorder point to trigger purchase requests';


--
-- TOC entry 5276 (class 0 OID 0)
-- Dependencies: 233
-- Name: COLUMN stocks.unit_cost; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stocks.unit_cost IS 'Unit cost in local currency';


--
-- TOC entry 5277 (class 0 OID 0)
-- Dependencies: 233
-- Name: COLUMN stocks.unit_price_u_s_d; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stocks.unit_price_u_s_d IS 'Unit price in USD';


--
-- TOC entry 5278 (class 0 OID 0)
-- Dependencies: 233
-- Name: COLUMN stocks.total_value_u_s_d; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stocks.total_value_u_s_d IS 'Total stock value (quantity × unit price) in USD';


--
-- TOC entry 5279 (class 0 OID 0)
-- Dependencies: 233
-- Name: COLUMN stocks.stock_account; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stocks.stock_account IS 'Stock accounting account (e.g., 710019, 710021)';


--
-- TOC entry 5280 (class 0 OID 0)
-- Dependencies: 233
-- Name: COLUMN stocks.bin_location; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stocks.bin_location IS 'Specific bin or shelf location in warehouse';


--
-- TOC entry 5281 (class 0 OID 0)
-- Dependencies: 233
-- Name: COLUMN stocks.size; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stocks.size IS 'Size variant (e.g., S, M, L, XL, 6, 7, 8, etc.)';


--
-- TOC entry 5282 (class 0 OID 0)
-- Dependencies: 233
-- Name: COLUMN stocks.color; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stocks.color IS 'Color variant (e.g., Blue, Red, Yellow, etc.)';


--
-- TOC entry 5283 (class 0 OID 0)
-- Dependencies: 233
-- Name: COLUMN stocks.last_stock_take; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stocks.last_stock_take IS 'Last physical stock count date';


--
-- TOC entry 5284 (class 0 OID 0)
-- Dependencies: 233
-- Name: COLUMN stocks.eligible_departments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stocks.eligible_departments IS 'Array of department IDs that can access this stock. NULL means all departments';


--
-- TOC entry 5285 (class 0 OID 0)
-- Dependencies: 233
-- Name: COLUMN stocks.eligible_sections; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stocks.eligible_sections IS 'Array of section IDs that can access this stock. NULL means all sections';


--
-- TOC entry 227 (class 1259 OID 17973)
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    username character varying(100) NOT NULL,
    password_hash character varying(255) NOT NULL,
    employee_id uuid,
    role_id uuid NOT NULL,
    department_id uuid,
    section_id uuid,
    is_active boolean DEFAULT true,
    last_login timestamp with time zone,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- TOC entry 5286 (class 0 OID 0)
-- Dependencies: 227
-- Name: COLUMN users.employee_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.employee_id IS 'Link to Employee record - source of personal data';


--
-- TOC entry 5287 (class 0 OID 0)
-- Dependencies: 227
-- Name: COLUMN users.department_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.department_id IS 'For HOD/Department Rep - the department they manage';


--
-- TOC entry 5288 (class 0 OID 0)
-- Dependencies: 227
-- Name: COLUMN users.section_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.section_id IS 'For Section Rep - the section they manage';


--
-- TOC entry 5151 (class 0 OID 18255)
-- Dependencies: 236
-- Data for Name: allocations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.allocations (id, quantity, size, unit_cost, total_cost, issue_date, next_renewal_date, expiry_date, allocation_type, status, notes, replacement_frequency, stock_id, created_at, updated_at, ppe_item_id, employee_id, issued_by_id, request_id) FROM stdin;
\.


--
-- TOC entry 5155 (class 0 OID 18425)
-- Dependencies: 240
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_logs (id, action, entity_type, entity_id, changes, meta, ip_address, user_agent, created_at, user_id) FROM stdin;
bd262c69-63bf-4424-b636-f9d08cc22bfb	LOGIN	User	75fdd729-2394-41dc-ac58-048ff1adce90	\N	{"ip": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-19 09:41:29.366+02	75fdd729-2394-41dc-ac58-048ff1adce90
81b68ddd-eed0-4beb-9f37-62ee5ed3b276	LOGIN	User	75fdd729-2394-41dc-ac58-048ff1adce90	\N	{"ip": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-19 11:13:04.39+02	75fdd729-2394-41dc-ac58-048ff1adce90
c55aa350-6843-4b0b-a3c1-3c4918dcac92	LOGIN	User	75fdd729-2394-41dc-ac58-048ff1adce90	\N	{"ip": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-19 12:26:35.197+02	75fdd729-2394-41dc-ac58-048ff1adce90
dc7f3b28-54c8-4601-b07f-a67498984244	LOGIN	User	75fdd729-2394-41dc-ac58-048ff1adce90	\N	{"ip": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-19 13:10:58.471+02	75fdd729-2394-41dc-ac58-048ff1adce90
55922712-b1f5-4a07-800a-b5c6675b907e	LOGIN	User	75fdd729-2394-41dc-ac58-048ff1adce90	\N	{"ip": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-19 13:29:01.856+02	75fdd729-2394-41dc-ac58-048ff1adce90
94d4077e-b309-453b-8183-ab85652de6f4	LOGIN	User	75fdd729-2394-41dc-ac58-048ff1adce90	\N	{"ip": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-19 13:38:54.251+02	75fdd729-2394-41dc-ac58-048ff1adce90
b536c696-d059-421c-b36e-9e9458433380	LOGIN	User	75fdd729-2394-41dc-ac58-048ff1adce90	\N	{"ip": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-19 14:07:05.96+02	75fdd729-2394-41dc-ac58-048ff1adce90
e1747de0-5897-4747-93d2-33bdc6206e4f	LOGIN	User	75fdd729-2394-41dc-ac58-048ff1adce90	\N	{"ip": "::1", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-19 14:16:47.088+02	75fdd729-2394-41dc-ac58-048ff1adce90
aeb5e405-a24b-4c22-af17-d2aa99c7edf4	LOGIN	User	75fdd729-2394-41dc-ac58-048ff1adce90	\N	{"ip": "::ffff:192.168.2.40", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"}	::ffff:192.168.2.40	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-19 16:48:03.624+02	75fdd729-2394-41dc-ac58-048ff1adce90
f4474d99-dfa7-4bfa-9fab-0e72f2012de4	LOGIN	User	75fdd729-2394-41dc-ac58-048ff1adce90	\N	{"ip": "::ffff:192.168.2.40", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"}	::ffff:192.168.2.40	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-19 16:58:49.27+02	75fdd729-2394-41dc-ac58-048ff1adce90
c0d5bbc2-35e9-4c5d-bcb4-4f3ed92af0d5	BULK_CREATE	Department	\N	{"body": {"departments": [{"code": "001", "name": "MINING TECHNICAL SERVICES", "description": "Mining technical services including geology, survey and planning"}, {"code": "002", "name": "LABORATORY", "description": "Laboratory services and testing"}, {"code": "003", "name": "PROCESSING", "description": "Processing plant operations"}, {"code": "004", "name": "FINANCE & ADMIN", "description": "IT , Stores and Finance"}, {"code": "005", "name": "HEAD OFFICE", "description": "Head office administration"}, {"code": "006", "name": "MAINTENANCE", "description": "Maintenance department including mechanical, electrical, civils"}, {"code": "007", "name": "MINING", "description": "Mining operations"}, {"code": "008", "name": "HUMAN CAPITAL SUPPORT SERVICES", "description": "HR, CSIR and Site Co-ordination"}, {"code": "009", "name": "SHEQ", "description": "SHEQ"}], "skipDuplicates": true}, "query": {}, "params": {}}	{"url": "/api/v1/departments/bulk-upload", "method": "POST"}	::ffff:192.168.2.40	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-19 17:06:16.985+02	75fdd729-2394-41dc-ac58-048ff1adce90
1255b9ad-f8b3-42ab-940f-e86405f41fa0	CREATE	DEPARTMENTS	\N	{"body": {"departments": [{"code": "001", "name": "MINING TECHNICAL SERVICES", "description": "Mining technical services including geology, survey and planning"}, {"code": "002", "name": "LABORATORY", "description": "Laboratory services and testing"}, {"code": "003", "name": "PROCESSING", "description": "Processing plant operations"}, {"code": "004", "name": "FINANCE & ADMIN", "description": "IT , Stores and Finance"}, {"code": "005", "name": "HEAD OFFICE", "description": "Head office administration"}, {"code": "006", "name": "MAINTENANCE", "description": "Maintenance department including mechanical, electrical, civils"}, {"code": "007", "name": "MINING", "description": "Mining operations"}, {"code": "008", "name": "HUMAN CAPITAL SUPPORT SERVICES", "description": "HR, CSIR and Site Co-ordination"}, {"code": "009", "name": "SHEQ", "description": "SHEQ"}], "skipDuplicates": true}, "query": {}, "params": {}}	{"url": "/api/v1/departments/bulk-upload", "method": "POST", "statusCode": 201}	::ffff:192.168.2.40	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-19 17:06:16.985+02	75fdd729-2394-41dc-ac58-048ff1adce90
ae624882-ab5e-46cd-80d2-ac7dc2e09a87	CREATE	JOB_TITLES	\N	{"body": {"jobTitles": [{"name": "LABORATORY TECHNICIAN", "section": "LABORATORY", "department": "LABORATORY", "necSalaried": "SALARIED"}, {"name": "MINE ASSAYER", "section": "LABORATORY", "department": "LABORATORY", "necSalaried": "SALARIED"}, {"name": "LABORATORY ASSISTANT", "section": "LABORATORY", "department": "LABORATORY", "necSalaried": "NEC"}, {"name": "CHARGEHAND BUILDERS", "section": "CIVILS", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "CARPENTER CLASS 1", "section": "CIVILS", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "CIVILS SUPERVISOR", "section": "CIVILS", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "BUILDER", "section": "CIVILS", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "SEMI-SKILLED BUILDER", "section": "CIVILS", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "SEMI- SKILLED BUILDER", "section": "CIVILS", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "SEMI- SKILLED CARPENTER", "section": "CIVILS", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "SCAFFOLDERS ASSISTANT", "section": "CIVILS", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "GENERAL HAND", "section": "CIVILS", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "ELECTRICIAN CLASS 1", "section": "ELECTRICAL", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "ELECTRICIAN CLASS 2", "section": "ELECTRICAL", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "SENIOR ELECTRICAL AND INSTRUMENTATION SUPT", "section": "ELECTRICAL", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "CHARGEHAND INSTRUMENTATION", "section": "ELECTRICAL", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "CHARGEHAND ELECTRICAL", "section": "ELECTRICAL", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "JUNIOR ELECTRICAL ENGINEER", "section": "ELECTRICAL", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "ELECTRICAL MANAGER", "section": "ELECTRICAL", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "JUNIOR INSTRUMENTATION ENGINEER", "section": "ELECTRICAL", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "INSTRUMENTATION TECHNICIAN", "section": "ELECTRICAL", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "INSTRUMENTATION TECHNICAN", "section": "ELECTRICAL", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "ELECTRICIAN ASSISTANT", "section": "ELECTRICAL", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "SEMI- SKILLED ELECTRICIAN", "section": "ELECTRICAL", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "ELECTRICAL ASSISTANT", "section": "ELECTRICAL", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "INSTRUMENTS TECHS ASSISTANT", "section": "ELECTRICAL", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "INSTRUMENTATIONS ASSISTANT", "section": "ELECTRICAL", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "FITTER CLASS 1", "section": "MECHANICAL", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "FITTER CLASS 2", "section": "MECHANICAL", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "DRY PLANT FOREMAN", "section": "MECHANICAL", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "PLUMBER CLASS 1", "section": "MECHANICAL", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "PLUMBER CLASS 2", "section": "MECHANICAL", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "STRUCTURAL FITTING FOREMAN", "section": "MECHANICAL", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "MAINTENANCE ENGINEER", "section": "MECHANICAL", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "BELTS MAN", "section": "MECHANICAL", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "MECHANICAL MANAGER", "section": "MECHANICAL", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "ASSISTANT MECHANICAL ENGINEER", "section": "MECHANICAL", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "JUNIOR MECHANICAL ENGINEER", "section": "MECHANICAL", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "CHARGEHAND", "section": "MECHANICAL", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "CHARGE HAND FITTING WET PLANT", "section": "MECHANICAL", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "BOILERMAKER CLASS 1", "section": "MECHANICAL", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "CHARGEHAND BOILERMAKERS", "section": "MECHANICAL", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "WELDER CLASS 1", "section": "MECHANICAL", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "BOILER MAKER", "section": "MECHANICAL", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "CODED WELDER", "section": "MECHANICAL", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "FABRICATION FOREMAN", "section": "MECHANICAL", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "FITTERS ASSISTANT", "section": "MECHANICAL", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "FITTER ASSISTANT", "section": "MECHANICAL", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "PLUMBER ASSISTANT", "section": "MECHANICAL", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "BOILERMAKER ASSISTANT", "section": "MECHANICAL", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "BOILERMAKERS ASSISTANT", "section": "MECHANICAL", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "SCAFFOLDER ASSISTANT", "section": "MECHANICAL", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "SCAFFOLDER", "section": "MECHANICAL", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "SEMI SKILLED PAINTER", "section": "MECHANICAL", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "DRAUGHTSMAN", "section": "MM PLANNING", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "MAINTENANCE PLANNER", "section": "MM PLANNING", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "MAINTENANCE MANAGER", "section": "MM PLANNING", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "PLANNING FOREMAN", "section": "MM PLANNING", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "JUNIOR PLANNING ENGINEER", "section": "MM PLANNING", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "PLANNING CLERK", "section": "PLANNING", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "CLASS 2 DRIVER", "section": "PLANNING", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "STANDBY DRIVER", "section": "PLANNING", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "RIGGER CLASS 1", "section": "MOBILE WORKSHOP", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "TRANSPORT & SERVICES MANAGER", "section": "MOBILE WORKSHOP", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "TRANSPORT AND SERVICES CHARGE HAND", "section": "MOBILE WORKSHOP", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "AUTO ELECTRICIAN CLASS 1", "section": "MOBILE WORKSHOP", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "DIESEL PLANT FITTER", "section": "MOBILE WORKSHOP", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "TRACTOR DRIVER", "section": "MOBILE WORKSHOP", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "UD TRUCK DRIVER", "section": "MOBILE WORKSHOP", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "TLB OPERATOR", "section": "MOBILE WORKSHOP", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "EXCAVATOR OPERATOR", "section": "MOBILE WORKSHOP", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "FRONT END LOADER OPERATOR", "section": "MOBILE WORKSHOP", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "FEL OPERATOR", "section": "MOBILE WORKSHOP", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "CRANE OPERATOR", "section": "MOBILE WORKSHOP", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "MOBIL CRANE OPERATOR", "section": "MOBILE WORKSHOP", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "BUS DRIVER", "section": "MOBILE WORKSHOP", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "CLASS 1 BUS DRIVER", "section": "MOBILE WORKSHOP", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "UD CLASS 2 DRIVER", "section": "MOBILE WORKSHOP", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "TELEHANDLER OPERATOR", "section": "MOBILE WORKSHOP", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "ASSISTANT PLUMBER", "section": "MOBILE WORKSHOP", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "PLUMBERS ASSISTANT", "section": "MOBILE WORKSHOP", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "SEMI SKILLED PLUMBER", "section": "MOBILE WORKSHOP", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "WORKSHOP ASSISTANT", "section": "MOBILE WORKSHOP", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "WORKSHOP CLERK", "section": "MOBILE WORKSHOP", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "CIVIL ENGINEER", "section": "TAILS STORAGE FACILITY", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "CIVIL TECHNICIAN TSF", "section": "TAILS STORAGE FACILITY", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "TEAM LEADER", "section": "TAILS STORAGE FACILITY", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "DRIVER", "section": "TAILS STORAGE FACILITY", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "CLASS 4 DRIVER", "section": "TAILS STORAGE FACILITY", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "MINING ENGINEER", "section": "MINING", "department": "MINING", "necSalaried": "SALARIED"}, {"name": "SENIOR MINING ENGINEER", "section": "MINING", "department": "MINING", "necSalaried": "SALARIED"}, {"name": "SENIOR PIT SUPERINTENDENT", "section": "MINING", "department": "MINING", "necSalaried": "SALARIED"}, {"name": "PIT SUPERINTENDENT", "section": "MINING", "department": "MINING", "necSalaried": "SALARIED"}, {"name": "JUNIOR PIT SUPERINTENDENT", "section": "MINING", "department": "MINING", "necSalaried": "SALARIED"}, {"name": "MINING MANAGER", "section": "MINING", "department": "MINING", "necSalaried": "SALARIED"}, {"name": "EXPLORATION GEOLOGICAL TECHNICIAN", "section": "GEOLOGY", "department": "MINING TECHNICAL SERVICES", "necSalaried": "SALARIED"}, {"name": "EXPLORATION PROJECT MANAGER", "section": "GEOLOGY", "department": "MINING TECHNICAL SERVICES", "necSalaried": "SALARIED"}, {"name": "EXPLORATION GEOLOGIST", "section": "GEOLOGY", "department": "MINING TECHNICAL SERVICES", "necSalaried": "SALARIED"}, {"name": "DATABASE ADMINISTRATOR", "section": "GEOLOGY", "department": "MINING TECHNICAL SERVICES", "necSalaried": "SALARIED"}, {"name": "GEOLOGICAL TECHNICIAN", "section": "GEOLOGY", "department": "MINING TECHNICAL SERVICES", "necSalaried": "SALARIED"}, {"name": "RESIDENT GEOLOGIST", "section": "GEOLOGY", "department": "MINING TECHNICAL SERVICES", "necSalaried": "SALARIED"}, {"name": "JUNIOR GEOLOGIST", "section": "GEOLOGY", "department": "MINING TECHNICAL SERVICES", "necSalaried": "SALARIED"}, {"name": "GEOLOGIST", "section": "GEOLOGY", "department": "MINING TECHNICAL SERVICES", "necSalaried": "SALARIED"}, {"name": "CORE SHED ATTENDANT", "section": "GEOLOGY", "department": "MINING TECHNICAL SERVICES", "necSalaried": "NEC"}, {"name": "TRAINEE GEO TECH", "section": "GEOLOGY", "department": "MINING TECHNICAL SERVICES", "necSalaried": "NEC"}, {"name": "SAMPLER", "section": "GEOLOGY", "department": "MINING TECHNICAL SERVICES", "necSalaried": "NEC"}, {"name": "SAMPLER RC DRILLING", "section": "GEOLOGY", "department": "MINING TECHNICAL SERVICES", "necSalaried": "NEC"}, {"name": "SAMPLER (RC DRILLING)", "section": "GEOLOGY", "department": "MINING TECHNICAL SERVICES", "necSalaried": "NEC"}, {"name": "RC SAMPLER", "section": "GEOLOGY", "department": "MINING TECHNICAL SERVICES", "necSalaried": "NEC"}, {"name": "DATA CAPTURE CLERK", "section": "GEOLOGY", "department": "MINING TECHNICAL SERVICES", "necSalaried": "NEC"}, {"name": "DRILL RIG ASSISTANT", "section": "GEOLOGY", "department": "MINING TECHNICAL SERVICES", "necSalaried": "NEC"}, {"name": "GEOTECHNICAL ENGINEERING TECHNICIAN", "section": "GEOTECHNICAL ENGINEERING", "department": "MINING TECHNICAL SERVICES", "necSalaried": "SALARIED"}, {"name": "GEOTECHNICAL ENGINEER", "section": "GEOTECHNICAL ENGINEERING", "department": "MINING TECHNICAL SERVICES", "necSalaried": "SALARIED"}, {"name": "MINE PLANNING SUPERINTENDENT", "section": "PLANNING", "department": "MINING TECHNICAL SERVICES", "necSalaried": "SALARIED"}, {"name": "MINING TECHNICAL SERVICES MANAGER", "section": "PLANNING", "department": "MINING TECHNICAL SERVICES", "necSalaried": "SALARIED"}, {"name": "JUNIOR MINE PLANNING ENGINEER", "section": "PLANNING", "department": "MINING TECHNICAL SERVICES", "necSalaried": "SALARIED"}, {"name": "MINE PLANNING ENGINEER", "section": "PLANNING", "department": "MINING TECHNICAL SERVICES", "necSalaried": "SALARIED"}, {"name": "SURVEYOR", "section": "SURVEY", "department": "MINING TECHNICAL SERVICES", "necSalaried": "SALARIED"}, {"name": "CHIEF SURVEYOR", "section": "SURVEY", "department": "MINING TECHNICAL SERVICES", "necSalaried": "SALARIED"}, {"name": "SENIOR SURVEYOR", "section": "SURVEY", "department": "MINING TECHNICAL SERVICES", "necSalaried": "SALARIED"}, {"name": "SURVEY ASSISTANT", "section": "SURVEY", "department": "MINING TECHNICAL SERVICES", "necSalaried": "NEC"}, {"name": "METALLURGICAL TECHNICIAN", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "SALARIED"}, {"name": "PLANT PRODUCTION SUPERINTENDENT", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "SALARIED"}, {"name": "METALLURGICAL SUPERINTENDENT", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "SALARIED"}, {"name": "PROCESS CONTROL SUPERVISOR", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "SALARIED"}, {"name": "METALLURGICAL ENGINEER", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "SALARIED"}, {"name": "PROCESS CONTROL METALLURGIST", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "SALARIED"}, {"name": "PLANT LABORATORY METALLURGIST", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "SALARIED"}, {"name": "PLANT LABORATORY TECHNICIAN", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "SALARIED"}, {"name": "PLANT LABORATORY MET TECHNICIAN", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "SALARIED"}, {"name": "PROCESSING SYSTEMS ANALYST", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "SALARIED"}, {"name": "PLANT SUPERVISOR", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "SALARIED"}, {"name": "PROCESSING MANAGER", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "SALARIED"}, {"name": "TSF SUPERVISOR", "section": "TAILS STORAGE FACILITY", "department": "PROCESSING", "necSalaried": "SALARIED"}, {"name": "PLANT MANAGER", "section": "TAILS STORAGE FACILITY", "department": "PROCESSING", "necSalaried": "SALARIED"}, {"name": "CIL ASSISTANT", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "NEC"}, {"name": "CIL OPERATOR", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "NEC"}, {"name": "GENERAL ASSISTANT CIL", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "NEC"}, {"name": "RELIEF CREW ASSISTANT", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "NEC"}, {"name": "LEAVE RELIEF CREW", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "NEC"}, {"name": "GENERAL PLANT ATTENDANT", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "NEC"}, {"name": "GENERAL PLANT ASSISTANT", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "NEC"}, {"name": "ELUTION & REAGENTS ASSIST", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "NEC"}, {"name": "ELUTION OPERATOR", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "NEC"}, {"name": "ELUTION ASSISTANT", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "NEC"}, {"name": "BALLMILL ASSISTANT", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "NEC"}, {"name": "GENERAL MILL ASSISTANT", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "NEC"}, {"name": "MILL OPERATOR", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "NEC"}, {"name": "HOUSE KEEPING ASSISTANT", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "NEC"}, {"name": "PLANT LAB ATTENDANT", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "NEC"}, {"name": "METALLURGICAL CLERK", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "NEC"}, {"name": "PRIMARY CRUSHER OPERATOR", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "NEC"}, {"name": "PRIMARY CRUSHING OPERATOR", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "NEC"}, {"name": "PRIMARY CRUSHER ATTENDANT", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "NEC"}, {"name": "THICKENER OPERATOR", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "NEC"}, {"name": "REAGENTS & SMELTING CONTROLLER", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "NEC"}, {"name": "REAGENTS & SMELTING ASSISTANT", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "NEC"}, {"name": "SECONDARY & TERTIARY CRUSHER OPERATOR", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "NEC"}, {"name": "GENERAL SECONDARY & TERTIARY CRUSHING ASSIST", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "NEC"}, {"name": "TAILINGS STORAGE FACILITY OPERATOR", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "NEC"}, {"name": "TAILINGS STORAGE FACILITY ASSIST", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "NEC"}, {"name": "GENERAL MANAGER", "section": "ADMINISTRATION", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "SHARED SERVICES MANAGER", "section": "ADMINISTRATION", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "BUSINESS IMPROVEMENT MANAGER", "section": "ADMINISTRATION", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "BUSINESS IMPROVEMENT OFFICER", "section": "ADMINISTRATION", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "BOME HOUSES CONSTRUCTION SUPERVISOR", "section": "CSIR", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "COMMUNITY RELATIONS COORDINATOR", "section": "CSIR", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "ASSISTANT COMMUNITY RELATIONS OFFICER", "section": "CSIR", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "COMMUNITY RELATIONS OFFICER", "section": "CSIR", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "BOOK KEEPER", "section": "FINANCE", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "FINANCE & ADMINISTRATION MANAGER", "section": "FINANCE", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "ASSISTANT ACCOUNTANT", "section": "FINANCE", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "HUMAN CAPITAL SUPPORT SERVICES MANAGER", "section": "HUMAN RESOURCES", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "HR ADMINISTRATOR", "section": "HUMAN RESOURCES", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "HUMAN RESOURCES ASSISTANT", "section": "HUMAN RESOURCES", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "HUMAN RESOURCES SUPERINTENDENT", "section": "HUMAN RESOURCES", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "IT OFFICER", "section": "I.T", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "IT SUPERINTENDENT", "section": "I.T", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "SUPPORT TECHNICIAN", "section": "I.T", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "SECURITY OFFICER", "section": "SECURITY", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "SECURITY MANAGER", "section": "SECURITY", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "CCTV OPERATOR", "section": "SECURITY", "department": "SHARED SERVICES", "necSalaried": "NEC"}, {"name": "SHE MANAGER", "section": "SHEQ", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "SHE OFFICER PLANT", "section": "SHEQ", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "ENVIRONMENTAL & HYGIENE OFFICER", "section": "SHEQ", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "SHE ADMINISTRATOR", "section": "SHEQ", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "SHEQ SUPERINTENDENT", "section": "SHEQ", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "SHEQ AND ENVIRONMENTAL OFFICER", "section": "SHEQ", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "SHE ASSISTANT", "section": "SHEQ", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "FIRST AID TRAINER", "section": "SHEQ", "department": "SHARED SERVICES", "necSalaried": "NEC"}, {"name": "SITE COORDINATION OFFICER", "section": "SITE COORDINATION", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "CATERING AND HOUSEKEEPING SUPERVISOR", "section": "SITE COORDINATION", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "CHEF", "section": "SITE COORDINATION", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "HANDYMAN", "section": "SITE COORDINATION", "department": "SHARED SERVICES", "necSalaried": "NEC"}, {"name": "WELFARE WORKER", "section": "SITE COORDINATION", "department": "SHARED SERVICES", "necSalaried": "NEC"}, {"name": "COOK", "section": "SITE COORDINATION", "department": "SHARED SERVICES", "necSalaried": "NEC"}, {"name": "TEAM LEADER HOUSEKEEPING", "section": "SITE COORDINATION", "department": "SHARED SERVICES", "necSalaried": "NEC"}, {"name": "HOUSEKEEPER", "section": "SITE COORDINATION", "department": "SHARED SERVICES", "necSalaried": "NEC"}, {"name": "HOUSE KEEPER", "section": "SITE COORDINATION", "department": "SHARED SERVICES", "necSalaried": "NEC"}, {"name": "LAUNDRY ATTENDANT", "section": "SITE COORDINATION", "department": "SHARED SERVICES", "necSalaried": "NEC"}, {"name": "KITCHEN PORTER", "section": "SITE COORDINATION", "department": "SHARED SERVICES", "necSalaried": "NEC"}, {"name": "ISSUING OFFICER", "section": "STORES", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "ASSISTANT EXPEDITER", "section": "STORES", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "STORES CONTROLLER", "section": "STORES", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "STORES MANAGER", "section": "STORES", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "RECEIVING OFFICER", "section": "STORES", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "PYLOG ADMINISTRATOR", "section": "STORES", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "SENIOR STORES CLERK", "section": "STORES", "department": "SHARED SERVICES", "necSalaried": "NEC"}, {"name": "STORES CLERK", "section": "STORES", "department": "SHARED SERVICES", "necSalaried": "NEC"}, {"name": "STOREKEEPER", "section": "STORES", "department": "SHARED SERVICES", "necSalaried": "NEC"}, {"name": "GRADUATE TRAINEE", "section": "TRAINING", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "GRADUATE TRAINEE METALLURGY", "section": "TRAINING", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "ASSAY LABORATORY TECHNICIAN TRAINEE", "section": "TRAINING", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "SHEQ GRADUATE TRAINEE", "section": "TRAINING", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "GRADUATE TRAINEE MINING", "section": "TRAINING", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "TRAINING AND DEVELOPMENT OFFICER", "section": "TRAINING", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "GT MECHANICAL ENGINEERING", "section": "TRAINING", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "GRADUATE TRAINEE ACCOUNTING", "section": "TRAINING", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "APPRENTICE", "section": "TRAINING", "department": "SHARED SERVICES", "necSalaried": "NEC"}, {"name": "APPRENTICE BOILERMAKER", "section": "TRAINING", "department": "SHARED SERVICES", "necSalaried": "NEC"}, {"name": "STUDENT ON ATTACHEMENT", "section": "TRAINING", "department": "SHARED SERVICES", "necSalaried": "NEC"}, {"name": "STUDENT ON ATTACHMENT", "section": "TRAINING", "department": "SHARED SERVICES", "necSalaried": "NEC"}, {"name": "WAREHOUSE ASSISTANT", "section": "HEAD OFFICE", "department": "HEAD OFFICE", "necSalaried": "NEC"}, {"name": "OFFICE CLEANER", "section": "HEAD OFFICE", "department": "HEAD OFFICE", "necSalaried": "NEC"}], "skipDuplicates": true}, "query": {}, "params": {}}	{"url": "/api/v1/job-titles/bulk", "method": "POST", "statusCode": 201}	::ffff:192.168.2.40	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-19 17:10:09.56+02	75fdd729-2394-41dc-ac58-048ff1adce90
831cf302-3c48-4302-b555-fc7548bf7cb8	UPDATE	USERS	610926ab-85aa-43a4-af73-97c7df13a69c	{"body": {"roleId": "1abfb90b-03fc-4dc3-93a0-3a8ea58da828"}, "query": {}, "params": {"id": "610926ab-85aa-43a4-af73-97c7df13a69c"}}	{"url": "/api/v1/users/610926ab-85aa-43a4-af73-97c7df13a69c/change-role", "method": "PUT", "statusCode": 200}	::ffff:192.168.2.40	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-19 17:31:27.7+02	75fdd729-2394-41dc-ac58-048ff1adce90
18a90ce7-3751-4aeb-8211-8b011c76ef1b	CREATE	User	542e56df-94d9-47cf-9c70-842f858e9fe8	{"body": {"roleId": "1abfb90b-03fc-4dc3-93a0-3a8ea58da828", "password": "test.123", "username": "dp273", "sectionId": "", "employeeId": "1e51daf4-3910-4b39-82a7-fa2acfaebed7", "departmentId": ""}, "query": {}, "params": {}}	{"url": "/api/v1/users/promote-employee", "method": "POST"}	::ffff:192.168.2.40	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-19 17:32:03.097+02	75fdd729-2394-41dc-ac58-048ff1adce90
e18cfff7-e915-46e0-84e4-1e21f9ed4858	BULK_CREATE	Section	\N	{"body": {"sections": [{"name": "GEOLOGY", "department": "001", "description": "Geological services and exploration"}, {"name": "GEOTECHNICAL ENGINEERING", "department": "001", "description": "Geotechnical engineering services"}, {"name": "PLANNING", "department": "001", "description": "Mine planning and scheduling"}, {"name": "SURVEY", "department": "001", "description": "Survey and mapping services"}, {"name": "LABORATORY", "department": "002", "description": "Laboratory testing and analysis"}, {"name": "PROCESSING", "department": "003", "description": "Processing plant operations"}, {"name": "TAILS STORAGE FACILITY", "department": "003", "description": "Tailings storage facility operations"}, {"name": "ADMINISTRATION", "department": "004", "description": "Administrative services"}, {"name": "CSIR", "department": "004", "description": "CSIR related activities"}, {"name": "FINANCE", "department": "004", "description": "Financial services"}, {"name": "HUMAN RESOURCES", "department": "004", "description": "Human resources management"}, {"name": "I.T", "department": "004", "description": "Information technology services"}, {"name": "SECURITY", "department": "004", "description": "Security services"}, {"name": "SHEQ", "department": "004", "description": "Safety, Health, Environment and Quality"}, {"name": "SITE COORDINATION", "department": "004", "description": "Site coordination activities"}, {"name": "STORES", "department": "004", "description": "Stores and inventory management"}, {"name": "TRAINING", "department": "004", "description": "Training and development"}, {"name": "HEAD OFFICE", "department": "005", "description": "Head office operations"}, {"name": "CIVILS", "department": "006", "description": "Civil maintenance and construction"}, {"name": "ELECTRICAL", "department": "006", "description": "Electrical maintenance"}, {"name": "MECHANICAL", "department": "006", "description": "Mechanical maintenance"}, {"name": "MM PLANNING", "department": "006", "description": "Maintenance planning"}, {"name": "MOBILE WORKSHOP", "department": "006", "description": "Mobile workshop and field maintenance"}, {"name": "TAILS STORAGE FACILITY", "department": "006", "description": "TSF maintenance"}, {"name": "MINING", "department": "007", "description": "Mining operations"}], "skipDuplicates": true}, "query": {}, "params": {}}	{"url": "/api/v1/sections/bulk-upload", "method": "POST"}	::ffff:192.168.2.40	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-19 17:11:21.033+02	75fdd729-2394-41dc-ac58-048ff1adce90
f34636dc-40bd-4c3d-a249-2c795e4eba41	CREATE	SECTIONS	\N	{"body": {"sections": [{"name": "GEOLOGY", "department": "001", "description": "Geological services and exploration"}, {"name": "GEOTECHNICAL ENGINEERING", "department": "001", "description": "Geotechnical engineering services"}, {"name": "PLANNING", "department": "001", "description": "Mine planning and scheduling"}, {"name": "SURVEY", "department": "001", "description": "Survey and mapping services"}, {"name": "LABORATORY", "department": "002", "description": "Laboratory testing and analysis"}, {"name": "PROCESSING", "department": "003", "description": "Processing plant operations"}, {"name": "TAILS STORAGE FACILITY", "department": "003", "description": "Tailings storage facility operations"}, {"name": "ADMINISTRATION", "department": "004", "description": "Administrative services"}, {"name": "CSIR", "department": "004", "description": "CSIR related activities"}, {"name": "FINANCE", "department": "004", "description": "Financial services"}, {"name": "HUMAN RESOURCES", "department": "004", "description": "Human resources management"}, {"name": "I.T", "department": "004", "description": "Information technology services"}, {"name": "SECURITY", "department": "004", "description": "Security services"}, {"name": "SHEQ", "department": "004", "description": "Safety, Health, Environment and Quality"}, {"name": "SITE COORDINATION", "department": "004", "description": "Site coordination activities"}, {"name": "STORES", "department": "004", "description": "Stores and inventory management"}, {"name": "TRAINING", "department": "004", "description": "Training and development"}, {"name": "HEAD OFFICE", "department": "005", "description": "Head office operations"}, {"name": "CIVILS", "department": "006", "description": "Civil maintenance and construction"}, {"name": "ELECTRICAL", "department": "006", "description": "Electrical maintenance"}, {"name": "MECHANICAL", "department": "006", "description": "Mechanical maintenance"}, {"name": "MM PLANNING", "department": "006", "description": "Maintenance planning"}, {"name": "MOBILE WORKSHOP", "department": "006", "description": "Mobile workshop and field maintenance"}, {"name": "TAILS STORAGE FACILITY", "department": "006", "description": "TSF maintenance"}, {"name": "MINING", "department": "007", "description": "Mining operations"}], "skipDuplicates": true}, "query": {}, "params": {}}	{"url": "/api/v1/sections/bulk-upload", "method": "POST", "statusCode": 201}	::ffff:192.168.2.40	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-19 17:11:21.033+02	75fdd729-2394-41dc-ac58-048ff1adce90
88d6a81d-27b3-4089-a4cd-4f025d060a77	CREATE	JOB_TITLES	\N	{"body": {"jobTitles": [{"name": "LABORATORY TECHNICIAN", "section": "LABORATORY", "department": "LABORATORY", "necSalaried": "SALARIED"}, {"name": "MINE ASSAYER", "section": "LABORATORY", "department": "LABORATORY", "necSalaried": "SALARIED"}, {"name": "LABORATORY ASSISTANT", "section": "LABORATORY", "department": "LABORATORY", "necSalaried": "NEC"}, {"name": "CHARGEHAND BUILDERS", "section": "CIVILS", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "CARPENTER CLASS 1", "section": "CIVILS", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "CIVILS SUPERVISOR", "section": "CIVILS", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "BUILDER", "section": "CIVILS", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "SEMI-SKILLED BUILDER", "section": "CIVILS", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "SEMI- SKILLED BUILDER", "section": "CIVILS", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "SEMI- SKILLED CARPENTER", "section": "CIVILS", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "SCAFFOLDERS ASSISTANT", "section": "CIVILS", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "GENERAL HAND", "section": "CIVILS", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "ELECTRICIAN CLASS 1", "section": "ELECTRICAL", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "ELECTRICIAN CLASS 2", "section": "ELECTRICAL", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "SENIOR ELECTRICAL AND INSTRUMENTATION SUPT", "section": "ELECTRICAL", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "CHARGEHAND INSTRUMENTATION", "section": "ELECTRICAL", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "CHARGEHAND ELECTRICAL", "section": "ELECTRICAL", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "JUNIOR ELECTRICAL ENGINEER", "section": "ELECTRICAL", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "ELECTRICAL MANAGER", "section": "ELECTRICAL", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "JUNIOR INSTRUMENTATION ENGINEER", "section": "ELECTRICAL", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "INSTRUMENTATION TECHNICIAN", "section": "ELECTRICAL", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "INSTRUMENTATION TECHNICAN", "section": "ELECTRICAL", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "ELECTRICIAN ASSISTANT", "section": "ELECTRICAL", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "SEMI- SKILLED ELECTRICIAN", "section": "ELECTRICAL", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "ELECTRICAL ASSISTANT", "section": "ELECTRICAL", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "INSTRUMENTS TECHS ASSISTANT", "section": "ELECTRICAL", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "INSTRUMENTATIONS ASSISTANT", "section": "ELECTRICAL", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "FITTER CLASS 1", "section": "MECHANICAL", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "FITTER CLASS 2", "section": "MECHANICAL", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "DRY PLANT FOREMAN", "section": "MECHANICAL", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "PLUMBER CLASS 1", "section": "MECHANICAL", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "PLUMBER CLASS 2", "section": "MECHANICAL", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "STRUCTURAL FITTING FOREMAN", "section": "MECHANICAL", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "MAINTENANCE ENGINEER", "section": "MECHANICAL", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "BELTS MAN", "section": "MECHANICAL", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "MECHANICAL MANAGER", "section": "MECHANICAL", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "ASSISTANT MECHANICAL ENGINEER", "section": "MECHANICAL", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "JUNIOR MECHANICAL ENGINEER", "section": "MECHANICAL", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "CHARGEHAND", "section": "MECHANICAL", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "CHARGE HAND FITTING WET PLANT", "section": "MECHANICAL", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "BOILERMAKER CLASS 1", "section": "MECHANICAL", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "CHARGEHAND BOILERMAKERS", "section": "MECHANICAL", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "WELDER CLASS 1", "section": "MECHANICAL", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "BOILER MAKER", "section": "MECHANICAL", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "CODED WELDER", "section": "MECHANICAL", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "FABRICATION FOREMAN", "section": "MECHANICAL", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "FITTERS ASSISTANT", "section": "MECHANICAL", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "FITTER ASSISTANT", "section": "MECHANICAL", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "PLUMBER ASSISTANT", "section": "MECHANICAL", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "BOILERMAKER ASSISTANT", "section": "MECHANICAL", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "BOILERMAKERS ASSISTANT", "section": "MECHANICAL", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "SCAFFOLDER ASSISTANT", "section": "MECHANICAL", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "SCAFFOLDER", "section": "MECHANICAL", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "SEMI SKILLED PAINTER", "section": "MECHANICAL", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "DRAUGHTSMAN", "section": "MM PLANNING", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "MAINTENANCE PLANNER", "section": "MM PLANNING", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "MAINTENANCE MANAGER", "section": "MM PLANNING", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "PLANNING FOREMAN", "section": "MM PLANNING", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "JUNIOR PLANNING ENGINEER", "section": "MM PLANNING", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "PLANNING CLERK", "section": "PLANNING", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "CLASS 2 DRIVER", "section": "PLANNING", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "STANDBY DRIVER", "section": "PLANNING", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "RIGGER CLASS 1", "section": "MOBILE WORKSHOP", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "TRANSPORT & SERVICES MANAGER", "section": "MOBILE WORKSHOP", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "TRANSPORT AND SERVICES CHARGE HAND", "section": "MOBILE WORKSHOP", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "AUTO ELECTRICIAN CLASS 1", "section": "MOBILE WORKSHOP", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "DIESEL PLANT FITTER", "section": "MOBILE WORKSHOP", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "TRACTOR DRIVER", "section": "MOBILE WORKSHOP", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "UD TRUCK DRIVER", "section": "MOBILE WORKSHOP", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "TLB OPERATOR", "section": "MOBILE WORKSHOP", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "EXCAVATOR OPERATOR", "section": "MOBILE WORKSHOP", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "FRONT END LOADER OPERATOR", "section": "MOBILE WORKSHOP", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "FEL OPERATOR", "section": "MOBILE WORKSHOP", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "CRANE OPERATOR", "section": "MOBILE WORKSHOP", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "MOBIL CRANE OPERATOR", "section": "MOBILE WORKSHOP", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "BUS DRIVER", "section": "MOBILE WORKSHOP", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "CLASS 1 BUS DRIVER", "section": "MOBILE WORKSHOP", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "UD CLASS 2 DRIVER", "section": "MOBILE WORKSHOP", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "TELEHANDLER OPERATOR", "section": "MOBILE WORKSHOP", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "ASSISTANT PLUMBER", "section": "MOBILE WORKSHOP", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "PLUMBERS ASSISTANT", "section": "MOBILE WORKSHOP", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "SEMI SKILLED PLUMBER", "section": "MOBILE WORKSHOP", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "WORKSHOP ASSISTANT", "section": "MOBILE WORKSHOP", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "WORKSHOP CLERK", "section": "MOBILE WORKSHOP", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "CIVIL ENGINEER", "section": "TAILS STORAGE FACILITY", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "CIVIL TECHNICIAN TSF", "section": "TAILS STORAGE FACILITY", "department": "MAINTENANCE", "necSalaried": "SALARIED"}, {"name": "TEAM LEADER", "section": "TAILS STORAGE FACILITY", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "DRIVER", "section": "TAILS STORAGE FACILITY", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "CLASS 4 DRIVER", "section": "TAILS STORAGE FACILITY", "department": "MAINTENANCE", "necSalaried": "NEC"}, {"name": "MINING ENGINEER", "section": "MINING", "department": "MINING", "necSalaried": "SALARIED"}, {"name": "SENIOR MINING ENGINEER", "section": "MINING", "department": "MINING", "necSalaried": "SALARIED"}, {"name": "SENIOR PIT SUPERINTENDENT", "section": "MINING", "department": "MINING", "necSalaried": "SALARIED"}, {"name": "PIT SUPERINTENDENT", "section": "MINING", "department": "MINING", "necSalaried": "SALARIED"}, {"name": "JUNIOR PIT SUPERINTENDENT", "section": "MINING", "department": "MINING", "necSalaried": "SALARIED"}, {"name": "MINING MANAGER", "section": "MINING", "department": "MINING", "necSalaried": "SALARIED"}, {"name": "EXPLORATION GEOLOGICAL TECHNICIAN", "section": "GEOLOGY", "department": "MINING TECHNICAL SERVICES", "necSalaried": "SALARIED"}, {"name": "EXPLORATION PROJECT MANAGER", "section": "GEOLOGY", "department": "MINING TECHNICAL SERVICES", "necSalaried": "SALARIED"}, {"name": "EXPLORATION GEOLOGIST", "section": "GEOLOGY", "department": "MINING TECHNICAL SERVICES", "necSalaried": "SALARIED"}, {"name": "DATABASE ADMINISTRATOR", "section": "GEOLOGY", "department": "MINING TECHNICAL SERVICES", "necSalaried": "SALARIED"}, {"name": "GEOLOGICAL TECHNICIAN", "section": "GEOLOGY", "department": "MINING TECHNICAL SERVICES", "necSalaried": "SALARIED"}, {"name": "RESIDENT GEOLOGIST", "section": "GEOLOGY", "department": "MINING TECHNICAL SERVICES", "necSalaried": "SALARIED"}, {"name": "JUNIOR GEOLOGIST", "section": "GEOLOGY", "department": "MINING TECHNICAL SERVICES", "necSalaried": "SALARIED"}, {"name": "GEOLOGIST", "section": "GEOLOGY", "department": "MINING TECHNICAL SERVICES", "necSalaried": "SALARIED"}, {"name": "CORE SHED ATTENDANT", "section": "GEOLOGY", "department": "MINING TECHNICAL SERVICES", "necSalaried": "NEC"}, {"name": "TRAINEE GEO TECH", "section": "GEOLOGY", "department": "MINING TECHNICAL SERVICES", "necSalaried": "NEC"}, {"name": "SAMPLER", "section": "GEOLOGY", "department": "MINING TECHNICAL SERVICES", "necSalaried": "NEC"}, {"name": "SAMPLER RC DRILLING", "section": "GEOLOGY", "department": "MINING TECHNICAL SERVICES", "necSalaried": "NEC"}, {"name": "SAMPLER (RC DRILLING)", "section": "GEOLOGY", "department": "MINING TECHNICAL SERVICES", "necSalaried": "NEC"}, {"name": "RC SAMPLER", "section": "GEOLOGY", "department": "MINING TECHNICAL SERVICES", "necSalaried": "NEC"}, {"name": "DATA CAPTURE CLERK", "section": "GEOLOGY", "department": "MINING TECHNICAL SERVICES", "necSalaried": "NEC"}, {"name": "DRILL RIG ASSISTANT", "section": "GEOLOGY", "department": "MINING TECHNICAL SERVICES", "necSalaried": "NEC"}, {"name": "GEOTECHNICAL ENGINEERING TECHNICIAN", "section": "GEOTECHNICAL ENGINEERING", "department": "MINING TECHNICAL SERVICES", "necSalaried": "SALARIED"}, {"name": "GEOTECHNICAL ENGINEER", "section": "GEOTECHNICAL ENGINEERING", "department": "MINING TECHNICAL SERVICES", "necSalaried": "SALARIED"}, {"name": "MINE PLANNING SUPERINTENDENT", "section": "PLANNING", "department": "MINING TECHNICAL SERVICES", "necSalaried": "SALARIED"}, {"name": "MINING TECHNICAL SERVICES MANAGER", "section": "PLANNING", "department": "MINING TECHNICAL SERVICES", "necSalaried": "SALARIED"}, {"name": "JUNIOR MINE PLANNING ENGINEER", "section": "PLANNING", "department": "MINING TECHNICAL SERVICES", "necSalaried": "SALARIED"}, {"name": "MINE PLANNING ENGINEER", "section": "PLANNING", "department": "MINING TECHNICAL SERVICES", "necSalaried": "SALARIED"}, {"name": "SURVEYOR", "section": "SURVEY", "department": "MINING TECHNICAL SERVICES", "necSalaried": "SALARIED"}, {"name": "CHIEF SURVEYOR", "section": "SURVEY", "department": "MINING TECHNICAL SERVICES", "necSalaried": "SALARIED"}, {"name": "SENIOR SURVEYOR", "section": "SURVEY", "department": "MINING TECHNICAL SERVICES", "necSalaried": "SALARIED"}, {"name": "SURVEY ASSISTANT", "section": "SURVEY", "department": "MINING TECHNICAL SERVICES", "necSalaried": "NEC"}, {"name": "METALLURGICAL TECHNICIAN", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "SALARIED"}, {"name": "PLANT PRODUCTION SUPERINTENDENT", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "SALARIED"}, {"name": "METALLURGICAL SUPERINTENDENT", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "SALARIED"}, {"name": "PROCESS CONTROL SUPERVISOR", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "SALARIED"}, {"name": "METALLURGICAL ENGINEER", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "SALARIED"}, {"name": "PROCESS CONTROL METALLURGIST", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "SALARIED"}, {"name": "PLANT LABORATORY METALLURGIST", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "SALARIED"}, {"name": "PLANT LABORATORY TECHNICIAN", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "SALARIED"}, {"name": "PLANT LABORATORY MET TECHNICIAN", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "SALARIED"}, {"name": "PROCESSING SYSTEMS ANALYST", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "SALARIED"}, {"name": "PLANT SUPERVISOR", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "SALARIED"}, {"name": "PROCESSING MANAGER", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "SALARIED"}, {"name": "TSF SUPERVISOR", "section": "TAILS STORAGE FACILITY", "department": "PROCESSING", "necSalaried": "SALARIED"}, {"name": "PLANT MANAGER", "section": "TAILS STORAGE FACILITY", "department": "PROCESSING", "necSalaried": "SALARIED"}, {"name": "CIL ASSISTANT", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "NEC"}, {"name": "CIL OPERATOR", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "NEC"}, {"name": "GENERAL ASSISTANT CIL", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "NEC"}, {"name": "RELIEF CREW ASSISTANT", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "NEC"}, {"name": "LEAVE RELIEF CREW", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "NEC"}, {"name": "GENERAL PLANT ATTENDANT", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "NEC"}, {"name": "GENERAL PLANT ASSISTANT", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "NEC"}, {"name": "ELUTION & REAGENTS ASSIST", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "NEC"}, {"name": "ELUTION OPERATOR", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "NEC"}, {"name": "ELUTION ASSISTANT", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "NEC"}, {"name": "BALLMILL ASSISTANT", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "NEC"}, {"name": "GENERAL MILL ASSISTANT", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "NEC"}, {"name": "MILL OPERATOR", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "NEC"}, {"name": "HOUSE KEEPING ASSISTANT", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "NEC"}, {"name": "PLANT LAB ATTENDANT", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "NEC"}, {"name": "METALLURGICAL CLERK", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "NEC"}, {"name": "PRIMARY CRUSHER OPERATOR", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "NEC"}, {"name": "PRIMARY CRUSHING OPERATOR", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "NEC"}, {"name": "PRIMARY CRUSHER ATTENDANT", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "NEC"}, {"name": "THICKENER OPERATOR", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "NEC"}, {"name": "REAGENTS & SMELTING CONTROLLER", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "NEC"}, {"name": "REAGENTS & SMELTING ASSISTANT", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "NEC"}, {"name": "SECONDARY & TERTIARY CRUSHER OPERATOR", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "NEC"}, {"name": "GENERAL SECONDARY & TERTIARY CRUSHING ASSIST", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "NEC"}, {"name": "TAILINGS STORAGE FACILITY OPERATOR", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "NEC"}, {"name": "TAILINGS STORAGE FACILITY ASSIST", "section": "PROCESSING", "department": "PROCESSING", "necSalaried": "NEC"}, {"name": "GENERAL MANAGER", "section": "ADMINISTRATION", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "SHARED SERVICES MANAGER", "section": "ADMINISTRATION", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "BUSINESS IMPROVEMENT MANAGER", "section": "ADMINISTRATION", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "BUSINESS IMPROVEMENT OFFICER", "section": "ADMINISTRATION", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "BOME HOUSES CONSTRUCTION SUPERVISOR", "section": "CSIR", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "COMMUNITY RELATIONS COORDINATOR", "section": "CSIR", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "ASSISTANT COMMUNITY RELATIONS OFFICER", "section": "CSIR", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "COMMUNITY RELATIONS OFFICER", "section": "CSIR", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "BOOK KEEPER", "section": "FINANCE", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "FINANCE & ADMINISTRATION MANAGER", "section": "FINANCE", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "ASSISTANT ACCOUNTANT", "section": "FINANCE", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "HUMAN CAPITAL SUPPORT SERVICES MANAGER", "section": "HUMAN RESOURCES", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "HR ADMINISTRATOR", "section": "HUMAN RESOURCES", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "HUMAN RESOURCES ASSISTANT", "section": "HUMAN RESOURCES", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "HUMAN RESOURCES SUPERINTENDENT", "section": "HUMAN RESOURCES", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "IT OFFICER", "section": "I.T", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "IT SUPERINTENDENT", "section": "I.T", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "SUPPORT TECHNICIAN", "section": "I.T", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "SECURITY OFFICER", "section": "SECURITY", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "SECURITY MANAGER", "section": "SECURITY", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "CCTV OPERATOR", "section": "SECURITY", "department": "SHARED SERVICES", "necSalaried": "NEC"}, {"name": "SHE MANAGER", "section": "SHEQ", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "SHE OFFICER PLANT", "section": "SHEQ", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "ENVIRONMENTAL & HYGIENE OFFICER", "section": "SHEQ", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "SHE ADMINISTRATOR", "section": "SHEQ", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "SHEQ SUPERINTENDENT", "section": "SHEQ", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "SHEQ AND ENVIRONMENTAL OFFICER", "section": "SHEQ", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "SHE ASSISTANT", "section": "SHEQ", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "FIRST AID TRAINER", "section": "SHEQ", "department": "SHARED SERVICES", "necSalaried": "NEC"}, {"name": "SITE COORDINATION OFFICER", "section": "SITE COORDINATION", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "CATERING AND HOUSEKEEPING SUPERVISOR", "section": "SITE COORDINATION", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "CHEF", "section": "SITE COORDINATION", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "HANDYMAN", "section": "SITE COORDINATION", "department": "SHARED SERVICES", "necSalaried": "NEC"}, {"name": "WELFARE WORKER", "section": "SITE COORDINATION", "department": "SHARED SERVICES", "necSalaried": "NEC"}, {"name": "COOK", "section": "SITE COORDINATION", "department": "SHARED SERVICES", "necSalaried": "NEC"}, {"name": "TEAM LEADER HOUSEKEEPING", "section": "SITE COORDINATION", "department": "SHARED SERVICES", "necSalaried": "NEC"}, {"name": "HOUSEKEEPER", "section": "SITE COORDINATION", "department": "SHARED SERVICES", "necSalaried": "NEC"}, {"name": "HOUSE KEEPER", "section": "SITE COORDINATION", "department": "SHARED SERVICES", "necSalaried": "NEC"}, {"name": "LAUNDRY ATTENDANT", "section": "SITE COORDINATION", "department": "SHARED SERVICES", "necSalaried": "NEC"}, {"name": "KITCHEN PORTER", "section": "SITE COORDINATION", "department": "SHARED SERVICES", "necSalaried": "NEC"}, {"name": "ISSUING OFFICER", "section": "STORES", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "ASSISTANT EXPEDITER", "section": "STORES", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "STORES CONTROLLER", "section": "STORES", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "STORES MANAGER", "section": "STORES", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "RECEIVING OFFICER", "section": "STORES", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "PYLOG ADMINISTRATOR", "section": "STORES", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "SENIOR STORES CLERK", "section": "STORES", "department": "SHARED SERVICES", "necSalaried": "NEC"}, {"name": "STORES CLERK", "section": "STORES", "department": "SHARED SERVICES", "necSalaried": "NEC"}, {"name": "STOREKEEPER", "section": "STORES", "department": "SHARED SERVICES", "necSalaried": "NEC"}, {"name": "GRADUATE TRAINEE", "section": "TRAINING", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "GRADUATE TRAINEE METALLURGY", "section": "TRAINING", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "ASSAY LABORATORY TECHNICIAN TRAINEE", "section": "TRAINING", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "SHEQ GRADUATE TRAINEE", "section": "TRAINING", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "GRADUATE TRAINEE MINING", "section": "TRAINING", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "TRAINING AND DEVELOPMENT OFFICER", "section": "TRAINING", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "GT MECHANICAL ENGINEERING", "section": "TRAINING", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "GRADUATE TRAINEE ACCOUNTING", "section": "TRAINING", "department": "SHARED SERVICES", "necSalaried": "SALARIED"}, {"name": "APPRENTICE", "section": "TRAINING", "department": "SHARED SERVICES", "necSalaried": "NEC"}, {"name": "APPRENTICE BOILERMAKER", "section": "TRAINING", "department": "SHARED SERVICES", "necSalaried": "NEC"}, {"name": "STUDENT ON ATTACHEMENT", "section": "TRAINING", "department": "SHARED SERVICES", "necSalaried": "NEC"}, {"name": "STUDENT ON ATTACHMENT", "section": "TRAINING", "department": "SHARED SERVICES", "necSalaried": "NEC"}, {"name": "WAREHOUSE ASSISTANT", "section": "HEAD OFFICE", "department": "HEAD OFFICE", "necSalaried": "NEC"}, {"name": "OFFICE CLEANER", "section": "HEAD OFFICE", "department": "HEAD OFFICE", "necSalaried": "NEC"}], "skipDuplicates": true}, "query": {}, "params": {}}	{"url": "/api/v1/job-titles/bulk", "method": "POST", "statusCode": 201}	::ffff:192.168.2.40	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-19 17:11:52.388+02	75fdd729-2394-41dc-ac58-048ff1adce90
d57e138e-69ac-4366-81d8-05fb24e50038	BULK_CREATE	Employee	\N	{"body": {"employees": [{"Code": "DG028", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MUZAVAZI", "Contract": "TERMINATED", "FirstName": "ALBERT", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG135", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "WIZIMANI", "Contract": "TERMINATED", "FirstName": "ADMIRE", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG505", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "CHIMHARE", "Contract": "TERMINATED", "FirstName": "RODRECK", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG508", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "NGWENYA", "Contract": "TERMINATED", "FirstName": "WILSHER", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG628", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "NHAMOYEBONDE", "Contract": "TERMINATED", "FirstName": "MUNYARADZI", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG631", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "CHAMBA", "Contract": "TERMINATED", "FirstName": "SILAS", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG635", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MKANDAWIRE", "Contract": "TERMINATED", "FirstName": "DARLISON", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG749", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MAKAVA", "Contract": "TERMINATED", "FirstName": "TINEVIMBO", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG579", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "MAZHAMBE", "Contract": "TERMINATED", "FirstName": "PARTSON", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG590", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "MAZHAMBE", "Contract": "TERMINATED", "FirstName": "TAWANDA", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG593", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "GUMBURA", "Contract": "TERMINATED", "FirstName": "PASSMORE", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG621", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "CHIPFUNDE", "Contract": "TERMINATED", "FirstName": "HILLARY", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG725", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "CHIVEREVERE", "Contract": "TERMINATED", "FirstName": "TAFADZWA", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG740", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "BOTE", "Contract": "TERMINATED", "FirstName": "TINOBONGA", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG741", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MATASVA", "Contract": "TERMINATED", "FirstName": "MITCHELL", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG746", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MACHEKERA", "Contract": "TERMINATED", "FirstName": "NICOLE", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG748", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "BOME", "Contract": "TERMINATED", "FirstName": "TANAKA", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG761", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MAZHAMBE", "Contract": "TERMINATED", "FirstName": "SHUMIRAI", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG763", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MUNYUKI", "Contract": "TERMINATED", "FirstName": "ANESU", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG784", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "GWATINETSA", "Contract": "TERMINATED", "FirstName": "EMMANUEL", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DGZ062", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "CHIRIGA", "Contract": "ACTIVE", "FirstName": "TONDERAI", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "LABORATORY", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ063", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "NDIMANDE", "Contract": "ACTIVE", "FirstName": "NOVUYO", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "LABORATORY", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ064", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "MURAIRWA", "Contract": "ACTIVE", "FirstName": "JANIEL ANDREW", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "LABORATORY", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ088", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "MATEWA", "Contract": "ACTIVE", "FirstName": "SANDRA", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "LABORATORY", "Nec/ Salaried": "SALARIED"}, {"Code": "DP166", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "SHAPURE", "Contract": "ACTIVE", "FirstName": "AUGUSTINE", "Job Title": "MINE ASSAYER", "Cost centre": "LABORATORY", "Nec/ Salaried": "SALARIED"}, {"Code": "DP198", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "HOKO", "Contract": "ACTIVE", "FirstName": "FARAI", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "LABORATORY", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ013", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "CHIDO", "Contract": "ACTIVE", "FirstName": "STANWELL", "Job Title": "CHARGEHAND BUILDERS", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP071", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "NYATI", "Contract": "ACTIVE", "FirstName": "AGRIA", "Job Title": "CARPENTER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP082", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "NYAMBALO", "Contract": "ACTIVE", "FirstName": "WILLARD", "Job Title": "CIVILS SUPERVISOR", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ011", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "KONDO", "Contract": "ACTIVE", "FirstName": "SIBONGILE", "Job Title": "ELECTRICIAN CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ031", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "CHAPARAPATA", "Contract": "ACTIVE", "FirstName": "JOHNSON", "Job Title": "ELECTRICIAN CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP073", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "MWENYE", "Contract": "ACTIVE", "FirstName": "GAUNJE", "Job Title": "SENIOR ELECTRICAL AND INSTRUMENTATION SUPT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP197", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "NCUBE", "Contract": "ACTIVE", "FirstName": "JOSEPH", "Job Title": "CHARGEHAND INSTRUMENTATION", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP213", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "GOTEKA", "Contract": "ACTIVE", "FirstName": "TINASHE", "Job Title": "JUNIOR ELECTRICAL ENGINEER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP218", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "JAKARASI", "Contract": "ACTIVE", "FirstName": "TRYMORE", "Job Title": "ELECTRICAL MANAGER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP226", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "SUMANI", "Contract": "ACTIVE", "FirstName": "TAMARA", "Job Title": "JUNIOR INSTRUMENTATION ENGINEER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP245", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "KUBVORUNO", "Contract": "ACTIVE", "FirstName": "HEBERT", "Job Title": "INSTRUMENTATION TECHNICIAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP282", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "MASAMBA", "Contract": "ACTIVE", "FirstName": "GODFREY", "Job Title": "ELECTRICIAN CLASS 2", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP294", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "NLEYA", "Contract": "ACTIVE", "FirstName": "PROSPER", "Job Title": "INSTRUMENTATION TECHNICAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP296", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "MARINGIRENI", "Contract": "ACTIVE", "FirstName": "NESBERT", "Job Title": "ELECTRICIAN CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP303", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "MOYO", "Contract": "ACTIVE", "FirstName": "LAWRENCE", "Job Title": "CHARGEHAND ELECTRICAL", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP331", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "KASEMBE", "Contract": "ACTIVE", "FirstName": "ALI", "Job Title": "ELECTRICIAN CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP353", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "MUKO", "Contract": "ACTIVE", "FirstName": "BLESSING", "Job Title": "INSTRUMENTATION TECHNICIAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP355", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "CHAKWIZIRA", "Contract": "ACTIVE", "FirstName": "FISHER", "Job Title": "ELECTRICIAN CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP356", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "CHUDU", "Contract": "ACTIVE", "FirstName": "COSTA", "Job Title": "ELECTRICIAN CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP357", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "LANGWANI", "Contract": "ACTIVE", "FirstName": "TALENT", "Job Title": "ELECTRICIAN CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP358", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "MAKAYA", "Contract": "ACTIVE", "FirstName": "GIFT", "Job Title": "ELECTRICIAN CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ018", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "SHERENI", "Contract": "ACTIVE", "FirstName": "LISIAS", "Job Title": "FITTER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ019", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "CHATAIRA", "Contract": "ACTIVE", "FirstName": "JOHN", "Job Title": "FITTER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ024", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MATARUTSE", "Contract": "ACTIVE", "FirstName": "AMBROSE", "Job Title": "DRY PLANT FOREMAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ061", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MOTLOGWA", "Contract": "ACTIVE", "FirstName": "MOLISA", "Job Title": "PLUMBER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ075", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MUKANDE", "Contract": "ACTIVE", "FirstName": "ELISHA", "Job Title": "FITTER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ091", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MAFAIROSI", "Contract": "ACTIVE", "FirstName": "ANTHONY", "Job Title": "FITTER CLASS 2", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP089", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MUTONGA", "Contract": "ACTIVE", "FirstName": "PETRO", "Job Title": "STRUCTURAL FITTING FOREMAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP119", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MTUTU", "Contract": "ACTIVE", "FirstName": "WARREN", "Job Title": "MAINTENANCE ENGINEER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP175", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "TONGERA", "Contract": "ACTIVE", "FirstName": "MISI", "Job Title": "BELTS MAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP200", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MWAZHA", "Contract": "ACTIVE", "FirstName": "ELIAS", "Job Title": "MECHANICAL MANAGER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP214", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MACHIMBIRIKE", "Contract": "ACTIVE", "FirstName": "TINASHE", "Job Title": "ASSISTANT MECHANICAL ENGINEER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP236", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MUDZAMIRI", "Contract": "ACTIVE", "FirstName": "TARIRO", "Job Title": "JUNIOR MECHANICAL ENGINEER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP254", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MAJUTA", "Contract": "ACTIVE", "FirstName": "KNOWLEDGE", "Job Title": "FITTER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP255", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MUTANDWA", "Contract": "ACTIVE", "FirstName": "TERRENCE", "Job Title": "CHARGEHAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP330", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MUGUDA", "Contract": "ACTIVE", "FirstName": "EVARISTO", "Job Title": "FITTER CLASS 2", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP351", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "EZALA", "Contract": "ACTIVE", "FirstName": "LOVEMORE", "Job Title": "CHARGE HAND FITTING WET PLANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP010", "Gender": "MALE", "SECTION": "MM PLANNING", "Surname": "MUPINDUKI", "Contract": "ACTIVE", "FirstName": "FARAI", "Job Title": "DRAUGHTSMAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP112", "Gender": "MALE", "SECTION": "MM PLANNING", "Surname": "STEVENAGE", "Contract": "ACTIVE", "FirstName": "JAMES", "Job Title": "MAINTENANCE PLANNER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP167", "Gender": "MALE", "SECTION": "MM PLANNING", "Surname": "MUSENGEZI", "Contract": "ACTIVE", "FirstName": "STANFORD", "Job Title": "MAINTENANCE MANAGER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP190", "Gender": "MALE", "SECTION": "MM PLANNING", "Surname": "MAGWAZA", "Contract": "ACTIVE", "FirstName": "AGNES", "Job Title": "PLANNING FOREMAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP237", "Gender": "MALE", "SECTION": "MM PLANNING", "Surname": "JESE", "Contract": "ACTIVE", "FirstName": "GAMUCHIRAI", "Job Title": "JUNIOR  PLANNING ENGINEER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ001", "Gender": "MALE", "SECTION": "MECHANICAL", "Surname": "CHALEKA", "Contract": "ACTIVE", "FirstName": "COURAGE", "Job Title": "BOILERMAKER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ003", "Gender": "MALE", "SECTION": "MECHANICAL", "Surname": "JIRI", "Contract": "ACTIVE", "FirstName": "GODKNOWS", "Job Title": "BOILERMAKER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ010", "Gender": "MALE", "SECTION": "MECHANICAL", "Surname": "GADZE", "Contract": "ACTIVE", "FirstName": "ADMIRE", "Job Title": "CHARGEHAND BOILERMAKERS", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ016", "Gender": "MALE", "SECTION": "MECHANICAL", "Surname": "MHLANGA", "Contract": "ACTIVE", "FirstName": "NDABEZINHLE", "Job Title": "BOILERMAKER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ020", "Gender": "MALE", "SECTION": "MECHANICAL", "Surname": "CHENGO", "Contract": "ACTIVE", "FirstName": "DANIEL", "Job Title": "WELDER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ025", "Gender": "MALE", "SECTION": "MECHANICAL", "Surname": "ZINYAMA", "Contract": "ACTIVE", "FirstName": "SHEPHERD", "Job Title": "WELDER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ027", "Gender": "MALE", "SECTION": "MECHANICAL", "Surname": "MKWAIKI", "Contract": "ACTIVE", "FirstName": "ROBERT", "Job Title": "BOILER MAKER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ036", "Gender": "MALE", "SECTION": "MECHANICAL", "Surname": "KAPFUNDE", "Contract": "ACTIVE", "FirstName": "ARTHUR", "Job Title": "BOILERMAKER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ039", "Gender": "MALE", "SECTION": "MECHANICAL", "Surname": "NEZUNGAI", "Contract": "ACTIVE", "FirstName": "GEORGE", "Job Title": "BOILERMAKER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ041", "Gender": "MALE", "SECTION": "MECHANICAL", "Surname": "ALFONSO", "Contract": "ACTIVE", "FirstName": "OWEN", "Job Title": "CODED WELDER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ050", "Gender": "MALE", "SECTION": "MECHANICAL", "Surname": "TICHARWA", "Contract": "ACTIVE", "FirstName": "GABRIEL", "Job Title": "BOILERMAKER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ054", "Gender": "MALE", "SECTION": "MECHANICAL", "Surname": "CHINODA", "Contract": "ACTIVE", "FirstName": "COSTEN", "Job Title": "WELDER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ077", "Gender": "MALE", "SECTION": "MECHANICAL", "Surname": "MWASANGA", "Contract": "ACTIVE", "FirstName": "RAMUS", "Job Title": "BOILERMAKER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ079", "Gender": "MALE", "SECTION": "MECHANICAL", "Surname": "MANDIZHA", "Contract": "ACTIVE", "FirstName": "CLAYTON", "Job Title": "BOILERMAKER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP072", "Gender": "MALE", "SECTION": "MECHANICAL", "Surname": "MANJONDA", "Contract": "ACTIVE", "FirstName": "GIBSON", "Job Title": "FABRICATION FOREMAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ017", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "NGWENYA", "Contract": "ACTIVE", "FirstName": "ARTASHASTAH", "Job Title": "PLUMBER CLASS 2", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ028", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MUTODZA", "Contract": "ACTIVE", "FirstName": "MUNASHE", "Job Title": "RIGGER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ029", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "TAGA-DAGA", "Contract": "ACTIVE", "FirstName": "REUBEN", "Job Title": "BOILERMAKER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ084", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MANDIGORA", "Contract": "ACTIVE", "FirstName": "AARON", "Job Title": "PLUMBER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP174", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "NJANJENI", "Contract": "ACTIVE", "FirstName": "EMMANUEL", "Job Title": "RIGGER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP201", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "HANHART", "Contract": "ACTIVE", "FirstName": "JOHN", "Job Title": "TRANSPORT & SERVICES MANAGER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP244", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MHARIWA", "Contract": "ACTIVE", "FirstName": "ENOCK", "Job Title": "TRANSPORT AND SERVICES CHARGE HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP297", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "JEREMIAH", "Contract": "ACTIVE", "FirstName": "KOROFATI", "Job Title": "PLUMBER CLASS 2", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP298", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MHEMBERE", "Contract": "ACTIVE", "FirstName": "WALTER", "Job Title": "PLUMBER CLASS 2", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP300", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "JIM", "Contract": "ACTIVE", "FirstName": "PROSPER", "Job Title": "AUTO ELECTRICIAN CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP301", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "NYAMUROWA", "Contract": "ACTIVE", "FirstName": "VICTOR", "Job Title": "DIESEL PLANT FITTER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP322", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "TEMBO", "Contract": "ACTIVE", "FirstName": "KARL", "Job Title": "RIGGER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP323", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "GUNDA", "Contract": "ACTIVE", "FirstName": "KASSAN", "Job Title": "RIGGER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP354", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "NYONI", "Contract": "ACTIVE", "FirstName": "PETER", "Job Title": "AUTO ELECTRICIAN CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP363", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MTEKI", "Contract": "ACTIVE", "FirstName": "TANAKA", "Job Title": "DIESEL PLANT FITTER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP212", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "SAUNGWEME", "Contract": "ACTIVE", "FirstName": "TINASHE", "Job Title": "CIVIL ENGINEER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP305", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "USHE", "Contract": "ACTIVE", "FirstName": "TAFADZWA", "Job Title": "CIVIL TECHNICIAN TSF", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP156", "Gender": "MALE", "SECTION": "MINING", "Surname": "CHUMA", "Contract": "ACTIVE", "FirstName": "OLIVER SIMBA", "Job Title": "MINING ENGINEER", "Cost centre": "MINING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP159", "Gender": "MALE", "SECTION": "MINING", "Surname": "CHAWIRA", "Contract": "ACTIVE", "FirstName": "DESMOND", "Job Title": "SENIOR MINING ENGINEER", "Cost centre": "MINING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP165", "Gender": "MALE", "SECTION": "MINING", "Surname": "MAZANA", "Contract": "ACTIVE", "FirstName": "TAWEDZEGWA", "Job Title": "SENIOR PIT SUPERINTENDENT", "Cost centre": "MINING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP178", "Gender": "MALE", "SECTION": "MINING", "Surname": "NCUBE", "Contract": "ACTIVE", "FirstName": "STANLEY", "Job Title": "PIT SUPERINTENDENT", "Cost centre": "MINING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP234", "Gender": "MALE", "SECTION": "MINING", "Surname": "KATANDA", "Contract": "ACTIVE", "FirstName": "COBURN", "Job Title": "MINING MANAGER", "Cost centre": "MINING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP274", "Gender": "MALE", "SECTION": "MINING", "Surname": "MASONA", "Contract": "ACTIVE", "FirstName": "RYAN", "Job Title": "JUNIOR PIT SUPERINTENDENT", "Cost centre": "MINING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP359", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "ZENGENI", "Contract": "ACTIVE", "FirstName": "ELAINE", "Job Title": "EXPLORATION GEOLOGICAL TECHNICIAN", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP360", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "SAUNGWEME", "Contract": "ACTIVE", "FirstName": "LUCKSTONE", "Job Title": "EXPLORATION PROJECT MANAGER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP361", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "MUDZINGWA", "Contract": "ACTIVE", "FirstName": "TINASHE", "Job Title": "EXPLORATION GEOLOGIST", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP117", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "GEREMA", "Contract": "ACTIVE", "FirstName": "NYASHA", "Job Title": "DATABASE ADMINISTRATOR", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP163", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "LESAYA", "Contract": "ACTIVE", "FirstName": "WISDOM", "Job Title": "GEOLOGICAL TECHNICIAN", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP181", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "MUONEKA", "Contract": "ACTIVE", "FirstName": "BENEFIT", "Job Title": "RESIDENT GEOLOGIST", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP186", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "PORE", "Contract": "ACTIVE", "FirstName": "TATENDA", "Job Title": "JUNIOR GEOLOGIST", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP235", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "MATEVEKE", "Contract": "ACTIVE", "FirstName": "MARTIN", "Job Title": "GEOLOGIST", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP265", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "CHAKAWA", "Contract": "ACTIVE", "FirstName": "KUDAKWASHE", "Job Title": "GEOLOGICAL TECHNICIAN", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP139", "Gender": "MALE", "SECTION": "GEOTECHNICAL ENGINEERING", "Surname": "LULA", "Contract": "ACTIVE", "FirstName": "GUNUKA LUZIBO", "Job Title": "GEOTECHNICAL ENGINEERING TECHNICIAN", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP158", "Gender": "MALE", "SECTION": "GEOTECHNICAL ENGINEERING", "Surname": "GUNYANJA", "Contract": "ACTIVE", "FirstName": "TAKUDZWA", "Job Title": "GEOTECHNICAL ENGINEERING TECHNICIAN", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP306", "Gender": "MALE", "SECTION": "GEOTECHNICAL ENGINEERING", "Surname": "NYAMANDE", "Contract": "ACTIVE", "FirstName": "PARDON", "Job Title": "GEOTECHNICAL ENGINEER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP110", "Gender": "MALE", "SECTION": "PLANNING ", "Surname": "NEMADIRE", "Contract": "ACTIVE", "FirstName": "TINASHE", "Job Title": "MINE PLANNING SUPERINTENDENT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP128", "Gender": "MALE", "SECTION": "PLANNING ", "Surname": "ZVARAYA", "Contract": "ACTIVE", "FirstName": "MICHAEL", "Job Title": "MINING TECHNICAL SERVICES MANAGER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP157", "Gender": "MALE", "SECTION": "PLANNING ", "Surname": "TARWIREI", "Contract": "ACTIVE", "FirstName": "TINASHE", "Job Title": "JUNIOR MINE PLANNING ENGINEER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP219", "Gender": "MALE", "SECTION": "PLANNING ", "Surname": "NYIRENDA", "Contract": "ACTIVE", "FirstName": "ROBERT", "Job Title": "MINE PLANNING ENGINEER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP097", "Gender": "MALE", "SECTION": "SURVEY", "Surname": "MKANDLA", "Contract": "ACTIVE", "FirstName": "MZAMO", "Job Title": "SURVEYOR", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP100", "Gender": "MALE", "SECTION": "SURVEY", "Surname": "NGULUBE", "Contract": "ACTIVE", "FirstName": "COLLETTE", "Job Title": "CHIEF SURVEYOR", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP215", "Gender": "MALE", "SECTION": "SURVEY", "Surname": "MUJAJATI", "Contract": "ACTIVE", "FirstName": "GAMUCHIRAI", "Job Title": "SURVEYOR", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP266", "Gender": "MALE", "SECTION": "SURVEY", "Surname": "MUSHONGA", "Contract": "ACTIVE", "FirstName": "HILARY", "Job Title": "SENIOR SURVEYOR", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ090", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "NOKO", "Contract": "ACTIVE", "FirstName": "TSEPO", "Job Title": "METALLURGICAL TECHNICIAN", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP251", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "NGIRANDI", "Contract": "ACTIVE", "FirstName": "BRIDGET", "Job Title": "METALLURGICAL TECHNICIAN", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP131", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "CHIKEREMA", "Contract": "ACTIVE", "FirstName": "VICTOR", "Job Title": "PLANT PRODUCTION SUPERINTENDENT", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP136", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "SITHOLE", "Contract": "ACTIVE", "FirstName": "STEWARD", "Job Title": "METALLURGICAL SUPERINTENDENT", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP137", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "CHIBAMU", "Contract": "ACTIVE", "FirstName": "GERALDINE", "Job Title": "PROCESS CONTROL SUPERVISOR", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP161", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "NYABANGA", "Contract": "ACTIVE", "FirstName": "THELMA", "Job Title": "METALLURGICAL ENGINEER", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP188", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "CHIORESO", "Contract": "ACTIVE", "FirstName": "ABGAIL", "Job Title": "PROCESS CONTROL METALLURGIST", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP228", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "MAGANGA", "Contract": "ACTIVE", "FirstName": "RUTENDO", "Job Title": "PLANT LABORATORY METALLURGIST", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP240", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "MAPOSAH", "Contract": "ACTIVE", "FirstName": "MICHELLE", "Job Title": "PROCESS CONTROL METALLURGIST", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP307", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "NCUBE", "Contract": "ACTIVE", "FirstName": "PRINCESS", "Job Title": "PROCESS CONTROL METALLURGIST", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP332", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "DUBE", "Contract": "ACTIVE", "FirstName": "BUKHOSI", "Job Title": "PLANT LABORATORY TECHNICIAN", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP334", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "KHOWA", "Contract": "ACTIVE", "FirstName": "LOUIS", "Job Title": "PROCESSING SYSTEMS ANALYST", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP335", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "MAZVIYO", "Contract": "ACTIVE", "FirstName": "RUMBIDZAI", "Job Title": "PLANT LABORATORY MET TECHNICIAN", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP125", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "JERE", "Contract": "ACTIVE", "FirstName": "ROBERT", "Job Title": "PLANT SUPERVISOR", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP134", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "ZINHU", "Contract": "ACTIVE", "FirstName": "TANYARADZWA", "Job Title": "PLANT SUPERVISOR", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP187", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "MUREVERWI", "Contract": "ACTIVE", "FirstName": "LIONEL", "Job Title": "PLANT SUPERVISOR", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP320", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "MUNODAWAFA", "Contract": "ACTIVE", "FirstName": "OBERT", "Job Title": "PROCESSING MANAGER", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP339", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "MUSAPINGURA", "Contract": "ACTIVE", "FirstName": "VISION", "Job Title": "METALLURGICAL ENGINEER", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP129", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "KHUPE", "Contract": "ACTIVE", "FirstName": "MALVIN", "Job Title": "TSF SUPERVISOR", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP252", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MANDIZIBA", "Contract": "ACTIVE", "FirstName": "JOHANNES", "Job Title": "TSF SUPERVISOR", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP299", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MAHACHI", "Contract": "ACTIVE", "FirstName": "CHAKANETSA", "Job Title": "PLANT MANAGER", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP108", "Gender": "MALE", "SECTION": "ADMINISTRATION", "Surname": "BANDA", "Contract": "ACTIVE", "FirstName": "NELSON", "Job Title": "GENERAL MANAGER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP284", "Gender": "MALE", "SECTION": "ADMINISTRATION", "Surname": "SICHAKALA", "Contract": "ACTIVE", "FirstName": "GIVEMORE", "Job Title": "SHARED SERVICES MANAGER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP325", "Gender": "MALE", "SECTION": "CSIR", "Surname": "SIATULUBE", "Contract": "ACTIVE", "FirstName": "ANYWAY", "Job Title": "BOME HOUSES CONSTRUCTION SUPERVISOR", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP169", "Gender": "MALE", "SECTION": "ADMINISTRATION", "Surname": "MADADANGOMA", "Contract": "ACTIVE", "FirstName": "VIMBAI", "Job Title": "BUSINESS IMPROVEMENT MANAGER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP243", "Gender": "MALE", "SECTION": "ADMINISTRATION", "Surname": "MAYUNI", "Contract": "ACTIVE", "FirstName": "JOHN", "Job Title": "BUSINESS IMPROVEMENT OFFICER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP065", "Gender": "MALE", "SECTION": "CSIR", "Surname": "KHUMALO", "Contract": "ACTIVE", "FirstName": "LINDELWE", "Job Title": "COMMUNITY RELATIONS COORDINATOR", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP241", "Gender": "MALE", "SECTION": "CSIR", "Surname": "HUNGOIDZA", "Contract": "ACTIVE", "FirstName": "RUGARE", "Job Title": "ASSISTANT COMMUNITY RELATIONS OFFICER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP258", "Gender": "MALE", "SECTION": "CSIR", "Surname": "TAVENHAVE", "Contract": "ACTIVE", "FirstName": "DAPHNE", "Job Title": "COMMUNITY RELATIONS OFFICER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP040", "Gender": "MALE", "SECTION": "FINANCE", "Surname": "SAWAYA", "Contract": "ACTIVE", "FirstName": "ALEXIO", "Job Title": "BOOK KEEPER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP087", "Gender": "MALE", "SECTION": "FINANCE", "Surname": "KUHAMBA", "Contract": "ACTIVE", "FirstName": "DUNCAN", "Job Title": "FINANCE & ADMINISTRATION MANAGER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP191", "Gender": "MALE", "SECTION": "FINANCE", "Surname": "CHANDAVENGERWA", "Contract": "ACTIVE", "FirstName": "ELLEN", "Job Title": "ASSISTANT ACCOUNTANT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP145", "Gender": "MALE", "SECTION": "HUMAN RESOURCES", "Surname": "TINAGO", "Contract": "ACTIVE", "FirstName": "TINAGO", "Job Title": "HUMAN CAPITAL SUPPORT SERVICES MANAGER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP164", "Gender": "MALE", "SECTION": "HUMAN RESOURCES", "Surname": "MUWAIRI", "Contract": "ACTIVE", "FirstName": "BENJAMIN", "Job Title": "HR ADMINISTRATOR", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP216", "Gender": "MALE", "SECTION": "HUMAN RESOURCES", "Surname": "SAMURIWO", "Contract": "ACTIVE", "FirstName": "CARLTON", "Job Title": "HUMAN RESOURCES ASSISTANT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP333", "Gender": "MALE", "SECTION": "HUMAN RESOURCES", "Surname": "MAGOMANA", "Contract": "ACTIVE", "FirstName": "FREEDMORE", "Job Title": "HUMAN RESOURCES SUPERINTENDENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP130", "Gender": "MALE", "SECTION": "I.T", "Surname": "MUKWEBWA", "Contract": "ACTIVE", "FirstName": "NEIL", "Job Title": "IT OFFICER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP140", "Gender": "MALE", "SECTION": "I.T", "Surname": "GWINYAI", "Contract": "ACTIVE", "FirstName": "POUND", "Job Title": "IT SUPERINTENDENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP329", "Gender": "MALE", "SECTION": "I.T", "Surname": "DANDAVARE", "Contract": "ACTIVE", "FirstName": "FELIX", "Job Title": "SUPPORT TECHNICIAN", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP336", "Gender": "MALE", "SECTION": "STORES", "Surname": "CHINAKIDZWA", "Contract": "ACTIVE", "FirstName": "DERICK", "Job Title": "ISSUING OFFICER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP242", "Gender": "MALE", "SECTION": "STORES", "Surname": "CHIGARIRO", "Contract": "ACTIVE", "FirstName": "ASHLEY", "Job Title": "ASSISTANT EXPEDITER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP312", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "MATANDARE", "Contract": "ACTIVE", "FirstName": "SIMBARASHE", "Job Title": "SECURITY OFFICER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP313", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "WERENGANI", "Contract": "ACTIVE", "FirstName": "JANUARY", "Job Title": "SECURITY MANAGER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP084", "Gender": "MALE", "SECTION": "SHEQ", "Surname": "MUNYENYIWA", "Contract": "ACTIVE", "FirstName": "NYASHA", "Job Title": "SHE MANAGER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP148", "Gender": "MALE", "SECTION": "SHEQ", "Surname": "ZHOU", "Contract": "ACTIVE", "FirstName": "ELVIS", "Job Title": "SHE OFFICER PLANT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP162", "Gender": "MALE", "SECTION": "SHEQ", "Surname": "BASU", "Contract": "ACTIVE", "FirstName": "REST", "Job Title": "ENVIRONMENTAL & HYGIENE OFFICER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP193", "Gender": "MALE", "SECTION": "SHEQ", "Surname": "MURIMBA", "Contract": "ACTIVE", "FirstName": "NYASHA", "Job Title": "SHE ADMINISTRATOR", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP247", "Gender": "MALE", "SECTION": "SHEQ", "Surname": "MBOFANA", "Contract": "ACTIVE", "FirstName": "TINASHE", "Job Title": "SHEQ SUPERINTENDENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP249", "Gender": "MALE", "SECTION": "SHEQ", "Surname": "MARAMBANYIKA", "Contract": "ACTIVE", "FirstName": "TAWANDA", "Job Title": "SHEQ AND ENVIRONMENTAL OFFICER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP253", "Gender": "MALE", "SECTION": "SHEQ", "Surname": "TAHWA", "Contract": "ACTIVE", "FirstName": "TAFADZWA", "Job Title": "SHE ASSISTANT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP053", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "CHIRIMANI", "Contract": "ACTIVE", "FirstName": "OWEN", "Job Title": "DRIVER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP085", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "MUDUKA", "Contract": "ACTIVE", "FirstName": "ITAI", "Job Title": "CHEF", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP150", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "SENZERE", "Contract": "ACTIVE", "FirstName": "ARTLEY", "Job Title": "SITE COORDINATION OFFICER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP328", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "YONA", "Contract": "ACTIVE", "FirstName": "SIMON", "Job Title": "CATERING AND HOUSEKEEPING SUPERVISOR", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP041", "Gender": "MALE", "SECTION": "STORES", "Surname": "WAMBE", "Contract": "ACTIVE", "FirstName": "IGNATIOUS", "Job Title": "STORES CONTROLLER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP091", "Gender": "MALE", "SECTION": "STORES", "Surname": "DENGENDE", "Contract": "ACTIVE", "FirstName": "TENDAI", "Job Title": "STORES MANAGER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP172", "Gender": "MALE", "SECTION": "STORES", "Surname": "MADONDO", "Contract": "ACTIVE", "FirstName": "MUNYARADZI", "Job Title": "ISSUING OFFICER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP173", "Gender": "MALE", "SECTION": "STORES", "Surname": "HAMANDISHE", "Contract": "ACTIVE", "FirstName": "VIOLET", "Job Title": "STORES CONTROLLER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP246", "Gender": "MALE", "SECTION": "STORES", "Surname": "MOYO", "Contract": "ACTIVE", "FirstName": "MESULI", "Job Title": "RECEIVING OFFICER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP267", "Gender": "MALE", "SECTION": "STORES", "Surname": "BALENI", "Contract": "ACTIVE", "FirstName": "RAYNARD", "Job Title": "PYLOG ADMINISTRATOR", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP233", "Gender": "MALE", "SECTION": "TRAINING ", "Surname": "MUSADEMBA", "Contract": "ACTIVE", "FirstName": "GAYNOR", "Job Title": "GRADUATE TRAINEE", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP238", "Gender": "MALE", "SECTION": "TRAINING ", "Surname": "CHAPUNZA", "Contract": "ACTIVE", "FirstName": "IRVIN", "Job Title": "GRADUATE TRAINEE METALLURGY", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP239", "Gender": "MALE", "SECTION": "TRAINING ", "Surname": "MAZARA", "Contract": "ACTIVE", "FirstName": "SOLOMON", "Job Title": "GRADUATE TRAINEE METALLURGY", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP273", "Gender": "MALE", "SECTION": "TRAINING ", "Surname": "MAGADU", "Contract": "ACTIVE", "FirstName": "TAFADZWA", "Job Title": "GRADUATE TRAINEE", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP278", "Gender": "MALE", "SECTION": "TRAINING ", "Surname": "GOMBEDZA", "Contract": "ACTIVE", "FirstName": "LISA", "Job Title": "ASSAY LABORATORY TECHNICIAN TRAINEE", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP283", "Gender": "MALE", "SECTION": "TRAINING ", "Surname": "MAGOMO", "Contract": "ACTIVE", "FirstName": "SAMUEL", "Job Title": "SHEQ GRADUATE TRAINEE", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP288", "Gender": "MALE", "SECTION": "TRAINING ", "Surname": "MUKOVA", "Contract": "ACTIVE", "FirstName": "SAVIOUS", "Job Title": "GRADUATE TRAINEE MINING", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP289", "Gender": "MALE", "SECTION": "TRAINING ", "Surname": "DOBBIE", "Contract": "ACTIVE", "FirstName": "TERRENCE", "Job Title": "GRADUATE TRAINEE MINING", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP290", "Gender": "MALE", "SECTION": "TRAINING ", "Surname": "MAVURU", "Contract": "ACTIVE", "FirstName": "CHANTELLE", "Job Title": "GRADUATE TRAINEE MINING", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP291", "Gender": "MALE", "SECTION": "TRAINING ", "Surname": "SAUNYAMA", "Contract": "ACTIVE", "FirstName": "ANDY", "Job Title": "GRADUATE TRAINEE METALLURGY", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP292", "Gender": "MALE", "SECTION": "TRAINING ", "Surname": "NYIKA", "Contract": "ACTIVE", "FirstName": "TANAKA", "Job Title": "GRADUATE TRAINEE METALLURGY", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP293", "Gender": "MALE", "SECTION": "TRAINING ", "Surname": "MLAMBO", "Contract": "ACTIVE", "FirstName": "PRIMROSE", "Job Title": "GRADUATE TRAINEE METALLURGY", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP311", "Gender": "MALE", "SECTION": "TRAINING ", "Surname": "MOYO", "Contract": "ACTIVE", "FirstName": "NYASHA", "Job Title": "TRAINING AND DEVELOPMENT OFFICER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP324", "Gender": "MALE", "SECTION": "TRAINING ", "Surname": "MUPAMBA", "Contract": "ACTIVE", "FirstName": "ZIVANAI", "Job Title": "GT MECHANICAL ENGINEERING", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP352", "Gender": "MALE", "SECTION": "TRAINING ", "Surname": "TSORAI", "Contract": "ACTIVE", "FirstName": "TONDERAI", "Job Title": "GRADUATE TRAINEE ACCOUNTING", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DG223", "Gender": "MALE", "SECTION": "HEAD OFFICE", "Surname": "NYAWANGA", "Contract": "ACTIVE", "FirstName": "INNOCENT", "Job Title": "WAREHOUSE ASSISTANT", "Cost centre": "HEAD OFFICE", "Nec/ Salaried": "NEC"}, {"Code": "DG224", "Gender": "MALE", "SECTION": "HEAD OFFICE", "Surname": "NGOROSHA", "Contract": "ACTIVE", "FirstName": "LOVEMORE", "Job Title": "WAREHOUSE ASSISTANT", "Cost centre": "HEAD OFFICE", "Nec/ Salaried": "NEC"}, {"Code": "DG478", "Gender": "MALE", "SECTION": "HEAD OFFICE", "Surname": "NYAHOKO", "Contract": "ACTIVE", "FirstName": "PHIBION", "Job Title": "GENERAL HAND", "Cost centre": "HEAD OFFICE", "Nec/ Salaried": "NEC"}, {"Code": "DG627", "Gender": "MALE", "SECTION": "HEAD OFFICE", "Surname": "SANGARE", "Contract": "ACTIVE", "FirstName": "MIRIAM", "Job Title": "OFFICE CLEANER", "Cost centre": "HEAD OFFICE", "Nec/ Salaried": "NEC"}, {"Code": "DG006", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "CHATAMBUDZIKI", "Contract": "ACTIVE", "FirstName": "GEORGE", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG014", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "DIRE", "Contract": "ACTIVE", "FirstName": "GANIZANI", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG015", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "GREYA", "Contract": "ACTIVE", "FirstName": "NEVER", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG045", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "GANDIWA", "Contract": "ACTIVE", "FirstName": "MICHAEL", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG077", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "CHIKUNI", "Contract": "ACTIVE", "FirstName": "TADIWANASHE", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG080", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "CHANDIWANA", "Contract": "ACTIVE", "FirstName": "RAPHAEL", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG081", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "MASIKINYE", "Contract": "ACTIVE", "FirstName": "TAPIWA", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG149", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "KADZIMA", "Contract": "ACTIVE", "FirstName": "DOCTOR", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG157", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "CHIGODHO", "Contract": "ACTIVE", "FirstName": "CURRENCY", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG249", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "NYANKUNI", "Contract": "ACTIVE", "FirstName": "TONDERAI", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG250", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "MASIYA", "Contract": "ACTIVE", "FirstName": "MALVERN", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG251", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "CHIORESE", "Contract": "ACTIVE", "FirstName": "TALENT", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG252", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "CHIBANDA", "Contract": "ACTIVE", "FirstName": "NGONI", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG253", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "VENGERE", "Contract": "ACTIVE", "FirstName": "TRUST", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG254", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "BOX", "Contract": "ACTIVE", "FirstName": "RACCELL", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG255", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "MAKOSA", "Contract": "ACTIVE", "FirstName": "PALMER", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG277", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "MARISA", "Contract": "ACTIVE", "FirstName": "CLINTON MUNYARADZI", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG284", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "CHIKOVO", "Contract": "ACTIVE", "FirstName": "TAFADZWA", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG297", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "KAVENDA", "Contract": "ACTIVE", "FirstName": "TAKUNDA", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG301", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "MARIMO", "Contract": "ACTIVE", "FirstName": "STANLEY", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG357", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "CHIRIMANI", "Contract": "ACTIVE", "FirstName": "CHENGETAI", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG358", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "MARATA", "Contract": "ACTIVE", "FirstName": "LINCORN", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG428", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "NHAMOYEBONDE", "Contract": "ACTIVE", "FirstName": "MICHAEL", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG600", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "MUKUMBAREZA", "Contract": "ACTIVE", "FirstName": "PROSPER", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG059", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "NHEMACHENA", "Contract": "ACTIVE", "FirstName": "ELWED", "Job Title": "BUILDER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG147", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "MUFENGI", "Contract": "ACTIVE", "FirstName": "EZRA", "Job Title": "SEMI- SKILLED BUILDER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG019", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "MADZVITI", "Contract": "ACTIVE", "FirstName": "FRANK", "Job Title": "ELECTRICIAN ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG034", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "NYARIRI", "Contract": "ACTIVE", "FirstName": "COLLINS", "Job Title": "SEMI- SKILLED ELECTRICIAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG104", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "KAMANGE", "Contract": "ACTIVE", "FirstName": "ERNEST", "Job Title": "ELECTRICIAN ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG105", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "KAZUNGA", "Contract": "ACTIVE", "FirstName": "TENDEKAI", "Job Title": "ELECTRICIAN ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG106", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "KASINGANETE", "Contract": "ACTIVE", "FirstName": "PERFORMANCE", "Job Title": "ELECTRICIAN ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG317", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "MAJONGA", "Contract": "ACTIVE", "FirstName": "GODFREY", "Job Title": "ELECTRICAL ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG379", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "PAGAN'A", "Contract": "ACTIVE", "FirstName": "TINEI", "Job Title": "ELECTRICAL ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG578", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "NGWENYA", "Contract": "ACTIVE", "FirstName": "TAKUNDA", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG581", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "CHIMANIKIRE", "Contract": "ACTIVE", "FirstName": "SYDNEY", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG587", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "CHAPONDA", "Contract": "ACTIVE", "FirstName": "MEKELANI", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG605", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "HOVE", "Contract": "ACTIVE", "FirstName": "STUDY", "Job Title": "INSTRUMENTS TECHS ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG644", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "MAPOPE", "Contract": "ACTIVE", "FirstName": "KUDZAI", "Job Title": "INSTRUMENTATIONS ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG647", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "RAVU", "Contract": "ACTIVE", "FirstName": "REGIS", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG650", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "DENHERE", "Contract": "ACTIVE", "FirstName": "JOHN", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG654", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "GWETA", "Contract": "ACTIVE", "FirstName": "TANYARADZWA", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG655", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "MAZVAZVA", "Contract": "ACTIVE", "FirstName": "NOMORE", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG707", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "CHIANGWA", "Contract": "ACTIVE", "FirstName": "CHARMAINE", "Job Title": "INSTRUMENTATIONS ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG732", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "TYRMORE", "Contract": "ACTIVE", "FirstName": "NGOCHO", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG739", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "CHAPONDA", "Contract": "ACTIVE", "FirstName": "TROUBLE", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG029", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MUZVONDIWA", "Contract": "ACTIVE", "FirstName": "BRIGHTON", "Job Title": "FITTERS ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG124", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "JINYA", "Contract": "ACTIVE", "FirstName": "TINOTENDA", "Job Title": "FITTER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG192", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MUNENGIWA", "Contract": "ACTIVE", "FirstName": "SIMON", "Job Title": "FITTERS ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG242", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "KANYERA", "Contract": "ACTIVE", "FirstName": "CARLOS", "Job Title": "FITTER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG349", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MUGUTI", "Contract": "ACTIVE", "FirstName": "DAVID", "Job Title": "FITTER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG359", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MACHACHA", "Contract": "ACTIVE", "FirstName": "ADMIRE", "Job Title": "FITTER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG392", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "CHIMANGA", "Contract": "ACTIVE", "FirstName": "EDMORE", "Job Title": "FITTER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG604", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MATOROFA", "Contract": "ACTIVE", "FirstName": "NYASHA", "Job Title": "FITTER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG614", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "CHIGWADA", "Contract": "ACTIVE", "FirstName": "ENOCK", "Job Title": "PLUMBER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG706", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MAPFUMO", "Contract": "ACTIVE", "FirstName": "NGONIDZASHE", "Job Title": "FITTERS ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG335", "Gender": "MALE", "SECTION": "PLANNING", "Surname": "BANGANYIKA", "Contract": "ACTIVE", "FirstName": "TAFADZWA DYLAN", "Job Title": "PLANNING CLERK", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG479", "Gender": "MALE", "SECTION": "PLANNING", "Surname": "ZHOU", "Contract": "ACTIVE", "FirstName": "SHARON", "Job Title": "PLANNING CLERK", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG535", "Gender": "MALE", "SECTION": "PLANNING", "Surname": "GWAMATSA", "Contract": "ACTIVE", "FirstName": "HANDSON", "Job Title": "CLASS 2 DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG603", "Gender": "MALE", "SECTION": "PLANNING", "Surname": "NYANDORO", "Contract": "ACTIVE", "FirstName": "TAKESURE", "Job Title": "STANDBY DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG021", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MARUNGISA", "Contract": "ACTIVE", "FirstName": "DOUGLAS", "Job Title": "BOILERMAKER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG022", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MARUNGISA", "Contract": "ACTIVE", "FirstName": "MUCHENJE", "Job Title": "BOILERMAKER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG051", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MUROYIWA", "Contract": "ACTIVE", "FirstName": "LAMECK", "Job Title": "SCAFFOLDER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG064", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "KAJARI", "Contract": "ACTIVE", "FirstName": "AUSTIN", "Job Title": "SEMI SKILLED PAINTER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG066", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "TANDI", "Contract": "ACTIVE", "FirstName": "TAPFUMANEI", "Job Title": "SCAFFOLDER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG176", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MAODZWA", "Contract": "ACTIVE", "FirstName": "PADDINGTON F", "Job Title": "BOILERMAKER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG177", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "GOROMONZI", "Contract": "ACTIVE", "FirstName": "EMMANUEL", "Job Title": "BOILERMAKER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG182", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "CHITIMA", "Contract": "ACTIVE", "FirstName": "CLEMENCE", "Job Title": "BOILERMAKER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG246", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MASUKU", "Contract": "ACTIVE", "FirstName": "SHINGIRAI", "Job Title": "BOILERMAKER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG303", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MAPIRA", "Contract": "ACTIVE", "FirstName": "AARON", "Job Title": "SCAFFOLDER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG351", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MUDAVANHU", "Contract": "ACTIVE", "FirstName": "STEADY", "Job Title": "BOILERMAKER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG495", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "NGWENYA", "Contract": "ACTIVE", "FirstName": "THEMBINKOSI", "Job Title": "BOILERMAKERS ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG529", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MHONYERA", "Contract": "ACTIVE", "FirstName": "GEORGE", "Job Title": "SEMI SKILLED PAINTER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG594", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "SIBANDA", "Contract": "ACTIVE", "FirstName": "TACHIONA", "Job Title": "FITTER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG656", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "CHITUMBURA", "Contract": "ACTIVE", "FirstName": "TAKUNDA", "Job Title": "BOILERMAKER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG008", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "CHIGODHO", "Contract": "ACTIVE", "FirstName": "DAVID", "Job Title": "TRACTOR DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG024", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MUTIKITSI", "Contract": "ACTIVE", "FirstName": "ROBERT", "Job Title": "UD TRUCK DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG041", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MAZHAMBE", "Contract": "ACTIVE", "FirstName": "GOOD", "Job Title": "TLB OPERATOR", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG047", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "LAVU", "Contract": "ACTIVE", "FirstName": "THOMAS", "Job Title": "EXCAVATOR OPERATOR", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG087", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MKANDAWIRE", "Contract": "ACTIVE", "FirstName": "FRIDAY", "Job Title": "FRONT END LOADER OPERATOR", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG096", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "ZVENYIKA", "Contract": "ACTIVE", "FirstName": "TANAKA", "Job Title": "CRANE OPERATOR", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG100", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "CHAKASARA", "Contract": "ACTIVE", "FirstName": "WORKERS", "Job Title": "TRACTOR DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG101", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "CEPHAS", "Contract": "ACTIVE", "FirstName": "PASSMORE", "Job Title": "ASSISTANT PLUMBER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG108", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "NGOMA", "Contract": "ACTIVE", "FirstName": "BRIGHTON", "Job Title": "FRONT END LOADER OPERATOR", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG125", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "CHATIZA", "Contract": "ACTIVE", "FirstName": "PAUL", "Job Title": "PLUMBERS ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG218", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "KAMAMBO", "Contract": "ACTIVE", "FirstName": "TINEI", "Job Title": "BUS DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG243", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "NDIRA", "Contract": "ACTIVE", "FirstName": "PISIRAI", "Job Title": "PLUMBERS ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG312", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MUGOCHI", "Contract": "ACTIVE", "FirstName": "BRENDO", "Job Title": "WORKSHOP ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG334", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MAPETESE", "Contract": "ACTIVE", "FirstName": "MAZVITA", "Job Title": "BUS DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG405", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MARIKANO", "Contract": "ACTIVE", "FirstName": "ISAAC", "Job Title": "EXCAVATOR OPERATOR", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG446", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "NTALA", "Contract": "ACTIVE", "FirstName": "KUDAKWASHE", "Job Title": "CRANE OPERATOR", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG447", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MUROMBO", "Contract": "ACTIVE", "FirstName": "PAIMETY", "Job Title": "CRANE OPERATOR", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG490", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "PHIRI", "Contract": "ACTIVE", "FirstName": "BHEU", "Job Title": "UD CLASS 2 DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG491", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "KATSANDE", "Contract": "ACTIVE", "FirstName": "SAMUAEL", "Job Title": "STANDBY DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG526", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "CHIPENGO", "Contract": "ACTIVE", "FirstName": "LEONARD", "Job Title": "BUS DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG534", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "CHIWOCHA", "Contract": "ACTIVE", "FirstName": "STANLEY", "Job Title": "MOBIL CRANE OPERATOR", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG538", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MUZHONA", "Contract": "ACTIVE", "FirstName": "ONISMO", "Job Title": "SEMI SKILLED PLUMBER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG547", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MUTWIRA", "Contract": "ACTIVE", "FirstName": "STEVEN", "Job Title": "BUS DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG548", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "DZIMIRI", "Contract": "ACTIVE", "FirstName": "EVEREST", "Job Title": "BUS DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG573", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MAJENGWA", "Contract": "ACTIVE", "FirstName": "EDMORE", "Job Title": "TLB OPERATOR", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG574", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "ZISO", "Contract": "ACTIVE", "FirstName": "SIMBARASHE", "Job Title": "TELEHANDLER OPERATOR", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG694", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "ZODZIWA", "Contract": "ACTIVE", "FirstName": "MAVUTO", "Job Title": "BUS DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG708", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "JIMU", "Contract": "ACTIVE", "FirstName": "TONDERAI", "Job Title": "FEL OPERATOR", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG719", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "CHIFAMBA", "Contract": "ACTIVE", "FirstName": "COURAGE", "Job Title": "WORKSHOP CLERK", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG736", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "DZIMBANHETE", "Contract": "ACTIVE", "FirstName": "MARTIN", "Job Title": "CLASS 1 BUS DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG737", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "JAKACHIRA", "Contract": "ACTIVE", "FirstName": "WISDOM", "Job Title": "CLASS 1 BUS DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG738", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "NYABADZA", "Contract": "ACTIVE", "FirstName": "JONATHAN", "Job Title": "CLASS 1 BUS DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG758", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "GWESHE", "Contract": "ACTIVE", "FirstName": "DOUBT", "Job Title": "TELEHANDLER OPERATOR", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG778", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MAHLENGEZANA", "Contract": "ACTIVE", "FirstName": "STANLEY", "Job Title": "EXCAVATOR OPERATOR", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG098", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "KURUDZA", "Contract": "ACTIVE", "FirstName": "MONEYWORK", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG129", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "MANHANGA", "Contract": "ACTIVE", "FirstName": "WILBERT", "Job Title": "SEMI-SKILLED BUILDER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG145", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "KURUDZA", "Contract": "ACTIVE", "FirstName": "FARAI", "Job Title": "BUILDER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG159", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "CHIGODHO", "Contract": "ACTIVE", "FirstName": "SIMBARASHE", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG160", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "MUPUNGA", "Contract": "ACTIVE", "FirstName": "MACDONALD", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG258", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "MURINGAYI", "Contract": "ACTIVE", "FirstName": "FIDELIS", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG261", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "MBURUMA", "Contract": "ACTIVE", "FirstName": "EPHRAIM", "Job Title": "SEMI-SKILLED BUILDER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG263", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "MARERWA", "Contract": "ACTIVE", "FirstName": "OBINISE", "Job Title": "SEMI-SKILLED BUILDER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG272", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "MUJERI", "Contract": "ACTIVE", "FirstName": "GARIKAI", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG275", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "RUNZIRA", "Contract": "ACTIVE", "FirstName": "DOMINIC", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG292", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "JAIROS", "Contract": "ACTIVE", "FirstName": "RAYMOND", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG294", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "KAKORE", "Contract": "ACTIVE", "FirstName": "CRY", "Job Title": "SEMI-SKILLED BUILDER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG318", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "WEBSTER", "Contract": "ACTIVE", "FirstName": "JOSHUA", "Job Title": "SEMI-SKILLED BUILDER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG319", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "FRANCIS", "Contract": "ACTIVE", "FirstName": "MAZVANARA", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG325", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "FURAWU", "Contract": "ACTIVE", "FirstName": "KENNY", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG329", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "MAGUSVI", "Contract": "ACTIVE", "FirstName": "TAFADZWA", "Job Title": "SEMI- SKILLED CARPENTER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG331", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "MUZAVA", "Contract": "ACTIVE", "FirstName": "ADMIRE", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG387", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "CHAKUINGA", "Contract": "ACTIVE", "FirstName": "HOWARD", "Job Title": "SEMI-SKILLED BUILDER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG398", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "THOM", "Contract": "ACTIVE", "FirstName": "SIMBARASHE", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG406", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "VARETA", "Contract": "ACTIVE", "FirstName": "TIGHT", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG484", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "NYAMAYARO", "Contract": "ACTIVE", "FirstName": "CLEVER", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG487", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "MUNYARADZI", "Contract": "ACTIVE", "FirstName": "STANLEY", "Job Title": "BUILDER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG504", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "PFUPA", "Contract": "ACTIVE", "FirstName": "PROSPERITY", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG507", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "SIMUDZIRAYI", "Contract": "ACTIVE", "FirstName": "LOVEMORE", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG512", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "CHIKOYA", "Contract": "ACTIVE", "FirstName": "VITALIS", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG537", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "CHIKOYA", "Contract": "ACTIVE", "FirstName": "NIGEL", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG542", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "MBUNDURE", "Contract": "ACTIVE", "FirstName": "EMETI", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG563", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "CHIPENGO", "Contract": "ACTIVE", "FirstName": "PARTSON", "Job Title": "SEMI- SKILLED BUILDER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG564", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "MAKAYI", "Contract": "ACTIVE", "FirstName": "IGNATIOUS", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG613", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "KAMBEWU", "Contract": "ACTIVE", "FirstName": "HARMONY", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG659", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "CHIYANGE", "Contract": "ACTIVE", "FirstName": "GIVEMORE", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG693", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "CHIDHAWU", "Contract": "ACTIVE", "FirstName": "RANGANAI", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG709", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "MUCHEMERANWA", "Contract": "ACTIVE", "FirstName": "JOSHUA", "Job Title": "SCAFFOLDERS ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG710", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "MURONZI", "Contract": "ACTIVE", "FirstName": "EVANS", "Job Title": "SEMI SKILLED BUILDER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG102", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "KADZIMA", "Contract": "ACTIVE", "FirstName": "RICHMORE", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG130", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "KAZUNGA", "Contract": "ACTIVE", "FirstName": "ITAYI", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG154", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MANHANGA", "Contract": "ACTIVE", "FirstName": "STANLEY", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG186", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MAHOVO", "Contract": "ACTIVE", "FirstName": "COURAGE", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG193", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MUSIWA", "Contract": "ACTIVE", "FirstName": "EFTON", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG219", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MUZA", "Contract": "ACTIVE", "FirstName": "CHAMUNORWA", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG226", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "NYAMUKWATURA", "Contract": "ACTIVE", "FirstName": "SIMON", "Job Title": "TEAM LEADER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG326", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "GANDIWA", "Contract": "ACTIVE", "FirstName": "OWEN", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG339", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MAVHUNGA", "Contract": "ACTIVE", "FirstName": "PAUL", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG347", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "KASEKE", "Contract": "ACTIVE", "FirstName": "DYLLAN", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG380", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MANYAMBA", "Contract": "ACTIVE", "FirstName": "SIWASHIRO", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG383", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MUSORA", "Contract": "ACTIVE", "FirstName": "TRUST", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG386", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MATAI", "Contract": "ACTIVE", "FirstName": "TAFADZWA", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG426", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "PHIRI", "Contract": "ACTIVE", "FirstName": "NAPHTALI", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG427", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MAZHAMBE", "Contract": "ACTIVE", "FirstName": "MATHEW", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG439", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MAGWAZA", "Contract": "ACTIVE", "FirstName": "GEORGE", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG445", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "NHAMOYEBONDE", "Contract": "ACTIVE", "FirstName": "KELVIN", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG450", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "HARUMBWI", "Contract": "ACTIVE", "FirstName": "TINASHE", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG451", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MUKWENYA", "Contract": "ACTIVE", "FirstName": "VIRIMAI ANESU", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG492", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "CHAMONYONGA", "Contract": "ACTIVE", "FirstName": "WHITEHEAD", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG493", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "SIREWU", "Contract": "ACTIVE", "FirstName": "CARLINGTON", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG494", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "ARUTURA", "Contract": "ACTIVE", "FirstName": "WELLINGTON", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG496", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "KAMU", "Contract": "ACTIVE", "FirstName": "EDSON", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG497", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "NGULUWE", "Contract": "ACTIVE", "FirstName": "MALVERN", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG498", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MUNANGA", "Contract": "ACTIVE", "FirstName": "BRADELY", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG513", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "KATURA", "Contract": "ACTIVE", "FirstName": "TONDERAI", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG515", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "GOROMONZI", "Contract": "ACTIVE", "FirstName": "TAFADZWA", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG517", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "TEMBO", "Contract": "ACTIVE", "FirstName": "GIFT", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG536", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MOYO", "Contract": "ACTIVE", "FirstName": "THABANI", "Job Title": "DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG624", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "RUSWA", "Contract": "ACTIVE", "FirstName": "PANASHE", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG629", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "NGIRAZI", "Contract": "ACTIVE", "FirstName": "LAMECK", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG630", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "DANDAWA", "Contract": "ACTIVE", "FirstName": "EVIDENCE", "Job Title": "STANDBY DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG632", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "CHIGODO", "Contract": "ACTIVE", "FirstName": "ANYWAY", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG633", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MUDHINDO", "Contract": "ACTIVE", "FirstName": "LIBERTY", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG637", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "FUSIRA", "Contract": "ACTIVE", "FirstName": "REMEMBER", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG657", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MASHIKI", "Contract": "ACTIVE", "FirstName": "ALBERT", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG702", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "TOGAREPI", "Contract": "ACTIVE", "FirstName": "JABULANI", "Job Title": "CLASS 4 DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG733", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "CHIRIMA", "Contract": "ACTIVE", "FirstName": "TATENDA", "Job Title": "ELECTRICIAN ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG757", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "GOZHO", "Contract": "ACTIVE", "FirstName": "ZVIKOMBORERO", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG291", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "GUNJA", "Contract": "ACTIVE", "FirstName": "LEAN", "Job Title": "CORE SHED ATTENDANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG004", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "BHOBHO", "Contract": "ACTIVE", "FirstName": "COLLEN", "Job Title": "TRAINEE GEO TECH", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG013", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "CHITUMBA", "Contract": "ACTIVE", "FirstName": "BIGGIE", "Job Title": "TRAINEE GEO TECH", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG017", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "KARISE", "Contract": "ACTIVE", "FirstName": "KENNETH", "Job Title": "TRAINEE GEO TECH", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG067", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "MAPORISA", "Contract": "ACTIVE", "FirstName": "CHARLES", "Job Title": "SAMPLER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG069", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "CHIDORA", "Contract": "ACTIVE", "FirstName": "PRUDENCE", "Job Title": "SAMPLER RC DRILLING", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG153", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "MAPOSA", "Contract": "ACTIVE", "FirstName": "SHELLINGTON", "Job Title": "SAMPLER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG208", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "CHIMANIKIRE", "Contract": "ACTIVE", "FirstName": "VENGAI", "Job Title": "SAMPLER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG268", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "TAULO", "Contract": "ACTIVE", "FirstName": "ANHTONY", "Job Title": "SAMPLER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG270", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "NDORO", "Contract": "ACTIVE", "FirstName": "TINASHE", "Job Title": "SAMPLER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG280", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "CHAPUKA", "Contract": "ACTIVE", "FirstName": "TAKAWIRA", "Job Title": "SAMPLER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG282", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "CHIKORE", "Contract": "ACTIVE", "FirstName": "ANDERSON", "Job Title": "SAMPLER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG298", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "MADZIVANZIRA", "Contract": "ACTIVE", "FirstName": "NEBIA", "Job Title": "SAMPLER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG302", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "CHINYAMA", "Contract": "ACTIVE", "FirstName": "LINDSAY", "Job Title": "DATA CAPTURE CLERK", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG313", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "GUNI", "Contract": "ACTIVE", "FirstName": "DARLINGTON", "Job Title": "SAMPLER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG321", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "MASHONGANYIKA", "Contract": "ACTIVE", "FirstName": "NIGEL", "Job Title": "SAMPLER (RC DRILLING)", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG381", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "NYANHETE", "Contract": "ACTIVE", "FirstName": "ARCHBORD", "Job Title": "SAMPLER RC DRILLING", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG418", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "NHAURIRO", "Contract": "ACTIVE", "FirstName": "ENIFA", "Job Title": "SAMPLER RC DRILLING", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG453", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "MUCHAZIVEPI", "Contract": "ACTIVE", "FirstName": "MALVERN", "Job Title": "SAMPLER RC DRILLING", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG500", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "MUGARI", "Contract": "ACTIVE", "FirstName": "ABEL", "Job Title": "SAMPLER RC DRILLING", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG501", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "NGOCHO", "Contract": "ACTIVE", "FirstName": "TATENDA", "Job Title": "DATA CAPTURE CLERK", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG502", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "NZVAURA", "Contract": "ACTIVE", "FirstName": "GRACIOUS", "Job Title": "SAMPLER RC DRILLING", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG651", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "NHAMOYEBONDE", "Contract": "ACTIVE", "FirstName": "NYASHA", "Job Title": "SAMPLER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG666", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "MUROIWA", "Contract": "ACTIVE", "FirstName": "MUNYARADZI", "Job Title": "RC SAMPLER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG048", "Gender": "MALE", "SECTION": "SURVEY ", "Surname": "KADZIMA", "Contract": "ACTIVE", "FirstName": "POWERMAN", "Job Title": "SURVEY ASSISTANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG288", "Gender": "MALE", "SECTION": "SURVEY ", "Surname": "CHIZANGA", "Contract": "ACTIVE", "FirstName": "TAURAI", "Job Title": "SURVEY ASSISTANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG300", "Gender": "MALE", "SECTION": "SURVEY ", "Surname": "MASONDO", "Contract": "ACTIVE", "FirstName": "AUSTIN", "Job Title": "SURVEY ASSISTANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG338", "Gender": "MALE", "SECTION": "SURVEY ", "Surname": "NCUBE", "Contract": "ACTIVE", "FirstName": "THABANI", "Job Title": "SURVEY ASSISTANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG416", "Gender": "MALE", "SECTION": "SURVEY ", "Surname": "MAZHAMBE", "Contract": "ACTIVE", "FirstName": "KUDAKWASHE", "Job Title": "SURVEY ASSISTANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG435", "Gender": "MALE", "SECTION": "SURVEY ", "Surname": "DAWA", "Contract": "ACTIVE", "FirstName": "LIBERTY", "Job Title": "SURVEY ASSISTANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG648", "Gender": "MALE", "SECTION": "SURVEY ", "Surname": "MARARA", "Contract": "ACTIVE", "FirstName": "DOMINIC", "Job Title": "SURVEY ASSISTANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG649", "Gender": "MALE", "SECTION": "SURVEY ", "Surname": "SIBANDA", "Contract": "ACTIVE", "FirstName": "VALENTINE", "Job Title": "DRIVER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG730", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "DHAMBUZA", "Contract": "ACTIVE", "FirstName": "KUDZAISHE", "Job Title": "CORE SHED ATTENDANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG770", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "CHINZOU", "Contract": "ACTIVE", "FirstName": "PANASHE", "Job Title": "DRILL RIG ASSISTANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG771", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "CHIKUKWA", "Contract": "ACTIVE", "FirstName": "ANTHONY", "Job Title": "DRILL RIG ASSISTANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG772", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "MUTSIKIWA", "Contract": "ACTIVE", "FirstName": "JEMITINOS", "Job Title": "CORE SHED ATTENDANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG773", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "JAVANGWE", "Contract": "ACTIVE", "FirstName": "REJOICE", "Job Title": "DRILL RIG ASSISTANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG774", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "MUNYENYIWA", "Contract": "ACTIVE", "FirstName": "TATENDA", "Job Title": "DRILL RIG ASSISTANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG775", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "MAVHURA", "Contract": "ACTIVE", "FirstName": "TONDERAI", "Job Title": "DRILL RIG ASSISTANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG776", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "MASVANHISE", "Contract": "ACTIVE", "FirstName": "PRINCE", "Job Title": "DRILL RIG ASSISTANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG112", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MAPULAZI", "Contract": "ACTIVE", "FirstName": "MANUEL", "Job Title": "CIL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG200", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KASEKE", "Contract": "ACTIVE", "FirstName": "NYASHA", "Job Title": "RELIEF CREW ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG370", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "NYASULO", "Contract": "ACTIVE", "FirstName": "BESON", "Job Title": "CIL OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG403", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIHWAKU", "Contract": "ACTIVE", "FirstName": "DADIRAI", "Job Title": "GENERAL ASSISTANT CIL", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG480", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIBHAGU", "Contract": "ACTIVE", "FirstName": "THELMA", "Job Title": "GENERAL PLANT ATTENDANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG521", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "WANJOWA", "Contract": "ACTIVE", "FirstName": "MAXWELL", "Job Title": "CIL OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG551", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "GUDO", "Contract": "ACTIVE", "FirstName": "LAWRENCIOUS", "Job Title": "GENERAL PLANT ATTENDANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG247", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KADAIRA", "Contract": "ACTIVE", "FirstName": "HILTON", "Job Title": "ELUTION & REAGENTS ASSIST", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG371", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "PITCHES", "Contract": "ACTIVE", "FirstName": "UMALI", "Job Title": "ELUTION OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG373", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "PARADZAYI", "Contract": "ACTIVE", "FirstName": "EMMANUEL", "Job Title": "ELUTION OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG375", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MUZIRA", "Contract": "ACTIVE", "FirstName": "FARAI", "Job Title": "ELUTION OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG420", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIKOYA", "Contract": "ACTIVE", "FirstName": "MELODY", "Job Title": "RELIEF CREW ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG466", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MANYANGE", "Contract": "ACTIVE", "FirstName": "VENGESAI", "Job Title": "ELUTION ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG011", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHINGUWA", "Contract": "ACTIVE", "FirstName": "AUGUSTINE", "Job Title": "BALLMILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG052", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MUSIIWA", "Contract": "ACTIVE", "FirstName": "DUNGISANI", "Job Title": "HOUSE KEEPING ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG183", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIZANGA", "Contract": "ACTIVE", "FirstName": "KUDZAI", "Job Title": "HOUSE KEEPING ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG211", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MURANDA", "Contract": "ACTIVE", "FirstName": "NATHANIEL", "Job Title": "HOUSE KEEPING ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG213", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "NGWENYA", "Contract": "ACTIVE", "FirstName": "SAFASONGE", "Job Title": "LEAVE RELIEF CREW", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG461", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KATUMBA", "Contract": "ACTIVE", "FirstName": "ASHWIN", "Job Title": "LEAVE RELIEF CREW", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG485", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KADZVITI", "Contract": "ACTIVE", "FirstName": "LAWRENCE", "Job Title": "RELIEF CREW ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG486", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "BAKACHEZA", "Contract": "ACTIVE", "FirstName": "ELASTO", "Job Title": "GENERAL MILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG514", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MANHANGA", "Contract": "ACTIVE", "FirstName": "LOVEJOY", "Job Title": "HOUSE KEEPING ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG568", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "DZIMBIRI", "Contract": "ACTIVE", "FirstName": "CARLTON", "Job Title": "GENERAL PLANT ATTENDANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG570", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KADZIMA", "Contract": "ACTIVE", "FirstName": "FURTHERSTEP", "Job Title": "HOUSE KEEPING ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG589", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MUBAIWA", "Contract": "ACTIVE", "FirstName": "NOBERT", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG597", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "TINANI", "Contract": "ACTIVE", "FirstName": "TENDAI", "Job Title": "HOUSE KEEPING ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG598", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIGODO", "Contract": "ACTIVE", "FirstName": "BEHAVE", "Job Title": "BALLMILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG672", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MASERE", "Contract": "ACTIVE", "FirstName": "DARLINGTON", "Job Title": "PLUMBER ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG287", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIRUME", "Contract": "ACTIVE", "FirstName": "LATIFAN", "Job Title": "METALLURGICAL CLERK", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG583", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "ZAMANI", "Contract": "ACTIVE", "FirstName": "NYASHA", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG703", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "TAPOMWA", "Contract": "ACTIVE", "FirstName": "TAFADZWA", "Job Title": "PLANT LAB ATTENDANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG063", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "SHERENI", "Contract": "ACTIVE", "FirstName": "PETROS", "Job Title": "GENERAL MILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG072", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KASIMO", "Contract": "ACTIVE", "FirstName": "ADMIRE", "Job Title": "TAILINGS STORAGE FACILITY ASSIST", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG194", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "NHAMOYEBONDE", "Contract": "ACTIVE", "FirstName": "ANTONY", "Job Title": "BALLMILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG195", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "NYAZIKA", "Contract": "ACTIVE", "FirstName": "SELBORNE CHENGETAI", "Job Title": "BALLMILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG205", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MASANGO", "Contract": "ACTIVE", "FirstName": "DONALD", "Job Title": "BALLMILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG266", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHESANGO", "Contract": "ACTIVE", "FirstName": "LIBERTY", "Job Title": "TAILINGS STORAGE FACILITY ASSIST", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG279", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "BRIAN", "Contract": "ACTIVE", "FirstName": "LAMECK", "Job Title": "BALLMILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG327", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "NYIKADZINO", "Contract": "ACTIVE", "FirstName": "WELLINGTON", "Job Title": "HOUSE KEEPING ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG333", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "GOVHA", "Contract": "ACTIVE", "FirstName": "BELIEVE", "Job Title": "BALLMILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG336", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "NYIKADZINO", "Contract": "ACTIVE", "FirstName": "CLEMENCE KURAUONE", "Job Title": "BALLMILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG345", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "BGWANYA", "Contract": "ACTIVE", "FirstName": "TARUVINGA", "Job Title": "BALLMILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG353", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "GONDO", "Contract": "ACTIVE", "FirstName": "MAXWELL", "Job Title": "BALLMILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG374", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MAGWENZI", "Contract": "ACTIVE", "FirstName": "ANYWAY", "Job Title": "MILL OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG376", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIYANDO", "Contract": "ACTIVE", "FirstName": "SHADRECK", "Job Title": "MILL OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG401", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIPATO", "Contract": "ACTIVE", "FirstName": "FARAI", "Job Title": "MILL OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG539", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIRIMUJIRI", "Contract": "ACTIVE", "FirstName": "KELVIN", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG541", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KARAMBWE", "Contract": "ACTIVE", "FirstName": "ELISHA", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG546", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MGUQUKA", "Contract": "ACTIVE", "FirstName": "NKOSIYABO", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG010", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIMUTU", "Contract": "ACTIVE", "FirstName": "JOFFREY", "Job Title": "BALLMILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG030", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "NGONI", "Contract": "ACTIVE", "FirstName": "ELISHA", "Job Title": "PRIMARY CRUSHER OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG079", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KAKONO", "Contract": "ACTIVE", "FirstName": "DAIROD", "Job Title": "PRIMARY CRUSHER OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG131", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MUZHONA", "Contract": "ACTIVE", "FirstName": "GRACIOUS", "Job Title": "PRIMARY CRUSHER ATTENDANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG134", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHARAMBIRA", "Contract": "ACTIVE", "FirstName": "GAINMORE", "Job Title": "PRIMARY CRUSHER ATTENDANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG199", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "LAPKEN", "Contract": "ACTIVE", "FirstName": "KENNETH", "Job Title": "PRIMARY CRUSHER ATTENDANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG276", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "ZILAKA", "Contract": "ACTIVE", "FirstName": "SOLOMON", "Job Title": "PRIMARY CRUSHER ATTENDANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG278", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "BOTE", "Contract": "ACTIVE", "FirstName": "TERRENCE", "Job Title": "PRIMARY CRUSHING OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG293", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KAHUMWE", "Contract": "ACTIVE", "FirstName": "DAVIES", "Job Title": "PRIMARY CRUSHER ATTENDANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG742", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KAISI", "Contract": "ACTIVE", "FirstName": "JAMES", "Job Title": "THICKENER OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG743", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHANYUKA", "Contract": "ACTIVE", "FirstName": "ANDREW", "Job Title": "THICKENER OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG744", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MKANDAWIRE", "Contract": "ACTIVE", "FirstName": "DIVASON", "Job Title": "THICKENER OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG722", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MUNYORO", "Contract": "ACTIVE", "FirstName": "NEHEMIAH", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG035", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "PHIRI", "Contract": "ACTIVE", "FirstName": "ENOCK", "Job Title": "HOUSE KEEPING ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG074", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIHOKO", "Contract": "ACTIVE", "FirstName": "CYRUS", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG377", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "GWATA", "Contract": "ACTIVE", "FirstName": "TINASHE", "Job Title": "REAGENTS & SMELTING CONTROLLER", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG457", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIDEMO", "Contract": "ACTIVE", "FirstName": "AGGRIPPA", "Job Title": "REAGENTS & SMELTING ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG058", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MUDIWA", "Contract": "ACTIVE", "FirstName": "ALBERT", "Job Title": "GENERAL SECONDARY & TERTIARY CRUSHING ASSIST", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG142", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MATAMA", "Contract": "ACTIVE", "FirstName": "MCNELL", "Job Title": "GENERAL SECONDARY & TERTIARY CRUSHING ASSIST", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG143", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "NZVAURA", "Contract": "ACTIVE", "FirstName": "ADDLIGHT", "Job Title": "SECONDARY & TERTIARY CRUSHER OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG181", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHITANHAMAPIRA", "Contract": "ACTIVE", "FirstName": "JACOB", "Job Title": "GENERAL SECONDARY & TERTIARY CRUSHING ASSIST", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG184", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KUGOTSI", "Contract": "ACTIVE", "FirstName": "HAMLET", "Job Title": "SECONDARY & TERTIARY CRUSHER OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG188", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MARIME", "Contract": "ACTIVE", "FirstName": "FOSTER", "Job Title": "SECONDARY & TERTIARY CRUSHER OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG237", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHANETSA", "Contract": "ACTIVE", "FirstName": "PRAISE K", "Job Title": "GENERAL MILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG281", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIGWADA", "Contract": "ACTIVE", "FirstName": "FORGET", "Job Title": "GENERAL SECONDARY & TERTIARY CRUSHING ASSIST", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG355", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MAPURANGA", "Contract": "ACTIVE", "FirstName": "TATENDA", "Job Title": "GENERAL SECONDARY & TERTIARY CRUSHING ASSIST", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG003", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "BHANDA", "Contract": "ACTIVE", "FirstName": "BHANDASON", "Job Title": "TAILINGS STORAGE FACILITY OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG036", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "PHIRI", "Contract": "ACTIVE", "FirstName": "GIVEMORE", "Job Title": "TAILINGS STORAGE FACILITY OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG065", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "RUNZIRA", "Contract": "ACTIVE", "FirstName": "KUDAKWASHE", "Job Title": "TAILINGS STORAGE FACILITY OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG071", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MAPIRA", "Contract": "ACTIVE", "FirstName": "ALBERT", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG103", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MUTAYI", "Contract": "ACTIVE", "FirstName": "FIDELIS", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG127", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "BUNGU", "Contract": "ACTIVE", "FirstName": "LEONARD", "Job Title": "GENERAL MILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG128", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KAVINGA", "Contract": "ACTIVE", "FirstName": "FRIDAY", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG133", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KUMBONJE", "Contract": "ACTIVE", "FirstName": "LAMECK", "Job Title": "GENERAL HAND", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG144", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "TAULO", "Contract": "ACTIVE", "FirstName": "NOEL", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG146", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MUNETSI", "Contract": "ACTIVE", "FirstName": "ELISHA", "Job Title": "BALLMILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG156", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KOMBONI", "Contract": "ACTIVE", "FirstName": "MAKOMBORERO", "Job Title": "TAILINGS STORAGE FACILITY ASSIST", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG189", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MARIMO", "Contract": "ACTIVE", "FirstName": "ELIAS", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG285", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIMANIKIRE", "Contract": "ACTIVE", "FirstName": "COSMAS", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG296", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KASEKE", "Contract": "ACTIVE", "FirstName": "TAKUDZWA", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG340", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MACHAKARI", "Contract": "ACTIVE", "FirstName": "AMOS", "Job Title": "TEAM LEADER", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG343", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KUSIKWENYU", "Contract": "ACTIVE", "FirstName": "STACIOUS", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG394", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "NHAUCHURU", "Contract": "ACTIVE", "FirstName": "PRINCE", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG433", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MUKWENYA", "Contract": "ACTIVE", "FirstName": "TAWANDA", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG503", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KAZUNGA", "Contract": "ACTIVE", "FirstName": "RICHARD", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG506", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "JACK", "Contract": "ACTIVE", "FirstName": "COASTER", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG509", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIGODHO", "Contract": "ACTIVE", "FirstName": "MILTON", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG511", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "TAMBUDZA", "Contract": "ACTIVE", "FirstName": "WISE", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG639", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MARAMBA", "Contract": "ACTIVE", "FirstName": "ELVIS", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG640", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "PARWARINGIRA", "Contract": "ACTIVE", "FirstName": "TINOTENDA", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG641", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MAKREYA", "Contract": "ACTIVE", "FirstName": "TAFADZWA", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG664", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MUFUMBIRA", "Contract": "ACTIVE", "FirstName": "TENDEKAI", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG717", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIHLABA", "Contract": "ACTIVE", "FirstName": "TANAKA", "Job Title": "GENERAL PLANT ATTENDANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG718", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MAVESERE", "Contract": "ACTIVE", "FirstName": "TANAKA", "Job Title": "GENERAL PLANT ATTENDANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG132", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "NYAMAVABVU", "Contract": "ACTIVE", "FirstName": "KELVIN KUDAKWASHE", "Job Title": "CCTV OPERATOR", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG221", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "CHITIKI", "Contract": "ACTIVE", "FirstName": "MARGARET", "Job Title": "CCTV OPERATOR", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG419", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "CHIFWAFWA", "Contract": "ACTIVE", "FirstName": "AUDREY", "Job Title": "CCTV OPERATOR", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG434", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "BENNY", "Contract": "ACTIVE", "FirstName": "CHONDE", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG476", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "VELLEM", "Contract": "ACTIVE", "FirstName": "NIXON", "Job Title": "CCTV OPERATOR", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG530", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "MAGURA", "Contract": "ACTIVE", "FirstName": "TONGAI", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG545", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "GUNJA", "Contract": "ACTIVE", "FirstName": "SYLVESTER", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG571", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "KUGOTSI", "Contract": "ACTIVE", "FirstName": "CHRISTOPHER", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG580", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "KAZUNGA", "Contract": "ACTIVE", "FirstName": "SIMBARASHE", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG588", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "MBUNDURE", "Contract": "ACTIVE", "FirstName": "SINCEWELL", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG591", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "MAZHAMBE", "Contract": "ACTIVE", "FirstName": "IRVINE", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG620", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "CHAPANDA", "Contract": "ACTIVE", "FirstName": "TADIWANASHE", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG652", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "MBEREKO", "Contract": "ACTIVE", "FirstName": "LYTON", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG720", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "REVAI", "Contract": "ACTIVE", "FirstName": "EDMORE", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG723", "Gender": "MALE", "SECTION": "SHEQ", "Surname": "NATANI", "Contract": "ACTIVE", "FirstName": "BIANCAH", "Job Title": "FIRST AID TRAINER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG049", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "CHIKOYA", "Contract": "ACTIVE", "FirstName": "PHILLIP", "Job Title": "HANDYMAN", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG050", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "CHIKOYA", "Contract": "ACTIVE", "FirstName": "MARK", "Job Title": "WELFARE WORKER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG090", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "CHIGWENJERE", "Contract": "ACTIVE", "FirstName": "TANATSA", "Job Title": "COOK", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG091", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "CHIMBUMU", "Contract": "ACTIVE", "FirstName": "VINCENT", "Job Title": "COOK", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG093", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "CHITIKI", "Contract": "ACTIVE", "FirstName": "MASS", "Job Title": "TEAM LEADER HOUSEKEEPING", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG094", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "CHIDANGURO", "Contract": "ACTIVE", "FirstName": "GLADYS", "Job Title": "HOUSEKEEPER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG095", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "MUKANDAVANHU", "Contract": "ACTIVE", "FirstName": "RANGANAI", "Job Title": "LAUNDRY ATTENDANT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG099", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "BUNGU", "Contract": "ACTIVE", "FirstName": "JIMMINIC", "Job Title": "TEAM LEADER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG180", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "CHIMANIKIRE", "Contract": "ACTIVE", "FirstName": "TAFIRENYIKA", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG206", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "CHIDENYIKA", "Contract": "ACTIVE", "FirstName": "GUESFORD", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG236", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "BUNGU", "Contract": "ACTIVE", "FirstName": "SILENT", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG290", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "GARINGA", "Contract": "ACTIVE", "FirstName": "CHRISTOPHER", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG364", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "MAZHAMBE", "Contract": "ACTIVE", "FirstName": "RICHMORE", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG389", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "KAPIYA", "Contract": "ACTIVE", "FirstName": "SILENT", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG399", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "MANDIVAVARIRA", "Contract": "ACTIVE", "FirstName": "LUWESI", "Job Title": "HOUSEKEEPER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG400", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "CHINYAMA", "Contract": "ACTIVE", "FirstName": "GETRUDE", "Job Title": "HOUSEKEEPER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG436", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "JACK", "Contract": "ACTIVE", "FirstName": "ELIZARY", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG454", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "MUSHONGA", "Contract": "ACTIVE", "FirstName": "CLARA", "Job Title": "LAUNDRY ATTENDANT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG458", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "JENGENI", "Contract": "ACTIVE", "FirstName": "SHARON", "Job Title": "HOUSEKEEPER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG459", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "SITHOLE", "Contract": "ACTIVE", "FirstName": "LILY", "Job Title": "COOK", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG460", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "GWANDE", "Contract": "ACTIVE", "FirstName": "KURAUONE", "Job Title": "COOK", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG462", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "CHIMBAMBO", "Contract": "ACTIVE", "FirstName": "SIMBARASHE", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG463", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "NYAMBO", "Contract": "ACTIVE", "FirstName": "ANGELINE", "Job Title": "HOUSEKEEPER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG464", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "MAHASO", "Contract": "ACTIVE", "FirstName": "MOREBLESSING", "Job Title": "LAUNDRY ATTENDANT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG518", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "GAUKA", "Contract": "ACTIVE", "FirstName": "TRUSTER", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG549", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "MANYIKA", "Contract": "ACTIVE", "FirstName": "LIANA", "Job Title": "HOUSEKEEPER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG599", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "NYAHUMA", "Contract": "ACTIVE", "FirstName": "IGNATIOUS", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG653", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "KONDO", "Contract": "ACTIVE", "FirstName": "WESLEY", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG658", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "CHIRAPA", "Contract": "ACTIVE", "FirstName": "LUXMORE", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG660", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "THOMAS", "Contract": "ACTIVE", "FirstName": "IGNATIOUS", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG661", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "KADAIRA", "Contract": "ACTIVE", "FirstName": "INNOCENT", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG662", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "TONGOFA", "Contract": "ACTIVE", "FirstName": "PRECIOUS", "Job Title": "HOUSE KEEPER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG687", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "KAWARA", "Contract": "ACTIVE", "FirstName": "AGATHA", "Job Title": "HOUSE KEEPER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG715", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "KARASA", "Contract": "ACTIVE", "FirstName": "SHARON", "Job Title": "KITCHEN PORTER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG716", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "CHIKOYA", "Contract": "ACTIVE", "FirstName": "THERESA", "Job Title": "KITCHEN PORTER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG759", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "MAFAIROSI", "Contract": "ACTIVE", "FirstName": "LEARNMORE", "Job Title": "HOUSE KEEPER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG768", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "MENAD", "Contract": "ACTIVE", "FirstName": "ELENA", "Job Title": "HOUSEKEEPER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG769", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "CHAMBURUMBUDZA", "Contract": "ACTIVE", "FirstName": "TSITSI", "Job Title": "HOUSEKEEPER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG783", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "MACHIPISA", "Contract": "ACTIVE", "FirstName": "MILLICENT", "Job Title": "COOK", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG785", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "MATYORAUTA", "Contract": "ACTIVE", "FirstName": "JOSEPHINE", "Job Title": "HOUSE KEEPER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG786", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "MUTSVENGURI", "Contract": "ACTIVE", "FirstName": "FOYLINE", "Job Title": "HOUSE KEEPER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG002", "Gender": "MALE", "SECTION": "STORES", "Surname": "BANDERA", "Contract": "ACTIVE", "FirstName": "MARK", "Job Title": "SENIOR STORES CLERK", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG038", "Gender": "MALE", "SECTION": "STORES", "Surname": "RUWO", "Contract": "ACTIVE", "FirstName": "TAMBURAI", "Job Title": "STORES CLERK", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG070", "Gender": "MALE", "SECTION": "STORES", "Surname": "MAVUNGA", "Contract": "ACTIVE", "FirstName": "JUSTICE", "Job Title": "STORES CLERK", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG086", "Gender": "MALE", "SECTION": "STORES", "Surname": "SIMANI", "Contract": "ACTIVE", "FirstName": "RASHEED", "Job Title": "STORES CLERK", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG197", "Gender": "MALE", "SECTION": "STORES", "Surname": "WAMBE", "Contract": "ACTIVE", "FirstName": "INNOCENT", "Job Title": "STORES CLERK", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG240", "Gender": "MALE", "SECTION": "STORES", "Surname": "CHIBAGU", "Contract": "ACTIVE", "FirstName": "CALISTO", "Job Title": "STOREKEEPER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG262", "Gender": "MALE", "SECTION": "STORES", "Surname": "CHINYAMA", "Contract": "ACTIVE", "FirstName": "ROBSON", "Job Title": "STORES CLERK", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG341", "Gender": "MALE", "SECTION": "STORES", "Surname": "MASHONGANYIKA", "Contract": "ACTIVE", "FirstName": "RAPHAEL", "Job Title": "STORES CLERK", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG366", "Gender": "MALE", "SECTION": "STORES", "Surname": "MUFENGI", "Contract": "ACTIVE", "FirstName": "MAXWELL", "Job Title": "STORES CLERK", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG404", "Gender": "MALE", "SECTION": "STORES", "Surname": "TARUVINGA", "Contract": "ACTIVE", "FirstName": "EUNICE", "Job Title": "SENIOR STORES CLERK", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG582", "Gender": "MALE", "SECTION": "STORES", "Surname": "MARANGE", "Contract": "ACTIVE", "FirstName": "CECIL", "Job Title": "STORES CLERK", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG075", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "BHANDA", "Contract": "ACTIVE", "FirstName": "THEOPHELOUS", "Job Title": "APPRENTICE", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG158", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MATIBIRI", "Contract": "ACTIVE", "FirstName": "PROSPER A", "Job Title": "APPRENTICE", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG320", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "DHINGA", "Contract": "ACTIVE", "FirstName": "WELCOME", "Job Title": "APPRENTICE", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG346", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "CHIFAMBA", "Contract": "ACTIVE", "FirstName": "CALVIN", "Job Title": "APPRENTICE", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG488", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "TAULO", "Contract": "ACTIVE", "FirstName": "RONALD", "Job Title": "APPRENTICE BOILERMAKER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG682", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MAZANI", "Contract": "ACTIVE", "FirstName": "FUNGISAI", "Job Title": "APPRENTICE", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG683", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MACHEKA", "Contract": "ACTIVE", "FirstName": "ELIAS", "Job Title": "APPRENTICE", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG684", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "CHIGWESHE", "Contract": "ACTIVE", "FirstName": "TANDIRAYI", "Job Title": "APPRENTICE", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG685", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MANYANGE", "Contract": "ACTIVE", "FirstName": "BYL", "Job Title": "APPRENTICE", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG686", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MAZARA", "Contract": "ACTIVE", "FirstName": "TAKUNDA", "Job Title": "APPRENTICE", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG747", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MAIMBE", "Contract": "ACTIVE", "FirstName": "CEPHAS", "Job Title": "STUDENT ON ATTACHEMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG750", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MAKUNDE", "Contract": "ACTIVE", "FirstName": "CONSTANCE", "Job Title": "STUDENT ON ATTACHEMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG751", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "ZENGEYA", "Contract": "ACTIVE", "FirstName": "GILBERT", "Job Title": "STUDENT ON ATTACHEMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG752", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "BHENHURA", "Contract": "ACTIVE", "FirstName": "TRACEY", "Job Title": "STUDENT ON ATTACHEMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG753", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "NGWARU", "Contract": "ACTIVE", "FirstName": "TANAKA", "Job Title": "STUDENT ON ATTACHEMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG754", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "ARUBINU", "Contract": "ACTIVE", "FirstName": "MANUEL", "Job Title": "STUDENT ON ATTACHEMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG755", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MUNOCHIWEYI", "Contract": "ACTIVE", "FirstName": "LEVONIA", "Job Title": "STUDENT ON ATTACHEMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG756", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "TENENE", "Contract": "ACTIVE", "FirstName": "ANESU", "Job Title": "STUDENT ON ATTACHEMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG762", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MADZVAMUSE", "Contract": "ACTIVE", "FirstName": "MUFARO", "Job Title": "STUDENT ON ATTACHMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG764", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "GATSI", "Contract": "ACTIVE", "FirstName": "DONALD", "Job Title": "STUDENT ON ATTACHMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG765", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "DZURO", "Contract": "ACTIVE", "FirstName": "ASHGRACE", "Job Title": "STUDENT ON ATTACHMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG766", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MUSARURWA", "Contract": "ACTIVE", "FirstName": "MOTION", "Job Title": "STUDENT ON ATTACHMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG767", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "DHLEMBEU", "Contract": "ACTIVE", "FirstName": "DADISO", "Job Title": "STUDENT ON ATTACHMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG777", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MAKULUNGA", "Contract": "ACTIVE", "FirstName": "TADIWANASHE", "Job Title": "STUDENT ON ATTACHMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG779", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "NDLOVU", "Contract": "ACTIVE", "FirstName": "SHINGIRIRAI", "Job Title": "STUDENT ON ATTACHMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG780", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "KADYE", "Contract": "ACTIVE", "FirstName": "TENDAI", "Job Title": "STUDENT ON ATTACHMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG781", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "KUMHANDA", "Contract": "ACTIVE", "FirstName": "DESMOND", "Job Title": "STUDENT ON ATTACHMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG782", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MAREGERE", "Contract": "ACTIVE", "FirstName": "TIVAKUDZE", "Job Title": "STUDENT ON ATTACHMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}], "skipDuplicates": true}, "query": {}, "params": {}}	{"url": "/api/v1/employees/bulk-upload", "method": "POST"}	::ffff:192.168.2.40	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-19 17:14:05.319+02	75fdd729-2394-41dc-ac58-048ff1adce90
da288dbe-5540-4b0f-9ae9-c0cdecee01d6	CREATE	EMPLOYEES	\N	{"body": {"employees": [{"Code": "DG028", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MUZAVAZI", "Contract": "TERMINATED", "FirstName": "ALBERT", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG135", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "WIZIMANI", "Contract": "TERMINATED", "FirstName": "ADMIRE", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG505", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "CHIMHARE", "Contract": "TERMINATED", "FirstName": "RODRECK", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG508", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "NGWENYA", "Contract": "TERMINATED", "FirstName": "WILSHER", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG628", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "NHAMOYEBONDE", "Contract": "TERMINATED", "FirstName": "MUNYARADZI", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG631", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "CHAMBA", "Contract": "TERMINATED", "FirstName": "SILAS", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG635", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MKANDAWIRE", "Contract": "TERMINATED", "FirstName": "DARLISON", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG749", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MAKAVA", "Contract": "TERMINATED", "FirstName": "TINEVIMBO", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG579", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "MAZHAMBE", "Contract": "TERMINATED", "FirstName": "PARTSON", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG590", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "MAZHAMBE", "Contract": "TERMINATED", "FirstName": "TAWANDA", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG593", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "GUMBURA", "Contract": "TERMINATED", "FirstName": "PASSMORE", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG621", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "CHIPFUNDE", "Contract": "TERMINATED", "FirstName": "HILLARY", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG725", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "CHIVEREVERE", "Contract": "TERMINATED", "FirstName": "TAFADZWA", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG740", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "BOTE", "Contract": "TERMINATED", "FirstName": "TINOBONGA", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG741", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MATASVA", "Contract": "TERMINATED", "FirstName": "MITCHELL", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG746", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MACHEKERA", "Contract": "TERMINATED", "FirstName": "NICOLE", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG748", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "BOME", "Contract": "TERMINATED", "FirstName": "TANAKA", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG761", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MAZHAMBE", "Contract": "TERMINATED", "FirstName": "SHUMIRAI", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG763", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MUNYUKI", "Contract": "TERMINATED", "FirstName": "ANESU", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG784", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "GWATINETSA", "Contract": "TERMINATED", "FirstName": "EMMANUEL", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DGZ062", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "CHIRIGA", "Contract": "ACTIVE", "FirstName": "TONDERAI", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "LABORATORY", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ063", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "NDIMANDE", "Contract": "ACTIVE", "FirstName": "NOVUYO", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "LABORATORY", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ064", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "MURAIRWA", "Contract": "ACTIVE", "FirstName": "JANIEL ANDREW", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "LABORATORY", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ088", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "MATEWA", "Contract": "ACTIVE", "FirstName": "SANDRA", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "LABORATORY", "Nec/ Salaried": "SALARIED"}, {"Code": "DP166", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "SHAPURE", "Contract": "ACTIVE", "FirstName": "AUGUSTINE", "Job Title": "MINE ASSAYER", "Cost centre": "LABORATORY", "Nec/ Salaried": "SALARIED"}, {"Code": "DP198", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "HOKO", "Contract": "ACTIVE", "FirstName": "FARAI", "Job Title": "LABORATORY TECHNICIAN", "Cost centre": "LABORATORY", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ013", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "CHIDO", "Contract": "ACTIVE", "FirstName": "STANWELL", "Job Title": "CHARGEHAND BUILDERS", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP071", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "NYATI", "Contract": "ACTIVE", "FirstName": "AGRIA", "Job Title": "CARPENTER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP082", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "NYAMBALO", "Contract": "ACTIVE", "FirstName": "WILLARD", "Job Title": "CIVILS SUPERVISOR", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ011", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "KONDO", "Contract": "ACTIVE", "FirstName": "SIBONGILE", "Job Title": "ELECTRICIAN CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ031", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "CHAPARAPATA", "Contract": "ACTIVE", "FirstName": "JOHNSON", "Job Title": "ELECTRICIAN CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP073", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "MWENYE", "Contract": "ACTIVE", "FirstName": "GAUNJE", "Job Title": "SENIOR ELECTRICAL AND INSTRUMENTATION SUPT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP197", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "NCUBE", "Contract": "ACTIVE", "FirstName": "JOSEPH", "Job Title": "CHARGEHAND INSTRUMENTATION", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP213", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "GOTEKA", "Contract": "ACTIVE", "FirstName": "TINASHE", "Job Title": "JUNIOR ELECTRICAL ENGINEER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP218", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "JAKARASI", "Contract": "ACTIVE", "FirstName": "TRYMORE", "Job Title": "ELECTRICAL MANAGER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP226", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "SUMANI", "Contract": "ACTIVE", "FirstName": "TAMARA", "Job Title": "JUNIOR INSTRUMENTATION ENGINEER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP245", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "KUBVORUNO", "Contract": "ACTIVE", "FirstName": "HEBERT", "Job Title": "INSTRUMENTATION TECHNICIAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP282", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "MASAMBA", "Contract": "ACTIVE", "FirstName": "GODFREY", "Job Title": "ELECTRICIAN CLASS 2", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP294", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "NLEYA", "Contract": "ACTIVE", "FirstName": "PROSPER", "Job Title": "INSTRUMENTATION TECHNICAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP296", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "MARINGIRENI", "Contract": "ACTIVE", "FirstName": "NESBERT", "Job Title": "ELECTRICIAN CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP303", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "MOYO", "Contract": "ACTIVE", "FirstName": "LAWRENCE", "Job Title": "CHARGEHAND ELECTRICAL", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP331", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "KASEMBE", "Contract": "ACTIVE", "FirstName": "ALI", "Job Title": "ELECTRICIAN CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP353", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "MUKO", "Contract": "ACTIVE", "FirstName": "BLESSING", "Job Title": "INSTRUMENTATION TECHNICIAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP355", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "CHAKWIZIRA", "Contract": "ACTIVE", "FirstName": "FISHER", "Job Title": "ELECTRICIAN CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP356", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "CHUDU", "Contract": "ACTIVE", "FirstName": "COSTA", "Job Title": "ELECTRICIAN CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP357", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "LANGWANI", "Contract": "ACTIVE", "FirstName": "TALENT", "Job Title": "ELECTRICIAN CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP358", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "MAKAYA", "Contract": "ACTIVE", "FirstName": "GIFT", "Job Title": "ELECTRICIAN CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ018", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "SHERENI", "Contract": "ACTIVE", "FirstName": "LISIAS", "Job Title": "FITTER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ019", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "CHATAIRA", "Contract": "ACTIVE", "FirstName": "JOHN", "Job Title": "FITTER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ024", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MATARUTSE", "Contract": "ACTIVE", "FirstName": "AMBROSE", "Job Title": "DRY PLANT FOREMAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ061", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MOTLOGWA", "Contract": "ACTIVE", "FirstName": "MOLISA", "Job Title": "PLUMBER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ075", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MUKANDE", "Contract": "ACTIVE", "FirstName": "ELISHA", "Job Title": "FITTER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ091", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MAFAIROSI", "Contract": "ACTIVE", "FirstName": "ANTHONY", "Job Title": "FITTER CLASS 2", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP089", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MUTONGA", "Contract": "ACTIVE", "FirstName": "PETRO", "Job Title": "STRUCTURAL FITTING FOREMAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP119", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MTUTU", "Contract": "ACTIVE", "FirstName": "WARREN", "Job Title": "MAINTENANCE ENGINEER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP175", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "TONGERA", "Contract": "ACTIVE", "FirstName": "MISI", "Job Title": "BELTS MAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP200", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MWAZHA", "Contract": "ACTIVE", "FirstName": "ELIAS", "Job Title": "MECHANICAL MANAGER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP214", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MACHIMBIRIKE", "Contract": "ACTIVE", "FirstName": "TINASHE", "Job Title": "ASSISTANT MECHANICAL ENGINEER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP236", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MUDZAMIRI", "Contract": "ACTIVE", "FirstName": "TARIRO", "Job Title": "JUNIOR MECHANICAL ENGINEER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP254", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MAJUTA", "Contract": "ACTIVE", "FirstName": "KNOWLEDGE", "Job Title": "FITTER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP255", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MUTANDWA", "Contract": "ACTIVE", "FirstName": "TERRENCE", "Job Title": "CHARGEHAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP330", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MUGUDA", "Contract": "ACTIVE", "FirstName": "EVARISTO", "Job Title": "FITTER CLASS 2", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP351", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "EZALA", "Contract": "ACTIVE", "FirstName": "LOVEMORE", "Job Title": "CHARGE HAND FITTING WET PLANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP010", "Gender": "MALE", "SECTION": "MM PLANNING", "Surname": "MUPINDUKI", "Contract": "ACTIVE", "FirstName": "FARAI", "Job Title": "DRAUGHTSMAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP112", "Gender": "MALE", "SECTION": "MM PLANNING", "Surname": "STEVENAGE", "Contract": "ACTIVE", "FirstName": "JAMES", "Job Title": "MAINTENANCE PLANNER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP167", "Gender": "MALE", "SECTION": "MM PLANNING", "Surname": "MUSENGEZI", "Contract": "ACTIVE", "FirstName": "STANFORD", "Job Title": "MAINTENANCE MANAGER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP190", "Gender": "MALE", "SECTION": "MM PLANNING", "Surname": "MAGWAZA", "Contract": "ACTIVE", "FirstName": "AGNES", "Job Title": "PLANNING FOREMAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP237", "Gender": "MALE", "SECTION": "MM PLANNING", "Surname": "JESE", "Contract": "ACTIVE", "FirstName": "GAMUCHIRAI", "Job Title": "JUNIOR  PLANNING ENGINEER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ001", "Gender": "MALE", "SECTION": "MECHANICAL", "Surname": "CHALEKA", "Contract": "ACTIVE", "FirstName": "COURAGE", "Job Title": "BOILERMAKER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ003", "Gender": "MALE", "SECTION": "MECHANICAL", "Surname": "JIRI", "Contract": "ACTIVE", "FirstName": "GODKNOWS", "Job Title": "BOILERMAKER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ010", "Gender": "MALE", "SECTION": "MECHANICAL", "Surname": "GADZE", "Contract": "ACTIVE", "FirstName": "ADMIRE", "Job Title": "CHARGEHAND BOILERMAKERS", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ016", "Gender": "MALE", "SECTION": "MECHANICAL", "Surname": "MHLANGA", "Contract": "ACTIVE", "FirstName": "NDABEZINHLE", "Job Title": "BOILERMAKER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ020", "Gender": "MALE", "SECTION": "MECHANICAL", "Surname": "CHENGO", "Contract": "ACTIVE", "FirstName": "DANIEL", "Job Title": "WELDER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ025", "Gender": "MALE", "SECTION": "MECHANICAL", "Surname": "ZINYAMA", "Contract": "ACTIVE", "FirstName": "SHEPHERD", "Job Title": "WELDER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ027", "Gender": "MALE", "SECTION": "MECHANICAL", "Surname": "MKWAIKI", "Contract": "ACTIVE", "FirstName": "ROBERT", "Job Title": "BOILER MAKER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ036", "Gender": "MALE", "SECTION": "MECHANICAL", "Surname": "KAPFUNDE", "Contract": "ACTIVE", "FirstName": "ARTHUR", "Job Title": "BOILERMAKER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ039", "Gender": "MALE", "SECTION": "MECHANICAL", "Surname": "NEZUNGAI", "Contract": "ACTIVE", "FirstName": "GEORGE", "Job Title": "BOILERMAKER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ041", "Gender": "MALE", "SECTION": "MECHANICAL", "Surname": "ALFONSO", "Contract": "ACTIVE", "FirstName": "OWEN", "Job Title": "CODED WELDER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ050", "Gender": "MALE", "SECTION": "MECHANICAL", "Surname": "TICHARWA", "Contract": "ACTIVE", "FirstName": "GABRIEL", "Job Title": "BOILERMAKER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ054", "Gender": "MALE", "SECTION": "MECHANICAL", "Surname": "CHINODA", "Contract": "ACTIVE", "FirstName": "COSTEN", "Job Title": "WELDER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ077", "Gender": "MALE", "SECTION": "MECHANICAL", "Surname": "MWASANGA", "Contract": "ACTIVE", "FirstName": "RAMUS", "Job Title": "BOILERMAKER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ079", "Gender": "MALE", "SECTION": "MECHANICAL", "Surname": "MANDIZHA", "Contract": "ACTIVE", "FirstName": "CLAYTON", "Job Title": "BOILERMAKER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP072", "Gender": "MALE", "SECTION": "MECHANICAL", "Surname": "MANJONDA", "Contract": "ACTIVE", "FirstName": "GIBSON", "Job Title": "FABRICATION FOREMAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ017", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "NGWENYA", "Contract": "ACTIVE", "FirstName": "ARTASHASTAH", "Job Title": "PLUMBER CLASS 2", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ028", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MUTODZA", "Contract": "ACTIVE", "FirstName": "MUNASHE", "Job Title": "RIGGER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ029", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "TAGA-DAGA", "Contract": "ACTIVE", "FirstName": "REUBEN", "Job Title": "BOILERMAKER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ084", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MANDIGORA", "Contract": "ACTIVE", "FirstName": "AARON", "Job Title": "PLUMBER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP174", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "NJANJENI", "Contract": "ACTIVE", "FirstName": "EMMANUEL", "Job Title": "RIGGER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP201", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "HANHART", "Contract": "ACTIVE", "FirstName": "JOHN", "Job Title": "TRANSPORT & SERVICES MANAGER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP244", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MHARIWA", "Contract": "ACTIVE", "FirstName": "ENOCK", "Job Title": "TRANSPORT AND SERVICES CHARGE HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP297", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "JEREMIAH", "Contract": "ACTIVE", "FirstName": "KOROFATI", "Job Title": "PLUMBER CLASS 2", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP298", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MHEMBERE", "Contract": "ACTIVE", "FirstName": "WALTER", "Job Title": "PLUMBER CLASS 2", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP300", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "JIM", "Contract": "ACTIVE", "FirstName": "PROSPER", "Job Title": "AUTO ELECTRICIAN CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP301", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "NYAMUROWA", "Contract": "ACTIVE", "FirstName": "VICTOR", "Job Title": "DIESEL PLANT FITTER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP322", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "TEMBO", "Contract": "ACTIVE", "FirstName": "KARL", "Job Title": "RIGGER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP323", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "GUNDA", "Contract": "ACTIVE", "FirstName": "KASSAN", "Job Title": "RIGGER CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP354", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "NYONI", "Contract": "ACTIVE", "FirstName": "PETER", "Job Title": "AUTO ELECTRICIAN CLASS 1", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP363", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MTEKI", "Contract": "ACTIVE", "FirstName": "TANAKA", "Job Title": "DIESEL PLANT FITTER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP212", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "SAUNGWEME", "Contract": "ACTIVE", "FirstName": "TINASHE", "Job Title": "CIVIL ENGINEER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP305", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "USHE", "Contract": "ACTIVE", "FirstName": "TAFADZWA", "Job Title": "CIVIL TECHNICIAN TSF", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "SALARIED"}, {"Code": "DP156", "Gender": "MALE", "SECTION": "MINING", "Surname": "CHUMA", "Contract": "ACTIVE", "FirstName": "OLIVER SIMBA", "Job Title": "MINING ENGINEER", "Cost centre": "MINING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP159", "Gender": "MALE", "SECTION": "MINING", "Surname": "CHAWIRA", "Contract": "ACTIVE", "FirstName": "DESMOND", "Job Title": "SENIOR MINING ENGINEER", "Cost centre": "MINING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP165", "Gender": "MALE", "SECTION": "MINING", "Surname": "MAZANA", "Contract": "ACTIVE", "FirstName": "TAWEDZEGWA", "Job Title": "SENIOR PIT SUPERINTENDENT", "Cost centre": "MINING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP178", "Gender": "MALE", "SECTION": "MINING", "Surname": "NCUBE", "Contract": "ACTIVE", "FirstName": "STANLEY", "Job Title": "PIT SUPERINTENDENT", "Cost centre": "MINING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP234", "Gender": "MALE", "SECTION": "MINING", "Surname": "KATANDA", "Contract": "ACTIVE", "FirstName": "COBURN", "Job Title": "MINING MANAGER", "Cost centre": "MINING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP274", "Gender": "MALE", "SECTION": "MINING", "Surname": "MASONA", "Contract": "ACTIVE", "FirstName": "RYAN", "Job Title": "JUNIOR PIT SUPERINTENDENT", "Cost centre": "MINING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP359", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "ZENGENI", "Contract": "ACTIVE", "FirstName": "ELAINE", "Job Title": "EXPLORATION GEOLOGICAL TECHNICIAN", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP360", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "SAUNGWEME", "Contract": "ACTIVE", "FirstName": "LUCKSTONE", "Job Title": "EXPLORATION PROJECT MANAGER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP361", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "MUDZINGWA", "Contract": "ACTIVE", "FirstName": "TINASHE", "Job Title": "EXPLORATION GEOLOGIST", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP117", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "GEREMA", "Contract": "ACTIVE", "FirstName": "NYASHA", "Job Title": "DATABASE ADMINISTRATOR", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP163", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "LESAYA", "Contract": "ACTIVE", "FirstName": "WISDOM", "Job Title": "GEOLOGICAL TECHNICIAN", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP181", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "MUONEKA", "Contract": "ACTIVE", "FirstName": "BENEFIT", "Job Title": "RESIDENT GEOLOGIST", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP186", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "PORE", "Contract": "ACTIVE", "FirstName": "TATENDA", "Job Title": "JUNIOR GEOLOGIST", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP235", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "MATEVEKE", "Contract": "ACTIVE", "FirstName": "MARTIN", "Job Title": "GEOLOGIST", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP265", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "CHAKAWA", "Contract": "ACTIVE", "FirstName": "KUDAKWASHE", "Job Title": "GEOLOGICAL TECHNICIAN", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP139", "Gender": "MALE", "SECTION": "GEOTECHNICAL ENGINEERING", "Surname": "LULA", "Contract": "ACTIVE", "FirstName": "GUNUKA LUZIBO", "Job Title": "GEOTECHNICAL ENGINEERING TECHNICIAN", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP158", "Gender": "MALE", "SECTION": "GEOTECHNICAL ENGINEERING", "Surname": "GUNYANJA", "Contract": "ACTIVE", "FirstName": "TAKUDZWA", "Job Title": "GEOTECHNICAL ENGINEERING TECHNICIAN", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP306", "Gender": "MALE", "SECTION": "GEOTECHNICAL ENGINEERING", "Surname": "NYAMANDE", "Contract": "ACTIVE", "FirstName": "PARDON", "Job Title": "GEOTECHNICAL ENGINEER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP110", "Gender": "MALE", "SECTION": "PLANNING ", "Surname": "NEMADIRE", "Contract": "ACTIVE", "FirstName": "TINASHE", "Job Title": "MINE PLANNING SUPERINTENDENT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP128", "Gender": "MALE", "SECTION": "PLANNING ", "Surname": "ZVARAYA", "Contract": "ACTIVE", "FirstName": "MICHAEL", "Job Title": "MINING TECHNICAL SERVICES MANAGER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP157", "Gender": "MALE", "SECTION": "PLANNING ", "Surname": "TARWIREI", "Contract": "ACTIVE", "FirstName": "TINASHE", "Job Title": "JUNIOR MINE PLANNING ENGINEER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP219", "Gender": "MALE", "SECTION": "PLANNING ", "Surname": "NYIRENDA", "Contract": "ACTIVE", "FirstName": "ROBERT", "Job Title": "MINE PLANNING ENGINEER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP097", "Gender": "MALE", "SECTION": "SURVEY", "Surname": "MKANDLA", "Contract": "ACTIVE", "FirstName": "MZAMO", "Job Title": "SURVEYOR", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP100", "Gender": "MALE", "SECTION": "SURVEY", "Surname": "NGULUBE", "Contract": "ACTIVE", "FirstName": "COLLETTE", "Job Title": "CHIEF SURVEYOR", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP215", "Gender": "MALE", "SECTION": "SURVEY", "Surname": "MUJAJATI", "Contract": "ACTIVE", "FirstName": "GAMUCHIRAI", "Job Title": "SURVEYOR", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP266", "Gender": "MALE", "SECTION": "SURVEY", "Surname": "MUSHONGA", "Contract": "ACTIVE", "FirstName": "HILARY", "Job Title": "SENIOR SURVEYOR", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DGZ090", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "NOKO", "Contract": "ACTIVE", "FirstName": "TSEPO", "Job Title": "METALLURGICAL TECHNICIAN", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP251", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "NGIRANDI", "Contract": "ACTIVE", "FirstName": "BRIDGET", "Job Title": "METALLURGICAL TECHNICIAN", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP131", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "CHIKEREMA", "Contract": "ACTIVE", "FirstName": "VICTOR", "Job Title": "PLANT PRODUCTION SUPERINTENDENT", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP136", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "SITHOLE", "Contract": "ACTIVE", "FirstName": "STEWARD", "Job Title": "METALLURGICAL SUPERINTENDENT", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP137", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "CHIBAMU", "Contract": "ACTIVE", "FirstName": "GERALDINE", "Job Title": "PROCESS CONTROL SUPERVISOR", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP161", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "NYABANGA", "Contract": "ACTIVE", "FirstName": "THELMA", "Job Title": "METALLURGICAL ENGINEER", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP188", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "CHIORESO", "Contract": "ACTIVE", "FirstName": "ABGAIL", "Job Title": "PROCESS CONTROL METALLURGIST", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP228", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "MAGANGA", "Contract": "ACTIVE", "FirstName": "RUTENDO", "Job Title": "PLANT LABORATORY METALLURGIST", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP240", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "MAPOSAH", "Contract": "ACTIVE", "FirstName": "MICHELLE", "Job Title": "PROCESS CONTROL METALLURGIST", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP307", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "NCUBE", "Contract": "ACTIVE", "FirstName": "PRINCESS", "Job Title": "PROCESS CONTROL METALLURGIST", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP332", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "DUBE", "Contract": "ACTIVE", "FirstName": "BUKHOSI", "Job Title": "PLANT LABORATORY TECHNICIAN", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP334", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "KHOWA", "Contract": "ACTIVE", "FirstName": "LOUIS", "Job Title": "PROCESSING SYSTEMS ANALYST", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP335", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "MAZVIYO", "Contract": "ACTIVE", "FirstName": "RUMBIDZAI", "Job Title": "PLANT LABORATORY MET TECHNICIAN", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP125", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "JERE", "Contract": "ACTIVE", "FirstName": "ROBERT", "Job Title": "PLANT SUPERVISOR", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP134", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "ZINHU", "Contract": "ACTIVE", "FirstName": "TANYARADZWA", "Job Title": "PLANT SUPERVISOR", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP187", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "MUREVERWI", "Contract": "ACTIVE", "FirstName": "LIONEL", "Job Title": "PLANT SUPERVISOR", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP320", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "MUNODAWAFA", "Contract": "ACTIVE", "FirstName": "OBERT", "Job Title": "PROCESSING MANAGER", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP339", "Gender": "MALE", "SECTION": "PROCESSING", "Surname": "MUSAPINGURA", "Contract": "ACTIVE", "FirstName": "VISION", "Job Title": "METALLURGICAL ENGINEER", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP129", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "KHUPE", "Contract": "ACTIVE", "FirstName": "MALVIN", "Job Title": "TSF SUPERVISOR", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP252", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MANDIZIBA", "Contract": "ACTIVE", "FirstName": "JOHANNES", "Job Title": "TSF SUPERVISOR", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP299", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MAHACHI", "Contract": "ACTIVE", "FirstName": "CHAKANETSA", "Job Title": "PLANT MANAGER", "Cost centre": "PROCESSING", "Nec/ Salaried": "SALARIED"}, {"Code": "DP108", "Gender": "MALE", "SECTION": "ADMINISTRATION", "Surname": "BANDA", "Contract": "ACTIVE", "FirstName": "NELSON", "Job Title": "GENERAL MANAGER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP284", "Gender": "MALE", "SECTION": "ADMINISTRATION", "Surname": "SICHAKALA", "Contract": "ACTIVE", "FirstName": "GIVEMORE", "Job Title": "SHARED SERVICES MANAGER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP325", "Gender": "MALE", "SECTION": "CSIR", "Surname": "SIATULUBE", "Contract": "ACTIVE", "FirstName": "ANYWAY", "Job Title": "BOME HOUSES CONSTRUCTION SUPERVISOR", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP169", "Gender": "MALE", "SECTION": "ADMINISTRATION", "Surname": "MADADANGOMA", "Contract": "ACTIVE", "FirstName": "VIMBAI", "Job Title": "BUSINESS IMPROVEMENT MANAGER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP243", "Gender": "MALE", "SECTION": "ADMINISTRATION", "Surname": "MAYUNI", "Contract": "ACTIVE", "FirstName": "JOHN", "Job Title": "BUSINESS IMPROVEMENT OFFICER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP065", "Gender": "MALE", "SECTION": "CSIR", "Surname": "KHUMALO", "Contract": "ACTIVE", "FirstName": "LINDELWE", "Job Title": "COMMUNITY RELATIONS COORDINATOR", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP241", "Gender": "MALE", "SECTION": "CSIR", "Surname": "HUNGOIDZA", "Contract": "ACTIVE", "FirstName": "RUGARE", "Job Title": "ASSISTANT COMMUNITY RELATIONS OFFICER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP258", "Gender": "MALE", "SECTION": "CSIR", "Surname": "TAVENHAVE", "Contract": "ACTIVE", "FirstName": "DAPHNE", "Job Title": "COMMUNITY RELATIONS OFFICER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP040", "Gender": "MALE", "SECTION": "FINANCE", "Surname": "SAWAYA", "Contract": "ACTIVE", "FirstName": "ALEXIO", "Job Title": "BOOK KEEPER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP087", "Gender": "MALE", "SECTION": "FINANCE", "Surname": "KUHAMBA", "Contract": "ACTIVE", "FirstName": "DUNCAN", "Job Title": "FINANCE & ADMINISTRATION MANAGER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP191", "Gender": "MALE", "SECTION": "FINANCE", "Surname": "CHANDAVENGERWA", "Contract": "ACTIVE", "FirstName": "ELLEN", "Job Title": "ASSISTANT ACCOUNTANT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP145", "Gender": "MALE", "SECTION": "HUMAN RESOURCES", "Surname": "TINAGO", "Contract": "ACTIVE", "FirstName": "TINAGO", "Job Title": "HUMAN CAPITAL SUPPORT SERVICES MANAGER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP164", "Gender": "MALE", "SECTION": "HUMAN RESOURCES", "Surname": "MUWAIRI", "Contract": "ACTIVE", "FirstName": "BENJAMIN", "Job Title": "HR ADMINISTRATOR", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP216", "Gender": "MALE", "SECTION": "HUMAN RESOURCES", "Surname": "SAMURIWO", "Contract": "ACTIVE", "FirstName": "CARLTON", "Job Title": "HUMAN RESOURCES ASSISTANT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP333", "Gender": "MALE", "SECTION": "HUMAN RESOURCES", "Surname": "MAGOMANA", "Contract": "ACTIVE", "FirstName": "FREEDMORE", "Job Title": "HUMAN RESOURCES SUPERINTENDENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP130", "Gender": "MALE", "SECTION": "I.T", "Surname": "MUKWEBWA", "Contract": "ACTIVE", "FirstName": "NEIL", "Job Title": "IT OFFICER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP140", "Gender": "MALE", "SECTION": "I.T", "Surname": "GWINYAI", "Contract": "ACTIVE", "FirstName": "POUND", "Job Title": "IT SUPERINTENDENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP329", "Gender": "MALE", "SECTION": "I.T", "Surname": "DANDAVARE", "Contract": "ACTIVE", "FirstName": "FELIX", "Job Title": "SUPPORT TECHNICIAN", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP336", "Gender": "MALE", "SECTION": "STORES", "Surname": "CHINAKIDZWA", "Contract": "ACTIVE", "FirstName": "DERICK", "Job Title": "ISSUING OFFICER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP242", "Gender": "MALE", "SECTION": "STORES", "Surname": "CHIGARIRO", "Contract": "ACTIVE", "FirstName": "ASHLEY", "Job Title": "ASSISTANT EXPEDITER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP312", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "MATANDARE", "Contract": "ACTIVE", "FirstName": "SIMBARASHE", "Job Title": "SECURITY OFFICER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP313", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "WERENGANI", "Contract": "ACTIVE", "FirstName": "JANUARY", "Job Title": "SECURITY MANAGER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP084", "Gender": "MALE", "SECTION": "SHEQ", "Surname": "MUNYENYIWA", "Contract": "ACTIVE", "FirstName": "NYASHA", "Job Title": "SHE MANAGER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP148", "Gender": "MALE", "SECTION": "SHEQ", "Surname": "ZHOU", "Contract": "ACTIVE", "FirstName": "ELVIS", "Job Title": "SHE OFFICER PLANT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP162", "Gender": "MALE", "SECTION": "SHEQ", "Surname": "BASU", "Contract": "ACTIVE", "FirstName": "REST", "Job Title": "ENVIRONMENTAL & HYGIENE OFFICER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP193", "Gender": "MALE", "SECTION": "SHEQ", "Surname": "MURIMBA", "Contract": "ACTIVE", "FirstName": "NYASHA", "Job Title": "SHE ADMINISTRATOR", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP247", "Gender": "MALE", "SECTION": "SHEQ", "Surname": "MBOFANA", "Contract": "ACTIVE", "FirstName": "TINASHE", "Job Title": "SHEQ SUPERINTENDENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP249", "Gender": "MALE", "SECTION": "SHEQ", "Surname": "MARAMBANYIKA", "Contract": "ACTIVE", "FirstName": "TAWANDA", "Job Title": "SHEQ AND ENVIRONMENTAL OFFICER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP253", "Gender": "MALE", "SECTION": "SHEQ", "Surname": "TAHWA", "Contract": "ACTIVE", "FirstName": "TAFADZWA", "Job Title": "SHE ASSISTANT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP053", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "CHIRIMANI", "Contract": "ACTIVE", "FirstName": "OWEN", "Job Title": "DRIVER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP085", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "MUDUKA", "Contract": "ACTIVE", "FirstName": "ITAI", "Job Title": "CHEF", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP150", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "SENZERE", "Contract": "ACTIVE", "FirstName": "ARTLEY", "Job Title": "SITE COORDINATION OFFICER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP328", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "YONA", "Contract": "ACTIVE", "FirstName": "SIMON", "Job Title": "CATERING AND HOUSEKEEPING SUPERVISOR", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP041", "Gender": "MALE", "SECTION": "STORES", "Surname": "WAMBE", "Contract": "ACTIVE", "FirstName": "IGNATIOUS", "Job Title": "STORES CONTROLLER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP091", "Gender": "MALE", "SECTION": "STORES", "Surname": "DENGENDE", "Contract": "ACTIVE", "FirstName": "TENDAI", "Job Title": "STORES MANAGER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP172", "Gender": "MALE", "SECTION": "STORES", "Surname": "MADONDO", "Contract": "ACTIVE", "FirstName": "MUNYARADZI", "Job Title": "ISSUING OFFICER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP173", "Gender": "MALE", "SECTION": "STORES", "Surname": "HAMANDISHE", "Contract": "ACTIVE", "FirstName": "VIOLET", "Job Title": "STORES CONTROLLER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP246", "Gender": "MALE", "SECTION": "STORES", "Surname": "MOYO", "Contract": "ACTIVE", "FirstName": "MESULI", "Job Title": "RECEIVING OFFICER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP267", "Gender": "MALE", "SECTION": "STORES", "Surname": "BALENI", "Contract": "ACTIVE", "FirstName": "RAYNARD", "Job Title": "PYLOG ADMINISTRATOR", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP233", "Gender": "MALE", "SECTION": "TRAINING ", "Surname": "MUSADEMBA", "Contract": "ACTIVE", "FirstName": "GAYNOR", "Job Title": "GRADUATE TRAINEE", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP238", "Gender": "MALE", "SECTION": "TRAINING ", "Surname": "CHAPUNZA", "Contract": "ACTIVE", "FirstName": "IRVIN", "Job Title": "GRADUATE TRAINEE METALLURGY", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP239", "Gender": "MALE", "SECTION": "TRAINING ", "Surname": "MAZARA", "Contract": "ACTIVE", "FirstName": "SOLOMON", "Job Title": "GRADUATE TRAINEE METALLURGY", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP273", "Gender": "MALE", "SECTION": "TRAINING ", "Surname": "MAGADU", "Contract": "ACTIVE", "FirstName": "TAFADZWA", "Job Title": "GRADUATE TRAINEE", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP278", "Gender": "MALE", "SECTION": "TRAINING ", "Surname": "GOMBEDZA", "Contract": "ACTIVE", "FirstName": "LISA", "Job Title": "ASSAY LABORATORY TECHNICIAN TRAINEE", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP283", "Gender": "MALE", "SECTION": "TRAINING ", "Surname": "MAGOMO", "Contract": "ACTIVE", "FirstName": "SAMUEL", "Job Title": "SHEQ GRADUATE TRAINEE", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP288", "Gender": "MALE", "SECTION": "TRAINING ", "Surname": "MUKOVA", "Contract": "ACTIVE", "FirstName": "SAVIOUS", "Job Title": "GRADUATE TRAINEE MINING", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP289", "Gender": "MALE", "SECTION": "TRAINING ", "Surname": "DOBBIE", "Contract": "ACTIVE", "FirstName": "TERRENCE", "Job Title": "GRADUATE TRAINEE MINING", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP290", "Gender": "MALE", "SECTION": "TRAINING ", "Surname": "MAVURU", "Contract": "ACTIVE", "FirstName": "CHANTELLE", "Job Title": "GRADUATE TRAINEE MINING", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP291", "Gender": "MALE", "SECTION": "TRAINING ", "Surname": "SAUNYAMA", "Contract": "ACTIVE", "FirstName": "ANDY", "Job Title": "GRADUATE TRAINEE METALLURGY", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP292", "Gender": "MALE", "SECTION": "TRAINING ", "Surname": "NYIKA", "Contract": "ACTIVE", "FirstName": "TANAKA", "Job Title": "GRADUATE TRAINEE METALLURGY", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP293", "Gender": "MALE", "SECTION": "TRAINING ", "Surname": "MLAMBO", "Contract": "ACTIVE", "FirstName": "PRIMROSE", "Job Title": "GRADUATE TRAINEE METALLURGY", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP311", "Gender": "MALE", "SECTION": "TRAINING ", "Surname": "MOYO", "Contract": "ACTIVE", "FirstName": "NYASHA", "Job Title": "TRAINING AND DEVELOPMENT OFFICER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP324", "Gender": "MALE", "SECTION": "TRAINING ", "Surname": "MUPAMBA", "Contract": "ACTIVE", "FirstName": "ZIVANAI", "Job Title": "GT MECHANICAL ENGINEERING", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DP352", "Gender": "MALE", "SECTION": "TRAINING ", "Surname": "TSORAI", "Contract": "ACTIVE", "FirstName": "TONDERAI", "Job Title": "GRADUATE TRAINEE ACCOUNTING", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "SALARIED"}, {"Code": "DG223", "Gender": "MALE", "SECTION": "HEAD OFFICE", "Surname": "NYAWANGA", "Contract": "ACTIVE", "FirstName": "INNOCENT", "Job Title": "WAREHOUSE ASSISTANT", "Cost centre": "HEAD OFFICE", "Nec/ Salaried": "NEC"}, {"Code": "DG224", "Gender": "MALE", "SECTION": "HEAD OFFICE", "Surname": "NGOROSHA", "Contract": "ACTIVE", "FirstName": "LOVEMORE", "Job Title": "WAREHOUSE ASSISTANT", "Cost centre": "HEAD OFFICE", "Nec/ Salaried": "NEC"}, {"Code": "DG478", "Gender": "MALE", "SECTION": "HEAD OFFICE", "Surname": "NYAHOKO", "Contract": "ACTIVE", "FirstName": "PHIBION", "Job Title": "GENERAL HAND", "Cost centre": "HEAD OFFICE", "Nec/ Salaried": "NEC"}, {"Code": "DG627", "Gender": "MALE", "SECTION": "HEAD OFFICE", "Surname": "SANGARE", "Contract": "ACTIVE", "FirstName": "MIRIAM", "Job Title": "OFFICE CLEANER", "Cost centre": "HEAD OFFICE", "Nec/ Salaried": "NEC"}, {"Code": "DG006", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "CHATAMBUDZIKI", "Contract": "ACTIVE", "FirstName": "GEORGE", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG014", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "DIRE", "Contract": "ACTIVE", "FirstName": "GANIZANI", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG015", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "GREYA", "Contract": "ACTIVE", "FirstName": "NEVER", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG045", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "GANDIWA", "Contract": "ACTIVE", "FirstName": "MICHAEL", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG077", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "CHIKUNI", "Contract": "ACTIVE", "FirstName": "TADIWANASHE", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG080", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "CHANDIWANA", "Contract": "ACTIVE", "FirstName": "RAPHAEL", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG081", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "MASIKINYE", "Contract": "ACTIVE", "FirstName": "TAPIWA", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG149", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "KADZIMA", "Contract": "ACTIVE", "FirstName": "DOCTOR", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG157", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "CHIGODHO", "Contract": "ACTIVE", "FirstName": "CURRENCY", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG249", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "NYANKUNI", "Contract": "ACTIVE", "FirstName": "TONDERAI", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG250", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "MASIYA", "Contract": "ACTIVE", "FirstName": "MALVERN", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG251", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "CHIORESE", "Contract": "ACTIVE", "FirstName": "TALENT", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG252", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "CHIBANDA", "Contract": "ACTIVE", "FirstName": "NGONI", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG253", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "VENGERE", "Contract": "ACTIVE", "FirstName": "TRUST", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG254", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "BOX", "Contract": "ACTIVE", "FirstName": "RACCELL", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG255", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "MAKOSA", "Contract": "ACTIVE", "FirstName": "PALMER", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG277", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "MARISA", "Contract": "ACTIVE", "FirstName": "CLINTON MUNYARADZI", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG284", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "CHIKOVO", "Contract": "ACTIVE", "FirstName": "TAFADZWA", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG297", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "KAVENDA", "Contract": "ACTIVE", "FirstName": "TAKUNDA", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG301", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "MARIMO", "Contract": "ACTIVE", "FirstName": "STANLEY", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG357", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "CHIRIMANI", "Contract": "ACTIVE", "FirstName": "CHENGETAI", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG358", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "MARATA", "Contract": "ACTIVE", "FirstName": "LINCORN", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG428", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "NHAMOYEBONDE", "Contract": "ACTIVE", "FirstName": "MICHAEL", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG600", "Gender": "MALE", "SECTION": "LABORATORY", "Surname": "MUKUMBAREZA", "Contract": "ACTIVE", "FirstName": "PROSPER", "Job Title": "LABORATORY ASSISTANT", "Cost centre": "LABORATORY", "Nec/ Salaried": "NEC"}, {"Code": "DG059", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "NHEMACHENA", "Contract": "ACTIVE", "FirstName": "ELWED", "Job Title": "BUILDER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG147", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "MUFENGI", "Contract": "ACTIVE", "FirstName": "EZRA", "Job Title": "SEMI- SKILLED BUILDER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG019", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "MADZVITI", "Contract": "ACTIVE", "FirstName": "FRANK", "Job Title": "ELECTRICIAN ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG034", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "NYARIRI", "Contract": "ACTIVE", "FirstName": "COLLINS", "Job Title": "SEMI- SKILLED ELECTRICIAN", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG104", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "KAMANGE", "Contract": "ACTIVE", "FirstName": "ERNEST", "Job Title": "ELECTRICIAN ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG105", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "KAZUNGA", "Contract": "ACTIVE", "FirstName": "TENDEKAI", "Job Title": "ELECTRICIAN ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG106", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "KASINGANETE", "Contract": "ACTIVE", "FirstName": "PERFORMANCE", "Job Title": "ELECTRICIAN ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG317", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "MAJONGA", "Contract": "ACTIVE", "FirstName": "GODFREY", "Job Title": "ELECTRICAL ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG379", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "PAGAN'A", "Contract": "ACTIVE", "FirstName": "TINEI", "Job Title": "ELECTRICAL ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG578", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "NGWENYA", "Contract": "ACTIVE", "FirstName": "TAKUNDA", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG581", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "CHIMANIKIRE", "Contract": "ACTIVE", "FirstName": "SYDNEY", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG587", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "CHAPONDA", "Contract": "ACTIVE", "FirstName": "MEKELANI", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG605", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "HOVE", "Contract": "ACTIVE", "FirstName": "STUDY", "Job Title": "INSTRUMENTS TECHS ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG644", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "MAPOPE", "Contract": "ACTIVE", "FirstName": "KUDZAI", "Job Title": "INSTRUMENTATIONS ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG647", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "RAVU", "Contract": "ACTIVE", "FirstName": "REGIS", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG650", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "DENHERE", "Contract": "ACTIVE", "FirstName": "JOHN", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG654", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "GWETA", "Contract": "ACTIVE", "FirstName": "TANYARADZWA", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG655", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "MAZVAZVA", "Contract": "ACTIVE", "FirstName": "NOMORE", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG707", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "CHIANGWA", "Contract": "ACTIVE", "FirstName": "CHARMAINE", "Job Title": "INSTRUMENTATIONS ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG732", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "TYRMORE", "Contract": "ACTIVE", "FirstName": "NGOCHO", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG739", "Gender": "MALE", "SECTION": "ELECTRICAL ", "Surname": "CHAPONDA", "Contract": "ACTIVE", "FirstName": "TROUBLE", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG029", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MUZVONDIWA", "Contract": "ACTIVE", "FirstName": "BRIGHTON", "Job Title": "FITTERS ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG124", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "JINYA", "Contract": "ACTIVE", "FirstName": "TINOTENDA", "Job Title": "FITTER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG192", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MUNENGIWA", "Contract": "ACTIVE", "FirstName": "SIMON", "Job Title": "FITTERS ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG242", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "KANYERA", "Contract": "ACTIVE", "FirstName": "CARLOS", "Job Title": "FITTER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG349", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MUGUTI", "Contract": "ACTIVE", "FirstName": "DAVID", "Job Title": "FITTER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG359", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MACHACHA", "Contract": "ACTIVE", "FirstName": "ADMIRE", "Job Title": "FITTER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG392", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "CHIMANGA", "Contract": "ACTIVE", "FirstName": "EDMORE", "Job Title": "FITTER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG604", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MATOROFA", "Contract": "ACTIVE", "FirstName": "NYASHA", "Job Title": "FITTER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG614", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "CHIGWADA", "Contract": "ACTIVE", "FirstName": "ENOCK", "Job Title": "PLUMBER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG706", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MAPFUMO", "Contract": "ACTIVE", "FirstName": "NGONIDZASHE", "Job Title": "FITTERS ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG335", "Gender": "MALE", "SECTION": "PLANNING", "Surname": "BANGANYIKA", "Contract": "ACTIVE", "FirstName": "TAFADZWA DYLAN", "Job Title": "PLANNING CLERK", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG479", "Gender": "MALE", "SECTION": "PLANNING", "Surname": "ZHOU", "Contract": "ACTIVE", "FirstName": "SHARON", "Job Title": "PLANNING CLERK", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG535", "Gender": "MALE", "SECTION": "PLANNING", "Surname": "GWAMATSA", "Contract": "ACTIVE", "FirstName": "HANDSON", "Job Title": "CLASS 2 DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG603", "Gender": "MALE", "SECTION": "PLANNING", "Surname": "NYANDORO", "Contract": "ACTIVE", "FirstName": "TAKESURE", "Job Title": "STANDBY DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG021", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MARUNGISA", "Contract": "ACTIVE", "FirstName": "DOUGLAS", "Job Title": "BOILERMAKER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG022", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MARUNGISA", "Contract": "ACTIVE", "FirstName": "MUCHENJE", "Job Title": "BOILERMAKER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG051", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MUROYIWA", "Contract": "ACTIVE", "FirstName": "LAMECK", "Job Title": "SCAFFOLDER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG064", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "KAJARI", "Contract": "ACTIVE", "FirstName": "AUSTIN", "Job Title": "SEMI SKILLED PAINTER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG066", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "TANDI", "Contract": "ACTIVE", "FirstName": "TAPFUMANEI", "Job Title": "SCAFFOLDER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG176", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MAODZWA", "Contract": "ACTIVE", "FirstName": "PADDINGTON F", "Job Title": "BOILERMAKER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG177", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "GOROMONZI", "Contract": "ACTIVE", "FirstName": "EMMANUEL", "Job Title": "BOILERMAKER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG182", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "CHITIMA", "Contract": "ACTIVE", "FirstName": "CLEMENCE", "Job Title": "BOILERMAKER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG246", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MASUKU", "Contract": "ACTIVE", "FirstName": "SHINGIRAI", "Job Title": "BOILERMAKER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG303", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MAPIRA", "Contract": "ACTIVE", "FirstName": "AARON", "Job Title": "SCAFFOLDER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG351", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MUDAVANHU", "Contract": "ACTIVE", "FirstName": "STEADY", "Job Title": "BOILERMAKER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG495", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "NGWENYA", "Contract": "ACTIVE", "FirstName": "THEMBINKOSI", "Job Title": "BOILERMAKERS ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG529", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "MHONYERA", "Contract": "ACTIVE", "FirstName": "GEORGE", "Job Title": "SEMI SKILLED PAINTER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG594", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "SIBANDA", "Contract": "ACTIVE", "FirstName": "TACHIONA", "Job Title": "FITTER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG656", "Gender": "MALE", "SECTION": "MECHANICAL ", "Surname": "CHITUMBURA", "Contract": "ACTIVE", "FirstName": "TAKUNDA", "Job Title": "BOILERMAKER ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG008", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "CHIGODHO", "Contract": "ACTIVE", "FirstName": "DAVID", "Job Title": "TRACTOR DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG024", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MUTIKITSI", "Contract": "ACTIVE", "FirstName": "ROBERT", "Job Title": "UD TRUCK DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG041", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MAZHAMBE", "Contract": "ACTIVE", "FirstName": "GOOD", "Job Title": "TLB OPERATOR", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG047", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "LAVU", "Contract": "ACTIVE", "FirstName": "THOMAS", "Job Title": "EXCAVATOR OPERATOR", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG087", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MKANDAWIRE", "Contract": "ACTIVE", "FirstName": "FRIDAY", "Job Title": "FRONT END LOADER OPERATOR", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG096", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "ZVENYIKA", "Contract": "ACTIVE", "FirstName": "TANAKA", "Job Title": "CRANE OPERATOR", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG100", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "CHAKASARA", "Contract": "ACTIVE", "FirstName": "WORKERS", "Job Title": "TRACTOR DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG101", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "CEPHAS", "Contract": "ACTIVE", "FirstName": "PASSMORE", "Job Title": "ASSISTANT PLUMBER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG108", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "NGOMA", "Contract": "ACTIVE", "FirstName": "BRIGHTON", "Job Title": "FRONT END LOADER OPERATOR", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG125", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "CHATIZA", "Contract": "ACTIVE", "FirstName": "PAUL", "Job Title": "PLUMBERS ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG218", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "KAMAMBO", "Contract": "ACTIVE", "FirstName": "TINEI", "Job Title": "BUS DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG243", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "NDIRA", "Contract": "ACTIVE", "FirstName": "PISIRAI", "Job Title": "PLUMBERS ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG312", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MUGOCHI", "Contract": "ACTIVE", "FirstName": "BRENDO", "Job Title": "WORKSHOP ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG334", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MAPETESE", "Contract": "ACTIVE", "FirstName": "MAZVITA", "Job Title": "BUS DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG405", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MARIKANO", "Contract": "ACTIVE", "FirstName": "ISAAC", "Job Title": "EXCAVATOR OPERATOR", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG446", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "NTALA", "Contract": "ACTIVE", "FirstName": "KUDAKWASHE", "Job Title": "CRANE OPERATOR", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG447", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MUROMBO", "Contract": "ACTIVE", "FirstName": "PAIMETY", "Job Title": "CRANE OPERATOR", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG490", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "PHIRI", "Contract": "ACTIVE", "FirstName": "BHEU", "Job Title": "UD CLASS 2 DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG491", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "KATSANDE", "Contract": "ACTIVE", "FirstName": "SAMUAEL", "Job Title": "STANDBY DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG526", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "CHIPENGO", "Contract": "ACTIVE", "FirstName": "LEONARD", "Job Title": "BUS DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG534", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "CHIWOCHA", "Contract": "ACTIVE", "FirstName": "STANLEY", "Job Title": "MOBIL CRANE OPERATOR", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG538", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MUZHONA", "Contract": "ACTIVE", "FirstName": "ONISMO", "Job Title": "SEMI SKILLED PLUMBER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG547", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MUTWIRA", "Contract": "ACTIVE", "FirstName": "STEVEN", "Job Title": "BUS DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG548", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "DZIMIRI", "Contract": "ACTIVE", "FirstName": "EVEREST", "Job Title": "BUS DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG573", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MAJENGWA", "Contract": "ACTIVE", "FirstName": "EDMORE", "Job Title": "TLB OPERATOR", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG574", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "ZISO", "Contract": "ACTIVE", "FirstName": "SIMBARASHE", "Job Title": "TELEHANDLER OPERATOR", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG694", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "ZODZIWA", "Contract": "ACTIVE", "FirstName": "MAVUTO", "Job Title": "BUS DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG708", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "JIMU", "Contract": "ACTIVE", "FirstName": "TONDERAI", "Job Title": "FEL OPERATOR", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG719", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "CHIFAMBA", "Contract": "ACTIVE", "FirstName": "COURAGE", "Job Title": "WORKSHOP CLERK", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG736", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "DZIMBANHETE", "Contract": "ACTIVE", "FirstName": "MARTIN", "Job Title": "CLASS 1 BUS DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG737", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "JAKACHIRA", "Contract": "ACTIVE", "FirstName": "WISDOM", "Job Title": "CLASS 1 BUS DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG738", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "NYABADZA", "Contract": "ACTIVE", "FirstName": "JONATHAN", "Job Title": "CLASS 1 BUS DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG758", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "GWESHE", "Contract": "ACTIVE", "FirstName": "DOUBT", "Job Title": "TELEHANDLER OPERATOR", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG778", "Gender": "MALE", "SECTION": "MOBILE WORKSHOP", "Surname": "MAHLENGEZANA", "Contract": "ACTIVE", "FirstName": "STANLEY", "Job Title": "EXCAVATOR OPERATOR", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG098", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "KURUDZA", "Contract": "ACTIVE", "FirstName": "MONEYWORK", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG129", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "MANHANGA", "Contract": "ACTIVE", "FirstName": "WILBERT", "Job Title": "SEMI-SKILLED BUILDER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG145", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "KURUDZA", "Contract": "ACTIVE", "FirstName": "FARAI", "Job Title": "BUILDER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG159", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "CHIGODHO", "Contract": "ACTIVE", "FirstName": "SIMBARASHE", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG160", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "MUPUNGA", "Contract": "ACTIVE", "FirstName": "MACDONALD", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG258", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "MURINGAYI", "Contract": "ACTIVE", "FirstName": "FIDELIS", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG261", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "MBURUMA", "Contract": "ACTIVE", "FirstName": "EPHRAIM", "Job Title": "SEMI-SKILLED BUILDER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG263", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "MARERWA", "Contract": "ACTIVE", "FirstName": "OBINISE", "Job Title": "SEMI-SKILLED BUILDER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG272", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "MUJERI", "Contract": "ACTIVE", "FirstName": "GARIKAI", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG275", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "RUNZIRA", "Contract": "ACTIVE", "FirstName": "DOMINIC", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG292", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "JAIROS", "Contract": "ACTIVE", "FirstName": "RAYMOND", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG294", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "KAKORE", "Contract": "ACTIVE", "FirstName": "CRY", "Job Title": "SEMI-SKILLED BUILDER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG318", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "WEBSTER", "Contract": "ACTIVE", "FirstName": "JOSHUA", "Job Title": "SEMI-SKILLED BUILDER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG319", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "FRANCIS", "Contract": "ACTIVE", "FirstName": "MAZVANARA", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG325", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "FURAWU", "Contract": "ACTIVE", "FirstName": "KENNY", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG329", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "MAGUSVI", "Contract": "ACTIVE", "FirstName": "TAFADZWA", "Job Title": "SEMI- SKILLED CARPENTER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG331", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "MUZAVA", "Contract": "ACTIVE", "FirstName": "ADMIRE", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG387", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "CHAKUINGA", "Contract": "ACTIVE", "FirstName": "HOWARD", "Job Title": "SEMI-SKILLED BUILDER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG398", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "THOM", "Contract": "ACTIVE", "FirstName": "SIMBARASHE", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG406", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "VARETA", "Contract": "ACTIVE", "FirstName": "TIGHT", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG484", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "NYAMAYARO", "Contract": "ACTIVE", "FirstName": "CLEVER", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG487", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "MUNYARADZI", "Contract": "ACTIVE", "FirstName": "STANLEY", "Job Title": "BUILDER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG504", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "PFUPA", "Contract": "ACTIVE", "FirstName": "PROSPERITY", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG507", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "SIMUDZIRAYI", "Contract": "ACTIVE", "FirstName": "LOVEMORE", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG512", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "CHIKOYA", "Contract": "ACTIVE", "FirstName": "VITALIS", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG537", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "CHIKOYA", "Contract": "ACTIVE", "FirstName": "NIGEL", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG542", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "MBUNDURE", "Contract": "ACTIVE", "FirstName": "EMETI", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG563", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "CHIPENGO", "Contract": "ACTIVE", "FirstName": "PARTSON", "Job Title": "SEMI- SKILLED BUILDER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG564", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "MAKAYI", "Contract": "ACTIVE", "FirstName": "IGNATIOUS", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG613", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "KAMBEWU", "Contract": "ACTIVE", "FirstName": "HARMONY", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG659", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "CHIYANGE", "Contract": "ACTIVE", "FirstName": "GIVEMORE", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG693", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "CHIDHAWU", "Contract": "ACTIVE", "FirstName": "RANGANAI", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG709", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "MUCHEMERANWA", "Contract": "ACTIVE", "FirstName": "JOSHUA", "Job Title": "SCAFFOLDERS ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG710", "Gender": "MALE", "SECTION": "CIVILS ", "Surname": "MURONZI", "Contract": "ACTIVE", "FirstName": "EVANS", "Job Title": "SEMI SKILLED BUILDER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG102", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "KADZIMA", "Contract": "ACTIVE", "FirstName": "RICHMORE", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG130", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "KAZUNGA", "Contract": "ACTIVE", "FirstName": "ITAYI", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG154", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MANHANGA", "Contract": "ACTIVE", "FirstName": "STANLEY", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG186", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MAHOVO", "Contract": "ACTIVE", "FirstName": "COURAGE", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG193", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MUSIWA", "Contract": "ACTIVE", "FirstName": "EFTON", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG219", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MUZA", "Contract": "ACTIVE", "FirstName": "CHAMUNORWA", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG226", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "NYAMUKWATURA", "Contract": "ACTIVE", "FirstName": "SIMON", "Job Title": "TEAM LEADER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG326", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "GANDIWA", "Contract": "ACTIVE", "FirstName": "OWEN", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG339", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MAVHUNGA", "Contract": "ACTIVE", "FirstName": "PAUL", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG347", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "KASEKE", "Contract": "ACTIVE", "FirstName": "DYLLAN", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG380", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MANYAMBA", "Contract": "ACTIVE", "FirstName": "SIWASHIRO", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG383", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MUSORA", "Contract": "ACTIVE", "FirstName": "TRUST", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG386", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MATAI", "Contract": "ACTIVE", "FirstName": "TAFADZWA", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG426", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "PHIRI", "Contract": "ACTIVE", "FirstName": "NAPHTALI", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG427", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MAZHAMBE", "Contract": "ACTIVE", "FirstName": "MATHEW", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG439", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MAGWAZA", "Contract": "ACTIVE", "FirstName": "GEORGE", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG445", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "NHAMOYEBONDE", "Contract": "ACTIVE", "FirstName": "KELVIN", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG450", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "HARUMBWI", "Contract": "ACTIVE", "FirstName": "TINASHE", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG451", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MUKWENYA", "Contract": "ACTIVE", "FirstName": "VIRIMAI ANESU", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG492", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "CHAMONYONGA", "Contract": "ACTIVE", "FirstName": "WHITEHEAD", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG493", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "SIREWU", "Contract": "ACTIVE", "FirstName": "CARLINGTON", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG494", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "ARUTURA", "Contract": "ACTIVE", "FirstName": "WELLINGTON", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG496", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "KAMU", "Contract": "ACTIVE", "FirstName": "EDSON", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG497", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "NGULUWE", "Contract": "ACTIVE", "FirstName": "MALVERN", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG498", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MUNANGA", "Contract": "ACTIVE", "FirstName": "BRADELY", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG513", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "KATURA", "Contract": "ACTIVE", "FirstName": "TONDERAI", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG515", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "GOROMONZI", "Contract": "ACTIVE", "FirstName": "TAFADZWA", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG517", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "TEMBO", "Contract": "ACTIVE", "FirstName": "GIFT", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG536", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MOYO", "Contract": "ACTIVE", "FirstName": "THABANI", "Job Title": "DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG624", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "RUSWA", "Contract": "ACTIVE", "FirstName": "PANASHE", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG629", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "NGIRAZI", "Contract": "ACTIVE", "FirstName": "LAMECK", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG630", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "DANDAWA", "Contract": "ACTIVE", "FirstName": "EVIDENCE", "Job Title": "STANDBY DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG632", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "CHIGODO", "Contract": "ACTIVE", "FirstName": "ANYWAY", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG633", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MUDHINDO", "Contract": "ACTIVE", "FirstName": "LIBERTY", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG637", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "FUSIRA", "Contract": "ACTIVE", "FirstName": "REMEMBER", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG657", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "MASHIKI", "Contract": "ACTIVE", "FirstName": "ALBERT", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG702", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "TOGAREPI", "Contract": "ACTIVE", "FirstName": "JABULANI", "Job Title": "CLASS 4 DRIVER", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG733", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "CHIRIMA", "Contract": "ACTIVE", "FirstName": "TATENDA", "Job Title": "ELECTRICIAN ASSISTANT", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG757", "Gender": "MALE", "SECTION": "TAILS STORAGE FACILITY", "Surname": "GOZHO", "Contract": "ACTIVE", "FirstName": "ZVIKOMBORERO", "Job Title": "GENERAL HAND", "Cost centre": "MAINTENANCE", "Nec/ Salaried": "NEC"}, {"Code": "DG291", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "GUNJA", "Contract": "ACTIVE", "FirstName": "LEAN", "Job Title": "CORE SHED ATTENDANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG004", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "BHOBHO", "Contract": "ACTIVE", "FirstName": "COLLEN", "Job Title": "TRAINEE GEO TECH", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG013", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "CHITUMBA", "Contract": "ACTIVE", "FirstName": "BIGGIE", "Job Title": "TRAINEE GEO TECH", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG017", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "KARISE", "Contract": "ACTIVE", "FirstName": "KENNETH", "Job Title": "TRAINEE GEO TECH", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG067", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "MAPORISA", "Contract": "ACTIVE", "FirstName": "CHARLES", "Job Title": "SAMPLER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG069", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "CHIDORA", "Contract": "ACTIVE", "FirstName": "PRUDENCE", "Job Title": "SAMPLER RC DRILLING", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG153", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "MAPOSA", "Contract": "ACTIVE", "FirstName": "SHELLINGTON", "Job Title": "SAMPLER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG208", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "CHIMANIKIRE", "Contract": "ACTIVE", "FirstName": "VENGAI", "Job Title": "SAMPLER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG268", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "TAULO", "Contract": "ACTIVE", "FirstName": "ANHTONY", "Job Title": "SAMPLER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG270", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "NDORO", "Contract": "ACTIVE", "FirstName": "TINASHE", "Job Title": "SAMPLER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG280", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "CHAPUKA", "Contract": "ACTIVE", "FirstName": "TAKAWIRA", "Job Title": "SAMPLER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG282", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "CHIKORE", "Contract": "ACTIVE", "FirstName": "ANDERSON", "Job Title": "SAMPLER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG298", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "MADZIVANZIRA", "Contract": "ACTIVE", "FirstName": "NEBIA", "Job Title": "SAMPLER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG302", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "CHINYAMA", "Contract": "ACTIVE", "FirstName": "LINDSAY", "Job Title": "DATA CAPTURE CLERK", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG313", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "GUNI", "Contract": "ACTIVE", "FirstName": "DARLINGTON", "Job Title": "SAMPLER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG321", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "MASHONGANYIKA", "Contract": "ACTIVE", "FirstName": "NIGEL", "Job Title": "SAMPLER (RC DRILLING)", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG381", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "NYANHETE", "Contract": "ACTIVE", "FirstName": "ARCHBORD", "Job Title": "SAMPLER RC DRILLING", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG418", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "NHAURIRO", "Contract": "ACTIVE", "FirstName": "ENIFA", "Job Title": "SAMPLER RC DRILLING", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG453", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "MUCHAZIVEPI", "Contract": "ACTIVE", "FirstName": "MALVERN", "Job Title": "SAMPLER RC DRILLING", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG500", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "MUGARI", "Contract": "ACTIVE", "FirstName": "ABEL", "Job Title": "SAMPLER RC DRILLING", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG501", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "NGOCHO", "Contract": "ACTIVE", "FirstName": "TATENDA", "Job Title": "DATA CAPTURE CLERK", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG502", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "NZVAURA", "Contract": "ACTIVE", "FirstName": "GRACIOUS", "Job Title": "SAMPLER RC DRILLING", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG651", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "NHAMOYEBONDE", "Contract": "ACTIVE", "FirstName": "NYASHA", "Job Title": "SAMPLER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG666", "Gender": "MALE", "SECTION": "GEOLOGY ", "Surname": "MUROIWA", "Contract": "ACTIVE", "FirstName": "MUNYARADZI", "Job Title": "RC SAMPLER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG048", "Gender": "MALE", "SECTION": "SURVEY ", "Surname": "KADZIMA", "Contract": "ACTIVE", "FirstName": "POWERMAN", "Job Title": "SURVEY ASSISTANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG288", "Gender": "MALE", "SECTION": "SURVEY ", "Surname": "CHIZANGA", "Contract": "ACTIVE", "FirstName": "TAURAI", "Job Title": "SURVEY ASSISTANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG300", "Gender": "MALE", "SECTION": "SURVEY ", "Surname": "MASONDO", "Contract": "ACTIVE", "FirstName": "AUSTIN", "Job Title": "SURVEY ASSISTANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG338", "Gender": "MALE", "SECTION": "SURVEY ", "Surname": "NCUBE", "Contract": "ACTIVE", "FirstName": "THABANI", "Job Title": "SURVEY ASSISTANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG416", "Gender": "MALE", "SECTION": "SURVEY ", "Surname": "MAZHAMBE", "Contract": "ACTIVE", "FirstName": "KUDAKWASHE", "Job Title": "SURVEY ASSISTANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG435", "Gender": "MALE", "SECTION": "SURVEY ", "Surname": "DAWA", "Contract": "ACTIVE", "FirstName": "LIBERTY", "Job Title": "SURVEY ASSISTANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG648", "Gender": "MALE", "SECTION": "SURVEY ", "Surname": "MARARA", "Contract": "ACTIVE", "FirstName": "DOMINIC", "Job Title": "SURVEY ASSISTANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG649", "Gender": "MALE", "SECTION": "SURVEY ", "Surname": "SIBANDA", "Contract": "ACTIVE", "FirstName": "VALENTINE", "Job Title": "DRIVER", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG730", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "DHAMBUZA", "Contract": "ACTIVE", "FirstName": "KUDZAISHE", "Job Title": "CORE SHED ATTENDANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG770", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "CHINZOU", "Contract": "ACTIVE", "FirstName": "PANASHE", "Job Title": "DRILL RIG ASSISTANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG771", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "CHIKUKWA", "Contract": "ACTIVE", "FirstName": "ANTHONY", "Job Title": "DRILL RIG ASSISTANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG772", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "MUTSIKIWA", "Contract": "ACTIVE", "FirstName": "JEMITINOS", "Job Title": "CORE SHED ATTENDANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG773", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "JAVANGWE", "Contract": "ACTIVE", "FirstName": "REJOICE", "Job Title": "DRILL RIG ASSISTANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG774", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "MUNYENYIWA", "Contract": "ACTIVE", "FirstName": "TATENDA", "Job Title": "DRILL RIG ASSISTANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG775", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "MAVHURA", "Contract": "ACTIVE", "FirstName": "TONDERAI", "Job Title": "DRILL RIG ASSISTANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG776", "Gender": "MALE", "SECTION": "GEOLOGY", "Surname": "MASVANHISE", "Contract": "ACTIVE", "FirstName": "PRINCE", "Job Title": "DRILL RIG ASSISTANT", "Cost centre": "MINING TECHNICAL SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG112", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MAPULAZI", "Contract": "ACTIVE", "FirstName": "MANUEL", "Job Title": "CIL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG200", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KASEKE", "Contract": "ACTIVE", "FirstName": "NYASHA", "Job Title": "RELIEF CREW ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG370", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "NYASULO", "Contract": "ACTIVE", "FirstName": "BESON", "Job Title": "CIL OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG403", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIHWAKU", "Contract": "ACTIVE", "FirstName": "DADIRAI", "Job Title": "GENERAL ASSISTANT CIL", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG480", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIBHAGU", "Contract": "ACTIVE", "FirstName": "THELMA", "Job Title": "GENERAL PLANT ATTENDANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG521", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "WANJOWA", "Contract": "ACTIVE", "FirstName": "MAXWELL", "Job Title": "CIL OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG551", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "GUDO", "Contract": "ACTIVE", "FirstName": "LAWRENCIOUS", "Job Title": "GENERAL PLANT ATTENDANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG247", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KADAIRA", "Contract": "ACTIVE", "FirstName": "HILTON", "Job Title": "ELUTION & REAGENTS ASSIST", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG371", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "PITCHES", "Contract": "ACTIVE", "FirstName": "UMALI", "Job Title": "ELUTION OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG373", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "PARADZAYI", "Contract": "ACTIVE", "FirstName": "EMMANUEL", "Job Title": "ELUTION OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG375", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MUZIRA", "Contract": "ACTIVE", "FirstName": "FARAI", "Job Title": "ELUTION OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG420", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIKOYA", "Contract": "ACTIVE", "FirstName": "MELODY", "Job Title": "RELIEF CREW ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG466", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MANYANGE", "Contract": "ACTIVE", "FirstName": "VENGESAI", "Job Title": "ELUTION ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG011", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHINGUWA", "Contract": "ACTIVE", "FirstName": "AUGUSTINE", "Job Title": "BALLMILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG052", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MUSIIWA", "Contract": "ACTIVE", "FirstName": "DUNGISANI", "Job Title": "HOUSE KEEPING ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG183", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIZANGA", "Contract": "ACTIVE", "FirstName": "KUDZAI", "Job Title": "HOUSE KEEPING ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG211", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MURANDA", "Contract": "ACTIVE", "FirstName": "NATHANIEL", "Job Title": "HOUSE KEEPING ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG213", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "NGWENYA", "Contract": "ACTIVE", "FirstName": "SAFASONGE", "Job Title": "LEAVE RELIEF CREW", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG461", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KATUMBA", "Contract": "ACTIVE", "FirstName": "ASHWIN", "Job Title": "LEAVE RELIEF CREW", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG485", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KADZVITI", "Contract": "ACTIVE", "FirstName": "LAWRENCE", "Job Title": "RELIEF CREW ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG486", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "BAKACHEZA", "Contract": "ACTIVE", "FirstName": "ELASTO", "Job Title": "GENERAL MILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG514", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MANHANGA", "Contract": "ACTIVE", "FirstName": "LOVEJOY", "Job Title": "HOUSE KEEPING ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG568", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "DZIMBIRI", "Contract": "ACTIVE", "FirstName": "CARLTON", "Job Title": "GENERAL PLANT ATTENDANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG570", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KADZIMA", "Contract": "ACTIVE", "FirstName": "FURTHERSTEP", "Job Title": "HOUSE KEEPING ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG589", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MUBAIWA", "Contract": "ACTIVE", "FirstName": "NOBERT", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG597", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "TINANI", "Contract": "ACTIVE", "FirstName": "TENDAI", "Job Title": "HOUSE KEEPING ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG598", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIGODO", "Contract": "ACTIVE", "FirstName": "BEHAVE", "Job Title": "BALLMILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG672", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MASERE", "Contract": "ACTIVE", "FirstName": "DARLINGTON", "Job Title": "PLUMBER ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG287", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIRUME", "Contract": "ACTIVE", "FirstName": "LATIFAN", "Job Title": "METALLURGICAL CLERK", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG583", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "ZAMANI", "Contract": "ACTIVE", "FirstName": "NYASHA", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG703", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "TAPOMWA", "Contract": "ACTIVE", "FirstName": "TAFADZWA", "Job Title": "PLANT LAB ATTENDANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG063", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "SHERENI", "Contract": "ACTIVE", "FirstName": "PETROS", "Job Title": "GENERAL MILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG072", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KASIMO", "Contract": "ACTIVE", "FirstName": "ADMIRE", "Job Title": "TAILINGS STORAGE FACILITY ASSIST", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG194", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "NHAMOYEBONDE", "Contract": "ACTIVE", "FirstName": "ANTONY", "Job Title": "BALLMILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG195", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "NYAZIKA", "Contract": "ACTIVE", "FirstName": "SELBORNE CHENGETAI", "Job Title": "BALLMILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG205", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MASANGO", "Contract": "ACTIVE", "FirstName": "DONALD", "Job Title": "BALLMILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG266", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHESANGO", "Contract": "ACTIVE", "FirstName": "LIBERTY", "Job Title": "TAILINGS STORAGE FACILITY ASSIST", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG279", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "BRIAN", "Contract": "ACTIVE", "FirstName": "LAMECK", "Job Title": "BALLMILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG327", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "NYIKADZINO", "Contract": "ACTIVE", "FirstName": "WELLINGTON", "Job Title": "HOUSE KEEPING ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG333", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "GOVHA", "Contract": "ACTIVE", "FirstName": "BELIEVE", "Job Title": "BALLMILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG336", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "NYIKADZINO", "Contract": "ACTIVE", "FirstName": "CLEMENCE KURAUONE", "Job Title": "BALLMILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG345", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "BGWANYA", "Contract": "ACTIVE", "FirstName": "TARUVINGA", "Job Title": "BALLMILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG353", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "GONDO", "Contract": "ACTIVE", "FirstName": "MAXWELL", "Job Title": "BALLMILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG374", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MAGWENZI", "Contract": "ACTIVE", "FirstName": "ANYWAY", "Job Title": "MILL OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG376", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIYANDO", "Contract": "ACTIVE", "FirstName": "SHADRECK", "Job Title": "MILL OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG401", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIPATO", "Contract": "ACTIVE", "FirstName": "FARAI", "Job Title": "MILL OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG539", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIRIMUJIRI", "Contract": "ACTIVE", "FirstName": "KELVIN", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG541", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KARAMBWE", "Contract": "ACTIVE", "FirstName": "ELISHA", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG546", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MGUQUKA", "Contract": "ACTIVE", "FirstName": "NKOSIYABO", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG010", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIMUTU", "Contract": "ACTIVE", "FirstName": "JOFFREY", "Job Title": "BALLMILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG030", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "NGONI", "Contract": "ACTIVE", "FirstName": "ELISHA", "Job Title": "PRIMARY CRUSHER OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG079", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KAKONO", "Contract": "ACTIVE", "FirstName": "DAIROD", "Job Title": "PRIMARY CRUSHER OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG131", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MUZHONA", "Contract": "ACTIVE", "FirstName": "GRACIOUS", "Job Title": "PRIMARY CRUSHER ATTENDANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG134", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHARAMBIRA", "Contract": "ACTIVE", "FirstName": "GAINMORE", "Job Title": "PRIMARY CRUSHER ATTENDANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG199", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "LAPKEN", "Contract": "ACTIVE", "FirstName": "KENNETH", "Job Title": "PRIMARY CRUSHER ATTENDANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG276", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "ZILAKA", "Contract": "ACTIVE", "FirstName": "SOLOMON", "Job Title": "PRIMARY CRUSHER ATTENDANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG278", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "BOTE", "Contract": "ACTIVE", "FirstName": "TERRENCE", "Job Title": "PRIMARY CRUSHING OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG293", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KAHUMWE", "Contract": "ACTIVE", "FirstName": "DAVIES", "Job Title": "PRIMARY CRUSHER ATTENDANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG742", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KAISI", "Contract": "ACTIVE", "FirstName": "JAMES", "Job Title": "THICKENER OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG743", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHANYUKA", "Contract": "ACTIVE", "FirstName": "ANDREW", "Job Title": "THICKENER OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG744", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MKANDAWIRE", "Contract": "ACTIVE", "FirstName": "DIVASON", "Job Title": "THICKENER OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG722", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MUNYORO", "Contract": "ACTIVE", "FirstName": "NEHEMIAH", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG035", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "PHIRI", "Contract": "ACTIVE", "FirstName": "ENOCK", "Job Title": "HOUSE KEEPING ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG074", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIHOKO", "Contract": "ACTIVE", "FirstName": "CYRUS", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG377", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "GWATA", "Contract": "ACTIVE", "FirstName": "TINASHE", "Job Title": "REAGENTS & SMELTING CONTROLLER", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG457", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIDEMO", "Contract": "ACTIVE", "FirstName": "AGGRIPPA", "Job Title": "REAGENTS & SMELTING ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG058", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MUDIWA", "Contract": "ACTIVE", "FirstName": "ALBERT", "Job Title": "GENERAL SECONDARY & TERTIARY CRUSHING ASSIST", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG142", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MATAMA", "Contract": "ACTIVE", "FirstName": "MCNELL", "Job Title": "GENERAL SECONDARY & TERTIARY CRUSHING ASSIST", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG143", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "NZVAURA", "Contract": "ACTIVE", "FirstName": "ADDLIGHT", "Job Title": "SECONDARY & TERTIARY CRUSHER OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG181", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHITANHAMAPIRA", "Contract": "ACTIVE", "FirstName": "JACOB", "Job Title": "GENERAL SECONDARY & TERTIARY CRUSHING ASSIST", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG184", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KUGOTSI", "Contract": "ACTIVE", "FirstName": "HAMLET", "Job Title": "SECONDARY & TERTIARY CRUSHER OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG188", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MARIME", "Contract": "ACTIVE", "FirstName": "FOSTER", "Job Title": "SECONDARY & TERTIARY CRUSHER OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG237", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHANETSA", "Contract": "ACTIVE", "FirstName": "PRAISE K", "Job Title": "GENERAL MILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG281", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIGWADA", "Contract": "ACTIVE", "FirstName": "FORGET", "Job Title": "GENERAL SECONDARY & TERTIARY CRUSHING ASSIST", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG355", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MAPURANGA", "Contract": "ACTIVE", "FirstName": "TATENDA", "Job Title": "GENERAL SECONDARY & TERTIARY CRUSHING ASSIST", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG003", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "BHANDA", "Contract": "ACTIVE", "FirstName": "BHANDASON", "Job Title": "TAILINGS STORAGE FACILITY OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG036", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "PHIRI", "Contract": "ACTIVE", "FirstName": "GIVEMORE", "Job Title": "TAILINGS STORAGE FACILITY OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG065", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "RUNZIRA", "Contract": "ACTIVE", "FirstName": "KUDAKWASHE", "Job Title": "TAILINGS STORAGE FACILITY OPERATOR", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG071", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MAPIRA", "Contract": "ACTIVE", "FirstName": "ALBERT", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG103", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MUTAYI", "Contract": "ACTIVE", "FirstName": "FIDELIS", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG127", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "BUNGU", "Contract": "ACTIVE", "FirstName": "LEONARD", "Job Title": "GENERAL MILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG128", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KAVINGA", "Contract": "ACTIVE", "FirstName": "FRIDAY", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG133", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KUMBONJE", "Contract": "ACTIVE", "FirstName": "LAMECK", "Job Title": "GENERAL HAND", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG144", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "TAULO", "Contract": "ACTIVE", "FirstName": "NOEL", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG146", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MUNETSI", "Contract": "ACTIVE", "FirstName": "ELISHA", "Job Title": "BALLMILL ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG156", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KOMBONI", "Contract": "ACTIVE", "FirstName": "MAKOMBORERO", "Job Title": "TAILINGS STORAGE FACILITY ASSIST", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG189", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MARIMO", "Contract": "ACTIVE", "FirstName": "ELIAS", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG285", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIMANIKIRE", "Contract": "ACTIVE", "FirstName": "COSMAS", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG296", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KASEKE", "Contract": "ACTIVE", "FirstName": "TAKUDZWA", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG340", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MACHAKARI", "Contract": "ACTIVE", "FirstName": "AMOS", "Job Title": "TEAM LEADER", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG343", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KUSIKWENYU", "Contract": "ACTIVE", "FirstName": "STACIOUS", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG394", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "NHAUCHURU", "Contract": "ACTIVE", "FirstName": "PRINCE", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG433", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MUKWENYA", "Contract": "ACTIVE", "FirstName": "TAWANDA", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG503", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "KAZUNGA", "Contract": "ACTIVE", "FirstName": "RICHARD", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG506", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "JACK", "Contract": "ACTIVE", "FirstName": "COASTER", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG509", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIGODHO", "Contract": "ACTIVE", "FirstName": "MILTON", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG511", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "TAMBUDZA", "Contract": "ACTIVE", "FirstName": "WISE", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG639", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MARAMBA", "Contract": "ACTIVE", "FirstName": "ELVIS", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG640", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "PARWARINGIRA", "Contract": "ACTIVE", "FirstName": "TINOTENDA", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG641", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MAKREYA", "Contract": "ACTIVE", "FirstName": "TAFADZWA", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG664", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MUFUMBIRA", "Contract": "ACTIVE", "FirstName": "TENDEKAI", "Job Title": "GENERAL PLANT ASSISTANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG717", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "CHIHLABA", "Contract": "ACTIVE", "FirstName": "TANAKA", "Job Title": "GENERAL PLANT ATTENDANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG718", "Gender": "MALE", "SECTION": "PROCESSING ", "Surname": "MAVESERE", "Contract": "ACTIVE", "FirstName": "TANAKA", "Job Title": "GENERAL PLANT ATTENDANT", "Cost centre": "PROCESSING ", "Nec/ Salaried": "NEC"}, {"Code": "DG132", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "NYAMAVABVU", "Contract": "ACTIVE", "FirstName": "KELVIN KUDAKWASHE", "Job Title": "CCTV OPERATOR", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG221", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "CHITIKI", "Contract": "ACTIVE", "FirstName": "MARGARET", "Job Title": "CCTV OPERATOR", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG419", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "CHIFWAFWA", "Contract": "ACTIVE", "FirstName": "AUDREY", "Job Title": "CCTV OPERATOR", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG434", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "BENNY", "Contract": "ACTIVE", "FirstName": "CHONDE", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG476", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "VELLEM", "Contract": "ACTIVE", "FirstName": "NIXON", "Job Title": "CCTV OPERATOR", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG530", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "MAGURA", "Contract": "ACTIVE", "FirstName": "TONGAI", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG545", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "GUNJA", "Contract": "ACTIVE", "FirstName": "SYLVESTER", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG571", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "KUGOTSI", "Contract": "ACTIVE", "FirstName": "CHRISTOPHER", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG580", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "KAZUNGA", "Contract": "ACTIVE", "FirstName": "SIMBARASHE", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG588", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "MBUNDURE", "Contract": "ACTIVE", "FirstName": "SINCEWELL", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG591", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "MAZHAMBE", "Contract": "ACTIVE", "FirstName": "IRVINE", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG620", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "CHAPANDA", "Contract": "ACTIVE", "FirstName": "TADIWANASHE", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG652", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "MBEREKO", "Contract": "ACTIVE", "FirstName": "LYTON", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG720", "Gender": "MALE", "SECTION": "SECURITY", "Surname": "REVAI", "Contract": "ACTIVE", "FirstName": "EDMORE", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG723", "Gender": "MALE", "SECTION": "SHEQ", "Surname": "NATANI", "Contract": "ACTIVE", "FirstName": "BIANCAH", "Job Title": "FIRST AID TRAINER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG049", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "CHIKOYA", "Contract": "ACTIVE", "FirstName": "PHILLIP", "Job Title": "HANDYMAN", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG050", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "CHIKOYA", "Contract": "ACTIVE", "FirstName": "MARK", "Job Title": "WELFARE WORKER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG090", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "CHIGWENJERE", "Contract": "ACTIVE", "FirstName": "TANATSA", "Job Title": "COOK", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG091", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "CHIMBUMU", "Contract": "ACTIVE", "FirstName": "VINCENT", "Job Title": "COOK", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG093", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "CHITIKI", "Contract": "ACTIVE", "FirstName": "MASS", "Job Title": "TEAM LEADER HOUSEKEEPING", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG094", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "CHIDANGURO", "Contract": "ACTIVE", "FirstName": "GLADYS", "Job Title": "HOUSEKEEPER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG095", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "MUKANDAVANHU", "Contract": "ACTIVE", "FirstName": "RANGANAI", "Job Title": "LAUNDRY ATTENDANT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG099", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "BUNGU", "Contract": "ACTIVE", "FirstName": "JIMMINIC", "Job Title": "TEAM LEADER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG180", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "CHIMANIKIRE", "Contract": "ACTIVE", "FirstName": "TAFIRENYIKA", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG206", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "CHIDENYIKA", "Contract": "ACTIVE", "FirstName": "GUESFORD", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG236", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "BUNGU", "Contract": "ACTIVE", "FirstName": "SILENT", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG290", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "GARINGA", "Contract": "ACTIVE", "FirstName": "CHRISTOPHER", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG364", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "MAZHAMBE", "Contract": "ACTIVE", "FirstName": "RICHMORE", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG389", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "KAPIYA", "Contract": "ACTIVE", "FirstName": "SILENT", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG399", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "MANDIVAVARIRA", "Contract": "ACTIVE", "FirstName": "LUWESI", "Job Title": "HOUSEKEEPER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG400", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "CHINYAMA", "Contract": "ACTIVE", "FirstName": "GETRUDE", "Job Title": "HOUSEKEEPER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG436", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "JACK", "Contract": "ACTIVE", "FirstName": "ELIZARY", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG454", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "MUSHONGA", "Contract": "ACTIVE", "FirstName": "CLARA", "Job Title": "LAUNDRY ATTENDANT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG458", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "JENGENI", "Contract": "ACTIVE", "FirstName": "SHARON", "Job Title": "HOUSEKEEPER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG459", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "SITHOLE", "Contract": "ACTIVE", "FirstName": "LILY", "Job Title": "COOK", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG460", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "GWANDE", "Contract": "ACTIVE", "FirstName": "KURAUONE", "Job Title": "COOK", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG462", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "CHIMBAMBO", "Contract": "ACTIVE", "FirstName": "SIMBARASHE", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG463", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "NYAMBO", "Contract": "ACTIVE", "FirstName": "ANGELINE", "Job Title": "HOUSEKEEPER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG464", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "MAHASO", "Contract": "ACTIVE", "FirstName": "MOREBLESSING", "Job Title": "LAUNDRY ATTENDANT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG518", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "GAUKA", "Contract": "ACTIVE", "FirstName": "TRUSTER", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG549", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "MANYIKA", "Contract": "ACTIVE", "FirstName": "LIANA", "Job Title": "HOUSEKEEPER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG599", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "NYAHUMA", "Contract": "ACTIVE", "FirstName": "IGNATIOUS", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG653", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "KONDO", "Contract": "ACTIVE", "FirstName": "WESLEY", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG658", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "CHIRAPA", "Contract": "ACTIVE", "FirstName": "LUXMORE", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG660", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "THOMAS", "Contract": "ACTIVE", "FirstName": "IGNATIOUS", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG661", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "KADAIRA", "Contract": "ACTIVE", "FirstName": "INNOCENT", "Job Title": "GENERAL HAND", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG662", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "TONGOFA", "Contract": "ACTIVE", "FirstName": "PRECIOUS", "Job Title": "HOUSE KEEPER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG687", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "KAWARA", "Contract": "ACTIVE", "FirstName": "AGATHA", "Job Title": "HOUSE KEEPER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG715", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "KARASA", "Contract": "ACTIVE", "FirstName": "SHARON", "Job Title": "KITCHEN PORTER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG716", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "CHIKOYA", "Contract": "ACTIVE", "FirstName": "THERESA", "Job Title": "KITCHEN PORTER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG759", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "MAFAIROSI", "Contract": "ACTIVE", "FirstName": "LEARNMORE", "Job Title": "HOUSE KEEPER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG768", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "MENAD", "Contract": "ACTIVE", "FirstName": "ELENA", "Job Title": "HOUSEKEEPER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG769", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "CHAMBURUMBUDZA", "Contract": "ACTIVE", "FirstName": "TSITSI", "Job Title": "HOUSEKEEPER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG783", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "MACHIPISA", "Contract": "ACTIVE", "FirstName": "MILLICENT", "Job Title": "COOK", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG785", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "MATYORAUTA", "Contract": "ACTIVE", "FirstName": "JOSEPHINE", "Job Title": "HOUSE KEEPER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG786", "Gender": "MALE", "SECTION": "SITE COORDINATION", "Surname": "MUTSVENGURI", "Contract": "ACTIVE", "FirstName": "FOYLINE", "Job Title": "HOUSE KEEPER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG002", "Gender": "MALE", "SECTION": "STORES", "Surname": "BANDERA", "Contract": "ACTIVE", "FirstName": "MARK", "Job Title": "SENIOR STORES CLERK", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG038", "Gender": "MALE", "SECTION": "STORES", "Surname": "RUWO", "Contract": "ACTIVE", "FirstName": "TAMBURAI", "Job Title": "STORES CLERK", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG070", "Gender": "MALE", "SECTION": "STORES", "Surname": "MAVUNGA", "Contract": "ACTIVE", "FirstName": "JUSTICE", "Job Title": "STORES CLERK", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG086", "Gender": "MALE", "SECTION": "STORES", "Surname": "SIMANI", "Contract": "ACTIVE", "FirstName": "RASHEED", "Job Title": "STORES CLERK", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG197", "Gender": "MALE", "SECTION": "STORES", "Surname": "WAMBE", "Contract": "ACTIVE", "FirstName": "INNOCENT", "Job Title": "STORES CLERK", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG240", "Gender": "MALE", "SECTION": "STORES", "Surname": "CHIBAGU", "Contract": "ACTIVE", "FirstName": "CALISTO", "Job Title": "STOREKEEPER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG262", "Gender": "MALE", "SECTION": "STORES", "Surname": "CHINYAMA", "Contract": "ACTIVE", "FirstName": "ROBSON", "Job Title": "STORES CLERK", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG341", "Gender": "MALE", "SECTION": "STORES", "Surname": "MASHONGANYIKA", "Contract": "ACTIVE", "FirstName": "RAPHAEL", "Job Title": "STORES CLERK", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG366", "Gender": "MALE", "SECTION": "STORES", "Surname": "MUFENGI", "Contract": "ACTIVE", "FirstName": "MAXWELL", "Job Title": "STORES CLERK", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG404", "Gender": "MALE", "SECTION": "STORES", "Surname": "TARUVINGA", "Contract": "ACTIVE", "FirstName": "EUNICE", "Job Title": "SENIOR STORES CLERK", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG582", "Gender": "MALE", "SECTION": "STORES", "Surname": "MARANGE", "Contract": "ACTIVE", "FirstName": "CECIL", "Job Title": "STORES CLERK", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG075", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "BHANDA", "Contract": "ACTIVE", "FirstName": "THEOPHELOUS", "Job Title": "APPRENTICE", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG158", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MATIBIRI", "Contract": "ACTIVE", "FirstName": "PROSPER A", "Job Title": "APPRENTICE", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG320", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "DHINGA", "Contract": "ACTIVE", "FirstName": "WELCOME", "Job Title": "APPRENTICE", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG346", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "CHIFAMBA", "Contract": "ACTIVE", "FirstName": "CALVIN", "Job Title": "APPRENTICE", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG488", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "TAULO", "Contract": "ACTIVE", "FirstName": "RONALD", "Job Title": "APPRENTICE BOILERMAKER", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG682", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MAZANI", "Contract": "ACTIVE", "FirstName": "FUNGISAI", "Job Title": "APPRENTICE", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG683", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MACHEKA", "Contract": "ACTIVE", "FirstName": "ELIAS", "Job Title": "APPRENTICE", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG684", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "CHIGWESHE", "Contract": "ACTIVE", "FirstName": "TANDIRAYI", "Job Title": "APPRENTICE", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG685", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MANYANGE", "Contract": "ACTIVE", "FirstName": "BYL", "Job Title": "APPRENTICE", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG686", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MAZARA", "Contract": "ACTIVE", "FirstName": "TAKUNDA", "Job Title": "APPRENTICE", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG747", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MAIMBE", "Contract": "ACTIVE", "FirstName": "CEPHAS", "Job Title": "STUDENT ON ATTACHEMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG750", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MAKUNDE", "Contract": "ACTIVE", "FirstName": "CONSTANCE", "Job Title": "STUDENT ON ATTACHEMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG751", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "ZENGEYA", "Contract": "ACTIVE", "FirstName": "GILBERT", "Job Title": "STUDENT ON ATTACHEMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG752", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "BHENHURA", "Contract": "ACTIVE", "FirstName": "TRACEY", "Job Title": "STUDENT ON ATTACHEMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG753", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "NGWARU", "Contract": "ACTIVE", "FirstName": "TANAKA", "Job Title": "STUDENT ON ATTACHEMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG754", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "ARUBINU", "Contract": "ACTIVE", "FirstName": "MANUEL", "Job Title": "STUDENT ON ATTACHEMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG755", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MUNOCHIWEYI", "Contract": "ACTIVE", "FirstName": "LEVONIA", "Job Title": "STUDENT ON ATTACHEMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG756", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "TENENE", "Contract": "ACTIVE", "FirstName": "ANESU", "Job Title": "STUDENT ON ATTACHEMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG762", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MADZVAMUSE", "Contract": "ACTIVE", "FirstName": "MUFARO", "Job Title": "STUDENT ON ATTACHMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG764", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "GATSI", "Contract": "ACTIVE", "FirstName": "DONALD", "Job Title": "STUDENT ON ATTACHMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG765", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "DZURO", "Contract": "ACTIVE", "FirstName": "ASHGRACE", "Job Title": "STUDENT ON ATTACHMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG766", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MUSARURWA", "Contract": "ACTIVE", "FirstName": "MOTION", "Job Title": "STUDENT ON ATTACHMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG767", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "DHLEMBEU", "Contract": "ACTIVE", "FirstName": "DADISO", "Job Title": "STUDENT ON ATTACHMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG777", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MAKULUNGA", "Contract": "ACTIVE", "FirstName": "TADIWANASHE", "Job Title": "STUDENT ON ATTACHMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG779", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "NDLOVU", "Contract": "ACTIVE", "FirstName": "SHINGIRIRAI", "Job Title": "STUDENT ON ATTACHMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG780", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "KADYE", "Contract": "ACTIVE", "FirstName": "TENDAI", "Job Title": "STUDENT ON ATTACHMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG781", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "KUMHANDA", "Contract": "ACTIVE", "FirstName": "DESMOND", "Job Title": "STUDENT ON ATTACHMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}, {"Code": "DG782", "Gender": "MALE", "SECTION": "TRAINING", "Surname": "MAREGERE", "Contract": "ACTIVE", "FirstName": "TIVAKUDZE", "Job Title": "STUDENT ON ATTACHMENT", "Cost centre": "SHARED SERVICES", "Nec/ Salaried": "NEC"}], "skipDuplicates": true}, "query": {}, "params": {}}	{"url": "/api/v1/employees/bulk-upload", "method": "POST", "statusCode": 201}	::ffff:192.168.2.40	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-19 17:14:05.319+02	75fdd729-2394-41dc-ac58-048ff1adce90
8eb0d559-9deb-401f-9834-612e98588b40	CREATE	User	610926ab-85aa-43a4-af73-97c7df13a69c	{"body": {"roleId": "1abfb90b-03fc-4dc3-93a0-3a8ea58da828", "password": "Test123", "username": "dp173", "sectionId": "", "employeeId": "6df30475-8134-45a2-a722-00c1b45f9e7a", "departmentId": ""}, "query": {}, "params": {}}	{"url": "/api/v1/users/promote-employee", "method": "POST"}	::ffff:192.168.2.40	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-19 17:16:23.106+02	75fdd729-2394-41dc-ac58-048ff1adce90
9f5bfd5c-3139-44c8-952d-e6defa5e3a26	CREATE	USERS	610926ab-85aa-43a4-af73-97c7df13a69c	{"body": {"roleId": "1abfb90b-03fc-4dc3-93a0-3a8ea58da828", "password": "[REDACTED]", "username": "dp173", "sectionId": "", "employeeId": "6df30475-8134-45a2-a722-00c1b45f9e7a", "departmentId": ""}, "query": {}, "params": {}}	{"url": "/api/v1/users/promote-employee", "method": "POST", "statusCode": 201}	::ffff:192.168.2.40	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-19 17:16:23.107+02	75fdd729-2394-41dc-ac58-048ff1adce90
575c05dc-5b03-4818-87a1-226708b3caa7	CREATE	CompanyBudget	72d738bc-b5a8-4eee-84fc-9da39c43c645	{"body": {"notes": "", "status": "active", "fiscalYear": 2025, "totalBudget": 100000}, "query": {}, "params": {}}	{"url": "/api/v1/budgets/company", "method": "POST"}	::ffff:192.168.2.40	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-19 17:18:24.096+02	75fdd729-2394-41dc-ac58-048ff1adce90
1c55cd96-1633-4c84-8d26-809a4feae012	CREATE	BUDGETS	72d738bc-b5a8-4eee-84fc-9da39c43c645	{"body": {"notes": "", "status": "active", "fiscalYear": 2025, "totalBudget": 100000}, "query": {}, "params": {}}	{"url": "/api/v1/budgets/company", "method": "POST", "statusCode": 201}	::ffff:192.168.2.40	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-19 17:18:24.096+02	75fdd729-2394-41dc-ac58-048ff1adce90
8c8d50e7-b50e-4329-b96d-a800cb54f51d	CREATE	Budget	c94b15b9-13bc-46a5-a26c-ffde6437b3b3	{"body": {"status": "active", "fiscalYear": 2025, "departmentId": "cc45c464-fca4-493b-b794-bc5da21641ef", "allocatedAmount": 10000, "companyBudgetId": "72d738bc-b5a8-4eee-84fc-9da39c43c645"}, "query": {}, "params": {}}	{"url": "/api/v1/budgets", "method": "POST"}	::ffff:192.168.2.40	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-19 17:22:21.895+02	75fdd729-2394-41dc-ac58-048ff1adce90
077f45cd-5be1-4ff7-986e-786adea06615	CREATE	BUDGETS	c94b15b9-13bc-46a5-a26c-ffde6437b3b3	{"body": {"status": "active", "fiscalYear": 2025, "departmentId": "cc45c464-fca4-493b-b794-bc5da21641ef", "allocatedAmount": 10000, "companyBudgetId": "72d738bc-b5a8-4eee-84fc-9da39c43c645"}, "query": {}, "params": {}}	{"url": "/api/v1/budgets", "method": "POST", "statusCode": 201}	::ffff:192.168.2.40	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-19 17:22:21.896+02	75fdd729-2394-41dc-ac58-048ff1adce90
9340da65-22aa-48d3-8278-9a4f33ba5735	CREATE	BACKUP	\N	{"body": {}, "query": {}, "params": {}}	{"url": "/api/v1/backup", "method": "POST", "statusCode": 200}	::ffff:192.168.2.40	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-19 17:25:27.084+02	75fdd729-2394-41dc-ac58-048ff1adce90
0f5d151b-5aad-4403-bc80-0ef44873c61d	UPDATE	User	610926ab-85aa-43a4-af73-97c7df13a69c	{"body": {"roleId": "1abfb90b-03fc-4dc3-93a0-3a8ea58da828"}, "query": {}, "params": {"id": "610926ab-85aa-43a4-af73-97c7df13a69c"}}	{"url": "/api/v1/users/610926ab-85aa-43a4-af73-97c7df13a69c/change-role", "method": "PUT"}	::ffff:192.168.2.40	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-19 17:31:27.7+02	75fdd729-2394-41dc-ac58-048ff1adce90
04711ea4-c258-4a6b-a6a9-870ca6e4f33b	CREATE	USERS	542e56df-94d9-47cf-9c70-842f858e9fe8	{"body": {"roleId": "1abfb90b-03fc-4dc3-93a0-3a8ea58da828", "password": "[REDACTED]", "username": "dp273", "sectionId": "", "employeeId": "1e51daf4-3910-4b39-82a7-fa2acfaebed7", "departmentId": ""}, "query": {}, "params": {}}	{"url": "/api/v1/users/promote-employee", "method": "POST", "statusCode": 201}	::ffff:192.168.2.40	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-19 17:32:03.097+02	75fdd729-2394-41dc-ac58-048ff1adce90
253d6d59-6ea1-4c33-8780-af023f6d29ba	LOGIN	User	542e56df-94d9-47cf-9c70-842f858e9fe8	\N	{"ip": "::ffff:192.168.2.40", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"}	::ffff:192.168.2.40	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-19 17:32:15.047+02	542e56df-94d9-47cf-9c70-842f858e9fe8
774c2180-6c44-4b22-a333-451baa9249c1	BULK_UPLOAD	SizeScale	\N	{"body": {"scales": [{"code": "BODY_NUMERIC", "name": "Body/Torso Numeric (34-50)", "sizes": [{"label": "34", "value": "34"}, {"label": "36", "value": "36"}, {"label": "38", "value": "38"}, {"label": "40", "value": "40"}, {"label": "42", "value": "42"}, {"label": "44", "value": "44"}, {"label": "46", "value": "46"}, {"label": "48", "value": "48"}, {"label": "50", "value": "50"}, {"label": "Standard", "value": "Std"}], "description": "Numeric sizing for body/torso garments (worksuits, jackets, etc.)", "categoryGroup": "BODY/TORSO"}, {"code": "BODY_ALPHA", "name": "Body/Torso Alpha (XS-3XL)", "sizes": [{"label": "Extra Small", "value": "XS"}, {"label": "Small", "value": "S"}, {"label": "Medium", "value": "M"}, {"label": "Large", "value": "L"}, {"label": "Extra Large", "value": "XL"}, {"label": "2X Large", "value": "2XL"}, {"label": "3X Large", "value": "3XL"}, {"label": "Standard", "value": "Std"}], "description": "Alpha sizing for body/torso garments (XS, S, M, L, XL, 2XL, 3XL)", "categoryGroup": "BODY/TORSO"}, {"code": "FEET", "name": "Footwear (4-13)", "sizes": [{"label": "4", "value": "4", "ukSize": "4"}, {"label": "5", "value": "5", "ukSize": "5"}, {"label": "6", "value": "6", "ukSize": "6"}, {"label": "7", "value": "7", "ukSize": "7"}, {"label": "8", "value": "8", "ukSize": "8"}, {"label": "9", "value": "9", "ukSize": "9"}, {"label": "10", "value": "10", "ukSize": "10"}, {"label": "11", "value": "11", "ukSize": "11"}, {"label": "12", "value": "12", "ukSize": "12"}, {"label": "13", "value": "13", "ukSize": "13"}, {"label": "Standard", "value": "Std"}], "description": "Footwear sizing (UK sizes 4-13)", "categoryGroup": "FEET"}, {"code": "GLOVES", "name": "Gloves (S-XL)", "sizes": [{"label": "Small", "value": "S"}, {"label": "Medium", "value": "M"}, {"label": "Large", "value": "L"}, {"label": "Extra Large", "value": "XL"}, {"label": "Standard/One Size", "value": "Std"}], "description": "Glove sizing", "categoryGroup": "HANDS"}, {"code": "HEAD", "name": "Head Gear", "sizes": [{"label": "Small", "value": "S"}, {"label": "Medium", "value": "M"}, {"label": "Large", "value": "L"}, {"label": "Standard/Adjustable", "value": "Std"}], "description": "Head gear sizing (hard hats, helmets)", "categoryGroup": "HEAD"}, {"code": "RESPIRATOR", "name": "Respirator", "sizes": [{"label": "Small", "value": "S"}, {"label": "Medium", "value": "M"}, {"label": "Large", "value": "L"}, {"label": "Standard/One Size", "value": "Std"}], "description": "Respirator face piece sizing", "categoryGroup": "RESPIRATORY"}, {"code": "ONESIZE", "name": "One Size / Standard", "sizes": [{"label": "Standard", "value": "Std"}, {"label": "One Size", "value": "One Size"}], "description": "Items that come in standard/one size only", "categoryGroup": "GENERAL"}, {"code": "EYEWEAR", "name": "Eye Protection", "sizes": [{"label": "Standard", "value": "Std"}, {"label": "Narrow Fit", "value": "Narrow"}, {"label": "Wide Fit", "value": "Wide"}], "description": "Safety glasses and eye protection sizing", "categoryGroup": "EYES/FACE"}], "updateExisting": false}, "query": {}, "params": {}}	{"url": "/api/v1/sizes/bulk-upload", "method": "POST"}	::ffff:192.168.2.40	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-19 17:33:30.621+02	542e56df-94d9-47cf-9c70-842f858e9fe8
d951e407-9560-4d3d-a234-a65ea092c3c2	CREATE	SIZES	\N	{"body": {"scales": [{"code": "BODY_NUMERIC", "name": "Body/Torso Numeric (34-50)", "sizes": [{"label": "34", "value": "34"}, {"label": "36", "value": "36"}, {"label": "38", "value": "38"}, {"label": "40", "value": "40"}, {"label": "42", "value": "42"}, {"label": "44", "value": "44"}, {"label": "46", "value": "46"}, {"label": "48", "value": "48"}, {"label": "50", "value": "50"}, {"label": "Standard", "value": "Std"}], "description": "Numeric sizing for body/torso garments (worksuits, jackets, etc.)", "categoryGroup": "BODY/TORSO"}, {"code": "BODY_ALPHA", "name": "Body/Torso Alpha (XS-3XL)", "sizes": [{"label": "Extra Small", "value": "XS"}, {"label": "Small", "value": "S"}, {"label": "Medium", "value": "M"}, {"label": "Large", "value": "L"}, {"label": "Extra Large", "value": "XL"}, {"label": "2X Large", "value": "2XL"}, {"label": "3X Large", "value": "3XL"}, {"label": "Standard", "value": "Std"}], "description": "Alpha sizing for body/torso garments (XS, S, M, L, XL, 2XL, 3XL)", "categoryGroup": "BODY/TORSO"}, {"code": "FEET", "name": "Footwear (4-13)", "sizes": [{"label": "4", "value": "4", "ukSize": "4"}, {"label": "5", "value": "5", "ukSize": "5"}, {"label": "6", "value": "6", "ukSize": "6"}, {"label": "7", "value": "7", "ukSize": "7"}, {"label": "8", "value": "8", "ukSize": "8"}, {"label": "9", "value": "9", "ukSize": "9"}, {"label": "10", "value": "10", "ukSize": "10"}, {"label": "11", "value": "11", "ukSize": "11"}, {"label": "12", "value": "12", "ukSize": "12"}, {"label": "13", "value": "13", "ukSize": "13"}, {"label": "Standard", "value": "Std"}], "description": "Footwear sizing (UK sizes 4-13)", "categoryGroup": "FEET"}, {"code": "GLOVES", "name": "Gloves (S-XL)", "sizes": [{"label": "Small", "value": "S"}, {"label": "Medium", "value": "M"}, {"label": "Large", "value": "L"}, {"label": "Extra Large", "value": "XL"}, {"label": "Standard/One Size", "value": "Std"}], "description": "Glove sizing", "categoryGroup": "HANDS"}, {"code": "HEAD", "name": "Head Gear", "sizes": [{"label": "Small", "value": "S"}, {"label": "Medium", "value": "M"}, {"label": "Large", "value": "L"}, {"label": "Standard/Adjustable", "value": "Std"}], "description": "Head gear sizing (hard hats, helmets)", "categoryGroup": "HEAD"}, {"code": "RESPIRATOR", "name": "Respirator", "sizes": [{"label": "Small", "value": "S"}, {"label": "Medium", "value": "M"}, {"label": "Large", "value": "L"}, {"label": "Standard/One Size", "value": "Std"}], "description": "Respirator face piece sizing", "categoryGroup": "RESPIRATORY"}, {"code": "ONESIZE", "name": "One Size / Standard", "sizes": [{"label": "Standard", "value": "Std"}, {"label": "One Size", "value": "One Size"}], "description": "Items that come in standard/one size only", "categoryGroup": "GENERAL"}, {"code": "EYEWEAR", "name": "Eye Protection", "sizes": [{"label": "Standard", "value": "Std"}, {"label": "Narrow Fit", "value": "Narrow"}, {"label": "Wide Fit", "value": "Wide"}], "description": "Safety glasses and eye protection sizing", "categoryGroup": "EYES/FACE"}], "updateExisting": false}, "query": {}, "params": {}}	{"url": "/api/v1/sizes/bulk-upload", "method": "POST", "statusCode": 200}	::ffff:192.168.2.40	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-19 17:33:30.621+02	542e56df-94d9-47cf-9c70-842f858e9fe8
8f2d35c9-6509-42eb-94ea-a6d8c794eaa9	BULK_CREATE	PPEItem	\N	{"body": {"items": [{"name": "Aluminised Thermal Suit", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-ALUTHERM", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Amour Bunker Suit", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-AMBUNK", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Bee Catcher's Suit", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-BEECATCH", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Chef's Jacket", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-CHEFJKT", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Cotton Worksuit Blue Elastic Cuff", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-CWSBLUE", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Firefighting Suit", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-FIRESUIT", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Ladies' Worksuit Blue", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-LWSBLUE", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Ladies' Worksuit Reflective", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-LWSREFL", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Life Jacket Adult Size", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-LIFEJKT", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "PVC Rain Suits", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-PVCRAIN", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Rain Suits", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-RAINSUT", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Reflective Cotton Worksuits White", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-RCWSWHT", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Reflective Blue Worksuit", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-RWSBLUE", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Reflective Vest", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-REFLVST", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Reflective Vest Long Sleeve", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-REFLVLS", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Shirt Cotton Orange & Navy", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-SHRTORN", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Shirt Cotton Lime & Navy", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-SHRTLMN", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Shirt Short Navy & Lime", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-SHSTNVL", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Shirt Short Orange & Lime", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-SHSTORL", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Sinking Suit Reflective", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-SINKREF", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Thermal Trousers", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-THERMTR", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Trousers Cotton Navy", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-TRSCNVY", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Welding Jacket", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-WELDJKT", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "White Lab Coats", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-LABCOAT", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Winter Jacket Reflective", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-WINJKTR", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Winter Suit", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-WINSUT", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Winter Jacket", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-WINJKT", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Worksuit Blue Cotton", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-WSBLCOT", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Worksuit Green Acid Proof", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-WSGRACID", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Worksuit Navy Flame Retardant", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-WSNVFR", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Worksuit White Cotton", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-WSWHTCOT", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Worksuit Yellow Cotton", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-WSYELCOT", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Worksuit Cotton Blue", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-WSCOTBL", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Worksuit Red Flame Retardant", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-WSREDFR", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Worksuite Green Cotton", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-WSGRCOT", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Black Jean (Pair)", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-JEANBLK", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Blue Jean (Pair)", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-JEANBLU", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Safety Harness", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-SAFHARNS", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Kidney Belts", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-KIDNBELT", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Leather Apron", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-LTHRAPN", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "PVC Apron", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-PVCAPRON", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Gum Shoe Steel Toe", "unit": "EA", "category": "FEET", "itemCode": "FT-GUMSHOS", "sizeScale": "FEET", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Ladies Safety Shoe", "unit": "EA", "category": "FEET", "itemCode": "FT-LADSAF", "sizeScale": "FEET", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Ladies Safety Shoe High Cut", "unit": "EA", "category": "FEET", "itemCode": "FT-LADSAFHC", "sizeScale": "FEET", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Safety Shoe Executive", "unit": "EA", "category": "FEET", "itemCode": "FT-SAFEXEC", "sizeScale": "FEET", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Safety Shoe Steel Toe", "unit": "EA", "category": "FEET", "itemCode": "FT-SAFSTOE", "sizeScale": "FEET", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Safety Shoe High Cut", "unit": "EA", "category": "FEET", "itemCode": "FT-SAFHICUT", "sizeScale": "FEET", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Viking Fire Fighting Boots", "unit": "EA", "category": "FEET", "itemCode": "FT-VIKFIRE", "sizeScale": "FEET", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Knee Cap", "unit": "EA", "category": "LEGS/LOWER/KNEES", "itemCode": "LK-KNEECAP", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Leather Spats", "unit": "EA", "category": "LEGS/LOWER/KNEES", "itemCode": "LK-LTHSPAT", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Ear Muffs Red", "unit": "EA", "category": "EARS", "itemCode": "EA-EARMUFR", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Earplugs", "unit": "EA", "category": "EARS", "itemCode": "EA-EARPLUG", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Electrical Rubber Gloves", "unit": "EA", "category": "HANDS", "itemCode": "HD-ELECRUB", "sizeScale": "GLOVES", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Household Gloves", "unit": "EA", "category": "HANDS", "itemCode": "HD-HOUSEHD", "sizeScale": "GLOVES", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Leather Gloves Long", "unit": "EA", "category": "HANDS", "itemCode": "HD-LTHRLNG", "sizeScale": "GLOVES", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Leather Gloves Short", "unit": "EA", "category": "HANDS", "itemCode": "HD-LTHRSHT", "sizeScale": "GLOVES", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Nylon Gloves", "unit": "EA", "category": "HANDS", "itemCode": "HD-NYLONGL", "sizeScale": "GLOVES", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Pig Skin Gloves", "unit": "EA", "category": "HANDS", "itemCode": "HD-PIGSKIN", "sizeScale": "GLOVES", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Fire Fighting Gloves", "unit": "EA", "category": "HANDS", "itemCode": "HD-FIREGLV", "sizeScale": "GLOVES", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "PVC Gloves Long", "unit": "EA", "category": "HANDS", "itemCode": "HD-PVCLNG", "sizeScale": "GLOVES", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "PVC Gloves Short", "unit": "EA", "category": "HANDS", "itemCode": "HD-PVCSHT", "sizeScale": "GLOVES", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Red Heat Resistant Gloves", "unit": "EA", "category": "HANDS", "itemCode": "HD-HEATRES", "sizeScale": "GLOVES", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Thermal Winter Gloves", "unit": "EA", "category": "HANDS", "itemCode": "HD-THERMWN", "sizeScale": "GLOVES", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Chef's Neckerchief", "unit": "EA", "category": "NECK", "itemCode": "NK-CHEFNCK", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Neckerchief", "unit": "EA", "category": "NECK", "itemCode": "NK-NECKCHF", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Welding Neck Protector", "unit": "EA", "category": "NECK", "itemCode": "NK-WELDNCK", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "3M Respirator Cartridge", "unit": "EA", "category": "RESPIRATORY", "itemCode": "RS-3MCART", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "3M Respirator Filters", "unit": "EA", "category": "RESPIRATORY", "itemCode": "RS-3MFILT", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "3M Respirator Full Face", "unit": "EA", "category": "RESPIRATORY", "itemCode": "RS-3MFULL", "sizeScale": "RESPIRATOR", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "3M Respirator Half Mask", "unit": "EA", "category": "RESPIRATORY", "itemCode": "RS-3MHALF", "sizeScale": "RESPIRATOR", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "3M Respirator Retainers", "unit": "EA", "category": "RESPIRATORY", "itemCode": "RS-3MRETN", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "CPR Mouth Piece", "unit": "EA", "category": "RESPIRATORY", "itemCode": "RS-CPRMTH", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Dust Mask FFP2", "unit": "EA", "category": "RESPIRATORY", "itemCode": "RS-DUSTFFP2", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "6 Point Hard Hat Liner", "unit": "EA", "category": "HEAD", "itemCode": "HE-6PTLINR", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Balaclava", "unit": "EA", "category": "HEAD", "itemCode": "HE-BALCLVA", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Balaclava Hat", "unit": "EA", "category": "HEAD", "itemCode": "HE-BALCHAT", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Fire Fighting Helmet", "unit": "EA", "category": "HEAD", "itemCode": "HE-FIREHLM", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Cordless Caplamp", "unit": "EA", "category": "HEAD", "itemCode": "HE-CAPLAMP", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Hard Hat", "unit": "EA", "category": "HEAD", "itemCode": "HE-HARDHAT", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Hard Hat Chin Straps", "unit": "EA", "category": "HEAD", "itemCode": "HE-HHCHIN", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Hard Hat Liner", "unit": "EA", "category": "HEAD", "itemCode": "HE-HHLINER", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Hard Hat Gray", "unit": "EA", "category": "HEAD", "itemCode": "HE-HHGRAY", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Sun Brim", "unit": "EA", "category": "HEAD", "itemCode": "HE-SUNBRIM", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Sun Visor", "unit": "EA", "category": "HEAD", "itemCode": "HE-SUNVISR", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Thermal Woolen Hat", "unit": "EA", "category": "HEAD", "itemCode": "HE-THERMWL", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Welding Helmet", "unit": "EA", "category": "HEAD", "itemCode": "HE-WELDHLM", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Welding Helmet Inner Cap", "unit": "EA", "category": "HEAD", "itemCode": "HE-WHLMCAP", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Anti-Fog Goggles", "unit": "EA", "category": "EYES/FACE", "itemCode": "EF-ANTIFOG", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Face Shield (Clear)", "unit": "EA", "category": "EYES/FACE", "itemCode": "EF-FCSHCLR", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Safety Glasses Clear", "unit": "EA", "category": "EYES/FACE", "itemCode": "EF-SAFGLSC", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Safety Glasses Dark", "unit": "EA", "category": "EYES/FACE", "itemCode": "EF-SAFGLSD", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Welding Lenses (Clear)", "unit": "EA", "category": "EYES/FACE", "itemCode": "EF-WELDLNC", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Welding Lenses (Dark)", "unit": "EA", "category": "EYES/FACE", "itemCode": "EF-WELDLND", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}], "updateExisting": false}, "query": {}, "params": {}}	{"url": "/api/v1/ppe/bulk-upload", "method": "POST"}	::ffff:192.168.2.40	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-19 17:35:28.862+02	542e56df-94d9-47cf-9c70-842f858e9fe8
801b83c4-8425-46b0-83e0-6265ae264dab	CREATE	PPE	\N	{"body": {"items": [{"name": "Aluminised Thermal Suit", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-ALUTHERM", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Amour Bunker Suit", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-AMBUNK", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Bee Catcher's Suit", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-BEECATCH", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Chef's Jacket", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-CHEFJKT", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Cotton Worksuit Blue Elastic Cuff", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-CWSBLUE", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Firefighting Suit", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-FIRESUIT", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Ladies' Worksuit Blue", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-LWSBLUE", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Ladies' Worksuit Reflective", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-LWSREFL", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Life Jacket Adult Size", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-LIFEJKT", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "PVC Rain Suits", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-PVCRAIN", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Rain Suits", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-RAINSUT", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Reflective Cotton Worksuits White", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-RCWSWHT", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Reflective Blue Worksuit", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-RWSBLUE", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Reflective Vest", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-REFLVST", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Reflective Vest Long Sleeve", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-REFLVLS", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Shirt Cotton Orange & Navy", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-SHRTORN", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Shirt Cotton Lime & Navy", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-SHRTLMN", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Shirt Short Navy & Lime", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-SHSTNVL", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Shirt Short Orange & Lime", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-SHSTORL", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Sinking Suit Reflective", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-SINKREF", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Thermal Trousers", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-THERMTR", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Trousers Cotton Navy", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-TRSCNVY", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Welding Jacket", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-WELDJKT", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "White Lab Coats", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-LABCOAT", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Winter Jacket Reflective", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-WINJKTR", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Winter Suit", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-WINSUT", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Winter Jacket", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-WINJKT", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Worksuit Blue Cotton", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-WSBLCOT", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Worksuit Green Acid Proof", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-WSGRACID", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Worksuit Navy Flame Retardant", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-WSNVFR", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Worksuit White Cotton", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-WSWHTCOT", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Worksuit Yellow Cotton", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-WSYELCOT", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Worksuit Cotton Blue", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-WSCOTBL", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Worksuit Red Flame Retardant", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-WSREDFR", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Worksuite Green Cotton", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-WSGRCOT", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Black Jean (Pair)", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-JEANBLK", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Blue Jean (Pair)", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-JEANBLU", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Safety Harness", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-SAFHARNS", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Kidney Belts", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-KIDNBELT", "sizeScale": "BODY_NUMERIC", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Leather Apron", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-LTHRAPN", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "PVC Apron", "unit": "EA", "category": "BODY/TORSO", "itemCode": "BT-PVCAPRON", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Gum Shoe Steel Toe", "unit": "EA", "category": "FEET", "itemCode": "FT-GUMSHOS", "sizeScale": "FEET", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Ladies Safety Shoe", "unit": "EA", "category": "FEET", "itemCode": "FT-LADSAF", "sizeScale": "FEET", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Ladies Safety Shoe High Cut", "unit": "EA", "category": "FEET", "itemCode": "FT-LADSAFHC", "sizeScale": "FEET", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Safety Shoe Executive", "unit": "EA", "category": "FEET", "itemCode": "FT-SAFEXEC", "sizeScale": "FEET", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Safety Shoe Steel Toe", "unit": "EA", "category": "FEET", "itemCode": "FT-SAFSTOE", "sizeScale": "FEET", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Safety Shoe High Cut", "unit": "EA", "category": "FEET", "itemCode": "FT-SAFHICUT", "sizeScale": "FEET", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Viking Fire Fighting Boots", "unit": "EA", "category": "FEET", "itemCode": "FT-VIKFIRE", "sizeScale": "FEET", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Knee Cap", "unit": "EA", "category": "LEGS/LOWER/KNEES", "itemCode": "LK-KNEECAP", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Leather Spats", "unit": "EA", "category": "LEGS/LOWER/KNEES", "itemCode": "LK-LTHSPAT", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Ear Muffs Red", "unit": "EA", "category": "EARS", "itemCode": "EA-EARMUFR", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Earplugs", "unit": "EA", "category": "EARS", "itemCode": "EA-EARPLUG", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Electrical Rubber Gloves", "unit": "EA", "category": "HANDS", "itemCode": "HD-ELECRUB", "sizeScale": "GLOVES", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Household Gloves", "unit": "EA", "category": "HANDS", "itemCode": "HD-HOUSEHD", "sizeScale": "GLOVES", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Leather Gloves Long", "unit": "EA", "category": "HANDS", "itemCode": "HD-LTHRLNG", "sizeScale": "GLOVES", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Leather Gloves Short", "unit": "EA", "category": "HANDS", "itemCode": "HD-LTHRSHT", "sizeScale": "GLOVES", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Nylon Gloves", "unit": "EA", "category": "HANDS", "itemCode": "HD-NYLONGL", "sizeScale": "GLOVES", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Pig Skin Gloves", "unit": "EA", "category": "HANDS", "itemCode": "HD-PIGSKIN", "sizeScale": "GLOVES", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Fire Fighting Gloves", "unit": "EA", "category": "HANDS", "itemCode": "HD-FIREGLV", "sizeScale": "GLOVES", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "PVC Gloves Long", "unit": "EA", "category": "HANDS", "itemCode": "HD-PVCLNG", "sizeScale": "GLOVES", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "PVC Gloves Short", "unit": "EA", "category": "HANDS", "itemCode": "HD-PVCSHT", "sizeScale": "GLOVES", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Red Heat Resistant Gloves", "unit": "EA", "category": "HANDS", "itemCode": "HD-HEATRES", "sizeScale": "GLOVES", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Thermal Winter Gloves", "unit": "EA", "category": "HANDS", "itemCode": "HD-THERMWN", "sizeScale": "GLOVES", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "Chef's Neckerchief", "unit": "EA", "category": "NECK", "itemCode": "NK-CHEFNCK", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Neckerchief", "unit": "EA", "category": "NECK", "itemCode": "NK-NECKCHF", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Welding Neck Protector", "unit": "EA", "category": "NECK", "itemCode": "NK-WELDNCK", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "3M Respirator Cartridge", "unit": "EA", "category": "RESPIRATORY", "itemCode": "RS-3MCART", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "3M Respirator Filters", "unit": "EA", "category": "RESPIRATORY", "itemCode": "RS-3MFILT", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "3M Respirator Full Face", "unit": "EA", "category": "RESPIRATORY", "itemCode": "RS-3MFULL", "sizeScale": "RESPIRATOR", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "3M Respirator Half Mask", "unit": "EA", "category": "RESPIRATORY", "itemCode": "RS-3MHALF", "sizeScale": "RESPIRATOR", "isMandatory": true, "hasSizeVariants": true, "replacementFrequency": 12}, {"name": "3M Respirator Retainers", "unit": "EA", "category": "RESPIRATORY", "itemCode": "RS-3MRETN", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "CPR Mouth Piece", "unit": "EA", "category": "RESPIRATORY", "itemCode": "RS-CPRMTH", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Dust Mask FFP2", "unit": "EA", "category": "RESPIRATORY", "itemCode": "RS-DUSTFFP2", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "6 Point Hard Hat Liner", "unit": "EA", "category": "HEAD", "itemCode": "HE-6PTLINR", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Balaclava", "unit": "EA", "category": "HEAD", "itemCode": "HE-BALCLVA", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Balaclava Hat", "unit": "EA", "category": "HEAD", "itemCode": "HE-BALCHAT", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Fire Fighting Helmet", "unit": "EA", "category": "HEAD", "itemCode": "HE-FIREHLM", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Cordless Caplamp", "unit": "EA", "category": "HEAD", "itemCode": "HE-CAPLAMP", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Hard Hat", "unit": "EA", "category": "HEAD", "itemCode": "HE-HARDHAT", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Hard Hat Chin Straps", "unit": "EA", "category": "HEAD", "itemCode": "HE-HHCHIN", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Hard Hat Liner", "unit": "EA", "category": "HEAD", "itemCode": "HE-HHLINER", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Hard Hat Gray", "unit": "EA", "category": "HEAD", "itemCode": "HE-HHGRAY", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Sun Brim", "unit": "EA", "category": "HEAD", "itemCode": "HE-SUNBRIM", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Sun Visor", "unit": "EA", "category": "HEAD", "itemCode": "HE-SUNVISR", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Thermal Woolen Hat", "unit": "EA", "category": "HEAD", "itemCode": "HE-THERMWL", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Welding Helmet", "unit": "EA", "category": "HEAD", "itemCode": "HE-WELDHLM", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Welding Helmet Inner Cap", "unit": "EA", "category": "HEAD", "itemCode": "HE-WHLMCAP", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Anti-Fog Goggles", "unit": "EA", "category": "EYES/FACE", "itemCode": "EF-ANTIFOG", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Face Shield (Clear)", "unit": "EA", "category": "EYES/FACE", "itemCode": "EF-FCSHCLR", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Safety Glasses Clear", "unit": "EA", "category": "EYES/FACE", "itemCode": "EF-SAFGLSC", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Safety Glasses Dark", "unit": "EA", "category": "EYES/FACE", "itemCode": "EF-SAFGLSD", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Welding Lenses (Clear)", "unit": "EA", "category": "EYES/FACE", "itemCode": "EF-WELDLNC", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}, {"name": "Welding Lenses (Dark)", "unit": "EA", "category": "EYES/FACE", "itemCode": "EF-WELDLND", "isMandatory": true, "hasSizeVariants": false, "replacementFrequency": 12}], "updateExisting": false}, "query": {}, "params": {}}	{"url": "/api/v1/ppe/bulk-upload", "method": "POST", "statusCode": 201}	::ffff:192.168.2.40	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-19 17:35:28.862+02	542e56df-94d9-47cf-9c70-842f858e9fe8
411ca146-60d8-4e9d-a331-17f0eec01f9e	DELETE	SECTION_MATRIX	\N	{"body": {}, "query": {}, "params": {"sectionId": "3c553423-c8f3-4c6e-97ac-1436febda45b"}}	{"url": "/api/v1/section-matrix/by-section/3c553423-c8f3-4c6e-97ac-1436febda45b", "method": "DELETE", "statusCode": 200}	::ffff:192.168.2.40	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-19 17:42:36.204+02	542e56df-94d9-47cf-9c70-842f858e9fe8
4368c09d-0bcd-411f-9023-2f422d9313a2	CREATE	SECTION_MATRIX	85088b0b-5ce9-45ef-90c6-fbef925ba160	{"body": {"ppeItemId": "2e534e1b-099e-4a70-9803-0b828fc4ea6c", "sectionId": "3c553423-c8f3-4c6e-97ac-1436febda45b", "isMandatory": true, "quantityRequired": 1, "replacementFrequency": 12}, "query": {}, "params": {}}	{"url": "/api/v1/section-matrix", "method": "POST", "statusCode": 201}	::ffff:192.168.2.40	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-19 17:42:36.27+02	542e56df-94d9-47cf-9c70-842f858e9fe8
73c619d2-9d96-44f5-853d-6670ea171044	CREATE	SECTION_MATRIX	e809eccd-9e24-4aab-993f-a5aba3e3eaff	{"body": {"ppeItemId": "9468b8ae-1620-4a14-83db-1c76dafe6be8", "sectionId": "3c553423-c8f3-4c6e-97ac-1436febda45b", "isMandatory": true, "quantityRequired": 1, "replacementFrequency": 12}, "query": {}, "params": {}}	{"url": "/api/v1/section-matrix", "method": "POST", "statusCode": 201}	::ffff:192.168.2.40	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-19 17:42:36.304+02	542e56df-94d9-47cf-9c70-842f858e9fe8
12e83768-9c90-4c3c-86eb-1f8dbf0f26c9	LOGIN	User	75fdd729-2394-41dc-ac58-048ff1adce90	\N	{"ip": "::ffff:192.168.2.40", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"}	::ffff:192.168.2.40	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-19 17:42:54.123+02	75fdd729-2394-41dc-ac58-048ff1adce90
467c2d81-7a56-417b-b303-95e516120244	CREATE	User	124329dc-1b56-482d-84c9-011310287b89	{"body": {"roleId": "ee50b1f1-1efd-4624-a1c1-fd99a8a9de46", "password": "test.123", "username": "dp329", "sectionId": "3c553423-c8f3-4c6e-97ac-1436febda45b", "employeeId": "03ebca57-acf4-4308-b37a-cd144783b590", "departmentId": "6c0fedbc-84b1-49d8-9b5a-3d20daf1e5e6"}, "query": {}, "params": {}}	{"url": "/api/v1/users/promote-employee", "method": "POST"}	::ffff:192.168.2.40	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-19 17:44:10.484+02	75fdd729-2394-41dc-ac58-048ff1adce90
e04b711d-ce7b-44b7-91dd-f16e9eb38a82	CREATE	USERS	124329dc-1b56-482d-84c9-011310287b89	{"body": {"roleId": "ee50b1f1-1efd-4624-a1c1-fd99a8a9de46", "password": "[REDACTED]", "username": "dp329", "sectionId": "3c553423-c8f3-4c6e-97ac-1436febda45b", "employeeId": "03ebca57-acf4-4308-b37a-cd144783b590", "departmentId": "6c0fedbc-84b1-49d8-9b5a-3d20daf1e5e6"}, "query": {}, "params": {}}	{"url": "/api/v1/users/promote-employee", "method": "POST", "statusCode": 201}	::ffff:192.168.2.40	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-19 17:44:10.484+02	75fdd729-2394-41dc-ac58-048ff1adce90
52f5b362-2d9f-48ba-981b-10b47985f0ed	CREATE	User	885bfd3a-aa53-4a4f-a5ec-92b59c4d21be	{"body": {"roleId": "bb738a2e-f549-43cd-81bf-be80091450f5", "password": "test.123", "username": "dp140", "sectionId": "", "employeeId": "7d9fc107-64bd-4946-96fa-eb836f7fb0a8", "departmentId": "6c0fedbc-84b1-49d8-9b5a-3d20daf1e5e6"}, "query": {}, "params": {}}	{"url": "/api/v1/users/promote-employee", "method": "POST"}	::ffff:192.168.2.40	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-19 17:44:46.272+02	75fdd729-2394-41dc-ac58-048ff1adce90
74e76928-c5cf-46bc-bd66-b485fa18118e	CREATE	USERS	885bfd3a-aa53-4a4f-a5ec-92b59c4d21be	{"body": {"roleId": "bb738a2e-f549-43cd-81bf-be80091450f5", "password": "[REDACTED]", "username": "dp140", "sectionId": "", "employeeId": "7d9fc107-64bd-4946-96fa-eb836f7fb0a8", "departmentId": "6c0fedbc-84b1-49d8-9b5a-3d20daf1e5e6"}, "query": {}, "params": {}}	{"url": "/api/v1/users/promote-employee", "method": "POST", "statusCode": 201}	::ffff:192.168.2.40	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-19 17:44:46.272+02	75fdd729-2394-41dc-ac58-048ff1adce90
b428f225-70cd-41d1-9bcd-6d87a358b09d	LOGIN	User	124329dc-1b56-482d-84c9-011310287b89	\N	{"ip": "::ffff:192.168.2.40", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"}	::ffff:192.168.2.40	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-19 17:45:33.813+02	124329dc-1b56-482d-84c9-011310287b89
fa4eb8fc-3a1a-4d1a-8940-6edd91e38d2e	CREATE	Request	26577b61-9505-4a3a-9213-f5378e4ceebb	{"body": {"items": [{"size": "6", "reason": "Standard issue per job title requirement", "quantity": 1, "ppeItemId": "2e534e1b-099e-4a70-9803-0b828fc4ea6c"}, {"size": "6", "reason": "Standard issue per job title requirement", "quantity": 1, "ppeItemId": "9468b8ae-1620-4a14-83db-1c76dafe6be8"}], "employeeId": "7d9fc107-64bd-4946-96fa-eb836f7fb0a8", "requestType": "new"}, "query": {}, "params": {}}	{"url": "/api/v1/requests", "method": "POST"}	::ffff:192.168.2.40	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-19 17:46:21.407+02	124329dc-1b56-482d-84c9-011310287b89
9f063ad6-5950-486b-b803-b09712916167	CREATE	REQUESTS	26577b61-9505-4a3a-9213-f5378e4ceebb	{"body": {"items": [{"size": "6", "reason": "Standard issue per job title requirement", "quantity": 1, "ppeItemId": "2e534e1b-099e-4a70-9803-0b828fc4ea6c"}, {"size": "6", "reason": "Standard issue per job title requirement", "quantity": 1, "ppeItemId": "9468b8ae-1620-4a14-83db-1c76dafe6be8"}], "employeeId": "7d9fc107-64bd-4946-96fa-eb836f7fb0a8", "requestType": "new"}, "query": {}, "params": {}}	{"url": "/api/v1/requests", "method": "POST", "statusCode": 201}	::ffff:192.168.2.40	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-19 17:46:21.407+02	124329dc-1b56-482d-84c9-011310287b89
ff6623f8-0ef5-44db-9aa1-ae35b65454b6	UPDATE	REQUESTS	26577b61-9505-4a3a-9213-f5378e4ceebb	{"body": {}, "query": {}, "params": {"id": "26577b61-9505-4a3a-9213-f5378e4ceebb"}}	{"url": "/api/v1/requests/26577b61-9505-4a3a-9213-f5378e4ceebb/section-rep-approve", "method": "PUT", "statusCode": 200}	::ffff:192.168.2.40	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-19 17:46:30.055+02	124329dc-1b56-482d-84c9-011310287b89
ceab46ae-0956-4ae6-9c14-e202ec734282	UPDATE	Request	26577b61-9505-4a3a-9213-f5378e4ceebb	{"body": {}, "query": {}, "params": {"id": "26577b61-9505-4a3a-9213-f5378e4ceebb"}}	{"url": "/api/v1/requests/26577b61-9505-4a3a-9213-f5378e4ceebb/section-rep-approve", "method": "PUT"}	::ffff:192.168.2.40	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-19 17:46:30.055+02	124329dc-1b56-482d-84c9-011310287b89
9fda1433-72d3-4388-89a1-b214e9cc27c2	LOGIN	User	885bfd3a-aa53-4a4f-a5ec-92b59c4d21be	\N	{"ip": "::ffff:192.168.2.40", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"}	::ffff:192.168.2.40	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-19 17:46:46.973+02	885bfd3a-aa53-4a4f-a5ec-92b59c4d21be
7c4f60d0-ff40-497d-ba3e-7ba2f2f58d2e	UPDATE	Request	26577b61-9505-4a3a-9213-f5378e4ceebb	{"body": {}, "query": {}, "params": {"id": "26577b61-9505-4a3a-9213-f5378e4ceebb"}}	{"url": "/api/v1/requests/26577b61-9505-4a3a-9213-f5378e4ceebb/hod-approve", "method": "PUT"}	::ffff:192.168.2.40	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-19 17:46:52.924+02	885bfd3a-aa53-4a4f-a5ec-92b59c4d21be
7b70b713-a656-493e-8a12-9915e4a03762	UPDATE	REQUESTS	26577b61-9505-4a3a-9213-f5378e4ceebb	{"body": {}, "query": {}, "params": {"id": "26577b61-9505-4a3a-9213-f5378e4ceebb"}}	{"url": "/api/v1/requests/26577b61-9505-4a3a-9213-f5378e4ceebb/hod-approve", "method": "PUT", "statusCode": 200}	::ffff:192.168.2.40	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-19 17:46:52.925+02	885bfd3a-aa53-4a4f-a5ec-92b59c4d21be
\.


--
-- TOC entry 5153 (class 0 OID 18331)
-- Dependencies: 238
-- Data for Name: budgets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.budgets (id, company_budget_id, department_id, section_id, fiscal_year, allocated_amount, total_spent, total_budget, allocated_budget, remaining_budget, status, period, quarter, month, start_date, end_date, notes, created_at, updated_at) FROM stdin;
c94b15b9-13bc-46a5-a26c-ffde6437b3b3	72d738bc-b5a8-4eee-84fc-9da39c43c645	cc45c464-fca4-493b-b794-bc5da21641ef	\N	2025	10000.00	0.00	10000.00	0.00	10000.00	active	annual	\N	\N	\N	\N	\N	2025-12-19 17:22:21.866+02	2025-12-19 17:22:21.866+02
\.


--
-- TOC entry 5152 (class 0 OID 18297)
-- Dependencies: 237
-- Data for Name: company_budgets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.company_budgets (id, fiscal_year, total_budget, allocated_to_departments, total_spent, status, start_date, end_date, notes, created_by_id, created_at, updated_at) FROM stdin;
72d738bc-b5a8-4eee-84fc-9da39c43c645	2025	100000.00	10000.00	0.00	active	2025-01-01	2025-12-31		75fdd729-2394-41dc-ac58-048ff1adce90	2025-12-19 17:18:23.962+02	2025-12-19 17:42:54.423+02
\.


--
-- TOC entry 5163 (class 0 OID 18618)
-- Dependencies: 248
-- Data for Name: consumable_allocations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.consumable_allocations (id, consumable_request_id, consumable_item_id, section_id, department_id, issued_by_id, received_by_id, quantity, unit_price_u_s_d, total_value_u_s_d, issue_date, batch_number, purpose, notes, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5159 (class 0 OID 18495)
-- Dependencies: 244
-- Data for Name: consumable_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.consumable_items (id, product_code, description, category, stock_account, unit, unit_price, unit_price_u_s_d, min_level, max_level, reorder_point, is_active, notes, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5162 (class 0 OID 18599)
-- Dependencies: 247
-- Data for Name: consumable_request_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.consumable_request_items (id, consumable_request_id, consumable_item_id, quantity_requested, quantity_approved, quantity_fulfilled, unit_price_u_s_d, total_value_u_s_d, status, remarks, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5161 (class 0 OID 18551)
-- Dependencies: 246
-- Data for Name: consumable_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.consumable_requests (id, request_number, section_id, department_id, requested_by_id, status, priority, request_date, required_by_date, purpose, hod_approver_id, hod_approval_date, hod_comments, stores_approver_id, stores_approval_date, stores_comments, fulfilled_date, total_value_u_s_d, notes, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5160 (class 0 OID 18508)
-- Dependencies: 245
-- Data for Name: consumable_stocks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.consumable_stocks (id, consumable_item_id, quantity, unit_price, unit_price_u_s_d, total_value, total_value_u_s_d, location, bin_location, batch_number, expiry_date, last_restocked, last_stock_take, notes, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5139 (class 0 OID 17915)
-- Dependencies: 224
-- Data for Name: cost_centers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cost_centers (id, code, name, description, department_id, is_active, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5137 (class 0 OID 17890)
-- Dependencies: 222
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.departments (id, name, code, description, is_active, created_at, updated_at) FROM stdin;
57c8b16b-6a8b-4b2a-b336-e76cd6aefe91	MINING TECHNICAL SERVICES	001	Mining technical services including geology, survey and planning	t	2025-12-19 17:06:16.923+02	2025-12-19 17:06:16.923+02
cd50c7b8-c41f-4a75-a186-7f7a0d0fb00f	LABORATORY	002	Laboratory services and testing	t	2025-12-19 17:06:16.939+02	2025-12-19 17:06:16.939+02
dd1ede2c-404c-467d-b1b9-f5c110091e3d	PROCESSING	003	Processing plant operations	t	2025-12-19 17:06:16.945+02	2025-12-19 17:06:16.945+02
cc45c464-fca4-493b-b794-bc5da21641ef	HEAD OFFICE	005	Head office administration	t	2025-12-19 17:06:16.958+02	2025-12-19 17:06:16.958+02
c1b04dfd-cca0-4df7-a40f-e2fcd7decc89	MAINTENANCE	006	Maintenance department including mechanical, electrical, civils	t	2025-12-19 17:06:16.964+02	2025-12-19 17:06:16.964+02
d804f917-ba8d-48b9-a578-586bb6265639	MINING	007	Mining operations	t	2025-12-19 17:06:16.969+02	2025-12-19 17:06:16.969+02
a9d193cf-dad5-4b3f-9dc3-c26e103fb2da	HUMAN CAPITAL SUPPORT SERVICES	008	HR, CSIR and Site Co-ordination	t	2025-12-19 17:06:16.972+02	2025-12-19 17:06:16.972+02
8323ad91-a1a3-4cc0-8063-c47e3b54fcbb	SHEQ	009	SHEQ	t	2025-12-19 17:06:16.976+02	2025-12-19 17:06:16.976+02
6c0fedbc-84b1-49d8-9b5a-3d20daf1e5e6	SHARED SERVICES	004	IT , Stores and Finance	t	2025-12-19 17:06:16.952+02	2025-12-19 17:06:16.952+02
\.


--
-- TOC entry 5156 (class 0 OID 18449)
-- Dependencies: 241
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.documents (id, original_filename, stored_filename, storage_path, file_size, mime_type, doc_type, description, created_at, updated_at, employee_id, uploaded_by_id) FROM stdin;
\.


--
-- TOC entry 5141 (class 0 OID 17948)
-- Dependencies: 226
-- Data for Name: employees; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.employees (id, "worksNumber", "employeeId", "firstName", "lastName", email, "phoneNumber", "sectionId", "costCenterId", "jobTitleId", "jobTitle", "jobType", gender, "contractType", "dateOfBirth", "dateJoined", "isActive", "createdAt", "updatedAt") FROM stdin;
a8a8986a-b76d-4b22-90e1-1821461b441b	DG028	\N	ALBERT	MUZAVAZI	\N	\N	29d8843a-cc16-40e0-9b42-c07ff46e5688	\N	79acaffa-2ea1-43cf-be1a-2d814d403c6c	LABORATORY TECHNICIAN	NEC	MALE	TERMINATED	\N	\N	f	2025-12-19 17:14:04.151+02	2025-12-19 17:14:04.151+02
744dde4a-83b1-4a77-90e0-af06a32efe2e	DG135	\N	ADMIRE	WIZIMANI	\N	\N	29d8843a-cc16-40e0-9b42-c07ff46e5688	\N	79acaffa-2ea1-43cf-be1a-2d814d403c6c	LABORATORY TECHNICIAN	NEC	MALE	TERMINATED	\N	\N	f	2025-12-19 17:14:04.16+02	2025-12-19 17:14:04.16+02
b869e2f4-3678-4f04-8588-2b1582b76d65	DG505	\N	RODRECK	CHIMHARE	\N	\N	29d8843a-cc16-40e0-9b42-c07ff46e5688	\N	79acaffa-2ea1-43cf-be1a-2d814d403c6c	LABORATORY TECHNICIAN	NEC	MALE	TERMINATED	\N	\N	f	2025-12-19 17:14:04.162+02	2025-12-19 17:14:04.162+02
61d623b3-eff8-4a50-8fce-74ff0937996f	DG508	\N	WILSHER	NGWENYA	\N	\N	29d8843a-cc16-40e0-9b42-c07ff46e5688	\N	79acaffa-2ea1-43cf-be1a-2d814d403c6c	LABORATORY TECHNICIAN	NEC	MALE	TERMINATED	\N	\N	f	2025-12-19 17:14:04.166+02	2025-12-19 17:14:04.166+02
0598ebd9-68c8-44c1-a760-b8def1927cd3	DG628	\N	MUNYARADZI	NHAMOYEBONDE	\N	\N	29d8843a-cc16-40e0-9b42-c07ff46e5688	\N	79acaffa-2ea1-43cf-be1a-2d814d403c6c	LABORATORY TECHNICIAN	NEC	MALE	TERMINATED	\N	\N	f	2025-12-19 17:14:04.17+02	2025-12-19 17:14:04.17+02
a7b59e46-28b1-465d-87ac-a5d9583354b2	DG631	\N	SILAS	CHAMBA	\N	\N	29d8843a-cc16-40e0-9b42-c07ff46e5688	\N	79acaffa-2ea1-43cf-be1a-2d814d403c6c	LABORATORY TECHNICIAN	NEC	MALE	TERMINATED	\N	\N	f	2025-12-19 17:14:04.174+02	2025-12-19 17:14:04.174+02
5c5948eb-9a25-4679-9d8e-2cb5e0befb19	DG635	\N	DARLISON	MKANDAWIRE	\N	\N	29d8843a-cc16-40e0-9b42-c07ff46e5688	\N	79acaffa-2ea1-43cf-be1a-2d814d403c6c	LABORATORY TECHNICIAN	NEC	MALE	TERMINATED	\N	\N	f	2025-12-19 17:14:04.176+02	2025-12-19 17:14:04.176+02
006f9abc-5979-4b53-96f8-3a27c97269fe	DG749	\N	TINEVIMBO	MAKAVA	\N	\N	29d8843a-cc16-40e0-9b42-c07ff46e5688	\N	79acaffa-2ea1-43cf-be1a-2d814d403c6c	LABORATORY TECHNICIAN	NEC	MALE	TERMINATED	\N	\N	f	2025-12-19 17:14:04.178+02	2025-12-19 17:14:04.178+02
0c87f904-a79a-4390-a2af-2e04114a7bca	DG579	\N	PARTSON	MAZHAMBE	\N	\N	b9a21c3e-de70-4b23-a411-9f9dd5a6f155	\N	79acaffa-2ea1-43cf-be1a-2d814d403c6c	LABORATORY TECHNICIAN	NEC	MALE	TERMINATED	\N	\N	f	2025-12-19 17:14:04.18+02	2025-12-19 17:14:04.18+02
1f43c057-de1a-41af-8f57-537ed93f72e8	DG590	\N	TAWANDA	MAZHAMBE	\N	\N	b9a21c3e-de70-4b23-a411-9f9dd5a6f155	\N	79acaffa-2ea1-43cf-be1a-2d814d403c6c	LABORATORY TECHNICIAN	NEC	MALE	TERMINATED	\N	\N	f	2025-12-19 17:14:04.182+02	2025-12-19 17:14:04.182+02
f5bf16ca-a56b-4291-bfa0-1491da131cf4	DG593	\N	PASSMORE	GUMBURA	\N	\N	b9a21c3e-de70-4b23-a411-9f9dd5a6f155	\N	79acaffa-2ea1-43cf-be1a-2d814d403c6c	LABORATORY TECHNICIAN	NEC	MALE	TERMINATED	\N	\N	f	2025-12-19 17:14:04.184+02	2025-12-19 17:14:04.184+02
b4e9d30f-0675-4a94-b3bc-84f9d60fd934	DG621	\N	HILLARY	CHIPFUNDE	\N	\N	b9a21c3e-de70-4b23-a411-9f9dd5a6f155	\N	79acaffa-2ea1-43cf-be1a-2d814d403c6c	LABORATORY TECHNICIAN	NEC	MALE	TERMINATED	\N	\N	f	2025-12-19 17:14:04.186+02	2025-12-19 17:14:04.186+02
aa6526af-c540-4421-a83f-e942965094eb	DG725	\N	TAFADZWA	CHIVEREVERE	\N	\N	4cc15b4d-688d-40bb-9974-1b8340594027	\N	79acaffa-2ea1-43cf-be1a-2d814d403c6c	LABORATORY TECHNICIAN	NEC	MALE	TERMINATED	\N	\N	f	2025-12-19 17:14:04.187+02	2025-12-19 17:14:04.187+02
6a5dca02-3bd7-4682-b9ef-ce4a4085cbec	DG740	\N	TINOBONGA	BOTE	\N	\N	4cc15b4d-688d-40bb-9974-1b8340594027	\N	79acaffa-2ea1-43cf-be1a-2d814d403c6c	LABORATORY TECHNICIAN	NEC	MALE	TERMINATED	\N	\N	f	2025-12-19 17:14:04.189+02	2025-12-19 17:14:04.189+02
b114425a-7f95-4860-af4b-1917275777f3	DG741	\N	MITCHELL	MATASVA	\N	\N	4cc15b4d-688d-40bb-9974-1b8340594027	\N	79acaffa-2ea1-43cf-be1a-2d814d403c6c	LABORATORY TECHNICIAN	NEC	MALE	TERMINATED	\N	\N	f	2025-12-19 17:14:04.191+02	2025-12-19 17:14:04.191+02
9621207a-a8b6-437b-9578-e7da66e6a439	DG746	\N	NICOLE	MACHEKERA	\N	\N	4cc15b4d-688d-40bb-9974-1b8340594027	\N	79acaffa-2ea1-43cf-be1a-2d814d403c6c	LABORATORY TECHNICIAN	NEC	MALE	TERMINATED	\N	\N	f	2025-12-19 17:14:04.193+02	2025-12-19 17:14:04.193+02
6d5c8190-3b7d-40bc-a1b6-f304f84bf29a	DG748	\N	TANAKA	BOME	\N	\N	4cc15b4d-688d-40bb-9974-1b8340594027	\N	79acaffa-2ea1-43cf-be1a-2d814d403c6c	LABORATORY TECHNICIAN	NEC	MALE	TERMINATED	\N	\N	f	2025-12-19 17:14:04.195+02	2025-12-19 17:14:04.195+02
bf98e41c-8e49-4ab2-8048-1fb591148135	DG761	\N	SHUMIRAI	MAZHAMBE	\N	\N	4cc15b4d-688d-40bb-9974-1b8340594027	\N	79acaffa-2ea1-43cf-be1a-2d814d403c6c	LABORATORY TECHNICIAN	NEC	MALE	TERMINATED	\N	\N	f	2025-12-19 17:14:04.196+02	2025-12-19 17:14:04.196+02
ea4be792-274f-4523-8660-f96b829d1bbe	DG763	\N	ANESU	MUNYUKI	\N	\N	4cc15b4d-688d-40bb-9974-1b8340594027	\N	79acaffa-2ea1-43cf-be1a-2d814d403c6c	LABORATORY TECHNICIAN	NEC	MALE	TERMINATED	\N	\N	f	2025-12-19 17:14:04.198+02	2025-12-19 17:14:04.198+02
82340080-4f81-4b52-b493-5d58166b80c8	DG784	\N	EMMANUEL	GWATINETSA	\N	\N	4cc15b4d-688d-40bb-9974-1b8340594027	\N	79acaffa-2ea1-43cf-be1a-2d814d403c6c	LABORATORY TECHNICIAN	NEC	MALE	TERMINATED	\N	\N	f	2025-12-19 17:14:04.2+02	2025-12-19 17:14:04.2+02
2b2f02aa-028a-4977-9e69-f9855d350b14	DGZ062	\N	TONDERAI	CHIRIGA	\N	\N	eac91c5a-45aa-48e6-9da0-e8d6abc4ee40	\N	79acaffa-2ea1-43cf-be1a-2d814d403c6c	LABORATORY TECHNICIAN	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.202+02	2025-12-19 17:14:04.202+02
86707b95-879a-42c2-958d-bd9e1c44142b	DGZ063	\N	NOVUYO	NDIMANDE	\N	\N	eac91c5a-45aa-48e6-9da0-e8d6abc4ee40	\N	79acaffa-2ea1-43cf-be1a-2d814d403c6c	LABORATORY TECHNICIAN	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.203+02	2025-12-19 17:14:04.203+02
5e28b09a-082d-4a49-83ef-26fd1647afb1	DGZ064	\N	JANIEL ANDREW	MURAIRWA	\N	\N	eac91c5a-45aa-48e6-9da0-e8d6abc4ee40	\N	79acaffa-2ea1-43cf-be1a-2d814d403c6c	LABORATORY TECHNICIAN	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.205+02	2025-12-19 17:14:04.205+02
1748be6d-5808-4ba7-856e-770e798f1c4e	DGZ088	\N	SANDRA	MATEWA	\N	\N	eac91c5a-45aa-48e6-9da0-e8d6abc4ee40	\N	79acaffa-2ea1-43cf-be1a-2d814d403c6c	LABORATORY TECHNICIAN	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.207+02	2025-12-19 17:14:04.207+02
4b6c4ac5-30ce-4366-8215-c51ef2be54c3	DP166	\N	AUGUSTINE	SHAPURE	\N	\N	eac91c5a-45aa-48e6-9da0-e8d6abc4ee40	\N	71cb42b5-e76d-43e6-b245-607b48fdcbd8	MINE ASSAYER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.208+02	2025-12-19 17:14:04.208+02
1ad2329c-9d86-4e2a-abda-90b994c83ad8	DP198	\N	FARAI	HOKO	\N	\N	eac91c5a-45aa-48e6-9da0-e8d6abc4ee40	\N	79acaffa-2ea1-43cf-be1a-2d814d403c6c	LABORATORY TECHNICIAN	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.211+02	2025-12-19 17:14:04.211+02
8388aa08-0818-48ea-9b8c-3b1c1518261e	DGZ013	\N	STANWELL	CHIDO	\N	\N	5e6a2ece-98b5-48fb-9e0d-d6df5aea47a0	\N	b0921c81-6712-4796-9fdd-2738911420e2	CHARGEHAND BUILDERS	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.213+02	2025-12-19 17:14:04.213+02
2a971bc5-b7c5-482d-a7c1-43ab30662b0d	DP071	\N	AGRIA	NYATI	\N	\N	5e6a2ece-98b5-48fb-9e0d-d6df5aea47a0	\N	da44121b-f28b-49db-8ec5-549cf7955b2d	CARPENTER CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.215+02	2025-12-19 17:14:04.215+02
f5d070b6-2880-4438-9d89-9837bc74bb24	DP082	\N	WILLARD	NYAMBALO	\N	\N	5e6a2ece-98b5-48fb-9e0d-d6df5aea47a0	\N	9de6a99a-c8a2-46e9-b20f-ffe839ae34a6	CIVILS SUPERVISOR	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.217+02	2025-12-19 17:14:04.217+02
2d8094ef-4eb3-4512-8286-2996736ad4f1	DGZ011	\N	SIBONGILE	KONDO	\N	\N	b0d59194-4032-43c3-a0ca-fedcbf0fa95b	\N	bc0bc6d8-f9ad-476d-ae4c-482a0d3eb73d	ELECTRICIAN CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.219+02	2025-12-19 17:14:04.219+02
af776bf5-bfa6-46f4-ae56-2675d1ea4e87	DGZ031	\N	JOHNSON	CHAPARAPATA	\N	\N	b0d59194-4032-43c3-a0ca-fedcbf0fa95b	\N	bc0bc6d8-f9ad-476d-ae4c-482a0d3eb73d	ELECTRICIAN CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.222+02	2025-12-19 17:14:04.222+02
b12513d1-508e-4e40-8d3b-02ee0c9bae9b	DP073	\N	GAUNJE	MWENYE	\N	\N	b0d59194-4032-43c3-a0ca-fedcbf0fa95b	\N	4632b563-0a7b-48cb-b441-2b3c2d0e05dd	SENIOR ELECTRICAL AND INSTRUMENTATION SUPT	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.224+02	2025-12-19 17:14:04.224+02
dfd5a364-b050-4529-8eb4-c7d1cb576308	DP197	\N	JOSEPH	NCUBE	\N	\N	b0d59194-4032-43c3-a0ca-fedcbf0fa95b	\N	07ab03e3-6eb9-4bd6-9b6b-6ceddd969e6c	CHARGEHAND INSTRUMENTATION	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.226+02	2025-12-19 17:14:04.226+02
80c587f9-8929-4a7e-915a-dc4bcc04e9c9	DP213	\N	TINASHE	GOTEKA	\N	\N	b0d59194-4032-43c3-a0ca-fedcbf0fa95b	\N	7d53cbc0-d46e-4c6a-82af-6396744e9fc7	JUNIOR ELECTRICAL ENGINEER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.228+02	2025-12-19 17:14:04.228+02
6b3963ac-ece7-4b94-854d-cf0eebb4e1d4	DP218	\N	TRYMORE	JAKARASI	\N	\N	b0d59194-4032-43c3-a0ca-fedcbf0fa95b	\N	0c0bbbef-1c65-4d48-8531-a07ee5899b7f	ELECTRICAL MANAGER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.229+02	2025-12-19 17:14:04.229+02
ee60028a-3473-4582-9c35-f43c7b05f5c9	DP226	\N	TAMARA	SUMANI	\N	\N	b0d59194-4032-43c3-a0ca-fedcbf0fa95b	\N	ccd2d0d7-c88c-4967-b10a-dd7af30c8dfd	JUNIOR INSTRUMENTATION ENGINEER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.231+02	2025-12-19 17:14:04.231+02
40dacc9b-28c7-492c-a879-d8bac96bc84e	DP245	\N	HEBERT	KUBVORUNO	\N	\N	b0d59194-4032-43c3-a0ca-fedcbf0fa95b	\N	9f6f10c6-8b93-482f-8e3b-edc080321727	INSTRUMENTATION TECHNICIAN	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.233+02	2025-12-19 17:14:04.233+02
3bdd3c83-f07f-4c65-a868-9f26394aa828	DP282	\N	GODFREY	MASAMBA	\N	\N	b0d59194-4032-43c3-a0ca-fedcbf0fa95b	\N	63c8e80e-eeec-47e6-9d6b-4dca73a14e66	ELECTRICIAN CLASS 2	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.235+02	2025-12-19 17:14:04.235+02
4bc706b0-6a28-444b-8b5d-76af0356ae15	DP294	\N	PROSPER	NLEYA	\N	\N	b0d59194-4032-43c3-a0ca-fedcbf0fa95b	\N	50afc310-6afb-4267-9253-4171ca714806	INSTRUMENTATION TECHNICAN	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.236+02	2025-12-19 17:14:04.236+02
d5a76e26-400c-4950-ae2a-b5e56259c94d	DP296	\N	NESBERT	MARINGIRENI	\N	\N	b0d59194-4032-43c3-a0ca-fedcbf0fa95b	\N	bc0bc6d8-f9ad-476d-ae4c-482a0d3eb73d	ELECTRICIAN CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.238+02	2025-12-19 17:14:04.238+02
0528e92f-b44e-4e6b-9cf6-a4c1488ec808	DP303	\N	LAWRENCE	MOYO	\N	\N	b0d59194-4032-43c3-a0ca-fedcbf0fa95b	\N	0a321d52-54d6-49d9-9153-76ad554e9874	CHARGEHAND ELECTRICAL	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.24+02	2025-12-19 17:14:04.24+02
10778f2d-7ec6-4dc3-b934-8e75fcf08166	DP331	\N	ALI	KASEMBE	\N	\N	b0d59194-4032-43c3-a0ca-fedcbf0fa95b	\N	bc0bc6d8-f9ad-476d-ae4c-482a0d3eb73d	ELECTRICIAN CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.241+02	2025-12-19 17:14:04.241+02
2c53a872-bb00-4f5d-b989-cfe0ccc0c930	DP353	\N	BLESSING	MUKO	\N	\N	b0d59194-4032-43c3-a0ca-fedcbf0fa95b	\N	9f6f10c6-8b93-482f-8e3b-edc080321727	INSTRUMENTATION TECHNICIAN	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.243+02	2025-12-19 17:14:04.243+02
27ad7dbe-356e-4131-8089-8c14bf621cb0	DP355	\N	FISHER	CHAKWIZIRA	\N	\N	b0d59194-4032-43c3-a0ca-fedcbf0fa95b	\N	bc0bc6d8-f9ad-476d-ae4c-482a0d3eb73d	ELECTRICIAN CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.245+02	2025-12-19 17:14:04.245+02
23536d61-8ee0-4056-98d8-053bd39c5fe1	DP356	\N	COSTA	CHUDU	\N	\N	b0d59194-4032-43c3-a0ca-fedcbf0fa95b	\N	bc0bc6d8-f9ad-476d-ae4c-482a0d3eb73d	ELECTRICIAN CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.247+02	2025-12-19 17:14:04.247+02
f18cd461-cf5a-45bc-8263-e97035d1bba0	DP357	\N	TALENT	LANGWANI	\N	\N	b0d59194-4032-43c3-a0ca-fedcbf0fa95b	\N	bc0bc6d8-f9ad-476d-ae4c-482a0d3eb73d	ELECTRICIAN CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.248+02	2025-12-19 17:14:04.248+02
381edca2-6b16-4f4c-99fa-b9bca86e88b8	DP358	\N	GIFT	MAKAYA	\N	\N	b0d59194-4032-43c3-a0ca-fedcbf0fa95b	\N	bc0bc6d8-f9ad-476d-ae4c-482a0d3eb73d	ELECTRICIAN CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.251+02	2025-12-19 17:14:04.251+02
74ef5c54-f5ef-4510-be4c-1735fddad066	DGZ018	\N	LISIAS	SHERENI	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	\N	dc699168-c1a2-430a-a0c0-437fab27a1b4	FITTER CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.253+02	2025-12-19 17:14:04.253+02
ed2480e2-5a9f-43d0-86f8-364a87ec006b	DGZ019	\N	JOHN	CHATAIRA	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	\N	dc699168-c1a2-430a-a0c0-437fab27a1b4	FITTER CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.256+02	2025-12-19 17:14:04.256+02
a82c0105-12c2-4432-a603-ee2187df5022	DGZ024	\N	AMBROSE	MATARUTSE	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	\N	14c6a99e-2369-4e1d-ab12-2bded166ac14	DRY PLANT FOREMAN	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.262+02	2025-12-19 17:14:04.262+02
6cd1d512-c3a6-4041-a99d-94cb15a88d40	DGZ061	\N	MOLISA	MOTLOGWA	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	\N	28fcfb02-74be-4afb-9b85-6fffe3ce141d	PLUMBER CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.265+02	2025-12-19 17:14:04.265+02
447fb528-43d3-412b-98a3-8f375e7e1392	DGZ075	\N	ELISHA	MUKANDE	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	\N	dc699168-c1a2-430a-a0c0-437fab27a1b4	FITTER CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.267+02	2025-12-19 17:14:04.267+02
aa88a694-e483-4191-8e7e-2e36e90adece	DGZ091	\N	ANTHONY	MAFAIROSI	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	\N	eb554793-1852-4ce2-bc51-9e7f005a623e	FITTER CLASS 2	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.27+02	2025-12-19 17:14:04.27+02
53ac800a-7ea3-41e6-a59f-5fcbbe9276ff	DP089	\N	PETRO	MUTONGA	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	\N	941e6118-10a8-49cc-a3ff-bd1e78f8a096	STRUCTURAL FITTING FOREMAN	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.272+02	2025-12-19 17:14:04.272+02
55bd7a2a-03e2-49d8-9e68-90aa8a37ac1c	DP119	\N	WARREN	MTUTU	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	\N	01273f7e-f46c-4201-b919-71f194c1d8a5	MAINTENANCE ENGINEER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.273+02	2025-12-19 17:14:04.273+02
d80de1f6-1967-489e-b644-743108b5ad59	DP175	\N	MISI	TONGERA	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	\N	55ed0a5b-6eeb-4b20-b5f6-659d0af08d04	BELTS MAN	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.275+02	2025-12-19 17:14:04.275+02
cfd0905c-453e-42d4-860d-c83d125ed0b2	DP200	\N	ELIAS	MWAZHA	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	\N	115bcb1a-8d05-45b5-bfb4-a56998307722	MECHANICAL MANAGER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.276+02	2025-12-19 17:14:04.276+02
611241d2-bce5-4110-bac1-b2ec32bd5c96	DP214	\N	TINASHE	MACHIMBIRIKE	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	\N	09f3960a-d90c-4dcf-a247-e647b9cbf5a9	ASSISTANT MECHANICAL ENGINEER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.278+02	2025-12-19 17:14:04.278+02
a0ef584a-4390-4889-a573-9988dcb08c24	DP236	\N	TARIRO	MUDZAMIRI	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	\N	0f81b4f9-d0d0-490b-a509-48660127ecb3	JUNIOR MECHANICAL ENGINEER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.28+02	2025-12-19 17:14:04.28+02
8fe8a895-7b3f-43d9-81de-7cd8aeb09e61	DP254	\N	KNOWLEDGE	MAJUTA	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	\N	dc699168-c1a2-430a-a0c0-437fab27a1b4	FITTER CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.281+02	2025-12-19 17:14:04.281+02
a5f499ff-268b-4114-aadb-bb7a965f9b01	DP255	\N	TERRENCE	MUTANDWA	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	\N	b0a9c63e-337e-4aa7-a899-0f871db3727c	CHARGEHAND	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.283+02	2025-12-19 17:14:04.283+02
a8748630-1c5c-4b36-9aaf-e8b8ea169648	DP330	\N	EVARISTO	MUGUDA	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	\N	eb554793-1852-4ce2-bc51-9e7f005a623e	FITTER CLASS 2	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.285+02	2025-12-19 17:14:04.285+02
b1a6c0f0-8aab-4d24-8c2e-85620bc0845e	DP351	\N	LOVEMORE	EZALA	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	\N	67d1e694-1563-49c1-9835-d1cdea6793a8	CHARGE HAND FITTING WET PLANT	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.286+02	2025-12-19 17:14:04.286+02
d282a652-84bd-4c8c-9ffd-94c17f057b85	DP010	\N	FARAI	MUPINDUKI	\N	\N	792c13ed-aa0e-42cd-9743-0553edaf8caf	\N	664204e3-2d60-4c35-8b2c-70e23de7d778	DRAUGHTSMAN	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.288+02	2025-12-19 17:14:04.288+02
c435d657-fa6f-4183-a85d-d56f173093de	DP112	\N	JAMES	STEVENAGE	\N	\N	792c13ed-aa0e-42cd-9743-0553edaf8caf	\N	d8280bdd-f7ed-47cd-afac-178debbe73af	MAINTENANCE PLANNER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.289+02	2025-12-19 17:14:04.289+02
cbcbccf5-0347-4b98-aa4e-856dc1c97719	DP167	\N	STANFORD	MUSENGEZI	\N	\N	792c13ed-aa0e-42cd-9743-0553edaf8caf	\N	b00c838e-f371-43fa-9699-65b8ed179b1e	MAINTENANCE MANAGER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.291+02	2025-12-19 17:14:04.291+02
c8f81ac8-1088-4193-bce5-7c4b776f0ff5	DP190	\N	AGNES	MAGWAZA	\N	\N	792c13ed-aa0e-42cd-9743-0553edaf8caf	\N	83c33380-1886-4670-bd82-70245cd4f4a1	PLANNING FOREMAN	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.293+02	2025-12-19 17:14:04.293+02
369d1e92-9f27-4c92-83fa-294159d02766	DP237	\N	GAMUCHIRAI	JESE	\N	\N	792c13ed-aa0e-42cd-9743-0553edaf8caf	\N	\N	JUNIOR  PLANNING ENGINEER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.294+02	2025-12-19 17:14:04.294+02
738e81a8-e0ce-479e-8842-1822960864b8	DGZ001	\N	COURAGE	CHALEKA	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	\N	473805b6-6074-4904-859a-ddbc5f35dcd6	BOILERMAKER CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.296+02	2025-12-19 17:14:04.296+02
cc057a77-f60d-499a-b104-e270469e13ef	DGZ003	\N	GODKNOWS	JIRI	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	\N	473805b6-6074-4904-859a-ddbc5f35dcd6	BOILERMAKER CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.299+02	2025-12-19 17:14:04.299+02
1326a041-b7da-4b8b-b9cd-d45bb0470a03	DGZ010	\N	ADMIRE	GADZE	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	\N	89d273db-35fc-4497-8de4-dd14edbad3a3	CHARGEHAND BOILERMAKERS	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.3+02	2025-12-19 17:14:04.3+02
eb9d5ba8-e5de-4297-bd9c-9a5c7f49b18e	DGZ016	\N	NDABEZINHLE	MHLANGA	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	\N	473805b6-6074-4904-859a-ddbc5f35dcd6	BOILERMAKER CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.302+02	2025-12-19 17:14:04.302+02
322a46c5-56b4-4064-97cb-73a25031c3e8	DGZ020	\N	DANIEL	CHENGO	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	\N	9048c0e6-4d0b-47f3-8ab9-48612776b68c	WELDER CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.304+02	2025-12-19 17:14:04.304+02
8035bc3d-ab90-4aee-9b86-2bb45deb9d25	DGZ025	\N	SHEPHERD	ZINYAMA	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	\N	9048c0e6-4d0b-47f3-8ab9-48612776b68c	WELDER CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.306+02	2025-12-19 17:14:04.306+02
506cc869-26f0-48fb-915c-6bb8d6c05aca	DGZ027	\N	ROBERT	MKWAIKI	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	\N	5a983167-e50d-4e9e-96d9-7d15ff6f55e8	BOILER MAKER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.309+02	2025-12-19 17:14:04.309+02
890dea6e-dbe7-43ea-a729-ee13e6810852	DGZ036	\N	ARTHUR	KAPFUNDE	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	\N	473805b6-6074-4904-859a-ddbc5f35dcd6	BOILERMAKER CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.312+02	2025-12-19 17:14:04.312+02
13c90765-8841-4820-81c3-c86c187fc886	DGZ039	\N	GEORGE	NEZUNGAI	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	\N	473805b6-6074-4904-859a-ddbc5f35dcd6	BOILERMAKER CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.314+02	2025-12-19 17:14:04.314+02
3a2047c6-7602-46a1-86cb-062c175a2393	DGZ041	\N	OWEN	ALFONSO	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	\N	f1c68327-6ec2-4aeb-9403-cadc89f32ece	CODED WELDER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.316+02	2025-12-19 17:14:04.316+02
a42b86c7-1cd0-4ae8-a3cd-148be6bf2f34	DGZ050	\N	GABRIEL	TICHARWA	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	\N	473805b6-6074-4904-859a-ddbc5f35dcd6	BOILERMAKER CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.319+02	2025-12-19 17:14:04.319+02
5d184751-9468-4907-82cb-8624f5dd366e	DGZ054	\N	COSTEN	CHINODA	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	\N	9048c0e6-4d0b-47f3-8ab9-48612776b68c	WELDER CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.322+02	2025-12-19 17:14:04.322+02
33f2dd9b-fde8-4c59-8c2e-f75eb6dd7800	DGZ077	\N	RAMUS	MWASANGA	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	\N	473805b6-6074-4904-859a-ddbc5f35dcd6	BOILERMAKER CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.324+02	2025-12-19 17:14:04.324+02
89e44464-f95c-4466-9338-643054bc4121	DGZ079	\N	CLAYTON	MANDIZHA	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	\N	473805b6-6074-4904-859a-ddbc5f35dcd6	BOILERMAKER CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.326+02	2025-12-19 17:14:04.326+02
f2854d0f-0590-4bf8-8eb9-481cba6d6af0	DP072	\N	GIBSON	MANJONDA	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	\N	f77450bc-bed8-4292-90c1-225dd294861b	FABRICATION FOREMAN	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.328+02	2025-12-19 17:14:04.328+02
607b4cf1-4888-480c-9609-6fdf0d47297d	DGZ017	\N	ARTASHASTAH	NGWENYA	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	\N	83d22ab8-2995-4468-b372-08c5cfeabd79	PLUMBER CLASS 2	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.33+02	2025-12-19 17:14:04.33+02
d3423b09-b805-4abc-9a37-61c4329774aa	DGZ028	\N	MUNASHE	MUTODZA	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	\N	66b16ec3-19b0-42f6-baa9-b24ccc553415	RIGGER CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.332+02	2025-12-19 17:14:04.332+02
84586743-1e5a-40e0-bd0d-094c31b4b3eb	DGZ029	\N	REUBEN	TAGA-DAGA	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	\N	473805b6-6074-4904-859a-ddbc5f35dcd6	BOILERMAKER CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.333+02	2025-12-19 17:14:04.333+02
84d46a9c-e5f0-4970-82f1-7454920b1834	DGZ084	\N	AARON	MANDIGORA	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	\N	28fcfb02-74be-4afb-9b85-6fffe3ce141d	PLUMBER CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.336+02	2025-12-19 17:14:04.336+02
38f9d8a7-a0b5-4c5b-850a-ae404615d935	DP174	\N	EMMANUEL	NJANJENI	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	\N	66b16ec3-19b0-42f6-baa9-b24ccc553415	RIGGER CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.338+02	2025-12-19 17:14:04.338+02
202f67ae-5c69-410a-918e-5f1c638aa3c1	DP201	\N	JOHN	HANHART	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	\N	dd50a4d5-172a-4351-843d-875c1dd1e800	TRANSPORT & SERVICES MANAGER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.34+02	2025-12-19 17:14:04.34+02
6debc9b3-7c59-4538-9b4d-acfb0f216891	DP244	\N	ENOCK	MHARIWA	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	\N	3638a67b-8280-4dfc-afed-1acb1d310aa7	TRANSPORT AND SERVICES CHARGE HAND	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.341+02	2025-12-19 17:14:04.341+02
3da6f097-a24a-4dc6-8832-a5555bc98e5b	DP297	\N	KOROFATI	JEREMIAH	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	\N	83d22ab8-2995-4468-b372-08c5cfeabd79	PLUMBER CLASS 2	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.343+02	2025-12-19 17:14:04.343+02
b4b6f279-42d2-43b4-8f49-5bf29d1cbd2b	DP298	\N	WALTER	MHEMBERE	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	\N	83d22ab8-2995-4468-b372-08c5cfeabd79	PLUMBER CLASS 2	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.345+02	2025-12-19 17:14:04.345+02
65d05865-1876-48c7-beea-f345cf0a2ce9	DP300	\N	PROSPER	JIM	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	\N	2e26ad94-49dc-4a7d-bab4-e053d2756496	AUTO ELECTRICIAN CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.346+02	2025-12-19 17:14:04.346+02
6ca9539c-3872-4152-8a67-f9c41ca1f2a1	DP301	\N	VICTOR	NYAMUROWA	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	\N	3ee503b5-6b8c-49c7-99c0-4f8d04a4803f	DIESEL PLANT FITTER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.348+02	2025-12-19 17:14:04.348+02
2894a1f8-f079-4d6c-ac21-21084de8993a	DP322	\N	KARL	TEMBO	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	\N	66b16ec3-19b0-42f6-baa9-b24ccc553415	RIGGER CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.349+02	2025-12-19 17:14:04.349+02
1b81359f-2c59-4b61-b8be-3838021df8ae	DP323	\N	KASSAN	GUNDA	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	\N	66b16ec3-19b0-42f6-baa9-b24ccc553415	RIGGER CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.351+02	2025-12-19 17:14:04.351+02
4cf618db-1d06-4429-adf1-bce7b7cecd0c	DP283	\N	SAMUEL	MAGOMO	\N	\N	4cc15b4d-688d-40bb-9974-1b8340594027	\N	8000ab74-d123-45b5-a8a3-e97e0732a263	SHEQ GRADUATE TRAINEE	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.539+02	2025-12-19 17:14:04.539+02
7e5f9a57-6af5-4bb9-839c-431beda0ce72	DP354	\N	PETER	NYONI	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	\N	2e26ad94-49dc-4a7d-bab4-e053d2756496	AUTO ELECTRICIAN CLASS 1	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.353+02	2025-12-19 17:14:04.353+02
6ee4140b-f175-4a9f-8535-79f7e5d2f005	DP363	\N	TANAKA	MTEKI	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	\N	3ee503b5-6b8c-49c7-99c0-4f8d04a4803f	DIESEL PLANT FITTER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.355+02	2025-12-19 17:14:04.355+02
3dbafee7-d1e5-4d5e-b23b-80d8e260903c	DP212	\N	TINASHE	SAUNGWEME	\N	\N	29d8843a-cc16-40e0-9b42-c07ff46e5688	\N	48ab8cd4-ee70-477e-80db-7b775d72402a	CIVIL ENGINEER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.356+02	2025-12-19 17:14:04.356+02
72dea5fb-7511-4532-8043-6148151c2c61	DP305	\N	TAFADZWA	USHE	\N	\N	29d8843a-cc16-40e0-9b42-c07ff46e5688	\N	753f2068-f1c8-4a71-bab1-b5a625157ba9	CIVIL TECHNICIAN TSF	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.358+02	2025-12-19 17:14:04.358+02
586e2726-5275-465c-ac7e-4150b1e3b472	DP156	\N	OLIVER SIMBA	CHUMA	\N	\N	8da1877a-6619-40d7-bd19-073b5458ebba	\N	82fb52ee-e32e-4bf2-849d-7cd80d087b50	MINING ENGINEER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.361+02	2025-12-19 17:14:04.361+02
01a2ea83-42a8-4e65-8e18-486e9d0d10e9	DP159	\N	DESMOND	CHAWIRA	\N	\N	8da1877a-6619-40d7-bd19-073b5458ebba	\N	d1b4a120-b662-41cd-8f4b-ec2591e4e30d	SENIOR MINING ENGINEER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.363+02	2025-12-19 17:14:04.363+02
e946cb9d-a46a-4a27-96af-1f5b2bc4b82f	DP165	\N	TAWEDZEGWA	MAZANA	\N	\N	8da1877a-6619-40d7-bd19-073b5458ebba	\N	9ba7d7d4-6714-451c-a843-c3527358885e	SENIOR PIT SUPERINTENDENT	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.365+02	2025-12-19 17:14:04.365+02
4ea5a54d-b2ba-49d4-b31b-874133d192c9	DP178	\N	STANLEY	NCUBE	\N	\N	8da1877a-6619-40d7-bd19-073b5458ebba	\N	ee752732-04ae-4b2c-9018-a7c7062b4998	PIT SUPERINTENDENT	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.367+02	2025-12-19 17:14:04.367+02
dd598f43-b3fa-482c-9cab-a3538df9108b	DP234	\N	COBURN	KATANDA	\N	\N	8da1877a-6619-40d7-bd19-073b5458ebba	\N	7674d439-fa55-45d9-a3dd-8597dac44bfa	MINING MANAGER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.369+02	2025-12-19 17:14:04.369+02
387b23e7-0a78-4342-bc5f-3a05e3a17d28	DP274	\N	RYAN	MASONA	\N	\N	8da1877a-6619-40d7-bd19-073b5458ebba	\N	76ecf0ea-e6ed-4def-b656-19536260eb07	JUNIOR PIT SUPERINTENDENT	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.37+02	2025-12-19 17:14:04.37+02
a2932fa5-282f-4b8c-a240-45f0a9931866	DP359	\N	ELAINE	ZENGENI	\N	\N	7f81cf21-8c79-49de-ad6a-1a196327c1d5	\N	bd631535-40ee-4f70-bc90-2b1d5639a352	EXPLORATION GEOLOGICAL TECHNICIAN	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.372+02	2025-12-19 17:14:04.372+02
1093df4c-1f90-4245-8677-c0d3e7e184e9	DP360	\N	LUCKSTONE	SAUNGWEME	\N	\N	7f81cf21-8c79-49de-ad6a-1a196327c1d5	\N	8a7386bc-905d-4970-8258-3230d1ac22cf	EXPLORATION PROJECT MANAGER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.374+02	2025-12-19 17:14:04.374+02
41f80a94-c9c0-422f-baaa-66fe982beb6c	DP361	\N	TINASHE	MUDZINGWA	\N	\N	7f81cf21-8c79-49de-ad6a-1a196327c1d5	\N	4096d053-e939-474f-b6ec-c2f5bc9c3532	EXPLORATION GEOLOGIST	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.375+02	2025-12-19 17:14:04.375+02
1dbe057e-2397-4fcc-9087-4002a09a3420	DP117	\N	NYASHA	GEREMA	\N	\N	7f81cf21-8c79-49de-ad6a-1a196327c1d5	\N	34a6290c-2a71-429c-a556-9c3935d2b4aa	DATABASE ADMINISTRATOR	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.377+02	2025-12-19 17:14:04.377+02
1323627c-fa66-4d80-aeaf-ab99be008f5b	DP163	\N	WISDOM	LESAYA	\N	\N	7f81cf21-8c79-49de-ad6a-1a196327c1d5	\N	772c0efb-14d0-462b-9c69-dbea7b789633	GEOLOGICAL TECHNICIAN	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.379+02	2025-12-19 17:14:04.379+02
ec6bdcc0-1b50-4b2d-8926-7a1d597f8f3f	DP181	\N	BENEFIT	MUONEKA	\N	\N	7f81cf21-8c79-49de-ad6a-1a196327c1d5	\N	e37e84a9-d30b-4fc2-b5ca-853d876bb239	RESIDENT GEOLOGIST	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.382+02	2025-12-19 17:14:04.382+02
05f1bc08-8083-46a3-8601-6d8891725e00	DP186	\N	TATENDA	PORE	\N	\N	7f81cf21-8c79-49de-ad6a-1a196327c1d5	\N	20731258-8d4c-41ff-a7ab-63882c328a1c	JUNIOR GEOLOGIST	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.383+02	2025-12-19 17:14:04.383+02
049f8e96-e3ef-49af-8c2a-e0edda5e4350	DP235	\N	MARTIN	MATEVEKE	\N	\N	7f81cf21-8c79-49de-ad6a-1a196327c1d5	\N	40483db0-f87c-4e04-851a-85d63a7e546c	GEOLOGIST	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.385+02	2025-12-19 17:14:04.385+02
fe47a5ce-6979-4e6c-981a-3fd02f11c927	DP265	\N	KUDAKWASHE	CHAKAWA	\N	\N	7f81cf21-8c79-49de-ad6a-1a196327c1d5	\N	772c0efb-14d0-462b-9c69-dbea7b789633	GEOLOGICAL TECHNICIAN	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.387+02	2025-12-19 17:14:04.387+02
d96aea13-5a13-47fc-ad4e-ef1db2b1d06e	DP139	\N	GUNUKA LUZIBO	LULA	\N	\N	cf37624f-11f1-4612-aa9e-111dcdc3b2c0	\N	6c3cb82f-cfd4-48fa-93c6-a4284ed71bbf	GEOTECHNICAL ENGINEERING TECHNICIAN	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.389+02	2025-12-19 17:14:04.389+02
4b4c2738-a137-4a25-aac0-12e4c77bf6bd	DP158	\N	TAKUDZWA	GUNYANJA	\N	\N	cf37624f-11f1-4612-aa9e-111dcdc3b2c0	\N	6c3cb82f-cfd4-48fa-93c6-a4284ed71bbf	GEOTECHNICAL ENGINEERING TECHNICIAN	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.391+02	2025-12-19 17:14:04.391+02
6c1375f0-29fc-4892-af94-f3315204eab5	DP306	\N	PARDON	NYAMANDE	\N	\N	cf37624f-11f1-4612-aa9e-111dcdc3b2c0	\N	ace78bfb-8d30-482f-9114-6baa4bd9bfbe	GEOTECHNICAL ENGINEER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.393+02	2025-12-19 17:14:04.393+02
2cd8ffa7-b78b-4ae9-9579-8e1177e9b223	DP110	\N	TINASHE	NEMADIRE	\N	\N	e5bcca7e-5880-43ad-a183-7835512e1f6b	\N	be34b207-cd6d-450a-91cd-0e0e0cf82c9e	MINE PLANNING SUPERINTENDENT	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.395+02	2025-12-19 17:14:04.395+02
31a43238-9775-4f1d-9005-51b896621806	DP128	\N	MICHAEL	ZVARAYA	\N	\N	e5bcca7e-5880-43ad-a183-7835512e1f6b	\N	8a5e18ab-f2ab-455b-8bcb-5f0a6df3d749	MINING TECHNICAL SERVICES MANAGER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.397+02	2025-12-19 17:14:04.397+02
8b413996-320a-4a3f-bad3-035d14de3061	DP157	\N	TINASHE	TARWIREI	\N	\N	e5bcca7e-5880-43ad-a183-7835512e1f6b	\N	7d100cce-0b5d-4629-86a8-cd2bf4a370e0	JUNIOR MINE PLANNING ENGINEER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.4+02	2025-12-19 17:14:04.4+02
feec1697-f37c-46f4-925c-4971087e1032	DP219	\N	ROBERT	NYIRENDA	\N	\N	e5bcca7e-5880-43ad-a183-7835512e1f6b	\N	a794a693-2531-4f0d-89b8-63cd737a1e58	MINE PLANNING ENGINEER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.402+02	2025-12-19 17:14:04.402+02
5f188b89-08eb-4369-8aee-e9a7be7b5c71	DP097	\N	MZAMO	MKANDLA	\N	\N	e817b4e7-1b12-4bd7-a770-e1d3a430259e	\N	bed5e940-c208-4343-9dca-e088ef8c466a	SURVEYOR	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.404+02	2025-12-19 17:14:04.404+02
34c7b805-924d-45e8-ac05-4cbd3c8f6425	DP100	\N	COLLETTE	NGULUBE	\N	\N	e817b4e7-1b12-4bd7-a770-e1d3a430259e	\N	f3bc96df-d68d-4f32-8ed5-d7dd064c403e	CHIEF SURVEYOR	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.406+02	2025-12-19 17:14:04.406+02
9e534b3d-7237-4876-901b-5147700e2512	DP215	\N	GAMUCHIRAI	MUJAJATI	\N	\N	e817b4e7-1b12-4bd7-a770-e1d3a430259e	\N	bed5e940-c208-4343-9dca-e088ef8c466a	SURVEYOR	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.408+02	2025-12-19 17:14:04.408+02
e9bd03fd-7827-4363-a39f-f3555c114760	DP266	\N	HILARY	MUSHONGA	\N	\N	e817b4e7-1b12-4bd7-a770-e1d3a430259e	\N	01488653-7583-4526-8359-447b1772af23	SENIOR SURVEYOR	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.41+02	2025-12-19 17:14:04.41+02
610e8406-89eb-4d62-9d4a-08dd2f8df40d	DGZ090	\N	TSEPO	NOKO	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	6b914ffd-13b2-478b-b007-8577c6096015	METALLURGICAL TECHNICIAN	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.412+02	2025-12-19 17:14:04.412+02
e0416ea0-db84-4967-abd3-60a3554e143f	DP251	\N	BRIDGET	NGIRANDI	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	6b914ffd-13b2-478b-b007-8577c6096015	METALLURGICAL TECHNICIAN	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.415+02	2025-12-19 17:14:04.415+02
aa6d4ac0-f730-4492-9b64-f10213265f95	DP131	\N	VICTOR	CHIKEREMA	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	c124386f-8a67-46a3-8939-bff2308e6f82	PLANT PRODUCTION SUPERINTENDENT	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.418+02	2025-12-19 17:14:04.418+02
a77df8f3-259d-427f-8824-086c9ea9b88a	DP136	\N	STEWARD	SITHOLE	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	5d363712-af0d-4d6e-869d-bce6d9159b27	METALLURGICAL SUPERINTENDENT	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.421+02	2025-12-19 17:14:04.421+02
80b6aa7a-a372-4fba-b3e4-894947209d25	DP137	\N	GERALDINE	CHIBAMU	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	f5e97574-4ab2-4fb8-b540-786314bb7976	PROCESS CONTROL SUPERVISOR	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.423+02	2025-12-19 17:14:04.423+02
df64965a-73e9-4369-918f-be8bbdc5e14c	DP161	\N	THELMA	NYABANGA	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	0f4321e0-83d4-4d73-a8c5-804b00433d06	METALLURGICAL ENGINEER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.425+02	2025-12-19 17:14:04.425+02
18ac5b4b-e45f-4231-a7bb-333e7e0c2f9f	DP188	\N	ABGAIL	CHIORESO	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	9f5757f4-89ed-487a-8799-d026ef7e7bb1	PROCESS CONTROL METALLURGIST	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.427+02	2025-12-19 17:14:04.427+02
5385aaef-489c-4d8c-bb06-fe4e3e496fa7	DP228	\N	RUTENDO	MAGANGA	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	9fd73f69-9f06-4dba-a3a7-2f2147f834e1	PLANT LABORATORY METALLURGIST	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.43+02	2025-12-19 17:14:04.43+02
8ddeba27-2a5b-43ea-93d1-4bf4ea8486c7	DP240	\N	MICHELLE	MAPOSAH	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	9f5757f4-89ed-487a-8799-d026ef7e7bb1	PROCESS CONTROL METALLURGIST	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.431+02	2025-12-19 17:14:04.431+02
fa077116-e5bd-4a09-9252-4452e65c2169	DP307	\N	PRINCESS	NCUBE	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	9f5757f4-89ed-487a-8799-d026ef7e7bb1	PROCESS CONTROL METALLURGIST	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.433+02	2025-12-19 17:14:04.433+02
4f455d20-8a62-409c-9cee-66e070e4211c	DP332	\N	BUKHOSI	DUBE	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	d5dcb3ab-88e0-4fd1-949a-7d80b6e0b5e0	PLANT LABORATORY TECHNICIAN	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.435+02	2025-12-19 17:14:04.435+02
ac936d60-92ad-4913-b43f-943eb0b04ae8	DP334	\N	LOUIS	KHOWA	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	59dc021d-aa1c-4dd7-ae0e-9e08f717004f	PROCESSING SYSTEMS ANALYST	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.437+02	2025-12-19 17:14:04.437+02
f2d65813-950d-418d-8d7b-64d211fbb951	DP335	\N	RUMBIDZAI	MAZVIYO	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	45a7db59-65ca-4cc7-911a-dc976b1a8f4f	PLANT LABORATORY MET TECHNICIAN	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.44+02	2025-12-19 17:14:04.44+02
23b93b3c-d61a-4414-85a1-d2494d3e1a4c	DP125	\N	ROBERT	JERE	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	f57daf78-dd5e-4196-9d16-f8212dd8ac20	PLANT SUPERVISOR	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.442+02	2025-12-19 17:14:04.442+02
4d8ef48d-1135-4cde-805e-b9d53c0db3f1	DP134	\N	TANYARADZWA	ZINHU	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	f57daf78-dd5e-4196-9d16-f8212dd8ac20	PLANT SUPERVISOR	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.444+02	2025-12-19 17:14:04.444+02
679bb053-9f7f-4016-a30e-32c886c54601	DP187	\N	LIONEL	MUREVERWI	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	f57daf78-dd5e-4196-9d16-f8212dd8ac20	PLANT SUPERVISOR	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.446+02	2025-12-19 17:14:04.446+02
90e00226-a87c-41f5-977e-de82f568c000	DP320	\N	OBERT	MUNODAWAFA	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	7f864d52-4645-4eaa-a9e3-8dec862076e8	PROCESSING MANAGER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.449+02	2025-12-19 17:14:04.449+02
167c27f0-cf9b-4232-baed-84c87b1339d5	DP339	\N	VISION	MUSAPINGURA	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	0f4321e0-83d4-4d73-a8c5-804b00433d06	METALLURGICAL ENGINEER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.451+02	2025-12-19 17:14:04.451+02
849d4ace-adf5-4780-b398-302128604f3b	DP129	\N	MALVIN	KHUPE	\N	\N	29d8843a-cc16-40e0-9b42-c07ff46e5688	\N	39cf317b-4201-4cc7-9635-c90a4fc4b763	TSF SUPERVISOR	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.453+02	2025-12-19 17:14:04.453+02
23b8aa82-19c0-4993-9b76-2cfc8c8cc667	DP252	\N	JOHANNES	MANDIZIBA	\N	\N	29d8843a-cc16-40e0-9b42-c07ff46e5688	\N	39cf317b-4201-4cc7-9635-c90a4fc4b763	TSF SUPERVISOR	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.455+02	2025-12-19 17:14:04.455+02
62bfc13c-b73f-4e79-aed3-4635d8a286bb	DP299	\N	CHAKANETSA	MAHACHI	\N	\N	29d8843a-cc16-40e0-9b42-c07ff46e5688	\N	fcc707bc-1204-4892-8437-a47f2ba847ae	PLANT MANAGER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.457+02	2025-12-19 17:14:04.457+02
9d28accf-16cf-4602-bf48-fe4eefe448de	DP108	\N	NELSON	BANDA	\N	\N	23b94bcb-d4cb-4576-a70a-174851a8f282	\N	c1b64a0f-82b5-4a54-ad35-51f8b5d7e375	GENERAL MANAGER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.46+02	2025-12-19 17:14:04.46+02
c29b3c62-5039-409a-8605-ca5df24a5194	DP284	\N	GIVEMORE	SICHAKALA	\N	\N	23b94bcb-d4cb-4576-a70a-174851a8f282	\N	d3af50da-a56a-4457-9217-46d87808dc6a	SHARED SERVICES MANAGER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.462+02	2025-12-19 17:14:04.462+02
19c9282d-83b9-4408-be0f-edb547ec0703	DP325	\N	ANYWAY	SIATULUBE	\N	\N	7031df98-7552-43c8-88e5-6854455cea55	\N	4f780184-fdeb-4de6-b818-eda82c716f6c	BOME HOUSES CONSTRUCTION SUPERVISOR	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.464+02	2025-12-19 17:14:04.464+02
7e03b0b9-79d6-4876-8b10-f5da40d9e54b	DP169	\N	VIMBAI	MADADANGOMA	\N	\N	23b94bcb-d4cb-4576-a70a-174851a8f282	\N	167450c7-eccf-4351-b41f-ee8b769b5fb7	BUSINESS IMPROVEMENT MANAGER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.466+02	2025-12-19 17:14:04.466+02
31de6826-adbe-460f-b68f-508da9595fa6	DP243	\N	JOHN	MAYUNI	\N	\N	23b94bcb-d4cb-4576-a70a-174851a8f282	\N	0c6b2f60-42e9-4042-9d4c-3e47a609d6ea	BUSINESS IMPROVEMENT OFFICER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.468+02	2025-12-19 17:14:04.468+02
e09f2701-f123-48c7-bc76-5dccfa4abc6c	DP065	\N	LINDELWE	KHUMALO	\N	\N	7031df98-7552-43c8-88e5-6854455cea55	\N	ca4cc286-e221-4c67-bca0-196202b69b61	COMMUNITY RELATIONS COORDINATOR	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.47+02	2025-12-19 17:14:04.47+02
817093d3-f398-4d67-9639-fd61a529eaa5	DP241	\N	RUGARE	HUNGOIDZA	\N	\N	7031df98-7552-43c8-88e5-6854455cea55	\N	25e57d68-0f8f-4bc1-9dbd-000495e0926f	ASSISTANT COMMUNITY RELATIONS OFFICER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.471+02	2025-12-19 17:14:04.471+02
2f0cb5b5-256b-4789-98e5-edae806f97c9	DP258	\N	DAPHNE	TAVENHAVE	\N	\N	7031df98-7552-43c8-88e5-6854455cea55	\N	bda4a506-102a-4e0d-a5d0-e794167b10d2	COMMUNITY RELATIONS OFFICER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.473+02	2025-12-19 17:14:04.473+02
9274c65b-ed28-428b-8608-14d23f17d3ea	DP040	\N	ALEXIO	SAWAYA	\N	\N	103e0c5e-d36d-48b2-b098-47de7729ba8f	\N	c8845d4e-ca5e-4967-8ec6-75af82802658	BOOK KEEPER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.475+02	2025-12-19 17:14:04.475+02
98008ceb-cbd5-46a9-8058-152ec767ddf9	DP087	\N	DUNCAN	KUHAMBA	\N	\N	103e0c5e-d36d-48b2-b098-47de7729ba8f	\N	7e7c2178-3ef9-4ba9-b3d0-f5cff3b28dbd	FINANCE & ADMINISTRATION MANAGER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.477+02	2025-12-19 17:14:04.477+02
72a64cda-2c75-472b-be76-787d869ada90	DP191	\N	ELLEN	CHANDAVENGERWA	\N	\N	103e0c5e-d36d-48b2-b098-47de7729ba8f	\N	0f6b0a7f-a473-427b-a56c-45f63872f008	ASSISTANT ACCOUNTANT	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.479+02	2025-12-19 17:14:04.479+02
30127ae2-167c-4ae8-aa9e-67419981c7ac	DP145	\N	TINAGO	TINAGO	\N	\N	470d6cb5-10ee-4b1e-a0f8-58252261f803	\N	cc70d045-6acb-40b1-aa98-4fffdd81342e	HUMAN CAPITAL SUPPORT SERVICES MANAGER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.481+02	2025-12-19 17:14:04.481+02
f92e8582-146e-4d69-b39e-a0ddbf2a5f1b	DP164	\N	BENJAMIN	MUWAIRI	\N	\N	470d6cb5-10ee-4b1e-a0f8-58252261f803	\N	1f0e9ada-0461-47b2-a5a1-14b903f31d17	HR ADMINISTRATOR	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.482+02	2025-12-19 17:14:04.482+02
71ed8a0b-f7a5-442a-b056-3d1c453b244b	DP216	\N	CARLTON	SAMURIWO	\N	\N	470d6cb5-10ee-4b1e-a0f8-58252261f803	\N	2b31ca7c-1fdb-426b-91df-fb0ab92b2fa3	HUMAN RESOURCES ASSISTANT	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.484+02	2025-12-19 17:14:04.484+02
39e80901-de03-4c80-8d08-e43a5792767f	DP333	\N	FREEDMORE	MAGOMANA	\N	\N	470d6cb5-10ee-4b1e-a0f8-58252261f803	\N	a4daf649-bcdd-4eae-817b-ecdf5bcf4b1d	HUMAN RESOURCES SUPERINTENDENT	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.486+02	2025-12-19 17:14:04.486+02
359e7897-b9a7-4103-ab48-807a6f440093	DP130	\N	NEIL	MUKWEBWA	\N	\N	3c553423-c8f3-4c6e-97ac-1436febda45b	\N	3245a7c2-1eb6-47d5-9168-aab4dac4ca7c	IT OFFICER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.488+02	2025-12-19 17:14:04.488+02
7d9fc107-64bd-4946-96fa-eb836f7fb0a8	DP140	\N	POUND	GWINYAI	\N	\N	3c553423-c8f3-4c6e-97ac-1436febda45b	\N	269c5d98-2c94-4232-80cc-fdb5d9f1b38d	IT SUPERINTENDENT	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.49+02	2025-12-19 17:14:04.49+02
03ebca57-acf4-4308-b37a-cd144783b590	DP329	\N	FELIX	DANDAVARE	\N	\N	3c553423-c8f3-4c6e-97ac-1436febda45b	\N	38674253-dcdc-4a56-919b-3deee794302c	SUPPORT TECHNICIAN	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.491+02	2025-12-19 17:14:04.491+02
07e3954b-6d5e-4a34-8d60-6e3b475b6d51	DP336	\N	DERICK	CHINAKIDZWA	\N	\N	081b1436-35c4-4de6-9b1d-be6fa0f299f8	\N	b476001b-0681-4af5-93e2-f5d2c290146b	ISSUING OFFICER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.493+02	2025-12-19 17:14:04.493+02
eea118a9-33d0-4f23-9a76-364d8a1bc197	DP242	\N	ASHLEY	CHIGARIRO	\N	\N	081b1436-35c4-4de6-9b1d-be6fa0f299f8	\N	8b46ccf5-5bad-429c-8215-ff536f72bddc	ASSISTANT EXPEDITER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.495+02	2025-12-19 17:14:04.495+02
ec856e46-8255-4ac0-822c-8f745b4a764a	DP312	\N	SIMBARASHE	MATANDARE	\N	\N	b9a21c3e-de70-4b23-a411-9f9dd5a6f155	\N	9c331b90-6645-4cb3-8dc7-a9ae2d6c421f	SECURITY OFFICER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.497+02	2025-12-19 17:14:04.497+02
828d684e-e932-46ee-ac30-dc20c4295bba	DP313	\N	JANUARY	WERENGANI	\N	\N	b9a21c3e-de70-4b23-a411-9f9dd5a6f155	\N	61c36377-55d0-4945-95d7-b3da61fb5555	SECURITY MANAGER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.499+02	2025-12-19 17:14:04.499+02
c1e426a1-6b74-413d-9a48-642a54164cfb	DP084	\N	NYASHA	MUNYENYIWA	\N	\N	15c0a970-e3b0-49af-9b35-7e86c1ba2388	\N	782370ec-cc02-40a7-9852-13da277b9e1f	SHE MANAGER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.501+02	2025-12-19 17:14:04.501+02
604d1c7f-08d5-4ad7-93a3-f63d97da316e	DP148	\N	ELVIS	ZHOU	\N	\N	15c0a970-e3b0-49af-9b35-7e86c1ba2388	\N	59d97275-06b4-44c2-b131-7aa765e87ee5	SHE OFFICER PLANT	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.502+02	2025-12-19 17:14:04.502+02
954f68fd-f201-43c3-9305-8c1135c46762	DP162	\N	REST	BASU	\N	\N	15c0a970-e3b0-49af-9b35-7e86c1ba2388	\N	830ec95a-68b7-4bcb-9497-69e640a8b5a2	ENVIRONMENTAL & HYGIENE OFFICER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.504+02	2025-12-19 17:14:04.504+02
19f1acc4-4b38-476e-9f2b-826bbcf185fd	DP193	\N	NYASHA	MURIMBA	\N	\N	15c0a970-e3b0-49af-9b35-7e86c1ba2388	\N	ed6a777e-77ae-474f-b600-5b4bd034930f	SHE ADMINISTRATOR	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.506+02	2025-12-19 17:14:04.506+02
c8e3f0eb-8f80-49c6-a241-5bb3895a4537	DP247	\N	TINASHE	MBOFANA	\N	\N	15c0a970-e3b0-49af-9b35-7e86c1ba2388	\N	d0603abe-d66a-42db-bdbb-285192093746	SHEQ SUPERINTENDENT	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.508+02	2025-12-19 17:14:04.508+02
f23450c0-c4bd-49c6-adae-b9ec53bd3ccb	DP249	\N	TAWANDA	MARAMBANYIKA	\N	\N	15c0a970-e3b0-49af-9b35-7e86c1ba2388	\N	07cdec81-ff4a-478f-b855-6be97b3c5ec9	SHEQ AND ENVIRONMENTAL OFFICER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.509+02	2025-12-19 17:14:04.509+02
38c6ba27-a494-434f-9d26-312cbcec6a0d	DP253	\N	TAFADZWA	TAHWA	\N	\N	15c0a970-e3b0-49af-9b35-7e86c1ba2388	\N	2e4d8c6f-d895-499e-8751-6f21aebb9c7b	SHE ASSISTANT	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.511+02	2025-12-19 17:14:04.511+02
012d2696-28c3-4ea6-8039-1b43b544fe2e	DP053	\N	OWEN	CHIRIMANI	\N	\N	205bdc41-4872-4a0d-9e68-295e41da3803	\N	e9ee7e23-fe6f-4c0a-8f16-5fd036170968	DRIVER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.514+02	2025-12-19 17:14:04.514+02
feabf42f-900f-4513-addd-3578f5ef1847	DP085	\N	ITAI	MUDUKA	\N	\N	205bdc41-4872-4a0d-9e68-295e41da3803	\N	1e987b0b-be4e-4e67-b6db-5cf93a649777	CHEF	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.515+02	2025-12-19 17:14:04.515+02
ef87fd97-f6e1-4404-a853-6e555c5fe15d	DP150	\N	ARTLEY	SENZERE	\N	\N	205bdc41-4872-4a0d-9e68-295e41da3803	\N	dbb825cc-b06b-4ec8-adfa-e5ee21250a17	SITE COORDINATION OFFICER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.517+02	2025-12-19 17:14:04.517+02
5f16826a-b0e2-4a62-a8dd-b01792b0144c	DP328	\N	SIMON	YONA	\N	\N	205bdc41-4872-4a0d-9e68-295e41da3803	\N	4a19d06c-875e-4b2b-bbfb-5967126a6877	CATERING AND HOUSEKEEPING SUPERVISOR	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.519+02	2025-12-19 17:14:04.519+02
6786d8b3-e7b7-4bc8-a1c8-fcfc2aac1c0a	DP041	\N	IGNATIOUS	WAMBE	\N	\N	081b1436-35c4-4de6-9b1d-be6fa0f299f8	\N	6048b90b-2406-4235-b7ed-e3689c40b7ab	STORES CONTROLLER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.52+02	2025-12-19 17:14:04.52+02
e638a9c1-53d7-4e3d-83f9-b905c93b6017	DP091	\N	TENDAI	DENGENDE	\N	\N	081b1436-35c4-4de6-9b1d-be6fa0f299f8	\N	b36cd659-62c9-4a8c-b7c9-7065e1df5f38	STORES MANAGER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.522+02	2025-12-19 17:14:04.522+02
cb24d8cd-e7dc-41c8-8799-ab7e8157c603	DP172	\N	MUNYARADZI	MADONDO	\N	\N	081b1436-35c4-4de6-9b1d-be6fa0f299f8	\N	b476001b-0681-4af5-93e2-f5d2c290146b	ISSUING OFFICER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.524+02	2025-12-19 17:14:04.524+02
6df30475-8134-45a2-a722-00c1b45f9e7a	DP173	\N	VIOLET	HAMANDISHE	\N	\N	081b1436-35c4-4de6-9b1d-be6fa0f299f8	\N	6048b90b-2406-4235-b7ed-e3689c40b7ab	STORES CONTROLLER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.525+02	2025-12-19 17:14:04.525+02
945d0ad0-b73a-4f8d-baa4-564fed0d2378	DP246	\N	MESULI	MOYO	\N	\N	081b1436-35c4-4de6-9b1d-be6fa0f299f8	\N	a5f8dd74-41c2-4b32-ab7a-bd18d2e9e995	RECEIVING OFFICER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.527+02	2025-12-19 17:14:04.527+02
ac3da5b3-8205-42a6-8dc8-99a88d6a61cf	DP267	\N	RAYNARD	BALENI	\N	\N	081b1436-35c4-4de6-9b1d-be6fa0f299f8	\N	757a5842-e014-40d0-a4d9-420593ba2203	PYLOG ADMINISTRATOR	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.528+02	2025-12-19 17:14:04.528+02
f4655cc7-4834-4db5-94f0-b39518e244b5	DP233	\N	GAYNOR	MUSADEMBA	\N	\N	4cc15b4d-688d-40bb-9974-1b8340594027	\N	f31ee213-5bee-455f-b0da-75a5b5a90ed7	GRADUATE TRAINEE	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.53+02	2025-12-19 17:14:04.53+02
29f1a3b1-78ab-434e-a8e4-be1fb0baf215	DP238	\N	IRVIN	CHAPUNZA	\N	\N	4cc15b4d-688d-40bb-9974-1b8340594027	\N	cc4afa59-abd9-4c39-bf18-35ef4aa6b4b1	GRADUATE TRAINEE METALLURGY	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.532+02	2025-12-19 17:14:04.532+02
bba787ad-0e81-4c53-8edc-0743040c2bde	DP239	\N	SOLOMON	MAZARA	\N	\N	4cc15b4d-688d-40bb-9974-1b8340594027	\N	cc4afa59-abd9-4c39-bf18-35ef4aa6b4b1	GRADUATE TRAINEE METALLURGY	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.533+02	2025-12-19 17:14:04.533+02
1e51daf4-3910-4b39-82a7-fa2acfaebed7	DP273	\N	TAFADZWA	MAGADU	\N	\N	4cc15b4d-688d-40bb-9974-1b8340594027	\N	f31ee213-5bee-455f-b0da-75a5b5a90ed7	GRADUATE TRAINEE	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.535+02	2025-12-19 17:14:04.535+02
921930b4-eda1-4840-b7c8-f04ab80b0df6	DP278	\N	LISA	GOMBEDZA	\N	\N	4cc15b4d-688d-40bb-9974-1b8340594027	\N	942a920c-8a08-49cd-a175-60a4855111c5	ASSAY LABORATORY TECHNICIAN TRAINEE	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.537+02	2025-12-19 17:14:04.537+02
2aeb8121-5e54-4e84-aca8-a44b6f4fab63	DP288	\N	SAVIOUS	MUKOVA	\N	\N	4cc15b4d-688d-40bb-9974-1b8340594027	\N	4cd91aec-a1f1-4b00-80f8-66416c72717f	GRADUATE TRAINEE MINING	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.54+02	2025-12-19 17:14:04.54+02
d2acad81-4537-4921-9c62-247d7ea28cfa	DP289	\N	TERRENCE	DOBBIE	\N	\N	4cc15b4d-688d-40bb-9974-1b8340594027	\N	4cd91aec-a1f1-4b00-80f8-66416c72717f	GRADUATE TRAINEE MINING	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.542+02	2025-12-19 17:14:04.542+02
1f9e7ef0-aed7-4ace-8920-990f86d50959	DP290	\N	CHANTELLE	MAVURU	\N	\N	4cc15b4d-688d-40bb-9974-1b8340594027	\N	4cd91aec-a1f1-4b00-80f8-66416c72717f	GRADUATE TRAINEE MINING	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.544+02	2025-12-19 17:14:04.544+02
db406f9c-811d-46fe-a771-76e260bf7575	DP291	\N	ANDY	SAUNYAMA	\N	\N	4cc15b4d-688d-40bb-9974-1b8340594027	\N	cc4afa59-abd9-4c39-bf18-35ef4aa6b4b1	GRADUATE TRAINEE METALLURGY	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.545+02	2025-12-19 17:14:04.545+02
f29e5b96-9857-4656-8b97-7cac28465531	DP292	\N	TANAKA	NYIKA	\N	\N	4cc15b4d-688d-40bb-9974-1b8340594027	\N	cc4afa59-abd9-4c39-bf18-35ef4aa6b4b1	GRADUATE TRAINEE METALLURGY	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.547+02	2025-12-19 17:14:04.547+02
60a6ff08-5aa9-4f43-84b9-ffbe2c47ae7d	DP293	\N	PRIMROSE	MLAMBO	\N	\N	4cc15b4d-688d-40bb-9974-1b8340594027	\N	cc4afa59-abd9-4c39-bf18-35ef4aa6b4b1	GRADUATE TRAINEE METALLURGY	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.549+02	2025-12-19 17:14:04.549+02
f4468f13-4ed8-4d85-8751-d8a4433514ea	DP311	\N	NYASHA	MOYO	\N	\N	4cc15b4d-688d-40bb-9974-1b8340594027	\N	eefac5ca-d2f2-4a19-ade8-6848b95a9f00	TRAINING AND DEVELOPMENT OFFICER	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.55+02	2025-12-19 17:14:04.55+02
06a4facd-c0fd-469b-be48-218d9c2c68e9	DP324	\N	ZIVANAI	MUPAMBA	\N	\N	4cc15b4d-688d-40bb-9974-1b8340594027	\N	a5f0df00-b4a0-4cc3-89c4-143712f765f5	GT MECHANICAL ENGINEERING	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.552+02	2025-12-19 17:14:04.552+02
68e14b6d-0ea1-4f94-94bc-fb9c4d896d5d	DP352	\N	TONDERAI	TSORAI	\N	\N	4cc15b4d-688d-40bb-9974-1b8340594027	\N	8ebb4023-a20c-4b89-8248-1fcd44c878df	GRADUATE TRAINEE ACCOUNTING	SALARIED	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.554+02	2025-12-19 17:14:04.554+02
75ccac65-1d8e-4d41-bb23-6a0443733ba4	DG223	\N	INNOCENT	NYAWANGA	\N	\N	0b8f0ba2-cfd6-42d8-8b58-d81b33ff2b71	\N	fb208f5e-b1a9-4006-a746-265068c47374	WAREHOUSE ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.555+02	2025-12-19 17:14:04.555+02
7c3687f1-c0f9-4bad-8847-5c977d61e521	DG224	\N	LOVEMORE	NGOROSHA	\N	\N	0b8f0ba2-cfd6-42d8-8b58-d81b33ff2b71	\N	fb208f5e-b1a9-4006-a746-265068c47374	WAREHOUSE ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.557+02	2025-12-19 17:14:04.557+02
dc78b8b3-a619-4084-8fa2-d20040cff0f6	DG478	\N	PHIBION	NYAHOKO	\N	\N	0b8f0ba2-cfd6-42d8-8b58-d81b33ff2b71	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.558+02	2025-12-19 17:14:04.558+02
ac9803ff-8e76-40c6-838e-4edaca3b4a81	DG627	\N	MIRIAM	SANGARE	\N	\N	0b8f0ba2-cfd6-42d8-8b58-d81b33ff2b71	\N	4eb474b7-6544-4de3-9bd2-be5efcbfa799	OFFICE CLEANER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.56+02	2025-12-19 17:14:04.56+02
e0b9fd22-ca9d-4daa-9d52-00d3900db57f	DG006	\N	GEORGE	CHATAMBUDZIKI	\N	\N	eac91c5a-45aa-48e6-9da0-e8d6abc4ee40	\N	bf21784f-0a93-4e67-87b3-3661cf03d53f	LABORATORY ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.562+02	2025-12-19 17:14:04.562+02
40fe5fe9-3826-4362-8659-421734c4d123	DG014	\N	GANIZANI	DIRE	\N	\N	eac91c5a-45aa-48e6-9da0-e8d6abc4ee40	\N	bf21784f-0a93-4e67-87b3-3661cf03d53f	LABORATORY ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.563+02	2025-12-19 17:14:04.563+02
40c42ce8-3420-4adf-aa43-0cb5cb013835	DG015	\N	NEVER	GREYA	\N	\N	eac91c5a-45aa-48e6-9da0-e8d6abc4ee40	\N	bf21784f-0a93-4e67-87b3-3661cf03d53f	LABORATORY ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.565+02	2025-12-19 17:14:04.565+02
4ac45491-b4c2-499e-a302-c47fd0d02cfd	DG045	\N	MICHAEL	GANDIWA	\N	\N	eac91c5a-45aa-48e6-9da0-e8d6abc4ee40	\N	bf21784f-0a93-4e67-87b3-3661cf03d53f	LABORATORY ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.567+02	2025-12-19 17:14:04.567+02
a3cb867f-8c6a-4990-ac86-6809611ace7e	DG077	\N	TADIWANASHE	CHIKUNI	\N	\N	eac91c5a-45aa-48e6-9da0-e8d6abc4ee40	\N	bf21784f-0a93-4e67-87b3-3661cf03d53f	LABORATORY ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.568+02	2025-12-19 17:14:04.568+02
66d090af-3fb1-4e47-8512-f6c3f72b9bf1	DG080	\N	RAPHAEL	CHANDIWANA	\N	\N	eac91c5a-45aa-48e6-9da0-e8d6abc4ee40	\N	bf21784f-0a93-4e67-87b3-3661cf03d53f	LABORATORY ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.57+02	2025-12-19 17:14:04.57+02
ec0f614c-d366-4e5d-9e84-cc633a4386e6	DG081	\N	TAPIWA	MASIKINYE	\N	\N	eac91c5a-45aa-48e6-9da0-e8d6abc4ee40	\N	bf21784f-0a93-4e67-87b3-3661cf03d53f	LABORATORY ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.571+02	2025-12-19 17:14:04.571+02
140f017c-85f6-4dca-8c3c-e5fd54f641e3	DG149	\N	DOCTOR	KADZIMA	\N	\N	eac91c5a-45aa-48e6-9da0-e8d6abc4ee40	\N	bf21784f-0a93-4e67-87b3-3661cf03d53f	LABORATORY ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.573+02	2025-12-19 17:14:04.573+02
b62550b1-0250-4e6d-9505-f731e8861b92	DG157	\N	CURRENCY	CHIGODHO	\N	\N	eac91c5a-45aa-48e6-9da0-e8d6abc4ee40	\N	bf21784f-0a93-4e67-87b3-3661cf03d53f	LABORATORY ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.576+02	2025-12-19 17:14:04.576+02
769bb986-7f2b-4c9a-bda6-d32814f27ec6	DG249	\N	TONDERAI	NYANKUNI	\N	\N	eac91c5a-45aa-48e6-9da0-e8d6abc4ee40	\N	bf21784f-0a93-4e67-87b3-3661cf03d53f	LABORATORY ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.578+02	2025-12-19 17:14:04.578+02
b79a9f20-5d8f-4307-8178-54d2871df42b	DG250	\N	MALVERN	MASIYA	\N	\N	eac91c5a-45aa-48e6-9da0-e8d6abc4ee40	\N	bf21784f-0a93-4e67-87b3-3661cf03d53f	LABORATORY ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.581+02	2025-12-19 17:14:04.581+02
8334a7ed-ee3b-4db9-a0d4-fc9d8f6efe4e	DG251	\N	TALENT	CHIORESE	\N	\N	eac91c5a-45aa-48e6-9da0-e8d6abc4ee40	\N	bf21784f-0a93-4e67-87b3-3661cf03d53f	LABORATORY ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.582+02	2025-12-19 17:14:04.582+02
9cee31dc-5c0a-4152-b780-0884fd8b8e94	DG252	\N	NGONI	CHIBANDA	\N	\N	eac91c5a-45aa-48e6-9da0-e8d6abc4ee40	\N	bf21784f-0a93-4e67-87b3-3661cf03d53f	LABORATORY ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.584+02	2025-12-19 17:14:04.584+02
278c5c31-a956-467f-bbd7-d2e610ac5387	DG253	\N	TRUST	VENGERE	\N	\N	eac91c5a-45aa-48e6-9da0-e8d6abc4ee40	\N	bf21784f-0a93-4e67-87b3-3661cf03d53f	LABORATORY ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.586+02	2025-12-19 17:14:04.586+02
e45e87e6-135e-4e40-b892-d753149b0ad2	DG254	\N	RACCELL	BOX	\N	\N	eac91c5a-45aa-48e6-9da0-e8d6abc4ee40	\N	bf21784f-0a93-4e67-87b3-3661cf03d53f	LABORATORY ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.589+02	2025-12-19 17:14:04.589+02
c1a525c9-0313-45d3-9402-60d7e3b94bc7	DG255	\N	PALMER	MAKOSA	\N	\N	eac91c5a-45aa-48e6-9da0-e8d6abc4ee40	\N	bf21784f-0a93-4e67-87b3-3661cf03d53f	LABORATORY ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.591+02	2025-12-19 17:14:04.591+02
606eb482-b059-4bfd-9bba-5a10eb91f6d8	DG277	\N	CLINTON MUNYARADZI	MARISA	\N	\N	eac91c5a-45aa-48e6-9da0-e8d6abc4ee40	\N	bf21784f-0a93-4e67-87b3-3661cf03d53f	LABORATORY ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.593+02	2025-12-19 17:14:04.593+02
1d83079b-72b3-4a3f-974a-f44ece6109ee	DG284	\N	TAFADZWA	CHIKOVO	\N	\N	eac91c5a-45aa-48e6-9da0-e8d6abc4ee40	\N	bf21784f-0a93-4e67-87b3-3661cf03d53f	LABORATORY ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.594+02	2025-12-19 17:14:04.594+02
de2f9749-549a-4cfe-be9e-b524217cf8fd	DG297	\N	TAKUNDA	KAVENDA	\N	\N	eac91c5a-45aa-48e6-9da0-e8d6abc4ee40	\N	bf21784f-0a93-4e67-87b3-3661cf03d53f	LABORATORY ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.596+02	2025-12-19 17:14:04.596+02
505120c6-22ea-4440-9fce-24e66809148f	DG301	\N	STANLEY	MARIMO	\N	\N	eac91c5a-45aa-48e6-9da0-e8d6abc4ee40	\N	bf21784f-0a93-4e67-87b3-3661cf03d53f	LABORATORY ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.598+02	2025-12-19 17:14:04.598+02
b59bb9c7-a9d6-4e4a-9769-a6a3a971c937	DG357	\N	CHENGETAI	CHIRIMANI	\N	\N	eac91c5a-45aa-48e6-9da0-e8d6abc4ee40	\N	bf21784f-0a93-4e67-87b3-3661cf03d53f	LABORATORY ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.599+02	2025-12-19 17:14:04.599+02
22ed5f38-5321-4ac1-b8af-a7519eee5b7d	DG358	\N	LINCORN	MARATA	\N	\N	eac91c5a-45aa-48e6-9da0-e8d6abc4ee40	\N	bf21784f-0a93-4e67-87b3-3661cf03d53f	LABORATORY ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.601+02	2025-12-19 17:14:04.601+02
80f5e5d5-dfe2-4990-bc4d-c0c98754fdb5	DG428	\N	MICHAEL	NHAMOYEBONDE	\N	\N	eac91c5a-45aa-48e6-9da0-e8d6abc4ee40	\N	bf21784f-0a93-4e67-87b3-3661cf03d53f	LABORATORY ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.602+02	2025-12-19 17:14:04.602+02
eee4d41b-4b84-4644-a9e8-99d1603b6856	DG600	\N	PROSPER	MUKUMBAREZA	\N	\N	eac91c5a-45aa-48e6-9da0-e8d6abc4ee40	\N	bf21784f-0a93-4e67-87b3-3661cf03d53f	LABORATORY ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.604+02	2025-12-19 17:14:04.604+02
bc345130-42d6-4cc7-9cb4-bfb1d3005a27	DG059	\N	ELWED	NHEMACHENA	\N	\N	5e6a2ece-98b5-48fb-9e0d-d6df5aea47a0	\N	1a1b6dda-05ea-4abb-9a40-69024df632c2	BUILDER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.605+02	2025-12-19 17:14:04.605+02
87d45f87-bbf1-4c59-98f6-a8c71be98342	DG147	\N	EZRA	MUFENGI	\N	\N	5e6a2ece-98b5-48fb-9e0d-d6df5aea47a0	\N	e80932e6-1da0-44a1-ba67-4b1fb3fbf035	SEMI- SKILLED BUILDER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.607+02	2025-12-19 17:14:04.607+02
078f224f-7844-4e22-b5e3-0eb6140ac932	DG019	\N	FRANK	MADZVITI	\N	\N	b0d59194-4032-43c3-a0ca-fedcbf0fa95b	\N	c73b3448-778b-4b92-bc9c-f414d6410874	ELECTRICIAN ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.61+02	2025-12-19 17:14:04.61+02
e6baf871-56b8-4b54-af8b-cbfe537beae2	DG034	\N	COLLINS	NYARIRI	\N	\N	b0d59194-4032-43c3-a0ca-fedcbf0fa95b	\N	7e77cd4f-2f12-4b87-900d-e6c44be39a35	SEMI- SKILLED ELECTRICIAN	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.612+02	2025-12-19 17:14:04.612+02
1a7ae6b6-6af6-445f-bd3d-fbd261c2eee8	DG104	\N	ERNEST	KAMANGE	\N	\N	b0d59194-4032-43c3-a0ca-fedcbf0fa95b	\N	c73b3448-778b-4b92-bc9c-f414d6410874	ELECTRICIAN ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.615+02	2025-12-19 17:14:04.615+02
ab9919d5-17de-45f8-b817-32640aa150c6	DG105	\N	TENDEKAI	KAZUNGA	\N	\N	b0d59194-4032-43c3-a0ca-fedcbf0fa95b	\N	c73b3448-778b-4b92-bc9c-f414d6410874	ELECTRICIAN ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.618+02	2025-12-19 17:14:04.618+02
21bcfc80-b716-48eb-95aa-ff6a31965f96	DG106	\N	PERFORMANCE	KASINGANETE	\N	\N	b0d59194-4032-43c3-a0ca-fedcbf0fa95b	\N	c73b3448-778b-4b92-bc9c-f414d6410874	ELECTRICIAN ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.62+02	2025-12-19 17:14:04.62+02
6deeed45-2fff-4028-b797-f9f0ca809e28	DG317	\N	GODFREY	MAJONGA	\N	\N	b0d59194-4032-43c3-a0ca-fedcbf0fa95b	\N	6425480b-759e-45ff-bbcd-e73fcf77763e	ELECTRICAL ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.622+02	2025-12-19 17:14:04.622+02
36c3dd93-83ce-4775-b6ce-f6255c96e64c	DG379	\N	TINEI	PAGAN'A	\N	\N	b0d59194-4032-43c3-a0ca-fedcbf0fa95b	\N	6425480b-759e-45ff-bbcd-e73fcf77763e	ELECTRICAL ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.624+02	2025-12-19 17:14:04.624+02
c5409fcc-05f9-49c9-870d-b5c32a08b5b2	DG578	\N	TAKUNDA	NGWENYA	\N	\N	b0d59194-4032-43c3-a0ca-fedcbf0fa95b	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.625+02	2025-12-19 17:14:04.625+02
1913a546-a4c6-420d-9961-a69aef6f98f4	DG581	\N	SYDNEY	CHIMANIKIRE	\N	\N	b0d59194-4032-43c3-a0ca-fedcbf0fa95b	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.627+02	2025-12-19 17:14:04.627+02
3b746adc-67be-45b6-aaff-b9d845e1619a	DG587	\N	MEKELANI	CHAPONDA	\N	\N	b0d59194-4032-43c3-a0ca-fedcbf0fa95b	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.628+02	2025-12-19 17:14:04.628+02
0dfd2763-0907-4434-963d-7ddc5fa5e5de	DG605	\N	STUDY	HOVE	\N	\N	b0d59194-4032-43c3-a0ca-fedcbf0fa95b	\N	228ea372-bd80-41c2-9dd0-01617daef6ff	INSTRUMENTS TECHS ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.63+02	2025-12-19 17:14:04.63+02
8f4d2592-aae5-4bae-be98-8af09e2cd112	DG644	\N	KUDZAI	MAPOPE	\N	\N	b0d59194-4032-43c3-a0ca-fedcbf0fa95b	\N	015d98ff-de23-4a41-a20b-311c6b84db63	INSTRUMENTATIONS ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.632+02	2025-12-19 17:14:04.632+02
c2464d60-ff81-4839-92c1-66d6df5e3caf	DG647	\N	REGIS	RAVU	\N	\N	b0d59194-4032-43c3-a0ca-fedcbf0fa95b	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.633+02	2025-12-19 17:14:04.633+02
e480b690-76d9-40ea-938e-fa1bc8d22de7	DG650	\N	JOHN	DENHERE	\N	\N	b0d59194-4032-43c3-a0ca-fedcbf0fa95b	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.635+02	2025-12-19 17:14:04.635+02
52715e29-b7ef-4ff7-aca1-6d38935e3499	DG654	\N	TANYARADZWA	GWETA	\N	\N	b0d59194-4032-43c3-a0ca-fedcbf0fa95b	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.636+02	2025-12-19 17:14:04.636+02
cb3010e7-6b7a-42dc-b2ac-c1117be0fc0a	DG655	\N	NOMORE	MAZVAZVA	\N	\N	b0d59194-4032-43c3-a0ca-fedcbf0fa95b	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.638+02	2025-12-19 17:14:04.638+02
5e158c73-ddbd-43df-abfa-4f3efbae4546	DG707	\N	CHARMAINE	CHIANGWA	\N	\N	b0d59194-4032-43c3-a0ca-fedcbf0fa95b	\N	015d98ff-de23-4a41-a20b-311c6b84db63	INSTRUMENTATIONS ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.64+02	2025-12-19 17:14:04.64+02
6652981e-6bd0-45d2-a7ca-272175b793f7	DG732	\N	NGOCHO	TYRMORE	\N	\N	b0d59194-4032-43c3-a0ca-fedcbf0fa95b	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.644+02	2025-12-19 17:14:04.644+02
4d6654d9-8873-43a6-a6b4-c711651ed464	DG739	\N	TROUBLE	CHAPONDA	\N	\N	b0d59194-4032-43c3-a0ca-fedcbf0fa95b	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.646+02	2025-12-19 17:14:04.646+02
5d0dd822-bf6b-4aab-902f-0143bef3d621	DG029	\N	BRIGHTON	MUZVONDIWA	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	\N	1a51ebd5-e5c7-4471-a0bd-cf56fe2ed791	FITTERS ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.648+02	2025-12-19 17:14:04.648+02
ae8bcdbf-b046-414e-b68b-96414ba130a2	DG124	\N	TINOTENDA	JINYA	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	\N	382d3303-066c-4502-bb0a-6a58a287ea5f	FITTER ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.651+02	2025-12-19 17:14:04.651+02
82a4ecdb-2c8c-4946-9556-4dbef6559ecd	DG192	\N	SIMON	MUNENGIWA	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	\N	1a51ebd5-e5c7-4471-a0bd-cf56fe2ed791	FITTERS ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.653+02	2025-12-19 17:14:04.653+02
f4d882a4-9cdd-467a-ba0b-b3afd8ba829b	DG242	\N	CARLOS	KANYERA	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	\N	382d3303-066c-4502-bb0a-6a58a287ea5f	FITTER ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.655+02	2025-12-19 17:14:04.655+02
3b14876f-b1a3-497a-b007-15f83ad46eba	DG349	\N	DAVID	MUGUTI	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	\N	382d3303-066c-4502-bb0a-6a58a287ea5f	FITTER ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.657+02	2025-12-19 17:14:04.657+02
cdff86fb-47e0-4d08-8c17-f9dd98984627	DG359	\N	ADMIRE	MACHACHA	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	\N	382d3303-066c-4502-bb0a-6a58a287ea5f	FITTER ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.659+02	2025-12-19 17:14:04.659+02
01b35651-eb99-458d-9fe7-4a9279f553ed	DG392	\N	EDMORE	CHIMANGA	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	\N	382d3303-066c-4502-bb0a-6a58a287ea5f	FITTER ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.661+02	2025-12-19 17:14:04.661+02
3a8ffc3c-7343-4cc8-b0d2-8682f6b219c7	DG604	\N	NYASHA	MATOROFA	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	\N	382d3303-066c-4502-bb0a-6a58a287ea5f	FITTER ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.662+02	2025-12-19 17:14:04.662+02
256048a8-1839-4a83-9301-29cabac6d5cd	DG614	\N	ENOCK	CHIGWADA	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	\N	e2471c1e-3e57-4759-9f90-ddd2601015bd	PLUMBER ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.664+02	2025-12-19 17:14:04.664+02
c155e600-cb8b-460c-9c5a-a6db354fb416	DG706	\N	NGONIDZASHE	MAPFUMO	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	\N	1a51ebd5-e5c7-4471-a0bd-cf56fe2ed791	FITTERS ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.666+02	2025-12-19 17:14:04.666+02
2b628e16-4474-4524-bcec-aabb246173ce	DG335	\N	TAFADZWA DYLAN	BANGANYIKA	\N	\N	e5bcca7e-5880-43ad-a183-7835512e1f6b	\N	6e7e2e25-edca-43dc-a349-b91b6dede17b	PLANNING CLERK	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.667+02	2025-12-19 17:14:04.667+02
3b47fc65-cd7b-4639-9a2e-474dfb9c0910	DG479	\N	SHARON	ZHOU	\N	\N	e5bcca7e-5880-43ad-a183-7835512e1f6b	\N	6e7e2e25-edca-43dc-a349-b91b6dede17b	PLANNING CLERK	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.669+02	2025-12-19 17:14:04.669+02
7060a880-cadc-4dfa-b361-ed5ebed6f4c0	DG535	\N	HANDSON	GWAMATSA	\N	\N	e5bcca7e-5880-43ad-a183-7835512e1f6b	\N	801e6043-456c-41d6-984a-b32607a20065	CLASS 2 DRIVER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.671+02	2025-12-19 17:14:04.671+02
25b145c7-0b3f-45a8-851a-e388d022de05	DG603	\N	TAKESURE	NYANDORO	\N	\N	e5bcca7e-5880-43ad-a183-7835512e1f6b	\N	623a72b2-17e8-4985-8159-b8f845556c57	STANDBY DRIVER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.673+02	2025-12-19 17:14:04.673+02
c43e6e28-4edc-4da9-bc35-07c9d455e65d	DG021	\N	DOUGLAS	MARUNGISA	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	\N	5d2686f8-48cd-4fe6-b4ba-8c88f03608fb	BOILERMAKER ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.674+02	2025-12-19 17:14:04.674+02
5adfc321-173b-4f06-9146-49f6670fb2d0	DG022	\N	MUCHENJE	MARUNGISA	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	\N	5d2686f8-48cd-4fe6-b4ba-8c88f03608fb	BOILERMAKER ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.676+02	2025-12-19 17:14:04.676+02
bb56e8c4-9981-4f17-b9b6-7241e9804f3f	DG051	\N	LAMECK	MUROYIWA	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	\N	98b6af80-d520-4120-9ee2-309f847ecbdb	SCAFFOLDER ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.678+02	2025-12-19 17:14:04.678+02
4f96cbd1-9db0-42f4-bba2-4b52d924de8f	DG064	\N	AUSTIN	KAJARI	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	\N	8d78a9ea-dc73-45a1-a9fa-8b4c16d0c3bf	SEMI SKILLED PAINTER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.68+02	2025-12-19 17:14:04.68+02
319f1c18-1241-46cb-a774-622cd2d22196	DG066	\N	TAPFUMANEI	TANDI	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	\N	406f9783-fa62-4370-970c-06c0f395d3ca	SCAFFOLDER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.681+02	2025-12-19 17:14:04.681+02
e287c10c-162a-4ccd-8dea-3064487fd05e	DG176	\N	PADDINGTON F	MAODZWA	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	\N	5d2686f8-48cd-4fe6-b4ba-8c88f03608fb	BOILERMAKER ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.683+02	2025-12-19 17:14:04.683+02
c05ae499-3e23-4c07-82b6-06540b3cc4ed	DG177	\N	EMMANUEL	GOROMONZI	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	\N	5d2686f8-48cd-4fe6-b4ba-8c88f03608fb	BOILERMAKER ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.685+02	2025-12-19 17:14:04.685+02
bf2d859d-e5f2-437a-98ae-644eba438b59	DG182	\N	CLEMENCE	CHITIMA	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	\N	5d2686f8-48cd-4fe6-b4ba-8c88f03608fb	BOILERMAKER ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.686+02	2025-12-19 17:14:04.686+02
38585f7f-2fd7-497e-bc74-09684a1cc4bb	DG246	\N	SHINGIRAI	MASUKU	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	\N	5d2686f8-48cd-4fe6-b4ba-8c88f03608fb	BOILERMAKER ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.688+02	2025-12-19 17:14:04.688+02
637ad40f-4a87-4a44-b522-6942660e9daa	DG303	\N	AARON	MAPIRA	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	\N	406f9783-fa62-4370-970c-06c0f395d3ca	SCAFFOLDER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.689+02	2025-12-19 17:14:04.689+02
586bf49b-eedc-406f-8a3c-7c7f39772a67	DG351	\N	STEADY	MUDAVANHU	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	\N	5d2686f8-48cd-4fe6-b4ba-8c88f03608fb	BOILERMAKER ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.692+02	2025-12-19 17:14:04.692+02
397e1f0e-cb28-4068-9e96-5a5cfe93845c	DG495	\N	THEMBINKOSI	NGWENYA	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	\N	88f28cfc-d8e6-499f-8e27-5d8424b3831e	BOILERMAKERS ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.695+02	2025-12-19 17:14:04.695+02
a51da253-7810-44d6-b0d1-7854cf8496fa	DG529	\N	GEORGE	MHONYERA	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	\N	8d78a9ea-dc73-45a1-a9fa-8b4c16d0c3bf	SEMI SKILLED PAINTER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.696+02	2025-12-19 17:14:04.696+02
44a0faf3-126a-42c5-8a30-249d05c2a870	DG594	\N	TACHIONA	SIBANDA	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	\N	382d3303-066c-4502-bb0a-6a58a287ea5f	FITTER ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.698+02	2025-12-19 17:14:04.698+02
27916311-c759-4e3b-8ee1-d8d3dacfd6c2	DG656	\N	TAKUNDA	CHITUMBURA	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	\N	5d2686f8-48cd-4fe6-b4ba-8c88f03608fb	BOILERMAKER ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.701+02	2025-12-19 17:14:04.701+02
c31bdc5c-274a-445e-a528-50f23c3e51c0	DG008	\N	DAVID	CHIGODHO	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	\N	afe4c3df-c7c5-42e9-bdd0-6cf23bb68958	TRACTOR DRIVER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.703+02	2025-12-19 17:14:04.703+02
65ab06ff-4d03-46cc-b703-d6400c2b3a92	DG024	\N	ROBERT	MUTIKITSI	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	\N	77851f26-72cb-445b-8552-c28c62fe2f8d	UD TRUCK DRIVER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.706+02	2025-12-19 17:14:04.706+02
3c87f1fa-237b-4331-84e6-8a57f60cf4d9	DG041	\N	GOOD	MAZHAMBE	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	\N	05314472-c9e1-4b2e-8b53-6af4cffcf710	TLB OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.71+02	2025-12-19 17:14:04.71+02
bc36e3e9-1971-4fbe-b535-a3e9b7c31cc3	DG047	\N	THOMAS	LAVU	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	\N	2e532a4a-0a20-485a-a72b-86ea0e8eef36	EXCAVATOR OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.713+02	2025-12-19 17:14:04.713+02
e5b92297-d827-4629-90cb-c23a116a7678	DG087	\N	FRIDAY	MKANDAWIRE	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	\N	cee35ef0-78a5-4c48-aa9c-e9530483b63e	FRONT END LOADER OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.715+02	2025-12-19 17:14:04.715+02
c2e05563-415d-49d5-bb9c-79fde29c77a2	DG096	\N	TANAKA	ZVENYIKA	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	\N	2458be29-797b-4653-9714-ede46d5ef8f8	CRANE OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.718+02	2025-12-19 17:14:04.718+02
168dbb3e-62d7-4cb9-b373-118be3c90c35	DG100	\N	WORKERS	CHAKASARA	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	\N	afe4c3df-c7c5-42e9-bdd0-6cf23bb68958	TRACTOR DRIVER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.72+02	2025-12-19 17:14:04.72+02
505ee1ef-fc17-44d4-80e2-bb6ec0036a9b	DG101	\N	PASSMORE	CEPHAS	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	\N	dbb4bb7f-5495-4342-8996-dece10210e0c	ASSISTANT PLUMBER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.722+02	2025-12-19 17:14:04.722+02
9da32d4f-c82c-4915-9647-c360443c534f	DG108	\N	BRIGHTON	NGOMA	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	\N	cee35ef0-78a5-4c48-aa9c-e9530483b63e	FRONT END LOADER OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.724+02	2025-12-19 17:14:04.724+02
b008cbf7-b7c7-43f5-a89c-7dc36d3ec504	DG125	\N	PAUL	CHATIZA	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	\N	91059145-3a29-4a46-96b3-1fbbde75ebba	PLUMBERS ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.725+02	2025-12-19 17:14:04.725+02
5bc30276-2b4c-4807-9b57-ebe05ec11453	DG218	\N	TINEI	KAMAMBO	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	\N	8f31e725-99eb-439a-8427-e4e0ea285946	BUS DRIVER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.727+02	2025-12-19 17:14:04.727+02
619d84ae-7ae9-44d6-9139-545892316ba1	DG243	\N	PISIRAI	NDIRA	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	\N	91059145-3a29-4a46-96b3-1fbbde75ebba	PLUMBERS ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.729+02	2025-12-19 17:14:04.729+02
03aa0fdc-823c-49e5-8672-ec24d4948a64	DG312	\N	BRENDO	MUGOCHI	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	\N	6bbbab01-3639-43aa-9944-3738712d955b	WORKSHOP ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.73+02	2025-12-19 17:14:04.73+02
771dfb99-4eb3-4ff6-9489-2bf771b136fa	DG334	\N	MAZVITA	MAPETESE	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	\N	8f31e725-99eb-439a-8427-e4e0ea285946	BUS DRIVER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.733+02	2025-12-19 17:14:04.733+02
ebc8757c-68fe-4fb1-b73f-c41c4af17b77	DG405	\N	ISAAC	MARIKANO	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	\N	2e532a4a-0a20-485a-a72b-86ea0e8eef36	EXCAVATOR OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.735+02	2025-12-19 17:14:04.735+02
6eed7861-d640-4cdc-82b4-8f7d47a08c5e	DG446	\N	KUDAKWASHE	NTALA	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	\N	2458be29-797b-4653-9714-ede46d5ef8f8	CRANE OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.736+02	2025-12-19 17:14:04.736+02
a5d7d772-5f91-4359-9de6-986129564346	DG447	\N	PAIMETY	MUROMBO	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	\N	2458be29-797b-4653-9714-ede46d5ef8f8	CRANE OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.738+02	2025-12-19 17:14:04.738+02
aee968ae-4350-467e-b47d-5734ef4ea296	DG490	\N	BHEU	PHIRI	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	\N	562ff024-8913-43ef-85eb-086432c1a2da	UD CLASS 2 DRIVER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.74+02	2025-12-19 17:14:04.74+02
03446adf-1824-4684-88e1-762a73c36309	DG491	\N	SAMUAEL	KATSANDE	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	\N	623a72b2-17e8-4985-8159-b8f845556c57	STANDBY DRIVER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.741+02	2025-12-19 17:14:04.741+02
fae04bee-77b9-4a2c-91bd-5f4ba1dd9565	DG526	\N	LEONARD	CHIPENGO	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	\N	8f31e725-99eb-439a-8427-e4e0ea285946	BUS DRIVER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.743+02	2025-12-19 17:14:04.743+02
ba541cc9-1c69-43c8-bde3-cd1b86b96490	DG534	\N	STANLEY	CHIWOCHA	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	\N	bd2c7343-7ff8-4a85-84ef-c3ed45bbed1c	MOBIL CRANE OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.744+02	2025-12-19 17:14:04.744+02
8ac55dcf-d764-4723-b7c8-17b65ed18763	DG538	\N	ONISMO	MUZHONA	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	\N	aa7f82b8-074f-4d93-b2af-d64a9eb25632	SEMI SKILLED PLUMBER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.746+02	2025-12-19 17:14:04.746+02
5cf3f21c-8550-4c25-9e2b-4b8be197f047	DG547	\N	STEVEN	MUTWIRA	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	\N	8f31e725-99eb-439a-8427-e4e0ea285946	BUS DRIVER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.748+02	2025-12-19 17:14:04.748+02
f8507bc9-b329-4bce-b1db-9ba3b15f8687	DG548	\N	EVEREST	DZIMIRI	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	\N	8f31e725-99eb-439a-8427-e4e0ea285946	BUS DRIVER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.749+02	2025-12-19 17:14:04.749+02
a11e675f-e5aa-46aa-ae4e-bb37388eb5de	DG573	\N	EDMORE	MAJENGWA	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	\N	05314472-c9e1-4b2e-8b53-6af4cffcf710	TLB OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.751+02	2025-12-19 17:14:04.751+02
78d9d7da-460f-41a9-81bb-a1ed35fdcae6	DG574	\N	SIMBARASHE	ZISO	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	\N	13e2c170-2d59-4ce0-898b-1276225e2ac7	TELEHANDLER OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.753+02	2025-12-19 17:14:04.753+02
f273fc4a-be56-493a-9eb2-f66ec17ef3be	DG694	\N	MAVUTO	ZODZIWA	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	\N	8f31e725-99eb-439a-8427-e4e0ea285946	BUS DRIVER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.754+02	2025-12-19 17:14:04.754+02
2e4bb6a3-f7ed-4311-9dcf-f4c8110711ae	DG708	\N	TONDERAI	JIMU	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	\N	d76b2edf-84eb-4aa1-9b11-46347b11ebdc	FEL OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.756+02	2025-12-19 17:14:04.756+02
9ce98fe1-02f7-4427-81f4-5c4b62b209b0	DG719	\N	COURAGE	CHIFAMBA	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	\N	68a3a831-4113-4e07-9eeb-ade37db5ac81	WORKSHOP CLERK	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.757+02	2025-12-19 17:14:04.757+02
08dd3f16-3bb6-4834-8357-164132938963	DG736	\N	MARTIN	DZIMBANHETE	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	\N	f0a59a8c-4138-4519-adda-36d17e0b2775	CLASS 1 BUS DRIVER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.76+02	2025-12-19 17:14:04.76+02
1a31b963-ed70-40d0-965e-c01b484be534	DG737	\N	WISDOM	JAKACHIRA	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	\N	f0a59a8c-4138-4519-adda-36d17e0b2775	CLASS 1 BUS DRIVER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.762+02	2025-12-19 17:14:04.762+02
2ec6aa67-ec97-4aba-9a3c-a6e8fd8f91c6	DG738	\N	JONATHAN	NYABADZA	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	\N	f0a59a8c-4138-4519-adda-36d17e0b2775	CLASS 1 BUS DRIVER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.764+02	2025-12-19 17:14:04.764+02
a2be5a1f-f9a6-4e84-ac98-f0d3f65790ff	DG758	\N	DOUBT	GWESHE	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	\N	13e2c170-2d59-4ce0-898b-1276225e2ac7	TELEHANDLER OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.765+02	2025-12-19 17:14:04.765+02
26de1946-45cb-4389-a335-7f03e6df68c8	DG778	\N	STANLEY	MAHLENGEZANA	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	\N	2e532a4a-0a20-485a-a72b-86ea0e8eef36	EXCAVATOR OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.767+02	2025-12-19 17:14:04.767+02
379cffc5-921b-4546-afe7-d0aeb576cfb8	DG098	\N	MONEYWORK	KURUDZA	\N	\N	5e6a2ece-98b5-48fb-9e0d-d6df5aea47a0	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.769+02	2025-12-19 17:14:04.769+02
9c29bbd3-f657-403b-9eba-e8185a58ee1a	DG129	\N	WILBERT	MANHANGA	\N	\N	5e6a2ece-98b5-48fb-9e0d-d6df5aea47a0	\N	eac5cccd-4b69-45be-ab7d-f6b924539d5e	SEMI-SKILLED BUILDER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.77+02	2025-12-19 17:14:04.77+02
a086a57d-771c-48fa-8302-88b106042c24	DG145	\N	FARAI	KURUDZA	\N	\N	5e6a2ece-98b5-48fb-9e0d-d6df5aea47a0	\N	1a1b6dda-05ea-4abb-9a40-69024df632c2	BUILDER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.772+02	2025-12-19 17:14:04.772+02
6236d98d-2f77-4319-a739-7fa7cfbc71b0	DG159	\N	SIMBARASHE	CHIGODHO	\N	\N	5e6a2ece-98b5-48fb-9e0d-d6df5aea47a0	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.774+02	2025-12-19 17:14:04.774+02
97d3c530-25fe-45ae-a7ef-724beb855ea5	DG160	\N	MACDONALD	MUPUNGA	\N	\N	5e6a2ece-98b5-48fb-9e0d-d6df5aea47a0	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.775+02	2025-12-19 17:14:04.775+02
75c006b5-6c0b-4918-87c7-77ce03f02f62	DG258	\N	FIDELIS	MURINGAYI	\N	\N	5e6a2ece-98b5-48fb-9e0d-d6df5aea47a0	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.777+02	2025-12-19 17:14:04.777+02
7456ce47-92ec-498b-9425-7abd5bb9af48	DG261	\N	EPHRAIM	MBURUMA	\N	\N	5e6a2ece-98b5-48fb-9e0d-d6df5aea47a0	\N	eac5cccd-4b69-45be-ab7d-f6b924539d5e	SEMI-SKILLED BUILDER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.778+02	2025-12-19 17:14:04.778+02
56e4bb96-1751-42f4-85ec-70bdb8750609	DG263	\N	OBINISE	MARERWA	\N	\N	5e6a2ece-98b5-48fb-9e0d-d6df5aea47a0	\N	eac5cccd-4b69-45be-ab7d-f6b924539d5e	SEMI-SKILLED BUILDER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.78+02	2025-12-19 17:14:04.78+02
79299bd0-9e7e-43d5-890b-98346a3958a7	DG272	\N	GARIKAI	MUJERI	\N	\N	5e6a2ece-98b5-48fb-9e0d-d6df5aea47a0	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.782+02	2025-12-19 17:14:04.782+02
a49f2626-6a9d-4e1c-b975-0ec017a9a55c	DG275	\N	DOMINIC	RUNZIRA	\N	\N	5e6a2ece-98b5-48fb-9e0d-d6df5aea47a0	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.784+02	2025-12-19 17:14:04.784+02
f4836c78-d1ae-47c9-93b9-ce8203e29a13	DG292	\N	RAYMOND	JAIROS	\N	\N	5e6a2ece-98b5-48fb-9e0d-d6df5aea47a0	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.786+02	2025-12-19 17:14:04.786+02
d899e7ed-93d4-4199-915e-19b5d28f5ac6	DG294	\N	CRY	KAKORE	\N	\N	5e6a2ece-98b5-48fb-9e0d-d6df5aea47a0	\N	eac5cccd-4b69-45be-ab7d-f6b924539d5e	SEMI-SKILLED BUILDER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.787+02	2025-12-19 17:14:04.787+02
c845a7e6-5ce3-40a3-9996-62f81799aa58	DG318	\N	JOSHUA	WEBSTER	\N	\N	5e6a2ece-98b5-48fb-9e0d-d6df5aea47a0	\N	eac5cccd-4b69-45be-ab7d-f6b924539d5e	SEMI-SKILLED BUILDER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.789+02	2025-12-19 17:14:04.789+02
1c9fd14a-1fbd-4363-8d1c-497239c5aeb9	DG319	\N	MAZVANARA	FRANCIS	\N	\N	5e6a2ece-98b5-48fb-9e0d-d6df5aea47a0	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.79+02	2025-12-19 17:14:04.79+02
c01b8473-b8ec-47ed-b379-b52bf22579e0	DG325	\N	KENNY	FURAWU	\N	\N	5e6a2ece-98b5-48fb-9e0d-d6df5aea47a0	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.792+02	2025-12-19 17:14:04.792+02
b53d69f4-5755-49c8-8ab6-1a7beac70a7c	DG329	\N	TAFADZWA	MAGUSVI	\N	\N	5e6a2ece-98b5-48fb-9e0d-d6df5aea47a0	\N	739e4769-0ca7-41e7-9ab9-8debe3f4db8d	SEMI- SKILLED CARPENTER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.795+02	2025-12-19 17:14:04.795+02
336d7bff-d3c6-4295-8a38-a8bfea99e176	DG331	\N	ADMIRE	MUZAVA	\N	\N	5e6a2ece-98b5-48fb-9e0d-d6df5aea47a0	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.797+02	2025-12-19 17:14:04.797+02
60bae587-6b06-4a39-9c07-618844b52299	DG387	\N	HOWARD	CHAKUINGA	\N	\N	5e6a2ece-98b5-48fb-9e0d-d6df5aea47a0	\N	eac5cccd-4b69-45be-ab7d-f6b924539d5e	SEMI-SKILLED BUILDER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.798+02	2025-12-19 17:14:04.798+02
74e7bdc4-0e42-41e7-a3cc-05e00732f80a	DG398	\N	SIMBARASHE	THOM	\N	\N	5e6a2ece-98b5-48fb-9e0d-d6df5aea47a0	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.8+02	2025-12-19 17:14:04.8+02
7fd5f5ed-c31c-4146-9af5-d1e3c2ecdb44	DG406	\N	TIGHT	VARETA	\N	\N	5e6a2ece-98b5-48fb-9e0d-d6df5aea47a0	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.802+02	2025-12-19 17:14:04.802+02
2636b904-487f-4a0c-8825-d685b93ac91b	DG484	\N	CLEVER	NYAMAYARO	\N	\N	5e6a2ece-98b5-48fb-9e0d-d6df5aea47a0	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.803+02	2025-12-19 17:14:04.803+02
993ebc28-dff3-4165-8cf4-661cd7fb702d	DG487	\N	STANLEY	MUNYARADZI	\N	\N	5e6a2ece-98b5-48fb-9e0d-d6df5aea47a0	\N	1a1b6dda-05ea-4abb-9a40-69024df632c2	BUILDER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.805+02	2025-12-19 17:14:04.805+02
5372f0ff-63cc-4de0-8253-cf11c9beb240	DG504	\N	PROSPERITY	PFUPA	\N	\N	5e6a2ece-98b5-48fb-9e0d-d6df5aea47a0	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.807+02	2025-12-19 17:14:04.807+02
c6ae45c8-7e12-4ed2-bf63-9d83119882b2	DG507	\N	LOVEMORE	SIMUDZIRAYI	\N	\N	5e6a2ece-98b5-48fb-9e0d-d6df5aea47a0	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.81+02	2025-12-19 17:14:04.81+02
c997f4a2-c6d8-4813-aac5-b6417828d081	DG512	\N	VITALIS	CHIKOYA	\N	\N	5e6a2ece-98b5-48fb-9e0d-d6df5aea47a0	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.816+02	2025-12-19 17:14:04.816+02
d47b6b3a-90f1-4553-805d-4d975129510d	DG537	\N	NIGEL	CHIKOYA	\N	\N	5e6a2ece-98b5-48fb-9e0d-d6df5aea47a0	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.817+02	2025-12-19 17:14:04.817+02
ee72e367-74ae-48be-9867-5f906db37784	DG542	\N	EMETI	MBUNDURE	\N	\N	5e6a2ece-98b5-48fb-9e0d-d6df5aea47a0	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.82+02	2025-12-19 17:14:04.82+02
4196446e-f7a4-412f-9fa2-95495deb31f0	DG563	\N	PARTSON	CHIPENGO	\N	\N	5e6a2ece-98b5-48fb-9e0d-d6df5aea47a0	\N	e80932e6-1da0-44a1-ba67-4b1fb3fbf035	SEMI- SKILLED BUILDER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.822+02	2025-12-19 17:14:04.822+02
9793eaaa-8a11-4555-b602-d3b4e31a21c1	DG564	\N	IGNATIOUS	MAKAYI	\N	\N	5e6a2ece-98b5-48fb-9e0d-d6df5aea47a0	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.824+02	2025-12-19 17:14:04.824+02
42e82207-64b7-4935-bd32-4eb50e012288	DG613	\N	HARMONY	KAMBEWU	\N	\N	5e6a2ece-98b5-48fb-9e0d-d6df5aea47a0	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.826+02	2025-12-19 17:14:04.826+02
7cbace89-38d0-48d5-a419-62ef14ed34f7	DG659	\N	GIVEMORE	CHIYANGE	\N	\N	5e6a2ece-98b5-48fb-9e0d-d6df5aea47a0	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.828+02	2025-12-19 17:14:04.828+02
509d5b4b-d273-4368-bd31-92acc3c7b037	DG693	\N	RANGANAI	CHIDHAWU	\N	\N	5e6a2ece-98b5-48fb-9e0d-d6df5aea47a0	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.829+02	2025-12-19 17:14:04.829+02
d1ecd418-449d-48f9-9311-e8a91dbf905f	DG709	\N	JOSHUA	MUCHEMERANWA	\N	\N	5e6a2ece-98b5-48fb-9e0d-d6df5aea47a0	\N	c7accd3d-94f1-4533-87ff-26f728822da7	SCAFFOLDERS ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.831+02	2025-12-19 17:14:04.831+02
f40a14d9-9212-4f1d-b0b0-54eba4e3585d	DG710	\N	EVANS	MURONZI	\N	\N	5e6a2ece-98b5-48fb-9e0d-d6df5aea47a0	\N	\N	SEMI SKILLED BUILDER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.833+02	2025-12-19 17:14:04.833+02
f531e44a-5f88-49ac-8094-a95cb896ed8d	DG102	\N	RICHMORE	KADZIMA	\N	\N	29d8843a-cc16-40e0-9b42-c07ff46e5688	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.835+02	2025-12-19 17:14:04.835+02
0c1647a4-57a2-409e-904d-83ee469455eb	DG130	\N	ITAYI	KAZUNGA	\N	\N	29d8843a-cc16-40e0-9b42-c07ff46e5688	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.837+02	2025-12-19 17:14:04.837+02
b2f92cb3-80c7-4fb1-9636-a365ee334e33	DG154	\N	STANLEY	MANHANGA	\N	\N	29d8843a-cc16-40e0-9b42-c07ff46e5688	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.839+02	2025-12-19 17:14:04.839+02
5887c3b9-7acb-4200-bf28-fd337a343761	DG186	\N	COURAGE	MAHOVO	\N	\N	29d8843a-cc16-40e0-9b42-c07ff46e5688	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.84+02	2025-12-19 17:14:04.84+02
cd6978ef-4b34-498e-9692-4e63716499b4	DG193	\N	EFTON	MUSIWA	\N	\N	29d8843a-cc16-40e0-9b42-c07ff46e5688	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.842+02	2025-12-19 17:14:04.842+02
0e8cbb53-9b49-42b5-8812-8b6458a4f152	DG219	\N	CHAMUNORWA	MUZA	\N	\N	29d8843a-cc16-40e0-9b42-c07ff46e5688	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.844+02	2025-12-19 17:14:04.844+02
2cdd60a3-a5e1-4c56-a89c-363a0eccfbd0	DG226	\N	SIMON	NYAMUKWATURA	\N	\N	29d8843a-cc16-40e0-9b42-c07ff46e5688	\N	f71821d7-514b-4fb1-8f26-cd6417bc553d	TEAM LEADER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.845+02	2025-12-19 17:14:04.845+02
252bb028-0525-463c-9ef5-69ea941897e8	DG326	\N	OWEN	GANDIWA	\N	\N	29d8843a-cc16-40e0-9b42-c07ff46e5688	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.847+02	2025-12-19 17:14:04.847+02
4cea7008-5353-4d9e-bece-b40671b2cb5f	DG339	\N	PAUL	MAVHUNGA	\N	\N	29d8843a-cc16-40e0-9b42-c07ff46e5688	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.848+02	2025-12-19 17:14:04.848+02
105e3ec1-310e-4bad-8883-a0e83463bcec	DG347	\N	DYLLAN	KASEKE	\N	\N	29d8843a-cc16-40e0-9b42-c07ff46e5688	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.85+02	2025-12-19 17:14:04.85+02
22fcd740-fbf9-42b2-920e-894ae7d04b2c	DG380	\N	SIWASHIRO	MANYAMBA	\N	\N	29d8843a-cc16-40e0-9b42-c07ff46e5688	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.851+02	2025-12-19 17:14:04.851+02
062806f4-c4c2-4cc8-a296-0a988e0d63c7	DG383	\N	TRUST	MUSORA	\N	\N	29d8843a-cc16-40e0-9b42-c07ff46e5688	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.853+02	2025-12-19 17:14:04.853+02
5f65c3a5-92f3-45c2-89e4-333af6b16225	DG386	\N	TAFADZWA	MATAI	\N	\N	29d8843a-cc16-40e0-9b42-c07ff46e5688	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.855+02	2025-12-19 17:14:04.855+02
01d5558e-013e-45aa-8993-e28a653e9a43	DG426	\N	NAPHTALI	PHIRI	\N	\N	29d8843a-cc16-40e0-9b42-c07ff46e5688	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.856+02	2025-12-19 17:14:04.856+02
10948cf5-8079-4161-8bfe-0c8e2fa85485	DG427	\N	MATHEW	MAZHAMBE	\N	\N	29d8843a-cc16-40e0-9b42-c07ff46e5688	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.858+02	2025-12-19 17:14:04.858+02
3d51b408-1d97-49fc-9fd8-a93aa09aeaf6	DG439	\N	GEORGE	MAGWAZA	\N	\N	29d8843a-cc16-40e0-9b42-c07ff46e5688	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.859+02	2025-12-19 17:14:04.859+02
1655f33b-aaef-43f4-b39d-c166ac55be87	DG445	\N	KELVIN	NHAMOYEBONDE	\N	\N	29d8843a-cc16-40e0-9b42-c07ff46e5688	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.861+02	2025-12-19 17:14:04.861+02
55b91bc5-9907-42ac-b24c-ae945d02d5e4	DG450	\N	TINASHE	HARUMBWI	\N	\N	29d8843a-cc16-40e0-9b42-c07ff46e5688	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.862+02	2025-12-19 17:14:04.862+02
7e76034e-3d2d-44e0-a1a4-e4740eb68e9e	DG451	\N	VIRIMAI ANESU	MUKWENYA	\N	\N	29d8843a-cc16-40e0-9b42-c07ff46e5688	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.864+02	2025-12-19 17:14:04.864+02
55929279-947b-43bb-8951-e554341b69bd	DG492	\N	WHITEHEAD	CHAMONYONGA	\N	\N	29d8843a-cc16-40e0-9b42-c07ff46e5688	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.865+02	2025-12-19 17:14:04.865+02
2d912be0-365d-4ccb-b9b1-e672d720b138	DG493	\N	CARLINGTON	SIREWU	\N	\N	29d8843a-cc16-40e0-9b42-c07ff46e5688	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.867+02	2025-12-19 17:14:04.867+02
b67b58d8-3967-458b-86c7-4680adcd19d7	DG494	\N	WELLINGTON	ARUTURA	\N	\N	29d8843a-cc16-40e0-9b42-c07ff46e5688	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.869+02	2025-12-19 17:14:04.869+02
12666a2d-454a-4575-82d0-fe122a421bd0	DG496	\N	EDSON	KAMU	\N	\N	29d8843a-cc16-40e0-9b42-c07ff46e5688	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.87+02	2025-12-19 17:14:04.87+02
504790e4-1fda-45d1-afc2-97c35d0a3a0b	DG497	\N	MALVERN	NGULUWE	\N	\N	29d8843a-cc16-40e0-9b42-c07ff46e5688	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.872+02	2025-12-19 17:14:04.872+02
a648da19-ebb4-42a7-83ea-05cf554c658f	DG498	\N	BRADELY	MUNANGA	\N	\N	29d8843a-cc16-40e0-9b42-c07ff46e5688	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.874+02	2025-12-19 17:14:04.874+02
d6884145-38ad-433e-b4da-7a40dfa5e9f9	DG513	\N	TONDERAI	KATURA	\N	\N	29d8843a-cc16-40e0-9b42-c07ff46e5688	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.875+02	2025-12-19 17:14:04.875+02
351cedee-647e-49b6-82e5-08abdecc9a51	DG515	\N	TAFADZWA	GOROMONZI	\N	\N	29d8843a-cc16-40e0-9b42-c07ff46e5688	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.877+02	2025-12-19 17:14:04.877+02
d042ea70-f827-4f73-929b-de2d7e6ffb3f	DG517	\N	GIFT	TEMBO	\N	\N	29d8843a-cc16-40e0-9b42-c07ff46e5688	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.879+02	2025-12-19 17:14:04.879+02
7f241294-86b1-4b18-9f20-9b996af550f9	DG536	\N	THABANI	MOYO	\N	\N	29d8843a-cc16-40e0-9b42-c07ff46e5688	\N	e9ee7e23-fe6f-4c0a-8f16-5fd036170968	DRIVER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.881+02	2025-12-19 17:14:04.881+02
3ea9d635-6645-424d-91fc-87e2cdfaf3db	DG624	\N	PANASHE	RUSWA	\N	\N	29d8843a-cc16-40e0-9b42-c07ff46e5688	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.882+02	2025-12-19 17:14:04.882+02
728cd6c7-e77b-4734-bbc6-e2f1d83ce1a6	DG629	\N	LAMECK	NGIRAZI	\N	\N	29d8843a-cc16-40e0-9b42-c07ff46e5688	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.884+02	2025-12-19 17:14:04.884+02
557b8cf4-f136-4da5-8840-0dae6001f270	DG630	\N	EVIDENCE	DANDAWA	\N	\N	29d8843a-cc16-40e0-9b42-c07ff46e5688	\N	623a72b2-17e8-4985-8159-b8f845556c57	STANDBY DRIVER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.885+02	2025-12-19 17:14:04.885+02
a1fd7c56-2042-489f-84a6-6024c64426c9	DG632	\N	ANYWAY	CHIGODO	\N	\N	29d8843a-cc16-40e0-9b42-c07ff46e5688	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.887+02	2025-12-19 17:14:04.887+02
dca52b56-54cb-420b-9c17-d8e261fac12c	DG633	\N	LIBERTY	MUDHINDO	\N	\N	29d8843a-cc16-40e0-9b42-c07ff46e5688	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.888+02	2025-12-19 17:14:04.888+02
6f431e06-df6a-4c37-9941-6049f1dd1ade	DG637	\N	REMEMBER	FUSIRA	\N	\N	29d8843a-cc16-40e0-9b42-c07ff46e5688	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.89+02	2025-12-19 17:14:04.89+02
ec18781b-8b6f-447b-b6be-6f82264ba600	DG657	\N	ALBERT	MASHIKI	\N	\N	29d8843a-cc16-40e0-9b42-c07ff46e5688	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.892+02	2025-12-19 17:14:04.892+02
2cf80333-7e01-44bf-879f-1212180803fd	DG702	\N	JABULANI	TOGAREPI	\N	\N	29d8843a-cc16-40e0-9b42-c07ff46e5688	\N	36c80274-f976-4251-a1b9-33943692251c	CLASS 4 DRIVER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.894+02	2025-12-19 17:14:04.894+02
bdf1ead9-d612-45e9-810b-85ee4387823f	DG733	\N	TATENDA	CHIRIMA	\N	\N	29d8843a-cc16-40e0-9b42-c07ff46e5688	\N	c73b3448-778b-4b92-bc9c-f414d6410874	ELECTRICIAN ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.895+02	2025-12-19 17:14:04.895+02
bc797fb8-5945-4022-a9d7-8040dd47eb2b	DG757	\N	ZVIKOMBORERO	GOZHO	\N	\N	29d8843a-cc16-40e0-9b42-c07ff46e5688	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.898+02	2025-12-19 17:14:04.898+02
3f6fe68c-4648-43de-a586-ca4a7ab3a522	DG291	\N	LEAN	GUNJA	\N	\N	7f81cf21-8c79-49de-ad6a-1a196327c1d5	\N	66cef3fa-e46b-47eb-bccf-401eab562bf8	CORE SHED ATTENDANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.899+02	2025-12-19 17:14:04.899+02
32d0373d-843a-43ba-a651-48d24f8542b3	DG004	\N	COLLEN	BHOBHO	\N	\N	7f81cf21-8c79-49de-ad6a-1a196327c1d5	\N	d420302b-40c4-49a5-9724-3cfed908a9e8	TRAINEE GEO TECH	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.901+02	2025-12-19 17:14:04.901+02
2e318534-a427-4108-9de4-4c3125820c02	DG013	\N	BIGGIE	CHITUMBA	\N	\N	7f81cf21-8c79-49de-ad6a-1a196327c1d5	\N	d420302b-40c4-49a5-9724-3cfed908a9e8	TRAINEE GEO TECH	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.903+02	2025-12-19 17:14:04.903+02
36750d26-6f85-465d-9ec0-b0abd419b933	DG017	\N	KENNETH	KARISE	\N	\N	7f81cf21-8c79-49de-ad6a-1a196327c1d5	\N	d420302b-40c4-49a5-9724-3cfed908a9e8	TRAINEE GEO TECH	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.905+02	2025-12-19 17:14:04.905+02
43f270a5-217a-46f8-bc6d-cdf324a054bf	DG067	\N	CHARLES	MAPORISA	\N	\N	7f81cf21-8c79-49de-ad6a-1a196327c1d5	\N	bd19895a-59f9-456e-9ad1-d52beaf7c548	SAMPLER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.906+02	2025-12-19 17:14:04.906+02
1f46b270-4f3a-47a7-ae35-8617f0b9541e	DG069	\N	PRUDENCE	CHIDORA	\N	\N	7f81cf21-8c79-49de-ad6a-1a196327c1d5	\N	1c295936-886d-4e53-bdc0-74b274f2e95b	SAMPLER RC DRILLING	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.908+02	2025-12-19 17:14:04.908+02
86b5f8c6-e730-4ec1-8f6e-072ea879a958	DG153	\N	SHELLINGTON	MAPOSA	\N	\N	7f81cf21-8c79-49de-ad6a-1a196327c1d5	\N	bd19895a-59f9-456e-9ad1-d52beaf7c548	SAMPLER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.911+02	2025-12-19 17:14:04.911+02
ee72339a-564a-4117-b9d3-5e2aa1ba41bc	DG208	\N	VENGAI	CHIMANIKIRE	\N	\N	7f81cf21-8c79-49de-ad6a-1a196327c1d5	\N	bd19895a-59f9-456e-9ad1-d52beaf7c548	SAMPLER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.913+02	2025-12-19 17:14:04.913+02
e41a4c49-32d0-4439-8759-ea9173785f73	DG268	\N	ANHTONY	TAULO	\N	\N	7f81cf21-8c79-49de-ad6a-1a196327c1d5	\N	bd19895a-59f9-456e-9ad1-d52beaf7c548	SAMPLER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.915+02	2025-12-19 17:14:04.915+02
e4821ec1-1246-4b8b-8ae9-68d79ae6c952	DG270	\N	TINASHE	NDORO	\N	\N	7f81cf21-8c79-49de-ad6a-1a196327c1d5	\N	bd19895a-59f9-456e-9ad1-d52beaf7c548	SAMPLER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.917+02	2025-12-19 17:14:04.917+02
c56471ce-8bd9-468b-ad44-c672dff83710	DG280	\N	TAKAWIRA	CHAPUKA	\N	\N	7f81cf21-8c79-49de-ad6a-1a196327c1d5	\N	bd19895a-59f9-456e-9ad1-d52beaf7c548	SAMPLER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.919+02	2025-12-19 17:14:04.919+02
510aa52e-7eb7-473b-94bd-ae392fdce97d	DG282	\N	ANDERSON	CHIKORE	\N	\N	7f81cf21-8c79-49de-ad6a-1a196327c1d5	\N	bd19895a-59f9-456e-9ad1-d52beaf7c548	SAMPLER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.92+02	2025-12-19 17:14:04.92+02
ebc0ec6e-f326-4228-9649-b4b5f7d02a3f	DG298	\N	NEBIA	MADZIVANZIRA	\N	\N	7f81cf21-8c79-49de-ad6a-1a196327c1d5	\N	bd19895a-59f9-456e-9ad1-d52beaf7c548	SAMPLER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.922+02	2025-12-19 17:14:04.922+02
d1f4710d-1eb6-45aa-a04c-41d9454367a8	DG302	\N	LINDSAY	CHINYAMA	\N	\N	7f81cf21-8c79-49de-ad6a-1a196327c1d5	\N	44ee1d5a-49a7-4d7a-aeb5-898a826496a6	DATA CAPTURE CLERK	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.923+02	2025-12-19 17:14:04.923+02
b0bd0547-b3ef-49f3-87aa-32a3fd8fbdee	DG313	\N	DARLINGTON	GUNI	\N	\N	7f81cf21-8c79-49de-ad6a-1a196327c1d5	\N	bd19895a-59f9-456e-9ad1-d52beaf7c548	SAMPLER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.925+02	2025-12-19 17:14:04.925+02
5ac4db9c-9ca2-4d80-a765-5dea11d6a268	DG321	\N	NIGEL	MASHONGANYIKA	\N	\N	7f81cf21-8c79-49de-ad6a-1a196327c1d5	\N	1587e1bf-de5d-4f3f-892e-5c4f6e435b1b	SAMPLER (RC DRILLING)	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.928+02	2025-12-19 17:14:04.928+02
479eb5f9-626a-4f72-92bf-3028ab983814	DG381	\N	ARCHBORD	NYANHETE	\N	\N	7f81cf21-8c79-49de-ad6a-1a196327c1d5	\N	1c295936-886d-4e53-bdc0-74b274f2e95b	SAMPLER RC DRILLING	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.929+02	2025-12-19 17:14:04.929+02
bc301852-f6b8-4961-94f2-f2d6c01bc9b2	DG418	\N	ENIFA	NHAURIRO	\N	\N	7f81cf21-8c79-49de-ad6a-1a196327c1d5	\N	1c295936-886d-4e53-bdc0-74b274f2e95b	SAMPLER RC DRILLING	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.932+02	2025-12-19 17:14:04.932+02
6f4142df-79b3-4c20-ae85-7362cd552883	DG453	\N	MALVERN	MUCHAZIVEPI	\N	\N	7f81cf21-8c79-49de-ad6a-1a196327c1d5	\N	1c295936-886d-4e53-bdc0-74b274f2e95b	SAMPLER RC DRILLING	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.934+02	2025-12-19 17:14:04.934+02
a3352187-33a0-4758-a92c-69d3ff78c2d8	DG500	\N	ABEL	MUGARI	\N	\N	7f81cf21-8c79-49de-ad6a-1a196327c1d5	\N	1c295936-886d-4e53-bdc0-74b274f2e95b	SAMPLER RC DRILLING	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.937+02	2025-12-19 17:14:04.937+02
8dd1e009-99c1-44a6-b311-f2f3a00b281c	DG501	\N	TATENDA	NGOCHO	\N	\N	7f81cf21-8c79-49de-ad6a-1a196327c1d5	\N	44ee1d5a-49a7-4d7a-aeb5-898a826496a6	DATA CAPTURE CLERK	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.939+02	2025-12-19 17:14:04.939+02
1f133a74-ade9-4d10-b492-1345af13c97a	DG502	\N	GRACIOUS	NZVAURA	\N	\N	7f81cf21-8c79-49de-ad6a-1a196327c1d5	\N	1c295936-886d-4e53-bdc0-74b274f2e95b	SAMPLER RC DRILLING	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.941+02	2025-12-19 17:14:04.941+02
c2e8ffeb-fb96-413e-9296-af7f52dac55b	DG651	\N	NYASHA	NHAMOYEBONDE	\N	\N	7f81cf21-8c79-49de-ad6a-1a196327c1d5	\N	bd19895a-59f9-456e-9ad1-d52beaf7c548	SAMPLER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.943+02	2025-12-19 17:14:04.943+02
78d67a11-e152-42fb-a245-9a4b5efc8ce1	DG666	\N	MUNYARADZI	MUROIWA	\N	\N	7f81cf21-8c79-49de-ad6a-1a196327c1d5	\N	ae4dbeca-ee18-43dd-99b9-90017917e3f5	RC SAMPLER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.945+02	2025-12-19 17:14:04.945+02
521c032e-12a8-461d-a417-09c0513dc0ed	DG048	\N	POWERMAN	KADZIMA	\N	\N	e817b4e7-1b12-4bd7-a770-e1d3a430259e	\N	bfd69829-d2c1-429c-9c4f-95415f6d52fc	SURVEY ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.947+02	2025-12-19 17:14:04.947+02
8801cfef-4a2c-4c26-886b-62ba40c920ea	DG288	\N	TAURAI	CHIZANGA	\N	\N	e817b4e7-1b12-4bd7-a770-e1d3a430259e	\N	bfd69829-d2c1-429c-9c4f-95415f6d52fc	SURVEY ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.951+02	2025-12-19 17:14:04.951+02
f7ec2259-5b4e-46f7-b23d-99e53054ca7d	DG300	\N	AUSTIN	MASONDO	\N	\N	e817b4e7-1b12-4bd7-a770-e1d3a430259e	\N	bfd69829-d2c1-429c-9c4f-95415f6d52fc	SURVEY ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.954+02	2025-12-19 17:14:04.954+02
c75a18d7-8389-481a-b971-4eb26cffd05e	DG338	\N	THABANI	NCUBE	\N	\N	e817b4e7-1b12-4bd7-a770-e1d3a430259e	\N	bfd69829-d2c1-429c-9c4f-95415f6d52fc	SURVEY ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.956+02	2025-12-19 17:14:04.956+02
e454c049-c78e-4cfa-b546-5ac79aaec73b	DG416	\N	KUDAKWASHE	MAZHAMBE	\N	\N	e817b4e7-1b12-4bd7-a770-e1d3a430259e	\N	bfd69829-d2c1-429c-9c4f-95415f6d52fc	SURVEY ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.958+02	2025-12-19 17:14:04.958+02
931f1740-bf75-49b8-8d2e-1b4e98f94266	DG435	\N	LIBERTY	DAWA	\N	\N	e817b4e7-1b12-4bd7-a770-e1d3a430259e	\N	bfd69829-d2c1-429c-9c4f-95415f6d52fc	SURVEY ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.959+02	2025-12-19 17:14:04.959+02
a4e59bd9-ee2b-4393-9cfc-1c81df2a417a	DG648	\N	DOMINIC	MARARA	\N	\N	e817b4e7-1b12-4bd7-a770-e1d3a430259e	\N	bfd69829-d2c1-429c-9c4f-95415f6d52fc	SURVEY ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.961+02	2025-12-19 17:14:04.961+02
a814159a-946b-4cce-a6af-6d3a18576c33	DG649	\N	VALENTINE	SIBANDA	\N	\N	e817b4e7-1b12-4bd7-a770-e1d3a430259e	\N	e9ee7e23-fe6f-4c0a-8f16-5fd036170968	DRIVER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.962+02	2025-12-19 17:14:04.962+02
1a0f4c89-a562-435b-a04f-3f4529da5c94	DG730	\N	KUDZAISHE	DHAMBUZA	\N	\N	7f81cf21-8c79-49de-ad6a-1a196327c1d5	\N	66cef3fa-e46b-47eb-bccf-401eab562bf8	CORE SHED ATTENDANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.964+02	2025-12-19 17:14:04.964+02
7ebba4be-f061-456b-9a92-7064d63aee28	DG770	\N	PANASHE	CHINZOU	\N	\N	7f81cf21-8c79-49de-ad6a-1a196327c1d5	\N	16d46958-376b-40d6-b129-dc7484340541	DRILL RIG ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.965+02	2025-12-19 17:14:04.965+02
d133f378-f13f-457d-b11d-1d5044bfac8f	DG771	\N	ANTHONY	CHIKUKWA	\N	\N	7f81cf21-8c79-49de-ad6a-1a196327c1d5	\N	16d46958-376b-40d6-b129-dc7484340541	DRILL RIG ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.967+02	2025-12-19 17:14:04.967+02
95b71a05-333a-46f5-9e0e-c513f686758d	DG772	\N	JEMITINOS	MUTSIKIWA	\N	\N	7f81cf21-8c79-49de-ad6a-1a196327c1d5	\N	66cef3fa-e46b-47eb-bccf-401eab562bf8	CORE SHED ATTENDANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.968+02	2025-12-19 17:14:04.968+02
05409ee7-a5e5-4bed-86c4-bdf04e47da4f	DG773	\N	REJOICE	JAVANGWE	\N	\N	7f81cf21-8c79-49de-ad6a-1a196327c1d5	\N	16d46958-376b-40d6-b129-dc7484340541	DRILL RIG ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.97+02	2025-12-19 17:14:04.97+02
faa68031-f0f6-4635-89b2-c36c9244f41a	DG774	\N	TATENDA	MUNYENYIWA	\N	\N	7f81cf21-8c79-49de-ad6a-1a196327c1d5	\N	16d46958-376b-40d6-b129-dc7484340541	DRILL RIG ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.971+02	2025-12-19 17:14:04.971+02
65cb451f-253a-415f-a39f-1ef6326983cd	DG775	\N	TONDERAI	MAVHURA	\N	\N	7f81cf21-8c79-49de-ad6a-1a196327c1d5	\N	16d46958-376b-40d6-b129-dc7484340541	DRILL RIG ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.973+02	2025-12-19 17:14:04.973+02
ad8c6f37-de6d-4124-b242-fee0cd78a280	DG776	\N	PRINCE	MASVANHISE	\N	\N	7f81cf21-8c79-49de-ad6a-1a196327c1d5	\N	16d46958-376b-40d6-b129-dc7484340541	DRILL RIG ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.975+02	2025-12-19 17:14:04.975+02
51043fd7-07ca-4410-9663-45fac88bac9d	DG112	\N	MANUEL	MAPULAZI	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	58d21227-6ae6-4f94-95e2-cce29afe7e48	CIL ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.976+02	2025-12-19 17:14:04.976+02
b0e576cd-cb86-4718-8af9-f53d0158ee87	DG200	\N	NYASHA	KASEKE	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	a8ff2636-ebe5-4658-8749-672cd3fd7c26	RELIEF CREW ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.978+02	2025-12-19 17:14:04.978+02
1f1f08b6-00e1-443e-a940-ba456aff2ff0	DG370	\N	BESON	NYASULO	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	9172cd60-e245-4f24-814d-ba8a4b79cc4e	CIL OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.979+02	2025-12-19 17:14:04.979+02
a06c2516-63af-49dc-ba4e-34eddbb0edc9	DG403	\N	DADIRAI	CHIHWAKU	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	e6a2ea9d-4562-489b-9318-2f552308a580	GENERAL ASSISTANT CIL	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.981+02	2025-12-19 17:14:04.981+02
57911051-580f-4478-a69a-0a371913a9bc	DG480	\N	THELMA	CHIBHAGU	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	88eb0468-dc23-4aea-ae8a-740dee6fd00e	GENERAL PLANT ATTENDANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.982+02	2025-12-19 17:14:04.982+02
23e7be14-210c-4a20-bbaa-03c3f36b17fb	DG521	\N	MAXWELL	WANJOWA	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	9172cd60-e245-4f24-814d-ba8a4b79cc4e	CIL OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.984+02	2025-12-19 17:14:04.984+02
6acec471-2020-4de7-b27d-c67ceedc9a13	DG551	\N	LAWRENCIOUS	GUDO	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	88eb0468-dc23-4aea-ae8a-740dee6fd00e	GENERAL PLANT ATTENDANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.986+02	2025-12-19 17:14:04.986+02
21322c76-0f75-44fb-b995-11acead9f6b3	DG247	\N	HILTON	KADAIRA	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	e1ef39b3-1bc7-4732-a503-661dd2a0f041	ELUTION & REAGENTS ASSIST	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.987+02	2025-12-19 17:14:04.987+02
1cf6a565-b1c5-411f-a41e-c7b02e076601	DG371	\N	UMALI	PITCHES	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	44775dd5-c8ac-417d-9547-4e2378ae63d1	ELUTION OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.989+02	2025-12-19 17:14:04.989+02
845e59d4-b9f8-4082-b84a-9f6a9b71ab54	DG373	\N	EMMANUEL	PARADZAYI	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	44775dd5-c8ac-417d-9547-4e2378ae63d1	ELUTION OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.99+02	2025-12-19 17:14:04.99+02
af1f90f9-6afa-4a29-ae68-d89c473a73ba	DG375	\N	FARAI	MUZIRA	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	44775dd5-c8ac-417d-9547-4e2378ae63d1	ELUTION OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.992+02	2025-12-19 17:14:04.992+02
ba777371-7dff-450c-b60b-1f1647c9329e	DG420	\N	MELODY	CHIKOYA	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	a8ff2636-ebe5-4658-8749-672cd3fd7c26	RELIEF CREW ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.993+02	2025-12-19 17:14:04.993+02
19c8ea39-3b30-4bec-90d0-765209499f41	DG466	\N	VENGESAI	MANYANGE	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	b665869e-3e91-48c5-9230-883546a1cdcc	ELUTION ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.995+02	2025-12-19 17:14:04.995+02
4b3382dd-904d-4db2-ad17-3fd4705b1178	DG011	\N	AUGUSTINE	CHINGUWA	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	d3476092-0fd0-4333-8457-c44b96e0bdaa	BALLMILL ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.997+02	2025-12-19 17:14:04.997+02
ef4223ed-ff54-4cb8-bff1-a8e9538fd0b4	DG052	\N	DUNGISANI	MUSIIWA	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	3b73b200-2745-4d61-ade3-d46f7dfac882	HOUSE KEEPING ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:04.998+02	2025-12-19 17:14:04.998+02
fe4f8fd5-a8f5-40ad-9693-9454b9ebf80e	DG183	\N	KUDZAI	CHIZANGA	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	3b73b200-2745-4d61-ade3-d46f7dfac882	HOUSE KEEPING ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05+02	2025-12-19 17:14:05+02
6d40475a-cbc2-4317-a9ae-1503d01c7264	DG211	\N	NATHANIEL	MURANDA	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	3b73b200-2745-4d61-ade3-d46f7dfac882	HOUSE KEEPING ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.001+02	2025-12-19 17:14:05.001+02
3119701e-faf9-4325-ae6a-770401010205	DG213	\N	SAFASONGE	NGWENYA	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	b7eb1d5b-303b-4cf4-a0de-5f16a58571d0	LEAVE RELIEF CREW	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.003+02	2025-12-19 17:14:05.003+02
585bf39a-f471-4dc8-bb7a-4ceb1097a50e	DG461	\N	ASHWIN	KATUMBA	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	b7eb1d5b-303b-4cf4-a0de-5f16a58571d0	LEAVE RELIEF CREW	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.004+02	2025-12-19 17:14:05.004+02
a33ee0e8-c38c-46a4-b714-ecbacfb6f07c	DG485	\N	LAWRENCE	KADZVITI	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	a8ff2636-ebe5-4658-8749-672cd3fd7c26	RELIEF CREW ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.006+02	2025-12-19 17:14:05.006+02
47a6a1c8-c390-4e7b-b469-4b41a407c529	DG486	\N	ELASTO	BAKACHEZA	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	ec821f89-408e-44db-98e7-d644c1360fb0	GENERAL MILL ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.007+02	2025-12-19 17:14:05.007+02
25eeb373-555e-4ffb-a6f6-af03ff7ef71d	DG514	\N	LOVEJOY	MANHANGA	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	3b73b200-2745-4d61-ade3-d46f7dfac882	HOUSE KEEPING ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.009+02	2025-12-19 17:14:05.009+02
da00714d-8138-47d5-99aa-1c76e5881d0a	DG568	\N	CARLTON	DZIMBIRI	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	88eb0468-dc23-4aea-ae8a-740dee6fd00e	GENERAL PLANT ATTENDANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.011+02	2025-12-19 17:14:05.011+02
accd4c50-3626-4807-aa3c-612c1f6b5e21	DG570	\N	FURTHERSTEP	KADZIMA	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	3b73b200-2745-4d61-ade3-d46f7dfac882	HOUSE KEEPING ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.013+02	2025-12-19 17:14:05.013+02
d15a39d5-f79b-4218-ace9-05d18019fb0d	DG589	\N	NOBERT	MUBAIWA	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	21ac8bc3-763b-4bd7-88f1-25bcd290be2d	GENERAL PLANT ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.015+02	2025-12-19 17:14:05.015+02
bf825371-15f4-4a28-95fc-8166c1bbeb34	DG597	\N	TENDAI	TINANI	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	3b73b200-2745-4d61-ade3-d46f7dfac882	HOUSE KEEPING ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.016+02	2025-12-19 17:14:05.016+02
ad7b7a48-56f2-41a3-8b8b-667e19d73f03	DG598	\N	BEHAVE	CHIGODO	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	d3476092-0fd0-4333-8457-c44b96e0bdaa	BALLMILL ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.018+02	2025-12-19 17:14:05.018+02
72d505b2-379e-42fa-8844-4b3ee5d124f4	DG672	\N	DARLINGTON	MASERE	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	e2471c1e-3e57-4759-9f90-ddd2601015bd	PLUMBER ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.019+02	2025-12-19 17:14:05.019+02
d6887c15-88b4-431c-b019-ac76ef89b947	DG287	\N	LATIFAN	CHIRUME	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	a370a4e9-3642-4872-b974-e5c360b8cfed	METALLURGICAL CLERK	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.022+02	2025-12-19 17:14:05.022+02
e7a6327d-1972-4813-b975-41c540b4b4cb	DG583	\N	NYASHA	ZAMANI	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	21ac8bc3-763b-4bd7-88f1-25bcd290be2d	GENERAL PLANT ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.026+02	2025-12-19 17:14:05.026+02
4ef6fccb-132d-4b45-8463-e41641f9653e	DG703	\N	TAFADZWA	TAPOMWA	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	60c669d1-253e-428f-8321-5b02360c1d32	PLANT LAB ATTENDANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.029+02	2025-12-19 17:14:05.029+02
93202f82-50de-4056-9ece-4c9a428e11f8	DG063	\N	PETROS	SHERENI	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	ec821f89-408e-44db-98e7-d644c1360fb0	GENERAL MILL ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.03+02	2025-12-19 17:14:05.03+02
f72744d6-10f7-4306-8cf7-7c448ce267a7	DG072	\N	ADMIRE	KASIMO	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	a994088d-a928-441a-94ae-c9ac1d7a2702	TAILINGS STORAGE FACILITY ASSIST	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.032+02	2025-12-19 17:14:05.032+02
7872f32a-08e2-4832-8f84-1fb1945d37f9	DG194	\N	ANTONY	NHAMOYEBONDE	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	d3476092-0fd0-4333-8457-c44b96e0bdaa	BALLMILL ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.033+02	2025-12-19 17:14:05.033+02
00762caf-b859-4122-8bcd-def374dfdd5f	DG195	\N	SELBORNE CHENGETAI	NYAZIKA	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	d3476092-0fd0-4333-8457-c44b96e0bdaa	BALLMILL ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.036+02	2025-12-19 17:14:05.036+02
b5856b02-3ed3-4b09-abbe-cfcb3769b49f	DG205	\N	DONALD	MASANGO	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	d3476092-0fd0-4333-8457-c44b96e0bdaa	BALLMILL ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.038+02	2025-12-19 17:14:05.038+02
bcd057d0-39d3-4868-b01b-b6ea760161a1	DG266	\N	LIBERTY	CHESANGO	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	a994088d-a928-441a-94ae-c9ac1d7a2702	TAILINGS STORAGE FACILITY ASSIST	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.039+02	2025-12-19 17:14:05.039+02
5303f74d-72d0-4b2f-98c8-a2b22eae75db	DG279	\N	LAMECK	BRIAN	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	d3476092-0fd0-4333-8457-c44b96e0bdaa	BALLMILL ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.041+02	2025-12-19 17:14:05.041+02
7bf740fe-518a-4d0e-942f-bafe9c8999ef	DG327	\N	WELLINGTON	NYIKADZINO	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	3b73b200-2745-4d61-ade3-d46f7dfac882	HOUSE KEEPING ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.043+02	2025-12-19 17:14:05.043+02
8bef101c-f9be-44bc-9542-6b2d3e52dd1f	DG333	\N	BELIEVE	GOVHA	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	d3476092-0fd0-4333-8457-c44b96e0bdaa	BALLMILL ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.045+02	2025-12-19 17:14:05.045+02
aedb24d2-dfb5-4780-a114-27ae94212790	DG336	\N	CLEMENCE KURAUONE	NYIKADZINO	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	d3476092-0fd0-4333-8457-c44b96e0bdaa	BALLMILL ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.046+02	2025-12-19 17:14:05.046+02
623ef633-0035-4e23-8c9d-33999bf08621	DG345	\N	TARUVINGA	BGWANYA	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	d3476092-0fd0-4333-8457-c44b96e0bdaa	BALLMILL ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.048+02	2025-12-19 17:14:05.048+02
2ce0c40f-0fd4-4ba7-8e5b-78a23f4a4a2d	DG353	\N	MAXWELL	GONDO	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	d3476092-0fd0-4333-8457-c44b96e0bdaa	BALLMILL ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.05+02	2025-12-19 17:14:05.05+02
c9d6a974-164b-4c1a-815e-1ece595dd9e6	DG374	\N	ANYWAY	MAGWENZI	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	fe4441df-761d-4a09-b748-c58c82805e14	MILL OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.051+02	2025-12-19 17:14:05.051+02
c8f5eb4a-7ba5-4913-856b-e410504e24ed	DG376	\N	SHADRECK	CHIYANDO	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	fe4441df-761d-4a09-b748-c58c82805e14	MILL OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.053+02	2025-12-19 17:14:05.053+02
ce257051-2ee2-4a93-a9fe-e675adde2d89	DG401	\N	FARAI	CHIPATO	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	fe4441df-761d-4a09-b748-c58c82805e14	MILL OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.055+02	2025-12-19 17:14:05.055+02
d9feb606-b639-4c2f-be54-f17412ca860e	DG539	\N	KELVIN	CHIRIMUJIRI	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	21ac8bc3-763b-4bd7-88f1-25bcd290be2d	GENERAL PLANT ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.056+02	2025-12-19 17:14:05.056+02
dfdec9aa-236a-4266-8f3a-cadad04087b1	DG541	\N	ELISHA	KARAMBWE	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	21ac8bc3-763b-4bd7-88f1-25bcd290be2d	GENERAL PLANT ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.058+02	2025-12-19 17:14:05.058+02
8c7827a9-ccfb-4623-9286-b5c1258df67b	DG546	\N	NKOSIYABO	MGUQUKA	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	21ac8bc3-763b-4bd7-88f1-25bcd290be2d	GENERAL PLANT ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.06+02	2025-12-19 17:14:05.06+02
b5269788-6459-41cb-bfcd-358d40eafce5	DG010	\N	JOFFREY	CHIMUTU	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	d3476092-0fd0-4333-8457-c44b96e0bdaa	BALLMILL ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.062+02	2025-12-19 17:14:05.062+02
15745a74-957e-401c-bb4d-782954f0073f	DG030	\N	ELISHA	NGONI	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	7b38dfa2-f994-42c4-9ead-40f49b541421	PRIMARY CRUSHER OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.063+02	2025-12-19 17:14:05.063+02
f92b537a-94d0-425a-9024-93892cd62b6f	DG079	\N	DAIROD	KAKONO	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	7b38dfa2-f994-42c4-9ead-40f49b541421	PRIMARY CRUSHER OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.065+02	2025-12-19 17:14:05.065+02
eff2d726-fa15-423d-b8d9-4342f43c5483	DG131	\N	GRACIOUS	MUZHONA	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	c5635dac-71c0-4da6-8d34-d393a4845c4d	PRIMARY CRUSHER ATTENDANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.066+02	2025-12-19 17:14:05.066+02
7b4766d2-aa71-4510-a5b2-c11d7bf8c7b8	DG134	\N	GAINMORE	CHARAMBIRA	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	c5635dac-71c0-4da6-8d34-d393a4845c4d	PRIMARY CRUSHER ATTENDANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.068+02	2025-12-19 17:14:05.068+02
9186f22d-da44-4d8a-866b-1b6eb039b327	DG199	\N	KENNETH	LAPKEN	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	c5635dac-71c0-4da6-8d34-d393a4845c4d	PRIMARY CRUSHER ATTENDANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.07+02	2025-12-19 17:14:05.07+02
c706fb41-9bb3-4538-ae20-c0823839a837	DG276	\N	SOLOMON	ZILAKA	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	c5635dac-71c0-4da6-8d34-d393a4845c4d	PRIMARY CRUSHER ATTENDANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.071+02	2025-12-19 17:14:05.071+02
21887803-1e31-4cd9-8c4a-3a6c814e3185	DG278	\N	TERRENCE	BOTE	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	da97a0d0-ceaf-4652-8757-c641b6ce85ed	PRIMARY CRUSHING OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.073+02	2025-12-19 17:14:05.073+02
8fa38493-9ae4-40f6-8cbc-490eec8a566f	DG293	\N	DAVIES	KAHUMWE	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	c5635dac-71c0-4da6-8d34-d393a4845c4d	PRIMARY CRUSHER ATTENDANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.075+02	2025-12-19 17:14:05.075+02
0d664d08-787a-4214-bac0-a71775952d46	DG742	\N	JAMES	KAISI	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	979557b7-c2de-423d-aa10-067a8043db0b	THICKENER OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.076+02	2025-12-19 17:14:05.076+02
cf19664b-0028-473d-be89-86862925d8eb	DG743	\N	ANDREW	CHANYUKA	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	979557b7-c2de-423d-aa10-067a8043db0b	THICKENER OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.078+02	2025-12-19 17:14:05.078+02
490c66d5-ba1d-458c-996d-1630862e6908	DG744	\N	DIVASON	MKANDAWIRE	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	979557b7-c2de-423d-aa10-067a8043db0b	THICKENER OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.079+02	2025-12-19 17:14:05.079+02
fc741d80-4b6f-417c-990b-489ded0d2c6e	DG722	\N	NEHEMIAH	MUNYORO	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	21ac8bc3-763b-4bd7-88f1-25bcd290be2d	GENERAL PLANT ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.081+02	2025-12-19 17:14:05.081+02
11cc2d5f-9950-4413-ae36-a4550d58c722	DG035	\N	ENOCK	PHIRI	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	3b73b200-2745-4d61-ade3-d46f7dfac882	HOUSE KEEPING ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.083+02	2025-12-19 17:14:05.083+02
2ba7b6f2-59e9-4328-8b0d-de23c92358cc	DG074	\N	CYRUS	CHIHOKO	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	21ac8bc3-763b-4bd7-88f1-25bcd290be2d	GENERAL PLANT ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.084+02	2025-12-19 17:14:05.084+02
37d73524-30cd-4932-9928-2af7c1dadf1f	DG377	\N	TINASHE	GWATA	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	b6cc4c75-67ee-49df-9577-11852dc94392	REAGENTS & SMELTING CONTROLLER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.086+02	2025-12-19 17:14:05.086+02
9e9ba8ea-c040-4144-84a4-9ade71ddb482	DG457	\N	AGGRIPPA	CHIDEMO	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	524744a9-e444-430f-9861-7ee549c570d6	REAGENTS & SMELTING ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.087+02	2025-12-19 17:14:05.087+02
8b416527-c263-4b52-aea3-f65e16408aef	DG058	\N	ALBERT	MUDIWA	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	814c890e-a1cb-4ed9-995f-08ec14178bbd	GENERAL SECONDARY & TERTIARY CRUSHING ASSIST	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.089+02	2025-12-19 17:14:05.089+02
e3bf4168-b2da-4639-ab40-88e68757eab3	DG142	\N	MCNELL	MATAMA	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	814c890e-a1cb-4ed9-995f-08ec14178bbd	GENERAL SECONDARY & TERTIARY CRUSHING ASSIST	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.09+02	2025-12-19 17:14:05.09+02
1c0afbc1-99bc-4429-8d2e-1826a18cdc6e	DG143	\N	ADDLIGHT	NZVAURA	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	42890f73-386a-4441-b403-b9d0ad2fca3b	SECONDARY & TERTIARY CRUSHER OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.092+02	2025-12-19 17:14:05.092+02
02d0edc7-7096-4907-b5aa-eae64d59011e	DG181	\N	JACOB	CHITANHAMAPIRA	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	814c890e-a1cb-4ed9-995f-08ec14178bbd	GENERAL SECONDARY & TERTIARY CRUSHING ASSIST	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.094+02	2025-12-19 17:14:05.094+02
88c5e65e-78cb-4868-9f4e-6e0bfa8f18d6	DG184	\N	HAMLET	KUGOTSI	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	42890f73-386a-4441-b403-b9d0ad2fca3b	SECONDARY & TERTIARY CRUSHER OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.095+02	2025-12-19 17:14:05.095+02
f4dfd742-6560-4570-a8fa-566dc7fcc188	DG188	\N	FOSTER	MARIME	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	42890f73-386a-4441-b403-b9d0ad2fca3b	SECONDARY & TERTIARY CRUSHER OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.097+02	2025-12-19 17:14:05.097+02
7e82592d-593c-46df-a6f1-532b7c8b3bb9	DG237	\N	PRAISE K	CHANETSA	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	ec821f89-408e-44db-98e7-d644c1360fb0	GENERAL MILL ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.098+02	2025-12-19 17:14:05.098+02
f7e4eb43-5112-4440-bb41-0e6e3724719d	DG281	\N	FORGET	CHIGWADA	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	814c890e-a1cb-4ed9-995f-08ec14178bbd	GENERAL SECONDARY & TERTIARY CRUSHING ASSIST	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.1+02	2025-12-19 17:14:05.1+02
8dba8e24-bcde-448f-bf34-196649ccf7ef	DG355	\N	TATENDA	MAPURANGA	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	814c890e-a1cb-4ed9-995f-08ec14178bbd	GENERAL SECONDARY & TERTIARY CRUSHING ASSIST	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.101+02	2025-12-19 17:14:05.101+02
cb87b328-8ccc-4ca5-acae-8572a1936799	DG003	\N	BHANDASON	BHANDA	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	494dd097-f07f-4421-9c9b-9302b4231421	TAILINGS STORAGE FACILITY OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.103+02	2025-12-19 17:14:05.103+02
38827571-f1a9-49a9-a432-363175c8a294	DG036	\N	GIVEMORE	PHIRI	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	494dd097-f07f-4421-9c9b-9302b4231421	TAILINGS STORAGE FACILITY OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.105+02	2025-12-19 17:14:05.105+02
a38ee102-d40d-4238-bf83-891b1f2885c9	DG065	\N	KUDAKWASHE	RUNZIRA	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	494dd097-f07f-4421-9c9b-9302b4231421	TAILINGS STORAGE FACILITY OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.106+02	2025-12-19 17:14:05.106+02
feb68268-5e26-41e4-9010-bb2f50ea5e1d	DG071	\N	ALBERT	MAPIRA	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	21ac8bc3-763b-4bd7-88f1-25bcd290be2d	GENERAL PLANT ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.108+02	2025-12-19 17:14:05.108+02
3de8328c-063c-4546-b1d2-b6c7bbc87ca5	DG103	\N	FIDELIS	MUTAYI	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	21ac8bc3-763b-4bd7-88f1-25bcd290be2d	GENERAL PLANT ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.109+02	2025-12-19 17:14:05.109+02
2e722bdd-a295-4d8a-8be0-87a5afbb2c7d	DG127	\N	LEONARD	BUNGU	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	ec821f89-408e-44db-98e7-d644c1360fb0	GENERAL MILL ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.111+02	2025-12-19 17:14:05.111+02
f10a479c-e800-4982-a3a3-4b0653b4466e	DG128	\N	FRIDAY	KAVINGA	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	21ac8bc3-763b-4bd7-88f1-25bcd290be2d	GENERAL PLANT ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.112+02	2025-12-19 17:14:05.112+02
dd7953ab-0de2-4e6e-85b6-61f913f6621f	DG133	\N	LAMECK	KUMBONJE	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.114+02	2025-12-19 17:14:05.114+02
570f72fd-800b-4ab7-af3c-5bbb5d15e387	DG144	\N	NOEL	TAULO	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	21ac8bc3-763b-4bd7-88f1-25bcd290be2d	GENERAL PLANT ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.116+02	2025-12-19 17:14:05.116+02
7e279ebe-c7b0-4be7-b02d-49755797896f	DG146	\N	ELISHA	MUNETSI	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	d3476092-0fd0-4333-8457-c44b96e0bdaa	BALLMILL ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.117+02	2025-12-19 17:14:05.117+02
07b0037e-df52-4b0a-9c2a-c6106eb84e37	DG156	\N	MAKOMBORERO	KOMBONI	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	a994088d-a928-441a-94ae-c9ac1d7a2702	TAILINGS STORAGE FACILITY ASSIST	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.119+02	2025-12-19 17:14:05.119+02
57989910-0dd7-4b8c-87ae-b077335e7ba4	DG189	\N	ELIAS	MARIMO	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	21ac8bc3-763b-4bd7-88f1-25bcd290be2d	GENERAL PLANT ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.12+02	2025-12-19 17:14:05.12+02
c6a8ddbd-3441-4526-833b-f0e991a33c76	DG285	\N	COSMAS	CHIMANIKIRE	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	21ac8bc3-763b-4bd7-88f1-25bcd290be2d	GENERAL PLANT ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.122+02	2025-12-19 17:14:05.122+02
83f9a44a-0aff-4528-a1b2-3f8d5e57f34b	DG296	\N	TAKUDZWA	KASEKE	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	21ac8bc3-763b-4bd7-88f1-25bcd290be2d	GENERAL PLANT ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.124+02	2025-12-19 17:14:05.124+02
7b8c83f0-a752-4b5f-805e-fc6bbff1a265	DG340	\N	AMOS	MACHAKARI	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	f71821d7-514b-4fb1-8f26-cd6417bc553d	TEAM LEADER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.128+02	2025-12-19 17:14:05.128+02
de209f84-c318-4cf2-b795-d744ee9cf74c	DG343	\N	STACIOUS	KUSIKWENYU	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	21ac8bc3-763b-4bd7-88f1-25bcd290be2d	GENERAL PLANT ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.129+02	2025-12-19 17:14:05.129+02
29f3ecf3-e20b-40e6-a0db-e2bd98052175	DG394	\N	PRINCE	NHAUCHURU	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	21ac8bc3-763b-4bd7-88f1-25bcd290be2d	GENERAL PLANT ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.131+02	2025-12-19 17:14:05.131+02
aec73e66-94ea-4ad2-911e-af96831d263a	DG433	\N	TAWANDA	MUKWENYA	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	21ac8bc3-763b-4bd7-88f1-25bcd290be2d	GENERAL PLANT ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.133+02	2025-12-19 17:14:05.133+02
17f94a2c-9c9b-4067-83b7-72d95c7cf5e4	DG503	\N	RICHARD	KAZUNGA	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	21ac8bc3-763b-4bd7-88f1-25bcd290be2d	GENERAL PLANT ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.134+02	2025-12-19 17:14:05.134+02
aa376d60-9241-40e3-aca9-a60ab2a54342	DG506	\N	COASTER	JACK	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	21ac8bc3-763b-4bd7-88f1-25bcd290be2d	GENERAL PLANT ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.136+02	2025-12-19 17:14:05.136+02
0f6dc8d2-cab1-448c-836d-7dd6d6214fa1	DG509	\N	MILTON	CHIGODHO	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	21ac8bc3-763b-4bd7-88f1-25bcd290be2d	GENERAL PLANT ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.138+02	2025-12-19 17:14:05.138+02
5e9a8aeb-13fb-4c7c-a510-cb988c1174aa	DG511	\N	WISE	TAMBUDZA	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	21ac8bc3-763b-4bd7-88f1-25bcd290be2d	GENERAL PLANT ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.14+02	2025-12-19 17:14:05.14+02
c597c025-ca5b-4db0-86ac-43598440a9f4	DG639	\N	ELVIS	MARAMBA	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	21ac8bc3-763b-4bd7-88f1-25bcd290be2d	GENERAL PLANT ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.142+02	2025-12-19 17:14:05.142+02
7ca6f8dc-b49a-4300-b363-5cb9319bb806	DG640	\N	TINOTENDA	PARWARINGIRA	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	21ac8bc3-763b-4bd7-88f1-25bcd290be2d	GENERAL PLANT ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.143+02	2025-12-19 17:14:05.143+02
fc078399-31d2-4bde-b9d2-10a021f592d6	DG641	\N	TAFADZWA	MAKREYA	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	21ac8bc3-763b-4bd7-88f1-25bcd290be2d	GENERAL PLANT ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.145+02	2025-12-19 17:14:05.145+02
fb5252a5-bc11-4a98-84e7-443b1d85654a	DG664	\N	TENDEKAI	MUFUMBIRA	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	21ac8bc3-763b-4bd7-88f1-25bcd290be2d	GENERAL PLANT ASSISTANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.146+02	2025-12-19 17:14:05.146+02
671388bd-c524-49eb-b832-b0538179960a	DG717	\N	TANAKA	CHIHLABA	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	88eb0468-dc23-4aea-ae8a-740dee6fd00e	GENERAL PLANT ATTENDANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.148+02	2025-12-19 17:14:05.148+02
0c8d58b4-6010-4919-b4a9-5574fb9461fe	DG718	\N	TANAKA	MAVESERE	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	\N	88eb0468-dc23-4aea-ae8a-740dee6fd00e	GENERAL PLANT ATTENDANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.149+02	2025-12-19 17:14:05.149+02
118e42f9-0c32-418c-bd4f-964228cc80b2	DG132	\N	KELVIN KUDAKWASHE	NYAMAVABVU	\N	\N	b9a21c3e-de70-4b23-a411-9f9dd5a6f155	\N	0af8bc6f-0861-473d-85d2-d53e747bde88	CCTV OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.151+02	2025-12-19 17:14:05.151+02
520afef4-9416-4dac-b5b5-cf088e9471ee	DG221	\N	MARGARET	CHITIKI	\N	\N	b9a21c3e-de70-4b23-a411-9f9dd5a6f155	\N	0af8bc6f-0861-473d-85d2-d53e747bde88	CCTV OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.152+02	2025-12-19 17:14:05.152+02
a2b1fed3-fb47-436f-9082-86c7693c357f	DG419	\N	AUDREY	CHIFWAFWA	\N	\N	b9a21c3e-de70-4b23-a411-9f9dd5a6f155	\N	0af8bc6f-0861-473d-85d2-d53e747bde88	CCTV OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.154+02	2025-12-19 17:14:05.154+02
a328a587-0c7b-4942-9ffe-a89b612c4eae	DG434	\N	CHONDE	BENNY	\N	\N	b9a21c3e-de70-4b23-a411-9f9dd5a6f155	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.155+02	2025-12-19 17:14:05.155+02
58a5e262-0232-455b-b70e-f2728903c271	DG476	\N	NIXON	VELLEM	\N	\N	b9a21c3e-de70-4b23-a411-9f9dd5a6f155	\N	0af8bc6f-0861-473d-85d2-d53e747bde88	CCTV OPERATOR	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.157+02	2025-12-19 17:14:05.157+02
0286f93c-729e-4a92-bcfb-0eb9406e7ea7	DG530	\N	TONGAI	MAGURA	\N	\N	b9a21c3e-de70-4b23-a411-9f9dd5a6f155	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.159+02	2025-12-19 17:14:05.159+02
cef03dbb-0d0e-49c0-a412-ad651a04db4e	DG545	\N	SYLVESTER	GUNJA	\N	\N	b9a21c3e-de70-4b23-a411-9f9dd5a6f155	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.16+02	2025-12-19 17:14:05.16+02
1171cb51-27d0-4eb3-a2ea-6fe18f229550	DG571	\N	CHRISTOPHER	KUGOTSI	\N	\N	b9a21c3e-de70-4b23-a411-9f9dd5a6f155	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.162+02	2025-12-19 17:14:05.162+02
21ed3913-d695-4bf8-9fc1-dc1ebaaaeae1	DG580	\N	SIMBARASHE	KAZUNGA	\N	\N	b9a21c3e-de70-4b23-a411-9f9dd5a6f155	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.163+02	2025-12-19 17:14:05.163+02
e1fe3130-0574-4002-83c4-26e299ee971d	DG588	\N	SINCEWELL	MBUNDURE	\N	\N	b9a21c3e-de70-4b23-a411-9f9dd5a6f155	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.165+02	2025-12-19 17:14:05.165+02
1d6ed3ef-ee70-4d31-a641-71ec31ef949f	DG591	\N	IRVINE	MAZHAMBE	\N	\N	b9a21c3e-de70-4b23-a411-9f9dd5a6f155	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.166+02	2025-12-19 17:14:05.166+02
6b720bad-7d1c-408a-87e0-57e6d99c95f9	DG620	\N	TADIWANASHE	CHAPANDA	\N	\N	b9a21c3e-de70-4b23-a411-9f9dd5a6f155	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.168+02	2025-12-19 17:14:05.168+02
f947b104-9b80-430a-865e-5424ba48c522	DG652	\N	LYTON	MBEREKO	\N	\N	b9a21c3e-de70-4b23-a411-9f9dd5a6f155	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.17+02	2025-12-19 17:14:05.17+02
b14d7e76-d8e4-46e6-a1b1-6c68c7fa8a76	DG720	\N	EDMORE	REVAI	\N	\N	b9a21c3e-de70-4b23-a411-9f9dd5a6f155	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.171+02	2025-12-19 17:14:05.171+02
6f17fc23-a9ab-4057-926d-302c69f467cf	DG723	\N	BIANCAH	NATANI	\N	\N	15c0a970-e3b0-49af-9b35-7e86c1ba2388	\N	5357ea53-fc9e-4f94-896f-fbbabefcf6e5	FIRST AID TRAINER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.173+02	2025-12-19 17:14:05.173+02
5984073e-5311-4ba1-b532-69ba5b03b4b9	DG049	\N	PHILLIP	CHIKOYA	\N	\N	205bdc41-4872-4a0d-9e68-295e41da3803	\N	1e4baf1b-fd82-4f44-bfec-f2389f492e63	HANDYMAN	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.174+02	2025-12-19 17:14:05.174+02
95e372ef-308c-464c-9e2a-feb62d4bd4aa	DG050	\N	MARK	CHIKOYA	\N	\N	205bdc41-4872-4a0d-9e68-295e41da3803	\N	5bffee5b-8ee6-46ce-a6cc-a74bee0a776c	WELFARE WORKER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.176+02	2025-12-19 17:14:05.176+02
68233ac3-3813-4cf2-a0b8-6f3808c5e106	DG090	\N	TANATSA	CHIGWENJERE	\N	\N	205bdc41-4872-4a0d-9e68-295e41da3803	\N	62c939cb-b652-4055-a64c-259e62385a63	COOK	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.177+02	2025-12-19 17:14:05.177+02
92e717f3-419d-4a97-9543-07b6827a519b	DG091	\N	VINCENT	CHIMBUMU	\N	\N	205bdc41-4872-4a0d-9e68-295e41da3803	\N	62c939cb-b652-4055-a64c-259e62385a63	COOK	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.179+02	2025-12-19 17:14:05.179+02
96a803b6-4894-4010-a2e3-fc9a19c3e2ee	DG093	\N	MASS	CHITIKI	\N	\N	205bdc41-4872-4a0d-9e68-295e41da3803	\N	a1c4d0ad-0f24-4a3e-84c5-ec4ad87c0b93	TEAM LEADER HOUSEKEEPING	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.18+02	2025-12-19 17:14:05.18+02
6462651b-ca4a-41ee-b64a-5ad65786ec9b	DG094	\N	GLADYS	CHIDANGURO	\N	\N	205bdc41-4872-4a0d-9e68-295e41da3803	\N	eeeb1613-db46-4076-bdd1-681d9e02dc90	HOUSEKEEPER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.182+02	2025-12-19 17:14:05.182+02
027f452b-3b18-41de-861e-80524716fd9f	DG095	\N	RANGANAI	MUKANDAVANHU	\N	\N	205bdc41-4872-4a0d-9e68-295e41da3803	\N	d19a0e95-4f49-4ae1-a122-2c8ccfa48888	LAUNDRY ATTENDANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.184+02	2025-12-19 17:14:05.184+02
ee5c304f-c813-4806-8e0e-8156dba2823e	DG099	\N	JIMMINIC	BUNGU	\N	\N	205bdc41-4872-4a0d-9e68-295e41da3803	\N	f71821d7-514b-4fb1-8f26-cd6417bc553d	TEAM LEADER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.185+02	2025-12-19 17:14:05.185+02
7982e52f-bca9-4325-beac-4028f1ca01cc	DG180	\N	TAFIRENYIKA	CHIMANIKIRE	\N	\N	205bdc41-4872-4a0d-9e68-295e41da3803	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.187+02	2025-12-19 17:14:05.187+02
209daece-f9dc-46aa-a1bb-2678a4f95394	DG206	\N	GUESFORD	CHIDENYIKA	\N	\N	205bdc41-4872-4a0d-9e68-295e41da3803	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.188+02	2025-12-19 17:14:05.188+02
7ce8c9ce-e1c1-402c-8787-4b4c287d3e56	DG236	\N	SILENT	BUNGU	\N	\N	205bdc41-4872-4a0d-9e68-295e41da3803	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.189+02	2025-12-19 17:14:05.189+02
87a496bb-1323-48aa-bb95-52df4021507c	DG290	\N	CHRISTOPHER	GARINGA	\N	\N	205bdc41-4872-4a0d-9e68-295e41da3803	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.191+02	2025-12-19 17:14:05.191+02
706c9086-d01d-4347-846b-0e1650986005	DG364	\N	RICHMORE	MAZHAMBE	\N	\N	205bdc41-4872-4a0d-9e68-295e41da3803	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.192+02	2025-12-19 17:14:05.192+02
471c0f1b-352b-4852-a07b-3091dac723a7	DG389	\N	SILENT	KAPIYA	\N	\N	205bdc41-4872-4a0d-9e68-295e41da3803	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.194+02	2025-12-19 17:14:05.194+02
04028035-00a4-4ce4-bf13-7117912bd6f7	DG399	\N	LUWESI	MANDIVAVARIRA	\N	\N	205bdc41-4872-4a0d-9e68-295e41da3803	\N	eeeb1613-db46-4076-bdd1-681d9e02dc90	HOUSEKEEPER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.195+02	2025-12-19 17:14:05.195+02
596119da-2718-44da-b4fd-eaa9caaf91eb	DG400	\N	GETRUDE	CHINYAMA	\N	\N	205bdc41-4872-4a0d-9e68-295e41da3803	\N	eeeb1613-db46-4076-bdd1-681d9e02dc90	HOUSEKEEPER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.197+02	2025-12-19 17:14:05.197+02
7e6aead1-d248-40e7-83bd-071d95eaa6bf	DG436	\N	ELIZARY	JACK	\N	\N	205bdc41-4872-4a0d-9e68-295e41da3803	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.198+02	2025-12-19 17:14:05.198+02
c16c90dd-a714-4544-b9b6-9c5a014650f7	DG454	\N	CLARA	MUSHONGA	\N	\N	205bdc41-4872-4a0d-9e68-295e41da3803	\N	d19a0e95-4f49-4ae1-a122-2c8ccfa48888	LAUNDRY ATTENDANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.2+02	2025-12-19 17:14:05.2+02
94115a0a-e7fb-4103-a405-1f317a963184	DG458	\N	SHARON	JENGENI	\N	\N	205bdc41-4872-4a0d-9e68-295e41da3803	\N	eeeb1613-db46-4076-bdd1-681d9e02dc90	HOUSEKEEPER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.202+02	2025-12-19 17:14:05.202+02
77210b5b-e467-4096-9020-70b723949c8f	DG459	\N	LILY	SITHOLE	\N	\N	205bdc41-4872-4a0d-9e68-295e41da3803	\N	62c939cb-b652-4055-a64c-259e62385a63	COOK	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.203+02	2025-12-19 17:14:05.203+02
abcf4704-f498-4110-9825-d8f9b4e5be27	DG460	\N	KURAUONE	GWANDE	\N	\N	205bdc41-4872-4a0d-9e68-295e41da3803	\N	62c939cb-b652-4055-a64c-259e62385a63	COOK	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.205+02	2025-12-19 17:14:05.205+02
c51e8d85-94a5-40b3-a5a1-21037cd25f6e	DG462	\N	SIMBARASHE	CHIMBAMBO	\N	\N	205bdc41-4872-4a0d-9e68-295e41da3803	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.206+02	2025-12-19 17:14:05.206+02
eccbba86-648c-4979-bd89-870b03f057ce	DG463	\N	ANGELINE	NYAMBO	\N	\N	205bdc41-4872-4a0d-9e68-295e41da3803	\N	eeeb1613-db46-4076-bdd1-681d9e02dc90	HOUSEKEEPER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.207+02	2025-12-19 17:14:05.207+02
2aff51e6-cf3e-46e8-aba8-b405191934d8	DG464	\N	MOREBLESSING	MAHASO	\N	\N	205bdc41-4872-4a0d-9e68-295e41da3803	\N	d19a0e95-4f49-4ae1-a122-2c8ccfa48888	LAUNDRY ATTENDANT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.209+02	2025-12-19 17:14:05.209+02
bdf0b281-2ff6-4528-a2f1-10b58e9fe1fa	DG518	\N	TRUSTER	GAUKA	\N	\N	205bdc41-4872-4a0d-9e68-295e41da3803	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.21+02	2025-12-19 17:14:05.21+02
e29a5ac6-ec0e-48e8-8162-21f16c57f14b	DG549	\N	LIANA	MANYIKA	\N	\N	205bdc41-4872-4a0d-9e68-295e41da3803	\N	eeeb1613-db46-4076-bdd1-681d9e02dc90	HOUSEKEEPER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.212+02	2025-12-19 17:14:05.212+02
7874bcd0-8044-4d03-951f-3dfab4d75bb7	DG599	\N	IGNATIOUS	NYAHUMA	\N	\N	205bdc41-4872-4a0d-9e68-295e41da3803	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.214+02	2025-12-19 17:14:05.214+02
82891c64-9987-4558-b6f1-2b77eb7bf3d9	DG653	\N	WESLEY	KONDO	\N	\N	205bdc41-4872-4a0d-9e68-295e41da3803	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.215+02	2025-12-19 17:14:05.215+02
1a1d4bb7-4ab5-44be-ad17-9c9db2ced89e	DG658	\N	LUXMORE	CHIRAPA	\N	\N	205bdc41-4872-4a0d-9e68-295e41da3803	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.217+02	2025-12-19 17:14:05.217+02
18e00ed9-ccbf-4610-9ba9-d279a7179a8b	DG660	\N	IGNATIOUS	THOMAS	\N	\N	205bdc41-4872-4a0d-9e68-295e41da3803	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.218+02	2025-12-19 17:14:05.218+02
762890a8-4214-44d3-8f29-3cccc8771acb	DG661	\N	INNOCENT	KADAIRA	\N	\N	205bdc41-4872-4a0d-9e68-295e41da3803	\N	1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.22+02	2025-12-19 17:14:05.22+02
5368d373-24cb-4d04-ae60-8d9362b3c270	DG662	\N	PRECIOUS	TONGOFA	\N	\N	205bdc41-4872-4a0d-9e68-295e41da3803	\N	0322168f-724e-4ebd-9371-1d9c8f3f9900	HOUSE KEEPER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.222+02	2025-12-19 17:14:05.222+02
072bbacf-4312-47e3-80ef-7ea4d38d9521	DG687	\N	AGATHA	KAWARA	\N	\N	205bdc41-4872-4a0d-9e68-295e41da3803	\N	0322168f-724e-4ebd-9371-1d9c8f3f9900	HOUSE KEEPER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.223+02	2025-12-19 17:14:05.223+02
2a909d5b-869a-4137-98d4-1c66d4ea41f4	DG715	\N	SHARON	KARASA	\N	\N	205bdc41-4872-4a0d-9e68-295e41da3803	\N	c075716a-e0f5-4882-9afb-a5c0b02e9d82	KITCHEN PORTER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.225+02	2025-12-19 17:14:05.225+02
799756ad-53b1-49be-84bc-d80c888e8b04	DG716	\N	THERESA	CHIKOYA	\N	\N	205bdc41-4872-4a0d-9e68-295e41da3803	\N	c075716a-e0f5-4882-9afb-a5c0b02e9d82	KITCHEN PORTER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.226+02	2025-12-19 17:14:05.226+02
0bb39932-cc7c-4371-a459-8d9d39109549	DG759	\N	LEARNMORE	MAFAIROSI	\N	\N	205bdc41-4872-4a0d-9e68-295e41da3803	\N	0322168f-724e-4ebd-9371-1d9c8f3f9900	HOUSE KEEPER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.228+02	2025-12-19 17:14:05.228+02
60413f3b-62eb-4e79-b25c-c28c57b0819c	DG768	\N	ELENA	MENAD	\N	\N	205bdc41-4872-4a0d-9e68-295e41da3803	\N	eeeb1613-db46-4076-bdd1-681d9e02dc90	HOUSEKEEPER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.229+02	2025-12-19 17:14:05.229+02
c4ab4b32-e88d-4fec-a330-408ad2d3f9c4	DG769	\N	TSITSI	CHAMBURUMBUDZA	\N	\N	205bdc41-4872-4a0d-9e68-295e41da3803	\N	eeeb1613-db46-4076-bdd1-681d9e02dc90	HOUSEKEEPER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.232+02	2025-12-19 17:14:05.232+02
791fbec2-e440-4c29-b007-c20713f333fd	DG783	\N	MILLICENT	MACHIPISA	\N	\N	205bdc41-4872-4a0d-9e68-295e41da3803	\N	62c939cb-b652-4055-a64c-259e62385a63	COOK	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.235+02	2025-12-19 17:14:05.235+02
31918180-c0e4-4b7a-961b-532b3b4bf3a3	DG785	\N	JOSEPHINE	MATYORAUTA	\N	\N	205bdc41-4872-4a0d-9e68-295e41da3803	\N	0322168f-724e-4ebd-9371-1d9c8f3f9900	HOUSE KEEPER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.237+02	2025-12-19 17:14:05.237+02
dd958a34-31b0-4aae-92b8-a82ae9adb2aa	DG786	\N	FOYLINE	MUTSVENGURI	\N	\N	205bdc41-4872-4a0d-9e68-295e41da3803	\N	0322168f-724e-4ebd-9371-1d9c8f3f9900	HOUSE KEEPER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.238+02	2025-12-19 17:14:05.238+02
3ba66f84-b748-4aa4-a8d9-43d4626e863d	DG002	\N	MARK	BANDERA	\N	\N	081b1436-35c4-4de6-9b1d-be6fa0f299f8	\N	03656c6d-17ad-4a51-a60d-ce388bb5de42	SENIOR STORES CLERK	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.24+02	2025-12-19 17:14:05.24+02
464eb6cc-32a7-4e7e-a864-d918299f9fb5	DG038	\N	TAMBURAI	RUWO	\N	\N	081b1436-35c4-4de6-9b1d-be6fa0f299f8	\N	5bdfd7cc-1077-4125-8fab-db24166bdec0	STORES CLERK	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.242+02	2025-12-19 17:14:05.242+02
46c7ba2d-863a-44d9-a7d3-a4941e0665c0	DG070	\N	JUSTICE	MAVUNGA	\N	\N	081b1436-35c4-4de6-9b1d-be6fa0f299f8	\N	5bdfd7cc-1077-4125-8fab-db24166bdec0	STORES CLERK	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.244+02	2025-12-19 17:14:05.244+02
3cdc372a-f3bb-4529-8274-7342d2334835	DG086	\N	RASHEED	SIMANI	\N	\N	081b1436-35c4-4de6-9b1d-be6fa0f299f8	\N	5bdfd7cc-1077-4125-8fab-db24166bdec0	STORES CLERK	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.245+02	2025-12-19 17:14:05.245+02
236ad8bd-9fed-4032-b2be-384c8dc1b3d5	DG197	\N	INNOCENT	WAMBE	\N	\N	081b1436-35c4-4de6-9b1d-be6fa0f299f8	\N	5bdfd7cc-1077-4125-8fab-db24166bdec0	STORES CLERK	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.247+02	2025-12-19 17:14:05.247+02
7c512222-ace6-4b79-9b16-0c6780854e14	DG240	\N	CALISTO	CHIBAGU	\N	\N	081b1436-35c4-4de6-9b1d-be6fa0f299f8	\N	990dd690-240b-48df-ae0f-291993719658	STOREKEEPER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.249+02	2025-12-19 17:14:05.249+02
06a104c4-00a9-42e9-9555-ca2d55cdcbeb	DG262	\N	ROBSON	CHINYAMA	\N	\N	081b1436-35c4-4de6-9b1d-be6fa0f299f8	\N	5bdfd7cc-1077-4125-8fab-db24166bdec0	STORES CLERK	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.251+02	2025-12-19 17:14:05.251+02
6b1e7def-06da-4fc7-965d-25015660ffec	DG341	\N	RAPHAEL	MASHONGANYIKA	\N	\N	081b1436-35c4-4de6-9b1d-be6fa0f299f8	\N	5bdfd7cc-1077-4125-8fab-db24166bdec0	STORES CLERK	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.252+02	2025-12-19 17:14:05.252+02
5b606b0b-831c-49f1-9a3e-ed1aff17d85a	DG366	\N	MAXWELL	MUFENGI	\N	\N	081b1436-35c4-4de6-9b1d-be6fa0f299f8	\N	5bdfd7cc-1077-4125-8fab-db24166bdec0	STORES CLERK	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.254+02	2025-12-19 17:14:05.254+02
bab20108-114e-4aa8-9ad7-1c5cd8a27aed	DG404	\N	EUNICE	TARUVINGA	\N	\N	081b1436-35c4-4de6-9b1d-be6fa0f299f8	\N	03656c6d-17ad-4a51-a60d-ce388bb5de42	SENIOR STORES CLERK	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.256+02	2025-12-19 17:14:05.256+02
3f1106f9-ce70-4fe3-9dbe-53fb9caa74de	DG582	\N	CECIL	MARANGE	\N	\N	081b1436-35c4-4de6-9b1d-be6fa0f299f8	\N	5bdfd7cc-1077-4125-8fab-db24166bdec0	STORES CLERK	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.257+02	2025-12-19 17:14:05.257+02
83e11c64-59e1-4b47-89d6-59bb6a08b16e	DG075	\N	THEOPHELOUS	BHANDA	\N	\N	4cc15b4d-688d-40bb-9974-1b8340594027	\N	d9badb0a-ee1f-4224-a6d6-19279b86cfcb	APPRENTICE	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.259+02	2025-12-19 17:14:05.259+02
6dbadad0-2d36-430b-be24-17bbe15e0367	DG158	\N	PROSPER A	MATIBIRI	\N	\N	4cc15b4d-688d-40bb-9974-1b8340594027	\N	d9badb0a-ee1f-4224-a6d6-19279b86cfcb	APPRENTICE	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.261+02	2025-12-19 17:14:05.261+02
331b595d-165f-4202-b013-dfb6ad27be6b	DG320	\N	WELCOME	DHINGA	\N	\N	4cc15b4d-688d-40bb-9974-1b8340594027	\N	d9badb0a-ee1f-4224-a6d6-19279b86cfcb	APPRENTICE	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.262+02	2025-12-19 17:14:05.262+02
cfe37d9f-0be9-40c6-a98a-0f77f6ca03a4	DG346	\N	CALVIN	CHIFAMBA	\N	\N	4cc15b4d-688d-40bb-9974-1b8340594027	\N	d9badb0a-ee1f-4224-a6d6-19279b86cfcb	APPRENTICE	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.264+02	2025-12-19 17:14:05.264+02
1874665a-4bd9-47e6-a672-5acab2e71e23	DG488	\N	RONALD	TAULO	\N	\N	4cc15b4d-688d-40bb-9974-1b8340594027	\N	51e13703-0c27-4731-98aa-07d324e58b9c	APPRENTICE BOILERMAKER	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.265+02	2025-12-19 17:14:05.265+02
984ce8cb-f6ce-4031-98ae-c7916e5b443a	DG682	\N	FUNGISAI	MAZANI	\N	\N	4cc15b4d-688d-40bb-9974-1b8340594027	\N	d9badb0a-ee1f-4224-a6d6-19279b86cfcb	APPRENTICE	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.268+02	2025-12-19 17:14:05.268+02
204f415c-06d8-4f39-ba25-c447c54792ab	DG683	\N	ELIAS	MACHEKA	\N	\N	4cc15b4d-688d-40bb-9974-1b8340594027	\N	d9badb0a-ee1f-4224-a6d6-19279b86cfcb	APPRENTICE	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.271+02	2025-12-19 17:14:05.271+02
990652f8-be6c-4c90-841d-e60ab1f9e0e9	DG684	\N	TANDIRAYI	CHIGWESHE	\N	\N	4cc15b4d-688d-40bb-9974-1b8340594027	\N	d9badb0a-ee1f-4224-a6d6-19279b86cfcb	APPRENTICE	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.272+02	2025-12-19 17:14:05.272+02
e018d208-811f-4021-a6af-91630c9ec904	DG685	\N	BYL	MANYANGE	\N	\N	4cc15b4d-688d-40bb-9974-1b8340594027	\N	d9badb0a-ee1f-4224-a6d6-19279b86cfcb	APPRENTICE	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.274+02	2025-12-19 17:14:05.274+02
a098b454-1221-4988-9610-df2ea61cc2c4	DG686	\N	TAKUNDA	MAZARA	\N	\N	4cc15b4d-688d-40bb-9974-1b8340594027	\N	d9badb0a-ee1f-4224-a6d6-19279b86cfcb	APPRENTICE	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.275+02	2025-12-19 17:14:05.275+02
8099aac1-27c9-4018-af74-1c39fa9ad432	DG747	\N	CEPHAS	MAIMBE	\N	\N	4cc15b4d-688d-40bb-9974-1b8340594027	\N	e3e9c8dc-1889-487b-9e21-33e030132fac	STUDENT ON ATTACHEMENT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.277+02	2025-12-19 17:14:05.277+02
2397bb09-5f07-4cab-92f3-a0e8824eebc7	DG750	\N	CONSTANCE	MAKUNDE	\N	\N	4cc15b4d-688d-40bb-9974-1b8340594027	\N	e3e9c8dc-1889-487b-9e21-33e030132fac	STUDENT ON ATTACHEMENT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.279+02	2025-12-19 17:14:05.279+02
a4a9b924-62da-4637-9929-4c9743811edd	DG751	\N	GILBERT	ZENGEYA	\N	\N	4cc15b4d-688d-40bb-9974-1b8340594027	\N	e3e9c8dc-1889-487b-9e21-33e030132fac	STUDENT ON ATTACHEMENT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.282+02	2025-12-19 17:14:05.282+02
7016ba26-2523-4ad9-b2cd-c831a2d6f2bc	DG752	\N	TRACEY	BHENHURA	\N	\N	4cc15b4d-688d-40bb-9974-1b8340594027	\N	e3e9c8dc-1889-487b-9e21-33e030132fac	STUDENT ON ATTACHEMENT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.284+02	2025-12-19 17:14:05.284+02
78714831-2f4e-455b-8a1d-aaab3c95a010	DG753	\N	TANAKA	NGWARU	\N	\N	4cc15b4d-688d-40bb-9974-1b8340594027	\N	e3e9c8dc-1889-487b-9e21-33e030132fac	STUDENT ON ATTACHEMENT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.287+02	2025-12-19 17:14:05.287+02
81737544-1860-4cd6-8dc2-8c21e3a466f4	DG754	\N	MANUEL	ARUBINU	\N	\N	4cc15b4d-688d-40bb-9974-1b8340594027	\N	e3e9c8dc-1889-487b-9e21-33e030132fac	STUDENT ON ATTACHEMENT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.289+02	2025-12-19 17:14:05.289+02
8e326834-dcb6-493f-a59a-ef4781c9e10c	DG755	\N	LEVONIA	MUNOCHIWEYI	\N	\N	4cc15b4d-688d-40bb-9974-1b8340594027	\N	e3e9c8dc-1889-487b-9e21-33e030132fac	STUDENT ON ATTACHEMENT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.292+02	2025-12-19 17:14:05.292+02
0fb6fdda-d828-49f9-afb2-cd2b773040db	DG756	\N	ANESU	TENENE	\N	\N	4cc15b4d-688d-40bb-9974-1b8340594027	\N	e3e9c8dc-1889-487b-9e21-33e030132fac	STUDENT ON ATTACHEMENT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.294+02	2025-12-19 17:14:05.294+02
55e4775a-46ce-4057-b6cf-c3756e129226	DG762	\N	MUFARO	MADZVAMUSE	\N	\N	4cc15b4d-688d-40bb-9974-1b8340594027	\N	ca218d87-cdb7-4f89-8dbd-d20ab1687987	STUDENT ON ATTACHMENT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.296+02	2025-12-19 17:14:05.296+02
10c9a4bb-2a53-4fbf-9256-82ad1a3686b1	DG764	\N	DONALD	GATSI	\N	\N	4cc15b4d-688d-40bb-9974-1b8340594027	\N	ca218d87-cdb7-4f89-8dbd-d20ab1687987	STUDENT ON ATTACHMENT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.297+02	2025-12-19 17:14:05.297+02
0e2416aa-234a-4262-902a-052b52107d60	DG765	\N	ASHGRACE	DZURO	\N	\N	4cc15b4d-688d-40bb-9974-1b8340594027	\N	ca218d87-cdb7-4f89-8dbd-d20ab1687987	STUDENT ON ATTACHMENT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.299+02	2025-12-19 17:14:05.299+02
10e1a998-8fb7-433e-932c-6e9ca89cc650	DG766	\N	MOTION	MUSARURWA	\N	\N	4cc15b4d-688d-40bb-9974-1b8340594027	\N	ca218d87-cdb7-4f89-8dbd-d20ab1687987	STUDENT ON ATTACHMENT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.3+02	2025-12-19 17:14:05.3+02
44892908-c91d-4a31-95b8-750716fbcd69	DG767	\N	DADISO	DHLEMBEU	\N	\N	4cc15b4d-688d-40bb-9974-1b8340594027	\N	ca218d87-cdb7-4f89-8dbd-d20ab1687987	STUDENT ON ATTACHMENT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.302+02	2025-12-19 17:14:05.302+02
d79b8cc1-a176-4588-b202-fca55ce41195	DG777	\N	TADIWANASHE	MAKULUNGA	\N	\N	4cc15b4d-688d-40bb-9974-1b8340594027	\N	ca218d87-cdb7-4f89-8dbd-d20ab1687987	STUDENT ON ATTACHMENT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.303+02	2025-12-19 17:14:05.303+02
f3be3d8e-e8bb-46c4-9f22-23c6f88492df	DG779	\N	SHINGIRIRAI	NDLOVU	\N	\N	4cc15b4d-688d-40bb-9974-1b8340594027	\N	ca218d87-cdb7-4f89-8dbd-d20ab1687987	STUDENT ON ATTACHMENT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.305+02	2025-12-19 17:14:05.305+02
c9d2749b-5506-4b8f-8058-6ea87e8d3dce	DG780	\N	TENDAI	KADYE	\N	\N	4cc15b4d-688d-40bb-9974-1b8340594027	\N	ca218d87-cdb7-4f89-8dbd-d20ab1687987	STUDENT ON ATTACHMENT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.306+02	2025-12-19 17:14:05.306+02
581a63a2-4c51-4589-b336-c5431549cb41	DG781	\N	DESMOND	KUMHANDA	\N	\N	4cc15b4d-688d-40bb-9974-1b8340594027	\N	ca218d87-cdb7-4f89-8dbd-d20ab1687987	STUDENT ON ATTACHMENT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.308+02	2025-12-19 17:14:05.308+02
a41a5059-07a3-4934-806b-1b6a061e2693	DG782	\N	TIVAKUDZE	MAREGERE	\N	\N	4cc15b4d-688d-40bb-9974-1b8340594027	\N	ca218d87-cdb7-4f89-8dbd-d20ab1687987	STUDENT ON ATTACHMENT	NEC	MALE	ACTIVE	\N	\N	t	2025-12-19 17:14:05.31+02	2025-12-19 17:14:05.31+02
\.


--
-- TOC entry 5154 (class 0 OID 18389)
-- Dependencies: 239
-- Data for Name: failure_reports; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.failure_reports (id, employee_id, ppe_item_id, allocation_id, stock_id, replacement_stock_id, description, failure_type, observed_at, reported_date, failure_date, brand, remarks, reviewed_by_s_h_e_q, sheq_decision, sheq_review_date, action_taken, severity, status, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5157 (class 0 OID 18467)
-- Dependencies: 242
-- Data for Name: forecasts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.forecasts (id, period_year, period_quarter, forecast_quantity, actual_quantity, variance, notes, created_at, updated_at, department_id, ppe_item_id) FROM stdin;
\.


--
-- TOC entry 5146 (class 0 OID 18063)
-- Dependencies: 231
-- Data for Name: job_title_ppe_matrix; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.job_title_ppe_matrix (id, "jobTitleId", job_title, ppe_item_id, quantity_required, replacement_frequency, heavy_use_frequency, is_mandatory, category, notes, is_active, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5140 (class 0 OID 17932)
-- Dependencies: 225
-- Data for Name: job_titles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.job_titles (id, name, code, description, "sectionId", "isActive", "createdAt", "updatedAt") FROM stdin;
79acaffa-2ea1-43cf-be1a-2d814d403c6c	LABORATORY TECHNICIAN	\N	\N	eac91c5a-45aa-48e6-9da0-e8d6abc4ee40	t	2025-12-19 17:11:51.816+02	2025-12-19 17:11:51.816+02
71cb42b5-e76d-43e6-b245-607b48fdcbd8	MINE ASSAYER	\N	\N	eac91c5a-45aa-48e6-9da0-e8d6abc4ee40	t	2025-12-19 17:11:51.833+02	2025-12-19 17:11:51.833+02
bf21784f-0a93-4e67-87b3-3661cf03d53f	LABORATORY ASSISTANT	\N	\N	eac91c5a-45aa-48e6-9da0-e8d6abc4ee40	t	2025-12-19 17:11:51.836+02	2025-12-19 17:11:51.836+02
b0921c81-6712-4796-9fdd-2738911420e2	CHARGEHAND BUILDERS	\N	\N	5e6a2ece-98b5-48fb-9e0d-d6df5aea47a0	t	2025-12-19 17:11:51.839+02	2025-12-19 17:11:51.839+02
da44121b-f28b-49db-8ec5-549cf7955b2d	CARPENTER CLASS 1	\N	\N	5e6a2ece-98b5-48fb-9e0d-d6df5aea47a0	t	2025-12-19 17:11:51.843+02	2025-12-19 17:11:51.843+02
9de6a99a-c8a2-46e9-b20f-ffe839ae34a6	CIVILS SUPERVISOR	\N	\N	5e6a2ece-98b5-48fb-9e0d-d6df5aea47a0	t	2025-12-19 17:11:51.846+02	2025-12-19 17:11:51.846+02
1a1b6dda-05ea-4abb-9a40-69024df632c2	BUILDER	\N	\N	5e6a2ece-98b5-48fb-9e0d-d6df5aea47a0	t	2025-12-19 17:11:51.848+02	2025-12-19 17:11:51.848+02
eac5cccd-4b69-45be-ab7d-f6b924539d5e	SEMI-SKILLED BUILDER	\N	\N	5e6a2ece-98b5-48fb-9e0d-d6df5aea47a0	t	2025-12-19 17:11:51.85+02	2025-12-19 17:11:51.85+02
e80932e6-1da0-44a1-ba67-4b1fb3fbf035	SEMI- SKILLED BUILDER	\N	\N	5e6a2ece-98b5-48fb-9e0d-d6df5aea47a0	t	2025-12-19 17:11:51.853+02	2025-12-19 17:11:51.853+02
739e4769-0ca7-41e7-9ab9-8debe3f4db8d	SEMI- SKILLED CARPENTER	\N	\N	5e6a2ece-98b5-48fb-9e0d-d6df5aea47a0	t	2025-12-19 17:11:51.855+02	2025-12-19 17:11:51.855+02
c7accd3d-94f1-4533-87ff-26f728822da7	SCAFFOLDERS ASSISTANT	\N	\N	5e6a2ece-98b5-48fb-9e0d-d6df5aea47a0	t	2025-12-19 17:11:51.857+02	2025-12-19 17:11:51.857+02
1d801213-add2-4793-b0f0-9f9afee9e5ae	GENERAL HAND	\N	\N	5e6a2ece-98b5-48fb-9e0d-d6df5aea47a0	t	2025-12-19 17:11:51.859+02	2025-12-19 17:11:51.859+02
bc0bc6d8-f9ad-476d-ae4c-482a0d3eb73d	ELECTRICIAN CLASS 1	\N	\N	b0d59194-4032-43c3-a0ca-fedcbf0fa95b	t	2025-12-19 17:11:51.861+02	2025-12-19 17:11:51.861+02
63c8e80e-eeec-47e6-9d6b-4dca73a14e66	ELECTRICIAN CLASS 2	\N	\N	b0d59194-4032-43c3-a0ca-fedcbf0fa95b	t	2025-12-19 17:11:51.864+02	2025-12-19 17:11:51.864+02
4632b563-0a7b-48cb-b441-2b3c2d0e05dd	SENIOR ELECTRICAL AND INSTRUMENTATION SUPT	\N	\N	b0d59194-4032-43c3-a0ca-fedcbf0fa95b	t	2025-12-19 17:11:51.866+02	2025-12-19 17:11:51.866+02
07ab03e3-6eb9-4bd6-9b6b-6ceddd969e6c	CHARGEHAND INSTRUMENTATION	\N	\N	b0d59194-4032-43c3-a0ca-fedcbf0fa95b	t	2025-12-19 17:11:51.868+02	2025-12-19 17:11:51.868+02
0a321d52-54d6-49d9-9153-76ad554e9874	CHARGEHAND ELECTRICAL	\N	\N	b0d59194-4032-43c3-a0ca-fedcbf0fa95b	t	2025-12-19 17:11:51.87+02	2025-12-19 17:11:51.87+02
7d53cbc0-d46e-4c6a-82af-6396744e9fc7	JUNIOR ELECTRICAL ENGINEER	\N	\N	b0d59194-4032-43c3-a0ca-fedcbf0fa95b	t	2025-12-19 17:11:51.872+02	2025-12-19 17:11:51.872+02
0c0bbbef-1c65-4d48-8531-a07ee5899b7f	ELECTRICAL MANAGER	\N	\N	b0d59194-4032-43c3-a0ca-fedcbf0fa95b	t	2025-12-19 17:11:51.875+02	2025-12-19 17:11:51.875+02
ccd2d0d7-c88c-4967-b10a-dd7af30c8dfd	JUNIOR INSTRUMENTATION ENGINEER	\N	\N	b0d59194-4032-43c3-a0ca-fedcbf0fa95b	t	2025-12-19 17:11:51.877+02	2025-12-19 17:11:51.877+02
9f6f10c6-8b93-482f-8e3b-edc080321727	INSTRUMENTATION TECHNICIAN	\N	\N	b0d59194-4032-43c3-a0ca-fedcbf0fa95b	t	2025-12-19 17:11:51.879+02	2025-12-19 17:11:51.879+02
50afc310-6afb-4267-9253-4171ca714806	INSTRUMENTATION TECHNICAN	\N	\N	b0d59194-4032-43c3-a0ca-fedcbf0fa95b	t	2025-12-19 17:11:51.881+02	2025-12-19 17:11:51.881+02
c73b3448-778b-4b92-bc9c-f414d6410874	ELECTRICIAN ASSISTANT	\N	\N	b0d59194-4032-43c3-a0ca-fedcbf0fa95b	t	2025-12-19 17:11:51.883+02	2025-12-19 17:11:51.883+02
7e77cd4f-2f12-4b87-900d-e6c44be39a35	SEMI- SKILLED ELECTRICIAN	\N	\N	b0d59194-4032-43c3-a0ca-fedcbf0fa95b	t	2025-12-19 17:11:51.887+02	2025-12-19 17:11:51.887+02
6425480b-759e-45ff-bbcd-e73fcf77763e	ELECTRICAL ASSISTANT	\N	\N	b0d59194-4032-43c3-a0ca-fedcbf0fa95b	t	2025-12-19 17:11:51.889+02	2025-12-19 17:11:51.889+02
228ea372-bd80-41c2-9dd0-01617daef6ff	INSTRUMENTS TECHS ASSISTANT	\N	\N	b0d59194-4032-43c3-a0ca-fedcbf0fa95b	t	2025-12-19 17:11:51.891+02	2025-12-19 17:11:51.891+02
015d98ff-de23-4a41-a20b-311c6b84db63	INSTRUMENTATIONS ASSISTANT	\N	\N	b0d59194-4032-43c3-a0ca-fedcbf0fa95b	t	2025-12-19 17:11:51.893+02	2025-12-19 17:11:51.893+02
dc699168-c1a2-430a-a0c0-437fab27a1b4	FITTER CLASS 1	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	t	2025-12-19 17:11:51.896+02	2025-12-19 17:11:51.896+02
eb554793-1852-4ce2-bc51-9e7f005a623e	FITTER CLASS 2	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	t	2025-12-19 17:11:51.898+02	2025-12-19 17:11:51.898+02
14c6a99e-2369-4e1d-ab12-2bded166ac14	DRY PLANT FOREMAN	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	t	2025-12-19 17:11:51.901+02	2025-12-19 17:11:51.901+02
28fcfb02-74be-4afb-9b85-6fffe3ce141d	PLUMBER CLASS 1	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	t	2025-12-19 17:11:51.903+02	2025-12-19 17:11:51.903+02
83d22ab8-2995-4468-b372-08c5cfeabd79	PLUMBER CLASS 2	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	t	2025-12-19 17:11:51.905+02	2025-12-19 17:11:51.905+02
941e6118-10a8-49cc-a3ff-bd1e78f8a096	STRUCTURAL FITTING FOREMAN	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	t	2025-12-19 17:11:51.908+02	2025-12-19 17:11:51.908+02
01273f7e-f46c-4201-b919-71f194c1d8a5	MAINTENANCE ENGINEER	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	t	2025-12-19 17:11:51.911+02	2025-12-19 17:11:51.911+02
55ed0a5b-6eeb-4b20-b5f6-659d0af08d04	BELTS MAN	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	t	2025-12-19 17:11:51.913+02	2025-12-19 17:11:51.913+02
115bcb1a-8d05-45b5-bfb4-a56998307722	MECHANICAL MANAGER	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	t	2025-12-19 17:11:51.915+02	2025-12-19 17:11:51.915+02
09f3960a-d90c-4dcf-a247-e647b9cbf5a9	ASSISTANT MECHANICAL ENGINEER	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	t	2025-12-19 17:11:51.917+02	2025-12-19 17:11:51.917+02
0f81b4f9-d0d0-490b-a509-48660127ecb3	JUNIOR MECHANICAL ENGINEER	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	t	2025-12-19 17:11:51.919+02	2025-12-19 17:11:51.919+02
b0a9c63e-337e-4aa7-a899-0f871db3727c	CHARGEHAND	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	t	2025-12-19 17:11:51.923+02	2025-12-19 17:11:51.923+02
67d1e694-1563-49c1-9835-d1cdea6793a8	CHARGE HAND FITTING WET PLANT	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	t	2025-12-19 17:11:51.925+02	2025-12-19 17:11:51.925+02
473805b6-6074-4904-859a-ddbc5f35dcd6	BOILERMAKER CLASS 1	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	t	2025-12-19 17:11:51.927+02	2025-12-19 17:11:51.927+02
89d273db-35fc-4497-8de4-dd14edbad3a3	CHARGEHAND BOILERMAKERS	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	t	2025-12-19 17:11:51.929+02	2025-12-19 17:11:51.929+02
9048c0e6-4d0b-47f3-8ab9-48612776b68c	WELDER CLASS 1	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	t	2025-12-19 17:11:51.931+02	2025-12-19 17:11:51.931+02
5a983167-e50d-4e9e-96d9-7d15ff6f55e8	BOILER MAKER	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	t	2025-12-19 17:11:51.933+02	2025-12-19 17:11:51.933+02
f1c68327-6ec2-4aeb-9403-cadc89f32ece	CODED WELDER	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	t	2025-12-19 17:11:51.936+02	2025-12-19 17:11:51.936+02
f77450bc-bed8-4292-90c1-225dd294861b	FABRICATION FOREMAN	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	t	2025-12-19 17:11:51.938+02	2025-12-19 17:11:51.938+02
1a51ebd5-e5c7-4471-a0bd-cf56fe2ed791	FITTERS ASSISTANT	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	t	2025-12-19 17:11:51.94+02	2025-12-19 17:11:51.94+02
382d3303-066c-4502-bb0a-6a58a287ea5f	FITTER ASSISTANT	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	t	2025-12-19 17:11:51.942+02	2025-12-19 17:11:51.942+02
e2471c1e-3e57-4759-9f90-ddd2601015bd	PLUMBER ASSISTANT	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	t	2025-12-19 17:11:51.944+02	2025-12-19 17:11:51.944+02
5d2686f8-48cd-4fe6-b4ba-8c88f03608fb	BOILERMAKER ASSISTANT	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	t	2025-12-19 17:11:51.946+02	2025-12-19 17:11:51.946+02
88f28cfc-d8e6-499f-8e27-5d8424b3831e	BOILERMAKERS ASSISTANT	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	t	2025-12-19 17:11:51.948+02	2025-12-19 17:11:51.948+02
98b6af80-d520-4120-9ee2-309f847ecbdb	SCAFFOLDER ASSISTANT	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	t	2025-12-19 17:11:51.95+02	2025-12-19 17:11:51.95+02
406f9783-fa62-4370-970c-06c0f395d3ca	SCAFFOLDER	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	t	2025-12-19 17:11:51.952+02	2025-12-19 17:11:51.952+02
8d78a9ea-dc73-45a1-a9fa-8b4c16d0c3bf	SEMI SKILLED PAINTER	\N	\N	458a959e-8e06-40ae-9a90-13eff2315307	t	2025-12-19 17:11:51.954+02	2025-12-19 17:11:51.954+02
664204e3-2d60-4c35-8b2c-70e23de7d778	DRAUGHTSMAN	\N	\N	792c13ed-aa0e-42cd-9743-0553edaf8caf	t	2025-12-19 17:11:51.956+02	2025-12-19 17:11:51.956+02
d8280bdd-f7ed-47cd-afac-178debbe73af	MAINTENANCE PLANNER	\N	\N	792c13ed-aa0e-42cd-9743-0553edaf8caf	t	2025-12-19 17:11:51.959+02	2025-12-19 17:11:51.959+02
b00c838e-f371-43fa-9699-65b8ed179b1e	MAINTENANCE MANAGER	\N	\N	792c13ed-aa0e-42cd-9743-0553edaf8caf	t	2025-12-19 17:11:51.961+02	2025-12-19 17:11:51.961+02
83c33380-1886-4670-bd82-70245cd4f4a1	PLANNING FOREMAN	\N	\N	792c13ed-aa0e-42cd-9743-0553edaf8caf	t	2025-12-19 17:11:51.963+02	2025-12-19 17:11:51.963+02
6972f246-6dbc-41fb-a3b1-4fe5e57f54aa	JUNIOR PLANNING ENGINEER	\N	\N	792c13ed-aa0e-42cd-9743-0553edaf8caf	t	2025-12-19 17:11:51.965+02	2025-12-19 17:11:51.965+02
6e7e2e25-edca-43dc-a349-b91b6dede17b	PLANNING CLERK	\N	\N	e5bcca7e-5880-43ad-a183-7835512e1f6b	t	2025-12-19 17:11:51.967+02	2025-12-19 17:11:51.967+02
801e6043-456c-41d6-984a-b32607a20065	CLASS 2 DRIVER	\N	\N	e5bcca7e-5880-43ad-a183-7835512e1f6b	t	2025-12-19 17:11:51.969+02	2025-12-19 17:11:51.969+02
623a72b2-17e8-4985-8159-b8f845556c57	STANDBY DRIVER	\N	\N	e5bcca7e-5880-43ad-a183-7835512e1f6b	t	2025-12-19 17:11:51.972+02	2025-12-19 17:11:51.972+02
66b16ec3-19b0-42f6-baa9-b24ccc553415	RIGGER CLASS 1	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	t	2025-12-19 17:11:51.974+02	2025-12-19 17:11:51.974+02
dd50a4d5-172a-4351-843d-875c1dd1e800	TRANSPORT & SERVICES MANAGER	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	t	2025-12-19 17:11:51.976+02	2025-12-19 17:11:51.976+02
3638a67b-8280-4dfc-afed-1acb1d310aa7	TRANSPORT AND SERVICES CHARGE HAND	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	t	2025-12-19 17:11:51.978+02	2025-12-19 17:11:51.978+02
2e26ad94-49dc-4a7d-bab4-e053d2756496	AUTO ELECTRICIAN CLASS 1	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	t	2025-12-19 17:11:51.981+02	2025-12-19 17:11:51.981+02
3ee503b5-6b8c-49c7-99c0-4f8d04a4803f	DIESEL PLANT FITTER	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	t	2025-12-19 17:11:51.983+02	2025-12-19 17:11:51.983+02
afe4c3df-c7c5-42e9-bdd0-6cf23bb68958	TRACTOR DRIVER	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	t	2025-12-19 17:11:51.985+02	2025-12-19 17:11:51.985+02
77851f26-72cb-445b-8552-c28c62fe2f8d	UD TRUCK DRIVER	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	t	2025-12-19 17:11:51.988+02	2025-12-19 17:11:51.988+02
05314472-c9e1-4b2e-8b53-6af4cffcf710	TLB OPERATOR	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	t	2025-12-19 17:11:51.99+02	2025-12-19 17:11:51.99+02
2e532a4a-0a20-485a-a72b-86ea0e8eef36	EXCAVATOR OPERATOR	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	t	2025-12-19 17:11:51.992+02	2025-12-19 17:11:51.992+02
cee35ef0-78a5-4c48-aa9c-e9530483b63e	FRONT END LOADER OPERATOR	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	t	2025-12-19 17:11:51.994+02	2025-12-19 17:11:51.994+02
d76b2edf-84eb-4aa1-9b11-46347b11ebdc	FEL OPERATOR	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	t	2025-12-19 17:11:51.997+02	2025-12-19 17:11:51.997+02
2458be29-797b-4653-9714-ede46d5ef8f8	CRANE OPERATOR	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	t	2025-12-19 17:11:51.999+02	2025-12-19 17:11:51.999+02
bd2c7343-7ff8-4a85-84ef-c3ed45bbed1c	MOBIL CRANE OPERATOR	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	t	2025-12-19 17:11:52.001+02	2025-12-19 17:11:52.001+02
8f31e725-99eb-439a-8427-e4e0ea285946	BUS DRIVER	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	t	2025-12-19 17:11:52.003+02	2025-12-19 17:11:52.003+02
f0a59a8c-4138-4519-adda-36d17e0b2775	CLASS 1 BUS DRIVER	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	t	2025-12-19 17:11:52.006+02	2025-12-19 17:11:52.006+02
562ff024-8913-43ef-85eb-086432c1a2da	UD CLASS 2 DRIVER	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	t	2025-12-19 17:11:52.008+02	2025-12-19 17:11:52.008+02
13e2c170-2d59-4ce0-898b-1276225e2ac7	TELEHANDLER OPERATOR	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	t	2025-12-19 17:11:52.01+02	2025-12-19 17:11:52.01+02
dbb4bb7f-5495-4342-8996-dece10210e0c	ASSISTANT PLUMBER	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	t	2025-12-19 17:11:52.012+02	2025-12-19 17:11:52.012+02
91059145-3a29-4a46-96b3-1fbbde75ebba	PLUMBERS ASSISTANT	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	t	2025-12-19 17:11:52.014+02	2025-12-19 17:11:52.014+02
aa7f82b8-074f-4d93-b2af-d64a9eb25632	SEMI SKILLED PLUMBER	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	t	2025-12-19 17:11:52.016+02	2025-12-19 17:11:52.016+02
6bbbab01-3639-43aa-9944-3738712d955b	WORKSHOP ASSISTANT	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	t	2025-12-19 17:11:52.021+02	2025-12-19 17:11:52.021+02
68a3a831-4113-4e07-9eeb-ade37db5ac81	WORKSHOP CLERK	\N	\N	34eab813-5d62-4c29-9bd9-ed0da7b573c5	t	2025-12-19 17:11:52.023+02	2025-12-19 17:11:52.023+02
48ab8cd4-ee70-477e-80db-7b775d72402a	CIVIL ENGINEER	\N	\N	29d8843a-cc16-40e0-9b42-c07ff46e5688	t	2025-12-19 17:11:52.026+02	2025-12-19 17:11:52.026+02
753f2068-f1c8-4a71-bab1-b5a625157ba9	CIVIL TECHNICIAN TSF	\N	\N	29d8843a-cc16-40e0-9b42-c07ff46e5688	t	2025-12-19 17:11:52.028+02	2025-12-19 17:11:52.028+02
f71821d7-514b-4fb1-8f26-cd6417bc553d	TEAM LEADER	\N	\N	29d8843a-cc16-40e0-9b42-c07ff46e5688	t	2025-12-19 17:11:52.031+02	2025-12-19 17:11:52.031+02
e9ee7e23-fe6f-4c0a-8f16-5fd036170968	DRIVER	\N	\N	29d8843a-cc16-40e0-9b42-c07ff46e5688	t	2025-12-19 17:11:52.033+02	2025-12-19 17:11:52.033+02
36c80274-f976-4251-a1b9-33943692251c	CLASS 4 DRIVER	\N	\N	29d8843a-cc16-40e0-9b42-c07ff46e5688	t	2025-12-19 17:11:52.036+02	2025-12-19 17:11:52.036+02
82fb52ee-e32e-4bf2-849d-7cd80d087b50	MINING ENGINEER	\N	\N	8da1877a-6619-40d7-bd19-073b5458ebba	t	2025-12-19 17:11:52.039+02	2025-12-19 17:11:52.039+02
d1b4a120-b662-41cd-8f4b-ec2591e4e30d	SENIOR MINING ENGINEER	\N	\N	8da1877a-6619-40d7-bd19-073b5458ebba	t	2025-12-19 17:11:52.041+02	2025-12-19 17:11:52.041+02
9ba7d7d4-6714-451c-a843-c3527358885e	SENIOR PIT SUPERINTENDENT	\N	\N	8da1877a-6619-40d7-bd19-073b5458ebba	t	2025-12-19 17:11:52.044+02	2025-12-19 17:11:52.044+02
ee752732-04ae-4b2c-9018-a7c7062b4998	PIT SUPERINTENDENT	\N	\N	8da1877a-6619-40d7-bd19-073b5458ebba	t	2025-12-19 17:11:52.048+02	2025-12-19 17:11:52.048+02
76ecf0ea-e6ed-4def-b656-19536260eb07	JUNIOR PIT SUPERINTENDENT	\N	\N	8da1877a-6619-40d7-bd19-073b5458ebba	t	2025-12-19 17:11:52.05+02	2025-12-19 17:11:52.05+02
7674d439-fa55-45d9-a3dd-8597dac44bfa	MINING MANAGER	\N	\N	8da1877a-6619-40d7-bd19-073b5458ebba	t	2025-12-19 17:11:52.053+02	2025-12-19 17:11:52.053+02
bd631535-40ee-4f70-bc90-2b1d5639a352	EXPLORATION GEOLOGICAL TECHNICIAN	\N	\N	7f81cf21-8c79-49de-ad6a-1a196327c1d5	t	2025-12-19 17:11:52.055+02	2025-12-19 17:11:52.055+02
8a7386bc-905d-4970-8258-3230d1ac22cf	EXPLORATION PROJECT MANAGER	\N	\N	7f81cf21-8c79-49de-ad6a-1a196327c1d5	t	2025-12-19 17:11:52.057+02	2025-12-19 17:11:52.057+02
4096d053-e939-474f-b6ec-c2f5bc9c3532	EXPLORATION GEOLOGIST	\N	\N	7f81cf21-8c79-49de-ad6a-1a196327c1d5	t	2025-12-19 17:11:52.06+02	2025-12-19 17:11:52.06+02
34a6290c-2a71-429c-a556-9c3935d2b4aa	DATABASE ADMINISTRATOR	\N	\N	7f81cf21-8c79-49de-ad6a-1a196327c1d5	t	2025-12-19 17:11:52.062+02	2025-12-19 17:11:52.062+02
772c0efb-14d0-462b-9c69-dbea7b789633	GEOLOGICAL TECHNICIAN	\N	\N	7f81cf21-8c79-49de-ad6a-1a196327c1d5	t	2025-12-19 17:11:52.064+02	2025-12-19 17:11:52.064+02
e37e84a9-d30b-4fc2-b5ca-853d876bb239	RESIDENT GEOLOGIST	\N	\N	7f81cf21-8c79-49de-ad6a-1a196327c1d5	t	2025-12-19 17:11:52.067+02	2025-12-19 17:11:52.067+02
20731258-8d4c-41ff-a7ab-63882c328a1c	JUNIOR GEOLOGIST	\N	\N	7f81cf21-8c79-49de-ad6a-1a196327c1d5	t	2025-12-19 17:11:52.069+02	2025-12-19 17:11:52.069+02
40483db0-f87c-4e04-851a-85d63a7e546c	GEOLOGIST	\N	\N	7f81cf21-8c79-49de-ad6a-1a196327c1d5	t	2025-12-19 17:11:52.072+02	2025-12-19 17:11:52.072+02
66cef3fa-e46b-47eb-bccf-401eab562bf8	CORE SHED ATTENDANT	\N	\N	7f81cf21-8c79-49de-ad6a-1a196327c1d5	t	2025-12-19 17:11:52.074+02	2025-12-19 17:11:52.074+02
d420302b-40c4-49a5-9724-3cfed908a9e8	TRAINEE GEO TECH	\N	\N	7f81cf21-8c79-49de-ad6a-1a196327c1d5	t	2025-12-19 17:11:52.077+02	2025-12-19 17:11:52.077+02
bd19895a-59f9-456e-9ad1-d52beaf7c548	SAMPLER	\N	\N	7f81cf21-8c79-49de-ad6a-1a196327c1d5	t	2025-12-19 17:11:52.079+02	2025-12-19 17:11:52.079+02
1c295936-886d-4e53-bdc0-74b274f2e95b	SAMPLER RC DRILLING	\N	\N	7f81cf21-8c79-49de-ad6a-1a196327c1d5	t	2025-12-19 17:11:52.081+02	2025-12-19 17:11:52.081+02
1587e1bf-de5d-4f3f-892e-5c4f6e435b1b	SAMPLER (RC DRILLING)	\N	\N	7f81cf21-8c79-49de-ad6a-1a196327c1d5	t	2025-12-19 17:11:52.084+02	2025-12-19 17:11:52.084+02
ae4dbeca-ee18-43dd-99b9-90017917e3f5	RC SAMPLER	\N	\N	7f81cf21-8c79-49de-ad6a-1a196327c1d5	t	2025-12-19 17:11:52.086+02	2025-12-19 17:11:52.086+02
44ee1d5a-49a7-4d7a-aeb5-898a826496a6	DATA CAPTURE CLERK	\N	\N	7f81cf21-8c79-49de-ad6a-1a196327c1d5	t	2025-12-19 17:11:52.09+02	2025-12-19 17:11:52.09+02
16d46958-376b-40d6-b129-dc7484340541	DRILL RIG ASSISTANT	\N	\N	7f81cf21-8c79-49de-ad6a-1a196327c1d5	t	2025-12-19 17:11:52.092+02	2025-12-19 17:11:52.092+02
6c3cb82f-cfd4-48fa-93c6-a4284ed71bbf	GEOTECHNICAL ENGINEERING TECHNICIAN	\N	\N	cf37624f-11f1-4612-aa9e-111dcdc3b2c0	t	2025-12-19 17:11:52.094+02	2025-12-19 17:11:52.094+02
ace78bfb-8d30-482f-9114-6baa4bd9bfbe	GEOTECHNICAL ENGINEER	\N	\N	cf37624f-11f1-4612-aa9e-111dcdc3b2c0	t	2025-12-19 17:11:52.096+02	2025-12-19 17:11:52.096+02
be34b207-cd6d-450a-91cd-0e0e0cf82c9e	MINE PLANNING SUPERINTENDENT	\N	\N	e5bcca7e-5880-43ad-a183-7835512e1f6b	t	2025-12-19 17:11:52.099+02	2025-12-19 17:11:52.099+02
8a5e18ab-f2ab-455b-8bcb-5f0a6df3d749	MINING TECHNICAL SERVICES MANAGER	\N	\N	e5bcca7e-5880-43ad-a183-7835512e1f6b	t	2025-12-19 17:11:52.101+02	2025-12-19 17:11:52.101+02
7d100cce-0b5d-4629-86a8-cd2bf4a370e0	JUNIOR MINE PLANNING ENGINEER	\N	\N	e5bcca7e-5880-43ad-a183-7835512e1f6b	t	2025-12-19 17:11:52.104+02	2025-12-19 17:11:52.104+02
a794a693-2531-4f0d-89b8-63cd737a1e58	MINE PLANNING ENGINEER	\N	\N	e5bcca7e-5880-43ad-a183-7835512e1f6b	t	2025-12-19 17:11:52.106+02	2025-12-19 17:11:52.106+02
bed5e940-c208-4343-9dca-e088ef8c466a	SURVEYOR	\N	\N	e817b4e7-1b12-4bd7-a770-e1d3a430259e	t	2025-12-19 17:11:52.108+02	2025-12-19 17:11:52.108+02
f3bc96df-d68d-4f32-8ed5-d7dd064c403e	CHIEF SURVEYOR	\N	\N	e817b4e7-1b12-4bd7-a770-e1d3a430259e	t	2025-12-19 17:11:52.11+02	2025-12-19 17:11:52.11+02
01488653-7583-4526-8359-447b1772af23	SENIOR SURVEYOR	\N	\N	e817b4e7-1b12-4bd7-a770-e1d3a430259e	t	2025-12-19 17:11:52.113+02	2025-12-19 17:11:52.113+02
bfd69829-d2c1-429c-9c4f-95415f6d52fc	SURVEY ASSISTANT	\N	\N	e817b4e7-1b12-4bd7-a770-e1d3a430259e	t	2025-12-19 17:11:52.116+02	2025-12-19 17:11:52.116+02
6b914ffd-13b2-478b-b007-8577c6096015	METALLURGICAL TECHNICIAN	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	t	2025-12-19 17:11:52.119+02	2025-12-19 17:11:52.119+02
c124386f-8a67-46a3-8939-bff2308e6f82	PLANT PRODUCTION SUPERINTENDENT	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	t	2025-12-19 17:11:52.123+02	2025-12-19 17:11:52.123+02
5d363712-af0d-4d6e-869d-bce6d9159b27	METALLURGICAL SUPERINTENDENT	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	t	2025-12-19 17:11:52.125+02	2025-12-19 17:11:52.125+02
f5e97574-4ab2-4fb8-b540-786314bb7976	PROCESS CONTROL SUPERVISOR	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	t	2025-12-19 17:11:52.128+02	2025-12-19 17:11:52.128+02
0f4321e0-83d4-4d73-a8c5-804b00433d06	METALLURGICAL ENGINEER	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	t	2025-12-19 17:11:52.13+02	2025-12-19 17:11:52.13+02
9f5757f4-89ed-487a-8799-d026ef7e7bb1	PROCESS CONTROL METALLURGIST	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	t	2025-12-19 17:11:52.133+02	2025-12-19 17:11:52.133+02
9fd73f69-9f06-4dba-a3a7-2f2147f834e1	PLANT LABORATORY METALLURGIST	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	t	2025-12-19 17:11:52.135+02	2025-12-19 17:11:52.135+02
d5dcb3ab-88e0-4fd1-949a-7d80b6e0b5e0	PLANT LABORATORY TECHNICIAN	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	t	2025-12-19 17:11:52.138+02	2025-12-19 17:11:52.138+02
45a7db59-65ca-4cc7-911a-dc976b1a8f4f	PLANT LABORATORY MET TECHNICIAN	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	t	2025-12-19 17:11:52.14+02	2025-12-19 17:11:52.14+02
59dc021d-aa1c-4dd7-ae0e-9e08f717004f	PROCESSING SYSTEMS ANALYST	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	t	2025-12-19 17:11:52.142+02	2025-12-19 17:11:52.142+02
f57daf78-dd5e-4196-9d16-f8212dd8ac20	PLANT SUPERVISOR	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	t	2025-12-19 17:11:52.145+02	2025-12-19 17:11:52.145+02
7f864d52-4645-4eaa-a9e3-8dec862076e8	PROCESSING MANAGER	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	t	2025-12-19 17:11:52.147+02	2025-12-19 17:11:52.147+02
39cf317b-4201-4cc7-9635-c90a4fc4b763	TSF SUPERVISOR	\N	\N	985e2067-8b19-4e8f-b881-1680654f9b23	t	2025-12-19 17:11:52.149+02	2025-12-19 17:11:52.149+02
fcc707bc-1204-4892-8437-a47f2ba847ae	PLANT MANAGER	\N	\N	985e2067-8b19-4e8f-b881-1680654f9b23	t	2025-12-19 17:11:52.152+02	2025-12-19 17:11:52.152+02
58d21227-6ae6-4f94-95e2-cce29afe7e48	CIL ASSISTANT	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	t	2025-12-19 17:11:52.154+02	2025-12-19 17:11:52.154+02
9172cd60-e245-4f24-814d-ba8a4b79cc4e	CIL OPERATOR	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	t	2025-12-19 17:11:52.156+02	2025-12-19 17:11:52.156+02
e6a2ea9d-4562-489b-9318-2f552308a580	GENERAL ASSISTANT CIL	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	t	2025-12-19 17:11:52.159+02	2025-12-19 17:11:52.159+02
a8ff2636-ebe5-4658-8749-672cd3fd7c26	RELIEF CREW ASSISTANT	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	t	2025-12-19 17:11:52.163+02	2025-12-19 17:11:52.163+02
b7eb1d5b-303b-4cf4-a0de-5f16a58571d0	LEAVE RELIEF CREW	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	t	2025-12-19 17:11:52.165+02	2025-12-19 17:11:52.165+02
88eb0468-dc23-4aea-ae8a-740dee6fd00e	GENERAL PLANT ATTENDANT	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	t	2025-12-19 17:11:52.169+02	2025-12-19 17:11:52.169+02
21ac8bc3-763b-4bd7-88f1-25bcd290be2d	GENERAL PLANT ASSISTANT	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	t	2025-12-19 17:11:52.171+02	2025-12-19 17:11:52.171+02
e1ef39b3-1bc7-4732-a503-661dd2a0f041	ELUTION & REAGENTS ASSIST	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	t	2025-12-19 17:11:52.174+02	2025-12-19 17:11:52.174+02
44775dd5-c8ac-417d-9547-4e2378ae63d1	ELUTION OPERATOR	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	t	2025-12-19 17:11:52.176+02	2025-12-19 17:11:52.176+02
b665869e-3e91-48c5-9230-883546a1cdcc	ELUTION ASSISTANT	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	t	2025-12-19 17:11:52.178+02	2025-12-19 17:11:52.178+02
d3476092-0fd0-4333-8457-c44b96e0bdaa	BALLMILL ASSISTANT	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	t	2025-12-19 17:11:52.181+02	2025-12-19 17:11:52.181+02
ec821f89-408e-44db-98e7-d644c1360fb0	GENERAL MILL ASSISTANT	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	t	2025-12-19 17:11:52.183+02	2025-12-19 17:11:52.183+02
fe4441df-761d-4a09-b748-c58c82805e14	MILL OPERATOR	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	t	2025-12-19 17:11:52.185+02	2025-12-19 17:11:52.185+02
3b73b200-2745-4d61-ade3-d46f7dfac882	HOUSE KEEPING ASSISTANT	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	t	2025-12-19 17:11:52.188+02	2025-12-19 17:11:52.188+02
60c669d1-253e-428f-8321-5b02360c1d32	PLANT LAB ATTENDANT	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	t	2025-12-19 17:11:52.19+02	2025-12-19 17:11:52.19+02
a370a4e9-3642-4872-b974-e5c360b8cfed	METALLURGICAL CLERK	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	t	2025-12-19 17:11:52.192+02	2025-12-19 17:11:52.192+02
7b38dfa2-f994-42c4-9ead-40f49b541421	PRIMARY CRUSHER OPERATOR	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	t	2025-12-19 17:11:52.194+02	2025-12-19 17:11:52.194+02
da97a0d0-ceaf-4652-8757-c641b6ce85ed	PRIMARY CRUSHING OPERATOR	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	t	2025-12-19 17:11:52.197+02	2025-12-19 17:11:52.197+02
c5635dac-71c0-4da6-8d34-d393a4845c4d	PRIMARY CRUSHER ATTENDANT	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	t	2025-12-19 17:11:52.199+02	2025-12-19 17:11:52.199+02
979557b7-c2de-423d-aa10-067a8043db0b	THICKENER OPERATOR	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	t	2025-12-19 17:11:52.203+02	2025-12-19 17:11:52.203+02
b6cc4c75-67ee-49df-9577-11852dc94392	REAGENTS & SMELTING CONTROLLER	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	t	2025-12-19 17:11:52.205+02	2025-12-19 17:11:52.205+02
524744a9-e444-430f-9861-7ee549c570d6	REAGENTS & SMELTING ASSISTANT	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	t	2025-12-19 17:11:52.208+02	2025-12-19 17:11:52.208+02
42890f73-386a-4441-b403-b9d0ad2fca3b	SECONDARY & TERTIARY CRUSHER OPERATOR	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	t	2025-12-19 17:11:52.211+02	2025-12-19 17:11:52.211+02
814c890e-a1cb-4ed9-995f-08ec14178bbd	GENERAL SECONDARY & TERTIARY CRUSHING ASSIST	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	t	2025-12-19 17:11:52.213+02	2025-12-19 17:11:52.213+02
494dd097-f07f-4421-9c9b-9302b4231421	TAILINGS STORAGE FACILITY OPERATOR	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	t	2025-12-19 17:11:52.217+02	2025-12-19 17:11:52.217+02
a994088d-a928-441a-94ae-c9ac1d7a2702	TAILINGS STORAGE FACILITY ASSIST	\N	\N	784dce00-c116-4b6f-8204-3cb33a49cc61	t	2025-12-19 17:11:52.219+02	2025-12-19 17:11:52.219+02
c1b64a0f-82b5-4a54-ad35-51f8b5d7e375	GENERAL MANAGER	\N	\N	23b94bcb-d4cb-4576-a70a-174851a8f282	t	2025-12-19 17:11:52.222+02	2025-12-19 17:11:52.222+02
d3af50da-a56a-4457-9217-46d87808dc6a	SHARED SERVICES MANAGER	\N	\N	23b94bcb-d4cb-4576-a70a-174851a8f282	t	2025-12-19 17:11:52.224+02	2025-12-19 17:11:52.224+02
167450c7-eccf-4351-b41f-ee8b769b5fb7	BUSINESS IMPROVEMENT MANAGER	\N	\N	23b94bcb-d4cb-4576-a70a-174851a8f282	t	2025-12-19 17:11:52.226+02	2025-12-19 17:11:52.226+02
0c6b2f60-42e9-4042-9d4c-3e47a609d6ea	BUSINESS IMPROVEMENT OFFICER	\N	\N	23b94bcb-d4cb-4576-a70a-174851a8f282	t	2025-12-19 17:11:52.229+02	2025-12-19 17:11:52.229+02
4f780184-fdeb-4de6-b818-eda82c716f6c	BOME HOUSES CONSTRUCTION SUPERVISOR	\N	\N	7031df98-7552-43c8-88e5-6854455cea55	t	2025-12-19 17:11:52.231+02	2025-12-19 17:11:52.231+02
ca4cc286-e221-4c67-bca0-196202b69b61	COMMUNITY RELATIONS COORDINATOR	\N	\N	7031df98-7552-43c8-88e5-6854455cea55	t	2025-12-19 17:11:52.234+02	2025-12-19 17:11:52.234+02
25e57d68-0f8f-4bc1-9dbd-000495e0926f	ASSISTANT COMMUNITY RELATIONS OFFICER	\N	\N	7031df98-7552-43c8-88e5-6854455cea55	t	2025-12-19 17:11:52.236+02	2025-12-19 17:11:52.236+02
bda4a506-102a-4e0d-a5d0-e794167b10d2	COMMUNITY RELATIONS OFFICER	\N	\N	7031df98-7552-43c8-88e5-6854455cea55	t	2025-12-19 17:11:52.239+02	2025-12-19 17:11:52.239+02
c8845d4e-ca5e-4967-8ec6-75af82802658	BOOK KEEPER	\N	\N	103e0c5e-d36d-48b2-b098-47de7729ba8f	t	2025-12-19 17:11:52.241+02	2025-12-19 17:11:52.241+02
7e7c2178-3ef9-4ba9-b3d0-f5cff3b28dbd	FINANCE & ADMINISTRATION MANAGER	\N	\N	103e0c5e-d36d-48b2-b098-47de7729ba8f	t	2025-12-19 17:11:52.243+02	2025-12-19 17:11:52.243+02
0f6b0a7f-a473-427b-a56c-45f63872f008	ASSISTANT ACCOUNTANT	\N	\N	103e0c5e-d36d-48b2-b098-47de7729ba8f	t	2025-12-19 17:11:52.246+02	2025-12-19 17:11:52.246+02
cc70d045-6acb-40b1-aa98-4fffdd81342e	HUMAN CAPITAL SUPPORT SERVICES MANAGER	\N	\N	470d6cb5-10ee-4b1e-a0f8-58252261f803	t	2025-12-19 17:11:52.25+02	2025-12-19 17:11:52.25+02
1f0e9ada-0461-47b2-a5a1-14b903f31d17	HR ADMINISTRATOR	\N	\N	470d6cb5-10ee-4b1e-a0f8-58252261f803	t	2025-12-19 17:11:52.254+02	2025-12-19 17:11:52.254+02
2b31ca7c-1fdb-426b-91df-fb0ab92b2fa3	HUMAN RESOURCES ASSISTANT	\N	\N	470d6cb5-10ee-4b1e-a0f8-58252261f803	t	2025-12-19 17:11:52.258+02	2025-12-19 17:11:52.258+02
a4daf649-bcdd-4eae-817b-ecdf5bcf4b1d	HUMAN RESOURCES SUPERINTENDENT	\N	\N	470d6cb5-10ee-4b1e-a0f8-58252261f803	t	2025-12-19 17:11:52.265+02	2025-12-19 17:11:52.265+02
3245a7c2-1eb6-47d5-9168-aab4dac4ca7c	IT OFFICER	\N	\N	3c553423-c8f3-4c6e-97ac-1436febda45b	t	2025-12-19 17:11:52.268+02	2025-12-19 17:11:52.268+02
269c5d98-2c94-4232-80cc-fdb5d9f1b38d	IT SUPERINTENDENT	\N	\N	3c553423-c8f3-4c6e-97ac-1436febda45b	t	2025-12-19 17:11:52.271+02	2025-12-19 17:11:52.271+02
38674253-dcdc-4a56-919b-3deee794302c	SUPPORT TECHNICIAN	\N	\N	3c553423-c8f3-4c6e-97ac-1436febda45b	t	2025-12-19 17:11:52.274+02	2025-12-19 17:11:52.274+02
9c331b90-6645-4cb3-8dc7-a9ae2d6c421f	SECURITY OFFICER	\N	\N	b9a21c3e-de70-4b23-a411-9f9dd5a6f155	t	2025-12-19 17:11:52.276+02	2025-12-19 17:11:52.276+02
61c36377-55d0-4945-95d7-b3da61fb5555	SECURITY MANAGER	\N	\N	b9a21c3e-de70-4b23-a411-9f9dd5a6f155	t	2025-12-19 17:11:52.278+02	2025-12-19 17:11:52.278+02
0af8bc6f-0861-473d-85d2-d53e747bde88	CCTV OPERATOR	\N	\N	b9a21c3e-de70-4b23-a411-9f9dd5a6f155	t	2025-12-19 17:11:52.281+02	2025-12-19 17:11:52.281+02
782370ec-cc02-40a7-9852-13da277b9e1f	SHE MANAGER	\N	\N	15c0a970-e3b0-49af-9b35-7e86c1ba2388	t	2025-12-19 17:11:52.283+02	2025-12-19 17:11:52.283+02
59d97275-06b4-44c2-b131-7aa765e87ee5	SHE OFFICER PLANT	\N	\N	15c0a970-e3b0-49af-9b35-7e86c1ba2388	t	2025-12-19 17:11:52.285+02	2025-12-19 17:11:52.285+02
830ec95a-68b7-4bcb-9497-69e640a8b5a2	ENVIRONMENTAL & HYGIENE OFFICER	\N	\N	15c0a970-e3b0-49af-9b35-7e86c1ba2388	t	2025-12-19 17:11:52.288+02	2025-12-19 17:11:52.288+02
ed6a777e-77ae-474f-b600-5b4bd034930f	SHE ADMINISTRATOR	\N	\N	15c0a970-e3b0-49af-9b35-7e86c1ba2388	t	2025-12-19 17:11:52.29+02	2025-12-19 17:11:52.29+02
d0603abe-d66a-42db-bdbb-285192093746	SHEQ SUPERINTENDENT	\N	\N	15c0a970-e3b0-49af-9b35-7e86c1ba2388	t	2025-12-19 17:11:52.293+02	2025-12-19 17:11:52.293+02
07cdec81-ff4a-478f-b855-6be97b3c5ec9	SHEQ AND ENVIRONMENTAL OFFICER	\N	\N	15c0a970-e3b0-49af-9b35-7e86c1ba2388	t	2025-12-19 17:11:52.295+02	2025-12-19 17:11:52.295+02
2e4d8c6f-d895-499e-8751-6f21aebb9c7b	SHE ASSISTANT	\N	\N	15c0a970-e3b0-49af-9b35-7e86c1ba2388	t	2025-12-19 17:11:52.298+02	2025-12-19 17:11:52.298+02
5357ea53-fc9e-4f94-896f-fbbabefcf6e5	FIRST AID TRAINER	\N	\N	15c0a970-e3b0-49af-9b35-7e86c1ba2388	t	2025-12-19 17:11:52.3+02	2025-12-19 17:11:52.3+02
dbb825cc-b06b-4ec8-adfa-e5ee21250a17	SITE COORDINATION OFFICER	\N	\N	205bdc41-4872-4a0d-9e68-295e41da3803	t	2025-12-19 17:11:52.303+02	2025-12-19 17:11:52.303+02
4a19d06c-875e-4b2b-bbfb-5967126a6877	CATERING AND HOUSEKEEPING SUPERVISOR	\N	\N	205bdc41-4872-4a0d-9e68-295e41da3803	t	2025-12-19 17:11:52.305+02	2025-12-19 17:11:52.305+02
1e987b0b-be4e-4e67-b6db-5cf93a649777	CHEF	\N	\N	205bdc41-4872-4a0d-9e68-295e41da3803	t	2025-12-19 17:11:52.307+02	2025-12-19 17:11:52.307+02
1e4baf1b-fd82-4f44-bfec-f2389f492e63	HANDYMAN	\N	\N	205bdc41-4872-4a0d-9e68-295e41da3803	t	2025-12-19 17:11:52.31+02	2025-12-19 17:11:52.31+02
5bffee5b-8ee6-46ce-a6cc-a74bee0a776c	WELFARE WORKER	\N	\N	205bdc41-4872-4a0d-9e68-295e41da3803	t	2025-12-19 17:11:52.312+02	2025-12-19 17:11:52.312+02
62c939cb-b652-4055-a64c-259e62385a63	COOK	\N	\N	205bdc41-4872-4a0d-9e68-295e41da3803	t	2025-12-19 17:11:52.315+02	2025-12-19 17:11:52.315+02
a1c4d0ad-0f24-4a3e-84c5-ec4ad87c0b93	TEAM LEADER HOUSEKEEPING	\N	\N	205bdc41-4872-4a0d-9e68-295e41da3803	t	2025-12-19 17:11:52.317+02	2025-12-19 17:11:52.317+02
eeeb1613-db46-4076-bdd1-681d9e02dc90	HOUSEKEEPER	\N	\N	205bdc41-4872-4a0d-9e68-295e41da3803	t	2025-12-19 17:11:52.32+02	2025-12-19 17:11:52.32+02
0322168f-724e-4ebd-9371-1d9c8f3f9900	HOUSE KEEPER	\N	\N	205bdc41-4872-4a0d-9e68-295e41da3803	t	2025-12-19 17:11:52.322+02	2025-12-19 17:11:52.322+02
d19a0e95-4f49-4ae1-a122-2c8ccfa48888	LAUNDRY ATTENDANT	\N	\N	205bdc41-4872-4a0d-9e68-295e41da3803	t	2025-12-19 17:11:52.325+02	2025-12-19 17:11:52.325+02
c075716a-e0f5-4882-9afb-a5c0b02e9d82	KITCHEN PORTER	\N	\N	205bdc41-4872-4a0d-9e68-295e41da3803	t	2025-12-19 17:11:52.327+02	2025-12-19 17:11:52.327+02
b476001b-0681-4af5-93e2-f5d2c290146b	ISSUING OFFICER	\N	\N	081b1436-35c4-4de6-9b1d-be6fa0f299f8	t	2025-12-19 17:11:52.33+02	2025-12-19 17:11:52.33+02
8b46ccf5-5bad-429c-8215-ff536f72bddc	ASSISTANT EXPEDITER	\N	\N	081b1436-35c4-4de6-9b1d-be6fa0f299f8	t	2025-12-19 17:11:52.332+02	2025-12-19 17:11:52.332+02
6048b90b-2406-4235-b7ed-e3689c40b7ab	STORES CONTROLLER	\N	\N	081b1436-35c4-4de6-9b1d-be6fa0f299f8	t	2025-12-19 17:11:52.334+02	2025-12-19 17:11:52.334+02
b36cd659-62c9-4a8c-b7c9-7065e1df5f38	STORES MANAGER	\N	\N	081b1436-35c4-4de6-9b1d-be6fa0f299f8	t	2025-12-19 17:11:52.337+02	2025-12-19 17:11:52.337+02
a5f8dd74-41c2-4b32-ab7a-bd18d2e9e995	RECEIVING OFFICER	\N	\N	081b1436-35c4-4de6-9b1d-be6fa0f299f8	t	2025-12-19 17:11:52.339+02	2025-12-19 17:11:52.339+02
757a5842-e014-40d0-a4d9-420593ba2203	PYLOG ADMINISTRATOR	\N	\N	081b1436-35c4-4de6-9b1d-be6fa0f299f8	t	2025-12-19 17:11:52.342+02	2025-12-19 17:11:52.342+02
03656c6d-17ad-4a51-a60d-ce388bb5de42	SENIOR STORES CLERK	\N	\N	081b1436-35c4-4de6-9b1d-be6fa0f299f8	t	2025-12-19 17:11:52.344+02	2025-12-19 17:11:52.344+02
5bdfd7cc-1077-4125-8fab-db24166bdec0	STORES CLERK	\N	\N	081b1436-35c4-4de6-9b1d-be6fa0f299f8	t	2025-12-19 17:11:52.347+02	2025-12-19 17:11:52.347+02
990dd690-240b-48df-ae0f-291993719658	STOREKEEPER	\N	\N	081b1436-35c4-4de6-9b1d-be6fa0f299f8	t	2025-12-19 17:11:52.349+02	2025-12-19 17:11:52.349+02
f31ee213-5bee-455f-b0da-75a5b5a90ed7	GRADUATE TRAINEE	\N	\N	4cc15b4d-688d-40bb-9974-1b8340594027	t	2025-12-19 17:11:52.351+02	2025-12-19 17:11:52.351+02
cc4afa59-abd9-4c39-bf18-35ef4aa6b4b1	GRADUATE TRAINEE METALLURGY	\N	\N	4cc15b4d-688d-40bb-9974-1b8340594027	t	2025-12-19 17:11:52.354+02	2025-12-19 17:11:52.354+02
942a920c-8a08-49cd-a175-60a4855111c5	ASSAY LABORATORY TECHNICIAN TRAINEE	\N	\N	4cc15b4d-688d-40bb-9974-1b8340594027	t	2025-12-19 17:11:52.357+02	2025-12-19 17:11:52.357+02
8000ab74-d123-45b5-a8a3-e97e0732a263	SHEQ GRADUATE TRAINEE	\N	\N	4cc15b4d-688d-40bb-9974-1b8340594027	t	2025-12-19 17:11:52.36+02	2025-12-19 17:11:52.36+02
4cd91aec-a1f1-4b00-80f8-66416c72717f	GRADUATE TRAINEE MINING	\N	\N	4cc15b4d-688d-40bb-9974-1b8340594027	t	2025-12-19 17:11:52.362+02	2025-12-19 17:11:52.362+02
eefac5ca-d2f2-4a19-ade8-6848b95a9f00	TRAINING AND DEVELOPMENT OFFICER	\N	\N	4cc15b4d-688d-40bb-9974-1b8340594027	t	2025-12-19 17:11:52.365+02	2025-12-19 17:11:52.365+02
a5f0df00-b4a0-4cc3-89c4-143712f765f5	GT MECHANICAL ENGINEERING	\N	\N	4cc15b4d-688d-40bb-9974-1b8340594027	t	2025-12-19 17:11:52.368+02	2025-12-19 17:11:52.368+02
8ebb4023-a20c-4b89-8248-1fcd44c878df	GRADUATE TRAINEE ACCOUNTING	\N	\N	4cc15b4d-688d-40bb-9974-1b8340594027	t	2025-12-19 17:11:52.371+02	2025-12-19 17:11:52.371+02
d9badb0a-ee1f-4224-a6d6-19279b86cfcb	APPRENTICE	\N	\N	4cc15b4d-688d-40bb-9974-1b8340594027	t	2025-12-19 17:11:52.373+02	2025-12-19 17:11:52.373+02
51e13703-0c27-4731-98aa-07d324e58b9c	APPRENTICE BOILERMAKER	\N	\N	4cc15b4d-688d-40bb-9974-1b8340594027	t	2025-12-19 17:11:52.376+02	2025-12-19 17:11:52.376+02
e3e9c8dc-1889-487b-9e21-33e030132fac	STUDENT ON ATTACHEMENT	\N	\N	4cc15b4d-688d-40bb-9974-1b8340594027	t	2025-12-19 17:11:52.379+02	2025-12-19 17:11:52.379+02
ca218d87-cdb7-4f89-8dbd-d20ab1687987	STUDENT ON ATTACHMENT	\N	\N	4cc15b4d-688d-40bb-9974-1b8340594027	t	2025-12-19 17:11:52.381+02	2025-12-19 17:11:52.381+02
fb208f5e-b1a9-4006-a746-265068c47374	WAREHOUSE ASSISTANT	\N	\N	0b8f0ba2-cfd6-42d8-8b58-d81b33ff2b71	t	2025-12-19 17:11:52.384+02	2025-12-19 17:11:52.384+02
4eb474b7-6544-4de3-9bd2-be5efcbfa799	OFFICE CLEANER	\N	\N	0b8f0ba2-cfd6-42d8-8b58-d81b33ff2b71	t	2025-12-19 17:11:52.386+02	2025-12-19 17:11:52.386+02
\.


--
-- TOC entry 5143 (class 0 OID 18013)
-- Dependencies: 228
-- Data for Name: ppe_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ppe_items (id, item_code, item_ref_code, name, product_name, item_type, category, description, unit, replacement_frequency, heavy_use_frequency, is_mandatory, account_code, account_description, supplier, has_size_variants, has_color_variants, size_scale, available_sizes, available_colors, is_active, created_at, updated_at) FROM stdin;
12ca5498-98bd-452f-87b2-5a6b7c894869	BT-ALUTHERM	\N	Aluminised Thermal Suit	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-19 17:35:28.465+02	2025-12-19 17:35:28.465+02
2e534e1b-099e-4a70-9803-0b828fc4ea6c	BT-AMBUNK	\N	Amour Bunker Suit	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-19 17:35:28.481+02	2025-12-19 17:35:28.481+02
9468b8ae-1620-4a14-83db-1c76dafe6be8	BT-BEECATCH	\N	Bee Catcher's Suit	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-19 17:35:28.486+02	2025-12-19 17:35:28.486+02
78a68a49-14d6-43ac-80d9-feee7986d32c	BT-CHEFJKT	\N	Chef's Jacket	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-19 17:35:28.512+02	2025-12-19 17:35:28.512+02
0cf90524-06ca-4002-b53c-4adb699dd13e	BT-CWSBLUE	\N	Cotton Worksuit Blue Elastic Cuff	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-19 17:35:28.519+02	2025-12-19 17:35:28.519+02
0f715ade-904c-4610-90a1-e4da5e865736	BT-FIRESUIT	\N	Firefighting Suit	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-19 17:35:28.526+02	2025-12-19 17:35:28.526+02
c0c278c6-cd12-4603-ae43-474bb0c31749	BT-LWSBLUE	\N	Ladies' Worksuit Blue	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-19 17:35:28.531+02	2025-12-19 17:35:28.531+02
f859343d-3232-4ef8-bc35-66cde56283d6	BT-LWSREFL	\N	Ladies' Worksuit Reflective	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-19 17:35:28.535+02	2025-12-19 17:35:28.535+02
74269ead-d997-4060-b6c2-822cd8bae78e	BT-LIFEJKT	\N	Life Jacket Adult Size	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-19 17:35:28.539+02	2025-12-19 17:35:28.539+02
a6504a65-4b57-4428-a42c-a5f008cb5d67	BT-PVCRAIN	\N	PVC Rain Suits	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-19 17:35:28.542+02	2025-12-19 17:35:28.542+02
542266d1-a2e1-495c-8633-513b4558f286	BT-RAINSUT	\N	Rain Suits	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-19 17:35:28.546+02	2025-12-19 17:35:28.546+02
7040a923-857d-47b1-a21b-833159521a49	BT-RCWSWHT	\N	Reflective Cotton Worksuits White	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-19 17:35:28.548+02	2025-12-19 17:35:28.548+02
faf90bf4-fe59-4fd9-9b76-161657930d7e	BT-RWSBLUE	\N	Reflective Blue Worksuit	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-19 17:35:28.551+02	2025-12-19 17:35:28.551+02
588757cf-2aff-4ba6-a207-362e176ee943	BT-REFLVST	\N	Reflective Vest	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-19 17:35:28.555+02	2025-12-19 17:35:28.555+02
fbe5b353-7a68-4606-aaab-244527e1addc	BT-REFLVLS	\N	Reflective Vest Long Sleeve	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-19 17:35:28.558+02	2025-12-19 17:35:28.558+02
387eff5b-f5ca-4703-80ab-089614100bf9	BT-SHRTORN	\N	Shirt Cotton Orange & Navy	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-19 17:35:28.56+02	2025-12-19 17:35:28.56+02
5c873792-de42-4475-a345-36a638141788	BT-SHRTLMN	\N	Shirt Cotton Lime & Navy	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-19 17:35:28.563+02	2025-12-19 17:35:28.563+02
d3f120d8-5ac0-429e-a97f-7d6e638eb317	BT-SHSTNVL	\N	Shirt Short Navy & Lime	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-19 17:35:28.565+02	2025-12-19 17:35:28.565+02
e40e5664-c059-43a1-86c0-aaaae7957a49	BT-SHSTORL	\N	Shirt Short Orange & Lime	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-19 17:35:28.568+02	2025-12-19 17:35:28.568+02
791c47a0-2cb9-4b17-bacc-53121b3ef214	BT-SINKREF	\N	Sinking Suit Reflective	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-19 17:35:28.57+02	2025-12-19 17:35:28.57+02
fec36b02-3bbd-4781-b709-afd85b9b62e9	BT-THERMTR	\N	Thermal Trousers	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-19 17:35:28.573+02	2025-12-19 17:35:28.573+02
e021eec2-d17f-45d0-9c6b-35fda2563bfe	BT-TRSCNVY	\N	Trousers Cotton Navy	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-19 17:35:28.575+02	2025-12-19 17:35:28.575+02
c5dfcb82-394b-48aa-bee5-701a15b17ec7	BT-WELDJKT	\N	Welding Jacket	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-19 17:35:28.578+02	2025-12-19 17:35:28.578+02
322aac36-a684-4a08-b97f-e53c2eac96ef	BT-LABCOAT	\N	White Lab Coats	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-19 17:35:28.58+02	2025-12-19 17:35:28.58+02
94c3a9cd-50d5-4cbf-81d9-27dfd0b7a425	BT-WINJKTR	\N	Winter Jacket Reflective	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-19 17:35:28.583+02	2025-12-19 17:35:28.583+02
8963948f-8e28-4709-ac78-b7c0da581481	BT-WINSUT	\N	Winter Suit	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-19 17:35:28.585+02	2025-12-19 17:35:28.585+02
21087711-546e-4b9c-ae7d-fa89d40abd78	BT-WINJKT	\N	Winter Jacket	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-19 17:35:28.587+02	2025-12-19 17:35:28.587+02
6aadb6cc-56ce-4ad0-b01c-29a2136b0640	BT-WSBLCOT	\N	Worksuit Blue Cotton	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-19 17:35:28.59+02	2025-12-19 17:35:28.59+02
3c5eda83-4bf0-4e32-ab6b-9a38b9c2c2ab	BT-WSGRACID	\N	Worksuit Green Acid Proof	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-19 17:35:28.592+02	2025-12-19 17:35:28.592+02
e01f24a5-c45f-4839-9455-98ea3ca9a6b0	BT-WSNVFR	\N	Worksuit Navy Flame Retardant	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-19 17:35:28.594+02	2025-12-19 17:35:28.594+02
9b431df3-5635-4333-8f7c-352a862d8b64	BT-WSWHTCOT	\N	Worksuit White Cotton	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-19 17:35:28.597+02	2025-12-19 17:35:28.597+02
f2a30f9f-4191-4e4f-add3-4f15e08b6bd5	BT-WSYELCOT	\N	Worksuit Yellow Cotton	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-19 17:35:28.6+02	2025-12-19 17:35:28.6+02
c9f0ca98-47bb-4313-8ee7-f94d776ebec8	BT-WSCOTBL	\N	Worksuit Cotton Blue	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-19 17:35:28.603+02	2025-12-19 17:35:28.603+02
1069cbc1-0b4b-4685-957e-696676a860dc	BT-WSREDFR	\N	Worksuit Red Flame Retardant	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-19 17:35:28.605+02	2025-12-19 17:35:28.605+02
568f86e4-6108-4ed3-baf1-245e82e01ea9	BT-WSGRCOT	\N	Worksuite Green Cotton	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-19 17:35:28.608+02	2025-12-19 17:35:28.608+02
246ec675-cbec-4505-a0a2-85542bfb5977	BT-JEANBLK	\N	Black Jean (Pair)	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-19 17:35:28.612+02	2025-12-19 17:35:28.612+02
2d9e9e87-516f-4b5b-85bf-e1caba76071f	BT-JEANBLU	\N	Blue Jean (Pair)	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-19 17:35:28.614+02	2025-12-19 17:35:28.614+02
a557bd04-dd23-47c0-9d01-d41ab16d5c6e	BT-SAFHARNS	\N	Safety Harness	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-19 17:35:28.617+02	2025-12-19 17:35:28.617+02
ab5dac2e-15d3-437a-befa-0cc863d3e21d	BT-KIDNBELT	\N	Kidney Belts	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	t	f	BODY_NUMERIC	\N	\N	t	2025-12-19 17:35:28.619+02	2025-12-19 17:35:28.619+02
94767a0e-2ef9-492e-b5da-01eb8c197aa9	BT-LTHRAPN	\N	Leather Apron	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-19 17:35:28.622+02	2025-12-19 17:35:28.622+02
c7e1deb3-ea63-4e92-a9e1-effab9698e15	BT-PVCAPRON	\N	PVC Apron	\N	PPE	BODY/TORSO	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-19 17:35:28.624+02	2025-12-19 17:35:28.624+02
3710c27b-c2c3-402f-84b6-637bc8c83c7f	FT-GUMSHOS	\N	Gum Shoe Steel Toe	\N	PPE	FEET	\N	EA	12	\N	t	\N	\N	\N	t	f	FEET	\N	\N	t	2025-12-19 17:35:28.626+02	2025-12-19 17:35:28.626+02
cca6eea3-b515-4ba7-bb3f-15cb61dbdf87	FT-LADSAF	\N	Ladies Safety Shoe	\N	PPE	FEET	\N	EA	12	\N	t	\N	\N	\N	t	f	FEET	\N	\N	t	2025-12-19 17:35:28.628+02	2025-12-19 17:35:28.628+02
458c91d6-4ddd-472f-af1a-f6f6b127071f	FT-LADSAFHC	\N	Ladies Safety Shoe High Cut	\N	PPE	FEET	\N	EA	12	\N	t	\N	\N	\N	t	f	FEET	\N	\N	t	2025-12-19 17:35:28.63+02	2025-12-19 17:35:28.63+02
2b9df363-1c62-40d6-bcf4-ca4e70b0b8df	FT-SAFEXEC	\N	Safety Shoe Executive	\N	PPE	FEET	\N	EA	12	\N	t	\N	\N	\N	t	f	FEET	\N	\N	t	2025-12-19 17:35:28.633+02	2025-12-19 17:35:28.633+02
c882f28d-3229-4aa5-9040-bc5f6c9c86ae	FT-SAFSTOE	\N	Safety Shoe Steel Toe	\N	PPE	FEET	\N	EA	12	\N	t	\N	\N	\N	t	f	FEET	\N	\N	t	2025-12-19 17:35:28.635+02	2025-12-19 17:35:28.635+02
0ab758e3-e588-4075-95c4-ccd89636712b	FT-SAFHICUT	\N	Safety Shoe High Cut	\N	PPE	FEET	\N	EA	12	\N	t	\N	\N	\N	t	f	FEET	\N	\N	t	2025-12-19 17:35:28.637+02	2025-12-19 17:35:28.637+02
e36b8e3b-7383-471c-9fb2-74c75ad1a861	FT-VIKFIRE	\N	Viking Fire Fighting Boots	\N	PPE	FEET	\N	EA	12	\N	t	\N	\N	\N	t	f	FEET	\N	\N	t	2025-12-19 17:35:28.639+02	2025-12-19 17:35:28.639+02
0175d226-476b-41c6-8a88-336888e67d05	LK-KNEECAP	\N	Knee Cap	\N	PPE	LEGS/LOWER/KNEES	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-19 17:35:28.642+02	2025-12-19 17:35:28.642+02
d04c6521-e6ec-4dfb-918f-65b8b6de391a	LK-LTHSPAT	\N	Leather Spats	\N	PPE	LEGS/LOWER/KNEES	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-19 17:35:28.644+02	2025-12-19 17:35:28.644+02
6568f3af-712e-4443-9264-04c0a57517c6	EA-EARMUFR	\N	Ear Muffs Red	\N	PPE	EARS	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-19 17:35:28.646+02	2025-12-19 17:35:28.646+02
24cf5f77-0ee1-4d44-a32a-5d443c1c3491	EA-EARPLUG	\N	Earplugs	\N	PPE	EARS	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-19 17:35:28.648+02	2025-12-19 17:35:28.648+02
eb9e1feb-659d-4516-97b5-34f259e3ffb9	HD-ELECRUB	\N	Electrical Rubber Gloves	\N	PPE	HANDS	\N	EA	12	\N	t	\N	\N	\N	t	f	GLOVES	\N	\N	t	2025-12-19 17:35:28.651+02	2025-12-19 17:35:28.651+02
754ce2f0-8b9b-4b3e-a787-bb64a63843eb	HD-HOUSEHD	\N	Household Gloves	\N	PPE	HANDS	\N	EA	12	\N	t	\N	\N	\N	t	f	GLOVES	\N	\N	t	2025-12-19 17:35:28.653+02	2025-12-19 17:35:28.653+02
b783a10e-51eb-4a88-8a44-924e96d8e55f	HD-LTHRLNG	\N	Leather Gloves Long	\N	PPE	HANDS	\N	EA	12	\N	t	\N	\N	\N	t	f	GLOVES	\N	\N	t	2025-12-19 17:35:28.655+02	2025-12-19 17:35:28.655+02
16a6be92-daec-44d2-902d-dae58857049a	HD-LTHRSHT	\N	Leather Gloves Short	\N	PPE	HANDS	\N	EA	12	\N	t	\N	\N	\N	t	f	GLOVES	\N	\N	t	2025-12-19 17:35:28.658+02	2025-12-19 17:35:28.658+02
543577aa-4bd2-4d66-bf30-33148a3c5245	HD-NYLONGL	\N	Nylon Gloves	\N	PPE	HANDS	\N	EA	12	\N	t	\N	\N	\N	t	f	GLOVES	\N	\N	t	2025-12-19 17:35:28.66+02	2025-12-19 17:35:28.66+02
a81bd870-d70b-464b-b5a0-8c2a49ef848c	HD-PIGSKIN	\N	Pig Skin Gloves	\N	PPE	HANDS	\N	EA	12	\N	t	\N	\N	\N	t	f	GLOVES	\N	\N	t	2025-12-19 17:35:28.664+02	2025-12-19 17:35:28.664+02
6ef116fd-6dd9-4aeb-b0bc-1d27d4c6210a	HD-FIREGLV	\N	Fire Fighting Gloves	\N	PPE	HANDS	\N	EA	12	\N	t	\N	\N	\N	t	f	GLOVES	\N	\N	t	2025-12-19 17:35:28.67+02	2025-12-19 17:35:28.67+02
e9e82a68-d222-4d31-bb43-080d800027c7	HD-PVCLNG	\N	PVC Gloves Long	\N	PPE	HANDS	\N	EA	12	\N	t	\N	\N	\N	t	f	GLOVES	\N	\N	t	2025-12-19 17:35:28.673+02	2025-12-19 17:35:28.673+02
b0e0a6d9-065d-451d-b50c-aa172b74aab3	HD-PVCSHT	\N	PVC Gloves Short	\N	PPE	HANDS	\N	EA	12	\N	t	\N	\N	\N	t	f	GLOVES	\N	\N	t	2025-12-19 17:35:28.675+02	2025-12-19 17:35:28.675+02
c14a5670-d09f-46c8-b935-4fa6a7fd581f	HD-HEATRES	\N	Red Heat Resistant Gloves	\N	PPE	HANDS	\N	EA	12	\N	t	\N	\N	\N	t	f	GLOVES	\N	\N	t	2025-12-19 17:35:28.677+02	2025-12-19 17:35:28.677+02
af5c1f46-581e-443d-ad88-0d466bd3e3f0	HD-THERMWN	\N	Thermal Winter Gloves	\N	PPE	HANDS	\N	EA	12	\N	t	\N	\N	\N	t	f	GLOVES	\N	\N	t	2025-12-19 17:35:28.679+02	2025-12-19 17:35:28.679+02
789908d9-8d76-4e2b-9e02-bb93c1c48b7b	NK-CHEFNCK	\N	Chef's Neckerchief	\N	PPE	NECK	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-19 17:35:28.682+02	2025-12-19 17:35:28.682+02
5729adba-9081-47a0-8d43-472920e3bdd4	NK-NECKCHF	\N	Neckerchief	\N	PPE	NECK	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-19 17:35:28.685+02	2025-12-19 17:35:28.685+02
5552e25c-5534-4fbf-a251-763b84f4e759	NK-WELDNCK	\N	Welding Neck Protector	\N	PPE	NECK	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-19 17:35:28.691+02	2025-12-19 17:35:28.691+02
39569d8d-2190-4bb1-91c2-6edb42084959	RS-3MCART	\N	3M Respirator Cartridge	\N	PPE	RESPIRATORY	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-19 17:35:28.695+02	2025-12-19 17:35:28.695+02
38cfe3c8-9cd8-478d-96d3-50b081d13b35	RS-3MFILT	\N	3M Respirator Filters	\N	PPE	RESPIRATORY	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-19 17:35:28.698+02	2025-12-19 17:35:28.698+02
6f6f8454-0b01-4f9f-984c-a0470c8ad97d	RS-3MFULL	\N	3M Respirator Full Face	\N	PPE	RESPIRATORY	\N	EA	12	\N	t	\N	\N	\N	t	f	RESPIRATOR	\N	\N	t	2025-12-19 17:35:28.702+02	2025-12-19 17:35:28.702+02
ac91a24d-ce17-40fd-92c5-e5cbf83836e4	RS-3MHALF	\N	3M Respirator Half Mask	\N	PPE	RESPIRATORY	\N	EA	12	\N	t	\N	\N	\N	t	f	RESPIRATOR	\N	\N	t	2025-12-19 17:35:28.705+02	2025-12-19 17:35:28.705+02
44c4df98-eff6-4641-b252-e8b74b017d97	RS-3MRETN	\N	3M Respirator Retainers	\N	PPE	RESPIRATORY	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-19 17:35:28.709+02	2025-12-19 17:35:28.709+02
c0e943ca-54ed-4925-80e1-bfac1594ee9f	RS-CPRMTH	\N	CPR Mouth Piece	\N	PPE	RESPIRATORY	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-19 17:35:28.712+02	2025-12-19 17:35:28.712+02
d13514f8-6873-4eaa-b37c-3ae957685dff	RS-DUSTFFP2	\N	Dust Mask FFP2	\N	PPE	RESPIRATORY	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-19 17:35:28.715+02	2025-12-19 17:35:28.715+02
2b5ff881-8c1f-4959-92f7-fbdf52c05651	HE-6PTLINR	\N	6 Point Hard Hat Liner	\N	PPE	HEAD	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-19 17:35:28.72+02	2025-12-19 17:35:28.72+02
76a2fc5c-2b5d-4362-aaf2-c35b718ea682	HE-BALCLVA	\N	Balaclava	\N	PPE	HEAD	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-19 17:35:28.725+02	2025-12-19 17:35:28.725+02
a74d8ec6-2308-4628-a8ff-78bdb3347d22	HE-BALCHAT	\N	Balaclava Hat	\N	PPE	HEAD	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-19 17:35:28.74+02	2025-12-19 17:35:28.74+02
ffaed996-76b3-4ff4-b376-5304395cf7bc	HE-FIREHLM	\N	Fire Fighting Helmet	\N	PPE	HEAD	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-19 17:35:28.77+02	2025-12-19 17:35:28.77+02
c3b6448b-d229-4caf-8063-d94acb5db4cf	HE-CAPLAMP	\N	Cordless Caplamp	\N	PPE	HEAD	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-19 17:35:28.776+02	2025-12-19 17:35:28.776+02
496d40f5-099c-4ade-8e5a-9d6b71605c65	HE-HARDHAT	\N	Hard Hat	\N	PPE	HEAD	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-19 17:35:28.783+02	2025-12-19 17:35:28.783+02
ac4065f5-de5a-4686-aec8-29c09459526f	HE-HHCHIN	\N	Hard Hat Chin Straps	\N	PPE	HEAD	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-19 17:35:28.788+02	2025-12-19 17:35:28.788+02
085c2a6e-2ad5-4072-88e1-4a55ce31cbe1	HE-HHLINER	\N	Hard Hat Liner	\N	PPE	HEAD	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-19 17:35:28.812+02	2025-12-19 17:35:28.812+02
0ab1592d-617e-4c89-b17c-f52e8a6bb975	HE-HHGRAY	\N	Hard Hat Gray	\N	PPE	HEAD	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-19 17:35:28.819+02	2025-12-19 17:35:28.819+02
91ee99e9-6553-430b-a093-fa64acacff3b	HE-SUNBRIM	\N	Sun Brim	\N	PPE	HEAD	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-19 17:35:28.825+02	2025-12-19 17:35:28.825+02
ddcca9c4-9651-403f-9267-12d506ab4953	HE-SUNVISR	\N	Sun Visor	\N	PPE	HEAD	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-19 17:35:28.83+02	2025-12-19 17:35:28.83+02
d58ecef5-203f-4f9f-a20e-5e7bae98a87c	HE-THERMWL	\N	Thermal Woolen Hat	\N	PPE	HEAD	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-19 17:35:28.834+02	2025-12-19 17:35:28.834+02
1d977dc6-d664-4427-9673-369af6a16256	HE-WELDHLM	\N	Welding Helmet	\N	PPE	HEAD	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-19 17:35:28.839+02	2025-12-19 17:35:28.839+02
888326e3-e7da-4350-8ee4-202e8b990e7b	HE-WHLMCAP	\N	Welding Helmet Inner Cap	\N	PPE	HEAD	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-19 17:35:28.842+02	2025-12-19 17:35:28.842+02
3cd6107c-b2c2-47c3-90e6-4c6b8e69cd3c	EF-ANTIFOG	\N	Anti-Fog Goggles	\N	PPE	EYES/FACE	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-19 17:35:28.846+02	2025-12-19 17:35:28.846+02
b0134299-c66a-46ec-8455-972da5a45746	EF-FCSHCLR	\N	Face Shield (Clear)	\N	PPE	EYES/FACE	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-19 17:35:28.848+02	2025-12-19 17:35:28.848+02
9d98d0f8-4440-411f-8a04-15c8630e8872	EF-SAFGLSC	\N	Safety Glasses Clear	\N	PPE	EYES/FACE	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-19 17:35:28.851+02	2025-12-19 17:35:28.851+02
9809cf43-0f82-49f8-af8b-297a066feddb	EF-SAFGLSD	\N	Safety Glasses Dark	\N	PPE	EYES/FACE	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-19 17:35:28.854+02	2025-12-19 17:35:28.854+02
f0f40c11-ab89-4f3b-b3d4-736bfbcab514	EF-WELDLNC	\N	Welding Lenses (Clear)	\N	PPE	EYES/FACE	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-19 17:35:28.857+02	2025-12-19 17:35:28.857+02
7a1df08a-f76b-4ab6-80f2-b1af8d321dca	EF-WELDLND	\N	Welding Lenses (Dark)	\N	PPE	EYES/FACE	\N	EA	12	\N	t	\N	\N	\N	f	f	\N	\N	\N	t	2025-12-19 17:35:28.86+02	2025-12-19 17:35:28.86+02
\.


--
-- TOC entry 5150 (class 0 OID 18217)
-- Dependencies: 235
-- Data for Name: request_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.request_items (id, quantity, size, reason, approved_quantity, created_at, updated_at, request_id, ppe_item_id) FROM stdin;
15b024d6-e8a2-4c66-89db-c4ef2a284e96	1	6	Standard issue per job title requirement	\N	2025-12-19 17:46:21.326+02	2025-12-19 17:46:21.326+02	26577b61-9505-4a3a-9213-f5378e4ceebb	2e534e1b-099e-4a70-9803-0b828fc4ea6c
0507681d-cc77-472f-ae33-512aa58a6ae3	1	6	Standard issue per job title requirement	\N	2025-12-19 17:46:21.326+02	2025-12-19 17:46:21.326+02	26577b61-9505-4a3a-9213-f5378e4ceebb	9468b8ae-1620-4a14-83db-1c76dafe6be8
\.


--
-- TOC entry 5149 (class 0 OID 18157)
-- Dependencies: 234
-- Data for Name: requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.requests (id, status, section_rep_approval_date, section_rep_comment, request_type, is_emergency_visitor, comment, rejection_reason, dept_rep_approval_date, dept_rep_comment, hod_approval_date, hod_comment, stores_approval_date, stores_comment, sheq_approval_date, sheq_comment, sheq_approver_id, fulfilled_date, fulfilled_by_user_id, rejected_by_id, rejected_at, employee_id, requested_by_id, department_id, section_id, created_at, updated_at, section_rep_approver_id, dept_rep_approver_id, hod_approver_id, stores_approver_id) FROM stdin;
26577b61-9505-4a3a-9213-f5378e4ceebb	stores-review	2025-12-19 17:46:29.967+02	\N	new	f	\N	\N	\N	\N	2025-12-19 17:46:52.869+02	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	7d9fc107-64bd-4946-96fa-eb836f7fb0a8	124329dc-1b56-482d-84c9-011310287b89	6c0fedbc-84b1-49d8-9b5a-3d20daf1e5e6	3c553423-c8f3-4c6e-97ac-1436febda45b	2025-12-19 17:46:21.315+02	2025-12-19 17:46:52.87+02	124329dc-1b56-482d-84c9-011310287b89	\N	885bfd3a-aa53-4a4f-a5ec-92b59c4d21be	\N
\.


--
-- TOC entry 5136 (class 0 OID 17880)
-- Dependencies: 221
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.roles (id, name, description, permissions, created_at, updated_at) FROM stdin;
7927c487-fd02-4561-8e2b-a369211dbd69	admin	System Administrator - Full access to all features	[]	2025-12-18 16:33:23.711+02	2025-12-18 16:33:23.711+02
1abfb90b-03fc-4dc3-93a0-3a8ea58da828	stores	Stores Department - Manage stock and fulfill requests	[]	2025-12-18 16:33:23.883+02	2025-12-18 16:33:23.883+02
ee50b1f1-1efd-4624-a1c1-fd99a8a9de46	section-rep	Section Representative - Create requests for section employees	[]	2025-12-18 16:33:23.896+02	2025-12-18 16:33:23.896+02
9247adb0-1d93-49ac-890d-989294ec2bc7	department-rep	Department Representative - Oversee department PPE	[]	2025-12-18 16:33:23.904+02	2025-12-18 16:33:23.904+02
bb738a2e-f549-43cd-81bf-be80091450f5	hod	Head of Department/Section - Approve requests and view reports	[]	2025-12-18 16:33:23.912+02	2025-12-18 16:33:23.912+02
ffb7dca1-d3f9-4f7a-bb9c-5cf41858d483	sheq	SHEQ Officer - Safety compliance and audits	[]	2025-12-18 16:33:23.919+02	2025-12-18 16:33:23.919+02
\.


--
-- TOC entry 5147 (class 0 OID 18087)
-- Dependencies: 232
-- Data for Name: section_ppe_matrix; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.section_ppe_matrix (id, section_id, ppe_item_id, quantity_required, replacement_frequency, is_mandatory, notes, is_active, created_at, updated_at) FROM stdin;
85088b0b-5ce9-45ef-90c6-fbef925ba160	3c553423-c8f3-4c6e-97ac-1436febda45b	2e534e1b-099e-4a70-9803-0b828fc4ea6c	1	12	t	\N	t	2025-12-19 17:42:36.259+02	2025-12-19 17:42:36.259+02
e809eccd-9e24-4aab-993f-a5aba3e3eaff	3c553423-c8f3-4c6e-97ac-1436febda45b	9468b8ae-1620-4a14-83db-1c76dafe6be8	1	12	t	\N	t	2025-12-19 17:42:36.297+02	2025-12-19 17:42:36.297+02
\.


--
-- TOC entry 5138 (class 0 OID 17902)
-- Dependencies: 223
-- Data for Name: sections; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sections (id, name, code, description, is_active, created_at, updated_at, department_id) FROM stdin;
7f81cf21-8c79-49de-ad6a-1a196327c1d5	GEOLOGY	\N	Geological services and exploration	t	2025-12-19 17:11:20.895+02	2025-12-19 17:11:20.895+02	57c8b16b-6a8b-4b2a-b336-e76cd6aefe91
cf37624f-11f1-4612-aa9e-111dcdc3b2c0	GEOTECHNICAL ENGINEERING	\N	Geotechnical engineering services	t	2025-12-19 17:11:20.901+02	2025-12-19 17:11:20.901+02	57c8b16b-6a8b-4b2a-b336-e76cd6aefe91
e5bcca7e-5880-43ad-a183-7835512e1f6b	PLANNING	\N	Mine planning and scheduling	t	2025-12-19 17:11:20.904+02	2025-12-19 17:11:20.904+02	57c8b16b-6a8b-4b2a-b336-e76cd6aefe91
e817b4e7-1b12-4bd7-a770-e1d3a430259e	SURVEY	\N	Survey and mapping services	t	2025-12-19 17:11:20.906+02	2025-12-19 17:11:20.906+02	57c8b16b-6a8b-4b2a-b336-e76cd6aefe91
eac91c5a-45aa-48e6-9da0-e8d6abc4ee40	LABORATORY	\N	Laboratory testing and analysis	t	2025-12-19 17:11:20.909+02	2025-12-19 17:11:20.909+02	cd50c7b8-c41f-4a75-a186-7f7a0d0fb00f
784dce00-c116-4b6f-8204-3cb33a49cc61	PROCESSING	\N	Processing plant operations	t	2025-12-19 17:11:20.914+02	2025-12-19 17:11:20.914+02	dd1ede2c-404c-467d-b1b9-f5c110091e3d
985e2067-8b19-4e8f-b881-1680654f9b23	TAILS STORAGE FACILITY	\N	Tailings storage facility operations	t	2025-12-19 17:11:20.916+02	2025-12-19 17:11:20.916+02	dd1ede2c-404c-467d-b1b9-f5c110091e3d
23b94bcb-d4cb-4576-a70a-174851a8f282	ADMINISTRATION	\N	Administrative services	t	2025-12-19 17:11:20.918+02	2025-12-19 17:11:20.918+02	6c0fedbc-84b1-49d8-9b5a-3d20daf1e5e6
7031df98-7552-43c8-88e5-6854455cea55	CSIR	\N	CSIR related activities	t	2025-12-19 17:11:20.92+02	2025-12-19 17:11:20.92+02	6c0fedbc-84b1-49d8-9b5a-3d20daf1e5e6
103e0c5e-d36d-48b2-b098-47de7729ba8f	FINANCE	\N	Financial services	t	2025-12-19 17:11:20.922+02	2025-12-19 17:11:20.922+02	6c0fedbc-84b1-49d8-9b5a-3d20daf1e5e6
470d6cb5-10ee-4b1e-a0f8-58252261f803	HUMAN RESOURCES	\N	Human resources management	t	2025-12-19 17:11:20.924+02	2025-12-19 17:11:20.924+02	6c0fedbc-84b1-49d8-9b5a-3d20daf1e5e6
3c553423-c8f3-4c6e-97ac-1436febda45b	I.T	\N	Information technology services	t	2025-12-19 17:11:20.926+02	2025-12-19 17:11:20.926+02	6c0fedbc-84b1-49d8-9b5a-3d20daf1e5e6
b9a21c3e-de70-4b23-a411-9f9dd5a6f155	SECURITY	\N	Security services	t	2025-12-19 17:11:20.929+02	2025-12-19 17:11:20.929+02	6c0fedbc-84b1-49d8-9b5a-3d20daf1e5e6
15c0a970-e3b0-49af-9b35-7e86c1ba2388	SHEQ	\N	Safety, Health, Environment and Quality	t	2025-12-19 17:11:20.931+02	2025-12-19 17:11:20.931+02	6c0fedbc-84b1-49d8-9b5a-3d20daf1e5e6
205bdc41-4872-4a0d-9e68-295e41da3803	SITE COORDINATION	\N	Site coordination activities	t	2025-12-19 17:11:20.933+02	2025-12-19 17:11:20.933+02	6c0fedbc-84b1-49d8-9b5a-3d20daf1e5e6
081b1436-35c4-4de6-9b1d-be6fa0f299f8	STORES	\N	Stores and inventory management	t	2025-12-19 17:11:20.935+02	2025-12-19 17:11:20.935+02	6c0fedbc-84b1-49d8-9b5a-3d20daf1e5e6
4cc15b4d-688d-40bb-9974-1b8340594027	TRAINING	\N	Training and development	t	2025-12-19 17:11:20.937+02	2025-12-19 17:11:20.937+02	6c0fedbc-84b1-49d8-9b5a-3d20daf1e5e6
0b8f0ba2-cfd6-42d8-8b58-d81b33ff2b71	HEAD OFFICE	\N	Head office operations	t	2025-12-19 17:11:20.941+02	2025-12-19 17:11:20.941+02	cc45c464-fca4-493b-b794-bc5da21641ef
5e6a2ece-98b5-48fb-9e0d-d6df5aea47a0	CIVILS	\N	Civil maintenance and construction	t	2025-12-19 17:11:20.943+02	2025-12-19 17:11:20.943+02	c1b04dfd-cca0-4df7-a40f-e2fcd7decc89
b0d59194-4032-43c3-a0ca-fedcbf0fa95b	ELECTRICAL	\N	Electrical maintenance	t	2025-12-19 17:11:20.945+02	2025-12-19 17:11:20.945+02	c1b04dfd-cca0-4df7-a40f-e2fcd7decc89
458a959e-8e06-40ae-9a90-13eff2315307	MECHANICAL	\N	Mechanical maintenance	t	2025-12-19 17:11:20.947+02	2025-12-19 17:11:20.947+02	c1b04dfd-cca0-4df7-a40f-e2fcd7decc89
792c13ed-aa0e-42cd-9743-0553edaf8caf	MM PLANNING	\N	Maintenance planning	t	2025-12-19 17:11:20.949+02	2025-12-19 17:11:20.949+02	c1b04dfd-cca0-4df7-a40f-e2fcd7decc89
34eab813-5d62-4c29-9bd9-ed0da7b573c5	MOBILE WORKSHOP	\N	Mobile workshop and field maintenance	t	2025-12-19 17:11:20.951+02	2025-12-19 17:11:20.951+02	c1b04dfd-cca0-4df7-a40f-e2fcd7decc89
29d8843a-cc16-40e0-9b42-c07ff46e5688	TAILS STORAGE FACILITY	\N	TSF maintenance	t	2025-12-19 17:11:20.953+02	2025-12-19 17:11:20.953+02	c1b04dfd-cca0-4df7-a40f-e2fcd7decc89
8da1877a-6619-40d7-bd19-073b5458ebba	MINING	\N	Mining operations	t	2025-12-19 17:11:20.955+02	2025-12-19 17:11:20.955+02	d804f917-ba8d-48b9-a578-586bb6265639
\.


--
-- TOC entry 5158 (class 0 OID 18485)
-- Dependencies: 243
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.settings (id, category, key, value, value_type, description, is_secret, updated_by, created_at, updated_at) FROM stdin;
2546f85c-b2a6-4776-8331-db212e9d56d0	general	systemName	PPE Management System	string	System display name	f	\N	2025-12-18 16:35:56.412+02	2025-12-18 16:35:56.412+02
61cb1917-92e1-48c0-888e-5905486268a1	general	organizationName	Your Organization	string	Organization name	f	\N	2025-12-18 16:35:56.488+02	2025-12-18 16:35:56.488+02
2d5a9a4c-2782-41bb-a61d-72ced50a9c18	general	timezone	Africa/Johannesburg	string	System timezone	f	\N	2025-12-18 16:35:56.5+02	2025-12-18 16:35:56.5+02
89e66de3-e940-4219-a283-6350f5cd4cc9	general	dateFormat	DD/MM/YYYY	string	Date display format	f	\N	2025-12-18 16:35:56.507+02	2025-12-18 16:35:56.507+02
67fdab55-f9f6-47ed-a5b6-be5ad256450a	general	currency	USD	string	Default currency	f	\N	2025-12-18 16:35:56.516+02	2025-12-18 16:35:56.516+02
6286115d-e2f6-406b-9ac4-c6e5ad4929c2	general	language	en	string	System language	f	\N	2025-12-18 16:35:56.525+02	2025-12-18 16:35:56.525+02
b3e1829d-c2cf-45bd-acf1-0af093e7824b	general	fiscalYearStart	January	string	Fiscal year start month	f	\N	2025-12-18 16:35:56.547+02	2025-12-18 16:35:56.547+02
e2233588-7685-4725-9fe7-ee11e06584f9	general	maintenanceMode	false	boolean	Enable maintenance mode	f	\N	2025-12-18 16:35:56.554+02	2025-12-18 16:35:56.554+02
ca399b21-71a3-42d0-9071-caaf39e7ed54	notifications	emailNotifications	true	boolean	Enable email notifications	f	\N	2025-12-18 16:35:56.56+02	2025-12-18 16:35:56.56+02
677725c0-3a0b-4e17-9cb7-49f8956c87c8	notifications	budgetAlerts	true	boolean	Enable budget alerts	f	\N	2025-12-18 16:35:56.565+02	2025-12-18 16:35:56.565+02
963b682d-0f78-43bc-aba2-165613ffc5bd	notifications	budgetThreshold	80	number	Budget alert threshold percentage	f	\N	2025-12-18 16:35:56.57+02	2025-12-18 16:35:56.57+02
89881edc-cac6-4b57-847d-4fdde6cecf33	notifications	approvalRequests	true	boolean	Notify on approval requests	f	\N	2025-12-18 16:35:56.574+02	2025-12-18 16:35:56.574+02
9449af48-b655-4353-bc63-ed845d849088	notifications	lowStockAlerts	true	boolean	Enable low stock alerts	f	\N	2025-12-18 16:35:56.577+02	2025-12-18 16:35:56.577+02
35ea6835-fa32-4edd-8117-c8729a50dd53	notifications	stockThreshold	10	number	Low stock threshold quantity	f	\N	2025-12-18 16:35:56.582+02	2025-12-18 16:35:56.582+02
79ec5126-b0e2-470a-8c29-69d012a3927b	notifications	weeklyReports	false	boolean	Send weekly reports	f	\N	2025-12-18 16:35:56.588+02	2025-12-18 16:35:56.588+02
280f0fcd-fb75-4826-91bc-4ec583e156b8	notifications	monthlyReports	true	boolean	Send monthly reports	f	\N	2025-12-18 16:35:56.594+02	2025-12-18 16:35:56.594+02
265aae62-75ee-4265-b770-776afbe9dad9	notifications	ppeExpiryAlerts	true	boolean	Alert before PPE expires	f	\N	2025-12-18 16:35:56.599+02	2025-12-18 16:35:56.599+02
7bf46d01-95a8-4d0c-9b09-6f4839d6966e	notifications	expiryDaysBefore	30	number	Days before expiry to alert	f	\N	2025-12-18 16:35:56.603+02	2025-12-18 16:35:56.603+02
9ce8a68d-fc13-4bb1-940b-8cefdd2097de	notifications	newUserAlerts	true	boolean	Alert on new user registration	f	\N	2025-12-18 16:35:56.607+02	2025-12-18 16:35:56.607+02
9d6a7a66-e2f8-4561-8919-b75178af2f4f	notifications	systemAlerts	true	boolean	Enable system alerts	f	\N	2025-12-18 16:35:56.611+02	2025-12-18 16:35:56.611+02
ee3c6573-f386-45d3-9daf-6b15942cff26	security	sessionTimeout	30	number	Session timeout in minutes	f	\N	2025-12-18 16:35:56.617+02	2025-12-18 16:35:56.617+02
f09282f5-edc4-42bb-b379-719adb13faf8	security	maxLoginAttempts	5	number	Max failed login attempts	f	\N	2025-12-18 16:35:56.621+02	2025-12-18 16:35:56.621+02
4089674d-c67f-4afc-8fc9-f6fbc8e2f5db	security	lockoutDuration	15	number	Account lockout duration in minutes	f	\N	2025-12-18 16:35:56.625+02	2025-12-18 16:35:56.625+02
9da97170-aa4a-4dca-b706-fb68f73b2cca	security	requireMfa	false	boolean	Require multi-factor authentication	f	\N	2025-12-18 16:35:56.628+02	2025-12-18 16:35:56.628+02
7761aba3-371d-4320-b591-06f7e767992e	security	passwordMinLength	8	number	Minimum password length	f	\N	2025-12-18 16:35:56.632+02	2025-12-18 16:35:56.632+02
251940ca-ab9d-4950-ac80-0e27521e4ac0	security	requireUppercase	true	boolean	Require uppercase in password	f	\N	2025-12-18 16:35:56.635+02	2025-12-18 16:35:56.635+02
8463d6e0-de7c-47e2-b6f4-acff268f4161	security	requireNumbers	true	boolean	Require numbers in password	f	\N	2025-12-18 16:35:56.639+02	2025-12-18 16:35:56.639+02
db9624a1-86d9-4a6b-b951-501a75e779d0	security	requireSpecialChars	true	boolean	Require special chars in password	f	\N	2025-12-18 16:35:56.644+02	2025-12-18 16:35:56.644+02
82e0992d-cc0a-4f18-b17c-953ba2091c06	security	passwordExpiry	90	number	Password expiry in days	f	\N	2025-12-18 16:35:56.649+02	2025-12-18 16:35:56.649+02
f8ef52d4-3237-496a-809f-8b779415c48e	security	ipWhitelisting	false	boolean	Enable IP whitelisting	f	\N	2025-12-18 16:35:56.653+02	2025-12-18 16:35:56.653+02
6944c388-fb3b-4667-b7fc-3406c090aaad	security	auditLogging	true	boolean	Enable audit logging	f	\N	2025-12-18 16:35:56.657+02	2025-12-18 16:35:56.657+02
8ea428bd-d626-491c-b0f2-92c544348af8	database	autoBackup	true	boolean	Enable automatic backups	f	\N	2025-12-18 16:35:56.66+02	2025-12-18 16:35:56.66+02
c9e3307e-9852-4424-951a-da67eee94533	database	backupTime	18:00	string	Daily backup time (24h format)	f	\N	2025-12-18 16:35:56.664+02	2025-12-18 16:35:56.664+02
4bbcb0dc-f40f-4924-b8d6-780ba32f761b	database	backupRetention	30	number	Backup retention in days	f	\N	2025-12-18 16:35:56.668+02	2025-12-18 16:35:56.668+02
fa146140-8c4f-4cd1-b027-be9d2a572110	database	backupPath	./backups	string	Backup storage path	f	\N	2025-12-18 16:35:56.678+02	2025-12-18 16:35:56.678+02
57a515e8-2c89-42ca-9047-54e0aa50b5b1	email	smtpServer		string	SMTP server address	f	\N	2025-12-18 16:35:56.682+02	2025-12-18 16:35:56.682+02
bfe1b2ab-e9f5-46f4-a4dc-928eb8a73de2	email	smtpPort	587	number	SMTP port	f	\N	2025-12-18 16:35:56.687+02	2025-12-18 16:35:56.687+02
910c31e3-4152-4dff-861d-b8836e56b540	email	encryption	tls	string	SMTP encryption	f	\N	2025-12-18 16:35:56.692+02	2025-12-18 16:35:56.692+02
4402d0c7-b8b8-4d74-be7a-54ab27152fdb	email	smtpUsername		string	SMTP username	t	\N	2025-12-18 16:35:56.696+02	2025-12-18 16:35:56.696+02
5d772ae3-8d2a-4455-ab6f-f311483a5ad6	email	smtpPassword		string	SMTP password	t	\N	2025-12-18 16:35:56.7+02	2025-12-18 16:35:56.7+02
971cbdeb-1dc9-4f9d-bea3-2a590d542878	email	fromEmail	noreply@company.com	string	From email address	f	\N	2025-12-18 16:35:56.704+02	2025-12-18 16:35:56.704+02
481f78fa-3fe7-4e1e-b1bc-3ba7e646c78d	email	fromName	PPE Management System	string	From name	f	\N	2025-12-18 16:35:56.71+02	2025-12-18 16:35:56.71+02
37856c0b-f565-4ac9-a570-438e4b23faf1	email	replyTo	support@company.com	string	Reply-to address	f	\N	2025-12-18 16:35:56.715+02	2025-12-18 16:35:56.715+02
b4a9b9e6-cee2-482a-b4c6-704165428e18	email	maxRetries	3	number	Max email retry attempts	f	\N	2025-12-18 16:35:56.719+02	2025-12-18 16:35:56.719+02
1270a173-860d-495f-9e2f-443dce5786bc	email	rateLimitPerHour	100	number	Max emails per hour	f	\N	2025-12-18 16:35:56.723+02	2025-12-18 16:35:56.723+02
1117fc33-777c-4a5c-9fbb-077a58b8e203	appearance	theme	system	string	Color theme	f	\N	2025-12-18 16:35:56.728+02	2025-12-18 16:35:56.728+02
f9b0590a-a21a-4158-9c1d-5003701bafec	appearance	primaryColor	#0066CC	string	Primary brand color	f	\N	2025-12-18 16:35:56.732+02	2025-12-18 16:35:56.732+02
4cdfe602-c597-47a7-a5f9-b1718379e303	appearance	sidebarPosition	left	string	Sidebar position	f	\N	2025-12-18 16:35:56.736+02	2025-12-18 16:35:56.736+02
9ec701bf-a72c-46e0-b3e5-6b3aa8c80675	appearance	compactMode	false	boolean	Enable compact mode	f	\N	2025-12-18 16:35:56.741+02	2025-12-18 16:35:56.741+02
d31eddd8-8412-471e-8bcb-cc402ad5f52c	appearance	showBreadcrumbs	true	boolean	Show breadcrumbs	f	\N	2025-12-18 16:35:56.745+02	2025-12-18 16:35:56.745+02
a43d8890-ddb6-4188-a8a0-e7c5040364ec	appearance	animationsEnabled	true	boolean	Enable animations	f	\N	2025-12-18 16:35:56.749+02	2025-12-18 16:35:56.749+02
796a6b19-454f-4d03-9b7a-cd27750028de	appearance	tableRowsPerPage	10	number	Default table rows per page	f	\N	2025-12-18 16:35:56.753+02	2025-12-18 16:35:56.753+02
a0d4dfbb-31e0-407b-a697-d002a383c18a	appearance	dateTimeFormat	12h	string	Time format (12h/24h)	f	\N	2025-12-18 16:35:56.758+02	2025-12-18 16:35:56.758+02
9ec3c06e-9fc7-4adc-b8dd-e32918082c11	api	rateLimitEnabled	true	boolean	Enable API rate limiting	f	\N	2025-12-18 16:35:56.762+02	2025-12-18 16:35:56.762+02
aec7c9bf-4c72-4cad-9d2c-58256c500ffb	api	requestsPerMinute	60	number	Max requests per minute	f	\N	2025-12-18 16:35:56.768+02	2025-12-18 16:35:56.768+02
338d1690-bb19-491c-b36c-0ac53b82633f	api	requestsPerHour	1000	number	Max requests per hour	f	\N	2025-12-18 16:35:56.773+02	2025-12-18 16:35:56.773+02
8d1d0851-0363-47c1-b1f3-b719f5a0bec2	users	defaultRole	section_rep	string	Default role for new users	f	\N	2025-12-18 16:35:56.778+02	2025-12-18 16:35:56.778+02
c9356fd6-a7cf-49ef-9078-343fdf64d073	users	requireEmailVerification	true	boolean	Require email verification	f	\N	2025-12-18 16:35:56.793+02	2025-12-18 16:35:56.793+02
61b770ae-34d1-4582-98c1-84507a98ca96	users	autoActivateAccounts	false	boolean	Auto-activate accounts	f	\N	2025-12-18 16:35:56.804+02	2025-12-18 16:35:56.804+02
404ce705-1e7c-478c-96cc-9404d43e3aa7	users	welcomeEmailEnabled	true	boolean	Send welcome email	f	\N	2025-12-18 16:35:56.813+02	2025-12-18 16:35:56.813+02
f8142848-4fd0-432e-b6d6-130122139952	users	passwordResetExpiry	24	number	Password reset link expiry in hours	f	\N	2025-12-18 16:35:56.819+02	2025-12-18 16:35:56.819+02
9a7ed606-160c-42d5-8f28-239c4686c62e	users	defaultDashboard	role_based	string	Default dashboard type	f	\N	2025-12-18 16:35:56.823+02	2025-12-18 16:35:56.823+02
957e1231-c33b-4269-b377-ec2c5ee9604b	users	maxPPERequestItems	10	number	Max items per PPE request	f	\N	2025-12-18 16:35:56.831+02	2025-12-18 16:35:56.831+02
e26065f9-9de2-4058-b412-4b2d9fa856db	users	requireManagerApproval	true	boolean	Require manager approval for requests	f	\N	2025-12-18 16:35:56.835+02	2025-12-18 16:35:56.835+02
444d6cc6-d132-4cf7-ab50-b7d13becc1f5	users	allowSelfRegistration	false	boolean	Allow self registration	f	\N	2025-12-18 16:35:56.848+02	2025-12-18 16:35:56.848+02
\.


--
-- TOC entry 5144 (class 0 OID 18035)
-- Dependencies: 229
-- Data for Name: size_scales; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.size_scales (id, code, name, category_group, description, is_active, created_at, updated_at) FROM stdin;
e98f2211-2136-4d59-b5fa-c2e4b29d5b63	BODY_NUMERIC	Body/Torso Numeric (34-50)	BODY/TORSO	Numeric sizing for body/torso garments (worksuits, jackets, etc.)	t	2025-12-19 17:33:30.367+02	2025-12-19 17:33:30.367+02
c7a3839c-74f9-422d-924d-a3ce48c595e6	BODY_ALPHA	Body/Torso Alpha (XS-3XL)	BODY/TORSO	Alpha sizing for body/torso garments (XS, S, M, L, XL, 2XL, 3XL)	t	2025-12-19 17:33:30.469+02	2025-12-19 17:33:30.469+02
bd3c9780-06c9-4312-873e-d4d392df7fa2	FEET	Footwear (4-13)	FEET	Footwear sizing (UK sizes 4-13)	t	2025-12-19 17:33:30.519+02	2025-12-19 17:33:30.519+02
a0621c20-c4a1-45c2-b2ef-79a01fa86f42	GLOVES	Gloves (S-XL)	HANDS	Glove sizing	t	2025-12-19 17:33:30.552+02	2025-12-19 17:33:30.552+02
037b1358-c94f-44a4-9e6c-5e651862e494	HEAD	Head Gear	HEAD	Head gear sizing (hard hats, helmets)	t	2025-12-19 17:33:30.566+02	2025-12-19 17:33:30.566+02
d1ec2734-aafe-458a-897f-070b8dc942c4	RESPIRATOR	Respirator	RESPIRATORY	Respirator face piece sizing	t	2025-12-19 17:33:30.577+02	2025-12-19 17:33:30.577+02
7b648367-f007-42f7-8ee3-744978d5af1e	ONESIZE	One Size / Standard	GENERAL	Items that come in standard/one size only	t	2025-12-19 17:33:30.6+02	2025-12-19 17:33:30.6+02
3c718ddd-593a-432c-9fda-f90c7dfd5660	EYEWEAR	Eye Protection	EYES/FACE	Safety glasses and eye protection sizing	t	2025-12-19 17:33:30.612+02	2025-12-19 17:33:30.612+02
\.


--
-- TOC entry 5145 (class 0 OID 18047)
-- Dependencies: 230
-- Data for Name: sizes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sizes (id, scale_id, value, label, sort_order, eu_size, us_size, uk_size, meta, created_at, updated_at) FROM stdin;
ba56160c-1c2e-443e-9055-771c9d57fe95	e98f2211-2136-4d59-b5fa-c2e4b29d5b63	34	34	0	\N	\N	\N	\N	2025-12-19 17:33:30.414+02	2025-12-19 17:33:30.414+02
a44c9f7e-4807-4ddd-94fb-f1a000fe11c2	e98f2211-2136-4d59-b5fa-c2e4b29d5b63	36	36	1	\N	\N	\N	\N	2025-12-19 17:33:30.429+02	2025-12-19 17:33:30.429+02
282bebe4-b2cb-409f-b5b4-6979b57be9c9	e98f2211-2136-4d59-b5fa-c2e4b29d5b63	38	38	2	\N	\N	\N	\N	2025-12-19 17:33:30.434+02	2025-12-19 17:33:30.434+02
35858795-bb87-4715-87e3-38dc5fa03870	e98f2211-2136-4d59-b5fa-c2e4b29d5b63	40	40	3	\N	\N	\N	\N	2025-12-19 17:33:30.441+02	2025-12-19 17:33:30.441+02
643557bc-f6a0-4c50-b125-acfb130a555e	e98f2211-2136-4d59-b5fa-c2e4b29d5b63	42	42	4	\N	\N	\N	\N	2025-12-19 17:33:30.446+02	2025-12-19 17:33:30.446+02
d4d15676-4707-4a03-9969-4f3bfcaab8ac	e98f2211-2136-4d59-b5fa-c2e4b29d5b63	44	44	5	\N	\N	\N	\N	2025-12-19 17:33:30.451+02	2025-12-19 17:33:30.451+02
39098dcc-afaa-44b0-ab9b-33f7292909a0	e98f2211-2136-4d59-b5fa-c2e4b29d5b63	46	46	6	\N	\N	\N	\N	2025-12-19 17:33:30.455+02	2025-12-19 17:33:30.455+02
e7a3fc81-0793-4511-b7ce-fe33b5269417	e98f2211-2136-4d59-b5fa-c2e4b29d5b63	48	48	7	\N	\N	\N	\N	2025-12-19 17:33:30.459+02	2025-12-19 17:33:30.459+02
dd433d2d-102f-4131-9f22-77bdc6237faf	e98f2211-2136-4d59-b5fa-c2e4b29d5b63	50	50	8	\N	\N	\N	\N	2025-12-19 17:33:30.463+02	2025-12-19 17:33:30.463+02
6ca23634-27e2-4f42-a85e-81cfe44f78f7	e98f2211-2136-4d59-b5fa-c2e4b29d5b63	Std	Standard	9	\N	\N	\N	\N	2025-12-19 17:33:30.466+02	2025-12-19 17:33:30.466+02
dbb92caf-8dfd-4a7c-95f8-fab0a82213df	c7a3839c-74f9-422d-924d-a3ce48c595e6	XS	Extra Small	0	\N	\N	\N	\N	2025-12-19 17:33:30.472+02	2025-12-19 17:33:30.472+02
d488d695-fa28-4797-bb60-2c04ecc4b886	c7a3839c-74f9-422d-924d-a3ce48c595e6	S	Small	1	\N	\N	\N	\N	2025-12-19 17:33:30.474+02	2025-12-19 17:33:30.474+02
be4a4d20-fe04-4559-90a6-97cab4ba6de2	c7a3839c-74f9-422d-924d-a3ce48c595e6	M	Medium	2	\N	\N	\N	\N	2025-12-19 17:33:30.476+02	2025-12-19 17:33:30.476+02
393bf326-9da7-4c19-9e53-5721a40e7747	c7a3839c-74f9-422d-924d-a3ce48c595e6	L	Large	3	\N	\N	\N	\N	2025-12-19 17:33:30.497+02	2025-12-19 17:33:30.497+02
42d98846-b3ac-430a-a495-0deeca6dc0f6	c7a3839c-74f9-422d-924d-a3ce48c595e6	XL	Extra Large	4	\N	\N	\N	\N	2025-12-19 17:33:30.502+02	2025-12-19 17:33:30.502+02
fad3ff10-7594-4f3f-aae8-f22d7e5a2ef1	c7a3839c-74f9-422d-924d-a3ce48c595e6	2XL	2X Large	5	\N	\N	\N	\N	2025-12-19 17:33:30.508+02	2025-12-19 17:33:30.508+02
cfe4de38-fd4e-40f8-8a9c-e86df21e9f6f	c7a3839c-74f9-422d-924d-a3ce48c595e6	3XL	3X Large	6	\N	\N	\N	\N	2025-12-19 17:33:30.512+02	2025-12-19 17:33:30.512+02
9ab15542-4b9e-4914-9346-073c156ff2b2	c7a3839c-74f9-422d-924d-a3ce48c595e6	Std	Standard	7	\N	\N	\N	\N	2025-12-19 17:33:30.516+02	2025-12-19 17:33:30.516+02
ac309c54-c8d0-43b0-8535-d096aab065b5	bd3c9780-06c9-4312-873e-d4d392df7fa2	4	4	0	\N	\N	4	\N	2025-12-19 17:33:30.522+02	2025-12-19 17:33:30.522+02
f8e1d905-f2cf-4f07-8111-038422222b59	bd3c9780-06c9-4312-873e-d4d392df7fa2	5	5	1	\N	\N	5	\N	2025-12-19 17:33:30.525+02	2025-12-19 17:33:30.525+02
bd6a1208-a934-4d38-852c-408e389aa63e	bd3c9780-06c9-4312-873e-d4d392df7fa2	6	6	2	\N	\N	6	\N	2025-12-19 17:33:30.53+02	2025-12-19 17:33:30.53+02
ffc2ac30-12bd-4f6c-bb50-abd5df625c16	bd3c9780-06c9-4312-873e-d4d392df7fa2	7	7	3	\N	\N	7	\N	2025-12-19 17:33:30.533+02	2025-12-19 17:33:30.533+02
531ffb2c-c2a2-4357-9921-314451f2f967	bd3c9780-06c9-4312-873e-d4d392df7fa2	8	8	4	\N	\N	8	\N	2025-12-19 17:33:30.536+02	2025-12-19 17:33:30.536+02
c04f932b-683b-4b6d-8eae-f6e554ad8ac3	bd3c9780-06c9-4312-873e-d4d392df7fa2	9	9	5	\N	\N	9	\N	2025-12-19 17:33:30.539+02	2025-12-19 17:33:30.539+02
91de3b33-bce3-4aed-ac9a-436e57212357	bd3c9780-06c9-4312-873e-d4d392df7fa2	10	10	6	\N	\N	10	\N	2025-12-19 17:33:30.542+02	2025-12-19 17:33:30.542+02
e7ad81df-1d67-45f7-a307-cd9a09992074	bd3c9780-06c9-4312-873e-d4d392df7fa2	11	11	7	\N	\N	11	\N	2025-12-19 17:33:30.544+02	2025-12-19 17:33:30.544+02
d1c07fa2-f934-491b-a9d1-98c3724057e1	bd3c9780-06c9-4312-873e-d4d392df7fa2	12	12	8	\N	\N	12	\N	2025-12-19 17:33:30.545+02	2025-12-19 17:33:30.545+02
589cc9e0-beb6-4a92-8d75-421628880f7d	bd3c9780-06c9-4312-873e-d4d392df7fa2	13	13	9	\N	\N	13	\N	2025-12-19 17:33:30.547+02	2025-12-19 17:33:30.547+02
6f1413bd-4a43-4173-8182-31817321793e	bd3c9780-06c9-4312-873e-d4d392df7fa2	Std	Standard	10	\N	\N	\N	\N	2025-12-19 17:33:30.55+02	2025-12-19 17:33:30.55+02
f3122357-1316-4f84-8ce5-056a84f21e84	a0621c20-c4a1-45c2-b2ef-79a01fa86f42	S	Small	0	\N	\N	\N	\N	2025-12-19 17:33:30.555+02	2025-12-19 17:33:30.555+02
578eff1b-3a4a-4fb5-82d0-19c76ff4cfe6	a0621c20-c4a1-45c2-b2ef-79a01fa86f42	M	Medium	1	\N	\N	\N	\N	2025-12-19 17:33:30.556+02	2025-12-19 17:33:30.556+02
57474493-13e7-4b8e-bbc0-c9a26f598f58	a0621c20-c4a1-45c2-b2ef-79a01fa86f42	L	Large	2	\N	\N	\N	\N	2025-12-19 17:33:30.559+02	2025-12-19 17:33:30.559+02
2fd50fc1-0571-446c-927e-a3e0c212c30b	a0621c20-c4a1-45c2-b2ef-79a01fa86f42	XL	Extra Large	3	\N	\N	\N	\N	2025-12-19 17:33:30.561+02	2025-12-19 17:33:30.561+02
63ba9040-4ae8-4ede-8b7e-7ba5c591b190	a0621c20-c4a1-45c2-b2ef-79a01fa86f42	Std	Standard/One Size	4	\N	\N	\N	\N	2025-12-19 17:33:30.563+02	2025-12-19 17:33:30.563+02
8b1cf540-f32f-454d-9f66-5fe9ba53b34c	037b1358-c94f-44a4-9e6c-5e651862e494	S	Small	0	\N	\N	\N	\N	2025-12-19 17:33:30.568+02	2025-12-19 17:33:30.568+02
8734ff25-7d03-4334-ae4a-2c0c7f5ffc71	037b1358-c94f-44a4-9e6c-5e651862e494	M	Medium	1	\N	\N	\N	\N	2025-12-19 17:33:30.572+02	2025-12-19 17:33:30.572+02
32b2d446-7f83-4e34-aa8e-07f0ecc673e5	037b1358-c94f-44a4-9e6c-5e651862e494	L	Large	2	\N	\N	\N	\N	2025-12-19 17:33:30.574+02	2025-12-19 17:33:30.574+02
e846efc2-4abd-454c-9c97-1c29de55c324	037b1358-c94f-44a4-9e6c-5e651862e494	Std	Standard/Adjustable	3	\N	\N	\N	\N	2025-12-19 17:33:30.575+02	2025-12-19 17:33:30.575+02
320f72ed-f3f3-412b-8bfe-f8340cbae2b0	d1ec2734-aafe-458a-897f-070b8dc942c4	S	Small	0	\N	\N	\N	\N	2025-12-19 17:33:30.579+02	2025-12-19 17:33:30.579+02
9e1e08d8-b617-44b3-849a-d0e8c2dae210	d1ec2734-aafe-458a-897f-070b8dc942c4	M	Medium	1	\N	\N	\N	\N	2025-12-19 17:33:30.581+02	2025-12-19 17:33:30.581+02
8c587b53-dca4-431a-97b5-b0af9dde9fa9	d1ec2734-aafe-458a-897f-070b8dc942c4	L	Large	2	\N	\N	\N	\N	2025-12-19 17:33:30.583+02	2025-12-19 17:33:30.583+02
10f1109c-3df1-4168-aa16-91f2665d3072	d1ec2734-aafe-458a-897f-070b8dc942c4	Std	Standard/One Size	3	\N	\N	\N	\N	2025-12-19 17:33:30.595+02	2025-12-19 17:33:30.595+02
cbce8498-f0ef-4670-a7ba-3021aa6ffe64	7b648367-f007-42f7-8ee3-744978d5af1e	Std	Standard	0	\N	\N	\N	\N	2025-12-19 17:33:30.604+02	2025-12-19 17:33:30.604+02
57820da5-d796-436a-af3f-3f754ab15165	7b648367-f007-42f7-8ee3-744978d5af1e	One Size	One Size	1	\N	\N	\N	\N	2025-12-19 17:33:30.608+02	2025-12-19 17:33:30.608+02
552699f5-9c13-4958-9997-b5cc1e1654b5	3c718ddd-593a-432c-9fda-f90c7dfd5660	Std	Standard	0	\N	\N	\N	\N	2025-12-19 17:33:30.614+02	2025-12-19 17:33:30.614+02
77e236f9-2886-47f2-b524-48c871d91212	3c718ddd-593a-432c-9fda-f90c7dfd5660	Narrow	Narrow Fit	1	\N	\N	\N	\N	2025-12-19 17:33:30.617+02	2025-12-19 17:33:30.617+02
43830829-6e6b-446a-b1ba-e70c2e1fca23	3c718ddd-593a-432c-9fda-f90c7dfd5660	Wide	Wide Fit	2	\N	\N	\N	\N	2025-12-19 17:33:30.619+02	2025-12-19 17:33:30.619+02
\.


--
-- TOC entry 5148 (class 0 OID 18109)
-- Dependencies: 233
-- Data for Name: stocks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stocks (id, quantity, min_level, max_level, reorder_point, unit_cost, unit_price_u_s_d, total_value_u_s_d, stock_account, location, bin_location, batch_number, expiry_date, size, color, last_restocked, last_stock_take, notes, eligible_departments, eligible_sections, created_at, updated_at, ppe_item_id) FROM stdin;
\.


--
-- TOC entry 5142 (class 0 OID 17973)
-- Dependencies: 227
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, username, password_hash, employee_id, role_id, department_id, section_id, is_active, last_login, created_at, updated_at) FROM stdin;
610926ab-85aa-43a4-af73-97c7df13a69c	dp173	$2a$10$xXUlTFsTLVABpIwE7JInCOh/p50Bk7F9N9xXhkl/b0k3ADKgQerKi	6df30475-8134-45a2-a722-00c1b45f9e7a	1abfb90b-03fc-4dc3-93a0-3a8ea58da828	\N	\N	t	\N	2025-12-19 17:16:22.942+02	2025-12-19 17:16:22.942+02
542e56df-94d9-47cf-9c70-842f858e9fe8	dp273	$2a$10$I50Jh3l9P0gDSODnP1EWH.2k8Zt8AQJHz3kADvO5scZ0UMXRIPPkC	1e51daf4-3910-4b39-82a7-fa2acfaebed7	1abfb90b-03fc-4dc3-93a0-3a8ea58da828	\N	\N	t	2025-12-19 17:32:15.013+02	2025-12-19 17:32:02.913+02	2025-12-19 17:32:15.013+02
75fdd729-2394-41dc-ac58-048ff1adce90	sysadmin	$2a$10$fgqV11EkF7I.s3G3YdM9IeqhHeAXjWIu.vfdqXmfOir9BU65qLGTq	\N	7927c487-fd02-4561-8e2b-a369211dbd69	\N	\N	t	2025-12-19 17:42:54.113+02	2025-12-18 16:33:24.064+02	2025-12-19 17:42:54.113+02
124329dc-1b56-482d-84c9-011310287b89	dp329	$2a$10$lNChgWeHF7aHSQSI3PTlH.lPQ8kKCsJonCLybFP2T0EWXgCcr2vtS	03ebca57-acf4-4308-b37a-cd144783b590	ee50b1f1-1efd-4624-a1c1-fd99a8a9de46	\N	3c553423-c8f3-4c6e-97ac-1436febda45b	t	2025-12-19 17:45:33.776+02	2025-12-19 17:44:10.311+02	2025-12-19 17:45:33.776+02
885bfd3a-aa53-4a4f-a5ec-92b59c4d21be	dp140	$2a$10$2PqoO2aIrbfKZ6jHutH42OYYtvtmpRNcv6vRCFLYaoRSFUYkIXqEq	7d9fc107-64bd-4946-96fa-eb836f7fb0a8	bb738a2e-f549-43cd-81bf-be80091450f5	6c0fedbc-84b1-49d8-9b5a-3d20daf1e5e6	\N	t	2025-12-19 17:46:46.95+02	2025-12-19 17:44:46.095+02	2025-12-19 17:46:46.95+02
\.


--
-- TOC entry 4898 (class 2606 OID 18263)
-- Name: allocations allocations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocations
    ADD CONSTRAINT allocations_pkey PRIMARY KEY (id);


--
-- TOC entry 4908 (class 2606 OID 18431)
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 4904 (class 2606 OID 18342)
-- Name: budgets budgets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_pkey PRIMARY KEY (id);


--
-- TOC entry 4900 (class 2606 OID 18308)
-- Name: company_budgets company_budgets_fiscal_year_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_budgets
    ADD CONSTRAINT company_budgets_fiscal_year_key UNIQUE (fiscal_year);


--
-- TOC entry 4902 (class 2606 OID 18306)
-- Name: company_budgets company_budgets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_budgets
    ADD CONSTRAINT company_budgets_pkey PRIMARY KEY (id);


--
-- TOC entry 4929 (class 2606 OID 18624)
-- Name: consumable_allocations consumable_allocations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consumable_allocations
    ADD CONSTRAINT consumable_allocations_pkey PRIMARY KEY (id);


--
-- TOC entry 4917 (class 2606 OID 18505)
-- Name: consumable_items consumable_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consumable_items
    ADD CONSTRAINT consumable_items_pkey PRIMARY KEY (id);


--
-- TOC entry 4919 (class 2606 OID 18507)
-- Name: consumable_items consumable_items_product_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consumable_items
    ADD CONSTRAINT consumable_items_product_code_key UNIQUE (product_code);


--
-- TOC entry 4927 (class 2606 OID 18607)
-- Name: consumable_request_items consumable_request_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consumable_request_items
    ADD CONSTRAINT consumable_request_items_pkey PRIMARY KEY (id);


--
-- TOC entry 4923 (class 2606 OID 18559)
-- Name: consumable_requests consumable_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consumable_requests
    ADD CONSTRAINT consumable_requests_pkey PRIMARY KEY (id);


--
-- TOC entry 4925 (class 2606 OID 18561)
-- Name: consumable_requests consumable_requests_request_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consumable_requests
    ADD CONSTRAINT consumable_requests_request_number_key UNIQUE (request_number);


--
-- TOC entry 4921 (class 2606 OID 18516)
-- Name: consumable_stocks consumable_stocks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consumable_stocks
    ADD CONSTRAINT consumable_stocks_pkey PRIMARY KEY (id);


--
-- TOC entry 4837 (class 2606 OID 17924)
-- Name: cost_centers cost_centers_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cost_centers
    ADD CONSTRAINT cost_centers_code_key UNIQUE (code);


--
-- TOC entry 4840 (class 2606 OID 17922)
-- Name: cost_centers cost_centers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cost_centers
    ADD CONSTRAINT cost_centers_pkey PRIMARY KEY (id);


--
-- TOC entry 4828 (class 2606 OID 17901)
-- Name: departments departments_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_code_key UNIQUE (code);


--
-- TOC entry 4830 (class 2606 OID 17899)
-- Name: departments departments_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_name_key UNIQUE (name);


--
-- TOC entry 4832 (class 2606 OID 17897)
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- TOC entry 4910 (class 2606 OID 18456)
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- TOC entry 4847 (class 2606 OID 17955)
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- TOC entry 4849 (class 2606 OID 17957)
-- Name: employees employees_worksNumber_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT "employees_worksNumber_key" UNIQUE ("worksNumber");


--
-- TOC entry 4906 (class 2606 OID 18399)
-- Name: failure_reports failure_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.failure_reports
    ADD CONSTRAINT failure_reports_pkey PRIMARY KEY (id);


--
-- TOC entry 4912 (class 2606 OID 18474)
-- Name: forecasts forecasts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forecasts
    ADD CONSTRAINT forecasts_pkey PRIMARY KEY (id);


--
-- TOC entry 4881 (class 2606 OID 18072)
-- Name: job_title_ppe_matrix job_title_ppe_matrix_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_title_ppe_matrix
    ADD CONSTRAINT job_title_ppe_matrix_pkey PRIMARY KEY (id);


--
-- TOC entry 4842 (class 2606 OID 17941)
-- Name: job_titles job_titles_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_titles
    ADD CONSTRAINT job_titles_code_key UNIQUE (code);


--
-- TOC entry 4844 (class 2606 OID 17939)
-- Name: job_titles job_titles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_titles
    ADD CONSTRAINT job_titles_pkey PRIMARY KEY (id);


--
-- TOC entry 4860 (class 2606 OID 18027)
-- Name: ppe_items ppe_items_item_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ppe_items
    ADD CONSTRAINT ppe_items_item_code_key UNIQUE (item_code);


--
-- TOC entry 4862 (class 2606 OID 18029)
-- Name: ppe_items ppe_items_item_ref_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ppe_items
    ADD CONSTRAINT ppe_items_item_ref_code_key UNIQUE (item_ref_code);


--
-- TOC entry 4864 (class 2606 OID 18025)
-- Name: ppe_items ppe_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ppe_items
    ADD CONSTRAINT ppe_items_pkey PRIMARY KEY (id);


--
-- TOC entry 4896 (class 2606 OID 18224)
-- Name: request_items request_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_items
    ADD CONSTRAINT request_items_pkey PRIMARY KEY (id);


--
-- TOC entry 4894 (class 2606 OID 18166)
-- Name: requests requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_pkey PRIMARY KEY (id);


--
-- TOC entry 4824 (class 2606 OID 17889)
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- TOC entry 4826 (class 2606 OID 17887)
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- TOC entry 4885 (class 2606 OID 18096)
-- Name: section_ppe_matrix section_ppe_matrix_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.section_ppe_matrix
    ADD CONSTRAINT section_ppe_matrix_pkey PRIMARY KEY (id);


--
-- TOC entry 4834 (class 2606 OID 17909)
-- Name: sections sections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sections
    ADD CONSTRAINT sections_pkey PRIMARY KEY (id);


--
-- TOC entry 4915 (class 2606 OID 18493)
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- TOC entry 4870 (class 2606 OID 18044)
-- Name: size_scales size_scales_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.size_scales
    ADD CONSTRAINT size_scales_code_key UNIQUE (code);


--
-- TOC entry 4872 (class 2606 OID 18042)
-- Name: size_scales size_scales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.size_scales
    ADD CONSTRAINT size_scales_pkey PRIMARY KEY (id);


--
-- TOC entry 4874 (class 2606 OID 18054)
-- Name: sizes sizes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sizes
    ADD CONSTRAINT sizes_pkey PRIMARY KEY (id);


--
-- TOC entry 4890 (class 2606 OID 18118)
-- Name: stocks stocks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stocks
    ADD CONSTRAINT stocks_pkey PRIMARY KEY (id);


--
-- TOC entry 4851 (class 2606 OID 17982)
-- Name: users users_employee_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_employee_id_key UNIQUE (employee_id);


--
-- TOC entry 4853 (class 2606 OID 17978)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4855 (class 2606 OID 17980)
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- TOC entry 4835 (class 1259 OID 17930)
-- Name: cost_centers_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX cost_centers_code ON public.cost_centers USING btree (code);


--
-- TOC entry 4838 (class 1259 OID 17931)
-- Name: cost_centers_department_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cost_centers_department_id ON public.cost_centers USING btree (department_id);


--
-- TOC entry 4878 (class 1259 OID 18086)
-- Name: job_title_ppe_matrix_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX job_title_ppe_matrix_category ON public.job_title_ppe_matrix USING btree (category);


--
-- TOC entry 4879 (class 1259 OID 18084)
-- Name: job_title_ppe_matrix_job_title; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX job_title_ppe_matrix_job_title ON public.job_title_ppe_matrix USING btree (job_title);


--
-- TOC entry 4882 (class 1259 OID 18085)
-- Name: job_title_ppe_matrix_ppe_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX job_title_ppe_matrix_ppe_item_id ON public.job_title_ppe_matrix USING btree (ppe_item_id);


--
-- TOC entry 4856 (class 1259 OID 18033)
-- Name: ppe_items_account_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ppe_items_account_code ON public.ppe_items USING btree (account_code);


--
-- TOC entry 4857 (class 1259 OID 18032)
-- Name: ppe_items_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ppe_items_category ON public.ppe_items USING btree (category);


--
-- TOC entry 4858 (class 1259 OID 18030)
-- Name: ppe_items_item_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ppe_items_item_code ON public.ppe_items USING btree (item_code);


--
-- TOC entry 4865 (class 1259 OID 18034)
-- Name: ppe_items_size_scale; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ppe_items_size_scale ON public.ppe_items USING btree (size_scale);


--
-- TOC entry 4886 (class 1259 OID 18108)
-- Name: section_ppe_matrix_section_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX section_ppe_matrix_section_id ON public.section_ppe_matrix USING btree (section_id);


--
-- TOC entry 4913 (class 1259 OID 18494)
-- Name: settings_category_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX settings_category_key ON public.settings USING btree (category, key);


--
-- TOC entry 4867 (class 1259 OID 18046)
-- Name: size_scales_category_group; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX size_scales_category_group ON public.size_scales USING btree (category_group);


--
-- TOC entry 4868 (class 1259 OID 18045)
-- Name: size_scales_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX size_scales_code ON public.size_scales USING btree (code);


--
-- TOC entry 4875 (class 1259 OID 18061)
-- Name: sizes_scale_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sizes_scale_id ON public.sizes USING btree (scale_id);


--
-- TOC entry 4876 (class 1259 OID 18060)
-- Name: sizes_scale_id_value; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sizes_scale_id_value ON public.sizes USING btree (scale_id, value);


--
-- TOC entry 4877 (class 1259 OID 18062)
-- Name: sizes_sort_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sizes_sort_order ON public.sizes USING btree (sort_order);


--
-- TOC entry 4888 (class 1259 OID 18126)
-- Name: stocks_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stocks_location ON public.stocks USING btree (location);


--
-- TOC entry 4891 (class 1259 OID 18125)
-- Name: stocks_ppe_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stocks_ppe_item_id ON public.stocks USING btree (ppe_item_id);


--
-- TOC entry 4866 (class 1259 OID 18031)
-- Name: unique_item_ref_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX unique_item_ref_code ON public.ppe_items USING btree (item_ref_code);


--
-- TOC entry 4845 (class 1259 OID 17947)
-- Name: unique_job_title_per_section; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX unique_job_title_per_section ON public.job_titles USING btree (name, "sectionId");


--
-- TOC entry 4883 (class 1259 OID 18083)
-- Name: unique_job_title_ppe_item; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX unique_job_title_ppe_item ON public.job_title_ppe_matrix USING btree (job_title, ppe_item_id);


--
-- TOC entry 4887 (class 1259 OID 18107)
-- Name: unique_section_ppe_item; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX unique_section_ppe_item ON public.section_ppe_matrix USING btree (section_id, ppe_item_id);


--
-- TOC entry 4892 (class 1259 OID 18124)
-- Name: unique_stock_variant; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX unique_stock_variant ON public.stocks USING btree (ppe_item_id, size, color, location);


--
-- TOC entry 4958 (class 2606 OID 18274)
-- Name: allocations allocations_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocations
    ADD CONSTRAINT allocations_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4959 (class 2606 OID 18279)
-- Name: allocations allocations_issued_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocations
    ADD CONSTRAINT allocations_issued_by_id_fkey FOREIGN KEY (issued_by_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4960 (class 2606 OID 18269)
-- Name: allocations allocations_ppe_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocations
    ADD CONSTRAINT allocations_ppe_item_id_fkey FOREIGN KEY (ppe_item_id) REFERENCES public.ppe_items(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4961 (class 2606 OID 18284)
-- Name: allocations allocations_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocations
    ADD CONSTRAINT allocations_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.requests(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4962 (class 2606 OID 18264)
-- Name: allocations allocations_stock_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocations
    ADD CONSTRAINT allocations_stock_id_fkey FOREIGN KEY (stock_id) REFERENCES public.stocks(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4972 (class 2606 OID 18432)
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4964 (class 2606 OID 18343)
-- Name: budgets budgets_company_budget_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_company_budget_id_fkey FOREIGN KEY (company_budget_id) REFERENCES public.company_budgets(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4965 (class 2606 OID 18348)
-- Name: budgets budgets_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4966 (class 2606 OID 18353)
-- Name: budgets budgets_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.sections(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4963 (class 2606 OID 18309)
-- Name: company_budgets company_budgets_created_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_budgets
    ADD CONSTRAINT company_budgets_created_by_id_fkey FOREIGN KEY (created_by_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4985 (class 2606 OID 18630)
-- Name: consumable_allocations consumable_allocations_consumable_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consumable_allocations
    ADD CONSTRAINT consumable_allocations_consumable_item_id_fkey FOREIGN KEY (consumable_item_id) REFERENCES public.consumable_items(id) ON UPDATE CASCADE;


--
-- TOC entry 4986 (class 2606 OID 18625)
-- Name: consumable_allocations consumable_allocations_consumable_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consumable_allocations
    ADD CONSTRAINT consumable_allocations_consumable_request_id_fkey FOREIGN KEY (consumable_request_id) REFERENCES public.consumable_requests(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4987 (class 2606 OID 18640)
-- Name: consumable_allocations consumable_allocations_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consumable_allocations
    ADD CONSTRAINT consumable_allocations_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON UPDATE CASCADE;


--
-- TOC entry 4988 (class 2606 OID 18645)
-- Name: consumable_allocations consumable_allocations_issued_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consumable_allocations
    ADD CONSTRAINT consumable_allocations_issued_by_id_fkey FOREIGN KEY (issued_by_id) REFERENCES public.users(id) ON UPDATE CASCADE;


--
-- TOC entry 4989 (class 2606 OID 18650)
-- Name: consumable_allocations consumable_allocations_received_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consumable_allocations
    ADD CONSTRAINT consumable_allocations_received_by_id_fkey FOREIGN KEY (received_by_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4990 (class 2606 OID 18635)
-- Name: consumable_allocations consumable_allocations_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consumable_allocations
    ADD CONSTRAINT consumable_allocations_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.sections(id) ON UPDATE CASCADE;


--
-- TOC entry 4983 (class 2606 OID 18613)
-- Name: consumable_request_items consumable_request_items_consumable_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consumable_request_items
    ADD CONSTRAINT consumable_request_items_consumable_item_id_fkey FOREIGN KEY (consumable_item_id) REFERENCES public.consumable_items(id) ON UPDATE CASCADE;


--
-- TOC entry 4984 (class 2606 OID 18608)
-- Name: consumable_request_items consumable_request_items_consumable_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consumable_request_items
    ADD CONSTRAINT consumable_request_items_consumable_request_id_fkey FOREIGN KEY (consumable_request_id) REFERENCES public.consumable_requests(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4978 (class 2606 OID 18567)
-- Name: consumable_requests consumable_requests_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consumable_requests
    ADD CONSTRAINT consumable_requests_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON UPDATE CASCADE;


--
-- TOC entry 4979 (class 2606 OID 18577)
-- Name: consumable_requests consumable_requests_hod_approver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consumable_requests
    ADD CONSTRAINT consumable_requests_hod_approver_id_fkey FOREIGN KEY (hod_approver_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4980 (class 2606 OID 18572)
-- Name: consumable_requests consumable_requests_requested_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consumable_requests
    ADD CONSTRAINT consumable_requests_requested_by_id_fkey FOREIGN KEY (requested_by_id) REFERENCES public.users(id) ON UPDATE CASCADE;


--
-- TOC entry 4981 (class 2606 OID 18562)
-- Name: consumable_requests consumable_requests_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consumable_requests
    ADD CONSTRAINT consumable_requests_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.sections(id) ON UPDATE CASCADE;


--
-- TOC entry 4982 (class 2606 OID 18582)
-- Name: consumable_requests consumable_requests_stores_approver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consumable_requests
    ADD CONSTRAINT consumable_requests_stores_approver_id_fkey FOREIGN KEY (stores_approver_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4977 (class 2606 OID 18517)
-- Name: consumable_stocks consumable_stocks_consumable_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consumable_stocks
    ADD CONSTRAINT consumable_stocks_consumable_item_id_fkey FOREIGN KEY (consumable_item_id) REFERENCES public.consumable_items(id) ON UPDATE CASCADE;


--
-- TOC entry 4931 (class 2606 OID 17925)
-- Name: cost_centers cost_centers_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cost_centers
    ADD CONSTRAINT cost_centers_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4973 (class 2606 OID 18457)
-- Name: documents documents_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4974 (class 2606 OID 18462)
-- Name: documents documents_uploaded_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_uploaded_by_id_fkey FOREIGN KEY (uploaded_by_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4933 (class 2606 OID 17963)
-- Name: employees employees_costCenterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT "employees_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES public.cost_centers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4934 (class 2606 OID 17968)
-- Name: employees employees_jobTitleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT "employees_jobTitleId_fkey" FOREIGN KEY ("jobTitleId") REFERENCES public.job_titles(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4935 (class 2606 OID 17958)
-- Name: employees employees_sectionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT "employees_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES public.sections(id) ON UPDATE CASCADE;


--
-- TOC entry 4967 (class 2606 OID 18410)
-- Name: failure_reports failure_reports_allocation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.failure_reports
    ADD CONSTRAINT failure_reports_allocation_id_fkey FOREIGN KEY (allocation_id) REFERENCES public.allocations(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4968 (class 2606 OID 18400)
-- Name: failure_reports failure_reports_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.failure_reports
    ADD CONSTRAINT failure_reports_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON UPDATE CASCADE;


--
-- TOC entry 4969 (class 2606 OID 18405)
-- Name: failure_reports failure_reports_ppe_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.failure_reports
    ADD CONSTRAINT failure_reports_ppe_item_id_fkey FOREIGN KEY (ppe_item_id) REFERENCES public.ppe_items(id) ON UPDATE CASCADE;


--
-- TOC entry 4970 (class 2606 OID 18420)
-- Name: failure_reports failure_reports_replacement_stock_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.failure_reports
    ADD CONSTRAINT failure_reports_replacement_stock_id_fkey FOREIGN KEY (replacement_stock_id) REFERENCES public.stocks(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4971 (class 2606 OID 18415)
-- Name: failure_reports failure_reports_stock_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.failure_reports
    ADD CONSTRAINT failure_reports_stock_id_fkey FOREIGN KEY (stock_id) REFERENCES public.stocks(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4975 (class 2606 OID 18475)
-- Name: forecasts forecasts_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forecasts
    ADD CONSTRAINT forecasts_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4976 (class 2606 OID 18480)
-- Name: forecasts forecasts_ppe_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forecasts
    ADD CONSTRAINT forecasts_ppe_item_id_fkey FOREIGN KEY (ppe_item_id) REFERENCES public.ppe_items(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4941 (class 2606 OID 18073)
-- Name: job_title_ppe_matrix job_title_ppe_matrix_jobTitleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_title_ppe_matrix
    ADD CONSTRAINT "job_title_ppe_matrix_jobTitleId_fkey" FOREIGN KEY ("jobTitleId") REFERENCES public.job_titles(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4942 (class 2606 OID 18078)
-- Name: job_title_ppe_matrix job_title_ppe_matrix_ppe_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_title_ppe_matrix
    ADD CONSTRAINT job_title_ppe_matrix_ppe_item_id_fkey FOREIGN KEY (ppe_item_id) REFERENCES public.ppe_items(id) ON UPDATE CASCADE;


--
-- TOC entry 4932 (class 2606 OID 17942)
-- Name: job_titles job_titles_sectionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_titles
    ADD CONSTRAINT "job_titles_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES public.sections(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4956 (class 2606 OID 18230)
-- Name: request_items request_items_ppe_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_items
    ADD CONSTRAINT request_items_ppe_item_id_fkey FOREIGN KEY (ppe_item_id) REFERENCES public.ppe_items(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4957 (class 2606 OID 18225)
-- Name: request_items request_items_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_items
    ADD CONSTRAINT request_items_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.requests(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4946 (class 2606 OID 18187)
-- Name: requests requests_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4947 (class 2606 OID 18202)
-- Name: requests requests_dept_rep_approver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_dept_rep_approver_id_fkey FOREIGN KEY (dept_rep_approver_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4948 (class 2606 OID 18177)
-- Name: requests requests_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4949 (class 2606 OID 18167)
-- Name: requests requests_fulfilled_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_fulfilled_by_user_id_fkey FOREIGN KEY (fulfilled_by_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4950 (class 2606 OID 18207)
-- Name: requests requests_hod_approver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_hod_approver_id_fkey FOREIGN KEY (hod_approver_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4951 (class 2606 OID 18172)
-- Name: requests requests_rejected_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_rejected_by_id_fkey FOREIGN KEY (rejected_by_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4952 (class 2606 OID 18182)
-- Name: requests requests_requested_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_requested_by_id_fkey FOREIGN KEY (requested_by_id) REFERENCES public.users(id) ON UPDATE CASCADE;


--
-- TOC entry 4953 (class 2606 OID 18192)
-- Name: requests requests_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.sections(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4954 (class 2606 OID 18197)
-- Name: requests requests_section_rep_approver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_section_rep_approver_id_fkey FOREIGN KEY (section_rep_approver_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4955 (class 2606 OID 18212)
-- Name: requests requests_stores_approver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_stores_approver_id_fkey FOREIGN KEY (stores_approver_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4943 (class 2606 OID 18102)
-- Name: section_ppe_matrix section_ppe_matrix_ppe_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.section_ppe_matrix
    ADD CONSTRAINT section_ppe_matrix_ppe_item_id_fkey FOREIGN KEY (ppe_item_id) REFERENCES public.ppe_items(id) ON UPDATE CASCADE;


--
-- TOC entry 4944 (class 2606 OID 18097)
-- Name: section_ppe_matrix section_ppe_matrix_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.section_ppe_matrix
    ADD CONSTRAINT section_ppe_matrix_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.sections(id) ON UPDATE CASCADE;


--
-- TOC entry 4930 (class 2606 OID 17910)
-- Name: sections sections_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sections
    ADD CONSTRAINT sections_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4940 (class 2606 OID 18055)
-- Name: sizes sizes_scale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sizes
    ADD CONSTRAINT sizes_scale_id_fkey FOREIGN KEY (scale_id) REFERENCES public.size_scales(id) ON UPDATE CASCADE;


--
-- TOC entry 4945 (class 2606 OID 18119)
-- Name: stocks stocks_ppe_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stocks
    ADD CONSTRAINT stocks_ppe_item_id_fkey FOREIGN KEY (ppe_item_id) REFERENCES public.ppe_items(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4936 (class 2606 OID 17993)
-- Name: users users_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4937 (class 2606 OID 17983)
-- Name: users users_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4938 (class 2606 OID 17988)
-- Name: users users_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON UPDATE CASCADE;


--
-- TOC entry 4939 (class 2606 OID 17998)
-- Name: users users_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.sections(id) ON UPDATE CASCADE ON DELETE SET NULL;


-- Completed on 2025-12-20 18:00:06

--
-- PostgreSQL database dump complete
--

