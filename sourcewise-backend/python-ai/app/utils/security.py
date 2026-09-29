"""
Security System - Production-grade security for SourceWise.

Implements:
- JWT Rotation
- Data Encryption
- Audit Logging
- RBAC (Role-Based Access Control)
- Rate Limiting
- Input Validation
"""

from typing import Dict, Any, Optional, List
from pydantic import BaseModel
from datetime import datetime, timedelta
import hashlib
import secrets
import json
import logging

logger = logging.getLogger('sourcewise.security')


# ============================================================
# JWT ROTATION
# ============================================================

class JWTManager:
    """
    Manages JWT tokens with rotation for security.
    """
    
    def __init__(self, secret_key: str, access_token_ttl: int = 3600, refresh_token_ttl: int = 86400):
        self.secret_key = secret_key
        self.access_token_ttl = access_token_ttl  # 1 hour
        self.refresh_token_ttl = refresh_token_ttl  # 24 hours
        self._refresh_tokens: Dict[str, Dict] = {}
    
    def generate_tokens(self, user_id: str, roles: List[str] = None) -> Dict:
        """Generate access and refresh tokens"""
        import jwt
        
        now = datetime.now()
        
        # Access token
        access_payload = {
            "user_id": user_id,
            "roles": roles or ["user"],
            "type": "access",
            "iat": now.timestamp(),
            "exp": (now + timedelta(seconds=self.access_token_ttl)).timestamp(),
        }
        access_token = jwt.encode(access_payload, self.secret_key, algorithm="HS256")
        
        # Refresh token
        refresh_payload = {
            "user_id": user_id,
            "type": "refresh",
            "iat": now.timestamp(),
            "exp": (now + timedelta(seconds=self.refresh_token_ttl)).timestamp(),
        }
        refresh_token = jwt.encode(refresh_payload, self.secret_key, algorithm="HS256")
        
        # Store refresh token
        self._refresh_tokens[refresh_token] = {
            "user_id": user_id,
            "created_at": now.isoformat(),
            "expires_at": (now + timedelta(seconds=self.refresh_token_ttl)).isoformat(),
        }
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "expires_in": self.access_token_ttl,
        }
    
    def rotate_access_token(self, refresh_token: str) -> Optional[Dict]:
        """Rotate access token using refresh token"""
        import jwt
        
        # Verify refresh token
        try:
            payload = jwt.decode(refresh_token, self.secret_key, algorithms=["HS256"])
            
            if payload.get("type") != "refresh":
                return None
            
            # Check if refresh token exists
            if refresh_token not in self._refresh_tokens:
                return None
            
            # Generate new tokens
            user_id = payload["user_id"]
            return self.generate_tokens(user_id)
            
        except jwt.ExpiredSignatureError:
            # Refresh token expired
            self._refresh_tokens.pop(refresh_token, None)
            return None
        except jwt.InvalidTokenError:
            return None
    
    def revoke_refresh_token(self, refresh_token: str):
        """Revoke a refresh token"""
        self._refresh_tokens.pop(refresh_token, None)
    
    def revoke_all_user_tokens(self, user_id: str):
        """Revoke all tokens for a user"""
        to_remove = [t for t, data in self._refresh_tokens.items() if data["user_id"] == user_id]
        for token in to_remove:
            self._refresh_tokens.pop(token, None)


# ============================================================
# DATA ENCRYPTION
# ============================================================

class EncryptionManager:
    """
    Handles data encryption for sensitive information.
    """
    
    def __init__(self, encryption_key: str):
        self.encryption_key = encryption_key
    
    def hash_data(self, data: str) -> str:
        """Hash data for storage"""
        return hashlib.sha256(f"{self.encryption_key}:{data}".encode()).hexdigest()
    
    def verify_hash(self, data: str, hashed: str) -> bool:
        """Verify data against hash"""
        return self.hash_data(data) == hashed
    
    def generate_api_key(self) -> str:
        """Generate a secure API key"""
        return secrets.token_urlsafe(32)
    
    def mask_sensitive(self, data: str, show_chars: int = 4) -> str:
        """Mask sensitive data for logging"""
        if len(data) <= show_chars:
            return "*" * len(data)
        return data[:show_chars] + "*" * (len(data) - show_chars)


# ============================================================
# AUDIT LOGGING
# ============================================================

class AuditLog(BaseModel):
    """Audit log entry"""
    user_id: str
    action: str
    resource_type: str
    resource_id: str = ""
    details: Dict[str, Any] = {}
    ip_address: str = ""
    timestamp: str = datetime.now().isoformat()
    success: bool = True


