var jade = require('jade');
var fs = require('fs');
var zlib = require('zlib');

var html = jade.renderFile('./jadeStuff/noxy.jade', {pretty: false, name: 'noxy'});
var htmlInfo = jade.renderFile('./jadeStuff/noxyInfo.jade', {pretty: false, name: 'noxy'});
var gzippedHtml, gzippedHtmlInfo;

module.exports = function (fn) {
  zlib.gzip(new Buffer(html), function (err, result) {
    gzippedHtml = result;
    zlib.gzip(new Buffer(htmlInfo), function (err, result) {
      gzippedHtmlInfo = result;
      fn(gzippedHtml, gzippedHtmlInfo);
    });
  });
}