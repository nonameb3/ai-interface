import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { Pinecone } from '@pinecone-database/pinecone';

dotenv.config({ path: '.env.local' });

interface RecoveredChunk {
  chunkIndex: number;
  content: string;
}

async function recoverDocument(source: string, fileName: string) {
  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
  const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);

  const queryResponse = await index.query({
    vector: new Array(1536).fill(0),
    topK: 10000,
    includeMetadata: true,
    filter: {
      source: { $eq: source },
      fileName: { $eq: fileName },
    },
  });

  const matches = queryResponse.matches || [];
  if (matches.length === 0) {
    console.error(`No chunks found for source="${source}" fileName="${fileName}"`);
    return;
  }

  const chunks: RecoveredChunk[] = matches.map(m => ({
    chunkIndex: Number(m.metadata?.chunkIndex ?? 0),
    content: String(m.metadata?.content ?? ''),
  }));

  chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);

  const fullText = chunks.map(c => c.content).join('\n\n');

  const outDir = './data/recovered';
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, fileName);
  fs.writeFileSync(outPath, fullText, 'utf-8');

  console.log(`Recovered ${chunks.length} chunks -> ${outPath} (${fullText.length} chars)`);
}

async function main() {
  const docs = [
    { source: 'portfolio-upload', fileName: 'waraphon_projects_portfolio.md' },
    { source: 'portfolio-upload', fileName: 'waraphon_resume.md' },
  ];

  for (const doc of docs) {
    await recoverDocument(doc.source, doc.fileName);
  }
}

main();
