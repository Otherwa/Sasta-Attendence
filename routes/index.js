const express = require('express');
const router = express.Router();

/* GET home page. */
router.get('/', function (req, res, next) { //Async await function forwards to index routes
  res.render('index', { title: 'Express' });
});

module.exports = router;
