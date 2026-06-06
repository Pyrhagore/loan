import os
from pydantic_settings import BaseSettings
from functools import lru_cache
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    app_name: str = "Loan Management System"
    postgres_user: str = os.getenv("POSTGRES_USER", "postgres")
    postgres_password: str = os.getenv("POSTGRES_PASSWORD", "postgres")
    postgres_db: str = os.getenv("POSTGRES_DB", "loan_db")
    postgres_host: str = os.getenv("POSTGRES_HOST", "localhost")
    postgres_port: str = os.getenv("POSTGRES_PORT", "5432")
    
    database_url: str = os.getenv(
        "DATABASE_URL",
        f"postgresql://{os.getenv('POSTGRES_USER', 'postgres')}:{os.getenv('POSTGRES_PASSWORD', 'postgres')}@{os.getenv('POSTGRES_HOST', 'localhost')}:{os.getenv('POSTGRES_PORT', '5432')}/{os.getenv('POSTGRES_DB', 'loan_db')}"
    )
    
    secret_key: str = os.getenv("SECRET_KEY", "your-secret-key")
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 # 24 hours
    
    fedapay_public_key: str = os.getenv("FEDAPAY_PUBLIC_KEY", "")
    fedapay_secret_key: str = os.getenv("FEDAPAY_SECRET_KEY", "")
    fedapay_api_url: str = os.getenv("FEDAPAY_API_URL", "https://sandbox-api.fedapay.com/v1")
    
    frontend_url: str = os.getenv("FRONTEND_URL", "http://localhost:3000")

@lru_cache()
def get_settings():
    return Settings()
