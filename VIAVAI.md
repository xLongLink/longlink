# Viavai

A platform to manage company processes, projects and workflows.

- Goal have all the companied joining viavai from day zero.
- viavai.com/<iso_country_code>/<org_name>/<module>
- https://modular-project-hub--sau1707.github.app/org-longlink

## The platform

- Identity + orgs: users, orgs, teams, RBAC, audit log

### Organization

- Each organization shall have a database and a storage space.
- Each organization sits in a singe country

- Mail intergations

## The modules

- One click installable modules.
- One of 3 types of modules:
    - Tools
    - Entities
    - Projects

- A sort of streamlit but more structured.
- Built with python, deployed and managed by viavai

## Pricing

- Pay per module

- Ezstorage

Primary Umbrella Terms

Enterprise Software / Enterprise Systems
The most common high-level term. Refers to large-scale software used to support core business processes across an organization.

Business Software
A broader, less technical term covering any software used for commercial operations (accounting, HR, sales, operations).

Common System Categories (Most Used in Practice)

Enterprise Resource Planning (ERP)
Integrated systems that manage finance, accounting, procurement, supply chain, and operations in a single platform.

Customer Relationship Management (CRM)
Systems focused on managing customer data, sales pipelines, and customer interactions.

Human Resource Management Systems (HRMS / HRIS)
Software for payroll, recruiting, employee records, performance management.

Business Process Management (BPM)
Tools designed to model, automate, and optimize internal workflows and processes.

Operations Management Systems
Software supporting production, logistics, inventory, and operational planning.

- Cron jobs defined inside the application but executed externally -> TODO: How to do that?

1. Core product surfaces you must implement

A credible GitHub clone usually means:

- Git hosting: clone/fetch/push over HTTPS (and optionally SSH)

- Repo UI: browsing, file viewer, blame/history, releases/tags
- Issues & Projects: issues, labels, milestones, boards
- Pull Requests: diffs, reviews, status checks, merge queue
- Webhooks & Apps: outbound events + app tokens/scopes
- CI/CD: Actions-like runners, logs, artifacts, caches
- Search: repo/issue/pr search; ideally code search
- Observability & security: rate limiting, WAF, secrets, encryption, backups

# Internal tools

## Finance & Accounting

- General ledger
- Accounts payable
- Accounts receivable
- Billing & invoicing
- Expense management
- Payroll processing
- Tax calculation & filing
- Budgeting & forecasting
- Financial reporting
- Cash flow management
- Fixed asset management
- Audit & compliance support

## Human Resources (HR)

- Employee records (HRIS)
- Recruitment / applicant tracking (ATS)
- Onboarding & offboarding
- Payroll & compensation management
- Benefits administration
- Time & attendance tracking
- Leave management
- Performance reviews
- Training & learning management (LMS)
- Workforce planning
- Compliance & labor law tracking

## Operations

- Process management
- Workflow automation
- Resource planning
- Inventory management
- Procurement & vendor management
- Supply chain coordination
- Quality control
- Maintenance management
- Scheduling & capacity planning

## Sales

- Customer relationship management (CRM)
- Lead management
- Opportunity & pipeline tracking
- Quoting & proposals
- Contract management
- Sales forecasting
- Commission tracking
- Customer data management

## Marketing

- Campaign management
- Marketing automation
- Email marketing
- Content management (CMS)
- Website management
- Analytics & attribution
- Social media management
- Brand asset management
- SEO / SEM tools

## Customer Support & Success

- Ticketing / help desk system
- Knowledge base
- Live chat & messaging
- Call center tools
- Customer feedback & surveys
- SLA tracking
- Customer health scoring
- Retention & churn analysis

## IT & Infrastructure

- User account & identity management
- Device management
- Network monitoring
- Cloud infrastructure management
- Backup & disaster recovery
- Software deployment
- IT service management (ITSM)
- Incident & change management

## Security & Risk

- Access control & permissions
- Cybersecurity monitoring
- Vulnerability management
- Data loss prevention
- Incident response
- Risk assessment
- Compliance monitoring (ISO, SOC, GDPR, etc.)

## Legal & Compliance

