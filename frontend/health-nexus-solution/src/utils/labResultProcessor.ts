import { AwsTextractBlock, AwsTextractResponse } from "@/types/textract";

// AWS Textract configuration is now handled by environment variables
// or backend configuration

interface Point {
  x: number;
  y: number;
}

interface TextLine {
  id: string;
  text: string;
  boundingBox: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
}

interface TextBlock {
  id: string;
  lines: TextLine[];
  boundingBox: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
}

interface TableCell {
  rowIndex: number;
  colIndex: number;
  text: string;
}

interface Table {
  cells: TableCell[];
  rowCount: number;
  colCount: number;
}

/**
 * Create mock Textract blocks from raw text to preserve formatting and positioning
 * @param rawText The raw text from Django backend
 * @returns Array of mock Textract blocks
 */
const createMockBlocksFromRawText = (rawText: string): AwsTextractBlock[] => {
  console.log('🔧 Creating enhanced mock blocks from raw text, length:', rawText.length);
  
  const blocks: AwsTextractBlock[] = [];
  const lines = rawText.split('\n');
  let blockIdCounter = 1;
  let wordIdCounter = 1;
  let tableIdCounter = 1;
  let cellIdCounter = 1;
  
  // Detect potential table sections by looking for patterns
  const tablePatterns = [
    /(?:test|result|value|normal|abnormal|reference|range|unit)/i,
    /\d+\.\d+|\d+/,  // Numbers (likely test values)
    /\s{3,}|\t+/,    // Multiple spaces or tabs (column separators)
  ];
  
  // Analyze lines for table-like structure
  const tableLines: number[] = [];
  const regularLines: number[] = [];
  
  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    if (!trimmedLine) return;
    
    // Check if line looks like a table row (has multiple parts separated by spaces/tabs)
    const parts = trimmedLine.split(/\s{2,}|\t+/).filter(part => part.trim());
    const hasNumbers = /\d/.test(trimmedLine);
    const hasTestKeywords = /(?:test|result|value|normal|abnormal|reference|range|unit|blood|urine|glucose|cholesterol|hemoglobin|white|red|platelet)/i.test(trimmedLine);
    
    if (parts.length >= 2 && (hasNumbers || hasTestKeywords)) {
      tableLines.push(index);
    } else {
      regularLines.push(index);
    }
  });
  
  console.log(`📊 Detected ${tableLines.length} potential table lines, ${regularLines.length} regular lines`);
  
  // Process regular lines first
  regularLines.forEach((lineIndex) => {
    const line = lines[lineIndex];
    const trimmedLine = line.trim();
    if (!trimmedLine) return;
    
    // Calculate positioning with better spacing
    const top = lineIndex * 0.03; // Better line spacing
    const left = 0.05;
    const height = 0.025;
    const width = Math.min(0.9, trimmedLine.length * 0.01);
    
    const lineId = `line-${blockIdCounter++}`;
    const words = trimmedLine.split(/\s+/);
    const wordIds: string[] = [];
    
    // Create WORD blocks for each word
    words.forEach((word, wordIndex) => {
      if (!word) return;
      
      const wordId = `word-${wordIdCounter++}`;
      wordIds.push(wordId);
      
      const wordLeft = left + (wordIndex * 0.12); // Better word spacing
      const wordWidth = word.length * 0.01;
      
      blocks.push({
        Id: wordId,
        BlockType: 'WORD',
        Text: word,
        Geometry: {
          BoundingBox: {
            Left: wordLeft,
            Top: top,
            Width: wordWidth,
            Height: height
          }
        }
      });
    });
    
    // Create LINE block
    blocks.push({
      Id: lineId,
      BlockType: 'LINE',
      Text: trimmedLine,
      Geometry: {
        BoundingBox: {
          Left: left,
          Top: top,
          Width: width,
          Height: height
        }
      },
      Relationships: wordIds.length > 0 ? [{
        Type: 'CHILD',
        Ids: wordIds
      }] : undefined
    });
  });
  
  // Process table lines if we have any
  if (tableLines.length > 0) {
    console.log('🔧 Creating table structure from detected table lines');
    
    const tableId = `table-${tableIdCounter++}`;
    const tableCellIds: string[] = [];
    
    // Process each table line as a table row
    tableLines.forEach((lineIndex, rowIndex) => {
      const line = lines[lineIndex];
      const trimmedLine = line.trim();
      if (!trimmedLine) return;
      
      // Split line into columns (using multiple spaces or tabs as separators)
      const columns = trimmedLine.split(/\s{2,}|\t+/).filter(col => col.trim());
      
      // Calculate row positioning
      const rowTop = lineIndex * 0.03;
      const cellHeight = 0.025;
      
      // Create cells for this row
      columns.forEach((cellText, colIndex) => {
        const cellId = `cell-${cellIdCounter++}`;
        tableCellIds.push(cellId);
        
        const cellLeft = 0.1 + (colIndex * 0.25); // Column positioning
        const cellWidth = Math.max(0.2, cellText.length * 0.015);
        
        // Create words within the cell
        const cellWords = cellText.split(/\s+/);
        const cellWordIds: string[] = [];
        
        cellWords.forEach((word, wordIndex) => {
          if (!word) return;
          
          const wordId = `word-${wordIdCounter++}`;
          cellWordIds.push(wordId);
          
          const wordLeft = cellLeft + (wordIndex * 0.08);
          const wordWidth = word.length * 0.01;
          
          blocks.push({
            Id: wordId,
            BlockType: 'WORD',
            Text: word,
            Geometry: {
              BoundingBox: {
                Left: wordLeft,
                Top: rowTop,
                Width: wordWidth,
                Height: cellHeight
              }
            }
          });
        });
        
        // Create CELL block
        blocks.push({
          Id: cellId,
          BlockType: 'CELL',
          Text: cellText,
          Geometry: {
            BoundingBox: {
              Left: cellLeft,
              Top: rowTop,
              Width: cellWidth,
              Height: cellHeight
            }
          },
          RowIndex: (rowIndex + 1).toString(), // 1-based indexing
          ColumnIndex: (colIndex + 1).toString(), // 1-based indexing
          Relationships: cellWordIds.length > 0 ? [{
            Type: 'CHILD',
            Ids: cellWordIds
          }] : undefined
        });
      });
    });
    
    // Create TABLE block that contains all cells
    if (tableCellIds.length > 0) {
      blocks.push({
        Id: tableId,
        BlockType: 'TABLE',
        Geometry: {
          BoundingBox: {
            Left: 0.1,
            Top: Math.min(...tableLines) * 0.03,
            Width: 0.8,
            Height: (Math.max(...tableLines) - Math.min(...tableLines) + 1) * 0.03
          }
        },
        Relationships: [{
          Type: 'CHILD',
          Ids: tableCellIds
        }]
      });
      
      console.log(`✅ Created table with ${tableCellIds.length} cells`);
    }
  }
  
  console.log(`✅ Created ${blocks.length} enhanced mock blocks:`);
  console.log(`   - ${blocks.filter(b => b.BlockType === 'LINE').length} LINE blocks`);
  console.log(`   - ${blocks.filter(b => b.BlockType === 'WORD').length} WORD blocks`);
  console.log(`   - ${blocks.filter(b => b.BlockType === 'TABLE').length} TABLE blocks`);
  console.log(`   - ${blocks.filter(b => b.BlockType === 'CELL').length} CELL blocks`);
  
  return blocks;
};

