#!/bin/bash
# Check and Install Fonts for Captcha
echo "🔍 Checking Font Availability for Captcha"
echo "==========================================="

echo "1. Checking existing font directories..."
ls -la /usr/share/fonts/ 2>/dev/null || echo "❌ /usr/share/fonts/ not found"
ls -la /usr/share/fonts/truetype/ 2>/dev/null || echo "❌ /usr/share/fonts/truetype/ not found"

echo ""
echo "2. Looking for specific fonts..."
fonts_to_check=(
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
    "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf"
    "/usr/share/fonts/TTF/DejaVuSans.ttf"
    "/usr/share/fonts/truetype/ubuntu/Ubuntu-R.ttf"
)

found_font=""
for font in "${fonts_to_check[@]}"; do
    if [ -f "$font" ]; then
        echo "✅ Found: $font"
        if [ -z "$found_font" ]; then
            found_font="$font"
        fi
    else
        echo "❌ Missing: $font"
    fi
done

echo ""
if [ -n "$found_font" ]; then
    echo "🎉 SUCCESS: Using font: $found_font"
else
    echo "⚠️  No fonts found. Installing fonts..."
    
    # Install fonts based on the distribution
    if command -v apt-get >/dev/null 2>&1; then
        echo "Installing fonts with apt-get..."
        sudo apt-get update
        sudo apt-get install -y fonts-dejavu-core fonts-liberation ttf-ubuntu-font-family
    elif command -v yum >/dev/null 2>&1; then
        echo "Installing fonts with yum..."
        sudo yum install -y dejavu-sans-fonts liberation-fonts
    else
        echo "❌ Cannot install fonts automatically"
    fi
    
    # Check again after installation
    echo ""
    echo "3. Checking fonts after installation..."
    for font in "${fonts_to_check[@]}"; do
        if [ -f "$font" ]; then
            echo "✅ Now available: $font"
            if [ -z "$found_font" ]; then
                found_font="$font"
            fi
        fi
    done
fi

echo ""
echo "4. Testing font with Python..."
cd /home/lunasynccapstone/LunaSync/capstone
source /home/lunasyncuser/lunasync_env/bin/activate

python << EOF
try:
    from PIL import Image, ImageDraw, ImageFont
    
    # Test font loading
    font_paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf",
        "/usr/share/fonts/TTF/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/ubuntu/Ubuntu-R.ttf",
    ]
    
    working_font = None
    for font_path in font_paths:
        try:
            font = ImageFont.truetype(font_path, 30)
            print(f"✅ Font works: {font_path}")
            if working_font is None:
                working_font = font_path
        except Exception as e:
            print(f"❌ Font failed: {font_path} - {e}")
    
    if working_font:
        print(f"🎉 SUCCESS: Best font to use: {working_font}")
        
        # Test creating an image
        img = Image.new('RGB', (120, 50), 'white')
        draw = ImageDraw.Draw(img)
        font = ImageFont.truetype(working_font, 30)
        draw.text((10, 10), "TEST", fill='black', font=font)
        print("✅ Image creation test successful!")
    else:
        print("❌ No working fonts found")
        # Try default font
        try:
            font = ImageFont.load_default()
            img = Image.new('RGB', (120, 50), 'white')
            draw = ImageDraw.Draw(img)
            draw.text((10, 10), "TEST", fill='black', font=font)
            print("✅ Default font works as fallback")
        except Exception as e:
            print(f"❌ Even default font failed: {e}")
            
except Exception as e:
    print(f"❌ PIL test failed: {e}")
EOF

echo ""
echo "🏁 Font check complete!"