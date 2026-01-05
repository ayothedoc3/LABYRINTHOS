"""
Labyrinth Builder - Comprehensive Seed Data
Pre-populates SOPs, Templates, and Contracts for ALL issue types and tiers
"""

import asyncio
import os
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import uuid

load_dotenv()

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "labyrinth_db")


def create_sop(name, description, category, issue_type, tier, steps):
    """Helper to create SOP dict"""
    return {
        "id": str(uuid.uuid4()),
        "name": name,
        "description": description,
        "issue_category": category,
        "issue_type_id": issue_type,
        "tier": tier,
        "steps": [{"step": i+1, "title": s[0], "description": s[1]} for i, s in enumerate(steps)],
        "created_at": datetime.now(timezone.utc).isoformat()
    }


async def seed_comprehensive_data():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Clear existing builder data
    await db.builder_sops.delete_many({})
    await db.builder_templates.delete_many({})
    await db.builder_contracts.delete_many({})
    
    results = {"sops": 0, "templates": 0, "contracts": 0}
    all_sops = []
    
    # ==================== CLIENT SERVICES ====================
    
    # Bronze Package
    for tier in ["TIER_1", "TIER_2", "TIER_3"]:
        all_sops.append(create_sop(
            f"Bronze Client Intake ({tier.replace('_', ' ')})",
            "Standard intake process for bronze clients",
            "CLIENT_SERVICES", "bronze", tier,
            [
                ("Initial Contact", "Receive and log client inquiry"),
                ("Basic Assessment", "Evaluate client needs and budget"),
                ("Package Presentation", "Present bronze package options"),
                ("Contract Signing", "Process bronze service agreement"),
            ]
        ))
    
    # Silver Package
    for tier in ["TIER_1", "TIER_2", "TIER_3"]:
        all_sops.append(create_sop(
            f"Silver Client Onboarding ({tier.replace('_', ' ')})",
            "Enhanced onboarding for silver clients",
            "CLIENT_SERVICES", "silver", tier,
            [
                ("Discovery Call", "30-min discovery session"),
                ("Needs Analysis", "Document requirements"),
                ("Proposal Creation", "Draft service proposal"),
                ("Kickoff Meeting", "Project kickoff session"),
                ("Portal Setup", "Configure client portal"),
            ]
        ))
    
    # Gold Package
    for tier in ["TIER_1", "TIER_2", "TIER_3"]:
        steps_by_tier = {
            "TIER_1": [
                ("Executive Welcome", "C-level welcome call"),
                ("Strategy Workshop", "Full-day strategy session"),
                ("Team Assignment", "Assign senior dedicated team"),
                ("Custom Portal", "Build branded client portal"),
                ("VIP Training", "Personalized training sessions"),
                ("Success Plan", "Create 90-day success plan"),
            ],
            "TIER_2": [
                ("Welcome Call", "Manager welcome call"),
                ("Strategy Session", "2-hour strategy meeting"),
                ("Team Assignment", "Assign account team"),
                ("Portal Setup", "Configure portal access"),
                ("Training", "Group training session"),
            ],
            "TIER_3": [
                ("Welcome Email", "Automated welcome sequence"),
                ("Quick Start", "Self-service onboarding"),
                ("Portal Access", "Basic portal setup"),
                ("FAQ Review", "Share knowledge base"),
            ],
        }
        all_sops.append(create_sop(
            f"Gold Client Onboarding ({tier.replace('_', ' ')})",
            f"Premium onboarding for gold clients - {tier.replace('_', ' ')}",
            "CLIENT_SERVICES", "gold", tier,
            steps_by_tier[tier]
        ))
    
    # Platinum Package
    for tier in ["TIER_1", "TIER_2", "TIER_3"]:
        all_sops.append(create_sop(
            f"Platinum White Glove Service ({tier.replace('_', ' ')})",
            "Elite service for platinum clients",
            "CLIENT_SERVICES", "platinum", tier,
            [
                ("Executive Dinner", "In-person executive meeting"),
                ("Custom Strategy", "Multi-day strategy workshop"),
                ("Dedicated Team", "Assign dedicated team of 3+"),
                ("Custom Development", "Build bespoke solutions"),
                ("24/7 Support Setup", "Priority support channel"),
                ("Quarterly Reviews", "Executive quarterly reviews"),
            ]
        ))
    
    # Black Package
    for tier in ["TIER_1", "TIER_2", "TIER_3"]:
        all_sops.append(create_sop(
            f"Black VIP Concierge ({tier.replace('_', ' ')})",
            "Ultra-premium VIP service",
            "CLIENT_SERVICES", "black", tier,
            [
                ("VIP Welcome", "Personal CEO welcome"),
                ("Bespoke Strategy", "Custom strategy development"),
                ("Elite Team", "Hand-picked expert team"),
                ("Unlimited Access", "24/7 direct access to leadership"),
                ("Quarterly Retreats", "In-person strategy retreats"),
            ]
        ))
    
    # ==================== OPERATIONS ====================
    
    operations_issues = [
        ("trainings", "Team Training Program", [
            ("Training Needs Analysis", "Identify skill gaps"),
            ("Curriculum Design", "Design training materials"),
            ("Schedule Sessions", "Book training slots"),
            ("Deliver Training", "Conduct training sessions"),
            ("Assessment", "Test comprehension"),
            ("Certification", "Issue certificates"),
        ]),
        ("sop_creation", "SOP Development Process", [
            ("Process Mapping", "Document current process"),
            ("Gap Analysis", "Identify improvements"),
            ("Draft SOP", "Write initial draft"),
            ("Review Cycle", "Stakeholder review"),
            ("Approval", "Get sign-off"),
            ("Distribution", "Publish and train"),
        ]),
        ("promotions", "Promotion Process", [
            ("Performance Review", "Evaluate performance"),
            ("Nomination", "Manager nomination"),
            ("Committee Review", "Promotion committee"),
            ("Approval", "Executive approval"),
            ("Announcement", "Internal announcement"),
            ("Transition", "Role transition plan"),
        ]),
        ("team_events", "Team Event Planning", [
            ("Event Proposal", "Define event purpose"),
            ("Budget Approval", "Get budget sign-off"),
            ("Venue Selection", "Book location"),
            ("Logistics Planning", "Plan details"),
            ("Invitations", "Send invites"),
            ("Event Execution", "Run the event"),
            ("Follow-up", "Post-event survey"),
        ]),
        ("recruitments", "Recruitment Process", [
            ("Job Requisition", "Create job req"),
            ("Job Posting", "Post on job boards"),
            ("Resume Screening", "Review applications"),
            ("Phone Screen", "Initial interviews"),
            ("Panel Interview", "Team interviews"),
            ("Reference Check", "Verify references"),
            ("Offer", "Extend job offer"),
            ("Onboarding", "New hire onboarding"),
        ]),
        ("acquisitions", "Acquisition Process", [
            ("Target Identification", "Identify acquisition target"),
            ("Due Diligence", "Financial and legal review"),
            ("Valuation", "Determine fair value"),
            ("Negotiation", "Deal negotiation"),
            ("Integration Planning", "Plan integration"),
            ("Close Deal", "Finalize acquisition"),
        ]),
        ("meeting_itineraries", "Meeting Planning", [
            ("Agenda Creation", "Define meeting objectives"),
            ("Attendee List", "Identify participants"),
            ("Schedule", "Book time and room"),
            ("Materials Prep", "Prepare documents"),
            ("Meeting Execution", "Run the meeting"),
            ("Minutes", "Document outcomes"),
            ("Follow-up", "Action item tracking"),
        ]),
        ("yassa_conferences", "Conference Planning", [
            ("Theme Selection", "Define conference theme"),
            ("Venue Booking", "Reserve conference venue"),
            ("Speaker Outreach", "Invite speakers"),
            ("Registration Setup", "Open registration"),
            ("Marketing", "Promote conference"),
            ("Logistics", "Plan all details"),
            ("Execution", "Run conference"),
            ("Post-Event", "Surveys and follow-up"),
        ]),
        ("client_surveys", "Client Survey Process", [
            ("Survey Design", "Create survey questions"),
            ("Distribution", "Send to clients"),
            ("Collection", "Gather responses"),
            ("Analysis", "Analyze results"),
            ("Report", "Create insights report"),
            ("Action Plan", "Define improvements"),
        ]),
        ("it_maintenance", "IT Maintenance Protocol", [
            ("Inventory Audit", "Check all systems"),
            ("Updates Schedule", "Plan updates"),
            ("Backup Verification", "Verify backups"),
            ("Security Patches", "Apply patches"),
            ("Performance Check", "Monitor performance"),
            ("Documentation", "Update IT docs"),
        ]),
        ("customer_service", "Customer Service Protocol", [
            ("Ticket Receipt", "Log customer issue"),
            ("Triage", "Prioritize and assign"),
            ("Investigation", "Research issue"),
            ("Resolution", "Solve problem"),
            ("Follow-up", "Confirm satisfaction"),
            ("Knowledge Base", "Update FAQ if needed"),
        ]),
        ("associate_service", "Internal Support Protocol", [
            ("Request Intake", "Log internal request"),
            ("Assignment", "Route to right team"),
            ("Resolution", "Handle request"),
            ("Feedback", "Gather feedback"),
        ]),
        ("data_storage_security", "Data Security Protocol", [
            ("Access Review", "Audit access permissions"),
            ("Encryption Check", "Verify encryption"),
            ("Backup Test", "Test restore procedures"),
            ("Compliance Audit", "Check compliance"),
            ("Report", "Security report"),
        ]),
    ]
    
    for issue_id, name, steps in operations_issues:
        for tier in ["TIER_1", "TIER_2", "TIER_3"]:
            all_sops.append(create_sop(
                f"{name} ({tier.replace('_', ' ')})",
                f"{name} standard operating procedure",
                "OPERATIONS", issue_id, tier,
                steps
            ))
    
    # ==================== CONSULTATION ====================
    
    consultation_issues = [
        ("finance", "Financial Consultation", [
            ("Financial Audit", "Review current financials"),
            ("Gap Analysis", "Identify opportunities"),
            ("Strategy Development", "Develop recommendations"),
            ("Presentation", "Present to stakeholders"),
            ("Implementation Plan", "Create action plan"),
        ]),
        ("marketing", "Marketing Consultation", [
            ("Market Analysis", "Analyze market position"),
            ("Competitor Research", "Study competitors"),
            ("Strategy Development", "Create marketing strategy"),
            ("Campaign Planning", "Plan campaigns"),
            ("ROI Framework", "Define success metrics"),
        ]),
        ("operations", "Operations Consultation", [
            ("Process Audit", "Map current processes"),
            ("Efficiency Analysis", "Find bottlenecks"),
            ("Recommendations", "Propose improvements"),
            ("Implementation", "Guide implementation"),
            ("Measurement", "Track improvements"),
        ]),
        ("development", "Development Consultation", [
            ("Tech Audit", "Review current stack"),
            ("Architecture Review", "Evaluate architecture"),
            ("Roadmap Planning", "Create tech roadmap"),
            ("Team Assessment", "Evaluate capabilities"),
            ("Implementation Guide", "Provide guidance"),
        ]),
    ]
    
    for issue_id, name, steps in consultation_issues:
        for tier in ["TIER_1", "TIER_2", "TIER_3"]:
            all_sops.append(create_sop(
                f"{name} ({tier.replace('_', ' ')})",
                f"{name} engagement process",
                "CONSULTATION", issue_id, tier,
                steps
            ))
    
    # ==================== CRISIS MANAGEMENT ====================
    
    crisis_issues = [
        ("team_disputes", "Team Dispute Resolution", [
            ("Incident Report", "Document the dispute"),
            ("Mediation Setup", "Arrange mediation"),
            ("Investigation", "Gather facts"),
            ("Resolution Meeting", "Facilitate resolution"),
            ("Follow-up", "Monitor situation"),
            ("Documentation", "Record outcome"),
        ]),
        ("layoffs", "Layoff Management", [
            ("Planning", "Define scope and criteria"),
            ("Legal Review", "Ensure compliance"),
            ("Communication Plan", "Prepare messaging"),
            ("Notification", "Inform affected employees"),
            ("Support Resources", "Provide outplacement"),
            ("Team Support", "Support remaining team"),
        ]),
        ("natural_disasters", "Natural Disaster Response", [
            ("Emergency Alert", "Activate emergency protocols"),
            ("Safety Check", "Account for all personnel"),
            ("Damage Assessment", "Evaluate impact"),
            ("Business Continuity", "Activate backup plans"),
            ("Communication", "Update stakeholders"),
            ("Recovery", "Begin recovery operations"),
        ]),
        ("software_compromise", "Software Outage Response", [
            ("Incident Detection", "Confirm the outage"),
            ("Status Page", "Update status page"),
            ("Escalation", "Page on-call team"),
            ("Diagnosis", "Identify root cause"),
            ("Fix Deployment", "Deploy fix"),
            ("Verification", "Confirm resolution"),
            ("Post-Mortem", "Document lessons"),
        ]),
        ("pandemics", "Pandemic Response Protocol", [
            ("Monitoring", "Track health alerts"),
            ("Policy Activation", "Implement WFH policy"),
            ("Resource Distribution", "Provide supplies"),
            ("Communication", "Regular updates"),
            ("Support", "Employee wellness support"),
            ("Return Planning", "Plan return to office"),
        ]),
        ("data_compromise", "Data Breach Response", [
            ("Immediate Isolation", "Isolate affected systems"),
            ("Incident Team", "Assemble response team"),
            ("Damage Assessment", "Determine scope"),
            ("Legal Notification", "Notify legal/compliance"),
            ("Regulatory Filing", "File required reports"),
            ("Customer Notice", "Notify affected users"),
            ("Remediation", "Fix vulnerabilities"),
            ("Post-Mortem", "Document lessons"),
        ]),
        ("org_compromise", "Organization Security Breach", [
            ("Lockdown", "Secure all access"),
            ("Investigation", "Forensic analysis"),
            ("Containment", "Limit damage"),
            ("Communication", "Stakeholder updates"),
            ("Remediation", "Fix security gaps"),
            ("Review", "Policy review"),
        ]),
        ("customer_complaints", "Public Complaint Management", [
            ("Monitoring", "Track social mentions"),
            ("Assessment", "Evaluate severity"),
            ("Response Drafting", "Prepare response"),
            ("Approval", "Get leadership approval"),
            ("Public Response", "Post response"),
            ("Follow-up", "Monitor sentiment"),
        ]),
        ("ex_team_complaints", "Former Employee Issues", [
            ("Complaint Receipt", "Document complaint"),
            ("Legal Review", "Consult legal"),
            ("Investigation", "Gather facts"),
            ("Response", "Formal response"),
            ("Resolution", "Resolve if possible"),
            ("Documentation", "Record outcome"),
        ]),
        ("opposition_attacks", "Competitive Threat Response", [
            ("Threat Assessment", "Evaluate the attack"),
            ("Legal Review", "Check legal options"),
            ("PR Strategy", "Plan public response"),
            ("Counter-Messaging", "Prepare response"),
            ("Stakeholder Comms", "Update stakeholders"),
            ("Monitoring", "Track impact"),
        ]),
        ("supply_issues", "Supply Chain Disruption", [
            ("Impact Assessment", "Evaluate disruption"),
            ("Alternative Sourcing", "Find alternatives"),
            ("Customer Communication", "Update customers"),
            ("Inventory Management", "Manage stock"),
            ("Recovery Plan", "Plan recovery"),
            ("Supplier Review", "Review supplier relationships"),
        ]),
    ]
    
    for issue_id, name, steps in crisis_issues:
        for tier in ["TIER_1", "TIER_2", "TIER_3"]:
            all_sops.append(create_sop(
                f"{name} ({tier.replace('_', ' ')})",
                f"Emergency {name.lower()} protocol",
                "CRISIS_MANAGEMENT", issue_id, tier,
                steps
            ))
    
    # ==================== APP DEVELOPMENT ====================
    
    app_dev_issues = [
        ("market_research", "Market Research Process", [
            ("Research Planning", "Define research scope"),
            ("Data Collection", "Gather market data"),
            ("Competitor Analysis", "Study competitors"),
            ("User Interviews", "Talk to potential users"),
            ("Synthesis", "Analyze findings"),
            ("Report", "Create research report"),
        ]),
        ("prototype_development", "Prototype Development", [
            ("Requirements", "Define requirements"),
            ("Design", "Create mockups"),
            ("Development", "Build prototype"),
            ("Internal Testing", "Test internally"),
            ("Iteration", "Refine based on feedback"),
            ("Demo Prep", "Prepare for demo"),
        ]),
        ("market_surveys", "Market Survey Process", [
            ("Survey Design", "Create survey"),
            ("Audience Selection", "Define target audience"),
            ("Distribution", "Send surveys"),
            ("Collection", "Gather responses"),
            ("Analysis", "Analyze data"),
            ("Insights Report", "Document insights"),
        ]),
        ("testing", "QA Testing Process", [
            ("Test Planning", "Create test plan"),
            ("Test Case Design", "Write test cases"),
            ("Test Execution", "Run tests"),
            ("Bug Reporting", "Document issues"),
            ("Regression Testing", "Verify fixes"),
            ("Sign-off", "QA approval"),
        ]),
        ("product_manual", "Documentation Process", [
            ("Content Planning", "Outline documentation"),
            ("Writing", "Create content"),
            ("Screenshots", "Add visuals"),
            ("Review", "Technical review"),
            ("Publication", "Publish docs"),
            ("Maintenance", "Keep updated"),
        ]),
        ("transition_to_it", "IT Transition Plan", [
            ("Handoff Planning", "Plan transition"),
            ("Documentation", "Complete all docs"),
            ("Training", "Train IT team"),
            ("Access Transfer", "Transfer credentials"),
            ("Support Period", "Provide support"),
            ("Sign-off", "Complete handoff"),
        ]),
        ("product_storage", "Product Data Management", [
            ("Storage Setup", "Configure storage"),
            ("Backup Strategy", "Define backups"),
            ("Access Control", "Set permissions"),
            ("Monitoring", "Set up monitoring"),
            ("Documentation", "Document procedures"),
        ]),
        ("product_security", "Product Security Implementation", [
            ("Security Audit", "Assess current state"),
            ("Threat Modeling", "Identify threats"),
            ("Security Design", "Design security"),
            ("Implementation", "Implement controls"),
            ("Penetration Testing", "Test security"),
            ("Compliance Check", "Verify compliance"),
        ]),
    ]
    
    for issue_id, name, steps in app_dev_issues:
        for tier in ["TIER_1", "TIER_2", "TIER_3"]:
            all_sops.append(create_sop(
                f"{name} ({tier.replace('_', ' ')})",
                f"{name} standard procedure",
                "APP_DEVELOPMENT", issue_id, tier,
                steps
            ))
    
    # Insert all SOPs
    for sop in all_sops:
        await db.builder_sops.insert_one(sop)
        results["sops"] += 1
    
    # ==================== TEMPLATES ====================
    
    templates = [
        # Client Services Templates
        {"name": "Client Welcome Packet", "description": "Welcome materials for new clients", "template_type": "document"},
        {"name": "Service Agreement Template", "description": "Standard service agreement", "template_type": "document"},
        {"name": "Onboarding Checklist", "description": "Client onboarding checklist", "template_type": "spreadsheet"},
        {"name": "Client Portal Guide", "description": "Portal user guide", "template_type": "document"},
        {"name": "Success Plan Template", "description": "90-day success plan", "template_type": "document"},
        
        # Operations Templates
        {"name": "Job Description Template", "description": "Standard job posting format", "template_type": "document"},
        {"name": "Interview Scorecard", "description": "Candidate evaluation form", "template_type": "spreadsheet"},
        {"name": "Training Materials Template", "description": "Training presentation template", "template_type": "presentation"},
        {"name": "SOP Template", "description": "Standard SOP format", "template_type": "document"},
        {"name": "Meeting Agenda Template", "description": "Meeting agenda format", "template_type": "document"},
        {"name": "Event Planning Checklist", "description": "Event planning checklist", "template_type": "spreadsheet"},
        {"name": "Performance Review Form", "description": "Employee evaluation form", "template_type": "document"},
        
        # Consultation Templates
        {"name": "Strategy Presentation", "description": "Consulting engagement deliverable", "template_type": "presentation"},
        {"name": "Financial Analysis Report", "description": "Financial analysis template", "template_type": "spreadsheet"},
        {"name": "Market Analysis Report", "description": "Market research template", "template_type": "document"},
        {"name": "Recommendation Report", "description": "Consultation recommendations", "template_type": "document"},
        
        # Crisis Management Templates
        {"name": "Incident Report Form", "description": "Security incident documentation", "template_type": "document"},
        {"name": "Crisis Communication Template", "description": "Customer notification template", "template_type": "document"},
        {"name": "Emergency Contact List", "description": "Key contacts for emergencies", "template_type": "spreadsheet"},
        {"name": "Business Continuity Plan", "description": "BCP template", "template_type": "document"},
        {"name": "Post-Mortem Template", "description": "Incident review template", "template_type": "document"},
        
        # App Development Templates
        {"name": "PRD Template", "description": "Product requirements document", "template_type": "document"},
        {"name": "Technical Spec Template", "description": "Technical specification", "template_type": "document"},
        {"name": "Test Plan Template", "description": "QA test plan format", "template_type": "document"},
        {"name": "Release Notes Template", "description": "Product release notes", "template_type": "document"},
        {"name": "User Guide Template", "description": "Product documentation", "template_type": "document"},
    ]
    
    # Link templates to relevant SOPs
    sop_ids_by_category = {}
    for sop in all_sops:
        cat = sop["issue_category"]
        if cat not in sop_ids_by_category:
            sop_ids_by_category[cat] = []
        sop_ids_by_category[cat].append(sop["id"])
    
    template_category_map = {
        "Client Welcome Packet": "CLIENT_SERVICES",
        "Service Agreement Template": "CLIENT_SERVICES",
        "Onboarding Checklist": "CLIENT_SERVICES",
        "Client Portal Guide": "CLIENT_SERVICES",
        "Success Plan Template": "CLIENT_SERVICES",
        "Job Description Template": "OPERATIONS",
        "Interview Scorecard": "OPERATIONS",
        "Training Materials Template": "OPERATIONS",
        "SOP Template": "OPERATIONS",
        "Meeting Agenda Template": "OPERATIONS",
        "Event Planning Checklist": "OPERATIONS",
        "Performance Review Form": "OPERATIONS",
        "Strategy Presentation": "CONSULTATION",
        "Financial Analysis Report": "CONSULTATION",
        "Market Analysis Report": "CONSULTATION",
        "Recommendation Report": "CONSULTATION",
        "Incident Report Form": "CRISIS_MANAGEMENT",
        "Crisis Communication Template": "CRISIS_MANAGEMENT",
        "Emergency Contact List": "CRISIS_MANAGEMENT",
        "Business Continuity Plan": "CRISIS_MANAGEMENT",
        "Post-Mortem Template": "CRISIS_MANAGEMENT",
        "PRD Template": "APP_DEVELOPMENT",
        "Technical Spec Template": "APP_DEVELOPMENT",
        "Test Plan Template": "APP_DEVELOPMENT",
        "Release Notes Template": "APP_DEVELOPMENT",
        "User Guide Template": "APP_DEVELOPMENT",
    }
    
    for template in templates:
        cat = template_category_map.get(template["name"], "CLIENT_SERVICES")
        linked_sops = sop_ids_by_category.get(cat, [])[:5]  # Link to first 5 SOPs in category
        
        template_doc = {
            "id": str(uuid.uuid4()),
            "name": template["name"],
            "description": template["description"],
            "template_type": template["template_type"],
            "file_url": None,
            "linked_sop_ids": linked_sops,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.builder_templates.insert_one(template_doc)
        results["templates"] += 1
    
    # ==================== CONTRACTS ====================
    
    contracts = [
        # Client Services Contracts
        {"name": "Bronze Service Agreement", "type": "PROJECT", "desc": "Bronze package contract", "kpis": ["Response Time < 48h", "Monthly Report"]},
        {"name": "Silver Service Agreement", "type": "PROJECT", "desc": "Silver package contract", "kpis": ["Response Time < 24h", "Bi-weekly Report", "Quarterly Review"]},
        {"name": "Gold Service Agreement", "type": "PROJECT", "desc": "Gold package contract", "kpis": ["Response Time < 12h", "Weekly Report", "Monthly Review", "Dedicated Support"]},
        {"name": "Platinum Service Agreement", "type": "PROJECT", "desc": "Platinum package contract", "kpis": ["Response Time < 4h", "Daily Check-in", "Weekly Review", "24/7 Support"]},
        {"name": "Black VIP Agreement", "type": "PROJECT", "desc": "Black VIP contract", "kpis": ["Immediate Response", "Unlimited Access", "Executive Sponsor"]},
        
        # Recurring Contracts
        {"name": "Monthly Retainer", "type": "RECURRING", "desc": "Monthly service retainer", "kpis": ["Hours Delivered", "Client Satisfaction > 90%"]},
        {"name": "Annual Support Contract", "type": "RECURRING", "desc": "Annual support agreement", "kpis": ["Uptime > 99.5%", "Ticket Resolution < 24h"]},
        {"name": "Maintenance Agreement", "type": "RECURRING", "desc": "Ongoing maintenance contract", "kpis": ["Systems Updated", "Security Patches Applied"]},
        
        # Operations Contracts
        {"name": "Employment Contract", "type": "RECURRING", "desc": "Standard employment agreement", "kpis": ["Performance Reviews", "Goal Achievement"]},
        {"name": "Contractor Agreement", "type": "PROJECT", "desc": "Independent contractor contract", "kpis": ["Deliverables Met", "Timeline Adherence"]},
        {"name": "NDA Template", "type": "PROJECT", "desc": "Non-disclosure agreement", "kpis": ["Confidentiality Maintained"]},
        
        # Consultation Contracts
        {"name": "Consulting Engagement", "type": "PROJECT", "desc": "Project-based consulting contract", "kpis": ["Recommendations Delivered", "Client Satisfaction"]},
        {"name": "Advisory Retainer", "type": "RECURRING", "desc": "Ongoing advisory services", "kpis": ["Hours Available", "Response Time"]},
    ]
    
    for contract in contracts:
        contract_doc = {
            "id": str(uuid.uuid4()),
            "name": contract["name"],
            "description": contract["desc"],
            "contract_type": contract["type"],
            "linked_sop_ids": list(sop_ids_by_category.get("CLIENT_SERVICES", []))[:3],
            "deliverables": ["Service Delivery", "Documentation", "Support"],
            "kpis": [{"name": kpi, "target": "As defined"} for kpi in contract["kpis"]],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.builder_contracts.insert_one(contract_doc)
        results["contracts"] += 1
    
    client.close()
    return results


if __name__ == "__main__":
    results = asyncio.run(seed_comprehensive_data())
    print(f"Seeded: {results}")
    print(f"Total: {sum(results.values())} items")
