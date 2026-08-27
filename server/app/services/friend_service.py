from datetime import datetime, timezone

from bson import ObjectId
from fastapi import HTTPException, status

from app.db.database import get_database
from app.models.common import FriendStatus
from app.models.friend import FriendCreate, FriendResponse, FriendUpdate


def _doc_to_response(doc: dict) -> FriendResponse:
    return FriendResponse(
        id=str(doc["_id"]),
        owner_user_id=str(doc["owner_user_id"]),
        name=doc["name"],
        email=doc.get("email"),
        phone=doc.get("phone"),
        avatar=doc.get("avatar"),
        status=doc.get("status", FriendStatus.ACTIVE),
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
    )


async def create_friend(user_id: str, data: FriendCreate) -> FriendResponse:
    db = get_database()
    now = datetime.now(timezone.utc)
    doc = {
        "owner_user_id": ObjectId(user_id),
        "name": data.name,
        "email": data.email,
        "phone": data.phone,
        "avatar": data.avatar,
        "status": FriendStatus.ACTIVE.value,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.friends.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _doc_to_response(doc)


async def get_friends(user_id: str, include_archived: bool = False) -> list[FriendResponse]:
    db = get_database()
    query: dict = {"owner_user_id": ObjectId(user_id)}
    if not include_archived:
        query["status"] = FriendStatus.ACTIVE.value
    cursor = db.friends.find(query).sort("name", 1)
    docs = await cursor.to_list(length=500)
    return [_doc_to_response(d) for d in docs]


async def get_friend(user_id: str, friend_id: str) -> FriendResponse:
    db = get_database()
    doc = await db.friends.find_one(
        {"_id": ObjectId(friend_id), "owner_user_id": ObjectId(user_id)}
    )
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Friend not found.")
    return _doc_to_response(doc)


async def update_friend(user_id: str, friend_id: str, data: FriendUpdate) -> FriendResponse:
    db = get_database()
    updates = {k: v for k, v in data.model_dump(exclude_none=True).items()}
    if not updates:
        return await get_friend(user_id, friend_id)
    updates["updated_at"] = datetime.now(timezone.utc)
    result = await db.friends.find_one_and_update(
        {"_id": ObjectId(friend_id), "owner_user_id": ObjectId(user_id)},
        {"$set": updates},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Friend not found.")
    return _doc_to_response(result)


async def archive_friend(user_id: str, friend_id: str) -> FriendResponse:
    """Archive instead of delete to preserve financial history."""
    db = get_database()
    result = await db.friends.find_one_and_update(
        {"_id": ObjectId(friend_id), "owner_user_id": ObjectId(user_id)},
        {"$set": {"status": FriendStatus.ARCHIVED.value, "updated_at": datetime.now(timezone.utc)}},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Friend not found.")
    return _doc_to_response(result)


async def delete_friend(user_id: str, friend_id: str) -> None:
    """Hard delete — only safe when friend has no financial history."""
    db = get_database()
    # Check for existing shared expenses before deleting
    shared_count = await db.shared_participants.count_documents({"person_id": friend_id})
    if shared_count > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete friend with shared expense history. Use archive instead.",
        )
    result = await db.friends.delete_one(
        {"_id": ObjectId(friend_id), "owner_user_id": ObjectId(user_id)}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Friend not found.")
