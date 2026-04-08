"""
Face Recognition Service
Core ML logic for face detection and recognition
"""

import numpy as np
from PIL import Image
import io
import base64
from typing import List, Optional, Tuple
from database import DatabaseService
from config import FACE_RECOGNITION_THRESHOLD, MAX_FACES_PER_IMAGE
import logging

logger = logging.getLogger(__name__)

class FaceRecognitionService:
    def __init__(self):
        self.db = DatabaseService()
        self._mock_mode = True  # Set to True for demo purposes

        try:
            import face_recognition
            self._mock_mode = False
            logger.info("✅ Face recognition library loaded successfully")
        except ImportError:
            logger.warning("⚠️  face_recognition library not available. Running in mock mode.")
            logger.warning("To enable real face recognition, install dlib and face-recognition:")
            logger.warning("pip install dlib face-recognition")
            self._mock_face_recognition = self._create_mock_face_recognition()

    def _create_mock_face_recognition(self):
        """Create mock face recognition functions for demo purposes"""
        class MockFaceRecognition:
            @staticmethod
            def face_locations(image):
                # Return mock face location (top, right, bottom, left)
                height, width = image.shape[:2]
                return [(height//4, width*3//4, height*3//4, width//4)]

            @staticmethod
            def face_encodings(image_array, face_locations):
                # Return a mock 128-dimensional face encoding
                return [np.random.rand(128).tolist()]

            @staticmethod
            def compare_faces(known_encodings, face_encoding, tolerance=0.6):
                # Mock comparison - return random results
                return [np.random.random() < 0.1]  # 10% chance of match

            @staticmethod
            def face_distance(known_encodings, face_encoding):
                # Mock distance calculation
                return np.random.rand(len(known_encodings))

        return MockFaceRecognition()

    def _decode_image(self, image_data: str) -> Optional[Image.Image]:
        """Decode base64 image data to PIL Image"""
        try:
            # Remove data URL prefix if present
            if ',' in image_data:
                image_data = image_data.split(',')[1]

            image_bytes = base64.b64decode(image_data)
            image = Image.open(io.BytesIO(image_bytes))
            return image
        except Exception as e:
            logger.error(f"Error decoding image: {e}")
            return None

    def _get_face_encoding(self, image: Image.Image) -> Optional[np.ndarray]:
        """Extract face encoding from image"""
        try:
            # Convert PIL to numpy array
            image_array = np.array(image)

            if self._mock_mode:
                # Mock mode: return random encoding
                face_locations = self._mock_face_recognition.face_locations(image_array)
                if face_locations:
                    return np.array(self._mock_face_recognition.face_encodings(image_array, face_locations)[0])
                else:
                    return None
            else:
                # Real mode: use face_recognition library
                import face_recognition

                # Find faces in the image
                face_locations = face_recognition.face_locations(image_array)

                if len(face_locations) == 0:
                    return None
                elif len(face_locations) > MAX_FACES_PER_IMAGE:
                    logger.warning(f"Multiple faces detected ({len(face_locations)}), using first one")
                    # Use only the first face found
                    face_locations = [face_locations[0]]

                # Get face encodings
                face_encodings = face_recognition.face_encodings(image_array, face_locations)

                if len(face_encodings) > 0:
                    return face_encodings[0]
                else:
                    return None

        except Exception as e:
            logger.error(f"Error getting face encoding: {e}")
            return None

    def register_face(self, user_id: str, image_data: str) -> Tuple[bool, str]:
        """Register a face for a user"""
        try:
            logger.info(f"Registering face for user: {user_id}")

            image = self._decode_image(image_data)
            if image is None:
                return False, "Invalid image data"

            face_encoding = self._get_face_encoding(image)
            if face_encoding is None:
                return False, "No face detected in image"

            # Store in database
            success = self.db.store_face_descriptor(user_id, face_encoding.tolist())

            if success:
                logger.info(f"Face registered successfully for user: {user_id}")
                return True, "Face registered successfully"
            else:
                logger.error(f"Failed to store face descriptor for user: {user_id}")
                return False, "Failed to store face data"

        except Exception as e:
            logger.error(f"Error registering face: {e}")
            return False, f"Registration failed: {str(e)}"

    def recognize_face(self, image_data: str) -> Tuple[Optional[str], float, str]:
        """Recognize a face from image data"""
        try:
            logger.info("Recognizing face from image")

            image = self._decode_image(image_data)
            if image is None:
                return None, 0.0, "invalid_image"

            face_encoding = self._get_face_encoding(image)
            if face_encoding is None:
                return None, 0.0, "no_face_detected"

            # Compare with all stored faces
            users = self.db.get_all_users_with_faces()
            if not users:
                return None, 0.0, "no_registered_faces"

            best_match = None
            best_confidence = 0.0

            for user in users:
                stored_encoding = np.array(user['face_descriptor'])

                if self._mock_mode:
                    # Mock comparison
                    matches = self._mock_face_recognition.compare_faces([stored_encoding], face_encoding.tolist())
                    if matches[0]:
                        distances = self._mock_face_recognition.face_distance([stored_encoding], face_encoding.tolist())
                        confidence = 1.0 - distances[0]
                    else:
                        confidence = 0.0
                else:
                    # Real comparison
                    import face_recognition
                    matches = face_recognition.compare_faces([stored_encoding], face_encoding, tolerance=FACE_RECOGNITION_THRESHOLD)
                    if matches[0]:
                        distances = face_recognition.face_distance([stored_encoding], face_encoding)
                        confidence = 1.0 - distances[0]
                    else:
                        confidence = 0.0

                if confidence > best_confidence:
                    best_confidence = confidence
                    best_match = user['id']

            if best_match and best_confidence > 0.7:  # Minimum confidence threshold
                logger.info(f"Face recognized: {best_match} (confidence: {best_confidence:.3f})")
                return best_match, best_confidence, "success"
            else:
                logger.info("Face not recognized")
                return None, 0.0, "no_match"

        except Exception as e:
            logger.error(f"Error recognizing face: {e}")
            return None, 0.0, f"recognition_error: {str(e)}"