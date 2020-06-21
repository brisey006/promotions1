const express = require('express');
const router = express.Router();
const path = require('path');

const slugify = require('../../functions/index').slugify;
const verifyToken = require('../../config/auth').verifyToken;
const imageSettings = require('../../data/image-settings');

const Seller = require('../../models/seller');
const User = require('../../models/user');
const ImageUploadSetting = require('../../models/image-upload-setting');

router.post('/', verifyToken, async (req, res, next) => {
    const { name, description, administrator } = req.body;
    const createdBy = req.user._id;
    const slug = slugify(name);
    const errors = [];

    if (!name) {
        errors.push('Seller name required.');
    }

    if (!description) {
        errors.push('Seller description is required.');
    }

    if (!administrator) {
        errors.push('Administrator is required.');
    }

    if (errors.length == 0) {
        try {
            const seller = new Seller({ ...req.body, name, description, administrator, slug, createdBy });
            await seller.save();
            res.json(seller);
        } catch (err) {
            if (err.code == 11000) {
                const errors = ['Seller already exists'];
                const error = new Error(JSON.stringify(errors));
                error.status = 406;
                next(error);
            }
        }
    } else {
        const error = new Error(JSON.stringify(errors));
        error.status = 406;
        next(error);
    }
});

router.get('/search-users', async (req, res) => {
    const page = req.query.page != undefined ? req.query.page : 1;
    const limit = req.query.limit != undefined ? req.query.limit : 20;
    const query = req.query.query;

    const re = new RegExp(query, "gi");

    let users = await User.paginate(
        { fullName: re, userType: 'Seller' },
        {
            limit,
            page,
            select: 'fullName image'
        }
    );
    res.json(users);
});

router.get('/', verifyToken, async (req, res) => {
    const page = req.query.page != undefined ? req.query.page : 1;
    const limit = req.query.limit != undefined ? req.query.limit : 10;
    const query = req.query.query != undefined ? req.query.query : '';
    const sortBy = req.query.sort != undefined ? req.query.sort : 'createdAt';
    const order = req.query.order != undefined ? req.query.order : -1;

    const re = new RegExp(query, "gi");

    let sellers = await Seller.paginate(
        { name: re },
        {
            limit,
            page,
            sort: { [sortBy]: order },
            populate: {
                path: 'administrator',
                select: ['fullName', 'photoUrl']
            }
        }
    );
    res.json(sellers);
});

router.get('/:slug', verifyToken, async (req, res) => {
    let seller = await Seller
    .findOne({ slug: req.params.slug })
    .populate({
        path: 'administrator',
        select: ['fullName', 'photoUrl']
    });
    res.json(seller);
});

router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const data = await Seller.findOne({  _id: req.params.id });
        let result = await Seller.deleteOne({ _id: req.params.id });
        if (result.deletedCount == 1) {
            res.json(data);
        } else {
            const error = new Error(JSON.stringify(['Seller not found']));
            error.status = 404;
            next(error);
        }
    } catch (e) {
        const error = new Error(JSON.stringify([e.message]));
        next(error);
    }
});

router.put('/:id', verifyToken, async (req, res, next) => {
    try {
        let data = req.body;
        let result = await Seller.updateOne({ _id: req.params.id }, { $set: data });
        if (result.nModified == 1) {
            let newData = await Seller.findOne({ _id: req.params.id }).populate({
                path: 'administrator',
                select: ['fullName', 'photoUrl']
            });;
            res.json(newData);
        } else {
            const errors = ['Seller failed to update. Please try again later!'];
            const error = new Error(JSON.stringify(errors));
            error.status = 406;
            next(error);
        }
    } catch (e) {
        const error = new Error(JSON.stringify([e.message]));
        next(error);
    }
});

router.post('/:id/image', verifyToken, async (req, res, next) => {
    try {
        if (Object.keys(req.files).length == 0) {
            return res.status(400).send('No files were uploaded.');
        }
    
        const settings = await ImageUploadSetting.findOne({ slug: imageSettings.SHOPS.key });
        const seller = await Seller.findOne({ _id: req.params.id });
        
        let file = req.files.file;
        let fileName = req.files.file.name;
        let ext = path.extname(fileName);
    
        let dateTime = new Date(seller.createdAt);
    
        const fileN = `${slugify(seller.slug+" "+dateTime.getTime().toString())}${ext}`;
    
        let finalFile = `${settings.originalPath}/${fileN}`;
    
        const publicDir = req.app.locals.publicDir;
        
        file.mv(path.join(publicDir, finalFile), async (err) => {
        if (err){
            const error = new Error(JSON.stringify([err.message]));
            next(error);
        } else {
            seller.image.original = finalFile;
            await seller.save();
            res.json({ status: 'picture uploaded' });
        }
        });
    } catch (e) {
        const error = new Error(JSON.stringify([e.message]));
        next(error);
    }
});

router.post('/:id/image/crop', async (req, res) => {
    sharp.cache(false);
    const { width, height, x, y, scaleX, scaleY } = req.body;
    const settings = await ImageUploadSetting.findOne({ slug: imageSettings.SHOPS.key });
    const seller = await Seller.findOne({ _id: req.params.id });

    let ext = '.jpg';
    let dateTime = new Date(seller.createdAt);
    const fileN = `${slugify(seller.slug+" "+dateTime.getTime().toString())}${ext}`;
    let finalFile = `${settings.thumbnailsPath}/${fileN}`;
    let finalFile2 = `${settings.croppedPath}/${fileN}`;

    const publicDir = req.app.locals.publicDir;

    const image = sharp(path.join(pathstr, seller.image.original));
    image.metadata()
        .then((metadata) => {
        return image
                .extract({ left: parseInt(x, 10), top: parseInt(y, 10), width: parseInt(width, 10), height: parseInt(height, 10) })
                .resize(300, 300)
                .webp()
                .toBuffer();
        })
        .then(data => {
            fs.writeFile(path.join(publicDir, finalFile), data, async (err) => {
                if(err) {
                    return console.log(err);
                }
                seller.image.thumbnail = finalFile;
                await seller.save();
                
                
                const image2 = sharp(`${path.join(pathstr, 'public')}${seller.image.original}`);
                image2.metadata()
                    .then((metadata) => {
                    return image2
                            .extract({ left: parseInt(x, 10), top: parseInt(y, 10), width: parseInt(width, 10), height: parseInt(height, 10) })
                            .resize(900, 900)
                            .webp()
                            .toBuffer();
                    })
                    .then(data => {
                        fs.writeFile(path.join(publicDir, finalFile2), data, async (err) => {
                            if(err) {
                                return console.log(err);
                            }
                            seller.image.cropped = finalFile2;
                            await seller.save();
                            res.send('OK');
                        });
                    }).catch(err => {
                        console.log(err);
                        res.json({err: 'An error occured'});
                    });
            });
        }).catch(err => {
            console.log(err);
            res.json({err: 'An error occured'});
        });
});

module.exports = router;