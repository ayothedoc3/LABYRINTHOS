"""
Bidding System Routes
Internal contract bidding workflow for teams
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from enum import Enum
import uuid
import os

router = APIRouter(prefix="/bidding", tags=["Bidding System"])

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
db_name = os.environ.get('DB_NAME', 'labyrinth_db')

if mongo_url:
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    contracts_collection = db["bid_contracts"]
    bids_collection = db["bids"]
else:
    contracts_collection = None
    bids_collection = None

# In-memory fallback
contracts_db = {}
bids_db = {}

# ==================== ENUMS ====================

class ContractStatus(str, Enum):
    OPEN = "open"
    UNDER_REVIEW = "under_review"
    AWARDED = "awarded"
    CLOSED = "closed"

class BidStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"

# ==================== MODELS ====================

class ContractCreate(BaseModel):
    title: str
    description: str
    client_name: str
    estimated_value: float
    deadline: str  # ISO date string
    requirements: List[str]
    category: str  # "financial", "marketing", "operations", "technology"

class BidCreate(BaseModel):
    contract_id: str
    team_id: str
    team_name: str
    proposed_value: float
    timeline_days: int
    proposal: str
    strengths: List[str]

class BidEvaluate(BaseModel):
    status: BidStatus
    feedback: Optional[str] = None
    score: Optional[int] = None  # 1-100

# ==================== HELPERS ====================

def contract_to_dict(contract: dict) -> dict:
    return {k: v for k, v in contract.items() if k != "_id"}

def bid_to_dict(bid: dict) -> dict:
    return {k: v for k, v in bid.items() if k != "_id"}

# ==================== CONTRACT ENDPOINTS ====================

@router.get("/contracts")
async def list_contracts(
    status: Optional[ContractStatus] = None,
    category: Optional[str] = None
):
    """List all contracts available for bidding"""
    
    if contracts_collection is not None:
        query = {}
        if status:
            query["status"] = status.value
        if category:
            query["category"] = category
        cursor = contracts_collection.find(query, {"_id": 0}).sort("created_at", -1)
        contracts = await cursor.to_list(length=100)
    else:
        contracts = list(contracts_db.values())
        if status:
            contracts = [c for c in contracts if c["status"] == status.value]
        if category:
            contracts = [c for c in contracts if c["category"] == category]
    
    return {"contracts": contracts, "total": len(contracts)}

@router.get("/contracts/{contract_id}")
async def get_contract(contract_id: str):
    """Get contract details with bids"""
    
    if contracts_collection is not None:
        contract = await contracts_collection.find_one({"id": contract_id}, {"_id": 0})
        bids_cursor = bids_collection.find({"contract_id": contract_id}, {"_id": 0})
        bids = await bids_cursor.to_list(length=50)
    else:
        contract = contracts_db.get(contract_id)
        bids = [b for b in bids_db.values() if b["contract_id"] == contract_id]
    
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    return {
        **contract,
        "bids": bids,
        "bid_count": len(bids)
    }

@router.post("/contracts")
async def create_contract(contract: ContractCreate):
    """Create a new contract for bidding"""
    
    contract_id = f"contract_{uuid.uuid4().hex[:8]}"
    
    contract_data = {
        "id": contract_id,
        **contract.dict(),
        "status": ContractStatus.OPEN.value,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "awarded_to": None,
        "winning_bid_id": None
    }
    
    if contracts_collection is not None:
        await contracts_collection.insert_one(contract_data)
    else:
        contracts_db[contract_id] = contract_data
    
    return {"message": "Contract created", "contract": contract_to_dict(contract_data)}

@router.patch("/contracts/{contract_id}/status")
async def update_contract_status(contract_id: str, status: ContractStatus):
    """Update contract status"""
    
    if contracts_collection is not None:
        result = await contracts_collection.update_one(
            {"id": contract_id},
            {"$set": {"status": status.value, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Contract not found")
        contract = await contracts_collection.find_one({"id": contract_id}, {"_id": 0})
    else:
        if contract_id not in contracts_db:
            raise HTTPException(status_code=404, detail="Contract not found")
        contracts_db[contract_id]["status"] = status.value
        contracts_db[contract_id]["updated_at"] = datetime.now(timezone.utc).isoformat()
        contract = contracts_db[contract_id]
    
    return {"message": "Status updated", "contract": contract}

# ==================== BID ENDPOINTS ====================

@router.get("/bids")
async def list_bids(
    contract_id: Optional[str] = None,
    team_id: Optional[str] = None,
    status: Optional[BidStatus] = None
):
    """List bids with optional filtering"""
    
    if bids_collection is not None:
        query = {}
        if contract_id:
            query["contract_id"] = contract_id
        if team_id:
            query["team_id"] = team_id
        if status:
            query["status"] = status.value
        cursor = bids_collection.find(query, {"_id": 0}).sort("submitted_at", -1)
        bids = await cursor.to_list(length=100)
    else:
        bids = list(bids_db.values())
        if contract_id:
            bids = [b for b in bids if b["contract_id"] == contract_id]
        if team_id:
            bids = [b for b in bids if b["team_id"] == team_id]
        if status:
            bids = [b for b in bids if b["status"] == status.value]
    
    return {"bids": bids, "total": len(bids)}

@router.post("/bids")
async def submit_bid(bid: BidCreate):
    """Submit a bid for a contract"""
    
    # Verify contract exists and is open
    if contracts_collection is not None:
        contract = await contracts_collection.find_one({"id": bid.contract_id}, {"_id": 0})
    else:
        contract = contracts_db.get(bid.contract_id)
    
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    if contract["status"] != ContractStatus.OPEN.value:
        raise HTTPException(status_code=400, detail="Contract is not open for bidding")
    
    # Check if team already submitted bid
    if bids_collection is not None:
        existing = await bids_collection.find_one({
            "contract_id": bid.contract_id,
            "team_id": bid.team_id
        })
    else:
        existing = next((b for b in bids_db.values() 
                        if b["contract_id"] == bid.contract_id and b["team_id"] == bid.team_id), None)
    
    if existing:
        raise HTTPException(status_code=400, detail="Team has already submitted a bid for this contract")
    
    bid_id = f"bid_{uuid.uuid4().hex[:8]}"
    
    bid_data = {
        "id": bid_id,
        **bid.dict(),
        "status": BidStatus.PENDING.value,
        "submitted_at": datetime.now(timezone.utc).isoformat(),
        "evaluated_at": None,
        "feedback": None,
        "score": None
    }
    
    if bids_collection is not None:
        await bids_collection.insert_one(bid_data)
    else:
        bids_db[bid_id] = bid_data
    
    return {"message": "Bid submitted", "bid": bid_to_dict(bid_data)}

@router.get("/bids/{bid_id}")
async def get_bid(bid_id: str):
    """Get bid details"""
    
    if bids_collection is not None:
        bid = await bids_collection.find_one({"id": bid_id}, {"_id": 0})
    else:
        bid = bids_db.get(bid_id)
    
    if not bid:
        raise HTTPException(status_code=404, detail="Bid not found")
    
    return bid

@router.patch("/bids/{bid_id}/evaluate")
async def evaluate_bid(bid_id: str, evaluation: BidEvaluate):
    """Evaluate a bid (accept/reject)"""
    
    if bids_collection is not None:
        bid = await bids_collection.find_one({"id": bid_id}, {"_id": 0})
    else:
        bid = bids_db.get(bid_id)
    
    if not bid:
        raise HTTPException(status_code=404, detail="Bid not found")
    
    update_data = {
        "status": evaluation.status.value,
        "evaluated_at": datetime.now(timezone.utc).isoformat()
    }
    if evaluation.feedback:
        update_data["feedback"] = evaluation.feedback
    if evaluation.score:
        update_data["score"] = evaluation.score
    
    if bids_collection is not None:
        await bids_collection.update_one({"id": bid_id}, {"$set": update_data})
        bid = await bids_collection.find_one({"id": bid_id}, {"_id": 0})
    else:
        bids_db[bid_id].update(update_data)
        bid = bids_db[bid_id]
    
    # If bid is accepted, award the contract
    if evaluation.status == BidStatus.ACCEPTED:
        contract_update = {
            "status": ContractStatus.AWARDED.value,
            "awarded_to": bid["team_id"],
            "winning_bid_id": bid_id,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        if contracts_collection is not None:
            await contracts_collection.update_one(
                {"id": bid["contract_id"]},
                {"$set": contract_update}
            )
            # Reject all other pending bids
            await bids_collection.update_many(
                {"contract_id": bid["contract_id"], "id": {"$ne": bid_id}, "status": BidStatus.PENDING.value},
                {"$set": {"status": BidStatus.REJECTED.value, "feedback": "Another bid was accepted"}}
            )
        else:
            contracts_db[bid["contract_id"]].update(contract_update)
            for b in bids_db.values():
                if b["contract_id"] == bid["contract_id"] and b["id"] != bid_id and b["status"] == BidStatus.PENDING.value:
                    b["status"] = BidStatus.REJECTED.value
                    b["feedback"] = "Another bid was accepted"
    
    return {"message": "Bid evaluated", "bid": bid}

@router.delete("/bids/{bid_id}")
async def withdraw_bid(bid_id: str):
    """Withdraw a bid"""
    
    if bids_collection is not None:
        result = await bids_collection.update_one(
            {"id": bid_id, "status": BidStatus.PENDING.value},
            {"$set": {"status": BidStatus.WITHDRAWN.value}}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=400, detail="Bid not found or cannot be withdrawn")
    else:
        if bid_id not in bids_db or bids_db[bid_id]["status"] != BidStatus.PENDING.value:
            raise HTTPException(status_code=400, detail="Bid not found or cannot be withdrawn")
        bids_db[bid_id]["status"] = BidStatus.WITHDRAWN.value
    
    return {"message": "Bid withdrawn"}

# ==================== ANALYTICS ====================

@router.get("/analytics")
async def get_bidding_analytics():
    """Get bidding system analytics"""
    
    if contracts_collection is not None:
        total_contracts = await contracts_collection.count_documents({})
        open_contracts = await contracts_collection.count_documents({"status": ContractStatus.OPEN.value})
        awarded_contracts = await contracts_collection.count_documents({"status": ContractStatus.AWARDED.value})
        total_bids = await bids_collection.count_documents({})
        accepted_bids = await bids_collection.count_documents({"status": BidStatus.ACCEPTED.value})
        
        # Get average bid value
        pipeline = [{"$group": {"_id": None, "avg_value": {"$avg": "$proposed_value"}}}]
        avg_result = await bids_collection.aggregate(pipeline).to_list(1)
        avg_bid_value = avg_result[0]["avg_value"] if avg_result else 0
    else:
        total_contracts = len(contracts_db)
        open_contracts = len([c for c in contracts_db.values() if c["status"] == ContractStatus.OPEN.value])
        awarded_contracts = len([c for c in contracts_db.values() if c["status"] == ContractStatus.AWARDED.value])
        total_bids = len(bids_db)
        accepted_bids = len([b for b in bids_db.values() if b["status"] == BidStatus.ACCEPTED.value])
        avg_bid_value = sum(b["proposed_value"] for b in bids_db.values()) / len(bids_db) if bids_db else 0
    
    return {
        "total_contracts": total_contracts,
        "open_contracts": open_contracts,
        "awarded_contracts": awarded_contracts,
        "total_bids": total_bids,
        "accepted_bids": accepted_bids,
        "average_bid_value": round(avg_bid_value, 2),
        "win_rate": round((accepted_bids / total_bids * 100) if total_bids > 0 else 0, 1)
    }

# ==================== SEED DATA ====================

@router.post("/seed-demo")
async def seed_demo_data():
    """Seed demo bidding data"""
    
    demo_contracts = [
        {
            "id": "contract_demo1",
            "title": "Q1 Financial Audit Services",
            "description": "Comprehensive financial audit for Q1 2026 including tax compliance review",
            "client_name": "TechStart Inc",
            "estimated_value": 45000,
            "deadline": (datetime.now(timezone.utc) + timedelta(days=14)).isoformat(),
            "requirements": ["CPA certification", "5+ years experience", "Tech industry expertise"],
            "category": "financial",
            "status": ContractStatus.OPEN.value,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "awarded_to": None,
            "winning_bid_id": None
        },
        {
            "id": "contract_demo2",
            "title": "Digital Marketing Campaign",
            "description": "6-month digital marketing campaign including SEO, PPC, and social media",
            "client_name": "GrowthCo",
            "estimated_value": 75000,
            "deadline": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
            "requirements": ["Proven track record", "Multi-channel expertise", "Analytics reporting"],
            "category": "marketing",
            "status": ContractStatus.OPEN.value,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "awarded_to": None,
            "winning_bid_id": None
        },
        {
            "id": "contract_demo3",
            "title": "IT Infrastructure Upgrade",
            "description": "Cloud migration and infrastructure modernization project",
            "client_name": "Legacy Systems Ltd",
            "estimated_value": 120000,
            "deadline": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
            "requirements": ["AWS/Azure certified", "Security clearance", "24/7 support capability"],
            "category": "technology",
            "status": ContractStatus.UNDER_REVIEW.value,
            "created_at": (datetime.now(timezone.utc) - timedelta(days=5)).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "awarded_to": None,
            "winning_bid_id": None
        }
    ]
    
    demo_bids = [
        {
            "id": "bid_demo1",
            "contract_id": "contract_demo3",
            "team_id": "team_alpha",
            "team_name": "Alpha Solutions",
            "proposed_value": 110000,
            "timeline_days": 60,
            "proposal": "We propose a phased migration approach with minimal downtime...",
            "strengths": ["AWS certified team", "15+ years experience", "24/7 support included"],
            "status": BidStatus.PENDING.value,
            "submitted_at": datetime.now(timezone.utc).isoformat(),
            "evaluated_at": None,
            "feedback": None,
            "score": None
        },
        {
            "id": "bid_demo2",
            "contract_id": "contract_demo3",
            "team_id": "team_beta",
            "team_name": "Beta Technologies",
            "proposed_value": 95000,
            "timeline_days": 45,
            "proposal": "Our accelerated migration methodology reduces time and cost...",
            "strengths": ["Cost-effective", "Fast delivery", "Modern tech stack"],
            "status": BidStatus.PENDING.value,
            "submitted_at": datetime.now(timezone.utc).isoformat(),
            "evaluated_at": None,
            "feedback": None,
            "score": None
        }
    ]
    
    if contracts_collection is not None:
        await contracts_collection.delete_many({})
        await bids_collection.delete_many({})
        for contract in demo_contracts:
            await contracts_collection.insert_one(contract)
        for bid in demo_bids:
            await bids_collection.insert_one(bid)
    else:
        contracts_db.clear()
        bids_db.clear()
        for contract in demo_contracts:
            contracts_db[contract["id"]] = contract
        for bid in demo_bids:
            bids_db[bid["id"]] = bid
    
    return {
        "message": "Demo data seeded",
        "contracts": len(demo_contracts),
        "bids": len(demo_bids)
    }
