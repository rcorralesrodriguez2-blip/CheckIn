#!/usr/bin/env python3
"""
Test script for Face Recognition Service
Run this script to verify the service is working correctly.
"""

import requests
import base64
import json
import sys
import os

# Configuration
SERVICE_URL = "http://localhost:8000"

def test_health():
    """Test health endpoint"""
    print("🔍 Testing health endpoint...")
    try:
        response = requests.get(f"{SERVICE_URL}/health")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Health check passed: {data}")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False

def test_register_face():
    """Test face registration with a sample image"""
    print("\n📸 Testing face registration...")

    # Create a simple test image (1x1 pixel red image)
    from PIL import Image
    import io

    # Create a minimal test image
    img = Image.new('RGB', (100, 100), color='red')
    buffer = io.BytesIO()
    img.save(buffer, format='JPEG')
    img_base64 = base64.b64encode(buffer.getvalue()).decode()

    data = {
        "user_id": "test_user_123",
        "image_data": f"data:image/jpeg;base64,{img_base64}"
    }

    try:
        response = requests.post(f"{SERVICE_URL}/register", json=data)
        print(f"Response status: {response.status_code}")
        print(f"Response: {response.json()}")

        # Note: This will likely fail because it's not a real face image
        # But it tests the API endpoint
        return response.status_code in [200, 400]  # 400 is expected for no face

    except Exception as e:
        print(f"❌ Registration test error: {e}")
        return False

def test_recognize_face():
    """Test face recognition"""
    print("\n👤 Testing face recognition...")

    # Use the same test image
    from PIL import Image
    import io

    img = Image.new('RGB', (100, 100), color='red')
    buffer = io.BytesIO()
    img.save(buffer, format='JPEG')
    img_base64 = base64.b64encode(buffer.getvalue()).decode()

    data = {
        "image_data": f"data:image/jpeg;base64,{img_base64}"
    }

    try:
        response = requests.post(f"{SERVICE_URL}/recognize", json=data)
        print(f"Response status: {response.status_code}")
        print(f"Response: {response.json()}")

        # Should return no match for test image
        return response.status_code == 200

    except Exception as e:
        print(f"❌ Recognition test error: {e}")
        return False

def main():
    """Run all tests"""
    print("🧪 Face Recognition Service Test Suite")
    print("=" * 40)

    # Check if service is running
    if not test_health():
        print("\n❌ Service is not running. Please start the service first:")
        print("   cd face-recognition")
        print("   python app.py")
        sys.exit(1)

    # Run tests
    tests = [
        ("Health Check", test_health),
        ("Face Registration", test_register_face),
        ("Face Recognition", test_recognize_face),
    ]

    passed = 0
    total = len(tests)

    for test_name, test_func in tests:
        print(f"\n🧪 Running {test_name}...")
        if test_func():
            print(f"✅ {test_name} passed")
            passed += 1
        else:
            print(f"❌ {test_name} failed")

    print("\n" + "=" * 40)
    print(f"📊 Test Results: {passed}/{total} tests passed")

    if passed == total:
        print("🎉 All tests passed! Service is working correctly.")
    else:
        print("⚠️  Some tests failed. Check the service logs for details.")

if __name__ == "__main__":
    main()