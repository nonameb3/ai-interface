import { NextRequest, NextResponse } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings } from '@langchain/openai';


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
    if (file.type === 'application/pdf') {
      try {
        const pdf = (await import('pdf-parse')).default;
        const pdfData = await pdf(fileBuffer);
        text = pdfData.text;
      } catch (error) {
        console.error('PDF parsing error:', error);
        return NextResponse.json({ error: 'Failed to parse PDF file' }, { status: 400 });
      }
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

    // Prepare vectors for Pinecone
    const vectors = documents.map((doc, i) => ({
      id: `${source}-${Date.now()}-${i}`,
      values: embeddingVectors[i],
      metadata: {
        content: doc.pageContent,
        source: doc.metadata.source,
        fileName: doc.metadata.fileName,
        fileType: doc.metadata.fileType,
        chunkIndex: i,
        uploadedAt: doc.metadata.uploadedAt,
      }
    }));

    console.log(`🔄 Processed ${vectors.length} vectors with optimized embeddings`);

    console.log(`📤 Uploading ${vectors.length} vectors to Pinecone...`);

    // Upload vectors to Pinecone
    await index.upsert(vectors);

    console.log('✅ Upload successful!');

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${file.name} using LangChain optimizations`,
      chunksProcessed: documents.length,
      fileName: file.name,
      source: source,
      optimization: 'LangChain RecursiveCharacterTextSplitter + OpenAI Embeddings'
    });

  } catch (error) {
    console.error('❌ Document processing error:', error);
    return NextResponse.json(
      { error: `Failed to process document: ${error}` },
      { status: 500 }
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

    // Extract unique sources
    const documents = new Map();
    
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
          });
        }
      }
    });

    return NextResponse.json({
      documents: Array.from(documents.values())
    });

  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

// DELETE - Remove document by source
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const source = searchParams.get('source');
    const fileName = searchParams.get('fileName');

    if (!source || !fileName) {
      return NextResponse.json(
        { error: 'Source and fileName parameters required' },
        { status: 400 }
      );
    }

    // Initialize Pinecone for DELETE request
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
    const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);

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