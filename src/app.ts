import express, { Express, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { notFoundHandler } from "./middlewares/not-found-handler";
import { errorHandler } from "./middlewares/error-handler";
import healthRoutes from "./routes/health.routes";
import env from "./configs/env";

import { Server } from "socket.io";
import { createServer } from "node:http";
import { setupSocket } from "./configs/socket";

const app: Express = express();

const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true
  }
});

// io.use(async (socket, next) => {
//   try {
//     const rawCookie = socket.request.headers.cookie;

//     if (!rawCookie) {
//       return next(new Error("Unauthorized"));
//     }

//     const token = rawCookie.split("=")[1];

//     if (!token) {
//       return next(new Error("Unauthorized"));
//     }

//     socket.data.token = token;
//   } catch (error) {
//     return next(new Error("Unauthorized"));
//   }
// });

setupSocket(io);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true
  })
);
app.use(helmet());
app.use(cookieParser());
app.use(morgan(env.NODE_ENV === "development" ? "dev" : "combined"));

//? Routes
app.get("/", (req: Request, res: Response) => {
  res.redirect("/api/health");
});

app.use("/api/health", healthRoutes);

// Not found handler (should be after routes)
app.use(notFoundHandler);

// Global error handler (should be last)
app.use(errorHandler);

export { io };

export default server;
