"""
Amazon Textract OCR API for Lab Results Processing
Enhanced table extraction and structured data processing for medical documents
Enhanced to handle slanted/rotated documents with line-by-line detection
Includes Google Colab algorithms for maximum accuracy - merged implementation
"""

import io
import json
import base64
import re
import math
import os
from typing import List, Dict, Any, Tuple
from PIL import Image, ImageEnhance, ImageFilter, ImageOps, ImageDraw
import boto3
import pandas as pd
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.conf import settings
import logging
import traceback

logger = logging.getLogger(__name__)

# Optional imports for advanced processing
try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False
    logger.warning("NumPy not available, using fallback methods for rotation detection")

def get_aws_credentials():
    """Get AWS credentials from environment variables for security"""
    try:
        # Get credentials from environment variables
        aws_access_key_id = os.getenv('AWS_ACCESS_KEY_ID')
        aws_secret_access_key = os.getenv('AWS_SECRET_ACCESS_KEY')
        aws_region = os.getenv('AWS_REGION', 'us-east-1')
        
        if not aws_access_key_id or not aws_secret_access_key:
            logger.warning("AWS credentials not found in environment variables")
            return None
            
        logger.info("Using AWS credentials from environment variables")
        return {
            'aws_access_key_id': aws_access_key_id,
            'aws_secret_access_key': aws_secret_access_key,
            'region_name': aws_region
        }
        
    except Exception as e:
        logger.error(f"Error retrieving AWS credentials from environment: {e}")
        return None

def get_textract_client():
    """Get configured AWS Textract client"""
    credentials = get_aws_credentials()
    if not credentials:
        raise Exception("AWS credentials not configured. Please set them in Django Admin under 'AWS Credentials'.")
    
    try:
        client = boto3.client('textract', **credentials)
        return client
    except Exception as e:
        logger.error(f"Failed to create Textract client: {e}")
        raise Exception(f"AWS Textract client configuration failed: {e}")


def build_positional_tui(blocks, output_width=120):
    """
    Build positional TUI output preserving original layout
    EXACT Google Colab implementation - Direct translation
    
    Args:
        blocks: AWS Textract blocks
        output_width: Output width for text formatting (default: 120)
    
    Returns:
        str: Formatted text with preserved positioning
    """
    logger.info(f'🔍 build_positional_tui called with {len(blocks)} blocks')
    
    # Collect all words with their positions (exact same as Colab)
    words = []
    for block in blocks:
        if block['BlockType'] == 'WORD' and 'Text' in block:
            box = block['Geometry']['BoundingBox']
            words.append({
                'text': block['Text'],
                'left': box['Left'],
                'top': box['Top'],
                'width': box['Width'],
                'height': box['Height']
            })

    if len(words) == 0:
        logger.warning('❌ No words found in blocks')
        return "No text detected"

    logger.info(f'📊 Found {len(words)} words')

    # Calculate document boundaries (exact same as Colab)
    min_left = min(w['left'] for w in words)
    max_right = max(w['left'] + w['width'] for w in words)
    min_top = min(w['top'] for w in words)
    max_bottom = max(w['top'] + w['height'] for w in words)

    logger.info(f'📐 Document boundaries: left={min_left}, right={max_right}, top={min_top}, bottom={max_bottom}')

    # Create dynamic row grouping with adaptive tolerance (exact same as Colab)
    vertical_positions = sorted(list(set(w['top'] for w in words)))
    row_groups = []
    current_group = [vertical_positions[0]]

    for i in range(1, len(vertical_positions)):
        pos = vertical_positions[i]
        if pos - current_group[-1] < 0.005:  # Adaptive tolerance - EXACT same value
            current_group.append(pos)
        else:
            if HAS_NUMPY:
                row_groups.append(np.mean(current_group))
            else:
                row_groups.append(sum(current_group) / len(current_group))  # Fallback without numpy
            current_group = [pos]

    if current_group:
        if HAS_NUMPY:
            row_groups.append(np.mean(current_group))
        else:
            row_groups.append(sum(current_group) / len(current_group))

    logger.info(f'📊 Created {len(row_groups)} row groups')

    # Organize words by row (exact same as Colab)
    rows = {}
    for word in words:
        # Find closest row group
        row_key = min(row_groups, key=lambda x: abs(x - word['top']))
        if row_key not in rows:
            rows[row_key] = []
        rows[row_key].append(word)

    # Sort rows top-to-bottom (exact same as Colab)
    sorted_rows = sorted(rows.items(), key=lambda x: x[0])

    logger.info(f'📊 Organized into {len(sorted_rows)} rows')

    # Create output grid (exact same as Colab)
    output_lines = []
    prev_row_key = None

    for row_key, words_in_row in sorted_rows:
        # Add vertical spacing between rows (EXACT same threshold)
        if prev_row_key is not None and (row_key - prev_row_key) > 0.02:
            output_lines.append("")  # Add empty line for vertical spacing

        prev_row_key = row_key

        # Sort words left-to-right
        words_in_row.sort(key=lambda x: x['left'])

        # Create row buffer
        row_buffer = [' '] * output_width

        # Place words in row buffer (exact same as Colab)
        for word in words_in_row:
            # Calculate position in output grid
            if max_right > min_left:  # Prevent division by zero
                col_pos = int(((word['left'] - min_left) / (max_right - min_left)) * (output_width - 1))
            else:
                col_pos = 0
            
            word_length = len(word['text'])

            # Ensure word fits in buffer
            if col_pos < output_width:
                end_pos = min(col_pos + word_length, output_width)

                # Check for overlap (exact same logic as Colab)
                has_overlap = False
                for i in range(col_pos, end_pos):
                    if row_buffer[i] != ' ':
                        has_overlap = True
                        break

                if has_overlap:
                    # Handle overlap by moving to next available space (exact same as Colab)
                    for i in range(col_pos, output_width):
                        if row_buffer[i] == ' ':
                            col_pos = i
                            break
                    end_pos = min(col_pos + word_length, output_width)

                # Place word in buffer
                for i, char in enumerate(word['text']):
                    pos = col_pos + i
                    if 0 <= pos < output_width:
                        row_buffer[pos] = char

        # Convert to string and trim right (exact same as Colab)
        line_text = ''.join(row_buffer).rstrip()
        output_lines.append(line_text)

    logger.info(f'✅ build_positional_tui complete, generated {len(output_lines)} lines')
    return '\n'.join(output_lines)

