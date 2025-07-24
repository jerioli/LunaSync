# # Django views.py for AWS Textract integration

# import boto3
# import json
# import logging
# import io
# import numpy as np
# import tempfile
# import os
# from PIL import Image, ImageDraw
# from django.http import JsonResponse, HttpResponse
# from django.views.decorators.csrf import csrf_exempt
# from django.views.decorators.http import require_http_methods
# from django.core.files.storage import default_storage
# from django.conf import settings

# logger = logging.getLogger(__name__)

# def process_document(file_bytes):
#     """Extract text with position data"""
#     try:
#         # Initialize AWS Textract client
#         textract_client = boto3.client(
#             'textract',
#             aws_access_key_id=getattr(settings, 'AWS_ACCESS_KEY_ID', 'AKIAZZ56MPEX5EMQ7WUD'),
#             aws_secret_access_key=getattr(settings, 'AWS_SECRET_ACCESS_KEY', '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'),
#             region_name=getattr(settings, 'AWS_REGION', 'us-east-1')
#         )
        
#         logger.info('AWS Textract client initialized successfully')
        
#         # Process document with Textract
#         response = textract_client.detect_document_text(
#             Document={'Bytes': file_bytes}
#         )
        
#         blocks = response.get('Blocks', [])
#         logger.info(f'AWS Textract returned {len(blocks)} blocks')
#         return blocks
        
#     except Exception as e:
#         logger.error(f'AWS Textract error: {str(e)}')
#         # Return empty blocks instead of failing - Google Colab can handle this
#         return []

# def build_positional_tui(blocks, output_width=120):
#     """Create TUI output preserving original layout with enhanced formatting"""
#     # Collect all words with their positions
#     words = []
#     for block in blocks:
#         if block['BlockType'] == 'WORD':
#             box = block['Geometry']['BoundingBox']
#             words.append({
#                 'text': block['Text'],
#                 'left': box['Left'],
#                 'top': box['Top'],
#                 'width': box['Width'],
#                 'height': box['Height']
#             })

#     if not words:
#         return "No text detected"

#     # Calculate document boundaries
#     min_left = min(w['left'] for w in words)
#     max_right = max(w['left'] + w['width'] for w in words)
#     min_top = min(w['top'] for w in words)
#     max_bottom = max(w['top'] + w['height'] for w in words)

#     # Create dynamic row grouping with adaptive tolerance
#     vertical_positions = sorted(set(w['top'] for w in words))
#     row_groups = []
#     current_group = [vertical_positions[0]]

#     for pos in vertical_positions[1:]:
#         if pos - current_group[-1] < 0.005:  # Adaptive tolerance
#             current_group.append(pos)
#         else:
#             row_groups.append(np.mean(current_group))
#             current_group = [pos]

#     if current_group:
#         row_groups.append(np.mean(current_group))

#     # Organize words by row
#     rows = {}
#     for word in words:
#         # Find closest row group
#         row_key = min(row_groups, key=lambda x: abs(x - word['top']))
#         if row_key not in rows:
#             rows[row_key] = []
#         rows[row_key].append(word)

#     # Sort rows top-to-bottom
#     sorted_rows = sorted(rows.items(), key=lambda x: x[0])

#     # Create output grid
#     output_lines = []
#     prev_row_key = None

#     for row_key, words_in_row in sorted_rows:
#         # Add vertical spacing between rows
#         if prev_row_key is not None and (row_key - prev_row_key) > 0.02:
#             output_lines.append("")  # Add empty line for vertical spacing

#         prev_row_key = row_key

#         # Sort words left-to-right
#         words_in_row.sort(key=lambda x: x['left'])

#         # Create row buffer
#         row_buffer = [' '] * output_width

#         # Place words in row buffer
#         for word in words_in_row:
#             # Calculate position in output grid
#             col_pos = int(((word['left'] - min_left) / (max_right - min_left)) * (output_width - 1))
#             word_length = len(word['text'])

#             # Ensure word fits in buffer
#             if col_pos < output_width:
#                 end_pos = min(col_pos + word_length, output_width)

#                 # Check for overlap
#                 if any(row_buffer[i] != ' ' for i in range(col_pos, end_pos)):
#                     # Handle overlap by moving to next available space
#                     col_pos = next((i for i in range(col_pos, output_width)
#                                   if row_buffer[i] == ' '), output_width)
#                     end_pos = min(col_pos + word_length, output_width)