- Contract lifecycle management
- Legal document repository
- Policy management
- Regulatory compliance tracking
- Corporate governance tools
- Intellectual property tracking

## Data & Analytics

- Data warehousing
- Business intelligence (BI)
- Reporting & dashboards
- Data governance
- Master data management
- Predictive analytics

## Project & Product Management

- Project planning & tracking
- Task management
- Resource allocation
- Roadmapping
- Product lifecycle management
- Issue & bug tracking

## Communication & Collaboration

- Email system
- Internal messaging
- Video conferencing
- File storage & sharing
- Document collaboration
- Intranet / internal portal
- Knowledge management

## Administration & Office Management

- Document management
- E-signatures
- Office asset tracking
- Facilities management
- Travel & expense booking
- Meeting room scheduling

# see state, change state, and understand impact with minimal friction.

1. Tables (the most important element)

Tables are the backbone of any process/workflow system.

Why

Processes = collections of records

Workflows = records moving through states

Projects = structured lists with metadata

Required table capabilities

Column sorting

Filtering (by status, owner, date)

Inline editing

Bulk actions

Row-level actions (open, approve, reject)

Pagination or virtualization

Status indicators (badges)

Examples

Tasks

Tickets

Approvals

Transactions

Requests

Steps in a workflow

If tables are weak, the platform fails.

2. Forms (state mutation)

Every workflow needs controlled state changes.

Required form patterns

Create / edit entity

Step-specific forms (different fields per state)

Validation (sync + async)

Draft vs submit

Modal-based editing (preferred)

Important

Forms must be fast and forgiving

Errors must be precise

Partial save is often necessary

3. Workflow state visualization

Users must instantly answer:

“Where is this thing right now?”

Effective patterns

Status badges (Pending, Approved, Blocked)

Stepper / progress bar

Kanban board (optional, not mandatory)

Timeline / activity log

Avoid overengineering BPMN diagrams unless your users explicitly need them.

4. Detail views (single-record focus)

For any table row, you need a detail page or panel.

Must include

Core fields

Current state

History / audit trail

Comments / discussion

Attachments

Actions available now

This is where decisions happen.

5. Activity & audit log (critical)

For company processes, auditability is non-negotiable.

Should track

Who changed what

When

Previous value → new value

Automated vs manual action

This is often more important than dashboards.

6. Search (global and scoped)

Users don’t navigate; they search.

Required

Global search (ID, name, keyword)

Scoped search (within project/process)

Saved filters

This drastically reduces UI complexity.

7. Permissions & roles (foundational)

Every workflow tool fails without correct access control.

Must support

Role-based access (viewer, editor, approver)

State-based permissions

Field-level visibility (optional but valuable)

Permissions often drive UI rendering.

9. Charts & dashboards (secondary, not primary)

Charts are useful but not core.

Where they help

Workload overview

Bottleneck detection

SLA tracking

Trend analysis

Where they don’t

Day-to-day task execution

Decision making on single items

Use:

Bar charts

Line charts

Simple counters

Avoid:

Complex visualizations

Real-time animations

Vanity metrics

Build a server-driven process, project, and workflow management platform where the backend is the single source of truth and the frontend is a generic renderer.

The system must support record-based workflows with clear state, controlled mutations, and full auditability.

Core functional requirements

Tables as the primary UI for listing records
(sorting, filtering, pagination, bulk actions, status indicators)

Detail views for single records
(current state, fields, actions, comments, attachments)

Forms for creating and editing records
(modal-based, validated, state-aware)

Workflow state management
(statuses, allowed transitions, role-based actions)

Audit log tracking all changes
(who, what, when, old → new value)

Search (global and scoped)

Role & permission system
(entity-, state-, and action-level access control)

Notifications for relevant state changes

Technical requirements

Backend exposes page endpoints returning JSON UI schemas

Frontend is static and renders components dynamically from JSON

All mutations trigger HTTP requests and page refetch + re-render

No full page reloads for in-context actions

Performance target: <200 ms perceived latency per interaction

Deterministic, cacheable, and idempotent endpoints

Non-goals (v1)

Real-time collaboration

Complex visualizations

Heavy client-side state logic

Custom theming or animations

Design principle

Optimize for clarity, consistency, and auditability over visual richness or SPA complexity.
