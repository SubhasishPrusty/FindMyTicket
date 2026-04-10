"""Comprehensive backend API tests for Find My Tickets

Tests cover:
- Auth: register, login, me, logout
- Tickets: CRUD operations with persistence verification
- Flight status: mocked API response
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ['EXPO_PUBLIC_BACKEND_URL'].rstrip('/')

# Test data
TEST_USER_PHONE = f"TEST_{uuid.uuid4().hex[:8]}"
TEST_USER_PIN = "123456"
TEST_USER_NAME = "Test User"

DEMO_USER_PHONE = "9999999999"
DEMO_USER_PIN = "123456"

class TestAuth:
    """Authentication endpoint tests"""
    
    def test_register_success(self, api_client):
        """Test user registration with valid data"""
        response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "name": TEST_USER_NAME,
            "phone": TEST_USER_PHONE,
            "pin": TEST_USER_PIN
        })
        print(f"Register response status: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        assert data["user"]["name"] == TEST_USER_NAME
        assert data["user"]["phone"] == TEST_USER_PHONE
        assert "user_id" in data["user"]
        print(f"✓ Registration successful for {TEST_USER_PHONE}")
    
    def test_register_duplicate_phone(self, api_client):
        """Test registration with duplicate phone number"""
        response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Another User",
            "phone": TEST_USER_PHONE,
            "pin": "654321"
        })
        print(f"Duplicate register response status: {response.status_code}")
        assert response.status_code == 400, "Should reject duplicate phone"
        assert "already registered" in response.json()["detail"].lower()
        print("✓ Duplicate phone rejected correctly")
    
    def test_register_invalid_pin(self, api_client):
        """Test registration with invalid PIN"""
        response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Test User",
            "phone": f"TEST_{uuid.uuid4().hex[:8]}",
            "pin": "123"  # Too short
        })
        print(f"Invalid PIN response status: {response.status_code}")
        assert response.status_code == 400, "Should reject invalid PIN"
        print("✓ Invalid PIN rejected correctly")
    
    def test_login_demo_user(self, api_client):
        """Test login with demo user credentials"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "phone": DEMO_USER_PHONE,
            "pin": DEMO_USER_PIN
        })
        print(f"Demo login response status: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        assert data["user"]["phone"] == DEMO_USER_PHONE
        assert data["user"]["name"] == "Demo User"
        print(f"✓ Demo user login successful")
        return data["token"]
    
    def test_login_invalid_credentials(self, api_client):
        """Test login with wrong PIN"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "phone": DEMO_USER_PHONE,
            "pin": "000000"
        })
        print(f"Invalid login response status: {response.status_code}")
        assert response.status_code == 401, "Should reject invalid credentials"
        print("✓ Invalid credentials rejected correctly")
    
    def test_get_me_authenticated(self, api_client):
        """Test /api/auth/me with valid token"""
        # First login to get token
        login_response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "phone": DEMO_USER_PHONE,
            "pin": DEMO_USER_PIN
        })
        token = login_response.json()["token"]
        
        # Test /me endpoint
        response = api_client.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        print(f"Get me response status: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "user" in data
        assert data["user"]["phone"] == DEMO_USER_PHONE
        print("✓ /api/auth/me working correctly")
    
    def test_get_me_unauthenticated(self, api_client):
        """Test /api/auth/me without token"""
        response = api_client.get(f"{BASE_URL}/api/auth/me")
        print(f"Unauthenticated me response status: {response.status_code}")
        assert response.status_code == 401, "Should reject unauthenticated request"
        print("✓ Unauthenticated request rejected correctly")


class TestTickets:
    """Ticket CRUD endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self, api_client):
        """Login and get token before each test"""
        login_response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "phone": DEMO_USER_PHONE,
            "pin": DEMO_USER_PIN
        })
        self.token = login_response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.api_client = api_client
    
    def test_get_tickets_list(self):
        """Test GET /api/tickets returns ticket list"""
        response = self.api_client.get(
            f"{BASE_URL}/api/tickets",
            headers=self.headers
        )
        print(f"Get tickets response status: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "tickets" in data, "Response should contain tickets array"
        assert isinstance(data["tickets"], list), "Tickets should be a list"
        assert len(data["tickets"]) >= 3, "Demo user should have at least 3 sample tickets"
        
        # Verify ticket structure
        ticket = data["tickets"][0]
        required_fields = ["ticket_id", "pnr", "airline", "flight_number", 
                          "origin_code", "destination_code", "departure_date"]
        for field in required_fields:
            assert field in ticket, f"Ticket should have {field} field"
        
        print(f"✓ Retrieved {len(data['tickets'])} tickets successfully")
    
    def test_create_ticket_and_verify_persistence(self):
        """Test POST /api/tickets creates ticket and verify with GET"""
        ticket_data = {
            "pnr": f"TEST{uuid.uuid4().hex[:6].upper()}",
            "airline": "Test Airways",
            "flight_number": "TA123",
            "origin_code": "DEL",
            "origin_city": "Delhi",
            "destination_code": "BOM",
            "destination_city": "Mumbai",
            "departure_date": "2026-05-15",
            "departure_time": "10:00",
            "arrival_date": "2026-05-15",
            "arrival_time": "12:00",
            "passengers": [{"name": "Test Passenger", "seat": "12A"}],
            "gate": "A1",
            "terminal": "T2",
            "seat": "12A",
            "booking_class": "Economy",
            "status": "confirmed"
        }
        
        # Create ticket
        create_response = self.api_client.post(
            f"{BASE_URL}/api/tickets",
            json=ticket_data,
            headers=self.headers
        )
        print(f"Create ticket response status: {create_response.status_code}")
        assert create_response.status_code == 200, f"Expected 200, got {create_response.status_code}: {create_response.text}"
        
        created_ticket = create_response.json()["ticket"]
        assert created_ticket["pnr"] == ticket_data["pnr"]
        assert created_ticket["airline"] == ticket_data["airline"]
        assert "ticket_id" in created_ticket
        ticket_id = created_ticket["ticket_id"]
        print(f"✓ Ticket created with ID: {ticket_id}")
        
        # Verify persistence with GET
        get_response = self.api_client.get(
            f"{BASE_URL}/api/tickets/{ticket_id}",
            headers=self.headers
        )
        assert get_response.status_code == 200, "Should retrieve created ticket"
        
        retrieved_ticket = get_response.json()["ticket"]
        assert retrieved_ticket["ticket_id"] == ticket_id
        assert retrieved_ticket["pnr"] == ticket_data["pnr"]
        assert retrieved_ticket["airline"] == ticket_data["airline"]
        print(f"✓ Ticket persistence verified via GET")
        
        # Cleanup: delete test ticket
        delete_response = self.api_client.delete(
            f"{BASE_URL}/api/tickets/{ticket_id}",
            headers=self.headers
        )
        assert delete_response.status_code == 200
        print(f"✓ Test ticket cleaned up")
    
    def test_get_ticket_by_id(self):
        """Test GET /api/tickets/{id} returns specific ticket"""
        # First get list to find a ticket ID
        list_response = self.api_client.get(
            f"{BASE_URL}/api/tickets",
            headers=self.headers
        )
        tickets = list_response.json()["tickets"]
        assert len(tickets) > 0, "Need at least one ticket for this test"
        
        ticket_id = tickets[0]["ticket_id"]
        
        # Get specific ticket
        response = self.api_client.get(
            f"{BASE_URL}/api/tickets/{ticket_id}",
            headers=self.headers
        )
        print(f"Get ticket by ID response status: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "ticket" in data
        assert data["ticket"]["ticket_id"] == ticket_id
        print(f"✓ Retrieved ticket {ticket_id} successfully")
    
    def test_get_ticket_not_found(self):
        """Test GET /api/tickets/{id} with non-existent ID"""
        response = self.api_client.get(
            f"{BASE_URL}/api/tickets/nonexistent_id",
            headers=self.headers
        )
        print(f"Get non-existent ticket response status: {response.status_code}")
        assert response.status_code == 404, "Should return 404 for non-existent ticket"
        print("✓ Non-existent ticket returns 404 correctly")
    
    def test_update_ticket_and_verify(self):
        """Test PUT /api/tickets/{id} updates ticket and verify with GET"""
        # Create a test ticket first
        ticket_data = {
            "pnr": f"TEST{uuid.uuid4().hex[:6].upper()}",
            "airline": "Update Test Airways",
            "flight_number": "UT999",
            "origin_code": "DEL",
            "origin_city": "Delhi",
            "destination_code": "BLR",
            "destination_city": "Bangalore",
            "departure_date": "2026-06-01",
            "passengers": [{"name": "Update Test", "seat": "1A"}],
            "status": "confirmed"
        }
        
        create_response = self.api_client.post(
            f"{BASE_URL}/api/tickets",
            json=ticket_data,
            headers=self.headers
        )
        ticket_id = create_response.json()["ticket"]["ticket_id"]
        print(f"Created test ticket {ticket_id} for update test")
        
        # Update the ticket
        update_data = {
            "gate": "B10",
            "terminal": "T3",
            "status": "delayed"
        }
        
        update_response = self.api_client.put(
            f"{BASE_URL}/api/tickets/{ticket_id}",
            json=update_data,
            headers=self.headers
        )
        print(f"Update ticket response status: {update_response.status_code}")
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        
        updated_ticket = update_response.json()["ticket"]
        assert updated_ticket["gate"] == "B10"
        assert updated_ticket["terminal"] == "T3"
        assert updated_ticket["status"] == "delayed"
        print("✓ Ticket updated successfully")
        
        # Verify persistence with GET
        get_response = self.api_client.get(
            f"{BASE_URL}/api/tickets/{ticket_id}",
            headers=self.headers
        )
        retrieved_ticket = get_response.json()["ticket"]
        assert retrieved_ticket["gate"] == "B10"
        assert retrieved_ticket["terminal"] == "T3"
        assert retrieved_ticket["status"] == "delayed"
        print("✓ Update persistence verified via GET")
        
        # Cleanup
        self.api_client.delete(
            f"{BASE_URL}/api/tickets/{ticket_id}",
            headers=self.headers
        )
        print("✓ Test ticket cleaned up")
    
    def test_delete_ticket_and_verify(self):
        """Test DELETE /api/tickets/{id} and verify with GET returning 404"""
        # Create a test ticket
        ticket_data = {
            "pnr": f"TEST{uuid.uuid4().hex[:6].upper()}",
            "airline": "Delete Test Airways",
            "flight_number": "DT888",
            "origin_code": "BOM",
            "origin_city": "Mumbai",
            "destination_code": "GOI",
            "destination_city": "Goa",
            "departure_date": "2026-07-01",
            "passengers": [{"name": "Delete Test", "seat": "5B"}]
        }
        
        create_response = self.api_client.post(
            f"{BASE_URL}/api/tickets",
            json=ticket_data,
            headers=self.headers
        )
        ticket_id = create_response.json()["ticket"]["ticket_id"]
        print(f"Created test ticket {ticket_id} for delete test")
        
        # Delete the ticket
        delete_response = self.api_client.delete(
            f"{BASE_URL}/api/tickets/{ticket_id}",
            headers=self.headers
        )
        print(f"Delete ticket response status: {delete_response.status_code}")
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}: {delete_response.text}"
        print("✓ Ticket deleted successfully")
        
        # Verify deletion with GET returning 404
        get_response = self.api_client.get(
            f"{BASE_URL}/api/tickets/{ticket_id}",
            headers=self.headers
        )
        assert get_response.status_code == 404, "Deleted ticket should return 404"
        print("✓ Delete verified - ticket returns 404")
    
    def test_tickets_require_authentication(self, api_client):
        """Test that ticket endpoints require authentication"""
        response = api_client.get(f"{BASE_URL}/api/tickets")
        print(f"Unauthenticated tickets request status: {response.status_code}")
        assert response.status_code == 401, "Should reject unauthenticated request"
        print("✓ Ticket endpoints require authentication")


class TestFlightStatus:
    """Flight status endpoint tests"""
    
    def test_flight_status_api_key_required(self, api_client):
        """Test flight status returns graceful message when API key not configured"""
        response = api_client.get(f"{BASE_URL}/api/flight-status/AI302")
        print(f"Flight status response status: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "status" in data
        assert data["status"] == "api_key_required", "Should return api_key_required status"
        assert "message" in data
        print(f"✓ Flight status returns expected mocked response: {data['message']}")
    
    def test_flight_status_with_date(self, api_client):
        """Test flight status with date parameter"""
        response = api_client.get(f"{BASE_URL}/api/flight-status/6E2151?date=2026-03-20")
        print(f"Flight status with date response status: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "status" in data
        print("✓ Flight status with date parameter works")


class TestSampleData:
    """Verify sample data seeded correctly"""
    
    def test_demo_user_sample_tickets(self, api_client):
        """Test that demo user has 3 sample tickets with correct data"""
        # Login as demo user
        login_response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "phone": DEMO_USER_PHONE,
            "pin": DEMO_USER_PIN
        })
        token = login_response.json()["token"]
        
        # Get tickets
        response = api_client.get(
            f"{BASE_URL}/api/tickets",
            headers={"Authorization": f"Bearer {token}"}
        )
        tickets = response.json()["tickets"]
        
        print(f"Demo user has {len(tickets)} tickets")
        assert len(tickets) >= 3, "Demo user should have at least 3 sample tickets"
        
        # Verify specific sample tickets exist
        pnrs = [t["pnr"] for t in tickets]
        airlines = [t["airline"] for t in tickets]
        
        assert "ABC123" in pnrs, "Should have Air India sample ticket"
        assert "XYZ789" in pnrs, "Should have IndiGo sample ticket"
        assert "LMN456" in pnrs, "Should have Emirates sample ticket"
        
        assert "Air India" in airlines
        assert "IndiGo" in airlines
        assert "Emirates" in airlines
        
        print("✓ All 3 sample tickets verified: Air India, IndiGo, Emirates")
        
        # Verify ticket details
        air_india = next(t for t in tickets if t["pnr"] == "ABC123")
        assert air_india["flight_number"] == "AI302"
        assert air_india["origin_code"] == "DEL"
        assert air_india["destination_code"] == "BOM"
        assert len(air_india["passengers"]) == 2
        print("✓ Air India ticket details correct")
        
        indigo = next(t for t in tickets if t["pnr"] == "XYZ789")
        assert indigo["flight_number"] == "6E2151"
        assert indigo["origin_code"] == "BOM"
        assert indigo["destination_code"] == "BLR"
        assert len(indigo["passengers"]) == 4
        print("✓ IndiGo ticket details correct")
        
        emirates = next(t for t in tickets if t["pnr"] == "LMN456")
        assert emirates["flight_number"] == "EK501"
        assert emirates["origin_code"] == "DXB"
        assert emirates["destination_code"] == "LHR"
        assert len(emirates["passengers"]) == 1
        print("✓ Emirates ticket details correct")
