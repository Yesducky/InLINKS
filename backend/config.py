import os

# Base directory of the application
basedir = os.path.abspath(os.path.dirname(__file__))

# Configuration class
class Config:
    # Secret key for session
    SECRET_KEY = os.environ.get('SECRET_KEY') or os.urandom(24)
    
    # Database configuration
    SQLALCHEMY_DATABASE_URI = 'sqlite:///' + os.path.join(basedir, 'app.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = True
