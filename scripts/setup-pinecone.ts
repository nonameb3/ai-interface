import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function setupPinecone() {
  try {
    console.log('🚀 Setting up Pinecone index...');
    
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });

    const indexName = process.env.PINECONE_INDEX_NAME!;
    
    // Check if index already exists
    const existingIndexes = await pinecone.listIndexes();
    const indexExists = existingIndexes.indexes?.some(index => index.name === indexName);
    
    if (indexExists) {
      console.log(`✅ Index "${indexName}" already exists`);
      return;
    }

    // Create new index
    console.log(`📝 Creating index "${indexName}"...`);
    
    await pinecone.createIndex({
      name: indexName,
      dimension: 1536, // text-embedding-3-small dimension
      metric: 'cosine',
      spec: {
        serverless: {
          cloud: 'aws',
          region: 'us-east-1'
        }
      }
    });

    console.log('⏳ Waiting for index to be ready...');
    
    // Wait for index to be ready
    let isReady = false;
    while (!isReady) {
      const indexDescription = await pinecone.describeIndex(indexName);
      isReady = indexDescription.status?.ready === true;
      
      if (!isReady) {
        console.log('⏳ Index still initializing...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(`✅ Index "${indexName}" created successfully!`);
    console.log('🎉 Pinecone setup complete!');
    
  } catch (error) {
    console.error('❌ Error setting up Pinecone:', error);
    process.exit(1);
  }
}

setupPinecone();