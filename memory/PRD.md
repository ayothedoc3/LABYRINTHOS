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
  - Lead stages: NEW → CONTACTED → QUALIFIED → PROPOSAL_SENT → NEGOTIATION → WON/LOST/NURTURING
  - Lead management with contacts, priorities, tags, estimated values
  - Proposal management with line items
  - Activity logging (calls, emails, meetings, notes)
  - Stage transition validation
- **Frontend:** `SalesCRM.js`
  - Stage pipeline filters with lead counts
  - Summary stats cards (Pipeline Value, Conversion Rate, Avg Deal Size, Proposals Sent)
  - Lead cards with stage-colored borders, contact info, tags, probability
  - Lead detail panel with pipeline visualization, activity log
  - Create lead dialog

**Affiliate CRM:**
- **Backend:** `affiliate_crm_models.py`, `affiliate_crm_routes.py`
  - Tier system: BRONZE (10%), SILVER (15%), GOLD (20%), PLATINUM (25%)
  - Affiliate management with referral codes/links
  - Referral tracking with qualification and conversion
  - Commission management with approval/payment workflow
  - Auto tier upgrades based on conversions
- **Frontend:** `AffiliateCRM.js`
  - Tier filter cards with commission rates
  - Summary stats (Active Affiliates, Referrals, Conversions, Commissions)
  - Affiliate cards with metrics and earnings
  - Detail panel with referral link, referrals tab, commissions tab
  - Create affiliate dialog

**Communication Threads:**
- **Backend:** `communication_models.py`, `communication_routes.py`
  - Thread types: CONTRACT, LEAD, SUPPORT, INTERNAL, CLIENT
  - Thread statuses: OPEN, PENDING, RESOLVED, ARCHIVED
  - Message types: TEXT, FILE, NOTE, SYSTEM, UPDATE
  - Participant management with roles
  - Pin/unpin functionality
- **Frontend:** `Communications.js`
  - Thread type filters with color coding
  - Summary stats (Total Threads, Open, Messages, Participants)
  - Thread list with type icons, status badges, previews
  - Thread detail with participants, message history, send functionality
  - Create thread dialog

---

## Prioritized Backlog

### P1 (High Priority) - Phase 4: Playbook Engine
- [ ] **Playbook Engine Logic**
  - Backend: `playbook_engine_routes.py`, `playbook_models.py`
  - Translate strategy inputs into execution plans
  - Generate contracts, roles, milestones automatically

### P2 (Medium Priority) - Future Enhancements
- [ ] **Optimization Plan Feature**
  - Make final Labyrinth Builder step functional
  - Files: `LabyrinthBuilder.js`, `labyrinth_builder_routes.py`

### P3 (Low Priority) - Data Layer Improvements
- [ ] Move hardcoded demo data to MongoDB collections
- [ ] Consolidate seeding scripts into single script
- [ ] Improve Pydantic validation

---

## Known Issues & Limitations

### Currently Mocked/Hardcoded (IN-MEMORY)
- Role dashboard data (hardcoded in `role_routes.py`)
- Contract lifecycle demo data
- Sales CRM leads and proposals
- Affiliate referrals and commissions
- Communication threads and messages

### Technical Debt
- Some components still use raw Tailwind instead of design system classes
- Send message endpoint uses query params instead of JSON body

---

## File Reference

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
