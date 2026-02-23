import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'nexus_pos',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export async function initDb() {
  try {
    const connection = await pool.getConnection();
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS categories (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) UNIQUE NOT NULL,
          updated_at INT NOT NULL DEFAULT (UNIX_TIMESTAMP())
        )
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS products (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          price DECIMAL(10, 2) NOT NULL,
          stock INT NOT NULL DEFAULT 0,
          category_id INT,
          image_url TEXT,
          updated_at INT NOT NULL DEFAULT (UNIX_TIMESTAMP()),
          FOREIGN KEY (category_id) REFERENCES categories(id)
        )
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS sales (
          id INT AUTO_INCREMENT PRIMARY KEY,
          total_amount DECIMAL(10, 2) NOT NULL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS product_variants (
          id INT AUTO_INCREMENT PRIMARY KEY,
          product_id INT,
          name VARCHAR(255) NOT NULL,
          stock INT NOT NULL DEFAULT 0,
          price_adjustment DECIMAL(10, 2) DEFAULT 0,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        )
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS sale_items (
          id INT AUTO_INCREMENT PRIMARY KEY,
          sale_id INT,
          product_id INT,
          variant_id INT,
          quantity INT,
          price_at_sale DECIMAL(10, 2),
          FOREIGN KEY (sale_id) REFERENCES sales(id),
          FOREIGN KEY (product_id) REFERENCES products(id),
          FOREIGN KEY (variant_id) REFERENCES product_variants(id)
        )
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS stock_history (
          id INT AUTO_INCREMENT PRIMARY KEY,
          product_id INT,
          variant_id INT,
          change_amount INT NOT NULL,
          new_stock INT NOT NULL,
          reason TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
          FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE
        )
      `);

      // Seed initial categories if empty
      const [rows] = await connection.query('SELECT COUNT(*) as count FROM categories');
      const count = (rows as any)[0].count;
      if (count === 0) {
        const categories = ["Beverages", "Snacks", "Electronics", "Clothing", "Home"];
        for (const cat of categories) {
          await connection.query("INSERT INTO categories (name) VALUES (?)", [cat]);
        }
      }
    } finally {
      connection.release();
    }
    console.log("MySQL Database initialized successfully");
  } catch (error) {
    console.error("Failed to initialize MySQL database. Please ensure MySQL is running and credentials are correct in .env");
    // We don't throw here to allow the server to start, but API calls will fail
  }
}

export default pool;
