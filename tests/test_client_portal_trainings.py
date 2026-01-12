"""
Test Suite for Client Portal and Team Trainings Features
Tests: Client sign-up, verification, lobby progress, training modules, progress tracking
"""
import pytest
import requests
import os
import time
import random
import string

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://op-manual-system.preview.emergentagent.com').rstrip('/')

# ==================== FIXTURES ====================

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture
def unique_email():
    """Generate unique email for testing"""
    random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
    return f"test_{random_suffix}@example.com"

# ==================== HEALTH CHECK ====================

class TestHealthCheck:
    """Basic health check tests"""
    
    def test_api_health(self, api_client):
        """Test API health endpoint"""
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print(f"✓ API health check passed: {data}")

# ==================== CLIENT PORTAL TESTS ====================

class TestClientPortalSignup:
    """Client Portal sign-up flow tests"""
    
    def test_signup_creates_unverified_client(self, api_client, unique_email):
        """Test that sign-up creates client with 'unverified' status"""
        payload = {
            "company_name": "TEST_Company",
            "email": unique_email,
            "phone": "+1 (555) 123-4567",
            "company_size": "21-50"
        }
        response = api_client.post(f"{BASE_URL}/api/client-portal/signup", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "id" in data, "Response should contain client id"
        assert data["company_name"] == payload["company_name"]
        assert data["email"] == payload["email"]
        assert data["status"] == "unverified", f"Expected status 'unverified', got '{data['status']}'"
        assert data["verification_sent"] == True
        
        # Verify lobby_progress structure
        assert "lobby_progress" in data
        assert data["lobby_progress"]["current_stage"] == "verification"
        assert data["lobby_progress"]["completed_steps"] == []
        
        print(f"✓ Client signup successful: {data['id']} with status '{data['status']}'")
        return data
    
    def test_signup_duplicate_email_rejected(self, api_client, unique_email):
        """Test that duplicate email is rejected"""
        payload = {
            "company_name": "TEST_Company1",
            "email": unique_email,
            "phone": "+1 (555) 111-1111",
            "company_size": "1-5"
        }
        
        # First signup should succeed
        response1 = api_client.post(f"{BASE_URL}/api/client-portal/signup", json=payload)
        assert response1.status_code == 200
        
        # Second signup with same email should fail
        payload["company_name"] = "TEST_Company2"
        response2 = api_client.post(f"{BASE_URL}/api/client-portal/signup", json=payload)
        assert response2.status_code == 400
        assert "already registered" in response2.json().get("detail", "").lower()
        print(f"✓ Duplicate email correctly rejected")
    
    def test_signup_invalid_email_rejected(self, api_client):
        """Test that invalid email format is rejected"""
        payload = {
            "company_name": "TEST_Company",
            "email": "invalid-email",
            "phone": "+1 (555) 123-4567",
            "company_size": "21-50"
        }
        response = api_client.post(f"{BASE_URL}/api/client-portal/signup", json=payload)
        assert response.status_code == 422, f"Expected 422 for invalid email, got {response.status_code}"
        print(f"✓ Invalid email correctly rejected")


class TestClientPortalVerification:
    """Client verification flow tests"""
    
    def test_verification_with_invalid_code(self, api_client, unique_email):
        """Test verification fails with invalid code"""
        # First create a client
        signup_payload = {
            "company_name": "TEST_VerifyCompany",
            "email": unique_email,
            "phone": "+1 (555) 222-2222",
            "company_size": "6-20"
        }
        signup_response = api_client.post(f"{BASE_URL}/api/client-portal/signup", json=signup_payload)
        assert signup_response.status_code == 200
        client_id = signup_response.json()["id"]
        
        # Try to verify with wrong code
        verify_payload = {"code": "000000"}
        verify_response = api_client.post(f"{BASE_URL}/api/client-portal/verify/{client_id}", json=verify_payload)
        assert verify_response.status_code == 400
        assert "invalid" in verify_response.json().get("detail", "").lower()
        print(f"✓ Invalid verification code correctly rejected")
    
    def test_verification_nonexistent_client(self, api_client):
        """Test verification fails for non-existent client"""
        verify_payload = {"code": "123456"}
        verify_response = api_client.post(f"{BASE_URL}/api/client-portal/verify/nonexistent_client", json=verify_payload)
        assert verify_response.status_code == 404
        print(f"✓ Non-existent client verification correctly rejected")
    
    def test_resend_verification(self, api_client, unique_email):
        """Test resend verification code"""
        # Create a client
        signup_payload = {
            "company_name": "TEST_ResendCompany",
            "email": unique_email,
            "phone": "+1 (555) 333-3333",
            "company_size": "51-200"
        }
        signup_response = api_client.post(f"{BASE_URL}/api/client-portal/signup", json=signup_payload)
        assert signup_response.status_code == 200
        client_id = signup_response.json()["id"]
        
        # Resend verification
        resend_response = api_client.post(f"{BASE_URL}/api/client-portal/resend-verification/{client_id}")
        assert resend_response.status_code == 200
        data = resend_response.json()
        assert "message" in data
        assert data["email"] == unique_email
        print(f"✓ Resend verification successful")


class TestClientPortalRetrieval:
    """Client retrieval tests"""
    
    def test_get_client_by_id(self, api_client, unique_email):
        """Test getting client by ID"""
        # Create a client
        signup_payload = {
            "company_name": "TEST_GetCompany",
            "email": unique_email,
            "phone": "+1 (555) 444-4444",
            "company_size": "200+"
        }
        signup_response = api_client.post(f"{BASE_URL}/api/client-portal/signup", json=signup_payload)
        assert signup_response.status_code == 200
        client_id = signup_response.json()["id"]
        
        # Get client
        get_response = api_client.get(f"{BASE_URL}/api/client-portal/clients/{client_id}")
        assert get_response.status_code == 200
        data = get_response.json()
        assert data["id"] == client_id
        assert data["company_name"] == signup_payload["company_name"]
        print(f"✓ Get client by ID successful")
    
    def test_get_nonexistent_client(self, api_client):
        """Test getting non-existent client returns 404"""
        response = api_client.get(f"{BASE_URL}/api/client-portal/clients/nonexistent_id")
        assert response.status_code == 404
        print(f"✓ Non-existent client correctly returns 404")
    
    def test_list_clients(self, api_client):
        """Test listing all clients"""
        response = api_client.get(f"{BASE_URL}/api/client-portal/clients")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ List clients successful, found {len(data)} clients")


class TestClientPortalLobbyProgress:
    """Lobby progress update tests"""
    
    def test_update_lobby_progress(self, api_client, unique_email):
        """Test updating lobby progress"""
        # Create a client
        signup_payload = {
            "company_name": "TEST_LobbyCompany",
            "email": unique_email,
            "phone": "+1 (555) 555-5555",
            "company_size": "21-50"
        }
        signup_response = api_client.post(f"{BASE_URL}/api/client-portal/signup", json=signup_payload)
        assert signup_response.status_code == 200
        client_id = signup_response.json()["id"]
        
        # Update lobby progress - complete video step
        progress_payload = {
            "step_id": "video",
            "completed": True
        }
        progress_response = api_client.patch(
            f"{BASE_URL}/api/client-portal/clients/{client_id}/lobby-progress",
            json=progress_payload
        )
        assert progress_response.status_code == 200
        data = progress_response.json()
        assert "video" in data["progress"]["completed_steps"]
        assert data["progress"]["video_watched"] == True
        print(f"✓ Lobby progress update successful")
    
    def test_provide_access(self, api_client, unique_email):
        """Test providing access to a system"""
        # Create a client
        signup_payload = {
            "company_name": "TEST_AccessCompany",
            "email": unique_email,
            "phone": "+1 (555) 666-6666",
            "company_size": "6-20"
        }
        signup_response = api_client.post(f"{BASE_URL}/api/client-portal/signup", json=signup_payload)
        assert signup_response.status_code == 200
        client_id = signup_response.json()["id"]
        
        # Provide access
        access_payload = {
            "access_type": "quickbooks"
        }
        access_response = api_client.post(
            f"{BASE_URL}/api/client-portal/clients/{client_id}/provide-access",
            json=access_payload
        )
        assert access_response.status_code == 200
        data = access_response.json()
        assert data["access_type"] == "quickbooks"
        assert data["status"] == "pending_verification"
        print(f"✓ Provide access successful")


class TestClientPortalDashboard:
    """Client dashboard tests"""
    
    def test_seed_demo_client(self, api_client):
        """Test seeding demo client"""
        response = api_client.post(f"{BASE_URL}/api/client-portal/seed-demo-client")
        assert response.status_code == 200
        data = response.json()
        assert data["client"]["id"] == "client_demo"
        assert data["client"]["status"] == "active"
        print(f"✓ Demo client seeded successfully")
    
    def test_get_client_dashboard(self, api_client):
        """Test getting client dashboard"""
        # First seed demo client
        api_client.post(f"{BASE_URL}/api/client-portal/seed-demo-client")
        
        # Get dashboard
        response = api_client.get(f"{BASE_URL}/api/client-portal/clients/client_demo/dashboard")
        assert response.status_code == 200
        data = response.json()
        
        # Verify dashboard structure
        assert "client" in data
        assert "metrics" in data
        assert "tiles" in data
        assert "recent_activity" in data
        
        # Verify metrics
        assert "project_progress" in data["metrics"]
        assert "completed_tasks" in data["metrics"]
        
        print(f"✓ Client dashboard retrieved successfully")


class TestClientPortalDelete:
    """Client deletion tests"""
    
    def test_delete_client(self, api_client, unique_email):
        """Test deleting a client"""
        # Create a client
        signup_payload = {
            "company_name": "TEST_DeleteCompany",
            "email": unique_email,
            "phone": "+1 (555) 777-7777",
            "company_size": "1-5"
        }
        signup_response = api_client.post(f"{BASE_URL}/api/client-portal/signup", json=signup_payload)
        assert signup_response.status_code == 200
        client_id = signup_response.json()["id"]
        
        # Delete client
        delete_response = api_client.delete(f"{BASE_URL}/api/client-portal/clients/{client_id}")
        assert delete_response.status_code == 200
        
        # Verify client is deleted
        get_response = api_client.get(f"{BASE_URL}/api/client-portal/clients/{client_id}")
        assert get_response.status_code == 404
        print(f"✓ Client deletion successful")


# ==================== TRAININGS MODULE TESTS ====================

class TestTrainingsModules:
    """Training modules tests"""
    
    def test_seed_training_modules(self, api_client):
        """Test seeding training modules"""
        response = api_client.post(f"{BASE_URL}/api/trainings/seed-modules")
        assert response.status_code == 200
        data = response.json()
        assert data["count"] == 8, f"Expected 8 modules, got {data['count']}"
        print(f"✓ Training modules seeded: {data['count']} modules")
    
    def test_list_training_modules(self, api_client):
        """Test listing training modules"""
        # First seed modules
        api_client.post(f"{BASE_URL}/api/trainings/seed-modules")
        
        response = api_client.get(f"{BASE_URL}/api/trainings/modules")
        assert response.status_code == 200
        data = response.json()
        
        assert "modules" in data
        modules = data["modules"]
        assert len(modules) >= 8, f"Expected at least 8 modules, got {len(modules)}"
        
        # Verify module structure
        for module in modules:
            assert "id" in module
            assert "title" in module
            assert "description" in module
            assert "category" in module
            assert "duration_minutes" in module
            assert "content_type" in module
        
        print(f"✓ Training modules listed: {len(modules)} modules")
    
    def test_list_modules_by_category(self, api_client):
        """Test filtering modules by category"""
        # Seed modules first
        api_client.post(f"{BASE_URL}/api/trainings/seed-modules")
        
        response = api_client.get(f"{BASE_URL}/api/trainings/modules?category=onboarding")
        assert response.status_code == 200
        data = response.json()
        
        modules = data["modules"]
        for module in modules:
            assert module["category"] == "onboarding"
        
        print(f"✓ Filtered by category: {len(modules)} onboarding modules")
    
    def test_list_modules_by_role(self, api_client):
        """Test filtering modules by role"""
        # Seed modules first
        api_client.post(f"{BASE_URL}/api/trainings/seed-modules")
        
        response = api_client.get(f"{BASE_URL}/api/trainings/modules?role=executive")
        assert response.status_code == 200
        data = response.json()
        
        modules = data["modules"]
        for module in modules:
            assert module["role_required"] in ["all", "executive"]
        
        print(f"✓ Filtered by role: {len(modules)} modules for executive")
    
    def test_get_specific_module(self, api_client):
        """Test getting a specific training module"""
        # Seed modules first
        api_client.post(f"{BASE_URL}/api/trainings/seed-modules")
        
        response = api_client.get(f"{BASE_URL}/api/trainings/modules/onboarding-101")
        assert response.status_code == 200
        data = response.json()
        
        assert data["id"] == "onboarding-101"
        assert data["title"] == "Welcome to Labyrinth"
        print(f"✓ Got specific module: {data['title']}")
    
    def test_get_nonexistent_module(self, api_client):
        """Test getting non-existent module returns 404"""
        response = api_client.get(f"{BASE_URL}/api/trainings/modules/nonexistent-module")
        assert response.status_code == 404
        print(f"✓ Non-existent module correctly returns 404")


class TestTrainingsProgress:
    """Training progress tracking tests"""
    
    def test_get_user_progress(self, api_client):
        """Test getting user training progress"""
        # Seed modules first
        api_client.post(f"{BASE_URL}/api/trainings/seed-modules")
        
        user_id = "test_user_001"
        response = api_client.get(f"{BASE_URL}/api/trainings/progress/{user_id}")
        assert response.status_code == 200
        data = response.json()
        
        assert data["user_id"] == user_id
        assert "modules" in data
        assert "summary" in data
        
        # Verify summary structure
        summary = data["summary"]
        assert "total_modules" in summary
        assert "completed" in summary
        assert "in_progress" in summary
        assert "not_started" in summary
        assert "completion_percent" in summary
        
        print(f"✓ User progress retrieved: {summary['total_modules']} modules, {summary['completion_percent']}% complete")
    
    def test_start_training(self, api_client):
        """Test starting a training module"""
        # Seed modules first
        api_client.post(f"{BASE_URL}/api/trainings/seed-modules")
        
        user_id = "test_user_002"
        module_id = "onboarding-101"
        
        response = api_client.post(f"{BASE_URL}/api/trainings/progress/{user_id}/{module_id}")
        assert response.status_code == 200
        data = response.json()
        
        assert data["progress"]["status"] == "in_progress"
        assert data["progress"]["progress_percent"] == 0
        assert data["progress"]["started_at"] is not None
        
        print(f"✓ Training started: {module_id} for user {user_id}")
    
    def test_update_training_progress(self, api_client):
        """Test updating training progress"""
        # Seed modules first
        api_client.post(f"{BASE_URL}/api/trainings/seed-modules")
        
        user_id = "test_user_003"
        module_id = "communication-basics"
        
        # Start training first
        api_client.post(f"{BASE_URL}/api/trainings/progress/{user_id}/{module_id}")
        
        # Update progress
        update_payload = {
            "progress_percent": 50
        }
        response = api_client.patch(
            f"{BASE_URL}/api/trainings/progress/{user_id}/{module_id}",
            json=update_payload
        )
        assert response.status_code == 200
        data = response.json()
        assert data["progress_percent"] == 50
        
        print(f"✓ Training progress updated to 50%")
    
    def test_complete_training(self, api_client):
        """Test completing a training module"""
        # Seed modules first
        api_client.post(f"{BASE_URL}/api/trainings/seed-modules")
        
        user_id = "test_user_004"
        module_id = "tools-overview"
        
        # Start training first
        api_client.post(f"{BASE_URL}/api/trainings/progress/{user_id}/{module_id}")
        
        # Complete training
        update_payload = {
            "status": "completed",
            "progress_percent": 100
        }
        response = api_client.patch(
            f"{BASE_URL}/api/trainings/progress/{user_id}/{module_id}",
            json=update_payload
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        assert data["progress_percent"] == 100
        assert data["completed_at"] is not None
        
        print(f"✓ Training completed: {module_id}")
    
    def test_update_progress_without_starting(self, api_client):
        """Test that updating progress without starting fails"""
        user_id = "test_user_005"
        module_id = "compliance-101"
        
        update_payload = {
            "progress_percent": 50
        }
        response = api_client.patch(
            f"{BASE_URL}/api/trainings/progress/{user_id}/{module_id}",
            json=update_payload
        )
        assert response.status_code == 404
        print(f"✓ Update without starting correctly rejected")


class TestTrainingsAnalytics:
    """Training analytics tests"""
    
    def test_team_analytics(self, api_client):
        """Test getting team-wide training analytics"""
        # Seed modules first
        api_client.post(f"{BASE_URL}/api/trainings/seed-modules")
        
        response = api_client.get(f"{BASE_URL}/api/trainings/analytics/team")
        assert response.status_code == 200
        data = response.json()
        
        assert "total_users_training" in data
        assert "status_breakdown" in data
        assert "completions_by_module" in data
        
        print(f"✓ Team analytics retrieved: {data['total_users_training']} users training")


# ==================== INTEGRATION TESTS ====================

class TestClientPortalTrainingsIntegration:
    """Integration tests for Client Portal and Trainings"""
    
    def test_client_training_progress(self, api_client):
        """Test that client training progress is tracked"""
        # Seed demo client
        api_client.post(f"{BASE_URL}/api/client-portal/seed-demo-client")
        
        # Get demo client
        client_response = api_client.get(f"{BASE_URL}/api/client-portal/clients/client_demo")
        assert client_response.status_code == 200
        client = client_response.json()
        
        # Verify training_progress exists
        assert "training_progress" in client
        assert "completed" in client["training_progress"]
        assert "in_progress" in client["training_progress"]
        
        print(f"✓ Client training progress integration verified")


# ==================== CLEANUP ====================

class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_clients(self, api_client):
        """Clean up test clients"""
        # List all clients
        response = api_client.get(f"{BASE_URL}/api/client-portal/clients")
        if response.status_code == 200:
            clients = response.json()
            deleted_count = 0
            for client in clients:
                if client.get("company_name", "").startswith("TEST_"):
                    delete_response = api_client.delete(f"{BASE_URL}/api/client-portal/clients/{client['id']}")
                    if delete_response.status_code == 200:
                        deleted_count += 1
            print(f"✓ Cleaned up {deleted_count} test clients")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
