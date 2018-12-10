/* ================================================================
    UTILITY FUNCTIONS AND GLOBAL VARS
   ================================================================ */

   (function ($, talonUtil, undefined) {
    "use strict";

    // Fast for most debouncers, etc. but for transitions try and match typicall css transition length
    talonUtil.speeds = {
        fast: 200,
        transition: 300,
        long: 500
    };

    // Generate Random ID
    talonUtil.generateID = function () {
        var globalIdCounter = 0;
        return function (baseStr) {
            baseStr = baseStr ? baseStr : "generatedID-";
            return baseStr + globalIdCounter++;
        };
    }();

    /**
     * Setup expanding functionality for [data-expander] elements (e.g. accordions,
     * tabs, expanders, menus, etc.)
     */
    talonUtil.setupToggles = () => {
        $("[data-expander]").each(function (key) {
            var $this = $(this),
                relatedData, // ID of target
                $toggle, // Toggle element
                $target, // Target element
                $relatedToggles, // All toggles with same target ID
                toggleID, // ID of toggle
                animateTime, // Animation duration (ms)
                useCss, // If CSS animations will be used instead of JS
                isOverlay, // If toggle should be used for site overlay
                isHold, // If toggle should remain active on outside clicks
                isNoFocus, // If should not focus inside after opening
                isActive, // If $toggle is active
                $html = $("html");

            /**
             * Setting toggle/target depending on if an ID is specified or not.
             * If no ID is supplied then it is treated as an expander container.
             */
            if ( $this.data("expander").length > 0 ) {
                $toggle = $this;
                $relatedToggles = $("[data-expander='" + $this.data("expander") + "']").not(this);
                $target = $("#" + $this.data("expander") );
            } else {
                $toggle = $this.find("[data-expander-toggle]");
                $target = $this.find("[data-expander-target]");
            }

            // Setting up expander configurations for later
            toggleID = $this.attr("id");
            animateTime = $this.data("expander-time") || 300;
            useCss = $this.is("[data-expander-css]");
            isOverlay = $this.is("[data-expander-overlay]");
            isHold = $this.is("[data-expander-hold]");
            isNoFocus = $this.is("[data-expander-nofocus]");
            isActive = $this.hasClass("active");

            // By default `jsAnimation` will be used unless data-expander-css is added
            var jsAnimation = {
                hide: function() {
                    // Remove `active` state after slide animation
                    $target.slideUp(animateTime, function() {
                        $target.removeClass("active");

                        // Update a11y to describe as closed
                        $toggle.add($relatedToggles).attr("aria-expanded", "false");
                    });
                },
                show: function() {
                    // Add `active` state after slide animation
                    $target.slideDown(animateTime, function() {
                        $target.addClass("active");
                    });
                }
            }

            /**
             * Only used if data-expander-css is added to the toggle. Should be
             * used with appropriate show/hide CSS animations if you go this route
             */
            var cssAnimation = {
                hide: function() {
                    /**
                     * Classes to use CSS animation for show/hiding.
                     * This will also allow us to set display to block/none
                     */
                    $target.removeClass("target-show");
                    $target.addClass("target-hide");

                    setTimeout(function() {
                        // At the end of the animation timer remove classes
                        $target.removeClass("active");
                        $target.removeClass("target-hide");

                        // Update a11y to describe as closed
                        $toggle.add($relatedToggles).attr("aria-expanded", "false");
                    }, animateTime);
                },
                show: function() {
                    // Should set to display block
                    $target.addClass("active");

                    /**
                    * CSS animation for show/hiding.Inside of
                    * setTimeout for cross-browser bugs(?)
                    */
                    setTimeout(function() {
                        $target.addClass("target-show");
                    }, 0);
                }
            }

            // Functionality for showing/hiding
            function toggleTarget() {
                // Clear out handler for easy exit of toggle if it exists
                $html.off("click touchstart keyup", dataToggleHandler);
                $html.off("click touchstart keyup", checkOutsideClick);

                if ( $target.hasClass("active") ) {
                    $toggle.add($relatedToggles).removeClass("active");

                    // Removing class on html element for site overlay effects
                    if ( isOverlay ) {
                        $html.removeClass("js-data-toggled");
                        $("html").removeClass("js-data-toggled-" + $target.attr("id"));
                    }

                    // Show/hide animation depending on if you want to use CSS animations or not
                    if ( useCss ) {
                        cssAnimation.hide();
                    } else {
                        jsAnimation.hide();
                    }
                } else {
                    $toggle.add($relatedToggles).addClass("active");

                    // Adding class on html element for site overlay effects
                    if ( isOverlay ) {
                        $html.addClass("js-data-toggled");
                        $("html").addClass("js-data-toggled-" + $target.attr("id"));
                    }

                    // Show/hide animation depending on if you want to use CSS animations or not
                    if ( useCss ) {
                        cssAnimation.show();
                    } else {
                        jsAnimation.show();
                    }

                    // Update a11y to describe as opened
                    $toggle.attr("aria-expanded", "true");

                    /**
                     * Setup `later` timeout functionality to make sure
                     * we can clearout if other data toggles are pressed.
                     * Then we focus an item inside (input, select, etc)
                     * otherwise focusable the whole target
                     */
                    var later = function() {
                        var $focusable = $target.find("input, select, textarea, a").first();

                        if (isNoFocus !== true) {
                            if ( $focusable.length > 0 ) {
                                $focusable.focus();
                            } else {
                                $target.focus();
                            }
                        }
                    };

                    // Timeout preferably same as or longer than the animation's duration
                    window.dataExpTimeOut = setTimeout(later, animateTime);

                    /**
                     * If isHold is true then when a user clicks outside of the $target
                     * nothing will happen. If false then add event listener to check for
                     * clicks outside the $target.
                     */
                    if ( !isHold ) $html.on("click touchstart keyup", dataToggleHandler);
                }
            }

            /**
             * Namespaced function for use in $html event checks
             * @param {Object} event Click/keyboard event object
             */
            function dataToggleHandler(e) {
                if ( e.which === 27 ) {
                    // If ESC is pressed or a click happens then trigger the target
                    $toggle.focus();
                    triggerTarget();
                } else {
                    // Otherwise check if touch/click is outside of bounds of $target
                    checkOutsideClick(e);
                }
            }

            /**
             * Checks if the click/keyboard event happened outside of the bounds of $target
             * @param {Object} event Click/keyboard event object
             */
            function checkOutsideClick(e) {
                var $eTarget = $(e.target);

                if ( $eTarget.closest($target).length <= 0 && $eTarget.closest("#" + toggleID).length <= 0 && talonUtil.a11yClick(e) === true ) {
                    triggerTarget();
                }
            }

            /**
             * Trigger function to toggle the target while also refreshing the timeout
             */
            function triggerTarget() {
                // Show/hide $target
                toggleTarget();

                // Clear timeout to help prevent focus / other data toggle press conflicts
                window.dataExpTimeOut = null;
            }

            // If target element exist run the data-expander functionality
            if ( $target.length > 0 ) {
                // Set global timeout to null so it doesn't conflict with other targets
                window.dataExpTimeOut = null;

                // Make sure there is an ID set for the toggle for a11y purposes
                if ( !toggleID ) {
                    $toggle.attr("id", "data-expander-" + key);
                    toggleID = $toggle.attr("id");
                }

                // Finish up a11y setup for related element
                $target.attr({ "aria-labelledby": toggleID });

                /**
                 * Make sure the target can be focused if no items inside
                 * are not auto-focused when opened
                 */
                if ( $target[0].hasAttribute("tabindex") === false ) {
                    $target.attr("tabindex", "0");
                }

                // Setup proper roles for a11y and then bind interaction functionality
                $toggle.attr({
                    "role": "button",
                    "aria-haspopup": "true",
                    "aria-expanded": "false"
                }).on("click keypress", function (e) {
                    if (talonUtil.a11yClick(e) === true) {
                        e.preventDefault();
                        toggleTarget();
                    }
                });

                if ( !isHold && isActive ) $html.on("click touchstart keyup", checkOutsideClick);

                // Add attr to target for CSS to hook onto
                $target.attr("data-expander-target", "");
            }
        });
    };

    //Debouncer to be used for scrolling and resize bindings
    talonUtil.debounce = function (func, wait, immediate) {
        var timeout;
        return function () {
            var context = this,
                args = arguments;
            var later = function later() {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            var callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    };


    //Get correct viewport size helper - don't use $(window).width();
    talonUtil.getViewportW = window.getViewportW || function () {
        var win = typeof window != 'undefined' && window,
            doc = typeof document != 'undefined' && document,
            docElem = doc && doc.documentElement;

        var a = docElem.clientWidth,
            b = win.innerWidth;
        return a < b ? b : a;
    };


    //For faux buttons, etc. to handle keyboard events such as space and enter on top of click/touch
    talonUtil.a11yClick = function (event) {
        if (event.type === 'click' || event.type === 'touchstart') {
            return true;
        } else if (event.type === 'keypress') {
            var code = event.charCode || event.keyCode;

            if (code === 32) {
                event.preventDefault();
            }

            if (code === 32 || code === 13) {
                return true;
            }
        } else {
            return false;
        }
    };


    // Remove pointer events when scrolling via overlay div to assist with FPS
    talonUtil.setupScrollPointerBlocker = function () {
        var body = document.body,
            cover = document.createElement('div'),
            timer;

        cover.setAttribute('class', 'scroll-cover');

        window.addEventListener('scroll', function () {
            clearTimeout(timer);
            body.appendChild(cover);

            timer = setTimeout(function () {
                body.removeChild(cover);
            }, talonUtil.speeds.fast);
        }, false);
    };


    /** Click vs. Keyboard user **/
    talonUtil.setupUserBinds = function () {
        var $body = $("body"),
            $html = $("html");

        if (!$html.hasClass("js-user-bind-init")) {
            $html.addClass("js-user-bind-init");
            $body.on("keyup", function () {
                if (!$html.hasClass("js-keyboard-user")) {
                    $html.removeClass("js-click-user").addClass("js-keyboard-user");
                }
            });

            $body.on("click", function () {
                if (!$html.hasClass("js-click-user")) {
                    $html.removeClass("js-keyboard-user").addClass("js-click-user");
                }
            });
        }
    };
})(jQuery, window.talonUtil = window.talonUtil || {});





/* ================================================================
        POLYFILLS
    ================================================================ */

/** iOS FIX to incorrect focus bug with keyboard not showing up and then the last touchup element gets clicked. **/
if (/iPad|iPhone|iPod/g.test(navigator.userAgent)) {
    (function ($) {
        return $.fn.focus = function () {
            return arguments[0];
        };
    })(jQuery);
}





/* ================================================================
        SITE INIT
    ================================================================ */

(function ($, talonUtil) {

    /** Click Navigation **/
    $(".main-nav").clickMenu();

    /** FocusOverlay **/
    $("body").focusOverlay();

    /** Image Gallery **/
    $('.photo-gallery.rotating').slick({
        dots: false,
        speed: 300,
        slidesToShow:4,
        arrows: true,
        slidesToScroll: 1,
        responsive: [
        {
          breakpoint: 960,
          settings: {
            slidesToShow: 2
          }
        },
        {
          breakpoint: 768,
          settings: {
            slidesToShow: 2
          }
        },
        {
          breakpoint: 640,
          settings: {
            slidesToShow: 1
          }
        }
      ]
    });

    $(".photo-overlay").colorbox({rel:'group1'});

    $('.photo-gallery-thumbs').slick({
      slidesToShow: 1,
      slidesToScroll: 1,
      arrows: false,
      fade: true,
      asNavFor: '.photo-thumbs'
    });

    $('.photo-thumbs').slick({
      slidesToShow: 4,
      slidesToScroll: 1,
      asNavFor: '.photo-gallery-thumbs',
      dots: false,
      centerMode: true,
      focusOnSelect: true,
      arrows:true,

      responsive: [
        {
          breakpoint: 960,
          settings: {
            slidesToShow: 3
          }
        },
        {
          breakpoint: 767,
          settings: {
            slidesToShow: 2
          }
        },

        {
          breakpoint: 479,
          settings: {
            slidesToShow: 1
          }
        }
      ]
    });

    /** List Tool on load */
    $('.list-tool.expand-list, .list-tool.accordion-list').each(function(){
        var $this = $(this);

        $this.find('.item:first-child > a').addClass('active');
        $this.find('.item .item-content').hide();
        $this.find('.item:first-child .item-content').show();
    });

    $('.talon-tabs').each(function(){
        var $this = $(this);

        $this.find('.talon-tab:first-child > a').addClass('active');
        $this.find('.talon-tab-pane').hide();
        $this.find('.talon-tab-pane:first-child').show();
    });

    /** Stop referrer Phishing hack + ADA */
    $("a[target=_blank], a[target=new]").each(function () {
        $(this)
            .attr("rel", "noopener noreferrer")
            .append("<span class='visually-hidden'>(Opens in a new window)</span>");
    });


    talonUtil.setupToggles();
    talonUtil.setupScrollPointerBlocker();
    talonUtil.setupUserBinds();





     //RPS Game
     const userScore = 0;
     const computerScore = 0;
     const userScore_span =  document.querySelector(".user-score");
     const computerScore_span =  document.querySelector(".computer-score");
     const scoreboard_div = document.querySelector(".scoreboard");
     const result_div = document.querySelector(".result");
     const rock_li = document.querySelector(".r");
     const paper_li = document.querySelector(".p");
     const scissors_li = document.querySelector(".s");
 
 
 
 //functions

 function game (userChoice){
    console.log(`Your Choice was ${userChoice} `)
}

function main(){
    rock_li.addEventListener("click", function(){
        game("r");
    });

    paper_li.addEventListener("click", function(){
       game("p");
    });

    scissors_li.addEventListener("click", function(){
       game("s");
    });
};
main();
 






})(jQuery, window.talonUtil);
