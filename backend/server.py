"""
Labyrinth Operating System - FastAPI Server
7-Gate Constraint System for Elev8 Matrix
"""

from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid

from models import (
    # Enums
    FunctionType, LevelType, GateType, GateStatus, AlertStatus, ClientPackage,
    # Playbook
    Playbook, PlaybookCreate,
    # SOP
    SOP, SOPCreate, SOPStep,
    # Talent
    Talent, TalentCreate, CompetencyScores,
    # Contract
    Contract, ContractCreate, ContractBoundary,
    # KPI
    KPI, KPICreate, KPIThresholds, KPIValue, KPIValueCreate, KPIValueRecord,
    # Gate
    GateExecutionRequest, GateExecutionResult, GateLog,
    # Alert
    Alert, AlertCreate,
    # Platform
    PlatformCredentials, PlatformCredentialsCreate,
    # Workflow
    WorkflowExecution, WorkflowExecutionCreate,
    # Dashboard
    DashboardStats, FunctionStats
)

from gate_logic import gate_engine, LabyrinthGateEngine
from seed_data import get_playbooks, get_sops, get_kpis
from workflow_routes import workflow_router, set_db as set_workflow_db
from settings_routes import settings_router, set_db as set_settings_db
from ai_routes import ai_router, set_db as set_ai_db
from bulk_routes import bulk_router, set_db as set_bulk_db
from labyrinth_builder_routes import builder_router
from role_routes import router as role_router
from contract_lifecycle_routes import router as lifecycle_router
from sales_crm_routes import router as sales_router
from affiliate_crm_routes import router as affiliate_router
from communication_routes import router as communication_router

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'labyrinth_db')]

# Set DB for workflow routes
set_workflow_db(db)
set_settings_db(db)
set_ai_db(db)
set_bulk_db(db)

# Create the main app
app = FastAPI(title="Labyrinth Operating System + WorkflowViz", version="1.0.0")

# Create routers
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ==================== HELPER FUNCTIONS ====================

