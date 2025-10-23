// AWS Textract API utilities
// This file provides utilities for checking backend health and compatibility
import { ENV } from '../config/env';

/**
 * Check backend health and connectivity
 * @returns Status of backend connectivity
 */
export async function checkBackendHealth(): Promise<{ connected: boolean; backend: string }> {
  // Check Django backend first (your working backend)
  try {
    const response = await fetch(`${ENV.API_URL}/textract/health/`, { 
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      return { 
        connected: true, 
        backend: `Django (AWS Textract: ${data.aws_textract === 'Connected' ? 'Connected' : 'Disconnected'})` 
      };
    }
  } catch (error) {
    console.warn('Django backend health check failed:', error);
  }

  // Check Express backend as fallback
  try {
    const expressUrl = process.env.NODE_ENV === 'production' 
      ? window.location.origin 
      : `${ENV.API_URL.replace('/api', '')}:3001`;
      
    const response = await fetch(`${expressUrl}/api/health`, { 
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (response.ok) {
      return { connected: true, backend: 'Express' };
    }
  } catch (error) {
    console.warn('Express backend health check failed:', error);
  }

  return { connected: false, backend: 'None (using local processing)' };
}

/**
 * Enhanced Textract Response interface for backwards compatibility
 */
export interface EnhancedTextractResponse {
  blocks: any[];
  formattedText?: string;
  hasTable?: boolean;
  visualizationUrl?: string;
}

/**
 * Legacy function for backwards compatibility
 * @deprecated Use processLabResult from utils/labResultProcessor instead
 */
export async function processDocumentTextract(fileBytes: ArrayBuffer): Promise<EnhancedTextractResponse> {
  console.warn('processDocumentTextract is deprecated. Use processLabResult from utils/labResultProcessor instead.');
  
  // Simple fallback implementation
  return {
    blocks: [],
    formattedText: 'Document processing failed. Please use the new labResultProcessor.',
    hasTable: false
  };
}

/**
 * Legacy function for backwards compatibility
 * @deprecated Use visualizeLabResult from utils/labResultProcessor instead
 */
export async function getDocumentVisualization(fileBytes: ArrayBuffer): Promise<string> {
  console.warn('getDocumentVisualization is deprecated. Use visualizeLabResult from utils/labResultProcessor instead.');
  
  // Convert to base64 as fallback
  const base64 = btoa(
    new Uint8Array(fileBytes).reduce((data, byte) => data + String.fromCharCode(byte), '')
  );
  
  return `data:image/jpeg;base64,${base64}`;
}