from flask import Blueprint, request, jsonify
from app import db
from app.models import ClientProfile, generate_client_id_number

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
    try:
        data = request.get_json()
        
        if not data or not data.get('customer_first_name') or not data.get('customer_last_name'):
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Generate sequential client ID number
        client_id_number = generate_client_id_number()
        
        profile = ClientProfile(
            client_id_number=client_id_number,
            customer_first_name=data.get('customer_first_name'),
            customer_last_name=data.get('customer_last_name'),
            customer_phone=data.get('customer_phone'),
            created_by=data.get('created_by'),
            created_by_name=data.get('created_by_name'),
            last_edited_by=data.get('created_by'),
            last_edited_by_name=data.get('created_by_name')
        )
        
        db.session.add(profile)
        db.session.commit()
        
        return jsonify({'message': 'Client created', 'client': profile.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        print(f"ERROR creating client: {str(e)}")
        return jsonify({'error': str(e)}), 500

@bp.route('/<int:client_id>', methods=['PUT'])
def update_client(client_id):
    profile = ClientProfile.query.get(client_id)
    if not profile:
        return jsonify({'error': 'Client not found'}), 404
    
    data = request.get_json()
    
    if 'customer_first_name' in data:
        profile.customer_first_name = data['customer_first_name']
    if 'customer_last_name' in data:
        profile.customer_last_name = data['customer_last_name']
    if 'customer_phone' in data:
        profile.customer_phone = data['customer_phone']
    
    profile.last_edited_by = data.get('last_edited_by')
    profile.last_edited_by_name = data.get('last_edited_by_name')
    
    db.session.commit()
    
    return jsonify({'message': 'Client updated', 'client': profile.to_dict()}), 200

@bp.route('/<int:client_id>', methods=['DELETE'])
def delete_client(client_id):
    try:
        profile = ClientProfile.query.get(client_id)
        if not profile:
            return jsonify({'error': 'Client not found'}), 404
        
        db.session.delete(profile)
        db.session.commit()
        
        return jsonify({'message': 'Client deleted'}), 200
    except Exception as e:
        db.session.rollback()
        print(f"ERROR deleting client: {str(e)}")
        if 'FOREIGN KEY constraint' in str(e) or 'foreign key' in str(e).lower():
            return jsonify({'error': 'Cannot delete client with associated service requests. Delete service requests first.'}), 400
        return jsonify({'error': str(e)}), 500

@bp.route('/search', methods=['GET'])
def search_clients():
    """Search clients by name or client ID number (case-insensitive)"""
    try:
        query = request.args.get('q', '').lower()
        limit = int(request.args.get('limit', 10))
        
        if not query:
            return jsonify({'error': 'Search query required'}), 400
        
        # If exact client ID match found, return only that one
        exact_match = ClientProfile.query.filter_by(client_id_number=query.upper()).first()
        if exact_match:
            return jsonify([exact_match.to_dict()])
        
        # Search by client ID number or name (case-insensitive)
        clients = ClientProfile.query.filter(
            (ClientProfile.client_id_number.ilike(f'%{query}%')) |
            (ClientProfile.customer_first_name.ilike(f'%{query}%')) |
            (ClientProfile.customer_last_name.ilike(f'%{query}%'))
        ).limit(limit).all()
        
        return jsonify([client.to_dict() for client in clients])
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
