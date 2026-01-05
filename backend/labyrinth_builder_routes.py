"""
Labyrinth Builder - API Routes
Spreadsheet-to-Workflow Renderer System
"""

from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import uuid

from labyrinth_builder_models import (
    IssueCategory, SprintTimeline, PlaybookTier,
    ISSUE_TYPES, SPRINT_CONFIG,
    LabyrinthIssue, LabyrinthCampaign, LabyrinthSOP, 
    LabyrinthTemplate, LabyrinthContract,
    BuilderSelection, WorkflowRenderRequest, WorkflowRenderResponse
)

builder_router = APIRouter(prefix="/builder", tags=["Labyrinth Builder"])


def serialize_doc(doc: dict) -> dict:
    """Convert datetime objects to ISO strings for MongoDB"""
    for key, value in doc.items():
        if isinstance(value, datetime):
            doc[key] = value.isoformat()
    return doc


def get_db():
    """Get database instance - imported from server.py"""
    from server import db
    return db


# ==================== ISSUE ENDPOINTS ====================

@builder_router.get("/issues/categories")
async def get_issue_categories():
    """Get all issue categories"""
    return [
        {
            "id": cat.value,
            "name": cat.value.replace("_", " ").title(),
            "description": f"{cat.value.replace('_', ' ').title()} related challenges"
        }
        for cat in IssueCategory
    ]


@builder_router.get("/issues/types/{category}")
async def get_issue_types(category: IssueCategory):
    """Get issue types for a specific category"""
    return ISSUE_TYPES.get(category, [])


@builder_router.get("/issues/types")
async def get_all_issue_types():
    """Get all issue types organized by category"""
    return {cat.value: types for cat, types in ISSUE_TYPES.items()}


# ==================== SPRINT ENDPOINTS ====================

@builder_router.get("/sprints")
async def get_sprint_options():
    """Get all sprint timeline options"""
    return [
        {
            "id": sprint.value,
            "label": config["label"],
            "color": config["color"],
            "days": config["days"]
        }
        for sprint, config in SPRINT_CONFIG.items()
    ]


# ==================== TIER ENDPOINTS ====================

@builder_router.get("/tiers")
async def get_tier_options():
    """Get all playbook tier options"""
    return [
        {
            "id": PlaybookTier.TIER_1.value,
            "name": "Tier 1",
            "description": "Top resources - best personnel, premium software, maximum priority",
            "color": "#8B5CF6"
        },
        {
            "id": PlaybookTier.TIER_2.value,
            "name": "Tier 2", 
            "description": "Standard resources - qualified team, professional tools",
            "color": "#3B82F6"
        },
        {
            "id": PlaybookTier.TIER_3.value,
            "name": "Tier 3",
            "description": "Basic resources - entry-level support, essential tools",
            "color": "#22C55E"
        }
    ]


# ==================== SOP ENDPOINTS ====================

@builder_router.get("/sops")
async def get_all_sops():
    """Get all builder SOPs"""
    db = get_db()
    sops = await db.builder_sops.find({}, {"_id": 0}).to_list(1000)
    return sops


@builder_router.get("/sops/lookup")
async def get_sops_for_selection(
    issue_category: IssueCategory,
    issue_type_id: str,
    tier: PlaybookTier
):
    """Get SOPs for a specific issue + tier combination"""
    db = get_db()
    sops = await db.builder_sops.find({
        "issue_category": issue_category.value,
        "issue_type_id": issue_type_id,
        "tier": tier.value
    }, {"_id": 0}).to_list(100)
    return sops


@builder_router.post("/sops")
async def create_sop(sop: LabyrinthSOP):
    """Create a new SOP"""
    db = get_db()
    sop_dict = serialize_doc(sop.model_dump())
    await db.builder_sops.insert_one(sop_dict)
    return sop_dict


@builder_router.post("/sops/bulk")
async def bulk_create_sops(sops: List[LabyrinthSOP]):
    """Bulk create SOPs"""
    db = get_db()
    created = []
    for sop in sops:
        sop_dict = serialize_doc(sop.model_dump())
        await db.builder_sops.insert_one(sop_dict)
        created.append(sop_dict)
    return {"created": len(created), "sops": created}


# ==================== TEMPLATE ENDPOINTS ====================

@builder_router.get("/templates")
async def get_all_templates():
    """Get all deliverable templates"""
    db = get_db()
    templates = await db.builder_templates.find({}, {"_id": 0}).to_list(1000)
    return templates


