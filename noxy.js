var http = require('http');
var https = require('https');
var zlib = require('zlib');
var request = require('request');
var url = require('url');
var readline = require('readline');
var StringDecoder = require('string_decoder').StringDecoder;
var through = require('through');
var jade = require('jade');
var fs = require('fs');

var mainhost = process.env.HOST || 'localhost';

function getEncoding (buffer) {
  var charCode, contentStartBinary, contentStartUTF8, encoding, i, _i, _ref;
  contentStartBinary = buffer.toString('binary', 0, 24);
  contentStartUTF8 = buffer.toString('utf8', 0, 24);
  encoding = 'utf8';
  for (i = _i = 0, _ref = contentStartUTF8.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
    charCode = contentStartUTF8.charCodeAt(i);
    if (charCode === 65533 || charCode <= 8) {
      encoding = 'binary';
      break;
    }
  }
  return encoding;
}

function getter (protocol) {
  if (protocol === 'http:')
    return http;
  else if (protocol === 'https:')
    return https;
}

http.createServer(function (req, res) {
  var html = jade.renderFile('./noxy.jade', {pretty: false, name: 'noxy'});
  if (req.url.slice(0,6) !== '/?url=') {
    var ts = through(function write (data) { this.emit('data', data); }, function end () { this.emit('end'); });
    // ts.pipe(zlib.createGzip({level: zlib.Z_BEST_COMPRESSION})).pipe(res);
    ts.pipe(res);
    // res.writeHead(200, {'content-encoding': 'gzip', 'content-type': 'text/html'});
    res.writeHead(200, {'content-type': 'text/html'});
    ts.end(html);
  } else {
    var _url = url.parse(req.url, true);
    var parsed = url.parse(_url.query.url, true);
    var hostname = parsed.hostname;
    var path = parsed.path.replace(/\/\//g, '/');
    var protocol = parsed.protocol;
    
    var options = {
      hostname: hostname,
      path: path,
      port: protocol === 'http:' ? 80 : 443,
      method: 'GET',
      headers: {
        'user-agent': req.headers['user-agent']
      }
    };

    res.writeHead(200, {'content-encoding': 'gzip'});

    getter(protocol).request(options, function (pres) {
      var ts = through(function write (data) { this.emit('data', data); }, function end () { this.emit('end'); });

      var buffer = "";
      var decoder = new StringDecoder('utf8');
      pres.on('data', function (data) {
        if (data.slice(0,1).toString() === '�') {
          ts.write(data);
        } else if (getEncoding(data) === 'utf8') {
          buffer += data.toString();
          var lines = buffer.split(/\r?\n/);
          buffer = lines.pop();
          
          for (var l = 0; l < lines.length; l++) {
            var line = lines[l];
            if (line.match(/(src=")(?!http\:\/\/)/g)) {
              line = line.replace(/(src=")(?!http\:\/\/)/g, 'src="http://'+mainhost+':1337/?url=http://'+url.parse(_url.query.url, true).hostname+'/');
            } else if (line.match(/(href=")(?!http\:\/\/)/g)) {
              line = line.replace(/(href=")(?!http\:\/\/)/g, 'href="http://'+mainhost+':1337/?url=http://'+url.parse(_url.query.url, true).hostname+'/');
            }
            if (_url.query.img === "false") {
              if (line.match(/(<img)/g)) {
                line = line.replace(/(<img)/g, '<img_');
              }
            }
            ts.write(line);
          }
        } else {
          ts.write(data);
        }
      });
      pres.on('end', function () {
        ts.end();
      });
      pres.on('error', function (e) {
        throw e;
      });
      ts.pipe(zlib.createGzip({level: zlib.Z_BEST_COMPRESSION})).pipe(res);
    }).end();
  }
}).listen(1337);