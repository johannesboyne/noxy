var http = require('http');
var https = require('https');
var zlib = require('zlib');
var url = require('url');
var through = require('through');

var mainhost = process.env.HOST || 'noxy-app.herokuapp.com';
var getEncoding = require('./src/bufferEncoding');
var noxyLanding = require('./src/noxyLanding');

function getter (protocol) {
  if (protocol === 'http:')
    return http;
  else if (protocol === 'https:')
    return https;
}

var gzippedHtml, gzippedHtmlInfo;
noxyLanding(function (landing, info) {
  gzippedHtml = landing;
  gzippedHtmlInfo = info;
});

http.createServer(function (req, res) {
  if (req.url.slice(0,6) !== '/?url=') {
    res.writeHead(200, {'content-encoding': 'gzip', 'content-type': 'text/html'});
    if (req.url != '/info') {
      res.end(gzippedHtml);
    } else {
      res.end(gzippedHtmlInfo);
    }
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
      pres.on('data', function (data) {
        if (data.slice(0,1).toString() === '�') {
          ts.write(data);
        } else if (getEncoding(data) === 'utf8') {
          buffer += data.toString();
          var lines = buffer.split(/\r?\n/);
          buffer = lines.pop();
          
          for (var l = 0; l < lines.length; l++) {
            var line = lines[l];
            if (line.match(/(src\=\"\/\/)/g)) {
              line = line.replace(/(src\=\"\/\/)/g, 'src="http://'+mainhost+'/?url=http://');
            } else if (line.match(/(src=")(?!http\:\/\/)/g)) {
              line = line.replace(/(src=")(?!http\:\/\/)/g, 'src="http://'+mainhost+'/?url=http://'+url.parse(_url.query.url, true).hostname+'/');
            } else if (line.match(/(href=")(?!http\:\/\/)/g)) {
              line = line.replace(/(href=")(?!http\:\/\/)/g, 'href="http://'+mainhost+'/?url=http://'+url.parse(_url.query.url, true).hostname+'/');
            }
            if (_url.query.img === "false") {
              if (line.match(/(<img)/g)) {
                line = line.replace(/(<img)/g, '<img_');
              }
            }
            ts.write(line+'\r\n');
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
}).listen(process.env.PORT);