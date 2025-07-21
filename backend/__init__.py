from flask import Flask
from flask_cors import CORS
from config import Config
from .models import db, Role
from .routes import api

def create_app(config_class=Config):
    # Create Flask application
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Initialize extensions
    CORS(app)  # Enable CORS for API endpoints
    db.init_app(app)
    
    # Register blueprints
    app.register_blueprint(api, url_prefix='/api')
    
    # Create database tables and initialize default roles
    with app.app_context():
        db.create_all()
        
        # Create default roles if they don't exist
        create_default_roles()
        
    return app

def create_default_roles():
    default_roles = ['admin', 'user', 'moderator']
    
    for role_name in default_roles:
        if not Role.query.filter_by(name=role_name).first():
            role = Role(name=role_name, description=f'{role_name.capitalize()} role')
            db.session.add(role)
    
    db.session.commit()
