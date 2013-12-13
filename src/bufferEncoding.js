module.exports = function (buffer) {
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
};