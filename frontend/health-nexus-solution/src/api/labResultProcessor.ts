// Enhanced AWS Textract Lab Result Processor
// Uses Python backend with EXACT Google Colab algorithms for maximum accuracy

import { AwsTextractBlock } from '@/types/textract';
import { ENV } from '../config/env';

// Interfaces for the result types
export interface ExtractedWord {
  text: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface LabResultResponse {
  text: string;
  error?: string;
  visualizationData?: {
    blocks: AwsTextractBlock[];
    lines: number;
    words: number;
    tables: number;
  };
  // Keep the original properties for backward compatibility
  blocks?: AwsTextractBlock[];
  formattedText?: string;
  hasTable?: boolean;
  visualizationUrl?: string;
}

/**
 * Process document with AWS Textract via Django backend
 * Backend uses EXACT Google Colab algorithms for maximum accuracy
 * @param file The file to process (File object)
 * @returns Structured response with extracted data
 */
export async function processLabResult(file: File): Promise<LabResultResponse> {
  try {
    console.log('🚀 Processing lab result with Django backend using Google Colab algorithms...');
    
    const formData = new FormData();
    formData.append('document', file);

    const response = await fetch(`${ENV.API_URL}/textract/upload/`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Django response received:', data);
    console.log('🔍 Response keys:', Object.keys(data));
    console.log('🔍 Has success?', 'success' in data, data.success);
    console.log('🔍 Has raw_blocks?', 'raw_blocks' in data, data.raw_blocks?.length);
    console.log('🔍 Has structured_results.blocks?', 'structured_results' in data && 'blocks' in (data.structured_results || {}), data.structured_results?.blocks?.length);

    // Handle both response formats - direct raw_blocks or structured_results.blocks
    let blocks = null;
    if (data.success) {
      if (data.raw_blocks) {
        blocks = data.raw_blocks;
        console.log('🎉 Using raw_blocks from response!');
      } else if (data.structured_results?.blocks) {
        blocks = data.structured_results.blocks;
        console.log('🎉 Using structured_results.blocks from response!');
      }
      
      if (blocks) {
        console.log(`📊 Processing completed with ${blocks.length} blocks`);
        console.log(`🔬 Extraction method: ${data.extraction_method || 'Unknown'}`);
        
        return {
          text: data.raw_text || data.formattedText || '',
          visualizationData: {
            blocks: blocks,
            lines: blocks.filter((b: any) => b.BlockType === 'LINE').length,
            words: blocks.filter((b: any) => b.BlockType === 'WORD').length,
            tables: blocks.filter((b: any) => b.BlockType === 'TABLE').length
          },
          blocks: blocks,
          formattedText: data.raw_text || data.formattedText || '',
          hasTable: data.hasTable || blocks.some((b: any) => b.BlockType === 'TABLE')
        };
      }
    }
    
    // If we get here, the response structure doesn't match expectations
    console.log('❌ Invalid response structure:', {
      hasSuccess: 'success' in data,
      successValue: data.success,
      hasRawBlocks: 'raw_blocks' in data,
      hasStructuredBlocks: data.structured_results?.blocks !== undefined,
      errorMessage: data.error
    });
    throw new Error(`No valid response from Django backend: ${JSON.stringify(data)}`);

  } catch (error) {
    console.error('❌ Processing failed:', error);
    
    // Provide simulation data for development
    console.log('🔄 Falling back to simulation mode...');
    
    return {
      text: `SIMULATION MODE - Google Colab Algorithm Test
      
Medical Center Lab Report
Patient Name: John Doe
Date: ${new Date().toLocaleDateString()}
      
TEST RESULTS:
┌─────────────────────┬──────────┬──────┬─────────────┬────────┐
│ Test Name           │ Result   │ Unit │ Range       │ Status │
├─────────────────────┼──────────┼──────┼─────────────┼────────┤
│ Hemoglobin          │ 14.2     │ g/dL │ 12.0-15.5   │ Normal │
│ Hematocrit          │ 42.1     │ %    │ 36.0-46.0   │ Normal │
│ White Blood Cells   │ 7.8      │ K/uL │ 4.5-11.0    │ Normal │
│ Platelets           │ 285      │ K/uL │ 150-450     │ Normal │
│ Glucose             │ 95       │ mg/dL│ 70-100      │ Normal │
└─────────────────────┴──────────┴──────┴─────────────┴────────┘

Note: This is simulation data. Upload an image to test real Google Colab algorithms.`,
      error: error instanceof Error ? error.message : 'Unknown error',
      visualizationData: { 
        blocks: [], 
        lines: 8, 
        words: 45, 
        tables: 1 
      }
    };
  }
}

/**
 * Utility function to count block types
 * @param blocks AWS Textract blocks
 * @returns Object with counts by block type
 */
export function analyzeBlocks(blocks: AwsTextractBlock[]) {
  const analysis = {
    total: blocks.length,
    words: 0,
    lines: 0,
    tables: 0,
    cells: 0,
    pages: 0
  };

  for (const block of blocks) {
    switch (block.BlockType) {
      case 'WORD':
        analysis.words++;
        break;
      case 'LINE':
        analysis.lines++;
        break;
      case 'TABLE':
        analysis.tables++;
        break;
      case 'CELL':
        analysis.cells++;
        break;
      case 'PAGE':
        analysis.pages++;
        break;
    }
  }

  return analysis;
}

export default processLabResult;
