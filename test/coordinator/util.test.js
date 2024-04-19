const {errorLog, preprocess, generateNgrams} = require('../../coordinator/utils');

test('errorLog', (done) => {
  // For this test, manually inspect the file for correctness
  errorLog('This is a test!');
  errorLog('This is a second test!');
  errorLog({'node1': 'Some error'});
  errorLog(Error('beep boop'));
  done();
});

test('preprocess', (done) => {
  const input = 'Helen on 3 horses!';
  const result = preprocess(input);
  const expected = ['helen', 'hors', 'helen hors'];
  expect(result).toEqual(expect.arrayContaining(expected));
  done();
});

test('preprocess extreme', (done) => {
  const input = '© !Helen on! \'3\'       horses!';
  const result = preprocess(input);
  console.log('results:\n' + result);
  const expected = ['helen', 'hors', 'helen hors'];
  expect(result).toEqual(expect.arrayContaining(expected));
  done();
});

test('preprocess allow repeats', (done) => {
  const input = 'beep beep beep';
  const result = preprocess(input);
  const expected = ['beep', 'beep', 'beep', 'beep beep', 'beep beep', 'beep beep beep'];
  expect(result).toEqual(expect.arrayContaining(expected));
  done();
});

test('preprocess oops all periods', (done) => {
  const input = '.....';
  const result = preprocess(input);
  const expected = [];
  expect(result).toEqual(expect.arrayContaining(expected));
  done();
})

test('preprocess N/A', (done) => {
  const input = 'N/A';
  const result = preprocess(input);
  const expected = [];
  expect(result).toEqual(expect.arrayContaining(expected));
  done();
})

test('preprocess empty string', (done) => {
  const input = '';
  const result = preprocess(input);
  console.log('result : [' + result.toString() + ']');
  const expected = [];
  expect(result).toEqual(expect.arrayContaining(expected));
  done();
})

test('preprocess not a string', (done) => {
  const input = undefined;
  const result = preprocess(input);
  const expected = [];
  expect(result).toEqual(expect.arrayContaining(expected));
  done();
})

test('generateNgrams', (done) => {
  const input = 'please turn your homework';
  const expected = ['please turn', 'turn your', 'your homework'];
  const ngrams = generateNgrams(input, n=2);
  expect(ngrams).toEqual(expect.arrayContaining(expected));
  done();
});

test('generateNgrams more n than supported', (done) => {
  const input = 'snek';
  const expected = [];
  const ngrams = generateNgrams(input, n=2);
  expect(ngrams).toEqual(expect.arrayContaining(expected));
  done();
});

test('generateNgrams more n than supported', (done) => {
  const input = 'snek shep doggo hamter cat';
  const expected = [];
  const ngrams = generateNgrams(input, n=10);
  expect(ngrams).toEqual(expect.arrayContaining(expected));
  done();
});