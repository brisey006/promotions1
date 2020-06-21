const express = require('express');
const router = express.Router();

const Article = require('../../models/article');
const slugify = require('../../functions/index').slugify;

router.post('/', async (req, res, next) => {
    const { title, content } = req.body;
    const slug = slugify(title);
    const article = new Article({ title, slug, content });
    await article.save();
    res.json(article);
});

router.get('/', async (req, res, next) => {
    const articles = await Article.findOne({ _id: "5ee36b043805733ad4d1a245" });
    res.json(articles);
});

module.exports = router;