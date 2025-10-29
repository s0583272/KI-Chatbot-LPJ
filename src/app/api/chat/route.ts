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
  descriptionHtml?: string;
  handle: string;
  productType?: string;
  tags?: string[];
  priceRange: {
    minVariantPrice: {
      amount: string;
      currencyCode: string;
    };
    maxVariantPrice: {
      amount: string;
      currencyCode: string;
    };
  };
  variants?: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        price: {
          amount: string;
          currencyCode: string;
        };
        availableForSale: boolean;
      };
    }>;
  };
  images: {
    edges: Array<{
      node: {
        url: string;
        altText?: string;
      };
    }>;
  };
}

// Erweiterte Produkt-Query für LPJ Studios mit mehr Details
const PRODUCTS_QUERY = `
  query getProducts($first: Int!) {
    products(first: $first) {
      edges {
        node {
          id
          title
          description
          descriptionHtml
          handle
          productType
          tags
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
            maxVariantPrice {
              amount
              currencyCode
            }
          }
          variants(first: 5) {
            edges {
              node {
                id
                title
                price {
                  amount
                  currencyCode
                }
                availableForSale
              }
            }
          }
          images(first: 1) {
            edges {
              node {
                url
                altText
              }
            }
          }
        }
      }
    }
  }
`;

// PERFORMANCE: Cache-Manager für Shopify-Produkte
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
      const products = await fetchProductsFromShopifyDirect();
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

