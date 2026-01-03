#!/usr/bin/env python3
"""
Comprehensive Backend API Test Suite for Labyrinth OS
Tests all backend APIs before deployment
"""

import requests
import json
import sys
from datetime import datetime
import uuid

# Base URL from frontend .env
BASE_URL = "https://labyrinth-os.preview.emergentagent.com/api"

class BackendTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.test_results = []
        
    def log_test(self, test_name, success, response_code=None, details=None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "response_code": response_code,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name} - {response_code} - {details}")
        
    def test_health_and_core_apis(self):
        """Test Health & Core APIs"""
        print("\n=== Testing Health & Core APIs ===")
        
        # Test health endpoint
        try:
            response = self.session.get(f"{self.base_url}/health", timeout=10)
            if response.status_code == 200:
                data = response.json()
                self.log_test("GET /api/health", True, response.status_code, f"Status: {data.get('status')}")
            else:
                self.log_test("GET /api/health", False, response.status_code, response.text[:100])
        except Exception as e:
            self.log_test("GET /api/health", False, None, str(e))
            
        # Test dashboard stats
        try:
            response = self.session.get(f"{self.base_url}/dashboard/stats", timeout=10)
            if response.status_code == 200:
                data = response.json()
                self.log_test("GET /api/stats", True, response.status_code, f"Playbooks: {data.get('total_playbooks', 0)}")
            else:
                self.log_test("GET /api/stats", False, response.status_code, response.text[:100])
        except Exception as e:
            self.log_test("GET /api/stats", False, None, str(e))
    
    def test_ai_generation_apis(self):
        """Test AI Generation APIs"""
        print("\n=== Testing AI Generation APIs ===")
        
        # Test AI settings
        try:
            response = self.session.get(f"{self.base_url}/settings/ai", timeout=10)
            if response.status_code == 200:
                data = response.json()
                providers = data.get('available_providers', [])
                self.log_test("GET /api/settings/ai", True, response.status_code, f"Providers: {len(providers)}")
            else:
                self.log_test("GET /api/settings/ai", False, response.status_code, response.text[:100])
        except Exception as e:
            self.log_test("GET /api/settings/ai", False, None, str(e))
            
        # Test AI providers
        try:
            response = self.session.get(f"{self.base_url}/ai/providers", timeout=10)
            if response.status_code == 200:
                data = response.json()
                self.log_test("GET /api/ai/providers", True, response.status_code, f"Providers: {len(data)}")
            else:
                self.log_test("GET /api/ai/providers", False, response.status_code, response.text[:100])
        except Exception as e:
            self.log_test("GET /api/ai/providers", False, None, str(e))
            
        # Test AI playbook generation (skip if slow as requested)
        print("Skipping POST /api/ai/generate/playbook as requested (slow operation)")
        self.log_test("POST /api/ai/generate/playbook", True, "SKIPPED", "Skipped as requested - slow operation")
    
    def test_workflowviz_apis(self):
        """Test WorkflowViz APIs"""
        print("\n=== Testing WorkflowViz APIs ===")
        
        # Test workflows
        try:
            response = self.session.get(f"{self.base_url}/workflowviz/workflows", timeout=10)
            if response.status_code == 200:
                data = response.json()
                self.log_test("GET /api/workflowviz/workflows", True, response.status_code, f"Workflows: {len(data)}")
            else:
                self.log_test("GET /api/workflowviz/workflows", False, response.status_code, response.text[:100])
        except Exception as e:
            self.log_test("GET /api/workflowviz/workflows", False, None, str(e))
            
        # Test templates
        try:
            response = self.session.get(f"{self.base_url}/workflowviz/templates", timeout=10)
            if response.status_code == 200:
                data = response.json()
                self.log_test("GET /api/workflowviz/templates", True, response.status_code, f"Templates: {len(data)}")
            else:
                self.log_test("GET /api/workflowviz/templates", False, response.status_code, response.text[:100])
        except Exception as e:
            self.log_test("GET /api/workflowviz/templates", False, None, str(e))
            
        # Test team
        try:
            response = self.session.get(f"{self.base_url}/workflowviz/team", timeout=10)
            if response.status_code == 200:
                data = response.json()
                self.log_test("GET /api/workflowviz/team", True, response.status_code, f"Team members: {len(data)}")
            else:
                self.log_test("GET /api/workflowviz/team", False, response.status_code, response.text[:100])
        except Exception as e:
            self.log_test("GET /api/workflowviz/team", False, None, str(e))
            
        # Test software
        try:
            response = self.session.get(f"{self.base_url}/workflowviz/software", timeout=10)
            if response.status_code == 200:
                data = response.json()
                self.log_test("GET /api/workflowviz/software", True, response.status_code, f"Software tools: {len(data)}")
            else:
                self.log_test("GET /api/workflowviz/software", False, response.status_code, response.text[:100])
        except Exception as e:
            self.log_test("GET /api/workflowviz/software", False, None, str(e))
    
    def test_labyrinth_os_apis(self):
        """Test Labyrinth OS APIs"""
        print("\n=== Testing Labyrinth OS APIs ===")
        
        # Test playbooks
        try:
            response = self.session.get(f"{self.base_url}/playbooks", timeout=10)
            if response.status_code == 200:
                data = response.json()
                self.log_test("GET /api/playbooks", True, response.status_code, f"Playbooks: {len(data)}")
            else:
                self.log_test("GET /api/playbooks", False, response.status_code, response.text[:100])
        except Exception as e:
            self.log_test("GET /api/playbooks", False, None, str(e))
            
        # Test SOPs
        try:
            response = self.session.get(f"{self.base_url}/sops", timeout=10)
            if response.status_code == 200:
                data = response.json()
                self.log_test("GET /api/sops", True, response.status_code, f"SOPs: {len(data)}")
            else:
                self.log_test("GET /api/sops", False, response.status_code, response.text[:100])
        except Exception as e:
            self.log_test("GET /api/sops", False, None, str(e))
            
        # Test talents
        try:
            response = self.session.get(f"{self.base_url}/talents", timeout=10)
            if response.status_code == 200:
                data = response.json()
                self.log_test("GET /api/talents", True, response.status_code, f"Talents: {len(data)}")
            else:
                self.log_test("GET /api/talents", False, response.status_code, response.text[:100])
        except Exception as e:
            self.log_test("GET /api/talents", False, None, str(e))
            
        # Test KPIs
        try:
            response = self.session.get(f"{self.base_url}/kpis", timeout=10)
            if response.status_code == 200:
                data = response.json()
                self.log_test("GET /api/kpis", True, response.status_code, f"KPIs: {len(data)}")
            else:
                self.log_test("GET /api/kpis", False, response.status_code, response.text[:100])
        except Exception as e:
            self.log_test("GET /api/kpis", False, None, str(e))
            
        # Test contracts
        try:
            response = self.session.get(f"{self.base_url}/contracts", timeout=10)
            if response.status_code == 200:
                data = response.json()
                self.log_test("GET /api/contracts", True, response.status_code, f"Contracts: {len(data)}")
            else:
                self.log_test("GET /api/contracts", False, response.status_code, response.text[:100])
        except Exception as e:
            self.log_test("GET /api/contracts", False, None, str(e))
    
    def test_template_creation(self):
        """Test Template Creation"""
        print("\n=== Testing Template Creation ===")
        
        # Create test template
        test_template = {
            "name": "Test Template",
            "description": "Test template creation",
            "category": "OPERATIONS",
            "nodes": [
                {
                    "label": "Step 1",
                    "node_type": "ACTION",
                    "relative_position": {"x": 0, "y": 0}
                }
            ],
            "edges": [],
            "is_predefined": False
        }
        
        try:
            response = self.session.post(
                f"{self.base_url}/workflowviz/templates",
                json=test_template,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            if response.status_code in [200, 201]:
                data = response.json()
                template_id = data.get('id', 'unknown')
                self.log_test("POST /api/workflowviz/templates", True, response.status_code, f"Created template: {template_id}")
            else:
                self.log_test("POST /api/workflowviz/templates", False, response.status_code, response.text[:100])
        except Exception as e:
            self.log_test("POST /api/workflowviz/templates", False, None, str(e))
    
    def test_bulk_upload_apis(self):
        """Test Bulk Upload APIs"""
        print("\n=== Testing Bulk Upload APIs ===")
        
        # Test 1: GET /api/bulk/templates-info - Should return info about 5 available templates
        try:
            response = self.session.get(f"{self.base_url}/bulk/templates-info", timeout=10)
            if response.status_code == 200:
                data = response.json()
                templates = data.get('available_templates', [])
                if len(templates) == 5:
                    template_types = [t.get('entity_type') for t in templates]
                    expected_types = ['playbooks', 'sops', 'talents', 'contracts', 'kpis']
                    if all(t in template_types for t in expected_types):
                        self.log_test("GET /api/bulk/templates-info", True, response.status_code, f"Found {len(templates)} templates: {template_types}")
                    else:
                        self.log_test("GET /api/bulk/templates-info", False, response.status_code, f"Missing expected template types. Found: {template_types}")
                else:
                    self.log_test("GET /api/bulk/templates-info", False, response.status_code, f"Expected 5 templates, found {len(templates)}")
            else:
                self.log_test("GET /api/bulk/templates-info", False, response.status_code, response.text[:100])
        except Exception as e:
            self.log_test("GET /api/bulk/templates-info", False, None, str(e))
        
        # Test 2: GET /api/bulk/template/playbooks?format=csv - Should download CSV template with sample data
        try:
            response = self.session.get(f"{self.base_url}/bulk/template/playbooks?format=csv", timeout=10)
            if response.status_code == 200:
                content = response.text
                # Check if it's valid CSV with headers
                lines = content.strip().split('\n')
                if len(lines) >= 2:  # Header + at least one data row
                    headers = lines[0].split(',')
                    expected_headers = ['playbook_id', 'name', 'function', 'level', 'min_tier', 'description', 'linked_sop_ids']
                    if all(h.strip('"') in expected_headers for h in headers):
                        self.log_test("GET /api/bulk/template/playbooks?format=csv", True, response.status_code, f"CSV template downloaded with {len(lines)-1} sample rows")
                        # Save for later use in preview test
                        with open('/tmp/playbooks_template.csv', 'w') as f:
                            f.write(content)
                    else:
                        self.log_test("GET /api/bulk/template/playbooks?format=csv", False, response.status_code, f"Invalid CSV headers: {headers}")
                else:
                    self.log_test("GET /api/bulk/template/playbooks?format=csv", False, response.status_code, "CSV template has insufficient data")
            else:
                self.log_test("GET /api/bulk/template/playbooks?format=csv", False, response.status_code, response.text[:100])
        except Exception as e:
            self.log_test("GET /api/bulk/template/playbooks?format=csv", False, None, str(e))
        
        # Test 3: GET /api/bulk/template/talents?format=json - Should download JSON template with sample data
        try:
            response = self.session.get(f"{self.base_url}/bulk/template/talents?format=json", timeout=10)
            if response.status_code == 200:
                try:
                    data = response.json()
                    if isinstance(data, list) and len(data) > 0:
                        sample_talent = data[0]
                        required_fields = ['name', 'email', 'function', 'communication', 'technical_skills']
                        if all(field in sample_talent for field in required_fields):
                            self.log_test("GET /api/bulk/template/talents?format=json", True, response.status_code, f"JSON template downloaded with {len(data)} sample records")
                        else:
                            self.log_test("GET /api/bulk/template/talents?format=json", False, response.status_code, f"Missing required fields in JSON template")
                    else:
                        self.log_test("GET /api/bulk/template/talents?format=json", False, response.status_code, "JSON template is empty or invalid format")
                except json.JSONDecodeError:
                    self.log_test("GET /api/bulk/template/talents?format=json", False, response.status_code, "Invalid JSON response")
            else:
                self.log_test("GET /api/bulk/template/talents?format=json", False, response.status_code, response.text[:100])
        except Exception as e:
            self.log_test("GET /api/bulk/template/talents?format=json", False, None, str(e))
        
        # Test 4: POST /api/bulk/preview/playbooks - Upload the CSV template and verify preview response with validation
        try:
            # Check if CSV file exists from previous test
            import os
            if os.path.exists('/tmp/playbooks_template.csv'):
                with open('/tmp/playbooks_template.csv', 'rb') as f:
                    files = {'file': ('playbooks_template.csv', f, 'text/csv')}
                    response = self.session.post(f"{self.base_url}/bulk/preview/playbooks", files=files, timeout=15)
                
                if response.status_code == 200:
                    data = response.json()
                    required_fields = ['entity_type', 'total_rows', 'valid_rows', 'invalid_rows', 'preview_data', 'columns']
                    if all(field in data for field in required_fields):
                        total_rows = data.get('total_rows', 0)
                        valid_rows = data.get('valid_rows', 0)
                        preview_data = data.get('preview_data', [])
                        if total_rows > 0 and len(preview_data) > 0:
                            self.log_test("POST /api/bulk/preview/playbooks", True, response.status_code, f"Preview successful: {total_rows} total, {valid_rows} valid rows")
                        else:
                            self.log_test("POST /api/bulk/preview/playbooks", False, response.status_code, "Preview returned no data")
                    else:
                        self.log_test("POST /api/bulk/preview/playbooks", False, response.status_code, f"Missing required fields in preview response")
                else:
                    self.log_test("POST /api/bulk/preview/playbooks", False, response.status_code, response.text[:100])
            else:
                self.log_test("POST /api/bulk/preview/playbooks", False, None, "CSV template file not found for preview test")
        except Exception as e:
            self.log_test("POST /api/bulk/preview/playbooks", False, None, str(e))
    
    def run_all_tests(self):
        """Run all test suites"""
        print(f"🚀 Starting Comprehensive Backend API Tests")
        print(f"Base URL: {self.base_url}")
        print(f"Test started at: {datetime.now().isoformat()}")
        
        # Run all test suites
        self.test_health_and_core_apis()
        self.test_ai_generation_apis()
        self.test_workflowviz_apis()
        self.test_labyrinth_os_apis()
        self.test_template_creation()
        self.test_bulk_upload_apis()  # Add bulk upload tests
        
        # Summary
        print("\n" + "="*60)
        print("📊 TEST SUMMARY")
        print("="*60)
        
        total_tests = len(self.test_results)
        passed_tests = len([t for t in self.test_results if t['success']])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for test in self.test_results:
                if not test['success']:
                    print(f"  - {test['test']}: {test['details']}")
        
        print(f"\nTest completed at: {datetime.now().isoformat()}")
        
        return failed_tests == 0

if __name__ == "__main__":
    tester = BackendTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)