/* v1.3 by phploaded */
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
    onOpen: null,
    onClose: null,
    onNext: null,
    onPrev: null,
  };

  let mboxCounter = 0;
  const instances = [];
  let slideshowTimeout = null;
  let progressTimeout = null;

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
    const $content = $('<div class="mbox-content"><div class="mbox-stage"></div></div>');
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
      swipe: null,
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

    updateLightboxContent($el, currentIndex, totalCount, settings, 0);

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

    $playButton.removeClass('mbox-pause');
    $progressOut.hide();
    $progressBar.css('width', '0%');
    clearTimeout(slideshowTimeout);
    clearTimeout(progressTimeout);
    slideshowTimeout = null;
    progressTimeout = null;
  }

  function mBox_fitscreen() {
    $('body').toggleClass('mbox-zoomfit');
  }

  function mBox_slideShow() {
    const $playButton = $('.mbox-play');
    const $progressOut = $('.mbox-progress-out');
    const $progressBar = $('.mbox-progress');
    const state = getLightboxState();
    const settings = state ? state.settings : $.extend({}, defaults);

    if ($playButton.hasClass('mbox-pause')) {
      clearSlideShow();
      return;
    }

    $playButton.addClass('mbox-pause');
    $progressOut.show();

    const slideTime = settings.slideTime || defaults.slideTime;
    let elapsed = 0;

    function updateProgress() {
      elapsed += 1000;
      const progress = Math.min((elapsed / slideTime) * 100, 100);
      $progressBar.css('width', `${progress}%`);

      if (elapsed < slideTime && $playButton.hasClass('mbox-pause')) {
        progressTimeout = setTimeout(updateProgress, 1000);
      }
    }

    function simulateNextClick() {
      const $nextButton = $('.mbox-next:visible');
      const currentState = getLightboxState();

      if ($playButton.hasClass('mbox-pause') && currentState && !currentState.isTransitioning) {
        if ($nextButton.length > 0) {
          elapsed = 0;
          $nextButton.trigger('click');
          updateProgress();
          slideshowTimeout = setTimeout(simulateNextClick, slideTime);
        } else {
          clearSlideShow();
        }
      } else if ($playButton.hasClass('mbox-pause')) {
        slideshowTimeout = setTimeout(simulateNextClick, 300);
      }
    }

    updateProgress();
    slideshowTimeout = setTimeout(simulateNextClick, slideTime);
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
    const $image = $('.mbox-slide.is-current .mbox-main-img');
    let rotation = parseInt($image.attr('mbox-deg'), 10);

    if (isNaN(rotation)) {
      rotation = 0;
    }

    rotation += 90;
    if (rotation === 360) {
      rotation = 0;
    }

    if (rotation === 90 || rotation === 270) {
      const height = $(window).height();
      const width = $(window).width();
      $image.css({ transform: `rotate(${rotation}deg)`, width: `${height}px`, height: `${width}px` });
    } else {
      $image.css({ transform: `rotate(${rotation}deg)`, width: '', height: '' });
    }

    $image.attr('mbox-deg', rotation);
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

    resetSwipeStage($lightbox, state);

    const $currentEl = $lightbox.data('currentEl');
    const currentIndex = items.findIndex((item) => item.is($currentEl));
    const newIndex = currentIndex + direction;

    if (newIndex < 0 || newIndex >= items.length) {
      return;
    }

    const $newEl = items[newIndex];
    updateLightboxContent($newEl, newIndex, items.length, resolvedSettings, direction);
    $lightbox.data('currentEl', $newEl);
    state.currentIndex = newIndex;

    if (direction === 1 && resolvedSettings.onNext) {
      resolvedSettings.onNext($newEl);
    }

    if (direction === -1 && resolvedSettings.onPrev) {
      resolvedSettings.onPrev($newEl);
    }
  }

  function bindSwipeNavigation($lightbox) {
    const $content = $lightbox.find('.mbox-content');
    const contentEl = $content[0];
    let pointerId = null;

    $content.off('.mboxSwipe');

    $content.on('pointerdown.mboxSwipe', function (e) {
      const state = $lightbox.data('mboxState');

      if (!state || state.groupInstances.length < 2 || state.isTransitioning) {
        return;
      }

      if (e.isPrimary === false) {
        return;
      }

      if (e.pointerType === 'mouse' && e.button !== 0) {
        return;
      }

      pointerId = e.pointerId;
      beginSwipeSession($lightbox, e.clientX, e.clientY);

      if (contentEl && contentEl.setPointerCapture) {
        try {
          contentEl.setPointerCapture(pointerId);
        } catch (err) {}
      }
    });

    $content.on('pointermove.mboxSwipe', function (e) {
      if (pointerId === null || e.pointerId !== pointerId) {
        return;
      }

      if (trackSwipeSession($lightbox, e.clientX, e.clientY)) {
        e.preventDefault();
      }
    });

    $content.on('pointerup.mboxSwipe', function (e) {
      if (pointerId === null || e.pointerId !== pointerId) {
        return;
      }

      releaseSwipeCapture(contentEl, pointerId);
      pointerId = null;
      endSwipeSession($lightbox, e.clientX, e.clientY);
    });

    $content.on('pointercancel.mboxSwipe', function (e) {
      if (pointerId !== null && e.pointerId === pointerId) {
        releaseSwipeCapture(contentEl, pointerId);
        pointerId = null;
        cancelSwipeSession($lightbox);
      }
    });

    if (!window.PointerEvent) {
      $content.on('touchstart.mboxSwipe', function (e) {
        const state = $lightbox.data('mboxState');

        if (!state || state.groupInstances.length < 2 || state.isTransitioning || !e.originalEvent.touches.length) {
          return;
        }

        beginSwipeSession($lightbox, e.originalEvent.touches[0].clientX, e.originalEvent.touches[0].clientY);
      });

      $content.on('touchmove.mboxSwipe', function (e) {
        if (!e.originalEvent.touches.length) {
          return;
        }

        if (trackSwipeSession($lightbox, e.originalEvent.touches[0].clientX, e.originalEvent.touches[0].clientY)) {
          e.preventDefault();
        }
      });

      $content.on('touchend.mboxSwipe', function (e) {
        if (!e.originalEvent.changedTouches.length) {
          return;
        }

        endSwipeSession($lightbox, e.originalEvent.changedTouches[0].clientX, e.originalEvent.changedTouches[0].clientY);
      });

      $content.on('touchcancel.mboxSwipe', function () {
        cancelSwipeSession($lightbox);
      });
    }
  }

  function releaseSwipeCapture(contentEl, pointerId) {
    if (contentEl && contentEl.releasePointerCapture) {
      try {
        contentEl.releasePointerCapture(pointerId);
      } catch (err) {}
    }
  }

  function beginSwipeSession($lightbox, clientX, clientY) {
    const state = $lightbox.data('mboxState');

    if (!state || state.isTransitioning) {
      return;
    }

    state.swipe = {
      startX: clientX,
      startY: clientY,
      deltaX: 0,
      deltaY: 0,
      dragging: false,
      axisLocked: null,
      stageWidth: getStageWidth($lightbox),
    };
  }

  function trackSwipeSession($lightbox, clientX, clientY) {
    const state = $lightbox.data('mboxState');
    const swipe = state && state.swipe;

    if (!state || !swipe || state.isTransitioning) {
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

    ensureSwipePreview($lightbox, state);
    swipe.dragging = true;
    applySwipeTransforms($lightbox, state, getConstrainedDeltaX(state, swipe.deltaX));
    return true;
  }

  function endSwipeSession($lightbox, clientX, clientY) {
    const state = $lightbox.data('mboxState');
    const swipe = state && state.swipe;

    if (!state || !swipe || state.isTransitioning) {
      return;
    }

    swipe.deltaX = clientX - swipe.startX;
    swipe.deltaY = clientY - swipe.startY;

    if (!swipe.dragging) {
      state.swipe = null;
      return;
    }

    const constrainedDeltaX = getConstrainedDeltaX(state, swipe.deltaX);
    const direction = resolveSwipeDirection(state, constrainedDeltaX, swipe.deltaY);

    if (!direction) {
      animateSwipeReset($lightbox, state);
      return;
    }

    animateSwipeCommit($lightbox, state, direction);
  }

  function cancelSwipeSession($lightbox) {
    const state = $lightbox.data('mboxState');

    if (!state || !state.swipe) {
      return;
    }

    resetSwipeStage($lightbox, state);
  }

  function ensureSwipePreview($lightbox, state) {
    const $stage = $lightbox.find('.mbox-stage');
    const swipe = state.swipe;

    if (!swipe || swipe.previewReady) {
      return;
    }

    resetSwipeStage($lightbox, state, true);

    const $currentSlide = $stage.find('.mbox-slide.is-current').last();
    const prevIndex = state.currentIndex - 1;
    const nextIndex = state.currentIndex + 1;
    const $prevSlide = prevIndex >= 0 ? createImageSlide(state.groupInstances[prevIndex], state.settings) : $();
    const $nextSlide = nextIndex < state.groupInstances.length ? createImageSlide(state.groupInstances[nextIndex], state.settings) : $();

    if ($prevSlide.length) {
      $prevSlide.attr('data-mbox-index', prevIndex).addClass('is-swipe-prev');
      $stage.append($prevSlide);
    }

    if ($nextSlide.length) {
      $nextSlide.attr('data-mbox-index', nextIndex).addClass('is-swipe-next');
      $stage.append($nextSlide);
    }

    $stage.addClass('is-dragging');

    swipe.$currentSlide = $currentSlide;
    swipe.$prevSlide = $prevSlide;
    swipe.$nextSlide = $nextSlide;
    swipe.previewReady = true;

    applySwipeTransforms($lightbox, state, 0);
  }

  function applySwipeTransforms($lightbox, state, deltaX) {
    const swipe = state.swipe;

    if (!swipe || !swipe.previewReady) {
      return;
    }

    const width = swipe.stageWidth || getStageWidth($lightbox);

    if (swipe.$prevSlide && swipe.$prevSlide.length) {
      setSlideTranslate(swipe.$prevSlide, deltaX - width);
    }

    if (swipe.$currentSlide && swipe.$currentSlide.length) {
      setSlideTranslate(swipe.$currentSlide, deltaX);
    }

    if (swipe.$nextSlide && swipe.$nextSlide.length) {
      setSlideTranslate(swipe.$nextSlide, deltaX + width);
    }
  }

  function animateSwipeReset($lightbox, state) {
    const swipe = state.swipe;
    if (!swipe || !swipe.previewReady) {
      state.swipe = null;
      return;
    }

    const $stage = $lightbox.find('.mbox-stage');
    const width = swipe.stageWidth || getStageWidth($lightbox);
    let finalized = false;

    $stage.removeClass('is-dragging');

    const finalize = () => {
      if (finalized) {
        return;
      }
      finalized = true;
      resetSwipeStage($lightbox, state);
    };

    if (swipe.$prevSlide && swipe.$prevSlide.length) {
      setSlideTranslate(swipe.$prevSlide, -width);
    }

    if (swipe.$currentSlide && swipe.$currentSlide.length) {
      setSlideTranslate(swipe.$currentSlide, 0);
    }

    if (swipe.$nextSlide && swipe.$nextSlide.length) {
      setSlideTranslate(swipe.$nextSlide, width);
    }

    const $transitionTarget = swipe.$currentSlide && swipe.$currentSlide.length ? swipe.$currentSlide : $stage.find('.mbox-slide').first();
    $transitionTarget.one('transitionend', finalize);
    setTimeout(finalize, (state.settings.transitionDuration || defaults.transitionDuration) + 80);
  }

  function animateSwipeCommit($lightbox, state, direction) {
    const swipe = state.swipe;
    const $stage = $lightbox.find('.mbox-stage');

    if (!swipe || !swipe.previewReady) {
      navigateLightbox(direction, null, state.groupInstances, state.settings);
      return;
    }

    const width = swipe.stageWidth || getStageWidth($lightbox);
    const targetIndex = state.currentIndex + direction;
    const $targetSlide = direction > 0 ? swipe.$nextSlide : swipe.$prevSlide;
    const $offscreenSlide = direction > 0 ? swipe.$prevSlide : swipe.$nextSlide;
    let finalized = false;

    if (!$targetSlide || !$targetSlide.length) {
      animateSwipeReset($lightbox, state);
      return;
    }

    state.isTransitioning = true;
    $stage.removeClass('is-dragging');

    if ($offscreenSlide && $offscreenSlide.length) {
      setSlideTranslate($offscreenSlide, direction > 0 ? -2 * width : 2 * width);
    }

    if (swipe.$currentSlide && swipe.$currentSlide.length) {
      setSlideTranslate(swipe.$currentSlide, direction > 0 ? -width : width);
    }

    setSlideTranslate($targetSlide, 0);

    const finalize = () => {
      if (finalized) {
        return;
      }

      finalized = true;

      if (swipe.$currentSlide && swipe.$currentSlide.length) {
        swipe.$currentSlide.remove();
      }

      if ($offscreenSlide && $offscreenSlide.length) {
        $offscreenSlide.remove();
      }

      $targetSlide.removeClass('is-swipe-prev is-swipe-next').addClass('is-current');
      clearSlideInlineTransform($targetSlide);
      $stage.empty().append($targetSlide);

      const $newEl = state.groupInstances[targetIndex];
      $lightbox.data('currentEl', $newEl);
      state.currentIndex = targetIndex;
      state.isTransitioning = false;
      state.swipe = null;

      updateLightboxMeta($lightbox, $newEl, targetIndex, state.groupInstances.length, state.settings);
      primeAdjacentImages(state.groupInstances, targetIndex, state.settings, state);
      updateNavButtons(targetIndex, state.groupInstances.length);

      if (direction === 1 && state.settings.onNext) {
        state.settings.onNext($newEl);
      }

      if (direction === -1 && state.settings.onPrev) {
        state.settings.onPrev($newEl);
      }
    };

    $targetSlide.one('transitionend', finalize);
    setTimeout(finalize, (state.settings.transitionDuration || defaults.transitionDuration) + 80);
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

  function resetSwipeStage($lightbox, state, preserveSwipe) {
    const resolvedState = state || $lightbox.data('mboxState');

    if (!resolvedState) {
      return;
    }

    const $stage = $lightbox.find('.mbox-stage');
    const swipe = resolvedState.swipe;
    const $currentSlide = $stage.find('.mbox-slide.is-current').last();

    $stage.removeClass('is-dragging');
    $stage.find('.mbox-slide.is-swipe-prev, .mbox-slide.is-swipe-next').remove();

    if ($currentSlide.length) {
      clearSlideInlineTransform($currentSlide);
    }

    if (swipe && swipe.$currentSlide && swipe.$currentSlide.length && !$currentSlide.length) {
      clearSlideInlineTransform(swipe.$currentSlide);
      swipe.$currentSlide.addClass('is-current');
    }

    if (!preserveSwipe) {
      resolvedState.swipe = null;
    }
  }

  function getConstrainedDeltaX(state, deltaX) {
    const hasPrev = state.currentIndex > 0;
    const hasNext = state.currentIndex < state.groupInstances.length - 1;

    if ((deltaX > 0 && !hasPrev) || (deltaX < 0 && !hasNext)) {
      return deltaX * 0.28;
    }

    return deltaX;
  }

  function setSlideTranslate($slide, deltaX) {
    $slide.css('transform', `translate3d(${deltaX}px, 0, 0)`);
  }

  function clearSlideInlineTransform($slide) {
    $slide.css('transform', '');
  }

  function getStageWidth($lightbox) {
    const width = $lightbox.find('.mbox-stage').outerWidth() || $lightbox.find('.mbox-content').outerWidth() || $(window).width();
    return Math.max(1, width);
  }

  function updateLightboxContent($el, currentIndex, totalCount, settings, direction) {
    const $lightbox = $('.mbox-lightbox');
    if (!$lightbox.length) {
      return;
    }

    const state = $lightbox.data('mboxState') || {};
    resetSwipeStage($lightbox, state);
    const $stage = $lightbox.find('.mbox-stage');
    const $currentSlide = $stage.find('.mbox-slide.is-current').last();
    const $incomingSlide = createImageSlide($el, settings).addClass('is-current');

    updateLightboxMeta($lightbox, $el, currentIndex, totalCount, settings);

    if (!$currentSlide.length || !direction) {
      state.isTransitioning = false;
      $stage.empty().append($incomingSlide.addClass('is-active'));
    } else {
      const enterClass = direction > 0 ? 'is-enter-next' : 'is-enter-prev';
      const exitClass = direction > 0 ? 'is-exit-next' : 'is-exit-prev';
      const transitionWindow = (settings.transitionDuration || defaults.transitionDuration) + 140;
      let finalized = false;

      state.isTransitioning = true;
      $currentSlide.removeClass('is-current').addClass('is-leaving');
      $incomingSlide.addClass(enterClass);
      $stage.append($incomingSlide);

      window.requestAnimationFrame(() => {
        $currentSlide.addClass(exitClass);
        $incomingSlide.addClass('is-active');
      });

      const finalize = () => {
        if (finalized) {
          return;
        }

        finalized = true;
        $currentSlide.remove();
        $incomingSlide.removeClass('is-enter-next is-enter-prev is-active');
        state.isTransitioning = false;
      };

      $incomingSlide.one('transitionend', (event) => {
        if (event.target !== $incomingSlide[0]) {
          return;
        }
        finalize();
      });

      setTimeout(finalize, transitionWindow);
    }

    $lightbox.data('currentEl', $el);
    state.currentIndex = currentIndex;
    primeAdjacentImages(state.groupInstances || [], currentIndex, settings, state);
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

  function createImageSlide($el, settings) {
    const previewSrc = getPreviewSrc($el, settings);
    const fullSrc = getFullSrc($el, settings) || previewSrc;
    const $slide = $('<div class="mbox-slide"></div>');
    const $img = $('<img class="mbox-main-img" alt="" />');
    const $loader = $('<div class="mbox-loading"></div>');

    if (previewSrc || fullSrc) {
      $img.attr('src', previewSrc || fullSrc);
    }

    $slide.append($img, $loader);
    hydrateImageSlide($slide, fullSrc);

    return $slide;
  }

  function hydrateImageSlide($slide, src) {
    if (!src) {
      $slide.find('.mbox-loading').remove();
      return;
    }

    const preloader = new Image();
    $slide.data('mboxSrc', src);

    preloader.onload = function () {
      if (!$slide.closest('body').length || $slide.data('mboxSrc') !== src) {
        return;
      }

      const $img = $slide.find('.mbox-main-img');
      $img.attr({
        src,
        'mbox-h': this.naturalHeight,
        'mbox-w': this.naturalWidth,
        'mbox-deg': 0,
      });
      $slide.find('.mbox-loading').remove();
    };

    preloader.onerror = function () {
      if (!$slide.closest('body').length) {
        return;
      }
      $slide.find('.mbox-loading').remove();
    };

    preloader.src = src;
  }

  function getPreviewSrc($el, settings) {
    const $pic = $el.find(settings.getPic).first();
    return $pic.find('img:first').attr('src') || $pic.attr('src') || $pic.attr('href') || '';
  }

  function getFullSrc($el, settings) {
    const $pic = $el.find(settings.getPic).first();
    return $pic.attr('href') || $pic.attr('src') || $pic.find('img:first').attr('src') || '';
  }

  function primeAdjacentImages(groupInstances, currentIndex, settings, state) {
    if (!groupInstances.length) {
      return;
    }

    const cache = state.preloadCache || {};
    [currentIndex - 1, currentIndex + 1].forEach((index) => {
      if (index < 0 || index >= groupInstances.length) {
        return;
      }

      const src = getFullSrc(groupInstances[index], settings);
      if (!src || cache[src]) {
        return;
      }

      const preloader = new Image();
      preloader.src = src;
      cache[src] = preloader;
    });

    state.preloadCache = cache;
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
