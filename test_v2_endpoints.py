#!/usr/bin/env python3
"""
Simple test script for v2 API endpoints
Usage: python test_v2_endpoints.py
"""

import json
import urllib.request
import urllib.error
from datetime import date

BASE_URL = 'http://localhost:8000/api/v2'

def http_request(method, path, data=None, headers=None):
    """Make HTTP request with proper error handling"""
    url = f"{BASE_URL}{path}"
    headers = headers or {}
    
    if data and isinstance(data, dict):
        data = json.dumps(data).encode('utf-8')
        headers['Content-Type'] = 'application/json'
    
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            return response.status, response.read(), dict(response.headers)
    except urllib.error.HTTPError as e:
        return e.code, e.read(), dict(e.headers)
    except Exception as e:
        return None, str(e).encode(), {}

def test_endpoint(method, path, data=None, headers=None, expected_status=200):
    """Test a single endpoint and print results"""
    status, body, response_headers = http_request(method, path, data, headers)
    
    status_symbol = "✓" if status == expected_status else "✗"
    print(f"{status_symbol} {method} {path} -> {status} (expected {expected_status})")
    
    if status != expected_status:
        print(f"   Response: {body[:200].decode('utf-8', errors='ignore')}")
    
    return status, body, response_headers

def main():
    """Run all v2 API endpoint tests"""
    print("🚀 Testing v2 API Endpoints")
    print("=" * 50)
    
    # Test public endpoints
    print("\n📋 Public Endpoints:")
    test_endpoint('GET', '/core/health')
    test_endpoint('GET', '/users/check', expected_status=400)  # Missing username param
    test_endpoint('GET', '/users/csrf-token')
    
    # Test authentication
    print("\n🔐 Authentication:")
    login_data = {'username': 'admin', 'password': 'admin123'}
    status, body, headers = test_endpoint('POST', '/users/auth/login', data=login_data)
    
    access_token = None
    if status == 200:
        try:
            tokens = json.loads(body.decode())
            access_token = tokens.get('access')
            print(f"   ✓ JWT token obtained: {access_token[:20]}...")
        except:
            print("   ✗ Failed to parse JWT tokens")
    
    if not access_token:
        print("❌ Cannot continue without authentication token")
        return
    
    auth_headers = {'Authorization': f'Bearer {access_token}'}
    
    # Test protected endpoints
    print("\n👤 User Management:")
    test_endpoint('GET', '/users/me', headers=auth_headers)
    test_endpoint('GET', '/users/list', headers=auth_headers)
    test_endpoint('GET', '/users/groups', headers=auth_headers)
    
    print("\n👥 Employee Management:")
    test_endpoint('GET', '/employees/employees', headers=auth_headers)
    test_endpoint('GET', '/employees/divisions', headers=auth_headers)
    test_endpoint('GET', '/employees/positions', headers=auth_headers)
    
    print("\n📅 Attendance:")
    test_endpoint('GET', '/attendance/attendance', headers=auth_headers)
    test_endpoint('GET', '/attendance/supervisor/team-attendance', headers=auth_headers)
    
    print("\n⏰ Overtime:")
    test_endpoint('GET', '/overtime/overtime', headers=auth_headers)
    test_endpoint('GET', '/overtime/monthly-summary', headers=auth_headers)
    
    print("\n📊 Export Endpoints (may return 404 if no data):")
    month = date.today().strftime('%Y-%m')
    test_endpoint('GET', f'/overtime/overtime/export_monthly_pdf?month={month}', 
                  headers=auth_headers, expected_status=404)
    test_endpoint('GET', '/overtime/overtime/export_list_pdf', 
                  headers=auth_headers, expected_status=404)
    test_endpoint('GET', '/attendance/supervisor/team-attendance/pdf', 
                  headers=auth_headers)
    
    print("\n⚙️  Settings:")
    test_endpoint('GET', '/settings/work-settings', headers=auth_headers)
    test_endpoint('GET', '/settings/holidays', headers=auth_headers)
    
    print("\n📝 Corrections & Reports:")
    test_endpoint('GET', '/corrections/corrections', headers=auth_headers)
    test_endpoint('GET', '/reporting/reports', headers=auth_headers)
    
    print("\n🔒 Logout:")
    test_endpoint('POST', '/users/logout', headers=auth_headers)
    
    print("\n✅ v2 API endpoint testing completed!")
    print("Note: 404 responses for export endpoints are expected when no data exists.")

if __name__ == '__main__':
    main()
