from datetime import datetime, timezone

from bson import ObjectId
from fastapi import HTTPException, status

from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, verify_refresh_token
from app.db.database import get_database
from app.models.user import UserCreate, UserLogin, UserInDB, UserResponse, TokenResponse


def _user_to_response(doc: dict) -> UserResponse:
    return UserResponse(
        id=str(doc["_id"]),
        name=doc["name"],
        email=doc["email"],
        currency=doc.get("currency", "INR"),
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
    )


async def register_user(data: UserCreate) -> TokenResponse:
    db = get_database()
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )
    now = datetime.now(timezone.utc)
    doc = {
        "name": data.name,
        "email": data.email,
        "password_hash": hash_password(data.password),
        "currency": data.currency,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.users.insert_one(doc)
    doc["_id"] = result.inserted_id

    user_response = _user_to_response(doc)
    token_data = {"sub": str(result.inserted_id)}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        user=user_response,
    )


async def login_user(data: UserLogin) -> TokenResponse:
    db = get_database()
    doc = await db.users.find_one({"email": data.email})
    if not doc or not verify_password(data.password, doc["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )
    user_response = _user_to_response(doc)
    token_data = {"sub": str(doc["_id"])}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        user=user_response,
    )


async def refresh_tokens(refresh_token: str) -> TokenResponse:
    payload = verify_refresh_token(refresh_token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token.",
        )
    user_id = payload.get("sub")
    db = get_database()
    doc = await db.users.find_one({"_id": ObjectId(user_id)})
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found.",
        )
    user_response = _user_to_response(doc)
    token_data = {"sub": user_id}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        user=user_response,
    )


async def get_current_user_doc(user_id: str) -> dict:
    db = get_database()
    doc = await db.users.find_one({"_id": ObjectId(user_id)})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return doc


async def update_user(user_id: str, name: str | None, currency: str | None) -> UserResponse:
    db = get_database()
    updates = {}
    if name is not None:
        updates["name"] = name
    if currency is not None:
        updates["currency"] = currency
    if not updates:
        doc = await get_current_user_doc(user_id)
        return _user_to_response(doc)
    updates["updated_at"] = datetime.now(timezone.utc)
    result = await db.users.find_one_and_update(
        {"_id": ObjectId(user_id)},
        {"$set": updates},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return _user_to_response(result)

