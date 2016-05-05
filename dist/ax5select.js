'use strict';

/*
 * Copyright (c) 2016. tom@axisj.com
 * - github.com/thomasjang
 * - www.axisj.com
 */

// ax5.ui.select
(function (root, _SUPER_) {

    /**
     * @class ax5.ui.select
     * @classdesc
     * @version 0.4.5
     * @author tom@axisj.com
     * @example
     * ```
     * var myselect = new ax5.ui.select();
     * ```
     */
    var U = ax5.util;

    //== UI Class
    var axClass = function axClass() {
        var self = this,
            cfg;

        if (_SUPER_) _SUPER_.call(this); // 부모호출

        this.queue = [];
        this.config = {
            clickEventName: "click", //(('ontouchstart' in document.documentElement) ? "touchend" : "click"),
            theme: 'default',
            title: '',
            animateTime: 250,

            lang: {
                emptyOfSelected: '',
                multipleLabel: '"{{label}}"외 {{length}}건'
            },
            columnKeys: {
                optionValue: 'value',
                optionText: 'text',
                optionSelected: 'selected'
            },
            displayMargin: 14
        };

        this.activeSelectOptionGroup = null;
        this.activeSelectQueueIndex = -1;
        this.openTimer = null;
        this.closeTimer = null;

        cfg = this.config;

        var onStateChanged = function onStateChanged(item, that) {
            if (item && item.onStateChanged) {
                item.onStateChanged.call(that, that);
            } else if (this.onStateChanged) {
                this.onStateChanged.call(that, that);
            }
            item = null;
            that = null;
            return true;
        },
            getOptionGroupTmpl = function getOptionGroupTmpl(columnKeys) {
            return '\n                <div class="ax5-ui-select-option-group {{theme}} {{size}}" data-ax5-select-option-group="{{id}}">\n                    <div class="ax-select-body">\n                        <div class="ax-select-option-group-content" data-select-els="content">\n                        {{#options}}\n                            <div class="ax-select-option-item" data-option-index="{{@i}}" data-option-value="{{' + columnKeys.optionValue + '}}" {{#' + columnKeys.optionSelected + '}}data-option-selected="true"{{/' + columnKeys.optionSelected + '}}>\n                                <div class="ax-select-option-item-holder">\n                                    {{#multiple}}\n                                    <span class="ax-select-option-item-cell ax-select-option-item-checkbox">\n                                        <span class="item-checkbox-wrap useCheckBox" data-option-checkbox-index="{{@i}}"></span>\n                                    </span>\n                                    {{/multiple}}\n                                    {{^multiple}}\n                                    \n                                    {{/multiple}}\n                                    <span class="ax-select-option-item-cell ax-select-option-item-label">{{' + columnKeys.optionText + '}}</span>\n                                </div>\n                            </div>\n                        {{/options}}\n                        </div>\n                    </div>\n                    <div class="ax-select-arrow"></div> \n                </div>\n                ';
        },
            getTmpl = function getTmpl() {
            return '\n                <a {{^tabIndex}}href="#ax5select-{{id}}" {{/tabIndex}}{{#tabIndex}}tabindex="{{tabIndex}}" {{/tabIndex}}class="form-control {{formSize}} ax5-ui-select-display {{theme}}" \n                data-ax5-select-display="{{id}}">\n                    <div class="ax5-ui-select-display-table" data-select-els="display-table">\n                        <div data-ax5-select-display="label">{{label}}</div>\n                        <div data-ax5-select-display="addon" data-ax5-select-opened="false">\n                            {{#icons}}\n                            <span class="addon-icon-closed">{{clesed}}</span>\n                            <span class="addon-icon-opened">{{opened}}</span>\n                            {{/icons}}\n                            {{^icons}}\n                            <span class="addon-icon-closed"><span class="addon-icon-arrow"></span></span>\n                            <span class="addon-icon-opened"><span class="addon-icon-arrow"></span></span>\n                            {{/icons}}\n                        </div>\n                    </div>\n                </a>\n                ';
        },
            alignSelectDisplay = function alignSelectDisplay() {
            var i = this.queue.length,
                w;
            while (i--) {
                if (this.queue[i].$display) {
                    w = this.queue[i].select.outerWidth();
                    if (this.queue[i].select.css("display") != "block") {
                        w = w + cfg.displayMargin;
                    }
                    this.queue[i].$display.css({
                        "min-width": w
                    });
                }
            }

            i = null;
            w = null;
            return this;
        },
            alignSelectOptionGroup = function alignSelectOptionGroup(append) {
            if (!this.activeSelectOptionGroup) return this;

            var item = this.queue[this.activeSelectQueueIndex],
                pos = {},
                dim = {};

            if (append) jQuery(document.body).append(this.activeSelectOptionGroup);

            pos = item.$target.offset();
            dim = {
                width: item.$target.outerWidth(),
                height: item.$target.outerHeight()
            };

            // picker css(width, left, top) & direction 결정
            if (!item.direction || item.direction === "" || item.direction === "auto") {
                // set direction
                item.direction = "top";
            }

            if (append) {
                this.activeSelectOptionGroup.addClass("direction-" + item.direction);
            }
            this.activeSelectOptionGroup.css(function () {
                if (item.direction == "top") {
                    return {
                        left: pos.left,
                        top: pos.top + dim.height + 1,
                        width: dim.width
                    };
                } else if (item.direction == "bottom") {
                    return {
                        left: pos.left,
                        top: pos.top - this.activeSelectOptionGroup.outerHeight() - 1,
                        width: dim.width
                    };
                }
            }.call(this));
        },
            onBodyClick = function onBodyClick(e, target) {
            if (!this.activeSelectOptionGroup) return this;

            var item = this.queue[this.activeSelectQueueIndex],
                clickEl = "display";

            target = U.findParentNode(e.target, function (target) {
                if (target.getAttribute("data-option-value")) {
                    clickEl = "optionItem";
                    return true;
                } else if (item.$target.get(0) == target) {
                    clickEl = "display";
                    return true;
                }
            });

            if (!target) {
                this.close();
                return this;
            } else if (clickEl != "display") {
                this.val(item.id, { index: target.getAttribute("data-option-index") });
                if (!item.multiple) this.close();
            }

            return this;
        },
            onBodyKeyup = function onBodyKeyup(e) {
            if (e.keyCode == ax5.info.eventKeys.ESC) {
                this.close();
            }
        },
            getLabel = function getLabel(queIdx) {
            var item = this.queue[queIdx];
            var labels = [];
            if (U.isArray(item.selected) && item.selected.length > 0) {
                item.selected.forEach(function (n) {
                    if (n.selected) labels.push(n[cfg.columnKeys.optionText]);
                });
            } else {
                if (!item.multiple && item.options[0]) labels[0] = item.options[0][cfg.columnKeys.optionText];else labels[0] = "";
            }

            return function () {
                if (item.multiple && labels.length > 1) {
                    var data = {
                        label: labels[0],
                        length: labels.length - 1
                    };
                    return ax5.mustache.render(cfg.lang.multipleLabel, data);
                } else {
                    return labels[0];
                }
            }();
        },
            bindSelectTarget = function () {
            var selectEvent = {
                'click': function click(queIdx, e) {
                    if (self.activeSelectQueueIndex == queIdx) {
                        self.close();
                    } else {
                        self.open(queIdx);
                    }
                    U.stopEvent(e);
                },
                'keyUp': function keyUp(queIdx, e) {
                    if (e.which == ax5.info.eventKeys.SPACE) {
                        selectEvent.click.call(this, queIdx, e);
                    } else if (e.which == ax5.info.eventKeys.DOWN) {
                        // todo focus move
                    }
                }
            };
            return function (queIdx) {
                var item = this.queue[queIdx];
                var data = {};

                if (!item.$display) {
                    item.options = syncSelectOptions.call(this, queIdx, item.options);

                    /// 템플릿에 전달할 오브젝트 선언
                    data.id = item.id;
                    data.theme = item.theme;
                    data.tabIndex = item.tabIndex;
                    data.label = getLabel.call(this, queIdx);
                    data.formSize = function () {
                        if (item.select.hasClass("input-lg")) return "input-lg";
                        if (item.select.hasClass("input-sm")) return "input-sm";
                    }();

                    item.$display = jQuery(ax5.mustache.render(getTmpl.call(this, queIdx), data));
                    item.$target.append(item.$display);
                    alignSelectDisplay.call(this);

                    item.$display.unbind('click.ax5select').bind('click.ax5select', selectEvent.click.bind(this, queIdx)).unbind('keyup.ax5select').bind('keyup.ax5select', selectEvent.keyUp.bind(this, queIdx));
                } else {
                    item.options = syncSelectOptions.call(this, queIdx, item.options);
                    item.$display.find('[data-ax5-select-display="label"]').html(getLabel.call(this, queIdx));
                    alignSelectDisplay.call(this);

                    item.$display.unbind('click.ax5select').bind('click.ax5select', selectEvent.click.bind(this, queIdx)).unbind('keyup.ax5select').bind('keyup.ax5select', selectEvent.keyUp.bind(this, queIdx));
                }

                data = null;
                item = null;
                queIdx = null;
                return this;
            };
        }(),
            syncSelectOptions = function () {
            var setSelected = function setSelected(queIdx, O) {
                if (!O) {
                    this.queue[queIdx].selected = [];
                } else {
                    if (this.queue[queIdx].multiple) this.queue[queIdx].selected.push(jQuery.extend({}, O));else this.queue[queIdx].selected[0] = jQuery.extend({}, O);
                }
            };

            return function (queIdx, options) {
                var item = this.queue[queIdx];
                var po, elementOptions, newOptions;
                setSelected.call(this, queIdx, false); // item.selected 초기화

                if (options) {
                    item.options = options;

                    // select options 태그 생성
                    po = [];
                    item.options.forEach(function (O, OIndex) {
                        O['@index'] = OIndex;
                        po.push('<option value="' + O[cfg.columnKeys.optionValue] + '" ' + (O[cfg.columnKeys.optionSelected] ? ' selected="selected"' : '') + '>' + O[cfg.columnKeys.optionText] + '</option>');
                        if (O[cfg.columnKeys.optionSelected]) {
                            setSelected.call(self, queIdx, O);
                        }
                    });
                    item.select.html(po.join(''));
                } else {
                    elementOptions = U.toArray(item.select.get(0).options);
                    // select option 스크립트 생성
                    newOptions = [];
                    elementOptions.forEach(function (O, OIndex) {
                        var option = {};
                        option[cfg.columnKeys.optionValue] = O.value;
                        option[cfg.columnKeys.optionText] = O.text;
                        option[cfg.columnKeys.optionSelected] = O.selected;
                        option['@index'] = OIndex;
                        if (O.selected) setSelected.call(self, queIdx, option);
                        newOptions.push(option);
                        option = null;
                    });
                    item.options = newOptions;
                }

                if (!item.multiple && item.selected.length == 0) {
                    item.selected = jQuery.extend({}, item.options[0]);
                }

                po = null;
                elementOptions = null;
                newOptions = null;
                return item.options;
            };
        }(),
            getQueIdx = function getQueIdx(boundID) {
            if (!U.isString(boundID)) boundID = jQuery(boundID).data("ax5-select");
            if (!U.isString(boundID)) {
                console.log(ax5.info.getError("ax5select", "402", "val"));
                return;
            }
            return U.search(this.queue, function () {
                return this.id == boundID;
            });
        };
        /// private end

        /**
         * Preferences of select UI
         * @method ax5.ui.select.setConfig
         * @param {Object} config - 클래스 속성값
         * @returns {ax5.ui.select}
         * @example
         * ```
         * ```
         */
        this.init = function () {
            this.onStateChanged = cfg.onStateChanged;
            jQuery(window).bind("resize.ax5select-display", function () {
                alignSelectDisplay.call(this);
            }.bind(this));
        };

        /**
         * bind select
         * @method ax5.ui.select.bind
         * @param {Object} item
         * @param {String} [item.id]
         * @param {Element} item.target
         * @param {Object[]} item.options
         * @returns {ax5.ui.select}
         */
        this.bind = function (item) {
            var selectConfig = {},
                queIdx;

            item = jQuery.extend(selectConfig, cfg, item);
            if (!item.target) {
                console.log(ax5.info.getError("ax5select", "401", "bind"));
                return this;
            }
            item.$target = jQuery(item.target);
            if (!item.id) item.id = item.$target.data("ax5-select");
            if (!item.id) {
                item.id = 'ax5-select-' + ax5.getGuid();
                item.$target.data("ax5-select", item.id);
            }
            item.select = item.$target.find('select');
            item.tabIndex = item.select.attr("tabindex");
            item.select.attr("tabindex", "-1");
            item.multiple = item.select.attr("multiple");
            item.size = item.select.attr("data-size");
            if (item.options) {
                item.options = JSON.parse(JSON.stringify(item.options));
            }

            // target attribute data
            (function (data) {
                if (U.isObject(data) && !data.error) {
                    item = jQuery.extend(true, item, data);
                }
            })(U.parseJson(item.$target.attr("data-ax5select"), true));

            queIdx = U.search(this.queue, function () {
                return this.id == item.id;
            });

            if (queIdx === -1) {
                this.queue.push(item);
                bindSelectTarget.call(this, this.queue.length - 1);
            } else {
                this.queue[queIdx] = jQuery.extend({}, this.queue[queIdx], item);
                bindSelectTarget.call(this, queIdx);
            }

            selectConfig = null;
            queIdx = null;
            return this;
        };

        /**
         * open the optionBox of select
         * @method ax5.ui.select.open
         * @param {Number} [queIdx]
         * @param {Number} [tryCount]
         * @returns {ax5.ui.select}
         */
        this.open = function () {

            return function (queIdx, tryCount) {
                /**
                 * open select from the outside
                 */
                if (queIdx instanceof jQuery || U.isElement(queIdx)) {
                    var select_id = jQuery(queIdx).data("ax5-select");
                    queIdx = ax5.util.search(this.queue, function () {
                        return this.id == select_id;
                    });
                    if (queIdx == -1) {
                        console.log(ax5.info.getError("ax5select", "402", "open"));
                        return this;
                    }
                }

                var item = this.queue[queIdx];
                var data = {},
                    focusTop,
                    selectedOptionEl;

                if (item.$display.attr("disabled")) return this;

                if (this.openTimer) clearTimeout(this.openTimer);
                if (this.activeSelectOptionGroup) {
                    if (this.activeSelectQueueIndex == queIdx) {
                        return this;
                    }

                    if (tryCount > 2) return this;
                    this.close();
                    this.openTimer = setTimeout(function () {
                        this.open(queIdx, (tryCount || 0) + 1);
                    }.bind(this), cfg.animateTime);

                    return this;
                }

                /// 템플릿에 전달할 오브젝트 선언
                data.id = item.id;
                data.theme = item.theme;
                data.size = "ax5-ui-select-option-group-" + item.size;
                data.multiple = item.multiple;
                data.options = item.options;
                item.$display.attr("data-select-option-group-opened", "true");

                this.activeSelectOptionGroup = jQuery(ax5.mustache.render(getOptionGroupTmpl.call(this, cfg.columnKeys), data));
                this.activeSelectQueueIndex = queIdx;

                alignSelectOptionGroup.call(this, "append"); // alignSelectOptionGroup 에서 body append
                jQuery(window).bind("resize.ax5select", function () {
                    alignSelectOptionGroup.call(this);
                }.bind(this));

                if (item.selected && item.selected.length > 0) {
                    selectedOptionEl = this.activeSelectOptionGroup.find('[data-option-index="' + item.selected[0]["@i"] + '"]');
                    if (selectedOptionEl.get(0)) {
                        focusTop = selectedOptionEl.position().top - this.activeSelectOptionGroup.height() / 3;
                        this.activeSelectOptionGroup.find('[data-select-els="content"]').stop().animate({ scrollTop: focusTop }, cfg.animateTime, 'swing', function () {});
                    }
                }

                // bind key event
                jQuery(window).bind("keyup.ax5select", function (e) {
                    e = e || window.event;
                    onBodyKeyup.call(this, e);
                    U.stopEvent(e);
                }.bind(this));

                jQuery(window).bind("click.ax5select", function (e) {
                    e = e || window.event;
                    onBodyClick.call(this, e);
                    U.stopEvent(e);
                }.bind(this));

                onStateChanged.call(this, item, {
                    self: this,
                    state: "open",
                    boundObject: item
                });

                data = null;
                focusTop = null;
                selectedOptionEl = null;
                return this;
            };
        }();

        /**
         * @method ax5.ui.select.update
         * @param {(Object|String)} item
         * @returns {ax5.ui.select}
         */
        this.update = function (_item) {
            this.bind(_item);
            return this;
        };

        /**
         * @method ax5.ui.select.setValue
         * @param value
         * @returns {axClass}
         */
        this.val = function () {

            // todo : val 함수 리팩토링 필요

            var processor = {
                'index': function index(queIdx, value) {
                    // 옵션선택 초기화
                    if (!this.queue[queIdx].multiple) {
                        this.queue[queIdx].options.forEach(function (n) {
                            n.selected = false;
                        });
                    }

                    var getSelected = function getSelected(_item, o) {
                        return _item.multiple ? !o : true;
                    };

                    if (U.isArray(value.index)) {
                        value.index.forEach(function (n) {
                            self.queue[queIdx].options[n].selected = getSelected(self.queue[queIdx], self.queue[queIdx].options[n].selected);
                            self.activeSelectOptionGroup.find('[data-option-index="' + n + '"]').attr("data-option-selected", self.queue[queIdx].options[n].selected.toString());
                        });
                    } else {
                        self.queue[queIdx].options[value.index].selected = getSelected(self.queue[queIdx], self.queue[queIdx].options[value.index].selected);
                        self.activeSelectOptionGroup.find('[data-option-index="' + value.index + '"]').attr("data-option-selected", self.queue[queIdx].options[value.index].selected.toString());
                    }

                    syncSelectOptions.call(this, queIdx, this.queue[queIdx].options);
                    this.queue[queIdx].$display.find('[data-ax5-select-display="label"]').html(getLabel.call(this, queIdx));

                    alignSelectOptionGroup.call(this);
                },
                'text': function text(queIdx, value) {},
                'arr': function arr(queIdx, value) {},
                'value': function value(queIdx, _value) {
                    console.log(queIdx, _value);
                    // todo ~~~
                }
            };

            return function (boundID, value) {
                var queIdx = getQueIdx.call(this, boundID);

                if (typeof value == "undefined") {
                    return this.queue[queIdx].selected;
                } else if (U.isArray(value)) {
                    processor.arr.call(this, queIdx, value);
                } else if (U.isString(value) || U.isNumber(value)) {
                    processor.value.call(this, queIdx, value);
                } else {
                    for (var key in processor) {
                        if (value[key]) {
                            processor[key].call(this, queIdx, value);
                            break;
                        }
                    }
                }

                boundID = null;
                return this;
            };
        }();

        /**
         * @method ax5.ui.select.close
         * @returns {ax5.ui.select}
         */
        this.close = function (boundID, item) {
            if (this.closeTimer) clearTimeout(this.closeTimer);
            if (!this.activeSelectOptionGroup) return this;

            item = this.queue[this.activeSelectQueueIndex];
            item.$display.removeAttr("data-select-option-group-opened");
            this.activeSelectOptionGroup.addClass("destroy");

            jQuery(window).unbind("resize.ax5select");
            jQuery(window).unbind("click.ax5select");
            jQuery(window).unbind("keyup.ax5select");

            this.closeTimer = setTimeout(function () {
                if (this.activeSelectOptionGroup) this.activeSelectOptionGroup.remove();
                this.activeSelectOptionGroup = null;
                this.activeSelectQueueIndex = -1;

                onStateChanged.call(this, item, {
                    self: this,
                    state: "close"
                });
            }.bind(this), cfg.animateTime);

            return this;
        };

        this.enable = function (boundID) {
            var queIdx = getQueIdx.call(this, boundID);
            this.queue[queIdx].$display.removeAttr("disabled");
            this.queue[queIdx].select.removeAttr("disabled");
            return this;
        };

        this.disable = function (boundID) {
            var queIdx = getQueIdx.call(this, boundID);
            this.queue[queIdx].$display.attr("disabled", "disabled");
            this.queue[queIdx].select.attr("disabled", "disabled");
            return this;
        };

        // 클래스 생성자
        this.main = function () {
            if (arguments && U.isObject(arguments[0])) {
                this.setConfig(arguments[0]);
            } else {
                this.init();
            }
        }.apply(this, arguments);
    };
    //== UI Class

    root.select = function () {
        if (U.isFunction(_SUPER_)) axClass.prototype = new _SUPER_(); // 상속
        return axClass;
    }(); // ax5.ui에 연결
})(ax5.ui, ax5.ui.root);

ax5.ui.select_instance = new ax5.ui.select();
jQuery.fn.ax5select = function () {
    return function (config) {
        if (typeof config == "undefined") config = {};
        jQuery.each(this, function () {
            var defaultConfig = {
                target: this
            };
            config = jQuery.extend({}, config, defaultConfig);
            ax5.ui.select_instance.bind(config);
        });
        return this;
    };
}();