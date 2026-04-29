const express = require('express');
const router = express.Router();
const { getRoles, createRole, updateRole } = require('../controllers/role.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect);

router.route('/')
  .get(authorize('Superadmin'), getRoles)
  .post(authorize('Superadmin'), createRole);

router.route('/:id')
  .put(authorize('Superadmin'), updateRole);

module.exports = router;
