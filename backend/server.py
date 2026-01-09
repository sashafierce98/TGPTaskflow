from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Cookie
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Any
import uuid
from datetime import datetime, timezone, timedelta
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

EMERGENT_SESSION_API = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    role: str = "user"
    created_at: str

class UserSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    session_token: str
    expires_at: str
    created_at: str

class Board(BaseModel):
    model_config = ConfigDict(extra="ignore")
    board_id: str
    name: str
    description: Optional[str] = None
    owner_id: str
    collaborators: List[str] = []
    is_template: bool = False
    created_at: str
    updated_at: str

class Column(BaseModel):
    model_config = ConfigDict(extra="ignore")
    column_id: str
    board_id: str
    name: str
    order: int
    wip_limit: Optional[int] = None
    color: str = "#64748B"
    created_at: str

class Card(BaseModel):
    model_config = ConfigDict(extra="ignore")
    card_id: str
    board_id: str
    column_id: str
    title: str
    description: Optional[str] = None
    priority: str = "medium"
    due_date: Optional[str] = None
    assigned_to: Optional[str] = None
    order: int
    created_by: str
    created_at: str
    updated_at: str

class Comment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    comment_id: str
    card_id: str
    user_id: str
    text: str
    created_at: str

class CreateBoardInput(BaseModel):
    name: str
    description: Optional[str] = None
    is_template: bool = False

class CreateColumnInput(BaseModel):
    name: str
    wip_limit: Optional[int] = None
    color: str = "#64748B"

class CreateCardInput(BaseModel):
    title: str
    description: Optional[str] = None
    priority: str = "medium"
    due_date: Optional[str] = None
    assigned_to: Optional[str] = None

class UpdateCardInput(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[str] = None
    assigned_to: Optional[str] = None
    column_id: Optional[str] = None

class AddCommentInput(BaseModel):
    text: str

async def get_current_user(request: Request) -> str:
    session_token = request.cookies.get("session_token")
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.replace("Bearer ", "")
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session_doc = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    expires_at = session_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    return session_doc["user_id"]

@api_router.get("/")
async def root():
    return {"message": "TGP Bioplastics Kanban API", "status": "running"}

@api_router.post("/auth/session")
async def create_session(request: Request, response: Response):
    session_id = request.headers.get("X-Session-ID")
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID required")
    
    async with httpx.AsyncClient() as client:
        res = await client.get(EMERGENT_SESSION_API, headers={"X-Session-ID": session_id})
        if res.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session")
        data = res.json()
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    existing_user = await db.users.find_one({"email": data["email"]}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": data["name"], "picture": data.get("picture")}}
        )
    else:
        user_doc = {
            "user_id": user_id,
            "email": data["email"],
            "name": data["name"],
            "picture": data.get("picture"),
            "role": "user",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user_doc)
    
    session_token = data["session_token"]
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    session_doc = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session_doc)
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return user

@api_router.get("/auth/me")
async def get_me(request: Request):
    user_id = await get_current_user(request)
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    response.delete_cookie("session_token", path="/")
    return {"message": "Logged out"}

@api_router.get("/boards", response_model=List[Board])
async def get_boards(request: Request):
    user_id = await get_current_user(request)
    # Return all boards for organization-wide collaboration
    boards = await db.boards.find({}, {"_id": 0}).to_list(1000)
    return boards

@api_router.post("/boards", response_model=Board)
async def create_board(input: CreateBoardInput, request: Request):
    user_id = await get_current_user(request)
    board_id = f"board_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    
    board_doc = {
        "board_id": board_id,
        "name": input.name,
        "description": input.description,
        "owner_id": user_id,
        "collaborators": [],
        "is_template": input.is_template,
        "created_at": now,
        "updated_at": now
    }
    await db.boards.insert_one(board_doc)
    
    default_columns = [
        {"name": "Backlog", "color": "#64748B", "order": 0, "wip_limit": None},
        {"name": "To Do", "color": "#3B82F6", "order": 1, "wip_limit": 15},
        {"name": "In Progress", "color": "#F59E0B", "order": 2, "wip_limit": 5},
        {"name": "Done", "color": "#10B981", "order": 3, "wip_limit": None},
        {"name": "Questions", "color": "#8B5CF6", "order": 4, "wip_limit": None}
    ]
    
    for col in default_columns:
        column_doc = {
            "column_id": f"col_{uuid.uuid4().hex[:12]}",
            "board_id": board_id,
            "name": col["name"],
            "order": col["order"],
            "wip_limit": col["wip_limit"],
            "color": col["color"],
            "created_at": now
        }
        await db.columns.insert_one(column_doc)
    
    board = await db.boards.find_one({"board_id": board_id}, {"_id": 0})
    return board

