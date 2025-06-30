"use client";

import { useState, useEffect, useRef } from "react";
import { MessageCircle, Settings, ChevronDown, User, ArrowDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Message {
  id: string;
  content: string;
  isUser: boolean;
}

const mockResponses = [
  "I have over 5 years of experience in full-stack development, specializing in React, Node.js, and cloud technologies. I've built scalable applications serving thousands of users and led development teams on multiple successful projects.",
  "My recent projects include a real-time trading platform with 99.9% uptime, an AI-powered analytics dashboard that increased efficiency by 40%, and a microservices architecture that reduced costs by 60%. I also developed a blockchain-based voting system and a machine learning recommendation engine.",
  "I'm proficient in JavaScript, TypeScript, Python, React, Next.js, Node.js, PostgreSQL, MongoDB, AWS, Docker, and Kubernetes. I also have experience with machine learning frameworks like TensorFlow and PyTorch, and I'm certified in multiple cloud platforms.",
  "I've worked at several tech companies including a fintech startup where I was lead developer, a SaaS company where I built their core platform, and currently freelancing for Fortune 500 clients. I've also contributed to open-source projects with over 10k GitHub stars.",
  "I hold a Computer Science degree from MIT and have certifications in AWS Solutions Architecture and Google Cloud Platform. I'm also a contributor to several open-source projects and have spoken at tech conferences about scalable architecture patterns.",
  "You can reach me at john.doe@email.com or connect with me on LinkedIn. I'm always open to discussing new opportunities and interesting projects! I'm particularly interested in AI/ML projects and fintech applications.",
];

export default function PortfolioAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const getRandomResponse = () => {
    return mockResponses[Math.floor(Math.random() * mockResponses.length)];
  };

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

  const handleSendMessage = () => {
    if (inputValue.trim()) {
      const userMessage: Message = {
        id: Date.now().toString(),
        content: inputValue,
        isUser: true,
      };

      setMessages((prev) => [...prev, userMessage]);
      setInputValue("");
      setIsTyping(true);

      // Simulate AI response delay
      setTimeout(() => {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: getRandomResponse(),
          isUser: false,
        };
        setMessages((prev) => [...prev, aiMessage]);
        setIsTyping(false);
      }, 1500);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSendMessage();
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
          <span className="text-sm font-medium text-gray-700">John Doe</span>
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
            <div className="flex items-center gap-3 bg-white rounded-full px-4 py-2.5 border border-gray-200 shadow-sm">
              <Button variant="ghost" size="sm" className="text-xs text-gray-600 px-3 py-1 h-auto">
                <Settings className="w-3 h-3 mr-1" />
                Tools
              </Button>
              <Input
                value={inputValue}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about my experience, projects, or skills..."
                className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm text-gray-900 placeholder:text-gray-500"
              />
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
                  {message.isUser ? (
                    <div className="flex justify-end">
                      <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-2xl max-w-xs">
                        <p className="text-sm">{message.content}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="text-gray-900 max-w-2xl">
                        <p className="text-sm leading-relaxed">{message.content}</p>
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

              {/* Typing Indicator */}
              {isTyping && (
                <div className="space-y-3">
                  <div className="text-gray-500 max-w-2xl">
                    <p className="text-sm">Thinking...</p>
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
                <div className="flex items-center gap-2 bg-white/95 rounded-full px-3 py-2 shadow-lg border border-gray-200/50">
                  <Button variant="ghost" size="sm" className="text-xs text-gray-600 px-2 py-1 h-auto">
                    <Settings className="w-3 h-3 mr-1" />
                    Tools
                  </Button>
                  <Input
                    value={inputValue}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask about my experience, projects, or skills..."
                    className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm text-gray-900"
                    disabled={isTyping}
                  />
                </div>
                <p className="text-center text-xs text-gray-500 mt-3">AI assistant can make mistakes. Check important info.</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
