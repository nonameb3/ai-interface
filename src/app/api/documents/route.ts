import { NextRequest, NextResponse } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings } from '@langchain/openai';

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

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
  separators: ['\n\n', '\n', ' ', ''],
});

// Content type detection and categorization
function detectContentType(fileName: string, content: string): {
  contentType: string;
  category: string;
  importance: string;
  tags: string[];
} {
  const fileNameLower = fileName.toLowerCase();
  const contentLower = content.toLowerCase();
  
  // Detect content type
  let contentType = 'general';
  if (fileNameLower.includes('skill') || contentLower.includes('technical skill') || contentLower.includes('programming')) {
    contentType = 'skill';
  } else if (fileNameLower.includes('project') || contentLower.includes('project') || contentLower.includes('built') || contentLower.includes('developed')) {
    contentType = 'project';
  } else if (fileNameLower.includes('experience') || fileNameLower.includes('work') || contentLower.includes('experience') || contentLower.includes('employed')) {
    contentType = 'experience';
  } else if (fileNameLower.includes('contact') || contentLower.includes('email') || contentLower.includes('linkedin')) {
    contentType = 'contact';
  } else if (fileNameLower.includes('education') || contentLower.includes('education') || contentLower.includes('degree') || contentLower.includes('university')) {
    contentType = 'education';
  }
  
  // Detect category
  let category = 'general';
  if (contentLower.includes('blockchain') || contentLower.includes('solidity') || contentLower.includes('ethereum') || contentLower.includes('smart contract')) {
    category = 'blockchain';
  } else if (contentLower.includes('react') || contentLower.includes('nextjs') || contentLower.includes('frontend') || contentLower.includes('ui')) {
    category = 'frontend';
  } else if (contentLower.includes('nodejs') || contentLower.includes('nestjs') || contentLower.includes('backend') || contentLower.includes('api')) {
    category = 'backend';
  } else if (contentLower.includes('ai') || contentLower.includes('llm') || contentLower.includes('machine learning') || contentLower.includes('langchain')) {
    category = 'ai';
  } else if (contentLower.includes('database') || contentLower.includes('postgresql') || contentLower.includes('mongodb')) {
    category = 'database';
  } else if (contentLower.includes('devops') || contentLower.includes('docker') || contentLower.includes('aws') || contentLower.includes('kafka')) {
    category = 'devops';
  }
  
  // Determine importance
  let importance = 'medium';
  if (contentLower.includes('senior') || contentLower.includes('lead') || contentLower.includes('expert') || contentLower.includes('primary')) {
    importance = 'high';
  } else if (contentLower.includes('basic') || contentLower.includes('familiar') || contentLower.includes('learning')) {
    importance = 'low';
  }
  
  // Extract tags
  const tags: string[] = [];
  const techKeywords = [
    'typescript', 'solidity', 'react', 'nextjs', 'nodejs', 'nestjs', 'postgresql', 'mongodb',
    'ethereum', 'blockchain', 'smart contracts', 'web3', 'ipfs', 'docker', 'aws', 'kafka',
    'claude', 'chatgpt', 'langchain', 'pinecone', 'hardhat', 'truffle', 'zokrates'
  ];
  
  techKeywords.forEach(keyword => {
    if (contentLower.includes(keyword)) {
      tags.push(keyword);
    }
  });
  
  return { contentType, category, importance, tags };
}