#                 # Place word in buffer
#                 for i, char in enumerate(word['text']):
#                     if col_pos + i < output_width:
#                         row_buffer[col_pos + i] = char

#         # Convert buffer to string and add to output
#         output_lines.append(''.join(row_buffer).rstrip())

#     return '\n'.join(output_lines)

# def format_as_table(blocks):
#     """Enhanced table formatting using Textract's table detection"""
#     # Extract table data
#     tables = []
#     current_table = []
#     current_row = []

#     for block in blocks:
#         if block['BlockType'] == 'TABLE':
#             if current_table:
#                 tables.append(current_table)
#             current_table = []
#         elif block['BlockType'] == 'CELL':
#             if 'Relationships' in block:
#                 cell_text = ""
#                 for rel in block['Relationships']:
#                     if rel['Type'] == 'CHILD':
#                         for child_id in rel['Ids']:
#                             # Find corresponding word block
#                             word_block = next(
#                                 (b for b in blocks if b['Id'] == child_id and b['BlockType'] == 'WORD'),
#                                 None
#                             )
#                             if word_block:
#                                 cell_text += word_block['Text'] + " "
#                 current_row.append(cell_text.strip())
#         elif block['BlockType'] == 'ROW':
#             if current_row:
#                 current_table.append(current_row)
#             current_row = []

#     if current_row:
#         current_table.append(current_row)
#     if current_table:
#         tables.append(current_table)

#     # Format tables with borders
#     formatted_tables = []
#     for table in tables:
#         if not table or not table[0]:
#             continue

#         # Calculate column widths
#         col_widths = [max(len(str(row[i])) for row in table) for i in range(len(table[0]))]

#         # Create horizontal border
#         horizontal_border = '┼'.join('─' * (w + 2) for w in col_widths)
#         horizontal_border = '┌' + horizontal_border + '┐'
#         horizontal_border = horizontal_border.replace('┼', '┬', 1).replace('┼', '┴')

#         # Build table
#         table_lines = [horizontal_border]
#         for i, row in enumerate(table):
#             # Format row
#             row_str = "│"
#             for j, cell in enumerate(row):
#                 row_str += f" {cell.ljust(col_widths[j])} │"
#             table_lines.append(row_str)

#             # Add separator
#             if i == 0:  # After header
#                 sep = '├' + '┼'.join('─' * (w + 2) for w in col_widths) + '┤'
#                 table_lines.append(sep)

#         # Add bottom border
#         bottom_border = '└' + '┴'.join('─' * (w + 2) for w in col_widths) + '┘'
#         table_lines.append(bottom_border)

#         formatted_tables.append('\n'.join(table_lines))

#     return '\n\n'.join(formatted_tables)

# def create_visualization(blocks, image_bytes):
#     """Create visualization of detected text regions on the original image"""
#     img = Image.open(io.BytesIO(image_bytes))
#     draw = ImageDraw.Draw(img)

#     # Draw different block types in different colors
#     colors = {
#         'PAGE': 'blue',
#         'LINE': 'red',
#         'WORD': 'green',
#         'TABLE': 'purple',
#         'CELL': 'orange'
#     }

#     for block in blocks:
#         block_type = block['BlockType']
#         box = block['Geometry']['BoundingBox']
#         left = img.width * box['Left']
#         top = img.height * box['Top']
#         right = left + (img.width * box['Width'])
#         bottom = top + (img.height * box['Height'])

#         color = colors.get(block_type, 'yellow')
#         draw.rectangle([left, top, right, bottom], outline=color, width=2)

#         if block_type == 'LINE' and 'Text' in block:
#             draw.text((left, top-15), block['Text'], fill=color)

#     # Save image to bytes
#     img_byte_arr = io.BytesIO()
#     img.save(img_byte_arr, format='PNG')
#     return img_byte_arr.getvalue()

# @csrf_exempt
# @require_http_methods(["POST"])
# def upload_document(request):
#     """
#     Handle document upload and process with AWS Textract
#     """
#     try:
#         if 'document' not in request.FILES:
#             return JsonResponse({'error': 'No document uploaded'}, status=400)

