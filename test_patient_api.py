import requests
import json

# Test the patient API endpoints
BASE_URL = "http://127.0.0.1:8000/api"

def test_patient_endpoints():
    """Test the patient CRUD operations"""
    
    # Test GET patients
    print("Testing GET /patients/")
    try:
        response = requests.get(f"{BASE_URL}/patients/")
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            patients = response.json()
            print(f"Found {len(patients)} patients")
            if patients:
                patient_id = patients[0]['id']
                print(f"Testing with patient ID: {patient_id}")
                
                # Test GET specific patient
                print(f"\nTesting GET /patients/{patient_id}/")
                detail_response = requests.get(f"{BASE_URL}/patients/{patient_id}/")
                print(f"Status: {detail_response.status_code}")
                
                if detail_response.status_code == 200:
                    patient_data = detail_response.json()
                    print(f"Patient: {patient_data.get('name', 'Unknown')}")
                    
                    # Test PUT (update) patient
                    print(f"\nTesting PUT /patients/{patient_id}/")
                    updated_data = patient_data.copy()
                    updated_data['phone'] = "555-0123-TEST"  # Change phone for test
                    
                    update_response = requests.put(
                        f"{BASE_URL}/patients/{patient_id}/",
                        json=updated_data,
                        headers={'Content-Type': 'application/json'}
                    )
                    print(f"Update Status: {update_response.status_code}")
                    
                    if update_response.status_code == 200:
                        print("✅ Update successful")
                        updated_patient = update_response.json()
                        print(f"Updated phone: {updated_patient.get('phone')}")
                    else:
                        print(f"❌ Update failed: {update_response.text}")
                        
        else:
            print(f"❌ Failed to get patients: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Connection error - Make sure the Django server is running on http://127.0.0.1:8000")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_patient_endpoints()