// POST - Upload and process document
export async function POST(req: NextRequest) {
  try {
    console.log('📤 Processing document upload...');
    
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const source = formData.get('source') as string || 'uploaded-document';

    if (!file) {
      console.error('❌ No file provided');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log(`📄 Processing file: ${file.name} (${file.type})`);

    let text = '';
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Extract text based on file type
    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      return NextResponse.json({ 
        error: 'PDF files are not supported. Please convert your PDF to .txt format:\n\n1. Open your PDF\n2. Select All (Ctrl+A / Cmd+A)\n3. Copy (Ctrl+C / Cmd+C)\n4. Paste into a text editor\n5. Save as .txt file\n6. Upload the .txt file instead\n\nAlternatively, use online PDF to text converters.' 
      }, { status: 400 });
    } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      text = fileBuffer.toString('utf-8');
    } else if (file.name.endsWith('.md')) {
      text = fileBuffer.toString('utf-8');
    } else {
      return NextResponse.json({ error: 'Unsupported file type. Supported: PDF, TXT, MD' }, { status: 400 });
    }

    if (!text.trim()) {
      console.error('❌ No text content found');
      return NextResponse.json({ error: 'No text content found in file' }, { status: 400 });
    }

    console.log(`📝 Extracted text: ${text.length} characters`);

    // Use LangChain's optimized text splitter
    const documents = await textSplitter.createDocuments([text], [{ 
      source, 
      fileName: file.name,
      fileType: file.type,
      uploadedAt: new Date().toISOString()
    }]);
    
    console.log(`✂️ Created ${documents.length} optimized chunks with LangChain`);

    // Initialize Pinecone inside the function
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
    
    const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);

    // Generate embeddings using LangChain (with built-in optimizations)
    console.log('🧠 Generating embeddings with LangChain...');
    const texts = documents.map(doc => doc.pageContent);
    const embeddingVectors = await embeddings.embedDocuments(texts);

    // Prepare vectors for Pinecone with enhanced metadata
    const vectors = documents.map((doc, i) => {
      // Detect content type and categorization for each chunk
      const classification = detectContentType(file.name, doc.pageContent);
      
      return {
        id: `${source}-${file.name}-chunk-${i}`, // Deterministic ID based on source + filename + chunk
        values: embeddingVectors[i],
        metadata: {
          // Original metadata
          content: doc.pageContent,
          source: doc.metadata.source,
          fileName: doc.metadata.fileName,
          fileType: doc.metadata.fileType,
          chunkIndex: i,
          uploadedAt: doc.metadata.uploadedAt,
          
          // Enhanced metadata for better organization
          contentType: classification.contentType, // skill, project, experience, contact, education
          category: classification.category,       // blockchain, frontend, backend, ai, database, devops
          importance: classification.importance,   // high, medium, low
          tags: classification.tags,              // array of technical keywords
          
          // Additional search helpers
          searchText: doc.pageContent.toLowerCase().substring(0, 500), // First 500 chars for search
          wordCount: doc.pageContent.split(' ').length,
        }
      };
    });

    console.log(`🔄 Processed ${vectors.length} vectors with optimized embeddings and enhanced metadata`);
    
    // Log classification summary
    const classificationSummary = vectors.reduce((acc, vector) => {
      const metadata = vector.metadata;
      acc.contentTypes[metadata.contentType] = (acc.contentTypes[metadata.contentType] || 0) + 1;
      acc.categories[metadata.category] = (acc.categories[metadata.category] || 0) + 1;
      return acc;
    }, { contentTypes: {} as Record<string, number>, categories: {} as Record<string, number> });
    
    console.log(`📊 Content Classification:`, classificationSummary);

    console.log(`📤 Uploading ${vectors.length} vectors to Pinecone...`);
    console.log(`📋 Using deterministic IDs - will UPDATE existing vectors if same file is uploaded again`);

    // Upload vectors to Pinecone (upsert = insert or update)
    await index.upsert(vectors);

    console.log('✅ Upload successful!');

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${file.name} using LangChain optimizations`,
      chunksProcessed: documents.length,
      fileName: file.name,
      source: source,
      optimization: 'LangChain RecursiveCharacterTextSplitter + OpenAI Embeddings'
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('❌ Document processing error:', error);
    return NextResponse.json(
      { error: `Failed to process document: ${error}` },
      { status: 500, headers: corsHeaders }
    );
  }
}

// GET - List documents (get unique sources from Pinecone)
export async function GET() {
  try {
    // Initialize Pinecone for GET request
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
    const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);
    
    // Query with empty vector to get metadata (this is a workaround)
    // In production, you might want to maintain a separate index of documents
    const queryResponse = await index.query({
      vector: new Array(1536).fill(0), // Empty vector
      topK: 1000, // Get many results to find unique sources
      includeMetadata: true,
    });

    // Extract unique sources with enhanced metadata
    const documents = new Map();
    const documentStats = new Map(); // Track stats per document
    
    queryResponse.matches?.forEach(match => {
      const metadata = match.metadata;
      if (metadata?.source && metadata?.fileName) {
        const key = `${metadata.source}-${metadata.fileName}`;
        
        if (!documents.has(key)) {
          documents.set(key, {
            source: metadata.source,
            fileName: metadata.fileName,
            fileType: metadata.fileType,
            uploadedAt: metadata.uploadedAt,
            contentType: metadata.contentType || 'general',
            category: metadata.category || 'general',
            importance: metadata.importance || 'medium',
            tags: [],
            chunkCount: 0,
            totalWords: 0,
          });
          documentStats.set(key, { tags: new Set(), chunkCount: 0, totalWords: 0 });
        }
        
        // Aggregate stats
        const stats = documentStats.get(key)!;
        const doc = documents.get(key)!;
        
        stats.chunkCount++;
        if (metadata.tags && Array.isArray(metadata.tags)) {
          metadata.tags.forEach((tag: string) => stats.tags.add(tag));
        }
        if (metadata.wordCount) {
          stats.totalWords += metadata.wordCount;
        }
        
        // Update document with aggregated data
        doc.chunkCount = stats.chunkCount;
        doc.totalWords = stats.totalWords;
        doc.tags = Array.from(stats.tags);
      }
    });

    return NextResponse.json({
      documents: Array.from(documents.values())
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Handle preflight OPTIONS request
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}

// DELETE - Remove document by source or delete all documents
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const source = searchParams.get('source');
    const fileName = searchParams.get('fileName');
    const deleteAll = searchParams.get('deleteAll') === 'true';

    // Initialize Pinecone for DELETE request
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
    const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);

    if (deleteAll) {
      // Delete all documents from the index
      await index.deleteAll();
      
      return NextResponse.json({
        success: true,
        message: 'All documents deleted successfully',
        action: 'deleteAll'
      });
    }

    // Single document deletion (existing logic)
    if (!source || !fileName) {
      return NextResponse.json(
        { error: 'Source and fileName parameters required for single document deletion' },
        { status: 400 }
      );
    }

    // Query vectors with matching source and fileName
    const queryResponse = await index.query({
      vector: new Array(1536).fill(0),
      topK: 10000,
      includeMetadata: true,
      filter: {
        source: { $eq: source },
        fileName: { $eq: fileName }
      }
    });

    if (!queryResponse.matches || queryResponse.matches.length === 0) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Delete vectors
    const idsToDelete = queryResponse.matches.map(match => match.id!);
    await index.deleteMany(idsToDelete);

    return NextResponse.json({
      success: true,
      message: `Deleted ${idsToDelete.length} chunks from ${fileName}`,
      deletedChunks: idsToDelete.length
    });

  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}