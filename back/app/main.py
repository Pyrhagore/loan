from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .database_init import init_admin_user
from .routes import auth, loans, users
from .config import get_settings

settings = get_settings()

# Create tables
Base.metadata.create_all(bind=engine)
init_admin_user()

app = FastAPI(title="Loan Management API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://bgmicrofinanance.vercel.app",
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(loans.router)
app.include_router(users.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to Loan Management System API"}
