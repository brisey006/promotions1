const Action = require('../models/action');

const slugify = (text) => {
    if (!text)
      return "";
    return text.toString().toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
}

const camelCase = (text) => {
    return text.replace(/-([a-z])/g, (g) => { 
        return g[1].toUpperCase(); 
    });
}

const userAction = (performer, action, model, before, after) => {
    const ac = new Action({performer, action, model, before, after});
    return ac.save();
}

module.exports = {
    slugify,
    camelCase,
    userAction
};