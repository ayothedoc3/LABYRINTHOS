# Labyrinth OS - Product Requirements Document

## Original Problem Statement
The user provided extensive documentation for a "Labyrinth" system, outlining a comprehensive vision for the application. The high-level requirements are to evolve the existing "Labyrinth Builder" into a full-fledged operational CRM with the following core capabilities:

1. **Role System & Role-Based Dashboards:** Users can switch between different roles (Executive, Coordinator, Specialist), each with a unique dashboard displaying relevant information and KPIs.
2. **Contract Lifecycle Management:** Visual, stage-gated system to manage contracts through defined lifecycle (Proposal, Bid, Active, Paused, Completed).
3. **CRM Modules:** Sales (leads, qualification, proposals), Affiliates (referral tracking, commissions), Communication (structured, per-contract threads).
4. **Playbook Engine:** Backend logic to translate strategic inputs into structured execution plans.
5. **Design System Enhancement:** Premium, calm, structured UI following defined design principles.
6. **Optimization Plan Feature:** Make the final step of Labyrinth Builder functional.

## Tech Stack
- **Frontend:** React, Tailwind CSS, Shadcn/UI components
- **Backend:** FastAPI (Python), Pydantic models
- **Database:** MongoDB
- **AI Integration:** OpenAI GPT-4o-mini via Emergent LLM Key

## Core User Personas
- **Executive:** Strategic oversight, KPI monitoring
- **Coordinator:** Task management, contract workflow
- **Specialist:** Execution, deliverable completion
- **Affiliate:** Referral tracking, commission management

---

## Implementation Status

### Phase 1: Role System & Contract Lifecycle ✅ COMPLETE (Jan 2026)
**Backend:**
- Created `role_models.py`, `role_routes.py` for role management
- Created `contract_lifecycle_models.py`, `contract_lifecycle_routes.py` for contract stages
- Implemented demo data seeding for roles and contracts
- Registered new routers in `server.py`

**Frontend:**
- `RoleContext.js` - React context for role state management
- `RoleDashboard.js` - Role-specific dashboard with metric tiles
- `RoleSelector.js` - Dropdown for switching roles
- `ContractLifecycle.js` - Contract pipeline view with stage management
- Integrated into `App.js` with new Contracts tab

### Phase 2: Design System Enhancement ✅ COMPLETE (Jan 2026)
**Design System File:**
- `frontend/src/design-system.css` - Central CSS with:
  - Color tokens (status colors, function colors, semantic colors)
  - Typography system (text-display, text-heading, text-body, etc.)
  - Component styles (labyrinth-card, labyrinth-tile, status-badge)
  - Stage pipeline styles
  - Metric cards
  - Navigation styles (labyrinth-nav)
  - Animation utilities (animate-fade-in, animate-slide-in)

**Applied To:**
- `RoleDashboard.js` - Role header, stats tiles with colored borders
- `ContractLifecycle.js` - Stage pipeline filters, contract cards, detail view
- `App.js` - Premium header, pill-style navigation

### Phase 3: CRM Modules ✅ COMPLETE (Jan 2026)

**Sales CRM:**
- **Backend:** `sales_crm_models.py`, `sales_crm_routes.py`
- **Frontend:** `SalesCRM.js`
- Features: Lead pipeline (8 stages), activity logging, create/update leads

**Affiliate CRM:**
- **Backend:** `affiliate_crm_models.py`, `affiliate_crm_routes.py`
- **Frontend:** `AffiliateCRM.js`
- Features: 4-tier system, referral tracking, commission management

**Communication Threads:**
- **Backend:** `communication_models.py`, `communication_routes.py`
- **Frontend:** `Communications.js`
- Features: 5 thread types, messaging, participant management

### External API for CRM Integration ✅ COMPLETE (Jan 2026)

**Purpose:** API layer for external CRM systems to integrate with Labyrinth

**Backend:** `external_api_models.py`, `external_api_routes.py`

**Authentication:**
- API Key in header: `X-API-Key: elk_f531ebe4a7d24c8fbcde123456789abc`

