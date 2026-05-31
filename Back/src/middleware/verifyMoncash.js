module.exports = (req, res, next) => {
  const signature = req.headers["x-moncash-signature"];

  if (!signature || signature !== process.env.MONCASH_SECRET) {
    return res.status(401).json({ error: "Webhook no autorizado" });
  }

  next();
};
