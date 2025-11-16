from io import BytesIO
import qrcode
from django.http import HttpResponse
from django.views.decorators.http import require_GET
from django.contrib.auth.decorators import login_required

@require_GET
def prescription_qr(request, prescription_id):
    """Generate QR code for prescription - publicly accessible for PDF generation"""
    url = request.build_absolute_uri(f"/api/prescriptions/{prescription_id}/")
    qr = qrcode.QRCode(box_size=6, border=2)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    return HttpResponse(buffer, content_type="image/png")
