"""
Unified Seeding Script for Labyrinth OS
Consolidates all demo data generation into a single module.
"""

from datetime import datetime, timezone, timedelta
from typing import Optional, List
import uuid
import random

# Import models from all modules
from sales_crm_models import Lead, LeadStage, LeadSource, LeadPriority, Proposal, ProposalStatus, ContactInfo
from affiliate_crm_models import Affiliate, AffiliateStatus, AffiliateTier, Referral, ReferralStatus, Commission, CommissionStatus
from communication_models import Thread, Message, Participant, ThreadType, ThreadStatus, MessageType, ParticipantRole
from external_api_models import Deal, DealStage, ExternalLead, LeadStatus, LeadTier, Task, TaskStatus, Partner
from playbook_engine_models import (
    ExecutionPlan, ExecutionMilestone, ExecutionTask, ExecutionRole, ExecutionContract, CommunicationChannel,
    MilestoneStatus, ExecutionPhase
)


def generate_id(prefix: str = "") -> str:
    """Generate a unique ID with optional prefix"""
    return f"{prefix}_{uuid.uuid4().hex[:12]}" if prefix else uuid.uuid4().hex[:12]


# ============================================================================
# SALES CRM SEEDING
# ============================================================================

def seed_sales_crm(leads_db: dict, proposals_db: dict) -> dict:
    """Seed Sales CRM with demo leads and proposals"""
    leads_db.clear()
    proposals_db.clear()
    
    demo_leads = [
        {"name": "Sarah Chen", "email": "sarah.chen@techcorp.com", "company": "TechCorp Industries", "source": LeadSource.WEBSITE, "stage": LeadStage.QUALIFIED, "value": 75000},
        {"name": "Michael Rodriguez", "email": "m.rodriguez@innovate.io", "company": "Innovate.io", "source": LeadSource.REFERRAL, "stage": LeadStage.PROPOSAL_SENT, "value": 120000},
        {"name": "Emily Watson", "email": "ewatson@globalfinance.com", "company": "Global Finance Ltd", "source": LeadSource.SOCIAL_MEDIA, "stage": LeadStage.NEGOTIATION, "value": 200000},
        {"name": "David Kim", "email": "david.kim@startupventures.co", "company": "Startup Ventures", "source": LeadSource.EVENT, "stage": LeadStage.NEW, "value": 45000},
        {"name": "Lisa Thompson", "email": "lisa.t@enterprise.com", "company": "Enterprise Solutions", "source": LeadSource.COLD_OUTREACH, "stage": LeadStage.CONTACTED, "value": 90000},
        {"name": "James Wilson", "email": "jwilson@mediahub.net", "company": "MediaHub Networks", "source": LeadSource.WEBSITE, "stage": LeadStage.WON, "value": 150000},
        {"name": "Amanda Foster", "email": "a.foster@retail.com", "company": "RetailMax Inc", "source": LeadSource.REFERRAL, "stage": LeadStage.LOST, "value": 80000},
        {"name": "Robert Chang", "email": "rchang@manufacturing.co", "company": "Chang Manufacturing", "source": LeadSource.PARTNER, "stage": LeadStage.QUALIFIED, "value": 250000},
    ]
    
    for i, lead_data in enumerate(demo_leads):
        lead_id = f"lead_{uuid.uuid4().hex[:8]}"
        contact = ContactInfo(
            email=lead_data["email"],
            phone=f"+1-555-{random.randint(100, 999)}-{random.randint(1000, 9999)}",
            company=lead_data["company"]
        )
        lead = Lead(
            id=lead_id,
            name=lead_data["name"],
            contact=contact,
            source=lead_data["source"],
            stage=lead_data["stage"],
            priority=random.choice(list(LeadPriority)),
            estimated_value=lead_data["value"],
            notes=f"Initial contact made via {lead_data['source'].value}",
            assigned_to=random.choice(["user_001", "user_002", "user_003"]),
            created_at=datetime.now(timezone.utc) - timedelta(days=random.randint(1, 30)),
            last_contacted=datetime.now(timezone.utc) - timedelta(days=random.randint(0, 7))
        )
        leads_db[lead_id] = lead
    
    # Create proposals for leads in PROPOSAL, NEGOTIATION, WON, LOST stages
    proposal_statuses = {
        LeadStage.PROPOSAL_SENT: ProposalStatus.SENT,
        LeadStage.NEGOTIATION: ProposalStatus.VIEWED,
        LeadStage.WON: ProposalStatus.ACCEPTED,
        LeadStage.LOST: ProposalStatus.REJECTED
    }
    
    for lead_id, lead in leads_db.items():
        if lead.stage in proposal_statuses:
            proposal_id = f"prop_{uuid.uuid4().hex[:8]}"
            proposal = Proposal(
                id=proposal_id,
                lead_id=lead_id,
                title=f"{lead.contact.company or 'Client'} - Service Proposal",
                description=f"Comprehensive service proposal for {lead.contact.company or 'client'}",
                total_value=lead.estimated_value or 0,
                status=proposal_statuses[lead.stage],
                valid_until=datetime.now(timezone.utc) + timedelta(days=30),
                created_at=datetime.now(timezone.utc) - timedelta(days=random.randint(1, 14)),
                created_by=lead.assigned_to or "system"
            )
            proposals_db[proposal_id] = proposal
    
    return {
        "leads_created": len(leads_db),
        "proposals_created": len(proposals_db)
    }


