import jwt from "jsonwebtoken";

export function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  console.log(req.headers);
  if (!token) return res.status(401).json({ error: "No token" });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}
