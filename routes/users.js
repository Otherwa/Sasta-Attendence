const express = require('express');
const router = express.Router();

/* * GET users listing. */
router.get('/', function (req, res, next) {
  // ? Async await function forwards to index routes
  res.send('respond with a resource');
});

module.exports = router;
