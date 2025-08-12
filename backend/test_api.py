import requests
import json

BASE_URL = "http://localhost:8000/api/v1"

def test_database_connection():
    """Test database connection"""
    try:
        response = requests.get(f"{BASE_URL}/test/test-connection")
        print("🔍 Testing database connection...")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Error testing database connection: {e}")
        return False

def test_get_users():
    """Test get all users"""
    try:
        response = requests.get(f"{BASE_URL}/users/")
        print("\n👥 Testing get all users...")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Error testing get users: {e}")
        return False

def test_get_user_by_id(user_id=1):
    """Test get user by ID"""
    try:
        response = requests.get(f"{BASE_URL}/users/{user_id}")
        print(f"\n👤 Testing get user by ID {user_id}...")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Error testing get user by ID: {e}")
        return False

def test_get_user_by_username(username="admin"):
    """Test get user by username"""
    try:
        response = requests.get(f"{BASE_URL}/users/username/{username}")
        print(f"\n👤 Testing get user by username '{username}'...")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Error testing get user by username: {e}")
        return False

def test_create_user():
    """Test create new user"""
    try:
        user_data = {
            "username": "testuser",
            "email": "test@example.com",
            "full_name": "Test User",
            "password": "testpassword123",
            "is_active": True,
            "is_admin": False
        }
        response = requests.post(f"{BASE_URL}/users/", json=user_data)
        print("\n➕ Testing create user...")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 201
    except Exception as e:
        print(f"❌ Error testing create user: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 Starting API Tests...")
    print("=" * 50)
    
    # Test database connection
    db_ok = test_database_connection()
    
    if db_ok:
        # Test user endpoints
        test_get_users()
        test_get_user_by_id()
        test_get_user_by_username()
        test_create_user()
        
        print("\n" + "=" * 50)
        print("✅ API tests completed!")
    else:
        print("\n❌ Database connection failed. Please check your database setup.")

if __name__ == "__main__":
    main()
