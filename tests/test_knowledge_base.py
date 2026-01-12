"""
Knowledge Base / SOP Library API Tests
Tests for: Categories, SOPs CRUD, Contextual SOPs, Templates, Checklist Progress, Analytics
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestKnowledgeBaseCategories:
    """Test Knowledge Base category endpoints"""
    
    def test_list_categories(self):
        """GET /api/knowledge-base/categories - List all categories with counts"""
        response = requests.get(f"{BASE_URL}/api/knowledge-base/categories")
        assert response.status_code == 200
        
        data = response.json()
        assert "categories" in data
        assert len(data["categories"]) >= 7  # 7 default categories
        
        # Verify category structure
        for cat in data["categories"]:
            assert "id" in cat
            assert "name" in cat
            assert "icon" in cat
            assert "description" in cat
            assert "count" in cat
            assert isinstance(cat["count"], int)
        
        # Verify expected categories exist
        cat_ids = [c["id"] for c in data["categories"]]
        assert "sales" in cat_ids
        assert "client_success" in cat_ids
        assert "operations" in cat_ids
        assert "templates" in cat_ids
        assert "training" in cat_ids


class TestKnowledgeBaseSOPs:
    """Test SOP CRUD operations"""
    
    def test_list_sops(self):
        """GET /api/knowledge-base/sops - List all SOPs"""
        response = requests.get(f"{BASE_URL}/api/knowledge-base/sops")
        assert response.status_code == 200
        
        data = response.json()
        assert "sops" in data
        assert "total" in data
        assert data["total"] >= 7  # 7 demo SOPs
        
        # Verify SOP structure
        for sop in data["sops"]:
            assert "id" in sop
            assert "title" in sop
            assert "description" in sop
            assert "category" in sop
            assert "content" in sop
            assert "status" in sop
    
    def test_list_sops_by_category(self):
        """GET /api/knowledge-base/sops?category=sales - Filter by category"""
        response = requests.get(f"{BASE_URL}/api/knowledge-base/sops?category=sales")
        assert response.status_code == 200
        
        data = response.json()
        assert "sops" in data
        
        # All returned SOPs should be in sales category
        for sop in data["sops"]:
            assert sop["category"] == "sales"
    
    def test_list_sops_by_stage(self):
        """GET /api/knowledge-base/sops?stage=proposal - Filter by stage"""
        response = requests.get(f"{BASE_URL}/api/knowledge-base/sops?stage=proposal")
        assert response.status_code == 200
        
        data = response.json()
        assert "sops" in data
        
        # All returned SOPs should have proposal in relevant_stages
        for sop in data["sops"]:
            assert "proposal" in sop.get("relevant_stages", [])
    
    def test_get_single_sop(self):
        """GET /api/knowledge-base/sops/{sop_id} - Get SOP details"""
        response = requests.get(f"{BASE_URL}/api/knowledge-base/sops/sop_upsell_001")
        assert response.status_code == 200
        
        sop = response.json()
        assert sop["id"] == "sop_upsell_001"
        assert sop["title"] == "Upsell Trigger Protocol"
        assert sop["category"] == "sales"
        assert "content" in sop
        assert "checklist" in sop
        assert len(sop["checklist"]) >= 4  # Has checklist items
        assert "children" in sop  # Should include children array
    
    def test_get_nonexistent_sop(self):
        """GET /api/knowledge-base/sops/nonexistent - 404 for missing SOP"""
        response = requests.get(f"{BASE_URL}/api/knowledge-base/sops/nonexistent_sop_id")
        assert response.status_code == 404
    
    def test_create_sop(self):
        """POST /api/knowledge-base/sops - Create new SOP"""
        new_sop = {
            "title": "TEST_New SOP for Testing",
            "description": "Test SOP created by automated tests",
            "category": "general",
            "content": "# Test SOP\n\nThis is test content.",
            "content_type": "markdown",
            "relevant_stages": ["discovery"],
            "relevant_deal_types": ["new_business"],
            "relevant_roles": ["coordinator"],
            "checklist": [
                {"id": "test_1", "text": "Test item 1", "required": True, "order": 1},
                {"id": "test_2", "text": "Test item 2", "required": False, "order": 2}
            ],
            "template_variables": [],
            "tags": ["test", "automated"]
        }
        
        response = requests.post(f"{BASE_URL}/api/knowledge-base/sops", json=new_sop)
        assert response.status_code == 200
        
        data = response.json()
        assert "sop" in data
        assert data["sop"]["title"] == "TEST_New SOP for Testing"
        assert data["sop"]["category"] == "general"
        assert "id" in data["sop"]
        
        # Store created SOP ID for cleanup
        created_id = data["sop"]["id"]
        
        # Verify it was persisted
        get_response = requests.get(f"{BASE_URL}/api/knowledge-base/sops/{created_id}")
        assert get_response.status_code == 200
        assert get_response.json()["title"] == "TEST_New SOP for Testing"
        
        # Cleanup - archive the test SOP
        requests.delete(f"{BASE_URL}/api/knowledge-base/sops/{created_id}")
    
    def test_update_sop(self):
        """PATCH /api/knowledge-base/sops/{sop_id} - Update SOP"""
        # First create a test SOP
        new_sop = {
            "title": "TEST_SOP to Update",
            "description": "Will be updated",
            "category": "general",
            "content": "Original content",
            "content_type": "markdown",
            "relevant_stages": [],
            "relevant_deal_types": [],
            "relevant_roles": [],
            "checklist": [],
            "template_variables": [],
            "tags": []
        }
        
        create_response = requests.post(f"{BASE_URL}/api/knowledge-base/sops", json=new_sop)
        assert create_response.status_code == 200
        created_id = create_response.json()["sop"]["id"]
        
        # Update the SOP
        update_data = {
            "title": "TEST_SOP Updated Title",
            "description": "Updated description"
        }
        
        update_response = requests.patch(f"{BASE_URL}/api/knowledge-base/sops/{created_id}", json=update_data)
        assert update_response.status_code == 200
        
        updated_sop = update_response.json()["sop"]
        assert updated_sop["title"] == "TEST_SOP Updated Title"
        assert updated_sop["description"] == "Updated description"
        
        # Verify persistence
        get_response = requests.get(f"{BASE_URL}/api/knowledge-base/sops/{created_id}")
        assert get_response.json()["title"] == "TEST_SOP Updated Title"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/knowledge-base/sops/{created_id}")
    
    def test_delete_sop(self):
        """DELETE /api/knowledge-base/sops/{sop_id} - Archive SOP"""
        # Create a test SOP
        new_sop = {
            "title": "TEST_SOP to Delete",
            "description": "Will be deleted",
            "category": "general",
            "content": "Content",
            "content_type": "markdown",
            "relevant_stages": [],
            "relevant_deal_types": [],
            "relevant_roles": [],
            "checklist": [],
            "template_variables": [],
            "tags": []
        }
        
        create_response = requests.post(f"{BASE_URL}/api/knowledge-base/sops", json=new_sop)
        created_id = create_response.json()["sop"]["id"]
        
        # Delete (archive) the SOP
        delete_response = requests.delete(f"{BASE_URL}/api/knowledge-base/sops/{created_id}")
        assert delete_response.status_code == 200
        assert "archived" in delete_response.json()["message"].lower()
        
        # Verify it's archived (status changed)
        get_response = requests.get(f"{BASE_URL}/api/knowledge-base/sops/{created_id}")
        assert get_response.status_code == 200
        assert get_response.json()["status"] == "archived"


class TestContextualSOPs:
    """Test contextual SOP retrieval"""
    
    def test_get_relevant_sops_by_stage(self):
        """GET /api/knowledge-base/relevant?stage=proposal - Get SOPs for stage"""
        response = requests.get(f"{BASE_URL}/api/knowledge-base/relevant?stage=proposal")
        assert response.status_code == 200
        
        data = response.json()
        assert "sops" in data
        assert "grouped" in data
        assert "context" in data
        assert data["context"]["stage"] == "proposal"
        
        # Should return SOPs relevant to proposal stage
        assert len(data["sops"]) >= 1
    
    def test_get_relevant_sops_by_deal_type(self):
        """GET /api/knowledge-base/relevant?deal_type=upsell - Get SOPs for deal type"""
        response = requests.get(f"{BASE_URL}/api/knowledge-base/relevant?deal_type=upsell")
        assert response.status_code == 200
        
        data = response.json()
        assert "sops" in data
        assert len(data["sops"]) >= 1
        
        # Should include upsell-related SOPs
        sop_titles = [s["title"] for s in data["sops"]]
        assert any("upsell" in t.lower() for t in sop_titles)
    
    def test_get_relevant_sops_combined_filters(self):
        """GET /api/knowledge-base/relevant?stage=proposal&deal_type=upsell"""
        response = requests.get(f"{BASE_URL}/api/knowledge-base/relevant?stage=proposal&deal_type=upsell")
        assert response.status_code == 200
        
        data = response.json()
        assert "sops" in data
        assert "grouped" in data
    
    def test_get_relevant_sops_active_stage(self):
        """GET /api/knowledge-base/relevant?stage=active - Get SOPs for active contracts"""
        response = requests.get(f"{BASE_URL}/api/knowledge-base/relevant?stage=active")
        assert response.status_code == 200
        
        data = response.json()
        assert "sops" in data
        # Should return Active Contract Management SOP
        sop_titles = [s["title"] for s in data["sops"]]
        assert any("active" in t.lower() for t in sop_titles)
    
    def test_track_sop_view(self):
        """POST /api/knowledge-base/sops/{sop_id}/track-view - Track view"""
        response = requests.post(f"{BASE_URL}/api/knowledge-base/sops/sop_upsell_001/track-view")
        assert response.status_code == 200
        assert "tracked" in response.json()["message"].lower()
    
    def test_track_sop_use(self):
        """POST /api/knowledge-base/sops/{sop_id}/track-use - Track usage"""
        response = requests.post(f"{BASE_URL}/api/knowledge-base/sops/sop_upsell_001/track-use")
        assert response.status_code == 200
        assert "tracked" in response.json()["message"].lower()


class TestTemplates:
    """Test template endpoints"""
    
    def test_list_templates(self):
        """GET /api/knowledge-base/templates - List all templates"""
        response = requests.get(f"{BASE_URL}/api/knowledge-base/templates")
        assert response.status_code == 200
        
        data = response.json()
        assert "templates" in data
        assert "total" in data
        assert data["total"] >= 1  # At least 1 demo template
        
        # Verify template structure
        for template in data["templates"]:
            assert "id" in template
            assert "title" in template
            assert "content" in template
            assert "variables" in template
    
    def test_create_template(self):
        """POST /api/knowledge-base/templates - Create template"""
        new_template = {
            "title": "TEST_Template",
            "description": "Test template",
            "category": "general",
            "content": "Hello {name}, your order #{order_id} is ready.",
            "variables": [
                {"name": "name", "label": "Customer Name", "type": "text"},
                {"name": "order_id", "label": "Order ID", "type": "text"}
            ],
            "output_format": "markdown"
        }
        
        response = requests.post(f"{BASE_URL}/api/knowledge-base/templates", json=new_template)
        assert response.status_code == 200
        
        data = response.json()
        assert "template" in data
        assert data["template"]["title"] == "TEST_Template"
        assert "id" in data["template"]
    
    def test_fill_template(self):
        """POST /api/knowledge-base/templates/{id}/fill - Fill template with data"""
        # Use the demo template
        fill_data = {
            "client": {
                "name": "Acme Corp",
                "package_tier": "Gold",
                "current_value": 50000,
                "contract_end": "2026-12-31"
            },
            "current_date": "2026-01-12",
            "user": {"name": "John Doe"},
            "opportunity": {
                "type": "Upsell",
                "trigger": "Contract renewal",
                "signals": "Client expressed interest in scaling",
                "recommendation": "Propose premium package"
            },
            "next_step_1": "Schedule call",
            "next_step_2": "Prepare proposal",
            "next_step_3": "Send follow-up"
        }
        
        response = requests.post(f"{BASE_URL}/api/knowledge-base/templates/tmpl_context_sheet/fill", json=fill_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "filled_content" in data
        assert "Acme Corp" in data["filled_content"]
        assert "John Doe" in data["filled_content"]
    
    def test_fill_nonexistent_template(self):
        """POST /api/knowledge-base/templates/nonexistent/fill - 404 for missing template"""
        response = requests.post(f"{BASE_URL}/api/knowledge-base/templates/nonexistent_template/fill", json={})
        assert response.status_code == 404


class TestChecklistProgress:
    """Test checklist progress tracking"""
    
    def test_get_checklist_progress(self):
        """GET /api/knowledge-base/checklist-progress/{entity_type}/{entity_id}"""
        response = requests.get(f"{BASE_URL}/api/knowledge-base/checklist-progress/deal/test_deal_123")
        assert response.status_code == 200
        
        data = response.json()
        assert "progress" in data
        assert isinstance(data["progress"], list)
    
    def test_update_checklist_progress(self):
        """POST /api/knowledge-base/checklist-progress - Save progress"""
        progress_data = {
            "sop_id": "sop_upsell_001",
            "entity_type": "deal",
            "entity_id": "test_deal_456",
            "completed_items": ["check_1", "check_2"]
        }
        
        response = requests.post(f"{BASE_URL}/api/knowledge-base/checklist-progress", json=progress_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "progress" in data
        assert data["progress"]["completed_items"] == ["check_1", "check_2"]
        
        # Verify persistence
        get_response = requests.get(f"{BASE_URL}/api/knowledge-base/checklist-progress/deal/test_deal_456")
        assert get_response.status_code == 200
        progress_list = get_response.json()["progress"]
        assert len(progress_list) >= 1
        
        # Find our progress entry
        our_progress = next((p for p in progress_list if p["sop_id"] == "sop_upsell_001"), None)
        assert our_progress is not None
        assert "check_1" in our_progress["completed_items"]
        assert "check_2" in our_progress["completed_items"]
    
    def test_check_checklist_complete(self):
        """GET /api/knowledge-base/checklist-complete/{entity_type}/{entity_id}/{sop_id}"""
        # First set some progress
        progress_data = {
            "sop_id": "sop_upsell_001",
            "entity_type": "deal",
            "entity_id": "test_deal_789",
            "completed_items": ["check_1", "check_2"]  # Only 2 of 4 required items
        }
        requests.post(f"{BASE_URL}/api/knowledge-base/checklist-progress", json=progress_data)
        
        # Check completion status
        response = requests.get(f"{BASE_URL}/api/knowledge-base/checklist-complete/deal/test_deal_789/sop_upsell_001")
        assert response.status_code == 200
        
        data = response.json()
        assert "complete" in data
        assert "required_items" in data
        assert "completed_items" in data
        assert "missing_items" in data
        assert "progress_percent" in data
        
        # Should not be complete (only 2 of 4 required items)
        assert data["complete"] == False
        assert len(data["missing_items"]) > 0
    
    def test_check_checklist_complete_all_done(self):
        """Test checklist completion when all required items are done"""
        # Set all required items as complete
        progress_data = {
            "sop_id": "sop_upsell_001",
            "entity_type": "deal",
            "entity_id": "test_deal_complete",
            "completed_items": ["check_1", "check_2", "check_3", "check_4"]  # All 4 required items
        }
        requests.post(f"{BASE_URL}/api/knowledge-base/checklist-progress", json=progress_data)
        
        # Check completion status
        response = requests.get(f"{BASE_URL}/api/knowledge-base/checklist-complete/deal/test_deal_complete/sop_upsell_001")
        assert response.status_code == 200
        
        data = response.json()
        assert data["complete"] == True
        assert len(data["missing_items"]) == 0
        assert data["progress_percent"] == 100


class TestAnalytics:
    """Test analytics endpoint"""
    
    def test_get_analytics(self):
        """GET /api/knowledge-base/analytics - Get usage analytics"""
        response = requests.get(f"{BASE_URL}/api/knowledge-base/analytics")
        assert response.status_code == 200
        
        data = response.json()
        assert "total_sops" in data
        assert "total_templates" in data
        assert "total_views" in data
        assert "total_uses" in data
        assert "by_category" in data
        
        # Verify counts are reasonable
        assert data["total_sops"] >= 7
        assert data["total_templates"] >= 1
        assert data["total_views"] >= 0
        assert data["total_uses"] >= 0
        
        # Verify by_category structure
        assert isinstance(data["by_category"], dict)
        if "sales" in data["by_category"]:
            assert "count" in data["by_category"]["sales"]
            assert "views" in data["by_category"]["sales"]


class TestSeedDemo:
    """Test seed demo endpoint"""
    
    def test_seed_demo_data(self):
        """POST /api/knowledge-base/seed-demo - Seed demo data"""
        response = requests.post(f"{BASE_URL}/api/knowledge-base/seed-demo")
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        assert "sops" in data
        assert "templates" in data
        assert data["sops"] == 7  # 7 demo SOPs
        assert data["templates"] == 1  # 1 demo template


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
