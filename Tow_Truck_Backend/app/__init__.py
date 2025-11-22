from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import os

db = SQLAlchemy()

def create_app():
    app = Flask(__name__)
    
    # Configuration
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        raise ValueError("DATABASE_URL environment variable not set!")
    
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url.replace('postgresql://', 'postgresql+psycopg://')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = 'your-secret-key-change-this'
    
    # Initialize extensions
    db.init_app(app)
    
    # Better CORS configuration
    CORS(app, 
         origins="*",
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
         allow_headers=["Content-Type", "Authorization"],
         supports_credentials=False)
    
    # Database reset endpoint (for development only)
    @app.route('/api/db/reset', methods=['POST'])
    def reset_database():
        print("[DB RESET] Dropping all tables...")
        db.drop_all()
        print("[DB RESET] Creating all tables...")
        db.create_all()
        print("[DB RESET] Complete!")
        return jsonify({'message': 'Database reset complete'}), 200
    
    # Register blueprints
    from app.routes import auth, clients, employees, service_requests, one_time_clients
    app.register_blueprint(auth.bp)
    app.register_blueprint(clients.bp)
    app.register_blueprint(employees.bp)
    app.register_blueprint(service_requests.bp)
    app.register_blueprint(one_time_clients.bp)
    
    # Create database tables
    with app.app_context():
        db.create_all()
    
    return app
