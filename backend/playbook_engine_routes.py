"""
Playbook Engine Routes
API endpoints for generating and managing execution plans from strategy inputs
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import uuid
import os
from motor.motor_asyncio import AsyncIOMotorClient

from playbook_engine_models import (
    StrategyInput, ExecutionPlan, ExecutionPlanSummary,
    ExecutionRole, ExecutionMilestone, ExecutionTask,
    ExecutionContract, CommunicationChannel,
    ExecutionPhase, MilestoneStatus, RoleType,
    EXECUTION_TEMPLATES, TIER_MULTIPLIERS, SPRINT_DAYS
)

router = APIRouter(prefix="/api/playbook-engine", tags=["Playbook Engine"])

# Database connection
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "labyrinth_db")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Collections
plans_collection = db.execution_plans

# Keep in-memory storage for backward compatibility
execution_plans_db: dict[str, ExecutionPlan] = {}


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


def plan_to_dict(plan: ExecutionPlan) -> dict:
    """Convert ExecutionPlan model to dict for MongoDB storage"""
    data = plan.model_dump()
    data["_id"] = plan.id
    return data


# ==================== PLAN GENERATION ENGINE ====================

def generate_execution_plan(strategy: StrategyInput) -> ExecutionPlan:
    """Generate a complete execution plan from strategy input"""
    
    # Get template for this issue category
    template = EXECUTION_TEMPLATES.get(
        strategy.issue_category,
        EXECUTION_TEMPLATES["OPERATIONS"]  # Default fallback
    )
    
    # Get tier and sprint multipliers
    tier_mult = TIER_MULTIPLIERS.get(strategy.tier, TIER_MULTIPLIERS["TIER_2"])
    sprint_days = SPRINT_DAYS.get(strategy.sprint_timeline, 21)
    
    # Calculate timeline based on tier
    effective_days = int(sprint_days * tier_mult["timeline"])
    start_date = datetime.now(timezone.utc)
    target_end = start_date + timedelta(days=effective_days)
    
    # Generate plan ID
    plan_id = f"plan_{uuid.uuid4().hex[:12]}"
    
    # Generate roles
    roles = []
    for role_template in template["roles_template"]:
        role = ExecutionRole(
            id=f"role_{uuid.uuid4().hex[:8]}",
            role_type=RoleType(role_template["role_type"]),
            title=role_template["title"],
            time_commitment=role_template["time_commitment"],
            responsibilities=_get_role_responsibilities(role_template["role_type"], strategy.issue_category)
        )
        roles.append(role)
    
    # Generate milestones
    milestones = []
    for ms_template in template["milestones_template"]:
        # Scale day offset by sprint timeline
        scaled_offset = int(ms_template["day_offset"] * (sprint_days / 21) * tier_mult["timeline"])
        due_date = start_date + timedelta(days=scaled_offset)
        
        milestone = ExecutionMilestone(
            id=f"milestone_{uuid.uuid4().hex[:8]}",
            name=ms_template["name"],
            description=f"{ms_template['name']} for {strategy.issue_name}",
            phase=ms_template["phase"],
            due_date=due_date,
            owner_role_id=roles[0].id if roles else None,
            deliverables=_get_milestone_deliverables(ms_template["name"], strategy.issue_category),
            success_criteria=_get_milestone_success_criteria(ms_template["name"])
        )
        milestones.append(milestone)
    
    # Generate tasks for each milestone
    tasks = []
    for milestone in milestones:
        milestone_tasks = _generate_tasks_for_milestone(
            milestone, 
            strategy, 
            roles,
            tier_mult
        )
        tasks.extend(milestone_tasks)
    
    # Generate contract if client-related
    contracts = []
    if strategy.client_name:
        contract = ExecutionContract(
            id=f"exec_contract_{uuid.uuid4().hex[:8]}",
            name=f"{strategy.client_name} - {strategy.issue_name} Contract",
            client_name=strategy.client_name,
            client_package=strategy.client_package or strategy.issue_type_id.upper(),
            function=strategy.issue_category,
            stage="PROPOSAL",
            estimated_value=strategy.budget or _estimate_budget(strategy, tier_mult),
            start_date=start_date,
            end_date=target_end,
            linked_plan_id=plan_id,
            deliverables=[m.name for m in milestones if m.deliverables]
        )
        contracts.append(contract)
    
    # Generate communication channels
    channels = [
        CommunicationChannel(
            id=f"channel_{uuid.uuid4().hex[:8]}",
            name=f"{strategy.issue_name} - Main Thread",
            channel_type="thread",
            purpose="Primary communication channel for project updates",
            participants=[r.id for r in roles]
        )
    ]
    if strategy.client_name:
        channels.append(CommunicationChannel(
            id=f"channel_{uuid.uuid4().hex[:8]}",
            name=f"{strategy.client_name} - Client Communication",
            channel_type="thread",
            purpose="Client-facing communication",
            participants=[r.id for r in roles if r.role_type in [RoleType.PROJECT_LEAD, RoleType.CLIENT_CONTACT]]
        ))
    
    # Create the execution plan
    plan = ExecutionPlan(
        id=plan_id,
        name=f"{strategy.issue_name} Execution Plan",
        description=strategy.description or f"Execution plan for {strategy.issue_name} ({strategy.issue_category})",
        strategy_input=strategy,
        phases=template["phases"],
        roles=roles,
        milestones=milestones,
        tasks=tasks,
        contracts=contracts,
        communication_channels=channels,
        start_date=start_date,
        target_end_date=target_end,
        estimated_budget=strategy.budget or _estimate_budget(strategy, tier_mult),
        status="draft"
    )
    
    return plan


def _get_role_responsibilities(role_type: str, category: str) -> List[str]:
    """Get responsibilities based on role type"""
    responsibilities = {
        RoleType.EXECUTIVE_SPONSOR: [
            "Provide strategic direction",
            "Approve major decisions",
            "Remove blockers",
            "Stakeholder communication"
        ],
        RoleType.PROJECT_LEAD: [
            "Overall project delivery",
            "Team coordination",
            "Risk management",
            "Client relationship"
        ],
        RoleType.COORDINATOR: [
            "Day-to-day coordination",
            "Schedule management",
            "Resource allocation",
            "Status reporting"
        ],
        RoleType.SPECIALIST: [
            "Technical execution",
            "Quality assurance",
            "Documentation",
            "Subject matter expertise"
        ],
        RoleType.SUPPORT: [
            "Administrative support",
            "Documentation",
            "Communication support"
        ],
        RoleType.CLIENT_CONTACT: [
            "Client liaison",
            "Requirement clarification",
            "Feedback collection",
            "Approval coordination"
        ]
    }
    return responsibilities.get(RoleType(role_type), [])


def _get_milestone_deliverables(milestone_name: str, category: str) -> List[str]:
    """Get deliverables based on milestone name"""
    deliverables_map = {
        "Client Onboarding": ["Signed contract", "Access credentials", "Welcome package"],
        "Requirements Gathering": ["Requirements document", "Stakeholder sign-off"],
        "Service Plan Approval": ["Service plan document", "Timeline approval"],
        "Project Kickoff": ["Kickoff presentation", "Team assignments"],
        "Analysis Complete": ["Analysis report", "Gap assessment"],
        "Implementation Plan": ["Implementation plan", "Resource schedule"],
        "Discovery Session": ["Discovery notes", "Key findings"],
        "Recommendations Presented": ["Recommendation deck", "Executive summary"],
        "Final Delivery": ["Final deliverables", "Documentation"],
        "Final Report": ["Final report", "Lessons learned"],
        "Client Sign-off": ["Sign-off document", "Feedback form"],
        "Sprint 1 Complete": ["Working software increment", "Sprint review notes"],
        "Sprint 2 Complete": ["Working software increment", "Sprint review notes"],
        "Testing Complete": ["Test report", "Bug resolution log"],
        "Launch Ready": ["Deployment package", "Go-live checklist"],
    }
    return deliverables_map.get(milestone_name, ["Milestone completion documentation"])


def _get_milestone_success_criteria(milestone_name: str) -> List[str]:
    """Get success criteria for milestone"""
    return [
        f"{milestone_name} objectives achieved",
        "All deliverables completed",
        "Stakeholder approval obtained",
        "Quality standards met"
    ]


def _generate_tasks_for_milestone(
    milestone: ExecutionMilestone,
    strategy: StrategyInput,
    roles: List[ExecutionRole],
    tier_mult: dict
) -> List[ExecutionTask]:
    """Generate tasks for a milestone"""
    tasks = []
    
    # Base tasks for each milestone
    task_templates = {
        "Initiation": [
            ("Review requirements", 2),
            ("Identify stakeholders", 1),
            ("Setup project workspace", 1),
        ],
        "Planning": [
            ("Create detailed plan", 4),
            ("Identify risks", 2),
            ("Resource allocation", 2),
        ],
        "Execution": [
            ("Execute deliverables", 8),
            ("Quality check", 2),
            ("Document progress", 1),
        ],
        "Review": [
            ("Conduct review meeting", 2),
            ("Gather feedback", 1),
            ("Update documentation", 1),
        ],
        "Closure": [
            ("Finalize documentation", 2),
            ("Conduct retrospective", 1),
            ("Archive project", 1),
        ]
    }
    
    # Determine task category from milestone name
    category = "Execution"  # Default
    if "Kickoff" in milestone.name or "Onboarding" in milestone.name:
        category = "Initiation"
    elif "Plan" in milestone.name or "Requirements" in milestone.name or "Analysis" in milestone.name:
        category = "Planning"
    elif "Review" in milestone.name or "Approval" in milestone.name:
        category = "Review"
    elif "Sign-off" in milestone.name or "Final" in milestone.name or "Closure" in milestone.name:
        category = "Closure"
    
    templates = task_templates.get(category, task_templates["Execution"])
    
    for task_name, hours in templates:
        # Scale hours by tier
        scaled_hours = hours * tier_mult["resources"]
        
        # Assign to appropriate role
        assigned_role = None
        if roles:
            if "Review" in task_name or "stakeholder" in task_name.lower():
                assigned_role = next((r for r in roles if r.role_type == RoleType.PROJECT_LEAD), roles[0])
            elif "Document" in task_name or "Setup" in task_name:
                assigned_role = next((r for r in roles if r.role_type == RoleType.COORDINATOR), roles[0])
            else:
                assigned_role = next((r for r in roles if r.role_type == RoleType.SPECIALIST), roles[0])
        
        task = ExecutionTask(
            id=f"task_{uuid.uuid4().hex[:8]}",
            milestone_id=milestone.id,
            title=f"{task_name} - {milestone.name}",
            description=f"{task_name} for {strategy.issue_name}",
            priority="HIGH" if category == "Initiation" else "MEDIUM",
            estimated_hours=scaled_hours,
            due_date=milestone.due_date,
            assigned_role_id=assigned_role.id if assigned_role else None
        )
        tasks.append(task)
    
    return tasks


def _estimate_budget(strategy: StrategyInput, tier_mult: dict) -> float:
    """Estimate budget based on strategy"""
    base_budgets = {
        "CLIENT_SERVICES": {
            "bronze": 5000,
            "silver": 15000,
            "gold": 35000,
            "platinum": 75000,
            "black": 150000
        },
        "OPERATIONS": {"default": 10000},
        "CONSULTATION": {"default": 25000},
        "CRISIS_MANAGEMENT": {"default": 50000},
        "APP_DEVELOPMENT": {"default": 100000}
    }
    
    category_budgets = base_budgets.get(strategy.issue_category, {"default": 15000})
    base = category_budgets.get(strategy.issue_type_id, category_budgets.get("default", 15000))
    
    return base * tier_mult["budget"]


# ==================== API ENDPOINTS ====================

@router.post("/generate")
async def generate_plan(strategy: StrategyInput):
    """Generate an execution plan from strategy input"""
    plan = generate_execution_plan(strategy)
    
    # Store in MongoDB
    await plans_collection.insert_one(plan_to_dict(plan))
    execution_plans_db[plan.id] = plan
    
    return plan


@router.get("/plans")
async def list_plans(status: Optional[str] = None):
    """List all execution plans"""
    # Build query
    query = {}
    if status:
        query["status"] = status
    
    # Query MongoDB
    plans_docs = await plans_collection.find(query, {"_id": 0}).sort("start_date", -1).to_list(1000)
    
    # If no data in MongoDB, check in-memory
    if not plans_docs and execution_plans_db:
        for plan in execution_plans_db.values():
            await plans_collection.update_one(
                {"id": plan.id},
                {"$set": plan_to_dict(plan)},
                upsert=True
            )
        plans_docs = await plans_collection.find(query, {"_id": 0}).sort("start_date", -1).to_list(1000)
    
    summaries = []
    for plan_doc in plans_docs:
        milestones = plan_doc.get("milestones", [])
        tasks = plan_doc.get("tasks", [])
        completed_milestones = len([m for m in milestones if m.get("status") == MilestoneStatus.COMPLETED.value])
        completed_tasks = len([t for t in tasks if t.get("status") == "completed"])
        
        strategy_input = plan_doc.get("strategy_input", {})
        
        summaries.append({
            "id": plan_doc.get("id"),
            "name": plan_doc.get("name"),
            "status": plan_doc.get("status"),
            "progress_percent": plan_doc.get("progress_percent", 0),
            "start_date": plan_doc.get("start_date"),
            "target_end_date": plan_doc.get("target_end_date"),
            "total_milestones": len(milestones),
            "completed_milestones": completed_milestones,
            "total_tasks": len(tasks),
            "completed_tasks": completed_tasks,
            "client_name": strategy_input.get("client_name"),
            "issue_category": strategy_input.get("issue_category")
        })
    
    return summaries


@router.get("/plans/{plan_id}")
async def get_plan(plan_id: str):
    """Get a specific execution plan"""
    plan_doc = await plans_collection.find_one({"id": plan_id}, {"_id": 0})
    if not plan_doc:
        raise HTTPException(status_code=404, detail="Execution plan not found")
    return serialize_doc(plan_doc)


@router.patch("/plans/{plan_id}/status")
async def update_plan_status(plan_id: str, status: str):
    """Update plan status"""
    plan_doc = await plans_collection.find_one({"id": plan_id})
    if not plan_doc:
        raise HTTPException(status_code=404, detail="Execution plan not found")
    
    valid_statuses = ["draft", "active", "paused", "completed", "cancelled"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    update_data = {
        "status": status,
        "updated_at": datetime.now(timezone.utc)
    }
    
    if status == "completed":
        update_data["actual_end_date"] = datetime.now(timezone.utc)
        update_data["progress_percent"] = 100
    
    await plans_collection.update_one({"id": plan_id}, {"$set": update_data})
    
    updated_doc = await plans_collection.find_one({"id": plan_id}, {"_id": 0})
    return serialize_doc(updated_doc)


@router.patch("/plans/{plan_id}/milestones/{milestone_id}")
async def update_milestone(plan_id: str, milestone_id: str, status: MilestoneStatus):
    """Update milestone status"""
    if plan_id not in execution_plans_db:
        raise HTTPException(status_code=404, detail="Execution plan not found")
    
    plan = execution_plans_db[plan_id]
    
    for milestone in plan.milestones:
        if milestone.id == milestone_id:
            milestone.status = status
            if status == MilestoneStatus.COMPLETED:
                milestone.completed_date = datetime.now(timezone.utc)
                milestone.progress_percent = 100
            
            # Update plan progress
            completed = len([m for m in plan.milestones if m.status == MilestoneStatus.COMPLETED])
            plan.progress_percent = int((completed / len(plan.milestones)) * 100)
            plan.updated_at = datetime.now(timezone.utc)
            
            execution_plans_db[plan_id] = plan
            return milestone
    
    raise HTTPException(status_code=404, detail="Milestone not found")


@router.patch("/plans/{plan_id}/tasks/{task_id}")
async def update_task(plan_id: str, task_id: str, status: str):
    """Update task status"""
    plan_doc = await plans_collection.find_one({"id": plan_id})
    if not plan_doc:
        raise HTTPException(status_code=404, detail="Execution plan not found")
    
    tasks = plan_doc.get("tasks", [])
    task_found = False
    updated_task = None
    
    for task in tasks:
        if task.get("id") == task_id:
            task["status"] = status
            if status == "completed":
                task["completed_date"] = datetime.now(timezone.utc).isoformat()
            task_found = True
            updated_task = task
            break
    
    if not task_found:
        raise HTTPException(status_code=404, detail="Task not found")
    
    await plans_collection.update_one(
        {"id": plan_id},
        {"$set": {"tasks": tasks, "updated_at": datetime.now(timezone.utc)}}
    )
    
    return {"message": "Task status updated", "task_id": task_id, "status": status, "task": updated_task}


@router.patch("/plans/{plan_id}/tasks/{task_id}/assign")
async def assign_task(plan_id: str, task_id: str, assignee_id: str, assignee_name: str = None):
    """Assign a task to a specific person/talent"""
    plan_doc = await plans_collection.find_one({"id": plan_id})
    if not plan_doc:
        raise HTTPException(status_code=404, detail="Execution plan not found")
    
    tasks = plan_doc.get("tasks", [])
    task_found = False
    
    for task in tasks:
        if task.get("id") == task_id:
            task["assignee_id"] = assignee_id
            task["assignee_name"] = assignee_name or assignee_id
            task["assigned_at"] = datetime.now(timezone.utc).isoformat()
            task_found = True
            break
    
    if not task_found:
        raise HTTPException(status_code=404, detail="Task not found")
    
    await plans_collection.update_one(
        {"id": plan_id},
        {"$set": {"tasks": tasks, "updated_at": datetime.now(timezone.utc)}}
    )
    
    return {"message": "Task assigned successfully", "task_id": task_id, "assignee_id": assignee_id}


@router.get("/plans/{plan_id}/progress")
async def get_plan_progress(plan_id: str):
    """Get detailed progress tracking for a plan"""
    plan_doc = await plans_collection.find_one({"id": plan_id}, {"_id": 0})
    if not plan_doc:
        raise HTTPException(status_code=404, detail="Execution plan not found")
    
    milestones = plan_doc.get("milestones", [])
    tasks = plan_doc.get("tasks", [])
    
    # Calculate progress metrics
    completed_milestones = len([m for m in milestones if m.get("status") == "COMPLETED"])
    completed_tasks = len([t for t in tasks if t.get("status") == "completed"])
    in_progress_tasks = len([t for t in tasks if t.get("status") == "in_progress"])
    blocked_tasks = len([t for t in tasks if t.get("status") == "blocked"])
    
    total_hours = sum(t.get("estimated_hours", 0) for t in tasks)
    completed_hours = sum(t.get("estimated_hours", 0) for t in tasks if t.get("status") == "completed")
    
    # Calculate days remaining
    target_end = plan_doc.get("target_end_date")
    days_remaining = None
    if target_end:
        try:
            end_date = datetime.fromisoformat(target_end.replace('Z', '+00:00')) if isinstance(target_end, str) else target_end
            days_remaining = (end_date - datetime.now(timezone.utc)).days
        except:
            pass
    
    # Progress by phase
    phase_progress = {}
    for phase in ["INITIATION", "PLANNING", "EXECUTION", "MONITORING", "CLOSURE"]:
        phase_tasks = [t for t in tasks if t.get("phase") == phase]
        phase_completed = len([t for t in phase_tasks if t.get("status") == "completed"])
        phase_progress[phase] = {
            "total": len(phase_tasks),
            "completed": phase_completed,
            "percent": round((phase_completed / len(phase_tasks) * 100) if phase_tasks else 0, 1)
        }
    
    return {
        "plan_id": plan_id,
        "overall_progress": plan_doc.get("progress_percent", 0),
        "milestones": {
            "total": len(milestones),
            "completed": completed_milestones,
            "percent": round((completed_milestones / len(milestones) * 100) if milestones else 0, 1)
        },
        "tasks": {
            "total": len(tasks),
            "completed": completed_tasks,
            "in_progress": in_progress_tasks,
            "blocked": blocked_tasks,
            "percent": round((completed_tasks / len(tasks) * 100) if tasks else 0, 1)
        },
        "hours": {
            "total": total_hours,
            "completed": completed_hours,
            "percent": round((completed_hours / total_hours * 100) if total_hours else 0, 1)
        },
        "days_remaining": days_remaining,
        "phase_progress": phase_progress,
        "last_updated": plan_doc.get("updated_at")
    }


@router.post("/plans/{plan_id}/activate")
async def activate_plan(plan_id: str, background_tasks: BackgroundTasks):
    """Activate a plan - creates contracts and communication threads"""
    if plan_id not in execution_plans_db:
        raise HTTPException(status_code=404, detail="Execution plan not found")
    
    plan = execution_plans_db[plan_id]
    
    if plan.status != "draft":
        raise HTTPException(status_code=400, detail="Only draft plans can be activated")
    
    created_contracts = []
    created_threads = []
    
    # Try to create contracts in communication system
    # Note: This is a best-effort integration with other modules
    try:
        from communication_routes import threads_db, messages_db, Thread, Message, Participant, ThreadType, ThreadStatus, MessageType, ParticipantRole
        
        # Create communication threads
        for channel in plan.communication_channels:
            thread = Thread(
                id=channel.id,
                title=channel.name,
                thread_type=ThreadType.CONTRACT,
                related_id=plan_id,
                description=channel.purpose,
                status=ThreadStatus.OPEN,
                participants=[
                    Participant(
                        user_id="system",
                        name="Labyrinth System",
                        role=ParticipantRole.OWNER
                    )
                ],
                message_count=1,
                created_by="playbook_engine",
                tags=["auto-created", "execution-plan"]
            )
            threads_db[channel.id] = thread
            
            # Add initial message
            msg = Message(
                id=f"msg_{uuid.uuid4().hex[:8]}",
                thread_id=channel.id,
                sender_id="system",
                sender_name="Playbook Engine",
                content=f"Communication thread created for execution plan: {plan.name}",
                message_type=MessageType.SYSTEM
            )
            messages_db[channel.id] = [msg]
            
            channel.thread_id = channel.id
            created_threads.append(channel.id)
    except (ImportError, Exception) as e:
        # Communication module not available or error - skip thread creation
        print(f"Note: Could not create communication threads: {e}")
    
    # Mark contracts as created (they are stored in the plan itself)
    for contract in plan.contracts:
        created_contracts.append(contract.id)
    
    # Update plan status
    plan.status = "active"
    plan.updated_at = datetime.now(timezone.utc)
    execution_plans_db[plan_id] = plan
    
    return {
        "message": "Plan activated successfully",
        "plan_id": plan_id,
        "contracts_created": created_contracts,
        "threads_created": created_threads
    }


@router.delete("/plans/{plan_id}")
async def delete_plan(plan_id: str):
    """Delete an execution plan"""
    if plan_id not in execution_plans_db:
        raise HTTPException(status_code=404, detail="Execution plan not found")
    
    plan = execution_plans_db[plan_id]
    if plan.status == "active":
        raise HTTPException(status_code=400, detail="Cannot delete active plans. Pause or cancel first.")
    
    del execution_plans_db[plan_id]
    return {"message": "Plan deleted"}


# ==================== ANALYTICS ENDPOINTS ====================

@router.get("/analytics/summary")
async def get_analytics_summary():
    """Get analytics summary of all execution plans"""
    # Query MongoDB
    plans_docs = await plans_collection.find({}, {"_id": 0}).to_list(1000)
    
    if not plans_docs:
        return {
            "total_plans": 0,
            "active_plans": 0,
            "completed_plans": 0,
            "total_milestones": 0,
            "completed_milestones": 0,
            "total_tasks": 0,
            "completed_tasks": 0,
            "total_budget": 0,
            "by_category": {},
            "by_status": {}
        }
    
    # Calculate metrics
    active = len([p for p in plans_docs if p.get("status") == "active"])
    completed = len([p for p in plans_docs if p.get("status") == "completed"])
    
    all_milestones = [m for p in plans_docs for m in p.get("milestones", [])]
    completed_milestones = len([m for m in all_milestones if m.get("status") == MilestoneStatus.COMPLETED.value])
    
    all_tasks = [t for p in plans_docs for t in p.get("tasks", [])]
    completed_tasks = len([t for t in all_tasks if t.get("status") == "completed"])
    
    total_budget = sum(p.get("estimated_budget", 0) for p in plans_docs)
    
    # Group by category
    by_category = {}
    for plan in plans_docs:
        strategy_input = plan.get("strategy_input", {})
        cat = strategy_input.get("issue_category", "UNKNOWN")
        if cat not in by_category:
            by_category[cat] = 0
        by_category[cat] += 1
    
    # Group by status
    by_status = {}
    for plan in plans_docs:
        status = plan.get("status", "unknown")
        if status not in by_status:
            by_status[status] = 0
        by_status[status] += 1
    
    return {
        "total_plans": len(plans_docs),
        "active_plans": active,
        "completed_plans": completed,
        "total_milestones": len(all_milestones),
        "completed_milestones": completed_milestones,
        "total_tasks": len(all_tasks),
        "completed_tasks": completed_tasks,
        "total_budget": total_budget,
        "by_category": by_category,
        "by_status": by_status
    }


# ==================== SEED DATA ====================

@router.post("/seed-demo")
async def seed_demo_data():
    """Seed demo execution plans"""
    # Clear MongoDB collection
    await plans_collection.delete_many({})
    execution_plans_db.clear()
    
    # Create demo strategies and generate plans
    demo_strategies = [
        StrategyInput(
            issue_category="CLIENT_SERVICES",
            issue_type_id="gold",
            issue_name="Gold Package - Enterprise Client",
            sprint_timeline="TWO_THREE_WEEKS",
            tier="TIER_1",
            client_name="Acme Corporation",
            client_package="GOLD",
            description="Full-service gold package implementation for Acme Corp",
            priority="HIGH",
            budget=50000
        ),
        StrategyInput(
            issue_category="APP_DEVELOPMENT",
            issue_type_id="prototype_development",
            issue_name="MVP Development",
            sprint_timeline="FOUR_SIX_WEEKS",
            tier="TIER_2",
            client_name="TechStart Inc",
            description="Mobile app MVP development project",
            priority="MEDIUM",
            budget=75000
        ),
        StrategyInput(
            issue_category="CONSULTATION",
            issue_type_id="finance",
            issue_name="Financial Advisory",
            sprint_timeline="ONE_WEEK",
            tier="TIER_1",
            client_name="Global Finance Ltd",
            description="Financial process optimization consultation",
            priority="HIGH"
        )
    ]
    
    created_plans = []
    for strategy in demo_strategies:
        plan = generate_execution_plan(strategy)
        execution_plans_db[plan.id] = plan
        created_plans.append(plan.id)
    
    # Activate first plan to create contracts/threads
    if created_plans:
        first_plan = execution_plans_db[created_plans[0]]
        first_plan.status = "active"
        execution_plans_db[first_plan.id] = first_plan
    
    # Persist to MongoDB
    for plan in execution_plans_db.values():
        await plans_collection.insert_one(plan_to_dict(plan))
    
    return {
        "message": f"Created {len(created_plans)} demo execution plans in MongoDB",
        "plan_ids": created_plans
    }
