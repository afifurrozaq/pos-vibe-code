import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";

const db = new Database("pos.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    category_id INTEGER,
    image_url TEXT,
    FOREIGN KEY (category_id) REFERENCES categories(id)
  );

  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    total_amount REAL NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER,
    product_id INTEGER,
    variant_id INTEGER,
    quantity INTEGER,
    price_at_sale REAL,
    FOREIGN KEY (sale_id) REFERENCES sales(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (variant_id) REFERENCES product_variants(id)
  );

  CREATE TABLE IF NOT EXISTS product_variants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    name TEXT NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    price_adjustment REAL DEFAULT 0,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  );
`);

// Seed initial categories if empty
const categoryCount = db.prepare("SELECT COUNT(*) as count FROM categories").get() as { count: number };
if (categoryCount.count === 0) {
  const insertCategory = db.prepare("INSERT INTO categories (name) VALUES (?)");
  ["Beverages", "Snacks", "Electronics", "Clothing", "Home"].forEach(cat => insertCategory.run(cat));
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/categories", (req, res) => {
    const categories = db.prepare("SELECT * FROM categories").all();
    res.json(categories);
  });

  app.get("/api/products", (req, res) => {
    const products = db.prepare(`
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id
    `).all() as any[];

    for (const product of products) {
      product.variants = db.prepare("SELECT * FROM product_variants WHERE product_id = ?").all(product.id);
    }
    
    res.json(products);
  });

  app.post("/api/products", (req, res) => {
    const { name, price, stock, category_id, image_url, variants } = req.body;
    
    const transaction = db.transaction(() => {
      const info = db.prepare("INSERT INTO products (name, price, stock, category_id, image_url) VALUES (?, ?, ?, ?, ?)")
        .run(name, price, stock, category_id, image_url);
      const productId = info.lastInsertRowid;

      if (variants && Array.isArray(variants)) {
        const insertVariant = db.prepare("INSERT INTO product_variants (product_id, name, stock, price_adjustment) VALUES (?, ?, ?, ?)");
        for (const variant of variants) {
          insertVariant.run(productId, variant.name, variant.stock, variant.price_adjustment || 0);
        }
      }
      return productId;
    });

    const productId = transaction();
    res.json({ id: productId });
  });

  app.put("/api/products/:id", (req, res) => {
    const { name, price, stock, category_id, image_url, variants } = req.body;
    const productId = req.params.id;

    const transaction = db.transaction(() => {
      db.prepare("UPDATE products SET name = ?, price = ?, stock = ?, category_id = ?, image_url = ? WHERE id = ?")
        .run(name, price, stock, category_id, image_url, productId);

      // Simple approach: delete all variants and re-insert
      // In a real app, you'd want to update existing ones to preserve IDs
      db.prepare("DELETE FROM product_variants WHERE product_id = ?").run(productId);

      if (variants && Array.isArray(variants)) {
        const insertVariant = db.prepare("INSERT INTO product_variants (product_id, name, stock, price_adjustment) VALUES (?, ?, ?, ?)");
        for (const variant of variants) {
          insertVariant.run(productId, variant.name, variant.stock, variant.price_adjustment || 0);
        }
      }
    });

    transaction();
    res.json({ success: true });
  });

  app.delete("/api/products/:id", (req, res) => {
    db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.post("/api/checkout", (req, res) => {
    const { items, total } = req.body;
    
    const transaction = db.transaction(() => {
      const sale = db.prepare("INSERT INTO sales (total_amount) VALUES (?)").run(total);
      const saleId = sale.lastInsertRowid;

      const insertItem = db.prepare("INSERT INTO sale_items (sale_id, product_id, variant_id, quantity, price_at_sale) VALUES (?, ?, ?, ?, ?)");
      const updateProductStock = db.prepare("UPDATE products SET stock = stock - ? WHERE id = ?");
      const updateVariantStock = db.prepare("UPDATE product_variants SET stock = stock - ? WHERE id = ?");

      for (const item of items) {
        insertItem.run(saleId, item.id, item.selected_variant_id || null, item.quantity, item.price);
        
        if (item.selected_variant_id) {
          updateVariantStock.run(item.quantity, item.selected_variant_id);
        } else {
          updateProductStock.run(item.quantity, item.id);
        }
      }
      return saleId;
    });

    try {
      const saleId = transaction();
      res.json({ success: true, saleId });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get("/api/stats", (req, res) => {
    const totalRevenue = db.prepare("SELECT SUM(total_amount) as total FROM sales").get() as { total: number };
    const totalSales = db.prepare("SELECT COUNT(*) as count FROM sales").get() as { count: number };
    const lowStock = db.prepare("SELECT COUNT(*) as count FROM products WHERE stock < 10").get() as { count: number };
    
    const recentSales = db.prepare(`
      SELECT s.*, (SELECT COUNT(*) FROM sale_items WHERE sale_id = s.id) as item_count
      FROM sales s
      ORDER BY timestamp DESC
      LIMIT 5
    `).all();

    res.json({
      revenue: totalRevenue.total || 0,
      salesCount: totalSales.count,
      lowStockCount: lowStock.count,
      recentSales
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
