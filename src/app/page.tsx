"use client";

import { useState, useEffect, useRef } from "react";
import { MessageCircle, Settings, ChevronDown, User, ArrowDown } from "lucide-react";
import { useChat } from "@ai-sdk/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function PortfolioAssistant() {
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const { messages, input, handleInputChange, handleSubmit, status } = useChat({
    api: "/api/chat",
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

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  return (
    <div className="h-screen bg-white flex flex-col relative">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
            <MessageCircle className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-lg font-medium text-gray-900">Portfolio Assistant</h1>
          <ChevronDown className="w-4 h-4 text-gray-500" />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">Waraphon Roonnapai</span>
          <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
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
                placeholder="Ask about my experience, projects, or skills..."
                className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm text-gray-900 placeholder:text-gray-500"
                disabled={status !== "ready"}
              />
            </form>
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
                        <p className="text-sm leading-relaxed">
                          {message.content}
                          {/* Show typing cursor for the last streaming message */}
                          {status !== "ready" && status !== "submitted" && messages.indexOf(message) === messages.length - 1 && (
                            <span className="inline-block w-0.5 h-4 bg-blue-500 ml-1 animate-pulse"></span>
                          )}
                        </p>
                      </div>
                      {/* Streaming Indicator */}
                      {status !== "ready" && status !== "submitted" && messages.length > 0 && (
                        <div className="space-y-3">
                          <div className="text-gray-500 max-w-2xl">
                            <div className="flex items-center gap-2">
                              <div className="flex gap-1">
                                <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"></div>
                                <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                                <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                              </div>
                              <p className="text-sm">✍️ Streaming response...</p>
                            </div>
                          </div>
                        </div>
                      )}
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
              {status === "submitted" && (
                <div className="space-y-3">
                  <div className="text-gray-500 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                      <p className="text-sm">🧠 Searching knowledge base...</p>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Scroll to Bottom Button */}
          {showScrollButton && (
            <div className="absolute bottom-32 right-8 z-20">
              <Button onClick={scrollToBottom} className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 shadow-lg" size="sm">
                <ArrowDown className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Floating Bottom Input Area */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white/95 to-transparent">
            <div className="p-4 pt-8">
              <div className="max-w-3xl mx-auto">
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
                    placeholder="Ask about my experience, projects, or skills..."
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
