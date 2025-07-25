import requests
import json

# Configuration
BASE_URL = 'http://localhost:8000/api/'
LOGIN_URL = f'{BASE_URL}login/'
BULK_UPLOAD_URL = f'{BASE_URL}bulk/patients/upload/'
TEST_AUTH_URL = f'{BASE_URL}auth/test/'

def login_and_test(email, password):
    """Login with credentials and test bulk upload with a sample file"""
    print(f"\n=== Testing login for {email} ===")
    
    # Step 1: Login to get the token
    login_data = {
        'email': email,
        'password': password
    }
    
    try:
        print("Attempting login...")
        login_response = requests.post(LOGIN_URL, json=login_data)
        
        if login_response.status_code != 200:
            print(f"Login failed: {login_response.status_code} - {login_response.text}")
            return
        
        login_result = login_response.json()
        print("Login successful!")
        print(f"User: {login_result.get('name')} ({login_result.get('role')})")
        
        access_token = login_result.get('access')
        if not access_token:
            print("No access token in response")
            return
        
        # Step 2: Test the authentication endpoint first
        print("\nTesting authentication endpoint...")
        headers = {
            'Authorization': f'Bearer {access_token}'
        }
        
        auth_test_response = requests.get(TEST_AUTH_URL, headers=headers)
        print(f"Auth test response status: {auth_test_response.status_code}")
        
        if auth_test_response.status_code == 200:
            auth_data = auth_test_response.json()
            print(f"✓ Authentication working! User role: {auth_data['user']['role']}")
        else:
            print(f"✗ Authentication test failed: {auth_test_response.text}")
            return
        
        # Step 3: Create a small test CSV in memory
        csv_content = "name,email,phone,date_of_birth,gender,address,marital_status\n"
        csv_content += "Test User,test@example.com,+1234567890,1990-01-01,male,123 Test St,single"
        
        # Step 4: Test bulk upload with the token
        print("\nTesting bulk upload...")
        headers = {
            'Authorization': f'Bearer {access_token}'
        }
        
        files = {
            'file': ('test_patients.csv', csv_content.encode('utf-8'), 'text/csv')
        }
        
        upload_response = requests.post(BULK_UPLOAD_URL, headers=headers, files=files)
        
        print(f"Upload response status: {upload_response.status_code}")
        print(f"Response content: {upload_response.text}")
        
        if upload_response.status_code == 201:
            print("✓ SUCCESS: Bulk upload worked correctly!")
        elif upload_response.status_code == 403:
            print("✗ ERROR: Permission denied. Check if the user has the correct role.")
        elif upload_response.status_code == 401:
            print("✗ ERROR: Authentication failed. Token might be invalid.")
        else:
            print(f"✗ ERROR: Unexpected status code {upload_response.status_code}")
    
    except Exception as e:
        print(f"Error during test: {str(e)}")

# Run tests with different user credentials
if __name__ == "__main__":
    # Replace these with actual credentials
    print("=== BULK UPLOAD PERMISSION TEST ===")
    print("This script will test JWT authentication and bulk upload permissions")
    
    # You can add more test users here as needed
    test_users = [
        {'email': 'admin@example.com', 'password': 'admin123', 'expected_role': 'admin'},
        {'email': 'doctor@example.com', 'password': 'doctor123', 'expected_role': 'doctor'},
        {'email': 'receptionist@example.com', 'password': 'receptionist123', 'expected_role': 'receptionist'}
    ]
    
    for user in test_users:
        login_and_test(user['email'], user['password'])
        print("\n" + "-"*50)
