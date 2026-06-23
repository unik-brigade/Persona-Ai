# PersonaAI – Personality Analyzer

A modern, claymorphic web application that analyzes online aliases/usernames to generate entertaining, witty, and surprisingly accurate personality profiles. Powered by Gemini AI with a robust offline mock fallback.

## Technology Stack
- **Frontend**: HTML5, Vanilla CSS3 (Claymorphism & Glassmorphism), JavaScript (ES6+), Chart.js (Radar charts), html2pdf.js (PDF reports)
- **Backend**: Python 3, Flask, SQLite (History Tracking)
- **AI Engine**: Google Gemini API (`gemini-1.5-flash`) via `google-generativeai`

---

## Setup & Running the Application

### 1. Prerequisites
Ensure you have Python 3.9+ installed on your system.

### 2. Setup Virtual Environment
Run the following commands in your terminal from the project root folder (`funny prg`):

**On Windows (Command Prompt/PowerShell):**
```bash
python -m venv .venv
.\.venv\Scripts\activate
```

**On macOS/Linux:**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Install Dependencies
Install the required packages:
```bash
pip install -r requirements.txt
```

### 4. Configure Gemini API Key (Optional)
To use the live AI analysis instead of the mock data generator:
1. Create a `.env` file in the root directory.
2. Add your Gemini API key:
   ```env
   GEMINI_API_KEY=your_actual_api_key_here
   ```
*(If no key is configured, the application automatically falls back to a deterministic Mock Analyzer).*

### 5. Run the Application
Start the Flask local development server:
```bash
python app.py
```

The application will start on **`http://127.0.0.1:5000`**. Open this address in your web browser.

---

## Troubleshooting

- **CORS / Connection Issues**: If you access the application through another port (like VS Code Live Server on `http://127.0.0.1:5500`), cross-origin headers are automatically enabled on the Flask backend to permit API communication.
- **SQLite Database**: The history results are saved to a local SQLite database file named `database.db`. This file will be generated automatically upon startup.