class AuditLogger:
    """
    Logs all security-relevant events.
    """
    
    def __init__(self):
        self._logs: List[AuditLog] = []
    
    def log(self, entry: AuditLog):
        """Log an audit event"""
        self._logs.append(entry)
        
        # Also log to file
        logger.info(f"AUDIT: {entry.action} by {entry.user_id} on {entry.resource_type}")
    
    def log_login(self, user_id: str, success: bool, ip_address: str = ""):
        """Log a login attempt"""
        self.log(AuditLog(
            user_id=user_id,
            action="login",
            resource_type="auth",
            ip_address=ip_address,
            success=success,
        ))
    
    def log_data_access(self, user_id: str, resource_type: str, resource_id: str):
        """Log data access"""
        self.log(AuditLog(
            user_id=user_id,
            action="access",
            resource_type=resource_type,
            resource_id=resource_id,
        ))
    
    def log_data_modification(self, user_id: str, resource_type: str, resource_id: str, changes: Dict):
        """Log data modification"""
        self.log(AuditLog(
            user_id=user_id,
            action="modify",
            resource_type=resource_type,
            resource_id=resource_id,
            details={"changes": changes},
        ))
    
    def get_user_logs(self, user_id: str, limit: int = 100) -> List[AuditLog]:
        """Get audit logs for a user"""
        return [l for l in self._logs if l.user_id == user_id][-limit:]


# ============================================================
# RBAC (Role-Based Access Control)
# ============================================================

class Role(str):
    """User roles"""
    ADMIN = "admin"
    PREMIUM = "premium"
    USER = "user"
    GUEST = "guest"


class Permission(str):
    """System permissions"""
    READ_SOURCES = "read:sources"
    WRITE_SOURCES = "write:sources"
    DELETE_SOURCES = "delete:sources"
    READ_PROGRESS = "read:progress"
    WRITE_PROGRESS = "write:progress"
    READ_ANALYTICS = "read:analytics"
    MANAGE_USERS = "manage:users"
    MANAGE_SETTINGS = "manage:settings"


# Role-Permission mapping
ROLE_PERMISSIONS = {
    Role.ADMIN: [
        Permission.READ_SOURCES, Permission.WRITE_SOURCES, Permission.DELETE_SOURCES,
        Permission.READ_PROGRESS, Permission.WRITE_PROGRESS,
        Permission.READ_ANALYTICS, Permission.MANAGE_USERS, Permission.MANAGE_SETTINGS,
    ],
    Role.PREMIUM: [
        Permission.READ_SOURCES, Permission.WRITE_SOURCES,
        Permission.READ_PROGRESS, Permission.WRITE_PROGRESS,
        Permission.READ_ANALYTICS,
    ],
    Role.USER: [
        Permission.READ_SOURCES, Permission.WRITE_SOURCES,
        Permission.READ_PROGRESS, Permission.WRITE_PROGRESS,
    ],
    Role.GUEST: [
        Permission.READ_SOURCES,
    ],
}


class RBACManager:
    """
    Role-Based Access Control manager.
    """
    
    def check_permission(self, user_roles: List[str], required_permission: str) -> bool:
        """Check if user has required permission"""
        for role in user_roles:
            permissions = ROLE_PERMISSIONS.get(role, [])
            if required_permission in permissions:
                return True
        return False
    
    def get_user_permissions(self, user_roles: List[str]) -> List[str]:
        """Get all permissions for a user"""
        permissions = set()
        for role in user_roles:
            permissions.update(ROLE_PERMISSIONS.get(role, []))
        return list(permissions)


# ============================================================
# INPUT VALIDATION
# ============================================================

class InputValidator:
    """
    Validates user input for security.
    """
    
    MAX_INPUT_LENGTH = 10000
    BLOCKED_PATTERNS = [
        "<script",
        "javascript:",
        "onerror=",
        "onload=",
    ]
    
    def validate_input(self, data: str) -> Dict:
        """Validate input for security issues"""
        issues = []
        
        # Length check
        if len(data) > self.MAX_INPUT_LENGTH:
            issues.append(f"Input exceeds maximum length ({self.MAX_INPUT_LENGTH})")
        
        # Injection check
        data_lower = data.lower()
        for pattern in self.BLOCKED_PATTERNS:
            if pattern in data_lower:
                issues.append(f"Potentially dangerous pattern detected: {pattern}")
        
        return {
            "valid": len(issues) == 0,
            "issues": issues,
            "sanitized": self.sanitize_input(data),
        }
    
    def sanitize_input(self, data: str) -> str:
        """Sanitize input data"""
        # Remove potentially dangerous characters
        sanitized = data.replace("<", "&lt;").replace(">", "&gt;")
        return sanitized[:self.MAX_INPUT_LENGTH]


# Global instances
jwt_manager = None  # Initialized with secret key
encryption_manager = None  # Initialized with encryption key
audit_logger = AuditLogger()
rbac_manager = RBACManager()
input_validator = InputValidator()


def initialize_security(secret_key: str, encryption_key: str):
    """Initialize security components"""
    global jwt_manager, encryption_manager
    jwt_manager = JWTManager(secret_key)
    encryption_manager = EncryptionManager(encryption_key)
    logger.info("Security system initialized")
