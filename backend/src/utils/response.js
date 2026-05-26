function success(data, message = 'success') {
  return {
    code: 0,
    message,
    data,
    timestamp: Date.now(),
  };
}

function fail(code, message) {
  return {
    code,
    message,
    data: null,
    timestamp: Date.now(),
  };
}

module.exports = { success, fail };