def format_as_table(blocks):
    """
    Enhanced table formatting using Textract's table detection
    EXACT Google Colab implementation - Direct translation
    
    Args:
        blocks: AWS Textract blocks
    
    Returns:
        str: Formatted table text with borders
    """
    logger.info(f'🔍 format_as_table called with {len(blocks)} blocks')
    
    # Extract table data (exact same as Colab)
    tables = []
    current_table = []
    current_row = []

    for block in blocks:
        if block['BlockType'] == 'TABLE':
            if current_table:
                tables.append(current_table)
            current_table = []
        elif block['BlockType'] == 'CELL':
            if 'Relationships' in block:
                cell_text = ""
                for rel in block['Relationships']:
                    if rel['Type'] == 'CHILD':
                        for child_id in rel['Ids']:
                            # Find corresponding word block (exact same as Colab)
                            word_block = next((b for b in blocks if b['Id'] == child_id and b['BlockType'] == 'WORD'), None)
                            if word_block and 'Text' in word_block:
                                cell_text += word_block['Text'] + " "
                current_row.append(cell_text.strip())
        elif block['BlockType'] == 'ROW':
            if current_row:
                current_table.append(current_row)
            current_row = []

    if current_row:
        current_table.append(current_row)
    if current_table:
        tables.append(current_table)

    logger.info(f'📊 Found {len(tables)} tables')

    # Format tables with borders (exact same as Colab)
    formatted_tables = []
    for table in tables:
        if not table or len(table) == 0 or not table[0]:
            continue

        # Calculate column widths (exact same as Colab)
        col_widths = []
        for i in range(len(table[0])):
            max_width = max(len(str(row[i] if i < len(row) else '')) for row in table)
            col_widths.append(max_width)

        # Create horizontal border (exact same Unicode characters as Colab)
        horizontal_border = '┌' + '┬'.join('─' * (w + 2) for w in col_widths) + '┐'

        # Build table (exact same as Colab)
        table_lines = [horizontal_border]
        for i, row in enumerate(table):
            # Format row
            row_str = "│"
            for j, col_width in enumerate(col_widths):
                cell = str(row[j] if j < len(row) else '')
                row_str += f" {cell.ljust(col_width)} │"
            table_lines.append(row_str)

            # Add separator after header (exact same as Colab)
            if i == 0:
                sep = '├' + '┼'.join('─' * (w + 2) for w in col_widths) + '┤'
                table_lines.append(sep)

        # Add bottom border (exact same as Colab)
        bottom_border = '└' + '┴'.join('─' * (w + 2) for w in col_widths) + '┘'
        table_lines.append(bottom_border)

        formatted_tables.append('\n'.join(table_lines))

    logger.info(f'✅ format_as_table complete: {len(formatted_tables)} tables formatted')
    return '\n\n'.join(formatted_tables)

def process_document_with_colab_algorithms(blocks):
    """
    Process document using EXACT Google Colab algorithms for maximum accuracy
    
    Args:
        blocks: AWS Textract blocks from detect_document_text or analyze_document
    
    Returns:
        dict: Processed results with positioned text and formatted tables
    """
    logger.info('🚀 Processing document with Google Colab algorithms...')
    logger.info(f'📊 Input blocks: {len(blocks)} blocks')
    
    if not blocks:
        logger.warning('❌ No blocks provided')
        return {
            'success': False,
            'error': 'No blocks provided',
            'positioned_text': '',
            'formatted_tables': '',
            'combined_text': ''
        }

    try:
        # Debug: Check block types
        block_types = {}
        for block in blocks:
            block_type = block.get('BlockType', 'UNKNOWN')
            block_types[block_type] = block_types.get(block_type, 0) + 1
        
        logger.info(f'📋 Block types: {block_types}')
        
        # Use the EXACT same functions as Google Colab
        positioned_text = build_positional_tui(blocks, 120)
        table_text = format_as_table(blocks)
        
        logger.info(f'📝 Positioned text length: {len(positioned_text)}')
        logger.info(f'📊 Table text length: {len(table_text) if table_text else 0}')
        
        # Combine outputs exactly like Colab
        combined_text = positioned_text
        if table_text:
            combined_text += "\n\n" + table_text
        
        logger.info(f'✅ Final combined text length: {len(combined_text)}')
        logger.info('✅ Document processing complete with Google Colab-identical accuracy')
        
        return {
            'success': True,
            'positioned_text': positioned_text,
            'formatted_tables': table_text,
            'combined_text': combined_text,
            'blocks_processed': len(blocks),
            'algorithm_source': 'Google Colab - Exact Implementation'
        }
        
    except Exception as e:
        logger.error(f'❌ Processing failed: {str(e)}')
        logger.error(f'❌ Full error: {traceback.format_exc()}')
        return {
            'success': False,
            'error': str(e),
            'positioned_text': '',
            'formatted_tables': '',
            'combined_text': ''
        }

# ============================================================================
# DOCUMENT ROTATION AND PREPROCESSING
# ============================================================================

