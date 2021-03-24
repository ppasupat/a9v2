$(function () {
  'use strict';

  const OPEN_LINK_PREFIX = '/editor.html?path=';
  const COPY_LINK_PREFIX = '@/';
  const RIGHT_ARROW = '\u25BA', DOWN_ARROW = '\u25BC';

  // ################################################
  // Utilities


  // ################################################
  // Messages and Modals

  function showMessage(message) {
    $('#header-message').finish().text(message).show().delay(1000).fadeOut('slow');
  }

  let errorModal = MODAL.createModal(
    'Error', '',
    $('<button type=button>').text('OK').click(MODAL.hideModals));

  function showError(message) {
    console.log(message);
    if (message.responseJSON) {
      message = message.responseJSON.error;
    } else if (message.status === 0) {
      message = 'Cannot connect to the server.';
    }
    errorModal.find('.modal-body').text(message);
    MODAL.showModal(errorModal);
  }

  // ################################################
  // Load the note list

  function loadList() {
    $.get('/api/list', displayList).fail(showError);
  }

  // noteIndex --> {entry (loaded JSON), row (JQuery obj)}
  const allNotes = [];
  // list of dirnames / list of {notes (list of noteIndices), row (JQuery obj)}
  const dirnames = [], dirData = [];

  function displayList(data) {
    $('#notes-table > tbody').empty();
    data.notes.forEach(function (entry, noteIndex) {
      let dirIndex = dirnames.indexOf(entry.dirname);
      if (dirIndex === -1) {
        dirIndex = dirnames.length;
        dirnames.push(entry.dirname);
        dirData[dirIndex] = {
          notes: [],
          row: createDirRow(entry.dirname, dirIndex),
        };
      }
      dirData[dirIndex].notes.push(noteIndex);
      allNotes[noteIndex] = {
        entry: entry,
        row: createNoteRow(entry, noteIndex),
        searchKey: getSearchKey(entry),
      };
    });
    showAllRows();
  }

  function createDirRow(dirname, dirIndex) {
    let row = $('<tr class="dir">').attr('data-id', dirIndex);
    let cell;
    // Dropdown
    cell = $('<td>').appendTo(row)
      .append($('<span class="close">').text(RIGHT_ARROW))
      .append($('<span class="open">').text(DOWN_ARROW));
    // Dirname
    cell = $('<td class="dirname">').appendTo(row);
    if (dirname !== ".") {
      cell.text(dirname);
    } else {
      cell.addClass('none').text('(root)');
    }
    // The rest
    for (let i = 0; i < 4; i++) {
      $('<td>').appendTo(row);
    }
    return row;
  }

  function createNoteRow(entry, noteIndex) {
    let row = $('<tr class="note">').attr('data-id', noteIndex);
    let cell;
    // Dropdown
    cell = $('<td>').appendTo(row);
    // Dirname
    cell = $('<td>').appendTo(row);
    if (entry.dirname !== ".") {
      cell.text(entry.dirname);
    } else {
      cell.addClass('none').text('(root)');
    }
    // Index
    cell = $('<td>').appendTo(row);
    if (entry.meta.index.trim() !== "") {
      cell.text(entry.meta.index);
    } else {
      cell.addClass('none').text('(none)');
    }
    // Title
    cell = $('<td class="title">').appendTo(row);
    if (entry.meta.title.trim() !== "") {
      cell.text(entry.meta.title);
    } else {
      cell.text('(untitled)');
    }
    // Filename
    cell = $('<td>').appendTo(row);
    cell.text(entry.filename);
    // Get link
    cell = $('<td>').appendTo(row);
    cell.append($('<button type="button" class="get-link">').text('Link'));
    return row;
  }

  function getSearchKey(entry) {
    return (
      (entry.dirname + '/' + entry.filename) + ' '
      + (entry.meta.index || '') + ' '
      + (entry.meta.title || '')).toLowerCase();
  }

  // ################################################
  // Showing rows

  function showAllRows() {
    let tbody = $('#notes-table > tbody').empty();
    dirData.forEach(function (dirDatum) {
      dirDatum.row.appendTo(tbody);
      if (dirDatum.row.hasClass('open')) {
        dirDatum.notes.forEach(function (noteIndex) {
          allNotes[noteIndex].row.appendTo(tbody);
        });
      }
    });
  }

  function showFilteredRows(filters) {
    let tbody = $('#notes-table > tbody').empty();
    allNotes.forEach(function (noteDatum) {
      for (let i = 0; i < filters.length; i++) {
        if (noteDatum.searchKey.indexOf(filters[i]) !== -1) {
          noteDatum.row.appendTo(tbody);
          return;
        }
      }
    });
  }

  // ################################################
  // Events

  // Open or close the directory
  $('#notes-table').on('click', 'tr.dir', function (e) {
    let dirIndex = $(this).attr('data-id');
    dirData[dirIndex].row.toggleClass('open');
    showAllRows();
  });

  // Make the title cell a link.
  $('#notes-table').on('click auxclick', 'tr.note td.title', function (e) {
    let noteIndex = $(this).closest('tr').attr('data-id'),
      entry = allNotes[noteIndex].entry,
      linkHref = entry.dirname + '/' + entry.filename;
    if (e.button === 0) {
      window.open(OPEN_LINK_PREFIX + linkHref, '_self');
    } else if (e.button === 1) { 
      window.open(OPEN_LINK_PREFIX + linkHref, '_blank');
    } else {
      return false;
    }
  });

  // Copy relative link
  $('#notes-table').on('click', 'button.get-link', function (e) {
    let noteIndex = $(this).closest('tr').attr('data-id'),
      linkHref = allNotes[noteIndex].linkHref,
      copySrc = $('#copySrc');
    copySrc.val(COPY_LINK_PREFIX + linkHref);
    copySrc[0].select();
    copySrc[0].setSelectionRange(0, 99999);
    document.execCommand("copy");
    showMessage('Copied!');
  });

  // Filter
  $('#header-search').on('input', function (e) {
    let value = $(this).val().trim().toLowerCase();
    if (value === "") {
      showAllRows();
    } else {
      showFilteredRows(value.split(/\s+/));
    }
  });

  // ################################################
  // Initialization

  loadList();

});
