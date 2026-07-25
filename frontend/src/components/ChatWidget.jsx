import { useEffect, useRef, useState } from "react";
import { sendChatMessage } from "../api/chatApi.js";

// The list of clickable suggestion chips shown in the chat panel.
// Clicking any of these sends it immediately, just like typing it in.
const SUGGESTED_QUESTIONS = [
  "Suggest healthy high-protein meals.",
  "Give me a 7-day diet tip.",
  "How can I improve my workout recovery?",
  "What should I eat before a workout?",
  "What should I eat after a workout?",
  "How can I build muscle faster?",
  "Tips to lose body fat effectively.",
  "How important is sleep for fitness?",
  "Common mistakes beginners make in the gym.",
  "How can I stay consistent with my fitness journey?",
  "Best foods for energy throughout the day.",
  "How can I improve my strength naturally?",
  "Explain progressive overload.",
  "How do I avoid workout injuries?",
  "Healthy snack ideas.",
  "Vegetarian protein sources.",
  "Foods to avoid during a fat-loss phase.",
  "How can I increase my daily water intake?",
  "What should I do on rest days?",
  "Give me motivation to stay consistent.",
];

const WELCOME_MESSAGE = {
  id: "welcome",
  sender: "bot",
  text:
    "Hey! I'm your FitMacros Fitness Coach 🤖 - ask me anything about " +
    "nutrition, workouts, recovery, sleep, or motivation. If you've " +
    "already calculated your plan, I can also break down your personal " +
    "numbers. What would you like to know?",
  timestamp: new Date(),
};

/** Escapes HTML special characters so nothing typed can inject markup. */
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Converts the bot's plain-text reply (which uses **bold** and line
 * breaks) into safe HTML. Text is escaped first, so this never allows
 * injected markup - only our own **bold** syntax is turned into tags.
 */
function formatBotText(text) {
  const escaped = escapeHtml(text);
  const bolded = escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  return bolded.replace(/\n/g, "<br/>");
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChatWidget({ context }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to the newest message whenever the conversation changes.
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping, isOpen]);

  async function handleSend(text) {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: trimmed,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    try {
      const { reply } = await sendChatMessage(trimmed, context);
      setMessages((prev) => [
        ...prev,
        { id: `bot-${Date.now()}`, sender: "bot", text: reply, timestamp: new Date() },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-error-${Date.now()}`,
          sender: "bot",
          text: err.message || "Something went wrong. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  }

  function handleInputKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend(inputValue);
    }
  }

  function handleClearChat() {
    setMessages([WELCOME_MESSAGE]);
  }

  return (
    <>
      {/* Floating toggle button */}
      <button
        type="button"
        className="chat-fab"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? "Close fitness coach chat" : "Open fitness coach chat"}
        aria-expanded={isOpen}
      >
        {isOpen ? "✕" : "🤖"}
      </button>

      {isOpen && (
        <div className="chat-panel" role="dialog" aria-label="FitMacros Fitness Coach chat">
          {/* Header */}
          <div className="chat-panel__header">
            <div className="chat-panel__header-info">
              <span className="chat-panel__avatar" aria-hidden="true">🤖</span>
              <div>
                <p className="chat-panel__title">FitMacros Fitness Coach</p>
                <p className="chat-panel__subtitle">Always here to help</p>
              </div>
            </div>
            <button
              type="button"
              className="chat-panel__clear"
              onClick={handleClearChat}
              title="Clear chat"
            >
              Clear Chat
            </button>
          </div>

          {/* Messages */}
          <div className="chat-panel__messages">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`chat-message chat-message--${message.sender}`}
              >
                {message.sender === "bot" ? (
                  <div
                    className="chat-message__bubble"
                    dangerouslySetInnerHTML={{ __html: formatBotText(message.text) }}
                  />
                ) : (
                  <div className="chat-message__bubble">{message.text}</div>
                )}
                <span className="chat-message__time">{formatTime(message.timestamp)}</span>
              </div>
            ))}

            {isTyping && (
              <div className="chat-message chat-message--bot">
                <div className="chat-message__bubble chat-message__bubble--typing">
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggestion chips */}
          <div className="chat-panel__suggestions">
            {SUGGESTED_QUESTIONS.map((question) => (
              <button
                type="button"
                key={question}
                className="chat-chip"
                onClick={() => handleSend(question)}
                disabled={isTyping}
              >
                {question}
              </button>
            ))}
          </div>

          {/* Input row */}
          <div className="chat-panel__input-row">
            <input
              type="text"
              className="chat-panel__input"
              placeholder="Ask your fitness coach..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleInputKeyDown}
              aria-label="Type a message"
            />
            <button
              type="button"
              className="chat-panel__send"
              onClick={() => handleSend(inputValue)}
              disabled={isTyping || !inputValue.trim()}
              aria-label="Send message"
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}
