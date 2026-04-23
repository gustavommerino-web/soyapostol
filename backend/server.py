from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import logging
from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient

from auth import router as auth_router, seed_admin, ensure_indexes
from readings import router as readings_router
from liturgy import router as liturgy_router
from prayers import router as prayers_router
from examen import router as examen_router
from news import router as news_router
from bible import router as bible_router
from catechism import router as catechism_router
from favorites import router as favorites_router

# MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="Apostol API")
api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root():
    return {"message": "Apostol API", "status": "ok"}


# Mount sub-routers under /api
api_router.include_router(auth_router)
api_router.include_router(readings_router)
api_router.include_router(liturgy_router)
api_router.include_router(prayers_router)
api_router.include_router(examen_router)
api_router.include_router(news_router)
api_router.include_router(bible_router)
api_router.include_router(catechism_router)
api_router.include_router(favorites_router)

app.include_router(api_router)

_cors_origins = [o.strip() for o in os.environ.get('CORS_ORIGINS', '*').split(',') if o.strip()]
_allow_credentials = "*" not in _cors_origins  # browsers forbid credentials + wildcard

app.add_middleware(
    CORSMiddleware,
    allow_credentials=_allow_credentials,
    allow_origins=_cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Share db via app.state
app.state.db = db

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def on_startup():
    await ensure_indexes(db)
    await seed_admin(db)
    logger.info("Apostol API started")


@app.on_event("shutdown")
async def on_shutdown():
    client.close()
