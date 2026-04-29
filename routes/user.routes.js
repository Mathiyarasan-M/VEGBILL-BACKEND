const express = require('express');
const router = express.Router();
const { getUsers, createUser, updateUser } = require('../controllers/user.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect);

router.route('/')
  .get(authorize('Superadmin', 'Admin'), getUsers)
  .post(authorize('Superadmin', 'Admin'), createUser);

router.route('/:id')
  .put(authorize('Superadmin', 'Admin'), updateUser);

module.exports = router;
