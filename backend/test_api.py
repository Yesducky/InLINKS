#!/usr/bin/env python3
"""
Test script for InLINKS Flask API
This script tests the basic functionality of the API endpoints
"""

import requests
import json

BASE_URL = "http://localhost:5000"

def test_api():
    print("Testing InLINKS Flask API...")

    # Test 1: Register a new user
    print("\n1. Testing user registration...")
    register_data = {
        "username": "admin",
        "password": "admin123",
        "user_type_id": "UT001"
    }

    response = requests.post(f"{BASE_URL}/auth/register", json=register_data)
    print(f"Registration response: {response.status_code}")
    if response.status_code == 201:
        print("✓ User registration successful")
    else:
        print(f"✗ Registration failed: {response.json()}")

    # Test 2: Login
    print("\n2. Testing user login...")
    login_data = {
        "username": "admin",
        "password": "admin123"
    }

    response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
    print(f"Login response: {response.status_code}")

    if response.status_code == 200:
        auth_data = response.json()
        token = auth_data['access_token']
        print("✓ Login successful")
        print(f"Token: {token[:50]}...")

        headers = {"Authorization": f"Bearer {token}"}

        # Test 3: Initialize sample data
        print("\n3. Initializing sample data...")
        response = requests.post(f"{BASE_URL}/api/init_sample_data", headers=headers)
        print(f"Sample data response: {response.status_code}")
        if response.status_code == 200:
            print("✓ Sample data initialized")

        # Test 4: Get dashboard stats
        print("\n4. Testing dashboard...")
        response = requests.get(f"{BASE_URL}/api/dashboard", headers=headers)
        print(f"Dashboard response: {response.status_code}")
        if response.status_code == 200:
            dashboard_data = response.json()
            print(f"✓ Dashboard data: {json.dumps(dashboard_data, indent=2)}")

        # Test 5: Create a material type
        print("\n5. Testing material type creation...")
        material_data = {
            "material_name": "Fiber Optic Cable",
            "material_unit": "meter"
        }
        response = requests.post(f"{BASE_URL}/api/material_types", json=material_data, headers=headers)
        print(f"Material type creation: {response.status_code}")
        if response.status_code == 201:
            print("✓ Material type created")

        # Test 6: Get all material types
        print("\n6. Testing get material types...")
        response = requests.get(f"{BASE_URL}/api/material_types", headers=headers)
        print(f"Get material types: {response.status_code}")
        if response.status_code == 200:
            materials = response.json()
            print(f"✓ Found {len(materials)} material types")
            for material in materials:
                print(f"  - {material['id']}: {material['material_name']} ({material['material_unit']})")

        # Test 7: Search functionality
        print("\n7. Testing search...")
        response = requests.get(f"{BASE_URL}/api/search?q=Cable", headers=headers)
        print(f"Search response: {response.status_code}")
        if response.status_code == 200:
            search_results = response.json()
            print(f"✓ Search results: {json.dumps(search_results, indent=2)}")

        print("\n✓ All tests completed!")

    else:
        print(f"✗ Login failed: {response.json()}")

if __name__ == "__main__":
    test_api()
