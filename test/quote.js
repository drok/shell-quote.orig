var test = require('tape');
var quote = require('../').quote;

test('quote', function (t) {
	t.equal(quote(['a', 'b', 'c d']), "a b 'c d'");
	var quoted = quote(['a', 'b', "it's a \"neat thing\""]);
	t.equal(
		quoted,
		'a b \'it\'\\\'\'s a "neat thing"\''
	);
	t.isEqual(quoted.length, 28);
	t.equal(
		quote(['$', '`', '\'']),
		'\'$\' \'`\' \\\''
	);
	t.equal(quote([]), '');
	t.equal(quote(['']), "''");
	t.equal(quote([';']), "';'");
	t.equal(quote(['a;b']), "'a;b'");
	t.equal(quote([')']), "')'");
	t.equal(quote(['a)b']), "'a)b'");
	t.equal(quote(['(']), "'('");
	t.equal(quote(['a(b']), "'a(b'");
	t.equal(quote(['|']), "'|'");
	t.equal(quote(['a|b']), "'a|b'");
	t.equal(quote(['<']), "'<'");
	t.equal(quote(['a<b']), "'a<b'");
	t.equal(quote(['>']), "'>'");
	t.equal(quote(['a>b']), "'a>b'");
	t.equal(quote(["'"]), "\\'");
	t.equal(quote(["a'"]), "a\\'");
	t.equal(quote(["'b"]), "\\'b");
	t.equal(quote(["a'b"]), "a\\'b");
	t.equal(quote(["''"]), "\\'\\'");
	t.equal(quote(['a\nb']), "a\\nb");
	t.equal(quote([' #(){}*|][!']), "' #(){}*|][!'");
	t.equal(quote(["'#(){}*|][!"]), "\\''#(){}*|][!'");
	t.equal(quote(["'#(){}*|][!"]), '\\\'\'#(){}*|][!\'');
	t.equal(quote(['X#(){}*|][!']), "'X#(){}*|][!'");
	t.equal(quote(['a\n#\nb']), "'a'\\n'#'\\n'b'");
	t.equal(quote(['><;{}']), "'><;{}'");
	t.equal(quote(['a', 1, true, false]), 'a 1 true false');
	t.equal(quote(['a', 1, null, undefined]), 'a 1 null undefined');
	t.equal(quote(['a\\x']), "'a\\x'");

	// Bash brace expansions {a,b} or {a..b} must be quoted
	t.equal(quote(['a{1,2}']), "'a{1,2}'");
	t.equal(quote(['a{,2}']), "'a{,2}'");
	t.equal(quote(['a{,,2}']), "'a{,,2}'");
	t.equal(quote(['\'a{,,2}\'']), "\\''a{,,2}'\\'");
	t.equal(quote(['a{1..2}']), "'a{1..2}'");
	t.equal(quote(['a{X..Z}']), "'a{X..Z}'");
	t.equal(quote(['a{{1..2}}']), "'a{{1..2}}'");

	// ... but non brace expansions should not be
	t.equal(quote(['a{1...2}']), 'a{1...2}');
	t.equal(quote(['a{1...2}']), 'a{1...2}');
	t.equal(quote(['a{1..Z}']), 'a{1..Z}');
	t.equal(quote(['a{a1..b1}']), 'a{a1..b1}');
	t.equal(quote(['a{1a..4}']), 'a{1a..4}');
	t.equal(quote(['a{..6}']), 'a{..6}');
	t.equal(quote(['a{{1...2}}']), 'a{{1...2}}');
	t.equal(quote(['a{1.2}']), 'a{1.2}');
	t.equal(quote(['a{{1.2}}']), 'a{{1.2}}');
	t.equal(quote(['a{12}']), 'a{12}');
	quoted = quote(['\\ \\']);
	t.equal(quoted, "'\\ \\'");
	t.isEqual(quoted.length, 5); // 3-char string + 2 quotes
	// TODO: Ugly expansion of single quote at beginning or end of strings.
	// Should return \'
	t.equal(quote(["'$'"]), "\\''$'\\'");
	t.equal(quote(["'"]), "\\'");
	t.equal(quote(['gcc', '-DVAR=value']), 'gcc -DVAR=value');
	t.equal(quote(['gcc', '-DVAR=value with space']), "gcc '-DVAR=value with space'");
	t.equal(quote(["This isn't OK!"]), "'This isn'\\''t OK!'");
	t.end();
});

