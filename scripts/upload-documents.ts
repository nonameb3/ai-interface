import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function uploadDocument(filePath: string, source: string) {
  try {
    console.log(`📤 Uploading ${path.basename(filePath)}...`);
    
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      return false;
    }
    
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    
    // Create FormData for upload
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { 
      type: fileName.endsWith('.pdf') ? 'application/pdf' : 'text/plain' 
    });
    formData.append('file', blob, fileName);
    formData.append('source', source);
    
    const response = await fetch('http://localhost:3000/api/documents', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Upload failed: ${response.status} ${errorText}`);
      return false;
    }
    
    const result = await response.json();
    console.log(`✅ Successfully uploaded ${fileName}`);
    console.log(`   📊 Chunks processed: ${result.chunksProcessed}`);
    console.log(`   🏷️  Source: ${result.source}`);
    
    return true;
  } catch (error) {
    console.error(`❌ Error uploading ${filePath}:`, error);
    return false;
  }
}

async function uploadMultipleDocuments(documents: { filePath: string; source: string }[]) {
  console.log(`🚀 Starting upload of ${documents.length} documents...\n`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (const doc of documents) {
    const success = await uploadDocument(doc.filePath, doc.source);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
    
    // Small delay between uploads
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log(''); // Add spacing
  }
  
  console.log('📋 Upload Summary:');
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📊 Total: ${documents.length}`);
  
  if (successCount > 0) {
    console.log('\n🎉 Documents uploaded successfully!');
    console.log('💡 You can now test your RAG system by asking questions about the uploaded content.');
  }
}

// Example usage - you can modify this list
async function main() {
  const documentsToUpload = [
    {
      filePath: './data/portfolio-info.txt',
      source: 'portfolio-info'
    },
    // Add more documents here:
    // {
    //   filePath: './data/resume.pdf',
    //   source: 'resume'
    // },
    // {
    //   filePath: './data/project-details.md',
    //   source: 'projects'
    // }
  ];
  
  await uploadMultipleDocuments(documentsToUpload);
}

// CLI usage
if (process.argv.length > 2) {
  const filePath = process.argv[2];
  const source = process.argv[3] || path.basename(filePath, path.extname(filePath));
  
  console.log('🔧 CLI Mode');
  uploadDocument(filePath, source);
} else {
  // Batch mode
  main();
}

export { uploadDocument, uploadMultipleDocuments };