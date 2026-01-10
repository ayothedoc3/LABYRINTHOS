"""
Phase 3 CRM Modules Tests
Tests for Sales CRM, Affiliate CRM, and Communications modules
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestSalesCRMStats:
    """Sales CRM Stats endpoint tests"""
    
    def test_get_sales_stats(self):
        """Test GET /api/sales/stats returns valid stats"""
        response = requests.get(f"{BASE_URL}/api/sales/stats")
        assert response.status_code == 200
        
        data = response.json()
        assert "total_leads" in data
        assert "leads_by_stage" in data
        assert "leads_by_source" in data
        assert "leads_by_priority" in data
        assert "total_pipeline_value" in data
        assert "conversion_rate" in data
        assert "avg_deal_size" in data
        assert "proposals_sent" in data
        assert isinstance(data["total_leads"], int)
        assert data["total_leads"] >= 0


class TestSalesCRMLeads:
    """Sales CRM Leads endpoint tests"""
    
    def test_get_all_leads(self):
        """Test GET /api/sales/leads returns list of leads"""
        response = requests.get(f"{BASE_URL}/api/sales/leads")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Verify lead structure
        lead = data[0]
        assert "id" in lead
        assert "name" in lead
        assert "contact" in lead
        assert "stage" in lead
        assert "estimated_value" in lead
        assert "tags" in lead
    
    def test_get_leads_by_stage(self):
        """Test GET /api/sales/leads with stage filter"""
        response = requests.get(f"{BASE_URL}/api/sales/leads?stage=NEW")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        for lead in data:
            assert lead["stage"] == "NEW"
    
    def test_get_single_lead(self):
        """Test GET /api/sales/leads/{lead_id}"""
        response = requests.get(f"{BASE_URL}/api/sales/leads/lead-1")
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == "lead-1"
        assert "name" in data
        assert "contact" in data
    
    def test_get_nonexistent_lead(self):
        """Test GET /api/sales/leads/{lead_id} for non-existent lead"""
        response = requests.get(f"{BASE_URL}/api/sales/leads/nonexistent-lead")
        assert response.status_code == 404
    
    def test_create_lead(self):
        """Test POST /api/sales/leads creates a new lead"""
        new_lead = {
            "name": "TEST_New Lead",
            "contact": {
                "email": "test_newlead@example.com",
                "phone": "+1-555-9999",
                "company": "Test Company"
            },
            "source": "WEBSITE",
            "priority": "HIGH",
            "estimated_value": 50000,
            "tags": ["test", "new"]
        }
        
        response = requests.post(f"{BASE_URL}/api/sales/leads", json=new_lead)
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == "TEST_New Lead"
        assert data["contact"]["email"] == "test_newlead@example.com"
        assert data["stage"] == "NEW"
        assert "id" in data
        
        # Verify persistence with GET
        lead_id = data["id"]
        get_response = requests.get(f"{BASE_URL}/api/sales/leads/{lead_id}")
        assert get_response.status_code == 200
        assert get_response.json()["name"] == "TEST_New Lead"


class TestSalesCRMStages:
    """Sales CRM Stages endpoint tests"""
    
    def test_get_stages(self):
        """Test GET /api/sales/stages returns stage configurations"""
        response = requests.get(f"{BASE_URL}/api/sales/stages")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Verify stage structure
        stage = data[0]
        assert "stage" in stage
        assert "display_name" in stage
        assert "color" in stage
        assert "icon" in stage
        assert "valid_transitions" in stage


class TestSalesCRMProposals:
    """Sales CRM Proposals endpoint tests"""
    
    def test_get_proposals(self):
        """Test GET /api/sales/proposals returns list of proposals"""
        response = requests.get(f"{BASE_URL}/api/sales/proposals")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)


class TestAffiliateCRMStats:
    """Affiliate CRM Stats endpoint tests"""
    
    def test_get_affiliate_stats(self):
        """Test GET /api/affiliates/stats returns valid stats"""
        response = requests.get(f"{BASE_URL}/api/affiliates/stats")
        assert response.status_code == 200
        
        data = response.json()
        assert "total_affiliates" in data
        assert "active_affiliates" in data
        assert "affiliates_by_tier" in data
        assert "total_referrals" in data
        assert "total_conversions" in data
        assert "overall_conversion_rate" in data
        assert "total_commissions_paid" in data
        assert "pending_commissions" in data
        assert "top_affiliates" in data
        assert isinstance(data["top_affiliates"], list)


class TestAffiliateCRMAffiliates:
    """Affiliate CRM Affiliates endpoint tests"""
    
    def test_get_all_affiliates(self):
        """Test GET /api/affiliates/ returns list of affiliates"""
        response = requests.get(f"{BASE_URL}/api/affiliates/")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Verify affiliate structure
        affiliate = data[0]
        assert "id" in affiliate
        assert "name" in affiliate
        assert "email" in affiliate
        assert "tier" in affiliate
        assert "status" in affiliate
        assert "referral_code" in affiliate
        assert "referral_link" in affiliate
        assert "total_referrals" in affiliate
        assert "total_conversions" in affiliate
        assert "total_earnings" in affiliate
    
    def test_get_affiliates_by_tier(self):
        """Test GET /api/affiliates/ with tier filter"""
        response = requests.get(f"{BASE_URL}/api/affiliates/?tier=GOLD")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        for affiliate in data:
            assert affiliate["tier"] == "GOLD"
    
    def test_get_single_affiliate(self):
        """Test GET /api/affiliates/{affiliate_id}"""
        response = requests.get(f"{BASE_URL}/api/affiliates/affiliate-1")
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == "affiliate-1"
        assert "name" in data
        assert "tier" in data
    
    def test_get_affiliate_referrals(self):
        """Test GET /api/affiliates/{affiliate_id}/referrals"""
        response = requests.get(f"{BASE_URL}/api/affiliates/affiliate-1/referrals")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_affiliate_commissions(self):
        """Test GET /api/affiliates/{affiliate_id}/commissions"""
        response = requests.get(f"{BASE_URL}/api/affiliates/affiliate-1/commissions")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
    
    def test_create_affiliate(self):
        """Test POST /api/affiliates/ creates a new affiliate"""
        new_affiliate = {
            "name": "TEST_New Affiliate",
            "email": "test_affiliate@example.com",
            "company": "Test Affiliate Co"
        }
        
        response = requests.post(f"{BASE_URL}/api/affiliates/", json=new_affiliate)
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == "TEST_New Affiliate"
        assert data["email"] == "test_affiliate@example.com"
        assert data["tier"] == "BRONZE"
        assert data["status"] == "PENDING"
        assert "referral_code" in data
        assert "referral_link" in data


class TestAffiliateCRMTiers:
    """Affiliate CRM Tiers endpoint tests"""
    
    def test_get_tier_info(self):
        """Test GET /api/affiliates/tiers/info returns tier configurations"""
        response = requests.get(f"{BASE_URL}/api/affiliates/tiers/info")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 4  # BRONZE, SILVER, GOLD, PLATINUM
        
        # Verify tier structure
        tier = data[0]
        assert "tier" in tier
        assert "display_name" in tier
        assert "color" in tier
        assert "commission_rate" in tier
        assert "min_conversions" in tier
        assert "benefits" in tier


class TestCommunicationsStats:
    """Communications Stats endpoint tests"""
    
    def test_get_communication_stats(self):
        """Test GET /api/communications/stats returns valid stats"""
        response = requests.get(f"{BASE_URL}/api/communications/stats")
        assert response.status_code == 200
        
        data = response.json()
        assert "total_threads" in data
        assert "open_threads" in data
        assert "threads_by_type" in data
        assert "total_messages" in data
        assert "messages_today" in data
        assert "active_participants" in data


class TestCommunicationsThreads:
    """Communications Threads endpoint tests"""
    
    def test_get_all_threads(self):
        """Test GET /api/communications/threads returns list of threads"""
        response = requests.get(f"{BASE_URL}/api/communications/threads")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Verify thread structure
        thread = data[0]
        assert "id" in thread
        assert "title" in thread
        assert "thread_type" in thread
        assert "status" in thread
        assert "participants" in thread
        assert "message_count" in thread
        assert "last_message_preview" in thread
    
    def test_get_threads_by_type(self):
        """Test GET /api/communications/threads with type filter"""
        response = requests.get(f"{BASE_URL}/api/communications/threads?thread_type=CONTRACT")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        for thread in data:
            assert thread["thread_type"] == "CONTRACT"
    
    def test_get_single_thread(self):
        """Test GET /api/communications/threads/{thread_id}"""
        response = requests.get(f"{BASE_URL}/api/communications/threads/thread-1")
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == "thread-1"
        assert "title" in data
        assert "participants" in data
    
    def test_get_thread_messages(self):
        """Test GET /api/communications/threads/{thread_id}/messages"""
        response = requests.get(f"{BASE_URL}/api/communications/threads/thread-1/messages")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
    
    def test_create_thread(self):
        """Test POST /api/communications/threads creates a new thread"""
        new_thread = {
            "title": "TEST_New Thread",
            "thread_type": "INTERNAL",
            "description": "Test thread for testing",
            "participant_ids": ["coordinator-1"]
        }
        
        response = requests.post(f"{BASE_URL}/api/communications/threads", json=new_thread)
        assert response.status_code == 200
        
        data = response.json()
        assert data["title"] == "TEST_New Thread"
        assert data["thread_type"] == "INTERNAL"
        assert data["status"] == "OPEN"
        assert "id" in data
    
    def test_send_message(self):
        """Test POST /api/communications/threads/{thread_id}/messages sends a message"""
        new_message = {
            "content": "TEST_This is a test message",
            "sender_id": "coordinator-1",
            "sender_name": "Test Coordinator"
        }
        
        response = requests.post(f"{BASE_URL}/api/communications/threads/thread-1/messages", json=new_message)
        assert response.status_code == 200
        
        data = response.json()
        assert data["content"] == "TEST_This is a test message"
        assert "id" in data


class TestCommunicationsTypes:
    """Communications Types endpoint tests"""
    
    def test_get_thread_types(self):
        """Test GET /api/communications/types returns thread type configurations"""
        response = requests.get(f"{BASE_URL}/api/communications/types")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 5  # CONTRACT, LEAD, SUPPORT, INTERNAL, CLIENT
        
        # Verify type structure
        thread_type = data[0]
        assert "type" in thread_type
        assert "display_name" in thread_type
        assert "color" in thread_type
        assert "icon" in thread_type


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
