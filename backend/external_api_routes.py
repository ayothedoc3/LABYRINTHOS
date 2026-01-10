"""
External API Routes
API endpoints for CRM integration with authentication, validation, and webhooks
"""

from fastapi import APIRouter, HTTPException, Header, Depends, BackgroundTasks
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import uuid
import hmac
import hashlib
import httpx
import os
import logging
from motor.motor_asyncio import AsyncIOMotorClient

from external_api_models import (
    Deal, DealCreate, DealUpdate, DealStage, StageValidationResult,
    ExternalLead, ExternalLeadCreate, ExternalLeadUpdate, LeadStatus,
    Task, TaskCreate, TaskUpdate, TaskStatus, TaskPriority,
    Partner, PartnerCreate,
    WebhookEvent, WebhookConfig,
    PipelineStats, PipelineStage,
    ExternalKPI
)

router = APIRouter(prefix="/api/external", tags=["External API"])
logger = logging.getLogger(__name__)

# Database connection
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "labyrinth_db")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Collections
deals_collection = db.external_deals
external_leads_collection = db.external_leads
tasks_collection = db.external_tasks
partners_collection = db.external_partners

# Keep in-memory storage for backward compatibility
deals_db: dict[str, Deal] = {}
external_leads_db: dict[str, ExternalLead] = {}
tasks_db: dict[str, Task] = {}
partners_db: dict[str, Partner] = {}
external_contracts_db: dict[str, dict] = {}  # Contracts created from won deals
webhook_configs: List[WebhookConfig] = []


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


def deal_to_dict(deal: Deal) -> dict:
    """Convert Deal model to dict for MongoDB storage"""
    data = deal.model_dump()
    data["_id"] = deal.id
    return data


def lead_to_dict(lead: ExternalLead) -> dict:
    """Convert ExternalLead model to dict for MongoDB storage"""
    data = lead.model_dump()
    data["_id"] = lead.id
    return data


def task_to_dict(task: Task) -> dict:
    """Convert Task model to dict for MongoDB storage"""
    data = task.model_dump()
    data["_id"] = task.id
    return data


def partner_to_dict(partner: Partner) -> dict:
    """Convert Partner model to dict for MongoDB storage"""
    data = partner.model_dump()
    data["_id"] = partner.id
    return data


# API Keys for authentication
API_KEYS = {
    "elk_f531ebe4a7d24c8fbcde123456789abc": {
        "name": "CRM Integration",
        "permissions": ["deals", "leads", "tasks", "partners", "kpis", "pipeline"],
        "active": True
    }
}

# Webhook secret for signing
WEBHOOK_SECRET = os.environ.get("LABYRINTH_WEBHOOK_SECRET", "labyrinth_webhook_secret_key_2026")


# ==================== AUTHENTICATION ====================

async def verify_api_key(x_api_key: str = Header(None, alias="X-API-Key")):
    """Verify API key from header"""
    if not x_api_key:
        raise HTTPException(status_code=401, detail="Missing API key. Include X-API-Key header.")
    
    if x_api_key not in API_KEYS:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    key_config = API_KEYS[x_api_key]
    if not key_config.get("active", False):
        raise HTTPException(status_code=401, detail="API key is inactive")
    
    return key_config


# ==================== WEBHOOK HELPERS ====================

def generate_webhook_signature(payload: str, secret: str) -> str:
    """Generate HMAC-SHA256 signature for webhook payload"""
    return hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()


async def send_webhook(event: WebhookEvent):
    """Send webhook event to all registered endpoints"""
    import json
    
    payload = event.model_dump_json()
    signature = generate_webhook_signature(payload, WEBHOOK_SECRET)
    
    for config in webhook_configs:
        if not config.active:
            continue
        if event.type not in config.events and "*" not in config.events:
            continue
        
        try:
            async with httpx.AsyncClient() as client:
                await client.post(
                    config.url,
                    content=payload,
                    headers={
                        "Content-Type": "application/json",
                        "X-Labyrinth-Signature": signature,
                        "X-Labyrinth-Event": event.type
                    },
                    timeout=10.0
                )
                logger.info(f"Webhook sent: {event.type} to {config.url}")
        except Exception as e:
            logger.error(f"Webhook failed: {event.type} to {config.url}: {e}")


# ==================== STAGE GATE LOGIC ====================

