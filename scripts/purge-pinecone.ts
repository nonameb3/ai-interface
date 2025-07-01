import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function purgeAllData() {
  try {
    console.log('🗑️  Starting Pinecone data purge...');
    
    if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX_NAME) {
      console.error('❌ Missing required environment variables:');
      console.error('   - PINECONE_API_KEY');
      console.error('   - PINECONE_INDEX_NAME');
      process.exit(1);
    }

    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
    
    const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);
    
    console.log(`📋 Index: ${process.env.PINECONE_INDEX_NAME}`);
    
    // Get current stats before deletion
    const stats = await index.describeIndexStats();
    const totalVectors = stats.totalRecordCount || 0;
    
    console.log(`📊 Current vectors in index: ${totalVectors}`);
    
    // Show namespace breakdown
    if (stats.namespaces) {
      console.log('📁 Namespaces found:');
      for (const [namespace, namespaceStats] of Object.entries(stats.namespaces)) {
        console.log(`   - "${namespace}": ${namespaceStats.recordCount} vectors`);
      }
    }
    
    if (totalVectors === 0) {
      console.log('✅ Index reports 0 vectors, but let me try to delete any remaining data...');
      
      // Try to delete from default namespace anyway
      try {
        await index.deleteAll();
        console.log('🔄 Attempted cleanup of default namespace');
      } catch (error) {
        console.log('ℹ️  No additional cleanup needed');
      }
      
      // Also try to delete from common namespaces that might exist
      const commonNamespaces = ['', 'default', 'portfolio', 'documents'];
      for (const ns of commonNamespaces) {
        try {
          await index.namespace(ns).deleteAll();
          console.log(`🔄 Attempted cleanup of "${ns}" namespace`);
        } catch (error) {
          // Ignore errors for non-existent namespaces
        }
      }
      
      console.log('✅ Cleanup complete! Check your Pinecone dashboard in a few minutes.');
      return;
    }
    
    // Confirm deletion (skip in CI/automated environments)
    if (!process.env.CI && !process.argv.includes('--force')) {
      console.log('\n⚠️  WARNING: This will permanently delete ALL data from your Pinecone index!');
      console.log('   This action cannot be undone.');
      console.log('\n   To proceed, run: pnpm run purge-pinecone -- --force');
      console.log('   Or add --force flag to skip this confirmation.');
      return;
    }
    
    console.log('🔥 Purging all vectors from Pinecone index...');
    
    // Delete all vectors from default namespace
    await index.deleteAll();
    console.log('🗑️ Deleted from default namespace');
    
    // If we found specific namespaces, delete from those too
    if (stats.namespaces) {
      for (const namespace of Object.keys(stats.namespaces)) {
        try {
          await index.namespace(namespace).deleteAll();
          console.log(`🗑️ Deleted from "${namespace}" namespace`);
        } catch (error) {
          console.log(`⚠️ Could not delete from "${namespace}" namespace:`, error);
        }
      }
    }
    
    // Also try common namespace patterns
    const commonNamespaces = ['', 'default', 'portfolio', 'documents', 'portfolio-info'];
    for (const ns of commonNamespaces) {
      try {
        await index.namespace(ns).deleteAll();
        console.log(`🗑️ Deleted from "${ns}" namespace`);
      } catch (error) {
        // Ignore - namespace might not exist
      }
    }
    
    console.log('⏳ Waiting for deletion to complete...');
    
    // Wait and verify deletion
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      
      const newStats = await index.describeIndexStats();
      const remainingVectors = newStats.totalRecordCount || 0;
      
      console.log(`   📊 Remaining vectors: ${remainingVectors}`);
      
      if (remainingVectors === 0) {
        console.log('✅ All data successfully purged from Pinecone!');
        console.log('\n💡 Next steps:');
        console.log('   1. Update data/portfolio-info.txt with your information');
        console.log('   2. Run: pnpm run upload');
        console.log('   3. Test your portfolio assistant with fresh data');
        return;
      }
      
      attempts++;
    }
    
    console.log('⚠️  Deletion may still be in progress. Check your Pinecone dashboard.');
    
  } catch (error) {
    console.error('❌ Error purging Pinecone data:', error);
    process.exit(1);
  }
}

// CLI usage
if (require.main === module) {
  purgeAllData();
}

export { purgeAllData };