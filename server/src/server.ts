import "dotenv/config";
import express from "express";
import { connectDB } from "./db";
import cors from "cors";
import morgan from "morgan";
import { ok } from "./utils/envelope";
import { notFound } from "./middleware/notFound";
import { errorHandler } from "./middleware/errorHandler";
import { clerkMiddleware } from "@clerk/express";
import { authRouter } from "./routes/auth/auth.routes";

async function mainEntryFunction() {
  await connectDB();
  const app = express();

  const corsOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(cors({ origin: corsOrigins, credentials: true }));
  app.use(express.json());
  app.use(morgan("dev"));
  app.use(clerkMiddleware());

  app.get("/health", (_req, res) => {
    res.status(200).json(ok({ message: "Server is healthy in runnig state" }));
  });
  //auth routes
  app.use("/auth", authRouter);
  app.use(notFound);
  app.use(errorHandler);

  const port = Number(process.env.PORT || 5000);
  app.listen(port, () => {
    console.log(`Server is now listening to port ${port}`);
  });
}

mainEntryFunction().catch((err) => {
  console.log("Failed to start", err);
  process.exit(1);
});
