function clientScope(req, res, next) {
  if (!req.user || !req.user.client_id) {
    return res.status(403).json({ error: 'Client scope not available' });
  }
  req.clientId = req.user.client_id;
  next();
}

module.exports = clientScope;
