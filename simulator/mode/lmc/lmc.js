// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
"use strict";

CodeMirror.defineMode('lmc', function() {

  var words = {};
  function define(style, string) {
    var split = string.split(' ');
    for(var i = 0; i < split.length; i++) {
      words[split[i]] = style;
    }
  };

  // Atoms
  define('atom', 'INP OUT inp out');

  // Keywords
  define('keyword', 'BRA BRZ BRP bra brz brp');

  // Commands
  define('builtin', 'STA STR LDA OTC HLT DAT ADD SUB LDV sta lda otc hlt dat add sub str ldv');

  function tokenBase(stream, state) {
    if (stream.eatSpace()) return null;

    var sol = stream.sol();
    var ch = stream.next();

    if (ch === ';') {
      stream.skipToEnd();
      return 'comment';
    }
    if (/\d/.test(ch)) {
      stream.eatWhile(/\d/);
      if(stream.eol() || !/\w/.test(stream.peek())) {
        return 'number';
      }
    }
    if (ch === '\'') {
      state.tokens.unshift(tokenString(ch, "string"));
      return tokenize(stream, state);
    }

    stream.eatWhile(/[\w-]/);
    var cur = stream.current();
    return words.hasOwnProperty(cur) ? words[cur] : null;
  }

  function tokenString(quote, style) {
      var close = quote == "(" ? ")" : quote == "{" ? "}" : quote
      return function(stream, state) {
        var next, end = false, escaped = false;
        while ((next = stream.next()) != null) {
          if (next === close && !escaped) {
            end = true;
            break;
          }
          if (next === '$' && !escaped && quote !== "'") {
            escaped = true;
            stream.backUp(1);
            state.tokens.unshift(tokenDollar);
            break;
          }
          if (!escaped && next === quote && quote !== close) {
            state.tokens.unshift(tokenString(quote, style))
            return tokenize(stream, state)
          }
          escaped = !escaped && next === '\\';
        }
        if (end) state.tokens.shift();
        return style;
      };
    };

  function tokenize(stream, state) {
    return (state.tokens[0] || tokenBase) (stream, state);
  };

  return {
    startState: function() {return {tokens:[]};},
    token: function(stream, state) {
      return tokenize(stream, state);
    },
    lineComment: ';',
  };
});
});