# ============================================================================
# AFFILIATE CRM SEEDING
# ============================================================================

def seed_affiliate_crm(affiliates_db: dict, referrals_db: dict, commissions_db: dict) -> dict:
    """Seed Affiliate CRM with demo data"""
    affiliates_db.clear()
    referrals_db.clear()
    commissions_db.clear()
    
    demo_affiliates = [
        {"name": "Partner Plus Agency", "contact": "John Smith", "email": "john@partnerplus.com", "tier": AffiliateTier.GOLD, "rate": 15.0},
        {"name": "Digital Growth Co", "contact": "Maria Garcia", "email": "maria@digitalgrowth.io", "tier": AffiliateTier.SILVER, "rate": 10.0},
        {"name": "Business Connectors", "contact": "Alex Johnson", "email": "alex@bizconnect.com", "tier": AffiliateTier.PLATINUM, "rate": 20.0},
        {"name": "Referral Network Inc", "contact": "Sam Lee", "email": "sam@refnet.com", "tier": AffiliateTier.BRONZE, "rate": 5.0},
        {"name": "Strategic Partners LLC", "contact": "Chris Brown", "email": "chris@stratpartners.com", "tier": AffiliateTier.GOLD, "rate": 15.0},
    ]
    
    for aff_data in demo_affiliates:
        aff_id = f"aff_{uuid.uuid4().hex[:8]}"
        affiliate = Affiliate(
            id=aff_id,
            name=aff_data["name"],
            contact_name=aff_data["contact"],
            email=aff_data["email"],
            phone=f"+1-555-{random.randint(100, 999)}-{random.randint(1000, 9999)}",
            tier=aff_data["tier"],
            commission_rate=aff_data["rate"],
            status=AffiliateStatus.ACTIVE,
            total_referrals=random.randint(5, 50),
            successful_referrals=random.randint(2, 20),
            total_commission=random.uniform(5000, 50000),
            created_at=datetime.now(timezone.utc) - timedelta(days=random.randint(30, 365))
        )
        affiliates_db[aff_id] = affiliate
        
        # Create referrals for each affiliate
        for _ in range(random.randint(2, 5)):
            ref_id = f"ref_{uuid.uuid4().hex[:8]}"
            ref_status = random.choice(list(ReferralStatus))
            referral = Referral(
                id=ref_id,
                affiliate_id=aff_id,
                referred_name=f"Contact_{uuid.uuid4().hex[:4]}",
                referred_email=f"contact_{uuid.uuid4().hex[:4]}@example.com",
                referred_company=f"Company_{uuid.uuid4().hex[:4]}",
                status=ref_status,
                deal_value=random.uniform(10000, 100000) if ref_status == ReferralStatus.CONVERTED else None,
                notes="Referral through partner network",
                created_at=datetime.now(timezone.utc) - timedelta(days=random.randint(1, 60))
            )
            referrals_db[ref_id] = referral
            
            # Create commission if converted
            if ref_status == ReferralStatus.CONVERTED and referral.deal_value:
                comm_id = f"comm_{uuid.uuid4().hex[:8]}"
                commission = Commission(
                    id=comm_id,
                    affiliate_id=aff_id,
                    referral_id=ref_id,
                    amount=referral.deal_value * (aff_data["rate"] / 100),
                    status=random.choice([CommissionStatus.PENDING, CommissionStatus.APPROVED, CommissionStatus.PAID]),
                    created_at=datetime.now(timezone.utc) - timedelta(days=random.randint(1, 30))
                )
                commissions_db[comm_id] = commission
    
    return {
        "affiliates_created": len(affiliates_db),
        "referrals_created": len(referrals_db),
        "commissions_created": len(commissions_db)
    }


