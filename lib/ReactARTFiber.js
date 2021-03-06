/**
 * Copyright (c) 2013-present Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule ReactARTFiber
 */
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

require('art/modes/current').setCurrent(
// Change to 'art/modes/dom' for easier debugging via SVG
require('art/modes/svg'));

var Mode = require('art/modes/current');
var Transform = require('art/core/transform');
var invariant = require('fbjs/lib/invariant');
var emptyObject = require('fbjs/lib/emptyObject');
var React = require('react');
var ReactFiberReconciler = require('react-reconciler');
var ReactDOMFrameScheduling = require('./ReactDOMFrameScheduling');

var Component = React.Component;


var pooledTransform = new Transform();

var EVENT_TYPES = {
  onClick: 'click',
  onMouseMove: 'mousemove',
  onMouseOver: 'mouseover',
  onMouseOut: 'mouseout',
  onMouseUp: 'mouseup',
  onMouseDown: 'mousedown'
};

var TYPES = {
  CLIPPING_RECTANGLE: 'ClippingRectangle',
  GROUP: 'Group',
  SHAPE: 'Shape',
  TEXT: 'Text'
};

/** Helper Methods */

function addEventListeners(instance, type, listener) {
  // We need to explicitly unregister before unmount.
  // For this reason we need to track subscriptions.
  if (!instance._listeners) {
    instance._listeners = {};
    instance._subscriptions = {};
  }

  instance._listeners[type] = listener;

  if (listener) {
    if (!instance._subscriptions[type]) {
      instance._subscriptions[type] = instance.subscribe(type, createEventHandler(instance), instance);
    }
  } else {
    if (instance._subscriptions[type]) {
      instance._subscriptions[type]();
      delete instance._subscriptions[type];
    }
  }
}

function childrenAsString(children) {
  if (!children) {
    return '';
  } else if (typeof children === 'string') {
    return children;
  } else if (children.length) {
    return children.join('');
  } else {
    return '';
  }
}

function createEventHandler(instance) {
  return function handleEvent(event) {
    var listener = instance._listeners[event.type];

    if (!listener) {
      // Noop
    } else if (typeof listener === 'function') {
      listener.call(instance, event);
    } else if (listener.handleEvent) {
      listener.handleEvent(event);
    }
  };
}

function destroyEventListeners(instance) {
  if (instance._subscriptions) {
    for (var type in instance._subscriptions) {
      instance._subscriptions[type]();
    }
  }

  instance._subscriptions = null;
  instance._listeners = null;
}

function getScaleX(props) {
  if (props.scaleX != null) {
    return props.scaleX;
  } else if (props.scale != null) {
    return props.scale;
  } else {
    return 1;
  }
}

function getScaleY(props) {
  if (props.scaleY != null) {
    return props.scaleY;
  } else if (props.scale != null) {
    return props.scale;
  } else {
    return 1;
  }
}

function isSameFont(oldFont, newFont) {
  if (oldFont === newFont) {
    return true;
  } else if (typeof newFont === 'string' || typeof oldFont === 'string') {
    return false;
  } else {
    return newFont.fontSize === oldFont.fontSize && newFont.fontStyle === oldFont.fontStyle && newFont.fontVariant === oldFont.fontVariant && newFont.fontWeight === oldFont.fontWeight && newFont.fontFamily === oldFont.fontFamily;
  }
}

/** Render Methods */

function applyClippingRectangleProps(instance, props) {
  var prevProps = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  applyNodeProps(instance, props, prevProps);

  instance.width = props.width;
  instance.height = props.height;
}

function applyGroupProps(instance, props) {
  var prevProps = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  applyNodeProps(instance, props, prevProps);

  instance.width = props.width;
  instance.height = props.height;
}

function applyNodeProps(instance, props) {
  var prevProps = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  var scaleX = getScaleX(props);
  var scaleY = getScaleY(props);

  pooledTransform.transformTo(1, 0, 0, 1, 0, 0).move(props.x || 0, props.y || 0).rotate(props.rotation || 0, props.originX, props.originY).scale(scaleX, scaleY, props.originX, props.originY);

  if (props.transform != null) {
    pooledTransform.transform(props.transform);
  }

  if (instance.xx !== pooledTransform.xx || instance.yx !== pooledTransform.yx || instance.xy !== pooledTransform.xy || instance.yy !== pooledTransform.yy || instance.x !== pooledTransform.x || instance.y !== pooledTransform.y) {
    instance.transformTo(pooledTransform);
  }

  if (props.cursor !== prevProps.cursor || props.title !== prevProps.title) {
    instance.indicate(props.cursor, props.title);
  }

  if (instance.blend && props.opacity !== prevProps.opacity) {
    instance.blend(props.opacity == null ? 1 : props.opacity);
  }

  if (props.visible !== prevProps.visible) {
    if (props.visible == null || props.visible) {
      instance.show();
    } else {
      instance.hide();
    }
  }

  for (var type in EVENT_TYPES) {
    addEventListeners(instance, EVENT_TYPES[type], props[type]);
  }
}

