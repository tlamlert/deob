const { errorLog, preprocess, generateNgrams } = require('../../coordinator/utils');

test('errorLog', (done) => {
    // For this test, manually inspect the file for correctness
    errorLog("This is a test!");
    errorLog("This is a second test!");
    errorLog({'node1' : 'Some error'});
    errorLog(Error('beep boop'));
    done();
});

test('preprocess', (done) => {
    const input = "Helen on 3 horses!";
    const result = preprocess(input);
    const expected = ["helen", "hors", "helen hors"];
    expect(result).toEqual(expect.arrayContaining(expected));
    done();
});

test('preprocess extreme', (done) => {
    const input = "© !Helen on! '3'       horses!";
    const result = preprocess(input);
    console.log("results:\n" + result);
    const expected = ["helen", "hors", "helen hors"];
    expect(result).toEqual(expect.arrayContaining(expected));
    done();
});

test('preprocess allow repeats', (done) => {
    const input = "beep beep beep";
    const result = preprocess(input);
    const expected = ["beep", "beep", "beep", "beep beep", "beep beep", "beep beep beep"];
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
