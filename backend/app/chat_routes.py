"""
chat_routes.py
--------------
Defines the single chatbot endpoint: POST /chat.

Kept in its own file, separate from routes.py (nutrition + workout), so
the chatbot feature stays cleanly isolated from the existing calculator
logic - nothing here touches or depends on the /calculate endpoint.
"""

from fastapi import APIRouter

from app.schemas import ChatRequest, ChatResponse
from chatbot.chatbot_service import handle_message

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest) -> ChatResponse:
    """
    Takes a user's chat message (and optionally their already-calculated
    nutrition/workout context) and returns a rule-based reply from the
    Fitness Coach knowledge base. No AI APIs are used - everything is
    plain Python logic and a JSON knowledge base under chatbot/.
    """
    result = handle_message(request.message, request.context)
    return ChatResponse(reply=result["reply"], topic=result["topic"])
