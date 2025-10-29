import { NextRequest, NextResponse } from 'next/server';

// Shopify Storefront API Configuration
const SHOPIFY_STOREFRONT_ACCESS_TOKEN = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;
const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;

// Gemini AI Configuration (ähnlich wie in deinem Mensa-Bot)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// PERFORMANCE-CACHE: Produkte werden nur alle 30 Minuten von Shopify abgerufen
interface ProductCache {
  products: Product[];
  lastUpdated: number;
  isLoading: boolean;
}

let productCache: ProductCache = {
  products: [],
  lastUpdated: 0,
  isLoading: false
};

const CACHE_DURATION = 30 * 60 * 1000; // 30 Minuten in Millisekunden

// 🚀 CACHE WARM-UP: Produkte werden sofort beim App-Start geladen!
const initializeCache = async () => {
  const startTime = Date.now();
  console.log('🏁 APP START - Lade Produkte für schnelle Antworten...');
  try {
    const products = await getCachedProducts();
    const endTime = Date.now();
    console.log(`✅ CACHE READY - ${products.length} Produkte in ${endTime - startTime}ms geladen!`);
    console.log('🚀 Chatbot ist sofort einsatzbereit für Kunden!');
  } catch (error) {
    const endTime = Date.now();
    console.error(`❌ CACHE WARM-UP FAILED nach ${endTime - startTime}ms:`, error);
  }
};

// Cache wird automatisch beim App-Start aufgebaut (nicht warten)
initializeCache().catch(err => console.error('Cache initialization error:', err));

interface Product {
  id: string;
  title: string;
  description: string;
  handle: string;
  priceRange: {
    minVariantPrice: {
      amount: string;
      currencyCode: string;
    };
  };
}

async function getCachedProducts(): Promise<Product[]> {
  const now = Date.now();
  const isExpired = (now - productCache.lastUpdated) > CACHE_DURATION;
  const cacheAge = Math.floor((now - productCache.lastUpdated) / 1000); // Sekunden

  // Cache ist noch gültig - sofortige Rückgabe (super schnell!)
  if (!isExpired && productCache.products.length > 0) {
    console.log(`🚀 Cache HIT - Produkte aus Zwischenspeicher (${cacheAge}s alt, ${productCache.products.length} Produkte)`);
    return productCache.products;
  }

  // Cache ist abgelaufen oder leer - neu laden
  if (!productCache.isLoading) {
    console.log(`🔄 Cache MISS - Lade Produkte von Shopify... (Cache war ${cacheAge}s alt)`);
    productCache.isLoading = true;
    
    try {
      const startTime = Date.now();
      const products = await fetchProductsFromShopify();
      const loadTime = Date.now() - startTime;
      
      productCache = {
        products,
        lastUpdated: now,
        isLoading: false
      };
      console.log(`✅ Cache UPDATED - ${products.length} Produkte gespeichert (${loadTime}ms)`);
      return products;
    } catch (error) {
      console.error('❌ Cache UPDATE FAILED:', error);
      productCache.isLoading = false;
      
      // Fallback auf alte Daten, wenn vorhanden
      if (productCache.products.length > 0) {
        console.log(`🔄 Fallback auf ${productCache.products.length} alte Produkte`);
        return productCache.products;
      }
      
      // Wenn gar keine Daten da sind, Exception werfen
      throw new Error('Keine Produktdaten verfügbar - Shopify API nicht erreichbar');
    }
  }

  // Falls gerade geladen wird und alte Daten existieren
  if (productCache.products.length > 0) {
    console.log(`⏳ Cache wird gerade geladen - nutze ${productCache.products.length} vorhandene Produkte`);
    return productCache.products;
  }

  // Falls gerade geladen wird aber keine alten Daten existieren - warten
  console.log('⏳ Warte auf ersten Cache-Aufbau...');
  while (productCache.isLoading) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return productCache.products;
}

async function fetchProductsFromShopify(): Promise<Product[]> {
  const query = `
    query getProducts($first: Int!) {
      products(first: $first) {
        edges {
          node {
            id
            title
            description
            handle
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
            }
          }
        }
      }
    }
  `;

  const response = await fetch(`https://${SHOPIFY_STORE_DOMAIN}/api/2024-01/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_ACCESS_TOKEN!
    },
    body: JSON.stringify({
      query,
      variables: { first: 100 }
    })
  });

  const data = await response.json();
  return data.data.products.edges.map((edge: any) => edge.node);
}

// ⚡ ULTRA-SIMPLE Gemini Function
async function sendMessageToGemini(userMessage: string, products: Product[]): Promise<string> {
  if (!GEMINI_API_KEY) {
    return "Gemini API Key ist nicht konfiguriert.";
  }

  console.log(`🚀 GEMINI START: Sende ${products.length} Produkte für "${userMessage}"`);

  // ⚡ Minimale Daten für Gemini (nur die wichtigsten Infos)
  const productList = products.slice(0, 10).map(p => 
    `${p.title} - ${p.priceRange.minVariantPrice.amount}€ - ${p.handle}`
  ).join('\n');

  const context = `LPJ Studios Produktliste:
${productList}

Kunde fragt: ${userMessage}

Antworte kurz und hilfreich auf Deutsch. Zeige relevante Produkte mit Preisen.`;

  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

  const body = {
    contents: [{
      parts: [{ text: context }]
    }],
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 500, // ⚡ Kurze Antworten für Speed
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    
    if (data.error) {
      return `Fehler von Gemini: ${data.error.message}`;
    }
    
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Keine Antwort von Gemini erhalten.';
  } catch (error) {
    console.error('Gemini error:', error);
    return 'Fehler bei der Anfrage an die KI.';
  }
}

export async function POST(request: NextRequest) {
  const requestStartTime = Date.now();
  console.log(`\n🔥 === NEUE CHAT-ANFRAGE um ${new Date().toLocaleTimeString()} ===`);
  
  try {
    const { message } = await request.json();
    console.log(`📝 Nachricht: "${message}"`);

    if (!message) {
      return NextResponse.json({ error: 'Nachricht ist erforderlich' }, { status: 400 });
    }

    // Hol Produkte von Shopify
    const productsStartTime = Date.now();
    const products = await getCachedProducts();
    const productsEndTime = Date.now();
    console.log(`📦 Produkte geladen in ${productsEndTime - productsStartTime}ms (${products.length} Produkte)`);

    // Sende an Gemini für intelligente Antwort
    const geminiStartTime = Date.now();
    const response = await sendMessageToGemini(message, products);
    const geminiEndTime = Date.now();
    console.log(`🤖 Gemini Antwort generiert in ${geminiEndTime - geminiStartTime}ms`);

    const requestEndTime = Date.now();
    const totalTime = requestEndTime - requestStartTime;
    console.log(`⚡ GESAMT-ANTWORTZEIT: ${totalTime}ms (${(totalTime/1000).toFixed(1)}s)`);
    console.log(`🏁 === ANFRAGE BEENDET ===\n`);

    return NextResponse.json({
      response,
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Ein Fehler ist aufgetreten' },
      { status: 500 }
    );
  }
}