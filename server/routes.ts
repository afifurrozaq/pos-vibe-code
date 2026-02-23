import { Router } from "express";
import db from "./db";

const router = Router();

// Categories
router.get("/categories", async (req, res) => {
  const [categories] = await db.query("SELECT * FROM categories");
  res.json(categories);
});

router.post("/categories", async (req, res) => {
  const { name, updated_at } = req.body;
  const timestamp = updated_at || Math.floor(Date.now() / 1000);
  try {
    const [result] = await db.query("INSERT INTO categories (name, updated_at) VALUES (?, ?)", [name, timestamp]);
    const insertId = (result as any).insertId;
    res.json({ id: insertId, updated_at: timestamp });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.put("/categories/:id", async (req, res) => {
  const { name, updated_at } = req.body;
  const timestamp = updated_at || Math.floor(Date.now() / 1000);
  const id = req.params.id;

  try {
    const [rows] = await db.query("SELECT updated_at FROM categories WHERE id = ?", [id]);
    const current = (rows as any[])[0] as { updated_at: number } | undefined;
    if (current && timestamp < current.updated_at) {
      return res.status(409).json({ error: "Conflict: Server has a newer version", current });
    }
    
    await db.query("UPDATE categories SET name = ?, updated_at = ? WHERE id = ?", [name, timestamp, id]);
    res.json({ success: true, updated_at: timestamp });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.delete("/categories/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM categories WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: "Cannot delete category while products are linked to it." });
  }
});

// Products
router.get("/products", async (req, res) => {
  const [products] = await db.query(`
    SELECT p.*, c.name as category_name 
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id
  `);

  const prodArray = products as any[];
  for (const product of prodArray) {
    // Normalize numeric fields from MySQL (which often come back as strings)
    product.price = product.price != null ? Number(product.price) : 0;
    product.stock = product.stock != null ? Number(product.stock) : 0;
    product.category_id = product.category_id != null ? Number(product.category_id) : null;

    const [variants] = await db.query("SELECT * FROM product_variants WHERE product_id = ?", [product.id]);
    const varArray = variants as any[];
    for (const variant of varArray) {
      variant.stock = variant.stock != null ? Number(variant.stock) : 0;
      if (variant.price_adjustment != null) {
        variant.price_adjustment = Number(variant.price_adjustment);
      }
    }
    product.variants = varArray;
  }

  res.json(prodArray);
});

router.post("/products", async (req, res) => {
  const { name, price, stock, category_id, image_url, variants, updated_at } = req.body;
  const timestamp = updated_at || Math.floor(Date.now() / 1000);
  
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.query(
      "INSERT INTO products (name, price, stock, category_id, image_url, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      [name, price, stock, category_id, image_url, timestamp]
    );
    const productId = (result as any).insertId;

    // Log initial stock
    await connection.query(
      "INSERT INTO stock_history (product_id, change_amount, new_stock, reason) VALUES (?, ?, ?, ?)",
      [productId, stock, stock, "Initial Stock"]
    );

    if (variants && Array.isArray(variants)) {
      for (const variant of variants) {
        const [vResult] = await connection.query(
          "INSERT INTO product_variants (product_id, name, stock, price_adjustment) VALUES (?, ?, ?, ?)",
          [productId, variant.name, variant.stock, variant.price_adjustment || 0]
        );
        const variantId = (vResult as any).insertId;
        await connection.query(
          "INSERT INTO stock_history (product_id, variant_id, change_amount, new_stock, reason) VALUES (?, ?, ?, ?, ?)",
          [productId, variantId, variant.stock, variant.stock, "Initial Stock"]
        );
      }
    }

    await connection.commit();
    res.json({ id: productId, updated_at: timestamp });
  } catch (error) {
    await connection.rollback();
    res.status(400).json({ error: (error as Error).message });
  } finally {
    connection.release();
  }
});

router.put("/products/:id", async (req, res) => {
  const { name, price, stock, category_id, image_url, variants, updated_at } = req.body;
  const productId = req.params.id;
  const timestamp = updated_at || Math.floor(Date.now() / 1000);

  try {
    const [rows] = await db.query("SELECT stock, updated_at FROM products WHERE id = ?", [productId]);
    const current = (rows as any[])[0] as { stock: number; updated_at: number } | undefined;
    if (current && timestamp < current.updated_at) {
      return res.status(409).json({ error: "Conflict: Server has a newer version", current });
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      await connection.query(
        "UPDATE products SET name = ?, price = ?, stock = ?, category_id = ?, image_url = ?, updated_at = ? WHERE id = ?",
        [name, price, stock, category_id, image_url, timestamp, productId]
      );

      if (current && current.stock !== stock) {
        await connection.query(
          "INSERT INTO stock_history (product_id, change_amount, new_stock, reason) VALUES (?, ?, ?, ?)",
          [productId, stock - current.stock, stock, "Manual Adjustment"]
        );
      }

      // For simplicity in this demo, we'll just log variant changes if they are new or stock differs
      await connection.query("DELETE FROM product_variants WHERE product_id = ?", [productId]);

      if (variants && Array.isArray(variants)) {
        for (const variant of variants) {
          const [vResult] = await connection.query(
            "INSERT INTO product_variants (product_id, name, stock, price_adjustment) VALUES (?, ?, ?, ?)",
            [productId, variant.name, variant.stock, variant.price_adjustment || 0]
          );
          const variantId = (vResult as any).insertId;
          await connection.query(
            "INSERT INTO stock_history (product_id, variant_id, change_amount, new_stock, reason) VALUES (?, ?, ?, ?, ?)",
            [productId, variantId, variant.stock, variant.stock, "Product Update"]
          );
        }
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    res.json({ success: true, updated_at: timestamp });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.delete("/products/:id", async (req, res) => {
  await db.query("DELETE FROM products WHERE id = ?", [req.params.id]);
  res.json({ success: true });
});

// Checkout
router.post("/checkout", async (req, res) => {
  const { items, total } = req.body;
  
  try {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const [saleResult] = await connection.query("INSERT INTO sales (total_amount) VALUES (?)", [total]);
      const saleId = (saleResult as any).insertId;

      for (const item of items) {
        await connection.query(
          "INSERT INTO sale_items (sale_id, product_id, variant_id, quantity, price_at_sale) VALUES (?, ?, ?, ?, ?)",
          [saleId, item.id, item.selected_variant_id || null, item.quantity, item.price]
        );

        if (item.selected_variant_id) {
          await connection.query("UPDATE product_variants SET stock = stock - ? WHERE id = ?", [
            item.quantity,
            item.selected_variant_id,
          ]);
          const [vsRows] = await connection.query("SELECT stock FROM product_variants WHERE id = ?", [
            item.selected_variant_id,
          ]);
          const vStock = (vsRows as any[])[0] as { stock: number };
          await connection.query(
            "INSERT INTO stock_history (product_id, variant_id, change_amount, new_stock, reason) VALUES (?, ?, ?, ?, ?)",
            [item.id, item.selected_variant_id, -item.quantity, vStock.stock, `Sale #${saleId}`]
          );
        } else {
          await connection.query("UPDATE products SET stock = stock - ? WHERE id = ?", [item.quantity, item.id]);
          const [psRows] = await connection.query("SELECT stock FROM products WHERE id = ?", [item.id]);
          const pStock = (psRows as any[])[0] as { stock: number };
          await connection.query(
            "INSERT INTO stock_history (product_id, variant_id, change_amount, new_stock, reason) VALUES (?, ?, ?, ?, ?)",
            [item.id, null, -item.quantity, pStock.stock, `Sale #${saleId}`]
          );
        }
      }

      await connection.commit();
      res.json({ success: true, saleId });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get("/products/:id/history", async (req, res) => {
  const [history] = await db.query(
    `
    SELECT h.*, v.name as variant_name
    FROM stock_history h
    LEFT JOIN product_variants v ON h.variant_id = v.id
    WHERE h.product_id = ?
    ORDER BY h.timestamp DESC
  `,
    [req.params.id]
  );
  res.json(history);
});

// Stats
router.get("/stats", async (req, res) => {
  const threshold = parseInt(req.query.threshold as string) || 10;

  const [revRows] = await db.query("SELECT SUM(total_amount) as total FROM sales");
  const totalRevenue = (revRows as any[])[0] as { total: number | null } | undefined;

  const [countRows] = await db.query("SELECT COUNT(*) as count FROM sales");
  const totalSales = (countRows as any[])[0] as { count: number } | undefined;

  const [lowRows] = await db.query("SELECT COUNT(*) as count FROM products WHERE stock < ?", [threshold]);
  const lowStock = (lowRows as any[])[0] as { count: number } | undefined;

  const [recentSales] = await db.query(
    `
    SELECT s.*, (SELECT COUNT(*) FROM sale_items WHERE sale_id = s.id) as item_count
    FROM sales s
    ORDER BY timestamp DESC
    LIMIT 5
  `
  );

  const [dailyRevenue] = await db.query(
    `
    SELECT DATE(timestamp) as date, SUM(total_amount) as revenue 
    FROM sales 
    WHERE timestamp >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    GROUP BY DATE(timestamp) 
    ORDER BY DATE(timestamp) ASC
  `
  );

  res.json({
    revenue: (totalRevenue?.total ?? 0),
    salesCount: totalSales?.count ?? 0,
    lowStockCount: lowStock?.count ?? 0,
    recentSales,
    dailyRevenue,
  });
});

export default router;
