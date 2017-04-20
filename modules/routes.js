var express = require( 'express' ),
    router = express.Router(),
    bodyparser = require("body-parser");

//Application page
router.get('/', function(req, res){
  res.render('index');
});

module.exports = router;
