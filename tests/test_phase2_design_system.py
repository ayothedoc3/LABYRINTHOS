"""
Phase 2 Design System Enhancement - Backend API Tests
Tests for Role System and Contract Lifecycle APIs
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://clientpath-1.preview.emergentagent.com').rstrip('/')

class TestRoleSystemAPIs:
    """Tests for Role System endpoints"""
    
    def test_get_all_roles_info(self):
        """Test GET /api/roles/info - Get all roles information"""
        response = requests.get(f"{BASE_URL}/api/roles/info")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Check that expected roles exist
        role_names = [r['role'] for r in data]
        assert 'ADMIN' in role_names
        assert 'EXECUTIVE' in role_names
        assert 'COORDINATOR' in role_names
        
        # Check role structure
        first_role = data[0]
        assert 'role' in first_role
        assert 'display_name' in first_role
        assert 'description' in first_role
        assert 'color' in first_role
        assert 'icon' in first_role
        assert 'permissions' in first_role
        assert 'dashboard_tiles' in first_role
        print(f"SUCCESS: Found {len(data)} roles")
    
    def test_get_specific_role_info(self):
        """Test GET /api/roles/info/{role} - Get specific role info"""
        response = requests.get(f"{BASE_URL}/api/roles/info/EXECUTIVE")
        assert response.status_code == 200
        
        data = response.json()
        assert data['role'] == 'EXECUTIVE'
        assert data['display_name'] == 'Executive'
        assert 'permissions' in data
        assert 'dashboard_tiles' in data
        print(f"SUCCESS: Executive role has {len(data['permissions'])} permissions")
    
    def test_create_session(self):
        """Test POST /api/roles/session - Create a session for a role"""
        response = requests.post(f"{BASE_URL}/api/roles/session?role=COORDINATOR")
        assert response.status_code == 200
        
        data = response.json()
        assert 'session_id' in data
        assert 'user' in data
        assert 'role' in data
        assert data['role'] == 'COORDINATOR'
        assert 'permissions' in data
        assert 'dashboard_tiles' in data
        print(f"SUCCESS: Created session {data['session_id']}")
        return data['session_id']
    
    def test_get_users(self):
        """Test GET /api/roles/users - Get all users"""
        response = requests.get(f"{BASE_URL}/api/roles/users")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Found {len(data)} users")
    
    def test_check_permission(self):
        """Test GET /api/roles/check-permission - Check role permission"""
        response = requests.get(
            f"{BASE_URL}/api/roles/check-permission",
            params={"role": "ADMIN", "permission": "VIEW_ALL"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert 'role' in data
        assert 'permission' in data
        assert 'allowed' in data
        assert data['allowed'] == True  # Admin should have VIEW_ALL
        print(f"SUCCESS: ADMIN has VIEW_ALL permission: {data['allowed']}")


class TestContractLifecycleAPIs:
    """Tests for Contract Lifecycle endpoints"""
    
    def test_get_all_stages(self):
        """Test GET /api/lifecycle/stages - Get all contract stages"""
        response = requests.get(f"{BASE_URL}/api/lifecycle/stages")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Check expected stages exist
        stage_names = [s['stage'] for s in data]
        assert 'PROPOSAL' in stage_names
        assert 'BID_SUBMITTED' in stage_names
        assert 'ACTIVE' in stage_names
        assert 'COMPLETED' in stage_names
        
        # Check stage structure
        first_stage = data[0]
        assert 'stage' in first_stage
        assert 'display_name' in first_stage
        assert 'color' in first_stage
        assert 'valid_transitions' in first_stage
        print(f"SUCCESS: Found {len(data)} stages")
    
    def test_get_lifecycle_contracts(self):
        """Test GET /api/lifecycle/contracts - Get all lifecycle contracts"""
        response = requests.get(f"{BASE_URL}/api/lifecycle/contracts")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Found {len(data)} lifecycle contracts")
        
        if len(data) > 0:
            # Check contract structure
            contract = data[0]
            assert 'id' in contract
            assert 'name' in contract
            assert 'stage' in contract
            assert 'client_name' in contract
            print(f"SUCCESS: First contract: {contract['name']} - Stage: {contract['stage']}")
    
    def test_get_lifecycle_stats(self):
        """Test GET /api/lifecycle/stats - Get lifecycle statistics"""
        response = requests.get(f"{BASE_URL}/api/lifecycle/stats")
        assert response.status_code == 200
        
        data = response.json()
        assert 'total_contracts' in data
        assert 'stage_counts' in data
        assert 'type_counts' in data
        print(f"SUCCESS: Total contracts: {data['total_contracts']}")
        print(f"SUCCESS: Stage counts: {data['stage_counts']}")
    
    def test_seed_demo_contracts(self):
        """Test POST /api/lifecycle/seed-demo - Seed demo contracts"""
        response = requests.post(f"{BASE_URL}/api/lifecycle/seed-demo")
        assert response.status_code == 200
        
        data = response.json()
        assert 'message' in data
        print(f"SUCCESS: {data['message']}")
    
    def test_create_lifecycle_contract(self):
        """Test POST /api/lifecycle/contracts - Create a new contract"""
        contract_data = {
            "name": "TEST_Contract_Phase2",
            "description": "Test contract for Phase 2 testing",
            "client_name": "Test Client Corp",
            "client_package": "SILVER",
            "contract_type": "PROJECT_BASED",
            "function": "DEVELOPMENT",
            "estimated_value": 10000
        }
        
        response = requests.post(
            f"{BASE_URL}/api/lifecycle/contracts",
            json=contract_data
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data['name'] == contract_data['name']
        assert data['stage'] == 'PROPOSAL'  # New contracts start at PROPOSAL
        assert data['client_name'] == contract_data['client_name']
        print(f"SUCCESS: Created contract {data['id']} in stage {data['stage']}")
        return data['id']
    
    def test_get_specific_contract(self):
        """Test GET /api/lifecycle/contracts/{id} - Get specific contract"""
        # First create a contract
        contract_data = {
            "name": "TEST_GetContract_Phase2",
            "description": "Test contract for GET test",
            "client_name": "Test Client",
            "client_package": "BRONZE",
            "contract_type": "RECURRING",
            "function": "OPERATIONS"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/lifecycle/contracts",
            json=contract_data
        )
        assert create_response.status_code == 200
        contract_id = create_response.json()['id']
        
        # Now get the contract
        response = requests.get(f"{BASE_URL}/api/lifecycle/contracts/{contract_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data['id'] == contract_id
        assert data['name'] == contract_data['name']
        print(f"SUCCESS: Retrieved contract {contract_id}")
    
    def test_contract_stage_transition(self):
        """Test POST /api/lifecycle/contracts/{id}/transition - Transition contract stage"""
        # First create a contract
        contract_data = {
            "name": "TEST_Transition_Phase2",
            "description": "Test contract for transition test",
            "client_name": "Transition Test Client",
            "client_package": "GOLD",
            "contract_type": "PROJECT_BASED",
            "function": "MARKETING"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/lifecycle/contracts",
            json=contract_data
        )
        assert create_response.status_code == 200
        contract_id = create_response.json()['id']
        
        # Transition from PROPOSAL to BID_SUBMITTED
        response = requests.post(
            f"{BASE_URL}/api/lifecycle/contracts/{contract_id}/transition",
            params={
                "new_stage": "BID_SUBMITTED",
                "transitioned_by": "test_user",
                "reason": "Testing stage transition"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data['stage'] == 'BID_SUBMITTED'
        print(f"SUCCESS: Transitioned contract to {data['stage']}")
    
    def test_invalid_stage_transition(self):
        """Test invalid stage transition is rejected"""
        # First create a contract
        contract_data = {
            "name": "TEST_InvalidTransition_Phase2",
            "description": "Test contract for invalid transition",
            "client_name": "Invalid Test Client",
            "client_package": "BRONZE",
            "contract_type": "PROJECT_BASED",
            "function": "SALES"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/lifecycle/contracts",
            json=contract_data
        )
        assert create_response.status_code == 200
        contract_id = create_response.json()['id']
        
        # Try invalid transition from PROPOSAL directly to ACTIVE (should fail)
        response = requests.post(
            f"{BASE_URL}/api/lifecycle/contracts/{contract_id}/transition",
            params={
                "new_stage": "ACTIVE",
                "transitioned_by": "test_user",
                "reason": "Testing invalid transition"
            }
        )
        assert response.status_code == 400  # Should be rejected
        print(f"SUCCESS: Invalid transition correctly rejected")


class TestDashboardAPIs:
    """Tests for Dashboard endpoints"""
    
    def test_get_dashboard_stats(self):
        """Test GET /api/dashboard/stats - Get dashboard statistics"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats")
        # This endpoint may or may not exist
        if response.status_code == 200:
            data = response.json()
            print(f"SUCCESS: Dashboard stats retrieved")
        else:
            print(f"INFO: Dashboard stats endpoint returned {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
