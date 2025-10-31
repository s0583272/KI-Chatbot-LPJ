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

  // Formatiert Bot-Nachrichten für Schwarz-Weiß Design mit Produktkarten
  const formatMessageText = (text: string) => {
    // Neue Formatierung für HTML Produktkarten (aus dem Backend)
    let formatted = text.replace(
      /<div style="border: 2px solid #1e40af;[^>]*data-product-handle="([^"]*)"[^>]*data-product-image="([^"]*)"[^>]*>([\s\S]*?)<\/div>/g,
      (match, handle, imageUrl, content) => {
        // Extrahiere Produktname, Beschreibung, Preis und Link
        const nameMatch = content.match(/<h3[^>]*>(.*?)<\/h3>/);
        const descMatch = content.match(/<p[^>]*>(.*?)<\/p>/);
        const priceMatch = content.match(/<strong[^>]*>\€?([0-9.,]+).*?<\/strong>/);
        
        const productName = nameMatch ? nameMatch[1] : 'Produkt';
        const description = descMatch ? descMatch[1] : '';
        const price = priceMatch ? priceMatch[1] + ' €' : '';
        const productLink = `https://lpj-studios.myshopify.com/products/${handle}`;
        
        return `
          <div class="product-card mb-4 p-4 rounded-lg">
            <div class="flex flex-col">
              <div class="w-full mb-3">
                ${imageUrl ? 
                  `<img src="${imageUrl}" alt="${productName}" class="w-full h-auto max-h-64 object-contain block" onerror="this.style.display='none'" />` : 
                  ''
                }
              </div>
              <h3 class="text-xl font-bold text-black mb-2">${productName}</h3>
              <p class="text-gray-800 mb-3 text-sm">${description}</p>
              <div class="flex justify-between items-center">
                <span class="text-lg font-bold text-black">${price}</span>
                <button onclick="window.open('${productLink}', '_blank')" class="product-button rounded">
                  Zum Produkt
                </button>
              </div>
            </div>
          </div>
        `;
      }
    );

    // Fallback für einfache Produktlinks
    formatted = formatted.replace(
      /\*\*(.*?)\*\*:\s*(.*?)\s*\[([^\]]+)\]\((https:\/\/[^)]+)\)/g,
      `
        <div class="product-card mb-4 p-4 rounded-lg">
          <div class="flex flex-col">
            <div class="w-full h-48 bg-gray-100 border-2 border-black mb-3 flex items-center justify-center">
              <span class="text-gray-500">Produktbild wird geladen...</span>
            </div>
            <h3 class="text-xl font-bold text-black mb-2">$1</h3>
            <p class="text-gray-800 mb-3 text-sm">$2</p>
            <div class="flex justify-between items-center">
              <span class="text-lg font-bold text-black">Preis auf Anfrage</span>
              <button onclick="window.open('$4', '_blank')" class="product-button px-4 py-2 rounded font-medium">
                Zum Produkt
              </button>
            </div>
          </div>
        </div>
      `
    );

    // Normal text formatting
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong class="text-black">$1</strong>');
    formatted = formatted.replace(/\n/g, '<br>');

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
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="bg-black shadow-sm border-b-2 border-black">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-white">Monster Assistent</h1>
          <p className="text-gray-300 mt-1">Dein intelligenter Produktberater</p>
        </div>
      </header>

      {/* Chat Container */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 flex flex-col">
        {/* Messages */}
        <div className="flex-1 chat-container rounded-lg mb-4 p-4 overflow-y-auto max-h-96">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.from === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.from === 'user'
                      ? 'user-message'
                      : 'bot-message'
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
              <div className="bot-message px-4 py-2 rounded-lg">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-black rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-black rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-black rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="bg-white rounded-lg border-2 border-black p-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Frage mich nach Produkten..."
              className="flex-1 px-3 py-2 border-2 border-black rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="product-button px-6 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
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
