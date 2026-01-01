"""
Settings Routes - BYOK (Bring Your Own Key) and AI Configuration
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid

# Settings router
settings_router = APIRouter(prefix="/settings", tags=["Settings"])

# Database reference (will be set from server.py)
db = None

def set_db(database):
    global db
    db = database


# ==================== MODELS ====================

class APIKeyConfig(BaseModel):
    provider: str = Field(..., description="Provider name: openai, anthropic, openrouter, gemini")
    api_key: str = Field(..., description="The API key")
    model: Optional[str] = Field(None, description="Preferred model for this provider")
    is_active: bool = Field(True, description="Whether this key is active")


class APIKeyResponse(BaseModel):
    id: str
    provider: str
    model: Optional[str]
    is_active: bool
    created_at: str
    # Note: We never return the actual API key for security
    key_preview: str  # Shows first 8 and last 4 chars


class AISettingsUpdate(BaseModel):
    default_provider: str = Field("openai", description="Default AI provider")
    default_model: Optional[str] = Field(None, description="Default model")
    temperature: float = Field(0.7, ge=0, le=2, description="Temperature for generations")
    enable_ai_features: bool = Field(True, description="Enable/disable AI features")


class AISettings(BaseModel):
    default_provider: str = "openai"
    default_model: Optional[str] = None
    temperature: float = 0.7
    enable_ai_features: bool = True
    available_providers: List[Dict[str, Any]] = []


# ==================== HELPER FUNCTIONS ====================

def mask_api_key(key: str) -> str:
    """Mask API key showing only first 8 and last 4 characters"""
    if len(key) <= 12:
        return "*" * len(key)
    return f"{key[:8]}...{key[-4:]}"


# ==================== ROUTES ====================

@settings_router.get("/ai", response_model=AISettings)
async def get_ai_settings():
    """Get current AI settings including available providers"""
    from ai_service import PROVIDERS
    
    settings = await db.ai_settings.find_one({"_id": "global"}, {"_id": 0})
    
    if not settings:
        settings = {
            "default_provider": "openai",
            "default_model": None,
            "temperature": 0.7,
            "enable_ai_features": True
        }
    
    # Get configured keys to show which providers are available
    api_keys = await db.api_keys.find({"is_active": True}, {"_id": 0}).to_list(100)
    configured_providers = {k["provider"] for k in api_keys}
    
    # Add universal key providers (always available via Emergent)
    configured_providers.update(["openai", "anthropic", "gemini"])
    
    available_providers = []
    for provider_id, provider_info in PROVIDERS.items():
        available_providers.append({
            "id": provider_id,
            "name": provider_info["name"],
            "models": provider_info["models"],
            "default_model": provider_info["default_model"],
            "configured": provider_id in configured_providers,
            "requires_key": provider_id == "openrouter"  # Only OpenRouter requires BYOK
        })
    
    settings["available_providers"] = available_providers
    return settings


@settings_router.put("/ai")
async def update_ai_settings(settings: AISettingsUpdate):
    """Update AI settings"""
    settings_dict = settings.model_dump()
    settings_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.ai_settings.update_one(
        {"_id": "global"},
        {"$set": settings_dict},
        upsert=True
    )
    
    return {"message": "Settings updated successfully"}


@settings_router.get("/api-keys", response_model=List[APIKeyResponse])
async def list_api_keys():
    """List all configured API keys (masked)"""
    keys = await db.api_keys.find({}, {"_id": 0}).to_list(100)
    
    return [
        APIKeyResponse(
            id=k["id"],
            provider=k["provider"],
            model=k.get("model"),
            is_active=k.get("is_active", True),
            created_at=k.get("created_at", ""),
            key_preview=mask_api_key(k.get("api_key", ""))
        )
        for k in keys
    ]


@settings_router.post("/api-keys")
async def add_api_key(config: APIKeyConfig):
    """Add a new API key for a provider"""
    # Check if key already exists for this provider
    existing = await db.api_keys.find_one({"provider": config.provider})
    
    key_doc = {
        "id": str(uuid.uuid4()),
        "provider": config.provider,
        "api_key": config.api_key,
        "model": config.model,
        "is_active": config.is_active,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    if existing:
        # Update existing key
        await db.api_keys.update_one(
            {"provider": config.provider},
            {"$set": key_doc}
        )
        return {"message": f"API key updated for {config.provider}", "id": key_doc["id"]}
    else:
        await db.api_keys.insert_one(key_doc)
        return {"message": f"API key added for {config.provider}", "id": key_doc["id"]}


@settings_router.delete("/api-keys/{key_id}")
async def delete_api_key(key_id: str):
    """Delete an API key"""
    result = await db.api_keys.delete_one({"id": key_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="API key not found")
    
    return {"message": "API key deleted successfully"}


@settings_router.post("/api-keys/test")
async def test_api_key(config: APIKeyConfig):
    """Test an API key by making a simple call"""
    from ai_service import AIService
    
    try:
        service = AIService(
            provider=config.provider,
            api_key=config.api_key,
            model=config.model
        )
        
        response = await service.generate(
            "Say 'Hello, API test successful!' and nothing else.",
            "You are a helpful assistant.",
            0.1
        )
        
        return {
            "success": True,
            "message": "API key is valid",
            "response": response
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"API key test failed: {str(e)}"
        }


async def get_active_ai_config() -> Dict[str, Any]:
    """Get the active AI configuration for use in generation"""
    settings = await db.ai_settings.find_one({"_id": "global"}, {"_id": 0})
    
    if not settings:
        settings = {
            "default_provider": "openai",
            "default_model": None,
            "temperature": 0.7
        }
    
    # Check for custom API key for the provider
    provider = settings.get("default_provider", "openai")
    api_key = None
    
    key_doc = await db.api_keys.find_one({"provider": provider, "is_active": True})
    if key_doc:
        api_key = key_doc.get("api_key")
        if key_doc.get("model"):
            settings["default_model"] = key_doc["model"]
    
    return {
        "provider": provider,
        "api_key": api_key,
        "model": settings.get("default_model"),
        "temperature": settings.get("temperature", 0.7)
    }
