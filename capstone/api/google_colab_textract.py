"""
Enhanced AWS Textract Lab Result Processor
EXACT implementation from Google Colab for maximum accuracy

This module contains the exact same algorithms used in Google Colab
for processing AWS Textract results with highest precision.
"""

import numpy as np
import json
from typing import List, Dict, Any, Tuple
import logging

logger = logging.getLogger(__name__)

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
    print(f'🔍 build_positional_tui called with {len(blocks)} blocks')
    
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
        print('❌ No words found in blocks')
        return "No text detected"

    print(f'📊 Found {len(words)} words')

    # Calculate document boundaries (exact same as Colab)
    min_left = min(w['left'] for w in words)
    max_right = max(w['left'] + w['width'] for w in words)
    min_top = min(w['top'] for w in words)
    max_bottom = max(w['top'] + w['height'] for w in words)

    print(f'📐 Document boundaries: left={min_left}, right={max_right}, top={min_top}, bottom={max_bottom}')

    # Create dynamic row grouping with adaptive tolerance (exact same as Colab)
    vertical_positions = sorted(list(set(w['top'] for w in words)))
    row_groups = []
    current_group = [vertical_positions[0]]

    for i in range(1, len(vertical_positions)):
        pos = vertical_positions[i]
        if pos - current_group[-1] < 0.005:  # Adaptive tolerance - EXACT same value
            current_group.append(pos)
        else:
            row_groups.append(np.mean(current_group))  # np.mean equivalent
            current_group = [pos]

    if current_group:
        row_groups.append(np.mean(current_group))

    print(f'📊 Created {len(row_groups)} row groups')

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

    print(f'📊 Organized into {len(sorted_rows)} rows')

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

    print(f'✅ build_positional_tui complete, generated {len(output_lines)} lines')
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
    print(f'🔍 format_as_table called with {len(blocks)} blocks')
    
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

    print(f'📊 Found {len(tables)} tables')

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

    print(f'✅ format_as_table complete: {len(formatted_tables)} tables formatted')
    return '\n\n'.join(formatted_tables)


def process_document_with_colab_algorithms(blocks):
    """
    Process document using EXACT Google Colab algorithms for maximum accuracy
    
    Args:
        blocks: AWS Textract blocks from detect_document_text or analyze_document
    
    Returns:
        dict: Processed results with positioned text and formatted tables
    """
    print('🚀 Processing document with Google Colab algorithms...')
    print(f'📊 Input blocks: {len(blocks)} blocks')
    
    if not blocks:
        print('❌ No blocks provided')
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
        
        print(f'📋 Block types: {block_types}')
        
        # Use the EXACT same functions as Google Colab
        positioned_text = build_positional_tui(blocks, 120)
        table_text = format_as_table(blocks)
        
        print(f'📝 Positioned text length: {len(positioned_text)}')
        print(f'📊 Table text length: {len(table_text) if table_text else 0}')
        
        # Combine outputs exactly like Colab
        combined_text = positioned_text
        if table_text:
            combined_text += "\n\n" + table_text
        
        print(f'✅ Final combined text length: {len(combined_text)}')
        print('✅ Document processing complete with Google Colab-identical accuracy')
        
        return {
            'success': True,
            'positioned_text': positioned_text,
            'formatted_tables': table_text,
            'combined_text': combined_text,
            'blocks_processed': len(blocks),
            'algorithm_source': 'Google Colab - Exact Implementation'
        }
        
    except Exception as e:
        print(f'❌ Processing failed: {str(e)}')
        import traceback
        print(f'❌ Full error: {traceback.format_exc()}')
        return {
            'success': False,
            'error': str(e),
            'positioned_text': '',
            'formatted_tables': '',
            'combined_text': ''
        }


def visualize_layout(image_bytes, blocks, output_path=None):
    """
    Create a visualization of the document with highlighted text regions
    EXACT Google Colab implementation - Direct translation
    
    Args:
        image_bytes: Binary image data
        blocks: AWS Textract blocks
        output_path: Optional path to save the visualization
    
    Returns:
        bytes: Visualization image as bytes
    """
    try:
        from PIL import Image, ImageDraw
        import io
        
        # Create image from bytes
        image = Image.open(io.BytesIO(image_bytes))
        draw = ImageDraw.Draw(image)
        
        # Define colors for different block types - exact Python colors
        colors = {
            'PAGE': '#0000FF',    # blue
            'LINE': '#FF0000',    # red  
            'WORD': '#00FF00',    # green
            'TABLE': '#800080',   # purple
            'CELL': '#FFA500'     # orange
        }
        
        # Draw bounding boxes for each block - exact Python logic
        for block in blocks:
            block_type = block['BlockType']
            box = block['Geometry']['BoundingBox']
            
            # Calculate pixel coordinates - exact Python calculation
            left = image.width * box['Left']
            top = image.height * box['Top']
            right = left + (image.width * box['Width'])
            bottom = top + (image.height * box['Height'])
            
            # Get color for block type - exact Python colors.get() with default
            color = colors.get(block_type, '#FFFF00')  # yellow as default
            
            # Draw rectangle - exact Python draw.rectangle()
            draw.rectangle([left, top, right, bottom], outline=color, width=2)
            
            # Draw text for LINE blocks - exact Python condition
            if block_type == 'LINE' and 'Text' in block:
                draw.text((left, max(top - 15, 0)), block['Text'], fill=color)
        
        # Convert to bytes
        output_buffer = io.BytesIO()
        image.save(output_buffer, format='PNG')
        output_buffer.seek(0)
        
        if output_path:
            image.save(output_path)
            
        return output_buffer.getvalue()
        
    except Exception as e:
        print(f'❌ Visualization failed: {str(e)}')
        return None


def analyze_blocks(blocks):
    """
    Analyze and count different types of blocks
    
    Args:
        blocks: AWS Textract blocks
    
    Returns:
        dict: Analysis results with counts by block type
    """
    analysis = {
        'total': len(blocks),
        'words': 0,
        'lines': 0,
        'tables': 0,
        'cells': 0,
        'pages': 0
    }

    for block in blocks:
        block_type = block['BlockType']
        if block_type == 'WORD':
            analysis['words'] += 1
        elif block_type == 'LINE':
            analysis['lines'] += 1
        elif block_type == 'TABLE':
            analysis['tables'] += 1
        elif block_type == 'CELL':
            analysis['cells'] += 1
        elif block_type == 'PAGE':
            analysis['pages'] += 1

    return analysis
