const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const UserSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    fullName: {
        type: String,
        index: true
    },
    bio: String,
    email: {
        type: String,
        validate: {
            validator: function(v) {
              return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(v);
            },
            message: props => `${props.value} is not a valid email address!`
        },
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true
    },
    physicalAddress: String,
    phoneNumber: String,
    image: {
        original: {
            type: String,
            default: '/assets/images/users/avatar_placeholder.jpg'
        },
        thumbnail: {
            type: String,
            default: '/assets/images/users/avatar_placeholder.jpg'
        },
    },
    tempPhotoUrl: String,
    gender: String,
    userType: String,
    hashId: String,
    dateOfBirth: Date,
    website: String,
    country: String,
    shopPages: {
        type: Number,
        default: 0
    },
    promotions: {
        type: Number,
        default: 0
    },
    temporaryPassword: {
        type: Boolean,
        default: true
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
    timestamps: true
});

UserSchema.plugin(mongoosePaginate);
const User = mongoose.model('User', UserSchema);

module.exports = User;