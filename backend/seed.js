// Seed script: import products from JSON to D1
// Usage: node backend/seed.js | wrangler d1 execute xinyuan-hardware-db --file=-

const products = require('./data/products.json');

const lines = [];
for (const p of products) {
  const name = p.name.replace(/'/g, "''");
  const desc = (p.desc || '').replace(/'/g, "''");
  const image = (p.image || '📦').replace(/'/g, "''");
  const featured = p.featured ? 1 : 0;
  lines.push(
    `INSERT INTO products (id, name, category, price, unit, stock, image, description, featured) VALUES (${p.id}, '${name}', '${p.category}', ${p.price}, '${p.unit}', ${p.stock}, '${image}', '${desc}', ${featured});`
  );
}

console.log(lines.join('\n'));
console.log('\n-- Seeded ' + lines.length + ' products');
