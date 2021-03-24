let MODAL = (function () {
  'use strict';
  var _MODAL = {};

  // Create a new modal dialog box.
  _MODAL.createModal = function (title, body, buttons) {
    let modalWrapper = $('#modal-wrapper');
    if (!modalWrapper.length) {
      modalWrapper = $('<div id="modal-wrapper">').appendTo('body');
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
    $('#modal-wrapper').show();
  }

  // Hide all modals.
  _MODAL.hideModals = function () {
    $('.modal-box').hide();
    $('#modal-wrapper').hide();
  }

  return _MODAL;
})();
