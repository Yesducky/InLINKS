from flask import Blueprint, request, jsonify, session
from models import User, Role, db

# Create a Blueprint for API routes
api = Blueprint('api', __name__)

@api.route('/register', methods=['POST'])
def register():
    data = request.get_json()

    # Check if required fields are provided
    if not data or 'username' not in data or 'email' not in data or 'password' not in data:
        return jsonify({'error': 'Missing required fields'}), 400

    # Check if user already exists
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already exists'}), 400

    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already exists'}), 400

    # Create new user
    new_user = User(username=data['username'], email=data['email'])
    new_user.set_password(data['password'])
    
    # Assign default role (user)
    user_role = Role.query.filter_by(name='user').first()
    if user_role:
        new_user.roles.append(user_role)
    
    # If role is specified and the user is authorized, assign that role
    if 'role' in data and 'user_id' in session:
        current_user = User.query.get(session['user_id'])
        if current_user and current_user.has_role('admin'):
            requested_role = Role.query.filter_by(name=data['role']).first()
            if requested_role:
                new_user.roles.append(requested_role)

    db.session.add(new_user)
    db.session.commit()

    return jsonify({'message': 'User registered successfully'}), 201

@api.route('/login', methods=['POST'])
def login():
    data = request.get_json()

    # Check if required fields are provided
    if not data or 'username' not in data or 'password' not in data:
        return jsonify({'error': 'Missing username or password'}), 400

    # Find user
    user = User.query.filter_by(username=data['username']).first()

    # Check if user exists and password is correct
    if user and user.check_password(data['password']):
        session['user_id'] = user.id
        return jsonify({
            'message': 'Login successful',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'roles': user.get_roles()
            }
        }), 200

    return jsonify({'error': 'Invalid username or password'}), 401

@api.route('/logout', methods=['POST'])
def logout():
    session.pop('user_id', None)
    return jsonify({'message': 'Logout successful'}), 200

@api.route('/check_session', methods=['GET'])
def check_session():
    if 'user_id' in session:
        user = User.query.get(session['user_id'])
        if user:
            return jsonify({
                'authenticated': True,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'roles': user.get_roles()
                }
            }), 200

    return jsonify({'authenticated': False}), 200

@api.route('/users/<int:user_id>/roles', methods=['POST'])
def update_user_roles(user_id):
    # Check if the current user is an admin
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    current_user = User.query.get(session['user_id'])
    if not current_user or not current_user.has_role('admin'):
        return jsonify({'error': 'Permission denied'}), 403
    
    data = request.get_json()
    if not data or 'roles' not in data:
        return jsonify({'error': 'Missing roles data'}), 400
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Clear existing roles and add new ones
    user.roles = []
    for role_name in data['roles']:
        role = Role.query.filter_by(name=role_name).first()
        if role:
            user.roles.append(role)
    
    db.session.commit()
    return jsonify({'message': 'User roles updated', 'roles': user.get_roles()}), 200

@api.route('/roles', methods=['GET'])
def get_roles():
    roles = Role.query.all()
    return jsonify({
        'roles': [{'id': role.id, 'name': role.name, 'description': role.description} for role in roles]
    }), 200
