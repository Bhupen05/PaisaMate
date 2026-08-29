import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, expenses, friends, shared_expenses, settlements, recurring, analytics
from app.db.database import close_database
from app.services.recurring_service import process_due_recurring_expenses

logger = logging.getLogger("suraty.recurring")

RECURRING_CHECK_INTERVAL_SECONDS = 3600


async def _recurring_scheduler_loop() -> None:
    """Posts due recurring expenses on startup, then re-checks hourly."""
    while True:
        try:
            created = await process_due_recurring_expenses()
            if created:
                logger.info("Posted %d recurring expense(s).", created)
        except Exception:
            logger.exception("Recurring expense scheduler tick failed.")
        await asyncio.sleep(RECURRING_CHECK_INTERVAL_SECONDS)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    scheduler_task = asyncio.create_task(_recurring_scheduler_loop())
    yield
    # Shutdown
    scheduler_task.cancel()
    try:
        await scheduler_task
    except asyncio.CancelledError:
        pass
    await close_database()


app = FastAPI(
    title="Suraty — Daily Finance With Friends",
    description="Personal finance and shared expense tracking API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router, prefix="/api")
app.include_router(expenses.router, prefix="/api")
app.include_router(friends.router, prefix="/api")
app.include_router(shared_expenses.router, prefix="/api")
app.include_router(shared_expenses.balances_router, prefix="/api")
app.include_router(settlements.router, prefix="/api")
app.include_router(recurring.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "suraty-api"}
