from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import verify_access_token
from app.models.user import RefreshRequest, TokenResponse, UserCreate, UserLogin, UserResponse, UserUpdate
from app.services import auth_service
from app.services.auth_service import get_current_user_doc

router = APIRouter(prefix="/auth", tags=["auth"])
bearer = HTTPBearer()


async def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(bearer)) -> str:
    payload = verify_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload["sub"]


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(data: UserCreate):
    return await auth_service.register_user(data)


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin):
    return await auth_service.login_user(data)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(data: RefreshRequest):
    return await auth_service.refresh_tokens(data.refresh_token)


@router.get("/me", response_model=UserResponse)
async def me(user_id: str = Depends(get_current_user_id)):
    doc = await get_current_user_doc(user_id)
    return UserResponse(
        id=str(doc["_id"]),
        name=doc["name"],
        email=doc["email"],
        currency=doc.get("currency", "INR"),
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
    )


@router.patch("/me", response_model=UserResponse)
async def update_me(data: UserUpdate, user_id: str = Depends(get_current_user_id)):
    return await auth_service.update_user(user_id, data.name, data.currency)