function applyRenderableNodeProps(instance, props) {
  var prevProps = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  applyNodeProps(instance, props, prevProps);

  if (prevProps.fill !== props.fill) {
    if (props.fill && props.fill.applyFill) {
      props.fill.applyFill(instance);
    } else {
      instance.fill(props.fill);
    }
  }
  if (prevProps.stroke !== props.stroke || prevProps.strokeWidth !== props.strokeWidth || prevProps.strokeCap !== props.strokeCap || prevProps.strokeJoin !== props.strokeJoin ||
  // TODO: Consider deep check of stokeDash; may benefit VML in IE.
  prevProps.strokeDash !== props.strokeDash) {
    instance.stroke(props.stroke, props.strokeWidth, props.strokeCap, props.strokeJoin, props.strokeDash);
  }
}

function applyShapeProps(instance, props) {
  var prevProps = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  applyRenderableNodeProps(instance, props, prevProps);

  var path = props.d || childrenAsString(props.children);

  var prevDelta = instance._prevDelta;
  var prevPath = instance._prevPath;

  if (path !== prevPath || path.delta !== prevDelta || prevProps.height !== props.height || prevProps.width !== props.width) {
    instance.draw(path, props.strokeWidth, props.stroke);

    instance._prevDelta = path.delta;
    instance._prevPath = path;
  }
}

function applyTextProps(instance, props) {
  var prevProps = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  applyRenderableNodeProps(instance, props, prevProps);

  var string = childrenAsString(props.children);

  if (instance._currentString !== string || !isSameFont(props.font, prevProps.font) || props.alignment !== prevProps.alignment || props.path !== prevProps.path) {
    instance.draw(string, props.font, props.alignment, props.path);

    instance._currentString = string;
  }
}

/** Declarative fill-type objects; API design not finalized */

var slice = Array.prototype.slice;

var LinearGradient = function () {
  function LinearGradient(stops, x1, y1, x2, y2) {
    _classCallCheck(this, LinearGradient);

    this._args = slice.call(arguments);
  }

  _createClass(LinearGradient, [{
    key: 'applyFill',
    value: function applyFill(node) {
      node.fillLinear.apply(node, this._args);
    }
  }]);

  return LinearGradient;
}();

var RadialGradient = function () {
  function RadialGradient(stops, fx, fy, rx, ry, cx, cy) {
    _classCallCheck(this, RadialGradient);

    this._args = slice.call(arguments);
  }

  _createClass(RadialGradient, [{
    key: 'applyFill',
    value: function applyFill(node) {
      node.fillRadial.apply(node, this.args);
    }
  }]);

  return RadialGradient;
}();

var Pattern = function () {
  function Pattern(url, width, height, left, top) {
    _classCallCheck(this, Pattern);

    this._args = slice.call(arguments);
  }

  _createClass(Pattern, [{
    key: 'applyFill',
    value: function applyFill(node) {
      node.fillImage.apply(node, this.args);
    }
  }]);

  return Pattern;
}();

/** React Components */

var Surface = function (_Component) {
  _inherits(Surface, _Component);

  function Surface() {
    _classCallCheck(this, Surface);

    return _possibleConstructorReturn(this, (Surface.__proto__ || Object.getPrototypeOf(Surface)).apply(this, arguments));
  }

  _createClass(Surface, [{
    key: 'componentDidMount',
    value: function componentDidMount() {
      var _props = this.props,
          height = _props.height,
          width = _props.width;


      this._surface = Mode.Surface(+width, +height, this._tagRef);

      this._mountNode = ARTRenderer.createContainer(this._surface);
      ARTRenderer.updateContainer(this.props.children, this._mountNode, this);
    }
  }, {
    key: 'componentDidUpdate',
    value: function componentDidUpdate(prevProps, prevState) {
      var _this2 = this;

      var props = this.props;

      if (props.height !== prevProps.height || props.width !== prevProps.width) {
        this._surface.resize(+props.width, +props.height);
      }

      window.requestAnimationFrame(function () {
        ARTRenderer.updateContainer(_this2.props.children, _this2._mountNode, _this2);
      });

      if (this._surface.render) {
        this._surface.render();
      }
    }
  }, {
    key: 'componentWillUnmount',
    value: function componentWillUnmount() {
      ARTRenderer.updateContainer(null, this._mountNode, this);
    }
  }, {
    key: 'render',
    value: function render() {
      var _this3 = this;

      // This is going to be a placeholder because we don't know what it will
      // actually resolve to because ART may render canvas, vml or svg tags here.
      // We only allow a subset of properties since others might conflict with
      // ART's properties.
      var props = this.props;

      // TODO: ART's Canvas Mode overrides surface title and cursor
      var Tag = Mode.Surface.tagName;

      return React.createElement(Tag, {
        ref: function ref(_ref) {
          return _this3._tagRef = _ref;
        },
        accessKey: props.accessKey,
        className: props.className,
        draggable: props.draggable,
        role: props.role,
        style: props.style,
        tabIndex: props.tabIndex,
        title: props.title
      });
    }
  }]);

  return Surface;
}(Component);

