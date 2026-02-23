import mysql from "mysql2/promise";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || "localhost",
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "",
  database: process.env.MYSQL_DATABASE || "nexus_pos",
  port: parseInt(process.env.MYSQL_PORT || "3306"),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true,
});

async function runMigrations() {
  const connection = await pool.getConnection();
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        run_on DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const [rows] = await connection.query(`SELECT name FROM migrations`);
    const applied = new Set<string>((rows as any[]).map((r) => r.name as string));

    const migrationsDir = path.join(__dirname, "migrations");

    let files: string[] = [];
    try {
      files = await fs.readdir(migrationsDir);
    } catch {
      // No migrations directory yet, nothing to do
      return;
    }

    const migrationFiles = files.filter((f) => f.endsWith(".sql")).sort();

    for (const file of migrationFiles) {
      if (applied.has(file)) continue;

      const sql = await fs.readFile(path.join(migrationsDir, file), "utf8");
      if (!sql.trim()) continue;

      await connection.query(sql);
      await connection.query("INSERT INTO migrations (name) VALUES (?)", [file]);
      console.log(`Applied migration ${file}`);
    }
  } finally {
    connection.release();
  }
}

export async function initDb() {
  try {
    await runMigrations();
    console.log("MySQL Database migrations applied successfully");
  } catch (error) {
    console.error("Error: "+error); 
    console.error("Failed to initialize MySQL database. Please ensure MySQL is running and credentials are correct in .env");
    // We don't throw here to allow the server to start, but API calls will fail
  }
}

export default pool;
