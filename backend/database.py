"""
Database configuration and models
Currently using in-memory storage, can be replaced with SQLAlchemy ORM
"""

from typing import List, Optional

# For future database integration
class User:
    def __init__(self, id: str, email: str, password_hash: str):
        self.id = id
        self.email = email
        self.password_hash = password_hash

class Summary:
    def __init__(
        self,
        id: str,
        user_id: str,
        filename: str,
        action_points: List[str],
        recommendations: str,
        created_at: str
    ):
        self.id = id
        self.user_id = user_id
        self.filename = filename
        self.action_points = action_points
        self.recommendations = recommendations
        self.created_at = created_at
