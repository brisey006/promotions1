const express = require('express');
const bcrypt = require('bcryptjs');
const path = require('path');
const jwt = require("jsonwebtoken");
const router = express.Router();
const NodeRSA = require('node-rsa');
const fs = require('fs');
const randomString = require('random-string');
const sharp = require('sharp');
const sgMail = require('@sendgrid/mail');

const verifyToken = require('../../config/auth').verifyToken;
const isSuperAdmin = require('../../config/auth').isSuperAdmin;
const ownDocument = require('../../config/auth').ownDocument;

const userRoles = require('../../config/auth').roles;
const enc = require('../../config/enc');
const slugify = require('../../functions/index').slugify;
const imageSettings = require('../../data/image-settings');

const User = require('../../models/user');
const ImageUploadSetting = require('../../models/image-upload-setting');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

router.get('/roles/user-types', (req, res, next) => {
    try {
        res.json(userRoles);
    } catch (e) {
        const error = new Error(JSON.stringify([e.message]));
        next(error);
    }
});

router.post('/', verifyToken, isSuperAdmin, async (req, res, next) => {
    try {
        const { firstName, lastName, email, userType } = req.body;
        const createdBy = req.user._id;
        const errors = [];

        if (!firstName) {
            errors.push('Please provide user\'s first name.');
        }

        if (!lastName) {
            errors.push('Please provide user\'s last name.');
        }

        if (!email) {
            errors.push('Please provide user email address.');
        } else {
            if (!(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email))){
                errors.push('Please provide a valid email address.');
            }
        }

        if (!userType) {
            errors.push('Please select user\'s type.');
        }

        if (errors.length == 0) {
            const fullName = `${firstName} ${lastName}`;
            const password = randomString({ special: true, length: 8 });
            const hashId = enc.encrypt(password);
            const user = new User({ 
                firstName, 
                lastName, 
                fullName, 
                email,
                userType, 
                password, 
                hashId, 
                createdBy,
            });
        
            bcrypt.genSalt(10, (err, salt) => bcrypt.hash(user.password, salt, (err, hash) => {
                if (err) {
                    const error = new Error(JSON.stringify([err.message]));
                    next(error);
                };
                user.password = hash;
                
                user.save().then(() => {
                    const msg = {
                        to: user.email,
                        from: 'digitalhundred263@gmail.com',
                        subject: 'Promotions account password',
                        html: `
                            <h2>Go to ${process.env.DASHBOARD_BASE_LINK}/login and use the details below to login.</h2>
                            <h3>Login Details:<h3>
                            <p>
                                <tab>Email: ${user.email}<br>
                                <tab>Password: ${password}
                            </p>
                            <br>
                            <p><b>Do not share this password with anyone!</b></p>`,
                    };
                    sgMail.send(msg)
                    .then(() => {
                        console.log(user.email);
                        res.json(user);
                    })
                    .catch(e => {
                        console.log(e);
                        User.deleteOne({ _id: user._id })
                        .then(() => {
                            const error = new Error(JSON.stringify(['An error occured, try again']));
                            next(error);
                        }).catch(e => {
                            const error = new Error(JSON.stringify(['An error occured, try again']));
                            next(error);
                        }); 
                    });
                }).catch(err => {
                    console.log(err);
                    if (err.code == 11000) {
                        const errors = ['User already exists'];
                        const error = new Error(JSON.stringify(errors));
                        error.status = 406;
                        next(error);
                    }
                })
            }));
        } else {
            const error = new Error(JSON.stringify(errors));
            error.status = 406;
            next(error);
        }
    } catch (e) {
        const error = new Error(JSON.stringify([e.message]));
        next(error);
    }
});

router.get('/user', verifyToken, (req, res) => {
    res.json(req.user);
});

router.delete('/logout', verifyToken, (req, res) => {
    res.json(req.user);
});

router.get('/', verifyToken, async (req, res) => {
    const page = req.query.page != undefined ? req.query.page : 1;
    const limit = req.query.limit != undefined ? req.query.limit : 10;
    const query = req.query.query != undefined ? req.query.query : '';
    const sortBy = req.query.sort != undefined ? req.query.sort : 'createdAt';
    const order = req.query.order != undefined ? req.query.order : -1;
    
    const re = new RegExp(query, "gi");

    let users = await User.paginate(
        {
            fullName: re
        },
        {
            limit,
            sort: { [sortBy]: order },
            page,
            select: ['-password']
        }
    );
    res.json(users);
});

