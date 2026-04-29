const mongoose = require('mongoose');

const RoleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  description: String,
  permissions: {
    menus: [
      {
        name: String,
        path: String,
        access: {
          type: Boolean,
          default: false
        }
      }
    ],
    features: [String] // e.g., ['delete_farmer', 'edit_purchase']
  }
}, { timestamps: true });

module.exports = mongoose.model('Role', RoleSchema);