test('quote unprintables', function (t) {
	t.equal(quote(['\x00']), "''");
	t.equal(quote(['\x00']).length, 2); // two quotes
	t.equal(quote(['\x01']), "\\x01");
	t.equal(quote(['\x01']).length, 4); // an \, an x, and two hex digits
	t.equal(quote(['\x00\x01']), "\\x01");
	t.equal(quote(['\x00\x01']).length, 4); // an \, an x, and two hex digits
	t.equal(quote(['\x01\x02\x03\x04\x05\x06\x07\x08\x09']), "\\x01\\x02\\x03\\x04\\x05\\x06\\x07\\b\\t");
	t.equal(quote(['\x01\x02\x03\x04\x05\x06\x07\x08\x09']).length, 32); // 7 * (4 chars per escaped byte) + 2 * 2
	t.equal(quote(['\x01\x02\x03\x04\x05\x06\x07\x08']), "\\x01\\x02\\x03\\x04\\x05\\x06\\x07\\b");
	t.equal(quote(['\x01\x02\x03\x04\x05\x06\x07\x08']).length, 30); // 7 * (4 chars per escaped byte) + 2
	t.equal(quote(['\x0a\x0b\x0c\x0d\x0e\x0f']), "\\n\\v\\f\\r\\x0e\\x0f");
	t.equal(quote(['\x0a\x0b\x0c\x0d\x0e\x0f']).length, 2 * 4 + 4 + 4);
	// no quotes because no input chars are word separators
	t.equal(quote(['\x11\x12\x13\x14\x15\x16\x17\x18\x19']), "\\x11\\x12\\x13\\x14\\x15\\x16\\x17\\x18\\x19");
	t.equal(quote(['\x11\x12\x13\x14\x15\x16\x17\x18\x19']).length, 36); // 8 * (4 chars per escaped byte)
	t.equal(quote(['\x1a\x1b\x1c\x1d\x1e\x1f']), "\\x1a\\E\\x1c\\x1d\\x1e\\x1f");
	t.equal(quote(['\x1a\x1b\x1c\x1d\x1e\x1f']).length, 4 + 2 + 4 + 4 + 4 + 4);

	/* Unicode */
	t.equal(quote(['άψογος']), '\\u03ac\\u03c8\\u03bf\\u03b3\\u03bf\\u03c2');
	t.equal(quote(['άψογος']).length, 36);
	t.equal(quote(["άψο'γος"]), "\\u03ac\\u03c8\\u03bf\\'\\u03b3\\u03bf\\u03c2");
	t.equal(quote(["άψο γος"]), "''\\u03ac\\u03c8\\u03bf' '\\u03b3\\u03bf\\u03c2''");
	t.equal(quote(["άψ&ο γος"]), "''\\u03ac\\u03c8'&'\\u03bf' '\\u03b3\\u03bf\\u03c2''");
	t.end();
});

test('quote ops', function (t) {
	t.equal(quote(['a', { op: '|' }, 'b']), 'a | b');
	t.equal(
		quote(['a', { op: '&&' }, 'b', { op: ';' }, 'c']),
		'a && b ; c'
	);
    t.equal(
        quote([{ op: 'glob', pattern: '*'} ]),
        '*'
    )
    t.equal(
        quote([ 'a', { op: 'glob', pattern: 'b/*.c' } ]),
        'a b/*.c'
    )
	t.end();
});

test('quote windows paths', { skip: 'breaking change, disabled until 2.x' }, function (t) {
	var path = 'C:\\projects\\node-shell-quote\\index.js';

	t.equal(quote([path, 'b', 'c d']), 'C:\\projects\\node-shell-quote\\index.js b \'c d\'');

	t.end();
});

test("chars for windows paths don't break out", function (t) {
	var x = '`:\\a\\b';
	t.equal(quote([x]), "'`:\\a\\b'");
	t.end();
});
