const fetch = global.fetch || require('node-fetch');
const urls = [
  'http://localhost:3001/api/v1/consumables/items',
  'http://localhost:3001/api/v1/consumables/stock',
  'http://localhost:3001/api/v1/consumables/categories',
  'http://localhost:3001/api/v1/consumables/requests?status=stores-review'
];

(async () => {
  for (const u of urls) {
    try {
      const res = await fetch(u);
      const text = await res.text();
      console.log(u, res.status, text.slice(0, 500));
    } catch (e) {
      console.error(u, 'ERROR', e.message || e);
    }
  }
})();
