'use strict';
console.log('Loading function');
var aws = require('aws-sdk');
var fs = require('fs');
var marshaler = require('dynamodb-marshaler');
var s3 = new aws.S3();
var dynamo = new aws.DynamoDB({
    region: 'ap-northeast-1'
});
var date = new Date() ;
var tableName = "Dispatches";
var filepath = "/tmp/filepath";

exports.handler = (event, context, callback) => {
  var bucket = event.Records[0].s3.bucket.name;
  var key = event.Records[0].s3.object.key;
  s3.getObject({
    Bucket:bucket,
    Key:key
  },function(err,data) {
    if (err) {
      console.log(err);
    } else {
      fs.writeFileSync(filepath, String(data.Body));
      var exec = require('child_process').exec;
      var cmd = "iconv -f iso-2022-jp -t utf-8 " + filepath;
      var child = exec(cmd, function(err, stdout, stderr) {
        if (err) callback(err);
        if (stdout.match(/(博多区|中央区|南区|西区|早良区|城南区|東区)\s(.+)\s(.+)付近で(.+)のため/g)) {
          var params = {
            "ward" : RegExp.$1,
            "town" : RegExp.$2,
            "street" : RegExp.$3,
            "type" : RegExp.$4,
            "time" : String(date.getTime())
          };
          var dynamoRequest = {
              "TableName" : tableName
          };
          dynamoRequest.Item = marshaler.marshalItem(params);
          dynamo.putItem(dynamoRequest, function (err, data) {
              if (err) {
                  console.log('err:', JSON.stringify(err, null, 2));
                  context.fail(new Error('putItem query error occured'+ JSON.stringify(dynamoRequest, null, 2)));
              } else {
                  context.succeed(data);
              }
          });
        }
      });
    }
  });
  callback(null, 'done');
};
