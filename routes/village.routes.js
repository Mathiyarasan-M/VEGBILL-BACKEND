const express = require('express');
const router = express.Router();
const { getVillages, getVillageById, createVillage, updateVillage, deleteVillage } = require('../controllers/village.controller');

router.route('/')
  .get(getVillages)
  .post(createVillage);

router.route('/:id')
  .get(getVillageById)
  .put(updateVillage)
  .delete(deleteVillage);

module.exports = router;
