let ALCHEMY_KIT = (function () {
  'use strict';
  var _ALCHEMY_KIT = {};

  // ################################################
  // Hard-coded macros

  const MACROS = {};

  function add_macros(stuff) {
    stuff.forEach(function (x) {
      if (!x) return;
      for (var i = 0; i < x.length - 1; i++) {
        MACROS[x[i]] = x[x.length - 1];
      }
    });
  }

  // Common Symbols
  add_macros([
    ['!!', '¡'], ['??', '¿'], ['<<', '«'], ['>>', '»'],
    ['-,', 'not', '¬'], ['oo', 'deg', '°'],
    ['+-', '±'], ['xx', '×'], ['-:', ':-', '÷'], ['=/', '/=', '≠'],
    ['1/4', '¼'], ['1/2', '½'], ['3/4', '¾'],
    ['...', '…'], ['--', '–'], ['---', '—'],
    [':)', '☺'], [':(', '☹'], ['<3', '♥'], ['No', '№'],
    ['<-', '<--', 'left', '←'], ['->', '-->', 'right', '→'],
    ['|^', 'up', '↑'], ['|v', 'down', '↓'], ['<->', '<-->', '↔'],
    ['~~', 'approx', '≈'], ['==', '≡'], ['inf', '∞'],
    ['<=', '≤'], ['>=', '≥'], ['music', 'song', '♪'],
    ['c/', 'c|', '/c', '|c', '¢'], ['-L', 'L-', '£'],
    ['=Y', 'Y=', '¥'], ['=E', 'E=', '€'],
    ['SS', '§'], ['oC', 'OC', '©'], ['oR', 'OR', '®'],
  ]);

  // Greek
  var LATIN = 'ABCDEZHQIKLMNJOPRSTUFXYWabcdezhqiklmnjoprstufxyw';
  var GREEK = 'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩαβγδεζηθικλμνξοπρστυφχψω';
  for (var i = 0; i < GREEK.length; i++) {
    MACROS['G' + LATIN[i]] = MACROS['g' + LATIN[i]] = GREEK[i];
  }

  // LaTeX
  add_macros([
    ['al', 'align', 'aligned', '$$\\begin{aligned}\n\n\\end{aligned}$$'],
    ['op', '$$\\begin{aligned}\n& \\underset{x}{\\text{minimize}}\n&& f_0(x) \\\\\n' +
           '& \\text{subject to}\n&& f_i(x) \\leq b_i\n&& (i = 1,\\dots, m)\n' +
           '\\end{aligned}$$'],
  ]);

  // Expose MACROS
  _ALCHEMY_KIT.MACROS = MACROS;

  // ################################################
  // Interface

  _ALCHEMY_KIT.convert = function (text) {
    // Check the MACROS
    if (MACROS[text] !== undefined) {
      return [true, MACROS[text]];
    }
    // Check citation
    if (text.startsWith('http://') || text.startsWith('https://')) {
      let jqxhr = $.get('/api/cite', {url: text});
      return ['defer', jqxhr];
    }
    return [false, 'Unknown ingredients: ' + text];
  };


  return _ALCHEMY_KIT;
})();
