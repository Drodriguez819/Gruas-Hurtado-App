from flask import Blueprint, request, jsonify
from app import db
from app.models import User
import traceback
import secrets
import string

bp = Blueprint('auth', __name__, url_prefix='/api/auth')

def generate_temp_password(length=12):
    """Generate a random temporary password"""
    characters = string.ascii_letters + string.digits
    return ''.join(secrets.choice(characters) for i in range(length))

@bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Missing username or password'}), 400
    
    user = User.query.filter_by(username=data['username']).first()
    
    if not user or not user.check_password(data['password']):
        return jsonify({'error': 'Invalid username or password'}), 401
    
    return jsonify({
        'id': user.id,
        'username': user.username,
        'name': user.name,
        'role': user.role,
        'is_temporary_password': user.is_temporary_password
    }), 200

@bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        print(f"DEBUG: Register request data: {data}")
        
        if not data or not data.get('username') or not data.get('password') or not data.get('name'):
            return jsonify({'error': 'Missing required fields'}), 400
        
        if User.query.filter_by(username=data['username']).first():
            return jsonify({'error': 'Username already exists'}), 400
        
        user = User(
            username=data['username'],
            name=data['name'],
            role=data.get('role', 'user')
        )
        # Check if password should be marked as temporary
        is_temporary = data.get('is_temporary', False)
        user.set_password(data['password'], is_temporary=is_temporary)
        
        db.session.add(user)
        db.session.commit()
        
        print(f"DEBUG: User {data['username']} created successfully")
        
        return jsonify({'message': 'User created successfully', 'user': user.to_dict()}), 201
    except Exception as e:
        print(f"ERROR in register: {str(e)}")
        print(traceback.format_exc())
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@bp.route('/change-password', methods=['POST'])
def change_password():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        old_password = data.get('old_password')
        new_password = data.get('new_password')
        
        if not user_id or not old_password or not new_password:
            return jsonify({'error': 'Missing required fields'}), 400
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        if not user.check_password(old_password):
            return jsonify({'error': 'Current password is incorrect'}), 401
        
        user.set_password(new_password, is_temporary=False)
        db.session.commit()
        
        return jsonify({'message': 'Password changed successfully'}), 200
    except Exception as e:
        print(f"ERROR in change_password: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@bp.route('/users', methods=['GET'])
def get_users():
    try:
        users = User.query.all()
        return jsonify([user.to_dict() for user in users]), 200
    except Exception as e:
        print(f"ERROR in get_users: {str(e)}")
        return jsonify({'error': str(e)}), 500

@bp.route('/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        if 'role' in data:
            user.role = data['role']
        
        db.session.commit()
        return jsonify({'message': 'User updated', 'user': user.to_dict()}), 200
    except Exception as e:
        print(f"ERROR in update_user: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@bp.route('/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        db.session.delete(user)
        db.session.commit()
        return jsonify({'message': 'User deleted'}), 200
    except Exception as e:
        print(f"ERROR in delete_user: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500