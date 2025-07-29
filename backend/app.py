from __init__ import create_app
import os

app = create_app()

if __name__ == '__main__':
    env = os.environ.get('FLASK_ENV', 'production')
    debug = env == 'development'
    print(f"Starting the Flask application in {env} mode...")
    app.run(debug=debug, host='0.0.0.0', port=5000)
