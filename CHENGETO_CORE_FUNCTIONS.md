# Chengeto — PPE Management System

### Core Functions & Capabilities Overview

*Smart, end-to-end management of Personal Protective Equipment for mining and industrial operations.*

---

## 1. What Chengeto Does

Chengeto is a complete, web-based platform that controls the entire lifecycle of Personal Protective Equipment (PPE) — from defining who is entitled to what, through procurement, stock control, issue to employees, renewals, and failure investigation. It replaces error-prone spreadsheets and paper registers with a single, auditable system that enforces safety policy, controls cost, and gives every level of the organisation the visibility it needs.

Built for mining and heavy-industry environments where PPE compliance is a legal and life-safety requirement, Chengeto ensures **the right equipment reaches the right employee, at the right time, within budget — with a complete record of every transaction.**

**Technology:** Modern web application (Next.js / React front end, Node.js + PostgreSQL back end). Secure, multi-user, cloud-hosted or on-premise.

---

## 2. The Problem It Solves

| Without Chengeto | With Chengeto |
|---|---|
| PPE entitlements live in people's heads or scattered spreadsheets | A central **PPE Matrix** defines entitlements per job title and section |
| No control over who issues what — easy over-issue and theft | Multi-level **approval workflow** before any item leaves stores |
| Renewals missed, leading to non-compliance and audit findings | **Automated renewal tracking** with email reminders |
| No idea of true PPE spend per department | Real-time **budget tracking and stock valuation** |
| Premature PPE failures go uninvestigated | Structured **failure reporting** with SHEQ review |
| No audit trail for safety inspectors | Complete, tamper-evident **audit log** of every action |

---

## 3. Core Functional Modules

### 3.1 PPE Entitlement Matrix (the policy engine)
The heart of the system. Defines **what PPE each job title and each section is entitled to**, including quantities and replacement frequencies.
- Per-job-title PPE requirements (e.g. an Underground Miner gets a hard hat, overalls, safety boots, gloves on defined cycles).
- Per-section requirements layered on top for area-specific hazards.
- Drives automatic generation of requests and renewal schedules — entitlements are enforced by the system, not by memory.

### 3.2 Employee & Organisation Management
- Full employee register linked to **Department → Section → Job Title → Cost Centre**.
- Each employee carries their PPE size profile, gender, and allocation history.
- Bulk import/upload of employees and configuration data.
- Individual **Employee PPE Card** — a complete record of everything ever issued to a person.

### 3.3 PPE Catalogue & Sizing
- Master catalogue of PPE items, consumables, equipment, and laboratory items.
- Each item supports **size variants, colour variants, gender targeting, units of measure, supplier, and accounting codes**.
- Configurable **size scales** (e.g. clothing, footwear) so the correct size set applies to each item.
- Standard and **heavy-use replacement frequencies** per item.

### 3.4 Stock & Inventory Control
- Real-time inventory across **multiple stock accounts and storage locations**.
- Stock batches with quantity, unit price, size, and colour tracking.
- **Low-stock and critical-stock alerts** automatically flagged and emailed to Stores and Admin.
- Stock adjustments with full audit trail.

### 3.5 Request & Approval Workflow
A controlled, multi-level approval chain ensures nothing is issued without authorisation:

```
Section Rep raises request
        ↓
   HOD approval
        ↓
 Department Rep approval
        ↓
   Stores approval
        ↓
 Stores fulfils → PPE issued (allocation created)
        ↓
     COMPLETED
```

- Requests can be **rejected** at any stage with a reason, or **cancelled** by the creator before approval.
- **SHEQ override** path allows safety-critical issues to bypass intermediate steps.
- Every approval is stamped with who, when, and any comments.

### 3.6 Allocations (issuing PPE to people)
- Records every item issued: employee, item, size, quantity, cost, issue date, and **next renewal/expiry date**.
- Allocation types: annual, replacement, emergency, new-employee.
- Status lifecycle: **active → expired → replaced / returned**.
- **Upcoming-renewals and overdue dashboards** so nothing slips through.
- One-click renewal of existing allocations.

### 3.7 Automated Renewal & Alert Notifications
- A scheduled daily job scans for **renewals due** and **low stock**.
- Branded email reminders sent automatically to the relevant Employee, Section Rep, HOD, Stores, and Admin.
- Keeps the organisation continuously compliant without manual chasing.

