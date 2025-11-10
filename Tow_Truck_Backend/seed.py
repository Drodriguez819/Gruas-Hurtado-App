from app import create_app, db
from app.models import User
import os

app = create_app()

with app.app_context():
    # Clear existing data
    User.query.delete()
    db.session.commit()
    
    print("Creating demo users...")
    
    # Create demo users
    demo_users = [
        ('super_admin', 'Super Admin User', 'super_admin'),
        ('admin1', 'Admin User', 'admin'),
        ('manager1', 'Manager User', 'manager'),
        ('user1', 'Regular User', 'user'),
    ]
    
    for username, name, role in demo_users:
        user = User(username=username, name=name, role=role)
        user.set_password('password123')
        db.session.add(user)
        print(f"  ✓ Created {username} ({role})")
    
    db.session.commit()
    
    print("\\n✓ All demo users created successfully!")
    print("\\nYou can now login with:")
    for username, _, role in demo_users:
        print(f"  Username: {username}")
        print(f"  Password: password123")
        print(f"  Role: {role}")
        print()
