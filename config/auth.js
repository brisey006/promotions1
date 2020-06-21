const jwt = require("jsonwebtoken");
const User = require('../models/user');

const roles = {
  SUPER: 'super-user',
  ADMIN: 'administrator',
  BASIC: 'basic'
}

function verifyToken(req, res, next) {
  const error = new Error(JSON.stringify(['Invalid token. Login Again!']));

  const bearerHeader = req.headers['authorization'];
  if(typeof bearerHeader !== 'undefined') {
    let bearerToken;
    if (bearerHeader.indexOf(' ') > -1) {
      const bearer = bearerHeader.split(' ');
      bearerToken = bearer[1];
    } else {
      bearerToken = bearerHeader;
    }
    
    jwt.verify(bearerToken, process.env.JWT_KEY, async (err, authData) => {
      try {
        if(err) {
          const error = new Error(JSON.stringify([err.message]));
          error.status = 403;
          next(error);
        } else {
          const user = await User.findOne({ _id: authData.id });

          if (user != null) {
            req.user = {
              token: bearerToken,
              ...user._doc
            };
            next();
          } else {
            error.status = 403;
            next(error);
          }
        }
      } catch (e) {

      }
    });
  } else {
    error.status = 403;
    next(error);
  }

}

module.exports = {
  verifyToken
}