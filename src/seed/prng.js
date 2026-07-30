/** Deterministic linear-congruential PRNG so repeated seed runs produce stable, reproducible data. */
function createPrng(seedValue = 42) {
  let seed = seedValue;
  function rand() {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  }
  function pick(arr) {
    return arr[Math.floor(rand() * arr.length)];
  }
  function pickMany(arr, count) {
    const shuffled = [...arr].sort(() => rand() - 0.5);
    return shuffled.slice(0, count);
  }
  function randInt(min, max) {
    return Math.floor(rand() * (max - min + 1)) + min;
  }
  return { rand, pick, pickMany, randInt };
}

module.exports = { createPrng };
