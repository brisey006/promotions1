const express = require('express');
const router = express.Router();

const slugify = require('../../functions/index').slugify;
const verifyToken = require('../../config/auth').verifyToken;

const Seller = require('../../models/seller');
const User = require('../../models/user');

router.post('/', verifyToken, async (req, res) => {
    const { name, description, administrator } = req.body;
    const createdBy = req.user._id;
    const slug = slugify(name);
    const errors = [];

    if (!name) {
        errors.push({ name: 'Seller name required.' });
    }

    if (!description) {
        errors.push({ description: 'Seller description is required.' });
    }

    if (!administrator) {
        errors.push({ administrator: 'Administrator is required.' });
    }

    if (errors.length == 0) {
        try {
            const seller = new Seller({ ...req.body, name, description, administrator, slug, createdBy });
            await seller.save();
            res.json(seller);
        } catch (err) {
            if (err.code == 11000) {
                const errors = [{ general: 'Seller already exists' }];
                res.json({ errors });
            }
        }
    } else {
        res.json({ errors });
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
    let result = await Seller.deleteOne({ _id: req.params.id });
    res.json({
        status: 'deleted',
        details: result
    });
});

router.put('/:id', verifyToken, async (req, res) => {
    let data = req.body;
    let result = await Seller.updateOne({ _id: req.params.id }, { $set: data });
    res.json(result);
});

module.exports = router;