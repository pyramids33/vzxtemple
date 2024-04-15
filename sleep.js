module.exports = function sleep (x) {
    return new Promise((res) => setTimeout(res,x));
}