**Endpoints:**
- `POST /api/external/deals` - Create deal
- `GET /api/external/deals/{id}` - Get deal
- `PATCH /api/external/deals/{id}` - Update deal (stage, status)
- `GET /api/external/deals/{id}/validate-stage?next_stage={stage}` - Validate stage change
- `POST /api/external/leads` - Create lead (auto-creates communication thread)
- `GET/PATCH /api/external/leads/{id}` - Get/update lead
- `POST /api/external/tasks` - Create task
- `PATCH /api/external/tasks/{id}` - Update task
- `GET /api/external/deals/{id}/tasks` - Get deal tasks
- `POST /api/external/partners` - Create partner/affiliate
- `GET /api/external/partners` - List partners
- `GET /api/external/kpis` - Get KPI metrics
- `GET /api/external/pipeline` - Get pipeline stats
- `POST /api/external/webhooks/register` - Register webhook
- `GET /api/external/contracts` - List auto-created contracts

**Auto-Workflows:**
- Deal Won → Auto-create Contract (with webhook)
- New Lead → Auto-create Communication Thread
- Task Overdue → SLA Breach (webhook)
- Lead Qualified → Notification (webhook)

**Stage-Gate Validation:**
- Validates task completion before allowing stage transitions
- Returns missing requirements if blocked

**Documentation:** `/app/memory/EXTERNAL_API_DOCS.md`

---

### Phase 4: Playbook Engine ✅ COMPLETE (Jan 2026)

**Purpose:** Translate strategic inputs into complete execution plans with milestones, tasks, roles, and contracts.

**Backend:** `playbook_engine_models.py`, `playbook_engine_routes.py`

**Frontend:** `PlaybookEngine.js` - Full execution plan management UI

**Features:**
- **Plan Generation:** Generate complete execution plans from strategy inputs (category, issue type, timeline, tier, client, budget)
- **Template System:** 5 issue categories (CLIENT_SERVICES, OPERATIONS, CONSULTATION, CRISIS_MANAGEMENT, APP_DEVELOPMENT)
- **Tier Multipliers:** TIER_1 (premium), TIER_2 (standard), TIER_3 (basic) affecting timeline, resources, and budget
- **Timeline Options:** YESTERDAY (urgent), THREE_DAYS, ONE_WEEK, TWO_THREE_WEEKS, FOUR_SIX_WEEKS, SIX_PLUS_WEEKS
- **Auto-Generated Content:**
  - Roles (Executive Sponsor, Project Lead, Coordinator, Specialist, Support, Client Contact)
  - Milestones with deliverables and success criteria
  - Tasks categorized by phase (Initiation, Planning, Execution, Review, Closure)
  - Contracts linked to execution plan
  - Communication channels/threads
- **Labyrinth Builder Integration:** Step 9 "Optimization Plan" connects to Playbook Engine to generate execution plans from builder selections

**API Endpoints:**
- `POST /api/playbook-engine/generate` - Generate new execution plan
- `GET /api/playbook-engine/plans` - List all plans (with status filter)
- `GET /api/playbook-engine/plans/{id}` - Get plan details
- `PATCH /api/playbook-engine/plans/{id}/status` - Update plan status
- `POST /api/playbook-engine/plans/{id}/activate` - Activate plan (creates contracts & threads)
- `PATCH /api/playbook-engine/plans/{id}/milestones/{id}` - Update milestone status
- `PATCH /api/playbook-engine/plans/{id}/tasks/{id}` - Update task status
- `DELETE /api/playbook-engine/plans/{id}` - Delete plan
- `GET /api/playbook-engine/analytics/summary` - Get analytics summary
- `POST /api/playbook-engine/seed-demo` - Seed demo data

**Frontend UI:**
- Analytics header with stats (Total Plans, Active, Milestones, Tasks, Budget)
- Plan cards with status badges, progress bars, and timeline
- Status filter badges (All, Draft, Active, Paused, Completed)
- Plan detail panel with tabs (Overview, Milestones, Tasks, Team)
- Generate Plan dialog with all strategy inputs
- Plan activation workflow

---

## Prioritized Backlog

