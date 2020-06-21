const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const ImageUploadSetting = require('../../models/image-upload-setting');

const verifyToken = require('../../config/auth').verifyToken;
const slugify = require('../../functions/index').slugify;
const imageKeys = require('../../data/image-settings');

router.post('/', verifyToken, async (req, res, next) => {
    let { name, aspectRatio, maxSize, crop } = req.body;
    try {
        const errors = [];

        if (!name) {
            errors.push("Select Route.");
        }

        if (!aspectRatio) {
            errors.push("Choose the aspect ratio.");
        }

        if (!maxSize) {
            maxSize = 2048;
        }
        
        if (crop.length != undefined) {
            errors.push("Select if image is to be cropped.");
        }

        if (errors.length == 0) {
            const slug = slugify(name);
            const createdBy = req.user._id;

            let originalPath = '';
            let croppedPath = '';
            let thumbnailsPath = '';

            const publicDir = req.app.locals.publicDir;
            const baseUploadsPath = path.join(publicDir, 'uploads');
            let uploadsPath = path.join(baseUploadsPath, slug);

            if (!fs.existsSync(uploadsPath)) {
                fs.mkdirSync(uploadsPath);
            }

            originalPath = path.join(uploadsPath, 'original');
            croppedPath = path.join(uploadsPath, 'cropped');
            thumbnailsPath = path.join(uploadsPath, 'thumbnails');

            if (!fs.existsSync(originalPath)) {
                fs.mkdirSync(originalPath);
            }

            if (!fs.existsSync(croppedPath)) {
                fs.mkdirSync(croppedPath);
            }

            if (!fs.existsSync(thumbnailsPath)) {
                fs.mkdirSync(thumbnailsPath);
            }

            originalPath = originalPath.substring(publicDir.length, originalPath.length).replace(/\\/g, '/');
            croppedPath = croppedPath.substring(publicDir.length, croppedPath.length).replace(/\\/g, '/');
            thumbnailsPath = thumbnailsPath.substring(publicDir.length, thumbnailsPath.length).replace(/\\/g, '/');

            aspectRatio = aspectRatio.split(':');
            const imageUploadSetting = new ImageUploadSetting({ name, slug, crop, croppedPath, originalPath, thumbnailsPath, aspectRatio, maxSize, createdBy });
            await imageUploadSetting.save();

            res.json(imageUploadSetting);
        } else {
            const error = new Error(JSON.stringify(errors));
            error.status = 406;
            next(error);
        }
    } catch (e) {
        if (e.code == 11000) {
            const errors = [`Setting for route '${name}' already available!`];
            const error = new Error(JSON.stringify(errors));
            error.status = 406;
            next(error);
        } else {
            const error = new Error(JSON.stringify([e.message]));
            next(error);
        }
    }
});

router.get('/', verifyToken, async (req, res) => {
    const page = req.query.page != undefined ? req.query.page : 1;
    const limit = req.query.limit != undefined ? req.query.limit : 10;
    const query = req.query.query != undefined ? req.query.query : '';
    const sortBy = req.query.sort != undefined ? req.query.sort : 'createdAt';
    const order = req.query.order != undefined ? req.query.order : -1;

    const re = new RegExp(query, "gi");

    let imageSettings = await ImageUploadSetting.paginate(
        { name: re },
        {
            limit,
            page,
            sort: { [sortBy]: order },
        }
    );
    res.json(imageSettings);
});

router.get('/:slug', verifyToken, async (req, res, next) => {
    try {
        const imageSetting = await ImageUploadSetting.findOne({ slug: req.params.slug });
        res.json(imageSetting);
    } catch (e) {
        const error = new Error(JSON.stringify([e.message]));
        next(error);
    }
});

router.get('/keys/all', verifyToken, (req, res, next) => {
    res.json(imageKeys);
});

router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const data = await ImageUploadSetting.findOne({  _id: req.params.id });
        let result = await ImageUploadSetting.deleteOne({ _id: req.params.id });
        if (result.deletedCount == 1) {
            res.json(data);
        } else {
            const error = new Error(JSON.stringify(['Image setting not found']));
            error.status = 404;
            next(error);
        }
    } catch (e) {
        const error = new Error(JSON.stringify([e.message]));
        next(error);
    }
});

module.exports = router;