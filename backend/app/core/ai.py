import google.generativeai as genai
import os
import json
from app.core.config import settings

# Configure Gemini
# In production, use os.getenv("GEMINI_API_KEY")
# For this demo, we might need a key. 
# I will use a placeholder or check if settings has it.
# Assuming settings.GEMINI_API_KEY exists or we use os.environ directly.

if os.getenv("GEMINI_API_KEY"):
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Define Tools
tools_schema = [
    {
        "name": "create_task",
        "description": "Create a new task for the home.",
        "parameters": {
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "Title of the task"},
                "priority": {"type": "string", "enum": ["low", "medium", "high"], "description": "Priority of the task"},
                "points": {"type": "integer", "description": "Points awarded for completion (default 10)"}
            },
            "required": ["title"]
        }
    },
    {
        "name": "create_expense",
        "description": "Add a new shared expense.",
        "parameters": {
            "type": "object",
            "properties": {
                "description": {"type": "string", "description": "What was purchased"},
                "amount": {"type": "number", "description": "Cost of the item"},
                "category": {"type": "string", "description": "Category (Food, Rent, Utility, etc.)"}
            },
            "required": ["description", "amount"]
        }
    }
]

async def get_homie_response(message: str, history: list = []):
    if not os.getenv("GEMINI_API_KEY"):
        return {
            "text": "I need a GEMINI_API_KEY to think! (Check .env)",
            "tool_calls": []
        }

    try:
        model = genai.GenerativeModel('gemini-pro')
        # Simple prompt construction as chat session management is complex in stateless
        # For now, just one-shot with context or minimal history
        
        prompt = f"""
        You are Homie, a fun, helpful AI house manager for a shared home.
        You speak in a cool, friendly, slightly cartoonsy way.
        
        User says: {message}
        
        If the user wants to create a task or expense, output JSON with "tool" and "args".
        Otherwise, just reply with "text".
        
        Example Task: {{"tool": "create_task", "args": {{"title": "Buy Milk", "priority": "medium"}}}}
        Example text: {{"text": "Sure thing! I'll remind you."}}
        
        Only output JSON.
        """
        
        response = model.generate_content(prompt)
        text = response.text
        
        # Parse JSON
        try:
            # clean code fences if any
            clean_text = text.replace("```json", "").replace("```", "").strip()
            data = json.loads(clean_text)
            
            if "tool" in data:
                return {"text": f"On it! Creating {data.get('tool')}...", "tool_calls": [data]}
            return {"text": data.get("text", text), "tool_calls": []}
            
        except:
             return {"text": text, "tool_calls": []}

    except Exception as e:
        return {"text": f"Ouch, my brain hurts: {str(e)}", "tool_calls": []}