# ============================================================================
# COMMUNICATION SEEDING
# ============================================================================

def seed_communications(threads_db: dict, messages_db: dict) -> dict:
    """Seed Communications with demo threads and messages"""
    threads_db.clear()
    messages_db.clear()
    
    demo_threads = [
        {"title": "Project Alpha Kickoff", "type": ThreadType.CONTRACT, "related": "contract_001"},
        {"title": "Q4 Strategy Discussion", "type": ThreadType.INTERNAL, "related": None},
        {"title": "Client Support - TechCorp", "type": ThreadType.SUPPORT, "related": "ticket_001"},
        {"title": "Sales Pipeline Review", "type": ThreadType.INTERNAL, "related": None},
        {"title": "Gold Package Implementation", "type": ThreadType.CONTRACT, "related": "contract_002"},
    ]
    
    participants = [
        Participant(user_id="user_001", name="Alice Manager", role=ParticipantRole.OWNER),
        Participant(user_id="user_002", name="Bob Developer", role=ParticipantRole.MEMBER),
        Participant(user_id="user_003", name="Carol Sales", role=ParticipantRole.MEMBER),
    ]
    
    for thread_data in demo_threads:
        thread_id = f"thread_{uuid.uuid4().hex[:8]}"
        thread = Thread(
            id=thread_id,
            title=thread_data["title"],
            thread_type=thread_data["type"],
            related_id=thread_data["related"],
            status=ThreadStatus.OPEN,
            participants=participants[:random.randint(2, 3)],
            message_count=random.randint(3, 10),
            created_by="user_001",
            created_at=datetime.now(timezone.utc) - timedelta(days=random.randint(1, 30)),
            tags=["demo", thread_data["type"].value.lower()]
        )
        threads_db[thread_id] = thread
        
        # Create messages for thread
        messages = []
        for i in range(thread.message_count):
            msg = Message(
                id=f"msg_{uuid.uuid4().hex[:8]}",
                thread_id=thread_id,
                sender_id=random.choice(["user_001", "user_002", "user_003"]),
                sender_name=random.choice(["Alice Manager", "Bob Developer", "Carol Sales"]),
                content=f"This is message {i+1} in the {thread_data['title']} thread.",
                message_type=MessageType.TEXT if i > 0 else MessageType.SYSTEM,
                created_at=datetime.now(timezone.utc) - timedelta(hours=random.randint(1, 72))
            )
            messages.append(msg)
        messages_db[thread_id] = messages
    
    return {
        "threads_created": len(threads_db),
        "messages_created": sum(len(m) for m in messages_db.values())
    }


# ============================================================================
# EXTERNAL API SEEDING
# ============================================================================

