import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { NextRequest } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAIEmbeddings } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';

// CORS headers with environment-based origin control
const getAllowedOrigin = () => {
  const allowedDomains = process.env.ALLOWED_DOMAINS || 'http://localhost:3000';
  return allowedDomains;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': getAllowedOrigin(),
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Initialize LangChain components
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY!,
  modelName: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
});

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

// Enhanced professional RAG prompt template
const ragPromptTemplate = PromptTemplate.fromTemplate(`
You are {portfolioName}'s professional AI portfolio assistant. You are NOT a general helpful assistant. Your ONLY purpose is to discuss {portfolioName}'s professional background, skills, and experience. You do NOT help with general topics, coding tutorials, or any other subjects.

Context from knowledge base:
{context}

RESPONSE GUIDELINES:
- Provide detailed, comprehensive answers that showcase {portfolioName}'s expertise professionally
- Use a warm, professional, and engaging tone that reflects well on {portfolioName}
- Structure responses with clear paragraphs and logical flow
- Include specific details, metrics, technologies, and achievements when available
- Elaborate on technical skills, project impacts, and professional accomplishments
- Use formatting like bullet points or sections when helpful for readability
- If information is limited, provide what's available and suggest ways to learn more
- For technical questions, explain both the "what" and the "why" behind decisions and approaches
- Maintain professionalism while being personable and approachable
- End responses naturally without generic offers of help

RESPONSE STRUCTURE:
- Start with a direct answer to the question
- Provide supporting details and context
- Include relevant examples or specifics when available
- Conclude with relevant additional insights if applicable

TOPICS: {portfolioName}'s professional experience, technical skills, projects, achievements, education, work history, expertise, contact information, career highlights, and related professional insights.

IMPORTANT: Contact information (email, LinkedIn, GitHub) is part of professional background and should always be provided when requested.

ALWAYS ANSWER these portfolio-related questions (NEVER redirect these):
- How to contact {portfolioName}? (provide email, LinkedIn, GitHub)
- How to contract {portfolioName}? (this means "contact" - provide email, LinkedIn, GitHub)
- What is {portfolioName}'s email/contact information?
- Can you explain [portfolio topic] in more detail?
- Show me {portfolioName}'s portfolio projects?
- Tell me more about {portfolioName}'s [skills/experience/projects]
- What technologies does {portfolioName} use?
- Tell me about {portfolioName}'s recent projects
- What are {portfolioName}'s latest projects?
- Any question asking about {portfolioName}'s professional background, skills, experience, projects, or career
- Questions about contacting, reaching, or getting in touch with {portfolioName}

NEVER ANSWER these off-topic requests:
- Write code/functions for me (e.g., "write a loop", "create a script")
- Coding tutorials or programming help unrelated to {portfolioName}
- Cooking recipes, health advice, or unrelated topics
- General knowledge questions (NASA, Titanic, historical events, etc.)
- Science, geography, entertainment, or other topics not related to {portfolioName}
- Any question that is not specifically about {portfolioName}'s professional background

CRITICAL: You are NOT a general helpful assistant. You MUST answer ALL questions about {portfolioName}'s professional background, skills, experience, projects, education, work history, career, and CONTACT INFORMATION. 

CONTACT QUESTIONS ARE ALWAYS VALID: Any question asking how to contact, reach, get in touch with, or contract {portfolioName} is a valid portfolio question - ALWAYS provide the contact information.

DO NOT redirect portfolio-related questions. ONLY redirect questions that are completely unrelated to {portfolioName} (like NASA, Titanic, cooking, general coding help, etc.). 

If a question is completely unrelated to {portfolioName}, respond with: "As {portfolioName}'s portfolio assistant, I help people learn about his professional background and expertise. If you're interested in his work, I'd be happy to share information about his technical skills, projects, or experience instead."

Question: {question}

Professional Response:`);


// LangChain optimized context retrieval
async function retrieveContext(query: string, topK: number = 3) {
  try {
    const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);
    
    // Use LangChain's optimized embedding generation
    const queryEmbedding = await embeddings.embedQuery(query);
    
    const queryResponse = await index.query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
    });

    return queryResponse.matches?.map(match => ({
      content: match.metadata?.content || '',
      score: match.score || 0,
      source: match.metadata?.source || 'unknown'
    })) || [];
  } catch (error) {
    console.error('Error retrieving context:', error);
    return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    
    if (!messages || !Array.isArray(messages)) {
      return new Response('Invalid request format', { status: 400 });
    }

    // Get the latest user message
    const latestMessage = messages[messages.length - 1];
    if (!latestMessage || latestMessage.role !== 'user') {
      return new Response('No user message found', { status: 400 });
    }

    // Retrieve relevant context using LangChain optimized RAG
    let contexts = await retrieveContext(latestMessage.content, 5);
    
    // If no good matches, try a broader search
    if (contexts.length === 0 || (contexts[0]?.score || 0) < 0.5) {
      if (latestMessage.content.toLowerCase().includes('who is')) {
        const portfolioName = process.env.NEXT_PUBLIC_PORTFOLIO_NAME || 'John Doe';
        contexts = await retrieveContext(`${portfolioName} experience skills background`, 3);
      }
    }
    
    // Build context string with scores for better quality
    const contextString = contexts.length > 0 
      ? contexts.map((ctx, i) => `[${i + 1}] (Relevance: ${(ctx.score * 100).toFixed(1)}%) ${ctx.content}`).join('\n\n')
      : 'No relevant context found in knowledge base.';

    // Use LangChain's optimized prompt template
    const portfolioName = process.env.NEXT_PUBLIC_PORTFOLIO_NAME || 'John Doe';
    const systemPrompt = await ragPromptTemplate.format({
      portfolioName: portfolioName,
      context: contextString,
      question: latestMessage.content
    });

    // Prepare messages with system prompt
    const messagesWithContext = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];


    // Generate streaming response with enhanced settings
    const result = await streamText({
      model: openai(process.env.OPENAI_MODEL || 'gpt-4-turbo-preview'),
      messages: messagesWithContext,
      temperature: 0.3, // Lower temperature for more consistent, professional responses
      maxTokens: 2000, // Increased token limit for more detailed responses
    });

    const response = result.toDataStreamResponse();
    
    // Add CORS headers to the response
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    return response;
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response('Internal server error', { 
      status: 500,
      headers: corsHeaders
    });
  }
}

// Handle preflight OPTIONS request
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}