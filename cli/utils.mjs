export function stripIndents(strings, ...values) {
    let str = '';
    strings.forEach((string, i) => {
        str += string + (values[i] || '');
    });
    return str.replace(/(\t)+/g, ' ').trim();
}