# Stage requirements - what must be completed before moving to next stage
STAGE_REQUIREMENTS = {
    DealStage.DISCOVERY: {
        "next_stages": [DealStage.QUALIFICATION, DealStage.CLOSED_LOST],
        "requirements": []
    },
    DealStage.QUALIFICATION: {
        "next_stages": [DealStage.PROPOSAL, DealStage.CLOSED_LOST],
        "requirements": [
            "discovery_call_completed",
            "budget_confirmed"
        ]
    },
    DealStage.PROPOSAL: {
        "next_stages": [DealStage.NEGOTIATION, DealStage.CLOSED_LOST],
        "requirements": [
            "qualification_document_uploaded",
            "proposal_created"
        ]
    },
    DealStage.NEGOTIATION: {
        "next_stages": [DealStage.CLOSED_WON, DealStage.CLOSED_LOST],
        "requirements": [
            "proposal_sent",
            "stakeholder_approval"
        ]
    },
    DealStage.CLOSED_WON: {
        "next_stages": [],
        "requirements": [
            "contract_signed",
            "payment_terms_agreed"
        ]
    },
    DealStage.CLOSED_LOST: {
        "next_stages": [],
        "requirements": []
    }
}


def check_stage_requirements(deal: Deal, next_stage: DealStage) -> StageValidationResult:
    """Check if deal can move to next stage based on gate requirements"""
    current_config = STAGE_REQUIREMENTS.get(deal.stage, {})
    valid_next = current_config.get("next_stages", [])
    
    # Check if transition is valid
    if next_stage not in valid_next:
        return StageValidationResult(
            allowed=False,
            message=f"Cannot move from {deal.stage.value} to {next_stage.value}. Invalid transition.",
            missing_requirements=[f"Valid transitions: {[s.value for s in valid_next]}"],
            current_stage=deal.stage.value,
            requested_stage=next_stage.value
        )
    
    # Check requirements for next stage
    next_config = STAGE_REQUIREMENTS.get(next_stage, {})
    requirements = next_config.get("requirements", [])
    
    # Get completed tasks for this deal
    deal_tasks = [t for t in tasks_db.values() if t.deal_id == deal.id and t.status == TaskStatus.COMPLETED]
    completed_task_types = set()
    for task in deal_tasks:
        # Map task titles to requirement types
        title_lower = task.title.lower()
        if "discovery" in title_lower or "call" in title_lower:
            completed_task_types.add("discovery_call_completed")
        if "budget" in title_lower:
            completed_task_types.add("budget_confirmed")
        if "qualification" in title_lower or "document" in title_lower:
            completed_task_types.add("qualification_document_uploaded")
        if "proposal" in title_lower and "create" in title_lower:
            completed_task_types.add("proposal_created")
        if "proposal" in title_lower and "send" in title_lower:
            completed_task_types.add("proposal_sent")
        if "stakeholder" in title_lower or "approval" in title_lower:
            completed_task_types.add("stakeholder_approval")
        if "contract" in title_lower or "sign" in title_lower:
            completed_task_types.add("contract_signed")
        if "payment" in title_lower or "terms" in title_lower:
            completed_task_types.add("payment_terms_agreed")
    
    # Check for missing requirements
    missing = [req for req in requirements if req not in completed_task_types]
    
    if missing:
        return StageValidationResult(
            allowed=False,
            message=f"Cannot move to {next_stage.value}. Missing requirements.",
            missing_requirements=[req.replace("_", " ").title() for req in missing],
            current_stage=deal.stage.value,
            requested_stage=next_stage.value
        )
    
    return StageValidationResult(
        allowed=True,
        message=f"Deal can move to {next_stage.value}",
        missing_requirements=[],
        current_stage=deal.stage.value,
        requested_stage=next_stage.value
    )


# ==================== AUTO-WORKFLOW HELPERS ====================

