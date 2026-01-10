"""
Playbook Engine API Tests
Tests for the Playbook Engine that generates execution plans from strategy inputs
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://business-flow-6.preview.emergentagent.com').rstrip('/')


class TestPlaybookEngineHealth:
    """Basic health and connectivity tests"""
    
    def test_api_health(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ API health check passed")


class TestPlaybookEngineAnalytics:
    """Test analytics summary endpoint"""
    
    def test_get_analytics_summary(self):
        """Test GET /api/playbook-engine/analytics/summary"""
        response = requests.get(f"{BASE_URL}/api/playbook-engine/analytics/summary")
        assert response.status_code == 200
        data = response.json()
        
        # Verify required fields exist
        assert "total_plans" in data
        assert "active_plans" in data
        assert "completed_plans" in data
        assert "total_milestones" in data
        assert "total_tasks" in data
        assert "total_budget" in data
        assert "by_category" in data
        assert "by_status" in data
        
        # Verify types
        assert isinstance(data["total_plans"], int)
        assert isinstance(data["active_plans"], int)
        assert isinstance(data["total_budget"], (int, float))
        
        print(f"✓ Analytics summary: {data['total_plans']} plans, {data['active_plans']} active, ${data['total_budget']} budget")


class TestPlaybookEngineSeedDemo:
    """Test demo data seeding"""
    
    def test_seed_demo_data(self):
        """Test POST /api/playbook-engine/seed-demo"""
        response = requests.post(f"{BASE_URL}/api/playbook-engine/seed-demo")
        assert response.status_code == 200
        data = response.json()
        
        assert "message" in data
        assert "plan_ids" in data
        assert len(data["plan_ids"]) > 0
        
        print(f"✓ Seeded {len(data['plan_ids'])} demo execution plans")
        return data["plan_ids"]


class TestPlaybookEnginePlans:
    """Test execution plan CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Seed demo data before tests"""
        requests.post(f"{BASE_URL}/api/playbook-engine/seed-demo")
    
    def test_list_plans(self):
        """Test GET /api/playbook-engine/plans"""
        response = requests.get(f"{BASE_URL}/api/playbook-engine/plans")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Verify plan summary structure
        plan = data[0]
        assert "id" in plan
        assert "name" in plan
        assert "status" in plan
        assert "progress_percent" in plan
        assert "total_milestones" in plan
        assert "total_tasks" in plan
        
        print(f"✓ Listed {len(data)} execution plans")
    
    def test_list_plans_with_status_filter(self):
        """Test GET /api/playbook-engine/plans?status=active"""
        response = requests.get(f"{BASE_URL}/api/playbook-engine/plans?status=active")
        assert response.status_code == 200
        data = response.json()
        
        # All returned plans should be active
        for plan in data:
            assert plan["status"] == "active"
        
        print(f"✓ Filtered plans by status=active: {len(data)} plans")
    
    def test_get_plan_detail(self):
        """Test GET /api/playbook-engine/plans/{plan_id}"""
        # First get list of plans
        list_response = requests.get(f"{BASE_URL}/api/playbook-engine/plans")
        plans = list_response.json()
        assert len(plans) > 0
        
        plan_id = plans[0]["id"]
        
        # Get plan detail
        response = requests.get(f"{BASE_URL}/api/playbook-engine/plans/{plan_id}")
        assert response.status_code == 200
        data = response.json()
        
        # Verify full plan structure
        assert data["id"] == plan_id
        assert "name" in data
        assert "description" in data
        assert "strategy_input" in data
        assert "phases" in data
        assert "roles" in data
        assert "milestones" in data
        assert "tasks" in data
        assert "contracts" in data
        assert "communication_channels" in data
        assert "start_date" in data
        assert "estimated_budget" in data
        
        # Verify nested structures
        assert isinstance(data["roles"], list)
        assert isinstance(data["milestones"], list)
        assert isinstance(data["tasks"], list)
        
        print(f"✓ Got plan detail: {data['name']} with {len(data['milestones'])} milestones, {len(data['tasks'])} tasks")
    
    def test_get_nonexistent_plan(self):
        """Test GET /api/playbook-engine/plans/{nonexistent_id}"""
        response = requests.get(f"{BASE_URL}/api/playbook-engine/plans/nonexistent_plan_id")
        assert response.status_code == 404
        print("✓ Correctly returned 404 for nonexistent plan")


class TestPlaybookEngineGenerate:
    """Test execution plan generation"""
    
    def test_generate_client_services_plan(self):
        """Test POST /api/playbook-engine/generate with CLIENT_SERVICES category"""
        strategy_input = {
            "issue_category": "CLIENT_SERVICES",
            "issue_type_id": "gold",
            "issue_name": "TEST_Gold Package - Test Client",
            "sprint_timeline": "TWO_THREE_WEEKS",
            "tier": "TIER_2",
            "client_name": "TEST_Acme Corp",
            "description": "Test execution plan generation",
            "priority": "HIGH",
            "budget": 25000
        }
        
        response = requests.post(f"{BASE_URL}/api/playbook-engine/generate", json=strategy_input)
        assert response.status_code == 200
        data = response.json()
        
        # Verify plan was created
        assert "id" in data
        assert data["name"] == "TEST_Gold Package - Test Client Execution Plan"
        assert data["status"] == "draft"
        
        # Verify strategy input was stored
        assert data["strategy_input"]["issue_category"] == "CLIENT_SERVICES"
        assert data["strategy_input"]["client_name"] == "TEST_Acme Corp"
        
        # Verify milestones were generated
        assert len(data["milestones"]) > 0
        milestone_names = [m["name"] for m in data["milestones"]]
        assert "Client Onboarding" in milestone_names
        
        # Verify roles were generated
        assert len(data["roles"]) > 0
        role_titles = [r["title"] for r in data["roles"]]
        assert "Account Manager" in role_titles
        
        # Verify tasks were generated
        assert len(data["tasks"]) > 0
        
        # Verify budget
        assert data["estimated_budget"] == 25000
        
        print(f"✓ Generated CLIENT_SERVICES plan: {data['id']} with {len(data['milestones'])} milestones, {len(data['tasks'])} tasks")
        return data["id"]
    
    def test_generate_operations_plan(self):
        """Test POST /api/playbook-engine/generate with OPERATIONS category"""
        strategy_input = {
            "issue_category": "OPERATIONS",
            "issue_type_id": "default",
            "issue_name": "TEST_Process Optimization",
            "sprint_timeline": "ONE_WEEK",
            "tier": "TIER_1",
            "description": "Test operations plan",
            "priority": "MEDIUM"
        }
        
        response = requests.post(f"{BASE_URL}/api/playbook-engine/generate", json=strategy_input)
        assert response.status_code == 200
        data = response.json()
        
        assert data["strategy_input"]["issue_category"] == "OPERATIONS"
        assert len(data["milestones"]) > 0
        
        # Operations should have specific milestones
        milestone_names = [m["name"] for m in data["milestones"]]
        assert "Project Kickoff" in milestone_names
        
        print(f"✓ Generated OPERATIONS plan: {data['id']}")
        return data["id"]
    
    def test_generate_app_development_plan(self):
        """Test POST /api/playbook-engine/generate with APP_DEVELOPMENT category"""
        strategy_input = {
            "issue_category": "APP_DEVELOPMENT",
            "issue_type_id": "prototype_development",
            "issue_name": "TEST_MVP Development",
            "sprint_timeline": "FOUR_SIX_WEEKS",
            "tier": "TIER_2",
            "client_name": "TEST_TechStart Inc",
            "description": "Mobile app MVP development",
            "priority": "HIGH",
            "budget": 100000
        }
        
        response = requests.post(f"{BASE_URL}/api/playbook-engine/generate", json=strategy_input)
        assert response.status_code == 200
        data = response.json()
        
        assert data["strategy_input"]["issue_category"] == "APP_DEVELOPMENT"
        
        # App development should have sprint milestones
        milestone_names = [m["name"] for m in data["milestones"]]
        assert "Sprint 1 Complete" in milestone_names or "Project Kickoff" in milestone_names
        
        # Should have developer role
        role_titles = [r["title"] for r in data["roles"]]
        assert "Developer" in role_titles or "Tech Lead" in role_titles
        
        print(f"✓ Generated APP_DEVELOPMENT plan: {data['id']}")
        return data["id"]
    
    def test_generate_consultation_plan(self):
        """Test POST /api/playbook-engine/generate with CONSULTATION category"""
        strategy_input = {
            "issue_category": "CONSULTATION",
            "issue_type_id": "finance",
            "issue_name": "TEST_Financial Advisory",
            "sprint_timeline": "TWO_THREE_WEEKS",
            "tier": "TIER_1",
            "client_name": "TEST_Global Finance Ltd",
            "description": "Financial process optimization",
            "priority": "HIGH"
        }
        
        response = requests.post(f"{BASE_URL}/api/playbook-engine/generate", json=strategy_input)
        assert response.status_code == 200
        data = response.json()
        
        assert data["strategy_input"]["issue_category"] == "CONSULTATION"
        
        # Consultation should have discovery and recommendations milestones
        milestone_names = [m["name"] for m in data["milestones"]]
        assert "Discovery Session" in milestone_names
        
        print(f"✓ Generated CONSULTATION plan: {data['id']}")
        return data["id"]
    
    def test_generate_crisis_management_plan(self):
        """Test POST /api/playbook-engine/generate with CRISIS_MANAGEMENT category"""
        strategy_input = {
            "issue_category": "CRISIS_MANAGEMENT",
            "issue_type_id": "default",
            "issue_name": "TEST_Security Incident Response",
            "sprint_timeline": "THREE_DAYS",
            "tier": "TIER_1",
            "description": "Urgent security incident response",
            "priority": "URGENT"
        }
        
        response = requests.post(f"{BASE_URL}/api/playbook-engine/generate", json=strategy_input)
        assert response.status_code == 200
        data = response.json()
        
        assert data["strategy_input"]["issue_category"] == "CRISIS_MANAGEMENT"
        
        # Crisis management should have rapid response milestones
        milestone_names = [m["name"] for m in data["milestones"]]
        assert "Situation Assessment" in milestone_names
        
        # Should have Crisis Commander role
        role_titles = [r["title"] for r in data["roles"]]
        assert "Crisis Commander" in role_titles or "Response Lead" in role_titles
        
        print(f"✓ Generated CRISIS_MANAGEMENT plan: {data['id']}")
        return data["id"]


class TestPlaybookEnginePlanStatus:
    """Test plan status updates"""
    
    @pytest.fixture
    def created_plan_id(self):
        """Create a test plan"""
        strategy_input = {
            "issue_category": "CLIENT_SERVICES",
            "issue_type_id": "silver",
            "issue_name": "TEST_Status Test Plan",
            "sprint_timeline": "ONE_WEEK",
            "tier": "TIER_2",
            "client_name": "TEST_Status Client"
        }
        response = requests.post(f"{BASE_URL}/api/playbook-engine/generate", json=strategy_input)
        return response.json()["id"]
    
    def test_update_plan_status_to_active(self, created_plan_id):
        """Test PATCH /api/playbook-engine/plans/{plan_id}/status?status=active"""
        response = requests.patch(f"{BASE_URL}/api/playbook-engine/plans/{created_plan_id}/status?status=active")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "active"
        print(f"✓ Updated plan status to active")
    
    def test_update_plan_status_to_paused(self, created_plan_id):
        """Test PATCH /api/playbook-engine/plans/{plan_id}/status?status=paused"""
        # First activate
        requests.patch(f"{BASE_URL}/api/playbook-engine/plans/{created_plan_id}/status?status=active")
        
        # Then pause
        response = requests.patch(f"{BASE_URL}/api/playbook-engine/plans/{created_plan_id}/status?status=paused")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "paused"
        print(f"✓ Updated plan status to paused")
    
    def test_update_plan_status_to_completed(self, created_plan_id):
        """Test PATCH /api/playbook-engine/plans/{plan_id}/status?status=completed"""
        response = requests.patch(f"{BASE_URL}/api/playbook-engine/plans/{created_plan_id}/status?status=completed")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        assert data["progress_percent"] == 100
        print(f"✓ Updated plan status to completed")
    
    def test_update_plan_status_invalid(self, created_plan_id):
        """Test PATCH with invalid status"""
        response = requests.patch(f"{BASE_URL}/api/playbook-engine/plans/{created_plan_id}/status?status=invalid_status")
        assert response.status_code == 400
        print(f"✓ Correctly rejected invalid status")


class TestPlaybookEnginePlanActivation:
    """Test plan activation (creates contracts and threads)"""
    
    @pytest.fixture
    def draft_plan_id(self):
        """Create a draft plan with client"""
        strategy_input = {
            "issue_category": "CLIENT_SERVICES",
            "issue_type_id": "gold",
            "issue_name": "TEST_Activation Test Plan",
            "sprint_timeline": "TWO_THREE_WEEKS",
            "tier": "TIER_1",
            "client_name": "TEST_Activation Client",
            "budget": 50000
        }
        response = requests.post(f"{BASE_URL}/api/playbook-engine/generate", json=strategy_input)
        return response.json()["id"]
    
    def test_activate_draft_plan(self, draft_plan_id):
        """Test POST /api/playbook-engine/plans/{plan_id}/activate"""
        response = requests.post(f"{BASE_URL}/api/playbook-engine/plans/{draft_plan_id}/activate")
        assert response.status_code == 200
        data = response.json()
        
        assert data["message"] == "Plan activated successfully"
        assert data["plan_id"] == draft_plan_id
        assert "contracts_created" in data
        assert "threads_created" in data
        
        print(f"✓ Activated plan: {len(data['contracts_created'])} contracts, {len(data['threads_created'])} threads created")
    
    def test_activate_already_active_plan(self, draft_plan_id):
        """Test activating an already active plan"""
        # First activate
        requests.post(f"{BASE_URL}/api/playbook-engine/plans/{draft_plan_id}/activate")
        
        # Try to activate again
        response = requests.post(f"{BASE_URL}/api/playbook-engine/plans/{draft_plan_id}/activate")
        assert response.status_code == 400
        print(f"✓ Correctly rejected activating already active plan")


class TestPlaybookEnginePlanDelete:
    """Test plan deletion"""
    
    @pytest.fixture
    def deletable_plan_id(self):
        """Create a plan for deletion"""
        strategy_input = {
            "issue_category": "OPERATIONS",
            "issue_type_id": "default",
            "issue_name": "TEST_Delete Test Plan",
            "sprint_timeline": "ONE_WEEK",
            "tier": "TIER_3"
        }
        response = requests.post(f"{BASE_URL}/api/playbook-engine/generate", json=strategy_input)
        return response.json()["id"]
    
    def test_delete_draft_plan(self, deletable_plan_id):
        """Test DELETE /api/playbook-engine/plans/{plan_id}"""
        response = requests.delete(f"{BASE_URL}/api/playbook-engine/plans/{deletable_plan_id}")
        assert response.status_code == 200
        
        # Verify plan is deleted
        get_response = requests.get(f"{BASE_URL}/api/playbook-engine/plans/{deletable_plan_id}")
        assert get_response.status_code == 404
        
        print(f"✓ Deleted draft plan successfully")
    
    def test_delete_active_plan_fails(self, deletable_plan_id):
        """Test that active plans cannot be deleted"""
        # Activate the plan
        requests.patch(f"{BASE_URL}/api/playbook-engine/plans/{deletable_plan_id}/status?status=active")
        
        # Try to delete
        response = requests.delete(f"{BASE_URL}/api/playbook-engine/plans/{deletable_plan_id}")
        assert response.status_code == 400
        
        print(f"✓ Correctly prevented deletion of active plan")


class TestPlaybookEngineMilestoneUpdate:
    """Test milestone status updates"""
    
    @pytest.fixture
    def plan_with_milestones(self):
        """Create a plan and return plan_id and first milestone_id"""
        strategy_input = {
            "issue_category": "CLIENT_SERVICES",
            "issue_type_id": "silver",
            "issue_name": "TEST_Milestone Test Plan",
            "sprint_timeline": "TWO_THREE_WEEKS",
            "tier": "TIER_2"
        }
        response = requests.post(f"{BASE_URL}/api/playbook-engine/generate", json=strategy_input)
        plan = response.json()
        return plan["id"], plan["milestones"][0]["id"]
    
    def test_update_milestone_to_in_progress(self, plan_with_milestones):
        """Test PATCH /api/playbook-engine/plans/{plan_id}/milestones/{milestone_id}"""
        plan_id, milestone_id = plan_with_milestones
        
        response = requests.patch(
            f"{BASE_URL}/api/playbook-engine/plans/{plan_id}/milestones/{milestone_id}?status=IN_PROGRESS"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "IN_PROGRESS"
        
        print(f"✓ Updated milestone to IN_PROGRESS")
    
    def test_update_milestone_to_completed(self, plan_with_milestones):
        """Test completing a milestone updates plan progress"""
        plan_id, milestone_id = plan_with_milestones
        
        response = requests.patch(
            f"{BASE_URL}/api/playbook-engine/plans/{plan_id}/milestones/{milestone_id}?status=COMPLETED"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "COMPLETED"
        assert data["progress_percent"] == 100
        
        # Verify plan progress was updated
        plan_response = requests.get(f"{BASE_URL}/api/playbook-engine/plans/{plan_id}")
        plan = plan_response.json()
        assert plan["progress_percent"] > 0
        
        print(f"✓ Completed milestone, plan progress: {plan['progress_percent']}%")


class TestPlaybookEngineTaskUpdate:
    """Test task status updates"""
    
    @pytest.fixture
    def plan_with_tasks(self):
        """Create a plan and return plan_id and first task_id"""
        strategy_input = {
            "issue_category": "OPERATIONS",
            "issue_type_id": "default",
            "issue_name": "TEST_Task Test Plan",
            "sprint_timeline": "ONE_WEEK",
            "tier": "TIER_2"
        }
        response = requests.post(f"{BASE_URL}/api/playbook-engine/generate", json=strategy_input)
        plan = response.json()
        return plan["id"], plan["tasks"][0]["id"]
    
    def test_update_task_to_in_progress(self, plan_with_tasks):
        """Test PATCH /api/playbook-engine/plans/{plan_id}/tasks/{task_id}"""
        plan_id, task_id = plan_with_tasks
        
        response = requests.patch(
            f"{BASE_URL}/api/playbook-engine/plans/{plan_id}/tasks/{task_id}?status=in_progress"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "in_progress"
        
        print(f"✓ Updated task to in_progress")
    
    def test_update_task_to_completed(self, plan_with_tasks):
        """Test completing a task"""
        plan_id, task_id = plan_with_tasks
        
        response = requests.patch(
            f"{BASE_URL}/api/playbook-engine/plans/{plan_id}/tasks/{task_id}?status=completed"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        
        print(f"✓ Completed task successfully")


class TestPlaybookEngineIntegration:
    """Integration tests for Playbook Engine with other modules"""
    
    def test_full_workflow_generate_activate_complete(self):
        """Test complete workflow: generate -> activate -> complete"""
        # 1. Generate plan
        strategy_input = {
            "issue_category": "CLIENT_SERVICES",
            "issue_type_id": "gold",
            "issue_name": "TEST_Full Workflow Test",
            "sprint_timeline": "ONE_WEEK",
            "tier": "TIER_1",
            "client_name": "TEST_Full Workflow Client",
            "budget": 30000
        }
        
        gen_response = requests.post(f"{BASE_URL}/api/playbook-engine/generate", json=strategy_input)
        assert gen_response.status_code == 200
        plan = gen_response.json()
        plan_id = plan["id"]
        print(f"  1. Generated plan: {plan_id}")
        
        # 2. Activate plan
        activate_response = requests.post(f"{BASE_URL}/api/playbook-engine/plans/{plan_id}/activate")
        assert activate_response.status_code == 200
        print(f"  2. Activated plan")
        
        # 3. Complete all milestones
        for milestone in plan["milestones"]:
            requests.patch(
                f"{BASE_URL}/api/playbook-engine/plans/{plan_id}/milestones/{milestone['id']}?status=COMPLETED"
            )
        print(f"  3. Completed {len(plan['milestones'])} milestones")
        
        # 4. Mark plan as completed
        complete_response = requests.patch(f"{BASE_URL}/api/playbook-engine/plans/{plan_id}/status?status=completed")
        assert complete_response.status_code == 200
        final_plan = complete_response.json()
        assert final_plan["status"] == "completed"
        assert final_plan["progress_percent"] == 100
        print(f"  4. Plan completed with 100% progress")
        
        print(f"✓ Full workflow test passed")


# Cleanup function to remove test data
def cleanup_test_data():
    """Remove TEST_ prefixed plans"""
    response = requests.get(f"{BASE_URL}/api/playbook-engine/plans")
    if response.status_code == 200:
        plans = response.json()
        for plan in plans:
            if "TEST_" in plan.get("name", ""):
                # Can only delete non-active plans
                requests.patch(f"{BASE_URL}/api/playbook-engine/plans/{plan['id']}/status?status=cancelled")
                requests.delete(f"{BASE_URL}/api/playbook-engine/plans/{plan['id']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
