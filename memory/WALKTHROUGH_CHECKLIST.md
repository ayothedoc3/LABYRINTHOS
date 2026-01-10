# Labyrinth OS - Walkthrough Video Checklist

## Definition of Done - Complete Feature List

---

## 🎯 1. ROLE-BASED SYSTEM (Dashboard Tab)

### Features to Demo:
- [ ] **Role Switcher** (top-right dropdown)
  - Switch between: Executive, Coordinator, Specialist
  - Each role shows different dashboard KPIs
  
- [ ] **Role-Specific Dashboards**
  - Executive: Strategic metrics, contract overview, revenue
  - Coordinator: Active tasks, SOPs, milestones, assignments
  - Specialist: My tasks, time tracking, deliverables

### Test Points:
- Click role dropdown → Select different role → Dashboard updates

---

## 📋 2. CONTRACT LIFECYCLE (Contracts Tab)

### Features to Demo:
- [ ] **Stage-Gated Contract View**
  - Stages: PROPOSAL → BID → ACTIVE → PAUSED → COMPLETED
  - Visual pipeline with drag indicators
  
- [ ] **Contract Cards**
  - Client name, value, function, stage badge
  - Click to view contract details
  
- [ ] **Stage Transitions**
  - Move contracts between stages
  - Validation rules (can't skip stages)

### Test Points:
- View contract pipeline → Click contract card → See details

---

## 🔧 3. LABYRINTH BUILDER (Workflows Tab)

### Features to Demo:
- [ ] **9-Step Configuration**
  1. Issue (category selection)
  2. Campaign (issue type)
  3. Sprint (timeline)
  4. Playbook (tier selection)
  5. Talents (auto-matched)
  6. Contract (generated)
  7. SOP (selected automatically)
  8. Channel (communication)
  9. **Optimization Plan** ⭐ (Playbook Engine integration)

- [ ] **Generate Execution Plan Button**
  - Fill in selections → Click "Generate Execution Plan"
  - Shows generated plan with milestones, tasks, roles, budget
  - "View in Execution Tab" navigation

### Test Points:
- Select Issue → Campaign → Sprint → Playbook → Scroll to step 9 → Generate Plan

---

## 💰 4. SALES CRM (Sales CRM Tab)

### Features to Demo:
- [ ] **Lead Pipeline**
  - Stages: NEW → CONTACTED → QUALIFIED → PROPOSAL SENT → NEGOTIATION → WON/LOST
  - Lead cards with name, company, value, source
  
- [ ] **Stats Dashboard**
  - Total Leads, Pipeline Value, Conversion Rate, Avg Deal Size
  - Proposals Sent count

- [ ] **Lead Actions**
  - View lead details
  - Transition lead stages
  - Add activities

### Test Points:
- View lead pipeline → Click lead → See details and activities

---

## 🤝 5. AFFILIATE CRM (Affiliates Tab)

### Features to Demo:
- [ ] **Affiliate List**
  - Tiers: Bronze, Silver, Gold, Platinum
  - Status badges (Active/Inactive)
  
- [ ] **Stats Dashboard**
  - Total Affiliates, Active count, Tier distribution
  - Total Referrals, Conversions, Commission stats

- [ ] **Referral Tracking**
  - View affiliate's referrals
  - Commission history

### Test Points:
- View affiliate list → See tier badges → Check stats

---

## 💬 6. COMMUNICATIONS (Messages Tab)

### Features to Demo:
- [ ] **Thread List**
  - Types: Contract, Lead, Support, Internal
  - Status indicators (Open/Closed)
  - Pinned threads
  
- [ ] **Thread Details**
  - Message history with timestamps
  - Participant list
  - Reply functionality

- [ ] **Stats**
  - Total Threads, Open Threads, Messages Today
  - Active Participants

### Test Points:
- View threads → Click thread → See messages → Check stats

---

## ⚡ 7. PLAYBOOK ENGINE (Execution Tab) ⭐ KEY FEATURE

### Features to Demo:
- [ ] **Analytics Header**
  - Total Plans, Active Plans, Total Milestones, Total Tasks, Total Budget

- [ ] **Plan Cards**
  - Name, status badge, progress bar
  - Timeline (start → end), milestone/task counts
  - Client name, category

- [ ] **New Plan Button**
  - Opens generation dialog
  - Select category, issue type, timeline, tier
  - Enter client name, budget
  - Generate complete execution plan

- [ ] **Plan Detail View** (click a plan)
  - Overview tab: Stats, timeline, execution phases
  - **Gantt tab**: Visual timeline with milestones/tasks ⭐
  - Milestones tab: List with status, due dates
  - Tasks tab: List with priority, hours, status, **assignment** ⭐
  - Team tab: Roles with responsibilities

- [ ] **Task Assignment** ⭐ NEW
  - Each task shows "Assign" button
  - Click to open assignment dialog
  - Select team member from dropdown (all roles displayed)
  - Shows current assignee if already assigned
  - "Reassign" option for assigned tasks
  - Assigned tasks display assignee name

- [ ] **Task Status Updates** ⭐ NEW
  - Status dropdown with options: Pending, In Progress, Completed, Blocked
  - Color-coded icons for each status (clock, play, checkmark, warning)
  - Checkbox to quickly mark task as complete
  - Status changes persist to database immediately

- [ ] **Bulk Task Operations** ⭐ NEW
  - "Select All" checkbox at top to select all tasks
  - Individual checkboxes to select specific tasks
  - Bulk toolbar appears when tasks are selected
  - Shows count of selected tasks
  - "Mark Complete" button - bulk status update
  - "In Progress" button - bulk status update
  - "Assign All" button - opens dialog to assign all to one person
  - "Clear" button to deselect all
  - Dialog shows list of tasks being assigned

- [ ] **Export Dropdown** ⭐
  - Export as PDF (formatted report)
  - Export as JSON (full data)
  - Export Tasks as CSV

- [ ] **Plan Actions**
  - Activate plan (Draft → Active)
  - Pause/Resume plan

### Test Points:
- View plans → Click plan → Switch tabs (Overview, Gantt, Milestones, Tasks, Team)
- Click Export → Download PDF → Open and show formatted report
- Click "New Plan" → Fill form → Generate → See result
- **Click "Assign" on task → Select user → Confirm assignment** ⭐
- **Click status dropdown → Change to "In Progress" → See icon change** ⭐
- **Click checkbox to mark task completed → See strikethrough text** ⭐

---

## 🔗 8. EXTERNAL CRM API (For Your Sales CRM Integration)

### API Endpoints Available:
```
Base URL: {your-app-url}/api/external
Auth Header: X-API-Key: elk_f531ebe4a7d24c8fbcde123456789abc
```

### Endpoints:
- [ ] `POST /deals` - Create deal from your CRM
- [ ] `GET /deals` - List all deals
- [ ] `GET /deals/{id}` - Get deal details
- [ ] `PUT /deals/{id}` - Update deal
- [ ] `GET /deals/{id}/validate-stage` - Validate stage transition
- [ ] `POST /leads` - Create lead
- [ ] `GET /leads` - List leads
- [ ] `POST /tasks` - Create task
- [ ] `GET /tasks` - List tasks
- [ ] `GET /pipeline/stats` - Get pipeline statistics
- [ ] `GET /kpis` - Get KPI data

### Integration Features:
- [ ] **Stage-Gate Validation**: Deals must follow valid stage sequence
- [ ] **Auto Contract Creation**: When deal marked as WON, auto-creates contract in Labyrinth
- [ ] **Webhook Support**: Configure webhooks for deal/lead events

### Test Points (via curl or Postman):
```bash
# Get pipeline stats
curl -H "X-API-Key: elk_f531ebe4..." {URL}/api/external/pipeline/stats

# Create a deal
curl -X POST -H "X-API-Key: elk_f531ebe4..." -H "Content-Type: application/json" \
  -d '{"name":"New Deal","value":50000,"stage":"LEAD","external_id":"CRM123"}' \
  {URL}/api/external/deals
```

---

## 🗄️ 9. DATA PERSISTENCE (MongoDB)

### All Data Persisted:
- [ ] **Sales CRM**: `sales_leads`, `sales_proposals`
- [ ] **Affiliate CRM**: `affiliates`, `referrals`, `commissions`
- [ ] **Communications**: `communication_threads`, `communication_messages`
- [ ] **External API**: `external_deals`, `external_leads`, `external_tasks`, `external_partners`
- [ ] **Playbook Engine**: `execution_plans`

### Test Point:
- Refresh browser → All data still present
- Restart server → Data persists

---

## 📊 10. ADDITIONAL FEATURES

### Progress Tracking API:
- [ ] `GET /api/playbook-engine/plans/{id}/progress`
  - Overall progress percentage
  - Milestone completion stats
  - Task completion stats
  - Hours tracking
  - Days remaining
  - Phase-by-phase breakdown

### Task Assignment:
- [ ] `PATCH /api/playbook-engine/plans/{id}/tasks/{id}/assign`
  - Assign tasks to specific people
  - Track assignment timestamp

### Unified Seed Endpoint:
- [ ] `POST /api/seed-all` - Seeds all demo data across all modules

---

## 🎬 RECOMMENDED WALKTHROUGH ORDER

1. **Dashboard** - Show role switching, explain 7-gate system
2. **Contracts** - Show contract lifecycle stages
3. **Workflows** - Demo Labyrinth Builder (9 steps)
4. **Execution** - Show Playbook Engine (plans, Gantt, export)
5. **Sales CRM** - Lead pipeline and stats
6. **Affiliates** - Affiliate management
7. **Messages** - Communication threads
8. **External API** - Explain CRM integration capability

---

## 📝 NOTES FOR VIDEO

- All data persists to MongoDB (survives restarts)
- External API ready for your Sales CRM integration
- Export available in PDF, JSON, CSV formats
- Gantt chart provides visual timeline
- Progress tracking API for dashboards/reporting

---

## ✅ QUICK VERIFICATION COMMANDS

```bash
# Seed all demo data
curl -X POST {URL}/api/seed-all

# Check Sales CRM
curl {URL}/api/sales/stats

# Check Affiliates
curl {URL}/api/affiliates/stats

# Check Communications
curl {URL}/api/communications/stats

# Check Playbook Engine
curl {URL}/api/playbook-engine/analytics/summary

# Check External API (with auth)
curl -H "X-API-Key: elk_f531ebe4a7d24c8fbcde123456789abc" {URL}/api/external/pipeline/stats
```

---

**Last Updated:** January 2026
**Status:** ✅ ALL FEATURES COMPLETE
