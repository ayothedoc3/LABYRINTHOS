"""
Labyrinth Builder - Comprehensive Seed Data
Seeds SOPs, Templates, and Contracts for all major Issue + Tier combinations
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


async def seed_builder_data():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    results = {"sops": 0, "templates": 0, "contracts": 0}
    
    # ==================== CLIENT SERVICES ====================
    
    # Bronze Package
    bronze_sops = [
        {
            "id": str(uuid.uuid4()),
            "name": "Basic Client Intake",
            "description": "Standard intake process for bronze clients",
            "issue_category": "CLIENT_SERVICES",
            "issue_type_id": "bronze",
            "tier": "TIER_3",
            "steps": [
                {"step": 1, "title": "Initial Contact", "description": "Receive client inquiry"},
                {"step": 2, "title": "Basic Assessment", "description": "Evaluate client needs"},
                {"step": 3, "title": "Package Selection", "description": "Confirm bronze package"},
            ],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Bronze Onboarding",
            "description": "Simple onboarding for bronze tier",
            "issue_category": "CLIENT_SERVICES",
            "issue_type_id": "bronze",
            "tier": "TIER_3",
            "steps": [
                {"step": 1, "title": "Welcome Email", "description": "Send automated welcome"},
                {"step": 2, "title": "Portal Access", "description": "Create basic portal account"},
            ],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
    ]
    
    # Silver Package
    silver_sops = [
        {
            "id": str(uuid.uuid4()),
            "name": "Silver Client Discovery",
            "description": "Discovery process for silver clients",
            "issue_category": "CLIENT_SERVICES",
            "issue_type_id": "silver",
            "tier": "TIER_2",
            "steps": [
                {"step": 1, "title": "Discovery Call", "description": "30-min discovery call"},
                {"step": 2, "title": "Needs Assessment", "description": "Document client needs"},
                {"step": 3, "title": "Proposal Draft", "description": "Create service proposal"},
            ],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Silver Implementation",
            "description": "Standard implementation process",
            "issue_category": "CLIENT_SERVICES",
            "issue_type_id": "silver",
            "tier": "TIER_2",
            "steps": [
                {"step": 1, "title": "Kickoff Meeting", "description": "Project kickoff"},
                {"step": 2, "title": "Setup Phase", "description": "Configure services"},
                {"step": 3, "title": "Training", "description": "Basic user training"},
                {"step": 4, "title": "Go-Live", "description": "Launch services"},
            ],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
    ]
    
    # Gold Package - Tier 1
    gold_tier1_sops = [
        {
            "id": str(uuid.uuid4()),
            "name": "Premium Client Onboarding",
            "description": "Full-service VIP onboarding for gold clients",
            "issue_category": "CLIENT_SERVICES",
            "issue_type_id": "gold",
            "tier": "TIER_1",
            "steps": [
                {"step": 1, "title": "Executive Welcome Call", "description": "C-level welcome call"},
                {"step": 2, "title": "Dedicated Team Assignment", "description": "Assign senior team"},
                {"step": 3, "title": "Strategy Deep Dive", "description": "90-min strategy session"},
                {"step": 4, "title": "Custom Portal Setup", "description": "Configure branded portal"},
                {"step": 5, "title": "VIP Training", "description": "Personalized training"},
            ],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Gold Account Management",
            "description": "Ongoing premium account management",
            "issue_category": "CLIENT_SERVICES",
            "issue_type_id": "gold",
            "tier": "TIER_1",
            "steps": [
                {"step": 1, "title": "Weekly Check-in", "description": "Weekly status call"},
                {"step": 2, "title": "Monthly Review", "description": "Performance review"},
                {"step": 3, "title": "Quarterly Planning", "description": "Strategic planning"},
            ],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
    ]
    
    # Gold Package - Tier 2
    gold_tier2_sops = [
        {
            "id": str(uuid.uuid4()),
            "name": "Standard Gold Onboarding",
            "description": "Standard onboarding for gold clients",
            "issue_category": "CLIENT_SERVICES",
            "issue_type_id": "gold",
            "tier": "TIER_2",
            "steps": [
                {"step": 1, "title": "Welcome Call", "description": "Manager welcome call"},
                {"step": 2, "title": "Team Assignment", "description": "Assign account team"},
                {"step": 3, "title": "Strategy Session", "description": "60-min strategy session"},
                {"step": 4, "title": "Portal Setup", "description": "Configure portal access"},
            ],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
    ]
    
    # Platinum Package
    platinum_sops = [
        {
            "id": str(uuid.uuid4()),
            "name": "Platinum White Glove Onboarding",
            "description": "White glove service for platinum clients",
            "issue_category": "CLIENT_SERVICES",
            "issue_type_id": "platinum",
            "tier": "TIER_1",
            "steps": [
                {"step": 1, "title": "Executive Dinner", "description": "In-person executive meeting"},
                {"step": 2, "title": "Custom Strategy", "description": "Full-day strategy workshop"},
                {"step": 3, "title": "Dedicated Team", "description": "Assign dedicated team of 3+"},
                {"step": 4, "title": "Custom Development", "description": "Build custom solutions"},
                {"step": 5, "title": "24/7 Support Setup", "description": "Configure priority support"},
            ],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
    ]
    
    # ==================== OPERATIONS ====================
    
    # Recruitment
    recruitment_tier2_sops = [
        {
            "id": str(uuid.uuid4()),
            "name": "Standard Recruitment Process",
            "description": "Standard hiring workflow",
            "issue_category": "OPERATIONS",
            "issue_type_id": "recruitment",
            "tier": "TIER_2",
            "steps": [
                {"step": 1, "title": "Job Requisition", "description": "Create job req"},
                {"step": 2, "title": "Post Position", "description": "Post on job boards"},
                {"step": 3, "title": "Screen Applicants", "description": "Review resumes"},
                {"step": 4, "title": "Phone Screen", "description": "Initial phone interview"},
                {"step": 5, "title": "Panel Interview", "description": "Team interview"},
                {"step": 6, "title": "Reference Check", "description": "Verify references"},
                {"step": 7, "title": "Offer", "description": "Extend offer"},
            ],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
    ]
    
    recruitment_tier1_sops = [
        {
            "id": str(uuid.uuid4()),
            "name": "Executive Recruitment Process",
            "description": "Premium hiring for senior roles",
            "issue_category": "OPERATIONS",
            "issue_type_id": "recruitment",
            "tier": "TIER_1",
            "steps": [
                {"step": 1, "title": "Executive Search", "description": "Engage headhunter"},
                {"step": 2, "title": "Candidate Sourcing", "description": "Source top talent"},
                {"step": 3, "title": "Executive Screening", "description": "C-suite interviews"},
                {"step": 4, "title": "Culture Assessment", "description": "Leadership assessment"},
                {"step": 5, "title": "Board Approval", "description": "Board sign-off"},
                {"step": 6, "title": "Executive Offer", "description": "Negotiate package"},
            ],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
    ]
    
    # Training
    training_sops = [
        {
            "id": str(uuid.uuid4()),
            "name": "Team Training Program",
            "description": "Standard team training workflow",
            "issue_category": "OPERATIONS",
            "issue_type_id": "trainings",
            "tier": "TIER_2",
            "steps": [
                {"step": 1, "title": "Training Needs Analysis", "description": "Identify gaps"},
                {"step": 2, "title": "Curriculum Design", "description": "Design training"},
                {"step": 3, "title": "Schedule Sessions", "description": "Book training slots"},
                {"step": 4, "title": "Deliver Training", "description": "Conduct sessions"},
                {"step": 5, "title": "Assessment", "description": "Test comprehension"},
            ],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
    ]
    
    # ==================== CRISIS MANAGEMENT ====================
    
    # Data Compromise
    data_breach_tier1_sops = [
        {
            "id": str(uuid.uuid4()),
            "name": "Data Breach Response Protocol",
            "description": "Emergency response for data breaches",
            "issue_category": "CRISIS_MANAGEMENT",
            "issue_type_id": "data_compromise",
            "tier": "TIER_1",
            "steps": [
                {"step": 1, "title": "Immediate Isolation", "description": "Isolate affected systems"},
                {"step": 2, "title": "Incident Team Assembly", "description": "Activate crisis team"},
                {"step": 3, "title": "Damage Assessment", "description": "Assess breach scope"},
                {"step": 4, "title": "Legal Notification", "description": "Notify legal team"},
                {"step": 5, "title": "Regulatory Reporting", "description": "File required reports"},
                {"step": 6, "title": "Customer Communication", "description": "Notify affected users"},
                {"step": 7, "title": "Remediation", "description": "Patch vulnerabilities"},
                {"step": 8, "title": "Post-Mortem", "description": "Document lessons learned"},
            ],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
    ]
    
    # Software Compromise
    software_compromise_sops = [
        {
            "id": str(uuid.uuid4()),
            "name": "System Outage Response",
            "description": "Response protocol for system failures",
            "issue_category": "CRISIS_MANAGEMENT",
            "issue_type_id": "software_compromise",
            "tier": "TIER_1",
            "steps": [
                {"step": 1, "title": "Incident Detection", "description": "Confirm outage"},
                {"step": 2, "title": "Status Page Update", "description": "Update status page"},
                {"step": 3, "title": "Engineering Escalation", "description": "Page on-call team"},
                {"step": 4, "title": "Diagnosis", "description": "Identify root cause"},
                {"step": 5, "title": "Fix Deployment", "description": "Deploy fix"},
                {"step": 6, "title": "Verification", "description": "Verify resolution"},
                {"step": 7, "title": "Communication", "description": "All-clear notification"},
            ],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
    ]
    
    # ==================== CONSULTATION ====================
    
    marketing_consultation_sops = [
        {
            "id": str(uuid.uuid4()),
            "name": "Marketing Strategy Consultation",
            "description": "Full marketing strategy engagement",
            "issue_category": "CONSULTATION",
            "issue_type_id": "marketing_consultation",
            "tier": "TIER_1",
            "steps": [
                {"step": 1, "title": "Discovery Workshop", "description": "Full-day discovery"},
                {"step": 2, "title": "Market Analysis", "description": "Competitive analysis"},
                {"step": 3, "title": "Strategy Development", "description": "Develop strategy"},
                {"step": 4, "title": "Presentation", "description": "Present recommendations"},
                {"step": 5, "title": "Implementation Plan", "description": "Create action plan"},
            ],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
    ]
    
    finance_consultation_sops = [
        {
            "id": str(uuid.uuid4()),
            "name": "Financial Advisory Consultation",
            "description": "Financial planning and advisory",
            "issue_category": "CONSULTATION",
            "issue_type_id": "finance_consultation",
            "tier": "TIER_1",
            "steps": [
                {"step": 1, "title": "Financial Audit", "description": "Review financials"},
                {"step": 2, "title": "Gap Analysis", "description": "Identify opportunities"},
                {"step": 3, "title": "Recommendations", "description": "Develop recommendations"},
                {"step": 4, "title": "Board Presentation", "description": "Present to board"},
            ],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
    ]
    
    # Combine all SOPs
    all_sops = (
        bronze_sops + silver_sops + gold_tier1_sops + gold_tier2_sops + 
        platinum_sops + recruitment_tier2_sops + recruitment_tier1_sops +
        training_sops + data_breach_tier1_sops + software_compromise_sops +
        marketing_consultation_sops + finance_consultation_sops
    )
    
    # Insert SOPs
    for sop in all_sops:
        existing = await db.builder_sops.find_one({"name": sop["name"]})
        if not existing:
            await db.builder_sops.insert_one(sop)
            results["sops"] += 1
    
    # ==================== TEMPLATES ====================
    
    templates = [
        # Client Services Templates
        {
            "id": str(uuid.uuid4()),
            "name": "Client Welcome Packet",
            "description": "Welcome materials for new clients",
            "template_type": "document",
            "linked_sop_ids": [gold_tier1_sops[0]["id"], gold_tier2_sops[0]["id"], platinum_sops[0]["id"]],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Service Agreement Template",
            "description": "Standard service agreement",
            "template_type": "document",
            "linked_sop_ids": [sop["id"] for sop in gold_tier1_sops + gold_tier2_sops + platinum_sops],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Onboarding Checklist",
            "description": "Client onboarding checklist",
            "template_type": "spreadsheet",
            "linked_sop_ids": [gold_tier1_sops[0]["id"], silver_sops[1]["id"]],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        # Operations Templates
        {
            "id": str(uuid.uuid4()),
            "name": "Job Description Template",
            "description": "Standard job posting format",
            "template_type": "document",
            "linked_sop_ids": [recruitment_tier2_sops[0]["id"], recruitment_tier1_sops[0]["id"]],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Interview Scorecard",
            "description": "Candidate evaluation form",
            "template_type": "spreadsheet",
            "linked_sop_ids": [recruitment_tier2_sops[0]["id"], recruitment_tier1_sops[0]["id"]],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Training Materials Template",
            "description": "Training presentation template",
            "template_type": "presentation",
            "linked_sop_ids": [training_sops[0]["id"]],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        # Crisis Management Templates
        {
            "id": str(uuid.uuid4()),
            "name": "Incident Report Form",
            "description": "Security incident documentation",
            "template_type": "document",
            "linked_sop_ids": [data_breach_tier1_sops[0]["id"], software_compromise_sops[0]["id"]],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Crisis Communication Template",
            "description": "Customer notification template",
            "template_type": "document",
            "linked_sop_ids": [data_breach_tier1_sops[0]["id"]],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        # Consultation Templates
        {
            "id": str(uuid.uuid4()),
            "name": "Strategy Presentation Template",
            "description": "Consulting engagement deliverable",
            "template_type": "presentation",
            "linked_sop_ids": [marketing_consultation_sops[0]["id"], finance_consultation_sops[0]["id"]],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
    ]
    
    for template in templates:
        existing = await db.builder_templates.find_one({"name": template["name"]})
        if not existing:
            await db.builder_templates.insert_one(template)
            results["templates"] += 1
    
    # ==================== CONTRACTS ====================
    
    contracts = [
        # Client Services Contracts
        {
            "id": str(uuid.uuid4()),
            "name": "Gold Service Agreement",
            "description": "Gold package service contract",
            "contract_type": "PROJECT",
            "linked_sop_ids": [sop["id"] for sop in gold_tier1_sops + gold_tier2_sops],
            "deliverables": ["Client Portal Access", "Dedicated Account Manager", "Monthly Reports", "Quarterly Reviews"],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Platinum Service Agreement",
            "description": "Platinum package service contract",
            "contract_type": "PROJECT",
            "linked_sop_ids": [sop["id"] for sop in platinum_sops],
            "deliverables": ["24/7 Support", "Dedicated Team", "Custom Development", "Executive Access"],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Silver Retainer Agreement",
            "description": "Monthly silver package retainer",
            "contract_type": "RECURRING",
            "linked_sop_ids": [sop["id"] for sop in silver_sops],
            "deliverables": ["Monthly Support Hours", "Quarterly Check-ins"],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        # Operations Contracts
        {
            "id": str(uuid.uuid4()),
            "name": "Employment Contract",
            "description": "Standard employment agreement",
            "contract_type": "RECURRING",
            "linked_sop_ids": [recruitment_tier2_sops[0]["id"], recruitment_tier1_sops[0]["id"]],
            "deliverables": ["Offer Letter", "NDA", "Employee Handbook", "Benefits Package"],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Executive Employment Contract",
            "description": "Executive-level employment agreement",
            "contract_type": "RECURRING",
            "linked_sop_ids": [recruitment_tier1_sops[0]["id"]],
            "deliverables": ["Executive Offer", "Stock Options", "Signing Bonus", "Severance Terms"],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        # Consultation Contracts
        {
            "id": str(uuid.uuid4()),
            "name": "Consulting Engagement Agreement",
            "description": "Project-based consulting contract",
            "contract_type": "PROJECT",
            "linked_sop_ids": [marketing_consultation_sops[0]["id"], finance_consultation_sops[0]["id"]],
            "deliverables": ["Discovery Report", "Strategy Document", "Implementation Roadmap"],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
    ]
    
    for contract in contracts:
        existing = await db.builder_contracts.find_one({"name": contract["name"]})
        if not existing:
            await db.builder_contracts.insert_one(contract)
            results["contracts"] += 1
    
    client.close()
    return results


if __name__ == "__main__":
    results = asyncio.run(seed_builder_data())
    print(f"Seeded: {results}")
