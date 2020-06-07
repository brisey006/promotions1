const jwt = require("jsonwebtoken");
const User = require('../models/user');

const roles = {
  SUPER: 'super-user',
  ADMIN: 'administrator',
  BASIC: 'basic'
}

function verifyToken(req, res, next) {
  const bearerHeader = req.headers['authorization'];
  if(typeof bearerHeader !== 'undefined') {
    let bearerToken;
    if (bearerHeader.indexOf(' ') > -1) {
      const bearer = bearerHeader.split(' ');
      bearerToken = bearer[1];
    } else {
      bearerToken = bearerHeader;
    }
    
    jwt.verify(bearerToken, 'process.env.JWT_KEY', async (err, authData) => {
      try {
        if(err) {
          res.sendStatus(403);
        } else {
          const user = await User.findOne({ _id: authData.id });

          if (user != null) {
            req.user = {
              token: bearerToken,
              ...authData
            };
            next();
          } else {
            const error = new Error('Invalid token');
            error.status = 403;
            next(error);
          }
        }
      } catch (e) {

      }
    });
  } else {
    res.sendStatus(403);
  }

}

module.exports = {
  verifyToken
}