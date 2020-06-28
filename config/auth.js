const jwt = require("jsonwebtoken");
const User = require('../models/user');

const roles = {
  SUPER_USER: 'super-user',
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
    });
  } else {
    error.status = 403;
    next(error);
  }
}

function isSuperAdmin(req, res, next) {
  try {
    if (req.user.userType == roles.SUPER_USER) {
      next();
    } else {
      const error = new Error(JSON.stringify(['You do not have enough permissions.']));
      error.status = 403;
      next(error);
    }
  } catch (e) {
    const error = new Error(JSON.stringify([e.message]));
    next(error);
  }
}

function ownDocument(user, docUser, next) {
  if (user._id == docUser) {
    return;
  } else {
    const error = new Error(JSON.stringify(['You do not have enough permissions.']));
    error.status = 403;
    next(error);
  }
}

module.exports = {
  verifyToken,
  isSuperAdmin,
  ownDocument,
  roles,
}