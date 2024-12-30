/* v1.2 by phploaded */
(function ($) {
  const defaults = {
    getTitle: '.title',
    showTitle: true,
    getInfo: '.info',
    showInfo: false,
    getPic: 'a:first',
    fullScreen: true,
    slideTime: 5000, // no of seconds for slides to play
    onOpen: null,
    onClose: null,
    onNext: null,
    onPrev: null,
  };

  let mboxCounter = 0;
  const instances = [];

  $.fn.mBox = function (options) {
    const settings = $.extend({}, defaults, options);

    this.each(function () {
      const $el = $(this);

      // Assign mbox-id
      if (!$el.attr('mbox-id')) {
        let id;
        do {
          id = mboxCounter++;
        } while ($(`[mbox-id="${id}"]`).length > 0);
        $el.attr('mbox-id', id);
      }

      // Assign mbox-type
      if (!$el.attr('mbox-type')) {
        $el.attr('mbox-type', 'image');
      }

      // Assign mbox-full
      if (!$el.attr('mbox-full')) {
        $el.attr('mbox-full', 'true');
      }

      // Assign mbox-group
      if (!$el.attr('mbox-group')) {
        $el.attr('mbox-group', 'ungrouped');
      }

      $el.on('click', function (e) {
        e.preventDefault();
        openLightbox($el, settings);
      });

      instances.push($el);
    });

    return this;
  };

  function openLightbox($el, settings) {
    const $ctr = $('<div class="mbox-ctr"></div>');
    const $bg = $('<div class="mbox-bg"></div>');
    const $lightbox = $('<div class="mbox-lightbox"></div>').data('currentEl', $el);
    const $content = $('<div class="mbox-content"></div>');
    const $controls = $('<div class="mbox-controls"></div>');

    const group = $el.attr('mbox-group');
    const groupInstances = instances.filter((i) => i.attr('mbox-group') === group);
    const currentIndex = groupInstances.findIndex((i) => i.is($el));
    const totalCount = groupInstances.length;

    // Add header
    const $header = $(
      `<div class="mbox-header">
        <div class="mbox-count">${currentIndex + 1}/${totalCount}</div>
        <ul class="mbox-actions">
          <li class="mbox-play"></li><li class="mbox-rotate"></li><li class="mbox-screenfit"></li><li class="mbox-fullscreen"></li><li class="mbox-close"></li>
        </ul>
      </div>`
    );

    // Add footer
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

    // Add prev/next buttons
    const $prevButton = $('<div class="mbox-prev"></div>').toggle(currentIndex > 0);
    const $nextButton = $('<div class="mbox-next"></div>').toggle(currentIndex < totalCount - 1);

    // Assemble lightbox
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

    // Load initial content
    updateLightboxContent($el, currentIndex, totalCount, settings);

    // Add event listeners
    $ctr.on('click', '.mbox-close', () => closeLightbox($ctr, settings));
    $prevButton.on('click', () => navigateLightbox(-1, currentIndex, groupInstances, settings));
    $nextButton.on('click', () => navigateLightbox(1, currentIndex, groupInstances, settings));
    $('.mbox-screenfit').on('click', () => mBox_fitscreen());
    $('.mbox-rotate').on('click', () => mBox_rotate(settings.slideTime));
    $('.mbox-fullscreen').on('click', () => mBox_fullScreen());
    $('.mbox-play').on('click', () => mBox_slideShow());
    $('.mbox-descr').on('mouseenter', () => $('.mbox-info').slideDown('fast'));
    $('.mbox-descr').on('mouseleave', () => $('.mbox-info').slideUp('fast'));

    // Add keyboard navigation
    $(document).on('keydown', (e) => handleKeyboardNavigation(e, $ctr));

    // Trigger open callback
    if (settings.onOpen) settings.onOpen($el, $lightbox);
  }

  function handleKeyboardNavigation(e, $ctr) {
    if (!$ctr.length) return; // Ensure lightbox exists

    const key = e.key.toLowerCase();

    switch (key) {
      case 'arrowright':
        $('.mbox-next:visible').trigger('click');
        break;
      case 'arrowleft':
        $('.mbox-prev:visible').trigger('click');
        break;
      case ' ':
        $('.mbox-play').trigger('click');
        break;
      case 'escape':
        $('.mbox-close').trigger('click');
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
    $ctr.remove();
    $('.mbox-main-body').removeClass('mbox-blur');
    $(document).off('keydown', handleKeyboardNavigation); // Remove keyboard listener
    if (settings.onClose) settings.onClose();
  }
  
function mBox_fitscreen(){
if(!$('body').hasClass('mbox-zoomfit')){
$('body').addClass('mbox-zoomfit');
} else {
$('body').removeClass('mbox-zoomfit');
}
}

let slideshowTimeout = null;
let progressTimeout = null;

function mBox_slideShow() {
  const $playButton = $('.mbox-play');
  const $progressOut = $('.mbox-progress-out');
  const $progressBar = $('.mbox-progress');
  const settings = $.extend({}, defaults);

  if ($playButton.hasClass('mbox-pause')) {
    // Stop the slideshow
    $playButton.removeClass('mbox-pause');
    $progressOut.hide(); // Hide progress bar
    $progressBar.css('width', '0%'); // Reset progress bar
    clearTimeout(slideshowTimeout);
    clearTimeout(progressTimeout);
    slideshowTimeout = null;
    progressTimeout = null;
  } else {
    // Start the slideshow
    $playButton.addClass('mbox-pause');
    $progressOut.show(); // Show progress bar

    const slideTime = settings.slideTime || 5000; // Slide time in milliseconds
    let elapsed = 0;

    function updateProgress() {
      elapsed += 1000; // Increment elapsed time by 1 second
      const progress = (elapsed / slideTime) * 100; // Calculate progress percentage
      $progressBar.css('width', `${progress}%`);

      if (elapsed < slideTime && $playButton.hasClass('mbox-pause')) {
        progressTimeout = setTimeout(updateProgress, 1000); // Continue progress bar
      }
    }

    function simulateNextClick() {
      const $nextButton = $('.mbox-next:visible'); // Check if "Next" button is visible
      const isPreloading = $('.mbox-preload-next').length > 0; // Check if preloading is in progress

      if ($playButton.hasClass('mbox-pause') && !isPreloading) {
        if ($nextButton.length > 0) {
          elapsed = 0; // Reset elapsed time for the next slide
          $nextButton.trigger('click'); // Simulate click on "Next" button
          updateProgress(); // Restart progress bar
          slideshowTimeout = setTimeout(simulateNextClick, slideTime); // Schedule next click
        } else {
          // Stop the slideshow if "Next" button is unavailable
          mBox_slideShow(); // Toggle slideshow off
        }
      } else if (isPreloading) {
        // Wait and retry if preloading is in progress
        slideshowTimeout = setTimeout(simulateNextClick, 500); // Retry after 500ms
      }
    }

    // Start the progress bar and slideshow
    updateProgress();
    slideshowTimeout = setTimeout(simulateNextClick, slideTime);
  }
}







function mBox_fullScreen() {
  const $ctr = $('.mbox-ctr'); // The lightbox container element
  
  if (!$ctr.length) return; // Ensure the container exists
  
  if (document.fullscreenElement) {
    // If fullscreen is active, exit fullscreen
    document.exitFullscreen().then(() => {
      $('.mbox-fullscreen').removeClass('mbox-restore');
    }).catch(err => {
      console.error("Error exiting fullscreen:", err);
    });
  } else {
    // Enter fullscreen mode
    $ctr[0].requestFullscreen().then(() => {
      $('.mbox-fullscreen').addClass('mbox-restore');
    }).catch(err => {
      console.error("Error entering fullscreen:", err);
    });
  }
}


function mBox_rotate(xtime){
const $e = $('.mbox-main-img');
let rotation = parseInt($e.attr('mbox-deg'));

if(isNaN(rotation)){
rotation = 0;
}

rotation = rotation + 90;
if(rotation==360){rotation=0;}


if(rotation==90 || rotation==270){
const h = $(window).height();
const w = $(window).width();
$e.css({'transform':'rotate('+rotation+'deg)', 'width':h+'px', 'height':w+'px'});
} else {
$e.css({'transform':'rotate('+rotation+'deg)', 'width':'', 'height':''});
}

$e.attr('mbox-deg', rotation);

}
  
function navigateLightbox(direction, _, groupInstances, settings) {
  // Find the current element and index dynamically
  const $currentEl = $('.mbox-lightbox').data('currentEl');
  const currentIndex = groupInstances.findIndex(i => i.is($currentEl));
  
  const newIndex = currentIndex + direction;
  if (newIndex < 0 || newIndex >= groupInstances.length) return;

  const $newEl = groupInstances[newIndex];

  // Update content
  updateLightboxContent($newEl, newIndex, groupInstances.length, settings);

  // Store the new current element in the lightbox
  $('.mbox-lightbox').data('currentEl', $newEl);

  if (direction === 1 && settings.onNext) settings.onNext($newEl);
  if (direction === -1 && settings.onPrev) settings.onPrev($newEl);
}


function updateLightboxContent($el, currentIndex, totalCount, settings) {
  const $lightbox = $('.mbox-lightbox');
  const $content = $lightbox.find('.mbox-content');
  const $header = $lightbox.find('.mbox-header');

  // Update title and info
  const title = $el.find(settings.getTitle).text() || '';
  const info = $el.find(settings.getInfo).html() || '';
  $header.find('.mbox-count').text(`${currentIndex + 1}/${totalCount}`);
  $('.mbox-title').html(`${title}`);
  $('.mbox-info').html(`${info}`);

  // Update content for the current image
  const xsrc = $el.find(settings.getPic + ' img:first').attr('src');
  const s = settings.slideTime/1000;
  $content.html(`
    <img src="${xsrc}" style="animation-duration:${s}s" class="mbox-main-img" />
    <div class="mbox-loading"></div>
  `);

  // Preload the current image to ensure it is displayed as soon as it's available
  const xhref = $el.find(settings.getPic).attr('href');
  $('.mbox-preload').append(`<img src="${xhref}" alt="preloading current" class="mbox-preload-current" />`);

  // Preload the next and previous images
  const groupInstances = instances.filter(i => i.attr('mbox-group') === $el.attr('mbox-group'));
  const preloadImages = [];

  if (currentIndex + 1 < totalCount) {
    const $nextEl = groupInstances[currentIndex + 1];
    const nextHref = $nextEl.find(settings.getPic).attr('href');
    preloadImages.push(`<img src="${nextHref}" alt="preloading next" class="mbox-preload-next" />`);
  }

  if (currentIndex - 1 >= 0) {
    const $prevEl = groupInstances[currentIndex - 1];
    const prevHref = $prevEl.find(settings.getPic).attr('href');
    preloadImages.push(`<img src="${prevHref}" alt="preloading previous" class="mbox-preload-prev" />`);
  }

  // Add preloading images
  $('.mbox-preload').append(preloadImages.join(''));

  // Handle next, prev preloaded images
  $('.mbox-preload-prev, .mbox-preload-next').on('load', function () {
   $(this).remove(); // Remove the preloaded image from DOM after it's loaded
  });
  
    // Handle current preloaded image
  $('.mbox-preload-current').on('load', function () {
    const xsrc = $(this).attr('src');
    const actualWidth = $(this)[0].naturalWidth;
    const actualHeight = $(this)[0].naturalHeight;
	$('.mbox-main-img').attr('mbox-h', actualHeight);
	$('.mbox-main-img').attr('mbox-w', actualWidth);
    $('.mbox-main-img').attr('src', xsrc);
    $('.mbox-loading').remove();
	$(this).remove();
  });

  // Update prev/next button visibility
  const $prevButton = $('.mbox-prev');
  const $nextButton = $('.mbox-next');
  $prevButton.toggle(currentIndex > 0);
  $nextButton.toggle(currentIndex < totalCount - 1);
}



})(jQuery);
