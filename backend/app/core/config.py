from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Home & Friends Platform"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "CHANGE_THIS_TO_A_SECURE_RANDOM_KEY_IN_PRODUCTION_928374"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 Days
    
    # Database
    DATABASE_URL: str = "sqlite:///./database_v2.db"

    class Config:
        case_sensitive = True

settings = Settings()
