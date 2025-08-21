#!/usr/bin/env python3
"""
Script untuk debugging holiday detection
"""

import requests
import json
from datetime import datetime, date

def test_holiday_api():
    base_url = "http://localhost:8000"
    
    # Test 1: Get all holidays
    print("=== Test 1: Get all holidays ===")
    resp = requests.get(f"{base_url}/api/settings/holidays/")
    if resp.status_code == 200:
        data = resp.json()
        print(f"Total holidays: {data['count']}")
        for holiday in data['results']:
            print(f"  - {holiday['date']}: {holiday['note']}")
    else:
        print(f"Error: {resp.status_code}")
    
    print()
    
    # Test 2: Test today's date
    today = date.today().isoformat()
    print(f"=== Test 2: Check if today ({today}) is holiday ===")
    resp = requests.get(f"{base_url}/api/settings/holidays/?start={today}&end={today}")
    if resp.status_code == 200:
        data = resp.json()
        is_holiday = data['count'] > 0
        print(f"Today is holiday: {is_holiday}")
        if is_holiday:
            for holiday in data['results']:
                print(f"  - {holiday['date']}: {holiday['note']}")
    else:
        print(f"Error: {resp.status_code}")
    
    print()
    
    # Test 3: Test specific known holiday date
    known_holiday = "2025-08-17"
    print(f"=== Test 3: Check known holiday date ({known_holiday}) ===")
    resp = requests.get(f"{base_url}/api/settings/holidays/?start={known_holiday}&end={known_holiday}")
    if resp.status_code == 200:
        data = resp.json()
        is_holiday = data['count'] > 0
        print(f"{known_holiday} is holiday: {is_holiday}")
        if is_holiday:
            for holiday in data['results']:
                print(f"  - {holiday['date']}: {holiday['note']}")
    else:
        print(f"Error: {resp.status_code}")
    
    print()
    
    # Test 4: Test non-holiday date
    non_holiday = "2025-08-22"
    print(f"=== Test 4: Check non-holiday date ({non_holiday}) ===")
    resp = requests.get(f"{base_url}/api/settings/holidays/?start={non_holiday}&end={non_holiday}")
    if resp.status_code == 200:
        data = resp.json()
        is_holiday = data['count'] > 0
        print(f"{non_holiday} is holiday: {is_holiday}")
        if is_holiday:
            for holiday in data['results']:
                print(f"  - {holiday['date']}: {holiday['note']}")
    else:
        print(f"Error: {resp.status_code}")

if __name__ == "__main__":
    test_holiday_api()
