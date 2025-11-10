from flask import Blueprint, request, jsonify
from app import db
from app.models import User

bp = Blueprint('employees', __name__, url_prefix='/api/employees')

@bp.route('', methods=['GET'])
def get_employees():
    employees = User.query.all()
    return jsonify([emp.to_dict() for emp in employees]), 200

@bp.route('', methods=['POST'])
def create_employee():
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('password') or not data.get('name'):
        return jsonify({'error': 'Missing required fields'}), 400
    
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already exists'}), 400
    
    employee = User(
        username=data['username'],
        name=data['name'],
        role=data.get('role', 'user')
    )
    employee.set_password(data['password'])
    
    db.session.add(employee)
    db.session.commit()
    
    return jsonify({'message': 'Employee created', 'employee': employee.to_dict()}), 201

@bp.route('/<int:employee_id>', methods=['PUT'])
def update_employee(employee_id):
    employee = User.query.get(employee_id)
    if not employee:
        return jsonify({'error': 'Employee not found'}), 404
    
    data = request.get_json()
    
    if 'role' in data:
        employee.role = data['role']
    if 'name' in data:
        employee.name = data['name']
    
    db.session.commit()
    
    return jsonify({'message': 'Employee updated', 'employee': employee.to_dict()}), 200

@bp.route('/<int:employee_id>', methods=['DELETE'])
def delete_employee(employee_id):
    employee = User.query.get(employee_id)
    if not employee:
        return jsonify({'error': 'Employee not found'}), 404
    
    db.session.delete(employee)
    db.session.commit()
    
    return jsonify({'message': 'Employee deleted'}), 200
