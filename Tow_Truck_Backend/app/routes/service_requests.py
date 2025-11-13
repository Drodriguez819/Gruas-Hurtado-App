from flask import Blueprint, request, jsonify
from app import db
from app.models import ServiceRequest, ClientProfile
from datetime import datetime

bp = Blueprint('service_requests', __name__, url_prefix='/api/service-requests')

@bp.route('', methods=['GET'])
def get_service_requests():
    try:
        requests_list = ServiceRequest.query.all()
        return jsonify([r.to_dict() for r in requests_list]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/<int:request_id>', methods=['GET'])
def get_service_request(request_id):
    try:
        service_req = ServiceRequest.query.get(request_id)
        if not service_req:
            return jsonify({'error': 'Service request not found'}), 404
        return jsonify(service_req.to_dict()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/client/<int:client_id>', methods=['GET'])
def get_client_service_requests(client_id):
    try:
        requests_list = ServiceRequest.query.filter_by(client_id=client_id).all()
        return jsonify([r.to_dict() for r in requests_list]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('', methods=['POST'])
def create_service_request():
    try:
        data = request.get_json()
        print(f"[CREATE SERVICE REQUEST] Received data: {data}")
        
        if not data or not data.get('client_id') or not data.get('job_type') or not data.get('description'):
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Validate vehicle fields
        vehicle_year = data.get('vehicle_year', '').strip() if data.get('vehicle_year') else ''
        vehicle_make = data.get('vehicle_make', '').strip() if data.get('vehicle_make') else ''
        vehicle_model = data.get('vehicle_model', '').strip() if data.get('vehicle_model') else ''
        vehicle_location = data.get('vehicle_location', '').strip() if data.get('vehicle_location') else ''
        
        print(f"[CREATE SERVICE REQUEST] Processed vehicle fields: year={vehicle_year}, make={vehicle_make}, model={vehicle_model}, location={vehicle_location}")
        
        if not vehicle_year or not vehicle_make or not vehicle_model or not vehicle_location:
            print(f"[CREATE SERVICE REQUEST] Validation failed - missing vehicle fields")
            return jsonify({'error': 'Vehicle Year, Make, Model, and Location are required'}), 400
        
        requested_date = datetime.fromisoformat(data.get('requested_date')) if data.get('requested_date') else datetime.utcnow()
        
        service_req = ServiceRequest(
            client_id=data.get('client_id'),
            vehicle_year=vehicle_year,
            vehicle_make=vehicle_make,
            vehicle_model=vehicle_model,
            vehicle_plate=data.get('vehicle_plate', '').strip() if data.get('vehicle_plate') else '',
            vehicle_color=data.get('vehicle_color', '').strip() if data.get('vehicle_color') else '',
            vehicle_location=vehicle_location,
            is_dangerous=data.get('is_dangerous', False),
            has_heavy_traffic=data.get('has_heavy_traffic', False),
            job_type=data.get('job_type'),
            description=data.get('description'),
            priority=data.get('priority', 'Medium'),
            status=data.get('status', 'Pending'),
            assigned_to=data.get('assigned_to'),
            assigned_to_name=data.get('assigned_to_name'),
            requested_date=requested_date,
            cost=data.get('cost', 0.0),
            notes=data.get('notes', ''),
            created_by=data.get('created_by'),
            created_by_name=data.get('created_by_name')
        )
        
        db.session.add(service_req)
        db.session.commit()
        
        return jsonify({'message': 'Service request created', 'service_request': service_req.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@bp.route('/<int:request_id>', methods=['PUT'])
def update_service_request(request_id):
    try:
        service_req = ServiceRequest.query.get(request_id)
        if not service_req:
            return jsonify({'error': 'Service request not found'}), 404
        
        data = request.get_json()
        user_role = data.get('user_role', 'user')  # Get user role from request
        
        print(f"[UPDATE SERVICE REQUEST] user_role: {user_role}, is_dangerous: {data.get('is_dangerous')}, has_heavy_traffic: {data.get('has_heavy_traffic')}")
        
        # Only super_admin and admin can edit is_dangerous and has_heavy_traffic
        if user_role in ['super_admin', 'admin']:
            if 'is_dangerous' in data:
                service_req.is_dangerous = bool(data['is_dangerous'])
                print(f"[UPDATE] Set is_dangerous to {service_req.is_dangerous}")
            if 'has_heavy_traffic' in data:
                service_req.has_heavy_traffic = bool(data['has_heavy_traffic'])
                print(f"[UPDATE] Set has_heavy_traffic to {service_req.has_heavy_traffic}")
        
        if 'client_id' in data:
            service_req.client_id = data['client_id']
        if 'vehicle_year' in data:
            service_req.vehicle_year = data['vehicle_year']
        if 'vehicle_make' in data:
            service_req.vehicle_make = data['vehicle_make']
        if 'vehicle_model' in data:
            service_req.vehicle_model = data['vehicle_model']
        if 'vehicle_plate' in data:
            service_req.vehicle_plate = data['vehicle_plate']
        if 'vehicle_color' in data:
            service_req.vehicle_color = data['vehicle_color']
        if 'vehicle_location' in data:
            service_req.vehicle_location = data['vehicle_location']
        if 'job_type' in data:
            service_req.job_type = data['job_type']
        if 'description' in data:
            service_req.description = data['description']
        if 'priority' in data:
            service_req.priority = data['priority']
        if 'status' in data:
            service_req.status = data['status']
        if 'assigned_to' in data:
            service_req.assigned_to = data['assigned_to']
        if 'assigned_to_name' in data:
            service_req.assigned_to_name = data['assigned_to_name']
        if 'cost' in data:
            service_req.cost = data['cost']
        if 'notes' in data:
            service_req.notes = data['notes']
        if 'completion_date' in data and data['completion_date']:
            service_req.completion_date = datetime.fromisoformat(data['completion_date'])
        
        # Track who edited it
        if 'last_edited_by' in data:
            service_req.last_edited_by = data['last_edited_by']
        if 'last_edited_by_name' in data:
            service_req.last_edited_by_name = data['last_edited_by_name']
        
        db.session.commit()
        
        return jsonify({'message': 'Service request updated', 'service_request': service_req.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@bp.route('/<int:request_id>', methods=['DELETE'])
def delete_service_request(request_id):
    try:
        service_req = ServiceRequest.query.get(request_id)
        if not service_req:
            return jsonify({'error': 'Service request not found'}), 404
        
        db.session.delete(service_req)
        db.session.commit()
        
        return jsonify({'message': 'Service request deleted'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@bp.route('/stats/summary', methods=['GET'])
def get_service_stats():
    try:
        total = ServiceRequest.query.count()
        pending = ServiceRequest.query.filter_by(status='Pending').count()
        in_progress = ServiceRequest.query.filter_by(status='In Progress').count()
        completed = ServiceRequest.query.filter_by(status='Completed').count()
        
        return jsonify({
            'total': total,
            'pending': pending,
            'inProgress': in_progress,
            'completed': completed
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
