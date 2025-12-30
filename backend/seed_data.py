"""
Labyrinth Operating System - Seed Data
Pre-populated Playbooks, SOPs, and KPIs from specification
"""

from models import (
    FunctionType, LevelType, PlaybookCreate, SOPCreate, SOPStep,
    KPICreate, KPIThresholds
)

# ==================== PLAYBOOKS DATA ====================

PLAYBOOKS_DATA = [
    # SALES FUNCTION
    {"playbook_id": "SALES-ACQ-01", "name": "Lead Generation", "function": FunctionType.SALES, "level": LevelType.ACQUIRE, "min_tier": 1, "description": "Cold outreach, initial qualification", "linked_sop_ids": ["SOP-SALES-001"]},
    {"playbook_id": "SALES-ACQ-02", "name": "Discovery Calls", "function": FunctionType.SALES, "level": LevelType.ACQUIRE, "min_tier": 2, "description": "Needs assessment, pain identification", "linked_sop_ids": ["SOP-SALES-002"]},
    {"playbook_id": "SALES-ACQ-03", "name": "High-Ticket Conversion", "function": FunctionType.SALES, "level": LevelType.ACQUIRE, "min_tier": 3, "description": "Enterprise deals, complex negotiations", "linked_sop_ids": ["SOP-SALES-003", "SOP-SALES-004"]},
    {"playbook_id": "SALES-MNT-01", "name": "Account Management", "function": FunctionType.SALES, "level": LevelType.MAINTAIN, "min_tier": 2, "description": "Client retention, relationship building", "linked_sop_ids": ["SOP-SALES-005"]},
    {"playbook_id": "SALES-MNT-02", "name": "Renewal Processing", "function": FunctionType.SALES, "level": LevelType.MAINTAIN, "min_tier": 1, "description": "Contract renewals, payment collection", "linked_sop_ids": ["SOP-SALES-006"]},
    {"playbook_id": "SALES-SCL-01", "name": "Upsell Execution", "function": FunctionType.SALES, "level": LevelType.SCALE, "min_tier": 2, "description": "Bronze→Silver→Gold→Black upgrades", "linked_sop_ids": ["SOP-SALES-007"]},
    {"playbook_id": "SALES-SCL-02", "name": "Enterprise Expansion", "function": FunctionType.SALES, "level": LevelType.SCALE, "min_tier": 3, "description": "Multi-location, corporate accounts", "linked_sop_ids": ["SOP-SALES-008"]},
    
    # MARKETING FUNCTION
    {"playbook_id": "MKT-ACQ-01", "name": "Demand Generation", "function": FunctionType.MARKETING, "level": LevelType.ACQUIRE, "min_tier": 2, "description": "Paid ads, lead magnets, funnel building", "linked_sop_ids": ["SOP-MKT-001", "SOP-MKT-002"]},
    {"playbook_id": "MKT-ACQ-02", "name": "Content Creation", "function": FunctionType.MARKETING, "level": LevelType.ACQUIRE, "min_tier": 1, "description": "Blog posts, social media, basic assets", "linked_sop_ids": ["SOP-MKT-003"]},
    {"playbook_id": "MKT-ACQ-03", "name": "Campaign Launch", "function": FunctionType.MARKETING, "level": LevelType.ACQUIRE, "min_tier": 2, "description": "Multi-channel campaign execution", "linked_sop_ids": ["SOP-MKT-004"]},
    {"playbook_id": "MKT-MNT-01", "name": "Brand Maintenance", "function": FunctionType.MARKETING, "level": LevelType.MAINTAIN, "min_tier": 1, "description": "Asset updates, consistency enforcement", "linked_sop_ids": ["SOP-MKT-005"]},
    {"playbook_id": "MKT-MNT-02", "name": "Performance Optimization", "function": FunctionType.MARKETING, "level": LevelType.MAINTAIN, "min_tier": 2, "description": "A/B testing, ROAS improvement", "linked_sop_ids": ["SOP-MKT-006"]},
    {"playbook_id": "MKT-SCL-01", "name": "Multi-Channel Scaling", "function": FunctionType.MARKETING, "level": LevelType.SCALE, "min_tier": 3, "description": "Platform expansion, budget scaling", "linked_sop_ids": ["SOP-MKT-007"]},
    {"playbook_id": "MKT-SCL-02", "name": "Brand Authority", "function": FunctionType.MARKETING, "level": LevelType.SCALE, "min_tier": 3, "description": "Thought leadership, PR, partnerships", "linked_sop_ids": ["SOP-MKT-008"]},
    
    # DEVELOPMENT FUNCTION
    {"playbook_id": "DEV-ACQ-01", "name": "MVP Build", "function": FunctionType.DEVELOPMENT, "level": LevelType.ACQUIRE, "min_tier": 2, "description": "Rapid prototyping, core features", "linked_sop_ids": ["SOP-DEV-001"]},
    {"playbook_id": "DEV-ACQ-02", "name": "Integration Setup", "function": FunctionType.DEVELOPMENT, "level": LevelType.ACQUIRE, "min_tier": 2, "description": "API connections, platform linking", "linked_sop_ids": ["SOP-DEV-002"]},
    {"playbook_id": "DEV-MNT-01", "name": "Bug Resolution", "function": FunctionType.DEVELOPMENT, "level": LevelType.MAINTAIN, "min_tier": 1, "description": "Issue tracking, fixes, patches", "linked_sop_ids": ["SOP-DEV-003"]},
    {"playbook_id": "DEV-MNT-02", "name": "Code Maintenance", "function": FunctionType.DEVELOPMENT, "level": LevelType.MAINTAIN, "min_tier": 2, "description": "Refactoring, technical debt reduction", "linked_sop_ids": ["SOP-DEV-004"]},
    {"playbook_id": "DEV-MNT-03", "name": "Documentation", "function": FunctionType.DEVELOPMENT, "level": LevelType.MAINTAIN, "min_tier": 1, "description": "Technical docs, API references", "linked_sop_ids": ["SOP-DEV-005"]},
    {"playbook_id": "DEV-SCL-01", "name": "Feature Expansion", "function": FunctionType.DEVELOPMENT, "level": LevelType.SCALE, "min_tier": 3, "description": "New modules, advanced capabilities", "linked_sop_ids": ["SOP-DEV-006"]},
    {"playbook_id": "DEV-SCL-02", "name": "Performance Scaling", "function": FunctionType.DEVELOPMENT, "level": LevelType.SCALE, "min_tier": 3, "description": "Infrastructure, load handling", "linked_sop_ids": ["SOP-DEV-007"]},
    {"playbook_id": "DEV-SCL-03", "name": "AI Integration", "function": FunctionType.DEVELOPMENT, "level": LevelType.SCALE, "min_tier": 3, "description": "AI Mother, automation layers", "linked_sop_ids": ["SOP-DEV-008"]},
    
    # FINANCE FUNCTION
    {"playbook_id": "FIN-ACQ-01", "name": "Client Billing Setup", "function": FunctionType.FINANCE, "level": LevelType.ACQUIRE, "min_tier": 1, "description": "Invoice creation, payment processing", "linked_sop_ids": ["SOP-FIN-001"]},
    {"playbook_id": "FIN-ACQ-02", "name": "Contract Processing", "function": FunctionType.FINANCE, "level": LevelType.ACQUIRE, "min_tier": 2, "description": "Contract review, terms verification", "linked_sop_ids": ["SOP-FIN-002"]},
    {"playbook_id": "FIN-MNT-01", "name": "Accounts Receivable", "function": FunctionType.FINANCE, "level": LevelType.MAINTAIN, "min_tier": 1, "description": "Payment tracking, collections", "linked_sop_ids": ["SOP-FIN-003"]},
    {"playbook_id": "FIN-MNT-02", "name": "Expense Management", "function": FunctionType.FINANCE, "level": LevelType.MAINTAIN, "min_tier": 2, "description": "Budget tracking, cost control", "linked_sop_ids": ["SOP-FIN-004"]},
    {"playbook_id": "FIN-MNT-03", "name": "Compliance Monitoring", "function": FunctionType.FINANCE, "level": LevelType.MAINTAIN, "min_tier": 2, "description": "Tax filing, regulatory adherence", "linked_sop_ids": ["SOP-FIN-005"]},
    {"playbook_id": "FIN-SCL-01", "name": "Forecasting & Margins", "function": FunctionType.FINANCE, "level": LevelType.SCALE, "min_tier": 3, "description": "Financial modeling, margin optimization", "linked_sop_ids": ["SOP-FIN-006"]},
    {"playbook_id": "FIN-SCL-02", "name": "M&A Due Diligence", "function": FunctionType.FINANCE, "level": LevelType.SCALE, "min_tier": 3, "description": "Valuations, equity deals", "linked_sop_ids": ["SOP-FIN-007"]},
    
    # OPERATIONS FUNCTION
    {"playbook_id": "OPS-ACQ-01", "name": "Client Onboarding", "function": FunctionType.OPERATIONS, "level": LevelType.ACQUIRE, "min_tier": 1, "description": "Welcome sequence, initial setup", "linked_sop_ids": ["SOP-OPS-001"]},
    {"playbook_id": "OPS-ACQ-02", "name": "Resource Allocation", "function": FunctionType.OPERATIONS, "level": LevelType.ACQUIRE, "min_tier": 2, "description": "Team assignment, capacity planning", "linked_sop_ids": ["SOP-OPS-002"]},
    {"playbook_id": "OPS-MNT-01", "name": "Process Management", "function": FunctionType.OPERATIONS, "level": LevelType.MAINTAIN, "min_tier": 2, "description": "Workflow oversight, bottleneck removal", "linked_sop_ids": ["SOP-OPS-003"]},
    {"playbook_id": "OPS-MNT-02", "name": "Quality Assurance", "function": FunctionType.OPERATIONS, "level": LevelType.MAINTAIN, "min_tier": 2, "description": "Deliverable review, standards enforcement", "linked_sop_ids": ["SOP-OPS-004"]},
    {"playbook_id": "OPS-MNT-03", "name": "SOP Maintenance", "function": FunctionType.OPERATIONS, "level": LevelType.MAINTAIN, "min_tier": 1, "description": "Documentation updates, procedure revisions", "linked_sop_ids": ["SOP-OPS-005"]},
    {"playbook_id": "OPS-SCL-01", "name": "System Architecture", "function": FunctionType.OPERATIONS, "level": LevelType.SCALE, "min_tier": 3, "description": "Platform design, automation strategy", "linked_sop_ids": ["SOP-OPS-006"]},
    {"playbook_id": "OPS-SCL-02", "name": "Capacity Scaling", "function": FunctionType.OPERATIONS, "level": LevelType.SCALE, "min_tier": 3, "description": "Team expansion, resource multiplication", "linked_sop_ids": ["SOP-OPS-007"]},
    
    # POWERHOUSE (HR) FUNCTION
    {"playbook_id": "PWR-ACQ-01", "name": "Talent Sourcing", "function": FunctionType.POWERHOUSE, "level": LevelType.ACQUIRE, "min_tier": 1, "description": "Job posting, candidate pipeline", "linked_sop_ids": ["SOP-PWR-001"]},
    {"playbook_id": "PWR-ACQ-02", "name": "Screening & Assessment", "function": FunctionType.POWERHOUSE, "level": LevelType.ACQUIRE, "min_tier": 2, "description": "Skills testing, interview coordination", "linked_sop_ids": ["SOP-PWR-002"]},
    {"playbook_id": "PWR-ACQ-03", "name": "VA Pool Building", "function": FunctionType.POWERHOUSE, "level": LevelType.ACQUIRE, "min_tier": 2, "description": "Pre-vetted talent warehouse", "linked_sop_ids": ["SOP-PWR-003"]},
    {"playbook_id": "PWR-MNT-01", "name": "Performance Tracking", "function": FunctionType.POWERHOUSE, "level": LevelType.MAINTAIN, "min_tier": 2, "description": "KPI monitoring, tier scoring", "linked_sop_ids": ["SOP-PWR-004"]},
    {"playbook_id": "PWR-MNT-02", "name": "Training Delivery", "function": FunctionType.POWERHOUSE, "level": LevelType.MAINTAIN, "min_tier": 1, "description": "Onboarding, skill development", "linked_sop_ids": ["SOP-PWR-005"]},
    {"playbook_id": "PWR-MNT-03", "name": "Contract Management", "function": FunctionType.POWERHOUSE, "level": LevelType.MAINTAIN, "min_tier": 2, "description": "Recurring contracts, renewals", "linked_sop_ids": ["SOP-PWR-006"]},
    {"playbook_id": "PWR-SCL-01", "name": "Leadership Development", "function": FunctionType.POWERHOUSE, "level": LevelType.SCALE, "min_tier": 3, "description": "Tier advancement, succession planning", "linked_sop_ids": ["SOP-PWR-007"]},
    {"playbook_id": "PWR-SCL-02", "name": "Culture Scaling", "function": FunctionType.POWERHOUSE, "level": LevelType.SCALE, "min_tier": 3, "description": "Values enforcement, team alignment", "linked_sop_ids": ["SOP-PWR-008"]},
]