@builder_router.get("/templates/for-sops")
async def get_templates_for_sops(sop_ids: str):
    """Get templates linked to specific SOPs"""
    db = get_db()
    sop_id_list = sop_ids.split(",")
    templates = await db.builder_templates.find({
        "linked_sop_ids": {"$in": sop_id_list}
    }, {"_id": 0}).to_list(100)
    return templates


@builder_router.post("/templates")
async def create_template(template: LabyrinthTemplate):
    """Create a new template"""
    db = get_db()
    template_dict = serialize_doc(template.model_dump())
    await db.builder_templates.insert_one(template_dict)
    return template_dict


@builder_router.post("/templates/bulk")
async def bulk_create_templates(templates: List[LabyrinthTemplate]):
    """Bulk create templates"""
    db = get_db()
    created = []
    for template in templates:
        template_dict = serialize_doc(template.model_dump())
        await db.builder_templates.insert_one(template_dict)
        created.append(template_dict)
    return {"created": len(created), "templates": created}


# ==================== CONTRACT ENDPOINTS ====================

@builder_router.get("/contracts")
async def get_all_contracts():
    """Get all contracts"""
    db = get_db()
    contracts = await db.builder_contracts.find({}, {"_id": 0}).to_list(1000)
    return contracts


@builder_router.get("/contracts/for-sops")
async def get_contracts_for_sops(sop_ids: str):
    """Get contracts linked to specific SOPs"""
    db = get_db()
    sop_id_list = sop_ids.split(",")
    contracts = await db.builder_contracts.find({
        "linked_sop_ids": {"$in": sop_id_list}
    }, {"_id": 0}).to_list(100)
    return contracts


@builder_router.post("/contracts")
async def create_contract(contract: LabyrinthContract):
    """Create a new contract"""
    db = get_db()
    contract_dict = serialize_doc(contract.model_dump())
    await db.builder_contracts.insert_one(contract_dict)
    return contract_dict


@builder_router.post("/contracts/bulk")
async def bulk_create_contracts(contracts: List[LabyrinthContract]):
    """Bulk create contracts"""
    db = get_db()
    created = []
    for contract in contracts:
        contract_dict = serialize_doc(contract.model_dump())
        await db.builder_contracts.insert_one(contract_dict)
        created.append(contract_dict)
    return {"created": len(created), "contracts": created}


# ==================== WORKFLOW RENDER ENDPOINTS ====================

