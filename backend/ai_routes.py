"""
AI Generation Routes - Generate SOPs, Playbooks, Contracts in Markdown
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
import uuid

from ai_service import (
    generate_content, generate_playbook, generate_sop, generate_contract,
    get_industry_suggestions, PROVIDERS, INDUSTRY_SAMPLES
)
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
    content_type: str = Field(..., description="Type: playbook, sop, contract")
    description: str = Field(..., description="What to generate - keywords, topic, or description")
    industry: Optional[str] = Field(None, description="Industry context: sales, marketing, operations, hr, finance, customer_service, technology")
    provider: Optional[str] = Field(None, description="LLM provider: openai, anthropic, gemini")
    model: Optional[str] = Field(None, description="Specific model to use")


class GenerateResponse(BaseModel):
    success: bool
    content_type: str
    title: str
    content: str  # Markdown content
    format: str = "markdown"
    industry: Optional[str] = None
    provider_used: str
    model_used: str


class IndustrySuggestion(BaseModel):
    industry: str
    playbooks: List[str]
    sops: List[str]


# ==================== ROUTES ====================

@ai_router.get("/providers")
async def get_providers():
    """Get available AI providers and models"""
    return PROVIDERS


@ai_router.get("/industries")
async def get_industries():
    """Get available industries with suggestions"""
    return {
        "industries": list(INDUSTRY_SAMPLES.keys()),
        "suggestions": INDUSTRY_SAMPLES
    }


@ai_router.get("/industries/{industry}")
async def get_industry_info(industry: str):
    """Get suggestions for a specific industry"""
    industry_lower = industry.lower()
    if industry_lower not in INDUSTRY_SAMPLES:
        raise HTTPException(status_code=404, detail=f"Industry '{industry}' not found. Available: {list(INDUSTRY_SAMPLES.keys())}")
    return {
        "industry": industry_lower,
        "suggestions": INDUSTRY_SAMPLES[industry_lower]
    }


@ai_router.post("/generate", response_model=GenerateResponse)
async def generate_from_description(request: GenerateRequest):
    """Generate content (playbook, SOP, or contract) from description"""
    
    # Get active AI configuration
    ai_config = await get_active_ai_config()
    
    # Use request overrides if provided
    provider = request.provider or ai_config.get("provider", "openai")
    model = request.model or ai_config.get("model")
    api_key = ai_config.get("api_key")  # May be None, will use Emergent key
    
    if request.content_type not in ["playbook", "sop", "contract"]:
        raise HTTPException(status_code=400, detail="content_type must be: playbook, sop, or contract")
    
    try:
        data = await generate_content(
            content_type=request.content_type,
            description=request.description,
            provider=provider,
            api_key=api_key,
            model=model,
            industry=request.industry
        )
        
        return GenerateResponse(
            success=True,
            content_type=request.content_type,
            title=data.get("title", request.description),
            content=data.get("content", ""),
            format="markdown",
            industry=request.industry,
            provider_used=provider,
            model_used=model or PROVIDERS.get(provider, {}).get("default_model", "gpt-5.2")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@ai_router.post("/generate/playbook")
async def generate_playbook_endpoint(
    description: str,
    industry: Optional[str] = None,
    provider: Optional[str] = None,
    model: Optional[str] = None,
    save: bool = True  # Changed to True by default - auto-save to unified collection
):
    """Generate a playbook in Markdown format and save to unified collection"""
    
    ai_config = await get_active_ai_config()
    provider = provider or ai_config.get("provider", "openai")
    model = model or ai_config.get("model")
    api_key = ai_config.get("api_key")
    
    try:
        data = await generate_playbook(
            description=description,
            industry=industry,
            provider=provider,
            api_key=api_key,
            model=model
        )
        
        # Auto-save to UNIFIED playbooks collection
        if save and db is not None:
            playbook_id = f"PB-AI-{str(uuid.uuid4())[:8].upper()}"
            playbook_doc = {
                "id": str(uuid.uuid4()),
                "playbook_id": playbook_id,
                "name": data.get("title", description),
                "description": description,
                "content": data.get("content", ""),
                "function": industry.upper() if industry else "OPERATIONS",
                "level": "ACQUIRE",
                "min_tier": 2,
                "linked_sop_ids": [],
                "industry": industry,
                "format": "markdown",
                "ai_generated": True,
                "provider": provider,
                "model": model,
                "is_active": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            await db.playbooks.insert_one(playbook_doc)  # Save to UNIFIED collection
            data["saved_id"] = playbook_doc["id"]
            data["playbook_id"] = playbook_id
        
        return {
            "success": True,
            **data,
            "provider_used": provider,
            "model_used": model or PROVIDERS.get(provider, {}).get("default_model", "gpt-5.2")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@ai_router.post("/generate/sop")
async def generate_sop_endpoint(
    description: str,
    industry: Optional[str] = None,
    provider: Optional[str] = None,
    model: Optional[str] = None,
    save: bool = True  # Changed to True by default - auto-save to unified collection
):
    """Generate an SOP in Markdown format and save to unified collection"""
    
    ai_config = await get_active_ai_config()
    provider = provider or ai_config.get("provider", "openai")
    model = model or ai_config.get("model")
    api_key = ai_config.get("api_key")
    
    try:
        data = await generate_sop(
            description=description,
            industry=industry,
            provider=provider,
            api_key=api_key,
            model=model
        )
        
        # Auto-save to UNIFIED sops collection
        if save and db is not None:
            sop_id = f"SOP-AI-{str(uuid.uuid4())[:8].upper()}"
            # Map industry to function type
            function_map = {
                "sales": "SALES",
                "marketing": "MARKETING",
                "operations": "OPERATIONS",
                "hr": "OPERATIONS",
                "finance": "FINANCE",
                "customer_service": "OPERATIONS",
                "technology": "DEVELOPMENT"
            }
            function_type = function_map.get(industry.lower() if industry else "", "OPERATIONS")
            
            sop_doc = {
                "id": str(uuid.uuid4()),
                "sop_id": sop_id,
                "name": data.get("title", description),
                "description": description,
                "content": data.get("content", ""),
                "function": function_type,
                "category": industry or "general",
                "linked_playbook_ids": [],
                "template_required": "General Template",
                "steps": [],  # Markdown content has the steps
                "estimated_time_minutes": 30,
                "industry": industry,
                "format": "markdown",
                "ai_generated": True,
                "provider": provider,
                "model": model,
                "is_active": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            await db.sops.insert_one(sop_doc)  # Save to UNIFIED collection
            data["saved_id"] = sop_doc["id"]
            data["sop_id"] = sop_id
        
        return {
            "success": True,
            **data,
            "provider_used": provider,
            "model_used": model or PROVIDERS.get(provider, {}).get("default_model", "gpt-5.2")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@ai_router.post("/generate/contract")
async def generate_contract_endpoint(
    description: str,
    industry: Optional[str] = None,
    provider: Optional[str] = None,
    model: Optional[str] = None,
    save: bool = True  # Changed to True by default - auto-save to unified collection
):
    """Generate a contract framework in Markdown format and save to unified collection"""
    
    ai_config = await get_active_ai_config()
    provider = provider or ai_config.get("provider", "openai")
    model = model or ai_config.get("model")
    api_key = ai_config.get("api_key")
    
    try:
        data = await generate_contract(
            description=description,
            industry=industry,
            provider=provider,
            api_key=api_key,
            model=model
        )
        
        # Auto-save to UNIFIED contracts collection
        if save and db is not None:
            contract_id = f"CNT-AI-{str(uuid.uuid4())[:8].upper()}"
            contract_doc = {
                "id": str(uuid.uuid4()),
                "contract_id": contract_id,
                "title": data.get("title", description),
                "name": data.get("title", description),
                "client_name": "TBD",
                "package": industry.upper() if industry else "GENERAL",
                "description": description,
                "content": data.get("content", ""),
                "boundaries": {
                    "max_hours_per_week": 40,
                    "response_time_hours": 24,
                    "deliverable_quality_min": 3.5,
                    "escalation_threshold_days": 3
                },
                "value": 0,
                "duration_months": 12,
                "terms": data.get("content", "")[:500],  # First 500 chars as summary
                "status": "TEMPLATE",
                "industry": industry,
                "format": "markdown",
                "ai_generated": True,
                "provider": provider,
                "model": model,
                "is_active": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            await db.contracts.insert_one(contract_doc)  # Save to UNIFIED collection
            data["saved_id"] = contract_doc["id"]
            data["contract_id"] = contract_id
        
        return {
            "success": True,
            **data,
            "provider_used": provider,
            "model_used": model or PROVIDERS.get(provider, {}).get("default_model", "gpt-5.2")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== SAVED CONTENT ROUTES ====================

@ai_router.get("/saved/playbooks")
async def get_saved_playbooks():
    """Get all AI-generated playbooks"""
    if not db:
        return []
    playbooks = await db.ai_playbooks.find({}, {"_id": 0}).to_list(100)
    return playbooks


@ai_router.get("/saved/sops")
async def get_saved_sops():
    """Get all AI-generated SOPs"""
    if not db:
        return []
    sops = await db.ai_sops.find({}, {"_id": 0}).to_list(100)
    return sops


@ai_router.get("/saved/contracts")
async def get_saved_contracts():
    """Get all AI-generated contracts"""
    if not db:
        return []
    contracts = await db.ai_contracts.find({}, {"_id": 0}).to_list(100)
    return contracts


@ai_router.delete("/saved/{content_type}/{content_id}")
async def delete_saved_content(content_type: str, content_id: str):
    """Delete a saved AI-generated content"""
    if not db:
        raise HTTPException(status_code=500, detail="Database not available")
    
    collection_map = {
        "playbook": "ai_playbooks",
        "sop": "ai_sops",
        "contract": "ai_contracts"
    }
    
    collection = collection_map.get(content_type)
    if not collection:
        raise HTTPException(status_code=400, detail="Invalid content type")
    
    result = await db[collection].delete_one({"id": content_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Content not found")
    
    return {"success": True, "deleted_id": content_id}
