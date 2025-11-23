# Agent Scaffold

A simple chat application built with Next.js 15 and Google Agent Development Kit (ADK).

## Features

- **Next.js 15** frontend with TypeScript and Tailwind CSS
- **Google ADK** backend for AI chat functionality
- **Model agnostic** - supports Gemini, OpenAI, Anthropic, and more
- **Real-time chat** interface with message history
- **Simple and clean** UI design

## Prerequisites

- Node.js 18+ 
- Python 3.9+
- Google AI Studio API key ([Get one here](https://makersuite.google.com/app/apikey))

## Setup Instructions

### 1. Clone and Navigate
```bash
git clone https://github.com/msakbar/agent_scaffold.git
cd agent_scaffold
```

### 2. Backend Setup (Python + Google ADK)
```bash
cd backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
# Edit .env and add your Google API key:
# The .env file already exists with a placeholder key - replace it with your actual key
# GOOGLE_API_KEY=your_actual_api_key_here
```

### 3. Frontend Setup (Next.js 15)
```bash
cd ../frontend

# Install dependencies
npm install
```

## Running the Application

You need to run three services in separate terminals:

### Terminal 1 - Backend API Server
```bash
cd backend
source .venv/bin/activate  # Activate virtual environment
python main.py
```
Backend API will run on: http://localhost:8000

### Terminal 2 - Frontend Application
```bash
cd frontend
npm run dev
```
Frontend will run on: http://localhost:3000

### Terminal 3 - ADK Web Interface (Optional)
```bash
cd backend
source .venv/bin/activate  # Activate virtual environment
adk web . --port 8002 --session_service_uri sqlite:///adk_sessions.db
```
ADK Web Interface will run on: http://localhost:8002

### Access the Application
- **Main Chat Interface**: http://localhost:3000
- **Backend API**: http://localhost:8000 
- **ADK Development UI**: http://localhost:8002 (optional, for debugging sessions)

## Project Structure

```
agent_scaffold/
├── frontend/          # Next.js 15 application
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx           # Main chat page
│   │   │   └── api/chat/route.ts  # API proxy to backend
│   │   └── components/
│   │       └── Chat.tsx           # Chat interface component
│   ├── package.json
│   └── next.config.ts
├── backend/           # Python + Google ADK
│   ├── main.py        # FastAPI server
│   ├── agent.py       # ADK agent configuration
│   ├── assistant/     # Assistant agent configuration
│   │   └── agent.py   # Agent implementation
│   ├── requirements.txt
│   ├── .env           # Environment variables
│   └── adk_sessions.db # SQLite database
└── README.md
```

## Configuration

### Backend Environment Variables (.env)
```
GOOGLE_API_KEY=your_api_key_here
GOOGLE_GENAI_USE_VERTEXAI=FALSE
PORT=8000
HOST=localhost
```

### Switching AI Models
To use different AI models, edit `backend/agent.py`:

```python
# For Gemini (default)
model="gemini-2.0-flash"

# For OpenAI (requires LiteLLM setup)
model="gpt-4o"

# For Anthropic (requires LiteLLM setup)  
model="claude-3-sonnet"
```

## API Endpoints

- `GET /` - Health check
- `POST /chat` - Send chat message (provided by Google ADK)
- `GET /health` - Application health status

## Development

- Backend uses FastAPI with Google ADK integration
- Frontend uses Next.js 15 with TypeScript and Tailwind CSS
- Chat interface handles real-time messaging with loading states
- CORS configured for local development

## Next Steps

- Add streaming responses for real-time message updates
- Implement message persistence
- Add file upload capabilities
- Configure multi-agent workflows
- Deploy to production (Cloud Run, Vercel, etc.)

## Troubleshooting

1. **Backend not starting**: Ensure Python virtual environment is activated and Google API key is set
2. **Frontend can't connect**: Check that backend is running on port 8000
3. **API key issues**: Verify your Google AI Studio API key is valid and properly set in .env