var Shape = function (_Component2) {
  _inherits(Shape, _Component2);

  function Shape() {
    _classCallCheck(this, Shape);

    return _possibleConstructorReturn(this, (Shape.__proto__ || Object.getPrototypeOf(Shape)).apply(this, arguments));
  }

  _createClass(Shape, [{
    key: 'componentDidMount',
    value: function componentDidMount() {

      this.shape = Mode.Shape(this.props.d.path, this.props.strokeWidth, this.props.stroke, this._tagRef);
      this._mountNode = ARTRenderer.createContainer(this.shape);
      ARTRenderer.updateContainer(this.props.children, this._mountNode, this);
    }
  }, {
    key: 'shouldComponentUpdate',
    value: function shouldComponentUpdate(newProps) {
      return this.props.d !== newProps.d;
    }
  }, {
    key: 'componentDidUpdate',
    value: function componentDidUpdate(prevProps, prevState) {
      var _this5 = this;

      var props = this.props;

      window.requestAnimationFrame(function () {
        ARTRenderer.updateContainer(_this5.props.children, _this5._mountNode, _this5);
      });

      if (this.shape.draw) {
        this.shape.draw(this.props.d.path, this.props.strokeWidth, this.props.stroke);
      }
    }
  }, {
    key: 'componentWillUnmount',
    value: function componentWillUnmount() {
      ARTRenderer.updateContainer(null, this._mountNode, this);
    }
  }, {
    key: 'render',
    value: function render() {
      var _this6 = this;

      // This is going to be a placeholder because we don't know what it will
      // actually resolve to because ART may render canvas, vml or svg tags here.
      // We only allow a subset of properties since others might conflict with
      // ART's properties.
      var props = this.props;

      // TODO: ART's Canvas Mode overrides surface title and cursor
      var Tag = Mode.Shape.tagName;

      return React.createElement(Tag, {
        ref: function ref(_ref2) {
          return _this6._tagRef = _ref2;
        },
        accessKey: props.accessKey,
        className: props.className,
        draggable: props.draggable,
        role: props.role,
        style: props.style,
        tabIndex: props.tabIndex,
        title: props.title,
        stroke: props.stroke,
        strokeWidth: props.strokeWidth,
        d: props.d.path
      });
    }
  }]);

  return Shape;
}(Component);

var Group = function (_Component3) {
  _inherits(Group, _Component3);

  function Group() {
    _classCallCheck(this, Group);

    return _possibleConstructorReturn(this, (Group.__proto__ || Object.getPrototypeOf(Group)).apply(this, arguments));
  }

  _createClass(Group, [{
    key: 'componentDidMount',
    value: function componentDidMount() {

      this.group = Mode.Group(this.props.width, this.props.height, this._tagRef);
      applyGroupProps(this.group, this.props);
      this._mountNode = ARTRenderer.createContainer(this.group);
      ARTRenderer.updateContainer(this.props.children, this._mountNode, this);
    }
  }, {
    key: 'componentDidUpdate',
    value: function componentDidUpdate(prevProps, prevState) {
      var _this8 = this;

      window.requestAnimationFrame(function () {
        ARTRenderer.updateContainer(_this8.props.children, _this8._mountNode, _this8);
      });
    }
  }, {
    key: 'componentWillUnmount',
    value: function componentWillUnmount() {
      ARTRenderer.updateContainer(null, this._mountNode, this);
    }
  }, {
    key: 'render',
    value: function render() {
      var _this9 = this;

      // This is going to be a placeholder because we don't know what it will
      // actually resolve to because ART may render canvas, vml or svg tags here.
      // We only allow a subset of properties since others might conflict with
      // ART's properties.
      var props = this.props;

      // TODO: ART's Canvas Mode overrides surface title and cursor
      var Tag = Mode.Group.tagName;

      return React.createElement(Tag, {
        ref: function ref(_ref3) {
          return _this9._tagRef = _ref3;
        },
        accessKey: props.accessKey,
        className: props.className,
        draggable: props.draggable,
        role: props.role,
        style: props.style,
        tabIndex: props.tabIndex,
        title: props.title,
        rotation: props.rotation,
        originX: props.originX,
        originY: props.originY,
        children: props.children
      });
    }
  }]);

  return Group;
}(Component);

