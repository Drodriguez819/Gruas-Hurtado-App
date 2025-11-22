from flask import Blueprint, request, jsonify
from app import db
from app.models import OneTimeClient

bp = Blueprint('one_time_clients', __name__, url_prefix='/api/one-time-clients')

@bp.route('', methods=['GET'])
def get_one_time_clients():
    """Get all one-time clients"""
    try:
        clients = OneTimeClient.query.all()
        return jsonify([client.to_dict() for client in clients]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/<int:client_id>', methods=['GET'])
def get_one_time_client(client_id):
    """Get a specific one-time client"""
    try:
        client = OneTimeClient.query.get(client_id)
        if not client:
            return jsonify({'error': 'One-time client not found'}), 404
        return jsonify(client.to_dict()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('', methods=['POST'])
def create_one_time_client():
    """Create a new one-time client"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data or not data.get('first_name') or not data.get('last_name') or not data.get('phone'):
            return jsonify({'error': 'Missing required fields: first_name, last_name, phone'}), 400
        
        client = OneTimeClient(
            first_name=data.get('first_name').strip(),
            last_name=data.get('last_name').strip(),
            phone=data.get('phone').strip(),
            email=data.get('email', '').strip() if data.get('email') else None,
            address=data.get('address', '').strip() if data.get('address') else None,
            created_by=data.get('created_by'),
            created_by_name=data.get('created_by_name')
        )
        
        db.session.add(client)
        db.session.commit()
        
        return jsonify({'message': 'One-time client created', 'client': client.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        print(f"ERROR creating one-time client: {str(e)}")
        return jsonify({'error': str(e)}), 500

@bp.route('/<int:client_id>', methods=['PUT'])
def update_one_time_client(client_id):
    """Update a one-time client"""
    try:
        client = OneTimeClient.query.get(client_id)
        if not client:
            return jsonify({'error': 'One-time client not found'}), 404
        
        data = request.get_json()
        
        if 'first_name' in data:
            client.first_name = data['first_name'].strip()
        if 'last_name' in data:
            client.last_name = data['last_name'].strip()
        if 'phone' in data:
            client.phone = data['phone'].strip()
        if 'email' in data:
            client.email = data['email'].strip() if data['email'] else None
        if 'address' in data:
            client.address = data['address'].strip() if data['address'] else None
        
        db.session.commit()
        
        return jsonify({'message': 'One-time client updated', 'client': client.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        print(f"ERROR updating one-time client: {str(e)}")
        return jsonify({'error': str(e)}), 500

@bp.route('/<int:client_id>', methods=['DELETE'])
def delete_one_time_client(client_id):
    """Delete a one-time client"""
    try:
        client = OneTimeClient.query.get(client_id)
        if not client:
            return jsonify({'error': 'One-time client not found'}), 404
        
        db.session.delete(client)
        db.session.commit()
        
        return jsonify({'message': 'One-time client deleted'}), 200
    except Exception as e:
        db.session.rollback()
        print(f"ERROR deleting one-time client: {str(e)}")
        if 'FOREIGN KEY constraint' in str(e) or 'foreign key' in str(e).lower():
            return jsonify({'error': 'Cannot delete one-time client with associated service requests. Delete service requests first.'}), 400
        return jsonify({'error': str(e)}), 500