# ==================== SOPs DATA ====================

SOPS_DATA = [
    # SALES SOPs
    {"sop_id": "SOP-SALES-001", "name": "Cold Outreach Script", "function": FunctionType.SALES, "linked_playbook_ids": ["SALES-ACQ-01"], "template_required": "Outreach Template", "estimated_time_minutes": 15,
     "steps": [
         {"step_number": 1, "title": "Research Prospect", "description": "Review prospect LinkedIn, company website, recent news", "checklist_items": ["LinkedIn profile reviewed", "Company size identified", "Recent activity noted"]},
         {"step_number": 2, "title": "Personalize Message", "description": "Customize outreach based on research findings", "checklist_items": ["Pain point identified", "Personal hook added", "Value proposition clear"]},
         {"step_number": 3, "title": "Send & Log", "description": "Send message and log in CRM", "checklist_items": ["Message sent", "CRM updated", "Follow-up scheduled"]}
     ]},
    {"sop_id": "SOP-SALES-002", "name": "Discovery Call Framework", "function": FunctionType.SALES, "linked_playbook_ids": ["SALES-ACQ-02"], "template_required": "Discovery Questions Template", "estimated_time_minutes": 45,
     "steps": [
         {"step_number": 1, "title": "Pre-Call Prep", "description": "Review prospect info and prepare questions", "checklist_items": ["Account history reviewed", "Questions prepared", "Meeting link tested"]},
         {"step_number": 2, "title": "Build Rapport", "description": "Open with personal connection", "checklist_items": ["Ice breaker delivered", "Agenda confirmed"]},
         {"step_number": 3, "title": "Discovery Questions", "description": "Uncover pain points and goals", "checklist_items": ["Current state understood", "Pain points documented", "Budget discussed"]},
         {"step_number": 4, "title": "Next Steps", "description": "Confirm follow-up actions", "checklist_items": ["Next meeting scheduled", "Summary sent", "CRM updated"]}
     ]},
    {"sop_id": "SOP-SALES-003", "name": "Proposal Creation", "function": FunctionType.SALES, "linked_playbook_ids": ["SALES-ACQ-03"], "template_required": "Proposal Template", "estimated_time_minutes": 120,
     "steps": [
         {"step_number": 1, "title": "Gather Requirements", "description": "Compile all discovery findings", "checklist_items": ["Pain points listed", "Goals documented", "Budget confirmed"]},
         {"step_number": 2, "title": "Draft Proposal", "description": "Create customized proposal", "checklist_items": ["Executive summary written", "Solution outlined", "Pricing included"]},
         {"step_number": 3, "title": "Internal Review", "description": "Get approval from leadership", "checklist_items": ["Manager reviewed", "Pricing approved", "Legal cleared"]},
         {"step_number": 4, "title": "Deliver & Follow Up", "description": "Send proposal and schedule review call", "checklist_items": ["Proposal sent", "Review meeting scheduled"]}
     ]},
    {"sop_id": "SOP-SALES-004", "name": "Contract Negotiation", "function": FunctionType.SALES, "linked_playbook_ids": ["SALES-ACQ-03"], "template_required": "Terms Sheet Template", "estimated_time_minutes": 60,
     "steps": [
         {"step_number": 1, "title": "Prepare Negotiation Points", "description": "Identify must-haves and nice-to-haves", "checklist_items": ["Walk-away points defined", "Concession list prepared"]},
         {"step_number": 2, "title": "Conduct Negotiation", "description": "Work through objections", "checklist_items": ["Objections addressed", "Terms agreed"]},
         {"step_number": 3, "title": "Finalize Contract", "description": "Get signatures and process", "checklist_items": ["Contract signed", "Finance notified", "Onboarding initiated"]}
     ]},
    {"sop_id": "SOP-SALES-005", "name": "Account Health Check", "function": FunctionType.SALES, "linked_playbook_ids": ["SALES-MNT-01"], "template_required": "Health Score Template", "estimated_time_minutes": 30,
     "steps": [
         {"step_number": 1, "title": "Review Metrics", "description": "Check usage, engagement, support tickets", "checklist_items": ["Usage data pulled", "Support history reviewed"]},
         {"step_number": 2, "title": "Calculate Health Score", "description": "Apply scoring formula", "checklist_items": ["Score calculated", "Risk level assigned"]},
         {"step_number": 3, "title": "Plan Intervention", "description": "Create action plan for at-risk accounts", "checklist_items": ["Action items defined", "Owner assigned"]}
     ]},
    {"sop_id": "SOP-SALES-006", "name": "Renewal Outreach", "function": FunctionType.SALES, "linked_playbook_ids": ["SALES-MNT-02"], "template_required": "Renewal Email Template", "estimated_time_minutes": 20,
     "steps": [
         {"step_number": 1, "title": "Identify Renewals", "description": "Pull list of upcoming renewals", "checklist_items": ["90-day list generated", "60-day list generated", "30-day list generated"]},
         {"step_number": 2, "title": "Send Renewal Notice", "description": "Customize and send renewal emails", "checklist_items": ["Email personalized", "Terms updated", "Email sent"]},
         {"step_number": 3, "title": "Follow Up", "description": "Track responses and follow up", "checklist_items": ["Responses logged", "Follow-ups scheduled"]}
     ]},
    {"sop_id": "SOP-SALES-007", "name": "Upsell Identification", "function": FunctionType.SALES, "linked_playbook_ids": ["SALES-SCL-01"], "template_required": "Upsell Criteria Checklist", "estimated_time_minutes": 25,
     "steps": [
         {"step_number": 1, "title": "Analyze Account", "description": "Review current package and usage", "checklist_items": ["Current tier noted", "Usage patterns analyzed"]},
         {"step_number": 2, "title": "Identify Opportunity", "description": "Match needs to higher tier features", "checklist_items": ["Feature gaps identified", "ROI calculated"]},
         {"step_number": 3, "title": "Present Upgrade", "description": "Pitch upgrade with value focus", "checklist_items": ["Proposal prepared", "Meeting scheduled"]}
     ]},
    {"sop_id": "SOP-SALES-008", "name": "Enterprise Pitch", "function": FunctionType.SALES, "linked_playbook_ids": ["SALES-SCL-02"], "template_required": "Enterprise Deck Template", "estimated_time_minutes": 90,
     "steps": [
         {"step_number": 1, "title": "Stakeholder Mapping", "description": "Identify all decision makers", "checklist_items": ["Decision makers listed", "Influencers identified"]},
         {"step_number": 2, "title": "Customize Deck", "description": "Tailor presentation to enterprise needs", "checklist_items": ["Case studies added", "ROI calculations included"]},
         {"step_number": 3, "title": "Multi-Threaded Approach", "description": "Engage multiple stakeholders", "checklist_items": ["Meetings scheduled", "Champions identified"]}
     ]},
    
    # MARKETING SOPs
    {"sop_id": "SOP-MKT-001", "name": "Campaign Brief Creation", "function": FunctionType.MARKETING, "linked_playbook_ids": ["MKT-ACQ-01"], "template_required": "Campaign Brief Template", "estimated_time_minutes": 45,
     "steps": [
         {"step_number": 1, "title": "Define Objectives", "description": "Set clear campaign goals and KPIs", "checklist_items": ["Goal defined", "KPIs set", "Budget allocated"]},
         {"step_number": 2, "title": "Audience Research", "description": "Define target audience segments", "checklist_items": ["Personas created", "Pain points listed"]},
         {"step_number": 3, "title": "Creative Direction", "description": "Outline messaging and visual direction", "checklist_items": ["Key messages drafted", "Visual style defined"]}
     ]},
    {"sop_id": "SOP-MKT-002", "name": "Ad Creative Development", "function": FunctionType.MARKETING, "linked_playbook_ids": ["MKT-ACQ-01"], "template_required": "Creative Brief Template", "estimated_time_minutes": 60,
     "steps": [
         {"step_number": 1, "title": "Gather Assets", "description": "Collect brand assets and guidelines", "checklist_items": ["Logo files ready", "Brand colors confirmed", "Font files available"]},
         {"step_number": 2, "title": "Create Variations", "description": "Design multiple ad variations", "checklist_items": ["3+ variations created", "Copy variations written"]},
         {"step_number": 3, "title": "Review & Approve", "description": "Get stakeholder approval", "checklist_items": ["Internal review done", "Client approval received"]}
     ]},
    {"sop_id": "SOP-MKT-003", "name": "Content Calendar Management", "function": FunctionType.MARKETING, "linked_playbook_ids": ["MKT-ACQ-02"], "template_required": "Content Calendar Template", "estimated_time_minutes": 30,
     "steps": [
         {"step_number": 1, "title": "Plan Content", "description": "Map out monthly content themes", "checklist_items": ["Themes defined", "Key dates marked"]},
         {"step_number": 2, "title": "Assign Tasks", "description": "Distribute content creation tasks", "checklist_items": ["Writers assigned", "Deadlines set"]},
         {"step_number": 3, "title": "Schedule Posts", "description": "Queue content in scheduling tool", "checklist_items": ["Posts scheduled", "Captions written"]}
     ]},
    {"sop_id": "SOP-MKT-004", "name": "Funnel Build Process", "function": FunctionType.MARKETING, "linked_playbook_ids": ["MKT-ACQ-03"], "template_required": "Funnel Wireframe Template", "estimated_time_minutes": 180,
     "steps": [
         {"step_number": 1, "title": "Map Customer Journey", "description": "Define stages from awareness to conversion", "checklist_items": ["Stages defined", "Touchpoints mapped"]},
         {"step_number": 2, "title": "Build Landing Pages", "description": "Create pages for each funnel stage", "checklist_items": ["Pages built", "Forms connected"]},
         {"step_number": 3, "title": "Setup Automation", "description": "Configure email sequences", "checklist_items": ["Emails written", "Triggers set", "Testing complete"]}
     ]},
    {"sop_id": "SOP-MKT-005", "name": "Brand Asset Update", "function": FunctionType.MARKETING, "linked_playbook_ids": ["MKT-MNT-01"], "template_required": "Brand Guidelines Template", "estimated_time_minutes": 60,
     "steps": [
         {"step_number": 1, "title": "Audit Current Assets", "description": "Review all brand materials", "checklist_items": ["Asset inventory done", "Outdated items flagged"]},
         {"step_number": 2, "title": "Update Materials", "description": "Refresh outdated assets", "checklist_items": ["Updates completed", "New versions uploaded"]},
         {"step_number": 3, "title": "Distribute Updates", "description": "Share with team and partners", "checklist_items": ["Team notified", "Asset library updated"]}
     ]},
    {"sop_id": "SOP-MKT-006", "name": "Performance Reporting", "function": FunctionType.MARKETING, "linked_playbook_ids": ["MKT-MNT-02"], "template_required": "Campaign Report Template", "estimated_time_minutes": 45,
     "steps": [
         {"step_number": 1, "title": "Gather Data", "description": "Pull metrics from all platforms", "checklist_items": ["Ad platform data pulled", "Analytics reviewed"]},
         {"step_number": 2, "title": "Analyze Results", "description": "Compare to benchmarks and goals", "checklist_items": ["KPIs vs targets compared", "Insights documented"]},
         {"step_number": 3, "title": "Create Report", "description": "Build visual report with recommendations", "checklist_items": ["Report created", "Recommendations included"]}
     ]},
    {"sop_id": "SOP-MKT-007", "name": "Budget Scaling Protocol", "function": FunctionType.MARKETING, "linked_playbook_ids": ["MKT-SCL-01"], "template_required": "Scaling Checklist", "estimated_time_minutes": 30,
     "steps": [
         {"step_number": 1, "title": "Validate Performance", "description": "Confirm ROAS meets threshold", "checklist_items": ["ROAS above 3x confirmed", "Conversion data validated"]},
         {"step_number": 2, "title": "Incremental Increase", "description": "Scale budget by 20-30%", "checklist_items": ["New budget calculated", "Campaigns updated"]},
         {"step_number": 3, "title": "Monitor & Adjust", "description": "Track performance post-scale", "checklist_items": ["Daily monitoring set", "Rollback plan ready"]}
     ]},
    {"sop_id": "SOP-MKT-008", "name": "PR Outreach", "function": FunctionType.MARKETING, "linked_playbook_ids": ["MKT-SCL-02"], "template_required": "Press Kit Template", "estimated_time_minutes": 90,
     "steps": [
         {"step_number": 1, "title": "Prepare Press Kit", "description": "Compile company info and assets", "checklist_items": ["Founder bios ready", "High-res images included"]},
         {"step_number": 2, "title": "Build Media List", "description": "Research relevant journalists", "checklist_items": ["50+ contacts identified", "Emails verified"]},
         {"step_number": 3, "title": "Pitch Outreach", "description": "Send personalized pitches", "checklist_items": ["Pitches sent", "Follow-ups scheduled"]}
     ]},
    
    # DEVELOPMENT SOPs
    {"sop_id": "SOP-DEV-001", "name": "Sprint Planning", "function": FunctionType.DEVELOPMENT, "linked_playbook_ids": ["DEV-ACQ-01"], "template_required": "Sprint Template", "estimated_time_minutes": 60,
     "steps": [
         {"step_number": 1, "title": "Backlog Grooming", "description": "Prioritize and estimate stories", "checklist_items": ["Stories prioritized", "Points assigned"]},
         {"step_number": 2, "title": "Sprint Goal", "description": "Define sprint objective", "checklist_items": ["Goal documented", "Team aligned"]},
         {"step_number": 3, "title": "Capacity Planning", "description": "Assign stories based on capacity", "checklist_items": ["Capacity calculated", "Stories assigned"]}
     ]},
    {"sop_id": "SOP-DEV-002", "name": "API Integration Guide", "function": FunctionType.DEVELOPMENT, "linked_playbook_ids": ["DEV-ACQ-02"], "template_required": "Integration Checklist", "estimated_time_minutes": 120,
     "steps": [
         {"step_number": 1, "title": "Review Documentation", "description": "Study API docs and requirements", "checklist_items": ["Docs reviewed", "Auth method understood"]},
         {"step_number": 2, "title": "Implement Connection", "description": "Build integration code", "checklist_items": ["Connection established", "Error handling added"]},
         {"step_number": 3, "title": "Test & Validate", "description": "Verify all endpoints work", "checklist_items": ["All endpoints tested", "Edge cases covered"]}
     ]},
    {"sop_id": "SOP-DEV-003", "name": "Bug Triage Process", "function": FunctionType.DEVELOPMENT, "linked_playbook_ids": ["DEV-MNT-01"], "template_required": "Bug Report Template", "estimated_time_minutes": 15,
     "steps": [
         {"step_number": 1, "title": "Reproduce Bug", "description": "Verify and document reproduction steps", "checklist_items": ["Bug confirmed", "Steps documented"]},
         {"step_number": 2, "title": "Assess Severity", "description": "Determine priority level", "checklist_items": ["Severity assigned", "Impact assessed"]},
         {"step_number": 3, "title": "Assign & Track", "description": "Route to appropriate developer", "checklist_items": ["Developer assigned", "Deadline set"]}
     ]},
    {"sop_id": "SOP-DEV-004", "name": "Code Review Protocol", "function": FunctionType.DEVELOPMENT, "linked_playbook_ids": ["DEV-MNT-02"], "template_required": "Review Checklist", "estimated_time_minutes": 30,
     "steps": [
         {"step_number": 1, "title": "Review Code", "description": "Check for quality and standards", "checklist_items": ["Code style verified", "Logic reviewed"]},
         {"step_number": 2, "title": "Test Coverage", "description": "Verify tests are adequate", "checklist_items": ["Tests present", "Coverage acceptable"]},
         {"step_number": 3, "title": "Approve or Request Changes", "description": "Provide feedback", "checklist_items": ["Feedback given", "Status updated"]}
     ]},
    {"sop_id": "SOP-DEV-005", "name": "Technical Documentation", "function": FunctionType.DEVELOPMENT, "linked_playbook_ids": ["DEV-MNT-03"], "template_required": "Doc Template", "estimated_time_minutes": 60,
     "steps": [
         {"step_number": 1, "title": "Outline Structure", "description": "Plan documentation sections", "checklist_items": ["Outline created", "Sections defined"]},
         {"step_number": 2, "title": "Write Content", "description": "Document code and processes", "checklist_items": ["Content written", "Examples included"]},
         {"step_number": 3, "title": "Review & Publish", "description": "Get review and publish", "checklist_items": ["Review complete", "Published"]}
     ]},
    {"sop_id": "SOP-DEV-006", "name": "Feature Specification", "function": FunctionType.DEVELOPMENT, "linked_playbook_ids": ["DEV-SCL-01"], "template_required": "PRD Template", "estimated_time_minutes": 120,
     "steps": [
         {"step_number": 1, "title": "Define Requirements", "description": "Gather and document requirements", "checklist_items": ["User stories written", "Acceptance criteria defined"]},
         {"step_number": 2, "title": "Technical Design", "description": "Create architecture plan", "checklist_items": ["Design documented", "Dependencies identified"]},
         {"step_number": 3, "title": "Stakeholder Review", "description": "Get approval", "checklist_items": ["Review meeting held", "Sign-off received"]}
     ]},
    {"sop_id": "SOP-DEV-007", "name": "Load Testing Protocol", "function": FunctionType.DEVELOPMENT, "linked_playbook_ids": ["DEV-SCL-02"], "template_required": "Performance Checklist", "estimated_time_minutes": 180,
     "steps": [
         {"step_number": 1, "title": "Define Load Scenarios", "description": "Determine test parameters", "checklist_items": ["Concurrent users defined", "Test duration set"]},
         {"step_number": 2, "title": "Execute Tests", "description": "Run load tests", "checklist_items": ["Tests executed", "Metrics collected"]},
         {"step_number": 3, "title": "Analyze & Optimize", "description": "Review results and improve", "checklist_items": ["Bottlenecks identified", "Optimizations applied"]}
     ]},
    {"sop_id": "SOP-DEV-008", "name": "AI Workflow Design", "function": FunctionType.DEVELOPMENT, "linked_playbook_ids": ["DEV-SCL-03"], "template_required": "AI Spec Template", "estimated_time_minutes": 240,
     "steps": [
         {"step_number": 1, "title": "Define AI Use Case", "description": "Document automation opportunity", "checklist_items": ["Use case documented", "ROI estimated"]},
         {"step_number": 2, "title": "Design Workflow", "description": "Map AI decision points", "checklist_items": ["Workflow mapped", "Fallbacks defined"]},
         {"step_number": 3, "title": "Implement & Train", "description": "Build and train models", "checklist_items": ["Model deployed", "Training complete"]}
     ]},
    
    # FINANCE SOPs
    {"sop_id": "SOP-FIN-001", "name": "Invoice Generation", "function": FunctionType.FINANCE, "linked_playbook_ids": ["FIN-ACQ-01"], "template_required": "Invoice Template", "estimated_time_minutes": 15,
     "steps": [
         {"step_number": 1, "title": "Gather Details", "description": "Collect billing information", "checklist_items": ["Client info verified", "Services listed"]},
         {"step_number": 2, "title": "Create Invoice", "description": "Generate invoice document", "checklist_items": ["Invoice created", "Terms included"]},
         {"step_number": 3, "title": "Send & Log", "description": "Send to client and record", "checklist_items": ["Invoice sent", "System updated"]}
     ]},
    {"sop_id": "SOP-FIN-002", "name": "Contract Review Checklist", "function": FunctionType.FINANCE, "linked_playbook_ids": ["FIN-ACQ-02"], "template_required": "Contract Checklist", "estimated_time_minutes": 45,
     "steps": [
         {"step_number": 1, "title": "Review Terms", "description": "Check all contract terms", "checklist_items": ["Payment terms verified", "Scope confirmed"]},
         {"step_number": 2, "title": "Legal Review", "description": "Get legal sign-off if needed", "checklist_items": ["Legal reviewed", "Risk assessed"]},
         {"step_number": 3, "title": "Final Approval", "description": "Get executive approval", "checklist_items": ["Approved", "Filed"]}
     ]},
    {"sop_id": "SOP-FIN-003", "name": "Payment Follow-up", "function": FunctionType.FINANCE, "linked_playbook_ids": ["FIN-MNT-01"], "template_required": "Collection Email Template", "estimated_time_minutes": 15,
     "steps": [
         {"step_number": 1, "title": "Identify Overdue", "description": "Pull overdue invoice list", "checklist_items": ["List generated", "Days overdue noted"]},
         {"step_number": 2, "title": "Send Reminder", "description": "Send appropriate follow-up", "checklist_items": ["Email sent", "Call made if needed"]},
         {"step_number": 3, "title": "Escalate if Needed", "description": "Escalate persistent issues", "checklist_items": ["Escalation criteria checked", "Action taken"]}
     ]},
    {"sop_id": "SOP-FIN-004", "name": "Expense Approval", "function": FunctionType.FINANCE, "linked_playbook_ids": ["FIN-MNT-02"], "template_required": "Expense Form Template", "estimated_time_minutes": 10,
     "steps": [
         {"step_number": 1, "title": "Review Request", "description": "Check expense details", "checklist_items": ["Receipt attached", "Category correct"]},
         {"step_number": 2, "title": "Check Budget", "description": "Verify budget availability", "checklist_items": ["Budget checked", "Within limits"]},
         {"step_number": 3, "title": "Approve/Deny", "description": "Make decision and notify", "checklist_items": ["Decision made", "Requestor notified"]}
     ]},
    {"sop_id": "SOP-FIN-005", "name": "Tax Filing Checklist", "function": FunctionType.FINANCE, "linked_playbook_ids": ["FIN-MNT-03"], "template_required": "Tax Prep Template", "estimated_time_minutes": 480,
     "steps": [
         {"step_number": 1, "title": "Gather Documents", "description": "Collect all required documents", "checklist_items": ["1099s collected", "Expenses compiled"]},
         {"step_number": 2, "title": "Prepare Filing", "description": "Complete tax forms", "checklist_items": ["Forms completed", "Deductions calculated"]},
         {"step_number": 3, "title": "Review & Submit", "description": "Get CPA review and file", "checklist_items": ["CPA reviewed", "Filed on time"]}
     ]},
    {"sop_id": "SOP-FIN-006", "name": "Financial Forecasting", "function": FunctionType.FINANCE, "linked_playbook_ids": ["FIN-SCL-01"], "template_required": "Forecast Model Template", "estimated_time_minutes": 240,
     "steps": [
         {"step_number": 1, "title": "Gather Historical Data", "description": "Compile past financial data", "checklist_items": ["Data collected", "Cleaned and organized"]},
         {"step_number": 2, "title": "Build Model", "description": "Create forecast scenarios", "checklist_items": ["Model built", "Assumptions documented"]},
         {"step_number": 3, "title": "Present & Refine", "description": "Review with leadership", "checklist_items": ["Presented", "Feedback incorporated"]}
     ]},
    {"sop_id": "SOP-FIN-007", "name": "Valuation Analysis", "function": FunctionType.FINANCE, "linked_playbook_ids": ["FIN-SCL-02"], "template_required": "Due Diligence Template", "estimated_time_minutes": 480,
     "steps": [
         {"step_number": 1, "title": "Financial Due Diligence", "description": "Review all financial records", "checklist_items": ["Financials reviewed", "Anomalies flagged"]},
         {"step_number": 2, "title": "Calculate Valuation", "description": "Apply valuation methodologies", "checklist_items": ["DCF completed", "Comparables analyzed"]},
         {"step_number": 3, "title": "Prepare Report", "description": "Document findings", "checklist_items": ["Report written", "Recommendations included"]}
     ]},
    
    # OPERATIONS SOPs
    {"sop_id": "SOP-OPS-001", "name": "Client Welcome Sequence", "function": FunctionType.OPERATIONS, "linked_playbook_ids": ["OPS-ACQ-01"], "template_required": "Onboarding Kit Template", "estimated_time_minutes": 60,
     "steps": [
         {"step_number": 1, "title": "Send Welcome Email", "description": "Deliver welcome package", "checklist_items": ["Email sent", "Materials attached"]},
         {"step_number": 2, "title": "Schedule Kickoff", "description": "Book onboarding call", "checklist_items": ["Meeting scheduled", "Agenda sent"]},
         {"step_number": 3, "title": "Setup Access", "description": "Create accounts and access", "checklist_items": ["Portal access created", "Team introduced"]}
     ]},
    {"sop_id": "SOP-OPS-002", "name": "Team Assignment Matrix", "function": FunctionType.OPERATIONS, "linked_playbook_ids": ["OPS-ACQ-02"], "template_required": "Assignment Template", "estimated_time_minutes": 30,
     "steps": [
         {"step_number": 1, "title": "Review Requirements", "description": "Understand client needs", "checklist_items": ["Needs documented", "Skills required listed"]},
         {"step_number": 2, "title": "Match Resources", "description": "Assign appropriate team", "checklist_items": ["Skills matched", "Availability confirmed"]},
         {"step_number": 3, "title": "Communicate Assignment", "description": "Notify team and client", "checklist_items": ["Team notified", "Client informed"]}
     ]},
    {"sop_id": "SOP-OPS-003", "name": "Weekly Standup Protocol", "function": FunctionType.OPERATIONS, "linked_playbook_ids": ["OPS-MNT-01"], "template_required": "Standup Agenda Template", "estimated_time_minutes": 15,
     "steps": [
         {"step_number": 1, "title": "Prepare Updates", "description": "Gather status from team", "checklist_items": ["Updates collected", "Blockers noted"]},
         {"step_number": 2, "title": "Conduct Standup", "description": "Run efficient meeting", "checklist_items": ["Time-boxed", "All spoke"]},
         {"step_number": 3, "title": "Document Actions", "description": "Record and assign follow-ups", "checklist_items": ["Notes taken", "Actions assigned"]}
     ]},
    {"sop_id": "SOP-OPS-004", "name": "Deliverable QA Checklist", "function": FunctionType.OPERATIONS, "linked_playbook_ids": ["OPS-MNT-02"], "template_required": "QA Checklist Template", "estimated_time_minutes": 30,
     "steps": [
         {"step_number": 1, "title": "Review Against Brief", "description": "Check deliverable matches requirements", "checklist_items": ["Brief reviewed", "Requirements met"]},
         {"step_number": 2, "title": "Quality Check", "description": "Verify quality standards", "checklist_items": ["Quality verified", "No errors found"]},
         {"step_number": 3, "title": "Approve or Return", "description": "Make decision on deliverable", "checklist_items": ["Decision made", "Feedback given"]}
     ]},
    {"sop_id": "SOP-OPS-005", "name": "SOP Update Process", "function": FunctionType.OPERATIONS, "linked_playbook_ids": ["OPS-MNT-03"], "template_required": "SOP Template", "estimated_time_minutes": 45,
     "steps": [
         {"step_number": 1, "title": "Identify Changes", "description": "Document what needs updating", "checklist_items": ["Changes listed", "Reason documented"]},
         {"step_number": 2, "title": "Draft Updates", "description": "Write new version", "checklist_items": ["Draft completed", "Reviewed"]},
         {"step_number": 3, "title": "Publish & Notify", "description": "Release and train team", "checklist_items": ["Published", "Team trained"]}
     ]},
    {"sop_id": "SOP-OPS-006", "name": "Platform Architecture Design", "function": FunctionType.OPERATIONS, "linked_playbook_ids": ["OPS-SCL-01"], "template_required": "Architecture Template", "estimated_time_minutes": 240,
     "steps": [
         {"step_number": 1, "title": "Requirements Gathering", "description": "Document system requirements", "checklist_items": ["Requirements listed", "Constraints identified"]},
         {"step_number": 2, "title": "Design Architecture", "description": "Create system design", "checklist_items": ["Architecture designed", "Diagrams created"]},
         {"step_number": 3, "title": "Review & Approve", "description": "Get stakeholder sign-off", "checklist_items": ["Review meeting held", "Approved"]}
     ]},
    {"sop_id": "SOP-OPS-007", "name": "Hiring Capacity Planning", "function": FunctionType.OPERATIONS, "linked_playbook_ids": ["OPS-SCL-02"], "template_required": "Capacity Model Template", "estimated_time_minutes": 120,
     "steps": [
         {"step_number": 1, "title": "Forecast Demand", "description": "Project future resource needs", "checklist_items": ["Demand projected", "Timeline set"]},
         {"step_number": 2, "title": "Gap Analysis", "description": "Compare current vs needed", "checklist_items": ["Gaps identified", "Skills needed listed"]},
         {"step_number": 3, "title": "Create Hiring Plan", "description": "Develop recruitment timeline", "checklist_items": ["Plan created", "Budget allocated"]}
     ]},
    
    # POWERHOUSE SOPs
    {"sop_id": "SOP-PWR-001", "name": "Job Posting Creation", "function": FunctionType.POWERHOUSE, "linked_playbook_ids": ["PWR-ACQ-01"], "template_required": "Job Template", "estimated_time_minutes": 30,
     "steps": [
         {"step_number": 1, "title": "Define Role", "description": "Document job requirements", "checklist_items": ["Requirements listed", "Salary range set"]},
         {"step_number": 2, "title": "Write Posting", "description": "Create compelling job post", "checklist_items": ["Post written", "SEO optimized"]},
         {"step_number": 3, "title": "Publish", "description": "Post to job boards", "checklist_items": ["Posted to boards", "Tracking set up"]}
     ]},
    {"sop_id": "SOP-PWR-002", "name": "Candidate Screening", "function": FunctionType.POWERHOUSE, "linked_playbook_ids": ["PWR-ACQ-02"], "template_required": "Screening Scorecard", "estimated_time_minutes": 30,
     "steps": [
         {"step_number": 1, "title": "Review Resume", "description": "Check qualifications", "checklist_items": ["Experience verified", "Skills matched"]},
         {"step_number": 2, "title": "Conduct Screen", "description": "Phone/video screening", "checklist_items": ["Screen completed", "Scorecard filled"]},
         {"step_number": 3, "title": "Decide Next Steps", "description": "Advance or decline", "checklist_items": ["Decision made", "Candidate notified"]}
     ]},
    {"sop_id": "SOP-PWR-003", "name": "VA Pool Assignment", "function": FunctionType.POWERHOUSE, "linked_playbook_ids": ["PWR-ACQ-03"], "template_required": "Assignment Template", "estimated_time_minutes": 20,
     "steps": [
         {"step_number": 1, "title": "Review Pool", "description": "Check available VAs", "checklist_items": ["Availability checked", "Skills reviewed"]},
         {"step_number": 2, "title": "Match to Request", "description": "Find best fit", "checklist_items": ["Match found", "Tier verified"]},
         {"step_number": 3, "title": "Assign & Onboard", "description": "Complete assignment", "checklist_items": ["VA assigned", "Briefing done"]}
     ]},
    {"sop_id": "SOP-PWR-004", "name": "Performance Review", "function": FunctionType.POWERHOUSE, "linked_playbook_ids": ["PWR-MNT-01"], "template_required": "Review Template", "estimated_time_minutes": 60,
     "steps": [
         {"step_number": 1, "title": "Gather Data", "description": "Collect performance metrics", "checklist_items": ["KPIs pulled", "Feedback gathered"]},
         {"step_number": 2, "title": "Conduct Review", "description": "Meet with team member", "checklist_items": ["Meeting held", "Discussion documented"]},
         {"step_number": 3, "title": "Set Goals", "description": "Define next period goals", "checklist_items": ["Goals set", "Development plan created"]}
     ]},
    {"sop_id": "SOP-PWR-005", "name": "Training Module Delivery", "function": FunctionType.POWERHOUSE, "linked_playbook_ids": ["PWR-MNT-02"], "template_required": "Training Checklist", "estimated_time_minutes": 120,
     "steps": [
         {"step_number": 1, "title": "Prepare Materials", "description": "Get training content ready", "checklist_items": ["Content prepared", "Access granted"]},
         {"step_number": 2, "title": "Deliver Training", "description": "Conduct training session", "checklist_items": ["Training completed", "Questions answered"]},
         {"step_number": 3, "title": "Verify Completion", "description": "Confirm understanding", "checklist_items": ["Quiz completed", "Certificate issued"]}
     ]},
    {"sop_id": "SOP-PWR-006", "name": "Contract Renewal Process", "function": FunctionType.POWERHOUSE, "linked_playbook_ids": ["PWR-MNT-03"], "template_required": "Contract Template", "estimated_time_minutes": 30,
     "steps": [
         {"step_number": 1, "title": "Review Performance", "description": "Check renewal eligibility", "checklist_items": ["Performance reviewed", "Issues addressed"]},
         {"step_number": 2, "title": "Negotiate Terms", "description": "Discuss renewal terms", "checklist_items": ["Terms discussed", "Rate adjusted if needed"]},
         {"step_number": 3, "title": "Execute Renewal", "description": "Process new contract", "checklist_items": ["Contract signed", "Systems updated"]}
     ]},
    {"sop_id": "SOP-PWR-007", "name": "Tier Advancement Protocol", "function": FunctionType.POWERHOUSE, "linked_playbook_ids": ["PWR-SCL-01"], "template_required": "Advancement Checklist", "estimated_time_minutes": 60,
     "steps": [
         {"step_number": 1, "title": "Verify Eligibility", "description": "Check advancement criteria", "checklist_items": ["Criteria met", "Time in role sufficient"]},
         {"step_number": 2, "title": "Assessment", "description": "Conduct tier assessment", "checklist_items": ["Assessment completed", "Scores documented"]},
         {"step_number": 3, "title": "Process Advancement", "description": "Update tier and notify", "checklist_items": ["Tier updated", "Announcement made"]}
     ]},
    {"sop_id": "SOP-PWR-008", "name": "Culture Assessment", "function": FunctionType.POWERHOUSE, "linked_playbook_ids": ["PWR-SCL-02"], "template_required": "Culture Survey Template", "estimated_time_minutes": 90,
     "steps": [
         {"step_number": 1, "title": "Deploy Survey", "description": "Send culture assessment", "checklist_items": ["Survey sent", "Reminder scheduled"]},
         {"step_number": 2, "title": "Analyze Results", "description": "Review survey data", "checklist_items": ["Data analyzed", "Themes identified"]},
         {"step_number": 3, "title": "Action Planning", "description": "Create improvement plan", "checklist_items": ["Plan created", "Owners assigned"]}
     ]},
]

