"""
P3 Features Backend Tests
Tests for Bidding System, Drip Notifications, and AI/OCR modules
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://smart-labyrinth.preview.emergentagent.com')

class TestBiddingSystem:
    """Bidding System API Tests"""
    
    def test_seed_demo_data(self):
        """Seed demo data for bidding system"""
        response = requests.post(f"{BASE_URL}/api/bidding/seed-demo")
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Demo data seeded"
        assert data["contracts"] >= 1
        assert data["bids"] >= 1
    
    def test_list_contracts(self):
        """GET /api/bidding/contracts - List all contracts"""
        response = requests.get(f"{BASE_URL}/api/bidding/contracts")
        assert response.status_code == 200
        data = response.json()
        assert "contracts" in data
        assert "total" in data
        assert isinstance(data["contracts"], list)
        assert data["total"] >= 1
        
        # Verify contract structure
        if data["contracts"]:
            contract = data["contracts"][0]
            assert "id" in contract
            assert "title" in contract
            assert "status" in contract
            assert "client_name" in contract
    
    def test_list_contracts_filter_by_status(self):
        """GET /api/bidding/contracts?status=open - Filter by status"""
        response = requests.get(f"{BASE_URL}/api/bidding/contracts", params={"status": "open"})
        assert response.status_code == 200
        data = response.json()
        for contract in data["contracts"]:
            assert contract["status"] == "open"
    
    def test_get_contract_details(self):
        """GET /api/bidding/contracts/{id} - Get contract with bids"""
        # First get a contract ID
        list_response = requests.get(f"{BASE_URL}/api/bidding/contracts")
        contracts = list_response.json()["contracts"]
        if contracts:
            contract_id = contracts[0]["id"]
            response = requests.get(f"{BASE_URL}/api/bidding/contracts/{contract_id}")
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == contract_id
            assert "bids" in data
            assert "bid_count" in data
    
    def test_get_contract_not_found(self):
        """GET /api/bidding/contracts/{id} - 404 for non-existent contract"""
        response = requests.get(f"{BASE_URL}/api/bidding/contracts/nonexistent_contract")
        assert response.status_code == 404
    
    def test_create_contract(self):
        """POST /api/bidding/contracts - Create new contract"""
        contract_data = {
            "title": "TEST_New Contract for Testing",
            "description": "This is a test contract created by automated tests",
            "client_name": "Test Client Corp",
            "estimated_value": 50000,
            "deadline": "2026-03-01T00:00:00Z",
            "requirements": ["Requirement 1", "Requirement 2"],
            "category": "technology"
        }
        response = requests.post(f"{BASE_URL}/api/bidding/contracts", json=contract_data)
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Contract created"
        assert "contract" in data
        assert data["contract"]["title"] == contract_data["title"]
        assert data["contract"]["status"] == "open"
        return data["contract"]["id"]
    
    def test_list_bids(self):
        """GET /api/bidding/bids - List all bids"""
        response = requests.get(f"{BASE_URL}/api/bidding/bids")
        assert response.status_code == 200
        data = response.json()
        assert "bids" in data
        assert "total" in data
        assert isinstance(data["bids"], list)
    
    def test_submit_bid(self):
        """POST /api/bidding/bids - Submit a bid"""
        # First create a new contract to bid on
        contract_data = {
            "title": "TEST_Contract for Bid Test",
            "description": "Contract for testing bid submission",
            "client_name": "Bid Test Client",
            "estimated_value": 30000,
            "deadline": "2026-04-01T00:00:00Z",
            "requirements": ["Test requirement"],
            "category": "financial"
        }
        contract_response = requests.post(f"{BASE_URL}/api/bidding/contracts", json=contract_data)
        contract_id = contract_response.json()["contract"]["id"]
        
        # Submit a bid
        bid_data = {
            "contract_id": contract_id,
            "team_id": "test_team_unique",
            "team_name": "Test Team Alpha",
            "proposed_value": 28000,
            "timeline_days": 30,
            "proposal": "Our team will deliver excellent results",
            "strengths": ["Experienced team", "Fast delivery"]
        }
        response = requests.post(f"{BASE_URL}/api/bidding/bids", json=bid_data)
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Bid submitted"
        assert "bid" in data
        assert data["bid"]["status"] == "pending"
        return data["bid"]["id"]
    
    def test_submit_bid_duplicate_team(self):
        """POST /api/bidding/bids - Reject duplicate bid from same team"""
        # Create contract
        contract_data = {
            "title": "TEST_Contract for Duplicate Bid Test",
            "description": "Testing duplicate bid rejection",
            "client_name": "Duplicate Test Client",
            "estimated_value": 20000,
            "deadline": "2026-05-01T00:00:00Z",
            "requirements": ["Test"],
            "category": "marketing"
        }
        contract_response = requests.post(f"{BASE_URL}/api/bidding/contracts", json=contract_data)
        contract_id = contract_response.json()["contract"]["id"]
        
        # Submit first bid
        bid_data = {
            "contract_id": contract_id,
            "team_id": "duplicate_test_team",
            "team_name": "Duplicate Test Team",
            "proposed_value": 18000,
            "timeline_days": 25,
            "proposal": "First bid",
            "strengths": ["Test"]
        }
        requests.post(f"{BASE_URL}/api/bidding/bids", json=bid_data)
        
        # Try to submit duplicate bid
        response = requests.post(f"{BASE_URL}/api/bidding/bids", json=bid_data)
        assert response.status_code == 400
        assert "already submitted" in response.json()["detail"].lower()
    
    def test_evaluate_bid_accept(self):
        """PATCH /api/bidding/bids/{id}/evaluate - Accept a bid"""
        # Create contract and bid
        contract_data = {
            "title": "TEST_Contract for Evaluation Test",
            "description": "Testing bid evaluation",
            "client_name": "Eval Test Client",
            "estimated_value": 40000,
            "deadline": "2026-06-01T00:00:00Z",
            "requirements": ["Test"],
            "category": "operations"
        }
        contract_response = requests.post(f"{BASE_URL}/api/bidding/contracts", json=contract_data)
        contract_id = contract_response.json()["contract"]["id"]
        
        bid_data = {
            "contract_id": contract_id,
            "team_id": "eval_test_team",
            "team_name": "Eval Test Team",
            "proposed_value": 38000,
            "timeline_days": 45,
            "proposal": "Test proposal",
            "strengths": ["Test strength"]
        }
        bid_response = requests.post(f"{BASE_URL}/api/bidding/bids", json=bid_data)
        bid_id = bid_response.json()["bid"]["id"]
        
        # Evaluate bid
        eval_data = {
            "status": "accepted",
            "feedback": "Great proposal!",
            "score": 95
        }
        response = requests.patch(f"{BASE_URL}/api/bidding/bids/{bid_id}/evaluate", json=eval_data)
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Bid evaluated"
        assert data["bid"]["status"] == "accepted"
        
        # Verify contract is awarded
        contract_response = requests.get(f"{BASE_URL}/api/bidding/contracts/{contract_id}")
        assert contract_response.json()["status"] == "awarded"
    
    def test_bidding_analytics(self):
        """GET /api/bidding/analytics - Get bidding analytics"""
        response = requests.get(f"{BASE_URL}/api/bidding/analytics")
        assert response.status_code == 200
        data = response.json()
        assert "total_contracts" in data
        assert "open_contracts" in data
        assert "total_bids" in data
        assert "win_rate" in data


class TestDripNotifications:
    """Drip Notifications API Tests"""
    
    def test_seed_demo_data(self):
        """Seed demo data for notifications"""
        response = requests.post(f"{BASE_URL}/api/notifications/seed-demo")
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Demo data seeded"
        assert data["notifications"] >= 1
        assert data["rules"] >= 1
    
    def test_list_notifications(self):
        """GET /api/notifications - List notifications"""
        response = requests.get(f"{BASE_URL}/api/notifications")
        assert response.status_code == 200
        data = response.json()
        assert "notifications" in data
        assert "total" in data
        assert "unread_count" in data
        assert isinstance(data["notifications"], list)
    
    def test_list_notifications_filter_by_user(self):
        """GET /api/notifications?user_id=xxx - Filter by user"""
        response = requests.get(f"{BASE_URL}/api/notifications", params={"user_id": "user_exec1"})
        assert response.status_code == 200
        data = response.json()
        for notif in data["notifications"]:
            assert notif["user_id"] == "user_exec1"
    
    def test_list_notifications_unread_only(self):
        """GET /api/notifications?unread_only=true - Filter unread"""
        response = requests.get(f"{BASE_URL}/api/notifications", params={"unread_only": True})
        assert response.status_code == 200
        data = response.json()
        for notif in data["notifications"]:
            assert notif["read"] == False
    
    def test_create_notification(self):
        """POST /api/notifications/ - Create notification"""
        notif_data = {
            "user_id": "test_user",
            "title": "TEST_Test Notification",
            "message": "This is a test notification",
            "notification_type": "info",
            "channel": "in_app"
        }
        response = requests.post(f"{BASE_URL}/api/notifications/", json=notif_data)
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Notification created"
        assert "notification" in data
        assert data["notification"]["read"] == False
        return data["notification"]["id"]
    
    def test_mark_notification_read(self):
        """PATCH /api/notifications/{id}/read - Mark as read"""
        # Create notification first
        notif_data = {
            "user_id": "test_user_read",
            "title": "TEST_Read Test",
            "message": "Testing mark as read",
            "notification_type": "info",
            "channel": "in_app"
        }
        create_response = requests.post(f"{BASE_URL}/api/notifications/", json=notif_data)
        notif_id = create_response.json()["notification"]["id"]
        
        # Mark as read
        response = requests.patch(f"{BASE_URL}/api/notifications/{notif_id}/read")
        assert response.status_code == 200
        assert response.json()["message"] == "Notification marked as read"
    
    def test_mark_all_read(self):
        """PATCH /api/notifications/read-all - Mark all as read"""
        response = requests.patch(f"{BASE_URL}/api/notifications/read-all", params={"user_id": "test_user"})
        assert response.status_code == 200
        assert "Marked" in response.json()["message"]
    
    def test_delete_notification(self):
        """DELETE /api/notifications/{id} - Delete notification"""
        # Create notification first
        notif_data = {
            "user_id": "test_user_delete",
            "title": "TEST_Delete Test",
            "message": "Testing delete",
            "notification_type": "info",
            "channel": "in_app"
        }
        create_response = requests.post(f"{BASE_URL}/api/notifications/", json=notif_data)
        notif_id = create_response.json()["notification"]["id"]
        
        # Delete
        response = requests.delete(f"{BASE_URL}/api/notifications/{notif_id}")
        assert response.status_code == 200
        assert response.json()["message"] == "Notification deleted"
    
    def test_list_drip_rules(self):
        """GET /api/notifications/rules - List drip rules"""
        response = requests.get(f"{BASE_URL}/api/notifications/rules")
        assert response.status_code == 200
        data = response.json()
        assert "rules" in data
        assert "total" in data
        assert isinstance(data["rules"], list)
    
    def test_create_drip_rule(self):
        """POST /api/notifications/rules - Create drip rule"""
        rule_data = {
            "name": "TEST_Test Rule",
            "description": "Test drip rule for automated testing",
            "trigger_type": "time_based",
            "target_roles": ["all"],
            "notification_template": {
                "title": "Test Notification",
                "message": "This is a test message"
            },
            "schedule": {"frequency": "daily", "time": "10:00"}
        }
        response = requests.post(f"{BASE_URL}/api/notifications/rules", json=rule_data)
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Drip rule created"
        assert "rule" in data
        assert data["rule"]["status"] == "active"
        return data["rule"]["id"]
    
    def test_get_drip_rule(self):
        """GET /api/notifications/rules/{id} - Get rule details"""
        # Get existing rule
        list_response = requests.get(f"{BASE_URL}/api/notifications/rules")
        rules = list_response.json()["rules"]
        if rules:
            rule_id = rules[0]["id"]
            response = requests.get(f"{BASE_URL}/api/notifications/rules/{rule_id}")
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == rule_id
    
    def test_trigger_rule_manually(self):
        """POST /api/notifications/rules/{id}/trigger - Trigger rule"""
        # Get an active rule
        list_response = requests.get(f"{BASE_URL}/api/notifications/rules", params={"status": "active"})
        rules = list_response.json()["rules"]
        if rules:
            rule_id = rules[0]["id"]
            response = requests.post(
                f"{BASE_URL}/api/notifications/rules/{rule_id}/trigger",
                json=["user_test1", "user_test2"]
            )
            assert response.status_code == 200
            data = response.json()
            assert "Rule triggered" in data["message"]
            assert "notifications_created" in data
    
    def test_update_rule_status(self):
        """PATCH /api/notifications/rules/{id}/status - Update rule status"""
        # Create a rule first
        rule_data = {
            "name": "TEST_Status Update Rule",
            "description": "Testing status update",
            "trigger_type": "event_based",
            "target_roles": ["coordinator"],
            "notification_template": {"title": "Test", "message": "Test"},
            "event_trigger": "task_completed"
        }
        create_response = requests.post(f"{BASE_URL}/api/notifications/rules", json=rule_data)
        rule_id = create_response.json()["rule"]["id"]
        
        # Pause the rule
        response = requests.patch(
            f"{BASE_URL}/api/notifications/rules/{rule_id}/status",
            params={"status": "paused"}
        )
        assert response.status_code == 200
        assert "paused" in response.json()["message"]
    
    def test_get_notification_preferences(self):
        """GET /api/notifications/preferences/{user_id} - Get preferences"""
        response = requests.get(f"{BASE_URL}/api/notifications/preferences/test_user")
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data
        assert "email_enabled" in data
        assert "in_app_enabled" in data
    
    def test_update_notification_preferences(self):
        """PUT /api/notifications/preferences/{user_id} - Update preferences"""
        prefs_data = {
            "user_id": "test_user_prefs",
            "email_enabled": False,
            "sms_enabled": True,
            "push_enabled": True,
            "in_app_enabled": True,
            "digest_mode": True
        }
        response = requests.put(f"{BASE_URL}/api/notifications/preferences/test_user_prefs", json=prefs_data)
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Preferences updated"
        assert data["preferences"]["email_enabled"] == False
        assert data["preferences"]["digest_mode"] == True
    
    def test_notification_analytics(self):
        """GET /api/notifications/analytics - Get analytics"""
        response = requests.get(f"{BASE_URL}/api/notifications/analytics")
        assert response.status_code == 200
        data = response.json()
        assert "total_notifications" in data
        assert "unread_notifications" in data
        assert "read_rate" in data
        assert "active_drip_rules" in data


class TestAIOCR:
    """AI/OCR API Tests"""
    
    def test_seed_demo_data(self):
        """Seed demo data for AI/OCR"""
        response = requests.post(f"{BASE_URL}/api/ai-ocr/seed-demo")
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Demo data seeded"
        assert data["documents"] >= 1
    
    def test_scan_document_invoice(self):
        """POST /api/ai-ocr/scan - Scan invoice document"""
        scan_data = {
            "document_type": "invoice",
            "image_base64": None  # Demo mode uses mock data
        }
        response = requests.post(f"{BASE_URL}/api/ai-ocr/scan", json=scan_data)
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Document scanned successfully"
        assert "document_id" in data
        assert data["document_type"] == "invoice"
        assert "extracted_fields" in data
        assert "confidence_score" in data
        assert data["confidence_score"] > 0.5
        
        # Verify invoice fields
        fields = data["extracted_fields"]
        assert "vendor_name" in fields
        assert "invoice_number" in fields
        assert "total_amount" in fields
    
    def test_scan_document_receipt(self):
        """POST /api/ai-ocr/scan - Scan receipt document"""
        scan_data = {
            "document_type": "receipt"
        }
        response = requests.post(f"{BASE_URL}/api/ai-ocr/scan", json=scan_data)
        assert response.status_code == 200
        data = response.json()
        assert data["document_type"] == "receipt"
        fields = data["extracted_fields"]
        assert "merchant_name" in fields
        assert "total_amount" in fields
    
    def test_scan_document_contract(self):
        """POST /api/ai-ocr/scan - Scan contract document"""
        scan_data = {
            "document_type": "contract"
        }
        response = requests.post(f"{BASE_URL}/api/ai-ocr/scan", json=scan_data)
        assert response.status_code == 200
        data = response.json()
        assert data["document_type"] == "contract"
        fields = data["extracted_fields"]
        assert "contract_title" in fields
        assert "parties" in fields
    
    def test_list_scanned_documents(self):
        """GET /api/ai-ocr/documents - List documents"""
        response = requests.get(f"{BASE_URL}/api/ai-ocr/documents")
        assert response.status_code == 200
        data = response.json()
        assert "documents" in data
        assert "total" in data
        assert isinstance(data["documents"], list)
    
    def test_list_documents_filter_by_type(self):
        """GET /api/ai-ocr/documents?document_type=invoice - Filter by type"""
        response = requests.get(f"{BASE_URL}/api/ai-ocr/documents", params={"document_type": "invoice"})
        assert response.status_code == 200
        data = response.json()
        for doc in data["documents"]:
            assert doc["document_type"] == "invoice"
    
    def test_get_document_details(self):
        """GET /api/ai-ocr/documents/{id} - Get document details"""
        # Get a document ID first
        list_response = requests.get(f"{BASE_URL}/api/ai-ocr/documents")
        documents = list_response.json()["documents"]
        if documents:
            doc_id = documents[0]["id"]
            response = requests.get(f"{BASE_URL}/api/ai-ocr/documents/{doc_id}")
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == doc_id
            assert "extracted_fields" in data
            assert "confidence_score" in data
    
    def test_get_document_not_found(self):
        """GET /api/ai-ocr/documents/{id} - 404 for non-existent"""
        response = requests.get(f"{BASE_URL}/api/ai-ocr/documents/nonexistent_doc")
        assert response.status_code == 404
    
    def test_smart_intake_client_onboarding(self):
        """POST /api/ai-ocr/smart-intake - Parse client onboarding"""
        intake_data = {
            "form_type": "client_onboarding",
            "raw_input": "Just spoke with John Smith from Acme Corp, their email is john@acme.com and phone is 555-1234. They're in the tech industry, about 50 employees. Located at 123 Main St, New York."
        }
        response = requests.post(f"{BASE_URL}/api/ai-ocr/smart-intake", json=intake_data)
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Form parsed successfully"
        assert "parsed_data" in data
        assert "extraction_id" in data
        assert data["form_type"] == "client_onboarding"
    
    def test_smart_intake_expense_report(self):
        """POST /api/ai-ocr/smart-intake - Parse expense report"""
        intake_data = {
            "form_type": "expense_report",
            "raw_input": "Employee Jane Doe submitted expenses on Jan 15, 2026. Category: Travel. Amount: $450.50. Description: Flight to client meeting. Receipt attached: yes."
        }
        response = requests.post(f"{BASE_URL}/api/ai-ocr/smart-intake", json=intake_data)
        assert response.status_code == 200
        data = response.json()
        assert data["form_type"] == "expense_report"
        assert "parsed_data" in data
    
    def test_smart_intake_invalid_form_type(self):
        """POST /api/ai-ocr/smart-intake - Invalid form type"""
        intake_data = {
            "form_type": "invalid_type",
            "raw_input": "Some text"
        }
        response = requests.post(f"{BASE_URL}/api/ai-ocr/smart-intake", json=intake_data)
        assert response.status_code == 400
        assert "Unknown form type" in response.json()["detail"]
    
    def test_validate_extraction(self):
        """POST /api/ai-ocr/validate-extraction/{id} - Validate document"""
        # Get a document ID first
        list_response = requests.get(f"{BASE_URL}/api/ai-ocr/documents")
        documents = list_response.json()["documents"]
        if documents:
            doc_id = documents[0]["id"]
            response = requests.post(f"{BASE_URL}/api/ai-ocr/validate-extraction/{doc_id}")
            assert response.status_code == 200
            data = response.json()
            assert "document_id" in data
            assert "validation" in data or "error" in data
    
    def test_match_template(self):
        """POST /api/ai-ocr/match-template - Match document to template"""
        # Get an invoice document
        list_response = requests.get(f"{BASE_URL}/api/ai-ocr/documents", params={"document_type": "invoice"})
        documents = list_response.json()["documents"]
        if documents:
            doc_id = documents[0]["id"]
            response = requests.post(f"{BASE_URL}/api/ai-ocr/match-template", params={"document_id": doc_id})
            assert response.status_code == 200
            data = response.json()
            assert "document_id" in data
            assert "matched_template" in data
            assert "coverage_percent" in data
    
    def test_ocr_analytics(self):
        """GET /api/ai-ocr/analytics - Get OCR analytics"""
        response = requests.get(f"{BASE_URL}/api/ai-ocr/analytics")
        assert response.status_code == 200
        data = response.json()
        assert "total_documents_scanned" in data
        assert "total_smart_extractions" in data
        assert "average_confidence_score" in data
        assert "average_processing_time_ms" in data


class TestHealthAndIntegration:
    """Health check and integration tests"""
    
    def test_health_check(self):
        """GET /api/health - Health check"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
