var clippy = {};

/******
 *
 *
 * @constructor
 */
clippy.Agent = function (path, data, sounds) {
  this.path = path;

  this._queue = new clippy.Queue($.proxy(this._onQueueEmpty, this));

  this._el = $('<div class="clippy"></div>').hide();

  var container = $("#screen");
  if (container.length === 0) {
    container = $(document.body);
  }
  container.append(this._el);

  this._animator = new clippy.Animator(this._el, path, data, sounds);

  this._balloon = new clippy.Balloon(this._el);

  this._setupEvents();
};

clippy.Agent.prototype = {
  _wasDragged: false,
  _touchTimer: null,
  _touchStartX: 0,
  _touchStartY: 0,
  _longPressFired: false,
  _touchMoveHandle: null,
  _touchEndHandle: null,

  /**************************** API ************************************/

  /***
   *
   * @param {Number} x
   * @param {Number} y
   */
  gestureAt: function (x, y) {
    var d = this._getDirection(x, y);
    var gAnim = "Gesture" + d;
    var lookAnim = "Look" + d;

    var animation = this.hasAnimation(gAnim) ? gAnim : lookAnim;
    return this.play(animation);
  },

  /***
   *
   * @param {Boolean=} fast
   *
   */
  hide: function (fast, callback) {
    this._hidden = true;
    var el = this._el;
    this.stop();
    if (fast) {
      this._el.hide();
      this.stop();
      this.pause();
      if (callback) callback();
      return;
    }

    return this._playInternal("Hide", function () {
      el.hide();
      this.pause();
      if (callback) callback();
    });
  },

  moveTo: function (x, y, duration) {
    var dir = this._getDirection(x, y);
    var anim = "Move" + dir;
    if (duration === undefined) duration = 1000;

    this._addToQueue(function (complete) {
      // the simple case
      if (duration === 0) {
        this._el.css({ top: y, left: x });
        this.reposition();
        complete();
        return;
      }

      // no animations
      if (!this.hasAnimation(anim)) {
        this._el.animate({ top: y, left: x }, duration, complete);
        return;
      }

      var callback = $.proxy(function (name, state) {
        // when exited, complete
        if (state === clippy.Animator.States.EXITED) {
          complete();
        }
        // if waiting,
        if (state === clippy.Animator.States.WAITING) {
          this._el.animate(
            { top: y, left: x },
            duration,
            $.proxy(function () {
              // after we're done with the movement, do the exit animation
              this._animator.exitAnimation();
            }, this),
          );
        }
      }, this);

      this._playInternal(anim, callback);
    }, this);
  },

  _playInternal: function (animation, callback) {
    // if we're inside an idle animation,
    if (
      this._isIdleAnimation() &&
      this._idleDfd &&
      this._idleDfd.state() === "pending"
    ) {
      this._idleDfd.done(
        $.proxy(function () {
          this._playInternal(animation, callback);
        }, this),
      );
    }

    this._animator.showAnimation(animation, callback);
  },

  play: function (animation, timeout, cb) {
    if (!this.hasAnimation(animation)) return false;

    if (timeout === undefined) timeout = 5000;

    this._addToQueue(function (complete) {
      var completed = false;
      // handle callback
      var callback = function (name, state) {
        if (state === clippy.Animator.States.EXITED) {
          completed = true;
          if (cb) cb();
          complete();
        }
      };

      // if has timeout, register a timeout function
      if (timeout) {
        window.setTimeout(
          $.proxy(function () {
            if (completed) return;
            // exit after timeout
            this._animator.exitAnimation();
          }, this),
          timeout,
        );
      }

      this._playInternal(animation, callback);
    }, this);

    return true;
  },

  /***
   *
   * @param {Boolean=} fast
   */
  show: function (fast) {
    this._hidden = false;
    if (fast) {
      this._el.show();
      this.resume();
      this._onQueueEmpty();
      return;
    }

    if (this._el.css("top") === "auto" || this._el.css("left") === "auto") {
      var container = $("#screen");
      if (container.length === 0) {
        container = $(window);
      }
      var left = container.width() * 0.8;
      var top = container.height() * 0.8;
      this._el.css({ top: top, left: left });
    }

    this.resume();
    var animation = this.hasAnimation("Greeting") ? "Greeting" : "Show";
    return this.play(animation);
  },

  /***
   *
   * @param {String} text
   * @param {Boolean} hold - Whether to hold the speech balloon
   * @param {Boolean=} useTTS - Whether to use text-to-speech (defaults to this.isTTSEnabled())
   */
  speak: function (text, hold, useTTS) {
    if (useTTS === undefined) useTTS = this.isTTSEnabled();
    this._addToQueue(function (complete) {
      this._balloon.speak(complete, text, hold, useTTS);
    }, this);
  },

  /***
   * Close the current balloon
   */
  closeBalloon: function () {
    this._balloon.hide(true);
  },

  /***
   * TTS Configuration Methods
   */

  /**
   * Configure TTS settings for this agent
   * @param {Object} options - TTS configuration options
   * @param {SpeechSynthesisVoice} options.voice - Voice to use
   * @param {Number} options.rate - Speech rate (0.1 to 10)
   * @param {Number} options.pitch - Speech pitch (0 to 2)
   * @param {Number} options.volume - Speech volume (0 to 1)
   * @returns {Boolean} - True if TTS is available and configured
   */
  setTTSOptions: function (options) {
    return this._balloon.setTTSOptions(options);
  },

  /**
   * Get available TTS voices
   * @returns {Array} Array of available voices
   */
  getTTSVoices: function () {
    return this._balloon.getTTSVoices();
  },

  /**
   * Check if TTS is supported and enabled
   * @returns {Boolean}
   */
  isTTSEnabled: function () {
    return this._balloon.isTTSEnabled();
  },

  /**
   * Stop current TTS speech
   */
  stopTTS: function () {
    this._balloon.stopTTS();
  },

  setTTSEnabled: function (enabled) {
    this._balloon.setTTSEnabled(enabled);
  },

  delay: function (time) {
    time = time || 250;

    this._addToQueue(function (complete) {
      this._onQueueEmpty();
      window.setTimeout(complete, time);
    });
  },

  /***
   * Skips the current animation
   */
  stopCurrent: function () {
    this._animator.exitAnimation();
    this._balloon.close();
  },

  stop: function () {
    // clear the queue
    this.stopTTS();
    this._queue.clear();
    this._animator.exitAnimation();
    this._balloon.hide();
  },

  /***
   *
   * @param {String} name
   * @returns {Boolean}
   */
  hasAnimation: function (name) {
    return this._animator.hasAnimation(name);
  },

  /***
   * Gets a list of animation names
   *
   * @return {Array.<string>}
   */
  animations: function () {
    return this._animator.animations();
  },

  /***
   * Play a random animation
   * @return {jQuery.Deferred}
   */
  animate: function () {
    var animations = this.animations();
    var anim = animations[Math.floor(Math.random() * animations.length)];
    // skip idle animations
    if (anim.indexOf("Idle") === 0) {
      return this.animate();
    }
    return this.play(anim);
  },

  /**************************** Utils ************************************/

  /***
   *
   * @param {Number} x
   * @param {Number} y
   * @return {String}
   * @private
   */
  _getDirection: function (x, y) {
    var offset = this._el.offset();
    var h = this._el.height();
    var w = this._el.width();

    var centerX = offset.left + w / 2;
    var centerY = offset.top + h / 2;

    var a = centerY - y;
    var b = centerX - x;

    var r = Math.round((180 * Math.atan2(a, b)) / Math.PI);

    // Left and Right are for the character, not the screen :-/
    if (-45 <= r && r < 45) return "Right";
    if (45 <= r && r < 135) return "Up";
    if ((135 <= r && r <= 180) || (-180 <= r && r < -135)) return "Left";
    if (-135 <= r && r < -45) return "Down";

    // sanity check
    return "Top";
  },

  /**************************** Queue and Idle handling ************************************/

  /***
   * Handle empty queue.
   * We need to transition the animation to an idle state
   * @private
   */
  _onQueueEmpty: function () {
    if (this._hidden || this._isIdleAnimation()) return;
    var idleAnim = this._getIdleAnimation();
    this._idleDfd = $.Deferred();

    this._animator.showAnimation(idleAnim, $.proxy(this._onIdleComplete, this));
  },

  _onIdleComplete: function (name, state) {
    if (state === clippy.Animator.States.EXITED) {
      this._idleDfd.resolve();
    }
  },

  /***
   * Is the current animation is Idle?
   * @return {Boolean}
   * @private
   */
  _isIdleAnimation: function () {
    var c = this._animator.currentAnimationName;
    return c && c.indexOf("Idle") === 0;
  },

  /**
   * Gets a random Idle animation
   * @return {String}
   * @private
   */
  _getIdleAnimation: function () {
    var animations = this.animations();
    var r = [];
    for (var i = 0; i < animations.length; i++) {
      var a = animations[i];
      if (a.indexOf("Idle") === 0) {
        r.push(a);
      }
    }

    // pick one
    var idx = Math.floor(Math.random() * r.length);
    return r[idx];
  },

  /**************************** Events ************************************/

  _setupEvents: function () {
    $(window).on("resize", $.proxy(this.reposition, this));

    this._el.on("mousedown", $.proxy(this._onMouseDown, this));
    this._el.on("touchstart", $.proxy(this._onTouchStart, this));

    this._el.on("dblclick", $.proxy(this._onDoubleClick, this));
  },

  _onDoubleClick: function () {
    if (this._balloon.isAnimating()) return;
    if (!this.play("ClickedOn")) {
      this.animate();
    }
  },

  reposition: function () {
    if (!this._el.is(":visible")) return;
    var o = this._el.offset();
    var bH = this._el.outerHeight();
    var bW = this._el.outerWidth();

    var container = $("#screen");
    var wW, wH, sT, sL;
    if (container.length > 0) {
      wW = container.width();
      wH = container.height();
      sT = container.scrollTop();
      sL = container.scrollLeft();
    } else {
      container = $(window);
      wW = container.width();
      wH = container.height();
      sT = $(document).scrollTop();
      sL = $(document).scrollLeft();
    }

    var top = o.top - sT;
    var left = o.left - sL;
    var m = 5;
    if (top - m < 0) {
      top = m;
    } else if (top + bH + m > wH) {
      top = wH - bH - m;
    }

    if (left - m < 0) {
      left = m;
    } else if (left + bW + m > wW) {
      left = wW - bW - m;
    }

    this._el.css({ left: left, top: top });
    // reposition balloon
    this._balloon.reposition();
  },

  _onTouchStart: function (e) {
    e.preventDefault();
    this._wasDragged = false;
    this._longPressFired = false;
    const coords = this._getEventCoords(e);
    this._touchStartX = coords.pageX;
    this._touchStartY = coords.pageY;

    this._touchTimer = window.setTimeout($.proxy(function () {
      this._longPressFired = true;
      // Trigger a contextmenu event, making sure to pass touch coordinates
      const contextMenuEvent = $.Event("contextmenu");
      contextMenuEvent.pageX = this._touchStartX;
      contextMenuEvent.pageY = this._touchStartY;
      this._el.trigger(contextMenuEvent);
    }, this), 750);

    this._touchMoveHandle = $.proxy(this._onTouchMove, this);
    this._touchEndHandle = $.proxy(this._onTouchEnd, this);

    $(window).on("touchmove", this._touchMoveHandle);
    $(window).on("touchend", this._touchEndHandle);
  },

  _onTouchMove: function (e) {
    const coords = this._getEventCoords(e);
    const dx = Math.abs(coords.pageX - this._touchStartX);
    const dy = Math.abs(coords.pageY - this._touchStartY);

    if (dx > 10 || dy > 10) {
      this._wasDragged = true;
      window.clearTimeout(this._touchTimer);
      // Unbind touch handlers to prevent conflicts
      $(window).off("touchmove", this._touchMoveHandle);
      $(window).off("touchend", this._touchEndHandle);
      // It's a drag, start the drag logic
      this._startDrag(e);
    }
  },

  _onTouchEnd: function (e) {
    window.clearTimeout(this._touchTimer);
    $(window).off("touchmove", this._touchMoveHandle);
    $(window).off("touchend", this._touchEndHandle);

    if (this._wasDragged || this._longPressFired) {
      return;
    }

    // It's a tap, trigger a click event
    this._el.trigger("click");
  },

  _onMouseDown: function (e) {
    if (e.which !== 1) return;
    e.preventDefault();
    this._startDrag(e);
  },

  /**************************** Drag ************************************/

  _startDrag: function (e) {
    // pause animations
    this.pause();
    this._balloon.hide(true);
    this._offset = this._calculateClickOffset(e);

    this._moveHandle = $.proxy(this._dragMove, this);
    this._upHandle = $.proxy(this._finishDrag, this);

    const isTouchEvent = e.type.startsWith("touch");
    const moveEvent = isTouchEvent ? "touchmove" : "mousemove";
    const upEvent = isTouchEvent ? "touchend" : "mouseup";

    $(window).on(moveEvent, this._moveHandle);
    $(window).on(upEvent, this._upHandle);


    this._dragUpdateLoop = window.setTimeout(
      $.proxy(this._updateLocation, this),
      10
    );
  },

  _getEventCoords: function (e) {
    const originalEvent = e.originalEvent || e;
    const touch = originalEvent.touches && originalEvent.touches[0];
    return touch || e;
  },

  _calculateClickOffset: function (e) {
    const coords = this._getEventCoords(e);
    var o = this._el.offset();
    return {
      top: coords.pageY - o.top,
      left: coords.pageX - o.left,
    };
  },

  _updateLocation: function () {
    this._el.css({ top: this._targetY, left: this._targetX });
    this._dragUpdateLoop = window.setTimeout(
      $.proxy(this._updateLocation, this),
      10
    );
  },

  _dragMove: function (e) {
    e.preventDefault();
    const coords = this._getEventCoords(e);
    var x = coords.clientX - this._offset.left;
    var y = coords.clientY - this._offset.top;
    this._targetX = x;
    this._targetY = y;
  },

  _finishDrag: function (e) {
    window.clearTimeout(this._dragUpdateLoop);

    const isTouchEvent = e.type.startsWith("touch");
    const moveEvent = isTouchEvent ? "touchmove" : "mousemove";
    const upEvent = isTouchEvent ? "touchend" : "mouseup";

    // remove handles
    $(window).off(moveEvent, this._moveHandle);
    $(window).off(upEvent, this._upHandle);
    // resume animations
    this._balloon.show();
    this.reposition();
    this.resume();
  },

  _addToQueue: function (func, scope) {
    if (scope) func = $.proxy(func, scope);
    this._queue.queue(func);
  },

  /**************************** Pause and Resume ************************************/

  pause: function () {
    this._animator.pause();
    this._balloon.pause();
  },

  resume: function () {
    this._animator.resume();
    this._balloon.resume();
  },
};
