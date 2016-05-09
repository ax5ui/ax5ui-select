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
     * @version 0.2.0
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

        this.instanceId = ax5.getGuid();
        this.queue = [];
        this.config = {
            theme: 'default',
            animateTime: 250,
            lang: {
                noSelected: '',
                noOptions: 'no options',
                loading: 'now loading..',
                multipleLabel: '"{{label}}"외 {{length}}건'
            },
            columnKeys: {
                optionValue: 'value',
                optionText: 'text',
                optionSelected: 'selected'
            }
        };

        this.activeSelectOptionGroup = null;
        this.activeSelectQueueIndex = -1;
        this.openTimer = null;
        this.closeTimer = null;
        this.waitOptionsCallback = null;

        cfg = this.config;

        var
            onStateChanged = function (item, that) {
                if (item && item.onStateChanged) {
                    item.onStateChanged.call(that, that);
                }
                else if (this.onStateChanged) {
                    this.onStateChanged.call(that, that);
                }

                if(that.state == "changeValue"){
                    if (item && item.onChange) {
                        item.onChange.call(that, that);
                    }
                    else if (this.onChange) {
                        this.onChange.call(that, that);
                    }
                }

                item = null;
                that = null;
                return true;
            },
            getOptionGroupTmpl = function (columnKeys) {
                return `
                <div class="ax5-ui-select-option-group {{theme}} {{size}}" data-ax5-select-option-group="{{id}}">
                    <div class="ax-select-body">
                        <div class="ax-select-option-group-content" data-select-els="content"></div>
                    </div>
                    <div class="ax-select-arrow"></div> 
                </div>
                `;
            },
            getTmpl = function () {
                return `
                <a {{^tabIndex}}href="#ax5select-{{id}}" {{/tabIndex}}{{#tabIndex}}tabindex="{{tabIndex}}" {{/tabIndex}}class="form-control {{formSize}} ax5-ui-select-display {{theme}}" 
                data-ax5-select-display="{{id}}" data-ax5-select-instance="{{instanceId}}">
                    <div class="ax5-ui-select-display-table" data-select-els="display-table">
                        <div data-ax5-select-display="label">{{label}}</div>
                        <div data-ax5-select-display="addon"> 
                            {{#multiple}}{{#reset}}
                            <span class="addon-icon-reset" data-selected-clear="true">{{{.}}}</span>
                            {{/reset}}{{/multiple}}
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
            getOptionsTmpl = function (columnKeys) {
                return `
                {{#waitOptions}}
                    <div class="ax-select-option-item">
                            <div class="ax-select-option-item-holder">
                                <span class="ax-select-option-item-cell ax-select-option-item-label">
                                    {{{lang.loading}}}
                                </span>
                            </div>
                        </div>
                {{/waitOptions}}
                {{^waitOptions}}
                    {{#options}}
                        <div class="ax-select-option-item" data-option-index="{{@i}}" data-option-value="{{${columnKeys.optionValue}}}" {{#${columnKeys.optionSelected}}}data-option-selected="true"{{/${columnKeys.optionSelected}}}>
                            <div class="ax-select-option-item-holder">
                                {{#multiple}}
                                <span class="ax-select-option-item-cell ax-select-option-item-checkbox">
                                    <span class="item-checkbox-wrap useCheckBox" data-option-checkbox-index="{{@i}}"></span>
                                </span>
                                {{/multiple}}
                                <span class="ax-select-option-item-cell ax-select-option-item-label">{{${columnKeys.optionText}}}</span>
                            </div>
                        </div>
                    {{/options}}
                    {{^options}}
                        <div class="ax-select-option-item">
                            <div class="ax-select-option-item-holder">
                                <span class="ax-select-option-item-cell ax-select-option-item-label">
                                    {{{lang.noOptions}}}
                                </span>
                            </div>
                        </div>
                    {{/options}}
                {{/waitOptions}}
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
                        if (this.queue[i].reset) {
                            this.queue[i].$display.find(".addon-icon-reset").css({
                                "line-height": this.queue[i].$display.height() + "px"
                            });
                        }
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
                }
                else if (clickEl === "optionItem") {
                    this.val(item.id, {index: target.getAttribute("data-option-index")}, undefined, "internal");

                    if (!item.multiple) this.close();
                }
                else {
                    //open and display click
                    //console.log(this.instanceId);
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
                        if (n.selected) labels.push(n[item.columnKeys.optionText]);
                    });
                }
                else {
                    if (!item.multiple && item.options && item.options[0]) labels[0] = item.options[0][item.columnKeys.optionText];
                    else labels[0] = item.lang.noSelected;
                }

                return (function () {
                    if (item.multiple && labels.length > 1) {
                        var data = {
                            label: labels[0],
                            length: labels.length - 1
                        };
                        return ax5.mustache.render(item.lang.multipleLabel, data);
                    }
                    else {
                        return labels[0];
                    }
                })();
            },
            syncLabel = function (queIdx) {
                this.queue[queIdx].$display
                    .find('[data-ax5-select-display="label"]')
                    .html(getLabel.call(this, queIdx));


            },
            bindSelectTarget = (function () {
                var selectEvent = {
                    'click': function (queIdx, e) {
                        var target = U.findParentNode(e.target, function (target) {
                            if (target.getAttribute("data-selected-clear")) {
                                //clickEl = "clear";
                                return true;
                            }
                        });

                        if (target) {
                            // selected clear
                            this.val(queIdx, {clear: true});
                        }
                        else {
                            if (self.activeSelectQueueIndex == queIdx) {
                                self.close();
                            } else {
                                self.open(queIdx);
                            }
                        }

                        //U.stopEvent(e);
                    },
                    'keyUp': function (queIdx, e) {
                        if (e.which == ax5.info.eventKeys.SPACE) {
                            selectEvent.click.call(this, queIdx, e);
                        }
                        else if (e.which == ax5.info.eventKeys.DOWN) {
                            // todo focus move
                        }
                    },
                    'selectChange': function (queIdx, e) {
                        this.val(queIdx, this.queue[queIdx].$select.val(), true);
                    }
                };
                return function (queIdx) {
                    var item = this.queue[queIdx];
                    var data = {};
                    item.selected = [];

                    if (!item.$display) {
                        /// 템플릿에 전달할 오브젝트 선언
                        data.instanceId = this.instanceId;
                        data.id = item.id;
                        data.name = item.name;
                        data.theme = item.theme;
                        data.tabIndex = item.tabIndex;
                        data.multiple = item.multiple;
                        data.reset = item.reset;

                        data.label = getLabel.call(this, queIdx);
                        data.formSize = (function () {
                            return (item.size) ? "input-" + item.size : "";
                        })();

                        item.$display = jQuery(ax5.mustache.render(getTmpl.call(this, queIdx), data));

                        if (item.$target.find("select").get(0)) {
                            item.$select = item.$target.find("select");
                            // select 속성만 변경
                            item.$select
                                .attr("tabindex", "-1")
                                .attr("class", "form-control " + data.formSize);
                            if (data.name) {
                                item.$select.attr("name", "name");
                            }
                            if (data.multiple) {
                                item.$select.attr("multiple", "multiple");
                            }
                        }
                        else {
                            item.$select = jQuery(ax5.mustache.render(getSelectTmpl.call(this, queIdx), data));
                            item.$target.append(item.$select);
                            // select append
                        }

                        item.$target.append(item.$display);
                        item.options = syncSelectOptions.call(this, queIdx, item.options);

                        item.$display
                            .unbind('click.ax5select')
                            .bind('click.ax5select', selectEvent.click.bind(this, queIdx))
                            .unbind('keyup.ax5select')
                            .bind('keyup.ax5select', selectEvent.keyUp.bind(this, queIdx));

                        // select 태그에 대한 change 이벤트 감시
                        item.$select
                            .unbind('change.ax5select')
                            .bind('change.ax5select', selectEvent.selectChange.bind(this, queIdx));

                        alignSelectDisplay.call(this);
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

                        // select 태그에 대한 change 이벤트 감시
                        item.$select
                            .unbind('change.ax5select')
                            .bind('change.ax5select', selectEvent.selectChange.bind(this, queIdx));

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
                            po.push('<option value="' + O[item.columnKeys.optionValue] + '" '
                                + (O[item.columnKeys.optionSelected] ? ' selected="selected"' : '') + '>'
                                + O[item.columnKeys.optionText] + '</option>');
                            if (O[item.columnKeys.optionSelected]) {
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
                            option[item.columnKeys.optionValue] = O.value;
                            option[item.columnKeys.optionText] = O.text;
                            option[item.columnKeys.optionSelected] = O.selected;
                            option['@index'] = OIndex;
                            if (O.selected) setSelected.call(self, queIdx, option);
                            newOptions.push(option);
                            option = null;
                        });
                        item.options = newOptions;
                    }

                    if (!item.multiple && item.selected.length == 0 && item.options && item.options[0]) {
                        item.selected.push(jQuery.extend({}, item.options[0]));
                    }

                    po = null;
                    elementOptions = null;
                    newOptions = null;
                    return item.options;
                    return item.options;
                }
            })(),
            getQueIdx = function (boundID) {
                if (!U.isString(boundID)) {
                    boundID = jQuery(boundID).data("data-ax5select-id");
                }
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
            this.onChange = cfg.onChange;
            jQuery(window).bind("resize.ax5select-display-" + this.instanceId, (function () {
                alignSelectDisplay.call(this);
            }).bind(this));
        };

        /**
         * bind select
         * @method ax5.ui.select.bind
         * @param {Object} item
         * @param {String} [item.id]
         * @param {String} [item.theme]
         * @param {Boolean} [item.multiple]
         * @param {Element} item.target
         * @param {Object[]} item.options
         * @returns {ax5.ui.select}
         */
        this.bind = function (item) {
            var
                selectConfig = {},
                queIdx;

            item = jQuery.extend(true, selectConfig, cfg, item);
            if (!item.target) {
                console.log(ax5.info.getError("ax5select", "401", "bind"));
                return this;
            }

            item.$target = jQuery(item.target);

            if (!item.id) item.id = item.$target.data("data-ax5select-id");
            if (!item.id) {
                item.id = 'ax5-select-' + ax5.getGuid();
                item.$target.data("data-ax5select-id", item.id);
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
                this.queue[queIdx] = jQuery.extend(true, {}, this.queue[queIdx], item);
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

            var onExpand = function (item) {
                item.onExpand.call({
                    self: this,
                    item: item
                }, (function (O) {
                    if (this.waitOptionsCallback) {
                        var data = {};
                        var item = this.queue[this.activeSelectQueueIndex];

                        /// 현재 selected 검증후 처리
                        (function (item, O) {
                            var optionsMap = {};
                            O.options.forEach(function (_O, _OIndex) {
                                _O["@index"] = _OIndex;
                                optionsMap[_O[item.columnKeys.optionValue]] = _O;
                            });
                            if(U.isArray(item.selected)) {
                                item.selected.forEach(function (_O) {
                                    if (optionsMap[_O[item.columnKeys.optionValue]]) {
                                        O.options[optionsMap[_O[item.columnKeys.optionValue]]["@index"]][item.columnKeys.optionSelected] = true;
                                    }
                                });
                            }
                        })(item, O);


                        item.$display
                            .find('[data-ax5-select-display="label"]')
                            .html(getLabel.call(this, this.activeSelectQueueIndex));
                        item.options = syncSelectOptions.call(this, this.activeSelectQueueIndex, O.options);

                        alignSelectDisplay.call(this);

                        /// 템플릿에 전달할 오브젝트 선언
                        data.id = item.id;
                        data.theme = item.theme;
                        data.size = "ax5-ui-select-option-group-" + item.size;
                        data.multiple = item.multiple;
                        data.lang = item.lang;
                        data.options = item.options;
                        this.activeSelectOptionGroup.find('[data-select-els="content"]').html(jQuery(ax5.mustache.render(getOptionsTmpl.call(this, item.columnKeys), data)));
                    }
                }).bind(this));
            };

            return function (boundID, tryCount) {
                this.waitOptionsCallback = null;

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

                data.lang = item.lang;
                item.$display.attr("data-select-option-group-opened", "true");
                //console.log(data.lang);

                if (item.onExpand) {
                    // onExpand 인 경우 UI 대기모드 추가
                    data.waitOptions = true;
                }

                data.options = item.options;
                this.activeSelectOptionGroup = jQuery(ax5.mustache.render(getOptionGroupTmpl.call(this, item.columnKeys), data));
                this.activeSelectOptionGroup.find('[data-select-els="content"]').html(jQuery(ax5.mustache.render(getOptionsTmpl.call(this, item.columnKeys), data)));
                this.activeSelectQueueIndex = queIdx;

                alignSelectOptionGroup.call(this, "append"); // alignSelectOptionGroup 에서 body append
                jQuery(window).bind("resize.ax5select-" + this.instanceId, (function () {
                    alignSelectOptionGroup.call(this);
                }).bind(this));

                if (item.selected && item.selected.length > 0) {
                    selectedOptionEl = this.activeSelectOptionGroup.find('[data-option-index="' + item.selected[0]["@index"] + '"]');

                    if (selectedOptionEl.get(0)) {
                        focusTop = selectedOptionEl.position().top - this.activeSelectOptionGroup.height() / 3;
                        this.activeSelectOptionGroup.find('[data-select-els="content"]')
                            .stop().animate({scrollTop: focusTop}, item.animateTime, 'swing', function () {
                        });
                    }
                }

                // bind key event
                jQuery(window).bind("keyup.ax5select-" + this.instanceId, (function (e) {
                    e = e || window.event;
                    onBodyKeyup.call(this, e);
                    U.stopEvent(e);
                }).bind(this));

                jQuery(window).bind("click.ax5select-" + this.instanceId, (function (e) {
                    e = e || window.event;
                    onBodyClick.call(this, e);
                    U.stopEvent(e);
                }).bind(this));

                onStateChanged.call(this, item, {
                    self: this,
                    state: "open",
                    boundObject: item
                });

                // waitOption timer
                if (item.onExpand) {
                    this.waitOptionsCallback = true;
                    onExpand.call(this, item);
                }

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
         * @param {Boolean} [selected]
         * @returns {ax5.ui.select}
         */
        this.val = (function () {

            // todo : val 함수 리팩토링 필요
            var getSelected = function (_item, o, selected) {
                if (typeof selected === "undefined") {
                    return (_item.multiple) ? !o : true;
                } else {
                    return selected;
                }
            };
            var clearSelected = function (queIdx) {
                this.queue[queIdx].options.forEach(function (n) {
                    n.selected = false;
                });
            };

            var processor = {
                'index': function (queIdx, value, selected) {
                    // 클래스 내부에서 호출된 형태, 그런 이유로 옵션그룹에 대한 상태를 변경 하고 있다.
                    var item = this.queue[queIdx];
                    if (U.isArray(value.index)) {
                        value.index.forEach(function (n) {
                            item.options[n][item.columnKeys.optionSelected] = getSelected(item, item.options[n][item.columnKeys.optionSelected], selected);
                            self.activeSelectOptionGroup
                                .find('[data-option-index="' + n + '"]')
                                .attr("data-option-selected", item.options[n][item.columnKeys.optionSelected].toString());
                        });
                    }
                    else {
                        item.options[value.index][item.columnKeys.optionSelected] = getSelected(item, item.options[value.index][item.columnKeys.optionSelected], selected);
                        self.activeSelectOptionGroup
                            .find('[data-option-index="' + value.index + '"]')
                            .attr("data-option-selected", item.options[value.index][item.columnKeys.optionSelected].toString());
                    }

                    syncSelectOptions.call(this, queIdx, item.options);
                    syncLabel.call(this, queIdx);
                    alignSelectOptionGroup.call(this);
                },
                'arr': function (queIdx, values, selected) {
                    values.forEach(function (value) {
                        if (U.isString(value) || U.isNumber(value)) {
                            processor.value.call(self, queIdx, value, selected);
                        }
                        else {
                            for (var key in processor) {
                                if (value[key]) {
                                    processor[key].call(self, queIdx, value, selected);
                                    break;
                                }
                            }
                        }
                    });
                },
                'value': function (queIdx, value, selected) {
                    var item = this.queue[queIdx];
                    var optionIndex = U.search(item.options, function () {
                        return this[item.columnKeys.optionValue] == value;
                    });
                    if (optionIndex > -1) {
                        item.options[optionIndex][item.columnKeys.optionSelected] = getSelected(item, item.options[optionIndex][item.columnKeys.optionSelected], selected);
                    }
                    else {
                        console.log(ax5.info.getError("ax5select", "501", "val"));
                        return;
                    }

                    syncSelectOptions.call(this, queIdx, item.options);
                    syncLabel.call(this, queIdx);
                },
                'text': function (queIdx, value, selected) {
                    var item = this.queue[queIdx];
                    var optionIndex = U.search(item.options, function () {
                        return this[item.columnKeys.optionText] == value;
                    });
                    if (optionIndex > -1) {
                        item.options[optionIndex][item.columnKeys.optionSelected] = getSelected(item, item.options[optionIndex][item.columnKeys.optionSelected], selected);
                    }
                    else {
                        console.log(ax5.info.getError("ax5select", "501", "val"));
                        return;
                    }

                    syncSelectOptions.call(this, queIdx, item.options);
                    syncLabel.call(this, queIdx);
                },
                'clear': function (queIdx) {
                    clearSelected.call(this, queIdx);
                    syncSelectOptions.call(this, queIdx, this.queue[queIdx].options);
                    syncLabel.call(this, queIdx);

                    if (this.activeSelectOptionGroup) {
                        this.activeSelectOptionGroup
                            .find('[data-option-index]')
                            .attr("data-option-selected", "false");
                    }
                }
            };

            return function (boundID, value, selected, internal) {
                var queIdx = (U.isNumber(boundID)) ? boundID : getQueIdx.call(this, boundID);
                if (queIdx === -1) {
                    console.log(ax5.info.getError("ax5select", "402", "val"));
                    return;
                }

                // setValue 이면 현재 선택값 초기화
                if (typeof value !== "undefined" && !this.queue[queIdx].multiple) {
                    clearSelected.call(this, queIdx);
                }

                if (typeof value == "undefined") {
                    return this.queue[queIdx].selected;
                }
                else if (U.isArray(value)) {
                    processor.arr.call(this, queIdx, value, selected);
                }
                else if (U.isString(value) || U.isNumber(value)) {
                    processor.value.call(this, queIdx, value, selected);
                }
                else {
                    if (value === null) {
                        processor.clear.call(this, queIdx);
                    }
                    else {
                        for (var key in processor) {
                            if (value[key]) {
                                processor[key].call(this, queIdx, value, selected);
                                break;
                            }
                        }
                    }
                }

                if (typeof value !== "undefined") {
                    onStateChanged.call(this, this.queue[queIdx], {
                        self: this,
                        item: this.queue[queIdx],
                        state: (internal) ? "changeValue" : "setValue",
                        value: this.queue[queIdx].selected,
                        internal: internal
                    });
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

            jQuery(window).unbind("resize.ax5select-" + this.instanceId);
            jQuery(window).unbind("click.ax5select-" + this.instanceId);
            jQuery(window).unbind("keyup.ax5select-" + this.instanceId);

            this.closeTimer = setTimeout((function () {
                if (this.activeSelectOptionGroup) this.activeSelectOptionGroup.remove();
                this.activeSelectOptionGroup = null;
                this.activeSelectQueueIndex = -1;

                onStateChanged.call(this, item, {
                    self: this,
                    state: "close"
                });

            }).bind(this), cfg.animateTime);
            this.waitOptionsCallback = null;
            return this;
        };

        this.enable = function (boundID) {
            var queIdx = getQueIdx.call(this, boundID);
            this.queue[queIdx].$display.removeAttr("disabled");
            this.queue[queIdx].$select.removeAttr("disabled");

            onStateChanged.call(this, this.queue[queIdx], {
                self: this,
                state: "enable"
            });

            return this;
        };

        this.disable = function (boundID) {
            var queIdx = getQueIdx.call(this, boundID);
            this.queue[queIdx].$display.attr("disabled", "disabled");
            this.queue[queIdx].$select.attr("disabled", "disabled");

            onStateChanged.call(this, this.queue[queIdx], {
                self: this,
                state: "disable"
            });

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
            var methodName = arguments[0];

            switch (methodName) {
                case "open":
                    return ax5.ui.select_instance.open(this);
                    break;
                case "close":
                    return ax5.ui.select_instance.close(this);
                    break;
                case "setValue":
                    return ax5.ui.select_instance.val(this, arguments[1], arguments[2]);
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