from __init__ import create_app
from flask_cors import CORS
import os

app = create_app()
CORS(app, origins="*", supports_credentials=True)

if __name__ == '__main__':
    env = os.environ.get('FLASK_ENV', 'production')
    debug = True
    print(f"Starting the Flask application in {env} mode...")
    app.run(debug=debug, host='0.0.0.0', port=5000)
