from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import bcrypt
import jwt as pyjwt
import json
import httpx
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, Field
from typing import List, Optional, Dict

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'test_database')]

JWT_SECRET = os.environ.get('JWT_SECRET', 'dev_secret_change_in_prod')
JWT_ALGORITHM = "HS256"
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
AVIATIONSTACK_API_KEY = os.environ.get('AVIATIONSTACK_API_KEY', '')

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== PYDANTIC MODELS ====================

class UserRegister(BaseModel):
    name: str
    phone: str
    pin: str

class UserLogin(BaseModel):
    phone: str
    pin: str

class TicketCreate(BaseModel):
    pnr: str
    airline: str
    flight_number: str
    origin_code: str
    origin_city: str
    destination_code: str
    destination_city: str
    departure_date: str
    departure_time: str = ""
    arrival_date: str = ""
    arrival_time: str = ""
    passengers: List[Dict[str, str]] = []
    gate: str = ""
    terminal: str = ""
    seat: str = ""
    booking_class: str = ""
    status: str = "confirmed"

class TicketUpdate(BaseModel):
    pnr: Optional[str] = None
    airline: Optional[str] = None
    flight_number: Optional[str] = None
    origin_code: Optional[str] = None
    origin_city: Optional[str] = None
    destination_code: Optional[str] = None
    destination_city: Optional[str] = None
    departure_date: Optional[str] = None
    departure_time: Optional[str] = None
    arrival_date: Optional[str] = None
    arrival_time: Optional[str] = None
    passengers: Optional[List[Dict[str, str]]] = None
    gate: Optional[str] = None
    terminal: Optional[str] = None
    seat: Optional[str] = None
    booking_class: Optional[str] = None
    status: Optional[str] = None
    reminder: Optional[str] = None

class ParseTicketRequest(BaseModel):
    image_base64: str
    mime_type: str = "image/jpeg"

# ==================== AUTH HELPERS ====================