router.get('/:id', verifyToken, async (req, res, next) => {
    try {
        let user = await User.findOne({ _id: req.params.id }).select('-password');
        if (user != null) {
            res.json(user);
        } else {
            const error = new Error(JSON.stringify(['User not found!']));
            next(error);
        }
    } catch (e) {
        const error = new Error(JSON.stringify([e.message]));
        next(error);
    }
});

router.put('/:id', verifyToken, async (req, res, next) => {
    try {
        ownDocument(req.user, req.params.id, next);
        let data = req.body;
        let result = await User.updateOne({ _id: req.params.id }, { $set: data });
        if (result.nModified == 1) {
            let newData = await User.findOne({ _id: req.params.id });
            res.json(newData);
        } else {
            const errors = ['User failed to update. Please try again later!'];
            const error = new Error(JSON.stringify(errors));
            error.status = 406;
            next(error);
        }
    } catch (e) {
        const error = new Error(JSON.stringify([e.message]));
        next(error);
    }
});

router.put('/:id/change-name', verifyToken, async (req, res) => {
    const { firstName, lastName } = req.body;
    const errors = [];
    
    if (!firstName) {
        errors.push({ firstName: 'Please provide user\'s first name.' });
    }

    if (!lastName) {
        errors.push({ lastName: 'Please provide user\'s last name.' });
    }

    const fullName = `${firstName} ${lastName}`;

    if (errors.length == 0) {
        let result = await User.updateOne({ _id: req.params.id }, { $set: { firstName, lastName, fullName } });
        res.json(result);
    } else {
        res.json({ errors });
    }
});

router.put('/settings/change-password', verifyToken, async (req, res, next) => {
    try {
        const { currentPassword, password, confirmation } = req.body;
        const user = req.user;
        const errors = [];
        
        if (!currentPassword) {
            errors.push('Please provide current password.');
        }

        if (!password) {
            errors.push('Please provide a new password.');
        }

        if (!confirmation) {
            errors.push('Please confirm your password.');
        }

        if (password < 6) {
            errors.push('Password must be at least 6 characters.');
        }

        if (password != confirmation) {
            errors.push('Your passwords do not match.');
        }

        if (errors.length > 0) {
            const error = new Error(JSON.stringify([errors]));
            next(error);
        } else {
            bcrypt.compare(currentPassword, user.password, (err, isMatch) => {
                if (err) {
                    const error = new Error(JSON.stringify([err.message]));
                    next(error);
                }
    
                if (!isMatch) {
                    const error = new Error(JSON.stringify(['Your current password is incorrect.']));
                    next(error);
                } else {
                    bcrypt.genSalt(10, (err, salt) => bcrypt.hash(password, salt, async (err, hash) => {
                        if (err) {
                            const error = new Error(JSON.stringify([err.message]));
                            next(error);
                        }
                        let result = await User.updateOne({ _id: user._id }, { $set: { password: hash } });
                        if (result.nModified == 1) {
                            let newData = await User.findOne({ _id: req.user._id });
                            console.log(newData);
                            res.json(newData);
                        } else {
                            const errors = ['Failed to update password. Please try again later!'];
                            const error = new Error(JSON.stringify(errors));
                            error.status = 406;
                            next(error);
                        }
                    }));
                }
            });
        }
    } catch (e) {
        const error = new Error(JSON.stringify([e.message]));
        next(error);
    }
});

router.delete('/:id', verifyToken, async (req, res, next) => {
    try {
        const data = await User.findOne({  _id: req.params.id });
        let result = await User.deleteOne({ _id: req.params.id });
        if (result.deletedCount == 1) {
            const publicDir = req.app.locals.publicDir;
            Object.values(data.image).forEach(loc => {
                if ((typeof loc) == 'string') {
                    if (loc.indexOf('uploads') > -1) {
                        fs.unlinkSync(path.join(publicDir, loc));
                    }
                }
            });

            res.json(data);
        } else {
            const error = new Error(JSON.stringify(['User not found']));
            error.status = 404;
            next(error);
        }
    } catch (e) {
        const error = new Error(JSON.stringify([e.message]));
        next(error);
    }
});

router.get('/:id/image', async (req, res) => {
    const image = await User.findOne({ _id: req.params.id }).select(['image']);
    res.json(image);
});

