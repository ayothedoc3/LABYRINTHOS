"""
Test suite for Knowledge Base AI-Powered Features
Tests AI recommendations, checklist generation, proactive alerts, behavior tracking, and user insights
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAIRecommendations:
    """Test AI Recommendations endpoint - POST /api/knowledge-base/ai/recommendations"""
    
    def test_recommendations_basic(self):
        """Test basic recommendations request"""
        response = requests.post(f"{BASE_URL}/api/knowledge-base/ai/recommendations", json={
            "user_id": "test_user_001",
            "role": "coordinator",
            "current_stage": "proposal",
            "recent_activity": []
        })
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "recommendations" in data
        assert "insights" in data
        assert "suggested_action" in data
        assert "context_used" in data
        assert "ai_powered" in data
        
        # Verify context is returned
        assert data["context_used"]["role"] == "coordinator"
        assert data["context_used"]["stage"] == "proposal"
    
    def test_recommendations_with_entity_context(self):
        """Test recommendations with entity context"""
        response = requests.post(f"{BASE_URL}/api/knowledge-base/ai/recommendations", json={
            "user_id": "test_user_002",
            "role": "executive",
            "current_stage": "discovery",
            "entity_type": "deal",
            "entity_id": "deal_123",
            "recent_activity": ["viewed_sop", "completed_checklist"]
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "recommendations" in data
        assert isinstance(data["recommendations"], list)
        assert data["context_used"]["entity_type"] == "deal"
    
    def test_recommendations_empty_context(self):
        """Test recommendations with minimal context"""
        response = requests.post(f"{BASE_URL}/api/knowledge-base/ai/recommendations", json={
            "user_id": "test_user_003"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "recommendations" in data
        assert "ai_powered" in data


class TestAIGenerateChecklist:
    """Test AI Checklist Generation endpoint - POST /api/knowledge-base/ai/generate-checklist"""
    
    def test_generate_checklist_basic(self):
        """Test basic checklist generation"""
        response = requests.post(f"{BASE_URL}/api/knowledge-base/ai/generate-checklist", json={
            "sop_title": "Client Onboarding Process",
            "sop_description": "Standard procedure for onboarding new clients including setup, training, and go-live",
            "category": "client_success",
            "relevant_stages": ["onboarding", "implementation"]
        })
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "checklist" in data
        assert "ai_powered" in data
        assert isinstance(data["checklist"], list)
        
        # Verify checklist items have required fields
        if len(data["checklist"]) > 0:
            item = data["checklist"][0]
            assert "id" in item
            assert "text" in item
            assert "required" in item
            assert "order" in item
    
    def test_generate_checklist_sales_category(self):
        """Test checklist generation for sales category"""
        response = requests.post(f"{BASE_URL}/api/knowledge-base/ai/generate-checklist", json={
            "sop_title": "Sales Discovery Call",
            "sop_description": "Process for conducting effective discovery calls with prospects",
            "category": "sales",
            "relevant_stages": ["discovery", "qualification"]
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "checklist" in data
        assert len(data["checklist"]) >= 1  # Should have at least 1 item
    
    def test_generate_checklist_minimal_input(self):
        """Test checklist generation with minimal input"""
        response = requests.post(f"{BASE_URL}/api/knowledge-base/ai/generate-checklist", json={
            "sop_title": "Test SOP",
            "sop_description": "",
            "category": "general"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "checklist" in data
        # Should still generate default checklist items
        assert len(data["checklist"]) >= 1


class TestProactiveAlerts:
    """Test Proactive Alerts endpoint - GET /api/knowledge-base/ai/proactive-alerts/{user_id}"""
    
    def test_proactive_alerts_basic(self):
        """Test basic proactive alerts request"""
        response = requests.get(f"{BASE_URL}/api/knowledge-base/ai/proactive-alerts/test_user_001")
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "user_id" in data
        assert "alerts" in data
        assert "total_alerts" in data
        assert "high_priority_count" in data
        
        assert data["user_id"] == "test_user_001"
        assert isinstance(data["alerts"], list)
        assert isinstance(data["total_alerts"], int)
    
    def test_proactive_alerts_with_role(self):
        """Test proactive alerts with role parameter"""
        response = requests.get(f"{BASE_URL}/api/knowledge-base/ai/proactive-alerts/test_user_002?role=coordinator")
        assert response.status_code == 200
        data = response.json()
        
        assert "alerts" in data
        assert data["total_alerts"] >= 1  # Should have at least the new_content alert
    
    def test_proactive_alerts_with_stage(self):
        """Test proactive alerts with current_stage parameter"""
        response = requests.get(f"{BASE_URL}/api/knowledge-base/ai/proactive-alerts/test_user_003?current_stage=proposal")
        assert response.status_code == 200
        data = response.json()
        
        assert "alerts" in data
        # Should include stage_guidance alert if SOPs exist for that stage
        alert_types = [a["type"] for a in data["alerts"]]
        assert "new_content" in alert_types  # Always present
    
    def test_proactive_alerts_with_all_params(self):
        """Test proactive alerts with all parameters"""
        response = requests.get(
            f"{BASE_URL}/api/knowledge-base/ai/proactive-alerts/test_user_004?role=executive&current_stage=discovery"
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "alerts" in data
        assert "high_priority_count" in data
        
        # Verify alert structure
        for alert in data["alerts"]:
            assert "type" in alert
            assert "priority" in alert
            assert "message" in alert
            assert "details" in alert
            assert "action" in alert


class TestTrackBehavior:
    """Test Track Behavior endpoint - POST /api/knowledge-base/ai/track-behavior"""
    
    def test_track_view_behavior(self):
        """Test tracking SOP view behavior"""
        response = requests.post(
            f"{BASE_URL}/api/knowledge-base/ai/track-behavior?user_id=test_user_001&action=view&sop_id=sop_upsell_001"
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "message" in data
        assert data["message"] == "Behavior tracked"
        assert "id" in data
        assert data["id"].startswith("beh_")
    
    def test_track_use_behavior(self):
        """Test tracking SOP use behavior"""
        response = requests.post(
            f"{BASE_URL}/api/knowledge-base/ai/track-behavior?user_id=test_user_001&action=use&sop_id=sop_discovery_001"
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["message"] == "Behavior tracked"
    
    def test_track_search_behavior(self):
        """Test tracking search behavior"""
        response = requests.post(
            f"{BASE_URL}/api/knowledge-base/ai/track-behavior?user_id=test_user_001&action=search&search_query=onboarding"
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["message"] == "Behavior tracked"
    
    def test_track_complete_behavior(self):
        """Test tracking checklist complete behavior"""
        response = requests.post(
            f"{BASE_URL}/api/knowledge-base/ai/track-behavior?user_id=test_user_001&action=complete&sop_id=sop_onboarding_001"
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["message"] == "Behavior tracked"


class TestUserInsights:
    """Test User Insights endpoint - GET /api/knowledge-base/ai/user-insights/{user_id}"""
    
    def test_user_insights_basic(self):
        """Test basic user insights request"""
        # First track some behavior
        requests.post(
            f"{BASE_URL}/api/knowledge-base/ai/track-behavior?user_id=insights_test_user&action=view&sop_id=sop_upsell_001"
        )
        requests.post(
            f"{BASE_URL}/api/knowledge-base/ai/track-behavior?user_id=insights_test_user&action=use&sop_id=sop_discovery_001"
        )
        requests.post(
            f"{BASE_URL}/api/knowledge-base/ai/track-behavior?user_id=insights_test_user&action=search&search_query=proposal"
        )
        
        # Now get insights
        response = requests.get(f"{BASE_URL}/api/knowledge-base/ai/user-insights/insights_test_user")
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "user_id" in data
        assert "total_actions" in data
        assert "top_viewed_sops" in data
        assert "top_used_sops" in data
        assert "recent_searches" in data
        assert "activity_summary" in data
        
        assert data["user_id"] == "insights_test_user"
        assert isinstance(data["top_viewed_sops"], list)
        assert isinstance(data["top_used_sops"], list)
        assert isinstance(data["recent_searches"], list)
    
    def test_user_insights_new_user(self):
        """Test user insights for user with no behavior"""
        response = requests.get(f"{BASE_URL}/api/knowledge-base/ai/user-insights/new_user_no_history")
        assert response.status_code == 200
        data = response.json()
        
        assert data["user_id"] == "new_user_no_history"
        assert data["total_actions"] == 0
        assert data["activity_summary"]["views"] == 0
        assert data["activity_summary"]["uses"] == 0
        assert data["activity_summary"]["searches"] == 0


class TestSuggestSOPImprovements:
    """Test Suggest SOP Improvements endpoint - POST /api/knowledge-base/ai/suggest-sop-improvements"""
    
    def test_suggest_improvements_existing_sop(self):
        """Test suggesting improvements for existing SOP"""
        # First ensure demo data exists
        requests.post(f"{BASE_URL}/api/knowledge-base/seed-demo")
        
        response = requests.post(
            f"{BASE_URL}/api/knowledge-base/ai/suggest-sop-improvements?sop_id=sop_upsell_001"
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "suggestions" in data
        assert "ai_powered" in data
        
        # sop_id is only returned when AI is powered, fallback doesn't include it
        # but suggestions should always be present
        assert isinstance(data["suggestions"], list)
        assert len(data["suggestions"]) >= 1
        
        # Verify suggestion structure
        suggestion = data["suggestions"][0]
        assert "suggestion" in suggestion or "category" in suggestion
    
    def test_suggest_improvements_nonexistent_sop(self):
        """Test suggesting improvements for non-existent SOP"""
        response = requests.post(
            f"{BASE_URL}/api/knowledge-base/ai/suggest-sop-improvements?sop_id=nonexistent_sop_xyz"
        )
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
        assert "not found" in data["detail"].lower()


class TestAIIntegration:
    """Integration tests for AI features working together"""
    
    def test_full_ai_workflow(self):
        """Test complete AI workflow: track behavior -> get insights -> get recommendations"""
        user_id = "workflow_test_user"
        
        # Step 1: Track multiple behaviors
        for sop_id in ["sop_upsell_001", "sop_discovery_001", "sop_onboarding_001"]:
            requests.post(
                f"{BASE_URL}/api/knowledge-base/ai/track-behavior?user_id={user_id}&action=view&sop_id={sop_id}"
            )
        
        # Step 2: Get user insights
        insights_response = requests.get(f"{BASE_URL}/api/knowledge-base/ai/user-insights/{user_id}")
        assert insights_response.status_code == 200
        insights = insights_response.json()
        assert insights["total_actions"] >= 3
        
        # Step 3: Get recommendations based on behavior
        rec_response = requests.post(f"{BASE_URL}/api/knowledge-base/ai/recommendations", json={
            "user_id": user_id,
            "role": "coordinator",
            "current_stage": "proposal"
        })
        assert rec_response.status_code == 200
        recommendations = rec_response.json()
        assert "recommendations" in recommendations
        
        # Step 4: Get proactive alerts
        alerts_response = requests.get(f"{BASE_URL}/api/knowledge-base/ai/proactive-alerts/{user_id}")
        assert alerts_response.status_code == 200
        alerts = alerts_response.json()
        assert "alerts" in alerts
    
    def test_checklist_generation_and_sop_creation(self):
        """Test generating checklist and using it to create SOP"""
        # Step 1: Generate checklist
        checklist_response = requests.post(f"{BASE_URL}/api/knowledge-base/ai/generate-checklist", json={
            "sop_title": "AI Test SOP",
            "sop_description": "Test SOP created with AI-generated checklist",
            "category": "operations",
            "relevant_stages": ["active"]
        })
        assert checklist_response.status_code == 200
        checklist_data = checklist_response.json()
        
        # Step 2: Create SOP with generated checklist
        sop_response = requests.post(f"{BASE_URL}/api/knowledge-base/sops", json={
            "title": "AI Test SOP",
            "description": "Test SOP created with AI-generated checklist",
            "category": "operations",
            "content": "# AI Test SOP\n\nThis is a test SOP with AI-generated checklist.",
            "relevant_stages": ["active"],
            "checklist": checklist_data["checklist"][:5],  # Use first 5 items
            "tags": ["ai-generated", "test"]
        })
        assert sop_response.status_code == 200
        sop_data = sop_response.json()
        
        assert "sop" in sop_data
        assert sop_data["sop"]["title"] == "AI Test SOP"
        assert len(sop_data["sop"]["checklist"]) >= 1


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
