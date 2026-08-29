import secrets
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import HTTPException, status

from app.db.database import get_database
from app.models.common import FriendStatus
from app.models.friend import (
    FriendInvite,
    FriendResponse,
    FriendUpdate,
    InviteAcceptResponse,
    InviteInfo,
)
from app.services.shared_expense_service import get_balances


def _generate_invite_token() -> str:
    return secrets.token_urlsafe(24)


def _doc_to_response(doc: dict, net_balance_minor: int = 0, currency: str = "INR") -> FriendResponse:
    doc_status = doc.get("status", FriendStatus.ACTIVE)
    return FriendResponse(
        id=str(doc["_id"]),
        owner_user_id=str(doc["owner_user_id"]),
        name=doc["name"],
        email=doc.get("email"),
        phone=doc.get("phone"),
        avatar=doc.get("avatar"),
        status=doc_status,
        is_archived=doc_status == FriendStatus.ARCHIVED.value,
        is_pending=doc_status == FriendStatus.PENDING.value,
        invite_token=doc.get("invite_token"),
        invited_at=doc.get("invited_at"),
        accepted_at=doc.get("accepted_at"),
        linked_user_id=doc.get("linked_user_id"),
        net_balance_minor=net_balance_minor,
        currency=currency,
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
    )


async def invite_friend(user_id: str, data: FriendInvite) -> FriendResponse:
    """Create a pending invite to an existing Suraty account, matched by email.
    The friend only becomes an active collaborator once they log in as that
    account and accept the invite link."""
    db = get_database()

    target_user = await db.users.find_one({"email": data.email})
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No Suraty account found with that email. Ask them to sign up first, then invite them again.",
        )
    if str(target_user["_id"]) == user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You can't invite yourself.")

    existing = await db.friends.find_one({
        "owner_user_id": ObjectId(user_id),
        "linked_user_id": str(target_user["_id"]),
        "status": {"$in": [FriendStatus.PENDING.value, FriendStatus.ACTIVE.value]},
    })
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You've already invited this person.",
        )

    now = datetime.now(timezone.utc)
    doc = {
        "owner_user_id": ObjectId(user_id),
        "name": data.name,
        "email": data.email,
        "phone": data.phone,
        "avatar": data.avatar,
        "status": FriendStatus.PENDING.value,
        "invite_token": _generate_invite_token(),
        "invited_at": now,
        "accepted_at": None,
        "linked_user_id": str(target_user["_id"]),
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
        # Pending invites still belong in the default view — only archived
        # friends are hidden until the caller explicitly asks for them.
        query["status"] = {"$in": [FriendStatus.ACTIVE.value, FriendStatus.PENDING.value]}
    cursor = db.friends.find(query).sort("name", 1)
    docs = await cursor.to_list(length=500)
    balances = await get_balances(user_id)
    balance_map = {b.person_id: (b.net_balance_minor, b.currency) for b in balances}
    return [_doc_to_response(d, *balance_map.get(str(d["_id"]), (0, "INR"))) for d in docs]


async def get_friend(user_id: str, friend_id: str) -> FriendResponse:
    db = get_database()
    doc = await db.friends.find_one(
        {"_id": ObjectId(friend_id), "owner_user_id": ObjectId(user_id)}
    )
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Friend not found.")
    balances = await get_balances(user_id)
    net_balance_minor, currency = next(
        ((b.net_balance_minor, b.currency) for b in balances if b.person_id == friend_id),
        (0, "INR"),
    )
    return _doc_to_response(doc, net_balance_minor, currency)


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
    """Toggle archive status. Archiving (rather than deleting) preserves financial history."""
    db = get_database()
    current = await db.friends.find_one(
        {"_id": ObjectId(friend_id), "owner_user_id": ObjectId(user_id)}
    )
    if not current:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Friend not found.")
    if current.get("status") == FriendStatus.PENDING.value:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This invite hasn't been accepted yet. Cancel the invite instead of archiving.",
        )
    new_status = (
        FriendStatus.ACTIVE.value
        if current.get("status") == FriendStatus.ARCHIVED.value
        else FriendStatus.ARCHIVED.value
    )
    result = await db.friends.find_one_and_update(
        {"_id": ObjectId(friend_id), "owner_user_id": ObjectId(user_id)},
        {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc)}},
        return_document=True,
    )
    return _doc_to_response(result)


async def resend_invite(user_id: str, friend_id: str) -> FriendResponse:
    """Regenerate the invite token/timestamp for a still-pending friend."""
    db = get_database()
    current = await db.friends.find_one(
        {"_id": ObjectId(friend_id), "owner_user_id": ObjectId(user_id)}
    )
    if not current:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Friend not found.")
    if current.get("status") != FriendStatus.PENDING.value:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This friend has already accepted the invite.",
        )
    now = datetime.now(timezone.utc)
    result = await db.friends.find_one_and_update(
        {"_id": ObjectId(friend_id)},
        {"$set": {"invite_token": _generate_invite_token(), "invited_at": now, "updated_at": now}},
        return_document=True,
    )
    return _doc_to_response(result)


async def get_invite_info(token: str) -> InviteInfo:
    """Public lookup used by the accept-invite page, before the invitee has logged in."""
    db = get_database()
    doc = await db.friends.find_one({"invite_token": token})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="This invite link is invalid.")
    inviter = await db.users.find_one({"_id": doc["owner_user_id"]})
    return InviteInfo(
        friend_name=doc["name"],
        friend_email=doc["email"],
        inviter_name=inviter["name"] if inviter else "Someone",
        status=doc.get("status", FriendStatus.PENDING),
    )


async def accept_invite(user_id: str, token: str) -> InviteAcceptResponse:
    """The invite can only be accepted while logged in as the exact account it
    was addressed to — otherwise anyone who gets hold of the link could accept
    it on someone else's behalf."""
    db = get_database()
    doc = await db.friends.find_one({"invite_token": token})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="This invite link is invalid.")
    if doc.get("linked_user_id") != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This invite is addressed to a different Suraty account. Log in as that account to accept it.",
        )
    if doc.get("status") != FriendStatus.PENDING.value:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This invite has already been accepted.")
    now = datetime.now(timezone.utc)
    await db.friends.update_one(
        {"_id": doc["_id"]},
        {"$set": {"status": FriendStatus.ACTIVE.value, "accepted_at": now, "updated_at": now}},
    )
    inviter = await db.users.find_one({"_id": doc["owner_user_id"]})
    return InviteAcceptResponse(
        friend_name=doc["name"],
        inviter_name=inviter["name"] if inviter else "Someone",
        accepted_at=now,
    )


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