def serialize_datetime(obj):
    """Convert datetime objects to ISO format strings"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    return obj


def serialize_doc(doc: dict) -> dict:
    """Serialize document for MongoDB storage"""
    result = {}
    for key, value in doc.items():
        if isinstance(value, datetime):
            result[key] = value.isoformat()
        elif isinstance(value, dict):
            result[key] = serialize_doc(value)
        elif isinstance(value, list):
            result[key] = [serialize_doc(v) if isinstance(v, dict) else serialize_datetime(v) for v in value]
        else:
            result[key] = value
    return result


def deserialize_datetime(doc: dict) -> dict:
    """Convert ISO format strings back to datetime objects"""
    datetime_fields = ['created_at', 'updated_at', 'executed_at', 'resolved_at', 'recorded_at', 
                       'start_date', 'end_date', 'started_at', 'completed_at', 'last_verified']
    for field in datetime_fields:
        if field in doc and isinstance(doc[field], str):
            try:
                doc[field] = datetime.fromisoformat(doc[field])
            except ValueError:
                pass
    return doc


# ==================== ROOT ENDPOINT ====================

@api_router.get("/")
async def root():
    return {"message": "Labyrinth Operating System API", "version": "1.0.0"}


@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}


# ==================== SEEDING ENDPOINTS ====================

@api_router.post("/seed/all")
async def seed_all_data():
    """Seed all playbooks, SOPs, and KPIs from specification"""
    results = {
        "playbooks": 0,
        "sops": 0,
        "kpis": 0
    }
    
    # Seed playbooks
    playbooks = get_playbooks()
    for pb_create in playbooks:
        existing = await db.playbooks.find_one({"playbook_id": pb_create.playbook_id})
        if not existing:
            pb = Playbook(**pb_create.model_dump())
            doc = serialize_doc(pb.model_dump())
            await db.playbooks.insert_one(doc)
            results["playbooks"] += 1
    
    # Seed SOPs
    sops = get_sops()
    for sop_create in sops:
        existing = await db.sops.find_one({"sop_id": sop_create.sop_id})
        if not existing:
            sop = SOP(**sop_create.model_dump())
            doc = serialize_doc(sop.model_dump())
            await db.sops.insert_one(doc)
            results["sops"] += 1
    
    # Seed KPIs
    kpis = get_kpis()
    for kpi_create in kpis:
        existing = await db.kpis.find_one({"kpi_id": kpi_create.kpi_id})
        if not existing:
            kpi = KPI(**kpi_create.model_dump())
            doc = serialize_doc(kpi.model_dump())
            await db.kpis.insert_one(doc)
            results["kpis"] += 1
    
    return {"message": "Seeding complete", "created": results}


# ==================== PLAYBOOK ENDPOINTS ====================

@api_router.get("/playbooks", response_model=List[Playbook])
async def get_playbooks_list(
    function: Optional[FunctionType] = None,
    level: Optional[LevelType] = None,
    min_tier: Optional[int] = None,
    is_active: Optional[bool] = True
):
    """Get all playbooks with optional filtering"""
    query = {}
    if function:
        query["function"] = function.value
    if level:
        query["level"] = level.value
    if min_tier:
        query["min_tier"] = {"$lte": min_tier}
    if is_active is not None:
        query["is_active"] = is_active
    
    playbooks = await db.playbooks.find(query, {"_id": 0}).to_list(1000)
    return [deserialize_datetime(pb) for pb in playbooks]


@api_router.get("/playbooks/{playbook_id}", response_model=Playbook)
async def get_playbook(playbook_id: str):
    """Get a specific playbook by ID"""
    playbook = await db.playbooks.find_one({"playbook_id": playbook_id}, {"_id": 0})
    if not playbook:
        raise HTTPException(status_code=404, detail="Playbook not found")
    return deserialize_datetime(playbook)


@api_router.post("/playbooks", response_model=Playbook)
async def create_playbook(playbook_create: PlaybookCreate):
    """Create a new playbook"""
    existing = await db.playbooks.find_one({"playbook_id": playbook_create.playbook_id})
    if existing:
        raise HTTPException(status_code=400, detail="Playbook ID already exists")
    
    playbook = Playbook(**playbook_create.model_dump())
    doc = serialize_doc(playbook.model_dump())
    await db.playbooks.insert_one(doc)
    return playbook


@api_router.put("/playbooks/{playbook_id}", response_model=Playbook)
async def update_playbook(playbook_id: str, playbook_update: PlaybookCreate):
    """Update an existing playbook"""
    existing = await db.playbooks.find_one({"playbook_id": playbook_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Playbook not found")
    
    update_data = playbook_update.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.playbooks.update_one(
        {"playbook_id": playbook_id},
        {"$set": update_data}
    )
    
    updated = await db.playbooks.find_one({"playbook_id": playbook_id}, {"_id": 0})
    return deserialize_datetime(updated)


@api_router.delete("/playbooks/{playbook_id}")
async def delete_playbook(playbook_id: str):
    """Soft delete a playbook"""
    result = await db.playbooks.update_one(
        {"playbook_id": playbook_id},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Playbook not found")
    return {"message": "Playbook deactivated"}


# ==================== SOP ENDPOINTS ====================

@api_router.get("/sops")
async def get_sops_list(
    function: Optional[str] = None,
    playbook_id: Optional[str] = None,
    is_active: Optional[bool] = True
):
    """Get all SOPs with optional filtering. Returns unified data from builder and original SOPs."""
    query = {}
    if function:
        query["function"] = function
    if playbook_id:
        query["linked_playbook_ids"] = playbook_id
    if is_active is not None:
        query["is_active"] = is_active
    
    sops = await db.sops.find(query, {"_id": 0}).to_list(1000)
    return [deserialize_datetime(sop) for sop in sops]


@api_router.get("/sops/{sop_id}", response_model=SOP)
async def get_sop(sop_id: str):
    """Get a specific SOP by ID"""
    sop = await db.sops.find_one({"sop_id": sop_id}, {"_id": 0})
    if not sop:
        raise HTTPException(status_code=404, detail="SOP not found")
    return deserialize_datetime(sop)


@api_router.post("/sops", response_model=SOP)
async def create_sop(sop_create: SOPCreate):
    """Create a new SOP"""
    existing = await db.sops.find_one({"sop_id": sop_create.sop_id})
    if existing:
        raise HTTPException(status_code=400, detail="SOP ID already exists")
    
    sop = SOP(**sop_create.model_dump())
    doc = serialize_doc(sop.model_dump())
    await db.sops.insert_one(doc)
    return sop


@api_router.put("/sops/{sop_id}", response_model=SOP)
async def update_sop(sop_id: str, sop_update: SOPCreate):
    """Update an existing SOP"""
    existing = await db.sops.find_one({"sop_id": sop_id})
    if not existing:
        raise HTTPException(status_code=404, detail="SOP not found")
    
    update_data = sop_update.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Serialize steps
    if "steps" in update_data:
        update_data["steps"] = [s if isinstance(s, dict) else s.model_dump() for s in update_data["steps"]]
    
    await db.sops.update_one(
        {"sop_id": sop_id},
        {"$set": update_data}
    )
    
    updated = await db.sops.find_one({"sop_id": sop_id}, {"_id": 0})
    return deserialize_datetime(updated)


@api_router.delete("/sops/{sop_id}")
async def delete_sop(sop_id: str):
    """Soft delete an SOP"""
    result = await db.sops.update_one(
        {"sop_id": sop_id},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="SOP not found")
    return {"message": "SOP deactivated"}


# ==================== TALENT ENDPOINTS ====================

@api_router.get("/talents", response_model=List[Talent])
async def get_talents_list(
    function: Optional[FunctionType] = None,
    min_tier: Optional[int] = None,
    max_tier: Optional[int] = None,
    is_active: Optional[bool] = True
):
    """Get all talents with optional filtering"""
    query = {}
    if function:
        query["function"] = function.value
    if min_tier:
        query["current_tier"] = {"$gte": min_tier}
    if max_tier:
        if "current_tier" in query:
            query["current_tier"]["$lte"] = max_tier
        else:
            query["current_tier"] = {"$lte": max_tier}
    if is_active is not None:
        query["is_active"] = is_active
    
    talents = await db.talents.find(query, {"_id": 0}).to_list(1000)
    return [deserialize_datetime(t) for t in talents]


@api_router.get("/talents/{talent_id}", response_model=Talent)
async def get_talent(talent_id: str):
    """Get a specific talent by ID"""
    talent = await db.talents.find_one({"id": talent_id}, {"_id": 0})
    if not talent:
        raise HTTPException(status_code=404, detail="Talent not found")
    return deserialize_datetime(talent)


@api_router.post("/talents", response_model=Talent)
async def create_talent(talent_create: TalentCreate):
    """Create a new talent profile"""
    talent = Talent(**talent_create.model_dump())
    
    # Calculate tier from competency scores
    tier, score = gate_engine.calculate_talent_tier(talent.competency_scores.model_dump())
    talent.current_tier = tier
    talent.tier_score = score
    
    doc = serialize_doc(talent.model_dump())
    await db.talents.insert_one(doc)
    return talent


@api_router.put("/talents/{talent_id}", response_model=Talent)
async def update_talent(talent_id: str, talent_update: TalentCreate):
    """Update an existing talent"""
    existing = await db.talents.find_one({"id": talent_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Talent not found")
    
    update_data = talent_update.model_dump()
    
    # Recalculate tier
    tier, score = gate_engine.calculate_talent_tier(update_data["competency_scores"])
    update_data["current_tier"] = tier
    update_data["tier_score"] = score
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.talents.update_one(
        {"id": talent_id},
        {"$set": update_data}
    )
    
    updated = await db.talents.find_one({"id": talent_id}, {"_id": 0})
    return deserialize_datetime(updated)


@api_router.delete("/talents/{talent_id}")
async def delete_talent(talent_id: str):
    """Soft delete a talent"""
    result = await db.talents.update_one(
        {"id": talent_id},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Talent not found")
    return {"message": "Talent deactivated"}


@api_router.post("/talents/{talent_id}/recalculate-tier", response_model=Talent)
async def recalculate_talent_tier(talent_id: str):
    """Recalculate a talent's tier based on current competency scores"""
    talent = await db.talents.find_one({"id": talent_id}, {"_id": 0})
    if not talent:
        raise HTTPException(status_code=404, detail="Talent not found")
    
    tier, score = gate_engine.calculate_talent_tier(talent["competency_scores"])
    
    await db.talents.update_one(
        {"id": talent_id},
        {"$set": {
            "current_tier": tier,
            "tier_score": score,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    updated = await db.talents.find_one({"id": talent_id}, {"_id": 0})
    return deserialize_datetime(updated)


# ==================== CONTRACT ENDPOINTS ====================

@api_router.get("/contracts")
async def get_contracts_list(
    talent_id: Optional[str] = None,
    client_package: Optional[str] = None,
    is_active: Optional[bool] = True
):
    """Get all contracts with optional filtering. Returns unified data from builder and original contracts."""
    query = {}
    if talent_id:
        query["talent_id"] = talent_id
    if client_package:
        query["client_package"] = client_package
    if is_active is not None:
        query["is_active"] = is_active
    
    contracts = await db.contracts.find(query, {"_id": 0}).to_list(1000)
    return [deserialize_datetime(c) for c in contracts]


@api_router.get("/contracts/{contract_id}", response_model=Contract)
async def get_contract(contract_id: str):
    """Get a specific contract by ID"""
    contract = await db.contracts.find_one({"id": contract_id}, {"_id": 0})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    return deserialize_datetime(contract)


@api_router.post("/contracts", response_model=Contract)
async def create_contract(contract_create: ContractCreate):
    """Create a new contract"""
    # Verify talent exists
    talent = await db.talents.find_one({"id": contract_create.talent_id})
    if not talent:
        raise HTTPException(status_code=404, detail="Talent not found")
    
    contract = Contract(**contract_create.model_dump())
    doc = serialize_doc(contract.model_dump())
    await db.contracts.insert_one(doc)
    return contract


@api_router.put("/contracts/{contract_id}", response_model=Contract)
async def update_contract(contract_id: str, contract_update: ContractCreate):
    """Update an existing contract"""
    existing = await db.contracts.find_one({"id": contract_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    update_data = contract_update.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Handle nested objects
    if "boundaries" in update_data and not isinstance(update_data["boundaries"], dict):
        update_data["boundaries"] = update_data["boundaries"].model_dump()
    if "start_date" in update_data:
        update_data["start_date"] = serialize_datetime(update_data["start_date"])
    if "end_date" in update_data and update_data["end_date"]:
        update_data["end_date"] = serialize_datetime(update_data["end_date"])
    
    await db.contracts.update_one(
        {"id": contract_id},
        {"$set": update_data}
    )
    
    updated = await db.contracts.find_one({"id": contract_id}, {"_id": 0})
    return deserialize_datetime(updated)


@api_router.delete("/contracts/{contract_id}")
async def delete_contract(contract_id: str):
    """Soft delete a contract"""
    result = await db.contracts.update_one(
        {"id": contract_id},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Contract not found")
    return {"message": "Contract deactivated"}


# ==================== KPI ENDPOINTS ====================

@api_router.get("/kpis")
async def get_kpis_list(
    function: Optional[str] = None,
    is_active: Optional[bool] = True
):
    """Get all KPIs with optional filtering. Returns raw data without strict validation."""
    query = {}
    if function:
        query["function"] = function
    if is_active is not None:
        query["is_active"] = is_active
    
    kpis = await db.kpis.find(query, {"_id": 0}).to_list(1000)
    return [deserialize_datetime(k) for k in kpis]


@api_router.get("/kpis/{kpi_id}", response_model=KPI)
async def get_kpi(kpi_id: str):
    """Get a specific KPI by ID"""
    kpi = await db.kpis.find_one({"kpi_id": kpi_id}, {"_id": 0})
    if not kpi:
        raise HTTPException(status_code=404, detail="KPI not found")
    return deserialize_datetime(kpi)


@api_router.post("/kpis", response_model=KPI)
async def create_kpi(kpi_create: KPICreate):
    """Create a new KPI"""
    existing = await db.kpis.find_one({"kpi_id": kpi_create.kpi_id})
    if existing:
        raise HTTPException(status_code=400, detail="KPI ID already exists")
    
    kpi = KPI(**kpi_create.model_dump())
    doc = serialize_doc(kpi.model_dump())
    await db.kpis.insert_one(doc)
    return kpi


@api_router.put("/kpis/{kpi_id}", response_model=KPI)
async def update_kpi(kpi_id: str, kpi_update: KPICreate):
    """Update an existing KPI"""
    existing = await db.kpis.find_one({"kpi_id": kpi_id})
    if not existing:
        raise HTTPException(status_code=404, detail="KPI not found")
    
    update_data = kpi_update.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    if "thresholds" in update_data and not isinstance(update_data["thresholds"], dict):
        update_data["thresholds"] = update_data["thresholds"].model_dump()
    
    await db.kpis.update_one(
        {"kpi_id": kpi_id},
        {"$set": update_data}
    )
    
    updated = await db.kpis.find_one({"kpi_id": kpi_id}, {"_id": 0})
    return deserialize_datetime(updated)


@api_router.delete("/kpis/{kpi_id}")
async def delete_kpi(kpi_id: str):
    """Soft delete a KPI"""
    result = await db.kpis.update_one(
        {"kpi_id": kpi_id},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="KPI not found")
    return {"message": "KPI deactivated"}


# ==================== KPI VALUE TRACKING ====================

@api_router.post("/kpi-values", response_model=KPIValueRecord)
async def record_kpi_value(kpi_value: KPIValueCreate):
    """Record a KPI value measurement"""
    # Get KPI definition
    kpi = await db.kpis.find_one({"kpi_id": kpi_value.kpi_id}, {"_id": 0})
    if not kpi:
        raise HTTPException(status_code=404, detail="KPI not found")
    
    # Calculate status
    thresholds = kpi["thresholds"]
    current = kpi_value.current_value
    status = AlertStatus.GREEN
    
    if thresholds["is_higher_better"]:
        if current < thresholds["red_threshold"]:
            status = AlertStatus.RED
        elif current < thresholds["yellow_threshold"]:
            status = AlertStatus.YELLOW
    else:
        if current > thresholds["red_threshold"]:
            status = AlertStatus.RED
        elif current > thresholds["yellow_threshold"]:
            status = AlertStatus.YELLOW
    
    record = KPIValueRecord(
        kpi_id=kpi_value.kpi_id,
        function=FunctionType(kpi["function"]),
        current_value=current,
        target_value=thresholds["target"],
        status=status,
        notes=kpi_value.notes
    )
    
    doc = serialize_doc(record.model_dump())
    await db.kpi_values.insert_one(doc)
    
    # Create alert if needed
    if status in [AlertStatus.YELLOW, AlertStatus.RED]:
        alert = Alert(
            alert_type="KPI_DRIFT",
            severity=status,
            function=FunctionType(kpi["function"]),
            title=f"KPI Alert: {kpi['name']}",
            message=f"{kpi['name']} is at {current}{kpi['unit']} (target: {thresholds['target']}{kpi['unit']})",
            details={
                "kpi_id": kpi_value.kpi_id,
                "current_value": current,
                "target": thresholds["target"]
            }
        )
        await db.alerts.insert_one(serialize_doc(alert.model_dump()))
    
    return record


@api_router.get("/kpi-values", response_model=List[KPIValueRecord])
async def get_kpi_values(
    kpi_id: Optional[str] = None,
    function: Optional[FunctionType] = None,
    limit: int = Query(default=100, le=1000)
):
    """Get KPI value history"""
    query = {}
    if kpi_id:
        query["kpi_id"] = kpi_id
    if function:
        query["function"] = function.value
    
    values = await db.kpi_values.find(query, {"_id": 0}).sort("recorded_at", -1).to_list(limit)
    return [deserialize_datetime(v) for v in values]


# ==================== GATE EXECUTION ENDPOINTS ====================

@api_router.post("/gates/execute/strategy", response_model=GateExecutionResult)
async def execute_gate_1(client_package: ClientPackage):
    """Execute Gate 1: Strategy Selection"""
    result = gate_engine.execute_gate_1_strategy(client_package)
    
    # Log gate execution
    log = gate_engine.create_gate_log(result, request_context={"client_package": client_package.value})
    await db.gate_logs.insert_one(serialize_doc(log.model_dump()))
    
    return result


@api_router.post("/gates/execute/level", response_model=GateExecutionResult)
async def execute_gate_2(client_package: ClientPackage, level: LevelType):
    """Execute Gate 2: Level Selection"""
    result = gate_engine.execute_gate_2_level(client_package, level)
    
    log = gate_engine.create_gate_log(result, request_context={
        "client_package": client_package.value,
        "level": level.value
    })
    await db.gate_logs.insert_one(serialize_doc(log.model_dump()))
    
    return result


@api_router.post("/gates/execute/playbook", response_model=GateExecutionResult)
async def execute_gate_3(playbook_id: str, level: LevelType, function: FunctionType):
    """Execute Gate 3: Playbook Selection"""
    playbook_doc = await db.playbooks.find_one({"playbook_id": playbook_id}, {"_id": 0})
    if not playbook_doc:
        raise HTTPException(status_code=404, detail="Playbook not found")
    
    playbook = Playbook(**deserialize_datetime(playbook_doc))
    result = gate_engine.execute_gate_3_playbook(playbook, level, function)
    
    log = gate_engine.create_gate_log(result, playbook_id=playbook_id, request_context={
        "level": level.value,
        "function": function.value
    })
    await db.gate_logs.insert_one(serialize_doc(log.model_dump()))
    
    return result


@api_router.post("/gates/execute/talent-matching", response_model=GateExecutionResult)
async def execute_gate_4(talent_id: str, playbook_id: str):
    """Execute Gate 4: Talent Matching (CRITICAL)"""
    talent_doc = await db.talents.find_one({"id": talent_id}, {"_id": 0})
    if not talent_doc:
        raise HTTPException(status_code=404, detail="Talent not found")
    
    playbook_doc = await db.playbooks.find_one({"playbook_id": playbook_id}, {"_id": 0})
    if not playbook_doc:
        raise HTTPException(status_code=404, detail="Playbook not found")
    
    talent = Talent(**deserialize_datetime(talent_doc))
    playbook = Playbook(**deserialize_datetime(playbook_doc))
    
    result, alert = gate_engine.execute_gate_4_talent_matching(talent, playbook)
    
    # Log gate execution
    log = gate_engine.create_gate_log(result, talent_id=talent_id, playbook_id=playbook_id)
    await db.gate_logs.insert_one(serialize_doc(log.model_dump()))
    
    # Create alert if blocked
    if alert:
        alert_obj = Alert(**alert.model_dump())
        await db.alerts.insert_one(serialize_doc(alert_obj.model_dump()))
    
    return result


@api_router.post("/gates/execute/sop-activation", response_model=GateExecutionResult)
async def execute_gate_5(playbook_id: str):
    """Execute Gate 5: SOP Activation"""
    playbook_doc = await db.playbooks.find_one({"playbook_id": playbook_id}, {"_id": 0})
    if not playbook_doc:
        raise HTTPException(status_code=404, detail="Playbook not found")
    
    playbook = Playbook(**deserialize_datetime(playbook_doc))
    
    # Get all SOPs
    sops_docs = await db.sops.find({}, {"_id": 0}).to_list(1000)
    sops = [SOP(**deserialize_datetime(s)) for s in sops_docs]
    
    result = gate_engine.execute_gate_5_sop_activation(playbook, sops)
    
    log = gate_engine.create_gate_log(result, playbook_id=playbook_id)
    await db.gate_logs.insert_one(serialize_doc(log.model_dump()))
    
    return result


@api_router.post("/gates/execute/contract", response_model=GateExecutionResult)
async def execute_gate_6(talent_id: str, playbook_id: str):
    """Execute Gate 6: Contract Enforcement"""
    talent_doc = await db.talents.find_one({"id": talent_id}, {"_id": 0})
    if not talent_doc:
        raise HTTPException(status_code=404, detail="Talent not found")
    
    playbook_doc = await db.playbooks.find_one({"playbook_id": playbook_id}, {"_id": 0})
    if not playbook_doc:
        raise HTTPException(status_code=404, detail="Playbook not found")
    
    talent = Talent(**deserialize_datetime(talent_doc))
    playbook = Playbook(**deserialize_datetime(playbook_doc))
    
    # Find active contract for talent
    contract_doc = await db.contracts.find_one({"talent_id": talent_id, "is_active": True}, {"_id": 0})
    contract = Contract(**deserialize_datetime(contract_doc)) if contract_doc else None
    
    result, alert = gate_engine.execute_gate_6_contract(talent, playbook, contract)
    
    log = gate_engine.create_gate_log(result, talent_id=talent_id, playbook_id=playbook_id)
    await db.gate_logs.insert_one(serialize_doc(log.model_dump()))
    
    if alert:
        alert_obj = Alert(**alert.model_dump())
        await db.alerts.insert_one(serialize_doc(alert_obj.model_dump()))
    
    return result


@api_router.post("/gates/execute/kpi-feedback", response_model=GateExecutionResult)
async def execute_gate_7(function: FunctionType):
    """Execute Gate 7: KPI Feedback Loop"""
    # Get all KPIs for function
    kpis_docs = await db.kpis.find({"function": function.value}, {"_id": 0}).to_list(100)
    kpis = [KPI(**deserialize_datetime(k)) for k in kpis_docs]
    
    # Get latest KPI values
    kpi_values = {}
    for kpi in kpis:
        latest = await db.kpi_values.find_one(
            {"kpi_id": kpi.kpi_id},
            {"_id": 0},
            sort=[("recorded_at", -1)]
        )
        if latest:
            kpi_values[kpi.kpi_id] = latest["current_value"]
    
    result, alerts = gate_engine.execute_gate_7_kpi_feedback(function, kpis, kpi_values)
    
    log = gate_engine.create_gate_log(result, request_context={"function": function.value})
    await db.gate_logs.insert_one(serialize_doc(log.model_dump()))
    
    # Create alerts
    for alert_create in alerts:
        alert_obj = Alert(**alert_create.model_dump())
        await db.alerts.insert_one(serialize_doc(alert_obj.model_dump()))
    
    return result


# ==================== FULL WORKFLOW EXECUTION ====================

@api_router.post("/gates/execute/full-workflow")
async def execute_full_workflow(
    client_package: ClientPackage,
    level: LevelType,
    function: FunctionType,
    playbook_id: str,
    talent_id: str
):
    """Execute all 7 gates in sequence"""
    results = []
    alerts_created = []
    
    # Gate 1: Strategy Selection
    result1 = gate_engine.execute_gate_1_strategy(client_package)
    results.append({"gate": "STRATEGY_SELECTION", "result": result1.model_dump()})
    if result1.status == GateStatus.BLOCKED:
        return {"status": "BLOCKED", "blocked_at": "STRATEGY_SELECTION", "results": results, "alerts": alerts_created}
    
    # Gate 2: Level Selection
    result2 = gate_engine.execute_gate_2_level(client_package, level)
    results.append({"gate": "LEVEL_SELECTION", "result": result2.model_dump()})
    if result2.status == GateStatus.BLOCKED:
        return {"status": "BLOCKED", "blocked_at": "LEVEL_SELECTION", "results": results, "alerts": alerts_created}
    
    # Gate 3: Playbook Selection
    playbook_doc = await db.playbooks.find_one({"playbook_id": playbook_id}, {"_id": 0})
    if not playbook_doc:
        return {"status": "ERROR", "message": "Playbook not found", "results": results}
    playbook = Playbook(**deserialize_datetime(playbook_doc))
    
    result3 = gate_engine.execute_gate_3_playbook(playbook, level, function)
    results.append({"gate": "PLAYBOOK_SELECTION", "result": result3.model_dump()})
    if result3.status == GateStatus.BLOCKED:
        return {"status": "BLOCKED", "blocked_at": "PLAYBOOK_SELECTION", "results": results, "alerts": alerts_created}
    
    # Gate 4: Talent Matching
    talent_doc = await db.talents.find_one({"id": talent_id}, {"_id": 0})
    if not talent_doc:
        return {"status": "ERROR", "message": "Talent not found", "results": results}
    talent = Talent(**deserialize_datetime(talent_doc))
    
    result4, alert4 = gate_engine.execute_gate_4_talent_matching(talent, playbook)
    results.append({"gate": "TALENT_MATCHING", "result": result4.model_dump()})
    if alert4:
        alert_obj = Alert(**alert4.model_dump())
        await db.alerts.insert_one(serialize_doc(alert_obj.model_dump()))
        alerts_created.append(alert4.model_dump())
    if result4.status == GateStatus.BLOCKED:
        return {"status": "BLOCKED", "blocked_at": "TALENT_MATCHING", "results": results, "alerts": alerts_created}
    
    # Gate 5: SOP Activation
    sops_docs = await db.sops.find({}, {"_id": 0}).to_list(1000)
    sops = [SOP(**deserialize_datetime(s)) for s in sops_docs]
    
    result5 = gate_engine.execute_gate_5_sop_activation(playbook, sops)
    results.append({"gate": "SOP_ACTIVATION", "result": result5.model_dump()})
    if result5.status == GateStatus.BLOCKED:
        return {"status": "BLOCKED", "blocked_at": "SOP_ACTIVATION", "results": results, "alerts": alerts_created}
    
    # Gate 6: Contract Enforcement
    contract_doc = await db.contracts.find_one({"talent_id": talent_id, "is_active": True}, {"_id": 0})
    contract = Contract(**deserialize_datetime(contract_doc)) if contract_doc else None
    
    result6, alert6 = gate_engine.execute_gate_6_contract(talent, playbook, contract)
    results.append({"gate": "CONTRACT_ENFORCEMENT", "result": result6.model_dump()})
    if alert6:
        alert_obj = Alert(**alert6.model_dump())
        await db.alerts.insert_one(serialize_doc(alert_obj.model_dump()))
        alerts_created.append(alert6.model_dump())
    if result6.status == GateStatus.BLOCKED:
        return {"status": "BLOCKED", "blocked_at": "CONTRACT_ENFORCEMENT", "results": results, "alerts": alerts_created}
    
    # Gate 7: KPI Feedback
    kpis_docs = await db.kpis.find({"function": function.value}, {"_id": 0}).to_list(100)
    kpis = [KPI(**deserialize_datetime(k)) for k in kpis_docs]
    
    kpi_values = {}
    for kpi in kpis:
        latest = await db.kpi_values.find_one({"kpi_id": kpi.kpi_id}, {"_id": 0}, sort=[("recorded_at", -1)])
        if latest:
            kpi_values[kpi.kpi_id] = latest["current_value"]
    
    result7, alerts7 = gate_engine.execute_gate_7_kpi_feedback(function, kpis, kpi_values)
    results.append({"gate": "KPI_FEEDBACK", "result": result7.model_dump()})
    for alert_create in alerts7:
        alert_obj = Alert(**alert_create.model_dump())
        await db.alerts.insert_one(serialize_doc(alert_obj.model_dump()))
        alerts_created.append(alert_create.model_dump())
    
    # All gates passed
    return {
        "status": "COMPLETED" if result7.status == GateStatus.PASSED else "WARNING",
        "results": results,
        "alerts": alerts_created,
        "summary": {
            "playbook": playbook.name,
            "talent": talent.name,
            "activated_sops": result5.details.get("activated_sops", []),
            "kpi_status": result7.details
        }
    }


# ==================== ALERT ENDPOINTS ====================

@api_router.get("/alerts", response_model=List[Alert])
async def get_alerts(
    alert_type: Optional[str] = None,
    severity: Optional[AlertStatus] = None,
    function: Optional[FunctionType] = None,
    is_resolved: Optional[bool] = None,
    limit: int = Query(default=100, le=1000)
):
    """Get alerts with optional filtering"""
    query = {}
    if alert_type:
        query["alert_type"] = alert_type
    if severity:
        query["severity"] = severity.value
    if function:
        query["function"] = function.value
    if is_resolved is not None:
        query["is_resolved"] = is_resolved
    
    alerts = await db.alerts.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return [deserialize_datetime(a) for a in alerts]


@api_router.post("/alerts/{alert_id}/resolve")
async def resolve_alert(alert_id: str, resolved_by: Optional[str] = None):
    """Mark an alert as resolved"""
    result = await db.alerts.update_one(
        {"id": alert_id},
        {"$set": {
            "is_resolved": True,
            "resolved_at": datetime.now(timezone.utc).isoformat(),
            "resolved_by": resolved_by
        }}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"message": "Alert resolved"}


# ==================== GATE LOGS ====================

@api_router.get("/gate-logs", response_model=List[GateLog])
async def get_gate_logs(
    gate_type: Optional[GateType] = None,
    status: Optional[GateStatus] = None,
    talent_id: Optional[str] = None,
    playbook_id: Optional[str] = None,
    limit: int = Query(default=100, le=1000)
):
    """Get gate execution logs"""
    query = {}
    if gate_type:
        query["gate_type"] = gate_type.value
    if status:
        query["status"] = status.value
    if talent_id:
        query["talent_id"] = talent_id
    if playbook_id:
        query["playbook_id"] = playbook_id
    
    logs = await db.gate_logs.find(query, {"_id": 0}).sort("executed_at", -1).to_list(limit)
    return [deserialize_datetime(log) for log in logs]


# ==================== PLATFORM CREDENTIALS ====================

@api_router.get("/platform-credentials", response_model=List[PlatformCredentials])
async def get_platform_credentials():
    """Get all platform credential entries (credentials masked)"""
    creds = await db.platform_credentials.find({}, {"_id": 0}).to_list(100)
    # Mask credentials for security
    for c in creds:
        if "credentials" in c:
            c["credentials"] = {k: "***" for k in c["credentials"].keys()}
    return [deserialize_datetime(c) for c in creds]


@api_router.post("/platform-credentials", response_model=PlatformCredentials)
async def create_platform_credentials(creds: PlatformCredentialsCreate):
    """Create/Update platform credentials"""
    existing = await db.platform_credentials.find_one({"platform": creds.platform})
    
    cred_obj = PlatformCredentials(**creds.model_dump())
    doc = serialize_doc(cred_obj.model_dump())
    
    if existing:
        await db.platform_credentials.update_one(
            {"platform": creds.platform},
            {"$set": doc}
        )
    else:
        await db.platform_credentials.insert_one(doc)
    
    # Return masked version
    cred_obj.credentials = {k: "***" for k in cred_obj.credentials.keys()}
    return cred_obj


@api_router.delete("/platform-credentials/{platform}")
async def delete_platform_credentials(platform: str):
    """Delete platform credentials"""
    result = await db.platform_credentials.delete_one({"platform": platform})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Platform credentials not found")
    return {"message": "Platform credentials deleted"}


# ==================== DASHBOARD STATS ====================

@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats():
    """Get dashboard statistics"""
    # Count totals
    total_playbooks = await db.playbooks.count_documents({"is_active": True})
    total_sops = await db.sops.count_documents({"is_active": True})
    total_talents = await db.talents.count_documents({"is_active": True})
    total_contracts = await db.contracts.count_documents({"is_active": True})
    total_kpis = await db.kpis.count_documents({"is_active": True})
    
    # Active alerts
    active_alerts = await db.alerts.count_documents({"is_resolved": False})
    
    # Gate blocks today
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    gate_blocks_today = await db.gate_logs.count_documents({
        "status": "BLOCKED",
        "executed_at": {"$gte": today_start.isoformat()}
    })
    
    # Function stats
    function_stats = []
    for func in FunctionType:
        playbooks_count = await db.playbooks.count_documents({"function": func.value, "is_active": True})
        sops_count = await db.sops.count_documents({"function": func.value, "is_active": True})
        talents_count = await db.talents.count_documents({"function": func.value, "is_active": True})
        tier_1 = await db.talents.count_documents({"function": func.value, "current_tier": 1, "is_active": True})
        tier_2 = await db.talents.count_documents({"function": func.value, "current_tier": 2, "is_active": True})
        tier_3 = await db.talents.count_documents({"function": func.value, "current_tier": 3, "is_active": True})
        func_alerts = await db.alerts.count_documents({"function": func.value, "is_resolved": False})
        
        # Get worst KPI status
        worst_status = AlertStatus.GREEN
        latest_values = await db.kpi_values.find({"function": func.value}).sort("recorded_at", -1).to_list(100)
        for val in latest_values:
            if val.get("status") == "RED":
                worst_status = AlertStatus.RED
                break
            elif val.get("status") == "YELLOW":
                worst_status = AlertStatus.YELLOW
        
        function_stats.append(FunctionStats(
            function=func,
            total_playbooks=playbooks_count,
            active_playbooks=playbooks_count,
            total_sops=sops_count,
            total_talents=talents_count,
            tier_1_count=tier_1,
            tier_2_count=tier_2,
            tier_3_count=tier_3,
            kpi_status=worst_status,
            active_alerts=func_alerts
        ))
    
    # Recent alerts
    recent_alerts_docs = await db.alerts.find({"is_resolved": False}, {"_id": 0}).sort("created_at", -1).to_list(10)
    recent_alerts = [Alert(**deserialize_datetime(a)) for a in recent_alerts_docs]
    
    # KPI overview
    kpi_overview = {}
    for func in FunctionType:
        kpi_overview[func.value] = AlertStatus.GREEN
        latest = await db.kpi_values.find_one({"function": func.value, "status": "RED"}, sort=[("recorded_at", -1)])
        if latest:
            kpi_overview[func.value] = AlertStatus.RED
        else:
            latest = await db.kpi_values.find_one({"function": func.value, "status": "YELLOW"}, sort=[("recorded_at", -1)])
            if latest:
                kpi_overview[func.value] = AlertStatus.YELLOW
    
    return DashboardStats(
        total_playbooks=total_playbooks,
        total_sops=total_sops,
        total_talents=total_talents,
        total_contracts=total_contracts,
        total_kpis=total_kpis,
        active_alerts=active_alerts,
        gate_blocks_today=gate_blocks_today,
        workflows_in_progress=0,
        function_stats=function_stats,
        recent_alerts=recent_alerts,
        kpi_overview=kpi_overview
    )


# Include the routers
app.include_router(api_router)
app.include_router(workflow_router)  # WorkflowViz routes
app.include_router(settings_router, prefix="/api")  # Settings & BYOK routes
app.include_router(ai_router, prefix="/api")  # AI Generation routes
app.include_router(bulk_router, prefix="/api")  # Bulk Upload routes
app.include_router(builder_router, prefix="/api")  # Labyrinth Builder routes
app.include_router(role_router, prefix="/api")  # Role System routes
app.include_router(lifecycle_router, prefix="/api")  # Contract Lifecycle routes

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
