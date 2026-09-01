import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "RecoverAI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Mode Settings
    RAZORPAY_MODE: str = os.getenv("RAZORPAY_MODE", "SIMULATION") # "TEST" or "SIMULATION"
    
    # Razorpay Credentials (Optional for simulation mode)
    RAZORPAY_KEY_ID: str = os.getenv("RAZORPAY_KEY_ID", "rzp_test_mockkey123456789")
    RAZORPAY_KEY_SECRET: str = os.getenv("RAZORPAY_KEY_SECRET", "mock_secret_key_abcdef123456")
    RAZORPAY_WEBHOOK_SECRET: str = os.getenv("RAZORPAY_WEBHOOK_SECRET", "mock_webhook_secret_987654321")
    
    # AI / LLM Config
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY", None)
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY", None)
    
    # Database
    # Support SQLite out-of-the-box for local dev, PostgreSQL for production/docker
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", "sqlite:///./recover_ai.db"
    )
    

  # Policy Defaults
    MAX_AUTOMATIC_RETRIES: int = 2
    MAX_AUTOMATIC_RECOVERY_AMOUNT: float = 10000.0  # ₹10,000 INR
    MAX_DISCOUNT_PERCENT: float = 10.0
    MIN_AI_CONFIDENCE: float = 0.70  # 70% confidence threshold

    class Config:
        case_sensitive = True

settings = Settings()
