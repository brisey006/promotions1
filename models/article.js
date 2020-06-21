const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const ArticleSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        index: true,
        unique: true
    },
    slug: String,
    content: {
        type: Object
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
    timestamps: true
});

ArticleSchema.plugin(mongoosePaginate);
const Article = mongoose.model('Article', ArticleSchema);

module.exports = Article;