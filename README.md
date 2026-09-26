# 💸 FinanceAI Manager

A modern, full-stack personal finance and wealth management platform powered by PostgreSQL, Express, React, and an AI-driven multimodal Telegram bot. Track expenses seamlessly via web, receipt photos, or voice notes, and discover your financial behavioral personality with Financial DNA analytics.

---

## 🌟 Key Features

### 1. 🤖 Multimodal Telegram Bot Integration
- **Text Expense Logging:** Add expenses naturally via standard Telegram text messages (e.g., `2500 Zara` or `50 coffee`).
- **Receipt OCR:** Snap and upload receipt photos—Google Gemini Flash automatically extracts the vendor, line items, total amount, and category.
- **Voice Note Parsing:** Send a quick voice memo—Groq Whisper transcribes speech into text in milliseconds, and Gemini categorizes and saves it directly to your database.
- **Brand & Merchant Awareness:** Intelligent category mapping correctly routes retail and fashion brands (like Zara, H&M, Nike) to `Shopping` instead of generic dining categories.

### 2. 🧬 Financial DNA & Spending Persona Engine
- **Behavioral Archetypes:** Identifies your spending personality based on transaction history (e.g., *The Weekend Splurger*, *Fortress Saver*, *Balanced Strategist*).
- **5-Pillar Health Score:** Analyzes Savings Rate, Budget Discipline, Consistency, Discretionary Control, and Impulse Resistance.
- **Actionable Insights:** Algorithmic recommendations that target your biggest spending leaks and set custom cooling-off limits.

### 3. 📊 Visual Dashboard & Flow Tracking
- **Cash Flow Visualization:** Interactive Sankey charts and category breakdowns.
- **Budget Tracking:** Real-time progress bars for category caps with visual overrun warnings.
- **Financial Goals:** Milestone prediction and savings targets.

### 4. 🔐 Security & Auth
- Secure JWT authentication with hashed credentials (`bcryptjs`).
- Show/Hide interactive password visibility toggles.
- **Telegram OTP Password Reset:** One-click zero-cost reset code delivered directly to your linked Telegram account.

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 18 (Vite)
- **Styling:** Tailwind CSS, Framer Motion
- **Icons & Visuals:** Lucide React, Recharts
- **Notifications:** React Hot Toast

### Backend
- **Runtime:** Node.js (ES Modules) & Express.js
- **Database:** PostgreSQL (`pg` connection pool)
- **Bot Engine:** `node-telegram-bot-api`
- **AI & Speech Models:**
  - Google Gemini Flash (`@google/genai`)
  - Groq Cloud Whisper Large v3 (`groq-sdk`)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL installed and running locally
- Telegram Bot Token (from [@BotFather](https://t.me/botfather))
- Free API Keys:
  - [Google AI Studio](https://aistudio.google.com/) (Gemini API)
  - [Groq Cloud](https://console.groq.com/) (Whisper API)

---

### Installation & Setup

#### 1. Clone the repository
```bash
git clone [https://github.com/sanghavivraj/finance-ai-manager.git](https://github.com/sanghavivraj/finance-ai-manager.git)
cd finance-ai-manager
