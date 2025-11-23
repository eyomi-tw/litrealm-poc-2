from google.adk.agents import Agent

# Create a simple chat agent using Google ADK
root_agent = Agent(
    name="assistant",
    model="gemini-2.0-flash",
    description="A helpful AI assistant",
    instruction="""You are a helpful AI assistant. Respond to user questions in a clear, 
    concise, and friendly manner. You can help with a wide variety of topics including 
    answering questions, providing explanations, and having conversations."""
)