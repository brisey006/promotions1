const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require("jsonwebtoken");
const router = express.Router();

const User = require('../../models/user');
const verifyToken = require('../../config/auth').verifyToken;

router.get('/', verifyToken, async (req, res) => {
    res.json(req.user);
});

router.post('/', async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const errors = [];

        if (!email) {
            errors.push('Email is required');
        }

        if (!password) {
            errors.push('Password is required');
        }
        
        if (errors.length > 0) {
            const error = new Error(JSON.stringify(errors));
            error.status = 406;
            next(error);
        }

        const user = await User.findOne({ email: email });

        if(!user) {
            const error = new Error(JSON.stringify(['Email or password incorrect']));
            error.status = 403;
            return next(error);
        }
        
        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) {
                return next(err);
            }

            if (isMatch) {
                jwt.sign(
                    {
                        id: user._id,
                        role: user.role,
                        lastLogin: Date.now,
                        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24)
                    }, process.env.JWT_KEY,
                    (err, token) => {
                        if (err) {
                            next(err);
                        } else {
                            delete user._doc.password;
                            res.json({ token, ...user._doc });
                        }
                    }
                );
            } else {
                const error = new Error(JSON.stringify(['Email or password incorrect']));
                error.status = 403;
                next(error);
            }
        });
    } catch (e) {
        next(e);
    }
});

module.exports = router;