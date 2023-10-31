exports.quote = function (xs) {
    return xs.map(function (s) {
        if (s && typeof s === 'object') {
            if (s.op === 'glob') {
                return s.pattern;
            }
            return s.op;
        }
        else {
			s = String(s).replace(/\x00/g, ''); // eat \x00 just like the shell.
			if(s === '') {
				return "''";
			}
			// Enclose strings with metacharacters in single quoted,
			// and escape any single quotes.
			// Match strictly to avoid escaping things that don't need to be.
			// bash: |  & ; ( ) < > space tab
			// Also escapes bash curly brace ranges {a..b} {a..z..3} {1..20} {a,b} but not
			// {a...b} or {..a}
			else if ((/(?:["\\$`! |&;\(\)<>#]|{[\d]+\.{2}[\d]+(?:\.\.\d+)?}|{[a-zA-Z].{2}[a-zA-Z](?:\.\.\d+)?}|{[^{]*,[^}]*})/m).test(s)) {
				// If input contains outer single quote, escape each of them individually.
				// eg. 'a b c' -> \''a b c'\'
				var outer_quotes = s.match(/^('*)(.*?)('*)$/s);

				var inner_string = outer_quotes[2].replace(/'/g, '\'\\\'\'');

				// the starting outer quotes individually escaped
				return String(outer_quotes[1]).replace(/(.)/g, '\\$1') +
					// the text inside the outer single quotes is single quoted
					"'" + unprintableEscape(inner_string, "'").replace(/(?<!\\)''/g, '') + "'" +
					// "'" + inner_string + "'" +
					// the ending outer quotes individually escaped
					String(outer_quotes[3]).replace(/(.)/g, '\\$1');
			}
			// Only escape the single quotes in strings without metachars or
			// separators
			return unprintableEscape(String(s).replace(/(')/g, '\\$1'), '');
		}
    }).join(' ');

    function padWithLeadingZeros(string) {
        return new Array(5 - string.length).join("0") + string;
    }

    function unicodeCharEscape(charCode) {
        return "\\u" + padWithLeadingZeros(charCode.toString(16));
    }

    function  escapeCtrlChars(charCode) {
        switch (charCode) {
            case 8:  return '\\b';
            case 9:  return '\\t';
            case 10: return '\\n';
            case 11: return '\\v';
            case 12: return '\\f';
            case 13: return '\\r';
            case 27: return '\\E';
            default:
            if (charCode < 16) return '\\x0' + charCode.toString(16);
            else return '\\x' + charCode.toString(16);
        }
    }

    function unprintableEscape(string, quote) {
        return string.split("")
                    .map(function (char) {
                        var charCode = char.charCodeAt(0);
                        return charCode < 32 ? quote + escapeCtrlChars(charCode) + quote :
                            charCode > 127 ?  quote + unicodeCharEscape(charCode) + quote : char;
                    })
                    .join("");
    }
};

var CONTROL = '(?:' + [
    '\\|\\|', '\\&\\&', ';;', '\\|\\&', '[&;()|<>]'
].join('|') + ')';
var META = '|&;()<> \\t';

exports.parse = function parse (s, env) {
    var chunker = new RegExp([
        '([\'"])((\\\\\\1|[^\\1])*?)\\1', // quotes
        '(\\\\[' + META + ']|[^\\s' + META + '])+', // barewords
        '(' + CONTROL + ')' // control chars
    ].join('|'), 'g');
    var match = s.match(chunker);
    if (!match) return [];
    if (!env) env = {};
    return match.map(function (s) {
        if (/^'/.test(s)) {
            return s
                .replace(/^'|'$/g, '')
                .replace(/\\(["'\\$`(){}!#&*|])/g, '$1')
            ;
        }
        else if (/^"/.test(s)) {
            return s
                .replace(/^"|"$/g, '')
                .replace(/(^|[^\\])\$(\w+)/g, getVar)
                .replace(/(^|[^\\])\${(\w+)}/g, getVar)
                .replace(/\\([ "'\\$`(){}!#&*|])/g, '$1')
            ;
        }
        else if (RegExp('^' + CONTROL + '$').test(s)) {
            return { op: s };
        }
        else return s.replace(
            /(['"])((\\\1|[^\1])*?)\1|[^'"]+/g,
            function (s, q) {
                if (/^['"]/.test(s)) return parse(s, env);
                return parse('"' + s + '"', env);
            }
        );
    });
    
    function getVar (_, pre, key) {
        return pre + String(env[key] || '');
    }
};
