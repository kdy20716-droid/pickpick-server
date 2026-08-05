import "dotenv/config";
import mysql from "mysql2/promise";

const requiresSsl =
  process.env.DB_SSL === "true" ||
  process.env.DB_HOST?.includes("tidbcloud.com");

const poolConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  timezone: "Z",
};

if (requiresSsl) {
  poolConfig.ssl = { rejectUnauthorized: false };
}

const pool = mysql.createPool(poolConfig);

export default pool;
