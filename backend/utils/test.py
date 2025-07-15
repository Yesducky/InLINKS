import sys
import os

# Add the parent directory to the path so we can import from the backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app
from utils.item_utils import get_item_with_children_recursive

# Create application context
with app.app_context():
    item = get_item_with_children_recursive('ITM000015')
    print(item)
