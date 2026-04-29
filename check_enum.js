const Payment = require('./models/Payment.model');
console.log('Payment Schema entryType Enum:', Payment.schema.path('entryType').enumValues);
process.exit(0);
