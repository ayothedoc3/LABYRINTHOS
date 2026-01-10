"""
Sales CRM Routes
API endpoints for lead management, qualification, and proposals
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import uuid
import os
from motor.motor_asyncio import AsyncIOMotorClient

from sales_crm_models import (
    Lead, LeadCreate, LeadStage, LeadSource, LeadPriority, LeadActivity,
    Proposal, ProposalCreate, ProposalStatus, ProposalLineItem,
    LEAD_STAGE_CONFIG, SalesCRMStats, ContactInfo
)

router = APIRouter(prefix="/api/sales", tags=["Sales CRM"])

# Database connection
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "labyrinth_db")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Collections
leads_collection = db.sales_leads
proposals_collection = db.sales_proposals

# Keep in-memory dict for backward compatibility with seed_all.py
leads_db: dict[str, Lead] = {}
proposals_db: dict[str, Proposal] = {}


def serialize_doc(doc: dict) -> dict:
    """Convert MongoDB document for JSON serialization"""
    if doc is None:
        return None
    if "_id" in doc:
        del doc["_id"]
    for key, value in doc.items():
        if isinstance(value, datetime):
            doc[key] = value.isoformat()
        elif isinstance(value, list):
            doc[key] = [serialize_doc(v) if isinstance(v, dict) else v for v in value]
        elif isinstance(value, dict):
            doc[key] = serialize_doc(value)
    return doc


def lead_to_dict(lead: Lead) -> dict:
    """Convert Lead model to dict for MongoDB storage"""
    data = lead.model_dump()
    data["_id"] = lead.id
    return data


def proposal_to_dict(proposal: Proposal) -> dict:
    """Convert Proposal model to dict for MongoDB storage"""
    data = proposal.model_dump()
    data["_id"] = proposal.id
    return data


def seed_demo_leads():
    """Seed demo lead data"""
    demo_leads = [
        Lead(
            id="lead-1",
            name="Sarah Johnson",
            contact=ContactInfo(
                email="sarah.johnson@techcorp.com",
                phone="+1-555-0101",
                company="TechCorp Inc",
                position="VP of Operations"
            ),
            source=LeadSource.REFERRAL,
            priority=LeadPriority.HIGH,
            estimated_value=75000,
            stage=LeadStage.PROPOSAL_SENT,
            function="OPERATIONS",
            assigned_to="coordinator-1",
            conversion_probability=70.0,
            notes="Interested in full automation package",
            tags=["enterprise", "automation", "Q1-priority"],
            activities=[
                LeadActivity(
                    type="call",
                    description="Initial discovery call - very interested",
                    created_by="coordinator-1"
                )
            ]
        ),
        Lead(
            id="lead-2",
            name="Michael Chen",
            contact=ContactInfo(
                email="m.chen@innovate.io",
                phone="+1-555-0102",
                company="Innovate.io",
                position="CEO"
            ),
            source=LeadSource.WEBSITE,
            priority=LeadPriority.URGENT,
            estimated_value=120000,
            stage=LeadStage.NEGOTIATION,
            function="DEVELOPMENT",
            assigned_to="coordinator-1",
            conversion_probability=85.0,
            notes="Ready to sign, negotiating terms",
            tags=["startup", "development", "high-value"]
        ),
        Lead(
            id="lead-3",
            name="Emily Roberts",
            contact=ContactInfo(
                email="eroberts@globalretail.com",
                company="Global Retail Co",
                position="Marketing Director"
            ),
            source=LeadSource.EVENT,
            priority=LeadPriority.MEDIUM,
            estimated_value=45000,
            stage=LeadStage.QUALIFIED,
            function="MARKETING",
            assigned_to="specialist-1",
            conversion_probability=50.0,
            tags=["retail", "marketing", "mid-market"]
        ),
        Lead(
            id="lead-4",
            name="David Park",
            contact=ContactInfo(
                email="dpark@financeplus.com",
                phone="+1-555-0104",
                company="Finance Plus",
                position="CFO"
            ),
            source=LeadSource.COLD_OUTREACH,
            priority=LeadPriority.LOW,
            estimated_value=30000,
            stage=LeadStage.CONTACTED,
            function="FINANCE",
            conversion_probability=25.0,
            tags=["finance", "small-business"]
        ),
        Lead(
            id="lead-5",
            name="Jessica Williams",
            contact=ContactInfo(
                email="jwilliams@healthtech.org",
                company="HealthTech Solutions"
            ),
            source=LeadSource.SOCIAL_MEDIA,
            priority=LeadPriority.MEDIUM,
            estimated_value=60000,
            stage=LeadStage.NEW,
            function="OPERATIONS",
            conversion_probability=20.0,
            tags=["healthcare", "new"]
        ),
        Lead(
            id="lead-6",
            name="Robert Martinez",
            contact=ContactInfo(
                email="rmartinez@salesforce.example.com",
                company="Sales Force Example"
            ),
            source=LeadSource.PARTNER,
            priority=LeadPriority.HIGH,
            estimated_value=95000,
            stage=LeadStage.WON,
            function="SALES",
            conversion_probability=100.0,
            tags=["enterprise", "won", "partner-referral"]
        )
    ]
    
    for lead in demo_leads:
        leads_db[lead.id] = lead
    
    # Create a demo proposal
    demo_proposal = Proposal(
        id="proposal-1",
        lead_id="lead-1",
        title="TechCorp Operations Automation Package",
        description="Comprehensive automation solution for operational workflows",
        status=ProposalStatus.SENT,
        line_items=[
            ProposalLineItem(description="Implementation Setup", quantity=1, unit_price=25000),
            ProposalLineItem(description="Monthly Retainer (12 months)", quantity=12, unit_price=4000),
            ProposalLineItem(description="Training Package", quantity=1, unit_price=2000)
        ],
        total_value=75000,
        created_by="coordinator-1",
        sent_at=datetime.now(timezone.utc) - timedelta(days=3)
    )
    proposals_db[demo_proposal.id] = demo_proposal


# ==================== LEAD ENDPOINTS ====================

@router.get("/leads", response_model=List[Lead])
async def get_leads(
    stage: Optional[LeadStage] = None,
    source: Optional[LeadSource] = None,
    priority: Optional[LeadPriority] = None,
    assigned_to: Optional[str] = None,
    function: Optional[str] = None
):
    """Get all leads with optional filtering"""
    # Build query filter
    query = {}
    if stage:
        query["stage"] = stage.value
    if source:
        query["source"] = source.value
    if priority:
        query["priority"] = priority.value
    if assigned_to:
        query["assigned_to"] = assigned_to
    if function:
        query["function"] = function
    
    # Query MongoDB
    leads_docs = await leads_collection.find(query, {"_id": 0}).sort("updated_at", -1).to_list(1000)
    
    # If no data in MongoDB, seed and try again
    if not leads_docs:
        # Check if we have in-memory data to migrate
        if leads_db:
            for lead in leads_db.values():
                await leads_collection.update_one(
                    {"id": lead.id},
                    {"$set": lead_to_dict(lead)},
                    upsert=True
                )
            leads_docs = await leads_collection.find(query, {"_id": 0}).sort("updated_at", -1).to_list(1000)
        else:
            seed_demo_leads()
            for lead in leads_db.values():
                await leads_collection.update_one(
                    {"id": lead.id},
                    {"$set": lead_to_dict(lead)},
                    upsert=True
                )
            leads_docs = await leads_collection.find(query, {"_id": 0}).sort("updated_at", -1).to_list(1000)
    
    return [serialize_doc(doc) for doc in leads_docs]


@router.get("/leads/{lead_id}")
async def get_lead(lead_id: str):
    """Get a specific lead by ID"""
    lead_doc = await leads_collection.find_one({"id": lead_id}, {"_id": 0})
    if not lead_doc:
        raise HTTPException(status_code=404, detail="Lead not found")
    return serialize_doc(lead_doc)


@router.post("/leads")
async def create_lead(lead_data: LeadCreate):
    """Create a new lead"""
    lead = Lead(
        **lead_data.model_dump(),
        id=str(uuid.uuid4()),
        stage=LeadStage.NEW,
        activities=[
            LeadActivity(
                type="note",
                description="Lead created",
                created_by="system"
            )
        ]
    )
    
    # Store in MongoDB
    await leads_collection.insert_one(lead_to_dict(lead))
    leads_db[lead.id] = lead  # Keep in-memory sync
    
    return lead


@router.put("/leads/{lead_id}")
async def update_lead(lead_id: str, lead_data: LeadCreate):
    """Update an existing lead"""
    existing_doc = await leads_collection.find_one({"id": lead_id})
    if not existing_doc:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    update_data = {
        **lead_data.model_dump(),
        "updated_at": datetime.now(timezone.utc)
    }
    
    await leads_collection.update_one(
        {"id": lead_id},
        {"$set": update_data}
    )
    
    updated_doc = await leads_collection.find_one({"id": lead_id}, {"_id": 0})
    return serialize_doc(updated_doc)


@router.delete("/leads/{lead_id}")
async def delete_lead(lead_id: str):
    """Delete a lead"""
    result = await leads_collection.delete_one({"id": lead_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    if lead_id in leads_db:
        del leads_db[lead_id]
    return {"message": "Lead deleted successfully"}


@router.post("/leads/{lead_id}/transition")
async def transition_lead_stage(
    lead_id: str,
    new_stage: LeadStage,
    transitioned_by: str = "system",
    reason: str = ""
):
    """Transition a lead to a new stage"""
    lead_doc = await leads_collection.find_one({"id": lead_id})
    if not lead_doc:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    current_stage = LeadStage(lead_doc.get("stage", "NEW"))
    current_config = LEAD_STAGE_CONFIG.get(current_stage)
    
    if current_config and new_stage not in current_config["valid_transitions"]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid transition from {current_stage.value} to {new_stage.value}"
        )
    
    # Update conversion probability based on stage
    probability_map = {
        LeadStage.NEW: 10.0,
        LeadStage.CONTACTED: 25.0,
        LeadStage.QUALIFIED: 50.0,
        LeadStage.PROPOSAL_SENT: 65.0,
        LeadStage.NEGOTIATION: 80.0,
        LeadStage.WON: 100.0,
        LeadStage.LOST: 0.0,
        LeadStage.NURTURING: 15.0
    }
    
    # Add activity log
    new_activity = {
        "id": str(uuid.uuid4()),
        "type": "stage_change",
        "description": f"Stage changed from {current_stage.value} to {new_stage.value}. {reason}",
        "created_by": transitioned_by,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await leads_collection.update_one(
        {"id": lead_id},
        {
            "$set": {
                "stage": new_stage.value,
                "updated_at": datetime.now(timezone.utc),
                "conversion_probability": probability_map.get(new_stage, lead_doc.get("conversion_probability", 0))
            },
            "$push": {"activities": new_activity}
        }
    )
    
    updated_doc = await leads_collection.find_one({"id": lead_id}, {"_id": 0})
    return serialize_doc(updated_doc)


@router.post("/leads/{lead_id}/activity")
async def add_lead_activity(
    lead_id: str,
    activity_type: str,
    description: str,
    created_by: str = "system"
):
    """Add an activity to a lead"""
    lead_doc = await leads_collection.find_one({"id": lead_id})
    if not lead_doc:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    new_activity = {
        "id": str(uuid.uuid4()),
        "type": activity_type,
        "description": description,
        "created_by": created_by,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await leads_collection.update_one(
        {"id": lead_id},
        {
            "$set": {"updated_at": datetime.now(timezone.utc), "last_contacted": datetime.now(timezone.utc)},
            "$push": {"activities": new_activity}
        }
    )
    
    updated_doc = await leads_collection.find_one({"id": lead_id}, {"_id": 0})
    return serialize_doc(updated_doc)


# ==================== STAGE ENDPOINTS ====================

@router.get("/stages")
async def get_lead_stages():
    """Get all lead stage configurations"""
    return [
        {
            "stage": stage.value,
            "display_name": config["display_name"],
            "color": config["color"],
            "icon": config["icon"],
            "valid_transitions": [t.value for t in config["valid_transitions"]]
        }
        for stage, config in LEAD_STAGE_CONFIG.items()
    ]


# ==================== PROPOSAL ENDPOINTS ====================

@router.get("/proposals", response_model=List[Proposal])
async def get_proposals(
    lead_id: Optional[str] = None,
    status: Optional[ProposalStatus] = None
):
    """Get all proposals with optional filtering"""
    proposals = list(proposals_db.values())
    
    if lead_id:
        proposals = [p for p in proposals if p.lead_id == lead_id]
    if status:
        proposals = [p for p in proposals if p.status == status]
    
    return sorted(proposals, key=lambda x: x.created_at, reverse=True)


@router.get("/proposals/{proposal_id}", response_model=Proposal)
async def get_proposal(proposal_id: str):
    """Get a specific proposal"""
    if proposal_id not in proposals_db:
        raise HTTPException(status_code=404, detail="Proposal not found")
    return proposals_db[proposal_id]


@router.post("/proposals", response_model=Proposal)
async def create_proposal(proposal_data: ProposalCreate):
    """Create a new proposal for a lead"""
    if proposal_data.lead_id not in leads_db:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Calculate total value
    total = sum(
        item.quantity * item.unit_price * (1 - item.discount_percent / 100)
        for item in proposal_data.line_items
    )
    
    proposal = Proposal(
        **proposal_data.model_dump(),
        id=str(uuid.uuid4()),
        total_value=total
    )
    proposals_db[proposal.id] = proposal
    
    # Update lead with proposal reference
    lead = leads_db[proposal_data.lead_id]
    lead.proposal_id = proposal.id
    leads_db[lead.id] = lead
    
    return proposal


@router.post("/proposals/{proposal_id}/send")
async def send_proposal(proposal_id: str):
    """Mark a proposal as sent"""
    if proposal_id not in proposals_db:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    proposal = proposals_db[proposal_id]
    proposal.status = ProposalStatus.SENT
    proposal.sent_at = datetime.now(timezone.utc)
    proposal.updated_at = datetime.now(timezone.utc)
    proposals_db[proposal_id] = proposal
    
    # Update lead stage if applicable
    if proposal.lead_id in leads_db:
        lead = leads_db[proposal.lead_id]
        if lead.stage in [LeadStage.QUALIFIED, LeadStage.NEW, LeadStage.CONTACTED]:
            lead.stage = LeadStage.PROPOSAL_SENT
            lead.updated_at = datetime.now(timezone.utc)
            leads_db[lead.id] = lead
    
    return proposal


@router.post("/proposals/{proposal_id}/respond")
async def respond_to_proposal(proposal_id: str, accepted: bool, notes: str = ""):
    """Record client response to proposal"""
    if proposal_id not in proposals_db:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    proposal = proposals_db[proposal_id]
    proposal.status = ProposalStatus.ACCEPTED if accepted else ProposalStatus.REJECTED
    proposal.responded_at = datetime.now(timezone.utc)
    proposal.updated_at = datetime.now(timezone.utc)
    if notes:
        proposal.notes = (proposal.notes or "") + f"\nResponse: {notes}"
    proposals_db[proposal_id] = proposal
    
    # Update lead stage
    if proposal.lead_id in leads_db:
        lead = leads_db[proposal.lead_id]
        lead.stage = LeadStage.WON if accepted else LeadStage.LOST
        lead.updated_at = datetime.now(timezone.utc)
        lead.activities.append(LeadActivity(
            type="proposal_response",
            description=f"Proposal {'accepted' if accepted else 'rejected'}. {notes}",
            created_by="client"
        ))
        leads_db[lead.id] = lead
    
    return proposal


# ==================== STATS ENDPOINTS ====================

@router.get("/stats", response_model=SalesCRMStats)
async def get_sales_stats():
    """Get sales CRM statistics"""
    # Get all leads from MongoDB
    leads_docs = await leads_collection.find({}, {"_id": 0}).to_list(1000)
    
    # If no data, seed first
    if not leads_docs:
        seed_demo_leads()
        for lead in leads_db.values():
            await leads_collection.update_one(
                {"id": lead.id},
                {"$set": lead_to_dict(lead)},
                upsert=True
            )
        leads_docs = await leads_collection.find({}, {"_id": 0}).to_list(1000)
    
    # Leads by stage
    stage_counts = {}
    for stage in LeadStage:
        stage_counts[stage.value] = len([l for l in leads_docs if l.get("stage") == stage.value])
    
    # Leads by source
    source_counts = {}
    for source in LeadSource:
        source_counts[source.value] = len([l for l in leads_docs if l.get("source") == source.value])
    
    # Leads by priority
    priority_counts = {}
    for priority in LeadPriority:
        priority_counts[priority.value] = len([l for l in leads_docs if l.get("priority") == priority.value])
    
    # Pipeline value (excluding won/lost)
    pipeline_leads = [l for l in leads_docs if l.get("stage") not in [LeadStage.WON.value, LeadStage.LOST.value]]
    pipeline_value = sum(l.get("estimated_value") or 0 for l in pipeline_leads)
    
    # Conversion rate
    won_count = stage_counts.get(LeadStage.WON.value, 0)
    lost_count = stage_counts.get(LeadStage.LOST.value, 0)
    total_closed = won_count + lost_count
    conversion_rate = (won_count / total_closed * 100) if total_closed > 0 else 0
    
    # Average deal size
    won_leads = [l for l in leads_docs if l.get("stage") == LeadStage.WON.value and l.get("estimated_value")]
    avg_deal = sum(l.get("estimated_value", 0) for l in won_leads) / len(won_leads) if won_leads else 0
    
    # Proposal stats
    proposals_docs = await proposals_collection.find({}, {"_id": 0}).to_list(1000)
    proposals_sent = len([p for p in proposals_docs if p.get("status") != ProposalStatus.DRAFT.value])
    proposals_accepted = len([p for p in proposals_docs if p.get("status") == ProposalStatus.ACCEPTED.value])
    
    return SalesCRMStats(
        total_leads=len(leads_docs),
        leads_by_stage=stage_counts,
        leads_by_source=source_counts,
        leads_by_priority=priority_counts,
        total_pipeline_value=pipeline_value,
        conversion_rate=round(conversion_rate, 1),
        avg_deal_size=round(avg_deal, 2),
        proposals_sent=proposals_sent,
        proposals_accepted=proposals_accepted
    )


@router.post("/seed-demo")
async def seed_demo_data():
    """Seed demo data for sales CRM"""
    # Clear MongoDB collections
    await leads_collection.delete_many({})
    await proposals_collection.delete_many({})
    
    # Clear in-memory
    leads_db.clear()
    proposals_db.clear()
    
    # Seed in-memory
    seed_demo_leads()
    
    # Persist to MongoDB
    for lead in leads_db.values():
        await leads_collection.update_one(
            {"id": lead.id},
            {"$set": lead_to_dict(lead)},
            upsert=True
        )
    
    for proposal in proposals_db.values():
        await proposals_collection.update_one(
            {"id": proposal.id},
            {"$set": proposal_to_dict(proposal)},
            upsert=True
        )
    
    return {"message": f"Seeded {len(leads_db)} leads and {len(proposals_db)} proposals to MongoDB"}
