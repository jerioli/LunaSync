// AWS Textract Response Types

/**
 * AWS Textract BoundingBox structure
 */
export interface AwsTextractBoundingBox {
  Left: number;
  Top: number;
  Width: number;
  Height: number;
}

/**
 * AWS Textract Geometry structure
 */
export interface AwsTextractGeometry {
  BoundingBox: AwsTextractBoundingBox;
}

/**
 * AWS Textract Relationship structure
 */
export interface AwsTextractRelationship {
  Type: string;
  Ids: string[];
}

/**
 * AWS Textract Block structure
 */
export interface AwsTextractBlock {
  BlockType: string;
  Id: string;
  Text?: string;
  Geometry: AwsTextractGeometry;
  Relationships?: AwsTextractRelationship[];
  RowIndex?: string;
  ColumnIndex?: string;
}

/**
 * AWS Textract Full Response structure
 */
export interface AwsTextractResponse {
  success?: boolean;
  blocks: AwsTextractBlock[];
  blocksCount?: number;
  fileName?: string;
  error?: string;
  formattedText?: string;
  hasTable?: boolean;
}
