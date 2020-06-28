const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const PromotionSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        index: true
    },
    description: String,
    slug: {
        type: String,
        index: true,
        required: true,
        unique: true
    },
    image: {
        original: String,
        thumbnail: {
            type: String,
            default: '/assets/images/promotions/placeholder.png'
        },
        cropped: String
    },
    originalPrice: Number,
    discountedPrice: Number,
    discount: Number,
    active: {
        type: Boolean,
        default: true
    },
    expiry: Date,
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller' },
    tags: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tag' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
    timestamps: true
});

PromotionSchema.plugin(mongoosePaginate);
const Promotion = mongoose.model('Promotion', PromotionSchema);

module.exports = Promotion;