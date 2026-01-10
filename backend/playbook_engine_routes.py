"""
Playbook Engine Routes
API endpoints for generating and managing execution plans from strategy inputs
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import uuid

from playbook_engine_models import (
    StrategyInput, ExecutionPlan, ExecutionPlanSummary,
    ExecutionRole, ExecutionMilestone, ExecutionTask,
    ExecutionContract, CommunicationChannel,
    ExecutionPhase, MilestoneStatus, RoleType,
    EXECUTION_TEMPLATES, TIER_MULTIPLIERS, SPRINT_DAYS
)

router = APIRouter(prefix="/api/playbook-engine", tags=["Playbook Engine"])

# In-memory storage
execution_plans_db: dict[str, ExecutionPlan] = {}


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

@router.post("/generate", response_model=ExecutionPlan)
async def generate_plan(strategy: StrategyInput):
    """Generate an execution plan from strategy input"""
    plan = generate_execution_plan(strategy)
    execution_plans_db[plan.id] = plan
    return plan


@router.get("/plans", response_model=List[ExecutionPlanSummary])
async def list_plans(status: Optional[str] = None):
    """List all execution plans"""
    plans = list(execution_plans_db.values())
    
    if status:
        plans = [p for p in plans if p.status == status]
    
    summaries = []
    for plan in plans:
        completed_milestones = len([m for m in plan.milestones if m.status == MilestoneStatus.COMPLETED])
        completed_tasks = len([t for t in plan.tasks if t.status == "completed"])
        
        summaries.append(ExecutionPlanSummary(
            id=plan.id,
            name=plan.name,
            status=plan.status,
            progress_percent=plan.progress_percent,
            start_date=plan.start_date,
            target_end_date=plan.target_end_date,
            total_milestones=len(plan.milestones),
            completed_milestones=completed_milestones,
            total_tasks=len(plan.tasks),
            completed_tasks=completed_tasks,
            client_name=plan.strategy_input.client_name,
            issue_category=plan.strategy_input.issue_category
        ))
    
    return sorted(summaries, key=lambda x: x.start_date, reverse=True)


@router.get("/plans/{plan_id}", response_model=ExecutionPlan)
async def get_plan(plan_id: str):
    """Get a specific execution plan"""
    if plan_id not in execution_plans_db:
        raise HTTPException(status_code=404, detail="Execution plan not found")
    return execution_plans_db[plan_id]


@router.patch("/plans/{plan_id}/status")
async def update_plan_status(plan_id: str, status: str):
    """Update plan status"""
    if plan_id not in execution_plans_db:
        raise HTTPException(status_code=404, detail="Execution plan not found")
    
    valid_statuses = ["draft", "active", "paused", "completed", "cancelled"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    plan = execution_plans_db[plan_id]
    plan.status = status
    plan.updated_at = datetime.now(timezone.utc)
    
    if status == "completed":
        plan.actual_end_date = datetime.now(timezone.utc)
        plan.progress_percent = 100
    
    execution_plans_db[plan_id] = plan
    return plan


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
    if plan_id not in execution_plans_db:
        raise HTTPException(status_code=404, detail="Execution plan not found")
    
    plan = execution_plans_db[plan_id]
    
    for task in plan.tasks:
        if task.id == task_id:
            task.status = status
            if status == "completed":
                task.completed_date = datetime.now(timezone.utc)
            
            plan.updated_at = datetime.now(timezone.utc)
            execution_plans_db[plan_id] = plan
            return task
    
    raise HTTPException(status_code=404, detail="Task not found")


@router.post("/plans/{plan_id}/activate")
async def activate_plan(plan_id: str, background_tasks: BackgroundTasks):
    """Activate a plan - creates contracts and communication threads"""
    if plan_id not in execution_plans_db:
        raise HTTPException(status_code=404, detail="Execution plan not found")
    
    plan = execution_plans_db[plan_id]
    
    if plan.status != "draft":
        raise HTTPException(status_code=400, detail="Only draft plans can be activated")
    
    # Create contracts in contract lifecycle system
    created_contracts = []
    for contract in plan.contracts:
        from contract_lifecycle_routes import contracts_db
        
        lifecycle_contract = {
            "id": contract.id,
            "name": contract.name,
            "client_name": contract.client_name,
            "client_package": contract.client_package,
            "function": contract.function,
            "contract_type": contract.contract_type,
            "stage": "PROPOSAL",
            "estimated_value": contract.estimated_value,
            "start_date": contract.start_date.isoformat() if contract.start_date else None,
            "end_date": contract.end_date.isoformat() if contract.end_date else None,
            "execution_plan_id": plan_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        contracts_db[contract.id] = lifecycle_contract
        created_contracts.append(contract.id)
    
    # Create communication threads
    created_threads = []
    for channel in plan.communication_channels:
        from communication_routes import threads_db, messages_db, Thread, Message, Participant, ThreadType, ThreadStatus, MessageType, ParticipantRole
        
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
    plans = list(execution_plans_db.values())
    
    if not plans:
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
    active = len([p for p in plans if p.status == "active"])
    completed = len([p for p in plans if p.status == "completed"])
    
    all_milestones = [m for p in plans for m in p.milestones]
    completed_milestones = len([m for m in all_milestones if m.status == MilestoneStatus.COMPLETED])
    
    all_tasks = [t for p in plans for t in p.tasks]
    completed_tasks = len([t for t in all_tasks if t.status == "completed"])
    
    total_budget = sum(p.estimated_budget for p in plans)
    
    # Group by category
    by_category = {}
    for plan in plans:
        cat = plan.strategy_input.issue_category
        if cat not in by_category:
            by_category[cat] = 0
        by_category[cat] += 1
    
    # Group by status
    by_status = {}
    for plan in plans:
        status = plan.status
        if status not in by_status:
            by_status[status] = 0
        by_status[status] += 1
    
    return {
        "total_plans": len(plans),
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
    
    return {
        "message": f"Created {len(created_plans)} demo execution plans",
        "plan_ids": created_plans
    }