### P1 (High Priority) - ✅ COMPLETED
- [x] **Connect Labyrinth Builder to Playbook Engine** - DONE
  - Step 9 "Optimization Plan" now generates execution plans
  - Builder selections (Issue, Campaign, Sprint, Playbook) map to Playbook Engine strategy inputs
  - Generated plans display in dialog with milestones, tasks, roles, and budget

### P2 (Medium Priority) - Data Layer Improvements
- [ ] Move hardcoded demo data to MongoDB collections
- [ ] Consolidate seeding scripts into single script (role_routes, sales_crm_routes, affiliate_crm_routes, communication_routes, external_api_routes, playbook_engine_routes)
- [ ] Improve Pydantic validation

### P3 (Low Priority) - Future Enhancements
- [ ] Task assignment to actual talents (not just role IDs)
- [ ] Gantt chart visualization for execution plans
- [ ] Real-time progress tracking with notifications
- [ ] Export plans to PDF/Excel

---

## Known Issues & Limitations

### Currently Mocked/Hardcoded (IN-MEMORY)
- Role dashboard data (hardcoded in `role_routes.py`)
- Contract lifecycle demo data
- Sales CRM leads and proposals
- Affiliate referrals and commissions
- Communication threads and messages
- **Playbook Engine execution plans (in-memory dictionary)**

### Technical Debt
- Some components still use raw Tailwind instead of design system classes
- Send message endpoint uses query params instead of JSON body

---

## File Reference

### Backend - Playbook Engine
- `/app/backend/playbook_engine_models.py` - Strategy, ExecutionPlan, Milestone, Task, Role models
- `/app/backend/playbook_engine_routes.py` - Playbook Engine API endpoints

### Frontend - Playbook Engine
- `/app/frontend/src/PlaybookEngine.js` - Playbook Engine component (plan management, generation, detail view)

### Backend - CRM Modules
- `/app/backend/sales_crm_models.py` - Lead, Proposal, Stage models
- `/app/backend/sales_crm_routes.py` - Sales CRM API endpoints
- `/app/backend/affiliate_crm_models.py` - Affiliate, Referral, Commission models
- `/app/backend/affiliate_crm_routes.py` - Affiliate CRM API endpoints
- `/app/backend/communication_models.py` - Thread, Message, Participant models
- `/app/backend/communication_routes.py` - Communication API endpoints

### Frontend - CRM Modules
- `/app/frontend/src/SalesCRM.js` - Sales CRM component
- `/app/frontend/src/AffiliateCRM.js` - Affiliate CRM component
- `/app/frontend/src/Communications.js` - Communications component

### Tests
- `/app/tests/test_phase2_design_system.py` - Phase 2 tests (14 passing)
- `/app/tests/test_phase3_crm_modules.py` - Phase 3 tests (23 passing)

---

## Testing Summary

### Phase 4 Test Results (Jan 2026)
- **Backend:** 100% (All Playbook Engine endpoints working)
- **Frontend:** 100% (Execution tab visible and functional)
- **API Endpoints Verified:**
  - POST /api/playbook-engine/generate
  - GET /api/playbook-engine/plans
  - GET /api/playbook-engine/analytics/summary
  - POST /api/playbook-engine/seed-demo

### Phase 2 Test Results (Jan 2026)
- **Backend:** 100% (14/14 tests passed)
- **Frontend:** 100% (all visual elements verified)

### Phase 3 Test Results (Jan 2026)
- **Backend:** 100% (23/23 tests passed)
- **Frontend:** 100% (all features verified)
- **Test File:** `/app/test_reports/iteration_2.json`

### API Endpoints Verified
**Sales CRM:** GET /api/sales/stats, GET/POST /api/sales/leads, GET /api/sales/stages, GET /api/sales/proposals
**Affiliate CRM:** GET /api/affiliates/stats, GET/POST /api/affiliates/, GET /api/affiliates/{id}/referrals, GET /api/affiliates/{id}/commissions
**Communications:** GET /api/communications/stats, GET/POST /api/communications/threads, GET/POST /api/communications/threads/{id}/messages
