// Test ob der Shop existiert
async function testShopExists() {
  try {
    const response = await fetch('https://lpj-studios.myshopify.com/');
    console.log('Shop Status:', response.status);
    console.log('Shop Headers:', Object.fromEntries(response.headers.entries()));
    return response.status;
  } catch (error) {
    console.error('Shop Error:', error);
    return null;
  }
}

testShopExists();