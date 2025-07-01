"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [documents, setDocuments] = useState<Array<{source: string; fileName: string; fileType?: string; uploadedAt?: string}>>([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string[]>([]);
  const [adminDisabled, setAdminDisabled] = useState(false);
  const portfolioName = process.env.NEXT_PUBLIC_PORTFOLIO_NAME || "John Doe";

  useEffect(() => {
    // Check if admin is properly configured
    const checkAdminConfig = async () => {
      try {
        const response = await fetch('/api/admin/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: 'config-check' })
        });
        
        const data = await response.json();
        
        // If we get a specific error about admin being disabled, disable the page
        if (response.status === 503 || data.error === 'Admin panel disabled') {
          setAdminDisabled(true);
        }
      } catch (error) {
        console.error('Admin config check failed:', error);
        setAdminDisabled(true);
      }
      
      // Always clear authentication on page load for security
      sessionStorage.removeItem('adminAuth');
      setIsLoading(false);
    };
    
    checkAdminConfig();
  }, []);

  const handleLogin = async () => {
    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      
      if (response.ok) {
        setIsAuthenticated(true);
        sessionStorage.setItem('adminAuth', 'true');
        setError("");
        loadDocuments();
      } else {
        setError("Invalid password");
      }
    } catch {
      setError("Authentication failed");
    }
  };

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const docsResponse = await fetch('/api/documents');
      
      if (docsResponse.ok) {
        const docsData = await docsResponse.json();
        setDocuments(docsData.documents || []);
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setLoading(true);
    setUploadProgress([]);
    
    const filesArray = Array.from(files);
    const totalFiles = filesArray.length;
    let successCount = 0;
    const failedFiles: string[] = [];

    for (let i = 0; i < filesArray.length; i++) {
      const file = filesArray[i];
      
      try {
        setUploadProgress(prev => [...prev, `Uploading ${file.name}...`]);
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('source', 'portfolio-upload');

        const response = await fetch('/api/documents', {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          successCount++;
          setUploadProgress(prev => prev.map(p => 
            p.includes(file.name) ? `✅ ${file.name} - Success` : p
          ));
        } else {
          const errorData = await response.json();
          failedFiles.push(`${file.name}: ${errorData.error || 'Unknown error'}`);
          setUploadProgress(prev => prev.map(p => 
            p.includes(file.name) ? `❌ ${file.name} - Failed` : p
          ));
        }
      } catch (error) {
        failedFiles.push(`${file.name}: ${error}`);
        setUploadProgress(prev => prev.map(p => 
          p.includes(file.name) ? `❌ ${file.name} - Error` : p
        ));
      }
    }

    // Show results
    let message = `Upload completed!\n✅ Successful: ${successCount}/${totalFiles}`;
    if (failedFiles.length > 0) {
      message += `\n❌ Failed:\n${failedFiles.join('\n')}`;
    }
    alert(message);

    await loadDocuments();
    setLoading(false);
    
    // Clear the input
    event.target.value = '';
    
    // Clear progress after a delay
    setTimeout(() => setUploadProgress([]), 3000);
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete ALL documents?')) return;

    try {
      setLoading(true);
      const response = await fetch('/api/documents?deleteAll=true', {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadDocuments();
        alert('All documents deleted successfully!');
      } else {
        alert('Delete failed');
      }
    } catch (error) {
      alert('Delete error: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('adminAuth');
    setPassword("");
  };

  // Show loading state first
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  // Show disabled state if admin is not configured
  if (adminDisabled) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
          <div className="text-red-500 text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold mb-4 text-gray-800">Admin Panel Disabled</h1>
          <p className="text-gray-600 mb-4">
            The admin panel is disabled because no admin password is configured.
          </p>
          <div className="bg-gray-50 p-4 rounded-lg text-left">
            <p className="text-sm text-gray-700 font-medium mb-2">To enable admin access:</p>
            <code className="text-xs text-blue-600 bg-white p-2 rounded border block">
              ADMIN_PASSWORD=your_secure_password
            </code>
            <p className="text-xs text-gray-500 mt-2">
              Add this to your .env.local file or environment variables
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h1 className="text-2xl font-bold mb-6 text-center">Admin Access</h1>
          <div className="space-y-4">
            <Input
              type="password"
              placeholder="Enter admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button onClick={handleLogin} className="w-full">
              Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Portfolio Admin - {portfolioName}</h1>
            <Button onClick={logout} variant="outline">Logout</Button>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Upload Section */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Upload Documents</h2>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <div className="space-y-4">
                  <div className="text-gray-400">
                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div>
                    <Button 
                      onClick={() => document.getElementById('file-upload')?.click()}
                      disabled={loading}
                    >
                      {loading ? 'Uploading...' : 'Choose Files to Upload'}
                    </Button>
                    <input
                      id="file-upload"
                      type="file"
                      accept=".txt,.md"
                      onChange={handleUpload}
                      className="hidden"
                      disabled={loading}
                      multiple
                    />
                  </div>
                  <p className="text-sm text-gray-500">
                    Supported: .txt, .md files (multiple files allowed)
                  </p>
                  <p className="text-xs text-orange-600 mt-1">
                    📄 For PDFs: Convert to .txt first using online converters
                  </p>
                  
                  {/* Upload Progress */}
                  {uploadProgress.length > 0 && (
                    <div className="mt-4 space-y-1">
                      <h3 className="text-sm font-medium text-gray-700">Upload Progress:</h3>
                      <div className="bg-gray-50 rounded p-3 max-h-32 overflow-y-auto">
                        {uploadProgress.map((progress, index) => (
                          <div key={index} className="text-xs text-gray-600">
                            {progress}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions Section */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Actions</h2>
              <div className="space-y-3">
                <Button 
                  onClick={loadDocuments} 
                  className="w-full"
                  disabled={loading}
                >
                  Refresh Documents
                </Button>
                <Button 
                  onClick={handleDelete} 
                  variant="destructive" 
                  className="w-full"
                  disabled={loading}
                >
                  Delete All Documents
                </Button>
              </div>
            </div>
          </div>

          {/* Documents List */}
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Current Documents</h2>
            {loading ? (
              <p>Loading...</p>
            ) : documents.length > 0 ? (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">
                  Total vectors: {documents.length}
                </p>
              </div>
            ) : (
              <p className="text-gray-500">No documents uploaded</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}