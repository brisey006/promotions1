const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const TagSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        index: true,
        unique: true
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
    timestamps: true
});

TagSchema.plugin(mongoosePaginate);
const Tag = mongoose.model('Tag', TagSchema);

module.exports = Tag;