'use client';

import { useState, useEffect } from 'react';

interface Message {
  from: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      from: 'bot',
      text: 'Hallo! Ich bin dein KI Shopping Assistant für LPJ. Ich kann dir bei der Produktsuche helfen und Fragen zu unserem Sortiment beantworten. Was suchst du heute?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Verhindert Hydration-Fehler
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Formatiert Bot-Nachrichten für bessere Darstellung
  const formatMessageText = (text: string) => {
    // Produktlinks in klickbare Namen umwandeln
    let formatted = text.replace(
      /\*\*(.*?)\*\*:\s*(.*?)\s*\[(https:\/\/[^\]]+)\]/g,
      '<div class="mb-4 p-3 bg-gray-50 rounded-lg border-l-4 border-blue-500"><strong class="text-lg text-blue-700 cursor-pointer hover:text-blue-900" onclick="window.open(\'$3\', \'_blank\')">$1</strong><p class="mt-2 text-gray-700">$2</p></div>'
    );

    // Falls keine Links, dann normale fette Produktnamen
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong class="text-blue-700">$1</strong>');

    // Absätze für bessere Struktur
    formatted = formatted.replace(/\n/g, '<br>');

    // Listen-Items formatieren
    formatted = formatted.replace(/\* \*\*(.*?)\*\*/g, '<div class="mb-3"><strong class="text-blue-700">$1</strong>');

    return formatted;
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    const newMessage: Message = {
      from: 'user',
      text: userMessage,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, newMessage]);
    setInput('');
    setLoading(true);

    try {
      // Sende Nachricht an unsere API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const botResponse: Message = {
        from: 'bot',
        text: data.response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, botResponse]);
    } catch (error) {
      const errorMessage: Message = {
        from: 'bot',
        text: 'Entschuldigung, es gab ein Problem. Versuche es später erneut.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      console.error('Chat error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-800">KI Shopping Assistant LPJ</h1>
          <p className="text-gray-600 mt-1">Dein intelligenter Produktberater</p>
        </div>
      </header>

      {/* Chat Container */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 flex flex-col">
        {/* Messages */}
        <div className="flex-1 bg-white rounded-lg shadow-sm border mb-4 p-4 overflow-y-auto max-h-96">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.from === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.from === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-800'
                  }`}
                >
                  <div 
                    className="text-sm"
                    dangerouslySetInnerHTML={{ __html: formatMessageText(message.text) }}
                  />
                  <p className="text-xs opacity-70 mt-1">
                    {isClient ? message.timestamp.toLocaleTimeString() : '--:--:--'}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {loading && (
            <div className="flex justify-start mt-4">
              <div className="bg-gray-200 px-4 py-2 rounded-lg">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Frage mich nach Produkten..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Senden
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Hinweis: Diese Nachrichten werden an KI-Services gesendet.
          </p>
        </div>
      </div>
    </div>
  );
}
