import os
import time

from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://reliability:reliability@postgres:5432/reliability_store")

engine = create_engine(DATABASE_URL, future=True, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def wait_for_database(max_attempts: int = 30, sleep_seconds: float = 1.0) -> None:
    last_error: OperationalError | None = None
    for attempt in range(1, max_attempts + 1):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return
        except OperationalError as exc:
            last_error = exc
            if attempt == max_attempts:
                raise
            time.sleep(sleep_seconds)
    raise last_error  # pragma: no cover


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
