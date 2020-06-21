const express = require('express');
const bcrypt = require('bcryptjs');
const path = require('path');
const jwt = require("jsonwebtoken");
const router = express.Router();
const NodeRSA = require('node-rsa');
const fs = require('fs');
const randomString = require('random-string');
const sharp = require('sharp');

const verifyToken = require('../../config/auth').verifyToken;
const enc = require('../../config/enc');
const slugify = require('../../functions/index').slugify;

const User = require('../../models/user');

/** Post Requests */

router.post('/users', verifyToken, async (req, res) => {
    const { firstName, lastName, email, userType } = req.body;
    const createdBy = req.user._id;
    const errors = [];

    if (!firstName) {
        errors.push({ firstName: 'Please provide user\'s first name.' });
    }

    if (!lastName) {
        errors.push({ lastName: 'Please provide user\'s last name.' });
    }

    if (!email) {
        errors.push({ email: 'Please provide user email address.' });
    } else {
        if (!(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email))){
            errors.push({ email: 'Please provide a valid email address.' });
        }
    }

    if (!userType) {
        errors.push({ userType: 'Please select user\'s type.' });
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
            if (err) throw err;
            user.password = hash;
            
            user.save().then(() => {
                res.json(user);
            }).catch(err => {
                if (err.code == 11000) {
                    const errors = [{ general: 'Email already used' }];
                    res.json({ errors });
                }
            })
        }));
    } else {
        res.json({ errors });
    }
});

router.get('/user', verifyToken, (req, res) => {
    res.json(req.user);
});

router.delete('/logout', verifyToken, (req, res) => {
    res.json(req.user);
});

router.get('/users', verifyToken, async (req, res) => {
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

router.get('/users/:id', verifyToken, async (req, res) => {
    if (req.params.id != undefined) {
        let user = await User.findOne({ _id: req.params.id }).select('-password');
        res.json(user);
    } else {
        res.json({
            error: 'User not found'
        });
    }
});

router.put('/users/:id', verifyToken, async (req, res) => {
    let data = req.body;
    let result = await User.updateOne({ _id: req.params.id }, { $set: data });
    res.json(result);
});

router.put('/users/:id/change-name', verifyToken, async (req, res) => {
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

router.put('/users/settings/change-password', verifyToken, async (req, res) => {
    const { currentPassword, password, confirmation } = req.body;
    const user = req.user;
    const errors = [];
    
    if (!currentPassword) {
        errors.push({ currentPassword: 'Please provide current password.' });
    }

    if (!password) {
        errors.push({ password: 'Please provide a new password.' });
    }

    if (!confirmation) {
        errors.push({ password: 'Please confirm your password.' });
    }

    if (password < 6) {
        errors.push({ password: 'Password must be at least 6 characters.' });
    }

    if (password != confirmation) {
        errors.push({ confirmation: 'Your passwords do not match.' });
    }

    bcrypt.compare(currentPassword, user.password, (err, isMatch) => {
        if (err) {
            console.log(err);
        }

        if (!isMatch) {
            errors.push({ confirmation: 'Your current password is incorrect.' });
        }

        if (errors.length == 0) {
            bcrypt.genSalt(10, (err, salt) => bcrypt.hash(password, salt, async (err, hash) => {
                if (err) {
                    console.log(err);
                }
                let result = await User.updateOne({ _id: user._id }, { $set: { password: hash } });
                res.json(result);
            }));
        } else {
            res.json({ errors });
        }
    });
});

router.delete('/users/:id', verifyToken, async (req, res) => {
    let user = await User.deleteOne({ _id: req.params.id });
    res.json({
        status: 'deleted',
        details: user
    });
});

router.get('/users/:id/image', async (req, res) => {
    const image = await User.findOne({ _id: req.params.id }).select(['image']);
    res.json(image);
});

router.post('/users/:id/image', verifyToken, async (req, res) => {
  
  if (Object.keys(req.files).length == 0) {
    return res.status(400).send('No files were uploaded.');
  }

  const user = await User.findOne({ _id: req.params.id });

  let file = req.files.file;
  let fileName = req.files.file.name;
  let ext = path.extname(fileName);

  let dateTime = new Date(user.createdAt);

  const fileN = `${slugify(user.fullName+" "+dateTime.getTime().toString())}${ext}`;

  let finalFile = `/uploads/users/original/${fileN}`;

  let pathstr = __dirname;
  pathstr = pathstr.substr(0, pathstr.indexOf('/routes'));
  
  file.mv(`${path.join(pathstr, 'public')}${finalFile}`, async (err) => {
    if (err){
        res.send(err.message);
    } else {
      user.image.original = finalFile;
      await user.save();
      res.json({ status: 'picture uploaded' });
    }
  });
});

router.post('/users/:id/image/crop', async (req, res) => {
    sharp.cache(false);
    const { width, height, x, y, scaleX, scaleY } = req.body;
    const user = await User.findOne({ _id: req.params.id });

    let ext = '.jpeg';
    let dateTime = new Date(user.createdAt);
    const fileN = `${slugify(user.fullName+" "+dateTime.getTime().toString())}${ext}`;
    let finalFile = `/uploads/users/thumbnails/${fileN}`;

    let pathstr = __dirname;
    pathstr = pathstr.substr(0, pathstr.indexOf('/routes'));

    const image = sharp(`${path.join(pathstr, 'public')}${user.image.original}`);
        image
            .metadata()
            .then((metadata) => {
            return image
                    .extract({ left: parseInt(x, 10), top: parseInt(y, 10), width: parseInt(width, 10), height: parseInt(height, 10) })
                    .resize(300, 300)
                    .webp()
                    .toBuffer();
            })
            .then(data => {
                fs.writeFile(`${path.join(pathstr, 'public')}${finalFile}`, data, async (err) => {
                    if(err) {
                        return console.log(err);
                    }
                    user.image.thumbnail = finalFile;
                    await user.save();
                    res.send('OK');
                });
            }).catch(err => {
                console.log(err);
                res.json({err: 'An error occured'});
            });
});

router.post('/users/crop-picture/:id', verifyToken, async (req, res) => {
  
  if (Object.keys(req.files).length == 0) {
    return res.status(400).send('No files were uploaded.');
  }

  const user = await User.findOne({ _id: req.params.id });
  let dateTime = new Date(user.createdAt);

  let file = req.files.file;
  let ext = '.jpeg';
  const fileN = `${slugify(user.fullName+" "+dateTime.getTime().toString())}${ext}`;
  let finalFile = `/uploads/users/thumbs/${fileN}`;

  let pathstr = __dirname;
  pathstr = pathstr.substr(0, pathstr.indexOf('/routes'));

  file.mv(`${path.join(pathstr, 'public')}${finalFile}`, async (err) => {
    if (err){
        res.send(err.message);
    } else {
      const image = sharp(`${path.join(pathstr, 'public')}${finalFile}`);
      image
          .metadata()
          .then(function(metadata) {
          return image
          .resize({
              width: 300,
              height: 300,
              fit: sharp.fit.cover,
              position: sharp.strategy.entropy
              })
              .webp()
              .toBuffer();
          })
          .then(data => {
              fs.writeFile(`${path.join(pathstr, 'public')}${finalFile}`, data, async (err) => {
                  if(err) {
                      return console.log(err);
                  }
                  user.photoUrl = finalFile;
                  await user.save();
                  res.json({ status: 'picture cropped' });
              });
          }).catch(err => {
              console.log(err);
              res.json({err: err});
          });
      }
  });
});

module.exports = router;