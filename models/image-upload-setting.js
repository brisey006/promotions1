const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const ImageUploadSettingSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        index: true,
    },
    slug: {
        type: String,
        required: true,
        index: true,
        unique: true
    },
    crop: Boolean,
    croppedPath: String,
    originalPath: String,
    thumbnailsPath: String,
    aspectRatio: [Number],
    maxSize: Number,
    thumbnailWidth: Number,
    croppedWidth: Number,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
    timestamps: true
});

ImageUploadSettingSchema.plugin(mongoosePaginate);
const ImageUploadSetting = mongoose.model('ImageUploadSetting', ImageUploadSettingSchema);

module.exports = ImageUploadSetting;