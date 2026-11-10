const router = require('express').Router();
const { Category } = require('../models');
router.get('/', async (req, res) => res.json(await Category.find().sort('name')));
module.exports = router;