@builder_router.post("/render-workflow", response_model=WorkflowRenderResponse)
async def render_workflow(request: WorkflowRenderRequest):
    """
    Render a workflow from builder selections.
    Creates nodes and edges based on:
    - Issue (Challenge) -> Starting point
    - Sprint (Timeline) -> Urgency indicator
    - Tier (Resources) -> Determines SOPs
    - SOPs -> Action nodes
    - Templates -> Resource nodes
    - Contracts -> Deliverable nodes
    """
    db = get_db()
    selection = request.selection
    
    # Get issue details
    issue_types = ISSUE_TYPES.get(selection.issue_category, [])
    issue = next((i for i in issue_types if i["id"] == selection.issue_type_id), None)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue type not found")
    
    # Get sprint config
    sprint_config = SPRINT_CONFIG.get(selection.sprint, {})
    
    # Get SOPs for this selection
    sops = await db.builder_sops.find({
        "issue_category": selection.issue_category.value,
        "issue_type_id": selection.issue_type_id,
        "tier": selection.tier.value
    }, {"_id": 0}).to_list(100)
    
    # Get templates and contracts by category fallback
    category_template_map = {
        "CLIENT_SERVICES": ["Client Welcome Packet", "Service Agreement Template", "Onboarding Checklist", "Client Portal Guide", "Success Plan Template"],
        "OPERATIONS": ["Job Description Template", "Interview Scorecard", "Training Materials Template", "SOP Template", "Meeting Agenda Template"],
        "CONSULTATION": ["Strategy Presentation", "Financial Analysis Report", "Market Analysis Report", "Recommendation Report"],
        "CRISIS_MANAGEMENT": ["Incident Report Form", "Crisis Communication Template", "Emergency Contact List", "Business Continuity Plan", "Post-Mortem Template"],
        "APP_DEVELOPMENT": ["PRD Template", "Technical Spec Template", "Test Plan Template", "Release Notes Template", "User Guide Template"],
    }
    
    category_contract_map = {
        "CLIENT_SERVICES": ["Gold Service Agreement", "Monthly Retainer"],
        "OPERATIONS": ["Employment Contract", "Contractor Agreement"],
        "CONSULTATION": ["Consulting Engagement", "Advisory Retainer"],
        "CRISIS_MANAGEMENT": ["Business Continuity Plan"],
        "APP_DEVELOPMENT": ["Contractor Agreement", "NDA Template"],
    }
    
    template_names = category_template_map.get(selection.issue_category.value, [])[:3]
    contract_names = category_contract_map.get(selection.issue_category.value, [])[:2]
    
    templates = await db.builder_templates.find({"name": {"$in": template_names}}, {"_id": 0}).to_list(10)
    contracts = await db.builder_contracts.find({"name": {"$in": contract_names}}, {"_id": 0}).to_list(10)
    
    # Generate workflow nodes - Create a proper visual workflow
    nodes = []
    edges = []
    
    # Layout configuration
    NODE_WIDTH = 200
    NODE_HEIGHT = 80
    H_SPACING = 280  # Horizontal spacing between nodes
    V_SPACING = 150  # Vertical spacing between rows
    
    # Row positions
    RESOURCE_ROW = 50      # Top row for resources/templates
    MAIN_ROW = 250         # Middle row for main workflow
    DELIVERABLE_ROW = 450  # Bottom row for deliverables/contracts
    
    # ==================== ISSUE NODE (Start) ====================
    issue_node_id = f"issue_{uuid.uuid4().hex[:8]}"
    nodes.append({
        "id": issue_node_id,
        "type": "custom",
        "position": {"x": 50, "y": MAIN_ROW},
        "data": {
            "label": f"📋 {issue['name']}",
            "node_type": "ISSUE",
            "description": f"Challenge: {issue['description']}\nSprint: {sprint_config.get('label', 'N/A')}\nTier: {selection.tier.value.replace('_', ' ')}"
        }
    })
    
    # ==================== SOP STEPS AS ACTION NODES ====================
    prev_node_id = issue_node_id
    all_step_nodes = []
    
    # Collect all steps from all SOPs
    step_x = 350
    for sop in sops:
        steps = sop.get("steps", [])
        for step in steps:
            step_node_id = f"step_{uuid.uuid4().hex[:8]}"
            nodes.append({
                "id": step_node_id,
                "type": "custom",
                "position": {"x": step_x, "y": MAIN_ROW},
                "data": {
                    "label": f"⚡ {step.get('title', 'Step')}",
                    "node_type": "ACTION",
                    "description": step.get('description', ''),
                    "sop_name": sop["name"]
                }
            })
            # Connect to previous node
            edges.append({
                "id": f"e_{prev_node_id}_{step_node_id}",
                "source": prev_node_id,
                "target": step_node_id,
                "type": "smoothstep"
            })
            prev_node_id = step_node_id
            all_step_nodes.append(step_node_id)
            step_x += H_SPACING
    
    # If no SOPs, create placeholder
    if not sops:
        placeholder_id = f"placeholder_{uuid.uuid4().hex[:8]}"
        nodes.append({
            "id": placeholder_id,
            "type": "custom",
            "position": {"x": 350, "y": MAIN_ROW},
            "data": {
                "label": "📝 Define SOP Steps",
                "node_type": "STICKY_NOTE",
                "description": "Add SOPs for this Issue + Tier combination"
            }
        })
        edges.append({
            "id": f"e_{issue_node_id}_{placeholder_id}",
            "source": issue_node_id,
            "target": placeholder_id,
            "type": "smoothstep"
        })
        prev_node_id = placeholder_id
        step_x = 600
    
    # ==================== TEMPLATE NODES (Resources - Top Row) ====================
    template_x = 350
    for idx, template in enumerate(templates):
        template_node_id = f"template_{uuid.uuid4().hex[:8]}"
        nodes.append({
            "id": template_node_id,
            "type": "custom",
            "position": {"x": template_x, "y": RESOURCE_ROW},
            "data": {
                "label": f"📄 {template['name']}",
                "node_type": "RESOURCE",
                "description": template.get("description", ""),
                "template_type": template.get("template_type", "document")
            }
        })
        # Connect templates to first step node if exists
        if all_step_nodes:
            edges.append({
                "id": f"e_{template_node_id}_{all_step_nodes[0]}",
                "source": template_node_id,
                "target": all_step_nodes[0],
                "type": "smoothstep",
                "style": {"strokeDasharray": "5,5"}
            })
        template_x += H_SPACING
    
    # ==================== CONTRACT/DELIVERABLE NODES (Bottom Row) ====================
    contract_x = step_x - H_SPACING if step_x > 350 else 350
    
    for idx, contract in enumerate(contracts):
        contract_node_id = f"contract_{uuid.uuid4().hex[:8]}"
        contract_type_emoji = "📋" if contract.get("contract_type") == "PROJECT" else "🔄"
        nodes.append({
            "id": contract_node_id,
            "type": "custom",
            "position": {"x": contract_x + (idx * H_SPACING), "y": DELIVERABLE_ROW},
            "data": {
                "label": f"{contract_type_emoji} {contract['name']}",
                "node_type": "DELIVERABLE",
                "description": f"{contract.get('description', '')}\nType: {contract.get('contract_type', 'PROJECT')}",
                "contract_type": contract.get("contract_type", "PROJECT")
            }
        })
        # Connect from last step to deliverables
        edges.append({
            "id": f"e_{prev_node_id}_{contract_node_id}",
            "source": prev_node_id,
            "target": contract_node_id,
            "type": "smoothstep"
        })
    
    # ==================== COMPLETION NODE ====================
    completion_node_id = f"complete_{uuid.uuid4().hex[:8]}"
    final_x = max(step_x, contract_x + (len(contracts) * H_SPACING)) + 100
    nodes.append({
        "id": completion_node_id,
        "type": "custom",
        "position": {"x": final_x, "y": MAIN_ROW},
        "data": {
            "label": "✅ Complete",
            "node_type": "MILESTONE",
            "description": f"Workflow complete for {issue['name']}"
        }
    })
    
    # Connect last items to completion
    if contracts:
        for idx, contract in enumerate(contracts):
            contract_node_id = [n["id"] for n in nodes if n["data"].get("label", "").endswith(contract["name"])]
            if contract_node_id:
                edges.append({
                    "id": f"e_{contract_node_id[0]}_{completion_node_id}",
                    "source": contract_node_id[0],
                    "target": completion_node_id,
                    "type": "smoothstep"
                })
    else:
        edges.append({
            "id": f"e_{prev_node_id}_{completion_node_id}",
            "source": prev_node_id,
            "target": completion_node_id,
            "type": "smoothstep"
        })
        contract_node_id = f"contract_{uuid.uuid4().hex[:8]}"
        nodes.append({
            "id": contract_node_id,
            "type": "custom",
            "position": {"x": last_x, "y": 200 + (idx * 120)},
            "data": {
                "label": contract["name"],
                "node_type": "DELIVERABLE",
                "description": f"{contract.get('description', '')} ({contract.get('contract_type', 'PROJECT')})",
                "contract_id": contract["id"]
            }
        })
        # Connect from last SOP
        if prev_node_id:
            edges.append({
                "id": f"e_{prev_node_id}_{contract_node_id}",
                "source": prev_node_id,
                "target": contract_node_id,
                "type": "smoothstep"
            })
    
    # If no SOPs/templates/contracts, add a placeholder note
    if not sops:
        note_id = f"note_{uuid.uuid4().hex[:8]}"
        nodes.append({
            "id": note_id,
            "type": "custom",
            "position": {"x": 300, "y": 200},
            "data": {
                "label": "Add SOPs for this configuration",
                "node_type": "STICKY_NOTE",
                "description": f"No SOPs found for {selection.issue_category.value} > {selection.issue_type_id} > {selection.tier.value}"
            }
        })
        edges.append({
            "id": f"e_{issue_node_id}_{note_id}",
            "source": issue_node_id,
            "target": note_id,
            "type": "smoothstep"
        })
    
    # Create workflow in database
    workflow_id = str(uuid.uuid4())
    workflow_data = {
        "id": workflow_id,
        "name": request.workflow_name,
        "description": request.description,
        "access_level": "PUBLIC",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "is_active": True,
        "version": 1,
        "builder_generated": True,
        "builder_selection": {
            "issue_category": selection.issue_category.value,
            "issue_type_id": selection.issue_type_id,
            "sprint": selection.sprint.value,
            "tier": selection.tier.value
        }
    }
    
    await db.workflows.insert_one(workflow_data)
    
    # Save nodes for this workflow
    for node in nodes:
        node_data = {
            **node,
            "workflow_id": workflow_id,
            "layer": "STRATEGIC",
            "parent_node_id": None
        }
        await db.wf_nodes.insert_one(node_data)
    
    # Save edges
    for edge in edges:
        edge_data = {
            **edge,
            "workflow_id": workflow_id,
            "layer": "STRATEGIC",
            "parent_node_id": None
        }
        await db.wf_edges.insert_one(edge_data)
    
    return WorkflowRenderResponse(
        workflow_id=workflow_id,
        name=request.workflow_name,
        nodes=nodes,
        edges=edges,
        selection=selection,
        sops=sops,
        templates=templates,
        contracts=contracts
    )