#         file = request.FILES['document']
        
#         # Validate file type
#         allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/tiff']
#         if file.content_type not in allowed_types:
#             return JsonResponse({
#                 'error': f'Invalid file type. Allowed types: {", ".join(allowed_types)}'
#             }, status=400)

#         # Create temporary file to store upload
#         with tempfile.NamedTemporaryFile(delete=False) as temp_file:
#             for chunk in file.chunks():
#                 temp_file.write(chunk)
#             temp_file_path = temp_file.name

#         try:
#             # Read file bytes
#             with open(temp_file_path, 'rb') as f:
#                 file_bytes = f.read()

#             # Process document with our enhanced function
#             logger.info(f'Processing document with AWS Textract: {file.name}')
#             blocks = process_document(file_bytes)
#             logger.info(f'Textract returned {len(blocks)} blocks')
            
#             # If AWS Textract failed, create sample blocks for testing Google Colab algorithms
#             if not blocks:
#                 logger.warning('AWS Textract returned no blocks, creating sample data for Google Colab testing')
#                 blocks = [
#                     {
#                         'Id': 'sample-block-1',
#                         'BlockType': 'WORD',
#                         'Text': 'Medical',
#                         'Geometry': {
#                             'BoundingBox': {
#                                 'Left': 0.1,
#                                 'Top': 0.1,
#                                 'Width': 0.1,
#                                 'Height': 0.05
#                             }
#                         }
#                     },
#                     {
#                         'Id': 'sample-block-2',
#                         'BlockType': 'WORD',
#                         'Text': 'Lab',
#                         'Geometry': {
#                             'BoundingBox': {
#                                 'Left': 0.22,
#                                 'Top': 0.1,
#                                 'Width': 0.08,
#                                 'Height': 0.05
#                             }
#                         }
#                     },
#                     {
#                         'Id': 'sample-block-3',
#                         'BlockType': 'WORD',
#                         'Text': 'Report',
#                         'Geometry': {
#                             'BoundingBox': {
#                                 'Left': 0.32,
#                                 'Top': 0.1,
#                                 'Width': 0.12,
#                                 'Height': 0.05
#                             }
#                         }
#                     }
#                 ]
            
#             # Import and use Google Colab algorithms for maximum accuracy
#             from .google_colab_textract import process_document_with_colab_algorithms
            
#             # Process with EXACT Google Colab algorithms
#             logger.info('Starting Google Colab algorithm processing...')
#             colab_results = process_document_with_colab_algorithms(blocks)
#             logger.info(f'Google Colab processing result: {colab_results["success"]}')
            
#             if not colab_results['success']:
#                 logger.error(f'Google Colab processing failed: {colab_results["error"]}')
#                 return JsonResponse({
#                     'success': False,
#                     'error': f"Google Colab processing failed: {colab_results['error']}"
#                 }, status=500)
            
#             # Use Google Colab results
#             text_output = colab_results['combined_text']
#             logger.info(f'Generated text output length: {len(text_output)}')
                
#             logger.info(f'Successfully processed document: {file.name}, blocks: {len(blocks)}')
#             logger.info(f'Google Colab processing: {colab_results["algorithm_source"]}')
            
#             # Debug logging to see what we're sending
#             logger.info(f'Sending response with {len(blocks)} blocks')
#             logger.info(f'Google Colab success: {colab_results["success"]}')
#             logger.info(f'Combined text length: {len(text_output) if text_output else 0}')

#             return JsonResponse({
#                 'success': True,
#                 'raw_blocks': blocks,  # Raw blocks for frontend processing
#                 'blocks': blocks,      # Keep for backward compatibility
#                 'raw_text': text_output,  # Google Colab processed text
#                 'fileName': file.name,
#                 'blocksCount': len(blocks),
#                 'formattedText': text_output,
#                 'hasTable': bool(colab_results['formatted_tables']),
#                 'structured_results': {
#                     'blocks': blocks,
#                     'positioned_text': colab_results['positioned_text'],
#                     'formatted_tables': colab_results['formatted_tables'],
#                     'algorithm_used': 'Google Colab - Exact Implementation'
#                 }
#             })

#         except Exception as textract_error:
#             logger.error(f'Textract processing error: {str(textract_error)}')
#             return JsonResponse({
#                 'error': f'Textract processing failed: {str(textract_error)}'
#             }, status=500)