/**
 * Process document blocks from AWS Textract response
 * @param response AWS Textract response
 * @returns Processed document with text and tables
 */
export const processDocument = (response: AwsTextractResponse): {
  text: string;
  tables: Table[];
  visualizationData: any;
} => {
  console.log('🔍 processDocument called with response:', response);
  
  if (!response || !response.blocks) {
    console.log('❌ No response or blocks found');
    return { text: "", tables: [], visualizationData: null };
  }

  const blocks = response.blocks;
  console.log(`📊 Processing ${blocks.length} blocks`);
  
  // Debug: Show block types
  const blockTypes = blocks.reduce((acc, block) => {
    acc[block.BlockType] = (acc[block.BlockType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  console.log('📊 Block types found:', blockTypes);
  
  const lines = extractTextLines(blocks);
  const textBlocks = groupLinesIntoBlocks(lines);
  const tables = extractTables(blocks);
  
  console.log(`📝 Extracted ${lines.length} lines, ${textBlocks.length} text blocks, ${tables.length} tables`);
  
  const visualizationData = prepareVisualizationData(blocks, lines, textBlocks, tables);
  
  // Use both approaches for comprehensive formatting
  const positionalText = buildPositionalTUI(blocks);
  const tableText = formatAsTable(blocks);
  
  // Add table borders to positional text while preserving positioning
  const positionalWithBorders = addTableBordersToPositionalText(positionalText, blocks);
  
  let formattedText = positionalWithBorders;
  if (tableText) {
    formattedText += "\n\n=== STRUCTURED TABLES ===\n\n" + tableText;
  }

  console.log('✅ processDocument complete, formatted text length:', formattedText.length);
  
  return {
    text: formattedText,
    tables,
    visualizationData
  };
};

/**
 * Extract text lines from AWS Textract blocks
 * @param blocks AWS Textract blocks
 * @returns Array of text lines
 */
const extractTextLines = (blocks: AwsTextractBlock[]): TextLine[] => {
  return blocks
    .filter(block => block.BlockType === "LINE" && block.Text)
    .map(block => ({
      id: block.Id,
      text: block.Text || "",
      boundingBox: {
        left: block.Geometry.BoundingBox.Left,
        top: block.Geometry.BoundingBox.Top,
        width: block.Geometry.BoundingBox.Width,
        height: block.Geometry.BoundingBox.Height
      }
    }));
};

/**
 * Group lines into text blocks based on proximity
 * @param lines Array of text lines
 * @returns Array of text blocks
 */
const groupLinesIntoBlocks = (lines: TextLine[]): TextBlock[] => {
  if (lines.length === 0) return [];

  // Sort lines by vertical position (top)
  const sortedLines = [...lines].sort((a, b) => a.boundingBox.top - b.boundingBox.top);
  
  const blocks: TextBlock[] = [];
  let currentBlock: TextLine[] = [sortedLines[0]];
  let currentBottom = sortedLines[0].boundingBox.top + sortedLines[0].boundingBox.height;
  
  // Line spacing threshold - adjust as needed
  const LINE_SPACING_THRESHOLD = 0.015; 
  
  for (let i = 1; i < sortedLines.length; i++) {
    const line = sortedLines[i];
    const distance = line.boundingBox.top - currentBottom;
    
    if (distance <= LINE_SPACING_THRESHOLD) {
      // This line belongs to the current block
      currentBlock.push(line);
      currentBottom = Math.max(currentBottom, line.boundingBox.top + line.boundingBox.height);
    } else {
      // Start a new block
      blocks.push(createTextBlock(currentBlock));
      currentBlock = [line];
      currentBottom = line.boundingBox.top + line.boundingBox.height;
    }
  }
  
  // Add the last block
  if (currentBlock.length > 0) {
    blocks.push(createTextBlock(currentBlock));
  }
  
  return blocks;
};

/**
 * Create a text block from an array of lines
 * @param lines Array of text lines
 * @returns Text block
 */
const createTextBlock = (lines: TextLine[]): TextBlock => {
  // Find the bounding box that contains all lines
  const left = Math.min(...lines.map(line => line.boundingBox.left));
  const top = Math.min(...lines.map(line => line.boundingBox.top));
  const right = Math.max(...lines.map(line => line.boundingBox.left + line.boundingBox.width));
  const bottom = Math.max(...lines.map(line => line.boundingBox.top + line.boundingBox.height));
  
  return {
    id: `block_${Math.random().toString(36).substring(2, 9)}`,
    lines: [...lines].sort((a, b) => a.boundingBox.top - b.boundingBox.top),
    boundingBox: {
      left,
      top,
      width: right - left,
      height: bottom - top
    }
  };
};

/**
 * Extract tables from AWS Textract blocks
 * @param blocks AWS Textract blocks
 * @returns Array of tables
 */
const extractTables = (blocks: AwsTextractBlock[]): Table[] => {
  console.log('🔍 extractTables called');
  
  // Find table blocks
  const tableBlocks = blocks.filter(block => block.BlockType === "TABLE");
  console.log(`📊 Found ${tableBlocks.length} TABLE blocks`);
  
  if (tableBlocks.length > 0) {
    console.log('🔍 Table blocks:', tableBlocks.map(t => ({ id: t.Id, relationships: t.Relationships })));
  }
  
  const tables: Table[] = [];
  
  tableBlocks.forEach(tableBlock => {
    console.log(`🔍 Processing table ${tableBlock.Id}`);
    
    if (!tableBlock.Relationships) {
      console.log(`❌ Table ${tableBlock.Id} has no relationships`);
      return;
    }
    
    // Find cell blocks related to this table
    const cellIds = tableBlock.Relationships
      .filter(rel => rel.Type === "CHILD")
      .flatMap(rel => rel.Ids);
    
    console.log(`🔍 Table ${tableBlock.Id} has ${cellIds.length} cell IDs:`, cellIds);
    
    const cellBlocks = blocks.filter(block => 
      block.BlockType === "CELL" && cellIds.includes(block.Id)
    );
    
    console.log(`📊 Found ${cellBlocks.length} CELL blocks for table ${tableBlock.Id}`);
    
    // Extract cell information
    const cells: TableCell[] = [];
    let maxRow = 0;
    let maxCol = 0;
    
    cellBlocks.forEach(cellBlock => {
      console.log(`🔍 Processing cell ${cellBlock.Id}, Row: ${cellBlock.RowIndex}, Col: ${cellBlock.ColumnIndex}`);
      
      if (!cellBlock.Relationships) {
        console.log(`❌ Cell ${cellBlock.Id} has no relationships`);
        return;
      }
      
      // Find row and column indices (AWS Textract uses 1-based indexing, convert to 0-based)
      const rowIndex = parseInt(cellBlock.RowIndex || "1") - 1;
      const colIndex = parseInt(cellBlock.ColumnIndex || "1") - 1;
      
      console.log(`📊 Cell ${cellBlock.Id} converted indices: Row ${rowIndex}, Col ${colIndex}`);
      
      maxRow = Math.max(maxRow, rowIndex);
      maxCol = Math.max(maxCol, colIndex);
      
      // Find text in this cell
      const wordIds = cellBlock.Relationships
        .filter(rel => rel.Type === "CHILD")
        .flatMap(rel => rel.Ids);
      
      console.log(`🔍 Cell ${cellBlock.Id} has ${wordIds.length} word IDs:`, wordIds);
      
      const words = blocks
        .filter(block => block.BlockType === "WORD" && wordIds.includes(block.Id))
        .sort((a, b) => 
          a.Geometry.BoundingBox.Top - b.Geometry.BoundingBox.Top || 
          a.Geometry.BoundingBox.Left - b.Geometry.BoundingBox.Left
        );
      
      const cellText = words.map(word => word.Text).join(" ");
      
      console.log(`📝 Cell ${cellBlock.Id} text: "${cellText}" (from ${words.length} words)`);
      
      cells.push({
        rowIndex,
        colIndex,
        text: cellText
      });
    });
    
    const table = {
      cells,
      rowCount: maxRow + 1,
      colCount: maxCol + 1
    };
    
    console.log(`✅ Created table with ${cells.length} cells, ${maxRow + 1} rows, ${maxCol + 1} columns`);
    console.log('📊 Table cells:', cells);
    
    tables.push(table);
  });
  
  console.log(`✅ extractTables complete: ${tables.length} tables extracted`);
  return tables;
};

/**
 * Prepare visualization data for rendering
 * @param blocks AWS Textract blocks
 * @param lines Extracted text lines
 * @param textBlocks Grouped text blocks
 * @param tables Extracted tables
 * @returns Visualization data
 */
const prepareVisualizationData = (
  blocks: AwsTextractBlock[],
  lines: TextLine[],
  textBlocks: TextBlock[],
  tables: Table[]
) => {
  return {
    blocks: blocks.map(block => ({
      id: block.Id,
      type: block.BlockType,
      boundingBox: block.Geometry.BoundingBox,
      text: block.Text || ""
    })),
    lines,
    textBlocks,
    tables
  };
};

/**
 * Build formatted text from text blocks and tables with enhanced table formatting
 * @param textBlocks Text blocks
 * @param tables Tables
 * @returns Formatted text with properly formatted tables
 */
const buildFormattedText = (textBlocks: TextBlock[], tables: Table[]): string => {
  console.log(`🔍 buildFormattedText called with ${textBlocks.length} text blocks, ${tables.length} tables`);
  
  let formattedText = "";
  
  // Add text blocks
  textBlocks.forEach(block => {
    block.lines.forEach(line => {
      formattedText += line.text + "\n";
    });
    formattedText += "\n"; // Extra line between blocks
  });
  
  console.log(`📝 Added text blocks, current length: ${formattedText.length}`);
  
  // Add tables with enhanced formatting
  tables.forEach((table, tableIndex) => {
    console.log(`📊 Processing table ${tableIndex + 1} for formatting:`, table);
    
    formattedText += `\nTable ${tableIndex + 1}:\n`;
    const tableFormatted = formatEnhancedTable(table);
    
    console.log(`📝 Formatted table ${tableIndex + 1} result:`, tableFormatted);
    
    formattedText += tableFormatted;
    formattedText += "\n";
  });
  
  console.log(`✅ buildFormattedText complete, final length: ${formattedText.length}`);
  return formattedText;
};

/**
 * Build positional TUI output preserving original layout with enhanced formatting
 * @param blocks AWS Textract blocks
 * @param outputWidth Width of the output in characters
 * @returns Formatted text with spatial layout preserved
 */
export const buildPositionalTUI = (blocks: AwsTextractBlock[], outputWidth: number = 120): string => {
  console.log('🔍 buildPositionalTUI called with', blocks.length, 'blocks');
  
  // Collect all words with their positions
  const words: Array<{
    text: string;
    left: number;
    top: number;
    width: number;
    height: number;
  }> = [];
  
  for (const block of blocks) {
    if (block.BlockType === 'WORD' && block.Text) {
      const box = block.Geometry.BoundingBox;
      words.push({
        text: block.Text,
        left: box.Left,
        top: box.Top,
        width: box.Width,
        height: box.Height
      });
    }
  }
  
  if (words.length === 0) {
    return "No text detected";
  }
  
  console.log(`📝 Found ${words.length} words`);
  
  // Calculate document boundaries
  const minLeft = Math.min(...words.map(w => w.left));
  const maxRight = Math.max(...words.map(w => w.left + w.width));
  const minTop = Math.min(...words.map(w => w.top));
  const maxBottom = Math.max(...words.map(w => w.top + w.height));
  
  console.log('📊 Document boundaries:', { minLeft, maxRight, minTop, maxBottom });
  
  // Create dynamic row grouping with adaptive tolerance
  const verticalPositions = [...new Set(words.map(w => w.top))].sort((a, b) => a - b);
  const rowGroups: number[] = [];
  let currentGroup = [verticalPositions[0]];
  
  for (let i = 1; i < verticalPositions.length; i++) {
    const pos = verticalPositions[i];
    if (pos - currentGroup[currentGroup.length - 1] < 0.005) { // Adaptive tolerance
      currentGroup.push(pos);
    } else {
      rowGroups.push(currentGroup.reduce((a, b) => a + b, 0) / currentGroup.length);
      currentGroup = [pos];
    }
  }
  
  if (currentGroup.length > 0) {
    rowGroups.push(currentGroup.reduce((a, b) => a + b, 0) / currentGroup.length);
  }
  
  console.log(`📊 Created ${rowGroups.length} row groups`);
  
  // Organize words by row
  const rows: { [key: number]: typeof words } = {};
  
  for (const word of words) {
    // Find closest row group
    const rowKey = rowGroups.reduce((prev, curr) => 
      Math.abs(curr - word.top) < Math.abs(prev - word.top) ? curr : prev
    );
    
    if (!rows[rowKey]) {
      rows[rowKey] = [];
    }
    
    rows[rowKey].push(word);
  }
  
  // Sort rows top-to-bottom
  const sortedRows = Object.entries(rows).sort(([a], [b]) => parseFloat(a) - parseFloat(b));
  
  // Create output grid
  const outputLines: string[] = [];
  let prevRowKey: number | null = null;
  
  for (const [rowKeyStr, wordsInRow] of sortedRows) {
    const rowKey = parseFloat(rowKeyStr);
    
    // Add vertical spacing between rows
    if (prevRowKey !== null && (rowKey - prevRowKey) > 0.02) {
      outputLines.push(""); // Add empty line for vertical spacing
    }
    
    prevRowKey = rowKey;
    
    // Sort words left-to-right
    wordsInRow.sort((a, b) => a.left - b.left);
    
    // Create row buffer
    const rowBuffer = new Array(outputWidth).fill(' ');
    
    // Place words in row buffer
    for (const word of wordsInRow) {
      // Calculate position in output grid
      let colPos = Math.floor(((word.left - minLeft) / (maxRight - minLeft)) * (outputWidth - 1));
      const wordLength = word.text.length;
      
      // Ensure word fits in buffer
      if (colPos < outputWidth) {
        const endPos = Math.min(colPos + wordLength, outputWidth);
        
        // Check for overlap
        const hasOverlap = rowBuffer.slice(colPos, endPos).some(char => char !== ' ');
        
        if (hasOverlap) {
          // Handle overlap by moving to next available space
          for (let i = colPos; i < outputWidth; i++) {
            if (rowBuffer[i] === ' ') {
              colPos = i;
              break;
            }
          }
        }
        
        // Place word in buffer
        for (let i = 0; i < word.text.length && colPos + i < outputWidth; i++) {
          rowBuffer[colPos + i] = word.text[i];
        }
      }
    }
    
    // Convert buffer to string and add to output
    outputLines.push(rowBuffer.join('').trimEnd());
  }
  
  console.log(`✅ buildPositionalTUI complete, ${outputLines.length} lines`);
  return outputLines.join('\n');
};

/**
 * Enhanced table formatting using Textract's table detection (based on Python implementation)
 * @param blocks AWS Textract blocks
 * @returns Formatted tables as text with borders
 */
export const formatAsTable = (blocks: AwsTextractBlock[]): string => {
  console.log('🔍 formatAsTable called with', blocks.length, 'blocks');
  
  // Find all table blocks
  const tableBlocks = blocks.filter(b => b.BlockType === 'TABLE');
  console.log(`📊 Found ${tableBlocks.length} table blocks`);
  
  if (tableBlocks.length === 0) {
    console.log('ℹ️ No table blocks found, checking for cells...');
    // If no table blocks but we have cells, create a table from all cells
    const cellBlocks = blocks.filter(b => b.BlockType === 'CELL');
    if (cellBlocks.length > 0) {
      console.log(`📊 Found ${cellBlocks.length} cell blocks, creating table from cells`);
      return formatCellsAsTable(blocks, cellBlocks);
    }
    return '';
  }
  
  const formattedTables: string[] = [];
  
  for (const tableBlock of tableBlocks) {
    console.log(`🔍 Processing table block:`, tableBlock.Id);
    
    // Get all cells for this table
    const tableCells = getCellsForTable(blocks, tableBlock);
    console.log(`📊 Found ${tableCells.length} cells for table ${tableBlock.Id}`);
    
    if (tableCells.length === 0) continue;
    
    // Organize cells by row and column
    const tableData = organizeCellsIntoTable(tableCells);
    console.log(`📋 Organized into ${tableData.length} rows`);
    
    if (tableData.length === 0) continue;
    
    // Format as bordered table
    const formattedTable = formatTableWithBorders(tableData);
    if (formattedTable) {
      formattedTables.push(formattedTable);
    }
  }
  
  console.log(`✅ formatAsTable complete, ${formattedTables.length} formatted tables`);
  return formattedTables.join('\n\n');
};

/**
 * Get all cells that belong to a specific table
 */
function getCellsForTable(blocks: AwsTextractBlock[], tableBlock: AwsTextractBlock): any[] {
  const cellIds: string[] = [];
  
  // Get cell IDs from table relationships
  if (tableBlock.Relationships) {
    for (const rel of tableBlock.Relationships) {
      if (rel.Type === 'CHILD') {
        cellIds.push(...rel.Ids);
      }
    }
  }
  
  // Find corresponding cell blocks
  return blocks.filter(block => 
    block.BlockType === 'CELL' && cellIds.includes(block.Id)
  ).map(cellBlock => {
    // Extract cell text
    let cellText = '';
    if (cellBlock.Relationships) {
      for (const rel of cellBlock.Relationships) {
        if (rel.Type === 'CHILD') {
          for (const wordId of rel.Ids) {
            const wordBlock = blocks.find(b => b.Id === wordId && b.BlockType === 'WORD');
            if (wordBlock && wordBlock.Text) {
              cellText += wordBlock.Text + ' ';
            }
          }
        }
      }
    }
    
    return {
      text: cellText.trim(),
      rowIndex: parseInt(cellBlock.RowIndex || '0'),
      columnIndex: parseInt(cellBlock.ColumnIndex || '0')
    };
  });
}

/**
 * Format cells as table when no explicit table block exists
 */
function formatCellsAsTable(blocks: AwsTextractBlock[], cellBlocks: AwsTextractBlock[]): string {
  const cells = cellBlocks.map(cellBlock => {
    let cellText = '';
    if (cellBlock.Relationships) {
      for (const rel of cellBlock.Relationships) {
        if (rel.Type === 'CHILD') {
          for (const wordId of rel.Ids) {
            const wordBlock = blocks.find(b => b.Id === wordId && b.BlockType === 'WORD');
            if (wordBlock && wordBlock.Text) {
              cellText += wordBlock.Text + ' ';
            }
          }
        }
      }
    }
    
    return {
      text: cellText.trim(),
      rowIndex: parseInt(cellBlock.RowIndex || '0'),
      columnIndex: parseInt(cellBlock.ColumnIndex || '0')
    };
  });
  
  const tableData = organizeCellsIntoTable(cells);
  return formatTableWithBorders(tableData) || '';
}

/**
 * Organize cells into a 2D table structure
 */
function organizeCellsIntoTable(cells: Array<{text: string, rowIndex: number, columnIndex: number}>): string[][] {
  if (cells.length === 0) return [];
  
  // Find max row and column indices
  const maxRow = Math.max(...cells.map(c => c.rowIndex));
  const maxCol = Math.max(...cells.map(c => c.columnIndex));
  
  console.log(`📐 Table dimensions: ${maxRow + 1} rows x ${maxCol + 1} columns`);
  
  // Initialize table grid
  const table: string[][] = [];
  for (let r = 0; r <= maxRow; r++) {
    table[r] = new Array(maxCol + 1).fill('');
  }
  
  // Fill table with cell data
  for (const cell of cells) {
    if (cell.rowIndex <= maxRow && cell.columnIndex <= maxCol) {
      table[cell.rowIndex][cell.columnIndex] = cell.text;
    }
  }
  
  return table;
}

/**
 * Format table data with Unicode borders
 */
function formatTableWithBorders(tableData: string[][]): string | null {
  if (tableData.length === 0 || tableData[0].length === 0) return null;
  
  // Calculate column widths
  const colWidths = tableData[0].map((_, colIndex) => 
    Math.max(...tableData.map(row => 
      row[colIndex] ? row[colIndex].length : 0
    ))
  );
  
  console.log('📏 Column widths:', colWidths);
  
  // Create borders
  const topBorder = '┌' + colWidths.map(w => '─'.repeat(w + 2)).join('┬') + '┐';
  const middleBorder = '├' + colWidths.map(w => '─'.repeat(w + 2)).join('┼') + '┤';
  const bottomBorder = '└' + colWidths.map(w => '─'.repeat(w + 2)).join('┴') + '┘';
  
  // Build table
  const tableLines = [topBorder];
  
  for (let i = 0; i < tableData.length; i++) {
    const row = tableData[i];
    const rowStr = '│' + row.map((cell, j) => 
      ` ${(cell || '').padEnd(colWidths[j])} `
    ).join('│') + '│';
    
    tableLines.push(rowStr);
    
    // Add separator after header (first row)
    if (i === 0 && tableData.length > 1) {
      tableLines.push(middleBorder);
    }
  }
  
  tableLines.push(bottomBorder);
  
  return tableLines.join('\n');
}

/**
 * Enhanced table formatting matching the Python implementation
 * @param table Table to format
 * @returns Formatted table string with proper borders
 */
const formatEnhancedTable = (table: Table): string => {
  const { cells, rowCount, colCount } = table;
  
  console.log(`🔍 formatEnhancedTable called with ${rowCount} rows, ${colCount} columns, ${cells.length} cells`);
  
  if (rowCount === 0 || colCount === 0) {
    console.log('❌ Table has 0 rows or columns, returning empty string');
    return '';
  }
  
  // Create a 2D array to hold the table data
  const tableData: string[][] = Array(rowCount).fill(null)
    .map(() => Array(colCount).fill(""));
  
  console.log(`📊 Created ${rowCount}x${colCount} table data array`);
  
  // Fill in the table data
  cells.forEach(cell => {
    console.log(`📝 Placing cell "${cell.text}" at [${cell.rowIndex}][${cell.colIndex}]`);
    if (cell.rowIndex < rowCount && cell.colIndex < colCount) {
      tableData[cell.rowIndex][cell.colIndex] = cell.text;
    } else {
      console.log(`❌ Cell coordinates out of bounds: [${cell.rowIndex}][${cell.colIndex}]`);
    }
  });
  
  console.log('📊 Final table data:', tableData);
  
  // Calculate column widths
  const colWidths: number[] = [];
  for (let col = 0; col < colCount; col++) {
    const colValues = tableData.map(row => row[col] || "");
    colWidths[col] = Math.max(
      ...colValues.map(val => val.length),
      3 // Minimum width
    );
  }
  
  console.log('📏 Column widths:', colWidths);
  
  // Create horizontal borders
  const topBorder = '┌' + colWidths.map(w => '─'.repeat(w + 2)).join('┬') + '┐';
  const middleBorder = '├' + colWidths.map(w => '─'.repeat(w + 2)).join('┼') + '┤';
  const bottomBorder = '└' + colWidths.map(w => '─'.repeat(w + 2)).join('┴') + '┘';
  
  console.log('🎨 Created borders');
  
  // Build table lines
  const tableLines = [topBorder];
  
  for (let i = 0; i < rowCount; i++) {
    const row = tableData[i];
    
    // Format row with proper padding
    let rowStr = '│';
    for (let j = 0; j < colCount; j++) {
      const cell = row[j] || '';
      rowStr += ` ${cell.padEnd(colWidths[j])} │`;
    }
    
    tableLines.push(rowStr);
    
    // Add separator after header row
    if (i === 0 && rowCount > 1) {
      tableLines.push(middleBorder);
    }
  }
  
  // Add bottom border
  tableLines.push(bottomBorder);
  
  const result = tableLines.join('\n');
  console.log('✅ formatEnhancedTable complete, result:');
  console.log(result);
  
  return result;
};

/**
 * Render visualization of document structure on a canvas
 * @param canvasId ID of the canvas element
 * @param visualizationData Visualization data
 * @param imageWidth Width of the original image
 * @param imageHeight Height of the original image
 */
export const renderVisualization = (
  canvasId: string,
  visualizationData: any,
  imageWidth: number,
  imageHeight: number
) => {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
  if (!canvas) return;
  
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Set canvas dimensions to match image
  canvas.width = imageWidth;
  canvas.height = imageHeight;
  
  // Draw text blocks
  ctx.strokeStyle = "rgba(0, 255, 0, 0.7)";
  ctx.lineWidth = 2;
  
  visualizationData.textBlocks.forEach(block => {
    const { left, top, width, height } = block.boundingBox;
    
    // Convert normalized coordinates to canvas coordinates
    const x = left * imageWidth;
    const y = top * imageHeight;
    const w = width * imageWidth;
    const h = height * imageHeight;
    
    ctx.strokeRect(x, y, w, h);
  });
  
  // Draw lines
  ctx.strokeStyle = "rgba(0, 0, 255, 0.5)";
  ctx.lineWidth = 1;
  
  visualizationData.lines.forEach(line => {
    const { left, top, width, height } = line.boundingBox;
    
    // Convert normalized coordinates to canvas coordinates
    const x = left * imageWidth;
    const y = top * imageHeight;
    const w = width * imageWidth;
    const h = height * imageHeight;
    
    ctx.strokeRect(x, y, w, h);
    
    // Draw text
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.font = "10px Arial";
    ctx.fillText(line.text, x, y - 2);
  });
  
  // Draw tables
  ctx.strokeStyle = "rgba(255, 0, 0, 0.8)";
  ctx.lineWidth = 3;
  
  visualizationData.blocks
    .filter(block => block.type === "TABLE")
    .forEach(table => {
      const { Left, Top, Width, Height } = table.boundingBox;
      
      // Convert normalized coordinates to canvas coordinates
      const x = Left * imageWidth;
      const y = Top * imageHeight;
      const w = Width * imageWidth;
      const h = Height * imageHeight;
      
      ctx.strokeRect(x, y, w, h);
      
      // Label table
      ctx.fillStyle = "rgba(255, 0, 0, 0.8)";
      ctx.font = "bold 14px Arial";
      ctx.fillText("TABLE", x, y - 5);
    });
};

/**
 * Export the document results as a formatted text file with tables
 * @param text Formatted text with tables
 * @param visualizationData Visualization data
 * @param imageDataUrl Image data URL for visualization
 */
export const exportDocumentResults = async (
  text: string,
  visualizationData: any,
  imageDataUrl?: string
): Promise<Blob> => {
  console.log('📄 Exporting document results with formatted tables');
  console.log('📝 Text to export:', text);
  
  // Create a comprehensive report with formatted tables
  let exportContent = '';
  
  // Add header
  exportContent += '='.repeat(80) + '\n';
  exportContent += 'DOCUMENT ANALYSIS REPORT\n';
  exportContent += 'Generated on: ' + new Date().toLocaleString() + '\n';
  exportContent += '='.repeat(80) + '\n\n';
  
  // Add the formatted text (which includes our nicely formatted tables)
  exportContent += text;
  
  // Add footer
  exportContent += '\n' + '='.repeat(80) + '\n';
  exportContent += 'End of Report\n';
  exportContent += '='.repeat(80) + '\n';
  
  console.log('✅ Export content prepared:', exportContent);
  
  // Create blob with the formatted content
  const blob = new Blob([exportContent], { type: 'text/plain; charset=utf-8' });
  return blob;
};

/**
 * Export only the tables in formatted text
 * @param tables Array of tables to export
 * @returns Formatted text with only tables
 */
export const exportTablesOnly = (tables: Table[]): string => {
  console.log('📊 Exporting tables only');
  
  if (!tables || tables.length === 0) {
    return 'No tables found in document.';
  }
  
  let exportContent = '';
  
  // Add header
  exportContent += '='.repeat(80) + '\n';
  exportContent += 'EXTRACTED TABLES\n';
  exportContent += 'Generated on: ' + new Date().toLocaleString() + '\n';
  exportContent += '='.repeat(80) + '\n\n';
  
  // Add each table with enhanced formatting
  tables.forEach((table, index) => {
    exportContent += `Table ${index + 1}:\n`;
    exportContent += formatEnhancedTable(table);
    exportContent += '\n\n';
  });
  
  // Add footer
  exportContent += '='.repeat(80) + '\n';
  exportContent += 'End of Tables\n';
  exportContent += '='.repeat(80) + '\n';
  
  console.log('✅ Tables export content prepared');
  return exportContent;
};

/**
 * Add table borders to positional text while preserving word positioning
 * This function detects table-like structures and adds Unicode borders around them
 * @param positionalText The text with preserved positioning
 * @param blocks Original Textract blocks for table detection
 * @returns Text with table borders added
 */
const addTableBordersToPositionalText = (positionalText: string, blocks: AwsTextractBlock[]): string => {
  console.log('🔍 addTableBordersToPositionalText called');
  
  const lines = positionalText.split('\n');
  if (lines.length === 0) return positionalText;
  
  // Detect table regions based on Textract table blocks
  const tableRegions = detectTableRegions(blocks, lines);
  
  if (tableRegions.length === 0) {
    console.log('📊 No table regions detected, returning original text');
    return positionalText;
  }
  
  console.log(`📊 Found ${tableRegions.length} table regions`);
  
  // Add borders to each table region
  let result = [...lines];
  let offset = 0; // Track line insertions
  
  for (const region of tableRegions) {
    const startLine = region.startLine + offset;
    const endLine = region.endLine + offset;
    
    // Calculate the maximum line width in the table region
    const maxWidth = Math.max(...result.slice(startLine, endLine + 1).map(line => line.length));
    const borderWidth = Math.max(maxWidth, 80); // Minimum width of 80 characters
    
    // Create borders
    const topBorder = '┌' + '─'.repeat(borderWidth - 2) + '┐';
    const bottomBorder = '└' + '─'.repeat(borderWidth - 2) + '┘';
    
    // Add vertical borders to content lines
    for (let i = startLine; i <= endLine; i++) {
      const line = result[i];
      const paddedLine = line.padEnd(borderWidth - 2);
      result[i] = '│' + paddedLine + '│';
    }
    
    // Insert top and bottom borders
    result.splice(startLine, 0, topBorder);
    result.splice(endLine + 2, 0, bottomBorder); // +2 because we added top border
    
    offset += 2; // We added 2 lines (top and bottom border)
    
    // Add header separator if this looks like a table with headers
    if (region.hasHeader && startLine + 1 < result.length) {
      const headerSeparator = '├' + '─'.repeat(borderWidth - 2) + '┤';
      result.splice(startLine + 2, 0, headerSeparator); // +2 for top border and first data row
      offset += 1;
    }
  }
  
  console.log('✅ Table borders added to positional text');
  return result.join('\n');
};

/**
 * Detect table regions in the positional text based on Textract blocks
 * @param blocks Textract blocks
 * @param lines Lines of positional text
 * @returns Array of table regions with start/end line numbers
 */
const detectTableRegions = (blocks: AwsTextractBlock[], lines: string[]): Array<{
  startLine: number;
  endLine: number;
  hasHeader: boolean;
}> => {
  const regions: Array<{ startLine: number; endLine: number; hasHeader: boolean }> = [];
  
  // Find table blocks
  const tableBlocks = blocks.filter(b => b.BlockType === 'TABLE');
  
  if (tableBlocks.length === 0) {
    // If no explicit table blocks, try to detect table-like patterns in text
    return detectTablePatternsInText(lines);
  }
  
  for (const tableBlock of tableBlocks) {
    // Get table's vertical position range
    const tableTop = tableBlock.Geometry.BoundingBox.Top;
    const tableHeight = tableBlock.Geometry.BoundingBox.Height;
    const tableBottom = tableTop + tableHeight;
    
    // Map to line numbers (approximate)
    const totalLines = lines.length;
    const startLine = Math.floor(tableTop * totalLines);
    const endLine = Math.min(Math.floor(tableBottom * totalLines), totalLines - 1);
    
    // Check if this looks like it has headers
    const hasHeader = checkForTableHeaders(blocks, tableBlock);
    
    regions.push({
      startLine: Math.max(0, startLine),
      endLine: Math.max(startLine, endLine),
      hasHeader
    });
  }
  
  return regions;
};

/**
 * Detect table-like patterns in text when no explicit table blocks exist
 * @param lines Lines of text
 * @returns Array of detected table regions
 */
const detectTablePatternsInText = (lines: string[]): Array<{
  startLine: number;
  endLine: number;
  hasHeader: boolean;
}> => {
  const regions: Array<{ startLine: number; endLine: number; hasHeader: boolean }> = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Look for lines that might be table headers or data
    if (isTableLikeLine(line)) {
      let startLine = i;
      let endLine = i;
      
      // Extend the region to include consecutive table-like lines
      while (endLine + 1 < lines.length && isTableLikeLine(lines[endLine + 1].trim())) {
        endLine++;
      }
      
      // Only consider as table if we have at least 2 lines
      if (endLine > startLine) {
        // Check if first line looks like headers
        const hasHeader = looksLikeHeader(lines[startLine]);
        
        regions.push({ startLine, endLine, hasHeader });
      }
      
      i = endLine; // Skip processed lines
    }
  }
  
  return regions;
};

/**
 * Check if a line looks like it belongs to a table
 * @param line Line to check
 * @returns True if line looks table-like
 */
const isTableLikeLine = (line: string): boolean => {
  if (line.length < 10) return false;
  
  // Look for patterns that suggest tabular data
  const patterns = [
    /^[A-Za-z\s]+\s+[0-9.]+/, // Text followed by numbers
    /\s+[0-9.]+\s+[A-Za-z\/\%]/, // Numbers followed by units
    /[A-Za-z]+.*[0-9]+.*[A-Za-z]/, // Mixed text and numbers
    /^[A-Za-z\s]+\s+[A-Za-z\s]+\s+[A-Za-z\s]+/, // Multiple text columns
  ];
  
  return patterns.some(pattern => pattern.test(line));
};

/**
 * Check if a line looks like table headers
 * @param line Line to check
 * @returns True if line looks like headers
 */
const looksLikeHeader = (line: string): boolean => {
  const headerWords = ['test', 'result', 'value', 'range', 'reference', 'normal', 'unit', 'name'];
  const lowerLine = line.toLowerCase();
  
  return headerWords.some(word => lowerLine.includes(word));
};

/**
 * Check if table has headers based on cell content
 * @param blocks All blocks
 * @param tableBlock Table block to check
 * @returns True if table appears to have headers
 */
const checkForTableHeaders = (blocks: AwsTextractBlock[], tableBlock: AwsTextractBlock): boolean => {
  // Get cells for this table
  const cellIds: string[] = [];
  if (tableBlock.Relationships) {
    for (const rel of tableBlock.Relationships) {
      if (rel.Type === 'CHILD') {
        cellIds.push(...rel.Ids);
      }
    }
  }
  
  // Find first row cells
  const firstRowCells = blocks.filter(block => 
    block.BlockType === 'CELL' && 
    cellIds.includes(block.Id) && 
    block.RowIndex === '1'
  );
  
  // Check if first row contains header-like text
  for (const cell of firstRowCells) {
    if (cell.Relationships) {
      let cellText = '';
      for (const rel of cell.Relationships) {
        if (rel.Type === 'CHILD') {
          for (const wordId of rel.Ids) {
            const wordBlock = blocks.find(b => b.Id === wordId && b.BlockType === 'WORD');
            if (wordBlock && wordBlock.Text) {
              cellText += wordBlock.Text + ' ';
            }
          }
        }
      }
      
      if (looksLikeHeader(cellText.trim())) {
        return true;
      }
    }
  }
  
  return false;
};

/**
 * Main function to process a document image with AWS Textract
 * @param imageData Image data (File or Blob)
 * @returns Processed document results
 */
export const processLabResult = async (imageData: File | Blob): Promise<{
  text: string;
  visualizationData: any;
  error?: string;
}> => {
  try {
    // Try multiple backend endpoints
    const endpoints = [
      { url: 'http://localhost:8000/api/textract/upload/', fieldName: 'document' },  // Django backend
      { url: 'http://localhost:3001/api/textract/process-lab-result', fieldName: 'file' },  // Express backend
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`🔄 Trying endpoint: ${endpoint.url}`);
        console.log(`📝 Using field name: ${endpoint.fieldName}`);
        
        const formData = new FormData();
        
        // Add filename if imageData is a File, otherwise use a default name
        const filename = imageData instanceof File ? imageData.name : 'lab-result.jpg';
        formData.append(endpoint.fieldName, imageData, filename);
        
        console.log(`📤 Sending request to ${endpoint.url}...`);
        const response = await fetch(endpoint.url, {
          method: 'POST',
          body: formData
        });
        
        console.log(`📊 Response status: ${response.status} (${response.statusText})`);
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Response data received:', data);
          console.log('🔍 Response structure analysis:');
          console.log('  - Has success:', 'success' in data);
          console.log('  - Has blocks directly:', 'blocks' in data);
          console.log('  - Has structured_results:', 'structured_results' in data);
          console.log('  - structured_results has blocks:', data.structured_results && 'blocks' in data.structured_results);
          
          if (data.error) {
            console.error(`❌ Server returned error: ${data.error}`);
            throw new Error(data.error);
          }
          
          // Handle Django response format - structured results without blocks
          if (data.success && data.structured_results) {
            console.log(`🎉 Django backend success with structured results!`);
            console.log('📊 Structured results:', data.structured_results);
            console.log('📝 Raw text preview:', data.raw_text ? data.raw_text.substring(0, 500) + '...' : 'No raw text');
            console.log('📝 Raw text length:', data.raw_text ? data.raw_text.length : 0);
            
            // Create mock blocks from Django raw text to preserve positioning and formatting
            const rawText = data.raw_text || 'No text extracted';
            const mockBlocks = createMockBlocksFromRawText(rawText);
            
            console.log(`🔧 Created ${mockBlocks.length} mock blocks from Django raw text`);
            
            const textractResponse: AwsTextractResponse = {
              success: true,
              blocks: mockBlocks,
              blocksCount: mockBlocks.length,
              formattedText: rawText
            };
            
            const processedResult = processDocument(textractResponse);
            
            console.log(`✅ Successfully processed with Django backend: ${endpoint.url}`);
            console.log(`🚀 Returning processed result, stopping endpoint loop`);
            console.log('📄 Final processed text preview:', processedResult.text.substring(0, 200) + '...');
            return {
              text: processedResult.text,
              visualizationData: processedResult.visualizationData
            };
          }
          
          // Handle Django response format (structured_results.blocks) - if blocks exist
          if (data.success && data.structured_results && data.structured_results.blocks) {
            console.log(`🎉 Found ${data.structured_results.blocks.length} blocks from Django backend`);
            const textractResponse: AwsTextractResponse = {
              success: true,
              blocks: data.structured_results.blocks,
              blocksCount: data.structured_results.blocks.length,
              formattedText: data.structured_results.formattedText || data.raw_text
            };
            
            const processedResult = processDocument(textractResponse);
            
            console.log(`✅ Successfully processed with Django backend: ${endpoint.url}`);
            console.log(`🚀 Returning processed result, stopping endpoint loop`);
            return {
              text: processedResult.text,
              visualizationData: processedResult.visualizationData
            };
          }
          
          // Handle direct blocks format (Express backend or other formats)
          if (data.blocks) {
            console.log(`🎉 Found ${data.blocks.length} blocks from Express backend`);
            const textractResponse: AwsTextractResponse = {
              success: true,
              blocks: data.blocks,
              blocksCount: data.blocks.length,
              formattedText: data.formattedText
            };
            
            const processedResult = processDocument(textractResponse);
            
            console.log(`✅ Successfully processed with Express backend: ${endpoint.url}`);
            console.log(`🚀 Returning processed result, stopping endpoint loop`);
            return {
              text: processedResult.text,
              visualizationData: processedResult.visualizationData
            };
          }
          
          // Handle other success formats
          if (data.success && data.blocks) {
            console.log(`🎉 Found ${data.blocks.length} blocks from other backend`);
            const processedResult = processDocument(data);
            
            console.log(`✅ Successfully processed with ${endpoint.url}`);
            console.log(`🚀 Returning processed result, stopping endpoint loop`);
            return {
              text: processedResult.text,
              visualizationData: processedResult.visualizationData
            };
          }
          
          console.warn(`⚠️ Unexpected response format from ${endpoint.url}:`, data);
          
        } else {
          const errorText = await response.text();
          console.error(`❌ Endpoint ${endpoint.url} failed with status ${response.status}: ${errorText}`);
          
          // If it's a 400 error, log more details for debugging
          if (response.status === 400) {
            console.error('🔍 Bad Request Details:', {
              url: endpoint.url,
              fieldName: endpoint.fieldName,
              imageType: imageData.type,
              imageSize: imageData.size,
              errorResponse: errorText
            });
          }
        }
      } catch (error) {
        console.error(`💥 Endpoint ${endpoint.url} failed with exception:`, error);
        // Continue to next endpoint
      }
    }
    
    // If all endpoints fail, use mock data for demonstration
    console.error('🚨 ALL ENDPOINTS FAILED! Using mock data as fallback');
    console.error('📊 Attempted endpoints:', endpoints.map(e => e.url));
    console.error('⚠️ This means neither Django nor Express backends are working');
    return await processMockLabResult();
    
  } catch (error) {
    console.error('Error processing lab result:', error);
    return {
      text: '',
      visualizationData: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Process lab result with mock data when backends are unavailable
 * @returns Mock processed document results
 */
const processMockLabResult = async (): Promise<{
  text: string;
  visualizationData: any;
}> => {
  // Create mock Textract response with table data
  const mockResponse: AwsTextractResponse = {
    success: true,
    blocks: [
      {
        BlockType: "PAGE",
        Id: "page-1",
        Geometry: {
          BoundingBox: { Left: 0, Top: 0, Width: 1, Height: 1 }
        }
      },
      {
        BlockType: "LINE",
        Id: "line-1",
        Text: "LABORATORY TEST REPORT",
        Geometry: {
          BoundingBox: { Left: 0.1, Top: 0.05, Width: 0.8, Height: 0.04 }
        }
      },
      {
        BlockType: "LINE",
        Id: "line-2",
        Text: "Patient Name: John Doe",
        Geometry: {
          BoundingBox: { Left: 0.1, Top: 0.15, Width: 0.4, Height: 0.03 }
        }
      },
      {
        BlockType: "LINE",
        Id: "line-3",
        Text: "Doctor: Dr. Smith",
        Geometry: {
          BoundingBox: { Left: 0.1, Top: 0.2, Width: 0.3, Height: 0.03 }
        }
      },
      {
        BlockType: "LINE",
        Id: "line-4",
        Text: "Date: 2025-07-21",
        Geometry: {
          BoundingBox: { Left: 0.1, Top: 0.25, Width: 0.3, Height: 0.03 }
        }
      },
      {
        BlockType: "LINE",
        Id: "line-5",
        Text: "Blood Test Results:",
        Geometry: {
          BoundingBox: { Left: 0.1, Top: 0.35, Width: 0.4, Height: 0.03 }
        }
      },
      // Table structure for lab results
      {
        BlockType: "TABLE",
        Id: "table-1",
        Geometry: {
          BoundingBox: { Left: 0.1, Top: 0.4, Width: 0.8, Height: 0.3 }
        },
        Relationships: [
          {
            Type: "CHILD",
            Ids: ["cell-1", "cell-2", "cell-3", "cell-4", "cell-5", "cell-6", "cell-7", "cell-8", "cell-9"]
          }
        ]
      },
      // Table cells for lab results
      {
        BlockType: "CELL",
        Id: "cell-1",
        RowIndex: "1",
        ColumnIndex: "1",
        Geometry: {
          BoundingBox: { Left: 0.1, Top: 0.4, Width: 0.25, Height: 0.05 }
        },
        Relationships: [
          {
            Type: "CHILD",
            Ids: ["word-header-1"]
          }
        ]
      },
      {
        BlockType: "CELL",
        Id: "cell-2",
        RowIndex: "1",
        ColumnIndex: "2",
        Geometry: {
          BoundingBox: { Left: 0.35, Top: 0.4, Width: 0.25, Height: 0.05 }
        },
        Relationships: [
          {
            Type: "CHILD",
            Ids: ["word-header-2"]
          }
        ]
      },
      {
        BlockType: "CELL",
        Id: "cell-3",
        RowIndex: "1",
        ColumnIndex: "3",
        Geometry: {
          BoundingBox: { Left: 0.6, Top: 0.4, Width: 0.3, Height: 0.05 }
        },
        Relationships: [
          {
            Type: "CHILD",
            Ids: ["word-header-3"]
          }
        ]
      },
      // Row 2
      {
        BlockType: "CELL",
        Id: "cell-4",
        RowIndex: "2",
        ColumnIndex: "1",
        Geometry: {
          BoundingBox: { Left: 0.1, Top: 0.45, Width: 0.25, Height: 0.05 }
        },
        Relationships: [
          {
            Type: "CHILD",
            Ids: ["word-test-1"]
          }
        ]
      },
      {
        BlockType: "CELL",
        Id: "cell-5",
        RowIndex: "2",
        ColumnIndex: "2",
        Geometry: {
          BoundingBox: { Left: 0.35, Top: 0.45, Width: 0.25, Height: 0.05 }
        },
        Relationships: [
          {
            Type: "CHILD",
            Ids: ["word-result-1"]
          }
        ]
      },
      {
        BlockType: "CELL",
        Id: "cell-6",
        RowIndex: "2",
        ColumnIndex: "3",
        Geometry: {
          BoundingBox: { Left: 0.6, Top: 0.45, Width: 0.3, Height: 0.05 }
        },
        Relationships: [
          {
            Type: "CHILD",
            Ids: ["word-range-1"]
          }
        ]
      },
      // Row 3
      {
        BlockType: "CELL",
        Id: "cell-7",
        RowIndex: "3",
        ColumnIndex: "1",
        Geometry: {
          BoundingBox: { Left: 0.1, Top: 0.5, Width: 0.25, Height: 0.05 }
        },
        Relationships: [
          {
            Type: "CHILD",
            Ids: ["word-test-2"]
          }
        ]
      },
      {
        BlockType: "CELL",
        Id: "cell-8",
        RowIndex: "3",
        ColumnIndex: "2",
        Geometry: {
          BoundingBox: { Left: 0.35, Top: 0.5, Width: 0.25, Height: 0.05 }
        },
        Relationships: [
          {
            Type: "CHILD",
            Ids: ["word-result-2"]
          }
        ]
      },
      {
        BlockType: "CELL",
        Id: "cell-9",
        RowIndex: "3",
        ColumnIndex: "3",
        Geometry: {
          BoundingBox: { Left: 0.6, Top: 0.5, Width: 0.3, Height: 0.05 }
        },
        Relationships: [
          {
            Type: "CHILD",
            Ids: ["word-range-2"]
          }
        ]
      },
      // WORD blocks for table content
      {
        BlockType: "WORD",
        Id: "word-header-1",
        Text: "Test Name",
        Geometry: {
          BoundingBox: { Left: 0.1, Top: 0.4, Width: 0.2, Height: 0.04 }
        }
      },
      {
        BlockType: "WORD",
        Id: "word-header-2",
        Text: "Result",
        Geometry: {
          BoundingBox: { Left: 0.35, Top: 0.4, Width: 0.15, Height: 0.04 }
        }
      },
      {
        BlockType: "WORD",
        Id: "word-header-3",
        Text: "Reference Range",
        Geometry: {
          BoundingBox: { Left: 0.6, Top: 0.4, Width: 0.25, Height: 0.04 }
        }
      },
      {
        BlockType: "WORD",
        Id: "word-test-1",
        Text: "Hemoglobin",
        Geometry: {
          BoundingBox: { Left: 0.1, Top: 0.45, Width: 0.2, Height: 0.04 }
        }
      },
      {
        BlockType: "WORD",
        Id: "word-result-1",
        Text: "14.2 g/dL",
        Geometry: {
          BoundingBox: { Left: 0.35, Top: 0.45, Width: 0.15, Height: 0.04 }
        }
      },
      {
        BlockType: "WORD",
        Id: "word-range-1",
        Text: "12.0-15.5 g/dL",
        Geometry: {
          BoundingBox: { Left: 0.6, Top: 0.45, Width: 0.25, Height: 0.04 }
        }
      },
      {
        BlockType: "WORD",
        Id: "word-test-2",
        Text: "Glucose",
        Geometry: {
          BoundingBox: { Left: 0.1, Top: 0.5, Width: 0.15, Height: 0.04 }
        }
      },
      {
        BlockType: "WORD",
        Id: "word-result-2",
        Text: "95 mg/dL",
        Geometry: {
          BoundingBox: { Left: 0.35, Top: 0.5, Width: 0.15, Height: 0.04 }
        }
      },
      {
        BlockType: "WORD",
        Id: "word-range-2",
        Text: "70-100 mg/dL",
        Geometry: {
          BoundingBox: { Left: 0.6, Top: 0.5, Width: 0.2, Height: 0.04 }
        }
      }
    ],
    blocksCount: 22,
    fileName: "mock-lab-result.jpg"
  };

  const processedResult = processDocument(mockResponse);
  
  return {
    text: processedResult.text,
    visualizationData: processedResult.visualizationData
  };
};