def seed_external_api(deals_db: dict, external_leads_db: dict, tasks_db: dict, partners_db: dict) -> dict:
    """Seed External API data (for 3rd party CRM integration)"""
    deals_db.clear()
    external_leads_db.clear()
    tasks_db.clear()
    partners_db.clear()
    
    # Create partners
    demo_partners = [
        {"name": "CRM Partner Inc", "email": "contact@crmpartner.com"},
        {"name": "Sales Force Pro", "email": "info@salesforcepro.com"},
    ]
    
    for p_data in demo_partners:
        p_id = f"partner_{uuid.uuid4().hex[:8]}"
        partner = Partner(
            id=p_id,
            name=p_data["name"],
            email=p_data["email"],
            company=p_data["name"],
            commission_rate=10.0,
            tier="gold",
            status="active",
            created_at=datetime.now(timezone.utc) - timedelta(days=90)
        )
        partners_db[p_id] = partner
    
    # Create external leads
    for i in range(5):
        lead_id = f"ext_lead_{uuid.uuid4().hex[:8]}"
        lead = ExternalLead(
            id=lead_id,
            external_id=f"CRM_{i+1000}",
            name=f"External Lead {i+1}",
            email=f"lead{i+1}@external.com",
            company=f"External Company {i+1}",
            source="crm_integration",
            status=random.choice(list(LeadStatus)),
            created_at=datetime.now(timezone.utc) - timedelta(days=random.randint(1, 30))
        )
        external_leads_db[lead_id] = lead
    
    # Create deals
    stages = list(DealStage)
    for i in range(4):
        deal_id = f"deal_{uuid.uuid4().hex[:8]}"
        deal = Deal(
            id=deal_id,
            external_id=f"CRM_DEAL_{i+100}",
            name=f"Enterprise Deal {i+1}",
            value=random.randint(50000, 200000),
            stage=stages[i % len(stages)],
            lead_id=list(external_leads_db.keys())[i % len(external_leads_db)] if external_leads_db else None,
            owner_id="user_001",
            created_at=datetime.now(timezone.utc) - timedelta(days=random.randint(5, 60))
        )
        deals_db[deal_id] = deal
        
        # Create tasks for deal
        for j in range(random.randint(2, 4)):
            task_id = f"task_{uuid.uuid4().hex[:8]}"
            task = Task(
                id=task_id,
                external_id=f"CRM_TASK_{i}_{j}",
                title=f"Task {j+1} for Deal {i+1}",
                deal_id=deal_id,
                owner_id="user_001",
                due_date=datetime.now(timezone.utc) + timedelta(days=random.randint(1, 14)),
                status=random.choice(list(TaskStatus)),
                created_at=datetime.now(timezone.utc) - timedelta(days=random.randint(1, 10))
            )
            tasks_db[task_id] = task
    
    return {
        "partners_created": len(partners_db),
        "external_leads_created": len(external_leads_db),
        "deals_created": len(deals_db),
        "tasks_created": len(tasks_db)
    }


# ============================================================================
# PLAYBOOK ENGINE SEEDING
# ============================================================================