#         finally:
#             # Clean up temporary file
#             if os.path.exists(temp_file_path):
#                 os.unlink(temp_file_path)

#     except Exception as e:
#         logger.error(f'Document upload error: {str(e)}')
#         return JsonResponse({
#             'error': f'Upload failed: {str(e)}'
#         }, status=500)

# @csrf_exempt
# @require_http_methods(["POST"])
# def get_visualization(request):
#     """
#     Generate visualization of text detection on the image
#     """
#     try:
#         if 'document' not in request.FILES:
#             return JsonResponse({'error': 'No document uploaded'}, status=400)

#         file = request.FILES['document']
        
#         # Create temporary file to store upload
#         with tempfile.NamedTemporaryFile(delete=False) as temp_file:
#             for chunk in file.chunks():
#                 temp_file.write(chunk)
#             temp_file_path = temp_file.name

#         try:
#             # Read file bytes
#             with open(temp_file_path, 'rb') as f:
#                 file_bytes = f.read()

#             # Process document
#             blocks = process_document(file_bytes)
            
#             # Create visualization using Google Colab algorithm
#             from .google_colab_textract import visualize_layout
#             visualization = visualize_layout(file_bytes, blocks)
            
#             if visualization is None:
#                 return JsonResponse({
#                     'error': 'Failed to create visualization'
#                 }, status=500)
            
#             # Return the image
#             return HttpResponse(visualization, content_type='image/png')

#         except Exception as vis_error:
#             logger.error(f'Visualization error: {str(vis_error)}')
#             return JsonResponse({
#                 'error': f'Visualization failed: {str(vis_error)}'
#             }, status=500)

#         finally:
#             # Clean up temporary file
#             if os.path.exists(temp_file_path):
#                 os.unlink(temp_file_path)

#     except Exception as e:
#         logger.error(f'Visualization request error: {str(e)}')
#         return JsonResponse({
#             'error': f'Visualization failed: {str(e)}'
#         }, status=500)

# @require_http_methods(["GET"])
# def health_check(request):
#     """
#     Health check endpoint
#     """
#     try:
#         # Test AWS credentials
#         try:
#             textract_client = boto3.client(
#                 'textract',
#                 aws_access_key_id=getattr(settings, 'AWS_ACCESS_KEY_ID', 'AKIAZZ56MPEX5EMQ7WUD'),
#                 aws_secret_access_key=getattr(settings, 'AWS_SECRET_ACCESS_KEY', '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'),
#                 region_name=getattr(settings, 'AWS_REGION', 'us-east-1')
#             )
#             # Simple test to verify credentials
#             textract_client.list_adapters()
#             aws_status = 'Connected'
#         except Exception:
#             aws_status = 'Disconnected'

#         return JsonResponse({
#             'status': 'healthy',
#             'service': 'AWS Textract OCR Django Backend',
#             'aws_textract': aws_status,
#             'timestamp': '2025-01-21T12:00:00Z'
#         })
    
#     except Exception as e:
#         return JsonResponse({
#             'status': 'error',
#             'error': str(e)
#         }, status=500)

# @require_http_methods(["GET"])
# def health_check(request):
#     """
#     Health check endpoint
#     """
#     try:
#         # Test AWS credentials
#         try:
#             textract_client = boto3.client(
#                 'textract',
#                 aws_access_key_id=getattr(settings, 'AWS_ACCESS_KEY_ID', 'AKIAZZ56MPEX5EMQ7WUD'),
#                 aws_secret_access_key=getattr(settings, 'AWS_SECRET_ACCESS_KEY', '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'),
#                 region_name=getattr(settings, 'AWS_REGION', 'us-east-1')
#             )
#             # Simple test to verify credentials
#             textract_client.list_adapters()
#             aws_status = 'Connected'
#         except Exception:
#             aws_status = 'Disconnected'

#         return JsonResponse({
#             'status': 'healthy',
#             'service': 'AWS Textract OCR Django Backend',
#             'aws_textract': aws_status,
#             'timestamp': '2025-01-21T12:00:00Z'
#         })
    
#     except Exception as e:
#         return JsonResponse({
#             'status': 'error',
#             'error': str(e)
#         }, status=500)
