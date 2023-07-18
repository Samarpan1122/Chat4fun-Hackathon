//third_party/javascript/material_design_lite/mdlComponentHandler.js
/**
 * @license
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * A component handler interface using the revealing module design pattern.
 * More details on this design pattern here:
 * https://github.com/jasonmayes/mdl-component-design-pattern
 *
 * @author Jason Mayes.
 */
/* exported componentHandler */

// Pre-defining the componentHandler interface, for closure documentation and
// static verification.
var componentHandler = {
    /**
   * Searches existing DOM for elements of our component type and upgrades them
   * if they have not already been upgraded.
   *
   * @param {string=} optJsClass the programatic name of the element class we
   * need to create a new instance of.
   * @param {string=} optCssClass the name of the CSS class elements of this
   * type will have.
   */
    upgradeDom: function(optJsClass, optCssClass) {},
    /**
   * Upgrades a specific element rather than all in the DOM.
   *
   * @param {!Element} element The element we wish to upgrade.
   * @param {string=} optJsClass Optional name of the class we want to upgrade
   * the element to.
   */
    upgradeElement: function(element, optJsClass) {},
    /**
   * Upgrades a specific list of elements rather than all in the DOM.
   *
   * @param {!Element|!Array<!Element>|!NodeList|!HTMLCollection} elements
   * The elements we wish to upgrade.
   */
    upgradeElements: function(elements) {},
    /**
   * Upgrades all registered components found in the current DOM. This is
   * automatically called on window load.
   */
    upgradeAllRegistered: function() {},
    /**
   * Allows user to be alerted to any upgrades that are performed for a given
   * component type
   *
   * @param {string} jsClass The class name of the MDL component we wish
   * to hook into for any upgrades performed.
   * @param {function(!HTMLElement)} callback The function to call upon an
   * upgrade. This function should expect 1 parameter - the HTMLElement which
   * got upgraded.
   */
    registerUpgradedCallback: function(jsClass, callback) {},
    /**
   * Registers a class for future use and attempts to upgrade existing DOM.
   *
   * @param {componentHandler.ComponentConfigPublic} config the registration configuration
   */
    register: function(config) {},
    /**
   * Downgrade either a given node, an array of nodes, or a NodeList.
   *
   * @param {!Node|!Array<!Node>|!NodeList} nodes
   */
    downgradeElements: function(nodes) {}
};

componentHandler = (function() {
    'use strict';

    /** @type {!Array<componentHandler.ComponentConfig>} */
    var registeredComponents_ = [];

    /** @type {!Array<componentHandler.Component>} */
    var createdComponents_ = [];

    var componentConfigProperty_ = 'mdlComponentConfigInternal_';

    /**
   * Searches registered components for a class we are interested in using.
   * Optionally replaces a match with passed object if specified.
   *
   * @param {string} name The name of a class we want to use.
   * @param {componentHandler.ComponentConfig=} optReplace Optional object to replace match with.
   * @return {!Object|boolean}
   * @private
   */
    function findRegisteredClass_(name, optReplace) {
        for (var i = 0; i < registeredComponents_.length; i++) {
            if (registeredComponents_[i].className === name) {
                if (typeof optReplace !== 'undefined') {
                    registeredComponents_[i] = optReplace;
                }
                return registeredComponents_[i];
            }
        }
        return false;
    }

    /**
   * Returns an array of the classNames of the upgraded classes on the element.
   *
   * @param {!Element} element The element to fetch data from.
   * @return {!Array<string>}
   * @private
   */
    function getUpgradedListOfElement_(element) {
        var dataUpgraded = element.getAttribute('data-upgraded');
        // Use `['']` as default value to conform the `,name,name...` style.
        return dataUpgraded === null ? [''] : dataUpgraded.split(',');
    }

    /**
   * Returns true if the given element has already been upgraded for the given
   * class.
   *
   * @param {!Element} element The element we want to check.
   * @param {string} jsClass The class to check for.
   * @returns {boolean}
   * @private
   */
    function isElementUpgraded_(element, jsClass) {
        var upgradedList = getUpgradedListOfElement_(element);
        return upgradedList.indexOf(jsClass) !== -1;
    }

    /**
   * Create an event object.
   *
   * @param {string} eventType The type name of the event.
   * @param {boolean} bubbles Whether the event should bubble up the DOM.
   * @param {boolean} cancelable Whether the event can be canceled.
   * @returns {!Event}
   */
    function createEvent_(eventType, bubbles, cancelable) {
        if ('CustomEvent'in window && typeof window.CustomEvent === 'function') {
            return new CustomEvent(eventType,{
                bubbles: bubbles,
                cancelable: cancelable
            });
        } else {
            var ev = document.createEvent('Events');
            ev.initEvent(eventType, bubbles, cancelable);
            return ev;
        }
    }

    /**
   * Searches existing DOM for elements of our component type and upgrades them
   * if they have not already been upgraded.
   *
   * @param {string=} optJsClass the programatic name of the element class we
   * need to create a new instance of.
   * @param {string=} optCssClass the name of the CSS class elements of this
   * type will have.
   */
    function upgradeDomInternal(optJsClass, optCssClass) {
        if (typeof optJsClass === 'undefined' && typeof optCssClass === 'undefined') {
            for (var i = 0; i < registeredComponents_.length; i++) {
                upgradeDomInternal(registeredComponents_[i].className, registeredComponents_[i].cssClass);
            }
        } else {
            var jsClass = /** @type {string} */
            (optJsClass);
            if (typeof optCssClass === 'undefined') {
                var registeredClass = findRegisteredClass_(jsClass);
                if (registeredClass) {
                    optCssClass = registeredClass.cssClass;
                }
            }

            var elements = document.querySelectorAll('.' + optCssClass);
            for (var n = 0; n < elements.length; n++) {
                upgradeElementInternal(elements[n], jsClass);
            }
        }
    }

    /**
   * Upgrades a specific element rather than all in the DOM.
   *
   * @param {!Element} element The element we wish to upgrade.
   * @param {string=} optJsClass Optional name of the class we want to upgrade
   * the element to.
   */
    function upgradeElementInternal(element, optJsClass) {
        // Verify argument type.
        if (!(typeof element === 'object' && element instanceof Element)) {
            throw new Error('Invalid argument provided to upgrade MDL element.');
        }
        // Allow upgrade to be canceled by canceling emitted event.
        var upgradingEv = createEvent_('mdl-componentupgrading', true, true);
        element.dispatchEvent(upgradingEv);
        if (upgradingEv.defaultPrevented) {
            return;
        }

        var upgradedList = getUpgradedListOfElement_(element);
        var classesToUpgrade = [];
        // If jsClass is not provided scan the registered components to find the
        // ones matching the element's CSS classList.
        if (!optJsClass) {
            var classList = element.classList;
            registeredComponents_.forEach(function(component) {
                // Match CSS & Not to be upgraded & Not upgraded.
                if (classList.contains(component.cssClass) && classesToUpgrade.indexOf(component) === -1 && !isElementUpgraded_(element, component.className)) {
                    classesToUpgrade.push(component);
                }
            });
        } else if (!isElementUpgraded_(element, optJsClass)) {
            classesToUpgrade.push(findRegisteredClass_(optJsClass));
        }

        // Upgrade the element for each classes.
        for (var i = 0, n = classesToUpgrade.length, registeredClass; i < n; i++) {
            registeredClass = classesToUpgrade[i];
            if (registeredClass) {
                // Mark element as upgraded.
                upgradedList.push(registeredClass.className);
                element.setAttribute('data-upgraded', upgradedList.join(','));
                var instance = new registeredClass.classConstructor(element);
                instance[componentConfigProperty_] = registeredClass;
                createdComponents_.push(instance);
                // Call any callbacks the user has registered with this component type.
                for (var j = 0, m = registeredClass.callbacks.length; j < m; j++) {
                    registeredClass.callbacks[j](element);
                }

                if (registeredClass.widget) {
                    // Assign per element instance for control over API
                    element[registeredClass.className] = instance;
                }
            } else {
                throw new Error('Unable to find a registered component for the given class.');
            }

            var upgradedEv = createEvent_('mdl-componentupgraded', true, false);
            element.dispatchEvent(upgradedEv);
        }
    }

    /**
   * Upgrades a specific list of elements rather than all in the DOM.
   *
   * @param {!Element|!Array<!Element>|!NodeList|!HTMLCollection} elements
   * The elements we wish to upgrade.
   */
    function upgradeElementsInternal(elements) {
        if (!Array.isArray(elements)) {
            if (elements instanceof Element) {
                elements = [elements];
            } else {
                elements = Array.prototype.slice.call(elements);
            }
        }
        for (var i = 0, n = elements.length, element; i < n; i++) {
            element = elements[i];
            if (element instanceof HTMLElement) {
                upgradeElementInternal(element);
                if (element.children.length > 0) {
                    upgradeElementsInternal(element.children);
                }
            }
        }
    }

    /**
   * Registers a class for future use and attempts to upgrade existing DOM.
   *
   * @param {componentHandler.ComponentConfigPublic} config
   */
    function registerInternal(config) {
        // In order to support both Closure-compiled and uncompiled code accessing
        // this method, we need to allow for both the dot and array syntax for
        // property access. You'll therefore see the `foo.bar || foo['bar']`
        // pattern repeated across this method.
        var widgetMissing = (typeof config.widget === 'undefined' && typeof config['widget'] === 'undefined');
        var widget = true;

        if (!widgetMissing) {
            widget = config.widget || config['widget'];
        }

        var newConfig = /** @type {componentHandler.ComponentConfig} */
        ({
            classConstructor: config.constructor || config['constructor'],
            className: config.classAsString || config['classAsString'],
            cssClass: config.cssClass || config['cssClass'],
            widget: widget,
            callbacks: []
        });

        registeredComponents_.forEach(function(item) {
            if (item.cssClass === newConfig.cssClass) {
                throw new Error('The provided cssClass has already been registered: ' + item.cssClass);
            }
            if (item.className === newConfig.className) {
                throw new Error('The provided className has already been registered');
            }
        });

        if (config.constructor.prototype.hasOwnProperty(componentConfigProperty_)) {
            throw new Error('MDL component classes must not have ' + componentConfigProperty_ + ' defined as a property.');
        }

        var found = findRegisteredClass_(config.classAsString, newConfig);

        if (!found) {
            registeredComponents_.push(newConfig);
        }
    }

    /**
   * Allows user to be alerted to any upgrades that are performed for a given
   * component type
   *
   * @param {string} jsClass The class name of the MDL component we wish
   * to hook into for any upgrades performed.
   * @param {function(!HTMLElement)} callback The function to call upon an
   * upgrade. This function should expect 1 parameter - the HTMLElement which
   * got upgraded.
   */
    function registerUpgradedCallbackInternal(jsClass, callback) {
        var regClass = findRegisteredClass_(jsClass);
        if (regClass) {
            regClass.callbacks.push(callback);
        }
    }

    /**
   * Upgrades all registered components found in the current DOM. This is
   * automatically called on window load.
   */
    function upgradeAllRegisteredInternal() {
        for (var n = 0; n < registeredComponents_.length; n++) {
            upgradeDomInternal(registeredComponents_[n].className);
        }
    }

    /**
   * Check the component for the downgrade method.
   * Execute if found.
   * Remove component from createdComponents list.
   *
   * @param {?componentHandler.Component} component
   */
    function deconstructComponentInternal(component) {
        if (component) {
            var componentIndex = createdComponents_.indexOf(component);
            createdComponents_.splice(componentIndex, 1);

            var upgrades = component.element_.getAttribute('data-upgraded').split(',');
            var componentPlace = upgrades.indexOf(component[componentConfigProperty_].classAsString);
            upgrades.splice(componentPlace, 1);
            component.element_.setAttribute('data-upgraded', upgrades.join(','));

            var ev = createEvent_('mdl-componentdowngraded', true, false);
            component.element_.dispatchEvent(ev);
        }
    }

    /**
   * Downgrade either a given node, an array of nodes, or a NodeList.
   *
   * @param {!Node|!Array<!Node>|!NodeList} nodes
   */
    function downgradeNodesInternal(nodes) {
        /**
     * Auxiliary function to downgrade a single node.
     * @param  {!Node} node the node to be downgraded
     */
        var downgradeNode = function(node) {
            createdComponents_.filter(function(item) {
                return item.element_ === node;
            }).forEach(deconstructComponentInternal);
        };
        if (nodes instanceof Array || nodes instanceof NodeList) {
            for (var n = 0; n < nodes.length; n++) {
                downgradeNode(nodes[n]);
            }
        } else if (nodes instanceof Node) {
            downgradeNode(nodes);
        } else {
            throw new Error('Invalid argument provided to downgrade MDL nodes.');
        }
    }

    // Now return the functions that should be made public with their publicly
    // facing names...
    return {
        upgradeDom: upgradeDomInternal,
        upgradeElement: upgradeElementInternal,
        upgradeElements: upgradeElementsInternal,
        upgradeAllRegistered: upgradeAllRegisteredInternal,
        registerUpgradedCallback: registerUpgradedCallbackInternal,
        register: registerInternal,
        downgradeElements: downgradeNodesInternal
    };
}
)();

/**
 * Describes the type of a registered component type managed by
 * componentHandler. Provided for benefit of the Closure compiler.
 *
 * @typedef {{
 *   constructor: Function,
 *   classAsString: string,
 *   cssClass: string,
 *   widget: (string|boolean|undefined)
 * }}
 */
componentHandler.ComponentConfigPublic;
// jshint ignore:line

/**
 * Describes the type of a registered component type managed by
 * componentHandler. Provided for benefit of the Closure compiler.
 *
 * @typedef {{
 *   constructor: !Function,
 *   className: string,
 *   cssClass: string,
 *   widget: (string|boolean),
 *   callbacks: !Array<function(!HTMLElement)>
 * }}
 */
componentHandler.ComponentConfig;
// jshint ignore:line

/**
 * Created component (i.e., upgraded element) type as managed by
 * componentHandler. Provided for benefit of the Closure compiler.
 *
 * @typedef {{
 *   element_: !HTMLElement,
 *   className: string,
 *   classAsString: string,
 *   cssClass: string,
 *   widget: string
 * }}
 */
componentHandler.Component;
// jshint ignore:line

// Export all symbols, for the benefit of Closure compiler.
// No effect on uncompiled code.
componentHandler['upgradeDom'] = componentHandler.upgradeDom;
componentHandler['upgradeElement'] = componentHandler.upgradeElement;
componentHandler['upgradeElements'] = componentHandler.upgradeElements;
componentHandler['upgradeAllRegistered'] = componentHandler.upgradeAllRegistered;
componentHandler['registerUpgradedCallback'] = componentHandler.registerUpgradedCallback;
componentHandler['register'] = componentHandler.register;
componentHandler['downgradeElements'] = componentHandler.downgradeElements;
window['componentHandler'] = componentHandler;

window.addEventListener('load', function() {
    'use strict';

    /**
   * Performs a "Cutting the mustard" test. If the browser supports the features
   * tested, adds a mdl-js class to the <html> element. It then upgrades all MDL
   * components requiring JavaScript.
   */
    if ('classList'in document.createElement('div') && 'querySelector'in document && 'addEventListener'in window && Array.prototype.forEach) {
        document.documentElement.classList.add('mdl-js');
        componentHandler.upgradeAllRegistered();
    }
});

//third_party/javascript/material_design_lite/button/button.js
/**
 * @license
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

(function() {
    'use strict';

    /**
   * Class constructor for Button MDL component.
   * Implements MDL component design pattern defined at:
   * https://github.com/jasonmayes/mdl-component-design-pattern
   *
   * @param {HTMLElement} element The element that will be upgraded.
   */
    var MaterialButton = function MaterialButton(element) {
        this.element_ = element;

        // Initialize instance.
        this.init();
    };
    window['MaterialButton'] = MaterialButton;

    /**
   * Store constants in one place so they can be updated easily.
   *
   * @enum {string | number}
   * @private
   */
    MaterialButton.prototype.Constant_ = {// None for now.
    };

    /**
   * Store strings for class names defined by this component that are used in
   * JavaScript. This allows us to simply change it in one place should we
   * decide to modify at a later date.
   *
   * @enum {string}
   * @private
   */
    MaterialButton.prototype.CssClasses_ = {
        RIPPLE_EFFECT: 'mdl-js-ripple-effect',
        RIPPLE_CONTAINER: 'mdl-button__ripple-container',
        RIPPLE: 'mdl-ripple'
    };

    /**
   * Handle blur of element.
   *
   * @param {Event} event The event that fired.
   * @private
   */
    MaterialButton.prototype.blurHandler_ = function(event) {
        if (event) {
            this.element_.blur();
        }
    }
    ;

    // Public methods.

    /**
   * Disable button.
   *
   * @public
   */
    MaterialButton.prototype.disable = function() {
        this.element_.disabled = true;
    }
    ;
    MaterialButton.prototype['disable'] = MaterialButton.prototype.disable;

    /**
   * Enable button.
   *
   * @public
   */
    MaterialButton.prototype.enable = function() {
        this.element_.disabled = false;
    }
    ;
    MaterialButton.prototype['enable'] = MaterialButton.prototype.enable;

    /**
   * Initialize element.
   */
    MaterialButton.prototype.init = function() {
        if (this.element_) {
            if (this.element_.classList.contains(this.CssClasses_.RIPPLE_EFFECT)) {
                var rippleContainer = document.createElement('span');
                rippleContainer.classList.add(this.CssClasses_.RIPPLE_CONTAINER);
                this.rippleElement_ = document.createElement('span');
                this.rippleElement_.classList.add(this.CssClasses_.RIPPLE);
                rippleContainer.appendChild(this.rippleElement_);
                this.boundRippleBlurHandler = this.blurHandler_.bind(this);
                this.rippleElement_.addEventListener('mouseup', this.boundRippleBlurHandler);
                this.element_.appendChild(rippleContainer);
            }
            this.boundButtonBlurHandler = this.blurHandler_.bind(this);
            this.element_.addEventListener('mouseup', this.boundButtonBlurHandler);
            this.element_.addEventListener('mouseleave', this.boundButtonBlurHandler);
        }
    }
    ;

    // The component registers itself. It can assume componentHandler is available
    // in the global scope.
    componentHandler.register({
        constructor: MaterialButton,
        classAsString: 'MaterialButton',
        cssClass: 'mdl-js-button',
        widget: true
    });
}
)();

//third_party/javascript/material_design_lite/progress/progress.js
/**
 * @license
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

(function() {
    'use strict';

    /**
   * Class constructor for Progress MDL component.
   * Implements MDL component design pattern defined at:
   * https://github.com/jasonmayes/mdl-component-design-pattern
   *
   * @constructor
   * @param {HTMLElement} element The element that will be upgraded.
   */
    var MaterialProgress = function MaterialProgress(element) {
        this.element_ = element;

        // Initialize instance.
        this.init();
    };
    window['MaterialProgress'] = MaterialProgress;

    /**
   * Store constants in one place so they can be updated easily.
   *
   * @enum {string | number}
   * @private
   */
    MaterialProgress.prototype.Constant_ = {};

    /**
   * Store strings for class names defined by this component that are used in
   * JavaScript. This allows us to simply change it in one place should we
   * decide to modify at a later date.
   *
   * @enum {string}
   * @private
   */
    MaterialProgress.prototype.CssClasses_ = {
        INDETERMINATE_CLASS: 'mdl-progress__indeterminate'
    };

    /**
   * Set the current progress of the progressbar.
   *
   * @param {number} p Percentage of the progress (0-100)
   * @public
   */
    MaterialProgress.prototype.setProgress = function(p) {
        if (this.element_.classList.contains(this.CssClasses_.INDETERMINATE_CLASS)) {
            return;
        }

        this.progressbar_.style.width = p + '%';
    }
    ;
    MaterialProgress.prototype['setProgress'] = MaterialProgress.prototype.setProgress;

    /**
   * Set the current progress of the buffer.
   *
   * @param {number} p Percentage of the buffer (0-100)
   * @public
   */
    MaterialProgress.prototype.setBuffer = function(p) {
        this.bufferbar_.style.width = p + '%';
        this.auxbar_.style.width = (100 - p) + '%';
    }
    ;
    MaterialProgress.prototype['setBuffer'] = MaterialProgress.prototype.setBuffer;

    /**
   * Initialize element.
   */
    MaterialProgress.prototype.init = function() {
        if (this.element_) {
            var el = document.createElement('div');
            el.className = 'progressbar bar bar1';
            this.element_.appendChild(el);
            this.progressbar_ = el;

            el = document.createElement('div');
            el.className = 'bufferbar bar bar2';
            this.element_.appendChild(el);
            this.bufferbar_ = el;

            el = document.createElement('div');
            el.className = 'auxbar bar bar3';
            this.element_.appendChild(el);
            this.auxbar_ = el;

            this.progressbar_.style.width = '0%';
            this.bufferbar_.style.width = '100%';
            this.auxbar_.style.width = '0%';

            this.element_.classList.add('is-upgraded');
        }
    }
    ;

    // The component registers itself. It can assume componentHandler is available
    // in the global scope.
    componentHandler.register({
        constructor: MaterialProgress,
        classAsString: 'MaterialProgress',
        cssClass: 'mdl-js-progress',
        widget: true
    });
}
)();

//third_party/javascript/material_design_lite/textfield/textfield.js
/**
 * @license
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

(function() {
    'use strict';

    /**
   * Class constructor for Textfield MDL component.
   * Implements MDL component design pattern defined at:
   * https://github.com/jasonmayes/mdl-component-design-pattern
   *
   * @constructor
   * @param {HTMLElement} element The element that will be upgraded.
   */
    var MaterialTextfield = function MaterialTextfield(element) {
        this.element_ = element;
        this.maxRows = this.Constant_.NO_MAX_ROWS;
        // Initialize instance.
        this.init();
    };
    window['MaterialTextfield'] = MaterialTextfield;

    /**
   * Store constants in one place so they can be updated easily.
   *
   * @enum {string | number}
   * @private
   */
    MaterialTextfield.prototype.Constant_ = {
        NO_MAX_ROWS: -1,
        MAX_ROWS_ATTRIBUTE: 'maxrows'
    };

    /**
   * Store strings for class names defined by this component that are used in
   * JavaScript. This allows us to simply change it in one place should we
   * decide to modify at a later date.
   *
   * @enum {string}
   * @private
   */
    MaterialTextfield.prototype.CssClasses_ = {
        LABEL: 'mdl-textfield__label',
        INPUT: 'mdl-textfield__input',
        IS_DIRTY: 'is-dirty',
        IS_FOCUSED: 'is-focused',
        IS_DISABLED: 'is-disabled',
        IS_INVALID: 'is-invalid',
        IS_UPGRADED: 'is-upgraded',
        HAS_PLACEHOLDER: 'has-placeholder'
    };

    /**
   * Handle input being entered.
   *
   * @param {Event} event The event that fired.
   * @private
   */
    MaterialTextfield.prototype.onKeyDown_ = function(event) {
        var currentRowCount = event.target.value.split('\n').length;
        if (event.keyCode === 13) {
            if (currentRowCount >= this.maxRows) {
                event.preventDefault();
            }
        }
    }
    ;

    /**
   * Handle focus.
   *
   * @param {Event} event The event that fired.
   * @private
   */
    MaterialTextfield.prototype.onFocus_ = function(event) {
        this.element_.classList.add(this.CssClasses_.IS_FOCUSED);
    }
    ;

    /**
   * Handle lost focus.
   *
   * @param {Event} event The event that fired.
   * @private
   */
    MaterialTextfield.prototype.onBlur_ = function(event) {
        this.element_.classList.remove(this.CssClasses_.IS_FOCUSED);
    }
    ;

    /**
   * Handle reset event from out side.
   *
   * @param {Event} event The event that fired.
   * @private
   */
    MaterialTextfield.prototype.onReset_ = function(event) {
        this.updateClasses_();
    }
    ;

    /**
   * Handle class updates.
   *
   * @private
   */
    MaterialTextfield.prototype.updateClasses_ = function() {
        this.checkDisabled();
        this.checkValidity();
        this.checkDirty();
        this.checkFocus();
    }
    ;

    // Public methods.

    /**
   * Check the disabled state and update field accordingly.
   *
   * @public
   */
    MaterialTextfield.prototype.checkDisabled = function() {
        if (this.input_.disabled) {
            this.element_.classList.add(this.CssClasses_.IS_DISABLED);
        } else {
            this.element_.classList.remove(this.CssClasses_.IS_DISABLED);
        }
    }
    ;
    MaterialTextfield.prototype['checkDisabled'] = MaterialTextfield.prototype.checkDisabled;

    /**
  * Check the focus state and update field accordingly.
  *
  * @public
  */
    MaterialTextfield.prototype.checkFocus = function() {
        if (Boolean(this.element_.querySelector(':focus'))) {
            this.element_.classList.add(this.CssClasses_.IS_FOCUSED);
        } else {
            this.element_.classList.remove(this.CssClasses_.IS_FOCUSED);
        }
    }
    ;
    MaterialTextfield.prototype['checkFocus'] = MaterialTextfield.prototype.checkFocus;

    /**
   * Check the validity state and update field accordingly.
   *
   * @public
   */
    MaterialTextfield.prototype.checkValidity = function() {
        if (this.input_.validity) {
            if (this.input_.validity.valid) {
                this.element_.classList.remove(this.CssClasses_.IS_INVALID);
            } else {
                this.element_.classList.add(this.CssClasses_.IS_INVALID);
            }
        }
    }
    ;
    MaterialTextfield.prototype['checkValidity'] = MaterialTextfield.prototype.checkValidity;

    /**
   * Check the dirty state and update field accordingly.
   *
   * @public
   */
    MaterialTextfield.prototype.checkDirty = function() {
        if (this.input_.value && this.input_.value.length > 0) {
            this.element_.classList.add(this.CssClasses_.IS_DIRTY);
        } else {
            this.element_.classList.remove(this.CssClasses_.IS_DIRTY);
        }
    }
    ;
    MaterialTextfield.prototype['checkDirty'] = MaterialTextfield.prototype.checkDirty;

    /**
   * Disable text field.
   *
   * @public
   */
    MaterialTextfield.prototype.disable = function() {
        this.input_.disabled = true;
        this.updateClasses_();
    }
    ;
    MaterialTextfield.prototype['disable'] = MaterialTextfield.prototype.disable;

    /**
   * Enable text field.
   *
   * @public
   */
    MaterialTextfield.prototype.enable = function() {
        this.input_.disabled = false;
        this.updateClasses_();
    }
    ;
    MaterialTextfield.prototype['enable'] = MaterialTextfield.prototype.enable;

    /**
   * Update text field value.
   *
   * @param {string} value The value to which to set the control (optional).
   * @public
   */
    MaterialTextfield.prototype.change = function(value) {

        this.input_.value = value || '';
        this.updateClasses_();
    }
    ;
    MaterialTextfield.prototype['change'] = MaterialTextfield.prototype.change;

    /**
   * Initialize element.
   */
    MaterialTextfield.prototype.init = function() {

        if (this.element_) {
            this.label_ = this.element_.querySelector('.' + this.CssClasses_.LABEL);
            this.input_ = this.element_.querySelector('.' + this.CssClasses_.INPUT);

            if (this.input_) {
                if (this.input_.hasAttribute(/** @type {string} */
                (this.Constant_.MAX_ROWS_ATTRIBUTE))) {
                    this.maxRows = parseInt(this.input_.getAttribute(/** @type {string} */
                    (this.Constant_.MAX_ROWS_ATTRIBUTE)), 10);
                    if (isNaN(this.maxRows)) {
                        this.maxRows = this.Constant_.NO_MAX_ROWS;
                    }
                }

                if (this.input_.hasAttribute('placeholder')) {
                    this.element_.classList.add(this.CssClasses_.HAS_PLACEHOLDER);
                }

                this.boundUpdateClassesHandler = this.updateClasses_.bind(this);
                this.boundFocusHandler = this.onFocus_.bind(this);
                this.boundBlurHandler = this.onBlur_.bind(this);
                this.boundResetHandler = this.onReset_.bind(this);
                this.input_.addEventListener('input', this.boundUpdateClassesHandler);
                this.input_.addEventListener('focus', this.boundFocusHandler);
                this.input_.addEventListener('blur', this.boundBlurHandler);
                this.input_.addEventListener('reset', this.boundResetHandler);

                if (this.maxRows !== this.Constant_.NO_MAX_ROWS) {
                    // TODO: This should handle pasting multi line text.
                    // Currently doesn't.
                    this.boundKeyDownHandler = this.onKeyDown_.bind(this);
                    this.input_.addEventListener('keydown', this.boundKeyDownHandler);
                }
                var invalid = this.element_.classList.contains(this.CssClasses_.IS_INVALID);
                this.updateClasses_();
                this.element_.classList.add(this.CssClasses_.IS_UPGRADED);
                if (invalid) {
                    this.element_.classList.add(this.CssClasses_.IS_INVALID);
                }
                if (this.input_.hasAttribute('autofocus')) {
                    this.element_.focus();
                    this.checkFocus();
                }
            }
        }
    }
    ;

    // The component registers itself. It can assume componentHandler is available
    // in the global scope.
    componentHandler.register({
        constructor: MaterialTextfield,
        classAsString: 'MaterialTextfield',
        cssClass: 'mdl-js-textfield',
        widget: true
    });
}
)();

//firebase/jscore/packaging/firebase-app.js
/*! @license Firebase v3.7.5
    Build: 3.7.5-rc.1
    Terms: https://firebase.google.com/terms/ */
var firebase = null;
(function() {
    /*

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/
    var aa = function(a) {
        var b = 0;
        return function() {
            return b < a.length ? {
                done: !1,
                value: a[b++]
            } : {
                done: !0
            }
        }
    }
      , ba = "function" == typeof Object.defineProperties ? Object.defineProperty : function(a, b, c) {
        if (a == Array.prototype || a == Object.prototype)
            return a;
        a[b] = c.value;
        return a
    }
      , ca = function(a) {
        a = ["object" == typeof globalThis && globalThis, a, "object" == typeof window && window, "object" == typeof self && self, "object" == typeof global && global];
        for (var b = 0; b < a.length; ++b) {
            var c = a[b];
            if (c && c.Math == Math)
                return c
        }
        throw Error("Cannot find global object");
    }
      , da = ca(this)
      , ea = function(a, b) {
        if (b)
            a: {
                var c = da;
                a = a.split(".");
                for (var d = 0; d < a.length - 1; d++) {
                    var e = a[d];
                    if (!(e in c))
                        break a;
                    c = c[e]
                }
                a = a[a.length - 1];
                d = c[a];
                b = b(d);
                b != d && null != b && ba(c, a, {
                    configurable: !0,
                    writable: !0,
                    value: b
                })
            }
    };
    ea("Symbol", function(a) {
        if (a)
            return a;
        var b = function(g, k) {
            this.X = g;
            ba(this, "description", {
                configurable: !0,
                writable: !0,
                value: k
            })
        };
        b.prototype.toString = function() {
            return this.X
        }
        ;
        var c = "jscomp_symbol_" + (1E9 * Math.random() >>> 0) + "_"
          , d = 0
          , e = function(g) {
            if (this instanceof e)
                throw new TypeError("Symbol is not a constructor");
            return new b(c + (g || "") + "_" + d++,g)
        };
        return e
    });
    var fa = function(a) {
        var b = "undefined" != typeof Symbol && Symbol.iterator && a[Symbol.iterator];
        if (b)
            return b.call(a);
        if ("number" == typeof a.length)
            return {
                next: aa(a)
            };
        throw Error(String(a) + " is not an iterable or ArrayLike");
    }
      , ha = function() {
        for (var a = Number(this), b = [], c = a; c < arguments.length; c++)
            b[c - a] = arguments[c];
        return b
    }
      , l = this || self
      , ia = function(a, b, c) {
        return a.call.apply(a.bind, arguments)
    }
      , ja = function(a, b, c) {
        if (!a)
            throw Error();
        if (2 < arguments.length) {
            var d = Array.prototype.slice.call(arguments, 2);
            return function() {
                var e = Array.prototype.slice.call(arguments);
                Array.prototype.unshift.apply(e, d);
                return a.apply(b, e)
            }
        }
        return function() {
            return a.apply(b, arguments)
        }
    }
      , m = function(a, b, c) {
        m = Function.prototype.bind && -1 != Function.prototype.bind.toString().indexOf("native code") ? ia : ja;
        return m.apply(null, arguments)
    }
      , ka = function(a, b) {
        var c = Array.prototype.slice.call(arguments, 1);
        return function() {
            var d = c.slice();
            d.push.apply(d, arguments);
            return a.apply(this, d)
        }
    }
      , p = function(a, b) {
        function c() {}
        c.prototype = b.prototype;
        a.ja = b.prototype;
        a.prototype = new c;
        a.prototype.constructor = a;
        a.base = function(d, e, g) {
            for (var k = Array(arguments.length - 2), f = 2; f < arguments.length; f++)
                k[f - 2] = arguments[f];
            return b.prototype[e].apply(d, k)
        }
    };
    function t(a, b) {
        if (Error.captureStackTrace)
            Error.captureStackTrace(this, t);
        else {
            var c = Error().stack;
            c && (this.stack = c)
        }
        a && (this.message = String(a));
        void 0 !== b && (this.cause = b)
    }
    p(t, Error);
    t.prototype.name = "CustomError";
    function u(a, b) {
        a = a.split("%s");
        for (var c = "", d = a.length - 1, e = 0; e < d; e++)
            c += a[e] + (e < b.length ? b[e] : "%s");
        t.call(this, c + a[d])
    }
    p(u, t);
    u.prototype.name = "AssertionError";
    function v(a, b, c, d) {
        var e = "Assertion failed";
        if (c) {
            e += ": " + c;
            var g = d
        } else
            a && (e += ": " + a,
            g = b);
        throw new u("" + e,g || []);
    }
    var w = function(a, b, c) {
        a || v("", null, b, Array.prototype.slice.call(arguments, 2))
    }
      , la = function(a, b, c) {
        null == a && v("Expected to exist: %s.", [a], b, Array.prototype.slice.call(arguments, 2));
        return a
    }
      , x = function(a, b, c) {
        if ("function" !== typeof a) {
            var d = typeof a;
            d = "object" != d ? d : a ? Array.isArray(a) ? "array" : d : "null";
            v("Expected function but got %s: %s.", [d, a], b, Array.prototype.slice.call(arguments, 2))
        }
    };
    var y = function(a, b) {
        this.da = 100;
        this.Y = a;
        this.ea = b;
        this.F = 0;
        this.D = null
    };
    y.prototype.get = function() {
        if (0 < this.F) {
            this.F--;
            var a = this.D;
            this.D = a.next;
            a.next = null
        } else
            a = this.Y();
        return a
    }
    ;
    y.prototype.put = function(a) {
        this.ea(a);
        this.F < this.da && (this.F++,
        a.next = this.D,
        this.D = a)
    }
    ;
    var z, A;
    a: {
        for (var ma = ["CLOSURE_FLAGS"], B = l, C = 0; C < ma.length; C++)
            if (B = B[ma[C]],
            null == B) {
                A = null;
                break a
            }
        A = B
    }
    var na = A && A[610401301];
    z = null != na ? na : !1;
    function D() {
        var a = l.navigator;
        return a && (a = a.userAgent) ? a : ""
    }
    var E, oa = l.navigator;
    E = oa ? oa.userAgentData || null : null;
    function F(a) {
        return -1 != D().indexOf(a)
    }
    ;function G() {
        return z ? !!E && 0 < E.brands.length : !1
    }
    function pa() {
        return G() ? !1 : F("Trident") || F("MSIE")
    }
    ;function H() {
        return z ? !!E && !!E.platform : !1
    }
    function qa() {
        return F("iPhone") && !F("iPod") && !F("iPad")
    }
    ;G() || F("Opera");
    pa();
    F("Edge");
    !F("Gecko") || -1 != D().toLowerCase().indexOf("webkit") && !F("Edge") || F("Trident") || F("MSIE") || F("Edge");
    -1 != D().toLowerCase().indexOf("webkit") && !F("Edge") && F("Mobile");
    H() || F("Macintosh");
    H() || F("Windows");
    (H() ? "Linux" === E.platform : F("Linux")) || H() || F("CrOS");
    var ra = l.navigator || null;
    ra && (ra.appVersion || "").indexOf("X11");
    H() || F("Android");
    qa();
    F("iPad");
    F("iPod");
    qa() || F("iPad") || F("iPod");
    D().toLowerCase().indexOf("kaios");
    var I = function() {};
    var sa = function() {
        var a = document;
        var b = "IFRAME";
        "application/xhtml+xml" === a.contentType && (b = b.toLowerCase());
        return a.createElement(b)
    };
    var K, ta = function() {
        var a = l.MessageChannel;
        "undefined" === typeof a && "undefined" !== typeof window && window.postMessage && window.addEventListener && !F("Presto") && (a = function() {
            var e = sa();
            e.style.display = "none";
            document.documentElement.appendChild(e);
            var g = e.contentWindow;
            e = g.document;
            e.open();
            e.close();
            var k = "callImmediate" + Math.random()
              , f = "file:" == g.location.protocol ? "*" : g.location.protocol + "//" + g.location.host;
            e = m(function(h) {
                if (("*" == f || h.origin == f) && h.data == k)
                    this.port1.onmessage()
            }, this);
            g.addEventListener("message", e, !1);
            this.port1 = {};
            this.port2 = {
                postMessage: function() {
                    g.postMessage(k, f)
                }
            }
        }
        );
        if ("undefined" !== typeof a && !pa()) {
            var b = new a
              , c = {}
              , d = c;
            b.port1.onmessage = function() {
                if (void 0 !== c.next) {
                    c = c.next;
                    var e = c.P;
                    c.P = null;
                    e()
                }
            }
            ;
            return function(e) {
                d.next = {
                    P: e
                };
                d = d.next;
                b.port2.postMessage(0)
            }
        }
        return function(e) {
            l.setTimeout(e, 0)
        }
    };
    function ua(a) {
        l.setTimeout(function() {
            throw a;
        }, 0)
    }
    ;var L = function() {
        this.G = this.o = null
    };
    L.prototype.add = function(a, b) {
        var c = va.get();
        c.set(a, b);
        this.G ? this.G.next = c : (w(!this.o),
        this.o = c);
        this.G = c
    }
    ;
    L.prototype.remove = function() {
        var a = null;
        this.o && (a = this.o,
        this.o = this.o.next,
        this.o || (this.G = null),
        a.next = null);
        return a
    }
    ;
    var va = new y(function() {
        return new M
    }
    ,function(a) {
        return a.reset()
    }
    )
      , M = function() {
        this.next = this.scope = this.I = null
    };
    M.prototype.set = function(a, b) {
        this.I = a;
        this.scope = b;
        this.next = null
    }
    ;
    M.prototype.reset = function() {
        this.next = this.scope = this.I = null
    }
    ;
    var wa = l.console && l.console.createTask ? l.console.createTask.bind(l.console) : void 0
      , xa = wa ? Symbol("consoleTask") : void 0;
    function ya(a, b) {
        function c() {
            var e = ha.apply(0, arguments)
              , g = this;
            return d.run(function() {
                var k = a.call
                  , f = k.apply
                  , h = [g]
                  , n = h.concat;
                if (e instanceof Array)
                    var q = e;
                else {
                    q = fa(e);
                    for (var J, r = []; !(J = q.next()).done; )
                        r.push(J.value);
                    q = r
                }
                return f.call(k, a, n.call(h, q))
            })
        }
        b = void 0 === b ? "anonymous" : b;
        if (!wa || a[la(xa)])
            return a;
        var d = wa(a.name || b);
        c[la(xa)] = d;
        return c
    }
    ;var N, za = !1, Aa = new L, O = function(a, b) {
        N || Ba();
        za || (N(),
        za = !0);
        a = ya(a, "goog.async.run");
        Aa.add(a, b)
    }, Ba = function() {
        if (l.Promise && l.Promise.resolve) {
            var a = l.Promise.resolve(void 0);
            N = function() {
                a.then(Ca)
            }
        } else
            N = function() {
                var b = Ca;
                "function" !== typeof l.setImmediate || l.Window && l.Window.prototype && (G() || !F("Edge")) && l.Window.prototype.setImmediate == l.setImmediate ? (K || (K = ta()),
                K(b)) : l.setImmediate(b)
            }
    }, Ca = function() {
        for (var a; a = Aa.remove(); ) {
            try {
                a.I.call(a.scope)
            } catch (b) {
                ua(b)
            }
            va.put(a)
        }
        za = !1
    };
    var R = function(a, b) {
        this.g = 0;
        this.V = void 0;
        this.s = this.i = this.m = null;
        this.B = this.H = !1;
        if (a != I)
            try {
                var c = this;
                a.call(b, function(d) {
                    P(c, 2, d)
                }, function(d) {
                    if (!(d instanceof Q))
                        try {
                            if (d instanceof Error)
                                throw d;
                            throw Error("Promise rejected.");
                        } catch (e) {}
                    P(c, 3, d)
                })
            } catch (d) {
                P(this, 3, d)
            }
    }
      , Da = function() {
        this.next = this.context = this.u = this.l = this.child = null;
        this.v = !1
    };
    Da.prototype.reset = function() {
        this.context = this.u = this.l = this.child = null;
        this.v = !1
    }
    ;
    var Ea = new y(function() {
        return new Da
    }
    ,function(a) {
        a.reset()
    }
    )
      , Fa = function(a, b, c) {
        var d = Ea.get();
        d.l = a;
        d.u = b;
        d.context = c;
        return d
    }
      , Ha = function(a, b, c) {
        Ga(a, b, c, null) || O(ka(b, a))
    };
    R.prototype.then = function(a, b, c) {
        null != a && x(a, "opt_onFulfilled should be a function.");
        null != b && x(b, "opt_onRejected should be a function. Did you pass opt_context as the second argument instead of the third?");
        return Ia(this, "function" === typeof a ? a : null, "function" === typeof b ? b : null, c)
    }
    ;
    R.prototype.$goog_Thenable = !0;
    R.prototype.W = function(a, b) {
        return Ia(this, null, a, b)
    }
    ;
    R.prototype.catch = R.prototype.W;
    R.prototype.cancel = function(a) {
        if (0 == this.g) {
            var b = new Q(a);
            O(function() {
                Ja(this, b)
            }, this)
        }
    }
    ;
    var Ja = function(a, b) {
        if (0 == a.g)
            if (a.m) {
                var c = a.m;
                if (c.i) {
                    for (var d = 0, e = null, g = null, k = c.i; k && (k.v || (d++,
                    k.child == a && (e = k),
                    !(e && 1 < d))); k = k.next)
                        e || (g = k);
                    e && (0 == c.g && 1 == d ? Ja(c, b) : (g ? (d = g,
                    w(c.i),
                    w(null != d),
                    d.next == c.s && (c.s = d),
                    d.next = d.next.next) : Ka(c),
                    La(c, e, 3, b)))
                }
                a.m = null
            } else
                P(a, 3, b)
    }
      , Na = function(a, b) {
        a.i || 2 != a.g && 3 != a.g || Ma(a);
        w(null != b.l);
        a.s ? a.s.next = b : a.i = b;
        a.s = b
    }
      , Ia = function(a, b, c, d) {
        b && (b = ya(b, "goog.Promise.then"));
        c && (c = ya(c, "goog.Promise.then"));
        var e = Fa(null, null, null);
        e.child = new R(function(g, k) {
            e.l = b ? function(f) {
                try {
                    var h = b.call(d, f);
                    g(h)
                } catch (n) {
                    k(n)
                }
            }
            : g;
            e.u = c ? function(f) {
                try {
                    var h = c.call(d, f);
                    void 0 === h && f instanceof Q ? k(f) : g(h)
                } catch (n) {
                    k(n)
                }
            }
            : k
        }
        );
        e.child.m = a;
        Na(a, e);
        return e.child
    };
    R.prototype.ga = function(a) {
        w(1 == this.g);
        this.g = 0;
        P(this, 2, a)
    }
    ;
    R.prototype.ha = function(a) {
        w(1 == this.g);
        this.g = 0;
        P(this, 3, a)
    }
    ;
    var P = function(a, b, c) {
        0 == a.g && (a === c && (b = 3,
        c = new TypeError("Promise cannot resolve to itself")),
        a.g = 1,
        Ga(c, a.ga, a.ha, a) || (a.V = c,
        a.g = b,
        a.m = null,
        Ma(a),
        3 != b || c instanceof Q || Oa(a, c)))
    }
      , Ga = function(a, b, c, d) {
        if (a instanceof R)
            return null != b && x(b, "opt_onFulfilled should be a function."),
            null != c && x(c, "opt_onRejected should be a function. Did you pass opt_context as the second argument instead of the third?"),
            Na(a, Fa(b || I, c || null, d)),
            !0;
        if (a)
            try {
                var e = !!a.$goog_Thenable
            } catch (k) {
                e = !1
            }
        else
            e = !1;
        if (e)
            return a.then(b, c, d),
            !0;
        e = typeof a;
        if ("object" == e && null != a || "function" == e)
            try {
                var g = a.then;
                if ("function" === typeof g)
                    return Pa(a, g, b, c, d),
                    !0
            } catch (k) {
                return c.call(d, k),
                !0
            }
        return !1
    }
      , Pa = function(a, b, c, d, e) {
        var g = !1
          , k = function(h) {
            g || (g = !0,
            c.call(e, h))
        }
          , f = function(h) {
            g || (g = !0,
            d.call(e, h))
        };
        try {
            b.call(a, k, f)
        } catch (h) {
            f(h)
        }
    }
      , Ma = function(a) {
        a.H || (a.H = !0,
        O(a.Z, a))
    }
      , Ka = function(a) {
        var b = null;
        a.i && (b = a.i,
        a.i = b.next,
        b.next = null);
        a.i || (a.s = null);
        null != b && w(null != b.l);
        return b
    };
    R.prototype.Z = function() {
        for (var a; a = Ka(this); )
            La(this, a, this.g, this.V);
        this.H = !1
    }
    ;
    var La = function(a, b, c, d) {
        if (3 == c && b.u && !b.v)
            for (; a && a.B; a = a.m)
                a.B = !1;
        if (b.child)
            b.child.m = null,
            Qa(b, c, d);
        else
            try {
                b.v ? b.l.call(b.context) : Qa(b, c, d)
            } catch (e) {
                Ra.call(null, e)
            }
        Ea.put(b)
    }
      , Qa = function(a, b, c) {
        2 == b ? a.l.call(a.context, c) : a.u && a.u.call(a.context, c)
    }
      , Oa = function(a, b) {
        a.B = !0;
        O(function() {
            a.B && Ra.call(null, b)
        })
    }
      , Ra = ua
      , Q = function(a) {
        t.call(this, a)
    };
    p(Q, t);
    Q.prototype.name = "cancel";
    R.all = function(a) {
        return new R(function(b, c) {
            var d = a.length
              , e = [];
            if (d)
                for (var g = function(n, q) {
                    d--;
                    e[n] = q;
                    0 == d && b(e)
                }, k = function(n) {
                    c(n)
                }, f = 0, h; f < a.length; f++)
                    h = a[f],
                    Ha(h, ka(g, f), k);
            else
                b(e)
        }
        )
    }
    ;
    R.resolve = function(a) {
        if (a instanceof R)
            return a;
        var b = new R(I);
        P(b, 2, a);
        return b
    }
    ;
    R.reject = function(a) {
        return new R(function(b, c) {
            c(a)
        }
        )
    }
    ;
    R.prototype["catch"] = R.prototype.W;
    var Sa = R;
    "undefined" !== typeof Promise && (Sa = Promise);
    function S(a, b) {
        if (!(b instanceof Object))
            return b;
        switch (b.constructor) {
        case Date:
            return new Date(b.getTime());
        case Object:
            void 0 === a && (a = {});
            break;
        case Array:
            a = [];
            break;
        default:
            return b
        }
        for (var c in b)
            b.hasOwnProperty(c) && (a[c] = S(a[c], b[c]));
        return a
    }
    ;var Ta = Error.captureStackTrace
      , U = function(a, b) {
        this.code = a;
        this.message = b;
        if (Ta)
            Ta(this, T.prototype.create);
        else {
            var c = Error.apply(this, arguments);
            this.name = "FirebaseError";
            Object.defineProperty(this, "stack", {
                get: function() {
                    return c.stack
                }
            })
        }
    };
    U.prototype = Object.create(Error.prototype);
    U.prototype.constructor = U;
    U.prototype.name = "FirebaseError";
    var T = function(a, b, c) {
        this.service = a;
        this.fa = b;
        this.errors = c;
        this.pattern = /\{\$([^}]+)}/g
    };
    T.prototype.create = function(a, b) {
        void 0 === b && (b = {});
        var c = this.errors[a];
        a = this.service + "/" + a;
        c = void 0 === c ? "Error" : c.replace(this.pattern, function(e, g) {
            e = b[g];
            return void 0 !== e ? e.toString() : "<" + g + "?>"
        });
        c = this.fa + ": " + c + " (" + a + ").";
        c = new U(a,c);
        for (var d in b)
            b.hasOwnProperty(d) && "_" !== d.slice(-1) && (c[d] = b[d]);
        return c
    }
    ;
    var Ua = Sa;
    function Va(a, b) {
        a = new V(a,b);
        return a.subscribe.bind(a)
    }
    var V = function(a, b) {
        var c = this;
        this.h = [];
        this.U = 0;
        this.task = Ua.resolve();
        this.A = !1;
        this.K = b;
        this.task.then(function() {
            a(c)
        }).catch(function(d) {
            c.error(d)
        })
    };
    V.prototype.next = function(a) {
        Wa(this, function(b) {
            b.next(a)
        })
    }
    ;
    V.prototype.error = function(a) {
        Wa(this, function(b) {
            b.error(a)
        });
        this.close(a)
    }
    ;
    V.prototype.complete = function() {
        Wa(this, function(a) {
            a.complete()
        });
        this.close()
    }
    ;
    V.prototype.subscribe = function(a, b, c) {
        var d = this;
        if (void 0 === a && void 0 === b && void 0 === c)
            throw Error("Missing Observer.");
        var e = Xa(a) ? a : {
            next: a,
            error: b,
            complete: c
        };
        void 0 === e.next && (e.next = Ya);
        void 0 === e.error && (e.error = Ya);
        void 0 === e.complete && (e.complete = Ya);
        a = this.ia.bind(this, this.h.length);
        this.A && this.task.then(function() {
            try {
                d.R ? e.error(d.R) : e.complete()
            } catch (g) {}
        });
        this.h.push(e);
        return a
    }
    ;
    V.prototype.ia = function(a) {
        void 0 !== this.h && void 0 !== this.h[a] && (delete this.h[a],
        --this.U,
        0 === this.U && void 0 !== this.K && this.K(this))
    }
    ;
    var Wa = function(a, b) {
        if (!a.A)
            for (var c = 0; c < a.h.length; c++)
                Za(a, c, b)
    }
      , Za = function(a, b, c) {
        a.task.then(function() {
            if (void 0 !== a.h && void 0 !== a.h[b])
                try {
                    c(a.h[b])
                } catch (d) {
                    "undefined" !== typeof console && console.error && console.error(d)
                }
        })
    };
    V.prototype.close = function(a) {
        var b = this;
        this.A || (this.A = !0,
        void 0 !== a && (this.R = a),
        this.task.then(function() {
            b.h = void 0;
            b.K = void 0
        }))
    }
    ;
    function Xa(a) {
        if ("object" !== typeof a || null === a)
            return !1;
        for (var b = fa(["next", "error", "complete"]), c = b.next(); !c.done; c = b.next())
            if (c = c.value,
            c in a && "function" === typeof a[c])
                return !0;
        return !1
    }
    function Ya() {}
    ;var W = Sa
      , X = function(a, b, c) {
        var d = this;
        this.S = c;
        this.T = !1;
        this.j = {};
        this.J = b;
        this.M = S(void 0, a);
        a = "serviceAccount"in this.M;
        ("credential"in this.M || a) && "undefined" !== typeof console && console.log("The '" + (a ? "serviceAccount" : "credential") + "' property specified in the first argument to initializeApp() is deprecated and will be removed in the next major version. You should instead use the 'firebase-admin' package. See https://firebase.google.com/docs/admin/setup for details on how to get started.");
        Object.keys(c.INTERNAL.factories).forEach(function(e) {
            var g = c.INTERNAL.useAsService(d, e);
            null !== g && (g = d.ba.bind(d, g),
            d[e] = g)
        })
    };
    X.prototype.delete = function() {
        var a = this;
        return (new W(function(b) {
            Y(a);
            b()
        }
        )).then(function() {
            a.S.INTERNAL.removeApp(a.J);
            var b = [];
            Object.keys(a.j).forEach(function(c) {
                Object.keys(a.j[c]).forEach(function(d) {
                    b.push(a.j[c][d])
                })
            });
            return W.all(b.filter(function(c) {
                return "INTERNAL"in c
            }).map(function(c) {
                return c.INTERNAL.delete()
            }))
        }).then(function() {
            a.T = !0;
            a.j = {}
        })
    }
    ;
    X.prototype.ba = function(a, b) {
        Y(this);
        "undefined" === typeof this.j[a] && (this.j[a] = {});
        var c = b || "[DEFAULT]";
        return "undefined" === typeof this.j[a][c] ? (b = this.S.INTERNAL.factories[a](this, this.aa.bind(this), b),
        this.j[a][c] = b) : this.j[a][c]
    }
    ;
    X.prototype.aa = function(a) {
        S(this, a)
    }
    ;
    var Y = function(a) {
        a.T && Z("app-deleted", {
            name: a.J
        })
    };
    da.Object.defineProperties(X.prototype, {
        name: {
            configurable: !0,
            enumerable: !0,
            get: function() {
                Y(this);
                return this.J
            }
        },
        options: {
            configurable: !0,
            enumerable: !0,
            get: function() {
                Y(this);
                return this.M
            }
        }
    });
    X.prototype.name && X.prototype.options || X.prototype.delete || console.log("dc");
    function $a() {
        function a(f) {
            f = f || "[DEFAULT]";
            var h = d[f];
            void 0 === h && Z("no-app", {
                name: f
            });
            return h
        }
        function b(f, h) {
            Object.keys(e).forEach(function(n) {
                n = c(f, n);
                if (null !== n && g[n])
                    g[n](h, f)
            })
        }
        function c(f, h) {
            if ("serverAuth" === h)
                return null;
            var n = h;
            f = f.options;
            "auth" === h && (f.serviceAccount || f.credential) && (n = "serverAuth",
            "serverAuth"in e || Z("sa-not-supported"));
            return n
        }
        var d = {}
          , e = {}
          , g = {}
          , k = {
            __esModule: !0,
            initializeApp: function(f, h) {
                void 0 === h ? h = "[DEFAULT]" : ("string" !== typeof h || "" === h) && Z("bad-app-name", {
                    name: h + ""
                });
                void 0 !== d[h] && Z("duplicate-app", {
                    name: h
                });
                f = new X(f,h,k);
                d[h] = f;
                b(f, "create");
                void 0 != f.INTERNAL && void 0 != f.INTERNAL.getToken || S(f, {
                    INTERNAL: {
                        getUid: function() {
                            return null
                        },
                        getToken: function() {
                            return W.resolve(null)
                        },
                        addAuthTokenListener: function() {},
                        removeAuthTokenListener: function() {}
                    }
                });
                return f
            },
            app: a,
            apps: null,
            Promise: W,
            SDK_VERSION: "0.0.0",
            INTERNAL: {
                registerService: function(f, h, n, q, J) {
                    e[f] && Z("duplicate-service", {
                        name: f
                    });
                    e[f] = J ? h : function(r, ab) {
                        return h(r, ab, "[DEFAULT]")
                    }
                    ;
                    q && (g[f] = q);
                    q = function(r) {
                        void 0 === r && (r = a());
                        "function" !== typeof r[f] && Z("invalid-app-argument", {
                            name: f
                        });
                        return r[f]()
                    }
                    ;
                    void 0 !== n && S(q, n);
                    return k[f] = q
                },
                createFirebaseNamespace: $a,
                extendNamespace: function(f) {
                    S(k, f)
                },
                createSubscribe: Va,
                ErrorFactory: T,
                removeApp: function(f) {
                    b(d[f], "delete");
                    delete d[f]
                },
                factories: e,
                useAsService: c,
                Promise: R,
                deepExtend: S
            }
        };
        k["default"] = k;
        Object.defineProperty(k, "apps", {
            get: function() {
                return Object.keys(d).map(function(f) {
                    return d[f]
                })
            }
        });
        a.App = X;
        return k
    }
    function Z(a, b) {
        throw bb.create(a, b);
    }
    var bb = new T("app","Firebase",{
        "no-app": "No Firebase App '{$name}' has been created - call Firebase App.initializeApp()",
        "bad-app-name": "Illegal App name: '{$name}",
        "duplicate-app": "Firebase App named '{$name}' already exists",
        "app-deleted": "Firebase App named '{$name}' already deleted",
        "duplicate-service": "Firebase service named '{$name}' already registered",
        "sa-not-supported": "Initializing the Firebase SDK with a service account is only allowed in a Node.js environment. On client devices, you should instead initialize the SDK with an api key and auth domain",
        "invalid-app-argument": "firebase.{$name}() takes either no argument or a Firebase App instance."
    });
    "undefined" !== typeof firebase && (firebase = $a());
}
).call(this);
firebase.SDK_VERSION = "3.7.5";

//javascript/abc/libs/firebase/oob/oobwidget.js
(function() {
    /*

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/
    var k, aa = function(a) {
        var b = 0;
        return function() {
            return b < a.length ? {
                done: !1,
                value: a[b++]
            } : {
                done: !0
            }
        }
    }, ba = "function" == typeof Object.defineProperties ? Object.defineProperty : function(a, b, c) {
        if (a == Array.prototype || a == Object.prototype)
            return a;
        a[b] = c.value;
        return a
    }
    , da = function(a) {
        a = ["object" == typeof globalThis && globalThis, a, "object" == typeof window && window, "object" == typeof self && self, "object" == typeof global && global];
        for (var b = 0; b < a.length; ++b) {
            var c = a[b];
            if (c && c.Math == Math)
                return c
        }
        throw Error("Cannot find global object");
    }, ea = da(this), fa = function(a, b) {
        if (b)
            a: {
                var c = ea;
                a = a.split(".");
                for (var d = 0; d < a.length - 1; d++) {
                    var e = a[d];
                    if (!(e in c))
                        break a;
                    c = c[e]
                }
                a = a[a.length - 1];
                d = c[a];
                b = b(d);
                b != d && null != b && ba(c, a, {
                    configurable: !0,
                    writable: !0,
                    value: b
                })
            }
    };
    fa("Symbol", function(a) {
        if (a)
            return a;
        var b = function(f, g) {
            this.Ci = f;
            ba(this, "description", {
                configurable: !0,
                writable: !0,
                value: g
            })
        };
        b.prototype.toString = function() {
            return this.Ci
        }
        ;
        var c = "jscomp_symbol_" + (1E9 * Math.random() >>> 0) + "_"
          , d = 0
          , e = function(f) {
            if (this instanceof e)
                throw new TypeError("Symbol is not a constructor");
            return new b(c + (f || "") + "_" + d++,f)
        };
        return e
    });
    fa("Symbol.iterator", function(a) {
        if (a)
            return a;
        a = Symbol("Symbol.iterator");
        for (var b = "Array Int8Array Uint8Array Uint8ClampedArray Int16Array Uint16Array Int32Array Uint32Array Float32Array Float64Array".split(" "), c = 0; c < b.length; c++) {
            var d = ea[b[c]];
            "function" === typeof d && "function" != typeof d.prototype[a] && ba(d.prototype, a, {
                configurable: !0,
                writable: !0,
                value: function() {
                    return ha(aa(this))
                }
            })
        }
        return a
    });
    var ha = function(a) {
        a = {
            next: a
        };
        a[Symbol.iterator] = function() {
            return this
        }
        ;
        return a
    }, ia = function(a) {
        var b = "undefined" != typeof Symbol && Symbol.iterator && a[Symbol.iterator];
        if (b)
            return b.call(a);
        if ("number" == typeof a.length)
            return {
                next: aa(a)
            };
        throw Error(String(a) + " is not an iterable or ArrayLike");
    }, ja = "function" == typeof Object.create ? Object.create : function(a) {
        var b = function() {};
        b.prototype = a;
        return new b
    }
    , ka;
    if ("function" == typeof Object.setPrototypeOf)
        ka = Object.setPrototypeOf;
    else {
        var la;
        a: {
            var ma = {
                a: !0
            }
              , na = {};
            try {
                na.__proto__ = ma;
                la = na.a;
                break a
            } catch (a) {}
            la = !1
        }
        ka = la ? function(a, b) {
            a.__proto__ = b;
            if (a.__proto__ !== b)
                throw new TypeError(a + " is not extensible");
            return a
        }
        : null
    }
    var oa = ka
      , m = function(a, b) {
        a.prototype = ja(b.prototype);
        a.prototype.constructor = a;
        if (oa)
            oa(a, b);
        else
            for (var c in b)
                if ("prototype" != c)
                    if (Object.defineProperties) {
                        var d = Object.getOwnPropertyDescriptor(b, c);
                        d && Object.defineProperty(a, c, d)
                    } else
                        a[c] = b[c];
        a.X = b.prototype
    }
      , pa = function() {
        for (var a = Number(this), b = [], c = a; c < arguments.length; c++)
            b[c - a] = arguments[c];
        return b
    };
    fa("Promise", function(a) {
        function b() {
            this.ob = null
        }
        function c(g) {
            return g instanceof e ? g : new e(function(h) {
                h(g)
            }
            )
        }
        if (a)
            return a;
        b.prototype.Kg = function(g) {
            if (null == this.ob) {
                this.ob = [];
                var h = this;
                this.Lg(function() {
                    h.Si()
                })
            }
            this.ob.push(g)
        }
        ;
        var d = ea.setTimeout;
        b.prototype.Lg = function(g) {
            d(g, 0)
        }
        ;
        b.prototype.Si = function() {
            for (; this.ob && this.ob.length; ) {
                var g = this.ob;
                this.ob = [];
                for (var h = 0; h < g.length; ++h) {
                    var l = g[h];
                    g[h] = null;
                    try {
                        l()
                    } catch (n) {
                        this.Hi(n)
                    }
                }
            }
            this.ob = null
        }
        ;
        b.prototype.Hi = function(g) {
            this.Lg(function() {
                throw g;
            })
        }
        ;
        var e = function(g) {
            this.W = 0;
            this.na = void 0;
            this.Ac = [];
            this.Fh = !1;
            var h = this.nf();
            try {
                g(h.resolve, h.reject)
            } catch (l) {
                h.reject(l)
            }
        };
        e.prototype.nf = function() {
            function g(n) {
                return function(q) {
                    l || (l = !0,
                    n.call(h, q))
                }
            }
            var h = this
              , l = !1;
            return {
                resolve: g(this.bk),
                reject: g(this.ng)
            }
        }
        ;
        e.prototype.bk = function(g) {
            if (g === this)
                this.ng(new TypeError("A Promise cannot resolve to itself"));
            else if (g instanceof e)
                this.mk(g);
            else {
                a: switch (typeof g) {
                case "object":
                    var h = null != g;
                    break a;
                case "function":
                    h = !0;
                    break a;
                default:
                    h = !1
                }
                h ? this.ak(g) : this.jh(g)
            }
        }
        ;
        e.prototype.ak = function(g) {
            var h = void 0;
            try {
                h = g.then
            } catch (l) {
                this.ng(l);
                return
            }
            "function" == typeof h ? this.nk(h, g) : this.jh(g)
        }
        ;
        e.prototype.ng = function(g) {
            this.ii(2, g)
        }
        ;
        e.prototype.jh = function(g) {
            this.ii(1, g)
        }
        ;
        e.prototype.ii = function(g, h) {
            if (0 != this.W)
                throw Error("Cannot settle(" + g + ", " + h + "): Promise already settled in state" + this.W);
            this.W = g;
            this.na = h;
            2 === this.W && this.hk();
            this.Ui()
        }
        ;
        e.prototype.hk = function() {
            var g = this;
            d(function() {
                if (g.Lj()) {
                    var h = ea.console;
                    "undefined" !== typeof h && h.error(g.na)
                }
            }, 1)
        }
        ;
        e.prototype.Lj = function() {
            if (this.Fh)
                return !1;
            var g = ea.CustomEvent
              , h = ea.Event
              , l = ea.dispatchEvent;
            if ("undefined" === typeof l)
                return !0;
            "function" === typeof g ? g = new g("unhandledrejection",{
                cancelable: !0
            }) : "function" === typeof h ? g = new h("unhandledrejection",{
                cancelable: !0
            }) : (g = ea.document.createEvent("CustomEvent"),
            g.initCustomEvent("unhandledrejection", !1, !0, g));
            g.promise = this;
            g.reason = this.na;
            return l(g)
        }
        ;
        e.prototype.Ui = function() {
            if (null != this.Ac) {
                for (var g = 0; g < this.Ac.length; ++g)
                    f.Kg(this.Ac[g]);
                this.Ac = null
            }
        }
        ;
        var f = new b;
        e.prototype.mk = function(g) {
            var h = this.nf();
            g.Qd(h.resolve, h.reject)
        }
        ;
        e.prototype.nk = function(g, h) {
            var l = this.nf();
            try {
                g.call(h, l.resolve, l.reject)
            } catch (n) {
                l.reject(n)
            }
        }
        ;
        e.prototype.then = function(g, h) {
            function l(D, ca) {
                return "function" == typeof D ? function(fb) {
                    try {
                        n(D(fb))
                    } catch (Ve) {
                        q(Ve)
                    }
                }
                : ca
            }
            var n, q, A = new e(function(D, ca) {
                n = D;
                q = ca
            }
            );
            this.Qd(l(g, n), l(h, q));
            return A
        }
        ;
        e.prototype.catch = function(g) {
            return this.then(void 0, g)
        }
        ;
        e.prototype.Qd = function(g, h) {
            function l() {
                switch (n.W) {
                case 1:
                    g(n.na);
                    break;
                case 2:
                    h(n.na);
                    break;
                default:
                    throw Error("Unexpected state: " + n.W);
                }
            }
            var n = this;
            null == this.Ac ? f.Kg(l) : this.Ac.push(l);
            this.Fh = !0
        }
        ;
        e.resolve = c;
        e.reject = function(g) {
            return new e(function(h, l) {
                l(g)
            }
            )
        }
        ;
        e.race = function(g) {
            return new e(function(h, l) {
                for (var n = ia(g), q = n.next(); !q.done; q = n.next())
                    c(q.value).Qd(h, l)
            }
            )
        }
        ;
        e.all = function(g) {
            var h = ia(g)
              , l = h.next();
            return l.done ? c([]) : new e(function(n, q) {
                function A(fb) {
                    return function(Ve) {
                        D[fb] = Ve;
                        ca--;
                        0 == ca && n(D)
                    }
                }
                var D = []
                  , ca = 0;
                do
                    D.push(void 0),
                    ca++,
                    c(l.value).Qd(A(D.length - 1), q),
                    l = h.next();
                while (!l.done)
            }
            )
        }
        ;
        return e
    });
    var qa = function(a, b) {
        return Object.prototype.hasOwnProperty.call(a, b)
    };
    fa("WeakMap", function(a) {
        function b() {}
        function c(l) {
            var n = typeof l;
            return "object" === n && null !== l || "function" === n
        }
        function d(l) {
            if (!qa(l, f)) {
                var n = new b;
                ba(l, f, {
                    value: n
                })
            }
        }
        function e(l) {
            var n = Object[l];
            n && (Object[l] = function(q) {
                if (q instanceof b)
                    return q;
                Object.isExtensible(q) && d(q);
                return n(q)
            }
            )
        }
        if (function() {
            if (!a || !Object.seal)
                return !1;
            try {
                var l = Object.seal({})
                  , n = Object.seal({})
                  , q = new a([[l, 2], [n, 3]]);
                if (2 != q.get(l) || 3 != q.get(n))
                    return !1;
                q.delete(l);
                q.set(n, 4);
                return !q.has(l) && 4 == q.get(n)
            } catch (A) {
                return !1
            }
        }())
            return a;
        var f = "$jscomp_hidden_" + Math.random();
        e("freeze");
        e("preventExtensions");
        e("seal");
        var g = 0
          , h = function(l) {
            this.ua = (g += Math.random() + 1).toString();
            if (l) {
                l = ia(l);
                for (var n; !(n = l.next()).done; )
                    n = n.value,
                    this.set(n[0], n[1])
            }
        };
        h.prototype.set = function(l, n) {
            if (!c(l))
                throw Error("Invalid WeakMap key");
            d(l);
            if (!qa(l, f))
                throw Error("WeakMap key fail: " + l);
            l[f][this.ua] = n;
            return this
        }
        ;
        h.prototype.get = function(l) {
            return c(l) && qa(l, f) ? l[f][this.ua] : void 0
        }
        ;
        h.prototype.has = function(l) {
            return c(l) && qa(l, f) && qa(l[f], this.ua)
        }
        ;
        h.prototype.delete = function(l) {
            return c(l) && qa(l, f) && qa(l[f], this.ua) ? delete l[f][this.ua] : !1
        }
        ;
        return h
    });
    fa("Map", function(a) {
        if (function() {
            if (!a || "function" != typeof a || !a.prototype.entries || "function" != typeof Object.seal)
                return !1;
            try {
                var h = Object.seal({
                    x: 4
                })
                  , l = new a(ia([[h, "s"]]));
                if ("s" != l.get(h) || 1 != l.size || l.get({
                    x: 4
                }) || l.set({
                    x: 4
                }, "t") != l || 2 != l.size)
                    return !1;
                var n = l.entries()
                  , q = n.next();
                if (q.done || q.value[0] != h || "s" != q.value[1])
                    return !1;
                q = n.next();
                return q.done || 4 != q.value[0].x || "t" != q.value[1] || !n.next().done ? !1 : !0
            } catch (A) {
                return !1
            }
        }())
            return a;
        var b = new WeakMap
          , c = function(h) {
            this.Vc = {};
            this.ta = f();
            this.size = 0;
            if (h) {
                h = ia(h);
                for (var l; !(l = h.next()).done; )
                    l = l.value,
                    this.set(l[0], l[1])
            }
        };
        c.prototype.set = function(h, l) {
            h = 0 === h ? 0 : h;
            var n = d(this, h);
            n.list || (n.list = this.Vc[n.id] = []);
            n.ja ? n.ja.value = l : (n.ja = {
                next: this.ta,
                ib: this.ta.ib,
                head: this.ta,
                key: h,
                value: l
            },
            n.list.push(n.ja),
            this.ta.ib.next = n.ja,
            this.ta.ib = n.ja,
            this.size++);
            return this
        }
        ;
        c.prototype.delete = function(h) {
            h = d(this, h);
            return h.ja && h.list ? (h.list.splice(h.index, 1),
            h.list.length || delete this.Vc[h.id],
            h.ja.ib.next = h.ja.next,
            h.ja.next.ib = h.ja.ib,
            h.ja.head = null,
            this.size--,
            !0) : !1
        }
        ;
        c.prototype.clear = function() {
            this.Vc = {};
            this.ta = this.ta.ib = f();
            this.size = 0
        }
        ;
        c.prototype.has = function(h) {
            return !!d(this, h).ja
        }
        ;
        c.prototype.get = function(h) {
            return (h = d(this, h).ja) && h.value
        }
        ;
        c.prototype.entries = function() {
            return e(this, function(h) {
                return [h.key, h.value]
            })
        }
        ;
        c.prototype.keys = function() {
            return e(this, function(h) {
                return h.key
            })
        }
        ;
        c.prototype.values = function() {
            return e(this, function(h) {
                return h.value
            })
        }
        ;
        c.prototype.forEach = function(h, l) {
            for (var n = this.entries(), q; !(q = n.next()).done; )
                q = q.value,
                h.call(l, q[1], q[0], this)
        }
        ;
        c.prototype[Symbol.iterator] = c.prototype.entries;
        var d = function(h, l) {
            var n = l && typeof l;
            "object" == n || "function" == n ? b.has(l) ? n = b.get(l) : (n = "" + ++g,
            b.set(l, n)) : n = "p_" + l;
            var q = h.Vc[n];
            if (q && qa(h.Vc, n))
                for (h = 0; h < q.length; h++) {
                    var A = q[h];
                    if (l !== l && A.key !== A.key || l === A.key)
                        return {
                            id: n,
                            list: q,
                            index: h,
                            ja: A
                        }
                }
            return {
                id: n,
                list: q,
                index: -1,
                ja: void 0
            }
        }
          , e = function(h, l) {
            var n = h.ta;
            return ha(function() {
                if (n) {
                    for (; n.head != h.ta; )
                        n = n.ib;
                    for (; n.next != n.head; )
                        return n = n.next,
                        {
                            done: !1,
                            value: l(n)
                        };
                    n = null
                }
                return {
                    done: !0,
                    value: void 0
                }
            })
        }
          , f = function() {
            var h = {};
            return h.ib = h.next = h.head = h
        }
          , g = 0;
        return c
    });
    fa("Array.prototype.find", function(a) {
        return a ? a : function(b, c) {
            a: {
                var d = this;
                d instanceof String && (d = String(d));
                for (var e = d.length, f = 0; f < e; f++) {
                    var g = d[f];
                    if (b.call(c, g, f, d)) {
                        b = g;
                        break a
                    }
                }
                b = void 0
            }
            return b
        }
    });
    var ra = function(a, b) {
        a instanceof String && (a += "");
        var c = 0
          , d = !1
          , e = {
            next: function() {
                if (!d && c < a.length) {
                    var f = c++;
                    return {
                        value: b(f, a[f]),
                        done: !1
                    }
                }
                d = !0;
                return {
                    done: !0,
                    value: void 0
                }
            }
        };
        e[Symbol.iterator] = function() {
            return e
        }
        ;
        return e
    };
    fa("Array.prototype.keys", function(a) {
        return a ? a : function() {
            return ra(this, function(b) {
                return b
            })
        }
    });
    fa("Array.prototype.values", function(a) {
        return a ? a : function() {
            return ra(this, function(b, c) {
                return c
            })
        }
    });
    fa("Array.from", function(a) {
        return a ? a : function(b, c, d) {
            c = null != c ? c : function(h) {
                return h
            }
            ;
            var e = []
              , f = "undefined" != typeof Symbol && Symbol.iterator && b[Symbol.iterator];
            if ("function" == typeof f) {
                b = f.call(b);
                for (var g = 0; !(f = b.next()).done; )
                    e.push(c.call(d, f.value, g++))
            } else
                for (f = b.length,
                g = 0; g < f; g++)
                    e.push(c.call(d, b[g], g));
            return e
        }
    });
    var sa = "function" == typeof Object.assign ? Object.assign : function(a, b) {
        for (var c = 1; c < arguments.length; c++) {
            var d = arguments[c];
            if (d)
                for (var e in d)
                    qa(d, e) && (a[e] = d[e])
        }
        return a
    }
    ;
    fa("Object.assign", function(a) {
        return a || sa
    });
    fa("Array.prototype.entries", function(a) {
        return a ? a : function() {
            return ra(this, function(b, c) {
                return [b, c]
            })
        }
    });
    var ta = ta || {}
      , p = this || self
      , ua = function(a) {
        var b = typeof a;
        return "object" != b ? b : a ? Array.isArray(a) ? "array" : b : "null"
    }
      , va = function(a) {
        var b = ua(a);
        return "array" == b || "object" == b && "number" == typeof a.length
    }
      , r = function(a) {
        var b = typeof a;
        return "object" == b && null != a || "function" == b
    }
      , wa = function(a, b, c) {
        return a.call.apply(a.bind, arguments)
    }
      , xa = function(a, b, c) {
        if (!a)
            throw Error();
        if (2 < arguments.length) {
            var d = Array.prototype.slice.call(arguments, 2);
            return function() {
                var e = Array.prototype.slice.call(arguments);
                Array.prototype.unshift.apply(e, d);
                return a.apply(b, e)
            }
        }
        return function() {
            return a.apply(b, arguments)
        }
    }
      , t = function(a, b, c) {
        t = Function.prototype.bind && -1 != Function.prototype.bind.toString().indexOf("native code") ? wa : xa;
        return t.apply(null, arguments)
    }
      , ya = function(a, b) {
        var c = Array.prototype.slice.call(arguments, 1);
        return function() {
            var d = c.slice();
            d.push.apply(d, arguments);
            return a.apply(this, d)
        }
    }
      , u = function(a, b) {
        function c() {}
        c.prototype = b.prototype;
        a.X = b.prototype;
        a.prototype = new c;
        a.prototype.constructor = a;
        a.Qk = function(d, e, f) {
            for (var g = Array(arguments.length - 2), h = 2; h < arguments.length; h++)
                g[h - 2] = arguments[h];
            return b.prototype[e].apply(d, g)
        }
    }
      , za = function(a) {
        return a
    };
    function Aa(a, b) {
        if (Error.captureStackTrace)
            Error.captureStackTrace(this, Aa);
        else {
            var c = Error().stack;
            c && (this.stack = c)
        }
        a && (this.message = String(a));
        void 0 !== b && (this.cause = b)
    }
    u(Aa, Error);
    Aa.prototype.name = "CustomError";
    var Ba;
    function Ca(a, b) {
        a = a.split("%s");
        for (var c = "", d = a.length - 1, e = 0; e < d; e++)
            c += a[e] + (e < b.length ? b[e] : "%s");
        Aa.call(this, c + a[d])
    }
    u(Ca, Aa);
    Ca.prototype.name = "AssertionError";
    function Da(a, b, c, d) {
        var e = "Assertion failed";
        if (c) {
            e += ": " + c;
            var f = d
        } else
            a && (e += ": " + a,
            f = b);
        throw new Ca("" + e,f || []);
    }
    var v = function(a, b, c) {
        a || Da("", null, b, Array.prototype.slice.call(arguments, 2));
        return a
    }
      , Ea = function(a, b, c) {
        null == a && Da("Expected to exist: %s.", [a], b, Array.prototype.slice.call(arguments, 2));
        return a
    }
      , Fa = function(a, b) {
        throw new Ca("Failure" + (a ? ": " + a : ""),Array.prototype.slice.call(arguments, 1));
    }
      , Ga = function(a, b, c) {
        "number" !== typeof a && Da("Expected number but got %s: %s.", [ua(a), a], b, Array.prototype.slice.call(arguments, 2));
        return a
    }
      , Ha = function(a, b, c) {
        "string" !== typeof a && Da("Expected string but got %s: %s.", [ua(a), a], b, Array.prototype.slice.call(arguments, 2))
    }
      , Ia = function(a, b, c) {
        "function" !== typeof a && Da("Expected function but got %s: %s.", [ua(a), a], b, Array.prototype.slice.call(arguments, 2))
    }
      , Ja = function(a, b, c) {
        Array.isArray(a) || Da("Expected array but got %s: %s.", [ua(a), a], b, Array.prototype.slice.call(arguments, 2))
    };
    var Ka = Array.prototype.indexOf ? function(a, b) {
        v(null != a.length);
        return Array.prototype.indexOf.call(a, b, void 0)
    }
    : function(a, b) {
        if ("string" === typeof a)
            return "string" !== typeof b || 1 != b.length ? -1 : a.indexOf(b, 0);
        for (var c = 0; c < a.length; c++)
            if (c in a && a[c] === b)
                return c;
        return -1
    }
      , w = Array.prototype.forEach ? function(a, b) {
        v(null != a.length);
        Array.prototype.forEach.call(a, b, void 0)
    }
    : function(a, b) {
        for (var c = a.length, d = "string" === typeof a ? a.split("") : a, e = 0; e < c; e++)
            e in d && b.call(void 0, d[e], e, a)
    }
    ;
    function La(a, b) {
        for (var c = "string" === typeof a ? a.split("") : a, d = a.length - 1; 0 <= d; --d)
            d in c && b.call(void 0, c[d], d, a)
    }
    var Ma = Array.prototype.filter ? function(a, b) {
        v(null != a.length);
        return Array.prototype.filter.call(a, b, void 0)
    }
    : function(a, b) {
        for (var c = a.length, d = [], e = 0, f = "string" === typeof a ? a.split("") : a, g = 0; g < c; g++)
            if (g in f) {
                var h = f[g];
                b.call(void 0, h, g, a) && (d[e++] = h)
            }
        return d
    }
      , Na = Array.prototype.map ? function(a, b) {
        v(null != a.length);
        return Array.prototype.map.call(a, b, void 0)
    }
    : function(a, b) {
        for (var c = a.length, d = Array(c), e = "string" === typeof a ? a.split("") : a, f = 0; f < c; f++)
            f in e && (d[f] = b.call(void 0, e[f], f, a));
        return d
    }
      , Oa = Array.prototype.some ? function(a, b) {
        v(null != a.length);
        return Array.prototype.some.call(a, b, void 0)
    }
    : function(a, b) {
        for (var c = a.length, d = "string" === typeof a ? a.split("") : a, e = 0; e < c; e++)
            if (e in d && b.call(void 0, d[e], e, a))
                return !0;
        return !1
    }
    ;
    function Pa(a, b) {
        return 0 <= Ka(a, b)
    }
    function Qa(a, b) {
        b = Ka(a, b);
        var c;
        (c = 0 <= b) && Ra(a, b);
        return c
    }
    function Ra(a, b) {
        v(null != a.length);
        return 1 == Array.prototype.splice.call(a, b, 1).length
    }
    function Sa(a, b) {
        var c = 0;
        La(a, function(d, e) {
            b.call(void 0, d, e, a) && Ra(a, e) && c++
        })
    }
    function Ta(a) {
        var b = a.length;
        if (0 < b) {
            for (var c = Array(b), d = 0; d < b; d++)
                c[d] = a[d];
            return c
        }
        return []
    }
    ;var Ua = function(a, b) {
        if (!r(a) || !r(a) || !r(a) || 1 !== a.nodeType || a.namespaceURI && "http://www.w3.org/1999/xhtml" !== a.namespaceURI || a.tagName.toUpperCase() !== b.toString()) {
            b = b.toString() + "; got: ";
            if (r(a))
                try {
                    var c = a.constructor.displayName || a.constructor.name || Object.prototype.toString.call(a)
                } catch (d) {
                    c = "<object could not be stringified>"
                }
            else
                c = void 0 === a ? "undefined" : null === a ? "null" : typeof a;
            Fa("Argument is not an HTML Element with tag name " + (b + c))
        }
    };
    var Va = function() {}
      , Wa = function(a) {
        return "function" === typeof a
    };
    function Xa(a, b, c) {
        for (var d in a)
            b.call(c, a[d], d, a)
    }
    function Ya(a, b) {
        for (var c in a)
            if (b.call(void 0, a[c], c, a))
                return !0;
        return !1
    }
    function Za(a) {
        for (var b in a)
            return !1;
        return !0
    }
    function $a(a) {
        var b = {}, c;
        for (c in a)
            b[c] = a[c];
        return b
    }
    var ab = "constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");
    function bb(a, b) {
        for (var c, d, e = 1; e < arguments.length; e++) {
            d = arguments[e];
            for (c in d)
                a[c] = d[c];
            for (var f = 0; f < ab.length; f++)
                c = ab[f],
                Object.prototype.hasOwnProperty.call(d, c) && (a[c] = d[c])
        }
    }
    ;var cb, db = function() {
        if (void 0 === cb) {
            var a = null
              , b = p.trustedTypes;
            if (b && b.createPolicy)
                try {
                    a = b.createPolicy("goog#html", {
                        createHTML: za,
                        createScript: za,
                        createScriptURL: za
                    })
                } catch (c) {
                    p.console && p.console.error(c.message)
                }
            cb = a
        }
        return cb
    };
    var hb = function(a, b) {
        this.Bg = a === eb && b || "";
        this.Di = gb
    };
    hb.prototype.sb = !0;
    hb.prototype.cb = function() {
        return this.Bg
    }
    ;
    hb.prototype.toString = function() {
        return "Const{" + this.Bg + "}"
    }
    ;
    var ib = function(a) {
        if (a instanceof hb && a.constructor === hb && a.Di === gb)
            return a.Bg;
        Fa("expected object of type Const, got '" + a + "'");
        return "type_error:Const"
    }
      , jb = function(a) {
        return new hb(eb,a)
    }
      , gb = {}
      , eb = {};
    var lb = function(a, b) {
        this.hg = b === kb ? a : ""
    };
    lb.prototype.toString = function() {
        return this.hg + ""
    }
    ;
    lb.prototype.sb = !0;
    lb.prototype.cb = function() {
        return this.hg.toString()
    }
    ;
    var mb = function(a) {
        if (a instanceof lb && a.constructor === lb)
            return a.hg;
        Fa("expected object of type TrustedResourceUrl, got '" + a + "' of type " + ua(a));
        return "type_error:TrustedResourceUrl"
    }
      , qb = function(a, b) {
        var c = ib(a);
        if (!nb.test(c))
            throw Error("Invalid TrustedResourceUrl format: " + c);
        a = c.replace(ob, function(d, e) {
            if (!Object.prototype.hasOwnProperty.call(b, e))
                throw Error('Found marker, "' + e + '", in format string, "' + c + '", but no valid label mapping found in args: ' + JSON.stringify(b));
            d = b[e];
            return d instanceof hb ? ib(d) : encodeURIComponent(String(d))
        });
        return pb(a)
    }
      , ob = /%{(\w+)}/g
      , nb = RegExp("^((https:)?//[0-9a-z.:[\\]-]+/|/[^/\\\\]|[^:/\\\\%]+/|[^:/\\\\%]*[?#]|about:blank#)", "i")
      , kb = {}
      , pb = function(a) {
        var b = db();
        a = b ? b.createScriptURL(a) : a;
        return new lb(a,kb)
    };
    var rb = String.prototype.trim ? function(a) {
        return a.trim()
    }
    : function(a) {
        return /^[\s\xa0]*([\s\S]*?)[\s\xa0]*$/.exec(a)[1]
    }
      , zb = function(a) {
        if (!sb.test(a))
            return a;
        -1 != a.indexOf("&") && (a = a.replace(tb, "&amp;"));
        -1 != a.indexOf("<") && (a = a.replace(ub, "&lt;"));
        -1 != a.indexOf(">") && (a = a.replace(vb, "&gt;"));
        -1 != a.indexOf('"') && (a = a.replace(wb, "&quot;"));
        -1 != a.indexOf("'") && (a = a.replace(xb, "&#39;"));
        -1 != a.indexOf("\x00") && (a = a.replace(yb, "&#0;"));
        return a
    }
      , tb = /&/g
      , ub = /</g
      , vb = />/g
      , wb = /"/g
      , xb = /'/g
      , yb = /\x00/g
      , sb = /[\x00&<>"']/
      , x = function(a, b) {
        return -1 != a.indexOf(b)
    };
    var Bb = function(a, b) {
        this.gg = b === Ab ? a : ""
    };
    Bb.prototype.toString = function() {
        return this.gg.toString()
    }
    ;
    Bb.prototype.sb = !0;
    Bb.prototype.cb = function() {
        return this.gg.toString()
    }
    ;
    var Cb = function(a) {
        if (a instanceof Bb && a.constructor === Bb)
            return a.gg;
        Fa("expected object of type SafeUrl, got '" + a + "' of type " + ua(a));
        return "type_error:SafeUrl"
    }, Db = /^data:(.*);base64,[a-z0-9+\/]+=*$/i, Eb = /^(?:(?:https?|mailto|ftp):|[^:/?#]*(?:[/?#]|$))/i, Fb = function(a) {
        if (a instanceof Bb)
            return a;
        a = "object" == typeof a && a.sb ? a.cb() : String(a);
        Eb.test(a) ? a = new Bb(a,Ab) : (a = String(a).replace(/(%0A|%0D)/g, ""),
        a = a.match(Db) ? new Bb(a,Ab) : null);
        return a
    }, Gb;
    try {
        new URL("s://g"),
        Gb = !0
    } catch (a) {
        Gb = !1
    }
    var Hb = Gb
      , Ib = function(a) {
        if (a instanceof Bb)
            return a;
        a = "object" == typeof a && a.sb ? a.cb() : String(a);
        a: {
            var b = a;
            if (Hb) {
                try {
                    var c = new URL(b)
                } catch (d) {
                    b = "https:";
                    break a
                }
                b = c.protocol
            } else
                b: {
                    c = document.createElement("a");
                    try {
                        c.href = b
                    } catch (d) {
                        b = void 0;
                        break b
                    }
                    b = c.protocol;
                    b = ":" === b || "" === b ? "https:" : b
                }
        }
        v("javascript:" !== b, "%s is a javascript: URL", a) || (a = "about:invalid#zClosurez");
        return new Bb(a,Ab)
    }
      , Ab = {}
      , Jb = new Bb("about:invalid#zClosurez",Ab);
    var Kb = {}
      , Lb = function(a, b) {
        this.fg = b === Kb ? a : "";
        this.sb = !0
    };
    Lb.prototype.toString = function() {
        return this.fg.toString()
    }
    ;
    var Nb = function(a) {
        a = ib(a);
        if (0 === a.length)
            return Mb;
        v(!x(a, "<"), "Forbidden '<' character in style sheet string: " + a);
        return new Lb(a,Kb)
    };
    Lb.prototype.cb = function() {
        return this.fg
    }
    ;
    var Mb = new Lb("",Kb);
    var Ob, Pb;
    a: {
        for (var Qb = ["CLOSURE_FLAGS"], Rb = p, Sb = 0; Sb < Qb.length; Sb++)
            if (Rb = Rb[Qb[Sb]],
            null == Rb) {
                Pb = null;
                break a
            }
        Pb = Rb
    }
    var Tb = Pb && Pb[610401301];
    Ob = null != Tb ? Tb : !1;
    function Ub() {
        var a = p.navigator;
        return a && (a = a.userAgent) ? a : ""
    }
    var Vb, Wb = p.navigator;
    Vb = Wb ? Wb.userAgentData || null : null;
    function Xb(a) {
        return Ob ? Vb ? Vb.brands.some(function(b) {
            return (b = b.brand) && x(b, a)
        }) : !1 : !1
    }
    function y(a) {
        return x(Ub(), a)
    }
    ;function Yb() {
        return Ob ? !!Vb && 0 < Vb.brands.length : !1
    }
    function Zb() {
        return Yb() ? !1 : y("Trident") || y("MSIE")
    }
    function $b() {
        return Yb() ? Xb("Chromium") : (y("Chrome") || y("CriOS")) && !(Yb() ? 0 : y("Edge")) || y("Silk")
    }
    ;var ac = {}
      , bc = function(a, b) {
        this.eg = b === ac ? a : "";
        this.sb = !0
    };
    bc.prototype.cb = function() {
        return this.eg.toString()
    }
    ;
    bc.prototype.toString = function() {
        return this.eg.toString()
    }
    ;
    var cc = function(a) {
        if (a instanceof bc && a.constructor === bc)
            return a.eg;
        Fa("expected object of type SafeHtml, got '" + a + "' of type " + ua(a));
        return "type_error:SafeHtml"
    }
      , ec = function(a) {
        return a instanceof bc ? a : dc(zb("object" == typeof a && a.sb ? a.cb() : String(a)))
    }
      , dc = function(a) {
        var b = db();
        a = b ? b.createHTML(a) : a;
        return new bc(a,ac)
    }
      , fc = new bc(p.trustedTypes && p.trustedTypes.emptyHTML || "",ac);
    var gc = function(a, b) {
        Ha(ib(a), "must provide justification");
        v(!/^[\s\xa0]*$/.test(ib(a)), "must provide non-empty justification");
        return dc(b)
    };
    var hc = function(a) {
        var b = !1, c;
        return function() {
            b || (c = a(),
            b = !0);
            return c
        }
    }(function() {
        if ("undefined" === typeof document)
            return !1;
        var a = document.createElement("div")
          , b = document.createElement("div");
        b.appendChild(document.createElement("div"));
        a.appendChild(b);
        if (!a.firstChild)
            return !1;
        b = a.firstChild.firstChild;
        a.innerHTML = cc(fc);
        return !b.parentElement
    })
      , jc = function(a, b) {
        Ua(a, "SCRIPT");
        var c = ic("script[nonce]", a.ownerDocument && a.ownerDocument.defaultView);
        c && a.setAttribute("nonce", c);
        a.src = mb(b)
    }
      , kc = function(a, b, c, d) {
        a = a instanceof Bb ? a : Ib(a);
        b = b || p;
        c = c instanceof hb ? ib(c) : c || "";
        return void 0 !== d ? b.open(Cb(a), c, d) : b.open(Cb(a), c)
    }
      , lc = /^[\w+/_-]+[=]{0,2}$/
      , ic = function(a, b) {
        b = (b || p).document;
        return b.querySelector ? (a = b.querySelector(a)) && (a = a.nonce || a.getAttribute("nonce")) && lc.test(a) ? a : "" : ""
    };
    var mc = function(a, b) {
        for (var c = a.split("%s"), d = "", e = Array.prototype.slice.call(arguments, 1); e.length && 1 < c.length; )
            d += c.shift() + e.shift();
        return d + c.join("%s")
    };
    var nc = function() {
        this.qa = ("undefined" == typeof document ? null : document) || {
            cookie: ""
        }
    };
    k = nc.prototype;
    k.isEnabled = function() {
        if (!p.navigator.cookieEnabled)
            return !1;
        if (!this.Dh())
            return !0;
        this.set("TESTCOOKIESENABLED", "1", {
            Uf: 60
        });
        if ("1" !== this.get("TESTCOOKIESENABLED"))
            return !1;
        this.remove("TESTCOOKIESENABLED");
        return !0
    }
    ;
    k.set = function(a, b, c) {
        var d = !1;
        if ("object" === typeof c) {
            var e = c.el;
            d = c.ik || !1;
            var f = c.domain || void 0;
            var g = c.path || void 0;
            var h = c.Uf
        }
        if (/[;=\s]/.test(a))
            throw Error('Invalid cookie name "' + a + '"');
        if (/[;\r\n]/.test(b))
            throw Error('Invalid cookie value "' + b + '"');
        void 0 === h && (h = -1);
        this.rg(a + "=" + b + (f ? ";domain=" + f : "") + (g ? ";path=" + g : "") + (0 > h ? "" : 0 == h ? ";expires=" + (new Date(1970,1,1)).toUTCString() : ";expires=" + (new Date(Date.now() + 1E3 * h)).toUTCString()) + (d ? ";secure" : "") + (null != e ? ";samesite=" + e : ""))
    }
    ;
    k.get = function(a, b) {
        for (var c = a + "=", d = (this.ad() || "").split(";"), e = 0, f; e < d.length; e++) {
            f = rb(d[e]);
            if (0 == f.lastIndexOf(c, 0))
                return f.slice(c.length);
            if (f == a)
                return ""
        }
        return b
    }
    ;
    k.remove = function(a, b, c) {
        var d = this.Rc(a);
        this.set(a, "", {
            Uf: 0,
            path: b,
            domain: c
        });
        return d
    }
    ;
    k.be = function() {
        return oc(this).keys
    }
    ;
    k.pb = function() {
        return oc(this).values
    }
    ;
    k.Dh = function() {
        return !this.ad()
    }
    ;
    k.Rc = function(a) {
        return void 0 !== this.get(a)
    }
    ;
    k.clear = function() {
        for (var a = oc(this).keys, b = a.length - 1; 0 <= b; b--)
            this.remove(a[b])
    }
    ;
    k.rg = function(a) {
        this.qa.cookie = a
    }
    ;
    k.ad = function() {
        return this.qa.cookie
    }
    ;
    var oc = function(a) {
        a = (a.ad() || "").split(";");
        for (var b = [], c = [], d, e, f = 0; f < a.length; f++)
            e = rb(a[f]),
            d = e.indexOf("="),
            -1 == d ? (b.push(""),
            c.push(e)) : (b.push(e.substring(0, d)),
            c.push(e.substring(d + 1)));
        return {
            keys: b,
            values: c
        }
    }
      , pc = new nc;
    var qc = /\.(firebaseapp\-staging\.com|staging\-web\.app)$/;
    var rc = function() {
        var a = p.EXPERIMENTS || {};
        this.O = {};
        var b;
        for (b in a) {
            var c = "" + a[b].id;
            this.O[c] = a[b];
            "undefined" !== typeof this.O[c].stagingRollout && (0 > this.O[c].stagingRollout && (this.O[c].stagingRollout = 0),
            1 < this.O[c].stagingRollout && (this.O[c].stagingRollout = 1));
            "undefined" !== typeof this.O[c].rollout && (0 > this.O[c].rollout && (this.O[c].rollout = 0),
            1 < this.O[c].rollout && (this.O[c].rollout = 1))
        }
    };
    rc.prototype.isEnabled = function(a) {
        var b = a.id;
        a = a.id.toString();
        if ("undefined" !== typeof this.O[a]) {
            var c = void 0 === c ? p.window : c;
            if (!(c && c.navigator && c.navigator.cookieEnabled) || this.O[a].expiration && this.O[a].expiration.getTime() <= Date.now())
                return !!this.O[a].defaultValue;
            var d;
            c = this.ad("e_gcip_" + b);
            null === c && (c = parseInt(1E4 * Math.random(), 10) / 1E4,
            this.O[b.toString()].expiration && (d = parseInt((this.O[b.toString()].expiration.getTime() - Date.now()) / 1E3, 10)),
            this.rg("e_gcip_" + b, c.toString(), d));
            b = parseFloat(c);
            var e;
            return (e = void 0 === e ? p.window : e) && e.location && e.location.hostname && qc.test(e.location.hostname) && "undefined" !== typeof this.O[a].stagingRollout ? 0 === b ? !1 : b <= this.O[a].stagingRollout : "undefined" !== typeof this.O[a].rollout ? 0 === b ? !1 : b <= this.O[a].rollout : !!this.O[a].defaultValue
        }
        return !1
    }
    ;
    rc.prototype.rg = function(a, b, c) {
        pc.set(a, b, {
            Uf: c ? c : 2592E3,
            path: "/__/auth/",
            domain: p.window.location.hostname,
            ik: !0
        })
    }
    ;
    rc.prototype.ad = function(a) {
        return pc.get(a) || null
    }
    ;
    var sc = function() {
        this.Vi = new rc
    };
    sc.prototype.zj = function() {
        var a = (p.EXPERIMENTS || {}).CHECK_CONTINUE_URL_IS_AUTHORIZED;
        return "undefined" === typeof a ? !1 : this.Vi.isEnabled(a)
    }
    ;
    var tc = new sc
      , uc = tc.zj.bind(tc);
    var vc = function(a) {
        return "string" == typeof a.className ? a.className : a.getAttribute && a.getAttribute("class") || ""
    }
      , wc = function(a, b) {
        "string" == typeof a.className ? a.className = b : a.setAttribute && a.setAttribute("class", b)
    }
      , xc = function(a, b) {
        return a.classList ? a.classList.contains(b) : Pa(a.classList ? a.classList : vc(a).match(/\S+/g) || [], b)
    }
      , yc = function(a, b) {
        if (a.classList)
            a.classList.add(b);
        else if (!xc(a, b)) {
            var c = vc(a);
            wc(a, c + (0 < c.length ? " " + b : b))
        }
    }
      , zc = function(a, b) {
        a.classList ? a.classList.remove(b) : xc(a, b) && wc(a, Array.prototype.filter.call(a.classList ? a.classList : vc(a).match(/\S+/g) || [], function(c) {
            return c != b
        }).join(" "))
    };
    var Ac = function(a) {
        Ac[" "](a);
        return a
    };
    Ac[" "] = function() {}
    ;
    var Bc = Yb() ? !1 : y("Opera"), z = Zb(), Cc = y("Edge"), Dc = Cc || z, Ec = y("Gecko") && !(x(Ub().toLowerCase(), "webkit") && !y("Edge")) && !(y("Trident") || y("MSIE")) && !y("Edge"), Fc = x(Ub().toLowerCase(), "webkit") && !y("Edge"), Gc = Ob && Vb && Vb.platform ? "macOS" === Vb.platform : y("Macintosh"), Hc = function() {
        var a = p.document;
        return a ? a.documentMode : void 0
    }, Ic;
    a: {
        var Jc = ""
          , Kc = function() {
            var a = Ub();
            if (Ec)
                return /rv:([^\);]+)(\)|;)/.exec(a);
            if (Cc)
                return /Edge\/([\d\.]+)/.exec(a);
            if (z)
                return /\b(?:MSIE|rv)[: ]([^\);]+)(\)|;)/.exec(a);
            if (Fc)
                return /WebKit\/(\S+)/.exec(a);
            if (Bc)
                return /(?:Version)[ \/]?(\S+)/.exec(a)
        }();
        Kc && (Jc = Kc ? Kc[1] : "");
        if (z) {
            var Lc = Hc();
            if (null != Lc && Lc > parseFloat(Jc)) {
                Ic = String(Lc);
                break a
            }
        }
        Ic = Jc
    }
    var Mc = Ic, Nc;
    if (p.document && z) {
        var Oc = Hc();
        Nc = Oc ? Oc : parseInt(Mc, 10) || void 0
    } else
        Nc = void 0;
    var Pc = Nc;
    try {
        (new self.OffscreenCanvas(0,0)).getContext("2d")
    } catch (a) {}
    ;var Sc = function(a) {
        return a ? new Qc(Rc(a)) : Ba || (Ba = new Qc)
    }
      , Tc = function(a, b) {
        return "string" === typeof b ? a.getElementById(b) : b
    }
      , Vc = function(a, b) {
        var c = b || document;
        return c.querySelectorAll && c.querySelector ? c.querySelectorAll("." + a) : Uc(document, "*", a, b)
    }
      , Wc = function(a, b) {
        var c = b || document;
        if (c.getElementsByClassName)
            a = c.getElementsByClassName(a)[0];
        else {
            c = document;
            var d = b || c;
            a = d.querySelectorAll && d.querySelector && a ? d.querySelector(a ? "." + a : "") : Uc(c, "*", a, b)[0] || null
        }
        return a || null
    }
      , Uc = function(a, b, c, d) {
        a = d || a;
        b = b && "*" != b ? String(b).toUpperCase() : "";
        if (a.querySelectorAll && a.querySelector && (b || c))
            return a.querySelectorAll(b + (c ? "." + c : ""));
        if (c && a.getElementsByClassName) {
            a = a.getElementsByClassName(c);
            if (b) {
                d = {};
                for (var e = 0, f = 0, g; g = a[f]; f++)
                    b == g.nodeName && (d[e++] = g);
                d.length = e;
                return d
            }
            return a
        }
        a = a.getElementsByTagName(b || "*");
        if (c) {
            d = {};
            for (f = e = 0; g = a[f]; f++)
                b = g.className,
                "function" == typeof b.split && Pa(b.split(/\s+/), c) && (d[e++] = g);
            d.length = e;
            return d
        }
        return a
    }
      , Yc = function(a, b) {
        Xa(b, function(c, d) {
            c && "object" == typeof c && c.sb && (c = c.cb());
            "style" == d ? a.style.cssText = c : "class" == d ? a.className = c : "for" == d ? a.htmlFor = c : Xc.hasOwnProperty(d) ? a.setAttribute(Xc[d], c) : 0 == d.lastIndexOf("aria-", 0) || 0 == d.lastIndexOf("data-", 0) ? a.setAttribute(d, c) : a[d] = c
        })
    }
      , Xc = {
        cellpadding: "cellPadding",
        cellspacing: "cellSpacing",
        colspan: "colSpan",
        frameborder: "frameBorder",
        height: "height",
        maxlength: "maxLength",
        nonce: "nonce",
        role: "role",
        rowspan: "rowSpan",
        type: "type",
        usemap: "useMap",
        valign: "vAlign",
        width: "width"
    }
      , $c = function(a, b, c) {
        return Zc(document, arguments)
    }
      , Zc = function(a, b) {
        var c = b[1]
          , d = ad(a, String(b[0]));
        c && ("string" === typeof c ? d.className = c : Array.isArray(c) ? d.className = c.join(" ") : Yc(d, c));
        2 < b.length && bd(a, d, b, 2);
        return d
    }
      , bd = function(a, b, c, d) {
        function e(h) {
            h && b.appendChild("string" === typeof h ? a.createTextNode(h) : h)
        }
        for (; d < c.length; d++) {
            var f = c[d];
            if (!va(f) || r(f) && 0 < f.nodeType)
                e(f);
            else {
                a: {
                    if (f && "number" == typeof f.length) {
                        if (r(f)) {
                            var g = "function" == typeof f.item || "string" == typeof f.item;
                            break a
                        }
                        if ("function" === typeof f) {
                            g = "function" == typeof f.item;
                            break a
                        }
                    }
                    g = !1
                }
                w(g ? Ta(f) : f, e)
            }
        }
    }
      , ad = function(a, b) {
        b = String(b);
        "application/xhtml+xml" === a.contentType && (b = b.toLowerCase());
        return a.createElement(b)
    }
      , cd = function(a) {
        for (var b; b = a.firstChild; )
            a.removeChild(b)
    }
      , dd = function(a) {
        return a && a.parentNode ? a.parentNode.removeChild(a) : null
    }
      , Rc = function(a) {
        v(a, "Node cannot be null or undefined.");
        return 9 == a.nodeType ? a : a.ownerDocument || a.document
    }
      , ed = function(a, b) {
        v(null != a, "goog.dom.setTextContent expects a non-null value for node");
        if ("textContent"in a)
            a.textContent = b;
        else if (3 == a.nodeType)
            a.data = String(b);
        else if (a.firstChild && 3 == a.firstChild.nodeType) {
            for (; a.lastChild != a.firstChild; )
                a.removeChild(v(a.lastChild));
            a.firstChild.data = String(b)
        } else {
            cd(a);
            var c = Rc(a);
            a.appendChild(c.createTextNode(String(b)))
        }
    }
      , gd = function(a) {
        return fd(a, function(b) {
            return "string" === typeof b.className && Pa(b.className.split(/\s+/), "firebaseui-textfield")
        })
    }
      , fd = function(a, b) {
        for (var c = 0; a; ) {
            v("parentNode" != a.name);
            if (b(a))
                return a;
            a = a.parentNode;
            c++
        }
        return null
    }
      , Qc = function(a) {
        this.qa = a || p.document || document
    };
    k = Qc.prototype;
    k.bd = Sc;
    k.Ha = function() {
        return Tc(this.qa)
    }
    ;
    k.getElementsByTagName = function(a, b) {
        return (b || this.qa).getElementsByTagName(String(a))
    }
    ;
    k.sa = function(a, b) {
        return Wc(a, b || this.qa)
    }
    ;
    k.Sc = function(a, b, c) {
        return Zc(this.qa, arguments)
    }
    ;
    k.createElement = function(a) {
        return ad(this.qa, a)
    }
    ;
    k.createTextNode = function(a) {
        return this.qa.createTextNode(String(a))
    }
    ;
    k.getWindow = function() {
        var a = this.qa;
        return a.parentWindow || a.defaultView
    }
    ;
    k.appendChild = function(a, b) {
        v(null != a && null != b, "goog.dom.appendChild expects non-null arguments");
        a.appendChild(b)
    }
    ;
    k.append = function(a, b) {
        bd(Rc(a), a, arguments, 1)
    }
    ;
    k.canHaveChildren = function(a) {
        if (1 != a.nodeType)
            return !1;
        switch (a.tagName) {
        case "APPLET":
        case "AREA":
        case "BASE":
        case "BR":
        case "COL":
        case "COMMAND":
        case "EMBED":
        case "FRAME":
        case "HR":
        case "IMG":
        case "INPUT":
        case "IFRAME":
        case "ISINDEX":
        case "KEYGEN":
        case "LINK":
        case "NOFRAMES":
        case "NOSCRIPT":
        case "META":
        case "OBJECT":
        case "PARAM":
        case "SCRIPT":
        case "SOURCE":
        case "STYLE":
        case "TRACK":
        case "WBR":
            return !1
        }
        return !0
    }
    ;
    k.removeNode = dd;
    k.contains = function(a, b) {
        if (!a || !b)
            return !1;
        if (a.contains && 1 == b.nodeType)
            return a == b || a.contains(b);
        if ("undefined" != typeof a.compareDocumentPosition)
            return a == b || !!(a.compareDocumentPosition(b) & 16);
        for (; b && a != b; )
            b = b.parentNode;
        return b == a
    }
    ;
    var hd = Object.freeze || function(a) {
        return a
    }
    ;
    var id = function(a) {
        var b = a.type;
        if ("string" === typeof b)
            switch (b.toLowerCase()) {
            case "checkbox":
            case "radio":
                return a.checked ? a.value : null;
            case "select-one":
                return b = a.selectedIndex,
                0 <= b ? a.options[b].value : null;
            case "select-multiple":
                b = [];
                for (var c, d = 0; c = a.options[d]; d++)
                    c.selected && b.push(c.value);
                return b.length ? b : null
            }
        return null != a.value ? a.value : null
    };
    function jd(a) {
        a && "function" == typeof a.Va && a.Va()
    }
    ;var kd = function() {
        this.mc = this.mc;
        this.Rb = this.Rb
    };
    kd.prototype.mc = !1;
    kd.prototype.isDisposed = function() {
        return this.mc
    }
    ;
    kd.prototype.Va = function() {
        this.mc || (this.mc = !0,
        this.F())
    }
    ;
    var ld = function(a, b) {
        a.mc ? b() : (a.Rb || (a.Rb = []),
        a.Rb.push(b))
    };
    kd.prototype.F = function() {
        if (this.Rb)
            for (; this.Rb.length; )
                this.Rb.shift()()
    }
    ;
    var md = function(a, b) {
        this.type = a;
        this.currentTarget = this.target = b;
        this.defaultPrevented = this.ud = !1
    };
    md.prototype.stopPropagation = function() {
        this.ud = !0
    }
    ;
    md.prototype.preventDefault = function() {
        this.defaultPrevented = !0
    }
    ;
    var nd = function() {
        if (!p.addEventListener || !Object.defineProperty)
            return !1;
        var a = !1
          , b = Object.defineProperty({}, "passive", {
            get: function() {
                a = !0
            }
        });
        try {
            p.addEventListener("test", function() {}, b),
            p.removeEventListener("test", function() {}, b)
        } catch (c) {}
        return a
    }();
    var B = function(a, b) {
        md.call(this, a ? a.type : "");
        this.relatedTarget = this.currentTarget = this.target = null;
        this.button = this.screenY = this.screenX = this.clientY = this.clientX = this.offsetY = this.offsetX = 0;
        this.key = "";
        this.charCode = this.keyCode = 0;
        this.metaKey = this.shiftKey = this.altKey = this.ctrlKey = !1;
        this.state = null;
        this.pointerId = 0;
        this.pointerType = "";
        this.Y = null;
        a && this.init(a, b)
    };
    u(B, md);
    var od = hd({
        2: "touch",
        3: "pen",
        4: "mouse"
    });
    B.prototype.init = function(a, b) {
        var c = this.type = a.type
          , d = a.changedTouches && a.changedTouches.length ? a.changedTouches[0] : null;
        this.target = a.target || a.srcElement;
        this.currentTarget = b;
        if (b = a.relatedTarget) {
            if (Ec) {
                a: {
                    try {
                        Ac(b.nodeName);
                        var e = !0;
                        break a
                    } catch (f) {}
                    e = !1
                }
                e || (b = null)
            }
        } else
            "mouseover" == c ? b = a.fromElement : "mouseout" == c && (b = a.toElement);
        this.relatedTarget = b;
        d ? (this.clientX = void 0 !== d.clientX ? d.clientX : d.pageX,
        this.clientY = void 0 !== d.clientY ? d.clientY : d.pageY,
        this.screenX = d.screenX || 0,
        this.screenY = d.screenY || 0) : (this.offsetX = Fc || void 0 !== a.offsetX ? a.offsetX : a.layerX,
        this.offsetY = Fc || void 0 !== a.offsetY ? a.offsetY : a.layerY,
        this.clientX = void 0 !== a.clientX ? a.clientX : a.pageX,
        this.clientY = void 0 !== a.clientY ? a.clientY : a.pageY,
        this.screenX = a.screenX || 0,
        this.screenY = a.screenY || 0);
        this.button = a.button;
        this.keyCode = a.keyCode || 0;
        this.key = a.key || "";
        this.charCode = a.charCode || ("keypress" == c ? a.keyCode : 0);
        this.ctrlKey = a.ctrlKey;
        this.altKey = a.altKey;
        this.shiftKey = a.shiftKey;
        this.metaKey = a.metaKey;
        this.pointerId = a.pointerId || 0;
        this.pointerType = "string" === typeof a.pointerType ? a.pointerType : od[a.pointerType] || "";
        this.state = a.state;
        this.Y = a;
        a.defaultPrevented && B.X.preventDefault.call(this)
    }
    ;
    B.prototype.stopPropagation = function() {
        B.X.stopPropagation.call(this);
        this.Y.stopPropagation ? this.Y.stopPropagation() : this.Y.cancelBubble = !0
    }
    ;
    B.prototype.preventDefault = function() {
        B.X.preventDefault.call(this);
        var a = this.Y;
        a.preventDefault ? a.preventDefault() : a.returnValue = !1
    }
    ;
    B.prototype.Zi = function() {
        return this.Y
    }
    ;
    var pd = "closure_listenable_" + (1E6 * Math.random() | 0)
      , qd = function(a) {
        return !(!a || !a[pd])
    };
    var rd = 0;
    var sd = function(a, b, c, d, e) {
        this.listener = a;
        this.proxy = null;
        this.src = b;
        this.type = c;
        this.capture = !!d;
        this.fe = e;
        this.key = ++rd;
        this.Ad = this.Pd = !1
    }
      , td = function(a) {
        a.Ad = !0;
        a.listener = null;
        a.proxy = null;
        a.src = null;
        a.fe = null
    };
    var ud = function(a) {
        this.src = a;
        this.ka = {};
        this.Jd = 0
    };
    ud.prototype.add = function(a, b, c, d, e) {
        var f = a.toString();
        a = this.ka[f];
        a || (a = this.ka[f] = [],
        this.Jd++);
        var g = vd(a, b, d, e);
        -1 < g ? (b = a[g],
        c || (b.Pd = !1)) : (b = new sd(b,this.src,f,!!d,e),
        b.Pd = c,
        a.push(b));
        return b
    }
    ;
    ud.prototype.remove = function(a, b, c, d) {
        a = a.toString();
        if (!(a in this.ka))
            return !1;
        var e = this.ka[a];
        b = vd(e, b, c, d);
        return -1 < b ? (td(e[b]),
        Ra(e, b),
        0 == e.length && (delete this.ka[a],
        this.Jd--),
        !0) : !1
    }
    ;
    var wd = function(a, b) {
        var c = b.type;
        c in a.ka && Qa(a.ka[c], b) && (td(b),
        0 == a.ka[c].length && (delete a.ka[c],
        a.Jd--))
    };
    ud.prototype.Ce = function() {
        var a = 0, b;
        for (b in this.ka) {
            for (var c = this.ka[b], d = 0; d < c.length; d++)
                ++a,
                td(c[d]);
            delete this.ka[b];
            this.Jd--
        }
    }
    ;
    ud.prototype.cd = function(a, b, c, d) {
        a = this.ka[a.toString()];
        var e = -1;
        a && (e = vd(a, b, c, d));
        return -1 < e ? a[e] : null
    }
    ;
    ud.prototype.hasListener = function(a, b) {
        var c = void 0 !== a
          , d = c ? a.toString() : ""
          , e = void 0 !== b;
        return Ya(this.ka, function(f) {
            for (var g = 0; g < f.length; ++g)
                if (!(c && f[g].type != d || e && f[g].capture != b))
                    return !0;
            return !1
        })
    }
    ;
    var vd = function(a, b, c, d) {
        for (var e = 0; e < a.length; ++e) {
            var f = a[e];
            if (!f.Ad && f.listener == b && f.capture == !!c && f.fe == d)
                return e
        }
        return -1
    };
    var xd = "closure_lm_" + (1E6 * Math.random() | 0)
      , yd = {}
      , zd = 0
      , C = function(a, b, c, d, e) {
        if (d && d.once)
            return Ad(a, b, c, d, e);
        if (Array.isArray(b)) {
            for (var f = 0; f < b.length; f++)
                C(a, b[f], c, d, e);
            return null
        }
        c = Bd(c);
        return qd(a) ? a.listen(b, c, r(d) ? !!d.capture : !!d, e) : Cd(a, b, c, !1, d, e)
    }
      , Cd = function(a, b, c, d, e, f) {
        if (!b)
            throw Error("Invalid event type");
        var g = r(e) ? !!e.capture : !!e
          , h = Dd(a);
        h || (a[xd] = h = new ud(a));
        c = h.add(b, c, d, g, f);
        if (c.proxy)
            return c;
        d = Ed();
        c.proxy = d;
        d.src = a;
        d.listener = c;
        if (a.addEventListener)
            nd || (e = g),
            void 0 === e && (e = !1),
            a.addEventListener(b.toString(), d, e);
        else if (a.attachEvent)
            a.attachEvent(Fd(b.toString()), d);
        else if (a.addListener && a.removeListener)
            v("change" === b, "MediaQueryList only has a change event"),
            a.addListener(d);
        else
            throw Error("addEventListener and attachEvent are unavailable.");
        zd++;
        return c
    }
      , Ed = function() {
        var a = Gd
          , b = function(c) {
            return a.call(b.src, b.listener, c)
        };
        return b
    }
      , Ad = function(a, b, c, d, e) {
        if (Array.isArray(b)) {
            for (var f = 0; f < b.length; f++)
                Ad(a, b[f], c, d, e);
            return null
        }
        c = Bd(c);
        return qd(a) ? a.yc(b, c, r(d) ? !!d.capture : !!d, e) : Cd(a, b, c, !0, d, e)
    }
      , Hd = function(a, b, c, d, e) {
        if (Array.isArray(b))
            for (var f = 0; f < b.length; f++)
                Hd(a, b[f], c, d, e);
        else
            d = r(d) ? !!d.capture : !!d,
            c = Bd(c),
            qd(a) ? a.Hg(b, c, d, e) : a && (a = Dd(a)) && (b = a.cd(b, c, d, e)) && Id(b)
    }
      , Id = function(a) {
        if ("number" !== typeof a && a && !a.Ad) {
            var b = a.src;
            if (qd(b))
                wd(b.Ka, a);
            else {
                var c = a.type
                  , d = a.proxy;
                b.removeEventListener ? b.removeEventListener(c, d, a.capture) : b.detachEvent ? b.detachEvent(Fd(c), d) : b.addListener && b.removeListener && b.removeListener(d);
                zd--;
                (c = Dd(b)) ? (wd(c, a),
                0 == c.Jd && (c.src = null,
                b[xd] = null)) : td(a)
            }
        }
    }
      , Fd = function(a) {
        return a in yd ? yd[a] : yd[a] = "on" + a
    }
      , Gd = function(a, b) {
        if (a.Ad)
            a = !0;
        else {
            b = new B(b,this);
            var c = a.listener
              , d = a.fe || a.src;
            a.Pd && Id(a);
            a = c.call(d, b)
        }
        return a
    }
      , Dd = function(a) {
        a = a[xd];
        return a instanceof ud ? a : null
    }
      , Jd = "__closure_events_fn_" + (1E9 * Math.random() >>> 0)
      , Bd = function(a) {
        v(a, "Listener can not be null.");
        if ("function" === typeof a)
            return a;
        v(a.handleEvent, "An object listener must have handleEvent method.");
        a[Jd] || (a[Jd] = function(b) {
            return a.handleEvent(b)
        }
        );
        return a[Jd]
    };
    var E = function() {
        kd.call(this);
        this.Ka = new ud(this);
        this.Ei = this;
        this.ye = null
    };
    u(E, kd);
    E.prototype[pd] = !0;
    k = E.prototype;
    k.vg = function(a) {
        this.ye = a
    }
    ;
    k.addEventListener = function(a, b, c, d) {
        C(this, a, b, c, d)
    }
    ;
    k.removeEventListener = function(a, b, c, d) {
        Hd(this, a, b, c, d)
    }
    ;
    k.dispatchEvent = function(a) {
        Kd(this);
        var b = this.ye;
        if (b) {
            var c = [];
            for (var d = 1; b; b = b.ye)
                c.push(b),
                v(1E3 > ++d, "infinite loop")
        }
        b = this.Ei;
        d = a.type || a;
        if ("string" === typeof a)
            a = new md(a,b);
        else if (a instanceof md)
            a.target = a.target || b;
        else {
            var e = a;
            a = new md(d,b);
            bb(a, e)
        }
        e = !0;
        if (c)
            for (var f = c.length - 1; !a.ud && 0 <= f; f--) {
                var g = a.currentTarget = c[f];
                e = Ld(g, d, !0, a) && e
            }
        a.ud || (g = a.currentTarget = b,
        e = Ld(g, d, !0, a) && e,
        a.ud || (e = Ld(g, d, !1, a) && e));
        if (c)
            for (f = 0; !a.ud && f < c.length; f++)
                g = a.currentTarget = c[f],
                e = Ld(g, d, !1, a) && e;
        return e
    }
    ;
    k.F = function() {
        E.X.F.call(this);
        this.Ka && this.Ka.Ce();
        this.ye = null
    }
    ;
    k.listen = function(a, b, c, d) {
        Kd(this);
        return this.Ka.add(String(a), b, !1, c, d)
    }
    ;
    k.yc = function(a, b, c, d) {
        return this.Ka.add(String(a), b, !0, c, d)
    }
    ;
    k.Hg = function(a, b, c, d) {
        this.Ka.remove(String(a), b, c, d)
    }
    ;
    var Ld = function(a, b, c, d) {
        b = a.Ka.ka[String(b)];
        if (!b)
            return !0;
        b = b.concat();
        for (var e = !0, f = 0; f < b.length; ++f) {
            var g = b[f];
            if (g && !g.Ad && g.capture == c) {
                var h = g.listener
                  , l = g.fe || g.src;
                g.Pd && wd(a.Ka, g);
                e = !1 !== h.call(l, d) && e
            }
        }
        return e && !d.defaultPrevented
    };
    E.prototype.cd = function(a, b, c, d) {
        return this.Ka.cd(String(a), b, c, d)
    }
    ;
    E.prototype.hasListener = function(a, b) {
        return this.Ka.hasListener(void 0 !== a ? String(a) : void 0, b)
    }
    ;
    var Kd = function(a) {
        v(a.Ka, "Event target is not initialized. Did you call the superclass (goog.events.EventTarget) constructor?")
    };
    var Nd = function(a) {
        if (a.altKey && !a.ctrlKey || a.metaKey || 112 <= a.keyCode && 123 >= a.keyCode)
            return !1;
        if (Md(a.keyCode))
            return !0;
        switch (a.keyCode) {
        case 18:
        case 20:
        case 93:
        case 17:
        case 40:
        case 35:
        case 27:
        case 36:
        case 45:
        case 37:
        case 224:
        case 91:
        case 144:
        case 12:
        case 34:
        case 33:
        case 19:
        case 255:
        case 44:
        case 39:
        case 145:
        case 16:
        case 38:
        case 252:
        case 224:
        case 92:
            return !1;
        case 0:
            return !Ec;
        default:
            return 166 > a.keyCode || 183 < a.keyCode
        }
    }
      , Pd = function(a, b, c, d, e, f) {
        if (Gc && e)
            return Md(a);
        if (e && !d)
            return !1;
        if (!Ec) {
            "number" === typeof b && (b = Od(b));
            var g = 17 == b || 18 == b || Gc && 91 == b;
            if ((!c || Gc) && g || Gc && 16 == b && (d || f))
                return !1
        }
        if ((Fc || Cc) && d && c)
            switch (a) {
            case 220:
            case 219:
            case 221:
            case 192:
            case 186:
            case 189:
            case 187:
            case 188:
            case 190:
            case 191:
            case 192:
            case 222:
                return !1
            }
        if (z && d && b == a)
            return !1;
        switch (a) {
        case 13:
            return Ec ? f || e ? !1 : !(c && d) : !0;
        case 27:
            return !(Fc || Cc || Ec)
        }
        return Ec && (d || e || f) ? !1 : Md(a)
    }
      , Md = function(a) {
        if (48 <= a && 57 >= a || 96 <= a && 106 >= a || 65 <= a && 90 >= a || (Fc || Cc) && 0 == a)
            return !0;
        switch (a) {
        case 32:
        case 43:
        case 63:
        case 64:
        case 107:
        case 109:
        case 110:
        case 111:
        case 186:
        case 59:
        case 189:
        case 187:
        case 61:
        case 188:
        case 190:
        case 191:
        case 192:
        case 222:
        case 219:
        case 220:
        case 221:
        case 163:
        case 58:
            return !0;
        case 173:
            return Ec;
        default:
            return !1
        }
    }
      , Od = function(a) {
        if (Ec)
            a = Qd(a);
        else if (Gc && Fc)
            switch (a) {
            case 93:
                a = 91
            }
        return a
    }
      , Qd = function(a) {
        switch (a) {
        case 61:
            return 187;
        case 59:
            return 186;
        case 173:
            return 189;
        case 224:
            return 91;
        case 0:
            return 224;
        default:
            return a
        }
    };
    var Rd = function(a) {
        E.call(this);
        this.u = a;
        C(a, "keydown", this.de, !1, this);
        C(a, "click", this.rh, !1, this)
    };
    u(Rd, E);
    Rd.prototype.de = function(a) {
        (13 == a.keyCode || Fc && 3 == a.keyCode) && Sd(this, a)
    }
    ;
    Rd.prototype.rh = function(a) {
        Sd(this, a)
    }
    ;
    var Sd = function(a, b) {
        var c = new Td(b);
        if (a.dispatchEvent(c)) {
            c = new Ud(b);
            try {
                a.dispatchEvent(c)
            } finally {
                b.stopPropagation()
            }
        }
    };
    Rd.prototype.F = function() {
        Rd.X.F.call(this);
        Hd(this.u, "keydown", this.de, !1, this);
        Hd(this.u, "click", this.rh, !1, this);
        delete this.u
    }
    ;
    var Ud = function(a) {
        B.call(this, a.Y);
        this.type = "action"
    };
    u(Ud, B);
    var Td = function(a) {
        B.call(this, a.Y);
        this.type = "beforeaction"
    };
    u(Td, B);
    var Vd = function(a) {
        E.call(this);
        this.u = a;
        a = z ? "focusout" : "blur";
        this.Fj = C(this.u, z ? "focusin" : "focus", this, !z);
        this.Gj = C(this.u, a, this, !z)
    };
    u(Vd, E);
    Vd.prototype.handleEvent = function(a) {
        var b = new B(a.Y);
        b.type = "focusin" == a.type || "focus" == a.type ? "focusin" : "focusout";
        this.dispatchEvent(b)
    }
    ;
    Vd.prototype.F = function() {
        Vd.X.F.call(this);
        Id(this.Fj);
        Id(this.Gj);
        delete this.u
    }
    ;
    var Wd = function(a) {
        kd.call(this);
        this.Ef = a;
        this.wc = {}
    };
    u(Wd, kd);
    var Xd = [];
    Wd.prototype.listen = function(a, b, c, d) {
        Array.isArray(b) || (b && (Xd[0] = b.toString()),
        b = Xd);
        for (var e = 0; e < b.length; e++) {
            var f = C(a, b[e], c || this.handleEvent, d || !1, this.Ef || this);
            if (!f)
                break;
            this.wc[f.key] = f
        }
        return this
    }
    ;
    Wd.prototype.yc = function(a, b, c, d) {
        return Yd(this, a, b, c, d)
    }
    ;
    var Yd = function(a, b, c, d, e, f) {
        if (Array.isArray(c))
            for (var g = 0; g < c.length; g++)
                Yd(a, b, c[g], d, e, f);
        else {
            b = Ad(b, c, d || a.handleEvent, e, f || a.Ef || a);
            if (!b)
                return a;
            a.wc[b.key] = b
        }
        return a
    };
    Wd.prototype.Hg = function(a, b, c, d, e) {
        if (Array.isArray(b))
            for (var f = 0; f < b.length; f++)
                this.Hg(a, b[f], c, d, e);
        else
            c = c || this.handleEvent,
            d = r(d) ? !!d.capture : !!d,
            e = e || this.Ef || this,
            c = Bd(c),
            d = !!d,
            b = qd(a) ? a.cd(b, c, d, e) : a ? (a = Dd(a)) ? a.cd(b, c, d, e) : null : null,
            b && (Id(b),
            delete this.wc[b.key])
    }
    ;
    Wd.prototype.Ce = function() {
        Xa(this.wc, function(a, b) {
            this.wc.hasOwnProperty(b) && Id(a)
        }, this);
        this.wc = {}
    }
    ;
    Wd.prototype.F = function() {
        Wd.X.F.call(this);
        this.Ce()
    }
    ;
    Wd.prototype.handleEvent = function() {
        throw Error("EventHandler.handleEvent not implemented");
    }
    ;
    var Zd = function(a, b) {
        this.Ej = 100;
        this.Ni = a;
        this.Zj = b;
        this.xe = 0;
        this.ta = null
    };
    Zd.prototype.get = function() {
        if (0 < this.xe) {
            this.xe--;
            var a = this.ta;
            this.ta = a.next;
            a.next = null
        } else
            a = this.Ni();
        return a
    }
    ;
    Zd.prototype.put = function(a) {
        this.Zj(a);
        this.xe < this.Ej && (this.xe++,
        a.next = this.ta,
        this.ta = a)
    }
    ;
    var $d, ae = function() {
        var a = p.MessageChannel;
        "undefined" === typeof a && "undefined" !== typeof window && window.postMessage && window.addEventListener && !y("Presto") && (a = function() {
            var e = ad(document, "IFRAME");
            e.style.display = "none";
            document.documentElement.appendChild(e);
            var f = e.contentWindow;
            e = f.document;
            e.open();
            e.close();
            var g = "callImmediate" + Math.random()
              , h = "file:" == f.location.protocol ? "*" : f.location.protocol + "//" + f.location.host;
            e = t(function(l) {
                if (("*" == h || l.origin == h) && l.data == g)
                    this.port1.onmessage()
            }, this);
            f.addEventListener("message", e, !1);
            this.port1 = {};
            this.port2 = {
                postMessage: function() {
                    f.postMessage(g, h)
                }
            }
        }
        );
        if ("undefined" !== typeof a && !Zb()) {
            var b = new a
              , c = {}
              , d = c;
            b.port1.onmessage = function() {
                if (void 0 !== c.next) {
                    c = c.next;
                    var e = c.Rg;
                    c.Rg = null;
                    e()
                }
            }
            ;
            return function(e) {
                d.next = {
                    Rg: e
                };
                d = d.next;
                b.port2.postMessage(0)
            }
        }
        return function(e) {
            p.setTimeout(e, 0)
        }
    };
    function be(a) {
        p.setTimeout(function() {
            throw a;
        }, 0)
    }
    ;var ce = function() {
        this.Xe = this.bc = null
    };
    ce.prototype.add = function(a, b) {
        var c = de.get();
        c.set(a, b);
        this.Xe ? this.Xe.next = c : (v(!this.bc),
        this.bc = c);
        this.Xe = c
    }
    ;
    ce.prototype.remove = function() {
        var a = null;
        this.bc && (a = this.bc,
        this.bc = this.bc.next,
        this.bc || (this.Xe = null),
        a.next = null);
        return a
    }
    ;
    var de = new Zd(function() {
        return new ee
    }
    ,function(a) {
        return a.reset()
    }
    )
      , ee = function() {
        this.next = this.scope = this.xf = null
    };
    ee.prototype.set = function(a, b) {
        this.xf = a;
        this.scope = b;
        this.next = null
    }
    ;
    ee.prototype.reset = function() {
        this.next = this.scope = this.xf = null
    }
    ;
    var fe = p.console && p.console.createTask ? p.console.createTask.bind(p.console) : void 0
      , ge = fe ? Symbol("consoleTask") : void 0;
    function he(a, b) {
        function c() {
            var e = pa.apply(0, arguments)
              , f = this;
            return d.run(function() {
                var g = a.call
                  , h = g.apply
                  , l = [f]
                  , n = l.concat;
                if (e instanceof Array)
                    var q = e;
                else {
                    q = ia(e);
                    for (var A, D = []; !(A = q.next()).done; )
                        D.push(A.value);
                    q = D
                }
                return h.call(g, a, n.call(l, q))
            })
        }
        b = void 0 === b ? "anonymous" : b;
        if (!fe || a[Ea(ge)])
            return a;
        var d = fe(a.name || b);
        c[Ea(ge)] = d;
        return c
    }
    ;var ie, je = !1, ke = new ce, me = function(a, b) {
        ie || le();
        je || (ie(),
        je = !0);
        a = he(a, "goog.async.run");
        ke.add(a, b)
    }, le = function() {
        if (p.Promise && p.Promise.resolve) {
            var a = p.Promise.resolve(void 0);
            ie = function() {
                a.then(ne)
            }
        } else
            ie = function() {
                var b = ne;
                "function" !== typeof p.setImmediate || p.Window && p.Window.prototype && (Yb() || !y("Edge")) && p.Window.prototype.setImmediate == p.setImmediate ? ($d || ($d = ae()),
                $d(b)) : p.setImmediate(b)
            }
    }, ne = function() {
        for (var a; a = ke.remove(); ) {
            try {
                a.xf.call(a.scope)
            } catch (b) {
                be(b)
            }
            de.put(a)
        }
        je = !1
    };
    var oe = function(a) {
        if (!a)
            return !1;
        try {
            return !!a.$goog_Thenable
        } catch (b) {
            return !1
        }
    };
    var F = function(a, b) {
        this.W = 0;
        this.na = void 0;
        this.ec = this.bb = this.P = null;
        this.ce = this.vf = !1;
        if (a != Va)
            try {
                var c = this;
                a.call(b, function(d) {
                    pe(c, 2, d)
                }, function(d) {
                    if (!(d instanceof qe))
                        try {
                            if (d instanceof Error)
                                throw d;
                            throw Error("Promise rejected.");
                        } catch (e) {}
                    pe(c, 3, d)
                })
            } catch (d) {
                pe(this, 3, d)
            }
    }
      , re = function() {
        this.next = this.context = this.zc = this.Sb = this.child = null;
        this.Pc = !1
    };
    re.prototype.reset = function() {
        this.context = this.zc = this.Sb = this.child = null;
        this.Pc = !1
    }
    ;
    var se = new Zd(function() {
        return new re
    }
    ,function(a) {
        a.reset()
    }
    )
      , te = function(a, b, c) {
        var d = se.get();
        d.Sb = a;
        d.zc = b;
        d.context = c;
        return d
    }
      , G = function(a) {
        if (a instanceof F)
            return a;
        var b = new F(Va);
        pe(b, 2, a);
        return b
    }
      , H = function(a) {
        return new F(function(b, c) {
            c(a)
        }
        )
    }
      , ve = function(a, b, c) {
        ue(a, b, c, null) || me(ya(b, a))
    }
      , we = function(a) {
        return new F(function(b, c) {
            var d = a.length
              , e = [];
            if (d)
                for (var f = function(n, q) {
                    d--;
                    e[n] = q;
                    0 == d && b(e)
                }, g = function(n) {
                    c(n)
                }, h = 0, l; h < a.length; h++)
                    l = a[h],
                    ve(l, ya(f, h), g);
            else
                b(e)
        }
        )
    }
      , xe = function(a) {
        return new F(function(b) {
            var c = a.length
              , d = [];
            if (c)
                for (var e = function(h, l, n) {
                    c--;
                    d[h] = l ? {
                        kh: !0,
                        value: n
                    } : {
                        kh: !1,
                        reason: n
                    };
                    0 == c && b(d)
                }, f = 0, g; f < a.length; f++)
                    g = a[f],
                    ve(g, ya(e, f, !0), ya(e, f, !1));
            else
                b(d)
        }
        )
    };
    F.prototype.then = function(a, b, c) {
        null != a && Ia(a, "opt_onFulfilled should be a function.");
        null != b && Ia(b, "opt_onRejected should be a function. Did you pass opt_context as the second argument instead of the third?");
        return ye(this, "function" === typeof a ? a : null, "function" === typeof b ? b : null, c)
    }
    ;
    F.prototype.$goog_Thenable = !0;
    F.prototype.Wb = function(a, b) {
        a = te(a, a, b);
        a.Pc = !0;
        ze(this, a);
        return this
    }
    ;
    F.prototype.h = function(a, b) {
        return ye(this, null, a, b)
    }
    ;
    F.prototype.catch = F.prototype.h;
    F.prototype.cancel = function(a) {
        if (0 == this.W) {
            var b = new qe(a);
            me(function() {
                Ae(this, b)
            }, this)
        }
    }
    ;
    var Ae = function(a, b) {
        if (0 == a.W)
            if (a.P) {
                var c = a.P;
                if (c.bb) {
                    for (var d = 0, e = null, f = null, g = c.bb; g && (g.Pc || (d++,
                    g.child == a && (e = g),
                    !(e && 1 < d))); g = g.next)
                        e || (f = g);
                    e && (0 == c.W && 1 == d ? Ae(c, b) : (f ? (d = f,
                    v(c.bb),
                    v(null != d),
                    d.next == c.ec && (c.ec = d),
                    d.next = d.next.next) : Be(c),
                    Ce(c, e, 3, b)))
                }
                a.P = null
            } else
                pe(a, 3, b)
    }
      , ze = function(a, b) {
        a.bb || 2 != a.W && 3 != a.W || De(a);
        v(null != b.Sb);
        a.ec ? a.ec.next = b : a.bb = b;
        a.ec = b
    }
      , ye = function(a, b, c, d) {
        b && (b = he(b, "goog.Promise.then"));
        c && (c = he(c, "goog.Promise.then"));
        var e = te(null, null, null);
        e.child = new F(function(f, g) {
            e.Sb = b ? function(h) {
                try {
                    var l = b.call(d, h);
                    f(l)
                } catch (n) {
                    g(n)
                }
            }
            : f;
            e.zc = c ? function(h) {
                try {
                    var l = c.call(d, h);
                    void 0 === l && h instanceof qe ? g(h) : f(l)
                } catch (n) {
                    g(n)
                }
            }
            : g
        }
        );
        e.child.P = a;
        ze(a, e);
        return e.child
    };
    F.prototype.sk = function(a) {
        v(1 == this.W);
        this.W = 0;
        pe(this, 2, a)
    }
    ;
    F.prototype.tk = function(a) {
        v(1 == this.W);
        this.W = 0;
        pe(this, 3, a)
    }
    ;
    var pe = function(a, b, c) {
        0 == a.W && (a === c && (b = 3,
        c = new TypeError("Promise cannot resolve to itself")),
        a.W = 1,
        ue(c, a.sk, a.tk, a) || (a.na = c,
        a.W = b,
        a.P = null,
        De(a),
        3 != b || c instanceof qe || Ee(a, c)))
    }
      , ue = function(a, b, c, d) {
        if (a instanceof F)
            return null != b && Ia(b, "opt_onFulfilled should be a function."),
            null != c && Ia(c, "opt_onRejected should be a function. Did you pass opt_context as the second argument instead of the third?"),
            ze(a, te(b || Va, c || null, d)),
            !0;
        if (oe(a))
            return a.then(b, c, d),
            !0;
        if (r(a))
            try {
                var e = a.then;
                if ("function" === typeof e)
                    return Fe(a, e, b, c, d),
                    !0
            } catch (f) {
                return c.call(d, f),
                !0
            }
        return !1
    }
      , Fe = function(a, b, c, d, e) {
        var f = !1
          , g = function(l) {
            f || (f = !0,
            c.call(e, l))
        }
          , h = function(l) {
            f || (f = !0,
            d.call(e, l))
        };
        try {
            b.call(a, g, h)
        } catch (l) {
            h(l)
        }
    }
      , De = function(a) {
        a.vf || (a.vf = !0,
        me(a.Ti, a))
    }
      , Be = function(a) {
        var b = null;
        a.bb && (b = a.bb,
        a.bb = b.next,
        b.next = null);
        a.bb || (a.ec = null);
        null != b && v(null != b.Sb);
        return b
    };
    F.prototype.Ti = function() {
        for (var a; a = Be(this); )
            Ce(this, a, this.W, this.na);
        this.vf = !1
    }
    ;
    var Ce = function(a, b, c, d) {
        if (3 == c && b.zc && !b.Pc)
            for (; a && a.ce; a = a.P)
                a.ce = !1;
        if (b.child)
            b.child.P = null,
            Ge(b, c, d);
        else
            try {
                b.Pc ? b.Sb.call(b.context) : Ge(b, c, d)
            } catch (e) {
                He.call(null, e)
            }
        se.put(b)
    }
      , Ge = function(a, b, c) {
        2 == b ? a.Sb.call(a.context, c) : a.zc && a.zc.call(a.context, c)
    }
      , Ee = function(a, b) {
        a.ce = !0;
        me(function() {
            a.ce && He.call(null, b)
        })
    }
      , He = be
      , qe = function(a) {
        Aa.call(this, a)
    };
    u(qe, Aa);
    qe.prototype.name = "cancel";
    var Ie = function(a, b, c) {
        if ("function" === typeof a)
            c && (a = t(a, c));
        else if (a && "function" == typeof a.handleEvent)
            a = t(a.handleEvent, a);
        else
            throw Error("Invalid listener argument");
        return 2147483647 < Number(b) ? -1 : p.setTimeout(a, b || 0)
    }
      , Je = function(a) {
        var b = null;
        return (new F(function(c, d) {
            b = Ie(function() {
                c(void 0)
            }, a);
            -1 == b && d(Error("Failed to schedule timer."))
        }
        )).h(function(c) {
            p.clearTimeout(b);
            throw c;
        })
    };
    var Ke = function(a) {
        E.call(this);
        this.Id = null;
        this.u = a;
        a = z || Cc;
        this.eh = new Wd(this);
        this.eh.listen(this.u, a ? ["keydown", "paste", "cut", "drop", "input"] : "input", this)
    };
    u(Ke, E);
    Ke.prototype.handleEvent = function(a) {
        if ("input" == a.type)
            z && 0 == a.keyCode && 0 == a.charCode || (Le(this),
            this.dispatchEvent(Me(a)));
        else if ("keydown" != a.type || Nd(a)) {
            var b = "keydown" == a.type ? this.u.value : null;
            z && 229 == a.keyCode && (b = null);
            var c = Me(a);
            Le(this);
            this.Id = Ie(function() {
                this.Id = null;
                this.u.value != b && this.dispatchEvent(c)
            }, 0, this)
        }
    }
    ;
    var Le = function(a) {
        null != a.Id && (p.clearTimeout(a.Id),
        a.Id = null)
    }
      , Me = function(a) {
        a = new B(a.Y);
        a.type = "input";
        return a
    };
    Ke.prototype.F = function() {
        Ke.X.F.call(this);
        this.eh.Va();
        Le(this);
        delete this.u
    }
    ;
    var Ne = function(a, b, c, d) {
        B.call(this, d);
        this.type = "key";
        this.keyCode = a;
        this.charCode = b;
        this.repeat = c
    };
    u(Ne, B);
    var Oe = function(a, b) {
        E.call(this);
        a && (this.re && this.detach(),
        this.u = a,
        this.qe = C(this.u, "keypress", this, b),
        this.Mf = C(this.u, "keydown", this.de, b, this),
        this.re = C(this.u, "keyup", this.gj, b, this))
    };
    u(Oe, E);
    k = Oe.prototype;
    k.u = null;
    k.qe = null;
    k.Mf = null;
    k.re = null;
    k.va = -1;
    k.eb = -1;
    k.bf = !1;
    var Pe = {
        3: 13,
        12: 144,
        63232: 38,
        63233: 40,
        63234: 37,
        63235: 39,
        63236: 112,
        63237: 113,
        63238: 114,
        63239: 115,
        63240: 116,
        63241: 117,
        63242: 118,
        63243: 119,
        63244: 120,
        63245: 121,
        63246: 122,
        63247: 123,
        63248: 44,
        63272: 46,
        63273: 36,
        63275: 35,
        63276: 33,
        63277: 34,
        63289: 144,
        63302: 45
    }
      , Qe = {
        Up: 38,
        Down: 40,
        Left: 37,
        Right: 39,
        Enter: 13,
        F1: 112,
        F2: 113,
        F3: 114,
        F4: 115,
        F5: 116,
        F6: 117,
        F7: 118,
        F8: 119,
        F9: 120,
        F10: 121,
        F11: 122,
        F12: 123,
        "U+007F": 46,
        Home: 36,
        End: 35,
        PageUp: 33,
        PageDown: 34,
        Insert: 45
    }
      , Re = Gc && Ec;
    k = Oe.prototype;
    k.de = function(a) {
        if (Fc || Cc)
            if (17 == this.va && !a.ctrlKey || 18 == this.va && !a.altKey || Gc && 91 == this.va && !a.metaKey)
                this.eb = this.va = -1;
        -1 == this.va && (a.ctrlKey && 17 != a.keyCode ? this.va = 17 : a.altKey && 18 != a.keyCode ? this.va = 18 : a.metaKey && 91 != a.keyCode && (this.va = 91));
        Pd(a.keyCode, this.va, a.shiftKey, a.ctrlKey, a.altKey, a.metaKey) ? (this.eb = Od(a.keyCode),
        Re && (this.bf = a.altKey)) : this.handleEvent(a)
    }
    ;
    k.gj = function(a) {
        this.eb = this.va = -1;
        this.bf = a.altKey
    }
    ;
    k.handleEvent = function(a) {
        var b = a.Y
          , c = b.altKey;
        if (z && "keypress" == a.type) {
            var d = this.eb;
            var e = 13 != d && 27 != d ? b.keyCode : 0
        } else
            (Fc || Cc) && "keypress" == a.type ? (d = this.eb,
            e = 0 <= b.charCode && 63232 > b.charCode && Md(d) ? b.charCode : 0) : ("keypress" == a.type ? (Re && (c = this.bf),
            b.keyCode == b.charCode ? 32 > b.keyCode ? (d = b.keyCode,
            e = 0) : (d = this.eb,
            e = b.charCode) : (d = b.keyCode || this.eb,
            e = b.charCode || 0)) : (d = b.keyCode || this.eb,
            e = b.charCode || 0),
            Gc && 63 == e && 224 == d && (d = 191));
        var f = d = Od(d);
        d ? 63232 <= d && d in Pe ? f = Pe[d] : 25 == d && a.shiftKey && (f = 9) : b.keyIdentifier && b.keyIdentifier in Qe && (f = Qe[b.keyIdentifier]);
        if (!Ec || "keypress" != a.type || Pd(f, this.va, a.shiftKey, a.ctrlKey, c, a.metaKey))
            a = f == this.va,
            this.va = f,
            b = new Ne(f,e,a,b),
            b.altKey = c,
            this.dispatchEvent(b)
    }
    ;
    k.Ha = function() {
        return this.u
    }
    ;
    k.detach = function() {
        this.qe && (Id(this.qe),
        Id(this.Mf),
        Id(this.re),
        this.re = this.Mf = this.qe = null);
        this.u = null;
        this.eb = this.va = -1
    }
    ;
    k.F = function() {
        Oe.X.F.call(this);
        this.detach()
    }
    ;
    var Te = function(a) {
        var b = Sc(void 0)
          , c = b.qa;
        if (z && c.createStyleSheet)
            b = c.createStyleSheet(),
            Se(b, a);
        else {
            c = Uc(b.qa, "HEAD")[0];
            if (!c) {
                var d = Uc(b.qa, "BODY")[0];
                c = b.Sc("HEAD");
                d.parentNode.insertBefore(c, d)
            }
            d = b.Sc("STYLE");
            var e;
            (e = ic('style[nonce],link[rel="stylesheet"][nonce]')) && d.setAttribute("nonce", e);
            Se(d, a);
            b.appendChild(c, d)
        }
    }
      , Se = function(a, b) {
        b instanceof Lb && b.constructor === Lb ? b = b.fg : (Fa("expected object of type SafeStyleSheet, got '" + b + "' of type " + ua(b)),
        b = "type_error:SafeStyleSheet");
        z && void 0 !== a.cssText ? a.cssText = b : p.trustedTypes ? ed(a, b) : a.innerHTML = b
    };
    var Ue = function() {};
    Ue.Kf = void 0;
    Ue.bj = function() {
        return Ue.Kf ? Ue.Kf : Ue.Kf = new Ue
    }
    ;
    Ue.prototype.Kj = 0;
    Ue.prototype.tj = "";
    var We = function(a) {
        E.call(this);
        this.Vd = a || Sc();
        this.ua = null;
        this.Mb = !1;
        this.u = null;
        this.qb = void 0;
        this.Td = this.fc = this.P = null;
        this.yk = !1
    };
    u(We, E);
    k = We.prototype;
    k.sj = Ue.bj();
    k.getId = function() {
        var a;
        (a = this.ua) || (a = this.sj,
        a = this.ua = a.tj + ":" + (a.Kj++).toString(36));
        return a
    }
    ;
    k.Ha = function() {
        return this.u
    }
    ;
    k.sa = function(a) {
        return this.u ? this.Vd.sa(a, this.u) : null
    }
    ;
    k.qc = function() {
        this.qb || (this.qb = new Wd(this));
        return v(this.qb)
    }
    ;
    k.getParent = function() {
        return this.P
    }
    ;
    k.vg = function(a) {
        if (this.P && this.P != a)
            throw Error("Method not supported");
        We.X.vg.call(this, a)
    }
    ;
    k.bd = function() {
        return this.Vd
    }
    ;
    k.Sc = function() {
        this.u = this.Vd.createElement("DIV")
    }
    ;
    k.render = function(a) {
        if (this.Mb)
            throw Error("Component already rendered");
        this.u || this.Sc();
        a ? a.insertBefore(this.u, null) : this.Vd.qa.body.appendChild(this.u);
        this.P && !this.P.Mb || this.Fa()
    }
    ;
    k.Fa = function() {
        this.Mb = !0;
        Xe(this, function(a) {
            !a.Mb && a.Ha() && a.Fa()
        })
    }
    ;
    k.Yc = function() {
        Xe(this, function(a) {
            a.Mb && a.Yc()
        });
        this.qb && this.qb.Ce();
        this.Mb = !1
    }
    ;
    k.F = function() {
        this.Mb && this.Yc();
        this.qb && (this.qb.Va(),
        delete this.qb);
        Xe(this, function(a) {
            a.Va()
        });
        !this.yk && this.u && dd(this.u);
        this.P = this.u = this.Td = this.fc = null;
        We.X.F.call(this)
    }
    ;
    k.hasChildren = function() {
        return !!this.fc && 0 != this.fc.length
    }
    ;
    var Xe = function(a, b) {
        a.fc && a.fc.forEach(b, void 0)
    };
    We.prototype.removeChild = function(a, b) {
        if (a) {
            var c = "string" === typeof a ? a : a.getId();
            this.Td && c ? (a = this.Td,
            a = (null !== a && c in a ? a[c] : void 0) || null) : a = null;
            if (c && a) {
                var d = this.Td;
                c in d && delete d[c];
                Qa(this.fc, a);
                b && (a.Yc(),
                a.u && dd(a.u));
                b = a;
                if (null == b)
                    throw Error("Unable to set parent component");
                b.P = null;
                We.X.vg.call(b, null)
            }
        }
        if (!a)
            throw Error("Child is not in parent component");
        return a
    }
    ;
    var Ye = function(a, b) {
        var c = gd(a);
        b ? (zc(a, "firebaseui-input-invalid"),
        yc(a, "firebaseui-input"),
        c && zc(c, "firebaseui-textfield-invalid")) : (zc(a, "firebaseui-input"),
        yc(a, "firebaseui-input-invalid"),
        c && yc(c, "firebaseui-textfield-invalid"))
    }
      , Ze = function(a, b, c) {
        b = new Ke(b);
        ld(a, ya(jd, b));
        a.qc().listen(b, "input", c)
    }
      , $e = function(a, b, c) {
        b = new Oe(b);
        ld(a, ya(jd, b));
        a.qc().listen(b, "key", function(d) {
            13 == d.keyCode && (d.stopPropagation(),
            d.preventDefault(),
            c(d))
        })
    }
      , af = function(a, b, c) {
        b = new Vd(b);
        ld(a, ya(jd, b));
        a.qc().listen(b, "focusin", c)
    }
      , bf = function(a, b, c) {
        b = new Vd(b);
        ld(a, ya(jd, b));
        a.qc().listen(b, "focusout", c)
    }
      , cf = function(a, b, c) {
        b = new Rd(b);
        ld(a, ya(jd, b));
        a.qc().listen(b, "action", function(d) {
            d.stopPropagation();
            d.preventDefault();
            c(d)
        })
    }
      , df = function(a, b) {
        b && ed(a, b);
        zc(a, "firebaseui-hidden")
    };
    var ef = RegExp("^(ar|ckb|dv|he|iw|fa|nqo|ps|sd|ug|ur|yi|.*[-_](Adlm|Arab|Hebr|Nkoo|Rohg|Thaa))(?!.*[-_](Latn|Cyrl)($|-|_))($|-|_)", "i");
    var ff = function(a) {
        if (a.pb && "function" == typeof a.pb)
            return a.pb();
        if ("undefined" !== typeof Map && a instanceof Map || "undefined" !== typeof Set && a instanceof Set)
            return Array.from(a.values());
        if ("string" === typeof a)
            return a.split("");
        if (va(a)) {
            for (var b = [], c = a.length, d = 0; d < c; d++)
                b.push(a[d]);
            return b
        }
        b = [];
        c = 0;
        for (d in a)
            b[c++] = a[d];
        return b
    }
      , gf = function(a) {
        if (a.be && "function" == typeof a.be)
            return a.be();
        if (!a.pb || "function" != typeof a.pb) {
            if ("undefined" !== typeof Map && a instanceof Map)
                return Array.from(a.keys());
            if (!("undefined" !== typeof Set && a instanceof Set)) {
                if (va(a) || "string" === typeof a) {
                    var b = [];
                    a = a.length;
                    for (var c = 0; c < a; c++)
                        b.push(c);
                    return b
                }
                b = [];
                c = 0;
                for (var d in a)
                    b[c++] = d;
                return b
            }
        }
    }
      , hf = function(a, b, c) {
        if (a.forEach && "function" == typeof a.forEach)
            a.forEach(b, c);
        else if (va(a) || "string" === typeof a)
            Array.prototype.forEach.call(a, b, c);
        else
            for (var d = gf(a), e = ff(a), f = e.length, g = 0; g < f; g++)
                b.call(c, e[g], d && d[g], a)
    };
    var jf = RegExp("^(?:([^:/?#.]+):)?(?://(?:([^\\\\/?#]*)@)?([^\\\\/?#]*?)(?::([0-9]+))?(?=[\\\\/?#]|$))?([^?#]+)?(?:\\?([^#]*))?(?:#([\\s\\S]*))?$")
      , kf = function(a, b) {
        if (a) {
            a = a.split("&");
            for (var c = 0; c < a.length; c++) {
                var d = a[c].indexOf("=")
                  , e = null;
                if (0 <= d) {
                    var f = a[c].substring(0, d);
                    e = a[c].substring(d + 1)
                } else
                    f = a[c];
                b(f, e ? decodeURIComponent(e.replace(/\+/g, " ")) : "")
            }
        }
    }
      , lf = function(a) {
        var b = a.indexOf("#");
        0 > b && (b = a.length);
        var c = a.indexOf("?");
        if (0 > c || c > b) {
            c = b;
            var d = ""
        } else
            d = a.substring(c + 1, b);
        return [a.slice(0, c), d, a.slice(b)]
    }
      , mf = function(a, b) {
        return b ? a ? a + "&" + b : b : a
    }
      , nf = function(a, b, c) {
        Ha(a);
        if (Array.isArray(b)) {
            Ja(b);
            for (var d = 0; d < b.length; d++)
                nf(a, String(b[d]), c)
        } else
            null != b && c.push(a + ("" === b ? "" : "=" + encodeURIComponent(String(b))))
    }
      , of = function(a) {
        var b = [], c;
        for (c in a)
            nf(c, a[c], b);
        return b.join("&")
    }
      , pf = /#|$/
      , qf = function(a, b) {
        a = lf(a);
        var c = a[1]
          , d = [];
        c && c.split("&").forEach(function(e) {
            var f = e.indexOf("=");
            b.hasOwnProperty(0 <= f ? e.slice(0, f) : e) || d.push(e)
        });
        a[1] = mf(d.join("&"), of(b));
        return a[0] + (a[1] ? "?" + a[1] : "") + a[2]
    };
    var rf = function(a) {
        this.ba = this.Zb = this.ha = "";
        this.Xa = null;
        this.Hb = this.gb = "";
        this.Ia = this.Bj = !1;
        if (a instanceof rf) {
            this.Ia = a.Ia;
            sf(this, a.ha);
            var b = a.Zb;
            tf(this);
            this.Zb = b;
            uf(this, a.ba);
            vf(this, a.Xa);
            wf(this, a.gb);
            xf(this, a.Ca.clone());
            a = a.Hb;
            tf(this);
            this.Hb = a
        } else
            a && (b = String(a).match(jf)) ? (this.Ia = !1,
            sf(this, b[1] || "", !0),
            a = b[2] || "",
            tf(this),
            this.Zb = yf(a),
            uf(this, b[3] || "", !0),
            vf(this, b[4]),
            wf(this, b[5] || "", !0),
            xf(this, b[6] || "", !0),
            a = b[7] || "",
            tf(this),
            this.Hb = yf(a)) : (this.Ia = !1,
            this.Ca = new zf(null,this.Ia))
    };
    rf.prototype.toString = function() {
        var a = []
          , b = this.ha;
        b && a.push(Af(b, Bf, !0), ":");
        var c = this.ba;
        if (c || "file" == b)
            a.push("//"),
            (b = this.Zb) && a.push(Af(b, Bf, !0), "@"),
            a.push(encodeURIComponent(String(c)).replace(/%25([0-9a-fA-F]{2})/g, "%$1")),
            c = this.Xa,
            null != c && a.push(":", String(c));
        if (c = this.gb)
            this.ba && "/" != c.charAt(0) && a.push("/"),
            a.push(Af(c, "/" == c.charAt(0) ? Cf : Df, !0));
        (c = this.Ca.toString()) && a.push("?", c);
        (c = this.Hb) && a.push("#", Af(c, Ef));
        return a.join("")
    }
    ;
    rf.prototype.resolve = function(a) {
        var b = this.clone()
          , c = !!a.ha;
        c ? sf(b, a.ha) : c = !!a.Zb;
        if (c) {
            var d = a.Zb;
            tf(b);
            b.Zb = d
        } else
            c = !!a.ba;
        c ? uf(b, a.ba) : c = null != a.Xa;
        d = a.gb;
        if (c)
            vf(b, a.Xa);
        else if (c = !!a.gb) {
            if ("/" != d.charAt(0))
                if (this.ba && !this.gb)
                    d = "/" + d;
                else {
                    var e = b.gb.lastIndexOf("/");
                    -1 != e && (d = b.gb.slice(0, e + 1) + d)
                }
            e = d;
            if (".." == e || "." == e)
                d = "";
            else if (x(e, "./") || x(e, "/.")) {
                d = 0 == e.lastIndexOf("/", 0);
                e = e.split("/");
                for (var f = [], g = 0; g < e.length; ) {
                    var h = e[g++];
                    "." == h ? d && g == e.length && f.push("") : ".." == h ? ((1 < f.length || 1 == f.length && "" != f[0]) && f.pop(),
                    d && g == e.length && f.push("")) : (f.push(h),
                    d = !0)
                }
                d = f.join("/")
            } else
                d = e
        }
        c ? wf(b, d) : c = "" !== a.Ca.toString();
        c ? xf(b, a.Ca.clone()) : c = !!a.Hb;
        c && (a = a.Hb,
        tf(b),
        b.Hb = a);
        return b
    }
    ;
    rf.prototype.clone = function() {
        return new rf(this)
    }
    ;
    var sf = function(a, b, c) {
        tf(a);
        a.ha = c ? yf(b, !0) : b;
        a.ha && (a.ha = a.ha.replace(/:$/, ""))
    }
      , uf = function(a, b, c) {
        tf(a);
        a.ba = c ? yf(b, !0) : b
    }
      , vf = function(a, b) {
        tf(a);
        if (b) {
            b = Number(b);
            if (isNaN(b) || 0 > b)
                throw Error("Bad port number " + b);
            a.Xa = b
        } else
            a.Xa = null
    }
      , wf = function(a, b, c) {
        tf(a);
        a.gb = c ? yf(b, !0) : b
    }
      , xf = function(a, b, c) {
        tf(a);
        b instanceof zf ? (a.Ca = b,
        a.Ca.ug(a.Ia)) : (c || (b = Af(b, Ff)),
        a.Ca = new zf(b,a.Ia))
    };
    rf.prototype.getQuery = function() {
        return this.Ca.toString()
    }
    ;
    var I = function(a, b, c) {
        tf(a);
        a.Ca.set(b, c)
    }
      , Gf = function(a, b) {
        return a.Ca.get(b)
    };
    rf.prototype.removeParameter = function(a) {
        tf(this);
        this.Ca.remove(a);
        return this
    }
    ;
    var tf = function(a) {
        if (a.Bj)
            throw Error("Tried to modify a read-only Uri");
    };
    rf.prototype.ug = function(a) {
        this.Ia = a;
        this.Ca && this.Ca.ug(a)
    }
    ;
    var Hf = function(a) {
        return a instanceof rf ? a.clone() : new rf(a)
    }
      , If = function(a, b, c, d) {
        var e = new rf(null);
        a && sf(e, a);
        b && uf(e, b);
        c && vf(e, c);
        d && wf(e, d);
        return e
    }
      , yf = function(a, b) {
        return a ? b ? decodeURI(a.replace(/%25/g, "%2525")) : decodeURIComponent(a) : ""
    }
      , Af = function(a, b, c) {
        return "string" === typeof a ? (a = encodeURI(a).replace(b, Jf),
        c && (a = a.replace(/%25([0-9a-fA-F]{2})/g, "%$1")),
        a) : null
    }
      , Jf = function(a) {
        a = a.charCodeAt(0);
        return "%" + (a >> 4 & 15).toString(16) + (a & 15).toString(16)
    }
      , Bf = /[#\/\?@]/g
      , Df = /[#\?:]/g
      , Cf = /[#\?]/g
      , Ff = /[#\?@]/g
      , Ef = /#/g
      , zf = function(a, b) {
        this.ia = this.M = null;
        this.ya = a || null;
        this.Ia = !!b
    }
      , Kf = function(a) {
        a.M || (a.M = new Map,
        a.ia = 0,
        a.ya && kf(a.ya, function(b, c) {
            a.add(decodeURIComponent(b.replace(/\+/g, " ")), c)
        }))
    }
      , Mf = function(a) {
        var b = gf(a);
        if ("undefined" == typeof b)
            throw Error("Keys are undefined");
        var c = new zf(null);
        a = ff(a);
        for (var d = 0; d < b.length; d++) {
            var e = b[d]
              , f = a[d];
            Array.isArray(f) ? Lf(c, e, f) : c.add(e, f)
        }
        return c
    };
    k = zf.prototype;
    k.add = function(a, b) {
        Kf(this);
        this.ya = null;
        a = this.za(a);
        var c = this.M.get(a);
        c || this.M.set(a, c = []);
        c.push(b);
        this.ia = Ga(this.ia) + 1;
        return this
    }
    ;
    k.remove = function(a) {
        Kf(this);
        a = this.za(a);
        return this.M.has(a) ? (this.ya = null,
        this.ia = Ga(this.ia) - this.M.get(a).length,
        this.M.delete(a)) : !1
    }
    ;
    k.clear = function() {
        this.M = this.ya = null;
        this.ia = 0
    }
    ;
    k.Dh = function() {
        Kf(this);
        return 0 == this.ia
    }
    ;
    k.Rc = function(a) {
        Kf(this);
        a = this.za(a);
        return this.M.has(a)
    }
    ;
    k.forEach = function(a, b) {
        Kf(this);
        this.M.forEach(function(c, d) {
            c.forEach(function(e) {
                a.call(b, e, d, this)
            }, this)
        }, this)
    }
    ;
    k.be = function() {
        Kf(this);
        for (var a = Array.from(this.M.values()), b = Array.from(this.M.keys()), c = [], d = 0; d < b.length; d++)
            for (var e = a[d], f = 0; f < e.length; f++)
                c.push(b[d]);
        return c
    }
    ;
    k.pb = function(a) {
        Kf(this);
        var b = [];
        if ("string" === typeof a)
            this.Rc(a) && (b = b.concat(this.M.get(this.za(a))));
        else {
            a = Array.from(this.M.values());
            for (var c = 0; c < a.length; c++)
                b = b.concat(a[c])
        }
        return b
    }
    ;
    k.set = function(a, b) {
        Kf(this);
        this.ya = null;
        a = this.za(a);
        this.Rc(a) && (this.ia = Ga(this.ia) - this.M.get(a).length);
        this.M.set(a, [b]);
        this.ia = Ga(this.ia) + 1;
        return this
    }
    ;
    k.get = function(a, b) {
        if (!a)
            return b;
        a = this.pb(a);
        return 0 < a.length ? String(a[0]) : b
    }
    ;
    var Lf = function(a, b, c) {
        a.remove(b);
        0 < c.length && (a.ya = null,
        a.M.set(a.za(b), Ta(c)),
        a.ia = Ga(a.ia) + c.length)
    };
    k = zf.prototype;
    k.toString = function() {
        if (this.ya)
            return this.ya;
        if (!this.M)
            return "";
        for (var a = [], b = Array.from(this.M.keys()), c = 0; c < b.length; c++) {
            var d = b[c]
              , e = encodeURIComponent(String(d));
            d = this.pb(d);
            for (var f = 0; f < d.length; f++) {
                var g = e;
                "" !== d[f] && (g += "=" + encodeURIComponent(String(d[f])));
                a.push(g)
            }
        }
        return this.ya = a.join("&")
    }
    ;
    k.clone = function() {
        var a = new zf;
        a.ya = this.ya;
        this.M && (a.M = new Map(this.M),
        a.ia = this.ia);
        return a
    }
    ;
    k.za = function(a) {
        a = String(a);
        this.Ia && (a = a.toLowerCase());
        return a
    }
    ;
    k.ug = function(a) {
        a && !this.Ia && (Kf(this),
        this.ya = null,
        this.M.forEach(function(b, c) {
            var d = c.toLowerCase();
            c != d && (this.remove(c),
            Lf(this, d, b))
        }, this));
        this.Ia = a
    }
    ;
    k.extend = function(a) {
        for (var b = 0; b < arguments.length; b++)
            hf(arguments[b], function(c, d) {
                this.add(d, c)
            }, this)
    }
    ;
    var Nf = function(a, b) {
        this.name = a;
        this.value = b
    };
    Nf.prototype.toString = function() {
        return this.name
    }
    ;
    var Of = new Nf("OFF",Infinity), Pf = new Nf("SEVERE",1E3), Qf = new Nf("WARNING",900), Rf = new Nf("CONFIG",700), Sf = new Nf("FINE",500), Tf = function() {
        this.Rd = 0;
        this.clear()
    }, Uf;
    Tf.prototype.clear = function() {
        this.Ng = Array(this.Rd);
        this.Xg = -1;
        this.Eh = !1
    }
    ;
    var Vf = function(a, b, c) {
        this.reset(a || Of, b, c, void 0, void 0)
    };
    Vf.prototype.reset = function() {}
    ;
    var Wf = function(a, b) {
        this.level = null;
        this.qj = [];
        this.parent = (void 0 === b ? null : b) || null;
        this.children = [];
        this.Qf = {
            getName: function() {
                return a
            }
        }
    }, Xf = function(a) {
        if (a.level)
            return a.level;
        if (a.parent)
            return Xf(a.parent);
        Fa("Root logger has no level set.");
        return Of
    }, Yf = function(a, b) {
        for (; a; )
            a.qj.forEach(function(c) {
                c(b)
            }),
            a = a.parent
    }, Zf = function() {
        this.entries = {};
        var a = new Wf("");
        a.level = Rf;
        this.entries[""] = a
    }, $f, ag = function(a, b) {
        var c = a.entries[b];
        if (c)
            return c;
        c = ag(a, b.slice(0, Math.max(b.lastIndexOf("."), 0)));
        var d = new Wf(b,c);
        a.entries[b] = d;
        c.children.push(d);
        return d
    }, bg = function() {
        $f || ($f = new Zf);
        return $f
    }, cg = function(a, b, c) {
        var d;
        if (d = a)
            if (d = a && b) {
                d = b.value;
                var e = a ? Xf(ag(bg(), a.getName())) : Of;
                d = d >= e.value
            }
        if (d) {
            b = b || Of;
            d = ag(bg(), a.getName());
            "function" === typeof c && (c = c());
            Uf || (Uf = new Tf);
            e = Uf;
            a = a.getName();
            if (0 < e.Rd) {
                var f = (e.Xg + 1) % e.Rd;
                e.Xg = f;
                e.Eh ? (e = e.Ng[f],
                e.reset(b, c, a),
                a = e) : (e.Eh = f == e.Rd - 1,
                a = e.Ng[f] = new Vf(b,c,a))
            } else
                a = new Vf(b,c,a);
            Yf(d, a)
        }
    }, dg = function(a, b) {
        a && cg(a, Pf, b)
    }, eg = function(a, b) {
        a && cg(a, Sf, b)
    };
    /*

 SPDX-License-Identifier: Apache-2.0
*/
    var fg;
    try {
        new URL("s://g"),
        fg = !0
    } catch (a) {
        fg = !1
    }
    var gg = fg
      , hg = []
      , ig = function() {};
    jg(function(a) {
        var b = ag(bg(), "safevalues").Qf;
        b && cg(b, Qf, "A URL with content '" + a + "' was sanitized away.")
    });
    function jg(a) {
        -1 === hg.indexOf(a) && hg.push(a);
        ig = function(b) {
            hg.forEach(function(c) {
                c(b)
            })
        }
    }
    ;var kg = function(a) {
        this.Cj = a
    };
    function lg(a) {
        return new kg(function(b) {
            return b.substr(0, a.length + 1).toLowerCase() === a + ":"
        }
        )
    }
    var mg = [lg("data"), lg("http"), lg("https"), lg("mailto"), lg("ftp"), new kg(function(a) {
        return /^[^:]*([/?#]|$)/.test(a)
    }
    )];
    var ng = {
        fl: !0
    }
      , og = function() {
        throw Error("Do not instantiate directly");
    };
    og.prototype.mf = null;
    og.prototype.toString = function() {
        return this.content
    }
    ;
    og.prototype.ri = function() {
        if (this.Ug !== ng)
            throw Error("Sanitized content was not of kind HTML.");
        return gc(jb("Soy SanitizedContent of kind HTML produces SafeHtml-contract-compliant value."), this.toString())
    }
    ;
    var pg = function() {
        og.call(this)
    };
    u(pg, og);
    pg.prototype.Ug = ng;
    var qg = function(a) {
        var b = null != a && a.Ug === ng;
        b && v(a.constructor === pg);
        return b
    };
    var rg = function(a) {
        if (null != a)
            switch (a.mf) {
            case 1:
                return 1;
            case -1:
                return -1;
            case 0:
                return 0
            }
        return null
    }
      , ug = function(a) {
        return qg(a) ? a : a instanceof bc ? J(cc(a).toString()) : a instanceof bc ? J(cc(a).toString()) : J(String(String(a)).replace(sg, tg), rg(a))
    }
      , J = function(a) {
        function b(c) {
            this.content = c
        }
        b.prototype = a.prototype;
        return function(c, d) {
            c = new b(String(c));
            void 0 !== d && (c.mf = d);
            return c
        }
    }(pg)
      , K = {}
      , vg = function(a) {
        return a instanceof og ? !!a.content : !!a
    }
      , wg = function(a) {
        function b(c) {
            this.content = c
        }
        b.prototype = a.prototype;
        return function(c, d) {
            c = String(c);
            if (!c)
                return "";
            c = new b(c);
            void 0 !== d && (c.mf = d);
            return c
        }
    }(pg)
      , L = function(a, b, c, d) {
        a || (a = c instanceof Function ? c.displayName || c.name || "unknown type name" : c instanceof Object ? c.constructor.displayName || c.constructor.name || Object.prototype.toString.call(c) : null === c ? "null" : typeof c,
        Fa("expected @param " + b + " of type " + d + ", but got " + a + "."),
        Fa("parameter type error. Enable DEBUG to see details."));
        return c
    }
      , xg = {}
      , yg = function() {
        v(xg === xg, "found an incorrect call marker, was an internal function called from the top level?")
    }
      , zg = {
        "\x00": "&#0;",
        "\t": "&#9;",
        "\n": "&#10;",
        "\v": "&#11;",
        "\f": "&#12;",
        "\r": "&#13;",
        " ": "&#32;",
        '"': "&quot;",
        "&": "&amp;",
        "'": "&#39;",
        "-": "&#45;",
        "/": "&#47;",
        "<": "&lt;",
        "=": "&#61;",
        ">": "&gt;",
        "`": "&#96;",
        "\u0085": "&#133;",
        "\u00a0": "&#160;",
        "\u2028": "&#8232;",
        "\u2029": "&#8233;"
    }
      , tg = function(a) {
        return zg[a]
    }
      , sg = /[\x00\x22\x26\x27\x3c\x3e]/g
      , Ag = /[\x00\x22\x27\x3c\x3e]/g
      , Bg = /<(?:!|\/?([a-zA-Z][a-zA-Z0-9:\-]*))(?:[^>'"]|"[^"]*"|'[^']*')*>/g
      , Cg = /</g;
    var Eg = function(a) {
        Dg(a, "upgradeElement")
    }
      , Fg = function(a) {
        Dg(a, "downgradeElements")
    }
      , Gg = ["mdl-js-textfield", "mdl-js-progress", "mdl-js-spinner", "mdl-js-button"]
      , Dg = function(a, b) {
        a && window.componentHandler && window.componentHandler[b] && Gg.forEach(function(c) {
            if (xc(a, c))
                window.componentHandler[b](a);
            c = Vc(c, a);
            w(c, function(d) {
                window.componentHandler[b](d)
            })
        })
    };
    var Ig = function(a) {
        Hg.call(this);
        document.body.appendChild(a);
        a.showModal || window.dialogPolyfill.registerDialog(a);
        a.showModal();
        Eg(a);
        var b = this.Ha().parentElement || this.Ha().parentNode;
        if (b) {
            var c = this;
            this.vd = function() {
                if (a.open) {
                    var d = a.getBoundingClientRect().height
                      , e = b.getBoundingClientRect().height
                      , f = b.getBoundingClientRect().top - document.body.getBoundingClientRect().top
                      , g = b.getBoundingClientRect().left - document.body.getBoundingClientRect().left
                      , h = a.getBoundingClientRect().width
                      , l = b.getBoundingClientRect().width;
                    a.style.top = (f + (e - d) / 2).toString() + "px";
                    d = g + (l - h) / 2;
                    a.style.left = d.toString() + "px";
                    a.style.right = (document.body.getBoundingClientRect().width - d - h).toString() + "px"
                } else
                    window.removeEventListener("resize", c.vd)
            }
            ;
            this.vd();
            window.addEventListener("resize", this.vd, !1)
        }
    }
      , Hg = function() {
        var a = Jg.call(this);
        a && (Fg(a),
        a.open && a.close(),
        dd(a),
        this.vd && window.removeEventListener("resize", this.vd))
    }
      , Jg = function() {
        return Wc("firebaseui-id-dialog")
    };
    /*
 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/
    function Kg(a, b, c, d) {
        a = a(b || Lg, c);
        d = d || Sc();
        if (a && a.Xj)
            d = a.Xj();
        else {
            d = d.createElement("DIV");
            b: if (r(a)) {
                if (a.ri && (b = a.ri(),
                b instanceof bc)) {
                    a = b;
                    break b
                }
                Fa("Soy template output is unsafe for use as HTML: " + a);
                a = ec("zSoyz")
            } else
                a = ec(String(a));
            b = a.cb();
            c = b.match(Mg);
            v(!c, "This template starts with a %s, which cannot be a child of a <div>, as required by soy internals. Consider using goog.soy.renderElement instead.\nTemplate output: %s", c && c[0], b);
            b = d;
            if (hc())
                for (; b.lastChild; )
                    b.removeChild(b.lastChild);
            b.innerHTML = cc(a)
        }
        1 == d.childNodes.length && (a = d.firstChild,
        1 == a.nodeType && (d = a));
        return d
    }
    var Mg = /^<(body|caption|col|colgroup|head|html|tr|td|th|tbody|thead|tfoot)>/i
      , Lg = {};
    var Ng = function(a, b) {
        yg();
        if (K["firebaseui.auth.soy2.element.submitButton"])
            return K["firebaseui.auth.soy2.element.submitButton"]({
                label: b
            }, a);
        a = L(null == b || "string" === typeof b, "label", b, "null|string|undefined");
        b = '<button type="submit" class="firebaseui-id-submit firebaseui-button mdl-button mdl-js-button mdl-button--raised mdl-button--colored">';
        b = a ? b + ug(a) : b + "Next";
        return J(b + "</button>")
    }
      , Og = function(a) {
        if (K["firebaseui.auth.soy2.element.continueButton"])
            return K["firebaseui.auth.soy2.element.continueButton"](null, a);
        a = "" + Ng(a, "Continue");
        return J(a)
    }
      , Pg = function(a, b) {
        a = a.message;
        yg();
        K["firebaseui.auth.soy2.element.infoBar"] ? b = K["firebaseui.auth.soy2.element.infoBar"]({
            message: a
        }, b) : (b = L("string" === typeof a, "message", a, "string"),
        b = '<div class="firebaseui-info-bar firebaseui-id-info-bar"><p class="firebaseui-info-bar-message">' + ug(b) + '&nbsp;&nbsp;<a href="javascript:void(0)" class="firebaseui-link firebaseui-id-dismiss-info-bar">',
        b = J(b + "Dismiss</a></p></div>"));
        return b
    }
      , Qg = function(a, b) {
        var c = a.xh
          , d = a.message;
        yg();
        K["firebaseui.auth.soy2.element.progressDialog"] ? b = K["firebaseui.auth.soy2.element.progressDialog"]({
            xh: c,
            message: d
        }, b) : (a = L("string" === typeof c, "iconClass", c, "string"),
        d = L("string" === typeof d, "message", d, "string"),
        c = J,
        a = wg('<div class="firebaseui-dialog-icon-wrapper"><div class="' + (qg(a) ? String(String(a.content).replace(Bg, "").replace(Cg, "&lt;")).replace(Ag, tg) : String(a).replace(sg, tg)) + ' firebaseui-dialog-icon"></div></div><div class="firebaseui-progress-dialog-message">' + ug(d) + "</div>"),
        yg(),
        K["firebaseui.auth.soy2.element.dialog"] ? b = K["firebaseui.auth.soy2.element.dialog"]({
            content: a,
            Rk: void 0
        }, b) : (b = L("string" === typeof a || a instanceof pg || a instanceof bc || a instanceof bc, "content", a, "!goog.html.SafeHtml|!goog.soy.data.SanitizedHtml|!safevalues.SafeHtml|!soy.$$EMPTY_STRING_|string"),
        a = L(!0, "classes", void 0, "null|string|undefined"),
        b = J('<dialog class="mdl-dialog firebaseui-dialog firebaseui-id-dialog' + (a ? " " + (qg(a) ? String(String(a.content).replace(Bg, "").replace(Cg, "&lt;")).replace(Ag, tg) : String(a).replace(sg, tg)) : "") + '">' + ug(b) + "</dialog>")),
        b = c(b));
        return b
    }
      , Sg = function(a, b) {
        a = a || {};
        return Rg(b, a.vi)
    }
      , Rg = function(a, b) {
        yg();
        if (K["firebaseui.auth.soy2.element.busyIndicator"])
            return K["firebaseui.auth.soy2.element.busyIndicator"]({
                vi: b
            }, a);
        a = L(null == b || "boolean" === typeof b, "useSpinner", b, "boolean|null|undefined");
        return J(a ? '<div class="mdl-spinner mdl-spinner--single-color mdl-js-spinner is-active firebaseui-busy-indicator firebaseui-id-busy-indicator"></div>' : '<div class="mdl-progress mdl-js-progress mdl-progress__indeterminate firebaseui-busy-indicator firebaseui-id-busy-indicator"></div>')
    };
    var Ug = function() {
        dd(Tg.call(this))
    }
      , Tg = function() {
        return this.sa("firebaseui-id-info-bar")
    }
      , Vg = function() {
        return this.sa("firebaseui-id-dismiss-info-bar")
    };
    var Wg = {}
      , Xg = 0
      , Yg = function(a, b) {
        if (!a)
            throw Error("Event target element must be provided!");
        "undefined" === typeof a.dh && (a.dh = Xg,
        Xg++);
        a = a.dh;
        if (Wg[a] && Wg[a].length)
            for (var c = 0; c < Wg[a].length; c++)
                Wg[a][c].dispatchEvent(b)
    };
    var Zg = {
        Uk: {
            "google.com": "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg",
            "github.com": "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/github.svg",
            "facebook.com": "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/facebook.svg",
            "twitter.com": "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/twitter.svg",
            password: "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/mail.svg",
            phone: "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/phone.svg",
            anonymous: "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/anonymous.png",
            "microsoft.com": "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/microsoft.svg",
            "yahoo.com": "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/yahoo.svg",
            "apple.com": "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/apple.png",
            saml: "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/saml.svg",
            oidc: "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/oidc.svg"
        },
        Tk: {
            "google.com": "#ffffff",
            "github.com": "#333333",
            "facebook.com": "#3b5998",
            "twitter.com": "#55acee",
            password: "#db4437",
            phone: "#02bd7e",
            anonymous: "#f4b400",
            "microsoft.com": "#2F2F2F",
            "yahoo.com": "#720E9E",
            "apple.com": "#000000",
            saml: "#007bff",
            oidc: "#007bff"
        },
        Vk: {
            "google.com": "Google",
            "github.com": "GitHub",
            "facebook.com": "Facebook",
            "twitter.com": "Twitter",
            password: "Password",
            phone: "Phone",
            anonymous: "Guest",
            "microsoft.com": "Microsoft",
            "yahoo.com": "Yahoo",
            "apple.com": "Apple"
        }
    }
      , $g = function(a, b, c) {
        md.call(this, a, b);
        for (var d in c)
            this[d] = c[d]
    };
    u($g, md);
    var M = function(a, b, c, d, e) {
        We.call(this, c);
        this.oi = a;
        this.ni = b;
        this.ke = !1;
        this.Wh = d || null;
        this.ab = this.Cd = null;
        this.vc = $a(Zg);
        bb(this.vc, e || {})
    };
    u(M, We);
    M.prototype.Sc = function() {
        var a = Kg(this.oi, this.ni, this.vc, this.bd());
        Eg(a);
        this.u = a
    }
    ;
    M.prototype.Fa = function() {
        M.X.Fa.call(this);
        Yg(this.Jb(), new $g("pageEnter",this.Jb(),{
            pageId: this.Wh
        }));
        if (this.qh() && this.vc.Dg) {
            var a = this.vc.Dg;
            cf(this, this.qh(), function() {
                a()
            })
        }
        if (this.oh() && this.vc.dg) {
            var b = this.vc.dg;
            cf(this, this.oh(), function() {
                b()
            })
        }
    }
    ;
    M.prototype.Yc = function() {
        Yg(this.Jb(), new $g("pageExit",this.Jb(),{
            pageId: this.Wh
        }));
        M.X.Yc.call(this)
    }
    ;
    M.prototype.F = function() {
        window.clearTimeout(this.Cd);
        this.ni = this.oi = this.Cd = null;
        this.ke = !1;
        this.ab = null;
        Fg(this.Ha());
        M.X.F.call(this)
    }
    ;
    var ah = function(a) {
        a.ke = !0;
        var b = xc(a.Ha(), "firebaseui-use-spinner");
        a.Cd = window.setTimeout(function() {
            a.Ha() && null === a.ab && (a.ab = Kg(Sg, {
                vi: b
            }, null, a.bd()),
            a.Ha().appendChild(a.ab),
            Eg(a.ab))
        }, 500)
    };
    M.prototype.Xd = function(a, b, c, d) {
        var e = this;
        if (!e.ke) {
            ah(e);
            var f = function() {
                if (e.isDisposed())
                    return null;
                e.ke = !1;
                window.clearTimeout(e.Cd);
                e.Cd = null;
                e.ab && (Fg(e.ab),
                dd(e.ab),
                e.ab = null)
            };
            a.apply(null, b).then(c, d).then(f, f)
        }
    }
    ;
    M.prototype.Jb = function() {
        return this.Ha().parentElement || this.Ha().parentNode
    }
    ;
    var bh = function(a, b, c) {
        $e(a, b, function() {
            c()
        })
    };
    Object.assign(M.prototype, {
        Ne: function(a) {
            Ug.call(this);
            var b = Kg(Pg, {
                message: a
            }, null, this.bd());
            this.Ha().appendChild(b);
            cf(this, Vg.call(this), function() {
                dd(b)
            })
        },
        Xk: Ug,
        al: Tg,
        Zk: Vg,
        gl: function(a, b) {
            a = Kg(Qg, {
                xh: a,
                message: b
            }, null, this.bd());
            Ig.call(this, a)
        },
        Wk: Hg,
        Yk: Jg,
        cl: function() {
            return this.sa("firebaseui-tos")
        },
        qh: function() {
            return this.sa("firebaseui-tos-link")
        },
        oh: function() {
            return this.sa("firebaseui-pp-link")
        },
        dl: function() {
            return this.sa("firebaseui-tos-list")
        }
    });
    var ch = function(a, b) {
        if (K["firebaseui.auth.soy2.page.passwordRecoveryEmailSent"])
            return K["firebaseui.auth.soy2.page.passwordRecoveryEmailSent"](a, b);
        var c = L("string" === typeof a.email, "email", a.email, "string")
          , d = L(null == a.B || "boolean" === typeof a.B, "allowContinue", a.B, "boolean|null|undefined");
        var e = '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-password-recovery-email-sent"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Check your email</h1></div><div class="firebaseui-card-content"><p class="firebaseui-text">';
        c = "Follow the instructions sent to <strong>" + ug(c) + "</strong> to recover your password";
        e = e + c + '</p></div><div class="firebaseui-card-actions">';
        d && (e = e + '<div class="firebaseui-form-actions">' + Ng(b, "Done"),
        e += "</div>");
        d = e;
        K["firebaseui.auth.soy2.element.tosPpLink"] ? b = K["firebaseui.auth.soy2.element.tosPpLink"](a, b) : (a = b.dg,
        e = "",
        vg(b.Dg) && vg(a) && (e += '<ul class="firebaseui-tos-list firebaseui-tos"><li class="firebaseui-inline-list-item"><a href="javascript:void(0)" class="firebaseui-link firebaseui-tos-link" target="_blank">Terms of Service</a></li><li class="firebaseui-inline-list-item"><a href="javascript:void(0)" class="firebaseui-link firebaseui-pp-link" target="_blank">Privacy Policy</a></li></ul>'),
        b = J(e));
        return J(d + ('</div><div class="firebaseui-card-footer">' + b + "</div></div>"))
    }
      , dh = function(a, b) {
        return K["firebaseui.auth.soy2.page.callback"] ? K["firebaseui.auth.soy2.page.callback"](a, b) : J('<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-callback"><div class="firebaseui-callback-indicator-container">' + Rg(b) + "</div></div>")
    }
      , eh = function(a, b) {
        if (K["firebaseui.auth.soy2.page.passwordReset"])
            return K["firebaseui.auth.soy2.page.passwordReset"](a, b);
        var c = L("string" === typeof a.email, "email", a.email, "string");
        c = '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-password-reset"><form onsubmit="return false;"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Reset your password</h1></div><div class="firebaseui-card-content"><p class="firebaseui-text">for <strong>' + (ug(c) + "</strong></p>");
        var d = {
            label: "New password"
        };
        for (e in a)
            e in d || (d[e] = a[e]);
        a = (d || {}).label;
        yg();
        if (K["firebaseui.auth.soy2.element.newPassword"])
            a = K["firebaseui.auth.soy2.element.newPassword"]({
                label: a
            }, b);
        else {
            a = L(null == a || "string" === typeof a, "label", a, "null|string|undefined");
            var e = '<div class="firebaseui-new-password-component"><div class="firebaseui-textfield mdl-textfield mdl-js-textfield mdl-textfield--floating-label"><label class="mdl-textfield__label firebaseui-label" for="newPassword">';
            e = a ? e + ug(a) : e + "Choose password";
            a = J(e + '</label><input type="password" name="newPassword" autocomplete="new-password" class="mdl-textfield__input firebaseui-input firebaseui-id-new-password"></div><a href="javascript:void(0)" class="firebaseui-input-floating-button firebaseui-id-password-toggle firebaseui-input-toggle-on firebaseui-input-toggle-blur"></a><div class="firebaseui-error-wrapper"><p class="firebaseui-error firebaseui-text-input-error firebaseui-hidden firebaseui-id-new-password-error"></p></div></div>')
        }
        c += a;
        K["firebaseui.auth.soy2.element.saveButton"] ? b = K["firebaseui.auth.soy2.element.saveButton"](null, b) : (b = "" + Ng(b, "Save"),
        b = J(b));
        return J(c + ('</div><div class="firebaseui-card-actions"><div class="firebaseui-form-actions">' + b + "</div></div></form></div>"))
    }
      , fh = function(a, b) {
        a = a || {};
        a = a.B;
        yg();
        K["firebaseui.auth.soy2.page.passwordResetSuccess"] ? b = K["firebaseui.auth.soy2.page.passwordResetSuccess"]({
            B: a
        }, b) : (b = '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-password-reset-success"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Password changed</h1></div><div class="firebaseui-card-content"><p class="firebaseui-text">You can now sign in with your new password</p></div><div class="firebaseui-card-actions">' + ((L(null == a || "boolean" === typeof a, "allowContinue", a, "boolean|null|undefined") ? '<div class="firebaseui-form-actions">' + Og(b) + "</div>" : "") + "</div></div>"),
        b = J(b));
        return b
    }
      , gh = function(a, b) {
        a = a || {};
        a = a.B;
        yg();
        K["firebaseui.auth.soy2.page.passwordResetFailure"] ? b = K["firebaseui.auth.soy2.page.passwordResetFailure"]({
            B: a
        }, b) : (b = '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-password-reset-failure"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Try resetting your password again</h1></div><div class="firebaseui-card-content"><p class="firebaseui-text">Your request to reset your password has expired or the link has already been used</p></div><div class="firebaseui-card-actions">' + ((L(null == a || "boolean" === typeof a, "allowContinue", a, "boolean|null|undefined") ? '<div class="firebaseui-form-actions">' + Og(b) + "</div>" : "") + "</div></div>"),
        b = J(b));
        return b
    }
      , hh = function(a, b) {
        var c = a.email;
        a = a.B;
        yg();
        if (K["firebaseui.auth.soy2.page.emailChangeRevokeSuccess"])
            b = K["firebaseui.auth.soy2.page.emailChangeRevokeSuccess"]({
                email: c,
                B: a
            }, b);
        else {
            c = L("string" === typeof c, "email", c, "string");
            a = L(null == a || "boolean" === typeof a, "allowContinue", a, "boolean|null|undefined");
            var d = '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-email-change-revoke-success"><form onsubmit="return false;"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Updated email address</h1></div><div class="firebaseui-card-content"><p class="firebaseui-text">';
            c = "Your sign-in email address has been changed back to <strong>" + ug(c) + "</strong>.";
            d = d + c + '</p><p class="firebaseui-text">If you didn\u2019t ask to change your sign-in email, it\u2019s possible someone is trying to access your account and you should <a class="firebaseui-link firebaseui-id-reset-password-link" href="javascript:void(0)">change your password right away</a>.';
            d += '</p></div><div class="firebaseui-card-actions">' + (a ? '<div class="firebaseui-form-actions">' + Og(b) + "</div>" : "") + "</div></form></div>";
            b = J(d)
        }
        return b
    }
      , ih = function(a, b) {
        a = a || {};
        a = a.B;
        yg();
        K["firebaseui.auth.soy2.page.emailChangeRevokeFailure"] ? b = K["firebaseui.auth.soy2.page.emailChangeRevokeFailure"]({
            B: a
        }, b) : (b = '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-email-change-revoke-failure"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Unable to update your email address</h1></div><div class="firebaseui-card-content"><p class="firebaseui-text">There was a problem changing your sign-in email back.</p><p class="firebaseui-text">If you try again and still can\u2019t reset your email, try asking your administrator for help.</p></div><div class="firebaseui-card-actions">' + ((L(null == a || "boolean" === typeof a, "allowContinue", a, "boolean|null|undefined") ? '<div class="firebaseui-form-actions">' + Og(b) + "</div>" : "") + "</div></div>"),
        b = J(b));
        return b
    }
      , jh = function(a, b) {
        a = a || {};
        a = a.B;
        yg();
        K["firebaseui.auth.soy2.page.emailVerificationSuccess"] ? b = K["firebaseui.auth.soy2.page.emailVerificationSuccess"]({
            B: a
        }, b) : (b = '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-email-verification-success"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Your email has been verified</h1><br><p>You can now sign in with your new account <a href="https://garagejobs.in/applicant/loginC">here</a></p></div><div class="firebaseui-card-content"><p class="firebaseui-text"></p></div><div class="firebaseui-card-actions">' + ((L(null == a || "boolean" === typeof a, "allowContinue", a, "boolean|null|undefined") ? '<div class="firebaseui-form-actions">' + Og(b) + "</div>" : "") + "</div></div>"),
        b = J(b));
        return b
    }
      , kh = function(a, b) {
        a = a || {};
        a = a.B;
        yg();
        K["firebaseui.auth.soy2.page.emailVerificationFailure"] ? b = K["firebaseui.auth.soy2.page.emailVerificationFailure"]({
            B: a
        }, b) : (b = '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-email-verification-failure"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Try verifying your email again</h1></div><div class="firebaseui-card-content"><p class="firebaseui-text">Your request to verify your email has expired or the link has already been used</p></div><div class="firebaseui-card-actions">' + ((L(null == a || "boolean" === typeof a, "allowContinue", a, "boolean|null|undefined") ? '<div class="firebaseui-form-actions">' + Og(b) + "</div>" : "") + "</div></div>"),
        b = J(b));
        return b
    }
      , lh = function(a, b) {
        var c = a.email;
        a = a.B;
        yg();
        if (K["firebaseui.auth.soy2.page.verifyAndChangeEmailSuccess"])
            b = K["firebaseui.auth.soy2.page.verifyAndChangeEmailSuccess"]({
                email: c,
                B: a
            }, b);
        else {
            c = L("string" === typeof c, "email", c, "string");
            a = L(null == a || "boolean" === typeof a, "allowContinue", a, "boolean|null|undefined");
            var d = '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-verify-and-change-email-success"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Your email has been verified and changed</h1></div><div class="firebaseui-card-content"><p class="firebaseui-text">';
            c = "You can now sign in with your new email <strong>" + ug(c) + "</strong>.";
            d = d + c + ('</p></div><div class="firebaseui-card-actions">' + (a ? '<div class="firebaseui-form-actions">' + Og(b) + "</div>" : "") + "</div></div>");
            b = J(d)
        }
        return b
    }
      , mh = function(a, b) {
        a = a || {};
        a = a.B;
        yg();
        K["firebaseui.auth.soy2.page.verifyAndChangeEmailFailure"] ? b = K["firebaseui.auth.soy2.page.verifyAndChangeEmailFailure"]({
            B: a
        }, b) : (b = '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-verify-and-change-email-failure"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Try updating your email again</h1></div><div class="firebaseui-card-content"><p class="firebaseui-text">Your request to verify and update your email has expired or the link has already been used.</p></div><div class="firebaseui-card-actions">' + ((L(null == a || "boolean" === typeof a, "allowContinue", a, "boolean|null|undefined") ? '<div class="firebaseui-form-actions">' + Og(b) + "</div>" : "") + "</div></div>"),
        b = J(b));
        return b
    }
      , nh = function(a, b) {
        var c = a.factorId
          , d = a.phoneNumber;
        a = a.B;
        yg();
        if (K["firebaseui.auth.soy2.page.revertSecondFactorAdditionSuccess"])
            b = K["firebaseui.auth.soy2.page.revertSecondFactorAdditionSuccess"]({
                factorId: c,
                phoneNumber: d,
                B: a
            }, b);
        else {
            c = L("string" === typeof c, "factorId", c, "string");
            d = L(null == d || "string" === typeof d, "phoneNumber", d, "null|string|undefined");
            a = L(null == a || "boolean" === typeof a, "allowContinue", a, "boolean|null|undefined");
            var e = '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-revert-second-factor-addition-success"><form onsubmit="return false;"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Removed second factor</h1></div><div class="firebaseui-card-content"><p class="firebaseui-text">';
            switch (r(c) ? c.toString() : c) {
            case "phone":
                c = "The <strong>" + ug(c) + " " + ug(d) + "</strong> was removed as a second authentication step.";
                e += c;
                break;
            default:
                e += "The device or app was removed as a second authentication step."
            }
            e = e + '</p><p class="firebaseui-text">If you don\'t recognize this device, someone might be trying to access your account. Consider <a class="firebaseui-link firebaseui-id-reset-password-link" href="javascript:void(0)">changing your password right away</a>.</p></div><div class="firebaseui-card-actions">' + ((a ? '<div class="firebaseui-form-actions">' + Og(b) + "</div>" : "") + "</div></form></div>");
            b = J(e)
        }
        return b
    }
      , oh = function(a, b) {
        a = a || {};
        a = a.B;
        yg();
        K["firebaseui.auth.soy2.page.revertSecondFactorAdditionFailure"] ? b = K["firebaseui.auth.soy2.page.revertSecondFactorAdditionFailure"]({
            B: a
        }, b) : (b = '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-revert-second-factor-addition-failure"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Couldn\'t remove your second factor</h1></div><div class="firebaseui-card-content"><p class="firebaseui-text">Something went wrong removing your second factor.</p><p class="firebaseui-text">Try removing it again. If that doesn\'t work, contact support for assistance.</p></div><div class="firebaseui-card-actions">' + ((L(null == a || "boolean" === typeof a, "allowContinue", a, "boolean|null|undefined") ? '<div class="firebaseui-form-actions">' + Og(b) + "</div>" : "") + "</div></div>"),
        b = J(b));
        return b
    }
      , ph = function(a, b) {
        a = a.errorMessage;
        yg();
        K["firebaseui.auth.soy2.page.unrecoverableError"] ? b = K["firebaseui.auth.soy2.page.unrecoverableError"]({
            errorMessage: a
        }, b) : (b = L("string" === typeof a, "errorMessage", a, "string"),
        b = '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-unrecoverable-error"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Error encountered</h1></div><div class="firebaseui-card-content"><p class="firebaseui-text">' + (ug(b) + "</p></div></div>"),
        b = J(b));
        return b
    };
    var qh = function(a) {
        M.call(this, dh, void 0, a, "callback")
    };
    m(qh, M);
    qh.prototype.Xd = function(a, b, c, d) {
        a.apply(null, b).then(c, d)
    }
    ;
    var rh = function() {
        return this.sa("firebaseui-id-submit")
    }
      , sh = function() {
        return this.sa("firebaseui-id-secondary-link")
    }
      , th = function(a, b) {
        var c = rh.call(this);
        cf(this, c, function(d) {
            a(d)
        });
        (c = sh.call(this)) && b && cf(this, c, function(d) {
            b(d)
        })
    };
    var uh = function(a, b, c, d) {
        M.call(this, hh, {
            email: a,
            B: !!c
        }, d, "emailChangeRevoke");
        this.nd = b;
        this.Ma = c || null
    };
    m(uh, M);
    uh.prototype.Fa = function() {
        var a = this;
        cf(this, vh(this), function() {
            a.nd()
        });
        this.Ma && (this.Nb(this.Ma),
        this.sc().focus());
        M.prototype.Fa.call(this)
    }
    ;
    uh.prototype.F = function() {
        this.nd = this.Ma = null;
        M.prototype.F.call(this)
    }
    ;
    var vh = function(a) {
        return a.sa("firebaseui-id-reset-password-link")
    };
    Object.assign(uh.prototype, {
        sc: rh,
        zf: sh,
        Nb: th
    });
    var N = function(a, b, c, d, e, f) {
        M.call(this, a, b, d, e || "notice", f);
        this.Ma = c || null
    };
    u(N, M);
    N.prototype.Fa = function() {
        this.Ma && (this.Nb(this.Ma),
        this.sc().focus());
        N.X.Fa.call(this)
    }
    ;
    N.prototype.F = function() {
        this.Ma = null;
        N.X.F.call(this)
    }
    ;
    Object.assign(N.prototype, {
        sc: rh,
        zf: sh,
        Nb: th
    });
    var wh = function(a, b, c, d, e) {
        N.call(this, ch, {
            email: a,
            B: !!b
        }, b, e, "passwordRecoveryEmailSent", {
            Dg: c,
            dg: d
        })
    };
    u(wh, N);
    var xh = function(a, b) {
        N.call(this, jh, {
            B: !!a
        }, a, b, "emailVerificationSuccess")
    };
    u(xh, N);
    var yh = function(a, b) {
        N.call(this, kh, {
            B: !!a
        }, a, b, "emailVerificationFailure")
    };
    u(yh, N);
    var zh = function(a, b, c) {
        N.call(this, lh, {
            email: a,
            B: !!b
        }, b, c, "verifyAndChangeEmailSuccess")
    };
    u(zh, N);
    var Ah = function(a, b) {
        N.call(this, mh, {
            B: !!a
        }, a, b, "verifyAndChangeEmailFailure")
    };
    u(Ah, N);
    var Bh = function(a, b) {
        N.call(this, oh, {
            B: !!a
        }, a, b, "revertSecondFactorAdditionFailure")
    };
    u(Bh, N);
    var Ch = function(a, b) {
        N.call(this, fh, {
            B: !!a
        }, a, b, "passwordResetSuccess")
    };
    u(Ch, N);
    var Dh = function(a, b) {
        N.call(this, gh, {
            B: !!a
        }, a, b, "passwordResetFailure")
    };
    u(Dh, N);
    var Eh = function(a, b) {
        N.call(this, ih, {
            B: !!a
        }, a, b, "emailChangeRevokeFailure")
    };
    u(Eh, N);
    var Fh = function(a, b) {
        N.call(this, ph, {
            errorMessage: a
        }, void 0, b, "unrecoverableError")
    };
    u(Fh, N);
    var Gh = function() {
        return K["firebaseui.auth.soy2.strings.errorSendPasswordReset"] ? K["firebaseui.auth.soy2.strings.errorSendPasswordReset"](void 0, void 0) : "Unable to send password reset code to specified email"
    }
      , Hh = function() {
        return K["firebaseui.auth.soy2.strings.errorLoginAgain_"] ? K["firebaseui.auth.soy2.strings.errorLoginAgain_"](null, void 0) : "Please login again to perform this operation"
    };
    var Ih = function() {
        return this.sa("firebaseui-id-new-password")
    }
      , Jh = function() {
        return this.sa("firebaseui-id-password-toggle")
    }
      , Kh = function() {
        this.Lf = !this.Lf;
        var a = Jh.call(this)
          , b = Ih.call(this);
        this.Lf ? (b.type = "text",
        yc(a, "firebaseui-input-toggle-off"),
        zc(a, "firebaseui-input-toggle-on")) : (b.type = "password",
        yc(a, "firebaseui-input-toggle-on"),
        zc(a, "firebaseui-input-toggle-off"));
        b.focus()
    }
      , Lh = function() {
        return this.sa("firebaseui-id-new-password-error")
    };
    var Mh = function(a, b, c) {
        M.call(this, eh, {
            email: a
        }, c, "passwordReset");
        this.Yf = b
    };
    m(Mh, M);
    Mh.prototype.Fa = function() {
        this.wj();
        this.Nb(this.Yf);
        bh(this, this.rc(), this.Yf);
        this.rc().focus();
        M.prototype.Fa.call(this)
    }
    ;
    Mh.prototype.F = function() {
        this.Yf = null;
        M.prototype.F.call(this)
    }
    ;
    Object.assign(Mh.prototype, {
        rc: Ih,
        nh: Lh,
        bl: Jh,
        wj: function() {
            this.Lf = !1;
            var a = Ih.call(this);
            a.type = "password";
            var b = Lh.call(this);
            Ze(this, a, function() {
                xc(b, "firebaseui-hidden") || "none" == b.style.display || (Ye(a, !0),
                yc(b, "firebaseui-hidden"))
            });
            var c = Jh.call(this);
            yc(c, "firebaseui-input-toggle-on");
            zc(c, "firebaseui-input-toggle-off");
            af(this, a, function() {
                yc(c, "firebaseui-input-toggle-focus");
                zc(c, "firebaseui-input-toggle-blur")
            });
            bf(this, a, function() {
                yc(c, "firebaseui-input-toggle-blur");
                zc(c, "firebaseui-input-toggle-focus")
            });
            cf(this, c, t(Kh, this))
        },
        Ji: function() {
            var a = Ih.call(this)
              , b = Lh.call(this);
            id(a) ? (Ye(a, !0),
            yc(b, "firebaseui-hidden"),
            b = !0) : (Ye(a, !1),
            df(b, (K["firebaseui.auth.soy2.strings.errorMissingPassword"] ? K["firebaseui.auth.soy2.strings.errorMissingPassword"](void 0, void 0) : "Enter your password").toString()),
            b = !1);
            return b ? id(a) : null
        },
        sc: rh,
        zf: sh,
        Nb: th
    });
    var Nh = function(a, b, c, d, e) {
        M.call(this, nh, {
            factorId: a,
            phoneNumber: c || null,
            B: !!d
        }, e, "revertSecondFactorAdditionSuccess");
        this.nd = b;
        this.Ma = d || null
    };
    m(Nh, M);
    Nh.prototype.Fa = function() {
        var a = this;
        cf(this, vh(this), function() {
            a.nd()
        });
        this.Ma && (this.Nb(this.Ma),
        this.sc().focus());
        M.prototype.Fa.call(this)
    }
    ;
    Nh.prototype.F = function() {
        this.nd = this.Ma = null;
        M.prototype.F.call(this)
    }
    ;
    Object.assign(Nh.prototype, {
        sc: rh,
        zf: sh,
        Nb: th
    });
    var Oh = function(a) {
        return Array.prototype.map.call(a, function(b) {
            b = b.toString(16);
            return 1 < b.length ? b : "0" + b
        }).join("")
    };
    !y("Android") || $b();
    $b();
    y("Safari") && ($b() || (Yb() ? 0 : y("Coast")) || (Yb() ? 0 : y("Opera")) || (Yb() ? 0 : y("Edge")) || (Yb() ? Xb("Microsoft Edge") : y("Edg/")) || Yb() && Xb("Opera"));
    var Ph = null
      , Rh = function(a) {
        var b = [];
        Qh(a, function(c) {
            b.push(c)
        });
        return b
    }
      , Qh = function(a, b) {
        function c(l) {
            for (; d < a.length; ) {
                var n = a.charAt(d++)
                  , q = Ph[n];
                if (null != q)
                    return q;
                if (!/^[\s\xa0]*$/.test(n))
                    throw Error("Unknown base64 encoding at char: " + n);
            }
            return l
        }
        Sh();
        for (var d = 0; ; ) {
            var e = c(-1)
              , f = c(0)
              , g = c(64)
              , h = c(64);
            if (64 === h && -1 === e)
                break;
            b(e << 2 | f >> 4);
            64 != g && (b(f << 4 & 240 | g >> 2),
            64 != h && b(g << 6 & 192 | h))
        }
    }
      , Sh = function() {
        if (!Ph) {
            Ph = {};
            for (var a = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".split(""), b = ["+/=", "+/", "-_=", "-_.", "-_"], c = 0; 5 > c; c++)
                for (var d = a.concat(b[c].split("")), e = 0; e < d.length; e++) {
                    var f = d[e]
                      , g = Ph[f];
                    void 0 === g ? Ph[f] = e : v(g === e)
                }
        }
    };
    var Th = function() {
        this.blockSize = -1
    };
    var Wh = function(a, b) {
        this.blockSize = -1;
        this.blockSize = 64;
        this.Ud = p.Uint8Array ? new Uint8Array(this.blockSize) : Array(this.blockSize);
        this.Te = this.tc = 0;
        this.G = [];
        this.Mj = a;
        this.Bh = b;
        this.xk = p.Int32Array ? new Int32Array(64) : Array(64);
        void 0 === Uh && (Uh = p.Int32Array ? new Int32Array(Vh) : Vh);
        this.reset()
    }, Uh;
    u(Wh, Th);
    for (var Xh = [], Yh = 0; 63 > Yh; Yh++)
        Xh[Yh] = 0;
    var Zh = [].concat(128, Xh);
    Wh.prototype.reset = function() {
        this.Te = this.tc = 0;
        this.G = p.Int32Array ? new Int32Array(this.Bh) : Ta(this.Bh)
    }
    ;
    var $h = function(a) {
        var b = a.Ud;
        v(b.length == a.blockSize);
        for (var c = a.xk, d = 0, e = 0; e < b.length; )
            c[d++] = b[e] << 24 | b[e + 1] << 16 | b[e + 2] << 8 | b[e + 3],
            e = 4 * d;
        for (b = 16; 64 > b; b++) {
            e = c[b - 15] | 0;
            d = c[b - 2] | 0;
            var f = (c[b - 16] | 0) + ((e >>> 7 | e << 25) ^ (e >>> 18 | e << 14) ^ e >>> 3) | 0
              , g = (c[b - 7] | 0) + ((d >>> 17 | d << 15) ^ (d >>> 19 | d << 13) ^ d >>> 10) | 0;
            c[b] = f + g | 0
        }
        d = a.G[0] | 0;
        e = a.G[1] | 0;
        var h = a.G[2] | 0
          , l = a.G[3] | 0
          , n = a.G[4] | 0
          , q = a.G[5] | 0
          , A = a.G[6] | 0;
        f = a.G[7] | 0;
        for (b = 0; 64 > b; b++) {
            var D = ((d >>> 2 | d << 30) ^ (d >>> 13 | d << 19) ^ (d >>> 22 | d << 10)) + (d & e ^ d & h ^ e & h) | 0;
            g = n & q ^ ~n & A;
            f = f + ((n >>> 6 | n << 26) ^ (n >>> 11 | n << 21) ^ (n >>> 25 | n << 7)) | 0;
            g = g + (Uh[b] | 0) | 0;
            g = f + (g + (c[b] | 0) | 0) | 0;
            f = A;
            A = q;
            q = n;
            n = l + g | 0;
            l = h;
            h = e;
            e = d;
            d = g + D | 0
        }
        a.G[0] = a.G[0] + d | 0;
        a.G[1] = a.G[1] + e | 0;
        a.G[2] = a.G[2] + h | 0;
        a.G[3] = a.G[3] + l | 0;
        a.G[4] = a.G[4] + n | 0;
        a.G[5] = a.G[5] + q | 0;
        a.G[6] = a.G[6] + A | 0;
        a.G[7] = a.G[7] + f | 0
    };
    Wh.prototype.update = function(a, b) {
        void 0 === b && (b = a.length);
        var c = 0
          , d = this.tc;
        if ("string" === typeof a)
            for (; c < b; )
                this.Ud[d++] = a.charCodeAt(c++),
                d == this.blockSize && ($h(this),
                d = 0);
        else if (va(a))
            for (; c < b; ) {
                var e = a[c++];
                if (!("number" == typeof e && 0 <= e && 255 >= e && e == (e | 0)))
                    throw Error("message must be a byte array");
                this.Ud[d++] = e;
                d == this.blockSize && ($h(this),
                d = 0)
            }
        else
            throw Error("message must be string or array");
        this.tc = d;
        this.Te += b
    }
    ;
    Wh.prototype.digest = function() {
        var a = []
          , b = 8 * this.Te;
        56 > this.tc ? this.update(Zh, 56 - this.tc) : this.update(Zh, this.blockSize - (this.tc - 56));
        for (var c = 63; 56 <= c; c--)
            this.Ud[c] = b & 255,
            b /= 256;
        $h(this);
        for (c = b = 0; c < this.Mj; c++)
            for (var d = 24; 0 <= d; d -= 8)
                a[b++] = this.G[c] >> d & 255;
        return a
    }
    ;
    var Vh = [1116352408, 1899447441, 3049323471, 3921009573, 961987163, 1508970993, 2453635748, 2870763221, 3624381080, 310598401, 607225278, 1426881987, 1925078388, 2162078206, 2614888103, 3248222580, 3835390401, 4022224774, 264347078, 604807628, 770255983, 1249150122, 1555081692, 1996064986, 2554220882, 2821834349, 2952996808, 3210313671, 3336571891, 3584528711, 113926993, 338241895, 666307205, 773529912, 1294757372, 1396182291, 1695183700, 1986661051, 2177026350, 2456956037, 2730485921, 2820302411, 3259730800, 3345764771, 3516065817, 3600352804, 4094571909, 275423344, 430227734, 506948616, 659060556, 883997877, 958139571, 1322822218, 1537002063, 1747873779, 1955562222, 2024104815, 2227730452, 2361852424, 2428436474, 2756734187, 3204031479, 3329325298];
    var bi = function() {
        Wh.call(this, 8, ai)
    };
    u(bi, Wh);
    var ai = [1779033703, 3144134277, 1013904242, 2773480762, 1359893119, 2600822924, 528734635, 1541459225];
    var ci = function() {};
    ci.prototype.Og = null;
    var di = function(a) {
        return a.Og || (a.Og = a.me())
    };
    var ei, fi = function() {};
    u(fi, ci);
    fi.prototype.Tc = function() {
        var a = gi(this);
        return a ? new ActiveXObject(a) : new XMLHttpRequest
    }
    ;
    fi.prototype.me = function() {
        var a = {};
        gi(this) && (a[0] = !0,
        a[1] = !0);
        return a
    }
    ;
    var gi = function(a) {
        if (!a.zh && "undefined" == typeof XMLHttpRequest && "undefined" != typeof ActiveXObject) {
            for (var b = ["MSXML2.XMLHTTP.6.0", "MSXML2.XMLHTTP.3.0", "MSXML2.XMLHTTP", "Microsoft.XMLHTTP"], c = 0; c < b.length; c++) {
                var d = b[c];
                try {
                    return new ActiveXObject(d),
                    a.zh = d
                } catch (e) {}
            }
            throw Error("Could not create ActiveXObject. ActiveX might be disabled, or MSXML might not be installed");
        }
        return a.zh
    };
    ei = new fi;
    var hi = function() {};
    u(hi, ci);
    hi.prototype.Tc = function() {
        var a = new XMLHttpRequest;
        if ("withCredentials"in a)
            return a;
        if ("undefined" != typeof XDomainRequest)
            return new ii;
        throw Error("Unsupported browser");
    }
    ;
    hi.prototype.me = function() {
        return {}
    }
    ;
    var ii = function() {
        this.Ua = new XDomainRequest;
        this.readyState = 0;
        this.onreadystatechange = null;
        this.responseType = this.responseText = this.response = "";
        this.status = -1;
        this.responseXML = null;
        this.statusText = "";
        this.Ua.onload = t(this.hj, this);
        this.Ua.onerror = t(this.sh, this);
        this.Ua.onprogress = t(this.ij, this);
        this.Ua.ontimeout = t(this.mj, this)
    };
    k = ii.prototype;
    k.open = function(a, b, c) {
        if (null != c && !c)
            throw Error("Only async requests are supported.");
        this.Ua.open(a, b)
    }
    ;
    k.send = function(a) {
        if (a)
            if ("string" == typeof a)
                this.Ua.send(a);
            else
                throw Error("Only string data is supported");
        else
            this.Ua.send()
    }
    ;
    k.abort = function() {
        this.Ua.abort()
    }
    ;
    k.setRequestHeader = function() {}
    ;
    k.getResponseHeader = function(a) {
        return "content-type" == a.toLowerCase() ? this.Ua.contentType : ""
    }
    ;
    k.hj = function() {
        this.status = 200;
        this.response = this.responseText = this.Ua.responseText;
        ji(this, 4)
    }
    ;
    k.sh = function() {
        this.status = 500;
        this.response = this.responseText = "";
        ji(this, 4)
    }
    ;
    k.mj = function() {
        this.sh()
    }
    ;
    k.ij = function() {
        this.status = 200;
        ji(this, 1)
    }
    ;
    var ji = function(a, b) {
        a.readyState = b;
        if (a.onreadystatechange)
            a.onreadystatechange()
    };
    ii.prototype.getAllResponseHeaders = function() {
        return "content-type: " + this.Ua.contentType
    }
    ;
    var ki = function(a) {
        this.Md = a.zk || null;
        this.Ed = a.il || !1;
        this.dc = this.Eb = void 0
    };
    u(ki, ci);
    ki.prototype.Tc = function() {
        var a = new li(this.Md,this.Ed);
        this.Eb && a.sg(this.Eb);
        this.dc && a.gi(this.dc);
        return a
    }
    ;
    ki.prototype.me = function(a) {
        return function() {
            return a
        }
    }({});
    ki.prototype.sg = function(a) {
        this.Eb = a
    }
    ;
    ki.prototype.gi = function(a) {
        this.dc = a
    }
    ;
    var li = function(a, b) {
        E.call(this);
        this.Md = a;
        this.Ed = b;
        this.dc = this.Eb = void 0;
        this.status = this.readyState = 0;
        this.responseType = this.responseText = this.response = this.statusText = "";
        this.onreadystatechange = this.responseXML = null;
        this.og = new Headers;
        this.Ic = null;
        this.Mh = "GET";
        this.Yb = "";
        this.Wa = !1;
        this.U = ag(bg(), "goog.net.FetchXmlHttp").Qf;
        this.Cg = this.Uc = this.Yd = null
    };
    u(li, E);
    li.prototype.open = function(a, b, c) {
        v(!!c, "Only async requests are supported.");
        if (0 != this.readyState)
            throw this.abort(),
            Error("Error reopening a connection");
        this.Mh = a;
        this.Yb = b;
        this.readyState = 1;
        mi(this)
    }
    ;
    li.prototype.send = function(a) {
        if (1 != this.readyState)
            throw this.abort(),
            Error("need to call open() first. ");
        this.Wa = !0;
        var b = {
            headers: this.og,
            method: this.Mh,
            credentials: this.Eb,
            cache: this.dc
        };
        a && (b.body = a);
        (this.Md || p).fetch(new Request(this.Yb,b)).then(this.lj.bind(this), this.ee.bind(this))
    }
    ;
    li.prototype.abort = function() {
        var a = this;
        this.response = this.responseText = "";
        this.og = new Headers;
        this.status = 0;
        this.Uc && this.Uc.cancel("Request was aborted.").catch(function() {
            var b = a.U;
            b && cg(b, Qf, "Fetch reader cancellation error.")
        });
        1 <= this.readyState && this.Wa && 4 != this.readyState && (this.Wa = !1,
        ni(this));
        this.readyState = 0
    }
    ;
    li.prototype.lj = function(a) {
        if (this.Wa && (this.Yd = a,
        this.Ic || (this.status = this.Yd.status,
        this.statusText = this.Yd.statusText,
        this.Ic = a.headers,
        this.readyState = 2,
        mi(this)),
        this.Wa && (this.readyState = 3,
        mi(this),
        this.Wa)))
            if ("arraybuffer" === this.responseType)
                a.arrayBuffer().then(this.jj.bind(this), this.ee.bind(this));
            else if ("undefined" !== typeof p.ReadableStream && "body"in a) {
                this.Uc = a.body.getReader();
                if (this.Ed) {
                    if (this.responseType)
                        throw Error('responseType must be empty for "streamBinaryChunks" mode responses.');
                    this.response = []
                } else
                    this.response = this.responseText = "",
                    this.Cg = new TextDecoder;
                oi(this)
            } else
                a.text().then(this.kj.bind(this), this.ee.bind(this))
    }
    ;
    var oi = function(a) {
        a.Uc.read().then(a.ej.bind(a)).catch(a.ee.bind(a))
    };
    li.prototype.ej = function(a) {
        if (this.Wa) {
            if (this.Ed && a.value)
                this.response.push(a.value);
            else if (!this.Ed) {
                var b = a.value ? a.value : new Uint8Array(0);
                if (b = this.Cg.decode(b, {
                    stream: !a.done
                }))
                    this.response = this.responseText += b
            }
            a.done ? ni(this) : mi(this);
            3 == this.readyState && oi(this)
        }
    }
    ;
    li.prototype.kj = function(a) {
        this.Wa && (this.response = this.responseText = a,
        ni(this))
    }
    ;
    li.prototype.jj = function(a) {
        this.Wa && (this.response = a,
        ni(this))
    }
    ;
    li.prototype.ee = function() {
        var a = this.U;
        a && cg(a, Qf, "Failed to fetch url " + this.Yb);
        this.Wa && ni(this)
    }
    ;
    var ni = function(a) {
        a.readyState = 4;
        a.Yd = null;
        a.Uc = null;
        a.Cg = null;
        mi(a)
    };
    k = li.prototype;
    k.setRequestHeader = function(a, b) {
        this.og.append(a, b)
    }
    ;
    k.getResponseHeader = function(a) {
        return this.Ic ? this.Ic.get(a.toLowerCase()) || "" : ((a = this.U) && cg(a, Qf, "Attempting to get response header but no headers have been received for url: " + this.Yb),
        "")
    }
    ;
    k.getAllResponseHeaders = function() {
        if (!this.Ic) {
            var a = this.U;
            a && cg(a, Qf, "Attempting to get all response headers but no headers have been received for url: " + this.Yb);
            return ""
        }
        a = [];
        for (var b = this.Ic.entries(), c = b.next(); !c.done; )
            c = c.value,
            a.push(c[0] + ": " + c[1]),
            c = b.next();
        return a.join("\r\n")
    }
    ;
    k.sg = function(a) {
        this.Eb = a
    }
    ;
    k.gi = function(a) {
        this.dc = a
    }
    ;
    var mi = function(a) {
        a.onreadystatechange && a.onreadystatechange.call(a)
    };
    Object.defineProperty(li.prototype, "withCredentials", {
        get: function() {
            return "include" === this.Eb
        },
        set: function(a) {
            this.sg(a ? "include" : "same-origin")
        }
    });
    function pi() {}
    ;/*

 Copyright 2005, 2007 Bob Ippolito. All Rights Reserved.
 Copyright The Closure Library Authors.
 SPDX-License-Identifier: MIT
*/
    var qi = function(a, b) {
        this.Me = [];
        this.Ph = a;
        this.bh = b || null;
        this.gd = this.pc = !1;
        this.na = void 0;
        this.yg = this.Mg = this.gf = !1;
        this.Ue = 0;
        this.P = null;
        this.hf = 0
    };
    u(qi, pi);
    qi.prototype.cancel = function(a) {
        if (this.pc)
            this.na instanceof qi && this.na.cancel();
        else {
            if (this.P) {
                var b = this.P;
                delete this.P;
                a ? b.cancel(a) : (b.hf--,
                0 >= b.hf && b.cancel())
            }
            this.Ph ? this.Ph.call(this.bh, this) : this.yg = !0;
            this.pc || ri(this, new si(this))
        }
    }
    ;
    qi.prototype.Vg = function(a, b) {
        this.gf = !1;
        ti(this, a, b)
    }
    ;
    var ti = function(a, b, c) {
        a.pc = !0;
        a.na = c;
        a.gd = !b;
        ui(a)
    }
      , wi = function(a) {
        if (a.pc) {
            if (!a.yg)
                throw new vi(a);
            a.yg = !1
        }
    };
    qi.prototype.callback = function(a) {
        wi(this);
        xi(a);
        ti(this, !0, a)
    }
    ;
    var ri = function(a, b) {
        wi(a);
        xi(b);
        ti(a, !1, b)
    }
      , xi = function(a) {
        v(!(a instanceof qi), "An execution sequence may not be initiated with a blocking Deferred.")
    };
    qi.prototype.addCallback = function(a, b) {
        return yi(this, a, null, b)
    }
    ;
    var zi = function(a, b) {
        yi(a, null, b)
    }
      , yi = function(a, b, c, d) {
        v(!a.Mg, "Blocking Deferreds can not be re-used");
        a.Me.push([b, c, d]);
        a.pc && ui(a);
        return a
    };
    qi.prototype.then = function(a, b, c) {
        var d, e, f = new F(function(g, h) {
            e = g;
            d = h
        }
        );
        yi(this, e, function(g) {
            g instanceof si ? f.cancel() : d(g);
            return Ai
        }, this);
        return f.then(a, b, c)
    }
    ;
    qi.prototype.$goog_Thenable = !0;
    var Bi = function(a) {
        return Oa(a.Me, function(b) {
            return "function" === typeof b[1]
        })
    }
      , Ai = {}
      , ui = function(a) {
        if (a.Ue && a.pc && Bi(a)) {
            var b = a.Ue
              , c = Ci[b];
            c && (p.clearTimeout(c.ua),
            delete Ci[b]);
            a.Ue = 0
        }
        a.P && (a.P.hf--,
        delete a.P);
        b = a.na;
        for (var d = c = !1; a.Me.length && !a.gf; ) {
            var e = a.Me.shift()
              , f = e[0]
              , g = e[1];
            e = e[2];
            if (f = a.gd ? g : f)
                try {
                    var h = f.call(e || a.bh, b);
                    h === Ai && (h = void 0);
                    void 0 !== h && (a.gd = a.gd && (h == b || h instanceof Error),
                    a.na = b = h);
                    if (oe(b) || "function" === typeof p.Promise && b instanceof p.Promise)
                        d = !0,
                        a.gf = !0
                } catch (l) {
                    b = l,
                    a.gd = !0,
                    Bi(a) || (c = !0)
                }
        }
        a.na = b;
        d && (h = t(a.Vg, a, !0),
        d = t(a.Vg, a, !1),
        b instanceof qi ? (yi(b, h, d),
        b.Mg = !0) : b.then(h, d));
        c && (b = new Di(b),
        Ci[b.ua] = b,
        a.Ue = b.ua)
    }
      , vi = function() {
        Aa.call(this)
    };
    u(vi, Aa);
    vi.prototype.message = "Deferred has already fired";
    vi.prototype.name = "AlreadyCalledError";
    var si = function() {
        Aa.call(this)
    };
    u(si, Aa);
    si.prototype.message = "Deferred was canceled";
    si.prototype.name = "CanceledError";
    var Di = function(a) {
        this.ua = p.setTimeout(t(this.rk, this), 0);
        this.Ga = a
    };
    Di.prototype.rk = function() {
        v(Ci[this.ua], "Cannot throw an error that is not scheduled.");
        delete Ci[this.ua];
        throw this.Ga;
    }
    ;
    var Ci = {};
    var Ii = function(a) {
        var b = {}
          , c = b.document || document
          , d = mb(a).toString()
          , e = (new Qc(c)).createElement("SCRIPT")
          , f = {
            bi: e,
            Hd: void 0
        }
          , g = new qi(Ei,f)
          , h = null
          , l = null != b.timeout ? b.timeout : 5E3;
        0 < l && (h = window.setTimeout(function() {
            Fi(e, !0);
            ri(g, new Gi(1,"Timeout reached for loading script " + d))
        }, l),
        f.Hd = h);
        e.onload = e.onreadystatechange = function() {
            e.readyState && "loaded" != e.readyState && "complete" != e.readyState || (Fi(e, b.Sk || !1, h),
            g.callback(null))
        }
        ;
        e.onerror = function() {
            Fi(e, !0, h);
            ri(g, new Gi(0,"Error while loading script " + d))
        }
        ;
        f = b.attributes || {};
        bb(f, {
            type: "text/javascript",
            charset: "UTF-8"
        });
        Yc(e, f);
        jc(e, a);
        Hi(c).appendChild(e);
        return g
    }
      , Hi = function(a) {
        var b;
        return (b = (a || document).getElementsByTagName("HEAD")) && 0 !== b.length ? b[0] : a.documentElement
    }
      , Ei = function() {
        if (this && this.bi) {
            var a = this.bi;
            a && "SCRIPT" == a.tagName && Fi(a, !0, this.Hd)
        }
    }
      , Fi = function(a, b, c) {
        null != c && p.clearTimeout(c);
        a.onload = function() {}
        ;
        a.onerror = function() {}
        ;
        a.onreadystatechange = function() {}
        ;
        b && window.setTimeout(function() {
            dd(a)
        }, 0)
    }
      , Gi = function(a, b) {
        var c = "Jsloader error (code #" + a + ")";
        b && (c += ": " + b);
        Aa.call(this, c);
        this.code = a
    };
    u(Gi, Aa);
    var Ji = function(a) {
        E.call(this);
        this.headers = new Map;
        this.Ze = a || null;
        this.mb = !1;
        this.Ye = this.j = null;
        this.ld = this.Jh = this.se = "";
        this.Lb = this.Gf = this.le = this.tf = !1;
        this.Xb = 0;
        this.Re = null;
        this.Ge = "";
        this.Ve = this.Uj = this.Bi = !1;
        this.Eg = null
    };
    u(Ji, E);
    Ji.prototype.U = ag(bg(), "goog.net.XhrIo").Qf;
    var Ki = /^https?$/i
      , Li = ["POST", "PUT"];
    Ji.prototype.setTrustToken = function(a) {
        this.Eg = a
    }
    ;
    Ji.prototype.send = function(a, b, c, d) {
        if (this.j)
            throw Error("[goog.net.XhrIo] Object is active with another request=" + this.se + "; newUri=" + a);
        b = b ? b.toUpperCase() : "GET";
        this.se = a;
        this.ld = "";
        this.Jh = b;
        this.tf = !1;
        this.mb = !0;
        this.j = this.Ze ? this.Ze.Tc() : ei.Tc();
        this.Ye = this.Ze ? di(this.Ze) : di(ei);
        this.j.onreadystatechange = t(this.Vh, this);
        this.Uj && "onprogress"in this.j && (this.j.onprogress = t(function(g) {
            this.Uh(g, !0)
        }, this),
        this.j.upload && (this.j.upload.onprogress = t(this.Uh, this)));
        try {
            eg(this.U, Mi(this, "Opening Xhr")),
            this.Gf = !0,
            this.j.open(b, String(a), !0),
            this.Gf = !1
        } catch (g) {
            eg(this.U, Mi(this, "Error opening Xhr: " + g.message));
            this.Ga(5, g);
            return
        }
        a = c || "";
        c = new Map(this.headers);
        if (d)
            if (Object.getPrototypeOf(d) === Object.prototype)
                for (var e in d)
                    c.set(e, d[e]);
            else if ("function" === typeof d.keys && "function" === typeof d.get) {
                e = ia(d.keys());
                for (var f = e.next(); !f.done; f = e.next())
                    f = f.value,
                    c.set(f, d.get(f))
            } else
                throw Error("Unknown input type for opt_headers: " + String(d));
        d = Array.from(c.keys()).find(function(g) {
            return "content-type" == g.toLowerCase()
        });
        e = p.FormData && a instanceof p.FormData;
        !Pa(Li, b) || d || e || c.set("Content-Type", "application/x-www-form-urlencoded;charset=utf-8");
        b = ia(c);
        for (d = b.next(); !d.done; d = b.next())
            c = ia(d.value),
            d = c.next().value,
            c = c.next().value,
            this.j.setRequestHeader(d, c);
        this.Ge && (this.j.responseType = this.Ge);
        "withCredentials"in this.j && this.j.withCredentials !== this.Bi && (this.j.withCredentials = this.Bi);
        if ("setTrustToken"in this.j && this.Eg)
            try {
                this.j.setTrustToken(this.Eg)
            } catch (g) {
                eg(this.U, Mi(this, "Error SetTrustToken: " + g.message))
            }
        try {
            Ni(this),
            0 < this.Xb && (this.Ve = Oi(this.j),
            eg(this.U, Mi(this, "Will abort after " + this.Xb + "ms if incomplete, xhr2 " + this.Ve)),
            this.Ve ? (this.j.timeout = this.Xb,
            this.j.ontimeout = t(this.Hd, this)) : this.Re = Ie(this.Hd, this.Xb, this)),
            eg(this.U, Mi(this, "Sending request")),
            this.le = !0,
            this.j.send(a),
            this.le = !1
        } catch (g) {
            eg(this.U, Mi(this, "Send error: " + g.message)),
            this.Ga(5, g)
        }
    }
    ;
    var Oi = function(a) {
        return z && "number" === typeof a.timeout && void 0 !== a.ontimeout
    };
    Ji.prototype.Hd = function() {
        "undefined" != typeof ta && this.j && (this.ld = "Timed out after " + this.Xb + "ms, aborting",
        eg(this.U, Mi(this, this.ld)),
        this.dispatchEvent("timeout"),
        this.abort(8))
    }
    ;
    Ji.prototype.Ga = function(a, b) {
        this.mb = !1;
        this.j && (this.Lb = !0,
        this.j.abort(),
        this.Lb = !1);
        this.ld = b;
        Pi(this);
        Qi(this)
    }
    ;
    var Pi = function(a) {
        a.tf || (a.tf = !0,
        a.dispatchEvent("complete"),
        a.dispatchEvent("error"))
    };
    Ji.prototype.abort = function() {
        this.j && this.mb && (eg(this.U, Mi(this, "Aborting")),
        this.mb = !1,
        this.Lb = !0,
        this.j.abort(),
        this.Lb = !1,
        this.dispatchEvent("complete"),
        this.dispatchEvent("abort"),
        Qi(this))
    }
    ;
    Ji.prototype.F = function() {
        this.j && (this.mb && (this.mb = !1,
        this.Lb = !0,
        this.j.abort(),
        this.Lb = !1),
        Qi(this, !0));
        Ji.X.F.call(this)
    }
    ;
    Ji.prototype.Vh = function() {
        this.isDisposed() || (this.Gf || this.le || this.Lb ? Ri(this) : this.Pj())
    }
    ;
    Ji.prototype.Pj = function() {
        Ri(this)
    }
    ;
    var Ri = function(a) {
        if (a.mb && "undefined" != typeof ta)
            if (a.Ye[1] && 4 == Si(a) && 2 == Ti(a))
                eg(a.U, Mi(a, "Local request error detected and ignored"));
            else if (a.le && 4 == Si(a))
                Ie(a.Vh, 0, a);
            else if (a.dispatchEvent("readystatechange"),
            4 == Si(a)) {
                eg(a.U, Mi(a, "Request complete"));
                a.mb = !1;
                try {
                    var b = Ti(a);
                    a: switch (b) {
                    case 200:
                    case 201:
                    case 202:
                    case 204:
                    case 206:
                    case 304:
                    case 1223:
                        var c = !0;
                        break a;
                    default:
                        c = !1
                    }
                    var d;
                    if (!(d = c)) {
                        var e;
                        if (e = 0 === b) {
                            var f = String(a.se).match(jf)[1] || null;
                            !f && p.self && p.self.location && (f = p.self.location.protocol.slice(0, -1));
                            e = !Ki.test(f ? f.toLowerCase() : "")
                        }
                        d = e
                    }
                    if (d)
                        a.dispatchEvent("complete"),
                        a.dispatchEvent("success");
                    else {
                        try {
                            var g = 2 < Si(a) ? a.j.statusText : ""
                        } catch (h) {
                            eg(a.U, "Can not get status: " + h.message),
                            g = ""
                        }
                        a.ld = g + " [" + Ti(a) + "]";
                        Pi(a)
                    }
                } finally {
                    Qi(a)
                }
            }
    };
    Ji.prototype.Uh = function(a, b) {
        v("progress" === a.type, "goog.net.EventType.PROGRESS is of the same type as raw XHR progress.");
        this.dispatchEvent(Ui(a, "progress"));
        this.dispatchEvent(Ui(a, b ? "downloadprogress" : "uploadprogress"))
    }
    ;
    var Ui = function(a, b) {
        return {
            type: b,
            lengthComputable: a.lengthComputable,
            loaded: a.loaded,
            total: a.total
        }
    }
      , Qi = function(a, b) {
        if (a.j) {
            Ni(a);
            var c = a.j
              , d = a.Ye[0] ? function() {}
            : null;
            a.j = null;
            a.Ye = null;
            b || a.dispatchEvent("ready");
            try {
                c.onreadystatechange = d
            } catch (e) {
                dg(a.U, "Problem encountered resetting onreadystatechange: " + e.message)
            }
        }
    }
      , Ni = function(a) {
        a.j && a.Ve && (a.j.ontimeout = null);
        a.Re && (p.clearTimeout(a.Re),
        a.Re = null)
    };
    Ji.prototype.isActive = function() {
        return !!this.j
    }
    ;
    var Si = function(a) {
        return a.j ? a.j.readyState : 0
    }
      , Ti = function(a) {
        try {
            return 2 < Si(a) ? a.j.status : -1
        } catch (b) {
            return -1
        }
    }
      , Vi = function(a) {
        try {
            return a.j ? a.j.responseText : ""
        } catch (b) {
            return eg(a.U, "Can not get responseText: " + b.message),
            ""
        }
    };
    Ji.prototype.getResponse = function() {
        try {
            if (!this.j)
                return null;
            if ("response"in this.j)
                return this.j.response;
            switch (this.Ge) {
            case "":
            case "text":
                return this.j.responseText;
            case "arraybuffer":
                if ("mozResponseArrayBuffer"in this.j)
                    return this.j.mozResponseArrayBuffer
            }
            dg(this.U, "Response type " + this.Ge + " is not supported on this browser");
            return null
        } catch (a) {
            return eg(this.U, "Can not get response: " + a.message),
            null
        }
    }
    ;
    Ji.prototype.getResponseHeader = function(a) {
        if (this.j && 4 == Si(this))
            return a = this.j.getResponseHeader(a),
            null === a ? void 0 : a
    }
    ;
    Ji.prototype.getAllResponseHeaders = function() {
        return this.j && 2 <= Si(this) ? this.j.getAllResponseHeaders() || "" : ""
    }
    ;
    var Mi = function(a, b) {
        return b + " [" + a.Jh + " " + a.se + " " + Ti(a) + "]"
    };
    var Wi = {
        Ck: {
            Zd: "https://staging-identitytoolkit.sandbox.googleapis.com/identitytoolkit/v3/relyingparty/",
            Ie: "https://staging-securetoken.sandbox.googleapis.com/v1/token",
            he: "https://staging-identitytoolkit.sandbox.googleapis.com/v2/",
            id: "b"
        },
        Jk: {
            Zd: "https://www.googleapis.com/identitytoolkit/v3/relyingparty/",
            Ie: "https://securetoken.googleapis.com/v1/token",
            he: "https://identitytoolkit.googleapis.com/v2/",
            id: "p"
        },
        Nk: {
            Zd: "https://staging-www.sandbox.googleapis.com/identitytoolkit/v3/relyingparty/",
            Ie: "https://staging-securetoken.sandbox.googleapis.com/v1/token",
            he: "https://staging-identitytoolkit.sandbox.googleapis.com/v2/",
            id: "s"
        },
        Ok: {
            Zd: "https://www-googleapis-test.sandbox.google.com/identitytoolkit/v3/relyingparty/",
            Ie: "https://test-securetoken.sandbox.googleapis.com/v1/token",
            he: "https://test-identitytoolkit.sandbox.googleapis.com/v2/",
            id: "t"
        }
    }, Xi = function(a) {
        for (var b in Wi)
            if (Wi[b].id === a)
                return a = Wi[b],
                {
                    firebaseEndpoint: a.Zd,
                    secureTokenEndpoint: a.Ie,
                    identityPlatformEndpoint: a.he
                };
        return null
    }, Yi;
    Yi = Xi("__EID__") ? "__EID__" : void 0;
    var $i = function() {
        var a = Zi();
        return z && !!Pc && 11 == Pc || /Edge\/\d+/.test(a)
    }
      , aj = function() {
        return p.window && p.window.location.href || self && self.location && self.location.href || ""
    }
      , bj = function(a, b) {
        b = b || p.window;
        var c = "about:blank";
        a && (c = Cb(Fb(a) || Jb));
        b.location.href = c
    }
      , cj = function(a, b) {
        var c = [], d;
        for (d in a)
            d in b ? typeof a[d] != typeof b[d] ? c.push(d) : "object" == typeof a[d] && null != a[d] && null != b[d] ? 0 < cj(a[d], b[d]).length && c.push(d) : a[d] !== b[d] && c.push(d) : c.push(d);
        for (var e in b)
            e in a || c.push(e);
        return c
    }
      , ej = function() {
        var a = Zi();
        a = "Chrome" != dj(a) ? null : (a = a.match(/\sChrome\/(\d+)/i)) && 2 == a.length ? parseInt(a[1], 10) : null;
        return a && 30 > a ? !1 : !z || !Pc || 9 < Pc
    }
      , fj = function(a) {
        a = (a || Zi()).toLowerCase();
        return a.match(/android/) || a.match(/webos/) || a.match(/iphone|ipad|ipod/) || a.match(/blackberry/) || a.match(/windows phone/) || a.match(/iemobile/) ? !0 : !1
    }
      , gj = function(a) {
        a = a || p.window;
        try {
            a.close()
        } catch (b) {}
    }
      , hj = function(a, b, c) {
        var d = Math.floor(1E9 * Math.random()).toString();
        b = b || 500;
        c = c || 600;
        var e = (window.screen.availHeight - c) / 2
          , f = (window.screen.availWidth - b) / 2;
        b = {
            width: b,
            height: c,
            top: 0 < e ? e : 0,
            left: 0 < f ? f : 0,
            location: !0,
            resizable: !0,
            statusbar: !0,
            toolbar: !1
        };
        c = Zi().toLowerCase();
        d && (b.target = d,
        x(c, "crios/") && (b.target = "_blank"));
        "Firefox" == dj(Zi()) && (a = a || "http://localhost",
        b.scrollbars = !0);
        e = a || "";
        b || (b = {});
        a = window;
        d = e instanceof Bb ? e : Fb("undefined" != typeof e.href ? e.href : String(e)) || Jb;
        f = void 0 !== self.crossOriginIsolated;
        c = "strict-origin-when-cross-origin";
        window.Request && (c = (new Request("/")).referrerPolicy);
        var g = "unsafe-url" === c;
        c = b.noreferrer;
        if (f && c) {
            if (g)
                throw Error("Cannot use the noreferrer option on a page that sets a referrer-policy of `unsafe-url` in modern browsers!");
            c = !1
        }
        e = b.target || e.target;
        f = [];
        for (h in b)
            switch (h) {
            case "width":
            case "height":
            case "top":
            case "left":
                f.push(h + "=" + b[h]);
                break;
            case "target":
            case "noopener":
            case "noreferrer":
                break;
            default:
                f.push(h + "=" + (b[h] ? 1 : 0))
            }
        var h = f.join(",");
        (y("iPhone") && !y("iPod") && !y("iPad") || y("iPad") || y("iPod")) && a.navigator && a.navigator.standalone && e && "_self" != e ? (h = ad(document, "A"),
        Ua(h, "A"),
        d = d instanceof Bb ? d : Ib(d),
        h.href = Cb(d),
        h.target = e,
        c && (h.rel = "noreferrer"),
        d = document.createEvent("MouseEvent"),
        d.initMouseEvent("click", !0, !0, a, 1),
        h.dispatchEvent(d),
        h = {}) : c ? (h = kc("", a, e, h),
        d = Cb(d),
        h && (Dc && x(d, ";") && (d = "'" + d.replace(/'/g, "%27") + "'"),
        h.opener = null,
        "" === d && (d = "javascript:''"),
        a = jb("b/12014412, meta tag with sanitized URL"),
        d = zb(d),
        a = gc(a, '<meta name="referrer" content="no-referrer"><meta http-equiv="refresh" content="0; url=' + d + '">'),
        (d = h.document) && d.write && (d.write(cc(a)),
        d.close()))) : ((h = kc(d, a, e, h)) && b.noopener && (h.opener = null),
        h && b.noreferrer && (h.opener = null));
        if (h)
            try {
                h.focus()
            } catch (l) {}
        return h
    }
      , ij = function(a) {
        return new F(function(b) {
            var c = function() {
                Je(2E3).then(function() {
                    if (!a || a.closed)
                        b();
                    else
                        return c()
                })
            };
            return c()
        }
        )
    }
      , kj = function(a, b) {
        var c = Hf(b);
        b = c.ha;
        c = c.ba;
        for (var d = 0; d < a.length; d++) {
            var e = a[d];
            0 == e.indexOf("chrome-extension://") ? e = Hf(e).ba == c && "chrome-extension" == b : "http" != b && "https" != b ? e = !1 : jj.test(e) ? e = c == e : (e = e.split(".").join("\\."),
            e = (new RegExp("^(.+\\." + e + "|" + e + ")$","i")).test(c));
            if (e)
                return !0
        }
        return !1
    }
      , jj = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/
      , lj = /^[^@]+@[^@]+$/
      , mj = function() {
        var a = null;
        return (new F(function(b) {
            "complete" == p.document.readyState ? b() : (a = function() {
                b()
            }
            ,
            Ad(window, "load", a))
        }
        )).h(function(b) {
            Hd(window, "load", a);
            throw b;
        })
    }
      , oj = function() {
        return nj() ? mj().then(function() {
            return new F(function(a, b) {
                var c = p.document
                  , d = setTimeout(function() {
                    b(Error("Cordova framework is not ready."))
                }, 1E3);
                c.addEventListener("deviceready", function() {
                    clearTimeout(d);
                    a()
                }, !1)
            }
            )
        }) : H(Error("Cordova must run in an Android or iOS file scheme."))
    }
      , nj = function() {
        var a = Zi();
        return !("file:" !== pj() && "ionic:" !== pj() || !a.toLowerCase().match(/iphone|ipad|ipod|android/))
    }
      , qj = function() {
        var a = p.window;
        try {
            return !(!a || a == a.top)
        } catch (b) {
            return !1
        }
    }
      , rj = function() {
        return "undefined" !== typeof p.WorkerGlobalScope && "function" === typeof p.importScripts
    }
      , sj = function() {
        return firebase.INTERNAL.hasOwnProperty("reactNative") ? "ReactNative" : firebase.INTERNAL.hasOwnProperty("node") ? "Node" : rj() ? "Worker" : "Browser"
    }
      , tj = function() {
        var a = sj();
        return "ReactNative" === a || "Node" === a
    }
      , uj = function() {
        for (var a = 50, b = []; 0 < a; )
            b.push("1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".charAt(Math.floor(62 * Math.random()))),
            a--;
        return b.join("")
    }
      , dj = function(a) {
        var b = a.toLowerCase();
        if (x(b, "opera/") || x(b, "opr/") || x(b, "opios/"))
            return "Opera";
        if (x(b, "iemobile"))
            return "IEMobile";
        if (x(b, "msie") || x(b, "trident/"))
            return "IE";
        if (x(b, "edge/"))
            return "Edge";
        if (x(b, "firefox/"))
            return "Firefox";
        if (x(b, "silk/"))
            return "Silk";
        if (x(b, "blackberry"))
            return "Blackberry";
        if (x(b, "webos"))
            return "Webos";
        if (!x(b, "safari/") || x(b, "chrome/") || x(b, "crios/") || x(b, "android"))
            if (!x(b, "chrome/") && !x(b, "crios/") || x(b, "edge/")) {
                if (x(b, "android"))
                    return "Android";
                if ((a = a.match(RegExp("([a-zA-Z\\d\\.]+)/[a-zA-Z\\d\\.]*$"))) && 2 == a.length)
                    return a[1]
            } else
                return "Chrome";
        else
            return "Safari";
        return "Other"
    }
      , vj = {
        Dk: "FirebaseCore-web",
        Fk: "FirebaseUI-web",
        Ik: "gcip-iap"
    }
      , wj = function(a, b) {
        b = b || [];
        var c = [], d = {}, e;
        for (e in vj)
            d[vj[e]] = !0;
        for (e = 0; e < b.length; e++)
            "undefined" !== typeof d[b[e]] && (delete d[b[e]],
            c.push(b[e]));
        c.sort();
        b = c;
        b.length || (b = ["FirebaseCore-web"]);
        c = sj();
        return ("Browser" === c ? dj(Zi()) : "Worker" === c ? dj(Zi()) + "-" + c : c) + "/JsCore/" + a + "/" + b.join(",")
    }
      , Zi = function() {
        return p.navigator && p.navigator.userAgent || ""
    }
      , O = function(a, b) {
        a = a.split(".");
        b = b || p;
        var c;
        for (c = 0; c < a.length && "object" == typeof b && null != b; c++)
            b = b[a[c]];
        c != a.length && (b = void 0);
        return b
    }
      , yj = function() {
        try {
            var a = p.localStorage
              , b = xj();
            if (a)
                return a.setItem(b, "1"),
                a.removeItem(b),
                $i() ? !!p.indexedDB : !0
        } catch (c) {
            return rj() && !!p.indexedDB
        }
        return !1
    }
      , Aj = function() {
        return (zj() || "chrome-extension:" === pj() || nj()) && !tj() && yj() && !rj()
    }
      , zj = function() {
        return "http:" === pj() || "https:" === pj()
    }
      , pj = function() {
        return p.location && p.location.protocol || null
    }
      , Bj = function(a) {
        a = a || Zi();
        return fj(a) || "Firefox" == dj(a) ? !1 : !0
    }
      , Cj = function(a) {
        return "undefined" === typeof a ? null : JSON.stringify(a)
    }
      , Dj = function(a) {
        var b = {}, c;
        for (c in a)
            a.hasOwnProperty(c) && null !== a[c] && void 0 !== a[c] && (b[c] = a[c]);
        return b
    }
      , Ej = function(a) {
        if (null !== a)
            return JSON.parse(a)
    }
      , xj = function(a) {
        return a ? a : "" + Math.floor(1E9 * Math.random()).toString()
    }
      , Fj = function(a) {
        a = a || Zi();
        return "Safari" == dj(a) || a.toLowerCase().match(/iphone|ipad|ipod/) ? !1 : !0
    }
      , Gj = function() {
        var a = p.___jsl;
        if (a && a.H)
            for (var b in a.H)
                if (a.H[b].r = a.H[b].r || [],
                a.H[b].L = a.H[b].L || [],
                a.H[b].r = a.H[b].L.concat(),
                a.CP)
                    for (var c = 0; c < a.CP.length; c++)
                        a.CP[c] = null
    }
      , Hj = function(a, b) {
        if (a > b)
            throw Error("Short delay should be less than long delay!");
        this.ji = a;
        this.Jj = b;
        a = Zi();
        b = sj();
        this.Aj = fj(a) || "ReactNative" === b
    };
    Hj.prototype.get = function() {
        var a = p.navigator;
        return (a && "boolean" === typeof a.onLine && (zj() || "chrome-extension:" === pj() || "undefined" !== typeof a.connection) ? a.onLine : 1) ? this.Aj ? this.Jj : this.ji : Math.min(5E3, this.ji)
    }
    ;
    var Ij = function() {
        var a = p.document;
        return a && "undefined" !== typeof a.visibilityState ? "visible" == a.visibilityState : !0
    }
      , Jj = function() {
        var a = p.document
          , b = null;
        return Ij() || !a ? G() : (new F(function(c) {
            b = function() {
                Ij() && (a.removeEventListener("visibilitychange", b, !1),
                c())
            }
            ;
            a.addEventListener("visibilitychange", b, !1)
        }
        )).h(function(c) {
            a.removeEventListener("visibilitychange", b, !1);
            throw c;
        })
    }
      , Kj = function(a) {
        try {
            var b = new Date(parseInt(a, 10));
            if (!isNaN(b.getTime()) && !/[^0-9]/.test(a))
                return b.toUTCString()
        } catch (c) {}
        return null
    }
      , Lj = function() {
        return !(!O("fireauth.oauthhelper", p) && !O("fireauth.iframe", p))
    }
      , Mj = function() {
        var a = p.navigator;
        return a && a.serviceWorker && a.serviceWorker.controller || null
    }
      , Nj = function() {
        var a = p.navigator;
        return a && a.serviceWorker ? G().then(function() {
            return a.serviceWorker.ready
        }).then(function(b) {
            return b.active || null
        }).h(function() {
            return null
        }) : G(null)
    };
    var Oj = {}
      , Pj = function(a) {
        Oj[a] || (Oj[a] = !0,
        "undefined" !== typeof console && "function" === typeof console.warn && console.warn(a))
    };
    var Qj;
    try {
        var Rj = {};
        Object.defineProperty(Rj, "abcd", {
            configurable: !0,
            enumerable: !0,
            value: 1
        });
        Object.defineProperty(Rj, "abcd", {
            configurable: !0,
            enumerable: !0,
            value: 2
        });
        Qj = 2 == Rj.abcd
    } catch (a) {
        Qj = !1
    }
    var P = function(a, b, c) {
        Qj ? Object.defineProperty(a, b, {
            configurable: !0,
            enumerable: !0,
            value: c
        }) : a[b] = c
    }
      , Sj = function(a, b) {
        if (b)
            for (var c in b)
                b.hasOwnProperty(c) && P(a, c, b[c])
    }
      , Tj = function(a) {
        var b = {};
        Sj(b, a);
        return b
    }
      , Uj = function(a, b) {
        if (!b || !b.length)
            return !0;
        if (!a)
            return !1;
        for (var c = 0; c < b.length; c++) {
            var d = a[b[c]];
            if (void 0 === d || null === d || "" === d)
                return !1
        }
        return !0
    }
      , Vj = function(a) {
        var b = a;
        if ("object" == typeof a && null != a) {
            b = "length"in a ? [] : {};
            for (var c in a)
                P(b, c, Vj(a[c]))
        }
        return b
    };
    var Wj = "oauth_consumer_key oauth_nonce oauth_signature oauth_signature_method oauth_timestamp oauth_token oauth_version".split(" ")
      , Xj = ["client_id", "response_type", "scope", "redirect_uri", "state"]
      , Yj = {
        Ek: {
            kd: "locale",
            Dc: 700,
            Cc: 600,
            providerId: "facebook.com",
            De: Xj
        },
        Gk: {
            kd: null,
            Dc: 500,
            Cc: 750,
            providerId: "github.com",
            De: Xj
        },
        Hk: {
            kd: "hl",
            Dc: 515,
            Cc: 680,
            providerId: "google.com",
            De: Xj
        },
        Pk: {
            kd: "lang",
            Dc: 485,
            Cc: 705,
            providerId: "twitter.com",
            De: Wj
        },
        Bk: {
            kd: "locale",
            Dc: 640,
            Cc: 600,
            providerId: "apple.com",
            De: []
        }
    }
      , Zj = function(a) {
        for (var b in Yj)
            if (Yj[b].providerId == a)
                return Yj[b];
        return null
    };
    var Q = function(a, b, c) {
        this.code = "auth/" + a;
        this.message = b || ak[a] || "";
        this.di = c || null
    };
    u(Q, Error);
    Q.prototype.A = function() {
        var a = {
            code: this.code,
            message: this.message
        };
        this.di && (a.serverResponse = this.di);
        return a
    }
    ;
    Q.prototype.toJSON = function() {
        return this.A()
    }
    ;
    var bk = function(a) {
        var b = a && a.code;
        return b ? new Q(b.substring(5),a.message,a.serverResponse) : null
    }
      , ak = {
        "api-key-service-blocked": "The request is denied because it violates [API key HTTP restrictions](https://cloud.google.com/docs/authentication/api-keys#adding_http_restrictions).",
        "admin-restricted-operation": "This operation is restricted to administrators only.",
        "argument-error": "",
        "app-not-authorized": "This app, identified by the domain where it's hosted, is not authorized to use Firebase Authentication with the provided API key. Review your key configuration in the Google API console.",
        "app-not-installed": "The requested mobile application corresponding to the identifier (Android package name or iOS bundle ID) provided is not installed on this device.",
        "bad-request": "The requested action is invalid.",
        "captcha-check-failed": "The reCAPTCHA response token provided is either invalid, expired, already used or the domain associated with it does not match the list of whitelisted domains.",
        "code-expired": "The SMS code has expired. Please re-send the verification code to try again.",
        "cordova-not-ready": "Cordova framework is not ready.",
        "cors-unsupported": "This browser is not supported.",
        "credential-already-in-use": "This credential is already associated with a different user account.",
        "custom-token-mismatch": "The custom token corresponds to a different audience.",
        "requires-recent-login": "This operation is sensitive and requires recent authentication. Log in again before retrying this request.",
        "dynamic-link-not-activated": "Please activate Dynamic Links in the Firebase Console and agree to the terms and conditions.",
        "email-change-needs-verification": "Multi-factor users must always have a verified email.",
        "email-already-in-use": "The email address is already in use by another account.",
        "expired-action-code": "The action code has expired. ",
        "cancelled-popup-request": "This operation has been cancelled due to another conflicting popup being opened.",
        "internal-error": "An internal error has occurred.",
        "invalid-app-credential": "The phone verification request contains an invalid application verifier. The reCAPTCHA token response is either invalid or expired.",
        "invalid-app-id": "The mobile app identifier is not registed for the current project.",
        "invalid-user-token": "This user's credential isn't valid for this project. This can happen if the user's token has been tampered with, or if the user isn't for the project associated with this API key.",
        "invalid-auth-event": "An internal error has occurred.",
        "invalid-verification-code": "The SMS verification code used to create the phone auth credential is invalid. Please resend the verification code sms and be sure to use the verification code provided by the user.",
        "invalid-continue-uri": "The continue URL provided in the request is invalid.",
        "invalid-cordova-configuration": "The following Cordova plugins must be installed to enable OAuth sign-in: cordova-plugin-buildinfo, cordova-universal-links-plugin, cordova-plugin-browsertab, cordova-plugin-inappbrowser and cordova-plugin-customurlscheme.",
        "invalid-custom-token": "The custom token format is incorrect. Please check the documentation.",
        "invalid-dynamic-link-domain": "The provided dynamic link domain is not configured or authorized for the current project.",
        "invalid-email": "The email address is badly formatted.",
        "invalid-api-key": "Your API key is invalid, please check you have copied it correctly.",
        "invalid-cert-hash": "The SHA-1 certificate hash provided is invalid.",
        "invalid-credential": "The supplied auth credential is malformed or has expired.",
        "invalid-message-payload": "The email template corresponding to this action contains invalid characters in its message. Please fix by going to the Auth email templates section in the Firebase Console.",
        "invalid-multi-factor-session": "The request does not contain a valid proof of first factor successful sign-in.",
        "invalid-oauth-provider": "EmailAuthProvider is not supported for this operation. This operation only supports OAuth providers.",
        "invalid-oauth-client-id": "The OAuth client ID provided is either invalid or does not match the specified API key.",
        "unauthorized-domain": "This domain is not authorized for OAuth operations for your Firebase project. Edit the list of authorized domains from the Firebase console.",
        "invalid-action-code": "The action code is invalid. This can happen if the code is malformed, expired, or has already been used.",
        "wrong-password": "The password is invalid or the user does not have a password.",
        "invalid-persistence-type": "The specified persistence type is invalid. It can only be local, session or none.",
        "invalid-phone-number": "The format of the phone number provided is incorrect. Please enter the phone number in a format that can be parsed into E.164 format. E.164 phone numbers are written in the format [+][country code][subscriber number including area code].",
        "invalid-provider-id": "The specified provider ID is invalid.",
        "invalid-recipient-email": "The email corresponding to this action failed to send as the provided recipient email address is invalid.",
        "invalid-sender": "The email template corresponding to this action contains an invalid sender email or name. Please fix by going to the Auth email templates section in the Firebase Console.",
        "invalid-verification-id": "The verification ID used to create the phone auth credential is invalid.",
        "invalid-tenant-id": "The Auth instance's tenant ID is invalid.",
        "multi-factor-info-not-found": "The user does not have a second factor matching the identifier provided.",
        "multi-factor-auth-required": "Proof of ownership of a second factor is required to complete sign-in.",
        "missing-android-pkg-name": "An Android Package Name must be provided if the Android App is required to be installed.",
        "auth-domain-config-required": "Be sure to include authDomain when calling firebase.initializeApp(), by following the instructions in the Firebase console.",
        "missing-app-credential": "The phone verification request is missing an application verifier assertion. A reCAPTCHA response token needs to be provided.",
        "missing-verification-code": "The phone auth credential was created with an empty SMS verification code.",
        "missing-continue-uri": "A continue URL must be provided in the request.",
        "missing-iframe-start": "An internal error has occurred.",
        "missing-ios-bundle-id": "An iOS Bundle ID must be provided if an App Store ID is provided.",
        "missing-multi-factor-info": "No second factor identifier is provided.",
        "missing-multi-factor-session": "The request is missing proof of first factor successful sign-in.",
        "missing-or-invalid-nonce": "The request does not contain a valid nonce. This can occur if the SHA-256 hash of the provided raw nonce does not match the hashed nonce in the ID token payload.",
        "missing-phone-number": "To send verification codes, provide a phone number for the recipient.",
        "missing-verification-id": "The phone auth credential was created with an empty verification ID.",
        "app-deleted": "This instance of FirebaseApp has been deleted.",
        "account-exists-with-different-credential": "An account already exists with the same email address but different sign-in credentials. Sign in using a provider associated with this email address.",
        "network-request-failed": "A network error (such as timeout, interrupted connection or unreachable host) has occurred.",
        "no-auth-event": "An internal error has occurred.",
        "no-such-provider": "User was not linked to an account with the given provider.",
        "null-user": "A null user object was provided as the argument for an operation which requires a non-null user object.",
        "operation-not-allowed": "The given sign-in provider is disabled for this Firebase project. Enable it in the Firebase console, under the sign-in method tab of the Auth section.",
        "operation-not-supported-in-this-environment": 'This operation is not supported in the environment this application is running on. "location.protocol" must be http, https or chrome-extension and web storage must be enabled.',
        "password-does-not-meet-requirements": "The provided password does not meet the configured requirements.",
        "popup-blocked": "Unable to establish a connection with the popup. It may have been blocked by the browser.",
        "popup-closed-by-user": "The popup has been closed by the user before finalizing the operation.",
        "provider-already-linked": "User can only be linked to one identity for the given provider.",
        "quota-exceeded": "The project's quota for this operation has been exceeded.",
        "redirect-cancelled-by-user": "The redirect operation has been cancelled by the user before finalizing.",
        "redirect-operation-pending": "A redirect sign-in operation is already pending.",
        "rejected-credential": "The request contains malformed or mismatching credentials.",
        "second-factor-already-in-use": "The second factor is already enrolled on this account.",
        "maximum-second-factor-count-exceeded": "The maximum allowed number of second factors on a user has been exceeded.",
        "tenant-id-mismatch": "The provided tenant ID does not match the Auth instance's tenant ID",
        timeout: "The operation has timed out.",
        "user-token-expired": "The user's credential is no longer valid. The user must sign in again.",
        "too-many-requests": "We have blocked all requests from this device due to unusual activity. Try again later.",
        "unauthorized-continue-uri": "The domain of the continue URL is not whitelisted.  Please whitelist the domain in the Firebase console.",
        "unsupported-first-factor": "Enrolling a second factor or signing in with a multi-factor account requires sign-in with a supported first factor.",
        "unsupported-persistence-type": "The current environment does not support the specified persistence type.",
        "unsupported-tenant-operation": "This operation is not supported in a multi-tenant context.",
        "unverified-email": "The operation requires a verified email.",
        "user-cancelled": "The user did not grant your application the permissions it requested.",
        "user-not-found": "There is no user record corresponding to this identifier. The user may have been deleted.",
        "user-disabled": "The user account has been disabled by an administrator.",
        "user-mismatch": "The supplied credentials do not correspond to the previously signed in user.",
        "user-signed-out": "",
        "weak-password": "The password must be 6 characters long or more.",
        "web-storage-unsupported": "This browser is not supported or 3rd party cookies and data may be disabled."
    };
    var ck = function(a, b, c, d, e, f, g) {
        this.Fg = a;
        this.ca = b || null;
        this.Lc = c || null;
        this.Bd = d || null;
        this.cg = f || null;
        this.R = g || null;
        this.Ga = e || null;
        if (this.Lc || this.Ga) {
            if (this.Lc && this.Ga)
                throw new Q("invalid-auth-event");
            if (this.Lc && !this.Bd)
                throw new Q("invalid-auth-event");
        } else
            throw new Q("invalid-auth-event");
    };
    k = ck.prototype;
    k.getType = function() {
        return this.Fg
    }
    ;
    k.getUid = function() {
        var a = [];
        a.push(this.Fg);
        this.ca && a.push(this.ca);
        this.Bd && a.push(this.Bd);
        this.R && a.push(this.R);
        return a.join("-")
    }
    ;
    k.ed = function() {
        return this.Bd
    }
    ;
    k.Aa = function() {
        return this.R
    }
    ;
    k.getError = function() {
        return this.Ga
    }
    ;
    k.A = function() {
        return {
            type: this.Fg,
            eventId: this.ca,
            urlResponse: this.Lc,
            sessionId: this.Bd,
            postBody: this.cg,
            tenantId: this.R,
            error: this.Ga && this.Ga.A()
        }
    }
    ;
    var dk = function(a) {
        a = a || {};
        return a.type ? new ck(a.type,a.eventId,a.urlResponse,a.sessionId,a.error && bk(a.error),a.postBody,a.tenantId) : null
    };
    var ek = function(a) {
        var b = a && (a.phoneInfo ? "phone" : null);
        if (b && a && a.mfaEnrollmentId) {
            P(this, "uid", a.mfaEnrollmentId);
            P(this, "displayName", a.displayName || null);
            var c = null;
            a.enrolledAt && (c = (new Date(a.enrolledAt)).toUTCString());
            P(this, "enrollmentTime", c);
            P(this, "factorId", b)
        } else
            throw new Q("internal-error","Internal assert: invalid MultiFactorInfo object");
    };
    ek.prototype.A = function() {
        return {
            uid: this.uid,
            displayName: this.displayName,
            factorId: this.factorId,
            enrollmentTime: this.enrollmentTime
        }
    }
    ;
    var gk = function(a) {
        try {
            var b = new fk(a)
        } catch (c) {
            b = null
        }
        return b
    }
      , fk = function(a) {
        ek.call(this, a);
        P(this, "phoneNumber", a.phoneInfo)
    };
    u(fk, ek);
    fk.prototype.A = function() {
        var a = fk.X.A.call(this);
        a.phoneNumber = this.phoneNumber;
        return a
    }
    ;
    var hk = function(a) {
        var b = {}
          , c = a.email
          , d = a.newEmail
          , e = a.requestType;
        a = gk(a.mfaInfo);
        if (!e || "EMAIL_SIGNIN" != e && "VERIFY_AND_CHANGE_EMAIL" != e && !c || "VERIFY_AND_CHANGE_EMAIL" == e && !d || "REVERT_SECOND_FACTOR_ADDITION" == e && !a)
            throw Error("Invalid checkActionCode response!");
        "VERIFY_AND_CHANGE_EMAIL" == e ? (b.fromEmail = c || null,
        b.previousEmail = c || null,
        b.email = d) : (b.fromEmail = d || null,
        b.previousEmail = d || null,
        b.email = c || null);
        b.multiFactorInfo = a || null;
        P(this, "operation", e);
        P(this, "data", Vj(b))
    };
    var jk = function(a) {
        a = Hf(a);
        var b = Gf(a, "apiKey") || null
          , c = Gf(a, "oobCode") || null
          , d = Gf(a, "mode") || null;
        d = d ? ik[d] || null : null;
        if (!b || !c || !d)
            throw new Q("argument-error","apiKey, oobCodeand mode are required in a valid action code URL.");
        Sj(this, {
            apiKey: b,
            operation: d,
            code: c,
            continueUrl: Gf(a, "continueUrl") || null,
            languageCode: Gf(a, "languageCode") || null,
            tenantId: Gf(a, "tenantId") || null
        })
    }
      , kk = function(a) {
        try {
            return new jk(a)
        } catch (b) {
            return null
        }
    }
      , ik = {
        recoverEmail: "RECOVER_EMAIL",
        resetPassword: "PASSWORD_RESET",
        revertSecondFactorAddition: "REVERT_SECOND_FACTOR_ADDITION",
        signIn: "EMAIL_SIGNIN",
        verifyAndChangeEmail: "VERIFY_AND_CHANGE_EMAIL",
        verifyEmail: "VERIFY_EMAIL"
    };
    var lk = function(a) {
        var b = Hf(a)
          , c = Gf(b, "link")
          , d = Gf(Hf(c), "link");
        b = Gf(b, "deep_link_id");
        return Gf(Hf(b), "link") || b || d || c || a
    };
    var mk = function(a) {
        var b = "unauthorized-domain"
          , c = void 0
          , d = Hf(a);
        a = d.ba;
        d = d.ha;
        "chrome-extension" == d ? c = mc("This chrome extension ID (chrome-extension://%s) is not authorized to run this operation. Add it to the OAuth redirect domains list in the Firebase console -> Auth section -> Sign in method tab.", a) : "http" == d || "https" == d ? c = mc("This domain (%s) is not authorized to run this operation. Add it to the OAuth redirect domains list in the Firebase console -> Auth section -> Sign in method tab.", a) : b = "operation-not-supported-in-this-environment";
        Q.call(this, b, c)
    };
    m(mk, Q);
    var ok = function(a) {
        var b = nk(a);
        if (!(b && b.sub && b.iss && b.aud && b.exp))
            throw Error("Invalid JWT");
        this.Dj = a;
        this.wf = b.exp;
        this.Hj = b.sub;
        a = Date.now() / 1E3;
        this.rj = b.iat || (a > this.wf ? this.wf : a);
        this.Fb = b.email || null;
        this.kg = b.provider_id || b.firebase && b.firebase.sign_in_provider || null;
        this.R = b.firebase && b.firebase.tenant || null;
        this.Gi = !!b.is_anonymous || "anonymous" == this.kg
    };
    ok.prototype.getEmail = function() {
        return this.Fb
    }
    ;
    ok.prototype.Aa = function() {
        return this.R
    }
    ;
    ok.prototype.isAnonymous = function() {
        return this.Gi
    }
    ;
    ok.prototype.toString = function() {
        return this.Dj
    }
    ;
    var pk = function(a) {
        try {
            return new ok(a)
        } catch (b) {
            return null
        }
    }
      , nk = function(a) {
        if (!a)
            return null;
        a = a.split(".");
        if (3 != a.length)
            return null;
        a = a[1];
        for (var b = (4 - a.length % 4) % 4, c = 0; c < b; c++)
            a += ".";
        try {
            var d = Rh(a);
            a = [];
            for (c = b = 0; b < d.length; ) {
                var e = d[b++];
                if (128 > e)
                    a[c++] = String.fromCharCode(e);
                else if (191 < e && 224 > e) {
                    var f = d[b++];
                    a[c++] = String.fromCharCode((e & 31) << 6 | f & 63)
                } else if (239 < e && 365 > e) {
                    f = d[b++];
                    var g = d[b++]
                      , h = d[b++]
                      , l = ((e & 7) << 18 | (f & 63) << 12 | (g & 63) << 6 | h & 63) - 65536;
                    a[c++] = String.fromCharCode(55296 + (l >> 10));
                    a[c++] = String.fromCharCode(56320 + (l & 1023))
                } else
                    f = d[b++],
                    g = d[b++],
                    a[c++] = String.fromCharCode((e & 15) << 12 | (f & 63) << 6 | g & 63)
            }
            return JSON.parse(a.join(""))
        } catch (n) {}
        return null
    };
    var qk = function(a) {
        var b = nk(a);
        if (!(b && b.exp && b.auth_time && b.iat))
            throw new Q("internal-error","An internal error occurred. The token obtained by Firebase appears to be malformed. Please retry the operation.");
        Sj(this, {
            token: a,
            expirationTime: Kj(1E3 * b.exp),
            authTime: Kj(1E3 * b.auth_time),
            issuedAtTime: Kj(1E3 * b.iat),
            signInProvider: b.firebase && b.firebase.sign_in_provider ? b.firebase.sign_in_provider : null,
            signInSecondFactor: b.firebase && b.firebase.sign_in_second_factor ? b.firebase.sign_in_second_factor : null,
            claims: b
        })
    };
    var rk = function(a, b) {
        if (!a && !b)
            throw new Q("internal-error","Internal assert: no raw session string available");
        if (a && b)
            throw new Q("internal-error","Internal assert: unable to determine the session type");
        this.ge = a || null;
        this.Nh = b || null;
        this.type = this.ge ? "enroll" : "signin"
    };
    rk.prototype.dd = function() {
        return this.ge ? G(this.ge) : G(this.Nh)
    }
    ;
    rk.prototype.A = function() {
        return "enroll" == this.type ? {
            multiFactorSession: {
                idToken: this.ge
            }
        } : {
            multiFactorSession: {
                pendingCredential: this.Nh
            }
        }
    }
    ;
    var sk = function() {};
    sk.prototype.Kb = function() {}
    ;
    sk.prototype.xc = function() {}
    ;
    sk.prototype.md = function() {}
    ;
    sk.prototype.A = function() {}
    ;
    var tk = function(a, b) {
        return a.then(function(c) {
            if (c.idToken) {
                var d = pk(c.idToken);
                if (!d || b != d.Hj)
                    throw new Q("user-mismatch");
                return c
            }
            throw new Q("user-mismatch");
        }).h(function(c) {
            throw c && c.code && "auth/user-not-found" == c.code ? new Q("user-mismatch") : c;
        })
    }
      , uk = function(a, b) {
        if (b)
            this.hb = b;
        else
            throw new Q("internal-error","failed to construct a credential");
        P(this, "providerId", a);
        P(this, "signInMethod", a)
    };
    k = uk.prototype;
    k.Kb = function(a) {
        return vk(a, this.Pb())
    }
    ;
    k.xc = function(a, b) {
        var c = this.Pb();
        c.idToken = b;
        return wk(a, c)
    }
    ;
    k.md = function(a, b) {
        var c = this.Pb();
        return tk(xk(a, c), b)
    }
    ;
    k.Pb = function() {
        return {
            pendingToken: this.hb,
            requestUri: "http://localhost"
        }
    }
    ;
    k.A = function() {
        return {
            providerId: this.providerId,
            signInMethod: this.signInMethod,
            pendingToken: this.hb
        }
    }
    ;
    var yk = function(a) {
        if (a && a.providerId && a.signInMethod && 0 == a.providerId.indexOf("saml.") && a.pendingToken)
            try {
                return new uk(a.providerId,a.pendingToken)
            } catch (b) {}
        return null
    }
      , zk = function(a, b, c) {
        this.hb = null;
        if (b.idToken || b.accessToken)
            b.idToken && P(this, "idToken", b.idToken),
            b.accessToken && P(this, "accessToken", b.accessToken),
            b.nonce && !b.pendingToken && P(this, "nonce", b.nonce),
            b.pendingToken && (this.hb = b.pendingToken);
        else if (b.oauthToken && b.oauthTokenSecret)
            P(this, "accessToken", b.oauthToken),
            P(this, "secret", b.oauthTokenSecret);
        else
            throw new Q("internal-error","failed to construct a credential");
        P(this, "providerId", a);
        P(this, "signInMethod", c)
    };
    k = zk.prototype;
    k.Kb = function(a) {
        return vk(a, this.Pb())
    }
    ;
    k.xc = function(a, b) {
        var c = this.Pb();
        c.idToken = b;
        return wk(a, c)
    }
    ;
    k.md = function(a, b) {
        var c = this.Pb();
        return tk(xk(a, c), b)
    }
    ;
    k.Pb = function() {
        var a = {};
        this.idToken && (a.id_token = this.idToken);
        this.accessToken && (a.access_token = this.accessToken);
        this.secret && (a.oauth_token_secret = this.secret);
        a.providerId = this.providerId;
        this.nonce && !this.hb && (a.nonce = this.nonce);
        a = {
            postBody: Mf(a).toString(),
            requestUri: "http://localhost"
        };
        this.hb && (delete a.postBody,
        a.pendingToken = this.hb);
        return a
    }
    ;
    k.A = function() {
        var a = {
            providerId: this.providerId,
            signInMethod: this.signInMethod
        };
        this.idToken && (a.oauthIdToken = this.idToken);
        this.accessToken && (a.oauthAccessToken = this.accessToken);
        this.secret && (a.oauthTokenSecret = this.secret);
        this.nonce && (a.nonce = this.nonce);
        this.hb && (a.pendingToken = this.hb);
        return a
    }
    ;
    var Ak = function(a) {
        if (a && a.providerId && a.signInMethod) {
            var b = {
                idToken: a.oauthIdToken,
                accessToken: a.oauthTokenSecret ? null : a.oauthAccessToken,
                oauthTokenSecret: a.oauthTokenSecret,
                oauthToken: a.oauthTokenSecret && a.oauthAccessToken,
                nonce: a.nonce,
                pendingToken: a.pendingToken
            };
            try {
                return new zk(a.providerId,b,a.signInMethod)
            } catch (c) {}
        }
        return null
    }
      , Bk = function(a, b) {
        this.Yj = b || [];
        Sj(this, {
            providerId: a,
            isOAuthProvider: !0
        });
        this.Zg = {};
        this.Of = (Zj(a) || {}).kd || null;
        this.qf = null
    };
    Bk.prototype.setCustomParameters = function(a) {
        this.Zg = $a(a);
        return this
    }
    ;
    var Ck = function(a) {
        if ("string" !== typeof a || 0 != a.indexOf("saml."))
            throw new Q("argument-error",'SAML provider IDs must be prefixed with "saml."');
        Bk.call(this, a, [])
    };
    u(Ck, Bk);
    var Dk = function(a) {
        Bk.call(this, a, Xj);
        this.pg = []
    };
    u(Dk, Bk);
    Dk.prototype.addScope = function(a) {
        Pa(this.pg, a) || this.pg.push(a);
        return this
    }
    ;
    Dk.prototype.ph = function() {
        return Ta(this.pg)
    }
    ;
    Dk.prototype.credential = function(a, b) {
        a = r(a) ? {
            idToken: a.idToken || null,
            accessToken: a.accessToken || null,
            nonce: a.rawNonce || null
        } : {
            idToken: a || null,
            accessToken: b || null
        };
        if (!a.idToken && !a.accessToken)
            throw new Q("argument-error","credential failed: must provide the ID token and/or the access token.");
        return new zk(this.providerId,a,this.providerId)
    }
    ;
    var Ek = function() {
        Dk.call(this, "facebook.com")
    };
    u(Ek, Dk);
    P(Ek, "PROVIDER_ID", "facebook.com");
    P(Ek, "FACEBOOK_SIGN_IN_METHOD", "facebook.com");
    var Fk = function(a) {
        if (!a)
            throw new Q("argument-error","credential failed: expected 1 argument (the OAuth access token).");
        var b = a;
        r(a) && (b = a.accessToken);
        return (new Ek).credential({
            accessToken: b
        })
    }
      , Gk = function() {
        Dk.call(this, "github.com")
    };
    u(Gk, Dk);
    P(Gk, "PROVIDER_ID", "github.com");
    P(Gk, "GITHUB_SIGN_IN_METHOD", "github.com");
    var Hk = function(a) {
        if (!a)
            throw new Q("argument-error","credential failed: expected 1 argument (the OAuth access token).");
        var b = a;
        r(a) && (b = a.accessToken);
        return (new Gk).credential({
            accessToken: b
        })
    }
      , Ik = function() {
        Dk.call(this, "google.com");
        this.addScope("profile")
    };
    u(Ik, Dk);
    P(Ik, "PROVIDER_ID", "google.com");
    P(Ik, "GOOGLE_SIGN_IN_METHOD", "google.com");
    var Jk = function(a, b) {
        var c = a;
        r(a) && (c = a.idToken,
        b = a.accessToken);
        return (new Ik).credential({
            idToken: c,
            accessToken: b
        })
    }
      , Kk = function() {
        Bk.call(this, "twitter.com", Wj)
    };
    u(Kk, Bk);
    P(Kk, "PROVIDER_ID", "twitter.com");
    P(Kk, "TWITTER_SIGN_IN_METHOD", "twitter.com");
    var Lk = function(a, b) {
        var c = a;
        r(c) || (c = {
            oauthToken: a,
            oauthTokenSecret: b
        });
        if (!c.oauthToken || !c.oauthTokenSecret)
            throw new Q("argument-error","credential failed: expected 2 arguments (the OAuth access token and secret).");
        return new zk("twitter.com",c,"twitter.com")
    }
      , Nk = function(a, b, c) {
        this.Fb = a;
        this.od = b;
        P(this, "providerId", "password");
        P(this, "signInMethod", c === Mk.EMAIL_LINK_SIGN_IN_METHOD ? Mk.EMAIL_LINK_SIGN_IN_METHOD : Mk.EMAIL_PASSWORD_SIGN_IN_METHOD)
    };
    Nk.prototype.Kb = function(a) {
        return this.signInMethod == Mk.EMAIL_LINK_SIGN_IN_METHOD ? R(a, Ok, {
            email: this.Fb,
            oobCode: this.od
        }) : R(a, Pk, {
            email: this.Fb,
            password: this.od
        })
    }
    ;
    Nk.prototype.xc = function(a, b) {
        return this.signInMethod == Mk.EMAIL_LINK_SIGN_IN_METHOD ? R(a, Qk, {
            idToken: b,
            email: this.Fb,
            oobCode: this.od
        }) : R(a, Rk, {
            idToken: b,
            email: this.Fb,
            password: this.od
        })
    }
    ;
    Nk.prototype.md = function(a, b) {
        return tk(this.Kb(a), b)
    }
    ;
    Nk.prototype.A = function() {
        return {
            email: this.Fb,
            password: this.od,
            signInMethod: this.signInMethod
        }
    }
    ;
    var Sk = function(a) {
        return a && a.email && a.password ? new Nk(a.email,a.password,a.signInMethod) : null
    }
      , Mk = function() {
        Sj(this, {
            providerId: "password",
            isOAuthProvider: !1
        })
    }
      , Uk = function(a, b) {
        b = Tk(b);
        if (!b)
            throw new Q("argument-error","Invalid email link!");
        return new Nk(a,b.code,Mk.EMAIL_LINK_SIGN_IN_METHOD)
    }
      , Tk = function(a) {
        a = lk(a);
        return (a = kk(a)) && "EMAIL_SIGNIN" === a.operation ? a : null
    };
    Sj(Mk, {
        PROVIDER_ID: "password"
    });
    Sj(Mk, {
        EMAIL_LINK_SIGN_IN_METHOD: "emailLink"
    });
    Sj(Mk, {
        EMAIL_PASSWORD_SIGN_IN_METHOD: "password"
    });
    var Vk = function(a) {
        if (!(a.verificationId && a.We || a.Gd && a.phoneNumber))
            throw new Q("internal-error");
        this.s = a;
        P(this, "providerId", "phone");
        this.providerId = "phone";
        P(this, "signInMethod", "phone")
    };
    Vk.prototype.Kb = function(a) {
        return a.verifyPhoneNumber(Wk(this))
    }
    ;
    Vk.prototype.xc = function(a, b) {
        var c = Wk(this);
        c.idToken = b;
        return R(a, Xk, c)
    }
    ;
    Vk.prototype.md = function(a, b) {
        var c = Wk(this);
        c.operation = "REAUTH";
        a = R(a, Yk, c);
        return tk(a, b)
    }
    ;
    Vk.prototype.A = function() {
        var a = {
            providerId: "phone"
        };
        this.s.verificationId && (a.verificationId = this.s.verificationId);
        this.s.We && (a.verificationCode = this.s.We);
        this.s.Gd && (a.temporaryProof = this.s.Gd);
        this.s.phoneNumber && (a.phoneNumber = this.s.phoneNumber);
        return a
    }
    ;
    var Zk = function(a) {
        if (a && "phone" === a.providerId && (a.verificationId && a.verificationCode || a.temporaryProof && a.phoneNumber)) {
            var b = {};
            w(["verificationId", "verificationCode", "temporaryProof", "phoneNumber"], function(c) {
                a[c] && (b[c] = a[c])
            });
            return new Vk(b)
        }
        return null
    }
      , Wk = function(a) {
        return a.s.Gd && a.s.phoneNumber ? {
            temporaryProof: a.s.Gd,
            phoneNumber: a.s.phoneNumber
        } : {
            sessionInfo: a.s.verificationId,
            code: a.s.We
        }
    }
      , $k = function(a) {
        try {
            this.Cb = a || firebase.auth()
        } catch (b) {
            throw new Q("argument-error","Either an instance of firebase.auth.Auth must be passed as an argument to the firebase.auth.PhoneAuthProvider constructor, or the default firebase App instance must be initialized via firebase.initializeApp().");
        }
        Sj(this, {
            providerId: "phone",
            isOAuthProvider: !1
        })
    };
    $k.prototype.verifyPhoneNumber = function(a, b) {
        var c = this.Cb.i;
        return G(b.verify()).then(function(d) {
            if ("string" !== typeof d)
                throw new Q("argument-error","An implementation of firebase.auth.ApplicationVerifier.prototype.verify() must return a firebase.Promise that resolves with a string.");
            switch (b.type) {
            case "recaptcha":
                var e = r(a) ? a.session : null
                  , f = r(a) ? a.phoneNumber : a;
                return (e && "enroll" == e.type ? e.dd().then(function(g) {
                    return al(c, {
                        idToken: g,
                        phoneEnrollmentInfo: {
                            phoneNumber: f,
                            recaptchaToken: d
                        }
                    })
                }) : e && "signin" == e.type ? e.dd().then(function(g) {
                    return bl(c, {
                        mfaPendingCredential: g,
                        mfaEnrollmentId: a.multiFactorHint && a.multiFactorHint.uid || a.multiFactorUid,
                        phoneSignInInfo: {
                            recaptchaToken: d
                        }
                    })
                }) : cl(c, {
                    phoneNumber: f,
                    recaptchaToken: d
                })).then(function(g) {
                    "function" === typeof b.reset && b.reset();
                    return g
                }, function(g) {
                    "function" === typeof b.reset && b.reset();
                    throw g;
                });
            default:
                throw new Q("argument-error",'Only firebase.auth.ApplicationVerifiers with type="recaptcha" are currently supported.');
            }
        })
    }
    ;
    var dl = function(a, b) {
        if (!a)
            throw new Q("missing-verification-id");
        if (!b)
            throw new Q("missing-verification-code");
        return new Vk({
            verificationId: a,
            We: b
        })
    };
    Sj($k, {
        PROVIDER_ID: "phone"
    });
    Sj($k, {
        PHONE_SIGN_IN_METHOD: "phone"
    });
    var el = function(a) {
        if (a.temporaryProof && a.phoneNumber)
            return new Vk({
                Gd: a.temporaryProof,
                phoneNumber: a.phoneNumber
            });
        var b = a && a.providerId;
        if (!b || "password" === b)
            return null;
        var c = a && a.oauthAccessToken
          , d = a && a.oauthTokenSecret
          , e = a && a.nonce
          , f = a && a.oauthIdToken
          , g = a && a.pendingToken;
        try {
            switch (b) {
            case "google.com":
                return Jk(f, c);
            case "facebook.com":
                return Fk(c);
            case "github.com":
                return Hk(c);
            case "twitter.com":
                return Lk(c, d);
            default:
                return c || d || f || g ? g ? 0 == b.indexOf("saml.") ? new uk(b,g) : new zk(b,{
                    pendingToken: g,
                    idToken: a.oauthIdToken,
                    accessToken: a.oauthAccessToken
                },b) : (new Dk(b)).credential({
                    idToken: f,
                    accessToken: c,
                    rawNonce: e
                }) : null
            }
        } catch (h) {
            return null
        }
    }
      , fl = function(a) {
        if (!a.isOAuthProvider)
            throw new Q("invalid-oauth-provider");
    };
    var gl = function(a, b, c) {
        Q.call(this, a, c);
        a = b || {};
        a.email && P(this, "email", a.email);
        a.phoneNumber && P(this, "phoneNumber", a.phoneNumber);
        a.credential && P(this, "credential", a.credential);
        a.tenantId && P(this, "tenantId", a.tenantId)
    };
    m(gl, Q);
    gl.prototype.A = function() {
        var a = {
            code: this.code,
            message: this.message
        };
        this.email && (a.email = this.email);
        this.phoneNumber && (a.phoneNumber = this.phoneNumber);
        this.tenantId && (a.tenantId = this.tenantId);
        var b = this.credential && this.credential.A();
        b && bb(a, b);
        return a
    }
    ;
    gl.prototype.toJSON = function() {
        return this.A()
    }
    ;
    var hl = function(a) {
        if (a.code) {
            var b = a.code || "";
            0 == b.indexOf("auth/") && (b = b.substring(5));
            var c = {
                credential: el(a),
                tenantId: a.tenantId
            };
            if (a.email)
                c.email = a.email;
            else if (a.phoneNumber)
                c.phoneNumber = a.phoneNumber;
            else if (!c.credential)
                return new Q(b,a.message || void 0);
            return new gl(b,c,a.message)
        }
        return null
    };
    var il = function(a) {
        this.Ak = a
    };
    m(il, ci);
    il.prototype.Tc = function() {
        return new this.Ak
    }
    ;
    il.prototype.me = function() {
        return {}
    }
    ;
    var nl = function(a, b, c) {
        this.K = a;
        b = b || {};
        this.ci = b.secureTokenEndpoint || "https://securetoken.googleapis.com/v1/token";
        this.jk = b.secureTokenTimeout || jl;
        this.Je = $a(b.secureTokenHeaders || kl);
        this.ih = b.firebaseEndpoint || "https://www.googleapis.com/identitytoolkit/v3/relyingparty/";
        this.yh = b.identityPlatformEndpoint || "https://identitytoolkit.googleapis.com/v2/";
        this.Xi = b.firebaseTimeout || ll;
        this.oc = $a(b.firebaseHeaders || ml);
        c && (this.oc["X-Client-Version"] = c,
        this.Je["X-Client-Version"] = c);
        a = "Node" == sj();
        a = p.XMLHttpRequest || a && firebase.INTERNAL.node && firebase.INTERNAL.node.XMLHttpRequest;
        if (!a && !rj())
            throw new Q("internal-error","The XMLHttpRequest compatibility library was not found.");
        this.He = void 0;
        rj() ? this.He = new ki({
            zk: self
        }) : tj() ? this.He = new il(a) : this.He = new hi;
        this.R = null
    }, ol;
    nl.prototype.Ib = function() {
        return this.K
    }
    ;
    var pl = function(a, b) {
        b ? a.oc["X-Firebase-Locale"] = b : delete a.oc["X-Firebase-Locale"]
    }
      , rl = function(a, b) {
        b && (a.ci = ql("https://securetoken.googleapis.com/v1/token", b),
        a.ih = ql("https://www.googleapis.com/identitytoolkit/v3/relyingparty/", b),
        a.yh = ql("https://identitytoolkit.googleapis.com/v2/", b))
    }
      , ql = function(a, b) {
        a = Hf(a);
        b = Hf(b.url);
        wf(a, a.ba + a.gb);
        sf(a, b.ha);
        uf(a, b.ba);
        vf(a, b.Xa);
        return a.toString()
    }
      , sl = function(a, b) {
        b ? (a.oc["X-Client-Version"] = b,
        a.Je["X-Client-Version"] = b) : (delete a.oc["X-Client-Version"],
        delete a.Je["X-Client-Version"])
    };
    nl.prototype.Aa = function() {
        return this.R
    }
    ;
    nl.prototype.Ke = function(a, b, c, d, e, f) {
        if (ej() || rj())
            var g = t(this.lk, this);
        else
            ol || (ol = new F(function(h, l) {
                tl(h, l)
            }
            )),
            g = t(this.kk, this);
        g(a, b, c, d, e, f)
    }
    ;
    nl.prototype.lk = function(a, b, c, d, e, f) {
        if (rj() && ("undefined" === typeof p.fetch || "undefined" === typeof p.Headers || "undefined" === typeof p.Request))
            throw new Q("operation-not-supported-in-this-environment","fetch, Headers and Request native APIs or equivalent Polyfills must be available to support HTTP requests from a Worker environment.");
        var g = new Ji(this.He);
        if (f) {
            g.Xb = Math.max(0, f);
            var h = setTimeout(function() {
                g.dispatchEvent("timeout")
            }, f)
        }
        g.listen("complete", function() {
            h && clearTimeout(h);
            var l = null;
            try {
                l = JSON.parse(Vi(this)) || null
            } catch (n) {
                l = null
            }
            b && b(l)
        });
        g.yc("ready", function() {
            h && clearTimeout(h);
            this.Va()
        });
        g.yc("timeout", function() {
            h && clearTimeout(h);
            this.Va();
            b && b(null)
        });
        g.send(a, c, d, e)
    }
    ;
    var tl = function(a, b) {
        if (((window.gapi || {}).client || {}).request)
            a();
        else {
            p[ul] = function() {
                ((window.gapi || {}).client || {}).request ? a() : b(Error("CORS_UNSUPPORTED"))
            }
            ;
            var c = qb(vl, {
                onload: ul
            });
            zi(Ii(c), function() {
                b(Error("CORS_UNSUPPORTED"))
            })
        }
    };
    nl.prototype.kk = function(a, b, c, d, e) {
        var f = this;
        ol.then(function() {
            window.gapi.client.setApiKey(f.Ib());
            var g = window.gapi.auth.getToken();
            window.gapi.auth.setToken(null);
            window.gapi.client.request({
                path: a,
                method: c,
                body: d,
                headers: e,
                authType: "none",
                callback: function(h) {
                    window.gapi.auth.setToken(g);
                    b && b(h)
                }
            })
        }).h(function(g) {
            b && b({
                error: {
                    message: g && g.message || "CORS_UNSUPPORTED"
                }
            })
        })
    }
    ;
    var xl = function(a, b) {
        return new F(function(c, d) {
            "refresh_token" == b.grant_type && b.refresh_token || "authorization_code" == b.grant_type && b.code ? a.Ke(a.ci + "?key=" + encodeURIComponent(a.Ib()), function(e) {
                e ? e.error ? d(wl(e)) : e.access_token && e.refresh_token ? c(e) : d(new Q("internal-error")) : d(new Q("network-request-failed"))
            }, "POST", Mf(b).toString(), a.Je, a.jk.get()) : d(new Q("internal-error"))
        }
        )
    }
      , yl = function(a, b, c, d, e, f, g) {
        var h = Hf(b + c);
        I(h, "key", a.Ib());
        g && I(h, "cb", Date.now().toString());
        var l = "GET" == d;
        if (l)
            for (var n in e)
                e.hasOwnProperty(n) && I(h, n, e[n]);
        return new F(function(q, A) {
            a.Ke(h.toString(), function(D) {
                D ? D.error ? A(wl(D, f || {})) : q(D) : A(new Q("network-request-failed"))
            }, d, l ? void 0 : JSON.stringify(Dj(e)), a.oc, a.Xi.get())
        }
        )
    }
      , zl = function(a) {
        a = a.email;
        if ("string" !== typeof a || !lj.test(a))
            throw new Q("invalid-email");
    }
      , Al = function(a) {
        "email"in a && zl(a)
    }
      , Cl = function(a, b) {
        return R(a, Bl, {
            identifier: b,
            continueUri: zj() ? aj() : "http://localhost"
        }).then(function(c) {
            return c.signinMethods || []
        })
    }
      , El = function(a) {
        return R(a, Dl, {}).then(function(b) {
            return b.authorizedDomains || []
        })
    }
      , Fl = function(a) {
        if (!a.idToken) {
            if (a.mfaPendingCredential)
                throw new Q("multi-factor-auth-required",null,$a(a));
            throw new Q("internal-error");
        }
    }
      , Gl = function(a) {
        if (a.phoneNumber || a.temporaryProof) {
            if (!a.phoneNumber || !a.temporaryProof)
                throw new Q("internal-error");
        } else {
            if (!a.sessionInfo)
                throw new Q("missing-verification-id");
            if (!a.code)
                throw new Q("missing-verification-code");
        }
    };
    k = nl.prototype;
    k.signInAnonymously = function() {
        return R(this, Hl, {})
    }
    ;
    k.updateEmail = function(a, b) {
        return R(this, Il, {
            idToken: a,
            email: b
        })
    }
    ;
    k.updatePassword = function(a, b) {
        return R(this, Rk, {
            idToken: a,
            password: b
        })
    }
    ;
    k.updateProfile = function(a, b) {
        var c = {
            idToken: a
        }
          , d = [];
        Xa(Jl, function(e, f) {
            var g = b[f];
            null === g ? d.push(e) : f in b && (c[f] = g)
        });
        d.length && (c.deleteAttribute = d);
        return R(this, Il, c)
    }
    ;
    k.sendPasswordResetEmail = function(a, b) {
        a = {
            requestType: "PASSWORD_RESET",
            email: a
        };
        bb(a, b);
        return R(this, Kl, a)
    }
    ;
    k.sendSignInLinkToEmail = function(a, b) {
        a = {
            requestType: "EMAIL_SIGNIN",
            email: a
        };
        bb(a, b);
        return R(this, Ll, a)
    }
    ;
    k.sendEmailVerification = function(a, b) {
        a = {
            requestType: "VERIFY_EMAIL",
            idToken: a
        };
        bb(a, b);
        return R(this, Ml, a)
    }
    ;
    k.verifyBeforeUpdateEmail = function(a, b, c) {
        a = {
            requestType: "VERIFY_AND_CHANGE_EMAIL",
            idToken: a,
            newEmail: b
        };
        bb(a, c);
        return R(this, Nl, a)
    }
    ;
    var cl = function(a, b) {
        return R(a, Ol, b)
    };
    nl.prototype.verifyPhoneNumber = function(a) {
        return R(this, Pl, a)
    }
    ;
    var al = function(a, b) {
        return R(a, Ql, b).then(function(c) {
            return c.phoneSessionInfo.sessionInfo
        })
    }
      , Rl = function(a) {
        if (!a.phoneVerificationInfo)
            throw new Q("internal-error");
        if (!a.phoneVerificationInfo.sessionInfo)
            throw new Q("missing-verification-id");
        if (!a.phoneVerificationInfo.code)
            throw new Q("missing-verification-code");
    }
      , bl = function(a, b) {
        return R(a, Sl, b).then(function(c) {
            return c.phoneResponseInfo.sessionInfo
        })
    }
      , Ul = function(a, b, c) {
        return R(a, Tl, {
            idToken: b,
            deleteProvider: c
        })
    }
      , Vl = function(a) {
        if (!a.requestUri || !a.sessionId && !a.postBody && !a.pendingToken)
            throw new Q("internal-error");
    }
      , Wl = function(a, b) {
        b.oauthIdToken && b.providerId && 0 == b.providerId.indexOf("oidc.") && !b.pendingToken && (a.sessionId ? b.nonce = a.sessionId : a.postBody && (a = new zf(a.postBody),
        a.Rc("nonce") && (b.nonce = a.get("nonce"))));
        return b
    }
      , Yl = function(a) {
        var b = null;
        a.needConfirmation ? (a.code = "account-exists-with-different-credential",
        b = hl(a)) : "FEDERATED_USER_ID_ALREADY_LINKED" == a.errorMessage ? (a.code = "credential-already-in-use",
        b = hl(a)) : "EMAIL_EXISTS" == a.errorMessage ? (a.code = "email-already-in-use",
        b = hl(a)) : a.errorMessage && (b = Xl(a.errorMessage));
        if (b)
            throw b;
        Fl(a)
    }
      , vk = function(a, b) {
        b.returnIdpCredential = !0;
        return R(a, Zl, b)
    }
      , wk = function(a, b) {
        b.returnIdpCredential = !0;
        return R(a, $l, b)
    }
      , xk = function(a, b) {
        b.returnIdpCredential = !0;
        b.autoCreate = !1;
        return R(a, am, b)
    }
      , bm = function(a) {
        if (!a.oobCode)
            throw new Q("invalid-action-code");
    };
    nl.prototype.confirmPasswordReset = function(a, b) {
        return R(this, cm, {
            oobCode: a,
            newPassword: b
        })
    }
    ;
    nl.prototype.checkActionCode = function(a) {
        return R(this, dm, {
            oobCode: a
        })
    }
    ;
    nl.prototype.applyActionCode = function(a) {
        return R(this, em, {
            oobCode: a
        })
    }
    ;
    var R = function(a, b, c) {
        if (!Uj(c, b.ga))
            return H(new Q("internal-error"));
        var d = !!b.Kd, e = b.httpMethod || "POST", f;
        return G(c).then(b.J).then(function() {
            b.Qa && (c.returnSecureToken = !0);
            b.N && a.R && "undefined" === typeof c.tenantId && (c.tenantId = a.R);
            return d ? yl(a, a.yh, b.endpoint, e, c, b.Yg, b.jf || !1) : yl(a, a.ih, b.endpoint, e, c, b.Yg, b.jf || !1)
        }).then(function(g) {
            f = g;
            return b.Ee ? b.Ee(c, f) : f
        }).then(b.V).then(function() {
            if (!b.jb)
                return f;
            if (!(b.jb in f))
                throw new Q("internal-error");
            return f[b.jb]
        })
    }
      , Xl = function(a) {
        return wl({
            error: {
                errors: [{
                    message: a
                }],
                code: 400,
                reason: a
            }
        })
    }
      , wl = function(a, b) {
        var c = (a.error && a.error.errors && a.error.errors[0] || {}).reason || "";
        var d = {
            keyInvalid: "invalid-api-key",
            ipRefererBlocked: "app-not-authorized"
        };
        if (c = d[c] ? new Q(d[c]) : null)
            return c;
        c = a.error && (a.error.reason || a.error.message) || "";
        d = {
            INVALID_CUSTOM_TOKEN: "invalid-custom-token",
            CREDENTIAL_MISMATCH: "custom-token-mismatch",
            MISSING_CUSTOM_TOKEN: "internal-error",
            INVALID_IDENTIFIER: "invalid-email",
            MISSING_CONTINUE_URI: "internal-error",
            INVALID_EMAIL: "invalid-email",
            INVALID_PASSWORD: "wrong-password",
            USER_DISABLED: "user-disabled",
            MISSING_PASSWORD: "internal-error",
            EMAIL_EXISTS: "email-already-in-use",
            PASSWORD_LOGIN_DISABLED: "operation-not-allowed",
            INVALID_IDP_RESPONSE: "invalid-credential",
            INVALID_PENDING_TOKEN: "invalid-credential",
            FEDERATED_USER_ID_ALREADY_LINKED: "credential-already-in-use",
            MISSING_OR_INVALID_NONCE: "missing-or-invalid-nonce",
            INVALID_MESSAGE_PAYLOAD: "invalid-message-payload",
            INVALID_RECIPIENT_EMAIL: "invalid-recipient-email",
            INVALID_SENDER: "invalid-sender",
            EMAIL_NOT_FOUND: "user-not-found",
            RESET_PASSWORD_EXCEED_LIMIT: "too-many-requests",
            EXPIRED_OOB_CODE: "expired-action-code",
            INVALID_OOB_CODE: "invalid-action-code",
            MISSING_OOB_CODE: "internal-error",
            INVALID_PROVIDER_ID: "invalid-provider-id",
            CREDENTIAL_TOO_OLD_LOGIN_AGAIN: "requires-recent-login",
            INVALID_ID_TOKEN: "invalid-user-token",
            TOKEN_EXPIRED: "user-token-expired",
            USER_NOT_FOUND: "user-token-expired",
            CORS_UNSUPPORTED: "cors-unsupported",
            DYNAMIC_LINK_NOT_ACTIVATED: "dynamic-link-not-activated",
            INVALID_APP_ID: "invalid-app-id",
            TOO_MANY_ATTEMPTS_TRY_LATER: "too-many-requests",
            WEAK_PASSWORD: "weak-password",
            PASSWORD_DOES_NOT_MEET_REQUIREMENTS: "password-does-not-meet-requirements",
            OPERATION_NOT_ALLOWED: "operation-not-allowed",
            USER_CANCELLED: "user-cancelled",
            CAPTCHA_CHECK_FAILED: "captcha-check-failed",
            INVALID_APP_CREDENTIAL: "invalid-app-credential",
            INVALID_CODE: "invalid-verification-code",
            INVALID_PHONE_NUMBER: "invalid-phone-number",
            INVALID_SESSION_INFO: "invalid-verification-id",
            INVALID_TEMPORARY_PROOF: "invalid-credential",
            INVALID_TENANT_ID: "invalid-tenant-id",
            MISSING_APP_CREDENTIAL: "missing-app-credential",
            MISSING_CODE: "missing-verification-code",
            MISSING_PHONE_NUMBER: "missing-phone-number",
            MISSING_SESSION_INFO: "missing-verification-id",
            QUOTA_EXCEEDED: "quota-exceeded",
            SESSION_EXPIRED: "code-expired",
            REJECTED_CREDENTIAL: "rejected-credential",
            INVALID_CONTINUE_URI: "invalid-continue-uri",
            MISSING_ANDROID_PACKAGE_NAME: "missing-android-pkg-name",
            MISSING_IOS_BUNDLE_ID: "missing-ios-bundle-id",
            UNAUTHORIZED_DOMAIN: "unauthorized-continue-uri",
            INVALID_DYNAMIC_LINK_DOMAIN: "invalid-dynamic-link-domain",
            INVALID_OAUTH_CLIENT_ID: "invalid-oauth-client-id",
            INVALID_CERT_HASH: "invalid-cert-hash",
            UNSUPPORTED_TENANT_OPERATION: "unsupported-tenant-operation",
            TENANT_ID_MISMATCH: "tenant-id-mismatch",
            ADMIN_ONLY_OPERATION: "admin-restricted-operation",
            INVALID_MFA_PENDING_CREDENTIAL: "invalid-multi-factor-session",
            MFA_ENROLLMENT_NOT_FOUND: "multi-factor-info-not-found",
            MISSING_MFA_PENDING_CREDENTIAL: "missing-multi-factor-session",
            MISSING_MFA_ENROLLMENT_ID: "missing-multi-factor-info",
            EMAIL_CHANGE_NEEDS_VERIFICATION: "email-change-needs-verification",
            SECOND_FACTOR_EXISTS: "second-factor-already-in-use",
            SECOND_FACTOR_LIMIT_EXCEEDED: "maximum-second-factor-count-exceeded",
            UNSUPPORTED_FIRST_FACTOR: "unsupported-first-factor",
            UNVERIFIED_EMAIL: "unverified-email",
            API_KEY_SERVICE_BLOCKED: "api-key-service-blocked"
        };
        b = b || {};
        bb(d, b);
        b = (b = c.match(/^[^\s]+\s*:\s*([\s\S]*)$/)) && 1 < b.length ? b[1] : void 0;
        for (var e in d)
            if (0 === c.indexOf(e))
                return new Q(d[e],b);
        !b && a && (b = Cj(a));
        return new Q("internal-error",b)
    }
      , jl = new Hj(3E4,6E4)
      , kl = {
        "Content-Type": "application/x-www-form-urlencoded"
    }
      , ll = new Hj(3E4,6E4)
      , ml = {
        "Content-Type": "application/json"
    }
      , vl = jb("https://apis.google.com/js/client.js?onload=%{onload}")
      , ul = "__fcb" + Math.floor(1E6 * Math.random()).toString()
      , Jl = {
        displayName: "DISPLAY_NAME",
        photoUrl: "PHOTO_URL"
    }
      , em = {
        endpoint: "setAccountInfo",
        J: bm,
        jb: "email",
        N: !0
    }
      , dm = {
        endpoint: "resetPassword",
        J: bm,
        V: function(a) {
            var b = a.requestType;
            if (!b || !a.email && "EMAIL_SIGNIN" != b && "VERIFY_AND_CHANGE_EMAIL" != b)
                throw new Q("internal-error");
        },
        N: !0
    }
      , fm = {
        endpoint: "signupNewUser",
        J: function(a) {
            zl(a);
            if (!a.password)
                throw new Q("weak-password");
        },
        V: Fl,
        Qa: !0,
        N: !0
    }
      , Bl = {
        endpoint: "createAuthUri",
        N: !0
    }
      , gm = {
        endpoint: "deleteAccount",
        ga: ["idToken"]
    }
      , Tl = {
        endpoint: "setAccountInfo",
        ga: ["idToken", "deleteProvider"],
        J: function(a) {
            if (!Array.isArray(a.deleteProvider))
                throw new Q("internal-error");
        }
    }
      , Ok = {
        endpoint: "emailLinkSignin",
        ga: ["email", "oobCode"],
        J: zl,
        V: Fl,
        Qa: !0,
        N: !0
    }
      , Qk = {
        endpoint: "emailLinkSignin",
        ga: ["idToken", "email", "oobCode"],
        J: zl,
        V: Fl,
        Qa: !0
    }
      , hm = {
        endpoint: "accounts/mfaEnrollment:finalize",
        ga: ["idToken", "phoneVerificationInfo"],
        J: Rl,
        V: Fl,
        N: !0,
        Kd: !0
    }
      , im = {
        endpoint: "accounts/mfaSignIn:finalize",
        ga: ["mfaPendingCredential", "phoneVerificationInfo"],
        J: Rl,
        V: Fl,
        N: !0,
        Kd: !0
    }
      , jm = {
        endpoint: "getAccountInfo"
    }
      , Ll = {
        endpoint: "getOobConfirmationCode",
        ga: ["requestType"],
        J: function(a) {
            if ("EMAIL_SIGNIN" != a.requestType)
                throw new Q("internal-error");
            zl(a)
        },
        jb: "email",
        N: !0
    }
      , Ml = {
        endpoint: "getOobConfirmationCode",
        ga: ["idToken", "requestType"],
        J: function(a) {
            if ("VERIFY_EMAIL" != a.requestType)
                throw new Q("internal-error");
        },
        jb: "email",
        N: !0
    }
      , Nl = {
        endpoint: "getOobConfirmationCode",
        ga: ["idToken", "newEmail", "requestType"],
        J: function(a) {
            if ("VERIFY_AND_CHANGE_EMAIL" != a.requestType)
                throw new Q("internal-error");
        },
        jb: "email",
        N: !0
    }
      , Kl = {
        endpoint: "getOobConfirmationCode",
        ga: ["requestType"],
        J: function(a) {
            if ("PASSWORD_RESET" != a.requestType)
                throw new Q("internal-error");
            zl(a)
        },
        jb: "email",
        N: !0
    }
      , Dl = {
        jf: !0,
        endpoint: "getProjectConfig",
        httpMethod: "GET"
    }
      , km = {
        jf: !0,
        endpoint: "getRecaptchaParam",
        httpMethod: "GET",
        V: function(a) {
            if (!a.recaptchaSiteKey)
                throw new Q("internal-error");
        }
    }
      , cm = {
        endpoint: "resetPassword",
        J: bm,
        jb: "email",
        N: !0
    }
      , Ol = {
        endpoint: "sendVerificationCode",
        ga: ["phoneNumber", "recaptchaToken"],
        jb: "sessionInfo",
        N: !0
    }
      , Il = {
        endpoint: "setAccountInfo",
        ga: ["idToken"],
        J: Al,
        Qa: !0
    }
      , Rk = {
        endpoint: "setAccountInfo",
        ga: ["idToken"],
        J: function(a) {
            Al(a);
            if (!a.password)
                throw new Q("weak-password");
        },
        V: Fl,
        Qa: !0
    }
      , Hl = {
        endpoint: "signupNewUser",
        V: Fl,
        Qa: !0,
        N: !0
    }
      , Ql = {
        endpoint: "accounts/mfaEnrollment:start",
        ga: ["idToken", "phoneEnrollmentInfo"],
        J: function(a) {
            if (!a.phoneEnrollmentInfo)
                throw new Q("internal-error");
            if (!a.phoneEnrollmentInfo.phoneNumber)
                throw new Q("missing-phone-number");
            if (!a.phoneEnrollmentInfo.recaptchaToken)
                throw new Q("missing-app-credential");
        },
        V: function(a) {
            if (!a.phoneSessionInfo || !a.phoneSessionInfo.sessionInfo)
                throw new Q("internal-error");
        },
        N: !0,
        Kd: !0
    }
      , Sl = {
        endpoint: "accounts/mfaSignIn:start",
        ga: ["mfaPendingCredential", "mfaEnrollmentId", "phoneSignInInfo"],
        J: function(a) {
            if (!a.phoneSignInInfo || !a.phoneSignInInfo.recaptchaToken)
                throw new Q("missing-app-credential");
        },
        V: function(a) {
            if (!a.phoneResponseInfo || !a.phoneResponseInfo.sessionInfo)
                throw new Q("internal-error");
        },
        N: !0,
        Kd: !0
    }
      , Zl = {
        endpoint: "verifyAssertion",
        J: Vl,
        Ee: Wl,
        V: Yl,
        Qa: !0,
        N: !0
    }
      , am = {
        endpoint: "verifyAssertion",
        J: Vl,
        Ee: Wl,
        V: function(a) {
            if (a.errorMessage && "USER_NOT_FOUND" == a.errorMessage)
                throw new Q("user-not-found");
            if (a.errorMessage)
                throw Xl(a.errorMessage);
            Fl(a)
        },
        Qa: !0,
        N: !0
    }
      , $l = {
        endpoint: "verifyAssertion",
        J: function(a) {
            Vl(a);
            if (!a.idToken)
                throw new Q("internal-error");
        },
        Ee: Wl,
        V: Yl,
        Qa: !0
    }
      , lm = {
        endpoint: "verifyCustomToken",
        J: function(a) {
            if (!a.token)
                throw new Q("invalid-custom-token");
        },
        V: Fl,
        Qa: !0,
        N: !0
    }
      , Pk = {
        endpoint: "verifyPassword",
        J: function(a) {
            zl(a);
            if (!a.password)
                throw new Q("wrong-password");
        },
        V: Fl,
        Qa: !0,
        N: !0
    }
      , Pl = {
        endpoint: "verifyPhoneNumber",
        J: Gl,
        V: Fl,
        N: !0
    }
      , Xk = {
        endpoint: "verifyPhoneNumber",
        J: function(a) {
            if (!a.idToken)
                throw new Q("internal-error");
            Gl(a)
        },
        V: function(a) {
            if (a.temporaryProof)
                throw a.code = "credential-already-in-use",
                hl(a);
            Fl(a)
        }
    }
      , Yk = {
        Yg: {
            USER_NOT_FOUND: "user-not-found"
        },
        endpoint: "verifyPhoneNumber",
        J: Gl,
        V: Fl,
        N: !0
    }
      , mm = {
        endpoint: "accounts/mfaEnrollment:withdraw",
        ga: ["idToken", "mfaEnrollmentId"],
        V: function(a) {
            if (!!a.idToken ^ !!a.refreshToken)
                throw new Q("internal-error");
        },
        N: !0,
        Kd: !0
    };
    var om = function(a) {
        this.Yb = a;
        this.je = null;
        this.Wf = nm(this)
    }
      , nm = function(a) {
        return pm().then(function() {
            return new F(function(b, c) {
                O("gapi.iframes.getContext")().open({
                    where: document.body,
                    url: a.Yb,
                    messageHandlersFilter: O("gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER"),
                    attributes: {
                        style: {
                            position: "absolute",
                            top: "-100px",
                            width: "1px",
                            height: "1px"
                        }
                    },
                    dontclear: !0
                }, function(d) {
                    a.je = d;
                    a.je.restyle({
                        setHideOnLeave: !1
                    });
                    var e = setTimeout(function() {
                        c(Error("Network Error"))
                    }, qm.get())
                      , f = function() {
                        clearTimeout(e);
                        b()
                    };
                    d.ping(f).then(f, function() {
                        c(Error("Network Error"))
                    })
                })
            }
            )
        })
    };
    om.prototype.sendMessage = function(a) {
        var b = this;
        return this.Wf.then(function() {
            return new F(function(c) {
                b.je.send(a.type, a, c, O("gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER"))
            }
            )
        })
    }
    ;
    var rm = function(a, b) {
        a.Wf.then(function() {
            a.je.register("authEvent", b, O("gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER"))
        })
    }
      , pm = function() {
        return sm ? sm : sm = (new F(function(a, b) {
            var c = function() {
                Gj();
                O("gapi.load")("gapi.iframes", {
                    callback: a,
                    ontimeout: function() {
                        Gj();
                        b(Error("Network Error"))
                    },
                    timeout: tm.get()
                })
            };
            if (O("gapi.iframes.Iframe"))
                a();
            else if (O("gapi.load"))
                c();
            else {
                var d = "__iframefcb" + Math.floor(1E6 * Math.random()).toString();
                p[d] = function() {
                    O("gapi.load") ? c() : b(Error("Network Error"))
                }
                ;
                d = qb(um, {
                    onload: d
                });
                G(Ii(d)).h(function() {
                    b(Error("Network Error"))
                })
            }
        }
        )).h(function(a) {
            sm = null;
            throw a;
        })
    }
      , um = jb("https://apis.google.com/js/api.js?onload=%{onload}")
      , tm = new Hj(3E4,6E4)
      , qm = new Hj(5E3,15E3)
      , sm = null;
    var vm = function(a, b, c, d) {
        this.T = a;
        this.K = b;
        this.I = c;
        this.m = d;
        this.ac = null;
        this.m ? (a = Hf(this.m.url),
        a = If(a.ha, a.ba, a.Xa, "/emulator/auth/iframe")) : a = If("https", this.T, null, "/__/auth/iframe");
        this.kb = a;
        I(this.kb, "apiKey", this.K);
        I(this.kb, "appName", this.I);
        this.ra = null;
        this.da = []
    };
    vm.prototype.xg = function(a) {
        this.ac = a;
        return this
    }
    ;
    vm.prototype.tg = function(a) {
        this.ra = a;
        return this
    }
    ;
    vm.prototype.toString = function() {
        this.ac ? I(this.kb, "v", this.ac) : this.kb.removeParameter("v");
        this.ra ? I(this.kb, "eid", this.ra) : this.kb.removeParameter("eid");
        this.da.length ? I(this.kb, "fw", this.da.join(",")) : this.kb.removeParameter("fw");
        return this.kb.toString()
    }
    ;
    var wm = function(a, b, c, d, e, f) {
        this.T = a;
        this.K = b;
        this.I = c;
        this.Ii = d;
        this.m = f;
        this.ac = this.ca = this.mg = null;
        this.Fc = e;
        this.R = this.ra = null
    };
    wm.prototype.wg = function(a) {
        this.R = a;
        return this
    }
    ;
    wm.prototype.xg = function(a) {
        this.ac = a;
        return this
    }
    ;
    wm.prototype.tg = function(a) {
        this.ra = a;
        return this
    }
    ;
    wm.prototype.toString = function() {
        if (this.m) {
            var a = Hf(this.m.url);
            a = If(a.ha, a.ba, a.Xa, "/emulator/auth/handler")
        } else
            a = If("https", this.T, null, "/__/auth/handler");
        I(a, "apiKey", this.K);
        I(a, "appName", this.I);
        I(a, "authType", this.Ii);
        if (this.Fc.isOAuthProvider) {
            var b = this.Fc;
            try {
                var c = firebase.app(this.I).auth().La
            } catch (h) {
                c = null
            }
            b.qf = c;
            I(a, "providerId", this.Fc.providerId);
            c = this.Fc;
            b = Dj(c.Zg);
            for (var d in b)
                b[d] = b[d].toString();
            d = c.Yj;
            b = $a(b);
            for (var e = 0; e < d.length; e++) {
                var f = d[e];
                f in b && delete b[f]
            }
            c.Of && c.qf && !b[c.Of] && (b[c.Of] = c.qf);
            Za(b) || I(a, "customParameters", Cj(b))
        }
        "function" === typeof this.Fc.ph && (c = this.Fc.ph(),
        c.length && I(a, "scopes", c.join(",")));
        this.mg ? I(a, "redirectUrl", this.mg) : a.removeParameter("redirectUrl");
        this.ca ? I(a, "eventId", this.ca) : a.removeParameter("eventId");
        this.ac ? I(a, "v", this.ac) : a.removeParameter("v");
        if (this.Nd)
            for (var g in this.Nd)
                this.Nd.hasOwnProperty(g) && !Gf(a, g) && I(a, g, this.Nd[g]);
        this.R ? I(a, "tid", this.R) : a.removeParameter("tid");
        this.ra ? I(a, "eid", this.ra) : a.removeParameter("eid");
        g = xm(this.I);
        g.length && I(a, "fw", g.join(","));
        return a.toString()
    }
    ;
    var xm = function(a) {
        try {
            return Ta(firebase.app(a).auth().da)
        } catch (b) {
            return []
        }
    }
      , ym = function(a, b, c, d, e, f) {
        this.T = a;
        this.K = b;
        this.I = c;
        this.m = f;
        this.Db = d || null;
        this.ra = e || null;
        this.i = this.Ff = this.lh = null;
        this.Za = [];
        this.ne = this.fb = null
    }
      , zm = function(a) {
        var b = b || aj();
        return El(a).then(function(c) {
            if (!kj(c, b))
                throw new mk(aj());
        })
    };
    k = ym.prototype;
    k.initialize = function() {
        if (this.ne)
            return this.ne;
        var a = this;
        return this.ne = mj().then(function() {
            if (!a.Ff) {
                var b = a.Db
                  , c = a.ra
                  , d = xm(a.I);
                b = (new vm(a.T,a.K,a.I,a.m)).xg(b).tg(c);
                b.da = Ta(d || []);
                a.Ff = b.toString()
            }
            a.ie = new om(a.Ff);
            Am(a)
        })
    }
    ;
    k.Dd = function(a, b, c) {
        var d = new Q("popup-closed-by-user")
          , e = new Q("web-storage-unsupported")
          , f = this
          , g = !1;
        return this.Ob().then(function() {
            Bm(f).then(function(h) {
                h || (a && gj(a),
                b(e),
                g = !0)
            })
        }).h(function() {}).then(function() {
            if (!g)
                return ij(a)
        }).then(function() {
            if (!g)
                return Je(c).then(function() {
                    b(d)
                })
        })
    }
    ;
    k.ki = function() {
        var a = Zi();
        return !Bj(a) && !Fj(a)
    }
    ;
    k.th = function() {
        return !1
    }
    ;
    k.sd = function(a, b, c, d, e, f, g, h) {
        if (!a)
            return H(new Q("popup-blocked"));
        if (g && !Bj())
            return this.Ob().h(function(n) {
                gj(a);
                e(n)
            }),
            d(),
            G();
        this.fb || (this.fb = zm(Cm(this)));
        var l = this;
        return this.fb.then(function() {
            var n = l.Ob().h(function(q) {
                gj(a);
                e(q);
                throw q;
            });
            d();
            return n
        }).then(function() {
            fl(c);
            if (!g) {
                var n = Dm(l.T, l.K, l.I, b, c, null, f, l.Db, void 0, l.ra, h, l.m);
                bj(n, a)
            }
        }).h(function(n) {
            "auth/network-request-failed" == n.code && (l.fb = null);
            throw n;
        })
    }
    ;
    var Cm = function(a) {
        a.i || (a.lh = a.Db ? wj(a.Db, xm(a.I)) : null,
        a.i = new nl(a.K,Xi(a.ra),a.lh),
        a.m && rl(a.i, a.m));
        return a.i
    };
    ym.prototype.td = function(a, b, c, d) {
        this.fb || (this.fb = zm(Cm(this)));
        var e = this;
        return this.fb.then(function() {
            fl(b);
            var f = Dm(e.T, e.K, e.I, a, b, aj(), c, e.Db, void 0, e.ra, d, e.m);
            bj(f)
        }).h(function(f) {
            "auth/network-request-failed" == f.code && (e.fb = null);
            throw f;
        })
    }
    ;
    ym.prototype.Ob = function() {
        var a = this;
        return this.initialize().then(function() {
            return a.ie.Wf
        }).h(function() {
            a.fb = null;
            throw new Q("network-request-failed");
        })
    }
    ;
    ym.prototype.si = function() {
        return !0
    }
    ;
    var Dm = function(a, b, c, d, e, f, g, h, l, n, q, A) {
        a = new wm(a,b,c,d,e,A);
        a.mg = f;
        a.ca = g;
        f = a.xg(h);
        f.Nd = $a(l || null);
        return f.tg(n).wg(q).toString()
    }
      , Am = function(a) {
        if (!a.ie)
            throw Error("IfcHandler must be initialized!");
        rm(a.ie, function(b) {
            var c = {};
            if (b && b.authEvent) {
                var d = !1;
                b = dk(b.authEvent);
                for (c = 0; c < a.Za.length; c++)
                    d = a.Za[c](b) || d;
                c = {};
                c.status = d ? "ACK" : "ERROR";
                return G(c)
            }
            c.status = "ERROR";
            return G(c)
        })
    }
      , Bm = function(a) {
        var b = {
            type: "webStorageSupport"
        };
        return a.initialize().then(function() {
            return a.ie.sendMessage(b)
        }).then(function(c) {
            if (c && c.length && "undefined" !== typeof c[0].webStorageSupport)
                return c[0].webStorageSupport;
            throw Error();
        })
    };
    ym.prototype.cc = function(a) {
        this.Za.push(a)
    }
    ;
    ym.prototype.zd = function(a) {
        Sa(this.Za, function(b) {
            return b == a
        })
    }
    ;
    function Em() {}
    Em.prototype.render = function() {}
    ;
    Em.prototype.reset = function() {}
    ;
    Em.prototype.getResponse = function() {}
    ;
    Em.prototype.execute = function() {}
    ;
    var Fm = function() {
        this.kc = p.grecaptcha ? Infinity : 0;
        this.vh = null;
        this.lf = "__rcb" + Math.floor(1E6 * Math.random()).toString()
    };
    Fm.prototype.Kh = function(a) {
        var b = this;
        return new F(function(c, d) {
            var e = setTimeout(function() {
                d(new Q("network-request-failed"))
            }, Gm.get());
            if (!p.grecaptcha || a !== b.vh && !b.kc) {
                p[b.lf] = function() {
                    if (p.grecaptcha) {
                        b.vh = a;
                        var g = p.grecaptcha.render;
                        p.grecaptcha.render = function(h, l) {
                            h = g(h, l);
                            b.kc++;
                            return h
                        }
                        ;
                        clearTimeout(e);
                        c(p.grecaptcha)
                    } else
                        clearTimeout(e),
                        d(new Q("internal-error"));
                    delete p[b.lf]
                }
                ;
                var f = qb(Hm, {
                    onload: b.lf,
                    hl: a || ""
                });
                G(Ii(f)).h(function() {
                    clearTimeout(e);
                    d(new Q("internal-error","Unable to load external reCAPTCHA dependencies!"))
                })
            } else
                clearTimeout(e),
                c(p.grecaptcha)
        }
        )
    }
    ;
    Fm.prototype.Sg = function() {
        this.kc--
    }
    ;
    var Hm = jb("https://www.google.com/recaptcha/api.js?trustedtypes=true&onload=%{onload}&render=explicit&hl=%{hl}")
      , Gm = new Hj(3E4,6E4)
      , Im = null;
    var Jm = function() {
        this.Sf = {};
        this.kc = 1E12
    };
    Jm.prototype.render = function(a, b) {
        this.Sf[this.kc.toString()] = new Km(a,b);
        return this.kc++
    }
    ;
    Jm.prototype.reset = function(a) {
        var b = Lm(this, a);
        a = Mm(a);
        b && a && (b.delete(),
        delete this.Sf[a])
    }
    ;
    Jm.prototype.getResponse = function(a) {
        return (a = Lm(this, a)) ? a.getResponse() : null
    }
    ;
    Jm.prototype.execute = function(a) {
        (a = Lm(this, a)) && a.execute()
    }
    ;
    var Lm = function(a, b) {
        return (b = Mm(b)) ? a.Sf[b] || null : null
    }
      , Mm = function(a) {
        return (a = "undefined" === typeof a ? 1E12 : a) ? a.toString() : null
    }
      , Nm = null
      , Km = function(a, b) {
        this.Ea = !1;
        this.s = b;
        this.Kc = this.Fe = null;
        this.Gh = "invisible" !== this.s.size;
        this.u = Tc(document, a);
        var c = this;
        this.Qh = function() {
            c.execute()
        }
        ;
        this.Gh ? this.execute() : C(this.u, "click", this.Qh)
    };
    Km.prototype.getResponse = function() {
        Om(this);
        return this.Fe
    }
    ;
    Km.prototype.execute = function() {
        Om(this);
        var a = this;
        this.Kc || (this.Kc = setTimeout(function() {
            a.Fe = uj();
            var b = a.s.callback
              , c = a.s["expired-callback"];
            if (b)
                try {
                    b(a.Fe)
                } catch (d) {}
            a.Kc = setTimeout(function() {
                a.Kc = null;
                a.Fe = null;
                if (c)
                    try {
                        c()
                    } catch (d) {}
                a.Gh && a.execute()
            }, 6E4)
        }, 500))
    }
    ;
    Km.prototype.delete = function() {
        Om(this);
        this.Ea = !0;
        clearTimeout(this.Kc);
        this.Kc = null;
        Hd(this.u, "click", this.Qh)
    }
    ;
    var Om = function(a) {
        if (a.Ea)
            throw Error("reCAPTCHA mock was already deleted!");
    };
    var Pm = function() {};
    Pm.prototype.Kh = function() {
        Nm || (Nm = new Jm);
        return G(Nm)
    }
    ;
    Pm.prototype.Sg = function() {}
    ;
    var Qm = null;
    var Rm = function(a, b, c, d, e, f, g) {
        P(this, "type", "recaptcha");
        this.Oc = this.Qc = null;
        this.Wc = !1;
        this.ic = b;
        this.fd = null;
        g ? (Qm || (Qm = new Pm),
        g = Qm) : (Im || (Im = new Fm),
        g = Im);
        this.Zh = g;
        this.ub = c || {
            theme: "light",
            type: "image"
        };
        this.ea = [];
        if (this.ub.sitekey)
            throw new Q("argument-error","sitekey should not be provided for reCAPTCHA as one is automatically provisioned for the current project.");
        this.oe = "invisible" === this.ub.size;
        if (!p.document)
            throw new Q("operation-not-supported-in-this-environment","RecaptchaVerifier is only supported in a browser HTTP/HTTPS environment with DOM support.");
        if (!Tc(document, b) || !this.oe && Tc(document, b).hasChildNodes())
            throw new Q("argument-error","reCAPTCHA container is either not found or already contains inner elements!");
        this.i = new nl(a,f || null,e || null);
        this.cj = d || function() {
            return null
        }
        ;
        var h = this;
        this.Se = [];
        var l = this.ub.callback;
        this.ub.callback = function(q) {
            h.Xc(q);
            if ("function" === typeof l)
                l(q);
            else if ("string" === typeof l) {
                var A = O(l, p);
                "function" === typeof A && A(q)
            }
        }
        ;
        var n = this.ub["expired-callback"];
        this.ub["expired-callback"] = function() {
            h.Xc(null);
            if ("function" === typeof n)
                n();
            else if ("string" === typeof n) {
                var q = O(n, p);
                "function" === typeof q && q()
            }
        }
    };
    Rm.prototype.Xc = function(a) {
        for (var b = 0; b < this.Se.length; b++)
            try {
                this.Se[b](a)
            } catch (c) {}
    }
    ;
    var Sm = function(a, b) {
        Sa(a.Se, function(c) {
            return c == b
        })
    };
    k = Rm.prototype;
    k.l = function(a) {
        var b = this;
        this.ea.push(a);
        a.Wb(function() {
            Qa(b.ea, a)
        });
        return a
    }
    ;
    k.jd = function() {
        var a = this;
        return this.Qc ? this.Qc : this.Qc = this.l(G().then(function() {
            if (zj() && !rj())
                return mj();
            throw new Q("operation-not-supported-in-this-environment","RecaptchaVerifier is only supported in a browser HTTP/HTTPS environment.");
        }).then(function() {
            return a.Zh.Kh(a.cj())
        }).then(function(b) {
            a.fd = b;
            return R(a.i, km, {})
        }).then(function(b) {
            a.ub.sitekey = b.recaptchaSiteKey
        }).h(function(b) {
            a.Qc = null;
            throw b;
        }))
    }
    ;
    k.render = function() {
        Tm(this);
        var a = this;
        return this.l(this.jd().then(function() {
            if (null === a.Oc) {
                var b = a.ic;
                if (!a.oe) {
                    var c = Tc(document, b);
                    b = $c("DIV");
                    c.appendChild(b)
                }
                a.Oc = a.fd.render(b, a.ub)
            }
            return a.Oc
        }))
    }
    ;
    k.verify = function() {
        Tm(this);
        var a = this;
        return this.l(this.render().then(function(b) {
            return new F(function(c) {
                var d = a.fd.getResponse(b);
                if (d)
                    c(d);
                else {
                    var e = function(f) {
                        f && (Sm(a, e),
                        c(f))
                    };
                    a.Se.push(e);
                    a.oe && a.fd.execute(a.Oc)
                }
            }
            )
        }))
    }
    ;
    k.reset = function() {
        Tm(this);
        null !== this.Oc && this.fd.reset(this.Oc)
    }
    ;
    var Tm = function(a) {
        if (a.Wc)
            throw new Q("internal-error","RecaptchaVerifier instance has been destroyed.");
    };
    Rm.prototype.clear = function() {
        Tm(this);
        this.Wc = !0;
        this.Zh.Sg();
        for (var a = 0; a < this.ea.length; a++)
            this.ea[a].cancel("RecaptchaVerifier instance has been destroyed.");
        this.oe || cd(Tc(document, this.ic))
    }
    ;
    var Um = function(a, b, c) {
        var d = !1;
        try {
            this.o = c || firebase.app()
        } catch (g) {
            throw new Q("argument-error","No firebase.app.App instance is currently initialized.");
        }
        if (this.o.options && this.o.options.apiKey)
            c = this.o.options.apiKey;
        else
            throw new Q("invalid-api-key");
        var e = this
          , f = null;
        try {
            f = Ta(this.o.auth().da)
        } catch (g) {}
        try {
            d = this.o.auth().settings.appVerificationDisabledForTesting
        } catch (g) {}
        f = firebase.SDK_VERSION ? wj(firebase.SDK_VERSION, f) : null;
        Rm.call(this, c, a, b, function() {
            try {
                var g = e.o.auth().La
            } catch (h) {
                g = null
            }
            return g
        }, f, Xi(Yi), d)
    };
    u(Um, Rm);
    var Vm = function(a) {
        this.Md = a
    };
    Vm.prototype.postMessage = function(a, b) {
        this.Md.postMessage(a, b)
    }
    ;
    var Wm = function(a) {
        this.Tj = a;
        this.Tg = !1;
        this.ue = []
    };
    Wm.prototype.send = function(a, b, c) {
        b = void 0 === b ? null : b;
        c = void 0 === c ? !1 : c;
        var d = this, e;
        b = b || {};
        var f, g, h, l = null;
        if (this.Tg)
            return H(Error("connection_unavailable"));
        var n = c ? 800 : 50
          , q = "undefined" !== typeof MessageChannel ? new MessageChannel : null;
        return (new F(function(A, D) {
            q ? (e = "" + Math.floor(Math.random() * Math.pow(10, 20)).toString(),
            q.port1.start(),
            g = setTimeout(function() {
                D(Error("unsupported_event"))
            }, n),
            f = function(ca) {
                ca.data.eventId === e && ("ack" === ca.data.status ? (clearTimeout(g),
                h = setTimeout(function() {
                    D(Error("timeout"))
                }, 3E3)) : "done" === ca.data.status ? (clearTimeout(h),
                "undefined" !== typeof ca.data.response ? A(ca.data.response) : D(Error("unknown_error"))) : (clearTimeout(g),
                clearTimeout(h),
                D(Error("invalid_response"))))
            }
            ,
            l = {
                messageChannel: q,
                onMessage: f
            },
            d.ue.push(l),
            q.port1.addEventListener("message", f),
            d.Tj.postMessage({
                eventType: a,
                eventId: e,
                data: b
            }, [q.port2])) : D(Error("connection_unavailable"))
        }
        )).then(function(A) {
            Xm(d, l);
            return A
        }).h(function(A) {
            Xm(d, l);
            throw A;
        })
    }
    ;
    var Xm = function(a, b) {
        if (b) {
            var c = b.messageChannel
              , d = b.onMessage;
            c && (c.port1.removeEventListener("message", d),
            c.port1.close());
            Sa(a.ue, function(e) {
                return e == b
            })
        }
    };
    Wm.prototype.close = function() {
        for (; 0 < this.ue.length; )
            Xm(this, this.ue[0]);
        this.Tg = !0
    }
    ;
    var Ym = function(a) {
        this.uf = a;
        this.Ja = {};
        this.Lh = t(this.fj, this)
    }
      , $m = function() {
        var a = rj() ? self : null;
        w(Zm, function(c) {
            c.uf == a && (b = c)
        });
        if (!b) {
            var b = new Ym(a);
            Zm.push(b)
        }
        return b
    };
    Ym.prototype.fj = function(a) {
        var b = a.data.eventType
          , c = a.data.eventId
          , d = this.Ja[b];
        if (d && 0 < d.length) {
            a.ports[0].postMessage({
                status: "ack",
                eventId: c,
                eventType: b,
                response: null
            });
            var e = [];
            w(d, function(f) {
                e.push(G().then(function() {
                    return f(a.origin, a.data.data)
                }))
            });
            xe(e).then(function(f) {
                var g = [];
                w(f, function(h) {
                    g.push({
                        fulfilled: h.kh,
                        value: h.value,
                        reason: h.reason ? h.reason.message : void 0
                    })
                });
                w(g, function(h) {
                    for (var l in h)
                        "undefined" === typeof h[l] && delete h[l]
                });
                a.ports[0].postMessage({
                    status: "done",
                    eventId: c,
                    eventType: b,
                    response: g
                })
            })
        }
    }
    ;
    Ym.prototype.subscribe = function(a, b) {
        Za(this.Ja) && this.uf.addEventListener("message", this.Lh);
        "undefined" === typeof this.Ja[a] && (this.Ja[a] = []);
        this.Ja[a].push(b)
    }
    ;
    Ym.prototype.unsubscribe = function(a, b) {
        "undefined" !== typeof this.Ja[a] && b ? (Sa(this.Ja[a], function(c) {
            return c == b
        }),
        0 == this.Ja[a].length && delete this.Ja[a]) : b || delete this.Ja[a];
        Za(this.Ja) && this.uf.removeEventListener("message", this.Lh)
    }
    ;
    var Zm = [];
    var an = function(a) {
        this.Da = a || firebase.INTERNAL.reactNative && firebase.INTERNAL.reactNative.AsyncStorage;
        if (!this.Da)
            throw new Q("internal-error","The React Native compatibility library was not found.");
        this.type = "asyncStorage"
    };
    k = an.prototype;
    k.get = function(a) {
        return G(this.Da.getItem(a)).then(function(b) {
            return b && Ej(b)
        })
    }
    ;
    k.set = function(a, b) {
        return G(this.Da.setItem(a, Cj(b)))
    }
    ;
    k.remove = function(a) {
        return G(this.Da.removeItem(a))
    }
    ;
    k.nb = function() {}
    ;
    k.zb = function() {}
    ;
    function bn() {
        this.storage = {};
        this.type = "inMemory"
    }
    k = bn.prototype;
    k.get = function(a) {
        return G(this.storage[a])
    }
    ;
    k.set = function(a, b) {
        this.storage[a] = b;
        return G()
    }
    ;
    k.remove = function(a) {
        delete this.storage[a];
        return G()
    }
    ;
    k.nb = function() {}
    ;
    k.zb = function() {}
    ;
    var en = function() {
        if (!cn()) {
            if ("Node" == sj())
                throw new Q("internal-error","The LocalStorage compatibility library was not found.");
            throw new Q("web-storage-unsupported");
        }
        this.Da = dn() || firebase.INTERNAL.node.localStorage;
        this.type = "localStorage"
    }
      , dn = function() {
        try {
            var a = p.localStorage
              , b = xj();
            a && (a.setItem(b, "1"),
            a.removeItem(b));
            return a
        } catch (c) {
            return null
        }
    }
      , cn = function() {
        var a = "Node" == sj();
        a = dn() || a && firebase.INTERNAL.node && firebase.INTERNAL.node.localStorage;
        if (!a)
            return !1;
        try {
            return a.setItem("__sak", "1"),
            a.removeItem("__sak"),
            !0
        } catch (b) {
            return !1
        }
    };
    k = en.prototype;
    k.get = function(a) {
        var b = this;
        return G().then(function() {
            var c = b.Da.getItem(a);
            return Ej(c)
        })
    }
    ;
    k.set = function(a, b) {
        var c = this;
        return G().then(function() {
            var d = Cj(b);
            null === d ? c.remove(a) : c.Da.setItem(a, d)
        })
    }
    ;
    k.remove = function(a) {
        var b = this;
        return G().then(function() {
            b.Da.removeItem(a)
        })
    }
    ;
    k.nb = function(a) {
        p.window && C(p.window, "storage", a)
    }
    ;
    k.zb = function(a) {
        p.window && Hd(p.window, "storage", a)
    }
    ;
    var fn = function() {
        this.Da = {};
        this.type = "nullStorage"
    };
    k = fn.prototype;
    k.get = function() {
        return G(null)
    }
    ;
    k.set = function() {
        return G()
    }
    ;
    k.remove = function() {
        return G()
    }
    ;
    k.nb = function() {}
    ;
    k.zb = function() {}
    ;
    var jn = function() {
        if (!gn()) {
            if ("Node" == sj())
                throw new Q("internal-error","The SessionStorage compatibility library was not found.");
            throw new Q("web-storage-unsupported");
        }
        this.Da = hn() || firebase.INTERNAL.node.sessionStorage;
        this.type = "sessionStorage"
    }
      , hn = function() {
        try {
            var a = p.sessionStorage
              , b = xj();
            a && (a.setItem(b, "1"),
            a.removeItem(b));
            return a
        } catch (c) {
            return null
        }
    }
      , gn = function() {
        var a = "Node" == sj();
        a = hn() || a && firebase.INTERNAL.node && firebase.INTERNAL.node.sessionStorage;
        if (!a)
            return !1;
        try {
            return a.setItem("__sak", "1"),
            a.removeItem("__sak"),
            !0
        } catch (b) {
            return !1
        }
    };
    k = jn.prototype;
    k.get = function(a) {
        var b = this;
        return G().then(function() {
            var c = b.Da.getItem(a);
            return Ej(c)
        })
    }
    ;
    k.set = function(a, b) {
        var c = this;
        return G().then(function() {
            var d = Cj(b);
            null === d ? c.remove(a) : c.Da.setItem(a, d)
        })
    }
    ;
    k.remove = function(a) {
        var b = this;
        return G().then(function() {
            b.Da.removeItem(a)
        })
    }
    ;
    k.nb = function() {}
    ;
    k.zb = function() {}
    ;
    var mn = function() {
        if (!kn())
            throw new Q("web-storage-unsupported");
        this.ah = "firebaseLocalStorageDb";
        this.we = "firebaseLocalStorage";
        this.pf = "fbase_key";
        this.zi = "value";
        this.wk = 1;
        this.la = {};
        this.Ya = [];
        this.pd = 0;
        this.Ah = p.indexedDB;
        this.type = "indexedDB";
        this.Le = this.lg = this.Ae = this.ag = null;
        this.ei = !1;
        this.af = null;
        var a = this;
        rj() && self ? (this.lg = $m(),
        this.lg.subscribe("keyChanged", function(b, c) {
            return ln(a).then(function(d) {
                0 < d.length && w(a.Ya, function(e) {
                    e(d)
                });
                return {
                    keyProcessed: Pa(d, c.key)
                }
            })
        }),
        this.lg.subscribe("ping", function() {
            return G(["keyChanged"])
        })) : Nj().then(function(b) {
            if (a.af = b)
                a.Le = new Wm(new Vm(b)),
                a.Le.send("ping", null, !0).then(function(c) {
                    c[0].fulfilled && Pa(c[0].value, "keyChanged") && (a.ei = !0)
                }).h(function() {})
        })
    }, nn, on = function(a) {
        return new F(function(b, c) {
            var d = a.Ah.deleteDatabase(a.ah);
            d.onsuccess = function() {
                b()
            }
            ;
            d.onerror = function(e) {
                c(Error(e.target.error))
            }
        }
        )
    }, pn = function(a) {
        return new F(function(b, c) {
            var d = a.Ah.open(a.ah, a.wk);
            d.onerror = function(e) {
                try {
                    e.preventDefault()
                } catch (f) {}
                c(Error(e.target.error))
            }
            ;
            d.onupgradeneeded = function(e) {
                e = e.target.result;
                try {
                    e.createObjectStore(a.we, {
                        keyPath: a.pf
                    })
                } catch (f) {
                    c(f)
                }
            }
            ;
            d.onsuccess = function(e) {
                e = e.target.result;
                e.objectStoreNames.contains(a.we) ? b(e) : on(a).then(function() {
                    return pn(a)
                }).then(function(f) {
                    b(f)
                }).h(function(f) {
                    c(f)
                })
            }
        }
        )
    }, qn = function(a) {
        a.Hf || (a.Hf = pn(a));
        return a.Hf
    }, rn = function(a, b) {
        var c = 0
          , d = function(e, f) {
            qn(a).then(b).then(e).h(function(g) {
                if (3 < ++c)
                    f(g);
                else
                    return qn(a).then(function(h) {
                        h.close();
                        a.Hf = void 0;
                        return d(e, f)
                    }).h(function(h) {
                        f(h)
                    })
            })
        };
        return new F(d)
    }, kn = function() {
        try {
            return !!p.indexedDB
        } catch (a) {
            return !1
        }
    }, sn = function(a, b) {
        return b.objectStore(a.we)
    }, tn = function(a, b, c) {
        return b.transaction([a.we], c ? "readwrite" : "readonly")
    }, un = function(a) {
        return new F(function(b, c) {
            a.onsuccess = function(d) {
                d && d.target ? b(d.target.result) : b()
            }
            ;
            a.onerror = function(d) {
                c(d.target.error)
            }
        }
        )
    };
    mn.prototype.set = function(a, b) {
        var c = this
          , d = !1;
        return rn(this, function(e) {
            e = sn(c, tn(c, e, !0));
            return un(e.get(a))
        }).then(function(e) {
            return rn(c, function(f) {
                f = sn(c, tn(c, f, !0));
                if (e)
                    return e.value = b,
                    un(f.put(e));
                c.pd++;
                d = !0;
                var g = {};
                g[c.pf] = a;
                g[c.zi] = b;
                return un(f.add(g))
            })
        }).then(function() {
            c.la[a] = b;
            return vn(c, a)
        }).Wb(function() {
            d && c.pd--
        })
    }
    ;
    var vn = function(a, b) {
        return a.Le && a.af && Mj() === a.af ? a.Le.send("keyChanged", {
            key: b
        }, a.ei).then(function() {}).h(function() {}) : G()
    };
    mn.prototype.get = function(a) {
        var b = this;
        return rn(this, function(c) {
            return un(sn(b, tn(b, c, !1)).get(a))
        }).then(function(c) {
            return c && c.value
        })
    }
    ;
    mn.prototype.remove = function(a) {
        var b = !1
          , c = this;
        return rn(this, function(d) {
            b = !0;
            c.pd++;
            return un(sn(c, tn(c, d, !0))["delete"](a))
        }).then(function() {
            delete c.la[a];
            return vn(c, a)
        }).Wb(function() {
            b && c.pd--
        })
    }
    ;
    var ln = function(a) {
        return qn(a).then(function(b) {
            var c = sn(a, tn(a, b, !1));
            return c.getAll ? un(c.getAll()) : new F(function(d, e) {
                var f = []
                  , g = c.openCursor();
                g.onsuccess = function(h) {
                    (h = h.target.result) ? (f.push(h.value),
                    h["continue"]()) : d(f)
                }
                ;
                g.onerror = function(h) {
                    e(h.target.error)
                }
            }
            )
        }).then(function(b) {
            var c = {}
              , d = [];
            if (0 == a.pd) {
                for (d = 0; d < b.length; d++)
                    c[b[d][a.pf]] = b[d][a.zi];
                d = cj(a.la, c);
                a.la = c
            }
            return d
        })
    };
    mn.prototype.nb = function(a) {
        0 == this.Ya.length && this.zg();
        this.Ya.push(a)
    }
    ;
    mn.prototype.zb = function(a) {
        Sa(this.Ya, function(b) {
            return b == a
        });
        0 == this.Ya.length && this.Pe()
    }
    ;
    mn.prototype.zg = function() {
        var a = this;
        this.Pe();
        var b = function() {
            a.Ae = setTimeout(function() {
                a.ag = ln(a).then(function(c) {
                    0 < c.length && w(a.Ya, function(d) {
                        d(c)
                    })
                }).then(function() {
                    b()
                }).h(function(c) {
                    "STOP_EVENT" != c.message && b()
                })
            }, 800)
        };
        b()
    }
    ;
    mn.prototype.Pe = function() {
        this.ag && this.ag.cancel("STOP_EVENT");
        this.Ae && (clearTimeout(this.Ae),
        this.Ae = null)
    }
    ;
    function wn(a) {
        var b = this
          , c = null;
        this.Ya = [];
        this.type = "indexedDB";
        this.fh = a;
        this.Gg = G().then(function() {
            if (kn()) {
                var d = xj()
                  , e = "__sak" + d;
                nn || (nn = new mn);
                c = nn;
                return c.set(e, d).then(function() {
                    return c.get(e)
                }).then(function(f) {
                    if (f !== d)
                        throw Error("indexedDB not supported!");
                    return c.remove(e)
                }).then(function() {
                    return c
                }).h(function() {
                    return b.fh
                })
            }
            return b.fh
        }).then(function(d) {
            b.type = d.type;
            d.nb(function(e) {
                w(b.Ya, function(f) {
                    f(e)
                })
            });
            return d
        })
    }
    k = wn.prototype;
    k.get = function(a) {
        return this.Gg.then(function(b) {
            return b.get(a)
        })
    }
    ;
    k.set = function(a, b) {
        return this.Gg.then(function(c) {
            return c.set(a, b)
        })
    }
    ;
    k.remove = function(a) {
        return this.Gg.then(function(b) {
            return b.remove(a)
        })
    }
    ;
    k.nb = function(a) {
        this.Ya.push(a)
    }
    ;
    k.zb = function(a) {
        Sa(this.Ya, function(b) {
            return b == a
        })
    }
    ;
    var Bn = function() {
        this.sf = {
            Browser: xn,
            Node: yn,
            ReactNative: zn,
            Worker: An
        }[sj()]
    }, Cn, xn = {
        S: en,
        Qe: jn
    }, yn = {
        S: en,
        Qe: jn
    }, zn = {
        S: an,
        Qe: fn
    }, An = {
        S: en,
        Qe: fn
    };
    var Dn = function() {
        this.df = !1;
        Object.defineProperty(this, "appVerificationDisabled", {
            get: function() {
                return this.df
            },
            set: function(a) {
                this.df = a
            },
            enumerable: !1
        })
    };
    var En = function(a) {
        this.Jf(a)
    };
    En.prototype.Jf = function(a) {
        var b = a.url;
        if ("undefined" === typeof b)
            throw new Q("missing-continue-uri");
        if ("string" !== typeof b || "string" === typeof b && !b.length)
            throw new Q("invalid-continue-uri");
        this.jc = b;
        this.Jg = this.cf = null;
        this.Ch = !1;
        var c = a.android;
        if (c && "object" === typeof c) {
            b = c.packageName;
            var d = c.installApp;
            c = c.minimumVersion;
            if ("string" === typeof b && b.length) {
                this.cf = b;
                if ("undefined" !== typeof d && "boolean" !== typeof d)
                    throw new Q("argument-error","installApp property must be a boolean when specified.");
                this.Ch = !!d;
                if ("undefined" !== typeof c && ("string" !== typeof c || "string" === typeof c && !c.length))
                    throw new Q("argument-error","minimumVersion property must be a non empty string when specified.");
                this.Jg = c || null
            } else {
                if ("undefined" !== typeof b)
                    throw new Q("argument-error","packageName property must be a non empty string when specified.");
                if ("undefined" !== typeof d || "undefined" !== typeof c)
                    throw new Q("missing-android-pkg-name");
            }
        } else if ("undefined" !== typeof c)
            throw new Q("argument-error","android property must be a non null object when specified.");
        this.wh = null;
        if ((b = a.iOS) && "object" === typeof b)
            if (b = b.bundleId,
            "string" === typeof b && b.length)
                this.wh = b;
            else {
                if ("undefined" !== typeof b)
                    throw new Q("argument-error","bundleId property must be a non empty string when specified.");
            }
        else if ("undefined" !== typeof b)
            throw new Q("argument-error","iOS property must be a non null object when specified.");
        b = a.handleCodeInApp;
        if ("undefined" !== typeof b && "boolean" !== typeof b)
            throw new Q("argument-error","handleCodeInApp property must be a boolean when specified.");
        this.Qg = !!b;
        a = a.dynamicLinkDomain;
        if ("undefined" !== typeof a && ("string" !== typeof a || "string" === typeof a && !a.length))
            throw new Q("argument-error","dynamicLinkDomain property must be a non empty string when specified.");
        this.Pi = a || null
    }
    ;
    var Fn = function(a) {
        var b = {};
        b.continueUrl = a.jc;
        b.canHandleCodeInApp = a.Qg;
        if (b.androidPackageName = a.cf)
            b.androidMinimumVersion = a.Jg,
            b.androidInstallApp = a.Ch;
        b.iOSBundleId = a.wh;
        b.dynamicLinkDomain = a.Pi;
        for (var c in b)
            null === b[c] && delete b[c];
        return b
    };
    var Gn = function(a, b) {
        this.Oi = b;
        P(this, "verificationId", a)
    };
    Gn.prototype.confirm = function(a) {
        a = dl(this.verificationId, a);
        return this.Oi(a)
    }
    ;
    var Hn = function(a, b, c, d) {
        return (new $k(a)).verifyPhoneNumber(b, c).then(function(e) {
            return new Gn(e,d)
        })
    };
    var In = function(a, b, c) {
        this.Rj = a;
        this.dk = b;
        this.dj = c;
        this.te = 3E4;
        this.Ig = 96E4;
        this.ek = !1;
        this.Bc = null;
        this.Qb = this.te;
        if (this.Ig < this.te)
            throw Error("Proactive refresh lower bound greater than upper bound!");
    };
    In.prototype.start = function() {
        this.Qb = this.te;
        Jn(this, !0)
    }
    ;
    var Kn = function(a, b) {
        if (b)
            return a.Qb = a.te,
            a.dj();
        b = a.Qb;
        a.Qb *= 2;
        a.Qb > a.Ig && (a.Qb = a.Ig);
        return b
    }
      , Jn = function(a, b) {
        a.stop();
        a.Bc = Je(Kn(a, b)).then(function() {
            return a.ek ? G() : Jj()
        }).then(function() {
            return a.Rj()
        }).then(function() {
            Jn(a, !0)
        }).h(function(c) {
            a.dk(c) && Jn(a, !1)
        })
    };
    In.prototype.stop = function() {
        this.Bc && (this.Bc.cancel(),
        this.Bc = null)
    }
    ;
    var Rn = function(a) {
        var b = {};
        b["facebook.com"] = Ln;
        b["google.com"] = Mn;
        b["github.com"] = Nn;
        b["twitter.com"] = On;
        var c = a && a.providerId;
        try {
            if (c)
                return b[c] ? new b[c](a) : new Pn(a);
            if ("undefined" !== typeof a.idToken)
                return new Qn(a)
        } catch (d) {}
        return null
    }
      , Qn = function(a) {
        var b = a.providerId;
        if (!b && a.idToken) {
            var c = pk(a.idToken);
            c && c.kg && (b = c.kg)
        }
        if (!b)
            throw Error("Invalid additional user info!");
        if ("anonymous" == b || "custom" == b)
            b = null;
        c = !1;
        "undefined" !== typeof a.isNewUser ? c = !!a.isNewUser : "identitytoolkit#SignupNewUserResponse" === a.kind && (c = !0);
        P(this, "providerId", b);
        P(this, "isNewUser", c)
    }
      , Pn = function(a) {
        Qn.call(this, a);
        a = Ej(a.rawUserInfo || "{}");
        P(this, "profile", Vj(a || {}))
    };
    m(Pn, Qn);
    var Ln = function(a) {
        Pn.call(this, a);
        if ("facebook.com" != this.providerId)
            throw Error("Invalid provider ID!");
    };
    m(Ln, Pn);
    var Nn = function(a) {
        Pn.call(this, a);
        if ("github.com" != this.providerId)
            throw Error("Invalid provider ID!");
        P(this, "username", this.profile && this.profile.login || null)
    };
    m(Nn, Pn);
    var Mn = function(a) {
        Pn.call(this, a);
        if ("google.com" != this.providerId)
            throw Error("Invalid provider ID!");
    };
    m(Mn, Pn);
    var On = function(a) {
        Pn.call(this, a);
        if ("twitter.com" != this.providerId)
            throw Error("Invalid provider ID!");
        P(this, "username", a.screenName || null)
    };
    m(On, Pn);
    var Sn = {
        LOCAL: "local",
        NONE: "none",
        SESSION: "session"
    }, Tn = function(a) {
        var b = new Q("invalid-persistence-type")
          , c = new Q("unsupported-persistence-type");
        a: {
            for (d in Sn)
                if (Sn[d] == a) {
                    var d = !0;
                    break a
                }
            d = !1
        }
        if (!d || "string" !== typeof a)
            throw b;
        switch (sj()) {
        case "ReactNative":
            if ("session" === a)
                throw c;
            break;
        case "Node":
            if ("none" !== a)
                throw c;
            break;
        case "Worker":
            if ("session" === a || !kn() && "none" !== a)
                throw c;
            break;
        default:
            if (!yj() && "none" !== a)
                throw c;
        }
    }, Un = function() {
        var a = !Fj(Zi()) && qj() ? !0 : !1
          , b = Bj()
          , c = yj();
        this.Oh = "firebase";
        this.qg = ":";
        this.fk = a;
        this.ai = b;
        this.Ai = c;
        this.wa = {};
        Cn || (Cn = new Bn);
        a = Cn;
        try {
            this.Xh = !$i() && Lj() || !p.indexedDB ? new a.sf.S : new wn(rj() ? new bn : new a.sf.S)
        } catch (d) {
            this.Xh = new bn,
            this.ai = !0
        }
        try {
            this.pi = new a.sf.Qe
        } catch (d) {
            this.pi = new bn
        }
        this.uj = new bn;
        this.Ag = t(this.li, this);
        this.la = {}
    }, Vn, Wn = function() {
        Vn || (Vn = new Un);
        return Vn
    }, Xn = function(a, b) {
        switch (b) {
        case "session":
            return a.pi;
        case "none":
            return a.uj;
        default:
            return a.Xh
        }
    };
    Un.prototype.za = function(a, b) {
        return this.Oh + this.qg + a.name + (b ? this.qg + b : "")
    }
    ;
    var Yn = function(a, b, c) {
        var d = a.za(b, c)
          , e = Xn(a, b.S);
        return a.get(b, c).then(function(f) {
            var g = null;
            try {
                g = Ej(p.localStorage.getItem(d))
            } catch (h) {}
            if (g && !f)
                return p.localStorage.removeItem(d),
                a.set(b, g, c);
            g && f && "localStorage" != e.type && p.localStorage.removeItem(d)
        })
    };
    k = Un.prototype;
    k.get = function(a, b) {
        return Xn(this, a.S).get(this.za(a, b))
    }
    ;
    k.remove = function(a, b) {
        b = this.za(a, b);
        "local" == a.S && (this.la[b] = null);
        return Xn(this, a.S).remove(b)
    }
    ;
    k.set = function(a, b, c) {
        var d = this.za(a, c)
          , e = this
          , f = Xn(this, a.S);
        return f.set(d, b).then(function() {
            return f.get(d)
        }).then(function(g) {
            "local" == a.S && (e.la[d] = g)
        })
    }
    ;
    k.addListener = function(a, b, c) {
        a = this.za(a, b);
        this.Ai && (this.la[a] = p.localStorage.getItem(a));
        Za(this.wa) && this.zg();
        this.wa[a] || (this.wa[a] = []);
        this.wa[a].push(c)
    }
    ;
    k.removeListener = function(a, b, c) {
        a = this.za(a, b);
        this.wa[a] && (Sa(this.wa[a], function(d) {
            return d == c
        }),
        0 == this.wa[a].length && delete this.wa[a]);
        Za(this.wa) && this.Pe()
    }
    ;
    k.zg = function() {
        Xn(this, "local").nb(this.Ag);
        this.ai || ($i() || !Lj()) && p.indexedDB || !this.Ai || Zn(this)
    }
    ;
    var Zn = function(a) {
        $n(a);
        a.Rf = setInterval(function() {
            for (var b in a.wa) {
                var c = p.localStorage.getItem(b)
                  , d = a.la[b];
                c != d && (a.la[b] = c,
                c = new B({
                    type: "storage",
                    key: b,
                    target: window,
                    oldValue: d,
                    newValue: c,
                    Zf: !0
                }),
                a.li(c))
            }
        }, 1E3)
    }
      , $n = function(a) {
        a.Rf && (clearInterval(a.Rf),
        a.Rf = null)
    };
    Un.prototype.Pe = function() {
        Xn(this, "local").zb(this.Ag);
        $n(this)
    }
    ;
    Un.prototype.li = function(a) {
        if (a && a.Zi) {
            var b = a.Y.key;
            if (null == b)
                for (var c in this.wa) {
                    var d = this.la[c];
                    "undefined" === typeof d && (d = null);
                    var e = p.localStorage.getItem(c);
                    e !== d && (this.la[c] = e,
                    this.kf(c))
                }
            else if (0 == b.indexOf(this.Oh + this.qg) && this.wa[b]) {
                "undefined" !== typeof a.Y.Zf ? Xn(this, "local").zb(this.Ag) : $n(this);
                if (this.fk)
                    if (c = p.localStorage.getItem(b),
                    d = a.Y.newValue,
                    d !== c)
                        null !== d ? p.localStorage.setItem(b, d) : p.localStorage.removeItem(b);
                    else if (this.la[b] === d && "undefined" === typeof a.Y.Zf)
                        return;
                var f = this;
                c = function() {
                    if ("undefined" !== typeof a.Y.Zf || f.la[b] !== p.localStorage.getItem(b))
                        f.la[b] = p.localStorage.getItem(b),
                        f.kf(b)
                }
                ;
                z && Pc && 10 == Pc && p.localStorage.getItem(b) !== a.Y.newValue && a.Y.newValue !== a.Y.oldValue ? setTimeout(c, 10) : c()
            }
        } else
            w(a, t(this.kf, this))
    }
    ;
    Un.prototype.kf = function(a) {
        this.wa[a] && w(this.wa[a], function(b) {
            b()
        })
    }
    ;
    var ao = function(a) {
        this.D = a;
        this.v = Wn()
    }
      , co = function(a) {
        return a.v.get(bo, a.D).then(function(b) {
            return dk(b)
        })
    };
    ao.prototype.cc = function(a) {
        this.v.addListener(bo, this.D, a)
    }
    ;
    ao.prototype.zd = function(a) {
        this.v.removeListener(bo, this.D, a)
    }
    ;
    var bo = {
        name: "authEvent",
        S: "local"
    };
    var eo = function() {
        this.v = Wn()
    };
    eo.prototype.ed = function() {
        return this.v.get(fo, void 0)
    }
    ;
    var fo = {
        name: "sessionId",
        S: "session"
    };
    var go = function() {
        this.Tf = null;
        this.Sd = []
    };
    go.prototype.subscribe = function(a) {
        var b = this;
        this.Sd.push(a);
        this.Tf || (this.Tf = function(c) {
            for (var d = 0; d < b.Sd.length; d++)
                b.Sd[d](c)
        }
        ,
        a = O("universalLinks.subscribe", p),
        "function" === typeof a && a(null, this.Tf))
    }
    ;
    go.prototype.unsubscribe = function(a) {
        Sa(this.Sd, function(b) {
            return b == a
        })
    }
    ;
    var ho = null;
    var io = function(a, b, c, d, e, f) {
        this.T = a;
        this.K = b;
        this.I = c;
        this.m = f;
        this.Db = d || null;
        this.ra = e || null;
        this.mi = b + ":" + c;
        this.gk = new eo;
        this.mh = new ao(this.mi);
        this.If = null;
        this.Za = [];
        this.yj = 500;
        this.Vj = 2E3;
        this.hd = this.ze = null
    }
      , jo = function(a) {
        return new Q("invalid-cordova-configuration",a)
    };
    io.prototype.Ob = function() {
        return this.jd ? this.jd : this.jd = oj().then(function() {
            if ("function" !== typeof O("universalLinks.subscribe", p))
                throw jo("cordova-universal-links-plugin-fix is not installed");
            if ("undefined" === typeof O("BuildInfo.packageName", p))
                throw jo("cordova-plugin-buildinfo is not installed");
            if ("function" !== typeof O("cordova.plugins.browsertab.openUrl", p))
                throw jo("cordova-plugin-browsertab is not installed");
            if ("function" !== typeof O("cordova.InAppBrowser.open", p))
                throw jo("cordova-plugin-inappbrowser is not installed");
        }, function() {
            throw new Q("cordova-not-ready");
        })
    }
    ;
    var ko = function() {
        for (var a = 20, b = []; 0 < a; )
            b.push("1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".charAt(Math.floor(62 * Math.random()))),
            a--;
        return b.join("")
    }
      , lo = function(a) {
        var b = new bi;
        b.update(a);
        return Oh(b.digest())
    };
    k = io.prototype;
    k.Dd = function(a, b) {
        b(new Q("operation-not-supported-in-this-environment"));
        return G()
    }
    ;
    k.sd = function() {
        return H(new Q("operation-not-supported-in-this-environment"))
    }
    ;
    k.si = function() {
        return !1
    }
    ;
    k.ki = function() {
        return !0
    }
    ;
    k.th = function() {
        return !0
    }
    ;
    k.td = function(a, b, c, d) {
        if (this.ze)
            return H(new Q("redirect-operation-pending"));
        var e = this
          , f = p.document
          , g = null
          , h = null
          , l = null
          , n = null;
        return this.ze = G().then(function() {
            fl(b);
            return mo(e)
        }).then(function() {
            return no(e, a, b, c, d)
        }).then(function() {
            return (new F(function(q, A) {
                h = function() {
                    var D = O("cordova.plugins.browsertab.close", p);
                    q();
                    "function" === typeof D && D();
                    e.hd && "function" === typeof e.hd.close && (e.hd.close(),
                    e.hd = null);
                    return !1
                }
                ;
                e.cc(h);
                l = function() {
                    g || (g = Je(e.Vj).then(function() {
                        A(new Q("redirect-cancelled-by-user"))
                    }))
                }
                ;
                n = function() {
                    Ij() && l()
                }
                ;
                f.addEventListener("resume", l, !1);
                Zi().toLowerCase().match(/android/) || f.addEventListener("visibilitychange", n, !1)
            }
            )).h(function(q) {
                return oo(e).then(function() {
                    throw q;
                })
            })
        }).Wb(function() {
            l && f.removeEventListener("resume", l, !1);
            n && f.removeEventListener("visibilitychange", n, !1);
            g && g.cancel();
            h && e.zd(h);
            e.ze = null
        })
    }
    ;
    var no = function(a, b, c, d, e) {
        var f = ko()
          , g = new ck(b,d,null,f,new Q("no-auth-event"),null,e)
          , h = O("BuildInfo.packageName", p);
        if ("string" !== typeof h)
            throw new Q("invalid-cordova-configuration");
        var l = O("BuildInfo.displayName", p)
          , n = {};
        if (Zi().toLowerCase().match(/iphone|ipad|ipod/))
            n.ibi = h;
        else if (Zi().toLowerCase().match(/android/))
            n.apn = h;
        else
            return H(new Q("operation-not-supported-in-this-environment"));
        l && (n.appDisplayName = l);
        f = lo(f);
        n.sessionId = f;
        var q = Dm(a.T, a.K, a.I, b, c, null, d, a.Db, n, a.ra, e, a.m);
        return a.Ob().then(function() {
            var A = a.mi;
            return a.gk.v.set(bo, g.A(), A)
        }).then(function() {
            var A = O("cordova.plugins.browsertab.isAvailable", p);
            if ("function" !== typeof A)
                throw new Q("invalid-cordova-configuration");
            var D = null;
            A(function(ca) {
                if (ca) {
                    D = O("cordova.plugins.browsertab.openUrl", p);
                    if ("function" !== typeof D)
                        throw new Q("invalid-cordova-configuration");
                    D(q)
                } else {
                    D = O("cordova.InAppBrowser.open", p);
                    if ("function" !== typeof D)
                        throw new Q("invalid-cordova-configuration");
                    ca = D;
                    var fb = Zi();
                    fb = !(!fb.match(/(iPad|iPhone|iPod).*OS 7_\d/i) && !fb.match(/(iPad|iPhone|iPod).*OS 8_\d/i));
                    a.hd = ca(q, fb ? "_blank" : "_system", "location=yes")
                }
            })
        })
    };
    io.prototype.Xc = function(a) {
        for (var b = 0; b < this.Za.length; b++)
            try {
                this.Za[b](a)
            } catch (c) {}
    }
    ;
    var mo = function(a) {
        a.If || (a.If = a.Ob().then(function() {
            return new F(function(b) {
                var c = function(d) {
                    b(d);
                    a.zd(c);
                    return !1
                };
                a.cc(c);
                po(a)
            }
            )
        }));
        return a.If
    }
      , oo = function(a) {
        var b = null;
        return co(a.mh).then(function(c) {
            b = c;
            c = a.mh;
            return c.v.remove(bo, c.D)
        }).then(function() {
            return b
        })
    }
      , po = function(a) {
        var b = new ck("unknown",null,null,null,new Q("no-auth-event"))
          , c = !1
          , d = Je(a.yj).then(function() {
            return oo(a).then(function() {
                c || a.Xc(b)
            })
        })
          , e = function(g) {
            c = !0;
            d && d.cancel();
            oo(a).then(function(h) {
                var l = b;
                if (h && g && g.url) {
                    var n = null;
                    l = lk(g.url);
                    -1 != l.indexOf("/__/auth/callback") && (n = Hf(l),
                    n = Ej(Gf(n, "firebaseError") || null),
                    n = (n = "object" === typeof n ? bk(n) : null) ? new ck(h.getType(),h.ca,null,null,n,null,h.Aa()) : new ck(h.getType(),h.ca,l,h.ed(),null,null,h.Aa()));
                    l = n || b
                }
                a.Xc(l)
            })
        }
          , f = p.handleOpenURL;
        p.handleOpenURL = function(g) {
            0 == g.toLowerCase().indexOf(O("BuildInfo.packageName", p).toLowerCase() + "://") && e({
                url: g
            });
            if ("function" === typeof f)
                try {
                    f(g)
                } catch (h) {
                    console.error(h)
                }
        }
        ;
        ho || (ho = new go);
        ho.subscribe(e)
    };
    io.prototype.cc = function(a) {
        this.Za.push(a);
        mo(this).h(function(b) {
            "auth/invalid-cordova-configuration" === b.code && (b = new ck("unknown",null,null,null,new Q("no-auth-event")),
            a(b))
        })
    }
    ;
    io.prototype.zd = function(a) {
        Sa(this.Za, function(b) {
            return b == a
        })
    }
    ;
    var qo = function(a) {
        this.D = a;
        this.v = Wn()
    }
      , so = function(a) {
        return a.v.set(ro, "pending", a.D)
    }
      , to = function(a) {
        return a.v.remove(ro, a.D)
    }
      , uo = function(a) {
        return a.v.get(ro, a.D).then(function(b) {
            return "pending" == b
        })
    }
      , ro = {
        name: "pendingRedirect",
        S: "session"
    };
    var zo = function(a, b, c, d) {
        this.Be = {};
        this.Pf = 0;
        this.T = a;
        this.K = b;
        this.I = c;
        this.m = d;
        this.Fd = [];
        this.uc = !1;
        this.ff = t(this.Bf, this);
        this.vb = new vo(this);
        this.bg = new wo(this);
        this.qd = new qo(xo(this.K, this.I));
        this.Ab = {};
        this.Ab.unknown = this.vb;
        this.Ab.signInViaRedirect = this.vb;
        this.Ab.linkViaRedirect = this.vb;
        this.Ab.reauthViaRedirect = this.vb;
        this.Ab.signInViaPopup = this.bg;
        this.Ab.linkViaPopup = this.bg;
        this.Ab.reauthViaPopup = this.bg;
        this.Ba = yo(this.T, this.K, this.I, Yi, this.m)
    }
      , yo = function(a, b, c, d, e) {
        var f = firebase.SDK_VERSION || null;
        return nj() ? new io(a,b,c,f,d,e) : new ym(a,b,c,f,d,e)
    };
    zo.prototype.reset = function() {
        this.uc = !1;
        this.Ba.zd(this.ff);
        this.Ba = yo(this.T, this.K, this.I, null, this.m);
        this.Be = {}
    }
    ;
    zo.prototype.hc = function() {
        this.vb.hc()
    }
    ;
    zo.prototype.initialize = function() {
        var a = this;
        this.uc || (this.uc = !0,
        this.Ba.cc(this.ff));
        var b = this.Ba;
        return this.Ba.Ob().h(function(c) {
            a.Ba == b && a.reset();
            throw c;
        })
    }
    ;
    var Co = function(a) {
        a.Ba.ki() && a.initialize().h(function(b) {
            var c = new ck("unknown",null,null,null,new Q("operation-not-supported-in-this-environment"));
            Ao(b) && a.Bf(c)
        });
        a.Ba.th() || Bo(a.vb)
    };
    k = zo.prototype;
    k.subscribe = function(a) {
        Pa(this.Fd, a) || this.Fd.push(a);
        if (!this.uc) {
            var b = this;
            uo(this.qd).then(function(c) {
                c ? to(b.qd).then(function() {
                    b.initialize().h(function(d) {
                        var e = new ck("unknown",null,null,null,new Q("operation-not-supported-in-this-environment"));
                        Ao(d) && b.Bf(e)
                    })
                }) : Co(b)
            }).h(function() {
                Co(b)
            })
        }
    }
    ;
    k.unsubscribe = function(a) {
        Sa(this.Fd, function(b) {
            return b == a
        })
    }
    ;
    k.Bf = function(a) {
        if (!a)
            throw new Q("invalid-auth-event");
        6E5 <= Date.now() - this.Pf && (this.Be = {},
        this.Pf = 0);
        if (a && a.getUid() && this.Be.hasOwnProperty(a.getUid()))
            return !1;
        for (var b = !1, c = 0; c < this.Fd.length; c++) {
            var d = this.Fd[c];
            if (d.Pg(a.getType(), a.ca)) {
                if (b = this.Ab[a.getType()])
                    b.Yh(a, d),
                    a && (a.ed() || a.ca) && (this.Be[a.getUid()] = !0,
                    this.Pf = Date.now());
                b = !0;
                break
            }
        }
        Bo(this.vb);
        return b
    }
    ;
    k.getRedirectResult = function() {
        return this.vb.getRedirectResult()
    }
    ;
    k.sd = function(a, b, c, d, e, f) {
        var g = this;
        return this.Ba.sd(a, b, c, function() {
            g.uc || (g.uc = !0,
            g.Ba.cc(g.ff))
        }, function() {
            g.reset()
        }, d, e, f)
    }
    ;
    var Ao = function(a) {
        return a && "auth/cordova-not-ready" == a.code ? !0 : !1
    };
    zo.prototype.td = function(a, b, c, d) {
        var e = this, f;
        return so(this.qd).then(function() {
            return e.Ba.td(a, b, c, d).h(function(g) {
                if (Ao(g))
                    throw new Q("operation-not-supported-in-this-environment");
                f = g;
                return to(e.qd).then(function() {
                    throw f;
                })
            }).then(function() {
                return e.Ba.si() ? new F(function() {}
                ) : to(e.qd).then(function() {
                    return e.getRedirectResult()
                }).then(function() {}).h(function() {})
            })
        })
    }
    ;
    zo.prototype.Dd = function(a, b, c, d) {
        return this.Ba.Dd(c, function(e) {
            a.Vb(b, null, e, d)
        }, Do.get())
    }
    ;
    var xo = function(a, b, c) {
        a = a + ":" + b;
        c && (a = a + ":" + c.url);
        return a
    }
      , Fo = function(a, b, c, d) {
        var e = xo(b, c, d);
        Eo[e] || (Eo[e] = new zo(a,b,c,d));
        return Eo[e]
    }
      , Do = new Hj(2E3,1E4)
      , Go = new Hj(3E4,6E4)
      , Eo = {}
      , vo = function(a) {
        this.v = a;
        this.Hc = null;
        this.xd = [];
        this.wd = [];
        this.Gc = null;
        this.ui = this.yd = !1
    };
    vo.prototype.reset = function() {
        this.Hc = null;
        this.Gc && (this.Gc.cancel(),
        this.Gc = null)
    }
    ;
    vo.prototype.Yh = function(a, b) {
        if (a) {
            this.reset();
            this.yd = !0;
            var c = a.getType()
              , d = a.ca
              , e = a.getError() && "auth/web-storage-unsupported" == a.getError().code
              , f = a.getError() && "auth/operation-not-supported-in-this-environment" == a.getError().code;
            this.ui = !(!e && !f);
            "unknown" != c || e || f ? a.Ga ? this.ig(a, b) : b.Zc(c, d) ? this.jg(a, b) : H(new Q("invalid-auth-event")) : (Ho(this, !1, null, null),
            G())
        } else
            H(new Q("invalid-auth-event"))
    }
    ;
    var Bo = function(a) {
        a.yd || (a.yd = !0,
        Ho(a, !1, null, null))
    };
    vo.prototype.hc = function() {
        this.yd && !this.ui && Ho(this, !1, null, null)
    }
    ;
    vo.prototype.ig = function(a) {
        Ho(this, !0, null, a.getError());
        G()
    }
    ;
    vo.prototype.jg = function(a, b) {
        var c = this
          , d = a.ca
          , e = a.getType();
        b = b.Zc(e, d);
        d = a.Lc;
        e = a.ed();
        var f = a.cg
          , g = a.Aa()
          , h = !!a.getType().match(/Redirect$/);
        b(d, e, g, f).then(function(l) {
            Ho(c, h, l, null)
        }).h(function(l) {
            Ho(c, h, null, l)
        })
    }
    ;
    var Io = function(a, b) {
        a.Hc = function() {
            return H(b)
        }
        ;
        if (a.wd.length)
            for (var c = 0; c < a.wd.length; c++)
                a.wd[c](b)
    }
      , Jo = function(a, b) {
        a.Hc = function() {
            return G(b)
        }
        ;
        if (a.xd.length)
            for (var c = 0; c < a.xd.length; c++)
                a.xd[c](b)
    }
      , Ho = function(a, b, c, d) {
        b ? d ? Io(a, d) : Jo(a, c) : Jo(a, {
            user: null
        });
        a.xd = [];
        a.wd = []
    };
    vo.prototype.getRedirectResult = function() {
        var a = this;
        return new F(function(b, c) {
            a.Hc ? a.Hc().then(b, c) : (a.xd.push(b),
            a.wd.push(c),
            Ko(a))
        }
        )
    }
    ;
    var Ko = function(a) {
        var b = new Q("timeout");
        a.Gc && a.Gc.cancel();
        a.Gc = Je(Go.get()).then(function() {
            a.Hc || (a.yd = !0,
            Ho(a, !0, null, b))
        })
    }
      , wo = function(a) {
        this.v = a
    };
    wo.prototype.Yh = function(a, b) {
        if (a) {
            var c = a.getType()
              , d = a.ca;
            a.Ga ? this.ig(a, b) : b.Zc(c, d) ? this.jg(a, b) : H(new Q("invalid-auth-event"))
        } else
            H(new Q("invalid-auth-event"))
    }
    ;
    wo.prototype.ig = function(a, b) {
        var c = a.ca
          , d = a.getType();
        b.Vb(d, null, a.getError(), c);
        G()
    }
    ;
    wo.prototype.jg = function(a, b) {
        var c = a.ca
          , d = a.getType()
          , e = b.Zc(d, c)
          , f = a.Lc
          , g = a.ed();
        e(f, g, a.Aa(), a.cg).then(function(h) {
            b.Vb(d, h, null, c)
        }).h(function(h) {
            b.Vb(d, null, h, c)
        })
    }
    ;
    var Lo = function(a, b, c) {
        var d = b && b.mfaPendingCredential;
        if (!d)
            throw new Q("argument-error","Internal assert: Invalid MultiFactorResolver");
        this.Cb = a;
        this.Qi = $a(b);
        this.Oj = c;
        this.fi = new rk(null,d);
        this.uh = [];
        var e = this;
        w(b.mfaInfo || [], function(f) {
            (f = gk(f)) && e.uh.push(f)
        });
        P(this, "auth", this.Cb);
        P(this, "session", this.fi);
        P(this, "hints", this.uh)
    };
    Lo.prototype.resolveSignIn = function(a) {
        var b = this;
        return a.process(this.Cb.i, this.fi).then(function(c) {
            var d = $a(b.Qi);
            delete d.mfaInfo;
            delete d.mfaPendingCredential;
            bb(d, c);
            return b.Oj(d)
        })
    }
    ;
    var Mo = function(a, b, c, d) {
        Q.call(this, "multi-factor-auth-required", d, b);
        this.ck = new Lo(a,b,c);
        P(this, "resolver", this.ck)
    };
    m(Mo, Q);
    var No = function(a, b, c) {
        if (a && r(a.serverResponse) && "auth/multi-factor-auth-required" === a.code)
            try {
                return new Mo(b,a.serverResponse,c,a.message)
            } catch (d) {}
        return null
    };
    var Oo = function() {};
    Oo.prototype.process = function(a, b, c) {
        return "enroll" == b.type ? Po(this, a, b, c) : Qo(this, a, b)
    }
    ;
    var Po = function(a, b, c, d) {
        return c.dd().then(function(e) {
            e = {
                idToken: e
            };
            "undefined" !== typeof d && (e.displayName = d);
            bb(e, {
                phoneVerificationInfo: Wk(a.Vf)
            });
            return R(b, hm, e)
        })
    }
      , Qo = function(a, b, c) {
        return c.dd().then(function(d) {
            d = {
                mfaPendingCredential: d
            };
            bb(d, {
                phoneVerificationInfo: Wk(a.Vf)
            });
            return R(b, im, d)
        })
    }
      , Ro = function(a) {
        P(this, "factorId", a.providerId);
        this.Vf = a
    };
    u(Ro, Oo);
    var So = function(a) {
        Ro.call(this, a);
        if (this.Vf.providerId != $k.PROVIDER_ID)
            throw new Q("argument-error","firebase.auth.PhoneMultiFactorAssertion requires a valid firebase.auth.PhoneAuthCredential");
    };
    u(So, Ro);
    var To = function(a, b) {
        md.call(this, a);
        for (var c in b)
            this[c] = b[c]
    };
    m(To, md);
    var Vo = function(a, b) {
        this.lb = a;
        this.Wd = [];
        this.uk = t(this.pj, this);
        C(this.lb, "userReloaded", this.uk);
        var c = [];
        b && b.multiFactor && b.multiFactor.enrolledFactors && w(b.multiFactor.enrolledFactors, function(d) {
            var e = null
              , f = {};
            if (d) {
                d.uid && (f.mfaEnrollmentId = d.uid);
                d.displayName && (f.displayName = d.displayName);
                d.enrollmentTime && (f.enrolledAt = (new Date(d.enrollmentTime)).toISOString());
                d.phoneNumber && (f.phoneInfo = d.phoneNumber);
                try {
                    e = new fk(f)
                } catch (g) {}
                d = e
            } else
                d = null;
            d && c.push(d)
        });
        Uo(this, c)
    }
      , Wo = function(a) {
        var b = [];
        w(a.mfaInfo || [], function(c) {
            (c = gk(c)) && b.push(c)
        });
        return b
    };
    Vo.prototype.pj = function(a) {
        Uo(this, Wo(a.vk))
    }
    ;
    var Uo = function(a, b) {
        a.Wd = b;
        P(a, "enrolledFactors", b)
    };
    k = Vo.prototype;
    k.copy = function(a) {
        Uo(this, a.Wd)
    }
    ;
    k.getSession = function() {
        return this.lb.getIdToken().then(function(a) {
            return new rk(a,null)
        })
    }
    ;
    k.enroll = function(a, b) {
        var c = this
          , d = this.lb.i;
        return this.getSession().then(function(e) {
            return a.process(d, e, b)
        }).then(function(e) {
            Xo(c.lb, e);
            return c.lb.reload()
        })
    }
    ;
    k.unenroll = function(a) {
        var b = this
          , c = "string" === typeof a ? a : a.uid
          , d = this.lb.i;
        return this.lb.getIdToken().then(function(e) {
            return R(d, mm, {
                idToken: e,
                mfaEnrollmentId: c
            })
        }).then(function(e) {
            var f = Ma(b.Wd, function(g) {
                return g.uid != c
            });
            Uo(b, f);
            Xo(b.lb, e);
            return b.lb.reload().h(function(g) {
                if ("auth/user-token-expired" != g.code)
                    throw g;
            })
        })
    }
    ;
    k.A = function() {
        return {
            multiFactor: {
                enrolledFactors: Na(this.Wd, function(a) {
                    return a.A()
                })
            }
        }
    }
    ;
    var Yo = function(a) {
        this.i = a;
        this.oa = this.ma = null;
        this.nc = Date.now()
    };
    Yo.prototype.A = function() {
        return {
            apiKey: this.i.Ib(),
            refreshToken: this.ma,
            accessToken: this.oa && this.oa.toString(),
            expirationTime: this.nc
        }
    }
    ;
    var Zo = function(a, b) {
        "undefined" === typeof b && (a.oa ? (b = a.oa,
        b = b.wf - b.rj) : b = 0);
        a.nc = Date.now() + 1E3 * b
    }
      , $o = function(a, b) {
        a.oa = pk(b.idToken || "");
        a.ma = b.refreshToken;
        b = b.expiresIn;
        Zo(a, "undefined" !== typeof b ? Number(b) : void 0)
    };
    Yo.prototype.copy = function(a) {
        this.oa = a.oa;
        this.ma = a.ma;
        this.nc = a.nc
    }
    ;
    var ap = function(a, b) {
        return xl(a.i, b).then(function(c) {
            a.oa = pk(c.access_token);
            a.ma = c.refresh_token;
            Zo(a, c.expires_in);
            return {
                accessToken: a.oa.toString(),
                refreshToken: a.ma
            }
        }).h(function(c) {
            "auth/user-token-expired" == c.code && (a.ma = null);
            throw c;
        })
    };
    Yo.prototype.getToken = function(a) {
        a = !!a;
        return this.oa && !this.ma ? H(new Q("user-token-expired")) : a || !this.oa || Date.now() > this.nc - 3E4 ? this.ma ? ap(this, {
            grant_type: "refresh_token",
            refresh_token: this.ma
        }) : G(null) : G({
            accessToken: this.oa.toString(),
            refreshToken: this.ma
        })
    }
    ;
    var bp = function(a, b) {
        this.Wg = a || null;
        this.Ih = b || null;
        Sj(this, {
            lastSignInTime: Kj(b || null),
            creationTime: Kj(a || null)
        })
    };
    bp.prototype.clone = function() {
        return new bp(this.Wg,this.Ih)
    }
    ;
    bp.prototype.A = function() {
        return {
            lastLoginAt: this.Ih,
            createdAt: this.Wg
        }
    }
    ;
    var cp = function(a, b, c, d, e, f) {
        Sj(this, {
            uid: a,
            displayName: d || null,
            photoURL: e || null,
            email: c || null,
            phoneNumber: f || null,
            providerId: b
        })
    }
      , S = function(a, b, c) {
        E.call(this);
        this.ea = [];
        this.K = a.apiKey;
        this.I = a.appName;
        this.T = a.authDomain || null;
        var d = firebase.SDK_VERSION ? wj(firebase.SDK_VERSION) : null;
        this.i = new nl(this.K,Xi(Yi),d);
        (this.m = a.emulatorConfig || null) && rl(this.i, this.m);
        this.Ra = new Yo(this.i);
        dp(this, b.idToken);
        $o(this.Ra, b);
        P(this, "refreshToken", this.Ra.ma);
        ep(this, c || {});
        this.rd = !1;
        this.T && Aj() && (this.C = Fo(this.T, this.K, this.I, this.m));
        this.Oe = [];
        this.Sa = null;
        this.Ec = fp(this);
        this.Nc = t(this.Df, this);
        var e = this;
        this.La = null;
        this.Th = function(f) {
            e.Jc(f.languageCode)
        }
        ;
        this.Nf = null;
        this.Rh = function(f) {
            gp(e, f.emulatorConfig)
        }
        ;
        this.rf = null;
        this.da = [];
        this.Sh = function(f) {
            hp(e, f.Yi)
        }
        ;
        this.yf = null;
        this.ve = new Vo(this,c);
        P(this, "multiFactor", this.ve)
    };
    m(S, E);
    S.prototype.Jc = function(a) {
        this.La = a;
        pl(this.i, a)
    }
    ;
    var gp = function(a, b) {
        a.m = b;
        rl(a.i, b);
        a.C && (b = a.C,
        a.C = Fo(a.T, a.K, a.I, a.m),
        a.rd && (b.unsubscribe(a),
        a.C.subscribe(a)))
    }
      , ip = function(a, b) {
        a.Nf && Hd(a.Nf, "languageCodeChanged", a.Th);
        (a.Nf = b) && C(b, "languageCodeChanged", a.Th)
    }
      , jp = function(a, b) {
        a.rf && Hd(a.rf, "emulatorConfigChanged", a.Rh);
        (a.rf = b) && C(b, "emulatorConfigChanged", a.Rh)
    }
      , hp = function(a, b) {
        a.da = b;
        sl(a.i, firebase.SDK_VERSION ? wj(firebase.SDK_VERSION, a.da) : null)
    }
      , kp = function(a, b) {
        a.yf && Hd(a.yf, "frameworkChanged", a.Sh);
        (a.yf = b) && C(b, "frameworkChanged", a.Sh)
    };
    S.prototype.Df = function() {
        this.Ec.Bc && (this.Ec.stop(),
        this.Ec.start())
    }
    ;
    var lp = function(a) {
        try {
            return firebase.app(a.I).auth()
        } catch (b) {
            throw new Q("internal-error","No firebase.auth.Auth instance is available for the Firebase App '" + a.I + "'!");
        }
    };
    S.prototype.Ib = function() {
        return this.K
    }
    ;
    var fp = function(a) {
        return new In(function() {
            return a.getIdToken(!0)
        }
        ,function(b) {
            return b && "auth/network-request-failed" == b.code ? !0 : !1
        }
        ,function() {
            var b = a.Ra.nc - Date.now() - 3E5;
            return 0 < b ? b : 0
        }
        )
    }
      , mp = function(a) {
        a.Wc || a.Ec.Bc || (a.Ec.start(),
        Hd(a, "tokenChanged", a.Nc),
        C(a, "tokenChanged", a.Nc))
    }
      , np = function(a) {
        Hd(a, "tokenChanged", a.Nc);
        a.Ec.stop()
    }
      , dp = function(a, b) {
        a.Hh = b;
        P(a, "_lat", b)
    }
      , op = function(a, b) {
        Sa(a.Oe, function(c) {
            return c == b
        })
    }
      , pp = function(a) {
        for (var b = [], c = 0; c < a.Oe.length; c++)
            b.push(a.Oe[c](a));
        return xe(b).then(function() {
            return a
        })
    }
      , qp = function(a) {
        a.C && !a.rd && (a.rd = !0,
        a.C.subscribe(a))
    }
      , ep = function(a, b) {
        Sj(a, {
            uid: b.uid,
            displayName: b.displayName || null,
            photoURL: b.photoURL || null,
            email: b.email || null,
            emailVerified: b.emailVerified || !1,
            phoneNumber: b.phoneNumber || null,
            isAnonymous: b.isAnonymous || !1,
            tenantId: b.tenantId || null,
            metadata: new bp(b.createdAt,b.lastLoginAt),
            providerData: []
        });
        a.i.R = a.tenantId
    }
      , rp = function() {}
      , sp = function(a) {
        return G().then(function() {
            if (a.Wc)
                throw new Q("app-deleted");
        })
    }
      , tp = function(a) {
        return Na(a.providerData, function(b) {
            return b.providerId
        })
    }
      , vp = function(a, b) {
        b && (up(a, b.providerId),
        a.providerData.push(b))
    }
      , up = function(a, b) {
        Sa(a.providerData, function(c) {
            return c.providerId == b
        })
    }
      , wp = function(a, b, c) {
        ("uid" != b || c) && a.hasOwnProperty(b) && P(a, b, c)
    };
    S.prototype.copy = function(a) {
        var b = this;
        b != a && (Sj(this, {
            uid: a.uid,
            displayName: a.displayName,
            photoURL: a.photoURL,
            email: a.email,
            emailVerified: a.emailVerified,
            phoneNumber: a.phoneNumber,
            isAnonymous: a.isAnonymous,
            tenantId: a.tenantId,
            providerData: []
        }),
        a.metadata ? P(this, "metadata", a.metadata.clone()) : P(this, "metadata", new bp),
        w(a.providerData, function(c) {
            vp(b, c)
        }),
        this.Ra.copy(a.Ra),
        P(this, "refreshToken", this.Ra.ma),
        this.ve.copy(a.ve))
    }
    ;
    S.prototype.reload = function() {
        var a = this;
        return this.l(sp(this).then(function() {
            return xp(a).then(function() {
                return pp(a)
            }).then(rp)
        }))
    }
    ;
    var xp = function(a) {
        return a.getIdToken().then(function(b) {
            var c = a.isAnonymous;
            return R(a.i, jm, {
                idToken: b
            }).then(t(a.Sj, a)).then(function() {
                c || wp(a, "isAnonymous", !1);
                return b
            })
        })
    };
    S.prototype.getIdTokenResult = function(a) {
        return this.getIdToken(a).then(function(b) {
            return new qk(b)
        })
    }
    ;
    S.prototype.getIdToken = function(a) {
        var b = this;
        return this.l(sp(this).then(function() {
            return b.Ra.getToken(a)
        }).then(function(c) {
            if (!c)
                throw new Q("internal-error");
            c.accessToken != b.Hh && (dp(b, c.accessToken),
            b.tb());
            wp(b, "refreshToken", c.refreshToken);
            return c.accessToken
        }))
    }
    ;
    var Xo = function(a, b) {
        b.idToken && a.Hh != b.idToken && ($o(a.Ra, b),
        a.tb(),
        dp(a, b.idToken),
        wp(a, "refreshToken", a.Ra.ma))
    };
    S.prototype.tb = function() {
        this.dispatchEvent(new To("tokenChanged"))
    }
    ;
    S.prototype.Sj = function(a) {
        a = a.users;
        if (!a || !a.length)
            throw new Q("internal-error");
        a = a[0];
        ep(this, {
            uid: a.localId,
            displayName: a.displayName,
            photoURL: a.photoUrl,
            email: a.email,
            emailVerified: !!a.emailVerified,
            phoneNumber: a.phoneNumber,
            lastLoginAt: a.lastLoginAt,
            createdAt: a.createdAt,
            tenantId: a.tenantId
        });
        for (var b = yp(a), c = 0; c < b.length; c++)
            vp(this, b[c]);
        wp(this, "isAnonymous", !(this.email && a.passwordHash) && !(this.providerData && this.providerData.length));
        this.dispatchEvent(new To("userReloaded",{
            vk: a
        }))
    }
    ;
    var yp = function(a) {
        return (a = a.providerUserInfo) && a.length ? Na(a, function(b) {
            return new cp(b.rawId,b.providerId,b.email,b.displayName,b.photoUrl,b.phoneNumber)
        }) : []
    };
    S.prototype.reauthenticateAndRetrieveDataWithCredential = function(a) {
        Pj("firebase.User.prototype.reauthenticateAndRetrieveDataWithCredential is deprecated. Please use firebase.User.prototype.reauthenticateWithCredential instead.");
        return this.reauthenticateWithCredential(a)
    }
    ;
    S.prototype.reauthenticateWithCredential = function(a) {
        var b = this
          , c = null;
        return this.l(a.md(this.i, this.uid).then(function(d) {
            Xo(b, d);
            c = zp(b, d, "reauthenticate");
            b.Sa = null;
            return b.reload()
        }).then(function() {
            return c
        }), !0)
    }
    ;
    var Ap = function(a, b) {
        return xp(a).then(function() {
            if (Pa(tp(a), b))
                return pp(a).then(function() {
                    throw new Q("provider-already-linked");
                })
        })
    };
    S.prototype.linkAndRetrieveDataWithCredential = function(a) {
        Pj("firebase.User.prototype.linkAndRetrieveDataWithCredential is deprecated. Please use firebase.User.prototype.linkWithCredential instead.");
        return this.linkWithCredential(a)
    }
    ;
    S.prototype.linkWithCredential = function(a) {
        var b = this
          , c = null;
        return this.l(Ap(this, a.providerId).then(function() {
            return b.getIdToken()
        }).then(function(d) {
            return a.xc(b.i, d)
        }).then(function(d) {
            c = zp(b, d, "link");
            return Bp(b, d)
        }).then(function() {
            return c
        }))
    }
    ;
    S.prototype.linkWithPhoneNumber = function(a, b) {
        var c = this;
        return this.l(Ap(this, "phone").then(function() {
            return Hn(lp(c), a, b, t(c.linkWithCredential, c))
        }))
    }
    ;
    S.prototype.reauthenticateWithPhoneNumber = function(a, b) {
        var c = this;
        return this.l(G().then(function() {
            return Hn(lp(c), a, b, t(c.reauthenticateWithCredential, c))
        }), !0)
    }
    ;
    var zp = function(a, b, c) {
        var d = el(b);
        b = Rn(b);
        return Tj({
            user: a,
            credential: d,
            additionalUserInfo: b,
            operationType: c
        })
    }
      , Bp = function(a, b) {
        Xo(a, b);
        return a.reload().then(function() {
            return a
        })
    };
    k = S.prototype;
    k.updateEmail = function(a) {
        var b = this;
        return this.l(this.getIdToken().then(function(c) {
            return b.i.updateEmail(c, a)
        }).then(function(c) {
            Xo(b, c);
            return b.reload()
        }))
    }
    ;
    k.updatePhoneNumber = function(a) {
        var b = this;
        return this.l(this.getIdToken().then(function(c) {
            return a.xc(b.i, c)
        }).then(function(c) {
            Xo(b, c);
            return b.reload()
        }))
    }
    ;
    k.updatePassword = function(a) {
        var b = this;
        return this.l(this.getIdToken().then(function(c) {
            return b.i.updatePassword(c, a)
        }).then(function(c) {
            Xo(b, c);
            return b.reload()
        }))
    }
    ;
    k.updateProfile = function(a) {
        if (void 0 === a.displayName && void 0 === a.photoURL)
            return sp(this);
        var b = this;
        return this.l(this.getIdToken().then(function(c) {
            return b.i.updateProfile(c, {
                displayName: a.displayName,
                photoUrl: a.photoURL
            })
        }).then(function(c) {
            Xo(b, c);
            wp(b, "displayName", c.displayName || null);
            wp(b, "photoURL", c.photoUrl || null);
            w(b.providerData, function(d) {
                "password" === d.providerId && (P(d, "displayName", b.displayName),
                P(d, "photoURL", b.photoURL))
            });
            return pp(b)
        }).then(rp))
    }
    ;
    k.unlink = function(a) {
        var b = this;
        return this.l(xp(this).then(function(c) {
            return Pa(tp(b), a) ? Ul(b.i, c, [a]).then(function(d) {
                var e = {};
                w(d.providerUserInfo || [], function(f) {
                    e[f.providerId] = !0
                });
                w(tp(b), function(f) {
                    e[f] || up(b, f)
                });
                e[$k.PROVIDER_ID] || P(b, "phoneNumber", null);
                return pp(b)
            }) : pp(b).then(function() {
                throw new Q("no-such-provider");
            })
        }))
    }
    ;
    k.delete = function() {
        var a = this;
        return this.l(this.getIdToken().then(function(b) {
            return R(a.i, gm, {
                idToken: b
            })
        }).then(function() {
            a.dispatchEvent(new To("userDeleted"))
        })).then(function() {
            for (var b = 0; b < a.ea.length; b++)
                a.ea[b].cancel("app-deleted");
            ip(a, null);
            jp(a, null);
            kp(a, null);
            a.ea = [];
            a.Wc = !0;
            np(a);
            P(a, "refreshToken", null);
            a.C && a.C.unsubscribe(a)
        })
    }
    ;
    k.Pg = function(a, b) {
        return "linkViaPopup" == a && (this.Oa || null) == b && this.Na || "reauthViaPopup" == a && (this.Oa || null) == b && this.Na || "linkViaRedirect" == a && (this.wb || null) == b || "reauthViaRedirect" == a && (this.wb || null) == b ? !0 : !1
    }
    ;
    k.Vb = function(a, b, c, d) {
        "linkViaPopup" != a && "reauthViaPopup" != a || d != (this.Oa || null) || (c && this.Tb ? this.Tb(c) : b && !c && this.Na && this.Na(b),
        this.fa && (this.fa.cancel(),
        this.fa = null),
        delete this.Na,
        delete this.Tb)
    }
    ;
    k.Zc = function(a, b) {
        return "linkViaPopup" == a && b == (this.Oa || null) ? t(this.gh, this) : "reauthViaPopup" == a && b == (this.Oa || null) ? t(this.hh, this) : "linkViaRedirect" == a && (this.wb || null) == b ? t(this.gh, this) : "reauthViaRedirect" == a && (this.wb || null) == b ? t(this.hh, this) : null
    }
    ;
    k.ae = function() {
        return xj(this.uid + ":::")
    }
    ;
    k.linkWithPopup = function(a) {
        var b = this;
        return Cp(this, "linkViaPopup", a, function() {
            return Ap(b, a.providerId).then(function() {
                return pp(b)
            })
        }, !1)
    }
    ;
    k.reauthenticateWithPopup = function(a) {
        return Cp(this, "reauthViaPopup", a, function() {
            return G()
        }, !0)
    }
    ;
    var Cp = function(a, b, c, d, e) {
        if (!Aj())
            return H(new Q("operation-not-supported-in-this-environment"));
        if (a.Sa && !e)
            return H(a.Sa);
        var f = Zj(c.providerId)
          , g = a.ae()
          , h = null;
        (!Bj() || qj()) && a.T && c.isOAuthProvider && (h = Dm(a.T, a.K, a.I, b, c, null, g, firebase.SDK_VERSION || null, null, null, a.tenantId, a.m));
        var l = hj(h, f && f.Dc, f && f.Cc);
        d = d().then(function() {
            Dp(a);
            if (!e)
                return a.getIdToken().then(function() {})
        }).then(function() {
            return a.C.sd(l, b, c, g, !!h, a.tenantId)
        }).then(function() {
            return new F(function(n, q) {
                a.Vb(b, null, new Q("cancelled-popup-request"), a.Oa || null);
                a.Na = n;
                a.Tb = q;
                a.Oa = g;
                a.fa = a.C.Dd(a, b, l, g)
            }
            )
        }).then(function(n) {
            l && gj(l);
            return n ? Tj(n) : null
        }).h(function(n) {
            l && gj(l);
            throw n;
        });
        return a.l(d, e)
    };
    S.prototype.linkWithRedirect = function(a) {
        var b = this;
        return Ep(this, "linkViaRedirect", a, function() {
            return Ap(b, a.providerId)
        }, !1)
    }
    ;
    S.prototype.reauthenticateWithRedirect = function(a) {
        return Ep(this, "reauthViaRedirect", a, function() {
            return G()
        }, !0)
    }
    ;
    var Ep = function(a, b, c, d, e) {
        if (!Aj())
            return H(new Q("operation-not-supported-in-this-environment"));
        if (a.Sa && !e)
            return H(a.Sa);
        var f = null
          , g = a.ae();
        d = d().then(function() {
            Dp(a);
            if (!e)
                return a.getIdToken().then(function() {})
        }).then(function() {
            a.wb = g;
            return pp(a)
        }).then(function(h) {
            a.xb && (h = a.xb,
            h = h.v.set(Fp, a.A(), h.D));
            return h
        }).then(function() {
            return a.C.td(b, c, g, a.tenantId)
        }).h(function(h) {
            f = h;
            if (a.xb)
                return Gp(a.xb);
            throw f;
        }).then(function() {
            if (f)
                throw f;
        });
        return a.l(d, e)
    }
      , Dp = function(a) {
        if (!a.C || !a.rd) {
            if (a.C && !a.rd)
                throw new Q("internal-error");
            throw new Q("auth-domain-config-required");
        }
    };
    k = S.prototype;
    k.gh = function(a, b, c, d) {
        var e = this;
        this.fa && (this.fa.cancel(),
        this.fa = null);
        var f = null;
        c = this.getIdToken().then(function(g) {
            return wk(e.i, {
                requestUri: a,
                postBody: d,
                sessionId: b,
                idToken: g
            })
        }).then(function(g) {
            f = zp(e, g, "link");
            return Bp(e, g)
        }).then(function() {
            return f
        });
        return this.l(c)
    }
    ;
    k.hh = function(a, b, c, d) {
        var e = this;
        this.fa && (this.fa.cancel(),
        this.fa = null);
        var f = null
          , g = G().then(function() {
            return tk(xk(e.i, {
                requestUri: a,
                sessionId: b,
                postBody: d,
                tenantId: c
            }), e.uid)
        }).then(function(h) {
            f = zp(e, h, "reauthenticate");
            Xo(e, h);
            e.Sa = null;
            return e.reload()
        }).then(function() {
            return f
        });
        return this.l(g, !0)
    }
    ;
    k.sendEmailVerification = function(a) {
        var b = this
          , c = null;
        return this.l(this.getIdToken().then(function(d) {
            c = d;
            return "undefined" === typeof a || Za(a) ? {} : Fn(new En(a))
        }).then(function(d) {
            return b.i.sendEmailVerification(c, d)
        }).then(function(d) {
            if (b.email != d)
                return b.reload()
        }).then(function() {}))
    }
    ;
    k.verifyBeforeUpdateEmail = function(a, b) {
        var c = this
          , d = null;
        return this.l(this.getIdToken().then(function(e) {
            d = e;
            return "undefined" === typeof b || Za(b) ? {} : Fn(new En(b))
        }).then(function(e) {
            return c.i.verifyBeforeUpdateEmail(d, a, e)
        }).then(function(e) {
            if (c.email != e)
                return c.reload()
        }).then(function() {}))
    }
    ;
    k.l = function(a, b) {
        var c = this
          , d = Hp(this, a, b);
        this.ea.push(d);
        d.Wb(function() {
            Qa(c.ea, d)
        });
        return d.h(function(e) {
            var f = null;
            e && "auth/multi-factor-auth-required" === e.code && (f = No(e.A(), lp(c), t(c.Cf, c)));
            throw f || e;
        })
    }
    ;
    k.Cf = function(a) {
        var b = null
          , c = this;
        a = tk(G(a), c.uid).then(function(d) {
            b = zp(c, d, "reauthenticate");
            Xo(c, d);
            c.Sa = null;
            return c.reload()
        }).then(function() {
            return b
        });
        return this.l(a, !0)
    }
    ;
    var Hp = function(a, b, c) {
        return a.Sa && !c ? (b.cancel(),
        H(a.Sa)) : b.h(function(d) {
            !d || "auth/user-disabled" != d.code && "auth/user-token-expired" != d.code || (a.Sa || a.dispatchEvent(new To("userInvalidated")),
            a.Sa = d);
            throw d;
        })
    };
    S.prototype.toJSON = function() {
        return this.A()
    }
    ;
    S.prototype.A = function() {
        var a = {
            uid: this.uid,
            displayName: this.displayName,
            photoURL: this.photoURL,
            email: this.email,
            emailVerified: this.emailVerified,
            phoneNumber: this.phoneNumber,
            isAnonymous: this.isAnonymous,
            tenantId: this.tenantId,
            providerData: [],
            apiKey: this.K,
            appName: this.I,
            authDomain: this.T,
            stsTokenManager: this.Ra.A(),
            redirectEventId: this.wb || null
        };
        this.metadata && bb(a, this.metadata.A());
        w(this.providerData, function(b) {
            var c = a.providerData, d = c.push, e = {}, f;
            for (f in b)
                b.hasOwnProperty(f) && (e[f] = b[f]);
            d.call(c, e)
        });
        bb(a, this.ve.A());
        return a
    }
    ;
    var Ip = function(a) {
        if (!a.apiKey)
            return null;
        var b = {
            apiKey: a.apiKey,
            authDomain: a.authDomain,
            appName: a.appName,
            emulatorConfig: a.emulatorConfig
        }
          , c = {};
        if (a.stsTokenManager && a.stsTokenManager.accessToken) {
            c.idToken = a.stsTokenManager.accessToken;
            c.refreshToken = a.stsTokenManager.refreshToken || null;
            var d = a.stsTokenManager.expirationTime;
            d && (c.expiresIn = (d - Date.now()) / 1E3)
        } else
            return null;
        var e = new S(b,c,a);
        a.providerData && w(a.providerData, function(f) {
            f && vp(e, Tj(f))
        });
        a.redirectEventId && (e.wb = a.redirectEventId);
        return e
    }
      , Jp = function(a, b, c, d) {
        var e = new S(a,b);
        c && (e.xb = c);
        d && hp(e, d);
        return e.reload().then(function() {
            return e
        })
    }
      , Kp = function(a, b, c, d) {
        b = b || {
            apiKey: a.K,
            authDomain: a.T,
            appName: a.I
        };
        var e = a.Ra
          , f = {};
        f.idToken = e.oa && e.oa.toString();
        f.refreshToken = e.ma;
        b = new S(b,f);
        c && (b.xb = c);
        d && hp(b, d);
        b.copy(a);
        return b
    };
    P(S.prototype, "providerId", "firebase");
    var Lp = function(a) {
        this.D = a;
        this.v = Wn()
    }
      , Gp = function(a) {
        return a.v.remove(Fp, a.D)
    }
      , Mp = function(a, b) {
        return a.v.get(Fp, a.D).then(function(c) {
            c && b && (c.authDomain = b);
            return Ip(c || {})
        })
    }
      , Fp = {
        name: "redirectUser",
        S: "session"
    };
    var Op = function(a) {
        this.D = a;
        this.v = Wn();
        this.pa = null;
        this.Xf = this.Jf();
        this.v.addListener(Np("local"), this.D, t(this.pk, this))
    };
    Op.prototype.pk = function() {
        var a = this
          , b = Np("local");
        Pp(this, function() {
            return G().then(function() {
                return a.pa && "local" != a.pa.S ? a.v.get(b, a.D) : null
            }).then(function(c) {
                if (c)
                    return Qp(a, "local").then(function() {
                        a.pa = b
                    })
            })
        })
    }
    ;
    var Qp = function(a, b) {
        var c = [], d;
        for (d in Sn)
            Sn[d] !== b && c.push(a.v.remove(Np(Sn[d]), a.D));
        c.push(a.v.remove(Rp, a.D));
        return we(c)
    };
    Op.prototype.Jf = function() {
        var a = this
          , b = Np("local")
          , c = Np("session")
          , d = Np("none");
        return Yn(this.v, b, this.D).then(function() {
            return a.v.get(c, a.D)
        }).then(function(e) {
            return e ? c : a.v.get(d, a.D).then(function(f) {
                return f ? d : a.v.get(b, a.D).then(function(g) {
                    return g ? b : a.v.get(Rp, a.D).then(function(h) {
                        return h ? Np(h) : b
                    })
                })
            })
        }).then(function(e) {
            a.pa = e;
            return Qp(a, e.S)
        }).h(function() {
            a.pa || (a.pa = b)
        })
    }
    ;
    var Np = function(a) {
        return {
            name: "authUser",
            S: a
        }
    };
    Op.prototype.setPersistence = function(a) {
        var b = null
          , c = this;
        Tn(a);
        return Pp(this, function() {
            return a != c.pa.S ? c.v.get(c.pa, c.D).then(function(d) {
                b = d;
                return Qp(c, a)
            }).then(function() {
                c.pa = Np(a);
                if (b)
                    return c.v.set(c.pa, b, c.D)
            }) : G()
        })
    }
    ;
    var Sp = function(a) {
        return Pp(a, function() {
            return a.v.set(Rp, a.pa.S, a.D)
        })
    }
      , Tp = function(a, b) {
        return Pp(a, function() {
            return a.v.set(a.pa, b.A(), a.D)
        })
    }
      , Up = function(a) {
        return Pp(a, function() {
            return a.v.remove(a.pa, a.D)
        })
    }
      , Vp = function(a, b, c) {
        return Pp(a, function() {
            return a.v.get(a.pa, a.D).then(function(d) {
                d && b && (d.authDomain = b);
                d && c && (d.emulatorConfig = c);
                return Ip(d || {})
            })
        })
    }
      , Pp = function(a, b) {
        a.Xf = a.Xf.then(b, b);
        return a.Xf
    }
      , Rp = {
        name: "persistence",
        S: "session"
    };
    var T = function(a) {
        E.call(this);
        this.Ea = !1;
        this.hi = new Dn;
        P(this, "settings", this.hi);
        P(this, "app", a);
        if (this.o().options && this.o().options.apiKey)
            a = firebase.SDK_VERSION ? wj(firebase.SDK_VERSION) : null,
            this.i = new nl(this.o().options && this.o().options.apiKey,Xi(Yi),a);
        else
            throw new Q("invalid-api-key");
        this.ea = [];
        this.Bb = [];
        this.Mc = [];
        this.Nj = firebase.INTERNAL.createSubscribe(t(this.vj, this));
        this.Ld = void 0;
        this.Qj = firebase.INTERNAL.createSubscribe(t(this.xj, this));
        Wp(this, null);
        a = this.o().options.apiKey;
        var b = this.o().name;
        this.Ta = new Op(a + ":" + b);
        a = this.o().options.apiKey;
        b = this.o().name;
        this.Ub = new Lp(a + ":" + b);
        this.Od = this.l(Xp(this));
        this.Pa = this.l(Yp(this));
        this.pe = !1;
        this.Af = t(this.qk, this);
        this.yi = t(this.rb, this);
        this.Nc = t(this.Df, this);
        this.wi = t(this.nj, this);
        this.xi = t(this.oj, this);
        this.C = null;
        Zp(this);
        this.INTERNAL = {};
        this.INTERNAL["delete"] = t(this.delete, this);
        this.INTERNAL.logFramework = t(this.Ij, this);
        this.Gb = 0;
        $p(this);
        this.da = [];
        this.m = null
    };
    m(T, E);
    T.prototype.setPersistence = function(a) {
        a = this.Ta.setPersistence(a);
        return this.l(a)
    }
    ;
    T.prototype.Jc = function(a) {
        this.La === a || this.Ea || (this.La = a,
        pl(this.i, this.La),
        this.dispatchEvent(new aq(this.La)))
    }
    ;
    T.prototype.useDeviceLanguage = function() {
        var a = p.navigator;
        this.Jc(a ? a.languages && a.languages[0] || a.language || a.userLanguage || null : null)
    }
    ;
    T.prototype.useEmulator = function(a, b) {
        if (!this.m) {
            if (this.C)
                throw new Q("argument-error","useEmulator() must be called immediately following firebase.auth() initialization.");
            b = b ? !!b.disableWarnings : !1;
            bq(b);
            this.m = {
                url: a,
                disableWarnings: b
            };
            this.hi.df = !0;
            rl(this.i, this.m);
            this.dispatchEvent(new cq(this.m))
        }
    }
    ;
    var bq = function(a) {
        "undefined" !== typeof console && "function" === typeof console.info && console.info("WARNING: You are using the Auth Emulator, which is intended for local testing only.  Do not use with production credentials.");
        p.document && !a && mj().then(function() {
            var b = p.document.createElement("p");
            b.innerText = "Running in emulator mode. Do not use with production credentials.";
            b.style.position = "fixed";
            b.style.width = "100%";
            b.style.backgroundColor = "#ffffff";
            b.style.border = ".1em solid #000000";
            b.style.color = "#b50000";
            b.style.bottom = "0px";
            b.style.left = "0px";
            b.style.margin = "0px";
            b.style.zIndex = 1E4;
            b.style.textAlign = "center";
            b.classList.add("firebase-emulator-warning");
            p.document.body.appendChild(b)
        })
    };
    T.prototype.Ij = function(a) {
        this.da.push(a);
        sl(this.i, firebase.SDK_VERSION ? wj(firebase.SDK_VERSION, this.da) : null);
        this.dispatchEvent(new dq(this.da))
    }
    ;
    T.prototype.wg = function(a) {
        this.R === a || this.Ea || (this.R = a,
        this.i.R = this.R)
    }
    ;
    T.prototype.Aa = function() {
        return this.R
    }
    ;
    var $p = function(a) {
        Object.defineProperty(a, "lc", {
            get: function() {
                return this.La
            },
            set: function(b) {
                this.Jc(b)
            },
            enumerable: !1
        });
        a.La = null;
        Object.defineProperty(a, "ti", {
            get: function() {
                return this.Aa()
            },
            set: function(b) {
                this.wg(b)
            },
            enumerable: !1
        });
        a.R = null;
        Object.defineProperty(a, "emulatorConfig", {
            get: function() {
                if (this.m) {
                    var b = Hf(this.m.url);
                    b = Tj({
                        protocol: b.ha,
                        host: b.ba,
                        port: b.Xa,
                        options: Tj({
                            disableWarnings: this.m.disableWarnings
                        })
                    })
                } else
                    b = null;
                return b
            },
            enumerable: !1
        })
    };
    T.prototype.toJSON = function() {
        return {
            apiKey: this.o().options.apiKey,
            authDomain: this.o().options.authDomain,
            appName: this.o().name,
            currentUser: U(this) && U(this).A()
        }
    }
    ;
    var eq = function(a) {
        return a.Ri || H(new Q("auth-domain-config-required"))
    }
      , Zp = function(a) {
        var b = a.o().options.authDomain
          , c = a.o().options.apiKey;
        b && Aj() && (a.Ri = a.Od.then(function() {
            if (!a.Ea) {
                a.C = Fo(b, c, a.o().name, a.m);
                a.C.subscribe(a);
                U(a) && qp(U(a));
                if (a.yb) {
                    qp(a.yb);
                    var d = a.yb;
                    d.Jc(a.La);
                    ip(d, a);
                    d = a.yb;
                    hp(d, a.da);
                    kp(d, a);
                    d = a.yb;
                    gp(d, a.m);
                    jp(d, a);
                    a.yb = null
                }
                return a.C
            }
        }))
    };
    k = T.prototype;
    k.Pg = function(a, b) {
        switch (a) {
        case "unknown":
        case "signInViaRedirect":
            return !0;
        case "signInViaPopup":
            return this.Oa == b && !!this.Na;
        default:
            return !1
        }
    }
    ;
    k.Vb = function(a, b, c, d) {
        "signInViaPopup" == a && this.Oa == d && (c && this.Tb ? this.Tb(c) : b && !c && this.Na && this.Na(b),
        this.fa && (this.fa.cancel(),
        this.fa = null),
        delete this.Na,
        delete this.Tb)
    }
    ;
    k.Zc = function(a, b) {
        return "signInViaRedirect" == a || "signInViaPopup" == a && this.Oa == b && this.Na ? t(this.Wi, this) : null
    }
    ;
    k.Wi = function(a, b, c, d) {
        var e = this
          , f = {
            requestUri: a,
            postBody: d,
            sessionId: b,
            tenantId: c
        };
        this.fa && (this.fa.cancel(),
        this.fa = null);
        return e.Od.then(function() {
            return fq(e, vk(e.i, f))
        })
    }
    ;
    k.ae = function() {
        return xj()
    }
    ;
    k.signInWithPopup = function(a) {
        if (!Aj())
            return H(new Q("operation-not-supported-in-this-environment"));
        var b = this
          , c = Zj(a.providerId)
          , d = this.ae()
          , e = null;
        (!Bj() || qj()) && this.o().options.authDomain && a.isOAuthProvider && (e = Dm(this.o().options.authDomain, this.o().options.apiKey, this.o().name, "signInViaPopup", a, null, d, firebase.SDK_VERSION || null, null, null, this.Aa(), this.m));
        var f = hj(e, c && c.Dc, c && c.Cc);
        c = eq(this).then(function(g) {
            return g.sd(f, "signInViaPopup", a, d, !!e, b.Aa())
        }).then(function() {
            return new F(function(g, h) {
                b.Vb("signInViaPopup", null, new Q("cancelled-popup-request"), b.Oa);
                b.Na = g;
                b.Tb = h;
                b.Oa = d;
                b.fa = b.C.Dd(b, "signInViaPopup", f, d)
            }
            )
        }).then(function(g) {
            f && gj(f);
            return g ? Tj(g) : null
        }).h(function(g) {
            f && gj(f);
            throw g;
        });
        return this.l(c)
    }
    ;
    k.signInWithRedirect = function(a) {
        if (!Aj())
            return H(new Q("operation-not-supported-in-this-environment"));
        var b = this
          , c = eq(this).then(function() {
            return Sp(b.Ta)
        }).then(function() {
            return b.C.td("signInViaRedirect", a, void 0, b.Aa())
        });
        return this.l(c)
    }
    ;
    var gq = function(a) {
        if (!Aj())
            return H(new Q("operation-not-supported-in-this-environment"));
        var b = eq(a).then(function() {
            return a.C.getRedirectResult()
        }).then(function(c) {
            return c ? Tj(c) : null
        });
        return a.l(b)
    };
    T.prototype.getRedirectResult = function() {
        var a = this;
        return gq(this).then(function(b) {
            a.C && a.C.hc();
            return b
        }).h(function(b) {
            a.C && a.C.hc();
            throw b;
        })
    }
    ;
    T.prototype.updateCurrentUser = function(a) {
        if (!a)
            return H(new Q("null-user"));
        if (this.R != a.tenantId)
            return H(new Q("tenant-id-mismatch"));
        var b = this
          , c = {};
        c.apiKey = this.o().options.apiKey;
        c.authDomain = this.o().options.authDomain;
        c.appName = this.o().name;
        var d = Kp(a, c, b.Ub, Ta(b.da));
        return this.l(this.Pa.then(function() {
            if (b.o().options.apiKey != a.Ib())
                return d.reload()
        }).then(function() {
            if (U(b) && a.uid == U(b).uid)
                return U(b).copy(a),
                b.rb(a);
            Wp(b, d);
            qp(d);
            return b.rb(d)
        }).then(function() {
            b.tb()
        }))
    }
    ;
    var hq = function(a, b) {
        var c = {};
        c.apiKey = a.o().options.apiKey;
        c.authDomain = a.o().options.authDomain;
        c.appName = a.o().name;
        a.m && (c.emulatorConfig = a.m);
        return a.Od.then(function() {
            return Jp(c, b, a.Ub, Ta(a.da))
        }).then(function(d) {
            if (U(a) && d.uid == U(a).uid)
                return U(a).copy(d),
                a.rb(d);
            Wp(a, d);
            qp(d);
            return a.rb(d)
        }).then(function() {
            a.tb()
        })
    }
      , Wp = function(a, b) {
        U(a) && (op(U(a), a.yi),
        Hd(U(a), "tokenChanged", a.Nc),
        Hd(U(a), "userDeleted", a.wi),
        Hd(U(a), "userInvalidated", a.xi),
        np(U(a)));
        b && (b.Oe.push(a.yi),
        C(b, "tokenChanged", a.Nc),
        C(b, "userDeleted", a.wi),
        C(b, "userInvalidated", a.xi),
        0 < a.Gb && mp(b));
        P(a, "currentUser", b);
        b && (b.Jc(a.La),
        ip(b, a),
        hp(b, a.da),
        kp(b, a),
        gp(b, a.m),
        jp(b, a))
    };
    T.prototype.signOut = function() {
        var a = this
          , b = this.Pa.then(function() {
            a.C && a.C.hc();
            if (!U(a))
                return G();
            Wp(a, null);
            return Up(a.Ta).then(function() {
                a.tb()
            })
        });
        return this.l(b)
    }
    ;
    var iq = function(a) {
        var b = a.o().options.authDomain;
        b = Mp(a.Ub, b).then(function(c) {
            if (a.yb = c)
                c.xb = a.Ub;
            return Gp(a.Ub)
        });
        return a.l(b)
    }
      , Xp = function(a) {
        var b = a.o().options.authDomain
          , c = iq(a).then(function() {
            return Vp(a.Ta, b, a.m)
        }).then(function(d) {
            return d ? (d.xb = a.Ub,
            a.yb && (a.yb.wb || null) == (d.wb || null) ? d : d.reload().then(function() {
                return Tp(a.Ta, d).then(function() {
                    return d
                })
            }).h(function(e) {
                return "auth/network-request-failed" == e.code ? d : Up(a.Ta)
            })) : null
        }).then(function(d) {
            Wp(a, d || null)
        });
        return a.l(c)
    }
      , Yp = function(a) {
        return a.Od.then(function() {
            return gq(a)
        }).h(function() {}).then(function() {
            if (!a.Ea)
                return a.Af()
        }).h(function() {}).then(function() {
            if (!a.Ea) {
                a.pe = !0;
                var b = a.Ta;
                b.v.addListener(Np("local"), b.D, a.Af)
            }
        })
    };
    k = T.prototype;
    k.qk = function() {
        var a = this
          , b = this.o().options.authDomain;
        return Vp(this.Ta, b).then(function(c) {
            if (!a.Ea) {
                var d;
                if (d = U(a) && c) {
                    d = U(a).uid;
                    var e = c.uid;
                    d = void 0 === d || null === d || "" === d || void 0 === e || null === e || "" === e ? !1 : d == e
                }
                if (d)
                    return U(a).copy(c),
                    U(a).getIdToken();
                if (U(a) || c)
                    Wp(a, c),
                    c && (qp(c),
                    c.xb = a.Ub),
                    a.C && a.C.subscribe(a),
                    a.tb()
            }
        })
    }
    ;
    k.rb = function(a) {
        return Tp(this.Ta, a)
    }
    ;
    k.Df = function() {
        this.tb();
        this.rb(U(this))
    }
    ;
    k.nj = function() {
        this.signOut()
    }
    ;
    k.oj = function() {
        this.signOut()
    }
    ;
    var fq = function(a, b) {
        var c = null
          , d = null;
        return a.l(b.then(function(e) {
            c = el(e);
            d = Rn(e);
            return hq(a, e)
        }, function(e) {
            var f = null;
            e && "auth/multi-factor-auth-required" === e.code && (f = No(e.A(), a, t(a.Cf, a)));
            throw f || e;
        }).then(function() {
            return Tj({
                user: U(a),
                credential: c,
                additionalUserInfo: d,
                operationType: "signIn"
            })
        }))
    };
    k = T.prototype;
    k.Cf = function(a) {
        var b = this;
        return this.Pa.then(function() {
            return fq(b, G(a))
        })
    }
    ;
    k.vj = function(a) {
        var b = this;
        this.addAuthTokenListener(function() {
            a.next(U(b))
        })
    }
    ;
    k.xj = function(a) {
        var b = this;
        jq(this, function() {
            a.next(U(b))
        })
    }
    ;
    k.onIdTokenChanged = function(a, b, c) {
        var d = this;
        this.pe && firebase.Promise.resolve().then(function() {
            "function" === typeof a ? a(U(d)) : "function" === typeof a.next && a.next(U(d))
        });
        return this.Nj(a, b, c)
    }
    ;
    k.onAuthStateChanged = function(a, b, c) {
        var d = this;
        this.pe && firebase.Promise.resolve().then(function() {
            d.Ld = d.getUid();
            "function" === typeof a ? a(U(d)) : "function" === typeof a.next && a.next(U(d))
        });
        return this.Qj(a, b, c)
    }
    ;
    k.aj = function(a) {
        var b = this
          , c = this.Pa.then(function() {
            return U(b) ? U(b).getIdToken(a).then(function(d) {
                return {
                    accessToken: d
                }
            }) : null
        });
        return this.l(c)
    }
    ;
    k.signInWithCustomToken = function(a) {
        var b = this;
        return this.Pa.then(function() {
            return fq(b, R(b.i, lm, {
                token: a
            }))
        }).then(function(c) {
            var d = c.user;
            wp(d, "isAnonymous", !1);
            b.rb(d);
            return c
        })
    }
    ;
    k.signInWithEmailAndPassword = function(a, b) {
        var c = this;
        return this.Pa.then(function() {
            return fq(c, R(c.i, Pk, {
                email: a,
                password: b
            }))
        })
    }
    ;
    k.createUserWithEmailAndPassword = function(a, b) {
        var c = this;
        return this.Pa.then(function() {
            return fq(c, R(c.i, fm, {
                email: a,
                password: b
            }))
        })
    }
    ;
    k.signInWithCredential = function(a) {
        var b = this;
        return this.Pa.then(function() {
            return fq(b, a.Kb(b.i))
        })
    }
    ;
    k.signInAndRetrieveDataWithCredential = function(a) {
        Pj("firebase.auth.Auth.prototype.signInAndRetrieveDataWithCredential is deprecated. Please use firebase.auth.Auth.prototype.signInWithCredential instead.");
        return this.signInWithCredential(a)
    }
    ;
    k.signInAnonymously = function() {
        var a = this;
        return this.Pa.then(function() {
            var b = U(a);
            if (b && b.isAnonymous) {
                var c = Tj({
                    providerId: null,
                    isNewUser: !1
                });
                return Tj({
                    user: b,
                    credential: null,
                    additionalUserInfo: c,
                    operationType: "signIn"
                })
            }
            return fq(a, a.i.signInAnonymously()).then(function(d) {
                var e = d.user;
                wp(e, "isAnonymous", !0);
                a.rb(e);
                return d
            })
        })
    }
    ;
    k.o = function() {
        return this.app
    }
    ;
    var U = function(a) {
        return a.currentUser
    };
    T.prototype.getUid = function() {
        return U(this) && U(this).uid || null
    }
    ;
    var kq = function(a) {
        return U(a) && U(a)._lat || null
    };
    k = T.prototype;
    k.tb = function() {
        if (this.pe) {
            for (var a = 0; a < this.Bb.length; a++)
                if (this.Bb[a])
                    this.Bb[a](kq(this));
            if (this.Ld !== this.getUid() && this.Mc.length)
                for (this.Ld = this.getUid(),
                a = 0; a < this.Mc.length; a++)
                    if (this.Mc[a])
                        this.Mc[a](kq(this))
        }
    }
    ;
    k.Fi = function(a) {
        this.addAuthTokenListener(a);
        this.Gb++;
        0 < this.Gb && U(this) && mp(U(this))
    }
    ;
    k.Wj = function(a) {
        var b = this;
        w(this.Bb, function(c) {
            c == a && b.Gb--
        });
        0 > this.Gb && (this.Gb = 0);
        0 == this.Gb && U(this) && np(U(this));
        this.removeAuthTokenListener(a)
    }
    ;
    k.addAuthTokenListener = function(a) {
        var b = this;
        this.Bb.push(a);
        this.l(this.Pa.then(function() {
            b.Ea || Pa(b.Bb, a) && a(kq(b))
        }))
    }
    ;
    k.removeAuthTokenListener = function(a) {
        Sa(this.Bb, function(b) {
            return b == a
        })
    }
    ;
    var jq = function(a, b) {
        a.Mc.push(b);
        a.l(a.Pa.then(function() {
            !a.Ea && Pa(a.Mc, b) && a.Ld !== a.getUid() && (a.Ld = a.getUid(),
            b(kq(a)))
        }))
    };
    k = T.prototype;
    k.delete = function() {
        this.Ea = !0;
        for (var a = 0; a < this.ea.length; a++)
            this.ea[a].cancel("app-deleted");
        this.ea = [];
        this.Ta && (a = this.Ta,
        a.v.removeListener(Np("local"), a.D, this.Af));
        this.C && (this.C.unsubscribe(this),
        this.C.hc());
        return firebase.Promise.resolve()
    }
    ;
    k.l = function(a) {
        var b = this;
        this.ea.push(a);
        a.Wb(function() {
            Qa(b.ea, a)
        });
        return a
    }
    ;
    k.fetchSignInMethodsForEmail = function(a) {
        return this.l(Cl(this.i, a))
    }
    ;
    k.isSignInWithEmailLink = function(a) {
        return !!Tk(a)
    }
    ;
    k.sendSignInLinkToEmail = function(a, b) {
        var c = this;
        return this.l(G().then(function() {
            var d = new En(b);
            if (!d.Qg)
                throw new Q("argument-error","handleCodeInApp must be true when sending sign in link to email");
            return Fn(d)
        }).then(function(d) {
            return c.i.sendSignInLinkToEmail(a, d)
        }).then(function() {}))
    }
    ;
    k.verifyPasswordResetCode = function(a) {
        return this.checkActionCode(a).then(function(b) {
            return b.data.email
        })
    }
    ;
    k.confirmPasswordReset = function(a, b) {
        return this.l(this.i.confirmPasswordReset(a, b).then(function() {}))
    }
    ;
    k.checkActionCode = function(a) {
        return this.l(this.i.checkActionCode(a).then(function(b) {
            return new hk(b)
        }))
    }
    ;
    k.applyActionCode = function(a) {
        return this.l(this.i.applyActionCode(a).then(function() {}))
    }
    ;
    k.sendPasswordResetEmail = function(a, b) {
        var c = this;
        return this.l(G().then(function() {
            return "undefined" === typeof b || Za(b) ? {} : Fn(new En(b))
        }).then(function(d) {
            return c.i.sendPasswordResetEmail(a, d)
        }).then(function() {}))
    }
    ;
    k.signInWithPhoneNumber = function(a, b) {
        return this.l(Hn(this, a, b, t(this.signInWithCredential, this)))
    }
    ;
    k.signInWithEmailLink = function(a, b) {
        var c = this;
        return this.l(G().then(function() {
            b = b || aj();
            var d = Uk(a, b)
              , e = Tk(b);
            if (!e)
                throw new Q("argument-error","Invalid email link!");
            if (e.tenantId !== c.Aa())
                throw new Q("tenant-id-mismatch");
            return c.signInWithCredential(d)
        }))
    }
    ;
    var aq = function(a) {
        md.call(this, "languageCodeChanged");
        this.languageCode = a
    };
    m(aq, md);
    var cq = function(a) {
        md.call(this, "emulatorConfigChanged");
        this.emulatorConfig = a
    };
    m(cq, md);
    var dq = function(a) {
        md.call(this, "frameworkChanged");
        this.Yi = a
    };
    m(dq, md);
    var mq = function(a, b, c, d) {
        a: {
            c = Array.prototype.slice.call(c);
            var e = 0;
            for (var f = !1, g = 0; g < b.length; g++)
                if (b[g].optional)
                    f = !0;
                else {
                    if (f)
                        throw new Q("internal-error","Argument validator encountered a required argument after an optional argument.");
                    e++
                }
            f = b.length;
            if (c.length < e || f < c.length)
                d = "Expected " + (e == f ? 1 == e ? "1 argument" : e + " arguments" : e + "-" + f + " arguments") + " but got " + c.length + ".";
            else {
                for (e = 0; e < c.length; e++)
                    if (f = b[e].optional && void 0 === c[e],
                    !b[e].aa(c[e]) && !f) {
                        b = b[e];
                        if (0 > e || e >= lq.length)
                            throw new Q("internal-error","Argument validator received an unsupported number of arguments.");
                        c = lq[e];
                        d = (d ? "" : c + " argument ") + (b.name ? '"' + b.name + '" ' : "") + "must be " + b.Z + ".";
                        break a
                    }
                d = null
            }
        }
        if (d)
            throw new Q("argument-error",a + " failed: " + d);
    }
      , lq = "First Second Third Fourth Fifth Sixth Seventh Eighth Ninth".split(" ")
      , V = function(a, b) {
        return {
            name: a || "",
            Z: "a valid string",
            optional: !!b,
            aa: function(c) {
                return "string" === typeof c
            }
        }
    }
      , nq = function(a, b) {
        return {
            name: a || "",
            Z: "a boolean",
            optional: !!b,
            aa: function(c) {
                return "boolean" === typeof c
            }
        }
    }
      , W = function(a, b) {
        return {
            name: a || "",
            Z: "a valid object",
            optional: !!b,
            aa: r
        }
    }
      , oq = function(a, b) {
        return {
            name: a || "",
            Z: "a function",
            optional: !!b,
            aa: Wa
        }
    }
      , pq = function(a, b) {
        return {
            name: a || "",
            Z: "null",
            optional: !!b,
            aa: function(c) {
                return null === c
            }
        }
    }
      , qq = function() {
        return {
            name: "",
            Z: "an HTML element",
            optional: !1,
            aa: function(a) {
                return !!(a && a instanceof Element)
            }
        }
    }
      , rq = function() {
        return {
            name: "auth",
            Z: "an instance of Firebase Auth",
            optional: !0,
            aa: function(a) {
                return !!(a && a instanceof T)
            }
        }
    }
      , sq = function() {
        return {
            name: "app",
            Z: "an instance of Firebase App",
            optional: !0,
            aa: function(a) {
                return !!(a && a instanceof firebase.app.App)
            }
        }
    }
      , tq = function(a) {
        return {
            name: a ? a + "Credential" : "credential",
            Z: a ? "a valid " + a + " credential" : "a valid credential",
            optional: !1,
            aa: function(b) {
                if (!b)
                    return !1;
                var c = !a || b.providerId === a;
                return !(!b.Kb || !c)
            }
        }
    }
      , uq = function() {
        return {
            name: "multiFactorAssertion",
            Z: "a valid multiFactorAssertion",
            optional: !1,
            aa: function(a) {
                return a ? !!a.process : !1
            }
        }
    }
      , vq = function() {
        return {
            name: "authProvider",
            Z: "a valid Auth provider",
            optional: !1,
            aa: function(a) {
                return !!(a && a.providerId && a.hasOwnProperty && a.hasOwnProperty("isOAuthProvider"))
            }
        }
    }
      , wq = function(a, b) {
        return r(a) && "string" === typeof a.type && a.type === b && "function" === typeof a.dd
    }
      , xq = function(a) {
        return r(a) && "string" === typeof a.uid
    }
      , yq = function() {
        return {
            name: "applicationVerifier",
            Z: "an implementation of firebase.auth.ApplicationVerifier",
            optional: !1,
            aa: function(a) {
                return !(!a || "string" !== typeof a.type || "function" !== typeof a.verify)
            }
        }
    }
      , X = function(a, b, c, d) {
        return {
            name: c || "",
            Z: a.Z + " or " + b.Z,
            optional: !!d,
            aa: function(e) {
                return a.aa(e) || b.aa(e)
            }
        }
    };
    var Y = function(a, b) {
        for (var c in b) {
            var d = b[c].name;
            a[d] = zq(d, a[c], b[c].g)
        }
    }
      , Aq = function(a, b) {
        for (var c in b) {
            var d = b[c].name;
            d !== c && Object.defineProperty(a, d, {
                get: ya(function(e) {
                    return this[e]
                }, c),
                set: ya(function(e, f, g, h) {
                    mq(e, [g], [h], !0);
                    this[f] = h
                }, d, c, b[c].ef),
                enumerable: !0
            })
        }
    }
      , Z = function(a, b, c, d) {
        a[b] = zq(b, c, d)
    }
      , zq = function(a, b, c) {
        if (!c)
            return b;
        var d = Bq(a);
        a = function() {
            var g = Array.prototype.slice.call(arguments);
            mq(d, c, g);
            return b.apply(this, g)
        }
        ;
        for (var e in b)
            a[e] = b[e];
        for (var f in b.prototype)
            a.prototype[f] = b.prototype[f];
        return a
    }
      , Bq = function(a) {
        a = a.split(".");
        return a[a.length - 1]
    };
    function Cq() {}
    P(Cq, "FACTOR_ID", "phone");
    Y(T.prototype, {
        applyActionCode: {
            name: "applyActionCode",
            g: [V("code")]
        },
        checkActionCode: {
            name: "checkActionCode",
            g: [V("code")]
        },
        confirmPasswordReset: {
            name: "confirmPasswordReset",
            g: [V("code"), V("newPassword")]
        },
        createUserWithEmailAndPassword: {
            name: "createUserWithEmailAndPassword",
            g: [V("email"), V("password")]
        },
        fetchSignInMethodsForEmail: {
            name: "fetchSignInMethodsForEmail",
            g: [V("email")]
        },
        getRedirectResult: {
            name: "getRedirectResult",
            g: []
        },
        isSignInWithEmailLink: {
            name: "isSignInWithEmailLink",
            g: [V("emailLink")]
        },
        onAuthStateChanged: {
            name: "onAuthStateChanged",
            g: [X(W(), oq(), "nextOrObserver"), oq("opt_error", !0), oq("opt_completed", !0)]
        },
        onIdTokenChanged: {
            name: "onIdTokenChanged",
            g: [X(W(), oq(), "nextOrObserver"), oq("opt_error", !0), oq("opt_completed", !0)]
        },
        sendPasswordResetEmail: {
            name: "sendPasswordResetEmail",
            g: [V("email"), X(W("opt_actionCodeSettings", !0), pq(null, !0), "opt_actionCodeSettings", !0)]
        },
        sendSignInLinkToEmail: {
            name: "sendSignInLinkToEmail",
            g: [V("email"), W("actionCodeSettings")]
        },
        setPersistence: {
            name: "setPersistence",
            g: [V("persistence")]
        },
        signInAndRetrieveDataWithCredential: {
            name: "signInAndRetrieveDataWithCredential",
            g: [tq()]
        },
        signInAnonymously: {
            name: "signInAnonymously",
            g: []
        },
        signInWithCredential: {
            name: "signInWithCredential",
            g: [tq()]
        },
        signInWithCustomToken: {
            name: "signInWithCustomToken",
            g: [V("token")]
        },
        signInWithEmailAndPassword: {
            name: "signInWithEmailAndPassword",
            g: [V("email"), V("password")]
        },
        signInWithEmailLink: {
            name: "signInWithEmailLink",
            g: [V("email"), V("emailLink", !0)]
        },
        signInWithPhoneNumber: {
            name: "signInWithPhoneNumber",
            g: [V("phoneNumber"), yq()]
        },
        signInWithPopup: {
            name: "signInWithPopup",
            g: [vq()]
        },
        signInWithRedirect: {
            name: "signInWithRedirect",
            g: [vq()]
        },
        updateCurrentUser: {
            name: "updateCurrentUser",
            g: [X(function(a) {
                return {
                    name: "user",
                    Z: "an instance of Firebase User",
                    optional: !!a,
                    aa: function(b) {
                        return !!(b && b instanceof S)
                    }
                }
            }(), pq(), "user")]
        },
        signOut: {
            name: "signOut",
            g: []
        },
        toJSON: {
            name: "toJSON",
            g: [V(null, !0)]
        },
        useDeviceLanguage: {
            name: "useDeviceLanguage",
            g: []
        },
        useEmulator: {
            name: "useEmulator",
            g: [V("url"), W("options", !0)]
        },
        verifyPasswordResetCode: {
            name: "verifyPasswordResetCode",
            g: [V("code")]
        }
    });
    Aq(T.prototype, {
        lc: {
            name: "languageCode",
            ef: X(V(), pq(), "languageCode")
        },
        ti: {
            name: "tenantId",
            ef: X(V(), pq(), "tenantId")
        }
    });
    T.Persistence = Sn;
    T.Persistence.LOCAL = "local";
    T.Persistence.SESSION = "session";
    T.Persistence.NONE = "none";
    Y(S.prototype, {
        "delete": {
            name: "delete",
            g: []
        },
        getIdTokenResult: {
            name: "getIdTokenResult",
            g: [nq("opt_forceRefresh", !0)]
        },
        getIdToken: {
            name: "getIdToken",
            g: [nq("opt_forceRefresh", !0)]
        },
        linkAndRetrieveDataWithCredential: {
            name: "linkAndRetrieveDataWithCredential",
            g: [tq()]
        },
        linkWithCredential: {
            name: "linkWithCredential",
            g: [tq()]
        },
        linkWithPhoneNumber: {
            name: "linkWithPhoneNumber",
            g: [V("phoneNumber"), yq()]
        },
        linkWithPopup: {
            name: "linkWithPopup",
            g: [vq()]
        },
        linkWithRedirect: {
            name: "linkWithRedirect",
            g: [vq()]
        },
        reauthenticateAndRetrieveDataWithCredential: {
            name: "reauthenticateAndRetrieveDataWithCredential",
            g: [tq()]
        },
        reauthenticateWithCredential: {
            name: "reauthenticateWithCredential",
            g: [tq()]
        },
        reauthenticateWithPhoneNumber: {
            name: "reauthenticateWithPhoneNumber",
            g: [V("phoneNumber"), yq()]
        },
        reauthenticateWithPopup: {
            name: "reauthenticateWithPopup",
            g: [vq()]
        },
        reauthenticateWithRedirect: {
            name: "reauthenticateWithRedirect",
            g: [vq()]
        },
        reload: {
            name: "reload",
            g: []
        },
        sendEmailVerification: {
            name: "sendEmailVerification",
            g: [X(W("opt_actionCodeSettings", !0), pq(null, !0), "opt_actionCodeSettings", !0)]
        },
        toJSON: {
            name: "toJSON",
            g: [V(null, !0)]
        },
        unlink: {
            name: "unlink",
            g: [V("provider")]
        },
        updateEmail: {
            name: "updateEmail",
            g: [V("email")]
        },
        updatePassword: {
            name: "updatePassword",
            g: [V("password")]
        },
        updatePhoneNumber: {
            name: "updatePhoneNumber",
            g: [tq("phone")]
        },
        updateProfile: {
            name: "updateProfile",
            g: [W("profile")]
        },
        verifyBeforeUpdateEmail: {
            name: "verifyBeforeUpdateEmail",
            g: [V("email"), X(W("opt_actionCodeSettings", !0), pq(null, !0), "opt_actionCodeSettings", !0)]
        }
    });
    Y(Jm.prototype, {
        execute: {
            name: "execute"
        },
        render: {
            name: "render"
        },
        reset: {
            name: "reset"
        },
        getResponse: {
            name: "getResponse"
        }
    });
    Y(Em.prototype, {
        execute: {
            name: "execute"
        },
        render: {
            name: "render"
        },
        reset: {
            name: "reset"
        },
        getResponse: {
            name: "getResponse"
        }
    });
    Y(F.prototype, {
        Wb: {
            name: "finally"
        },
        h: {
            name: "catch"
        },
        then: {
            name: "then"
        }
    });
    Aq(Dn.prototype, {
        appVerificationDisabled: {
            name: "appVerificationDisabledForTesting",
            ef: nq("appVerificationDisabledForTesting")
        }
    });
    Y(Gn.prototype, {
        confirm: {
            name: "confirm",
            g: [V("verificationCode")]
        }
    });
    Z(sk, "fromJSON", function(a) {
        a = "string" === typeof a ? JSON.parse(a) : a;
        for (var b, c = [Ak, Sk, Zk, yk], d = 0; d < c.length; d++)
            if (b = c[d](a))
                return b;
        return null
    }, [X(V(), W(), "json")]);
    Z(Mk, "credential", function(a, b) {
        return new Nk(a,b)
    }, [V("email"), V("password")]);
    Y(Nk.prototype, {
        A: {
            name: "toJSON",
            g: [V(null, !0)]
        }
    });
    Y(Ek.prototype, {
        addScope: {
            name: "addScope",
            g: [V("scope")]
        },
        setCustomParameters: {
            name: "setCustomParameters",
            g: [W("customOAuthParameters")]
        }
    });
    Z(Ek, "credential", Fk, [X(V(), W(), "token")]);
    Z(Mk, "credentialWithLink", Uk, [V("email"), V("emailLink")]);
    Y(Gk.prototype, {
        addScope: {
            name: "addScope",
            g: [V("scope")]
        },
        setCustomParameters: {
            name: "setCustomParameters",
            g: [W("customOAuthParameters")]
        }
    });
    Z(Gk, "credential", Hk, [X(V(), W(), "token")]);
    Y(Ik.prototype, {
        addScope: {
            name: "addScope",
            g: [V("scope")]
        },
        setCustomParameters: {
            name: "setCustomParameters",
            g: [W("customOAuthParameters")]
        }
    });
    Z(Ik, "credential", Jk, [X(V(), X(W(), pq()), "idToken"), X(V(), pq(), "accessToken", !0)]);
    Y(Kk.prototype, {
        setCustomParameters: {
            name: "setCustomParameters",
            g: [W("customOAuthParameters")]
        }
    });
    Z(Kk, "credential", Lk, [X(V(), W(), "token"), V("secret", !0)]);
    Y(Dk.prototype, {
        addScope: {
            name: "addScope",
            g: [V("scope")]
        },
        credential: {
            name: "credential",
            g: [X(V(), X(W(), pq()), "optionsOrIdToken"), X(V(), pq(), "accessToken", !0)]
        },
        setCustomParameters: {
            name: "setCustomParameters",
            g: [W("customOAuthParameters")]
        }
    });
    Y(zk.prototype, {
        A: {
            name: "toJSON",
            g: [V(null, !0)]
        }
    });
    Y(uk.prototype, {
        A: {
            name: "toJSON",
            g: [V(null, !0)]
        }
    });
    Z($k, "credential", dl, [V("verificationId"), V("verificationCode")]);
    Y($k.prototype, {
        verifyPhoneNumber: {
            name: "verifyPhoneNumber",
            g: [X(V(), function(a, b) {
                return {
                    name: a || "phoneInfoOptions",
                    Z: "valid phone info options",
                    optional: !!b,
                    aa: function(c) {
                        return c ? c.session && c.phoneNumber ? wq(c.session, "enroll") && "string" === typeof c.phoneNumber : c.session && c.multiFactorHint ? wq(c.session, "signin") && xq(c.multiFactorHint) : c.session && c.multiFactorUid ? wq(c.session, "signin") && "string" === typeof c.multiFactorUid : c.phoneNumber ? "string" === typeof c.phoneNumber : !1 : !1
                    }
                }
            }(), "phoneInfoOptions"), yq()]
        }
    });
    Y(Vk.prototype, {
        A: {
            name: "toJSON",
            g: [V(null, !0)]
        }
    });
    Y(Q.prototype, {
        toJSON: {
            name: "toJSON",
            g: [V(null, !0)]
        }
    });
    Y(gl.prototype, {
        toJSON: {
            name: "toJSON",
            g: [V(null, !0)]
        }
    });
    Y(mk.prototype, {
        toJSON: {
            name: "toJSON",
            g: [V(null, !0)]
        }
    });
    Y(Mo.prototype, {
        toJSON: {
            name: "toJSON",
            g: [V(null, !0)]
        }
    });
    Y(Lo.prototype, {
        resolveSignIn: {
            name: "resolveSignIn",
            g: [uq()]
        }
    });
    Y(Vo.prototype, {
        getSession: {
            name: "getSession",
            g: []
        },
        enroll: {
            name: "enroll",
            g: [uq(), V("displayName", !0)]
        },
        unenroll: {
            name: "unenroll",
            g: [X({
                name: "multiFactorInfo",
                Z: "a valid multiFactorInfo",
                optional: !1,
                aa: xq
            }, V(), "multiFactorInfoIdentifier")]
        }
    });
    Y(Um.prototype, {
        clear: {
            name: "clear",
            g: []
        },
        render: {
            name: "render",
            g: []
        },
        verify: {
            name: "verify",
            g: []
        }
    });
    Z(jk, "parseLink", kk, [V("link")]);
    Z(Cq, "assertion", function(a) {
        return new So(a)
    }, [tq("phone")]);
    (function() {
        if ("undefined" !== typeof firebase && firebase.INTERNAL && firebase.INTERNAL.registerService) {
            var a = {
                ActionCodeInfo: {
                    Operation: {
                        EMAIL_SIGNIN: "EMAIL_SIGNIN",
                        PASSWORD_RESET: "PASSWORD_RESET",
                        RECOVER_EMAIL: "RECOVER_EMAIL",
                        REVERT_SECOND_FACTOR_ADDITION: "REVERT_SECOND_FACTOR_ADDITION",
                        VERIFY_AND_CHANGE_EMAIL: "VERIFY_AND_CHANGE_EMAIL",
                        VERIFY_EMAIL: "VERIFY_EMAIL"
                    }
                },
                Auth: T,
                AuthCredential: sk,
                Error: Q
            };
            Z(a, "EmailAuthProvider", Mk, []);
            Z(a, "FacebookAuthProvider", Ek, []);
            Z(a, "GithubAuthProvider", Gk, []);
            Z(a, "GoogleAuthProvider", Ik, []);
            Z(a, "TwitterAuthProvider", Kk, []);
            Z(a, "OAuthProvider", Dk, [V("providerId")]);
            Z(a, "SAMLAuthProvider", Ck, [V("providerId")]);
            Z(a, "PhoneAuthProvider", $k, [rq()]);
            Z(a, "RecaptchaVerifier", Um, [X(V(), qq(), "recaptchaContainer"), W("recaptchaParameters", !0), sq()]);
            Z(a, "ActionCodeURL", jk, []);
            Z(a, "PhoneMultiFactorGenerator", Cq, []);
            firebase.INTERNAL.registerService("auth", function(b, c) {
                b = new T(b);
                c({
                    INTERNAL: {
                        getUid: t(b.getUid, b),
                        getToken: t(b.aj, b),
                        addAuthTokenListener: t(b.Fi, b),
                        removeAuthTokenListener: t(b.Wj, b)
                    }
                });
                return b
            }, a, function(b, c) {
                if ("create" === b)
                    try {
                        c.auth()
                    } catch (d) {}
            });
            firebase.INTERNAL.extendNamespace({
                User: S
            })
        } else
            throw Error("Cannot find the firebase namespace; be sure to include firebase-app.js before this library.");
    }
    )();
    var Dq = function() {
        this.Li = "/__/firebase/init.json";
        this.Mi = new hi
    };
    Dq.prototype.Ke = function(a, b, c, d, e, f) {
        return new F(function(g, h) {
            try {
                if (f) {
                    a.Xb = Math.max(0, f);
                    var l = setTimeout(function() {
                        a.dispatchEvent("timeout")
                    }, f)
                }
                a.listen("complete", function() {
                    l && clearTimeout(l);
                    var n = null
                      , q = Vi(a);
                    if (200 === Ti(a))
                        try {
                            n = JSON.parse(q) || null,
                            g(n || null)
                        } catch (A) {
                            h(Error(q))
                        }
                    else
                        404 === Ti(a) ? h(Error("resource-not-found")) : h(Error(q))
                });
                a.yc("ready", function() {
                    l && clearTimeout(l);
                    a.Va()
                });
                a.yc("timeout", function() {
                    l && clearTimeout(l);
                    a.Va();
                    h(Error("Request timed out"))
                });
                a.send(b, c, d, e)
            } catch (n) {
                h(n)
            }
        }
        )
    }
    ;
    var Eq = function(a) {
        return a.Ke(new Ji(a.Mi), a.Li, "GET", null, {
            "Content-type": "application/json"
        }, 1E4)
    };
    function Fq(a) {
        var b = p.window.location;
        var c = void 0 === c ? mg : c;
        a: {
            c = void 0 === c ? mg : c;
            for (var d = 0; d < c.length; ++d) {
                var e = c[d];
                if (e instanceof kg && e.Cj(a)) {
                    a = new Bb(a,Ab);
                    break a
                }
            }
            a = void 0
        }
        a = a || Jb;
        if (a instanceof Bb)
            var f = Cb(a);
        else {
            b: if (gg) {
                try {
                    f = new URL(a)
                } catch (g) {
                    f = "https:";
                    break b
                }
                f = f.protocol
            } else
                c: {
                    f = document.createElement("a");
                    try {
                        f.href = a
                    } catch (g) {
                        f = void 0;
                        break c
                    }
                    f = f.protocol;
                    f = ":" === f || "" === f ? "https:" : f
                }
            "javascript:" === f ? (ig(a),
            f = void 0) : f = a
        }
        void 0 !== f && b.assign(f)
    }
    function Gq() {
        var a = p.window;
        var b = a || p.window;
        try {
            var c = !(!b || b == b.top)
        } catch (d) {
            c = !1
        }
        if (c)
            try {
                return !(a.parent.location.hostname == a.location.hostname && a.parent.location.protocol == a.location.protocol)
            } catch (d) {
                return !0
            }
        return !1
    }
    function Hq(a) {
        a = (a || "en").toLowerCase().split(/[\-_]/);
        return 0 < a.length && ("en" != a[0] || 1 < a.length && "en" == a[0] && "xa" == a[1])
    }
    ;var Iq = function(a) {
        this.ic = a
    };
    Iq.prototype.render = function(a) {
        this.clear();
        this.xa = a;
        this.xa.render(this.ic)
    }
    ;
    Iq.prototype.clear = function() {
        this.xa && this.xa.Va()
    }
    ;
    Iq.prototype.Jb = function() {
        return this.ic
    }
    ;
    Iq.prototype.Ne = function(a) {
        this.xa && this.xa.Ne(a)
    }
    ;
    function Jq(a, b) {
        b = new Fh(b);
        a.render(b)
    }
    ;function Kq(a, b, c) {
        var d = null;
        b.checkActionCode(c).then(function(e) {
            d = e.data.email;
            return b.applyActionCode(c)
        }).then(function() {
            Lq(a, b, d)
        }, function() {
            var e = new Eh;
            a.render(e)
        })
    }
    var Lq = function(a, b, c) {
        var d = new uh(c,function() {
            d.Xd(t(b.sendPasswordResetEmail, b), [c], function() {
                a.clear();
                var e = new wh(c);
                a.render(e)
            }, function() {
                a.Ne(Gh().toString())
            })
        }
        );
        a.render(d)
    };
    function Mq(a, b, c, d) {
        var e = d ? function() {
            Fq(d)
        }
        : void 0;
        b.verifyPasswordResetCode(c).then(function(f) {
            f = new Mh(f,function() {
                Nq(a, b, c, e)
            }
            );
            a.render(f)
        }, function(f) {
            Oq(a, f)
        })
    }
    var Nq = function(a, b, c, d) {
        var e = a.xa.Ji();
        e && a.xa.Xd(t(b.confirmPasswordReset, b), [c, e], function() {
            var f = new Ch(d);
            a.render(f)
        }, function(f) {
            Oq(a, f)
        })
    }
      , Oq = function(a, b) {
        var c = b.code;
        if ("auth/weak-password" === c) {
            Ye(a.xa.rc(), !1);
            c = a.xa.nh();
            b = b = {
                code: b.code
            };
            var d = b.code;
            yg();
            if (K["firebaseui.auth.soy2.strings.error"])
                b = K["firebaseui.auth.soy2.strings.error"]({
                    code: d
                }, void 0);
            else
                switch (b = "",
                d = L(null == d || "string" === typeof d, "code", d, "null|string|undefined"),
                r(d) ? d.toString() : d) {
                case "auth/email-already-in-use":
                    b += "The email address is already used by another account";
                    break;
                case "auth/requires-recent-login":
                    b += Hh();
                    break;
                case "auth/too-many-requests":
                    b += "You have entered an incorrect password too many times. Please try again in a few minutes.";
                    break;
                case "auth/user-cancelled":
                    b += "Please authorize the required permissions to sign in to the application";
                    break;
                case "auth/user-not-found":
                    b += "That email address doesn't match an existing account";
                    break;
                case "auth/user-token-expired":
                    b += Hh();
                    break;
                case "auth/weak-password":
                    b += "The password must be at least 6 characters long";
                    break;
                case "auth/wrong-password":
                    b += "The email and password you entered don't match";
                    break;
                case "auth/network-request-failed":
                    b += "A network error has occurred";
                    break;
                case "auth/invalid-phone-number":
                    d = K["firebaseui.auth.soy2.strings.errorInvalidPhoneNumber"] ? K["firebaseui.auth.soy2.strings.errorInvalidPhoneNumber"](null, void 0) : "Enter a valid phone number";
                    b += d;
                    break;
                case "auth/invalid-verification-code":
                    d = K["firebaseui.auth.soy2.strings.errorInvalidConfirmationCode"] ? K["firebaseui.auth.soy2.strings.errorInvalidConfirmationCode"](null, void 0) : "Wrong code. Try again.";
                    b += d;
                    break;
                case "auth/code-expired":
                    b += "This code is no longer valid";
                    break;
                case "auth/expired-action-code":
                    b += "This code has expired.";
                    break;
                case "auth/invalid-action-code":
                    b += "The action code is invalid. This can happen if the code is malformed, expired, or has already been used."
                }
            df(c, b.toString());
            a.xa.rc().focus()
        } else
            "auth/password-does-not-meet-requirements" === c ? (Ye(a.xa.rc(), !1),
            df(a.xa.nh(), b.message),
            a.xa.rc().focus()) : (c = new Dh,
            a.render(c))
    };
    function Pq(a, b, c, d) {
        var e = d ? function() {
            Fq(d)
        }
        : void 0
          , f = null;
        b.checkActionCode(c).then(function(g) {
            f = g.data.email;
            return b.applyActionCode(c)
        }).then(function() {
            var g = new zh(f,e);
            a.render(g)
        }, function() {
            var g = new Ah;
            a.render(g)
        })
    }
    ;function Qq(a, b, c, d) {
        var e = d ? function() {
            Fq(d)
        }
        : void 0;
        b.applyActionCode(c).then(function() {
            var f = new xh(e);
            a.render(f)
        }, function() {
            var f = new yh;
            a.render(f)
        })
    }
    ;function Rq(a, b, c) {
        var d = null
          , e = null;
        b.checkActionCode(c).then(function(f) {
            d = f.data.email;
            e = f.data.multiFactorInfo;
            return b.applyActionCode(c)
        }).then(function() {
            Sq(a, b, d, e)
        }, function() {
            var f = new Bh;
            a.render(f)
        })
    }
    var Sq = function(a, b, c, d) {
        var e = new Nh(d.factorId,function() {
            e.Xd(t(b.sendPasswordResetEmail, b), [c], function() {
                a.clear();
                var f = new wh(c);
                a.render(f)
            }, function() {
                a.Ne(Gh().toString())
            })
        }
        ,d.phoneNumber);
        a.render(e)
    };
    var Uq = function(a, b, c) {
        return Tq(c).then(function(d) {
            (new d(b)).start(a.Jb(), {
                callbacks: {
                    uiShown: function() {
                        a.clear()
                    }
                }
            })
        })
    }
      , Vq = new Hj(3E4,6E4)
      , Wq = jb("https://www.gstatic.com/firebasejs/ui/%{version}/firebase-ui-auth__%{lang}.js")
      , Xq = jb("https://www.gstatic.com/firebasejs/ui/%{version}/firebase-ui-auth.css")
      , Yq = jb("https://www.gstatic.com/firebasejs/ui/%{version}/firebase-ui-auth-rtl.css")
      , Tq = function(a) {
        var b = Error("Unable to load dependencies!");
        return new F(function(c, d) {
            var e = setTimeout(function() {
                d(b)
            }, Vq.get())
              , f = qb(Wq, {
                version: "4.5.0",
                lang: a.replace("-", "_").toLowerCase()
            });
            G(Ii(f)).then(function() {
                clearTimeout(e);
                var g = qb(ef.test(a) ? Yq : Xq, {
                    version: "4.5.0"
                })
                  , h = $c("LINK");
                h.setAttribute("rel", "stylesheet");
                h.setAttribute("type", "text/css");
                h.setAttribute("href", mb(g).toString());
                document.head.appendChild(h);
                O("firebaseui.auth.AuthUI") ? c(O("firebaseui.auth.AuthUI")) : d(b)
            }).h(function() {
                clearTimeout(e);
                d(b)
            })
        }
        )
    };
    var ar = function(a, b) {
        this.ic = a;
        a = Zq("apiKey", b) || "";
        a: {
            var c = Zq("mode", b) || "";
            for (d in $q)
                if ($q[d].mode.toLowerCase() == c.toLowerCase()) {
                    var d = $q[d].handler;
                    break a
                }
            d = null
        }
        this.s = {
            apiKey: a,
            handler: d,
            oobCode: Zq("oobCode", b) || "",
            continueUrl: Zq("continueUrl", b) || null,
            lang: Zq("lang", b) || "en",
            mode: Zq("mode", b) || "",
            tenantId: Zq("tenantId", b) || null
        }
    };
    m(ar, Iq);
    ar.prototype.start = function() {
        var a = this;
        br(ef.test(this.s.lang || "en"));
        var b = new qh;
        this.render(b);
        if (Gq())
            Jq(this, "The page is displayed in a cross origin iframe.");
        else {
            if (this.s.handler && this.s.apiKey && this.s.oobCode && this.s.mode)
                return this.o = firebase.initializeApp({
                    apiKey: this.s.apiKey
                }, this.s.apiKey),
                this.Cb = this.o.auth(),
                this.s.tenantId && (this.Cb.tenantId = this.s.tenantId),
                this.jc = this.s.continueUrl,
                this.Ki = new Dq,
                b = G(),
                this.jc && uc() && (b = Eq(this.Ki).then(function(c) {
                    return c
                }, function(c) {
                    if (c && c.message && "resource-not-found" === c.message)
                        return {
                            apiKey: a.s.apiKey
                        };
                    throw c;
                }).then(function(c) {
                    return El(new nl(c && c.apiKey || a.s.apiKey))
                }).then(function(c) {
                    if (!kj(c, a.jc))
                        throw new mk(a.jc);
                })),
                b.then(function() {
                    return a.s.handler(a, a.Cb, a.s.oobCode, a.s.lang, a.jc)
                }, function(c) {
                    Jq(a, c.message)
                });
            Jq(this, "The selected page mode is invalid.")
        }
        return G()
    }
    ;
    ar.prototype.qc = function() {
        return this.s.handler
    }
    ;
    ar.prototype.Ib = function() {
        return this.s.apiKey
    }
    ;
    ar.prototype.Aa = function() {
        return this.s.tenantId
    }
    ;
    var cr = function(a, b, c, d, e, f) {
        if (Hq(e))
            return Uq(a, b, e).h(function() {
                c(a, b, d, f)
            });
        c(a, b, d, f);
        return G()
    }
      , Zq = function(a, b) {
        b = b || window.location.href;
        var c = b.search(pf);
        b: {
            var d = 0;
            for (var e = a.length; 0 <= (d = b.indexOf(a, d)) && d < c; ) {
                var f = b.charCodeAt(d - 1);
                if (38 == f || 63 == f)
                    if (f = b.charCodeAt(d + e),
                    !f || 61 == f || 38 == f || 35 == f)
                        break b;
                d += e + 1
            }
            d = -1
        }
        if (0 > d)
            a = null;
        else {
            e = b.indexOf("&", d);
            if (0 > e || e > c)
                e = c;
            d += a.length + 1;
            a = decodeURIComponent(b.slice(d, -1 !== e ? e : 0).replace(/\+/g, " "))
        }
        return a
    }
      , er = function(a, b) {
        a = r(a) && 1 == a.nodeType ? a : document.querySelector(String(a));
        if (null == a)
            throw Error("Cannot find action widget container.");
        dr = new ar(a,b);
        dr.start()
    }
      , br = function(a) {
        a ? Te(Nb(jb('@import url(https://fonts.googleapis.com/css?family=Roboto:400,500,700&display=swap);dialog{position:absolute;left:0;right:0;width:-moz-fit-content;width:-webkit-fit-content;width:fit-content;height:-moz-fit-content;height:-webkit-fit-content;height:fit-content;margin:auto;border:solid;padding:1em;background:#fff;color:#000;display:none}dialog[open]{display:block}dialog+.backdrop{position:fixed;top:0;right:0;bottom:0;left:0;background:rgba(0,0,0,.1)}@media screen and (max-width:540px){dialog[_polyfill_modal]{top:0;width:auto;margin:1em}}._dialog_overlay{position:fixed;top:0;right:0;bottom:0;left:0}.mdl-button{background:transparent;border:none;border-radius:2px;color:#000;position:relative;height:36px;margin:0;min-width:64px;padding:0 16px;display:inline-block;font-family:Roboto,Helvetica,Arial,sans-serif;font-size:14px;font-weight:500;text-transform:uppercase;line-height:1;letter-spacing:0;overflow:hidden;will-change:box-shadow;-webkit-transition:box-shadow .2s cubic-bezier(.4,0,1,1),background-color .2s cubic-bezier(.4,0,.2,1),color .2s cubic-bezier(.4,0,.2,1);transition:box-shadow .2s cubic-bezier(.4,0,1,1),background-color .2s cubic-bezier(.4,0,.2,1),color .2s cubic-bezier(.4,0,.2,1);outline:none;cursor:pointer;text-decoration:none;text-align:center;line-height:36px;vertical-align:middle}.mdl-button::-moz-focus-inner{border:0}.mdl-button:hover{background-color:hsla(0,0%,62%,.2)}.mdl-button:focus:not(:active){background-color:rgba(0,0,0,.12)}.mdl-button:active{background-color:hsla(0,0%,62%,.4)}.mdl-button.mdl-button--colored{color:#3f51b5}.mdl-button.mdl-button--colored:focus:not(:active){background-color:rgba(0,0,0,.12)}input.mdl-button[type=submit]{-webkit-appearance:none}.mdl-button--raised{background:hsla(0,0%,62%,.2);box-shadow:0 2px 2px 0 rgba(0,0,0,.14),0 3px 1px -2px rgba(0,0,0,.2),0 1px 5px 0 rgba(0,0,0,.12)}.mdl-button--raised:active{box-shadow:0 4px 5px 0 rgba(0,0,0,.14),0 1px 10px 0 rgba(0,0,0,.12),0 2px 4px -1px rgba(0,0,0,.2);background-color:hsla(0,0%,62%,.4)}.mdl-button--raised:focus:not(:active){box-shadow:0 0 8px rgba(0,0,0,.18),0 8px 16px rgba(0,0,0,.36);background-color:hsla(0,0%,62%,.4)}.mdl-button--raised.mdl-button--colored{background:#3f51b5;color:#fff}.mdl-button--raised.mdl-button--colored:hover{background-color:#3f51b5}.mdl-button--raised.mdl-button--colored:active{background-color:#3f51b5}.mdl-button--raised.mdl-button--colored:focus:not(:active){background-color:#3f51b5}.mdl-button--raised.mdl-button--colored .mdl-ripple{background:#fff}.mdl-button--fab{border-radius:50%;font-size:24px;height:56px;margin:auto;min-width:56px;width:56px;padding:0;overflow:hidden;background:hsla(0,0%,62%,.2);box-shadow:0 1px 1.5px 0 rgba(0,0,0,.12),0 1px 1px 0 rgba(0,0,0,.24);position:relative;line-height:normal}.mdl-button--fab .material-icons{position:absolute;top:50%;left:50%;-webkit-transform:translate(-12px,-12px);transform:translate(-12px,-12px);line-height:24px;width:24px}.mdl-button--fab.mdl-button--mini-fab{height:40px;min-width:40px;width:40px}.mdl-button--fab .mdl-button__ripple-container{border-radius:50%;-webkit-mask-image:-webkit-radial-gradient(circle,#fff,#000)}.mdl-button--fab:active{box-shadow:0 4px 5px 0 rgba(0,0,0,.14),0 1px 10px 0 rgba(0,0,0,.12),0 2px 4px -1px rgba(0,0,0,.2);background-color:hsla(0,0%,62%,.4)}.mdl-button--fab:focus:not(:active){box-shadow:0 0 8px rgba(0,0,0,.18),0 8px 16px rgba(0,0,0,.36);background-color:hsla(0,0%,62%,.4)}.mdl-button--fab.mdl-button--colored{background:#ff4081;color:#fff}.mdl-button--fab.mdl-button--colored:hover{background-color:#ff4081}.mdl-button--fab.mdl-button--colored:focus:not(:active){background-color:#ff4081}.mdl-button--fab.mdl-button--colored:active{background-color:#ff4081}.mdl-button--fab.mdl-button--colored .mdl-ripple{background:#fff}.mdl-button--icon{border-radius:50%;font-size:24px;height:32px;margin-left:0;margin-right:0;min-width:32px;width:32px;padding:0;overflow:hidden;color:inherit;line-height:normal}.mdl-button--icon .material-icons{position:absolute;top:50%;left:50%;-webkit-transform:translate(-12px,-12px);transform:translate(-12px,-12px);line-height:24px;width:24px}.mdl-button--icon.mdl-button--mini-icon{height:24px;min-width:24px;width:24px}.mdl-button--icon.mdl-button--mini-icon .material-icons{top:0;left:0}.mdl-button--icon .mdl-button__ripple-container{border-radius:50%;-webkit-mask-image:-webkit-radial-gradient(circle,#fff,#000)}.mdl-button__ripple-container{display:block;height:100%;left:0;position:absolute;top:0;width:100%;z-index:0;overflow:hidden}.mdl-button.mdl-button--disabled .mdl-button__ripple-container .mdl-ripple,.mdl-button[disabled] .mdl-button__ripple-container .mdl-ripple{background-color:transparent}.mdl-button--primary.mdl-button--primary{color:#3f51b5}.mdl-button--primary.mdl-button--primary .mdl-ripple{background:#fff}.mdl-button--primary.mdl-button--primary.mdl-button--fab,.mdl-button--primary.mdl-button--primary.mdl-button--raised{color:#fff;background-color:#3f51b5}.mdl-button--accent.mdl-button--accent{color:#ff4081}.mdl-button--accent.mdl-button--accent .mdl-ripple{background:#fff}.mdl-button--accent.mdl-button--accent.mdl-button--fab,.mdl-button--accent.mdl-button--accent.mdl-button--raised{color:#fff;background-color:#ff4081}.mdl-button.mdl-button--disabled.mdl-button--disabled,.mdl-button[disabled][disabled]{color:rgba(0,0,0,.26);cursor:default;background-color:transparent}.mdl-button--fab.mdl-button--disabled.mdl-button--disabled,.mdl-button--fab[disabled][disabled]{background-color:rgba(0,0,0,.12);color:rgba(0,0,0,.26)}.mdl-button--raised.mdl-button--disabled.mdl-button--disabled,.mdl-button--raised[disabled][disabled]{background-color:rgba(0,0,0,.12);color:rgba(0,0,0,.26);box-shadow:none}.mdl-button--colored.mdl-button--disabled.mdl-button--disabled,.mdl-button--colored[disabled][disabled]{color:rgba(0,0,0,.26)}.mdl-button .material-icons{vertical-align:middle}.mdl-card{display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-orient:vertical;-webkit-box-direction:normal;-webkit-flex-direction:column;-moz-box-orient:vertical;-moz-box-direction:normal;-ms-flex-direction:column;flex-direction:column;font-size:16px;font-weight:400;min-height:200px;overflow:hidden;width:330px;z-index:1;position:relative;background:#fff;border-radius:2px;-moz-box-sizing:border-box;box-sizing:border-box}.mdl-card__media{background-color:#ff4081;background-repeat:repeat;background-position:50% 50%;background-size:cover;background-origin:padding-box;background-attachment:scroll;-moz-box-sizing:border-box;box-sizing:border-box}.mdl-card__title{-webkit-box-align:center;-webkit-align-items:center;-moz-box-align:center;-ms-flex-align:center;align-items:center;color:#000;display:block;display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-pack:stretch;-webkit-justify-content:stretch;-moz-box-pack:stretch;-ms-flex-pack:stretch;justify-content:stretch;line-height:normal;padding:16px 16px;-webkit-perspective-origin:165px 56px;perspective-origin:165px 56px;-webkit-transform-origin:165px 56px;transform-origin:165px 56px;-moz-box-sizing:border-box;box-sizing:border-box}.mdl-card__title.mdl-card--border{border-bottom:1px solid rgba(0,0,0,.1)}.mdl-card__title-text{-webkit-align-self:flex-end;-ms-flex-item-align:end;align-self:flex-end;color:inherit;display:block;display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;font-size:24px;font-weight:300;line-height:normal;overflow:hidden;-webkit-transform-origin:149px 48px;transform-origin:149px 48px;margin:0}.mdl-card__subtitle-text{font-size:14px;color:rgba(0,0,0,.54);margin:0}.mdl-card__supporting-text{color:rgba(0,0,0,.54);font-size:1rem;line-height:18px;overflow:hidden;padding:16px 16px;width:90%}.mdl-card__supporting-text.mdl-card--border{border-bottom:1px solid rgba(0,0,0,.1)}.mdl-card__actions{font-size:16px;line-height:normal;width:100%;background-color:transparent;padding:8px;-moz-box-sizing:border-box;box-sizing:border-box}.mdl-card__actions.mdl-card--border{border-top:1px solid rgba(0,0,0,.1)}.mdl-card--expand{-webkit-box-flex:1;-webkit-flex-grow:1;-moz-box-flex:1;-ms-flex-positive:1;flex-grow:1}.mdl-card__menu{position:absolute;right:16px;top:16px}.mdl-dialog{border:none;box-shadow:0 9px 46px 8px rgba(0,0,0,.14),0 11px 15px -7px rgba(0,0,0,.12),0 24px 38px 3px rgba(0,0,0,.2);width:280px}.mdl-dialog__title{padding:24px 24px 0;margin:0;font-size:2.5rem}.mdl-dialog__actions{padding:8px 8px 8px 24px;display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-orient:horizontal;-webkit-box-direction:reverse;-webkit-flex-direction:row-reverse;-moz-box-orient:horizontal;-moz-box-direction:reverse;-ms-flex-direction:row-reverse;flex-direction:row-reverse;-webkit-flex-wrap:wrap;-ms-flex-wrap:wrap;flex-wrap:wrap}.mdl-dialog__actions>*{margin-right:8px;height:36px}.mdl-dialog__actions>:first-child{margin-right:0}.mdl-dialog__actions--full-width{padding:0 0 8px 0}.mdl-dialog__actions--full-width>*{height:48px;-webkit-box-flex:0;-webkit-flex:0 0 100%;-moz-box-flex:0;-ms-flex:0 0 100%;flex:0 0 100%;padding-right:16px;margin-right:0;text-align:right}.mdl-dialog__content{padding:20px 24px 24px 24px;color:rgba(0,0,0,.54)}.mdl-progress{display:block;position:relative;height:4px;width:500px;max-width:100%}.mdl-progress>.bar{display:block;position:absolute;top:0;bottom:0;width:0;-webkit-transition:width .2s cubic-bezier(.4,0,.2,1);transition:width .2s cubic-bezier(.4,0,.2,1)}.mdl-progress>.progressbar{background-color:#3f51b5;z-index:1;left:0}.mdl-progress>.bufferbar{background-image:-webkit-gradient(linear,left top,right top,from(hsla(0,0%,100%,.7)),to(hsla(0,0%,100%,.7))),-webkit-gradient(linear,left top,right top,from(#3f51b5),to(#3f51b5));background-image:-webkit-linear-gradient(left,hsla(0,0%,100%,.7),hsla(0,0%,100%,.7)),-webkit-linear-gradient(left,#3f51b5,#3f51b5);background-image:linear-gradient(90deg,hsla(0,0%,100%,.7),hsla(0,0%,100%,.7)),linear-gradient(90deg,#3f51b5,#3f51b5);z-index:0;left:0}.mdl-progress>.auxbar{right:0}@supports (-webkit-appearance:none){.mdl-progress:not(.mdl-progress--indeterminate):not(.mdl-progress--indeterminate)>.auxbar,.mdl-progress:not(.mdl-progress__indeterminate):not(.mdl-progress__indeterminate)>.auxbar{background-image:-webkit-gradient(linear,left top,right top,from(hsla(0,0%,100%,.7)),to(hsla(0,0%,100%,.7))),-webkit-gradient(linear,left top,right top,from(#3f51b5),to(#3f51b5));background-image:-webkit-linear-gradient(left,hsla(0,0%,100%,.7),hsla(0,0%,100%,.7)),-webkit-linear-gradient(left,#3f51b5,#3f51b5);background-image:linear-gradient(90deg,hsla(0,0%,100%,.7),hsla(0,0%,100%,.7)),linear-gradient(90deg,#3f51b5,#3f51b5);-webkit-mask:url("data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIj8+Cjxzdmcgd2lkdGg9IjEyIiBoZWlnaHQ9IjQiIHZpZXdQb3J0PSIwIDAgMTIgNCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogIDxlbGxpcHNlIGN4PSIyIiBjeT0iMiIgcng9IjIiIHJ5PSIyIj4KICAgIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9ImN4IiBmcm9tPSIyIiB0bz0iLTEwIiBkdXI9IjAuNnMiIHJlcGVhdENvdW50PSJpbmRlZmluaXRlIiAvPgogIDwvZWxsaXBzZT4KICA8ZWxsaXBzZSBjeD0iMTQiIGN5PSIyIiByeD0iMiIgcnk9IjIiIGNsYXNzPSJsb2FkZXIiPgogICAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT0iY3giIGZyb209IjE0IiB0bz0iMiIgZHVyPSIwLjZzIiByZXBlYXRDb3VudD0iaW5kZWZpbml0ZSIgLz4KICA8L2VsbGlwc2U+Cjwvc3ZnPgo=");mask:url("data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIj8+Cjxzdmcgd2lkdGg9IjEyIiBoZWlnaHQ9IjQiIHZpZXdQb3J0PSIwIDAgMTIgNCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogIDxlbGxpcHNlIGN4PSIyIiBjeT0iMiIgcng9IjIiIHJ5PSIyIj4KICAgIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9ImN4IiBmcm9tPSIyIiB0bz0iLTEwIiBkdXI9IjAuNnMiIHJlcGVhdENvdW50PSJpbmRlZmluaXRlIiAvPgogIDwvZWxsaXBzZT4KICA8ZWxsaXBzZSBjeD0iMTQiIGN5PSIyIiByeD0iMiIgcnk9IjIiIGNsYXNzPSJsb2FkZXIiPgogICAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT0iY3giIGZyb209IjE0IiB0bz0iMiIgZHVyPSIwLjZzIiByZXBlYXRDb3VudD0iaW5kZWZpbml0ZSIgLz4KICA8L2VsbGlwc2U+Cjwvc3ZnPgo=")}}.mdl-progress:not(.mdl-progress--indeterminate)>.auxbar,.mdl-progress:not(.mdl-progress__indeterminate)>.auxbar{background-image:-webkit-gradient(linear,left top,right top,from(hsla(0,0%,100%,.9)),to(hsla(0,0%,100%,.9))),-webkit-gradient(linear,left top,right top,from(#3f51b5),to(#3f51b5));background-image:-webkit-linear-gradient(left,hsla(0,0%,100%,.9),hsla(0,0%,100%,.9)),-webkit-linear-gradient(left,#3f51b5,#3f51b5);background-image:linear-gradient(90deg,hsla(0,0%,100%,.9),hsla(0,0%,100%,.9)),linear-gradient(90deg,#3f51b5,#3f51b5)}.mdl-progress.mdl-progress--indeterminate>.bar1,.mdl-progress.mdl-progress__indeterminate>.bar1{background-color:#3f51b5;-webkit-animation-name:indeterminate1;animation-name:indeterminate1;-webkit-animation-duration:2s;animation-duration:2s;-webkit-animation-iteration-count:infinite;animation-iteration-count:infinite;-webkit-animation-timing-function:linear;animation-timing-function:linear}.mdl-progress.mdl-progress--indeterminate>.bar3,.mdl-progress.mdl-progress__indeterminate>.bar3{background-image:none;background-color:#3f51b5;-webkit-animation-name:indeterminate2;animation-name:indeterminate2;-webkit-animation-duration:2s;animation-duration:2s;-webkit-animation-iteration-count:infinite;animation-iteration-count:infinite;-webkit-animation-timing-function:linear;animation-timing-function:linear}@-webkit-keyframes indeterminate1{0%{left:0;width:0}50%{left:25%;width:75%}75%{left:100%;width:0}}@keyframes indeterminate1{0%{left:0;width:0}50%{left:25%;width:75%}75%{left:100%;width:0}}@-webkit-keyframes indeterminate2{0%{left:0;width:0}50%{left:0;width:0}75%{left:0;width:25%}to{left:100%;width:0}}@keyframes indeterminate2{0%{left:0;width:0}50%{left:0;width:0}75%{left:0;width:25%}to{left:100%;width:0}}.mdl-shadow--2dp{box-shadow:0 2px 2px 0 rgba(0,0,0,.14),0 3px 1px -2px rgba(0,0,0,.2),0 1px 5px 0 rgba(0,0,0,.12)}.mdl-shadow--3dp{box-shadow:0 3px 4px 0 rgba(0,0,0,.14),0 3px 3px -2px rgba(0,0,0,.2),0 1px 8px 0 rgba(0,0,0,.12)}.mdl-shadow--4dp{box-shadow:0 4px 5px 0 rgba(0,0,0,.14),0 1px 10px 0 rgba(0,0,0,.12),0 2px 4px -1px rgba(0,0,0,.2)}.mdl-shadow--6dp{box-shadow:0 6px 10px 0 rgba(0,0,0,.14),0 1px 18px 0 rgba(0,0,0,.12),0 3px 5px -1px rgba(0,0,0,.2)}.mdl-shadow--8dp{box-shadow:0 8px 10px 1px rgba(0,0,0,.14),0 3px 14px 2px rgba(0,0,0,.12),0 5px 5px -3px rgba(0,0,0,.2)}.mdl-shadow--16dp{box-shadow:0 16px 24px 2px rgba(0,0,0,.14),0 6px 30px 5px rgba(0,0,0,.12),0 8px 10px -5px rgba(0,0,0,.2)}.mdl-shadow--24dp{box-shadow:0 9px 46px 8px rgba(0,0,0,.14),0 11px 15px -7px rgba(0,0,0,.12),0 24px 38px 3px rgba(0,0,0,.2)}.mdl-spinner{display:inline-block;position:relative;width:28px;height:28px}.mdl-spinner:not(.is-upgraded).is-active:after{content:"Loading..."}.mdl-spinner.is-upgraded.is-active{-webkit-animation:mdl-spinner__container-rotate 1.5682352941176s linear infinite;animation:mdl-spinner__container-rotate 1.5682352941176s linear infinite}@-webkit-keyframes mdl-spinner__container-rotate{to{-webkit-transform:rotate(1turn);transform:rotate(1turn)}}@keyframes mdl-spinner__container-rotate{to{-webkit-transform:rotate(1turn);transform:rotate(1turn)}}.mdl-spinner__layer{position:absolute;width:100%;height:100%;opacity:0}.mdl-spinner__layer-1{border-color:#42a5f5}.mdl-spinner--single-color .mdl-spinner__layer-1{border-color:#3f51b5}.mdl-spinner.is-active .mdl-spinner__layer-1{-webkit-animation:mdl-spinner__fill-unfill-rotate 5332ms cubic-bezier(.4,0,.2,1) infinite both,mdl-spinner__layer-1-fade-in-out 5332ms cubic-bezier(.4,0,.2,1) infinite both;animation:mdl-spinner__fill-unfill-rotate 5332ms cubic-bezier(.4,0,.2,1) infinite both,mdl-spinner__layer-1-fade-in-out 5332ms cubic-bezier(.4,0,.2,1) infinite both}.mdl-spinner__layer-2{border-color:#f44336}.mdl-spinner--single-color .mdl-spinner__layer-2{border-color:#3f51b5}.mdl-spinner.is-active .mdl-spinner__layer-2{-webkit-animation:mdl-spinner__fill-unfill-rotate 5332ms cubic-bezier(.4,0,.2,1) infinite both,mdl-spinner__layer-2-fade-in-out 5332ms cubic-bezier(.4,0,.2,1) infinite both;animation:mdl-spinner__fill-unfill-rotate 5332ms cubic-bezier(.4,0,.2,1) infinite both,mdl-spinner__layer-2-fade-in-out 5332ms cubic-bezier(.4,0,.2,1) infinite both}.mdl-spinner__layer-3{border-color:#fdd835}.mdl-spinner--single-color .mdl-spinner__layer-3{border-color:#3f51b5}.mdl-spinner.is-active .mdl-spinner__layer-3{-webkit-animation:mdl-spinner__fill-unfill-rotate 5332ms cubic-bezier(.4,0,.2,1) infinite both,mdl-spinner__layer-3-fade-in-out 5332ms cubic-bezier(.4,0,.2,1) infinite both;animation:mdl-spinner__fill-unfill-rotate 5332ms cubic-bezier(.4,0,.2,1) infinite both,mdl-spinner__layer-3-fade-in-out 5332ms cubic-bezier(.4,0,.2,1) infinite both}.mdl-spinner__layer-4{border-color:#4caf50}.mdl-spinner--single-color .mdl-spinner__layer-4{border-color:#3f51b5}.mdl-spinner.is-active .mdl-spinner__layer-4{-webkit-animation:mdl-spinner__fill-unfill-rotate 5332ms cubic-bezier(.4,0,.2,1) infinite both,mdl-spinner__layer-4-fade-in-out 5332ms cubic-bezier(.4,0,.2,1) infinite both;animation:mdl-spinner__fill-unfill-rotate 5332ms cubic-bezier(.4,0,.2,1) infinite both,mdl-spinner__layer-4-fade-in-out 5332ms cubic-bezier(.4,0,.2,1) infinite both}@-webkit-keyframes mdl-spinner__fill-unfill-rotate{12.5%{-webkit-transform:rotate(135deg);transform:rotate(135deg)}25%{-webkit-transform:rotate(270deg);transform:rotate(270deg)}37.5%{-webkit-transform:rotate(405deg);transform:rotate(405deg)}50%{-webkit-transform:rotate(540deg);transform:rotate(540deg)}62.5%{-webkit-transform:rotate(675deg);transform:rotate(675deg)}75%{-webkit-transform:rotate(810deg);transform:rotate(810deg)}87.5%{-webkit-transform:rotate(945deg);transform:rotate(945deg)}to{-webkit-transform:rotate(3turn);transform:rotate(3turn)}}@keyframes mdl-spinner__fill-unfill-rotate{12.5%{-webkit-transform:rotate(135deg);transform:rotate(135deg)}25%{-webkit-transform:rotate(270deg);transform:rotate(270deg)}37.5%{-webkit-transform:rotate(405deg);transform:rotate(405deg)}50%{-webkit-transform:rotate(540deg);transform:rotate(540deg)}62.5%{-webkit-transform:rotate(675deg);transform:rotate(675deg)}75%{-webkit-transform:rotate(810deg);transform:rotate(810deg)}87.5%{-webkit-transform:rotate(945deg);transform:rotate(945deg)}to{-webkit-transform:rotate(3turn);transform:rotate(3turn)}}@-webkit-keyframes mdl-spinner__layer-1-fade-in-out{0%{opacity:.99}25%{opacity:.99}26%{opacity:0}89%{opacity:0}90%{opacity:.99}to{opacity:.99}}@keyframes mdl-spinner__layer-1-fade-in-out{0%{opacity:.99}25%{opacity:.99}26%{opacity:0}89%{opacity:0}90%{opacity:.99}to{opacity:.99}}@-webkit-keyframes mdl-spinner__layer-2-fade-in-out{0%{opacity:0}15%{opacity:0}25%{opacity:.99}50%{opacity:.99}51%{opacity:0}}@keyframes mdl-spinner__layer-2-fade-in-out{0%{opacity:0}15%{opacity:0}25%{opacity:.99}50%{opacity:.99}51%{opacity:0}}@-webkit-keyframes mdl-spinner__layer-3-fade-in-out{0%{opacity:0}40%{opacity:0}50%{opacity:.99}75%{opacity:.99}76%{opacity:0}}@keyframes mdl-spinner__layer-3-fade-in-out{0%{opacity:0}40%{opacity:0}50%{opacity:.99}75%{opacity:.99}76%{opacity:0}}@-webkit-keyframes mdl-spinner__layer-4-fade-in-out{0%{opacity:0}65%{opacity:0}75%{opacity:.99}90%{opacity:.99}to{opacity:0}}@keyframes mdl-spinner__layer-4-fade-in-out{0%{opacity:0}65%{opacity:0}75%{opacity:.99}90%{opacity:.99}to{opacity:0}}.mdl-spinner__gap-patch{position:absolute;-moz-box-sizing:border-box;box-sizing:border-box;top:0;left:45%;width:10%;height:100%;overflow:hidden;border-color:inherit}.mdl-spinner__gap-patch .mdl-spinner__circle{width:1000%;left:-450%}.mdl-spinner__circle-clipper{display:inline-block;position:relative;width:50%;height:100%;overflow:hidden;border-color:inherit}.mdl-spinner__circle-clipper.mdl-spinner__left{float:left}.mdl-spinner__circle-clipper.mdl-spinner__right{float:right}.mdl-spinner__circle-clipper .mdl-spinner__circle{width:200%}.mdl-spinner__circle{-moz-box-sizing:border-box;box-sizing:border-box;height:100%;border-width:3px;border-style:solid;border-color:inherit;border-bottom-color:transparent!important;border-radius:50%;-webkit-animation:none;animation:none;position:absolute;top:0;right:0;bottom:0;left:0}.mdl-spinner__left .mdl-spinner__circle{border-right-color:transparent!important;-webkit-transform:rotate(129deg);transform:rotate(129deg)}.mdl-spinner.is-active .mdl-spinner__left .mdl-spinner__circle{-webkit-animation:mdl-spinner__left-spin 1333ms cubic-bezier(.4,0,.2,1) infinite both;animation:mdl-spinner__left-spin 1333ms cubic-bezier(.4,0,.2,1) infinite both}.mdl-spinner__right .mdl-spinner__circle{left:-100%;border-left-color:transparent!important;-webkit-transform:rotate(-129deg);transform:rotate(-129deg)}.mdl-spinner.is-active .mdl-spinner__right .mdl-spinner__circle{-webkit-animation:mdl-spinner__right-spin 1333ms cubic-bezier(.4,0,.2,1) infinite both;animation:mdl-spinner__right-spin 1333ms cubic-bezier(.4,0,.2,1) infinite both}@-webkit-keyframes mdl-spinner__left-spin{0%{-webkit-transform:rotate(130deg);transform:rotate(130deg)}50%{-webkit-transform:rotate(-5deg);transform:rotate(-5deg)}to{-webkit-transform:rotate(130deg);transform:rotate(130deg)}}@keyframes mdl-spinner__left-spin{0%{-webkit-transform:rotate(130deg);transform:rotate(130deg)}50%{-webkit-transform:rotate(-5deg);transform:rotate(-5deg)}to{-webkit-transform:rotate(130deg);transform:rotate(130deg)}}@-webkit-keyframes mdl-spinner__right-spin{0%{-webkit-transform:rotate(-130deg);transform:rotate(-130deg)}50%{-webkit-transform:rotate(5deg);transform:rotate(5deg)}to{-webkit-transform:rotate(-130deg);transform:rotate(-130deg)}}@keyframes mdl-spinner__right-spin{0%{-webkit-transform:rotate(-130deg);transform:rotate(-130deg)}50%{-webkit-transform:rotate(5deg);transform:rotate(5deg)}to{-webkit-transform:rotate(-130deg);transform:rotate(-130deg)}}.mdl-textfield{position:relative;font-size:16px;display:inline-block;-moz-box-sizing:border-box;box-sizing:border-box;width:300px;max-width:100%;margin:0;padding:20px 0}.mdl-textfield .mdl-button{position:absolute;bottom:20px}.mdl-textfield--align-right{text-align:right}.mdl-textfield--full-width{width:100%}.mdl-textfield--expandable{min-width:32px;width:auto;min-height:32px}.mdl-textfield--expandable .mdl-button--icon{top:16px}.mdl-textfield__input{border:none;border-bottom:1px solid rgba(0,0,0,.12);display:block;font-size:16px;font-family:Helvetica,Arial,sans-serif;margin:0;padding:4px 0;width:100%;background:none;text-align:left;color:inherit}.mdl-textfield__input[type=number]{-moz-appearance:textfield}.mdl-textfield__input[type=number]::-webkit-inner-spin-button,.mdl-textfield__input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}.mdl-textfield.is-focused .mdl-textfield__input{outline:none}.mdl-textfield.is-invalid .mdl-textfield__input{border-color:#d50000;box-shadow:none}.mdl-textfield.is-disabled .mdl-textfield__input,fieldset[disabled] .mdl-textfield .mdl-textfield__input{background-color:transparent;border-bottom:1px dotted rgba(0,0,0,.12);color:rgba(0,0,0,.26)}.mdl-textfield textarea.mdl-textfield__input{display:block}.mdl-textfield__label{bottom:0;color:rgba(0,0,0,.26);font-size:16px;left:0;right:0;pointer-events:none;position:absolute;display:block;top:24px;width:100%;overflow:hidden;white-space:nowrap;text-align:left}.mdl-textfield.has-placeholder .mdl-textfield__label,.mdl-textfield.is-dirty .mdl-textfield__label{visibility:hidden}.mdl-textfield--floating-label .mdl-textfield__label{-webkit-transition-duration:.2s;transition-duration:.2s;-webkit-transition-timing-function:cubic-bezier(.4,0,.2,1);transition-timing-function:cubic-bezier(.4,0,.2,1)}.mdl-textfield--floating-label.has-placeholder .mdl-textfield__label{-webkit-transition:none;transition:none}.mdl-textfield.is-disabled.is-disabled .mdl-textfield__label,fieldset[disabled] .mdl-textfield .mdl-textfield__label{color:rgba(0,0,0,.26)}.mdl-textfield--floating-label.has-placeholder .mdl-textfield__label,.mdl-textfield--floating-label.is-dirty .mdl-textfield__label,.mdl-textfield--floating-label.is-focused .mdl-textfield__label{color:#3f51b5;font-size:12px;top:4px;visibility:visible}.mdl-textfield--floating-label.has-placeholder .mdl-textfield__expandable-holder .mdl-textfield__label,.mdl-textfield--floating-label.is-dirty .mdl-textfield__expandable-holder .mdl-textfield__label,.mdl-textfield--floating-label.is-focused .mdl-textfield__expandable-holder .mdl-textfield__label{top:-16px}.mdl-textfield--floating-label.is-invalid .mdl-textfield__label{color:#d50000;font-size:12px}.mdl-textfield__label:after{background-color:#3f51b5;bottom:20px;content:"";height:2px;left:45%;position:absolute;-webkit-transition-duration:.2s;transition-duration:.2s;-webkit-transition-timing-function:cubic-bezier(.4,0,.2,1);transition-timing-function:cubic-bezier(.4,0,.2,1);visibility:hidden;width:10px}.mdl-textfield.is-focused .mdl-textfield__label:after{left:0;visibility:visible;width:100%}.mdl-textfield.is-invalid .mdl-textfield__label:after{background-color:#d50000}.mdl-textfield__error{color:#d50000;position:absolute;font-size:12px;margin-top:3px;visibility:hidden;display:block}.mdl-textfield.is-invalid .mdl-textfield__error{visibility:visible}.mdl-textfield__expandable-holder{position:relative;margin-left:32px;-webkit-transition-duration:.2s;transition-duration:.2s;-webkit-transition-timing-function:cubic-bezier(.4,0,.2,1);transition-timing-function:cubic-bezier(.4,0,.2,1);display:inline-block;max-width:.1px}.mdl-textfield.is-dirty .mdl-textfield__expandable-holder,.mdl-textfield.is-focused .mdl-textfield__expandable-holder{max-width:600px}.mdl-textfield__expandable-holder .mdl-textfield__label:after{bottom:0}.firebaseui-container{background-color:#fff;box-sizing:border-box;-moz-box-sizing:border-box;-webkit-box-sizing:border-box;color:rgba(0,0,0,.87);direction:rtl;font:16px Roboto,arial,sans-serif;margin:0 auto;max-width:360px;overflow:visible;position:relative;text-align:right;width:100%}.firebaseui-container.mdl-card{overflow:visible}.firebaseui-card-header{padding:24px 24px 0 24px}.firebaseui-card-content,.firebaseui-card-footer{padding:0 24px}.firebaseui-card-actions{-moz-box-sizing:border-box;box-sizing:border-box;display:table;font-size:14px;padding:8px 24px 24px 24px;text-align:right;width:100%}.firebaseui-form-links{display:table-cell;vertical-align:middle;width:100%}.firebaseui-form-actions{display:table-cell;text-align:left;white-space:nowrap;width:100%}.firebaseui-subtitle,.firebaseui-title{color:rgba(0,0,0,.87);direction:rtl;font-size:20px;font-weight:500;line-height:24px;margin:0;padding:0;text-align:right}.firebaseui-title{padding-bottom:16px}.firebaseui-subtitle{margin:16px 0}.firebaseui-text{color:rgba(0,0,0,.87);direction:rtl;font-size:16px;line-height:24px;text-align:right}.firebaseui-id-page-password-recovery-email-sent p.firebaseui-text{margin:16px 0}.firebaseui-text-emphasis{font-weight:700}.firebaseui-error{color:#dd2c00;direction:rtl;font-size:12px;line-height:16px;margin:0;text-align:right}.firebaseui-text-input-error{margin:-16px 0 16px}.firebaseui-error-wrapper{min-height:16px}.firebaseui-list-item{direction:rtl;margin:0;padding:0;text-align:right}.firebaseui-hidden{display:none}.firebaseui-relative-wrapper{position:relative}.firebaseui-label{color:rgba(0,0,0,.54);direction:rtl;font-size:16px;text-align:right}.mdl-textfield--floating-label.is-dirty .mdl-textfield__label,.mdl-textfield--floating-label.is-focused .mdl-textfield__label{color:#757575}.firebaseui-input,.firebaseui-input-invalid{border-radius:0;color:rgba(0,0,0,.87);direction:rtl;font-size:16px;width:100%}input.firebaseui-input,input.firebaseui-input-invalid{direction:rtl;text-align:right}.firebaseui-input-invalid{border-color:#dd2c00}.firebaseui-textfield{width:100%}.firebaseui-textfield.mdl-textfield .firebaseui-input{border-color:rgba(0,0,0,.12)}.firebaseui-textfield.mdl-textfield .firebaseui-label:after{background-color:#3f51b5}.firebaseui-textfield-invalid.mdl-textfield .firebaseui-input{border-color:#dd2c00}.firebaseui-textfield-invalid.mdl-textfield .firebaseui-label:after{background-color:#dd2c00}.firebaseui-button{display:inline-block;height:36px;margin-right:8px;min-width:88px}.firebaseui-link{color:#4285f4;font-variant:normal;font-weight:400;text-decoration:none}.firebaseui-link:hover{text-decoration:underline}.firebaseui-indent{margin-right:1em}.firebaseui-tos{color:#757575;direction:rtl;font-size:12px;line-height:16px;margin-bottom:24px;margin-top:0;text-align:right}.firebaseui-provider-sign-in-footer>.firebaseui-tos{text-align:center}.firebaseui-tos-list{list-style:none;text-align:left}.firebaseui-inline-list-item{display:inline-block;margin-right:5px;margin-left:5px}.firebaseui-page-provider-sign-in,.firebaseui-page-select-tenant{background:inherit}.firebaseui-idp-list,.firebaseui-tenant-list{list-style:none;margin:1em 0;padding:0}.firebaseui-idp-button,.firebaseui-tenant-button{direction:rtl;font-weight:500;height:auto;line-height:normal;max-width:220px;min-height:40px;padding:8px 16px;text-align:right;width:100%}.firebaseui-idp-list>.firebaseui-list-item,.firebaseui-tenant-list>.firebaseui-list-item{margin-bottom:15px;text-align:center}.firebaseui-idp-icon-wrapper{display:table-cell;vertical-align:middle}.firebaseui-idp-icon{border:none;display:inline-block;height:18px;vertical-align:middle;width:18px}.firebaseui-idp-favicon{border:none;display:inline-block;height:14px;margin-left:5px;vertical-align:middle;width:14px}.firebaseui-idp-text{color:#fff;display:table-cell;font-size:14px;padding-right:16px;text-transform:none;vertical-align:middle}.firebaseui-idp-text.firebaseui-idp-text-long{display:table-cell}.firebaseui-idp-text.firebaseui-idp-text-short{display:none}@media (max-width:268px){.firebaseui-idp-text.firebaseui-idp-text-long{display:none}.firebaseui-idp-text.firebaseui-idp-text-short{display:table-cell}}@media (max-width:320px){.firebaseui-recaptcha-container>div>div{transform:scale(.9);-webkit-transform:scale(.9);transform-origin:100% 0;-webkit-transform-origin:100% 0}}.firebaseui-idp-google>.firebaseui-idp-text{color:#757575}[data-provider-id="yahoo.com"]>.firebaseui-idp-icon-wrapper>.firebaseui-idp-icon{height:22px;width:22px}.firebaseui-info-bar{background-color:#f9edbe;border:1px solid #f0c36d;box-shadow:0 2px 4px rgba(0,0,0,.2);-webkit-box-shadow:0 2px 4px rgba(0,0,0,.2);-moz-box-shadow:0 2px 4px rgba(0,0,0,.2);right:10%;padding:8px 16px;position:absolute;left:10%;text-align:center;top:0}.firebaseui-info-bar-message{font-size:12px;margin:0}.firebaseui-dialog{-moz-box-sizing:border-box;box-sizing:border-box;color:rgba(0,0,0,.87);font:16px Roboto,arial,sans-serif;height:auto;max-height:-webkit-fit-content;max-height:-moz-fit-content;max-height:fit-content;padding:24px;text-align:right}.firebaseui-dialog-icon-wrapper{display:table-cell;vertical-align:middle}.firebaseui-dialog-icon{float:right;height:40px;margin-left:24px;width:40px}.firebaseui-progress-dialog-message{display:table-cell;font-size:16px;font-weight:400;min-height:40px;vertical-align:middle}.firebaseui-progress-dialog-loading-icon{height:28px;margin:6px 6px 6px 30px;width:28px}.firebaseui-icon-done{background-image:url(https://www.gstatic.com/images/icons/material/system/2x/done_googgreen_36dp.png);background-position:50%;background-repeat:no-repeat;background-size:36px 36px}.firebaseui-phone-number{display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex}.firebaseui-country-selector{background-image:url(https://www.gstatic.com/images/icons/material/system/1x/arrow_drop_down_grey600_18dp.png);background-position:0;background-repeat:no-repeat;background-size:18px auto;border-radius:0;border-bottom:1px solid rgba(0,0,0,.12);color:rgba(0,0,0,.87);-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0;font-size:16px;font-weight:400;height:auto;line-height:normal;margin:20px 0 20px 24px;padding:4px 0 4px 20px;width:90px}.firebaseui-country-selector-flag{display:inline-block;margin-left:1ex}.firebaseui-flag{background-image:url(https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/flags_sprite_2x.png);background-size:100% auto;-webkit-filter:drop-shadow(1px 1px 1px rgba(0,0,0,.54));filter:drop-shadow(1px 1px 1px rgba(0,0,0,.54));height:14px;width:24px}.firebaseui-list-box-dialog{max-height:90%;overflow:auto;padding:8px 0 0 0}.firebaseui-list-box-actions{padding-bottom:8px}.firebaseui-list-box-icon-wrapper{display:table-cell;padding-left:24px;vertical-align:top}.firebaseui-list-box-label-wrapper{display:table-cell;vertical-align:top}.firebaseui-list-box-dialog-button{color:rgba(0,0,0,.87);direction:rtl;font-size:16px;font-weight:400;height:auto;line-height:normal;min-height:48px;padding:14px 24px;text-align:right;text-transform:none;width:100%}.firebaseui-phone-number-error{margin-right:114px}.mdl-progress.firebaseui-busy-indicator{height:2px;right:0;position:absolute;top:55px;width:100%}.mdl-spinner.firebaseui-busy-indicator{direction:ltr;height:56px;right:0;margin:auto;position:absolute;left:0;top:30%;width:56px}.firebaseui-callback-indicator-container .firebaseui-busy-indicator{top:0}.firebaseui-callback-indicator-container{height:120px}.firebaseui-new-password-component{display:inline-block;position:relative;width:100%}.firebaseui-input-floating-button{background-position:50%;background-repeat:no-repeat;display:block;height:24px;position:absolute;left:0;top:20px;width:24px}.firebaseui-input-toggle-on{background-image:url(https://www.gstatic.com/images/icons/material/system/1x/visibility_black_24dp.png)}.firebaseui-input-toggle-off{background-image:url(https://www.gstatic.com/images/icons/material/system/1x/visibility_off_black_24dp.png)}.firebaseui-input-toggle-focus{opacity:.87}.firebaseui-input-toggle-blur{opacity:.38}.firebaseui-recaptcha-wrapper{display:table;margin:0 auto;padding-bottom:8px}.firebaseui-recaptcha-container{display:table-cell}.firebaseui-recaptcha-error-wrapper{caption-side:bottom;display:table-caption}.firebaseui-change-phone-number-link{display:block}.firebaseui-resend-container{direction:rtl;margin:20px 0;text-align:center}.firebaseui-id-resend-countdown{color:rgba(0,0,0,.38)}.firebaseui-id-page-phone-sign-in-start .firebaseui-form-actions div{float:right}@media (max-width:480px){.firebaseui-container{box-shadow:none;max-width:none;width:100%}.firebaseui-card-header{border-bottom:1px solid #e0e0e0;margin-bottom:16px;padding:16px 24px 0 24px}.firebaseui-title{padding-bottom:16px}.firebaseui-card-actions{padding-left:24px}.firebaseui-busy-indicator{top:0}}.mdl-textfield__label{font-weight:400;margin-bottom:0}.firebaseui-id-page-blank,.firebaseui-id-page-spinner{background:inherit;height:64px}.firebaseui-email-sent{background-image:url(https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/success_status.png);background-position:50%;background-repeat:no-repeat;background-size:64px 64px;height:64px;margin-top:16px;text-align:center}.firebaseui-text-justify{text-align:justify}.firebaseui-flag-KY{background-position:right 0 top 0}.firebaseui-flag-AC{background-position:right 0 top -14px}.firebaseui-flag-AE{background-position:right 0 top -28px}.firebaseui-flag-AF{background-position:right 0 top -42px}.firebaseui-flag-AG{background-position:right 0 top -56px}.firebaseui-flag-AI{background-position:right 0 top -70px}.firebaseui-flag-AL{background-position:right 0 top -84px}.firebaseui-flag-AM{background-position:right 0 top -98px}.firebaseui-flag-AO{background-position:right 0 top -112px}.firebaseui-flag-AQ{background-position:right 0 top -126px}.firebaseui-flag-AR{background-position:right 0 top -140px}.firebaseui-flag-AS{background-position:right 0 top -154px}.firebaseui-flag-AT{background-position:right 0 top -168px}.firebaseui-flag-AU{background-position:right 0 top -182px}.firebaseui-flag-AW{background-position:right 0 top -196px}.firebaseui-flag-AX{background-position:right 0 top -210px}.firebaseui-flag-AZ{background-position:right 0 top -224px}.firebaseui-flag-BA{background-position:right 0 top -238px}.firebaseui-flag-BB{background-position:right 0 top -252px}.firebaseui-flag-BD{background-position:right 0 top -266px}.firebaseui-flag-BE{background-position:right 0 top -280px}.firebaseui-flag-BF{background-position:right 0 top -294px}.firebaseui-flag-BG{background-position:right 0 top -308px}.firebaseui-flag-BH{background-position:right 0 top -322px}.firebaseui-flag-BI{background-position:right 0 top -336px}.firebaseui-flag-BJ{background-position:right 0 top -350px}.firebaseui-flag-BL{background-position:right 0 top -364px}.firebaseui-flag-BM{background-position:right 0 top -378px}.firebaseui-flag-BN{background-position:right 0 top -392px}.firebaseui-flag-BO{background-position:right 0 top -406px}.firebaseui-flag-BQ{background-position:right 0 top -420px}.firebaseui-flag-BR{background-position:right 0 top -434px}.firebaseui-flag-BS{background-position:right 0 top -448px}.firebaseui-flag-BT{background-position:right 0 top -462px}.firebaseui-flag-BV{background-position:right 0 top -476px}.firebaseui-flag-BW{background-position:right 0 top -490px}.firebaseui-flag-BY{background-position:right 0 top -504px}.firebaseui-flag-BZ{background-position:right 0 top -518px}.firebaseui-flag-CA{background-position:right 0 top -532px}.firebaseui-flag-CC{background-position:right 0 top -546px}.firebaseui-flag-CD{background-position:right 0 top -560px}.firebaseui-flag-CF{background-position:right 0 top -574px}.firebaseui-flag-CG{background-position:right 0 top -588px}.firebaseui-flag-CH{background-position:right 0 top -602px}.firebaseui-flag-CI{background-position:right 0 top -616px}.firebaseui-flag-CK{background-position:right 0 top -630px}.firebaseui-flag-CL{background-position:right 0 top -644px}.firebaseui-flag-CM{background-position:right 0 top -658px}.firebaseui-flag-CN{background-position:right 0 top -672px}.firebaseui-flag-CO{background-position:right 0 top -686px}.firebaseui-flag-CP{background-position:right 0 top -700px}.firebaseui-flag-CR{background-position:right 0 top -714px}.firebaseui-flag-CU{background-position:right 0 top -728px}.firebaseui-flag-CV{background-position:right 0 top -742px}.firebaseui-flag-CW{background-position:right 0 top -756px}.firebaseui-flag-CX{background-position:right 0 top -770px}.firebaseui-flag-CY{background-position:right 0 top -784px}.firebaseui-flag-CZ{background-position:right 0 top -798px}.firebaseui-flag-DE{background-position:right 0 top -812px}.firebaseui-flag-DG{background-position:right 0 top -826px}.firebaseui-flag-DJ{background-position:right 0 top -840px}.firebaseui-flag-DK{background-position:right 0 top -854px}.firebaseui-flag-DM{background-position:right 0 top -868px}.firebaseui-flag-DO{background-position:right 0 top -882px}.firebaseui-flag-DZ{background-position:right 0 top -896px}.firebaseui-flag-EA{background-position:right 0 top -910px}.firebaseui-flag-EC{background-position:right 0 top -924px}.firebaseui-flag-EE{background-position:right 0 top -938px}.firebaseui-flag-EG{background-position:right 0 top -952px}.firebaseui-flag-EH{background-position:right 0 top -966px}.firebaseui-flag-ER{background-position:right 0 top -980px}.firebaseui-flag-ES{background-position:right 0 top -994px}.firebaseui-flag-ET{background-position:right 0 top -1008px}.firebaseui-flag-EU{background-position:right 0 top -1022px}.firebaseui-flag-FI{background-position:right 0 top -1036px}.firebaseui-flag-FJ{background-position:right 0 top -1050px}.firebaseui-flag-FK{background-position:right 0 top -1064px}.firebaseui-flag-FM{background-position:right 0 top -1078px}.firebaseui-flag-FO{background-position:right 0 top -1092px}.firebaseui-flag-FR{background-position:right 0 top -1106px}.firebaseui-flag-GA{background-position:right 0 top -1120px}.firebaseui-flag-GB{background-position:right 0 top -1134px}.firebaseui-flag-GD{background-position:right 0 top -1148px}.firebaseui-flag-GE{background-position:right 0 top -1162px}.firebaseui-flag-GF{background-position:right 0 top -1176px}.firebaseui-flag-GG{background-position:right 0 top -1190px}.firebaseui-flag-GH{background-position:right 0 top -1204px}.firebaseui-flag-GI{background-position:right 0 top -1218px}.firebaseui-flag-GL{background-position:right 0 top -1232px}.firebaseui-flag-GM{background-position:right 0 top -1246px}.firebaseui-flag-GN{background-position:right 0 top -1260px}.firebaseui-flag-GP{background-position:right 0 top -1274px}.firebaseui-flag-GQ{background-position:right 0 top -1288px}.firebaseui-flag-GR{background-position:right 0 top -1302px}.firebaseui-flag-GS{background-position:right 0 top -1316px}.firebaseui-flag-GT{background-position:right 0 top -1330px}.firebaseui-flag-GU{background-position:right 0 top -1344px}.firebaseui-flag-GW{background-position:right 0 top -1358px}.firebaseui-flag-GY{background-position:right 0 top -1372px}.firebaseui-flag-HK{background-position:right 0 top -1386px}.firebaseui-flag-HM{background-position:right 0 top -1400px}.firebaseui-flag-HN{background-position:right 0 top -1414px}.firebaseui-flag-HR{background-position:right 0 top -1428px}.firebaseui-flag-HT{background-position:right 0 top -1442px}.firebaseui-flag-HU{background-position:right 0 top -1456px}.firebaseui-flag-IC{background-position:right 0 top -1470px}.firebaseui-flag-ID{background-position:right 0 top -1484px}.firebaseui-flag-IE{background-position:right 0 top -1498px}.firebaseui-flag-IL{background-position:right 0 top -1512px}.firebaseui-flag-IM{background-position:right 0 top -1526px}.firebaseui-flag-IN{background-position:right 0 top -1540px}.firebaseui-flag-IO{background-position:right 0 top -1554px}.firebaseui-flag-IQ{background-position:right 0 top -1568px}.firebaseui-flag-IR{background-position:right 0 top -1582px}.firebaseui-flag-IS{background-position:right 0 top -1596px}.firebaseui-flag-IT{background-position:right 0 top -1610px}.firebaseui-flag-JE{background-position:right 0 top -1624px}.firebaseui-flag-JM{background-position:right 0 top -1638px}.firebaseui-flag-JO{background-position:right 0 top -1652px}.firebaseui-flag-JP{background-position:right 0 top -1666px}.firebaseui-flag-KE{background-position:right 0 top -1680px}.firebaseui-flag-KG{background-position:right 0 top -1694px}.firebaseui-flag-KH{background-position:right 0 top -1708px}.firebaseui-flag-KI{background-position:right 0 top -1722px}.firebaseui-flag-KM{background-position:right 0 top -1736px}.firebaseui-flag-KN{background-position:right 0 top -1750px}.firebaseui-flag-KP{background-position:right 0 top -1764px}.firebaseui-flag-KR{background-position:right 0 top -1778px}.firebaseui-flag-KW{background-position:right 0 top -1792px}.firebaseui-flag-AD{background-position:right 0 top -1806px}.firebaseui-flag-KZ{background-position:right 0 top -1820px}.firebaseui-flag-LA{background-position:right 0 top -1834px}.firebaseui-flag-LB{background-position:right 0 top -1848px}.firebaseui-flag-LC{background-position:right 0 top -1862px}.firebaseui-flag-LI{background-position:right 0 top -1876px}.firebaseui-flag-LK{background-position:right 0 top -1890px}.firebaseui-flag-LR{background-position:right 0 top -1904px}.firebaseui-flag-LS{background-position:right 0 top -1918px}.firebaseui-flag-LT{background-position:right 0 top -1932px}.firebaseui-flag-LU{background-position:right 0 top -1946px}.firebaseui-flag-LV{background-position:right 0 top -1960px}.firebaseui-flag-LY{background-position:right 0 top -1974px}.firebaseui-flag-MA{background-position:right 0 top -1988px}.firebaseui-flag-MC{background-position:right 0 top -2002px}.firebaseui-flag-MD{background-position:right 0 top -2016px}.firebaseui-flag-ME{background-position:right 0 top -2030px}.firebaseui-flag-MF{background-position:right 0 top -2044px}.firebaseui-flag-MG{background-position:right 0 top -2058px}.firebaseui-flag-MH{background-position:right 0 top -2072px}.firebaseui-flag-MK{background-position:right 0 top -2086px}.firebaseui-flag-ML{background-position:right 0 top -2100px}.firebaseui-flag-MM{background-position:right 0 top -2114px}.firebaseui-flag-MN{background-position:right 0 top -2128px}.firebaseui-flag-MO{background-position:right 0 top -2142px}.firebaseui-flag-MP{background-position:right 0 top -2156px}.firebaseui-flag-MQ{background-position:right 0 top -2170px}.firebaseui-flag-MR{background-position:right 0 top -2184px}.firebaseui-flag-MS{background-position:right 0 top -2198px}.firebaseui-flag-MT{background-position:right 0 top -2212px}.firebaseui-flag-MU{background-position:right 0 top -2226px}.firebaseui-flag-MV{background-position:right 0 top -2240px}.firebaseui-flag-MW{background-position:right 0 top -2254px}.firebaseui-flag-MX{background-position:right 0 top -2268px}.firebaseui-flag-MY{background-position:right 0 top -2282px}.firebaseui-flag-MZ{background-position:right 0 top -2296px}.firebaseui-flag-NA{background-position:right 0 top -2310px}.firebaseui-flag-NC{background-position:right 0 top -2324px}.firebaseui-flag-NE{background-position:right 0 top -2338px}.firebaseui-flag-NF{background-position:right 0 top -2352px}.firebaseui-flag-NG{background-position:right 0 top -2366px}.firebaseui-flag-NI{background-position:right 0 top -2380px}.firebaseui-flag-NL{background-position:right 0 top -2394px}.firebaseui-flag-NO{background-position:right 0 top -2408px}.firebaseui-flag-NP{background-position:right 0 top -2422px}.firebaseui-flag-NR{background-position:right 0 top -2436px}.firebaseui-flag-NU{background-position:right 0 top -2450px}.firebaseui-flag-NZ{background-position:right 0 top -2464px}.firebaseui-flag-OM{background-position:right 0 top -2478px}.firebaseui-flag-PA{background-position:right 0 top -2492px}.firebaseui-flag-PE{background-position:right 0 top -2506px}.firebaseui-flag-PF{background-position:right 0 top -2520px}.firebaseui-flag-PG{background-position:right 0 top -2534px}.firebaseui-flag-PH{background-position:right 0 top -2548px}.firebaseui-flag-PK{background-position:right 0 top -2562px}.firebaseui-flag-PL{background-position:right 0 top -2576px}.firebaseui-flag-PM{background-position:right 0 top -2590px}.firebaseui-flag-PN{background-position:right 0 top -2604px}.firebaseui-flag-PR{background-position:right 0 top -2618px}.firebaseui-flag-PS{background-position:right 0 top -2632px}.firebaseui-flag-PT{background-position:right 0 top -2646px}.firebaseui-flag-PW{background-position:right 0 top -2660px}.firebaseui-flag-PY{background-position:right 0 top -2674px}.firebaseui-flag-QA{background-position:right 0 top -2688px}.firebaseui-flag-RE{background-position:right 0 top -2702px}.firebaseui-flag-RO{background-position:right 0 top -2716px}.firebaseui-flag-RS{background-position:right 0 top -2730px}.firebaseui-flag-RU{background-position:right 0 top -2744px}.firebaseui-flag-RW{background-position:right 0 top -2758px}.firebaseui-flag-SA{background-position:right 0 top -2772px}.firebaseui-flag-SB{background-position:right 0 top -2786px}.firebaseui-flag-SC{background-position:right 0 top -2800px}.firebaseui-flag-SD{background-position:right 0 top -2814px}.firebaseui-flag-SE{background-position:right 0 top -2828px}.firebaseui-flag-SG{background-position:right 0 top -2842px}.firebaseui-flag-SH{background-position:right 0 top -2856px}.firebaseui-flag-SI{background-position:right 0 top -2870px}.firebaseui-flag-SJ{background-position:right 0 top -2884px}.firebaseui-flag-SK{background-position:right 0 top -2898px}.firebaseui-flag-SL{background-position:right 0 top -2912px}.firebaseui-flag-SM{background-position:right 0 top -2926px}.firebaseui-flag-SN{background-position:right 0 top -2940px}.firebaseui-flag-SO{background-position:right 0 top -2954px}.firebaseui-flag-SR{background-position:right 0 top -2968px}.firebaseui-flag-SS{background-position:right 0 top -2982px}.firebaseui-flag-ST{background-position:right 0 top -2996px}.firebaseui-flag-SV{background-position:right 0 top -3010px}.firebaseui-flag-SX{background-position:right 0 top -3024px}.firebaseui-flag-SY{background-position:right 0 top -3038px}.firebaseui-flag-SZ{background-position:right 0 top -3052px}.firebaseui-flag-TA{background-position:right 0 top -3066px}.firebaseui-flag-TC{background-position:right 0 top -3080px}.firebaseui-flag-TD{background-position:right 0 top -3094px}.firebaseui-flag-TF{background-position:right 0 top -3108px}.firebaseui-flag-TG{background-position:right 0 top -3122px}.firebaseui-flag-TH{background-position:right 0 top -3136px}.firebaseui-flag-TJ{background-position:right 0 top -3150px}.firebaseui-flag-TK{background-position:right 0 top -3164px}.firebaseui-flag-TL{background-position:right 0 top -3178px}.firebaseui-flag-TM{background-position:right 0 top -3192px}.firebaseui-flag-TN{background-position:right 0 top -3206px}.firebaseui-flag-TO{background-position:right 0 top -3220px}.firebaseui-flag-TR{background-position:right 0 top -3234px}.firebaseui-flag-TT{background-position:right 0 top -3248px}.firebaseui-flag-TV{background-position:right 0 top -3262px}.firebaseui-flag-TW{background-position:right 0 top -3276px}.firebaseui-flag-TZ{background-position:right 0 top -3290px}.firebaseui-flag-UA{background-position:right 0 top -3304px}.firebaseui-flag-UG{background-position:right 0 top -3318px}.firebaseui-flag-UM{background-position:right 0 top -3332px}.firebaseui-flag-UN{background-position:right 0 top -3346px}.firebaseui-flag-US{background-position:right 0 top -3360px}.firebaseui-flag-UY{background-position:right 0 top -3374px}.firebaseui-flag-UZ{background-position:right 0 top -3388px}.firebaseui-flag-VA{background-position:right 0 top -3402px}.firebaseui-flag-VC{background-position:right 0 top -3416px}.firebaseui-flag-VE{background-position:right 0 top -3430px}.firebaseui-flag-VG{background-position:right 0 top -3444px}.firebaseui-flag-VI{background-position:right 0 top -3458px}.firebaseui-flag-VN{background-position:right 0 top -3472px}.firebaseui-flag-VU{background-position:right 0 top -3486px}.firebaseui-flag-WF{background-position:right 0 top -3500px}.firebaseui-flag-WS{background-position:right 0 top -3514px}.firebaseui-flag-XK{background-position:right 0 top -3528px}.firebaseui-flag-YE{background-position:right 0 top -3542px}.firebaseui-flag-YT{background-position:right 0 top -3556px}.firebaseui-flag-ZA{background-position:right 0 top -3570px}.firebaseui-flag-ZM{background-position:right 0 top -3584px}.firebaseui-flag-ZW{background-position:right 0 top -3598px}'))) : Te(Nb(jb('@import url(https://fonts.googleapis.com/css?family=Roboto:400,500,700&display=swap);dialog{position:absolute;left:0;right:0;width:-moz-fit-content;width:-webkit-fit-content;width:fit-content;height:-moz-fit-content;height:-webkit-fit-content;height:fit-content;margin:auto;border:solid;padding:1em;background:#fff;color:#000;display:none}dialog[open]{display:block}dialog+.backdrop{position:fixed;top:0;right:0;bottom:0;left:0;background:rgba(0,0,0,.1)}@media screen and (max-width:540px){dialog[_polyfill_modal]{top:0;width:auto;margin:1em}}._dialog_overlay{position:fixed;top:0;right:0;bottom:0;left:0}.mdl-button{background:transparent;border:none;border-radius:2px;color:#000;position:relative;height:36px;margin:0;min-width:64px;padding:0 16px;display:inline-block;font-family:Roboto,Helvetica,Arial,sans-serif;font-size:14px;font-weight:500;text-transform:uppercase;line-height:1;letter-spacing:0;overflow:hidden;will-change:box-shadow;-webkit-transition:box-shadow .2s cubic-bezier(.4,0,1,1),background-color .2s cubic-bezier(.4,0,.2,1),color .2s cubic-bezier(.4,0,.2,1);transition:box-shadow .2s cubic-bezier(.4,0,1,1),background-color .2s cubic-bezier(.4,0,.2,1),color .2s cubic-bezier(.4,0,.2,1);outline:none;cursor:pointer;text-decoration:none;text-align:center;line-height:36px;vertical-align:middle}.mdl-button::-moz-focus-inner{border:0}.mdl-button:hover{background-color:hsla(0,0%,62%,.2)}.mdl-button:focus:not(:active){background-color:rgba(0,0,0,.12)}.mdl-button:active{background-color:hsla(0,0%,62%,.4)}.mdl-button.mdl-button--colored{color:#3f51b5}.mdl-button.mdl-button--colored:focus:not(:active){background-color:rgba(0,0,0,.12)}input.mdl-button[type=submit]{-webkit-appearance:none}.mdl-button--raised{background:hsla(0,0%,62%,.2);box-shadow:0 2px 2px 0 rgba(0,0,0,.14),0 3px 1px -2px rgba(0,0,0,.2),0 1px 5px 0 rgba(0,0,0,.12)}.mdl-button--raised:active{box-shadow:0 4px 5px 0 rgba(0,0,0,.14),0 1px 10px 0 rgba(0,0,0,.12),0 2px 4px -1px rgba(0,0,0,.2);background-color:hsla(0,0%,62%,.4)}.mdl-button--raised:focus:not(:active){box-shadow:0 0 8px rgba(0,0,0,.18),0 8px 16px rgba(0,0,0,.36);background-color:hsla(0,0%,62%,.4)}.mdl-button--raised.mdl-button--colored{background:#3f51b5;color:#fff}.mdl-button--raised.mdl-button--colored:hover{background-color:#3f51b5}.mdl-button--raised.mdl-button--colored:active{background-color:#3f51b5}.mdl-button--raised.mdl-button--colored:focus:not(:active){background-color:#3f51b5}.mdl-button--raised.mdl-button--colored .mdl-ripple{background:#fff}.mdl-button--fab{border-radius:50%;font-size:24px;height:56px;margin:auto;min-width:56px;width:56px;padding:0;overflow:hidden;background:hsla(0,0%,62%,.2);box-shadow:0 1px 1.5px 0 rgba(0,0,0,.12),0 1px 1px 0 rgba(0,0,0,.24);position:relative;line-height:normal}.mdl-button--fab .material-icons{position:absolute;top:50%;left:50%;-webkit-transform:translate(-12px,-12px);transform:translate(-12px,-12px);line-height:24px;width:24px}.mdl-button--fab.mdl-button--mini-fab{height:40px;min-width:40px;width:40px}.mdl-button--fab .mdl-button__ripple-container{border-radius:50%;-webkit-mask-image:-webkit-radial-gradient(circle,#fff,#000)}.mdl-button--fab:active{box-shadow:0 4px 5px 0 rgba(0,0,0,.14),0 1px 10px 0 rgba(0,0,0,.12),0 2px 4px -1px rgba(0,0,0,.2);background-color:hsla(0,0%,62%,.4)}.mdl-button--fab:focus:not(:active){box-shadow:0 0 8px rgba(0,0,0,.18),0 8px 16px rgba(0,0,0,.36);background-color:hsla(0,0%,62%,.4)}.mdl-button--fab.mdl-button--colored{background:#ff4081;color:#fff}.mdl-button--fab.mdl-button--colored:hover{background-color:#ff4081}.mdl-button--fab.mdl-button--colored:focus:not(:active){background-color:#ff4081}.mdl-button--fab.mdl-button--colored:active{background-color:#ff4081}.mdl-button--fab.mdl-button--colored .mdl-ripple{background:#fff}.mdl-button--icon{border-radius:50%;font-size:24px;height:32px;margin-left:0;margin-right:0;min-width:32px;width:32px;padding:0;overflow:hidden;color:inherit;line-height:normal}.mdl-button--icon .material-icons{position:absolute;top:50%;left:50%;-webkit-transform:translate(-12px,-12px);transform:translate(-12px,-12px);line-height:24px;width:24px}.mdl-button--icon.mdl-button--mini-icon{height:24px;min-width:24px;width:24px}.mdl-button--icon.mdl-button--mini-icon .material-icons{top:0;left:0}.mdl-button--icon .mdl-button__ripple-container{border-radius:50%;-webkit-mask-image:-webkit-radial-gradient(circle,#fff,#000)}.mdl-button__ripple-container{display:block;height:100%;left:0;position:absolute;top:0;width:100%;z-index:0;overflow:hidden}.mdl-button.mdl-button--disabled .mdl-button__ripple-container .mdl-ripple,.mdl-button[disabled] .mdl-button__ripple-container .mdl-ripple{background-color:transparent}.mdl-button--primary.mdl-button--primary{color:#3f51b5}.mdl-button--primary.mdl-button--primary .mdl-ripple{background:#fff}.mdl-button--primary.mdl-button--primary.mdl-button--fab,.mdl-button--primary.mdl-button--primary.mdl-button--raised{color:#fff;background-color:#3f51b5}.mdl-button--accent.mdl-button--accent{color:#ff4081}.mdl-button--accent.mdl-button--accent .mdl-ripple{background:#fff}.mdl-button--accent.mdl-button--accent.mdl-button--fab,.mdl-button--accent.mdl-button--accent.mdl-button--raised{color:#fff;background-color:#ff4081}.mdl-button.mdl-button--disabled.mdl-button--disabled,.mdl-button[disabled][disabled]{color:rgba(0,0,0,.26);cursor:default;background-color:transparent}.mdl-button--fab.mdl-button--disabled.mdl-button--disabled,.mdl-button--fab[disabled][disabled]{background-color:rgba(0,0,0,.12);color:rgba(0,0,0,.26)}.mdl-button--raised.mdl-button--disabled.mdl-button--disabled,.mdl-button--raised[disabled][disabled]{background-color:rgba(0,0,0,.12);color:rgba(0,0,0,.26);box-shadow:none}.mdl-button--colored.mdl-button--disabled.mdl-button--disabled,.mdl-button--colored[disabled][disabled]{color:rgba(0,0,0,.26)}.mdl-button .material-icons{vertical-align:middle}.mdl-card{display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-orient:vertical;-webkit-box-direction:normal;-webkit-flex-direction:column;-moz-box-orient:vertical;-moz-box-direction:normal;-ms-flex-direction:column;flex-direction:column;font-size:16px;font-weight:400;min-height:200px;overflow:hidden;width:330px;z-index:1;position:relative;background:#fff;border-radius:2px;-moz-box-sizing:border-box;box-sizing:border-box}.mdl-card__media{background-color:#ff4081;background-repeat:repeat;background-position:50% 50%;background-size:cover;background-origin:padding-box;background-attachment:scroll;-moz-box-sizing:border-box;box-sizing:border-box}.mdl-card__title{-webkit-box-align:center;-webkit-align-items:center;-moz-box-align:center;-ms-flex-align:center;align-items:center;color:#000;display:block;display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-pack:stretch;-webkit-justify-content:stretch;-moz-box-pack:stretch;-ms-flex-pack:stretch;justify-content:stretch;line-height:normal;padding:16px 16px;-webkit-perspective-origin:165px 56px;perspective-origin:165px 56px;-webkit-transform-origin:165px 56px;transform-origin:165px 56px;-moz-box-sizing:border-box;box-sizing:border-box}.mdl-card__title.mdl-card--border{border-bottom:1px solid rgba(0,0,0,.1)}.mdl-card__title-text{-webkit-align-self:flex-end;-ms-flex-item-align:end;align-self:flex-end;color:inherit;display:block;display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;font-size:24px;font-weight:300;line-height:normal;overflow:hidden;-webkit-transform-origin:149px 48px;transform-origin:149px 48px;margin:0}.mdl-card__subtitle-text{font-size:14px;color:rgba(0,0,0,.54);margin:0}.mdl-card__supporting-text{color:rgba(0,0,0,.54);font-size:1rem;line-height:18px;overflow:hidden;padding:16px 16px;width:90%}.mdl-card__supporting-text.mdl-card--border{border-bottom:1px solid rgba(0,0,0,.1)}.mdl-card__actions{font-size:16px;line-height:normal;width:100%;background-color:transparent;padding:8px;-moz-box-sizing:border-box;box-sizing:border-box}.mdl-card__actions.mdl-card--border{border-top:1px solid rgba(0,0,0,.1)}.mdl-card--expand{-webkit-box-flex:1;-webkit-flex-grow:1;-moz-box-flex:1;-ms-flex-positive:1;flex-grow:1}.mdl-card__menu{position:absolute;right:16px;top:16px}.mdl-dialog{border:none;box-shadow:0 9px 46px 8px rgba(0,0,0,.14),0 11px 15px -7px rgba(0,0,0,.12),0 24px 38px 3px rgba(0,0,0,.2);width:280px}.mdl-dialog__title{padding:24px 24px 0;margin:0;font-size:2.5rem}.mdl-dialog__actions{padding:8px 8px 8px 24px;display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-orient:horizontal;-webkit-box-direction:reverse;-webkit-flex-direction:row-reverse;-moz-box-orient:horizontal;-moz-box-direction:reverse;-ms-flex-direction:row-reverse;flex-direction:row-reverse;-webkit-flex-wrap:wrap;-ms-flex-wrap:wrap;flex-wrap:wrap}.mdl-dialog__actions>*{margin-right:8px;height:36px}.mdl-dialog__actions>:first-child{margin-right:0}.mdl-dialog__actions--full-width{padding:0 0 8px 0}.mdl-dialog__actions--full-width>*{height:48px;-webkit-box-flex:0;-webkit-flex:0 0 100%;-moz-box-flex:0;-ms-flex:0 0 100%;flex:0 0 100%;padding-right:16px;margin-right:0;text-align:right}.mdl-dialog__content{padding:20px 24px 24px 24px;color:rgba(0,0,0,.54)}.mdl-progress{display:block;position:relative;height:4px;width:500px;max-width:100%}.mdl-progress>.bar{display:block;position:absolute;top:0;bottom:0;width:0;-webkit-transition:width .2s cubic-bezier(.4,0,.2,1);transition:width .2s cubic-bezier(.4,0,.2,1)}.mdl-progress>.progressbar{background-color:#3f51b5;z-index:1;left:0}.mdl-progress>.bufferbar{background-image:-webkit-gradient(linear,left top,right top,from(hsla(0,0%,100%,.7)),to(hsla(0,0%,100%,.7))),-webkit-gradient(linear,left top,right top,from(#3f51b5),to(#3f51b5));background-image:-webkit-linear-gradient(left,hsla(0,0%,100%,.7),hsla(0,0%,100%,.7)),-webkit-linear-gradient(left,#3f51b5,#3f51b5);background-image:linear-gradient(90deg,hsla(0,0%,100%,.7),hsla(0,0%,100%,.7)),linear-gradient(90deg,#3f51b5,#3f51b5);z-index:0;left:0}.mdl-progress>.auxbar{right:0}@supports (-webkit-appearance:none){.mdl-progress:not(.mdl-progress--indeterminate):not(.mdl-progress--indeterminate)>.auxbar,.mdl-progress:not(.mdl-progress__indeterminate):not(.mdl-progress__indeterminate)>.auxbar{background-image:-webkit-gradient(linear,left top,right top,from(hsla(0,0%,100%,.7)),to(hsla(0,0%,100%,.7))),-webkit-gradient(linear,left top,right top,from(#3f51b5),to(#3f51b5));background-image:-webkit-linear-gradient(left,hsla(0,0%,100%,.7),hsla(0,0%,100%,.7)),-webkit-linear-gradient(left,#3f51b5,#3f51b5);background-image:linear-gradient(90deg,hsla(0,0%,100%,.7),hsla(0,0%,100%,.7)),linear-gradient(90deg,#3f51b5,#3f51b5);-webkit-mask:url("data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIj8+Cjxzdmcgd2lkdGg9IjEyIiBoZWlnaHQ9IjQiIHZpZXdQb3J0PSIwIDAgMTIgNCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogIDxlbGxpcHNlIGN4PSIyIiBjeT0iMiIgcng9IjIiIHJ5PSIyIj4KICAgIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9ImN4IiBmcm9tPSIyIiB0bz0iLTEwIiBkdXI9IjAuNnMiIHJlcGVhdENvdW50PSJpbmRlZmluaXRlIiAvPgogIDwvZWxsaXBzZT4KICA8ZWxsaXBzZSBjeD0iMTQiIGN5PSIyIiByeD0iMiIgcnk9IjIiIGNsYXNzPSJsb2FkZXIiPgogICAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT0iY3giIGZyb209IjE0IiB0bz0iMiIgZHVyPSIwLjZzIiByZXBlYXRDb3VudD0iaW5kZWZpbml0ZSIgLz4KICA8L2VsbGlwc2U+Cjwvc3ZnPgo=");mask:url("data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIj8+Cjxzdmcgd2lkdGg9IjEyIiBoZWlnaHQ9IjQiIHZpZXdQb3J0PSIwIDAgMTIgNCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogIDxlbGxpcHNlIGN4PSIyIiBjeT0iMiIgcng9IjIiIHJ5PSIyIj4KICAgIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9ImN4IiBmcm9tPSIyIiB0bz0iLTEwIiBkdXI9IjAuNnMiIHJlcGVhdENvdW50PSJpbmRlZmluaXRlIiAvPgogIDwvZWxsaXBzZT4KICA8ZWxsaXBzZSBjeD0iMTQiIGN5PSIyIiByeD0iMiIgcnk9IjIiIGNsYXNzPSJsb2FkZXIiPgogICAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT0iY3giIGZyb209IjE0IiB0bz0iMiIgZHVyPSIwLjZzIiByZXBlYXRDb3VudD0iaW5kZWZpbml0ZSIgLz4KICA8L2VsbGlwc2U+Cjwvc3ZnPgo=")}}.mdl-progress:not(.mdl-progress--indeterminate)>.auxbar,.mdl-progress:not(.mdl-progress__indeterminate)>.auxbar{background-image:-webkit-gradient(linear,left top,right top,from(hsla(0,0%,100%,.9)),to(hsla(0,0%,100%,.9))),-webkit-gradient(linear,left top,right top,from(#3f51b5),to(#3f51b5));background-image:-webkit-linear-gradient(left,hsla(0,0%,100%,.9),hsla(0,0%,100%,.9)),-webkit-linear-gradient(left,#3f51b5,#3f51b5);background-image:linear-gradient(90deg,hsla(0,0%,100%,.9),hsla(0,0%,100%,.9)),linear-gradient(90deg,#3f51b5,#3f51b5)}.mdl-progress.mdl-progress--indeterminate>.bar1,.mdl-progress.mdl-progress__indeterminate>.bar1{background-color:#3f51b5;-webkit-animation-name:indeterminate1;animation-name:indeterminate1;-webkit-animation-duration:2s;animation-duration:2s;-webkit-animation-iteration-count:infinite;animation-iteration-count:infinite;-webkit-animation-timing-function:linear;animation-timing-function:linear}.mdl-progress.mdl-progress--indeterminate>.bar3,.mdl-progress.mdl-progress__indeterminate>.bar3{background-image:none;background-color:#3f51b5;-webkit-animation-name:indeterminate2;animation-name:indeterminate2;-webkit-animation-duration:2s;animation-duration:2s;-webkit-animation-iteration-count:infinite;animation-iteration-count:infinite;-webkit-animation-timing-function:linear;animation-timing-function:linear}@-webkit-keyframes indeterminate1{0%{left:0;width:0}50%{left:25%;width:75%}75%{left:100%;width:0}}@keyframes indeterminate1{0%{left:0;width:0}50%{left:25%;width:75%}75%{left:100%;width:0}}@-webkit-keyframes indeterminate2{0%{left:0;width:0}50%{left:0;width:0}75%{left:0;width:25%}to{left:100%;width:0}}@keyframes indeterminate2{0%{left:0;width:0}50%{left:0;width:0}75%{left:0;width:25%}to{left:100%;width:0}}.mdl-shadow--2dp{box-shadow:0 2px 2px 0 rgba(0,0,0,.14),0 3px 1px -2px rgba(0,0,0,.2),0 1px 5px 0 rgba(0,0,0,.12)}.mdl-shadow--3dp{box-shadow:0 3px 4px 0 rgba(0,0,0,.14),0 3px 3px -2px rgba(0,0,0,.2),0 1px 8px 0 rgba(0,0,0,.12)}.mdl-shadow--4dp{box-shadow:0 4px 5px 0 rgba(0,0,0,.14),0 1px 10px 0 rgba(0,0,0,.12),0 2px 4px -1px rgba(0,0,0,.2)}.mdl-shadow--6dp{box-shadow:0 6px 10px 0 rgba(0,0,0,.14),0 1px 18px 0 rgba(0,0,0,.12),0 3px 5px -1px rgba(0,0,0,.2)}.mdl-shadow--8dp{box-shadow:0 8px 10px 1px rgba(0,0,0,.14),0 3px 14px 2px rgba(0,0,0,.12),0 5px 5px -3px rgba(0,0,0,.2)}.mdl-shadow--16dp{box-shadow:0 16px 24px 2px rgba(0,0,0,.14),0 6px 30px 5px rgba(0,0,0,.12),0 8px 10px -5px rgba(0,0,0,.2)}.mdl-shadow--24dp{box-shadow:0 9px 46px 8px rgba(0,0,0,.14),0 11px 15px -7px rgba(0,0,0,.12),0 24px 38px 3px rgba(0,0,0,.2)}.mdl-spinner{display:inline-block;position:relative;width:28px;height:28px}.mdl-spinner:not(.is-upgraded).is-active:after{content:"Loading..."}.mdl-spinner.is-upgraded.is-active{-webkit-animation:mdl-spinner__container-rotate 1.5682352941176s linear infinite;animation:mdl-spinner__container-rotate 1.5682352941176s linear infinite}@-webkit-keyframes mdl-spinner__container-rotate{to{-webkit-transform:rotate(1turn);transform:rotate(1turn)}}@keyframes mdl-spinner__container-rotate{to{-webkit-transform:rotate(1turn);transform:rotate(1turn)}}.mdl-spinner__layer{position:absolute;width:100%;height:100%;opacity:0}.mdl-spinner__layer-1{border-color:#42a5f5}.mdl-spinner--single-color .mdl-spinner__layer-1{border-color:#3f51b5}.mdl-spinner.is-active .mdl-spinner__layer-1{-webkit-animation:mdl-spinner__fill-unfill-rotate 5332ms cubic-bezier(.4,0,.2,1) infinite both,mdl-spinner__layer-1-fade-in-out 5332ms cubic-bezier(.4,0,.2,1) infinite both;animation:mdl-spinner__fill-unfill-rotate 5332ms cubic-bezier(.4,0,.2,1) infinite both,mdl-spinner__layer-1-fade-in-out 5332ms cubic-bezier(.4,0,.2,1) infinite both}.mdl-spinner__layer-2{border-color:#f44336}.mdl-spinner--single-color .mdl-spinner__layer-2{border-color:#3f51b5}.mdl-spinner.is-active .mdl-spinner__layer-2{-webkit-animation:mdl-spinner__fill-unfill-rotate 5332ms cubic-bezier(.4,0,.2,1) infinite both,mdl-spinner__layer-2-fade-in-out 5332ms cubic-bezier(.4,0,.2,1) infinite both;animation:mdl-spinner__fill-unfill-rotate 5332ms cubic-bezier(.4,0,.2,1) infinite both,mdl-spinner__layer-2-fade-in-out 5332ms cubic-bezier(.4,0,.2,1) infinite both}.mdl-spinner__layer-3{border-color:#fdd835}.mdl-spinner--single-color .mdl-spinner__layer-3{border-color:#3f51b5}.mdl-spinner.is-active .mdl-spinner__layer-3{-webkit-animation:mdl-spinner__fill-unfill-rotate 5332ms cubic-bezier(.4,0,.2,1) infinite both,mdl-spinner__layer-3-fade-in-out 5332ms cubic-bezier(.4,0,.2,1) infinite both;animation:mdl-spinner__fill-unfill-rotate 5332ms cubic-bezier(.4,0,.2,1) infinite both,mdl-spinner__layer-3-fade-in-out 5332ms cubic-bezier(.4,0,.2,1) infinite both}.mdl-spinner__layer-4{border-color:#4caf50}.mdl-spinner--single-color .mdl-spinner__layer-4{border-color:#3f51b5}.mdl-spinner.is-active .mdl-spinner__layer-4{-webkit-animation:mdl-spinner__fill-unfill-rotate 5332ms cubic-bezier(.4,0,.2,1) infinite both,mdl-spinner__layer-4-fade-in-out 5332ms cubic-bezier(.4,0,.2,1) infinite both;animation:mdl-spinner__fill-unfill-rotate 5332ms cubic-bezier(.4,0,.2,1) infinite both,mdl-spinner__layer-4-fade-in-out 5332ms cubic-bezier(.4,0,.2,1) infinite both}@-webkit-keyframes mdl-spinner__fill-unfill-rotate{12.5%{-webkit-transform:rotate(135deg);transform:rotate(135deg)}25%{-webkit-transform:rotate(270deg);transform:rotate(270deg)}37.5%{-webkit-transform:rotate(405deg);transform:rotate(405deg)}50%{-webkit-transform:rotate(540deg);transform:rotate(540deg)}62.5%{-webkit-transform:rotate(675deg);transform:rotate(675deg)}75%{-webkit-transform:rotate(810deg);transform:rotate(810deg)}87.5%{-webkit-transform:rotate(945deg);transform:rotate(945deg)}to{-webkit-transform:rotate(3turn);transform:rotate(3turn)}}@keyframes mdl-spinner__fill-unfill-rotate{12.5%{-webkit-transform:rotate(135deg);transform:rotate(135deg)}25%{-webkit-transform:rotate(270deg);transform:rotate(270deg)}37.5%{-webkit-transform:rotate(405deg);transform:rotate(405deg)}50%{-webkit-transform:rotate(540deg);transform:rotate(540deg)}62.5%{-webkit-transform:rotate(675deg);transform:rotate(675deg)}75%{-webkit-transform:rotate(810deg);transform:rotate(810deg)}87.5%{-webkit-transform:rotate(945deg);transform:rotate(945deg)}to{-webkit-transform:rotate(3turn);transform:rotate(3turn)}}@-webkit-keyframes mdl-spinner__layer-1-fade-in-out{0%{opacity:.99}25%{opacity:.99}26%{opacity:0}89%{opacity:0}90%{opacity:.99}to{opacity:.99}}@keyframes mdl-spinner__layer-1-fade-in-out{0%{opacity:.99}25%{opacity:.99}26%{opacity:0}89%{opacity:0}90%{opacity:.99}to{opacity:.99}}@-webkit-keyframes mdl-spinner__layer-2-fade-in-out{0%{opacity:0}15%{opacity:0}25%{opacity:.99}50%{opacity:.99}51%{opacity:0}}@keyframes mdl-spinner__layer-2-fade-in-out{0%{opacity:0}15%{opacity:0}25%{opacity:.99}50%{opacity:.99}51%{opacity:0}}@-webkit-keyframes mdl-spinner__layer-3-fade-in-out{0%{opacity:0}40%{opacity:0}50%{opacity:.99}75%{opacity:.99}76%{opacity:0}}@keyframes mdl-spinner__layer-3-fade-in-out{0%{opacity:0}40%{opacity:0}50%{opacity:.99}75%{opacity:.99}76%{opacity:0}}@-webkit-keyframes mdl-spinner__layer-4-fade-in-out{0%{opacity:0}65%{opacity:0}75%{opacity:.99}90%{opacity:.99}to{opacity:0}}@keyframes mdl-spinner__layer-4-fade-in-out{0%{opacity:0}65%{opacity:0}75%{opacity:.99}90%{opacity:.99}to{opacity:0}}.mdl-spinner__gap-patch{position:absolute;-moz-box-sizing:border-box;box-sizing:border-box;top:0;left:45%;width:10%;height:100%;overflow:hidden;border-color:inherit}.mdl-spinner__gap-patch .mdl-spinner__circle{width:1000%;left:-450%}.mdl-spinner__circle-clipper{display:inline-block;position:relative;width:50%;height:100%;overflow:hidden;border-color:inherit}.mdl-spinner__circle-clipper.mdl-spinner__left{float:left}.mdl-spinner__circle-clipper.mdl-spinner__right{float:right}.mdl-spinner__circle-clipper .mdl-spinner__circle{width:200%}.mdl-spinner__circle{-moz-box-sizing:border-box;box-sizing:border-box;height:100%;border-width:3px;border-style:solid;border-color:inherit;border-bottom-color:transparent!important;border-radius:50%;-webkit-animation:none;animation:none;position:absolute;top:0;right:0;bottom:0;left:0}.mdl-spinner__left .mdl-spinner__circle{border-right-color:transparent!important;-webkit-transform:rotate(129deg);transform:rotate(129deg)}.mdl-spinner.is-active .mdl-spinner__left .mdl-spinner__circle{-webkit-animation:mdl-spinner__left-spin 1333ms cubic-bezier(.4,0,.2,1) infinite both;animation:mdl-spinner__left-spin 1333ms cubic-bezier(.4,0,.2,1) infinite both}.mdl-spinner__right .mdl-spinner__circle{left:-100%;border-left-color:transparent!important;-webkit-transform:rotate(-129deg);transform:rotate(-129deg)}.mdl-spinner.is-active .mdl-spinner__right .mdl-spinner__circle{-webkit-animation:mdl-spinner__right-spin 1333ms cubic-bezier(.4,0,.2,1) infinite both;animation:mdl-spinner__right-spin 1333ms cubic-bezier(.4,0,.2,1) infinite both}@-webkit-keyframes mdl-spinner__left-spin{0%{-webkit-transform:rotate(130deg);transform:rotate(130deg)}50%{-webkit-transform:rotate(-5deg);transform:rotate(-5deg)}to{-webkit-transform:rotate(130deg);transform:rotate(130deg)}}@keyframes mdl-spinner__left-spin{0%{-webkit-transform:rotate(130deg);transform:rotate(130deg)}50%{-webkit-transform:rotate(-5deg);transform:rotate(-5deg)}to{-webkit-transform:rotate(130deg);transform:rotate(130deg)}}@-webkit-keyframes mdl-spinner__right-spin{0%{-webkit-transform:rotate(-130deg);transform:rotate(-130deg)}50%{-webkit-transform:rotate(5deg);transform:rotate(5deg)}to{-webkit-transform:rotate(-130deg);transform:rotate(-130deg)}}@keyframes mdl-spinner__right-spin{0%{-webkit-transform:rotate(-130deg);transform:rotate(-130deg)}50%{-webkit-transform:rotate(5deg);transform:rotate(5deg)}to{-webkit-transform:rotate(-130deg);transform:rotate(-130deg)}}.mdl-textfield{position:relative;font-size:16px;display:inline-block;-moz-box-sizing:border-box;box-sizing:border-box;width:300px;max-width:100%;margin:0;padding:20px 0}.mdl-textfield .mdl-button{position:absolute;bottom:20px}.mdl-textfield--align-right{text-align:right}.mdl-textfield--full-width{width:100%}.mdl-textfield--expandable{min-width:32px;width:auto;min-height:32px}.mdl-textfield--expandable .mdl-button--icon{top:16px}.mdl-textfield__input{border:none;border-bottom:1px solid rgba(0,0,0,.12);display:block;font-size:16px;font-family:Helvetica,Arial,sans-serif;margin:0;padding:4px 0;width:100%;background:none;text-align:left;color:inherit}.mdl-textfield__input[type=number]{-moz-appearance:textfield}.mdl-textfield__input[type=number]::-webkit-inner-spin-button,.mdl-textfield__input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}.mdl-textfield.is-focused .mdl-textfield__input{outline:none}.mdl-textfield.is-invalid .mdl-textfield__input{border-color:#d50000;box-shadow:none}.mdl-textfield.is-disabled .mdl-textfield__input,fieldset[disabled] .mdl-textfield .mdl-textfield__input{background-color:transparent;border-bottom:1px dotted rgba(0,0,0,.12);color:rgba(0,0,0,.26)}.mdl-textfield textarea.mdl-textfield__input{display:block}.mdl-textfield__label{bottom:0;color:rgba(0,0,0,.26);font-size:16px;left:0;right:0;pointer-events:none;position:absolute;display:block;top:24px;width:100%;overflow:hidden;white-space:nowrap;text-align:left}.mdl-textfield.has-placeholder .mdl-textfield__label,.mdl-textfield.is-dirty .mdl-textfield__label{visibility:hidden}.mdl-textfield--floating-label .mdl-textfield__label{-webkit-transition-duration:.2s;transition-duration:.2s;-webkit-transition-timing-function:cubic-bezier(.4,0,.2,1);transition-timing-function:cubic-bezier(.4,0,.2,1)}.mdl-textfield--floating-label.has-placeholder .mdl-textfield__label{-webkit-transition:none;transition:none}.mdl-textfield.is-disabled.is-disabled .mdl-textfield__label,fieldset[disabled] .mdl-textfield .mdl-textfield__label{color:rgba(0,0,0,.26)}.mdl-textfield--floating-label.has-placeholder .mdl-textfield__label,.mdl-textfield--floating-label.is-dirty .mdl-textfield__label,.mdl-textfield--floating-label.is-focused .mdl-textfield__label{color:#3f51b5;font-size:12px;top:4px;visibility:visible}.mdl-textfield--floating-label.has-placeholder .mdl-textfield__expandable-holder .mdl-textfield__label,.mdl-textfield--floating-label.is-dirty .mdl-textfield__expandable-holder .mdl-textfield__label,.mdl-textfield--floating-label.is-focused .mdl-textfield__expandable-holder .mdl-textfield__label{top:-16px}.mdl-textfield--floating-label.is-invalid .mdl-textfield__label{color:#d50000;font-size:12px}.mdl-textfield__label:after{background-color:#3f51b5;bottom:20px;content:"";height:2px;left:45%;position:absolute;-webkit-transition-duration:.2s;transition-duration:.2s;-webkit-transition-timing-function:cubic-bezier(.4,0,.2,1);transition-timing-function:cubic-bezier(.4,0,.2,1);visibility:hidden;width:10px}.mdl-textfield.is-focused .mdl-textfield__label:after{left:0;visibility:visible;width:100%}.mdl-textfield.is-invalid .mdl-textfield__label:after{background-color:#d50000}.mdl-textfield__error{color:#d50000;position:absolute;font-size:12px;margin-top:3px;visibility:hidden;display:block}.mdl-textfield.is-invalid .mdl-textfield__error{visibility:visible}.mdl-textfield__expandable-holder{position:relative;margin-left:32px;-webkit-transition-duration:.2s;transition-duration:.2s;-webkit-transition-timing-function:cubic-bezier(.4,0,.2,1);transition-timing-function:cubic-bezier(.4,0,.2,1);display:inline-block;max-width:.1px}.mdl-textfield.is-dirty .mdl-textfield__expandable-holder,.mdl-textfield.is-focused .mdl-textfield__expandable-holder{max-width:600px}.mdl-textfield__expandable-holder .mdl-textfield__label:after{bottom:0}.firebaseui-container{background-color:#fff;box-sizing:border-box;-moz-box-sizing:border-box;-webkit-box-sizing:border-box;color:rgba(0,0,0,.87);direction:ltr;font:16px Roboto,arial,sans-serif;margin:0 auto;max-width:360px;overflow:visible;position:relative;text-align:left;width:100%}.firebaseui-container.mdl-card{overflow:visible}.firebaseui-card-header{padding:24px 24px 0 24px}.firebaseui-card-content,.firebaseui-card-footer{padding:0 24px}.firebaseui-card-actions{-moz-box-sizing:border-box;box-sizing:border-box;display:table;font-size:14px;padding:8px 24px 24px 24px;text-align:left;width:100%}.firebaseui-form-links{display:table-cell;vertical-align:middle;width:100%}.firebaseui-form-actions{display:table-cell;text-align:right;white-space:nowrap;width:100%}.firebaseui-subtitle,.firebaseui-title{color:rgba(0,0,0,.87);direction:ltr;font-size:20px;font-weight:500;line-height:24px;margin:0;padding:0;text-align:left}.firebaseui-title{padding-bottom:16px}.firebaseui-subtitle{margin:16px 0}.firebaseui-text{color:rgba(0,0,0,.87);direction:ltr;font-size:16px;line-height:24px;text-align:left}.firebaseui-id-page-password-recovery-email-sent p.firebaseui-text{margin:16px 0}.firebaseui-text-emphasis{font-weight:700}.firebaseui-error{color:#dd2c00;direction:ltr;font-size:12px;line-height:16px;margin:0;text-align:left}.firebaseui-text-input-error{margin:-16px 0 16px}.firebaseui-error-wrapper{min-height:16px}.firebaseui-list-item{direction:ltr;margin:0;padding:0;text-align:left}.firebaseui-hidden{display:none}.firebaseui-relative-wrapper{position:relative}.firebaseui-label{color:rgba(0,0,0,.54);direction:ltr;font-size:16px;text-align:left}.mdl-textfield--floating-label.is-dirty .mdl-textfield__label,.mdl-textfield--floating-label.is-focused .mdl-textfield__label{color:#757575}.firebaseui-input,.firebaseui-input-invalid{border-radius:0;color:rgba(0,0,0,.87);direction:ltr;font-size:16px;width:100%}input.firebaseui-input,input.firebaseui-input-invalid{direction:ltr;text-align:left}.firebaseui-input-invalid{border-color:#dd2c00}.firebaseui-textfield{width:100%}.firebaseui-textfield.mdl-textfield .firebaseui-input{border-color:rgba(0,0,0,.12)}.firebaseui-textfield.mdl-textfield .firebaseui-label:after{background-color:#3f51b5}.firebaseui-textfield-invalid.mdl-textfield .firebaseui-input{border-color:#dd2c00}.firebaseui-textfield-invalid.mdl-textfield .firebaseui-label:after{background-color:#dd2c00}.firebaseui-button{display:inline-block;height:36px;margin-left:8px;min-width:88px}.firebaseui-link{color:#4285f4;font-variant:normal;font-weight:400;text-decoration:none}.firebaseui-link:hover{text-decoration:underline}.firebaseui-indent{margin-left:1em}.firebaseui-tos{color:#757575;direction:ltr;font-size:12px;line-height:16px;margin-bottom:24px;margin-top:0;text-align:left}.firebaseui-provider-sign-in-footer>.firebaseui-tos{text-align:center}.firebaseui-tos-list{list-style:none;text-align:right}.firebaseui-inline-list-item{display:inline-block;margin-left:5px;margin-right:5px}.firebaseui-page-provider-sign-in,.firebaseui-page-select-tenant{background:inherit}.firebaseui-idp-list,.firebaseui-tenant-list{list-style:none;margin:1em 0;padding:0}.firebaseui-idp-button,.firebaseui-tenant-button{direction:ltr;font-weight:500;height:auto;line-height:normal;max-width:220px;min-height:40px;padding:8px 16px;text-align:left;width:100%}.firebaseui-idp-list>.firebaseui-list-item,.firebaseui-tenant-list>.firebaseui-list-item{margin-bottom:15px;text-align:center}.firebaseui-idp-icon-wrapper{display:table-cell;vertical-align:middle}.firebaseui-idp-icon{border:none;display:inline-block;height:18px;vertical-align:middle;width:18px}.firebaseui-idp-favicon{border:none;display:inline-block;height:14px;margin-right:5px;vertical-align:middle;width:14px}.firebaseui-idp-text{color:#fff;display:table-cell;font-size:14px;padding-left:16px;text-transform:none;vertical-align:middle}.firebaseui-idp-text.firebaseui-idp-text-long{display:table-cell}.firebaseui-idp-text.firebaseui-idp-text-short{display:none}@media (max-width:268px){.firebaseui-idp-text.firebaseui-idp-text-long{display:none}.firebaseui-idp-text.firebaseui-idp-text-short{display:table-cell}}@media (max-width:320px){.firebaseui-recaptcha-container>div>div{transform:scale(.9);-webkit-transform:scale(.9);transform-origin:0 0;-webkit-transform-origin:0 0}}.firebaseui-idp-google>.firebaseui-idp-text{color:#757575}[data-provider-id="yahoo.com"]>.firebaseui-idp-icon-wrapper>.firebaseui-idp-icon{height:22px;width:22px}.firebaseui-info-bar{background-color:#f9edbe;border:1px solid #f0c36d;box-shadow:0 2px 4px rgba(0,0,0,.2);-webkit-box-shadow:0 2px 4px rgba(0,0,0,.2);-moz-box-shadow:0 2px 4px rgba(0,0,0,.2);left:10%;padding:8px 16px;position:absolute;right:10%;text-align:center;top:0}.firebaseui-info-bar-message{font-size:12px;margin:0}.firebaseui-dialog{-moz-box-sizing:border-box;box-sizing:border-box;color:rgba(0,0,0,.87);font:16px Roboto,arial,sans-serif;height:auto;max-height:-webkit-fit-content;max-height:-moz-fit-content;max-height:fit-content;padding:24px;text-align:left}.firebaseui-dialog-icon-wrapper{display:table-cell;vertical-align:middle}.firebaseui-dialog-icon{float:left;height:40px;margin-right:24px;width:40px}.firebaseui-progress-dialog-message{display:table-cell;font-size:16px;font-weight:400;min-height:40px;vertical-align:middle}.firebaseui-progress-dialog-loading-icon{height:28px;margin:6px 30px 6px 6px;width:28px}.firebaseui-icon-done{background-image:url(https://www.gstatic.com/images/icons/material/system/2x/done_googgreen_36dp.png);background-position:50%;background-repeat:no-repeat;background-size:36px 36px}.firebaseui-phone-number{display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex}.firebaseui-country-selector{background-image:url(https://www.gstatic.com/images/icons/material/system/1x/arrow_drop_down_grey600_18dp.png);background-position:100%;background-repeat:no-repeat;background-size:18px auto;border-radius:0;border-bottom:1px solid rgba(0,0,0,.12);color:rgba(0,0,0,.87);-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0;font-size:16px;font-weight:400;height:auto;line-height:normal;margin:20px 24px 20px 0;padding:4px 20px 4px 0;width:90px}.firebaseui-country-selector-flag{display:inline-block;margin-right:1ex}.firebaseui-flag{background-image:url(https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/flags_sprite_2x.png);background-size:100% auto;-webkit-filter:drop-shadow(1px 1px 1px rgba(0,0,0,.54));filter:drop-shadow(1px 1px 1px rgba(0,0,0,.54));height:14px;width:24px}.firebaseui-list-box-dialog{max-height:90%;overflow:auto;padding:8px 0 0 0}.firebaseui-list-box-actions{padding-bottom:8px}.firebaseui-list-box-icon-wrapper{display:table-cell;padding-right:24px;vertical-align:top}.firebaseui-list-box-label-wrapper{display:table-cell;vertical-align:top}.firebaseui-list-box-dialog-button{color:rgba(0,0,0,.87);direction:ltr;font-size:16px;font-weight:400;height:auto;line-height:normal;min-height:48px;padding:14px 24px;text-align:left;text-transform:none;width:100%}.firebaseui-phone-number-error{margin-left:114px}.mdl-progress.firebaseui-busy-indicator{height:2px;left:0;position:absolute;top:55px;width:100%}.mdl-spinner.firebaseui-busy-indicator{direction:ltr;height:56px;left:0;margin:auto;position:absolute;right:0;top:30%;width:56px}.firebaseui-callback-indicator-container .firebaseui-busy-indicator{top:0}.firebaseui-callback-indicator-container{height:120px}.firebaseui-new-password-component{display:inline-block;position:relative;width:100%}.firebaseui-input-floating-button{background-position:50%;background-repeat:no-repeat;display:block;height:24px;position:absolute;right:0;top:20px;width:24px}.firebaseui-input-toggle-on{background-image:url(https://www.gstatic.com/images/icons/material/system/1x/visibility_black_24dp.png)}.firebaseui-input-toggle-off{background-image:url(https://www.gstatic.com/images/icons/material/system/1x/visibility_off_black_24dp.png)}.firebaseui-input-toggle-focus{opacity:.87}.firebaseui-input-toggle-blur{opacity:.38}.firebaseui-recaptcha-wrapper{display:table;margin:0 auto;padding-bottom:8px}.firebaseui-recaptcha-container{display:table-cell}.firebaseui-recaptcha-error-wrapper{caption-side:bottom;display:table-caption}.firebaseui-change-phone-number-link{display:block}.firebaseui-resend-container{direction:ltr;margin:20px 0;text-align:center}.firebaseui-id-resend-countdown{color:rgba(0,0,0,.38)}.firebaseui-id-page-phone-sign-in-start .firebaseui-form-actions div{float:left}@media (max-width:480px){.firebaseui-container{box-shadow:none;max-width:none;width:100%}.firebaseui-card-header{border-bottom:1px solid #e0e0e0;margin-bottom:16px;padding:16px 24px 0 24px}.firebaseui-title{padding-bottom:16px}.firebaseui-card-actions{padding-right:24px}.firebaseui-busy-indicator{top:0}}.mdl-textfield__label{font-weight:400;margin-bottom:0}.firebaseui-id-page-blank,.firebaseui-id-page-spinner{background:inherit;height:64px}.firebaseui-email-sent{background-image:url(https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/success_status.png);background-position:50%;background-repeat:no-repeat;background-size:64px 64px;height:64px;margin-top:16px;text-align:center}.firebaseui-text-justify{text-align:justify}.firebaseui-flag-KY{background-position:0 0}.firebaseui-flag-AC{background-position:0 -14px}.firebaseui-flag-AE{background-position:0 -28px}.firebaseui-flag-AF{background-position:0 -42px}.firebaseui-flag-AG{background-position:0 -56px}.firebaseui-flag-AI{background-position:0 -70px}.firebaseui-flag-AL{background-position:0 -84px}.firebaseui-flag-AM{background-position:0 -98px}.firebaseui-flag-AO{background-position:0 -112px}.firebaseui-flag-AQ{background-position:0 -126px}.firebaseui-flag-AR{background-position:0 -140px}.firebaseui-flag-AS{background-position:0 -154px}.firebaseui-flag-AT{background-position:0 -168px}.firebaseui-flag-AU{background-position:0 -182px}.firebaseui-flag-AW{background-position:0 -196px}.firebaseui-flag-AX{background-position:0 -210px}.firebaseui-flag-AZ{background-position:0 -224px}.firebaseui-flag-BA{background-position:0 -238px}.firebaseui-flag-BB{background-position:0 -252px}.firebaseui-flag-BD{background-position:0 -266px}.firebaseui-flag-BE{background-position:0 -280px}.firebaseui-flag-BF{background-position:0 -294px}.firebaseui-flag-BG{background-position:0 -308px}.firebaseui-flag-BH{background-position:0 -322px}.firebaseui-flag-BI{background-position:0 -336px}.firebaseui-flag-BJ{background-position:0 -350px}.firebaseui-flag-BL{background-position:0 -364px}.firebaseui-flag-BM{background-position:0 -378px}.firebaseui-flag-BN{background-position:0 -392px}.firebaseui-flag-BO{background-position:0 -406px}.firebaseui-flag-BQ{background-position:0 -420px}.firebaseui-flag-BR{background-position:0 -434px}.firebaseui-flag-BS{background-position:0 -448px}.firebaseui-flag-BT{background-position:0 -462px}.firebaseui-flag-BV{background-position:0 -476px}.firebaseui-flag-BW{background-position:0 -490px}.firebaseui-flag-BY{background-position:0 -504px}.firebaseui-flag-BZ{background-position:0 -518px}.firebaseui-flag-CA{background-position:0 -532px}.firebaseui-flag-CC{background-position:0 -546px}.firebaseui-flag-CD{background-position:0 -560px}.firebaseui-flag-CF{background-position:0 -574px}.firebaseui-flag-CG{background-position:0 -588px}.firebaseui-flag-CH{background-position:0 -602px}.firebaseui-flag-CI{background-position:0 -616px}.firebaseui-flag-CK{background-position:0 -630px}.firebaseui-flag-CL{background-position:0 -644px}.firebaseui-flag-CM{background-position:0 -658px}.firebaseui-flag-CN{background-position:0 -672px}.firebaseui-flag-CO{background-position:0 -686px}.firebaseui-flag-CP{background-position:0 -700px}.firebaseui-flag-CR{background-position:0 -714px}.firebaseui-flag-CU{background-position:0 -728px}.firebaseui-flag-CV{background-position:0 -742px}.firebaseui-flag-CW{background-position:0 -756px}.firebaseui-flag-CX{background-position:0 -770px}.firebaseui-flag-CY{background-position:0 -784px}.firebaseui-flag-CZ{background-position:0 -798px}.firebaseui-flag-DE{background-position:0 -812px}.firebaseui-flag-DG{background-position:0 -826px}.firebaseui-flag-DJ{background-position:0 -840px}.firebaseui-flag-DK{background-position:0 -854px}.firebaseui-flag-DM{background-position:0 -868px}.firebaseui-flag-DO{background-position:0 -882px}.firebaseui-flag-DZ{background-position:0 -896px}.firebaseui-flag-EA{background-position:0 -910px}.firebaseui-flag-EC{background-position:0 -924px}.firebaseui-flag-EE{background-position:0 -938px}.firebaseui-flag-EG{background-position:0 -952px}.firebaseui-flag-EH{background-position:0 -966px}.firebaseui-flag-ER{background-position:0 -980px}.firebaseui-flag-ES{background-position:0 -994px}.firebaseui-flag-ET{background-position:0 -1008px}.firebaseui-flag-EU{background-position:0 -1022px}.firebaseui-flag-FI{background-position:0 -1036px}.firebaseui-flag-FJ{background-position:0 -1050px}.firebaseui-flag-FK{background-position:0 -1064px}.firebaseui-flag-FM{background-position:0 -1078px}.firebaseui-flag-FO{background-position:0 -1092px}.firebaseui-flag-FR{background-position:0 -1106px}.firebaseui-flag-GA{background-position:0 -1120px}.firebaseui-flag-GB{background-position:0 -1134px}.firebaseui-flag-GD{background-position:0 -1148px}.firebaseui-flag-GE{background-position:0 -1162px}.firebaseui-flag-GF{background-position:0 -1176px}.firebaseui-flag-GG{background-position:0 -1190px}.firebaseui-flag-GH{background-position:0 -1204px}.firebaseui-flag-GI{background-position:0 -1218px}.firebaseui-flag-GL{background-position:0 -1232px}.firebaseui-flag-GM{background-position:0 -1246px}.firebaseui-flag-GN{background-position:0 -1260px}.firebaseui-flag-GP{background-position:0 -1274px}.firebaseui-flag-GQ{background-position:0 -1288px}.firebaseui-flag-GR{background-position:0 -1302px}.firebaseui-flag-GS{background-position:0 -1316px}.firebaseui-flag-GT{background-position:0 -1330px}.firebaseui-flag-GU{background-position:0 -1344px}.firebaseui-flag-GW{background-position:0 -1358px}.firebaseui-flag-GY{background-position:0 -1372px}.firebaseui-flag-HK{background-position:0 -1386px}.firebaseui-flag-HM{background-position:0 -1400px}.firebaseui-flag-HN{background-position:0 -1414px}.firebaseui-flag-HR{background-position:0 -1428px}.firebaseui-flag-HT{background-position:0 -1442px}.firebaseui-flag-HU{background-position:0 -1456px}.firebaseui-flag-IC{background-position:0 -1470px}.firebaseui-flag-ID{background-position:0 -1484px}.firebaseui-flag-IE{background-position:0 -1498px}.firebaseui-flag-IL{background-position:0 -1512px}.firebaseui-flag-IM{background-position:0 -1526px}.firebaseui-flag-IN{background-position:0 -1540px}.firebaseui-flag-IO{background-position:0 -1554px}.firebaseui-flag-IQ{background-position:0 -1568px}.firebaseui-flag-IR{background-position:0 -1582px}.firebaseui-flag-IS{background-position:0 -1596px}.firebaseui-flag-IT{background-position:0 -1610px}.firebaseui-flag-JE{background-position:0 -1624px}.firebaseui-flag-JM{background-position:0 -1638px}.firebaseui-flag-JO{background-position:0 -1652px}.firebaseui-flag-JP{background-position:0 -1666px}.firebaseui-flag-KE{background-position:0 -1680px}.firebaseui-flag-KG{background-position:0 -1694px}.firebaseui-flag-KH{background-position:0 -1708px}.firebaseui-flag-KI{background-position:0 -1722px}.firebaseui-flag-KM{background-position:0 -1736px}.firebaseui-flag-KN{background-position:0 -1750px}.firebaseui-flag-KP{background-position:0 -1764px}.firebaseui-flag-KR{background-position:0 -1778px}.firebaseui-flag-KW{background-position:0 -1792px}.firebaseui-flag-AD{background-position:0 -1806px}.firebaseui-flag-KZ{background-position:0 -1820px}.firebaseui-flag-LA{background-position:0 -1834px}.firebaseui-flag-LB{background-position:0 -1848px}.firebaseui-flag-LC{background-position:0 -1862px}.firebaseui-flag-LI{background-position:0 -1876px}.firebaseui-flag-LK{background-position:0 -1890px}.firebaseui-flag-LR{background-position:0 -1904px}.firebaseui-flag-LS{background-position:0 -1918px}.firebaseui-flag-LT{background-position:0 -1932px}.firebaseui-flag-LU{background-position:0 -1946px}.firebaseui-flag-LV{background-position:0 -1960px}.firebaseui-flag-LY{background-position:0 -1974px}.firebaseui-flag-MA{background-position:0 -1988px}.firebaseui-flag-MC{background-position:0 -2002px}.firebaseui-flag-MD{background-position:0 -2016px}.firebaseui-flag-ME{background-position:0 -2030px}.firebaseui-flag-MF{background-position:0 -2044px}.firebaseui-flag-MG{background-position:0 -2058px}.firebaseui-flag-MH{background-position:0 -2072px}.firebaseui-flag-MK{background-position:0 -2086px}.firebaseui-flag-ML{background-position:0 -2100px}.firebaseui-flag-MM{background-position:0 -2114px}.firebaseui-flag-MN{background-position:0 -2128px}.firebaseui-flag-MO{background-position:0 -2142px}.firebaseui-flag-MP{background-position:0 -2156px}.firebaseui-flag-MQ{background-position:0 -2170px}.firebaseui-flag-MR{background-position:0 -2184px}.firebaseui-flag-MS{background-position:0 -2198px}.firebaseui-flag-MT{background-position:0 -2212px}.firebaseui-flag-MU{background-position:0 -2226px}.firebaseui-flag-MV{background-position:0 -2240px}.firebaseui-flag-MW{background-position:0 -2254px}.firebaseui-flag-MX{background-position:0 -2268px}.firebaseui-flag-MY{background-position:0 -2282px}.firebaseui-flag-MZ{background-position:0 -2296px}.firebaseui-flag-NA{background-position:0 -2310px}.firebaseui-flag-NC{background-position:0 -2324px}.firebaseui-flag-NE{background-position:0 -2338px}.firebaseui-flag-NF{background-position:0 -2352px}.firebaseui-flag-NG{background-position:0 -2366px}.firebaseui-flag-NI{background-position:0 -2380px}.firebaseui-flag-NL{background-position:0 -2394px}.firebaseui-flag-NO{background-position:0 -2408px}.firebaseui-flag-NP{background-position:0 -2422px}.firebaseui-flag-NR{background-position:0 -2436px}.firebaseui-flag-NU{background-position:0 -2450px}.firebaseui-flag-NZ{background-position:0 -2464px}.firebaseui-flag-OM{background-position:0 -2478px}.firebaseui-flag-PA{background-position:0 -2492px}.firebaseui-flag-PE{background-position:0 -2506px}.firebaseui-flag-PF{background-position:0 -2520px}.firebaseui-flag-PG{background-position:0 -2534px}.firebaseui-flag-PH{background-position:0 -2548px}.firebaseui-flag-PK{background-position:0 -2562px}.firebaseui-flag-PL{background-position:0 -2576px}.firebaseui-flag-PM{background-position:0 -2590px}.firebaseui-flag-PN{background-position:0 -2604px}.firebaseui-flag-PR{background-position:0 -2618px}.firebaseui-flag-PS{background-position:0 -2632px}.firebaseui-flag-PT{background-position:0 -2646px}.firebaseui-flag-PW{background-position:0 -2660px}.firebaseui-flag-PY{background-position:0 -2674px}.firebaseui-flag-QA{background-position:0 -2688px}.firebaseui-flag-RE{background-position:0 -2702px}.firebaseui-flag-RO{background-position:0 -2716px}.firebaseui-flag-RS{background-position:0 -2730px}.firebaseui-flag-RU{background-position:0 -2744px}.firebaseui-flag-RW{background-position:0 -2758px}.firebaseui-flag-SA{background-position:0 -2772px}.firebaseui-flag-SB{background-position:0 -2786px}.firebaseui-flag-SC{background-position:0 -2800px}.firebaseui-flag-SD{background-position:0 -2814px}.firebaseui-flag-SE{background-position:0 -2828px}.firebaseui-flag-SG{background-position:0 -2842px}.firebaseui-flag-SH{background-position:0 -2856px}.firebaseui-flag-SI{background-position:0 -2870px}.firebaseui-flag-SJ{background-position:0 -2884px}.firebaseui-flag-SK{background-position:0 -2898px}.firebaseui-flag-SL{background-position:0 -2912px}.firebaseui-flag-SM{background-position:0 -2926px}.firebaseui-flag-SN{background-position:0 -2940px}.firebaseui-flag-SO{background-position:0 -2954px}.firebaseui-flag-SR{background-position:0 -2968px}.firebaseui-flag-SS{background-position:0 -2982px}.firebaseui-flag-ST{background-position:0 -2996px}.firebaseui-flag-SV{background-position:0 -3010px}.firebaseui-flag-SX{background-position:0 -3024px}.firebaseui-flag-SY{background-position:0 -3038px}.firebaseui-flag-SZ{background-position:0 -3052px}.firebaseui-flag-TA{background-position:0 -3066px}.firebaseui-flag-TC{background-position:0 -3080px}.firebaseui-flag-TD{background-position:0 -3094px}.firebaseui-flag-TF{background-position:0 -3108px}.firebaseui-flag-TG{background-position:0 -3122px}.firebaseui-flag-TH{background-position:0 -3136px}.firebaseui-flag-TJ{background-position:0 -3150px}.firebaseui-flag-TK{background-position:0 -3164px}.firebaseui-flag-TL{background-position:0 -3178px}.firebaseui-flag-TM{background-position:0 -3192px}.firebaseui-flag-TN{background-position:0 -3206px}.firebaseui-flag-TO{background-position:0 -3220px}.firebaseui-flag-TR{background-position:0 -3234px}.firebaseui-flag-TT{background-position:0 -3248px}.firebaseui-flag-TV{background-position:0 -3262px}.firebaseui-flag-TW{background-position:0 -3276px}.firebaseui-flag-TZ{background-position:0 -3290px}.firebaseui-flag-UA{background-position:0 -3304px}.firebaseui-flag-UG{background-position:0 -3318px}.firebaseui-flag-UM{background-position:0 -3332px}.firebaseui-flag-UN{background-position:0 -3346px}.firebaseui-flag-US{background-position:0 -3360px}.firebaseui-flag-UY{background-position:0 -3374px}.firebaseui-flag-UZ{background-position:0 -3388px}.firebaseui-flag-VA{background-position:0 -3402px}.firebaseui-flag-VC{background-position:0 -3416px}.firebaseui-flag-VE{background-position:0 -3430px}.firebaseui-flag-VG{background-position:0 -3444px}.firebaseui-flag-VI{background-position:0 -3458px}.firebaseui-flag-VN{background-position:0 -3472px}.firebaseui-flag-VU{background-position:0 -3486px}.firebaseui-flag-WF{background-position:0 -3500px}.firebaseui-flag-WS{background-position:0 -3514px}.firebaseui-flag-XK{background-position:0 -3528px}.firebaseui-flag-YE{background-position:0 -3542px}.firebaseui-flag-YT{background-position:0 -3556px}.firebaseui-flag-ZA{background-position:0 -3570px}.firebaseui-flag-ZM{background-position:0 -3584px}.firebaseui-flag-ZW{background-position:0 -3598px}')))
    }
      , $q = {
        Kk: {
            mode: "resetPassword",
            handler: function(a, b, c, d, e) {
                return cr(a, b, Mq, c, d, e)
            }
        },
        Lk: {
            mode: "recoverEmail",
            handler: function(a, b, c, d) {
                return cr(a, b, Kq, c, d)
            }
        },
        VERIFY_EMAIL: {
            mode: "verifyEmail",
            handler: function(a, b, c, d, e) {
                return cr(a, b, Qq, c, d, e)
            }
        },
        Mk: {
            mode: "signIn",
            handler: function(a, b, c, d, e) {
                if (e) {
                    var f = a.Jb(), g;
                    if (g = f) {
                        if (void 0 !== f.firstElementChild)
                            f = f.firstElementChild;
                        else
                            for (f = f.firstChild; f && 1 != f.nodeType; )
                                f = f.nextSibling;
                        g = f
                    }
                    (f = g) && document && document.body && (document.body.style.margin = "0px",
                    f.style["max-width"] = "100%",
                    f.style["box-shadow"] = "none");
                    f = Hf(e);
                    if (!f.ba.match(/\.app\.goo\.gl$/) && !f.ba.match(/\.page\.link$/) || !Gf(f, "link") || "http" != f.ha && "https" != f.ha)
                        try {
                            var h = {
                                apiKey: b.app.options.apiKey,
                                oobCode: c,
                                mode: "signIn"
                            };
                            d && (h.lang = d);
                            b.tenantId && (h.tenantId = b.tenantId);
                            var l = qf(e, h);
                            Fq(l)
                        } catch (n) {
                            Jq(a, "No API key provided or the contine URL is not a valid URL.")
                        }
                    else
                        Jq(a, '"canHandleCodeInApp" must be "true" for email link sign-in. The user is expected to complete sign-in in the intended application.')
                } else
                    Jq(a, "Continue URL is required for email sign-in!");
                return G()
            }
        },
        REVERT_SECOND_FACTOR_ADDITION: {
            mode: "revertSecondFactorAddition",
            handler: function(a, b, c, d) {
                return cr(a, b, Rq, c, d)
            }
        },
        VERIFY_AND_CHANGE_EMAIL: {
            mode: "verifyAndChangeEmail",
            handler: function(a, b, c, d, e) {
                return cr(a, b, Pq, c, d, e)
            }
        }
    }
      , dr = null;
    var fr = function(a, b) {
        "complete" == p.document.readyState ? er(a, b) : Ad(window, "load", function() {
            er(a, b)
        })
    }
      , gr = ["fireauth", "oob", "OobHandler", "initialize"]
      , hr = p;
    gr[0]in hr || "undefined" == typeof hr.execScript || hr.execScript("var " + gr[0]);
    for (var ir; gr.length && (ir = gr.shift()); )
        gr.length || void 0 === fr ? hr = hr[ir] && hr[ir] !== Object.prototype[ir] ? hr[ir] : hr[ir] = {} : hr[ir] = fr;
}
).call(this);