@api_router.get("/boards/{board_id}", response_model=Board)
async def get_board(board_id: str, request: Request):
    user_id = await get_current_user(request)
    board = await db.boards.find_one({"board_id": board_id}, {"_id": 0})
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if board["owner_id"] != user_id and user_id not in board.get("collaborators", []) and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    
    return board

@api_router.delete("/boards/{board_id}")
async def delete_board(board_id: str, request: Request):
    user_id = await get_current_user(request)
    board = await db.boards.find_one({"board_id": board_id}, {"_id": 0})
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    if board["owner_id"] != user_id:
        raise HTTPException(status_code=403, detail="Only owner can delete")
    
    await db.boards.delete_one({"board_id": board_id})
    await db.columns.delete_many({"board_id": board_id})
    await db.cards.delete_many({"board_id": board_id})
    return {"message": "Board deleted"}

@api_router.get("/boards/{board_id}/columns", response_model=List[Column])
async def get_columns(board_id: str, request: Request):
    await get_current_user(request)
    columns = await db.columns.find({"board_id": board_id}, {"_id": 0}).sort("order", 1).to_list(1000)
    return columns

@api_router.post("/boards/{board_id}/columns", response_model=Column)
async def create_column(board_id: str, input: CreateColumnInput, request: Request):
    user_id = await get_current_user(request)
    board = await db.boards.find_one({"board_id": board_id}, {"_id": 0})
    if not board or board["owner_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    max_order = await db.columns.find({"board_id": board_id}).sort("order", -1).limit(1).to_list(1)
    order = max_order[0]["order"] + 1 if max_order else 0
    
    column_doc = {
        "column_id": f"col_{uuid.uuid4().hex[:12]}",
        "board_id": board_id,
        "name": input.name,
        "order": order,
        "wip_limit": input.wip_limit,
        "color": input.color,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.columns.insert_one(column_doc)
    column = await db.columns.find_one({"column_id": column_doc["column_id"]}, {"_id": 0})
    return column

@api_router.put("/columns/{column_id}")
async def update_column(column_id: str, input: CreateColumnInput, request: Request):
    user_id = await get_current_user(request)
    column = await db.columns.find_one({"column_id": column_id}, {"_id": 0})
    if not column:
        raise HTTPException(status_code=404, detail="Column not found")
    
    board = await db.boards.find_one({"board_id": column["board_id"]}, {"_id": 0})
    if board["owner_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    await db.columns.update_one(
        {"column_id": column_id},
        {"$set": {"name": input.name, "wip_limit": input.wip_limit, "color": input.color}}
    )
    return {"message": "Column updated"}

@api_router.delete("/columns/{column_id}")
async def delete_column(column_id: str, request: Request):
    user_id = await get_current_user(request)
    column = await db.columns.find_one({"column_id": column_id}, {"_id": 0})
    if not column:
        raise HTTPException(status_code=404, detail="Column not found")
    
    board = await db.boards.find_one({"board_id": column["board_id"]}, {"_id": 0})
    if board["owner_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    await db.columns.delete_one({"column_id": column_id})
    await db.cards.delete_many({"column_id": column_id})
    return {"message": "Column deleted"}

@api_router.get("/boards/{board_id}/cards", response_model=List[Card])
async def get_cards(board_id: str, request: Request):
    await get_current_user(request)
    cards = await db.cards.find({"board_id": board_id}, {"_id": 0}).sort("order", 1).to_list(1000)
    return cards

@api_router.post("/boards/{board_id}/columns/{column_id}/cards", response_model=Card)
async def create_card(board_id: str, column_id: str, input: CreateCardInput, request: Request):
    user_id = await get_current_user(request)
    
    max_order = await db.cards.find({"column_id": column_id}).sort("order", -1).limit(1).to_list(1)
    order = max_order[0]["order"] + 1 if max_order else 0
    
    now = datetime.now(timezone.utc).isoformat()
    card_doc = {
        "card_id": f"card_{uuid.uuid4().hex[:12]}",
        "board_id": board_id,
        "column_id": column_id,
        "title": input.title,
        "description": input.description,
        "priority": input.priority,
        "due_date": input.due_date,
        "assigned_to": input.assigned_to,
        "order": order,
        "created_by": user_id,
        "created_at": now,
        "updated_at": now
    }
    await db.cards.insert_one(card_doc)
    card = await db.cards.find_one({"card_id": card_doc["card_id"]}, {"_id": 0})
    return card

@api_router.put("/cards/{card_id}", response_model=Card)
async def update_card(card_id: str, input: UpdateCardInput, request: Request):
    await get_current_user(request)
    card = await db.cards.find_one({"card_id": card_id}, {"_id": 0})
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.cards.update_one({"card_id": card_id}, {"$set": update_data})
    updated_card = await db.cards.find_one({"card_id": card_id}, {"_id": 0})
    return updated_card

@api_router.delete("/cards/{card_id}")
async def delete_card(card_id: str, request: Request):
    await get_current_user(request)
    await db.cards.delete_one({"card_id": card_id})
    await db.comments.delete_many({"card_id": card_id})
    return {"message": "Card deleted"}

@api_router.get("/cards/{card_id}/comments", response_model=List[Comment])
async def get_comments(card_id: str, request: Request):
    await get_current_user(request)
    comments = await db.comments.find({"card_id": card_id}, {"_id": 0}).sort("created_at", 1).to_list(1000)
    return comments

@api_router.post("/cards/{card_id}/comments", response_model=Comment)
async def add_comment(card_id: str, input: AddCommentInput, request: Request):
    user_id = await get_current_user(request)
    comment_doc = {
        "comment_id": f"comment_{uuid.uuid4().hex[:12]}",
        "card_id": card_id,
        "user_id": user_id,
        "text": input.text,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.comments.insert_one(comment_doc)
    comment = await db.comments.find_one({"comment_id": comment_doc["comment_id"]}, {"_id": 0})
    return comment

@api_router.get("/admin/users")
async def get_all_users(request: Request):
    user_id = await get_current_user(request)
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    users = await db.users.find({}, {"_id": 0}).to_list(1000)
    return users

@api_router.put("/admin/users/{target_user_id}/role")
async def update_user_role(target_user_id: str, role: str, request: Request):
    user_id = await get_current_user(request)
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    await db.users.update_one({"user_id": target_user_id}, {"$set": {"role": role}})
    return {"message": "Role updated"}

@api_router.get("/admin/analytics")
async def get_analytics(request: Request):
    user_id = await get_current_user(request)
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    total_users = await db.users.count_documents({})
    total_boards = await db.boards.count_documents({})
    total_cards = await db.cards.count_documents({})
    
    return {
        "total_users": total_users,
        "total_boards": total_boards,
        "total_cards": total_cards
    }

@api_router.get("/notifications")
async def get_notifications(request: Request):
    user_id = await get_current_user(request)
    now = datetime.now(timezone.utc)
    
    assigned_cards = await db.cards.find(
        {"assigned_to": user_id, "due_date": {"$ne": None}},
        {"_id": 0}
    ).to_list(1000)
    
    notifications = []
    for card in assigned_cards:
        if card.get("due_date"):
            due_date = datetime.fromisoformat(card["due_date"])
            if due_date.tzinfo is None:
                due_date = due_date.replace(tzinfo=timezone.utc)
            
            days_until = (due_date - now).days
            if days_until <= 0:
                notifications.append({
                    "type": "overdue",
                    "card_id": card["card_id"],
                    "title": card["title"],
                    "message": f"Card '{card['title']}' is overdue"
                })
            elif days_until <= 1:
                notifications.append({
                    "type": "due_today",
                    "card_id": card["card_id"],
                    "title": card["title"],
                    "message": f"Card '{card['title']}' is due today"
                })
            elif days_until <= 7:
                notifications.append({
                    "type": "due_this_week",
                    "card_id": card["card_id"],
                    "title": card["title"],
                    "message": f"Card '{card['title']}' is due in {days_until} days"
                })
    
    return notifications

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()