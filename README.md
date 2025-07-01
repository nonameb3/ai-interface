# AI Portfolio Assistant

A Next.js application that provides an AI-powered portfolio assistant using RAG (Retrieval-Augmented Generation) with Pinecone vector database.

## Features

- **Environment-based Configuration**: Uses environment variables for easy deployment
- **Admin Panel**: Simple CMS for managing portfolio documents
- **Markdown Support**: Properly formatted AI responses
- **RAG System**: Vector-based knowledge retrieval with LangChain optimization

## Environment Variables

```bash
# Required
OPENAI_API_KEY=your_openai_api_key
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=portfolio-knowledge

# Optional (with defaults)
NEXT_PUBLIC_PORTFOLIO_NAME=John Doe  # Name displayed in UI and used by AI
ADMIN_PASSWORD=admin123  # Password for admin panel access
OPENAI_MODEL=gpt-4o-mini
EMBEDDING_MODEL=text-embedding-3-small
```

## Quick Start

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your API keys
   ```

3. **Create Pinecone index:**
   ```bash
   pnpm run setup-pinecone
   ```

4. **Upload portfolio data:**
   ```bash
   # Edit data/portfolio-info.txt with your information
   pnpm run upload
   ```

5. **Start development server:**
   ```bash
   pnpm dev
   ```

## Admin Panel

Access the admin panel at `/admin` using the password set in `ADMIN_PASSWORD`.

**Security:** If `ADMIN_PASSWORD` is not set, the admin panel will be completely disabled for security.

Features:
- Upload new documents (.txt, .md files)
- Delete all documents
- View current document count
- Password-protected access
- Auto-disabled if no password is configured

## Deployment

### For Production:

1. **Set environment variables** in your hosting platform:
   ```bash
   NEXT_PUBLIC_PORTFOLIO_NAME=Your Real Name
   ADMIN_PASSWORD=your_secure_password
   # ... other API keys
   ```

2. **Update portfolio data** in `data/portfolio-info.txt` with your real information

3. **Deploy** and **upload your data** via the admin panel

The system will automatically use your environment variables for personalization.

## File Structure

```
src/
├── app/
│   ├── admin/          # Admin CMS page
│   ├── api/
│   │   ├── chat/       # AI chat endpoint
│   │   ├── documents/  # Document management
│   │   └── portfolio-name/ # Dynamic name API
│   └── page.tsx        # Main chat interface
data/
└── portfolio-info.txt  # Portfolio content (edit this)
scripts/
├── setup-pinecone.ts  # Initialize vector database
├── upload-documents.ts # Upload portfolio data
└── purge-pinecone.ts  # Clear all data
```

## Commands

- `pnpm dev` - Development server
- `pnpm build` - Production build
- `pnpm run setup-pinecone` - Create Pinecone index
- `pnpm run upload` - Upload portfolio documents
- `pnpm run purge-pinecone -- --force` - Delete all vector data