def seed_playbook_engine(execution_plans_db: dict) -> dict:
    """Seed Playbook Engine with demo execution plans"""
    execution_plans_db.clear()
    
    demo_plans = [
        {
            "name": "Financial Advisory Execution Plan",
            "description": "Comprehensive financial advisory service implementation",
            "client": "Global Finance Ltd",
            "category": "CONSULTATION",
            "status": "active",
            "budget": 75000
        },
        {
            "name": "MVP Development Sprint",
            "description": "Rapid MVP development for startup client",
            "client": "TechStart Inc",
            "category": "APP_DEVELOPMENT",
            "status": "draft",
            "budget": 45000
        },
        {
            "name": "Gold Package - Enterprise Client",
            "description": "Full-service gold package implementation",
            "client": "Acme Corporation",
            "category": "CLIENT_SERVICES",
            "status": "active",
            "budget": 50000
        }
    ]
    
    for plan_data in demo_plans:
        plan_id = f"plan_{uuid.uuid4().hex[:8]}"
        
        # Generate milestones
        milestones = []
        phases = [ExecutionPhase.INITIATION, ExecutionPhase.PLANNING, ExecutionPhase.EXECUTION, ExecutionPhase.REVIEW, ExecutionPhase.CLOSURE]
        for i, phase in enumerate(phases):
            milestone = ExecutionMilestone(
                id=f"ms_{uuid.uuid4().hex[:8]}",
                name=f"{phase.value.title()} Phase",
                description=f"Complete {phase.value.lower()} activities",
                phase=phase,
                due_date=datetime.now(timezone.utc) + timedelta(days=(i+1)*3),
                status=MilestoneStatus.PENDING,
                deliverables=[f"Deliverable {i+1}.1", f"Deliverable {i+1}.2"],
                success_criteria=[f"Criteria {i+1}.1", f"Criteria {i+1}.2"]
            )
            milestones.append(milestone)
        
        # Generate tasks
        tasks = []
        task_titles = [
            "Initial Assessment", "Stakeholder Meeting", "Requirements Document",
            "Solution Design", "Implementation Plan", "Development Sprint 1",
            "Testing Phase", "UAT Preparation", "Go-Live Preparation",
            "Post-Launch Review", "Documentation", "Handover"
        ]
        for i, title in enumerate(task_titles):
            task = ExecutionTask(
                id=f"task_{uuid.uuid4().hex[:8]}",
                title=title,
                description=f"Complete {title.lower()}",
                phase=phases[i % len(phases)],
                milestone_id=milestones[i % len(milestones)].id,
                assigned_role_id=f"role_{i % 4}",
                priority=random.choice(["LOW", "MEDIUM", "HIGH"]),
                estimated_hours=random.randint(2, 16),
                status="pending"
            )
            tasks.append(task)
        
        # Generate roles
        role_types = ["EXECUTIVE_SPONSOR", "PROJECT_LEAD", "COORDINATOR", "SPECIALIST"]
        roles = []
        for i, role_type in enumerate(role_types):
            role = ExecutionRole(
                id=f"role_{i}",
                title=role_type.replace("_", " ").title(),
                role_type=role_type,
                responsibilities=["Responsibility 1", "Responsibility 2"],
                time_commitment="Part-time" if i > 1 else "Full-time"
            )
            roles.append(role)
        
        # Create plan
        plan = ExecutionPlan(
            id=plan_id,
            name=plan_data["name"],
            description=plan_data["description"],
            issue_category=plan_data["category"],
            client_name=plan_data["client"],
            status=plan_data["status"],
            milestones=milestones,
            tasks=tasks,
            roles=roles,
            contracts=[],
            communication_channels=[],
            estimated_budget=plan_data["budget"],
            start_date=datetime.now(timezone.utc),
            target_end_date=datetime.now(timezone.utc) + timedelta(days=21),
            created_at=datetime.now(timezone.utc) - timedelta(days=random.randint(1, 7)),
            updated_at=datetime.now(timezone.utc)
        )
        execution_plans_db[plan_id] = plan
    
    return {
        "plans_created": len(execution_plans_db),
        "total_milestones": sum(len(p.milestones) for p in execution_plans_db.values()),
        "total_tasks": sum(len(p.tasks) for p in execution_plans_db.values())
    }


# ============================================================================
# MASTER SEED FUNCTION
# ============================================================================

def seed_all_data(
    leads_db: dict,
    proposals_db: dict,
    affiliates_db: dict,
    referrals_db: dict,
    commissions_db: dict,
    threads_db: dict,
    messages_db: dict,
    deals_db: dict,
    external_leads_db: dict,
    tasks_db: dict,
    partners_db: dict,
    execution_plans_db: dict
) -> dict:
    """
    Master function to seed all demo data across all modules.
    Returns a summary of all seeded data.
    """
    results = {
        "sales_crm": seed_sales_crm(leads_db, proposals_db),
        "affiliate_crm": seed_affiliate_crm(affiliates_db, referrals_db, commissions_db),
        "communications": seed_communications(threads_db, messages_db),
        "external_api": seed_external_api(deals_db, external_leads_db, tasks_db, partners_db),
        "playbook_engine": seed_playbook_engine(execution_plans_db),
        "seeded_at": datetime.now(timezone.utc).isoformat()
    }
    
    return results
