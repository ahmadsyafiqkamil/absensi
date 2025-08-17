#!/usr/bin/env python3
"""
Test script untuk memverifikasi permission approval sudah benar
"""

import requests
import json

# Konfigurasi
BASE_URL = "http://localhost:8000"
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"
SUPERVISOR_USERNAME = "supervisor"  # Ganti dengan username supervisor yang ada
SUPERVISOR_PASSWORD = "supervisor123"  # Ganti dengan password supervisor yang ada

def get_auth_token(username, password):
    """Get JWT token untuk user"""
    url = f"{BASE_URL}/api/auth/login/"
    data = {
        "username": username,
        "password": password
    }
    
    try:
        response = requests.post(url, json=data)
        if response.status_code == 200:
            return response.json().get('access')
        else:
            print(f"Login failed for {username}: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"Error during login for {username}: {e}")
        return None

def test_approval_permission(username, password, description):
    """Test permission untuk approval"""
    print(f"\n🔐 Testing {description}...")
    
    token = get_auth_token(username, password)
    if not token:
        print(f"❌ Failed to get token for {username}")
        return False
    
    print(f"✅ Got token: {token[:20]}...")
    
    # Test 1: GET attendance corrections (should work for both)
    print(f"\n📋 Testing GET /api/attendance-corrections/...")
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.get(f"{BASE_URL}/api/attendance-corrections/", headers=headers)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Response: {len(data) if isinstance(data, list) else 'object'} items")
        else:
            print(f"   Error: {response.text[:100]}...")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 2: POST approve (should work for admin, work for supervisor with new permission)
    print(f"\n✅ Testing POST /api/attendance-corrections/1/approve...")
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/attendance-corrections/1/approve", 
            headers=headers,
            json={"decision_note": "Test approval"}
        )
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            print(f"   ✅ Approval successful!")
        elif response.status_code == 403:
            print(f"   ❌ Forbidden - Permission denied")
        elif response.status_code == 404:
            print(f"   ⚠️  Not found - Correction ID 1 doesn't exist (this is expected)")
        else:
            print(f"   ⚠️  Unexpected status: {response.text[:100]}...")
            
    except Exception as e:
        print(f"   Error: {e}")
    
    return True

def main():
    print("🧪 Testing Approval Permission Fix")
    print("=" * 50)
    
    # Test admin
    test_approval_permission(ADMIN_USERNAME, ADMIN_PASSWORD, "Admin User")
    
    # Test supervisor
    test_approval_permission(SUPERVISOR_USERNAME, SUPERVISOR_PASSWORD, "Supervisor User")
    
    print("\n📊 Test Summary:")
    print("=" * 50)
    print("✅ Admin should have full access")
    print("✅ Supervisor should now be able to approve/reject")
    print("⚠️  If supervisor still gets 403, check username/password")
    print("💡 Make sure to test with actual supervisor account")

if __name__ == "__main__":
    main()
