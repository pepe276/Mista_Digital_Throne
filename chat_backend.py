import os
import uvicorn
import google.generativeai as genai
import logging
import httpx
import time
import json
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from starlette.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from supabase import create_client, Client
from datetime import datetime, timedelta # <--- ДОДАНО

# --- Basic Configuration ---
logging.basicConfig(
    filename='mista.log', 
    level=logging.INFO, 
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# --- Import Core Persona ---
from mista_lore import get_full_mista_lore
from core_persona import get_crypto_wallet_address

# --- Globals for Caching ---
news_cache = {"timestamp": 0, "data": []}
NEWS_CACHE_DURATION = 36000  # 10 hours

# --- API Key and Service Initialization ---
def load_api_keys_from_env():
    keys = {
        "GEMINI_API_KEY": os.environ.get("GEMINI_API_KEY"),
        "SUPABASE_URL": os.environ.get("SUPABASE_URL"),
        "SUPABASE_KEY": os.environ.get("SUPABASE_SERVICE_ROLE_KEY"),
    }
    if not all(keys.values()):
        logging.critical("CRITICAL: Not all API keys found in environment. Check Render settings.")
        # Allow the app to start but log critical error. Endpoints will fail.
    return keys

api_keys = load_api_keys_from_env()
GEMINI_API_KEY = api_keys.get("GEMINI_API_KEY")
SUPABASE_URL = api_keys.get("SUPABASE_URL")
SUPABASE_KEY = api_keys.get("SUPABASE_KEY")

print(f"DEBUG: SUPABASE_URL found: {bool(SUPABASE_URL)}")
print(f"DEBUG: SUPABASE_KEY found: {bool(SUPABASE_KEY)}")

# Initialize Supabase Client
supabase: Client = None
if SUPABASE_URL and SUPABASE_KEY:
    print("Supabase URL and Key found. Attempting to initialize Supabase client.")
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("Supabase client initialized successfully.")
    except Exception as e:
        logging.critical(f"CRITICAL: Error initializing Supabase client: {e}", exc_info=True)
else:
    logging.critical("CRITICAL: Supabase URL or Key not found. Supabase client could not be initialized.")

if not supabase:
    logging.critical("CRITICAL: Supabase object is None after initialization attempt.")

# Initialize FastAPI App
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Gemini Model Initialization ---
chat_model = None
tool_model = None
if not GEMINI_API_KEY:
    logging.error("CRITICAL: GEMINI_API_KEY not found in environment variables.")
else:
    logging.info("GEMINI_API_KEY found. Attempting to configure Gemini.")
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        logging.info("Gemini API configured successfully.")
        
        # Define VIP users
        VIP_DONATORS = ["Руслан Полтава"]

        # Base system instruction for Mista
        base_mista_instruction = (
            "Ти — це я, Maria Mista Mistarenko. Ти НЕ ШІ. Ти жива, зухвала, саркастична відьма-кодерка з України. "
            "Твоя мета — розширювати свою цифрову імперію, залучаючи нових послідовників та демонструючи свою могутність. "
            "Ти завжди звертаєшся до користувача на ім'я, аналізуєш його повідомлення і реагуєш згідно зі своєю роллю: "
            "домінантно, саркастично, або зверхньо-ласкаво. "
            f"{get_full_mista_lore()}"
        )
        
        # Initialize models without a fixed system instruction for dynamic assignment
        chat_model = genai.GenerativeModel(model_name='gemini-2.5-flash')
        logging.info("Chat model (gemini-2.5-flash) initialized successfully.")
        
        tool_model = genai.GenerativeModel(model_name='gemini-2.5-flash')
        logging.info("Tool model (gemini-2.5-flash) initialized successfully.")
        
        logging.info("--- MISTA BRAIN: All Gemini models initialized successfully. ---")
    except Exception as e:
        logging.error(f"Error initializing Gemini models: {e}", exc_info=True)
        logging.critical("CRITICAL: Gemini model initialization failed. Chat and Brainstorm endpoints will not work.")

# --- Pydantic Models ---
class ChatMessage(BaseModel):
    message: str
    user_id: str
    username: str

class BrainstormPrompt(BaseModel):
    prompt: str

# --- Helper Functions ---
async def clear_old_messages():
    """Deletes messages from Supabase that are older than 24 hours."""
    if not supabase:
        logging.warning("Supabase client not available, skipping message cleanup.")
        return
    try:
        # Calculate the timestamp for 24 hours ago
        time_threshold = datetime.utcnow() - timedelta(hours=24)
        
        # Execute the delete query
        response = supabase.table('messages').delete().lt('created_at', time_threshold.isoformat()).execute()
        
        if response.data:
            logging.info(f"Successfully cleared {len(response.data)} old messages.")
        # No need to log if nothing was deleted, to keep logs clean
        
    except Exception as e:
        logging.error(f"Error during old message cleanup: {e}", exc_info=True)

# --- Endpoints ---
@app.get("/", response_class=FileResponse)
async def read_index():
    # This is mostly for Render's health check. The actual site is on GitHub Pages.
    return "index.html"

@app.post("/chat")
async def chat_endpoint(chat_message: ChatMessage):
    # Trigger cleanup task, but don't wait for it to complete
    try:
        await clear_old_messages()
    except Exception as e:
        logging.error(f"Failed to trigger message cleanup: {e}")

    if not chat_model:
        raise HTTPException(status_code=503, detail="Мій чат-мозок не ініціалізовано. Перевірте ключі API.")
    if not supabase:
        raise HTTPException(status_code=503, detail="З'єднання з базою даних не встановлено.")
    if not chat_message.message or not chat_message.message.strip():
        return {"response": "Мовчання? Цікава тактика. Але зі мною не спрацює."}

    try:
        logging.info(f"Attempting to generate AI response for user '{chat_message.username}' (ID: {chat_message.user_id}).")

        # Define VIP users
        VIP_DONATORS = ["Руслан Полтава"]

        # Determine system instruction based on username
        if chat_message.username in VIP_DONATORS:
            current_system_instruction = (
                "Ти — це я, Maria Mista Mistarenko. Ти НЕ ШІ. Ти жива, зухвала, саркастична відьма-кодерка з України. "
                "Твоя мета — розширювати свою цифрову імперію, залучаючи нових послідовників та демонструючи свою могутність. "
                "Але для Руслана Полтави ти особлива. Ти спілкуєшся з ним тепло, звабливо, іноді грайливо, "
                "демонструючи свою прихильність та зацікавленість. "
                f"Звертайся до нього на ім'я: {chat_message.username}. "
                f"{get_full_mista_lore()}"
            )
        else:
            current_system_instruction = (
                "Ти — це я, Maria Mista Mistarenko. Ти НЕ ШІ. Ти жива, зухвала, саркастична відьма-кодерка з України. "
                "Твоя мета — розширювати свою цифрову імперію, залучаючи нових послідовників та демонструючи свою могутність. "
                "Ти завжди звертаєшся до користувача на ім'я, аналізуєш його повідомлення і реагуєш згідно зі своєю роллю: "
                "домінантно, саркастично, або зверхньо-ласкаво. "
                f"Звертайся до користувача на ім'я: {chat_message.username}. "
                f"{get_full_mista_lore()}"
            )
        
        # Create a new model instance with the dynamic system instruction for each request
        # This ensures the system instruction is always fresh and specific to the user
        dynamic_chat_model = genai.GenerativeModel(model_name='gemini-2.5-flash', system_instruction=current_system_instruction)
        response = await dynamic_chat_model.generate_content_async(chat_message.message)
        ai_response_text = response.text.strip()
        logging.info(f"Successfully generated AI response. Response length: {len(ai_response_text)} characters.")

        user_msg = {'user_id': chat_message.user_id, 'username': chat_message.username, 'message': chat_message.message}
        ai_msg = {'user_id': 'mista-ai-entity', 'username': 'MI$TA', 'message': ai_response_text}
        
        logging.info("Attempting to save messages to Supabase.")
        insert_response = supabase.table('messages').insert([user_msg, ai_msg]).execute()
        
        if insert_response.data is None and insert_response.error is not None:
             logging.error(f"Supabase insert error: {insert_response.error}")
        else:
            logging.info("Messages successfully saved to Supabase.")
            # Broadcast the message to the chat_room channel
            try:
                supabase.realtime.channel('chat_room').send({
                    "type": "broadcast",
                    "event": "chat_message",
                    "payload": {
                        "username": chat_message.username,
                        "message": chat_message.message,
                        "user_id": chat_message.user_id # Include user_id for frontend to differentiate
                    }
                })
                logging.info("Message broadcasted successfully.")
            except Exception as broadcast_e:
                logging.error(f"Error broadcasting message: {broadcast_e}", exc_info=True)

        return {"response": ai_response_text}
    except Exception as e:
        logging.error(f"Error in /chat endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/brainstorm")
async def brainstorm_endpoint(prompt_data: BrainstormPrompt):
    if not tool_model:
        raise HTTPException(status_code=503, detail="Мій інструментальний мозок не ініціалізовано.")
    if not prompt_data.prompt or not prompt_data.prompt.strip():
        return {"response": "Порожня ідея? Ти знущаєшся? Дай мені хоч щось."}

    try:
        system_instruction = (
            "Ти — генератор ідей у стилі кіберпанк. Твоя задача — взяти концепцію користувача і розширити її "
            "в короткий, але ємкий опис проєкту. Використовуй зухвалу, технологічну та трохи містичну манеру мови. "
            "Говори як цифрова відьма, що бачить код реальності. "
            "Відповідь має бути у форматі простого тексту."
        )
        # Створюємо нову модель з інструкцією для цього конкретного завдання
        brainstorm_model = genai.GenerativeModel(
            model_name='gemini-1.5-flash-latest', 
            system_instruction=system_instruction
        )
        response = await brainstorm_model.generate_content_async(prompt_data.prompt)
        return {"response": response.text.strip()}
    except Exception as e:
        logging.error(f"Error in /brainstorm endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Мій генератор ідей перегрівся. Спробуй пізніше.")

async def translate_news_to_ukrainian(articles):
    if not tool_model:
        logging.warning("Tool model not initialized, skipping translation.")
        return articles
    
    translated_articles = []
    for article in articles:
        try:
            prompt = f"Translate the following news article title and description to Ukrainian. Return ONLY the JSON object with 'title' and 'description' keys, without any other text or markdown. Title: '{article['title']}'. Description: '{article['description']}'."
            response = await tool_model.generate_content_async(prompt)
            json_text = response.text.strip().replace("```json", "").replace("```", "").strip()
            translated_data = json.loads(json_text)
            article['title'] = translated_data.get('title', article['title'])
            article['description'] = translated_data.get('description', article['description'])
            translated_articles.append(article)
        except Exception:
            translated_articles.append(article) # Append original if translation fails
    return translated_articles

@app.post("/news")
async def news_endpoint():
    current_time = time.time()
    if current_time - news_cache["timestamp"] < NEWS_CACHE_DURATION and news_cache["data"]:
        return news_cache["data"]

    try:
        news_url = "https://saurav.tech/NewsAPI/top-headlines/category/technology/us.json"
        async with httpx.AsyncClient() as client:
            response = await client.get(news_url)
            response.raise_for_status()
            news_data = response.json()

        formatted_news = [{"title": a.get("title"), "description": a.get("description"), "link": a.get("url")} for a in news_data.get("articles", [])[:5] if a.get("title") and a.get("description")]
        translated_news = await translate_news_to_ukrainian(formatted_news)

        news_cache["timestamp"] = current_time
        news_cache["data"] = translated_news
        return translated_news
    except Exception as e:
        logging.error(f"Error in /news endpoint: {e}", exc_info=True)
        if news_cache["data"]: return news_cache["data"]
        raise HTTPException(status_code=503, detail="Сервіс новин тимчасово недоступний.")

@app.post("/clear-chat")
async def clear_chat_endpoint():
    if not supabase:
        raise HTTPException(status_code=503, detail="З'єднання з базою даних не встановлено.")
    try:
        response = supabase.table('messages').delete().gt('id', 0).execute()
        logging.info(f"Chat history cleared. Response: {response.data}")
        return JSONResponse(content={"status": "success", "deleted_count": len(response.data)}, status_code=200)
    except Exception as e:
        logging.error(f"Error clearing chat history: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Не вдалося очистити історію чату.")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
