import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AwsTextractBlock } from '@/types/textract';
import { renderVisualization } from '@/utils/labResultProcessor';
import { Download, Eye, EyeOff } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

interface OCRVisualizerProps {
  blocks: AwsTextractBlock[];
  uploadedFile: File | null;
  extractedText: string;
  editableText: string;
  onTextChange: (text: string) => void;
  visualizationUrl?: string | null;
  visualizationData?: any;
}

const OCRVisualizer: React.FC<OCRVisualizerProps> = ({
  blocks,
  uploadedFile,
  extractedText,
  editableText,
  onTextChange,
  visualizationUrl,
  visualizationData
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showVisualization, setShowVisualization] = useState(false);
  const [canvasInitialized, setCanvasInitialized] = useState(false);
  const [usePreGeneratedVisualization, setUsePreGeneratedVisualization] = useState(!!visualizationUrl);

  // Block type colors matching the original HTML implementation
  const colors = {
    PAGE: '#0000FF',      // blue
    LINE: '#FF0000',      // red
    WORD: '#00FF00',      // green
    TABLE: '#800080',     // purple
    CELL: '#FFA500',      // orange
    SELECTION_ELEMENT: '#FFD700', // gold
  };

  useEffect(() => {
    if (showVisualization && uploadedFile && blocks.length > 0) {
      if (visualizationData) {
        visualizeWithProcessedData();
      } else {
        visualizeBlocks();
      }
    }
  }, [showVisualization, uploadedFile, blocks, visualizationData]);

  const visualizeWithProcessedData = () => {
    const canvas = canvasRef.current;
    if (!canvas || !uploadedFile) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const image = new Image();
    
    image.onload = () => {
      // Set canvas dimensions to match image
      canvas.width = image.width;
      canvas.height = image.height;
      
      // Draw the original image
      ctx.drawImage(image, 0, 0);

      // Use the advanced visualization with processed data
      renderVisualization('ocr-canvas', visualizationData, image.width, image.height);
      
      setCanvasInitialized(true);
    };
    
    image.src = URL.createObjectURL(uploadedFile);
  };

  const visualizeBlocks = () => {
    const canvas = canvasRef.current;
    if (!canvas || !uploadedFile) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const image = new Image();
    
    image.onload = () => {
      // Set canvas dimensions to match image
      canvas.width = image.width;
      canvas.height = image.height;
      
      // Draw the original image
      ctx.drawImage(image, 0, 0);

      // Draw bounding boxes for each block
      blocks.forEach((block) => {
        if (!block.Geometry) return;
        
        const box = block.Geometry.BoundingBox;
        const left = box.Left * canvas.width;
        const top = box.Top * canvas.height;
        const width = box.Width * canvas.width;
        const height = box.Height * canvas.height;

        // Set color based on block type
        ctx.strokeStyle = colors[block.BlockType as keyof typeof colors] || '#FFFF00';
        ctx.lineWidth = 2;
        ctx.strokeRect(left, top, width, height);

        // Draw text labels for LINE blocks
        if (block.BlockType === 'LINE' && block.Text) {
          ctx.fillStyle = '#000000';
          ctx.font = '12px Arial';
          ctx.fillText(block.Text, left, top - 4);
        }
      });

      setCanvasInitialized(true);
    };

    // Create object URL for the uploaded file
    image.src = URL.createObjectURL(uploadedFile);
  };

  const downloadEditedText = () => {
    // Use the exact Google Colab format when downloading
    // This preserves the positioning and table formatting exactly as processed
    const blob = new Blob([editableText], { type: 'text/plain; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    // Generate filename with timestamp for better organization
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.download = `lab-result-${timestamp}.txt`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadRawExtractionOutput = () => {
    // Download the original extracted text without any edits
    const blob = new Blob([extractedText], { type: 'text/plain; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.download = `lab-result-raw-${timestamp}.txt`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {uploadedFile && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  OCR Visualization
                </CardTitle>
                <CardDescription>
                  Visual representation of detected text blocks and boundaries
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {visualizationUrl ? (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setUsePreGeneratedVisualization(!usePreGeneratedVisualization)}
                  >
                    {usePreGeneratedVisualization ? 'Client' : 'Server'} Rendering
                  </Button>
                ) : null}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowVisualization(!showVisualization)}
                >
                  {showVisualization ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {showVisualization ? 'Hide' : 'Show'} Visualization
                </Button>
              </div>
            </div>
          </CardHeader>
          
          {showVisualization && (
            <CardContent>
              <div className="space-y-4">
                {/* Canvas for visualization */}
                <div className="border rounded-lg overflow-auto max-h-96">
                  {visualizationUrl && usePreGeneratedVisualization ? (
                    <img 
                      src={visualizationUrl} 
                      alt="OCR Visualization from server" 
                      className="w-full h-auto"
                    />
                  ) : (
                    <canvas
                      ref={canvasRef}
                      className="max-w-full h-auto border"
                      style={{ maxHeight: '400px' }}
                    />
                  )}
                </div>

                {/* Legend for block types */}
                {canvasInitialized && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                    {Object.entries(colors).map(([blockType, color]) => (
                      <div key={blockType} className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 border"
                          style={{ backgroundColor: color }}
                        />
                        <span>{blockType}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Statistics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="bg-muted p-2 rounded">
                    <div className="font-medium">Total Blocks</div>
                    <div className="text-lg">{blocks.length}</div>
                  </div>
                  <div className="bg-muted p-2 rounded">
                    <div className="font-medium">Lines</div>
                    <div className="text-lg">{blocks.filter(b => b.BlockType === 'LINE').length}</div>
                  </div>
                  <div className="bg-muted p-2 rounded">
                    <div className="font-medium">Words</div>
                    <div className="text-lg">{blocks.filter(b => b.BlockType === 'WORD').length}</div>
                  </div>
                  <div className="bg-muted p-2 rounded">
                    <div className="font-medium">Tables</div>
                    <div className="text-lg">{blocks.filter(b => b.BlockType === 'TABLE').length}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Editable text area */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Extracted Text (Editable)</CardTitle>
              <CardDescription>
                Edit the Google Colab processed text before saving. Preserves original positioning and table formatting.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadEditedText}
              disabled={!editableText}
            >
              <Download className="h-4 w-4 mr-2" />
              Download Text
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="editableText">Text Content</Label>
            <Textarea
              id="editableText"
              value={editableText}
              onChange={(e) => onTextChange(e.target.value)}
              className="min-h-[300px] font-mono text-sm"
              placeholder="Extracted text will appear here for editing..."
            />
            <div className="text-xs text-muted-foreground">
              Characters: {editableText.length} | Lines: {editableText.split('\n').length}
              <br />
              Format: Google Colab algorithms with preserved positioning and Unicode table borders (┌─┬─┐├─┼─┤└─┴─┘)
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Raw extraction data */}
      {extractedText && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Raw Extraction Output</CardTitle>
                <CardDescription>
                  Original text as extracted by Google Colab algorithms (read-only)
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadRawExtractionOutput}
                disabled={!extractedText}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Raw
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-3 rounded-lg text-sm font-mono max-h-[200px] overflow-y-auto">
              <pre className="whitespace-pre-wrap">{extractedText}</pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OCRVisualizer;
