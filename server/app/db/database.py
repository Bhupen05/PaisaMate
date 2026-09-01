import certifi
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import settings

_client: AsyncIOMotorClient | None = None


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(settings.mongodb_url, tlsCAFile=certifi.where())
    return _client


def get_database() -> AsyncIOMotorDatabase:
    return get_client()[settings.db_name]


async def close_database():
    global _client
    if _client is not None:
        _client.close()
        _client = None
