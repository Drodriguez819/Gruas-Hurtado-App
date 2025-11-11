import sys
import os

# Add the app directory to the path
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app

app = create_app()
