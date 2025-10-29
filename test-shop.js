// Test script um zu prüfen ob der Shop erreichbar ist
const SHOP_DOMAIN = 'lpj-shop.myshopify.com';

// Teste Shop-Zugriff ohne Token (nur public data)
async function testShopAccess() {
  try {
    const response = await fetch(`https://${SHOP_DOMAIN}/api/2023-10/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          query {
            shop {
              name
              description
            }
          }
        `
      })
    });
    
    const data = await response.json();
    console.log('Shop Response:', data);
    return data;
  } catch (error) {
    console.error('Shop Access Error:', error);
    return null;
  }
}

export default testShopAccess;