'use strict';

(function(exports) {

  var modal, roomNameInput, saveButton, closeButton, form, counter;

  var _ = navigator.mozL10n.get;

  const CONFIG = {
    expiresIn: 24,
    maxSize: 2,
    maxRoomNamesSize: 100
  };

  function render() {
    if (modal) {
      return;
    }

    modal = document.getElementById('new-room');
    modal.innerHTML = Template.extract(modal);
    roomNameInput = modal.querySelector('input');
    saveButton = modal.querySelector('#save-room-action');
    closeButton = modal.querySelector('.icon-close');
    form = modal.querySelector('form');
    counter = modal.querySelector('.counter span');
    roomNameInput.placeholder = _('roomNamePlaceHolder');
  }

  function show(cb) {
    modal.classList.remove('hide');
    // We emit this event to center properly the header
    window.dispatchEvent(new CustomEvent('lazyload', {
      detail: modal
    }));
    // Allow UI to be painted before launching the animation
    setTimeout(() => {
      modal.addEventListener('transitionend', function onTransitionEnd() {
        modal.removeEventListener('transitionend', onTransitionEnd);
        typeof cb === 'function' && cb();
      });
      modal.classList.add('show');
    }, 50);
  }

  function hide() {
    modal.addEventListener('transitionend', function onTransitionEnd() {
      modal.removeEventListener('transitionend', onTransitionEnd);
      removeHandlers();
      modal.classList.add('hide');
    });
    modal.classList.remove('show');
  }

  function checkButtons() {
    var value = roomNameInput.value.trim();
    saveButton.disabled = value === '';
    // We have to decrease one because 0..CONFIG.maxRoomNamesSize - 1
    var countdown = CONFIG.maxRoomNamesSize - value.length - 1;
    counter.textContent = countdown;
    countdown < 0 ? counter.classList.add('limitExceeded') :
                    counter.classList.remove('limitExceeded');
  }

  function clearRoomName(evt) {
    evt && evt.preventDefault();
    roomNameInput.value = '';
    checkButtons();
  }

  function saveFromKeyboard(evt) {
    evt.preventDefault();
    evt.stopPropagation();
    roomNameInput.value.trim() !== '' && save();
  }

  function save() {
    if (!navigator.onLine) {
      LazyLoader.load('js/screens/error_screen.js', () => {
        OfflineScreen.show(_('noConnection'));
      });
      return;
    }

    LoadingOverlay.show(_('saving'));

    var params = {
      roomName: roomNameInput.value.trim(),
      expiresIn: CONFIG.expiresIn,
      roomOwner: Controller.identity,
      maxSize: CONFIG.maxSize
    };
    
    var token;
    Rooms.create(params).then((response) => {
      token = response.roomToken;
      return Rooms.get(token);
    }).then((room) => {
      return RoomsDB.create(room);
    }).then((room) => {
      Controller.onRoomCreated(room, token);
      hide();
    }).catch((error) => {
      console.error(JSON.stringify(error));
      // TODO -> Bug 1102157
      alert(error);
    }).then(() => {
      LoadingOverlay.hide();
    });
  }

  function attachHandlers() {
    closeButton.addEventListener('click', hide);
    saveButton.addEventListener('click', save);
    form.addEventListener('input', checkButtons);
    form.addEventListener('submit', saveFromKeyboard);
  }

  function removeHandlers() {
    closeButton.removeEventListener('click', hide);
    saveButton.removeEventListener('click', save);
    form.removeEventListener('input', checkButtons);
    form.removeEventListener('submit', saveFromKeyboard);
  }

  exports.RoomCreate = {
    show: () => {
      render();
      clearRoomName();
      show(attachHandlers);
    }
  };;

}(window));
