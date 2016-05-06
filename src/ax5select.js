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
    var axClass = function () {
        var
            self = this,
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

        var
            onStateChanged = function (item, that) {
                if (item && item.onStateChanged) {
                    item.onStateChanged.call(that, that);
                }
                else if (this.onStateChanged) {
                    this.onStateChanged.call(that, that);
                }
                item = null;
                that = null;
                return true;
            },
            getOptionGroupTmpl = function (columnKeys) {
                return `
                <div class="ax5-ui-select-option-group {{theme}} {{size}}" data-ax5-select-option-group="{{id}}">
                    <div class="ax-select-body">
                        <div class="ax-select-option-group-content" data-select-els="content">
                        {{#options}}
                            <div class="ax-select-option-item" data-option-index="{{@i}}" data-option-value="{{${columnKeys.optionValue}}}" {{#${columnKeys.optionSelected}}}data-option-selected="true"{{/${columnKeys.optionSelected}}}>
                                <div class="ax-select-option-item-holder">
                                    {{#multiple}}
                                    <span class="ax-select-option-item-cell ax-select-option-item-checkbox">
                                        <span class="item-checkbox-wrap useCheckBox" data-option-checkbox-index="{{@i}}"></span>
                                    </span>
                                    {{/multiple}}
                                    {{^multiple}}
                                    
                                    {{/multiple}}
                                    <span class="ax-select-option-item-cell ax-select-option-item-label">{{${columnKeys.optionText}}}</span>
                                </div>
                            </div>
                        {{/options}}
                        </div>
                    </div>
                    <div class="ax-select-arrow"></div> 
                </div>
                `;
            },
            getTmpl = function () {
                return `
                <a {{^tabIndex}}href="#ax5select-{{id}}" {{/tabIndex}}{{#tabIndex}}tabindex="{{tabIndex}}" {{/tabIndex}}class="form-control {{formSize}} ax5-ui-select-display {{theme}}" 
                data-ax5-select-display="{{id}}">
                    <div class="ax5-ui-select-display-table" data-select-els="display-table">
                        <div data-ax5-select-display="label">{{label}}</div>
                        <div data-ax5-select-display="addon" data-ax5-select-opened="false">
                            {{#icons}}
                            <span class="addon-icon-closed">{{clesed}}</span>
                            <span class="addon-icon-opened">{{opened}}</span>
                            {{/icons}}
                            {{^icons}}
                            <span class="addon-icon-closed"><span class="addon-icon-arrow"></span></span>
                            <span class="addon-icon-opened"><span class="addon-icon-arrow"></span></span>
                            {{/icons}}
                        </div>
                    </div>
                </a>
                `;
            },
            getSelectTmpl = function () {
                return `
                <select tabindex="-1" class="form-control {{formSize}}" name="{{name}}" {{#multiple}}multiple="multiple"{{/multiple}}></select>
                `;
            },
            alignSelectDisplay = function () {
                var i = this.queue.length, w;
                while (i--) {
                    if (this.queue[i].$display) {
                        w = Math.max(this.queue[i].$select.outerWidth(), U.number(this.queue[i].minWidth));
                        this.queue[i].$display.css({
                            "min-width": w
                        });
                    }
                }

                i = null;
                w = null;
                return this;
            },
            alignSelectOptionGroup = function (append) {
                if (!this.activeSelectOptionGroup) return this;

                var
                    item = this.queue[this.activeSelectQueueIndex],
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
                    this.activeSelectOptionGroup
                        .addClass("direction-" + item.direction);
                }
                this.activeSelectOptionGroup
                    .css((function () {
                        if (item.direction == "top") {
                            return {
                                left: pos.left,
                                top: pos.top + dim.height + 1,
                                width: dim.width
                            }
                        }
                        else if (item.direction == "bottom") {
                            return {
                                left: pos.left,
                                top: pos.top - this.activeSelectOptionGroup.outerHeight() - 1,
                                width: dim.width
                            }
                        }
                    }).call(this));
            },
            onBodyClick = function (e, target) {
                if (!this.activeSelectOptionGroup) return this;

                var
                    item = this.queue[this.activeSelectQueueIndex],
                    clickEl = "display"
                    ;

                target = U.findParentNode(e.target, function (target) {
                    if (target.getAttribute("data-option-value")) {
                        clickEl = "optionItem";
                        return true;
                    }
                    else if (item.$target.get(0) == target) {
                        clickEl = "display";
                        return true;
                    }
                });

                if (!target) {
                    this.close();
                    return this;
                } else if (clickEl != "display") {
                    this.val(item.id, {index: target.getAttribute("data-option-index")});
                    if (!item.multiple) this.close();
                }

                return this;
            },
            onBodyKeyup = function (e) {
                if (e.keyCode == ax5.info.eventKeys.ESC) {
                    this.close();
                }
            },
            getLabel = function (queIdx) {
                var item = this.queue[queIdx];
                var labels = [];
                if (U.isArray(item.selected) && item.selected.length > 0) {
                    item.selected.forEach(function (n) {
                        if (n.selected) labels.push(n[cfg.columnKeys.optionText]);
                    });
                }
                else {
                    if (!item.multiple && item.options[0]) labels[0] = item.options[0][cfg.columnKeys.optionText];
                    else labels[0] = "";
                }

                return (function () {
                    if (item.multiple && labels.length > 1) {
                        var data = {
                            label: labels[0],
                            length: labels.length - 1
                        };
                        return ax5.mustache.render(cfg.lang.multipleLabel, data);
                    }
                    else {
                        return labels[0];
                    }
                })();
            },
            syncLabel = function(queIdx){
                this.queue[queIdx].$display
                    .find('[data-ax5-select-display="label"]')
                    .html(getLabel.call(this, queIdx));


            },
            bindSelectTarget = (function () {
                var selectEvent = {
                    'click': function (queIdx, e) {
                        if (self.activeSelectQueueIndex == queIdx) {
                            self.close();
                        } else {
                            self.open(queIdx);
                        }
                        U.stopEvent(e);
                    },
                    'keyUp': function (queIdx, e) {
                        if (e.which == ax5.info.eventKeys.SPACE) {
                            selectEvent.click.call(this, queIdx, e);
                        }
                        else if (e.which == ax5.info.eventKeys.DOWN) {
                            // todo focus move
                        }
                    }
                };
                return function (queIdx) {
                    var item = this.queue[queIdx];
                    var data = {};

                    if (!item.$display) {
                        /// 템플릿에 전달할 오브젝트 선언
                        data.id = item.id;
                        data.name = item.name;
                        data.theme = item.theme;
                        data.tabIndex = item.tabIndex;
                        data.multiple = item.multiple;

                        data.label = getLabel.call(this, queIdx);
                        data.formSize = (function () {
                            return (item.size) ? "input-" + item.size : "";
                        })();


                        item.$display = jQuery(ax5.mustache.render(getTmpl.call(this, queIdx), data));
                        item.$select = jQuery(ax5.mustache.render(getSelectTmpl.call(this, queIdx), data));
                        item.$target.append(item.$select).append(item.$display);
                        item.options = syncSelectOptions.call(this, queIdx, item.options);

                        item.$display
                            .unbind('click.ax5select')
                            .bind('click.ax5select', selectEvent.click.bind(this, queIdx))
                            .unbind('keyup.ax5select')
                            .bind('keyup.ax5select', selectEvent.keyUp.bind(this, queIdx));

                        //setTimeout((function(){
                        alignSelectDisplay.call(this);
                        //}).bind(this), 100);

                    }
                    else {

                        item.$display
                            .find('[data-ax5-select-display="label"]')
                            .html(getLabel.call(this, queIdx));
                        item.options = syncSelectOptions.call(this, queIdx, item.options);

                        item.$display
                            .unbind('click.ax5select')
                            .bind('click.ax5select', selectEvent.click.bind(this, queIdx))
                            .unbind('keyup.ax5select')
                            .bind('keyup.ax5select', selectEvent.keyUp.bind(this, queIdx));

                        alignSelectDisplay.call(this);
                    }

                    data = null;
                    item = null;
                    queIdx = null;
                    return this;
                };
            })(),
            syncSelectOptions = (function () {
                var setSelected = function (queIdx, O) {
                    if (!O) {
                        this.queue[queIdx].selected = [];
                    }
                    else {
                        if (this.queue[queIdx].multiple) this.queue[queIdx].selected.push(jQuery.extend({}, O));
                        else this.queue[queIdx].selected[0] = jQuery.extend({}, O);
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
                        item.$select.html(po.join(''));
                    }
                    else {
                        elementOptions = U.toArray(item.$select.get(0).options);
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
                }
            })(),
            getQueIdx = function (boundID) {
                if (!U.isString(boundID)) boundID = jQuery(boundID).data("ax5-select");
                if (!U.isString(boundID)) {
                    console.log(ax5.info.getError("ax5select", "402", "getQueIdx"));
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
            jQuery(window).bind("resize.ax5select-display", (function () {
                alignSelectDisplay.call(this);
            }).bind(this));
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
            var
                selectConfig = {},
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
            item.name = item.$target.attr("data-ax5select");
            if (item.options) {
                item.options = JSON.parse(JSON.stringify(item.options));
            }

            // target attribute data
            (function (data) {
                if (U.isObject(data) && !data.error) {
                    item = jQuery.extend(true, item, data);
                }
            })(U.parseJson(item.$target.attr("data-ax5select-config"), true));

            queIdx = U.search(this.queue, function () {
                return this.id == item.id;
            });

            if (queIdx === -1) {
                this.queue.push(item);
                bindSelectTarget.call(this, this.queue.length - 1);
            }
            else {
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
         * @param {(String|Number|Element)} boundID
         * @param {Number} [tryCount]
         * @returns {ax5.ui.select}
         */
        this.open = (function () {

            return function (boundID, tryCount) {
                /**
                 * open select from the outside
                 */
                var queIdx = (U.isNumber(boundID)) ? boundID : getQueIdx.call(this, boundID);
                var item = this.queue[queIdx];
                var data = {}, focusTop, selectedOptionEl;

                if (item.$display.attr("disabled")) return this;

                if (this.openTimer) clearTimeout(this.openTimer);
                if (this.activeSelectOptionGroup) {
                    if (this.activeSelectQueueIndex == queIdx) {
                        return this;
                    }

                    if (tryCount > 2) return this;
                    this.close();
                    this.openTimer = setTimeout((function () {
                        this.open(queIdx, (tryCount || 0) + 1);
                    }).bind(this), cfg.animateTime);

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
                jQuery(window).bind("resize.ax5select", (function () {
                    alignSelectOptionGroup.call(this);
                }).bind(this));

                if (item.selected && item.selected.length > 0) {
                    selectedOptionEl = this.activeSelectOptionGroup.find('[data-option-index="' + item.selected[0]["@index"] + '"]');
                    if (selectedOptionEl.get(0)) {
                        focusTop = selectedOptionEl.position().top - this.activeSelectOptionGroup.height() / 3;
                        this.activeSelectOptionGroup.find('[data-select-els="content"]')
                            .stop().animate({scrollTop: focusTop}, cfg.animateTime, 'swing', function () {
                        });
                    }
                }

                // bind key event
                jQuery(window).bind("keyup.ax5select", (function (e) {
                    e = e || window.event;
                    onBodyKeyup.call(this, e);
                    U.stopEvent(e);
                }).bind(this));

                jQuery(window).bind("click.ax5select", (function (e) {
                    e = e || window.event;
                    onBodyClick.call(this, e);
                    U.stopEvent(e);
                }).bind(this));

                onStateChanged.call(this, item, {
                    self: this,
                    state: "open",
                    boundObject: item
                });

                data = null;
                focusTop = null;
                selectedOptionEl = null;
                return this;
            }
        })();

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
         * @method ax5.ui.select.val
         * @param {(String|Number|Element)} boundID
         * @param {(String|Object|Array)} [value]
         * @returns {ax5.ui.select}
         */
        this.val = (function () {

            // todo : val 함수 리팩토링 필요
            var getSelected = function (_item, o) {
                return (_item.multiple) ? !o : true;
            };
            var clearSelected = function(queIdx){
                this.queue[queIdx].options.forEach(function (n) {
                    n.selected = false;
                });
            };

            var processor = {
                'index': function (queIdx, value) {
                    // 클래스 내부에서 호출된 형태, 그런 이유로 옵션그룹에 대한 상태를 변경 하고 있다.
                    if (U.isArray(value.index)) {
                        value.index.forEach(function (n) {
                            self.queue[queIdx].options[n][cfg.columnKeys.optionSelected] = getSelected(self.queue[queIdx], self.queue[queIdx].options[n][cfg.columnKeys.optionSelected]);
                            self.activeSelectOptionGroup
                                .find('[data-option-index="' + n + '"]')
                                .attr("data-option-selected", self.queue[queIdx].options[n][cfg.columnKeys.optionSelected].toString());
                        });
                    }
                    else {
                        self.queue[queIdx].options[value.index][cfg.columnKeys.optionSelected] = getSelected(self.queue[queIdx], self.queue[queIdx].options[value.index][cfg.columnKeys.optionSelected]);
                        self.activeSelectOptionGroup
                            .find('[data-option-index="' + value.index + '"]')
                            .attr("data-option-selected", self.queue[queIdx].options[value.index][cfg.columnKeys.optionSelected].toString());
                    }

                    syncSelectOptions.call(this, queIdx, this.queue[queIdx].options);
                    syncLabel.call(this, queIdx);
                    alignSelectOptionGroup.call(this);
                },
                'arr': function (queIdx, value) {

                },
                'value': function (queIdx, value) {
                    var optionIndex = U.search(this.queue[queIdx].options, function(){
                        return this[cfg.columnKeys.optionValue] == value;
                    });
                    if(optionIndex > 0) {
                        this.queue[queIdx].options[optionIndex][cfg.columnKeys.optionSelected] = getSelected(self.queue[queIdx], this.queue[queIdx].options[optionIndex][cfg.columnKeys.optionSelected]);
                    }
                    else{
                        console.log(ax5.info.getError("ax5select", "501", "val"));
                        return;
                    }

                    syncSelectOptions.call(this, queIdx, this.queue[queIdx].options);
                    syncLabel.call(this, queIdx);
                },
                'text': function (queIdx, value) {
                    var optionIndex = U.search(this.queue[queIdx].options, function(){
                        return this[cfg.columnKeys.optionText] == value;
                    });
                    if(optionIndex > 0) {
                        this.queue[queIdx].options[optionIndex][cfg.columnKeys.optionSelected] = getSelected(self.queue[queIdx], this.queue[queIdx].options[optionIndex][cfg.columnKeys.optionSelected]);
                    }
                    else{
                        console.log(ax5.info.getError("ax5select", "501", "val"));
                        return;
                    }

                    syncSelectOptions.call(this, queIdx, this.queue[queIdx].options);
                    syncLabel.call(this, queIdx);
                }
            };

            return function (boundID, value) {
                var queIdx = getQueIdx.call(this, boundID);
                // setValue 이면 현재 선택값 초기화
                if (typeof value !== "undefined" && !this.queue[queIdx].multiple) {
                    clearSelected.call(this, queIdx);
                }

                if (typeof value == "undefined") {
                    return this.queue[queIdx].selected;
                }
                else if (U.isArray(value)) {
                    processor.arr.call(this, queIdx, value);
                }
                else if (U.isString(value) || U.isNumber(value)) {
                    processor.value.call(this, queIdx, value);
                }
                else {
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
        })();

        /**
         * @method ax5.ui.select.close
         * @returns {ax5.ui.select}
         */
        this.close = function (item) {
            if (this.closeTimer) clearTimeout(this.closeTimer);
            if (!this.activeSelectOptionGroup) return this;

            item = this.queue[this.activeSelectQueueIndex];
            item.$display.removeAttr("data-select-option-group-opened");
            this.activeSelectOptionGroup.addClass("destroy");

            jQuery(window).unbind("resize.ax5select");
            jQuery(window).unbind("click.ax5select");
            jQuery(window).unbind("keyup.ax5select");

            this.closeTimer = setTimeout((function () {
                if (this.activeSelectOptionGroup) this.activeSelectOptionGroup.remove();
                this.activeSelectOptionGroup = null;
                this.activeSelectQueueIndex = -1;

                onStateChanged.call(this, item, {
                    self: this,
                    state: "close"
                });

            }).bind(this), cfg.animateTime);

            return this;
        };

        this.enable = function (boundID) {
            var queIdx = getQueIdx.call(this, boundID);
            this.queue[queIdx].$display.removeAttr("disabled");
            this.queue[queIdx].$select.removeAttr("disabled");
            return this;
        };

        this.disable = function (boundID) {
            var queIdx = getQueIdx.call(this, boundID);
            this.queue[queIdx].$display.attr("disabled", "disabled");
            this.queue[queIdx].$select.attr("disabled", "disabled");
            return this;
        };

        // 클래스 생성자
        this.main = (function () {
            if (arguments && U.isObject(arguments[0])) {
                this.setConfig(arguments[0]);
            }
            else {
                this.init();
            }
        }).apply(this, arguments);
    };
    //== UI Class

    root.select = (function () {
        if (U.isFunction(_SUPER_)) axClass.prototype = new _SUPER_(); // 상속
        return axClass;
    })(); // ax5.ui에 연결

})(ax5.ui, ax5.ui.root);

ax5.ui.select_instance = new ax5.ui.select();
jQuery.fn.ax5select = (function () {
    return function (config) {
        if (ax5.util.isString(arguments[0])) {
            var methodName = arguments[0],
                arg = arguments[1];

            switch (methodName) {
                case "open":
                    return ax5.ui.select_instance.open(this);
                    break;
                case "close":
                    return ax5.ui.select_instance.close(this);
                    break;
                case "setValue":
                    return ax5.ui.select_instance.val(this, arg);
                    break;
                case "getValue":
                    return ax5.ui.select_instance.val(this);
                    break;
                case "enable":
                    return ax5.ui.select_instance.enable(this);
                    break;
                case "disable":
                    return ax5.ui.select_instance.disable(this);
                    break;

                default:
                    return this;
            }
        }
        else {
            if (typeof config == "undefined") config = {};
            jQuery.each(this, function () {
                var defaultConfig = {
                    target: this
                };
                config = jQuery.extend({}, config, defaultConfig);
                ax5.ui.select_instance.bind(config);
            });
        }
        return this;
    }
})();