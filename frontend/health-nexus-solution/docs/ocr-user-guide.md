# OCR Lab Results User Guide

## Overview
The OCR (Optical Character Recognition) system has been enhanced to better extract patient information from lab reports, especially those with complex formatting or OCR artifacts.

## How It Works

### 1. Document Upload
- **Supported Formats**: Images (JPG, PNG, GIF, BMP) and PDF files
- **Processing**: Uses Google Cloud Vision API with Tesseract.js fallback
- **Size Limit**: Optimized for typical lab report sizes

### 2. Enhanced Patient Name Detection
The system now handles complex OCR text patterns, including:
- Health check report headers
- OCR artifacts and noise
- Various title formats (Mrs., Mr., Ms., Dr., etc.)
- Multi-word names

### 3. What Gets Extracted

#### Document Details
- **Laboratory Name**: Automatically detected from headers
- **Doctor Name**: Extracted from report signatures
- **Report Date**: Multiple date formats supported
- **Report Type**: Lab test category identification

#### Patient Information
- **Patient Name**: Enhanced cleaning and validation
- **Age**: Extracted from various "Age:" patterns
- **Gender**: Detected from "Sex:" or "Gender:" fields
- **Date of Birth**: Multiple format support
- **Patient ID**: Medical record numbers

#### Medical Data
- **Test Results**: Values, units, and reference ranges
- **Critical Values**: Automatically flagged
- **Abnormal Results**: Highlighted for attention
- **Test Categories**: Organized by test type

## Tips for Best Results

### 1. Image Quality
- **Resolution**: Higher resolution images work better
- **Lighting**: Ensure good lighting, avoid shadows
- **Focus**: Make sure text is sharp and clear
- **Orientation**: Keep documents straight and properly oriented

### 2. Document Preparation
- **Clean Surface**: Remove any marks or stains if possible
- **Full Document**: Include complete lab report
- **Contrast**: Ensure good contrast between text and background

### 3. Understanding Results

#### Patient Matching
The system will:
- Extract the patient name from the document
- Attempt to match it with existing patients
- Show confidence level of the match
- Allow manual selection if automatic matching fails

#### Data Verification
Always verify:
- ✅ Patient name is correctly extracted
- ✅ Critical values are properly flagged
- ✅ Test dates match the document
- ✅ All important results are captured

## Troubleshooting

### Common Issues and Solutions

#### Patient Name Not Detected
**Symptoms**: Name appears as artifacts or is missing
**Solutions**:
- Check document orientation
- Ensure patient name area is clearly visible
- Manually enter name if extraction fails

#### Missing Test Results
**Symptoms**: Some values not extracted
**Solutions**:
- Verify all pages are uploaded for multi-page reports
- Check if results are in table format
- Review the raw OCR text for any missing data

#### Wrong Patient Assignment
**Symptoms**: Results assigned to wrong patient
**Solutions**:
- Use the patient selector dropdown
- Verify patient name spelling in the document
- Check for multiple patients in the same document

## Advanced Features

### Debug Mode
For troubleshooting, the system provides:
- Raw OCR text display
- Extraction step logging (check browser console)
- Pattern matching details
- Confidence scores for extractions

### Manual Corrections
If automatic extraction fails:
1. Review the extracted structured data
2. Manually edit any incorrect fields
3. Use the raw OCR text as reference
4. Save corrected information

## Best Practices

### For Medical Staff
1. **Double-Check Critical Values**: Always verify abnormal or critical results
2. **Patient Verification**: Confirm patient identity before saving results
3. **Complete Review**: Check that all important data is captured
4. **Quality Control**: Report any systematic extraction issues

### For IT Support
1. **Monitor Logs**: Check browser console for extraction debugging
2. **Pattern Updates**: New document formats may need pattern adjustments
3. **Performance**: Monitor OCR processing times
4. **Backup**: Ensure raw documents are preserved

## Support
For technical issues or improvement suggestions:
- Check the browser console for detailed error messages
- Document any new OCR artifact patterns encountered
- Report extraction accuracy issues with sample documents
