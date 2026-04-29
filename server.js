const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();

// Connect to database
connectDB();

const app = express();

// Middleware - CORS MUST come first
app.use(cors({
  origin: 'http://localhost:5173', // Explicitly allow your frontend origin
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use((req, res, next) => {
  if (req.method !== 'GET') {
    // Clone body to avoid side effects
    const logBody = { ...req.body };
    if (logBody.profileImage && typeof logBody.profileImage === 'string') {
      logBody.profileImage = `[Base64 Image: ${logBody.profileImage.length} bytes]`;
    }
    
    // Log headers specifically for DELETE to debug auth issues
    if (req.method === 'DELETE') {
      console.log(`DELETE REQUEST - Auth Header Present: ${!!req.headers.authorization}`);
    }

    console.log(`${req.method} ${req.url} - Body:`, logBody);
  }
  next();
});

// Use helmet but with customized configuration for API
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for API only backends
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(morgan('dev'));

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/roles', require('./routes/role.routes'));
app.use('/api/farmers', require('./routes/farmer.routes'));
app.use('/api/vendors', require('./routes/vendor.routes'));
app.use('/api/vegetables', require('./routes/vegetable.routes'));
app.use('/api/purchases', require('./routes/purchase.routes'));
app.use('/api/sales', require('./routes/sale.routes'));
app.use('/api/payments', require('./routes/payment.routes'));
app.use('/api/units', require('./routes/unit.routes'));
app.use('/api/dashboard', require('./routes/dashboard.routes'));
app.use('/api/counters', require('./routes/counter.routes'));
app.use('/api/investments', require('./routes/investment.routes'));
app.use('/api/expenses', require('./routes/expense.routes'));
app.use('/api/villages', require('./routes/village.routes'));

// Basic route
app.get('/', (req, res) => {
  res.send('Commission Ledger API is running...');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('SERVER ERROR:', err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
