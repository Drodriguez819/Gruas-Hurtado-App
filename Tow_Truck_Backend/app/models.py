from app import db
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(120), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='user')
    is_temporary_password = db.Column(db.Boolean, default=False)  # Track if password is temporary
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def set_password(self, password, is_temporary=False):
        self.password_hash = generate_password_hash(password)
        self.is_temporary_password = is_temporary
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'name': self.name,
            'role': self.role,
            'is_temporary_password': self.is_temporary_password,
            'created_at': self.created_at.isoformat()
        }

class ClientProfile(db.Model):
    __tablename__ = 'client_profiles'
    
    id = db.Column(db.Integer, primary_key=True)
    customer_first_name = db.Column(db.String(80), nullable=False)
    customer_last_name = db.Column(db.String(80), nullable=False)
    customer_phone = db.Column(db.String(20), nullable=False)
    created_by = db.Column(db.String(80), nullable=False)
    created_by_name = db.Column(db.String(120), nullable=False)
    last_edited_by = db.Column(db.String(80), nullable=False)
    last_edited_by_name = db.Column(db.String(120), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_edited_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'CustomerFirstName': self.customer_first_name,
            'CustomerLastName': self.customer_last_name,
            'CustomerPhone': self.customer_phone,
            'createdBy': self.created_by,
            'createdByName': self.created_by_name,
            'lastEditedBy': self.last_edited_by,
            'lastEditedByName': self.last_edited_by_name,
            'lastEditedDate': self.last_edited_at.strftime('%Y-%m-%d')
        }

class ServiceRequest(db.Model):
    __tablename__ = 'service_requests'
    
    id = db.Column(db.Integer, primary_key=True)
    client_id = db.Column(db.Integer, db.ForeignKey('client_profiles.id'), nullable=False)
    vehicle_year = db.Column(db.String(4), nullable=False)
    vehicle_make = db.Column(db.String(80), nullable=False)
    vehicle_model = db.Column(db.String(80), nullable=False)
    vehicle_plate = db.Column(db.String(20), nullable=False)
    vehicle_color = db.Column(db.String(30), nullable=False)
    vehicle_location = db.Column(db.String(255), nullable=False)
    is_dangerous = db.Column(db.Boolean, default=False)
    has_heavy_traffic = db.Column(db.Boolean, default=False)
    job_type = db.Column(db.String(50), nullable=False)
    description = db.Column(db.Text, nullable=False)
    priority = db.Column(db.String(20), nullable=False, default='Medium')
    status = db.Column(db.String(20), nullable=False, default='Pending')
    assigned_to = db.Column(db.String(80), nullable=True)
    assigned_to_name = db.Column(db.String(120), nullable=True)
    requested_date = db.Column(db.DateTime, nullable=False)
    completion_date = db.Column(db.DateTime, nullable=True)
    cost = db.Column(db.Float, default=0.0)
    notes = db.Column(db.Text, nullable=True)
    created_by = db.Column(db.String(80), nullable=False)
    created_by_name = db.Column(db.String(120), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_edited_by = db.Column(db.String(80), nullable=True)
    last_edited_by_name = db.Column(db.String(120), nullable=True)
    last_updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        client = ClientProfile.query.get(self.client_id)
        client_name = f"{client.customer_first_name} {client.customer_last_name}" if client else "Unknown"
        
        return {
            'id': self.id,
            'clientId': self.client_id,
            'clientName': client_name,
            'vehicleYear': self.vehicle_year,
            'vehicleMake': self.vehicle_make,
            'vehicleModel': self.vehicle_model,
            'vehiclePlate': self.vehicle_plate,
            'vehicleColor': self.vehicle_color,
            'vehicleLocation': self.vehicle_location,
            'isDangerous': self.is_dangerous,
            'hasHeavyTraffic': self.has_heavy_traffic,
            'jobType': self.job_type,
            'description': self.description,
            'priority': self.priority,
            'status': self.status,
            'assignedTo': self.assigned_to,
            'assignedToName': self.assigned_to_name,
            'requestedDate': self.requested_date.strftime('%Y-%m-%d %H:%M'),
            'completionDate': self.completion_date.strftime('%Y-%m-%d %H:%M') if self.completion_date else None,
            'cost': self.cost,
            'notes': self.notes,
            'createdBy': self.created_by,
            'createdByName': self.created_by_name,
            'createdDate': self.created_at.strftime('%Y-%m-%d'),
            'lastEditedBy': self.last_edited_by,
            'lastEditedByName': self.last_edited_by_name,
            'lastUpdatedDate': self.last_updated_at.strftime('%Y-%m-%d')
        }
