from __init__ import create_app

app = create_app()

if __name__ == '__main__':
    print("Starting the Flask application...")
    app.run(debug=True)
