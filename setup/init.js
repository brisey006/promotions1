const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const slugify = require('../functions/index').slugify;
const enc = require('../config/enc');

const User = require('../models/user');

router.get('/user', (req, res) => {
    const user = new User({
        firstName: 'Admin',
        lastName: 'Super',
        email: 'super@admin.com',
        fullName: 'Super Admin',
        password: 'admin1',
        userType: 'super-admin'
    });

    bcrypt.genSalt(10, (err, salt) => bcrypt.hash(user.password, salt, (err, hash) => {
        if (err) throw err;
        user.password = hash;
        
        user.save().then(user => {
            res.json(user);
        }).catch(err => {
            res.json(err);
        });
    }));
});

router.get('/enc/:key', (req, res) => {
    res.send(enc.decrypt(req.params.key));
});

module.exports = router;
