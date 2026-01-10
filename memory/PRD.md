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

**API Endpoints:**
- `GET /api/roles` - Fetch all roles
- `GET /api/roles/{role_name}/dashboard` - Role-specific dashboard data
- `GET /api/lifecycle/contracts` - Fetch all contracts
- `PUT /api/lifecycle/contracts/{id}/stage` - Transition contract stage
- `GET /api/lifecycle/stats` - Contract statistics

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

**Bug Fixes:**
- Fixed Invalid Date display in Templates contracts
- Fixed StageTransition model to allow null from_stage for new contracts

---

## Prioritized Backlog

### P0 (Critical) - Currently Planned
None - Phase 2 complete

### P1 (High Priority) - Phase 3: CRM Modules
- [ ] **Sales CRM Module**
  - Backend: `sales_crm_routes.py`, `sales_crm_models.py`
  - Frontend: `SalesCRM.js`
  - Features: Lead management, qualification stages, proposals

- [ ] **Affiliate CRM Module**
  - Backend: `affiliate_crm_routes.py`, `affiliate_crm_models.py`
  - Frontend: `AffiliateCRM.js`
  - Features: Referral tracking, commission calculations

- [ ] **Communication Threads**
  - Backend: `communication_routes.py`
  - Frontend: `CommunicationThread.js`
  - Features: Per-contract messaging, structured threads

### P2 (Medium Priority) - Phase 4: Playbook Engine
- [ ] **Playbook Engine Logic**
  - Backend: `playbook_engine_routes.py`, `playbook_models.py`
  - Translate strategy inputs into execution plans
  - Generate contracts, roles, milestones automatically

### P3 (Low Priority) - Future Enhancements
- [ ] **Optimization Plan Feature**
  - Make final Labyrinth Builder step functional
  - Files: `LabyrinthBuilder.js`, `labyrinth_builder_routes.py`

- [ ] **Data Layer Improvements**
  - Move hardcoded demo data to MongoDB collections
  - Consolidate seeding scripts into single script
  - Improve Pydantic validation

---

## Known Issues & Limitations

### Currently Mocked/Hardcoded
- Role dashboard data (hardcoded in `role_routes.py`)
- Contract lifecycle demo data (seeded via endpoint)
- Some dashboard statistics

### Technical Debt
- Data layer relies on loosened Pydantic validation
- Some components still use raw Tailwind instead of design system classes

---

## File Reference

### Backend
- `/app/backend/server.py` - Main FastAPI app
- `/app/backend/role_models.py` - Role Pydantic models
- `/app/backend/role_routes.py` - Role API endpoints
- `/app/backend/contract_lifecycle_models.py` - Contract lifecycle models
- `/app/backend/contract_lifecycle_routes.py` - Contract API endpoints

### Frontend
- `/app/frontend/src/App.js` - Main application layout
- `/app/frontend/src/design-system.css` - Design system CSS
- `/app/frontend/src/RoleContext.js` - Role state context
- `/app/frontend/src/RoleDashboard.js` - Role dashboard component
- `/app/frontend/src/RoleSelector.js` - Role dropdown
- `/app/frontend/src/ContractLifecycle.js` - Contract management

### Tests
- `/app/tests/test_phase2_design_system.py` - Phase 2 tests (14 passing)

---

## Testing Summary

### Phase 2 Test Results (Jan 2026)
- **Backend:** 100% (14/14 tests passed)
- **Frontend:** 100% (all visual elements verified)
- **Test File:** `/app/test_reports/iteration_1.json`

### Features Verified
- Dashboard Tab with role-based tiles ✅
- Contracts Tab with stage pipeline ✅
- Contract detail panel with lifecycle visualization ✅
- Templates Tab with playbooks and tier badges ✅
- Navigation with pill-style buttons ✅
- Role Selector dropdown ✅
- Contract creation flow ✅
