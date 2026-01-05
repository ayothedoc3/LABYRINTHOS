"""
Unify Labyrinth Data - Merge all SOPs, Templates, Contracts into single collections
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


async def unify_data():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    results = {"sops_merged": 0, "templates_merged": 0, "contracts_merged": 0}
    
    # ==================== MERGE SOPs ====================
    # Move builder_sops into main sops collection with proper structure
    
    builder_sops = await db.builder_sops.find({}).to_list(1000)
    print(f"Found {len(builder_sops)} builder SOPs to merge")
    
    for sop in builder_sops:
        # Check if already exists by name
        existing = await db.sops.find_one({"name": sop.get("name")})
        if not existing:
            # Transform to main SOP format
            unified_sop = {
                "id": sop.get("id", str(uuid.uuid4())),
                "sop_id": f"SOP-{sop.get('issue_category', 'GEN')[:3]}-{str(uuid.uuid4())[:4].upper()}",
                "name": sop.get("name"),
                "description": sop.get("description", ""),
                "function": sop.get("issue_category", "OPERATIONS"),
                "category": sop.get("issue_type_id", "general"),
                "tier": sop.get("tier", "TIER_2"),
                "estimated_time": 30,  # Default 30 minutes
                "steps": sop.get("steps", []),
                "tools_required": [],
                "kpis": [],
                "related_playbooks": [],
                # Builder-specific fields for workflow generation
                "issue_category": sop.get("issue_category"),
                "issue_type_id": sop.get("issue_type_id"),
                "created_at": sop.get("created_at", datetime.now(timezone.utc).isoformat()),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            await db.sops.insert_one(unified_sop)
            results["sops_merged"] += 1
    
    # ==================== MERGE TEMPLATES ====================
    # Move builder_templates into main templates collection
    
    builder_templates = await db.builder_templates.find({}).to_list(1000)
    print(f"Found {len(builder_templates)} builder templates to merge")
    
    for template in builder_templates:
        existing = await db.templates.find_one({"name": template.get("name")})
        if not existing:
            unified_template = {
                "id": template.get("id", str(uuid.uuid4())),
                "name": template.get("name"),
                "description": template.get("description", ""),
                "template_type": template.get("template_type", "document"),
                "category": "DELIVERABLE",
                "file_url": template.get("file_url"),
                "linked_sop_ids": template.get("linked_sop_ids", []),
                "created_at": template.get("created_at", datetime.now(timezone.utc).isoformat()),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            await db.templates.insert_one(unified_template)
            results["templates_merged"] += 1
    
    # ==================== MERGE CONTRACTS ====================
    # Move builder_contracts into main contracts collection
    
    builder_contracts = await db.builder_contracts.find({}).to_list(1000)
    print(f"Found {len(builder_contracts)} builder contracts to merge")
    
    for contract in builder_contracts:
        existing = await db.contracts.find_one({"name": contract.get("name")})
        if not existing:
            unified_contract = {
                "id": contract.get("id", str(uuid.uuid4())),
                "contract_id": f"CNT-{str(uuid.uuid4())[:6].upper()}",
                "name": contract.get("name"),
                "description": contract.get("description", ""),
                "contract_type": contract.get("contract_type", "PROJECT"),
                "status": "TEMPLATE",
                "linked_sop_ids": contract.get("linked_sop_ids", []),
                "deliverables": contract.get("deliverables", []),
                "kpis": contract.get("kpis", []),
                "value": 0,
                "created_at": contract.get("created_at", datetime.now(timezone.utc).isoformat()),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            await db.contracts.insert_one(unified_contract)
            results["contracts_merged"] += 1
    
    # Create indexes for efficient lookups
    await db.sops.create_index("issue_category")
    await db.sops.create_index("issue_type_id")
    await db.sops.create_index("tier")
    await db.sops.create_index([("issue_category", 1), ("issue_type_id", 1), ("tier", 1)])
    
    await db.templates.create_index("linked_sop_ids")
    await db.contracts.create_index("linked_sop_ids")
    
    client.close()
    return results


if __name__ == "__main__":
    results = asyncio.run(unify_data())
    print(f"\nMerge complete: {results}")