def detect_document_rotation(image_bytes: bytes) -> float:
    """Detect rotation angle of document using text line analysis"""
    try:
        # Convert bytes to PIL Image
        image = Image.open(io.BytesIO(image_bytes))
        
        # Convert to grayscale for better edge detection
        if image.mode != 'L':
            image = image.convert('L')
        
        # Enhance contrast
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(2.0)
        
        # Apply edge detection filter
        image = image.filter(ImageFilter.FIND_EDGES)
        
        # Convert to numpy array for line detection
        try:
            import cv2
            img_array = np.array(image)
            
            # Use Hough Line Transform to detect lines
            lines = cv2.HoughLines(img_array, 1, np.pi/180, threshold=100)
            
            if lines is not None:
                angles = []
                for rho, theta in lines[:20]:  # Use first 20 lines
                    angle = theta * 180 / np.pi
                    # Convert to rotation angle (text should be horizontal)
                    if angle > 90:
                        angle = angle - 180
                    angles.append(angle)
                
                # Find most common angle (mode)
                if angles:
                    # Calculate median angle for stability
                    rotation_angle = np.median(angles)
                    logger.info(f"Detected document rotation: {rotation_angle:.2f} degrees")
                    return rotation_angle
            
        except ImportError:
            logger.warning("OpenCV not available, using alternative rotation detection")
            # Fallback method without OpenCV
            return detect_rotation_fallback(image)
            
    except Exception as e:
        logger.error(f"Error detecting document rotation: {e}")
    
    return 0.0  # No rotation detected

