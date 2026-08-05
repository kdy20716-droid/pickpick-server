import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import { corsOptions } from "./config/cors.js";
import { initializeDatabase } from "./services/schemaService.js";
import { dbTest, ping, sendTestMail } from "./controllers/healthController.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";

import usersRouter from "./routes/users.js";
import voteListRouter from "./routes/posts.js";
import votesRouter from "./routes/votes.js";
import mainRouter from "./routes/mainLogic.js";
import adminRouter from "./routes/admin.js";
import reportsRouter from "./routes/reports.js";

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, "..");
const clientDistPath = path.resolve(serverRoot, "../pickpick-client/dist");
const clientIndexPath = path.join(clientDistPath, "index.html");
const hasClientBuild = fs.existsSync(clientIndexPath);

app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(serverRoot, "uploads")));

app.get("/ping", ping);
app.get("/db-test", dbTest);
app.get("/test-mail-direct", sendTestMail);

app.use("/users", usersRouter);
app.use("/votelist", voteListRouter);
app.use("/api/votes", votesRouter);
app.use("/main", mainRouter);
app.use("/admin", adminRouter);
app.use("/reports", reportsRouter);

if (hasClientBuild) {
  app.use(express.static(clientDistPath));
}

app.use(notFoundHandler);

if (hasClientBuild) {
  app.get("*", (req, res) => {
    res.sendFile(clientIndexPath);
  });
}

app.use(errorHandler);

const startServer = async () => {
  await initializeDatabase();

  const port = process.env.PORT || 4000;
  app.listen(port, () => {
    console.log(`[System] PICKPICK server listening on port ${port}`);
  });
};

startServer().catch((error) => {
  console.error("[System] Server failed to start:", error);
  process.exit(1);
});

export default app;
