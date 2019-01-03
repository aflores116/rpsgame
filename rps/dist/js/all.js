/* ******************************************************
   PLUGINS
        - Currently used site-wide.
        - Put plugins here that you know will be used in many areas of the site
        - Libraries needed only in a single or few instance(s) can be called separately in the widget templates

        * INCLUDED IN THIS FILE:
            - ClickNav.js - v0.9.8.4 - http://nickgoodrum-templates.idevdesign.net/templates/nav/
            - Slick Carousel - v1.8.1 - http://kenwheeler.github.io/slick/
            - Colorbox Popup - v1.6.4 - http://www.jacklmoore.com/colorbox/
            - Focus Overlay - v0.9.3 - https://github.com/MauriceMahan/FocusOverlay/
   ****************************************************** */

/*! CLICK NAVIGATION FUNCTIONALITY
* Version: 0.9.8.4
* Author: Nick Goodrum
* Licensed under MIT:
* http://www.opensource.org/licenses/mit-license.php
* Followed WAI-ARIA spec except for typing a letter key keyboard functionality (optional) and left/right moving to next previous main tiers
* TO DO - CONFIRM DATA-ATTRIBUTE APPROACH, EXTEND MEGA / SLIDING TO REDUCE CODE BASE, DETERMINE IF MORE OR LESS OF THE WAI-ARIA SPEC IS NEEDED */