@builder_router.get("/preview")
async def preview_workflow(
    issue_category: IssueCategory,
    issue_type_id: str,
    sprint: SprintTimeline,
    tier: PlaybookTier
):
    """
    Preview what the workflow would look like without saving it.
    Returns SOPs, templates, and contracts that would be included.
    """
    db = get_db()
    
    # Get issue details
    issue_types = ISSUE_TYPES.get(issue_category, [])
    issue = next((i for i in issue_types if i["id"] == issue_type_id), None)
    
    if not issue:
        raise HTTPException(status_code=404, detail="Issue type not found")
    
    # Get sprint config
    sprint_config = SPRINT_CONFIG.get(sprint, {})
    
    # Get SOPs
    sops = await db.builder_sops.find({
        "issue_category": issue_category.value,
        "issue_type_id": issue_type_id,
        "tier": tier.value
    }, {"_id": 0}).to_list(100)
    
    # Get templates and contracts
    sop_ids = [s["id"] for s in sops]
    templates = []
    contracts = []
    
    if sop_ids:
        templates = await db.builder_templates.find({
            "linked_sop_ids": {"$in": sop_ids}
        }, {"_id": 0}).to_list(100)
        
        contracts = await db.builder_contracts.find({
            "linked_sop_ids": {"$in": sop_ids}
        }, {"_id": 0}).to_list(100)
    
    # Fallback: If no templates/contracts found via SOP links, get by category mapping
    category_template_map = {
        "CLIENT_SERVICES": ["Client Welcome Packet", "Service Agreement Template", "Onboarding Checklist", "Client Portal Guide", "Success Plan Template"],
        "OPERATIONS": ["Job Description Template", "Interview Scorecard", "Training Materials Template", "SOP Template", "Meeting Agenda Template", "Event Planning Checklist", "Performance Review Form"],
        "CONSULTATION": ["Strategy Presentation", "Financial Analysis Report", "Market Analysis Report", "Recommendation Report"],
        "CRISIS_MANAGEMENT": ["Incident Report Form", "Crisis Communication Template", "Emergency Contact List", "Business Continuity Plan", "Post-Mortem Template"],
        "APP_DEVELOPMENT": ["PRD Template", "Technical Spec Template", "Test Plan Template", "Release Notes Template", "User Guide Template"],
    }
    
    category_contract_map = {
        "CLIENT_SERVICES": ["Bronze Service Agreement", "Silver Service Agreement", "Gold Service Agreement", "Platinum Service Agreement", "Black VIP Agreement", "Monthly Retainer", "Annual Support Contract"],
        "OPERATIONS": ["Employment Contract", "Contractor Agreement", "NDA Template"],
        "CONSULTATION": ["Consulting Engagement", "Advisory Retainer"],
        "CRISIS_MANAGEMENT": ["Business Continuity Plan"],
        "APP_DEVELOPMENT": ["Contractor Agreement", "NDA Template"],
    }
    
    if not templates:
        template_names = category_template_map.get(issue_category.value, [])
        if template_names:
            templates = await db.builder_templates.find({
                "name": {"$in": template_names}
            }, {"_id": 0}).to_list(100)
    
    if not contracts:
        contract_names = category_contract_map.get(issue_category.value, [])
        if contract_names:
            contracts = await db.builder_contracts.find({
                "name": {"$in": contract_names}
            }, {"_id": 0}).to_list(100)
    
    return {
        "issue": issue,
        "sprint": sprint_config,
        "tier": tier.value,
        "sops": sops,
        "templates": templates,
        "contracts": contracts,
        "summary": {
            "sop_count": len(sops),
            "template_count": len(templates),
            "contract_count": len(contracts)
        }
    }


