/**
 * Gemini AI Service for Medical Document Validation
 * 
 * This service validates medical documents using Google Gemini AI.
 * It checks if the document:
 * - Is a valid medical document
 * - Has a doctor's signature (MBBS or above)
 * - Contains relevant medical information
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs').promises;
const dotenv = require('dotenv');

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = process.env.GEMINI_MODEL_NAME || 'gemini-1.5-flash';

// Initialize Gemini AI client
let genAI;
if (API_KEY) {
  genAI = new GoogleGenerativeAI(API_KEY);
} else {
  console.warn('⚠️  GEMINI_API_KEY not found in environment variables. Document validation will fail.');
}

/**
 * Converts file to base64 for Gemini API
 * @param {string} filePath - Path to the file
 * @returns {Promise<{mimeType: string, data: string}>}
 */
async function fileToBase64(filePath) {
  try {
    const fileData = await fs.readFile(filePath);
    const base64Data = fileData.toString('base64');
    
    // Determine MIME type from file extension
    const ext = filePath.split('.').pop().toLowerCase();
    const mimeTypes = {
      'pdf': 'application/pdf',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp'
    };
    
    return {
      mimeType: mimeTypes[ext] || 'application/pdf',
      data: base64Data
    };
  } catch (error) {
    throw new Error(`Error reading file: ${error.message}`);
  }
}

/**
 * Validates a medical document using Gemini AI
 * @param {string} filePath - Path to the medical document
 * @param {string} employeeName - Name of the employee requesting leave
 * @returns {Promise<{isValid: boolean, reason: string, doctorName?: string, doctorQualification?: string}>}
 */
async function validateMedicalDocument(filePath, employeeName) {
  try {
    if (!API_KEY || !genAI) {
      throw new Error('Gemini API key is not configured. Please set GEMINI_API_KEY in environment variables.');
    }

    // Convert file to base64
    const fileData = await fileToBase64(filePath);

    // Get the Gemini model
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    // System prompt for medical document validation
    const systemPrompt = `You are a medical document validator for a leave approval system. 
Your task is to analyze medical documents and determine if they are valid for leave approval.

VALIDATION CRITERIA:
1. The document must be a genuine medical document (medical certificate, prescription, medical report, etc.)
2. The document must contain a doctor's signature
3. The doctor must be qualified (MBBS or above - check for qualifications like MBBS, MD, MS, DM, etc.)
4. The document should contain medical information relevant to the patient
5. The document should appear authentic (not forged or edited)

IMPORTANT:
- Only approve documents that clearly show a doctor's signature with MBBS or higher qualification
- Reject documents that look fake, edited, or don't have proper doctor credentials
- Reject documents without signatures
- Reject documents where the doctor's qualification is below MBBS

RESPONSE FORMAT (JSON only, no additional text):
{
  "isValid": true/false,
  "reason": "Detailed reason for validation result",
  "doctorName": "Name of doctor if found",
  "doctorQualification": "Qualification of doctor if found (e.g., MBBS, MD, MS)",
  "confidence": "high/medium/low"
}

Employee Name: ${employeeName}
Analyze the attached medical document and provide validation result.`;

    // Generate content with image
    const result = await model.generateContent([
      systemPrompt,
      {
        inlineData: {
          data: fileData.data,
          mimeType: fileData.mimeType
        }
      }
    ]);

    const response = await result.response;
    const text = response.text();

    // Parse JSON response (Gemini might return markdown code blocks)
    let jsonText = text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '').trim();
    }

    const validationResult = JSON.parse(jsonText);

    return {
      isValid: validationResult.isValid === true,
      reason: validationResult.reason || 'Validation completed',
      doctorName: validationResult.doctorName,
      doctorQualification: validationResult.doctorQualification,
      confidence: validationResult.confidence || 'medium'
    };
  } catch (error) {
    console.error('Error validating medical document:', error);
    
    // Return error result
    return {
      isValid: false,
      reason: `Validation error: ${error.message}`,
      doctorName: null,
      doctorQualification: null,
      confidence: 'low'
    };
  }
}

/**
 * Validates medical document from buffer (for direct file uploads)
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} mimeType - MIME type of the file
 * @param {string} employeeName - Name of the employee
 * @returns {Promise<{isValid: boolean, reason: string, doctorName?: string, doctorQualification?: string}>}
 */
async function validateMedicalDocumentFromBuffer(fileBuffer, mimeType, employeeName) {
  try {
    if (!API_KEY || !genAI) {
      throw new Error('Gemini API key is not configured. Please set GEMINI_API_KEY in environment variables.');
    }

    // Convert buffer to base64
    const base64Data = fileBuffer.toString('base64');

    // Get the Gemini model
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    // System prompt for medical document validation
    const systemPrompt = `You are a medical document validator for a leave approval system. 
Your task is to analyze medical documents and determine if they are valid for leave approval.

VALIDATION CRITERIA:
1. The document must be a genuine medical document (medical certificate, prescription, medical report, etc.)
2. The document must contain a doctor's signature
3. The doctor must be qualified (MBBS or above - check for qualifications like MBBS, MD, MS, DM, etc.)
4. The document should contain medical information relevant to the patient
5. The document should appear authentic (not forged or edited)

IMPORTANT:
- Only approve documents that clearly show a doctor's signature with MBBS or higher qualification
- Reject documents that look fake, edited, or don't have proper doctor credentials
- Reject documents without signatures
- Reject documents where the doctor's qualification is below MBBS

RESPONSE FORMAT (JSON only, no additional text):
{
  "isValid": true/false,
  "reason": "Detailed reason for validation result",
  "doctorName": "Name of doctor if found",
  "doctorQualification": "Qualification of doctor if found (e.g., MBBS, MD, MS)",
  "confidence": "high/medium/low"
}

Employee Name: ${employeeName}
Analyze the attached medical document and provide validation result.`;

    // Generate content with image
    const result = await model.generateContent([
      systemPrompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      }
    ]);

    const response = await result.response;
    const text = response.text();

    // Parse JSON response
    let jsonText = text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '').trim();
    }

    const validationResult = JSON.parse(jsonText);

    return {
      isValid: validationResult.isValid === true,
      reason: validationResult.reason || 'Validation completed',
      doctorName: validationResult.doctorName,
      doctorQualification: validationResult.doctorQualification,
      confidence: validationResult.confidence || 'medium'
    };
  } catch (error) {
    console.error('Error validating medical document:', error);
    
    return {
      isValid: false,
      reason: `Validation error: ${error.message}`,
      doctorName: null,
      doctorQualification: null,
      confidence: 'low'
    };
  }
}

module.exports = {
  validateMedicalDocument,
  validateMedicalDocumentFromBuffer
};

