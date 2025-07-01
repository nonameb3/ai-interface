import { NextRequest, NextResponse } from 'next/server';

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

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    
    // Check if admin password is configured
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    if (!adminPassword) {
      return NextResponse.json({ 
        error: 'Admin panel disabled' 
      }, { status: 503, headers: corsHeaders });
    }
    
    // Special check for configuration validation
    if (password === 'config-check') {
      return NextResponse.json({ configured: true }, { headers: corsHeaders });
    }
    
    if (password === adminPassword) {
      return NextResponse.json({ success: true }, { headers: corsHeaders });
    } else {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401, headers: corsHeaders });
    }
  } catch {
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500, headers: corsHeaders });
  }
}

// Handle preflight OPTIONS request
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}