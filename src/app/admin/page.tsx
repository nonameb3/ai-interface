"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [documents, setDocuments] = useState<Array<{source: string; fileName: string; fileType?: string; uploadedAt?: string}>>([]);
  const [loading, setLoading] = useState(false);
  const portfolioName = process.env.NEXT_PUBLIC_PORTFOLIO_NAME || "John Doe";

  useEffect(() => {
    // Check if already authenticated
    const auth = sessionStorage.getItem('adminAuth');
    if (auth === 'true') {
      setIsAuthenticated(true);
      loadDocuments();
    }
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
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('source', 'portfolio-upload');

      const response = await fetch('/api/documents', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        await loadDocuments();
        alert('File uploaded successfully!');
      } else {
        alert('Upload failed');
      }
    } catch (error) {
      alert('Upload error: ' + error);
    } finally {
      setLoading(false);
    }
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
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <input
                  type="file"
                  accept=".txt,.pdf,.md"
                  onChange={handleUpload}
                  className="w-full"
                  disabled={loading}
                />
                <p className="text-sm text-gray-500 mt-2">
                  Supported: .txt, .pdf, .md files
                </p>
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