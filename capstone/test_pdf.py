import pdfkit

print('Testing pdfkit...')
html = '<html><body><h1>Test PDF</h1></body></html>'

try:
    pdf = pdfkit.from_string(html, False)
    print(f'PDF generation successful, size: {len(pdf)} bytes')
except Exception as e:
    print(f'PDF generation failed: {e}')