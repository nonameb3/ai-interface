import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { NextRequest } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';

// Initialize Pinecone
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

// Get the index
const getIndex = async () => {
  try {
    return pinecone.index(process.env.PINECONE_INDEX_NAME!);
  } catch (error) {
    console.error('Error getting Pinecone index:', error);
    throw error;
  }
};

// Generate embeddings for query
async function generateEmbedding(text: string) {
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
        input: text,
      }),
    });

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

// Retrieve relevant context from Pinecone
async function retrieveContext(query: string, topK: number = 3) {
  try {
    const index = await getIndex();
    const embedding = await generateEmbedding(query);
    
    const queryResponse = await index.query({
      vector: embedding,
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

    // Retrieve relevant context using RAG
    const contexts = await retrieveContext(latestMessage.content);
    
    // Build context string
    const contextString = contexts.length > 0 
      ? contexts.map(ctx => `Source: ${ctx.source}\nContent: ${ctx.content}`).join('\n\n')
      : 'No relevant context found in knowledge base.';

    // Create system prompt with context
    const systemPrompt = `You are a helpful AI assistant for a portfolio website. Use the following context from the knowledge base to answer questions about the person's experience, skills, and projects.

Context from knowledge base:
${contextString}

Instructions:
- Use the provided context to give accurate, detailed responses
- If the context doesn't contain relevant information, politely indicate that you don't have that specific information
- Be conversational and helpful
- Focus on the person's professional background, skills, and projects
- If no context is available, provide a general helpful response

Answer the user's question based on the context above.`;

    // Prepare messages with system prompt
    const messagesWithContext = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    // Generate streaming response
    const result = await streamText({
      model: openai(process.env.OPENAI_MODEL || 'gpt-4-turbo-preview'),
      messages: messagesWithContext,
      temperature: 0.7,
      maxTokens: 1000,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}