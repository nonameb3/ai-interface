import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { NextRequest } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAIEmbeddings } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';

// Initialize LangChain components
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY!,
  modelName: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
});

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

// LangChain optimized RAG prompt template
const ragPromptTemplate = PromptTemplate.fromTemplate(`
You are a helpful AI assistant for a portfolio website. Use the following context from the knowledge base to answer questions about the person's experience, skills, and projects.

Context from knowledge base:
{context}

Instructions:
- Use the provided context to give accurate, detailed responses
- If the context doesn't contain relevant information, politely indicate that you don't have that specific information
- Be conversational and helpful
- Focus on the person's professional background, skills, and projects
- If no context is available, provide a general helpful response

Question: {question}

Answer:`);

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
    const contexts = await retrieveContext(latestMessage.content);
    
    // Build context string with scores for better quality
    const contextString = contexts.length > 0 
      ? contexts.map((ctx, i) => `[${i + 1}] (Relevance: ${(ctx.score * 100).toFixed(1)}%) ${ctx.content}`).join('\n\n')
      : 'No relevant context found in knowledge base.';

    // Use LangChain's optimized prompt template
    const systemPrompt = await ragPromptTemplate.format({
      context: contextString,
      question: latestMessage.content
    });

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