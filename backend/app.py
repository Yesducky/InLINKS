#!/usr/bin/env python3
"""
InLINKS Backend Application
A Flask-based REST API for managing inventory, projects, and workflows
"""

from __init__ import create_app

app = create_app()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
