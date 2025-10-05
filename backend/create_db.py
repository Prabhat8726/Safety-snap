import os
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from database import init_db, check_db_health, engine
from models import Image, Label
from sqlmodel import Session, select
import json
from datetime import datetime, timedelta
import random

def create_sample_data():
    print("\n📊 Creating sample data...")
    sample_detections = [
        {"filename": "worker_1.jpg", "detections": [{"class": "helmet", "confidence": 0.95, "bbox": [0.2, 0.1, 0.5, 0.4]}, {"class": "vest", "confidence": 0.92, "bbox": [0.3, 0.4, 0.7, 0.9]}]},
        {"filename": "worker_2.jpg", "detections": [{"class": "helmet", "confidence": 0.88, "bbox": [0.3, 0.15, 0.6, 0.45]}]},
        {"filename": "worker_3.jpg", "detections": [{"class": "vest", "confidence": 0.91, "bbox": [0.25, 0.35, 0.75, 0.95]}]},
    ]
    with Session(engine) as session:
        for idx, sample in enumerate(sample_detections, 1):
            label, helmet, vest = Image.determine_label(sample["detections"])
            detections_json = json.dumps(sample["detections"])
            image = Image(filename=sample["filename"], file_path=f"/uploads/{sample['filename']}", file_hash=f"sample_hash_{idx}", file_size=random.randint(100000, 500000), detections=detections_json, detections_hash=Image.compute_detections_hash(sample["detections"]), label=label, helmet_detected=helmet, vest_detected=vest, uploaded_at=datetime.utcnow() - timedelta(days=random.randint(0, 30)))
            session.add(image)
        session.commit()
        print(f"✅ Created {len(sample_detections)} sample images")

def main():
    print("🚀 SafetySnap Database Setup")
    print("="*50)
    db_path = "safetysnap.db"
    if os.path.exists(db_path):
        response = input(f"\n⚠️  Database '{db_path}' already exists. Recreate? (y/N): ")
        if response.lower() != 'y':
            print("❌ Aborted.")
            return
        os.remove(db_path)
        print(f"🗑️  Deleted existing database")
    print("\n🔨 Creating database tables...")
    init_db()
    print("\n🏥 Running health check...")
    if check_db_health():
        print("✅ Database is healthy and accessible")
    else:
        print("❌ Database health check failed")
        return
    response = input("\n📊 Create sample data for testing? (Y/n): ")
    if response.lower() != 'n':
        create_sample_data()
    print("\n✅ Database setup complete!")
    print(f"📁 Database file: {os.path.abspath(db_path)}")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Setup interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error during setup: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
