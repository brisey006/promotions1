const express = require('express');
const router = express.Router();

router.use('/login', require('./login'));
router.use('/', require('./users'));
router.use('/sellers', require('./sellers'));
router.use('/promotions', require('./promotions'));
router.use('/articles', require('./articles'));
router.use('/settings/image', require('./image-upload-settings'));

module.exports = router;

