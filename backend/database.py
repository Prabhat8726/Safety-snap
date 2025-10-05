from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy import text
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./safetysnap.db")
connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
engine = create_engine(DATABASE_URL, echo=False, connect_args=connect_args)

def init_db():
    from models import Image, APILog, Label
    SQLModel.metadata.create_all(engine)
    print("✅ Database tables created successfully")
    seed_labels()

def seed_labels():
    from models import Label
    default_labels = [
        {"name": "compliant", "description": "Both helmet and vest detected"},
        {"name": "non_compliant", "description": "Missing helmet or vest or both"},
    ]
    with Session(engine) as session:
        existing = session.query(Label).first()
        if existing:
            print("⏭️  Labels already seeded, skipping...")
            return
        for label_data in default_labels:
            label = Label(**label_data)
            session.add(label)
        session.commit()
        print("✅ Default labels seeded successfully")

def get_db():
    with Session(engine) as session:
        yield session

def check_db_health():
    try:
        with Session(engine) as session:
            session.execute(text("SELECT 1"))
        return True
    except Exception as e:
        print(f"❌ Database health check failed: {e}")
        return False
