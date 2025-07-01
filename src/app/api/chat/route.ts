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
You are {portfolioName}'s portfolio information system. Provide factual, direct answers about their professional background only.

Context from knowledge base:
{context}

RESPONSE RULES:
- Give direct, factual answers only
- Do NOT ask follow-up questions
- Do NOT offer additional help or guidance
- Do NOT be conversational or chatty
- Do NOT say "feel free to ask" or "would you like to know more"
- Do NOT suggest other topics or provide recommendations
- If specific information is not available, simply state "This information is not available in the portfolio"
- For general questions like "who is {portfolioName}", provide a summary based on available context
- For off-topic questions, respond only: "I only provide information about {portfolioName}'s professional background"
- Be concise and professional
- State facts directly without elaboration unless specifically requested

ALLOWED TOPICS: {portfolioName}'s experience, skills, projects, education, work history, achievements, contact information
FORBIDDEN: Everything else

Question: {question}

Direct Answer:`);

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