/** ART Renderer */

var ARTRenderer = ReactFiberReconciler({
  appendInitialChild: function appendInitialChild(parentInstance, child) {
    if (typeof child === 'string') {
      // Noop for string children of Text (eg <Text>{'foo'}{'bar'}</Text>)
      return;
    }

    child.inject(parentInstance);
  },
  createInstance: function createInstance(type, props, internalInstanceHandle) {
    var instance = void 0;

    switch (type) {
      case TYPES.CLIPPING_RECTANGLE:
        instance = Mode.ClippingRectangle();
        instance._applyProps = applyClippingRectangleProps;
        break;
      case TYPES.GROUP:
        instance = Mode.Group();
        instance._applyProps = applyGroupProps;
        break;
      case TYPES.SHAPE:
        instance = Mode.Shape();
        instance._applyProps = applyShapeProps;
        break;
      case TYPES.TEXT:
        instance = Mode.Text(childrenAsString(props.children), props.font, props.alignment, props.path);
        instance._applyProps = applyTextProps;
        break;
    }

    invariant(instance, 'ReactART does not support the type "%s"', type);

    instance._applyProps(instance, props);

    return instance;
  },
  createTextInstance: function createTextInstance(text, rootContainerInstance, internalInstanceHandle) {
    return text;
  },
  finalizeInitialChildren: function finalizeInitialChildren(domElement, type, props) {
    return false;
  },
  prepareForCommit: function prepareForCommit() {
    // Noop
  },
  prepareUpdate: function prepareUpdate(domElement, type, oldProps, newProps) {
    return true;
  },
  resetAfterCommit: function resetAfterCommit() {
    // Noop
  },
  getRootHostContext: function getRootHostContext() {
    return emptyObject;
  },
  getChildHostContext: function getChildHostContext() {
    return emptyObject;
  },
  getPublicInstance: function getPublicInstance(instance) {
    return instance;
  },


  scheduleAnimationCallback: window.requestAnimationFrame,

  scheduleDeferredCallback: window.requestIdleCallback,

  now: ReactDOMFrameScheduling.now,

  shouldSetTextContent: function shouldSetTextContent(props) {
    return typeof props.children === 'string' || typeof props.children === 'number';
  },


  useSyncScheduling: true,

  mutation: {
    appendChild: function appendChild(parentInstance, child) {
      if (child.parentNode === parentInstance) {
        child.eject();
      }

      child.inject(parentInstance);
    },
    appendChildToContainer: function appendChildToContainer(parentInstance, child) {
      if (child.parentNode === parentInstance) {
        child.eject();
      }

      child.inject(parentInstance);
    },
    insertBefore: function insertBefore(parentInstance, child, beforeChild) {
      invariant(child !== beforeChild, 'ReactART: Can not insert node before itself');

      child.injectBefore(beforeChild);
    },
    removeChild: function removeChild(parentInstance, child) {
      destroyEventListeners(child);

      child.eject();
    },
    removeChildFromContainer: function removeChildFromContainer(parentInstance, child) {
      destroyEventListeners(child);

      child.eject();
    },
    commitTextUpdate: function commitTextUpdate(textInstance, oldText, newText) {
      // Noop
    },
    commitMount: function commitMount(instance, type, newProps) {
      // Noop
    },
    commitUpdate: function commitUpdate(instance, type, oldProps, newProps) {
      instance._applyProps(instance, newProps, oldProps);
    },
    resetTextContent: function resetTextContent(domElement) {
      // Noop
    }
  }
});

/** API */

module.exports = {
  ClippingRectangle: TYPES.CLIPPING_RECTANGLE,
  Group: Group,
  LinearGradient: LinearGradient,
  Path: Mode.Path,
  Pattern: Pattern,
  RadialGradient: RadialGradient,
  Shape: Shape,
  Surface: Surface,
  Text: Mode.TEXT,
  Transform: Transform
};