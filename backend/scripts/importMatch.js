import fs from "fs";
import path from "path";
import pool from "../db.js";

const filePath = path.resolve("data/data.json");

const raw = fs.readFileSync(filePath, "utf8");
const match = JSON.parse(raw);
