"use client";

import { useState, useEffect, useRef } from "react";
import { MessageCircle, Brain, Settings, Github, ArrowDown } from "lucide-react";
import { useChat } from "@ai-sdk/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SuggestionBadge } from "@/components/ui/suggestion-badge";

export default function PortfolioAssistant() {
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [clickedBadges, setClickedBadges] = useState<Set<number>>(new Set());
  const portfolioName = process.env.NEXT_PUBLIC_PORTFOLIO_NAME || "John Doe";
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Smart suggestion questions
  const initialSuggestions = [
    `What are ${portfolioName}'s key technical skills?`,
    `Tell me about recent ${portfolioName}'s projects`,
    `What's ${portfolioName}'s professional background?`,
    `Show me their development experience`
  ];

  const chatSuggestions = [
    `Show me ${portfolioName}'s portfolio projects?`,
    "What technologies were used?",
    `How to contract ${portfolioName}?`
  ];

  const { messages, input, handleInputChange, handleSubmit, append, status, error } = useChat({
    api: "/api/chat",
    onError: (error) => {
      console.error("Chat error:", error);
      // Force status to ready if there's an error to prevent stuck state
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom);
    }
  };

  // Handle visibility changes to prevent UI issues when switching tabs
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Page is visible again, force re-render to fix blank screen issue
        setTimeout(() => {
          if (chatContainerRef.current) {
            chatContainerRef.current.style.display = 'none';
            void chatContainerRef.current.offsetHeight; // Force reflow
            chatContainerRef.current.style.display = '';
          }
        }, 50);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Reset clicked badges when conversation starts fresh
  useEffect(() => {
    if (messages.length === 0) {
      setClickedBadges(new Set());
    }
  }, [messages.length]);


  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      // Find the parent form and submit it
      const form = e.currentTarget.closest("form");
      if (form) {
        form.requestSubmit();
      }
    }
  };

  const handleSuggestionClick = (question: string, badgeIndex?: number) => {
    // Use the append method to directly send the message without user input
    append({
      role: 'user',
      content: question,
    });

    // Mark this specific badge as clicked (only for chat suggestions)
    if (typeof badgeIndex === 'number' && messages.length > 0) {
      setClickedBadges(prev => new Set([...prev, badgeIndex]));
    }
  };

  return (
    <div className="h-screen bg-white flex flex-col relative">
      {/* Header */}
      <div className="flex items-center justify-between p-4 px-8 bg-white z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-lg font-medium text-gray-900">AI-powered Portfolio</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">{portfolioName}</span>
          <a 
            href="https://github.com/nonameb3" 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors cursor-pointer"
          >
            <Github className="w-4 h-4 text-black" />
          </a>
        </div>
      </div>

      {messages.length === 0 ? (
        /* Landing Page */
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-normal text-gray-900">How can I help you today?</h2>
          </div>

          {/* Compact Input Box */}
          <div className="w-full max-w-2xl">
            <form onSubmit={handleSubmit} className="flex items-center gap-3 bg-white rounded-full px-4 py-2.5 border border-gray-200 shadow-sm">
              <Button variant="ghost" size="sm" className="text-xs text-gray-600 px-3 py-1 h-auto" type="button">
                <Settings className="w-3 h-3 mr-1" />
                Tools
              </Button>
              <Input
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={`Ask about ${portfolioName}'s experience, projects, or skills...`}
                className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm text-gray-900 placeholder:text-gray-500"
                disabled={status !== "ready"}
              />
            </form>
            
            {/* Suggestion Badges - Hidden on mobile */}
            <div className="hidden md:flex flex-wrap gap-2 justify-center mt-4">
              {initialSuggestions.map((suggestion, index) => (
                <SuggestionBadge
                  key={index}
                  question={suggestion}
                  onQuestionClick={handleSuggestionClick}
                  variant="default"
                  size="sm"
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Chat Messages */}
          <div ref={chatContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 pb-32">
            <div className="max-w-3xl mx-auto space-y-8 py-8">
              {messages.map((message) => (
                <div key={message.id}>
                  {message.role === "user" ? (
                    <div className="flex justify-end">
                      <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-2xl max-w-xs">
                        <p className="text-sm">{message.content}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="text-gray-900 max-w-2xl">
                        <div className="text-sm leading-relaxed markdown-content">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeHighlight]}
                            components={{
                              strong: ({children}) => <strong className="font-semibold text-gray-900">{children}</strong>,
                              code: ({children}) => <code className="bg-gray-100 text-blue-600 px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
                              pre: ({children}) => <pre className="bg-gray-100 p-3 rounded-lg text-xs overflow-x-auto my-2">{children}</pre>,
                              p: ({children}) => <p className="mb-2 text-gray-900">{children}</p>,
                              ul: ({children}) => <ul className="list-disc ml-4 mb-2 text-gray-900">{children}</ul>,
                              ol: ({children}) => <ol className="list-decimal ml-4 mb-2 text-gray-900">{children}</ol>,
                              li: ({children}) => <li className="mb-1">{children}</li>,
                              h1: ({children}) => <h1 className="text-lg font-semibold mb-2 text-gray-900">{children}</h1>,
                              h2: ({children}) => <h2 className="text-base font-semibold mb-2 text-gray-900">{children}</h2>,
                              h3: ({children}) => <h3 className="text-sm font-semibold mb-1 text-gray-900">{children}</h3>,
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                          {/* Show typing cursor for the last streaming message */}
                          {status !== "ready" && status !== "submitted" && messages.indexOf(message) === messages.length - 1 && (
                            <span className="inline-block w-0.5 h-4 bg-blue-500 ml-1 animate-pulse"></span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="p-1.5 h-auto">
                          <MessageCircle className="w-3.5 h-3.5 text-gray-500" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Enhanced Streaming Indicator */}
              {(status === "submitted" || status === "streaming") && (
                <div className="space-y-3">
                  <div className="text-gray-500 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                      <div className="flex items-center gap-1">
                        <span className="text-sm">🧠</span>
                        <p className="text-sm">{status === "submitted" ? "Searching knowledge base..." : "Generating response..."}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="space-y-3">
                  <div className="text-red-500 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">⚠️</span>
                      <p className="text-sm">Sorry, something went wrong. Please try again.</p>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Scroll to Bottom Button - Responsive positioning above input area */}
          {showScrollButton && (
            <div className="fixed bottom-32 left-1/2 transform -translate-x-1/2 z-20 md:bottom-36 lg:bottom-40">
              <Button onClick={scrollToBottom} className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 shadow-lg" size="sm">
                <ArrowDown className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Floating Bottom Input Area */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white/95 to-transparent">
            <div className="p-4 pt-8">
              <div className="max-w-3xl mx-auto">
                {/* Chat Suggestion Badges - Hidden on mobile */}
                <div className="hidden md:flex flex-wrap gap-2 justify-center mb-3">
                  {chatSuggestions.map((suggestion, index) => (
                    !clickedBadges.has(index) && (
                      <SuggestionBadge
                        key={index}
                        question={suggestion}
                        onQuestionClick={(question) => handleSuggestionClick(question, index)}
                        variant="default"
                        size="sm"
                      />
                    )
                  ))}
                </div>
                
                <form
                  onSubmit={handleSubmit}
                  className="flex items-center gap-2 bg-white/95 rounded-full px-3 py-2 shadow-lg border border-gray-200/50"
                >
                  <Button variant="ghost" size="sm" className="text-xs text-gray-600 px-2 py-1 h-auto" type="button">
                    <Settings className="w-3 h-3 mr-1" />
                    Tools
                  </Button>
                  <Input
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder={`Ask about ${portfolioName}'s experience, projects, or skills...`}
                    className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm text-gray-900"
                    disabled={status !== "ready"}
                  />
                </form>
                <p className="text-center text-xs text-gray-500 mt-3">AI assistant can make mistakes. Check important info.</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
