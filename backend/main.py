import uvicorn
from fastapi import FastAPI, HTTPException, status, Body, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import List, Optional, Any, Dict
import os
from bson import ObjectId
import datetime
from contextlib import asynccontextmanager
import asyncio
import logging
from datetime import timedelta

# --- Configuration ---
# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Securely load from environment variables
MONGO_URI = os.environ.get("MONGO_URI","mongodb://localhost:27017")
MONGO_DB_NAME = os.environ.get("MONGO_DB_NAME", "chatflow_ai")
CLIENT_ORIGIN = os.environ.get("CLIENT_ORIGIN") # e.g., "http://localhost:5173"

# Validate required environment variables
if not MONGO_URI:
    logging.error("FATAL: MONGO_URI environment variable is not set.")
    raise ValueError("FATAL: MONGO_URI environment variable is not set.")
if not CLIENT_ORIGIN:
    logging.warning("CLIENT_ORIGIN is not set. Defaulting to allow all (*).")

# --- Global App State ---
app_state = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application startup and shutdown events."""
    logging.info("Connecting to MongoDB...")
    app_state["mongo_client"] = AsyncIOMotorClient(MONGO_URI)
    try:
        await app_state["mongo_client"].admin.command('ping')
        logging.info("Successfully connected to MongoDB.")
    except Exception as e:
        logging.error(f"Failed to connect to MongoDB: {e}")
        app_state["mongo_client"] = None
    
    yield
    
    if app_state.get("mongo_client"):
        logging.info("Closing MongoDB connection...")
        app_state["mongo_client"].close()

def get_database() -> AsyncIOMotorDatabase:
    """Dependency injection for the database."""
    client = app_state.get("mongo_client")
    if client is None:
        raise HTTPException(
            status_code=503, detail="Database connection is not available."
        )
    return client[MONGO_DB_NAME]

# --- Pydantic Models ---

class PyObjectId(str):
    """Custom type for MongoDB ObjectId that serializes to string for JSON."""

    @classmethod
    def __get_pydantic_core_schema__(cls, source_type, handler):
        from pydantic_core import core_schema

        def validate(value):
            if isinstance(value, ObjectId):
                return str(value)
            if isinstance(value, str):
                if ObjectId.is_valid(value):
                    return value
                raise ValueError(f"Invalid ObjectId: {value}")
            raise ValueError(f"ObjectId must be ObjectId or str, not {type(value)}")

        return core_schema.with_info_plain_validator_function(
            lambda v, _: validate(v),
            serialization=core_schema.str_schema(),
        )

class Contact(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    name: str = Field(..., min_length=1)
    phone_number: str = Field(..., pattern=r"^\+?[1-9]\d{1,14}$")
    tags: List[str] = []
    current_flow_node_id: Optional[str] = None
    last_active: datetime.datetime = Field(default_factory=datetime.datetime.utcnow)

    model_config = ConfigDict(
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str},
        populate_by_name=True
    )

class ContactInDB(Contact): 
    pass

class ContactCreate(BaseModel):
    name: str = Field(..., min_length=1)
    phone_number: str
    tags: List[str] = []

class ChatbotFlow(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    name: str
    flow_data: dict = Field(default_factory=dict)
    is_active: bool = False

    model_config = ConfigDict(
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str},
        populate_by_name=True
    )

class ChatbotFlowInDB(ChatbotFlow): 
    pass

class ChatbotFlowCreate(BaseModel):
    name: str = Field(..., min_length=1)
    flow_data: dict = Field(default_factory=dict)
    is_active: bool = False

class ChatbotFlowUpdate(BaseModel):
    name: Optional[str] = None
    flow_data: Optional[dict] = None
    is_active: Optional[bool] = None

class MessageLog(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    contact_id: PyObjectId
    from_number: str
    direction: str # "inbound" or "outbound"
    text: str
    timestamp: datetime.datetime = Field(default_factory=datetime.datetime.utcnow)

    model_config = ConfigDict(
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str},
        populate_by_name=True
    )

# --- Dashboard Pydantic Models ---
class ChartDataPoint(BaseModel):
    """Data point for the 7-day chart."""
    date: str
    inbound: int
    outbound: int

class DashboardStats(BaseModel):
    """Upgraded stats model for the dashboard."""
    total_contacts: int
    new_contacts_30_days: int
    total_messages_in: int
    total_messages_out: int
    automation_success_rate: float
    chart_data: List[ChartDataPoint]

# --- FastAPI Application ---

app = FastAPI(
    title="ChatFlow AI Backend",
    description="API for managing WhatsApp automation for salons.",
    version="1.1.0-MVP-Dashboard-Complete",
    lifespan=lifespan,
)

# --- CORS Middleware ---
if CLIENT_ORIGIN:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[CLIENT_ORIGIN],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE"],
        allow_headers=["*"],
    )
else:
    logging.warning("CORS is configured to allow all origins. DO NOT run in production.")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# --- Utility Functions (MOCKED) ---

async def log_message(db: AsyncIOMotorDatabase, contact_id: ObjectId, from_number: str, direction: str, text: str):
    """Logs a message to the database."""
    log = MessageLog(
        contact_id=contact_id,
        from_number=from_number,
        direction=direction,
        text=text
    )
    await db.message_logs.insert_one(log.model_dump(by_alias=True))

async def send_whatsapp_reply(phone_number: str, text: str):
    """MOCKED function to send a reply via WhatsApp."""
    logging.info(f"--- MOCKED WHATSAPP SEND --- TO: {phone_number} BODY: {text}")
    await asyncio.sleep(0.1)
    pass

async def get_openai_response(prompt: str, history: List[Dict[str, str]]) -> str:
    """MOCKED function to get a response from OpenAI."""
    logging.info(f"--- MOCKED OPENAI CALL --- PROMPT: {prompt} HISTORY: {len(history)} messages")
    await asyncio.sleep(0.5)
    return f"This is a mocked AI response to your prompt: '{prompt or '...'}'"

async def get_chat_history(db: AsyncIOMotorDatabase, contact_id: ObjectId, limit: int = 10) -> List[Dict[str, str]]:
    """Retrieves the last N messages for a contact to use as AI context."""
    history = []
    cursor = db.message_logs.find({"contact_id": contact_id}).sort("timestamp", -1).limit(limit)
    async for log in cursor:
        role = "user" if log['direction'] == 'inbound' else 'assistant'
        history.append({"role": role, "content": log['text']})
    return history[::-1]

async def execute_flow_node(db: AsyncIOMotorDatabase, contact: Contact, node: Dict, flow_data: Dict):
    """Executes a single node in the flow and finds the next node."""
    node_type = node.get('type')
    node_id = node.get('id')
    current_node_id = contact.current_flow_node_id
    reply_text = None

    if node_type == 'textMessage':
        reply_text = node.get('data', {}).get('message')
        logging.info(f"Executing textMessage node {node_id}")
    
    elif node_type == 'aiResponse':
        logging.info(f"Executing aiResponse node {node_id}")
        history = await get_chat_history(db, contact.id)
        prompt = node.get('data', {}).get('prompt', '')
        reply_text = await get_openai_response(prompt, history)

    if reply_text:
        await send_whatsapp_reply(contact.phone_number, reply_text)
        await log_message(db, contact.id, contact.phone_number, "outbound", reply_text)
    
    next_node_id = None
    edges = flow_data.get('edges', [])
    for edge in edges:
        if edge.get('source') == node_id:
            next_node_id = edge.get('target')
            break
            
    logging.info(f"Updating contact {contact.id} state: {current_node_id} -> {next_node_id}")
    await db.contacts.update_one(
        {"_id": contact.id},
        {"$set": {"current_flow_node_id": next_node_id, "last_active": datetime.datetime.utcnow()}}
    )

# --- API Endpoints ---

@app.get("/")
async def root():
    return {"status": "ok", "message": "ChatFlow AI Backend is running (MOCKED)."}

# --- Contacts Endpoints ---
@app.post("/api/contacts", response_model=ContactInDB, status_code=status.HTTP_201_CREATED)
async def create_contact(contact: ContactCreate, db: AsyncIOMotorDatabase = Depends(get_database)):
    existing_contact = await db.contacts.find_one({"phone_number": contact.phone_number})
    if existing_contact:
        raise HTTPException(status_code=400, detail="Contact with this phone number already exists.")
    contact_dict = contact.model_dump()
    contact_dict['current_flow_node_id'] = None
    contact_dict['last_active'] = datetime.datetime.utcnow()
    
    new_contact = await db.contacts.insert_one(contact_dict)
    created_contact = await db.contacts.find_one({"_id": new_contact.inserted_id})
    if created_contact is None:
        raise HTTPException(status_code=500, detail="Failed to create and retrieve contact.")
    return ContactInDB(**created_contact)

@app.get("/api/contacts", response_model=List[ContactInDB])
async def get_all_contacts(db: AsyncIOMotorDatabase = Depends(get_database)):
    contacts = []
    async for contact in db.contacts.find():
        contacts.append(ContactInDB(**contact))
    return contacts

# --- Chatbot Flow Endpoints ---
@app.post("/api/flows", status_code=status.HTTP_201_CREATED)
async def create_flow(flow: ChatbotFlowCreate, db: AsyncIOMotorDatabase = Depends(get_database)):
    flow_dict = flow.model_dump()
    if flow.is_active:
        await db.flows.update_many({"is_active": True}, {"$set": {"is_active": False}})
    new_flow = await db.flows.insert_one(flow_dict)
    created_flow = await db.flows.find_one({"_id": new_flow.inserted_id})
    flow_obj = ChatbotFlowInDB(**created_flow)
    return flow_obj.model_dump(by_alias=False, mode='json')

@app.get("/api/flows")
async def get_all_flows(db: AsyncIOMotorDatabase = Depends(get_database)):
    flows = []
    async for flow in db.flows.find():
        flow_obj = ChatbotFlowInDB(**flow)
        # Explicitly serialize with field names (not aliases)
        flow_dict = flow_obj.model_dump(by_alias=False, mode='json')
        flows.append(flow_dict)
    return flows

@app.get("/api/flows/{id}")
async def get_flow(id: str, db: AsyncIOMotorDatabase = Depends(get_database)):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid flow ID")
    flow = await db.flows.find_one({"_id": ObjectId(id)})
    if flow is None:
        raise HTTPException(status_code=404, detail="Flow not found")
    flow_obj = ChatbotFlowInDB(**flow)
    return flow_obj.model_dump(by_alias=False, mode='json')

@app.put("/api/flows/{id}")
async def update_flow(id: str, flow_update: ChatbotFlowUpdate, db: AsyncIOMotorDatabase = Depends(get_database)):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid flow ID")
    update_data = flow_update.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided.")
    if update_data.get("is_active"):
        await db.flows.update_many({"_id": {"$ne": ObjectId(id)}, "is_active": True}, {"$set": {"is_active": False}})
    result = await db.flows.update_one({"_id": ObjectId(id)}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Flow not found")
    updated_flow = await db.flows.find_one({"_id": ObjectId(id)})
    flow_obj = ChatbotFlowInDB(**updated_flow)
    return flow_obj.model_dump(by_alias=False, mode='json')

@app.delete("/api/flows/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_flow(id: str, db: AsyncIOMotorDatabase = Depends(get_database)):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid flow ID")
    result = await db.flows.delete_one({"_id": ObjectId(id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Flow not found")
    return None

# --- Broadcast Endpoint ---
class BroadcastRequest(BaseModel):
    message: str
    tags: List[str] = []

async def run_broadcast_task(db: AsyncIOMotorDatabase, message: str, tags: List[str]):
    """The actual background task for sending messages."""
    query = {}
    if tags:
        query = {"tags": {"$in": tags}}
    total_sent = 0
    contacts_cursor = db.contacts.find(query)
    
    async for contact in contacts_cursor:
        try:
            await send_whatsapp_reply(contact["phone_number"], message)
            await log_message(db, contact["_id"], contact["phone_number"], "outbound", f"[BROADCAST] {message}")
            total_sent += 1
            await asyncio.sleep(0.1) 
        except Exception as e:
            logging.error(f"Failed to send broadcast to {contact['phone_number']}: {e}")
            
    logging.info(f"Broadcast task complete. Sent {total_sent} messages.")

@app.post("/api/broadcast")
async def send_broadcast_message(
    request: BroadcastRequest,
    background_tasks: BackgroundTasks, 
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    logging.info(f"Received broadcast request: {request.message[:20]}...")
    background_tasks.add_task(run_broadcast_task, db, request.message, request.tags)
    return {"status": "ok", "message": "Broadcast task started in background.", "total_sent": 0}

# --- WhatsApp Webhook Endpoint (FIXED) ---
class WebhookMessage(BaseModel):
    from_number: str = Field(..., alias="from")
    text: str = Field(..., alias="body")

class WebhookPayload(BaseModel):
    messages: List[WebhookMessage]

@app.post("/api/webhook/whatsapp")
async def handle_whatsapp_webhook(
    payload: WebhookPayload = Body(...), 
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    message = payload.messages[0]
    from_number = message.from_number
    text = message.text

    contact = await db.contacts.find_one({"phone_number": from_number})
    if not contact:
        new_contact_data = {
            "name": f"WA {from_number}", 
            "phone_number": from_number, 
            "tags": ["new_lead"],
            "current_flow_node_id": None, 
            "last_active": datetime.datetime.utcnow()
        }
        new_contact_result = await db.contacts.insert_one(new_contact_data)
        contact = await db.contacts.find_one({"_id": new_contact_result.inserted_id})
    
    contact = ContactInDB(**contact)
    await log_message(db, contact.id, from_number, "inbound", text)
    active_flow = await db.flows.find_one({"is_active": True})
    
    if not active_flow:
        logging.warning(f"No active flow for inbound message from {from_number}.")
        return {"status": "ok", "message": "No active flow."}
        
    flow_data = active_flow.get('flow_data', {})
    nodes = flow_data.get('nodes', [])
    current_node_id = contact.current_flow_node_id
    
    # ✅ FIXED: Changed "current_.node" to "current_node"
    current_node = next(
        (n for n in nodes if n.get('id') == current_node_id), 
        None
    ) if current_node_id else None

    if not current_node:
        target_nodes = {edge.get('target') for edge in flow_data.get('edges', [])}
        trigger_node = next(
            (n for n in nodes if n.get('id') not in target_nodes), 
            None
        )
        
        if not trigger_node:
            logging.error(f"Active flow {active_flow['name']} has no trigger node.")
            return {"status": "ok", "message": "No trigger node found."}
        current_node = trigger_node

    await execute_flow_node(db, contact, current_node, flow_data)
    return {"status": "ok", "message_processed": True}


# --- FULLY FUNCTIONAL DASHBOARD ENDPOINT ---
@app.get("/api/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(db: AsyncIOMotorDatabase = Depends(get_database)):
    
    # 1. Get total contacts
    total_contacts = await db.contacts.count_documents({})
    
    # 2. Get new contacts in the last 30 days
    thirty_days_ago = datetime.datetime.now() - timedelta(days=30)
    new_contacts_30_days = await db.contacts.count_documents(
        {"_id": {"$gte": ObjectId.from_datetime(thirty_days_ago)}}
    )
    
    # 3. Get message counts
    total_messages_in = await db.message_logs.count_documents({"direction": "inbound"})
    total_messages_out = await db.message_logs.count_documents({"direction": "outbound"})
    
    # 4. Calculate Automation Success Rate (Outbound / Inbound)
    automation_success_rate = 0.0
    if total_messages_in > 0:
        automation_success_rate = (total_messages_out / total_messages_in) * 100
    
    # 5. Get Chart Data (Last 7 Days)
    seven_days_ago = datetime.datetime.now().replace(
        hour=0, minute=0, second=0, microsecond=0
    ) - timedelta(days=6)
    
    # MongoDB aggregation pipeline for chart data
    pipeline = [
        {
            "$match": {
                "timestamp": {"$gte": seven_days_ago}
            }
        },
        {
            "$group": {
                "_id": {
                    "date": {
                        "$dateToString": {"format": "%Y-%m-%d", "date": "$timestamp"}
                    },
                    "direction": "$direction"
                },
                "count": {"$sum": 1}
            }
        },
        {
            "$group": {
                "_id": "$_id.date",
                "counts": {
                    "$push": {
                        "k": "$_id.direction",
                        "v": "$count"
                    }
                }
            }
        },
        {
            "$project": {
                "date": "$_id",
                "counts_dict": {"$arrayToObject": "$counts"},
                "_id": 0
            }
        },
        {
            "$project": {
                "date": "$date",
                "inbound": {"$ifNull": ["$counts_dict.inbound", 0]},
                "outbound": {"$ifNull": ["$counts_dict.outbound", 0]}
            }
        },
        {
            "$sort": {"date": 1}
        }
    ]
    
    chart_data_cursor = db.message_logs.aggregate(pipeline)
    chart_data_list = await chart_data_cursor.to_list(length=7)
    
    # Fill in missing dates
    chart_data_dict = {item['date']: item for item in chart_data_list}
    final_chart_data = []
    for i in range(7):
        date = (seven_days_ago + timedelta(days=i)).strftime("%Y-%m-%d")
        if date in chart_data_dict:
            final_chart_data.append(chart_data_dict[date])
        else:
            final_chart_data.append({"date": date, "inbound": 0, "outbound": 0})

    return DashboardStats(
        total_contacts=total_contacts,
        new_contacts_30_days=new_contacts_30_days,
        total_messages_in=total_messages_in,
        total_messages_out=total_messages_out,
        automation_success_rate=round(automation_success_rate, 2),
        chart_data=final_chart_data
    )

# --- Run the application ---
if __name__ == "__main__":
    logging.info("Starting FastAPI server for development...")
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )