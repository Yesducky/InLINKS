"""
Authentication routes for user registration and login
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
from werkzeug.security import generate_password_hash, check_password_hash
from models import User
from utils.db_utils import generate_id
from __init__ import db

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user"""
    data = request.get_json()

    if User.query.filter_by(username=data['username']).first():
        return jsonify({'message': 'Username already exists'}), 400

    user_id = generate_id('USR', User)
    password_hash = generate_password_hash(data['password'])

    user = User(
        id=user_id,
        username=data['username'],
        password_hash=password_hash,
        user_type_id=data.get('user_type_id', 'UT001'),  # Default to first user type
    )

    db.session.add(user)
    db.session.commit()

    return jsonify({'message': 'User created successfully', 'user_id': user_id}), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    """Authenticate user and return JWT token"""
    data = request.get_json()
    user = User.query.filter_by(username=data['username']).first()

    if user and check_password_hash(user.password_hash, data['password']):
        access_token = create_access_token(identity=user.id)
        return jsonify({
            'access_token': access_token,
            'user_id': user.id,
            'username': user.username,
            'user_type_id': user.user_type_id
        }), 200

    return jsonify({'message': 'Invalid credentials'}), 401
