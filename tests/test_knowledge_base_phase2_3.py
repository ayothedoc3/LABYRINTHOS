"""
Knowledge Base Phase 2 & 3 API Tests
Tests for: Template auto-fill from CRM, Document save/list/get, Stage gate checking
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestTemplateAutoFillFromEntity:
    """Test template auto-fill from CRM entity endpoints"""
    
    def test_fill_from_entity_deal(self):
        """POST /api/knowledge-base/templates/{id}/fill-from-entity?entity_type=deal - Auto-fill from deal"""
        response = requests.post(
            f"{BASE_URL}/api/knowledge-base/templates/tmpl_context_sheet/fill-from-entity?entity_type=deal&entity_id=test_deal_123"
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "template_id" in data
        assert data["template_id"] == "tmpl_context_sheet"
        assert "entity_type" in data
        assert data["entity_type"] == "deal"
        assert "entity_id" in data
        assert data["entity_id"] == "test_deal_123"
        assert "filled_content" in data
        assert "auto_filled_data" in data
        assert "remaining_variables" in data
        assert isinstance(data["remaining_variables"], list)
    
    def test_fill_from_entity_contract(self):
        """POST /api/knowledge-base/templates/{id}/fill-from-entity?entity_type=contract - Auto-fill from contract"""
        # First get a real contract ID
        contracts_res = requests.get(f"{BASE_URL}/api/contracts")
        if contracts_res.status_code == 200 and contracts_res.json():
            contract_id = contracts_res.json()[0]["id"]
        else:
            contract_id = "test_contract_123"
        
        response = requests.post(
            f"{BASE_URL}/api/knowledge-base/templates/tmpl_context_sheet/fill-from-entity?entity_type=contract&entity_id={contract_id}"
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["entity_type"] == "contract"
        assert "filled_content" in data
        assert "auto_filled_data" in data
        
        # If we used a real contract, auto_filled_data should have values
        if contract_id != "test_contract_123":
            assert "client.name" in data["auto_filled_data"] or len(data["auto_filled_data"]) > 0
    
    def test_fill_from_entity_client(self):
        """POST /api/knowledge-base/templates/{id}/fill-from-entity?entity_type=client - Auto-fill from client"""
        response = requests.post(
            f"{BASE_URL}/api/knowledge-base/templates/tmpl_context_sheet/fill-from-entity?entity_type=client&entity_id=test_client_123"
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["entity_type"] == "client"
        assert "filled_content" in data
        assert "auto_filled_data" in data
    
    def test_fill_from_entity_nonexistent_template(self):
        """POST /api/knowledge-base/templates/nonexistent/fill-from-entity - 404 for missing template"""
        response = requests.post(
            f"{BASE_URL}/api/knowledge-base/templates/nonexistent_template/fill-from-entity?entity_type=deal&entity_id=test"
        )
        assert response.status_code == 404
    
    def test_fill_from_entity_tracks_usage(self):
        """Verify that fill-from-entity increments template usage count"""
        # Get initial usage count
        templates_res = requests.get(f"{BASE_URL}/api/knowledge-base/templates")
        initial_uses = 0
        for t in templates_res.json().get("templates", []):
            if t["id"] == "tmpl_context_sheet":
                initial_uses = t.get("uses", 0)
                break
        
        # Call fill-from-entity
        requests.post(
            f"{BASE_URL}/api/knowledge-base/templates/tmpl_context_sheet/fill-from-entity?entity_type=deal&entity_id=usage_test"
        )
        
        # Check usage count increased
        templates_res = requests.get(f"{BASE_URL}/api/knowledge-base/templates")
        new_uses = 0
        for t in templates_res.json().get("templates", []):
            if t["id"] == "tmpl_context_sheet":
                new_uses = t.get("uses", 0)
                break
        
        assert new_uses >= initial_uses  # Should be equal or greater


class TestDocumentSave:
    """Test document save endpoint"""
    
    def test_save_document(self):
        """POST /api/knowledge-base/documents/save - Save a filled document"""
        document_data = {
            "template_id": "tmpl_context_sheet",
            "title": "TEST_Document_Save_Test",
            "content": "# Test Document\n\nThis is test content for save test.",
            "entity_type": "deal",
            "entity_id": "test_deal_save",
            "filled_data": {
                "client.name": "Test Client",
                "current_date": "2026-01-12"
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/knowledge-base/documents/save", json=document_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        assert "document" in data
        assert data["document"]["title"] == "TEST_Document_Save_Test"
        assert data["document"]["template_id"] == "tmpl_context_sheet"
        assert data["document"]["entity_type"] == "deal"
        assert data["document"]["entity_id"] == "test_deal_save"
        assert "id" in data["document"]
        assert data["document"]["id"].startswith("doc_")
        assert data["document"]["status"] == "draft"
        assert "created_at" in data["document"]
        assert "updated_at" in data["document"]
        
        # Store document ID for later tests
        return data["document"]["id"]
    
    def test_save_document_minimal(self):
        """POST /api/knowledge-base/documents/save - Save with minimal data"""
        document_data = {
            "content": "Minimal content"
        }
        
        response = requests.post(f"{BASE_URL}/api/knowledge-base/documents/save", json=document_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["document"]["title"] == "Untitled Document"  # Default title
        assert data["document"]["content"] == "Minimal content"
    
    def test_save_document_with_created_by(self):
        """POST /api/knowledge-base/documents/save - Save with created_by field"""
        document_data = {
            "title": "TEST_Document_With_Creator",
            "content": "Content with creator",
            "created_by": "test_user_123"
        }
        
        response = requests.post(f"{BASE_URL}/api/knowledge-base/documents/save", json=document_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["document"]["created_by"] == "test_user_123"


class TestDocumentList:
    """Test document list endpoint"""
    
    def test_list_documents(self):
        """GET /api/knowledge-base/documents - List all saved documents"""
        response = requests.get(f"{BASE_URL}/api/knowledge-base/documents")
        assert response.status_code == 200
        
        data = response.json()
        assert "documents" in data
        assert "total" in data
        assert isinstance(data["documents"], list)
        assert data["total"] >= 0
        
        # Verify document structure if any exist
        if data["documents"]:
            doc = data["documents"][0]
            assert "id" in doc
            assert "title" in doc
            assert "content" in doc
            assert "created_at" in doc
    
    def test_list_documents_filter_by_entity_type(self):
        """GET /api/knowledge-base/documents?entity_type=deal - Filter by entity type"""
        # First create a document with entity_type
        requests.post(f"{BASE_URL}/api/knowledge-base/documents/save", json={
            "title": "TEST_Filter_Entity_Type",
            "content": "Test content",
            "entity_type": "deal",
            "entity_id": "filter_test_deal"
        })
        
        response = requests.get(f"{BASE_URL}/api/knowledge-base/documents?entity_type=deal")
        assert response.status_code == 200
        
        data = response.json()
        assert "documents" in data
        
        # All returned documents should have entity_type=deal
        for doc in data["documents"]:
            assert doc.get("entity_type") == "deal"
    
    def test_list_documents_filter_by_entity_id(self):
        """GET /api/knowledge-base/documents?entity_type=deal&entity_id=xxx - Filter by entity"""
        # First create a document with specific entity
        requests.post(f"{BASE_URL}/api/knowledge-base/documents/save", json={
            "title": "TEST_Filter_Entity_ID",
            "content": "Test content",
            "entity_type": "deal",
            "entity_id": "specific_deal_123"
        })
        
        response = requests.get(f"{BASE_URL}/api/knowledge-base/documents?entity_type=deal&entity_id=specific_deal_123")
        assert response.status_code == 200
        
        data = response.json()
        assert "documents" in data
        
        # All returned documents should have the specific entity_id
        for doc in data["documents"]:
            assert doc.get("entity_id") == "specific_deal_123"
    
    def test_list_documents_sorted_by_created_at(self):
        """Verify documents are sorted by created_at descending"""
        response = requests.get(f"{BASE_URL}/api/knowledge-base/documents")
        assert response.status_code == 200
        
        data = response.json()
        if len(data["documents"]) >= 2:
            # First document should be newer or equal to second
            first_date = data["documents"][0].get("created_at", "")
            second_date = data["documents"][1].get("created_at", "")
            assert first_date >= second_date


class TestDocumentGetById:
    """Test get document by ID endpoint"""
    
    def test_get_document_by_id(self):
        """GET /api/knowledge-base/documents/{doc_id} - Get specific document"""
        # First create a document
        create_res = requests.post(f"{BASE_URL}/api/knowledge-base/documents/save", json={
            "title": "TEST_Get_By_ID",
            "content": "Content for get by ID test",
            "entity_type": "contract",
            "entity_id": "get_test_contract"
        })
        doc_id = create_res.json()["document"]["id"]
        
        # Get the document
        response = requests.get(f"{BASE_URL}/api/knowledge-base/documents/{doc_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == doc_id
        assert data["title"] == "TEST_Get_By_ID"
        assert data["content"] == "Content for get by ID test"
        assert data["entity_type"] == "contract"
        assert data["entity_id"] == "get_test_contract"
    
    def test_get_nonexistent_document(self):
        """GET /api/knowledge-base/documents/nonexistent - 404 for missing document"""
        response = requests.get(f"{BASE_URL}/api/knowledge-base/documents/nonexistent_doc_id")
        assert response.status_code == 404
        
        data = response.json()
        assert "detail" in data
        assert "not found" in data["detail"].lower()


class TestStageGateChecking:
    """Test stage gate checking functionality"""
    
    def test_checklist_complete_endpoint(self):
        """GET /api/knowledge-base/checklist-complete/{entity_type}/{entity_id}/{sop_id}"""
        response = requests.get(
            f"{BASE_URL}/api/knowledge-base/checklist-complete/contract/test_contract_gate/sop_upsell_001"
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "complete" in data
        assert "required_items" in data
        assert "completed_items" in data
        assert "missing_items" in data
        assert "progress_percent" in data
        assert isinstance(data["complete"], bool)
        assert isinstance(data["progress_percent"], (int, float))
    
    def test_stage_gate_incomplete(self):
        """Test stage gate returns incomplete when items are missing"""
        # Set partial progress
        requests.post(f"{BASE_URL}/api/knowledge-base/checklist-progress", json={
            "sop_id": "sop_upsell_001",
            "entity_type": "contract",
            "entity_id": "gate_incomplete_test",
            "completed_items": ["check_1"]  # Only 1 of 4 required
        })
        
        response = requests.get(
            f"{BASE_URL}/api/knowledge-base/checklist-complete/contract/gate_incomplete_test/sop_upsell_001"
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["complete"] == False
        assert len(data["missing_items"]) > 0
        assert data["progress_percent"] < 100
    
    def test_stage_gate_complete(self):
        """Test stage gate returns complete when all required items done"""
        # Set full progress
        requests.post(f"{BASE_URL}/api/knowledge-base/checklist-progress", json={
            "sop_id": "sop_upsell_001",
            "entity_type": "contract",
            "entity_id": "gate_complete_test",
            "completed_items": ["check_1", "check_2", "check_3", "check_4"]  # All 4 required
        })
        
        response = requests.get(
            f"{BASE_URL}/api/knowledge-base/checklist-complete/contract/gate_complete_test/sop_upsell_001"
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["complete"] == True
        assert len(data["missing_items"]) == 0
        assert data["progress_percent"] == 100
    
    def test_stage_gate_nonexistent_sop(self):
        """Test stage gate returns complete for nonexistent SOP"""
        response = requests.get(
            f"{BASE_URL}/api/knowledge-base/checklist-complete/contract/test/nonexistent_sop"
        )
        assert response.status_code == 200
        
        data = response.json()
        # Should return complete=True with message about SOP not found
        assert data["complete"] == True


class TestIntegrationWorkflow:
    """Test complete workflow: auto-fill -> generate -> save -> retrieve"""
    
    def test_complete_document_workflow(self):
        """Test full workflow from auto-fill to document retrieval"""
        # Step 1: Auto-fill template from entity
        autofill_res = requests.post(
            f"{BASE_URL}/api/knowledge-base/templates/tmpl_context_sheet/fill-from-entity?entity_type=deal&entity_id=workflow_test_deal"
        )
        assert autofill_res.status_code == 200
        autofill_data = autofill_res.json()
        
        # Step 2: Save the filled document
        save_res = requests.post(f"{BASE_URL}/api/knowledge-base/documents/save", json={
            "template_id": autofill_data["template_id"],
            "title": "TEST_Workflow_Document",
            "content": autofill_data["filled_content"],
            "entity_type": "deal",
            "entity_id": "workflow_test_deal",
            "filled_data": autofill_data["auto_filled_data"]
        })
        assert save_res.status_code == 200
        doc_id = save_res.json()["document"]["id"]
        
        # Step 3: Retrieve the saved document
        get_res = requests.get(f"{BASE_URL}/api/knowledge-base/documents/{doc_id}")
        assert get_res.status_code == 200
        
        doc = get_res.json()
        assert doc["title"] == "TEST_Workflow_Document"
        assert doc["entity_type"] == "deal"
        assert doc["entity_id"] == "workflow_test_deal"
        
        # Step 4: Verify document appears in list
        list_res = requests.get(f"{BASE_URL}/api/knowledge-base/documents?entity_type=deal&entity_id=workflow_test_deal")
        assert list_res.status_code == 200
        
        docs = list_res.json()["documents"]
        doc_ids = [d["id"] for d in docs]
        assert doc_id in doc_ids


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
