let MODAL = (function () {
  'use strict';
  var _MODAL = {};

  // Create a new modal dialog box.
  _MODAL.createModal = function (title, body, buttons) {
    let modalWrapper = $('#modal-wrapper');
    if (!modalWrapper.length) {
      modalWrapper = $('<div id="modal-wrapper">')
        .appendTo('body')
        .keyup(function (e) {
          if (e.key === "Escape") {
            _MODAL.hideModals();
            e.preventDefault();
          }
        });
    }
    let modalBox = $('<div class="modal-box">').appendTo(modalWrapper);
    if (title !== undefined) {
      $('<div class="modal-title">').appendTo(modalBox).append(title);
      $('<div class="modal-body">').appendTo(modalBox).append(body);
      $('<div class="modal-buttons">').appendTo(modalBox).append(buttons);
    }
    return modalBox;
  };

  // Show only the specified modal.
  _MODAL.showModal = function (modalBox) {
    $('.modal-box').hide();
    modalBox.show();
    $('#modal-wrapper').addClass('show');
  }

  // Check if a model is open
  _MODAL.hasModal = function () {
    return $('#modal-wrapper').hasClass('show');
  }

  // Hide all modals.
  _MODAL.hideModals = function () {
    $('.modal-box').hide();
    $('#modal-wrapper').removeClass('show');
  }

  return _MODAL;
})();
