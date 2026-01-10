"""
Labyrinth Contract Lifecycle - API Routes
Stage-gated contract management endpoints
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from datetime import datetime, timezone
import os
import uuid
from motor.motor_asyncio import AsyncIOMotorClient

from contract_lifecycle_models import (
    ContractStage, ContractType, MilestoneStatus, BidStatus,
    LifecycleContract, LifecycleContractCreate, Milestone, Bid,
    StageTransition, CommunicationThread, ThreadMessage, MessageType, MessagePriority,
    VALID_STAGE_TRANSITIONS, STAGE_INFO
)

router = APIRouter(prefix="/lifecycle", tags=["Contract Lifecycle"])

# Database connection
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "labyrinth_db")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]


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


# ==================== STAGE INFO ENDPOINTS ====================

@router.get("/stages", response_model=List[dict])
async def get_all_stages():
    """Get information about all contract stages"""
    stages = []
    for stage in ContractStage:
        info = STAGE_INFO.get(stage, {})
        valid_next = [s.value for s in VALID_STAGE_TRANSITIONS.get(stage, [])]
        stages.append({
            "stage": stage.value,
            "display_name": info.get("display_name", stage.value),
            "description": info.get("description", ""),
            "color": info.get("color", "#64748B"),
            "icon": info.get("icon", "Circle"),
            "allowed_roles": info.get("allowed_roles", []),
            "valid_transitions": valid_next,
        })
    return stages


# ==================== CONTRACT CRUD ENDPOINTS ====================

@router.get("/contracts", response_model=List[dict])
async def get_lifecycle_contracts(
    stage: Optional[ContractStage] = None,
    contract_type: Optional[ContractType] = None,
    function: Optional[str] = None,
    client_name: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
):
    """Get all lifecycle contracts with optional filtering"""
    query = {}
    if stage:
        query["stage"] = stage.value
    if contract_type:
        query["contract_type"] = contract_type.value
    if function:
        query["function"] = function
    if client_name:
        query["client_name"] = {"$regex": client_name, "$options": "i"}
    
    contracts = await db.lifecycle_contracts.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    return [serialize_doc(c) for c in contracts]


@router.get("/contracts/{contract_id}", response_model=dict)
async def get_lifecycle_contract(contract_id: str):
    """Get a specific lifecycle contract by ID"""
    contract = await db.lifecycle_contracts.find_one({"id": contract_id}, {"_id": 0})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    return serialize_doc(contract)


@router.post("/contracts", response_model=dict)
async def create_lifecycle_contract(contract_create: LifecycleContractCreate):
    """Create a new lifecycle contract (starts at PROPOSAL stage)"""
    contract = LifecycleContract(
        name=contract_create.name,
        description=contract_create.description,
        client_name=contract_create.client_name,
        client_package=contract_create.client_package,
        contract_type=contract_create.contract_type,
        playbook_ids=contract_create.playbook_ids,
        sop_ids=contract_create.sop_ids,
        function=contract_create.function,
        estimated_value=contract_create.estimated_value,
        start_date=contract_create.start_date,
        end_date=contract_create.end_date,
    )
    
    contract_dict = contract.model_dump()
    
    # Serialize datetime fields
    for key, value in contract_dict.items():
        if isinstance(value, datetime):
            contract_dict[key] = value.isoformat()
    
    await db.lifecycle_contracts.insert_one(contract_dict)
    
    # Log the creation as a transition
    await _log_transition(
        contract.id,
        None,
        ContractStage.PROPOSAL,
        "system",
        "Contract created",
    )
    
    return serialize_doc(contract_dict)


@router.put("/contracts/{contract_id}", response_model=dict)
async def update_lifecycle_contract(contract_id: str, contract_update: LifecycleContractCreate):
    """Update a lifecycle contract (cannot change stage via this endpoint)"""
    existing = await db.lifecycle_contracts.find_one({"id": contract_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    # Don't allow editing contracts that are ACTIVE, COMPLETED, or CLOSED
    if existing["stage"] in [ContractStage.ACTIVE.value, ContractStage.COMPLETED.value, ContractStage.CLOSED.value]:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot edit contract in {existing['stage']} stage"
        )
    
    update_data = contract_update.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Serialize datetime fields
    for key, value in update_data.items():
        if isinstance(value, datetime):
            update_data[key] = value.isoformat()
    
    await db.lifecycle_contracts.update_one({"id": contract_id}, {"$set": update_data})
    updated = await db.lifecycle_contracts.find_one({"id": contract_id}, {"_id": 0})
    return serialize_doc(updated)


@router.delete("/contracts/{contract_id}")
async def delete_lifecycle_contract(contract_id: str):
    """Delete a lifecycle contract (only allowed for PROPOSAL stage)"""
    existing = await db.lifecycle_contracts.find_one({"id": contract_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    if existing["stage"] != ContractStage.PROPOSAL.value:
        raise HTTPException(
            status_code=400,
            detail="Can only delete contracts in PROPOSAL stage"
        )
    
    await db.lifecycle_contracts.delete_one({"id": contract_id})
    return {"message": "Contract deleted"}


# ==================== STAGE TRANSITION ENDPOINT ====================

@router.post("/contracts/{contract_id}/transition", response_model=dict)
async def transition_contract_stage(
    contract_id: str,
    new_stage: ContractStage,
    transitioned_by: str,
    reason: str = "",
    notes: str = ""
):
    """
    Transition a contract to a new stage.
    Enforces stage-gating rules.
    """
    contract = await db.lifecycle_contracts.find_one({"id": contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    current_stage = ContractStage(contract["stage"])
    
    # Check if transition is valid
    valid_transitions = VALID_STAGE_TRANSITIONS.get(current_stage, [])
    if new_stage not in valid_transitions:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition from {current_stage.value} to {new_stage.value}. "
                   f"Valid transitions: {[s.value for s in valid_transitions]}"
        )
    
    # Update stage and timestamp
    update_data = {
        "stage": new_stage.value,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    
    # Set appropriate timestamp based on new stage
    timestamp_field = {
        ContractStage.BID_SUBMITTED: "bid_submitted_date",
        ContractStage.BID_APPROVED: "bid_approved_date",
        ContractStage.ACTIVE: "activated_date",
        ContractStage.PAUSED: "paused_date",
        ContractStage.COMPLETED: "completed_date",
        ContractStage.CLOSED: "closed_date",
    }
    
    if new_stage in timestamp_field:
        update_data[timestamp_field[new_stage]] = datetime.now(timezone.utc).isoformat()
    
    # Special handling for ACTIVE stage - create communication thread
    if new_stage == ContractStage.ACTIVE:
        thread = CommunicationThread(
            contract_id=contract_id,
            contract_name=contract["name"],
        )
        thread_dict = thread.model_dump()
        for key, value in thread_dict.items():
            if isinstance(value, datetime):
                thread_dict[key] = value.isoformat()
        await db.communication_threads.insert_one(thread_dict)
        update_data["communication_thread_id"] = thread.id
    
    await db.lifecycle_contracts.update_one({"id": contract_id}, {"$set": update_data})
    
    # Log the transition
    await _log_transition(contract_id, current_stage, new_stage, transitioned_by, reason, notes)
    
    updated = await db.lifecycle_contracts.find_one({"id": contract_id}, {"_id": 0})
    return serialize_doc(updated)


async def _log_transition(
    contract_id: str,
    from_stage: Optional[ContractStage],
    to_stage: ContractStage,
    transitioned_by: str,
    reason: str = "",
    notes: str = ""
):
    """Log a stage transition"""
    transition = StageTransition(
        contract_id=contract_id,
        from_stage=from_stage,
        to_stage=to_stage,
        transitioned_by=transitioned_by,
        reason=reason,
        notes=notes,
    )
    transition_dict = transition.model_dump()
    for key, value in transition_dict.items():
        if isinstance(value, datetime):
            transition_dict[key] = value.isoformat()
        elif isinstance(value, ContractStage):
            transition_dict[key] = value.value if value else None
    
    await db.stage_transitions.insert_one(transition_dict)


@router.get("/contracts/{contract_id}/transitions", response_model=List[dict])
async def get_contract_transitions(contract_id: str):
    """Get all stage transitions for a contract"""
    transitions = await db.stage_transitions.find(
        {"contract_id": contract_id}, 
        {"_id": 0}
    ).sort("transitioned_at", -1).to_list(100)
    return [serialize_doc(t) for t in transitions]


# ==================== BID ENDPOINTS ====================

@router.post("/contracts/{contract_id}/bids", response_model=dict)
async def submit_bid(
    contract_id: str,
    bidder_id: str,
    bidder_name: str,
    function: str,
    proposed_rate: Optional[float] = None,
    proposed_hours: Optional[int] = None,
    proposal_notes: str = ""
):
    """Submit a bid for a contract"""
    contract = await db.lifecycle_contracts.find_one({"id": contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    if contract["stage"] not in [ContractStage.PROPOSAL.value, ContractStage.BID_SUBMITTED.value]:
        raise HTTPException(
            status_code=400,
            detail="Bids can only be submitted for contracts in PROPOSAL or BID_SUBMITTED stage"
        )
    
    bid = Bid(
        contract_id=contract_id,
        bidder_id=bidder_id,
        bidder_name=bidder_name,
        function=function,
        proposed_rate=proposed_rate,
        proposed_hours=proposed_hours,
        proposal_notes=proposal_notes,
    )
    bid_dict = bid.model_dump()
    bid_dict["submitted_at"] = bid_dict["submitted_at"].isoformat()
    
    # Add bid to contract
    await db.lifecycle_contracts.update_one(
        {"id": contract_id},
        {"$push": {"bids": bid_dict}}
    )
    
    return serialize_doc(bid_dict)


@router.put("/contracts/{contract_id}/bids/{bid_id}/review", response_model=dict)
async def review_bid(
    contract_id: str,
    bid_id: str,
    status: BidStatus,
    reviewed_by: str
):
    """Review (accept/reject) a bid"""
    contract = await db.lifecycle_contracts.find_one({"id": contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    # Find and update the bid
    bids = contract.get("bids", [])
    bid_found = False
    for bid in bids:
        if bid["id"] == bid_id:
            bid["status"] = status.value
            bid["reviewed_at"] = datetime.now(timezone.utc).isoformat()
            bid["reviewed_by"] = reviewed_by
            bid_found = True
            break
    
    if not bid_found:
        raise HTTPException(status_code=404, detail="Bid not found")
    
    await db.lifecycle_contracts.update_one(
        {"id": contract_id},
        {"$set": {"bids": bids}}
    )
    
    return {"message": f"Bid {status.value}"}


# ==================== MILESTONE ENDPOINTS ====================

@router.post("/contracts/{contract_id}/milestones", response_model=dict)
async def add_milestone(
    contract_id: str,
    name: str,
    description: str,
    order: int,
    due_date: Optional[datetime] = None,
    deliverables: List[str] = [],
    dependencies: List[str] = [],
    assigned_to: List[str] = [],
    kpi_ids: List[str] = []
):
    """Add a milestone to a contract"""
    contract = await db.lifecycle_contracts.find_one({"id": contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    milestone = Milestone(
        name=name,
        description=description,
        order=order,
        due_date=due_date,
        deliverables=deliverables,
        dependencies=dependencies,
        assigned_to=assigned_to,
        kpi_ids=kpi_ids,
    )
    milestone_dict = milestone.model_dump()
    if milestone_dict.get("due_date"):
        milestone_dict["due_date"] = milestone_dict["due_date"].isoformat()
    
    await db.lifecycle_contracts.update_one(
        {"id": contract_id},
        {"$push": {"milestones": milestone_dict}}
    )
    
    return serialize_doc(milestone_dict)


@router.put("/contracts/{contract_id}/milestones/{milestone_id}/status", response_model=dict)
async def update_milestone_status(
    contract_id: str,
    milestone_id: str,
    status: MilestoneStatus
):
    """Update milestone status"""
    contract = await db.lifecycle_contracts.find_one({"id": contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    milestones = contract.get("milestones", [])
    for milestone in milestones:
        if milestone["id"] == milestone_id:
            milestone["status"] = status.value
            if status == MilestoneStatus.COMPLETED:
                milestone["completed_date"] = datetime.now(timezone.utc).isoformat()
            break
    
    await db.lifecycle_contracts.update_one(
        {"id": contract_id},
        {"$set": {"milestones": milestones}}
    )
    
    return {"message": f"Milestone status updated to {status.value}"}


# ==================== COMMUNICATION THREAD ENDPOINTS ====================

@router.get("/contracts/{contract_id}/thread", response_model=dict)
async def get_communication_thread(contract_id: str):
    """Get the communication thread for a contract"""
    thread = await db.communication_threads.find_one(
        {"contract_id": contract_id}, 
        {"_id": 0}
    )
    if not thread:
        raise HTTPException(status_code=404, detail="Communication thread not found")
    return serialize_doc(thread)


@router.post("/contracts/{contract_id}/thread/messages", response_model=dict)
async def add_thread_message(
    contract_id: str,
    sender_id: str,
    sender_name: str,
    content: str,
    message_type: MessageType = MessageType.GENERAL,
    priority: MessagePriority = MessagePriority.NORMAL,
    due_date: Optional[datetime] = None,
    assigned_to: Optional[str] = None
):
    """Add a message to a contract's communication thread"""
    thread = await db.communication_threads.find_one({"contract_id": contract_id})
    if not thread:
        raise HTTPException(status_code=404, detail="Communication thread not found")
    
    message = ThreadMessage(
        thread_id=thread["id"],
        sender_id=sender_id,
        sender_name=sender_name,
        message_type=message_type,
        content=content,
        priority=priority,
        due_date=due_date,
        assigned_to=assigned_to,
    )
    message_dict = message.model_dump()
    message_dict["created_at"] = message_dict["created_at"].isoformat()
    if message_dict.get("due_date"):
        message_dict["due_date"] = message_dict["due_date"].isoformat()
    
    await db.communication_threads.update_one(
        {"id": thread["id"]},
        {
            "$push": {"messages": message_dict},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    return serialize_doc(message_dict)


@router.put("/threads/messages/{message_id}/resolve", response_model=dict)
async def resolve_thread_message(message_id: str):
    """Mark a thread message as resolved"""
    # Find the thread containing this message
    thread = await db.communication_threads.find_one(
        {"messages.id": message_id}
    )
    if not thread:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Update the message
    messages = thread.get("messages", [])
    for message in messages:
        if message["id"] == message_id:
            message["is_resolved"] = True
            message["resolved_at"] = datetime.now(timezone.utc).isoformat()
            break
    
    await db.communication_threads.update_one(
        {"id": thread["id"]},
        {"$set": {"messages": messages}}
    )
    
    return {"message": "Message resolved"}


# ==================== DASHBOARD STATS ====================

@router.get("/stats", response_model=dict)
async def get_lifecycle_stats():
    """Get dashboard statistics for contract lifecycle"""
    # Count contracts by stage
    stage_counts = {}
    for stage in ContractStage:
        count = await db.lifecycle_contracts.count_documents({"stage": stage.value})
        stage_counts[stage.value] = count
    
    # Get recent transitions
    recent_transitions = await db.stage_transitions.find(
        {}, 
        {"_id": 0}
    ).sort("transitioned_at", -1).limit(10).to_list(10)
    
    # Get contracts by type
    type_counts = {}
    for ctype in ContractType:
        count = await db.lifecycle_contracts.count_documents({"contract_type": ctype.value})
        type_counts[ctype.value] = count
    
    # Get overdue milestones
    now = datetime.now(timezone.utc).isoformat()
    # Note: This is a simplified query - in production would need aggregation
    
    total_contracts = await db.lifecycle_contracts.count_documents({})
    active_contracts = stage_counts.get(ContractStage.ACTIVE.value, 0)
    queued_contracts = stage_counts.get(ContractStage.QUEUED.value, 0)
    
    return {
        "total_contracts": total_contracts,
        "active_contracts": active_contracts,
        "queued_contracts": queued_contracts,
        "stage_counts": stage_counts,
        "type_counts": type_counts,
        "recent_transitions": [serialize_doc(t) for t in recent_transitions],
    }


# ==================== SEED DEMO DATA ====================

@router.post("/seed-demo")
async def seed_demo_contracts():
    """Seed demo lifecycle contracts"""
    demo_contracts = [
        {
            "name": "Acme Corp - Marketing Automation",
            "description": "Full marketing automation setup and integration",
            "client_name": "Acme Corporation",
            "client_package": "GOLD",
            "contract_type": ContractType.PROJECT_BASED.value,
            "function": "MARKETING",
            "estimated_value": 25000,
            "stage": ContractStage.ACTIVE.value,
        },
        {
            "name": "TechStart - Sales Funnel",
            "description": "Sales funnel optimization and CRM setup",
            "client_name": "TechStart Inc",
            "client_package": "SILVER",
            "contract_type": ContractType.PROJECT_BASED.value,
            "function": "SALES",
            "estimated_value": 15000,
            "stage": ContractStage.QUEUED.value,
        },
        {
            "name": "GlobalTrade - Monthly Retainer",
            "description": "Ongoing operations support",
            "client_name": "GlobalTrade LLC",
            "client_package": "BRONZE",
            "contract_type": ContractType.RECURRING.value,
            "function": "OPERATIONS",
            "estimated_value": 5000,
            "stage": ContractStage.PROPOSAL.value,
        },
        {
            "name": "InnovateCo - Development Sprint",
            "description": "MVP development and launch",
            "client_name": "InnovateCo",
            "client_package": "BLACK",
            "contract_type": ContractType.PROJECT_BASED.value,
            "function": "DEVELOPMENT",
            "estimated_value": 50000,
            "stage": ContractStage.BID_SUBMITTED.value,
        },
    ]
    
    created = []
    for contract_data in demo_contracts:
        existing = await db.lifecycle_contracts.find_one({"name": contract_data["name"]})
        if not existing:
            contract = LifecycleContract(**contract_data)
            contract_dict = contract.model_dump()
            for key, value in contract_dict.items():
                if isinstance(value, datetime):
                    contract_dict[key] = value.isoformat()
            await db.lifecycle_contracts.insert_one(contract_dict)
            created.append(contract_data["name"])
    
    return {"message": f"Created demo contracts: {created}"}
