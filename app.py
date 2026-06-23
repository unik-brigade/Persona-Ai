import os
import json
import sqlite3
import random
import re
from datetime import datetime
from flask import Flask, request, jsonify, render_template
from dotenv import load_dotenv
import google.generativeai as genai
import mimetypes

# Fix Windows registry MIME-type mismatch for JS and CSS files
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('text/css', '.css')

# Load environment variables
load_dotenv()

app = Flask(__name__)
DB_FILE = 'database.db'

@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    return response

# Configure Gemini API
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)
    # Use gemini-1.5-flash as the default model
    MODEL_NAME = 'gemini-1.5-flash'
    use_gemini = True
    print("Gemini API configured successfully.")
else:
    use_gemini = False
    print("WARNING: GEMINI_API_KEY not found in .env. Falling back to Mock Analyzer.")

# -------------------------------------------------------------
# Database Setup & Helpers
# -------------------------------------------------------------
def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS analyses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            result_json TEXT NOT NULL
        )
    ''')
    conn.commit()
    conn.close()

# Initialize the SQLite database on startup
init_db()

# -------------------------------------------------------------
# Mock Analyzer (Uses random.seed(username) for consistency)
# -------------------------------------------------------------
def generate_mock_analysis(username):
    # Set seed based on username for deterministic "personality" results
    # Clean the username slightly for seeding
    clean_name = re.sub(r'[^a-zA-Z0-9]', '', username).lower()
    seed_val = sum(ord(c) for c in clean_name) if clean_name else 42
    random.seed(seed_val)

    # Personality Archetypes mapping
    archetypes = [
        {"type": "The Chaos Coordinator", "intel": "Chaotic Genius", "humor": 95, "intro_extro": 65},
        {"type": "The Silent Mastermind", "intel": "Hyper-Analytical", "humor": 45, "intro_extro": 15},
        {"type": "The Hype Specialist", "intel": "Social Strategist", "humor": 85, "intro_extro": 90},
        {"type": "The Digital Nomad", "intel": "Intuitive Explorer", "humor": 75, "intro_extro": 55},
        {"type": "The Pixel Philosopher", "intel": "Abstract Thinker", "humor": 60, "intro_extro": 30},
        {"type": "The Keyboard Gladiator", "intel": "Tactical Combatant", "humor": 80, "intro_extro": 45},
        {"type": "The Cozy Lurker", "intel": "Empathetic Observer", "humor": 50, "intro_extro": 20},
        {"type": "The Trend Catalyst", "intel": "Visionary Maverick", "humor": 90, "intro_extro": 80}
    ]
    
    arch = random.choice(archetypes)
    
    # Calculate scores (deterministic but styled random)
    conf_score = random.randint(70, 99)
    creativity = random.randint(65, 98)
    leadership = random.randint(55, 97)
    social_energy = arch["intro_extro"] + random.randint(-10, 10)
    social_energy = max(5, min(95, social_energy))
    
    # Selection pools
    strengths_pool = [
        "Unparalleled sarcastic reflexes", "Ability to find the best memes under pressure", 
        "Extremely high adaptability to interface changes", "Mastery of silent judging",
        "Expert multitasking (specifically having 45 browser tabs open)", "Incredible focus when ignoring chores",
        "Ability to read between the lines (even when there's nothing there)", "Quick wit and dynamic banter"
    ]
    
    weaknesses_pool = [
        "Crippling indecision when choosing what to watch", "Procrastination level: Academic Master",
        "Easily distracted by glowing screens or shiny objects", "Tendency to reply to text messages in your head but not in reality",
        "Slightly unstable sleeping cycle dictated by 'just one more episode'", "Intolerance of slow loading times",
        "Overcomplicating simple coffee orders", "Severe reaction to typing 'regards' instead of 'warm regards'"
    ]
    
    talents_pool = [
        "Can mute/unmute microphone in exactly 0.2 seconds", "Detecting hidden sarcasm with 99% accuracy",
        "Navigating dark rooms without stubbing toes", "Remembering random passwords from 2017 but forgetting what was bought for lunch",
        "Typing faster when slightly annoyed", "Perfect mimicry of a corporate email writer",
        "Finding typos in restaurants menus instantly"
    ]
    
    careers_pool = [
        "Professional Meme Historian", "AI Overlord Whisperer", "Chief Caffeine Consumer", 
        "Ethical Cybersecurity Agent", "Cryptocurrency Philosopher", "UI/UX Aesthetic Specialist",
        "Sub-reddit Moderator Emeritus", "Virtual Reality Realtor"
    ]
    
    facts_pool = [
        f"The name '{username}' carries a cosmic signature of someone who buys books but never finishes them.",
        "Your keyboard has a slight wear pattern on the backspace key, indicating a rich history of overthinking.",
        "Statistically, you are 87% more likely to argue with a chatbot than with a customer representative.",
        "You probably have a folder named 'New Folder (4)' on your desktop containing files you will never open again.",
        "You have considered writing a book, but decided the summary would look better in your head."
    ]
    
    spirit_animals = ["A caffeinated Raccoon", "A highly dramatic Capybara", "An aesthetic Axolotl", "A sarcastic Sloth", "An Owl with insomnia", "A Red Panda doing threat displays"]
    superheroes = ["Iron Man (but in economy class)", "Deadpool's polite cousin", "Batman (if he had a normal budget)", "The Flash, but only when running towards food", "Doctor Strange (but just for sorting out cables)"]
    movie_characters = ["Sherlock Holmes (after 3 espressos)", "Jack Sparrow (in a software firm)", "Luna Lovegood", "Tony Stark (on a Sunday morning)", "Neo (but he took the wrong pill first)"]
    gamer_archetypes = ["The Theorycrafter", "The Stealth Sniper", "The Chaotic Healer", "The Loot Goblin", "The Speedrunner", "The Friendly Lurker"]
    quotes = [
        "Do not take life too seriously. You will never get out of it alive.",
        "If at first you don't succeed, skydiving is not for you.",
        "The road to success is dotted with many tempting parking spaces.",
        "My keyboard is my shield, my mouse is my sword, and my coffee is my lifeblood.",
        "I am not lazy, I am just in energy-saving mode."
    ]
    
    # Pick items
    selected_strengths = random.sample(strengths_pool, 3)
    selected_weaknesses = random.sample(weaknesses_pool, 3)
    selected_talents = random.sample(talents_pool, 2)
    selected_careers = random.sample(careers_pool, 3)
    selected_facts = random.sample(facts_pool, 2)
    
    result = {
        "username": username,
        "personality_type": arch["type"],
        "confidence_score": conf_score,
        "introvert_extrovert_meter": arch["intro_extro"],
        "creativity_score": creativity,
        "leadership_score": leadership,
        "social_energy_score": social_energy,
        "intelligence_indicator": arch["intel"],
        "humor_level": arch["humor"],
        "overview": f"The username '{username}' exudes a complex mix of {arch['intel'].lower()} energy and distinct digital charm. As '{arch['type']}', you possess a natural tendency to analyze setups and find creative loopholes that others completely miss. You thrive in environments that challenge your witty perspective, though your social battery operates on a strict premium-only schedule. A true modern mind tailored for the digital age.",
        "strengths": selected_strengths,
        "weaknesses": selected_weaknesses,
        "hidden_talents": selected_talents,
        "communication_style": f"Highly responsive with a dry, humorous undertone. You prefer clean visual structures, bullets, and emojis over walls of corporate jargon.",
        "learning_style": "High-velocity trial and error. You prefer breaking things first, then checking the instructions only if they catch fire.",
        "career_recommendations": selected_careers,
        "fun_facts": selected_facts,
        "insights": {
            "what_says_about_you": f"Choosing '{username}' reveals an intellectual rebel who enjoys playing with perceptions while retaining a core of highly capable professionalism.",
            "how_others_perceive_you": "People view you as quick-witted, slightly detached, but incredibly useful when a critical issue needs solving.",
            "future_success_areas": "You are destined to excel in roles requiring swift creative iteration or navigating chaotic technology systems.",
            "unique_traits": "A fascinating combo of rapid analytical processing and deep, stubborn loyalty to your preferred workflows."
        },
        "entertainment": {
            "spirit_animal": random.choice(spirit_animals),
            "superhero_match": random.choice(superheroes),
            "movie_character": random.choice(movie_characters),
            "gamer_archetype": random.choice(gamer_archetypes),
            "motivational_quote": random.choice(quotes)
        }
    }
    return result

# -------------------------------------------------------------
# Live Gemini AI Analyzer
# -------------------------------------------------------------
def generate_gemini_analysis(username):
    prompt = f"""
Analyze the username/handle '{username}' and generate an entertaining, humorous, yet surprisingly accurate and detailed personality profile.
You MUST respond with a raw JSON object ONLY. Do not wrap the JSON in ```json ... ``` blocks or add any introductory/concluding text. Ensure it is valid JSON.

Follow this exact JSON structure:
{{
  "username": "{username}",
  "personality_type": "Entertaining archetype name (e.g. The Sarcastic Strategist)",
  "confidence_score": 92, (integer 0-100)
  "introvert_extrovert_meter": 65, (integer 0-100, where 0 is pure introvert, 100 is pure extrovert)
  "creativity_score": 88, (integer 0-100)
  "leadership_score": 75, (integer 0-100)
  "social_energy_score": 50, (integer 0-100)
  "intelligence_indicator": "Descriptive phrase representing intelligence style (e.g. Chaos Genius)",
  "humor_level": 85, (integer 0-100)
  "overview": "A detailed, witty 3-4 sentence paragraph describing their online persona based on the handle elements, wordplay, and style.",
  "strengths": ["Strength 1", "Strength 2", "Strength 3"],
  "weaknesses": ["Weakness 1", "Weakness 2", "Weakness 3"],
  "hidden_talents": ["Talent 1", "Talent 2"],
  "communication_style": "Description of how they communicate (1 sentence)",
  "learning_style": "Description of how they learn (1 sentence)",
  "career_recommendations": ["Career 1", "Career 2", "Career 3"],
  "fun_facts": ["Fun fact 1", "Fun fact 2"],
  "insights": {{
    "what_says_about_you": "Analysis of what picking this username says about their sub-conscious (1 sentence)",
    "how_others_perceive_you": "How people online react to seeing this username (1 sentence)",
    "future_success_areas": "Funny prediction of where they'll succeed (1 sentence)",
    "unique_traits": "A weirdly specific trait they probably have (1 sentence)"
  }},
  "entertainment": {{
    "spirit_animal": "A funny animal match with an adjective (e.g. A caffeinated Raccoon)",
    "superhero_match": "Superhero equivalent",
    "movie_character": "Movie character equivalent",
    "gamer_archetype": "Gamer role (e.g. Stealth Sniper, Loot Goblin)",
    "motivational_quote": "A funny, slightly demotivational or witty motivational quote"
  }}
}}

Make the tone professional yet fun, filled with relatable internet humor, slightly roasting but ultimately positive. Keep it light-hearted!
"""
    try:
        model = genai.GenerativeModel(MODEL_NAME)
        # Using generation_config to guide Gemini into outputting JSON
        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        
        # Parse the JSON string
        result_text = response.text.strip()
        
        # Clean potential markdown wrappers if Gemini ignored instructions
        if result_text.startswith("```"):
            # strip backticks and optional 'json' tag
            result_text = re.sub(r'^```(?:json)?\s*', '', result_text)
            result_text = re.sub(r'\s*```$', '', result_text)
            
        data = json.loads(result_text)
        return data
    except Exception as e:
        print(f"Error calling Gemini API: {e}. Falling back to Mock Analyzer.")
        # Raise exception so we can capture it in endpoint and do the fallback there
        raise e

# -------------------------------------------------------------
# Flask API Routes
# -------------------------------------------------------------
@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/analyze', methods=['POST'])
def analyze():
    data = request.json or {}
    username = data.get('username', '').strip()
    
    if not username:
        return jsonify({"error": "Username is required!"}), 400
        
    # Limit length of username to prevent injection/spam
    if len(username) > 30:
        return jsonify({"error": "Username must be 30 characters or less."}), 400

    analysis_result = None
    used_mock = False
    
    if use_gemini:
        try:
            analysis_result = generate_gemini_analysis(username)
        except Exception:
            # Fallback to mock
            analysis_result = generate_mock_analysis(username)
            used_mock = True
    else:
        analysis_result = generate_mock_analysis(username)
        used_mock = True
        
    analysis_result["is_mock"] = used_mock
    
    # Save to SQLite Database
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        timestamp = datetime.now().isoformat()
        cursor.execute(
            'INSERT INTO analyses (username, timestamp, result_json) VALUES (?, ?, ?)',
            (username, timestamp, json.dumps(analysis_result))
        )
        conn.commit()
        
        # Retrieve the inserted row ID for frontend reference
        inserted_id = cursor.lastrowid
        analysis_result["id"] = inserted_id
        
        conn.close()
    except Exception as db_err:
        print(f"Database insertion error: {db_err}")
        # Even if DB save fails, we should still return the result to the user
        analysis_result["id"] = random.randint(1000, 9999)

    return jsonify(analysis_result)

@app.route('/api/history', methods=['GET'])
def get_history():
    search = request.args.get('search', '').strip()
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        if search:
            cursor.execute(
                'SELECT id, username, timestamp, result_json FROM analyses WHERE username LIKE ? ORDER BY id DESC LIMIT 50',
                ('%' + search + '%',)
            )
        else:
            cursor.execute(
                'SELECT id, username, timestamp, result_json FROM analyses ORDER BY id DESC LIMIT 50'
            )
        rows = cursor.fetchall()
        conn.close()
        
        history = []
        for row in rows:
            try:
                res_data = json.loads(row['result_json'])
                history.append({
                    "id": row['id'],
                    "username": row['username'],
                    "timestamp": row['timestamp'],
                    "personality_type": res_data.get("personality_type", "Unknown"),
                    "confidence_score": res_data.get("confidence_score", 0),
                    "result": res_data
                })
            except Exception:
                # In case JSON is corrupt
                history.append({
                    "id": row['id'],
                    "username": row['username'],
                    "timestamp": row['timestamp'],
                    "personality_type": "Corrupted Data",
                    "confidence_score": 0,
                    "result": {}
                })
        return jsonify(history)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/history/<int:item_id>', methods=['DELETE'])
def delete_history(item_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('DELETE FROM analyses WHERE id = ?', (item_id,))
        conn.commit()
        conn.close()
        return jsonify({"success": True, "message": "History item deleted."})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Run the server on port 5000
    app.run(host='0.0.0.0', port=5000, debug=True)
