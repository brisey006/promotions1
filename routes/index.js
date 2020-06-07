const express = require('express');
const router = express.Router();

/** API REQUESTS */
router.use('/api', require('./api/'));

module.exports = router;