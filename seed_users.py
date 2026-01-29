#!/usr/bin/env python3
"""Seed demo users for development and pilot deployment.

Creates test users with known credentials for easy demo access.
"""

from autoapply.auth_store import get_auth_store

def main():
    store = get_auth_store()

    # Create test users with known credentials
    # Role is a Literal type, so we use string values directly
    users = [
        ("claimant@example.com", "password", "claimant", "Test Claimant"),
        ("coach@example.com", "password", "coach", "Test Coach"),
        ("admin@example.com", "password", "admin", "Test Admin"),
    ]

    created_count = 0
    skipped_count = 0

    for email, password, role, display_name in users:
        # Check if user already exists
        existing = store.get_user_by_email(email)
        if existing:
            print(f"User {email} already exists, skipping...")
            skipped_count += 1
        else:
            try:
                user = store.create_user(email, password, role, display_name)
                print(f"✓ Created user: {email} ({role}) - {display_name}")
                created_count += 1
            except Exception as e:
                print(f"✗ Failed to create user {email}: {e}")

    print(f"\n{'='*60}")
    print(f"Summary: {created_count} created, {skipped_count} skipped")
    print(f"{'='*60}")
    
    if created_count > 0 or skipped_count == len(users):
        print("\nDemo users ready! You can now log in with:")
        print("  📧 claimant@example.com / password (Claimant)")
        print("  📧 coach@example.com / password (Work Coach)")
        print("  📧 admin@example.com / password (DWP Admin)")
        print("\nNote: Change these passwords in production!")

if __name__ == "__main__":
    main()

