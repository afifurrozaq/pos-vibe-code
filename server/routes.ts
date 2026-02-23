import { Router } from "express";
import db from "./db";

const router = Router();

// Categories
router.get("/categories", (req, res) => {
  const categories = db.prepare("SELECT * FROM categories").all();
  res.json(categories);
});

router.post("/categories", (req, res) => {
  const { name, updated_at } = req.body;
  const timestamp = updated_at || Math.floor(Date.now() / 1000);
  try {
    const info = db.prepare("INSERT INTO categories (name, updated_at) VALUES (?, ?)").run(name, timestamp);
    res.json({ id: info.lastInsertRowid, updated_at: timestamp });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.put("/categories/:id", (req, res) => {
  const { name, updated_at } = req.body;
  const timestamp = updated_at || Math.floor(Date.now() / 1000);
  const id = req.params.id;

  try {
    const current = db.prepare("SELECT updated_at FROM categories WHERE id = ?").get() as { updated_at: number };
    if (current && timestamp < current.updated_at) {
      return res.status(409).json({ error: "Conflict: Server has a newer version", current });
    }
    
    db.prepare("UPDATE categories SET name = ?, updated_at = ? WHERE id = ?").run(name, timestamp, id);
    res.json({ success: true, updated_at: timestamp });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.delete("/categories/:id", (req, res) => {
  try {
    db.prepare("DELETE FROM categories WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: "Cannot delete category while products are linked to it." });
  }
});

// Products
router.get("/products", (req, res) => {
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

router.post("/products", (req, res) => {
  const { name, price, stock, category_id, image_url, variants, updated_at } = req.body;
  const timestamp = updated_at || Math.floor(Date.now() / 1000);
  
  const transaction = db.transaction(() => {
    const info = db.prepare("INSERT INTO products (name, price, stock, category_id, image_url, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
      .run(name, price, stock, category_id, image_url, timestamp);
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
  res.json({ id: productId, updated_at: timestamp });
});

router.put("/products/:id", (req, res) => {
  const { name, price, stock, category_id, image_url, variants, updated_at } = req.body;
  const productId = req.params.id;
  const timestamp = updated_at || Math.floor(Date.now() / 1000);

  try {
    const current = db.prepare("SELECT updated_at FROM products WHERE id = ?").get() as { updated_at: number };
    if (current && timestamp < current.updated_at) {
      return res.status(409).json({ error: "Conflict: Server has a newer version", current });
    }

    const transaction = db.transaction(() => {
      db.prepare("UPDATE products SET name = ?, price = ?, stock = ?, category_id = ?, image_url = ?, updated_at = ? WHERE id = ?")
        .run(name, price, stock, category_id, image_url, timestamp, productId);

      db.prepare("DELETE FROM product_variants WHERE product_id = ?").run(productId);

      if (variants && Array.isArray(variants)) {
        const insertVariant = db.prepare("INSERT INTO product_variants (product_id, name, stock, price_adjustment) VALUES (?, ?, ?, ?)");
        for (const variant of variants) {
          insertVariant.run(productId, variant.name, variant.stock, variant.price_adjustment || 0);
        }
      }
    });

    transaction();
    res.json({ success: true, updated_at: timestamp });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.delete("/products/:id", (req, res) => {
  db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// Checkout
router.post("/checkout", (req, res) => {
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

// Stats
router.get("/stats", (req, res) => {
  const totalRevenue = db.prepare("SELECT SUM(total_amount) as total FROM sales").get() as { total: number };
  const totalSales = db.prepare("SELECT COUNT(*) as count FROM sales").get() as { count: number };
  const lowStock = db.prepare("SELECT COUNT(*) as count FROM products WHERE stock < 10").get() as { count: number };
  
  const recentSales = db.prepare(`
    SELECT s.*, (SELECT COUNT(*) FROM sale_items WHERE sale_id = s.id) as item_count
    FROM sales s
    ORDER BY timestamp DESC
    LIMIT 5
  `).all();

  const dailyRevenue = db.prepare(`
    SELECT date(timestamp) as date, SUM(total_amount) as revenue 
    FROM sales 
    WHERE timestamp >= date('now', '-7 days') 
    GROUP BY date 
    ORDER BY date ASC
  `).all();

  res.json({
    revenue: totalRevenue.total || 0,
    salesCount: totalSales.count,
    lowStockCount: lowStock.count,
    recentSales,
    dailyRevenue
  });
});

export default router;