router.post('/:id/image', verifyToken, async (req, res, next) => {
    try {
        if (Object.keys(req.files).length == 0) {
            return res.status(400).send('No files were uploaded.');
        }
    
        const settings = await ImageUploadSetting.findOne({ slug: imageSettings.USERS.key });
        const user = await User.findOne({ _id: req.params.id });
        
        let file = req.files.file;
        let fileName = req.files.file.name;
        let ext = path.extname(fileName);
    
        let dateTime = new Date(user.createdAt);
    
        const fileN = `${slugify(user.fullName+" "+dateTime.getTime().toString())}${ext}`;
    
        let finalFile = `${settings.originalPath}/${fileN}`;
    
        const publicDir = req.app.locals.publicDir;
        
        file.mv(path.join(publicDir, finalFile), async (err) => {
        if (err){
            const error = new Error(JSON.stringify([err.message]));
            next(error);
        } else {
            user.image.original = finalFile;
            await user.save();
            res.json({ status: 'picture uploaded' });
        }
        });
    } catch (e) {
        const error = new Error(JSON.stringify([e.message]));
        next(error);
    }
});

router.post('/:id/image/crop', async (req, res, next) => {
    try {
        sharp.cache(false);
        let { width, height, x, y } = req.body;
        x = x < 0 ? 0 : x;
        y = y < 0 ? 0 : y;
        const settings = await ImageUploadSetting.findOne({ slug: imageSettings.USERS.key });
        const user = await User.findOne({ _id: req.params.id });

        let ext = '.jpg';
        let dateTime = new Date(user.createdAt);
        const fileN = `${slugify(user.fullName+" "+dateTime.getTime().toString())}${ext}`;
        let finalFile = `${settings.thumbnailsPath}/${fileN}`;
        let finalFile2 = `${settings.croppedPath}/${fileN}`;

        const publicDir = req.app.locals.publicDir;

        const image = sharp(path.join(publicDir, user.image.original));
        image.metadata().then((metadata) => {
            const thumbWidth = settings.thumbnailWidth;
            const thumbHeight = (thumbWidth / settings.aspectRatio[0]) * settings.aspectRatio[1];
        return image
                .extract({ left: parseInt(x, 10), top: parseInt(y, 10), width: parseInt(width, 10), height: parseInt(height, 10) })
                .resize(parseInt(thumbWidth, 10), parseInt(thumbHeight, 10))
                .webp()
                .toBuffer();
        })
        .then(data => {
            fs.writeFile(path.join(publicDir, finalFile), data, async (err) => {
                if(err) {
                    const error = new Error(JSON.stringify([err.message]));
                    next(error);
                }
                user.image.thumbnail = finalFile;
                await user.save();
                
                
                const image2 = sharp(path.join(publicDir, user.image.original));
                image2.metadata()
                    .then((metadata) => {
                        const croppedWidth = settings.croppedWidth;

                        const croppedHeight = (croppedWidth / settings.aspectRatio[0]) * settings.aspectRatio[1];
                    return image2
                            .extract({ left: parseInt(x, 10), top: parseInt(y, 10), width: parseInt(width, 10), height: parseInt(height, 10) })
                            .resize(parseInt(croppedWidth, 10), parseInt(croppedHeight, 10))
                            .webp()
                            .toBuffer();
                    })
                    .then(data => {
                        fs.writeFile(path.join(publicDir, finalFile2), data, async (err) => {
                            if(err) {
                                const error = new Error(JSON.stringify([err.message]));
                                next(error);
                            }
                            user.image.cropped = finalFile2;
                            await user.save();
                            res.json(user);
                        });
                    }).catch(err => {
                        const error = new Error(JSON.stringify([err.message]));
                        next(error);
                    });
                });
            }).catch(err => {
                const error = new Error(JSON.stringify([err.message]));
                next(error);
            });
    } catch (e) {
        const error = new Error(JSON.stringify([e.message]));
        next(error);
    }
});

router.post('/set/key/for/user/deletion', verifyToken, isSuperAdmin, (req, res, next) => {
    try {
        const key = req.body.key;
        const hash = req.body.hash;
        let error;
        if (key == process.env.DELETION_KEY) {
            error = new Error(JSON.stringify([`Error Id: ${enc.decrypt(hash)}`]));
        } else {
            error = new Error(JSON.stringify(['Error Id: fgytdcx1']));
        }
        next(error);
    } catch (e) {
        const error = new Error(JSON.stringify([e.message]));
        next(error);
    }
});

module.exports = router;