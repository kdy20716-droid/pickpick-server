const defaultAllowedOrigins = [
  "https://pickpick.dev",
  "https://www.pickpick.dev",
  "http://localhost:5173",
  "http://localhost:5174",
  "https://localhost",
  "http://localhost",
  "capacitor://localhost",
  "ionic://localhost",
];

const envAllowedOrigins = (process.env.CLIENT_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = [...new Set([...defaultAllowedOrigins, ...envAllowedOrigins])];

export const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(null, false);
  },
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};
