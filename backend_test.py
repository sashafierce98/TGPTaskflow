import requests
import sys
import json
from datetime import datetime, timezone, timedelta
import uuid

class KanbanAPITester:
    def __init__(self, base_url="https://tgp-taskflow.preview.emergentagent.com"):
        self.base_url = base_url
        self.session_token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_board_id = None
        self.test_column_id = None
        self.test_card_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.session_token:
            test_headers['Authorization'] = f'Bearer {self.session_token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def setup_test_user(self):
        """Use existing admin test user"""
        print("\n🔧 Using existing admin test user...")
        
        # Use the admin user we created earlier
        self.user_id = "test-admin-1767437643121"
        self.session_token = "test_session_1767437643121"
        
        print(f"✅ Using admin user: {self.user_id}")
        print(f"✅ Session token: {self.session_token}")
        return True

    def cleanup_test_data(self):
        """Clean up test data from MongoDB"""
        print("\n🧹 Cleaning up test data...")
        try:
            from pymongo import MongoClient
            client = MongoClient("mongodb://localhost:27017")
            db = client["test_database"]
            
            # Clean up test data
            db.users.delete_many({"email": {"$regex": "test\\.user\\."}})
            db.user_sessions.delete_many({"session_token": {"$regex": "test_session"}})
            db.boards.delete_many({"name": {"$regex": "Test Board"}})
            db.columns.delete_many({"board_id": {"$regex": "board_test"}})
            db.cards.delete_many({"board_id": {"$regex": "board_test"}})
            
            client.close()
            print("✅ Test data cleaned up")
        except Exception as e:
            print(f"❌ Failed to cleanup: {e}")

    def test_root_endpoint(self):
        """Test root API endpoint"""
        success, response = self.run_test(
            "Root API Endpoint",
            "GET",
            "api/",
            200
        )
        return success

    def test_auth_me(self):
        """Test authentication endpoint"""
        success, response = self.run_test(
            "Auth Me",
            "GET",
            "api/auth/me",
            200
        )
        return success

    def test_create_board(self):
        """Test board creation"""
        board_data = {
            "name": f"Test Board {datetime.now().strftime('%H%M%S')}",
            "description": "Test board for API testing",
            "is_template": False
        }
        
        success, response = self.run_test(
            "Create Board",
            "POST",
            "api/boards",
            200,
            data=board_data
        )
        
        if success and 'board_id' in response:
            self.test_board_id = response['board_id']
            print(f"   Board ID: {self.test_board_id}")
        
        return success

    def test_get_boards(self):
        """Test getting user boards"""
        success, response = self.run_test(
            "Get Boards",
            "GET",
            "api/boards",
            200
        )
        return success

    def test_get_board_details(self):
        """Test getting specific board details"""
        if not self.test_board_id:
            print("❌ No test board ID available")
            return False
            
        success, response = self.run_test(
            "Get Board Details",
            "GET",
            f"api/boards/{self.test_board_id}",
            200
        )
        return success

    def test_get_columns(self):
        """Test getting board columns"""
        if not self.test_board_id:
            print("❌ No test board ID available")
            return False
            
        success, response = self.run_test(
            "Get Columns",
            "GET",
            f"api/boards/{self.test_board_id}/columns",
            200
        )
        
        if success and response and len(response) > 0:
            self.test_column_id = response[0]['column_id']
            print(f"   Column ID: {self.test_column_id}")
        
        return success

    def test_create_card(self):
        """Test card creation"""
        if not self.test_board_id or not self.test_column_id:
            print("❌ No test board/column ID available")
            return False
            
        card_data = {
            "title": f"Test Card {datetime.now().strftime('%H%M%S')}",
            "description": "Test card for API testing",
            "priority": "high",
            "due_date": (datetime.now() + timedelta(days=7)).isoformat()
        }
        
        success, response = self.run_test(
            "Create Card",
            "POST",
            f"api/boards/{self.test_board_id}/columns/{self.test_column_id}/cards",
            201,
            data=card_data
        )
        
        if success and 'card_id' in response:
            self.test_card_id = response['card_id']
            print(f"   Card ID: {self.test_card_id}")
        
        return success

    def test_get_cards(self):
        """Test getting board cards"""
        if not self.test_board_id:
            print("❌ No test board ID available")
            return False
            
        success, response = self.run_test(
            "Get Cards",
            "GET",
            f"api/boards/{self.test_board_id}/cards",
            200
        )
        return success

    def test_update_card(self):
        """Test card update"""
        if not self.test_card_id:
            print("❌ No test card ID available")
            return False
            
        update_data = {
            "title": "Updated Test Card",
            "priority": "low"
        }
        
        success, response = self.run_test(
            "Update Card",
            "PUT",
            f"api/cards/{self.test_card_id}",
            200,
            data=update_data
        )
        return success

    def test_notifications(self):
        """Test notifications endpoint"""
        success, response = self.run_test(
            "Get Notifications",
            "GET",
            "api/notifications",
            200
        )
        return success

    def test_admin_analytics(self):
        """Test admin analytics (may fail if user is not admin)"""
        success, response = self.run_test(
            "Admin Analytics",
            "GET",
            "api/admin/analytics",
            200  # Will be 403 if not admin, but that's expected
        )
        return success

    def test_admin_users(self):
        """Test admin users endpoint (may fail if user is not admin)"""
        success, response = self.run_test(
            "Admin Users",
            "GET",
            "api/admin/users",
            200  # Will be 403 if not admin, but that's expected
        )
        return success

def main():
    print("🚀 Starting TGP Bioplastics Kanban API Tests")
    print("=" * 50)
    
    tester = KanbanAPITester()
    
    # Setup test user
    if not tester.setup_test_user():
        print("❌ Failed to setup test user, exiting")
        return 1
    
    # Run tests in order
    tests = [
        tester.test_root_endpoint,
        tester.test_auth_me,
        tester.test_get_boards,
        tester.test_create_board,
        tester.test_get_board_details,
        tester.test_get_columns,
        tester.test_create_card,
        tester.test_get_cards,
        tester.test_update_card,
        tester.test_notifications,
        tester.test_admin_analytics,
        tester.test_admin_users
    ]
    
    for test in tests:
        try:
            test()
        except Exception as e:
            print(f"❌ Test failed with exception: {e}")
    
    # Cleanup
    tester.cleanup_test_data()
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Tests completed: {tester.tests_passed}/{tester.tests_run}")
    print(f"Success rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print("⚠️  Some tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())