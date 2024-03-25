const express = require('express');
const router = express.Router();

/* * GET home page. */
router.get('/', function (req, res) {
  //? Async await function forwards to index routes
  const REMOTE_URL = process.env.REMOTE_URL;
  console.log(REMOTE_URL);
  res.cookie("REMOTEURL", REMOTE_URL)
  res.render('index');
});

module.exports = router;
