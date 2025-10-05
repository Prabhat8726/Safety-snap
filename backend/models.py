from sqlmodel import SQLModel, Field
from datetime import datetime
from typing import Optional
import hashlib
import json
from pydantic import BaseModel

class Image(SQLModel, table=True):
    __tablename__ = "images"
    id: Optional[int] = Field(default=None, primary_key=True)
    filename: str = Field(index=True)
    file_path: str
    file_hash: str = Field(index=True, unique=True)
    file_size: int
    detections: str
    detections_hash: str = Field(index=True)
    label: str = Field(index=True)
    helmet_detected: bool = Field(default=False, index=True)
    vest_detected: bool = Field(default=False, index=True)
    uploaded_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    
    @property
    def detections_json(self):
        return json.loads(self.detections) if self.detections else []
    
    @staticmethod
    def compute_file_hash(file_content):
        return hashlib.sha256(file_content).hexdigest()
    
    @staticmethod
    def compute_detections_hash(detections):
        sorted_detections = sorted(detections, key=lambda x: (x.get('class', ''), x.get('confidence', 0)))
        detection_str = json.dumps(sorted_detections, sort_keys=True)
        return hashlib.sha256(detection_str.encode()).hexdigest()
    
    @staticmethod
    def determine_label(detections):
        helmet_found = any(d.get('class') == 'helmet' for d in detections)
        vest_found = any(d.get('class') == 'vest' for d in detections)
        label = "compliant" if (helmet_found and vest_found) else "non_compliant"
        return label, helmet_found, vest_found

class APILog(SQLModel, table=True):
    __tablename__ = "api_logs"
    id: Optional[int] = Field(default=None, primary_key=True)
    endpoint: str = Field(index=True)
    method: str
    ip_address: str = Field(index=True)
    user_agent: Optional[str] = None
    status_code: int
    response_time_ms: float
    timestamp: datetime = Field(default_factory=datetime.utcnow, index=True)

class Label(SQLModel, table=True):
    __tablename__ = "labels"
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True)
    description: str
    count: int = Field(default=0)

class Detection(BaseModel):
    class_name: str = Field(alias="class")
    confidence: float
    bbox: list[float]
    class Config:
        populate_by_name = True

class ImageResponse(BaseModel):
    id: int
    filename: str
    file_size: int
    label: str
    helmet_detected: bool
    vest_detected: bool
    detections: list[Detection]
    detections_hash: str
    uploaded_at: datetime

class ImageListResponse(BaseModel):
    total: int
    limit: int
    offset: int
    images: list[ImageResponse]

class AnalyticsResponse(BaseModel):
    total_images: int
    compliant_count: int
    non_compliant_count: int
    compliance_percentage: float
    helmet_detection_rate: float
    vest_detection_rate: float
    labels_breakdown: dict[str, int]
