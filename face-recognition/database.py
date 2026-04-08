import mysql.connector
import json
from typing import List, Optional, Dict, Any
from config import DB_CONFIG

class DatabaseService:
    def __init__(self):
        self.connection = None

    def connect(self):
        if not self.connection or not self.connection.is_connected():
            self.connection = mysql.connector.connect(**DB_CONFIG)

    def disconnect(self):
        if self.connection and self.connection.is_connected():
            self.connection.close()

    def get_face_descriptor(self, user_id: str) -> Optional[List[float]]:
        """Get face descriptor for a user"""
        try:
            self.connect()
            cursor = self.connection.cursor()

            cursor.execute("SELECT faceDescriptor FROM users WHERE id = %s", (user_id,))
            result = cursor.fetchone()

            if result and result[0]:
                # faceDescriptor is stored as JSON string
                return json.loads(result[0])
            return None
        except Exception as e:
            print(f"Error getting face descriptor: {e}")
            return None
        finally:
            cursor.close()

    def save_face_descriptor(self, user_id: str, descriptor: List[float]) -> bool:
        """Save face descriptor for a user"""
        try:
            self.connect()
            cursor = self.connection.cursor()

            # Convert descriptor to JSON string
            descriptor_json = json.dumps(descriptor)

            cursor.execute(
                "UPDATE users SET faceDescriptor = %s WHERE id = %s",
                (descriptor_json, user_id)
            )

            self.connection.commit()
            return cursor.rowcount > 0
        except Exception as e:
            print(f"Error saving face descriptor: {e}")
            self.connection.rollback()
            return False
        finally:
            cursor.close()

    def get_all_face_descriptors(self) -> Dict[str, List[float]]:
        """Get all face descriptors for recognition"""
        descriptors = {}
        try:
            self.connect()
            cursor = self.connection.cursor()

            cursor.execute("SELECT id, faceDescriptor FROM users WHERE faceDescriptor IS NOT NULL")
            results = cursor.fetchall()

            for user_id, descriptor_json in results:
                if descriptor_json:
                    descriptors[user_id] = json.loads(descriptor_json)

        except Exception as e:
            print(f"Error getting all face descriptors: {e}")
        finally:
            cursor.close()

        return descriptors

    def user_exists(self, user_id: str) -> bool:
        """Check if user exists"""
        try:
            self.connect()
            cursor = self.connection.cursor()

            cursor.execute("SELECT id FROM users WHERE id = %s", (user_id,))
            result = cursor.fetchone()

            return result is not None
        except Exception as e:
            print(f"Error checking user existence: {e}")
            return False
        finally:
            cursor.close()