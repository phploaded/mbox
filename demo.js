function openTab(event, tabId) {
  // Hide all tab content
  const tabPanes = document.querySelectorAll('.tab-pane');
  tabPanes.forEach((pane) => pane.classList.remove('active'));

  // Remove active class from all buttons
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach((btn) => btn.classList.remove('active'));

  // Show the selected tab content and highlight the button
  document.getElementById(tabId).classList.add('active');
  event.currentTarget.classList.add('active');
}


$(document).ready(function () {

// syntax highliter
hljs.highlightAll();

$('#example-1 .demo-pic').mBox();

$('#example-2 .demo-pic').mBox({
	fullScreen: false,
	getTitle:'.demo-title',
	getInfo:'.demo-description',
	slideTime: 7000
});

// for tabs
$(document).on("click", ".tab-btn", function () {
const $ctr = $(this).closest('.tab-container');
$ctr.find(".tab-btn, .tab-pane").removeClass("active");
$(this).addClass("active");
const tabId = $(this).attr('data-target');
$ctr.find(`[data-id="${tabId}"]`).addClass("active");
});

});

