$(function () {
  'use strict';

  const EXPORT_BASE_URL = '/a9online', EDITOR_BASE_URL = '/data';
  const BUFFER_DELAY = 800;

  let myCodeMirror, notePath, changeTimeout = null, changeLatestTime;

  // ################################################
  // Utilities

  function gup(name) {
    let regex = new RegExp("[\\?&]" + name + "=([^&#]*)");
    let results = regex.exec(window.location.href);
    return results === null ? "" : decodeURIComponent(results[1]);
  }

  const _ESCAPE_HTML_MAP = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };

  function escapeHtml(text) {
    return text.replace(/[&<>"']/g, function (m) { return _ESCAPE_HTML_MAP[m]; });
  }

  // ################################################
  // Messages and Modals

  function showMessage(message) {
    $('#header-message').finish().text(message).show().delay(1000).fadeOut('slow');
  }

  let errorModal = MODAL.createModal(
    'Error', '',
    $('<button type=button>').text('OK').click(MODAL.hideModals));

  function showErrorModal(message) {
    console.log(message);
    if (message.responseJSON) {
      message = message.responseJSON.error;
    } else if (message.status === 0) {
      message = 'Cannot connect to the server.';
    }
    errorModal.find('.modal-body').text(message);
    MODAL.showModal(errorModal);
  }

  let renameModal = MODAL.createModal(
    'Rename',
    [
      $('<label for="rename-index">').text('Index'),
      $('<input type="text" id="rename-index">').keyup(keyupRenameModal),
      $('<label for="rename-title">').text('Title'),
      $('<input type="text" id="rename-title">').keyup(keyupRenameModal),
    ],
    [
      $('<button type="button" id="rename-ok">').text('OK').click(function () {
        setTitle(
          renameModal.find('#rename-index').val(),
          renameModal.find('#rename-title').val());
        saveNote();
        MODAL.hideModals();
      }),
      $('<button type="button" id="rename-cancel">').text('Cancel')
        .click(MODAL.hideModals),
    ]);

  function showRenameModal() {
    renameModal.find('#rename-index').val($('#header-index').data('value'));
    renameModal.find('#rename-title').val($('#header-title').data('value'));
    MODAL.showModal(renameModal);
  }
  
  $('#button-rename').click(showRenameModal);

  function keyupRenameModal(e) {
    if (e.key === "Enter") {
      renameModal.find('#rename-ok').click();
    } else if (e.key === "Escape") {
      renameModal.find('#rename-cancel').click();
    }
  }

  let exportModal = MODAL.createModal(
    'Export',
    [
      $('<label for="export-path">').text('Export path'),
      $('<input type="text" id="export-path">').keyup(keyupExportModel),
      $('<label for="export-title">').text('Title'),
      $('<input type="text" id="export-title">').keyup(keyupExportModel),
    ],
    [
      $('<button type="button" id="export-ok">').text('OK').click(function () {
        exportNote(
          exportModal.find('#export-path').val(),
          exportModal.find('#export-title').val());
        MODAL.hideModals();
      }),
      $('<button type="button" id="export-cancel">').text('Cancel')
        .click(MODAL.hideModals),
    ]);

  function showExportModal() {
    exportModal.find('#export-path').val(notePath.replace(/\.md$/, '.html'));
    exportModal.find('#export-title').val($('#header-title').data('value'));
    MODAL.showModal(exportModal);
  }
  
  $('#button-export').click(showExportModal);

  function keyupExportModel(e) {
    if (e.key === "Enter") {
      exportModal.find('#export-ok').click();
    } else if (e.key === "Escape") {
      exportModal.find('#export-cancel').click();
    }
  }

  // ################################################
  // Editor

  function initCodeMirror() {
    CodeMirror.defineMode("markdown-latex", function(config) {
      let markdownMode = CodeMirror.getMode(config, "markdown"),
        stexMode = CodeMirror.getMode(config, {name: "stex", inMathMode: true});
      return CodeMirror.multiplexingMode(
        markdownMode,
        {
          open: "\\$",
          close: "\\$",
          mode: markdownMode,
          parseDelimiters: true,
        },
        {
          open: "$$",
          close: "$$",
          mode: stexMode,
          delimStyle: "keyword",
        },
        {
          open: "$",
          close: "$",
          mode: stexMode,
          delimStyle: "keyword",
        }
      );
    });
    CodeMirror.commands.save = saveNote;
    CodeMirror.commands.autocomplete = function (cm) {
      cm.showHint({hint: CodeMirror.hint.anyword});
    }
    myCodeMirror = CodeMirror(
      document.getElementById('editor-wrapper'), {
        mode: 'markdown-latex',
        indentUnit: 4,
        lineWrapping: true,
        matchBrackets: true,
        lineNumbers: true,
        keyMap: 'vim',
        extraKeys: {
          'Ctrl-S': 'save',
          'Alt-/': 'autocomplete',
          'Tab': 'indentMore',
          'Shift-Tab': 'indentLess',
          'Ctrl-A': alchemy,
        },
        showCursorWhenSelecting: true,
        autofocus: true,
      });
    myCodeMirror.on('changes', setCountdown);
  }

  function alchemy(cm) {
    function _display (success, result) {
      if (success) {
        cm.replaceSelection(result);
      } else {
        cm.openNotification(escapeHtml(result), {duration: 2000});
      }
    }

    cm.openDialog(
      'Alchemy: <input type=text value="' + escapeHtml(cm.getSelection()) + '">',
      function (ingredients) {
        // converted[0] is true, false, or "defer"
        // converted[1] is the actual result
        let converted = ALCHEMY_KIT.convert(ingredients);
        if (converted[0] === "defer") {
          converted[1].done(function (response) {
            _display(true, response);
          }).fail(function (jqXHR, textStatus, errorThrown) {
            _display(false, textStatus + ': ' + errorThrown);
          });
        } else {
          _display(converted[0], converted[1]);
        }
      });
  }

  // ################################################
  // Rendering and Saving

  function checkChange() {
    return !myCodeMirror.isClean();
  }

  window.onbeforeunload = function (e) {
    if (checkChange()) {
      e.preventDefault();
      e.returnValue = '';
    }
  };

  // Trigger renderMarkdown BUFFER_DELAY ms after the last change.
  // The code is based on UnderscoreJS's debounce.
  function setCountdown() {
    changeLatestTime = Date.now();
    if (changeTimeout === null) {
      changeTimeout = setTimeout(checkCountdown, BUFFER_DELAY); 
    }
  }

  function checkCountdown() {
    let passed = Date.now() - changeLatestTime;
    if (BUFFER_DELAY > passed) {
      // Wait for the remaining time
      changeTimeout = setTimeout(checkCountdown, BUFFER_DELAY - passed);
    } else {
      changeTimeout = null;
      triggerCountdown();
    }
  }

  function cancelCountdown(triggerNow) {
    clearTimeout(changeTimeout);
    changeTimeout = null;
    if (triggerNow) triggerCountdown();
  }

  function triggerCountdown() {
    renderMarkdown($('#content'), myCodeMirror.getValue(), false);
  }

  // ################################################
  // Markdown

  function renderMarkdown(div, rawMarkdown, isExport) {
    let localResources = [];
    div.html(marked(rawMarkdown));
    div.find('img').each(function (i, x) {
      if ($(x).attr('alt')) {
        $(x).attr('title', $(x).attr('alt'));
      }
    });
    div.find('a').each(function (i, x) {
      let href = $(x).attr('href');
      if (href.startsWith('@/')) {
        $(x).attr('href', resolveLocalHref(href, isExport));
      } else {
        $(x).attr('target', '_blank');
      }
    });
    div.find('img').each(function (i, x) {
      let src = $(x).attr('src');
      if (src.startsWith('@/')) {
        localResources.push(src);
        $(x).attr('src', resolveLocalHref(src, isExport));
      }
    });
    div.find('table').wrap('<div class=table-wrapper></div>');
    div.find('svg').each(function(i, elt) {
      SVGHack.process(elt);
    });
    if (!isExport) {
      RENDER_MATH.render(div[0]);
    }
    if (isExport) {
      return localResources;
    }
  }

  function resolveLocalHref(href, isExport) {
    if (isExport) {
      return href.replace(/^@/, EXPORT_BASE_URL).replace(/\.md$/, '.html');
    } else {
      return href.replace(/^@/, EDITOR_BASE_URL);
    }
  }
  

  // ################################################
  // Display and edit note

  function loadNote() {
    $.get('/api/load', {path: notePath}, function (data) {
      displayNote(data);
    }).fail(function (message) {
      showErrorModal(message);
      // Fatal error, so disable the OK button.
      errorModal.find('button').prop('disabled', true);
    });
  }

  function displayNote(data) {
    setTitle(data.meta.index, data.meta.title);
    myCodeMirror.setValue(data.content);
    myCodeMirror.markClean();
    myCodeMirror.clearHistory();
    cancelCountdown(true);
  }

  function setTitle(index, title) {
    if (index.trim() !== "") {
      $('#header-index').text(index).removeClass('none');
    } else {
      $('#header-index').text('(none)').addClass('none');
    }
    if (title.trim() !== "") {
      $('#header-title').text(title).attr('title', title).removeClass('none');
    } else {
      $('#header-title').text('(untitled)').attr('title', '(untitled)').addClass('none');
    }
    $('#header-index').data('value', index);
    $('#header-title').data('value', title);
    document.title = (
      $('#header-title').text() + ' - a9v2');
  }

  function saveNote() {
    let data = {
      path: notePath,
      index: $('#header-index').data('value'),
      title: $('#header-title').data('value'),
      content: myCodeMirror.getValue(),
    };
    $.post('/api/save', data, function (data) {
      showMessage('Saved!');
      myCodeMirror.markClean();
    }).fail(showErrorModal);
  }

  $('#button-save').click(saveNote);

  function exportNote(path, title) {
    let div = $('<div>').appendTo('body')
      .css({'position': 'fixed', 'visibility': 'hidden'});
    let localResources = renderMarkdown(div, myCodeMirror.getValue(), true);
    console.log(localResources);
    let data = {
      path: path,
      title: title,
      content: div.html(),
      localResources: JSON.stringify(localResources),
    };
    div.remove();
    $.post('/api/export', data, function (response) {
      showMessage('Exported!');
      window.open(response.url, '_blank');
    }).fail(showErrorModal);
  }

  // ################################################
  // Initialization
  
  notePath = gup('path');
  initCodeMirror();
  loadNote();

});
