from pydantic import AnyHttpUrl, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = Field(default="local", alias="APP_ENV")
    database_url: str = Field(default="postgresql://crushermitra:crushermitra@localhost:5432/crushermitra", alias="DATABASE_URL")
    redis_url: str = Field(default="redis://localhost:6379/0", alias="REDIS_URL")
    web_app_url: AnyHttpUrl = Field(default="http://localhost:3000", alias="NEXT_PUBLIC_APP_URL")


settings = Settings()

