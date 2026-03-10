/* v1.4 by phploaded */
(function ($) {
  const defaults = {
    getTitle: '.title',
    showTitle: true,
    getInfo: '.info',
    showInfo: false,
    getPic: 'a:first',
    fullScreen: true,
    slideTime: 5000,
    swipeThreshold: 70,
    swipeMaxVertical: 120,
    transitionDuration: 280,
    pinchMaxScale: 4,
    doubleTapScale: 2,
    onOpen: null,
    onClose: null,
    onNext: null,
    onPrev: null,
  };

  let mboxCounter = 0;
  const instances = [];
  let slideshowTimeout = null;
  let progressTimeout = null;
  const DOUBLE_TAP_DELAY = 280;
  const DOUBLE_TAP_RADIUS = 28;

  $.fn.mBox = function (options) {
    const settings = $.extend({}, defaults, options);

    this.each(function () {
      const $el = $(this);

      if (!$el.attr('mbox-id')) {
        let id;
        do {
          id = mboxCounter++;
        } while ($(`[mbox-id="${id}"]`).length > 0);
        $el.attr('mbox-id', id);
      }

      if (!$el.attr('mbox-type')) {
        $el.attr('mbox-type', 'image');
      }

      if (!$el.attr('mbox-full')) {
        $el.attr('mbox-full', 'true');
      }

      if (!$el.attr('mbox-group')) {
        $el.attr('mbox-group', 'ungrouped');
      }

      $el.off('click.mbox').on('click.mbox', function (e) {
        e.preventDefault();
        openLightbox($el, settings);
      });

      if (!instances.some((instance) => instance.is($el))) {
        instances.push($el);
      }
    });

    return this;
  };

  function openLightbox($el, settings) {
    clearSlideShow();
    $(document).off('keydown.mbox');
    $('.mbox-ctr').remove();

    const $ctr = $('<div class="mbox-ctr"></div>');
    const $bg = $('<div class="mbox-bg"></div>');
    const $lightbox = $('<div class="mbox-lightbox"></div>').data('currentEl', $el);
    const $content = $('<div class="mbox-content"><div class="mbox-stage"></div><div class="mbox-zoom-indicator" aria-live="polite">100%</div></div>');
    const $controls = $('<div class="mbox-controls"></div>');

    const group = $el.attr('mbox-group');
    const groupInstances = instances.filter((instance) => instance.attr('mbox-group') === group);
    const currentIndex = groupInstances.findIndex((instance) => instance.is($el));
    const totalCount = groupInstances.length;

    const $header = $(
      `<div class="mbox-header">
        <div class="mbox-count">${currentIndex + 1}/${totalCount}</div>
        <ul class="mbox-actions">
          <li class="mbox-play"></li><li class="mbox-rotate"></li><li class="mbox-screenfit"></li><li class="mbox-fullscreen"></li><li class="mbox-close"></li>
        </ul>
      </div>`
    );

    const $footer = $(
      `<div class="mbox-footer">
        <div xtitle="social Icons will go here in future" class="mbox-icons"></div>
        <div tabindex="0" class="mbox-descr">
          <div class="mbox-title"></div>
          <div class="mbox-info-ctr"><div class="mbox-info"></div></div>
        </div>
        <div class="mbox-preload"></div>
        <div class="mbox-progress-out"><div class="mbox-progress" style="width: 0%;"></div></div>
      </div>`
    );

    const $prevButton = $('<div class="mbox-prev"></div>').toggle(currentIndex > 0);
    const $nextButton = $('<div class="mbox-next"></div>').toggle(currentIndex < totalCount - 1);

    $lightbox.data('mboxState', {
      currentIndex,
      groupInstances,
      settings,
      isTransitioning: false,
      preloadCache: {},
      stageWindow: [],
      swipe: null,
      activePointers: {},
      pointerOrder: [],
      gesture: null,
      tapTracker: null,
      zoom: createZoomState(),
      zoomIndicatorTimer: null,
    });

    $lightbox[0].style.setProperty('--mbox-transition-duration', `${settings.transitionDuration}ms`);
    $lightbox.append($content, $header, $footer);
    $controls.append($prevButton, $nextButton);
    $lightbox.append($controls);
    $ctr.append($bg, $lightbox);

    if ($('.mbox-main-body').length === 0) {
      $('body').wrapInner('<div class="mbox-main-body mbox-blur"></div>');
    } else {
      $('.mbox-main-body').addClass('mbox-blur');
    }

    $('body').append($ctr);

    if (settings.fullScreen === true) {
      mBox_fullScreen();
    }

    updateLightboxContent($el, currentIndex, totalCount, settings);

    $ctr.on('click', '.mbox-close', () => closeLightbox($ctr, settings));
    $prevButton.on('click', () => navigateLightbox(-1, currentIndex, groupInstances, settings));
    $nextButton.on('click', () => navigateLightbox(1, currentIndex, groupInstances, settings));
    $ctr.find('.mbox-screenfit').on('click', () => mBox_fitscreen());
    $ctr.find('.mbox-rotate').on('click', () => mBox_rotate());
    $ctr.find('.mbox-fullscreen').on('click', () => mBox_fullScreen());
    $ctr.find('.mbox-play').on('click', () => mBox_slideShow());
    $ctr.find('.mbox-descr').on('mouseenter', () => $ctr.find('.mbox-info').stop(true, true).slideDown('fast'));
    $ctr.find('.mbox-descr').on('mouseleave', () => $ctr.find('.mbox-info').stop(true, true).slideUp('fast'));

    bindSwipeNavigation($lightbox);

    $(document).on('keydown.mbox', (e) => handleKeyboardNavigation(e, $ctr));

    if (settings.onOpen) {
      settings.onOpen($el, $lightbox);
    }
  }

  function handleKeyboardNavigation(e, $ctr) {
    if (!$ctr.length) {
      return;
    }

    const key = String(e.key || '').toLowerCase();

    switch (key) {
      case 'arrowright':
        $('.mbox-next:visible').trigger('click');
        break;
      case 'arrowleft':
        $('.mbox-prev:visible').trigger('click');
        break;
      case ' ':
      case 'spacebar':
        e.preventDefault();
        $('.mbox-play').trigger('click');
        break;
      case 'escape':
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
          $('.mbox-fullscreen').removeClass('mbox-restore');
        } else {
          $('.mbox-close').trigger('click');
        }
        break;
      case 'r':
        $('.mbox-rotate').trigger('click');
        break;
      case 'c':
        $('.mbox-screenfit').trigger('click');
        break;
    }
  }

  function closeLightbox($ctr, settings) {
    clearSlideShow();
    $(document).off('keydown.mbox');
    const state = getLightboxState();
    if (state && state.zoomIndicatorTimer) {
      clearTimeout(state.zoomIndicatorTimer);
      state.zoomIndicatorTimer = null;
    }
    $('body').removeClass('mbox-zoomfit');
    $ctr.remove();
    $('.mbox-main-body').removeClass('mbox-blur');
    if (settings.onClose) {
      settings.onClose();
    }
  }

  function clearSlideShow() {
    const $playButton = $('.mbox-play');
    const $progressOut = $('.mbox-progress-out');
    const $progressBar = $('.mbox-progress');
    const $lightbox = $('.mbox-lightbox');
    const state = getLightboxState();

    $playButton.removeClass('mbox-pause');
    $progressOut.hide();
    $progressBar.css('width', '0%');
    $lightbox.removeClass('mbox-slideshow-active');
    $lightbox.find('.mbox-main-img').removeClass('mbox-fit-scanning');
    if ($lightbox.length && !$lightbox.hasClass('mbox-zoomfit')) {
      $lightbox[0].style.removeProperty('--mbox-slideshow-duration');
    }
    clearTimeout(slideshowTimeout);
    clearTimeout(progressTimeout);
    slideshowTimeout = null;
    progressTimeout = null;

    if ($lightbox.length && state && $lightbox.hasClass('mbox-zoomfit')) {
      syncCurrentFitScan($lightbox, state.settings.slideTime || defaults.slideTime);
    }
  }

  function mBox_fitscreen() {
    const $lightbox = $('.mbox-lightbox');
    const state = getLightboxState();
    const $image = $lightbox.find('.mbox-slide.is-current .mbox-main-img').first();
    if (!$lightbox.length) {
      return;
    }

    $('body').removeClass('mbox-zoomfit');
    $lightbox.toggleClass('mbox-zoomfit');

    if ($image.length) {
      applyImageRotation($image, parseInt($image.attr('mbox-deg'), 10) || 0, $lightbox);
    }

    if (state) {
      resetZoomState(state, true);
      clampZoomState($lightbox, state);
      applyActiveZoomTransform($lightbox, state, false);
      syncCurrentFitScan($lightbox, state.settings.slideTime || defaults.slideTime);
    }
  }

  function mBox_slideShow() {
    const $playButton = $('.mbox-play');
    const $progressOut = $('.mbox-progress-out');
    const $lightbox = $('.mbox-lightbox');
    const state = getLightboxState();
    const settings = state ? state.settings : $.extend({}, defaults);

    if ($playButton.hasClass('mbox-pause')) {
      clearSlideShow();
      return;
    }

    $playButton.addClass('mbox-pause');
    $progressOut.show();
    $lightbox.addClass('mbox-slideshow-active');
    runSlideShowCycle(settings.slideTime || defaults.slideTime);
  }

  function runSlideShowCycle(slideTime) {
    const $playButton = $('.mbox-play');
    const $progressBar = $('.mbox-progress');
    const $lightbox = $('.mbox-lightbox');
    const startedAt = Date.now();

    if (!$playButton.hasClass('mbox-pause') || !$lightbox.length) {
      return;
    }

    clearTimeout(slideshowTimeout);
    clearTimeout(progressTimeout);
    slideshowTimeout = null;
    progressTimeout = null;
    $progressBar.css('width', '0%');
    syncCurrentFitScan($lightbox, slideTime);

    function updateProgress() {
      if (!$playButton.hasClass('mbox-pause')) {
        return;
      }

      const elapsed = Date.now() - startedAt;
      const progress = Math.min((elapsed / slideTime) * 100, 100);
      $progressBar.css('width', `${progress}%`);

      if (elapsed < slideTime) {
        progressTimeout = setTimeout(updateProgress, 100);
      }
    }

    function advanceSlide() {
      const currentState = getLightboxState();
      const $nextButton = $('.mbox-next:visible');

      if (!$playButton.hasClass('mbox-pause') || !currentState) {
        return;
      }

      if (currentState.isTransitioning) {
        slideshowTimeout = setTimeout(advanceSlide, 80);
        return;
      }

      if (!$nextButton.length) {
        clearSlideShow();
        return;
      }

      $nextButton.trigger('click');
      slideshowTimeout = setTimeout(() => {
        if ($playButton.hasClass('mbox-pause')) {
          runSlideShowCycle(slideTime);
        }
      }, (currentState.settings.transitionDuration || defaults.transitionDuration) + 60);
    }

    updateProgress();
    slideshowTimeout = setTimeout(advanceSlide, slideTime);
  }

  function syncCurrentFitScan($lightbox, slideTime) {
    if (!$lightbox.length) {
      return;
    }

    $lightbox.find('.mbox-main-img').removeClass('mbox-fit-scanning');
    $lightbox[0].style.setProperty('--mbox-slideshow-duration', `${slideTime}ms`);

    if (!$lightbox.hasClass('mbox-zoomfit')) {
      return;
    }

    const $img = $lightbox.find('.mbox-slide.is-current .mbox-main-img').first();
    if (!$img.length) {
      return;
    }

    $img[0].offsetWidth;
    $img.addClass('mbox-fit-scanning');
  }

  function mBox_fullScreen() {
    const $ctr = $('.mbox-ctr');

    if (!$ctr.length) {
      return;
    }

    if (document.fullscreenElement) {
      document.exitFullscreen().then(() => {
        $('.mbox-fullscreen').removeClass('mbox-restore');
      }).catch((err) => {
        console.error('Error exiting fullscreen:', err);
      });
    } else {
      $ctr[0].requestFullscreen().then(() => {
        $('.mbox-fullscreen').addClass('mbox-restore');
      }).catch((err) => {
        console.error('Error entering fullscreen:', err);
      });
    }
  }

  function mBox_rotate() {
    const $image = $('.mbox-slide.is-current .mbox-main-img').first();
    const $lightbox = $('.mbox-lightbox');
    const state = getLightboxState();
    let rotation = parseInt($image.attr('mbox-deg'), 10);

    if (isNaN(rotation)) {
      rotation = 0;
    }

    rotation += 90;
    if (rotation === 360) {
      rotation = 0;
    }

    if ($image.length) {
      $lightbox.removeClass('mbox-zoomfit');
      applyImageRotation($image, rotation, $lightbox);
    }

    if (state) {
      resetZoomState(state, true);
      clampZoomState($lightbox, state);
      applyActiveZoomTransform($lightbox, state, false);
    }
  }

  function navigateLightbox(direction, _, groupInstances, settings) {
    const $lightbox = $('.mbox-lightbox');
    if (!$lightbox.length) {
      return;
    }

    const state = $lightbox.data('mboxState') || {};
    const items = groupInstances || state.groupInstances || [];
    const resolvedSettings = settings || state.settings || $.extend({}, defaults);

    if (state.isTransitioning || !items.length) {
      return;
    }

    const $currentEl = $lightbox.data('currentEl');
    const currentIndex = typeof state.currentIndex === 'number'
      ? state.currentIndex
      : items.findIndex((item) => item.is($currentEl));
    const newIndex = currentIndex + direction;

    if (newIndex < 0 || newIndex >= items.length) {
      return;
    }

    const $newEl = items[newIndex];
    animateDirectionalNavigation($lightbox, state, newIndex, direction, $newEl, resolvedSettings);
  }

  function bindSwipeNavigation($lightbox) {
    const $content = $lightbox.find('.mbox-content');
    const contentEl = $content[0];

    $content.off('.mboxSwipe');
    $content.on('dragstart.mboxSwipe', 'img', (e) => e.preventDefault());
    $content.on('wheel.mboxSwipe', function (e) {
      if (handleWheelZoom($lightbox, e.originalEvent || e)) {
        e.preventDefault();
      }
    });

    if (window.PointerEvent) {
      $content.on('pointerdown.mboxSwipe', function (e) {
        if (e.pointerType === 'mouse' && e.button !== 0) {
          return;
        }

        handlePointerStart($lightbox, e.pointerId, e.clientX, e.clientY);

        if (contentEl && contentEl.setPointerCapture) {
          try {
            contentEl.setPointerCapture(e.pointerId);
          } catch (err) {}
        }
      });

      $content.on('pointermove.mboxSwipe', function (e) {
        if (handlePointerMove($lightbox, e.pointerId, e.clientX, e.clientY)) {
          e.preventDefault();
        }
      });

      $content.on('pointerup.mboxSwipe', function (e) {
        releasePointerCapture(contentEl, e.pointerId);
        if (handlePointerEnd($lightbox, e.pointerId, e.clientX, e.clientY, false)) {
          e.preventDefault();
        }
      });

      $content.on('pointercancel.mboxSwipe', function (e) {
        releasePointerCapture(contentEl, e.pointerId);
        handlePointerEnd($lightbox, e.pointerId, e.clientX, e.clientY, true);
      });
      return;
    }

    $content.on('touchstart.mboxSwipe', function (e) {
      const touches = e.originalEvent.changedTouches || [];
      Array.prototype.forEach.call(touches, (touch) => {
        handlePointerStart($lightbox, `touch-${touch.identifier}`, touch.clientX, touch.clientY);
      });
    });

    $content.on('touchmove.mboxSwipe', function (e) {
      const touches = e.originalEvent.touches || [];
      let handled = false;
      Array.prototype.forEach.call(touches, (touch) => {
        handled = handlePointerMove($lightbox, `touch-${touch.identifier}`, touch.clientX, touch.clientY) || handled;
      });
      if (handled) {
        e.preventDefault();
      }
    });

    $content.on('touchend.mboxSwipe touchcancel.mboxSwipe', function (e) {
      const touches = e.originalEvent.changedTouches || [];
      const isCancel = e.type === 'touchcancel';
      let handled = false;
      Array.prototype.forEach.call(touches, (touch) => {
        handled = handlePointerEnd($lightbox, `touch-${touch.identifier}`, touch.clientX, touch.clientY, isCancel) || handled;
      });
      if (handled) {
        e.preventDefault();
      }
    });
  }

  function releasePointerCapture(contentEl, pointerId) {
    if (contentEl && contentEl.releasePointerCapture) {
      try {
        contentEl.releasePointerCapture(pointerId);
      } catch (err) {}
    }
  }

  function handlePointerStart($lightbox, pointerId, clientX, clientY) {
    const state = $lightbox.data('mboxState');
    if (!state || state.isTransitioning) {
      return;
    }

    registerGesturePointer(state, pointerId, clientX, clientY);

    if (state.pointerOrder.length >= 2) {
      beginPinchGesture($lightbox, state);
      return;
    }

    state.tapTracker = {
      pointerId,
      startX: clientX,
      startY: clientY,
      moved: false,
      startedAt: Date.now(),
    };

    if (ensureZoomState(state).scale > 1.01) {
      beginPanGesture($lightbox, state, pointerId);
      return;
    }

    if (state.groupInstances.length > 1) {
      beginSwipeGesture($lightbox, state, pointerId, clientX, clientY);
      return;
    }

    state.gesture = {
      type: 'tap',
      pointerId,
      startX: clientX,
      startY: clientY,
    };
    updateGestureClasses($lightbox, state);
  }

  function handlePointerMove($lightbox, pointerId, clientX, clientY) {
    const state = $lightbox.data('mboxState');
    if (!state || !state.activePointers[pointerId]) {
      return false;
    }

    updateGesturePointer(state, pointerId, clientX, clientY);

    if (state.tapTracker && state.tapTracker.pointerId === pointerId) {
      const movedX = clientX - state.tapTracker.startX;
      const movedY = clientY - state.tapTracker.startY;
      if (Math.abs(movedX) > 8 || Math.abs(movedY) > 8) {
        state.tapTracker.moved = true;
      }
    }

    if (state.pointerOrder.length >= 2) {
      if (!state.gesture || state.gesture.type !== 'pinch') {
        beginPinchGesture($lightbox, state);
      }
      return updatePinchGesture($lightbox, state);
    }

    if (!state.gesture) {
      return false;
    }

    if (state.gesture.type === 'pan' && state.gesture.pointerId === pointerId) {
      return updatePanGesture($lightbox, state, clientX, clientY);
    }

    if (state.gesture.type === 'swipe' && state.gesture.pointerId === pointerId) {
      return updateSwipeGesture($lightbox, state, clientX, clientY);
    }

    return false;
  }

  function handlePointerEnd($lightbox, pointerId, clientX, clientY, isCancel) {
    const state = $lightbox.data('mboxState');
    if (!state) {
      return false;
    }

    if (state.activePointers[pointerId]) {
      updateGesturePointer(state, pointerId, clientX, clientY);
    }

    const tapTracker = state.tapTracker && state.tapTracker.pointerId === pointerId ? state.tapTracker : null;
    const gestureType = state.gesture ? state.gesture.type : '';
    let handled = false;

    if (gestureType === 'pinch') {
      removeGesturePointer(state, pointerId);
      handled = finishPinchGesture($lightbox, state, isCancel);
      if (!isCancel && state.pointerOrder.length === 1 && ensureZoomState(state).scale > 1.01) {
        beginPanGesture($lightbox, state, state.pointerOrder[0]);
      } else {
        state.gesture = null;
        updateGestureClasses($lightbox, state);
      }
      state.tapTracker = null;
      return handled;
    }

    removeGesturePointer(state, pointerId);

    if (gestureType === 'pan' && state.gesture.pointerId === pointerId) {
      handled = finishPanGesture($lightbox, state, isCancel);
      state.gesture = null;
      state.tapTracker = null;
      updateGestureClasses($lightbox, state);
      return handled;
    }

    if (gestureType === 'swipe' && state.gesture.pointerId === pointerId) {
      handled = finishSwipeGesture($lightbox, state, clientX, clientY, isCancel);
      state.gesture = null;
      state.tapTracker = null;
      updateGestureClasses($lightbox, state);
      return handled;
    }

    if (gestureType === 'tap' && state.gesture.pointerId === pointerId) {
      state.gesture = null;
      state.tapTracker = null;
      updateGestureClasses($lightbox, state);
      return true;
    }

    state.tapTracker = null;
    updateGestureClasses($lightbox, state);
    return handled;
  }

  function registerGesturePointer(state, pointerId, clientX, clientY) {
    state.activePointers[pointerId] = { x: clientX, y: clientY };
    if (!state.pointerOrder.includes(pointerId)) {
      state.pointerOrder.push(pointerId);
    }
  }

  function updateGesturePointer(state, pointerId, clientX, clientY) {
    state.activePointers[pointerId] = { x: clientX, y: clientY };
  }

  function removeGesturePointer(state, pointerId) {
    delete state.activePointers[pointerId];
    state.pointerOrder = state.pointerOrder.filter((id) => id !== pointerId);
  }

  function beginSwipeGesture($lightbox, state, pointerId, clientX, clientY) {
    state.swipe = {
      startX: clientX,
      startY: clientY,
      deltaX: 0,
      deltaY: 0,
      dragging: false,
      axisLocked: null,
      stageWidth: getStageWidth($lightbox),
    };
    state.gesture = {
      type: 'swipe',
      pointerId,
    };
    applyRestStageLayout($lightbox, state);
    updateGestureClasses($lightbox, state);
  }

  function updateSwipeGesture($lightbox, state, clientX, clientY) {
    const swipe = state.swipe;
    if (!swipe || state.isTransitioning) {
      return false;
    }

    swipe.deltaX = clientX - swipe.startX;
    swipe.deltaY = clientY - swipe.startY;

    if (!swipe.axisLocked) {
      if (Math.abs(swipe.deltaX) < 8 && Math.abs(swipe.deltaY) < 8) {
        return false;
      }
      swipe.axisLocked = Math.abs(swipe.deltaX) >= Math.abs(swipe.deltaY) ? 'x' : 'y';
    }

    if (swipe.axisLocked !== 'x') {
      return false;
    }

    if (Math.abs(swipe.deltaY) > state.settings.swipeMaxVertical) {
      return false;
    }

    swipe.dragging = true;
    $lightbox.find('.mbox-stage').addClass('is-dragging');
    applySwipeLayout($lightbox, state, getConstrainedDeltaX(state, swipe.deltaX));
    return true;
  }

  function finishSwipeGesture($lightbox, state, clientX, clientY, isCancel) {
    const swipe = state.swipe;
    if (!swipe) {
      return false;
    }

    swipe.deltaX = clientX - swipe.startX;
    swipe.deltaY = clientY - swipe.startY;

    if (isCancel || !swipe.dragging) {
      applyRestStageLayout($lightbox, state);
      state.swipe = null;
      return false;
    }

    const constrainedDeltaX = getConstrainedDeltaX(state, swipe.deltaX);
    const direction = resolveSwipeDirection(state, constrainedDeltaX, swipe.deltaY);
    state.swipe = null;

    if (!direction) {
      applyRestStageLayout($lightbox, state);
      return true;
    }

    animateDirectionalNavigation(
      $lightbox,
      state,
      state.currentIndex + direction,
      direction,
      state.groupInstances[state.currentIndex + direction],
      state.settings
    );
    return true;
  }

  function beginPanGesture($lightbox, state, pointerId) {
    const point = state.activePointers[pointerId];
    const zoom = ensureZoomState(state);
    zoom.activeIndex = state.currentIndex;
    zoom.panning = true;
    state.gesture = {
      type: 'pan',
      pointerId,
      startX: point ? point.x : 0,
      startY: point ? point.y : 0,
      originX: zoom.x,
      originY: zoom.y,
    };
    updateGestureClasses($lightbox, state);
  }

  function updatePanGesture($lightbox, state, clientX, clientY) {
    const gesture = state.gesture;
    const zoom = ensureZoomState(state);
    if (!gesture || gesture.type !== 'pan') {
      return false;
    }

    zoom.x = gesture.originX + (clientX - gesture.startX);
    zoom.y = gesture.originY + (clientY - gesture.startY);
    clampZoomState($lightbox, state);
    applyActiveZoomTransform($lightbox, state, false);
    return true;
  }

  function finishPanGesture($lightbox, state, isCancel) {
    const zoom = ensureZoomState(state);
    zoom.panning = false;
    if (isCancel) {
      clampZoomState($lightbox, state);
      applyActiveZoomTransform($lightbox, state, false);
    }
    updateGestureClasses($lightbox, state);
    return zoom.scale > 1.01;
  }

  function beginPinchGesture($lightbox, state) {
    const pair = getPointerPair(state);
    if (!pair) {
      return;
    }

    const zoom = ensureZoomState(state);
    zoom.activeIndex = state.currentIndex;
    zoom.panning = false;
    state.tapTracker = null;
    state.swipe = null;
    applyRestStageLayout($lightbox, state);

    state.gesture = {
      type: 'pinch',
      initialDistance: getPointerDistance(pair[0], pair[1]),
      initialScale: zoom.scale,
      originX: zoom.x,
      originY: zoom.y,
      initialCenter: getPointerCenter(pair[0], pair[1]),
    };
    updateGestureClasses($lightbox, state);
  }

  function updatePinchGesture($lightbox, state) {
    const gesture = state.gesture;
    const pair = getPointerPair(state);
    const zoom = ensureZoomState(state);

    if (!gesture || gesture.type !== 'pinch' || !pair) {
      return false;
    }

    const distance = Math.max(1, getPointerDistance(pair[0], pair[1]));
    const center = getPointerCenter(pair[0], pair[1]);
    const scaleRatio = distance / Math.max(gesture.initialDistance, 1);
    const rawScale = clamp(
      gesture.initialScale * scaleRatio,
      1,
      state.settings.pinchMaxScale || defaults.pinchMaxScale
    );
    const quantizedScale = quantizeScale(rawScale);
    const zoomRatio = quantizedScale / Math.max(gesture.initialScale, 0.001);

    zoom.scale = quantizedScale;
    zoom.x = gesture.originX * zoomRatio + (center.x - gesture.initialCenter.x);
    zoom.y = gesture.originY * zoomRatio + (center.y - gesture.initialCenter.y);

    clampZoomState($lightbox, state);
    applyActiveZoomTransform($lightbox, state, true);
    return true;
  }

  function finishPinchGesture($lightbox, state, isCancel) {
    const zoom = ensureZoomState(state);
    if (isCancel || zoom.scale <= 1.01) {
      resetZoomState(state, true);
    }
    clampZoomState($lightbox, state);
    applyActiveZoomTransform($lightbox, state, true);
    updateGestureClasses($lightbox, state);
    return true;
  }

  function handleWheelZoom($lightbox, nativeEvent) {
    const state = $lightbox.data('mboxState');
    if (!state || state.isTransitioning) {
      return false;
    }

    const deltaY = typeof nativeEvent.deltaY === 'number' ? nativeEvent.deltaY : 0;
    if (!deltaY) {
      return false;
    }

    const currentScale = ensureZoomState(state).scale;
    const nextScale = quantizeScale(currentScale + (deltaY < 0 ? 0.1 : -0.1));

    if (nextScale === currentScale) {
      return false;
    }

    zoomToPoint($lightbox, state, nextScale, nativeEvent.clientX, nativeEvent.clientY);
    return true;
  }

  function handleTapCandidate($lightbox, state, clientX, clientY) {
    const zoom = ensureZoomState(state);
    const now = Date.now();
    const withinDelay = now - (zoom.lastTapAt || 0) <= DOUBLE_TAP_DELAY;
    const withinRadius = Math.abs(clientX - (zoom.lastTapX || 0)) <= DOUBLE_TAP_RADIUS
      && Math.abs(clientY - (zoom.lastTapY || 0)) <= DOUBLE_TAP_RADIUS;

    if (withinDelay && withinRadius) {
      zoom.lastTapAt = 0;
      toggleZoomAtPoint($lightbox, state, clientX, clientY);
      return true;
    }

    zoom.lastTapAt = now;
    zoom.lastTapX = clientX;
    zoom.lastTapY = clientY;
    return false;
  }

  function toggleZoomAtPoint($lightbox, state, clientX, clientY) {
    const zoom = ensureZoomState(state);
    const targetScale = zoom.scale > 1.01 ? 1 : (state.settings.doubleTapScale || defaults.doubleTapScale);
    zoomToPoint($lightbox, state, targetScale, clientX, clientY);
  }

  function zoomToPoint($lightbox, state, targetScale, clientX, clientY) {
    const zoom = ensureZoomState(state);
    const center = getContentCenter($lightbox);
    const nextScale = quantizeScale(clamp(targetScale, 1, state.settings.pinchMaxScale || defaults.pinchMaxScale));
    const currentScale = Math.max(zoom.scale, 1);
    const ratio = nextScale / currentScale;

    zoom.scale = nextScale;
    zoom.x = zoom.x * ratio - (clientX - center.x) * (ratio - 1);
    zoom.y = zoom.y * ratio - (clientY - center.y) * (ratio - 1);
    zoom.activeIndex = state.currentIndex;

    if (nextScale <= 1.01) {
      resetZoomState(state, true);
    }

    clampZoomState($lightbox, state);
    applyActiveZoomTransform($lightbox, state, true);
  }

  function resolveSwipeDirection(state, deltaX, deltaY) {
    if (Math.abs(deltaX) < state.settings.swipeThreshold) {
      return 0;
    }

    if (Math.abs(deltaY) > state.settings.swipeMaxVertical) {
      return 0;
    }

    if (Math.abs(deltaY) > Math.abs(deltaX) * 0.85) {
      return 0;
    }

    if (deltaX < 0 && state.currentIndex < state.groupInstances.length - 1) {
      return 1;
    }

    if (deltaX > 0 && state.currentIndex > 0) {
      return -1;
    }

    return 0;
  }

  function getConstrainedDeltaX(state, deltaX) {
    const hasPrev = state.currentIndex > 0;
    const hasNext = state.currentIndex < state.groupInstances.length - 1;

    if ((deltaX > 0 && !hasPrev) || (deltaX < 0 && !hasNext)) {
      return deltaX * 0.22;
    }

    return deltaX;
  }

  function clampZoomState($lightbox, state) {
    const zoom = ensureZoomState(state);
    const contentCenter = getContentCenter($lightbox);

    if (zoom.scale <= 1.01) {
      zoom.scale = 1;
      zoom.x = 0;
      zoom.y = 0;
      zoom.panning = false;
      return;
    }

    const limitX = (contentCenter.width * (zoom.scale - 1)) / 2;
    const limitY = (contentCenter.height * (zoom.scale - 1)) / 2;
    zoom.x = clamp(zoom.x, -limitX, limitX);
    zoom.y = clamp(zoom.y, -limitY, limitY);
  }

  function applyActiveZoomTransform($lightbox, state, showIndicator) {
    const zoom = ensureZoomState(state);
    $lightbox.find('.mbox-slide').each(function () {
      const $slide = $(this);
      const baseScale = parseFloat($slide.attr('data-mbox-media-scale')) || 1;
      const isCurrent = parseInt($slide.attr('data-mbox-index'), 10) === state.currentIndex;
      const $media = $slide.find('.mbox-slide-media').first();

      if (!$media.length) {
        return;
      }

      if (isCurrent) {
        $media.css('transform', `translate3d(${zoom.x}px, ${zoom.y}px, 0) scale(${baseScale * zoom.scale})`);
        return;
      }

      $media.css('transform', `translate3d(0, 0, 0) scale(${baseScale})`);
    });

    updateGestureClasses($lightbox, state);
    if (showIndicator === true) {
      showZoomIndicator($lightbox, state);
    }
  }

  function showZoomIndicator($lightbox, state) {
    const $indicator = $lightbox.find('.mbox-zoom-indicator');
    if (!$indicator.length) {
      return;
    }

    const percent = `${Math.round(ensureZoomState(state).scale * 100)}%`;
    $indicator.text(percent).addClass('is-visible');

    if (state.zoomIndicatorTimer) {
      clearTimeout(state.zoomIndicatorTimer);
    }

    state.zoomIndicatorTimer = setTimeout(() => {
      $indicator.removeClass('is-visible');
      state.zoomIndicatorTimer = null;
    }, 850);
  }

  function updateGestureClasses($lightbox, state) {
    const zoom = ensureZoomState(state);
    const gestureType = state.gesture ? state.gesture.type : '';
    $lightbox.toggleClass('is-zoomed', zoom.scale > 1.01);
    $lightbox.toggleClass('is-gesture-active', ['swipe', 'pan', 'pinch'].includes(gestureType));
    $lightbox.toggleClass('is-panning', gestureType === 'pan' || zoom.panning === true);
  }

  function createZoomState() {
    return {
      scale: 1,
      x: 0,
      y: 0,
      activeIndex: 0,
      panning: false,
      lastTapAt: 0,
      lastTapX: 0,
      lastTapY: 0,
    };
  }

  function ensureZoomState(state) {
    if (!state.zoom) {
      state.zoom = createZoomState();
    }
    return state.zoom;
  }

  function resetZoomState(state, preserveLastTap) {
    const current = ensureZoomState(state);
    state.zoom = {
      scale: 1,
      x: 0,
      y: 0,
      activeIndex: state.currentIndex,
      panning: false,
      lastTapAt: preserveLastTap ? current.lastTapAt : 0,
      lastTapX: preserveLastTap ? current.lastTapX : 0,
      lastTapY: preserveLastTap ? current.lastTapY : 0,
    };
    return state.zoom;
  }

  function getPointerPair(state) {
    if (!state.pointerOrder || state.pointerOrder.length < 2) {
      return null;
    }
    const first = state.activePointers[state.pointerOrder[0]];
    const second = state.activePointers[state.pointerOrder[1]];
    if (!first || !second) {
      return null;
    }
    return [first, second];
  }

  function getPointerDistance(first, second) {
    const dx = first.x - second.x;
    const dy = first.y - second.y;
    return Math.sqrt((dx * dx) + (dy * dy));
  }

  function getPointerCenter(first, second) {
    return {
      x: (first.x + second.x) / 2,
      y: (first.y + second.y) / 2,
    };
  }

  function getContentCenter($lightbox) {
    const rect = $lightbox.find('.mbox-content')[0].getBoundingClientRect();
    return {
      x: rect.left + (rect.width / 2),
      y: rect.top + (rect.height / 2),
      width: rect.width,
      height: rect.height,
    };
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function quantizeScale(value) {
    return Math.round(clamp(value, 1, defaults.pinchMaxScale) * 10) / 10;
  }

  function setSlidePose($slide, offsetX, scale, opacity, zIndex, stageWidth) {
    if (!$slide || !$slide.length) {
      return;
    }
    $slide.attr('data-mbox-media-scale', scale);
    $slide.css({
      transform: `translate3d(${offsetX}px, 0, 0)`,
      opacity,
      zIndex,
    });
    $slide.find('.mbox-slide-media').first().css('transform', `translate3d(0, 0, 0) scale(${scale})`);
    applyViewportClip($slide, offsetX, stageWidth);
  }

  function applyViewportClip($slide, offsetX, stageWidth) {
    if (!$slide || !$slide.length) {
      return;
    }

    const width = Math.max(1, stageWidth || 1);
    const leftInset = Math.max(0, Math.min(width, offsetX < 0 ? Math.abs(offsetX) : 0));
    const rightInset = Math.max(0, Math.min(width, offsetX > 0 ? Math.abs(offsetX) : 0));

    if (leftInset === 0 && rightInset === 0) {
      $slide.css('clip-path', 'inset(0 0 0 0)');
      return;
    }

    $slide.css('clip-path', `inset(0 ${rightInset}px 0 ${leftInset}px)`);
  }

  function getStageWidth($lightbox) {
    const width = $lightbox.find('.mbox-stage').outerWidth() || $lightbox.find('.mbox-content').outerWidth() || $(window).width();
    return Math.max(1, width);
  }

  function getRestOffset($lightbox) {
    return getStageWidth($lightbox);
  }

  function getSideScale($lightbox) {
    return getStageWidth($lightbox) < 640 ? 0.86 : 0.9;
  }

  function createStageWindow(state) {
    const windowItems = [];
    [state.currentIndex - 1, state.currentIndex, state.currentIndex + 1].forEach((index) => {
      if (index < 0 || index >= state.groupInstances.length) {
        return;
      }

      const $el = state.groupInstances[index];
      const $slide = createImageSlide($el, state.settings, {
        index,
        state,
        isCurrent: index === state.currentIndex,
      });
      windowItems.push({ index, $slide });
    });
    return windowItems;
  }

  function renderStageWindow($lightbox, state) {
    const $stage = $lightbox.find('.mbox-stage');
    const windowItems = createStageWindow(state);

    $stage.empty();
    windowItems.forEach((item) => {
      $stage.append(item.$slide);
    });

    state.stageWindow = windowItems;
    applyRestStageLayout($lightbox, state);
    applyActiveZoomTransform($lightbox, state, false);
    syncCurrentFitScan($lightbox, state.settings.slideTime || defaults.slideTime);
  }

  function applyRestStageLayout($lightbox, state) {
    const $stage = $lightbox.find('.mbox-stage');
    const stageWidth = getStageWidth($lightbox);
    const restOffset = getRestOffset($lightbox);
    const sideScale = getSideScale($lightbox);

    $stage.removeClass('is-dragging');
    $stage.find('.mbox-slide').each(function () {
      const $slide = $(this);
      const index = parseInt($slide.attr('data-mbox-index'), 10);
      $slide.removeClass('is-prev is-next is-current is-side');

      if (index === state.currentIndex) {
        $slide.addClass('is-current');
        setSlidePose($slide, 0, 1, 1, 4, stageWidth);
      } else if (index < state.currentIndex) {
        $slide.addClass('is-prev is-side');
        setSlidePose($slide, -restOffset, sideScale, 1, 2, stageWidth);
      } else {
        $slide.addClass('is-next is-side');
        setSlidePose($slide, restOffset, sideScale, 1, 2, stageWidth);
      }
    });
  }

  function applySwipeLayout($lightbox, state, deltaX) {
    const $stage = $lightbox.find('.mbox-stage');
    const $prevSlide = $stage.find(`.mbox-slide[data-mbox-index="${state.currentIndex - 1}"]`);
    const $currentSlide = $stage.find(`.mbox-slide[data-mbox-index="${state.currentIndex}"]`);
    const $nextSlide = $stage.find(`.mbox-slide[data-mbox-index="${state.currentIndex + 1}"]`);
    const width = getStageWidth($lightbox);
    const restOffset = getRestOffset($lightbox);
    const sideScale = getSideScale($lightbox);
    const progress = Math.min(1, Math.abs(deltaX) / Math.max(1, width * 0.72));

    if (deltaX <= 0) {
      setSlidePose($currentSlide, deltaX, 1 - (progress * 0.08), 1, 4, width);
      setSlidePose($nextSlide, restOffset + deltaX, sideScale + ((1 - sideScale) * progress), 1, 5, width);
      setSlidePose($prevSlide, -restOffset + (deltaX * 0.12), sideScale - (progress * 0.02), Math.max(0.1, 1 - (progress * 0.7)), 1, width);
      return;
    }

    setSlidePose($currentSlide, deltaX, 1 - (progress * 0.08), 1, 4, width);
    setSlidePose($prevSlide, -restOffset + deltaX, sideScale + ((1 - sideScale) * progress), 1, 5, width);
    setSlidePose($nextSlide, restOffset + (deltaX * 0.12), sideScale - (progress * 0.02), Math.max(0.1, 1 - (progress * 0.7)), 1, width);
  }

  function applyImageRotation($image, rotation, $lightbox) {
    const $resolvedLightbox = $lightbox && $lightbox.length ? $lightbox : $('.mbox-lightbox');
    const container = $resolvedLightbox.find('.mbox-content')[0];
    const containerWidth = container ? container.clientWidth || $(window).width() : $(window).width();
    const containerHeight = container ? container.clientHeight || $(window).height() : $(window).height();
    const naturalWidth = parseFloat($image.attr('mbox-w')) || $image[0].naturalWidth || $image[0].width || 1;
    const naturalHeight = parseFloat($image.attr('mbox-h')) || $image[0].naturalHeight || $image[0].height || 1;
    const normalizedRotation = ((rotation % 360) + 360) % 360;
    const isQuarterTurn = normalizedRotation === 90 || normalizedRotation === 270;
    const fitMode = $resolvedLightbox.hasClass('mbox-zoomfit') && $image.closest('.mbox-slide').hasClass('is-current');

    if (fitMode) {
      $image.attr('mbox-deg', normalizedRotation);
      $image.css({
        transform: `rotate(${normalizedRotation}deg)`,
        width: '100%',
        height: '100%',
        maxWidth: 'none',
        maxHeight: 'none',
      });
      return;
    }

    const scale = isQuarterTurn
      ? Math.min(containerWidth / naturalHeight, containerHeight / naturalWidth)
      : Math.min(containerWidth / naturalWidth, containerHeight / naturalHeight);
    const fittedWidth = Math.max(1, Math.round(naturalWidth * scale));
    const fittedHeight = Math.max(1, Math.round(naturalHeight * scale));

    $image.attr('mbox-deg', normalizedRotation);
    $image.css({
      transform: `rotate(${normalizedRotation}deg)`,
      width: `${fittedWidth}px`,
      height: `${fittedHeight}px`,
      maxWidth: 'none',
      maxHeight: 'none',
    });
  }

  function animateDirectionalNavigation($lightbox, state, targetIndex, direction, $targetEl, resolvedSettings) {
    const $stage = $lightbox.find('.mbox-stage');
    const currentIndex = state.currentIndex;
    const $currentSlide = $stage.find(`.mbox-slide[data-mbox-index="${currentIndex}"]`).first();
    const $targetSlide = $stage.find(`.mbox-slide[data-mbox-index="${targetIndex}"]`).first();
    const $farSlide = $stage.find(`.mbox-slide[data-mbox-index="${direction > 0 ? currentIndex - 1 : currentIndex + 1}"]`).first();
    const width = getStageWidth($lightbox);
    const exitOffset = direction > 0 ? -width : width;
    const farOffset = direction > 0 ? -(width * 1.08) : (width * 1.08);
    let finalized = false;

    if (!$targetSlide.length) {
      state.currentIndex = targetIndex;
      updateLightboxContent($targetEl, targetIndex, state.groupInstances.length, resolvedSettings, 0);
      return;
    }

    state.isTransitioning = true;
    state.swipe = null;
    state.gesture = null;
    resetZoomState(state, true);
    updateGestureClasses($lightbox, state);
    $stage.removeClass('is-dragging');

    setSlidePose($currentSlide, exitOffset, Math.max(0.84, getSideScale($lightbox) - 0.02), 1, 1, width);
    setSlidePose($targetSlide, 0, 1, 1, 5, width);
    if ($farSlide.length) {
      setSlidePose($farSlide, farOffset, getSideScale($lightbox), 1, 0, width);
    }

    const finalize = () => {
      if (finalized) {
        return;
      }
      finalized = true;

      state.currentIndex = targetIndex;
      state.isTransitioning = false;
      $lightbox.data('currentEl', $targetEl);

      renderStageWindow($lightbox, state);
      updateLightboxMeta($lightbox, $targetEl, targetIndex, state.groupInstances.length, resolvedSettings);
      primeOuterNeighborImages(state.groupInstances, targetIndex, resolvedSettings, state);
      updateNavButtons(targetIndex, state.groupInstances.length);

      if (direction === 1 && resolvedSettings.onNext) {
        resolvedSettings.onNext($targetEl);
      }

      if (direction === -1 && resolvedSettings.onPrev) {
        resolvedSettings.onPrev($targetEl);
      }
    };

    $targetSlide.one('transitionend', function (event) {
      if (event.target !== $targetSlide[0]) {
        return;
      }
      finalize();
    });
    setTimeout(finalize, (resolvedSettings.transitionDuration || defaults.transitionDuration) + 120);
  }

  function updateLightboxContent($el, currentIndex, totalCount, settings) {
    const $lightbox = $('.mbox-lightbox');
    if (!$lightbox.length) {
      return;
    }

    const state = $lightbox.data('mboxState') || {};
    state.currentIndex = currentIndex;
    state.settings = settings || state.settings || $.extend({}, defaults);
    state.isTransitioning = false;
    state.swipe = null;
    state.gesture = null;
    $lightbox.data('currentEl', $el);

    resetZoomState(state, true);
    renderStageWindow($lightbox, state);
    updateLightboxMeta($lightbox, $el, currentIndex, totalCount, state.settings);
    primeOuterNeighborImages(state.groupInstances || [], currentIndex, state.settings, state);
    updateNavButtons(currentIndex, totalCount);
  }

  function updateLightboxMeta($lightbox, $el, currentIndex, totalCount, settings) {
    const title = settings.showTitle === false ? '' : ($el.find(settings.getTitle).first().html() || '');
    const hasCustomInfoSelector = settings.getInfo !== defaults.getInfo;
    const infoEnabled = settings.showInfo !== false || hasCustomInfoSelector;
    const info = infoEnabled ? ($el.find(settings.getInfo).first().html() || '') : '';
    const titleText = stripHtml(title);
    const infoText = stripHtml(info);

    $lightbox.find('.mbox-count').text(`${currentIndex + 1}/${totalCount}`);
    $lightbox.find('.mbox-title').html(title);
    $lightbox.find('.mbox-info').html(info);
    $lightbox.find('.mbox-title').toggle(Boolean(titleText.length));
    $lightbox.find('.mbox-info-ctr').toggle(Boolean(infoText.length));
  }

  function createImageSlide($el, settings, options) {
    const previewSrc = getPreviewSrc($el, settings);
    const fullSrc = getFullSrc($el, settings) || previewSrc;
    const isCurrent = options && options.isCurrent === true;
    const hasDistinctPreview = Boolean(previewSrc) && previewSrc !== fullSrc;
    const $slide = $('<div class="mbox-slide"></div>');
    const $media = $('<div class="mbox-slide-media"></div>');
    const $img = $('<img class="mbox-main-img" alt="" />');
    const $loader = $('<div class="mbox-loading"></div>');

    $slide.attr('data-mbox-index', options && typeof options.index === 'number' ? options.index : '');
    $slide.toggleClass('has-preview', Boolean(previewSrc));
    $slide.toggleClass('is-current', isCurrent);
    $slide.toggleClass('is-preview-active', hasDistinctPreview);
    $slide.data('mboxFullSrc', fullSrc);

    if (previewSrc || fullSrc) {
      $img.attr('src', previewSrc || fullSrc);
    }

    $media.append($img, $loader);
    $slide.append($media);
    hydrateImageSlide($slide, fullSrc, {
      state: options ? options.state : null,
      showLoader: isCurrent || !previewSrc,
    });

    return $slide;
  }

  function hydrateImageSlide($slide, src, options) {
    if (!src) {
      $slide.removeClass('is-preview-active');
      $slide.find('.mbox-loading').remove();
      return;
    }

    $slide.data('mboxSrc', src);
    const state = options && options.state ? options.state : getLightboxState();
    const record = ensurePreloadRecord(state, src);
    const $loader = $slide.find('.mbox-loading');

    if (!options || options.showLoader !== true) {
      $loader.addClass('is-hidden');
    }

    if (!record) {
      $slide.removeClass('is-preview-active');
      $loader.remove();
      return;
    }

    if (record.status === 'loaded') {
      applyLoadedImageToSlide($slide, record);
      return;
    }

    if (record.status === 'error') {
      $loader.remove();
      return;
    }

    record.callbacks.push((resolvedRecord) => {
      if (!$slide.closest('body').length || $slide.data('mboxSrc') !== src) {
        return;
      }
      if (resolvedRecord.status === 'loaded') {
        applyLoadedImageToSlide($slide, resolvedRecord);
      } else {
        $slide.find('.mbox-loading').remove();
      }
    });
  }

  function getPreviewSrc($el, settings) {
    const $pic = $el.find(settings.getPic).first();
    return $pic.find('img:first').attr('src') || $pic.attr('src') || $pic.attr('href') || '';
  }

  function getFullSrc($el, settings) {
    const $pic = $el.find(settings.getPic).first();
    return $pic.attr('href') || $pic.attr('src') || $pic.find('img:first').attr('src') || '';
  }

  function ensurePreloadRecord(state, src) {
    if (!state || !src) {
      return null;
    }

    const cache = state.preloadCache || (state.preloadCache = {});
    if (cache[src]) {
      return cache[src];
    }

    const record = {
      src,
      status: 'loading',
      width: 0,
      height: 0,
      callbacks: [],
      image: new Image(),
    };

    record.image.onload = function () {
      record.status = 'loaded';
      record.width = this.naturalWidth;
      record.height = this.naturalHeight;
      const callbacks = record.callbacks.slice();
      record.callbacks = [];
      callbacks.forEach((callback) => callback(record));
    };

    record.image.onerror = function () {
      record.status = 'error';
      const callbacks = record.callbacks.slice();
      record.callbacks = [];
      callbacks.forEach((callback) => callback(record));
    };

    record.image.src = src;
    cache[src] = record;
    return record;
  }

  function applyLoadedImageToSlide($slide, record) {
    const $img = $slide.find('.mbox-main-img');
    const rotation = parseInt($img.attr('mbox-deg'), 10) || 0;

    $img.attr({
      src: record.src,
      'mbox-h': record.height,
      'mbox-w': record.width,
      'mbox-deg': rotation,
    });
    applyImageRotation($img, rotation);
    $slide.removeClass('is-preview-active');
    $slide.find('.mbox-loading').remove();
    $slide.addClass('is-full-ready');
  }

  function primeOuterNeighborImages(groupInstances, currentIndex, settings, state) {
    if (!groupInstances.length || !state) {
      return;
    }

    [currentIndex - 2, currentIndex - 1, currentIndex, currentIndex + 1, currentIndex + 2].forEach((index) => {
      if (index < 0 || index >= groupInstances.length) {
        return;
      }
      const src = getFullSrc(groupInstances[index], settings);
      ensurePreloadRecord(state, src);
    });
  }

  function updateNavButtons(currentIndex, totalCount) {
    $('.mbox-prev').toggle(currentIndex > 0);
    $('.mbox-next').toggle(currentIndex < totalCount - 1);
  }

  function getLightboxState() {
    const $lightbox = $('.mbox-lightbox');
    if (!$lightbox.length) {
      return null;
    }

    return $lightbox.data('mboxState') || null;
  }

  function stripHtml(markup) {
    return $.trim($('<div>').html(markup || '').text());
  }
})(jQuery);
