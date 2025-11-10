# Gemini Medical Validator

Validate medical documents (PDF, JPG, PNG, etc.) using Google Gemini AI to ensure they are authentic and signed by qualified doctors (MBBS or above).

---

## 🚀 Installation

```bash
npm install gemini-medical-validator
```

## 🧰 Setup

Create a .env file in your project root:
```
GEMINI_API_KEY=your_google_gemini_api_key
GEMINI_MODEL_NAME=gemini-1.5-flash
```

## 🩺 Usage
```
const { validateMedicalDocument } = require('gemini-medical-validator');

(async () => {
  const result = await validateMedicalDocument('./medical_certificate.pdf', 'John Doe');
  console.log(result);
})();
```
```
Example Output:

{
  "isValid": true,
  "reason": "Document signed by Dr. Meera Sharma (MBBS)",
  "doctorName": "Dr. Meera Sharma",
  "doctorQualification": "MBBS",
  "confidence": "high"
}
```