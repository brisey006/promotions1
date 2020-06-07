const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const ActionSchema = new mongoose.Schema({
    performer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: {
        type: String,
        required: true,
        index: true
    },
    model: String,
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed
}, {
    timestamps: true
});

ActionSchema.plugin(mongoosePaginate);
const Action = mongoose.model('Action', ActionSchema);

module.exports = Action;