# ==================== SEED DATA ====================

@builder_router.post("/seed")
async def seed_builder_data():
    """Seed sample SOPs, templates, and contracts for testing"""
    db = get_db()
    
    results = {"sops": 0, "templates": 0, "contracts": 0}
    
    # Sample SOPs for different issue types and tiers
    sample_sops = [
        # Client Services - Gold - Tier 1
        {
            "id": str(uuid.uuid4()),
            "name": "Premium Client Onboarding",
            "description": "Full-service onboarding for gold clients",
            "issue_category": "CLIENT_SERVICES",
            "issue_type_id": "gold",
            "tier": "TIER_1",
            "steps": [
                {"step": 1, "title": "Welcome Call", "description": "Schedule executive welcome call"},
                {"step": 2, "title": "Setup Portal", "description": "Configure client portal access"},
                {"step": 3, "title": "Strategy Session", "description": "90-min strategy deep dive"},
            ],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Dedicated Account Setup",
            "description": "Assign dedicated account manager",
            "issue_category": "CLIENT_SERVICES",
            "issue_type_id": "gold",
            "tier": "TIER_1",
            "steps": [
                {"step": 1, "title": "Assign Manager", "description": "Select senior account manager"},
                {"step": 2, "title": "Handoff Meeting", "description": "Transfer client knowledge"},
            ],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        # Operations - Recruitment - Tier 2
        {
            "id": str(uuid.uuid4()),
            "name": "Standard Recruitment Process",
            "description": "Standard hiring workflow",
            "issue_category": "OPERATIONS",
            "issue_type_id": "recruitment",
            "tier": "TIER_2",
            "steps": [
                {"step": 1, "title": "Post Job", "description": "Create and post job listing"},
                {"step": 2, "title": "Screen Applicants", "description": "Review applications"},
                {"step": 3, "title": "First Interview", "description": "Conduct initial screening"},
                {"step": 4, "title": "Final Interview", "description": "Department head interview"},
                {"step": 5, "title": "Make Offer", "description": "Extend job offer"},
            ],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        # Crisis Management - Data Compromise - Tier 1
        {
            "id": str(uuid.uuid4()),
            "name": "Data Breach Response Protocol",
            "description": "Emergency response for data breaches",
            "issue_category": "CRISIS_MANAGEMENT",
            "issue_type_id": "data_compromise",
            "tier": "TIER_1",
            "steps": [
                {"step": 1, "title": "Isolate Systems", "description": "Immediately isolate affected systems"},
                {"step": 2, "title": "Assess Damage", "description": "Determine scope of breach"},
                {"step": 3, "title": "Notify Stakeholders", "description": "Alert leadership and legal"},
                {"step": 4, "title": "Remediation", "description": "Patch vulnerabilities"},
                {"step": 5, "title": "Communication", "description": "Prepare external communications"},
            ],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
    ]
    
    for sop in sample_sops:
        existing = await db.builder_sops.find_one({"name": sop["name"]})
        if not existing:
            await db.builder_sops.insert_one(sop)
            results["sops"] += 1
    
    # Sample Templates
    sample_templates = [
        {
            "id": str(uuid.uuid4()),
            "name": "Client Welcome Packet",
            "description": "Welcome materials for new clients",
            "template_type": "document",
            "linked_sop_ids": [sample_sops[0]["id"]],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Job Description Template",
            "description": "Standard job posting format",
            "template_type": "document",
            "linked_sop_ids": [sample_sops[2]["id"]],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Data Breach Checklist",
            "description": "Emergency response checklist",
            "template_type": "spreadsheet",
            "linked_sop_ids": [sample_sops[3]["id"]],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
    ]
    
    for template in sample_templates:
        existing = await db.builder_templates.find_one({"name": template["name"]})
        if not existing:
            await db.builder_templates.insert_one(template)
            results["templates"] += 1
    
    # Sample Contracts
    sample_contracts = [
        {
            "id": str(uuid.uuid4()),
            "name": "Gold Service Agreement",
            "description": "Standard gold package contract",
            "contract_type": "PROJECT",
            "linked_sop_ids": [sample_sops[0]["id"], sample_sops[1]["id"]],
            "deliverables": ["Client Portal Access", "Dedicated Account Manager", "Monthly Reports"],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Employment Contract",
            "description": "Standard employment agreement",
            "contract_type": "RECURRING",
            "linked_sop_ids": [sample_sops[2]["id"]],
            "deliverables": ["Offer Letter", "NDA", "Employee Handbook"],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
    ]
    
    for contract in sample_contracts:
        existing = await db.builder_contracts.find_one({"name": contract["name"]})
        if not existing:
            await db.builder_contracts.insert_one(contract)
            results["contracts"] += 1
    
    return {"message": "Builder data seeded", "created": results}
