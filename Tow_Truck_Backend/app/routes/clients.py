from flask import Blueprint, request, jsonify
from app import db
from app.models import ClientProfile

bp = Blueprint('clients', __name__, url_prefix='/api/clients')

@bp.route('', methods=['GET'])
def get_clients():
    profiles = ClientProfile.query.all()
    return jsonify([profile.to_dict() for profile in profiles]), 200

@bp.route('/<int:client_id>', methods=['GET'])
def get_client(client_id):
    profile = ClientProfile.query.get(client_id)
    if not profile:
        return jsonify({'error': 'Client not found'}), 404
    return jsonify(profile.to_dict()), 200

@bp.route('', methods=['POST'])
def create_client():
    data = request.get_json()
    
    if not data or not data.get('customer_first_name') or not data.get('customer_last_name'):
        return jsonify({'error': 'Missing required fields'}), 400
    
    profile = ClientProfile(
        customer_title=data.get('customer_title', ''),
        customer_first_name=data.get('customer_first_name'),
        customer_last_name=data.get('customer_last_name'),
        customer_phone=data.get('customer_phone'),
        vehicle_info=data.get('vehicle_info'),
        vehicle_year=data.get('vehicle_year'),
        vehicle_make=data.get('vehicle_make'),
        vehicle_model=data.get('vehicle_model'),
        vehicle_plate=data.get('vehicle_plate'),
        vehicle_color=data.get('vehicle_color'),
        vehicle_location=data.get('vehicle_location'),
        created_by=data.get('created_by'),
        created_by_name=data.get('created_by_name'),
        last_edited_by=data.get('created_by'),
        last_edited_by_name=data.get('created_by_name')
    )
    
    db.session.add(profile)
    db.session.commit()
    
    return jsonify({'message': 'Client created', 'client': profile.to_dict()}), 201

@bp.route('/<int:client_id>', methods=['PUT'])
def update_client(client_id):
    profile = ClientProfile.query.get(client_id)
    if not profile:
        return jsonify({'error': 'Client not found'}), 404
    
    data = request.get_json()
    
    if 'customer_title' in data:
        profile.customer_title = data['customer_title']
    if 'customer_first_name' in data:
        profile.customer_first_name = data['customer_first_name']
    if 'customer_last_name' in data:
        profile.customer_last_name = data['customer_last_name']
    if 'customer_phone' in data:
        profile.customer_phone = data['customer_phone']
    if 'vehicle_info' in data:
        profile.vehicle_info = data['vehicle_info']
    if 'vehicle_year' in data:
        profile.vehicle_year = data['vehicle_year']
    if 'vehicle_make' in data:
        profile.vehicle_make = data['vehicle_make']
    if 'vehicle_model' in data:
        profile.vehicle_model = data['vehicle_model']
    if 'vehicle_plate' in data:
        profile.vehicle_plate = data['vehicle_plate']
    if 'vehicle_color' in data:
        profile.vehicle_color = data['vehicle_color']
    if 'vehicle_location' in data:
        profile.vehicle_location = data['vehicle_location']
    
    profile.last_edited_by = data.get('last_edited_by')
    profile.last_edited_by_name = data.get('last_edited_by_name')
    
    db.session.commit()
    
    return jsonify({'message': 'Client updated', 'client': profile.to_dict()}), 200

@bp.route('/<int:client_id>', methods=['DELETE'])
def delete_client(client_id):
    profile = ClientProfile.query.get(client_id)
    if not profile:
        return jsonify({'error': 'Client not found'}), 404
    
    db.session.delete(profile)
    db.session.commit()
    
    return jsonify({'message': 'Client deleted'}), 200