def hash_pin(pin: str) -> str:
    return bcrypt.hashpw(pin.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_pin(pin: str, hashed: str) -> bool:
    return bcrypt.checkpw(pin.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(user_id: str, phone: str) -> str:
    payload = {
        "sub": user_id,
        "phone": phone,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access"
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    auth_header = request.headers.get("Authorization", "")
    token = None
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    if not token:
        token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"user_id": payload["sub"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user.pop("pin_hash", None)
        return user
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ==================== APP SETUP ====================

app = FastAPI(title="Find My Tickets API")
api_router = APIRouter(prefix="/api")

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register")
async def register(data: UserRegister):
    if len(data.pin) != 6 or not data.pin.isdigit():
        raise HTTPException(status_code=400, detail="PIN must be exactly 6 digits")
    if len(data.phone) < 10:
        raise HTTPException(status_code=400, detail="Invalid phone number")
    
    existing = await db.users.find_one({"phone": data.phone}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Phone number already registered")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user_doc = {
        "user_id": user_id,
        "name": data.name,
        "phone": data.phone,
        "pin_hash": hash_pin(data.pin),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user_doc)
    
    token = create_access_token(user_id, data.phone)
    
    return {
        "user": {
            "user_id": user_id,
            "name": data.name,
            "phone": data.phone,
            "created_at": user_doc["created_at"],
        },
        "token": token,
    }

@api_router.post("/auth/login")
async def login(data: UserLogin):
    user = await db.users.find_one({"phone": data.phone})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid phone number or PIN")
    
    if not verify_pin(data.pin, user["pin_hash"]):
        raise HTTPException(status_code=401, detail="Invalid phone number or PIN")
    
    token = create_access_token(user["user_id"], data.phone)
    
    return {
        "user": {
            "user_id": user["user_id"],
            "name": user["name"],
            "phone": user["phone"],
            "created_at": user.get("created_at", ""),
        },
        "token": token,
    }

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {"user": user}

@api_router.post("/auth/logout")
async def logout_user():
    return {"message": "Logged out successfully"}

# ==================== TICKET ROUTES ====================

@api_router.get("/tickets")
async def get_tickets(user: dict = Depends(get_current_user)):
    tickets = await db.tickets.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort("departure_date", -1).to_list(100)
    return {"tickets": tickets}

@api_router.post("/tickets")
async def create_ticket(data: TicketCreate, user: dict = Depends(get_current_user)):
    ticket_id = f"tkt_{uuid.uuid4().hex[:12]}"
    ticket_doc = {
        "ticket_id": ticket_id,
        "user_id": user["user_id"],
        **data.dict(),
        "reminder": None,
        "source": "manual",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.tickets.insert_one(ticket_doc)
    ticket_doc.pop("_id", None)
    return {"ticket": ticket_doc}

@api_router.get("/tickets/{ticket_id}")
async def get_ticket(ticket_id: str, user: dict = Depends(get_current_user)):
    ticket = await db.tickets.find_one(
        {"ticket_id": ticket_id, "user_id": user["user_id"]},
        {"_id": 0}
    )
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return {"ticket": ticket}

@api_router.put("/tickets/{ticket_id}")
async def update_ticket(ticket_id: str, data: TicketUpdate, user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.tickets.update_one(
        {"ticket_id": ticket_id, "user_id": user["user_id"]},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    ticket = await db.tickets.find_one({"ticket_id": ticket_id}, {"_id": 0})
    return {"ticket": ticket}

@api_router.delete("/tickets/{ticket_id}")
async def delete_ticket(ticket_id: str, user: dict = Depends(get_current_user)):
    result = await db.tickets.delete_one(
        {"ticket_id": ticket_id, "user_id": user["user_id"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return {"message": "Ticket deleted"}

# ==================== AI TICKET PARSING ====================

@api_router.post("/tickets/parse")
async def parse_ticket(data: ParseTicketRequest, user: dict = Depends(get_current_user)):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="AI parsing not configured")
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"parse_{uuid.uuid4().hex[:8]}",
            system_message="""You are a flight ticket information extractor. Extract flight details from the provided ticket image.
Return ONLY a valid JSON object with these exact fields (use empty string "" if a field is not found):
{
    "pnr": "booking reference/PNR code",
    "airline": "airline name",
    "flight_number": "flight number e.g. AI302",
    "origin_code": "3-letter IATA origin airport code",
    "origin_city": "origin city name",
    "destination_code": "3-letter IATA destination airport code",
    "destination_city": "destination city name",
    "departure_date": "YYYY-MM-DD format",
    "departure_time": "HH:MM format (24h)",
    "arrival_date": "YYYY-MM-DD format",
    "arrival_time": "HH:MM format (24h)",
    "passengers": [{"name": "FULL NAME", "seat": "seat if available"}],
    "gate": "gate number",
    "terminal": "terminal number",
    "booking_class": "economy/business/first",
    "status": "confirmed"
}
Return ONLY the JSON. No markdown, no explanation, no code blocks."""
        )
        chat.with_model("openai", "gpt-5.2")
        
        image_content = ImageContent(image_base64=data.image_base64)
        user_message = UserMessage(
            text="Extract all flight information from this ticket. Return only the JSON object.",
            file_contents=[image_content]
        )
        
        response = await chat.send_message(user_message)
        
        response_text = response.strip()
        if response_text.startswith("```"):
            lines = response_text.split('\n')
            start = 1
            end = len(lines) - 1
            for i, line in enumerate(lines):
                if i > 0 and line.strip().startswith("```"):
                    end = i
                    break
            response_text = '\n'.join(lines[start:end])
        
        parsed = json.loads(response_text)
        return {"parsed_ticket": parsed}
    
    except json.JSONDecodeError:
        logger.error(f"Failed to parse AI response as JSON")
        raise HTTPException(status_code=500, detail="Failed to parse ticket. Please try again or enter manually.")
    except Exception as e:
        logger.error(f"AI parsing error: {e}")
        raise HTTPException(status_code=500, detail=f"Parsing failed: {str(e)}")

# ==================== FLIGHT STATUS ====================
# Abstracted flight status service - easy to swap providers

async def fetch_flight_status_aviationstack(flight_number: str, date: str = None) -> dict:
    """Fetch flight status from AviationStack API."""
    if not AVIATIONSTACK_API_KEY:
        return {
            "status": "api_key_required",
            "message": "Flight status API not configured. Add AVIATIONSTACK_API_KEY to enable live tracking.",
            "flight": None
        }
    
    try:
        async with httpx.AsyncClient() as http_client:
            params = {
                "access_key": AVIATIONSTACK_API_KEY,
                "flight_iata": flight_number.upper().replace(" ", ""),
            }
            if date:
                params["flight_date"] = date
            
            response = await http_client.get(
                "http://api.aviationstack.com/v1/flights",
                params=params,
                timeout=10.0
            )
            data = response.json()
            
            if "error" in data:
                return {"status": "error", "message": data["error"].get("message", "API error"), "flight": None}
            
            flights = data.get("data", [])
            if not flights:
                return {"status": "not_found", "message": "No flight data found for this flight number.", "flight": None}
            
            f = flights[0]
            return {
                "status": "success",
                "flight": {
                    "flight_number": flight_number.upper(),
                    "airline": f.get("airline", {}).get("name", ""),
                    "flight_status": f.get("flight_status", "unknown"),
                    "departure": {
                        "airport": f.get("departure", {}).get("airport", ""),
                        "iata": f.get("departure", {}).get("iata", ""),
                        "scheduled": f.get("departure", {}).get("scheduled", ""),
                        "estimated": f.get("departure", {}).get("estimated", ""),
                        "actual": f.get("departure", {}).get("actual", ""),
                        "terminal": f.get("departure", {}).get("terminal", ""),
                        "gate": f.get("departure", {}).get("gate", ""),
                    },
                    "arrival": {
                        "airport": f.get("arrival", {}).get("airport", ""),
                        "iata": f.get("arrival", {}).get("iata", ""),
                        "scheduled": f.get("arrival", {}).get("scheduled", ""),
                        "estimated": f.get("arrival", {}).get("estimated", ""),
                        "actual": f.get("arrival", {}).get("actual", ""),
                        "terminal": f.get("arrival", {}).get("terminal", ""),
                        "gate": f.get("arrival", {}).get("gate", ""),
                    },
                }
            }
    except httpx.TimeoutException:
        return {"status": "error", "message": "Request timed out. Please try again.", "flight": None}
    except Exception as e:
        logger.error(f"Flight status error: {e}")
        return {"status": "error", "message": "Failed to fetch flight status.", "flight": None}

# To swap providers, replace this function mapping
flight_status_provider = fetch_flight_status_aviationstack

@api_router.get("/flight-status/{flight_number}")
async def get_flight_status(flight_number: str, date: str = None):
    return await flight_status_provider(flight_number, date)

# ==================== STARTUP ====================

@app.on_event("startup")
async def startup():
    await db.users.create_index("phone", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.tickets.create_index("user_id")
    await db.tickets.create_index("ticket_id", unique=True)
    
    # Seed demo user
    existing = await db.users.find_one({"phone": "9999999999"})
    if not existing:
        demo_user_id = "user_demo_001"
        await db.users.insert_one({
            "user_id": demo_user_id,
            "name": "Demo User",
            "phone": "9999999999",
            "pin_hash": hash_pin("123456"),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        
        sample_tickets = [
            {
                "ticket_id": "tkt_sample_001",
                "user_id": demo_user_id,
                "pnr": "ABC123",
                "airline": "Air India",
                "flight_number": "AI302",
                "origin_code": "DEL",
                "origin_city": "New Delhi",
                "destination_code": "BOM",
                "destination_city": "Mumbai",
                "departure_date": "2026-03-15",
                "departure_time": "08:30",
                "arrival_date": "2026-03-15",
                "arrival_time": "10:45",
                "passengers": [
                    {"name": "Demo User", "seat": "12A"},
                    {"name": "John Smith", "seat": "12B"},
                ],
                "gate": "A12",
                "terminal": "T3",
                "seat": "12A",
                "booking_class": "Economy",
                "status": "confirmed",
                "reminder": None,
                "source": "manual",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
            {
                "ticket_id": "tkt_sample_002",
                "user_id": demo_user_id,
                "pnr": "XYZ789",
                "airline": "IndiGo",
                "flight_number": "6E2151",
                "origin_code": "BOM",
                "origin_city": "Mumbai",
                "destination_code": "BLR",
                "destination_city": "Bengaluru",
                "departure_date": "2026-03-20",
                "departure_time": "14:00",
                "arrival_date": "2026-03-20",
                "arrival_time": "15:45",
                "passengers": [
                    {"name": "Demo User", "seat": "5C"},
                    {"name": "Alice Johnson", "seat": "5D"},
                    {"name": "Bob Williams", "seat": "5E"},
                    {"name": "Carol Davis", "seat": "5F"},
                ],
                "gate": "B7",
                "terminal": "T2",
                "seat": "5C",
                "booking_class": "Economy",
                "status": "confirmed",
                "reminder": None,
                "source": "manual",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
            {
                "ticket_id": "tkt_sample_003",
                "user_id": demo_user_id,
                "pnr": "LMN456",
                "airline": "Emirates",
                "flight_number": "EK501",
                "origin_code": "DXB",
                "origin_city": "Dubai",
                "destination_code": "LHR",
                "destination_city": "London",
                "departure_date": "2026-04-05",
                "departure_time": "22:15",
                "arrival_date": "2026-04-06",
                "arrival_time": "02:30",
                "passengers": [
                    {"name": "Demo User", "seat": "32K"},
                ],
                "gate": "C22",
                "terminal": "T3",
                "seat": "32K",
                "booking_class": "Business",
                "status": "confirmed",
                "reminder": None,
                "source": "manual",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
        ]
        
        for ticket in sample_tickets:
            await db.tickets.insert_one(ticket)
        
        logger.info("Demo user and sample tickets seeded successfully")
    
    # Write test credentials
    os.makedirs("/app/memory", exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write("# Test Credentials\n\n")
        f.write("## Demo User\n")
        f.write("- Phone: 9999999999\n")
        f.write("- PIN: 123456\n")
        f.write("- Name: Demo User\n\n")
        f.write("## Auth Endpoints\n")
        f.write("- POST /api/auth/register\n")
        f.write("- POST /api/auth/login\n")
        f.write("- GET /api/auth/me\n")
        f.write("- POST /api/auth/logout\n\n")
        f.write("## Ticket Endpoints\n")
        f.write("- GET /api/tickets\n")
        f.write("- POST /api/tickets\n")
        f.write("- GET /api/tickets/{ticket_id}\n")
        f.write("- PUT /api/tickets/{ticket_id}\n")
        f.write("- DELETE /api/tickets/{ticket_id}\n")
        f.write("- POST /api/tickets/parse\n\n")
        f.write("## Flight Status\n")
        f.write("- GET /api/flight-status/{flight_number}\n")
    
    logger.info("Startup complete")

# ==================== INCLUDE ROUTER & MIDDLEWARE ====================

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown():
    client.close()
