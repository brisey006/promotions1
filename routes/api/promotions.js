const express = require('express');
const router = express.Router();
const fs = require('fs');
const sharp = require('sharp');
const path = require('path');

const verifyToken = require('../../config/auth').verifyToken;
const slugify = require('../../functions/index').slugify;

const Promotion = require('../../models/promotion');
const Tag = require('../../models/tag');
const Seller = require('../../models/seller');

router.get('/video', verifyToken, (req, res) => {
    const path = 'public/uploads/nf.mp4';
    const stat = fs.statSync(path);
    const fileSize = stat.size
    const range = req.headers.range
    if (range) {
        const parts = range.replace(/bytes=/, "").split("-")
        const start = parseInt(parts[0], 10)
        const end = parts[1]
            ? parseInt(parts[1], 10)
            : fileSize - 1
        const chunksize = (end - start) + 1
        const file = fs.createReadStream(path, { start, end })
        const head = {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': 'video/mp4',
        }
        res.writeHead(206, head);
        file.pipe(res);
    } else {
        const head = {
            'Content-Length': fileSize,
            'Content-Type': 'video/mp4',
        }
        res.writeHead(200, head)
        fs.createReadStream(path).pipe(res)
    }
});

router.post('/', verifyToken, async (req, res) => {
    const { title, description, seller, originalPrice, discountedPrice, tagsArray, expiry } = req.body;
    const createdBy = req.user._id;
    const slug = slugify(title);
    const errors = [];

    if (!title) {
        errors.push({ title: 'Promotion title is required.' });
    }

    if (!seller) {
        errors.push({ seller: 'Seller is required.' });
    }

    if (!originalPrice) {
        errors.push({ originalPrice: 'Original price is required.' });
    }

    if (!discountedPrice) {
        errors.push({ discountedPrice: 'Discounted price is required.' });
    }

    if (!expiry) {
        errors.push({ expiry: 'Promotion expiry date required.' });
    }

    if (errors.length == 0) {
        const isPromotionAvailable = await Promotion.findOne({ slug, seller });
        if (!isPromotionAvailable) {
            const tags = [];
            if (tagsArray.length > 0) {
                for (let i = 0; i < tagsArray.length; i++) {
                    const name = tagsArray[i].toLowerCase();
                    const tag = await Tag.findOne({ name });

                    if (tag) {
                        tags.push(tag._id);
                    } else {
                        const newTag = new Tag({ name });
                        await newTag.save();
                        tags.push(newTag._id);
                    }
                }
            }
            const promotion = new Promotion({ title, description, seller, slug, originalPrice, discountedPrice, tags, createdBy, expiry });
            await promotion.save();
            const sellerSlug = (await Seller.findOne({ _id: seller })).slug;
            res.json({ ...promotion._doc, sellerSlug });
        } else {
            res.json({ errors: [{ general: `Promotion named ${title} is already available` }] });
        }
    } else {
        res.json({ errors });
    }
});

router.get('/', async (req, res) => {
    const page = req.query.page != undefined ? req.query.page : 1;
    const limit = req.query.limit != undefined ? req.query.limit : 10;
    const query = req.query.query != undefined ? req.query.query : '';
    const sortBy = req.query.sort != undefined ? req.query.sort : 'createdAt';
    const order = req.query.order != undefined ? req.query.order : -1;

    const re = new RegExp(query, "gi");

    let promotions = await Promotion.paginate(
        {
            title: re
        },
        {
            limit,
            sort: { [sortBy]: order },
            page,
            populate: [
                {
                    path: 'seller',
                    select: ['name', 'logoUrl', 'slug']
                },
                {
                    path: 'tags',
                    select: ['name']
                }
            ]
        }
    );
    res.json(promotions);
});

router.get('/seller/:seller', async (req, res) => {
    const page = req.query.page != undefined ? req.query.page : 1;
    const limit = req.query.limit != undefined ? req.query.limit : 20;

    const seller = await Seller.findOne({ slug: req.params.seller });

    let promotions = await Promotion.paginate(
        { seller: seller._id },
        {
            limit,
            page,
            populate: [
                {
                    path: 'seller',
                    select: ['name', 'logoUrl']
                },
                {
                    path: 'tags',
                    select: ['name']
                }
            ]
        }
    );
    res.json(promotions);
});