(function (window, factory) {
    'use strict';

    if (typeof define === 'function' && define.amd) {
        define(['jquery'], function ($) {
            return factory(window, $);
        });
    } else if (typeof exports === 'object' && typeof exports.nodeName !== 'string') {
        module.exports = factory(window, require('jquery'));
    } else {
        factory(window, jQuery);
    }
})(typeof window !== "undefined" ? window : this, function (window, $) {
    'use strict';

    var ClickMenu = window.ClickMenu || {};

    /*----------- ADD DEBOUNCER -----------*/

    // Code from Underscore.js

    var debounce = function (func, wait, immediate) {
        var timeout;
        return function () {
            var context = this,
                args = arguments;
            var later = function () {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            var callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    };

    /*-----------  ADD PROTOTYPE FOR OLDER BROWSERS -----------*/
    if (!Function.prototype.bind) {
        Function.prototype.bind = function () {
            var fn = this,
                args = Array.prototype.slice.call(arguments),
                object = args.shift();
            return function () {
                return fn.apply(object, args.concat(Array.prototype.slice.call(arguments)));
            };
        };
    }

    ClickMenu = function () {

        function ClickMenu(element, settings) {
            var _ = this,
                dataSettings;

            _.defaults = {
                menutype: "dropdown",
                animationSpeed: 400,
                toggle: "toggle-menu",
                menu: "cm-menu",
                htmlClass: "cm-js-menu-active",
                expanderText: "expand / collapse",
                //TODO: Eventually add parentLi Selector option so they aren't only lis
                landings: false,
                expanders: false,
                singleClick: true,
                isAutoClose: true,
                isRTL: false
            };

            dataSettings = $(element).data() || {};

            _.options = $.extend({}, _.defaults, dataSettings, settings);

            _.menu = element;
            _.$menu = $(element);
            _.$menuBar = _.$menu.find("." + _.options.menu);
            _.$menuToggle = _.$menu.find("." + _.options.toggle);
            _.$html = $("html");
            _.touchStart = false;
            _.isActive = false;
            _.isToggled = false;
            _.leavingMenu = false;
            _.currentFocus = 0;
            _.initialLinks = [];
            _.currentLinks = [];

            // Add in proxies so _ scope ties to this function even when called via outside event bindings, etc.
            _.keyHandler = $.proxy(_.keyHandler, _);
            _.findCurrentLinks = $.proxy(_.findCurrentLinks, _);
            _.resetMenus = $.proxy(_.resetMenus, _);
            _.cleanUpEvents = $.proxy(_.cleanUpEvents, _);
            _.destroy = $.proxy(_.destroy, _);
            _.showMenu = $.proxy(_.showMenu, _);
            _.hideMenu = $.proxy(_.hideMenu, _);
            _.menuToggle = $.proxy(_.menuToggle, _);
            _.subMenuToggle = $.proxy(_.subMenuToggle, _);
            _.menuHandler = $.proxy(_.menuHandler, _);
            _.menuToggleHandler = $.proxy(_.menuToggleHandler, _);

            if (_.$menuBar.length > 0) {
                _.init();
            }
        }

        return ClickMenu;
    }();

    ClickMenu.prototype.init = function () {
        var _ = this;

        //Bind Toggle Function to expand/collapse menu in small screens
        _.$menuToggle.on("touchstart click", _.menuToggle);

        // Add Aria Aspects and initial classes to menu wrap and menu
        _.$menu.addClass("cm-js-enabled").attr({ "role": "navigation" });
        _.$menuBar.attr("role", "menubar");

        //If there are prior dropdowns you want to get the highest one and add to the numbers
        var idNum = 1;

        if ($("[id^='cm-dropdown']").last().length > 0) {
            var highestNum = 0;

            $("[id^='cm-dropdown']").each(function () {
                var currentNum = $(this).attr("id").split("dropdown")[1];

                highestNum = currentNum && highestNum < parseInt(currentNum, 10) ? parseInt(currentNum, 10) : highestNum;
            });

            idNum = highestNum + 1;
        }

        _.$menu.on('keydown', _.keyHandler);
        //With Firefox 52 support coming in - this is a clean solution for tab users to toggle open/close menus - but will need to possibly consider if focusin is worth the fighting
        _.$menuBar.on('focusin', _.showMenu);

        _.$menu.find("." + _.options.menu + " a").each(function () {
            var $anchor = $(this),
                $parentLi = $anchor.closest('li'),
                $sibling;

            $anchor.attr({ "role": "menuitem", "tabindex": "-1" });
            $parentLi.attr("role", "presentation");

            if (!$parentLi.data("type") && $parentLi.parent().hasClass(_.options.menu)) {
                $parentLi.attr('data-type', _.options.menutype);
            }

            // Have anchor do what it normally would do unless it has subs

            if ($anchor.siblings().not("a").length > 0 && $parentLi.attr("data-option") !== "openSubs") {
                //Style it up via class
                var $expandable = $anchor.siblings(),
                    newID = "cm-dropdown" + idNum;

                if (_.options.expanders) {
                    $sibling = $("<a id='" + newID + "' href='#' role='menuitem' aria-haspopup='true' class='has-sub' tabindex='-1'><span><span class='visually-hidden'>" + _.options.expanderText + " " + $anchor.text() + "</span></span></a>");
                    $anchor.wrap("<div class='expander-wrap'></div>").after($sibling);

                    $sibling.on("click", _.subMenuToggle);
                } else {
                    //if there is an ID use it and make sure the expandable item gets it otherwise add the new id created
                    if ($anchor.attr("id")) {
                        newID = $anchor.attr("id");
                    } else {
                        $anchor.attr("id", "cm-dropdown" + idNum);
                    }
                    // bind click functionality for anchors as well as aria / class
                    $anchor.attr({ "aria-haspopup": "true" }).addClass("has-sub").on("click", _.subMenuToggle);
                }

                var visibleAlready = $expandable.height() > 0 ? true : false;
                $expandable.attr({ "role": "menu", "aria-expanded": visibleAlready, "aria-hidden": !visibleAlready, "aria-labelledby": newID });

                if (_.options.landings && !_.options.expanders) {
                    var $duplicate = $expandable.is("ul") ? $("<li class='link-landing' role='presentation'>" + $anchor.get(0).outerHTML + "</li>") : $("<div class='link-landing' role='presentation'>" + $anchor.get(0).outerHTML + "</div>");
                    $duplicate.children().removeAttr("aria-haspopup class id");
                    $duplicate.find("a").removeClass("has-sub");
                    $expandable.prepend($duplicate);
                }

                if ($parentLi.data("type") && $parentLi.data("type") === "sliding") {
                    var $subMenu = $("<div class='sub-menu cm-js-inactive'></div>");

                    $expandable.wrap($subMenu);

                    var adjustMenu = function () {
                        var maxWidth = _.$menu.innerWidth(),
                            leftPosition = $parentLi.position().left,
                            $adjustable;

                        $adjustable = $parentLi.children(".sub-menu");
                        $adjustable.find("> ul > li > ul").innerWidth(maxWidth);

                        $adjustable.innerWidth(maxWidth).css("left", "-" + leftPosition + "px");
                    };

                    var debounceAdjustments = debounce(adjustMenu, 300);

                    $(window).load(function () {
                        adjustMenu();

                        $(window).resize(debounceAdjustments);
                    });
                }

                if (newID === "cm-dropdown" + idNum) {
                    idNum++;
                }
            }

            // ADD In Initial Links for main tier
            if ($anchor.closest("[role]:not(a)").is("[data-type]") && $anchor.is(":visible")) {
                _.initialLinks.push($anchor);

                if (_.options.expanders && $sibling) {
                    _.initialLinks.push($sibling);
                }
            }
        });

        _.currentLinks = _.initialLinks;

        if (_.currentLinks[_.currentFocus]) {
            _.currentLinks[_.currentFocus].attr("tabindex", "0");
        }

        _.$menu.trigger("init", [_]);
    };

    ClickMenu.prototype.keyHandler = function (e) {
        var _ = this,
            keyPress = e.keyCode;

        if (!_.$menu.hasClass("cm-js-inFocus") && keyPress !== 9) {
            _.$menu.addClass("cm-js-inFocus").attr("tabindex", "-1");
        }
        switch (keyPress) {
            //TAB
            case 9:
                _.$menu.removeClass("cm-js-inFocus");
                break;
            //LEFT UP RIGHT DOWN
            case 37:
            case 38:
            case 39:
            case 40:
                //Prevent Scrolling aspects from browser
                e.preventDefault();

                //Maintain currentLink since it will potentially be overwritten with the next focus
                var oldLink = _.currentLinks[_.currentFocus];

                //Don't do anything if in mid transition
                if (oldLink) {
                    var inMainTier = oldLink.closest("[role]:not(a)").is("[data-type]"),
                        next,
                        direction,
                        close,
                        open;

                    //IF LEFT / UP  (Depending on TIER) change next item to rotate to

                    if (inMainTier) {
                        // IF LEFT / RIGHT rotate to new item
                        if (keyPress === 37) {
                            direction = _.options.isRTL ? "next" : "prev";
                        } else if (keyPress === 39) {
                            direction = _.options.isRTL ? "prev" : "next";
                        } else if (keyPress === 40 || keyPress === 38) {
                            open = true;
                        }
                    } else {
                        // IF UP / DOWN rotate to new item - IF LEFT on sub subs close menu
                        if (keyPress === 38) {
                            direction = "prev";
                        } else if (keyPress === 40) {
                            direction = "next";
                        } else if (keyPress === 39) {
                            if (_.options.isRTL) {
                                close = true;
                            } else {
                                open = true;
                            }
                            //} else if ( ! inSecondTier && keyPress === 37 ) {
                        } else if (keyPress === 37) {
                            if (_.options.isRTL) {
                                open = true;
                            } else {
                                close = true;
                            }
                        }
                    }

                    if (direction) {

                        if (direction === "prev") {
                            //If there aren't any prior items move to last item in the list
                            _.currentFocus = _.currentFocus - 1 >= 0 ? _.currentFocus - 1 : _.currentLinks.length - 1;
                        } else {
                            //If there aren't any more items move to first item in the list
                            _.currentFocus = _.currentFocus + 1 < _.currentLinks.length ? _.currentFocus + 1 : 0;
                        }
                        next = _.currentLinks[_.currentFocus];
                    }

                    //If there isn't anything next click the anchor
                    if (next) {
                        oldLink.attr("tabindex", "-1");
                        _.currentLinks[_.currentFocus].attr("tabindex", "0").focus();
                    } else if (close) {
                        //Same as ESCAPE - TBD should we actually close the whole menu and go to a previous item (ARIA Spec)?
                        _.$menu.find(".opened").last().find("[aria-haspopup]").first().trigger("click");
                    } else if (open) {
                        //Only open if it isn't opened - escape is how to close a menu
                        //Also don't trigger click on a normal link - TBD should we really close the whole menu and go to the next item (ARIA Spec)?
                        if (!oldLink.closest("li").hasClass("opened") && _.currentLinks[_.currentFocus].hasClass("has-sub")) {
                            _.currentLinks[_.currentFocus].trigger("click");
                        }
                    }
                }
                break;
            //ESCAPE
            case 27:
                e.preventDefault();
                _.$menu.find(".opened").last().find("[aria-haspopup]").first().trigger("click");
                break;
            //SPACE BAR (ENTER ALREADY BY DEFAULT DOES THIS)
            case 32:
                e.preventDefault();
                _.currentLinks[_.currentFocus].trigger("click");
                break;
        }
    };

    ClickMenu.prototype.findCurrentLinks = function ($parentLi, $currAnchor, skipFocus) {
        var _ = this;

        $.each(_.currentLinks, function () {
            var $anchor = this;
            $anchor.attr("tabindex", "-1");
        });

        _.currentLinks = [];
        _.currentFocus = 0;

        if ($parentLi && !$parentLi.data("type")) {
            var actualKey = 0;

            $parentLi.closest("[role=menu]").find("a, input, select, textarea, button").filter(":visible").each(function (key, val) {
                //How do you find :hidden items that aren't actually hidden? Check the height of the parent - be careful of floating clearout issues
                var $item = $(val);
                //Looks like even with animation speed done correctly there can be a minor amount of pixels still transitioning in css
                if ($item.closest("[role=menu]").height() > 10 && $item.closest("[role=menu]").width() > 10) {
                    _.currentLinks.push($item);

                    if ($currAnchor && $currAnchor.attr("id") && $currAnchor.attr("id") === $item.attr("id")) {
                        _.currentFocus = actualKey;
                    }
                    actualKey++;
                }
            });
        } else {
            var $tabbables = _.$menuBar.find("a, input, select, textarea, button").filter(":visible");

            $tabbables.each(function (key, val) {
                var $item = $(val);
                if ($item.closest("[role]:not(a)").is("[data-type]")) {
                    _.currentLinks.push($item);
                }
            });
            //If a ParentLi is supplied e.g. from submenutoggle then get the eq otherwise get the first visible eq
            _.currentFocus = $parentLi ? $parentLi.index() : 0;
        }

        if (_.currentLinks[_.currentFocus]) {
            _.currentLinks[_.currentFocus].attr("tabindex", "0");

            if (!_.leavingMenu && !skipFocus) {
                _.currentLinks[_.currentFocus].focus();
            }
        }
    };

    ClickMenu.prototype.resetMenus = function ($links) {
        $links.each(function () {
            var $toggle = $(this),
                $opened = $toggle.closest(".opened"),
                labelId = $toggle.attr("id"),
                $relatedSub = $("[aria-labelledby='" + labelId + "']");

            $toggle.attr("tabindex", "-1");
            $relatedSub.attr({ "aria-hidden": true, "aria-expanded": false });
            $opened.removeClass("opened animating animated");
        });
    };

    ClickMenu.prototype.cleanUpEvents = function () {
        var _ = this;
        _.$menu.find("li a").off("click", _.subMenuToggle);

        // Change into FOCUS with corresponding namespace function
        _.$menu.off('keydown', _.keyHandler);
        _.$menuBar.off("focusin", _.showMenu);

        _.$html.off("touchstart click focusin", _.menuHandler);
        _.$html.off("touchstart click focusin", _.menuToggleHandler);
    };

    ClickMenu.prototype.destroy = function () {
        var _ = this;

        _.$menu.removeClass("cm-js-enabled cm-js-inFocus cm-js-active").removeAttr("tabindex");
        _.$menuBar.removeAttr("role");
        _.$menu.find("[role=presentation]").removeAttr("role").filter(".opened").removeClass("opened animating animated");
        _.$menu.find("[role=menuitem]").removeAttr("tabindex aria-haspopup role").removeClass("has-sub");
        _.$menu.find("[role=menu]").removeAttr("aria-expanded aria-hidden aria-labelledby role");
        _.cleanUpEvents();
    };

    ClickMenu.prototype.getClickMenu = function () {
        return this;
    };

    ClickMenu.prototype.showMenu = function (e) {
        var _ = this;

        //Need to make it check for hasClass on the current item rather than html and all items
        if (_.$menuBar.height() <= 10 && !_.$menu.hasClass("cm-js-active") && !_.$menu.hasClass("cm-animate-out")) {
            _.$menu.trigger("beforeMenuShow", [_]);

            _.isActive = true;
            _.isToggled = true;
            _.$menu.addClass("cm-js-active");

            _.$menuToggle.addClass("active");
            _.$html.addClass(_.options.htmlClass); // ADD FOR INITIAL STYLING

            _.findCurrentLinks();

            _.$html.off("touchstart click focusin", _.menuToggleHandler);

            // ADD TOGGLE HANDLER AFTER ANIMATION TO PREVENT CLOSING MENUS FROM REMOVING THE HANDLER
            setTimeout(function () {
                _.$menu.trigger("afterMenuShow", [_]);
                _.$html.addClass(_.options.htmlClass).on("touchstart click focusin", _.menuToggleHandler);
            }, _.options.animationSpeed);
        }
    };

    ClickMenu.prototype.hideMenu = function (e) {
        var _ = this;

        if (_.$menu.hasClass("cm-js-active") && _.$html.hasClass(_.options.htmlClass)) {
            _.$menu.trigger("beforeMenuHide", [_]);

            _.isActive = false;
            _.isToggled = false;
            _.$menu.removeClass("cm-js-active cm-js-inFocus");
            _.$menuToggle.removeClass("active");

            _.$html.removeClass(_.options.htmlClass).off("touchstart click focusin", _.menuToggleHandler);
            _.$menu.addClass("cm-animate-out");

            setTimeout(function () {
                _.$html.removeClass(_.options.htmlClass);
                _.$menu.removeClass("cm-animate-out").trigger("afterMenuHide", [_]);
            }, _.options.animationSpeed);
        }
    };

    ClickMenu.prototype.menuToggle = function (e) {
        var _ = this;
        e.preventDefault();

        if (e.type === "touchstart" || !_.touchStart) {
            if (_.isActive) {
                _.hideMenu();
            } else {
                _.showMenu();
            }
        }

        _.touchStart = e.type === "touchstart" ? true : false;
    };

    ClickMenu.prototype.subMenuToggle = function (e, params) {
        var _ = this;

        var $currAnchor = $(e.currentTarget),
            $parentLi = $currAnchor.closest("li"),
            $menuCol = $currAnchor.closest("[data-type]"),
            menuType = $menuCol.data("type"),
            $relatedMenu = $("[aria-labelledby=" + $currAnchor.attr("id") + "]");

        var subDefaults = { skipFocus: false },
            subOptions = $.extend({}, subDefaults, params);

        _.$html.off("touchstart click focusin", _.menuHandler);

        if ($parentLi.hasClass("opened")) {

            _.$menu.trigger("beforeSubClose", [_, $currAnchor, $relatedMenu]);

            if (_.options.singleClick) {
                e.preventDefault();

                if (menuType === "sliding" && $parentLi.parents(".sub-menu").hasClass("sub-menu")) {
                    $parentLi.parents(".sub-menu").addClass("cm-js-inactive");
                }

                $parentLi.removeClass("opened animating animated");

                if (_.$menu.find(".opened").length > 0 && _.options.isAutoClose) {
                    _.$html.on("touchstart click focusin", _.menuHandler);
                }

                $relatedMenu.attr({ "aria-expanded": "false", "aria-hidden": "true" });

                $relatedMenu.find("[aria-expanded=true]").each(function () {
                    var $childMenu = $(this);

                    $childMenu.attr({ "aria-expanded": "false", "aria-hidden": "true" }).closest("[role=presentation]").removeClass("opened animating animated");
                });

                setTimeout(function () {

                    //Update Current Links for keyboard
                    _.findCurrentLinks($parentLi, $currAnchor, subOptions.skipFocus);

                    _.$menu.trigger("afterSubClose", [_, $currAnchor, $relatedMenu]);
                }, _.options.animationSpeed);
            }
        } else {
            // Otherwise Open submenu and attach site click handler
            // Also - close any other open menus and their children
            e.preventDefault();

            _.$menu.trigger("beforeSubOpen", [_, $currAnchor, $relatedMenu]);

            $parentLi.addClass("opened animating").siblings().removeClass("opened animating animated").find(".opened").removeClass("opened animating animated");

            //FOR SLIDING MENUS
            $parentLi.siblings().find(".sub-menu").addClass("cm-js-inactive");

            if (menuType === "sliding" && $parentLi.parents(".sub-menu").length > 0) {
                $parentLi.parents(".sub-menu").removeClass("cm-js-inactive");
            }
            //END FOR SLIDING MENU

            $relatedMenu.attr({ "aria-expanded": "true", "aria-hidden": "false" });

            //Wait until timer is complete so the bindings and currentLink groupings don't overlap
            setTimeout(function () {
                if ($parentLi.hasClass("animating")) {
                    $parentLi.removeClass("animating").addClass("animated");
                }

                //Update Current Links for keyboard
                _.findCurrentLinks($relatedMenu, $relatedMenu.find("a").first(), subOptions.skipFocus);

                // ADD TOGGLE HANDLER AFTER ANIMATION TO PREVENT CLOSING MENUS FROM REMOVING THE HANDLER
                if (_.options.isAutoClose) {
                    // Only add if (default) menus set to auto close
                    _.$html.on("touchstart click focusin", _.menuHandler);
                }

                _.$menu.trigger("afterSubOpen", [_, $currAnchor, $relatedMenu]);
            }, _.options.animationSpeed);
        }
    };

    ClickMenu.prototype.menuToggleHandler = function (e) {
        var _ = this;

        if (!$.contains(_.menu, e.target) && !_.$menu.is($(e.target)) && _.isToggled) {
            _.isToggled = false;
            _.touchStart = false;

            if (_.$menuToggle.length > 0) {
                _.$menuToggle.trigger("click");
            } else {
                _.hideMenu();
            }

            _.$html.removeClass(_.options.htmlClass).off("touchstart click focusin", _.menuToggleHandler);
        }
    };

    ClickMenu.prototype.menuHandler = function (e) {
        var _ = this;

        if (!$.contains(_.menu, e.target) && !_.$menu.is($(e.target))) {
            //Make sure not to leave any tabindex=0 on submenu links by making sure the toggle knows we are leaving the menu
            _.leavingMenu = true;

            _.resetMenus(_.$menu.find(".opened > .has-sub, .opened > .expander-wrap > .has-sub"));
            _.findCurrentLinks();

            _.$html.off("touchstart click focusin", _.menuHandler);

            setTimeout(function () {
                //We now know we have left the menu and are done triggering sub menus
                _.leavingMenu = false;
            }, _.options.animationSpeed);
        }
    };

    $.fn.clickMenu = function () {
        var _ = this,
            opt = arguments[0],
            args = Array.prototype.slice.call(arguments, 1),
            l = _.length,
            i,
            ret;

        for (i = 0; i < l; i++) {
            if (typeof opt == 'object' || typeof opt == 'undefined') {
                _[i].clickMenu = new ClickMenu(_[i], opt);
            } else {
                ret = _[i].clickMenu[opt].apply(_[i].clickMenu, args);
            }

            if (typeof ret != 'undefined') return ret;
        }

        return _;
    };
});

/*
     _ _      _       _
 ___| (_) ___| | __  (_)___
/ __| | |/ __| |/ /  | / __|
\__ \ | | (__|   < _ | \__ \
|___/_|_|\___|_|\_(_)/ |___/
                   |__/

 Version: 1.8.1
  Author: Ken Wheeler
 Website: http://kenwheeler.github.io
    Docs: http://kenwheeler.github.io/slick
    Repo: http://github.com/kenwheeler/slick
  Issues: http://github.com/kenwheeler/slick/issues

 */
/* global window, document, define, jQuery, setInterval, clearInterval */
;(function (factory) {
    'use strict';

    if (typeof define === 'function' && define.amd) {
        define(['jquery'], factory);
    } else if (typeof exports !== 'undefined') {
        module.exports = factory(require('jquery'));
    } else {
        factory(jQuery);
    }
})(function ($) {
    'use strict';

    var Slick = window.Slick || {};

    Slick = function () {

        var instanceUid = 0;

        function Slick(element, settings) {

            var _ = this,
                dataSettings;

            _.defaults = {
                accessibility: true,
                adaptiveHeight: false,
                appendArrows: $(element),
                appendDots: $(element),
                arrows: true,
                asNavFor: null,
                prevArrow: '<button class="slick-prev" aria-label="Previous" type="button">Previous</button>',
                nextArrow: '<button class="slick-next" aria-label="Next" type="button">Next</button>',
                autoplay: false,
                autoplaySpeed: 3000,
                centerMode: false,
                centerPadding: '50px',
                cssEase: 'ease',
                customPaging: function (slider, i) {
                    return $('<button type="button" />').text(i + 1);
                },
                dots: false,
                dotsClass: 'slick-dots',
                draggable: true,
                easing: 'linear',
                edgeFriction: 0.35,
                fade: false,
                focusOnSelect: false,
                focusOnChange: false,
                infinite: true,
                initialSlide: 0,
                lazyLoad: 'ondemand',
                mobileFirst: false,
                pauseOnHover: true,
                pauseOnFocus: true,
                pauseOnDotsHover: false,
                respondTo: 'window',
                responsive: null,
                rows: 1,
                rtl: false,
                slide: '',
                slidesPerRow: 1,
                slidesToShow: 1,
                slidesToScroll: 1,
                speed: 500,
                swipe: true,
                swipeToSlide: false,
                touchMove: true,
                touchThreshold: 5,
                useCSS: true,
                useTransform: true,
                variableWidth: false,
                vertical: false,
                verticalSwiping: false,
                waitForAnimate: true,
                zIndex: 1000
            };

            _.initials = {
                animating: false,
                dragging: false,
                autoPlayTimer: null,
                currentDirection: 0,
                currentLeft: null,
                currentSlide: 0,
                direction: 1,
                $dots: null,
                listWidth: null,
                listHeight: null,
                loadIndex: 0,
                $nextArrow: null,
                $prevArrow: null,
                scrolling: false,
                slideCount: null,
                slideWidth: null,
                $slideTrack: null,
                $slides: null,
                sliding: false,
                slideOffset: 0,
                swipeLeft: null,
                swiping: false,
                $list: null,
                touchObject: {},
                transformsEnabled: false,
                unslicked: false
            };

            $.extend(_, _.initials);

            _.activeBreakpoint = null;
            _.animType = null;
            _.animProp = null;
            _.breakpoints = [];
            _.breakpointSettings = [];
            _.cssTransitions = false;
            _.focussed = false;
            _.interrupted = false;
            _.hidden = 'hidden';
            _.paused = true;
            _.positionProp = null;
            _.respondTo = null;
            _.rowCount = 1;
            _.shouldClick = true;
            _.$slider = $(element);
            _.$slidesCache = null;
            _.transformType = null;
            _.transitionType = null;
            _.visibilityChange = 'visibilitychange';
            _.windowWidth = 0;
            _.windowTimer = null;

            dataSettings = $(element).data('slick') || {};

            _.options = $.extend({}, _.defaults, settings, dataSettings);

            _.currentSlide = _.options.initialSlide;

            _.originalSettings = _.options;

            if (typeof document.mozHidden !== 'undefined') {
                _.hidden = 'mozHidden';
                _.visibilityChange = 'mozvisibilitychange';
            } else if (typeof document.webkitHidden !== 'undefined') {
                _.hidden = 'webkitHidden';
                _.visibilityChange = 'webkitvisibilitychange';
            }

            _.autoPlay = $.proxy(_.autoPlay, _);
            _.autoPlayClear = $.proxy(_.autoPlayClear, _);
            _.autoPlayIterator = $.proxy(_.autoPlayIterator, _);
            _.changeSlide = $.proxy(_.changeSlide, _);
            _.clickHandler = $.proxy(_.clickHandler, _);
            _.selectHandler = $.proxy(_.selectHandler, _);
            _.setPosition = $.proxy(_.setPosition, _);
            _.swipeHandler = $.proxy(_.swipeHandler, _);
            _.dragHandler = $.proxy(_.dragHandler, _);
            _.keyHandler = $.proxy(_.keyHandler, _);

            _.instanceUid = instanceUid++;

            // A simple way to check for HTML strings
            // Strict HTML recognition (must start with <)
            // Extracted from jQuery v1.11 source
            _.htmlExpr = /^(?:\s*(<[\w\W]+>)[^>]*)$/;

            _.registerBreakpoints();
            _.init(true);
        }

        return Slick;
    }();

    Slick.prototype.activateADA = function () {
        var _ = this;

        _.$slideTrack.find('.slick-active').attr({
            'aria-hidden': 'false'
        }).find('a, input, button, select').attr({
            'tabindex': '0'
        });
    };

    Slick.prototype.addSlide = Slick.prototype.slickAdd = function (markup, index, addBefore) {

        var _ = this;

        if (typeof index === 'boolean') {
            addBefore = index;
            index = null;
        } else if (index < 0 || index >= _.slideCount) {
            return false;
        }

        _.unload();

        if (typeof index === 'number') {
            if (index === 0 && _.$slides.length === 0) {
                $(markup).appendTo(_.$slideTrack);
            } else if (addBefore) {
                $(markup).insertBefore(_.$slides.eq(index));
            } else {
                $(markup).insertAfter(_.$slides.eq(index));
            }
        } else {
            if (addBefore === true) {
                $(markup).prependTo(_.$slideTrack);
            } else {
                $(markup).appendTo(_.$slideTrack);
            }
        }

        _.$slides = _.$slideTrack.children(this.options.slide);

        _.$slideTrack.children(this.options.slide).detach();

        _.$slideTrack.append(_.$slides);

        _.$slides.each(function (index, element) {
            $(element).attr('data-slick-index', index);
        });

        _.$slidesCache = _.$slides;

        _.reinit();
    };

    Slick.prototype.animateHeight = function () {
        var _ = this;
        if (_.options.slidesToShow === 1 && _.options.adaptiveHeight === true && _.options.vertical === false) {
            var targetHeight = _.$slides.eq(_.currentSlide).outerHeight(true);
            _.$list.animate({
                height: targetHeight
            }, _.options.speed);
        }
    };

    Slick.prototype.animateSlide = function (targetLeft, callback) {

        var animProps = {},
            _ = this;

        _.animateHeight();

        if (_.options.rtl === true && _.options.vertical === false) {
            targetLeft = -targetLeft;
        }
        if (_.transformsEnabled === false) {
            if (_.options.vertical === false) {
                _.$slideTrack.animate({
                    left: targetLeft
                }, _.options.speed, _.options.easing, callback);
            } else {
                _.$slideTrack.animate({
                    top: targetLeft
                }, _.options.speed, _.options.easing, callback);
            }
        } else {

            if (_.cssTransitions === false) {
                if (_.options.rtl === true) {
                    _.currentLeft = -_.currentLeft;
                }
                $({
                    animStart: _.currentLeft
                }).animate({
                    animStart: targetLeft
                }, {
                    duration: _.options.speed,
                    easing: _.options.easing,
                    step: function (now) {
                        now = Math.ceil(now);
                        if (_.options.vertical === false) {
                            animProps[_.animType] = 'translate(' + now + 'px, 0px)';
                            _.$slideTrack.css(animProps);
                        } else {
                            animProps[_.animType] = 'translate(0px,' + now + 'px)';
                            _.$slideTrack.css(animProps);
                        }
                    },
                    complete: function () {
                        if (callback) {
                            callback.call();
                        }
                    }
                });
            } else {

                _.applyTransition();
                targetLeft = Math.ceil(targetLeft);

                if (_.options.vertical === false) {
                    animProps[_.animType] = 'translate3d(' + targetLeft + 'px, 0px, 0px)';
                } else {
                    animProps[_.animType] = 'translate3d(0px,' + targetLeft + 'px, 0px)';
                }
                _.$slideTrack.css(animProps);

                if (callback) {
                    setTimeout(function () {

                        _.disableTransition();

                        callback.call();
                    }, _.options.speed);
                }
            }
        }
    };

    Slick.prototype.getNavTarget = function () {

        var _ = this,
            asNavFor = _.options.asNavFor;

        if (asNavFor && asNavFor !== null) {
            asNavFor = $(asNavFor).not(_.$slider);
        }

        return asNavFor;
    };

    Slick.prototype.asNavFor = function (index) {

        var _ = this,
            asNavFor = _.getNavTarget();

        if (asNavFor !== null && typeof asNavFor === 'object') {
            asNavFor.each(function () {
                var target = $(this).slick('getSlick');
                if (!target.unslicked) {
                    target.slideHandler(index, true);
                }
            });
        }
    };

    Slick.prototype.applyTransition = function (slide) {

        var _ = this,
            transition = {};

        if (_.options.fade === false) {
            transition[_.transitionType] = _.transformType + ' ' + _.options.speed + 'ms ' + _.options.cssEase;
        } else {
            transition[_.transitionType] = 'opacity ' + _.options.speed + 'ms ' + _.options.cssEase;
        }

        if (_.options.fade === false) {
            _.$slideTrack.css(transition);
        } else {
            _.$slides.eq(slide).css(transition);
        }
    };

    Slick.prototype.autoPlay = function () {

        var _ = this;

        _.autoPlayClear();

        if (_.slideCount > _.options.slidesToShow) {
            _.autoPlayTimer = setInterval(_.autoPlayIterator, _.options.autoplaySpeed);
        }
    };

    Slick.prototype.autoPlayClear = function () {

        var _ = this;

        if (_.autoPlayTimer) {
            clearInterval(_.autoPlayTimer);
        }
    };

    Slick.prototype.autoPlayIterator = function () {

        var _ = this,
            slideTo = _.currentSlide + _.options.slidesToScroll;

        if (!_.paused && !_.interrupted && !_.focussed) {

            if (_.options.infinite === false) {

                if (_.direction === 1 && _.currentSlide + 1 === _.slideCount - 1) {
                    _.direction = 0;
                } else if (_.direction === 0) {

                    slideTo = _.currentSlide - _.options.slidesToScroll;

                    if (_.currentSlide - 1 === 0) {
                        _.direction = 1;
                    }
                }
            }

            _.slideHandler(slideTo);
        }
    };

    Slick.prototype.buildArrows = function () {

        var _ = this;

        if (_.options.arrows === true) {

            _.$prevArrow = $(_.options.prevArrow).addClass('slick-arrow');
            _.$nextArrow = $(_.options.nextArrow).addClass('slick-arrow');

            if (_.slideCount > _.options.slidesToShow) {

                _.$prevArrow.removeClass('slick-hidden').removeAttr('aria-hidden tabindex');
                _.$nextArrow.removeClass('slick-hidden').removeAttr('aria-hidden tabindex');

                if (_.htmlExpr.test(_.options.prevArrow)) {
                    _.$prevArrow.prependTo(_.options.appendArrows);
                }

                if (_.htmlExpr.test(_.options.nextArrow)) {
                    _.$nextArrow.appendTo(_.options.appendArrows);
                }

                if (_.options.infinite !== true) {
                    _.$prevArrow.addClass('slick-disabled').attr('aria-disabled', 'true');
                }
            } else {

                _.$prevArrow.add(_.$nextArrow).addClass('slick-hidden').attr({
                    'aria-disabled': 'true',
                    'tabindex': '-1'
                });
            }
        }
    };

    Slick.prototype.buildDots = function () {

        var _ = this,
            i,
            dot;

        if (_.options.dots === true && _.slideCount > _.options.slidesToShow) {

            _.$slider.addClass('slick-dotted');

            dot = $('<ul />').addClass(_.options.dotsClass);

            for (i = 0; i <= _.getDotCount(); i += 1) {
                dot.append($('<li />').append(_.options.customPaging.call(this, _, i)));
            }

            _.$dots = dot.appendTo(_.options.appendDots);

            _.$dots.find('li').first().addClass('slick-active');
        }
    };

    Slick.prototype.buildOut = function () {

        var _ = this;

        _.$slides = _.$slider.children(_.options.slide + ':not(.slick-cloned)').addClass('slick-slide');

        _.slideCount = _.$slides.length;

        _.$slides.each(function (index, element) {
            $(element).attr('data-slick-index', index).data('originalStyling', $(element).attr('style') || '');
        });

        _.$slider.addClass('slick-slider');

        _.$slideTrack = _.slideCount === 0 ? $('<div class="slick-track"/>').appendTo(_.$slider) : _.$slides.wrapAll('<div class="slick-track"/>').parent();

        _.$list = _.$slideTrack.wrap('<div class="slick-list"/>').parent();
        _.$slideTrack.css('opacity', 0);

        if (_.options.centerMode === true || _.options.swipeToSlide === true) {
            _.options.slidesToScroll = 1;
        }

        $('img[data-lazy]', _.$slider).not('[src]').addClass('slick-loading');

        _.setupInfinite();

        _.buildArrows();

        _.buildDots();

        _.updateDots();

        _.setSlideClasses(typeof _.currentSlide === 'number' ? _.currentSlide : 0);

        if (_.options.draggable === true) {
            _.$list.addClass('draggable');
        }
    };

    Slick.prototype.buildRows = function () {

        var _ = this,
            a,
            b,
            c,
            newSlides,
            numOfSlides,
            originalSlides,
            slidesPerSection;

        newSlides = document.createDocumentFragment();
        originalSlides = _.$slider.children();

        if (_.options.rows > 0) {

            slidesPerSection = _.options.slidesPerRow * _.options.rows;
            numOfSlides = Math.ceil(originalSlides.length / slidesPerSection);

            for (a = 0; a < numOfSlides; a++) {
                var slide = document.createElement('div');
                for (b = 0; b < _.options.rows; b++) {
                    var row = document.createElement('div');
                    for (c = 0; c < _.options.slidesPerRow; c++) {
                        var target = a * slidesPerSection + (b * _.options.slidesPerRow + c);
                        if (originalSlides.get(target)) {
                            row.appendChild(originalSlides.get(target));
                        }
                    }
                    slide.appendChild(row);
                }
                newSlides.appendChild(slide);
            }

            _.$slider.empty().append(newSlides);
            _.$slider.children().children().children().css({
                'width': 100 / _.options.slidesPerRow + '%',
                'display': 'inline-block'
            });
        }
    };

    Slick.prototype.checkResponsive = function (initial, forceUpdate) {

        var _ = this,
            breakpoint,
            targetBreakpoint,
            respondToWidth,
            triggerBreakpoint = false;
        var sliderWidth = _.$slider.width();
        var windowWidth = window.innerWidth || $(window).width();

        if (_.respondTo === 'window') {
            respondToWidth = windowWidth;
        } else if (_.respondTo === 'slider') {
            respondToWidth = sliderWidth;
        } else if (_.respondTo === 'min') {
            respondToWidth = Math.min(windowWidth, sliderWidth);
        }

        if (_.options.responsive && _.options.responsive.length && _.options.responsive !== null) {

            targetBreakpoint = null;

            for (breakpoint in _.breakpoints) {
                if (_.breakpoints.hasOwnProperty(breakpoint)) {
                    if (_.originalSettings.mobileFirst === false) {
                        if (respondToWidth < _.breakpoints[breakpoint]) {
                            targetBreakpoint = _.breakpoints[breakpoint];
                        }
                    } else {
                        if (respondToWidth > _.breakpoints[breakpoint]) {
                            targetBreakpoint = _.breakpoints[breakpoint];
                        }
                    }
                }
            }

            if (targetBreakpoint !== null) {
                if (_.activeBreakpoint !== null) {
                    if (targetBreakpoint !== _.activeBreakpoint || forceUpdate) {
                        _.activeBreakpoint = targetBreakpoint;
                        if (_.breakpointSettings[targetBreakpoint] === 'unslick') {
                            _.unslick(targetBreakpoint);
                        } else {
                            _.options = $.extend({}, _.originalSettings, _.breakpointSettings[targetBreakpoint]);
                            if (initial === true) {
                                _.currentSlide = _.options.initialSlide;
                            }
                            _.refresh(initial);
                        }
                        triggerBreakpoint = targetBreakpoint;
                    }
                } else {
                    _.activeBreakpoint = targetBreakpoint;
                    if (_.breakpointSettings[targetBreakpoint] === 'unslick') {
                        _.unslick(targetBreakpoint);
                    } else {
                        _.options = $.extend({}, _.originalSettings, _.breakpointSettings[targetBreakpoint]);
                        if (initial === true) {
                            _.currentSlide = _.options.initialSlide;
                        }
                        _.refresh(initial);
                    }
                    triggerBreakpoint = targetBreakpoint;
                }
            } else {
                if (_.activeBreakpoint !== null) {
                    _.activeBreakpoint = null;
                    _.options = _.originalSettings;
                    if (initial === true) {
                        _.currentSlide = _.options.initialSlide;
                    }
                    _.refresh(initial);
                    triggerBreakpoint = targetBreakpoint;
                }
            }

            // only trigger breakpoints during an actual break. not on initialize.
            if (!initial && triggerBreakpoint !== false) {
                _.$slider.trigger('breakpoint', [_, triggerBreakpoint]);
            }
        }
    };

    Slick.prototype.changeSlide = function (event, dontAnimate) {

        var _ = this,
            $target = $(event.currentTarget),
            indexOffset,
            slideOffset,
            unevenOffset;

        // If target is a link, prevent default action.
        if ($target.is('a')) {
            event.preventDefault();
        }

        // If target is not the <li> element (ie: a child), find the <li>.
        if (!$target.is('li')) {
            $target = $target.closest('li');
        }

        unevenOffset = _.slideCount % _.options.slidesToScroll !== 0;
        indexOffset = unevenOffset ? 0 : (_.slideCount - _.currentSlide) % _.options.slidesToScroll;

        switch (event.data.message) {

            case 'previous':
                slideOffset = indexOffset === 0 ? _.options.slidesToScroll : _.options.slidesToShow - indexOffset;
                if (_.slideCount > _.options.slidesToShow) {
                    _.slideHandler(_.currentSlide - slideOffset, false, dontAnimate);
                }
                break;

            case 'next':
                slideOffset = indexOffset === 0 ? _.options.slidesToScroll : indexOffset;
                if (_.slideCount > _.options.slidesToShow) {
                    _.slideHandler(_.currentSlide + slideOffset, false, dontAnimate);
                }
                break;

            case 'index':
                var index = event.data.index === 0 ? 0 : event.data.index || $target.index() * _.options.slidesToScroll;

                _.slideHandler(_.checkNavigable(index), false, dontAnimate);
                $target.children().trigger('focus');
                break;

            default:
                return;
        }
    };

    Slick.prototype.checkNavigable = function (index) {

        var _ = this,
            navigables,
            prevNavigable;

        navigables = _.getNavigableIndexes();
        prevNavigable = 0;
        if (index > navigables[navigables.length - 1]) {
            index = navigables[navigables.length - 1];
        } else {
            for (var n in navigables) {
                if (index < navigables[n]) {
                    index = prevNavigable;
                    break;
                }
                prevNavigable = navigables[n];
            }
        }

        return index;
    };

    Slick.prototype.cleanUpEvents = function () {

        var _ = this;

        if (_.options.dots && _.$dots !== null) {

            $('li', _.$dots).off('click.slick', _.changeSlide).off('mouseenter.slick', $.proxy(_.interrupt, _, true)).off('mouseleave.slick', $.proxy(_.interrupt, _, false));

            if (_.options.accessibility === true) {
                _.$dots.off('keydown.slick', _.keyHandler);
            }
        }

        _.$slider.off('focus.slick blur.slick');

        if (_.options.arrows === true && _.slideCount > _.options.slidesToShow) {
            _.$prevArrow && _.$prevArrow.off('click.slick', _.changeSlide);
            _.$nextArrow && _.$nextArrow.off('click.slick', _.changeSlide);

            if (_.options.accessibility === true) {
                _.$prevArrow && _.$prevArrow.off('keydown.slick', _.keyHandler);
                _.$nextArrow && _.$nextArrow.off('keydown.slick', _.keyHandler);
            }
        }

        _.$list.off('touchstart.slick mousedown.slick', _.swipeHandler);
        _.$list.off('touchmove.slick mousemove.slick', _.swipeHandler);
        _.$list.off('touchend.slick mouseup.slick', _.swipeHandler);
        _.$list.off('touchcancel.slick mouseleave.slick', _.swipeHandler);

        _.$list.off('click.slick', _.clickHandler);

        $(document).off(_.visibilityChange, _.visibility);

        _.cleanUpSlideEvents();

        if (_.options.accessibility === true) {
            _.$list.off('keydown.slick', _.keyHandler);
        }

        if (_.options.focusOnSelect === true) {
            $(_.$slideTrack).children().off('click.slick', _.selectHandler);
        }

        $(window).off('orientationchange.slick.slick-' + _.instanceUid, _.orientationChange);

        $(window).off('resize.slick.slick-' + _.instanceUid, _.resize);

        $('[draggable!=true]', _.$slideTrack).off('dragstart', _.preventDefault);

        $(window).off('load.slick.slick-' + _.instanceUid, _.setPosition);
    };

    Slick.prototype.cleanUpSlideEvents = function () {

        var _ = this;

        _.$list.off('mouseenter.slick', $.proxy(_.interrupt, _, true));
        _.$list.off('mouseleave.slick', $.proxy(_.interrupt, _, false));
    };

    Slick.prototype.cleanUpRows = function () {

        var _ = this,
            originalSlides;

        if (_.options.rows > 0) {
            originalSlides = _.$slides.children().children();
            originalSlides.removeAttr('style');
            _.$slider.empty().append(originalSlides);
        }
    };

    Slick.prototype.clickHandler = function (event) {

        var _ = this;

        if (_.shouldClick === false) {
            event.stopImmediatePropagation();
            event.stopPropagation();
            event.preventDefault();
        }
    };

    Slick.prototype.destroy = function (refresh) {

        var _ = this;

        _.autoPlayClear();

        _.touchObject = {};

        _.cleanUpEvents();

        $('.slick-cloned', _.$slider).detach();

        if (_.$dots) {
            _.$dots.remove();
        }

        if (_.$prevArrow && _.$prevArrow.length) {

            _.$prevArrow.removeClass('slick-disabled slick-arrow slick-hidden').removeAttr('aria-hidden aria-disabled tabindex').css('display', '');

            if (_.htmlExpr.test(_.options.prevArrow)) {
                _.$prevArrow.remove();
            }
        }

        if (_.$nextArrow && _.$nextArrow.length) {

            _.$nextArrow.removeClass('slick-disabled slick-arrow slick-hidden').removeAttr('aria-hidden aria-disabled tabindex').css('display', '');

            if (_.htmlExpr.test(_.options.nextArrow)) {
                _.$nextArrow.remove();
            }
        }

        if (_.$slides) {

            _.$slides.removeClass('slick-slide slick-active slick-center slick-visible slick-current').removeAttr('aria-hidden').removeAttr('data-slick-index').each(function () {
                $(this).attr('style', $(this).data('originalStyling'));
            });

            _.$slideTrack.children(this.options.slide).detach();

            _.$slideTrack.detach();

            _.$list.detach();

            _.$slider.append(_.$slides);
        }

        _.cleanUpRows();

        _.$slider.removeClass('slick-slider');
        _.$slider.removeClass('slick-initialized');
        _.$slider.removeClass('slick-dotted');

        _.unslicked = true;

        if (!refresh) {
            _.$slider.trigger('destroy', [_]);
        }
    };

    Slick.prototype.disableTransition = function (slide) {

        var _ = this,
            transition = {};

        transition[_.transitionType] = '';

        if (_.options.fade === false) {
            _.$slideTrack.css(transition);
        } else {
            _.$slides.eq(slide).css(transition);
        }
    };

    Slick.prototype.fadeSlide = function (slideIndex, callback) {

        var _ = this;

        if (_.cssTransitions === false) {

            _.$slides.eq(slideIndex).css({
                zIndex: _.options.zIndex
            });

            _.$slides.eq(slideIndex).animate({
                opacity: 1
            }, _.options.speed, _.options.easing, callback);
        } else {

            _.applyTransition(slideIndex);

            _.$slides.eq(slideIndex).css({
                opacity: 1,
                zIndex: _.options.zIndex
            });

            if (callback) {
                setTimeout(function () {

                    _.disableTransition(slideIndex);

                    callback.call();
                }, _.options.speed);
            }
        }
    };

    Slick.prototype.fadeSlideOut = function (slideIndex) {

        var _ = this;

        if (_.cssTransitions === false) {

            _.$slides.eq(slideIndex).animate({
                opacity: 0,
                zIndex: _.options.zIndex - 2
            }, _.options.speed, _.options.easing);
        } else {

            _.applyTransition(slideIndex);

            _.$slides.eq(slideIndex).css({
                opacity: 0,
                zIndex: _.options.zIndex - 2
            });
        }
    };

    Slick.prototype.filterSlides = Slick.prototype.slickFilter = function (filter) {

        var _ = this;

        if (filter !== null) {

            _.$slidesCache = _.$slides;

            _.unload();

            _.$slideTrack.children(this.options.slide).detach();

            _.$slidesCache.filter(filter).appendTo(_.$slideTrack);

            _.reinit();
        }
    };

    Slick.prototype.focusHandler = function () {

        var _ = this;

        _.$slider.off('focus.slick blur.slick').on('focus.slick blur.slick', '*', function (event) {

            event.stopImmediatePropagation();
            var $sf = $(this);

            setTimeout(function () {

                if (_.options.pauseOnFocus) {
                    _.focussed = $sf.is(':focus');
                    _.autoPlay();
                }
            }, 0);
        });
    };

    Slick.prototype.getCurrent = Slick.prototype.slickCurrentSlide = function () {

        var _ = this;
        return _.currentSlide;
    };

    Slick.prototype.getDotCount = function () {

        var _ = this;

        var breakPoint = 0;
        var counter = 0;
        var pagerQty = 0;

        if (_.options.infinite === true) {
            if (_.slideCount <= _.options.slidesToShow) {
                ++pagerQty;
            } else {
                while (breakPoint < _.slideCount) {
                    ++pagerQty;
                    breakPoint = counter + _.options.slidesToScroll;
                    counter += _.options.slidesToScroll <= _.options.slidesToShow ? _.options.slidesToScroll : _.options.slidesToShow;
                }
            }
        } else if (_.options.centerMode === true) {
            pagerQty = _.slideCount;
        } else if (!_.options.asNavFor) {
            pagerQty = 1 + Math.ceil((_.slideCount - _.options.slidesToShow) / _.options.slidesToScroll);
        } else {
            while (breakPoint < _.slideCount) {
                ++pagerQty;
                breakPoint = counter + _.options.slidesToScroll;
                counter += _.options.slidesToScroll <= _.options.slidesToShow ? _.options.slidesToScroll : _.options.slidesToShow;
            }
        }

        return pagerQty - 1;
    };

    Slick.prototype.getLeft = function (slideIndex) {

        var _ = this,
            targetLeft,
            verticalHeight,
            verticalOffset = 0,
            targetSlide,
            coef;

        _.slideOffset = 0;
        verticalHeight = _.$slides.first().outerHeight(true);

        if (_.options.infinite === true) {
            if (_.slideCount > _.options.slidesToShow) {
                _.slideOffset = _.slideWidth * _.options.slidesToShow * -1;
                coef = -1;

                if (_.options.vertical === true && _.options.centerMode === true) {
                    if (_.options.slidesToShow === 2) {
                        coef = -1.5;
                    } else if (_.options.slidesToShow === 1) {
                        coef = -2;
                    }
                }
                verticalOffset = verticalHeight * _.options.slidesToShow * coef;
            }
            if (_.slideCount % _.options.slidesToScroll !== 0) {
                if (slideIndex + _.options.slidesToScroll > _.slideCount && _.slideCount > _.options.slidesToShow) {
                    if (slideIndex > _.slideCount) {
                        _.slideOffset = (_.options.slidesToShow - (slideIndex - _.slideCount)) * _.slideWidth * -1;
                        verticalOffset = (_.options.slidesToShow - (slideIndex - _.slideCount)) * verticalHeight * -1;
                    } else {
                        _.slideOffset = _.slideCount % _.options.slidesToScroll * _.slideWidth * -1;
                        verticalOffset = _.slideCount % _.options.slidesToScroll * verticalHeight * -1;
                    }
                }
            }
        } else {
            if (slideIndex + _.options.slidesToShow > _.slideCount) {
                _.slideOffset = (slideIndex + _.options.slidesToShow - _.slideCount) * _.slideWidth;
                verticalOffset = (slideIndex + _.options.slidesToShow - _.slideCount) * verticalHeight;
            }
        }

        if (_.slideCount <= _.options.slidesToShow) {
            _.slideOffset = 0;
            verticalOffset = 0;
        }

        if (_.options.centerMode === true && _.slideCount <= _.options.slidesToShow) {
            _.slideOffset = _.slideWidth * Math.floor(_.options.slidesToShow) / 2 - _.slideWidth * _.slideCount / 2;
        } else if (_.options.centerMode === true && _.options.infinite === true) {
            _.slideOffset += _.slideWidth * Math.floor(_.options.slidesToShow / 2) - _.slideWidth;
        } else if (_.options.centerMode === true) {
            _.slideOffset = 0;
            _.slideOffset += _.slideWidth * Math.floor(_.options.slidesToShow / 2);
        }

        if (_.options.vertical === false) {
            targetLeft = slideIndex * _.slideWidth * -1 + _.slideOffset;
        } else {
            targetLeft = slideIndex * verticalHeight * -1 + verticalOffset;
        }

        if (_.options.variableWidth === true) {

            if (_.slideCount <= _.options.slidesToShow || _.options.infinite === false) {
                targetSlide = _.$slideTrack.children('.slick-slide').eq(slideIndex);
            } else {
                targetSlide = _.$slideTrack.children('.slick-slide').eq(slideIndex + _.options.slidesToShow);
            }

            if (_.options.rtl === true) {
                if (targetSlide[0]) {
                    targetLeft = (_.$slideTrack.width() - targetSlide[0].offsetLeft - targetSlide.width()) * -1;
                } else {
                    targetLeft = 0;
                }
            } else {
                targetLeft = targetSlide[0] ? targetSlide[0].offsetLeft * -1 : 0;
            }

            if (_.options.centerMode === true) {
                if (_.slideCount <= _.options.slidesToShow || _.options.infinite === false) {
                    targetSlide = _.$slideTrack.children('.slick-slide').eq(slideIndex);
                } else {
                    targetSlide = _.$slideTrack.children('.slick-slide').eq(slideIndex + _.options.slidesToShow + 1);
                }

                if (_.options.rtl === true) {
                    if (targetSlide[0]) {
                        targetLeft = (_.$slideTrack.width() - targetSlide[0].offsetLeft - targetSlide.width()) * -1;
                    } else {
                        targetLeft = 0;
                    }
                } else {
                    targetLeft = targetSlide[0] ? targetSlide[0].offsetLeft * -1 : 0;
                }

                targetLeft += (_.$list.width() - targetSlide.outerWidth()) / 2;
            }
        }

        return targetLeft;
    };

    Slick.prototype.getOption = Slick.prototype.slickGetOption = function (option) {

        var _ = this;

        return _.options[option];
    };

    Slick.prototype.getNavigableIndexes = function () {

        var _ = this,
            breakPoint = 0,
            counter = 0,
            indexes = [],
            max;

        if (_.options.infinite === false) {
            max = _.slideCount;
        } else {
            breakPoint = _.options.slidesToScroll * -1;
            counter = _.options.slidesToScroll * -1;
            max = _.slideCount * 2;
        }

        while (breakPoint < max) {
            indexes.push(breakPoint);
            breakPoint = counter + _.options.slidesToScroll;
            counter += _.options.slidesToScroll <= _.options.slidesToShow ? _.options.slidesToScroll : _.options.slidesToShow;
        }

        return indexes;
    };

    Slick.prototype.getSlick = function () {

        return this;
    };

    Slick.prototype.getSlideCount = function () {

        var _ = this,
            slidesTraversed,
            swipedSlide,
            centerOffset;

        centerOffset = _.options.centerMode === true ? _.slideWidth * Math.floor(_.options.slidesToShow / 2) : 0;

        if (_.options.swipeToSlide === true) {
            _.$slideTrack.find('.slick-slide').each(function (index, slide) {
                if (slide.offsetLeft - centerOffset + $(slide).outerWidth() / 2 > _.swipeLeft * -1) {
                    swipedSlide = slide;
                    return false;
                }
            });

            slidesTraversed = Math.abs($(swipedSlide).attr('data-slick-index') - _.currentSlide) || 1;

            return slidesTraversed;
        } else {
            return _.options.slidesToScroll;
        }
    };

    Slick.prototype.goTo = Slick.prototype.slickGoTo = function (slide, dontAnimate) {

        var _ = this;

        _.changeSlide({
            data: {
                message: 'index',
                index: parseInt(slide)
            }
        }, dontAnimate);
    };

    Slick.prototype.init = function (creation) {

        var _ = this;

        if (!$(_.$slider).hasClass('slick-initialized')) {

            $(_.$slider).addClass('slick-initialized');

            _.buildRows();
            _.buildOut();
            _.setProps();
            _.startLoad();
            _.loadSlider();
            _.initializeEvents();
            _.updateArrows();
            _.updateDots();
            _.checkResponsive(true);
            _.focusHandler();
        }

        if (creation) {
            _.$slider.trigger('init', [_]);
        }

        if (_.options.accessibility === true) {
            _.initADA();
        }

        if (_.options.autoplay) {

            _.paused = false;
            _.autoPlay();
        }
    };

    Slick.prototype.initADA = function () {
        var _ = this,
            numDotGroups = Math.ceil(_.slideCount / _.options.slidesToShow),
            tabControlIndexes = _.getNavigableIndexes().filter(function (val) {
            return val >= 0 && val < _.slideCount;
        });

        _.$slides.add(_.$slideTrack.find('.slick-cloned')).attr({
            'aria-hidden': 'true',
            'tabindex': '-1'
        }).find('a, input, button, select').attr({
            'tabindex': '-1'
        });

        if (_.$dots !== null) {
            _.$slides.not(_.$slideTrack.find('.slick-cloned')).each(function (i) {
                var slideControlIndex = tabControlIndexes.indexOf(i);

                $(this).attr({
                    'role': 'tabpanel',
                    'id': 'slick-slide' + _.instanceUid + i,
                    'tabindex': -1
                });

                if (slideControlIndex !== -1) {
                    var ariaButtonControl = 'slick-slide-control' + _.instanceUid + slideControlIndex;
                    if ($('#' + ariaButtonControl).length) {
                        $(this).attr({
                            'aria-describedby': ariaButtonControl
                        });
                    }
                }
            });

            _.$dots.attr('role', 'tablist').find('li').each(function (i) {
                var mappedSlideIndex = tabControlIndexes[i];

                $(this).attr({
                    'role': 'presentation'
                });

                $(this).find('button').first().attr({
                    'role': 'tab',
                    'id': 'slick-slide-control' + _.instanceUid + i,
                    'aria-controls': 'slick-slide' + _.instanceUid + mappedSlideIndex,
                    'aria-label': i + 1 + ' of ' + numDotGroups,
                    'aria-selected': null,
                    'tabindex': '-1'
                });
            }).eq(_.currentSlide).find('button').attr({
                'aria-selected': 'true',
                'tabindex': '0'
            }).end();
        }

        for (var i = _.currentSlide, max = i + _.options.slidesToShow; i < max; i++) {
            if (_.options.focusOnChange) {
                _.$slides.eq(i).attr({ 'tabindex': '0' });
            } else {
                _.$slides.eq(i).removeAttr('tabindex');
            }
        }

        _.activateADA();
    };

    Slick.prototype.initArrowEvents = function () {

        var _ = this;

        if (_.options.arrows === true && _.slideCount > _.options.slidesToShow) {
            _.$prevArrow.off('click.slick').on('click.slick', {
                message: 'previous'
            }, _.changeSlide);
            _.$nextArrow.off('click.slick').on('click.slick', {
                message: 'next'
            }, _.changeSlide);

            if (_.options.accessibility === true) {
                _.$prevArrow.on('keydown.slick', _.keyHandler);
                _.$nextArrow.on('keydown.slick', _.keyHandler);
            }
        }
    };

    Slick.prototype.initDotEvents = function () {

        var _ = this;

        if (_.options.dots === true && _.slideCount > _.options.slidesToShow) {
            $('li', _.$dots).on('click.slick', {
                message: 'index'
            }, _.changeSlide);

            if (_.options.accessibility === true) {
                _.$dots.on('keydown.slick', _.keyHandler);
            }
        }

        if (_.options.dots === true && _.options.pauseOnDotsHover === true && _.slideCount > _.options.slidesToShow) {

            $('li', _.$dots).on('mouseenter.slick', $.proxy(_.interrupt, _, true)).on('mouseleave.slick', $.proxy(_.interrupt, _, false));
        }
    };

    Slick.prototype.initSlideEvents = function () {

        var _ = this;

        if (_.options.pauseOnHover) {

            _.$list.on('mouseenter.slick', $.proxy(_.interrupt, _, true));
            _.$list.on('mouseleave.slick', $.proxy(_.interrupt, _, false));
        }
    };

    Slick.prototype.initializeEvents = function () {

        var _ = this;

        _.initArrowEvents();

        _.initDotEvents();
        _.initSlideEvents();

        _.$list.on('touchstart.slick mousedown.slick', {
            action: 'start'
        }, _.swipeHandler);
        _.$list.on('touchmove.slick mousemove.slick', {
            action: 'move'
        }, _.swipeHandler);
        _.$list.on('touchend.slick mouseup.slick', {
            action: 'end'
        }, _.swipeHandler);
        _.$list.on('touchcancel.slick mouseleave.slick', {
            action: 'end'
        }, _.swipeHandler);

        _.$list.on('click.slick', _.clickHandler);

        $(document).on(_.visibilityChange, $.proxy(_.visibility, _));

        if (_.options.accessibility === true) {
            _.$list.on('keydown.slick', _.keyHandler);
        }

        if (_.options.focusOnSelect === true) {
            $(_.$slideTrack).children().on('click.slick', _.selectHandler);
        }

        $(window).on('orientationchange.slick.slick-' + _.instanceUid, $.proxy(_.orientationChange, _));

        $(window).on('resize.slick.slick-' + _.instanceUid, $.proxy(_.resize, _));

        $('[draggable!=true]', _.$slideTrack).on('dragstart', _.preventDefault);

        $(window).on('load.slick.slick-' + _.instanceUid, _.setPosition);
        $(_.setPosition);
    };

    Slick.prototype.initUI = function () {

        var _ = this;

        if (_.options.arrows === true && _.slideCount > _.options.slidesToShow) {

            _.$prevArrow.show();
            _.$nextArrow.show();
        }

        if (_.options.dots === true && _.slideCount > _.options.slidesToShow) {

            _.$dots.show();
        }
    };

    Slick.prototype.keyHandler = function (event) {

        var _ = this;
        //Dont slide if the cursor is inside the form fields and arrow keys are pressed
        if (!event.target.tagName.match('TEXTAREA|INPUT|SELECT')) {
            if (event.keyCode === 37 && _.options.accessibility === true) {
                _.changeSlide({
                    data: {
                        message: _.options.rtl === true ? 'next' : 'previous'
                    }
                });
            } else if (event.keyCode === 39 && _.options.accessibility === true) {
                _.changeSlide({
                    data: {
                        message: _.options.rtl === true ? 'previous' : 'next'
                    }
                });
            }
        }
    };

    Slick.prototype.lazyLoad = function () {

        var _ = this,
            loadRange,
            cloneRange,
            rangeStart,
            rangeEnd;

        function loadImages(imagesScope) {

            $('img[data-lazy]', imagesScope).each(function () {

                var image = $(this),
                    imageSource = $(this).attr('data-lazy'),
                    imageSrcSet = $(this).attr('data-srcset'),
                    imageSizes = $(this).attr('data-sizes') || _.$slider.attr('data-sizes'),
                    imageToLoad = document.createElement('img');

                imageToLoad.onload = function () {

                    image.animate({ opacity: 0 }, 100, function () {

                        if (imageSrcSet) {
                            image.attr('srcset', imageSrcSet);

                            if (imageSizes) {
                                image.attr('sizes', imageSizes);
                            }
                        }

                        image.attr('src', imageSource).animate({ opacity: 1 }, 200, function () {
                            image.removeAttr('data-lazy data-srcset data-sizes').removeClass('slick-loading');
                        });
                        _.$slider.trigger('lazyLoaded', [_, image, imageSource]);
                    });
                };

                imageToLoad.onerror = function () {

                    image.removeAttr('data-lazy').removeClass('slick-loading').addClass('slick-lazyload-error');

                    _.$slider.trigger('lazyLoadError', [_, image, imageSource]);
                };

                imageToLoad.src = imageSource;
            });
        }

        if (_.options.centerMode === true) {
            if (_.options.infinite === true) {
                rangeStart = _.currentSlide + (_.options.slidesToShow / 2 + 1);
                rangeEnd = rangeStart + _.options.slidesToShow + 2;
            } else {
                rangeStart = Math.max(0, _.currentSlide - (_.options.slidesToShow / 2 + 1));
                rangeEnd = 2 + (_.options.slidesToShow / 2 + 1) + _.currentSlide;
            }
        } else {
            rangeStart = _.options.infinite ? _.options.slidesToShow + _.currentSlide : _.currentSlide;
            rangeEnd = Math.ceil(rangeStart + _.options.slidesToShow);
            if (_.options.fade === true) {
                if (rangeStart > 0) rangeStart--;
                if (rangeEnd <= _.slideCount) rangeEnd++;
            }
        }

        loadRange = _.$slider.find('.slick-slide').slice(rangeStart, rangeEnd);

        if (_.options.lazyLoad === 'anticipated') {
            var prevSlide = rangeStart - 1,
                nextSlide = rangeEnd,
                $slides = _.$slider.find('.slick-slide');

            for (var i = 0; i < _.options.slidesToScroll; i++) {
                if (prevSlide < 0) prevSlide = _.slideCount - 1;
                loadRange = loadRange.add($slides.eq(prevSlide));
                loadRange = loadRange.add($slides.eq(nextSlide));
                prevSlide--;
                nextSlide++;
            }
        }

        loadImages(loadRange);

        if (_.slideCount <= _.options.slidesToShow) {
            cloneRange = _.$slider.find('.slick-slide');
            loadImages(cloneRange);
        } else if (_.currentSlide >= _.slideCount - _.options.slidesToShow) {
            cloneRange = _.$slider.find('.slick-cloned').slice(0, _.options.slidesToShow);
            loadImages(cloneRange);
        } else if (_.currentSlide === 0) {
            cloneRange = _.$slider.find('.slick-cloned').slice(_.options.slidesToShow * -1);
            loadImages(cloneRange);
        }
    };

    Slick.prototype.loadSlider = function () {

        var _ = this;

        _.setPosition();

        _.$slideTrack.css({
            opacity: 1
        });

        _.$slider.removeClass('slick-loading');

        _.initUI();

        if (_.options.lazyLoad === 'progressive') {
            _.progressiveLazyLoad();
        }
    };

    Slick.prototype.next = Slick.prototype.slickNext = function () {

        var _ = this;

        _.changeSlide({
            data: {
                message: 'next'
            }
        });
    };

    Slick.prototype.orientationChange = function () {

        var _ = this;

        _.checkResponsive();
        _.setPosition();
    };

    Slick.prototype.pause = Slick.prototype.slickPause = function () {

        var _ = this;

        _.autoPlayClear();
        _.paused = true;
    };

    Slick.prototype.play = Slick.prototype.slickPlay = function () {

        var _ = this;

        _.autoPlay();
        _.options.autoplay = true;
        _.paused = false;
        _.focussed = false;
        _.interrupted = false;
    };

    Slick.prototype.postSlide = function (index) {

        var _ = this;

        if (!_.unslicked) {

            _.$slider.trigger('afterChange', [_, index]);

            _.animating = false;

            if (_.slideCount > _.options.slidesToShow) {
                _.setPosition();
            }

            _.swipeLeft = null;

            if (_.options.autoplay) {
                _.autoPlay();
            }

            if (_.options.accessibility === true) {
                _.initADA();

                if (_.options.focusOnChange) {
                    var $currentSlide = $(_.$slides.get(_.currentSlide));
                    $currentSlide.attr('tabindex', 0).focus();
                }
            }
        }
    };

    Slick.prototype.prev = Slick.prototype.slickPrev = function () {

        var _ = this;

        _.changeSlide({
            data: {
                message: 'previous'
            }
        });
    };

    Slick.prototype.preventDefault = function (event) {

        event.preventDefault();
    };

    Slick.prototype.progressiveLazyLoad = function (tryCount) {

        tryCount = tryCount || 1;

        var _ = this,
            $imgsToLoad = $('img[data-lazy]', _.$slider),
            image,
            imageSource,
            imageSrcSet,
            imageSizes,
            imageToLoad;

        if ($imgsToLoad.length) {

            image = $imgsToLoad.first();
            imageSource = image.attr('data-lazy');
            imageSrcSet = image.attr('data-srcset');
            imageSizes = image.attr('data-sizes') || _.$slider.attr('data-sizes');
            imageToLoad = document.createElement('img');

            imageToLoad.onload = function () {

                if (imageSrcSet) {
                    image.attr('srcset', imageSrcSet);

                    if (imageSizes) {
                        image.attr('sizes', imageSizes);
                    }
                }

                image.attr('src', imageSource).removeAttr('data-lazy data-srcset data-sizes').removeClass('slick-loading');

                if (_.options.adaptiveHeight === true) {
                    _.setPosition();
                }

                _.$slider.trigger('lazyLoaded', [_, image, imageSource]);
                _.progressiveLazyLoad();
            };

            imageToLoad.onerror = function () {

                if (tryCount < 3) {

                    /**
                     * try to load the image 3 times,
                     * leave a slight delay so we don't get
                     * servers blocking the request.
                     */
                    setTimeout(function () {
                        _.progressiveLazyLoad(tryCount + 1);
                    }, 500);
                } else {

                    image.removeAttr('data-lazy').removeClass('slick-loading').addClass('slick-lazyload-error');

                    _.$slider.trigger('lazyLoadError', [_, image, imageSource]);

                    _.progressiveLazyLoad();
                }
            };

            imageToLoad.src = imageSource;
        } else {

            _.$slider.trigger('allImagesLoaded', [_]);
        }
    };

    Slick.prototype.refresh = function (initializing) {

        var _ = this,
            currentSlide,
            lastVisibleIndex;

        lastVisibleIndex = _.slideCount - _.options.slidesToShow;

        // in non-infinite sliders, we don't want to go past the
        // last visible index.
        if (!_.options.infinite && _.currentSlide > lastVisibleIndex) {
            _.currentSlide = lastVisibleIndex;
        }

        // if less slides than to show, go to start.
        if (_.slideCount <= _.options.slidesToShow) {
            _.currentSlide = 0;
        }

        currentSlide = _.currentSlide;

        _.destroy(true);

        $.extend(_, _.initials, { currentSlide: currentSlide });

        _.init();

        if (!initializing) {

            _.changeSlide({
                data: {
                    message: 'index',
                    index: currentSlide
                }
            }, false);
        }
    };

    Slick.prototype.registerBreakpoints = function () {

        var _ = this,
            breakpoint,
            currentBreakpoint,
            l,
            responsiveSettings = _.options.responsive || null;

        if ($.type(responsiveSettings) === 'array' && responsiveSettings.length) {

            _.respondTo = _.options.respondTo || 'window';

            for (breakpoint in responsiveSettings) {

                l = _.breakpoints.length - 1;

                if (responsiveSettings.hasOwnProperty(breakpoint)) {
                    currentBreakpoint = responsiveSettings[breakpoint].breakpoint;

                    // loop through the breakpoints and cut out any existing
                    // ones with the same breakpoint number, we don't want dupes.
                    while (l >= 0) {
                        if (_.breakpoints[l] && _.breakpoints[l] === currentBreakpoint) {
                            _.breakpoints.splice(l, 1);
                        }
                        l--;
                    }

                    _.breakpoints.push(currentBreakpoint);
                    _.breakpointSettings[currentBreakpoint] = responsiveSettings[breakpoint].settings;
                }
            }

            _.breakpoints.sort(function (a, b) {
                return _.options.mobileFirst ? a - b : b - a;
            });
        }
    };

    Slick.prototype.reinit = function () {

        var _ = this;

        _.$slides = _.$slideTrack.children(_.options.slide).addClass('slick-slide');

        _.slideCount = _.$slides.length;

        if (_.currentSlide >= _.slideCount && _.currentSlide !== 0) {
            _.currentSlide = _.currentSlide - _.options.slidesToScroll;
        }

        if (_.slideCount <= _.options.slidesToShow) {
            _.currentSlide = 0;
        }

        _.registerBreakpoints();

        _.setProps();
        _.setupInfinite();
        _.buildArrows();
        _.updateArrows();
        _.initArrowEvents();
        _.buildDots();
        _.updateDots();
        _.initDotEvents();
        _.cleanUpSlideEvents();
        _.initSlideEvents();

        _.checkResponsive(false, true);

        if (_.options.focusOnSelect === true) {
            $(_.$slideTrack).children().on('click.slick', _.selectHandler);
        }

        _.setSlideClasses(typeof _.currentSlide === 'number' ? _.currentSlide : 0);

        _.setPosition();
        _.focusHandler();

        _.paused = !_.options.autoplay;
        _.autoPlay();

        _.$slider.trigger('reInit', [_]);
    };

    Slick.prototype.resize = function () {

        var _ = this;

        if ($(window).width() !== _.windowWidth) {
            clearTimeout(_.windowDelay);
            _.windowDelay = window.setTimeout(function () {
                _.windowWidth = $(window).width();
                _.checkResponsive();
                if (!_.unslicked) {
                    _.setPosition();
                }
            }, 50);
        }
    };

    Slick.prototype.removeSlide = Slick.prototype.slickRemove = function (index, removeBefore, removeAll) {

        var _ = this;

        if (typeof index === 'boolean') {
            removeBefore = index;
            index = removeBefore === true ? 0 : _.slideCount - 1;
        } else {
            index = removeBefore === true ? --index : index;
        }

        if (_.slideCount < 1 || index < 0 || index > _.slideCount - 1) {
            return false;
        }

        _.unload();

        if (removeAll === true) {
            _.$slideTrack.children().remove();
        } else {
            _.$slideTrack.children(this.options.slide).eq(index).remove();
        }

        _.$slides = _.$slideTrack.children(this.options.slide);

        _.$slideTrack.children(this.options.slide).detach();

        _.$slideTrack.append(_.$slides);

        _.$slidesCache = _.$slides;

        _.reinit();
    };

    Slick.prototype.setCSS = function (position) {

        var _ = this,
            positionProps = {},
            x,
            y;

        if (_.options.rtl === true) {
            position = -position;
        }
        x = _.positionProp == 'left' ? Math.ceil(position) + 'px' : '0px';
        y = _.positionProp == 'top' ? Math.ceil(position) + 'px' : '0px';

        positionProps[_.positionProp] = position;

        if (_.transformsEnabled === false) {
            _.$slideTrack.css(positionProps);
        } else {
            positionProps = {};
            if (_.cssTransitions === false) {
                positionProps[_.animType] = 'translate(' + x + ', ' + y + ')';
                _.$slideTrack.css(positionProps);
            } else {
                positionProps[_.animType] = 'translate3d(' + x + ', ' + y + ', 0px)';
                _.$slideTrack.css(positionProps);
            }
        }
    };

    Slick.prototype.setDimensions = function () {

        var _ = this;

        if (_.options.vertical === false) {
            if (_.options.centerMode === true) {
                _.$list.css({
                    padding: '0px ' + _.options.centerPadding
                });
            }
        } else {
            _.$list.height(_.$slides.first().outerHeight(true) * _.options.slidesToShow);
            if (_.options.centerMode === true) {
                _.$list.css({
                    padding: _.options.centerPadding + ' 0px'
                });
            }
        }

        _.listWidth = _.$list.width();
        _.listHeight = _.$list.height();

        if (_.options.vertical === false && _.options.variableWidth === false) {
            _.slideWidth = Math.ceil(_.listWidth / _.options.slidesToShow);
            _.$slideTrack.width(Math.ceil(_.slideWidth * _.$slideTrack.children('.slick-slide').length));
        } else if (_.options.variableWidth === true) {
            _.$slideTrack.width(5000 * _.slideCount);
        } else {
            _.slideWidth = Math.ceil(_.listWidth);
            _.$slideTrack.height(Math.ceil(_.$slides.first().outerHeight(true) * _.$slideTrack.children('.slick-slide').length));
        }

        var offset = _.$slides.first().outerWidth(true) - _.$slides.first().width();
        if (_.options.variableWidth === false) _.$slideTrack.children('.slick-slide').width(_.slideWidth - offset);
    };

    Slick.prototype.setFade = function () {

        var _ = this,
            targetLeft;

        _.$slides.each(function (index, element) {
            targetLeft = _.slideWidth * index * -1;
            if (_.options.rtl === true) {
                $(element).css({
                    position: 'relative',
                    right: targetLeft,
                    top: 0,
                    zIndex: _.options.zIndex - 2,
                    opacity: 0
                });
            } else {
                $(element).css({
                    position: 'relative',
                    left: targetLeft,
                    top: 0,
                    zIndex: _.options.zIndex - 2,
                    opacity: 0
                });
            }
        });

        _.$slides.eq(_.currentSlide).css({
            zIndex: _.options.zIndex - 1,
            opacity: 1
        });
    };

    Slick.prototype.setHeight = function () {

        var _ = this;

        if (_.options.slidesToShow === 1 && _.options.adaptiveHeight === true && _.options.vertical === false) {
            var targetHeight = _.$slides.eq(_.currentSlide).outerHeight(true);
            _.$list.css('height', targetHeight);
        }
    };

    Slick.prototype.setOption = Slick.prototype.slickSetOption = function () {

        /**
         * accepts arguments in format of:
         *
         *  - for changing a single option's value:
         *     .slick("setOption", option, value, refresh )
         *
         *  - for changing a set of responsive options:
         *     .slick("setOption", 'responsive', [{}, ...], refresh )
         *
         *  - for updating multiple values at once (not responsive)
         *     .slick("setOption", { 'option': value, ... }, refresh )
         */

        var _ = this,
            l,
            item,
            option,
            value,
            refresh = false,
            type;

        if ($.type(arguments[0]) === 'object') {

            option = arguments[0];
            refresh = arguments[1];
            type = 'multiple';
        } else if ($.type(arguments[0]) === 'string') {

            option = arguments[0];
            value = arguments[1];
            refresh = arguments[2];

            if (arguments[0] === 'responsive' && $.type(arguments[1]) === 'array') {

                type = 'responsive';
            } else if (typeof arguments[1] !== 'undefined') {

                type = 'single';
            }
        }

        if (type === 'single') {

            _.options[option] = value;
        } else if (type === 'multiple') {

            $.each(option, function (opt, val) {

                _.options[opt] = val;
            });
        } else if (type === 'responsive') {

            for (item in value) {

                if ($.type(_.options.responsive) !== 'array') {

                    _.options.responsive = [value[item]];
                } else {

                    l = _.options.responsive.length - 1;

                    // loop through the responsive object and splice out duplicates.
                    while (l >= 0) {

                        if (_.options.responsive[l].breakpoint === value[item].breakpoint) {

                            _.options.responsive.splice(l, 1);
                        }

                        l--;
                    }

                    _.options.responsive.push(value[item]);
                }
            }
        }

        if (refresh) {

            _.unload();
            _.reinit();
        }
    };

    Slick.prototype.setPosition = function () {

        var _ = this;

        _.setDimensions();

        _.setHeight();

        if (_.options.fade === false) {
            _.setCSS(_.getLeft(_.currentSlide));
        } else {
            _.setFade();
        }

        _.$slider.trigger('setPosition', [_]);
    };

    Slick.prototype.setProps = function () {

        var _ = this,
            bodyStyle = document.body.style;

        _.positionProp = _.options.vertical === true ? 'top' : 'left';

        if (_.positionProp === 'top') {
            _.$slider.addClass('slick-vertical');
        } else {
            _.$slider.removeClass('slick-vertical');
        }

        if (bodyStyle.WebkitTransition !== undefined || bodyStyle.MozTransition !== undefined || bodyStyle.msTransition !== undefined) {
            if (_.options.useCSS === true) {
                _.cssTransitions = true;
            }
        }

        if (_.options.fade) {
            if (typeof _.options.zIndex === 'number') {
                if (_.options.zIndex < 3) {
                    _.options.zIndex = 3;
                }
            } else {
                _.options.zIndex = _.defaults.zIndex;
            }
        }

        if (bodyStyle.OTransform !== undefined) {
            _.animType = 'OTransform';
            _.transformType = '-o-transform';
            _.transitionType = 'OTransition';
            if (bodyStyle.perspectiveProperty === undefined && bodyStyle.webkitPerspective === undefined) _.animType = false;
        }
        if (bodyStyle.MozTransform !== undefined) {
            _.animType = 'MozTransform';
            _.transformType = '-moz-transform';
            _.transitionType = 'MozTransition';
            if (bodyStyle.perspectiveProperty === undefined && bodyStyle.MozPerspective === undefined) _.animType = false;
        }
        if (bodyStyle.webkitTransform !== undefined) {
            _.animType = 'webkitTransform';
            _.transformType = '-webkit-transform';
            _.transitionType = 'webkitTransition';
            if (bodyStyle.perspectiveProperty === undefined && bodyStyle.webkitPerspective === undefined) _.animType = false;
        }
        if (bodyStyle.msTransform !== undefined) {
            _.animType = 'msTransform';
            _.transformType = '-ms-transform';
            _.transitionType = 'msTransition';
            if (bodyStyle.msTransform === undefined) _.animType = false;
        }
        if (bodyStyle.transform !== undefined && _.animType !== false) {
            _.animType = 'transform';
            _.transformType = 'transform';
            _.transitionType = 'transition';
        }
        _.transformsEnabled = _.options.useTransform && _.animType !== null && _.animType !== false;
    };

    Slick.prototype.setSlideClasses = function (index) {

        var _ = this,
            centerOffset,
            allSlides,
            indexOffset,
            remainder;

        allSlides = _.$slider.find('.slick-slide').removeClass('slick-active slick-center slick-current').attr('aria-hidden', 'true');

        _.$slides.eq(index).addClass('slick-current');

        if (_.options.centerMode === true) {

            var evenCoef = _.options.slidesToShow % 2 === 0 ? 1 : 0;

            centerOffset = Math.floor(_.options.slidesToShow / 2);

            if (_.options.infinite === true) {

                if (index >= centerOffset && index <= _.slideCount - 1 - centerOffset) {
                    _.$slides.slice(index - centerOffset + evenCoef, index + centerOffset + 1).addClass('slick-active').attr('aria-hidden', 'false');
                } else {

                    indexOffset = _.options.slidesToShow + index;
                    allSlides.slice(indexOffset - centerOffset + 1 + evenCoef, indexOffset + centerOffset + 2).addClass('slick-active').attr('aria-hidden', 'false');
                }

                if (index === 0) {

                    allSlides.eq(allSlides.length - 1 - _.options.slidesToShow).addClass('slick-center');
                } else if (index === _.slideCount - 1) {

                    allSlides.eq(_.options.slidesToShow).addClass('slick-center');
                }
            }

            _.$slides.eq(index).addClass('slick-center');
        } else {

            if (index >= 0 && index <= _.slideCount - _.options.slidesToShow) {

                _.$slides.slice(index, index + _.options.slidesToShow).addClass('slick-active').attr('aria-hidden', 'false');
            } else if (allSlides.length <= _.options.slidesToShow) {

                allSlides.addClass('slick-active').attr('aria-hidden', 'false');
            } else {

                remainder = _.slideCount % _.options.slidesToShow;
                indexOffset = _.options.infinite === true ? _.options.slidesToShow + index : index;

                if (_.options.slidesToShow == _.options.slidesToScroll && _.slideCount - index < _.options.slidesToShow) {

                    allSlides.slice(indexOffset - (_.options.slidesToShow - remainder), indexOffset + remainder).addClass('slick-active').attr('aria-hidden', 'false');
                } else {

                    allSlides.slice(indexOffset, indexOffset + _.options.slidesToShow).addClass('slick-active').attr('aria-hidden', 'false');
                }
            }
        }

        if (_.options.lazyLoad === 'ondemand' || _.options.lazyLoad === 'anticipated') {
            _.lazyLoad();
        }
    };

    Slick.prototype.setupInfinite = function () {

        var _ = this,
            i,
            slideIndex,
            infiniteCount;

        if (_.options.fade === true) {
            _.options.centerMode = false;
        }

        if (_.options.infinite === true && _.options.fade === false) {

            slideIndex = null;

            if (_.slideCount > _.options.slidesToShow) {

                if (_.options.centerMode === true) {
                    infiniteCount = _.options.slidesToShow + 1;
                } else {
                    infiniteCount = _.options.slidesToShow;
                }

                for (i = _.slideCount; i > _.slideCount - infiniteCount; i -= 1) {
                    slideIndex = i - 1;
                    $(_.$slides[slideIndex]).clone(true).attr('id', '').attr('data-slick-index', slideIndex - _.slideCount).prependTo(_.$slideTrack).addClass('slick-cloned');
                }
                for (i = 0; i < infiniteCount + _.slideCount; i += 1) {
                    slideIndex = i;
                    $(_.$slides[slideIndex]).clone(true).attr('id', '').attr('data-slick-index', slideIndex + _.slideCount).appendTo(_.$slideTrack).addClass('slick-cloned');
                }
                _.$slideTrack.find('.slick-cloned').find('[id]').each(function () {
                    $(this).attr('id', '');
                });
            }
        }
    };

    Slick.prototype.interrupt = function (toggle) {

        var _ = this;

        if (!toggle) {
            _.autoPlay();
        }
        _.interrupted = toggle;
    };

    Slick.prototype.selectHandler = function (event) {

        var _ = this;

        var targetElement = $(event.target).is('.slick-slide') ? $(event.target) : $(event.target).parents('.slick-slide');

        var index = parseInt(targetElement.attr('data-slick-index'));

        if (!index) index = 0;

        if (_.slideCount <= _.options.slidesToShow) {

            _.slideHandler(index, false, true);
            return;
        }

        _.slideHandler(index);
    };

    Slick.prototype.slideHandler = function (index, sync, dontAnimate) {

        var targetSlide,
            animSlide,
            oldSlide,
            slideLeft,
            targetLeft = null,
            _ = this,
            navTarget;

        sync = sync || false;

        if (_.animating === true && _.options.waitForAnimate === true) {
            return;
        }

        if (_.options.fade === true && _.currentSlide === index) {
            return;
        }

        if (sync === false) {
            _.asNavFor(index);
        }

        targetSlide = index;
        targetLeft = _.getLeft(targetSlide);
        slideLeft = _.getLeft(_.currentSlide);

        _.currentLeft = _.swipeLeft === null ? slideLeft : _.swipeLeft;

        if (_.options.infinite === false && _.options.centerMode === false && (index < 0 || index > _.getDotCount() * _.options.slidesToScroll)) {
            if (_.options.fade === false) {
                targetSlide = _.currentSlide;
                if (dontAnimate !== true && _.slideCount > _.options.slidesToShow) {
                    _.animateSlide(slideLeft, function () {
                        _.postSlide(targetSlide);
                    });
                } else {
                    _.postSlide(targetSlide);
                }
            }
            return;
        } else if (_.options.infinite === false && _.options.centerMode === true && (index < 0 || index > _.slideCount - _.options.slidesToScroll)) {
            if (_.options.fade === false) {
                targetSlide = _.currentSlide;
                if (dontAnimate !== true && _.slideCount > _.options.slidesToShow) {
                    _.animateSlide(slideLeft, function () {
                        _.postSlide(targetSlide);
                    });
                } else {
                    _.postSlide(targetSlide);
                }
            }
            return;
        }

        if (_.options.autoplay) {
            clearInterval(_.autoPlayTimer);
        }

        if (targetSlide < 0) {
            if (_.slideCount % _.options.slidesToScroll !== 0) {
                animSlide = _.slideCount - _.slideCount % _.options.slidesToScroll;
            } else {
                animSlide = _.slideCount + targetSlide;
            }
        } else if (targetSlide >= _.slideCount) {
            if (_.slideCount % _.options.slidesToScroll !== 0) {
                animSlide = 0;
            } else {
                animSlide = targetSlide - _.slideCount;
            }
        } else {
            animSlide = targetSlide;
        }

        _.animating = true;

        _.$slider.trigger('beforeChange', [_, _.currentSlide, animSlide]);

        oldSlide = _.currentSlide;
        _.currentSlide = animSlide;

        _.setSlideClasses(_.currentSlide);

        if (_.options.asNavFor) {

            navTarget = _.getNavTarget();
            navTarget = navTarget.slick('getSlick');

            if (navTarget.slideCount <= navTarget.options.slidesToShow) {
                navTarget.setSlideClasses(_.currentSlide);
            }
        }

        _.updateDots();
        _.updateArrows();

        if (_.options.fade === true) {
            if (dontAnimate !== true) {

                _.fadeSlideOut(oldSlide);

                _.fadeSlide(animSlide, function () {
                    _.postSlide(animSlide);
                });
            } else {
                _.postSlide(animSlide);
            }
            _.animateHeight();
            return;
        }

        if (dontAnimate !== true && _.slideCount > _.options.slidesToShow) {
            _.animateSlide(targetLeft, function () {
                _.postSlide(animSlide);
            });
        } else {
            _.postSlide(animSlide);
        }
    };

    Slick.prototype.startLoad = function () {

        var _ = this;

        if (_.options.arrows === true && _.slideCount > _.options.slidesToShow) {

            _.$prevArrow.hide();
            _.$nextArrow.hide();
        }

        if (_.options.dots === true && _.slideCount > _.options.slidesToShow) {

            _.$dots.hide();
        }

        _.$slider.addClass('slick-loading');
    };

    Slick.prototype.swipeDirection = function () {

        var xDist,
            yDist,
            r,
            swipeAngle,
            _ = this;

        xDist = _.touchObject.startX - _.touchObject.curX;
        yDist = _.touchObject.startY - _.touchObject.curY;
        r = Math.atan2(yDist, xDist);

        swipeAngle = Math.round(r * 180 / Math.PI);
        if (swipeAngle < 0) {
            swipeAngle = 360 - Math.abs(swipeAngle);
        }

        if (swipeAngle <= 45 && swipeAngle >= 0) {
            return _.options.rtl === false ? 'left' : 'right';
        }
        if (swipeAngle <= 360 && swipeAngle >= 315) {
            return _.options.rtl === false ? 'left' : 'right';
        }
        if (swipeAngle >= 135 && swipeAngle <= 225) {
            return _.options.rtl === false ? 'right' : 'left';
        }
        if (_.options.verticalSwiping === true) {
            if (swipeAngle >= 35 && swipeAngle <= 135) {
                return 'down';
            } else {
                return 'up';
            }
        }

        return 'vertical';
    };

    Slick.prototype.swipeEnd = function (event) {

        var _ = this,
            slideCount,
            direction;

        _.dragging = false;
        _.swiping = false;

        if (_.scrolling) {
            _.scrolling = false;
            return false;
        }

        _.interrupted = false;
        _.shouldClick = _.touchObject.swipeLength > 10 ? false : true;

        if (_.touchObject.curX === undefined) {
            return false;
        }

        if (_.touchObject.edgeHit === true) {
            _.$slider.trigger('edge', [_, _.swipeDirection()]);
        }

        if (_.touchObject.swipeLength >= _.touchObject.minSwipe) {

            direction = _.swipeDirection();

            switch (direction) {

                case 'left':
                case 'down':

                    slideCount = _.options.swipeToSlide ? _.checkNavigable(_.currentSlide + _.getSlideCount()) : _.currentSlide + _.getSlideCount();

                    _.currentDirection = 0;

                    break;

                case 'right':
                case 'up':

                    slideCount = _.options.swipeToSlide ? _.checkNavigable(_.currentSlide - _.getSlideCount()) : _.currentSlide - _.getSlideCount();

                    _.currentDirection = 1;

                    break;

                default:

            }

            if (direction != 'vertical') {

                _.slideHandler(slideCount);
                _.touchObject = {};
                _.$slider.trigger('swipe', [_, direction]);
            }
        } else {

            if (_.touchObject.startX !== _.touchObject.curX) {

                _.slideHandler(_.currentSlide);
                _.touchObject = {};
            }
        }
    };

    Slick.prototype.swipeHandler = function (event) {

        var _ = this;

        if (_.options.swipe === false || 'ontouchend' in document && _.options.swipe === false) {
            return;
        } else if (_.options.draggable === false && event.type.indexOf('mouse') !== -1) {
            return;
        }

        _.touchObject.fingerCount = event.originalEvent && event.originalEvent.touches !== undefined ? event.originalEvent.touches.length : 1;

        _.touchObject.minSwipe = _.listWidth / _.options.touchThreshold;

        if (_.options.verticalSwiping === true) {
            _.touchObject.minSwipe = _.listHeight / _.options.touchThreshold;
        }

        switch (event.data.action) {

            case 'start':
                _.swipeStart(event);
                break;

            case 'move':
                _.swipeMove(event);
                break;

            case 'end':
                _.swipeEnd(event);
                break;

        }
    };

    Slick.prototype.swipeMove = function (event) {

        var _ = this,
            edgeWasHit = false,
            curLeft,
            swipeDirection,
            swipeLength,
            positionOffset,
            touches,
            verticalSwipeLength;

        touches = event.originalEvent !== undefined ? event.originalEvent.touches : null;

        if (!_.dragging || _.scrolling || touches && touches.length !== 1) {
            return false;
        }

        curLeft = _.getLeft(_.currentSlide);

        _.touchObject.curX = touches !== undefined ? touches[0].pageX : event.clientX;
        _.touchObject.curY = touches !== undefined ? touches[0].pageY : event.clientY;

        _.touchObject.swipeLength = Math.round(Math.sqrt(Math.pow(_.touchObject.curX - _.touchObject.startX, 2)));

        verticalSwipeLength = Math.round(Math.sqrt(Math.pow(_.touchObject.curY - _.touchObject.startY, 2)));

        if (!_.options.verticalSwiping && !_.swiping && verticalSwipeLength > 4) {
            _.scrolling = true;
            return false;
        }

        if (_.options.verticalSwiping === true) {
            _.touchObject.swipeLength = verticalSwipeLength;
        }

        swipeDirection = _.swipeDirection();

        if (event.originalEvent !== undefined && _.touchObject.swipeLength > 4) {
            _.swiping = true;
            event.preventDefault();
        }

        positionOffset = (_.options.rtl === false ? 1 : -1) * (_.touchObject.curX > _.touchObject.startX ? 1 : -1);
        if (_.options.verticalSwiping === true) {
            positionOffset = _.touchObject.curY > _.touchObject.startY ? 1 : -1;
        }

        swipeLength = _.touchObject.swipeLength;

        _.touchObject.edgeHit = false;

        if (_.options.infinite === false) {
            if (_.currentSlide === 0 && swipeDirection === 'right' || _.currentSlide >= _.getDotCount() && swipeDirection === 'left') {
                swipeLength = _.touchObject.swipeLength * _.options.edgeFriction;
                _.touchObject.edgeHit = true;
            }
        }

        if (_.options.vertical === false) {
            _.swipeLeft = curLeft + swipeLength * positionOffset;
        } else {
            _.swipeLeft = curLeft + swipeLength * (_.$list.height() / _.listWidth) * positionOffset;
        }
        if (_.options.verticalSwiping === true) {
            _.swipeLeft = curLeft + swipeLength * positionOffset;
        }

        if (_.options.fade === true || _.options.touchMove === false) {
            return false;
        }

        if (_.animating === true) {
            _.swipeLeft = null;
            return false;
        }

        _.setCSS(_.swipeLeft);
    };

    Slick.prototype.swipeStart = function (event) {

        var _ = this,
            touches;

        _.interrupted = true;

        if (_.touchObject.fingerCount !== 1 || _.slideCount <= _.options.slidesToShow) {
            _.touchObject = {};
            return false;
        }

        if (event.originalEvent !== undefined && event.originalEvent.touches !== undefined) {
            touches = event.originalEvent.touches[0];
        }

        _.touchObject.startX = _.touchObject.curX = touches !== undefined ? touches.pageX : event.clientX;
        _.touchObject.startY = _.touchObject.curY = touches !== undefined ? touches.pageY : event.clientY;

        _.dragging = true;
    };

    Slick.prototype.unfilterSlides = Slick.prototype.slickUnfilter = function () {

        var _ = this;

        if (_.$slidesCache !== null) {

            _.unload();

            _.$slideTrack.children(this.options.slide).detach();

            _.$slidesCache.appendTo(_.$slideTrack);

            _.reinit();
        }
    };

    Slick.prototype.unload = function () {

        var _ = this;

        $('.slick-cloned', _.$slider).remove();

        if (_.$dots) {
            _.$dots.remove();
        }

        if (_.$prevArrow && _.htmlExpr.test(_.options.prevArrow)) {
            _.$prevArrow.remove();
        }

        if (_.$nextArrow && _.htmlExpr.test(_.options.nextArrow)) {
            _.$nextArrow.remove();
        }

        _.$slides.removeClass('slick-slide slick-active slick-visible slick-current').attr('aria-hidden', 'true').css('width', '');
    };

    Slick.prototype.unslick = function (fromBreakpoint) {

        var _ = this;
        _.$slider.trigger('unslick', [_, fromBreakpoint]);
        _.destroy();
    };

    Slick.prototype.updateArrows = function () {

        var _ = this,
            centerOffset;

        centerOffset = Math.floor(_.options.slidesToShow / 2);

        if (_.options.arrows === true && _.slideCount > _.options.slidesToShow && !_.options.infinite) {

            _.$prevArrow.removeClass('slick-disabled').attr('aria-disabled', 'false');
            _.$nextArrow.removeClass('slick-disabled').attr('aria-disabled', 'false');

            if (_.currentSlide === 0) {

                _.$prevArrow.addClass('slick-disabled').attr('aria-disabled', 'true');
                _.$nextArrow.removeClass('slick-disabled').attr('aria-disabled', 'false');
            } else if (_.currentSlide >= _.slideCount - _.options.slidesToShow && _.options.centerMode === false) {

                _.$nextArrow.addClass('slick-disabled').attr('aria-disabled', 'true');
                _.$prevArrow.removeClass('slick-disabled').attr('aria-disabled', 'false');
            } else if (_.currentSlide >= _.slideCount - 1 && _.options.centerMode === true) {

                _.$nextArrow.addClass('slick-disabled').attr('aria-disabled', 'true');
                _.$prevArrow.removeClass('slick-disabled').attr('aria-disabled', 'false');
            }
        }
    };

    Slick.prototype.updateDots = function () {

        var _ = this;

        if (_.$dots !== null) {

            _.$dots.find('li').removeClass('slick-active').end();

            _.$dots.find('li').eq(Math.floor(_.currentSlide / _.options.slidesToScroll)).addClass('slick-active');
        }
    };

    Slick.prototype.visibility = function () {

        var _ = this;

        if (_.options.autoplay) {

            if (document[_.hidden]) {

                _.interrupted = true;
            } else {

                _.interrupted = false;
            }
        }
    };

    $.fn.slick = function () {
        var _ = this,
            opt = arguments[0],
            args = Array.prototype.slice.call(arguments, 1),
            l = _.length,
            i,
            ret;
        for (i = 0; i < l; i++) {
            if (typeof opt == 'object' || typeof opt == 'undefined') _[i].slick = new Slick(_[i], opt);else ret = _[i].slick[opt].apply(_[i].slick, args);
            if (typeof ret != 'undefined') return ret;
        }
        return _;
    };
});

/*!
    Colorbox 1.6.4
    license: MIT
    http://www.jacklmoore.com/colorbox
*/
(function ($, document, window) {
    var
    // Default settings object.
    // See http://jacklmoore.com/colorbox for details.
    defaults = {
        // data sources
        html: false,
        photo: false,
        iframe: false,
        inline: false,

        // behavior and appearance
        transition: "elastic",
        speed: 300,
        fadeOut: 300,
        width: false,
        initialWidth: "600",
        innerWidth: false,
        maxWidth: false,
        height: false,
        initialHeight: "450",
        innerHeight: false,
        maxHeight: false,
        scalePhotos: true,
        scrolling: true,
        opacity: 0.9,
        preloading: true,
        className: false,
        overlayClose: true,
        escKey: true,
        arrowKey: true,
        top: false,
        bottom: false,
        left: false,
        right: false,
        fixed: false,
        data: undefined,
        closeButton: true,
        fastIframe: true,
        open: false,
        reposition: true,
        loop: true,
        slideshow: false,
        slideshowAuto: true,
        slideshowSpeed: 2500,
        slideshowStart: "start slideshow",
        slideshowStop: "stop slideshow",
        photoRegex: /\.(gif|png|jp(e|g|eg)|bmp|ico|webp|jxr|svg)((#|\?).*)?$/i,

        // alternate image paths for high-res displays
        retinaImage: false,
        retinaUrl: false,
        retinaSuffix: '@2x.$1',

        // internationalization
        current: "image {current} of {total}",
        previous: "previous",
        next: "next",
        close: "close",
        xhrError: "This content failed to load.",
        imgError: "This image failed to load.",

        // accessbility
        returnFocus: true,
        trapFocus: true,

        // callbacks
        onOpen: false,
        onLoad: false,
        onComplete: false,
        onCleanup: false,
        onClosed: false,

        rel: function () {
            return this.rel;
        },
        href: function () {
            // using this.href would give the absolute url, when the href may have been inteded as a selector (e.g. '#container')
            return $(this).attr('href');
        },
        title: function () {
            return this.title;
        },
        createImg: function () {
            var img = new Image();
            var attrs = $(this).data('cbox-img-attrs');

            if (typeof attrs === 'object') {
                $.each(attrs, function (key, val) {
                    img[key] = val;
                });
            }

            return img;
        },
        createIframe: function () {
            var iframe = document.createElement('iframe');
            var attrs = $(this).data('cbox-iframe-attrs');

            if (typeof attrs === 'object') {
                $.each(attrs, function (key, val) {
                    iframe[key] = val;
                });
            }

            if ('frameBorder' in iframe) {
                iframe.frameBorder = 0;
            }
            if ('allowTransparency' in iframe) {
                iframe.allowTransparency = "true";
            }
            iframe.name = new Date().getTime(); // give the iframe a unique name to prevent caching
            iframe.allowFullscreen = true;

            return iframe;
        }
    },


    // Abstracting the HTML and event identifiers for easy rebranding
    colorbox = 'colorbox',
        prefix = 'cbox',
        boxElement = prefix + 'Element',


    // Events
    event_open = prefix + '_open',
        event_load = prefix + '_load',
        event_complete = prefix + '_complete',
        event_cleanup = prefix + '_cleanup',
        event_closed = prefix + '_closed',
        event_purge = prefix + '_purge',


    // Cached jQuery Object Variables
    $overlay,
        $box,
        $wrap,
        $content,
        $topBorder,
        $leftBorder,
        $rightBorder,
        $bottomBorder,
        $related,
        $window,
        $loaded,
        $loadingBay,
        $loadingOverlay,
        $title,
        $current,
        $slideshow,
        $next,
        $prev,
        $close,
        $groupControls,
        $events = $('<a/>'),
        // $({}) would be preferred, but there is an issue with jQuery 1.4.2

    // Variables for cached values or use across multiple functions
    settings,
        interfaceHeight,
        interfaceWidth,
        loadedHeight,
        loadedWidth,
        index,
        photo,
        open,
        active,
        closing,
        loadingTimer,
        publicMethod,
        div = "div",
        requests = 0,
        previousCSS = {},
        init;

    // ****************
    // HELPER FUNCTIONS
    // ****************

    // Convenience function for creating new jQuery objects
    function $tag(tag, id, css) {
        var element = document.createElement(tag);

        if (id) {
            element.id = prefix + id;
        }

        if (css) {
            element.style.cssText = css;
        }

        return $(element);
    }

    // Get the window height using innerHeight when available to avoid an issue with iOS
    // http://bugs.jquery.com/ticket/6724
    function winheight() {
        return window.innerHeight ? window.innerHeight : $(window).height();
    }

    function Settings(element, options) {
        if (options !== Object(options)) {
            options = {};
        }

        this.cache = {};
        this.el = element;

        this.value = function (key) {
            var dataAttr;

            if (this.cache[key] === undefined) {
                dataAttr = $(this.el).attr('data-cbox-' + key);

                if (dataAttr !== undefined) {
                    this.cache[key] = dataAttr;
                } else if (options[key] !== undefined) {
                    this.cache[key] = options[key];
                } else if (defaults[key] !== undefined) {
                    this.cache[key] = defaults[key];
                }
            }

            return this.cache[key];
        };

        this.get = function (key) {
            var value = this.value(key);
            return $.isFunction(value) ? value.call(this.el, this) : value;
        };
    }

    // Determine the next and previous members in a group.
    function getIndex(increment) {
        var max = $related.length,
            newIndex = (index + increment) % max;

        return newIndex < 0 ? max + newIndex : newIndex;
    }

    // Convert '%' and 'px' values to integers
    function setSize(size, dimension) {
        return Math.round((/%/.test(size) ? (dimension === 'x' ? $window.width() : winheight()) / 100 : 1) * parseInt(size, 10));
    }

    // Checks an href to see if it is a photo.
    // There is a force photo option (photo: true) for hrefs that cannot be matched by the regex.
    function isImage(settings, url) {
        return settings.get('photo') || settings.get('photoRegex').test(url);
    }

    function retinaUrl(settings, url) {
        return settings.get('retinaUrl') && window.devicePixelRatio > 1 ? url.replace(settings.get('photoRegex'), settings.get('retinaSuffix')) : url;
    }

    function trapFocus(e) {
        if ('contains' in $box[0] && !$box[0].contains(e.target) && e.target !== $overlay[0]) {
            e.stopPropagation();
            $box.focus();
        }
    }

    function setClass(str) {
        if (setClass.str !== str) {
            $box.add($overlay).removeClass(setClass.str).addClass(str);
            setClass.str = str;
        }
    }

    function getRelated(rel) {
        index = 0;

        if (rel && rel !== false && rel !== 'nofollow') {
            $related = $('.' + boxElement).filter(function () {
                var options = $.data(this, colorbox);
                var settings = new Settings(this, options);
                return settings.get('rel') === rel;
            });
            index = $related.index(settings.el);

            // Check direct calls to Colorbox.
            if (index === -1) {
                $related = $related.add(settings.el);
                index = $related.length - 1;
            }
        } else {
            $related = $(settings.el);
        }
    }

    function trigger(event) {
        // for external use
        $(document).trigger(event);
        // for internal use
        $events.triggerHandler(event);
    }

    var slideshow = function () {
        var active,
            className = prefix + "Slideshow_",
            click = "click." + prefix,
            timeOut;

        function clear() {
            clearTimeout(timeOut);
        }

        function set() {
            if (settings.get('loop') || $related[index + 1]) {
                clear();
                timeOut = setTimeout(publicMethod.next, settings.get('slideshowSpeed'));
            }
        }

        function start() {
            $slideshow.html(settings.get('slideshowStop')).unbind(click).one(click, stop);

            $events.bind(event_complete, set).bind(event_load, clear);

            $box.removeClass(className + "off").addClass(className + "on");
        }

        function stop() {
            clear();

            $events.unbind(event_complete, set).unbind(event_load, clear);

            $slideshow.html(settings.get('slideshowStart')).unbind(click).one(click, function () {
                publicMethod.next();
                start();
            });

            $box.removeClass(className + "on").addClass(className + "off");
        }

        function reset() {
            active = false;
            $slideshow.hide();
            clear();
            $events.unbind(event_complete, set).unbind(event_load, clear);
            $box.removeClass(className + "off " + className + "on");
        }

        return function () {
            if (active) {
                if (!settings.get('slideshow')) {
                    $events.unbind(event_cleanup, reset);
                    reset();
                }
            } else {
                if (settings.get('slideshow') && $related[1]) {
                    active = true;
                    $events.one(event_cleanup, reset);
                    if (settings.get('slideshowAuto')) {
                        start();
                    } else {
                        stop();
                    }
                    $slideshow.show();
                }
            }
        };
    }();

    function launch(element) {
        var options;

        if (!closing) {

            options = $(element).data(colorbox);

            settings = new Settings(element, options);

            getRelated(settings.get('rel'));

            if (!open) {
                open = active = true; // Prevents the page-change action from queuing up if the visitor holds down the left or right keys.

                setClass(settings.get('className'));

                // Show colorbox so the sizes can be calculated in older versions of jQuery
                $box.css({ visibility: 'hidden', display: 'block', opacity: '' });

                $loaded = $tag(div, 'LoadedContent', 'width:0; height:0; overflow:hidden; visibility:hidden');
                $content.css({ width: '', height: '' }).append($loaded);

                // Cache values needed for size calculations
                interfaceHeight = $topBorder.height() + $bottomBorder.height() + $content.outerHeight(true) - $content.height();
                interfaceWidth = $leftBorder.width() + $rightBorder.width() + $content.outerWidth(true) - $content.width();
                loadedHeight = $loaded.outerHeight(true);
                loadedWidth = $loaded.outerWidth(true);

                // Opens inital empty Colorbox prior to content being loaded.
                var initialWidth = setSize(settings.get('initialWidth'), 'x');
                var initialHeight = setSize(settings.get('initialHeight'), 'y');
                var maxWidth = settings.get('maxWidth');
                var maxHeight = settings.get('maxHeight');

                settings.w = Math.max((maxWidth !== false ? Math.min(initialWidth, setSize(maxWidth, 'x')) : initialWidth) - loadedWidth - interfaceWidth, 0);
                settings.h = Math.max((maxHeight !== false ? Math.min(initialHeight, setSize(maxHeight, 'y')) : initialHeight) - loadedHeight - interfaceHeight, 0);

                $loaded.css({ width: '', height: settings.h });
                publicMethod.position();

                trigger(event_open);
                settings.get('onOpen');

                $groupControls.add($title).hide();

                $box.focus();

                if (settings.get('trapFocus')) {
                    // Confine focus to the modal
                    // Uses event capturing that is not supported in IE8-
                    if (document.addEventListener) {

                        document.addEventListener('focus', trapFocus, true);

                        $events.one(event_closed, function () {
                            document.removeEventListener('focus', trapFocus, true);
                        });
                    }
                }

                // Return focus on closing
                if (settings.get('returnFocus')) {
                    $events.one(event_closed, function () {
                        $(settings.el).focus();
                    });
                }
            }

            var opacity = parseFloat(settings.get('opacity'));
            $overlay.css({
                opacity: opacity === opacity ? opacity : '',
                cursor: settings.get('overlayClose') ? 'pointer' : '',
                visibility: 'visible'
            }).show();

            if (settings.get('closeButton')) {
                $close.html(settings.get('close')).appendTo($content);
            } else {
                $close.appendTo('<div/>'); // replace with .detach() when dropping jQuery < 1.4
            }

            load();
        }
    }

    // Colorbox's markup needs to be added to the DOM prior to being called
    // so that the browser will go ahead and load the CSS background images.
    function appendHTML() {
        if (!$box) {
            init = false;
            $window = $(window);
            $box = $tag(div).attr({
                id: colorbox,
                'class': $.support.opacity === false ? prefix + 'IE' : '', // class for optional IE8 & lower targeted CSS.
                role: 'dialog',
                tabindex: '-1'
            }).hide();
            $overlay = $tag(div, "Overlay").hide();
            $loadingOverlay = $([$tag(div, "LoadingOverlay")[0], $tag(div, "LoadingGraphic")[0]]);
            $wrap = $tag(div, "Wrapper");
            $content = $tag(div, "Content").append($title = $tag(div, "Title"), $current = $tag(div, "Current"), $prev = $('<button type="button"/>').attr({ id: prefix + 'Previous' }), $next = $('<button type="button"/>').attr({ id: prefix + 'Next' }), $slideshow = $('<button type="button"/>').attr({ id: prefix + 'Slideshow' }), $loadingOverlay);

            $close = $('<button type="button"/>').attr({ id: prefix + 'Close' });

            $wrap.append( // The 3x3 Grid that makes up Colorbox
            $tag(div).append($tag(div, "TopLeft"), $topBorder = $tag(div, "TopCenter"), $tag(div, "TopRight")), $tag(div, false, 'clear:left').append($leftBorder = $tag(div, "MiddleLeft"), $content, $rightBorder = $tag(div, "MiddleRight")), $tag(div, false, 'clear:left').append($tag(div, "BottomLeft"), $bottomBorder = $tag(div, "BottomCenter"), $tag(div, "BottomRight"))).find('div div').css({ 'float': 'left' });

            $loadingBay = $tag(div, false, 'position:absolute; width:9999px; visibility:hidden; display:none; max-width:none;');

            $groupControls = $next.add($prev).add($current).add($slideshow);
        }
        if (document.body && !$box.parent().length) {
            $(document.body).append($overlay, $box.append($wrap, $loadingBay));
        }
    }

    // Add Colorbox's event bindings
    function addBindings() {
        function clickHandler(e) {
            // ignore non-left-mouse-clicks and clicks modified with ctrl / command, shift, or alt.
            // See: http://jacklmoore.com/notes/click-events/
            if (!(e.which > 1 || e.shiftKey || e.altKey || e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                launch(this);
            }
        }

        if ($box) {
            if (!init) {
                init = true;

                // Anonymous functions here keep the public method from being cached, thereby allowing them to be redefined on the fly.
                $next.click(function () {
                    publicMethod.next();
                });
                $prev.click(function () {
                    publicMethod.prev();
                });
                $close.click(function () {
                    publicMethod.close();
                });
                $overlay.click(function () {
                    if (settings.get('overlayClose')) {
                        publicMethod.close();
                    }
                });

                // Key Bindings
                $(document).bind('keydown.' + prefix, function (e) {
                    var key = e.keyCode;
                    if (open && settings.get('escKey') && key === 27) {
                        e.preventDefault();
                        publicMethod.close();
                    }
                    if (open && settings.get('arrowKey') && $related[1] && !e.altKey) {
                        if (key === 37) {
                            e.preventDefault();
                            $prev.click();
                        } else if (key === 39) {
                            e.preventDefault();
                            $next.click();
                        }
                    }
                });

                if ($.isFunction($.fn.on)) {
                    // For jQuery 1.7+
                    $(document).on('click.' + prefix, '.' + boxElement, clickHandler);
                } else {
                    // For jQuery 1.3.x -> 1.6.x
                    // This code is never reached in jQuery 1.9, so do not contact me about 'live' being removed.
                    // This is not here for jQuery 1.9, it's here for legacy users.
                    $('.' + boxElement).live('click.' + prefix, clickHandler);
                }
            }
            return true;
        }
        return false;
    }

    // Don't do anything if Colorbox already exists.
    if ($[colorbox]) {
        return;
    }

    // Append the HTML when the DOM loads
    $(appendHTML);

    // ****************
    // PUBLIC FUNCTIONS
    // Usage format: $.colorbox.close();
    // Usage from within an iframe: parent.jQuery.colorbox.close();
    // ****************

    publicMethod = $.fn[colorbox] = $[colorbox] = function (options, callback) {
        var settings;
        var $obj = this;

        options = options || {};

        if ($.isFunction($obj)) {
            // assume a call to $.colorbox
            $obj = $('<a/>');
            options.open = true;
        }

        if (!$obj[0]) {
            // colorbox being applied to empty collection
            return $obj;
        }

        appendHTML();

        if (addBindings()) {

            if (callback) {
                options.onComplete = callback;
            }

            $obj.each(function () {
                var old = $.data(this, colorbox) || {};
                $.data(this, colorbox, $.extend(old, options));
            }).addClass(boxElement);

            settings = new Settings($obj[0], options);

            if (settings.get('open')) {
                launch($obj[0]);
            }
        }

        return $obj;
    };

    publicMethod.position = function (speed, loadedCallback) {
        var css,
            top = 0,
            left = 0,
            offset = $box.offset(),
            scrollTop,
            scrollLeft;

        $window.unbind('resize.' + prefix);

        // remove the modal so that it doesn't influence the document width/height
        $box.css({ top: -9e4, left: -9e4 });

        scrollTop = $window.scrollTop();
        scrollLeft = $window.scrollLeft();

        if (settings.get('fixed')) {
            offset.top -= scrollTop;
            offset.left -= scrollLeft;
            $box.css({ position: 'fixed' });
        } else {
            top = scrollTop;
            left = scrollLeft;
            $box.css({ position: 'absolute' });
        }

        // keeps the top and left positions within the browser's viewport.
        if (settings.get('right') !== false) {
            left += Math.max($window.width() - settings.w - loadedWidth - interfaceWidth - setSize(settings.get('right'), 'x'), 0);
        } else if (settings.get('left') !== false) {
            left += setSize(settings.get('left'), 'x');
        } else {
            left += Math.round(Math.max($window.width() - settings.w - loadedWidth - interfaceWidth, 0) / 2);
        }

        if (settings.get('bottom') !== false) {
            top += Math.max(winheight() - settings.h - loadedHeight - interfaceHeight - setSize(settings.get('bottom'), 'y'), 0);
        } else if (settings.get('top') !== false) {
            top += setSize(settings.get('top'), 'y');
        } else {
            top += Math.round(Math.max(winheight() - settings.h - loadedHeight - interfaceHeight, 0) / 2);
        }

        $box.css({ top: offset.top, left: offset.left, visibility: 'visible' });

        // this gives the wrapper plenty of breathing room so it's floated contents can move around smoothly,
        // but it has to be shrank down around the size of div#colorbox when it's done.  If not,
        // it can invoke an obscure IE bug when using iframes.
        $wrap[0].style.width = $wrap[0].style.height = "9999px";

        function modalDimensions() {
            $topBorder[0].style.width = $bottomBorder[0].style.width = $content[0].style.width = parseInt($box[0].style.width, 10) - interfaceWidth + 'px';
            $content[0].style.height = $leftBorder[0].style.height = $rightBorder[0].style.height = parseInt($box[0].style.height, 10) - interfaceHeight + 'px';
        }

        css = { width: settings.w + loadedWidth + interfaceWidth, height: settings.h + loadedHeight + interfaceHeight, top: top, left: left };

        // setting the speed to 0 if the content hasn't changed size or position
        if (speed) {
            var tempSpeed = 0;
            $.each(css, function (i) {
                if (css[i] !== previousCSS[i]) {
                    tempSpeed = speed;
                    return;
                }
            });
            speed = tempSpeed;
        }

        previousCSS = css;

        if (!speed) {
            $box.css(css);
        }

        $box.dequeue().animate(css, {
            duration: speed || 0,
            complete: function () {
                modalDimensions();

                active = false;

                // shrink the wrapper down to exactly the size of colorbox to avoid a bug in IE's iframe implementation.
                $wrap[0].style.width = settings.w + loadedWidth + interfaceWidth + "px";
                $wrap[0].style.height = settings.h + loadedHeight + interfaceHeight + "px";

                if (settings.get('reposition')) {
                    setTimeout(function () {
                        // small delay before binding onresize due to an IE8 bug.
                        $window.bind('resize.' + prefix, publicMethod.position);
                    }, 1);
                }

                if ($.isFunction(loadedCallback)) {
                    loadedCallback();
                }
            },
            step: modalDimensions
        });
    };

    publicMethod.resize = function (options) {
        var scrolltop;

        if (open) {
            options = options || {};

            if (options.width) {
                settings.w = setSize(options.width, 'x') - loadedWidth - interfaceWidth;
            }

            if (options.innerWidth) {
                settings.w = setSize(options.innerWidth, 'x');
            }

            $loaded.css({ width: settings.w });

            if (options.height) {
                settings.h = setSize(options.height, 'y') - loadedHeight - interfaceHeight;
            }

            if (options.innerHeight) {
                settings.h = setSize(options.innerHeight, 'y');
            }

            if (!options.innerHeight && !options.height) {
                scrolltop = $loaded.scrollTop();
                $loaded.css({ height: "auto" });
                settings.h = $loaded.height();
            }

            $loaded.css({ height: settings.h });

            if (scrolltop) {
                $loaded.scrollTop(scrolltop);
            }

            publicMethod.position(settings.get('transition') === "none" ? 0 : settings.get('speed'));
        }
    };

    publicMethod.prep = function (object) {
        if (!open) {
            return;
        }

        var callback,
            speed = settings.get('transition') === "none" ? 0 : settings.get('speed');

        $loaded.remove();

        $loaded = $tag(div, 'LoadedContent').append(object);

        function getWidth() {
            settings.w = settings.w || $loaded.width();
            settings.w = settings.mw && settings.mw < settings.w ? settings.mw : settings.w;
            return settings.w;
        }
        function getHeight() {
            settings.h = settings.h || $loaded.height();
            settings.h = settings.mh && settings.mh < settings.h ? settings.mh : settings.h;
            return settings.h;
        }

        $loaded.hide().appendTo($loadingBay.show()) // content has to be appended to the DOM for accurate size calculations.
        .css({ width: getWidth(), overflow: settings.get('scrolling') ? 'auto' : 'hidden' }).css({ height: getHeight() }) // sets the height independently from the width in case the new width influences the value of height.
        .prependTo($content);

        $loadingBay.hide();

        // floating the IMG removes the bottom line-height and fixed a problem where IE miscalculates the width of the parent element as 100% of the document width.

        $(photo).css({ 'float': 'none' });

        setClass(settings.get('className'));

        callback = function () {
            var total = $related.length,
                iframe,
                complete;

            if (!open) {
                return;
            }

            function removeFilter() {
                // Needed for IE8 in versions of jQuery prior to 1.7.2
                if ($.support.opacity === false) {
                    $box[0].style.removeAttribute('filter');
                }
            }

            complete = function () {
                clearTimeout(loadingTimer);
                $loadingOverlay.hide();
                trigger(event_complete);
                settings.get('onComplete');
            };

            $title.html(settings.get('title')).show();
            $loaded.show();

            if (total > 1) {
                // handle grouping
                if (typeof settings.get('current') === "string") {
                    $current.html(settings.get('current').replace('{current}', index + 1).replace('{total}', total)).show();
                }

                $next[settings.get('loop') || index < total - 1 ? "show" : "hide"]().html(settings.get('next'));
                $prev[settings.get('loop') || index ? "show" : "hide"]().html(settings.get('previous'));

                slideshow();

                // Preloads images within a rel group
                if (settings.get('preloading')) {
                    $.each([getIndex(-1), getIndex(1)], function () {
                        var img,
                            i = $related[this],
                            settings = new Settings(i, $.data(i, colorbox)),
                            src = settings.get('href');

                        if (src && isImage(settings, src)) {
                            src = retinaUrl(settings, src);
                            img = document.createElement('img');
                            img.src = src;
                        }
                    });
                }
            } else {
                $groupControls.hide();
            }

            if (settings.get('iframe')) {

                iframe = settings.get('createIframe');

                if (!settings.get('scrolling')) {
                    iframe.scrolling = "no";
                }

                $(iframe).attr({
                    src: settings.get('href'),
                    'class': prefix + 'Iframe'
                }).one('load', complete).appendTo($loaded);

                $events.one(event_purge, function () {
                    iframe.src = "//about:blank";
                });

                if (settings.get('fastIframe')) {
                    $(iframe).trigger('load');
                }
            } else {
                complete();
            }

            if (settings.get('transition') === 'fade') {
                $box.fadeTo(speed, 1, removeFilter);
            } else {
                removeFilter();
            }
        };

        if (settings.get('transition') === 'fade') {
            $box.fadeTo(speed, 0, function () {
                publicMethod.position(0, callback);
            });
        } else {
            publicMethod.position(speed, callback);
        }
    };

    function load() {
        var href,
            setResize,
            prep = publicMethod.prep,
            $inline,
            request = ++requests;

        active = true;

        photo = false;

        trigger(event_purge);
        trigger(event_load);
        settings.get('onLoad');

        settings.h = settings.get('height') ? setSize(settings.get('height'), 'y') - loadedHeight - interfaceHeight : settings.get('innerHeight') && setSize(settings.get('innerHeight'), 'y');

        settings.w = settings.get('width') ? setSize(settings.get('width'), 'x') - loadedWidth - interfaceWidth : settings.get('innerWidth') && setSize(settings.get('innerWidth'), 'x');

        // Sets the minimum dimensions for use in image scaling
        settings.mw = settings.w;
        settings.mh = settings.h;

        // Re-evaluate the minimum width and height based on maxWidth and maxHeight values.
        // If the width or height exceed the maxWidth or maxHeight, use the maximum values instead.
        if (settings.get('maxWidth')) {
            settings.mw = setSize(settings.get('maxWidth'), 'x') - loadedWidth - interfaceWidth;
            settings.mw = settings.w && settings.w < settings.mw ? settings.w : settings.mw;
        }
        if (settings.get('maxHeight')) {
            settings.mh = setSize(settings.get('maxHeight'), 'y') - loadedHeight - interfaceHeight;
            settings.mh = settings.h && settings.h < settings.mh ? settings.h : settings.mh;
        }

        href = settings.get('href');

        loadingTimer = setTimeout(function () {
            $loadingOverlay.show();
        }, 100);

        if (settings.get('inline')) {
            var $target = $(href).eq(0);
            // Inserts an empty placeholder where inline content is being pulled from.
            // An event is bound to put inline content back when Colorbox closes or loads new content.
            $inline = $('<div>').hide().insertBefore($target);

            $events.one(event_purge, function () {
                $inline.replaceWith($target);
            });

            prep($target);
        } else if (settings.get('iframe')) {
            // IFrame element won't be added to the DOM until it is ready to be displayed,
            // to avoid problems with DOM-ready JS that might be trying to run in that iframe.
            prep(" ");
        } else if (settings.get('html')) {
            prep(settings.get('html'));
        } else if (isImage(settings, href)) {

            href = retinaUrl(settings, href);

            photo = settings.get('createImg');

            $(photo).addClass(prefix + 'Photo').bind('error.' + prefix, function () {
                prep($tag(div, 'Error').html(settings.get('imgError')));
            }).one('load', function () {
                if (request !== requests) {
                    return;
                }

                // A small pause because some browsers will occasionally report a
                // img.width and img.height of zero immediately after the img.onload fires
                setTimeout(function () {
                    var percent;

                    if (settings.get('retinaImage') && window.devicePixelRatio > 1) {
                        photo.height = photo.height / window.devicePixelRatio;
                        photo.width = photo.width / window.devicePixelRatio;
                    }

                    if (settings.get('scalePhotos')) {
                        setResize = function () {
                            photo.height -= photo.height * percent;
                            photo.width -= photo.width * percent;
                        };
                        if (settings.mw && photo.width > settings.mw) {
                            percent = (photo.width - settings.mw) / photo.width;
                            setResize();
                        }
                        if (settings.mh && photo.height > settings.mh) {
                            percent = (photo.height - settings.mh) / photo.height;
                            setResize();
                        }
                    }

                    if (settings.h) {
                        photo.style.marginTop = Math.max(settings.mh - photo.height, 0) / 2 + 'px';
                    }

                    if ($related[1] && (settings.get('loop') || $related[index + 1])) {
                        photo.style.cursor = 'pointer';

                        $(photo).bind('click.' + prefix, function () {
                            publicMethod.next();
                        });
                    }

                    photo.style.width = photo.width + 'px';
                    photo.style.height = photo.height + 'px';
                    prep(photo);
                }, 1);
            });

            photo.src = href;
        } else if (href) {
            $loadingBay.load(href, settings.get('data'), function (data, status) {
                if (request === requests) {
                    prep(status === 'error' ? $tag(div, 'Error').html(settings.get('xhrError')) : $(this).contents());
                }
            });
        }
    }

    // Navigates to the next page/image in a set.
    publicMethod.next = function () {
        if (!active && $related[1] && (settings.get('loop') || $related[index + 1])) {
            index = getIndex(1);
            launch($related[index]);
        }
    };

    publicMethod.prev = function () {
        if (!active && $related[1] && (settings.get('loop') || index)) {
            index = getIndex(-1);
            launch($related[index]);
        }
    };

    // Note: to use this within an iframe use the following format: parent.jQuery.colorbox.close();
    publicMethod.close = function () {
        if (open && !closing) {

            closing = true;
            open = false;
            trigger(event_cleanup);
            settings.get('onCleanup');
            $window.unbind('.' + prefix);
            $overlay.fadeTo(settings.get('fadeOut') || 0, 0);

            $box.stop().fadeTo(settings.get('fadeOut') || 0, 0, function () {
                $box.hide();
                $overlay.hide();
                trigger(event_purge);
                $loaded.remove();

                setTimeout(function () {
                    closing = false;
                    trigger(event_closed);
                    settings.get('onClosed');
                }, 1);
            });
        }
    };

    // Removes changes Colorbox made to the document, but does not remove the plugin.
    publicMethod.remove = function () {
        if (!$box) {
            return;
        }

        $box.stop();
        $[colorbox].close();
        $box.stop(false, true).remove();
        $overlay.remove();
        closing = false;
        $box = null;
        $('.' + boxElement).removeData(colorbox).removeClass(boxElement);

        $(document).unbind('click.' + prefix).unbind('keydown.' + prefix);
    };

    // A method for fetching the current element Colorbox is referencing.
    // returns a jQuery object.
    publicMethod.element = function () {
        return $(settings.el);
    };

    publicMethod.settings = defaults;
})(jQuery, document, window);

/* Nick Goodrum's FAUX SELECT Modified by: Fernando Peña
================================================================ */

$(".faux-select").each(function () {
    var $selectWrap = $(this),
        $expander = $selectWrap.children("a"),
        $expandable = $expander.siblings("ul"),
        $expandableChildren = $expandable.children();
    if ($expandableChildren.length <= 0) {
        $selectWrap.hide();
    }
    $expander.on("click", function (e) {
        e.preventDefault();

        if ($selectWrap.hasClass("opened")) {

            $("body").off("click", fauxSelectHandler);
            $expandable.off("keydown", keyboardSelect);
            $expandable.slideUp(function () {
                $selectWrap.removeClass("opened");
            });
        } else {

            $(".faux-select.opened").children("a").trigger("click");

            $selectWrap.addClass("opened");
            $expandable.slideDown(function () {
                $expandable.find("a").attr("tabIndex", -1);
                $expandable.find("li:first-child a").attr("tabIndex", 0).focus();

                $expandable.on("keydown", keyboardSelect);
            });
            $("body").on("click", fauxSelectHandler);
        }

        $expandableChildren.on("click", function (e) {
            $expandableChildren.removeClass("selected");
            $(this).addClass("selected");
            $expander.find(".value").text($(this).text());

            $("body").off("click", fauxSelectHandler);

            $expandable.off("keydown", keyboardSelect);

            $expandable.slideUp(function () {
                $selectWrap.removeClass("opened");
            });
        });
    });

    function keyboardSelect(event) {
        if (event.keyCode !== 27 && event.keyCode !== 9) {
            var $currItem = $(document.activeElement).parent(),
                idx = $currItem.index(),
                $anchor;

            $(event.target).attr("tabIndex", -1);

            // decide what do do based on the keyCode
            event.preventDefault();

            switch (event.keyCode) {
                // move to previous item
                case 37: // left
                case 38:
                    // up
                    if ($currItem.prev().length >= 0) {
                        $anchor = $expandable.find("li:eq(" + (idx - 1) + ") a");
                    } else {
                        $anchor = $expandable.find("li:last-child a");
                    }
                    break;
                // move to next item
                case 39: // right
                case 40:
                    // down
                    if ($currItem.next().length >= 0) {
                        $anchor = $expandable.find("li:eq(" + (idx + 1) + ") a");
                    } else {
                        $anchor = $expandable.find("li:first-child a");
                    }
                    break;
                // go to the beginning of the list
                case 33: // page up
                case 36:
                    // home
                    $anchor = $expandable.find("li:first-child a");
                    break;
                // go to the end of the list
                case 34: // page down
                case 35:
                    // end
                    $anchor = $expandable.find("li:last-child a");
                    break;
            }
            if ($anchor) {
                $currItem.attr("tabIndex", -1);
                $anchor.attr("tabIndex", 0).focus();
            }
        } else {
            if (event.keyCode === 27) {
                $expander.focus();
            }
            $expander.trigger("click");
        }
    }

    function fauxSelectHandler(e) {
        if ($(e.target).parents(".faux-select").length <= 0 && e.originalEvent) {
            $(".faux-select.opened").children("a").trigger("click");
            $("body").off("click", fauxSelectHandler);
        }
    }
});

/* ******************************************************
    - Expandable
   ****************************************************** */
(function ($) {
    $(function () {
        $('[data-sf-role=toggleLink]').on('click', function () {
            var link = $(this);

            expandElement(link);

            var wrapper = link.closest('[data-sf-role=lists]');

            var linkCount = wrapper.find('[data-sf-role=toggleLink]').length;
            var expandedLinkCount = wrapper.find('[data-sf-role=toggleLink].expanded').length;

            if (linkCount === expandedLinkCount) {
                hideExpandAllLink(wrapper);
            } else {
                hideCollapseAllLink(wrapper);
            }
        });

        $('[data-sf-role=expandAll]').on('click', function () {
            var wrapper = $(this).closest('[data-sf-role=lists]');
            wrapper.find('[data-sf-role=expandAll]').css('display', 'none');
            wrapper.find('[data-sf-role=collapseAll]').css('display', 'block');
            var links = wrapper.find('[data-sf-role=toggleLink]');
            links.addClass('expanded');
            links.next('div').css('display', 'block');
        });

        $('[data-sf-role=collapseAll]').on('click', function () {
            var wrapper = $(this).closest('[data-sf-role=lists]');
            wrapper.find('[data-sf-role=expandAll]').css('display', 'block');
            wrapper.find('[data-sf-role=collapseAll]').css('display', 'none');
            var links = wrapper.find('[data-sf-role=toggleLink]');
            links.removeClass('expanded');
            links.next('div').css('display', 'none');
        });

        function expandElement(link) {
            if (link.hasClass('expanded')) link.removeClass('expanded');else link.addClass('expanded');

            var content = link.next();
            if (content.css('display') === 'none') content.css('display', 'block');else content.css('display', 'none');
        }

        function hideExpandAllLink(wrapper) {
            wrapper.find('[data-sf-role=expandAll]').css('display', 'none');
            wrapper.find('[data-sf-role=collapseAll]').css('display', 'block');
        }

        function hideCollapseAllLink(wrapper) {
            wrapper.find('[data-sf-role=expandAll]').css('display', 'block');
            wrapper.find('[data-sf-role=collapseAll]').css('display', 'none');
        }
    });
})(jQuery);

/*! ________________
*   ___  ____/_  __ \
*   __  /_   _  / / /
*   _  __/   / /_/ /
*   /_/      \____/
*   Focus Overlay
*
*  Version: 0.9.3
*  Author: Maurice Mahan
*  License: MIT
*  Repo: https://github.com/MauriceMahan/FocusOverlay
*/
!function (e) {
    "function" == typeof define && define.amd ? define(["jquery"], function (t) {
        return e(t, window);
    }) : "object" == typeof module && module.exports ? module.exports = function (t, o) {
        return void 0 === o && (o = "undefined" != typeof window ? require("jquery") : require("jquery")(t)), e(o, window), o;
    } : e(jQuery, window);
}(function (e, t) {
    function o(t, o) {
        var n = this;n.active = !1, n.$el = e(t), n.$focusBox = e("<div aria-hidden='true' />"), n.$previousTarget, n.$nextTarget, n.timeout = 0, n.inScope = !1, n.transitionEvent = n._whichTransitionEvent(), n.options = e.extend({}, e.fn.focusOverlay.defaults, o), n.onFocusHandler = e.proxy(n.onFocusHandler, n), n.createFocusBox = e.proxy(n.createFocusBox, n), n.onKeyDownHandler = e.proxy(n.onKeyDownHandler, n), n._repositionBox = e.proxy(n._repositionBox, n), n.moveFocusBox = e.proxy(n.moveFocusBox, n), n.cleanup = e.proxy(n.cleanup, n), n.stop = e.proxy(n.stop, n), n.destroy = e.proxy(n.destroy, n), n.init();
    }o.prototype = { init: function () {
            var e = this;e.options.alwaysActive ? (e.active = !0, t.addEventListener("focus", e.onFocusHandler, !0)) : (t.addEventListener("keydown", e.onKeyDownHandler, !1), e.options.inactiveOnClick && t.addEventListener("mousedown", e.stop, !1)), e.createFocusBox(), e.$el.trigger("foInit", [e]);
        }, onKeyDownHandler: function (o) {
            var n = this,
                i = o.which;e.inArray(i, n.options.triggerKeys) >= 0 ? !1 === n.active && (n.active = !0, t.addEventListener("focus", n.onFocusHandler, !0)) : n.options.inactiveOnNonTriggerKey && n.stop();
        }, createFocusBox: function () {
            var e = this;e.$focusBox.appendTo(e.$el).attr("id", e.options.id).css({ position: "absolute", zIndex: e.options.zIndex, pointerEvents: "none" });
        }, cleanup: function () {
            var e = this;null != e.$nextTarget && (e.$previousTarget = e.$nextTarget, e.$previousTarget.removeClass(e.options.targetClass), e.transitionEvent && e.options.watchTransitionEnd && e.$previousTarget[0].removeEventListener(e.transitionEvent, e._repositionBox));
        }, onFocusHandler: function (t) {
            var o = this,
                n = e(t.target);if (o.cleanup(), n.closest(o.$el).length > 0) {
                var i = o.$nextTarget,
                    r = o.$previousTarget;if (o.inScope = !0, n.data("focus")) o.$nextTarget = e(n.data("focus")).first();else if (n.is("[data-focus-label]")) {
                    var s = e("[for='" + n.attr("id") + "']");s.length < 1 && (s = n.closest("label")), o.$nextTarget = s;
                } else {
                    if (n.is("[data-focus-ignore]")) return;o.$nextTarget = n;
                }clearTimeout(o.timeout), o.transitionEvent && o.options.watchTransitionEnd && o.$nextTarget[0].addEventListener(o.transitionEvent, o._repositionBox), o.$el.trigger("foBeforeMove", [o, r, i, o.$nextTarget]), o.moveFocusBox(o.$nextTarget);
            } else o.options.alwaysActive ? o.inScope = !1 : (o.inScope = !1, o.stop());
        }, stop: function () {
            var e = this;e.active = !1, t.removeEventListener("focus", e.onFocusHandler, !0), e.cleanup(), e.$focusBox.removeClass(e.options.activeClass);
        }, moveFocusBox: function (e) {
            var t = this;if (e.addClass(t.options.targetClass), e.length > 0 && e[0] instanceof Element) {
                var o = t._getAbsoluteBoundingRect(e[0]),
                    n = o.width,
                    i = o.height,
                    r = o.left,
                    s = o.top;t.$focusBox.addClass(t.options.animatingClass).addClass(t.options.activeClass).css({ width: n, height: i, left: r, top: s }), t.timeout = setTimeout(function () {
                    t.$focusBox.removeClass(t.options.animatingClass), t.options.inactiveAfterDuration && t.$focusBox.removeClass(t.options.activeClass), t.$el.trigger("foAfterMove", [t, t.$previousTarget, e]);
                }, t.options.duration);
            } else t.cleanup();
        }, _repositionBox: function (t) {
            var o = this,
                n = e(t.target);o.moveFocusBox(n);
        }, destroy: function () {
            var e = this;e.$el.removeData(), e.$focusBox.remove(), null != e.$previousTarget && e.$previousTarget.removeClass(e.options.targetClass), null != e.$nextTarget && e.$nextTarget.removeClass(e.options.targetClass), t.removeEventListener("focus", e.onFocusHandler, !0), t.removeEventListener("keydown", e.onKeyDownHandler, !1), t.removeEventListener("mousedown", e.stop, !1), e.$el.trigger("foDestroyed", [e]);
        }, _getAbsoluteBoundingRect: function (e) {
            var o = document,
                n = t,
                i = o.body,
                r = void 0 !== n.pageXOffset ? n.pageXOffset : (o.documentElement || i.parentNode || i).scrollLeft,
                s = void 0 !== n.pageYOffset ? n.pageYOffset : (o.documentElement || i.parentNode || i).scrollTop,
                a = e.getBoundingClientRect();if (e !== i) for (var c = e.parentNode; c !== i && c;) r += c.scrollLeft, s += c.scrollTop, c = c.parentNode;return { bottom: a.bottom + s, height: a.height, left: a.left + r, right: a.right + r, top: a.top + s, width: a.width };
        }, _whichTransitionEvent: function () {
            var e,
                t = document.createElement("fakeelement"),
                o = { transition: "transitionend", OTransition: "oTransitionEnd", MozTransition: "transitionend", WebkitTransition: "webkitTransitionEnd" };for (e in o) if (void 0 !== t.style[e]) return o[e];
        } }, e.fn.focusOverlay = function (t) {
        var n = arguments;if (void 0 === t || "object" == typeof t) return this.each(function () {
            e.data(this, "plugin_" + o) || e.data(this, "plugin_" + o, new o(this, t));
        });if ("string" == typeof t && "_" !== t[0] && "init" !== t) {
            if (0 == Array.prototype.slice.call(n, 1).length && -1 != e.inArray(t, e.fn.focusOverlay.getters)) {
                var i = e.data(this[0], "plugin_" + o);return i[t].apply(i, Array.prototype.slice.call(n, 1));
            }return this.each(function () {
                var i = e.data(this, "plugin_" + o);i instanceof o && "function" == typeof i[t] && i[t].apply(i, Array.prototype.slice.call(n, 1));
            });
        }
    }, e.fn.focusOverlay.getters = ["destroy"], e.fn.focusOverlay.defaults = { id: "focus-overlay", activeClass: "focus-overlay-active", animatingClass: "focus-overlay-animating", targetClass: "focus-overlay-target", zIndex: 9001, duration: 500, inactiveAfterDuration: !1, triggerKeys: [9, 36, 37, 38, 39, 40, 13, 32, 16, 17, 18, 27], inactiveOnNonTriggerKey: !0, inactiveOnClick: !0, alwaysActive: !1, watchTransitionEnd: !0 };
});
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
                relatedData,
                // ID of target
            $toggle,
                // Toggle element
            $target,
                // Target element
            $relatedToggles,
                // All toggles with same target ID
            toggleID,
                // ID of toggle
            animateTime,
                // Animation duration (ms)
            useCss,
                // If CSS animations will be used instead of JS
            isOverlay,
                // If toggle should be used for site overlay
            isHold,
                // If toggle should remain active on outside clicks
            isNoFocus,
                // If should not focus inside after opening
            isActive,
                // If $toggle is active
            $html = $("html");

            /**
             * Setting toggle/target depending on if an ID is specified or not.
             * If no ID is supplied then it is treated as an expander container.
             */
            if ($this.data("expander").length > 0) {
                $toggle = $this;
                $relatedToggles = $("[data-expander='" + $this.data("expander") + "']").not(this);
                $target = $("#" + $this.data("expander"));
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
                hide: function () {
                    // Remove `active` state after slide animation
                    $target.slideUp(animateTime, function () {
                        $target.removeClass("active");

                        // Update a11y to describe as closed
                        $toggle.add($relatedToggles).attr("aria-expanded", "false");
                    });
                },
                show: function () {
                    // Add `active` state after slide animation
                    $target.slideDown(animateTime, function () {
                        $target.addClass("active");
                    });
                }

                /**
                 * Only used if data-expander-css is added to the toggle. Should be
                 * used with appropriate show/hide CSS animations if you go this route
                 */
            };var cssAnimation = {
                hide: function () {
                    /**
                     * Classes to use CSS animation for show/hiding.
                     * This will also allow us to set display to block/none
                     */
                    $target.removeClass("target-show");
                    $target.addClass("target-hide");

                    setTimeout(function () {
                        // At the end of the animation timer remove classes
                        $target.removeClass("active");
                        $target.removeClass("target-hide");

                        // Update a11y to describe as closed
                        $toggle.add($relatedToggles).attr("aria-expanded", "false");
                    }, animateTime);
                },
                show: function () {
                    // Should set to display block
                    $target.addClass("active");

                    /**
                    * CSS animation for show/hiding.Inside of
                    * setTimeout for cross-browser bugs(?)
                    */
                    setTimeout(function () {
                        $target.addClass("target-show");
                    }, 0);
                }

                // Functionality for showing/hiding
            };function toggleTarget() {
                // Clear out handler for easy exit of toggle if it exists
                $html.off("click touchstart keyup", dataToggleHandler);
                $html.off("click touchstart keyup", checkOutsideClick);

                if ($target.hasClass("active")) {
                    $toggle.add($relatedToggles).removeClass("active");

                    // Removing class on html element for site overlay effects
                    if (isOverlay) {
                        $html.removeClass("js-data-toggled");
                        $("html").removeClass("js-data-toggled-" + $target.attr("id"));
                    }

                    // Show/hide animation depending on if you want to use CSS animations or not
                    if (useCss) {
                        cssAnimation.hide();
                    } else {
                        jsAnimation.hide();
                    }
                } else {
                    $toggle.add($relatedToggles).addClass("active");

                    // Adding class on html element for site overlay effects
                    if (isOverlay) {
                        $html.addClass("js-data-toggled");
                        $("html").addClass("js-data-toggled-" + $target.attr("id"));
                    }

                    // Show/hide animation depending on if you want to use CSS animations or not
                    if (useCss) {
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
                    var later = function () {
                        var $focusable = $target.find("input, select, textarea, a").first();

                        if (isNoFocus !== true) {
                            if ($focusable.length > 0) {
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
                    if (!isHold) $html.on("click touchstart keyup", dataToggleHandler);
                }
            }

            /**
             * Namespaced function for use in $html event checks
             * @param {Object} event Click/keyboard event object
             */
            function dataToggleHandler(e) {
                if (e.which === 27) {
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

                if ($eTarget.closest($target).length <= 0 && $eTarget.closest("#" + toggleID).length <= 0 && talonUtil.a11yClick(e) === true) {
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
            if ($target.length > 0) {
                // Set global timeout to null so it doesn't conflict with other targets
                window.dataExpTimeOut = null;

                // Make sure there is an ID set for the toggle for a11y purposes
                if (!toggleID) {
                    $toggle.attr("id", "data-expander-" + key);
                    toggleID = $toggle.attr("id");
                }

                // Finish up a11y setup for related element
                $target.attr({ "aria-labelledby": toggleID });

                /**
                 * Make sure the target can be focused if no items inside
                 * are not auto-focused when opened
                 */
                if ($target[0].hasAttribute("tabindex") === false) {
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

                if (!isHold && isActive) $html.on("click touchstart keyup", checkOutsideClick);

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
        slidesToShow: 4,
        arrows: true,
        slidesToScroll: 1,
        responsive: [{
            breakpoint: 960,
            settings: {
                slidesToShow: 2
            }
        }, {
            breakpoint: 768,
            settings: {
                slidesToShow: 2
            }
        }, {
            breakpoint: 640,
            settings: {
                slidesToShow: 1
            }
        }]
    });

    $(".photo-overlay").colorbox({ rel: 'group1' });

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
        arrows: true,

        responsive: [{
            breakpoint: 960,
            settings: {
                slidesToShow: 3
            }
        }, {
            breakpoint: 767,
            settings: {
                slidesToShow: 2
            }
        }, {
            breakpoint: 479,
            settings: {
                slidesToShow: 1
            }
        }]
    });

    /** List Tool on load */
    $('.list-tool.expand-list, .list-tool.accordion-list').each(function () {
        var $this = $(this);

        $this.find('.item:first-child > a').addClass('active');
        $this.find('.item .item-content').hide();
        $this.find('.item:first-child .item-content').show();
    });

    $('.talon-tabs').each(function () {
        var $this = $(this);

        $this.find('.talon-tab:first-child > a').addClass('active');
        $this.find('.talon-tab-pane').hide();
        $this.find('.talon-tab-pane:first-child').show();
    });

    /** Stop referrer Phishing hack + ADA */
    $("a[target=_blank], a[target=new]").each(function () {
        $(this).attr("rel", "noopener noreferrer").append("<span class='visually-hidden'>(Opens in a new window)</span>");
    });

    talonUtil.setupToggles();
    talonUtil.setupScrollPointerBlocker();
    talonUtil.setupUserBinds();

    


    //RPS Game
    let userScore = 0;
    let computerScore = 0;
    const userScore_span = document.querySelector(".user-score");
    const computerScore_span = document.querySelector(".computer-score");
    const scoreboard_div = document.querySelector(".scoreboard");
    const result_div = document.querySelector(".result");
    const rock_li = document.querySelector(".r");
    const paper_li = document.querySelector(".p");
    const scissors_li = document.querySelector(".s");

    //functions
    let getComputerChoice = function () {
        const choices = ['r', 'p', 's'];
        const randomNumber = Math.floor(Math.random() * choices.length);
        return choices[randomNumber];
    };

    const win = function (user, computer) {
        userScore++;
        userScore_span.innerHTML = userScore;
        computerScore_span.innerHTML = computerScore;
        console.log(`Player: ${userScore}`);
        console.log(`${user} ${computer}`)
    };
    const lose = function () {
        computerScore++;
        computerScore_span.innerHTML = computerScore;
        computerScore_span.innerHTML = computerScore;

        console.log(`computer: ${computerScore}`);
    };
    const draw = function () {
        console.log("draw");
    };
    console.log(getComputerChoice());

    let game = function (userChoice) {
        console.log(`Your Choice was ${userChoice} `);
        const computerChoice = getComputerChoice();
        console.log(computerChoice);
        console.log(`user choice => ${userChoice}`);
        console.log(`computer choice => ${computerChoice}`);

        switch (userChoice + computerChoice) {
            case "rs":
            case "pr":
            case "sp":
                win(userChoice, computerChoice);
                console.log("user wins");
                break;
            case "rp":
            case "ps":
            case "sr":
                lose();
                console.log("user loses");
            case "rr":
            case "pp":
            case "ss":
                draw();
                console.log("draw!");
                break;
        }
    };
    let main = function () {
        rock_li.addEventListener("click", function () {
            game("r");
        });

        paper_li.addEventListener("click", function () {
            game("p");
        });

        scissors_li.addEventListener("click", function () {
            game("s");
        });
    };

    main();


})(jQuery, window.talonUtil);