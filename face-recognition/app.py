from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from face_service import FaceRecognitionService
from config import FaceRegistrationRequest, FaceRecognitionRequest, FaceRecognitionResponse
import base64
from PIL import Image
import io
from logging_config import logger

app = FastAPI(title="Face Recognition API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

face_service = FaceRecognitionService()

@app.post("/register", response_model=dict)
async def register_face(request: FaceRegistrationRequest):
    """Register a face for a user"""
    logger.info(f"Face registration request for user_id: {request.user_id}")

    success, message = face_service.register_face(request.user_id, request.image_data)

    if success:
        logger.info(f"Face registered successfully for user_id: {request.user_id}")
        return {"status": "success", "message": message}
    else:
        logger.error(f"Face registration failed for user_id: {request.user_id}: {message}")
        raise HTTPException(status_code=400, detail=message)

@app.post("/recognize", response_model=FaceRecognitionResponse)
async def recognize_face(request: FaceRecognitionRequest):
    """Recognize a face from image"""
    logger.info("Face recognition request received")

    user_id, confidence, status = face_service.recognize_face(request.image_data)

    if user_id:
        logger.info(f"Face recognized: user_id={user_id}, confidence={confidence:.3f}")
    else:
        logger.warning("Face not recognized")

    return FaceRecognitionResponse(
        user_id=user_id,
        confidence=confidence,
        status=status
    )

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    logger.debug("Health check requested")
    return {
        "status": "healthy",
        "service": "face-recognition",
        "version": "1.0.0"
    }

@app.on_event("shutdown")
def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Shutting down face recognition service")
    face_service.db.disconnect()
    logger.info("Database connection closed")

@app.on_event("startup")
def startup_event():
    """Initialize on startup"""
    logger.info("Starting face recognition service")
    logger.info("Loading face recognition models...")

if __name__ == "__main__":
    logger.info("Starting FastAPI server on 0.0.0.0:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)