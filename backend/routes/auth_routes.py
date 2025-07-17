"""
Authentication routes for user registration and login
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
from werkzeug.security import generate_password_hash, check_password_hash
from models import User, UserType
from utils.db_utils import generate_id
from __init__ import db

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user"""
    data = request.get_json()

    # Check if username already exists
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'message': 'Username already exists'}), 400

    # Check if email already exists (if provided)
    email = data.get('email')
    if email and User.query.filter_by(email=email).first():
        return jsonify({'message': 'Email already exists'}), 400

    user_id = generate_id('USR', User)
    password_hash = generate_password_hash(data['password'])

    user = User(
        id=user_id,
        username=data['username'],
        password_hash=password_hash,
        user_type_id=data.get('user_type_id', 'UT001'),  # Default to first user type
        email=data.get('email'),
        is_active=data.get('is_active', True),  # Default to active
        project_ids='[]',
        work_order_ids='[]',
        task_ids='[]'
    )

    db.session.add(user)
    db.session.commit()

    # Append user id to userType's user_ids list
    user_type = UserType.query.filter_by(id=user.user_type_id).first()
    if user_type:
        import json
        user_ids = json.loads(user_type.user_ids) if user_type.user_ids else []
        user_ids.append(user_id)
        user_type.user_ids = json.dumps(user_ids)
        db.session.commit()

    return jsonify({'message': 'User created successfully', 'user_id': user_id}), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    """Authenticate user and return JWT token"""
    data = request.get_json()
    user = User.query.filter_by(username=data['username']).first()

    if user and user.is_active and check_password_hash(user.password_hash, data['password']):
        # Update last_login timestamp
        from models import get_hk_time
        user.last_login = get_hk_time()
        db.session.commit()

        access_token = create_access_token(identity=user.id)
        return jsonify({
            'access_token': access_token,
            'user_id': user.id,
            'username': user.username,
            'user_type_id': user.user_type_id,
            'email': user.email,
            'is_active': user.is_active
        }), 200

    # Check if user exists but is inactive
    if user and not user.is_active:
        return jsonify({'message': 'Account is deactivated'}), 403

    return jsonify({'message': 'Invalid credentials'}), 401