# ==================== KPIs DATA ====================

KPIS_DATA = [
    # SALES KPIs
    {"kpi_id": "KPI-SALES-001", "name": "Lead Response Time", "function": FunctionType.SALES, "description": "Average time to respond to new leads", "unit": "minutes", "measurement_formula": "Avg response time",
     "thresholds": {"target": 15, "yellow_threshold": 30, "red_threshold": 60, "is_higher_better": False}},
    {"kpi_id": "KPI-SALES-002", "name": "Discovery Call Booking Rate", "function": FunctionType.SALES, "description": "Percentage of leads that book discovery calls", "unit": "%", "measurement_formula": "Calls booked / leads × 100",
     "thresholds": {"target": 40, "yellow_threshold": 30, "red_threshold": 20, "is_higher_better": True}},
    {"kpi_id": "KPI-SALES-003", "name": "Close Rate", "function": FunctionType.SALES, "description": "Percentage of proposals that close", "unit": "%", "measurement_formula": "Deals closed / proposals × 100",
     "thresholds": {"target": 25, "yellow_threshold": 20, "red_threshold": 15, "is_higher_better": True}},
    {"kpi_id": "KPI-SALES-004", "name": "Upsell Rate", "function": FunctionType.SALES, "description": "Percentage of clients that upgrade", "unit": "%", "measurement_formula": "Upgrades / active clients × 100",
     "thresholds": {"target": 30, "yellow_threshold": 20, "red_threshold": 10, "is_higher_better": True}},
    {"kpi_id": "KPI-SALES-005", "name": "Revenue Target", "function": FunctionType.SALES, "description": "Achievement against revenue target", "unit": "%", "measurement_formula": "Actual / target × 100",
     "thresholds": {"target": 100, "yellow_threshold": 90, "red_threshold": 75, "is_higher_better": True}},
    
    # MARKETING KPIs
    {"kpi_id": "KPI-MKT-001", "name": "ROAS", "function": FunctionType.MARKETING, "description": "Return on ad spend", "unit": "x", "measurement_formula": "Revenue / ad spend",
     "thresholds": {"target": 3.0, "yellow_threshold": 2.5, "red_threshold": 2.0, "is_higher_better": True}},
    {"kpi_id": "KPI-MKT-002", "name": "CPL (Cost Per Lead)", "function": FunctionType.MARKETING, "description": "Cost to acquire each lead", "unit": "$", "measurement_formula": "Spend / leads",
     "thresholds": {"target": 50, "yellow_threshold": 75, "red_threshold": 100, "is_higher_better": False}},
    {"kpi_id": "KPI-MKT-003", "name": "Campaign Launch Time", "function": FunctionType.MARKETING, "description": "Days from brief to live campaign", "unit": "days", "measurement_formula": "Brief to live",
     "thresholds": {"target": 5, "yellow_threshold": 7, "red_threshold": 14, "is_higher_better": False}},
    {"kpi_id": "KPI-MKT-004", "name": "Content Output", "function": FunctionType.MARKETING, "description": "Content pieces published per week", "unit": "pieces/week", "measurement_formula": "Pieces published",
     "thresholds": {"target": 10, "yellow_threshold": 7, "red_threshold": 5, "is_higher_better": True}},
    {"kpi_id": "KPI-MKT-005", "name": "Funnel Conversion", "function": FunctionType.MARKETING, "description": "Funnel conversion rate", "unit": "%", "measurement_formula": "Conversions / visitors × 100",
     "thresholds": {"target": 5, "yellow_threshold": 3, "red_threshold": 2, "is_higher_better": True}},
    
    # DEVELOPMENT KPIs
    {"kpi_id": "KPI-DEV-001", "name": "Sprint Velocity", "function": FunctionType.DEVELOPMENT, "description": "Sprint completion rate", "unit": "%", "measurement_formula": "Completed / planned × 100",
     "thresholds": {"target": 100, "yellow_threshold": 80, "red_threshold": 60, "is_higher_better": True}},
    {"kpi_id": "KPI-DEV-002", "name": "Bug Resolution Time", "function": FunctionType.DEVELOPMENT, "description": "Average time to resolve bugs", "unit": "hours", "measurement_formula": "Avg resolution time",
     "thresholds": {"target": 24, "yellow_threshold": 48, "red_threshold": 72, "is_higher_better": False}},
    {"kpi_id": "KPI-DEV-003", "name": "Code Review Turnaround", "function": FunctionType.DEVELOPMENT, "description": "Time to complete code reviews", "unit": "hours", "measurement_formula": "Review completion time",
     "thresholds": {"target": 4, "yellow_threshold": 8, "red_threshold": 24, "is_higher_better": False}},
    {"kpi_id": "KPI-DEV-004", "name": "Deployment Frequency", "function": FunctionType.DEVELOPMENT, "description": "Deployments per week", "unit": "deploys/week", "measurement_formula": "Deploys per week",
     "thresholds": {"target": 7, "yellow_threshold": 3, "red_threshold": 1, "is_higher_better": True}},
    {"kpi_id": "KPI-DEV-005", "name": "Uptime", "function": FunctionType.DEVELOPMENT, "description": "System availability percentage", "unit": "%", "measurement_formula": "System availability",
     "thresholds": {"target": 99.9, "yellow_threshold": 99.5, "red_threshold": 99.0, "is_higher_better": True}},
    
    # FINANCE KPIs
    {"kpi_id": "KPI-FIN-001", "name": "Invoice Collection Rate", "function": FunctionType.FINANCE, "description": "Percentage of invoices collected", "unit": "%", "measurement_formula": "Collected / invoiced × 100",
     "thresholds": {"target": 95, "yellow_threshold": 90, "red_threshold": 80, "is_higher_better": True}},
    {"kpi_id": "KPI-FIN-002", "name": "Days Sales Outstanding", "function": FunctionType.FINANCE, "description": "Average collection time", "unit": "days", "measurement_formula": "Avg collection time",
     "thresholds": {"target": 30, "yellow_threshold": 45, "red_threshold": 60, "is_higher_better": False}},
    {"kpi_id": "KPI-FIN-003", "name": "Budget Variance", "function": FunctionType.FINANCE, "description": "Deviation from budget", "unit": "%", "measurement_formula": "Actual vs budget deviation",
     "thresholds": {"target": 5, "yellow_threshold": 10, "red_threshold": 20, "is_higher_better": False}},
    {"kpi_id": "KPI-FIN-004", "name": "Gross Margin", "function": FunctionType.FINANCE, "description": "Gross profit margin", "unit": "%", "measurement_formula": "Revenue - COGS / Revenue × 100",
     "thresholds": {"target": 60, "yellow_threshold": 50, "red_threshold": 40, "is_higher_better": True}},
    {"kpi_id": "KPI-FIN-005", "name": "Cash Runway", "function": FunctionType.FINANCE, "description": "Months of cash available", "unit": "months", "measurement_formula": "Cash / burn rate",
     "thresholds": {"target": 6, "yellow_threshold": 4, "red_threshold": 2, "is_higher_better": True}},
    
    # OPERATIONS KPIs
    {"kpi_id": "KPI-OPS-001", "name": "Onboarding Time", "function": FunctionType.OPERATIONS, "description": "Time from client to active", "unit": "hours", "measurement_formula": "Client to active time",
     "thresholds": {"target": 48, "yellow_threshold": 72, "red_threshold": 168, "is_higher_better": False}},
    {"kpi_id": "KPI-OPS-002", "name": "SOP Compliance", "function": FunctionType.OPERATIONS, "description": "Percentage of audits passed", "unit": "%", "measurement_formula": "Audits passed × 100",
     "thresholds": {"target": 95, "yellow_threshold": 90, "red_threshold": 80, "is_higher_better": True}},
    {"kpi_id": "KPI-OPS-003", "name": "Deliverable On-Time Rate", "function": FunctionType.OPERATIONS, "description": "Percentage delivered on time", "unit": "%", "measurement_formula": "On-time / total × 100",
     "thresholds": {"target": 95, "yellow_threshold": 90, "red_threshold": 80, "is_higher_better": True}},
    {"kpi_id": "KPI-OPS-004", "name": "Bottleneck Count", "function": FunctionType.OPERATIONS, "description": "Number of active blockers", "unit": "count", "measurement_formula": "Active blockers",
     "thresholds": {"target": 0, "yellow_threshold": 2, "red_threshold": 5, "is_higher_better": False}},
    {"kpi_id": "KPI-OPS-005", "name": "Team Utilization", "function": FunctionType.OPERATIONS, "description": "Billable vs available ratio", "unit": "%", "measurement_formula": "Billable / available × 100",
     "thresholds": {"target": 85, "yellow_threshold": 70, "red_threshold": 60, "is_higher_better": True}},
    
    # POWERHOUSE KPIs
    {"kpi_id": "KPI-PWR-001", "name": "Time to Hire", "function": FunctionType.POWERHOUSE, "description": "Days from post to offer", "unit": "days", "measurement_formula": "Post to offer time",
     "thresholds": {"target": 7, "yellow_threshold": 14, "red_threshold": 21, "is_higher_better": False}},
    {"kpi_id": "KPI-PWR-002", "name": "Offer Acceptance Rate", "function": FunctionType.POWERHOUSE, "description": "Percentage of offers accepted", "unit": "%", "measurement_formula": "Accepted / offered × 100",
     "thresholds": {"target": 80, "yellow_threshold": 70, "red_threshold": 50, "is_higher_better": True}},
    {"kpi_id": "KPI-PWR-003", "name": "VA Pool Available", "function": FunctionType.POWERHOUSE, "description": "Ready to deploy VAs", "unit": "count", "measurement_formula": "Ready VAs",
     "thresholds": {"target": 20, "yellow_threshold": 15, "red_threshold": 10, "is_higher_better": True}},
    {"kpi_id": "KPI-PWR-004", "name": "Training Completion", "function": FunctionType.POWERHOUSE, "description": "Percentage completing training", "unit": "%", "measurement_formula": "Completed / assigned × 100",
     "thresholds": {"target": 90, "yellow_threshold": 80, "red_threshold": 60, "is_higher_better": True}},
    {"kpi_id": "KPI-PWR-005", "name": "Performance Score Avg", "function": FunctionType.POWERHOUSE, "description": "Team average performance", "unit": "score", "measurement_formula": "Team average",
     "thresholds": {"target": 4.0, "yellow_threshold": 3.5, "red_threshold": 3.0, "is_higher_better": True}},
]


def convert_steps(steps_data):
    """Convert step dictionaries to SOPStep objects"""
    return [SOPStep(**step) for step in steps_data]


def convert_thresholds(threshold_data):
    """Convert threshold dictionary to KPIThresholds object"""
    return KPIThresholds(**threshold_data)


def get_playbooks():
    """Return list of PlaybookCreate objects"""
    return [PlaybookCreate(**p) for p in PLAYBOOKS_DATA]


def get_sops():
    """Return list of SOPCreate objects with converted steps"""
    sops = []
    for sop_data in SOPS_DATA:
        sop_dict = sop_data.copy()
        sop_dict["steps"] = convert_steps(sop_dict["steps"])
        sops.append(SOPCreate(**sop_dict))
    return sops


def get_kpis():
    """Return list of KPICreate objects with converted thresholds"""
    kpis = []
    for kpi_data in KPIS_DATA:
        kpi_dict = kpi_data.copy()
        kpi_dict["thresholds"] = convert_thresholds(kpi_dict["thresholds"])
        kpis.append(KPICreate(**kpi_dict))
    return kpis
