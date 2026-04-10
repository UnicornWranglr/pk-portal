require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { verifyToken, requireAdmin, requireClient } = require('./middleware/auth');
const clientScope = require('./middleware/clientScope');

const app = express();
app.use(cors());
app.use(express.json());

// Auth routes (public)
app.use('/api/auth', require('./routes/auth'));

// Admin routes
app.use('/api/admin/clients', verifyToken, requireAdmin, require('./routes/admin/clients'));
app.use('/api/admin', verifyToken, requireAdmin, require('./routes/admin/users'));
app.use('/api/admin/requests', verifyToken, requireAdmin, require('./routes/admin/requests'));
app.use('/api/admin/billing', verifyToken, requireAdmin, require('./routes/admin/billing'));
app.use('/api/admin/activity', verifyToken, requireAdmin, require('./routes/admin/activity'));

// Client portal routes
app.use('/api/portal/users', verifyToken, requireClient, clientScope, require('./routes/portal/users'));
app.use('/api/portal/requests', verifyToken, requireClient, clientScope, require('./routes/portal/requests'));

// Serve static frontend in production
const clientBuild = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientBuild));
app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuild, 'index.html'));
});

// Error handler
app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
