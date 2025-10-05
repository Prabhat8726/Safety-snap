from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from datetime import datetime
from typing import Optional
import os
import json
from pathlib import Path
from database import init_db, get_db, check_db_health, engine
from models import Image, Label, ImageResponse, ImageListResponse, AnalyticsResponse, Detection
from ppe_detector import PPEDetector

app = FastAPI(title="SafetySnap API", description="PPE Detection System", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
detector = PPEDetector()
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

@app.on_event("startup")
def on_startup():
    print("🚀 Starting SafetySnap API...")
    init_db()
    print("✅ Database initialized")

@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

@app.post("/api/images", response_model=ImageResponse, status_code=201)
async def upload_image(file: UploadFile = File(...), session: Session = Depends(get_db)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, "File must be an image")
    content = await file.read()
    file_hash = Image.compute_file_hash(content)
    statement = select(Image).where(Image.file_hash == file_hash)
    existing = session.exec(statement).first()
    if existing:
        return ImageResponse(id=existing.id, filename=existing.filename, file_size=existing.file_size, label=existing.label, helmet_detected=existing.helmet_detected, vest_detected=existing.vest_detected, detections=[Detection(**d) for d in existing.detections_json], detections_hash=existing.detections_hash, uploaded_at=existing.uploaded_at)
    file_path = UPLOAD_DIR / f"{file_hash}_{file.filename}"
    with open(file_path, "wb") as f:
        f.write(content)
    detections = detector.detect(str(file_path))
    label, helmet, vest = Image.determine_label(detections)
    detections_hash = Image.compute_detections_hash(detections)
    image = Image(filename=file.filename, file_path=str(file_path), file_hash=file_hash, file_size=len(content), detections=json.dumps(detections), detections_hash=detections_hash, label=label, helmet_detected=helmet, vest_detected=vest)
    session.add(image)
    session.commit()
    session.refresh(image)
    label_obj = session.exec(select(Label).where(Label.name == label)).first()
    if label_obj:
        label_obj.count += 1
        session.add(label_obj)
        session.commit()
    return ImageResponse(id=image.id, filename=image.filename, file_size=image.file_size, label=image.label, helmet_detected=image.helmet_detected, vest_detected=image.vest_detected, detections=[Detection(**d) for d in detections], detections_hash=image.detections_hash, uploaded_at=image.uploaded_at)

@app.get("/api/images", response_model=ImageListResponse)
def list_images(limit: int = Query(10, ge=1, le=100), offset: int = Query(0, ge=0), label: Optional[str] = Query(None), from_date: Optional[str] = Query(None, alias="from"), to_date: Optional[str] = Query(None, alias="to"), session: Session = Depends(get_db)):
    statement = select(Image)
    if label:
        statement = statement.where(Image.label == label)
    if from_date:
        from_dt = datetime.fromisoformat(from_date.replace('Z', '+00:00'))
        statement = statement.where(Image.uploaded_at >= from_dt)
    if to_date:
        to_dt = datetime.fromisoformat(to_date.replace('Z', '+00:00'))
        statement = statement.where(Image.uploaded_at <= to_dt)
    total = len(session.exec(statement).all())
    statement = statement.order_by(Image.uploaded_at.desc()).offset(offset).limit(limit)
    images = session.exec(statement).all()
    image_responses = [ImageResponse(id=img.id, filename=img.filename, file_size=img.file_size, label=img.label, helmet_detected=img.helmet_detected, vest_detected=img.vest_detected, detections=[Detection(**d) for d in img.detections_json], detections_hash=img.detections_hash, uploaded_at=img.uploaded_at) for img in images]
    return ImageListResponse(total=total, limit=limit, offset=offset, images=image_responses)

@app.get("/api/images/{image_id}", response_model=ImageResponse)
def get_image(image_id: int, session: Session = Depends(get_db)):
    image = session.get(Image, image_id)
    if not image:
        raise HTTPException(404, "Image not found")
    return ImageResponse(id=image.id, filename=image.filename, file_size=image.file_size, label=image.label, helmet_detected=image.helmet_detected, vest_detected=image.vest_detected, detections=[Detection(**d) for d in image.detections_json], detections_hash=image.detections_hash, uploaded_at=image.uploaded_at)

@app.delete("/api/images/{image_id}")
def delete_image(image_id: int, session: Session = Depends(get_db)):
    image = session.get(Image, image_id)
    if not image:
        raise HTTPException(404, "Image not found")
    if os.path.exists(image.file_path):
        os.remove(image.file_path)
    label_obj = session.exec(select(Label).where(Label.name == image.label)).first()
    if label_obj and label_obj.count > 0:
        label_obj.count -= 1
        session.add(label_obj)
    session.delete(image)
    session.commit()
    return {"message": "Image deleted successfully"}

@app.get("/api/labels")
def get_labels(session: Session = Depends(get_db)):
    labels = session.exec(select(Label)).all()
    return {"labels": [{"name": l.name, "description": l.description, "count": l.count} for l in labels]}

@app.get("/api/analytics", response_model=AnalyticsResponse)
def get_analytics(session: Session = Depends(get_db)):
    total = session.query(Image).count()
    compliant = session.query(Image).filter(Image.label == "compliant").count()
    non_compliant = session.query(Image).filter(Image.label == "non_compliant").count()
    helmet_detected = session.query(Image).filter(Image.helmet_detected == True).count()
    vest_detected = session.query(Image).filter(Image.vest_detected == True).count()
    compliance_pct = (compliant / total * 100) if total > 0 else 0
    helmet_rate = (helmet_detected / total * 100) if total > 0 else 0
    vest_rate = (vest_detected / total * 100) if total > 0 else 0
    labels = session.exec(select(Label)).all()
    labels_breakdown = {l.name: l.count for l in labels}
    return AnalyticsResponse(total_images=total, compliant_count=compliant, non_compliant_count=non_compliant, compliance_percentage=round(compliance_pct, 2), helmet_detection_rate=round(helmet_rate, 2), vest_detection_rate=round(vest_rate, 2), labels_breakdown=labels_breakdown)
