from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS

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
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = False

    # Enable CORS for mobile app and web domain
    CORS(app, origins=['https://inlinkapi.yesducky.com', 'http://localhost:3000', 'capacitor://localhost', 'http://localhost'], supports_credentials=True)
    
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
    from routes.project.process_routes import process_bp
    from routes.common.utility_routes import utility_bp
    from routes.common.menu_routes import menu_bp
    from routes.inventory.item_routes import item_bp
    from routes.common.permission_routes import permission_bp
    from routes.project.project_routes import project_bp
    from routes.project.work_order_routes import workorder_bp
    from routes.project.task_routes import task_bp
    from routes.project.subtask_routes import subtask_bp
    from routes.inventory.task_item_routes import task_item_bp
    from routes.inventory.print_label_routes import print_label_bp

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
    app.register_blueprint(workorder_bp, url_prefix='/api')
    app.register_blueprint(task_bp, url_prefix='/api')
    app.register_blueprint(subtask_bp, url_prefix='/api')
    app.register_blueprint(task_item_bp, url_prefix='/api')
    app.register_blueprint(print_label_bp, url_prefix='/api')

    # Create tables and initialize data
    with app.app_context():
        db.create_all()
        from utils.db_utils import init_default_data
        init_default_data()

    return app