def detect_rotation_fallback(image: Image.Image) -> float:
    
    try:
        # Simple edge-based rotation detection
        width, height = image.size
        
        # Sample horizontal lines at different heights
        angles = []
        for y in range(height // 4, 3 * height // 4, height // 10):
            pixels = list(image.crop((0, y, width, y + 1)).getdata())
            
            # Find edge transitions
            transitions = []
            for i in range(1, len(pixels)):
                if abs(pixels[i] - pixels[i-1]) > 50:  # Edge threshold
                    transitions.append(i)
            
            # Calculate line angle from edge pattern
            if len(transitions) >= 2:
                # Simple linear regression on transition points
                x_coords = list(range(len(transitions)))
                y_coords = transitions
                if len(x_coords) > 1:
                    slope = sum((x - sum(x_coords)/len(x_coords)) * (y - sum(y_coords)/len(y_coords)) 
                              for x, y in zip(x_coords, y_coords)) / sum((x - sum(x_coords)/len(x_coords))**2 
                              for x in x_coords)
                    angle = math.atan(slope) * 180 / math.pi
                    angles.append(angle)
        
        if angles:
            return sum(angles) / len(angles)
    
    except Exception as e:
        logger.error(f"Error in fallback rotation detection: {e}")
    
    return 0.0

def correct_document_rotation(image_bytes: bytes, rotation_angle: float) -> bytes:
    """Correct document rotation by rotating the image"""
    try:
        if abs(rotation_angle) < 1.0:  # Skip correction for minor rotations
            return image_bytes
            
        # Convert bytes to PIL Image
        image = Image.open(io.BytesIO(image_bytes))
        
        # Rotate image to correct orientation
        corrected_image = image.rotate(-rotation_angle, expand=True, fillcolor='white')
        
        # Convert back to bytes
        output = io.BytesIO()
        corrected_image.save(output, format='PNG', quality=95)
        corrected_bytes = output.getvalue()
        
        logger.info(f"Corrected document rotation by {rotation_angle:.2f} degrees")
        return corrected_bytes
        
    except Exception as e:
        logger.error(f"Error correcting document rotation: {e}")
        return image_bytes  # Return original on error

def preprocess_image_for_ocr(image_bytes: bytes) -> bytes:
    """Enhanced image preprocessing with rotation correction for slanted documents"""
    try:
        logger.info("Starting enhanced image preprocessing with rotation detection")
        
        # Step 1: Detect document rotation
        rotation_angle = detect_document_rotation(image_bytes)
        
        # Step 2: Correct rotation if significant
        if abs(rotation_angle) > 1.0:
            logger.info(f"Correcting document rotation: {rotation_angle:.2f} degrees")
            image_bytes = correct_document_rotation(image_bytes, rotation_angle)
        else:
            logger.info("No significant rotation detected, skipping correction")
        
        # Step 3: Additional enhancement for better OCR
        image = Image.open(io.BytesIO(image_bytes))
        
        # Convert to RGB if needed
        if image.mode not in ['RGB', 'L']:
            image = image.convert('RGB')
        
        # Enhance contrast for better text recognition
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(1.2)
        
        # Enhance sharpness
        enhancer = ImageEnhance.Sharpness(image)
        image = enhancer.enhance(1.1)
        
        # Save enhanced image
        output = io.BytesIO()
        image.save(output, format='PNG', quality=95)
        enhanced_bytes = output.getvalue()
        
        logger.info("Image preprocessing completed successfully")
        return enhanced_bytes
        
    except Exception as e:
        logger.error(f"Error in enhanced image preprocessing: {e}")
        return image_bytes  # Return original on any error

def extract_text_with_enhanced_textract(image_bytes: bytes) -> Tuple[str, List[Dict]]:
    """Enhanced Textract extraction with rotation correction and line-by-line detection"""
    try:
        # Initialize Textract client
        textract_client = get_textract_client()
        if not textract_client:
            raise Exception("Textract client not available")
        
        # Step 1: Preprocess image to correct rotation
        logger.info("Preprocessing image for rotation correction")
        processed_image_bytes = preprocess_image_for_ocr(image_bytes)
        
        # Step 2: Use detect_document_text for line-by-line extraction
        logger.info("Performing Textract OCR with line-by-line detection")
        response = textract_client.detect_document_text(
            Document={'Bytes': processed_image_bytes}
        )
        
        # Step 3: Extract and organize text blocks by lines
        lines = []
        words = []
        
        for block in response['Blocks']:
            if block['BlockType'] == 'LINE':
                lines.append({
                    'text': block['Text'],
                    'confidence': block['Confidence'],
                    'geometry': block['Geometry'],
                    'top': block['Geometry']['BoundingBox']['Top'],
                    'left': block['Geometry']['BoundingBox']['Left'],
                    'height': block['Geometry']['BoundingBox']['Height'],
                    'width': block['Geometry']['BoundingBox']['Width']
                })
            elif block['BlockType'] == 'WORD':
                words.append({
                    'text': block['Text'],
                    'confidence': block['Confidence'],
                    'geometry': block['Geometry'],
                    'top': block['Geometry']['BoundingBox']['Top'],
                    'left': block['Geometry']['BoundingBox']['Left']
                })
        
        # Step 4: Sort lines by vertical position (top to bottom)
        lines.sort(key=lambda x: x['top'])
        
        # Step 5: Group words into lines if LINE detection missed some
        if len(words) > len(lines) * 2:  # More words than expected for lines
            logger.info("Reconstructing lines from word-level detection")
            reconstructed_lines = reconstruct_lines_from_words(words)
            if reconstructed_lines:
                lines.extend(reconstructed_lines)
                lines.sort(key=lambda x: x['top'])
        
        # Step 6: Combine into full text with proper line breaks
        full_text = '\n'.join([line['text'] for line in lines])
        
        logger.info(f"Enhanced Textract extracted {len(lines)} lines with avg confidence: {sum(l['confidence'] for l in lines)/len(lines) if lines else 0:.2f}%")
        return full_text, lines
        
    except Exception as e:
        logger.error(f"Enhanced Textract extraction failed: {e}")
        return None, None

def reconstruct_lines_from_words(words: List[Dict]) -> List[Dict]:
    """Reconstruct lines from individual words when line detection fails"""
    try:
        if not words:
            return []
        
        # Group words by approximate Y position (line height)
        word_groups = {}
        line_threshold = 0.01  # Threshold for grouping words into lines
        
        for word in words:
            y_pos = word['top']
            # Find existing group or create new one
            found_group = False
            for group_y in word_groups:
                if abs(y_pos - group_y) < line_threshold:
                    word_groups[group_y].append(word)
                    found_group = True
                    break
            
            if not found_group:
                word_groups[y_pos] = [word]
        
        # Convert groups to line format
        reconstructed_lines = []
        for y_pos, group_words in word_groups.items():
            # Sort words in group by X position (left to right)
            group_words.sort(key=lambda w: w['left'])
            
            # Combine words into line text
            line_text = ' '.join([w['text'] for w in group_words])
            
            # Calculate line bounding box
            left = min(w['left'] for w in group_words)
            top = min(w['top'] for w in group_words) 
            right = max(w['left'] + w['geometry']['BoundingBox']['Width'] for w in group_words)
            bottom = max(w['top'] + w['geometry']['BoundingBox']['Height'] for w in group_words)
            
            # Average confidence
            avg_confidence = sum(w['confidence'] for w in group_words) / len(group_words)
            
            reconstructed_lines.append({
                'text': line_text,
                'confidence': avg_confidence,
                'geometry': {
                    'BoundingBox': {
                        'Top': top,
                        'Left': left,
                        'Width': right - left,
                        'Height': bottom - top
                    }
                },
                'top': top,
                'left': left,
                'height': bottom - top,
                'width': right - left
            })
        
        logger.info(f"Reconstructed {len(reconstructed_lines)} lines from {len(words)} words")
        return reconstructed_lines
        
    except Exception as e:
        logger.error(f"Error reconstructing lines from words: {e}")
        return []

def extract_lab_results_with_enhanced_patterns(text: str) -> List[Dict[str, Any]]:
    """Enhanced lab result extraction with comprehensive patterns"""
    
    # Comprehensive patterns for lab tests - more specific and accurate
    enhanced_patterns = [
        # Physical examination parameters
        (r'COLOUR\s*:\s*([^\n\r]+)', 'COLOUR'),
        (r'COLOR\s*:\s*([^\n\r]+)', 'COLOR'),
        (r'APPEARANCE\s*:\s*([^\n\r]+)', 'APPEARANCE'),
        (r'REACTION\s*:\s*([^\n\r]+)', 'REACTION'),
        (r'PH\s*:\s*([^\n\r]+)', 'PH'),
        (r'SPECIFIC\s*GRAVITY\s*:\s*([^\n\r]+)', 'SPECIFIC GRAVITY'),
        
        # Chemical parameters
        (r'ALBUMIN\s*:\s*([^\n\r]+)', 'ALBUMIN'),
        (r'SUGAR\s*:\s*([^\n\r]+)', 'SUGAR'),
        (r'GLUCOSE\s*:\s*([^\n\r]+)', 'GLUCOSE'),
        (r'PROTEIN\s*:\s*([^\n\r]+)', 'PROTEIN'),
        (r'KETONES\s*:\s*([^\n\r]+)', 'KETONES'),
        (r'BILESALT\s*:\s*([^\n\r]+)', 'BILESALT'),
        (r'BILE\s*SALT\s*:\s*([^\n\r]+)', 'BILE SALT'),
        (r'BILEPIGMENT\s*:\s*([^\n\r]+)', 'BILEPIGMENT'),
        (r'BILE\s*PIGMENT\s*:\s*([^\n\r]+)', 'BILE PIGMENT'),
        (r'UROBILINOGEN\s*:\s*([^\n\r]+)', 'UROBILINOGEN'),
        (r'NITRITES\s*:\s*([^\n\r]+)', 'NITRITES'),
        (r'LEUKOCYTE\s*ESTERASE\s*:\s*([^\n\r]+)', 'LEUKOCYTE ESTERASE'),
        
        # Microscopic examination
        (r'PUS\s*CELLS\s*:\s*([^\n\r]+)', 'PUS CELLS'),
        (r'EPITHELIAL\s*CELLS\s*:\s*([^\n\r]+)', 'EPITHELIAL CELLS'),
        (r'RBCS\s*:\s*([^\n\r]+)', 'RBCS'),
        (r'RED\s*BLOOD\s*CELLS\s*:\s*([^\n\r]+)', 'RED BLOOD CELLS'),
        (r'WBCS\s*:\s*([^\n\r]+)', 'WBCS'),
        (r'WHITE\s*BLOOD\s*CELLS\s*:\s*([^\n\r]+)', 'WHITE BLOOD CELLS'),
        (r'CRYSTALS\s*:\s*([^\n\r]+)', 'CRYSTALS'),
        (r'CAST\s*:\s*([^\n\r]+)', 'CAST'),
        (r'CASTS\s*:\s*([^\n\r]+)', 'CASTS'),
        (r'BACTERIA\s*:\s*([^\n\r]+)', 'BACTERIA'),
        (r'YEAST\s*:\s*([^\n\r]+)', 'YEAST'),
        (r'DEPOSITS\s*:\s*([^\n\r]+)', 'DEPOSITS'),
        
        # Handle special cases for cell counts
        (r'(\d+\s*-\s*\d+)\s*/\s*HPF', 'CELL_COUNT_RANGE'),
        (r'(\d+)\s*/\s*HPF', 'CELL_COUNT_SINGLE'),
    ]
    
    results = []
    text_upper = text.upper()
    
    # Track processed positions to avoid duplicates
    processed_positions = set()
    
    for pattern, test_type in enhanced_patterns:
        matches = re.finditer(pattern, text_upper, re.IGNORECASE | re.MULTILINE)
        for match in matches:
            # Skip if this position was already processed
            if match.span() in processed_positions:
                continue
                
            value = match.group(1).strip()
            if value and len(value) > 0:  # Only add non-empty values
                # Extract unit from value if present
                unit = ''
                if '/HPF' in value:
                    unit = '/HPF'
                    value = value.replace('/HPF', '').strip()
                elif 'mg/dL' in value:
                    unit = 'mg/dL'
                    value = value.replace('mg/dL', '').strip()
                elif 'g/dL' in value:
                    unit = 'g/dL'
                    value = value.replace('g/dL', '').strip()
                
                # Determine test status
                status = determine_test_status(test_type, value)
                
                results.append({
                    'test_name': test_type,
                    'result_value': value,
                    'unit': unit,
                    'status': status,
                    'confidence': 0.9,
                    'match_position': match.span(),
                    'reference_range': get_reference_range(test_type)
                })
                
                processed_positions.add(match.span())
    
    # Remove duplicates based on test name and value
    unique_results = []
    seen = set()
    for result in results:
        key = (result['test_name'], result['result_value'])
        if key not in seen:
            unique_results.append(result)
            seen.add(key)
    
    logger.info(f"Enhanced pattern extraction found {len(unique_results)} unique lab results")
    return unique_results

def determine_test_status(test_name: str, value: str) -> str:
    """Determine if a test result is normal, abnormal, or critical"""
    test_upper = test_name.upper()
    value_upper = value.upper()
    
    # Handle positive/negative results
    if value_upper in ['NEGATIVE', 'NIL', 'ABSENT', 'NOT DETECTED']:
        return 'normal'
    elif value_upper in ['POSITIVE', '+', '++', '+++', 'PRESENT', 'DETECTED']:
        if any(keyword in test_upper for keyword in ['ALBUMIN', 'SUGAR', 'GLUCOSE', 'PROTEIN', 'KETONES']):
            return 'critical' if '+++' in value_upper else 'abnormal'
        return 'normal'  # For some tests, positive is normal
    
    # Handle numeric ranges
    if '/HPF' in test_upper or 'CELLS' in test_upper:
        try:
            # Parse range like "2-3" or "15-20"
            range_match = re.search(r'(\d+)\s*-\s*(\d+)', value)
            if range_match:
                min_val = int(range_match.group(1))
                max_val = int(range_match.group(2))
            else:
                # Single number
                single_match = re.search(r'(\d+)', value)
                if single_match:
                    min_val = max_val = int(single_match.group(1))
                else:
                    return 'normal'
            
            # Check against reference ranges
            if 'PUS' in test_upper and max_val > 5:
                return 'critical' if max_val > 15 else 'abnormal'
            elif 'EPITHELIAL' in test_upper and max_val > 3:
                return 'abnormal'
            elif ('RBC' in test_upper or 'RED BLOOD' in test_upper) and max_val > 2:
                return 'abnormal'
        except:
            pass
    
    # Handle specific parameters
    if test_upper == 'PH':
        try:
            ph_val = float(value)
            if ph_val < 4.5 or ph_val > 8.0:
                return 'abnormal'
        except:
            pass
    elif test_upper == 'SPECIFIC GRAVITY':
        try:
            sg_val = float(value)
            if sg_val < 1.003 or sg_val > 1.030:
                return 'abnormal'
        except:
            pass
    
    return 'normal'

def get_reference_range(test_name: str) -> str:
    """Get reference range for a test"""
    reference_ranges = {
        'PUS CELLS': '0-5 /HPF',
        'EPITHELIAL CELLS': '0-3 /HPF',
        'RBCS': '0-2 /HPF',
        'RED BLOOD CELLS': '0-2 /HPF',
        'WBCS': '0-5 /HPF',
        'WHITE BLOOD CELLS': '0-5 /HPF',
        'PH': '4.5-8.0',
        'SPECIFIC GRAVITY': '1.003-1.030',
        'ALBUMIN': 'Negative',
        'SUGAR': 'Negative',
        'GLUCOSE': 'Negative',
        'PROTEIN': 'Negative',
        'KETONES': 'Negative',
        'CRYSTALS': 'Nil',
        'CAST': 'Nil',
        'CASTS': 'Nil',
        'BACTERIA': 'Nil',
    }
    
    return reference_ranges.get(test_name.upper(), 'Normal')

# Initialize Amazon Textract client (moved to top of file)
def fallback_table_extraction(image_bytes: bytes) -> Dict[str, Any]:
    """
    Fallback table extraction using basic text analysis when Textract is not available
    """
    try:
        # Try to extract text from the uploaded file
        text_content = None
        
        try:
            # Try to read as text file
            text_content = image_bytes.decode('utf-8')
            logger.info("File appears to be a text file, using direct content")
            extraction_type = 'text_file'
        except UnicodeDecodeError:
            # Not a text file, try PIL for basic image text extraction
            try:
                import io
                from PIL import Image
                
                image = Image.open(io.BytesIO(image_bytes))
                logger.info(f"Image opened: {image.format}, {image.size}, {image.mode}")
                
                # For image files, we need Textract
                logger.warning("Image file requires AWS Textract for proper extraction")
                return {
                    'requires_textract': True,
                    'error': 'Image processing requires AWS Textract',
                    'full_text': ''
                }
            except Exception as pil_error:
                logger.error(f"Failed to process with PIL: {pil_error}")
                return {
                    'error': f"Failed to process file: {str(pil_error)}",
                    'full_text': ''
                }
        
        if not text_content:
            return {
                'error': 'Could not extract text from file',
                'full_text': ''
            }
        
        return {
            'tables': [],
            'key_value_pairs': [],
            'full_text': text_content
        }
        
    except Exception as e:
        logger.error(f"Fallback extraction error: {e}")
        return {
            'error': f"Extraction failed: {str(e)}",
            'full_text': ''
        }

def process_fallback_results(text_content: str) -> Dict[str, Any]:
    """Process text content to extract lab results using regex patterns"""
    if not text_content:
        return {
            'test_results': [],
            'critical_values': [],
            'abnormal_values': [],
            'document_details': {},
            'summary': {'total_tests': 0, 'normal_count': 0, 'abnormal_count': 0, 'critical_count': 0}
        }
    
    try:
        # Process text content by lines
        lines = text_content.strip().split('\n')
        
        logger.info(f"Processing {len(lines)} lines for text extraction")
        
        results = []
        abnormal = []
        critical = []
        
        # Process each line with lab result patterns
        line_num = 0
        while line_num < len(lines):
            line = lines[line_num]
            line_num += 1
            
            if not line.strip():
                continue
                
            logger.info(f"Line {line_num-1}: '{line}'")
            
            # Skip header lines
            skip_keywords = ['LABORATORY', 'REPORT', 'PATIENT', 'NAME', 'DATE', 'DOCTOR', 'CLINICAL', 'PATHOLOGY', 'ANALYSIS', 'EXAMINATION']
            if any(keyword in line.upper() for keyword in skip_keywords) and len(line.split()) <= 3:
                logger.info(f"Skipping line {line_num-1}: contains skip keyword")
                continue
            
            # Skip lines with just numbers, dates, or special characters
            if re.match(r'^[\d\s\-\.\:\/\,]+$', line) and len(line) < 10:
                logger.info(f"Skipping line {line_num-1}: just numbers/dates/special chars")
                continue
            
            # Check for colon-separated test result pattern (TEST NAME : RESULT)
            colon_match = re.match(r'(.+?)\s*:\s*(.+)', line)
            if colon_match:
                test_name = colon_match.group(1).strip()
                result_value = colon_match.group(2).strip()
                
                logger.info(f"Found colon pattern: '{test_name}' : '{result_value}'")
                
                # Skip section headers
                skip_test_names = ['tel', 'phone', 'email', 'registration', 'sample', 'collected', 'doctor']
                if any(s in test_name.lower() for s in skip_test_names):
                    continue
                
                # Extract unit if present
                unit = ''
                if '/HPF' in result_value:
                    unit = '/HPF'
                
                # Determine status
                status = 'normal'
                if '+++' in result_value:
                    if any(keyword in test_name.upper() for keyword in ['ALBUMIN', 'SUGAR', 'GLUCOSE', 'PROTEIN']):
                        status = 'critical'
                        critical.append(test_name)
                elif '+' in result_value or '++' in result_value:
                    if any(keyword in test_name.upper() for keyword in ['ALBUMIN', 'SUGAR', 'GLUCOSE', 'PROTEIN']):
                        status = 'abnormal'
                        abnormal.append(test_name)
                
                logger.info(f"Determining status for {test_name}: {result_value}")
                if status == 'normal':
                    logger.info(f"Defaulting to normal for {test_name}: {result_value}")
                
                test_result = {
                    'test_name': test_name,
                    'result_value': result_value,
                    'unit': unit,
                    'reference_range': 'Not specified',
                    'status': status
                }
                
                results.append(test_result)
                logger.info(f"Added test result: {test_result}")
                continue
            
            # Check for space-separated pattern (TEST RESULT)
            space_match = re.match(r'([A-Za-z\s]+)\s+([A-Za-z0-9\+\-\s\/\.]+)$', line)
            if space_match and len(line.split()) <= 5:
                test_name = space_match.group(1).strip()
                result_value = space_match.group(2).strip()
                
                logger.info(f"Found space pattern: '{test_name}' '{result_value}'")
                
                # Skip section headers more strictly
                skip_test_names = ['COMPLETE', 'URINE', 'EXAMINATION', 'ANALYSIS', 'CLINICAL', 'PATHOLOGY', 
                                 'LABORATORY', 'REPORT', 'TEST', 'RESULT', 'NORMAL', 'RANGES']
                if any(s in test_name.upper() for s in skip_test_names):
                    continue
                
                # Determine status
                status = 'normal'
                
                logger.info(f"Determining status for {test_name}: {result_value}")
                logger.info(f"Defaulting to normal for {test_name}: {result_value}")
                
                test_result = {
                    'test_name': test_name,
                    'result_value': result_value,
                    'unit': '',
                    'reference_range': 'Not specified',
                    'status': status
                }
                
                results.append(test_result)
                logger.info(f"Added test result: {test_result}")
        
        logger.info(f"Final extraction results: {len(results)} tests found")
        
        return {
            'test_results': results,
            'critical_values': critical,
            'abnormal_values': abnormal,
            'document_details': {
                'lines_processed': len(lines),
                'extraction_method': 'text_pattern_matching'
            },
            'summary': {
                'total_tests': len(results),
                'normal_count': len(results) - len(abnormal) - len(critical),
                'abnormal_count': len(abnormal),
                'critical_count': len(critical),
                'overall_status': 'critical' if critical else ('abnormal' if abnormal else 'normal'),
                'completion_rate': len(results) / max(1, len(lines)) * 100
            }
        }
        
    except Exception as e:
        logger.error(f"Text processing error: {e}")
        return {
            'test_results': [],
            'critical_values': [],
            'abnormal_values': [],
            'document_details': {},
            'summary': {'total_tests': 0, 'normal_count': 0, 'abnormal_count': 0, 'critical_count': 0}
        }

@csrf_exempt
@require_http_methods(["POST"])
def textract_lab_analysis(request):
    """
    Enhanced lab result processing endpoint with improved accuracy
    """
    try:
        # Check AWS credentials from database
        credentials = get_aws_credentials()
        if not credentials:
            logger.error("AWS credentials not configured. Please set them in Django Admin.")
            return JsonResponse({'error': 'AWS credentials not configured. Please set them in Django Admin under AWS Credentials.'}, status=500)
        
        # Debug: Log AWS credentials (masked for security)
        logger.info(f"AWS Credentials Check - Access Key: {'*****' + credentials['aws_access_key_id'][-4:] if credentials['aws_access_key_id'] else 'Not Set'}")
        logger.info(f"AWS Credentials Check - Region: {credentials['region_name']}")
        
        # Debug: Log request details
        logger.info(f"DEBUG: Request method: {request.method}")
        logger.info(f"DEBUG: Request FILES keys: {list(request.FILES.keys())}")
        logger.info(f"DEBUG: Request POST keys: {list(request.POST.keys())}")
        logger.info(f"DEBUG: Content type: {request.content_type}")
            
        # Handle file upload - check for different field names
        uploaded_file = None
        if 'document' in request.FILES:
            uploaded_file = request.FILES['document']
            logger.info("DEBUG: Found file in 'document' field")
        elif 'file' in request.FILES:
            uploaded_file = request.FILES['file']
            logger.info("DEBUG: Found file in 'file' field")
        elif 'image' in request.FILES:
            uploaded_file = request.FILES['image']
            logger.info("DEBUG: Found file in 'image' field")
        elif request.content_type and 'json' in request.content_type and request.body:
            # Fallback for base64 data
            logger.info("DEBUG: Trying JSON/base64 data")
            data = json.loads(request.body)
            image_base64 = data.get('image')
            if not image_base64:
                return JsonResponse({'error': 'No image data provided'}, status=400)
            image_bytes = base64.b64decode(image_base64)
        else:
            logger.error("DEBUG: No file found in any expected field")
            return JsonResponse({'error': 'No file or image data provided'}, status=400)
        
        if uploaded_file:
            image_bytes = uploaded_file.read()
            logger.info(f"DEBUG: File read successfully, size: {len(image_bytes)} bytes")

        # Preprocess image for better OCR
        processed_image_bytes = preprocess_image_for_ocr(image_bytes)

        # Initialize result variables
        lab_results = []
        extraction_method = 'fallback_ocr'
        extracted_text = ''
        confidence = 0
        structured_results = None
        raw_textract_blocks = []  # Store raw blocks for positioning

        # Try enhanced pattern extraction first
        try:
            # Extract text using Textract
            textract_client = get_textract_client()
            if not textract_client:
                raise Exception("Textract client not available")
            
            # Use detect_document_text for fast and accurate text extraction (same as Google Colab)
            response = textract_client.detect_document_text(
                Document={'Bytes': processed_image_bytes}
            )
            
            # Store raw blocks for frontend positioning
            raw_textract_blocks = response.get('Blocks', [])
            logger.info(f"DEBUG: Got {len(raw_textract_blocks)} raw Textract blocks")
            
            # Extract all detected text with enhanced accuracy
            # Use LINE blocks for better accuracy than basic concatenation
            text_blocks = []
            word_blocks = []
            
            for item in response['Blocks']:
                if item['BlockType'] == 'LINE':
                    text_blocks.append(item['Text'])
                elif item['BlockType'] == 'WORD':
                    word_blocks.append(item)
            
            logger.info(f"DEBUG: Extracted {len(text_blocks)} lines and {len(word_blocks)} words")
            
            # Combine all text blocks into a single string
            extracted_text = '\n'.join(text_blocks)
            
            # Use enhanced pattern extraction
            if extracted_text:
                lab_results = extract_lab_results_with_enhanced_patterns(extracted_text)
                structured_results = []
                
                for result in lab_results:
                    structured_result = {
                        'test_name': result['test_name'],
                        'result_value': result['result_value'],
                        'unit': result['unit'],
                        'reference_range': result['reference_range'],
                        'status': result['status']
                    }
                    structured_results.append(structured_result)
                
                extraction_method = 'enhanced_textract'
                confidence = 95
            
        except Exception as textract_error:
            logger.warning(f"Enhanced Textract extraction failed: {textract_error}")
            
            # Fall back to legacy extraction if enhanced fails
            try:
                # Get the original extraction function output
                extraction_result = fallback_table_extraction(image_bytes)
                
                # Check if fallback failed due to image file without Textract
                if extraction_result.get('requires_textract'):
                    return JsonResponse({
                        'success': False,
                        'error': 'AWS Textract configuration required',
                        'message': extraction_result.get('error', ''),
                        'suggestion': 'Please configure AWS credentials or upload a text file instead of an image'
                    }, status=400)
                
                if extraction_result.get('error'):
                    return JsonResponse({
                        'success': False,
                        'error': 'File processing failed',
                        'message': extraction_result.get('error', ''),
                        'fallback': True
                    }, status=400)
                
                fallback_results = process_fallback_results(extraction_result['full_text'])
                structured_results = fallback_results['test_results']
                extracted_text = extraction_result['full_text']
                extraction_method = 'fallback_text'
                confidence = 85 if extraction_result['full_text'] else 0
                raw_textract_blocks = []  # No blocks for fallback method
                
            except Exception as fallback_error:
                logger.error(f"Fallback extraction also failed: {fallback_error}")
                return JsonResponse({
                    'success': False,
                    'error': 'Failed to process document',
                    'message': f"Please try again or upload a text file instead of an image.",
                    'detail': str(fallback_error)
                }, status=500)
        
        # Critical and abnormal values
        critical_values = [r for r in structured_results if r.get('status') == 'critical']
        abnormal_values = [r for r in structured_results if r.get('status') == 'abnormal']
        
        # Use Google Colab algorithms for maximum accuracy (now merged in same file)
        try:
            # Process with EXACT Google Colab algorithms for superior text positioning
            logger.info('🚀 Using Google Colab algorithms for maximum accuracy...')
            logger.info(f'Input blocks for Google Colab: {len(raw_textract_blocks)} blocks')
            
            colab_results = process_document_with_colab_algorithms(raw_textract_blocks)
            
            logger.info(f'Google Colab results: {colab_results.keys()}')
            logger.info(f'Google Colab success: {colab_results.get("success", False)}')
            
            if colab_results['success']:
                logger.info(f'Google Colab processing successful: {colab_results["algorithm_source"]}')
                logger.info(f'Google Colab combined text length: {len(colab_results.get("combined_text", ""))}')
                # Use Google Colab processed text instead of basic extracted text
                extracted_text = colab_results['combined_text']
                extraction_method = 'google_colab_enhanced'
                logger.info(f'Updated extraction_method to: {extraction_method}')
            else:
                logger.warning(f'Google Colab processing failed: {colab_results["error"]}')
                # Keep the original extraction method
                pass
                
        except Exception as colab_error:
            logger.error(f'Google Colab algorithms error: {colab_error}')
            logger.error(traceback.format_exc())
            # Keep the original extraction method
            pass
        
        # Prepare response - Include raw_blocks at top level for frontend compatibility
        response_data = {
            'success': True,
            'extraction_method': extraction_method,
            'raw_text': extracted_text,
            'raw_blocks': raw_textract_blocks,  # TOP LEVEL - Frontend expects this!
            'blocks': raw_textract_blocks,      # Keep for backward compatibility
            'formattedText': extracted_text,    # Frontend expects this
            'hasTable': len([b for b in raw_textract_blocks if b.get('BlockType') == 'TABLE']) > 0,
            'structured_results': {
                'blocks': raw_textract_blocks,  # Include raw blocks for positioning
                'test_results': structured_results,
                'critical_values': critical_values,
                'abnormal_values': abnormal_values,
                'document_details': {
                    'extraction_method': extraction_method
                }
            },
            'summary': {
                'total_tests': len(structured_results),
                'normal_count': len(structured_results) - len(abnormal_values) - len(critical_values),
                'abnormal_count': len(abnormal_values),
                'critical_count': len(critical_values),
                'overall_status': 'critical' if critical_values else ('abnormal' if abnormal_values else 'normal'),
                'completion_rate': 100
            },
            'confidence': confidence,
            'processing_info': {
                'tables_found': len([b for b in raw_textract_blocks if b.get('BlockType') == 'TABLE']),
                'total_tests': len(structured_results),
                'critical_count': len(critical_values),
                'abnormal_count': len(abnormal_values),
                'blocks_count': len(raw_textract_blocks)  # Debug info
            }
        }
        
        return JsonResponse(response_data)
        
    except Exception as e:
        logger.error(f"OCR processing error: {str(e)}")
        logger.error(traceback.format_exc())
        return JsonResponse({
            'success': False,
            'error': f"OCR processing error: {str(e)}",
            'message': "Please try again or upload a text file instead of an image."
        }, status=500)


@require_http_methods(["GET"])
def health_check(request):
    """
    Health check endpoint for AWS Textract service
    """
    try:
        # Test AWS credentials
        try:
            textract_client = get_textract_client()
            if textract_client:
                aws_status = 'Connected'
            else:
                aws_status = 'Disconnected'
        except Exception:
            aws_status = 'Disconnected'

        return JsonResponse({
            'status': 'healthy',
            'service': 'AWS Textract OCR Django Backend with Google Colab Algorithms',
            'aws_textract': aws_status,
            'algorithms': 'Google Colab Enhanced Processing - Merged Implementation',
            'timestamp': '2025-08-26T00:00:00Z'
        })
    
    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'error': str(e)
        }, status=500)
