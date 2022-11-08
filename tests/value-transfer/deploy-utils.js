const scriptName = process.argv[1].substring(process.argv[1].lastIndexOf('/') + 1).replace(/\.[^/.]+$/, "");
const startName = `${scriptName} START`.padEnd(60, ' ');
const endName = `${scriptName} START`.padEnd(60, ' ');
const hyphenLines = '-------------------------';

export const printHorizontalRule = function(name) {
    const padName = name.padEnd(80, ' ');
    console.log(`${hyphenLines} ${padName} ${hyphenLines}`);
}

export const printStartHorizontalRule = function() {
    console.log(`${hyphenLines} ${startName} ${hyphenLines}`);
}

export const printEndHorizontalRule = function() {
    console.log(`${hyphenLines} ${endName} ${hyphenLines}`);
}
