const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const fileUpload = require('express-fileupload');
const session = require('express-session');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');

require('dotenv').config();

const app = express();

const port = process.env.PORT || 5000;

app.use(morgan('dev'));
app.use(cors());
app.use(fileUpload());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(session({ 
    secret: process.env.SESSION_KEY, 
    resave: true,
    saveUninitialized: true,
}));

mongoose.connect(`mongodb://${process.env.DB_PATH || 'localhost'}:27017/promotions`, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true,
    useCreateIndex: true
}, () => {
    console.log('MongoDb running...');
});

app.use(express.static(path.join(__dirname, 'public')));

app.use('/', require('./routes/index'));
app.use('/setup', require('./setup/init'));

app.use((req, res, next) => {
    const error = new Error('Not Found');
    error.status = 404;
    next(error);
});

app.use((error, req, res, next) => {
    res.status(error.status || 500);
    res.json({
        message: error.message
    });
});

app.listen(port, () => {
    console.log(`App running at port ${port}`);
});