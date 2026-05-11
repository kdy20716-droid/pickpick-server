import mysql from "mysql2/promise";
import "dotenv/config";

const poolConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
};

const requiresSsl =
  process.env.DB_SSL === "true" ||
  process.env.DB_HOST?.includes("tidbcloud.com");

if (requiresSsl) {
  poolConfig.ssl = { rejectUnauthorized: false };
}

const pool = mysql.createPool(poolConfig);

export default pool;