async def create_contract_from_deal(deal: Deal, background_tasks: BackgroundTasks) -> str:
    """Auto-create contract when deal is won - stores in local contracts storage"""
    
    contract_id = f"contract_{uuid.uuid4().hex[:12]}"
    
    # Create contract data
    contract_data = {
        "id": contract_id,
        "name": f"{deal.name} - Contract",
        "client_name": deal.name.split(" - ")[0] if " - " in deal.name else deal.name,
        "client_package": "GOLD" if deal.value > 5000000 else "SILVER" if deal.value > 2000000 else "BRONZE",
        "function": "SALES",
        "contract_type": "service_agreement",
        "stage": "BID_APPROVED",
        "estimated_value": deal.value / 100,  # Convert cents to dollars
        "deal_id": deal.id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Store in external API's contracts storage
    external_contracts_db[contract_id] = contract_data
    
    # Update deal with contract reference
    deal.contract_id = contract_id
    deals_db[deal.id] = deal
    
    # Send webhook
    webhook_event = WebhookEvent(
        type="contract.created",
        data={
            "deal_id": deal.id,
            "contract_id": contract_id,
            "contract_url": f"/contracts/{contract_id}"
        }
    )
    background_tasks.add_task(send_webhook, webhook_event)
    
    return contract_id


async def create_thread_for_lead(lead: ExternalLead, background_tasks: BackgroundTasks) -> str:
    """Auto-create communication thread for new lead"""
    from communication_routes import threads_db, messages_db, Thread, Message, Participant, ThreadType, ThreadStatus, MessageType, ParticipantRole
    
    thread_id = f"thread_{uuid.uuid4().hex[:12]}"
    
    thread = Thread(
        id=thread_id,
        title=f"Lead: {lead.name} ({lead.company or lead.email})",
        thread_type=ThreadType.LEAD,
        related_id=lead.id,
        description=f"Communication thread for lead {lead.name}",
        status=ThreadStatus.OPEN,
        participants=[
            Participant(
                user_id="system",
                name="Labyrinth System",
                role=ParticipantRole.OWNER
            )
        ],
        message_count=1,
        created_by="system",
        tags=["auto-created", f"source:{lead.source}"]
    )
    
    threads_db[thread_id] = thread
    
    # Add initial system message
    initial_message = Message(
        id=f"msg_{uuid.uuid4().hex[:8]}",
        thread_id=thread_id,
        sender_id="system",
        sender_name="Labyrinth System",
        content=f"Lead created from {lead.source}. Contact: {lead.email}",
        message_type=MessageType.SYSTEM
    )
    messages_db[thread_id] = [initial_message]
    
    # Update thread with message info
    thread.last_message_at = initial_message.created_at
    thread.last_message_preview = initial_message.content
    threads_db[thread_id] = thread
    
    # Update lead with thread reference
    lead.communication_thread_id = thread_id
    external_leads_db[lead.id] = lead
    
    return thread_id


async def check_sla_breach(task: Task, background_tasks: BackgroundTasks):
    """Check if task has breached SLA and send webhook"""
    if task.status == TaskStatus.COMPLETED or task.status == TaskStatus.CANCELLED:
        return
    
    if task.due_date and datetime.now(timezone.utc) > task.due_date:
        if not task.sla_breached:
            task.sla_breached = True
            task.sla_breach_at = datetime.now(timezone.utc)
            tasks_db[task.id] = task
            
            # Send webhook
            webhook_event = WebhookEvent(
                type="sla.breach",
                data={
                    "deal_id": task.deal_id,
                    "task_id": task.id,
                    "breach_type": "overdue",
                    "owner_id": task.owner_id,
                    "task_title": task.title,
                    "due_date": task.due_date.isoformat() if task.due_date else None
                }
            )
            background_tasks.add_task(send_webhook, webhook_event)


# ==================== DEAL ENDPOINTS ====================

@router.post("/deals", response_model=Deal)
async def create_deal(
    deal_data: DealCreate,
    background_tasks: BackgroundTasks,
    api_key: dict = Depends(verify_api_key)
):
    """Create a new deal from CRM"""
    deal = Deal(
        **deal_data.model_dump(exclude_none=True),
        created_at=deal_data.created_at or datetime.now(timezone.utc)
    )
    
    deals_db[deal.id] = deal
    
    # If partner is associated, update partner stats
    if deal.partner_id and deal.partner_id in partners_db:
        partner = partners_db[deal.partner_id]
        partner.total_deals += 1
        partner.updated_at = datetime.now(timezone.utc)
        partners_db[partner.id] = partner
    
    return deal


@router.get("/deals/{deal_id}", response_model=Deal)
async def get_deal(deal_id: str, api_key: dict = Depends(verify_api_key)):
    """Get a deal by ID"""
    if deal_id not in deals_db:
        raise HTTPException(status_code=404, detail="Deal not found")
    return deals_db[deal_id]


@router.patch("/deals/{deal_id}", response_model=Deal)
async def update_deal(
    deal_id: str,
    deal_update: DealUpdate,
    background_tasks: BackgroundTasks,
    api_key: dict = Depends(verify_api_key)
):
    """Update a deal - handles stage changes and won/lost status"""
    if deal_id not in deals_db:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    deal = deals_db[deal_id]
    update_data = deal_update.model_dump(exclude_none=True)
    
    # Handle status change (won/lost)
    if "status" in update_data:
        new_status = update_data["status"]
        if new_status == "won":
            deal.status = "won"
            deal.stage = DealStage.CLOSED_WON
            deal.closed_at = datetime.now(timezone.utc)
            
            # Auto-create contract
            contract_id = await create_contract_from_deal(deal, background_tasks)
            deal.contract_id = contract_id
            
        elif new_status == "lost":
            deal.status = "lost"
            deal.stage = DealStage.CLOSED_LOST
            deal.closed_at = datetime.now(timezone.utc)
            deal.close_reason = update_data.get("close_reason", "Not specified")
    
    # Handle stage change
    elif "stage" in update_data:
        new_stage = update_data["stage"]
        if isinstance(new_stage, str):
            new_stage = DealStage(new_stage)
        
        # Validate stage transition
        validation = check_stage_requirements(deal, new_stage)
        if not validation.allowed:
            raise HTTPException(
                status_code=400, 
                detail={
                    "message": validation.message,
                    "missing_requirements": validation.missing_requirements
                }
            )
        deal.stage = new_stage
    
    # Apply other updates
    for field, value in update_data.items():
        if field not in ["status", "stage"] and hasattr(deal, field):
            setattr(deal, field, value)
    
    deal.updated_at = datetime.now(timezone.utc)
    deals_db[deal_id] = deal
    
    return deal


@router.get("/deals/{deal_id}/validate-stage", response_model=StageValidationResult)
async def validate_stage_change(
    deal_id: str,
    next_stage: str,
    api_key: dict = Depends(verify_api_key)
):
    """Validate if a deal can move to the specified stage"""
    if deal_id not in deals_db:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    deal = deals_db[deal_id]
    
    try:
        target_stage = DealStage(next_stage)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid stage: {next_stage}")
    
    return check_stage_requirements(deal, target_stage)


# ==================== LEAD ENDPOINTS ====================

@router.post("/leads", response_model=ExternalLead)
async def create_lead(
    lead_data: ExternalLeadCreate,
    background_tasks: BackgroundTasks,
    api_key: dict = Depends(verify_api_key)
):
    """Create a new lead from CRM - auto-creates communication thread"""
    lead = ExternalLead(**lead_data.model_dump())
    external_leads_db[lead.id] = lead
    
    # Auto-create communication thread
    thread_id = await create_thread_for_lead(lead, background_tasks)
    lead.communication_thread_id = thread_id
    external_leads_db[lead.id] = lead
    
    return lead


@router.get("/leads/{lead_id}", response_model=ExternalLead)
async def get_lead(lead_id: str, api_key: dict = Depends(verify_api_key)):
    """Get a lead by ID"""
    if lead_id not in external_leads_db:
        raise HTTPException(status_code=404, detail="Lead not found")
    return external_leads_db[lead_id]


@router.patch("/leads/{lead_id}", response_model=ExternalLead)
async def update_lead(
    lead_id: str,
    lead_update: ExternalLeadUpdate,
    background_tasks: BackgroundTasks,
    api_key: dict = Depends(verify_api_key)
):
    """Update a lead - sends webhook when qualified"""
    if lead_id not in external_leads_db:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    lead = external_leads_db[lead_id]
    update_data = lead_update.model_dump(exclude_none=True)
    
    # Check for qualification
    was_qualified = lead.status == LeadStatus.QUALIFIED
    
    for field, value in update_data.items():
        if hasattr(lead, field):
            setattr(lead, field, value)
    
    lead.updated_at = datetime.now(timezone.utc)
    
    # If lead is newly qualified, send webhook
    if not was_qualified and lead.status == LeadStatus.QUALIFIED:
        lead.qualified_at = datetime.now(timezone.utc)
        
        webhook_event = WebhookEvent(
            type="lead.qualified",
            data={
                "lead_id": lead.id,
                "qualified_at": lead.qualified_at.isoformat()
            }
        )
        background_tasks.add_task(send_webhook, webhook_event)
    
    external_leads_db[lead_id] = lead
    return lead


# ==================== TASK ENDPOINTS ====================

@router.post("/tasks", response_model=Task)
async def create_task(
    task_data: TaskCreate,
    api_key: dict = Depends(verify_api_key)
):
    """Create a new task from CRM"""
    task = Task(**task_data.model_dump())
    tasks_db[task.id] = task
    return task


@router.get("/tasks/{task_id}", response_model=Task)
async def get_task(task_id: str, api_key: dict = Depends(verify_api_key)):
    """Get a task by ID"""
    if task_id not in tasks_db:
        raise HTTPException(status_code=404, detail="Task not found")
    return tasks_db[task_id]


@router.patch("/tasks/{task_id}", response_model=Task)
async def update_task(
    task_id: str,
    task_update: TaskUpdate,
    background_tasks: BackgroundTasks,
    api_key: dict = Depends(verify_api_key)
):
    """Update a task - sends webhook when completed"""
    if task_id not in tasks_db:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task = tasks_db[task_id]
    update_data = task_update.model_dump(exclude_none=True)
    
    was_completed = task.status == TaskStatus.COMPLETED
    
    for field, value in update_data.items():
        if hasattr(task, field):
            setattr(task, field, value)
    
    task.updated_at = datetime.now(timezone.utc)
    
    # If task is newly completed, send webhook
    if not was_completed and task.status == TaskStatus.COMPLETED:
        task.completed_at = datetime.now(timezone.utc)
        
        webhook_event = WebhookEvent(
            type="task.completed",
            data={
                "task_id": task.id,
                "deal_id": task.deal_id,
                "completed_at": task.completed_at.isoformat()
            }
        )
        background_tasks.add_task(send_webhook, webhook_event)
    
    # Check for SLA breach
    await check_sla_breach(task, background_tasks)
    
    tasks_db[task_id] = task
    return task


@router.get("/deals/{deal_id}/tasks", response_model=List[Task])
async def get_deal_tasks(deal_id: str, api_key: dict = Depends(verify_api_key)):
    """Get all tasks for a deal"""
    return [t for t in tasks_db.values() if t.deal_id == deal_id]


# ==================== PARTNER ENDPOINTS ====================

@router.post("/partners", response_model=Partner)
async def create_partner(
    partner_data: PartnerCreate,
    api_key: dict = Depends(verify_api_key)
):
    """Create a new partner/affiliate"""
    partner = Partner(**partner_data.model_dump())
    partners_db[partner.id] = partner
    return partner


@router.get("/partners/{partner_id}", response_model=Partner)
async def get_partner(partner_id: str, api_key: dict = Depends(verify_api_key)):
    """Get a partner by ID"""
    if partner_id not in partners_db:
        raise HTTPException(status_code=404, detail="Partner not found")
    return partners_db[partner_id]


@router.get("/partners", response_model=List[Partner])
async def list_partners(api_key: dict = Depends(verify_api_key)):
    """List all partners"""
    return list(partners_db.values())


# ==================== CONTRACTS ENDPOINTS ====================

@router.get("/contracts", response_model=List[dict])
async def list_contracts(api_key: dict = Depends(verify_api_key)):
    """List all contracts created from won deals"""
    return list(external_contracts_db.values())


@router.get("/contracts/{contract_id}")
async def get_contract(contract_id: str, api_key: dict = Depends(verify_api_key)):
    """Get a contract by ID"""
    if contract_id not in external_contracts_db:
        raise HTTPException(status_code=404, detail="Contract not found")
    return external_contracts_db[contract_id]


# ==================== KPI ENDPOINTS ====================

@router.get("/kpis", response_model=List[ExternalKPI])
async def get_kpis(api_key: dict = Depends(verify_api_key)):
    """Get KPIs for external display"""
    deals = list(deals_db.values())
    leads = list(external_leads_db.values())
    tasks = list(tasks_db.values())
    
    # Calculate KPIs
    total_pipeline = sum(d.value for d in deals if d.status == "open") / 100
    won_deals = [d for d in deals if d.status == "won"]
    total_won = sum(d.value for d in won_deals) / 100
    conversion_rate = (len(won_deals) / len(deals) * 100) if deals else 0
    
    qualified_leads = len([l for l in leads if l.status == LeadStatus.QUALIFIED])
    overdue_tasks = len([t for t in tasks if t.sla_breached])
    
    return [
        ExternalKPI(name="Total Pipeline", value=total_pipeline, unit="$", trend="up"),
        ExternalKPI(name="Closed Won", value=total_won, unit="$", trend="up"),
        ExternalKPI(name="Conversion Rate", value=round(conversion_rate, 1), unit="%", trend="stable"),
        ExternalKPI(name="Active Deals", value=len([d for d in deals if d.status == "open"]), trend="up"),
        ExternalKPI(name="Qualified Leads", value=qualified_leads, trend="up"),
        ExternalKPI(name="Overdue Tasks", value=overdue_tasks, trend="down" if overdue_tasks > 0 else "stable"),
    ]


# ==================== PIPELINE ENDPOINTS ====================

@router.get("/pipeline", response_model=PipelineStats)
async def get_pipeline(api_key: dict = Depends(verify_api_key)):
    """Get pipeline statistics"""
    deals = list(deals_db.values())
    
    stage_colors = {
        DealStage.DISCOVERY: "#64748B",
        DealStage.QUALIFICATION: "#3B82F6",
        DealStage.PROPOSAL: "#F59E0B",
        DealStage.NEGOTIATION: "#8B5CF6",
        DealStage.CLOSED_WON: "#22C55E",
        DealStage.CLOSED_LOST: "#EF4444"
    }
    
    stage_names = {
        DealStage.DISCOVERY: "Discovery",
        DealStage.QUALIFICATION: "Qualification",
        DealStage.PROPOSAL: "Proposal",
        DealStage.NEGOTIATION: "Negotiation",
        DealStage.CLOSED_WON: "Closed Won",
        DealStage.CLOSED_LOST: "Closed Lost"
    }
    
    stages = []
    for stage in DealStage:
        stage_deals = [d for d in deals if d.stage == stage]
        stages.append(PipelineStage(
            stage=stage.value,
            display_name=stage_names[stage],
            count=len(stage_deals),
            total_value=sum(d.value for d in stage_deals),
            color=stage_colors[stage]
        ))
    
    total_value = sum(d.value for d in deals)
    won_deals = [d for d in deals if d.status == "won"]
    lost_deals = [d for d in deals if d.status == "lost"]
    total_closed = len(won_deals) + len(lost_deals)
    
    return PipelineStats(
        stages=stages,
        total_deals=len(deals),
        total_value=total_value,
        avg_deal_size=total_value // len(deals) if deals else 0,
        conversion_rate=round(len(won_deals) / total_closed * 100, 1) if total_closed > 0 else 0
    )


# ==================== WEBHOOK CONFIGURATION ====================

@router.post("/webhooks/register")
async def register_webhook(
    url: str,
    events: List[str] = ["*"],
    api_key: dict = Depends(verify_api_key)
):
    """Register a webhook endpoint to receive events"""
    config = WebhookConfig(
        url=url,
        secret=WEBHOOK_SECRET,
        events=events
    )
    webhook_configs.append(config)
    
    return {
        "message": "Webhook registered",
        "url": url,
        "events": events,
        "signature_header": "X-Labyrinth-Signature",
        "note": "Use HMAC-SHA256 with provided secret to verify signatures"
    }


@router.get("/webhooks")
async def list_webhooks(api_key: dict = Depends(verify_api_key)):
    """List registered webhooks"""
    return [
        {
            "url": c.url,
            "events": c.events,
            "active": c.active,
            "created_at": c.created_at.isoformat()
        }
        for c in webhook_configs
    ]


@router.delete("/webhooks")
async def delete_webhook(url: str, api_key: dict = Depends(verify_api_key)):
    """Delete a webhook by URL"""
    global webhook_configs
    webhook_configs = [c for c in webhook_configs if c.url != url]
    return {"message": "Webhook deleted"}


# ==================== SEED DATA ====================

@router.post("/seed-demo")
async def seed_demo_data(api_key: dict = Depends(verify_api_key)):
    """Seed demo data for testing"""
    # Clear existing
    deals_db.clear()
    external_leads_db.clear()
    tasks_db.clear()
    partners_db.clear()
    
    # Create demo partner
    partner = Partner(
        id="partner_demo1",
        name="Strategic Partners Inc",
        email="partners@strategic.com",
        company="Strategic Partners Inc",
        commission_rate=15.0,
        tier="gold",
        total_referrals=5,
        total_deals=3,
        total_commission=7500.0
    )
    partners_db[partner.id] = partner
    
    # Create demo leads
    leads = [
        ExternalLead(
            id="lead_demo1",
            name="John Smith",
            email="john@acmecorp.com",
            company="Acme Corp",
            source="website",
            tier="gold",
            status=LeadStatus.QUALIFIED
        ),
        ExternalLead(
            id="lead_demo2",
            name="Sarah Johnson",
            email="sarah@techstart.io",
            company="TechStart",
            source="referral",
            tier="silver",
            status=LeadStatus.NEW
        )
    ]
    for lead in leads:
        external_leads_db[lead.id] = lead
    
    # Create demo deals
    deals = [
        Deal(
            id="deal_demo1",
            name="Acme Corp - Enterprise Package",
            value=50000000,  # $500,000
            stage=DealStage.NEGOTIATION,
            lead_id="lead_demo1",
            owner_id="user_sales1",
            partner_id="partner_demo1"
        ),
        Deal(
            id="deal_demo2",
            name="TechStart - Starter Package",
            value=1500000,  # $15,000
            stage=DealStage.QUALIFICATION,
            lead_id="lead_demo2",
            owner_id="user_sales1"
        ),
        Deal(
            id="deal_demo3",
            name="GlobalTrade - Pro Package",
            value=7500000,  # $75,000
            stage=DealStage.CLOSED_WON,
            status="won",
            owner_id="user_sales2"
        )
    ]
    for deal in deals:
        deals_db[deal.id] = deal
    
    # Create demo tasks
    tasks = [
        Task(
            id="task_demo1",
            title="Discovery Call with Acme",
            deal_id="deal_demo1",
            owner_id="user_sales1",
            priority=TaskPriority.HIGH,
            status=TaskStatus.COMPLETED,
            completed_at=datetime.now(timezone.utc) - timedelta(days=5)
        ),
        Task(
            id="task_demo2",
            title="Budget Confirmation",
            deal_id="deal_demo1",
            owner_id="user_sales1",
            priority=TaskPriority.HIGH,
            status=TaskStatus.COMPLETED,
            completed_at=datetime.now(timezone.utc) - timedelta(days=3)
        ),
        Task(
            id="task_demo3",
            title="Create Proposal for Acme",
            deal_id="deal_demo1",
            owner_id="user_sales1",
            priority=TaskPriority.URGENT,
            status=TaskStatus.IN_PROGRESS,
            due_date=datetime.now(timezone.utc) + timedelta(days=2)
        ),
        Task(
            id="task_demo4",
            title="Follow up with TechStart",
            deal_id="deal_demo2",
            owner_id="user_sales1",
            priority=TaskPriority.MEDIUM,
            status=TaskStatus.PENDING,
            due_date=datetime.now(timezone.utc) - timedelta(hours=2),  # Overdue
            sla_breached=True,
            sla_breach_at=datetime.now(timezone.utc)
        )
    ]
    for task in tasks:
        tasks_db[task.id] = task
    
    # Persist to MongoDB
    await deals_collection.delete_many({})
    await external_leads_collection.delete_many({})
    await tasks_collection.delete_many({})
    await partners_collection.delete_many({})
    
    for deal in deals_db.values():
        await deals_collection.insert_one(deal_to_dict(deal))
    
    for lead in external_leads_db.values():
        await external_leads_collection.insert_one(lead_to_dict(lead))
    
    for task in tasks_db.values():
        await tasks_collection.insert_one(task_to_dict(task))
    
    for partner_item in partners_db.values():
        await partners_collection.insert_one(partner_to_dict(partner_item))
    
    return {
        "message": "Demo data seeded to MongoDB",
        "counts": {
            "deals": len(deals_db),
            "leads": len(external_leads_db),
            "tasks": len(tasks_db),
            "partners": len(partners_db)
        }
    }
