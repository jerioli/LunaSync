"""
Fix Media Directory Permissions
Secure file upload directory permissions
"""

import os
import stat
from pathlib import Path

def fix_media_permissions():
    print("🔧 Fixing Media Directory Permissions...")
    
    # Get the capstone directory path
    capstone_dir = Path(__file__).parent
    media_dir = capstone_dir / 'media'
    
    try:
        # Create media directory if it doesn't exist
        media_dir.mkdir(exist_ok=True)
        
        # Set secure permissions: owner read/write/execute, group read/execute, others no access
        os.chmod(media_dir, 0o755)
        
        print(f"✅ Media directory permissions set to 755: {media_dir}")
        
        # Check if there are subdirectories and secure them too
        for root, dirs, files in os.walk(media_dir):
            for directory in dirs:
                dir_path = os.path.join(root, directory)
                os.chmod(dir_path, 0o755)
                print(f"✅ Secured directory: {dir_path}")
            
            for file in files:
                file_path = os.path.join(root, file)
                os.chmod(file_path, 0o644)
                print(f"✅ Secured file: {file_path}")
        
        print("🔐 Media directory security update complete!")
        
    except Exception as e:
        print(f"❌ Error fixing permissions: {e}")

if __name__ == "__main__":
    fix_media_permissions()
