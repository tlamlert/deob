
const { preprocess, generateNgrams } = require('../../coordinator/utils');

test('preprocess', (done) => {
    const expected = [];
    expect(result).toEqual(expected);
    expect(result).toEqual(expect.arrayContaining(expected));
    done();
});

test('generateNgrams', (done) => {
    const input = "please turn your homework";
    const expected = ["please turn", "turn your", "your homework"];
    const ngrams = generateNgrams(input, n=2);
    expect(ngrams).toEqual(expect.arrayContaining(expected));
    done();
});
