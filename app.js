// Load the SDK and UUID
var AWS = require('aws-sdk');
var uuid = require('uuid');

var express = require('express')
var multer = require('multer')
var multerS3 = require('multer-s3')
var bodyParser = require('body-parser');
 
var app = express()
AWS.config.loadFromPath('./config.json');
var rekognition = new AWS.Rekognition({apiVersion: process.env.API_VERSION, region: 'us-east-2'});
const dotenv = require('dotenv');
dotenv.config();

var s3 = new AWS.S3();
var listenPort = process.env.PORT;
app.use(express.static('public'));
app.use(bodyParser.json({limit: '100mb'}));
app.use(bodyParser.urlencoded({ extended: true , limit: '100mb', parameterLimit: 500000}));
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

var upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.AWS_BUCKET,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: function (req, file, cb) {
            console.log(file);
            console.log(file.originalurl);
            var A = Date.now();
            console.log(cb);
            console.log(req);
            cb(null, A + file.originalname); //use Date.now() for unique file keys
        }
    })
});
var cpUpload = upload.fields([{ name: 'imgSelfie', maxCount: 1 }, { name: 'imgIDCard', maxCount: 1 }])
app.post('/faceCompare', cpUpload, function(req, res, next) {
	console.log(req.files['imgSelfie']);
	 var params = {
	  SimilarityThreshold: 20, 
	  SourceImage: {
	   S3Object: {
	    Bucket: process.env.AWS_BUCKET, 
	    Name: req.files['imgSelfie'][0].key
	   }
	  }, 
	  TargetImage: {
	   S3Object: {
	    Bucket: process.env.AWS_BUCKET, 
	    Name: req.files['imgIDCard'][0].key
	   }
	  }
	 };
	 let x = 0;
	 rekognition.compareFaces(params, function(err, data) {
	   if (err){
	   	console.log(err, err.stack); // an error occurred
	   } 
	   else {
	   	let result = {
	   		statusCode:200,
	   		data: data
	   	}
		res.json(result);
	   }
	});


});
var cpUpload2 = upload.fields([{ name: 'imgSelfie', maxCount: 1 }])
//วิเคราะห์คนดัง
/*params
{ต้องการ file ชื่อ imgSelfie 1 ตัว}
*/
app.post('/recognizeCelebrity', cpUpload2, function(req, res, next) {
	var params = {
		Image: {
		  S3Object: {
			Bucket: process.env.AWS_BUCKET, 
			Name: req.files['imgSelfie'][0].key
		  }
		}
	  };
	  rekognition.recognizeCelebrities(params, function(err, data) {
		if (err) console.log(err, err.stack); // an error occurred
		else  {
			let result = {
				statusCode:200,
				data: data
			}
		 res.json(result);
		}          // successful response
	  });


});
//วิเคราะห์องประกอบในภาพ
/*params
{ต้องการ file ชื่อ imgSelfie 1 ตัว}
*/
app.post('/analysis', cpUpload2, function(req, res, next) {
	var params = {
		Image: {
		 S3Object: {
			Bucket: process.env.AWS_BUCKET, 
			Name: req.files['imgSelfie'][0].key
		 }
		}, 
		MaxLabels: 123, 
		MinConfidence: 70
	   };
	   rekognition.detectLabels(params, function(err, data) {
		 if (err) console.log(err, err.stack); // an error occurred
		 else {
			let result = {
				statusCode:200,
				data: data
			}
		 res.json(result);
		 }
		});
});

app.listen(listenPort, function () {
    console.log('Admin webserver listening on port ' + listenPort);
});