router.get('/search', async (req, res) => {
    const page = req.query.page != undefined ? req.query.page : 1;
    const limit = req.query.limit != undefined ? req.query.limit : 20;
    const query = req.query.query;

    const re = new RegExp(query, "gi");

    let promotions = await Promotion.paginate(
        { title: re },
        {
            limit,
            page,
            populate: [
                {
                    path: 'seller',
                    select: ['name', 'logoUrl']
                },
                {
                    path: 'tags',
                    select: ['name']
                }
            ]
        }
    );
    res.json(promotions);
});

router.get('/:id', async (req, res) => {
    let promotion = await Promotion
        .findOne({ _id: req.params.id })
        .populate([
            {
                path: 'seller',
                select: ['name', 'logoUrl']
            },
            {
                path: 'tags',
                select: ['name']
            }
        ]);
    res.json(promotion);
});

router.get('/promo/:slug', async (req, res) => {
    let promotion = await Promotion
        .findOne({ slug: req.params.slug })
        .populate([
            {
                path: 'seller',
                select: ['name', 'logoUrl']
            },
            {
                path: 'tags',
                select: ['name']
            }
        ]);
    res.json(promotion);
});

router.delete('/:id', verifyToken, async (req, res) => {
    let result = await Promotion.deleteOne({ _id: req.params.id });
    res.json({
        status: 'deleted',
        details: result
    });
});

router.put('/:id', verifyToken, async (req, res) => {
    const id = req.params.id;
    const { tagString } = req.body;
    let tagsArray = [];
    const tags = [];

    if (tagString != undefined) {
        tagsArray = tagString.split(', ');
    }

    if (tagsArray.length > 0) {
        for (let i = 0; i < tagsArray.length; i++) {
            const name = tagsArray[i].toLowerCase();
            const tag = await Tag.findOne({ name });

            if (tag) {
                tags.push(tag._id);
            } else {
                const newTag = new Tag({ name });
                await newTag.save();
                tags.push(newTag._id);
            }
        }
    }

    const result = await Promotion.updateOne({ _id: id }, { $set: { tags, ...req.body } });
    res.json(result);
});

router.post('/:id/image', verifyToken, async (req, res) => {
  
    if (Object.keys(req.files).length == 0) {
      return res.status(400).send('No files were uploaded.');
    }
  
    const promotion = await Promotion.findOne({ _id: req.params.id });
  
    let file = req.files.file;
    let fileName = req.files.file.name;
    let ext = path.extname(fileName);
  
    let dateTime = new Date(promotion.createdAt);
  
    const fileN = `${slugify(promotion.slug+" "+dateTime.getTime().toString())}${ext}`;
  
    let finalFile = `/uploads/promotions/original/${fileN}`;
  
    let pathstr = __dirname;
    pathstr = pathstr.substr(0, pathstr.indexOf('/routes'));
    
    file.mv(`${path.join(pathstr, 'public')}${finalFile}`, async (err) => {
      if (err){
          res.send(err.message);
      } else {
        promotion.image.original = finalFile;
        await promotion.save();
        res.json({ status: 'picture uploaded' });
      }
    });
});

router.post('/:id/image/crop', async (req, res) => {
    sharp.cache(false);
    const { width, height, x, y, scaleX, scaleY } = req.body;
    const promotion = await Promotion.findOne({ _id: req.params.id });

    let ext = '.jpg';
    let dateTime = new Date(promotion.createdAt);
    const fileN = `${slugify(promotion.slug+" "+dateTime.getTime().toString())}${ext}`;
    let finalFile = `/uploads/promotions/thumbs/${fileN}`;
    let finalFile2 = `/uploads/promotions/cropped/${fileN}`;

    let pathstr = __dirname;
    pathstr = pathstr.substr(0, pathstr.indexOf('/routes'));

    const image = sharp(`${path.join(pathstr, 'public')}${promotion.image.original}`);
    image.metadata()
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
                promotion.image.thumb = finalFile;
                await promotion.save();
                
                
                const image2 = sharp(`${path.join(pathstr, 'public')}${promotion.image.original}`);
                image2.metadata()
                    .then((metadata) => {
                    return image2
                            .extract({ left: parseInt(x, 10), top: parseInt(y, 10), width: parseInt(width, 10), height: parseInt(height, 10) })
                            .resize(900, 900)
                            .webp()
                            .toBuffer();
                    })
                    .then(data => {
                        fs.writeFile(`${path.join(pathstr, 'public')}${finalFile2}`, data, async (err) => {
                            if(err) {
                                return console.log(err);
                            }
                            promotion.image.cropped = finalFile2;
                            await promotion.save();
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