### 3.8 Budget & Cost Control
- **Company-level budget** cascaded down to department and section budgets.
- Real-time **budget-utilisation reporting** — see committed vs. remaining spend.
- Cost centres link every allocation to the correct accounting code.

### 3.9 Stock Valuation
- Live **valuation of total stock holding in USD**, filterable by category, item type, and stock account.
- Per-item breakdown of quantity × unit price for finance and audit.

### 3.10 Failure Reporting & SHEQ Investigation
- Frontline staff report **premature PPE failures** against the specific item and allocation.
- **SHEQ team reviews, investigates, and resolves** each report.
- **Premature-failure analysis reports** identify problem products and suppliers — driving better purchasing decisions and safety outcomes.

### 3.11 Consumables Management
A parallel, lighter-weight workflow for **consumable supplies** (issued to sections rather than tracked per individual):
- Separate consumable catalogue, stock, request, and allocation tracking.
- HOD → Stores approval flow suited to bulk consumables.

### 3.12 Reporting & Analytics
Role-specific dashboards and exportable reports, including:
- Allocation reports and employee PPE cards
- Stock-level and low-stock reports
- Budget-utilisation reports
- Premature-failure analysis
- Compliance and renewal status
- Excel export of data across the system

### 3.13 Demand Forecasting
- Forecast models per department and PPE item to **anticipate future demand** and inform procurement planning.

### 3.14 Audit Trail & Compliance
- **Every action** in the system is logged: who did what, when, and to which record.
- Provides the evidence trail required by safety regulators and internal auditors.
- Searchable audit log accessible to Admin and SHEQ.

### 3.15 System Administration & Data Protection
- Configurable **system settings** (thresholds, branding, notification rules).
- **Automated database backups** for business continuity.
- User and role management.

---

## 4. Role-Based Access (built for the whole organisation)

Chengeto recognises that PPE management involves many stakeholders, and gives each a tailored experience and the right permissions:

| Role | What they do in Chengeto |
|---|---|
| **Admin** | Full configuration, user management, master data, system settings |
| **Stores** | Manage stock, fulfil approved requests, issue allocations, valuation |
| **Section Rep** | Raise requests, manage section employees, track renewals & compliance |
| **Department Rep** | Second-level approvals, department cost and allocation reports |
| **HOD / HOS** | First-level approvals, department budget, matrix, and reporting |
| **SHEQ** | Failure review, approval override, forecasting, audit access, analytics |

Each role logs into a dedicated dashboard showing only what is relevant to them.

---

## 5. Security & Trust

- **JWT-based authentication** with access and refresh tokens.
- **Role-based access control** enforced on every operation.
- Security hardening: rate limiting, CORS control, security headers, input validation.
- Password encryption and forced password-change workflows.
- Complete **audit logging** for accountability.
- **Automated backups** for data resilience.

---

## 6. Key Selling Points (the pitch in one page)

1. **Compliance you can prove.** Enforced entitlement matrix + complete audit trail = pass every safety inspection.
2. **Control over cost.** Multi-level approvals, live budgets, and stock valuation stop over-issue and uncontrolled spend.
3. **Never miss a renewal.** Automated tracking and email reminders keep every employee protected and compliant.
4. **The right PPE, every time.** Size profiles, gender targeting, and job-title matrices ensure correct issue.
5. **Smarter purchasing.** Failure analysis and demand forecasting reveal which products and suppliers actually perform.
6. **Built for everyone.** Tailored dashboards from the storeroom to the SHEQ office to the boardroom.
7. **Safe and resilient.** Enterprise-grade security, access control, and automated backups.
8. **Ready to deploy.** Modern web application — accessible from any browser, cloud-hosted or on-premise.

---

## 7. At a Glance

- **20+ functional modules** covering the full PPE lifecycle
- **6 distinct user roles** with dedicated dashboards
- **Multi-level approval workflow** with SHEQ override
- **Automated renewal & stock alerts** via email
- **Real-time budgets, valuation, and analytics**
- **Complete audit trail** on every transaction
- Handles **PPE, consumables, equipment, and laboratory items**

---

*Chengeto PPE System — keeping your people protected, your stores controlled, and your compliance provable.*