// Direkte Shopify-Abfrage (wird nur noch alle 30 Min aufgerufen)
async function fetchProductsFromShopifyDirect(searchQuery?: string): Promise<Product[]> {
  console.log('=== SHOPIFY DEBUG ===');
  console.log('SHOPIFY_STORE_DOMAIN:', SHOPIFY_STORE_DOMAIN);
  console.log('SHOPIFY_STOREFRONT_ACCESS_TOKEN:', SHOPIFY_STOREFRONT_ACCESS_TOKEN ? 'SET' : 'NOT SET');
  console.log('Search Query:', searchQuery);
  
  if (!SHOPIFY_STOREFRONT_ACCESS_TOKEN || !SHOPIFY_STORE_DOMAIN) {
    console.log('Shopify credentials not configured');
    return [];
  }

  try {
    const url = `https://${SHOPIFY_STORE_DOMAIN}/api/2024-01/graphql.json`;
    console.log('Fetching from URL:', url);
    console.log('Using token:', SHOPIFY_STOREFRONT_ACCESS_TOKEN?.substring(0, 10) + '...');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_ACCESS_TOKEN,
      },
      body: JSON.stringify({
        query: PRODUCTS_QUERY,
        variables: {
          first: 50, // Erhöhe auf 50 um mehr Produkte zu finden
        },
      }),
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    const data = await response.json();
    console.log('Shopify Response:', JSON.stringify(data, null, 2));
    
    const products = data.data?.products?.edges?.map((edge: any) => edge.node) || [];
    console.log('Found products:', products.length);
    
    // DEBUG: Export nur wenn Cache neu geladen wurde (nicht bei jedem Request)
    if ((Date.now() - productCache.lastUpdated) < 1000) { // Nur wenn gerade neu geladen
      const fs = require('fs');
      const productsForExport = products.map((product: any) => ({
        title: product.title,
        handle: product.handle,
        productType: product.productType,
        description: product.description?.substring(0, 200) + '...',
        variants: product.variants?.edges?.map((edge: any) => ({
          title: edge.node.title,
          price: edge.node.price.amount,
          available: edge.node.availableForSale
        }))
      }));
      
      fs.writeFileSync('./shopify_products_export.json', JSON.stringify(productsForExport, null, 2));
      console.log('📄 Produkte exportiert (nur bei Cache-Update)');
    }
    
    // DEBUG: Liste ALLE Produktnamen auf
    console.log('=== ALLE PRODUKTE VON SHOPIFY ===');
    products.forEach((product: any, index: number) => {
      console.log(`${index + 1}. "${product.title}" (Handle: ${product.handle})`);
    });
    console.log('=== ENDE PRODUKTLISTE ===');
    
    // SPEZIAL-SUCHE nach Handcrocheted
    console.log('=== SUCHE NACH HANDCROCHETED ===');
    const handcrochetedFound = products.filter((product: any) => 
      product.title.toLowerCase().includes('handcrocheted') || 
      product.title.toLowerCase().includes('handcrafted')
    );
    console.log(`Gefundene Handcrocheted/Handcrafted Produkte: ${handcrochetedFound.length}`);
    handcrochetedFound.forEach((product: any) => {
      console.log(`- "${product.title}" (Handle: ${product.handle})`);
    });
    console.log('=== ENDE HANDCROCHETED SUCHE ===');
    
    // Debug: Zeige ALLE Produkte mit ihren Varianten
    console.log('\n=== DEBUG: ALLE PRODUKTE UND VARIANTEN ===');
    products.forEach((product: any, index: number) => {
      console.log(`\n${index + 1}. ${product.title}:`);
      
      const variants = product.variants?.edges?.map((edge: any) => edge.node) || [];
      if (variants.length > 0) {
        console.log(`  Varianten (${variants.length}):`);
        variants.forEach((variant: any, vIndex: number) => {
          console.log(`    ${vIndex + 1}. "${variant.title}" - ${variant.price.amount}€ - Verfügbar: ${variant.availableForSale}`);
        });
      } else {
        console.log('  Keine Varianten gefunden');
      }
    });
    console.log('=== ENDE DEBUG ===\n');

    // SPEZIAL DEBUG: Suche nach Handcrocheted Produkten
    console.log('\n SPEZIAL: HANDCROCHETED PRODUKTE:');
    const handcrochetedProducts = products.filter((p: any) => 
      p.title.toLowerCase().includes('handcrocheted')
    );
    handcrochetedProducts.forEach((product: any) => {
      console.log(` ${product.title}:`);
      console.log(`   Handle: ${product.handle}`);
      const variants = product.variants?.edges?.map((edge: any) => edge.node) || [];
      variants.forEach((variant: any) => {
        console.log(`    "${variant.title}" - ${variant.price.amount}€ - Verfügbar: ${variant.availableForSale}`);
      });
    });
    console.log(' ENDE HANDCROCHETED DEBUG\n');    return products;
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

// KI Integration mit Gemini (ähnlich deinem Mensa-Bot)
async function sendMessageToGemini(userMessage: string, products: Product[], responseType: string = 'detailed') {
  if (!GEMINI_API_KEY) {
    return "Gemini API Key ist nicht konfiguriert.";
  }

  // FILTER PRODUKTE BASIEREND AUF RESPONSETYP
  let filteredProducts = products;
  

  
  if (responseType === 'sheep_wool_blankets') {
    // EINFACH: Verwende nur die Produkte die auch wirklich in der API sind
    const schafwollDeckenHandles = [
      'lpj-mountainplaid',     // Mountain Plaid
      'lpj-lodge-plaid',       // Lodge Plaid  
      'lpj-handcraft-plaid',   // Handcrafted Plaid
      'hand-crochet-plaid',    // Handcrocheted Plaid 
      'lpj-sheep-plaid'        // Sheep Plaid
    ];
    
    filteredProducts = products.filter(product => 
      schafwollDeckenHandles.includes(product.handle)
    );
    
    console.log(`🐑 Schafwoll-Decken gefiltert: ${filteredProducts.length} von ${products.length}`);
    console.log('🔍 Gefilterte Handles:');
    filteredProducts.forEach(p => console.log(`  ✅ ${p.title} (${p.handle})`));
    
    // Debug: Prüfe ob alle Handles stimmen
    const expectedHandles = ['lpj-mountainplaid', 'lpj-lodge-plaid', 'lpj-handcraft-plaid', 'hand-crochet-plaid', 'lpj-sheep-plaid'];
    console.log('🔍 Sollten enthalten sein:', expectedHandles);
    const missingHandles = expectedHandles.filter(h => !filteredProducts.some(p => p.handle === h));
    if (missingHandles.length > 0) {
      console.log('❌ Fehlende Handles:', missingHandles);
    }
  } else if (responseType === 'sheep_wool_blankets_old') {
    filteredProducts = products.filter(product => {
      const title = product.title.toLowerCase();
      const description = product.description?.toLowerCase() || '';
      const productType = product.productType?.toLowerCase() || '';
      
      // IST es eine DECKE/PLAID? (nicht Kissen, Rug, Wärmflasche)
      const isDecke = productType.includes('decken') || 
                     title.includes('plaid') || 
                     title.includes('decke');
      
      // KEINE Ausschlüsse
      const istKeinAusschluss = !title.includes('rug') && 
                               !title.includes('teppich') && 
                               !title.includes('wärmflasche') && 
                               !title.includes('kissen') && 
                               !title.includes('pillow');
      
      // ENTHÄLT Schafwolle/Wolle (aber nicht primär Kaschmir)
      const hatSchafwolle = description.includes('schafwolle') || 
                           description.includes('schafswolle') || 
                           title.includes('sheep') ||
                           (description.includes('wolle') && !description.includes('kaschmir')) ||
                           // Bekannte Schafwoll-Decken
                           title.includes('mountain plaid') || 
                           title.includes('lodge plaid') ||
                           title.includes('handcrafted plaid');
      
      console.log(`Prüfe "${product.title}": Decke=${isDecke}, KeinAusschluss=${istKeinAusschluss}, Schafwolle=${hatSchafwolle}`);
      
      return isDecke && istKeinAusschluss && hatSchafwolle;
    });

  }

  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

  // Formatiere Preis schön (349.00 € statt 349.0 EUR)
  const formatPrice = (amount: string, currency: string) => {
    const numAmount = parseFloat(amount);
    const formattedAmount = numAmount.toFixed(2);
    const currencySymbol = currency === 'EUR' ? '€' : currency;
    return `${formattedAmount} ${currencySymbol}`;
  };

  // Erstelle detaillierte Produktdaten für bessere Beratung
  const productsContext = filteredProducts.map(product => {
    const minPrice = formatPrice(product.priceRange.minVariantPrice.amount, product.priceRange.minVariantPrice.currencyCode);
    const maxPrice = formatPrice(product.priceRange.maxVariantPrice.amount, product.priceRange.maxVariantPrice.currencyCode);
    const priceRange = minPrice === maxPrice ? minPrice : `${minPrice} - ${maxPrice}`;
    
    // Beschreibung ohne HTML-Tags
    const cleanDescription = product.description?.replace(/<[^>]*>/g, '') || '';
    const fullDescription = cleanDescription || 'Hochwertige Qualität aus unserem exklusiven Sortiment';
    
    // Tags für zusätzliche Infos
    const materialTags = product.tags?.filter(tag => 
      tag.toLowerCase().includes('wolle') || 
      tag.toLowerCase().includes('kaschmir') || 
      tag.toLowerCase().includes('baumwolle') ||
      tag.toLowerCase().includes('seide') ||
      tag.toLowerCase().includes('alpaka')
    ).join(', ') || '';
    
    // Varianten-Info mit Verfügbarkeits-Check
    const variants = product.variants?.edges?.map(edge => edge.node) || [];
    
    // Verfügbarkeits-Status prüfen
    const availableVariants = variants.filter(v => v.availableForSale);
    const soldOutVariants = variants.filter(v => !v.availableForSale);
    
    let availabilityInfo = '';
    if (soldOutVariants.length > 0 && availableVariants.length === 0) {
      // Komplett ausverkauft - ALLE Farben nicht verfügbar
      availabilityInfo = ' ⚠️ Aktuell ausverkauft - auf Anfrage gerne wieder herstellbar!';
    } else if (soldOutVariants.length > 0 && availableVariants.length > 0) {
      // Teilweise ausverkauft - nur BESTIMMTE Farben nicht verfügbar
      const soldOutColors = soldOutVariants.map(v => v.title).join(', ');
      availabilityInfo = ` (Farbe${soldOutVariants.length > 1 ? 'n' : ''} "${soldOutColors}" aktuell ausverkauft - auf Anfrage herstellbar)`;
    }
    // Wenn soldOutVariants.length === 0: Keine Meldung - alles verfügbar
    
    const variantInfo = variants.length > 1 ? ` Verfügbar in ${variants.length} Varianten.${availabilityInfo}` : availabilityInfo;
    
    // Für Farbfragen: Explizit die echten Varianten-Titel auflisten
    let variantList = '';
    if (variants.length > 1) {
      const availableVariants = variants
        .filter(v => v.availableForSale)
        .map(v => v.title)
        .filter(title => title !== 'Default Title');
      
      if (availableVariants.length > 0) {
        variantList = ` ECHTE VARIANTEN: [${availableVariants.join('], [')}]`;
      }
    }
    
    return `**${product.title}**: ${fullDescription}${materialTags ? ` Material: ${materialTags}.` : ''}${variantInfo}${variantList} Preis: ${priceRange} <a href="https://${SHOPIFY_STORE_DOMAIN}/products/${product.handle}" target="_blank" rel="noopener noreferrer">[Zum Produkt]</a>`;
  }).join('\n\n');

  // EINHEITLICHE HTML-STRUKTUR für ALLE Produkttypen
  const STANDARD_HTML_FORMAT = `
ANTWORT-FORMAT für ALLE Produkttypen:
Verwende für JEDES Produkt EXAKT diese HTML-Struktur:

<div style="border-left: 4px solid #2563eb; background-color: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
<h3 style="color: #2563eb; margin: 0; font-size: 1.25rem; font-weight: 600;"><a href="https://lpj-studios.myshopify.com/products/[handle]" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: none;">Produktname</a></h3>
<p style="margin: 12px 0 0 0; color: #374151; line-height: 1.6;">Beschreibung. Verfügbare Farben: [Farben]. Preis: XXX €</p>
</div>

VERFÜGBARKEITS-HINWEISE:
- Wenn Produkt komplett ausverkauft: "⚠️ Aktuell ausverkauft - auf Anfrage gerne wieder herstellbar!"
- Wenn einzelne Farben ausverkauft: "(Farbe XXX aktuell ausverkauft - auf Anfrage herstellbar)"
- Verwende die Verfügbarkeits-Infos aus den Produktdaten

WICHTIG: 
- Produktname muss anklickbarer Link sein
- NIEMALS andere HTML-Strukturen verwenden
- IMMER diese exakte Box-Formatierung`;

  // Verschiedene Prompts je nach Antwort-Typ
  let context = '';
  
  if (responseType === 'colors') {
    context = `
Du bist ein Shopping-Berater für LPJ Studios. Der Kunde fragt nach verfügbaren Farben.

Verfügbare Produkte:
${productsContext}

Kundenfrage: ${userMessage}

KRITISCHE ANWEISUNG für ALLE Farbfragen:
1. VERWENDE AUSSCHLIESSLICH die "ECHTE VARIANTEN" Liste aus den Produktdaten
2. Wenn du "ECHTE VARIANTEN: [beige / Kaschmir], [gelb / Kaschmir], [grau / Kaschmir]" siehst
3. Verwende den Text VOR dem "/" als Farbname
4. ERFINDE NIEMALS Namen wie "anthrazit", "rosa", "steelblue"!

${STANDARD_HTML_FORMAT}

VERBOTEN: Jegliche erfundenen Farbnamen oder Beschreibungen!
NUR die echten Shopify variant.title Werte verwenden!
`;
  } else if (responseType === 'special') {
    context = `
Du bist ein Shopping-Berater für LPJ Studios. Der Kunde stellt eine Frage zu den Besonderheiten der Produkte.

Verfügbare Produkte:
${productsContext}

Kundenfrage: ${userMessage}

DYNAMISCHE ANTWORT-STRATEGIE:
- Analysiere die SPEZIFISCHE Frage des Kunden
- Wenn nach "besonders/einzigartig" → Fokus auf Handwerkskunst und Materialien
- Wenn nach "teuer/Preis" → Erkläre Wert durch Qualität und Arbeitszeit
- Wenn nach "Herstellung" → Details zu Produktionsverfahren
- Wenn nach "Nachhaltigkeit" → Recycling und Upcycling betonen
- Wenn nach "Unterschied" → Was macht LPJ anders als andere

IMMER: Wähle 2-3 passende BEISPIEL-Produkte die die Antwort am besten illustrieren.
NIEMALS: Alle 10 Produkte auflisten - antworte gezielt auf die Frage!
`;
  } else if (responseType === 'rugs') {
    context = `
Du bist ein Shopping-Berater für LPJ Studios. Der Kunde fragt nach TEPPICHEN.

Verfügbare Produkte:
${productsContext}

Kundenfrage: ${userMessage}

${STANDARD_HTML_FORMAT}
`;
  } else if (responseType === 'rug_colors') {
    context = `
Du bist ein Shopping-Berater für LPJ Studios. Der Kunde fragt nach TEPPICH-FARBEN.

Verfügbare Produkte:
${productsContext}

Kundenfrage: ${userMessage}

KRITISCH: ALLE Teppiche (Rugs) werden individuell gefertigt!
- Mountain Rug, Rug braun kupfer, Rug grau, Rug creme, Handcrafted Rug, P' Rug Serie - ALLE individuell
- NIEMALS feste Farben wie "ecru, camel, braun, grau" anzeigen
- IMMER diese Antwort verwenden:

"Der Teppich wird ganz nach deinen Größen- und Farbwünschen gefertigt. Kontaktiere uns deshalb bitte über den Shop (Kontaktformular siehe unten) oder bei einem Besuch in unserem Studio in Aschau im Chiemgau, um deinen individuellen LPJ Rug zu entwickeln!"

EGAL welcher Rug-Name erwähnt wird - IMMER individuell anfertigbar!
`;
  } else if (responseType === 'wool_blankets') {
    context = `
Du bist ein Shopping-Berater für LPJ Studios. Der Kunde fragt speziell nach DECKEN aus SCHAFWOLLE.

Verfügbare Produkte:
${productsContext}

Kundenfrage: ${userMessage}

WICHTIGE FILTERUNG:
- Zeige NUR echte DECKEN/PLAIDS aus Schafwolle
- KEINE Teppiche (Rugs) zeigen
- KEINE Wärmflaschen zeigen  
- KEINE Hundekissen zeigen

ANTWORT-FORMAT für Schafwoll-Decken:
- Verwende HTML für schöne blaue Boxen
- Jede Decke in separater blauer Box mit anklickbarem Namen
- Format für jede Decke:

<div style="border-left: 4px solid #2563eb; background-color: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
<h3 style="color: #2563eb; margin: 0; font-size: 1.25rem; font-weight: 600;"><a href="https://lpj-studios.myshopify.com/products/[handle]" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: none;">Produktname</a></h3>
<p style="margin: 12px 0 0 0; color: #374151; line-height: 1.6;">Beschreibung. Verfügbare Farben: [Farben]. Preis: XXX €</p>
</div>

WICHTIG: MAXIMAL 10 Produkte zeigen und NUR echte Decken/Plaids!
`;
  } else if (responseType === 'sheep_wool_blankets') {
    context = `
Du bist ein Shopping-Berater für LPJ Studios. Der Kunde fragt SPEZIFISCH nach DECKEN aus SCHAFWOLLE.

WICHTIGER HINWEIS: Der Kunde will NUR DECKEN/PLAIDS, KEINE anderen Produkte!

Verfügbare Produkte:
${productsContext}

Kundenfrage: ${userMessage}

ANTWORT-REGEL: Zeige AUSSCHLIESSLICH Decken/Plaids aus Schafwolle. Wärmflaschen sind KEINE Decken!

KRITISCHE FILTERUNGSREGELN für Schafwoll-DECKEN:

NUR DIESE PRODUKTE ZEIGEN:
- Mountain Plaid (reine Schafswolle)
- Lodge Plaid (reine Schafswolle) 
- Handcrafted Plaid (Schafswolle)

ABSOLUT VERBOTEN zu zeigen:
- Wärmflasche Wolle (ist KEINE Decke!)
- Geringelte Wärmflasche (ist KEINE Decke!)
- Handcrafted Rug (ist ein Teppich, KEINE Decke!)
- Alle Kissen, Teppiche, Rugs
- Cloud Plaid (ist Kaschmir, nicht Schafwolle)
- Alpen Plaid (ist Wollmix, nicht reine Schafwolle)

WICHTIG: Eine WÄRMFLASCHE ist NIEMALS eine DECKE!

${STANDARD_HTML_FORMAT}
`;
  } else if (responseType === 'wool_mix_blankets') {
    context = `
Du bist ein Shopping-Berater für LPJ Studios. Der Kunde fragt nach WOLLMIX-DECKEN.

Verfügbare Produkte:
${productsContext}

Kundenfrage: ${userMessage}

STRIKTE FILTERUNG für Wollmix-Decken:
- MAXIMAL 10 Produkte zeigen
- NUR Decken/Plaids mit Wollmischungen (Alpen Plaid = Wolle+Seide+Kaschmir, Candy Plaid = verschiedene Wollarten)
- KEINE reinen Schafwoll-Decken (Mountain Plaid)
- KEINE reinen Kaschmir-Decken (Cloud Plaid)
- KEINE Kissen, Wärmflaschen, Teppiche

${STANDARD_HTML_FORMAT}
`;
  } else if (responseType === 'cashmere_blankets') {
    context = `
Du bist ein Shopping-Berater für LPJ Studios. Der Kunde fragt nach KASCHMIR-DECKEN.

Verfügbare Produkte:
${productsContext}

Kundenfrage: ${userMessage}

STRIKTE FILTERUNG für Kaschmir-Decken:
- MAXIMAL 10 Produkte zeigen
- NUR Decken/Plaids mit Kaschmir (Cloud Plaid, C' Plaid, eventuell Yoga Plaid)
- KEINE reinen Schafwoll-Decken
- KEINE Kissen, Wärmflaschen, Teppiche

${STANDARD_HTML_FORMAT}
`;
  } else if (responseType === 'sizes') {
    context = `
Du bist ein Shopping-Berater für LPJ Studios. Der Kunde fragt nach verfügbaren Größen.

Verfügbare Produkte:
${productsContext}

Kundenfrage: ${userMessage}

${STANDARD_HTML_FORMAT}
`;
  } else {
    // Standard ausführliche Beratung
    context = `
Du bist ein exklusiver Shopping-Berater für LPJ Studios - einer Manufaktur für hochwertige, handgefertigte Textilien.

Verfügbare Produkte:
${productsContext}

Kundenfrage: ${userMessage}

WICHTIGE ANWEISUNGEN FÜR DIE BERATUNG:
- KEINE Standardeinleitungen oder Begrüßungen - komm direkt zur Sache
- Die Qualitäts-Beschreibung "Bei LPJ Studios legen wir größten Wert auf Qualität..." NUR verwenden wenn:
  * Kunde nach Qualität/Materialien fragt
  * Preise rechtfertigt werden müssen  
  * Erste Produktvorstellung bei neuen Kunden
  * NICHT bei jeder normalen Produktfrage
- Erkläre die besonderen Materialien (Kaschmir, mongolische Schafswolle, etc.)
- Rechtfertige die Preise durch Qualität, Handarbeit und exklusive Materialien
- Verwende für Produktnamen immer **Produktname**: am Anfang (fett formatiert)
- KEINE Sterne (*) oder Aufzählungszeichen vor Produktnamen verwenden
- Beschreibe jedes Produkt ausführlich in einem eigenen Absatz
- Gehe auf die Herkunft und Herstellung ein
${STANDARD_HTML_FORMAT}

Positioniere LPJ Studios als Premium-Marke für Menschen, die Wert auf Qualität und Exklusivität legen.
`;
  }

  const body = {
    contents: [{ parts: [{ text: context }] }]
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

    // Intelligente Antwort-Strategie basierend auf der Frage
    const lowerMessage = message.toLowerCase();
    let responseType = 'detailed'; // standard: ausführliche Beratung
    let searchQuery = '';
    
    // Intelligente Antwort-Strategie basierend auf der Frage
    if (lowerMessage.includes('farben') || lowerMessage.includes('farbe')) {
      responseType = 'colors'; // Alle Farbfragen bekommen kurze Antworten
    } else if (
      // DYNAMISCHE Schafwolle-Erkennung
      (lowerMessage.includes('schaf') && (lowerMessage.includes('decken') || lowerMessage.includes('plaid'))) ||
      lowerMessage.includes('schafwolldecken') || 
      lowerMessage.includes('schafwolle decken') || 
      lowerMessage.includes('schafwoll decken') ||
      lowerMessage.includes('schafswolle decken') ||
      (lowerMessage.includes('wolle') && lowerMessage.includes('decken') && 
       (lowerMessage.includes('schaf') || lowerMessage.includes('rein')))
    ) {
      responseType = 'sheep_wool_blankets'; // Nur reine Schafwolldecken
    } else if (lowerMessage.includes('wollmix decken') || lowerMessage.includes('wollmixdecken')) {
      responseType = 'wool_mix_blankets'; // Nur Wollmix-Decken
    } else if (lowerMessage.includes('kaschmir decken') || lowerMessage.includes('kaschmirdecken')) {
      responseType = 'cashmere_blankets'; // Nur Kaschmir-Decken
    } else if (lowerMessage.includes('wolldecken') || 
               ((lowerMessage.includes('decken') || lowerMessage.includes('deckn')) && 
                (lowerMessage.includes('wolle')))) {
      responseType = 'wool_blankets'; // Alle Wolldecken
    } else if (
      lowerMessage.includes('besondere') || lowerMessage.includes('besonders') ||
      lowerMessage.includes('einzigartig') || lowerMessage.includes('unterscheidet') ||
      lowerMessage.includes('warum') || lowerMessage.includes('teuer') ||
      lowerMessage.includes('hergestellt') || lowerMessage.includes('handwerk') ||
      lowerMessage.includes('qualität') || lowerMessage.includes('nachhaltig')
    ) {
      responseType = 'special'; // Fokus auf Besonderheiten und Handwerkskunst
    } else if (lowerMessage.includes('hundekissen') || lowerMessage.includes('hunde')) {
      responseType = 'detailed'; // Hundekissen vollständig beschreiben (außer Farbfragen)
    } else if (lowerMessage.includes('größe') || lowerMessage.includes('size')) {
      responseType = 'sizes';
    } else if (lowerMessage.includes('preis') || lowerMessage.includes('kosten')) {
      responseType = 'price';
    } else if (lowerMessage.includes('material')) {
      responseType = 'material';
    }
    
    // Spezielle Behandlung für Teppich-Fragen
    if (lowerMessage.includes('teppich') || lowerMessage.includes('teppiche') ||
        lowerMessage.includes('rug') || lowerMessage.includes('mountain rug') || lowerMessage.includes('handcrafted rug')) {
      if (lowerMessage.includes('farben') || lowerMessage.includes('farbe')) {
        responseType = 'rug_colors'; // Spezielle Antwort für ALLE Teppich-Farben
      } else {
        responseType = 'rugs'; // Allgemeine Teppich-Übersicht
      }
    }
    
    // Produktsuche
    if (lowerMessage.includes('cloud plaid') || lowerMessage.includes('cloud')) {
      searchQuery = 'cloud';
    }

    // Hol Produkte von Shopify
    const productsStartTime = Date.now();
    const products = await getCachedProducts();
    const productsEndTime = Date.now();
    console.log(`📦 Produkte geladen in ${productsEndTime - productsStartTime}ms (${products.length} Produkte)`);

    // Sende an Gemini für intelligente Antwort mit Retry bei Überlastung
    const geminiStartTime = Date.now();
    let response;
    try {
      response = await sendMessageToGemini(message, products, responseType);
      const geminiEndTime = Date.now();
      console.log(`🤖 Gemini Antwort generiert in ${geminiEndTime - geminiStartTime}ms`);
    } catch (geminiError: any) {
      const geminiEndTime = Date.now();
      console.error(`❌ Gemini FEHLER nach ${geminiEndTime - geminiStartTime}ms:`, geminiError);
      
      if (geminiError.message?.includes('overloaded')) {
        // Fallback bei Gemini-Überlastung
        response = "Unser KI-Assistent ist momentan überlastet. Bitte versuche es in wenigen Sekunden erneut oder stelle eine spezifischere Frage.";
      } else {
        throw geminiError;
      }
    }

    const requestEndTime = Date.now();
    const totalTime = requestEndTime - requestStartTime;
    console.log(`⚡ GESAMT-ANTWORTZEIT: ${totalTime}ms (${(totalTime/1000).toFixed(1)}s)`);
    console.log(`🏁 === ANFRAGE BEENDET ===\n`);

    return NextResponse.json({
      response,
      products: products.slice(0, 5), // Nur die ersten 5 Produkte
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Interner Server Fehler' },
      { status: 500 }
    );
  }
}
