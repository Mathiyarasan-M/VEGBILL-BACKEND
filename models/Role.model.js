const mongoose = require('mongoose');

const RoleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  description: String,
  permissions: [{
    menuId: {
      type: String,
      required: true
    },
    menuName: String,
    access: {
      type: Boolean,
      default: false
    },
    actions: {
      view: { type: Boolean, default: false },
      add: { type: Boolean, default: false },
      edit: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      pdf: { type: Boolean, default: false }
    }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Role', RoleSchema);
