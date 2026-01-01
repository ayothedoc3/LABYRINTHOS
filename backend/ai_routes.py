"""
AI Generation Routes - Natural language content generation
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import uuid

from ai_service import generate_content, PROVIDERS
from settings_routes import get_active_ai_config

# AI router
ai_router = APIRouter(prefix="/ai", tags=["AI Generation"])

# Database reference (will be set from server.py)
db = None

def set_db(database):
    global db
    db = database


# ==================== MODELS ====================

class GenerateRequest(BaseModel):
    content_type: str = Field(..., description="Type: workflow, playbook, sop, talent, contract, gate")
    description: str = Field(..., description="Natural language description of what to create")
    provider: Optional[str] = Field(None, description="Override default provider")
    model: Optional[str] = Field(None, description="Override default model")


class GenerateResponse(BaseModel):
    success: bool
    content_type: str
    data: Dict[str, Any]
    provider_used: str
    model_used: str


# ==================== ROUTES ====================

@ai_router.post("/generate", response_model=GenerateResponse)
async def generate_from_description(request: GenerateRequest):
    """Generate content from natural language description"""
    
    # Get active AI configuration
    ai_config = await get_active_ai_config()
    
    # Use request overrides if provided
    provider = request.provider or ai_config.get("provider", "openai")
    model = request.model or ai_config.get("model")
    api_key = ai_config.get("api_key")  # May be None, will use Emergent key
    
    try:
        data = await generate_content(
            content_type=request.content_type,
            description=request.description,
            provider=provider,
            api_key=api_key,
            model=model
        )
        
        return GenerateResponse(
            success=True,
            content_type=request.content_type,
            data=data,
            provider_used=provider,
            model_used=model or PROVIDERS.get(provider, {}).get("default_model", "unknown")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@ai_router.post("/generate/workflow")
async def generate_workflow(description: str, provider: Optional[str] = None, model: Optional[str] = None):
    """Generate a workflow from description and save it"""
    
    ai_config = await get_active_ai_config()
    provider = provider or ai_config.get("provider", "openai")
    model = model or ai_config.get("model")
    api_key = ai_config.get("api_key")
    
    try:
        workflow_data = await generate_content(
            content_type="workflow",
            description=description,
            provider=provider,
            api_key=api_key,
            model=model
        )
        
        # Create workflow in database
        workflow_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        
        workflow = {
            "id": workflow_id,
            "name": workflow_data.get("name", "AI Generated Workflow"),
            "description": workflow_data.get("description", ""),
            "access_level": "PUBLIC",
            "created_at": now,
            "updated_at": now,
            "ai_generated": True
        }
        
        await db.workflows.insert_one(workflow)
        
        # Create nodes
        nodes = workflow_data.get("nodes", [])
        node_ids = []
        for i, node_data in enumerate(nodes):
            node_id = f"{workflow_id}-node-{i}"
            node_ids.append(node_id)
            
            node = {
                "id": node_id,
                "workflow_id": workflow_id,
                "type": "custom",
                "position": node_data.get("position", {"x": i * 250, "y": (i % 3) * 150}),
                "data": {
                    "label": node_data.get("label", f"Node {i+1}"),
                    "description": node_data.get("description", ""),
                    "node_type": node_data.get("node_type", "ACTION"),
                    "assignee_ids": []
                },
                "layer": "STRATEGIC",
                "parent_node_id": None,
                "created_at": now,
                "updated_at": now
            }
            await db.workflow_nodes.insert_one(node)
        
        # Create edges from connections
        connections = workflow_data.get("connections", [])
        for j, conn in enumerate(connections):
            from_idx = conn.get("from_index", 0)
            to_idx = conn.get("to_index", 1)
            
            if from_idx < len(node_ids) and to_idx < len(node_ids):
                edge = {
                    "id": f"{workflow_id}-edge-{j}",
                    "workflow_id": workflow_id,
                    "source": node_ids[from_idx],
                    "target": node_ids[to_idx],
                    "type": "smoothstep",
                    "layer": "STRATEGIC",
                    "created_at": now
                }
                await db.workflow_edges.insert_one(edge)
        
        return {
            "success": True,
            "workflow_id": workflow_id,
            "workflow": workflow,
            "nodes_created": len(nodes),
            "edges_created": len(connections)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@ai_router.post("/generate/playbook")
async def generate_playbook(description: str, provider: Optional[str] = None, model: Optional[str] = None):
    """Generate a playbook from description and save it"""
    
    ai_config = await get_active_ai_config()
    provider = provider or ai_config.get("provider", "openai")
    model = model or ai_config.get("model")
    api_key = ai_config.get("api_key")
    
    try:
        playbook_data = await generate_content(
            content_type="playbook",
            description=description,
            provider=provider,
            api_key=api_key,
            model=model
        )
        
        playbook_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        
        playbook = {
            "id": playbook_id,
            "title": playbook_data.get("title", "AI Generated Playbook"),
            "function": playbook_data.get("function", "SALES"),
            "level": playbook_data.get("level", "ACQUIRE"),
            "description": playbook_data.get("description", ""),
            "objectives": playbook_data.get("objectives", []),
            "strategies": playbook_data.get("strategies", []),
            "kpi_targets": playbook_data.get("kpi_targets", {}),
            "created_at": now,
            "updated_at": now,
            "ai_generated": True
        }
        
        # Create a copy for response (before _id is added)
        playbook_response = dict(playbook)
        await db.playbooks.insert_one(playbook)
        
        return {
            "success": True,
            "playbook_id": playbook_id,
            "playbook": playbook_response
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@ai_router.post("/generate/sop")
async def generate_sop(description: str, provider: Optional[str] = None, model: Optional[str] = None):
    """Generate an SOP from description and save it"""
    
    ai_config = await get_active_ai_config()
    provider = provider or ai_config.get("provider", "openai")
    model = model or ai_config.get("model")
    api_key = ai_config.get("api_key")
    
    try:
        sop_data = await generate_content(
            content_type="sop",
            description=description,
            provider=provider,
            api_key=api_key,
            model=model
        )
        
        sop_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        
        sop = {
            "id": sop_id,
            "title": sop_data.get("title", "AI Generated SOP"),
            "function": sop_data.get("function", "OPERATIONS"),
            "tier": sop_data.get("tier", 2),
            "description": sop_data.get("description", ""),
            "steps": sop_data.get("steps", []),
            "tools_required": sop_data.get("tools_required", []),
            "estimated_total_time": sop_data.get("estimated_total_time", "30 minutes"),
            "created_at": now,
            "updated_at": now,
            "ai_generated": True
        }
        
        sop_response = dict(sop)
        await db.sops.insert_one(sop)
        
        return {
            "success": True,
            "sop_id": sop_id,
            "sop": sop_response
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@ai_router.post("/generate/talent")
async def generate_talent(description: str, provider: Optional[str] = None, model: Optional[str] = None):
    """Generate a talent profile from description and save it"""
    
    ai_config = await get_active_ai_config()
    provider = provider or ai_config.get("provider", "openai")
    model = model or ai_config.get("model")
    api_key = ai_config.get("api_key")
    
    try:
        talent_data = await generate_content(
            content_type="talent",
            description=description,
            provider=provider,
            api_key=api_key,
            model=model
        )
        
        talent_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        
        talent = {
            "id": talent_id,
            "name": talent_data.get("name", "AI Generated Role"),
            "function": talent_data.get("function", "OPERATIONS"),
            "tier": talent_data.get("tier", 2),
            "role": talent_data.get("role", ""),
            "description": talent_data.get("description", ""),
            "responsibilities": talent_data.get("responsibilities", []),
            "competencies": talent_data.get("competencies", {}),
            "skills_required": talent_data.get("skills_required", []),
            "hourly_rate": talent_data.get("hourly_rate", 50),
            "status": "AVAILABLE",
            "created_at": now,
            "updated_at": now,
            "ai_generated": True
        }
        
        talent_response = dict(talent)
        await db.talents.insert_one(talent)
        
        return {
            "success": True,
            "talent_id": talent_id,
            "talent": talent_response
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@ai_router.post("/generate/contract")
async def generate_contract(description: str, provider: Optional[str] = None, model: Optional[str] = None):
    """Generate a contract from description and save it"""
    
    ai_config = await get_active_ai_config()
    provider = provider or ai_config.get("provider", "openai")
    model = model or ai_config.get("model")
    api_key = ai_config.get("api_key")
    
    try:
        contract_data = await generate_content(
            content_type="contract",
            description=description,
            provider=provider,
            api_key=api_key,
            model=model
        )
        
        contract_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        
        contract = {
            "id": contract_id,
            "title": contract_data.get("title", "AI Generated Contract"),
            "client_name": contract_data.get("client_name", "Client"),
            "package": contract_data.get("package", "SILVER"),
            "description": contract_data.get("description", ""),
            "boundaries": contract_data.get("boundaries", []),
            "value": contract_data.get("value", 10000),
            "duration_months": contract_data.get("duration_months", 12),
            "terms": contract_data.get("terms", []),
            "status": "DRAFT",
            "created_at": now,
            "updated_at": now,
            "ai_generated": True
        }
        
        await db.contracts.insert_one(contract)
        
        return {
            "success": True,
            "contract_id": contract_id,
            "contract": contract
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@ai_router.get("/providers")
async def list_providers():
    """List available AI providers and their models"""
    return PROVIDERS
