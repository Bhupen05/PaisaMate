from enum import Enum
from typing import Annotated, Any

from bson import ObjectId
from pydantic import BaseModel, Field, GetCoreSchemaHandler
from pydantic_core import core_schema


class PyObjectId(str):
    """Custom type to handle MongoDB ObjectId serialization."""

    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v: Any) -> str:
        if isinstance(v, ObjectId):
            return str(v)
        if isinstance(v, str) and ObjectId.is_valid(v):
            return v
        raise ValueError(f"Invalid ObjectId: {v}")

    @classmethod
    def __get_pydantic_core_schema__(
        cls, source_type: Any, handler: GetCoreSchemaHandler
    ) -> core_schema.CoreSchema:
        return core_schema.no_info_plain_validator_function(cls.validate)


class Classification(str, Enum):
    NEED = "NEED"
    WANT = "WANT"
    DREAM = "DREAM"


class ExpenseType(str, Enum):
    PERSONAL = "PERSONAL"
    SHARED = "SHARED"


class SplitMethod(str, Enum):
    EQUAL = "EQUAL"
    CUSTOM_AMOUNT = "CUSTOM_AMOUNT"
    PERCENTAGE = "PERCENTAGE"


class SettlementStatus(str, Enum):
    UNSETTLED = "UNSETTLED"
    PARTIALLY_SETTLED = "PARTIALLY_SETTLED"
    SETTLED = "SETTLED"


class FriendStatus(str, Enum):
    ACTIVE = "ACTIVE"
    ARCHIVED = "ARCHIVED"


class PersonType(str, Enum):
    USER = "USER"
    FRIEND = "FRIEND"


CATEGORIES = [
    "food",
    "transport",
    "shopping",
    "bills",
    "housing",
    "health",
    "education",
    "entertainment",
    "work",
    "travel",
    "other",
]


class BaseResponse(BaseModel):
    model_config = {"populate_by_name": True}


class MessageResponse(BaseModel):
    message: str
