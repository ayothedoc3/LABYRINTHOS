"""
AI Manager and Communications Tests
Tests for P2 features: AI Manager endpoints for Communications
- GET /api/communications/ai/reminders
- GET /api/communications/ai/escalation-check
- POST /api/communications/ai/summarize/{thread_id}
- POST /api/communications/ai/suggest-response/{thread_id}
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCommunicationsBase:
    """Base tests for Communications module"""
    
    def test_health_check(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✓ Health check passed")
    
    def test_seed_demo_data(self):
        """Seed demo communication data for testing"""
        response = requests.post(f"{BASE_URL}/api/communications/seed-demo")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✓ Seeded demo data: {data.get('message')}")
    
    def test_get_threads(self):
        """Test getting communication threads"""
        response = requests.get(f"{BASE_URL}/api/communications/threads")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0, "Expected at least one thread after seeding"
        print(f"✓ Got {len(data)} threads")
        return data
    
    def test_get_thread_detail(self):
        """Test getting a specific thread"""
        # First get threads
        threads_res = requests.get(f"{BASE_URL}/api/communications/threads")
        threads = threads_res.json()
        if threads:
            thread_id = threads[0].get("id")
            response = requests.get(f"{BASE_URL}/api/communications/threads/{thread_id}")
            assert response.status_code == 200
            data = response.json()
            assert data.get("id") == thread_id
            print(f"✓ Got thread detail: {data.get('title')}")
    
    def test_get_stats(self):
        """Test getting communication stats"""
        response = requests.get(f"{BASE_URL}/api/communications/stats")
        assert response.status_code == 200
        data = response.json()
        assert "total_threads" in data
        assert "open_threads" in data
        assert "total_messages" in data
        print(f"✓ Stats: {data.get('total_threads')} threads, {data.get('total_messages')} messages")


class TestAIManagerReminders:
    """Tests for AI Manager Reminders endpoint"""
    
    def test_get_reminders(self):
        """Test GET /api/communications/ai/reminders"""
        response = requests.get(f"{BASE_URL}/api/communications/ai/reminders")
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "reminders" in data
        assert "total_count" in data
        assert "high_priority_count" in data
        assert "generated_at" in data
        
        assert isinstance(data["reminders"], list)
        assert isinstance(data["total_count"], int)
        assert isinstance(data["high_priority_count"], int)
        
        print(f"✓ Reminders: {data['total_count']} total, {data['high_priority_count']} high priority")
        
        # If there are reminders, verify their structure
        if data["reminders"]:
            reminder = data["reminders"][0]
            assert "thread_id" in reminder
            assert "thread_title" in reminder
            assert "reminder_type" in reminder
            assert "priority" in reminder
            assert "message" in reminder
            assert reminder["priority"] in ["high", "medium", "low"]
            print(f"✓ Reminder structure verified: {reminder.get('thread_title')}")
        
        return data


class TestAIManagerEscalations:
    """Tests for AI Manager Escalation Check endpoint"""
    
    def test_get_escalation_check(self):
        """Test GET /api/communications/ai/escalation-check"""
        response = requests.get(f"{BASE_URL}/api/communications/ai/escalation-check")
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "escalations" in data
        assert "total_flagged" in data
        assert "high_priority" in data
        assert "checked_at" in data
        
        assert isinstance(data["escalations"], list)
        assert isinstance(data["total_flagged"], int)
        assert isinstance(data["high_priority"], int)
        
        print(f"✓ Escalations: {data['total_flagged']} flagged, {data['high_priority']} high priority")
        
        # If there are escalations, verify their structure
        if data["escalations"]:
            escalation = data["escalations"][0]
            assert "thread_id" in escalation
            assert "thread_title" in escalation
            assert "escalation_score" in escalation
            assert "reasons" in escalation
            assert "recommendation" in escalation
            assert "suggested_action" in escalation
            assert isinstance(escalation["reasons"], list)
            print(f"✓ Escalation structure verified: {escalation.get('thread_title')}")
        
        return data


class TestAIManagerSummarize:
    """Tests for AI Manager Thread Summarization endpoint"""
    
    def test_summarize_thread_success(self):
        """Test POST /api/communications/ai/summarize/{thread_id}"""
        # First get a thread with messages
        threads_res = requests.get(f"{BASE_URL}/api/communications/threads")
        threads = threads_res.json()
        
        # Find thread-1 which has demo messages
        thread_id = "thread-1"
        
        response = requests.post(f"{BASE_URL}/api/communications/ai/summarize/{thread_id}")
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "thread_id" in data
        assert data["thread_id"] == thread_id
        assert "summary" in data
        
        # Summary should be a non-empty string
        assert isinstance(data["summary"], str)
        assert len(data["summary"]) > 0
        
        print(f"✓ Summary generated for thread {thread_id}")
        print(f"  Summary: {data['summary'][:100]}...")
        
        # Check for optional fields that AI should return
        if "key_points" in data:
            assert isinstance(data["key_points"], list)
            print(f"  Key points: {len(data.get('key_points', []))} items")
        
        if "action_items" in data:
            assert isinstance(data["action_items"], list)
            print(f"  Action items: {len(data.get('action_items', []))} items")
        
        return data
    
    def test_summarize_nonexistent_thread(self):
        """Test summarize with non-existent thread returns 404"""
        response = requests.post(f"{BASE_URL}/api/communications/ai/summarize/nonexistent-thread-xyz")
        assert response.status_code == 404
        print("✓ Non-existent thread returns 404")
    
    def test_summarize_empty_thread(self):
        """Test summarize with thread that has no messages"""
        # Create a new thread without messages
        new_thread = {
            "title": "Test Empty Thread",
            "thread_type": "INTERNAL",
            "description": "Thread for testing empty summarization"
        }
        create_res = requests.post(
            f"{BASE_URL}/api/communications/threads?created_by=test_user",
            json=new_thread
        )
        
        if create_res.status_code == 200:
            thread_id = create_res.json().get("id")
            
            # Try to summarize empty thread
            response = requests.post(f"{BASE_URL}/api/communications/ai/summarize/{thread_id}")
            assert response.status_code == 200
            data = response.json()
            
            # Should return a message about no messages
            assert "summary" in data
            print(f"✓ Empty thread summary: {data['summary']}")


class TestAIManagerSuggestResponse:
    """Tests for AI Manager Response Suggestions endpoint"""
    
    def test_suggest_response_success(self):
        """Test POST /api/communications/ai/suggest-response/{thread_id}"""
        # Use thread-1 which has demo messages
        thread_id = "thread-1"
        
        response = requests.post(f"{BASE_URL}/api/communications/ai/suggest-response/{thread_id}")
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "thread_id" in data
        assert data["thread_id"] == thread_id
        
        # Should have suggestions array
        if "suggestions" in data:
            assert isinstance(data["suggestions"], list)
            print(f"✓ Got {len(data['suggestions'])} response suggestions")
            
            # Verify suggestion structure
            if data["suggestions"]:
                suggestion = data["suggestions"][0]
                assert "tone" in suggestion or "response" in suggestion
                print(f"  First suggestion tone: {suggestion.get('tone', 'N/A')}")
                print(f"  Response preview: {suggestion.get('response', '')[:80]}...")
        
        return data
    
    def test_suggest_response_nonexistent_thread(self):
        """Test suggest-response with non-existent thread returns 404"""
        response = requests.post(f"{BASE_URL}/api/communications/ai/suggest-response/nonexistent-thread-xyz")
        assert response.status_code == 404
        print("✓ Non-existent thread returns 404")


class TestPlaybookEngineAutoRefresh:
    """Tests for Playbook Engine Auto-Refresh toggle"""
    
    def test_playbook_plans_endpoint(self):
        """Test that playbook plans endpoint works"""
        response = requests.get(f"{BASE_URL}/api/playbook-engine/plans")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Playbook plans endpoint works: {len(data)} plans")
    
    def test_playbook_analytics_endpoint(self):
        """Test that playbook analytics endpoint works"""
        response = requests.get(f"{BASE_URL}/api/playbook-engine/analytics/summary")
        assert response.status_code == 200
        data = response.json()
        assert "total_plans" in data
        print(f"✓ Playbook analytics works: {data.get('total_plans')} total plans")


class TestCommunicationsIntegration:
    """Integration tests for Communications module"""
    
    def test_full_communication_flow(self):
        """Test complete communication flow"""
        # 1. Seed demo data
        seed_res = requests.post(f"{BASE_URL}/api/communications/seed-demo")
        assert seed_res.status_code == 200
        print("✓ Step 1: Seeded demo data")
        
        # 2. Get threads
        threads_res = requests.get(f"{BASE_URL}/api/communications/threads")
        assert threads_res.status_code == 200
        threads = threads_res.json()
        assert len(threads) > 0
        print(f"✓ Step 2: Got {len(threads)} threads")
        
        # 3. Get reminders
        reminders_res = requests.get(f"{BASE_URL}/api/communications/ai/reminders")
        assert reminders_res.status_code == 200
        print(f"✓ Step 3: Got reminders")
        
        # 4. Get escalations
        escalations_res = requests.get(f"{BASE_URL}/api/communications/ai/escalation-check")
        assert escalations_res.status_code == 200
        print(f"✓ Step 4: Got escalation check")
        
        # 5. Summarize a thread
        thread_id = "thread-1"
        summary_res = requests.post(f"{BASE_URL}/api/communications/ai/summarize/{thread_id}")
        assert summary_res.status_code == 200
        print(f"✓ Step 5: Generated summary for {thread_id}")
        
        # 6. Get response suggestions
        suggest_res = requests.post(f"{BASE_URL}/api/communications/ai/suggest-response/{thread_id}")
        assert suggest_res.status_code == 200
        print(f"✓ Step 6: Got response suggestions for {thread_id}")
        
        print("\n✓ Full communication flow completed successfully!")


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
