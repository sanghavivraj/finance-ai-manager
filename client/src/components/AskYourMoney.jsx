import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api.js';
import { MessageSquare, Send, X, Sparkles, Bot, User, ArrowRight, Loader2 } from 'lucide-react';

const SUGGESTED_PROMPTS = [
  "Where did I spend the most this month?",
  "How much safe-to-spend buffer do I have left?",
  "Are my savings goals on track?",
  "How does my spending compare to last month?",
];

export default function AskYourMoney({ isOpen, onClose }) {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: "Hello! I'm your FinanceAI Copilot. Ask me anything about your spending, budget health, or savings goals!",
    },
  ]);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e, customQuery = null) => {
    if (e) e.preventDefault();
    const q = customQuery || question;
    if (!q || !q.trim() || loading) return;

    const userMessage = { sender: 'user', text: q };
    setMessages(prev => [...prev, userMessage]);
    setQuestion('');
    setLoading(true);

    try {
      const response = await api.post('/ask-your-money', { question: q });
      const answer = response.data?.answer || "I reviewed your records. Your budget status is healthy.";
      setMessages(prev => [...prev, { sender: 'bot', text: answer }]);
    } catch (err) {
      console.error('Error asking your money:', err);
      setMessages(prev => [
        ...prev,
        { sender: 'bot', text: "Sorry, I couldn't process that query right now. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="glass-card w-full max-w-xl max-h-[85vh] flex flex-col rounded-3xl shadow-2xl border border-slate-200 overflow-hidden bg-white/95"
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-primary-50 to-accent-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-600 flex items-center justify-center text-white shadow-md">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-800">Ask Your Money</h3>
                <p className="text-xs text-slate-500">Instant AI Financial Intelligence</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
            >
              <X size={20} />
            </button>
          </div>

          {/* Chat / Messages Area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 max-h-[50vh]">
            {messages.map((m, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'bot' && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 text-white flex items-center justify-center shrink-0 shadow-sm text-xs font-bold">
                    AI
                  </div>
                )}
                <div
                  className={`p-4 rounded-2xl max-w-[80%] text-sm leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-gradient-to-r from-primary-600 to-accent-600 text-white shadow-md'
                      : 'bg-slate-100/90 text-slate-800 border border-slate-200/60'
                  }`}
                >
                  {m.text}
                </div>
                {m.sender === 'user' && (
                  <div className="w-8 h-8 rounded-xl bg-slate-800 text-white flex items-center justify-center shrink-0 shadow-sm text-xs font-bold">
                    <User size={14} />
                  </div>
                )}
              </motion.div>
            ))}

            {loading && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 text-white flex items-center justify-center shrink-0 shadow-sm text-xs font-bold">
                  AI
                </div>
                <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 text-sm flex items-center gap-2 text-slate-600">
                  <Loader2 size={16} className="animate-spin text-primary-600" />
                  <span>Analyzing financial context...</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Prompts */}
          <div className="p-3 border-t border-slate-100 bg-slate-50/50">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">
              Suggested questions:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSubmit(null, prompt)}
                  disabled={loading}
                  className="text-xs bg-white hover:bg-primary-50 text-slate-700 hover:text-primary-700 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-primary-300 transition shadow-sm text-left flex items-center gap-1.5"
                >
                  <span>{prompt}</span>
                  <ArrowRight size={11} className="text-slate-400" />
                </button>
              ))}
            </div>
          </div>

          {/* Input Form */}
          <div className="p-4 border-t border-slate-200 bg-white">
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Ask about spending, budgets, savings..."
                value={question}
                onChange={e => setQuestion(e.target.value)}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-slate-100/80 border border-slate-200 rounded-2xl text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:bg-white transition"
                autoFocus
              />
              <button
                type="submit"
                disabled={loading || !question.trim()}
                className="p-3 rounded-2xl bg-gradient-to-r from-primary-600 to-accent-600 text-white font-medium hover:shadow-lg disabled:opacity-50 transition"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}