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
      
      // Chercher les événements de vidage
      console.log('\n=== ÉVÉNEMENTS DE VIDAGE ===');
      const clearEvents = events.filter(e => {
        const cartAction = e.data?.productInfo?.cartAction || '';
        const productName = e.data?.productInfo?.productName || '';
        return cartAction.includes('vide') || productName.includes('vide') || 
               cartAction.includes('Vider') || productName.includes('Vider');
      });
      
      console.log(`Trouvé ${clearEvents.length} événements de vidage:`);
      clearEvents.forEach((event, i) => {
        const cartAction = event.data?.productInfo?.cartAction || '';
        const productName = event.data?.productInfo?.productName || '';
        const timestamp = new Date(event.timestamp).toLocaleTimeString();
        console.log(`${i+1}. [${timestamp}] Action: "${cartAction}" | Produit: "${productName}"`);
      });
      
      // Trouver le dernier événement de vidage
      if (clearEvents.length > 0) {
        const lastClear = clearEvents[clearEvents.length - 1];
        const clearTime = lastClear.timestamp;
        console.log(`\n=== DERNIER VIDAGE: ${new Date(clearTime).toLocaleTimeString()} ===`);
        
        // Événements après le vidage
        const eventsAfterClear = events.filter(e => e.timestamp > clearTime);
        console.log(`Événements après vidage: ${eventsAfterClear.length}`);
        
        // Événements panier après vidage
        const cartEventsAfter = eventsAfterClear.filter(e => {
          const text = e.data?.element?.text || e.data?.productInfo?.productName || '';
          return text.toLowerCase().includes('panier') || e.eventType === 'ADD_TO_CART';
        });
        
        console.log(`Événements panier après vidage: ${cartEventsAfter.length}`);
        cartEventsAfter.forEach((event, i) => {
          const text = e.data?.element?.text || e.data?.productInfo?.productName || '';
          const timestamp = new Date(event.timestamp).toLocaleTimeString();
          console.log(`${i+1}. [${timestamp}] ${text.substring(0, 100)}...`);
        });
      }
      
    } catch (error) {
      console.error('Erreur parsing JSON:', error);
    }
  });
});

req.on('error', (error) => {
  console.error('Erreur requête:', error);
});

req.end();
