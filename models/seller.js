const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const SellerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        index: true,
    },
    description: String,
    address: String,
    cell: String,
    tell: String,
    email: String,
    country: String,
    city: String,
    location: {
        lat: Number,
        long: Number
    },
    slug: {
        type: String,
        unique: true,
        required: true
    },
    image: {
        original: String,
        thumbnail: {
            type: String,
            default: '/assets/images/sellers/placeholder.png'
        },
        cropped: String
    },
    promotions: {
        type: Number,
        default: 0
    },
    administrator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    managers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
    timestamps: true
});

SellerSchema.plugin(mongoosePaginate);
const Seller = mongoose.model('Seller', SellerSchema);

module.exports = Seller;