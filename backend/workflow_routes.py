"""
WorkflowViz - API Routes
Hierarchical Workflow Visualization System
"""

from fastapi import APIRouter, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorClient
import os
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid

from workflow_models import (
    # Enums
    WorkflowLayer, NodeType, TemplateCategory, SoftwareCategory,
    TaskStatus, BlockerCategory, WorkloadLevel,
    # Models
    Workflow, WorkflowCreate, WorkflowNode, WorkflowNodeCreate,
    WorkflowEdge, WorkflowEdgeCreate, WorkflowTemplate, WorkflowTemplateCreate,
    PredefinedActionTemplate, Software, TeamMember, TeamMemberCreate,
    WorkflowVersion, WorkflowExport, CanvasState, LayerContext,
    NodePosition, WorkflowNodeData, ClickUpTaskSync, WorkflowVizStats
)

from workflow_seed_data import (
    get_predefined_software, get_mock_team_members,
    get_predefined_action_templates, get_sample_workflow_templates
)

# Create router
workflow_router = APIRouter(prefix="/api/workflowviz", tags=["WorkflowViz"])

# MongoDB connection - will be set from main server
db = None

def set_db(database):
    global db
    db = database


# ==================== HELPER FUNCTIONS ====================

def serialize_datetime(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    return obj


def serialize_doc(doc: dict) -> dict:
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
    datetime_fields = ['created_at', 'updated_at', 'due_date', 'last_auto_save', 'last_synced', 'exported_at']
    for field in datetime_fields:
        if field in doc and isinstance(doc[field], str):
            try:
                doc[field] = datetime.fromisoformat(doc[field])
            except ValueError:
                pass
    # Handle nested data object
    if 'data' in doc and isinstance(doc['data'], dict):
        doc['data'] = deserialize_datetime(doc['data'])
    return doc


# ==================== SEEDING ====================

@workflow_router.post("/seed")
async def seed_workflow_data(force: bool = False):
    """Seed WorkflowViz with predefined data

    Args:
        force: If True, clear existing data and reseed everything
    """
    results = {"software": 0, "team_members": 0, "action_templates": 0, "workflow_templates": 0}

    if force:
        # Clear existing predefined data
        await db.wf_action_templates.delete_many({})
        await db.wf_templates.delete_many({"is_predefined": True})

    # Seed software
    software_list = get_predefined_software()
    for sw in software_list:
        existing = await db.wf_software.find_one({"name": sw.name})
        if not existing:
            await db.wf_software.insert_one(serialize_doc(sw.model_dump()))
            results["software"] += 1

    # Seed team members
    team = get_mock_team_members()
    for member in team:
        existing = await db.wf_team_members.find_one({"email": member.email})
        if not existing:
            await db.wf_team_members.insert_one(serialize_doc(member.model_dump()))
            results["team_members"] += 1

    # Seed action templates
    action_templates = get_predefined_action_templates()
    for at in action_templates:
        existing = await db.wf_action_templates.find_one({"action_name": at.action_name})
        if not existing:
            await db.wf_action_templates.insert_one(serialize_doc(at.model_dump()))
            results["action_templates"] += 1

    # Seed workflow templates
    wf_templates = get_sample_workflow_templates()
    for wft in wf_templates:
        existing = await db.wf_templates.find_one({"name": wft.name, "is_predefined": True})
        if not existing:
            await db.wf_templates.insert_one(serialize_doc(wft.model_dump()))
            results["workflow_templates"] += 1

    return {"message": "WorkflowViz seeding complete", "created": results}


# ==================== WORKFLOWS CRUD ====================

@workflow_router.get("/workflows", response_model=List[Workflow])
async def get_workflows(
    function: Optional[str] = None,
    is_active: bool = True
):
    """Get all workflows"""
    query = {"is_active": is_active}
    if function:
        query["function"] = function
    
    workflows = await db.wf_workflows.find(query, {"_id": 0}).sort("updated_at", -1).to_list(1000)
    return [deserialize_datetime(w) for w in workflows]


@workflow_router.get("/workflows/{workflow_id}", response_model=Workflow)
async def get_workflow(workflow_id: str):
    """Get a specific workflow"""
    workflow = await db.wf_workflows.find_one({"id": workflow_id}, {"_id": 0})
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return deserialize_datetime(workflow)


@workflow_router.post("/workflows", response_model=Workflow)
async def create_workflow(workflow_create: WorkflowCreate):
    """Create a new workflow"""
    workflow = Workflow(**workflow_create.model_dump())
    await db.wf_workflows.insert_one(serialize_doc(workflow.model_dump()))
    return workflow


@workflow_router.put("/workflows/{workflow_id}", response_model=Workflow)
async def update_workflow(workflow_id: str, workflow_update: WorkflowCreate):
    """Update a workflow"""
    existing = await db.wf_workflows.find_one({"id": workflow_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    update_data = workflow_update.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_data["version"] = existing.get("version", 1) + 1
    
    await db.wf_workflows.update_one({"id": workflow_id}, {"$set": update_data})
    updated = await db.wf_workflows.find_one({"id": workflow_id}, {"_id": 0})
    return deserialize_datetime(updated)


@workflow_router.delete("/workflows/{workflow_id}")
async def delete_workflow(workflow_id: str):
    """Soft delete a workflow"""
    result = await db.wf_workflows.update_one(
        {"id": workflow_id},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return {"message": "Workflow deleted"}


# ==================== NODES CRUD ====================

@workflow_router.get("/workflows/{workflow_id}/nodes", response_model=List[WorkflowNode])
async def get_workflow_nodes(
    workflow_id: str,
    layer: Optional[WorkflowLayer] = None,
    parent_node_id: Optional[str] = None
):
    """Get nodes for a workflow, optionally filtered by layer and parent"""
    query = {"workflow_id": workflow_id}
    if layer:
        query["layer"] = layer.value
    if parent_node_id:
        query["parent_node_id"] = parent_node_id
    
    nodes = await db.wf_nodes.find(query, {"_id": 0}).to_list(10000)
    return [deserialize_datetime(n) for n in nodes]


@workflow_router.post("/workflows/{workflow_id}/nodes", response_model=WorkflowNode)
async def create_node(workflow_id: str, node_create: WorkflowNodeCreate):
    """Create a new node"""
    # Verify workflow exists
    workflow = await db.wf_workflows.find_one({"id": workflow_id})
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    node = WorkflowNode(
        **node_create.model_dump(),
        workflow_id=workflow_id
    )
    await db.wf_nodes.insert_one(serialize_doc(node.model_dump()))
    
    # Update workflow timestamp
    await db.wf_workflows.update_one(
        {"id": workflow_id},
        {"$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return node


@workflow_router.put("/workflows/{workflow_id}/nodes/{node_id}", response_model=WorkflowNode)
async def update_node(workflow_id: str, node_id: str, node_update: WorkflowNodeCreate):
    """Update a node"""
    existing = await db.wf_nodes.find_one({"id": node_id, "workflow_id": workflow_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Node not found")
    
    update_data = node_update.model_dump()
    update_data["data"]["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.wf_nodes.update_one({"id": node_id}, {"$set": serialize_doc(update_data)})
    
    # Update workflow timestamp
    await db.wf_workflows.update_one(
        {"id": workflow_id},
        {"$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    updated = await db.wf_nodes.find_one({"id": node_id}, {"_id": 0})
    return deserialize_datetime(updated)


@workflow_router.delete("/workflows/{workflow_id}/nodes/{node_id}")
async def delete_node(workflow_id: str, node_id: str):
    """Delete a node and its connections"""
    # Delete node
    result = await db.wf_nodes.delete_one({"id": node_id, "workflow_id": workflow_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Node not found")
    
    # Delete connected edges
    await db.wf_edges.delete_many({
        "workflow_id": workflow_id,
        "$or": [{"source": node_id}, {"target": node_id}]
    })
    
    # Delete child nodes (for hierarchical delete)
    await db.wf_nodes.delete_many({"parent_node_id": node_id})
    
    # Update workflow timestamp
    await db.wf_workflows.update_one(
        {"id": workflow_id},
        {"$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Node deleted"}


@workflow_router.put("/workflows/{workflow_id}/nodes/bulk-update")
async def bulk_update_nodes(workflow_id: str, nodes: List[Dict[str, Any]]):
    """Bulk update multiple nodes (for drag operations)"""
    for node_data in nodes:
        node_id = node_data.get("id")
        if node_id:
            await db.wf_nodes.update_one(
                {"id": node_id, "workflow_id": workflow_id},
                {"$set": serialize_doc(node_data)}
            )
    
    # Update workflow timestamp and auto-save time
    await db.wf_workflows.update_one(
        {"id": workflow_id},
        {"$set": {
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "last_auto_save": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": f"Updated {len(nodes)} nodes"}


# ==================== EDGES CRUD ====================

@workflow_router.get("/workflows/{workflow_id}/edges", response_model=List[WorkflowEdge])
async def get_workflow_edges(
    workflow_id: str,
    layer: Optional[WorkflowLayer] = None
):
    """Get edges for a workflow"""
    query = {"workflow_id": workflow_id}
    if layer:
        query["layer"] = layer.value
    
    edges = await db.wf_edges.find(query, {"_id": 0}).to_list(10000)
    return edges


@workflow_router.post("/workflows/{workflow_id}/edges", response_model=WorkflowEdge)
async def create_edge(workflow_id: str, edge_create: WorkflowEdgeCreate):
    """Create a new edge"""
    edge = WorkflowEdge(
        **edge_create.model_dump(),
        workflow_id=workflow_id
    )
    await db.wf_edges.insert_one(serialize_doc(edge.model_dump()))
    
    # Update workflow timestamp
    await db.wf_workflows.update_one(
        {"id": workflow_id},
        {"$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return edge


@workflow_router.delete("/workflows/{workflow_id}/edges/{edge_id}")
async def delete_edge(workflow_id: str, edge_id: str):
    """Delete an edge"""
    result = await db.wf_edges.delete_one({"id": edge_id, "workflow_id": workflow_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Edge not found")
    
    # Update workflow timestamp
    await db.wf_workflows.update_one(
        {"id": workflow_id},
        {"$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Edge deleted"}


# ==================== AUTO-SAVE ====================

@workflow_router.post("/workflows/{workflow_id}/auto-save")
async def auto_save_workflow(workflow_id: str, canvas_data: Dict[str, Any]):
    """Auto-save workflow state"""
    nodes = canvas_data.get("nodes", [])
    edges = canvas_data.get("edges", [])
    
    # Update all nodes
    for node in nodes:
        node_id = node.get("id")
        if node_id:
            existing = await db.wf_nodes.find_one({"id": node_id})
            if existing:
                await db.wf_nodes.update_one(
                    {"id": node_id},
                    {"$set": serialize_doc(node)}
                )
            else:
                node["workflow_id"] = workflow_id
                await db.wf_nodes.insert_one(serialize_doc(node))
    
    # Update all edges
    for edge in edges:
        edge_id = edge.get("id")
        if edge_id:
            existing = await db.wf_edges.find_one({"id": edge_id})
            if existing:
                await db.wf_edges.update_one(
                    {"id": edge_id},
                    {"$set": serialize_doc(edge)}
                )
            else:
                edge["workflow_id"] = workflow_id
                await db.wf_edges.insert_one(serialize_doc(edge))
    
    # Update workflow timestamp
    await db.wf_workflows.update_one(
        {"id": workflow_id},
        {"$set": {
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "last_auto_save": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Auto-save complete", "timestamp": datetime.now(timezone.utc).isoformat()}


# ==================== VERSION HISTORY ====================

@workflow_router.post("/workflows/{workflow_id}/versions")
async def create_version_snapshot(workflow_id: str, description: Optional[str] = None):
    """Create a version snapshot of the workflow"""
    # Get current state
    nodes = await db.wf_nodes.find({"workflow_id": workflow_id}, {"_id": 0}).to_list(10000)
    edges = await db.wf_edges.find({"workflow_id": workflow_id}, {"_id": 0}).to_list(10000)
    workflow = await db.wf_workflows.find_one({"id": workflow_id}, {"_id": 0})
    
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    # Get next version number
    last_version = await db.wf_versions.find_one(
        {"workflow_id": workflow_id},
        sort=[("version_number", -1)]
    )
    next_version = (last_version.get("version_number", 0) + 1) if last_version else 1
    
    version = WorkflowVersion(
        workflow_id=workflow_id,
        version_number=next_version,
        nodes_snapshot=nodes,
        edges_snapshot=edges,
        change_description=description
    )
    
    await db.wf_versions.insert_one(serialize_doc(version.model_dump()))
    
    return {"message": "Version created", "version_number": next_version}


@workflow_router.get("/workflows/{workflow_id}/versions")
async def get_versions(workflow_id: str):
    """Get version history for a workflow"""
    versions = await db.wf_versions.find(
        {"workflow_id": workflow_id},
        {"_id": 0, "nodes_snapshot": 0, "edges_snapshot": 0}
    ).sort("version_number", -1).to_list(100)
    return [deserialize_datetime(v) for v in versions]


@workflow_router.post("/workflows/{workflow_id}/versions/{version_number}/restore")
async def restore_version(workflow_id: str, version_number: int):
    """Restore a workflow to a previous version"""
    version = await db.wf_versions.find_one(
        {"workflow_id": workflow_id, "version_number": version_number}
    )
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    # Delete current nodes and edges
    await db.wf_nodes.delete_many({"workflow_id": workflow_id})
    await db.wf_edges.delete_many({"workflow_id": workflow_id})
    
    # Restore from snapshot
    if version.get("nodes_snapshot"):
        await db.wf_nodes.insert_many(version["nodes_snapshot"])
    if version.get("edges_snapshot"):
        await db.wf_edges.insert_many(version["edges_snapshot"])
    
    # Update workflow version
    await db.wf_workflows.update_one(
        {"id": workflow_id},
        {"$set": {
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "version": version_number
        }}
    )
    
    return {"message": f"Restored to version {version_number}"}


# ==================== TEMPLATES ====================

@workflow_router.get("/templates", response_model=List[WorkflowTemplate])
async def get_templates(
    category: Optional[TemplateCategory] = None,
    search: Optional[str] = None,
    is_predefined: Optional[bool] = None
):
    """Get workflow templates"""
    query = {"is_active": True}
    if category:
        query["category"] = category.value
    if is_predefined is not None:
        query["is_predefined"] = is_predefined
    
    templates = await db.wf_templates.find(query, {"_id": 0}).to_list(1000)
    
    # Filter by search if provided
    if search:
        search_lower = search.lower()
        templates = [t for t in templates if 
                    search_lower in t.get("name", "").lower() or
                    search_lower in t.get("description", "").lower() or
                    any(search_lower in tag.lower() for tag in t.get("tags", []))]
    
    return [deserialize_datetime(t) for t in templates]


@workflow_router.get("/templates/{template_id}", response_model=WorkflowTemplate)
async def get_template(template_id: str):
    """Get a specific template"""
    template = await db.wf_templates.find_one({"id": template_id}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return deserialize_datetime(template)


@workflow_router.post("/templates", response_model=WorkflowTemplate)
async def create_template(template_create: WorkflowTemplateCreate):
    """Create a new template from selected nodes"""
    template = WorkflowTemplate(**template_create.model_dump())
    await db.wf_templates.insert_one(serialize_doc(template.model_dump()))
    return template


@workflow_router.post("/templates/{template_id}/use")
async def use_template(template_id: str):
    """Record template usage and increment count"""
    await db.wf_templates.update_one(
        {"id": template_id},
        {"$inc": {"usage_count": 1}}
    )
    return {"message": "Template usage recorded"}


@workflow_router.delete("/templates/{template_id}")
async def delete_template(template_id: str):
    """Delete a template (soft delete)"""
    result = await db.wf_templates.update_one(
        {"id": template_id, "is_predefined": False},
        {"$set": {"is_active": False}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Template not found or is predefined")
    return {"message": "Template deleted"}


# ==================== ACTION TEMPLATES ====================

@workflow_router.get("/action-templates", response_model=List[PredefinedActionTemplate])
async def get_action_templates(category: Optional[TemplateCategory] = None):
    """Get predefined action templates"""
    query = {"is_active": True}
    if category:
        query["category"] = category.value
    
    templates = await db.wf_action_templates.find(query, {"_id": 0}).to_list(100)
    return templates


@workflow_router.get("/action-templates/{action_name}")
async def get_action_template(action_name: str):
    """Get a specific action template by name"""
    template = await db.wf_action_templates.find_one({"action_name": action_name}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Action template not found")
    return template


# ==================== SOFTWARE ====================

@workflow_router.get("/software", response_model=List[Software])
async def get_software(category: Optional[SoftwareCategory] = None):
    """Get available software list"""
    query = {}
    if category:
        query["category"] = category.value
    
    software = await db.wf_software.find(query, {"_id": 0}).to_list(100)
    return software


@workflow_router.post("/software", response_model=Software)
async def create_software(name: str, category: SoftwareCategory, icon: Optional[str] = None):
    """Add custom software"""
    software = Software(
        name=name,
        category=category,
        icon=icon,
        is_predefined=False
    )
    await db.wf_software.insert_one(serialize_doc(software.model_dump()))
    return software


# ==================== TEAM MEMBERS ====================

@workflow_router.get("/team", response_model=List[TeamMember])
async def get_team_members(
    function: Optional[str] = None,
    workload: Optional[WorkloadLevel] = None
):
    """Get team members"""
    query = {"is_active": True}
    if function:
        query["function"] = function
    if workload:
        query["workload"] = workload.value
    
    members = await db.wf_team_members.find(query, {"_id": 0}).to_list(100)
    return [deserialize_datetime(m) for m in members]


@workflow_router.get("/team/{member_id}", response_model=TeamMember)
async def get_team_member(member_id: str):
    """Get a specific team member"""
    member = await db.wf_team_members.find_one({"id": member_id}, {"_id": 0})
    if not member:
        raise HTTPException(status_code=404, detail="Team member not found")
    return deserialize_datetime(member)


@workflow_router.post("/team", response_model=TeamMember)
async def create_team_member(member_create: TeamMemberCreate):
    """Create a new team member"""
    member = TeamMember(**member_create.model_dump())
    await db.wf_team_members.insert_one(serialize_doc(member.model_dump()))
    return member


@workflow_router.put("/team/{member_id}/workload")
async def update_member_workload(member_id: str, active_assignments: int):
    """Update team member workload"""
    # Calculate workload level
    if active_assignments <= 3:
        workload = WorkloadLevel.LOW
    elif active_assignments <= 6:
        workload = WorkloadLevel.MEDIUM
    else:
        workload = WorkloadLevel.HIGH
    
    await db.wf_team_members.update_one(
        {"id": member_id},
        {"$set": {
            "active_assignments": active_assignments,
            "workload": workload.value
        }}
    )
    return {"message": "Workload updated", "workload": workload.value}


# ==================== EXPORT/IMPORT ====================

@workflow_router.get("/workflows/{workflow_id}/export")
async def export_workflow(workflow_id: str):
    """Export workflow as JSON"""
    workflow = await db.wf_workflows.find_one({"id": workflow_id}, {"_id": 0})
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    nodes = await db.wf_nodes.find({"workflow_id": workflow_id}, {"_id": 0}).to_list(10000)
    edges = await db.wf_edges.find({"workflow_id": workflow_id}, {"_id": 0}).to_list(10000)
    
    export_data = WorkflowExport(
        workflow=Workflow(**deserialize_datetime(workflow)),
        nodes=[WorkflowNode(**deserialize_datetime(n)) for n in nodes],
        edges=[WorkflowEdge(**e) for e in edges]
    )
    
    return export_data.model_dump()


@workflow_router.post("/workflows/import")
async def import_workflow(import_data: Dict[str, Any]):
    """Import workflow from JSON"""
    workflow_data = import_data.get("workflow", {})
    nodes_data = import_data.get("nodes", [])
    edges_data = import_data.get("edges", [])
    
    # Create new workflow with new ID
    new_workflow_id = str(uuid.uuid4())
    workflow_data["id"] = new_workflow_id
    workflow_data["name"] = f"{workflow_data.get('name', 'Imported')} (Imported)"
    workflow_data["created_at"] = datetime.now(timezone.utc).isoformat()
    workflow_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.wf_workflows.insert_one(serialize_doc(workflow_data))
    
    # Create ID mapping for nodes
    id_mapping = {}
    for node in nodes_data:
        old_id = node.get("id")
        new_id = str(uuid.uuid4())
        id_mapping[old_id] = new_id
        node["id"] = new_id
        node["workflow_id"] = new_workflow_id
        await db.wf_nodes.insert_one(serialize_doc(node))
    
    # Update edges with new IDs
    for edge in edges_data:
        edge["id"] = str(uuid.uuid4())
        edge["workflow_id"] = new_workflow_id
        edge["source"] = id_mapping.get(edge["source"], edge["source"])
        edge["target"] = id_mapping.get(edge["target"], edge["target"])
        await db.wf_edges.insert_one(serialize_doc(edge))
    
    return {"message": "Workflow imported", "workflow_id": new_workflow_id}


# ==================== STATS ====================

@workflow_router.get("/stats", response_model=WorkflowVizStats)
async def get_stats():
    """Get WorkflowViz statistics"""
    total_workflows = await db.wf_workflows.count_documents({"is_active": True})
    total_templates = await db.wf_templates.count_documents({"is_active": True})
    total_team = await db.wf_team_members.count_documents({"is_active": True})
    
    # Workflows by function
    functions = ["Sales", "Marketing", "Operations", "Finance", "Development", "Powerhouse"]
    workflows_by_function = {}
    for func in functions:
        count = await db.wf_workflows.count_documents({"function": func, "is_active": True})
        workflows_by_function[func] = count
    
    # Recent workflows
    recent = await db.wf_workflows.find(
        {"is_active": True},
        {"_id": 0, "id": 1, "name": 1, "updated_at": 1}
    ).sort("updated_at", -1).to_list(5)
    
    # Popular templates
    popular = await db.wf_templates.find(
        {"is_active": True},
        {"_id": 0, "id": 1, "name": 1, "usage_count": 1, "category": 1}
    ).sort("usage_count", -1).to_list(5)
    
    return WorkflowVizStats(
        total_workflows=total_workflows,
        total_templates=total_templates,
        total_team_members=total_team,
        workflows_by_function=workflows_by_function,
        recent_workflows=[deserialize_datetime(w) for w in recent],
        popular_templates=popular
    )
