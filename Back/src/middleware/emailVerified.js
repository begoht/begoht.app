module.exports = (req, res, next) => {
  if (!req.user.emailVerificado) {
    return res.status(403).json({
      msg: "Debes verificar tu email",
    });
  }
  next();
};
