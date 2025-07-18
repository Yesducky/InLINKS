from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from datetime import timedelta

# Initialize extensions
db = SQLAlchemy()
jwt = JWTManager()

def create_app():
    app = Flask(__name__)

    # Configuration
    app.config['SECRET_KEY'] = 'your-secret-key-change-in-production'
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///inlinks.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET_KEY'] = 'jwt-secret-string-change-in-production'
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)

    # Initialize extensions with app
    db.init_app(app)
    jwt.init_app(app)

    # Register blueprints
    from routes.common.auth_routes import auth_bp
    from routes.common.common_routes import common_bp
    from routes.inventory.stock_routes import stock_bp
    from routes.inventory.carton_routes import carton_bp
    from routes.inventory.lot_routes import lot_bp
    from routes.inventory.material_routes import material_bp
    from routes.process_routes import process_bp
    from routes.common.utility_routes import utility_bp
    from routes.common.menu_routes import menu_bp
    from routes.inventory.item_routes import item_bp
    from routes.common.permission_routes import permission_bp
    from routes.project_routes import project_bp

    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(common_bp, url_prefix='/api')
    app.register_blueprint(stock_bp, url_prefix='/api')
    app.register_blueprint(carton_bp, url_prefix='/api')
    app.register_blueprint(lot_bp, url_prefix='/api')
    app.register_blueprint(material_bp, url_prefix='/api')
    app.register_blueprint(process_bp, url_prefix='/api')
    app.register_blueprint(utility_bp, url_prefix='/api')
    app.register_blueprint(menu_bp, url_prefix='/api')
    app.register_blueprint(item_bp, url_prefix='/api')
    app.register_blueprint(permission_bp, url_prefix='/api')
    app.register_blueprint(project_bp, url_prefix='/api')

    # Create tables and initialize data
    with app.app_context():
        db.create_all()
        from utils.db_utils import init_default_data
        init_default_data()

    return app
