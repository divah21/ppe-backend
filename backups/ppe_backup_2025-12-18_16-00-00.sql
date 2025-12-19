--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

-- Started on 2025-12-18 18:00:00

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
\.


--
-- TOC entry 5153 (class 0 OID 18331)
-- Dependencies: 238
-- Data for Name: budgets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.budgets (id, company_budget_id, department_id, section_id, fiscal_year, allocated_amount, total_spent, total_budget, allocated_budget, remaining_budget, status, period, quarter, month, start_date, end_date, notes, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5152 (class 0 OID 18297)
-- Dependencies: 237
-- Data for Name: company_budgets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.company_budgets (id, fiscal_year, total_budget, allocated_to_departments, total_spent, status, start_date, end_date, notes, created_by_id, created_at, updated_at) FROM stdin;
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
\.


--
-- TOC entry 5143 (class 0 OID 18013)
-- Dependencies: 228
-- Data for Name: ppe_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ppe_items (id, item_code, item_ref_code, name, product_name, item_type, category, description, unit, replacement_frequency, heavy_use_frequency, is_mandatory, account_code, account_description, supplier, has_size_variants, has_color_variants, size_scale, available_sizes, available_colors, is_active, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5150 (class 0 OID 18217)
-- Dependencies: 235
-- Data for Name: request_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.request_items (id, quantity, size, reason, approved_quantity, created_at, updated_at, request_id, ppe_item_id) FROM stdin;
\.


--
-- TOC entry 5149 (class 0 OID 18157)
-- Dependencies: 234
-- Data for Name: requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.requests (id, status, section_rep_approval_date, section_rep_comment, request_type, is_emergency_visitor, comment, rejection_reason, dept_rep_approval_date, dept_rep_comment, hod_approval_date, hod_comment, stores_approval_date, stores_comment, sheq_approval_date, sheq_comment, sheq_approver_id, fulfilled_date, fulfilled_by_user_id, rejected_by_id, rejected_at, employee_id, requested_by_id, department_id, section_id, created_at, updated_at, section_rep_approver_id, dept_rep_approver_id, hod_approver_id, stores_approver_id) FROM stdin;
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
\.


--
-- TOC entry 5138 (class 0 OID 17902)
-- Dependencies: 223
-- Data for Name: sections; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sections (id, name, code, description, is_active, created_at, updated_at, department_id) FROM stdin;
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
\.


--
-- TOC entry 5145 (class 0 OID 18047)
-- Dependencies: 230
-- Data for Name: sizes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sizes (id, scale_id, value, label, sort_order, eu_size, us_size, uk_size, meta, created_at, updated_at) FROM stdin;
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
75fdd729-2394-41dc-ac58-048ff1adce90	sysadmin	$2a$10$fgqV11EkF7I.s3G3YdM9IeqhHeAXjWIu.vfdqXmfOir9BU65qLGTq	\N	7927c487-fd02-4561-8e2b-a369211dbd69	\N	\N	t	\N	2025-12-18 16:33:24.064+02	2025-12-18 16:33:24.064+02
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


-- Completed on 2025-12-18 18:00:01

--
-- PostgreSQL database dump complete
--

