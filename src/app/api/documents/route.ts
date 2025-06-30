import { NextRequest, NextResponse } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';


// Generate embeddings
async function generateEmbedding(text: string) {
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

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Embedding API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  
  if (!data.data || !data.data[0] || !data.data[0].embedding) {
    throw new Error('Invalid embedding response structure');
  }

  return data.data[0].embedding;
}

// Simple text chunking
function chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
  const chunks = [];
  let start = 0;
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    
    // Move to next chunk position
    start = start + chunkSize - overlap;
    
    // If the next chunk would be entirely overlap, stop
    if (start >= text.length) break;
  }
  
  return chunks;
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

    // Split text into chunks
    const chunks = chunkText(text);
    console.log(`✂️ Created ${chunks.length} chunks`);

    // Initialize Pinecone inside the function
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
    
    const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);

    // Process chunks
    const vectors = [];
    for (let i = 0; i < chunks.length; i++) {
      console.log(`🔄 Processing chunk ${i + 1}/${chunks.length}`);
      
      const embedding = await generateEmbedding(chunks[i]);
      
      vectors.push({
        id: `${source}-${Date.now()}-${i}`,
        values: embedding,
        metadata: {
          content: chunks[i],
          source: source,
          fileName: file.name,
          fileType: file.type,
          chunkIndex: i,
          uploadedAt: new Date().toISOString(),
        }
      });
      
      // Small delay to avoid rate limiting
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`📤 Uploading ${vectors.length} vectors to Pinecone...`);

    // Upload vectors to Pinecone
    await index.upsert(vectors);

    console.log('✅ Upload successful!');

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${file.name}`,
      chunksProcessed: chunks.length,
      fileName: file.name,
      source: source
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