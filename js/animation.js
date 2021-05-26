$(function () {
    resizeIconWrapper();

    $(window).on('resize', function () {
        resizeIconWrapper();    
    });

    var icons = $("#skill .skill-icon")
});

function resizeIconWrapper() {
    var $icon_wrapper = $('#skill .icon-wrapper');
    var width = $icon_wrapper.width();
    $icon_wrapper.height(width);
}