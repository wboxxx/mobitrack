const http = require('http');

// Récupérer les données de tracking
const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/tracking-data',
  method: 'GET'
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const events = JSON.parse(data);
      console.log(`Total événements: ${events.length}`);
      
      // Chercher les produits mentionnés
      const products = ['bananes', 'lentilles', 'saumon', 'saucisses'];
      
      products.forEach(product => {
        console.log(`\n=== Recherche: ${product.toUpperCase()} ===`);
        const found = events.filter(e => {
          const text = e.data?.element?.text || e.data?.productInfo?.productName || '';
          return text.toLowerCase().includes(product);
        });
        
        console.log(`Trouvé ${found.length} événements:`);
        found.forEach((event, i) => {
          const text = event.data?.element?.text || event.data?.productInfo?.productName || '';
          console.log(`${i+1}. [${event.eventType}] ${text.substring(0, 100)}...`);
        });
      });
      
      // Analyser les événements panier
      console.log('\n=== ÉVÉNEMENTS PANIER ===');
      const cartEvents = events.filter(e => {
        const text = e.data?.element?.text || e.data?.productInfo?.productName || '';
        return text.toLowerCase().includes('panier');
      });
      
      console.log(`Total événements panier: ${cartEvents.length}`);
      cartEvents.slice(0, 10).forEach((event, i) => {
        const text = event.data?.element?.text || event.data?.productInfo?.productName || '';
        console.log(`${i+1}. ${text.substring(0, 150)}...`);
      });
      
    } catch (error) {
      console.error('Erreur parsing JSON:', error);
    }
  });
});

req.on('error', (error) => {
  console.error('Erreur requête:', error);
});

req.end();
