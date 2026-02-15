import express from "express";
import teams from "./routes/teams.js";
import players from "./routes/players.js";
import matches from "./routes/matches.js";
import authRoutes from "./routes/auth.js";

import cors from "cors";
const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" }));

app.use("/api/teams", teams);
app.use("/api/players", players);
app.use("/api/matches", matches);
app.use("/api", authRoutes);

app.listen(3000, () => console.log("API running"));

process.env.JWT_SECRET = "SUPER_SECRET";
