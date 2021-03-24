let RENDER_MATH = (function () {
  'use strict';
  var _RENDER_MATH = {};

  const MACROS = {
    "\\Mb": "\\mathbf{#1}",
    "\\Mr": "\\mathrm{#1}",
    "\\Mc": "\\mathcal{#1}",
    "\\Mt": "\\mathtt{#1}",
    "\\Md": "\\mathbb{#1}",
    "\\Ms": "\\mathsf{#1}",
    "\\Bs": "\\boldsymbol{#1}",
    "\\RR": "\\mathbb{R}",
    "\\ZZ": "\\mathbb{Z}",
    "\\NN": "\\mathbb{N}",
    "\\QQ": "\\mathbb{Q}",
    "\\CC": "\\mathbb{C}",
    "\\FF": "\\mathbb{F}",
    "\\II": "\\mathbb{I}",
    "\\norm": "{\\left\\| #1\\right\\|}",
    "\\set": "{\\left\\{ #1 \\right\\}}",
    "\\abs": "{\\left| #1\\right|}",
    "\\card": "{\\left| #1\\right|}",
    "\\floor": "{\\left\\lfloor #1 \\right\\rfloor}",
    "\\ceil": "{\\left\\lceil #1 \\right\\rceil}",
    "\\crab": "{\\left[ #1 \\right]}",
    "\\crow": "{\\left\\{ #1 \\right\\}}",
    "\\nail": "{\\left( #1 \\right)}",
    "\\ang": "{\\left\\langle #1 \\right\\rangle}",
    "\\prob": "P\\!\\left( #1 \\right)",
    "\\probb": "P_{#1}\\!\\left( #2 \\right)",
    "\\ex": "\\operatorname{\\mathbb{E}}\\left[ #1 \\right]",
    "\\exx": "\\operatorname{\\mathbb{E}}_{#1}\\!\\left[ #2 \\right]",
    "\\var": "\\operatorname{Var}\\left[ #1 \\right]",
    "\\varr": "\\operatorname{Var}_{#1}\\!\\left[ #2 \\right]",
    "\\kl": "\\operatorname{KL}\\!\\left( #1 \\parallel #2 \\right)",
    "\\choose": "{\\binom{#1}{#2}}",
    "\\matx": "\\begin{bmatrix}#1\\end{bmatrix}",
    "\\T": "^\\mathsf{T}",
    "\\tr": "\\operatorname{tr}",
    "\\cases": "\\begin{cases}#1\\end{cases}",
    "\\cif": "\\text{if } #1",
    "\\cwhen": "\\text{when } #1",
    "\\cotherw": "\\text{otherwise}",
    "\\i": "^{(i)}",
    "\\j": "^{(j)}",
    "\\k": "^{(k)}",
    "\\t": "^{(t)}",
    "\\midd": "\\;\\middle|\\;",
    "\\fracd": "\\frac{d#1}{d#2}",
    "\\fracp": "\\frac{\\partial#1}{\\partial#2}",
    "\\amor": "\\widehat{#1}",
    "\\baa": "\\overline",
    "\\ci": "\\perp\\!\\!\\!\\perp",
  };

  // Render LaTeX inside an HTML element
  _RENDER_MATH.render = function (element) {
    // Invoke KaTeX
    renderMathInElement(element, {
      delimiters: [
        {left: "$$", right: "$$", display: true},
        {left: "$", right: "$", display: false},
      ],
      throwOnError: false,
      macros: MACROS,
    });
  };

  return _RENDER_MATH;
})();
