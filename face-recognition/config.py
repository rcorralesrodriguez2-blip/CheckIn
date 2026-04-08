import os
from typing import List, Optional
from pydantic import BaseModel

# Database configuration
DB_CONFIG = {
    'host': os.getenv('DB_HOST', '127.0.0.1'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
    'database': os.getenv('DB_NAME', 'checkin_db')
}

# Face recognition configuration
FACE_RECOGNITION_THRESHOLD = 0.6  # Similarity threshold for face matching
MAX_FACES_PER_IMAGE = 1  # Only process one face per image

class FaceDescriptor(BaseModel):
    descriptor: List[float]

class FaceRegistrationRequest(BaseModel):
    user_id: str
    image_data: str  # Base64 encoded image

class FaceRecognitionRequest(BaseModel):
    image_data: str  # Base64 encoded image

class FaceRecognitionResponse(BaseModel):
    user_id: Optional[str]
    confidence: float
    status: str  # 'success', 'no_face', 'multiple_faces', 'not_recognized'